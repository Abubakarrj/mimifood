// Orders and their progress through the shop (stored by server/storage.js).
//
//   pending_payment → new → packed → shipped / ready → completed
//                                        (or cancelled at any point)
//
// "pending_payment" is an order waiting at Stripe Checkout; it becomes "new"
// when Stripe confirms payment, and is dropped if never paid.

import { randomBytes } from "node:crypto";
import type { OrderLine } from "./orders.ts";

export type OrderStatus = "pending_payment" | "new" | "packed" | "shipped" | "ready" | "completed" | "cancelled";

/** One step in an order's history: a status change, a note, or both. */
export interface OrderHistoryEntry {
  at: string;
  by: string;
  status?: string;
  note?: string;
}

/** An order as stored. The checkout and back office keep more on it (payment, shipping…). */
export interface StoredOrder {
  number: string;
  placedAt: string;
  status: string;
  payment: string;
  history: OrderHistoryEntry[];
  lines: OrderLine[];
  packedAt?: string;
  fulfilledAt?: string;
  updatedAt?: string;
  [field: string]: any;
}

/** The storage this module keeps its orders in (storage.open). */
export interface OrderStorage {
  data: { [part: string]: StoredOrder[] };
  save: () => Promise<unknown>;
}

export const STATUSES: OrderStatus[] = ["pending_payment", "new", "packed", "shipped", "ready", "completed", "cancelled"];
const ABANDONED_AFTER = 2 * 864e5;

// `store` comes from storage.open("orders", ORDER_PARTS).
export const ORDER_PARTS = { orders: (o: StoredOrder) => o.number };

// onStatus({ order, from }) runs after an order's status changes (e.g. cancelled: stock goes back).
export function createOrderStore({ store, onStatus }: { store: OrderStorage; onStatus?: (change: { order: StoredOrder; from: string }) => unknown }) {
  const db = store.data;
  const save = store.save;

  const newNumber = () => {
    let n: string;
    do n = `MF-${randomBytes(3).toString("hex").toUpperCase()}`;
    while (db.orders.some((o) => o.number === n));
    return n;
  };

  async function add(order: { lines: OrderLine[]; [field: string]: any }, { status = "new", payment = "unpaid", by = "customer" }: { status?: string; payment?: string; by?: string } = {}): Promise<StoredOrder> {
    const now = new Date().toISOString();
    const record: StoredOrder = { number: newNumber(), placedAt: now, status, payment, ...order, history: [{ at: now, status, by }] };
    // Forget checkouts that were never paid.
    db.orders = db.orders.filter((o) => !(o.status === "pending_payment" && Date.parse(o.placedAt) < Date.now() - ABANDONED_AFTER));
    db.orders.push(record);
    try {
      await save();
    } catch (error) {
      db.orders = db.orders.filter((o) => o !== record); // not saved: don't keep a ghost order
      throw error;
    }
    return record;
  }

  const get = (number: string): StoredOrder | null => db.orders.find((o) => o.number === number) || null;
  const find = (fn: (order: StoredOrder) => unknown): StoredOrder | null => db.orders.find(fn) || null;

  async function update(number: string, changes: { [field: string]: any }, { by = "shop", note }: { by?: string; note?: string } = {}) {
    const order = get(number);
    if (!order) return null;
    const now = new Date().toISOString();
    if (changes.status && changes.status !== order.status) {
      order.history.push({ at: now, status: changes.status, by, ...(note ? { note } : {}) });
      if (changes.status === "packed") order.packedAt = now;
      if (changes.status === "shipped" || changes.status === "ready") order.fulfilledAt = now;
    } else if (note) {
      order.history.push({ at: now, by, note });
    }
    const from = order.status;
    Object.assign(order, changes, { updatedAt: now });
    await save();
    if (onStatus && order.status !== from) await Promise.resolve(onStatus({ order, from })).catch((error: any) => console.error("[orders] status hook:", error.message));
    return order;
  }

  // Newest first; pending checkouts only when asked for.
  function list({ status }: { status?: string } = {}) {
    return db.orders
      .filter((o) => (status ? o.status === status : o.status !== "pending_payment"))
      .sort((a, b) => b.placedAt.localeCompare(a.placedAt));
  }

  return { add, get, find, update, list };
}
