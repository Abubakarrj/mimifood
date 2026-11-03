// iMessage through Photon Spectrum: wholesale customers text the shop, and the texts land in the
// back office Inbox. Staff answer there and the reply goes back as an iMessage.
//
// Reply-only: we never text anyone first. A reply always goes into a conversation the customer
// started (the space their text came in on).
//
// Off unless PHOTON_PROJECT_ID and PHOTON_PROJECT_SECRET are set (Photon dashboard → Settings).
// Spectrum keeps one stream open to Photon (no webhook), so this runs inside the server.

// Any of the names works (PHOTON_PROJECT_ID, SPECTRUM_PROJECT_ID as in Photon's Spectrum docs, or
// PROJECT_ID), trimmed of the space or line break a paste can bring along.
const env = (...names) => names.map((n) => String(process.env[n] || "").trim()).find(Boolean) || "";
const projectId = () => env("PHOTON_PROJECT_ID", "SPECTRUM_PROJECT_ID", "PROJECT_ID");
const projectSecret = () => env("PHOTON_PROJECT_SECRET", "SPECTRUM_PROJECT_SECRET", "PROJECT_SECRET");
export const imessageConfigured = () => Boolean(projectId() && projectSecret());

// Screen and bubble effects a text can be sent with (iMessage names).
// The tapbacks iMessage has.
export const TAPBACKS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];
export const EFFECTS = ["confetti", "fireworks", "balloons", "heart", "sparkles", "celebration", "gentle", "loud", "slam"];

const MAX_FILE = 15 * 1024 * 1024; // photos, voice notes and files they send, kept up to this size
const URL_ONLY = /^https?:\/\/\S+$/i;

export function createImessage({ onText, onRead, onReaction }) {
  let sdk = null; // the Spectrum builders we use, loaded on first connect
  let app = null;
  let im = null;
  let connected = false;
  let lastError = ""; // why the stream last failed, for the back office Inbox
  const spaces = new Map(); // space id → space, for replies
  const lastIn = new Map(); // space id → the customer's latest text, for tapbacks and read receipts
  const recent = new Map(); // message id → their message, for threaded replies (the latest 500)
  const ours = new Map(); // message id → a text we sent, to edit or unsend it (the latest 500)
  const keep = (map, m) => {
    if (!m?.id) return;
    map.set(m.id, m);
    if (map.size > 500) map.delete(map.keys().next().value);
  };
  const waiting = new Set<() => void>(); // replies waiting for the stream to (re)open
  const open = () => {
    connected = true;
    for (const go of waiting) go();
    waiting.clear();
  };

  // A photo, voice note or file they sent: its bytes (if not too big), for the Inbox and the assistant.
  async function fileOf(content) {
    if (content.size && content.size > MAX_FILE) return { kind: content.type, name: content.name || "", mimeType: content.mimeType, tooBig: true };
    const data = await content.read();
    if (data.length > MAX_FILE) return { kind: content.type, name: content.name || "", mimeType: content.mimeType, tooBig: true };
    return { kind: content.type, name: content.name || "", mimeType: content.mimeType || "application/octet-stream", data, ...(content.duration && { duration: content.duration }) };
  }

  // What they sent, as text plus files. A group (several photos at once) is all of its items.
  async function unpack(content) {
    if (content.type === "group") {
      const parts = await Promise.all((content.items || []).map((m) => unpack(m.content)));
      return { text: parts.map((p) => p.text).filter(Boolean).join("\n"), files: parts.flatMap((p) => p.files) };
    }
    if (content.type === "text") return { text: content.text, files: [] };
    if (content.type === "markdown") return { text: content.markdown, files: [] };
    if (content.type === "attachment" || content.type === "voice") return { text: "", files: [await fileOf(content)] };
    if (content.type === "contact") return { text: `Sent a contact card: ${[content.name?.formatted, ...(content.phones || []).map((p) => p.value), ...(content.emails || []).map((e) => e.value)].filter(Boolean).join(", ")}`, files: [] };
    if (content.type === "richlink") return { text: content.url, files: [] };
    if (content.type === "poll") return { text: `Started a poll: ${content.title || "Untitled"} (${(content.options || []).map((o) => o.title).join(", ")})`, files: [] };
    if (content.type === "poll_option") return { text: `${content.selected === false ? "Took back their vote for" : "Voted"} “${content.option?.title}”${content.poll?.title ? ` in “${content.poll.title}”` : ""}`, files: [] };
    return null; // typing, edits, membership changes…
  }

  async function listen() {
    if (!sdk) {
      const [core, provider] = await Promise.all([import("@spectrum-ts/core"), import("@spectrum-ts/imessage")]);
      sdk = { Spectrum: core.Spectrum, reaction: core.reaction, reply: core.reply, voice: core.voice, richlink: core.richlink, contact: core.contact, typing: core.typing, read: core.read, poll: core.poll, attachment: core.attachment, imessage: provider.imessage, effect: provider.effect, nativeContactCard: provider.nativeContactCard };
    }
    app = await sdk.Spectrum({ projectId: projectId(), projectSecret: projectSecret(), providers: [sdk.imessage.config()] });
    im = sdk.imessage(app);
    open();
    lastError = "";
    console.log("[imessage] listening");
    for await (const [space, message] of app.messages) {
      // One line per message Photon sends us (what kind, never what it says), so a text that
      // gets no answer can be traced: did it arrive, and was it skipped?
      const skip = message.direction === "outbound" ? "ours" : space.type === "group" ? "group chat" : !message.sender?.id ? "no sender" : "";
      if (message.content?.type !== "typing") console.log(`[imessage] in: ${message.content?.type || "?"}${skip ? ` (skipped: ${skip})` : ""}`);
      if (skip) continue;
      const content = message.content;
      // They read one of our texts (and so everything before it).
      if (content.type === "read") {
        if (content.target?.id) await Promise.resolve(onRead?.({ spaceId: space.id, textId: content.target.id, at: message.timestamp })).catch((error) => console.error("[imessage] read receipt:", error.message));
        continue;
      }
      spaces.set(space.id, space);
      // A tapback on one of our texts (👍 on "Good to go?" is a yes).
      if (content.type === "reaction") {
        if (content.target?.id) {
          await Promise.resolve(onReaction?.({ from: message.sender.id, spaceId: space.id, messageId: message.id, emoji: content.emoji, textId: content.target.id })).catch((error) => console.error("[imessage] reaction:", error.message));
        }
        continue;
      }
      let got;
      try {
        got = await unpack(content);
      } catch (error) {
        console.error("[imessage] couldn't read what they sent:", error.message);
        got = { text: "Sent a file that couldn't be opened.", files: [] };
      }
      if (!got || (!got.text && !got.files.length)) continue;
      lastIn.set(space.id, message);
      keep(recent, message);
      try {
        await onText({ from: message.sender.id, spaceId: space.id, messageId: message.id, text: got.text, files: got.files });
      } catch (error) {
        console.error("[imessage] inbound:", error.message);
      }
    }
  }

  // Runs for the life of the server; if the stream drops, it reconnects (waiting longer each time).
  async function start() {
    if (!imessageConfigured()) return;
    for (let wait = 5; ; wait = Math.min(wait * 2, 300)) {
      try {
        await listen();
        wait = 5; // the stream ended cleanly: start over quickly
      } catch (error) {
        lastError = error.message || String(error);
        console.error("[imessage] stream:", lastError);
      }
      connected = false;
      await app?.stop().catch(() => {});
      app = im = null;
      await new Promise((r) => setTimeout(r, wait * 1000).unref?.());
    }
  }

  // Our message's id (so its read receipt and tapbacks find it), kept to edit or unsend it later.
  const idOf = (sent) => {
    const m = Array.isArray(sent) ? sent[sent.length - 1] : sent;
    keep(ours, m);
    return { id: m?.id || null };
  };

  // The space for a conversation: the one a text came in on, or looked up (after a restart).
  async function spaceFor(spaceId) {
    // Just after a deploy the stream may still be opening: wait up to 30 seconds for it.
    if (!im && imessageConfigured()) {
      await new Promise<void>((resolve) => {
        const t = setTimeout(resolve, 30_000);
        waiting.add(() => (clearTimeout(t), resolve()));
      });
    }
    if (!im) throw new Error("iMessage isn't connected.");
    const space = spaces.get(spaceId) || (await im.space.get(spaceId));
    spaces.set(spaceId, space);
    return space;
  }

  // A text in the conversation by its id: kept from this run, or fetched from iMessage (after a
  // restart or deploy). Fetched texts can take tapbacks and threaded replies, not edits or unsends.
  async function find(spaceId, id) {
    const latest = lastIn.get(spaceId);
    const known = recent.get(id) || ours.get(id) || (latest?.id === id ? latest : null);
    if (known) return known;
    const space = await spaceFor(spaceId);
    const m = await space.getMessage(id).catch((error) => {
      console.error("[imessage] couldn't fetch a text:", error.message);
      return undefined;
    });
    if (m) keep(recent, m);
    return m || null;
  }

  return {
    start,
    ready: () => connected,
    error: () => (connected ? "" : lastError),
    // A tapback (❤️ 👍 👎 😂 ‼️ ❓) on a text in the conversation (`messageId`, theirs or ours), or on
    // their latest. Gives
    // the id of the text reacted to, or false when there's no such text.
    async react(spaceId, emoji, messageId = "") {
      const m = messageId ? await find(spaceId, messageId) : lastIn.get(spaceId);
      if (!m) return false;
      const space = await spaceFor(spaceId);
      await space.send(sdk.reaction(emoji, m));
      return m.id;
    },
    // "Read" on their latest text, and the typing bubble while a reply is written.
    // (iMessage marks the whole conversation read: every unread text in it.)
    async read(spaceId) {
      const m = lastIn.get(spaceId);
      if (!m) return;
      const space = await spaceFor(spaceId).catch(() => null);
      await space?.send(sdk.read(m)).catch(() => {});
    },
    async typing(spaceId, on) {
      const space = await spaceFor(spaceId).catch(() => null);
      await space?.send(sdk.typing(on ? "start" : "stop")).catch(() => {});
    },
    // The shop's contact card, so they can save the number: a vCard with our logo they can tap to
    // add (`card`, vCard text), and Apple's "Share Name and Photo" (the name and photo set for the
    // line in Photon), which offers them Add Contact at the top of the conversation.
    async shareCard(spaceId, card) {
      const space = await spaceFor(spaceId);
      if (card) await space.send(sdk.contact(card));
      await space.send(sdk.nativeContactCard()).catch((error) => console.error("[imessage] name and photo:", error.message));
    },
    // A text into the conversation the customer started. A link on its own shows as a preview
    // card; `effect` sends it with confetti and so on; `replyTo` (a message id, theirs or ours)
    // threads it under that text (a plain text if iMessage can't find it).
    async send(spaceId, text, { effect, replyTo }: { effect?: any; replyTo?: any } = {}) {
      const space = await spaceFor(spaceId);
      let content = URL_ONLY.test(text.trim()) ? sdk.richlink(text.trim()) : text;
      if (effect && EFFECTS.includes(effect)) content = sdk.effect(content, sdk.imessage.effect.message[effect]);
      const target = replyTo && (await find(spaceId, replyTo));
      if (target) {
        const sent = await space.send(sdk.reply(content, target));
        if (sent) return idOf(sent);
      }
      return idOf(await space.send(content));
    },
    // A poll (2 to 6 choices); their votes come back as texts ("Voted “Tuesday”").
    async sendPoll(spaceId, title, options) {
      const space = await spaceFor(spaceId);
      return idOf(await space.send(sdk.poll(title, ...options)));
    },
    // A photo (bytes), e.g. one of our coffees.
    async sendPhoto(spaceId, data, { name = "photo.jpg", mimeType = "image/jpeg" } = {}) {
      const space = await spaceFor(spaceId);
      return idOf(await space.send(sdk.attachment(data, { name, mimeType })));
    },
    // A file (a PDF, or a photo as it is).
    async sendFile(spaceId, data, { name, mimeType }) {
      const space = await spaceFor(spaceId);
      return idOf(await space.send(sdk.attachment(data, { name, mimeType })));
    },
    // A voice note, played as one on their iPhone. Not M4A (Chrome records WebM): the library
    // converts it with ffmpeg (the ffmpeg-static package).
    async sendVoice(spaceId, data, { mimeType, duration = 0 }) {
      const space = await spaceFor(spaceId);
      return idOf(await space.send(sdk.voice(data, { mimeType, name: "Voice message.m4a", ...(duration && { duration }) })));
    },
    // Fix or take back a text we sent (iMessage allows edits for 15 minutes, unsending for 2).
    // Only texts sent since the server started can be changed.
    canChange: (textId) => ours.has(textId),
    async edit(textId, text) {
      const m = ours.get(textId);
      if (!m) throw new Error("That text can't be changed any more.");
      await m.edit(text);
    },
    async unsend(textId) {
      const m = ours.get(textId);
      if (!m) throw new Error("That text can't be unsent any more.");
      await m.unsend();
      ours.delete(textId);
    },
  };
}
