// The Inbox: conversations with customers who want a person. They start from the contact form,
// from "Talk to a person" in the FAQ assistant (chat), by emailing the shop (Resend receiving),
// or by texting the shop (iMessage through Photon, see server/imessage.js).
//
// A staff reply isn't sent straight away: it waits a few seconds (UNDO_SECONDS) so a typo can be
// taken back ("Sending in 7s · Undo · Send now"). Replies go to the customer by email; their
// answer comes back into the same conversation (see server.js, /api/resend/inbound). A text is
// answered by text.

import { randomBytes } from "node:crypto";
import { contentOf } from "./channels.ts";

export class InboxError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const INBOX_PARTS = { conversations: (c) => c.id };
export const UNDO_SECONDS = 10;

const clip = (s, n) => String(s ?? "").trim().slice(0, n);
const now = () => new Date().toISOString();
const id = (prefix, bytes) => `${prefix}-${randomBytes(bytes).toString("hex")}`;

// Each conversation's short reference, put in reply subjects ("[#a1b2c3]") so answers find their way back.
export const refOf = (c) => c.id.slice(-6);

// The four inboxes. A conversation belongs to one: where its first email was sent (hello@, orders@,
// wholesale@), Forms for the contact form and Talk to a Person, Wholesale for enquiries and an account's
// texts and chats.
export const BOXES = ["hello", "orders", "wholesale", "forms"];
export const boxOf = (c) => (c.source === "wholesale" ? "wholesale" : BOXES.includes(c.box) ? c.box : c.source === "form" ? "forms" : c.accountId ? "wholesale" : "hello");
export const refInSubject = (subject) => /\[#([a-f0-9]{6})\]/i.exec(String(subject || ""))?.[1]?.toLowerCase() || null;
export const cleanSubject = (subject) =>
  String(subject || "")
    .replace(/\s*\[#[a-f0-9]{6}\]/gi, "")
    .replace(/^\s*((re|fwd?|aw|sv)\s*:\s*)+/i, "")
    .trim();

// The new part of an emailed answer: everything above the quoted earlier message.
export function newPart(text) {
  const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
  const out = [];
  for (const line of lines) {
    if (/^\s*>/.test(line)) break;
    if (/^\s*On .{4,200}wrote:\s*$/i.test(line) || /^\s*El .{4,200}escribió:\s*$/i.test(line) || /^-{2,}\s*Original Message\s*-{2,}/i.test(line) || /^\s*From:\s.+/i.test(line)) break;
    if (/^\s*(Sent from my|Get Outlook for)/i.test(line)) break;
    out.push(line);
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim() || String(text || "").trim();
}

export function createInbox({ store, deliver }) {
  const db = store.data;
  const save = () => store.save();
  const find = (cid) => db.conversations.find((c) => c.id === cid);
  const timers = new Map(); // message id → timeout

  function get(cid) {
    const c = find(cid);
    if (!c) throw new InboxError("Conversation not found.", 404);
    return c;
  }

  const message = (from, text, extra = {}) => ({ id: id("msg", 5), from, text: clip(text, 20000), at: now(), ...extra });

  // Sends a held reply (when its time comes, or at once with "Send now").
  async function release(cid, mid) {
    clearTimeout(timers.get(mid));
    timers.delete(mid);
    const c = find(cid);
    const m = c?.messages.find((x) => x.id === mid);
    if (!m || m.status !== "pending") return m;
    m.status = "sending";
    try {
      const sent = await deliver(c, m);
      m.status = "sent";
      m.sentAt = now();
      if (sent?.id) m[c.channel === "imessage" ? "textId" : "emailId"] = sent.id;
    } catch (error) {
      console.error(`[inbox] reply to ${c.email || c.phone || c.id} failed:`, error.message);
      m.status = "failed";
      m.error = clip(error.message, 200);
    }
    await save();
    return m;
  }

  function schedule(c, m) {
    clearTimeout(timers.get(m.id));
    const wait = Math.max(0, Date.parse(m.sendAt) - Date.now());
    const t = setTimeout(() => release(c.id, m.id).catch((e) => console.error("[inbox]", e.message)), wait);
    t.unref?.();
    timers.set(m.id, t);
  }

  // Replies that were waiting when the server stopped (a deploy) go out now, or when due.
  for (const c of db.conversations) {
    for (const m of c.messages) {
      if (m.status === "sending") m.status = "pending"; // stopped mid-send: try again
      if (m.status === "pending") schedule(c, m);
    }
  }

  const summary = (c) => {
    const last = [...c.messages].reverse().find((m) => !m.action && (m.status !== "pending" || m.from !== "staff")) || c.messages[c.messages.length - 1];
    return { id: c.id, name: c.name, email: c.email, phone: c.phone, agent: c.agent, subject: c.subject, channel: c.channel, source: c.source, box: boxOf(c), rating: c.rating?.score || null, from: c.from || null, owner: c.owner || null, status: c.status, unread: c.unread, createdAt: c.createdAt, updatedAt: c.updatedAt, last: last ? { from: last.from, ...(last.sender && { sender: last.sender }), text: last.text.slice(0, 160), at: last.at } : null };
  };

  return {
    summary,
    // owner: a teammate's conversations (abu, emily…), whatever inbox they're in. channel: "email",
    // or "chat" (the website's chat and texts). q: words found in their name, email, subject or
    // anything written.
    list: (status?, box?, owner?, { channel = "", q = "" } = {}) => {
      const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
      const found = (c) => {
        const all = [c.name, c.email, c.phone, c.subject, ...c.messages.map((m) => m.text)].join(" ").toLowerCase();
        return words.every((w) => all.includes(w));
      };
      return db.conversations
        .filter((c) => (!status || c.status === status) && (!box || boxOf(c) === box) && (!owner || c.owner === owner) && (!channel || (channel === "email" ? c.channel === "email" : c.channel !== "email")) && (!words.length || found(c)))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },
    unread: () => db.conversations.filter((c) => c.unread && c.status === "open").length,
    get,
    // Whether an email (by Resend's id) is already in a conversation: a redelivered webhook.
    hasEmail: (emailId) => Boolean(emailId) && db.conversations.some((c) => c.messages.some((m) => m.emailId === emailId)),

    // A customer starts a conversation (contact form, chat hand-off, or a new email).
    async start({ name, email, subject, channel, source, box, from, owner, text, transcript = [], emailId, messageId, chatHash, phone, spaceId, accountId, textId, files, agent = false, userId }: { name?: any; email?: any; subject?: any; channel?: any; source?: any; box?: any; from?: any; owner?: any; text?: any; transcript?: any[]; emailId?: any; messageId?: any; chatHash?: any; phone?: any; spaceId?: any; accountId?: any; textId?: any; files?: any; agent?: boolean; userId?: any }) {
      const c = {
        id: id("conv", 6),
        // A chat needs no name or email: without one it's a visitor, answered in their chat.
        name: clip(name, 80) || clip(email, 80).split("@")[0] || "Visitor",
        email: clip(email, 254).toLowerCase(),
        subject: clip(subject, 160) || "No subject",
        channel: ["chat", "imessage"].includes(channel) ? channel : "email",
        source: clip(source, 20) || channel,
        ...(BOXES.includes(box) && { box }),
        // The address the team writes to them from (orders@, abu@…), and whose conversation it is.
        ...(from && { from: clip(from, 32) }),
        ...(owner && { owner: clip(owner, 32) }),
        status: "open",
        unread: true,
        createdAt: now(),
        updatedAt: now(),
        messages: [],
        ...(chatHash && { chatHash }), // the customer's chat window holds the key to this conversation
        // A chat the assistant answers until someone on staff steps in; who's logged in, if anyone.
        ...(chatHash && agent && { agent: true }),
        ...(chatHash && userId && { userId }),
        ...(chatHash && accountId && { accountId }),
        // A text: who sent it, the iMessage conversation replies go back into, and their wholesale account.
        // The assistant answers texts until someone on staff steps in (see server/textagent.js).
        ...(spaceId && { phone: clip(phone, 254), spaceId: clip(spaceId, 300), ...(accountId && { accountId }), agent: true }),
      };
      // The assistant conversation that came before, so the person picking it up has the context.
      for (const t of transcript.slice(-12)) c.messages.push(message(t.role === "assistant" ? "assistant" : "customer", t.content, { earlier: true }));
      if (clip(text, 20000) || files?.length) c.messages.push(message("customer", text, { emailId, messageId, ...(textId && { textId }), ...(files?.length && { files }), ...(chatHash && accountId && userId && { author: userId }) }));
      db.conversations.push(c);
      await save();
      return c;
    },

    // What the customer's chat window shows: everything but replies still waiting to go.
    chatView: (c) => ({
      status: c.status,
      // (Questions asked on the FAQ page before the chat are for the roastery, not shown again.)
      // The assistant's answers show (not its notes of what it did); a cart it filled goes along.
      messages: c.messages
        .filter((m) => !m.earlier && !m.action && !(m.from === "staff" && (m.status === "pending" || m.status === "sending")))
        .map((m) => ({ id: m.id, from: m.from, text: m.text, at: m.at, ...(m.from === "staff" && m.sender && { sender: m.sender }), ...(m.from === "customer" && c.accountId && (m.author || c.userId) && { author: m.author || c.userId }), ...(m.rate && { rate: true }), ...(m.cart && { cart: m.cart }), ...(m.cards && { cards: m.cards }), ...(m.replies && { replies: m.replies }), ...(m.checkout && { checkout: true }), ...(m.feedback && { feedback: m.feedback.helpful ? "helpful" : "feedback" }), ...(m.files?.length && { files: m.files.filter((f) => f.kind === "image" || f.kind === "pdf").map((f) => ({ id: f.id, kind: f.kind, name: f.name })) }), content: contentOf(m), ...(m.tapback && { tapback: { emoji: m.tapback.emoji, by: m.tapback.by === "customer" ? "customer" : "us" } }) })),
      agent: Boolean(c.agent),
      rating: c.rating ? { score: c.rating.score, ...(c.rating.comment && { comment: c.rating.comment }) } : null,
      teamReadAt: c.teamReadAt || null,
    }),

    // An answer from the customer (by email, text, or in the chat window).
    // via: "chat" for an email conversation they carried on in the chat window.
    async receive(c, { text, emailId, messageId, textId, files, reaction, via, author }: { text: any; emailId?: any; messageId?: any; textId?: any; files?: any; reaction?: any; via?: string; author?: string }) {
      if (emailId && c.messages.some((m) => m.emailId === emailId)) return c; // the same email delivered twice
      if (textId && c.messages.some((m) => m.textId === textId)) return c; // the same text delivered twice
      c.messages.push(message("customer", text, { emailId, messageId, ...(textId && { textId }), ...(files?.length && { files }), ...(reaction && { reaction }), ...(via && { via }), ...(author && { author }) }));
      c.unread = true;
      c.status = "open";
      c.updatedAt = now();
      await save();
      return c;
    },

    // The open conversation this email answers: its reference in the subject, or the sender's latest.
    match({ email, subject, refs = [], box }: { email: any; subject: any; refs?: string[]; box?: string }) {
      // The email it answers first, then the ref in its subject, then their open conversation.
      const byThread = refs.length && db.conversations.find((c) => c.email === email && c.messages.some((m) => m.messageId && refs.includes(m.messageId)));
      if (byThread) return byThread;
      const ref = refInSubject(subject);
      const byRef = ref && db.conversations.find((c) => refOf(c) === ref && c.email === email);
      if (byRef) return byRef;
      return this.list().find((c) => c.email === email && c.status === "open" && (!box || boxOf(c) === box)) || null;
    },

    // The assistant's texts (already sent), and notes of what it did ("Placed MF-1A2B3C").
    // A text can be threaded under one of theirs (`replyTo`, our message id) or carry an effect.
    // as: "staff" for what staff send straight away (a photo, voice note or poll): it answers their
    // texts as a reply does, so the assistant stops answering.
    // poll: true for a text poll, or { question, options } to keep (a chat shows it as choices).
    async say(c, text, { as = "assistant", action = false, replyTo, effect, textId, poll, files, cart, cards, replies, checkout, sender }: { as?: string; action?: boolean; replyTo?: any; effect?: any; textId?: any; poll?: any; files?: any; cart?: any; cards?: any; replies?: any; checkout?: any; sender?: string } = {}) {
      if (as === "staff") {
        c.unread = false;
        c.agent = false;
        const lastIn = [...c.messages].reverse().find((x) => x.from === "customer");
        if (lastIn) c.agentSeen = lastIn.id;
      }
      const m = message(as === "staff" ? "staff" : "assistant", text, action ? { action: true } : { status: "sent", sentAt: now(), ...(replyTo && { replyTo }), ...(effect && { effect }), ...(textId && { textId }), ...(poll && { poll: typeof poll === "object" ? { question: clip(poll.question, 200), options: poll.options.map((o) => clip(o, 80)) } : true }), ...(sender && { sender }), ...(files?.length && { files }), ...(cart?.length && { cart }), ...(cards?.length && { cards }), ...(replies?.length && { replies }), ...(checkout && { checkout: true }) });
      c.messages.push(m);
      c.updatedAt = now();
      await save();
      return m;
    },

    // A text of ours was edited or unsent on their phone: the Inbox shows the same.
    async changeSent(c, mid, { text, unsent }: { text?: any; unsent?: any }) {
      const m = c.messages.find((x) => x.id === mid);
      if (!m) throw new InboxError("Text not found.", 404);
      if (unsent) m.unsent = now();
      if (text !== undefined) {
        m.text = clip(text, 20000);
        m.edits = (m.edits || 0) + 1;
      }
      await save();
      return m;
    },

    // Their pick on a poll we sent to their chat (shown checked; a new pick replaces it).
    async answerPoll(c, mid, choice) {
      const m = c.messages.find((x) => x.id === mid && x.poll && typeof x.poll === "object");
      if (!m || !m.poll.options.includes(choice)) throw new InboxError("Pick one of the choices.");
      m.poll.choice = choice;
      await save();
      return m;
    },

    // Their chat window is open on screen: everything we've sent so far is read.
    async readOurs(c, at = Date.now()) {
      const when = new Date(at).toISOString();
      let changed = false;
      for (const m of c.messages) {
        if ((m.from === "staff" || m.from === "assistant") && !m.action && !m.readAt && (m.status === "sent" || !m.status)) {
          m.readAt = when;
          changed = true;
        }
      }
      if (changed) await save();
      return changed;
    },

    // A read receipt: they've read our text `textId`, and everything we sent before it.
    async readUpTo(c, textId, at) {
      const i = c.messages.findIndex((m) => m.textId === textId && m.from !== "customer");
      if (i < 0) return false;
      const when = new Date(at || Date.now()).toISOString();
      let changed = false;
      for (const m of c.messages.slice(0, i + 1)) {
        if ((m.from === "staff" || m.from === "assistant") && !m.action && !m.readAt && m.status === "sent") {
          m.readAt = when;
          changed = true;
        }
      }
      if (changed) await save();
      return changed;
    },

    // The latest iMessage conversation with this phone number (any format), or null.
    byPhone(phone) {
      const key = String(phone || "").replace(/\D/g, "").slice(-10);
      if (key.length < 10) return null;
      return db.conversations.filter((c) => c.spaceId && String(c.phone || "").replace(/\D/g, "").slice(-10) === key).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null;
    },

    // The conversation a text belongs to: the latest one in the same iMessage conversation.
    matchText: (spaceId) => db.conversations.filter((c) => c.spaceId === spaceId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0] || null,

    // A staff reply: held for UNDO_SECONDS, then sent.
    // sender: who it goes out as ({ local, shared }): it becomes the conversation's address, and a
    // teammate writing as themselves (emily@) takes the conversation over.
    // close: send it as the closing message (it asks them to rate the conversation) and close it.
    // replyTo: the text it answers, theirs or ours (threaded under it in Messages); effect: an
    // iMessage effect.
    async reply(cid, text, sender?: { local: string; shared: boolean }, { close = false, replyTo = "", effect = "" } = {}) {
      const c = get(cid);
      if (!clip(text, 20000)) throw new InboxError("Write a reply first.");
      if (!c.email && !c.chatHash && !c.spaceId) throw new InboxError("There's no email address to reply to.");
      if (sender && c.email) {
        c.from = sender.local;
        if (sender.shared) delete c.owner;
        else c.owner = sender.local;
      }
      // Who wrote it: the address it goes out as (email), or in a chat the teammate it's handed to.
      const by = sender && c.email ? sender.local : c.chatHash && c.owner ? c.owner : null;
      const to = replyTo && c.spaceId ? c.messages.find((x) => x.id === replyTo && x.textId && !x.reaction && !x.unsent && !x.action) : null;
      const m = message("staff", text, { status: "pending", sendAt: new Date(Date.now() + UNDO_SECONDS * 1000).toISOString(), ...(by && { sender: by }), ...(close && (c.email || c.chatHash) && { rate: true }), ...(to && { replyTo: to.id }), ...(effect && c.spaceId && { effect }) });
      if (close) c.status = "closed";
      c.messages.push(m);
      c.unread = false;
      c.teamReadAt = now();
      c.updatedAt = now();
      if (c.agent) c.agent = false; // someone on staff has stepped in: the assistant stops answering
      // Their texts so far are answered: if the assistant is turned back on, it starts after them.
      const lastIn = [...c.messages].reverse().find((x) => x.from === "customer");
      if ((c.spaceId || c.chatHash) && lastIn) c.agentSeen = lastIn.id;
      await save();
      schedule(c, m);
      return m;
    },

    // Undo: the reply comes back (to the composer) and is never sent.
    async undo(cid, mid) {
      const c = get(cid);
      const m = c.messages.find((x) => x.id === mid);
      if (!m || m.from !== "staff") throw new InboxError("Reply not found.", 404);
      if (m.status !== "pending") throw new InboxError("Too late, that reply has already gone.", 409);
      clearTimeout(timers.get(mid));
      timers.delete(mid);
      c.messages = c.messages.filter((x) => x !== m);
      if (m.rate) c.status = "open"; // the closing message taken back: still open
      await save();
      return m;
    },

    // Their rating of the conversation (1 Terrible … 5 Amazing), from the closing email.
    // comment: what they added in the chat's "Tell us more" (kept with a later score too).
    async rate(cid, score, comment = undefined) {
      const c = get(cid);
      const said = comment === undefined ? c.rating?.comment : clip(comment, 500);
      c.rating = { score: Math.max(1, Math.min(5, Math.round(Number(score) || 0))), at: now(), ...(said && { comment: said }) };
      await save();
      return c;
    },

    // Their word on one of the assistant's answers: helpful, or what it should have said.
    async feedback(cid, mid, { helpful, note }: { helpful: boolean; note?: string }) {
      const c = get(cid);
      const m = c.messages.find((x) => x.id === mid && x.from === "assistant");
      if (!m) throw new InboxError("That answer isn't here.", 404);
      m.feedback = { helpful: Boolean(helpful), at: now(), ...(clip(note || "", 2000) && { note: clip(note, 2000) }) };
      await save();
      return c;
    },

    async sendNow(cid, mid) {
      const c = get(cid);
      const m = c.messages.find((x) => x.id === mid);
      if (!m || m.from !== "staff") throw new InboxError("Reply not found.", 404);
      if (m.status === "failed") m.status = "pending"; // "Try again"
      return release(c.id, m.id);
    },

    // owner: hand it to a teammate ({ local }: replies then go out as them), or null for back to
    // its inbox's address.
    async update(cid, { status, unread, agent, agentSeen, cardShared, owner, teamRead }: { status?: any; unread?: any; agent?: any; agentSeen?: any; cardShared?: any; owner?: { local: string } | null; teamRead?: boolean }) {
      const c = get(cid);
      if (teamRead) c.teamReadAt = now(); // someone on the team has read it (their chat shows "Read")
      if (owner) Object.assign(c, { owner: owner.local, ...(c.email && { from: owner.local }) });
      else if (owner === null) {
        delete c.owner;
        delete c.from;
      }
      if (status === "open" || status === "closed") c.status = status;
      if (unread !== undefined) c.unread = Boolean(unread);
      if (agent !== undefined && (c.spaceId || c.chatHash)) c.agent = Boolean(agent);
      if (agentSeen) c.agentSeen = String(agentSeen); // the latest text the assistant has answered
      if (cardShared) c.cardShared = true; // our contact card has gone to them
      await save();
      return c;
    },

    // Our tapback (❤️ 👍 …) on a text, theirs or ours, shown on it; a new one replaces the last.
    // which: the message's id, or its iMessage id.
    async tapback(cid, which, emoji, by = "staff") {
      const c = get(cid);
      const m = c.messages.find((x) => !x.reaction && (x.id === which || (x.textId && x.textId === which)));
      if (!m) return null;
      m.tapback = { emoji, by, at: now() };
      await save();
      return m;
    },

    // What their messages are about (lead score intent), tagged by Claude in batches:
    // [{ cid, mid, intent }].
    untagged: (since) => db.conversations.flatMap((c) => c.messages.filter((m) => m.from === "customer" && !m.intent && !m.reaction && m.text && m.at > since).map((m) => ({ cid: c.id, mid: m.id, text: m.text }))),
    async setIntents(list) {
      for (const { cid, mid, intent } of list) {
        const m = db.conversations.find((c) => c.id === cid)?.messages.find((x) => x.id === mid);
        if (m) m.intent = intent;
      }
      if (list.length) await save();
    },

    // Whether this person already has our contact card, from this conversation or an earlier one.
    cardSentTo(c) {
      return Boolean(c.cardShared || db.conversations.some((x) => x.cardShared && ((c.spaceId && x.spaceId === c.spaceId) || (c.phone && x.phone === c.phone))));
    },

    // Another chat window let into this conversation (from the link in our emails): the hash of
    // its key, kept with the last few.
    async addChatKey(cid, hash) {
      const c = get(cid);
      c.chatKeys = [...(c.chatKeys || []), hash].slice(-5);
      await save();
      return c;
    },

    // A reply that went to their chat first: seen there, or emailed after all.
    async chatReplyDone(cid, mid, change) {
      const c = get(cid);
      const m = c.messages.find((x) => x.id === mid);
      if (!m) return null;
      delete m.emailBy;
      Object.assign(m, change);
      await save();
      return m;
    },
    // Replies waiting to see if they're read in the chat: [{ c, m }].
    waitingInChat: () => db.conversations.flatMap((c) => c.messages.filter((m) => m.emailBy && m.status === "sent").map((m) => ({ c, m }))),

    async remove(cid) {
      const c = get(cid);
      for (const m of c.messages) clearTimeout(timers.get(m.id));
      db.conversations = db.conversations.filter((x) => x !== c);
      await save();
    },
  };
}
