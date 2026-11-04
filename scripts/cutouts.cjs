// Turns background-removed product photos (transparent PNGs) into the shop's floating product images:
// stray specks cleaned off, trimmed to the product, and set on an even square so every product shows at a
// consistent size. Output: assets/products/cut/<name>.webp
//   node scripts/cutouts.cjs <folder of cutout PNGs>
// (The PNGs come from running each Shopify photo through a background remover; the file name is the
// product's Shopify handle, see cutName in server.ts.)
const sharp = require("sharp");
const fs = require("node:fs");
const path = require("node:path");

const OUT = path.join(__dirname, "..", "assets", "products", "cut");
const CANVAS = 900; // square, transparent
const FIT = 780; // the product fits in this much of it

async function tidy(file) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  // Faint leftovers (shadows, props' edges) go; the product's edge stays soft.
  for (let p = 0; p < w * h; p++) {
    const a = data[p * 4 + 3];
    data[p * 4 + 3] = a < 40 ? 0 : a > 215 ? 255 : Math.round(((a - 40) / 175) * 255);
  }
  // Photos shot on black leave a dark box behind the product: eat dark pixels that connect to the picture's edge
  // (the product's own outline is lighter than that, so it stops the spread).
  const jar = /(^|-)tea(-|\.)|grain/.test(path.basename(file)) && !/hankook/.test(file);
  const dark = (p) => data[p * 4 + 3] > 0 && Math.max(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) < (jar ? 85 : 60);
  const gone = new Uint8Array(w * h);
  const q = [];
  for (let x = 0; x < w; x++) for (const y of [0, h - 1]) q.push(y * w + x);
  for (let y = 0; y < h; y++) for (const x of [0, w - 1]) q.push(y * w + x);
  let darkCount = 0;
  const reached = new Uint8Array(w * h);
  // Spread through empty and dark pixels from the edge.
  while (q.length) {
    const p = q.pop();
    if (reached[p]) continue;
    if (data[p * 4 + 3] > 0 && !dark(p)) continue;
    reached[p] = 1;
    if (data[p * 4 + 3] > 0) darkCount++;
    const x = p % w, y = (p - x) / w;
    if (x > 0) q.push(p - 1);
    if (x < w - 1) q.push(p + 1);
    if (y > 0) q.push(p - w);
    if (y < h - 1) q.push(p + w);
  }
  // Only the tea and grain jars, which were shot on black (a dark pouch would lose its body to this).
  if (jar && darkCount > w * h * 0.01) for (let p = 0; p < w * h; p++) if (reached[p]) data[p * 4 + 3] = 0;
  if (jar) {
    // A jar is a tall block: the glow of its label color that spills sideways is cut off at the jar's own width.
    // The width is read off the lid, a band near the top where only the jar is.
    let y0 = h, y1 = 0;
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 128) { const y = Math.floor(p / w); if (y < y0) y0 = y; if (y > y1) y1 = y; }
    // (only its near-white, clear-plastic pixels count, so colored glow and dark boxes don't widen it).
    const bandTop = y0 + Math.round((y1 - y0) * 0.03), bandEnd = y0 + Math.round((y1 - y0) * 0.14);
    const xs = [];
    for (let y = bandTop; y <= bandEnd; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (data[i + 3] > 128 && Math.min(data[i], data[i + 1], data[i + 2]) > 150) xs.push(x);
      }
    }
    xs.sort((a, b) => a - b);
    // Every jar is about two thirds as wide as it is tall; the lid gives where it sits.
    const mid = xs.length ? (xs[Math.floor(xs.length * 0.1)] + xs[Math.floor(xs.length * 0.9)]) / 2 : w / 2;
    const half = (y1 - y0) * 0.335;
    const lo = Math.round(mid - half), hi = Math.round(mid + half);
    if (process.env.DEBUG_JAR) console.log(path.basename(file), { w, h, y0, y1, lo, hi });
    for (let p = 0; p < w * h; p++) {
      const x = p % w;
      if (x < lo || x > hi) data[p * 4 + 3] = 0;
    }
  }
  // Shots with extra props: keep only the part of the picture that holds the product, as a share of what's visible
  // [left, top, right, bottom]. Matcha: the bag, not the cup. Oat milks: the cartons, not the white box behind (it
  // vanishes on a white page).
  const KEEP = { hankook: [0, 0, 0.6, 1], "korean-whole-oat": [0.5, 0.1, 1, 1], "whole-oat-almond": [0.5, 0.05, 1, 1] };
  const keepKey = Object.keys(KEEP).find((k) => path.basename(file).includes(k));
  if (keepKey) {
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let p = 0; p < w * h; p++) {
      if (data[p * 4 + 3] === 0) continue;
      const x = p % w, y = (p - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const [kl, kt, kr, kb] = KEEP[keepKey];
    for (let p = 0; p < w * h; p++) {
      const x = p % w, y = (p - x) / w;
      if (x < x0 + (x1 - x0) * kl || x > x0 + (x1 - x0) * kr || y < y0 + (y1 - y0) * kt || y > y0 + (y1 - y0) * kb) data[p * 4 + 3] = 0;
    }
  }
  // Leaves and sprigs set beside a pack go: [left, top] of the corner (as a share of the visible product) to clear.
  const CLEAR = { "korean-beef-short-rib": [0.8, 0.6], jumulleok: [0.8, 0.6] };
  const clearKey = Object.keys(CLEAR).find((k) => path.basename(file).includes(k));
  if (clearKey) {
    let x0 = w, x1 = 0, y0 = h, y1 = 0;
    for (let p = 0; p < w * h; p++) {
      if (data[p * 4 + 3] === 0) continue;
      const x = p % w, y = (p - x) / w;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const [cx, cy] = CLEAR[clearKey];
    for (let p = 0; p < w * h; p++) {
      const x = p % w, y = (p - x) / w;
      if (x > x0 + (x1 - x0) * cx && y > y0 + (y1 - y0) * cy) data[p * 4 + 3] = 0;
    }
  }
  if (/mala-(stir|spicy)/.test(path.basename(file))) {
    // Just the silver packet: find its gray body and drop everything outside it (the food and props around it).
    const gray = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) {
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      if (data[p * 4 + 3] > 200 && Math.max(r, g, b) - Math.min(r, g, b) < 18 && Math.min(r, g, b) > 110) gray[p] = 1;
    }
    const lab = new Int32Array(w * h);
    const st = [];
    let best = 0, bestId = 0, id = 0, bx0 = 0, bx1 = 0, by0 = 0, by1 = 0;
    for (let s = 0; s < w * h; s++) {
      if (!gray[s] || lab[s]) continue;
      id++;
      let n = 0, x0 = w, x1 = 0, y0 = h, y1 = 0;
      lab[s] = id;
      st.push(s);
      while (st.length) {
        const p = st.pop();
        n++;
        const x = p % w, y = (p - x) / w;
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
          if (q >= 0 && gray[q] && !lab[q]) { lab[q] = id; st.push(q); }
        }
      }
      if (n > best) { best = n; bestId = id; bx0 = x0; bx1 = x1; by0 = y0; by1 = y1; }
    }
    if (bestId) {
      for (let p = 0; p < w * h; p++) {
        const x = p % w, y = (p - x) / w;
        if (x < bx0 - 4 || x > bx1 + (/stir/.test(file) ? Math.round((bx1 - bx0) * 0.55) : 4) || y < by0 - 4 || y > by1 + 4) data[p * 4 + 3] = 0;
      }
    }
  }
  // Keep only the biggest connected piece (plus pieces over a tenth of its size): props that were left behind go.
  const seen = new Int32Array(w * h);
  const sizes = [];
  const stack = [];
  let label = 0;
  for (let start = 0; start < w * h; start++) {
    if (seen[start] || data[start * 4 + 3] === 0) continue;
    label++;
    let count = 0;
    seen[start] = label;
    stack.push(start);
    while (stack.length) {
      const p = stack.pop();
      count++;
      const x = p % w, y = (p - x) / w;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
        if (q >= 0 && !seen[q] && data[q * 4 + 3] > 0) {
          seen[q] = label;
          stack.push(q);
        }
      }
    }
    sizes[label] = count;
  }
  const biggest = Math.max(...sizes.filter(Boolean));
  for (let p = 0; p < w * h; p++) if (seen[p] && sizes[seen[p]] < biggest * 0.1) data[p * 4 + 3] = 0;
  const trimmed = await sharp(data, { raw: { width: w, height: h, channels: 4 } }).png().toBuffer();
  const box = await sharp(trimmed).trim({ threshold: 1 }).resize({ width: FIT, height: FIT, fit: "inside" }).png().toBuffer();
  const meta = await sharp(box).metadata();
  // Centered, resting a little below the middle (so a shadow under it has room).
  const left = Math.round((CANVAS - meta.width) / 2);
  const top = Math.round((CANVAS - meta.height) / 2) + 20;
  return sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: box, left, top: Math.min(top, CANVAS - meta.height) }])
    .webp({ quality: 88, alphaQuality: 96 })
    .toBuffer();
}

(async () => {
  const from = process.argv[2];
  if (!from) throw new Error("Give the folder of cutout PNGs.");
  fs.mkdirSync(OUT, { recursive: true });
  let n = 0;
  for (const f of fs.readdirSync(from).filter((x) => x.endsWith(".png"))) {
    fs.writeFileSync(path.join(OUT, f.replace(/\.png$/, ".webp")), await tidy(path.join(from, f)));
    n++;
  }
  console.log(`made ${n} product images in assets/products/cut`);
})();
