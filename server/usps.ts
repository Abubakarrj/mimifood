// Postage prices from USPS (https://developers.usps.com, Domestic Prices 3.0): what a parcel
// costs to send to a ZIP code, shown at checkout and charged for shipping. Free, no subscription.
//
// Set USPS_CLIENT_ID and USPS_CLIENT_SECRET (the consumer key and secret of an app on
// developers.usps.com). Prices only: no payment account is needed, labels are bought elsewhere.

export const uspsConfigured = () => Boolean(process.env.USPS_CLIENT_ID && process.env.USPS_CLIENT_SECRET);

const base = () => (process.env.USPS_API_URL || "https://apis.usps.com").replace(/\/$/, "");

// An access token (client credentials), kept until shortly before it expires.
let cached = null;
export async function accessToken() {
  if (cached && cached.expires > Date.now() + 60e3) return cached.token;
  const res = await fetch(`${base()}/oauth2/v3/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: process.env.USPS_CLIENT_ID, client_secret: process.env.USPS_CLIENT_SECRET, grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await (res.json() as Promise<any>).catch(() => ({}));
  if (!res.ok || !data.access_token) throw new Error(`USPS: couldn't sign in (${data.error_description || data.error || `HTTP ${res.status}`})`);
  cached = { token: data.access_token, expires: Date.now() + (Number(data.expires_in) || 3600) * 1000 };
  return cached.token;
}

// The price of one parcel: { from, to } ZIP codes, weight in ounces, the box in inches.
export async function price({ from, to, oz, box, mailClass = "USPS_GROUND_ADVANTAGE", priceType = "COMMERCIAL", date }) {
  const res = await fetch(`${base()}/prices/v3/base-rates/search`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      originZIPCode: from,
      destinationZIPCode: to,
      weight: Math.ceil((oz / 16) * 100) / 100, // pounds
      length: box.length,
      width: box.width,
      height: box.height,
      mailClass,
      processingCategory: "MACHINABLE",
      rateIndicator: "SP", // single piece
      destinationEntryFacilityType: "NONE",
      priceType,
      ...(date ? { mailingDate: date } : {}),
    }),
    signal: AbortSignal.timeout(10000),
  });
  const data = await (res.json() as Promise<any>).catch(() => ({}));
  if (res.status === 401) cached = null; // signed out: get a new token next time
  const amount = Number(data.totalBasePrice ?? data.rates?.[0]?.price);
  if (!res.ok || !(amount > 0)) throw new Error(`USPS: ${data.error?.message || data.message || `HTTP ${res.status}`}`);
  return Math.round(amount * 100) / 100;
}
