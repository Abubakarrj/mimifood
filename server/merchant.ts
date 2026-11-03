// Google Merchant API: the shop's products sent straight to Merchant Center, so Google Search and
// Shopping show today's prices and stock within minutes of a change, not after the daily fetch
// of /feeds/google.xml. Same items as that feed (server/feed.ts feedItems).
//
// Off unless GOOGLE_MERCHANT_ID (the Merchant Center account number) and GOOGLE_MERCHANT_KEY (a
// Google Cloud service account's JSON key, as is or base64) are set. The service account needs
// Admin access in Merchant Center (Settings → People and access). On first use this registers the
// Cloud project with the account and makes an API product source ("Mimi Food website (API)"), unless
// GOOGLE_MERCHANT_DATA_SOURCE names one made in Merchant Center.
//
// Only changed items are sent (each item's last-sent hash is kept), and items no longer on sale
// are taken off. State lives in `state()` / `save(state)`.

import { createSign, createHash } from "node:crypto";

const API = () => (process.env.GOOGLE_MERCHANT_API_URL || "https://merchantapi.googleapis.com").replace(/\/$/, "");
const SCOPE = "https://www.googleapis.com/auth/content";
const env = (n) => String(process.env[n] || "").trim();

export class MerchantError extends Error {}

function serviceKey() {
  const raw = env("GOOGLE_MERCHANT_KEY");
  if (!raw) return null;
  try {
    return JSON.parse(raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export const merchantConfigured = () => Boolean(env("GOOGLE_MERCHANT_ID") && serviceKey()?.private_key && serviceKey()?.client_email);

export function createMerchant({ state, save }) {
  let token = { value: "", until: 0 };
  const account = () => env("GOOGLE_MERCHANT_ID").replace(/\D/g, "");

  // A service account signs in with a signed JWT (RS256), traded for an hour's access token.
  async function accessToken() {
    if (token.value && Date.now() < token.until) return token.value;
    const key = serviceKey();
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const tokenUrl = key.token_uri || "https://oauth2.googleapis.com/token";
    const body = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: key.client_email, scope: SCOPE, aud: tokenUrl, iat: now, exp: now + 3600 })}`;
    const jwt = `${body}.${createSign("RSA-SHA256").update(body).sign(key.private_key, "base64url")}`;
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) throw new MerchantError(`sign-in failed (${res.status}): ${data.error_description || data.error || "no token"}`);
    token = { value: data.access_token, until: Date.now() + (Number(data.expires_in) || 3600) * 1000 - 60_000 };
    return token.value;
  }

  async function call(method, path, body?) {
    const res = await fetch(`${API()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${await accessToken()}`, ...(body && { "Content-Type": "application/json" }) },
      ...(body && { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(20000),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) {
      const e: any = new MerchantError(`${method} ${path.split("?")[0]} ${res.status}: ${data.error?.message || "no detail"}`);
      e.status = res.status;
      throw e;
    }
    return data;
  }

  // Once: the Cloud project registered with the Merchant Center account, and the API product source.
  async function ready() {
    const s = state();
    if (!s.registered) {
      try {
        await call("POST", `/accounts/v1/accounts/${account()}/developerRegistration:registerGcp`, env("GOOGLE_MERCHANT_DEVELOPER_EMAIL") ? { developerEmail: env("GOOGLE_MERCHANT_DEVELOPER_EMAIL") } : {});
      } catch (error) {
        if (error.status !== 409) throw error; // already registered is fine
      }
      s.registered = true;
      await save(s);
    }
    const named = env("GOOGLE_MERCHANT_DATA_SOURCE").replace(/\D/g, "");
    if (named) return `accounts/${account()}/dataSources/${named}`;
    if (!s.dataSource) {
      const made = await call("POST", `/datasources/v1/accounts/${account()}/dataSources`, {
        displayName: "Mimi Food website (API)",
        primaryProductDataSource: { contentLanguage: "en", feedLabel: "US", countries: ["US"] },
      });
      s.dataSource = made.name;
      await save(s);
    }
    return s.dataSource;
  }

  const micros = (n, currency) => ({ amountMicros: String(Math.round(Number(n) * 1e6)), currencyCode: currency });

  // One feed item (server/feed.ts) as a product input.
  function input(it, { siteUrl, site }) {
    const currency = site.currencyCode || "USD";
    const ship = it.price >= site.freeShippingOver ? 0 : site.postage?.maxFee;
    return {
      offerId: it.id,
      contentLanguage: "en",
      feedLabel: "US",
      productAttributes: {
        title: it.title.slice(0, 150),
        description: it.description.slice(0, 5000),
        link: siteUrl + it.link + (it.grams ? `?size=${encodeURIComponent(it.size)}` : ""),
        imageLink: siteUrl + it.image,
        availability: it.soldOut ? "OUT_OF_STOCK" : "IN_STOCK",
        condition: "NEW",
        price: micros(it.price, currency),
        brand: site.name,
        identifierExists: false,
        itemGroupId: it.group,
        ...(it.category && { googleProductCategory: it.category }),
        productTypes: [it.type],
        ...(it.size && { size: it.size }),
        ...(it.color && { color: it.color }),
        ...(it.apparel && { gender: "UNISEX", ageGroup: "ADULT" }),
        ...(ship != null && { shipping: [{ country: "US", price: micros(ship, currency) }] }),
      },
    };
  }

  // Sends what changed since last time and takes off what's gone. Returns the counts.
  let running = null;
  async function sync(items, opts) {
    if (!merchantConfigured()) return null;
    if (running) return running;
    running = (async () => {
      const s = state();
      s.sent ||= {};
      // Google drops a product not refreshed for 30 days: everything is sent again every 25.
      if (!s.full || Date.parse(s.full) < Date.now() - 25 * 864e5) {
        for (const id of Object.keys(s.sent)) s.sent[id] = "";
        s.full = new Date().toISOString();
      }
      const failed = {};
      let sent = 0;
      let removed = 0;
      try {
        const source = await ready();
        const q = `?dataSource=${encodeURIComponent(source)}`;
        for (const it of items) {
          const body = input(it, opts);
          const hash = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
          if (s.sent[it.id] === hash) continue;
          try {
            await call("POST", `/products/v1/accounts/${account()}/productInputs:insert${q}`, body);
            s.sent[it.id] = hash;
            sent++;
          } catch (error) {
            console.error(`[merchant] ${it.id}:`, error.message);
            failed[it.id] = true;
            delete s.sent[it.id];
          }
        }
        const live = new Set(items.map((it) => it.id));
        for (const id of Object.keys(s.sent)) {
          if (live.has(id)) continue;
          try {
            await call("DELETE", `/products/v1/accounts/${account()}/productInputs/${encodeURIComponent(`en~US~${id}`)}${q}`);
          } catch (error) {
            if (error.status !== 404) {
              console.error(`[merchant] remove ${id}:`, error.message);
              continue;
            }
          }
          delete s.sent[id];
          removed++;
        }
        s.error = "";
      } catch (error) {
        console.error("[merchant] sync:", error.message);
        s.error = error.message;
      }
      s.failed = Object.keys(failed);
      s.at = new Date().toISOString();
      await save(s);
      if (sent || removed) console.log(`[merchant] ${sent} sent, ${removed} removed`);
      return { sent, removed, failed: s.failed.length };
    })().finally(() => (running = null));
    return running;
  }

  // For the back office: how many are in Google, when it last ran, and whether anything failed.
  const view = () => {
    if (!merchantConfigured()) return null;
    const s = state();
    return { count: Object.keys(s.sent || {}).length, failed: (s.failed || []).length, at: s.at || null, ok: !s.error };
  };

  return { sync, view };
}
