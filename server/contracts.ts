// Wholesale agreements: one agreement text (edited in Wholesale › Contracts, a new version each time
// it changes), filled in for a café and sent to their portal, where an owner of the account signs it
// by typing their name and ticking that they agree. What they signed is kept word for word, with
// who signed, when, from where (IP and browser) and a SHA-256 of the text, so the signed copy
// (a PDF) can be shown to match.
//
// Stored with server/storage.js as storage.open("contracts", CONTRACT_PARTS).

import { createHash, randomUUID } from "node:crypto";

export const CONTRACT_PARTS = {
  settings: (s) => s.id, // one: { id: "template", title, body, version, required, updatedAt, updatedBy }
  agreements: (a) => a.id, // { id, accountId, business, title, version, text, hash, status, sentAt, sentBy, signedAt, signer, via?, externalId? }
  files: (f) => f.id, // a signed copy made elsewhere (uSign's sealed PDF): { id: agreement id, pdf (base64), at }
};

export class ContractError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// What can go in the text, filled in for each café when it's sent.
export const FIELDS = {
  business: "Business",
  contact: "Contact",
  address: "Address",
  terms: "Terms",
  pricing: "Pricing",
  date: "Date",
  shop: "Our Name",
};

export const DEFAULT_TITLE = "Wholesale Agreement";
export const DEFAULT_BODY = `This agreement is between {shop} ("we") and {business} ("you"), from {date}.

1. Ordering
You order through the wholesale portal, by email or by text. An order is confirmed once we accept it.

2. Pricing
Your pricing is {pricing}. We'll give you at least 14 days' notice before a price change. Prices on an order are fixed once we confirm it.

3. Payment
Payment terms are {terms}, from the invoice date. We may pause orders while an invoice is overdue.

4. Delivery
We deliver to {address}, or you pick up from our warehouse. Check each delivery when it arrives and tell us within 48 hours if anything is missing or damaged.

5. Returns
We can't take back food that arrived in good condition. If something isn't right, tell us and we'll make it right.

6. Our name and brand
You may name us as your supplier and use our logo and photos to sell our products. Please don't change our packaging or sell our products under another name.

7. Ending this agreement
Either of us can end this agreement with 30 days' written notice. Invoices already sent still need to be paid.`;

const text = (v, n) => String(v ?? "").trim().slice(0, n);
export const sha256 = (s) => createHash("sha256").update(s, "utf8").digest("hex");

export function createContracts({ store }) {
  const db = store.data;
  const save = () => store.save();
  db.files ||= [];
  // via: "portal" (signed in the wholesale portal) or "usign" (sent from a uSign template).
  const template = () => ({ id: "template", title: DEFAULT_TITLE, body: DEFAULT_BODY, version: 1, required: false, via: "portal", usign: null, updatedAt: "", updatedBy: "", ...(db.settings.find((s) => s.id === "template") || {}) });

  async function setTemplate(input, by = "") {
    const t = template();
    const title = "title" in input ? text(input.title, 120) : t.title;
    const body = "body" in input ? String(input.body ?? "").replace(/\r\n/g, "\n").trim().slice(0, 40_000) : t.body;
    if (!title) throw new ContractError("Give the agreement a title.");
    if (body.length < 40) throw new ContractError("Write out the agreement.");
    const unknown = [...body.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).filter((k) => !(k in FIELDS));
    if (unknown.length) throw new ContractError(`{${unknown[0]}} isn't something we can fill in.`);
    const changed = title !== t.title || body !== t.body;
    const via = input.via === "usign" ? "usign" : input.via === "portal" ? "portal" : t.via;
    const usign = "usign" in input ? (input.usign?.id ? { id: text(input.usign.id, 120), name: text(input.usign.name, 120), version: input.usign.version ?? null } : null) : t.usign;
    if (via === "usign" && !usign) throw new ContractError("Pick the uSign template to send.");
    const next = { ...t, title, body, via, usign, required: "required" in input ? Boolean(input.required) : t.required, ...(changed && { version: t.version + 1, updatedAt: new Date().toISOString(), updatedBy: by }) };
    db.settings = [next];
    await save();
    return next;
  }

  const fill = (body, values) => body.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k] || "—") : m));

  // The café's wholesale agreements (not their one-off documents), newest first.
  const isMain = (a) => (a.kind || "agreement") === "agreement";
  const of = (accountId) => db.agreements.filter((a) => a.accountId === accountId && isMain(a)).sort((a, b) => b.sentAt.localeCompare(a.sentAt));
  const signed = (accountId) => of(accountId).find((a) => a.status === "signed") || null;
  const waiting = (accountId) => of(accountId).find((a) => a.status === "sent") || null;
  const find = (id) => db.agreements.find((a) => a.id === id) || null;

  // Fills the current text in for a café and makes it the one waiting for them (any earlier one
  // still waiting is withdrawn).
  async function send(acct, values, by = "") {
    const t = template();
    for (const a of db.agreements) if (a.accountId === acct.id && isMain(a) && a.status === "sent") Object.assign(a, { status: "withdrawn", withdrawnAt: new Date().toISOString() });
    const body = fill(t.body, values);
    const a = { id: randomUUID(), accountId: acct.id, business: text(acct.business, 120), title: t.title, version: t.version, text: body, hash: sha256(`${t.title}\n\n${body}`), status: "sent", sentAt: new Date().toISOString(), sentBy: by, signedAt: "", signer: null };
    db.agreements.push(a);
    await save();
    return a;
  }

  // signature: { method: "drawn" | "typed", png } — the image they made, kept with its SHA-256.
  async function sign(id, accountId, { name, title, email, ip, device, signature = null }: { name: any; title: any; email: any; ip: any; device: any; signature?: { method: string; png: Buffer } | null }) {
    const a = find(id);
    if (!a || a.accountId !== accountId) throw new ContractError("That agreement isn't here.", 404);
    if (a.status !== "sent") throw new ContractError(a.status === "signed" ? "This agreement is already signed." : "This agreement was replaced. Open the newest one.", 409);
    const who = text(name, 80);
    if (who.length < 3 || !/\s/.test(who)) throw new ContractError("Type your full name.");
    // The text is checked against what was sent, so the copy signed is the one on record.
    if (sha256(`${a.title}\n\n${a.text}`) !== a.hash) throw new ContractError("This agreement couldn't be checked. Ask us to send it again.", 409);
    Object.assign(a, {
      status: "signed",
      signedAt: new Date().toISOString(),
      signer: { name: who, title: text(title, 80), email: text(email, 254).toLowerCase(), ip: text(ip, 64), device: text(device, 300), ...(signature && { method: signature.method === "drawn" ? "drawn" : "typed", sigHash: createHash("sha256").update(signature.png).digest("hex") }) },
      ...(signature && { signature: signature.png.toString("base64") }),
    });
    await save();
    return a;
  }

  // Sent through uSign: our record of it (the text lives in uSign's template).
  async function sendElsewhere(acct, { title, version, via, externalId, signer }, by = "") {
    for (const a of db.agreements) if (a.accountId === acct.id && isMain(a) && a.status === "sent") Object.assign(a, { status: "withdrawn", withdrawnAt: new Date().toISOString() });
    const a = { id: randomUUID(), accountId: acct.id, business: text(acct.business, 120), title: text(title, 120), version, text: "", hash: "", status: "sent", via, externalId: text(externalId, 120), sentTo: text(signer, 254), sentAt: new Date().toISOString(), sentBy: by, signedAt: "", signer: null };
    db.agreements.push(a);
    await save();
    return a;
  }
  // Signed elsewhere (uSign): who, when, and the sealed PDF.
  async function signedElsewhere(id, { email, signedAt, pdf, audit }) {
    const a = find(id);
    if (!a) throw new ContractError("That agreement isn't here.", 404);
    if (a.status === "signed") return a;
    Object.assign(a, { status: "signed", signedAt: signedAt || new Date().toISOString(), signer: { name: text(email, 254), title: "", email: text(email, 254).toLowerCase(), ip: "", device: "" }, audit: Array.isArray(audit) ? audit.slice(0, 50) : [], ...(pdf && { hash: createHash("sha256").update(pdf).digest("hex") }) });
    if (pdf) {
      db.files = db.files.filter((f) => f.id !== id);
      db.files.push({ id, pdf: pdf.toString("base64"), at: new Date().toISOString() });
    }
    await save();
    return a;
  }
  const file = (id) => {
    const f = db.files.find((x) => x.id === id);
    return f ? Buffer.from(f.pdf, "base64") : null;
  };
  async function setExternal(id, externalId) {
    const a = find(id);
    if (!a) return;
    a.externalId = text(externalId, 120);
    await save();
  }
  const byExternal = (externalId) => db.agreements.find((a) => a.externalId && a.externalId === externalId) || null;

  /* ── One-off documents for a café (an equipment loan, an exclusive supply deal…): a draft
     first, written by the team or the assistant, then sent and signed like the agreement. ── */
  const cleanDoc = (input, was: any = {}) => {
    const title = "title" in input ? text(input.title, 120) : was.title;
    const body = "text" in input ? String(input.text ?? "").replace(/\r\n/g, "\n").trim().slice(0, 40_000) : was.text;
    if (!title) throw new ContractError("Give the document a title.");
    if (!body || body.length < 20) throw new ContractError("Write out the document.");
    return { title, text: body };
  };
  async function draft(acct, input, by = "") {
    const d = { id: randomUUID(), kind: "custom", accountId: acct.id, business: text(acct.business, 120), ...cleanDoc(input), version: 1, hash: "", status: "draft", createdAt: new Date().toISOString(), createdBy: by, sentAt: "", sentBy: "", signedAt: "", signer: null };
    db.agreements.push(d);
    await save();
    return d;
  }
  async function editDraft(id, input) {
    const d = find(id);
    if (!d || d.status !== "draft") throw new ContractError("Only a draft can be changed.", 409);
    Object.assign(d, cleanDoc(input, d), { updatedAt: new Date().toISOString() });
    await save();
    return d;
  }
  async function sendDraft(id, by = "") {
    const d = find(id);
    if (!d || d.status !== "draft") throw new ContractError("That draft isn't here any more.", 404);
    Object.assign(d, { status: "sent", sentAt: new Date().toISOString(), sentBy: by, hash: sha256(`${d.title}\n\n${d.text}`) });
    await save();
    return d;
  }
  async function discard(id) {
    const d = find(id);
    if (!d || d.status !== "draft") throw new ContractError("Only a draft can be deleted.", 409);
    db.agreements = db.agreements.filter((x) => x.id !== id);
    await save();
  }
  // A café's one-off documents (sent or signed; drafts stay in the back office).
  const documentsOf = (accountId) => db.agreements.filter((a) => a.accountId === accountId && a.kind === "custom" && ["sent", "signed"].includes(a.status)).sort((a, b) => (b.sentAt || "").localeCompare(a.sentAt || ""));

  async function withdraw(id, by = "") {
    const a = find(id);
    if (!a || a.status !== "sent") throw new ContractError("There's nothing waiting to withdraw.", 404);
    Object.assign(a, { status: "withdrawn", withdrawnAt: new Date().toISOString(), withdrawnBy: by });
    await save();
    return a;
  }

  return { template, setTemplate, fill, of, signed, waiting, find, send, sendElsewhere, signedElsewhere, setExternal, file, byExternal, sign, withdraw, draft, editDraft, sendDraft, discard, documentsOf, list: () => db.agreements };
}
