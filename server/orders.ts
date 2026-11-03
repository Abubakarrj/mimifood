// Prices an order from the site data. The browser sends what was chosen
// (product, size, grind, quantity); every price is looked up here, so an
// edited cart can't change what an order costs.

export class OrderError extends Error {
  declare status: number;
  constructor(message: string) {
    super(message);
    this.status = 400;
  }
}

const EMAIL_RE = /^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]{2,}$/;
const MAX_LINES = 40;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_QTY = 50;

/** JSON from the browser: every field is checked or coerced before it's used. */
type Raw = { [field: string]: any };

/** A coffee from the shop (js/data.ts PRODUCTS). */
export interface Product {
  id: string;
  name: string;
  short?: string;
  type?: string;
  price: number;
  price1kg: number;
  soldOut?: boolean;
  ground?: boolean;
}

/** An accessory or a tea (js/data.ts ACCESSORIES); no price yet means coming soon. */
export interface Accessory {
  id: string;
  name: string;
  short?: string;
  category?: string;
  price?: number | null;
  sizes?: string[];
  colors?: { name: string }[];
  pack?: string;
  weightOz?: number;
  soldOut?: boolean;
}

interface CafeChoice {
  id: string;
  name: string;
  price: number;
}

interface CafeOptionGroup {
  id: string;
  name: string;
  multi?: boolean;
  choices: CafeChoice[];
}

interface CafeItem {
  id: string;
  name: string;
  price: number;
  soldOut?: boolean;
  madeOnArrival?: boolean;
  options?: CafeOptionGroup[];
}

interface Location {
  id: string;
  name: string;
  cafe?: boolean;
  address: string[];
  /** Sunday first: [open, close] as "HH:MM", or null when closed. */
  hours: ([string, string] | null)[];
}

interface Labelled {
  id: string;
  label: string;
}

/** A subscription choice from subscriptionCoffee(): a rotating coffee, a shop coffee or a tea. */
interface SubscriptionCoffee {
  id: string;
  label: string;
  product?: string;
  tea?: boolean;
  grinds?: string[];
}

interface SiteSettings {
  name: string;
  currency: string;
  timezone?: string;
  freeShippingOver: number;
  shippingFlat: number;
  cafesLive?: boolean;
  giftCards?: { amounts: number[]; min: number; max: number };
  cafeQueue?: { minutes: number; perCup: number };
  cafeDelivery: { fee: number; minimum: number; leadMinutes: number };
}

/** The site data the pricer reads (js/data.ts). */
export interface PricerData {
  SITE: SiteSettings;
  PRODUCTS: Product[];
  ACCESSORIES?: Accessory[];
  SUBSCRIPTION: { sizes: Labelled[]; frequencies: Labelled[]; prepaid?: number[] };
  LOCATIONS: Location[];
  CAFE_MENU: { items: CafeItem[] }[];
  US_STATES?: [string, string][];
  grindsFor: (p: Product) => string[];
  subscriptionCoffee: (id: string) => SubscriptionCoffee | null;
  subscriptionPrice: (coffee: SubscriptionCoffee | null, sizeId: string) => { full: number; price: number } | null;
}

/** A class or event from the calendar, as a ticket. */
export interface ClassEvent {
  id: string;
  title: string;
  booking?: string;
  price?: number;
  startsAt: string;
  endsAt?: string;
  place?: string;
}

/** A time slot of a class ("HH:MM"). */
export interface ClassSlot {
  start: string;
  end: string;
}

/** A delivery address (US). */
export interface ShipTo {
  name?: string;
  address: string;
  city: string;
  state: string;
  postcode: string;
  country: string;
  phone?: string;
}

/** A gift sent straight to the person it's for. */
export interface SendTo extends ShipTo {
  name: string;
  phone: string;
}

/** A drink option chosen (Size, Milk, Extras…). */
export interface CafeMod {
  group: string;
  name: string;
  price: number;
}

/** What a subscription line is for. */
export interface SubChoice {
  coffee: string;
  size: string;
  freq: string;
  grind?: string;
  gift: boolean;
  recipient: string;
  note: string;
  prepaid?: number;
}

export interface GiftCardDetails {
  toName: string;
  toEmail: string;
  toPhone?: string;
  fromName: string;
  message: string;
}

export type LineKind = "coffee" | "accessory" | "giftcard" | "class" | "sub" | "prepaid" | "pickup";

/** One priced line of an order. */
export interface OrderLine {
  kind: LineKind;
  product?: string;
  title: string;
  variant: string;
  note?: string;
  gift?: boolean;
  qty: number;
  price: number;
  category?: string;
  size?: string;
  color?: string;
  weightOz?: number;
  giftcard?: GiftCardDetails;
  slot?: string;
  slotEnd?: string;
  sub?: SubChoice;
  prep?: string;
  basePrice?: number;
  mods?: CafeMod[];
  sendTo?: SendTo;
  /** Sales tax rate (0 to 1), set at checkout. */
  taxRate?: number;
}

/** Options the server gives the pricer: café queues and class places. */
export interface PricerOptions {
  cafeCups?: (location: string) => number;
  classItem?: (id: string) => ClassEvent | null;
  placesLeft?: (x: ClassEvent, slot?: string) => number | null;
  slotsOf?: (x: ClassEvent) => ClassSlot[];
}

const text = (v: unknown, max: number) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const cents = (n: number) => Math.round(n * 100) / 100;

// cafeCups(location): drinks ahead in that bar's queue, for the as-soon-as-possible time.
export function createPricer({ SITE, PRODUCTS, ACCESSORIES = [], SUBSCRIPTION, LOCATIONS, CAFE_MENU, US_STATES = [], grindsFor, subscriptionCoffee, subscriptionPrice }: PricerData, { cafeCups = () => 0, classItem = () => null, placesLeft = () => null, slotsOf = () => [] }: PricerOptions = {}) {
  const US_STATE_CODES = new Set(US_STATES.map(([code]) => code));
  // PRODUCTS is the live catalogue (changed in place when the back office saves), so look it up each time.
  const products = { get: (id: string | undefined) => PRODUCTS.find((p) => p.id === id) };
  // CAFE_MENU is the live menu (changed in place when the back office saves): look up each time.
  const cafeItem = (id: string) => CAFE_MENU.flatMap((s) => s.items).find((i) => i.id === id);
  const label = (list: Labelled[], id: string) => list.find((x) => x.id === id);

  function giftOf(raw: Raw) {
    if (!raw || !raw.gift) return null;
    const recipient = text(raw.recipient, 80);
    if (!recipient) throw new OrderError("Add the recipient's name.");
    return { recipient, note: text(raw.note, 300) };
  }

  function coffeeLine(raw: Raw, qty: number): OrderLine {
    const p = products.get(raw.product);
    if (!p) throw new OrderError("One of the coffees in your cart is no longer available.");
    if (p.soldOut) throw new OrderError(`${p.short || p.name} has just sold out. Please remove it from your cart.`);
    const size = raw.size === "1kg" ? "1kg" : raw.size === "250g" ? "250g" : null;
    if (!size) throw new OrderError(`Please choose a size for ${p.short || p.name}.`);
    // Each coffee is ground only for the way it's roasted to be brewed (js/data.js grindsFor).
    const grinds = grindsFor(p);
    if (!grinds.includes(raw.grind)) {
      throw new OrderError(`${p.short || p.name}: please choose the grind again.`);
    }
    const gift = giftOf(raw);
    return {
      kind: "coffee",
      product: p.id,
      title: gift ? `${p.name}, gift for ${gift.recipient}` : p.name,
      variant: `${size} · ${raw.grind}`,
      note: gift?.note || "",
      gift: Boolean(gift),
      qty,
      price: size === "1kg" ? p.price1kg : p.price,
      ...(gift && raw.sendTo ? { sendTo: sendToOf(raw.sendTo, gift.recipient) } : {}),
    };
  }

  // An accessory (a tee, a dripper, a tea): its price and, for one with sizes, the size chosen.
  // A tea can be a gift, like a coffee.
  function accessoryLine(raw: Raw, qty: number): OrderLine {
    const a = ACCESSORIES.find((x) => x.id === raw.product);
    if (!a) throw new OrderError("One of the items in your cart is no longer available.");
    if (a.soldOut) throw new OrderError(`${a.short || a.name} has just sold out. Please remove it from your cart.`);
    if (a.price == null) throw new OrderError(`${a.short || a.name} isn't on sale yet. Please remove it from your cart.`);
    let size = "";
    if (a.sizes?.length) {
      if (!a.sizes.includes(raw.size)) throw new OrderError(`Please choose a size for ${a.short || a.name}.`);
      size = raw.size;
    }
    let color = "";
    if (a.colors?.length) {
      if (!a.colors.some((c) => c.name === raw.color)) throw new OrderError(`Please choose a color for ${a.short || a.name}.`);
      color = raw.color;
    }
    const variant = [color, size && `Size ${size}`, a.pack].filter(Boolean).join(" · ");
    const gift = a.category === "Tea" ? giftOf(raw) : null;
    return {
      kind: "accessory",
      product: a.id,
      category: a.category || "",
      title: gift ? `${a.name}, gift for ${gift.recipient}` : a.name,
      variant,
      ...(size && { size }),
      ...(color && { color }),
      ...(gift ? { note: gift.note, gift: true } : {}),
      qty,
      price: a.price,
      weightOz: a.weightOz || 0,
      ...(gift && raw.sendTo ? { sendTo: sendToOf(raw.sendTo, gift.recipient) } : {}),
    };
  }

  // A digital gift card (Square): an amount, and who it's for. Emailed to them once paid.
  function giftcardLine(raw: Raw, qty: number): OrderLine {
    const g = SITE.giftCards || { amounts: [], min: 10, max: 500 };
    const amount = Number(raw.amount);
    if (!Number.isInteger(amount) || amount < g.min || amount > g.max) throw new OrderError(`Gift cards are ${SITE.currency}${g.min} to ${SITE.currency}${g.max}, in whole dollars.`);
    const to = text(raw.toName, 80);
    const toEmail = text(raw.toEmail, 254).toLowerCase();
    const from = text(raw.fromName, 80);
    if (!to || !EMAIL_RE.test(toEmail)) throw new OrderError("Add the recipient's name and email.");
    if (!from) throw new OrderError("Add who it's from.");
    // Their mobile (optional): texted too, if they already have an iMessage conversation with us.
    const toPhone = String(raw.toPhone || "").replace(/[^\d+]/g, "").slice(0, 16);
    if (toPhone && !/^\+?\d{10,15}$/.test(toPhone)) throw new OrderError("Check their phone number.");
    return {
      kind: "giftcard",
      product: "gift-card",
      title: `${SITE.name} Gift Card`,
      variant: `For ${to}`,
      qty,
      price: amount,
      giftcard: { toName: to, toEmail, ...(toPhone && { toPhone }), fromName: from, message: text(raw.message, 300) },
    };
  }

  // A ticket for a class or event (from the calendar): its price, while there's a place left.
  // One with time slots needs the slot it's for, and the places are counted per slot.
  function classLine(raw: Raw, qty: number): OrderLine {
    const x = classItem(raw.product);
    if (!x || x.booking !== "pay" || !x.price) throw new OrderError("A ticket in your cart is no longer available. Remove it.");
    if ((x.endsAt || x.startsAt).slice(0, 10) < new Intl.DateTimeFormat("en-CA", { timeZone: SITE.timezone || "America/Los_Angeles" }).format(new Date())) throw new OrderError(`${x.title} has already happened. Please remove it from your cart.`);
    const slots = slotsOf(x);
    const slot = slots.length ? slots.find((sl) => sl.start === raw.slot) : null;
    if (slots.length && !slot) throw new OrderError(`${x.title}: choose a time. Remove it and add it again.`);
    const left = placesLeft(x, slot?.start);
    const what = slot ? `${x.title} at ${clock(slot.start)}` : x.title;
    if (left !== null && left < qty) throw new OrderError(left ? `${what}: only ${left} place${left === 1 ? "" : "s"} left.` : `${what} is full. Please remove it from your cart.`);
    return { kind: "class", product: x.id, title: x.title, variant: [x.startsAt.slice(0, 10), slot && `${clock(slot.start)} to ${clock(slot.end)}`, x.place].filter(Boolean).join(" · "), qty, price: x.price, ...(slot && { slot: slot.start, slotEnd: slot.end }) };
  }
  // "13:00" → "1:00 PM".
  const clock = (t: string) => `${Number(t.slice(0, 2)) % 12 || 12}:${t.slice(3, 5)} ${Number(t.slice(0, 2)) < 12 ? "AM" : "PM"}`;

  // A gift sent straight to the person it's for: their address (and phone, for a courier).
  function sendToOf(raw: Raw, name: string): SendTo {
    const state = text(raw.state, 2).toUpperCase();
    const to = { name, address: text(raw.address, 160), city: text(raw.city, 80), state, postcode: text(raw.postcode, 20), country: "US", phone: text(raw.phone, 40) };
    if (!(to.address && to.city && to.postcode)) throw new OrderError(`Please add ${name}'s address, or send the gift with your delivery.`);
    if (!US_STATE_CODES.has(state)) throw new OrderError(`Please choose a state for ${name}'s address.`);
    return to;
  }

  function subLine(raw: Raw, qty: number): OrderLine {
    const s = raw.sub || {};
    // A rotating choice, one coffee from the shop ("p:<id>", from its product page) or a tea ("t:<id>").
    const coffee = subscriptionCoffee(s.coffee);
    const size = label(SUBSCRIPTION.sizes, s.size);
    const freq = label(SUBSCRIPTION.frequencies, s.freq);
    const cost = subscriptionPrice(coffee, s.size);
    if (!coffee || !size || !freq || !cost) throw new OrderError("An option changed. Rebuild your subscription.");
    const item = coffee.tea ? ACCESSORIES.find((a) => a.id === coffee.product) : products.get(coffee.product);
    if (coffee.product && item?.soldOut) throw new OrderError(`${coffee.label} has just sold out. Please choose another coffee for your subscription.`);
    const grind = coffee.grinds ? (coffee.grinds.includes(s.grind) ? s.grind : coffee.grinds[0]) : "";
    const gift = giftOf({ gift: s.gift, recipient: s.recipient, note: s.note });
    // A tea's size reads as its pack ("8 single-serve cups").
    const sizeText = (coffee.tea && ACCESSORIES.find((x) => x.id === coffee.product)?.pack) || size.label;
    // A gift paid up front: a set number of monthly deliveries, charged now (no Square
    // subscription). The first box goes with this order; the server sends the rest.
    if (s.prepaid) {
      const months = Number(s.prepaid);
      if (!gift || !(SUBSCRIPTION.prepaid || []).includes(months)) throw new OrderError("An option changed. Rebuild your gift subscription.");
      const monthly = label(SUBSCRIPTION.frequencies, "monthly");
      return {
        kind: "prepaid",
        title: `${coffee.label} Gift Subscription for ${gift.recipient}`,
        variant: [sizeText, grind, `${months} months, paid up front`].filter(Boolean).join(" · "),
        note: gift.note,
        gift: true,
        qty: 1,
        price: cents(cost.price * months),
        sub: { coffee: coffee.id, size: size.id, freq: monthly!.id, ...(grind ? { grind } : {}), gift: true, recipient: gift.recipient, note: gift.note, prepaid: months },
        ...(raw.sendTo ? { sendTo: sendToOf(raw.sendTo, gift.recipient) } : {}),
      };
    }
    return {
      kind: "sub",
      title: gift ? `${coffee.label} Subscription, gift for ${gift.recipient}` : `${coffee.label} Subscription`,
      variant: [sizeText, grind, freq.label].filter(Boolean).join(" · "),
      note: gift?.note || "",
      gift: Boolean(gift),
      qty,
      price: cost.price,
      sub: { coffee: coffee.id, size: size.id, freq: freq.id, ...(grind ? { grind } : {}), gift: Boolean(gift), recipient: gift?.recipient || "", note: gift?.note || "" },
      ...(gift && raw.sendTo ? { sendTo: sendToOf(raw.sendTo, gift.recipient) } : {}),
    };
  }

  function cafeLine(raw: Raw, qty: number): OrderLine {
    const item = cafeItem(raw.item);
    if (!item) throw new OrderError("One of the café items in your cart is no longer on the menu.");
    if (item.soldOut) throw new OrderError(`${item.name} has just sold out. Please remove it from your cart.`);
    // Drink options (Size, Milk, Extras…): one choice per single-choice group, any for multi.
    const picked = raw.options && typeof raw.options === "object" ? raw.options : {};
    const mods: CafeMod[] = [];
    for (const group of item.options || []) {
      const want = group.multi ? [].concat(picked[group.id] || []) : [picked[group.id] ?? group.choices[0].id];
      for (const id of want.slice(0, group.choices.length)) {
        const choice = group.choices.find((c) => c.id === id);
        if (!choice) throw new OrderError(`${item.name}: please choose the ${group.name.toLowerCase()} again; the options have changed.`);
        mods.push({ group: group.name, name: choice.name, price: choice.price });
      }
    }
    const extra = mods.reduce((n, m) => n + m.price, 0);
    return {
      kind: "pickup",
      title: mods.length ? `${item.name} (${mods.map((m) => m.name).join(", ")})` : item.name,
      variant: "",
      note: "",
      ...(item.madeOnArrival ? { prep: "Made on arrival" } : {}),
      gift: false,
      qty,
      price: cents(item.price + extra),
      ...(mods.length ? { basePrice: item.price, mods } : {}),
    };
  }

  // The shop's local time `lead` minutes from now, rounded up to 5 minutes ("2026-10-14T09:35").
  function asapTime(lead: number) {
    const parts = Object.fromEntries(
      new Intl.DateTimeFormat("en-US", { timeZone: SITE.timezone || "America/Los_Angeles", hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })
        .formatToParts(new Date(Date.now() + lead * 60e3))
        .map((p) => [p.type, p.value])
    );
    let mins = Math.ceil((+parts.hour * 60 + +parts.minute) / 5) * 5;
    if (mins >= 1440) mins = 1435;
    return `${parts.year}-${parts.month}-${parts.day}T${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
  }

  function cafeDetails(raw: Raw) {
    const loc = LOCATIONS.find((l) => l.id === raw?.location && l.cafe !== false);
    if (!loc) throw new OrderError("Choose a café.");
    const delivering = raw.mode === "delivery";
    // "asap": the shop's time now plus the lead (15 minutes, or the courier lead), and a couple of
    // minutes for each drink ahead in the bar's queue, rounded up to 5.
    const asap = raw.time === "asap";
    const Q = SITE.cafeQueue || { minutes: 15, perCup: 2 };
    const timeIn = asap ? asapTime((delivering ? SITE.cafeDelivery.leadMinutes : Q.minutes) + cafeCups(loc.id) * Q.perCup) : String(raw.time || "");
    // Times are the shop's local time ("2026-10-14T09:30"), so check the format and opening hours.
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(timeIn);
    if (!m) throw new OrderError("Choose a time.");
    // A time saved earlier that has since gone by (the 5-minute rounding gives a little slack).
    if (!asap && timeIn < asapTime(-5)) throw new OrderError("That time has passed. Choose a later one.");
    const day = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const daysAway = ((day as any) - Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate())) / 864e5;
    if (daysAway < -1 || daysAway > 8) throw new OrderError("Choose a new time.");
    const hours = loc.hours[day.getUTCDay()];
    const minutes = +m[4] * 60 + +m[5];
    const toMin = (hhmm: string): number => (hhmm.split(":") as (string | number)[]).reduce((h, mm) => +h * 60 + +mm) as number;
    if (!hours || minutes < toMin(hours[0]) || minutes > toMin(hours[1]) - 15) {
      throw new OrderError(asap ? `${loc.name} isn't taking orders right now. Please choose a later time.` : `${loc.name} isn't open then. Please choose another time.`);
    }
    // Ready in a 10-minute window ("Wed, Oct 14, 9:30–9:40am"); ASAP says roughly when.
    const clock = (t: number) => `${Math.floor(t / 60) % 12 || 12}:${String(t % 60).padStart(2, "0")}`;
    const ampm = (t: number) => (Math.floor(t / 60) % 24 < 12 ? "am" : "pm");
    const win = ampm(minutes) === ampm(minutes + 10) ? `${clock(minutes)}–${clock(minutes + 10)}${ampm(minutes)}` : `${clock(minutes)}${ampm(minutes)}–${clock(minutes + 10)}${ampm(minutes + 10)}`;
    const when = asap ? `As soon as possible (about ${clock(minutes)}${ampm(minutes)})` : `${DAYS[day.getUTCDay()]}, ${MONTHS[+m[2] - 1]} ${+m[3]}, ${win}`;
    const delivery = delivering;
    const address = delivery
      ? { street: text(raw.address?.street, 120), city: text(raw.address?.city, 80), postcode: text(raw.address?.postcode, 20) }
      : null;
    if (delivery && !(address!.street && address!.city && address!.postcode)) throw new OrderError("Add the café delivery address.");
    return { location: loc.id, locationName: loc.name, locationAddress: loc.address.join(", "), mode: delivery ? "delivery" : "pickup", time: m[0], window: win, asap, when, address };
  }

  // Returns a priced order, or throws OrderError with a message for the customer.
  function price(input: Raw) {
    const contact = { name: text(input?.name, 80), email: text(input?.email, 254).toLowerCase(), phone: text(input?.phone, 40) };
    if (!contact.name) throw new OrderError("Please enter your name.");
    if (!EMAIL_RE.test(contact.email)) throw new OrderError("Enter a valid email.");

    const raw = Array.isArray(input.lines) ? input.lines : [];
    if (!raw.length) throw new OrderError("Your cart is empty.");
    if (raw.length > MAX_LINES) throw new OrderError("That's a big order! Email us and we'll sort it out.");

    const lines = raw.map((l) => {
      const qty = Number(l?.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > MAX_QTY) throw new OrderError("Check the quantities in your cart.");
      if (l.kind === "coffee") return coffeeLine(l, qty);
      if (l.kind === "accessory") return accessoryLine(l, qty);
      if (l.kind === "sub") return subLine(l, qty);
      if (l.kind === "class") return classLine(l, qty);
      if (l.kind === "giftcard") return giftcardLine(l, qty);
      if (l.kind === "pickup") {
        if (SITE.cafesLive === false) throw new OrderError("Order Ahead isn't open yet. Remove the café items.");
        return cafeLine(l, qty);
      }
      throw new OrderError("Your cart has an unknown item. Remove it.");
    });

    // Retail coffee and subscriptions: delivered, or collected from the roastery. The server then
    // decides how a delivery goes: by courier when the address is local, otherwise shipped.
    // Bags ordered with café items go with them instead: handed over at the bar (every bar
    // stocks them) or brought by the same courier.
    const hasCafe = lines.some((l) => l.kind === "pickup");
    if (hasCafe && lines.some((l) => l.kind === "sub" || l.kind === "prepaid")) throw new OrderError("Subscriptions are ordered on their own. Please check out your café order first.");
    if (hasCafe && lines.some((l) => l.kind === "accessory")) throw new OrderError("Check out café items separately.");
    if (hasCafe && lines.some((l) => l.kind === "class")) throw new OrderError("Book classes separately. Check out your café order first.");
    if (hasCafe && lines.some((l) => l.kind === "giftcard")) throw new OrderError("Check out gift cards and café items separately.");
    if (hasCafe) lines.forEach((l) => delete l.sendTo);

    // Gifts sent to the people they're for: one delivery per address, each with its own shipping.
    const groups = new Map<string, { shipTo: SendTo; lines: OrderLine[] }>();
    for (const l of lines.filter((x) => x.sendTo)) {
      const t = l.sendTo!;
      const key = [t.name, t.address, t.city, t.postcode].join("|").toLowerCase();
      if (!groups.has(key)) groups.set(key, { shipTo: { ...t }, lines: [] });
      const { sendTo, ...line } = l;
      groups.get(key)!.lines.push(line);
    }
    // Subscriptions always ship free; one-off coffee and accessories do when the whole order,
    // subscriptions, gift cards and gifts sent elsewhere included, is over the threshold: then
    // every parcel ships free, as the cart promised.
    const orderTotal = lines.filter((l) => l.kind === "coffee" || l.kind === "accessory" || l.kind === "sub" || l.kind === "prepaid" || l.kind === "giftcard").reduce((n, l) => n + l.price * l.qty, 0);
    const shipFor = (ls: OrderLine[]) => (ls.some((l) => l.kind === "coffee" || l.kind === "accessory") && orderTotal < SITE.freeShippingOver ? SITE.shippingFlat : 0);
    let giftDeliveries = [...groups.values()].map((g) => ({ ...g, fulfilment: "Delivery", shipping: shipFor(g.lines) }));
    let own = lines.filter((l) => !l.sendTo);

    // (A class seat or a gift card is nothing to send.)
    const shippable = hasCafe ? [] : own.filter((l) => l.kind !== "pickup" && l.kind !== "class" && l.kind !== "giftcard");
    const collect = input.fulfilment === "Pickup";
    let shipTo: ShipTo | null = null;
    if (shippable.length && !collect) {
      const state = text(input.state, 2).toUpperCase();
      shipTo = { address: text(input.address, 160), city: text(input.city, 80), state, postcode: text(input.postcode, 20), country: "US" };
      if (!(shipTo.address && shipTo.city && shipTo.postcode)) throw new OrderError("Add a delivery address.");
      if (!US_STATE_CODES.has(state)) throw new OrderError("Please choose a state.");
    }
    // Subscriptions ship free (every delivery); the rest when the order is over the threshold.
    let shipping = collect ? 0 : shipFor(shippable);
    let fulfilment = shippable.length ? (collect ? "Pickup" : "Delivery") : "";
    // Everything is a gift sent away: the first gift's delivery is this order, the rest follow it.
    if (!own.length && giftDeliveries.length) {
      const [first, ...rest] = giftDeliveries;
      own = first.lines;
      shipTo = first.shipTo;
      shipping = first.shipping;
      fulfilment = "Delivery";
      giftDeliveries = rest;
    }
    shipping += giftDeliveries.reduce((n, g) => n + g.shipping, 0);

    // Café items (and any bags with them): one location and time for all of them.
    const cafe = hasCafe ? cafeDetails(input.cafe) : null;
    const cafeTotal = hasCafe ? lines.reduce((n, l) => n + l.price * l.qty, 0) : 0;
    const cafeFee = cafe?.mode === "delivery" ? SITE.cafeDelivery.fee : 0;
    // Couriers call the customer if they can't find them.
    if (cafe?.mode === "delivery" && contact.phone.replace(/\D/g, "").length < 10) {
      throw new OrderError("Add a phone number for the courier.");
    }
    if (cafe?.mode === "delivery" && cafeTotal < SITE.cafeDelivery.minimum) {
      throw new OrderError(`Café delivery has a ${SITE.currency}${SITE.cafeDelivery.minimum} minimum.`);
    }

    const subtotal = cents(lines.reduce((n, l) => n + l.price * l.qty, 0));
    return {
      contact,
      lines: own,
      giftDeliveries,
      fulfilment,
      shipTo,
      cafe,
      notes: text(input.notes, 1000),
      subtotal,
      shipping,
      cafeFee,
      total: cents(subtotal + shipping + cafeFee),
    };
  }

  return { price };
}
