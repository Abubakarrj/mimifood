// Draws the maps in Numeral posts from Natural Earth's country outlines: content/maps/tea-regions.svg
// and content/maps/coffee-origins.svg. Prints where each region (TEA_REGIONS in js/tea.js,
// COFFEE_REGIONS in js/data.js) sits on its map, in % of the map. Run it again only to change a
// map's frame or add a region:
//   npm i --no-save world-atlas@2 topojson-client@3 d3-geo@3
//   node scripts/build-maps.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { feature } from "topojson-client";
import { geoMercator, geoPath } from "d3-geo";
const topo = JSON.parse(readFileSync("node_modules/world-atlas/countries-50m.json", "utf8"));
const countries = feature(topo, topo.objects.countries).features;
const MAPS = {
  tea: {
    file: "content/maps/tea-regions.svg",
    label: "Map of tea regions in China, Japan, Korea, Taiwan, India and Sri Lanka",
    frame: [[62, 2], [150, 47]], // all of India and Sri Lanka to all of Japan
    highlight: ["156", "392", "410", "158", "356", "144"], // China, Japan, South Korea, Taiwan, India, Sri Lanka
    regions: [
      ["wuyi", 117.7, 27.7], ["anxi", 118.19, 25.06], ["fuding", 120.2, 27.32], ["hangzhou", 120.15, 30.25], ["yunnan", 100.1, 23.0],
      ["hadong", 127.75, 35.07], ["uji", 135.8, 34.88], ["shizuoka", 138.38, 34.97], ["sayama", 139.4, 35.85], ["nantou", 120.9, 23.9],
      ["darjeeling", 88.26, 27.04], ["assam", 92.9, 26.2], ["sri-lanka", 80.7, 7.0],
    ],
  },
  coffee: {
    file: "content/maps/coffee-origins.svg",
    label: "Map of where our coffees are grown: Brazil, Colombia, Bolivia, Ethiopia and Kenya",
    frame: [[-94, -57], [56, 34]], // all of South America to the Horn of Africa
    highlight: ["076", "170", "068", "231", "404"], // Brazil, Colombia, Bolivia, Ethiopia, Kenya
    regions: [["cauca-huila", -75.8, 2.4], ["caranavi", -67.57, -15.84], ["chapada", -41.4, -12.6], ["sidama", 38.6, 6.6], ["kirinyaga", 37.3, -0.5]],
  },
};
const W = 1000;
for (const [name, m] of Object.entries(MAPS)) {
  const [[x0, y0], [x1, y1]] = m.frame;
  const frame = { type: "Feature", geometry: { type: "MultiPoint", coordinates: [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] } };
  const proj = geoMercator().fitWidth(W, frame);
  const H = Math.round(geoPath(proj).bounds(frame)[1][1]);
  proj.clipExtent([[-2, -2], [W + 2, H + 2]]);
  const path = geoPath(proj).digits(0);
  const hi = new Set(m.highlight);
  let land = "", lit = "";
  for (const f of countries) {
    const d = path(f);
    if (!d) continue;
    if (hi.has(String(f.id))) lit += `<path d="${d}"/>`;
    else land += d;
  }
  writeFileSync(m.file, `<svg class="note-map-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="${m.label}" focusable="false"><path class="note-map-land" d="${land}"/><g class="note-map-lit">${lit}</g></svg>`);
  console.log(name, m.file, `${W}x${H}`);
  for (const [id, lon, lat] of m.regions) {
    const [x, y] = proj([lon, lat]);
    console.log(`  ${id}: x ${(x / W * 100).toFixed(1)}, y ${(y / H * 100).toFixed(1)}`);
  }
}
