// The team: each person signs in to the back office with their own email (a code is emailed to
// them), and has a role that decides which pages they can open. The admin key still signs in,
// as the owner. Every change made in the back office is kept in the activity log, with who.
//
// Stored with the admin sessions: adminStore.data.staff and adminStore.data.activity (see
// server.ts), so it needs no store of its own.

import { randomUUID } from "node:crypto";

export class StaffError extends Error {
  declare status: any;
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// What each role can open. "*" is every page. Owners alone manage the team.
export const ROLES = {
  owner: { label: "Owner", pages: "*" },
  manager: { label: "Manager", pages: "*" },
  fulfillment: { label: "Fulfillment", pages: ["overview", "orders", "roasting", "returns", "inbox", "customers"] },
  cafe: { label: "Café", pages: ["orders", "menu", "inbox"] },
};

// The back office's pages, for choosing which ones a person sees (beyond their role).
export const PAGE_IDS = ["overview", "assistant", "todos", "orders", "carts", "inbox", "customers", "subscriptions", "wholesale", "returns", "reviews", "roasting", "products", "menu", "purchasing", "imports", "signups", "notes", "calendar", "ambassadors", "insights", "careers", "salestax", "calls", "helpdocs", "languages", "team"];

// The pages an admin API path serves: someone who can open any of them can call it. A path not
// listed here is open only to people who see every page.
const API_PAGE: [RegExp, string[]][] = [
  [/^\/api\/admin\/(orders|delivery)(\/|$)/, ["orders"]],
  [/^\/api\/admin\/(returns|claims|claim-photos)(\/|$)/, ["returns"]],
  [/^\/api\/admin\/inbox(\/|$)/, ["inbox"]],
  [/^\/api\/admin\/customers(\/|$)/, ["customers"]],
  [/^\/api\/admin\/menu(\/|$)/, ["menu"]],
  [/^\/api\/admin\/overview(\/|$)/, ["overview"]],
  [/^\/api\/admin\/carts(\/|$)/, ["carts"]],
  [/^\/api\/admin\/roasting(\/|$)/, ["roasting"]],
  [/^\/api\/admin\/(green|samples)(\/|$)/, ["purchasing"]],
  [/^\/api\/admin\/(suppliers|purchase-orders|bills)(\/|$)/, ["purchasing"]],
  [/^\/api\/admin\/imports(\/|$)/, ["imports"]],
  [/^\/api\/admin\/trade(\/|$)/, ["wholesale", "purchasing"]],
  [/^\/api\/admin\/(accounts|wholesale-orders|wholesale|quotes|prospects|price-lists)(\/|$)/, ["wholesale"]],
  [/^\/api\/admin\/subscriptions(\/|$)/, ["subscriptions"]],
  [/^\/api\/admin\/reviews(\/|$)/, ["reviews"]],
  [/^\/api\/admin\/catalog(\/|$)/, ["products", "orders", "wholesale", "menu"]],
  [/^\/api\/admin\/(products|product-labels|teas|foods|promos|gift-cards)(\/|$)/, ["products"]],
  [/^\/api\/admin\/stock(\/|$)/, ["products", "roasting"]],
  [/^\/api\/admin\/(signups|newsletters|automations)(\/|$)/, ["signups"]],
  [/^\/api\/admin\/notes(\/|$)/, ["notes"]],
  [/^\/api\/admin\/calendar(\/|$)/, ["calendar"]],
  [/^\/api\/admin\/ambassadors(\/|$)/, ["ambassadors"]],
  [/^\/api\/admin\/insights(\/|$)/, ["insights", "reviews"]],
  [/^\/api\/admin\/careers(\/|$)/, ["careers"]],
  [/^\/api\/admin\/sales-tax(\/|$)/, ["salestax"]],
  [/^\/api\/admin\/translations(\/|$)/, ["languages"]],
  [/^\/api\/admin\/assistant(\/|$)/, ["assistant"]],
  [/^\/api\/admin\/calls(\/|$)/, ["calls"]],
  [/^\/api\/admin\/help-docs(\/|$)/, ["helpdocs"]],
];
// Open to anyone signed in: who they are, the "someone else is editing" heartbeat, signing out,
// their own to-dos, imports and the outbox (each shows only what they may see).
// Search is everyone's: it only returns what the person's pages show (server.ts).
const ANYONE = /^\/api\/admin\/(me|presence|logout|search|help|todos(\/.*)?|outbox(\/.*)?)$/;

const EMAIL_RE = /^[^\s@,"<>]+@[^\s@,"<>]+\.[^\s@,"<>]{2,}$/;
const text = (v, n) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, n);

// The person signed in with the admin key.
export const KEY_OWNER = { id: "key", name: "Owner", email: "", role: "owner" };

export function createStaff({ store }) {
  const db = store.data;
  db.staff ||= [];
  db.activity ||= [];
  const save = () => store.save();
  const person = (id) => db.staff.find((s) => s.id === id) || null;
  const byEmail = (email) => db.staff.find((s) => s.email === String(email || "").trim().toLowerCase()) || null;

  // Someone's pages: every page for an owner; else the ones chosen for them, or their role's.
  const pagesOf = (who) => (who?.role === "owner" ? "*" : Array.isArray(who?.pages) ? who.pages : ROLES[who?.role]?.pages || []);
  const canOpen = (who, page) => {
    const pages = pagesOf(who);
    return pages === "*" || (Array.isArray(pages) && pages.includes(page));
  };
  // Whether someone may call an admin API path.
  function canCall(who, path) {
    if (!who) return false;
    if (ANYONE.test(path)) return true;
    if (/^\/api\/admin\/staff(\/|$)/.test(path)) return who.role === "owner";
    if (/^\/api\/admin\/activity(\/|$)/.test(path)) return ["owner", "manager"].includes(who.role);
    if (pagesOf(who) === "*") return true;
    const hit = API_PAGE.find(([re]) => re.test(path));
    return Boolean(hit && hit[1].some((page) => canOpen(who, page)));
  }

  function clean(input, was: any = {}) {
    const s = {
      name: text(input.name ?? was.name, 80),
      email: text(input.email ?? was.email, 254).toLowerCase(),
      role: input.role in ROLES ? input.role : was.role || "fulfillment",
      active: "active" in input ? Boolean(input.active) : was.active !== false,
      // The pages chosen for them (null: their role's). Owners always see everything.
      pages: "pages" in input ? (Array.isArray(input.pages) ? [...new Set(input.pages.map(String))].filter((id: string) => PAGE_IDS.includes(id)) : null) : was.pages ?? null,
    };
    if (s.role === "owner") s.pages = null;
    if (!s.name) throw new StaffError("Add their name.");
    if (!EMAIL_RE.test(s.email)) throw new StaffError("Add an email they can get a sign-in code at.");
    if (db.staff.some((x) => x.email === s.email && x.id !== was.id)) throw new StaffError("Someone on the team already uses that email.");
    return s;
  }
  // The team always keeps an owner who can sign in (besides the admin key).
  const keepsOwner = (next) => !db.staff.some((s) => s.role === "owner" && s.active !== false) || next.some((s) => s.role === "owner" && s.active !== false);

  async function add(input) {
    const s = { id: randomUUID(), ...clean(input), createdAt: new Date().toISOString() };
    db.staff.push(s);
    await save();
    return s;
  }
  async function update(id, input) {
    const s = person(id);
    if (!s) throw new StaffError("They're not on the team any more.", 404);
    const next = clean(input, s);
    if (!keepsOwner(db.staff.map((x) => (x === s ? { ...x, ...next } : x)))) throw new StaffError("Keep at least one owner on the team.");
    Object.assign(s, next, { updatedAt: new Date().toISOString() });
    await save();
    return s;
  }
  async function remove(id) {
    const s = person(id);
    if (!s) throw new StaffError("They're not on the team any more.", 404);
    if (!keepsOwner(db.staff.filter((x) => x !== s))) throw new StaffError("Keep at least one owner on the team.");
    db.staff = db.staff.filter((x) => x !== s);
    await save();
  }
  async function signedIn(id) {
    const s = person(id);
    if (!s) return;
    s.lastSignIn = new Date().toISOString();
    await save();
  }

  /* The activity log: one line per change, newest first, kept 180 days (at most 5,000). */
  const NOUN = {
    orders: "order", "wholesale-orders": "wholesale order", products: "product", catalog: "catalog", teas: "tea", stock: "stock", "product-labels": "label", menu: "café menu",
    customers: "customer", subscriptions: "subscription", returns: "return", claims: "claim", reviews: "review", inbox: "conversation", promos: "promo code", "gift-cards": "gift card",
    accounts: "wholesale account", quotes: "quote", suppliers: "supplier", "purchase-orders": "purchase order", signups: "newsletter list", newsletters: "newsletter", notes: "Numeral post",
    calendar: "calendar", ambassadors: "ambassador", careers: "careers", prospects: "prospect", translations: "translations", "sales-tax": "sales tax", automations: "automation",
    assistant: "assistant", staff: "team member", delivery: "delivery", todos: "to-do", carts: "abandoned cart", green: "green coffee", roasting: "roast", imports: "import", bills: "bill", outbox: "email",
  };
  // "PATCH /api/admin/orders/MF-1/refund" → "Order MF-1: refund".
  function describe(method, path) {
    const [, , , what = "", id = "", ...rest] = path.split("/");
    const noun = NOUN[what] || what.replace(/-/g, " ");
    const action = rest.filter((x) => !/^[\w-]{20,}$/.test(x)).join(" ").replace(/-/g, " ");
    const ref = id && !/^[a-f0-9-]{30,}$/i.test(id) ? ` ${decodeURIComponent(id)}` : "";
    const verb = action ? `: ${action}` : method === "POST" ? (id ? "" : ": added") : method === "DELETE" ? ": deleted" : ": changed";
    return `${noun.charAt(0).toUpperCase()}${noun.slice(1)}${ref}${verb}`;
  }
  async function log(who, method, path) {
    const cutoff = new Date(Date.now() - 180 * 864e5).toISOString();
    db.activity.unshift({ id: randomUUID(), at: new Date().toISOString(), staffId: who.id, who: who.name, role: who.role, method, path, what: describe(method, path) });
    db.activity = db.activity.filter((a) => a.at > cutoff).slice(0, 5000);
    await save();
  }
  const activity = ({ who = "", limit = 300 } = {}) => db.activity.filter((a) => !who || a.staffId === who).slice(0, limit);

  return {
    pagesOf,
    get list() {
      return [...db.staff].sort((a, b) => a.name.localeCompare(b.name));
    },
    person,
    byEmail,
    canOpen,
    canCall,
    add,
    update,
    remove,
    signedIn,
    log,
    activity,
  };
}
