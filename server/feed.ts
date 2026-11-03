// Google Merchant Center product feed (/feeds/google.xml): every product on sale, as RSS 2.0 with
// Google's g: fields, built from the live catalog so prices, new coffees and sold-out flags are
// current each time Google fetches it. Add the URL as a scheduled fetch in Merchant Center.
//
// Its photos (/feeds/images/<item id>.jpg) are JPEGs on white, as Google asks: a product's own
// photo, or for coffees and teas the bag or cup with its label, drawn as on the site.

const xml = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
const slug = (s) =>
  String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

// A coffee's country, from its name ("Muhathi Estate AB, Kenya, Filter"); a blend's name has none.
const countryOf = (name) => {
  const parts = String(name || "").split(",").map((x) => x.trim());
  return parts.length > 2 ? parts[1] : "";
};

const COFFEE_CATEGORY = "Food, Beverages & Tobacco > Beverages > Coffee";
const TEA_CATEGORY = "Food, Beverages & Tobacco > Beverages > Tea & Infusions";
// Brewing gear is varied (drippers, spoons, papers): Google picks its category from the title.
const ACCESSORY_CATEGORY = { Apparel: "Apparel & Accessories > Clothing > Shirts & Tops" };

// Every item Google gets, one per thing a customer can buy (a coffee's 250g and 1kg are two
// items in one group; so are a tee's sizes and a dripper's colors).
export function feedItems(DATA) {
  const site = DATA.SITE;
  const items = [];
  const link = (id) => `/products/${encodeURIComponent(id)}`;
  for (const p of DATA.PRODUCTS || []) {
    if (p.price == null) continue;
    const country = countryOf(p.name);
    const about = [p.notes ? `${p.type} roast with notes of ${p.notes}.` : `${p.type} roast.`, p.about, [p.region && `Region: ${p.region}`, p.process && `Process: ${p.process}`, p.variety && `Variety: ${p.variety}`, p.altitude && `Altitude: ${p.altitude}`].filter(Boolean).join(". ")].filter(Boolean).join(" ");
    for (const [size, grams, price] of [
      ["250g", 250, p.price],
      ["1kg", 1000, p.price1kg],
    ]) {
      if (price == null) continue;
      items.push({
        id: `${p.id}-${size}`,
        group: p.id,
        title: `${p.short || p.name}${country ? `, ${country}` : ""} — ${p.type} Coffee, ${size}`,
        description: about,
        link: link(p.id),
        image: `/feeds/images/${p.id}.jpg`,
        price,
        soldOut: p.soldOut,
        category: COFFEE_CATEGORY,
        type: `Coffee > ${p.type}`,
        size,
        grams,
        unit: [`${grams}g`, "100g"],
      });
    }
  }
  for (const a of DATA.ACCESSORIES || []) {
    if (a.price == null) continue;
    const tea = a.category === "Tea";
    const description = [[].concat(a.description || a.about || []).join(" "), a.pack && `Pack: ${a.pack}.`].filter(Boolean).join(" ") || `${a.name} from ${site.name}.`;
    const base = { group: a.id, description, link: link(a.id), price: a.price, soldOut: a.soldOut, category: tea ? TEA_CATEGORY : ACCESSORY_CATEGORY[a.category], type: tea ? `Tea > ${a.type || "Tea"}` : a.category };
    if (tea) {
      items.push({ ...base, id: a.id, title: `${a.name} — ${a.blend || "Tea"}${a.pack ? `, ${a.pack}` : ""}`, image: `/feeds/images/${a.id}.jpg` });
    } else if (a.colors?.length) {
      for (const c of a.colors) items.push({ ...base, id: `${a.id}-${slug(c.name)}`, title: `${a.name}, ${c.name}`, image: `/feeds/images/${a.id}-${slug(c.name)}.jpg`, color: c.name });
    } else if (a.image) {
      const apparel = a.category === "Apparel";
      const color = apparel ? a.name.replace(/ ?(Tee|T-Shirt|Shirt)$/i, "") : "";
      for (const size of a.sizes?.length ? a.sizes : [""]) {
        items.push({ ...base, id: size ? `${a.id}-${slug(size)}` : a.id, title: `${a.name}${size ? `, ${size}` : ""}`, image: `/feeds/images/${a.id}.jpg`, ...(size && { size }), ...(apparel && { color, apparel: true }) });
      }
    }
    // Drawn accessories without a photo yet are left out: Google needs a real photo.
  }
  return items;
}

export function merchantFeed(DATA, siteUrl) {
  const site = DATA.SITE;
  const currency = site.currencyCode || "USD";
  const money = (n) => `${Number(n).toFixed(2)} ${currency}`;
  const shipping = (price) => {
    const rate = price >= site.freeShippingOver ? 0 : site.postage?.maxFee;
    return rate == null ? "" : `\n      <g:shipping><g:country>US</g:country><g:price>${money(rate)}</g:price></g:shipping>`;
  };
  const body = feedItems(DATA)
    .map(
      (it) => `    <item>
      <g:id>${xml(it.id)}</g:id>
      <g:item_group_id>${xml(it.group)}</g:item_group_id>
      <g:title>${xml(it.title.slice(0, 150))}</g:title>
      <g:description>${xml(it.description.slice(0, 5000))}</g:description>
      <g:link>${xml(siteUrl + it.link)}</g:link>
      <g:image_link>${xml(siteUrl + it.image)}</g:image_link>
      <g:availability>${it.soldOut ? "out_of_stock" : "in_stock"}</g:availability>
      <g:price>${money(it.price)}</g:price>
      <g:brand>${xml(site.name)}</g:brand>
      <g:condition>new</g:condition>
      <g:identifier_exists>no</g:identifier_exists>${it.category ? `\n      <g:google_product_category>${xml(it.category)}</g:google_product_category>` : ""}
      <g:product_type>${xml(it.type)}</g:product_type>${it.size ? `\n      <g:size>${xml(it.size)}</g:size>` : ""}${it.color ? `\n      <g:color>${xml(it.color)}</g:color>` : ""}${it.apparel ? "\n      <g:gender>unisex</g:gender>\n      <g:age_group>adult</g:age_group>" : ""}${it.unit ? `\n      <g:unit_pricing_measure>${it.unit[0]}</g:unit_pricing_measure>\n      <g:unit_pricing_base_measure>${it.unit[1]}</g:unit_pricing_base_measure>` : ""}${shipping(it.price)}
    </item>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${xml(site.name)}</title>
    <link>${xml(siteUrl)}</link>
    <description>${xml(`${site.name} products`)}</description>
${body}
  </channel>
</rss>
`;
}

// ChatGPT's product feed (/feeds/openai.jsonl, one item per line; /feeds/openai.json is the same
// items as one array), from the same items, in OpenAI's product feed fields: OpenAI's merchant
// program fetches it so Mimi Food can come up in ChatGPT shopping. Checkout stays on our site
// (is_eligible_checkout false: buying inside ChatGPT is a separate integration; we're on Square).
// Unknown values are left out, never sent as placeholders. reviews(id) gives a product's
// { count, average } or null.
export function openaiFeed(DATA, siteUrl, { reviews = (_id) => null } = {}) {
  const site = DATA.SITE;
  const currency = site.currencyCode || "USD";
  const money = (n) => `${Number(n).toFixed(2)} ${currency}`;
  const days = site.returns?.days ?? 14;
  return feedItems(DATA).map((it) => {
    const food = it.type.startsWith("Coffee") || it.type.startsWith("Tea");
    const options = { ...(it.size && { size: it.size }), ...(it.color && it.id !== it.group && !it.apparel && { color: it.color }) };
    const variant = it.id !== it.group && Object.keys(options).length > 0;
    const shipping = it.price >= site.freeShippingOver ? 0 : site.postage?.maxFee;
    const rated = reviews(it.group);
    return {
      item_id: it.id,
      ...(variant && { group_id: it.group, listing_has_variations: true, variant_dict: options }),
      title: it.title.slice(0, 150),
      description: it.description.slice(0, 5000),
      url: siteUrl + it.link + (it.grams ? `?size=${encodeURIComponent(it.size)}` : ""),
      brand: site.name,
      seller_name: site.name,
      seller_url: siteUrl,
      image_url: siteUrl + it.image,
      price: money(it.price),
      availability: it.soldOut ? "out_of_stock" : "in_stock",
      condition: "new",
      ...(it.category || it.type ? { product_category: it.category || it.type } : {}),
      ...(it.size && { size: it.size }),
      ...(it.color && { color: it.color }),
      ...(it.apparel && { gender: "unisex", age_group: "adult" }),
      ...(it.grams && { weight: String(it.grams), item_weight_unit: "g" }),
      ...(shipping != null && { shipping_price: money(shipping) }),
      // Coffee and tea are final sale; gear can come back within the window.
      accepts_returns: !food,
      ...(!food && { return_deadline_in_days: days }),
      return_policy: `${siteUrl}/shipping-returns`,
      ...(rated?.count > 0 && { review_count: rated.count, star_rating: Number(rated.average).toFixed(2) }),
      is_eligible_search: true,
      is_eligible_checkout: false,
      seller_privacy_policy: `${siteUrl}/privacy`,
      seller_tos: `${siteUrl}/terms`,
    };
  });
}

// Meta's catalog (/feeds/meta.csv) for Commerce Manager: Facebook and Instagram shops and Meta's
// AI shopping draw on it. Its standard columns, from the same items.
export function metaFeed(DATA, siteUrl) {
  const site = DATA.SITE;
  const currency = site.currencyCode || "USD";
  const cols = ["id", "item_group_id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand", "google_product_category", "product_type", "size", "color", "gender", "age_group"];
  const cell = (v) => {
    const t = String(v ?? "").replace(/\r?\n/g, " ");
    return /[",]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
  };
  const rows = feedItems(DATA).map((it) =>
    [it.id, it.group, it.title.slice(0, 200), it.description.slice(0, 9999), it.soldOut ? "out of stock" : "in stock", "new", `${Number(it.price).toFixed(2)} ${currency}`, siteUrl + it.link, siteUrl + it.image, site.name, it.category || "", it.type, it.size || "", it.color || "", it.apparel ? "unisex" : "", it.apparel ? "adult" : ""].map(cell).join(",")
  );
  return `${cols.join(",")}\n${rows.join("\n")}\n`;
}

/* ── Photos ─────────────────────────────────────────────── */

// Dark or light text, whichever reads on a label color (as on the site).
export function inkOn(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || "");
  if (!m) return "#111";
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.04 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.22 ? "#111" : "#fff";
}
const FONT = `font-family="Instrument Sans, Helvetica, Arial, sans-serif"`;

// A coffee's label on the bag's front face (the site's bagLabel, in the bag photo's 640 × 940 units).
// `bagHref` is the bag photo (a data: URL): as on the site, its light and grain show over the label.
function bagLabel(p, bagHref = "") {
  const color = p.color || "#d8d2c4";
  const country = countryOf(p.name);
  const kicker = `${p.type} roast`;
  const rows = [["Origin", country], ["Region", p.region], ["Process", p.process], ["Altitude", p.altitude]].filter(([, v]) => v);
  const W = 307, PAD = 25, ink = inkOn(color);
  const fits = (text, size, room) => {
    const max = Math.floor(room / (size * 0.53));
    return text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…` : text;
  };
  const lines = [""];
  for (const w of String(p.short || p.name).split(" ")) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (next.length > 13 && lines.at(-1) && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = next;
  }
  let y = PAD;
  let body = `<text x="${PAD}" y="${y + 15}" font-size="16" letter-spacing="1.4" opacity="0.75">${xml(kicker.toUpperCase())}</text>`;
  y += 28;
  for (const line of lines) {
    body += `<text x="${PAD}" y="${y + 30}" font-size="35" font-weight="500">${xml(fits(line, 35, W - 2 * PAD))}</text>`;
    y += 37;
  }
  if (rows.length) y += 14;
  for (const [k, v] of rows) {
    body += `<line x1="${PAD}" x2="${W - PAD}" y1="${y}" y2="${y}" stroke="${ink}" stroke-opacity="0.3" stroke-width="1.6"/>`;
    body += `<text x="${PAD}" y="${y + 23}" font-size="19" opacity="0.7">${xml(k)}</text>`;
    body += `<text x="${W - PAD}" y="${y + 23}" font-size="19" text-anchor="end">${xml(fits(v, 19, W - 2 * PAD - k.length * 10 - 12))}</text>`;
    y += 33;
  }
  const H = y + PAD;
  const frame = `translate(257 536) matrix(1 0.222 -0.128 1 0 0) translate(${-W / 2} ${-H / 2})`;
  // As js/app.ts bagLabel: printed on paper, stuck on the bag.
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="640" height="940" viewBox="0 0 640 940">
  <defs>
    <filter id="label-light" filterUnits="userSpaceOnUse" x="0" y="0" width="640" height="940" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.3827 -1.2874 -0.1300 0 1.2816"/></filter>
    <filter id="label-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
    <clipPath id="label-clip"><rect width="${W}" height="${H}" rx="3" transform="${frame}"/></clipPath>
  </defs>
  <g transform="${frame}" fill="${ink}" ${FONT}>
    <rect width="${W}" height="${H}" rx="3" fill="#000" opacity="0.16" transform="translate(1 3)" filter="url(#label-soft)"/>
    <rect width="${W}" height="${H}" rx="3" fill="${xml(color)}"/>
    <g opacity="0.94">${body}</g>
  </g>
  ${bagHref ? `<image xlink:href="${bagHref}" href="${bagHref}" width="640" height="940" clip-path="url(#label-clip)" filter="url(#label-light)"/>` : ""}
  <rect width="${W}" height="${H}" rx="3" transform="${frame}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1.2"/>
</svg>`;
}

// A tea's lid, in the cup photo's own units (620 × 749; the site draws it at 584 wide).
function tinLabel(a) {
  const c = xml(a.color || "#d8d2c4");
  const ink = inkOn(a.color || "#d8d2c4");
  const k = 620 / 584;
  // As js/app.js lidArt: the heat-seal film over the rim, its pull tab lying flat past the front.
  return `<svg xmlns="http://www.w3.org/2000/svg" width="620" height="749" viewBox="0 0 620 749"><defs><linearGradient id="lid-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.08"/></linearGradient><filter id="tab-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter></defs><g transform="scale(${k}) translate(-28 -234)" fill="${ink}" ${FONT}>
    <path d="M234 362Q252 366 254 372A66 15 0 0 0 385 372Q387 366 405 362Z" fill="#000" opacity="0.2" filter="url(#tab-blur)"/>
    <ellipse cx="319.5" cy="302" rx="264" ry="57" fill="${c}"/>
    <path d="M228 355.6Q248 357.5 250.5 362A69 17 0 0 0 388.5 362Q391 357.5 411 355.6Z" fill="${c}"/>
    <ellipse cx="319.5" cy="302" rx="264" ry="57" fill="url(#lid-sheen)"/>
    <path d="M312.5 366.5h14l-7 4.6z" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" opacity="0.7"/>
    <text transform="translate(319.5 302) scale(1 0.4)" y="24" text-anchor="middle" font-size="70" font-weight="500" letter-spacing="7">${xml(String(a.short || a.name).toUpperCase())}</text>
  </g></svg>`;
}

// The photo for a feed item: { source: bytes of the photo, overlay?: label SVG }, or null.
// `readAsset(src)` returns a site image's bytes ("/assets/…" or a back office "/media/…").
export async function feedPhotoParts(DATA, itemId, readAsset) {
  const p = (DATA.PRODUCTS || []).find((x) => x.id === itemId);
  if (p) {
    if (p.image) return { source: await readAsset(p.image) };
    const source = await readAsset("/assets/bag-kraft.webp");
    if (!source) return null;
    const { default: sharp } = await import("sharp");
    const bagHref = `data:image/png;base64,${(await sharp(source).png().toBuffer()).toString("base64")}`;
    return { source, overlay: bagLabel(p, bagHref) };
  }
  for (const a of DATA.ACCESSORIES || []) {
    if (a.id === itemId) {
      if (a.category === "Tea" && !a.image) return { source: await readAsset("/assets/tea-cup.webp"), overlay: tinLabel(a) };
      return a.image ? { source: await readAsset(a.image) } : null;
    }
    const c = (a.colors || []).find((x) => `${a.id}-${slug(x.name)}` === itemId);
    if (c) return { source: await readAsset(c.image) };
  }
  return null;
}

// Composited, on white, fitted into a 1200 × 1200 square with room around it.
export async function renderFeedPhoto({ source, overlay }: { source: any; overlay?: any }) {
  const { default: sharp } = await import("sharp");
  let img = sharp(source);
  if (overlay) img = sharp(await img.composite([{ input: Buffer.from(overlay), top: 0, left: 0 }]).png().toBuffer());
  // Trimmed to the product (cut-out photos have empty margins), then fitted.
  const fitted = await img.trim({ threshold: 1 }).resize(1040, 1040, { fit: "inside" }).png().toBuffer();
  return sharp({ create: { width: 1200, height: 1200, channels: 3, background: "#ffffff" } })
    .composite([{ input: fitted, gravity: "center" }])
    .jpeg({ quality: 86 })
    .toBuffer();
}
