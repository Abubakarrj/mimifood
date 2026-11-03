// Addresses to coordinates, and distances. US street addresses go to the US Census Bureau's
// geocoder first (free, no key, nearly every house number); anything it can't place goes to
// OpenStreetMap's Nominatim, then the street without its number, then the ZIP code alone.
//
// Nominatim's usage policy (https://operations.osmfoundation.org/policies/nominatim/):
// identify the app with a User-Agent and contact, at most one request per second,
// cache results, no autocomplete-as-you-type. All of that is enforced here.

const BASE = (process.env.NOMINATIM_URL || "https://nominatim.openstreetmap.org").replace(/\/$/, "");
const CENSUS = (process.env.CENSUS_GEOCODER_URL || "https://geocoding.geo.census.gov/geocoder").replace(/\/$/, "");
const CACHE_MAX = 1000;
const CACHE_DAYS = 30;

export function distanceKm([lat1, lon1], [lat2, lon2]) {
  const rad = (x) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

export function createGeocoder({ contact, countryCodes = process.env.GEOCODE_COUNTRIES || "" }) {
  const userAgent = `Mimi Food website (${contact})`;
  const cache = new Map(); // query → { at, result }
  let last = Promise.resolve();
  let lastAt = 0;

  // One request at a time, at least 1.1 seconds apart.
  const throttled = (fn) => {
    const run = last.then(async () => {
      const wait = lastAt + 1100 - Date.now();
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      lastAt = Date.now();
      return fn();
    });
    last = run.catch(() => {});
    return run;
  };

  // Returns [lat, lon] or null when the address can't be found (or Nominatim is unreachable).
  async function geocode(query) {
    const key = String(query || "").replace(/\s+/g, " ").trim().toLowerCase().slice(0, 200);
    if (key.length < 4) return null;
    const hit = cache.get(key);
    if (hit && hit.at > Date.now() - CACHE_DAYS * 864e5) return hit.result;

    const params = new URLSearchParams({ q: key, format: "jsonv2", limit: "1" });
    if (countryCodes) params.set("countrycodes", countryCodes);
    let result = null;
    try {
      const res = await throttled(() =>
        fetch(`${BASE}/search?${params}`, { headers: { "User-Agent": userAgent, "Accept-Language": "en" }, signal: AbortSignal.timeout(8000) })
      );
      if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
      const [first] = await (res.json() as Promise<any>);
      result = first ? [Number(first.lat), Number(first.lon)] : null;
    } catch (error) {
      console.error("[geo] geocode failed:", error.message);
      return null; // not cached, so it's retried next time
    }
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), result });
    return result;
  }

  // The Census Bureau's answer for one US address, or null.
  async function census(oneLine) {
    const params = new URLSearchParams({ address: oneLine, benchmark: "Public_AR_Current", format: "json" });
    try {
      const res = await fetch(`${CENSUS}/locations/onelineaddress?${params}`, { headers: { "User-Agent": userAgent }, signal: AbortSignal.timeout(8000) });
      if (!res.ok) throw new Error(`Census geocoder responded ${res.status}`);
      const match = (await (res.json() as Promise<any>))?.result?.addressMatches?.[0]?.coordinates;
      return match ? [Number(match.y), Number(match.x)] : null;
    } catch (error) {
      console.error("[geo] census geocode failed:", error.message);
      return null;
    }
  }

  // A delivery address ({ street, city, state, zip }) to [lat, lon], trying the most precise
  // source first. Returns null only when nothing can place it, not even its ZIP code.
  async function geocodeAddress({ street = "", city = "", state = "", zip = "" }) {
    const clean = (s) => String(s || "").replace(/\s+/g, " ").trim();
    [street, city, state, zip] = [street, city, state, zip].map(clean);
    const key = `addr:${[street, city, state, zip].join("|").toLowerCase()}`;
    const hit = cache.get(key);
    if (hit && hit.at > Date.now() - CACHE_DAYS * 864e5) return hit.result;
    const tries = [
      () => (street && (zip || city) ? census([street, city, state, zip].filter(Boolean).join(", ")) : null),
      () => (street ? geocode([street, city, state, zip].filter(Boolean).join(", ")) : null),
      () => (street.replace(/^\d+[a-z]?\s+/i, "") !== street ? geocode([street.replace(/^\d+[a-z]?\s+/i, ""), city, state, zip].filter(Boolean).join(", ")) : null),
      () => (zip ? geocode(`${zip}, ${state || "USA"}`) : null),
      () => (!street && city ? geocode([city, state].filter(Boolean).join(", ")) : null), // a town alone (a parcel scan)
    ];
    let result = null;
    for (const attempt of tries) {
      result = await attempt();
      if (result) break;
    }
    if (result) {
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), result });
    }
    return result;
  }

  // Coordinates → the street address there ({ street, city, state (2 letters), postcode }), or
  // null. For "Use My Location" when adding a delivery address.
  async function reverse([lat, lon]) {
    const key = `rev:${Number(lat).toFixed(5)},${Number(lon).toFixed(5)}`;
    const hit = cache.get(key);
    if (hit && hit.at > Date.now() - CACHE_DAYS * 864e5) return hit.result;
    let result = null;
    try {
      const params = new URLSearchParams({ lat: String(lat), lon: String(lon), format: "jsonv2", addressdetails: "1", zoom: "18" });
      const res = await throttled(() => fetch(`${BASE}/reverse?${params}`, { headers: { "User-Agent": userAgent, "Accept-Language": "en" }, signal: AbortSignal.timeout(8000) }));
      if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
      const a = ((await res.json()) as any)?.address || {};
      const state = /^US-([A-Z]{2})$/.exec(a["ISO3166-2-lvl4"] || "")?.[1] || "";
      const street = [a.house_number, a.road].filter(Boolean).join(" ");
      result = street && state ? { street, city: a.city || a.town || a.village || a.suburb || "", state, postcode: String(a.postcode || "").slice(0, 5) } : null;
    } catch (error) {
      console.error("[geo] reverse failed:", error.message);
      return null;
    }
    if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
    cache.set(key, { at: Date.now(), result });
    return result;
  }

  return { geocode, geocodeAddress, reverse };
}
