// To-dos for the team: a title, notes, a due day, who it's for, what it's about (an order, a
// wholesale account, a supplier, a green coffee), and how often it comes back. Done on a repeating
// one makes the next. Snoozing hides it until a later day.
//
// Also kept here: each person's snoozed Overview alerts ({ key: "#roasting", until }), so "Needs
// you" can be put off for a day or a week by one person without hiding it for the rest.
//
// Stored with server/storage.js as storage.open("todos", TODO_PARTS).

import { randomUUID } from "node:crypto";

export const TODO_PARTS = {
  todos: (t) => t.id,
  snoozes: (s) => s.id, // { id: `${staffId}|${key}`, until }
};

export class TodoError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const text = (v, n) => String(v ?? "").trim().slice(0, n);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
export const LINK_KINDS = ["order", "account", "supplier", "green", "customer", "prospect"];
const UNITS = ["day", "week", "month"];

// A day plus some days, weeks or months ("2026-10-31" + 1 month → "2026-11-30").
export function addTo(day, every, unit) {
  const d = new Date(`${day}T12:00:00Z`);
  if (unit === "day") d.setUTCDate(d.getUTCDate() + every);
  else if (unit === "week") d.setUTCDate(d.getUTCDate() + every * 7);
  else {
    const want = d.getUTCDate();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() + every);
    const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(want, last));
  }
  return d.toISOString().slice(0, 10);
}

export function createTodos({ store }) {
  const db = store.data;
  db.todos ||= [];
  db.snoozes ||= [];
  const save = () => store.save();
  const now = () => new Date().toISOString();
  const find = (id) => db.todos.find((t) => t.id === id) || null;

  function clean(input, was: any = {}) {
    const repeatIn = "repeat" in input ? input.repeat : was.repeat;
    const repeat = repeatIn && UNITS.includes(repeatIn.unit) ? { every: Math.max(1, Math.min(52, Math.floor(Number(repeatIn.every) || 1))), unit: repeatIn.unit } : null;
    const linkIn = "link" in input ? input.link : was.link;
    const link = linkIn && LINK_KINDS.includes(linkIn.kind) && linkIn.id ? { kind: linkIn.kind, id: text(linkIn.id, 80), label: text(linkIn.label, 120) } : null;
    const t = {
      title: text(input.title ?? was.title, 160),
      description: text(input.description ?? was.description, 2000),
      due: "due" in input ? (DATE_RE.test(input.due || "") ? input.due : null) : was.due ?? null,
      repeat,
      assignee: text(input.assignee ?? was.assignee, 64),
      assigneeName: text(input.assigneeName ?? was.assigneeName, 80),
      link,
    };
    if (!t.title) throw new TodoError("Add what needs doing.");
    if (t.repeat && !t.due) throw new TodoError("Pick the first day for a to-do that repeats.");
    if (!t.assignee) t.assigneeName = "";
    return t;
  }

  async function add(input, by = "") {
    const t = { id: randomUUID(), ...clean(input), status: "open", snoozedUntil: null, createdBy: by, createdAt: now() };
    db.todos.unshift(t);
    await save();
    return t;
  }
  async function update(id, input) {
    const t = find(id);
    if (!t) throw new TodoError("That to-do isn't here any more.", 404);
    Object.assign(t, clean(input, t), { updatedAt: now() });
    await save();
    return t;
  }
  // Done: a repeating one comes back as a new to-do, due one step after this one's day.
  async function done(id, by = "") {
    const t = find(id);
    if (!t) throw new TodoError("That to-do isn't here any more.", 404);
    if (t.status === "done") return { todo: t, next: null };
    Object.assign(t, { status: "done", doneAt: now(), doneBy: by });
    let next = null;
    if (t.repeat && t.due) {
      next = { ...t, id: randomUUID(), status: "open", due: addTo(t.due, t.repeat.every, t.repeat.unit), snoozedUntil: null, createdAt: now(), doneAt: undefined, doneBy: undefined };
      delete next.doneAt;
      delete next.doneBy;
      db.todos.unshift(next);
    }
    await save();
    return { todo: t, next };
  }
  async function reopen(id) {
    const t = find(id);
    if (!t) throw new TodoError("That to-do isn't here any more.", 404);
    Object.assign(t, { status: "open", doneAt: null, doneBy: null });
    await save();
    return t;
  }
  async function snooze(id, until) {
    const t = find(id);
    if (!t) throw new TodoError("That to-do isn't here any more.", 404);
    t.snoozedUntil = DATE_RE.test(until || "") ? until : null;
    await save();
    return t;
  }
  async function remove(id) {
    db.todos = db.todos.filter((t) => t.id !== id);
    await save();
  }

  /* Overview alerts put off by one person. */
  async function snoozeAlert(staffId, key, until) {
    const id = `${staffId}|${text(key, 80)}`;
    db.snoozes = db.snoozes.filter((s) => s.id !== id && s.until >= new Date().toISOString().slice(0, 10));
    if (DATE_RE.test(until || "")) db.snoozes.push({ id, until });
    await save();
  }
  const alertSnoozed = (staffId, key, today) => db.snoozes.some((s) => s.id === `${staffId}|${key}` && s.until > today);

  return {
    get list() {
      return db.todos.slice();
    },
    find,
    add,
    update,
    done,
    reopen,
    snooze,
    remove,
    snoozeAlert,
    alertSnoozed,
  };
}
