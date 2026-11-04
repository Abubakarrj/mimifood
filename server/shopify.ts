// Shopify Admin API, read-only, for one thing: the gift card product's variants (amount -> variant id),
// so /gift-cards can send a gift card to Shopify's checkout. Uses a Dev Dashboard app's client id and
// secret (client credentials grant: the token lasts about a day and is fetched again when it runs out).
// Env: SHOPIFY_STORE (yourshop.myshopify.com), SHOPIFY_CLIENT_ID, SHOPIFY_CLIENT_SECRET. The app needs read_products.

const env = (name: string) => String(process.env[name] || "").trim();
const API_VERSION = "2025-07";
const store = () => env("SHOPIFY_STORE").replace(/^https?:\/\//, "").replace(/\/+$/, "");

export const shopifyConfigured = () => Boolean(store() && env("SHOPIFY_CLIENT_ID") && env("SHOPIFY_CLIENT_SECRET"));

let token: { value: string; expires: number } | null = null;
async function accessToken(): Promise<string> {
  if (token && token.expires > Date.now() + 60_000) return token.value;
  const res = await fetch(`https://${store()}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: env("SHOPIFY_CLIENT_ID"), client_secret: env("SHOPIFY_CLIENT_SECRET"), grant_type: "client_credentials" }),
    signal: AbortSignal.timeout(15_000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) throw new Error(`Shopify token: ${res.status} ${body.error_description || body.error || ""}`.trim());
  token = { value: body.access_token, expires: Date.now() + Number(body.expires_in || 86_000) * 1000 };
  return token.value;
}

async function graphql(query: string): Promise<any> {
  const res = await fetch(`https://${store()}/admin/api/${API_VERSION}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await accessToken() },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(15_000),
  });
  const body: any = await res.json().catch(() => ({}));
  if (res.status === 401) token = null;
  if (!res.ok || body.errors) throw new Error(`Shopify: ${res.status} ${JSON.stringify(body.errors || "").slice(0, 200)}`);
  return body.data;
}

// { "25": "4919…", "50": "…" } from the store's gift card product (the first one that's active).
let cache: { at: number; value: Record<string, string> } | null = null;
export async function giftCardVariants(log: (...a: any[]) => void = console.error): Promise<Record<string, string>> {
  if (!shopifyConfigured()) return {};
  if (cache && Date.now() - cache.at < 10 * 60_000) return cache.value;
  try {
    // Gift card products by flag, then any product titled like one (a store can make it a plain product).
    const data = await graphql(`{ products(first: 10, query: "gift_card:true OR title:gift*") { nodes { title status isGiftCard variants(first: 20) { nodes { id price } } } } }`);
    const all: any[] = data?.products?.nodes || [];
    const likely = all.filter((p) => p.isGiftCard || /gift\s*card|egift|e-gift/i.test(p.title));
    const product = likely.find((p) => p.status === "ACTIVE");
    if (!product) log(`[shopify] no active gift card product (looked at ${all.length} products; gift card-like: ${likely.map((p) => `${p.title} [${p.status}]`).join(", ") || "none"})`);
    const out: Record<string, string> = {};
    for (const variant of product?.variants?.nodes || []) {
      const amount = Math.round(Number(variant.price));
      const id = String(variant.id).replace(/\D/g, "");
      if (amount > 0 && id) out[String(amount)] = id;
    }
    cache = { at: Date.now(), value: out };
    return out;
  } catch (error) {
    log("[shopify]", error instanceof Error ? error.message : error);
    return cache?.value || {};
  }
}

// What /api/config hands out right away; refreshed in the background (at start and every 10 minutes).
export const cachedGiftCardVariants = () => {
  if (!cache || Date.now() - cache.at > 10 * 60_000) giftCardVariants().catch(() => {});
  return cache?.value || {};
};

// Prices set in Shopify win over the site's own (placeholders until Shopify has the real ones):
// a variant at 0 means "not priced yet", so the site's price stays. variantId -> price.
let prices = new Map<string, number>();
export type ShopifyProduct = { handle: string; title: string; status: string; description: string; image: string; variantId: string; price: number };
let products: ShopifyProduct[] = [];
export const shopifyProducts = () => products;
let byHandle = new Map<string, { id: string; price: number }>();
let byTitle = new Map<string, { id: string; price: number }>();
export const normTitle = (s: string) => String(s).toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
// The Shopify variant for a site product: same handle as its id, or the same title. Only when Shopify has a
// price for it (a product at 0 there would check out for nothing, so it stays unlinked).
export const shopifyLink = (item: { id?: string; name?: string; shopify?: string }): string | undefined => {
  if (item.shopify) return item.shopify;
  const hit = byHandle.get(String(item.id)) || byTitle.get(normTitle(item.name || ""));
  return hit && hit.price > 0 ? hit.id : undefined;
};
export const shopifyPrice = (variantId: string | undefined): number | undefined => {
  const price = variantId ? prices.get(String(variantId)) : undefined;
  return price && price > 0 ? price : undefined;
};
// Fetches every variant's price; returns how many are at 0 (not priced) and whether any price moved.
export async function refreshShopifyPrices(log: (...a: any[]) => void = console.error): Promise<{ total: number; unpriced: number; changed: boolean } | null> {
  if (!shopifyConfigured()) return null;
  try {
    const next = new Map<string, number>();
    const list: ShopifyProduct[] = [];
    const handles = new Map<string, { id: string; price: number }>();
    const titles = new Map<string, { id: string; price: number }>();
    let after = "";
    for (let page = 0; page < 10; page++) {
      const data = await graphql(`{ products(first: 40${after ? `, after: "${after}"` : ""}) { pageInfo { hasNextPage endCursor } nodes { handle title status description featuredImage { url } variants(first: 10) { nodes { id price } } } } }`);
      for (const p of data?.products?.nodes || []) {
        const first = p.variants?.nodes?.[0];
        if (first) {
          const link = { id: String(first.id).replace(/\D/g, ""), price: Number(first.price) || 0 };
          handles.set(String(p.handle), link);
          titles.set(normTitle(p.title), link);
          list.push({ handle: String(p.handle), title: String(p.title), status: String(p.status), description: String(p.description || ""), image: String(p.featuredImage?.url || ""), variantId: link.id, price: link.price });
        }
        for (const v of p.variants?.nodes || []) next.set(String(v.id).replace(/\D/g, ""), Number(v.price) || 0);
      }
      if (!data?.products?.pageInfo?.hasNextPage) break;
      after = data.products.pageInfo.endCursor;
    }
    const changed = next.size !== prices.size || [...next].some(([id, price]) => prices.get(id) !== price);
    prices = next;
    products = list;
    byHandle = handles;
    byTitle = titles;
    return { total: next.size, unpriced: [...next.values()].filter((p) => !(p > 0)).length, changed };
  } catch (error) {
    log("[shopify] prices:", error instanceof Error ? error.message : error);
    return null;
  }
}

// The store's cart links go to: SHOPIFY_STORE (yourshop.myshopify.com) when set, else the site data's own domain.
export const shopifyDomain = () => store() || "";

// Makes the store's gift card product when it has none: "Gift Card", one variant per amount, active, on the
// Online Store. Needs write_products (and write_publications to list it on the Online Store). It only ever
// creates when no gift card product (of any status) exists.
let creating = false;
export async function ensureGiftCardProduct(amounts: number[], log: (...a: any[]) => void = console.error): Promise<boolean> {
  if (!shopifyConfigured() || creating || !amounts.length) return false;
  creating = true;
  try {
    const found = await graphql(`{ products(first: 5, query: "gift_card:true OR title:gift*") { nodes { id title status } } }`);
    if ((found?.products?.nodes || []).length) return false; // one exists (maybe a draft): leave it to the owner
    const created = await graphql(`mutation { productCreate(product: { title: "Gift Card", giftCard: true, status: ACTIVE, productOptions: [{ name: "Amount", values: [${amounts.map((a) => `{ name: "$${a}" }`).join(", ")}] }] }) { product { id variants(first: 5) { nodes { id } } } userErrors { field message } } }`);
    const errs = created?.productCreate?.userErrors || [];
    if (errs.length) throw new Error(`productCreate: ${errs.map((e: any) => e.message).join("; ")}`);
    const product = created?.productCreate?.product;
    if (!product?.id) throw new Error("productCreate returned no product");
    const firstVariant = product.variants?.nodes?.[0]?.id;
    // The first amount's variant exists; the others are added, and every variant gets its price.
    const rest = amounts.slice(1);
    if (rest.length) {
      const bulk = await graphql(`mutation { productVariantsBulkCreate(productId: "${product.id}", variants: [${rest.map((a) => `{ optionValues: [{ optionName: "Amount", name: "$${a}" }], price: "${a}.00" }`).join(", ")}]) { userErrors { message } } }`);
      const e2 = bulk?.productVariantsBulkCreate?.userErrors || [];
      if (e2.length) throw new Error(`variants: ${e2.map((e: any) => e.message).join("; ")}`);
    }
    if (firstVariant) {
      const upd = await graphql(`mutation { productVariantsBulkUpdate(productId: "${product.id}", variants: [{ id: "${firstVariant}", price: "${amounts[0]}.00" }]) { userErrors { message } } }`);
      const e3 = upd?.productVariantsBulkUpdate?.userErrors || [];
      if (e3.length) throw new Error(`price: ${e3.map((e: any) => e.message).join("; ")}`);
    }
    // On the Online Store, so cart links can use it.
    try {
      const pubs = await graphql(`{ publications(first: 20) { nodes { id name } } }`);
      const online = (pubs?.publications?.nodes || []).find((p: any) => /online store/i.test(p.name));
      if (online) await graphql(`mutation { publishablePublish(id: "${product.id}", input: [{ publicationId: "${online.id}" }]) { userErrors { message } } }`);
      else log("[shopify] gift card created; list it on the Online Store in Shopify admin (no Online Store channel found)");
    } catch (error) {
      log("[shopify] gift card created but not listed on the Online Store (needs write_publications):", error instanceof Error ? error.message : error);
    }
    cache = null;
    log(`[shopify] created the Gift Card product (${amounts.map((a) => `$${a}`).join(", ")})`);
    return true;
  } catch (error) {
    log("[shopify] gift card product:", error instanceof Error ? error.message : error);
    return false;
  } finally {
    creating = false;
  }
}

// The file name of a product's floating cutout photo: assets/products/cut/<cutName(handle)>.webp
// (made by scripts/cutouts.cjs from the product's Shopify photo).
export const cutName = (handle: string) => String(handle).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "product";
