// One message model for every conversation, after Photon Spectrum's: a message is a list of typed
// content (text, a file, a poll, a card…), and each channel says what it can show. Staff send once
// from the Inbox; a channel that can't show something gets its plain version instead (a poll as
// numbered choices in an email, an order card as a line with its link).
//
// Channels: "imessage" (texts through Photon), "chat" (Chat Us and the wholesale portal's chat,
// both the same chat window) and "email".

export type Card = { type: "order"; number: string } | { type: "product"; id: string };
export type Content =
  | { type: "text"; text: string }
  | { type: "attachment"; id: string; kind: string; name: string }
  | { type: "poll"; question: string; options: string[]; choice?: string | null }
  | { type: "card"; card: Card }
  | { type: "reply"; to: string }
  | { type: "reaction"; emoji: string; to: string }
  | { type: "edited"; times: number }
  | { type: "unsent" };

// What each channel can do. "native": shown as itself; "text": its plain version goes instead;
// false: not offered there.
export const CHANNELS = {
  imessage: { attachment: "native", voice: "native", poll: "native", card: "link", reaction: "native", reply: "native", edit: "native", unsend: "native", typing: "native", read: "native" },
  chat: { attachment: "native", voice: false, poll: "native", card: "native", reaction: "native", reply: "native", edit: "native", unsend: "native", typing: "native", read: "native" },
  email: { attachment: false, voice: false, poll: "text", card: "text", reaction: false, reply: "text", edit: false, unsend: false, typing: false, read: false },
} as const;
export type Channel = keyof typeof CHANNELS;
export type Capability = keyof (typeof CHANNELS)["chat"];

// Which channel a conversation is answered on: texts by iMessage, a chat window (Chat Us or the
// portal) by chat, the rest by email. An email conversation carried on in the chat is a chat.
export const channelOf = (c): Channel => (c.channel === "imessage" && c.spaceId ? "imessage" : c.chatHash || c.chatKeys?.length ? "chat" : "email");
export const can = (c, what: Capability) => CHANNELS[channelOf(c)][what];
// For the Inbox: what this conversation offers, so it shows the right tools.
export const capsOf = (c) => Object.fromEntries(Object.entries(CHANNELS[channelOf(c)]).map(([k, v]) => [k, v === false ? false : v]));

// A stored message as typed content. (Messages keep their fields as before; this is the one
// reading of them every channel uses.)
export function contentOf(m): Content[] {
  const out: Content[] = [];
  if (m.unsent) return [{ type: "unsent" }];
  if (m.replyTo) out.push({ type: "reply", to: m.replyTo });
  if (m.reaction?.to) return [{ type: "reaction", emoji: m.reaction.emoji, to: m.reaction.to }];
  if (m.poll && typeof m.poll === "object") out.push({ type: "poll", question: m.poll.question, options: m.poll.options, choice: m.poll.choice || null });
  else if (m.text && !(m.files?.length && /^Sent (an?|\d+) [\w ]+\.$/.test(m.text))) out.push({ type: "text", text: m.text });
  for (const f of m.files || []) out.push({ type: "attachment", id: f.id, kind: f.kind, name: f.name || "" });
  for (const card of m.cards || []) if (card?.type === "order" || card?.type === "product") out.push({ type: "card", card: card.type === "order" ? { type: "order", number: card.number } : { type: "product", id: card.id } });
  if (m.edits) out.push({ type: "edited", times: m.edits });
  return out;
}

// A poll's plain version (for email): the question, then numbered choices to answer with.
export const pollText = (question: string, options: string[]) => `${question}\n${options.map((o, i) => `${i + 1}. ${o}`).join("\n")}\n\nReply with the number of your choice.`;
// An order card's plain version: the order, where it is, and its page.
export const orderText = (o, url: string) => `Order ${o.number}: ${o.statusLabel}${url ? `\n${url}` : ""}`;
