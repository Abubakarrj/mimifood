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
    const data = await graphql(`{ products(first: 5, query: "gift_card:true status:active") { nodes { title variants(first: 50) { nodes { id price } } } } }`);
    const out: Record<string, string> = {};
    for (const variant of data?.products?.nodes?.[0]?.variants?.nodes || []) {
      const amount = Math.round(Number(variant.price));
      const id = String(variant.id).replace(/\D/g, "");
      if (amount > 0 && id) out[String(amount)] = id;
    }
    cache = { at: Date.now(), value: out };
    if (!Object.keys(out).length) log("[shopify] no active gift card product found");
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
