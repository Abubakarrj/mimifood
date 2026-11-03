// Discount codes, made in the back office and typed in at checkout. A code takes a percentage
// or an amount off the order, or makes its shipping free; optionally with a minimum spend, an
// end date and a usage limit. Subscriptions are left out (Square bills those on their own).

import { randomUUID } from "node:crypto";

export type PromoKind = "percent" | "amount" | "freeship";

/** A discount code. `value` is the percentage or the dollars off (0 for free shipping). */
export interface PromoCode {
  id: string;
  code: string;
  kind: PromoKind;
  value: number;
  minSubtotal: number;
  endsOn: string | null;
  maxUses: number | null;
  uses: number;
  active: boolean;
  source?: "welcome" | "ambassador" | "credit" | null;
  /** Store credit (source "credit"): who it's for, the return it came from, and what it started at. */
  credit?: { email: string; order: string; original: number } | null;
  createdAt: string;
}

/** What a code does to an order. */
export interface PromoDiscount {
  code: string;
  label: string;
  amount: number;
  freeShipping: boolean;
}

/** The storage this module keeps its codes in (storage.open). */
export interface PromoStorage {
  data: { [part: string]: PromoCode[] };
  save: () => Promise<unknown>;
}

/** A code's fields from the back office form: each is checked or coerced in clean(). */
type PromoInput = { [field: string]: any };

export class PromoError extends Error {
  declare status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export const PROMO_PARTS = { codes: (x: PromoCode) => x.id };
const KINDS: PromoKind[] = ["percent", "amount", "freeship"];
const cents = (n: number) => Math.round(n * 100) / 100;
const normal = (code: unknown) => String(code || "").trim().toUpperCase().replace(/\s+/g, "");

export function createPromos({ store }: { store: PromoStorage }) {
  const db = store.data;
  db.codes ||= [];
  const save = () => store.save();
  const find = (code: unknown) => db.codes.find((c) => c.code === normal(code));

  function clean(input: PromoInput, before: Partial<PromoCode> = {}): PromoCode {
    const c = { ...before };
    if ("code" in input) {
      c.code = normal(input.code);
      if (!/^[A-Z0-9_-]{3,24}$/.test(c.code)) throw new PromoError("Codes are 3–24 letters or numbers (dashes and underscores are fine).");
      if (db.codes.some((x) => x.code === c.code && x.id !== c.id)) throw new PromoError(`There's already a code ${c.code}.`);
    }
    if ("kind" in input) {
      if (!KINDS.includes(input.kind)) throw new PromoError("Choose percent off, amount off or free shipping.");
      c.kind = input.kind;
    }
    if ("value" in input || "kind" in input) {
      const n = Number(String(input.value ?? c.value ?? "").replace(/[^0-9.]/g, ""));
      if (c.kind === "percent" && !(n > 0 && n <= 100)) throw new PromoError("Enter a percentage from 1 to 100.");
      if (c.kind === "amount" && !(n > 0 && n <= 10_000)) throw new PromoError("Enter the amount off.");
      c.value = c.kind === "freeship" ? 0 : cents(n);
    }
    if ("minSubtotal" in input) {
      const n = Number(String(input.minSubtotal || "0").replace(/[^0-9.]/g, ""));
      c.minSubtotal = n > 0 ? cents(n) : 0;
    }
    if ("endsOn" in input) {
      const d = String(input.endsOn || "");
      if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new PromoError("Choose an end date, or leave it empty.");
      c.endsOn = d || null;
    }
    if ("maxUses" in input) {
      const n = Math.floor(Number(input.maxUses) || 0);
      c.maxUses = n > 0 ? n : null;
    }
    if ("active" in input) c.active = Boolean(input.active);
    if ("source" in input) c.source = ["welcome", "ambassador", "credit"].includes(input.source) ? input.source : null; // made by a newsletter signup, for an ambassador, or as store credit
    if (!c.code) throw new PromoError("Please enter a code.");
    if (!c.kind) throw new PromoError("Choose percent off, amount off or free shipping.");
    return c as PromoCode;
  }

  async function create(input: PromoInput) {
    const c = clean(input, { id: randomUUID(), uses: 0, active: true, minSubtotal: 0, endsOn: null, maxUses: null, createdAt: new Date().toISOString() });
    db.codes.push(c);
    await save();
    return c;
  }

  async function update(id: string, input: PromoInput) {
    const i = db.codes.findIndex((c) => c.id === id);
    if (i < 0) throw new PromoError("Code not found.", 404);
    db.codes[i] = clean(input, db.codes[i]);
    await save();
    return db.codes[i];
  }

  async function remove(id: string) {
    const before = db.codes.length;
    db.codes = db.codes.filter((c) => c.id !== id);
    if (db.codes.length === before) throw new PromoError("Code not found.", 404);
    await save();
  }

  // What a code does to an order: { code, label, amount, freeShipping }, or a PromoError saying
  // why it doesn't apply. `eligible` is what it can take money off (not subscriptions);
  // `shipping` is the order's delivery charge. `today` is the shop's date (YYYY-MM-DD).
  function apply(code: string, { eligible, shipping, today }: { eligible: number; shipping: number; today: string }): PromoDiscount {
    const c = find(code);
    // Unknown, switched off, ended or used up: all just invalid to the customer.
    if (!c || !c.active || (c.endsOn && today > c.endsOn) || (c.maxUses && c.uses >= c.maxUses)) throw new PromoError("Invalid code.");
    // Nothing in the cart it can take money off (only gift cards or subscriptions).
    if (eligible <= 0) throw new PromoError("Not Applicable");
    if (c.minSubtotal && eligible < c.minSubtotal) throw new PromoError(`That code needs an order of $${c.minSubtotal.toFixed(2)} or more.`);
    if (c.kind === "freeship") {
      if (!shipping) throw new PromoError("Shipping on this order is already free.");
      return { code: c.code, label: "Free shipping", amount: 0, freeShipping: true };
    }
    const amount = cents(Math.min(eligible, c.kind === "percent" ? (eligible * c.value) / 100 : c.value));
    return { code: c.code, label: c.kind === "percent" ? `${c.value}% off` : `$${c.value.toFixed(2)} off`, amount, freeShipping: false };
  }

  // At payment: still on, not ended, and with a use left after `holding` (others paying with it now).
  // Store credit also needs `amount` (what this order and those take off) still on it.
  function usable(code: string, { today, holding = 0, amount = 0 }: { today: string; holding?: number; amount?: number }) {
    const c = find(code);
    if (c?.source === "credit" && c.value + 0.005 < amount) return false;
    return Boolean(c && c.active && !(c.endsOn && today > c.endsOn) && !(c.maxUses && (c.uses || 0) + holding >= c.maxUses));
  }

  // A paid order used the code. Store credit keeps what's left of it for next time (`amount`
  // is what it took off), and is used up once nothing is left.
  async function used(code: string, amount = 0) {
    const c = find(code);
    if (!c) return;
    c.uses = (c.uses || 0) + 1;
    if (c.source === "credit") {
      c.value = cents(Math.max(0, c.value - amount));
      if (c.value < 0.01) c.active = false;
    }
    await save();
  }

  // Store credit for a customer: a code worth `amount` off, kept until it's spent (no end date).
  async function storeCredit({ amount, email, order }: { amount: number; email: string; order: string }) {
    let code = "";
    do code = `CREDIT-${randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase()}`;
    while (find(code));
    const c: PromoCode = { id: randomUUID(), code, kind: "amount", value: cents(amount), minSubtotal: 0, endsOn: null, maxUses: null, uses: 0, active: true, source: "credit", credit: { email: String(email || "").toLowerCase(), order, original: cents(amount) }, createdAt: new Date().toISOString() };
    db.codes.push(c);
    await save();
    return c;
  }

  // A customer's store credit still to spend: [{ code, value }].
  const creditsFor = (email: string) => db.codes.filter((c) => c.source === "credit" && c.active && c.value >= 0.01 && c.credit?.email === String(email || "").toLowerCase()).map((c) => ({ code: c.code, value: c.value }));

  const list = () => [...db.codes].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));

  return { list, create, update, remove, apply, usable, used, storeCredit, creditsFor };
}
