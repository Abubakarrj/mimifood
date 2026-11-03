// Where a customer drops off a return, and which carrier's label to buy for it.
//
// The places come from Google Maps through AnyAPI when ANYAPI_API_KEY is set (about $0.004 a
// return), else from OpenStreetMap through the Overpass API (free, no key; set OVERPASS_URL to
// use another instance): Post Offices (USPS), The UPS Store and other UPS locations, and FedEx
// Office and other FedEx locations, within about 5 miles of the customer.
//
// Each carrier that quotes the return is scored as what the label costs us plus what the trip
// costs the customer: SITE.returnChoice.perMile dollars for every mile past the first
// SITE.returnChoice.freeMiles to that carrier's nearest location. The lowest score wins, so a
// slightly dearer label is worth it when its drop-off is around the corner and the cheaper one's
// is across town. USPS collects from the door for free (the customer books it on the return page),
// so its trip counts as nothing (SITE.returnChoice.uspsPickup: false counts the Post Office
// instead). A carrier with no location nearby isn't offered, except USPS; when the places can't be
// looked up, another carrier's trip counts as SITE.returnChoice.unknownMiles (2). Ties go to USPS,
// whose return labels are only charged once used.

import { distanceKm } from "./geo.ts";

const OVERPASS = (process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter").replace(/\/$/, "");
const RADIUS_M = 8000;
const MILE_KM = 1.609344;
const CACHE_DAYS = 7;
const cache = new Map(); // rounded point → { at, places }

// A place from OpenStreetMap → which carrier takes parcels there (null if none of ours).
export function carrierOf(tags: any = {}) {
  const text = [tags.brand, tags.name, tags.operator, tags["brand:en"]].filter(Boolean).join(" ");
  if (/fed\s*ex/i.test(text)) return "FedEx";
  if (/\bUPS\b|the ups store/i.test(text)) return "UPS";
  // A Post Office; shipping stores tagged as post offices (Pak Mail, PostNet…) aren't USPS's.
  if (tags.amenity === "post_office" && !/dhl|amazon|pak ?mail|postal annex|postnet|mail ?boxes/i.test(text)) return "USPS";
  return null;
}

const addressOf = (t) => [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:city"]].filter(Boolean).join(", ");

const placeName = (carrier, t) => t.name || { USPS: "Post Office", UPS: "UPS location", FedEx: "FedEx location" }[carrier];

// With AnyAPI (server.ts sets this): Google Maps, which lists nearly every Post Office, UPS and
// FedEx location. (query, [lat, lon]) → Google Maps places, or throws. OpenStreetMap otherwise,
// and whenever Google Maps fails.
let mapsNearby = null;
export const useGoogleMapsForDropoffs = (fn) => (mapsNearby = fn);

async function fromGoogleMaps(point) {
  const lists = await Promise.all(["post office", "The UPS Store", "FedEx Office"].map((q) => mapsNearby(q, point)));
  const seen = new Set();
  return lists
    .flat()
    .map((it) => {
      const carrier = carrierOf({ name: it.name, amenity: /post office/i.test(`${it.category} ${(it.categories || []).join(" ")}`) ? "post_office" : "" });
      if (!carrier || it.latitude == null || seen.has(it.placeId)) return null;
      seen.add(it.placeId);
      const at: [number, number] = [it.latitude, it.longitude];
      return { carrier, name: it.name, address: it.address || "", point: at.map((x) => Math.round(x * 1e5) / 1e5), miles: Math.round((distanceKm(point, at) / MILE_KM) * 10) / 10, hours: "", mapsUrl: it.url || "" };
    })
    .filter((p) => p && p.miles <= RADIUS_M / 1609.344)
    .sort((a, b) => a.miles - b.miles);
}

// Drop-off places near [lat, lon], nearest first: { carrier, name, address, point, miles, hours }.
// Empty when neither Google Maps nor OpenStreetMap can be reached (the label is then chosen on
// price alone).
export async function nearbyDropoffs(point) {
  if (!point) return [];
  const key = point.map((x) => x.toFixed(3)).join(",");
  const hit = cache.get(key);
  if (hit && hit.at > Date.now() - CACHE_DAYS * 864e5) return hit.places;
  if (mapsNearby) {
    try {
      const places = await fromGoogleMaps(point);
      if (places.length) {
        if (cache.size > 500) cache.delete(cache.keys().next().value);
        cache.set(key, { at: Date.now(), places });
        return places;
      }
    } catch (error) {
      console.error("[dropoff] Google Maps:", error.message);
    }
  }
  const [lat, lon] = point;
  const around = `(around:${RADIUS_M},${lat},${lon})`;
  const query = `[out:json][timeout:15];(nwr${around}[amenity=post_office];nwr${around}[shop][~"^(name|brand|operator)$"~"UPS|FedEx",i];nwr${around}[office][~"^(name|brand|operator)$"~"UPS|FedEx",i];);out center tags 80;`;
  let places = [];
  try {
    const res = await fetch(OVERPASS, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": "Mimi Food returns" },
      body: new URLSearchParams({ data: query }),
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
    const data: any = await res.json();
    places = (data.elements || [])
      .map((e) => {
        const t = e.tags || {};
        const carrier = carrierOf(t);
        const at: [number, number] | null = e.lat != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null;
        if (!carrier || !at) return null;
        return { carrier, name: placeName(carrier, t), address: addressOf(t), point: at.map((x) => Math.round(x * 1e5) / 1e5), miles: Math.round((distanceKm(point, at) / MILE_KM) * 10) / 10, hours: t.opening_hours || "" };
      })
      .filter(Boolean)
      .sort((a, b) => a.miles - b.miles);
  } catch (error) {
    console.error("[dropoff] places:", error.message);
    return []; // not cached, so it's tried again next time
  }
  if (cache.size > 500) cache.delete(cache.keys().next().value);
  cache.set(key, { at: Date.now(), places });
  return places;
}

// The carriers to try, best first: [{ rate, place, nearby, score }]. rates: Shippo's return
// rates (any order); places: nearbyDropoffs(). With no places known, it's price alone.
export function rankReturnCarriers(rates, places, { perMile = 0.75, freeMiles = 1, uspsPickup = true, unknownMiles = 2 } = {}) {
  const cheapest = new Map();
  for (const r of rates) {
    const was = cheapest.get(r.carrierCode);
    if (!was || r.cost < was.cost) cheapest.set(r.carrierCode, r);
  }
  const known = places.length > 0;
  return [...cheapest.values()]
    .map((rate) => {
      const theirs = places.filter((p) => p.carrier.toLowerCase() === String(rate.carrierCode).toLowerCase());
      const usps = /^usps$/i.test(rate.carrierCode);
      if (known && !theirs.length && !usps) return null; // nowhere near to drop it
      // USPS with no Post Office found: a free pickup from the door, counted as a short trip.
      // USPS collects from the door (booked on the return page), so its trip costs them nothing;
      // with no places known, anyone else's trip counts as unknownMiles.
      const miles = usps && uspsPickup ? 0 : known ? theirs[0]?.miles ?? 0 : usps ? 0 : unknownMiles;
      const score = rate.cost + perMile * Math.max(0, miles - freeMiles);
      return { rate, place: theirs[0] || null, nearby: theirs.slice(0, 3), score: Math.round(score * 100) / 100 };
    })
    .filter(Boolean)
    .sort((a, b) => a.score - b.score || (/^usps$/i.test(b.rate.carrierCode) as any) - (/^usps$/i.test(a.rate.carrierCode) as any));
}
