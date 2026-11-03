// Wholesale accounts (cafés that order on account) and purchase orders to suppliers.
// Stored with server/storage.js as storage.open("trade", TRADE_PARTS).

import { randomUUID } from "node:crypto";

export const TRADE_PARTS = {
  accounts: (a) => a.id,
  // A buyer's order waiting for an owner of the account to approve it.
  requests: (r) => r.id,
  // A café asks for a price on an order; the team prices each line; an owner accepts it.
  quotes: (q) => q.id,
  // Price lists shared by accounts: a discount, its own prices and volume prices, set once for
  // every café on it.
  priceLists: (l) => l.id,
  suppliers: (s) => s.id,
  purchaseOrders: (p) => p.number,
};

export class TradeError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const EMAIL_RE = /^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]{2,}$/;
const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const cents = (n) => Math.round(n * 100) / 100;
const parseEmails = (v) => [...new Set((Array.isArray(v) ? v : String(v).split(/[\s,;]+/)).map((e) => String(e).trim().toLowerCase()).filter(Boolean))].slice(0, 10);
export const PO_STATUSES = ["draft", "sent", "partial", "received", "cancelled"];

export function createTrade({ store, data }) {
  const db = store.data;
  const save = store.save;
  const { SITE, PRODUCTS, ACCESSORIES = [], US_STATES, LOCATIONS = [] } = data;
  // Where a café can collect: Roastery House, and the café bars once they're live (on the map).
  // By quote: a Limited Drop coffee (allocated, so priced per café) or one with no wholesale
  // price. It shows "By Quote" in the portal and is only ordered through an accepted quote.
  const byQuote = (p) => Boolean(p) && ((p.labels || []).some((l) => /^limited drop$/i.test(typeof l === "string" ? l : l?.name || "")) || (p.regular1kg ?? p.price1kg) == null);
  const pickPlaces = () => LOCATIONS.filter((l) => l.cafe === false || (SITE.cafesLive !== false && Array.isArray(l.coords)));
  const states = new Set(US_STATES.map(([c]) => c));
  const now = () => new Date().toISOString();

  /* ── Wholesale accounts ── */

  // The sizes a price can be set for: coffee in 5 lb bags or 250g retail bags; tea as its pack
  // ("tin") or 1 kg loose.
  const PRICE_SIZES = { coffee: ["5lb", "250g"], tea: ["tin", "1kg"] };
  const teaOf = (id) => ACCESSORIES.find((x) => x.id === id && x.category === "Tea");
  function cleanPrices(list) {
    const seen = new Set();
    const out = [];
    for (const x of Array.isArray(list) ? list : []) {
      const product = String(x?.product || "");
      const size = String(x?.size || "");
      const kind = PRODUCTS.some((p) => p.id === product) ? "coffee" : teaOf(product) ? "tea" : null;
      if (!kind || !PRICE_SIZES[kind].includes(size) || seen.has(`${product}:${size}`)) continue;
      const price = cents(Number(x.price));
      if (!(price > 0 && price < 10_000)) throw new TradeError("Check the account's own prices: each needs an amount.");
      seen.add(`${product}:${size}`);
      out.push({ product, size, price });
    }
    return out.slice(0, 80);
  }
  function cleanTiers(list) {
    const out = (Array.isArray(list) ? list : [])
      .map((t) => ({ bags: Math.round(Number(t?.bags)), off: Math.round(Number(t?.off) * 10) / 10 }))
      .filter((t) => t.bags || t.off);
    for (const t of out) if (!(t.bags >= 2 && t.bags <= 500 && t.off > 0 && t.off <= 30)) throw new TradeError("Each volume price needs a number of bags (2 or more) and a percent off (up to 30).");
    if (new Set(out.map((t) => t.bags)).size !== out.length) throw new TradeError("Two volume prices start at the same number of bags.");
    return out.sort((a, b) => a.bags - b.bags).slice(0, 5);
  }
  // What an account is charged: on a price list, the list's discount and volume prices, and the
  // list's prices for single items, under the account's own (an account's own price wins);
  // otherwise the account's.
  const listOf = (acct) => (acct?.priceList ? (db.priceLists || []).find((l) => l.id === acct.priceList) || null : null);
  function pricing(acct) {
    const list = listOf(acct);
    if (!list || acct.priced) return acct;
    const own = acct.prices || [];
    return {
      ...acct,
      priced: true,
      discount: list.discount,
      prices: [...own, ...list.prices.filter((x) => !own.some((y) => y.product === x.product && y.size === x.size))],
      tiers: list.tiers,
      priceListName: list.name,
    };
  }
  // The account's own price for a product in a size, if it has one (or its list has).
  const ownPrice = (acct, product, size) => (pricing(acct).prices || []).find((x) => x.product === product && x.size === size)?.price ?? null;
  // The volume price an order of `bags` 5 lb coffee bags gets: the biggest tier it reaches.
  const tierFor = (acct, bags) => [...(pricing(acct).tiers || [])].reverse().find((t) => bags >= t.bags) || null;

  /* ── Price lists ── */
  db.priceLists ||= [];
  function cleanList(input, was: any = {}) {
    const l = {
      name: text(input.name ?? was.name, 60),
      discount: Math.min(60, Math.max(0, Number(input.discount ?? was.discount ?? SITE.wholesale.discount * 100))),
      prices: cleanPrices(input.prices ?? was.prices ?? []),
      tiers: cleanTiers(input.tiers ?? was.tiers ?? []),
    };
    if (!l.name) throw new TradeError("Name the price list.");
    if (Number.isNaN(l.discount)) throw new TradeError("Check the discount.");
    if (db.priceLists.some((x) => x.id !== was.id && x.name.toLowerCase() === l.name.toLowerCase())) throw new TradeError("There's already a price list with that name.");
    return l;
  }
  async function createPriceList(input) {
    const l = { id: randomUUID(), ...cleanList(input), createdAt: new Date().toISOString() };
    db.priceLists.push(l);
    await store.save();
    return l;
  }
  async function updatePriceList(id, input) {
    const l = db.priceLists.find((x) => x.id === id);
    if (!l) throw new TradeError("That price list isn't here any more.", 404);
    Object.assign(l, cleanList(input, l), { updatedAt: new Date().toISOString() });
    await store.save();
    return l;
  }
  // Deleting a list: its accounts keep its discount and volume prices as their own.
  async function deletePriceList(id) {
    const l = db.priceLists.find((x) => x.id === id);
    if (!l) throw new TradeError("That price list isn't here any more.", 404);
    for (const a of db.accounts.filter((x) => x.priceList === id)) Object.assign(a, { priceList: "", discount: l.discount, tiers: a.tiers?.length ? a.tiers : l.tiers });
    db.priceLists = db.priceLists.filter((x) => x.id !== id);
    await store.save();
  }

  // Other places it delivers to (a second café, a kitchen…), beside its main address: each with
  // a name and a full address. Up to 20.
  function cleanLocations(list) {
    if (!Array.isArray(list)) return [];
    return list.slice(0, 20).map((l) => {
      const loc = {
        id: /^loc-[a-f0-9]{8}$/.test(String(l?.id || "")) ? String(l.id) : `loc-${randomUUID().slice(0, 8)}`,
        name: text(l?.name, 60),
        street: text(l?.street, 160),
        city: text(l?.city, 80),
        state: text(l?.state, 2).toUpperCase(),
        postcode: text(l?.postcode, 20),
      };
      if (!loc.name) throw new TradeError("Give the location a name, like Downtown.");
      if (!(loc.street && loc.city && loc.state && loc.postcode)) throw new TradeError(`Add the full address for ${loc.name}.`);
      if (!states.has(loc.state)) throw new TradeError("Use a two-letter US state, e.g. CA.");
      return loc;
    });
  }
  // When they'll collect it: a day (from tomorrow, within 45 days) and a time ("10:00"), or null.
  function cleanPickup(p) {
    const day = String(p?.day || "");
    const time = String(p?.time || "");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}:\d{2}$/.test(time)) return null;
    const at = Date.parse(`${day}T12:00:00Z`);
    if (!(at > Date.now() - 864e5 && at < Date.now() + 46 * 864e5)) throw new TradeError("Pick a pickup day in the next few weeks.");
    const asked = String(p?.place || "");
    const place = asked ? pickPlaces().find((l) => l.id === asked) : pickPlaces().find((l) => l.cafe === false) || pickPlaces()[0];
    if (!place) throw new TradeError("That pickup point isn't taking pickups right now. Pick another.");
    const hours = place?.hours?.[new Date(at).getUTCDay()];
    if (!hours) throw new TradeError(`${place?.name || "We're"} closed that day. Pick another.`);
    if (time < hours[0] || time >= hours[1]) throw new TradeError(`Pick a time while ${place.name} is open.`);
    return { day, time, place: place.id, placeName: place.name };
  }
  // Where an order goes: one of its locations, or its main address.
  function addressFor(acct, location = "") {
    if (!location) return acct.address || {};
    const loc = (acct.locations || []).find((l) => l.id === location);
    if (!loc) throw new TradeError("That delivery location isn't on the account any more. Pick another.");
    return loc;
  }

  function cleanAccount(input, existing: any = {}) {
    const a = {
      business: text(input.business ?? existing.business, 120),
      contactName: text(input.contactName ?? existing.contactName, 80),
      email: text(input.email ?? existing.email, 254).toLowerCase(),
      phone: text(input.phone ?? existing.phone, 40),
      address: {
        // What the café calls it (shown as its delivery location), when it has a name.
        ...(text(input.address?.name ?? existing.address?.name, 60) && { name: text(input.address?.name ?? existing.address?.name, 60) }),
        street: text(input.address?.street ?? existing.address?.street, 160),
        city: text(input.address?.city ?? existing.address?.city, 80),
        state: text(input.address?.state ?? existing.address?.state, 2).toUpperCase(),
        postcode: text(input.address?.postcode ?? existing.address?.postcode, 20),
      },
      locations: cleanLocations(input.locations ?? existing.locations ?? []),
      // Percent off retail, 0–60; payment terms in days, 0–90.
      discount: Math.min(60, Math.max(0, Number(input.discount ?? existing.discount ?? SITE.wholesale.discount * 100))),
      terms: Math.min(90, Math.max(0, Math.round(Number(input.terms ?? existing.terms ?? SITE.wholesale.terms)))),
      notes: text(input.notes ?? existing.notes, 1000),
      // Delivery charge added to orders placed in the wholesale portal.
      deliveryFee: cents(Math.max(0, Number(input.deliveryFee ?? existing.deliveryFee ?? 0) || 0)),
      // Emails that can log in to the wholesale portal for this account.
      portalEmails: parseEmails(input.portalEmails ?? existing.portalEmails ?? []),
      // Its own price for a coffee or tea in a size, instead of the discount ([{ product, size, price }]).
      prices: cleanPrices(input.prices ?? existing.prices ?? []),
      // Volume pricing: with at least `bags` 5 lb coffee bags in one order, `off` percent off them.
      tiers: cleanTiers(input.tiers ?? existing.tiers ?? []),
      // A shared price list (its discount, prices and volume prices), or "" for the account's own.
      priceList: (() => {
        const id = String(input.priceList ?? existing.priceList ?? "");
        return (db.priceLists || []).some((l) => l.id === id) ? id : "";
      })(),
      // Logins that are buyers: their orders over approvalOver (0: every order) wait for an owner
      // (any other login) to approve them.
      buyers: parseEmails(input.buyers ?? existing.buyers ?? []).filter((e) => parseEmails(input.portalEmails ?? existing.portalEmails ?? []).includes(e)),
      approvalOver: cents(Math.max(0, Number(input.approvalOver ?? existing.approvalOver ?? 0) || 0)),
    };
    if (!a.business) throw new TradeError("Add the business name.");
    const badLogin = a.portalEmails.find((e) => !EMAIL_RE.test(e));
    if (badLogin) throw new TradeError(`“${badLogin}” isn't a valid login email.`);
    const taken = a.portalEmails.find((e) => db.accounts.some((x) => x.id !== existing.id && x.portalEmails?.includes(e)));
    if (taken) throw new TradeError(`${taken} already logs in to another wholesale account.`);
    if (a.buyers.length && a.buyers.length === a.portalEmails.length) throw new TradeError("Leave at least one login as an owner, to approve the buyers' orders.");
    if (!EMAIL_RE.test(a.email)) throw new TradeError("Add a valid billing email.");
    if (a.address.state && !states.has(a.address.state)) throw new TradeError("Use a two-letter US state, e.g. CA.");
    if (Number.isNaN(a.discount) || Number.isNaN(a.terms)) throw new TradeError("Check the discount and payment terms.");
    return a;
  }

  async function createAccount(input) {
    const account = { id: randomUUID(), ...cleanAccount(input), createdAt: now(), squareCustomerId: null, active: true };
    db.accounts.push(account);
    await save();
    return account;
  }

  async function updateAccount(id, input) {
    const account = db.accounts.find((a) => a.id === id);
    if (!account) throw new TradeError("Account not found.", 404);
    Object.assign(account, cleanAccount(input, account), "active" in input ? { active: Boolean(input.active) } : {}, { updatedAt: now() });
    await save();
    return account;
  }

  const account = (id) => db.accounts.find((a) => a.id === id) || null;

  // A credit on the account (a damaged or short delivery, or a goodwill amount): it comes off the
  // account's next orders until it's used up (server.ts works out what's left from the orders).
  // `items`: which of the order's lines it's for ([{ i, qty }]), so a line isn't credited twice.
  async function addCredit(id, { amount, reason = "", order = "", items = null }) {
    const a = account(id);
    if (!a) throw new TradeError("Account not found.", 404);
    const n = cents(Number(amount) || 0);
    if (!(n > 0 && n <= 50_000)) throw new TradeError("Choose what the credit is for.");
    const credit = { id: randomUUID(), amount: n, reason: text(reason, 200), order: text(order, 40), ...(items ? { items } : {}), createdAt: now() };
    a.credits = [...(a.credits || []), credit];
    await save();
    return credit;
  }

  // The active wholesale account a logged-in email belongs to (archived accounts can't log in).
  const accountForEmail = (email) => {
    email = String(email || "").toLowerCase();
    return db.accounts.find((a) => a.active !== false && !a.archivedAt && a.portalEmails?.includes(email)) || null;
  };

  /* Closing. An account or supplier with history is archived: hidden from pickers, portal logins
     stop working, and its orders and invoices stay for the books. One with no history can be
     deleted outright. `hasHistory` / `unpaid` come from the order store in server.js. */

  async function archiveAccount(id, archived, { unpaid = 0 } = {}) {
    const a = account(id);
    if (!a) throw new TradeError("Account not found.", 404);
    if (archived && unpaid) throw new TradeError(`This account has ${unpaid} unpaid invoice${unpaid === 1 ? "" : "s"}. Settle or cancel ${unpaid === 1 ? "it" : "them"} before archiving.`);
    if (archived) a.archivedAt = now();
    else delete a.archivedAt;
    a.updatedAt = now();
    await save();
    return a;
  }

  async function deleteAccount(id, { hasHistory }) {
    const a = account(id);
    if (!a) throw new TradeError("Account not found.", 404);
    if (hasHistory) throw new TradeError("This account has orders, so it can only be archived (its invoices stay on record).");
    db.accounts = db.accounts.filter((x) => x !== a);
    await save();
  }

  async function archiveSupplier(id, archived) {
    const sup = db.suppliers.find((x) => x.id === id);
    if (!sup) throw new TradeError("Supplier not found.", 404);
    const open = db.purchaseOrders.filter((p) => p.supplierId === id && ["sent", "partial"].includes(p.status)).length;
    if (archived && open) throw new TradeError(`${open} purchase order${open === 1 ? " is" : "s are"} still open with this supplier. Receive or cancel ${open === 1 ? "it" : "them"} first.`);
    if (archived) sup.archivedAt = now();
    else delete sup.archivedAt;
    sup.updatedAt = now();
    await save();
    return sup;
  }

  async function deleteSupplier(id) {
    const sup = db.suppliers.find((x) => x.id === id);
    if (!sup) throw new TradeError("Supplier not found.", 404);
    if (db.purchaseOrders.some((p) => p.supplierId === id)) throw new TradeError("This supplier has purchase orders, so it can only be archived.");
    db.suppliers = db.suppliers.filter((x) => x !== sup);
    await save();
  }

  // An account's own team, set by one of its owners in the portal: its logins, which of them are
  // buyers (the rest are owners), and the amount over which a buyer's order needs an owner.
  async function setTeam(id, { logins, approvalOver }, by) {
    const a = account(id);
    if (!a) throw new TradeError("Account not found.", 404);
    const list = (Array.isArray(logins) ? logins : []).map((l) => ({ email: String(l?.email || "").trim().toLowerCase(), role: l?.role === "buyer" ? "buyer" : "owner" })).filter((l) => l.email);
    if (list.length > 10) throw new TradeError("Up to 10 logins.");
    if (new Set(list.map((l) => l.email)).size !== list.length) throw new TradeError("Each email once, please.");
    const me = String(by || "").toLowerCase();
    if (!list.some((l) => l.email === me && l.role === "owner")) throw new TradeError("Keep yourself on the team as an owner. Another owner can change your login.");
    const next = cleanAccount({ portalEmails: list.map((l) => l.email), buyers: list.filter((l) => l.role === "buyer").map((l) => l.email), approvalOver }, a);
    Object.assign(a, { portalEmails: next.portalEmails, buyers: next.buyers, approvalOver: next.approvalOver, updatedAt: now() });
    await save();
    return a;
  }

  // What a wholesale customer may change themselves: their contact name and delivery address. Not
  // the phone: a code texted to it logs in as the account, so only the team changes it.
  async function updateOwnAccount(id, input) {
    const a = account(id);
    if (!a) throw new TradeError("Account not found.", 404);
    const next = cleanAccount({ contactName: input.contactName, phone: a.phone, address: input.address, locations: input.locations }, a);
    Object.assign(a, { contactName: next.contactName, address: next.address, locations: next.locations, updatedAt: now() });
    await save();
    return a;
  }

  async function markInvited(id) {
    const a = account(id);
    if (!a) return;
    a.invitedAt = now();
    await save();
  }

  async function setSquareCustomer(id, customerId) {
    const a = account(id);
    if (!a) return;
    a.squareCustomerId = customerId;
    await save();
  }

  // Square moved (sandbox to production): customers and saved cards are made again there.
  async function forgetSquare() {
    for (const a of db.accounts) {
      a.squareCustomerId = null;
      a.card = null;
    }
    for (const s of db.suppliers) delete s.squareVendorId;
    await save();
  }

  // Square's vendor id for a supplier, or why it didn't update.
  async function markSupplier(id, fields) {
    const s = db.suppliers.find((x) => x.id === id);
    if (!s) return;
    Object.assign(s, fields);
    await save();
  }

  // The card the account saved in its portal (Square's card on file): { id, brand, last4, exp }, or null.
  // Stripe, for bank payments: { customer, bank: { id, bank, last4 } | null, verify: { pi, … } | null }
  // (only the fields given change).
  async function setStripe(id, patch) {
    const a = account(id);
    if (!a) return;
    a.stripe = { ...(a.stripe || {}), ...patch };
    await save();
  }

  async function setCard(id, card) {
    const a = account(id);
    if (!a) return;
    a.card = card || null;
    await save();
  }

  // Prices a wholesale order: shop prices less the account's discount. Coffee comes in 5 lb bags
  // (from the 1kg price, per kilo) for the venue to brew, or 250g retail bags to resell; teas
  // come as their packs, to resell. Beyond localMiles of the roastery (`local` false) the order
  // needs the minimums: bulk 5 lb bags, and retail items (250g bags and teas) together.
  // `credits`: the account's credit still to use ([{ id, left, reason }]), taken off this order's
  // total (as its discount) as far as it goes.
  // `quoted`: a quote's agreed prices ([{ product, size, price }]), used instead of the list.
  // quoting: pricing a quote request (or the team's own order), so by-quote coffees are let through.
  function priceWholesale(acct, input, { local = true, credits = [], quoted = null, quoting = false }: { local?: boolean; credits?: any[]; quoted?: any[] | null; quoting?: boolean } = {}) {
    acct = pricing(acct);
    const quotedOr = (product, size, price) => quoted?.find((q) => q.product === product && q.size === size)?.price ?? price;
    const raw = Array.isArray(input.lines) ? input.lines.filter((l) => l && l.product) : [];
    if (!raw.length) throw new TradeError("Add at least one coffee or tea.");
    if (raw.length > 40) throw new TradeError("That's a lot of lines. Split it into two orders.");
    const W = SITE.wholesale;
    const factor = (1 - acct.discount / 100) * (W.priceFactor ?? 1);
    const lines = raw.map((l) => {
      const qty = Math.round(Number(l.qty));
      const tea = ACCESSORIES.find((x) => x.id === l.product && x.category === "Tea");
      if (tea) {
        if (tea.price == null || tea.soldOut) throw new TradeError(`${tea.short || tea.name} isn't available right now.`);
        if (!(qty >= 1 && qty <= 500)) throw new TradeError(`Check the quantity for ${tea.short || tea.name}.`);
        // Loose tea by the kilo, to brew: the pack's shop price × teaKg less teaKgOff, for every account.
        if (l.size === "1kg") {
          return { kind: "accessory", product: tea.id, category: "Tea", title: tea.name, variant: "1 kg loose", note: "", gift: false, qty, price: quotedOr(tea.id, "1kg", ownPrice(acct, tea.id, "1kg") ?? cents(tea.price * W.teaKg * (1 - W.teaKgOff))), weightOz: 35.3, size: "1kg", bulk: true };
        }
        return { kind: "accessory", product: tea.id, category: "Tea", title: tea.name, variant: tea.pack || "Pack", note: "", gift: false, qty, price: quotedOr(tea.id, "tin", ownPrice(acct, tea.id, "tin") ?? cents(tea.price * factor)), weightOz: tea.weightOz || 0, size: "tin", retail: true };
      }
      const p = PRODUCTS.find((x) => x.id === l.product);
      if (!p) throw new TradeError("One of the coffees isn't available.");
      const size = l.size === "250g" ? "250g" : l.size === "1kg" ? "1kg" : "5lb";
      const grind = "Whole Bean"; // wholesale coffee is whole beans only
      if (!(qty >= 1 && qty <= 500)) throw new TradeError(`Check the quantity for ${p.short || p.name}.`);
      if (byQuote(p) && !quoting && !quoted?.some((q) => q.product === p.id && q.size === size)) throw new TradeError(`${p.short || p.name} is by quote. Ask for a quote first.`);
      const kilo = p.regular1kg ?? p.price1kg ?? 0;
      const price = size === "250g" ? (p.regular ?? p.price) : size === "1kg" ? kilo : kilo * W.bulkKg;
      const label = size === "5lb" ? "5 lb" : size === "250g" ? "250g retail bag" : "1kg";
      return { kind: "coffee", title: p.name, variant: `${label} · ${grind}`, note: "", gift: false, qty, price: quotedOr(p.id, size, ownPrice(acct, p.id, size) ?? cents(price * factor)), product: p.id, size, grind, ...(size === "250g" ? { retail: true } : {}) };
    });
    // Volume pricing on the 5 lb coffee bags (not on a quote's prices, which are already agreed).
    const bulkBags = lines.filter((l) => l.size === "5lb").reduce((n, l) => n + l.qty, 0);
    const tier = quoted ? null : tierFor(acct, bulkBags);
    if (tier) for (const l of lines) if (l.size === "5lb") l.price = cents(l.price * (1 - tier.off / 100));
    if (!local) {
      const bulk = lines.filter((l) => l.size === "5lb" || l.bulk).reduce((n, l) => n + l.qty, 0);
      const retail = lines.filter((l) => l.retail).reduce((n, l) => n + l.qty, 0);
      if (bulk && bulk < W.minimums.bulk) throw new TradeError(`Beyond ${W.localMiles} miles of the roastery, bulk orders start at ${W.minimums.bulk} bags (5 lb coffee or 1 kg tea). You have ${bulk}.`);
      if (retail && retail < W.minimums.retail) throw new TradeError(`Beyond ${W.localMiles} miles of the roastery, retail orders start at ${W.minimums.retail} bags or teas. You have ${retail}.`);
    }
    for (const l of lines) {
      delete l.retail;
      delete l.bulk;
    }
    const collect = input.fulfilment === "Pickup";
    // Portal orders use the account's delivery fee; the back office can set its own.
    const shipping = collect ? 0 : cents(Math.max(0, Number(input.shipping ?? acct.deliveryFee ?? 0) || 0));
    const subtotal = cents(lines.reduce((n, l) => n + l.price * l.qty, 0));
    const addr = collect ? {} : addressFor(acct, input.location);
    if (!collect && !(addr.street && addr.city && addr.state && addr.postcode)) {
      throw new TradeError("This account has no full delivery address. Add one, or choose pickup.");
    }
    const due = new Date(Date.now() + acct.terms * 864e5).toISOString().slice(0, 10);
    let room = subtotal; // off the goods (as Square's invoice takes a discount), not the delivery
    const used = [];
    for (const c of credits) {
      const take = cents(Math.min(room, c.left));
      if (take <= 0) continue;
      used.push({ id: c.id, amount: take });
      room = cents(room - take);
    }
    const off = cents(used.reduce((n, c) => n + c.amount, 0));
    return {
      contact: { name: acct.contactName ? `${acct.contactName}, ${acct.business}` : acct.business, email: acct.email, phone: acct.phone },
      lines,
      fulfilment: collect ? "Pickup" : "Delivery",
      shipTo: collect ? null : { ...(addr.name && { name: `${acct.business}, ${addr.name}` }), address: addr.street, city: addr.city, state: addr.state, postcode: addr.postcode, country: "US" },
      cafe: null,
      notes: text(input.notes, 1000),
      subtotal,
      shipping,
      cafeFee: 0,
      total: cents(subtotal + shipping - off),
      ...(off > 0 ? { discount: { code: null, label: "Account credit", amount: off } } : {}),
      source: "wholesale",
      wholesale: { ...(collect && cleanPickup(input.pickup) && { pickupAt: cleanPickup(input.pickup) }), ...(!collect && input.location && { location: String(input.location) }), accountId: acct.id, business: acct.business, poRef: text(input.poRef, 60), terms: acct.terms, discount: acct.discount, dueDate: due, ...(used.length ? { credits: used } : {}), ...(tier ? { tier } : {}) },
    };
  }

  /* ── Approvals: a buyer's order over the account's limit waits for an owner ── */

  db.requests ||= [];
  const roleOf = (acct, email) => (acct.buyers || []).includes(String(email || "").toLowerCase()) ? "buyer" : "owner";
  const needsApproval = (acct, email, total) => roleOf(acct, email) === "buyer" && total > (acct.approvalOver || 0);
  async function addRequest(acct, input, by, total) {
    const r = {
      id: randomUUID(),
      accountId: acct.id,
      by: String(by).toLowerCase(),
      lines: (input.lines || []).map((l) => ({ product: String(l.product), size: String(l.size), qty: Math.round(Number(l.qty)) })),
      fulfilment: input.fulfilment === "Pickup" ? "Pickup" : "Delivery",
      ...(input.fulfilment !== "Pickup" && input.location && { location: addressFor(acct, input.location) && String(input.location) }),
      ...(input.fulfilment === "Pickup" && cleanPickup(input.pickup) && { pickup: cleanPickup(input.pickup) }),
      poRef: text(input.poRef, 60),
      notes: text(input.notes, 1000),
      total,
      status: "waiting",
      at: now(),
    };
    db.requests.push(r);
    await save();
    return r;
  }
  const request = (id) => db.requests.find((r) => r.id === id) || null;
  // An account's requests: the waiting ones, and what was decided in the last 30 days.
  const requestsFor = (accountId) => db.requests.filter((r) => r.accountId === accountId && (r.status === "waiting" || Date.parse(r.decidedAt || r.at) > Date.now() - 30 * 864e5)).sort((a, b) => b.at.localeCompare(a.at));
  async function decideRequest(id, { status, by, order = null }) {
    const r = request(id);
    if (!r) throw new TradeError("That order request is gone.", 404);
    if (r.status !== "waiting") throw new TradeError(`It was already ${r.status} by ${r.decidedBy}.`, 409);
    Object.assign(r, { status, decidedBy: String(by).toLowerCase(), decidedAt: now(), ...(order ? { order } : {}) });
    await save();
    return r;
  }

  /* ── Quotes: a café asks for a price on an order (a large one, a standing one, something
     custom); the team sets each line's price and how long it's good for; an owner accepts it
     and it's placed at those prices. ── */

  db.quotes ||= [];
  const quote = (id) => db.quotes.find((q) => q.id === id) || null;
  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: SITE.timezone || "America/Los_Angeles" });
  // Where a quote stands: requested, sent, accepted, declined, or expired (sent, and past its date).
  const quoteState = (q) => (q.status === "sent" && q.validUntil < today() ? "expired" : q.status);
  // `listed`: the order's lines priced from the account's list (priceWholesale), for reference.
  async function addQuote(acct, input, by, listed) {
    const max = db.quotes.reduce((n, q) => Math.max(n, Number(q.number.slice(2)) || 0), 1000);
    const q = {
      id: randomUUID(),
      number: `Q-${max + 1}`,
      accountId: acct.id,
      business: acct.business,
      by: String(by).toLowerCase(),
      lines: listed.map((l) => ({ product: l.product, size: l.size, qty: l.qty, title: l.title, variant: l.variant, listPrice: l.price, price: null })),
      fulfilment: input.fulfilment === "Pickup" ? "Pickup" : "Delivery",
      ...(input.fulfilment !== "Pickup" && input.location && { location: addressFor(acct, String(input.location)) && String(input.location) }),
      ...(input.fulfilment === "Pickup" && cleanPickup(input.pickup) && { pickup: cleanPickup(input.pickup) }),
      note: text(input.notes, 1000),
      status: "requested",
      at: now(),
    };
    db.quotes.push(q);
    await save();
    return q;
  }
  // The team's prices (one per line, in order), a line to the café, and how many days it's good for.
  async function sendQuote(id, { prices, message = "", days = 14 }) {
    const q = quote(id);
    if (!q) throw new TradeError("Quote not found.", 404);
    if (!["requested", "sent"].includes(q.status)) throw new TradeError(`This quote was ${q.status}.`);
    const list = Array.isArray(prices) ? prices : [];
    if (list.length !== q.lines.length) throw new TradeError("Price every line.");
    const priced = q.lines.map((l, i) => ({ ...l, price: cents(Number(list[i])) }));
    if (priced.some((l) => !(l.price > 0 && l.price < 10_000))) throw new TradeError("Price every line.");
    const d = Math.round(Number(days));
    if (!(d >= 1 && d <= 90)) throw new TradeError("A quote is good for 1 to 90 days.");
    Object.assign(q, {
      lines: priced,
      message: text(message, 1000),
      total: cents(priced.reduce((n, l) => n + l.price * l.qty, 0)),
      validUntil: new Date(Date.now() + d * 864e5).toLocaleDateString("en-CA", { timeZone: SITE.timezone || "America/Los_Angeles" }),
      status: "sent",
      sentAt: now(),
    });
    await save();
    return q;
  }
  async function decideQuote(id, { status, by, order = null }) {
    const q = quote(id);
    if (!q) throw new TradeError("That quote is gone.", 404);
    const st = quoteState(q);
    if (st === "expired") throw new TradeError("This quote has expired. Ask us for a new one.", 409);
    if (status === "withdrawn" && st !== "requested") throw new TradeError(st === "sent" ? "We've priced it already. Decline it instead." : `This quote was already ${st}.`, 409);
    if (status !== "withdrawn" && st !== "sent" && !(status === "declined" && st === "requested")) throw new TradeError(`This quote was already ${st}.`, 409);
    Object.assign(q, { status, decidedBy: String(by).toLowerCase(), decidedAt: now(), ...(order ? { order } : {}) });
    await save();
    return q;
  }

  /* ── Suppliers ── */

  function cleanSupplier(input, existing: any = {}) {
    const s = {
      name: text(input.name ?? existing.name, 120),
      contactName: text(input.contactName ?? existing.contactName, 80),
      email: text(input.email ?? existing.email, 254).toLowerCase(),
      phone: text(input.phone ?? existing.phone, 40),
      notes: text(input.notes ?? existing.notes, 1000),
    };
    if (!s.name) throw new TradeError("Add the supplier's name.");
    if (s.email && !EMAIL_RE.test(s.email)) throw new TradeError("That email doesn't look right.");
    return s;
  }

  async function createSupplier(input) {
    const supplier = { id: randomUUID(), ...cleanSupplier(input), createdAt: now() };
    db.suppliers.push(supplier);
    await save();
    return supplier;
  }

  async function updateSupplier(id, input) {
    const supplier = db.suppliers.find((s) => s.id === id);
    if (!supplier) throw new TradeError("Supplier not found.", 404);
    Object.assign(supplier, cleanSupplier(input, supplier), { updatedAt: now() });
    await save();
    return supplier;
  }

  /* ── Purchase orders ── */

  const nextPoNumber = () => {
    const max = db.purchaseOrders.reduce((n, p) => Math.max(n, Number(p.number.slice(3)) || 0), 1000);
    return `PO-${max + 1}`;
  };

  function cleanItems(items) {
    const list = (Array.isArray(items) ? items : [])
      .map((i) => ({
        description: text(i.description, 160),
        qty: Math.round(Number(i.qty) * 100) / 100,
        unit: text(i.unit, 20) || "units",
        unitCost: cents(Number(i.unitCost) || 0),
        received: Math.max(0, Math.round(Number(i.received || 0) * 100) / 100),
        // The green coffee it's for (server/green.ts): receiving it adds to that stock.
        ...(i.greenId ? { greenId: text(i.greenId, 64) } : {}),
      }))
      .filter((i) => i.description);
    if (!list.length) throw new TradeError("Add at least one item.");
    if (list.some((i) => !(i.qty > 0) || i.unitCost < 0)) throw new TradeError("Each item needs a quantity and a cost.");
    return list;
  }

  const totalOf = (items) => cents(items.reduce((n, i) => n + i.qty * i.unitCost, 0));

  async function createPurchaseOrder(input) {
    const supplier = db.suppliers.find((s) => s.id === input.supplierId);
    if (!supplier) throw new TradeError("Choose a supplier.");
    if (supplier.archivedAt) throw new TradeError("That supplier is archived. Restore it to order from it again.");
    const items = cleanItems(input.items);
    const at = now();
    const po = {
      number: nextPoNumber(),
      supplierId: supplier.id,
      supplierName: supplier.name,
      status: "draft",
      items,
      total: totalOf(items),
      expected: /^\d{4}-\d{2}-\d{2}$/.test(input.expected || "") ? input.expected : "",
      notes: text(input.notes, 1000),
      paid: false,
      createdAt: at,
      history: [{ at, status: "draft", by: "shop" }],
    };
    db.purchaseOrders.push(po);
    await save();
    return po;
  }

  async function updatePurchaseOrder(number, input) {
    const po = db.purchaseOrders.find((p) => p.number === number);
    if (!po) throw new TradeError("Purchase order not found.", 404);
    const action = String(input.action || "");
    const at = now();
    const log = (status, note?) => po.history.push({ at, by: "shop", ...(status ? { status } : {}), ...(note ? { note } : {}) });

    if (action === "edit") {
      if (po.status !== "draft") throw new TradeError("Only drafts can be edited.");
      po.items = cleanItems(input.items);
      po.total = totalOf(po.items);
      po.expected = /^\d{4}-\d{2}-\d{2}$/.test(input.expected || "") ? input.expected : "";
      po.notes = text(input.notes, 1000);
      log(null, "Edited");
    } else if (action === "sent") {
      if (po.status !== "draft") throw new TradeError("This order has already been sent.");
      po.status = "sent";
      po.sentAt = at;
      log("sent", input.note);
    } else if (action === "receive") {
      if (!["sent", "partial"].includes(po.status)) throw new TradeError("Send the order before receiving it.");
      const received = Array.isArray(input.received) ? input.received : [];
      po.items.forEach((item, i) => {
        const add = Math.max(0, Number(received[i]) || 0);
        item.received = Math.round((item.received + add) * 100) / 100;
      });
      const complete = po.items.every((i) => i.received >= i.qty);
      po.status = complete ? "received" : "partial";
      if (complete) po.receivedAt = at;
      log(po.status, received.some((n) => Number(n) > 0) ? `Received ${po.items.map((i, k) => (Number(received[k]) > 0 ? `${received[k]} ${i.unit} ${i.description}` : "")).filter(Boolean).join(", ")}` : null);
    } else if (action === "paid") {
      if (po.paid) throw new TradeError("Already marked as paid.");
      po.paid = true;
      po.paidAt = at;
      log(null, "Marked as paid");
    } else if (action === "cancel") {
      if (["received", "cancelled"].includes(po.status)) throw new TradeError("This order can't be cancelled.");
      po.status = "cancelled";
      log("cancelled");
    } else {
      throw new TradeError("Unknown change.");
    }
    po.updatedAt = at;
    await save();
    return po;
  }

  return {
    byQuote,
    get accounts() {
      return db.accounts;
    },
    get suppliers() {
      return db.suppliers;
    },
    get purchaseOrders() {
      return [...db.purchaseOrders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
    account,
    accountForEmail,
    addressFor,
    ownPrice,
    tierFor,
    pricing,
    get priceLists() {
      return [...db.priceLists].sort((a, b) => a.name.localeCompare(b.name));
    },
    createPriceList,
    updatePriceList,
    deletePriceList,
    roleOf,
    needsApproval,
    addRequest,
    request,
    requestsFor,
    decideRequest,
    quote,
    quoteState,
    addQuote,
    sendQuote,
    decideQuote,
    get quotes() {
      return [...db.quotes].sort((a, b) => b.at.localeCompare(a.at));
    },
    addCredit,
    updateOwnAccount,
    setTeam,
    markInvited,
    supplier: (id) => db.suppliers.find((s) => s.id === id) || null,
    purchaseOrder: (number) => db.purchaseOrders.find((p) => p.number === number) || null,
    createAccount,
    updateAccount,
    setSquareCustomer,
    setStripe,
    setCard,
    forgetSquare,
    markSupplier,
    priceWholesale,
    createSupplier,
    updateSupplier,
    archiveAccount,
    deleteAccount,
    archiveSupplier,
    deleteSupplier,
    createPurchaseOrder,
    updatePurchaseOrder,
  };
}
