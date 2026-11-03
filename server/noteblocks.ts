// Interactive pieces for Numeral posts, each written on its own line in a post:
//   {tea:<id>}      a tea from the shop, as a card (the cup is drawn by js/app.js)
//   {teas}          every tea on sale, as cards
//   {tea-types}     how oxidized each kind of tea is, as a chart
//   {cultivars}     every tea cultivar (js/tea.js), as a table to filter by country or search
//   {tea-map}       where the cultivars grow, on a map (tap a region for its cultivars)
//   {coffee-map}    where our coffees grow, on a map (tap a region for its coffees)
//   {roast-chart}   light, medium and dark roast compared
// All of it is plain HTML from the server, so search engines read every word; js/app.js adds
// the filtering, the search and the map's taps.

import { readFileSync } from "node:fs";
import path from "node:path";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const slug = (s) =>
  String(s || "")
    .normalize("NFKD")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
// The first sentence of a description ("var." doesn't end one).
const firstSentence = (t) => (String(t).match(/^.+?(?<!\bvar)[.!?](?=\s|$)/)?.[0] || String(t)).trim();

export const COUNTRY_ADJ = { China: "Chinese", Korea: "Korean", Japan: "Japanese", Taiwan: "Taiwanese", India: "Indian", "Sri Lanka": "Sri Lankan" };

export function createNoteBlocks({ root, data, money }) {
  const maps = {};
  const mapSvg = (name) => (maps[name] ??= readFileSync(path.join(root, "content", "maps", `${name}.svg`), "utf8"));
  const teasOnSale = () => (data.ACCESSORIES || []).filter((a) => a.category === "Tea");
  const tea = (id) => teasOnSale().find((a) => a.id === id);
  const product = (id) => data.PRODUCTS.find((p) => p.id === id);
  const cultivars = () => (data.TEA_CULTIVARS || []).flatMap((g) => g.entries.map((e) => ({ ...e, country: g.country })));
  const regionOf = (id) => (data.TEA_REGIONS || []).find((r) => r.cultivars.includes(id));
  const priceText = (x) => (x.soldOut ? "Sold out" : x.price == null ? "Coming Soon" : money(x.price));

  const teaCard = (t) =>
    `<a class="note-coffee note-tea" data-tea="${esc(t.id)}" href="products/${encodeURIComponent(t.id)}"><span class="note-coffee-art product-image" aria-hidden="true"></span><span><strong>${esc(t.name)}</strong><small>${esc([t.blend, t.notes].filter(Boolean).join(" · "))}</small><span>${esc(priceText(t))}</span></span></a>`;
  const coffeeCard = (p) =>
    `<a class="note-coffee" data-coffee="${esc(p.id)}" href="products/${encodeURIComponent(p.id)}"><span class="note-coffee-art product-image" aria-hidden="true">${p.image ? `<span class="photo-art"><img class="product-photo" src="${esc(p.image)}" alt="" loading="lazy"></span>` : ""}</span><span><strong>${esc(p.name)}</strong>${p.notes ? `<small>${esc(p.notes)}</small>` : ""}<span>${p.soldOut ? "Sold out" : `From ${esc(money(p.price))}`}</span></span></a>`;

  // Kinds of tea by how much the leaf oxidizes: a bar along one scale, then the two that sit off it.
  const TEA_TYPES = [
    ["Green", 0, 5, "None: heated soon after picking"],
    ["White & yellow", 5, 20, "Light: little handling, slow drying"],
    ["Oolong", 12, 80, "Partial: from floral to roasted"],
    ["Black", 85, 100, "Full: malty and round"],
  ];
  function teaTypes() {
    const rows = TEA_TYPES.map(
      ([name, from, to, note]) =>
        `<tr><th scope="row">${esc(name)}</th><td><span class="note-scale" aria-hidden="true"><i style="--from:${from}%;--to:${to}%"></i></span><small>${esc(note)}</small></td></tr>`
    ).join("");
    return `<figure class="note-chart note-tea-types">
<table>
<thead><tr><th scope="col">Kind</th><th scope="col"><span class="note-scale-axis"><span>Not oxidized</span><span>Fully oxidized</span></span><span class="visually-hidden">Oxidation</span></th></tr></thead>
<tbody>${rows}
<tr class="is-off"><th scope="row">Puerh</th><td><small>Off the scale: Yunnan large-leaf tea, fermented or aged for years</small></td></tr>
<tr class="is-off"><th scope="row">Herbal</th><td><small>Off the scale: not from the tea plant, so no cultivar, and mostly caffeine free</small></td></tr>
</tbody></table></figure>`;
  }

  // Every cultivar, grouped by country (each group keeps its "Japanese tea cultivars" anchor).
  function cultivarTable() {
    const groups = (data.TEA_CULTIVARS || []).map((g) => {
      const rows = g.entries
        .map((e) => {
          const r = regionOf(e.id);
          const ours = teasOnSale().filter((t) => t.cultivar === e.id);
          const words = [e.name, e.native, e.gloss, g.country, r?.name, e.about].filter(Boolean).join(" ");
          return `<tr id="${esc(e.id)}" data-country="${esc(g.country)}" data-region="${esc(r?.id || "")}" data-search="${esc(words.toLowerCase())}">
<th scope="row"><strong>${esc(e.name)}</strong>${e.native ? `<small lang="${g.country === "Japan" ? "ja" : g.country === "Korea" ? "ko" : "zh"}">${esc(e.native)}</small>` : ""}${e.gloss ? `<small>“${esc(e.gloss)}”</small>` : ""}</th>
<td>${esc(firstSentence(e.about))}${ours.length ? ` <span class="cultivar-ours">Our ${ours.map((t) => `<a href="products/${encodeURIComponent(t.id)}">${esc(t.short || t.name)}</a>`).join(", ")}</span>` : ""}</td>
<td>${esc(r ? r.name : g.country)}</td></tr>`;
        })
        .join("\n");
      return `<tbody id="${esc(slug(`${COUNTRY_ADJ[g.country] || g.country} tea cultivars`))}" data-country="${esc(g.country)}"><tr class="cultivar-group"><th colspan="3" scope="rowgroup">${esc(COUNTRY_ADJ[g.country] || g.country)} tea cultivars</th></tr>\n${rows}</tbody>`;
    });
    const countries = (data.TEA_CULTIVARS || []).map((g) => g.country);
    return `<div class="cultivar-explorer" data-cultivars>
<div class="cultivar-tools">
<div class="filters" role="group" aria-label="Country" data-cultivar-countries hidden>${["All", ...countries].map((c, i) => `<button type="button" data-country="${esc(c)}" aria-pressed="${i === 0}">${esc(c)}</button>`).join("")}</div>
<label class="cultivar-search" data-cultivar-search-box hidden><span class="visually-hidden">Search cultivars</span><input type="search" placeholder="Search ${cultivars().length} cultivars" data-cultivar-search autocomplete="off"></label>
<p class="cultivar-region" data-cultivar-region hidden></p>
</div>
<div class="cultivar-scroll"><table class="cultivar-table">
<thead><tr><th scope="col">Cultivar</th><th scope="col">Known for</th><th scope="col">Grown in</th></tr></thead>
${groups.join("\n")}
</table></div>
<p class="cultivar-empty muted" data-cultivar-empty hidden>No cultivars match. Try another word.</p>
</div>`;
  }

  // A map with a dot per region; under it, each region's panel (all in the page; js/app.js shows
  // the one tapped, and zooms the map).
  function map(name, regions, panel) {
    const dots = regions
      .map((r, i) => `<button type="button" class="note-map-dot${r.x > 75 ? " is-east" : r.x < 20 ? " is-west" : ""}" style="left:${r.x}%;top:${r.y}%" data-map-region="${esc(r.id)}" aria-pressed="${i === 0}" aria-label="${esc(r.name)}, ${esc(r.country)}"><span>${esc(r.name)}</span></button>`)
      .join("");
    const chips = regions.map((r, i) => `<button type="button" data-map-region="${esc(r.id)}" aria-pressed="${i === 0}">${esc(r.name)}</button>`).join("");
    const panels = regions.map((r, i) => `<section class="note-map-panel${i === 0 ? " is-active" : ""}" data-map-panel="${esc(r.id)}"><h3>${esc(r.name)} <small>${esc([r.place, r.country].filter(Boolean).join(", "))}</small></h3>${panel(r)}</section>`).join("\n");
    return `<figure class="note-map" data-note-map>
<div class="note-map-frame"><div class="note-map-canvas">${mapSvg(name)}${dots}</div></div>
<div class="filters note-map-chips" role="group" aria-label="Regions">${chips}</div>
<div class="note-map-panels">${panels}</div>
</figure>`;
  }

  const teaMap = () =>
    map("tea-regions", data.TEA_REGIONS || [], (r) => {
      const list = r.cultivars.map((id) => cultivars().find((c) => c.id === id)).filter(Boolean);
      return `<p>${list.map((c) => `<a href="#${esc(c.id)}" data-cultivar-link="${esc(c.id)}">${esc(c.name)}</a>`).join(" · ")}</p><button type="button" class="link-button" data-map-filter="${esc(r.id)}">Show in the table</button>`;
    });

  const coffeeMap = () =>
    map("coffee-origins", (data.COFFEE_REGIONS || []).filter((r) => r.products.some(product)), (r) => `<div class="note-cards">${r.products.map(product).filter(Boolean).map(coffeeCard).join("")}</div>`);

  // Light, medium and dark compared: pick one on the roast's colour bar and its card shows how it
  // tastes and looks, its traits as bars. Radio buttons and CSS only (works without scripts); light,
  // how we roast, is picked first. Each chart on a page gets its own group name.
  const ROAST = [
    { id: "light", name: "Light", when: "Ends soon after first crack", color: "#b4844f", tastes: "Fruit, flowers, citrus, honey", looks: "Light brown, dry surface", choose: "Clarity, brightness and distinct flavors", traits: [5, 5, 2, 1] },
    { id: "medium", name: "Medium", when: "Between first and second crack", color: "#7a4c27", tastes: "Caramel, nuts, milk chocolate", looks: "Medium brown, mostly dry", choose: "Balance and sweetness", traits: [3, 3, 3, 3] },
    { id: "dark", name: "Dark", when: "Into second crack", color: "#2e1d12", tastes: "Bittersweet chocolate, toast, smoke", looks: "Near black, often oily", choose: "Bitterness and a pronounced roasted taste", traits: [1, 1, 5, 5] },
  ];
  const TRAITS = ["Acidity", "Origin character", "Body", "Roast flavor"];
  const level = (n) => (n >= 4 ? "High" : n === 3 ? "Medium" : "Low");
  let roastCharts = 0;
  function roastChart() {
    const group = `roast-${++roastCharts}`;
    return `<figure class="note-chart note-roast">
<fieldset class="roast-pick"><legend class="visually-hidden">Roast level</legend>
<div class="roast-track">${ROAST.map((r, i) => `<label class="roast-seg roast-${r.id}"><input type="radio" name="${group}" value="${r.id}"${i === 0 ? " checked" : ""}><span>${esc(r.name)}</span></label>`).join("")}</div>
<div class="roast-cracks" aria-hidden="true"><span style="--at:34%">First crack</span><span style="--at:74%">Second crack</span></div>
</fieldset>
${ROAST.map((r) => `<div class="roast-card roast-${r.id}" style="--bean:${r.color}">
<header><span class="roast-bean" aria-hidden="true"></span><div><h4>${esc(r.name)} roast</h4><small>${esc(r.when)}</small></div></header>
<ul class="roast-traits">${TRAITS.map((t, i) => `<li><span>${esc(t)}</span><small>${level(r.traits[i])}</small></li>`).join("")}</ul>
<dl class="roast-facts"><div><dt>Tastes of</dt><dd>${esc(r.tastes)}</dd></div><div><dt>Looks</dt><dd>${esc(r.looks)}</dd></div><div><dt>Choose it for</dt><dd>${esc(r.choose)}</dd></div></dl>
</div>`).join("")}
</figure>`;
  }

  // For renderBody: the HTML for "{name}" or "{name:arg}", or null.
  return (name, arg) => {
    if (name === "tea") return tea(arg) ? teaCard(tea(arg)) : null;
    if (name === "teas") return teasOnSale().length ? `<div class="note-cards">${teasOnSale().map(teaCard).join("")}</div>` : null;
    if (name === "tea-types") return teaTypes();
    if (name === "cultivars") return cultivarTable();
    if (name === "tea-map") return teaMap();
    if (name === "coffee-map") return coffeeMap();
    if (name === "roast-chart") return roastChart();
    return null;
  };
}
