// Mimi Food Ambassadors: creators apply on /ambassadors, the team approves them in the back office,
// and each approved ambassador gets their own discount code. Orders paid with that code are
// theirs: the back office shows their orders, sales and the commission owed.
//
// Each application's Instagram is checked (server/instagram.js) and the result kept with it; with
// autoDecide on, a genuine one is approved and a suspect one declined without waiting for the team.

import { randomUUID } from "node:crypto";

export class AmbassadorError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const AMBASSADOR_PARTS = { people: (x) => x.id, config: (x) => x.key };
export const AMBASSADOR_FIELDS = { name: 80, email: 254, instagram: 60, tiktok: 60, youtube: 120, followers: 40, city: 80, why: 2000 };
const STATUSES = ["applied", "approved", "paused", "declined"];
// Until the team sets them, the program is closed and pays nothing: no made-up numbers.
const DEFAULTS = { open: false, discount: 0, commission: 0, perks: "", autoDecide: false };

const handle = (v) => String(v || "").trim().replace(/^https?:\/\/(www\.)?(instagram|tiktok)\.com\//i, "").replace(/^@/, "").replace(/\/$/, "");
const r2 = (n) => Math.round(n * 100) / 100;

export function createAmbassadors({ store, promos }) {
  const db = store.data;
  db.people ||= [];
  db.config ||= [];
  const save = () => store.save();

  const config = () => ({ ...DEFAULTS, ...Object.fromEntries(db.config.map((c) => [c.key, c.value])) });
  async function setConfig(input) {
    const next = config();
    if ("open" in input) next.open = Boolean(input.open);
    if ("autoDecide" in input) next.autoDecide = Boolean(input.autoDecide);
    for (const k of ["discount", "commission"]) {
      if (!(k in input)) continue;
      const n = Number(String(input[k] ?? "").replace(/[^0-9.]/g, "")) || 0;
      if (n < 0 || n > 50) throw new AmbassadorError("Enter a percentage from 0 to 50.");
      next[k] = Math.round(n * 10) / 10;
    }
    if ("perks" in input) next.perks = String(input.perks || "").trim().slice(0, 1200);
    if (next.open && !(next.discount > 0)) throw new AmbassadorError("Set the follower discount before opening applications.");
    db.config = Object.entries(next).map(([key, value]) => ({ key, value }));
    await save();
    return config();
  }

  const find = (id) => db.people.find((p) => p.id === id);
  const byEmail = (email) => db.people.find((p) => p.email === email);

  async function apply(input) {
    const p: any = Object.fromEntries(Object.entries(AMBASSADOR_FIELDS).map(([k, max]) => [k, String(input?.[k] ?? "").trim().slice(0, max)]));
    p.email = p.email.toLowerCase();
    p.instagram = handle(p.instagram);
    p.tiktok = handle(p.tiktok);
    if (!p.name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new AmbassadorError("Add your name and email.");
    if (!p.instagram && !p.tiktok && !p.youtube) throw new AmbassadorError("Add at least one account: Instagram, TikTok or YouTube.");
    if (input?.adult !== true) throw new AmbassadorError("Confirm you're 18 or older and agree to the Terms.");
    if (input?.agree !== true) throw new AmbassadorError("Confirm you're 18 or older and agree to the Terms.");
    // That they're 18 or older and agreed to the Terms, and when: kept with the application.
    p.agreed = { at: new Date().toISOString(), adult: true };
    const before = byEmail(p.email);
    // Applying again updates a waiting application; an approved or declined one stays as it is.
    if (before && before.status !== "applied") return { person: before, repeat: true };
    const person = before ? Object.assign(before, p, { updatedAt: new Date().toISOString() }) : { id: randomUUID(), status: "applied", appliedAt: new Date().toISOString(), code: null, notes: "", ...p };
    if (!before) db.people.push(person);
    await save();
    return { person, repeat: Boolean(before) };
  }

  // A code from their handle or name, made unique: MAYA, MAYA2…
  const codeFor = (p) => {
    const base = (p.instagram || p.tiktok || p.name).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16) || "Mimi Food";
    const taken = new Set(promos.list().map((c) => c.code));
    let code = base.length >= 3 ? base : `${base}ASX`;
    for (let i = 2; taken.has(code); i++) code = `${base.slice(0, 14)}${i}`;
    return code;
  };

  async function approve(id, { code }: { code?: any } = {}) {
    const p = find(id);
    if (!p) throw new AmbassadorError("Ambassador not found.", 404);
    const c = config();
    if (!(c.discount > 0)) throw new AmbassadorError("Set the follower discount in Settings first.");
    if (p.codeId) {
      await promos.update(p.codeId, { active: true });
    } else {
      const promo = await promos.create({ code: code || codeFor(p), kind: "percent", value: c.discount, source: "ambassador" });
      p.code = promo.code;
      p.codeId = promo.id;
    }
    p.status = "approved";
    p.approvedAt ||= new Date().toISOString();
    if (!(p.commission >= 0)) p.commission = c.commission;
    await save();
    return p;
  }

  async function update(id, input) {
    const p = find(id);
    if (!p) throw new AmbassadorError("Ambassador not found.", 404);
    if ("status" in input) {
      if (!STATUSES.includes(input.status)) throw new AmbassadorError("Unknown status.");
      if (input.status === "approved") return approve(id);
      p.status = input.status;
      // Paused or declined: their code stops working at checkout; approving again turns it back on.
      if (p.codeId && input.status !== "approved") await promos.update(p.codeId, { active: false }).catch(() => {});
    }
    if ("notes" in input) p.notes = String(input.notes || "").slice(0, 4000);
    if ("commission" in input) {
      const n = Number(String(input.commission ?? "").replace(/[^0-9.]/g, ""));
      if (!(n >= 0 && n <= 50)) throw new AmbassadorError("Enter a commission from 0 to 50%.");
      p.commission = Math.round(n * 10) / 10;
    }
    // Marking paid settles everything up to now; later orders are owed again.
    if ("paidThrough" in input) p.paidThrough = input.paidThrough ? new Date().toISOString() : null;
    p.updatedAt = new Date().toISOString();
    await save();
    return p;
  }

  // Orders paid with their code (cancelled and refunded ones left out), and what they've earned.
  // Commission is on the order's goods after the discount, before shipping and tax.
  function stats(p, orders) {
    if (!p.code) return { orders: 0, sales: 0, commission: 0, unpaid: 0, last: null };
    const theirs = orders.filter((o) => o.discount?.code === p.code && o.payment !== "unpaid" && o.status !== "cancelled" && o.status !== "pending_payment");
    const goods = (o) => Math.max(0, (o.subtotal || 0) - (o.discount?.amount || 0) - (o.refunded || 0));
    const rate = (p.commission ?? config().commission) / 100;
    const earned = (list) => r2(list.reduce((n, o) => n + goods(o) * rate, 0));
    const due = theirs.filter((o) => !p.paidThrough || String(o.placedAt || "") > p.paidThrough);
    return {
      orders: theirs.length,
      sales: r2(theirs.reduce((n, o) => n + goods(o), 0)),
      commission: earned(theirs),
      unpaid: earned(due),
      last: theirs.map((o) => o.placedAt).sort().at(-1) || null,
    };
  }

  const list = () => [...db.people].sort((a, b) => String(b.appliedAt).localeCompare(String(a.appliedAt)));
  // The latest Instagram check: { at, score, level, followers, engagement, normal, reasons } or
  // { at, error } when it couldn't be looked up.
  const setCheck = async (id, check) => {
    const p = find(id);
    if (!p) throw new AmbassadorError("Ambassador not found.", 404);
    p.check = { at: new Date().toISOString(), ...check };
    await save();
    return p;
  };

  return { config, setConfig, apply, approve, update, stats, list, find, setCheck };
}
