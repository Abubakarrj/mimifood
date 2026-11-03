// The calendar: events (cuppings, takeovers, pop-ups) and classes (barista and brewing courses),
// written in the back office and shown on calendar and classes.
//
// An item is booked one of three ways:
//   reserve  a free place, held with a name and email (an event's "Reserve")
//   pay      a paid seat, bought through the shop's cart and checkout (a class with a price)
//   link     somewhere else (a festival's own tickets)
// or not at all ("none": just come by). Places are counted against the capacity (0 = no limit):
// reservations here, paid seats from the orders (seatsSold, passed in by the server).
// A free event can be split into time slots (slotMinutes, e.g. 60 for 11–12, 12–1…, from its
// start to its end time): the capacity is then per slot, and a reservation is for one slot.

import { createHash, randomBytes } from "node:crypto";
import { imageSrc, plainText } from "./notes.ts";

export class HappeningError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const HAPPENING_PARTS = { items: (x) => x.id, reservations: (r) => r.id };

const clip = (s, n) => String(s ?? "").trim().slice(0, n);
const EMAIL_RE = /^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]{2,}$/;
const KINDS = ["event", "class"];
const BOOKINGS = ["reserve", "pay", "link", "none"];
const safeLink = (u) => (/^https:\/\/[^\s"<>]+$/i.test(String(u || "").trim()) ? String(u).trim().slice(0, 500) : "");
// "2026-10-28T18:00" (the shop's local time, as typed) or a full ISO time.
const when = (v) => {
  const s = clip(v, 40);
  if (!s) return "";
  if (!/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(s) || Number.isNaN(Date.parse(s))) throw new HappeningError("Please give the date as a date (and time).");
  return s.slice(0, 16);
};

// "Add to Calendar": the event as a calendar file (Apple Calendar, Outlook, Google import) and as a
// Google Calendar link, in the shop's time zone, with reminders the day before and 2 hours before.
const stamp = (s) => s.replace(/[-:]/g, "").slice(0, 13) + "00"; // 2026-11-01T11:30 → 20261101T113000
const dayStamp = (s) => s.slice(0, 10).replace(/-/g, "");
const nextDay = (s) => new Date(Date.parse(`${s.slice(0, 10)}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
// The end: as written, or two hours after a timed start, or the day after a date (all day).
function span(x) {
  const timed = x.startsAt.length > 10;
  if (!timed) return { allDay: true, start: dayStamp(x.startsAt), end: dayStamp(nextDay(x.endsAt || x.startsAt)) };
  const end = x.endsAt && x.endsAt.length > 10 ? x.endsAt : `${x.startsAt.slice(0, 10)}T${String(Math.min(23, Number(x.startsAt.slice(11, 13)) + 2)).padStart(2, "0")}:${x.startsAt.slice(14, 16)}`;
  return { allDay: false, start: stamp(x.startsAt), end: stamp(end) };
}
const icsText = (t) => String(t || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
// Lines over 75 characters continue on the next, indented (as the format asks).
const fold = (line) => line.match(/.{1,73}/gu)?.join("\r\n ") ?? line;

export function calendarFile(x, { tz, url, shop }) {
  const t = span(x);
  const where = [x.place, x.address].filter(Boolean).join(", ");
  const about = [x.summary || plainText(x.body).slice(0, 300), url].filter(Boolean).join("\n\n");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${shop}//Calendar//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${x.id}@${shop.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").slice(0, 15)}Z`,
    t.allDay ? `DTSTART;VALUE=DATE:${t.start}` : `DTSTART;TZID=${tz}:${t.start}`,
    t.allDay ? `DTEND;VALUE=DATE:${t.end}` : `DTEND;TZID=${tz}:${t.end}`,
    `SUMMARY:${icsText(x.title)}`,
    where && `LOCATION:${icsText(where)}`,
    about && `DESCRIPTION:${icsText(about)}`,
    url && `URL:${url}`,
    ...["-P1D", "-PT2H"].flatMap((when) => ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsText(x.title)}`, `TRIGGER:${when}`, "END:VALARM"]),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean);
  return lines.map(fold).join("\r\n") + "\r\n";
}

export function googleCalendarLink(x, { tz, url }) {
  const t = span(x);
  const q = new URLSearchParams({
    action: "TEMPLATE",
    text: x.title,
    dates: `${t.start}/${t.end}`,
    ...(t.allDay ? {} : { ctz: tz }),
    details: [x.summary || plainText(x.body).slice(0, 300), url].filter(Boolean).join("\n\n"),
    location: [x.place, x.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${q}`;
}

export function createHappenings({ store, seatsSold = () => 0, timeZone = "America/Los_Angeles" }: { store: any; seatsSold?: (id: any, slot?: any) => number; timeZone?: string }) {
  const db = store.data;
  const save = () => store.save();
  const now = () => new Date().toISOString();
  const find = (id) => db.items.find((x) => x.id === id);

  // Still to come (or still going): ends, or starts, from today on (the shop's today: times are
  // the shop's local time, so a 7pm class isn't "past" once it's tomorrow in UTC).
  const today = () => new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
  const upcoming = (x) => (x.endsAt || x.startsAt || "").slice(0, 10) >= today();
  // A free place waits on its emailed confirmation link, held for half an hour (so a made-up or
  // someone else's email can't keep it, or keep the real owner out, for longer).
  const HOLD_MS = 30 * 60e3;
  const holding = (r) => r.status === "confirmed" || (r.status === "pending" && Date.parse(r.at) > Date.now() - HOLD_MS);
  const hash = (token) => createHash("sha256").update(String(token || "")).digest("hex");
  const reserved = (id) => db.reservations.filter((r) => r.item === id && holding(r)).reduce((n, r) => n + r.guests, 0);
  const taken = (x) => reserved(x.id) + seatsSold(x.id);
  // Its time slots, from its start time to its end time on the day: [{ start: "11:00", end: "12:00" }].
  const toMin = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  function slotsOf(x) {
    if (!(x.slotMinutes > 0) || !["reserve", "pay"].includes(x.booking) || x.startsAt.length < 16 || !x.endsAt || x.endsAt.length < 16 || x.endsAt.slice(0, 10) !== x.startsAt.slice(0, 10)) return [];
    const out = [];
    for (let m = toMin(x.startsAt.slice(11)); m + x.slotMinutes <= toMin(x.endsAt.slice(11)) && out.length < 48; m += x.slotMinutes) out.push({ start: hhmm(m), end: hhmm(m + x.slotMinutes) });
    return out;
  }
  const reservedIn = (id, slot) => db.reservations.filter((r) => r.item === id && r.slot === slot && holding(r)).reduce((n, r) => n + r.guests, 0);
  // A slot's places: free reservations for it and tickets sold for it.
  const leftIn = (x, slot) => (x.capacity ? Math.max(0, x.capacity - reservedIn(x.id, slot) - seatsSold(x.id, slot)) : null);
  // Places left: per slot when it has slots (all of them together), else the whole thing.
  const left = (x) => {
    const slots = slotsOf(x);
    if (slots.length) return x.capacity ? slots.reduce((n, sl) => n + leftIn(x, sl.start), 0) : null;
    return x.capacity ? Math.max(0, x.capacity - taken(x)) : null;
  };

  // Its address on the calendar (/calendar/coffee-tea-omakase), made from the title the first time
  // it's published and kept after, so a shared link doesn't break when the title is edited.
  function giveSlug(x) {
    if (x.slug || x.status !== "published" || !x.title) return false;
    const base = x.title.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60).replace(/-+$/, "") || "event";
    let slug = base;
    for (let n = 2; db.items.some((o) => o !== x && o.slug === slug); n++) slug = `${base}-${n}`;
    x.slug = slug;
    return true;
  }
  if (db.items.filter(giveSlug).length) save();

  function get(id) {
    const x = find(id);
    if (!x) throw new HappeningError("Not found.", 404);
    return x;
  }

  function apply(x, input) {
    if (input.kind !== undefined && KINDS.includes(input.kind)) x.kind = input.kind;
    if (input.title !== undefined) x.title = clip(input.title, 120);
    if (input.startsAt !== undefined) x.startsAt = when(input.startsAt);
    if (input.endsAt !== undefined) x.endsAt = when(input.endsAt);
    if (input.place !== undefined) x.place = clip(input.place, 80);
    if (input.address !== undefined) x.address = clip(input.address, 160);
    if (input.summary !== undefined) x.summary = clip(input.summary, 300);
    if (input.body !== undefined) x.body = String(input.body ?? "").slice(0, 20000);
    if (input.image !== undefined) x.image = imageSrc(input.image) ? clip(input.image, 300) : "";
    if (input.price !== undefined) {
      const p = Math.round(Number(input.price) * 100) / 100;
      if (!Number.isFinite(p) || p < 0 || p > 10000) throw new HappeningError("Please give the price as a number (0 for free).");
      x.price = p;
    }
    if (input.capacity !== undefined) {
      const c = Number(input.capacity);
      if (!Number.isInteger(c) || c < 0 || c > 10000) throw new HappeningError("Places must be a whole number (0 for no limit).");
      x.capacity = c;
    }
    if (input.booking !== undefined && BOOKINGS.includes(input.booking)) x.booking = input.booking;
    if (input.slotMinutes !== undefined) {
      const m = Number(input.slotMinutes) || 0;
      if (![0, 15, 30, 45, 60, 90, 120].includes(m)) throw new HappeningError("Choose a slot length.");
      x.slotMinutes = m;
    }
    if (input.link !== undefined) x.link = safeLink(input.link);
    if (input.linkLabel !== undefined) x.linkLabel = clip(input.linkLabel, 40);
    if (x.endsAt && x.startsAt && x.endsAt < x.startsAt) x.endsAt = "";
    // A paid seat goes through the cart; a free place is reserved.
    if (x.booking === "pay" && !x.price) x.booking = "reserve";
    if (x.booking === "reserve" && x.price) x.booking = "pay";
    if (input.status !== undefined) {
      const live = input.status === "published";
      if (live && !x.title) throw new HappeningError("Give it a title before publishing.");
      if (live && !x.startsAt) throw new HappeningError("Give it a date before publishing.");
      if (live && x.booking === "link" && !x.link) throw new HappeningError("Add the link (starting https://) before publishing.");
      x.status = live ? "published" : "draft";
    }
    x.updatedAt = now();
  }

  // What the public pages show: no reservations, no drafts.
  const view = (x) => ({
    id: x.id,
    slug: x.slug || "",
    kind: x.kind,
    title: x.title,
    startsAt: x.startsAt,
    endsAt: x.endsAt || "",
    place: x.place,
    address: x.address,
    summary: x.summary || plainText(x.body).slice(0, 220),
    body: x.body,
    image: imageSrc(x.image), // an uploaded photo's name → its address (/media/…)
    price: x.price,
    booking: x.booking,
    link: x.link,
    linkLabel: x.linkLabel,
    left: left(x),
    full: x.capacity > 0 && left(x) === 0,
    slots: slotsOf(x).map((sl) => ({ ...sl, left: leftIn(x, sl.start) })),
    past: !upcoming(x),
  });

  const live = () => db.items.filter((x) => x.status === "published");
  const byDate = (a, b) => a.startsAt.localeCompare(b.startsAt);

  return {
    view,
    left,
    slotsOf,
    slotLeft: leftIn,
    taken,
    // Booked places (not ones still waiting on their email's confirmation).
    reservationsFor: (id) => db.reservations.filter((r) => r.item === id && r.status !== "pending").sort((a, b) => b.at.localeCompare(a.at)),
    list: () => [...db.items].sort((a, b) => (b.startsAt || "").localeCompare(a.startsAt || "")),
    get,
    // A published item, for the shop (pricing a paid seat, the public pages).
    published(id) {
      const x = find(id);
      return x && x.status === "published" ? x : null;
    },
    // The public calendar: upcoming events soonest first, past events latest first, classes.
    publicView() {
      const items = live();
      const events = items.filter((x) => x.kind === "event");
      return {
        upcoming: events.filter(upcoming).sort(byDate).map(view),
        past: events.filter((x) => !upcoming(x)).sort(byDate).reverse().slice(0, 24).map(view),
        classes: items.filter((x) => x.kind === "class" && upcoming(x)).sort(byDate).map(view),
      };
    },
    counts: () => {
      const items = live();
      return { events: items.filter((x) => x.kind === "event").length, classes: items.filter((x) => x.kind === "class" && upcoming(x)).length };
    },

    async create(input = {}) {
      const x = { id: `hap-${randomBytes(5).toString("hex")}`, kind: "event", status: "draft", title: "", startsAt: "", endsAt: "", place: "", address: "", summary: "", body: "", image: "", price: 0, capacity: 0, slotMinutes: 0, booking: "reserve", link: "", linkLabel: "", createdAt: now(), updatedAt: now() };
      apply(x, input);
      db.items.push(x);
      giveSlug(x);
      await save();
      return x;
    },
    async update(id, input) {
      const x = get(id);
      apply(x, input || {});
      giveSlug(x);
      await save();
      return x;
    },
    async remove(id) {
      get(id);
      db.items = db.items.filter((x) => x.id !== id);
      db.reservations = db.reservations.filter((r) => r.item !== id);
      await save();
    },

    // A free place (or a few, with guests). `confirm`: held until the link emailed to them is
    // opened (see confirmReservation); its token comes back to send.
    async reserve(id, { name, email, guests, slot }, { confirm = false } = {}) {
      const x = find(id);
      if (!x || x.status !== "published") throw new HappeningError("That's no longer on the calendar.", 404);
      if (x.booking !== "reserve") throw new HappeningError("This one isn't booked here.");
      if (!upcoming(x)) throw new HappeningError("That one has already happened.");
      const n = Number(guests) || 1;
      if (!Number.isInteger(n) || n < 1 || n > 6) throw new HappeningError("Places: 1 to 6.");
      const who = { name: clip(name, 80), email: clip(email, 254).toLowerCase() };
      if (!who.name) throw new HappeningError("Please enter your name.");
      if (!EMAIL_RE.test(who.email)) throw new HappeningError("Enter a valid email.");
      const mine = db.reservations.find((r) => r.item === id && r.email === who.email && holding(r));
      if (mine?.status === "confirmed") throw new HappeningError("You already have a place. See you there.", 409);
      // Asked again before confirming: the old hold goes, and a new link is sent.
      if (mine) db.reservations = db.reservations.filter((r) => r !== mine);
      // With time slots: the slot they chose, and its places.
      const slots = slotsOf(x);
      const at = slots.length ? slots.find((sl) => sl.start === String(slot || "")) : null;
      if (slots.length && !at) throw new HappeningError("Choose a time.");
      const l = at ? leftIn(x, at.start) : left(x);
      if (l !== null && l < n) throw new HappeningError(l ? `Only ${l} place${l === 1 ? "" : "s"} left${at ? " at that time" : ""}.` : at ? "That time is full. Choose another." : "It's full.", 409);
      const token = confirm ? randomBytes(24).toString("base64url") : null;
      const r = { id: `res-${randomBytes(5).toString("hex")}`, item: id, ...who, guests: n, ...(at && { slot: at.start, slotEnd: at.end }), status: confirm ? "pending" : "confirmed", at: now(), ...(token && { tokenHash: hash(token) }) };
      // Expired holds are tidied away as new ones come in.
      db.reservations = db.reservations.filter((y) => y.status !== "pending" || holding(y));
      db.reservations.push(r);
      await save();
      return { reservation: r, item: x, token };
    },
    // The emailed link: the held place is confirmed. Opening it again just says so.
    async confirmReservation(token) {
      const r = db.reservations.find((y) => y.tokenHash && y.tokenHash === hash(token));
      if (!r || r.status === "cancelled") throw new HappeningError("Link expired. Book again.", 404);
      const x = find(r.item);
      if (!x || x.status !== "published") throw new HappeningError("That's no longer on the calendar.", 404);
      if (r.status === "confirmed") return { reservation: r, item: x, already: true };
      if (!holding(r)) {
        // Past the half hour: still theirs if there's room.
        const l = r.slot ? leftIn(x, r.slot) : left(x);
        if (l !== null && l < r.guests) throw new HappeningError("That link has expired, and it's full now.", 409);
      }
      r.status = "confirmed";
      r.confirmedAt = now();
      await save();
      return { reservation: r, item: x, already: false };
    },
    async cancelReservation(rid) {
      const r = db.reservations.find((x) => x.id === rid);
      if (!r) throw new HappeningError("Reservation not found.", 404);
      r.status = "cancelled";
      await save();
      return r;
    },
  };
}
