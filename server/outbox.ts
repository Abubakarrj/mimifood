// Every email the shop sends one at a time (orders, wholesale, accounts, automations, Inbox
// replies), whether it went and why not, so the team can see it and send it again. Newsletters
// aren't here: they have their own counts.
//
// An email with a code or a one-time link in it (sign-in codes, password resets, confirm-your-
// email) is kept without its subject or contents (`secret` is what's shown instead) and can't be
// sent again: a new one is asked for instead.
//
// What was sent is kept for 30 days and at most 3,000 emails; the contents only for the newest
// 500.
//
// Stored with server/storage.js as storage.open("outbox", OUTBOX_PARTS).

import { randomUUID } from "node:crypto";

export const OUTBOX_PARTS = {
  mail: (m) => m.id,
};

const KEEP_DAYS = 30;
const KEEP = 3000;
const KEEP_BODIES = 500;

// A send failure in a plain sentence; the provider's own words stay in the server log.
export function plainFailure(message) {
  const m = String(message || "");
  if (/not configured/i.test(m)) return "Email isn't set up.";
  if (/\b(422|400)\b/.test(m) && /email|to|recipient/i.test(m)) return "The address doesn't look right.";
  if (/\b429\b/.test(m)) return "Too many emails at once. Try again in a minute.";
  if (/timeout|abort/i.test(m)) return "The email service didn't answer in time.";
  return "It couldn't be sent.";
}

export function createOutbox({ store }) {
  const db = store.data;
  db.mail ||= [];
  const save = () => store.save();
  const find = (id) => db.mail.find((m) => m.id === id) || null;

  function prune() {
    const since = new Date(Date.now() - KEEP_DAYS * 864e5).toISOString();
    db.mail = db.mail.filter((m) => m.at >= since).slice(0, KEEP);
    for (const m of db.mail.slice(KEEP_BODIES)) {
      if (m.text || m.html) {
        delete m.text;
        delete m.html;
        delete m.send;
      }
    }
  }

  // Before sending: { to, subject, text, html, kind, from, replyTo, headers, secret, by, again }.
  async function record(e) {
    const m: any = {
      id: randomUUID(),
      at: new Date().toISOString(),
      to: String(Array.isArray(e.to) ? e.to.join(", ") : e.to || "").slice(0, 300),
      kind: e.kind || "",
      status: "sending",
      by: e.by || "",
      again: e.again || "",
      // Attached files by name only (the files themselves aren't kept here).
      ...(e.attachments?.length && { files: e.attachments.map((f) => String(f.filename || "").slice(0, 160)) }),
    };
    if (e.secret) Object.assign(m, { subject: e.secret, secret: true });
    else Object.assign(m, { subject: String(e.subject || "").slice(0, 300), text: e.text ? String(e.text).slice(0, 50_000) : "", html: e.html ? String(e.html).slice(0, 300_000) : "", send: { from: e.from || "", replyTo: e.replyTo || "", headers: e.headers || null } });
    db.mail.unshift(m);
    prune();
    await save();
    return m;
  }
  async function sent(id) {
    const m = find(id);
    if (!m) return;
    Object.assign(m, { status: "sent", sentAt: new Date().toISOString() });
    delete m.error;
    await save();
  }
  async function failed(id, message) {
    const m = find(id);
    if (!m) return;
    Object.assign(m, { status: "failed", error: plainFailure(message) });
    await save();
  }

  // Sent again: the first one is no longer waiting on anyone.
  async function resent(id, againId) {
    const m = find(id);
    if (!m) return;
    m.resent = againId;
    await save();
  }

  return {
    get list() {
      return db.mail.slice();
    },
    find,
    record,
    sent,
    failed,
    resent,
  };
}
