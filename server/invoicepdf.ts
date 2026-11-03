// A wholesale invoice as a real PDF file (Download PDF in the portal and the back office), drawn
// here so it's the same file in every browser, with no browser header or footer lines.
//
// - Letter size, in the PDF's built-in Helvetica (no font files to embed); text is set in the
//   WinAnsi encoding, so accented letters, curly quotes, dashes and · print as themselves.
// - The letterhead (the logo, our name, address and email), the invoice's number and where it
//   stands, a band with what's due and when, who it's billed and delivered to, the lines (they
//   carry on to more pages, under the column heads again), the totals, how to pay (the link is
//   clickable) and our details with the page number at the foot of every page.
// - The logo comes in as RGBA pixels (server.ts renders assets/logo.svg once with sharp).

import { deflateSync } from "node:zlib";

// Helvetica's character widths (per 1000 units), for the printable ASCII range 32–126.
const W_REG = [278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584];
const W_BOLD = [278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584];
// Characters outside Latin-1 that WinAnsi has, and their codes.
const WIN = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97, "™": 0x99, "−": 0x96 };
const W_EXTRA = { 0x80: 556, 0x82: 222, 0x84: 333, 0x85: 1000, 0x91: 222, 0x92: 222, 0x93: 333, 0x94: 333, 0x95: 350, 0x96: 556, 0x97: 1000, 0x99: 1000, 0xb7: 278, 0xa0: 278 };

// Text as WinAnsi bytes; anything it can't show becomes its plain letter, or "?".
function encode(s: string): number[] {
  const out: number[] = [];
  for (const ch of String(s ?? "")) {
    const c = ch.codePointAt(0)!;
    if (c >= 32 && c <= 126) out.push(c);
    else if (WIN[ch]) out.push(WIN[ch]);
    else if (c >= 0xa0 && c <= 0xff) out.push(c);
    else if (ch === "\n" || ch === "\t") out.push(32);
    else {
      const base = ch.normalize("NFD")[0];
      out.push(base && base.charCodeAt(0) < 127 && base.charCodeAt(0) >= 32 ? base.charCodeAt(0) : 63);
    }
  }
  return out;
}
const charWidth = (c: number, bold: boolean) => {
  if (c >= 32 && c <= 126) return (bold ? W_BOLD : W_REG)[c - 32];
  if (W_EXTRA[c]) return W_EXTRA[c];
  // Accented letters: about their plain letter's width.
  const base = String.fromCharCode(c).normalize("NFD").charCodeAt(0);
  return base >= 32 && base <= 126 ? (bold ? W_BOLD : W_REG)[base - 32] : 556;
};
export const textWidth = (s: string, size: number, bold = false) => (encode(s).reduce((n, c) => n + charWidth(c, bold), 0) * size) / 1000;
const pdfString = (s: string) =>
  "(" +
  encode(s)
    .map((c) => (c === 40 || c === 41 || c === 92 ? `\\${String.fromCharCode(c)}` : c < 32 || c > 126 ? `\\${c.toString(8).padStart(3, "0")}` : String.fromCharCode(c)))
    .join("") +
  ")";

// Breaks text into lines that fit a width (long words are cut).
function wrap(s: string, width: number, size: number, bold = false): string[] {
  const lines: string[] = [];
  for (const para of String(s ?? "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (textWidth(next, size, bold) <= width) line = next;
      else {
        if (line) lines.push(line);
        let w = word;
        while (textWidth(w, size, bold) > width && w.length > 1) {
          let cut = w.length - 1;
          while (cut > 1 && textWidth(w.slice(0, cut), size, bold) > width) cut--;
          lines.push(w.slice(0, cut));
          w = w.slice(cut);
        }
        line = w;
      }
    }
    lines.push(line);
  }
  return lines;
}

type Color = [number, number, number];
const hex = (h: string): Color => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255];
const INK = hex("#111111");
const MUTED = hex("#6b6b6b");
const RULE = hex("#d9d9d9");
const FILL = hex("#f4f4f2");
const n2 = (v: number) => (Math.round(v * 100) / 100).toString();

// One page's drawing, top-left origin (y grows down), turned into PDF operators.
class Page {
  ops: string[] = [];
  links: { x: number; y: number; w: number; h: number; url: string }[] = [];
  h: number;
  constructor(h: number) {
    this.h = h;
  }
  color(c: Color, stroke = false) {
    this.ops.push(`${c.map(n2).join(" ")} ${stroke ? "RG" : "rg"}`);
  }
  text(x: number, y: number, s: string, { size = 10, bold = false, color = INK, align = "left" }: { size?: number; bold?: boolean; color?: Color; align?: "left" | "right" | "center" } = {}) {
    if (!s) return;
    const w = textWidth(s, size, bold);
    const left = align === "right" ? x - w : align === "center" ? x - w / 2 : x;
    this.color(color);
    this.ops.push(`BT /${bold ? "F2" : "F1"} ${n2(size)} Tf ${n2(left)} ${n2(this.h - y)} Td ${pdfString(s)} Tj ET`);
  }
  rect(x: number, y: number, w: number, h: number, fill: Color) {
    this.color(fill);
    this.ops.push(`${n2(x)} ${n2(this.h - y - h)} ${n2(w)} ${n2(h)} re f`);
  }
  line(x1: number, y1: number, x2: number, y2: number, { width = 0.5, color = RULE }: { width?: number; color?: Color } = {}) {
    this.color(color, true);
    this.ops.push(`${n2(width)} w ${n2(x1)} ${n2(this.h - y1)} m ${n2(x2)} ${n2(this.h - y2)} l S`);
  }
  // A rectangle with round corners, outlined or filled.
  round(x: number, y: number, w: number, h: number, r: number, { stroke, fill, width = 0.8 }: { stroke?: Color; fill?: Color; width?: number }) {
    const k = r * 0.5523;
    const [X, Y] = [x, this.h - y - h];
    const p = [
      `${n2(X + r)} ${n2(Y)} m`,
      `${n2(X + w - r)} ${n2(Y)} l`,
      `${n2(X + w - r + k)} ${n2(Y)} ${n2(X + w)} ${n2(Y + r - k)} ${n2(X + w)} ${n2(Y + r)} c`,
      `${n2(X + w)} ${n2(Y + h - r)} l`,
      `${n2(X + w)} ${n2(Y + h - r + k)} ${n2(X + w - r + k)} ${n2(Y + h)} ${n2(X + w - r)} ${n2(Y + h)} c`,
      `${n2(X + r)} ${n2(Y + h)} l`,
      `${n2(X + r - k)} ${n2(Y + h)} ${n2(X)} ${n2(Y + h - r + k)} ${n2(X)} ${n2(Y + h - r)} c`,
      `${n2(X)} ${n2(Y + r)} l`,
      `${n2(X)} ${n2(Y + r - k)} ${n2(X + r - k)} ${n2(Y)} ${n2(X + r)} ${n2(Y)} c`,
    ].join(" ");
    if (fill) this.color(fill);
    if (stroke) this.color(stroke, true);
    this.ops.push(`${n2(width)} w ${p} ${fill && stroke ? "B" : fill ? "f" : "S"}`);
  }
  image(x: number, y: number, w: number, h: number, name = "Logo") {
    this.ops.push(`q ${n2(w)} 0 0 ${n2(h)} ${n2(x)} ${n2(this.h - y - h)} cm /${name} Do Q`);
  }
  link(x: number, y: number, w: number, h: number, url: string) {
    this.links.push({ x, y, w, h, url });
  }
}

// The file: objects, the pages (with their links), the fonts and the logo, and the index.
type Pixels = { width: number; height: number; rgba: Buffer };
function build(pages: Page[], W: number, H: number, logo: Pixels | null, title: string, more: Record<string, Pixels> = {}): Buffer {
  const objs: (string | Buffer)[] = [];
  const add = (o: string | Buffer) => (objs.push(o), objs.length);
  const stream = (dict: string, data: Buffer) => Buffer.concat([Buffer.from(`<< ${dict} /Length ${data.length} >>\nstream\n`, "latin1"), data, Buffer.from("\nendstream", "latin1")]);
  const catalog = add("");
  const pagesId = add("");
  const f1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  const f2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  // Each image as RGB with its alpha as a soft mask: the logo, and any others (a signature).
  const addImage = (img: Pixels) => {
    const px = img.width * img.height;
    const rgb = Buffer.alloc(px * 3);
    const alpha = Buffer.alloc(px);
    for (let i = 0; i < px; i++) {
      rgb[i * 3] = img.rgba[i * 4];
      rgb[i * 3 + 1] = img.rgba[i * 4 + 1];
      rgb[i * 3 + 2] = img.rgba[i * 4 + 2];
      alpha[i] = img.rgba[i * 4 + 3];
    }
    const mask = add(stream(`/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter /FlateDecode`, deflateSync(alpha)));
    return add(stream(`/Type /XObject /Subtype /Image /Width ${img.width} /Height ${img.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /SMask ${mask} 0 R /Filter /FlateDecode`, deflateSync(rgb)));
  };
  const xobjects: Record<string, number> = {};
  if (logo) xobjects.Logo = addImage(logo);
  for (const [name, img] of Object.entries(more)) if (img) xobjects[name] = addImage(img);
  const xo = Object.keys(xobjects).length ? ` /XObject << ${Object.entries(xobjects).map(([k, id]) => `/${k} ${id} 0 R`).join(" ")} >>` : "";
  const kids: number[] = [];
  for (const p of pages) {
    const content = add(stream("/Filter /FlateDecode", deflateSync(Buffer.from(p.ops.join("\n"), "latin1"))));
    const annots = p.links.map((l) => add(`<< /Type /Annot /Subtype /Link /Rect [${n2(l.x)} ${n2(H - l.y - l.h)} ${n2(l.x + l.w)} ${n2(H - l.y)}] /Border [0 0 0] /A << /S /URI /URI ${pdfString(l.url)} >> >>`));
    kids.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 ${f1} 0 R /F2 ${f2} 0 R >>${xo} >> /Contents ${content} 0 R${annots.length ? ` /Annots [${annots.map((a) => `${a} 0 R`).join(" ")}]` : ""} >>`));
  }
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objs[pagesId - 1] = `<< /Type /Pages /Kids [${kids.map((k) => `${k} 0 R`).join(" ")}] /Count ${kids.length} >>`;
  const info = add(`<< /Title ${pdfString(title)} /Producer (Mimi Food) /CreationDate (D:${new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)}Z) >>`);
  const parts: Buffer[] = [Buffer.from("%PDF-1.4\n%\xe2\xe3\xcf\xd3\n", "latin1")];
  const offsets: number[] = [];
  let at = parts[0].length;
  objs.forEach((o, i) => {
    const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, "latin1"), typeof o === "string" ? Buffer.from(o, "latin1") : o, Buffer.from("\nendobj\n", "latin1")]);
    offsets.push(at);
    parts.push(b);
    at += b.length;
  });
  const xref = [`xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`, ...offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`)].join("");
  parts.push(Buffer.from(`${xref}trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R /Info ${info} 0 R >>\nstartxref\n${at}\n%%EOF\n`, "latin1"));
  return Buffer.concat(parts);
}

const money = (n: number) => `${n < 0 ? "–" : ""}$${Math.abs(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const longDate = (iso: string) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

type InvoiceInput = {
  site: { name: string; email: string; address: string[] };
  account: { business: string; contactName?: string; email?: string; address?: { street?: string; city?: string; state?: string; postcode?: string } };
  order: any; // tradeOrderView (server.ts)
  today: string; // the shop's date, YYYY-MM-DD
  payLink: string;
  logo?: { width: number; height: number; rgba: Buffer } | null;
};

export function invoicePdf({ site, account: a, order: o, today, payLink, logo = null }: InvoiceInput): Buffer {
  const W = 612;
  const H = 792;
  const M = 54; // side margin
  const R = W - M;
  const FOOT = H - 46; // the footer's line
  const due = !["paid", "cancelled", "refunded"].includes(o.state);
  const overdue = due && o.dueDate && o.dueDate < today;
  const [stampLabel, stampColor] =
    o.state === "paid" ? ["PAID", hex("#1f7a4d")] : o.state === "cancelled" ? ["CANCELLED", MUTED] : o.state === "refunded" ? ["REFUNDED", MUTED] : overdue ? ["OVERDUE", hex("#b42318")] : ["DUE", hex("#a15c07")];
  const pickup = o.fulfilment === "Pickup";
  const sizeName = (l) => l.variant || (l.size === "tin" ? "Pack" : l.size || "");
  const pages: Page[] = [];
  let p: Page;
  let y = 0;

  // The columns of the lines table: Item, Size, Qty, Unit price, Amount.
  const COL = { item: M + 10, size: M + 262, qty: M + 372, unit: M + 440, amount: R - 10 };
  const ITEM_W = COL.size - COL.item - 14;
  const SIZE_W = COL.qty - 26 - COL.size;
  const tableHead = () => {
    p.rect(M, y, R - M, 24, FILL);
    const ty = y + 15.5;
    p.text(COL.item, ty, "Item", { size: 8, bold: true, color: MUTED });
    p.text(COL.size, ty, "Size", { size: 8, bold: true, color: MUTED });
    p.text(COL.qty, ty, "Qty", { size: 8, bold: true, color: MUTED, align: "right" });
    p.text(COL.unit, ty, "Unit price", { size: 8, bold: true, color: MUTED, align: "right" });
    p.text(COL.amount, ty, "Amount", { size: 8, bold: true, color: MUTED, align: "right" });
    y += 24;
  };
  const newPage = (first = false) => {
    p = new Page(H);
    pages.push(p);
    y = 48;
    if (first) return;
    // Later pages: a short head (who and which invoice), then the column heads again.
    p.text(M, y + 10, site.name, { size: 10, bold: true });
    p.text(R, y + 10, `Invoice ${o.number} (continued)`, { size: 9, color: MUTED, align: "right" });
    y += 22;
    p.line(M, y, R, y, { width: 1.2, color: INK });
    y += 18;
    tableHead();
  };

  /* ── Page one: the letterhead ── */
  newPage(true);
  // A mark (round or square) sits beside our name; a wide wordmark already says it, so the
  // address goes under it instead.
  const wide = logo && logo.width / logo.height > 2;
  if (wide) {
    const lw = Math.min(200, (logo.width / logo.height) * 34);
    p.image(M, y, lw, (logo.height / logo.width) * lw);
    site.address.concat(site.email).forEach((line, i) => p.text(M, y + 50 + i * 12.5, line, { size: 8.5, color: MUTED }));
  } else {
    let bx = M;
    if (logo) {
      const lh = 44;
      const lw = (logo.width / logo.height) * lh;
      p.image(M, y, lw, lh);
      bx = M + lw + 14;
    }
    p.text(bx, y + 14, site.name, { size: 15, bold: true, color: INK });
    site.address.concat(site.email).forEach((line, i) => p.text(bx, y + 30 + i * 12.5, line, { size: 8.5, color: MUTED }));
  }
  p.text(R, y + 24, "Invoice", { size: 26, bold: true, align: "right" });
  p.text(R, y + 42, o.number, { size: 10, color: MUTED, align: "right" });
  const sw = textWidth(stampLabel, 7.5, true) + 16;
  p.round(R - sw, y + 50, sw, 16, 3, { stroke: stampColor, width: 0.9 });
  p.text(R - sw / 2, y + 61, stampLabel, { size: 7.5, bold: true, color: stampColor, align: "center" });
  y += wide ? 98 : 82;
  p.line(M, y, R, y, { width: 1.4, color: INK });
  y += 22;

  /* ── Who it's for, and the dates ── */
  const label = (x: number, yy: number, s: string) => p.text(x, yy, s.toUpperCase(), { size: 7, bold: true, color: MUTED });
  const block = (x: number, title: string, lines: string[], width: number) => {
    label(x, y, title);
    let yy = y + 15;
    for (const l of lines.filter(Boolean)) for (const w of wrap(l, width, 9.5)) (p.text(x, yy, w, { size: 9.5 }), (yy += 13));
    return yy;
  };
  const ad = a.address || {};
  const billEnd = block(M, "Bill to", [a.business, a.contactName || "", a.email || ""], 150);
  const shipEnd = block(M + 170, pickup ? "Pickup" : "Deliver to", pickup ? ["our office"] : ad.street ? [a.business, ad.street, `${ad.city}, ${ad.state} ${ad.postcode}`] : ["—"], 150);
  const facts = [
    ["Issued", longDate(o.placedAt)],
    ["Due", o.dueDate ? longDate(o.dueDate) : "On receipt"],
    ["Terms", o.terms ? `Net ${o.terms}` : "Due on receipt"],
    ...(o.poRef ? [["PO", o.poRef]] : []),
  ];
  facts.forEach(([k, v], i) => {
    p.text(R - 92, y + 6 + i * 15, k, { size: 9, color: MUTED });
    p.text(R, y + 6 + i * 15, v, { size: 9.5, bold: k === "Due" && due, align: "right", color: k === "Due" && overdue ? hex("#b42318") : INK });
  });
  y = Math.max(billEnd, shipEnd, y + 6 + facts.length * 15) + 14;

  /* ── What's due, at a glance ── */
  const amountDue = due ? o.total : 0;
  p.round(M, y, R - M, 44, 4, { fill: FILL });
  // The band: what's due and when; once paid, what was paid.
  const big = o.state === "paid" ? o.total : amountDue;
  p.text(M + 16, y + 27.5, money(big), { size: 18, bold: true });
  const dueLine = o.state === "paid" ? "Paid in full. Thank you." : o.state === "cancelled" ? "This invoice was cancelled." : o.state === "refunded" ? "This invoice was refunded." : o.dueDate ? `${overdue ? "Was due" : "Due"} ${longDate(o.dueDate)}` : "Due on receipt";
  p.text(M + 26 + textWidth(money(big), 18, true), y + 26.5, dueLine, { size: 10, color: overdue ? hex("#b42318") : MUTED });
  if (due) {
    const pw = textWidth("Pay Online", 9, true) + 24;
    p.round(R - 12 - pw, y + 11, pw, 22, 3, { fill: INK });
    p.text(R - 12 - pw / 2, y + 25.5, "Pay Online", { size: 9, bold: true, color: [1, 1, 1], align: "center" });
    p.link(R - 12 - pw, y + 11, pw, 22, payLink);
  }
  y += 44 + 24;

  /* ── The lines (onto more pages when they run long) ── */
  tableHead();
  for (const l of o.lines) {
    const titleLines = wrap(l.title, ITEM_W, 9.5);
    const sizeLines = wrap(sizeName(l), SIZE_W, 9);
    const rh = Math.max(titleLines.length, sizeLines.length) * 12.5 + 14;
    if (y + rh > FOOT - 20) newPage();
    titleLines.forEach((t, i) => p.text(COL.item, y + 16 + i * 12.5, t, { size: 9.5 }));
    sizeLines.forEach((t, i) => p.text(COL.size, y + 16 + i * 12.5, t, { size: 9, color: MUTED }));
    p.text(COL.qty, y + 16, String(l.qty), { size: 9.5, align: "right" });
    p.text(COL.unit, y + 16, money(l.price), { size: 9.5, align: "right" });
    p.text(COL.amount, y + 16, money(l.price * l.qty), { size: 9.5, align: "right" });
    y += rh;
    p.line(M, y, R, y);
  }

  /* ── Totals, and how to pay ── */
  const sums: [string, string, string?][] = [["Subtotal", money(o.subtotal ?? o.total)]];
  if (o.shipping) sums.push(["Delivery", money(o.shipping)]);
  if (o.credit) sums.push(["Account credit", money(-o.credit)]);
  sums.push(["Total", money(o.total), "total"]);
  if (o.state === "paid") sums.push(["Paid", money(-o.total)]);
  sums.push(["Amount due", money(amountDue), "due"]);
  const need = sums.length * 18 + 40;
  if (y + need > FOOT - 16) newPage();
  y += 18;
  const SX = M + 300;
  let sy = y;
  for (const [k, v, kind] of sums) {
    if (kind === "total") {
      p.line(SX, sy - 4, R, sy - 4, { color: INK, width: 0.8 });
      sy += 6;
    }
    if (kind === "due") {
      sy += 8;
      p.text(SX, sy + 6, k, { size: 12, bold: true });
      p.text(R, sy + 6, v, { size: 12, bold: true, align: "right" });
      sy += 22;
      continue;
    }
    p.text(SX, sy + 6, k, { size: 9.5, color: kind ? INK : MUTED, bold: kind === "total" });
    p.text(R, sy + 6, v, { size: 9.5, bold: kind === "total", align: "right" });
    sy += 18;
  }
  // Beside the totals: how to pay (the link opens the invoice to pay), or a thank you.
  label(M, y, due ? "How to pay" : o.state === "paid" ? "Paid" : "Note");
  let py = y + 16;
  const say = (s: string, opts = {}) => {
    for (const w of wrap(s, 260, 9)) (p.text(M, py, w, { size: 9, color: MUTED, ...opts }), (py += 12.5));
  };
  if (due) {
    say("Pay by card or bank transfer online:");
    const shown = payLink.replace(/^https?:\/\//, "");
    for (const w of wrap(shown, 260, 9)) {
      p.text(M, py, w, { size: 9, color: hex("#2f7a34") });
      p.link(M, py - 9, textWidth(w, 9), 12, payLink);
      py += 12.5;
    }
    py += 4;
    say(`Questions about this invoice? Write to ${site.email}.`);
  } else if (o.state === "paid") say("Thank you. This invoice is paid in full.");
  else say(o.state === "cancelled" ? "This invoice was cancelled. Nothing is owed." : "This invoice was refunded.");

  /* ── The foot of every page ── */
  pages.forEach((pg, i) => {
    pg.line(M, FOOT, R, FOOT);
    pg.text(M, FOOT + 15, `${site.name} · ${site.address.join(", ")} · ${site.email}`, { size: 7.5, color: MUTED });
    pg.text(R, FOOT + 15, pages.length > 1 ? `Page ${i + 1} of ${pages.length}` : "Thank you for your business.", { size: 7.5, color: MUTED, align: "right" });
  });

  return build(pages, W, H, logo, `${site.name} invoice ${o.number}`);
}

/* ── A signed (or waiting) wholesale agreement ── */

type AgreementInput = {
  site: { name: string; email: string; address: string[] };
  agreement: any; // server/contracts.ts
  zone: string;
  logo?: { width: number; height: number; rgba: Buffer } | null;
  signature?: { width: number; height: number; rgba: Buffer } | null; // drawn, or typed in a signature font
};

// A browser's description put plainly: "iPhone · Safari", "Mac · Chrome", "Windows · Edge".
export function deviceName(ua = "") {
  const u = String(ua);
  const dev = /iPhone/.test(u) ? "iPhone" : /iPad/.test(u) ? "iPad" : /Android/.test(u) ? "Android" : /Macintosh|Mac OS X/.test(u) ? "Mac" : /Windows/.test(u) ? "Windows" : /CrOS/.test(u) ? "Chromebook" : /Linux/.test(u) ? "Linux" : "";
  const app = /Edg\//.test(u) ? "Edge" : /OPR\/|Opera/.test(u) ? "Opera" : /Firefox\/|FxiOS/.test(u) ? "Firefox" : /CriOS|Chrome\//.test(u) ? "Chrome" : /Safari\//.test(u) ? "Safari" : "";
  return [dev, app].filter(Boolean).join(" · ") || (u ? "A web browser" : "");
}

// The agreement's text as it was sent, then the signature record: who signed (typed name, title,
// email), when, from where, and the document's ID, version and SHA-256 fingerprint.
export function agreementPdf({ site, agreement: a, zone, logo = null, signature = null }: AgreementInput): Buffer {
  const W = 612;
  const H = 792;
  const M = 54;
  const R = W - M;
  const FOOT = H - 46;
  const BOTTOM = FOOT - 24;
  const pages: Page[] = [];
  let p: Page;
  let y = 0;
  const when = (iso: string) => (iso ? `${new Date(iso).toLocaleString("en-US", { timeZone: zone, month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })}` : "");
  const newPage = (first = false) => {
    p = new Page(H);
    pages.push(p);
    y = 48;
    if (first) return;
    p.text(M, y + 10, site.name, { size: 10, bold: true });
    p.text(R, y + 10, `${a.title} (continued)`, { size: 9, color: MUTED, align: "right" });
    y += 22;
    p.line(M, y, R, y, { width: 1.2, color: INK });
    y += 22;
  };
  const room = (h: number) => {
    if (y + h > BOTTOM) newPage();
  };

  newPage(true);
  let bx = M;
  if (logo) {
    const lh = 44;
    const lw = Math.min(200, (logo.width / logo.height) * lh);
    p.image(M, y, lw, (logo.height / logo.width) * lw);
    bx = logo.width / logo.height > 2 ? M : M + lw + 14;
  }
  if (bx !== M || !logo) {
    p.text(bx, y + 14, site.name, { size: 15, bold: true });
    site.address.concat(site.email).forEach((line, i) => p.text(bx, y + 30 + i * 12.5, line, { size: 8.5, color: MUTED }));
  } else site.address.concat(site.email).forEach((line, i) => p.text(M, y + 50 + i * 12.5, line, { size: 8.5, color: MUTED }));
  const signed = a.status === "signed";
  p.text(R, y + 20, signed ? "SIGNED" : a.status === "sent" ? "AWAITING SIGNATURE" : a.status === "draft" ? "DRAFT" : "WITHDRAWN", { size: 9, bold: true, color: signed ? hex("#1f7a4d") : MUTED, align: "right" });
  y += 92;
  for (const line of wrap(a.title, R - M, 20, true)) (p.text(M, y, line, { size: 20, bold: true }), (y += 24));
  p.text(M, y + 2, a.kind === "custom" ? a.business : `${a.business} · Version ${a.version}`, { size: 9.5, color: MUTED });
  y += 18;
  p.line(M, y, R, y, { width: 1.2, color: INK });
  y += 24;

  // The text: a numbered heading ("3. Payment") on a line of its own is set in bold.
  for (const para of String(a.text).split("\n")) {
    if (!para.trim()) {
      y += 6;
      continue;
    }
    const head = /^\d+\.\s+\S.{0,60}$/.test(para.trim()) && !/[.:;,]$/.test(para.trim());
    const size = head ? 10.5 : 10;
    const lines = wrap(para, R - M, size, head);
    if (head) room(14 + 13.5 * 2);
    if (head) y += 5;
    for (const line of lines) {
      room(13.5);
      p.text(M, y, line, { size, bold: head });
      y += head ? 14.5 : 13.5;
    }
  }

  // The signature record, kept together and compact so it sits under the text when there's room:
  // the signature on its line, who signed, then the record in two columns and the text's
  // fingerprint. The device is put plainly ("iPhone · Safari"); the full detail stays on file.
  const s = a.signer || {};
  const half = (R - M - 32) / 2;
  const cells: [string, string][] = signed
    ? [
        ["Signed", when(a.signedAt)],
        ["Email", s.email || ""],
        ["From", [s.ip, deviceName(s.device)].filter(Boolean).join(" · ")],
        ["Signature", s.method ? `${s.method === "drawn" ? "Drawn" : "Typed"}${s.sigHash ? ` · ${s.sigHash.slice(0, 12)}…` : ""}` : "Typed name"],
        ...(a.sentAt ? ([["Sent", when(a.sentAt)]] as [string, string][]) : []),
      ]
    : [...(a.sentAt ? ([["Sent", when(a.sentAt)]] as [string, string][]) : [])];
  // Full width: which document (and version), and the fingerprint of its text.
  const lines2: [string, string][] = [["Document", a.kind === "custom" ? a.id : `${a.id} · version ${a.version}`], ...(a.hash ? ([["SHA-256", a.hash]] as [string, string][]) : [])];
  const ROW = 11;
  const gridH = Math.ceil(cells.length / 2) * ROW;
  const SIG_H = signed && signature ? 44 : 0;
  const BOX = 18 + SIG_H + (signed ? 28 : 0) + gridH + lines2.length * ROW + 8;
  // The record may come closer to the footer than the text does (it's the page's last thing).
  if (y + 10 + BOX > FOOT - 12) newPage();
  y += 10;
  p.round(M, y, R - M, BOX, 6, { stroke: RULE, fill: FILL });
  const L = M + 16;
  let sy = y + 16;
  p.text(L, sy, signed ? "Signed electronically" : "Not signed yet", { size: 8.5, bold: true, color: MUTED });
  sy += 4;
  if (signed && signature) {
    // Fits 240 × 34, keeping its shape, resting on the line.
    const h = 34;
    let iw = (signature.width / signature.height) * h;
    let ih = h;
    if (iw > 240) [iw, ih] = [240, (signature.height / signature.width) * 240];
    p.image(L, sy + (h - ih), iw, ih, "Sig");
    sy += h + 3;
    p.line(L, sy, L + 240, sy, { width: 0.6, color: MUTED });
    sy += 4;
  }
  if (signed) {
    sy += 13;
    p.text(L, sy, s.name, { size: 13, bold: true });
    const rest = [s.title, `for ${a.business}`].filter(Boolean).join(", ");
    p.text(L + textWidth(s.name, 13, true) + 8, sy, rest, { size: 9, color: MUTED });
    sy += 15;
  }
  cells.forEach(([k, v], i) => {
    const x = L + (i % 2) * (half + 0);
    const ry = sy + Math.floor(i / 2) * ROW;
    p.text(x, ry, k, { size: 7.5, bold: true, color: MUTED });
    const room2 = half - 62;
    let t = v;
    while (t.length > 4 && textWidth(t, 7.5) > room2) t = `${t.slice(0, -2)}…`.replace(/……$/, "…");
    p.text(x + 58, ry, t, { size: 7.5 });
  });
  sy += gridH;
  lines2.forEach(([k, v], i) => {
    p.text(L, sy + i * ROW, k, { size: 7.5, bold: true, color: MUTED });
    p.text(L + 58, sy + i * ROW, v, { size: 7.5 });
  });
  y += BOX;

  pages.forEach((pg, i) => {
    pg.line(M, FOOT, R, FOOT);
    pg.text(M, FOOT + 15, `${site.name} · ${a.title} · ${a.business}`, { size: 7.5, color: MUTED });
    pg.text(R, FOOT + 15, `Page ${i + 1} of ${pages.length}`, { size: 7.5, color: MUTED, align: "right" });
  });
  return build(pages, W, H, logo, `${a.title}, ${a.business}`, signed && signature ? { Sig: signature } : {});
}
