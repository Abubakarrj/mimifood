// Automated emails: each one goes to a person once, when something they did makes it due.
//
//   welcome   a couple of days after a newsletter signup is confirmed (the welcome code goes at
//             once, in its own email, so it's left out of this one), or a few days after someone
//             makes an account (shop or wholesale); once per email, whichever comes first
//   cart      a few hours after a checkout that was started and never paid
//   thanks    a few days after an order: brewing tips and their coffee
//   refill    when a one-off bag is likely running low (sooner for 250g, later for 1kg; for
//             someone who reorders regularly, a few days before their usual reorder)
//   winback   when a customer hasn't ordered for a while
//
// Every email is written in the back office with the newsletter blocks, rendered by
// server/newsletters.js, and sent through Resend. A check runs every 15 minutes. Only people
// who become due after an email is switched on get it, never anyone due more than 3 days ago
// (so switching one on doesn't mail every past customer), and never twice for the same reason.
// One unsubscribe link stops all of them, and the newsletter, for that address. Each has one
// button; the coffees in it link to their pages.

import { createHmac, timingSafeEqual } from "node:crypto";

export class AutomationError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const AUTOMATION_PARTS = {
  flows: (f) => f.id,
  sends: (s) => s.id,
  optouts: (o) => o.email,
};

const HOUR = 36e5;
const DAY = 864e5;
const LATE = 3 * DAY; // due longer ago than this (the server was off, say): skipped, not sent late
const KEEP_SENDS = 400 * DAY;

const b64 = (s) => Buffer.from(s).toString("base64url");
const unb64 = (s) => {
  try {
    return Buffer.from(String(s), "base64url").toString();
  } catch {
    return "";
  }
};

export function createAutomations({ store, newsletters, products, siteUrl, siteName, welcomePercent = 0, subscriptionPercent = 0, secret, orders, signups, newAccounts = () => [], hasActiveSubscription, welcomeCodeFor, welcomeCodeSent = () => false, nameFor = () => "", mailingAddress, deliver, canSend, reviewLink = () => "" }: any) {
  const db = store.data;
  const save = () => store.save();
  const product = (id) => products().find((p) => p.id === id);

  /* ── The five emails, as they start ── */

  const p = (...lines) => lines.join("\n\n");
  const FLOWS = [
    {
      id: "welcome",
      name: "Welcome",
      when: "After a newsletter signup or a new account",
      timing: { unit: "days", value: 2, valueAccount: 5 },
      reason: `you signed up for ${siteName} emails`,
      // A short personal note from the founder; replies go to the Inbox.
      subject: `Hi from ${siteName}`,
      preheader: "A quick hello, and a question.",
      blocks: () => [
        {
          type: "text",
          text: p(
            "Hi {greeting_name},",
            "I hope you're having a good {weekday}.",
            `My name is Abu, I'm the founder of ${siteName}.`,
            "I saw you signed up recently. I wanted to say hi and get your thoughts on your experience so far. What do you think?",
            `Best,\nAbu Jalloh\nFounder @ ${siteName}`
          ),
        },
      ],
    },
    {
      id: "cart",
      name: "Abandoned cart",
      when: "After a checkout is started but not paid",
      timing: { unit: "hours", value: 3 },
      reason: `you started an order at ${siteName}`,
      subject: "You left something in your cart",
      preheader: "Your cart is saved.",
      blocks: () => [
        { type: "heading", text: "Still thinking it over?" },
        { type: "text", text: "Hi {first_name}, you left these in your cart:" },
        { type: "items" },
        { type: "button", label: "Back to Your Cart", href: "{cart_link}" },
        { type: "text", text: "Questions about grind, size or delivery? Just reply to this email." },
      ],
    },
    {
      id: "thanks",
      name: "After an order",
      when: "After a coffee order",
      timing: { unit: "days", value: 5 },
      reason: `you ordered from ${siteName}`,
      subject: "Getting the best from your coffee",
      preheader: "A few tips for brewing, storing and grinding.",
      blocks: () => [
        { type: "heading", text: "How's your coffee, {first_name}?" },
        {
          type: "text",
          text: p(
            "Thanks again for your order. A few tips to get the most out of it:",
            "**Give it a few days.** Light roasts often taste their best from about a week after roasting.",
            "**Keep it sealed.** Press the air out of the bag and keep it away from light and heat. The fridge isn't needed.",
            "**Grind just before brewing** if you bought whole beans."
          ),
        },
        { type: "items" },
        { type: "button", label: "Rate Your Order", href: "{review_link}" },
      ],
    },
    {
      id: "refill",
      name: "Running low",
      when: "After a one-off coffee order, when the bag is likely running low (for regulars, a few days before they usually reorder)",
      timing: { unit: "days", value: 18, value1kg: 45 },
      reason: `you ordered from ${siteName}`,
      subject: "Running low on coffee?",
      preheader: "Order your next bag before the last cup.",
      blocks: () => [
        { type: "heading", text: "Time for a fresh bag?" },
        { type: "text", text: "Hi {first_name}, your coffee is probably getting low by now. Here's what you had last time:" },
        { type: "items" },
        { type: "text", text: `Never run out: subscribe and we'll deliver it weekly, every two weeks or monthly, with up to ${subscriptionPercent}% off every delivery.` },
        { type: "button", label: "See Subscriptions", href: `${siteUrl}/subscriptions` },
      ],
    },
    {
      id: "winback",
      name: "Win back",
      when: "When a customer hasn't ordered for a while",
      timing: { unit: "days", value: 75 },
      reason: `you ordered from ${siteName}`,
      subject: "New coffees since your last order",
      preheader: "We've been roasting every week. Here's what's on the shelf.",
      blocks: () => [
        { type: "heading", text: "It's been a while, {first_name}" },
        { type: "text", text: "We've been roasting every week since your last order, and there are new coffees on the shelf. Last time you had:" },
        { type: "items" },
        { type: "button", label: "See What's New", href: `${siteUrl}/shop` },
      ],
    },
  ];
  const def = (id) => FLOWS.find((f) => f.id === id);

  // The stored email (once edited, switched on or timed) or the default.
  function flow(id) {
    const d = def(id);
    if (!d) throw new AutomationError("Automation not found.", 404);
    const saved = db.flows.find((f) => f.id === id) || {};
    return {
      id,
      enabled: Boolean(saved.enabled),
      enabledAt: saved.enabledAt || null,
      delay: saved.delay ?? d.timing.value,
      delay1kg: d.timing.value1kg != null ? (saved.delay1kg ?? d.timing.value1kg) : null,
      delayAccount: d.timing.valueAccount != null ? (saved.delayAccount ?? d.timing.valueAccount) : null,
      subject: saved.subject ?? d.subject,
      preheader: saved.preheader ?? d.preheader,
      blocks: saved.blocks ?? newsletters.cleanBlocks(d.blocks().filter((b) => b.type !== "text" || b.text)),
      edited: Boolean(saved.blocks || saved.subject != null),
      updatedAt: saved.updatedAt || null,
    };
  }
  function stored(id) {
    let f = db.flows.find((x) => x.id === id);
    if (!f) db.flows.push((f = { id }));
    return f;
  }

  async function update(id, input) {
    const d = def(id);
    if (!d) throw new AutomationError("Automation not found.", 404);
    const current = flow(id);
    const f = stored(id);
    if (input.enabled !== undefined) {
      const on = Boolean(input.enabled);
      if (on && !current.enabled) f.enabledAt = new Date().toISOString();
      f.enabled = on;
    }
    const days = (v, max) => {
      const n = Number(v);
      if (!Number.isFinite(n) || n < 1 || n > max) throw new AutomationError(`Please choose between 1 and ${max}.`);
      return Math.round(n);
    };
    if (input.delay !== undefined) f.delay = days(input.delay, d.timing.unit === "hours" ? 48 : 365);
    if (input.delay1kg !== undefined && d.timing.value1kg != null) f.delay1kg = days(input.delay1kg, 365);
    if (input.delayAccount !== undefined && d.timing.valueAccount != null) f.delayAccount = days(input.delayAccount, 365);
    if (input.subject !== undefined) f.subject = String(input.subject).trim().slice(0, 150);
    if (input.preheader !== undefined) f.preheader = String(input.preheader).trim().slice(0, 200);
    if (input.blocks !== undefined) f.blocks = newsletters.cleanBlocks(input.blocks);
    if (input.reset) {
      delete f.subject;
      delete f.preheader;
      delete f.blocks;
    }
    f.updatedAt = new Date().toISOString();
    await save();
    return flow(id);
  }

  /* ── Who's due ── */

  const lower = (e) => String(e || "").trim().toLowerCase();
  const optedOut = (email) => db.optouts.some((o) => o.email === email) || signups().some((s) => s.email === email && s.status === "unsubscribed");
  const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || ""; // none: the greeting is left out

  // Shop orders (not wholesale, not the gifts split off an order), each with its customer's email.
  const retail = () => orders().filter((o) => o.source === "web" && !o.parent && o.contact?.email);
  const paid = (o) => o.status !== "pending_payment" && o.status !== "cancelled";

  // The coffees on an order (older orders name them only by title), one entry per coffee.
  function itemsOf(o) {
    const out = [];
    for (const l of o.lines || []) {
      if (l.kind !== "coffee") continue;
      const prod = product(l.product) || products().find((x) => x.name === String(l.title).replace(/, gift for .*$/, ""));
      if (!prod) continue;
      const [size, grind] = String(l.variant || "").split(" · ");
      const same = out.find((x) => x.product.id === prod.id && x.variant === l.variant);
      if (same) same.qty += l.qty;
      else out.push({ product: prod, qty: l.qty, variant: l.variant, size, grind, gift: Boolean(l.gift) });
    }
    return out;
  }
  const cartLink = (items) =>
    items.length ? `${siteUrl}/checkout?cart=${encodeURIComponent(items.filter((i) => !i.gift).map((i) => [i.product.id, i.size, i.grind, i.qty].join("~")).join(","))}` : `${siteUrl}/shop`;
  // {weekday} is the day it's sent, in Los Angeles; {greeting_name} is their first name, or "there".
  const weekday = () => new Date().toLocaleDateString("en-US", { weekday: "long", timeZone: "America/Los_Angeles" });
  const context = (email, name, items = []) => ({ first_name: firstName(name), greeting_name: firstName(name || nameFor(email)) || "there", weekday: weekday(), welcome_code: welcomeCodeFor(email) || "", cart_link: cartLink(items), shop_link: `${siteUrl}/shop`, items });
  const sentTo = (flowId, email, since) => db.sends.some((s) => s.flow === flowId && s.email === email && Date.parse(s.at) > since);

  // Everyone due for one email now: [{ email, ref, dueAt, ctx }].
  function due(f, now = Date.now()) {
    const d = def(f.id);
    const wait = f.delay * (d.timing.unit === "hours" ? HOUR : DAY);
    const all = retail();
    const later = (email, t) => all.some((o) => paid(o) && lower(o.contact.email) === email && Date.parse(o.placedAt) > t);
    const out = [];
    const push = (email, ref, dueAt, ctx) => out.push({ email, ref: `${f.id}:${ref}`, dueAt, ctx });

    if (f.id === "welcome") {
      for (const s of signups()) {
        if (s.status && s.status !== "confirmed") continue;
        const t = Date.parse(s.confirmedAt || s.subscribedAt);
        // Their code went in its own email when they signed up: not again here (an edited copy may still name it).
        push(s.email, s.email, t + wait, { ...context(s.email, ""), ...(welcomeCodeSent(s.email) && { welcome_code: "" }) });
      }
      // A new account, shop or wholesale (the same ref: one welcome per email, whichever is first).
      for (const a of newAccounts()) {
        const email = lower(a.email);
        if (email) push(email, email, Date.parse(a.createdAt) + f.delayAccount * DAY, { ...context(email, a.name), ...(welcomeCodeSent(email) && { welcome_code: "" }) });
      }
    }
    if (f.id === "cart") {
      for (const o of all) {
        // Coffee left at checkout (not a café order, which is for now or never).
        const items = itemsOf(o).filter((i) => !i.gift);
        if (o.status !== "pending_payment" || o.cafe || !items.length) continue;
        const email = lower(o.contact.email);
        const t = Date.parse(o.placedAt);
        // Not if they paid since (this order or another), or had a cart email this week.
        if (later(email, t - HOUR) || sentTo("cart", email, now - 7 * DAY)) continue;
        push(email, o.number, t + wait, context(email, o.contact.name, items));
      }
    }
    if (f.id === "thanks") {
      for (const o of all) {
        const items = itemsOf(o).filter((i) => !i.gift);
        if (!paid(o) || !items.length) continue;
        const email = lower(o.contact.email);
        if (sentTo("thanks", email, now - 30 * DAY)) continue; // once a month at most
        push(email, o.number, Date.parse(o.placedAt) + wait, { ...context(email, o.contact.name, items), review_link: reviewLink(o) });
      }
    }
    if (f.id === "refill") {
      // Someone who's reordered at least twice has a rhythm: their email goes a few days before
      // their usual reorder (the middle of the gaps between their coffee orders, less 15%),
      // instead of after the set number of days.
      const days = new Map();
      for (const o of all) if (paid(o) && itemsOf(o).some((i) => !i.gift)) days.set(lower(o.contact.email), [...(days.get(lower(o.contact.email)) || []), Date.parse(o.placedAt)]);
      const rhythm = (email) => {
        const t = (days.get(email) || []).sort((a, b) => a - b);
        const gaps = t.slice(1).map((d, i) => (d - t[i]) / DAY).filter((g) => g >= 5).sort((a, b) => a - b);
        return gaps.length >= 2 ? Math.max(7, Math.round(gaps[Math.floor(gaps.length / 2)] * 0.85)) : null;
      };
      for (const o of all) {
        const items = itemsOf(o).filter((i) => !i.gift);
        if (!paid(o) || !items.length) continue;
        const email = lower(o.contact.email);
        const t = Date.parse(o.placedAt);
        if (later(email, t) || hasActiveSubscription(email)) continue;
        const wait = rhythm(email) ?? (items.some((i) => i.size === "1kg") ? f.delay1kg : f.delay);
        push(email, o.number, t + wait * DAY, context(email, o.contact.name, items));
      }
    }
    if (f.id === "winback") {
      const last = new Map();
      for (const o of all) {
        if (!paid(o) || !itemsOf(o).some((i) => !i.gift)) continue; // their last coffee order
        const email = lower(o.contact.email);
        if (!last.has(email) || last.get(email).placedAt < o.placedAt) last.set(email, o);
      }
      for (const [email, o] of last) {
        if (hasActiveSubscription(email) || sentTo("winback", email, now - 180 * DAY)) continue;
        push(email, `${email}:${o.number}`, Date.parse(o.placedAt) + wait, context(email, o.contact.name, itemsOf(o).filter((i) => !i.gift)));
      }
    }

    const from = Math.max(Date.parse(f.enabledAt || 0) || 0, now - LATE);
    const seen = new Set();
    return out.filter((x) => {
      if (x.dueAt > now || x.dueAt < from || !x.email || optedOut(x.email) || seen.has(x.email)) return false;
      if (db.sends.some((s) => s.id === x.ref)) return false;
      seen.add(x.email); // one email per person per run
      return true;
    });
  }

  /* ── Unsubscribe ── */

  const sign = (email) => createHmac("sha256", secret()).update(`unsub:${email}`).digest("base64url").slice(0, 32);
  const unsubscribeUrl = (email) => `${siteUrl}/api/automations/unsubscribe?e=${b64(email)}&s=${sign(email)}`;
  function readUnsubscribe(e, s) {
    const email = unb64(e);
    if (!email || !s) return null;
    const given = Buffer.from(String(s));
    const expected = Buffer.from(sign(email));
    return given.length === expected.length && timingSafeEqual(given, expected) ? email : null;
  }
  async function optOut(email) {
    if (!db.optouts.some((o) => o.email === email)) {
      db.optouts.push({ email, at: new Date().toISOString() });
      await save();
    }
  }

  /* ── Sending ── */

  const emailFor = (f, x) => {
    const url = unsubscribeUrl(x.email);
    const { html, text } = newsletters.render(f, { unsubscribeUrl: url, mailingAddress: mailingAddress(), context: x.ctx, reason: def(f.id).reason });
    return { flow: f.id, to: [x.email], subject: newsletters.fillTags(f.subject, x.ctx), html, text, headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
  };

  let running = false;
  async function tick(now = Date.now()) {
    if (running || !canSend() || !mailingAddress()) return 0;
    running = true;
    let count = 0;
    try {
      for (const d of FLOWS) {
        const f = flow(d.id);
        if (!f.enabled || !f.subject) continue;
        const list = due(f, now).slice(0, 300);
        for (let i = 0; i < list.length; i += 100) {
          const batch = list.slice(i, i + 100);
          const at = new Date().toISOString();
          try {
            await deliver(batch.map((x) => emailFor(f, x)));
            batch.forEach((x) => db.sends.push({ id: x.ref, flow: f.id, email: x.email, at }));
            count += batch.length;
          } catch (error) {
            console.error(`[automations] ${f.id}: ${batch.length} not sent:`, error.message);
            break;
          }
        }
      }
      const cutoff = now - KEEP_SENDS;
      db.sends = db.sends.filter((s) => Date.parse(s.at) > cutoff);
      if (count) {
        await save();
        console.log(`[automations] sent ${count}`);
      }
    } finally {
      running = false;
    }
    return count;
  }

  // A sample reader for previews and tests: the newest real order's coffees, or the first two.
  function sample() {
    const o = retail().filter(paid).sort((a, b) => b.placedAt.localeCompare(a.placedAt)).find((x) => itemsOf(x).length);
    const items = o ? itemsOf(o) : products().filter((x) => !x.soldOut).slice(0, 2).map((x) => ({ product: x, qty: 1, variant: "250g · Whole Bean", size: "250g", grind: "Whole Bean" }));
    return { first_name: "Sam", greeting_name: "Sam", weekday: weekday(), welcome_code: welcomePercent ? "WELCOME-SAMPLE" : "", review_link: `${siteUrl}/review`, cart_link: cartLink(items), shop_link: `${siteUrl}/shop`, items };
  }
  function preview(id, draft: any = {}) {
    const f = { ...flow(id), ...("subject" in draft ? { subject: String(draft.subject) } : {}), ...("preheader" in draft ? { preheader: String(draft.preheader) } : {}), ...(draft.blocks ? { blocks: newsletters.cleanBlocks(draft.blocks) } : {}) };
    return newsletters.render(f, { mailingAddress: mailingAddress(), context: sample(), reason: def(id).reason });
  }
  async function test(id, to) {
    const f = flow(id);
    const x = { email: to, ctx: sample() };
    const mail = emailFor(f, x);
    await deliver([{ ...mail, subject: `[Test] ${mail.subject}` }]);
  }

  // Sent, and orders placed within a week of an email by the person it went to.
  function stats(id) {
    const sends = db.sends.filter((s) => s.flow === id);
    const all = retail().filter(paid);
    let orders = 0;
    let revenue = 0;
    for (const s of sends) {
      const t = Date.parse(s.at);
      const o = all.find((x) => lower(x.contact.email) === s.email && Date.parse(x.placedAt) > t && Date.parse(x.placedAt) <= t + 7 * DAY);
      if (o) {
        orders++;
        revenue += Number(o.total) || 0;
      }
    }
    const month = Date.now() - 30 * DAY;
    return { sent: sends.length, sent30: sends.filter((s) => Date.parse(s.at) > month).length, orders, revenue: Math.round(revenue * 100) / 100, lastAt: sends.map((s) => s.at).sort().at(-1) || null };
  }

  const view = (id) => {
    const d = def(id);
    const f = flow(id);
    return { ...f, name: d.name, when: d.when, unit: d.timing.unit, reason: d.reason, waiting: f.enabled ? due(f).length : 0, stats: stats(id) };
  };

  return {
    list: () => FLOWS.map((d) => view(d.id)),
    get: view,
    update,
    preview,
    test,
    tick,
    due: (id, now) => due(flow(id), now),
    readUnsubscribe,
    optOut,
    optedOut,
    // A deleted customer: their email history goes (server.js opts out a confirmed email).
    forget: async (email) => {
      const before = db.sends.length;
      db.sends = db.sends.filter((s) => s.email !== email);
      if (db.sends.length !== before) await save();
    },
    unsubscribeUrl,
    // For the back office's Abandoned Carts: when this flow last emailed them (since a time), and
    // the link that puts an order's coffees back in the cart.
    lastSent: (flowId, email, since = 0) => db.sends.filter((s) => s.flow === flowId && s.email === lower(email) && Date.parse(s.at) > since).map((s) => s.at).sort().at(-1) || null,
    cartLinkFor: (o) => cartLink(itemsOf(o).filter((i) => !i.gift)),
  };
}
