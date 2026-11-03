// Numeral, the blog: posts written in the back office (brewing guides, new coffees, visits to
// producers), published at /numeral/<slug> as plain HTML that search engines read in full.
//
// A note's body is written in a small, safe subset of Markdown:
//   ## Heading / ### Smaller heading      - item / 1. item      > quote
//   **bold**  *italic*  [link text](https://… or page.html)
//   ![Describe the photo](image)          on its own line: a photo
//   {coffee:<product id>}                 on its own line: that coffee, with its price and a link
//   | Head | Head |  then  | --- | --- |  then rows: a table
//   {tea:<id>} {teas} {tea-types} {cultivars} {tea-map} {coffee-map} {roast-chart}
//                                          on its own line: an interactive piece (server/noteblocks.js)
//   ## … FAQ, then ### Question + answer    a FAQ: each question opens and closes like the site's
//                                          FAQ page (and Google reads them as FAQ structured data)

import { randomBytes } from "node:crypto";

export class NoteError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export const NOTE_PARTS = { posts: (p) => p.id };

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const clip = (s, n) => String(s ?? "").trim().slice(0, n);

export const slugify = (s) =>
  String(s || "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");

// Links: the web, email, or a page of this site.
const safeHref = (u) => (/^(https?:\/\/|mailto:)/i.test(u) || /^\/(?!\/)/.test(u) || /^[\w-]+(\.html)?([?#][^\s"]*)?$/.test(u) ? u : "");
// Photos: uploaded in the back office (/media/…), the site's own, or https.
export const imageSrc = (img) => {
  const v = String(img || "").trim();
  if (/^https:\/\//i.test(v) || /^\/(media|assets)\/[\w.-]+$/.test(v)) return v;
  return /^[\w-]+\.(jpe?g|png|webp)$/i.test(v) ? `/media/${v}` : "";
};

function inline(text, siteUrl) {
  return esc(text)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, label, url) => {
      const href = safeHref(url.replace(/&amp;/g, "&"));
      if (!href) return label;
      const away = /^https?:/i.test(href) && !href.startsWith(siteUrl);
      return `<a href="${esc(href)}"${away ? ' rel="noopener" target="_blank"' : ""}>${label}</a>`;
    })
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*\w])\*(?!\s)(.+?)\*(?!\w)/g, "$1<em>$2</em>");
}

// The body as HTML. `coffee(id)` returns a shop coffee (or nothing, when it's gone).
// A "## … FAQ" (or "Frequently asked questions") heading starts a FAQ section, to the next "##".
const isFaqHeading = (t) => /\bFAQs?\b|frequently asked/i.test(t);

export function renderBody(md, { siteUrl = "", coffee = () => null, money = (n) => `$${n.toFixed(2)}`, block = () => null }: { siteUrl?: string; coffee?: (id: string) => any; money?: (n: number) => string; block?: (name: string, arg?: string) => any } = {}) {
  const out = [];
  let table = null; // rows of cells, the header first
  let faq = false; // inside a FAQ section
  let question = false; // a question's answer is open
  const closeQuestion = () => {
    if (question) out.push("</div></details>");
    question = false;
  };
  const closeFaq = () => {
    closeQuestion();
    if (faq) out.push("</div>");
    faq = false;
  };
  let para = [];
  let list = null; // { tag, items }
  let quote = [];
  const cells = (line) => line.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const flush = () => {
    if (table) {
      const [head, ...rows] = table;
      // On a phone each row stacks, its cells labeled with their column (two side by side at most).
      const label = (i) => esc(String(head[i] || "").replace(/[*_`[\]]|\(.*?\)/g, ""));
      out.push(`<div class="note-table" style="--cols:${head.length === 3 ? 2 : 1}"><table><thead><tr>${head.map((c) => `<th scope="col">${inline(c, siteUrl)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i ? `<td data-label="${label(i)}">${inline(c, siteUrl)}</td>` : `<th scope="row">${inline(c, siteUrl)}</th>`)).join("")}</tr>`).join("")}</tbody></table></div>`);
      table = null;
    }
    if (para.length) out.push(`<p>${inline(para.join(" "), siteUrl)}</p>`);
    if (list) out.push(`<${list.tag}>${list.items.map((i) => `<li>${inline(i, siteUrl)}</li>`).join("")}</${list.tag}>`);
    if (quote.length) out.push(`<blockquote><p>${inline(quote.join(" "), siteUrl)}</p></blockquote>`);
    para = [];
    list = null;
    quote = [];
  };
  for (const raw of String(md || "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    let m;
    if (/^\|.*\|$/.test(line)) {
      if (!table) flush();
      if (!/^\|[\s:|-]+\|$/.test(line)) (table ||= []).push(cells(line)); // the | --- | line is skipped
      continue;
    }
    if (table) flush();
    if (!line) {
      flush();
    } else if ((m = /^(#{1,3})\s+(.+)$/.exec(line))) {
      flush();
      const tag = m[1].length === 3 ? "h3" : "h2"; // the note's title is the page's only h1
      if (faq && tag === "h3") {
        closeQuestion();
        out.push(`<details class="faq-item" id="${esc(slugify(m[2]))}"><summary><span>${inline(m[2], siteUrl)}</span><i aria-hidden="true"></i></summary><div class="faq-answer">`);
        question = true;
        continue;
      }
      closeFaq();
      out.push(`<${tag} id="${esc(slugify(m[2]))}">${inline(m[2], siteUrl)}</${tag}>`);
      if (tag === "h2" && isFaqHeading(m[2])) {
        out.push(`<div class="faq-list note-faq">`);
        faq = true;
      }
    } else if ((m = /^!\[([^\]]*)\]\(([^)\s]+)\)$/.exec(line))) {
      flush();
      const src = imageSrc(m[2]);
      if (src) out.push(`<figure class="note-figure"><img src="${esc(src)}" alt="${esc(m[1])}" loading="lazy"></figure>`);
    } else if ((m = /^\{coffee:([\w-]{1,80})\}$/.exec(line))) {
      flush();
      const p = coffee(m[1]);
      if (p) {
        out.push(
          // The bag art is drawn in the browser by the shop's own code (js/app.js), as in the shop;
          // a product photo, when there is one, is here already.
          `<a class="note-coffee" data-coffee="${esc(p.id)}" href="products/${encodeURIComponent(p.id)}"><span class="note-coffee-art product-image" aria-hidden="true">${p.image ? `<span class="photo-art"><img class="product-photo" src="${esc(p.image)}" alt="" loading="lazy"></span>` : ""}</span><span><strong>${esc(p.name)}</strong>${p.notes ? `<small>${esc(p.notes)}</small>` : ""}<span>${p.soldOut ? "Sold out" : `From ${esc(money(p.price))}`}</span></span></a>`
        );
      }
    } else if ((m = /^\{([\w-]+)(?::([\w-]+))?\}$/.exec(line)) && m[1] !== "coffee") {
      flush();
      const html = block(m[1], m[2]);
      if (html) out.push(html);
    } else if ((m = /^[-*]\s+(.+)$/.exec(line)) || (m = /^\d+[.)]\s+(.+)$/.exec(line))) {
      const tag = /^\d/.test(line) ? "ol" : "ul";
      if (para.length || quote.length || (list && list.tag !== tag)) flush();
      list ||= { tag, items: [] };
      list.items.push(m[1]);
    } else if ((m = /^>\s?(.*)$/.exec(line))) {
      if (para.length || list) flush();
      quote.push(m[1]);
    } else {
      if (list || quote.length) flush();
      para.push(line);
    }
  }
  flush();
  closeFaq();
  return out.join("\n");
}

// The FAQ's questions and answers (plain text), for FAQPage structured data.
export function faqOf(md) {
  const items = [];
  let faq = false;
  let cur = null;
  for (const raw of String(md || "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const m = /^(#{2,3})\s+(.+)$/.exec(line);
    if (m && m[1] === "##") {
      faq = isFaqHeading(m[2]);
      cur = null;
    } else if (m && faq) items.push((cur = { q: plainText(m[2]), a: "" }));
    else if (cur && line) cur.a = `${cur.a} ${plainText(line)}`.trim();
  }
  return items.filter((x) => x.q && x.a);
}

// Plain words of the body, for reading time and a description when none is written.
export const plainText = (md) =>
  String(md || "")
    .replace(/^!\[[^\]]*\]\([^)]*\)$/gm, "")
    .replace(/^\{[\w-]+(?::[\w-]+)?\}$/gm, "")
    .replace(/^\|[\s:|-]+\|$/gm, "")
    .replace(/\|/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^(#{1,3}|[-*]|\d+[.)]|>)\s+/gm, "")
    .replace(/\*+/g, "")
    .replace(/\s+/g, " ")
    .trim();

export const readingMinutes = (md) => Math.max(1, Math.round(plainText(md).split(" ").filter(Boolean).length / 220));

export function createNotes({ store }) {
  const db = store.data;
  const save = () => store.save();
  const now = () => new Date().toISOString();
  const find = (id) => db.posts.find((p) => p.id === id);
  const isLive = (p) => p.status === "published";

  // A slug no other note uses (now or before).
  function freeSlug(base, self) {
    const root = slugify(base) || "note";
    let slug = root;
    for (let n = 2; db.posts.some((p) => p !== self && (p.slug === slug || (p.oldSlugs || []).includes(slug))); n++) slug = `${root}-${n}`;
    return slug;
  }

  function apply(p, input) {
    if (input.title !== undefined) p.title = clip(input.title, 120);
    if (input.description !== undefined) p.description = clip(input.description, 300);
    if (input.body !== undefined) p.body = String(input.body ?? "").slice(0, 60000);
    if (input.image !== undefined) p.image = imageSrc(input.image) ? clip(input.image, 300) : "";
    if (input.imageAlt !== undefined) p.imageAlt = clip(input.imageAlt, 200);
    // The address follows the title until it's set by hand or the note is published.
    if (input.slug !== undefined) p.slugSet = Boolean(slugify(input.slug));
    const wanted = p.slugSet ? slugify(input.slug ?? p.slug) : p.publishedAt ? "" : slugify(p.title);
    if (wanted && wanted !== p.slug) {
      const next = freeSlug(wanted, p);
      // A published note keeps its old address working (it may be linked or indexed).
      if (p.slug && p.publishedAt) p.oldSlugs = [...new Set([...(p.oldSlugs || []), p.slug])].filter((s) => s !== next).slice(-10);
      p.slug = next;
    }
    if (input.status !== undefined) {
      const live = input.status === "published";
      if (live && !p.title.trim()) throw new NoteError("Give the post a title before publishing it.");
      if (live && !plainText(p.body)) throw new NoteError("Write the post before publishing it.");
      if (live && !p.publishedAt) p.publishedAt = now();
      p.status = live ? "published" : "draft";
    }
    p.updatedAt = now();
  }

  return {
    list: () => [...db.posts].sort((a, b) => (b.publishedAt || b.updatedAt).localeCompare(a.publishedAt || a.updatedAt)),
    published: () => db.posts.filter(isLive).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
    get(id) {
      const p = find(id);
      if (!p) throw new NoteError("Post not found.", 404);
      return p;
    },
    // { note } at its address, or { moved: slug } for an older address of a published note.
    bySlug(slug) {
      const p = db.posts.find((x) => isLive(x) && x.slug === slug);
      if (p) return { note: p };
      const old = db.posts.find((x) => isLive(x) && (x.oldSlugs || []).includes(slug));
      return old ? { moved: old.slug } : {};
    },
    // `publishedAt` (an ISO date) is for posts that ship with the site, published as of that day.
    async create(input: any = {}, { publishedAt }: { publishedAt?: any } = {}) {
      const p = { id: `note-${randomBytes(5).toString("hex")}`, status: "draft", title: "", slug: "", description: "", body: "", image: "", imageAlt: "", createdAt: now(), updatedAt: now(), publishedAt: null };
      // A bare date ("2026-10-15") means midday UTC, the same calendar day in the US and Asia.
      const when = /^\d{4}-\d{2}-\d{2}$/.test(publishedAt || "") ? `${publishedAt}T12:00:00Z` : publishedAt;
      if (when && !Number.isNaN(Date.parse(when))) p.publishedAt = new Date(when).toISOString();
      apply(p, { title: "", ...input });
      db.posts.push(p);
      await save();
      return p;
    },
    async update(id, input) {
      const p = this.get(id);
      apply(p, input || {});
      await save();
      return p;
    },
    async remove(id) {
      this.get(id);
      db.posts = db.posts.filter((p) => p.id !== id);
      await save();
    },
  };
}
