// A tea's lid label, to print: the cup's heat-seal film lid, from the maker's dieline (95 mm
// across, a pull tab 25 mm wide reaching 15 mm past it), with 2 mm of bleed and the words kept
// 3 mm inside the cut. In mm, centered on the lid. The cut line is its own group (CutContour,
// 100% magenta), as printers' cutters look for; `guides` adds the safe area and bleed edge for a
// proof.

import { inkOn } from "./feed.ts";

const xml = (s) => String(s ?? "").replace(/[<>&"]/g, (ch) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[ch]);

export const LID = { diameter: 95, bleed: 2, safe: 3, tabWidth: 25, tabReach: 15 };

// The lid's outline grown by `grow` mm: the circle, then the tab (a half-round end) met by small
// fillets.
function outline(grow = 0) {
  const r = LID.diameter / 2 + grow;
  const w = LID.tabWidth / 2 + grow;
  const end = LID.diameter / 2 + LID.tabReach - LID.tabWidth / 2; // center of the tab's round end
  const fx = w + 4;
  const fy = Math.sqrt(r * r - fx * fx);
  const f = (n) => +n.toFixed(3);
  return `M${f(-fx)} ${f(fy)}A${f(r)} ${f(r)} 0 1 1 ${f(fx)} ${f(fy)}Q${f(w)} ${f(fy + 1.5)} ${f(w)} ${f(end)}A${f(w)} ${f(w)} 0 0 1 ${f(-w)} ${f(end)}Q${f(-w)} ${f(fy + 1.5)} ${f(-fx)} ${f(fy)}Z`;
}

// `tea`: { short, name, color, blend, caffeine }; `brew`: BREW_GUIDES.Tea; `brand`: the shop's name.
export function lidLabelSvg(tea, { brew, brand = "Mimi Food", guides = false }: { brew?: any; brand?: string; guides?: boolean } = {}) {
  const color = /^#[\da-f]{6}$/i.test(tea.color || "") ? tea.color : "#d8d2c4";
  const ink = inkOn(color);
  const name = String(tea.short || tea.name || "").toUpperCase();
  const r = LID.diameter / 2;
  const top = -(r + LID.bleed);
  const height = LID.diameter + LID.tabReach + LID.bleed * 2;
  const width = LID.diameter + LID.bleed * 2;
  const step = (k) => brew?.steps?.find(([x]) => x === k)?.[1] || "";
  const brewLine = [step("Water"), step("Temperature"), step("Steep")].filter(Boolean).join("  ·  ");
  const kind = [tea.blend, tea.caffeine].filter(Boolean).join("  ·  ").toUpperCase();
  // The name shrinks to stay inside the safe circle (about 0.72 em a letter, with its spacing).
  const nameSize = Math.min(12, (2 * (r - LID.safe) * 0.82) / Math.max(1, name.length * 0.86));
  const end = r + LID.tabReach - LID.tabWidth / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${top} ${top} ${width} ${height}" font-family="Instrument Sans, Helvetica Neue, Arial, sans-serif">
  <title>${xml(tea.short || tea.name)} lid label: ${LID.diameter} mm, ${LID.bleed} mm bleed</title>
  <g id="Art">
    <path d="${outline(LID.bleed)}" fill="${color}"/>
    <g fill="${ink}" text-anchor="middle">
      <text y="-24" font-size="3.6" font-weight="500" letter-spacing="1.1">${xml(brand.toUpperCase())}</text>
      <text y="${(nameSize * 0.36).toFixed(2)}" font-size="${nameSize.toFixed(2)}" font-weight="500" letter-spacing="${(nameSize * 0.1).toFixed(2)}">${xml(name)}</text>
      ${kind ? `<text y="13" font-size="2.9" letter-spacing="0.45">${xml(kind)}</text>` : ""}
      <text y="25.6" font-size="2.6" letter-spacing="0.3">4G LOOSE LEAF TEA</text>
      ${brewLine ? `<text y="30" font-size="2.6" letter-spacing="0.3">${xml(brewLine.toUpperCase())}</text>` : ""}
    </g>
    <path d="M-2.6 ${(end - 1.6).toFixed(2)}h5.2l-2.6 3.8z" fill="none" stroke="${ink}" stroke-width="0.35" stroke-linejoin="round"/>
  </g>
  <g id="CutContour" fill="none" stroke="#ff00ff" stroke-width="0.25">
    <path d="${outline(0)}"/>
  </g>${
    guides
      ? `
  <g id="Guides" fill="none" stroke-width="0.2">
    <circle r="${r - LID.safe}" stroke="#e5322d" stroke-dasharray="1.2 0.8"/>
    <path d="${outline(LID.bleed)}" stroke="#2f9be0" stroke-dasharray="1.2 0.8"/>
  </g>`
      : ""
  }
</svg>`;
}

// A page to print or save as PDF at true size, one label per page.
export function lidLabelPage(tea, opts) {
  const svg = lidLabelSvg(tea, opts);
  const w = LID.diameter + LID.bleed * 2;
  const h = LID.diameter + LID.tabReach + LID.bleed * 2;
  const title = `${tea.short || tea.name} lid label`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex">
<title>${xml(title)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500&display=swap" rel="stylesheet">
<style>
  @page { size: ${w + 20}mm ${h + 20}mm; margin: 0; }
  * { box-sizing: border-box; margin: 0; }
  body { font: 15px/1.4 "Instrument Sans", "Helvetica Neue", Arial, sans-serif; background: #f2f2f2; color: #111; }
  .bar { display: flex; flex-wrap: wrap; gap: 8px 16px; align-items: center; justify-content: space-between; padding: 16px; background: #fff; border-bottom: 1px solid #e4e4e4; }
  .bar p { color: #666; }
  .bar div { display: flex; gap: 8px; flex-wrap: wrap; }
  .bar a, .bar button { font: inherit; padding: 8px 14px; border-radius: 999px; border: 1px solid #d0d0d0; background: #fff; color: inherit; text-decoration: none; cursor: pointer; }
  .bar .primary { background: #111; color: #fff; border-color: #111; }
  .sheet { display: grid; place-items: center; padding: 10mm; }
  .sheet svg { width: ${w}mm; height: ${h}mm; background: #fff; }
  @media print { .bar { display: none; } body { background: #fff; } }
</style></head><body>
<header class="bar"><div><strong>${xml(title)}</strong><p>${LID.diameter} mm cut · ${LID.bleed} mm bleed · ${LID.safe} mm safe area</p></div>
<div><a href="?guides=${opts?.guides ? 0 : 1}">${opts?.guides ? "Hide Guides" : "Show Guides"}</a><a href="?format=svg${opts?.guides ? "&guides=1" : ""}" download>Download SVG</a><button type="button" class="primary" onclick="print()">Print or Save PDF</button></div></header>
<main class="sheet">${svg}</main>
</body></html>`;
}
