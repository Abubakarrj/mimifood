// Phone check: loads every page of the store, the wholesale portal and the back office at iPhone
// sizes, opens its menus and sheets, and lists what would go wrong on a phone:
//   zoom       a text box under 16px (an iPhone zooms the page when it's tapped)
//   sideways   the page is wider than the screen
//   offscreen  something sticks past the screen's edge (and isn't in a sideways scroller)
//   spill      content wider than the card, menu or button it sits in
//   cut        text clipped without an ellipsis
//   covered    a button or link hidden under something floating
//   tiny       a tap target under 24 × 24 px
//
// Usage (a running server; cookie files are Playwright cookie arrays):
//   node scripts/phone-check.mjs --base http://localhost:3123 --admin ck.json --trade ck-trade.json \
//     [--only store,portal,admin] [--out phone-check.json] [--shots dir] [--quick]
// --quick skips opening menus and sheets; --shots saves a picture of each problem (outlined in red,
// in the state it was found). Exits 1 when it finds anything.

import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => (a.startsWith("--") ? [...acc, [a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]] : acc), [])
);
const BASE = String(args.base || "http://localhost:3123").replace(/\/$/, "");
const ONLY = new Set(String(args.only || "store,portal,admin").split(","));
const OUT = args.out || "";
const QUICK = Boolean(args.quick);
const SHOTS = typeof args.shots === "string" ? args.shots : "";
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const SIZES = [
  { name: "iPhone SE", width: 375, height: 667 },
  { name: "iPhone", width: 390, height: 844 },
];

const { chromium } = await import("playwright").catch(() => import("/opt/node22/lib/node_modules/playwright/index.mjs"));
const cookies = (file) => (file && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : []);

// What's checked on a page, in the browser. `covered` only on the page as it loads (an open menu
// covers things on purpose).
function audit({ covered, width, height }) {
  // The screen's own size: a phone widens its layout to fit a page that's too wide, so the page's
  // idea of its width can't be trusted to find exactly that.
  const vw = width;
  const vh = height;
  const out = [];
  let tag = 0;
  const push = (o, e) => {
    if (e instanceof Element) {
      const id = `pc${tag++}`;
      e.setAttribute("data-pc", id);
      o.pc = id;
    }
    out.push(o);
  };
  const style = (e) => getComputedStyle(e);
  const shown = (e) => {
    if (!(e instanceof Element)) return false;
    if (e.closest(".skip-link, .sr-only, .visually-hidden")) return false;
    const r = e.getBoundingClientRect();
    if (r.width <= 1 || r.height <= 1) return false;
    for (let a = e; a; a = a.parentElement) {
      const s = style(a);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0 || a.hasAttribute("inert")) return false;
    }
    return true;
  };
  const path = (e) => {
    const parts = [];
    for (let i = 0; i < 4 && e && e !== document.body; i++, e = e.parentElement) {
      let s = e.tagName.toLowerCase();
      if (e.id) s += `#${e.id}`;
      const cls = [...e.classList].filter((c) => !/^is-/.test(c)).slice(0, 2);
      if (cls.length) s += `.${cls.join(".")}`;
      const data = [...e.attributes].find((a) => a.name.startsWith("data-") && a.name !== "data-reveal");
      if (data) s += `[${data.name}]`;
      parts.unshift(s);
    }
    return parts.join(" > ");
  };
  const label = (e) => (e.getAttribute?.("aria-label") || e.textContent || e.getAttribute?.("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 50);
  const scrollsX = (s) => ["auto", "scroll"].includes(s.overflowX);
  const clipsX = (s) => ["hidden", "clip", "auto", "scroll"].includes(s.overflowX);
  const placed = (s) => ["absolute", "fixed"].includes(s.position);
  const boxed = (s) =>
    (s.backgroundColor !== "rgba(0, 0, 0, 0)" && s.backgroundColor !== "transparent") || parseFloat(s.borderLeftWidth) > 0 || parseFloat(s.borderRightWidth) > 0 || s.boxShadow !== "none";
  // Something with a modal open behind it isn't reachable, so it isn't checked for being covered.
  const modal = [...document.querySelectorAll("dialog[open], [aria-modal='true']")].find(shown);

  // zoom
  for (const e of document.querySelectorAll("input, textarea, select")) {
    if (["checkbox", "radio", "range", "hidden", "file", "color", "submit", "button", "image", "reset"].includes(e.type) || !shown(e)) continue;
    const fs = parseFloat(style(e).fontSize);
    if (fs < 16) push({ kind: "zoom", path: path(e), label: label(e), detail: `${fs}px text` }, e);
  }
  // sideways
  const wider = document.documentElement.scrollWidth - vw;
  if (wider > 1) out.push({ kind: "sideways", path: "page", label: "", detail: `${wider}px wider than the screen` });

  // Only what moves for good (a ticker, a pulsing dot) is meant to sit outside its box; a page or
  // card that fades in once is checked as usual.
  const looping = document
    .getAnimations()
    .filter((x) => x.effect?.getTiming?.().iterations === Infinity)
    .map((x) => x.effect?.target)
    .filter(Boolean);
  const moving = (e) => looping.some((t) => t === e || t.contains(e));
  // A tap area can be made bigger than the thing drawn, with an invisible ::before/::after laid
  // over it (inset below 0): that's its real size.
  const hitBox = (e) => {
    const r = e.getBoundingClientRect();
    let { left, top, right, bottom } = r;
    for (const pseudo of ["::before", "::after"]) {
      const ps = getComputedStyle(e, pseudo);
      if (ps.content === "none" || ps.position !== "absolute") continue;
      const px = (v) => (v.endsWith("px") ? parseFloat(v) : 0);
      left = Math.min(left, r.left + px(ps.left));
      top = Math.min(top, r.top + px(ps.top));
      right = Math.max(right, r.right - px(ps.right));
      bottom = Math.max(bottom, r.bottom - px(ps.bottom));
    }
    return { width: right - left, height: bottom - top };
  };
  const pseudoPlaced = (e) => ["::before", "::after"].some((p) => getComputedStyle(e, p).content !== "none" && getComputedStyle(e, p).position === "absolute");
  const els = [...document.body.querySelectorAll("*")].filter((e) => !["SCRIPT", "STYLE", "BR", "TEMPLATE", "path", "circle", "line", "rect", "polyline", "polygon", "g", "use"].includes(e.tagName) && shown(e) && !moving(e));
  const off = (r) => r.right > vw + 1 || r.left < -1;
  for (const e of els) {
    const r = e.getBoundingClientRect();
    const s = style(e);
    // offscreen: past the edge, unless a sideways scroller (or a clipping box that's itself on
    // screen) holds it; only the outermost one is listed.
    if (off(r)) {
      let held = false;
      for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) {
        const as = style(a);
        if (scrollsX(as)) {
          held = true;
          break;
        }
        if (clipsX(as)) {
          held = !off(a.getBoundingClientRect());
          break;
        }
        if (as.position === "fixed") break;
      }
      const p = e.parentElement;
      if (!held && !(p && shown(p) && off(p.getBoundingClientRect()))) push({ kind: "offscreen", path: path(e), label: label(e), detail: `${Math.round(r.left)}→${Math.round(r.right)} on a ${vw}px screen` }, e);
    }
    // spill: wider than the nearest card/menu/button around it (a menu or popup placed on its own
    // is its own box). Only the outermost spilling part is listed.
    // Something pulled out on purpose with negative side margins (a panel's full-width footer)
    // isn't spilling.
    const bleeds = (x) => parseFloat(style(x).marginLeft) < 0 || parseFloat(style(x).marginRight) < 0;
    if (!placed(s) && !bleeds(e)) {
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const as = style(a);
        if (scrollsX(as)) break;
        if (boxed(as)) {
          const ar = a.getBoundingClientRect();
          const by = Math.max(r.right - ar.right, ar.left - r.left);
          if (by > 1.5) {
            const p = e.parentElement;
            const pr = p.getBoundingClientRect();
            const parentToo = p !== a && Math.max(pr.right - ar.right, ar.left - pr.left) > 1.5;
            if (!parentToo) push({ kind: "spill", path: path(e), label: label(e), detail: `${Math.round(by)}px outside ${path(a).split(" > ").pop()}` }, e);
          }
          break;
        }
        if (placed(as)) break;
      }
    }
    // spill: text or content running out of its own box (a button, a tag)
    if (boxed(s) && s.overflowX === "visible" && e.scrollWidth > e.clientWidth + 2 && e.clientWidth > 0 && !pseudoPlaced(e) && !els.some((c) => c !== e && e.contains(c) && (placed(style(c)) || bleeds(c)))) {
      push({ kind: "spill", path: path(e), label: label(e), detail: `content ${e.scrollWidth - e.clientWidth}px wider than the box` }, e);
    }
    // cut: text clipped with no ellipsis
    if (["hidden", "clip"].includes(s.overflowX) && s.textOverflow !== "ellipsis" && e.scrollWidth > e.clientWidth + 2 && [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
      push({ kind: "cut", path: path(e), label: label(e), detail: `${e.scrollWidth - e.clientWidth}px of text hidden` }, e);
    }
  }

  const tappable = els.filter((e) => e.matches("a[href], button, summary, select, input:not([type=hidden]), textarea, [role=button], [role=tab], [role=menuitem], [tabindex='0']"));
  // tiny: under 24 × 24 (links inside a sentence, and boxes inside a label that's bigger, are fine)
  for (const e of tappable) {
    const r = hitBox(e);
    if (r.width >= 24 && r.height >= 24) continue;
    if (e.tagName === "A" && (e.closest("p, li > p") && e.closest("p").textContent.trim().length > e.textContent.trim().length + 2)) continue;
    if (e.tagName === "A" && e.parentElement && [...e.parentElement.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const lab = e.closest("label, button, a, summary");
    if (lab && lab !== e && lab.getBoundingClientRect().width >= 24 && lab.getBoundingClientRect().height >= 24) continue;
    let rowTarget = false;
    for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
      const ar = a.getBoundingClientRect();
      if (style(a).cursor === "pointer" && ar.height >= 24 && ar.width >= 24 && (a.matches("tr, li, [role=row]") || [...a.attributes].some((x) => x.name.startsWith("data-open")))) {
        rowTarget = true;
        break;
      }
    }
    if (rowTarget) continue;
    push({ kind: "tiny", path: path(e), label: label(e), detail: `${Math.round(r.width)}×${Math.round(r.height)}px` }, e);
  }
  // covered: something floating (fixed or sticky, not a bar along the top or bottom) over its middle
  if (covered && !modal) {
    for (const e of tappable) {
      const r = e.getBoundingClientRect();
      if (r.top < 0 || r.bottom > vh || r.left < 0 || r.right > vw) continue;
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
      if (!hit || e.contains(hit) || hit.contains(e)) continue;
      let f = hit;
      while (f && !["fixed", "sticky"].includes(style(f).position)) f = f.parentElement;
      if (!f || f.contains(e)) continue;
      const fr = f.getBoundingClientRect();
      if (fr.top <= 2 || fr.bottom >= vh - 2 || fr.width >= vw * 0.9) continue;
      push({ kind: "covered", path: path(e), label: label(e), detail: `under ${path(f).split(" > ").pop()}` }, e);
    }
  }
  return out;
}

// The menus, sheets and popups to open on each page (safe ones: nothing is placed or saved).
const OPENERS = {
  common: ["details > summary", "[aria-haspopup]:not([aria-expanded='true'])"],
  store: ["[data-search-open]", "[data-chat-open]", "[data-open='menu']", "[data-open='cart']", "[data-a11y-open]"],
  portal: ["[data-where-open]", "[data-loc-add]", "[data-ask-team]", "[data-help-open]", "[data-search-open], [data-tp-search]", "[data-usual-fill]", "[data-bank-open]", "[data-loc-edit]", "[data-tp-avatar], .tp-avatar"],
  admin: ["tr.clickable", "[data-quick]", "[data-assist-open]", "[data-palette-open]", "[data-todo-new]", "[data-roast-plan]", "[data-bill-new]", "[data-manage-cards]"],
};

let visits = 0;
async function pagesFor(area, page) {
  if (area === "store") {
    const xml = await (await fetch(`${BASE}/sitemap.xml`)).text().catch(() => "");
    const all = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/^https?:\/\/[^/]+/, "") || "/");
    const english = all.filter((u) => !/^\/(es|ko)(\/|$)/.test(u));
    return [...new Set([...english, "/es/", "/es/products/sao-judas-tadeu", "/ko/", "/ko/subscriptions", "/checkout", "/login", "/account", "/track", "/careers"])];
  }
  if (area === "portal") {
    const me = await page.request.get(`${BASE}/api/trade/me`).then((r) => r.json()).catch(() => ({}));
    const last = (me.orders || [])[0]?.number;
    return ["/trade", "/trade/products", "/trade/orders", "/trade/balance", "/trade/account", ...(last ? [`/trade/orders/${last}`, `/trade/invoices/${last}`] : [])];
  }
  await page.goto(`${BASE}/admin`);
  await page.waitForTimeout(1500);
  const nav = await page.evaluate(() => [...new Set([...document.querySelectorAll("a[href^='/admin'], a[href^='#']")].map((a) => a.getAttribute("href")).filter((h) => h && h.length > 1))]);
  const list = nav.map((h) => (h.startsWith("#") ? `/admin/${h.slice(1)}` : h)).filter((h) => !/logout|\/new$/.test(h));
  const orders = await page.request.get(`${BASE}/api/admin/orders`).then((r) => r.json()).catch(() => ({}));
  const some = (orders.orders || []).slice(0, 40);
  const pick = (f) => some.find(f)?.number;
  const opened = [pick((o) => o.source === "wholesale"), pick((o) => o.courier || o.local), pick((o) => o.collect), pick((o) => o.source !== "wholesale")].filter(Boolean);
  return [...new Set(["/admin", ...list, ...opened.map((n) => `/admin/orders/new?order=${n}`)])];
}

async function settle(page) {
  await page.waitForLoadState("networkidle", { timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(700);
}

const found = [];
const shotsTaken = new Set();
const browser = await chromium.launch();
for (const area of ["store", "portal", "admin"].filter((a) => ONLY.has(a))) {
  for (const size of SIZES) {
    const ctx = await browser.newContext({ viewport: { width: size.width, height: size.height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, serviceWorkers: "block" });
    await ctx.addCookies(area === "admin" ? cookies(args.admin) : area === "portal" ? cookies(args.trade) : []);
    // The cookie banner, answered once, so it isn't counted on every page.
    await ctx.addInitScript(() => {
      try {
        if (!localStorage.getItem("bp-consent")) localStorage.setItem("bp-consent", JSON.stringify({ v: 1, at: new Date().toISOString(), analytics: true, marketing: true }));
      } catch {}
    });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.dismiss());
    // Signed out (expired cookies) would check the login screen instead of the app: stop and say so.
    const probe = area === "admin" ? "/api/admin/orders" : area === "portal" ? "/api/trade/me" : "";
    if (probe) {
      const status = await page.request.get(BASE + probe).then((r) => r.status()).catch(() => 0);
      if (status !== 200) {
        console.error(`Not signed in to the ${area === "admin" ? "back office" : "portal"} (got ${status} from ${probe}). Refresh the --${area === "admin" ? "admin" : "trade"} cookies and run again.`);
        process.exit(2);
      }
    }
    const pages = await pagesFor(area, page);
    // Something in the cart / the order, so checkout and the order summary have content.
    if (area === "store") {
      await page.goto(`${BASE}/products/sao-judas-tadeu`);
      await settle(page);
      await page.locator("[data-cookie=all]").click({ timeout: 1500 }).catch(() => {});
      await page.locator("[data-pdp-add], button:has-text('Add to Cart')").first().click({ timeout: 3000 }).catch(() => {});
    }
    if (area === "portal") {
      await page.goto(`${BASE}/trade/products`);
      await settle(page);
      await page.locator("[data-cookie=all]").click({ timeout: 1500 }).catch(() => {});
      for (const n of [0, 1]) await page.locator("[data-step='1']").nth(n * 2).click({ timeout: 2000 }).catch(() => {});
    }
    for (const url of pages) {
      visits++;
      const pictured = new Set();
      const note = async (issues, opened) => {
        for (const i of issues) {
          const f = { area, size: size.name, url, opened: opened || "", ...i };
          found.push(f);
          const key = [area, i.kind, i.path, size.name].join("|");
          if (!SHOTS || !i.pc || pictured.has(key) || shotsTaken.has(key)) continue;
          pictured.add(key);
          shotsTaken.add(key);
          const el = page.locator(`[data-pc="${i.pc}"]`).first();
          await el.evaluate((e) => {
            e.style.outline = "3px solid #ff0040";
            e.style.outlineOffset = "1px";
          }).catch(() => {});
          await el.scrollIntoViewIfNeeded({ timeout: 800 }).catch(() => {});
          f.shot = `${SHOTS}/${area}-${i.kind}-${shotsTaken.size}.png`;
          await page.screenshot({ path: f.shot }).catch(() => (f.shot = ""));
          await el.evaluate((e) => (e.style.outline = "")).catch(() => {});
        }
      };
      errors.length = 0;
      await page.goto(BASE + url).catch(() => {});
      await settle(page);
      await page.locator("[data-cookie=all]").click({ timeout: 500 }).catch(() => {});
      await note(await page.evaluate(audit, { covered: true, width: size.width, height: size.height }), "");
      for (const e of errors) found.push({ area, size: size.name, url, opened: "", kind: "error", path: "page", label: "", detail: e.slice(0, 160) });
      if (QUICK) continue;
      // Each menu and sheet on the page, one at a time from a fresh load.
      const sels = [...OPENERS.common, ...(OPENERS[area] || [])];
      const targets = [];
      for (const sel of sels) {
        const n = await page.locator(sel).count().catch(() => 0);
        for (let i = 0; i < Math.min(n, 6); i++) if (await page.locator(sel).nth(i).isVisible().catch(() => false)) targets.push([sel, i]);
      }
      for (const [sel, i] of targets.slice(0, 12)) {
        await page.goto(BASE + url).catch(() => {});
        await settle(page);
        const t = page.locator(sel).nth(i);
        const name = ((await t.getAttribute("aria-label").catch(() => "")) || (await t.innerText().catch(() => "")) || sel).trim().replace(/\s+/g, " ").slice(0, 40);
        try {
          await t.scrollIntoViewIfNeeded({ timeout: 1500 });
          await t.click({ timeout: 2000 });
        } catch {
          continue;
        }
        await page.waitForTimeout(600);
        await note(await page.evaluate(audit, { covered: false, width: size.width, height: size.height }), name);
      }
    }
    await ctx.close();
  }
}
await browser.close();

// One line per problem: where, what, and on which pages and sizes.
const groups = new Map();
for (const f of found) {
  const key = [f.area, f.kind, f.path, f.detail.replace(/\d+(\.\d+)?/g, "#")].join(" | ");
  const g = groups.get(key) || { ...f, urls: new Set(), sizes: new Set(), opens: new Set() };
  if (!g.shot && f.shot) g.shot = f.shot;
  g.urls.add(f.url);
  g.sizes.add(f.size);
  if (f.opened) g.opens.add(f.opened);
  groups.set(key, g);
}
const order = ["error", "zoom", "sideways", "offscreen", "covered", "spill", "cut", "tiny"];
const list = [...groups.values()].sort((a, b) => a.area.localeCompare(b.area) || order.indexOf(a.kind) - order.indexOf(b.kind));
for (const g of list) {
  const urls = [...g.urls];
  console.log(
    `${g.area.padEnd(6)} ${g.kind.padEnd(9)} ${g.detail}\n         ${g.path}${g.label ? `  “${g.label}”` : ""}\n         ${urls.slice(0, 3).join(", ")}${urls.length > 3 ? ` +${urls.length - 3} more` : ""} · ${[...g.sizes].join(", ")}${g.opens.size ? ` · with ${[...g.opens].slice(0, 3).join(", ")} open` : ""}${g.shot ? `\n         picture: ${g.shot}` : ""}`
  );
}
// How much was looked at, so "No problems" can't hide a run that checked nothing.
console.log(`Checked ${visits} page loads (pages × screen sizes).`);
const counts = order.map((k) => [k, list.filter((g) => g.kind === k).length]).filter(([, n]) => n);
console.log(list.length ? `\n${list.length} problems: ${counts.map(([k, n]) => `${n} ${k}`).join(", ")}` : "No problems found.");
if (OUT) fs.writeFileSync(OUT, JSON.stringify(list.map((g) => ({ ...g, urls: [...g.urls], sizes: [...g.sizes], opens: [...g.opens] })), null, 2));
process.exit(list.length ? 1 : 0);
