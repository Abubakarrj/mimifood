// The coffee catalogue, edited in the back office: products (with photos) and the labels
// shown on them ("New Arrival", "Summer Sale"). A label can carry a discount, which then
// applies to every product wearing it; the shop shows the label and the reduced price.
//
// Stored with server/storage.js as storage.open("catalog", CATALOG_PARTS). On first run the
// products in js/data.js are copied in; from then on the database is the source of truth and
// the server writes the live list into js/data.js as it serves it (see server.js).

import { shopifyLink, shopifyPrice } from "./shopify.ts";
import { randomBytes } from "node:crypto";

export const CATALOG_PARTS = {
  products: (p) => p.id,
  badges: (b) => b.id, // "labels" in the back office; named apart from shipping labels
  photos: (f) => f.id,
  menuSections: (x) => x.id,
  menuItems: (x) => x.id,
  optionSets: (x) => x.id, // drink options: Size, Milk, Extras… ticked per menu item
  teas: (t) => t.id, // the shop's teas (each a pack of 8 single-serve cups)
  foods: (f) => f.id, // the shop's food products: sauces, seasonings, soups, drinks
  accessoryBadges: (x) => x.id, // labels on the accessories (they live in js/data.js): { id, badges }
};

// Starting drink options, made once so there's something to edit. Prices are add-ons.
const DEFAULT_OPTION_SETS = [
  { id: "size", name: "Size", multi: false, choices: [{ id: "regular", name: "Regular", price: 0 }, { id: "large", name: "Large", price: 0.75 }] },
  { id: "milk", name: "Milk", multi: false, choices: [{ id: "whole", name: "Whole milk", price: 0 }, { id: "oat", name: "Oat milk", price: 0.75 }, { id: "almond", name: "Almond milk", price: 0.75 }] },
  { id: "extras", name: "Extras", multi: true, choices: [{ id: "shot", name: "Extra shot", price: 1 }, { id: "vanilla", name: "Vanilla syrup", price: 0.75 }] },
];

// Menu: how an item is drawn when it has no photo, and its dietary labels.
export const MENU_KINDS = ["hot", "iced", "food"];
export const FOOD_SHAPES = ["croissant", "painchoc", "scroll", "loaf", "cookie", "toastie", "toast", "bowl"];
export const DIET_TAGS = ["V", "VG", "GF", "DF"];

export class CatalogError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const longText = (v, max) => String(v ?? "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max);
const cents = (n) => Math.round(n * 100) / 100;
const slug = (v) =>
  String(v)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);

export const PHOTO_TYPES = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
export const PHOTO_MAX_BYTES = 2_500_000;
const COLOR_RE = /^#[0-9a-f]{6}$/i;

// The fields a product keeps, in the order the back office shows them.
const FIELDS = ["name", "short", "type", "price", "price1kg", "color", "notes", "region", "process", "variety", "altitude", "about"];

export function createCatalog({ store, seed, menuSeed = [], roastTypes = ["Espresso", "Filter"], teaTypes = [], cultivars = [], takenIds = () => [], accessories = () => [] }) {
  const db = store.data;
  db.accessoryBadges ||= [];
  db.foods ||= [];
  const save = store.save;
  // The roast type is every product's built-in label, so custom labels can't repeat it.
  const reserved = new Set(roastTypes.flatMap((t) => [t, `${t} roast`]).concat("Light roast", "Whole bean", "Coffee").map((n) => n.toLowerCase()));
  const roastOf = (type) => roastTypes.find((t) => t.toLowerCase() === String(type || "").trim().toLowerCase());

  async function seedOptions() {
    db.optionSets ||= [];
    if (db.optionSets.length || db.menuItems.some((x) => x.options?.length)) return;
    db.optionSets.push(...DEFAULT_OPTION_SETS.map((o, i) => ({ ...o, position: i, createdAt: new Date().toISOString() })));
    await save();
  }

  // Default photos for menu items (`image` in js/data.js CAFE_MENU), used until a photo is
  // uploaded in the back office.
  const seedImages = new Map(menuSeed.flatMap((sec) => sec.items).filter((it) => it.image).map((it) => [it.id, it.image]));
  const imageOf = (x) => (x.photo ? `/media/${x.photo}` : seedImages.get(x.id) || null);

  async function seedMenu() {
    await seedOptions();
    if (db.menuSections.length || db.menuItems.length || !menuSeed.length) return;
    const at = new Date().toISOString();
    menuSeed.forEach((sec, i) => {
      const sectionId = slug(sec.title) || `section-${i + 1}`;
      db.menuSections.push({ id: sectionId, title: sec.title, position: i, createdAt: at });
      sec.items.forEach((it, j) =>
        db.menuItems.push({
          id: it.id,
          sectionId,
          name: it.name,
          price: it.price,
          note: it.note || "",
          tags: (it.tags || []).filter((t) => DIET_TAGS.includes(t)),
          kind: MENU_KINDS.includes(it.style) ? it.style : "hot",
          shape: it.shape || "",
          color: it.color || "",
          topping: Boolean(it.topping),
          photo: null,
          soldOut: false,
          visible: true,
          position: j,
          createdAt: at,
        })
      );
    });
    await save();
  }

  async function seedIfEmpty() {
    await seedMenu();
    if (db.products.length || db.badges.length) return migrate();
    const tags = [...new Set(seed.map((p) => p.tag).filter((t) => t && t !== "Coffee"))];
    db.badges = tags.map((name) => ({ id: slug(name), name, discount: 0, createdAt: new Date().toISOString() }));
    db.products = seed.map((p, i) => ({
      ...Object.fromEntries(FIELDS.map((f) => [f, p[f] ?? ""])),
      id: p.id,
      position: i,
      visible: true,
      badges: p.tag && p.tag !== "Coffee" ? [slug(p.tag)] : [],
      ground: p.ground !== false,
      photo: null,
      photoFit: "contain",
      createdAt: new Date().toISOString(),
    }));
    await save();
  }

  // Products saved before roast types: a type that isn't a roast (e.g. "Decaf") becomes a
  // label, and the roast defaults to espresso.
  async function migrate() {
    let changed = false;
    for (const p of db.products) {
      if ("ground" in p && roastOf(p.type)) continue;
      if (!roastOf(p.type)) {
        const name = String(p.type || "").trim();
        if (name) {
          let b = db.badges.find((x) => x.name.toLowerCase() === name.toLowerCase());
          if (!b) db.badges.push((b = { id: slug(name), name, discount: 0, createdAt: new Date().toISOString() }));
          p.badges = [...new Set([...(p.badges || []), b.id])];
        }
        p.type = /filter/i.test(p.name) ? "Filter" : "Espresso";
      }
      p.type = roastOf(p.type);
      if (!("ground" in p)) p.ground = true;
      changed = true;
    }
    if (changed) await save();
  }

  const sorted = () => [...db.products].sort((a, b) => a.position - b.position);
  const badge = (id) => db.badges.find((b) => b.id === id);
  // Everything a label can go on: coffees and teas (their own badges), and the accessories
  // (from js/data.js, so their labels are kept beside them in accessoryBadges).
  const accBadges = (id) => db.accessoryBadges.find((x) => x.id === id)?.badges || [];
  const wearers = () => [
    ...db.products.map((p) => ({ id: p.id, get: () => p.badges || [], set: (b) => (p.badges = b) })),
    ...db.teas.map((t) => ({ id: t.id, get: () => t.badges || [], set: (b) => (t.badges = b) })),
    ...db.foods.map((f) => ({ id: f.id, get: () => f.badges || [], set: (b) => (f.badges = b) })),
    ...accessories().map((a) => ({
      id: a.id,
      get: () => accBadges(a.id),
      set: (b) => {
        const row = db.accessoryBadges.find((x) => x.id === a.id);
        if (row) row.badges = b;
        else db.accessoryBadges.push({ id: a.id, badges: b });
      },
    })),
  ];
  // A tea's or accessory's labels and sale price, as the shop sees them (as for a coffee).
  const withLabels = (x, ids) => {
    const labels = ids.map(badge).filter(Boolean);
    if (!labels.length) return x;
    const off = Math.max(0, ...labels.map((b) => b.discount || 0));
    return { ...x, labels: labels.map((b) => ({ name: b.name, discount: b.discount || 0 })), ...(off && x.price ? { price: cents(x.price * (1 - off / 100)), regular: x.price, discount: off } : {}) };
  };

  // The best discount among a product's labels.
  const discountOf = (p) => Math.max(0, ...p.badges.map((id) => badge(id)?.discount || 0));

  // What the shop, the pricer and the FAQ assistant see: visible products, sale prices applied.
  // `regular` / `regular1kg` keep the full prices (wholesale prices start from those).
  function shopProducts() {
    return sorted()
      .filter((p) => p.visible)
      .map((p) => {
        const off = discountOf(p);
        const labels = p.badges.map(badge).filter(Boolean);
        const out: any = {
          id: p.id,
          tag: labels.map((b) => b.name).join(" · ") || "Coffee",
          labels: labels.map((b) => ({ name: b.name, discount: b.discount || 0 })),
          type: p.type,
          ground: p.ground !== false,
          name: p.name,
          short: p.short || p.name,
          price: off ? cents(p.price * (1 - off / 100)) : p.price,
          price1kg: off ? cents(p.price1kg * (1 - off / 100)) : p.price1kg,
          regular: p.price,
          regular1kg: p.price1kg,
          discount: off,
          color: p.color,
          notes: p.notes,
          region: p.region,
          process: p.process,
          variety: p.variety,
          altitude: p.altitude,
          about: p.about,
        };
        if (p.soldOut) out.soldOut = true;
        if (p.photo) {
          out.image = `/media/${p.photo}`;
          out.imageFit = p.photoFit;
        }
        return out;
      });
  }

  function cleanProduct(input, before: any = {}) {
    const p = { ...before };
    for (const f of ["name", "short", "region", "process", "variety", "altitude"]) if (f in input) p[f] = text(input[f], f === "name" ? 120 : 80);
    if ("notes" in input) p.notes = text(input.notes, 160);
    if ("about" in input) p.about = longText(input.about, 1200);
    if ("type" in input) {
      p.type = roastOf(input.type);
      if (!p.type) throw new CatalogError(`Choose the roast: ${roastTypes.join(" or ")}.`);
    }
    if ("ground" in input) p.ground = Boolean(input.ground);
    if ("color" in input) p.color = COLOR_RE.test(String(input.color)) ? String(input.color).toLowerCase() : before.color || "#2b2b2b";
    for (const f of ["price", "price1kg"]) {
      if (!(f in input)) continue;
      const n = Number(String(input[f]).replace(/[^0-9.]/g, ""));
      if (!(n > 0) || n > 10_000) throw new CatalogError(`Please enter a ${f === "price" ? "250g" : "1kg"} price.`);
      p[f] = cents(n);
    }
    if ("visible" in input) p.visible = Boolean(input.visible);
    if ("soldOut" in input) p.soldOut = Boolean(input.soldOut);
    if ("photoFit" in input) p.photoFit = input.photoFit === "cover" ? "cover" : "contain";
    // Who supplies it and what each size costs us (for Square's item library); both optional.
    if ("supplierId" in input) p.supplierId = text(input.supplierId, 64) || null;
    for (const [f, label] of [["cost250", "250g"], ["cost1kg", "1kg"]]) {
      if (!(f in input)) continue;
      const raw = String(input[f] ?? "").replace(/[^0-9.]/g, "");
      const n = Number(raw);
      if (raw && (!(n >= 0) || n > 10_000)) throw new CatalogError(`Please enter the ${label} cost in dollars.`);
      p[f] = raw ? cents(n) : null;
    }
    if ("badges" in input) {
      const ids = (Array.isArray(input.badges) ? input.badges : []).map(String);
      p.badges = [...new Set(ids)].filter((id) => badge(id)).slice(-1); // one label at a time
    }
    if (!p.name) throw new CatalogError("Please give the product a name.");
    if (!(p.price > 0) || !(p.price1kg > 0)) throw new CatalogError("Please enter the 250g and 1kg prices.");
    p.short ||= p.name.split(",")[0];
    if (!roastOf(p.type)) throw new CatalogError(`Choose the roast: ${roastTypes.join(" or ")}.`);
    p.color ||= "#2b2b2b";
    return p;
  }

  async function createProduct(input) {
    // The product page's address: short name, or the name up to its first comma.
    const base = slug(input.short || String(input.name || "").split(",")[0]);
    if (!base) throw new CatalogError("Please give the product a name.");
    let id = base;
    // Its address is /products/<id>, shared with the teas and accessories.
    for (let n = 2; db.products.some((p) => p.id === id) || db.teas.some((t) => t.id === id) || takenIds().includes(id); n++) id = `${base}-${n}`;
    const p = cleanProduct(input, {
      id,
      position: Math.max(-1, ...db.products.map((x) => x.position)) + 1,
      visible: true,
      ground: true,
      badges: [],
      photo: null,
      photoFit: "contain",
      notes: "",
      region: "",
      process: "",
      variety: "",
      altitude: "",
      about: "",
      createdAt: new Date().toISOString(),
    });
    db.products.push(p);
    await save();
    return p;
  }

  const product = (id) => db.products.find((p) => p.id === id);

  async function updateProduct(id, input) {
    const before = product(id);
    if (!before) throw new CatalogError("Product not found.", 404);
    const next = cleanProduct(input, before);
    Object.assign(before, next, { updatedAt: new Date().toISOString() });
    await save();
    return before;
  }

  async function deleteProduct(id) {
    const p = product(id);
    if (!p) throw new CatalogError("Product not found.", 404);
    db.products = db.products.filter((x) => x !== p);
    if (p.photo) db.photos = db.photos.filter((f) => f.id !== p.photo);
    await save();
    return p;
  }

  async function markProduct(id, fields) {
    const p = product(id);
    if (!p) return;
    Object.assign(p, fields);
    await save();
  }

  // Moves a product one place up or down the shop's order.
  async function moveProduct(id, dir) {
    const list = sorted();
    const i = list.findIndex((p) => p.id === id);
    const j = i + (dir === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((p, n) => (p.position = n));
    await save();
  }

  // Photos arrive as a data: URL (resized in the browser) and are served at /media/<id>.
  function parsePhoto(dataUrl, name) {
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ""));
    if (!m) throw new CatalogError("Please choose a JPEG, PNG or WebP photo.");
    const bytes = Buffer.byteLength(m[2], "base64");
    if (bytes > PHOTO_MAX_BYTES) throw new CatalogError("That photo is too large. Please use one under 2.5 MB.");
    return { id: `${name}-${randomBytes(4).toString("hex")}.${PHOTO_TYPES[m[1]]}`, type: m[1], data: m[2], bytes, createdAt: new Date().toISOString() };
  }

  async function setPhoto(id, dataUrl) {
    const p = product(id);
    if (!p) throw new CatalogError("Product not found.", 404);
    const photo = parsePhoto(dataUrl, p.id);
    const old = p.photo;
    db.photos = db.photos.filter((f) => f.id !== old);
    db.photos.push(photo);
    p.photo = photo.id;
    await save();
    return p;
  }

  async function removePhoto(id) {
    const p = product(id);
    if (!p) throw new CatalogError("Product not found.", 404);
    db.photos = db.photos.filter((f) => f.id !== p.photo);
    p.photo = null;
    await save();
    return p;
  }

  const photo = (id) => db.photos.find((f) => f.id === id);

  async function setTeaPhoto(id, dataUrl) {
    const t = tea(id);
    if (!t) throw new CatalogError("Tea not found.", 404);
    const p = parsePhoto(dataUrl, t.id);
    db.photos = db.photos.filter((f) => f.id !== t.photo);
    db.photos.push(p);
    t.photo = p.id;
    await save();
    return t;
  }

  async function removeTeaPhoto(id) {
    const t = tea(id);
    if (!t) throw new CatalogError("Tea not found.", 404);
    db.photos = db.photos.filter((f) => f.id !== t.photo);
    t.photo = null;
    await save();
    return t;
  }

  /* ── Labels ── */

  function cleanBadge(input, before: any = {}) {
    const b = { ...before };
    if ("name" in input) b.name = text(input.name, 40);
    if ("discount" in input) {
      const d = Number(String(input.discount ?? "").replace(/[^0-9.]/g, "") || 0);
      if (!(d >= 0 && d <= 90)) throw new CatalogError("A label's discount must be between 0 and 90%.");
      b.discount = Math.round(d * 10) / 10;
    }
    if (!b.name) throw new CatalogError("Please give the label a name.");
    if (reserved.has(b.name.toLowerCase())) throw new CatalogError(`"${b.name}" is already shown from each coffee's roast type. Set the roast on the product instead.`);
    if (db.badges.some((x) => x.id !== b.id && x.name.toLowerCase() === b.name.toLowerCase())) throw new CatalogError("There's already a label with that name.");
    return b;
  }

  async function createBadge(input) {
    const b = cleanBadge(input, { discount: 0, createdAt: new Date().toISOString() });
    let id = slug(b.name) || "label";
    for (let n = 2; db.badges.some((x) => x.id === id); n++) id = `${slug(b.name)}-${n}`;
    b.id = id;
    db.badges.push(b);
    if (Array.isArray(input.products)) for (const w of wearers()) if (input.products.includes(w.id)) w.set([id]);
    await save();
    return b;
  }

  async function updateBadge(id, input) {
    const b = badge(id);
    if (!b) throw new CatalogError("Label not found.", 404);
    Object.assign(b, cleanBadge(input, b));
    // The products wearing it, when the form sends the list.
    if (Array.isArray(input.products)) {
      for (const w of wearers()) {
        const has = w.get().includes(id);
        const want = input.products.includes(w.id);
        if (want && !has) w.set([id]); // one label at a time: this one replaces any other
        if (!want && has) w.set(w.get().filter((x) => x !== id));
      }
    }
    await save();
    return b;
  }

  async function deleteBadge(id) {
    if (!badge(id)) throw new CatalogError("Label not found.", 404);
    db.badges = db.badges.filter((b) => b.id !== id);
    for (const w of wearers()) if (w.get().includes(id)) w.set(w.get().filter((x) => x !== id));
    await save();
  }

  /* ── Menu ── */

  const sections = () => [...db.menuSections].sort((a, b) => a.position - b.position);
  const itemsIn = (sectionId) => db.menuItems.filter((x) => x.sectionId === sectionId).sort((a, b) => a.position - b.position);
  const menuItem = (id) => db.menuItems.find((x) => x.id === id);

  // The menu as the site's CAFE_MENU: visible items, in order, empty sections left out.
  const shopMenu = () =>
    sections()
      .map((sec) => ({
        title: sec.title,
        items: itemsIn(sec.id)
          .filter((x) => x.visible)
          .map((x) => ({
            id: x.id,
            name: x.name,
            price: x.price,
            note: x.note || undefined,
            tags: x.tags.length ? x.tags : undefined,
            style: x.kind,
            shape: x.kind === "food" ? x.shape || "cookie" : undefined,
            color: x.kind === "iced" ? x.color || undefined : undefined,
            topping: x.topping || undefined,
            image: imageOf(x) || undefined,
            soldOut: x.soldOut || undefined,
            lowStock: (!x.soldOut && x.lowStock) || undefined,
            madeOnArrival: x.madeOnArrival || undefined,
            options: optionsFor(x).length ? optionsFor(x) : undefined,
          })),
      }))
      .filter((sec) => sec.items.length);

  // An item's option groups, in the order the back office lists them.
  const optionSets = () => [...(db.optionSets || [])].sort((a, b) => a.position - b.position);
  const optionsFor = (x) =>
    optionSets()
      .filter((o) => (x.options || []).includes(o.id) && o.choices.length)
      .map((o) => ({ id: o.id, name: o.name, multi: Boolean(o.multi), choices: o.choices.map((c) => ({ id: c.id, name: c.name, price: c.price })) }));

  function cleanOptionSet(input, before: any = {}) {
    const o = { ...before };
    if ("name" in input) o.name = text(input.name, 40);
    if ("multi" in input) o.multi = Boolean(input.multi);
    if ("choices" in input) {
      const seen = new Set();
      o.choices = (Array.isArray(input.choices) ? input.choices : [])
        .map((c) => {
          const name = text(c?.name, 40);
          const n = Number(String(c?.price ?? "0").replace(/[^0-9.]/g, "")) || 0;
          let id = slug(c?.id || name) || "choice";
          while (seen.has(id)) id += "-2";
          seen.add(id);
          return name ? { id, name, price: cents(Math.min(n, 100)) } : null;
        })
        .filter(Boolean)
        .slice(0, 20);
    }
    if (!o.name) throw new CatalogError("Please name the option group, e.g. Milk.");
    if (!o.choices?.length) throw new CatalogError("Add at least one choice.");
    return o;
  }

  async function saveOptionSet(id, input) {
    db.optionSets ||= [];
    if (id) {
      const i = db.optionSets.findIndex((o) => o.id === id);
      if (i < 0) throw new CatalogError("Option group not found.", 404);
      db.optionSets[i] = cleanOptionSet(input, db.optionSets[i]);
      await save();
      return db.optionSets[i];
    }
    const base = slug(input.name || "") || "options";
    let newId = base;
    for (let n = 2; db.optionSets.some((o) => o.id === newId); n++) newId = `${base}-${n}`;
    const o = cleanOptionSet(input, { id: newId, multi: false, choices: [], position: Math.max(-1, ...db.optionSets.map((x) => x.position)) + 1, createdAt: new Date().toISOString() });
    db.optionSets.push(o);
    await save();
    return o;
  }

  async function deleteOptionSet(id) {
    db.optionSets = (db.optionSets || []).filter((o) => o.id !== id);
    for (const x of db.menuItems) if (x.options?.includes(id)) x.options = x.options.filter((v) => v !== id);
    await save();
  }

  function cleanMenuItem(input, before: any = {}) {
    const x = { ...before };
    if ("name" in input) x.name = text(input.name, 80);
    if ("note" in input) x.note = text(input.note, 160);
    if ("sectionId" in input) {
      if (!db.menuSections.some((s) => s.id === input.sectionId)) throw new CatalogError("Choose a section.");
      x.sectionId = input.sectionId;
    }
    if ("price" in input) {
      const n = Number(String(input.price).replace(/[^0-9.]/g, ""));
      if (!(n > 0) || n > 1000) throw new CatalogError("Please enter a price.");
      x.price = cents(n);
    }
    if ("tags" in input) x.tags = [...new Set((Array.isArray(input.tags) ? input.tags : []).filter((t) => DIET_TAGS.includes(t)))];
    if ("kind" in input) x.kind = MENU_KINDS.includes(input.kind) ? input.kind : "hot";
    if ("shape" in input) x.shape = FOOD_SHAPES.includes(input.shape) ? input.shape : "";
    if ("color" in input) x.color = COLOR_RE.test(String(input.color)) ? String(input.color).toLowerCase() : "";
    for (const f of ["soldOut", "visible", "topping", "lowStock", "madeOnArrival"]) if (f in input) x[f] = Boolean(input[f]);
    if ("options" in input) {
      const known = new Set((db.optionSets || []).map((o) => o.id));
      x.options = [...new Set((Array.isArray(input.options) ? input.options : []).map(String).filter((v) => known.has(v)))];
    }
    if (!x.name) throw new CatalogError("Please give the item a name.");
    if (!(x.price > 0)) throw new CatalogError("Please enter a price.");
    if (!x.sectionId) throw new CatalogError("Choose a section.");
    return x;
  }

  async function createMenuItem(input) {
    const base = slug(input.name || "") || "item";
    let id = base;
    for (let n = 2; db.menuItems.some((x) => x.id === id); n++) id = `${base}-${n}`;
    const x = cleanMenuItem(input, { id, tags: [], kind: "hot", shape: "", color: "", topping: false, photo: null, soldOut: false, visible: true, note: "", createdAt: new Date().toISOString() });
    x.position = Math.max(-1, ...itemsIn(x.sectionId).map((i) => i.position)) + 1;
    db.menuItems.push(x);
    await save();
    return x;
  }

  async function updateMenuItem(id, input) {
    const x = menuItem(id);
    if (!x) throw new CatalogError("Menu item not found.", 404);
    const movedSection = input.sectionId && input.sectionId !== x.sectionId;
    Object.assign(x, cleanMenuItem(input, x), { updatedAt: new Date().toISOString() });
    if (movedSection) x.position = Math.max(-1, ...itemsIn(x.sectionId).filter((i) => i !== x).map((i) => i.position)) + 1;
    await save();
    return x;
  }

  async function deleteMenuItem(id) {
    const x = menuItem(id);
    if (!x) throw new CatalogError("Menu item not found.", 404);
    db.menuItems = db.menuItems.filter((i) => i !== x);
    if (x.photo) db.photos = db.photos.filter((f) => f.id !== x.photo);
    await save();
    return x;
  }

  async function moveMenuItem(id, dir) {
    const x = menuItem(id);
    if (!x) return;
    const list = itemsIn(x.sectionId);
    const i = list.indexOf(x);
    const j = i + (dir === "up" ? -1 : 1);
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((it, n) => (it.position = n));
    await save();
  }

  async function setMenuPhoto(id, dataUrl) {
    const x = menuItem(id);
    if (!x) throw new CatalogError("Menu item not found.", 404);
    const photo = parsePhoto(dataUrl, x.id);
    db.photos = db.photos.filter((f) => f.id !== x.photo);
    db.photos.push(photo);
    x.photo = photo.id;
    await save();
    return x;
  }

  async function removeMenuPhoto(id) {
    const x = menuItem(id);
    if (!x) throw new CatalogError("Menu item not found.", 404);
    db.photos = db.photos.filter((f) => f.id !== x.photo);
    x.photo = null;
    await save();
    return x;
  }

  async function saveSection(id, input) {
    const title = text(input.title, 40);
    if (!title) throw new CatalogError("Please name the section.");
    if (id) {
      const sec = db.menuSections.find((x) => x.id === id);
      if (!sec) throw new CatalogError("Section not found.", 404);
      sec.title = title;
      await save();
      return sec;
    }
    let newId = slug(title) || "section";
    for (let n = 2; db.menuSections.some((x) => x.id === newId); n++) newId = `${slug(title)}-${n}`;
    const sec = { id: newId, title, position: Math.max(-1, ...db.menuSections.map((x) => x.position)) + 1, createdAt: new Date().toISOString() };
    db.menuSections.push(sec);
    await save();
    return sec;
  }

  async function deleteSection(id) {
    if (!db.menuSections.some((x) => x.id === id)) throw new CatalogError("Section not found.", 404);
    if (db.menuItems.some((x) => x.sectionId === id)) throw new CatalogError("Move or delete this section's items first.");
    db.menuSections = db.menuSections.filter((x) => x.id !== id);
    await save();
  }

  async function moveSection(id, dir) {
    const list = sections();
    const i = list.findIndex((x) => x.id === id);
    const j = i + (dir === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((x, n) => (x.position = n));
    await save();
  }

  // Square moved (sandbox to production): its ids here are for the other one, so every product,
  // menu item and section is pushed again as new.
  async function forgetSquare() {
    const fields = ["squareItemId", "squareVariationId", "squareCategoryId", "squarePhoto", "squareSyncedAt", "squareError", "squareVendorInfo"];
    for (const x of [...db.products, ...db.menuItems, ...db.menuSections]) for (const f of fields) delete x[f];
    await save();
  }

  // Square ids and sync state, written back after pushing to Square's catalog.
  async function markSynced(kind, id, fields) {
    const x = kind === "section" ? db.menuSections.find((s) => s.id === id) : menuItem(id);
    if (!x) return;
    Object.assign(x, fields);
    await save();
  }

  const menuView = () => ({
    sections: sections().map((sec) => ({ ...sec, items: itemsIn(sec.id).map((x) => ({ ...x, options: x.options || [], image: imageOf(x) })) })),
    optionSets: optionSets(),
    kinds: MENU_KINDS,
    shapes: FOOD_SHAPES,
    tags: DIET_TAGS,
  });

  /* ── Teas ── */

  // The teas in js/data.js are copied in once (the server records that it did, so deleting every
  // tea in the back office doesn't bring them back).
  // A tea's photo: one uploaded in the back office, else the plain cup (js/data.js TEA_CUP_PHOTO).
  let teaDefaultImage = null;
  const teaImage = (t) => (t.photo ? `/media/${t.photo}` : teaDefaultImage);

  // Run on every start.
  const setTeaImages = (src) => (teaDefaultImage = src || null);

  async function seedTeas(teas) {
    if (db.teas.length) return;
    const at = new Date().toISOString();
    db.teas = teas.map((t, i) => ({ ...cleanTea({ ...t, description: [].concat(t.description || []).join("\n\n"), ingredients: (t.ingredients || []).map(([k, v]) => `${k}: ${v}`).join("\n") }), id: t.id, position: i, createdAt: at }));
    await save();
  }

  const sortedTeas = () => [...db.teas].sort((a, b) => a.position - b.position);
  const tea = (id) => db.teas.find((t) => t.id === id);

  // From the back office's form: paragraphs one per blank line, ingredients one per line as
  // "Name: what it brings", no price for "Coming Soon".
  function cleanTea(input, before: any = {}) {
    const t = { visible: true, soldOut: false, ...before };
    for (const f of ["name", "short", "origin", "blend", "caffeine", "pack"]) if (f in input) t[f] = text(input[f], f === "name" ? 120 : 80);
    if ("notes" in input) t.notes = text(input.notes, 160);
    if ("about" in input) t.about = longText(input.about, 600);
    if ("type" in input) {
      t.type = teaTypes.find((k) => k.toLowerCase() === String(input.type || "").trim().toLowerCase());
      if (!t.type) throw new CatalogError(`Choose the kind of tea: ${teaTypes.join(", ")}.`);
    }
    if ("cultivar" in input) {
      const id = String(input.cultivar || "").trim();
      if (id && !cultivars.some((c) => c.id === id)) throw new CatalogError("Choose a cultivar from the list, or none.");
      t.cultivar = id;
    }
    if ("price" in input) {
      const raw = String(input.price ?? "").trim();
      if (!raw) t.price = null;
      else {
        const n = Number(raw.replace(/[^0-9.]/g, ""));
        if (!(n > 0) || n > 10_000) throw new CatalogError("Please enter a price, or leave it empty for Coming Soon.");
        t.price = cents(n);
      }
    }
    if ("weightOz" in input) {
      const n = Number(String(input.weightOz ?? "").replace(/[^0-9.]/g, ""));
      if (!(n > 0) || n > 400) throw new CatalogError("Please enter the packed weight in ounces (for postage).");
      t.weightOz = Math.round(n * 10) / 10;
    }
    if ("color" in input) t.color = COLOR_RE.test(String(input.color)) ? String(input.color).toLowerCase() : before.color || "#d8d2c4";
    if ("description" in input) t.description = String(input.description || "").replace(/\r\n/g, "\n").split(/\n\s*\n/).map((x) => text(x, 1200)).filter(Boolean).slice(0, 6);
    if ("ingredients" in input) {
      t.ingredients = String(input.ingredients || "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 12)
        .map((l) => {
          const m = /^(.+?)\s*(?::|—|–|-)\s+(.+)$/.exec(l);
          return m ? [text(m[1], 60), text(m[2], 120)] : [text(l, 60), ""];
        });
    }
    if ("visible" in input) t.visible = Boolean(input.visible);
    if ("soldOut" in input) t.soldOut = Boolean(input.soldOut);
    if (!t.name) throw new CatalogError("Please give the tea a name.");
    t.short ||= t.name.split(",")[0];
    if (!t.type) throw new CatalogError(`Choose the kind of tea: ${teaTypes.join(", ")}.`);
    t.color ||= "#d8d2c4";
    t.pack ||= "8 single-serve cups";
    t.weightOz ||= 6;
    if (!("price" in t)) t.price = null;
    return t;
  }

  // What the shop sees (as js/data.js ACCESSORIES): visible teas, drawn as the cup.
  const shopTeas = () =>
    sortedTeas()
      .filter((t) => t.visible)
      .map((t) => ({
        id: t.id,
        name: t.name,
        short: t.short,
        origin: t.origin || "",
        category: "Tea",
        type: t.type,
        ...(t.cultivar ? { cultivar: t.cultivar } : {}),
        blend: t.blend || `${t.type} tea`,
        caffeine: t.caffeine || "",
        notes: t.notes || "",
        pack: t.pack,
        price: shopifyPrice(shopifyLink(t)) ?? t.price,
        art: "tin",
        ...(teaImage(t) ? { image: teaImage(t) } : {}),
        color: t.color,
        weightOz: t.weightOz,
        description: t.description || [],
        ingredients: t.ingredients || [],
        about: t.about || "",
        ...(shopifyLink(t) ? { shopify: shopifyLink(t) } : {}),
        ...(t.soldOut ? { soldOut: true } : {}),
      }))
      .map((x) => withLabels(x, tea(x.id)?.badges || []));
  // The accessories from js/data.js with their labels (and sale prices) from the back office.
  const labelAccessories = (list) => list.map((a) => withLabels(a, accBadges(a.id)));

  async function createTea(input) {
    const base = slug(input.short || String(input.name || "").split(",")[0]);
    if (!base) throw new CatalogError("Please give the tea a name.");
    let id = base;
    // Its address is /products/<id>, shared with the coffees.
    for (let n = 2; db.teas.some((t) => t.id === id) || db.products.some((p) => p.id === id) || takenIds().includes(id); n++) id = `${base}-${n}`;
    const t = cleanTea(input, { id, position: Math.max(-1, ...db.teas.map((x) => x.position)) + 1, createdAt: new Date().toISOString() });
    db.teas.push(t);
    await save();
    return t;
  }

  async function updateTea(id, input) {
    const before = tea(id);
    if (!before) throw new CatalogError("Tea not found.", 404);
    Object.assign(before, cleanTea(input, before), { updatedAt: new Date().toISOString() });
    await save();
    return before;
  }

  async function deleteTea(id) {
    const t = tea(id);
    if (!t) throw new CatalogError("Tea not found.", 404);
    db.teas = db.teas.filter((x) => x !== t);
    await save();
    return t;
  }

  async function moveTea(id, dir) {
    const list = sortedTeas();
    const i = list.findIndex((t) => t.id === id);
    const j = i + (dir === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((t, n) => (t.position = n));
    await save();
  }

  /* ── Food products ── */

  // The products in js/data.js are copied in once; after that the back office is the source of truth.
  const foodImage = (f) => (f.photo ? `/media/${f.photo}` : f.image || null);
  const sortedFoods = () => [...db.foods].sort((a, b) => a.position - b.position);
  const food = (id) => db.foods.find((f) => f.id === id);

  function cleanFood(input, before: any = {}) {
    const f = { visible: true, soldOut: false, ...before };
    if ("name" in input) f.name = text(input.name, 120);
    if ("short" in input) f.short = text(input.short, 80);
    if ("category" in input) f.category = text(input.category, 40);
    if ("pack" in input) f.pack = text(input.pack, 60);
    if ("about" in input) f.about = longText(input.about, 800);
    if ("shopify" in input) f.shopify = String(input.shopify ?? "").replace(/\D/g, "").slice(0, 20);
    if ("price" in input) {
      const raw = String(input.price ?? "").trim();
      if (!raw) f.price = null;
      else {
        const n = Number(raw.replace(/[^0-9.]/g, ""));
        if (!(n > 0) || n > 10_000) throw new CatalogError("Please enter a price, or leave it empty for Coming Soon.");
        f.price = cents(n);
      }
    }
    if ("weightOz" in input) {
      const n = Number(String(input.weightOz ?? "").replace(/[^0-9.]/g, ""));
      if (!(n > 0) || n > 400) throw new CatalogError("Please enter the packed weight in ounces (for postage).");
      f.weightOz = Math.round(n * 10) / 10;
    }
    if ("visible" in input) f.visible = Boolean(input.visible);
    if ("soldOut" in input) f.soldOut = Boolean(input.soldOut);
    if (!f.name) throw new CatalogError("Please give the product a name.");
    if (!f.category) throw new CatalogError("Please choose a category.");
    f.short ||= f.name;
    f.weightOz ||= 14;
    if (!("price" in f)) f.price = null;
    return f;
  }

  async function seedFoods(items) {
    if (db.foods.length) return;
    const at = new Date().toISOString();
    db.foods = items.map((x, i) => ({ id: x.id, name: x.name, short: x.short || x.name, category: x.category || "Other", pack: x.pack || "", price: x.price ?? null, weightOz: x.weightOz || 14, about: x.about || "", shopify: String(x.shopify || ""), image: x.image || null, photo: null, badges: [], visible: true, soldOut: false, position: i, createdAt: at }));
    await save();
  }

  // What the shop sees (as js/data.js ACCESSORIES).
  const shopFoods = () =>
    sortedFoods()
      .filter((f) => f.visible)
      .map((f) => ({
        id: f.id,
        name: f.name,
        short: f.short,
        category: f.category,
        ...(f.pack ? { pack: f.pack } : {}),
        price: shopifyPrice(shopifyLink(f)) ?? f.price,
        color: "#f4f2ee",
        weightOz: f.weightOz,
        ...(foodImage(f) ? { image: foodImage(f) } : {}),
        about: f.about || "",
        ...(shopifyLink(f) ? { shopify: shopifyLink(f) } : {}),
        ...(f.soldOut ? { soldOut: true } : {}),
      }))
      .map((x) => withLabels(x, food(x.id)?.badges || []));

  async function createFood(input) {
    const base = slug(input.short || input.name);
    if (!base) throw new CatalogError("Please give the product a name.");
    let id = base;
    for (let n = 2; db.foods.some((f) => f.id === id) || db.products.some((p) => p.id === id) || db.teas.some((t) => t.id === id) || takenIds().includes(id); n++) id = `${base}-${n}`;
    const f = cleanFood(input, { id, badges: [], photo: null, image: null, position: Math.max(-1, ...db.foods.map((x) => x.position)) + 1, createdAt: new Date().toISOString() });
    db.foods.push(f);
    await save();
    return f;
  }

  async function updateFood(id, input) {
    const before = food(id);
    if (!before) throw new CatalogError("Product not found.", 404);
    Object.assign(before, cleanFood(input, before), { updatedAt: new Date().toISOString() });
    await save();
    return before;
  }

  async function deleteFood(id) {
    const f = food(id);
    if (!f) throw new CatalogError("Product not found.", 404);
    db.photos = db.photos.filter((p) => p.id !== f.photo);
    db.foods = db.foods.filter((x) => x !== f);
    await save();
    return f;
  }

  async function deleteFoods(ids) {
    const want = new Set((Array.isArray(ids) ? ids : []).map(String));
    const gone = db.foods.filter((f) => want.has(f.id));
    if (!gone.length) throw new CatalogError("Choose at least one product to delete.");
    db.photos = db.photos.filter((p) => !gone.some((f) => f.photo === p.id));
    db.foods = db.foods.filter((f) => !want.has(f.id));
    await save();
    return gone.map((f) => f.id);
  }
  async function moveFood(id, dir) {
    const list = sortedFoods();
    const i = list.findIndex((f) => f.id === id);
    const j = i + (dir === "up" ? -1 : 1);
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    list.forEach((f, n) => (f.position = n));
    await save();
  }

  async function setFoodPhoto(id, dataUrl) {
    const f = food(id);
    if (!f) throw new CatalogError("Product not found.", 404);
    const p = parsePhoto(dataUrl, f.id);
    db.photos = db.photos.filter((x) => x.id !== f.photo);
    db.photos.push(p);
    f.photo = p.id;
    await save();
    return f;
  }

  async function removeFoodPhoto(id) {
    const f = food(id);
    if (!f) throw new CatalogError("Product not found.", 404);
    db.photos = db.photos.filter((x) => x.id !== f.photo);
    f.photo = null;
    await save();
    return f;
  }
  // Everything the back office needs, photos as URLs.
  const adminView = () => ({
    products: sorted().map((p) => ({ ...p, image: p.photo ? `/media/${p.photo}` : null, discount: discountOf(p) })),
    labels: db.badges.map((b) => ({ ...b, count: wearers().filter((w) => w.get().includes(b.id)).length })),
    roastTypes,
    teas: sortedTeas().map((t) => ({ ...t, badges: t.badges || [], image: teaImage(t) })),
    accessories: accessories().map((a) => ({ id: a.id, name: a.name, category: a.category, price: a.price, image: a.image || null, badges: accBadges(a.id) })),
    foods: sortedFoods().map((f) => ({ ...f, badges: f.badges || [], image: foodImage(f) })),
    teaTypes,
    cultivars,
  });

  // Bulk Edit: a change checked without saving (throws what's wrong, as a save would).
  const checkProduct = (id, input) => {
    const before = product(id);
    if (!before) throw new CatalogError("Product not found.", 404);
    return cleanProduct(input, before);
  };
  const checkTea = (id, input) => {
    const before = tea(id);
    if (!before) throw new CatalogError("Tea not found.", 404);
    return cleanTea(input, before);
  };

  return {
    checkProduct,
    checkTea,
    seedIfEmpty,
    shopProducts,
    seedTeas,
    setTeaImages,
    setTeaPhoto,
    removeTeaPhoto,
    shopTeas,
    seedFoods,
    shopFoods,
    createFood,
    hasProduct: (id: string, name: string, shopifyId: string) => [...db.foods, ...db.teas].some((x) => x.id === id || x.shopify === shopifyId || String(x.name).toLowerCase() === name.toLowerCase()),
    setFoodImage: async (id: string, url: string) => {
      const f = food(id);
      if (f && !f.photo) {
        f.image = url;
        await save();
      }
    },
    updateFood,
    deleteFood,
    deleteFoods,
    moveFood,
    setFoodPhoto,
    removeFoodPhoto,
    labelAccessories,
    createTea,
    updateTea,
    deleteTea,
    moveTea,
    adminView,
    createProduct,
    updateProduct,
    deleteProduct,
    moveProduct,
    setPhoto,
    removePhoto,
    photo,
    createBadge,
    updateBadge,
    deleteBadge,
    markProduct,
    shopMenu,
    menuView,
    menuItem,
    section: (id) => db.menuSections.find((x) => x.id === id) || null,
    createMenuItem,
    updateMenuItem,
    deleteMenuItem,
    moveMenuItem,
    setMenuPhoto,
    removeMenuPhoto,
    saveSection,
    deleteSection,
    moveSection,
    markSynced,
    forgetSquare,
    saveOptionSet,
    deleteOptionSet,
    optionsFor: (id) => {
      const x = menuItem(id);
      return x ? optionsFor(x) : [];
    },
  };
}
