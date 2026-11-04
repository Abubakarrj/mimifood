// Book a Call: customers pick a time to talk with the team, from the hours set in the back office
// (Configure › Calls). Times are the roastery's (Pacific): a day ("2026-11-02") and a start
// ("09:30"), so a slot reads the same wherever someone books it from.
//
// Stored with server/storage.js as storage.open("calls", CALL_PARTS).

import { randomUUID } from "node:crypto";

export const CALL_PARTS = {
  settings: (s) => s.id, // one: { id: "calls", … }
  bookings: (b) => b.id,
};

export class CallError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const ZONE = "America/Los_Angeles";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const DEFAULTS = { id: "calls", on: false, days: [1, 2, 3, 4, 5], from: "09:00", to: "17:00", minutes: 30, notice: 4, ahead: 21, who: "", whoName: "" };
const text = (v, n) => String(v ?? "").trim().slice(0, n);
const mins = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));
const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// Now at the roastery: its day, minutes past midnight, and weekday (0 Sunday).
function here(at = new Date()) {
  const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: ZONE, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(at).map((x) => [x.type, x.value]));
  return { day: `${p.year}-${p.month}-${p.day}`, minutes: Number(p.hour) * 60 + Number(p.minute) };
}
const plusDays = (day, n) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekday = (day) => new Date(`${day}T12:00:00Z`).getUTCDay();

// "Mon, Nov 2 at 9:30am"
export function callLabel(day, time) {
  const d = new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
  const m = mins(time);
  const h = Math.floor(m / 60) % 12 || 12;
  return `${d} at ${h}:${String(m % 60).padStart(2, "0")}${m >= 720 ? "pm" : "am"}`;
}

export function createCalls({ store }) {
  const db = store.data;
  const save = () => store.save();
  const settings = () => ({ ...DEFAULTS, ...(db.settings.find((s) => s.id === "calls") || {}) });
  const upcoming = () => {
    const now = here();
    return db.bookings
      .filter((b) => b.status === "booked" && (b.day > now.day || (b.day === now.day && mins(b.time) + b.minutes > now.minutes)))
      .sort((a, b) => `${a.day} ${a.time}`.localeCompare(`${b.day} ${b.time}`));
  };

  async function configure(input) {
    const was = settings();
    const s = { ...was };
    if ("on" in input) s.on = Boolean(input.on);
    if (Array.isArray(input.days)) s.days = [...new Set(input.days.map(Number).filter((d) => d >= 0 && d <= 6))].sort();
    if ("from" in input && TIME_RE.test(input.from)) s.from = input.from;
    if ("to" in input && TIME_RE.test(input.to)) s.to = input.to;
    if ("minutes" in input && [15, 20, 30, 45, 60].includes(Number(input.minutes))) s.minutes = Number(input.minutes);
    if ("notice" in input) s.notice = Math.max(0, Math.min(72, Math.round(Number(input.notice) || 0)));
    if ("ahead" in input) s.ahead = Math.max(1, Math.min(60, Math.round(Number(input.ahead) || 21)));
    if ("who" in input) {
      s.who = text(input.who, 64);
      s.whoName = s.who ? text(input.whoName, 80) : "";
    }
    if (mins(s.to) - mins(s.from) < s.minutes) throw new CallError("Leave time for at least one call between the start and end of the day.");
    if (s.on && !s.days.length) throw new CallError("Pick at least one day for calls.");
    db.settings = [s];
    await save();
    return s;
  }

  // The open times: each day ahead with the starts still free (past the notice, not booked).
  function open() {
    const s = settings();
    if (!s.on) return [];
    const now = here();
    const earliest = now.minutes + s.notice * 60;
    const taken = new Set(db.bookings.filter((b) => b.status === "booked").map((b) => `${b.day} ${b.time}`));
    const days = [];
    for (let i = 0; i <= s.ahead; i++) {
      const day = plusDays(now.day, i);
      if (!s.days.includes(weekday(day))) continue;
      const times = [];
      for (let m = mins(s.from); m + s.minutes <= mins(s.to); m += s.minutes) {
        // Notice runs across midnight: four hours' notice at 10pm rules out tomorrow before 2am.
        const ahead = i * 1440 + m;
        if (ahead < earliest) continue;
        if (!taken.has(`${day} ${hhmm(m)}`)) times.push(hhmm(m));
      }
      if (times.length) days.push({ day, times });
    }
    return days;
  }

  async function book({ day, time, accountId, business, name, email, phone, note }) {
    if (!DAY_RE.test(day || "") || !TIME_RE.test(time || "")) throw new CallError("Pick a day and a time.");
    if (!open().some((d) => d.day === day && d.times.includes(time))) throw new CallError("That time was just taken. Pick another.", 409);
    // One upcoming call per café at a time: a second would be a change of time.
    if (upcoming().some((b) => b.accountId === accountId)) throw new CallError("You already have a call booked. Cancel it to pick another time.", 409);
    const s = settings();
    const b = { id: randomUUID(), day, time, minutes: s.minutes, accountId, business: text(business, 120), name: text(name, 80), email: text(email, 254), phone: text(phone, 40), note: text(note, 1000), who: s.who, whoName: s.whoName, status: "booked", todoId: "", createdAt: new Date().toISOString() };
    db.bookings.push(b);
    await save();
    return b;
  }
  async function linkTodo(id, todoId) {
    const b = db.bookings.find((x) => x.id === id);
    if (!b) return;
    b.todoId = todoId;
    await save();
  }
  // The video meeting made for it: { provider, url, id }.
  async function setMeeting(id, meeting) {
    const b = db.bookings.find((x) => x.id === id);
    if (!b) return;
    b.meeting = meeting;
    await save();
  }
  async function cancel(id, by = "") {
    const b = db.bookings.find((x) => x.id === id);
    if (!b || b.status !== "booked") throw new CallError("That call isn't booked any more.", 404);
    Object.assign(b, { status: "cancelled", cancelledAt: new Date().toISOString(), cancelledBy: by });
    await save();
    return b;
  }

  return {
    settings,
    configure,
    open,
    book,
    linkTodo,
    setMeeting,
    cancel,
    upcoming,
    find: (id) => db.bookings.find((b) => b.id === id) || null,
    mine: (accountId) => upcoming().filter((b) => b.accountId === accountId),
  };
}
