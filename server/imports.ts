// Imports: a document or email pasted or uploaded in the back office, read by Claude into one of
// three drafts to check before anything is made: a wholesale order from a café, a supplier's
// bill matched to our purchase order, or a green coffee offer sheet (prices, lots).
//
// Bills: what suppliers have billed us, each against a purchase order where there is one, with
// its due day and whether it's paid.
//
// Stored with server/storage.js as storage.open("imports", IMPORT_PARTS).

import { randomUUID } from "node:crypto";

export const IMPORT_PARTS = {
  imports: (x) => x.id,
  bills: (x) => x.id,
};

export class ImportError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);
const cents = (n) => Math.round(Number(n) * 100) / 100;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const KEEP = 500;

export function createImports({ store }) {
  const db = store.data;
  db.imports ||= [];
  db.bills ||= [];
  const save = () => store.save();
  const now = () => new Date().toISOString();
  const find = (id) => db.imports.find((x) => x.id === id) || null;
  const bill = (id) => db.bills.find((x) => x.id === id) || null;

  /* ── Imports ── */
  // { name, kind, summary, draft, by }: what was read, kept to look at again.
  async function add(input) {
    const x = { id: randomUUID(), at: now(), status: "open", ...input };
    db.imports.unshift(x);
    db.imports = db.imports.slice(0, KEEP);
    await save();
    return x;
  }
  // Done (with what it made: { type: "order" | "bill" | "green", ref, label }) or dismissed.
  async function close(id, { status, result = null, by = "" }) {
    const x = find(id);
    if (!x) throw new ImportError("That import isn't here any more.", 404);
    Object.assign(x, { status, result, closedAt: now(), closedBy: by });
    await save();
    return x;
  }
  async function reopen(id) {
    const x = find(id);
    if (!x) throw new ImportError("That import isn't here any more.", 404);
    Object.assign(x, { status: "open", result: null, closedAt: null, closedBy: "" });
    await save();
    return x;
  }

  /* ── Bills ── */
  function cleanBill(input, was: any = {}) {
    const lines = (Array.isArray(input.lines) ? input.lines : was.lines || [])
      .map((l) => ({ description: text(l.description, 160), qty: Math.round(Number(l.qty) * 100) / 100 || 0, unit: text(l.unit, 20), unitCost: cents(l.unitCost || 0) }))
      .filter((l) => l.description)
      .slice(0, 100);
    const b = {
      supplierId: text(input.supplierId ?? was.supplierId, 64),
      supplierName: text(input.supplierName ?? was.supplierName, 120),
      poNumber: text(input.poNumber ?? was.poNumber, 20),
      number: text(input.number ?? was.number, 60),
      date: DATE_RE.test(input.date ?? was.date ?? "") ? input.date ?? was.date : "",
      due: DATE_RE.test(input.due ?? was.due ?? "") ? input.due ?? was.due : "",
      total: cents(input.total ?? was.total ?? 0),
      lines,
      notes: text(input.notes ?? was.notes, 1000),
    };
    if (!b.supplierId) throw new ImportError("Choose the supplier.");
    if (!(b.total > 0) || b.total > 10_000_000) throw new ImportError("Enter the bill's total.");
    return b;
  }
  async function addBill(input, by = "") {
    const b = { id: randomUUID(), ...cleanBill(input), status: "unpaid", paidAt: null, importId: text(input.importId, 64), by, createdAt: now() };
    db.bills.unshift(b);
    await save();
    return b;
  }
  async function updateBill(id, input) {
    const b = bill(id);
    if (!b) throw new ImportError("That bill isn't here any more.", 404);
    Object.assign(b, cleanBill(input, b), { updatedAt: now() });
    await save();
    return b;
  }
  async function payBill(id, paid, by = "") {
    const b = bill(id);
    if (!b) throw new ImportError("That bill isn't here any more.", 404);
    Object.assign(b, paid ? { status: "paid", paidAt: now(), paidBy: by } : { status: "unpaid", paidAt: null, paidBy: "" });
    await save();
    return b;
  }
  async function removeBill(id) {
    db.bills = db.bills.filter((b) => b.id !== id);
    await save();
  }

  return {
    get list() {
      return db.imports.slice();
    },
    get bills() {
      return db.bills.slice();
    },
    find,
    bill,
    add,
    close,
    reopen,
    addBill,
    updateBill,
    payBill,
    removeBill,
  };
}
