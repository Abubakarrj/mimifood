// Couriers for local deliveries: Uber Direct. Each job is quoted (checkout shows the fee and
// arrival) and booked from the back office or when a café order is paid.
//
// A job: { id, ref (the order number), from: { name, phone, parts }, to: { name, phone, parts },
// value, items, note, pickupTime } where parts = { street, city, state, zip }.

import * as uber from "./uber.ts";

export const PROVIDERS = {
  uber: {
    name: "Uber Direct",
    configured: uber.uberConfigured,
    quote: (job) => uber.quote(job),
    book: async (job) => uber.summary(await uber.createDelivery(job)),
    get: async (id) => uber.summary(await uber.getDelivery(id)),
    cancel: (id) => uber.cancelDelivery(id),
  },
};

export const configured = () => Object.keys(PROVIDERS).filter((k) => PROVIDERS[k].configured());
export const providerName = (key) => PROVIDERS[key]?.name || "Courier";

// The courier's quote: { provider, fee, dropoffEta, quotes }; null when none is set up.
export async function choose(job) {
  const keys = configured();
  if (!keys.length) return null;
  const quotes: Record<string, any> = {};
  await Promise.all(
    keys.map(async (k) => {
      try {
        quotes[k] = await PROVIDERS[k].quote(job);
      } catch (error) {
        quotes[k] = { error: error.message };
      }
    })
  );
  const ok = keys.filter((k) => quotes[k].fee != null);
  if (!ok.length) return { provider: keys[0], fee: null, dropoffEta: null, quotes };
  ok.sort((a, b) => quotes[a].fee - quotes[b].fee || Date.parse(quotes[a].dropoffEta || 0) - Date.parse(quotes[b].dropoffEta || 0));
  return { provider: ok[0], ...quotes[ok[0]], quotes };
}

// Books the courier. Returns { provider, delivery } or throws its error.
export async function book(job, preferred) {
  const keys = configured();
  if (!keys.length) throw new uber.CourierError("No courier service is set up.");
  const first = keys.includes(preferred) ? preferred : (await choose(job))?.provider || keys[0];
  const order = [first, ...keys.filter((k) => k !== first)];
  let last;
  for (const k of order) {
    try {
      return { provider: k, delivery: await PROVIDERS[k].book(job) };
    } catch (error) {
      console.error(`[courier] ${PROVIDERS[k].name} couldn't take ${job.ref}:`, error.message);
      last = error;
    }
  }
  throw last;
}
