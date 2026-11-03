// Sends email through Resend (https://resend.com) using its HTTP API.
// Set RESEND_API_KEY and EMAIL_FROM (an address on a domain verified in Resend,
// e.g. "Mimi Food <hello@mimifood.com>"). Without them, sending is off.

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

// Who each kind of email comes from: <KIND>_FROM in Render (an address on a domain verified in
// Resend), or else EMAIL_FROM's name with the kind's own address on its domain (orders@,
// wholesale@, support@), or EMAIL_FROM itself.
//   ORDERS_FROM      order confirmations, shipping and pickup updates, refunds, returns, gift
//                    cards, back in stock, class tickets (default orders@)
//   WHOLESALE_FROM   invoices, wholesale invites, purchase orders to suppliers (default wholesale@)
//   ACCOUNT_FROM     sign-in codes, password resets and email confirmations (default support@)
//   AUTOMATIONS_FROM the automated emails (welcome, abandoned cart, after an order, running low,
//                    win-back)
//   NEWSLETTER_FROM  newsletters and the newsletter signup and welcome code (default newsletter@)
//   INBOX_FROM       replies from the back office Inbox
const KIND_ADDRESS = { orders: "orders", wholesale: "wholesale", account: "support", newsletter: "newsletter" };
// "Mimi Food <hello@mimifood.com>" with another address on the same domain: "Mimi Food <support@mimifood.com>".
export const withAddress = (from, local) => String(from || "").replace(/[^\s<@]+@/, `${local}@`);
export const senderFor = (kind) =>
  String(process.env[`${String(kind || "").toUpperCase()}_FROM`] || "").trim() || (KIND_ADDRESS[kind] && process.env.EMAIL_FROM ? withAddress(process.env.EMAIL_FROM, KIND_ADDRESS[kind]) : process.env.EMAIL_FROM);

// `from`, `replyTo` and `headers` are optional (the Inbox sets them so answers come back to it).
// `attachments`: files to attach, each { filename, content } with the content as a Buffer.
export async function sendEmail({ to, subject, text, html, from, kind, replyTo, headers, attachments }: { to: any; subject: any; text: any; html?: any; from?: any; kind?: any; replyTo?: any; headers?: any; attachments?: { filename: string; content: Buffer }[] }) {
  if (!emailConfigured()) throw new Error("Email is not configured");
  const res = await fetch(process.env.RESEND_API_URL || "https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: from || (kind ? senderFor(kind) : process.env.EMAIL_FROM), to: [to], subject, text, html, ...(replyTo && { reply_to: replyTo }), ...(headers && { headers }), ...(attachments?.length && { attachments: attachments.map((f) => ({ filename: f.filename, content: f.content.toString("base64") })) }) }),
    signal: AbortSignal.timeout(attachments?.length ? 30000 : 10000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json().catch(() => ({}));
}

// Up to 100 emails in one request (Resend's batch endpoint), each with its own recipient and
// headers. Newsletters go from NEWSLETTER_FROM, or else newsletter@ on EMAIL_FROM's domain. It
// only sends: replies to a newsletter come into the Inbox's Hello.
export const newsletterFrom = () => senderFor("newsletter");

export async function sendBatch(emails) {
  if (!emailConfigured()) throw new Error("Email is not configured");
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com/emails"}/batch`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(emails.map((e) => ({ from: newsletterFrom(), ...e }))),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
}

// A file attached to an email Resend received, as base64: given inline, or fetched from its
// download link. Null if it can't be had.
export async function receivedAttachment(emailId, att): Promise<string | null> {
  if (att?.content) return String(att.content);
  if (!process.env.RESEND_API_KEY || !att?.id) return null;
  const base = process.env.RESEND_API_URL || "https://api.resend.com/emails";
  const res = await fetch(`${base}/receiving/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(att.id)}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const meta: any = await res.json();
  if (meta.content) return String(meta.content);
  if (!meta.download_url) return null;
  const file = await fetch(meta.download_url, { signal: AbortSignal.timeout(30000) });
  if (!file.ok) throw new Error(`The attachment download responded ${file.status}`);
  return Buffer.from(await file.arrayBuffer()).toString("base64");
}

// An email Resend received for us (Resend receiving): who it's from, the subject, and its text
// and HTML. The webhook only says one arrived; the content is fetched here.
export async function receivedEmail(id): Promise<any> {
  if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY is not set");
  const res = await fetch(`${process.env.RESEND_API_URL || "https://api.resend.com/emails"}/receiving/${encodeURIComponent(id)}`, {
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}` },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Resend responded ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}
