// Spam defence for the public forms (newsletter, sign up, log in, password reset, wholesale
// enquiry, FAQ questions). Layers, cheapest first:
//   1. Same-site check: form posts must come from this site (Origin header).
//   2. Honeypot: a hidden field people never see; anything typed in it is a bot.
//   3. Form token: a signed timestamp the page fetches when it loads. Missing or forged means a
//      script posting straight at the API; too fresh means a bot filling the form instantly.
//   4. Content: links or markup in names, link-stuffed messages, disposable email services,
//      and email domains that can't receive mail (DNS MX lookup).
// Per-IP and site-wide rate limits live in server.js next to each endpoint.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { promises as dns } from "node:dns";

// FORM_SECRET keeps tokens valid across restarts; without it a random one is made at start,
// and pages open during a restart quietly fetch a new token and retry.
const SECRET = process.env.FORM_SECRET || randomBytes(32).toString("hex");
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

// How long a person needs, at least, between the page loading and sending the form.
export const MIN_SECONDS = { subscribe: 2, register: 3, login: 1, forgot: 1, wholesale: 4, apply: 5, ask: 1, contact: 3, handoff: 2, chat: 1, reserve: 2 };

const sign = (ts) => createHmac("sha256", SECRET).update(`form:${ts}`).digest("base64url").slice(0, 32);

export function issueFormToken() {
  const ts = Date.now();
  return `${ts}.${sign(ts)}`;
}

export class SpamError extends Error {
  declare code: any;
  declare silent: any;
  declare status: any;
  declare wait: any;
  constructor(message, { status = 400, code = "spam", silent = false, wait = 0 } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.silent = silent; // answer as if it worked, so bots learn nothing
    this.wait = wait;
  }
}

// Throws SpamError unless the token is genuine and old enough for `form`.
export function checkFormToken(token, form) {
  const [ts, sig] = String(token || "").split(".");
  const issued = Number(ts);
  const expected = Number.isFinite(issued) ? sign(issued) : "";
  const ok = sig && expected && sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
  const age = Date.now() - issued;
  if (!ok || age > MAX_AGE_MS || age < -60_000) {
    throw new SpamError("This page was open a while. Try again.", { status: 403, code: "form-token" });
  }
  const min = (MIN_SECONDS[form] ?? 2) * 1000;
  if (age < min) throw new SpamError("Please try again.", { status: 403, code: "form-token", wait: min - age });
}

// Form posts from another site (or a script that forges an Origin) are refused.
export function sameSite(req, siteUrl) {
  const origin = req.headers.origin;
  if (!origin) return true; // same-origin GETs and older browsers leave it out
  try {
    const host = new URL(origin).host;
    return host === req.headers.host || host === new URL(siteUrl).host;
  } catch {
    return false;
  }
}

/* ── Content ── */

const LINKISH = /(https?:\/\/|www\.|\.(?:com|net|org|ru|xyz|top|info|biz|io|click|link|shop)\b\/?|<\/?[a-z][^>]*>|\[url)/i;
const URLS = /https?:\/\/|www\./gi;

// A name, business or other short field: no links or markup.
export const looksLikeLink = (value) => LINKISH.test(String(value || ""));

// A longer message: a single link is fine (a café's website), a handful is spam.
export const tooManyLinks = (value, max = 2) => (String(value || "").match(URLS) || []).length > max;

// The most common throwaway inbox services.
const DISPOSABLE = new Set(
  `10minutemail.com 20minutemail.com 33mail.com anonbox.net burnermail.io discard.email dispostable.com
  emailondeck.com fakeinbox.com getairmail.com getnada.com guerrillamail.com guerrillamail.net
  guerrillamail.org guerrillamailblock.com harakirimail.com inboxkitten.com mailcatch.com maildrop.cc
  mailinator.com mailinator.net mailnesia.com mailpoof.com mintemail.com moakt.com mohmal.com
  mytemp.email nada.email sharklasers.com spam4.me spambox.us spamgourmet.com temp-mail.org temp-mail.io
  tempail.com tempmail.com tempmail.net tempmailo.com tempr.email throwawaymail.com trashmail.com
  trashmail.de yopmail.com yopmail.net yopmail.fr mail.tm emailfake.com fakemail.net dropmail.me`.split(/\s+/)
);

const domainCache = new Map(); // domain → { ok, at }
const DAY = 24 * 60 * 60 * 1000;
let dnsWorks = { ok: true, at: 0 };

const withTimeout = (promise, ms) => Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "ETIMEOUT" })), ms))]);

async function domainReceivesMail(domain, resolver) {
  try {
    const mx = await withTimeout(resolver.resolveMx(domain), 3000);
    // A "null MX" (RFC 7505: priority 0, exchange ".") says the domain takes no mail.
    return mx.some((r) => r.exchange && r.exchange !== ".");
  } catch (error) {
    if (error.code === "ENODATA") {
      // No MX: mail goes to the domain's own address, if it has one.
      try {
        await withTimeout(resolver.resolve4(domain), 3000);
        return true;
      } catch {
        return false;
      }
    }
    if (error.code === "ENOTFOUND") {
      // ENOTFOUND for everything means DNS doesn't work here; then let it through.
      if (Date.now() - dnsWorks.at > 10 * 60 * 1000) {
        dnsWorks = { ok: await withTimeout(resolver.resolveMx("gmail.com"), 3000).then(() => true, () => false), at: Date.now() };
      }
      return dnsWorks.ok ? false : null;
    }
    return null; // timeout or server failure: can't tell
  }
}

// Throws SpamError when the email's domain is a throwaway service or can't receive mail.
// EMAIL_DOMAIN_CHECK=off skips the DNS part.
export async function checkEmailDomain(email, { resolver = dns } = {}) {
  const domain = String(email).split("@")[1]?.toLowerCase().replace(/\.$/, "");
  if (!domain) throw new SpamError("Enter a valid email.");
  const parts = domain.split(".");
  if (DISPOSABLE.has(domain) || DISPOSABLE.has(parts.slice(-2).join("."))) {
    throw new SpamError("Use a permanent email, not a throwaway.");
  }
  if (process.env.EMAIL_DOMAIN_CHECK === "off") return;
  const cached = domainCache.get(domain);
  let ok = cached && Date.now() - cached.at < DAY ? cached.ok : undefined;
  if (ok === undefined) {
    ok = await domainReceivesMail(domain, resolver);
    if (ok !== null) {
      domainCache.set(domain, { ok, at: Date.now() });
      if (domainCache.size > 20_000) domainCache.delete(domainCache.keys().next().value);
    }
  }
  if (ok === false) throw new SpamError("Check your email.");
}
