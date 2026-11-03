// Green coffee: what's on the shelf to roast (in kg), the reorder cart that turns low stock into
// purchase orders (one per supplier), and the roast schedule that turns green coffee into bags.
//
// - An item is one green coffee we buy: its supplier, cost per kg, how much is on hand, the level
//   to reorder at and how much to order then, and the shop coffees it's roasted into.
// - The cart holds lines to order ({ id, qty, unitCost, later }); "later" lines stay in the cart
//   but aren't ordered. Submitting makes a purchase order per supplier (server.ts).
// - A batch is one roast: a day, a coffee, which green coffee and how many kg. Marking it roasted
//   takes the kg from the item and adds the bags it made to the coffee's stock count (server.ts).
//
// Stored with server/storage.js as storage.open("green", GREEN_PARTS).

import { randomUUID } from "node:crypto";

export const GREEN_PARTS = {
  items: (x) => x.id,
  batches: (x) => x.id,
  cart: (x) => x.id, // one: { id: "cart", lines: [...] }
  log: (x) => x.id, // every change in kg: { id, at, itemId, change, onHand, reason, ref, by, note }
  // Samples a supplier sends to cup before buying: requested → arrived → cupped (a score out of
  // 100 and notes) → approved (made a green coffee to buy) or declined.
  samples: (x) => x.id,
};

export const SAMPLE_STATUSES = ["requested", "arrived", "cupped", "approved", "declined"];

// Weight lost in a light roast (water, mostly): 1 kg of green makes about 0.85 kg roasted.
export const ROAST_LOSS = 0.15;
// Roasted 250g bags a batch should make.
export const bagsFrom = (greenKg) => Math.floor((greenKg * (1 - ROAST_LOSS) * 1000) / 250);

export class GreenError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const kg = (v) => Math.round(Number(v) * 10) / 10;
const cents = (n) => Math.round(n * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function createGreen({ store }) {
  const db = store.data;
  db.items ||= [];
  db.batches ||= [];
  db.cart ||= [];
  db.log ||= [];
  db.samples ||= [];
  // Each roast's number (R-1001, R-1002…), given in the order they were planned; older roasts
  // without one get theirs here.
  const roastNo = (b) => Number(String(b.number || "").slice(2)) || 0;
  const nextRoastNo = () => `R-${Math.max(1000, ...db.batches.map(roastNo)) + 1}`;
  for (const b of [...db.batches].filter((x) => !x.number).sort((x, y) => (x.createdAt || "").localeCompare(y.createdAt || ""))) b.number = nextRoastNo();
  const save = () => store.save();
  const note = (itemId, change, onHand, meta: any = {}) => {
    if (!change) return;
    db.log.unshift({ id: randomUUID(), at: new Date().toISOString(), itemId, change: kg(change), onHand, reason: String(meta.reason || "Changed").slice(0, 60), ref: String(meta.ref || "").slice(0, 60), by: String(meta.by || "").slice(0, 80), note: String(meta.note || "").slice(0, 200) });
    db.log = db.log.slice(0, 10_000);
  };
  const now = () => new Date().toISOString();
  const item = (id) => db.items.find((x) => x.id === id) || null;
  const batch = (id) => db.batches.find((x) => x.id === id) || null;
  const cartDoc = () => db.cart.find((c) => c.id === "cart") || (db.cart.push({ id: "cart", lines: [] }), db.cart[db.cart.length - 1]);

  /* ── Items ── */
  function cleanItem(input, was: any = {}) {
    const x = {
      name: text(input.name ?? was.name, 120),
      origin: text(input.origin ?? was.origin, 120),
      supplierId: text(input.supplierId ?? was.supplierId, 64) || null,
      unitCost: cents(Number(input.unitCost ?? was.unitCost ?? 0)),
      onHand: kg(input.onHand ?? was.onHand ?? 0),
      reorderAt: input.reorderAt === "" || input.reorderAt === null ? null : kg(input.reorderAt ?? was.reorderAt ?? null),
      reorderQty: input.reorderQty === "" || input.reorderQty === null ? null : kg(input.reorderQty ?? was.reorderQty ?? null),
      products: (Array.isArray(input.products) ? input.products : was.products || []).map((p) => text(p, 64)).filter(Boolean).slice(0, 20),
      // The size of the supplier's bags (60 or 69 kg, say), to order in bags; and their lot code.
      bagKg: input.bagKg === "" || input.bagKg === null ? null : kg(input.bagKg ?? was.bagKg ?? null) || null,
      lotCode: text(input.lotCode ?? was.lotCode, 60),
      notes: text(input.notes ?? was.notes, 500),
    };
    if (!x.name) throw new GreenError("Add the coffee's name.");
    if (!(x.unitCost >= 0) || x.unitCost > 1000) throw new GreenError("Enter the cost per kg in dollars.");
    if (!(x.onHand >= 0) || x.onHand > 100_000) throw new GreenError("Enter how many kg are on hand (0 or more).");
    for (const [f, label] of [["reorderAt", "reorder level"], ["reorderQty", "amount to order"]]) {
      if (x[f] != null && (!(x[f] >= 0) || x[f] > 100_000)) throw new GreenError(`Enter the ${label} in kg.`);
    }
    if (x.reorderAt === 0) x.reorderAt = null;
    if (x.reorderQty === 0) x.reorderQty = null;
    return x;
  }
  async function addItem(input, by = "") {
    const x = { id: randomUUID(), ...cleanItem(input), createdAt: now() };
    db.items.push(x);
    note(x.id, x.onHand, x.onHand, { reason: "Started counting", by });
    await save();
    return x;
  }
  async function updateItem(id, input, meta: any = {}) {
    const x = item(id);
    if (!x) throw new GreenError("That green coffee isn't here any more.", 404);
    const before = x.onHand;
    Object.assign(x, cleanItem(input, x), { updatedAt: now() });
    if (x.onHand !== before) note(x.id, x.onHand - before, x.onHand, { reason: "Set", ...meta });
    await save();
    return x;
  }
  // Archived when it has history (batches); otherwise gone.
  async function removeItem(id) {
    const x = item(id);
    if (!x) throw new GreenError("That green coffee isn't here any more.", 404);
    if (db.batches.some((b) => b.greenId === id)) x.archivedAt = now();
    else db.items = db.items.filter((y) => y !== x);
    const c = cartDoc();
    c.lines = c.lines.filter((l) => l.id !== id);
    await save();
  }
  // Kilos in (a delivery) or out (a roast). Never below 0. Returns the change actually made.
  async function adjust(id, delta, meta: any = {}) {
    const x = item(id);
    if (!x) return 0;
    const before = x.onHand;
    x.onHand = Math.max(0, kg(x.onHand + delta));
    x.updatedAt = now();
    note(x.id, x.onHand - before, x.onHand, meta);
    await save();
    return kg(x.onHand - before);
  }

  /* ── Cart ── */
  function setCart(lines) {
    const c = cartDoc();
    c.lines = (Array.isArray(lines) ? lines : [])
      .map((l) => ({ id: text(l.id, 64), qty: kg(l.qty), unitCost: cents(Number(l.unitCost ?? item(l.id)?.unitCost ?? 0)), later: Boolean(l.later) }))
      .filter((l) => item(l.id) && l.qty > 0 && l.qty <= 100_000 && l.unitCost >= 0)
      .filter((l, i, all) => all.findIndex((x) => x.id === l.id) === i)
      .slice(0, 100);
    return save();
  }
  const cart = () => cartDoc().lines.slice();
  // Take the ordered lines out of the cart (the "later" ones stay).
  async function clearOrdered(ids) {
    const c = cartDoc();
    const gone = new Set(ids);
    c.lines = c.lines.filter((l) => !gone.has(l.id));
    await save();
  }

  /* ── Batches ── */
  function cleanBatch(input, was: any = {}) {
    const b = {
      date: DATE_RE.test(input.date ?? was.date ?? "") ? input.date ?? was.date : "",
      product: text(input.product ?? was.product, 64),
      greenId: text(input.greenId ?? was.greenId, 64),
      greenKg: kg(input.greenKg ?? was.greenKg ?? 0),
      note: text(input.note ?? was.note, 300),
      // Who roasts it (a teammate), or no one yet.
      roasterId: text(input.roasterId ?? was.roasterId, 64),
      roasterName: text(input.roasterName ?? was.roasterName, 80),
    };
    if (!b.roasterId) b.roasterName = "";
    if (!b.date) throw new GreenError("Pick the day to roast.");
    if (!b.product) throw new GreenError("Pick the coffee.");
    if (!item(b.greenId)) throw new GreenError("Pick the green coffee it's roasted from.");
    if (!(b.greenKg > 0) || b.greenKg > 1000) throw new GreenError("Enter how many kg of green coffee to roast.");
    return b;
  }
  async function planBatch(input, by = "") {
    const b = { id: randomUUID(), number: nextRoastNo(), ...cleanBatch(input), status: "planned", by, createdAt: now() };
    db.batches.push(b);
    await save();
    return b;
  }
  async function updateBatch(id, input) {
    const b = batch(id);
    if (!b) throw new GreenError("That roast isn't here any more.", 404);
    if (b.status !== "planned") throw new GreenError("Only a planned roast can be changed.");
    Object.assign(b, cleanBatch(input, b), { updatedAt: now() });
    await save();
    return b;
  }
  // Roasted: record what it made, what was moved (to undo it exactly), and what the green coffee
  // cost (its cost per kg then), so each bag's real green cost is known.
  async function markRoasted(id, { bags, moved }, by = "") {
    const b = batch(id);
    const cost = cents(b.greenKg * (item(b.greenId)?.unitCost || 0));
    Object.assign(b, { status: "roasted", bags, moved, roastedAt: now(), roastedBy: by, cost, costPerBag: bags > 0 ? cents(cost / bags) : null });
    await save();
    return b;
  }
  async function setStatus(id, status) {
    const b = batch(id);
    if (!b) throw new GreenError("That roast isn't here any more.", 404);
    b.status = status;
    if (status === "planned") {
      delete b.bags;
      delete b.moved;
      delete b.roastedAt;
      delete b.roastedBy;
    }
    b.updatedAt = now();
    await save();
    return b;
  }

  /* ── Samples ── */
  const sample = (id) => db.samples.find((x) => x.id === id) || null;
  function cleanSample(input, was: any = {}) {
    const num = (v, w) => (v === "" || v === null ? null : v === undefined ? w ?? null : Number(v));
    const x = {
      name: text(input.name ?? was.name, 120),
      origin: text(input.origin ?? was.origin, 120),
      process: text(input.process ?? was.process, 60),
      supplierId: text(input.supplierId ?? was.supplierId, 64) || null,
      unitCost: num(input.unitCost, was.unitCost),
      bagKg: num(input.bagKg, was.bagKg),
      lotCode: text(input.lotCode ?? was.lotCode, 60),
      score: num(input.score, was.score),
      notes: text(input.notes ?? was.notes, 1000),
    };
    if (!x.name) throw new GreenError("Add the coffee's name.");
    if (x.unitCost != null && (!(x.unitCost >= 0) || x.unitCost > 1000)) throw new GreenError("Enter the price per kg in dollars.");
    if (x.unitCost != null) x.unitCost = cents(x.unitCost);
    if (x.bagKg != null && (!(x.bagKg > 0) || x.bagKg > 1000)) throw new GreenError("Enter the bag size in kg.");
    if (x.score != null && (!(x.score >= 0) || x.score > 100)) throw new GreenError("A cup score is out of 100.");
    if (x.score != null) x.score = Math.round(x.score * 4) / 4;
    return x;
  }
  async function addSample(input, by = "") {
    const x = { id: randomUUID(), ...cleanSample(input), status: "requested", requestedAt: now(), by, createdAt: now() };
    db.samples.unshift(x);
    await save();
    return x;
  }
  // A change, and the status it moves to: a score makes it cupped; arrived and declined are set.
  async function updateSample(id, input, by = "") {
    const x = sample(id);
    if (!x) throw new GreenError("That sample isn't here any more.", 404);
    if (x.status === "approved") throw new GreenError("That sample is already approved.");
    Object.assign(x, cleanSample(input, x), { updatedAt: now() });
    const to = SAMPLE_STATUSES.includes(input.status) && input.status !== "approved" ? input.status : null;
    if (to === "arrived" && x.status === "requested") Object.assign(x, { status: "arrived", arrivedAt: now() });
    if (to === "declined") Object.assign(x, { status: "declined", declinedAt: now() });
    if (to === "requested" && x.status === "declined") x.status = x.score != null ? "cupped" : x.arrivedAt ? "arrived" : "requested";
    if (input.score != null && input.score !== "" && x.status !== "declined") Object.assign(x, { status: "cupped", cuppedAt: now(), cuppedBy: by, arrivedAt: x.arrivedAt || now() });
    await save();
    return x;
  }
  async function removeSample(id) {
    if (!sample(id)) throw new GreenError("That sample isn't here any more.", 404);
    db.samples = db.samples.filter((x) => x.id !== id);
    await save();
  }
  // Approved: it becomes a green coffee to buy (nothing on hand yet), its supplier, price, bag
  // size and lot carried over, its cup score in the notes.
  async function approveSample(id, by = "") {
    const x = sample(id);
    if (!x) throw new GreenError("That sample isn't here any more.", 404);
    if (x.status === "approved") throw new GreenError("That sample is already approved.");
    if (!x.supplierId) throw new GreenError("Pick the sample's supplier first.");
    if (x.unitCost == null) throw new GreenError("Add the price per kg first.");
    const it = await addItem({ name: x.name, origin: x.origin, supplierId: x.supplierId, unitCost: x.unitCost, onHand: 0, bagKg: x.bagKg ?? "", lotCode: x.lotCode, notes: [x.process, x.score != null ? `Cupped ${x.score}` : "", x.notes].filter(Boolean).join(". ").slice(0, 500) }, by);
    Object.assign(x, { status: "approved", approvedAt: now(), approvedBy: by, itemId: it.id });
    await save();
    return it;
  }

  // Kilos already promised to planned roasts, per green coffee.
  const plannedKg = () => {
    const m = {};
    for (const b of db.batches) if (b.status === "planned") m[b.greenId] = kg((m[b.greenId] || 0) + b.greenKg);
    return m;
  };

  return {
    get items() {
      return db.items.filter((x) => !x.archivedAt).sort((a, b) => a.name.localeCompare(b.name));
    },
    get batches() {
      return [...db.batches].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    },
    item,
    batch,
    addItem,
    updateItem,
    removeItem,
    adjust,
    cart,
    setCart,
    clearOrdered,
    planBatch,
    updateBatch,
    markRoasted,
    setStatus,
    plannedKg,
    get samples() {
      return db.samples.slice();
    },
    sample,
    addSample,
    updateSample,
    removeSample,
    approveSample,
    // The roasts behind what's on the shelf: bags go out oldest first, so the `left` bags are the
    // newest roasts' bags. [{ date, bags }] newest first; bags from before roasts were recorded
    // come last with no date.
    shelfLots: (product, left) => {
      if (!(left > 0)) return [];
      const out = [];
      let need = left;
      for (const b of db.batches.filter((x) => x.product === product && x.status === "roasted" && x.bags > 0).sort((a, b) => b.date.localeCompare(a.date))) {
        if (need <= 0) break;
        const n = Math.min(need, b.bags);
        out.push({ date: b.date, bags: n });
        need -= n;
      }
      if (need > 0) out.push({ date: null, bags: need });
      return out;
    },
    // A coffee's green cost per 250g bag, from its last five roasts: { perBag, roasts } or null.
    roastCost: (product) => {
      const done = db.batches.filter((b) => b.product === product && b.status === "roasted" && b.bags > 0 && b.cost > 0).sort((a, b) => (b.roastedAt || "").localeCompare(a.roastedAt || "")).slice(0, 5);
      const bags = done.reduce((n, b) => n + b.bags, 0);
      return bags ? { perBag: cents(done.reduce((n, b) => n + b.cost, 0) / bags), roasts: done.length } : null;
    },
    log: ({ itemId = "", limit = 200 } = {}) => db.log.filter((l) => !itemId || l.itemId === itemId).slice(0, limit),
  };
}
