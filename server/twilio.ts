// Text-message login codes through Twilio, for wholesale accounts (log in with the phone on the
// account instead of a password).
//
// TWILIO_ACCOUNT_SID, and TWILIO_AUTH_TOKEN or an API key (TWILIO_API_KEY SK… and
// TWILIO_API_SECRET), plus one of:
// - TWILIO_VERIFY_SERVICE_SID (VA…): Twilio Verify makes, texts and checks the code. Preferred.
// - TWILIO_FROM (+1…) or TWILIO_MESSAGING_SERVICE_SID (MG…): we make the code and text it.

import { createHash, randomInt, timingSafeEqual } from "node:crypto";

const env = (k: string) => String(process.env[k] || "").trim();
const CODE_MINUTES = 10;
const MAX_TRIES = 5;

export class TwilioError extends Error {
  declare status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

// A US number in any common form (or one already in +E.164) as +15551234567; null if it isn't one.
export function e164(input: unknown): string | null {
  // An extension ("x2", "ext. 2", "#2") isn't part of the number to text.
  const raw = String(input || "").trim().replace(/\s*(?:ext\.?|extension|x|#)\s*\d+\s*$/i, "");
  const digits = raw.replace(/\D/g, "");
  if (raw.startsWith("+")) return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return null;
}

export function createTwilio() {
  const sid = env("TWILIO_ACCOUNT_SID");
  const token = env("TWILIO_AUTH_TOKEN");
  // An API key signs in instead of the auth token when it's set (it can be revoked on its own).
  const apiKey = env("TWILIO_API_KEY");
  const apiSecret = env("TWILIO_API_SECRET");
  let login = apiKey && apiSecret ? `${apiKey}:${apiSecret}` : `${sid}:${token}`;
  let usingKey = Boolean(apiKey && apiSecret);
  // The start of an id and its last four, for the log (never the secret).
  const hint = (v: string) => (v ? `${v.slice(0, 2)}…${v.slice(-4)}` : "(not set)");
  const verifySid = env("TWILIO_VERIFY_SERVICE_SID");
  const from = env("TWILIO_FROM");
  const messagingSid = env("TWILIO_MESSAGING_SERVICE_SID");
  // The ids' shapes, checked once at start: a key's name, or a secret, pasted as its id is the
  // usual reason Twilio says no.
  {
    const warn = (m: string) => console.warn(`[twilio] ${m}`);
    if (sid && !/^AC[0-9a-f]{32}$/i.test(sid)) warn(`TWILIO_ACCOUNT_SID should be "AC" and 32 characters (it's ${hint(sid)}).`);
    if (apiKey && !/^SK[0-9a-f]{32}$/i.test(apiKey)) warn(`TWILIO_API_KEY should be the key's SID, "SK" and 32 characters, not its name (it's ${hint(apiKey)}).`);
    if (apiKey && !apiSecret) warn("TWILIO_API_KEY is set without TWILIO_API_SECRET, so the auth token is used.");
    if (verifySid && !/^VA[0-9a-f]{32}$/i.test(verifySid)) warn(`TWILIO_VERIFY_SERVICE_SID should be "VA" and 32 characters (it's ${hint(verifySid)}).`);
  }
  // Overridable for tests.
  const apiBase = env("TWILIO_API_URL") || "https://api.twilio.com";
  const verifyBase = env("TWILIO_VERIFY_URL") || "https://verify.twilio.com";
  const configured = () => Boolean(sid && (token || (apiKey && apiSecret)) && (verifySid || from || messagingSid));
  // Our own codes (when not using Verify): hashed, per number, gone after use or 10 minutes.
  const codes = new Map<string, { hash: string; expires: number; tries: number }>();
  const hash = (to: string, code: string) => createHash("sha256").update(`${to}:${code}`).digest("hex");

  async function call(url: string, form: Record<string, string>, retried = false): Promise<any> {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Basic ${Buffer.from(login).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(form),
      signal: AbortSignal.timeout(15_000),
    }).catch((error) => {
      console.error("[twilio] unreachable:", error.message);
      throw new TwilioError("Couldn't send the code. Try again.");
    });
    const data: any = await res.json().catch(() => ({}));
    if (res.status === 401) {
      console.error(
        `[twilio] 401 ${data.code || ""} ${data.message || ""}: signing in with ${usingKey ? `API key ${hint(apiKey)}` : "the auth token"} for account ${hint(sid)} failed.` +
          (usingKey ? " The key must be a Standard key made in this same account (not a subaccount) in the US1 region, and TWILIO_API_SECRET its secret." : " Check TWILIO_AUTH_TOKEN is this account's current token.")
      );
      // The key didn't work but the account's token is there too: use that from now on.
      if (usingKey && token && !retried) {
        login = `${sid}:${token}`;
        usingKey = false;
        console.warn("[twilio] Using TWILIO_AUTH_TOKEN instead of the API key.");
        return call(url, form, true);
      }
    }
    if (!res.ok) {
      if (res.status !== 401) console.error(`[twilio] ${res.status} ${data.code || ""} ${data.message || ""}`);
      // 60200: not a valid number; 21211/21614: can't text it.
      if ([60200, 21211, 21614].includes(data.code)) throw new TwilioError("That number can't get texts.", 400);
      if (res.status === 429 || data.code === 60203) throw new TwilioError("Too many codes sent to that number. Try again later.", 429);
      throw new TwilioError("Couldn't send the code. Try again.");
    }
    return data;
  }

  async function sendCode(to: string, brand: string): Promise<void> {
    if (!configured()) throw new TwilioError("Text codes aren't available right now. Use your email.", 503);
    if (verifySid) {
      await call(`${verifyBase}/v2/Services/${encodeURIComponent(verifySid)}/Verifications`, { To: to, Channel: "sms" });
      return;
    }
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    codes.set(to, { hash: hash(to, code), expires: Date.now() + CODE_MINUTES * 60_000, tries: 0 });
    await call(`${apiBase}/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`, {
      To: to,
      ...(messagingSid ? { MessagingServiceSid: messagingSid } : { From: from }),
      Body: `${code} is your ${brand} login code. It expires in ${CODE_MINUTES} minutes.`,
    });
  }

  // True when the code is right (and then it can't be used again).
  async function checkCode(to: string, code: string): Promise<boolean> {
    code = String(code || "").replace(/\D/g, "");
    if (!/^\d{4,10}$/.test(code)) return false;
    if (verifySid) {
      try {
        const r = await call(`${verifyBase}/v2/Services/${encodeURIComponent(verifySid)}/VerificationCheck`, { To: to, Code: code });
        return r.status === "approved";
      } catch (error) {
        // 20404: no code waiting for that number (expired, used or never sent).
        if (error instanceof TwilioError && error.status !== 429) return false;
        throw error;
      }
    }
    const c = codes.get(to);
    if (!c || c.expires < Date.now() || c.tries >= MAX_TRIES) {
      codes.delete(to);
      return false;
    }
    c.tries++;
    const ok = timingSafeEqual(Buffer.from(c.hash), Buffer.from(hash(to, code)));
    if (ok) codes.delete(to);
    return ok;
  }

  return { configured, sendCode, checkCode };
}
