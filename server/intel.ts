// Insights for the back office (Insights page, Overview, Green Coffee), from AnyAPI lookups:
//
//   visibility  where Mimi Food shows up for the searches customers make: Google's results and
//               local map pack, Google's AI Overview, ChatGPT and Perplexity
//   mentions    public Instagram and TikTok posts that tag us, our places or our hashtag
//   creators    accounts like our best ambassadors, and coffee creators on TikTok, to invite
//   ideas       what people search and ask about coffee and tea, for Numeral posts and FAQs
//   prices      what other roasters charge on Google Shopping, and how well their coffees sell
//   market      the coffee futures ("C") price, for buying green coffee
//   reviews     our reviews on Google, Yelp and Tripadvisor
//   accounts    a wholesale account's locations on Google Maps (to spot a new one)
//   checkEmail  whether a big order's email can receive mail (order risk)
//
// run(slug, input, what) is server/research.ts's AnyAPI call: within the monthly limit, the cost
// counted. Every result keeps where it came from and when; nothing is inferred beyond what the
// source returned ("mentioned" means the name or website is in the answer or its sources).

// A bag's weight from its listing title ("12 oz", "340g", "2 lb", "1kg"), in grams; null when
// the title doesn't say, so a price is only compared per 250g when the weight is known.
export const grams = (title) => {
  const m = String(title || "").replace(/,/g, "").match(/(\d+(?:\.\d+)?)\s*-?\s*(kg|kilo|g|gram|grams|oz|ounce|ounces|lb|lbs|pound|pounds)\b/i);
  if (!m) return null;
  const n = Number(m[1]);
  const per = { kg: 1000, kilo: 1000, g: 1, gram: 1, grams: 1, oz: 28.35, ounce: 28.35, ounces: 28.35, lb: 453.6, lbs: 453.6, pound: 453.6, pounds: 453.6 }[m[2].toLowerCase()];
  const g = n * per;
  return g >= 100 && g <= 5000 ? Math.round(g) : null;
};
const day = (s) => (s ? new Date(s * 1000).toISOString() : null);
// Where the free coffee prices come from (overridable for local testing).
const MARKET_URLS = {
  yahoo: (process.env.MARKET_YAHOO_URL || "https://query1.finance.yahoo.com").replace(/\/$/, ""),
  stooq: (process.env.MARKET_STOOQ_URL || "https://stooq.com").replace(/\/$/, ""),
};
const clip = (s, n) => String(s || "").replace(/\s+/g, " ").trim().slice(0, n);
// What a failed lookup says on Insights: our own plain messages as they are; a service's raw
// error (codes, names, keys) as "didn't work", with the detail left to the log.
const said = (error, n) => {
  const m = clip(error?.message, n);
  if (!m || /\b\d{3}\b|HTTP|AnyAPI|\bapi\b|token|\bkey\b|ECONN|fetch|JSON|undefined/i.test(m)) {
    console.error("[insights]", m);
    return "didn't work. Try again later.";
  }
  return m;
};

export function createIntel({ run, brand, domain }) {
  const nameRe = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
  const ours = (s) => nameRe.test(String(s || "")) || String(s || "").toLowerCase().includes(domain);
  // The sentence of an answer that names us, for the card.
  const quote = (text) => {
    const hit = String(text || "").split(/(?<=[.!?])\s+/).find((x) => ours(x));
    return hit ? clip(hit, 240) : "";
  };
  const safe = async (fn) => {
    try {
      return await fn();
    } catch (error) {
      const m = said(error, 160);
      return { error: m[0].toUpperCase() + m.slice(1) };
    }
  };

  // One search, everywhere: { query, google, localPack, aiOverview, chatgpt, perplexity, cost }.
  async function visibility(query, location) {
    let cost = 0;
    const take = (r) => ((cost += r.cost || 0), r.data);
    const [g, lp, ai, gpt, px] = await Promise.all([
      safe(async () => {
        const d = take(await run("google.search", { query, gl: "us", hl: "en", ...(location && { location }) }, `Google: ${query}`));
        const hit = (d?.results || []).find((x) => ours(x.link) || ours(x.title));
        return { found: Boolean(hit), position: hit?.position ?? null, url: hit?.link || "", top: (d?.results || []).slice(0, 3).map((x) => ({ title: clip(x.title, 90), url: x.link })) };
      }),
      safe(async () => {
        const d = take(await run("seo.local_pack", { keyword: query, location: location || "Los Angeles,California,United States", limit: 10 }, `Map pack: ${query}`));
        const places = d?.places || [];
        const hit = places.find((x) => ours(x.name) || ours(x.domain) || ours(x.url));
        return { found: Boolean(hit), position: hit?.position ?? null, top: places.slice(0, 3).map((x) => ({ title: clip(x.name, 80), rating: x.rating ?? null })) };
      }),
      safe(async () => {
        const d = take(await run("google.ai_overview", { prompt: query }, `AI Overview: ${query}`));
        if (!d) return { found: false, none: true };
        const cited = (d.citations || []).some((c) => ours(c.url) || ours(c.title));
        return { found: ours(d.answer) || cited, cited, quote: quote(d.answer) };
      }),
      safe(async () => {
        const d = take(await run("chatgpt.search", { prompt: query, country: "US" }, `ChatGPT: ${query}`));
        if (!d) return { found: false, none: true };
        const cited = (d.citations || []).some((c) => ours(c.url) || ours(c.title));
        const place = (d.places || []).find((x) => ours(x.name) || ours(x.websiteUrl));
        return { found: ours(d.answer) || cited || Boolean(place), cited, quote: quote(d.answer), names: (d.places || []).slice(0, 5).map((x) => x.name) };
      }),
      safe(async () => {
        const d = take(await run("perplexity.search", { prompt: query }, `Perplexity: ${query}`));
        if (!d) return { found: false, none: true };
        const cited = (d.citations || []).some((c) => ours(c.url) || ours(c.title));
        return { found: ours(d.answer) || cited, cited, quote: quote(d.answer) };
      }),
    ]);
    return { query, at: new Date().toISOString(), google: g, localPack: lp, aiOverview: ai, chatgpt: gpt, perplexity: px, cost: Math.round(cost * 1e5) / 1e5 };
  }

  // Posts about us: tagged, at our places, with our hashtag, and on TikTok. [{ id, platform, ... }]
  async function mentions({ handle, hashtags = [], locations = [], tiktok = [] }) {
    const posts = [];
    let cost = 0;
    const errors = [];
    const ig = (kind, p) =>
      posts.push({ id: `ig:${p.id}`, platform: "Instagram", kind, author: p.author || p.username || "", caption: clip(p.caption, 400), url: p.url, likes: p.likes ?? null, comments: p.comments ?? null, views: p.views ?? null, at: day(p.createdUtc), place: p.locationName || "" });
    const step = async (what, fn) => {
      try {
        await fn();
      } catch (error) {
        errors.push(`${what}: ${said(error, 120)}`);
      }
    };
    if (handle)
      await step("Tagged", async () => {
        const r = await run("instagram.tagged_posts", { handle }, `Instagram tagged @${handle}`);
        cost += r.cost;
        for (const p of r.data?.posts || []) ig("Tagged us", p);
      });
    for (const tag of hashtags)
      await step(`#${tag}`, async () => {
        const r = await run("instagram.hashtag_top_posts", { hashtag: tag }, `Instagram #${tag}`);
        cost += r.cost;
        for (const p of r.data?.posts || []) ig(`#${tag}`, p);
      });
    for (const place of locations)
      await step(place, async () => {
        const found = await run("instagram.search_locations", { query: place }, `Instagram place ${place}`);
        cost += found.cost;
        const loc = found.data?.locations?.[0];
        if (!loc) return;
        const r = await run("instagram.location_posts", { locationId: loc.id, sort: "recent" }, `Instagram at ${loc.name}`);
        cost += r.cost;
        for (const p of r.data?.posts || []) ig(`At ${loc.name}`, p);
      });
    for (const q of tiktok)
      await step(`TikTok ${q}`, async () => {
        const r = await run("tiktok.search_keyword", { query: q, sortBy: "date-posted" }, `TikTok ${q}`);
        cost += r.cost;
        for (const v of r.data?.videos || [])
          if (ours(v.caption) || ours(v.locationName))
            posts.push({ id: `tt:${v.id}`, platform: "TikTok", kind: `"${q}"`, author: v.author || "", caption: clip(v.caption, 400), url: v.url || "", likes: v.likes ?? null, comments: v.comments ?? null, views: v.views ?? null, at: day(v.createdUtc), place: v.locationName || "", followers: v.authorFollowers ?? null });
      });
    return { posts, cost, errors };
  }

  // People to invite: Instagram's "similar" to our best ambassadors, and TikTok creators for a topic.
  async function creators({ seeds = [], topics = [] }) {
    const people = [];
    let cost = 0;
    const errors = [];
    for (const seed of seeds) {
      try {
        const r = await run("instagram.similar_profiles", { handle: seed }, `Similar to @${seed}`);
        cost += r.cost;
        for (const p of r.data?.profiles || []) if (!p.private) people.push({ id: `ig:${p.username}`, platform: "Instagram", handle: p.username, name: p.displayName || "", avatar: p.avatarUrl || "", verified: Boolean(p.verified), followers: null, bio: "", why: `Like @${seed}` });
      } catch (error) {
        errors.push(`@${seed}: ${said(error, 120)}`);
      }
    }
    for (const topic of topics) {
      try {
        const r = await run("tiktok.search_users", { query: topic }, `TikTok creators: ${topic}`);
        cost += r.cost;
        for (const u of r.data?.users || []) people.push({ id: `tt:${u.handle}`, platform: "TikTok", handle: u.handle, name: u.nickname || "", avatar: "", verified: Boolean(u.verified), followers: u.followers ?? null, bio: clip(u.bio, 200), instagram: u.instagramUrl || "", why: `TikTok: "${topic}"` });
      } catch (error) {
        errors.push(`${topic}: ${said(error, 120)}`);
      }
    }
    return { people, cost, errors };
  }

  // What people search and ask: Google Trends for a few terms, keyword ideas with volumes, and
  // recent Reddit questions.
  async function ideas({ trends = [], seeds = [], questions = [], news = [] }) {
    let cost = 0;
    const out: any = { trends: null, keywords: [], questions: [], news: [], errors: [] };
    // Recent coffee and tea news, for timely posts.
    for (const q of news)
      try {
        const r = await run("google.news", { query: q, gl: "us", hl: "en", timeframe: "1m", limit: 8 }, `News: ${q}`);
        cost += r.cost;
        for (const n of r.data?.items || []) if (!out.news.some((x) => x.url === n.url)) out.news.push({ title: clip(n.title, 200), source: n.source || "", url: n.url, snippet: clip(n.snippet, 300), at: day(n.createdUtc), topic: q });
      } catch (error) {
        out.errors.push(`News ${q}: ${said(error, 120)}`);
      }
    if (trends.length)
      try {
        const r = await run("google.trends", { keywords: trends.slice(0, 5), geo: "US", timeframe: "12m" }, "Google Trends");
        cost += r.cost;
        out.trends = (r.data?.series || []).map((s) => ({ keyword: s.keyword, points: (s.points || []).map((p) => [p.startUtc, p.value]) }));
      } catch (error) {
        out.errors.push(`Trends: ${said(error, 120)}`);
      }
    if (seeds.length)
      try {
        const r = await run("seo.keyword_ideas", { keywords: seeds.slice(0, 5), limit: 25, orderBy: "volume_desc", language: "en" }, "Keyword ideas");
        cost += r.cost;
        out.keywords = (r.data?.ideas || []).map((k) => ({ keyword: k.keyword, volume: k.searchVolume ?? null, difficulty: k.keywordDifficulty ?? null, intent: k.searchIntent || "" }));
      } catch (error) {
        out.errors.push(`Keywords: ${said(error, 120)}`);
      }
    for (const q of questions)
      try {
        const r = await run("reddit.search", { query: q, sort: "top", timeframe: "month" }, `Reddit: ${q}`);
        cost += r.cost;
        for (const p of (r.data?.posts || []).filter((p) => !p.nsfw && /\?|how|what|which|best|why/i.test(p.title)).slice(0, 6))
          out.questions.push({ title: clip(p.title, 200), subreddit: p.subreddit, score: p.score, comments: p.numComments, url: p.permalink?.startsWith("http") ? p.permalink : `https://www.reddit.com${p.permalink || ""}`, at: day(p.createdUtc), topic: q });
      } catch (error) {
        out.errors.push(`Reddit ${q}: ${said(error, 120)}`);
      }
    out.cost = cost;
    return out;
  }

  // Other roasters' prices for products like ours.
  async function prices(queries) {
    let cost = 0;
    const out = [];
    const errors = [];
    for (const q of queries) {
      try {
        const r = await run("google_shopping.search", { query: q, country: "us", language: "en", limit: 10 }, `Shopping: ${q}`);
        cost += r.cost;
        out.push({ query: q, items: (r.data?.items || []).filter((i) => !ours(i.seller) && !ours(i.brand)).map((i) => ({ title: clip(i.title, 120), seller: i.seller || i.brand || "", price: i.price ?? null, priceText: i.priceText || "", url: i.url, rating: i.rating ?? null, reviews: i.reviewsCount ?? i.reviewCount ?? i.reviews ?? null, grams: grams(i.title) })) });
      } catch (error) {
        errors.push(`${q}: ${said(error, 120)}`);
      }
    }
    return { results: out, cost, errors };
  }

  // Arabica coffee futures (ICE "C", the front month), US cents a pound. Free sources first
  // (Yahoo's futures chart, then Stooq's daily prices), then AnyAPI's Yahoo quote. A price is
  // only kept if it's believable: between 50 and 1,500 cents, and from the last five days.
  const believable = (q) => q && Number.isFinite(q.price) && q.price >= 50 && q.price <= 1500 && (!q.asOf || Date.parse(q.asOf) > Date.now() - 5 * 864e5);
  const pct = (price, prev) => (Number.isFinite(prev) && prev > 0 ? Math.round(((price - prev) / prev) * 10000) / 100 : null);
  async function fromYahoo() {
    const res = await fetch(`${MARKET_URLS.yahoo}/v8/finance/chart/KC%3DF?range=5d&interval=1d`, { headers: { "User-Agent": "Mozilla/5.0 (Mimi Food coffee price)" }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    const m = ((await res.json()) as any)?.chart?.result?.[0]?.meta;
    if (!m || !/coffee|^KC/i.test(`${m.shortName || ""} ${m.symbol || ""}`)) return null;
    const price = Number(m.regularMarketPrice);
    const prev = Number(m.previousClose ?? m.chartPreviousClose);
    return { price, previousClose: prev || null, change: prev ? Math.round((price - prev) * 100) / 100 : null, changePercent: pct(price, prev), dayLow: m.regularMarketDayLow ?? null, dayHigh: m.regularMarketDayHigh ?? null, asOf: day(m.regularMarketTime), source: "Yahoo Finance" };
  }
  async function fromStooq() {
    const res = await fetch(`${MARKET_URLS.stooq}/q/d/l/?s=kc.f&i=d`, { headers: { "User-Agent": "Mimi Food coffee price" }, signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error(`Stooq ${res.status}`);
    // Date,Open,High,Low,Close,Volume — oldest first.
    const rows = (await res.text()).trim().split(/\r?\n/).slice(1).map((l) => l.split(",")).filter((r) => /^\d{4}-\d{2}-\d{2}$/.test(r[0]) && Number(r[4]) > 0);
    const [last, prevRow] = [rows.at(-1), rows.at(-2)];
    if (!last) return null;
    const price = Number(last[4]);
    const prev = prevRow ? Number(prevRow[4]) : NaN;
    return { price, previousClose: prev || null, change: prev ? Math.round((price - prev) * 100) / 100 : null, changePercent: pct(price, prev), dayLow: Number(last[3]) || null, dayHigh: Number(last[2]) || null, asOf: new Date(`${last[0]}T21:00:00Z`).toISOString(), source: "Stooq" };
  }
  async function market(ticker = "KC=F") {
    let cost = 0;
    for (const get of [fromYahoo, fromStooq]) {
      const q = await get().catch((error) => (console.warn(`[insights] coffee price: ${error.message}`), null));
      if (believable(q)) return { found: true, ticker, name: 'Arabica coffee "C" futures (ICE)', ...q, cost };
    }
    const r = await run("yahoo_finance.quote", { ticker }, `Quote ${ticker}`).catch(() => null);
    if (!r) return { found: false, cost };
    cost += r.cost;
    const it = r.data?.items?.[0];
    const q = it && /coffee|^KC/i.test(`${it.name || ""} ${it.symbol || ""}`) ? { price: it.price, change: it.change ?? null, changePercent: it.changePercent ?? null, previousClose: it.previousClose ?? null, dayLow: it.dayLow ?? null, dayHigh: it.dayHigh ?? null, asOf: day(it.asOfUtc), source: "Yahoo Finance" } : null;
    if (!believable(q)) return { found: false, cost };
    return { found: true, ticker, name: 'Arabica coffee "C" futures (ICE)', ...q, asOf: q.asOf || new Date().toISOString(), cost };
  }

  // Our reviews elsewhere: Google (each location's listing; its place id found once and kept),
  // Yelp (rating and count: Yelp's own reviews aren't available) and Tripadvisor.
  // places: [{ id, query, placeId }]. Returns { listings, reviews, placeIds, cost, errors }.
  async function reviews({ places, yelp, tripadvisor }) {
    let cost = 0;
    const listings = [];
    const out = [];
    const errors = [];
    const placeIds = {};
    for (const pl of places) {
      try {
        let placeId = pl.placeId;
        let listing = null;
        if (!placeId) {
          const r = await run("maps.place", { query: pl.query }, `Google listing: ${pl.query}`);
          cost += r.cost;
          const it = r.data?.items?.[0];
          if (!it || !ours(it.name) && !ours(it.website)) {
            errors.push(`${pl.name}: no Google listing found for "${pl.query}"`);
            continue;
          }
          placeId = it.placeId;
          listing = { platform: "Google", name: it.name, rating: it.rating ?? null, count: it.reviewsCount ?? null, url: it.url };
        }
        placeIds[pl.id] = placeId;
        const r = await run("maps.reviews", { placeId, sort: "newest", limit: 20, postedLimit: "month" }, `Google reviews: ${pl.name}`);
        cost += r.cost;
        if (listing) listings.push(listing);
        for (const v of r.data?.items || [])
          out.push({ id: `g:${v.reviewId}`, platform: "Google", place: pl.name, author: v.author || "", rating: v.rating ?? null, text: clip(v.text, 1200), at: day(v.createdUtc), url: v.url || "", replied: Boolean(v.ownerResponse) });
      } catch (error) {
        errors.push(`${pl.name}: ${said(error, 120)}`);
      }
    }
    if (yelp)
      try {
        const r = await run("yelp.search", { query: yelp.query, location: yelp.location, limit: 10 }, `Yelp: ${yelp.query}`);
        cost += r.cost;
        for (const b of (r.data?.items || []).filter((b) => ours(b.name) && !b.is_closed))
          listings.push({ platform: "Yelp", name: b.name, rating: b.unrounded_avg_rating ?? b.avg_rating ?? null, count: b.review_count ?? null, url: b.url || "" });
      } catch (error) {
        errors.push(`Yelp: ${said(error, 120)}`);
      }
    if (tripadvisor)
      try {
        const r = await run("tripadvisor.search", { query: tripadvisor, includeHotels: false, includeAttractions: false, limit: 10 }, `Tripadvisor: ${tripadvisor}`);
        cost += r.cost;
        for (const t of (r.data?.items || []).filter((t) => ours(t.title)).slice(0, 3)) {
          listings.push({ platform: "Tripadvisor", name: t.title, rating: t.rating ?? null, count: t.reviewCount ?? null, url: t.url });
          const rv = await run("tripadvisor.reviews", { url: t.url, since: "3 months", limit: 20 }, `Tripadvisor reviews: ${t.title}`);
          cost += rv.cost;
          for (const v of rv.data?.items || [])
            out.push({ id: `ta:${v.id || v.url}`, platform: "Tripadvisor", place: t.title, author: v.author || "", rating: v.rating ?? null, text: clip([v.title, v.text].filter(Boolean).join(". "), 1200), at: day(v.createdUtc), url: v.url || t.url, replied: Boolean(v.ownerResponseText) });
        }
      } catch (error) {
        errors.push(`Tripadvisor: ${said(error, 120)}`);
      }
    return { listings, reviews: out, placeIds, cost, errors };
  }

  // How many places on Google Maps carry each wholesale account's name near its city: a new one
  // is likely a new location. accounts: [{ id, business, area }].
  async function accountLocations(accounts) {
    let cost = 0;
    const counts = {};
    const errors = [];
    const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").replace(/\b(the|cafe|coffee|llc|inc|co)\b/g, "").trim();
    for (const a of accounts) {
      try {
        const r = await run("maps.search", { query: a.business, location: a.area, limit: 20 }, `Locations: ${a.business}`);
        cost += r.cost;
        const want = norm(a.business);
        const mine = (r.data?.items || []).filter((it) => !it.permanentlyClosed && want && norm(it.name).startsWith(want));
        counts[a.id] = { count: mine.length, places: mine.slice(0, 10).map((it) => ({ name: it.name, address: it.address || "", url: it.url })) };
      } catch (error) {
        errors.push(`${a.business}: ${said(error, 120)}`);
      }
    }
    return { counts, cost, errors };
  }

  // Can this address receive mail? (For bigger orders, as part of the order's risk.)
  async function checkEmail(email) {
    const r = await run("email.verify", { email }, "email check");
    const v = r.data?.items?.[0];
    if (!v) return null;
    return { status: String(v.status || "unknown").toLowerCase(), disposable: Boolean(v.disposable), reason: clip(v.reason, 120), at: new Date().toISOString() };
  }

  return { visibility, mentions, creators, ideas, prices, market, reviews, accountLocations, checkEmail, ours };
}
