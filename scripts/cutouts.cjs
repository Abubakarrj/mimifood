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
const JAR_LO = 573, JAR_HI = 1376; // where the tea jars stand in their 1914 x 1782 photos

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
  // The studio jar photos (beet, ginkgo, bitter melon, horse bean, pumpkin, jerusalem artichoke) are on clean white
  // and need none of the black-box clean-up below.
  const studio = /(beet|ginkonut|bitter-melon|horse-bean|pumpkin-red-bean|jerusalem-artichoke)-tea/.test(path.basename(file));
  const jar = /(^|-)tea(-|\.)|grain/.test(path.basename(file)) && !/hankook/.test(file) && !studio;
  const dark = (p) => data[p * 4 + 3] > 0 && Math.max(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) < (jar ? 85 : 60);
  const peel = () => {
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
    if (jar && darkCount > 0) for (let p = 0; p < w * h; p++) if (reached[p]) data[p * 4 + 3] = 0;
  };
  peel();
  if (jar) {
    // A jar is a tall block: the glow of its label color that spills sideways is cut off at the jar's own width.
    // The jar's width is where columns are mostly made of lit pixels (plastic, label, tea) from top to bottom; black
    // strips and glow beside it are lit in only a few rows.
    const lit = (p) => data[p * 4 + 3] > 128 && Math.max(data[p * 4], data[p * 4 + 1], data[p * 4 + 2]) >= 70;
    let y0 = h, y1 = 0;
    for (let p = 0; p < w * h; p++) if (lit(p)) { const y = Math.floor(p / w); if (y < y0) y0 = y; if (y > y1) y1 = y; }
    // Rows of the lid and the clear plastic below it (the first 18% of the jar): in each, the longest unbroken run of
    // lit pixels is the jar; the median of those runs ignores specks and glow.
    const los = [], his = [];
    for (let y = y0 + Math.round((y1 - y0) * 0.04); y <= y0 + Math.round((y1 - y0) * 0.18); y += 3) {
      let runStart = -1, bestLen = 0, bestLo = 0, gap = 0;
      for (let x = 0; x <= w; x++) {
        const on = x < w && lit(y * w + x);
        if (on) { if (runStart < 0) runStart = x; gap = 0; }
        else if (runStart >= 0 && ++gap > 6) {
          const len = x - gap - runStart;
          if (len > bestLen) { bestLen = len; bestLo = runStart; }
          runStart = -1;
        }
      }
      if (bestLen > 0) { los.push(bestLo); his.push(bestLo + bestLen); }
    }
    los.sort((a, b) => a - b);
    his.sort((a, b) => a - b);
    let lo = los.length ? los[Math.floor(los.length / 2)] : 0;
    let hi = his.length ? his[Math.floor(his.length / 2)] : w - 1;
    lo -= 4;
    hi += 4;
    // These jars were all shot in the same frame, so they stand in the same place; the measured edges above only
    // check that (a label as white as the backdrop, or a black circle, can fool a measurement).
    if (process.env.DEBUG_JAR) console.log("measured", path.basename(file), lo, hi);
    if (w === 1914 && h === 1782) { lo = JAR_LO; hi = JAR_HI; }
    if (process.env.DEBUG_JAR) console.log(path.basename(file), { w, h, y0, y1, lo, hi });
    for (let p = 0; p < w * h; p++) {
      const x = p % w;
      if (x < lo || x > hi) data[p * 4 + 3] = 0;
    }
    // With the sides cut away, the dark corners beside the jar's rounded top and bottom now reach the edge too.
    peel();
    // The jar's walls are the only columns that stay solid top to bottom; streaks sticking out sideways (label color
    // smeared past the glass) only fill a short stretch of rows. Cut at the outermost columns that are mostly solid.
    {
      const cnt = new Uint32Array(w);
      for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 128) cnt[p % w]++;
      const peak = Math.max(...cnt);
      let a = 0, b = w - 1;
      while (a < w - 1 && cnt[a] < peak * 0.85) a++;
      while (b > 0 && cnt[b] < peak * 0.85) b--;
      if (process.env.DEBUG_JAR) console.log("walls", path.basename(file), a, b, peak);
      // Thin ticks stand above the lid's rim: in each column, nothing counts until a solid stretch of 24 rows begins.
      for (let x = a; x <= b; x++) {
        let run = 0, start = -1;
        for (let y = 0; y < h; y++) {
          if (data[(y * w + x) * 4 + 3] > 128) { if (++run >= 24) { start = y - 23; break; } } else run = 0;
        }
        for (let y = 0; y < (start < 0 ? h : start); y++) data[(y * w + x) * 4 + 3] = 0;
      }
      // The rim's corners are rounded, but the photo smears bars straight up from them. Draw the rounded corner back:
      // the flat top (and bottom) read from the middle of the jar, curving down over the outer 90px (33px deep).
      // Under the bars runs the rim's own dark edge line: in each column, the first dark pixel within 60 rows of the top
      // (and of the bottom) is where the jar really starts; the bars above it go.
      const luma = (p) => 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
      const cutT = new Int32Array(w).fill(-1), cutB = new Int32Array(w).fill(-1);
      for (let x = a; x <= b; x++) {
        let t = -1, bt = -1;
        for (let y = 0; y < h; y++) if (data[(y * w + x) * 4 + 3] > 128) { t = y; break; }
        if (t < 0) continue;
        // The jar is the first unbroken stretch from the top; loose bits further down (a red smear under the glass) are not.
        { let gap = 0; bt = t; for (let y = t; y < h; y++) { if (data[(y * w + x) * 4 + 3] > 128) { bt = y; gap = 0; } else if (++gap > 6) break; } }
        cutT[x] = t;
        cutB[x] = bt;
        for (let y = t; y < t + 60; y++) if (luma(y * w + x) < 75) { cutT[x] = y; break; }
        for (let y = bt; y > bt - 60; y--) if (luma(y * w + x) < 75) { cutB[x] = y; break; }
        cutB[x] -= 4; // thin slivers of the label's color hang under the glass
      }
      // A bar that is itself dark would fool one column; the median of the neighbors (±20 columns) does not.
      const med = (arr, x) => {
        const v = [];
        for (let k = Math.max(a, x - 70); k <= Math.min(b, x + 70); k++) if (arr[k] >= 0) v.push(arr[k]);
        v.sort((p, q) => p - q);
        return v.length ? v[Math.floor(v.length / 2)] : -1;
      };
      const medT = new Int32Array(w).fill(-1), medB = new Int32Array(w).fill(-1);
      for (let x = a; x <= b; x++) { medT[x] = med(cutT, x); medB[x] = med(cutB, x); }
      for (let x = a; x <= b; x++) {
        if (medT[x] < 0) continue;
        for (let y = 0; y < medT[x]; y++) data[(y * w + x) * 4 + 3] = 0;
        for (let y = medB[x] + 1; y < h; y++) data[(y * w + x) * 4 + 3] = 0;
      }
      // Whatever still hangs below the glass is only a few pixels wide: the jar ends at the last row that is mostly solid.
      {
        let lastRow = 0;
        for (let y = 0; y < h; y++) {
          let n = 0;
          for (let x = a; x <= b; x++) if (data[(y * w + x) * 4 + 3] > 128) n++;
          if (n >= (b - a) * 0.3) lastRow = y;
        }
        for (let p = (lastRow + 1) * w; p < w * h; p++) data[p * 4 + 3] = 0;
      }
      for (let p = 0; p < w * h; p++) {
        const x = p % w;
        if (x < a || x > b) data[p * 4 + 3] = 0;
      }
    }
  }
  // Shots with extra props: keep only the part of the picture that holds the product, as a share of what's visible
  // [left, top, right, bottom]. Matcha: the bag, not the cup. Oat milks: the cartons, not the white box behind (it
  // vanishes on a white page).
  // (The oat, almond and melon soy milks are cut by hand from their original photos instead: see the product photo notes.)
  const KEEP = { hankook: [0, 0, 0.6, 1] };
  const keepKey = Object.keys(KEEP).find((k) => path.basename(file).includes(k));
  if (keepKey) {
    // Visible extent, ignoring stray specks (a column or row needs 12+ solid pixels to count).
    const cols = new Uint32Array(w), rows = new Uint32Array(h);
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 200) { cols[p % w]++; rows[Math.floor(p / w)]++; }
    let x0 = 0, x1 = w - 1, y0 = 0, y1 = h - 1;
    while (x0 < w - 1 && cols[x0] < 12) x0++;
    while (x1 > 0 && cols[x1] < 12) x1--;
    while (y0 < h - 1 && rows[y0] < 12) y0++;
    while (y1 > 0 && rows[y1] < 12) y1--;
    const [kl, kt, kr, kb] = KEEP[keepKey];
    if (process.env.DEBUG_JAR) console.log("keep", keepKey, { w, h, x0, x1, y0, y1 });
    for (let p = 0; p < w * h; p++) {
      const x = p % w, y = (p - x) / w;
      if (x < x0 + (x1 - x0) * kl || x > x0 + (x1 - x0) * kr || y < y0 + (y1 - y0) * kt || y > y0 + (y1 - y0) * kb) data[p * 4 + 3] = 0;
    }
  }
  // Leaves and sprigs set beside a pack go: [left, top] of the corner (as a share of the visible product) to clear.
  const CLEAR = { "korean-beef-short-rib": [0.8, 0.6], jumulleok: [0.8, 0.6] };
  // Matcha: the bag's right edge runs straight, so cut the bowl's rim off there and make the bag's bottom solid
  // (the bowl's white showed through it as a pink haze).
  if (/hankook/.test(path.basename(file))) {
    let x0 = w, y0 = h, y1 = 0;
    for (let p = 0; p < w * h; p++) {
      if (data[p * 4 + 3] === 0) continue;
      const x = p % w, y = (p - x) / w;
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    const mid = Math.round(y0 + (y1 - y0) * 0.5);
    let R = 0;
    for (let x = 0; x < w; x++) if (data[(mid * w + x) * 4 + 3] > 128) R = x;
    // The bag's bottom edge, read well left of the bowl: nothing below it belongs to the bag.
    const probe = Math.round(x0 + (R - x0) * 0.4);
    let floor = 0;
    for (let y = 0; y < h; y++) if (data[(y * w + probe) * 4 + 3] > 128) floor = y;
    for (let p = 0; p < w * h; p++) {
      const x = p % w, y = (p - x) / w;
      if (x > R || y > floor) data[p * 4 + 3] = 0;
      else if (y > y0 + (y1 - y0) * 0.78 && x >= x0 && data[p * 4 + 3] > 0) data[p * 4 + 3] = 255;
    }
  }
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
    // Leaves are the only green on these brown pouches.
    const leaf = [];
    for (let p = 0; p < w * h; p++) {
      const r = data[p * 4], g = data[p * 4 + 1], b = data[p * 4 + 2];
      if (data[p * 4 + 3] > 0 && ((g > r + 4 && g > b + 14) || (r - g <= 10 && g - b > 25))) leaf.push(p);
    }
    // The leaf and the dark fringe around it (10px) go.
    for (const p of leaf) {
      const x = p % w, y = (p - x) / w;
      for (let dy = -10; dy <= 10; dy++) for (let dx = -10; dx <= 10; dx++) {
        const xx = x + dx, yy = y + dy;
        if (xx >= 0 && xx < w && yy >= 0 && yy < h) data[(yy * w + xx) * 4 + 3] = 0;
      }
    }
    const [cx, cy] = CLEAR[clearKey];
    if (process.env.DEBUG_JAR) console.log("clear", clearKey, { w, h, x0, x1, y0, y1 });
    for (let p = 0; p < w * h; p++) {
      const x = p % w, y = (p - x) / w;
      if (x > x0 + (x1 - x0) * cx && y > y0 + (y1 - y0) * cy) data[p * 4 + 3] = 0;
    }
  }
  // (The mala packets now come from the store's packet-only photos, so this isn't needed; kept for photos with props.)
  if (process.env.ISOLATE_PACKET && /mala-(stir|spicy)/.test(path.basename(file))) {
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
        const padX = Math.round((bx1 - bx0) * (/stir/.test(file) ? 0.55 : 0.06)), padY = Math.round((by1 - by0) * 0.06);
        if (x < bx0 - (/stir/.test(file) ? 4 : padX) || x > bx1 + padX || y < by0 - padY || y > by1 + padY) data[p * 4 + 3] = 0;
      }
    }
  }
  // The kids' red ginseng jar was shot on black: shave the dark fringe off its outline, a pixel at a time.
  if (/red-ginseng/.test(path.basename(file))) {
    for (let pass = 0; pass < 5; pass++) {
      const kill = [];
      for (let p = 0; p < w * h; p++) {
        if (data[p * 4 + 3] === 0) continue;
        const x = p % w, y = (p - x) / w;
        const edge = x === 0 || y === 0 || x === w - 1 || y === h - 1 || data[(p - 1) * 4 + 3] === 0 || data[(p + 1) * 4 + 3] === 0 || data[(p - w) * 4 + 3] === 0 || data[(p + w) * 4 + 3] === 0;
        if (!edge) continue;
        const luma = 0.3 * data[p * 4] + 0.59 * data[p * 4 + 1] + 0.11 * data[p * 4 + 2];
        if (luma < 95 || data[p * 4 + 3] < 255) kill.push(p);
      }
      for (const p of kill) data[p * 4 + 3] = 0;
    }
    // The lid's top rows carry thin streaks sticking out sideways: take the top 9 rows of the jar off.
    let top = h;
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] > 0) { top = Math.floor(p / w); break; }
    for (let p = 0; p < w * (top + 9); p++) data[p * 4 + 3] = 0;
  }
  // Haze: faint pixels far from anything solid are leftover backdrop glow; only the soft edge within 6px of the product stays.
  if (/katsu|short-rib|jumulleok/.test(path.basename(file))) {
    const R = 6;
    const solid = new Uint8Array(w * h);
    for (let p = 0; p < w * h; p++) if (data[p * 4 + 3] >= 250) solid[p] = 1;
    const dil = (src, horizontal) => {
      const out = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let on = 0;
          for (let d = -R; d <= R && !on; d++) {
            const xx = horizontal ? x + d : x, yy = horizontal ? y : y + d;
            if (xx >= 0 && xx < w && yy >= 0 && yy < h && src[yy * w + xx]) on = 1;
          }
          out[y * w + x] = on;
        }
      }
      return out;
    };
    const near = dil(dil(solid, true), false);
    for (let p = 0; p < w * h; p++) if (!near[p]) data[p * 4 + 3] = 0;
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
  for (let p = 0; p < w * h; p++) if (seen[p] && sizes[seen[p]] < biggest * (/sweet-spicy|katsu|short-rib|jumulleok/.test(path.basename(file)) ? 0.3 : 0.1)) data[p * 4 + 3] = 0;
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
