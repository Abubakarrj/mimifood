// Stock counts, set in the back office (Products → Stock). Optional per product: a product
// without a count is never sold out by count, only by the Sold out switch. With one, each paid
// order takes from it, a cancelled order puts it back, and at 0 the product shows Sold Out (and
// "Only N Left" when few are left).
//
// What's counted: a coffee in 250g bags (a 1kg bag takes 4), a tea in packs (8 cups), an accessory in
// units, per size (a tee) or per color (a dripper) when it has them.
//
// Notify Me: people who ask to hear when a sold-out product (or one size or color of it) is back.
// They're emailed once it can be bought again, however that happens (its count goes up, or its
// Sold out switch goes off), then forgotten.
//
// Stored with server/storage.js as storage.open("stock", STOCK_PARTS).

import { randomBytes } from "node:crypto";

export const STOCK_PARTS = {
  counts: (c) => c.id, // { id: stock key, left, updatedAt }
  waits: (w) => w.id, // { id, key (product id), email, lang, createdAt }
  levels: (l) => l.id, // { id: stock key, reorderAt }: the back office's "running low" line
  log: (l) => l.id, // every change: { id, at, key, change, left, reason, ref, by, note }
};

const LOG_DAYS = 400;

export class StockError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const LOW_STOCK = 5; // "Only N Left" at this many or fewer
export const BAG_UNITS = { "250g": 1, "1kg": 4 };

// "flat-white-tee:M", "ceramic-dripper:White", or the product id.
export const stockKey = (product, variant = "") => (variant ? `${product}:${variant}` : product);

// Every countable thing in the shop, for the back office: [{ key, product, variant, name, unit }].
export function stockItems(DATA) {
  const items = [];
  for (const p of DATA.PRODUCTS || []) items.push({ key: p.id, product: p.id, variant: "", name: p.short || p.name, kind: "Coffee", unit: "250g bags" });
  for (const a of DATA.ACCESSORIES || []) {
    if (a.price == null) continue;
    const tea = a.category === "Tea";
    const variants = a.sizes?.length ? a.sizes : (a.colors || []).map((c) => c.name);
    if (variants.length) for (const v of variants) items.push({ key: stockKey(a.id, v), product: a.id, variant: v, name: a.short || a.name, kind: a.category || "Accessories", unit: "units" });
    else items.push({ key: a.id, product: a.id, variant: "", name: a.short || a.name, kind: tea ? "Tea" : a.category || "Accessories", unit: tea ? "packs" : "units" });
  }
  return items;
}

// The stock an order line takes: [{ key, units }].
export function lineUnits(line, DATA) {
  if (line.kind === "coffee") {
    if (String(line.variant || "").startsWith("50g")) return []; // a sample, roasted for it
    const size = String(line.variant || "").startsWith("1kg") ? "1kg" : "250g";
    return [{ key: line.product, units: line.qty * BAG_UNITS[size] }];
  }
  if (line.kind === "accessory") {
    const a = (DATA.ACCESSORIES || []).find((x) => x.id === line.product);
    const variant = a?.sizes?.length ? line.size : a?.colors?.length ? line.color : "";
    return [{ key: stockKey(line.product, variant || ""), units: line.qty }];
  }
  return [];
}

export function createStock({ store }) {
  const db = store.data;
  db.levels ||= [];
  db.log ||= [];
  // One line in the stock log (kept 400 days, at most 20,000 lines).
  const note = (key, change, left, meta: any = {}) => {
    if (!change) return;
    db.log.unshift({ id: randomBytes(6).toString("hex"), at: new Date().toISOString(), key, change, left, reason: String(meta.reason || "Changed").slice(0, 60), ref: String(meta.ref || "").slice(0, 60), by: String(meta.by || "").slice(0, 80), note: String(meta.note || "").slice(0, 200) });
    if (db.log.length > 20_000 || db.log.length % 200 === 0) {
      const cutoff = new Date(Date.now() - LOG_DAYS * 864e5).toISOString();
      db.log = db.log.filter((l) => l.at > cutoff).slice(0, 20_000);
    }
  };
  const save = () => store.save();
  const counts = () => new Map<any, any>(db.counts.map((c) => [c.id, c.left]));

  // Units left for a key, or null when it isn't counted.
  const left = (key) => {
    const c = db.counts.find((x) => x.id === key);
    return c ? c.left : null;
  };

  // A product's state from its counts: whether it's sold out by count, how many are left, and
  // per size or color. `variants` are the product's sizes or color names (empty for none).
  function stateOf(productId, variants = []) {
    if (!variants.length) {
      const n = left(productId);
      return n == null ? {} : { left: Math.max(0, n), out: n <= 0 };
    }
    const by = {};
    for (const v of variants) {
      const n = left(stockKey(productId, v));
      if (n != null) by[v] = Math.max(0, n);
    }
    const counted = Object.keys(by);
    if (!counted.length) return {};
    const allOut = counted.length === variants.length && counted.every((v) => by[v] === 0);
    return { leftBy: by, out: allOut };
  }

  // The live catalog with counts applied: soldOut at 0, `left` (or `leftBy`) when counted.
  function apply(products, accessories) {
    const mark = (x, variants) => {
      const s = stateOf(x.id, variants);
      const out = { ...x };
      if (s.left != null) out.left = s.left;
      if (s.leftBy) out.leftBy = s.leftBy;
      if (s.out) out.soldOut = true;
      return out;
    };
    return {
      products: products.map((p) => mark(p, [])),
      accessories: accessories.map((a) => mark(a, a.sizes?.length ? a.sizes : (a.colors || []).map((c) => c.name))),
    };
  }

  // Set (a number) or stop counting (null). `meta`: { reason, ref, by, note } for the log.
  async function set(key, value, meta: any = {}) {
    const before = left(key);
    if (value === null || value === "") {
      db.counts = db.counts.filter((c) => c.id !== key);
    } else {
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n) || n < 0 || n > 100_000) throw new StockError("Enter how many are left (0 or more).");
      const c = db.counts.find((x) => x.id === key);
      if (c) Object.assign(c, { left: n, updatedAt: new Date().toISOString() });
      else db.counts.push({ id: key, left: n, updatedAt: new Date().toISOString() });
      note(key, n - (before ?? 0), n, { reason: before == null ? "Started counting" : "Set", ...meta });
    }
    await save();
  }

  // What's short for these lines: [{ key, want, left }] (empty when everything is there).
  // `held`: units other checkouts are paying for right now, so not to be had.
  function short(units, held = []) {
    const want = new Map();
    for (const u of units) want.set(u.key, (want.get(u.key) || 0) + u.units);
    const have = counts();
    for (const u of held) if (have.has(u.key)) have.set(u.key, have.get(u.key) - u.units);
    return [...want].filter(([key, n]) => have.has(key) && have.get(key) < n).map(([key, n]) => ({ key, want: n, left: Math.max(0, have.get(key)) }));
  }

  // Take these units (sign -1), or put them back (sign 1). Returns what was moved, to undo it.
  // `meta`: { reason, ref, by } for the log.
  async function move(units, sign = -1, meta: any = {}) {
    const moved = [];
    for (const u of units) {
      const c = db.counts.find((x) => x.id === u.key);
      if (!c) continue;
      const before = c.left;
      c.left = Math.max(0, c.left + sign * u.units);
      c.updatedAt = new Date().toISOString();
      moved.push({ key: u.key, units: Math.abs(c.left - before) });
      note(u.key, c.left - before, c.left, { reason: sign < 0 ? "Sold" : "Put back", ...meta });
    }
    if (moved.length) await save();
    return moved;
  }

  /* ── Notify Me ── */
  async function wait(key, email, lang = "en") {
    const e = String(email || "").trim().toLowerCase().slice(0, 200);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new StockError("Enter a valid email.");
    if (!db.waits.some((w) => w.key === key && w.email === e)) {
      if (db.waits.filter((w) => w.email === e).length >= 20) throw new StockError("That email is already waiting on lots of products.");
      db.waits.push({ id: randomBytes(8).toString("hex"), key, email: e, lang: ["es", "ko"].includes(lang) ? lang : "en", createdAt: new Date().toISOString() });
      await save();
    }
  }
  const waitCounts = () => db.waits.reduce((m, w) => ((m[w.key] = (m[w.key] || 0) + 1), m), {});
  async function done(ids) {
    const gone = new Set(ids);
    db.waits = db.waits.filter((w) => !gone.has(w.id));
    await save();
  }
  async function unwait(id) {
    const before = db.waits.length;
    db.waits = db.waits.filter((w) => w.id !== id);
    if (db.waits.length !== before) await save();
    return db.waits.length !== before;
  }

  // The back office's reorder level for a key (when to make or buy more), or null for the default.
  const reorderAt = (key) => db.levels.find((l) => l.id === key)?.reorderAt ?? null;
  async function setReorderAt(key, value) {
    db.levels = db.levels.filter((l) => l.id !== key);
    if (value !== null && value !== "") {
      const n = Math.floor(Number(value));
      if (!Number.isFinite(n) || n < 0 || n > 100_000) throw new StockError("Enter the reorder level (0 or more).");
      if (n > 0) db.levels.push({ id: key, reorderAt: n });
    }
    await save();
  }

  return { left, apply, set, short, move, wait, waits: () => db.waits.slice(), waitCounts, done, unwait, list: () => db.counts.map((c) => ({ ...c })), reorderAt, setReorderAt, log: ({ key = "", limit = 200 } = {}) => db.log.filter((l) => !key || l.key === key).slice(0, limit) };
}
