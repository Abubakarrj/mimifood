// Shipping rates and labels through Shippo (https://docs.goshippo.com): every carrier active in
// the Shippo account quotes the parcel; checkout shows the cheapest, and that label is bought
// once the order is paid. SHIPPO_CARRIERS in Render ("USPS") limits it to those carriers.
//
// Set SHIPPO_API_TOKEN (Shippo → Settings → API). A shippo_test_ token buys free test labels.

export class ShippoError extends Error {}

const token = () => process.env.SHIPPO_API_TOKEN || process.env.SHIPPO_API_KEY || process.env.SHIPPO_TOKEN || "";
export const shippoConfigured = () => Boolean(token());
export const testLabels = () => token().startsWith("shippo_test_");

async function call(method, path, body?) {
  const base = (process.env.SHIPPO_API_URL || "https://api.goshippo.com").replace(/\/$/, "");
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { Authorization: `ShippoToken ${token()}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  const data = await (res.json() as Promise<any>).catch(() => null);
  if (!res.ok) {
    const detail = data?.detail || data?.messages?.[0]?.text || "";
    throw new ShippoError(res.status === 401 ? "Shippo isn't connected properly." : detail ? `Shippo: ${detail}`.slice(0, 300) : "Shippo couldn't do that. Check the address and try again.");
  }
  return data;
}

const address = (a) => ({
  name: a.name || undefined,
  company: a.company || undefined,
  street1: a.street1 || undefined,
  street2: a.street2 || undefined,
  city: a.city || undefined,
  state: a.state || undefined,
  zip: a.postalCode,
  country: a.country || "US",
  phone: a.phone || undefined,
  email: a.email || undefined,
});

// Services a coffee parcel can't use (Media Mail is for books and recordings only).
const NOT_FOR_COFFEE = /media_mail|library_mail/;
// The carriers to use, or none listed: all of the account's.
const carriers = () =>
  String(process.env.SHIPPO_CARRIERS || "")
    .split(",")
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean);

// Our carriers' rates for one parcel, cheapest first. box: inches; maxDays drops slower services.
// isReturn: a return label (Shippo swaps the addresses: the customer sends it back to shipFrom),
// with a QR code asked for too: USPS gives one the customer can show at a Post Office counter
// instead of printing (USPS Label Broker); other carriers just don't.
export async function rates({ shipFrom, shipTo, weightOz, box, maxDays = null, isReturn = false }) {
  const shipment = await call("POST", "/shipments/", {
    address_from: address(shipFrom),
    address_to: address(shipTo),
    parcels: [{ length: String(box.length), width: String(box.width), height: String(box.height), distance_unit: "in", weight: String(weightOz), mass_unit: "oz" }],
    ...(isReturn ? { extra: { is_return: true, qr_code_requested: true } } : {}),
    async: false,
  });
  const allowed = carriers();
  const list = (shipment.rates || [])
    .filter((r) => !allowed.length || allowed.includes(String(r.provider || "").toLowerCase()))
    .filter((r) => !NOT_FOR_COFFEE.test(r.servicelevel?.token || ""))
    .filter((r) => !maxDays || r.estimated_days == null || r.estimated_days <= maxDays)
    .map((r) => ({
      rateId: r.object_id,
      carrierAccount: r.carrier_account || "",
      carrierCode: r.provider,
      carrierName: r.provider,
      serviceCode: r.servicelevel?.token || "",
      serviceName: `${r.provider} ${r.servicelevel?.name || ""}`.trim(),
      cost: Math.round(Number(r.amount) * 100) / 100,
      days: r.estimated_days ?? null,
    }))
    .filter((r) => r.cost > 0)
    .sort((a, b) => a.cost - b.cost || (a.days ?? 9) - (b.days ?? 9));
  if (!list.length) throw new ShippoError(`No shipping rates for this parcel${shipment.messages?.[0]?.text ? ` (${shipment.messages[0].text})` : ""}.`);
  return list;
}

// Buys a label: the given service (as in the back office), or else the cheapest. Returns the
// tracking number, what it cost and the label as a base64 PDF (or its link, if that won't load).
export async function createLabel({ carrierCode, serviceCode, shipFrom, shipTo, weightOz, box, maxDays, orderNumber, isReturn = false }: { carrierCode?: any; serviceCode?: any; shipFrom: any; shipTo: any; weightOz: any; box?: any; maxDays?: any; orderNumber?: any; isReturn?: boolean }) {
  const list = await rates({ shipFrom, shipTo, weightOz, box, maxDays: serviceCode ? null : maxDays, isReturn });
  // A carrier without a service: that carrier's cheapest.
  const rate = serviceCode ? list.find((r) => r.serviceCode === serviceCode && (!carrierCode || r.carrierCode === carrierCode)) : list.find((r) => !carrierCode || r.carrierCode === carrierCode);
  if (!rate) throw new ShippoError(serviceCode ? "That service no longer has a rate for this parcel. Get rates again." : `No ${carrierCode} rate for this parcel.`);
  return buyRate(rate, { orderNumber, isReturn });
}

// Buys the label for one of rates()' rates.
export async function buyRate(rate, { orderNumber = null, isReturn = false } = {}) {
  const t = await call("POST", "/transactions/", { rate: rate.rateId, label_file_type: "PDF_4x6", metadata: orderNumber ? `${isReturn ? "Return for order" : "Order"} ${orderNumber}` : undefined, async: false });
  if (t.status !== "SUCCESS") throw new ShippoError(`Shippo couldn't buy the label: ${t.messages?.map((m) => m.text).join(" ") || t.status}`);
  let pdf = null;
  try {
    const file = await fetch(t.label_url, { signal: AbortSignal.timeout(15000) });
    if (file.ok) pdf = Buffer.from(await file.arrayBuffer()).toString("base64");
  } catch {
    /* the link still works */
  }
  return { shipmentId: t.object_id, trackingNumber: t.tracking_number, trackingUrl: t.tracking_url_provider || "", labelUrl: t.label_url, qrCodeUrl: t.qr_code_url || null, carrierAccount: rate.carrierAccount, cost: rate.cost, carrier: rate.carrierCode, carrierCode: rate.carrierCode, serviceCode: rate.serviceCode, service: rate.serviceName, pdf };
}

// Has the carrier collect a parcel (USPS or DHL Express): its label (transaction id), the carrier
// account it was bought on, where (an address as for rates(), with phone and email), on the day
// "YYYY-MM-DD" between from and to (hours in that place, "09:00"), and where on the property
// (Shippo's building_location_type, e.g. "Front Door"; "Other" needs instructions).
// Returns { id, status, confirmation, start, end, cancelBy } or throws.
export async function schedulePickup({ transactionId, carrierAccount, at, day, from = "09:00", to = "17:00", spot = "Front Door", instructions = "", tz = "America/Los_Angeles" }) {
  // The requested window as an instant: the time in that place on that day.
  const instant = (hhmm) => {
    const guess = new Date(`${day}T${hhmm}:00Z`);
    const local = new Date(guess.toLocaleString("en-US", { timeZone: tz }));
    const utc = new Date(guess.toLocaleString("en-US", { timeZone: "UTC" }));
    return new Date(guess.getTime() + (utc.getTime() - local.getTime())).toISOString();
  };
  const p = await call("POST", "/pickups/", {
    carrier_account: carrierAccount,
    location: { building_location_type: spot, ...(instructions && { instructions }), address: address(at) },
    transactions: [transactionId],
    requested_start_time: instant(from),
    requested_end_time: instant(to),
  });
  if (p.status === "ERROR") throw new ShippoError(`Couldn't book the pickup: ${p.messages?.map((m) => m.text).join(" ") || "the carrier said no"}`);
  return { id: p.object_id, status: String(p.status || "").toLowerCase(), confirmation: p.confirmation_code || "", start: p.confirmed_start_time || null, end: p.confirmed_end_time || null, cancelBy: p.cancel_by_time || null };
}

// Unused labels are refunded by the carrier.
export async function voidLabel(transactionId) {
  const r = await call("POST", "/refunds/", { transaction: transactionId, async: false });
  if (r.status === "ERROR") throw new ShippoError("Shippo couldn't refund this label.");
  return r;
}

// Shippo's carrier names → the names used for tracking links.
export const trackingCarrier = (provider) => ({ USPS: "USPS", UPS: "UPS", FedEx: "FedEx", FEDEX: "FedEx", "DHL Express": "DHL", DHL: "DHL" })[provider] || "Other";

// Shippo's carrier token for tracking ("USPS" → "usps", "DHL Express" → "dhl_express").
export const carrierToken = (provider) => String(provider || "").trim().toLowerCase().replace(/\s+/g, "_");

// Where a parcel is: { status: pre_transit|transit|out_for_delivery|delivered|returned|failure|unknown,
// text, at, place, eta, history: [{ text, at, place }] } (newest first). Labels bought through
// Shippo are tracked automatically; its track_updated webhook says when to look again.
export async function track(provider, trackingNumber) {
  const t = await call("GET", `/tracks/${encodeURIComponent(carrierToken(provider))}/${encodeURIComponent(trackingNumber)}`);
  const place = (l) => (l ? [l.city, l.state].filter(Boolean).join(", ") : "");
  const stateOf = (s) => {
    const code = String(s?.substatus?.code || "").toLowerCase();
    if (code === "out_for_delivery" || /out for delivery/i.test(s?.status_details || "")) return "out_for_delivery";
    return String(s?.status || "unknown").toLowerCase();
  };
  // zip: where the scan was, for the back office map (carriers report a town, not a spot).
  const step = (s) => ({ status: stateOf(s), text: s.status_details || s.substatus?.text || "", at: s.status_date || null, place: place(s.location), zip: s.location?.zip || "" });
  const now = t.tracking_status ? step(t.tracking_status) : { status: "unknown", text: "", at: null, place: "", zip: "" };
  return {
    ...now,
    eta: t.eta || null,
    history: (t.tracking_history || []).map(step).filter((h) => h.text).reverse().slice(0, 12),
  };
}
