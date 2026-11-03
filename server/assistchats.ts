// The assistant's chats, each person's own (Peasy's recent chats): a title from the first
// question, the messages, and when it was last used. Also what people say about an answer
// (Helpful, or their feedback), kept to improve the assistant.
//
// A chat keeps its last 80 messages; a person keeps their 50 most recent chats. Files sent in a
// chat keep their name and kind only.
//
// Stored with server/storage.js as storage.open("assistchats", ASSISTCHAT_PARTS).

import { randomUUID } from "node:crypto";

export const ASSISTCHAT_PARTS = {
  chats: (c) => c.id,
  feedback: (f) => f.id,
};

const KEEP_CHATS = 50;
const KEEP_MESSAGES = 80;
const text = (v, n) => String(v ?? "").slice(0, n);

// What's kept of a message: who said it and what, the answer's cards and proposals as they were.
function cleanMessage(m) {
  const out: any = { role: m.role === "assistant" ? "assistant" : "user", content: text(m.content, 40_000) };
  if (m.error) out.error = true;
  if (Array.isArray(m.files)) out.files = m.files.slice(0, 20).map((f) => ({ name: text(f.name, 200), kind: text(f.kind, 20) }));
  for (const k of ["cards", "proposals", "steps"]) if (Array.isArray(m[k])) out[k] = JSON.parse(JSON.stringify(m[k])).slice(0, 40);
  if (Number.isFinite(m.ms)) out.ms = m.ms;
  if (m.feedback) out.feedback = m.feedback === "helpful" ? "helpful" : "feedback";
  return out;
}

export function createAssistChats({ store }) {
  const db = store.data;
  db.chats ||= [];
  db.feedback ||= [];
  const save = () => store.save();
  const mine = (owner) => db.chats.filter((c) => c.owner === owner).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  // Their chats, newest first, without the messages.
  const list = (owner) => mine(owner).map(({ id, title, updatedAt, messages }) => ({ id, title, updatedAt, count: messages.length }));
  const get = (owner, id) => db.chats.find((c) => c.id === id && c.owner === owner) || null;

  // Save a chat's messages (making it the first time); the title is its first question.
  async function put(owner, id, messages) {
    const clean = (Array.isArray(messages) ? messages : []).slice(-KEEP_MESSAGES).map(cleanMessage);
    if (!clean.length) return null;
    const first = clean.find((m) => m.role === "user" && m.content.trim());
    const title = text((first?.content || "New chat").replace(/\s+/g, " ").trim(), 80);
    let c = get(owner, id);
    if (!c) {
      c = { id: /^[\w-]{8,64}$/.test(id) ? id : randomUUID(), owner, createdAt: new Date().toISOString() };
      db.chats.push(c);
    }
    Object.assign(c, { title, messages: clean, updatedAt: new Date().toISOString() });
    // Each person keeps their newest chats.
    const old = mine(owner).slice(KEEP_CHATS).map((x) => x.id);
    if (old.length) db.chats = db.chats.filter((x) => !old.includes(x.id));
    await save();
    return c;
  }

  async function remove(owner, id) {
    db.chats = db.chats.filter((c) => !(c.id === id && c.owner === owner));
    await save();
  }

  // Helpful, or their words: kept with the question and answer they were about.
  async function feedback(owner, { chatId, index, helpful, note }) {
    const c = get(owner, chatId);
    const answer = c?.messages[index];
    if (answer?.role !== "assistant") return null;
    answer.feedback = helpful ? "helpful" : "feedback";
    const question = [...c.messages.slice(0, index)].reverse().find((m) => m.role === "user");
    db.feedback.unshift({ id: randomUUID(), at: new Date().toISOString(), owner, chatId, helpful: Boolean(helpful), note: text(note, 2000), question: text(question?.content, 2000), answer: text(answer.content, 4000) });
    db.feedback = db.feedback.slice(0, 1000);
    await save();
    return answer;
  }

  return { list, get, put, remove, feedback };
}
