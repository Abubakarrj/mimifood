// Square over its REST API (https://developer.squareup.com/reference/square): card payments on
// our checkout page (Web Payments SDK + Payments API), orders that land in Square POS, customers
// and cards on file, subscriptions, refunds, invoices (wholesale) and webhooks.
//
// Set SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID and
// SQUARE_WEBHOOK_SIGNATURE_KEY (Square Developer Console). SQUARE_ENVIRONMENT=sandbox uses the
// sandbox; anything else is production. Without them, checkout takes the order and the shop
// arranges payment by email.

import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type { OrderLine, ShipTo } from "./orders.ts";

/** An error in a Square response (https://developer.squareup.com/docs/build-basics/handling-errors). */
export interface SquareApiError {
  category?: string;
  code: string;
  detail?: string;
  field?: string;
}

/** A Square response body: raw JSON, read field by field by each call below. */
export interface SquareResponse {
  errors?: SquareApiError[];
  [field: string]: any;
}

/** A Square amount: an integer in the smallest unit (cents). */
export interface Money {
  amount: number;
  currency: string;
}

/** A Square catalog object (or variation) as far as we read it back. */
interface CatalogRef {
  id: string;
  version?: number;
  item_variation_data?: { name?: string };
}

/** The parts of one of our orders that go to Square. */
export interface OrderForSquare {
  number: string;
  contact: { name: string; email?: string; phone?: string };
  cafe?: { mode: string } | null;
  fulfilment?: string;
  shipTo?: ShipTo | null;
  lines: OrderLine[];
  discount?: { amount: number; code?: string; name?: string; subscriber?: boolean } | null;
  shipping: number;
  cafeFee: number;
}

export interface SquareOrderOptions {
  currency: string;
  customerId?: string | null;
  pickupAt?: string;
  location?: string;
  lines?: OrderLine[];
  includeShipping?: boolean;
}

/** A gift card line goes to Square one card per line, each with its own uid. */
type SquareLine = OrderLine & { uid?: string };

export const SQUARE_VERSION = "2025-01-23";

// How a payment was made, for our receipt: the card's brand and last four (a gift card shows as
// one). Null when Square didn't say.
const BRANDS: Record<string, string> = { VISA: "Visa", MASTERCARD: "Mastercard", AMERICAN_EXPRESS: "American Express", DISCOVER: "Discover", DISCOVER_DINERS: "Diners Club", JCB: "JCB", CHINA_UNIONPAY: "UnionPay", SQUARE_GIFT_CARD: "Gift card", INTERAC: "Interac", EFTPOS: "eftpos", FELICA: "FeliCa", EBT: "EBT" };
export function cardOf(payment: any) {
  const c = payment?.card_details?.card;
  if (!c?.last_4) return null;
  const raw = String(c.card_brand || "");
  return { brand: BRANDS[raw] || raw.charAt(0) + raw.slice(1).toLowerCase().replace(/_/g, " "), last4: String(c.last_4) };
}

export const squareConfigured = () =>
  Boolean(process.env.SQUARE_ACCESS_TOKEN && process.env.SQUARE_APPLICATION_ID && process.env.SQUARE_LOCATION_ID);

const sandbox = () => process.env.SQUARE_ENVIRONMENT === "sandbox";
// Which Square the ids saved here belong to: sandbox ids mean nothing to production, and back.
export const environment = () => (sandbox() ? "sandbox" : "production");
export const locationId = () => process.env.SQUARE_LOCATION_ID;

// What the browser needs to draw the card form.
export const browserConfig = () => ({
  applicationId: process.env.SQUARE_APPLICATION_ID,
  locationId: process.env.SQUARE_LOCATION_ID,
  sdkUrl: process.env.SQUARE_SDK_URL || (sandbox() ? "https://sandbox.web.squarecdn.com/v1/square.js" : "https://web.squarecdn.com/v1/square.js"),
});

// Square's dashboard, for links from the back office.
export const dashboardUrl = (path = "") => `https://${sandbox() ? "squareupsandbox.com" : "squareup.com"}/dashboard${path}`;

export class SquareError extends Error {
  declare code: string | undefined;
  declare errors: SquareApiError[];
  declare status: number | undefined;
  constructor(message: string, { status, code, errors }: { status?: number; code?: string; errors?: SquareApiError[] } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.errors = errors || [];
  }
}

export async function square(method: string, path: string, body?: unknown): Promise<SquareResponse> {
  const base = (process.env.SQUARE_API_URL || (sandbox() ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com")).replace(/\/$/, "");
  const res = await fetch(`${base}/v2/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`,
      "Square-Version": SQUARE_VERSION,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data: SquareResponse = await (res.json() as Promise<any>).catch(() => ({}));
  if (!res.ok || data.errors?.length) {
    const first: Partial<SquareApiError> = data.errors?.[0] || {};
    throw new SquareError(`Square ${res.status}: ${first.detail || first.code || "request failed"}`, { status: res.status, code: first.code, errors: data.errors });
  }
  return data;
}

// Square amounts are integers in the smallest unit (cents).
export const money = (amount: number | string, currency: string): Money => ({ amount: Math.round(Number(amount) * 100), currency });
export const fromMoney = (m: Partial<Money> | null | undefined) => (m?.amount || 0) / 100;
export const key = (...parts: unknown[]) => (parts.length ? parts.join(":").slice(0, 45) : randomUUID());

// Card declines and similar: a message the customer can act on.
const DECLINES = {
  CARD_DECLINED: "Your card was declined. Please try another card.",
  CVV_FAILURE: "The security code didn't match. Please check it and try again.",
  ADDRESS_VERIFICATION_FAILURE: "The ZIP code didn't match your card. Please check it and try again.",
  INVALID_EXPIRATION: "That expiration date isn't valid.",
  INSUFFICIENT_FUNDS: "Your card was declined (insufficient funds). Please try another card.",
  GENERIC_DECLINE: "Your card was declined. Please try another card.",
  INVALID_CARD: "That card number isn't valid.",
  CARD_EXPIRED: "That card has expired.",
  VERIFY_CVV_FAILURE: "The security code didn't match. Please check it and try again.",
  VERIFY_AVS_FAILURE: "The ZIP code didn't match your card. Please check it and try again.",
};
export const declineMessage = (error: { code?: string } | null | undefined) => DECLINES[error?.code as keyof typeof DECLINES] || null;

/* ── Customers and cards ── */

// The Square customer for an email, created if there isn't one yet.
export async function customerFor({ email, name, company }: { email: string; name?: string; company?: string }): Promise<string> {
  const found = await square("POST", "customers/search", { query: { filter: { email_address: { exact: email } } }, limit: 1 });
  if (found.customers?.length) return found.customers[0].id;
  const [given, ...rest] = String(name || "").trim().split(/\s+/);
  const created = await square("POST", "customers", {
    idempotency_key: key("cust", email),
    email_address: email,
    given_name: given || undefined,
    family_name: rest.join(" ") || undefined,
    company_name: company || undefined,
  });
  return created.customer.id;
}

// Saves a card (from a Web Payments SDK token) to a customer, for subscriptions.
export interface SaveCardOptions {
  sourceId: string;
  customerId: string;
  verificationToken?: string;
  idempotencyKey: string;
}

/** A card on file (https://developer.squareup.com/reference/square/objects/Card). */
export interface SquareCard {
  id: string;
  card_brand?: string;
  last_4?: string;
  exp_month?: number;
  exp_year?: number;
  [field: string]: any;
}

export async function saveCard(opts: SaveCardOptions) {
  return (await saveCardDetails(opts)).id;
}

// The saved card itself: its id, and the brand, last four and expiry to show.
export async function saveCardDetails({ sourceId, customerId, verificationToken, idempotencyKey }: SaveCardOptions): Promise<SquareCard> {
  const { card } = await square("POST", "cards", {
    idempotency_key: idempotencyKey,
    source_id: sourceId,
    verification_token: verificationToken || undefined,
    card: { customer_id: customerId },
  });
  return card;
}

/* ── Orders and payments ── */

// One of our orders as a Square order, so it shows in Square POS and the Order Manager (and
// prints in the kitchen at that location). Shipped orders get a SHIPMENT fulfillment; collections,
// café orders and courier deliveries a PICKUP one (the courier collects it, so the bar sees when).
export function squareOrder(order: OrderForSquare, { currency, customerId, pickupAt, location = locationId(), lines: given = order.lines, includeShipping = true }: SquareOrderOptions) {
  // A gift card is one line per card (each activated against its own line), sold as a gift card
  // in Square, so it counts as money owed rather than a sale.
  const lines: SquareLine[] = given.flatMap((l, i) => (l.kind === "giftcard" ? Array.from({ length: l.qty }, (_, n) => ({ ...l, qty: 1, uid: giftCardUid(i, n) })) : [l]));
  // Sales tax: one Square tax per rate, applied to the lines that carry one (each line's taxRate).
  const taxOf = (l: SquareLine) => (l.taxRate! > 0 ? l.taxRate! : 0);
  const rates = [...new Set<number>(lines.map(taxOf).filter(Boolean))];
  const taxUid = (rate: number) => `tax-${String(rate).replace(".", "_")}`;
  const recipient = { display_name: order.contact.name, email_address: order.contact.email || undefined, phone_number: order.contact.phone || undefined };
  const fulfillments: object[] = [];
  const courier = order.cafe?.mode === "delivery" || order.fulfilment === "Local delivery";
  if (order.cafe || courier) {
    fulfillments.push({
      type: "PICKUP",
      state: "PROPOSED",
      pickup_details: {
        recipient,
        schedule_type: "SCHEDULED",
        pickup_at: pickupAt,
        note: courier ? "Uber Direct courier will collect for delivery" : "Order ahead",
        is_curbside_pickup: false,
      },
    });
  } else if (order.shipTo) {
    fulfillments.push({
      type: "SHIPMENT",
      state: "PROPOSED",
      shipment_details: {
        recipient: {
          ...recipient,
          display_name: order.shipTo.name || recipient.display_name,
          phone_number: order.shipTo.phone || recipient.phone_number,
          address: { address_line_1: order.shipTo.address, locality: order.shipTo.city, administrative_district_level_1: order.shipTo.state, postal_code: order.shipTo.postcode, country: order.shipTo.country || "US" },
        },
      },
    });
  } else if (order.fulfilment === "Pickup") {
    fulfillments.push({ type: "PICKUP", state: "PROPOSED", pickup_details: { recipient, schedule_type: "ASAP", pickup_at: pickupAt, note: "Collect at our office" } });
  }
  const discounted = (l: SquareLine) => (order.discount?.subscriber ? l.kind === "coffee" : !["sub", "prepaid", "giftcard"].includes(l.kind));
  return {
    location_id: location,
    reference_id: order.number,
    customer_id: customerId || undefined,
    source: { name: "Mimi Food website" },
    line_items: lines.map((l) => ({
      ...(l.kind === "giftcard" ? { uid: l.uid, item_type: "GIFT_CARD" } : {}),
      // The money off goes on the lines it came off (the subscriber discount on coffee; a code
      // not on subscriptions, prepaid gifts or gift cards), so Square's tax matches ours.
      ...(order.discount?.amount && discounted(l) ? { applied_discounts: [{ discount_uid: "code" }] } : {}),
      name: (l.mods ? l.title.replace(/ \(.*\)$/, "") : l.title).slice(0, 500),
      variation_name: l.variant || undefined,
      note: [l.prep, l.note].filter(Boolean).join(" · ") || undefined,
      quantity: String(l.qty),
      // Drink options go to Square as modifiers on the base price, so the bar's ticket lists them.
      base_price_money: money(l.mods ? l.basePrice! : l.price, currency),
      ...(l.mods ? { modifiers: l.mods.map((m) => ({ name: `${m.name}`.slice(0, 255), base_price_money: money(m.price, currency) })) } : {}),
      ...(taxOf(l) ? { applied_taxes: [{ tax_uid: taxUid(taxOf(l)) }] } : {}),
    })),
    taxes: rates.length ? rates.map((rate) => ({ uid: taxUid(rate), name: "Sales tax", percentage: String(Math.round(rate * 1e6) / 1e4), type: "ADDITIVE", scope: "LINE_ITEM" })) : undefined,
    service_charges: includeShipping
      ? ([
          [order.fulfilment === "Local delivery" ? "Delivery" : "Shipping", order.shipping],
          ["Delivery", order.cafeFee],
        ] as [string, number][])
          .filter(([, amount]) => amount > 0)
          .map(([name, amount]) => ({ name, amount_money: money(amount, currency), calculation_phase: "TOTAL_PHASE", taxable: false }))
      : undefined,
    discounts: order.discount?.amount
      ? [{ uid: "code", name: (order.discount.name || `Code ${order.discount.code}`).slice(0, 255), type: "FIXED_AMOUNT", amount_money: money(order.discount.amount, currency), scope: "LINE_ITEM" }]
      : undefined,
    fulfillments: fulfillments.length ? fulfillments : undefined,
    metadata: { order: order.number },
  };
}

export async function createOrder(order: OrderForSquare, opts: SquareOrderOptions & { suffix?: string | number }) {
  const { order: created } = await square("POST", "orders", { idempotency_key: key("order", order.number, opts.suffix || ""), order: squareOrder(order, opts) });
  return created;
}

// The Square line for one gift card: the order line it came from (i) and which of its quantity (n).
export const giftCardUid = (i: number, n: number) => `gift-card-${i}-${n}`;

// autocomplete false holds the money until payOrder() takes every payment for the order at once
// (a gift card and a card); partial lets a gift card pay what its balance covers.
export async function pay({ sourceId, orderId, amount, currency, customerId, verificationToken, email, reference, idempotencyKey, note, location = locationId(), autocomplete = true, partial = false }: { sourceId: string; orderId?: string; amount: number; currency: string; customerId?: string | null; verificationToken?: string; email?: string; reference?: string; idempotencyKey: string; note?: string; location?: string; autocomplete?: boolean; partial?: boolean }) {
  const { payment } = await square("POST", "payments", {
    idempotency_key: idempotencyKey,
    source_id: sourceId,
    verification_token: verificationToken || undefined,
    amount_money: money(amount, currency),
    order_id: orderId,
    customer_id: customerId || undefined,
    location_id: location,
    reference_id: reference,
    buyer_email_address: email || undefined,
    note: note || undefined,
    autocomplete,
    ...(partial ? { accept_partial_authorization: true } : {}),
  });
  return payment;
}

// A payment taken somewhere else (a bank payment through Stripe), recorded on the order so its
// Square invoice shows as paid.
export async function payExternal({ orderId, amount, currency, reference, source, idempotencyKey, location = locationId() }: { orderId: string; amount: number; currency: string; reference?: string; source: string; idempotencyKey: string; location?: string }) {
  const { payment } = await square("POST", "payments", {
    idempotency_key: idempotencyKey,
    source_id: "EXTERNAL",
    external_details: { type: "BANK_TRANSFER", source },
    amount_money: money(amount, currency),
    order_id: orderId,
    location_id: location,
    reference_id: reference,
    autocomplete: true,
  });
  return payment;
}

// Completes an order paid in parts (payments made with autocomplete false).
export async function payOrder({ orderId, paymentIds, idempotencyKey }: { orderId: string; paymentIds: string[]; idempotencyKey: string }) {
  const { order } = await square("POST", `orders/${encodeURIComponent(orderId)}/pay`, { idempotency_key: idempotencyKey, payment_ids: paymentIds });
  return order;
}

export const cancelPayment = (paymentId: string) => square("POST", `payments/${encodeURIComponent(paymentId)}/cancel`, {});

/* ── Gift cards ── */

// A gift card by the number on it (GAN), or null when there's no such card.
export async function giftCardByGan(gan: string) {
  try {
    const { gift_card: card } = await square("POST", "gift-cards/from-gan", { gan });
    return card || null;
  } catch (error: any) {
    if (error.status === 404) return null;
    throw error;
  }
}

// A new digital gift card, activated for the order line that sold it.
export async function issueGiftCard({ orderId, lineItemUid, idempotencyKey, location = locationId() }: { orderId: string; lineItemUid: string; idempotencyKey: string; location?: string }) {
  const { gift_card: card } = await square("POST", "gift-cards", { idempotency_key: key("gc", idempotencyKey), location_id: location, gift_card: { type: "DIGITAL" } });
  const { gift_card_activity: activity } = await square("POST", "gift-cards/activities", {
    idempotency_key: key("gca", idempotencyKey),
    gift_card_activity: { type: "ACTIVATE", location_id: location, gift_card_id: card.id, activate_activity_details: { order_id: orderId, line_item_uid: lineItemUid } },
  });
  return { ...card, balance_money: activity?.gift_card_balance_money || card.balance_money };
}

// Paying with a gift card takes its ID, as a gift card on file for the customer paying.
export async function linkGiftCard(giftCardId: string, customerId: string) {
  try {
    await square("POST", `gift-cards/${encodeURIComponent(giftCardId)}/link-customer`, { customer_id: customerId });
  } catch (error: any) {
    // Already linked to them: fine.
    if (!/already/i.test(error.message)) throw error;
  }
}

// The completed payment on an order, if any: a payment that timed out may still have gone through.
export async function completedPayment(orderId: string) {
  const { order } = await square("GET", `orders/${encodeURIComponent(orderId)}`);
  for (const t of order?.tenders || []) {
    if (!t.payment_id) continue;
    const { payment } = await square("GET", `payments/${encodeURIComponent(t.payment_id)}`);
    if (payment?.status === "COMPLETED") return payment;
  }
  return null;
}

export async function refund({ paymentId, amount, currency, reason, idempotencyKey }: { paymentId: string; amount: number; currency: string; reason?: string; idempotencyKey: string }) {
  const { refund: r } = await square("POST", "refunds", {
    idempotency_key: idempotencyKey,
    payment_id: paymentId,
    amount_money: money(amount, currency),
    reason: reason ? String(reason).slice(0, 192) : undefined,
  });
  return r;
}

/* ── Subscriptions ── */

export const CADENCE = { weekly: "WEEKLY", biweekly: "EVERY_TWO_WEEKS", monthly: "MONTHLY" };

// Subscription plans live in Square's catalog: one plan per coffee, one variation per size,
// frequency and price. They're created the first time they're needed; `cache` remembers the ids.
/** Remembers Square ids between restarts (subscription plans and their variations). */
export interface IdCache {
  get(key: string): string | undefined;
  set(key: string, value: string): unknown;
}

export async function planVariation({ coffee, size, freq, price, currency, cache }: { coffee: { id: string; label: string }; size: { id: string; label: string }; freq: keyof typeof CADENCE; price: number; currency: string; cache: IdCache }) {
  const slug = String(coffee.id).replace(/[^\w-]/g, "-"); // "p:sao-judas" → "p-sao-judas" for Square ids
  const id = `${coffee.id}:${size.id}:${freq}:${Math.round(price * 100)}`;
  if (cache.get(id)) return cache.get(id);
  const planKey = `plan:${coffee.id}`;
  let planId = cache.get(planKey);
  if (!planId) {
    const { catalog_object } = await square("POST", "catalog/object", {
      idempotency_key: key("plan", slug),
      object: { type: "SUBSCRIPTION_PLAN", id: `#plan-${slug}`, subscription_plan_data: { name: `${coffee.label} Subscription` } },
    });
    planId = catalog_object.id as string;
    await cache.set(planKey, planId);
  }
  const { catalog_object } = await square("POST", "catalog/object", {
    idempotency_key: key("var", id),
    object: {
      type: "SUBSCRIPTION_PLAN_VARIATION",
      id: `#var-${slug}-${size.id}-${freq}`,
      subscription_plan_variation_data: {
        name: `${coffee.label}, ${size.label}, ${freq}`,
        subscription_plan_id: planId,
        phases: [{ cadence: CADENCE[freq], ordinal: 0, pricing: { type: "STATIC", price: money(price, currency) } }],
      },
    },
  });
  await cache.set(id, catalog_object.id);
  return catalog_object.id;
}

// What a subscription bills now: its plan variation's price (dollars), or null if it can't be read.
export async function subscriptionBilled(subscriptionId: string): Promise<number | null> {
  const { subscription } = await square("GET", `subscriptions/${encodeURIComponent(subscriptionId)}`);
  if (!subscription?.plan_variation_id) return null;
  const { object } = await square("GET", `catalog/object/${encodeURIComponent(subscription.plan_variation_id)}`);
  const phase = object?.subscription_plan_variation_data?.phases?.[0];
  const cents = phase?.pricing?.price?.amount ?? phase?.pricing?.price_money?.amount ?? phase?.recurring_price_money?.amount;
  return cents == null ? null : Number(cents) / 100;
}

export async function subscribe({ customerId, cardId, planVariationId, idempotencyKey, startDate }: { customerId: string; cardId: string; planVariationId: string; idempotencyKey: string; startDate?: string }) {
  const { subscription } = await square("POST", "subscriptions", {
    idempotency_key: idempotencyKey,
    location_id: locationId(),
    customer_id: customerId,
    card_id: cardId,
    plan_variation_id: planVariationId,
    start_date: startDate || undefined,
    timezone: "America/Los_Angeles",
  });
  return subscription;
}

/* ── Invoices (wholesale) ── */

export async function invoice({ orderId, customerId, dueDate, number, title, idempotencyKey }: { orderId: string; customerId: string; dueDate: string; number: string; title: string; idempotencyKey: string }) {
  const { invoice: draft } = await square("POST", "invoices", {
    idempotency_key: idempotencyKey,
    invoice: {
      location_id: locationId(),
      order_id: orderId,
      primary_recipient: { customer_id: customerId },
      payment_requests: [{ request_type: "BALANCE", due_date: dueDate, automatic_payment_source: "NONE" }],
      delivery_method: "SHARE_MANUALLY", // we email it, with a link to the invoice in our portal
      invoice_number: number,
      title,
      accepted_payment_methods: { card: true, bank_account: true, square_gift_card: false },
    },
  });
  const { invoice: published } = await square("POST", `invoices/${encodeURIComponent(draft.id)}/publish`, { version: draft.version, idempotency_key: `${idempotencyKey}:pub`.slice(0, 45) });
  return published;
}

// A wholesale order cancelled here: its unpaid Square invoice is cancelled too.
export async function cancelInvoice(invoiceId: string) {
  const { invoice: inv } = await square("GET", `invoices/${encodeURIComponent(invoiceId)}`);
  if (!inv || !["UNPAID", "SCHEDULED", "PARTIALLY_PAID"].includes(inv.status)) return inv;
  const { invoice: cancelled } = await square("POST", `invoices/${encodeURIComponent(invoiceId)}/cancel`, { version: inv.version });
  return cancelled;
}

// A card saved only to pay several invoices at once: off file once they're paid.
export async function disableCard(cardId: string) {
  await square("POST", `cards/${encodeURIComponent(cardId)}/disable`, {});
}

/* ── Webhooks ── */

// Square signs base64(HMAC-SHA256(signature key, notification URL + raw body)) in
// x-square-hmacsha256-signature. Returns the event, or null if it isn't genuine.
export function verifyWebhook(rawBody: string, signature: string | string[] | undefined, url: string, signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY) {
  if (!signatureKey || !signature) return null;
  const expected = createHmac("sha256", signatureKey).update(url + rawBody).digest();
  const given = Buffer.from(String(signature), "base64");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

/* ── Catalog: the café menu (edited in our back office) kept in step in Square ── */

// A section of the menu as a Square category.
export async function upsertCategory({ id, name, squareId }: { id: string; name: string; squareId?: string | null }) {
  let version: number | undefined;
  if (squareId) {
    try {
      version = (await square("GET", `catalog/object/${encodeURIComponent(squareId)}`)).object?.version;
    } catch (error: any) {
      if (error.status !== 404) throw error;
      squareId = null;
    }
  }
  const { catalog_object } = await square("POST", "catalog/object", {
    idempotency_key: key("cat", id, Date.now().toString(36)),
    object: { type: "CATEGORY", id: squareId || `#cat-${id}`, version, category_data: { name } },
  });
  return catalog_object.id;
}

// A menu item as a Square item with one variation: price, sold out at our location, and
// archived when it's hidden from the menu. Returns the Square ids.
/** A café menu item, as the back office keeps it. */
export interface MenuItemForSquare {
  id: string;
  name: string;
  note?: string;
  price: number;
  visible?: boolean;
  soldOut?: boolean;
  squareItemId?: string | null;
}

export async function upsertMenuItem({ item, categoryId, currency }: { item: MenuItemForSquare; categoryId?: string | null; currency: string }) {
  let itemId = item.squareItemId || null;
  let version: number | undefined;
  let variation: CatalogRef | null = null;
  if (itemId) {
    try {
      const { object } = await square("GET", `catalog/object/${encodeURIComponent(itemId)}`);
      if (!object) throw Object.assign(new Error("Not in Square"), { status: 404 }); // gone: make it again
      version = object.version;
      variation = object.item_data?.variations?.[0] || null;
    } catch (error: any) {
      if (error.status !== 404) throw error;
      itemId = null; // deleted in Square: make it again
    }
  }
  const newItemId = itemId || `#item-${item.id}`;
  const { catalog_object } = await square("POST", "catalog/object", {
    idempotency_key: key("item", item.id, Date.now().toString(36)),
    object: {
      type: "ITEM",
      id: newItemId,
      version,
      item_data: {
        name: item.name,
        description: item.note || undefined,
        product_type: "FOOD_AND_BEV",
        categories: categoryId ? [{ id: categoryId }] : undefined,
        is_archived: !item.visible,
        variations: [
          {
            type: "ITEM_VARIATION",
            id: variation?.id || `#var-${item.id}`,
            version: variation?.version,
            item_variation_data: {
              item_id: newItemId,
              name: "Regular",
              pricing_type: "FIXED_PRICING",
              price_money: money(item.price, currency),
              location_overrides: [{ location_id: locationId(), sold_out: Boolean(item.soldOut) }],
            },
          },
        ],
      },
    },
  });
  return { squareItemId: catalog_object.id, squareVariationId: catalog_object.item_data?.variations?.[0]?.id || null };
}

export const deleteCatalogObject = (id: string) => square("DELETE", `catalog/object/${encodeURIComponent(id)}`);

// Uploads a photo to a Square item (multipart: a JSON "request" part and the image file).
export async function uploadItemImage({ itemId, photo, caption }: { itemId: string; photo: { id: string; data: string; type: string }; caption?: string }) {
  const base = (process.env.SQUARE_API_URL || (sandbox() ? "https://connect.squareupsandbox.com" : "https://connect.squareup.com")).replace(/\/$/, "");
  const form = new FormData();
  const request = { idempotency_key: key("img", photo.id), object_id: itemId, is_primary: true, image: { type: "IMAGE", id: "#image", image_data: { caption } } };
  form.append("request", new Blob([JSON.stringify(request)], { type: "application/json" }));
  form.append("image_file", new Blob([Buffer.from(photo.data, "base64")], { type: photo.type }), photo.id);
  const res = await fetch(`${base}/v2/catalog/images`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.SQUARE_ACCESS_TOKEN}`, "Square-Version": SQUARE_VERSION },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  const data: SquareResponse = await (res.json() as Promise<any>).catch(() => ({}));
  if (!res.ok || data.errors?.length) throw new SquareError(`Square ${res.status}: ${data.errors?.[0]?.detail || "image upload failed"}`, { status: res.status });
  return data.image?.id || null;
}

// A retail coffee as a Square item: a 250g and a 1kg variation at the current selling price,
// in its roast's category, archived when it's hidden from the shop.
export async function upsertProduct({ product, price250, price1kg, categoryId, archived, squareItemId, currency }: { product: { id: string; name: string; notes?: string; about?: string }; price250: number; price1kg: number; categoryId?: string | null; archived?: boolean; squareItemId?: string | null; currency: string }) {
  let itemId = squareItemId || null;
  let version: number | undefined;
  let existing: CatalogRef[] = [];
  if (itemId) {
    try {
      const { object } = await square("GET", `catalog/object/${encodeURIComponent(itemId)}`);
      if (!object) throw Object.assign(new Error("Not in Square"), { status: 404 }); // gone: make it again
      version = object.version;
      existing = object.item_data?.variations || [];
    } catch (error: any) {
      if (error.status !== 404) throw error;
      itemId = null;
    }
  }
  const newItemId = itemId || `#item-${product.id}`;
  const variation = (name: string, amount: number) => {
    const found = existing.find((v) => v.item_variation_data?.name === name);
    return {
      type: "ITEM_VARIATION",
      id: found?.id || `#var-${product.id}-${name}`,
      version: found?.version,
      item_variation_data: { item_id: newItemId, name, pricing_type: "FIXED_PRICING", price_money: money(amount, currency) },
    };
  };
  const { catalog_object } = await square("POST", "catalog/object", {
    idempotency_key: key("prod", product.id, Date.now().toString(36)),
    object: {
      type: "ITEM",
      id: newItemId,
      version,
      item_data: {
        name: product.name,
        description: [product.notes, product.about].filter(Boolean).join(". ") || undefined,
        product_type: "REGULAR",
        categories: categoryId ? [{ id: categoryId }] : undefined,
        is_archived: Boolean(archived),
        variations: [variation("250g", price250), variation("1kg", price1kg)],
      },
    },
  });
  return catalog_object.id;
}

/* ── Vendors: our suppliers in Square, and who supplies each product ── */

// A supplier as a Square vendor: made (or found by name, so there's never a second one), then
// kept in step. Archived or deleted here: inactive there (Square doesn't delete vendors).
// Returns the vendor's id.
export async function upsertVendor({ supplier, vendorId, active = true }: { supplier: { id: string; name: string; contactName?: string; email?: string; phone?: string; notes?: string }; vendorId?: string | null; active?: boolean }) {
  let current: any = null;
  if (vendorId) {
    current = await square("GET", `vendors/${encodeURIComponent(vendorId)}`)
      .then((r) => r.vendor)
      .catch((error) => (error.status === 404 ? null : Promise.reject(error)));
  }
  if (!current) {
    const found = await square("POST", "vendors/search", { filter: { name: [supplier.name] } });
    current = (found.vendors || []).find((v: any) => String(v.name).toLowerCase() === supplier.name.toLowerCase()) || null;
  }
  const contact = supplier.contactName || supplier.email || supplier.phone
    ? [{ ...(current?.contacts?.[0]?.id && { id: current.contacts[0].id }), name: supplier.contactName || supplier.name, email_address: supplier.email || undefined, phone_number: supplier.phone || undefined, ordinal: 0 }]
    : undefined;
  const vendor = { name: supplier.name, contacts: contact, note: supplier.notes || undefined, status: active ? "ACTIVE" : "INACTIVE" };
  if (current) {
    const { vendor: v } = await square("PUT", `vendors/${encodeURIComponent(current.id)}`, { idempotency_key: key("vend", supplier.id.slice(0, 12), Date.now().toString(36)), vendor: { id: current.id, version: current.version, ...vendor } });
    return v.id as string;
  }
  const { vendor: v } = await square("POST", "vendors/create", { idempotency_key: key("vendnew", supplier.id.slice(0, 12), Date.now().toString(36)), vendor });
  return v.id as string;
}

// Who supplies a product and what each size costs us: Square's vendor info on the item's 250g and
// 1kg variations. vendorId null takes it off. known: the vendor info ids we made before, by size.
// Returns the ids now in Square, by size.
export async function setProductVendor({ itemId, vendorId, costs, currency, known = {} }: { itemId: string; vendorId: string | null; costs: Record<string, number | null>; currency: string; known?: Record<string, string> }) {
  const ids = Object.values(known).filter(Boolean);
  const existing = ids.length ? ((await square("POST", "catalog/batch-retrieve", { object_ids: ids })).objects || []) : [];
  if (!vendorId) {
    if (existing.length) await square("POST", "catalog/batch-delete", { object_ids: existing.map((o: any) => o.id) });
    return {};
  }
  const { object: item } = await square("GET", `catalog/object/${encodeURIComponent(itemId)}`);
  const objects = (item?.item_data?.variations || [])
    .filter((v: any) => v.item_variation_data?.name in costs)
    .map((v: any) => {
      const size = v.item_variation_data.name;
      const was = existing.find((o: any) => o.id === known[size]);
      const cost = costs[size];
      return {
        type: "ITEM_VARIATION_VENDOR_INFO",
        id: was?.id || `#vvi-${size}`,
        ...(was && { version: was.version }),
        item_variation_vendor_info_data: { item_variation_id: v.id, vendor_id: vendorId, ordinal: 0, ...(cost != null && { price_money: money(cost, currency) }) },
      };
    });
  if (!objects.length) return {};
  const res = await square("POST", "catalog/batch-upsert", { idempotency_key: key("vvi", itemId, Date.now().toString(36)), batches: [{ objects }] });
  const mapped = Object.fromEntries((res.id_mappings || []).map((m: any) => [m.client_object_id, m.object_id]));
  const out: Record<string, string> = {};
  for (const o of objects) {
    const size = (item.item_data.variations.find((v: any) => v.id === o.item_variation_vendor_info_data.item_variation_id) || {}).item_variation_data?.name;
    out[size] = mapped[o.id] || o.id;
  }
  return out;
}
