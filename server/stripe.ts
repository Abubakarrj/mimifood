// Stripe, for one thing: bank payments (ACH Direct Debit) in the wholesale portal, in our own
// form. The café's routing and account numbers go from their browser to Stripe (Stripe.js), never
// through us; the first time, Stripe proves the account with a small deposit they confirm with a
// code. Square stays the record: a settled Stripe payment is recorded on the Square order as paid.
// Off unless STRIPE_SECRET_KEY and STRIPE_PUBLISHABLE_KEY are set; STRIPE_WEBHOOK_SECRET signs the
// updates Stripe sends (processing, succeeded, failed).
import { createHmac, timingSafeEqual } from "node:crypto";

const API = (process.env.STRIPE_API_URL || "https://api.stripe.com/v1").replace(/\/$/, "");

export const configured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY);
export const publishableKey = () => process.env.STRIPE_PUBLISHABLE_KEY || "";

export class StripeError extends Error {
  declare code: string;
  declare status: number;
  constructor(message, { code = "", status = 400 } = {}) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

// Stripe's form encoding: nested objects as a[b][c], arrays as a[0].
function form(params, prefix = "", out = new URLSearchParams()) {
  for (const [k, v] of Object.entries(params || {})) {
    if (v === undefined || v === null) continue;
    const key = prefix ? `${prefix}[${k}]` : k;
    if (Array.isArray(v)) v.forEach((x, i) => (x && typeof x === "object" ? form(x, `${key}[${i}]`, out) : out.append(`${key}[${i}]`, String(x))));
    else if (typeof v === "object") form(v, key, out);
    else out.append(key, String(v));
  }
  return out;
}

async function stripe(method, path, params = undefined, idempotencyKey = "") {
  const res = await fetch(`${API}/${path}${method === "GET" && params ? `?${form(params)}` : ""}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      ...(method !== "GET" && { "Content-Type": "application/x-www-form-urlencoded" }),
      ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    },
    body: method !== "GET" && params ? form(params) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.error || {};
    console.error(`[stripe] ${method} ${path}: ${res.status} ${e.type || ""} ${e.code || ""} ${e.message || ""}`);
    throw new StripeError(plain(e), { code: e.code || e.decline_code || "", status: res.status });
  }
  return data;
}

// What went wrong, for the café: never Stripe's own wording.
function plain(e) {
  const code = e?.code || "";
  if (/routing_number|invalid_bank_account|bank_account_unusable|account_number/.test(code)) return "Check the routing and account numbers.";
  if (/payment_method_microdeposit_verification_descriptor_code_mismatch|amounts_mismatch/.test(code)) return "That code doesn't match. Check your bank statement and try again.";
  if (/attempts_exceeded/.test(code)) return "Too many tries. Enter your bank details again.";
  if (/timeout|expired/.test(code)) return "That took too long. Enter your bank details again.";
  return "The bank payment didn't go through. Try again, or pay by card.";
}

// The café's Stripe customer (made once, kept on the account).
export async function customerFor({ email, name, accountId }) {
  const c = await stripe("POST", "customers", { email, name, metadata: { account: accountId } }, `cust-${accountId}`);
  return c.id;
}

// A bank payment for these invoices: set up for the browser to confirm with the bank details it
// collects (the first time, Stripe verifies the account by a small deposit), and kept for next time.
export async function startBankPayment({ amount, currency = "usd", customer, orders, accountId, key }) {
  return stripe(
    "POST",
    "payment_intents",
    {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer,
      payment_method_types: ["us_bank_account"],
      payment_method_options: { us_bank_account: { verification_method: "microdeposits" } },
      setup_future_usage: "off_session",
      description: `Wholesale ${orders.join(", ")}`,
      metadata: { orders: orders.join(","), account: accountId },
    },
    key
  );
}

// Paying from their saved bank account: confirmed now, under the mandate they accepted (as it's
// on-session, the mandate is given again with this browser's details).
export async function payFromSavedBank({ amount, currency = "usd", customer, paymentMethod, orders, accountId, ip, userAgent, key }) {
  return stripe(
    "POST",
    "payment_intents",
    {
      amount: Math.round(amount * 100),
      currency: currency.toLowerCase(),
      customer,
      payment_method: paymentMethod,
      payment_method_types: ["us_bank_account"],
      confirm: true,
      mandate_data: { customer_acceptance: { type: "online", online: { ip_address: ip, user_agent: userAgent } } },
      description: `Wholesale ${orders.join(", ")}`,
      metadata: { orders: orders.join(","), account: accountId },
    },
    key
  );
}

export const paymentIntent = (id) => stripe("GET", `payment_intents/${encodeURIComponent(id)}`, { "expand[]": "payment_method" });
export const cancelPayment = (id) => stripe("POST", `payment_intents/${encodeURIComponent(id)}/cancel`, {});

// The code on their statement (SM…), or the two small amounts (in cents).
export function verifyDeposits(id, { code = "", amounts = [] }) {
  return stripe("POST", `payment_intents/${encodeURIComponent(id)}/verify_microdeposits`, code ? { descriptor_code: code.trim().toUpperCase() } : { amounts: amounts.map((n) => Math.round(Number(n))) });
}

// Their saved bank account, as we show it (never its numbers).
export const bankView = (pm) => (pm?.us_bank_account ? { id: pm.id, bank: pm.us_bank_account.bank_name || "Bank", last4: pm.us_bank_account.last4 || "" } : null);

// Stripe's signature on an update: "t=…,v1=…" over "t.body", keyed with the webhook secret.
export function signed(raw, header) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET || "";
  if (!secret || !header) return false;
  const parts = Object.fromEntries(String(header).split(",").map((p) => p.split("=")).filter((p) => p.length === 2) as [string, string][]);
  const t = Number(parts.t);
  if (!t || Math.abs(Date.now() / 1000 - t) > 300) return false;
  const want = Buffer.from(createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex"));
  return String(header)
    .split(",")
    .filter((p) => p.startsWith("v1="))
    .some((p) => {
      const got = Buffer.from(p.slice(3));
      return got.length === want.length && timingSafeEqual(got, want);
    });
}
