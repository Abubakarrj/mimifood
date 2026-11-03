// Copies each product's price from the Shopify store into the site (back office → Products › Food).
//
//   node scripts/sync-shopify-prices.mjs            dry run: shows what would change
//   node scripts/sync-shopify-prices.mjs --apply    saves the changes
//
// Reads ADMIN_KEY from your environment (never printed). SITE_URL defaults to http://localhost:3000
// and SHOPIFY_DOMAIN to the store in js/data.ts. Products still at $0 on Shopify are skipped, so a
// placeholder price here is never replaced by zero.

const apply = process.argv.includes("--apply");
const site = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
const key = process.env.ADMIN_KEY;
if (!key) {
  console.error("Set ADMIN_KEY first (the same value the site was started with).");
  process.exit(1);
}
// Signs in with the admin key; the back office answers with a session cookie.
let cookie = "";
const login = await fetch(`${site}/api/admin/login`, { method: "POST", headers: { "content-type": "application/json", origin: site }, body: JSON.stringify({ key }) });
if (!login.ok) {
  console.error(`Sign-in failed (${login.status}). Check ADMIN_KEY and SITE_URL.`);
  process.exit(1);
}
cookie = (login.headers.get("set-cookie") || "").split(";")[0];
const api = async (path, init = {}) => {
  const res = await fetch(`${site}${path}`, { ...init, headers: { "content-type": "application/json", origin: site, cookie } });
  if (!res.ok) throw new Error(`${init.method || "GET"} ${path}: ${res.status}`);
  return res.json();
};

const { catalog } = await api("/api/admin/catalog").then((j) => (j.catalog ? j : { catalog: j }));
const foods = catalog.foods.filter((f) => f.shopify);
const domain = process.env.SHOPIFY_DOMAIN || "mimifoodusa.com";
const tally = { same: 0, changed: 0, zero: 0, missing: 0, failed: 0 };

for (const f of foods) {
  try {
    const res = await fetch(`https://${domain}/products/${f.id}.js`);
    if (!res.ok) { tally.missing++; console.log(`missing on Shopify: ${f.id}`); continue; }
    const product = await res.json();
    const variant = product.variants.find((v) => String(v.id) === String(f.shopify)) || product.variants[0];
    const price = variant.price / 100;
    if (!(price > 0)) { tally.zero++; continue; }
    if (price === f.price) { tally.same++; continue; }
    console.log(`${f.name}: ${f.price ?? "none"} → ${price}`);
    if (apply) await api(`/api/admin/foods/${f.id}`, { method: "PATCH", body: JSON.stringify({ price: String(price) }) });
    tally.changed++;
  } catch (error) {
    tally.failed++;
    console.log(`failed: ${f.id} (${error.message})`);
  }
  await new Promise((r) => setTimeout(r, 120));
}
console.log(`\n${apply ? "Saved" : "Would change"} ${tally.changed}. Unchanged ${tally.same}. Still $0 on Shopify ${tally.zero}. Missing ${tally.missing}. Failed ${tally.failed}.`);
if (!apply && tally.changed) console.log("Run again with --apply to save.");
