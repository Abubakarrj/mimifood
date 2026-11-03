// Checks that what customers type is real, so orders, receipts and parcels reach them:
//
//   checkEmail(email)    the format, a likely typo in a common domain ("gmial.com" → a suggestion
//                        of gmail.com), and whether the domain can receive mail at all (spam.js
//                        checkEmailDomain: its mail records, no throwaway domains).
//   checkAddress(to)     a US street address against USPS (Addresses 3.0, the same
//                        USPS_CLIENT_ID as postage), else Shippo's address validation. Returns
//                        "valid", "corrected" (with USPS's version), "unit" (an apartment or
//                        suite number is needed), "invalid", or "unknown" (couldn't check).

import { checkEmailDomain, SpamError } from "./spam.ts";

const EMAIL_RE = /^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]{2,}$/;

// Domains people mistype most, and endings that are almost always ".com" typed wrong.
const COMMON = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "aol.com", "live.com", "msn.com", "me.com", "comcast.net", "att.net", "verizon.net", "sbcglobal.net", "protonmail.com", "proton.me", "ymail.com", "mac.com", "googlemail.com"];
const BAD_ENDINGS = { con: "com", cmo: "com", ocm: "com", vom: "com", xom: "com", comm: "com", coom: "com", cpm: "com", nett: "net", ner: "net", ogr: "org" };

// How many single edits apart two short strings are (insert, delete, change, swap).
function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
    }
  return d[a.length][b.length];
}

function suggestDomain(domain) {
  if (COMMON.includes(domain)) return null;
  const dot = domain.lastIndexOf(".");
  const end = domain.slice(dot + 1);
  if (BAD_ENDINGS[end]) return `${domain.slice(0, dot)}.${BAD_ENDINGS[end]}`;
  let best = null;
  for (const c of COMMON) {
    const n = distance(domain, c);
    if (n <= (c.length > 8 ? 2 : 1) && (!best || n < best.n)) best = { c, n };
  }
  return best?.c || null;
}

// { ok, suggestion?, error? }. ok is false only when the address is certainly wrong.
export async function checkEmail(raw): Promise<{ ok: boolean; error?: string; suggestion?: string }> {
  const email = String(raw || "").trim().toLowerCase();
  if (email.length > 254 || !EMAIL_RE.test(email)) return { ok: false, error: "Enter a valid email." };
  const [user, domain] = [email.slice(0, email.lastIndexOf("@")), email.slice(email.lastIndexOf("@") + 1)];
  const suggestion = suggestDomain(domain) ? { suggestion: `${user}@${suggestDomain(domain)}` } : {};
  try {
    await checkEmailDomain(email);
  } catch (error) {
    if (!(error instanceof SpamError)) throw error;
    return { ok: false, error: /throwaway/.test(error.message) ? error.message : `${domain} can't receive email. Check for a typo.`, ...suggestion };
  }
  return { ok: true, ...suggestion };
}

/* ── Addresses ── */

const title = (s) => String(s || "").toLowerCase().replace(/\b([a-z])/g, (c) => c.toUpperCase()).replace(/\b(Po|Nw|Ne|Sw|Se)\b/g, (w) => w.toUpperCase());
// The same address however it's spelled out: "Street" and "St", "Apartment 4" and "Apt 4".
const SHORT = { street: "st", avenue: "ave", road: "rd", boulevard: "blvd", drive: "dr", lane: "ln", court: "ct", place: "pl", terrace: "ter", highway: "hwy", parkway: "pkwy", circle: "cir", square: "sq", apartment: "apt", suite: "ste", building: "bldg", floor: "fl", north: "n", south: "s", east: "e", west: "w", northeast: "ne", northwest: "nw", southeast: "se", southwest: "sw" };
const plain = (s) => String(s || "").toLowerCase().replace(/[a-z]+/g, (w) => SHORT[w] || w).replace(/[^a-z0-9]/g, "");
const same = (a, b) => plain(a) === plain(b);

async function viaUsps({ address, city, state, postcode }) {
  const base = (process.env.USPS_API_URL || "https://apis.usps.com").replace(/\/$/, "");
  const { accessToken } = await import("./usps.ts");
  const q = new URLSearchParams({ streetAddress: address, state, ...(city ? { city } : {}), ...(postcode ? { ZIPCode: String(postcode).slice(0, 5) } : {}) });
  const res = await fetch(`${base}/addresses/v3/address?${q}`, { headers: { Authorization: `Bearer ${await accessToken()}`, Accept: "application/json" }, signal: AbortSignal.timeout(8000) });
  const data = await (res.json() as Promise<any>).catch(() => ({}));
  if (res.status === 400 || res.status === 404) {
    const msg = JSON.stringify(data);
    if (/not found|invalid/i.test(msg)) return { status: "invalid", message: "Address not found." };
    return { status: "unknown" };
  }
  if (!res.ok || !data.address) return { status: "unknown" };
  const a = data.address;
  const found = {
    address: [title(a.streetAddress), a.secondaryAddress ? a.secondaryAddress.toUpperCase().replace(/^(APT|STE|UNIT)\s+/, (m) => title(m)) : ""].filter(Boolean).join(" "),
    city: title(a.city),
    state: a.state,
    postcode: a.ZIPPlus4 ? `${a.ZIPCode}-${a.ZIPPlus4}` : a.ZIPCode,
  };
  const dpv = data.additionalInfo?.DPVConfirmation;
  if (dpv === "N") return { status: "invalid", message: "Address not found." };
  if (dpv === "D" || (data.corrections || []).some((c) => String(c.code) === "32")) return { status: "unit", address: found, message: "Add an apt, suite or unit number." };
  const changed = !same(found.address, address) || !same(found.city, city) || found.state !== state || !same(found.postcode.slice(0, 5), String(postcode).slice(0, 5));
  return { status: changed ? "corrected" : "valid", address: found };
}

async function viaShippo({ address, city, state, postcode }) {
  const base = (process.env.SHIPPO_API_URL || "https://api.goshippo.com").replace(/\/$/, "");
  const token = process.env.SHIPPO_API_TOKEN || process.env.SHIPPO_API_KEY || process.env.SHIPPO_TOKEN;
  const res = await fetch(`${base}/addresses/`, {
    method: "POST",
    headers: { Authorization: `ShippoToken ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ street1: address, city, state, zip: postcode, country: "US", validate: true }),
    signal: AbortSignal.timeout(8000),
  });
  const data = await (res.json() as Promise<any>).catch(() => ({}));
  const v = data.validation_results;
  if (!res.ok || !v) return { status: "unknown" };
  if (!v.is_valid) return { status: "invalid", message: "Address not found." };
  const found = { address: [data.street1, data.street2].filter(Boolean).map(title).join(" "), city: title(data.city), state: data.state, postcode: data.zip };
  const changed = !same(found.address, address) || !same(found.city, city) || !same(String(found.postcode).slice(0, 5), String(postcode).slice(0, 5));
  return { status: changed ? "corrected" : "valid", address: found };
}

const addressCache = new Map(); // normalized address → result
export async function checkAddress(to) {
  const t = { address: String(to?.address || "").trim(), city: String(to?.city || "").trim(), state: String(to?.state || "").trim().toUpperCase(), postcode: String(to?.postcode || "").trim() };
  if (!t.address || !t.state || !(t.city || t.postcode)) return { status: "unknown" };
  const key = JSON.stringify(t).toLowerCase();
  if (addressCache.has(key)) return addressCache.get(key);
  let result = { status: "unknown" };
  try {
    if (process.env.USPS_CLIENT_ID && process.env.USPS_CLIENT_SECRET) result = await viaUsps(t);
    else if (process.env.SHIPPO_API_TOKEN || process.env.SHIPPO_API_KEY || process.env.SHIPPO_TOKEN) result = await viaShippo(t);
  } catch (error) {
    console.error("[verify] address check failed:", error.message);
  }
  if (result.status !== "unknown") {
    addressCache.set(key, result);
    if (addressCache.size > 2000) addressCache.delete(addressCache.keys().next().value);
  }
  return result;
}
