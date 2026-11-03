// Research on businesses that could buy wholesale: what their own website and Instagram say, their
// Google Maps listing, and how well they fit, with where each fact came from.
//
// Free on its own: our server reads the business's website itself, Instagram goes through Meta's
// Business Discovery (server/instagram.ts), and finding businesses uses OpenStreetMap. With
// ANYAPI_API_KEY set in Render, AnyAPI (getanyapi.com, @getanyapi/sdk) adds Google Maps (finding
// businesses, ratings and reviews), reads websites ours can't (pages built with JavaScript), and
// looks up Instagram accounts Meta can't see, and finds who runs a business (Find Contacts) for
// the first email. AnyAPI charges per call; every call is counted
// against a monthly limit the team sets (budget below), and the cost is stored with the result.
//
// Nothing is guessed: a fact is only kept with the page it came from and when it was read, and
// anything not found is left out (the back office shows it as unknown). Brands a business names
// on its site are kept as just that, never as "their supplier".

import { AnyAPI, AnyAPIError } from "@getanyapi/sdk";
import { lookup } from "node:dns/promises";
import net from "node:net";
import { distanceKm } from "./geo.ts";

export class ResearchError extends Error {
  declare status: any;
  constructor(message, status = 502) {
    super(message);
    this.status = status;
  }
}

const UA = "Mimi Food wholesale research (+https://mimifood.com)";
const MAX_BYTES = 1_500_000;
const MILE_KM = 1.609344;
const OVERPASS = (process.env.OVERPASS_URL || "https://overpass-api.de/api/interpreter").replace(/\/$/, "");

/* ── What someone typed: a website or an Instagram ─────────── */

// "@bluebottle", "instagram.com/bluebottle", "bluebottlecoffee.com" → { instagram } or { website }.
export function parseSite(raw) {
  const s = String(raw || "").trim();
  if (!s) return {};
  const ig = s.match(/^@([\w.]{1,30})$/) || s.match(/^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([\w.]{1,30})\/?(?:[?#].*)?$/i);
  if (ig) return { instagram: ig[1].toLowerCase() };
  try {
    const u = new URL(/^https?:\/\//i.test(s) ? s : `https://${s}`);
    if (!/^[\w.-]+\.[a-z]{2,}$/i.test(u.hostname)) return {};
    return { website: `${u.protocol}//${u.hostname}${u.pathname === "/" ? "" : u.pathname}` };
  } catch {
    return {};
  }
}

const PERSONAL_INBOX = /@(gmail|googlemail|yahoo|ymail|hotmail|outlook|live|msn|icloud|me|mac|aol|proton|protonmail|pm|gmx|mail|zoho|yandex)\.[a-z.]+$/i;

const domainOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
};

/* ── Reading a website ourselves ───────────────────────────── */

// Only public web servers: never this machine, the private network or cloud metadata addresses.
function privateIp(ip) {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b < 128) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b < 32) || (a === 192 && b === 168) || a >= 224;
  }
  const v = ip.toLowerCase();
  const mapped = v.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateIp(mapped[1]);
  return v === "::" || v === "::1" || /^f[cd]/.test(v) || /^fe[89ab]/.test(v) || /^ff/.test(v);
}

async function checkPublic(url, allowPrivate) {
  let u;
  try {
    u = new URL(url);
  } catch {
    throw new ResearchError("That isn't a web address.", 400);
  }
  if (!/^https?:$/.test(u.protocol) || u.username || u.password) throw new ResearchError("Only http and https addresses can be read.", 400);
  if (allowPrivate) return u;
  if (u.port && !["80", "443"].includes(u.port)) throw new ResearchError("That address can't be read.", 400);
  const host = u.hostname.replace(/^\[|\]$/g, "");
  if (/^localhost$|\.local$|\.internal$/i.test(host)) throw new ResearchError("That address can't be read.", 400);
  const addrs = net.isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length) throw new ResearchError("That website couldn't be found.", 404);
  if (addrs.some((a) => privateIp(a.address))) throw new ResearchError("That address can't be read.", 400);
  return u;
}

// A page's HTML, following up to 4 redirects (each checked again), at most 1.5 MB, 10 seconds.
async function fetchHtml(url, { allowPrivate = false } = {}) {
  let at = url;
  for (let hop = 0; hop < 5; hop++) {
    const u = await checkPublic(at, allowPrivate);
    let res;
    try {
      res = await fetch(u, { redirect: "manual", headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" }, signal: AbortSignal.timeout(10000) });
    } catch (error) {
      throw new ResearchError(error.name === "TimeoutError" ? "The website took too long to answer." : "Couldn't reach the website.", 504);
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      at = new URL(res.headers.get("location"), u).toString();
      continue;
    }
    if (!res.ok) throw new ResearchError("The website didn't load.", 502);
    if (!/html/i.test(res.headers.get("content-type") || "")) throw new ResearchError("That address isn't a web page.", 400);
    const reader = res.body.getReader();
    const chunks = [];
    let size = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_BYTES) {
          await reader.cancel();
          break;
        }
        chunks.push(value);
      }
    } catch {
      throw new ResearchError("The website stopped answering.", 504);
    }
    return { url: u.toString(), html: Buffer.concat(chunks).toString("utf8") };
  }
  throw new ResearchError("The website didn't load.", 502);
}

const decode = (s) =>
  String(s || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;|&rsquo;|&#8217;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();

const metaTag = (html, key) => decode(html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${key}["'][^>]*content=["']([^"']*)`, "i"))?.[1] || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${key}["']`, "i"))?.[1]);

// Roasters and tea brands a café might name on its menu. Kept only as "names X on its site".
const BRANDS = ["Blue Bottle", "Intelligentsia", "Stumptown", "Counter Culture", "Verve", "Onyx", "Heart Coffee", "Sightglass", "Coava", "Ritual", "Four Barrel", "La Colombe", "Lavazza", "illy", "Peet's", "Starbucks", "Equator", "Klatch", "Go Get Em Tiger", "Canyon Coffee", "Cognoscenti", "Proud Mary", "Dayglow", "Heirloom", "Tartine", "Partners Coffee", "Parlor Coffee", "Joe Coffee", "Rishi", "Harney", "Mariage Frères", "Kusmi", "Ippodo", "Song Tea", "Steven Smith", "Art of Tea", "Leaves and Flowers"];
const PROGRAM = { coffee: /\b(espresso|cortado|cappuccino|latte|pour[- ]?over|drip coffee|cold brew|flat white|americano|macchiato|single[- ]origin)\b/gi, tea: /\b(matcha|oolong|sencha|hojicha|chai|loose[- ]leaf|green tea|black tea|pu[- ]?erh|herbal tea|tea service|afternoon tea)\b/gi };
const SPECIALTY = /\b(specialty coffee|specialty tea|single[- ]origin|third[- ]wave|direct trade|small[- ]batch|house[- ]made|locally roasted|seasonal menu|farm[- ]to[- ]table|natural wine|chef[- ]driven|artisan)\b/gi;
const CATERING = /\b(catering|private events|corporate orders|office (?:coffee|catering))\b/gi;
const RETAIL = /\b(shop online|retail|our shop|gift shop|pantry|market|grocery|beans to go|whole bean)\b/gi;
const LOCATIONS = /\b(\d{1,2}|two|three|four|five|six|seven|eight|nine|ten) (?:locations|cafes|cafés|shops|stores|restaurants|hotels|properties)\b/i;
const WORDS = { two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };

const uniq = (list) => [...new Set(list.map((s) => s.toLowerCase()))];

/* A business that roasts its own coffee (and sells its own beans) never buys ours. */
const ROASTER_NAME = /\b(roasters?|roastery|roasteries|roasting|roastworks|roast ?house|micro[- ]?roaster)\b/i;
const OWN_ROAST = /\b(we roast|roasted (?:in[- ]house|on[- ]site|here|by us|in our)|(?:in[- ]house|house|self)[- ]roasted|our (?:own )?roastery|our own roaster|our roasting|roast(?:ing)? our own|our own (?:beans|roasts?)|(?:we are|we're|we’re) an? (?:[^\s.,!?]+ ){0,3}roast(?:er|ery))\b/gi;
const BEAN_SHOP = /\b(whole bean|shop (?:our )?(?:coffees?|beans)|bags? of (?:our )?coffee|12 ?oz bag|340 ?g)\b/gi;
// Doing what we do: roasting, selling coffee or tea wholesale or by subscription, sourcing it
// themselves. [what it is, phrase]. "House-roasted turkey" isn't coffee: "house-roasted" counts
// only before a coffee word, and every other phrase only in a sentence about coffee or tea.
const RIVAL: [string, RegExp][] = [
  ["Roasts its own coffee", OWN_ROAST],
  ["Sells coffee or tea wholesale", /\b(wholesale (?:[\w-]+ ){0,2}(?:coffee(?! (?:shops?|bars?|houses?))|teas?(?! (?:shops?|houses?|rooms?))|beans)|(?:coffee|teas?|beans) wholesale|wholesale (?:inquir\w*|program|partners?|partnerships?|accounts?|pricing))\b/gi],
  ["Sells coffee or tea subscriptions", /\b((?:coffee|tea|bean) (?:subscriptions?|club)|subscribe (?:and|&) save|subscribe to (?:our )?(?:coffee|tea|beans))\b/gi],
  ["Sources its own coffee or tea", /\b(we source (?:[\w-]+ ){0,3}(?:coffee|teas?|beans)|sourced directly|we buy directly|our (?:farmers|producers|farm partners)|origin trips?|sourcing trips?|green coffee|coffee importers?|import(?:er|ers|ing) (?:coffee|tea)|our own (?:farm|estate))\b/gi],
];
// Coffee or tea as what they sell ("coffee shops" are who a bakery sells to, not what it sells).
const CONTEXT = /coffee(?! (?:shops?|bars?|houses?))|beans?\b|espresso|roast|single[- ]origin|\btea\b(?! (?:shops?|houses?|rooms?))|teas\b|matcha|oolong/i;
function sameAsUs(text) {
  const t = String(text || "");
  for (const [label, re] of RIVAL) {
    for (const m of t.matchAll(re)) {
      const after = t.slice(m.index + m[0].length);
      if (/^(?:in[- ]house|house|self)[- ]roasted$/i.test(m[0])) {
        if (/^\s+(?:[\w-]+\s+)?(?:coffee|beans|espresso)/i.test(after)) return { label, said: m[0] };
        continue;
      }
      if (/^we/i.test(m[0]) && /roast(?:er|ery)$/i.test(m[0])) return { label, said: m[0] };
      // This sentence and the one before it.
      const stop = (i) => Math.max(t.lastIndexOf(".", i), t.lastIndexOf("!", i), t.lastIndexOf("?", i));
      const start = stop(stop(m.index) - 1) + 1;
      const end = after.search(/[.!?]/);
      const near = t.slice(start, m.index + m[0].length + (end < 0 ? after.length : end));
      if (CONTEXT.test(near)) return { label, said: m[0] };
    }
  }
  return null;
}

// What one page says: { title, description, text, links, ld } (ld: schema.org business data).
function readPage(html, url) {
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]).slice(0, 200);
  const description = (metaTag(html, "description") || metaTag(html, "og:description")).slice(0, 400);
  const siteName = metaTag(html, "og:site_name").slice(0, 120);
  const ld = [];
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const walk = (x) => {
        if (Array.isArray(x)) return x.forEach(walk);
        if (!x || typeof x !== "object") return;
        if (x["@graph"]) walk(x["@graph"]);
        const types = [].concat(x["@type"] || []).join(" ");
        if (/LocalBusiness|Cafe|Coffee|Restaurant|Hotel|Store|Bakery|FoodEstablishment|Organization/i.test(types)) ld.push(x);
      };
      walk(JSON.parse(m[1]));
    } catch {}
  }
  const links = [...html.matchAll(/<a\b[^>]*href=["']([^"'#][^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi)]
    .map((m) => {
      try {
        return { href: new URL(decode(m[1]), url).toString(), text: decode(m[2].replace(/<[^>]+>/g, " ")).slice(0, 80) };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(0, 600);
  const text = decode(
    html
      .replace(/<(script|style|noscript|svg|template)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
  ).slice(0, 200_000);
  return { url, title, siteName, description, text, links, ld };
}

// Facts from a website's pages: [{ key, label, value, source }].
function siteFacts(pages) {
  const facts = [];
  const add = (key, label, value, source) => value && facts.push({ key, label, value: String(value).slice(0, 300), source });
  const home = pages[0];
  add("description", "What they say", home.description || home.title, home.url);
  const own = [home.siteName, home.title.split(/\s[|–—-]\s/)[0]].find((n) => ROASTER_NAME.test(n || ""));
  if (own) add("rival", "Roasts its own coffee", `Their site: ${own}`, home.url);
  for (const p of pages) {
    for (const b of p.ld) {
      const a = b.address && typeof b.address === "object" ? [].concat(b.address)[0] : null;
      if (a) add("address", "Address", [a.streetAddress, a.addressLocality, a.addressRegion].filter(Boolean).join(", "), p.url);
      if (b.telephone) add("phone", "Phone", b.telephone, p.url);
      if (typeof b.email === "string") add("email", "Email", b.email.replace(/^mailto:/i, ""), p.url);
      if (b.priceRange) add("price", "Price range", b.priceRange, p.url);
      const branches = [].concat(b.department || b.subOrganization || b.location || []).length;
      if (branches > 1) add("locations", "Locations", `${branches} listed`, p.url);
    }
  }
  const all = pages.flatMap((p) => p.links.map((l) => ({ ...l, page: p.url })));
  const ig = all.map((l) => ({ ...l, h: l.href.match(/instagram\.com\/([\w.]{2,30})\/?(?:[?#]|$)/i)?.[1] })).find((l) => l.h && !/^(p|reel|explore|stories|accounts)$/i.test(l.h));
  if (ig) add("instagram", "Instagram", `@${ig.h.toLowerCase()}`, ig.page);
  const mail = all.find((l) => /^mailto:/i.test(l.href) && /@/.test(l.href));
  if (mail && !facts.some((f) => f.key === "email")) add("email", "Email", decodeURIComponent(mail.href.replace(/^mailto:/i, "").split("?")[0]), mail.page);
  const contact = all.find((l) => /contact/i.test(l.href + l.text) && domainOf(l.href) === domainOf(home.url));
  if (contact) add("contactPage", "Contact page", contact.href, contact.page);
  for (const p of pages) {
    const coffee = uniq(p.text.match(PROGRAM.coffee) || []);
    if (coffee.length) add("coffee", "Coffee on the menu", coffee.slice(0, 6).join(", "), p.url);
    const tea = uniq(p.text.match(PROGRAM.tea) || []);
    if (tea.length) add("tea", "Tea on the menu", tea.slice(0, 6).join(", "), p.url);
    const special = uniq(p.text.match(SPECIALTY) || []);
    if (special.length) add("specialty", "How they describe themselves", special.slice(0, 5).join(", "), p.url);
    const brands = BRANDS.filter((b) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}\\b`, "i").test(p.text));
    if (brands.length) add("brands", "Brands named on their site", brands.join(", "), p.url);
    const cat = uniq(p.text.match(CATERING) || []);
    if (cat.length) add("catering", "Also offers", cat.slice(0, 4).join(", "), p.url);
    const retail = uniq(p.text.match(RETAIL) || []);
    if (retail.length) add("retail", "Sells to take home", retail.slice(0, 4).join(", "), p.url);
    const loc = p.text.match(LOCATIONS);
    if (loc) add("locations", "Locations", loc[0], p.url);
    const rival = sameAsUs(`${p.description} ${p.text}`);
    if (rival) add("rival", rival.label, `“${rival.said}”`, p.url);
  }
  // Bags of coffee for sale, with no other roaster named: their own beans.
  const shop = uniq(pages.flatMap((p) => p.text.match(BEAN_SHOP) || []));
  const named = BRANDS.some((b) => pages.some((p) => new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}\\b`, "i").test(p.text)));
  if (shop.length >= 2 && !named) add("beans", "Sells its own beans", shop.slice(0, 3).join(", "), pages.find((p) => p.text.match(BEAN_SHOP))?.url || home.url);
  // One of each (the first page that said it), except the program and brand lines, kept per page.
  const seen = new Set();
  return facts.filter((f) => {
    const k = ["coffee", "tea", "brands"].includes(f.key) ? `${f.key}:${f.value}` : f.key;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ── Fit ───────────────────────────────────────────────────── */

// A business that does what we do (a roaster, or a coffee or tea brand that sells wholesale, by
// subscription or sources its own) won't buy from us: { tag, label, why, source } or null.
const RIVAL_CATEGORY = /roast|coffee (?:store|wholesaler|supplier|manufacturer|distributor|importer)|tea (?:wholesaler|manufacturer|supplier|importer|distributor)|green coffee/i;
// A brand's own café, by name ("Heirloom" or "Ritual" alone is too common a name to count).
const PLAIN_WORD_BRANDS = ["Heirloom", "Ritual", "Onyx", "Equator", "Verve", "Tartine", "Klatch"];
const brandIn = (name) => BRANDS.find((b) => (!PLAIN_WORD_BRANDS.includes(b) || /coffee|\btea\b/i.test(name || "")) && new RegExp(`\\b${b.replace(/[.*+?^${}()|[\]\\']/g, "\\$&")}\\b`, "i").test(name || ""));
export function roasterCheck(p, facts = []) {
  const out = (label, why, source) => ({ tag: /roast/i.test(label) ? "Roaster" : "Competitor", label, why, source: source || "" });
  if (ROASTER_NAME.test(p.name || "")) return out("Roasts its own coffee", `Their name: ${p.name}`, p.mapsUrl);
  const brand = brandIn(p.name);
  if (brand) return out("A coffee or tea brand", `${brand}, by their name`, p.mapsUrl);
  const cat = facts.find((f) => f.key === "category" && RIVAL_CATEGORY.test(f.value));
  if (cat) return out(/roast/i.test(cat.value) ? "Roasts its own coffee" : "Sells coffee or tea", `${cat.label}: ${cat.value}`, cat.source);
  const own = facts.find((f) => ["rival", "roasts", "beans"].includes(f.key));
  if (own) return out(own.label, own.value, own.source);
  // What they say about themselves (naming another roaster doesn't count).
  for (const f of facts.filter((x) => x.key === "description" || x.key === "bio")) {
    const said = sameAsUs(f.value);
    if (said) return out(said.label, `${f.label}: “${said.said}”`, f.source);
  }
  return null;
}

const FIT_CATEGORY = /caf[eé]|coffee|tea|bakery|bakeries|patisserie|restaurant|bistro|brunch|breakfast|hotel|inn|lodging|deli|grocer|market|dessert|ice cream|juice|wine bar|office|cowork|retail|shop/i;

// How well a business fits, out of 100: each signal needs a fact behind it (shown with its source).
// weights: SITE.prospectWeights in js/data.ts. Returns { score, signals: [{ key, label, points, max, why, source }] }.
// A roaster scores 0, with why in out.
export function fitScore(p, facts, { weights, home, localMiles }) {
  const f = (key) => facts.filter((x) => x.key === key);
  const signals = [];
  const sig = (key, label, ok, why, source) => signals.push({ key, label, max: weights[key], points: ok ? weights[key] : 0, why: ok ? why : "", source: ok ? source : "" });

  const cat = f("category").find((x) => FIT_CATEGORY.test(x.value));
  sig("category", "Café, restaurant, hotel or shop", Boolean(cat), cat && cat.value, cat?.source);

  const program = f("coffee")[0] || f("tea")[0];
  sig("program", "Coffee or tea program", Boolean(program), program && `${program.label}: ${program.value}`, program?.source);

  const rating = f("rating")[0];
  const special = f("specialty")[0] || (rating && rating.stars >= 4.5 && rating.reviews >= 100 ? rating : null) || f("price").find((x) => /\${3,}/.test(x.value));
  sig("specialty", "Specialty or premium", Boolean(special), special && (special.key === "rating" ? `Rated ${special.value}` : special.value), special?.source);

  const more = f("locations")[0] || f("catering")[0] || f("retail")[0];
  sig("potential", "Several locations, catering or retail", Boolean(more), more && `${more.label}: ${more.value}`, more?.source);

  const contact = f("email")[0] || f("contactPage")[0] || f("phone")[0];
  sig("contact", "Public business contact", Boolean(contact), contact && `${contact.label}: ${contact.value}`, contact?.source);

  const near = home && p.point ? distanceKm(home, p.point) / MILE_KM : null;
  const local = near != null && near <= localMiles;
  sig("territory", `Within ${localMiles} miles`, local, local && `${Math.round(near)} miles from the roastery`, f("address")[0]?.source || p.mapsUrl || "");

  const out = roasterCheck(p, facts);
  return { score: out ? 0 : signals.reduce((n, s) => n + s.points, 0), signals, ...(out && { out }) };
}

/* ── The service ───────────────────────────────────────────── */

// budget: { left(): number (USD this month, Infinity for no limit), spend(usd, what) }.
export function createResearch({ apiKey = "", baseUrl = "", instagram, authenticity, geocoder, budget, allowPrivate = false }) {
  const anyapi = apiKey ? new AnyAPI({ apiKey, ...(baseUrl && { baseUrl }), maxRetries: 1, timeoutMs: 90_000 }) : null;
  const paid = () => Boolean(anyapi);

  // One AnyAPI call, within the month's limit. Not found → null (no charge beyond what it says).
  async function run(slug, input, what) {
    if (!anyapi) throw new ResearchError("Lookups aren't connected yet.", 503);
    if (budget.left() <= 0) throw new ResearchError("This month's lookup limit is used up. Raise it in Wholesale → Prospects.", 402);
    let res;
    try {
      res = await anyapi.run<any>(slug, input);
    } catch (error) {
      if (error instanceof AnyAPIError) throw new ResearchError("The lookup didn't work. Try again later.", error.status === 402 ? 402 : 502);
      throw error;
    }
    if (res.costUsd) await budget.spend(res.costUsd, what);
    return { data: res.output?.found ? res.output.data : null, cost: res.costUsd || 0 };
  }

  // A website: the home page, then its menu and locations or about page if it links them.
  async function readSite(website) {
    let first;
    let cost = 0;
    try {
      first = await fetchHtml(website, { allowPrivate }).catch((error) => {
        // Some small sites still have no https.
        if (error instanceof ResearchError && error.status === 504 && /^https:/i.test(website)) return fetchHtml(website.replace(/^https:/i, "http:"), { allowPrivate });
        throw error;
      });
    } catch (error) {
      if (!(error instanceof ResearchError) || !paid() || error.status === 400) throw error;
      // Blocked us or needs a browser: AnyAPI renders it.
      const r = await run("web.scrape", { url: website, formats: ["html"], blockAds: true }, `read ${domainOf(website)}`);
      cost += r.cost;
      if (!r.data?.html) throw error;
      first = { url: r.data.url || website, html: r.data.html };
    }
    const home = readPage(first.html, first.url);
    // A page built entirely by JavaScript (almost no text, only scripts) needs a browser.
    if (home.text.length < 120 && /<script[^>]+src=/i.test(first.html) && paid()) {
      const r = await run("web.scrape", { url: first.url, formats: ["html"], blockAds: true, waitFor: 2000 }, `read ${domainOf(first.url)}`).catch(() => null);
      if (r?.data?.html) {
        cost += r.cost;
        Object.assign(home, readPage(r.data.html, first.url));
      }
    }
    const pages = [home];
    const host = domainOf(home.url);
    const wanted = [/menu/i, /locations?|visit|find[- ]us|about/i];
    for (const re of wanted) {
      const link = home.links.find((l) => domainOf(l.href) === host && re.test(`${new URL(l.href).pathname} ${l.text}`) && !pages.some((p) => p.url === l.href) && !/\.(pdf|jpe?g|png)$/i.test(l.href));
      if (!link) continue;
      try {
        const sub = await fetchHtml(link.href, { allowPrivate });
        pages.push(readPage(sub.html, sub.url));
      } catch {}
    }
    return { pages, facts: siteFacts(pages), name: home.siteName || home.title.split(/\s[|–—-]\s/)[0], cost };
  }

  // An Instagram account: Meta first (free); AnyAPI for what Meta can't see.
  // Returns { facts, check } — check is the authenticity estimate when there are posts to judge.
  async function readInstagram(handle) {
    const source = `https://www.instagram.com/${handle}/`;
    let prof = null;
    let cost = 0;
    if (instagram.configured()) {
      try {
        prof = await instagram.profile(handle);
      } catch (error) {
        if (!paid() || error.status !== 404) throw new ResearchError(error.message, error.status || 502);
      }
    }
    let extra: any = {};
    if (!prof) {
      if (!paid()) throw new ResearchError("Instagram isn't connected yet.", 503);
      const p = await run("instagram.profile", { handle }, `Instagram @${handle}`);
      cost += p.cost;
      if (!p.data) throw new ResearchError("Couldn't see this account: it may be private or misspelled.", 404);
      const posts = p.data.private ? null : await run("instagram.user_posts", { handle }, `Instagram @${handle} posts`).catch(() => null);
      cost += posts?.cost || 0;
      prof = {
        username: p.data.handle || handle,
        name: p.data.displayName || "",
        followers: Number(p.data.followers) || 0,
        posts: Number(p.data.posts) || 0,
        bio: p.data.bio || "",
        avatar: p.data.avatarUrl || "",
        recent: (posts?.data?.posts || []).filter((m) => m.username?.toLowerCase() === handle.toLowerCase()).slice(0, 12).map((m) => ({ likes: m.countsHidden ? null : m.likes ?? null, comments: Number(m.comments) || 0, at: m.createdUtc ? new Date(m.createdUtc * 1000).toISOString() : null })),
      };
      extra = { category: p.data.category, website: p.data.externalUrl, private: p.data.private, via: "AnyAPI" };
    }
    const facts = [
      { key: "followers", label: "Instagram followers", value: String(prof.followers), source },
      prof.bio && { key: "bio", label: "Instagram bio", value: prof.bio.slice(0, 300), source },
      extra.category && { key: "category", label: "Instagram category", value: extra.category, source },
      extra.website && { key: "igWebsite", label: "Website on Instagram", value: extra.website, source },
    ].filter(Boolean);
    const check = prof.recent?.length ? authenticity(prof) : null;
    return { profile: prof, facts, check, cost, via: extra.via || "Meta" };
  }

  // A business's Google Maps listing (AnyAPI): { facts, place } or null.
  async function readMaps(name, location) {
    const r = await run("maps.place", { query: name, ...(location && { location }) }, `Google Maps: ${name}`);
    const it = r.data?.items?.[0];
    if (!it) return { facts: [], place: null, cost: r.cost };
    const source = it.url;
    const facts = [
      it.category && { key: "category", label: "Google Maps category", value: [it.category, ...(it.categories || []).filter((c) => c !== it.category)].slice(0, 4).join(", "), source },
      it.rating != null && { key: "rating", label: "Google rating", value: `${it.rating}★ from ${it.reviewsCount ?? 0} reviews`, stars: it.rating, reviews: it.reviewsCount ?? 0, source },
      it.address && { key: "address", label: "Address", value: it.address, source },
      it.phone && { key: "phone", label: "Phone", value: it.phone, source },
      it.priceLevel && { key: "price", label: "Price level", value: it.priceLevel, source },
      it.permanentlyClosed && { key: "closed", label: "Permanently closed", value: "Yes, on Google Maps", source },
    ].filter(Boolean);
    return { facts, place: it, cost: r.cost };
  }

  // Finding businesses: Google Maps through AnyAPI, else OpenStreetMap (free).
  const OSM_TYPES = {
    cafe: '[amenity=cafe]',
    restaurant: '[amenity=restaurant]',
    hotel: '[tourism~"^(hotel|guest_house)$"]',
    bakery: '[shop~"^(bakery|pastry|confectionery)$"]',
    tea: '[shop=tea]',
    grocer: '[shop~"^(deli|greengrocer|health_food|organic)$"]',
    office: '[amenity=coworking_space]',
  };
  // Google Maps places → prospects.
  const fromMaps = (items) =>
    items
      .filter((it) => !it.permanentlyClosed)
      .map((it) => ({
        ref: `g:${it.placeId}`,
        name: it.name,
        category: it.category || "",
        address: it.address || "",
        city: it.city || "",
        point: it.latitude != null ? [it.latitude, it.longitude] : null,
        website: it.website || "",
        phone: it.phone || "",
        mapsUrl: it.url,
        roaster: ROASTER_NAME.test(it.name || "") || Boolean(brandIn(it.name)) || RIVAL_CATEGORY.test(`${it.category || ""} ${(it.categories || []).join(" ")}`),
        facts: [
          it.category && { key: "category", label: "Google Maps category", value: it.category, source: it.url },
          it.rating != null && { key: "rating", label: "Google rating", value: `${it.rating}★ from ${it.reviewCount ?? 0} reviews`, stars: it.rating, reviews: it.reviewCount ?? 0, source: it.url },
          it.address && { key: "address", label: "Address", value: it.address, source: it.url },
          it.phone && { key: "phone", label: "Phone", value: it.phone, source: it.url },
          it.priceLevel && { key: "price", label: "Price level", value: it.priceLevel, source: it.url },
        ].filter(Boolean),
      }));

  // area: a place name; or point: [lat, lon] to search around (near one of our accounts).
  async function discover({ area = "", point = null, type, query }) {
    if (paid() && point) {
      const r = await run("maps.search_nearby", { query, coordinates: { latitude: point[0], longitude: point[1] }, zoom: 15 }, `Google Maps near ${point.map((x) => x.toFixed(3)).join(",")}: ${query}`);
      return { source: "Google Maps", cost: r.cost, places: fromMaps(r.data?.items || []) };
    }
    if (paid()) {
      const r = await run("maps.search", { query, location: area, limit: 20 }, `Google Maps search: ${query} in ${area}`);
      return { source: "Google Maps", cost: r.cost, places: fromMaps(r.data?.items || []) };
    }
    const center = point || (await geocoder.geocode(area));
    if (!center) throw new ResearchError("Couldn't find that area. Try a city and state, like Los Angeles, CA.", 400);
    const around = `(around:6000,${center[0]},${center[1]})`;
    const q = `[out:json][timeout:25];nwr${around}${OSM_TYPES[type] || OSM_TYPES.cafe}[name];out center tags 120;`;
    let data;
    try {
      const res = await fetch(OVERPASS, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": UA }, body: new URLSearchParams({ data: q }), signal: AbortSignal.timeout(30000) });
      if (!res.ok) throw new Error(`Overpass responded ${res.status}`);
      data = await res.json();
    } catch (error) {
      throw new ResearchError("The map search didn't work. Try again in a minute.", 502);
    }
    const places = (data.elements || [])
      .map((e) => {
        const t = e.tags || {};
        const point = e.lat != null ? [e.lat, e.lon] : e.center ? [e.center.lat, e.center.lon] : null;
        const source = `https://www.openstreetmap.org/${e.type}/${e.id}`;
        const address = [[t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" "), t["addr:city"]].filter(Boolean).join(", ");
        const raw = (t.amenity || t.shop || t.tourism || "").replace(/_/g, " ");
        const kind = raw && raw[0].toUpperCase() + raw.slice(1);
        return {
          ref: `osm:${e.type}/${e.id}`,
          name: t.name,
          category: kind,
          chain: Boolean(t.brand || t["brand:wikidata"]),
          roaster: t.craft === "coffee_roaster" || t.shop === "coffee" || /yes|roast/i.test(t.roastery || t.coffee_roaster || "") || ROASTER_NAME.test(t.name || "") || Boolean(brandIn(t.name)),
          address,
          city: t["addr:city"] || "",
          point,
          website: t.website || t["contact:website"] || "",
          phone: t.phone || t["contact:phone"] || "",
          mapsUrl: source,
          facts: [
            kind && { key: "category", label: "OpenStreetMap category", value: kind, source },
            address && { key: "address", label: "Address", value: address, source },
            (t.phone || t["contact:phone"]) && { key: "phone", label: "Phone", value: t.phone || t["contact:phone"], source },
            (t.email || t["contact:email"]) && { key: "email", label: "Email", value: t.email || t["contact:email"], source },
            t["contact:instagram"] && { key: "instagram", label: "Instagram", value: `@${String(t["contact:instagram"]).replace(/^.*instagram\.com\//i, "").replace(/[/@]/g, "")}`, source },
          ].filter(Boolean),
        };
      })
      .filter((p) => p.name && !p.chain);
    // Nearest first, at most 40.
    places.sort((a, b) => (a.point && b.point ? distanceKm(center, a.point) - distanceKm(center, b.point) : 0));
    return { source: "Map listings", cost: 0, places: places.slice(0, 40) };
  }

  // A customer's public work profile, for our team only (Customers → Look Up): job, company and
  // public profile links. Only these are kept: never home address, phone, personal emails or
  // employment history, even when the source has them.
  async function lookupPerson(email) {
    const r = await run("apollo.person_enrich", { email }, `person lookup`);
    const d = r.data;
    if (!d || (!d.title && !d.organization?.name && !d.linkedinUrl)) return { found: false, cost: r.cost };
    const o = d.organization || {};
    const url = (u) => (typeof u === "string" && /^https:\/\/([\w-]+\.)*(linkedin\.com|x\.com|twitter\.com|github\.com)\//i.test(u) ? u : "");
    return {
      found: true,
      cost: r.cost,
      confidence: ["high", "medium", "low"].includes(d.confidence) ? d.confidence : "",
      name: d.name || "",
      photo: /^https:\/\//.test(d.image || "") ? d.image : "",
      headline: String(d.headline || "").slice(0, 200),
      title: String(d.title || "").slice(0, 120),
      seniority: String(d.seniority || "").slice(0, 40),
      city: [d.city, d.state].filter(Boolean).join(", ").slice(0, 80),
      company: o.name
        ? { name: String(o.name).slice(0, 120), domain: String(o.domain || "").slice(0, 120), industry: String(o.industry || "").slice(0, 80), size: Number(o.employeeCount) || null, locations: Number(o.retailLocationCount) || null, city: [o.city, o.state].filter(Boolean).join(", ").slice(0, 80) }
        : null,
      links: { linkedin: url(d.linkedinUrl), x: url(d.twitterUrl), github: url(d.githubUrl) },
    };
  }

  // The people who run a business, from its website's domain, for the first email: owners and
  // managers first. QuickEnrich's company contacts, then (if no one there has a work email) the
  // addresses Hunter has seen published on the domain. Only work details are kept: name, title,
  // a work email (never a personal inbox), a business line (never a mobile) and LinkedIn.
  async function findContacts(website) {
    const domain = domainOf(website);
    if (!domain) throw new ResearchError("Add their website first.", 400);
    let cost = 0;
    const people = [];
    const add = (x, source) => {
      const email = String(x.email || "").trim().toLowerCase();
      const name = [x.firstName, x.lastName].filter(Boolean).join(" ").trim();
      if (!name && !email) return;
      if (email && (PERSONAL_INBOX.test(email) || !email.endsWith(`@${domain}`) && !email.endsWith(`.${domain}`))) return;
      if (email && people.some((p) => p.email === email)) return;
      const phone = String(x.phoneType || "").toLowerCase() === "mobile" ? "" : String(x.phone || "").slice(0, 40);
      const linkedin = /^https:\/\/([\w-]+\.)*linkedin\.com\//i.test(x.linkedinUrl || "") ? x.linkedinUrl : "";
      people.push({ name: name.slice(0, 80), title: String(x.title || x.position || "").slice(0, 100), email, phone, linkedin, source });
    };
    const r = await run("people_search.quickenrich_company", { companyDomain: domain, title: "Owner, Founder, Co-Founder, General Manager, Manager, Director, Buyer, Purchasing, Operations" }, `contacts at ${domain}`);
    cost += r.cost;
    for (const x of r.data?.people || []) add(x, "QuickEnrich");
    if (!people.some((p) => p.email)) {
      const h = await run("email_finding.hunter_domain", { domain, limit: 5 }, `emails at ${domain}`).catch((error) => (error.status === 402 ? Promise.reject(error) : null));
      cost += h?.cost || 0;
      for (const x of h?.data?.emails || []) add(x, "Hunter");
    }
    const rank = (p) => (/owner|founder/i.test(p.title) ? 0 : /general manager|director|buyer|purchas/i.test(p.title) ? 1 : /manager|operations/i.test(p.title) ? 2 : p.name ? 3 : 4);
    people.sort((a, b) => rank(a) - rank(b) || Number(!a.email) - Number(!b.email));
    return { at: new Date().toISOString(), cost, people: people.slice(0, 6) };
  }

  return { paid, run, readSite, readInstagram, readMaps, discover, lookupPerson, findContacts };
}

export { domainOf };
