// uSign (Upfluence) for signing wholesale agreements: a contract is made from one of the uSign
// account's templates, with the café's details filled in and our agreement's id as its
// external_reference, then sent to the signer. When it's signed uSign calls our webhook
// (contract.completed); we ask uSign for the contract ourselves before believing it, then keep
// the sealed PDF.
//
// Set USIGN_API_KEY in Render. USIGN_API_URL changes the address (default below). The paths are
// in PATHS, in one place, so they're easy to match to uSign's documentation.

export class USignError extends Error {
  declare status: any;
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const key = () => String(process.env.USIGN_API_KEY || "").trim();
const base = () => String(process.env.USIGN_API_URL || "https://api.usign.upfluence.com/v1").replace(/\/$/, "");
export const usignConfigured = () => Boolean(key());

const PATHS = {
  templates: "/templates",
  create: "/contracts",
  send: (id) => `/contracts/${encodeURIComponent(id)}/send`,
  get: (id) => `/contracts/${encodeURIComponent(id)}`,
};

async function call(method, path, body?) {
  let res;
  try {
    res = await fetch(`${base()}${path}`, {
      method,
      headers: { Authorization: `Bearer ${key()}`, Accept: "application/json", ...(body && { "Content-Type": "application/json" }) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(20000),
    });
  } catch (error) {
    console.error(`[usign] ${method} ${path}:`, error.message);
    throw new USignError("uSign couldn't be reached. Try again.");
  }
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`[usign] ${method} ${path}:`, res.status, data?.error?.message || data?.message || data?.error || "");
    throw new USignError(res.status === 401 || res.status === 403 ? "uSign didn't accept our key. Check it in uSign." : "uSign couldn't do that. Try again.", res.status === 404 ? 404 : 502);
  }
  return data;
}

// The account's templates: [{ id, name, version }].
export async function templates() {
  const d = await call("GET", PATHS.templates);
  const list = Array.isArray(d) ? d : d.data || d.templates || [];
  return list.map((t) => ({ id: String(t.id), name: String(t.name || t.id), version: t.version ?? null }));
}

// Makes the contract and sends it: { id, status, sentAt }.
export async function sendContract({ templateId, signer, fields, reference }) {
  const made = await call("POST", PATHS.create, { template_id: templateId, signer, fields, external_reference: reference });
  if (!made?.id) throw new USignError("uSign didn't make the contract.");
  const sent = await call("POST", PATHS.send(made.id));
  return { id: String(made.id), status: String(sent.status || made.status || "sent"), sentAt: sent.sent_at || new Date().toISOString() };
}

// Where a contract stands: { id, status, audit, pdfUrl, reference }.
export async function contract(id) {
  const c = await call("GET", PATHS.get(id));
  return { id: String(c.id || id), status: String(c.status || ""), audit: Array.isArray(c.audit) ? c.audit : [], pdfUrl: c.sealed_pdf_url || c.pdf_url || "", reference: c.external_reference || "", signedAt: c.completed_at || c.signed_at || "" };
}

// The sealed PDF. Only from uSign's own address, or a link uSign gave back for this contract.
export async function sealedPdf(url) {
  const ours = url.startsWith(`${base()}/`);
  if (!ours && !/^https:\/\//.test(url)) throw new USignError("That PDF link isn't usable.");
  const res = await fetch(url, { headers: ours ? { Authorization: `Bearer ${key()}` } : {}, signal: AbortSignal.timeout(30000) }).catch(() => null);
  if (!res?.ok) throw new USignError("The signed PDF couldn't be fetched from uSign.");
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length > 15_000_000 || buf.subarray(0, 4).toString() !== "%PDF") throw new USignError("uSign's file wasn't a PDF.");
  return buf;
}
