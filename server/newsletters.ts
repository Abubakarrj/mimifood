// Newsletters written in the back office: blocks (heading, text, image, button, coffee,
// divider) laid out as an email that reads well in Gmail, Apple Mail and Outlook, then sent to
// confirmed subscribers through Resend, 100 at a time. Every email carries its own one-click
// unsubscribe link and header, and the business's mailing address (US CAN-SPAM).

import { randomBytes } from "node:crypto";
import { BLUE, INK, MUTED, FONT, emailButton, emailPage, footLine } from "./emaillayout.ts";

export class NewsletterError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const NEWSLETTER_PARTS = {
  campaigns: (c) => c.id,
  images: (f) => f.id,
};

const IMAGE_TYPES = { "image/jpeg": "jpg", "image/png": "png" };
const IMAGE_MAX_BYTES = 2_500_000;
const BLOCK_TYPES = ["heading", "text", "image", "button", "product", "items", "divider"];
const MAX_BLOCKS = 60;

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clip = (s, n) => String(s ?? "").trim().slice(0, n);
const safeUrl = (u) => {
  const v = String(u || "").trim();
  return /^(https?:\/\/|mailto:)/i.test(v) || /^\{(cart_link|shop_link|review_link)\}$/.test(v) ? v : ""; // or an automated email's link, filled in per reader
};

// Keeps only what each block needs, trimmed.
function cleanBlock(b) {
  if (!b || !BLOCK_TYPES.includes(b.type)) throw new NewsletterError("The newsletter has a block we don't recognise.");
  const id = /^[\w-]{1,24}$/.test(b.id || "") ? b.id : randomBytes(4).toString("hex");
  switch (b.type) {
    case "heading":
      return { id, type: "heading", text: clip(b.text, 200) };
    case "text":
      return { id, type: "text", text: clip(b.text, 6000) };
    case "image":
      return { id, type: "image", image: clip(b.image, 200), alt: clip(b.alt, 200), href: safeUrl(b.href) };
    case "button":
      return { id, type: "button", label: clip(b.label, 60), href: safeUrl(b.href) };
    case "product":
      return { id, type: "product", product: clip(b.product, 80) };
    case "items":
      return { id, type: "items" }; // the reader's own coffees (automated emails)
    default:
      return { id, type: "divider" };
  }
}

export function createNewsletters({ store, products, siteUrl, siteName }) {
  const db = store.data;
  const save = () => store.save();
  const find = (id) => db.campaigns.find((c) => c.id === id);
  const now = () => new Date().toISOString();

  function draft(id) {
    const c = find(id);
    if (!c) throw new NewsletterError("Newsletter not found.", 404);
    if (c.status !== "draft") throw new NewsletterError("This newsletter has been sent, so it can't be changed. Duplicate it to send a new version.");
    return c;
  }

  function apply(c, input) {
    if (input.subject !== undefined) c.subject = clip(input.subject, 150);
    if (input.preheader !== undefined) c.preheader = clip(input.preheader, 200);
    if (input.blocks !== undefined) {
      if (!Array.isArray(input.blocks) || input.blocks.length > MAX_BLOCKS) throw new NewsletterError(`A newsletter can have up to ${MAX_BLOCKS} blocks.`);
      c.blocks = input.blocks.map(cleanBlock);
    }
    c.updatedAt = now();
  }

  async function create(input: any = {}) {
    const c = { id: `nl-${randomBytes(5).toString("hex")}`, status: "draft", subject: "", preheader: "", blocks: [], createdAt: now(), updatedAt: now() };
    if (input.from) {
      const src = find(input.from);
      if (!src) throw new NewsletterError("Newsletter not found.", 404);
      Object.assign(c, { subject: src.subject, preheader: src.preheader, blocks: structuredClone(src.blocks) });
    } else {
      c.blocks = [
        { id: "b1", type: "heading", text: "" },
        { id: "b2", type: "text", text: "" },
      ];
    }
    apply(c, input);
    db.campaigns.push(c);
    await save();
    return c;
  }

  async function update(id, input) {
    const c = draft(id);
    apply(c, input);
    await save();
    return c;
  }

  async function remove(id) {
    const c = find(id);
    if (!c) throw new NewsletterError("Newsletter not found.", 404);
    if (c.status === "sending") throw new NewsletterError("This newsletter is sending right now.");
    db.campaigns = db.campaigns.filter((x) => x !== c);
    await save();
  }

  // Images arrive as a data: URL (resized in the browser) and are served at /media/<id>.
  async function addImage(dataUrl) {
    const m = /^data:(image\/(?:jpeg|png));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
    if (!m) throw new NewsletterError("Please choose a JPEG or PNG image.");
    const bytes = Buffer.byteLength(m[2], "base64");
    if (bytes > IMAGE_MAX_BYTES) throw new NewsletterError("That image is too large. Please use one under 2.5 MB.");
    const image = { id: `news-${randomBytes(6).toString("hex")}.${IMAGE_TYPES[m[1]]}`, type: m[1], data: m[2], bytes, createdAt: now() };
    db.images.push(image);
    await save();
    return { id: image.id, url: `${siteUrl}/media/${image.id}` };
  }
  const image = (id) => db.images.find((f) => f.id === id) || null;

  /* ── The email itself ── */

  const abs = (u) => (u && u.startsWith("/") ? `${siteUrl}${u}` : u);
  const imageUrl = (img) => (/^https?:\/\//.test(img) ? img : img ? `${siteUrl}/media/${img}` : "");

  // Plain text with blank lines between paragraphs; **bold** and bare links become HTML.
  const paragraphs = (text) =>
    String(text || "")
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) =>
        esc(p)
          .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
          .replace(/(https?:\/\/[^\s<]+)/g, `<a href="$1" style="color:${INK};text-decoration:underline">$1</a>`)
          .replace(/\n/g, "<br>")
      );

  // Automated emails fill in the reader's details: {first_name}, {welcome_code}, {cart_link}, {review_link},
  // {shop_link}. A paragraph that needs a value they don't have (no welcome code) is left out;
  // without a first name, the greeting goes ("Hi {first_name}, welcome in" → "Welcome in").
  const TAGS = /\{(first_name|greeting_name|weekday|welcome_code|cart_link|shop_link|review_link)\}/g;
  const fillTags = (s, ctx) => (ctx ? String(s ?? "").replace(TAGS, (m, k) => ctx[k] ?? m) : String(s ?? ""));
  const needsMissing = (s, ctx) => ctx && [...String(s ?? "").matchAll(TAGS)].some((m) => !ctx[m[1]]);
  const unnamed = (s) =>
    String(s ?? "")
      .replace(/\b(?:Hi|Hello|Hey) \{first_name\}[,!]?\s*(\p{Ll})?/gu, (_, c) => (c ? c.toUpperCase() : ""))
      .replace(/,? \{first_name\}(?=[\s.,!?]|$)/g, "");
  function personal(b, ctx) {
    if (!ctx) return b;
    if (!ctx.first_name) b = Object.fromEntries(Object.entries(b).map(([k, v]) => [k, typeof v === "string" ? unnamed(v) : v]));
    const out = { ...b };
    for (const k of ["text", "label", "href", "alt"]) if (out[k] != null) out[k] = fillTags(out[k], ctx);
    if (b.type === "text") out.text = String(b.text || "").split(/\n{2,}/).filter((p) => !needsMissing(p, ctx)).map((p) => fillTags(p, ctx)).join("\n\n");
    if ((b.type === "heading" || b.type === "button") && [b.text, b.label, b.href].some((v) => needsMissing(v, ctx))) return null;
    return out;
  }

  // The reader's coffees: what's in their cart, or what they bought.
  function itemsHtml(ctx) {
    const items = ctx?.items || [];
    return items
      .map(({ product: p, qty, variant }) => {
        const link = `${siteUrl}/products/${encodeURIComponent(p.id)}`;
        const photo = p.image && !/\.webp$/i.test(p.image) ? abs(p.image) : `${siteUrl}/assets/email-bag.png`;
        return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f2f2" style="margin:4px 0 12px;background:#f2f2f2;border-radius:12px"><tr>
        <td width="96" style="padding:12px 10px 12px 14px;vertical-align:middle"><a href="${link}"><img src="${esc(photo)}" alt="${esc(p.short || p.name)}" width="80" style="display:block;width:80px;height:auto;border:0"></a></td>
        <td style="padding:12px 14px 12px 0;vertical-align:middle">
          <p style="margin:0 0 4px;font:500 16px/1.3 ${FONT};color:${INK}"><a href="${link}" style="color:${INK};text-decoration:none">${esc(p.short || p.name)}</a></p>
          <p style="margin:0;font:400 13px/1.4 ${FONT};color:${MUTED}">${esc([variant, qty > 1 ? `× ${qty}` : ""].filter(Boolean).join(" "))}${p.notes ? ` · ${esc(p.notes)}` : ""}</p>
        </td></tr></table>`;
      })
      .join("");
  }

  function blockHtml(b, ctx) {
    if (b.type === "items") return itemsHtml(ctx) ? `<div style="margin:0 0 12px">${itemsHtml(ctx)}</div>` : "";
    if (b.type === "heading" && b.text) return `<h1 style="margin:0 0 14px;font:500 26px/1.2 ${FONT};color:${INK};letter-spacing:-0.01em">${esc(b.text)}</h1>`;
    if (b.type === "text") return paragraphs(b.text).map((p) => `<p style="margin:0 0 16px;font:400 16px/1.55 ${FONT};color:${INK}">${p}</p>`).join("");
    if (b.type === "image" && b.image) {
      const img = `<img src="${esc(imageUrl(b.image))}" alt="${esc(b.alt)}" width="536" style="display:block;width:100%;max-width:536px;height:auto;border:0;border-radius:4px">`;
      return `<div style="margin:4px 0 20px">${b.href ? `<a href="${esc(b.href)}">${img}</a>` : img}</div>`;
    }
    if (b.type === "button" && b.label && b.href) return emailButton(b.label, b.href); // title case, like the site's buttons
    if (b.type === "product") {
      const p = products().find((x) => x.id === b.product);
      if (!p) return "";
      const link = `${siteUrl}/products/${encodeURIComponent(p.id)}`;
      // A photo when the coffee has one (not WebP: Outlook can't show it); otherwise the kraft bag.
      const photo = p.image && !/\.webp$/i.test(p.image) ? abs(p.image) : `${siteUrl}/assets/email-bag.png`;
      const price = p.discount ? `<s style="color:${MUTED}">$${Number(p.regular).toFixed(2)}</s> $${Number(p.price).toFixed(2)}` : `$${Number(p.price).toFixed(2)}`;
      return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f2f2" style="margin:4px 0 20px;background:#f2f2f2;border-radius:12px"><tr>
        <td width="116" style="padding:16px 12px 16px 16px;vertical-align:middle"><a href="${link}"><img src="${esc(photo)}" alt="${esc(p.short || p.name)}" width="100" style="display:block;width:100px;height:auto;border:0"></a></td>
        <td style="padding:16px 16px 16px 0;vertical-align:middle">
          <p style="margin:0 0 4px;font:400 13px/1.4 ${FONT};color:${MUTED}">${esc(p.type)} roast${p.region ? ` · ${esc(p.region)}` : ""}</p>
          <p style="margin:0 0 6px;font:500 18px/1.3 ${FONT};color:${INK}">${esc(p.short || p.name)}</p>
          ${p.notes ? `<p style="margin:0 0 10px;font:400 14px/1.45 ${FONT};color:${MUTED}">${esc(p.notes)}</p>` : ""}
          <p style="margin:0 0 12px;font:400 15px/1.4 ${FONT};color:${INK}">${price}</p>
          <a href="${link}" style="font:500 14px/1 ${FONT};color:${BLUE};text-decoration:underline">Shop this coffee</a>
        </td></tr></table>`;
    }
    if (b.type === "divider") return `<hr style="margin:8px 0 24px;border:0;border-top:1px solid #e4e4e4">`;
    return "";
  }

  function blockText(b, ctx) {
    if (b.type === "items") return (ctx?.items || []).map(({ product: p, variant, qty }) => `${p.short || p.name} (${variant}${qty > 1 ? ` × ${qty}` : ""}): ${siteUrl}/products/${encodeURIComponent(p.id)}\n`).join("");
    if (b.type === "heading") return b.text ? `${b.text}\n` : "";
    if (b.type === "text") return b.text ? `${b.text.replace(/\*\*/g, "")}\n` : "";
    if (b.type === "image") return b.href ? `${b.alt || "Image"}: ${b.href}\n` : "";
    if (b.type === "button") return b.label && b.href ? `${b.label}: ${b.href}\n` : "";
    if (b.type === "product") {
      const p = products().find((x) => x.id === b.product);
      return p ? `${p.short || p.name}, $${Number(p.price).toFixed(2)}: ${siteUrl}/products/${encodeURIComponent(p.id)}\n` : "";
    }
    return b.type === "divider" ? "—\n" : "";
  }

  // The email for one reader (unsubscribeUrl is theirs) or a preview (a placeholder link).
  // context: the reader's details for an automated email (see personal()); reason: why they get it.
  function render(c, { unsubscribeUrl = `${siteUrl}/api/newsletter/unsubscribe`, mailingAddress = "", context = null, reason = `you signed up for ${siteName} emails` } = {}) {
    const blocks = c.blocks.map((b) => personal(b, context)).filter(Boolean);
    const address = mailingAddress ? esc(mailingAddress).replace(/\n/g, "<br>") : `<span style="color:#c0392b">Add your mailing address in the back office before sending.</span>`;
    const html = emailPage({
      siteUrl,
      siteName,
      title: fillTags(c.subject, context),
      preheader: fillTags(c.preheader || "", context),
      body: blocks.map((b) => blockHtml(b, context)).join("\n"),
      footer: [
        footLine(`You're getting this because ${esc(reason)}.`),
        footLine(`<a href="${esc(unsubscribeUrl)}" style="color:${MUTED};text-decoration:underline">Unsubscribe</a> · <a href="${siteUrl}/" style="color:${MUTED};text-decoration:underline">${esc(siteName)}</a>`),
        footLine(address, true),
      ].join("\n"),
    });
    const text = `${blocks.map((b) => blockText(b, context)).filter(Boolean).join("\n")}\n—\nYou're getting this because ${reason}.\nUnsubscribe: ${unsubscribeUrl}\n${mailingAddress}\n`;
    return { html, text };
  }

  /* ── Sending ── */

  // Starts (or carries on) sending: a background loop, 100 readers per request, saving its place
  // after each one so a restart picks up where it stopped. recipients() gives the current list.
  let running = null;
  // `stillWanted(r)`: false once someone unsubscribes while it's going out (or before a resumed send).
  async function startSending(id, { recipients, deliver, mailingAddress, unsubscribeLink, stillWanted = () => true, pause = 600 }: { recipients: any; deliver: any; mailingAddress: any; unsubscribeLink: any; stillWanted?: (r: any) => boolean; pause?: number }) {
    const c = find(id);
    if (!c) throw new NewsletterError("Newsletter not found.", 404);
    if (c.status === "draft") {
      if (!c.subject) throw new NewsletterError("Give the newsletter a subject first.");
      if (!c.blocks.some((b) => blockHtml(b, null))) throw new NewsletterError("The newsletter is empty.");
      if (!mailingAddress) throw new NewsletterError("Add your business mailing address first. The law requires it in every newsletter.");
      const list = recipients();
      if (!list.length) throw new NewsletterError("There are no confirmed subscribers yet.");
      Object.assign(c, { status: "sending", queue: list, done: 0, sent: 0, failed: 0, startedAt: now(), mailingAddress });
      await save();
    }
    if (c.status !== "sending" || running) return c;
    running = (async () => {
      try {
        while (c.done < c.queue.length) {
          const slice = c.queue.slice(c.done, c.done + 100);
          const batch = slice.filter(stillWanted);
          const emails = batch.map((r) => {
            const url = unsubscribeLink(r);
            const { html, text } = render(c, { unsubscribeUrl: url, mailingAddress: c.mailingAddress });
            return { to: [r.email], subject: c.subject, html, text, headers: { "List-Unsubscribe": `<${url}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" } };
          });
          try {
            if (emails.length) await deliver(emails);
            c.sent += batch.length;
          } catch (error) {
            console.error(`[newsletter] batch ${c.done}-${c.done + batch.length} failed:`, error.message);
            c.failed += batch.length;
            c.error = error.message.slice(0, 300);
          }
          c.done += slice.length;
          await save();
          if (c.done < c.queue.length) await new Promise((r) => setTimeout(r, pause)); // Resend: a couple of requests a second
        }
        c.status = "sent";
        c.sentAt = now();
        c.recipients = c.queue.length;
        delete c.queue; // the list of addresses isn't kept once sent
        await save();
        console.log(`[newsletter] "${c.subject}" sent to ${c.sent} of ${c.recipients}${c.failed ? `, ${c.failed} failed` : ""}`);
      } finally {
        running = null;
        // One goes out at a time: another sent meanwhile was left waiting, so it starts now.
        const next = db.campaigns.find((x) => x.status === "sending" && x.id !== c.id);
        if (next) startSending(next.id, { recipients, deliver, mailingAddress, unsubscribeLink, stillWanted, pause }).catch((error) => console.error("[newsletter] next:", error.message));
      }
    })();
    return c;
  }

  const summary = (c) => ({
    id: c.id,
    status: c.status,
    subject: c.subject,
    preheader: c.preheader,
    blocks: c.blocks,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    startedAt: c.startedAt || null,
    sentAt: c.sentAt || null,
    recipients: c.recipients ?? c.queue?.length ?? null,
    done: c.done ?? null,
    sent: c.sent ?? null,
    failed: c.failed ?? null,
    error: c.error || null,
  });

  // The editor's unsaved state, cleaned the same way, for the live preview.
  const previewOf = (draft, blocks) => ({ ...draft, blocks: (Array.isArray(blocks) ? blocks.slice(0, MAX_BLOCKS) : []).map(cleanBlock) });

  return {
    previewOf,
    list: () => [...db.campaigns].sort((a, b) => (b.sentAt || b.updatedAt).localeCompare(a.sentAt || a.updatedAt)).map(summary),
    get: (id) => (find(id) ? summary(find(id)) : null),
    raw: find,
    create,
    update,
    remove,
    addImage,
    image,
    render,
    cleanBlocks: (blocks) => (Array.isArray(blocks) ? blocks.slice(0, MAX_BLOCKS) : []).map(cleanBlock),
    fillTags,
    startSending,
    sendingIds: () => db.campaigns.filter((c) => c.status === "sending").map((c) => c.id),
  };
}
