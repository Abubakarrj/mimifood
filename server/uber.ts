// Courier delivery through Uber Direct (https://developer.uber.com/docs/deliveries/overview).
// Square can't send couriers for orders made through its API, so we book them here and show
// their progress in our own back office (server/couriers.js).
//
// Set UBER_DIRECT_CUSTOMER_ID, UBER_DIRECT_CLIENT_ID and UBER_DIRECT_CLIENT_SECRET (Uber Direct
// dashboard → Developer), and UBER_DIRECT_WEBHOOK_SECRET (the webhook's signing key) for status
// updates sent to /api/uber/webhook.

import { createHmac, timingSafeEqual } from "node:crypto";

export class CourierError extends Error {
  declare code: any;
  declare status: any;
  constructor(message, { status, code }: { status?: any; code?: any } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// E.164 for US numbers: "(213) 555-0100" → "+12135550100".
export function phoneE164(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

// The courier steps the back office shows, with what the shop reads in the order's history.
export const COURIER_STATUS = {
  created: "Booked",
  confirmed: "Booked",
  enroute_to_pickup: "Courier on the way",
  arrived_at_pickup: "Courier at the bar",
  picked_up: "Picked up",
  enroute_to_dropoff: "On the way",
  arrived_at_dropoff: "Arriving",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};

export const uberConfigured = () => Boolean(process.env.UBER_DIRECT_CUSTOMER_ID && process.env.UBER_DIRECT_CLIENT_ID && process.env.UBER_DIRECT_CLIENT_SECRET);

// An access token (client credentials), kept until shortly before it expires.
let cached = null;
async function accessToken() {
  if (cached && cached.expires > Date.now() + 60e3) return cached.token;
  const res = await fetch(process.env.UBER_AUTH_URL || "https://auth.uber.com/oauth/v2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: process.env.UBER_DIRECT_CLIENT_ID, client_secret: process.env.UBER_DIRECT_CLIENT_SECRET, grant_type: "client_credentials", scope: "eats.deliveries" }),
    signal: AbortSignal.timeout(15000),
  });
  const data = await (res.json() as Promise<any>).catch(() => ({}));
  if (!res.ok || !data.access_token) throw new CourierError("Uber Direct isn't connected properly.", { status: res.status });
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return cached.token;
}

async function call(method, path, body?) {
  const base = (process.env.UBER_API_URL || "https://api.uber.com").replace(/\/$/, "");
  const res = await fetch(`${base}/v1/customers/${encodeURIComponent(process.env.UBER_DIRECT_CUSTOMER_ID)}/${path}`, {
    method,
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await (res.json() as Promise<any>).catch(() => ({}));
  if (res.status === 401) cached = null; // signed out: get a new token next time
  if (!res.ok) {
    // Which fields Uber didn't accept go to the log; staff see Uber's own sentence.
    const fields = data.metadata && typeof data.metadata === "object" ? Object.entries(data.metadata).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join("; ") : "";
    if (fields) console.warn(`[uber] ${path}: ${fields}`);
    throw new CourierError(data.message ? `Uber Direct: ${data.message}` : "Uber Direct couldn't do that. Try again.", { status: res.status, code: data.code });
  }
  return data;
}

// Uber takes an address as a JSON string of its parts.
const address = (a) => JSON.stringify({ street_address: [a.street], city: a.city, state: a.state, zip_code: a.zip, country: "US" });

// A courier job (see couriers.js), in Uber's terms.
function request(job) {
  return {
    external_id: job.id,
    pickup_name: job.from.name,
    pickup_address: address(job.from.parts),
    pickup_phone_number: phoneE164(job.from.phone),
    pickup_notes: `Order ${job.ref}. Ask at the counter.`,
    dropoff_name: job.to.name,
    dropoff_address: address(job.to.parts),
    dropoff_phone_number: phoneE164(job.to.phone),
    dropoff_notes: job.note || undefined,
    manifest_items: (job.items.length ? job.items : [{ title: "Coffee", qty: 1 }]).map((l) => ({ name: l.title.slice(0, 100), quantity: l.qty, size: "small" })),
    manifest_total_value: Math.round(job.value * 100),
    pickup_ready_dt: job.pickupTime || undefined,
  };
}

export async function quote(job) {
  const q = await call("POST", "delivery_quotes", { pickup_address: address(job.from.parts), dropoff_address: address(job.to.parts), pickup_phone_number: phoneE164(job.from.phone), dropoff_phone_number: phoneE164(job.to.phone) || undefined, manifest_total_value: Math.round(job.value * 100) });
  return { fee: typeof q.fee === "number" ? q.fee / 100 : null, dropoffEta: q.dropoff_eta || null };
}
export const createDelivery = (job) => call("POST", "deliveries", request(job));
export const getDelivery = (id) => call("GET", `deliveries/${encodeURIComponent(id)}`);
export const cancelDelivery = (id) => call("POST", `deliveries/${encodeURIComponent(id)}/cancel`);

// Uber's statuses → the courier steps the back office shows (COURIER_STATUS).
export const STATUS = { pending: "confirmed", pickup: "enroute_to_pickup", pickup_complete: "picked_up", dropoff: "enroute_to_dropoff", delivered: "delivered", canceled: "cancelled", returned: "returned" };

// Where the courier is right now ([lat, lon]), when Uber says; back office only.
export const courierAt = (c) => (Number.isFinite(c?.location?.lat) && Number.isFinite(c?.location?.lng) ? [c.location.lat, c.location.lng] : null);

// The parts of an Uber delivery we keep on the order.
export const summary = (d) => ({
  id: d.id,
  status: STATUS[d.status] || "confirmed",
  fee: typeof d.fee === "number" ? d.fee / 100 : null,
  trackingUrl: d.tracking_url || null,
  dasher: d.courier?.name || null,
  dasherPhone: d.courier?.phone_number || null,
  courierAt: courierAt(d.courier),
  pickupEta: d.pickup_eta || null,
  dropoffEta: d.dropoff_eta || null,
  updatedAt: new Date().toISOString(),
});

// Webhooks are signed: HMAC-SHA256 of the body with the signing key, in hex.
export function verifyWebhook(raw, signature) {
  const key = process.env.UBER_DIRECT_WEBHOOK_SECRET;
  if (!key || !signature) return false;
  const want = Buffer.from(createHmac("sha256", key).update(raw).digest("hex"));
  const got = Buffer.from(String(signature).toLowerCase());
  return want.length === got.length && timingSafeEqual(want, got);
}
