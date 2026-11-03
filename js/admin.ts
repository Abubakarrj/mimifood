// Mimi Food back office: overview, orders, subscriptions, wholesale, signups.
// Talks to /api/admin/* on the server; staff sign in with the ADMIN_KEY.
// Pages live in the URL hash: #overview, #orders/new, #subscriptions, #wholesale, #signups.

export type {};

const $ = (sel: string, root: ParentNode = document): any => root.querySelector(sel);
const $$ = (sel: string, root: ParentNode = document): any[] => [...root.querySelectorAll(sel)];
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// An image address for an <img>: site-relative ones from the catalog (assets/menu/…) are made
// absolute, since back office pages live under /admin/….
const imgSrc = (u) => esc(u && !/^([a-z]+:|\/)/i.test(u) ? `/${u}` : u);

const LOGO = `<img class="mark-img" src="/assets/logo-mark.png" alt="">`;

// Icons: Lucide (outlined), loaded from /vendor/lucide.min.js. Markup is built from
// Lucide's own icon data so the page can render as strings.
const ICON = {
  overview: "House",
  orders: "ClipboardList",
  carts: "ShoppingBag",
  roasting: "Flame",
  todos: "ListTodo",
  clock: "Clock",
  repeat: "Repeat",
  cart: "ShoppingCart",
  subscriptions: "Repeat",
  customers: "Users",
  signups: "Mail",
  wholesale: "Store",
  site: "ExternalLink",
  download: "Download",
  upload: "Upload",
  logout: "LogOut",
  search: "Search",
  print: "Printer",
  close: "X",
  menu: "Menu",
  arrow: "ArrowRight",
  ext: "ArrowUpRight",
  up: "ArrowUp",
  down: "ArrowDown",
  eye: "Eye",
  eyeOff: "EyeOff",
  purchasing: "Truck",
  plus: "Plus",
  trash: "Trash2",
  products: "Bean",
  label: "Tag",
  image: "ImagePlus",
  moveUp: "ChevronUp",
  moveDown: "ChevronDown",
  ship: "Truck",
  collect: "Store",
  cafe: "Coffee",
  bike: "Bike",
  building: "Building2",
  gift: "Gift",
  cafeMenu: "UtensilsCrossed",
  hot: "Coffee",
  iced: "CupSoda",
  food: "Croissant",
  synced: "CircleCheck",
  syncError: "CircleAlert",
  edit: "Pencil",
  send: "Send",
  languages: "Languages",
  salesTax: "Receipt",
  careers: "BriefcaseBusiness",
  ambassadors: "BadgeCheck",
  star: "Star",
  returns: "Undo2",
  undo: "Undo2",
  sparkles: "Sparkles",
  back: "ArrowLeft",
  copy: "Copy",
  settings: "Settings",
  file: "Paperclip",
  notes: "NotebookPen",
  calendar: "CalendarDays",
  inbox: "Inbox",
  chat: "MessageSquare",
  email: "Mail",
  imessage: "MessageSquareText",
  archive: "Archive",
  reopen: "RotateCcw",
  heading: "Heading",
  text: "Pilcrow",
  picture: "Image",
  button: "MousePointerClick",
  divider: "SeparatorHorizontal",
  test: "FlaskConical",
  more: "Ellipsis",
  check: "Check",
  filter: "ListFilter",
  sort: "ArrowDownUp",
  link: "Link",
  team: "Users",
  doc: "FileText",
  quote: "FileText",
  receipt: "Receipt",
  help: "CircleHelp",
};
const attrs = (o) => Object.entries(o).map(([k, v]) => `${k}="${esc(v)}"`).join(" ");
// Thin outlines, as Peasy's (which are Lucide too).
const icon = (name, cls = "i") => {
  const node = (window as any).lucide?.icons?.[ICON[name] || name] || [];
  return `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${node.map(([tag, a]) => `<${tag} ${attrs(a)}/>`).join("")}</svg>`;
};

const PAGES = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "assistant", label: "Assistant", icon: "sparkles" },
  { id: "todos", label: "To-dos", icon: "todos" },
  { id: "inbox", label: "Inbox", icon: "inbox" },
  { id: "outbox", label: "Outbox", icon: "send" },
  { id: "orders", label: "Orders", icon: "orders", group: "Sell" },
  { id: "carts", label: "Abandoned carts", icon: "carts", group: "Sell" },
  { id: "customers", label: "Customers", icon: "customers", group: "Sell" },
  { id: "subscriptions", label: "Subscriptions", icon: "subscriptions", group: "Sell" },
  { id: "wholesale", label: "Wholesale", icon: "wholesale", group: "Wholesale" },
  { id: "returns", label: "Returns", icon: "returns", group: "Sell" },
  { id: "reviews", label: "Reviews", icon: "star", group: "Sell" },
  { id: "roasting", label: "Roasting", icon: "roasting", group: "Make" },
  { id: "products", label: "Products", icon: "products", group: "Make" },
  { id: "menu", label: "Café menu", icon: "cafeMenu", group: "Make" },
  { id: "purchasing", label: "Purchasing", icon: "purchasing", group: "Buy" },
  { id: "imports", label: "Imports", icon: "upload", group: "Buy" },
  { id: "signups", label: "Newsletter", icon: "signups", group: "Marketing" },
  { id: "notes", label: "Numeral", icon: "notes", group: "Marketing" },
  { id: "calendar", label: "Calendar", icon: "calendar", group: "Marketing" },
  { id: "ambassadors", label: "Ambassadors", icon: "ambassadors", group: "Marketing" },
  { id: "insights", label: "Insights", icon: "eye", group: "Marketing" },
  { id: "business", label: "Business", icon: "building", group: "Configure" },
  { id: "team", label: "Team", icon: "team", group: "Configure" },
  { id: "salestax", label: "Sales tax", icon: "salesTax", group: "Configure" },
  { id: "calls", label: "Calls", icon: "Phone", group: "Configure" },
  { id: "helpdocs", label: "Help Docs", icon: "BookOpen", group: "Configure" },
  { id: "languages", label: "Languages", icon: "languages", group: "Configure" },
  { id: "careers", label: "Careers", icon: "careers", group: "Configure" },
].filter((p) => !["roasting", "menu", "subscriptions", "calendar", "ambassadors", "notes", "careers", "calls", "helpdocs", "imports"].includes(p.id));
/* ── Configure (Peasy's): the gear swaps the sidebar for the settings pages, grouped, with a back
   arrow to where you were. Their pages sit in a centered column under a breadcrumb. ── */
const CONFIG_NAV = [
  ["Business", ["business", "team", "salestax"]],
  ["Website", ["languages"]],
];
const isConfig = (id = state.page) => PAGES.find((p) => p.id === id)?.group === "Configure";
const configPages = () => myPages().filter((p) => isConfig(p.id));
// Each Configure page opens on its title and a short line (Peasy's).
const CONFIG_LINE = {
  business: "Your business details, how the back office looks, and your emails.",
  team: "Manage who has access to your back office.",
  salestax: "Where you collect sales tax, and how close you are to each state's limit.",
  calls: "When cafés can book a call with you from their portal, and who takes it.",
  helpdocs: "The guides in the help panels, for your team and for cafés.",
  languages: "Spanish and Korean for every line of the website.",
  careers: "The roles on your careers page, and who has applied.",
};
// The last page outside Configure, for its back arrow.
let configBack = "overview";
// Who's signed in and what their role opens ("*": every page). Fetched once on sign-in.
let ME: any = null;
const canOpen = (id) => !ME || ME.pages === "*" || ME.pages.includes(id) || id === "todos" || id === "outbox" || (id === "team" && ["owner", "manager"].includes(ME.role));
const myPages = () => PAGES.filter((p) => canOpen(p.id));

const TABS = [
  { id: "new", label: "To pack" },
  { id: "packed", label: "Packed" },
  { id: "shipped", label: "Shipped" },
  { id: "ready", label: "Ready to collect" },
  { id: "completed", label: "Completed" },
  { id: "cancelled", label: "Cancelled" },
  { id: "pending_payment", label: "Awaiting payment" },
  { id: "hidden", label: "Hidden" },
];
const STATUS_LABEL = { ...Object.fromEntries(TABS.map((t) => [t.id, t.label])), new: "To pack" };
const PAY_LABEL = { paid: "Paid", unpaid: "Unpaid", refunded: "Refunded", partially_refunded: "Part refunded" };
const SUB_STATUS = { active: "Active", paused: "Paused", ended: "Complete", cancelled: "Cancelled" };

const state: any = {
  page: "overview",
  tab: "new",
  orders: [],
  counts: {},
  subs: [],
  wholesale: [],
  signups: [],
  customers: [],
  customerFilter: "active",
  trade: null,
  catalog: null,
  menu: null,
  square: false,
  sub: "orders",
  panel: false,
  overview: null,
  shop: { currency: "$", name: "Mimi Food", email: "" },
  carriers: [],
  selected: new Set(),
  open: null,
  query: "",
};

const money = (n) => `${state.shop.currency}${Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const moneyShort = (n) => `${state.shop.currency}${n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : Math.round(n)}`;
const date = (iso) => new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
const day = (iso) => new Date(iso).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
// "Oct 11", or "Oct 11, 2025" when it isn't this year.
const dayShort = (iso) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(new Date(iso).getFullYear() !== new Date().getFullYear() && { year: "numeric" }) });
const ago = (iso) => {
  const m = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (m < 60) return `${Math.max(1, m)} min ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h} hr ago` : `${Math.round(h / 24)} day${Math.round(h / 24) === 1 ? "" : "s"} ago`;
};

async function api(path: string, { method = "GET", body }: { method?: string; body?: any } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error || "Something went wrong.");
    error.status = res.status;
    throw error;
  }
  // A change saved while something is open for editing: anyone else editing it is told.
  if (method !== "GET" && path !== "/api/admin/presence" && presence) presence.beat({ saved: true });
  if (freshDraft && method !== "GET" && path.startsWith(freshDraft.url)) freshDraft = null;
  return data;
}

// A draft made by New newsletter, New event, New class or New post: deleted again if it's left
// without a change, so a stray click doesn't leave a blank draft in the list.
let freshDraft = null;
const newDraft = (url, to) => {
  freshDraft = { url, to: routeUrl(to) };
  go(to);
};
const dropFreshDraft = () => {
  const d = freshDraft;
  if (!d || location.pathname === d.to) return Promise.resolve();
  freshDraft = null;
  return api(d.url, { method: "DELETE" }).catch(() => {});
};

/* ── Who else is editing (two people on the same product, event or post) ── */

// The item open for editing: a side panel's (openPanel's `editing`), else the page's editor.
let presence = null;
let panelKey = null;
const pageKey = () =>
  state.page === "calendar" && state.cal ? `calendar:${state.cal.id}` : state.page === "notes" && state.note ? `note:${state.note.id}` : state.page === "signups" && state.sub === "edit" && state.nlId ? `newsletter:${state.nlId}` : null;
function syncPresence() {
  const key = (!$("[data-drawer]")?.hidden && panelKey) || pageKey();
  if (presence?.key === key) return presence.show();
  if (presence) {
    clearInterval(presence.timer);
    api("/api/admin/presence", { method: "POST", body: { key: presence.key, leave: true } }).catch(() => {});
    presence = null;
  }
  if (!key) return;
  const p: any = { key, openedAt: Date.now(), last: null };
  p.show = () => {
    const where = $("[data-drawer]:not([hidden]) .drawer-body") || $("[data-cal-editor], [data-note-editor], [data-nl-editor]");
    let note = $("[data-editing-note]");
    const r = p.last;
    const text = !r ? "" : r.savedByOther ? "Someone else saved changes to this after you opened it. Close and reopen it to see them before you save." : r.others.length ? `Someone else is editing this${r.others[0].device ? ` on ${r.others[0].device}` : ""}. Saving may overwrite their changes.` : "";
    if (!text || !where) return note?.remove();
    if (!note || !where.contains(note)) {
      note?.remove();
      where.insertAdjacentHTML("afterbegin", `<p class="editing-note" role="status" data-editing-note></p>`);
      note = $("[data-editing-note]", where);
    }
    note.textContent = text;
  };
  p.beat = async (extra = {}) => {
    const r = await api("/api/admin/presence", { method: "POST", body: { key, openedAt: p.openedAt, ...extra } }).catch(() => null);
    if (presence !== p || !r) return;
    p.last = r;
    p.show();
  };
  p.timer = setInterval(() => p.beat(), 15000);
  presence = p;
  p.beat();
}
window.addEventListener("pagehide", () => presence && navigator.sendBeacon?.("/api/admin/presence", new Blob([JSON.stringify({ key: presence.key, leave: true })], { type: "application/json" })));

const app = $("[data-app]");

/* ── Wrong or missing input: shake the field and outline it in red ── */

const textFields = (form) =>
  $$("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea", form).filter((f) => !f.disabled && !f.closest("[hidden]"));

// The words a field is known by: its name and its label (“Portal logins” → portal, login).
const fieldWords = (f) =>
  `${f.name} ${f.closest("label")?.querySelector("span")?.textContent || ""}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((w) => w.length > 3)
    .map((w) => w.replace(/s$/, ""));

// Flags `fields` (elements or names), else the fields the message names, else the empty
// required or invalid ones. Each shakes once and stays red until edited.
function flagFields(form, message = "", fields = null) {
  if (!form) return;
  const all = textFields(form);
  const text = message.toLowerCase();
  let hit = fields
    ? all.filter((f) => fields.includes(f) || fields.includes(f.name))
    : all.filter((f) => fieldWords(f).some((w) => text.includes(w)));
  if (!hit.length) hit = all.filter((f) => (f.required && !f.value.trim()) || !f.checkValidity());
  hit.forEach(shake);
  hit[0]?.focus();
}

function shake(f) {
  f.setAttribute("aria-invalid", "true");
  const box = f.closest(".key-input") || f;
  box.classList.remove("is-shaking");
  void box.offsetWidth; // restart on a repeat attempt
  box.classList.add("is-shaking");
}

let lastForm = null;
document.addEventListener("submit", (e) => (lastForm = e.target), true);
document.addEventListener("animationend", (e) => (e.target as any).classList?.remove("is-shaking"));
document.addEventListener("input", (e) => (e.target as any).removeAttribute?.("aria-invalid"));
document.addEventListener("change", (e) => (e.target as any).matches?.("select") && (e.target as any).removeAttribute("aria-invalid"));
document.addEventListener("invalid", (e) => shake(e.target), true);

/* ── Sign in ── */

// Signing in: a team member's email, then the code emailed to it; or, for the owner, the admin key.
function renderLogin(message = "", mode = "email") {
  document.body.classList.add("is-login");
  app.innerHTML = `
    <div class="login">
      <form class="login-card" data-login data-mode="${mode}">
        <span class="login-logo">${LOGO}</span>
        <h1>Back office</h1>
        ${
          mode === "key"
            ? `<label class="field"><span>Admin key</span>
          <span class="key-input">
            <input name="key" type="password" autocomplete="current-password" autocapitalize="off" spellcheck="false" required autofocus>
            <button type="button" class="icon-btn" data-reveal-key aria-label="Show key" aria-pressed="false">${icon("eye")}</button>
          </span>
        </label>`
            : `<label class="field"><span>Work email</span><input name="email" type="email" autocomplete="email" required autofocus></label>
        <label class="field" data-code-field hidden><span>Code</span><input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="\\d{6}"></label>`
        }
        <p class="form-error" role="alert">${esc(message)}</p>
        <button class="btn btn-primary btn-block" type="submit">${mode === "key" ? "Sign in" : "Email Me a Code"}</button>
        <button type="button" class="btn btn-ghost btn-block" data-login-mode="${mode === "key" ? "email" : "key"}">${mode === "key" ? "Sign In With Email" : "Use the Admin Key"}</button>
      </form>
    </div>`;
  $("[data-login-mode]").addEventListener("click", (e) => renderLogin("", (e.currentTarget as any).dataset.loginMode));
  $("[data-reveal-key]")?.addEventListener("click", (e) => {
    const button = e.currentTarget;
    const input = $("[data-login] input[name=key]");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    button.setAttribute("aria-pressed", String(show));
    button.setAttribute("aria-label", show ? "Hide key" : "Show key");
    button.innerHTML = icon(show ? "eyeOff" : "eye");
    input.focus();
  });
  $("[data-login]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const button = $("button[type=submit]", form);
    const error = $(".form-error", form);
    button.disabled = true;
    try {
      if (mode === "key") await api("/api/admin/login", { method: "POST", body: { key: form.key.value } });
      else if ($("[data-code-field]", form).hidden) {
        await api("/api/admin/login/code", { method: "POST", body: { email: form.email.value } });
        $("[data-code-field]", form).hidden = false;
        form.email.readOnly = true;
        form.code.required = true;
        form.code.focus();
        error.textContent = "";
        button.textContent = "Sign in";
        button.disabled = false;
        toast(`If ${form.email.value} is on the team, a code is on its way.`);
        return;
      } else await api("/api/admin/login/verify", { method: "POST", body: { email: form.email.value, code: form.code.value } });
      document.body.classList.remove("is-login");
      ME = null;
      route();
    } catch (err) {
      // Wrong key or code: keep what was typed, shake the box and select it for a retype.
      error.textContent = err.message;
      const field = mode === "key" ? "key" : $("[data-code-field]", form).hidden ? "email" : "code";
      flagFields(form, "", [field]);
      form[field].select();
      button.disabled = false;
    }
  });
}

/* ── Routing and loading ── */

// Addresses are paths: /admin/calendar/hap-…, /admin/orders/new. Older #calendar/… links (emails,
// printed return QR codes, bookmarks) still work: the hash wins and becomes the path.
const routeOf = () => (location.hash.length > 1 ? location.hash.replace(/^#\/?/, "") : location.pathname.replace(/^\/admin\/?/, "")).replace(/\/+$/, "");
const routeUrl = (to) => `/admin${String(to || "").replace(/^#\/?/, "").replace(/^\/?/, "/").replace(/\/$/, "")}`;
if (location.hash.length > 1) history.replaceState(null, "", routeUrl(location.hash) + location.search);

const orderInUrl = () => {
  const n = new URLSearchParams(location.search).get("order") || "";
  return /^MF-[A-Z0-9]{1,12}$/.test(n) ? n : null;
};
// Opening an order puts it in the address (a new history entry, so Back closes it); stepping to
// the next one replaces it. Closing takes it out again.
function orderToUrl(number) {
  if (orderInUrl() === number) return;
  const url = `${location.pathname}?order=${encodeURIComponent(number)}`;
  if (orderInUrl() && history.state?.order) history.replaceState({ order: number }, "", url);
  else history.pushState({ order: number }, "", url);
}
function orderOutOfUrl(replace = false) {
  if (!orderInUrl()) return;
  if (history.state?.order && !replace) history.back();
  else history.replaceState(null, "", location.pathname);
}

function readHash() {
  const [page, tab, id] = routeOf().split("/");
  state.page = PAGES.some((p) => p.id === page) && canOpen(page) ? page : myPages()[0]?.id || "overview";
  if (state.page === "orders") state.tab = TABS.some((t) => t.id === tab) ? tab : "new";
  // An open order is in the address (/admin/orders/new?order=MF-…): a copied link, a refresh or
  // Back opens it again.
  const linked = orderInUrl();
  if (linked) state.open = linked;
  if (state.page === "customers") state.customerFilter = tab === "all" || tab === "vip" ? tab : "active";
  if (state.page === "wholesale") state.sub = ["orders", "quotes", "accounts", "pricelists", "enquiries", "samples", "documents", "prospects"].includes(tab) ? tab : tab === "contracts" ? "documents" : "orders";
  if (state.page === "purchasing") state.sub = ["orders", "suppliers", "bills"].includes(tab) ? tab : "orders";
  if (state.page === "products") state.sub = ["foods", "teas", "stock", "bulk", "giftcards", "labels", "codes"].includes(tab) ? tab : "foods";
  if (state.page === "languages") state.sub = ["catalog", "corrected"].includes(tab) ? tab : "all";
  if (state.page === "salestax") state.sub = tab === "all" ? "all" : "active";
  if (state.page === "outbox") state.sub = tab === "failed" ? "failed" : "all";
  if (state.page === "careers") state.sub = ["applications", "page"].includes(tab) ? tab : "roles";
  if (state.page === "team") state.sub = tab === "activity" || ME?.role !== "owner" ? "activity" : "people";
  if (state.page === "ambassadors") state.sub = ["ambassadors", "settings"].includes(tab) ? tab : "applications";
  if (state.page === "reviews") state.sub = tab === "elsewhere" ? "elsewhere" : "site";
  if (state.page === "insights") state.sub = ["visibility", "mentions", "creators", "ideas", "prices", "settings"].includes(tab) ? tab : "visibility";
  if (state.page === "returns") state.returnCode = /^[\w-]{16}$/.test(tab || "") ? tab : null;
  if (state.page === "inbox") {
    state.convId = /^conv-[a-f0-9]{12}$/.test(tab || "") ? tab : null;
    state.sub = tab === "closed" || tab === "rated" ? tab : "open";
  }
  if (state.page === "notes") state.noteId = /^note-[a-f0-9]{10}$/.test(tab || "") ? tab : null;
  if (state.page === "calendar") state.calId = /^hap-[a-f0-9]{10}$/.test(tab || "") ? tab : null;
  if (state.page === "signups") {
    state.sub = tab === "newsletters" ? (id ? "edit" : "newsletters") : tab === "automations" ? (id ? "auto-edit" : "automations") : "subscribers";
    state.nlId = id || null;
  }
}

let shownHash = location.pathname;
// Moves to another page of the back office ("#calendar/hap-…" or "calendar/hap-…").
function go(to) {
  const url = routeUrl(to);
  if (url === location.pathname) return;
  history.pushState(null, "", url);
  navigated();
}
// Back and Forward: on the same page only the open order changes (?order=…), so open or close it
// without reloading the page; anywhere else is a new page.
window.addEventListener("popstate", () => {
  if (location.pathname === shownHash) {
    const linked = orderInUrl();
    if (linked) {
      if (linked !== state.open || $("[data-drawer]").hidden) {
        state.open = linked;
        $$("[data-row]").forEach((r) => r.classList.toggle("is-open", r.dataset.row === linked));
        openOrder(linked);
      }
    } else if (state.open || !$("[data-drawer]").hidden) closeDrawer({ fromHistory: true });
    return;
  }
  navigated();
});
window.addEventListener("hashchange", () => {
  history.replaceState(null, "", routeUrl(location.hash));
  navigated();
});
// A menu that opens (any <details> with a list under its button) stays on the screen: no wider
// than the screen, and moved in from whichever edge it would cross.
const keepOnScreen = (el) => {
  el.style.translate = "";
  el.style.maxWidth = `${window.innerWidth - 16}px`;
  const r = el.getBoundingClientRect();
  const shift = r.left < 8 ? 8 - r.left : r.right > window.innerWidth - 8 ? window.innerWidth - 8 - r.right : 0;
  if (shift) el.style.translate = `${Math.round(shift)}px 0`;
};
document.addEventListener(
  "toggle",
  (e) => {
    const d = e.target as HTMLDetailsElement;
    if (!(d instanceof HTMLDetailsElement) || !d.open) return;
    for (const el of d.children) if (el.tagName !== "SUMMARY" && ["absolute", "fixed"].includes(getComputedStyle(el).position)) keepOnScreen(el);
  },
  true
);
// Links written as href="#orders/new": followed as paths (a new tab or window gets the hash and
// lands on the same page).
document.addEventListener("click", (e) => {
  const a = (e.target as any).closest?.('a[href^="#"]');
  if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.getAttribute("href") === "#") return;
  e.preventDefault();
  go(a.getAttribute("href"));
});
function navigated() {
  // Unsaved edits: stay put unless they're happy to lose them.
  if (drawerDirty && !$("[data-drawer]").hidden && !confirm("Discard your changes?")) {
    history.replaceState(null, "", shownHash);
    return;
  }
  drawerDirty = false;
  shownHash = location.pathname;
  staffTyping(false); // left the conversation: the typing bubble goes
  skTuck(false); // a new page: the assistant bar is back
  state.editing = state.picked = state.replyTo = state.effect = state.attach = state.voice = state.pollOpen = null;
  stopVoice(false);
  state.query = "";
  state.orderLimit = state.trLimit = 0;
  state.returnConfirm = null;
  state.selected.clear();
  state.open = null;
  dropFreshDraft().then(route);
}

async function route() {
  // Counting ends when you go somewhere else.
  state.counting = null;
  try {
    ME ||= await api("/api/admin/me");
    readHash();
    await load();
    render();
    // A ⊕ in the sidebar: once its page is up, press its create button.
    if (state.pendingCreate) {
      const button = $(state.pendingCreate) as HTMLElement;
      state.pendingCreate = null;
      button?.click();
    }
    // Something picked in search: once its page is up, open it.
    if (state.pendingOpen) {
      const open = state.pendingOpen;
      state.pendingOpen = null;
      open();
    }
  } catch (error) {
    if (error.status === 401) return renderLogin();
    const offline = !navigator.onLine || error instanceof TypeError;
    app.innerHTML = `<div class="fatal"><div class="empty empty-lg">${icon(offline ? "syncError" : "syncError", "i i-xl")}<p><strong>${offline ? "You're offline" : "Something went wrong"}</strong></p><p class="muted">${offline ? "The back office needs a connection. It'll reload when you're back online." : esc(error.message)}</p><button class="btn" data-retry>Try again</button></div></div>`;
    $("[data-retry]", app).onclick = () => route();
    if (offline) $(".offline-bar")?.remove();
  }
}

async function load() {
  // Order counts feed the sidebar badges on every page.
  const data = await api(`/api/admin/orders?status=${state.page === "orders" ? state.tab : "new"}`);
  Object.assign(state, { counts: data.counts, inboxUnread: data.inboxUnread || 0, alerts: data.alerts || {}, shop: data.shop, carriers: data.carriers });
  if (state.page === "orders") {
    state.orders = data.orders;
    state.selected = new Set([...state.selected].filter((n) => data.orders.some((o) => o.number === n)));
  }
  if (state.page === "overview") state.overview = await api(`/api/admin/overview?tz=${new Date().getTimezoneOffset()}`);
  if (state.page === "subscriptions") state.subs = (await api("/api/admin/subscriptions")).subscriptions;
  if (state.page === "wholesale" || state.page === "purchasing") state.trade = await api("/api/admin/trade");
  if (state.page === "purchasing") state.green = await api("/api/admin/green");
  if (state.page === "purchasing") state.bills = await api("/api/admin/bills");
  if (state.page === "roasting") state.roast = await api("/api/admin/roasting");
  if (state.page === "todos" || (sidePane() && !state.todos)) state.todos = await api("/api/admin/todos").catch(() => state.todos);
  if (state.page === "outbox") state.outbox = await api("/api/admin/outbox");
  if (state.page === "imports") {
    state.imports = await api("/api/admin/imports");
    // What a draft is matched against (when this person can see it).
    if (canOpen("wholesale") || canOpen("purchasing")) state.trade = await api("/api/admin/trade").catch(() => state.trade);
    if (canOpen("purchasing")) state.green = await api("/api/admin/green").catch(() => state.green);
  }
  if (state.page === "wholesale" && state.sub === "prospects") state.pros = await api("/api/admin/prospects");
  if (state.page === "wholesale" && state.sub === "documents") {
    state.contracts = await api("/api/admin/trade/contracts");
    if (state.contracts.usign?.connected) state.usignTemplates = await api("/api/admin/trade/contracts/usign-templates").then((r) => r.templates).catch(() => state.usignTemplates || null);
  }
  if (state.page === "languages") state.tr = await api("/api/admin/translations");
  if (state.page === "business") state.biz = await api("/api/admin/business");
  if (state.page === "salestax") state.tax = await api("/api/admin/sales-tax");
  if (state.page === "calls") {
    state.calls = await api("/api/admin/calls");
    // Back from connecting Google Meet or Zoom: say how it went, then tidy the address.
    const said = new URLSearchParams(location.search).get("video");
    if (said) {
      history.replaceState(null, "", location.pathname);
      setTimeout(() => toast(said === "connected" ? `${state.calls.video?.connected?.name || "Video calls"} connected.` : said, said === "connected" ? "" : "error"), 0);
    }
  }
  if (state.page === "helpdocs") state.helpEdit = await api("/api/admin/help-docs");
  if (state.page === "careers") state.careers = await api("/api/admin/careers");
  if (state.page === "team") {
    state.activity = await api(`/api/admin/activity${state.activityWho ? `?who=${encodeURIComponent(state.activityWho)}` : ""}`);
    if (ME.role === "owner") state.team = await api("/api/admin/staff");
  }
  if (state.page === "ambassadors") state.amb = await api("/api/admin/ambassadors");
  if (state.page === "insights") state.insights = await api("/api/admin/insights");
  if (state.page === "carts") state.carts = await api("/api/admin/carts");
  if (state.page === "reviews") state.reviews = (await api("/api/admin/reviews")).reviews;
  if (state.page === "reviews" && state.sub === "elsewhere") state.insights = await api("/api/admin/insights");
  if (state.page === "returns") await loadReturns();
  if (state.page === "assistant") state.assist = await api("/api/admin/assistant/settings");
  if (state.page === "inbox") {
    if (state.convId) {
      const detail = await api(`/api/admin/inbox/${state.convId}`);
      if (detail.conversation.id !== state.conv?.conversation.id) state.draft = "";
      state.conv = detail;
      state.sub = detail.conversation.status === "closed" ? "closed" : "open";
    } else state.conv = null;
    state.inbox = await api(inboxUrl());
    state.inboxUnread = state.inbox.counts.unread;
  }
  if (state.page === "calendar") {
    state.calInfo = await api("/api/admin/calendar");
    const found = state.calId && state.calInfo.items.find((x) => x.id === state.calId);
    state.cal = found ? structuredClone(found) : null;
  }
  if (state.page === "notes") {
    state.notesInfo = await api("/api/admin/notes");
    state.note = state.noteId ? structuredClone((await api(`/api/admin/notes/${state.noteId}`)).note) : null;
  }
  if (state.page === "signups") {
    state.nlInfo = await api("/api/admin/newsletters");
    if (state.sub === "subscribers") state.signups = (await api("/api/admin/signups")).signups;
    if (state.sub === "edit") state.nl = structuredClone((await api(`/api/admin/newsletters/${state.nlId}`)).newsletter);
    if (state.sub === "automations" || state.sub === "auto-edit") state.autos = await api("/api/admin/automations");
    // An automated email opens in the newsletter editor, marked so it saves, previews and tests as one.
    if (state.sub === "auto-edit") {
      const a = state.autos.automations.find((x) => x.id === state.nlId);
      if (!a) return (go("#signups/automations"));
      state.nl = { ...structuredClone(a), auto: true, status: "draft" };
    }
  }
  if (state.page === "products") {
    const [cat, promo, stock] = await Promise.all([api("/api/admin/catalog"), api("/api/admin/promos"), api("/api/admin/stock")]);
    state.catalog = cat.catalog;
    state.roastCosts = cat.roastCosts || {};
    state.suppliers = cat.suppliers;
    state.google = cat.google;
    state.promos = promo.promos;
    state.stock = stock.stock;
    // Gift cards: their balances come from Square, so only when the tab is open.
    if (state.sub === "giftcards") state.giftCards = await api("/api/admin/gift-cards");
  }
  if (state.page === "menu") ({ menu: state.menu, square: state.square, cafesLive: state.cafesLive } = await api("/api/admin/menu"));
  if (state.page === "customers") state.customers = (await api("/api/admin/customers")).customers;
}

const refresh = async () => {
  await load();
  render();
};

/* ── Shell ── */

// Phone cards: each cell of a labelled table carries its column's name (shown by admin.css).
function labelTables(root) {
  for (const table of $$("table.is-labelled", root)) {
    const heads = $$("thead th", table).map((th) => th.textContent.trim());
    for (const tr of $$("tbody tr", table)) [...tr.children].forEach((td, i) => heads[i] && (td.dataset.col = heads[i]));
  }
}

function render() {
  const page = PAGES.find((p) => p.id === state.page);
  if (!isConfig()) configBack = `#${routeOf()}`;
  // Red: something waiting on someone. Blue: a plain count (orders to pack).
  const badge = { orders: state.counts.new || 0, inbox: state.inboxUnread || 0, ...(state.alerts || {}) };
  const views = { imports: importsView, outbox: outboxView, todos: todosView, roasting: roastingView, carts: cartsView, team: teamView, business: businessView, insights: insightsPageView, returns: returnsView, reviews: reviewsView, salestax: salesTaxView, calls: callsView, helpdocs: helpDocsView, careers: careersView, ambassadors: ambassadorsView, languages: languagesView, overview: overviewView, orders: ordersView, subscriptions: subscriptionsView, customers: customersView, wholesale: wholesaleView, purchasing: purchasingView, signups: signupsView, products: productsView, menu: menuView, assistant: assistantView, notes: () => (state.note ? noteEditor() : notesView()), calendar: () => (state.cal ? calendarEditor() : calendarView()), inbox: () => `<div class="inbox-split${state.conv ? " has-conv" : ""}"><div class="inbox-split-list">${inboxView()}</div>${state.conv ? conversationView() : `<div class="card inbox-pane-empty">${icon("inbox", "i i-xl")}<p><strong>${state.inbox?.conversations.length ? "Pick a conversation" : "All caught up"}</strong></p></div>`}</div>` };
  const scrollY = window.scrollY;
  app.innerHTML = `
    <div class="shell">
      <aside class="side${sidePane() ? " has-pane" : ""}" data-side>
        <a class="brand" href="#overview">
          <span class="brand-logo">${LOGO}</span>
          <span><strong>${esc(state.shop.name)}</strong></span>
        </a>
        <details class="brand-menu order-menu">
          <summary class="brand"><span class="brand-logo">${LOGO}</span><span><strong>${esc(state.shop.name)}</strong></span>${icon("ChevronDown", "i brand-chev")}</summary>
          <div class="order-menu-list brand-list">
            ${ME ? `<p class="brand-who"><span class="brand-avatar" aria-hidden="true">${esc(initials(ME.name || "Owner"))}</span><span><strong>${esc(ME.name || "Owner")}</strong>${ME.email ? `<small>${esc(ME.email)}</small>` : ""}</span></p>` : ""}
            ${configPages().length ? `<button type="button" data-config-open>${icon("settings")}<span>Configure</span></button>` : ""}
            <div class="brand-themes">${[["light", "Sun", "Light", false], ["dark", "Moon", "Dark", true], ["system", "Monitor", "System", true]].map(([id, ic, label, beta]) => `<button type="button" data-theme-pick="${id}" aria-pressed="${themeChoice() === id}">${icon(ic)}<span>${label}</span>${beta ? `<em class="beta">Beta</em>` : ""}</button>`).join("")}</div>
            <a href="/" target="_blank" rel="noopener">${icon("site")}<span>View Site</span></a>
            <button type="button" class="install-app" data-install>${icon("download")}<span>Install App</span></button>
            <button type="button" class="brand-out" data-logout>${icon("logout")}<span>Log out</span></button>
          </div>
        </details>
        <button type="button" class="side-search" data-quick-open aria-label="Search, take action, or ask" aria-keyshortcuts="/">${icon("search")}<span>Search</span><kbd>/</kbd></button>
        <button type="button" class="side-toggle" data-side-toggle aria-label="Menu" aria-expanded="false">${icon("menu")}</button>
        <nav class="side-nav" aria-label="Sections">
          ${sideNav(badge)}
        </nav>
        ${sidePane() ? sidePaneHtml() : ""}
        <div class="side-ask">
          <button type="button" class="side-ask-box" data-quick-open data-tip="Search, take action, or ask for help" aria-keyshortcuts="Control+K">${icon("help")}<span>Ask anything…</span></button>
          ${canOpen("assistant") ? `<button type="button" class="icon-btn side-ask-chat" data-sk-open aria-label="Open chat" aria-keyshortcuts="Control+J">${icon("chat")}</button>` : ""}
          ${configPages().length ? `<button type="button" class="icon-btn side-ask-gear${isConfig() ? " is-on" : ""}" data-config-open aria-label="Configure">${icon("settings")}</button>` : ""}
        </div>
        <div class="side-foot">
          <a href="/" target="_blank" rel="noopener"><span>View site</span></a>
          <button type="button" class="install-app" data-install><span>Install app</span></button>
          ${ME && !ME.viaKey ? `<span class="side-who">${esc(ME.name)}<small>${esc(ME.roleLabel)}</small></span>` : ""}
          <button type="button" data-logout><span>Sign out</span></button>
        </div>
      </aside>

      <button type="button" class="side-edge" data-side-edge data-tip="${sideShut() ? "Open the sidebar" : "Drag to resize\nClick to close"}" aria-label="${sideShut() ? "Open the sidebar" : "Close the sidebar"}"><span>${icon(sideShut() ? "ChevronRight" : "ChevronLeft")}</span></button>
      <main class="main${isConfig() ? " is-config" : ""}">
        <header class="page-head${state.page === "inbox" && state.conv ? " is-detail" : ""}">
          <div>
            <div class="page-title-row">${isConfig() ? `<span class="crumb">Configure</span>${icon("ChevronRight", "i crumb-i")}` : ""}<h1 data-page-title${headTitle(subLabel(page)) !== subLabel(page) || page.id === "overview" ? ' class="is-as-written"' : ""}>${esc(headTitle(subLabel(page)))}</h1>${headFilters() ? `<span class="head-divider" aria-hidden="true"></span>${headFilters()}` : ""}</div>
            ${subtitle() ? `<p>${esc(subtitle())}</p>` : ""}
          </div>
          <div class="page-actions">${pageActions()}</div>
        </header>
        ${isConfig() ? `<div class="cfg-title"><h2>${esc(page.label)}</h2><p>${esc(CONFIG_LINE[state.page] || "")}</p></div>` : ""}
        ${views[state.page]()}
      </main>
    </div>
    ${tabBar(badge)}
    <div class="scrim" data-scrim ${state.open ? "" : "hidden"}></div>
    <aside class="drawer" data-drawer ${state.open ? "" : "hidden"} aria-label="Order details"></aside>
    ${state.page === "orders" && state.selected.size ? bulkBar() : ""}
    <div data-sk>${canOpen("assistant") ? sidekickHtml() : ""}</div>`;
  skBodyClasses();
  applySide();
  labelTables(app);
  framePage(app);
  const selectAll = $("[data-select-all]", app);
  if (selectAll) {
    const boxes = $$("[data-select]", app);
    const ticked = boxes.filter((c) => c.checked).length;
    selectAll.checked = ticked > 0 && ticked === boxes.length;
    selectAll.indeterminate = ticked > 0 && ticked < boxes.length;
  }
  // Under a list you can tick, how many are ticked (Peasy's "0 of 0 selected").
  if (selectAll) selectAll.closest(".table-card")?.insertAdjacentHTML("afterend", `<p class="sel-foot">${$$("[data-select]:checked", app).length} of ${$$("[data-select]", app).length} selected</p>`);
  window.scrollTo(0, scrollY);
  if (state.open) openOrder(state.open);
  if (state.page === "wholesale" && state.openAccount) {
    const acct = state.trade?.accounts.find((a) => a.id === state.openAccount);
    state.openAccount = null;
    if (acct) accountForm(acct);
  }
  if (state.page === "overview") drawChart();
  if (state.page === "products" && quickProduct && state.catalog) {
    const { id, kind } = quickProduct;
    quickProduct = null;
    if (kind === "tea") teaForm(state.catalog.teas.find((x) => x.id === id));
    else productForm(state.catalog.products.find((x) => x.id === id));
  }
  if (state.page === "languages") growAreas($$("[data-tr-field]", app));
  if (state.page === "signups" && (state.sub === "edit" || state.sub === "auto-edit")) {
    nlPreview();
    watchSending();
  }
  if (state.page === "notes" && state.note) notePreview();
  if (state.page === "inbox") inboxTick();
  if (state.page === "inbox" && !inboxLive) inboxWatch();
  pollResearch();
  if (state.page !== "inbox" && inboxLive) {
    clearInterval(inboxLive);
    inboxLive = 0;
    inboxStream?.close();
    inboxStream = null;
  }
  updateBadge();
  syncPresence();
}

// Newsletter: the mailing address for every newsletter's footer.
app.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-nl-address]");
  if (!form) return;
  e.preventDefault();
  try {
    state.nlInfo = await api("/api/admin/newsletters/settings", { method: "PATCH", body: { mailingAddress: form.mailingAddress.value } });
    toast("Mailing address saved.");
    render();
  } catch (error) {
    toast(error.message, "error");
  }
});

// Phones: the back office on the go is four things along the bottom (what needs you, orders,
// messages, to-dos), and More (every other section, as a full-screen menu).
const TAB_PAGES = ["overview", "orders", "inbox", "todos"];
/* ── Sidebar: the top pages, then groups that fold (Peasy's). A folded group shows a red dot
   when something inside waits on someone; hovering a group shows a ⊕ to create its main thing.
   Which groups are open is remembered on this device; the current page's group always is. ── */

// The ⊕ beside a group: what it makes, the page that makes it, and the button there.
const GROUP_CREATE = {
  Sell: { tip: "Create an order for a customer", page: "orders", button: '[data-form="wholesale-order"]' },
  Wholesale: { tip: "Add a wholesale account", page: "wholesale/accounts", button: '[data-form="account"]' },
  Buy: { tip: "Start a purchase order", page: "purchasing/orders", button: '[data-form="po"]' },
};
const GROUP_ICON = { Sell: "Handshake", Wholesale: "wholesale", Make: "Hammer", Buy: "CreditCard", Marketing: "Megaphone", Business: "building" };
// Pages that hold different kinds of records are a sidebar page each (Peasy's), not tabs:
// [sub, label, icon, the page's count shown here].
const SUB_NAV = {
  wholesale: [["accounts", "Accounts", "building"], ["pricelists", "Price Lists", "Tags"], ["orders", "Wholesale Orders", "orders"], ["quotes", "Quotes", "quote"], ["enquiries", "Inquiries", "imessage"], ["samples", "Samples", "FlaskConical"], ["documents", "Documents", "doc"]],
  purchasing: [["orders", "Purchase Orders", "doc"], ["bills", "Bills", "receipt", true], ["suppliers", "Suppliers", "building"]],
};
const subLabel = (page) => (page.id === "overview" ? greeting() : SUB_NAV[page.id]?.find(([sub]) => sub === state.sub)?.[1] || page.label);
const sideOpen = () => {
  try {
    return new Set(JSON.parse(localStorage.getItem("bo-side-open") || "[]"));
  } catch {
    return new Set();
  }
};
function configNav() {
  const link = (p) => `<a href="#${p.id}" class="${p.id === state.page ? "is-active" : ""}" ${p.id === state.page ? 'aria-current="page"' : ""}>${icon(p.icon, "i side-i")}<span>${p.label}</span></a>`;
  return `<div class="config-head"><button type="button" class="icon-btn" data-config-back aria-label="Back">${icon("ArrowLeft")}</button><strong>Configure</strong></div>
    ${CONFIG_NAV.map(([g, ids]) => {
      const list = configPages().filter((p) => ids.includes(p.id));
      return list.length ? `<div class="config-sect"><p>${g}</p>${list.map(link).join("")}</div>` : "";
    }).join("")}`;
}
/* The sidebar's edge on a computer (Peasy's): drag it to make the sidebar wider or narrower, click
   it to close the sidebar, click again to open it. Remembered on this device. */
const sideStore = (k, v = undefined) => {
  try {
    if (v === undefined) return localStorage.getItem(k);
    localStorage.setItem(k, v);
  } catch {}
  return null;
};
const sideShut = () => sideStore("bo-side-shut") === "1";
const sideWidth = () => Math.min(380, Math.max(200, Number(sideStore("bo-side-w")) || 248));
function applySide() {
  // Closed, it's a rail of icons (Peasy's): each group's pages open beside it on hover.
  document.documentElement.style.setProperty("--md-sidebar-width", sideShut() ? "56px" : `${sideWidth()}px`);
  document.body.classList.toggle("side-shut", sideShut());
}
document.addEventListener("pointerdown", (e) => {
  const edge = (e.target as HTMLElement).closest?.("[data-side-edge]") as HTMLElement;
  if (!edge || e.button !== 0) return;
  e.preventDefault();
  const x0 = e.clientX;
  const w0 = sideShut() ? 56 : sideWidth();
  let moved = false;
  edge.setPointerCapture(e.pointerId);
  edge.onpointermove = (m) => {
    if (!moved && Math.abs(m.clientX - x0) < 4) return;
    moved = true;
    hideTip();
    const w = Math.min(380, Math.max(200, w0 + m.clientX - x0));
    sideStore("bo-side-w", String(Math.round(w)));
    sideStore("bo-side-shut", "0");
    applySide();
  };
  edge.onpointerup = () => {
    edge.onpointermove = edge.onpointerup = null;
    if (!moved) sideStore("bo-side-shut", sideShut() ? "0" : "1");
    hideTip();
    render();
  };
});
/* To-Dos in the sidebar (Peasy's): the sidebar swaps to the open to-dos, with a way back, while
   the page stays beside it. Computer only; remembered on this device. */
const sidePane = () => sideStore("bo-side-pane") === "todos" && canOpen("todos");
function sidePaneHtml() {
  const v = state.todos;
  const list = v ? v.todos.filter((x) => x.status === "open" && !(x.snoozedUntil > v.today)).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999")).slice(0, 40) : null;
  return `<div class="side-pane">
    <button type="button" class="side-pane-back" data-side-pane="">${icon("back")}<span>Back to app</span></button>
    <div class="side-pane-head"><strong>To-Dos</strong><a class="icon-btn" href="#todos" aria-label="Open the To-Dos page">${icon("Maximize2")}</a></div>
    ${
      !list
        ? `<p class="muted side-pane-none">Loading…</p>`
        : list.length
          ? `<ul class="td-list side-td">${list
              .map((x) => `<li class="td-row" data-todo="${esc(x.id)}"><button type="button" class="td-check" data-todo-done aria-label="Mark done" aria-pressed="false"></button><span class="td-main"><strong>${esc(x.title)}</strong>${x.due ? `<small class="${x.due < v.today ? "is-late" : ""}">${esc(dueText(x.due, v.today))}</small>` : ""}</span></li>`)
              .join("")}</ul>`
          : `<p class="muted side-pane-none">No items need attention right now.</p>`
    }
  </div>`;
}
// Light, Dark or System (Peasy's account menu); admin.html applies it before the page draws.
const themeChoice = () => sideStore("bo-theme") || "light";
function applyTheme() {
  const t = themeChoice();
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
}
matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", applyTheme);
document.addEventListener("click", (e) => {
  const pick = (e.target as HTMLElement).closest?.("[data-theme-pick]") as HTMLElement;
  if (!pick) return;
  sideStore("bo-theme", pick.dataset.themePick);
  applyTheme();
  for (const b of $$("[data-theme-pick]")) b.setAttribute("aria-pressed", String(b === pick));
});
function sideNav(badge) {
  if (isConfig()) return configNav();
  const pages = myPages().filter((p) => !isConfig(p.id));
  const open = sideOpen();
  const count = (id) => (badge[id] ? `<b class="count${ALERT_PAGES.includes(id) ? " is-alert" : ""}">${badge[id]}</b>` : "");
  const link = (p) =>
    SUB_NAV[p.id]
      ? SUB_NAV[p.id]
          .map(([sub, label, ic, counted]) => {
            const on = p.id === state.page && state.sub === sub;
            return `<a href="#${p.id}/${sub}" class="${on ? "is-active" : ""}" ${on ? 'aria-current="page"' : ""}>${icon(ic, "i side-i")}<span>${label}</span>${counted ? count(p.id) : ""}</a>`;
          })
          .join("")
      : `${p.id === "todos" ? `<span class="side-row">` : ""}<a href="#${p.id}" class="${[p.id === state.page ? "is-active" : "", TAB_PAGES.includes(p.id) ? "in-tabbar" : ""].filter(Boolean).join(" ")}" ${p.id === state.page ? 'aria-current="page"' : ""}>
    ${icon(p.icon, "i side-i")}<span>${p.label}</span>${count(p.id)}</a>${p.id === "todos" ? `<button type="button" class="icon-btn side-pin" data-side-pane="todos" aria-label="Open To-Dos in the sidebar">${icon("ArrowLeftToLine")}</button></span>` : ""}`;
  const groups = [...new Set(pages.map((p) => p.group).filter(Boolean))];
  return `${pages.filter((p) => !p.group).map(link).join("")}
    ${groups
      .map((g) => {
        const list = pages.filter((p) => p.group === g);
        const here = list.some((p) => p.id === state.page);
        const isOpen = here || open.has(g);
        const waiting = list.some((p) => ALERT_PAGES.includes(p.id) && badge[p.id]);
        const make = GROUP_CREATE[g] && canOpen(GROUP_CREATE[g].page.split("/")[0]) ? GROUP_CREATE[g] : null;
        return `<div class="side-sect${isOpen ? " is-open" : ""}" data-side-sect="${esc(g)}">
          <div class="side-sect-head">
            <button type="button" class="side-group" data-side-group="${esc(g)}" aria-expanded="${isOpen}">${icon(GROUP_ICON[g] || "file", "i side-i")}<span>${g}</span>${waiting && !isOpen ? `<i class="side-dot" aria-label="Something here needs you"></i>` : ""}${icon("ChevronDown", "i side-chev")}</button>
            ${make ? `<button type="button" class="side-plus" data-group-create="${esc(g)}" aria-label="${esc(make.tip)}">${icon("plus")}</button>` : ""}
          </div>
          <div class="side-sub"><p class="side-sub-title">${g}</p>${list.map(link).join("")}</div>
        </div>`;
      })
      .join("")}
    ${configPages().length ? `<a href="#${configPages()[0].id}" class="side-config-link">${icon("settings", "i side-i")}<span>Configure</span></a>` : ""}`;
}

// Pages whose count is something waiting on someone (red); the rest are plain counts.
const ALERT_PAGES = ["inbox", "todos", "imports", "outbox", "purchasing"];

function tabBar(badge) {
  const tab = (id) => {
    const p = PAGES.find((x) => x.id === id);
    const on = state.page === id;
    const count = badge[id] ? `<b class="count${ALERT_PAGES.includes(id) ? " is-alert" : ""}">${badge[id]}</b>` : "";
    // The assistant opens over the page you're on (its own page is in More).
    if (id === "assistant") return `<button type="button" data-sk-open>${icon(p.icon)}<span>${p.label}</span></button>`;
    return `<a href="#${id}" class="${on ? "is-active" : ""}" ${on ? 'aria-current="page"' : ""}>${icon(p.icon)}${count}<span>${p.label}</span></a>`;
  };
  return `<nav class="tabbar" aria-label="Main sections">
    ${TAB_PAGES.filter(canOpen).map(tab).join("")}
    <button type="button" data-side-toggle aria-expanded="false" class="${TAB_PAGES.includes(state.page) ? "" : "is-active"}">${icon("menu")}<span>More</span></button>
  </nav>`;
}

// The Filter menu's settings on each page, for Reset Filters.
const FILTER_KEYS = { orders: ["orderChannel", "orderLeaves"], todos: ["todoFor", "todoAbout"], outbox: ["mailKind"] };
document.addEventListener("click", (e) => {
  if (!(e.target as HTMLElement).closest?.("[data-filters-reset]")) return;
  for (const k of FILTER_KEYS[state.page] || []) state[k] = "";
  render();
});
// Every page gets the same frame (Peasy's): the title with the page's filters beside it, then a
// toolbar with the search on the left and the actions on the right. Pages that build their own
// (Orders, To-dos, Outbox) are left alone; the rest are arranged here from what they render.
function framePage(app) {
  const main = $(".main", app);
  const head = $(".page-head", main);
  if (!head || head.classList.contains("is-detail")) return;
  const row = $(".page-title-row", head);
  if (!$(".chips", row)) {
    // The first filter strip at the top of the page, above its content (number cards may come first).
    const lead = [...main.children].find((el) => el !== head && !el.matches(".stats, .market-card"));
    if (lead?.matches("nav.chips")) row.append(Object.assign(document.createElement("span"), { className: "head-divider" }), lead);
  }
  // A search that found nothing offers to clear it.
  const none = $(".main .empty-lg", app);
  // Nothing found with a search or filters on: Peasy's "No results…", Clear Search and Reset Filters.
  const filtered = (FILTER_KEYS[state.page] || []).some((k) => state[k]);
  if (none && (state.query.trim() || filtered)) {
    const title = $("strong", none);
    if (title) title.textContent = "No results match your search and filters";
    $(".empty-line", none)?.remove();
    for (const b of $$(".btn, .empty-help", none)) b.remove();
    $("p:has(strong)", none)?.insertAdjacentHTML("afterend", `<p class="muted empty-line">${filtered ? "Try a different search, or reset your filters." : "Try a different search."}</p>`);
    none.insertAdjacentHTML("beforeend", `<div class="btn-row">${state.query.trim() ? `<button type="button" class="btn" data-search-clear>Clear Search</button>` : ""}${filtered ? `<button type="button" class="btn" data-filters-reset>${icon("filter")}<span>Reset Filters</span></button>` : ""}</div>`);
  }
  // An empty page offers to explain itself (Peasy's "Tell me how … works"), below its own buttons.
  const what = headTitle(subLabel(PAGES.find((p) => p.id === state.page))).toLowerCase();
  // Under its title, Peasy's short line: what to add, or what will show up here.
  if (none && !state.query.trim() && !filtered && state.page !== "overview" && !$(".empty-line", none))
    $("p:has(strong)", none)?.insertAdjacentHTML("afterend", `<p class="muted empty-line">${$(".btn-primary", none) ? `Add your ${esc(what)} to get going.` : `Your ${esc(what)} will show up here.`}</p>`);
  if (none && !state.query.trim() && !filtered && canOpen("assistant") && state.page !== "overview")
    none.insertAdjacentHTML("beforeend", `<button type="button" class="btn empty-help" data-help-ask="How do ${esc(what)} work here?">${icon("CircleHelp")}<span>Tell me how ${esc(what)} work</span></button>`);
  const search = $(".page-actions > .search", head);
  if (search && !$(".main > .toolbar", app)) {
    const bar = document.createElement("div");
    bar.className = "toolbar";
    bar.innerHTML = `<div class="toolbar-side"></div><div class="toolbar-side"></div>`;
    // Orders' order: Filter and Sort, then the search; the page's actions on the right.
    bar.firstElementChild.append(...$$(".page-actions > .tb-menu", head), search);
    bar.lastElementChild.append(...$(".page-actions", head).children);
    head.after(bar);
  }
}

// Quick filters beside the page's title (Peasy's top strip), for pages that have them.
const headFilters = () => (state.page === "todos" ? todoHeadFilters() : state.page === "orders" ? orderHeadFilters() : state.page === "outbox" ? outboxHeadFilters() : state.page === "inbox" ? inboxHeadFilters() : "");

// Only the overview needs a line under its title: the date that "today" refers to.
function subtitle() {
  return state.page === "overview" ? new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "";
}

// Whether a row has every word typed in the page's search (in any of its fields).
const matches = (q, ...fields) => {
  const words = String(q || "").toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const all = fields.filter((x) => x != null).join(" ").toLowerCase();
  return words.every((w) => all.includes(w));
};
const searchBox = (placeholder) =>
  `<label class="search">${icon("search")}<input type="search" placeholder="${placeholder}" value="${esc(state.query)}" data-search aria-label="${placeholder}">${state.query ? `<button type="button" class="search-clear" data-search-clear aria-label="Clear search">${icon("close")}</button>` : ""}</label>`;

// Filter chips: a dot in the status's color, the name and how many. A chip is a link (href) or
// a button (filter: "returns:open").
const chips = (label, items, kind = "") =>
  `<nav class="chips${kind ? ` ${kind}` : ""}" aria-label="${label}">${items
    .map((c) => {
      const inner = `<i></i><span>${c.label}</span>${c.count !== "" && c.count != null ? `<b>${c.count}</b>` : ""}`;
      const cls = `chip${c.tone ? ` ${c.tone}` : ""}${c.on ? " is-active" : ""}`;
      return c.href ? `<a href="${c.href}" class="${cls}" ${c.on ? 'aria-current="page"' : ""}>${inner}</a>` : `<button type="button" class="${cls}" data-chip="${c.filter}" aria-pressed="${Boolean(c.on)}">${inner}</button>`;
    })
    .join("")}</nav>`;

// Peasy's split New button: the main button, and joined to it an icon that makes the same thing
// from a document instead (Imports).
const splitNew = (main) => `<span class="btn-split">${main}<button type="button" class="btn btn-primary" data-goto-imports aria-label="Import a document">${icon("upload")}</button></span>`;
function pageActions() {
  if (state.page === "overview") return `<button type="button" class="btn" data-ov-manage>${icon("LayoutGrid")}<span>Manage Cards</span></button>`;
  if (state.page === "assistant") {
    return `${assistChat.length ? `<button type="button" class="btn" data-assist-clear>${icon("edit")}<span>New Chat</span></button>` : ""}<button type="button" class="btn btn-ghost${assistSettings ? " is-on" : ""}" data-assist-settings aria-pressed="${assistSettings}">${icon("settings")}<span>Settings</span></button>`;
  }
  // (On a phone, Export and Import show just their icon, beside the search.)
  const exportLink = (href, label) => `<a class="btn is-compact" href="${href}" download aria-label="${label}" title="${label}">${icon("download")}<span>${label}</span></a>`;
  if (state.page === "orders") return "";
  if (state.page === "subscriptions") return `${searchBox("Search subscriptions")}${exportLink("/admin/subscriptions.csv", "Export")}`;
  if (state.page === "wholesale" && state.sub === "accounts") return `${sortFor("accountSort")}${searchBox("Search accounts")}<button type="button" class="btn btn-primary" data-form="account">${icon("plus")}<span>New Account</span></button>`;
  if (state.page === "wholesale" && state.sub === "documents") return `${searchBox("Search documents")}<button type="button" class="btn" data-ag-edit>${icon("edit")}<span>Edit Agreement</span></button><button type="button" class="btn btn-primary" data-doc-new>${icon("plus")}<span>New Document</span></button>`;
  if (state.page === "wholesale" && state.sub === "pricelists") return `<button type="button" class="btn btn-primary" data-pricelist-new>${icon("plus")}<span>New Price List</span></button>`;
  if (state.page === "wholesale" && state.sub === "orders") return splitNew(`<button type="button" class="btn btn-primary" data-form="wholesale-order">${icon("plus")}<span>New Order</span></button>`);
  if (state.page === "careers") return `<button type="button" class="btn btn-primary" data-form="role">${icon("plus")}<span>New Role</span></button>`;
  if (state.page === "purchasing" && state.sub === "bills") return searchBox("Search bills") + splitNew(`<button type="button" class="btn btn-primary" data-bill-new>${icon("plus")}<span>New Bill</span></button>`);
  if (state.page === "purchasing" && state.sub === "stock") {
    const n = (state.green?.cart || []).filter((l) => !l.later).length;
    if (state.counting) return `<button type="button" class="btn" data-count-cancel>Cancel</button>`;
    // On a phone, Cart stays and the rest fold into a ⋯ menu.
    return `${sortFor("greenSort")}${searchBox("Search green coffee")}<button type="button" class="btn on-wide" data-stock-log="green">${icon("file")}<span>Log</span></button><button type="button" class="btn on-wide" data-count-start="green">${icon("edit")}<span>Count</span></button><button type="button" class="btn on-wide" data-green-new>${icon("plus")}<span>New Ingredient</span></button>
      <details class="order-menu on-narrow"><summary class="btn" aria-label="More">${icon("more")}</summary><div class="order-menu-list">
        <button type="button" data-green-new>${icon("plus")}<span>New Ingredient</span></button><button type="button" data-count-start="green">${icon("edit")}<span>Count</span></button><button type="button" data-stock-log="green">${icon("file")}<span>Log</span></button>
      </div></details>
      <button type="button" class="btn btn-primary" data-green-cart>${icon("cart")}<span>Cart${n ? ` (${n})` : ""}</span></button>`;
  }
  if (state.page === "outbox") return "";
  if (state.page === "todos") return "";
  if (state.page === "roasting") return `<button type="button" class="btn btn-primary" data-roast-plan>${icon("plus")}<span>Plan Roast</span></button>`;
  if (state.page === "purchasing" && state.sub === "samples") return `${sortFor("sampleSort")}<button type="button" class="btn btn-primary" data-sample-new>${icon("plus")}<span>Request Sample</span></button>`;
  if (state.page === "purchasing" && state.sub === "suppliers") return `<button type="button" class="btn btn-primary" data-form="supplier">${icon("plus")}<span>New Supplier</span></button>`;
  if (state.page === "purchasing" && state.sub === "orders") return sortFor("poSort") + searchBox("Search purchase orders") + splitNew(`<button type="button" class="btn btn-primary" data-form="po">${icon("plus")}<span>New Purchase Order</span></button>`);
  if (state.page === "inbox" && state.inbox) {
    const away = state.inbox.away;
    return `${state.conv ? "" : `<button type="button" class="btn" data-form="announce">${icon("send")}<span>New Announcement</span></button><button type="button" class="btn btn-primary" data-form="new-email">${icon("edit")}<span>New Email</span></button>`}<button type="button" class="btn${away ? "" : " btn-ghost"}" data-chat-away="${away ? "off" : "on"}" title="${away ? "Away" : "Online while the back office is open"}"><i class="presence${away ? "" : " is-on"}" aria-hidden="true"></i><span>${away ? "Away" : "Available"}</span></button>`;
  }
  if (state.page === "notes" && !state.note) return `<button type="button" class="btn btn-primary" data-note-new>${icon("plus")}<span>New Post</span></button>`;
  if (state.page === "calendar" && !state.cal) return `<button type="button" class="btn" data-cal-new="class">${icon("plus")}<span>New Class</span></button><button type="button" class="btn btn-primary" data-cal-new="event">${icon("plus")}<span>New Event</span></button>`;
  if (state.page === "signups") {
    if (state.sub === "newsletters") return `<button type="button" class="btn btn-primary" data-nl-new>${icon("plus")}<span>New Newsletter</span></button>`;
    if (state.sub === "edit" || state.sub === "auto-edit" || state.sub === "automations") return "";
    return `${searchBox("Search emails")}<button type="button" class="btn is-compact" data-form="import-emails" aria-label="Import" title="Import">${icon("upload")}<span>Import</span></button>${exportLink("/admin/subscribers.csv", "Export")}`;
  }
  if (state.page === "menu") {
    return `${searchBox("Search the menu")}<button type="button" class="btn" data-form="section">${icon("plus")}<span>New Section</span></button>
      <button type="button" class="btn btn-primary" data-form="menu-item">${icon("plus")}<span>New Item</span></button>`;
  }
  if (state.page === "products") {
    if (state.sub === "codes") return `<button type="button" class="btn btn-primary" data-form="promo">${icon("plus")}<span>New Code</span></button>`;
    if (state.sub === "foods") return `<button type="button" class="btn btn-primary" data-form="food">${icon("plus")}<span>New Product</span></button>`;
    if (state.sub === "teas") return `<button type="button" class="btn btn-primary" data-form="tea">${icon("plus")}<span>New Tea</span></button>`;
    if (state.sub === "stock") return state.counting ? `<button type="button" class="btn" data-count-cancel>Cancel</button>` : `${searchBox("Search stock")}<button type="button" class="btn" data-stock-log>${icon("file")}<span>Log</span></button><button type="button" class="btn btn-primary" data-count-start>${icon("edit")}<span>Count</span></button>`;
    if (state.sub === "bulk") return `<a class="btn" href="/admin/products.csv" download>${icon("download")}<span>Export CSV</span></a><label class="btn">${icon("upload")}<span>Import CSV</span><input type="file" accept=".csv,text/csv" data-bulk-import hidden></label>`;
    if (state.sub === "giftcards") return searchBox("Search gift cards");
    return state.sub === "labels"
      ? `<button type="button" class="btn btn-primary" data-form="label">${icon("plus")}<span>New Label</span></button>`
      : `${searchBox("Search products")}<button type="button" class="btn btn-primary" data-form="product">${icon("plus")}<span>New Product</span></button>`;
  }
  if (state.page === "customers") return `${sortFor("customerSort")}${searchBox("Search customers")}`;
  if (state.page === "salestax" && state.sub === "all") return searchBox("Search states");
  if (state.page === "languages") return `${searchBox("Search English, Spanish or Korean")}<button type="button" class="btn" data-tr-refresh ${state.tr?.aiReady ? "" : "disabled"}>${icon("sparkles")}<span>Translate New Text</span></button>`;
  return "";
}

/* ── Badges ── */

const statusBadge = (status) => `<span class="badge s-${status}"><i></i>${esc(STATUS_LABEL[status] || status)}</span>`;
const payBadge = (payment) => `<span class="badge p-${payment}"><i></i>${esc(PAY_LABEL[payment] || payment)}</span>`;

// How an order leaves us, and what kind it is: small icon chips in one neutral style.
function fulfilmentTags(o) {
  const tags = [];
  if (o.ships) tags.push(["ship", "Ship"]);
  // A courier delivery's day ("Today" when it goes out today: pack it first).
  const courierDayLabel = (d) => (!d ? "" : d === new Date().toLocaleDateString("en-CA", { timeZone: state.shop?.timezone || "America/Los_Angeles" }) ? " · Today" : ` · ${new Date(`${d}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })}`);
  if (o.local) tags.push(["bike", `Courier${o.courier?.status && o.courier.status !== "waiting" ? ` · ${COURIER_LABEL[o.courier.status] || o.courier.status}` : courierDayLabel(o.courier?.day)}`]);
  if (o.collect) tags.push(["collect", "Pickup"]);
  if (o.cafe) tags.push([o.cafe.mode === "delivery" ? "bike" : "cafe", `${o.cafe.mode === "delivery" ? "Café delivery" : "Café pickup"} · ${o.cafe.when}`]);
  if (o.cafe?.mode === "delivery" && o.courier) tags.push(["bike", COURIER_LABEL[o.courier.status] || o.courier.status]);
  if (o.source === "renewal") tags.push(["subscriptions", "Subscription"]);
  if (o.source === "wholesale") tags.push(["building", "Wholesale"]);
  if (o.parent) tags.push(["gift", `Gift to ${o.recipient || "recipient"} · paid with ${o.parent}`]);
  else if (o.gift) tags.push(["gift", "Gift"]);
  return tags.map(([i, t]) => `<span class="tag">${icon(i, "i")}${esc(t)}</span>`).join("");
}

// Courier states (Uber Direct's, mapped in server/uber.js), with what the shop sees.
const COURIER_LABEL = {
  waiting: "Books when packed",
  not_booked: "Not booked",
  failed: "Booking failed",
  created: "Booked",
  confirmed: "Courier assigned",
  enroute_to_pickup: "Coming to pick up",
  arrived_at_pickup: "At the bar",
  picked_up: "Picked up",
  enroute_to_dropoff: "On the way",
  arrived_at_dropoff: "Arriving",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
const COURIER_STEPS = [
  ["Booked", ["created", "confirmed"]],
  ["At the bar", ["enroute_to_pickup", "arrived_at_pickup"]],
  ["On the way", ["picked_up", "enroute_to_dropoff", "arrived_at_dropoff"]],
  ["Delivered", ["delivered"]],
];
const courierActive = (c) => c && !["waiting", "not_booked", "failed", "cancelled", "returned", "delivered"].includes(c.status);
// Courier times in the shop's own time zone, wherever the back office is opened.
const timeOf = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: state.shop.timezone || undefined }) : "—");

// Older orders may name DoorDash, which delivered before Uber Direct.
const COURIER_NAME = { uber: "Uber Direct", doordash: "DoorDash" };
const courierName = (c) => COURIER_NAME[c?.provider] || "Uber Direct";
// Uber Direct shown as its own logo (never retyped); an older DoorDash delivery by name.
const courierMark = (c) => ((c?.provider || "uber") === "uber" ? `<span class="courier-uber" role="img" aria-label="Uber Direct"></span>` : esc(courierName(c)));

function courierPanel(o) {
  const c = o.courier || { status: "waiting" };
  const reached = COURIER_STEPS.findIndex(([, states]) => states.includes(c.status));
  const tone = c.status === "delivered" ? "s-completed" : ["failed", "not_booked", "cancelled", "returned"].includes(c.status) ? "p-unpaid" : courierActive(c) ? "s-shipped" : "";
  return `<section class="panel courier-panel">
    <div class="panel-head"><h3 class="courier-head">${courierMark(c)}${c.miles ? ` <span class="muted">${c.miles} mi from the roastery</span>` : ""}</h3><span class="badge ${tone}"><i></i>${esc(COURIER_LABEL[c.status] || c.status)}</span></div>
    ${
      reached >= 0 || c.status === "delivered"
        ? `<ol class="courier-steps">${COURIER_STEPS.map(([label], i) => `<li class="${i <= reached ? "is-done" : ""}${i === reached ? " is-now" : ""}"><span></span>${label}</li>`).join("")}</ol>`
        : ""
    }
    ${
      c.trackingUrl
        ? `<dl class="totals">
            ${c.dasher ? `<dt>Courier</dt><dd>${esc(c.dasher)}${c.dasherPhone ? ` · <a class="link" href="tel:${esc(c.dasherPhone)}">${esc(c.dasherPhone)}</a>` : ""}</dd>` : ""}
            <dt>Pickup</dt><dd>${timeOf(c.pickupEta)}</dd>
            <dt>Drop-off</dt><dd>${timeOf(c.dropoffEta)}</dd>
            ${c.fee != null ? `<dt>Fee</dt><dd>${money(c.fee)}</dd>` : ""}
          </dl>`
        : c.status === "waiting"
          ? c.quote != null ? `<dl class="totals"><dt>Quote</dt><dd>${money(c.quote)}</dd></dl>` : ""
          : ""
    }
    ${c.error ? `<p class="form-error">${esc(c.error)}</p>` : ""}
    <div class="drawer-actions">
      ${!courierActive(c) && c.status !== "delivered" && o.fulfilment === "Local delivery" ? `<button type="button" class="btn" data-courier="ship">Ship Instead</button>` : ""}
      ${
        // Until it's packed, Mark Packed & Book Courier (above) books it; a failed booking can be retried.
        !courierActive(c) && c.status !== "delivered" && (o.status !== "new" || ["failed", "cancelled", "returned"].includes(c.status))
          ? `<button type="button" class="btn ${c.status === "waiting" ? "" : "btn-primary"}" data-courier="book">${["failed", "cancelled", "returned", "not_booked"].includes(c.status) ? "Book Again" : "Book Courier Now"}</button>`
          : ""
      }
      ${c.trackingUrl ? `<a class="btn" href="${esc(c.trackingUrl)}" target="_blank" rel="noopener">${icon("ext")}<span>Track</span></a>` : ""}
      ${courierActive(c) ? `<button type="button" class="btn" data-courier="refresh">Refresh</button><button type="button" class="btn btn-danger-ghost" data-courier="cancel">Cancel courier</button>` : ""}
    </div>
  </section>`;
}

// A person or business: initials, name, and a second line.
const initials = (name) =>
  String(name || "?")
    .replace(/[^\p{L}\p{N} ]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("") || "?";
const who = (name, sub = "", extra = "") =>
  `<div class="who"><span class="who-text"><strong>${esc(name)}</strong>${sub ? `<small>${sub}</small>` : ""}${extra}</span></div>`;

/* ── Overview ── */

// The Overview's cards; each person picks theirs (Manage Cards, or ✕ on a card), remembered on
// this device.
/* ── Overview's cards (Peasy's): each a title, its number and ↗ to where it's dealt with; ≡ shows
   its list instead where it has one, ✕ hides it. Manage Cards picks them, grouped by area, with a
   search and Reset to defaults. Kept per person on this device. ── */
// [id, group, title, what it counts]
const OV_CARDS = [
  ["setup", "Tasks & Inbox", "Getting started", "Your checklist for setting up the back office."],
  ["inbox", "Tasks & Inbox", "Inbox", "Unread conversations."],
  ["todos", "Tasks & Inbox", "To-dos due", "Open to-dos due today or earlier."],
  ["imports", "Tasks & Inbox", "Imports to check", "Uploaded or emailed documents waiting for you."],
  ["outbox", "Tasks & Inbox", "Emails that didn't send", "Emails that failed and need sending again."],
  ["topack", "Sell", "To pack", "Paid orders waiting to be packed."],
  ["awaiting", "Sell", "Awaiting payment", "Orders and wholesale invoices not paid yet."],
  ["ready", "Sell", "Ready to collect", "Orders packed for pickup."],
  ["sales", "Sell", "Sales today", "What was ordered today, and how much is paid."],
  ["chart", "Sell", "Sales, last 14 days", "Daily sales by where they came from."],
  ["inquiries", "Wholesale", "Wholesale inquiries", "New businesses asking about wholesale."],
  ["locations", "Wholesale", "New locations", "Accounts that opened another location."],
  ["deliveries", "Buy", "Deliveries due", "Purchase orders due to arrive."],
  ["bills", "Buy", "Bills due", "Supplier bills due to pay."],
  ["reviews", "Marketing", "Low reviews", "Low reviews on Google or Tripadvisor."],
  ["visibility", "Marketing", "Where we show up", "How often search and AI answers name you."],
];
const OV_DEFAULT = ["setup", "inbox", "todos", "topack", "awaiting", "bills", "sales", "chart"];
const ovKey = () => `bo-ov-cards:${ME?.id || "key"}`;
const ovPrefs = () => {
  try {
    const p = JSON.parse(localStorage.getItem(ovKey()) || "null");
    if (p && Array.isArray(p.shown)) return { shown: p.shown, list: p.list || [] };
  } catch {}
  return { shown: OV_DEFAULT, list: [] };
};
function ovSave(p) {
  try {
    if (p) localStorage.setItem(ovKey(), JSON.stringify(p));
    else localStorage.removeItem(ovKey());
  } catch {
    /* this visit only */
  }
}
function ovToggle(key, id, on) {
  const p = ovPrefs();
  const set = new Set(p[key]);
  if (on) set.add(id);
  else set.delete(id);
  ovSave({ ...p, [key]: [...set] });
}
const ovClose = (id) => `<button type="button" class="icon-btn ov-close" data-ov-hide="${id}" aria-label="Hide this card">${icon("close")}</button>`;
function manageCards() {
  const shown = new Set(ovPrefs().shown);
  const q = (state.ovCardQuery || "").toLowerCase();
  const cards = OV_CARDS.filter(([, g, t, d]) => !q || `${g} ${t} ${d}`.toLowerCase().includes(q));
  const groups = [...new Set(cards.map(([, g]) => g))];
  const drawer = openPanel(
    "Manage Cards",
    `<div class="ov-manage">
      <label class="search ov-manage-find">${icon("search")}<input type="search" placeholder="Search cards" value="${esc(state.ovCardQuery || "")}" data-ov-card-search aria-label="Search cards"></label>
      ${groups.map((g) => `<p class="ov-manage-head">${esc(g)}</p>${cards.filter(([, cg]) => cg === g).map(([id, , title, what]) => `<label class="switch-row"><span><strong>${esc(title)}</strong><small>${esc(what)}</small></span><input type="checkbox" data-ov-card="${id}" ${shown.has(id) ? "checked" : ""}><i aria-hidden="true"></i></label>`).join("")}`).join("") || `<p class="muted">No cards match.</p>`}
    </div>`,
    { modal: true, footer: `<button type="button" class="btn btn-ghost" data-ov-reset>Reset to defaults</button><button type="button" class="btn btn-primary" data-close>Done</button>` }
  );
  const again = () => {
    const keep = state.open;
    render();
    state.open = keep;
    manageCards();
  };
  drawer.onchange = (e) => {
    const box = (e.target as HTMLElement).closest("[data-ov-card]") as HTMLInputElement;
    if (!box) return;
    ovToggle("shown", box.dataset.ovCard, box.checked);
    again();
  };
  drawer.oninput = (e) => {
    const find = (e.target as HTMLElement).closest("[data-ov-card-search]") as HTMLInputElement;
    if (!find) return;
    state.ovCardQuery = find.value;
    manageCards();
    const box = $("[data-ov-card-search]") as HTMLInputElement;
    box?.focus();
    box?.setSelectionRange(find.value.length, find.value.length);
  };
  $("[data-ov-reset]", drawer).onclick = () => {
    ovSave(null);
    again();
  };
}
// "Good morning, Abu": the Overview's title, by the time where they are.
function greeting() {
  const h = new Date().getHours();
  const part = h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  const name = ME && !ME.viaKey && ME.name ? String(ME.name).split(/\s+/)[0] : "";
  return name ? `${part}, ${name}` : part;
}

function overviewView() {
  const o = state.overview;
  const prefs = ovPrefs();
  const listed = new Set(prefs.list);
  const delta = o.today.revenue - o.yesterday.revenue;
  const period = o.days.reduce((n, d) => n + d.revenue, 0);
  const periodOrders = o.days.reduce((n, d) => n + d.orders, 0);
  const orderRow = (r, side) => `
    <a class="list-row" href="#orders/${r.status}" data-open-order="${esc(r.number)}">
      <span class="list-main"><strong>${esc(r.number)}</strong><small>${esc(r.name)} · ${r.items} item${r.items === 1 ? "" : "s"}</small></span>
      <span class="list-side">${side}</span>
    </a>`;
  // Each card: its number, where ↗ goes, and its list (cards that have one).
  const data = {
    inbox: [state.inboxUnread || 0, "#inbox"],
    todos: [o.todosDue || 0, "#todos"],
    imports: [o.importsOpen || 0, "#imports"],
    outbox: [o.outboxFailed || 0, "#outbox/failed"],
    topack: [o.toPack || 0, "#orders/new", o.attention.slice(0, 6).map((r) => orderRow(r, `<small>${ago(r.placedAt)}</small>`))],
    // Awaiting payment: checkouts not paid yet, and wholesale invoices (Overdue in red).
    awaiting: [
      (state.counts.pending_payment || 0) + (o.invoices?.open || 0),
      o.invoices?.overdue ? "#wholesale/orders" : "#orders/pending_payment",
      null,
      [state.counts.pending_payment ? `${state.counts.pending_payment} checkout${state.counts.pending_payment === 1 ? "" : "s"}` : "", o.invoices?.open ? `${o.invoices.open} invoice${o.invoices.open === 1 ? "" : "s"}` : "", o.invoices?.overdue ? `<span class="is-bad">${o.invoices.overdue} overdue</span>` : ""].filter(Boolean).join(" · "),
    ],
    ready: [state.counts.ready || 0, "#orders/ready"],
    cafe: [o.cafeToday.length, "#orders/new", o.cafeToday.slice(0, 6).map((r) => orderRow(r, `<small>${esc(r.cafe.time.slice(11, 16))}</small>`))],
    // Ordered today (wholesale invoices count), and how much of it is paid so far.
    sales: [money(o.today.revenue), "#orders/all", null, o.today.orders ? `${o.today.orders} order${o.today.orders === 1 ? "" : "s"} · ${money(o.today.collected ?? o.today.revenue)} collected` : o.yesterday.revenue ? `${money(o.yesterday.revenue)} yesterday` : ""],
    inquiries: [o.wholesale || 0, "#wholesale/enquiries"],
    locations: [o.intel?.newLocations || 0, "#wholesale/accounts"],
    roasts: [o.make?.roastsToday || 0, "#roasting", null, o.make?.roastsOverdue ? `<span class="is-bad">${o.make.roastsOverdue} overdue</span>` : ""],
    green: [o.make?.greenLow || 0, "#purchasing/stock"],
    deliveries: [o.buy?.deliveriesDue || 0, "#purchasing/orders"],
    bills: [o.buy?.billsDue || 0, "#purchasing/bills"],
    reviews: [o.intel?.lowReviews || 0, "#reviews/elsewhere"],
  };
  const card = (id, title) => {
    if (id === "chart")
      return `<section class="ov-card is-wide">
        <header><h3>${esc(title)}</h3><span>${ovClose(id)}</span></header>
        <p class="muted">${money(period)} from ${periodOrders} order${periodOrders === 1 ? "" : "s"}, after refunds</p>
        <div class="chart" data-chart role="img" aria-label="Daily sales for the last 14 days, by channel"></div>
        <table class="sr-only"><caption>Daily sales by channel</caption><thead><tr><th>Day</th><th>Sales</th>${CHANNELS.map(([, n]) => `<th>${n}</th>`).join("")}<th>Orders</th></tr></thead>
          <tbody>${o.days.map((d) => `<tr><td>${d.date}</td><td>${money(d.revenue)}</td>${CHANNELS.map(([k]) => `<td>${money(d.by?.[k] || 0)}</td>`).join("")}<td>${d.orders}</td></tr>`).join("")}</tbody></table>
      </section>`;
    if (id === "setup") {
      // Only the steps still to do (a group's count says how far along it is).
      const steps = o.setup || [];
      if (!steps.some((x) => !x.done)) return "";
      const groups = [...new Set(steps.filter((x) => !x.done).map((x) => x.group))];
      return `<section class="ov-card is-wide is-setup">
        <header><h3>${esc(title)}</h3><span>${ovClose(id)}</span></header>
        <div class="setup-list">${groups
          .map((g) => {
            const list = steps.filter((x) => x.group === g);
            return `<p class="setup-head">${esc(g)} <small>(${list.filter((x) => x.done).length}/${list.length})</small></p>${list
              .filter((x) => !x.done)
              .map((x) => `<a class="setup-row${x.done ? " is-done" : ""}" ${x.page ? `href="#${esc(x.page)}"` : ""}><i class="setup-box" aria-hidden="true">${x.done ? icon("check") : ""}</i><span>${esc(x.label)}${x.optional ? ` <small>optional</small>` : ""}</span><span class="setup-tip" data-tip="${esc(x.tip)}" aria-label="${esc(x.tip)}">${icon("Info")}</span></a>`)
              .join("")}`;
          })
          .join("")}</div>
      </section>`;
    }
    if (id === "visibility") {
      const v = o.visibility;
      if (!v) return "";
      return `<section class="ov-card is-wide">
        <header><h3>${esc(title)}</h3><span>${ovClose(id)}</span></header>
        <div class="vis-mini">${v.engines.map((e) => `<div class="${e.found ? "is-found" : ""}"><small>${esc(e.label)}</small><strong>${e.found}/${e.of}</strong></div>`).join("")}</div>
        <a class="icon-btn ov-go" href="#insights/visibility" aria-label="Open Insights">${icon("ArrowUpRight")}</a>
      </section>`;
    }
    const [n, href, rows, foot] = data[id] || [0, "#overview"];
    const asList = rows && listed.has(id);
    return `<section class="ov-card${asList ? " is-wide is-list" : ""}">
      <header><h3>${esc(title)}</h3><span>${rows ? `<button type="button" class="icon-btn" data-ov-list="${id}" aria-pressed="${asList}" aria-label="${asList ? "Show the number" : "Show the list"}">${icon("List")}</button>` : ""}${ovClose(id)}</span></header>
      ${asList ? (rows.length ? `<div class="list">${rows.join("")}</div>` : `<p class="muted ov-clear">All clear</p>`) : `<p class="ov-num">${n}</p>${foot ? `<p class="ov-foot">${foot}</p>` : ""}`}
      <a class="icon-btn ov-go" href="${href}" aria-label="Open">${icon("ArrowUpRight")}</a>
    </section>`;
  };
  const cards = OV_CARDS.filter(([id]) => prefs.shown.includes(id)).map(([id, , title]) => card(id, title)).filter(Boolean);
  // On a computer the page opens on the greeting and a big Ask box (Peasy's home): asking starts a
  // new chat. Phones keep their title and the Ask bar.
  const home = canOpen("assistant")
    ? `<section class="home-ask">
        <h2>${esc(greeting())}</h2>
        <form class="home-ask-box" data-home-ask><textarea name="q" rows="2" placeholder="Ask anything…" aria-label="Ask anything"></textarea>${homeChatsMenu()}<button type="submit" class="home-ask-send" aria-label="Send">${icon("ArrowUp", "i home-send-up")}<span class="home-send-enter">${icon("CornerDownLeft")}Enter</span></button></form>
      </section>
      <div class="home-ask-foot"><button type="button" class="btn btn-ghost" data-ov-manage>${icon("LayoutGrid")}<span>Manage Cards</span></button></div>`
    : "";
  return `${home}
    ${cards.length ? `<section class="ov-cards">${cards.join("")}</section>` : `<div class="card"><div class="empty empty-lg">${icon("overview", "i i-xl")}<p><strong>No cards shown</strong></p><button type="button" class="btn btn-primary" data-ov-manage>Manage Cards</button></div></div>`}`;
}

// Daily sales as columns, each stacked by where the sales came from (a fixed color per channel,
// in this order, whatever's shown), with a legend of each channel's total, a hairline grid and
// a tooltip per day. Colors: --chart-1…5 (validated as a set: dataviz validate_palette).
const CHANNELS = [
  ["shop", "Online Store"],
  ["wholesale", "Wholesale"],
  ["cafe", "Pickup"],
  ["subscriptions", "Subscriptions"],
  ["pos", "Point of Sale"],
];
function drawChart() {
  const box = $("[data-chart]");
  if (!box) return;
  const days = state.overview.days;
  const totals = Object.fromEntries(CHANNELS.map(([k]) => [k, days.reduce((n, d) => n + (d.by?.[k] || 0), 0)]));
  const shown = CHANNELS.filter(([k]) => totals[k] > 0);
  const W = Math.max(280, box.clientWidth);
  const H = 220;
  const pad = { l: 44, r: 8, t: 12, b: 26 };
  const max = Math.max(...days.map((d) => d.revenue));
  const step = niceStep(max || 10);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const y = (v) => pad.t + (H - pad.t - pad.b) * (1 - v / top);
  const slot = (W - pad.l - pad.r) / days.length;
  const bw = Math.min(24, slot - 6);
  const ticks = [];
  for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
  const label = (d) => new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  // One column: its channels bottom up, 2px of surface between them, the top one rounded.
  const col = (d, i) => {
    const x = pad.l + slot * i + (slot - bw) / 2;
    const parts = (shown.length ? shown : [["shop"]]).map(([k]) => [k, d.by ? d.by[k] || 0 : d.revenue]).filter(([, v]) => v > 0);
    let base = 0;
    const segs = parts.map(([k, v], j) => {
      const y0 = y(base);
      const y1 = y(base + v);
      base += v;
      const last = j === parts.length - 1;
      const gap = j > 0 ? 2 : 0;
      const bottom = y0 - gap;
      const h = bottom - y1;
      if (h <= 0.5) return "";
      const r = last ? Math.min(4, h, bw / 2) : 0;
      return `<path class="ch-${k}" d="M${x},${bottom}V${y1 + r}${r ? `Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}` : `H${x + bw}`}V${bottom}Z"/>`;
    });
    return `<g class="col${i === days.length - 1 ? " is-today" : ""}" data-i="${i}">
      <rect class="hit" x="${pad.l + slot * i}" y="${pad.t}" width="${slot}" height="${H - pad.t - pad.b}"/>
      ${segs.join("") || `<rect class="zero" x="${x}" y="${y(0) - 1}" width="${bw}" height="1"/>`}
    </g>`;
  };
  // A label ("Oct 18") needs about 52px: on a narrow screen only every second or third day gets one.
  const every = Math.max(1, Math.ceil(52 / slot));
  box.innerHTML = `
    ${shown.length > 1 ? `<ul class="chart-legend">${shown.map(([k, name]) => `<li><i class="ch-${k}"></i>${name}<b>${money(totals[k])}</b></li>`).join("")}</ul>` : ""}
    <svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
      ${ticks.map((v) => `<line class="grid" x1="${pad.l}" x2="${W - pad.r}" y1="${y(v)}" y2="${y(v)}"/><text class="tick" x="${pad.l - 8}" y="${y(v) + 4}" text-anchor="end">${moneyShort(v)}</text>`).join("")}
      ${days.map(col).join("")}
      ${days.map((d, i) => ((days.length - 1 - i) % every ? "" : `<text class="tick${i === days.length - 1 ? " is-today" : ""}" x="${pad.l + slot * i + slot / 2}" y="${H - 6}" text-anchor="middle">${i === days.length - 1 ? "Today" : label(d.date)}</text>`)).join("")}
    </svg>
    <div class="tip" data-tip hidden></div>`;
  const tip = $("[data-tip]", box);
  const svg = $("svg", box);
  const show = (g) => {
    const d = days[Number(g.dataset.i)];
    svg.classList.add("is-hovering");
    $$(".col", box).forEach((c) => c.classList.toggle("is-hover", c === g));
    const rows = shown.length > 1 ? shown.filter(([k]) => d.by?.[k] > 0).map(([k, name]) => `<span class="tip-row"><i class="ch-${k}"></i>${name}<b>${money(d.by[k])}</b></span>`).join("") : "";
    tip.innerHTML = `<strong>${new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</strong><span>${money(d.revenue)}</span>${rows}<small>${d.orders} order${d.orders === 1 ? "" : "s"}</small>`;
    tip.hidden = false;
    const i = Number(g.dataset.i);
    const cx = ((pad.l + slot * i + slot / 2) / W) * svg.clientWidth;
    tip.style.left = `${Math.min(Math.max(cx, 80), box.clientWidth - 80)}px`;
    tip.style.top = `${svg.offsetTop + (y(d.revenue) / H) * svg.clientHeight}px`;
  };
  box.onpointermove = (e) => {
    const g = e.target.closest(".col");
    if (g) show(g);
  };
  box.onpointerleave = () => {
    tip.hidden = true;
    svg.classList.remove("is-hovering");
    $$(".col", box).forEach((c) => c.classList.remove("is-hover"));
  };
}

function niceStep(max) {
  const raw = max / 4;
  const mag = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) || mag * 10;
}

let resizeTimer;
window.addEventListener("resize", () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => state.page === "overview" && state.overview && drawChart(), 120);
});

/* ── Orders ── */

// The orders list as shown (current tab and search). To pack runs oldest first, like the
// Overview, with orders still waiting for payment grouped above the ones ready to pack.
// Wholesale orders on invoice terms (Net 30) are packed before they're paid.
const unpaidToPack = (o) => o.status === "new" && o.payment === "unpaid" && !o.terms;
// The Filter menu's groups: where an order came from (orderChannel), and how it leaves us.
const orderLeaves = (o) => (o.local || o.cafe?.mode === "delivery" ? "courier" : o.collect || o.cafe ? "pickup" : o.ships ? "ship" : "");
// Sort: To pack runs oldest first, the other tabs newest first, unless picked.
const orderSort = () => state.orderSort || (state.tab === "new" ? "placed" : "-placed");
function orderRows() {
  const q = state.query.toLowerCase();
  const rows = state.orders.filter((o) => (!q || `${o.number} ${o.name} ${o.email}`.toLowerCase().includes(q)) && (!state.orderChannel || orderChannel(o) === state.orderChannel) && (!state.orderLeaves || orderLeaves(o) === state.orderLeaves));
  const sort = orderSort();
  const dir = sort.startsWith("-") ? -1 : 1;
  const by = sort.replace("-", "") === "total" ? (a, b) => (a.total - b.total) * dir : (a, b) => a.placedAt.localeCompare(b.placedAt) * dir;
  if (state.tab !== "new" || state.orderSort) return [...rows].sort(by);
  return [...rows.filter(unpaidToPack).sort(by), ...rows.filter((o) => !unpaidToPack(o)).sort(by)];
}

function ordersToolbar() {
  const on = [state.orderChannel, state.orderLeaves].filter(Boolean).length;
  const filter = menuButton(
    on ? `Filter · ${on}` : "Filter",
    "filter",
    [
      { head: "Channel" },
      ...["", "Online Store", "Wholesale", "Pickup", "Subscription", "Point of Sale"].map((k) => ({ pick: `orderChannel:${k}`, label: k || "Any", on: (state.orderChannel || "") === k })),
      { head: "Fulfillment" },
      ...[["", "Any"], ["ship", "Ship"], ["pickup", "Pickup"], ["courier", "Courier"]].map(([k, label]) => ({ pick: `orderLeaves:${k}`, label, on: (state.orderLeaves || "") === k })),
    ],
    Boolean(on)
  );
  const right = `<a class="btn is-compact" href="/admin/orders.csv" download aria-label="Export" data-tip="Download these orders as a spreadsheet">${icon("download")}<span>Export</span></a><button type="button" class="btn select-toggle" data-select-mode>${state.selecting || state.selected.size ? "Done" : "Select"}</button>${canOpen("wholesale") ? splitNew(`<button type="button" class="btn btn-primary" data-form="wholesale-order" aria-label="New Order">${icon("plus")}<span>New Order</span></button>`) : ""}`;
  return toolbar(`${filter}${sortMenu("orderSort", [["placed", "Date"], ["total", "Total"]], orderSort())}${searchBox("Search orders")}`, right);
}

// The order statuses as ring filters beside the title.
// Every status always shows, with its count (0 too), so the strip doesn't shift as orders move.
const orderHeadFilters = () => chips("Order status", TABS.map((t) => ({ href: `#orders/${t.id}`, label: t.label, count: state.counts[t.id] || 0, tone: `s-${t.id}`, on: t.id === state.tab })));

const ORDERS_PAGE = 50;
function ordersView() {
  const rows = orderRows();
  const shown = rows.slice(0, state.orderLimit || ORDERS_PAGE);
  const all = shown.length > 0 && shown.every((o) => state.selected.has(o.number));
  // Group headers, only when To pack has orders waiting for payment.
  const unpaid = rows.filter(unpaidToPack).length;
  const groupRow = (label) => `<tr class="group-row"><th colspan="7">${label}</th></tr>`;
  const groupBefore = (o, i) =>
    !unpaid || state.tab !== "new" || state.orderSort ? "" : i === 0 && unpaidToPack(o) ? groupRow(`Unpaid · ${unpaid}`) : !unpaidToPack(o) && (i === 0 || unpaidToPack(shown[i - 1])) ? groupRow(`Ready to pack · ${rows.length - unpaid}`) : "";
  return `
    ${ordersToolbar()}
    <section class="card table-card">
      ${
        rows.length
          ? `<table class="table orders-table${state.selecting || state.selected.size ? " is-selecting" : ""}">
              <thead><tr>
                <th class="check"><input type="checkbox" data-select-all ${all ? "checked" : ""} aria-label="Select all"></th>
                <th>Order</th><th>Customer</th><th>Fulfillment</th><th class="num">Items</th><th class="num">Total</th><th>Payment</th>
              </tr></thead>
              <tbody>
                ${shown
                  .map(
                    (o, i) => `${groupBefore(o, i)}<tr data-row="${o.number}" class="${state.open === o.number ? "is-open" : ""}${state.selected.has(o.number) ? " is-selected" : ""}">
                      <td class="check"><input type="checkbox" data-select="${o.number}" ${state.selected.has(o.number) ? "checked" : ""} aria-label="Select ${o.number}"></td>
                      <td class="c-order"><strong class="code">${esc(o.number)}</strong><small>${esc(date(o.placedAt))}</small></td>
                      <td class="c-customer">${who(o.name, esc(o.email))}</td>
                      <td class="c-tags"><div class="tags">${fulfilmentTags(o)}</div></td>
                      <td class="num c-items">${o.items}</td>
                      <td class="num c-total"><strong>${o.parent ? "Gift" : money(o.total)}</strong></td>
                      <td class="c-pay">${payCell(o)}</td>
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>
            ${rows.length > shown.length ? `<div class="show-more"><button type="button" class="btn" data-orders-more>Show ${Math.min(ORDERS_PAGE, rows.length - shown.length)} more</button><small class="muted">${shown.length} of ${rows.length}</small></div>` : ""}`
          : `<div class="empty empty-lg">${icon("orders", "i i-xl")}<p><strong>${state.query ? "No orders match that search" : state.tab === "new" ? "Nothing to pack" : `No ${STATUS_LABEL[state.tab].toLowerCase()} orders`}</strong></p></div>`
      }
    </section>`;
}

// Shift-click on a checkbox selects a run of orders (the change event doesn't carry the key).
let lastSelected = null;
let shiftHeld = false;
document.addEventListener("click", (e) => {
  if (e.isTrusted && (e.target as any).matches?.("[data-select]")) shiftHeld = e.shiftKey;
}, true);

const bulkBar = () => `
  <div class="bulk" role="region" aria-label="Selected orders">
    <span><strong>${state.selected.size}</strong> order${state.selected.size === 1 ? "" : "s"} selected</span>
    <button type="button" class="btn" data-bulk-print>${icon("print")}<span>Packing slips</span></button>
    ${state.tab === "new" ? `<button type="button" class="btn btn-primary" data-bulk-status="packed">Mark packed</button>` : ""}
    <button type="button" class="btn" data-bulk-hide="${state.tab === "hidden" ? "" : "1"}">${state.tab === "hidden" ? "Unhide" : "Hide"}</button>
    <button type="button" class="btn btn-ghost" data-bulk-clear aria-label="Clear selection">${icon("close")}</button>
  </div>`;

/* ── Subscriptions ── */

const SUB_BILLING = { square: "Square", prepaid: "Prepaid" };
const subBadge = (s) => `<span class="badge sub-${s}"><i></i>${SUB_STATUS[s] || s}</span>`;
// The next delivery; one whose date has passed is flagged.
const subNext = (x) =>
  x.status === "active" && x.nextDelivery
    ? `${esc(new Date(`${x.nextDelivery}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}${x.nextDelivery < shopToday() ? ` <span class="badge badge-warn"><i></i>Overdue</span>` : ""}`
    : `<span class="muted">—</span>`;

// One subscription in the side panel: who, where it goes, what's happened, and its actions.
function subPanel(id) {
  const x = state.subs.find((s) => s.id === id);
  if (!x) return;
  const a = x.shipTo;
  const addr = a ? [a.name, a.address, `${a.city}${a.state ? `, ${a.state}` : ""} ${a.postcode || ""}`, a.phone].filter((l) => l && l.trim()) : [];
  const open = x.status !== "cancelled" && x.status !== "ended";
  openPanel(x.customerName || x.customerEmail, `
    <div data-sub-row="${esc(x.id)}" class="drawer-group">
      ${
        x.status === "active"
          ? `<div class="drawer-actions"><button type="button" class="btn" data-sub-act="skip">Skip next</button><button type="button" class="btn" data-sub-act="pause">Pause</button></div>`
          : x.status === "paused"
          ? `<div class="drawer-actions"><button type="button" class="btn btn-primary" data-sub-act="resume">Resume</button></div>`
          : ""
      }
      <div class="panel">
        <dl class="kv">
          <div><dt>Plan</dt><dd>${esc(x.coffeeLabel)} · ${esc(x.sizeLabel)} · ${esc(x.freqLabel)}</dd></div>
          <div><dt>Price</dt><dd>${money(x.price)}${x.prepaid ? ` · ${x.prepaid.sent} of ${x.prepaid.deliveries} sent` : ""}</dd></div>
          <div><dt>Next delivery</dt><dd>${subNext(x)}</dd></div>
          <div><dt>Billing</dt><dd>${SUB_BILLING[x.billing] || "Invoice"}</dd></div>
          <div><dt>Email</dt><dd><a href="mailto:${esc(x.customerEmail)}">${esc(x.customerEmail)}</a></dd></div>
          <div><dt>Started</dt><dd>${esc(day(x.createdAt))}</dd></div>
        </dl>
      </div>
      <section class="panel">
        <h3 class="panel-title">${x.gift ? `Gift for ${esc(x.recipient || "")}` : "Ships to"}</h3>
        <p>${addr.length ? addr.map(esc).join("<br>") : `<span class="muted">No address.</span>`}</p>
        ${x.note ? `<p class="muted">“${esc(x.note)}”</p>` : ""}
      </section>
      ${
        x.history?.length
          ? `<section class="panel">
              <h3 class="panel-title">History</h3>
              <ol class="timeline">${x.history
                .slice()
                .reverse()
                .map((h) => `<li><span>${esc(h.action.charAt(0).toUpperCase() + h.action.slice(1))}</span><small>${esc(date(h.at))}</small></li>`)
                .join("")}</ol>
            </section>`
          : ""
      }
      ${open ? `<section class="danger-zone"><button type="button" class="btn btn-danger-ghost" data-sub-act="cancel">Cancel subscription</button></section>` : ""}
    </div>`, { badges: subBadge(x.status), subtitle: x.customerEmail });
}

function subscriptionsView() {
  const q = state.query.toLowerCase();
  const rows = state.subs.filter((x) => !q || `${x.customerName} ${x.customerEmail} ${x.coffeeLabel}`.toLowerCase().includes(q));
  const active = state.subs.filter((x) => x.status === "active");
  const perMonth = { weekly: 52 / 12, biweekly: 26 / 12, monthly: 1 };
  // Prepaid gifts were paid at checkout, so they bring in nothing more each month.
  const monthly = active.filter((x) => !x.prepaid).reduce((n, x) => n + x.price * (perMonth[x.freq] || 1), 0);
  // Billing only earns a column when it differs between plans (all Square says nothing).
  const billingVaries = new Set(rows.map((x) => x.billing)).size > 1;
  const nextWeek = active.filter((x) => x.nextDelivery && Date.parse(`${x.nextDelivery}T12:00:00`) < Date.now() + 7 * 864e5).length;
  return `
    <section class="stats stats-3">
      <div class="card stat"><p class="stat-label">Active</p><p class="stat-value">${active.length}</p><p class="stat-foot">${state.subs.filter((x) => x.status === "paused").length} paused</p></div>
      <div class="card stat"><p class="stat-label">Est. monthly revenue</p><p class="stat-value">${money(monthly)}</p></div>
      <div class="card stat"><p class="stat-label">Shipping in 7 days</p><p class="stat-value">${nextWeek}</p></div>
    </section>
    <section class="card table-card">
      ${
        rows.length
          ? `<table class="table subs-table is-labelled">
              <thead><tr><th>Customer</th><th>Plan</th><th>Status</th><th>Next delivery</th><th class="num">Price</th>${billingVaries ? "<th>Billing</th>" : ""}</tr></thead>
              <tbody>
                ${rows
                  .map(
                    (x) => `<tr data-sub-row="${esc(x.id)}" class="clickable">
                      <td>${who(x.customerName, esc(x.customerEmail))}</td>
                      <td>${esc(x.coffeeLabel)}<small>${esc(x.sizeLabel)} · ${esc(x.freqLabel)}${x.gift ? ` · gift for ${esc(x.recipient)}` : ""}${x.prepaid ? ` · ${x.prepaid.sent} of ${x.prepaid.deliveries} sent` : ""}</small></td>
                      <td>${subBadge(x.status)}</td>
                      <td>${subNext(x)}</td>
                      <td class="num"><strong>${money(x.price)}</strong></td>
                      ${billingVaries ? `<td><span class="muted">${SUB_BILLING[x.billing] || "Invoice"}</span></td>` : ""}
                    </tr>`
                  )
                  .join("")}
              </tbody>
            </table>`
          : `<div class="empty empty-lg">${icon("subscriptions", "i i-xl")}<p><strong>${state.query ? "No subscriptions match that search" : "No subscriptions yet"}</strong></p></div>`
      }
    </section>`;
}

/* ── Customers ── */

// The lead score (server/leadscore.ts): "72 High", and its reasons where there's room.
// How likely they are to buy, as a word (the score behind it stays out of sight): a tag in lists,
// and in their record the reasons for it.
const LEAD_WORD = { High: ["t-orange", "Hot lead"], Medium: ["", "Warm"] };
const leadTag = (l) => (l && LEAD_WORD[l.level] ? `<span class="badge${LEAD_WORD[l.level][0] ? ` ${LEAD_WORD[l.level][0]}` : ""}"><i></i>${LEAD_WORD[l.level][1]}</span>` : "");
const leadCell = (l) => leadTag(l) || `<span class="muted">—</span>`;
const leadFacts = (l) => (l && LEAD_WORD[l.level] ? `<dt>Lead</dt><dd>${LEAD_WORD[l.level][1]}${l.reasons.length ? `<small class="lead-why">${l.reasons.map(esc).join("<br>")}</small>` : ""}</dd>` : "");

function customersView() {
  const q = state.query.toLowerCase();
  const all = state.customers;
  const active = all.filter((c) => c.active);
  // VIP: the top 15% by recency, orders and spend, best first.
  const vip = all.filter((c) => c.rfm?.vip).sort((a, b) => b.rfm.score - a.rfm.score);
  const base = state.customerFilter === "all" ? all : state.customerFilter === "vip" ? vip : active;
  const found = base.filter((c) => !q || `${c.name} ${c.email}`.toLowerCase().includes(q));
  const shown = state.customerFilter === "vip" ? found : sorted("customerSort", found);
  const shortDate = (iso) => (iso ? dayShort(iso) : "—");
  return `
    ${chips("Customer filter", [
      { href: "#customers/active", label: "Active", count: active.length, tone: "s-completed", on: state.customerFilter === "active" },
      { href: "#customers/vip", label: "VIP", count: vip.length, tone: "t-purple", on: state.customerFilter === "vip" },
      { href: "#customers/all", label: "All accounts", count: all.length, on: state.customerFilter === "all" },
    ])}
    <section class="card table-card">
      ${
        shown.length
          ? `<table class="table customers-table is-labelled">
              <thead><tr><th>Customer</th><th></th><th class="num">Orders</th><th class="num">Spent</th><th>Last order</th><th>Lead</th></tr></thead>
              <tbody>
                ${shown
                  .map((c) => {
                    // What sets them apart, as small tags; nothing for a plain account.
                    const tags = [
                      c.suspendedAt && `<span class="chip-sm is-warn">Suspended</span>`,
                      c.rfm?.vip && `<span class="chip-sm is-vip" title="Top ${c.rfm.top}% of customers by how recently, how often and how much they buy">VIP · Top ${c.rfm.top}%</span>`,
                      c.subscriptions.active && `<span class="chip-sm is-good">Subscriber${c.subscriptions.active > 1 ? ` ×${c.subscriptions.active}` : ""}</span>`,
                      !c.subscriptions.active && c.subscriptions.paused && `<span class="chip-sm">Paused</span>`,
                      c.wholesale && `<span class="chip-sm">Wholesale</span>`,
                      c.newsletter && `<span class="chip-sm">Newsletter</span>`,
                    ].filter(Boolean);
                    const initials = (c.name || c.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
                    return `<tr data-customer="${esc(c.id)}" class="clickable${c.active ? "" : " is-quiet"}">
                      <td><span class="cust-cell"><span class="cust-initials" aria-hidden="true">${esc(initials)}</span><span><strong>${esc(c.name || c.email)}</strong><small>${esc(c.email)}</small></span></span></td>
                      <td><span class="chips-row">${tags.join("")}</span></td>
                      <td class="num" data-unit="${c.orders === 1 ? " order" : " orders"}">${c.orders || `<span class="muted">0</span>`}</td>
                      <td class="num${c.spent ? "" : " is-none"}">${c.spent ? `<strong>${money(c.spent)}</strong>` : `<span class="muted">—</span>`}</td>
                      <td><small class="nowrap">${c.lastOrderAt ? shortDate(c.lastOrderAt) : `<span class="muted">Joined ${shortDate(c.createdAt)}</span>`}</small></td>
                      <td class="c-lead">${leadCell(c.lead)}</td>
                    </tr>`;
                  })
                  .join("")}
              </tbody>
            </table>`
          : `<div class="empty empty-lg">${icon("customers", "i i-xl")}<p><strong>${state.query ? "No customers match that search" : state.customerFilter === "active" ? "No active customers yet" : state.customerFilter === "vip" ? "No VIPs yet" : "No accounts yet"}</strong></p></div>`
      }
    </section>`;
}

/* ── Wholesale and newsletter ── */

/* ── Wholesale: orders on account, accounts, enquiries ── */

// Today at the shop ("2026-10-17"), so an invoice isn't overdue early in the evening.
const shopToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
// A wholesale invoice's one state, wherever it shows (Orders, Wholesale Orders, the order, the
// account, the Overview): Invoiced (due on a day), Clearing (a bank payment on its way), Paid,
// Overdue (only once past its due day) or Declined. Cancelled and refunded orders keep the
// payment's own tag; store orders keep theirs.
const wsState = (o) => {
  const w = o.wholesale || {};
  if (o.status === "cancelled") return "cancelled";
  if (o.payment === "refunded" || o.payment === "partially_refunded") return "refunded";
  if (o.payment === "paid") return "paid";
  if (w.processing) return "clearing";
  if (w.declined) return "declined";
  return w.dueDate && w.dueDate < shopToday() ? "overdue" : "invoiced";
};
const INVOICE_TAG = { invoiced: ["", "Invoiced"], clearing: ["t-blue", "Clearing"], paid: ["p-paid", "Paid"], overdue: ["t-red", "Overdue"], declined: ["t-red", "Declined"] };
const fmtDue = (d) => (d ? new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "");
const dueLabel = (o) => {
  const w = o.wholesale;
  if (!w) return "";
  const day = fmtDue(w.dueDate);
  return {
    invoiced: day ? `Due ${day}` : "Due on receipt",
    overdue: day ? `Was due ${day}` : "",
    clearing: "Bank payment clearing",
    declined: "Card declined",
  }[wsState(o)] || "";
};
// The tag for a wholesale invoice (its state), else the payment's own.
const wsBadge = (o) => {
  const st = wsState(o);
  if (!o.wholesale || !INVOICE_TAG[st]) return st === "cancelled" ? "" : payBadge(o.payment);
  return `<span class="badge${INVOICE_TAG[st][0] ? ` ${INVOICE_TAG[st][0]}` : ""}"><i></i>${INVOICE_TAG[st][1]}</span>`;
};
const payTag = (o) => (o.wholesale && o.status !== "cancelled" ? wsBadge(o) : payBadge(o.payment));
// A list's payment cell: the tag, and under a wholesale invoice its due day (or why not paid).
const payCell = (o) => `${payTag(o)}${o.wholesale && o.status !== "cancelled" && dueLabel(o) ? `<small>${esc(dueLabel(o))}</small>` : ""}`;

// A page's sections as filter chips (the same as Orders'), with how many in each.
const subTabs = (base, tabs) => chips("Sections", tabs.map(([id, label, count]) => ({ href: `#${base}/${id}`, label, count: count ?? "", on: state.sub === id })), "segments");

/* ── Toolbar (Peasy's): Filter and Sort menus, then the search, actions on the right ── */

// A menu button: items are { head } (a group label) or { pick: "key:value", label, on }.
// Picking one sets state[key] (see the [data-tb-pick] handler); `on` shows a check.
// A Filter menu with several kinds of filter is Peasy's two panes: the kinds on the left, the
// picked kind's choices on the right with a search and checkboxes.
function filterPanes(label, items, active) {
  const groups = [];
  for (const it of items) if (it.head) groups.push({ head: it.head, items: [] });
  else groups[groups.length - 1]?.items.push(it);
  return `<details class="order-menu tb-menu tb-filter"><summary class="btn btn-sm${active ? " is-on" : ""}">${icon("filter")}<span>${label}</span></summary><div class="order-menu-list tb-two">
    <div class="tb-cats">${groups.map((g, i) => `<button type="button" data-tb-cat="${i}" aria-pressed="${i === 0}"><span>${esc(g.head)}</span>${icon("ChevronRight", "i")}</button>`).join("")}</div>
    <div class="tb-opts">${groups
      .map(
        (g, i) => `<div class="tb-pane" data-tb-pane="${i}" ${i ? "hidden" : ""}><label class="search tb-find">${icon("search")}<input type="search" placeholder="Search…" data-tb-find aria-label="Search ${esc(g.head)}"></label>${g.items
          .map((it) => `<button type="button" data-tb-pick="${esc(it.pick)}" aria-pressed="${Boolean(it.on)}"><i class="tb-box" aria-hidden="true">${it.on ? icon("check") : ""}</i><span>${esc(it.label)}</span></button>`)
          .join("")}</div>`
      )
      .join("")}</div>
  </div></details>`;
}
document.addEventListener("click", (e) => {
  const cat = (e.target as HTMLElement).closest?.("[data-tb-cat]") as HTMLElement;
  if (!cat) return;
  const menu = cat.closest(".tb-two");
  for (const b of $$("[data-tb-cat]", menu)) b.setAttribute("aria-pressed", String(b === cat));
  for (const p of $$("[data-tb-pane]", menu)) p.hidden = p.dataset.tbPane !== cat.dataset.tbCat;
});
document.addEventListener("input", (e) => {
  const find = (e.target as HTMLElement).closest?.("[data-tb-find]") as HTMLInputElement;
  if (!find) return;
  const q = find.value.trim().toLowerCase();
  for (const b of $$("[data-tb-pick]", find.closest(".tb-pane"))) b.hidden = Boolean(q) && !b.textContent.toLowerCase().includes(q);
});
const menuButton = (label, iconName, items, active = false) =>
  iconName === "filter" && items.filter((it) => it.head).length > 1 ? filterPanes(label, items, active) :
  `<details class="order-menu tb-menu"><summary class="btn btn-sm${active ? " is-on" : ""}">${icon(iconName)}<span>${label}</span></summary><div class="order-menu-list tb-list">${items
    .map((it) => (it.head ? `<p class="tb-head">${esc(it.head)}</p>` : `<button type="button" data-tb-pick="${esc(it.pick)}" aria-pressed="${Boolean(it.on)}"><span>${esc(it.label)}</span>${it.on ? icon("check", "i tb-check") : ""}</button>`))
    .join("")}</div></details>`;
const toolbar = (left, right = "") => `<div class="toolbar"><div class="toolbar-side">${left}</div><div class="toolbar-side">${right}</div></div>`;
// Sort menu: picking the same field again flips its direction ("-due"). A field marked high
// starts high to low (totals, scores, dates).
const sortMenu = (key, fields, current) => {
  const [field, desc] = current.startsWith("-") ? [current.slice(1), true] : [current, false];
  const name = fields.find(([k]) => k === field)?.[1] || fields[0][1];
  return menuButton(`<span class="tb-word">Sort: </span>${esc(name)} ${desc ? "↓" : "↑"}`, "sort", fields.map(([k, label, high]) => ({ pick: `${key}:${k === field ? (desc ? k : `-${k}`) : high ? `-${k}` : k}`, label, on: k === field })), true);
};

// Sort menus on lists: each list's fields (what it's sorted by), the default, and the pick each
// person last made (kept in this browser). "-field" is high to low, newest first.
const SORTS = {
  customerSort: { def: "-lastOrderAt", fields: [["lastOrderAt", "Last order", (c) => c.lastOrderAt || ""], ["name", "Name", (c) => (c.name || c.email || "").toLowerCase()], ["spent", "Spent", (c) => c.spent || 0], ["orders", "Orders", (c) => c.orders || 0], ["score", "Lead", (c) => c.lead?.score ?? -1], ["createdAt", "Joined", (c) => c.createdAt || ""]] },
  accountSort: { def: "business", fields: [["business", "Business", (a) => (a.business || "").toLowerCase()], ["unpaid", "Unpaid", (a) => a.owed || 0], ["score", "Lead", (a) => a.lead?.score ?? -1], ["createdAt", "Added", (a) => a.createdAt || ""]] },
  greenSort: { def: "low", fields: [["low", "Low first", (x) => greenUrgency(x)], ["name", "Name", (x) => x.name.toLowerCase()], ["onHand", "On hand", (x) => x.onHand], ["unitCost", "Cost per kg", (x) => x.unitCost || 0]] },
  sampleSort: { def: "-requestedAt", fields: [["requestedAt", "Requested", (x) => x.requestedAt || ""], ["score", "Score", (x) => x.score ?? -1], ["unitCost", "Price per kg", (x) => x.unitCost ?? -1], ["name", "Name", (x) => x.name.toLowerCase()]] },
  poSort: { def: "-createdAt", fields: [["createdAt", "Date", (p) => p.createdAt || ""], ["expected", "Expected", (p) => p.expected || ""], ["total", "Total", (p) => p.total || 0], ["supplier", "Supplier", (p) => (p.supplierName || "").toLowerCase()]] },
};
const sortKey = () => `bo-sorts:${ME?.id || "key"}`;
const savedSorts = () => {
  try {
    return JSON.parse(localStorage.getItem(sortKey()) || "{}");
  } catch {
    return {};
  }
};
const sortPick = (key) => state[key] || savedSorts()[key] || SORTS[key].def;
// The rows in the picked order; ties keep their order, and blanks go last.
function sorted(key, rows) {
  const pick = sortPick(key);
  const desc = pick.startsWith("-");
  const get = SORTS[key].fields.find(([k]) => k === (desc ? pick.slice(1) : pick))?.[2];
  if (!get) return rows;
  return [...rows].sort((a, b) => {
    const x = get(a);
    const y = get(b);
    if ((x === "" || x == null) !== (y === "" || y == null)) return x === "" || x == null ? 1 : -1;
    const c = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true });
    return desc ? -c : c;
  });
}
const sortFor = (key) => sortMenu(key, SORTS[key].fields.map(([k, label, get]) => [k, label, !["name", "business", "supplier", "low"].includes(k)]), sortPick(key));

// The account an enquiry turned into: made from it, or the same email, login or business.
const enquiryAccount = (e, accounts) => {
  const lc = (v) => String(v || "").trim().toLowerCase();
  return accounts.find((a) => a.id === e.accountId || lc(a.email) === lc(e.email) || (a.portalEmails || []).some((x) => lc(x) === lc(e.email)) || lc(a.business) === lc(e.business));
};

function wholesaleView() {
  const t = state.trade;
  // Enquiries with an account (made from it, or invited to the portal) leave the open list.
  const openEnq = t.enquiries.filter((e) => !enquiryAccount(e, t.accounts));
  const enqShown = state.enquiryFilter === "done" ? t.enquiries.filter((e) => enquiryAccount(e, t.accounts)) : openEnq;
  let enqChips = "";
  let alerts = "";
  const unpaid = t.wholesaleOrders.filter((o) => o.payment === "unpaid" && o.status !== "cancelled");
  const overdue = unpaid.filter((o) => wsState(o) === "overdue");
  const empty = (title, action = "") => `<div class="empty empty-lg">${icon("wholesale", "i i-xl")}<p><strong>${title}</strong></p>${action}</div>`;
  let body = "";
  if (state.sub === "orders") {
    body = t.wholesaleOrders.length
      ? `<table class="table ws-orders is-labelled">
          <thead><tr><th>Order</th><th>Account</th><th>Status</th><th class="num">Total</th><th>Invoice</th></tr></thead>
          <tbody>${t.wholesaleOrders
            .map(
              (o) => `<tr data-row="${o.number}" class="clickable">
                <td><strong class="code">${esc(o.number)}</strong><small>${esc(date(o.placedAt))}${o.wholesale?.poRef ? ` · PO ${esc(o.wholesale.poRef)}` : ""}</small></td>
                <td>${who(o.wholesale?.business || o.name, `${o.items} item${o.items === 1 ? "" : "s"}`)}</td>
                <td>${statusBadge(o.status)}</td>
                <td class="num"><strong>${money(o.total)}</strong></td>
                <td>${o.wholesale?.sample ? `<span class="badge t-purple"><i></i>Samples</span>` : payCell(o)}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : empty("No wholesale orders yet", `<div class="btn-row"><button type="button" class="btn btn-primary" data-form="wholesale-order">${icon("plus")}<span>New Order</span></button><button type="button" class="btn" data-goto-imports>${icon("upload")}<span>Import One</span></button></div>`);
  } else if (state.sub === "quotes") {
    const qs = t.quotes || [];
    body = qs.length
      ? `<table class="table ws-quotes is-labelled">
          <thead><tr><th>Quote</th><th>Account</th><th>Status</th><th class="num">Total</th></tr></thead>
          <tbody>${qs
            .map(
              (q) => `<tr data-quote="${esc(q.id)}" class="clickable">
                <td><strong class="code">${esc(q.number)}</strong><small>${esc(date(q.at))}</small></td>
                <td>${who(q.business, q.by)}</td>
                <td>${q.state === "requested" ? `<strong>${QUOTE_STATE.requested}</strong>` : esc(QUOTE_STATE[q.state])}${q.state === "sent" ? `<small>Until ${esc(q.validUntil)}</small>` : q.order ? `<small>${esc(q.order)}</small>` : ""}</td>
                <td class="num">${q.total != null ? `<strong>${money(q.total)}</strong>` : `<span class="muted">—</span>`}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : empty("No quote requests yet");
  } else if (state.sub === "pricelists") {
    const lists = t.priceLists || [];
    body = lists.length
      ? `<table class="table ws-pricelists is-labelled">
          <thead><tr><th>Price list</th><th class="num">Off retail</th><th class="num">Own prices</th><th>Volume prices</th><th class="num">Cafés</th></tr></thead>
          <tbody>${lists
            .map(
              (l) => `<tr data-pricelist="${esc(l.id)}" class="clickable">
                <td><strong>${esc(l.name)}</strong></td>
                <td class="num">${offPct(l.discount)}%</td>
                <td class="num">${l.prices.length || `<span class="muted">—</span>`}</td>
                <td>${l.tiers.length ? l.tiers.map((x) => `${x.bags}+ bags: ${x.off}% off`).join(" · ") : `<span class="muted">—</span>`}</td>
                <td class="num">${l.accounts || `<span class="muted">0</span>`}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("Tags", "i i-xl")}<p><strong>No price lists yet</strong></p><p class="empty-line">Set prices once for every account on a list.</p><button type="button" class="btn btn-primary" data-pricelist-new>${icon("plus")}<span>New Price List</span></button></div>`;
  } else if (state.sub === "accounts") {
    const la = t.locationAlerts || [];
    alerts = la.length
      ? `<section class="location-alerts" aria-label="New locations">
          <div class="post-grid">${la
            .slice(0, 6)
            .map((x) => `<article class="card post-card" data-alert="${esc(x.id)}"><header><span class="badge s-completed"><i></i>New location</span></header><strong>${esc(x.business)}</strong><span class="muted">${x.from} → ${x.to} locations</span><div class="post-caption">${x.places.slice(0, 4).map((p) => `<a class="link" href="${esc(p.url)}" target="_blank" rel="noopener">${esc(p.address || p.name)}</a>`).join("<br>")}</div><div class="btn-row"><button type="button" class="btn btn-sm" data-edit-account="${esc(x.accountId)}">Account</button><button type="button" class="btn btn-sm btn-ghost" data-alert-done>Dismiss</button></div></article>`)
            .join("")}</div>${la.length > 6 ? `<p class="muted">And ${la.length - 6} more.</p>` : ""}
        </section>`
      : "";
    body = t.accounts.some((a) => matches(state.query, a.business, a.contactName, a.email, a.address?.city))
      ? `<table class="table ws-accounts is-labelled">
          <thead><tr><th>Business</th><th>Contact</th><th>Lead</th><th>Terms</th><th class="num">Off retail</th><th class="num">Unpaid</th></tr></thead>
          <tbody>${sorted("accountSort", t.accounts.filter((a) => matches(state.query, a.business, a.contactName, a.email, a.address?.city)).map((a) => ({ ...a, owed: unpaid.filter((o) => o.wholesale?.accountId === a.id).reduce((n, o) => n + o.total, 0) })))
            .sort((x, y) => (Boolean(x.archivedAt) as any) - (Boolean(y.archivedAt) as any))
            .map((a) => {
              const owed = unpaid.filter((o) => o.wholesale?.accountId === a.id).reduce((n, o) => n + o.total, 0);
              return `<tr data-account="${esc(a.id)}" class="clickable${a.archivedAt ? " is-archived" : ""}">
                <td>${who(a.business, esc([a.address?.city, a.address?.state].filter(Boolean).join(", ") || "No address yet") + (t.locations?.[a.id]?.count > 1 ? ` · ${t.locations[a.id].count} locations` : ""), a.archivedAt ? `<span class="badge"><i></i>Archived</span>` : (t.locationAlerts || []).some((x) => x.accountId === a.id) ? `<span class="badge s-completed"><i></i>New location</span>` : "")}</td>
                <td>${esc(a.contactName || "—")}<small>${esc(a.email)}</small></td>
                <td class="c-lead">${leadCell(a.lead)}</td>
                <td>${a.terms ? `Net ${a.terms}` : "Due on receipt"}<small>${a.portalEmails?.length ? (a.invitedAt ? "Portal invite sent" : "Portal: not invited yet") : "No portal logins"}</small></td>
                <td class="num">${offPct(accountDiscount(a))}%${a.priceList && listById(a.priceList) ? `<small>${esc(listById(a.priceList).name)}</small>` : ""}</td>
                <td class="num">${owed ? `<strong>${money(owed)}</strong>` : `<span class="muted">—</span>`}</td>
              </tr>`;
            })
            .join("")}</tbody></table>`
      : t.accounts.length
      ? empty("No accounts match that search")
      : empty("No wholesale accounts yet", `<button type="button" class="btn btn-primary" data-form="account">${icon("plus")}<span>New Account</span></button>`);
  } else if (state.sub === "prospects") {
    body = prospectsTab();
  } else if (state.sub === "samples") {
    body = cafeSamplesTab();
  } else if (state.sub === "documents") {
    body = documentsTab();
  } else {
    enqChips = chips("Inquiries", [
      { filter: "enquiries:open", label: "Open", count: openEnq.length, tone: "t-yellow", on: state.enquiryFilter !== "done" },
      { filter: "enquiries:done", label: "Has account", count: t.enquiries.length - openEnq.length, tone: "s-completed", on: state.enquiryFilter === "done" },
    ]);
    body = !t.enquiries.length
      ? empty("No wholesale inquiries yet")
      : enqShown.length
      ? `<table class="table ws-table is-labelled">
          <thead><tr><th>Business</th><th>Fit</th><th>Contact</th><th>Details</th><th>Message</th><th>Received</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${enqShown
            .map(
              (e) => `<tr data-enquiry="${esc(e.id)}" data-enquiry-open="${esc(e.id)}" class="clickable">
                <td><strong>${esc(e.business)}</strong><small>${esc([e.type, researchLine(e.research)].filter(Boolean).join(" · ") || "—")}</small></td>
                <td>${fitBadge(e.research, e.researching)}</td>
                <td>${esc(e.name)}<small>${esc(e.email)}${e.phone ? ` · ${esc(e.phone)}` : ""}</small></td>
                <td>${[e.location, e.volume].filter(Boolean).map(esc).join("<br>") || `<span class="muted">—</span>`}</td>
                <td class="c-message">${esc(e.message) || `<span class="muted">—</span>`}</td>
                <td><small class="nowrap">${esc(date(e.receivedAt))}</small></td>
                <td class="row-actions"><button type="button" class="btn btn-sm" data-enquiry-reply="${esc(e.id)}">${e.convId ? "Conversation" : "Reply"}</button>${
                  (() => {
                    // Already an account: link to it instead.
                    const acct = enquiryAccount(e, t.accounts);
                    return acct ? `<button type="button" class="btn btn-sm" data-edit-account="${esc(acct.id)}">Account</button>` : `<button type="button" class="btn btn-sm" data-enquiry-account="${esc(e.id)}">Create account</button>`;
                  })()
                }</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : empty(state.enquiryFilter === "done" ? "None with an account yet" : "No open inquiries");
  }
  // The money figures belong with orders and accounts, not with quotes, inquiries or prospects.
  return `
    ${
      // Orders: what's to send out and what's to be paid. Accounts: the cafés, what they owe and
      // who's asking to join.
      state.sub === "orders"
        ? (() => {
            const toSend = t.wholesaleOrders.filter((o) => ["new", "packed"].includes(o.status));
            const invoiced = unpaid.filter((o) => wsState(o) !== "overdue");
            return `<section class="stats stats-3">
      <div class="card stat"><p class="stat-label">To send out</p><p class="stat-value">${toSend.length}</p><p class="stat-foot">${toSend.filter((o) => o.status === "new").length} to pack</p></div>
      <div class="card stat"><p class="stat-label">Invoiced</p><p class="stat-value">${money(invoiced.reduce((n, o) => n + o.total, 0))}</p><p class="stat-foot">${invoiced.length} not due yet</p></div>
      <div class="card stat"><p class="stat-label">Overdue</p><p class="stat-value${overdue.length ? " is-bad" : ""}">${money(overdue.reduce((n, o) => n + o.total, 0))}</p><p class="stat-foot">${overdue.length} invoice${overdue.length === 1 ? "" : "s"}</p></div>
    </section>`;
          })()
        : state.sub === "accounts"
        ? `<section class="stats stats-3">
      <div class="card stat"><p class="stat-label">Accounts</p><p class="stat-value">${t.accounts.filter((a) => !a.archivedAt).length}</p><p class="stat-foot">${new Set(unpaid.map((o) => o.wholesale?.accountId)).size} with unpaid invoices</p></div>
      <div class="card stat"><p class="stat-label">Unpaid</p><p class="stat-value">${money(unpaid.reduce((n, o) => n + o.total, 0))}</p><p class="stat-foot${overdue.length ? " is-bad" : ""}">${overdue.length ? `${money(overdue.reduce((n, o) => n + o.total, 0))} overdue` : "None overdue"}</p></div>
      <div class="card stat"><p class="stat-label">Open inquiries</p><p class="stat-value">${openEnq.length}</p></div>
    </section>`
        : ""
    }
    ${enqChips}${alerts}
    ${state.sub === "prospects" || state.sub === "documents" ? body : `<section class="card table-card">${body}</section>`}
    ${state.sub === "enquiries" && t.enquiries.length ? `<p class="table-foot"><a class="link" href="/admin/wholesale.csv" download>${icon("download", "i i-sm")} Export inquiries</a></p>` : ""}`;
}

/* ── Wholesale agreements: the text, and where each café's copy stands ── */

const agOf = (accountId) => state.trade?.agreements?.[accountId] || { waiting: null, signed: null };
// Where a café's agreement stands, and what can be done about it.
function agreementStatus(accountId) {
  const g = agOf(accountId);
  const v = state.contracts?.template?.version || state.trade?.contractsVersion;
  if (g.waiting) return { line: `Waiting since ${dayShort(g.waiting.sentAt)}`, badge: `<span class="badge t-yellow"><i></i>Waiting</span>` };
  if (g.signed) return { line: `${esc(g.signed.signer?.name || "")} · ${dayShort(g.signed.signedAt)}${v && g.signed.version < v ? ` · version ${g.signed.version}` : ""}`, badge: `<span class="badge s-completed"><i></i>Signed</span>` };
  return { line: "", badge: `<span class="badge"><i></i>Not sent</span>` };
}
function agreementButtons(accountId) {
  const g = agOf(accountId);
  const v = state.contracts?.template?.version || state.trade?.contractsVersion;
  return [
    g.waiting ? `<button type="button" class="btn btn-sm btn-ghost" data-ag-withdraw="${esc(g.waiting.id)}" data-ag-account="${esc(accountId)}">Withdraw</button>` : "",
    g.signed ? `<a class="btn btn-sm" href="/api/admin/trade/contracts/${esc(g.signed.id)}.pdf" download>Signed Copy</a>` : "",
    !g.signed || g.waiting || (v && g.signed.version < v) ? `<button type="button" class="btn btn-sm${g.waiting || g.signed ? "" : " btn-primary"}" data-ag-send="${esc(accountId)}">${g.waiting ? "Send Again" : g.signed ? "Send New Version" : "Send"}</button>` : "",
  ].join("");
}
// Wholesale › Documents: every agreement sent (waiting to be signed, signed, withdrawn), and
// the cafés that haven't been sent one.
const DOC_STATE = { draft: ["Draft", "t-blue"], sent: ["Waiting", "t-yellow"], signed: ["Signed", "s-completed"], withdrawn: ["Withdrawn", ""] };
function documentsTab() {
  const C = state.contracts;
  if (!C) return `<p class="muted">Loading…</p>`;
  const t = C.template;
  const docs = C.documents || [];
  const live = state.trade.accounts.filter((a) => !a.archivedAt);
  const unsent = live.filter((a) => !agOf(a.id).waiting && !agOf(a.id).signed);
  const waiting = docs.filter((d) => d.status === "sent");
  const signed = docs.filter((d) => d.status === "signed");
  const drafts = docs.filter((d) => d.status === "draft");
  const f = state.docFilter || (waiting.length ? "waiting" : drafts.length ? "drafts" : "all");
  const q = (...x) => matches(state.query, ...x);
  const U = C.usign || {};
  const viaUsign = t.via === "usign" && t.usign;
  const tpls = state.usignTemplates || (t.usign ? [t.usign] : []);
  const head = `<div class="ag-head">
      <div>${viaUsign ? `<strong>${esc(t.usign.name)}</strong><small>uSign template${t.usign.version != null ? ` · version ${esc(t.usign.version)}` : ""}</small>` : `<strong>${esc(t.title)}</strong><small>Version ${t.version}${t.updatedAt ? ` · ${esc(dayShort(t.updatedAt))}${t.updatedBy ? ` by ${esc(t.updatedBy)}` : ""}` : ""}</small>`}</div>
      <div class="ag-head-side">
        ${U.connected ? `<label class="ag-via"><span>Send With</span><select data-ag-via aria-label="Send with"><option value="portal" ${viaUsign ? "" : "selected"}>Our Portal</option>${tpls.map((x) => `<option value="${esc(x.id)}" ${viaUsign && t.usign.id === x.id ? "selected" : ""}>uSign · ${esc(x.name)}${x.version != null ? ` v${esc(x.version)}` : ""}</option>`).join("")}</select></label>` : ""}
        <label class="switch-row"><span><strong>Sign before ordering</strong></span><input type="checkbox" data-ag-required ${t.required ? "checked" : ""}><i aria-hidden="true"></i></label>
      </div>
    </div>
    ${viaUsign && U.webhook ? `<div class="ag-hook"><span><strong>uSign Webhook</strong><small>In uSign, send contract events to this address.</small></span><button type="button" class="btn btn-sm" data-copy-text="${esc(U.webhook)}">${icon("Link")}<span>Copy Address</span></button></div>` : ""}
    ${chips("Documents", [
      { filter: "docs:waiting", label: "Needs Signing", count: waiting.length, tone: "t-yellow", on: f === "waiting" },
      { filter: "docs:signed", label: "Signed", count: signed.length, tone: "s-completed", on: f === "signed" },
      { filter: "docs:drafts", label: "Drafts", count: drafts.length, tone: "t-blue", on: f === "drafts" },
      { filter: "docs:unsent", label: "Not Sent", count: unsent.length, on: f === "unsent" },
      { filter: "docs:all", label: "All", count: docs.length, on: f === "all" },
    ])}`;
  if (f === "unsent") {
    const rows = unsent.filter((a) => q(a.business, a.contactName, a.email));
    return `${head}<section class="card table-card">${
      rows.length
        ? `<table class="table ws-agreements is-labelled"><thead><tr><th>Café</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead><tbody>${rows.map((a) => `<tr><td>${who(a.business, a.contactName || a.email)}</td><td class="row-actions">${agreementButtons(a.id)}</td></tr>`).join("")}</tbody></table>`
        : `<div class="empty empty-lg">${icon("doc", "i i-xl")}<p><strong>${unsent.length ? "None match that search" : "Every café has one"}</strong></p></div>`
    }</section>`;
  }
  const shown = (f === "waiting" ? waiting : f === "signed" ? signed : f === "drafts" ? drafts : docs).filter((d) => q(d.business, d.title, d.signer?.name, d.signer?.email));
  const latest = (d) => {
    const g = agOf(d.accountId);
    return (g.waiting && g.waiting.id === d.id) || (g.signed && g.signed.id === d.id);
  };
  return `${head}<section class="card table-card">${
    shown.length
      ? `<table class="table ws-documents is-labelled">
      <thead><tr><th>Document</th><th>Café</th><th>Status</th><th>Sent</th><th>Signed</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${shown
        .map((d) => {
          const [label, tone] = DOC_STATE[d.status] || [d.status, ""];
          return `<tr${d.status === "withdrawn" ? ' class="is-archived"' : ""}>
            <td><strong>${esc(d.title)}</strong><small>${d.kind === "custom" ? `One-off${d.createdBy ? ` · by ${esc(d.createdBy)}` : ""}` : d.via === "usign" ? `uSign${d.sentTo ? ` · ${esc(d.sentTo)}` : ""}` : `Version ${d.version}${d.version < t.version && d.status !== "withdrawn" ? " · older" : ""}`}</small></td>
            <td><button type="button" class="doc-cafe" data-edit-account="${esc(d.accountId)}">${esc(d.business)}</button></td>
            <td><span class="badge ${tone}"><i></i>${label}</span></td>
            <td>${d.sentAt ? `${esc(dayShort(d.sentAt))}${d.sentBy && d.sentBy !== "portal" ? `<small>${esc(d.sentBy)}</small>` : ""}` : `<span class="muted">—</span>`}</td>
            <td${d.signedFrom ? ` title="${esc(d.signedFrom)}"` : ""}>${d.signedAt ? `${esc(d.signer?.name || "")}<small>${esc(dayShort(d.signedAt))}${d.signer?.title ? ` · ${esc(d.signer.title)}` : ""}</small>` : `<span class="muted">—</span>`}</td>
            <td class="row-actions">${d.status === "draft" ? `<button type="button" class="btn btn-sm" data-doc-edit="${esc(d.id)}">Edit</button><button type="button" class="btn btn-sm btn-primary" data-doc-send="${esc(d.id)}">Send</button>` : ""}${d.status === "sent" && d.kind === "custom" ? `<button type="button" class="btn btn-sm btn-ghost" data-ag-withdraw="${esc(d.id)}" data-ag-account="${esc(d.accountId)}">Withdraw</button>` : ""}${d.status === "sent" && d.kind !== "custom" && latest(d) ? `<button type="button" class="btn btn-sm btn-ghost" data-ag-withdraw="${esc(d.id)}" data-ag-account="${esc(d.accountId)}">Withdraw</button><button type="button" class="btn btn-sm" data-ag-send="${esc(d.accountId)}">Send Again</button>` : ""}${d.hasPdf ? `<a class="btn btn-sm" href="/api/admin/trade/contracts/${esc(d.id)}.pdf" download>PDF</a>` : ""}</td>
          </tr>`;
        })
        .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("doc", "i i-xl")}<p><strong>${f === "waiting" ? "Nothing waiting to be signed" : f === "signed" ? "Nothing signed yet" : f === "drafts" ? "No drafts" : state.query ? "None match that search" : "No documents yet"}</strong></p>${docs.length || !unsent.length ? "" : `<button type="button" class="btn btn-primary" data-chip="docs:unsent">Send the Agreement</button>`}</div>`
  }</section>`;
}
// A one-off document for a café: write it (or read the assistant's draft), save, send.
function docPanel(d = null) {
  const accounts = state.trade.accounts.filter((a) => !a.archivedAt);
  const drawer = openPanel(
    d ? "Edit Document" : "New Document",
    `<form class="form-stack" id="doc-form" data-doc-form>
      ${d ? `<p class="muted">${esc(d.business)}${d.createdBy ? ` · drafted by ${esc(d.createdBy)}` : ""}</p>` : `<label class="field"><span>Café</span><select name="accountId" required><option value="">Pick a café</option>${accounts.map((a) => `<option value="${esc(a.id)}">${esc(a.business)}</option>`).join("")}</select></label>`}
      <label class="field"><span>Title</span><input name="docTitle" maxlength="120" required value="${esc(d?.title || "")}" placeholder="Equipment Loan Agreement"></label>
      <label class="field"><span>Document</span><textarea name="text" rows="20" class="ag-body" required>${esc(d?.text || "")}</textarea></label>
      <p class="form-error" data-doc-error role="alert"></p>
    </form>`,
    {
      modal: true,
      footer: `<div class="modal-foot-side">${d ? `<button type="button" class="btn btn-ghost is-danger" data-doc-delete>Delete</button>` : ""}</div><div class="modal-foot-side"><button type="submit" form="doc-form" class="btn">Save Draft</button><button type="button" class="btn btn-primary" data-doc-save-send>Send to Sign</button></div>`,
    }
  );
  const f = $("[data-doc-form]", drawer) as HTMLFormElement;
  const err = $("[data-doc-error]", drawer);
  let id = d?.id || "";
  const save = async () => {
    const body = { title: (f.elements.namedItem("docTitle") as HTMLInputElement).value, text: (f.elements.namedItem("text") as HTMLTextAreaElement).value };
    const r = id ? await api(`/api/admin/trade/contracts/${id}`, { method: "PATCH", body }) : await api("/api/admin/trade/contracts/drafts", { method: "POST", body: { ...body, accountId: (f.elements.namedItem("accountId") as HTMLSelectElement).value } });
    if (r.id) id = r.id;
    state.contracts.documents = r.documents;
  };
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    err.textContent = "";
    try {
      await save();
      closeDrawer();
      state.docFilter = "drafts";
      toast("Draft saved.");
      render();
    } catch (error) {
      err.textContent = error.message;
    }
  });
  drawer.addEventListener("click", async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-doc-save-send]")) {
      err.textContent = "";
      if (!f.reportValidity()) return;
      try {
        await save();
        const acct = state.trade.accounts.find((a) => a.id === state.contracts.documents.find((x) => x.id === id)?.accountId);
        if (!confirm(`Send it to ${acct?.business || "the café"} to sign? We'll email their owners.`)) return;
        const r = await api(`/api/admin/trade/contracts/${id}/send`, { method: "POST" });
        state.contracts.documents = r.documents;
        closeDrawer();
        state.docFilter = "waiting";
        toast(`Sent to ${acct?.business || "the café"}.`);
        render();
      } catch (error) {
        err.textContent = error.message;
      }
    }
    if (t.closest("[data-doc-delete]") && confirm("Delete this draft?")) {
      try {
        const r = await api(`/api/admin/trade/contracts/${id}`, { method: "DELETE" });
        state.contracts.documents = r.documents;
        closeDrawer();
        toast("Draft deleted.");
        render();
      } catch (error) {
        err.textContent = error.message;
      }
    }
  });
}

// Editing the text: a title, the agreement, and the café's details it can fill in.
function agreementEditor() {
  const C = state.contracts;
  const t = C.template;
  const drawer = openPanel(
    "Edit Agreement",
    `<form class="form-stack" id="ag-form" data-ag-form>
      <label class="field"><span>Title</span><input name="title" maxlength="120" value="${esc(t.title)}" required></label>
      <div class="field"><span>Fill In</span><div class="ag-fields">${Object.entries(C.fields).map(([k, label]) => `<button type="button" class="btn btn-sm" data-ag-field="${esc(k)}" title="${esc(label as string)}">${esc(label as string)}</button>`).join("")}</div></div>
      <label class="field"><span>Agreement</span><textarea name="body" rows="22" class="ag-body" required>${esc(t.body)}</textarea></label>
      <p class="form-error" data-ag-error role="alert"></p>
    </form>`,
    { modal: true, footer: `<div class="modal-foot-side"></div><div class="modal-foot-side"><button type="submit" form="ag-form" class="btn btn-primary">Save</button></div>` }
  );
  const f = $("[data-ag-form]", drawer) as HTMLFormElement;
  const area = f.body as HTMLTextAreaElement;
  drawer.addEventListener("click", (e) => {
    const b = (e.target as HTMLElement).closest("[data-ag-field]") as HTMLElement;
    if (!b) return;
    const tag = `{${b.dataset.agField}}`;
    const [a, z] = [area.selectionStart, area.selectionEnd];
    area.setRangeText(tag, a, z, "end");
    area.focus();
  });
  f.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = $("[data-ag-error]", drawer);
    try {
      state.contracts = await api("/api/admin/trade/contracts", { method: "PUT", body: { title: (f.elements.namedItem("title") as HTMLInputElement).value, body: area.value } });
      closeDrawer();
      toast(`Saved as version ${state.contracts.template.version}.`);
      render();
    } catch (error) {
      err.textContent = error.message;
    }
  });
}
async function contractsClick(t) {
  if (t.closest("[data-doc-new]")) {
    if (!state.contracts) state.contracts = await api("/api/admin/trade/contracts");
    return docPanel(), true;
  }
  const de = t.closest("[data-doc-edit]");
  if (de) return docPanel(state.contracts.documents.find((x) => x.id === de.dataset.docEdit)), true;
  const ds = t.closest("[data-doc-send]");
  if (ds) {
    const d = state.contracts.documents.find((x) => x.id === ds.dataset.docSend);
    if (!d || !confirm(`Send “${d.title}” to ${d.business} to sign? We'll email their owners.`)) return true;
    ds.disabled = true;
    try {
      const r = await api(`/api/admin/trade/contracts/${d.id}/send`, { method: "POST" });
      state.contracts.documents = r.documents;
      toast(`Sent to ${d.business}.`);
      render();
    } catch (error) {
      ds.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  if (t.closest("[data-ag-edit]")) {
    if (!state.contracts) state.contracts = await api("/api/admin/trade/contracts");
    return agreementEditor(), true;
  }
  const send = t.closest("[data-ag-send]");
  const off = t.closest("[data-ag-withdraw]");
  if (!send && !off) return false;
  const accountId = send ? send.dataset.agSend : off.dataset.agAccount;
  const acct = state.trade.accounts.find((a) => a.id === accountId);
  if (off && !confirm(`Withdraw the agreement waiting for ${acct?.business || "this café"}?`)) return true;
  const b = send || off;
  b.disabled = true;
  try {
    const r = send ? await api("/api/admin/trade/contracts/send", { method: "POST", body: { accountId } }) : await api(`/api/admin/trade/contracts/${encodeURIComponent(off.dataset.agWithdraw)}`, { method: "DELETE" });
    state.trade.agreements = { ...(state.trade.agreements || {}), [accountId]: r.agreement };
    if (state.contracts && r.documents) state.contracts.documents = r.documents;
    toast(send ? `Sent to ${acct?.business || "the café"}.` : "Withdrawn.");
    render();
    if (state.page !== "wholesale" || state.sub !== "documents") accountForm(acct);
  } catch (error) {
    b.disabled = false;
    toast(error.message, "error");
  }
  return true;
}
document.addEventListener("change", async (e) => {
  const sel = e.target as HTMLSelectElement;
  if (sel.matches?.("[data-ag-via]")) {
    const tpl = (state.usignTemplates || []).find((x) => x.id === sel.value) || (state.contracts.template.usign?.id === sel.value ? state.contracts.template.usign : null);
    try {
      state.contracts = await api("/api/admin/trade/contracts", { method: "PUT", body: sel.value === "portal" ? { via: "portal" } : { via: "usign", usign: tpl } });
      toast(sel.value === "portal" ? "Agreements are signed in the portal." : `Agreements go out from uSign: ${tpl?.name || ""}.`);
      render();
    } catch (error) {
      toast(error.message, "error");
      render();
    }
    return;
  }
  const el = e.target as HTMLInputElement;
  if (!el.matches?.("[data-ag-required]")) return;
  try {
    state.contracts = await api("/api/admin/trade/contracts", { method: "PUT", body: { required: el.checked } });
    state.trade.contractsRequired = state.contracts.template.required;
    toast(el.checked ? "Cafés sign the agreement before they can order." : "Cafés can order without signing.");
  } catch (error) {
    el.checked = !el.checked;
    toast(error.message, "error");
  }
});

/* ── Wholesale samples: cafés asking to taste before they order ── */

const CSAMPLE_STATE = { requested: "Requested", roasting: "Roasting", sent: "Sent", tasted: "Tasted", cancelled: "Cancelled" };
const CSAMPLE_TONE = { requested: "t-yellow", roasting: "t-blue", sent: "s-completed", tasted: "s-completed", cancelled: "" };
const CSAMPLE_TASTE = { loved: "Loved it", good: "Good", no: "Not for us" };
const CSAMPLE_BREW = { espresso: "Espresso", filter: "Filter", both: "Espresso and filter" };

function cafeSamplesTab() {
  const all = state.trade.samples || [];
  if (!all.length) return `<div class="empty empty-lg">${icon("FlaskConical", "i i-xl")}<p><strong>No sample requests yet</strong></p><p class="empty-line">Cafés ask for samples from their portal.</p></div>`;
  const shown = all.filter((x) => matches(state.query, x.business, x.by, ...x.coffees.map((c) => c.name)));
  if (!shown.length) return `<div class="empty empty-lg">${icon("FlaskConical", "i i-xl")}<p><strong>No requests match that search</strong></p></div>`;
  const open = (x) => ["requested", "roasting"].includes(x.status);
  return `<table class="table ws-samples is-labelled">
    <thead><tr><th>Café</th><th>Coffees</th><th>Getting them</th><th>Status</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
    <tbody>${[...shown.filter(open), ...shown.filter((x) => !open(x))]
      .map(
        (x) => `<tr data-csample="${esc(x.id)}"${x.status === "cancelled" ? ' class="is-archived"' : ""}>
          <td>${who(x.business, `${x.order ? `${esc(x.order)} · ` : ""}${esc(date(x.at))}`)}</td>
          <td>${x.coffees.map((c) => `${esc(c.name)}${x.feedback?.ratings?.[c.id] ? ` <span class="muted">· ${CSAMPLE_TASTE[x.feedback.ratings[c.id]]}</span>` : ""}`).join("<br>")}<small>${esc(CSAMPLE_BREW[x.brew] || "")}</small>${x.feedback?.note ? `<small>“${esc(x.feedback.note)}”</small>` : x.note ? `<small>${esc(x.note)}</small>` : ""}</td>
          <td>${x.how === "pickup" ? "Pick up" : "Deliver"}${x.location ? `<small>${esc(x.location)}</small>` : ""}</td>
          <td><span class="badge ${CSAMPLE_TONE[x.status] || ""}"><i></i>${x.status === "sent" && x.how === "pickup" ? "Ready" : CSAMPLE_STATE[x.status] || esc(x.status)}</span>${x.sentAt && x.status !== "cancelled" ? `<small>${x.how === "pickup" ? "Ready" : "Sent"} ${esc(date(x.sentAt))}</small>` : ""}</td>
          <td class="row-actions">${
            x.status === "requested"
              ? `<button type="button" class="btn btn-sm" data-csample-step="roasting">Roasting</button>`
              : x.status === "roasting"
              ? `<button type="button" class="btn btn-sm btn-primary" data-csample-step="sent">${x.how === "pickup" ? "Ready" : "Sent"}</button>`
              : ""
          }${open(x) ? `<button type="button" class="btn btn-sm btn-ghost" data-csample-step="cancelled">Cancel</button>` : ""}${x.order ? `<button type="button" class="btn btn-sm btn-ghost" data-row="${esc(x.order)}">Order</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-edit-account="${esc(x.accountId)}">Account</button>`}</td>
        </tr>`
      )
      .join("")}</tbody></table>`;
}

async function cafeSamplesClick(t) {
  const b = t.closest("[data-csample-step]");
  if (!b) return false;
  const id = b.closest("[data-csample]").dataset.csample;
  const step = b.dataset.csampleStep;
  const x = (state.trade.samples || []).find((s) => s.id === id);
  if (step === "cancelled" && !confirm(`Cancel the samples for ${x?.business || "this café"}?`)) return true;
  b.disabled = true;
  try {
    const { sample } = await api(`/api/admin/trade/samples/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: step } });
    if (x) Object.assign(x, sample);
    toast(step === "sent" ? `${x?.business || "The café"} has been told.` : step === "roasting" ? "Marked as roasting." : "Request cancelled.");
    render();
  } catch (error) {
    b.disabled = false;
    toast(error.message, "error");
  }
  return true;
}

/* ── Wholesale research: enquiries and prospects ── */

// A count like Instagram shows it: 812, 8.1K, 24K, 1.2M.
const shortCount = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e4 ? `${Math.round(x / 1e3)}K` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : String(x ?? "—"));
const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
};
// Where a fact came from, as a short link.
const foundOn = (source) => (source === "OpenStreetMap" ? "Map listings" : source);
const sourceLink = (url) => (url === "enquiry" ? `<span>Their inquiry</span>` : url ? `<a class="link" href="${esc(url)}" target="_blank" rel="noopener">${esc(/openstreetmap\.org/.test(url) ? "Map listing" : /google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps/.test(url) ? "Google Maps" : /instagram\.com/.test(url) ? "Instagram" : hostOf(url) + (new URL(url).pathname.length > 1 ? new URL(url).pathname.replace(/\/$/, "") : ""))}</a>` : "");

// The fit as three levels, like an order's risk: Strong 70+, Possible 40–69, Weak under 40.
const fitLevel = (score) => (score >= 70 ? ["low", "Strong"] : score >= 40 ? ["medium", "Possible"] : ["high", "Weak"]);
const fitBadge = (r, researching) => {
  if (researching) return `<span class="badge"><i></i>Researching…</span>`;
  if (!r?.fit) return `<span class="muted">—</span>`;
  if (r.fit.out) return `<span class="fit-badge is-high"><strong>0</strong><small>${esc(r.fit.out.tag || "Roaster")}</small></span>`;
  const [tone, label] = fitLevel(r.fit.score);
  return `<span class="fit-badge is-${tone}"><strong>${r.fit.score}</strong><small>${label}</small></span>`;
};
// One line of what stands out: rating, Instagram, locations.
const researchLine = (r) => {
  if (!r?.facts) return "";
  const f = (k) => r.facts.find((x) => x.key === k);
  return [f("rating") && `${f("rating").stars}★ (${shortCount(f("rating").reviews)})`, f("followers") && `${shortCount(Number(f("followers").value))} on Instagram`, f("locations") && f("locations").value, f("closed") && "Closed on Google Maps"].filter(Boolean).join(" · ");
};

// The research on one business: fit (each signal, its points and source), then every fact found.
function researchCard(r, { researching = false, what = "this business", middle = "" } = {}) {
  if (researching && !r) return `<section class="panel"><h3 class="panel-title">Research</h3><p class="muted">Looking up ${esc(what)}…</p></section>${middle}`;
  if (!r) return `<section class="panel"><h3 class="panel-title">Research</h3><p class="muted">Not researched yet.</p></section>${middle}`;
  const [tone, label] = r.fit ? fitLevel(r.fit.score) : ["", ""];
  const levels = [["low", "Strong"], ["medium", "Possible"], ["high", "Weak"]];
  const fit = r.fit
    ? `<section class="panel fit-card">
        <div class="amb-check-head"><h3>Fit</h3>${researching ? `<span class="badge"><i></i>Researching…</span>` : ""}</div>
        <p class="amb-check-score"><strong>${r.fit.score}</strong> out of 100 · ${r.fit.out ? esc(r.fit.out.label || "Roasts its own coffee") : label}</p>
        ${r.fit.out ? `<p class="fit-out">${esc(r.fit.out.why)}${r.fit.out.source ? ` · ${sourceLink(r.fit.out.source)}` : ""}</p>` : ""}
        <div class="risk-meter is-${tone}" role="img" aria-label="${label} fit">${levels.map(([l, t]) => `<span class="${l === tone ? "is-on" : ""}"><i></i>${t}</span>`).join("")}</div>
        <ul class="fit-signals">${r.fit.signals
          .map((s) => `<li class="${s.points ? "is-on" : ""}"><span class="fit-pts">${s.points}<small>/${s.max}</small></span><span><strong>${esc(s.label)}</strong><small>${s.points ? `${esc(s.why)}${s.source ? ` · ${sourceLink(s.source)}` : ""}` : "Not found"}</small></span></li>`)
          .join("")}</ul>
        <p class="muted fit-note">Checked ${esc(dayShort(r.at))}</p>
      </section>`
    : "";
  const facts = r.facts;
  return `${fit}${middle}
    <section class="panel">
      <h3 class="panel-title">What we found</h3>
      ${
        facts.length
          ? `<dl class="kv research-facts">${facts.map((f) => `<div><dt>${esc(f.label)}</dt><dd>${f.key === "contactPage" || f.key === "igWebsite" ? `<a class="link" href="${esc(f.value)}" target="_blank" rel="noopener">${esc(hostOf(f.value))}</a>` : f.key === "followers" ? esc(Number(f.value).toLocaleString("en-US")) : esc(f.value)}<small>${sourceLink(f.source)}</small></dd></div>`).join("")}</dl>`
          : `<p class="muted">Nothing found.</p>`
      }
      ${r.notes?.length ? `<ul class="research-notes">${r.notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
      ${r.check ? `<p class="muted">Instagram audience: ${r.check.score}% genuine, estimated (${shortCount(r.check.followers)} followers).</p>` : ""}
    </section>`;
}

// Wholesale → Prospects: find businesses, then each one's fit, newest searches researched in the background.
function prospectsTab() {
  const v = state.pros;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const filter = state.prospectFilter || "new";
  const by = (s) => v.prospects.filter((p) => p.status === s);
  // By type (what the search was for), within the status picked.
  const kind = state.prospectKind || "all";
  const kinds = [...v.types, { id: "manual", label: "Added by hand" }]
    .map((t) => ({ ...t, n: by(filter).filter((p) => (p.type || "manual") === t.id).length }))
    .filter((t) => t.n || t.id === kind);
  const shown = by(filter).filter((p) => kind === "all" || (p.type || "manual") === kind);
  const left = Math.max(0, v.config.capUsd - v.spend.usd);
  return `
    ${candidatesCard(v.candidates || [])}
    <section class="card prospect-find">
      <form class="prospect-form" data-prospect-find>
        <label class="field"><span>Area</span><input name="area" value="${esc(state.prospectArea || "Los Angeles, CA")}" placeholder="Silver Lake, Los Angeles" required></label>
        <label class="field"><span>Type</span><select name="type">${v.types.map((t) => `<option value="${t.id}" ${t.id === (state.prospectType || "cafe") ? "selected" : ""}>${esc(t.label)}</option>`).join("")}</select></label>
        ${v.screening ? `<label class="field field-wide"><span>Looking For</span><input name="wanted" maxlength="200" value="${esc(state.prospectWanted || "")}" placeholder="Independent, serves brunch"></label>` : ""}
        <button type="submit" class="btn btn-primary">${icon("search")}<span>Find</span></button>
      </form>
      <div class="prospect-tools">
        <button type="button" class="btn btn-sm" data-prospect-near>${icon("search")}<span>Near Our Best Accounts</span></button>
        <button type="button" class="btn btn-sm toggle-btn" data-prospect-more aria-expanded="${state.prospectMore ? "true" : "false"}"><span>Add One by Hand</span>${icon("ChevronDown")}</button>
      </div>
      <div class="prospect-more" ${state.prospectMore ? "" : "hidden"}>
        <form class="prospect-form" data-prospect-add>
          <label class="field"><span>Business</span><input name="name" required maxlength="120"></label>
          <label class="field"><span>Website or Instagram</span><input name="site" maxlength="200" placeholder="cafe.com or @cafe"></label>
          <label class="field"><span>City</span><input name="city" maxlength="80" placeholder="Los Angeles, CA"></label>
          <button type="submit" class="btn">Add</button>
        </form>
        <form class="prospect-form" data-prospect-cap>
          <label class="field"><span>Lookup limit per month</span><span class="tax-input"><input name="capUsd" inputmode="decimal" value="${v.config.capUsd}"><i>USD</i></span></label>
          <button type="button" class="btn btn-sm" data-dnc-open>Do-Not-Contact List · ${v.outreach?.doNotContact || 0}</button>
          <label class="field"><span>Outreach emails per day</span><input name="dailyCap" inputmode="numeric" value="${v.config.dailyCap || 20}"></label>
          <label class="field"><span>Usual price per pound</span><span class="tax-input"><input name="pricePerLb" inputmode="decimal" value="${v.config.pricePerLb || 16}"><i>USD</i></span></label>
          <button type="submit" class="btn">Save</button>
          <p class="muted">${v.anyapi ? `${money(v.spend.usd)} used this month, ${money(left)} left.` : "Google Maps search isn't connected yet."}</p>
        </form>
      </div>
      <p class="form-error" data-prospect-error role="alert"></p>
    </section>
    ${chips("Prospects", [
      { filter: "prospects:new", label: "To review", count: by("new").length, tone: "t-yellow", on: filter === "new" },
      { filter: "prospects:approved", label: "Approved", count: by("approved").length, tone: "s-completed", on: filter === "approved" },
      { filter: "prospects:contacted", label: "Contacted", count: by("contacted").length, tone: "t-blue", on: filter === "contacted" },
      { filter: "prospects:samples", label: "Samples", count: by("samples").length, tone: "t-orange", on: filter === "samples" },
      { filter: "prospects:interested", label: "Interested", count: by("interested").length, tone: "t-purple", on: filter === "interested" },
      { filter: "prospects:won", label: "Won", count: by("won").length, tone: "t-green", on: filter === "won" },
      { filter: "prospects:rejected", label: "Not a fit", count: by("rejected").length, tone: "s-cancelled", on: filter === "rejected" },
    ])}
    ${kinds.length > 1 || kind !== "all" ? chips("Prospect type", [{ filter: "prospectkind:all", label: "All types", count: by(filter).length, on: kind === "all" }, ...kinds.map((t) => ({ filter: `prospectkind:${t.id}`, label: t.label, count: t.n, on: kind === t.id }))], "chips-kind") : ""}
    ${pipelineLine(v)}
    <section class="card table-card">${
      shown.length
        ? `<table class="table prospect-table is-labelled">
          <thead><tr><th>Business</th><th>Fit</th><th>Stands out</th><th>Found</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
          <tbody>${shown
            .map(
              (p) => `<tr data-prospect="${esc(p.id)}" class="clickable">
                <td>${who(p.name, esc([p.category, p.city || p.address].filter(Boolean).join(" · ") || "—"))}</td>
                <td>${fitBadge(p.research, p.researching)}</td>
                <td><small>${p.research?.fit?.out ? esc(`${p.research.fit.out.label || "Roasts its own coffee"}: ${p.research.fit.out.why}`) : p.outWhy ? esc(p.outWhy) : esc(researchLine(p.research)) || `<span class="muted">${p.researching ? "…" : "—"}</span>`}</small></td>
                <td><small class="nowrap">${esc(foundOn(p.source))}<br>${esc(dayShort(p.foundAt))}</small></td>
                <td class="row-actions">${
                  p.status === "new"
                    ? `<button type="button" class="btn btn-sm" data-prospect-set="approved">Approve</button><button type="button" class="btn btn-sm btn-ghost" data-prospect-set="rejected">Not a Fit</button>`
                    : p.status === "rejected"
                      ? `<button type="button" class="btn btn-sm btn-ghost" data-prospect-set="new">Undo</button>`
                      : p.status === "contacted" || p.status === "samples"
                        ? `<button type="button" class="btn btn-sm" data-prospect-set="interested">Interested</button><button type="button" class="btn btn-sm btn-ghost" data-prospect-set="rejected">Not a Fit</button>`
                        : p.status === "interested"
                          ? `<button type="button" class="btn btn-sm" data-prospect-draft>Create Account</button>`
                          : p.status === "won"
                            ? `<a class="btn btn-sm btn-ghost" href="#wholesale/accounts">Account</a>`
                            : `<button type="button" class="btn btn-sm" data-prospect-draft>${p.draft ? "Email Draft" : "Draft Email"}</button><button type="button" class="btn btn-sm btn-ghost" data-prospect-set="contacted">Contacted</button>`
                }</td>
              </tr>`
            )
            .join("")}</tbody></table>`
        : `<div class="empty empty-lg">${icon("search", "i i-xl")}<p><strong>${filter === "new" ? "Nothing to review" : filter === "approved" ? "None approved yet" : filter === "contacted" ? "No one contacted yet" : filter === "samples" ? "No samples out" : filter === "interested" ? "No one interested yet" : filter === "won" ? "None won yet" : "None marked"}${kind !== "all" ? ` in ${esc(kinds.find((t) => t.id === kind)?.label || "this type")}` : ""}</strong></p></div>`
    }</section>`;
}

// A call's time as the roastery has it: "Tue, Nov 3 at 9:30am".
const callWhen = (day, time) => {
  const [h, m] = time.split(":").map(Number);
  return `${new Date(`${day}T12:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" })} at ${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
};
// A prospect's likely monthly value: coffee a week × the usual price per pound.
const prospectValue = (p, v) => (p.weeklyLbs ? Math.round((p.weeklyLbs * 52) / 12 * (v.config.pricePerLb || 16)) : 0);
const perMonth = (n) => `${n >= 1000 ? `$${(n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : money(n).replace(/\.00$/, "")}/mo`;
// What's in play, by stage, once any prospect has a weekly amount.
function pipelineLine(v) {
  const stages = [["contacted", "Contacted"], ["samples", "Samples"], ["interested", "Interested"], ["won", "Won"]];
  const parts = stages.map(([k, label]) => [label, v.prospects.filter((p) => p.status === k).reduce((n, p) => n + prospectValue(p, v), 0)]).filter(([, n]) => n);
  return parts.length ? `<p class="pros-pipeline">${parts.map(([label, n]) => `<span><small>${label}</small><strong>${perMonth(n)}</strong></span>`).join("")}</p>` : "";
}

// Our own customers who could be wholesale, best first: why each one, what they've bought, and
// Add to Prospects or Dismiss. 70+ leads; the rest fold under Show All.
function candidatesCard(list) {
  if (!list.length) return "";
  const shown = state.candidatesAll ? list : list.slice(0, 5);
  return `<section class="card table-card cand-card">
    <header class="card-head"><h2>Customers Who Could Be Wholesale</h2><span class="muted">${list.length}</span></header>
    <table class="table cand-table is-labelled">
      <thead><tr><th>Customer</th><th>Fit</th><th>Why</th><th class="num">Bought</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
      <tbody>${shown
        .map((c) => {
          const [tone, label] = fitLevel(c.score);
          return `<tr data-cand="${esc(c.key)}">
            <td>${who(c.name || c.email, esc([c.company, c.name ? c.email : ""].filter(Boolean).join(" · ")))}</td>
            <td><span class="fit-badge is-${tone}"><strong>${c.score}</strong><small>${label}</small></span></td>
            <td><ul class="cand-why">${c.reasons.map((r) => `<li>${esc(r.why)}</li>`).join("")}</ul></td>
            <td class="num"><small class="nowrap">${c.orders ? `${money(c.spent)}<br>${c.orders} order${c.orders === 1 ? "" : "s"}` : `<span class="muted">—</span>`}</small></td>
            <td class="row-actions"><button type="button" class="btn btn-sm" data-cand-add>Add to Prospects</button><button type="button" class="btn btn-sm btn-ghost" data-cand-dismiss>Dismiss</button></td>
          </tr>`;
        })
        .join("")}</tbody>
    </table>
    ${list.length > 5 ? `<div class="card-foot"><button type="button" class="btn btn-sm btn-ghost" data-cand-all>${state.candidatesAll ? "Show Fewer" : `Show All ${list.length}`}</button></div>` : ""}
  </section>`;
}

// While anything is being researched, check again every few seconds.
let researchPoll = null;
function pollResearch() {
  clearTimeout(researchPoll);
  const busy = state.page === "wholesale" && ((state.sub === "prospects" && state.pros?.prospects.some((p) => p.researching)) || (state.sub === "enquiries" && state.trade?.enquiries.some((e) => e.researching)));
  if (!busy) return;
  researchPoll = setTimeout(async () => {
    if (state.page !== "wholesale" || state.panel) return pollResearch();
    try {
      if (state.sub === "prospects") state.pros = await api("/api/admin/prospects");
      else state.trade = await api("/api/admin/trade");
      render();
    } catch {}
    pollResearch();
  }, 4000);
}

// An enquiry as a page: what they told us, and what we found on their business.
function enquiryPanel(id) {
  const e = state.trade.enquiries.find((x) => x.id === id);
  if (!e) return;
  const acct = enquiryAccount(e, state.trade.accounts);
  const actions = `<button type="button" class="btn" data-enq-research>${icon("synced")}<span>${e.research ? "Research Again" : "Research"}</span></button>
    <button type="button" class="btn" data-enquiry-reply="${esc(e.id)}">${e.convId ? "Conversation" : "Reply"}</button>
    ${acct ? `<button type="button" class="btn btn-primary" data-edit-account="${esc(acct.id)}">Account</button>` : `<button type="button" class="btn btn-primary" data-enquiry-account="${esc(e.id)}">Create Account</button>`}`;
  const site = e.site ? (/^@|instagram\.com/i.test(e.site) ? `https://www.instagram.com/${e.site.replace(/^@|.*instagram\.com\//gi, "").replace(/\/.*$/, "")}/` : /^https?:/i.test(e.site) ? e.site : `https://${e.site}`) : "";
  const drawer = openPanel(e.business, `
    <div class="order-cols">
      <div class="order-main">${researchCard(e.research, { researching: e.researching, what: e.business })}</div>
      <div class="order-side">
        <section class="panel">
          <h3 class="panel-title">Inquiry</h3>
          <dl class="kv">
            <div><dt>Contact</dt><dd>${esc(e.name)}<small><a class="link" href="mailto:${esc(e.email)}">${esc(e.email)}</a>${e.phone ? ` · ${esc(e.phone)}` : ""}</small></dd></div>
            ${e.type ? `<div><dt>Type</dt><dd>${esc(e.type)}</dd></div>` : ""}
            ${e.location ? `<div><dt>City</dt><dd>${esc(e.location)}</dd></div>` : ""}
            ${e.site ? `<div><dt>Website or Instagram</dt><dd><a class="link" href="${esc(site)}" target="_blank" rel="noopener">${esc(e.site)}</a></dd></div>` : ""}
            ${e.interest ? `<div><dt>Interested in</dt><dd>${esc(e.interest)}</dd></div>` : ""}
            ${e.volume ? `<div><dt>Coffee per week</dt><dd>${esc(e.volume)}</dd></div>` : ""}
            <div><dt>Received</dt><dd>${esc(dayShort(e.receivedAt))}</dd></div>
          </dl>
        </section>
        ${e.message ? `<section class="panel"><h3 class="panel-title">Their message</h3><p class="creator-why">${esc(e.message)}</p></section>` : ""}
      </div>
    </div>`, { page: "Wholesale", actions, badges: acct ? `<span class="badge s-completed"><i></i>Has account</span>` : `<span class="badge t-yellow"><i></i>Open</span>`, subtitle: [e.type, e.location].filter(Boolean).join(" · ") });
  const own = drawer.onclick;
  drawer.onclick = async (ev) => {
    const b = ev.target.closest("[data-enq-research]");
    if (!b) return own?.call(drawer, ev);
    b.disabled = true;
    b.querySelector("span").textContent = "Researching…";
    try {
      const { enquiry } = await api(`/api/admin/wholesale/enquiries/${id}/research`, { method: "POST", body: {} });
      Object.assign(e, enquiry);
      enquiryPanel(id);
    } catch (error) {
      b.disabled = false;
      panelError(error.message);
    }
  };
}

// A prospect as a page: the fit and facts, then an email draft for the team to send themselves.
function prospectPanel(id) {
  const p = state.pros.prospects.find((x) => x.id === id);
  if (!p) return;
  const r = p.research;
  const email = p.contactEmail || r?.facts.find((f) => f.key === "email")?.value || "";
  const people = p.contacts?.people || [];
  const contacts = `<section class="panel">
      <h3 class="panel-title">People</h3>
      ${
        people.length
          ? `<ul class="pros-people">${people
              .map(
                (x) => `<li class="pros-person${x.email && x.email === p.contactEmail ? " is-picked" : ""}">
                  <strong>${esc(x.name || x.email)}</strong>
                  ${x.title ? `<span>${esc(x.title)}</span>` : ""}
                  ${x.email && x.name ? `<span>${esc(x.email)}</span>` : ""}
                  ${x.phone ? `<span>${esc(x.phone)}</span>` : ""}
                  <div class="btn-row">
                    ${x.email && x.email !== p.contactEmail ? `<button type="button" class="btn btn-sm" data-contact-pick="${esc(x.email)}">Email Them</button>` : ""}
                    ${x.linkedin ? `<a class="btn btn-sm" href="${esc(x.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>` : ""}
                  </div>
                </li>`
              )
              .join("")}</ul>`
          : p.contacts
            ? `<p class="muted">No one found.</p>`
            : ""
      }
      ${p.website && state.pros.anyapi ? `<button type="button" class="btn btn-sm" data-prospect-contacts><span>${p.contacts ? "Look Again" : "Find Contacts"}</span></button>` : !p.website ? `<p class="muted">Needs their website.</p>` : ""}
    </section>`;
  const STATUS = { new: ["t-yellow", "To review"], approved: ["s-completed", "Approved"], contacted: ["t-blue", "Contacted"], samples: ["t-orange", "Samples"], interested: ["t-purple", "Interested"], won: ["t-green", "Won"], rejected: ["s-cancelled", "Not a fit"] };
  const [cls, label] = STATUS[p.status] || STATUS.new;
  // The next step for where it is: approve, reach out, hear back, open an account.
  const next = {
    new: `<button type="button" class="btn btn-primary" data-prospect-set="approved">Approve</button>`,
    rejected: `<button type="button" class="btn btn-primary" data-prospect-set="approved">Approve</button>`,
    approved: `<button type="button" class="btn" data-prospect-set="contacted">Contacted</button><button type="button" class="btn btn-primary" data-prospect-account>Create Account</button>`,
    contacted: `<button type="button" class="btn" data-samples-open>Samples Sent</button><button type="button" class="btn btn-primary" data-prospect-account>Create Account</button>`,
    samples: `<button type="button" class="btn" data-prospect-set="interested">Interested</button><button type="button" class="btn btn-primary" data-prospect-account>Create Account</button>`,
    interested: `<button type="button" class="btn btn-primary" data-prospect-account>Create Account</button>`,
    won: `<a class="btn btn-primary" href="#wholesale/accounts">Account</a>`,
  }[p.status] || "";
  const actions = `<button type="button" class="btn" data-prospect-research>${icon("synced")}<span>Research Again</span></button>
    ${next}
    <details class="order-menu">
      <summary class="btn">More actions${icon("ChevronDown")}</summary>
      <div class="order-menu-list">
        ${p.status !== "rejected" ? `<button type="button" data-prospect-set="rejected">${icon("close")}<span>Not a Fit</span></button>` : `<button type="button" data-prospect-set="new">${icon("edit")}<span>Back to Review</span></button>`}
        ${state.pros.tasting?.on && state.pros.tasting.links?.[p.id] ? `<button type="button" data-tasting-copy>${icon("calendar")}<span>Copy Tasting Link</span></button>` : ""}
        <button type="button" class="is-danger" data-prospect-delete>${icon("trash")}<span>Delete</span></button>
      </div>
    </details>`;
  // Outreach: the first email and two follow-ups, written here and sent from our address in
  // working hours; a reply stops what's left. Before it starts, the drafts; after, each step.
  const o = p.outreach;
  const ov = state.pros.outreach || { senders: [], followDays: [0, 4, 10], dailyCap: 20 };
  const first = (people.find((x) => x.email === email)?.name || "").split(" ")[0];
  const hi = first ? `Hi ${first},` : "Hi there,";
  const follow = [
    "",
    `${hi}\n\nJust floating this back up in case it got buried. Happy to drop off a few bags for your team to try, no strings attached.`,
    `${hi}\n\nI'll leave it here so I'm not crowding your inbox. If fresh coffee for ${p.name} is ever worth a look, reply and I'll bring samples by.`,
  ];
  const stepWhen = (x, i) => {
    if (x.sentAt) return `Sent ${dayShort(x.sentAt)}`;
    if (x.failed) return "Didn't send";
    if (x.skipped) return "Not sent";
    if (i === 0) return "Goes out next, in working hours";
    return o.steps[0].sentAt ? `Goes ${dayShort(new Date(Date.parse(o.steps[0].sentAt) + ov.followDays[i] * 864e5).toISOString())}` : `Day ${ov.followDays[i]}`;
  };
  const started = o && (o.steps.some((x) => x.sentAt) || !o.stoppedAt);
  const outreach = started
    ? `<ol class="outreach-steps">${o.steps
        .map((x, i) => `<li class="${x.sentAt ? "is-sent" : x.skipped || x.failed ? "is-off" : ""}"><strong>${i === 0 ? esc(x.subject) : `Follow-Up · Day ${ov.followDays[i]}`}</strong><small>${esc(stepWhen(x, i))}</small><p>${esc(x.body)}</p></li>`)
        .join("")}</ol>
      ${
        o.reply
          ? `<div class="outreach-reply"><strong>${esc(state.pros.replyKinds?.[o.reply.kind] || (o.reply.no ? "Not interested" : "They replied"))}</strong><small>${esc(dayShort(o.reply.at))}</small><p>${esc(o.reply.text)}</p>
            ${o.reply.remindId ? `<small>Reminder set to check back in two months.</small>` : ""}
            <div class="btn-row">${o.reply.no && p.status !== "rejected" ? `<button type="button" class="btn btn-sm" data-prospect-set="rejected">Mark Not a Fit</button>` : ""}${o.reply.kind === "samples" && !p.samples ? `<button type="button" class="btn btn-sm" data-samples-open>Samples Sent</button>` : ""}</div></div>
            ${o.reply.draft && !o.reply.answeredAt ? `<form class="form-stack" data-reply-form><label class="field"><span>Reply</span><textarea name="text" rows="5">${esc(o.reply.draft)}</textarea></label><div class="btn-row"><button type="submit" class="btn btn-primary">${icon("send")}<span>Send Reply</span></button></div></form>` : o.reply.answeredAt ? `<p class="muted">Answered ${esc(dayShort(o.reply.answeredAt))}.</p>` : ""}`
          : o.stoppedAt
            ? `<p class="muted">Stopped: ${esc(o.stopReason || "")}</p>`
            : ""
      }
      <div class="btn-row">
        ${o.convId ? `<a class="btn btn-sm" href="#inbox/${esc(o.convId)}">Conversation</a>` : ""}
        ${!o.stoppedAt && o.steps.some((x) => !x.sentAt && !x.skipped) ? `<button type="button" class="btn btn-sm btn-ghost" data-outreach-stop>Stop Follow-Ups</button>` : ""}
      </div>`
    : `<form class="form-stack" data-prospect-draft-form>
        <div class="form-row-2">
          <label class="field"><span>From</span><select name="from">${ov.senders.map((x) => `<option value="${esc(x.local)}"${x.local === (o?.from || "wholesale") ? " selected" : ""}>${esc(x.shared ? x.address : `${x.name} · ${x.address}`)}</option>`).join("")}</select></label>
          <label class="field"><span>To</span><input name="to" type="email" value="${esc(o?.to || email)}" placeholder="owner@cafe.com"></label>
        </div>
        <label class="field"><span>Subject</span><input name="subject" value="${esc(p.draft?.subject || "")}" maxlength="150"></label>
        <label class="field"><span>First Email</span><textarea name="body" rows="8">${esc(p.draft?.body || "")}</textarea></label>
        <label class="field"><span>Follow-Up · Day ${ov.followDays[1]}</span><textarea name="f1" rows="4">${esc(o?.steps[1]?.body ?? follow[1])}</textarea></label>
        <label class="field"><span>Follow-Up · Day ${ov.followDays[2]}</span><textarea name="f2" rows="4">${esc(o?.steps[2]?.body ?? follow[2])}</textarea></label>
        ${state.pros.tasting?.on ? `<label class="checkbox"><input type="checkbox" name="tasting" checked><span>Add a Tasting Link</span></label>` : ""}
        <div class="btn-row">
          <button type="submit" class="btn btn-primary" data-outreach-start ${ov.canSend ? "" : "disabled"}>${icon("send")}<span>Start Outreach</span></button>
          <button type="button" class="btn" data-prospect-draft ${state.pros.drafting ? "" : "disabled"}>${p.draft ? "Write Again" : "Draft Email"}</button>
          <button type="button" class="btn btn-ghost" data-draft-save>Save</button>
          <button type="button" class="btn btn-ghost" data-draft-copy>Copy</button>
        </div>
        <p class="form-error" data-outreach-error role="alert"></p>
      </form>`;
  editingNext = `prospect:${p.id}`;
  const drawer = openPanel(p.name, `
    <div class="order-cols">
      <div class="order-main">
        ${researchCard(r, { researching: p.researching, what: p.name, middle: ["approved", "contacted", "samples"].includes(p.status) || o ? `<section class="panel"><h3 class="panel-title">Outreach</h3>${outreach}</section>` : "" })}
      </div>
      <div class="order-side">
        <section class="panel">
          <h3 class="panel-title">Business</h3>
          <dl class="kv">
            ${p.category ? `<div><dt>Type</dt><dd>${esc(p.category)}</dd></div>` : ""}
            ${p.address ? `<div><dt>Address</dt><dd>${esc(p.address)}</dd></div>` : ""}
            ${p.website ? `<div><dt>Website</dt><dd><a class="link" href="${esc(p.website)}" target="_blank" rel="noopener">${esc(hostOf(p.website))}</a></dd></div>` : ""}
            ${p.instagram ? `<div><dt>Instagram</dt><dd><a class="link amb-handle" href="https://www.instagram.com/${esc(p.instagram)}/" target="_blank" rel="noopener">@${esc(p.instagram)}</a></dd></div>` : ""}
            ${p.phone ? `<div><dt>Phone</dt><dd>${esc(p.phone)}</dd></div>` : ""}
            ${p.mapsUrl ? `<div><dt>Listing</dt><dd>${sourceLink(p.mapsUrl)}</dd></div>` : ""}
            <div><dt>Found</dt><dd>${esc(foundOn(p.source))}<small>${esc(dayShort(p.foundAt))}${p.area ? ` · ${esc(p.area)}` : ""}</small></dd></div>
          </dl>
        </section>
        <section class="panel">
          <h3 class="panel-title">Volume</h3>
          <form class="pros-volume" data-prospect-volume><label class="field"><span>Coffee a week</span><span class="tax-input"><input name="weeklyLbs" inputmode="decimal" value="${p.weeklyLbs || ""}" placeholder="0"><i>lb</i></span></label><button type="submit" class="btn btn-sm">Save</button></form>
          ${prospectValue(p, state.pros) ? `<p class="pros-value"><strong>${perMonth(prospectValue(p, state.pros))}</strong> <small>at ${money(state.pros.config.pricePerLb || 16)}/lb</small></p>` : ""}
        </section>
        ${
          p.samples || state.samplesOpen === p.id
            ? `<section class="panel"><h3 class="panel-title">Samples</h3>${
                p.samples && state.samplesOpen !== p.id
                  ? `<p>${esc(p.samples.coffees.join(", "))}</p><small class="muted">Sent ${esc(dayShort(p.samples.at))} · follow-up in your to-dos</small>`
                  : `<form class="form-stack" data-samples-form><div class="check-grid">${(state.pros.coffees || []).map((c) => `<label class="checkbox"><input type="checkbox" name="coffees" value="${esc(c.name)}"><span>${esc(c.name)}</span></label>`).join("")}</div><label class="checkbox"><input type="checkbox" name="roast" checked><span>Add a Roast To-Do</span></label><div class="btn-row"><button type="submit" class="btn btn-sm btn-primary">Save</button><button type="button" class="btn btn-sm btn-ghost" data-samples-cancel>Cancel</button></div></form>`
              }</section>`
            : ""
        }
        ${p.tasting ? `<section class="panel"><h3 class="panel-title">Tasting</h3><p>${esc(callWhen(p.tasting.day, p.tasting.time))}</p></section>` : ""}
        ${p.customer ? `<section class="panel"><h3 class="panel-title">From Your Shop</h3><ul class="cand-why">${p.customer.reasons.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>${p.customer.id ? `<button type="button" class="btn btn-sm" data-customer="${esc(p.customer.id)}">Open Customer</button>` : ""}</section>` : ""}
        ${contacts}
        <section class="panel">
          <h3 class="panel-title">Notes</h3>
          <form data-prospect-notes><textarea name="notes" rows="4" placeholder="Visited, spoke to the owner…">${esc(p.notes || "")}</textarea><button type="submit" class="btn btn-sm">Save Notes</button></form>
        </section>
      </div>
    </div>`, { page: "Prospects", actions, badges: `<span class="badge ${cls}"><i></i>${label}</span>`, subtitle: [p.category, p.city || p.address].filter(Boolean).join(" · ") });

  const refresh = (prospect) => {
    Object.assign(p, prospect);
    render();
    prospectPanel(id);
  };
  drawer.onclick = async (e) => {
    $$("details.order-menu[open]", drawer).forEach((d) => (!d.contains(e.target) || e.target.closest(".order-menu-list button")) && d.removeAttribute("open"));
    if (e.target.closest("[data-close]")) return closeDrawer();
    // Emailing them from the draft: they've been contacted.
    if (e.target.closest("[data-draft-mail]") && p.status === "approved") {
      api(`/api/admin/prospects/${id}`, { method: "PATCH", body: { status: "contacted" } }).then((r) => (Object.assign(p, r.prospect), render())).catch(() => {});
      return;
    }
    if (e.target.closest("[data-samples-open]")) return (state.samplesOpen = p.id), prospectPanel(id);
    if (e.target.closest("[data-samples-cancel]")) return (state.samplesOpen = ""), prospectPanel(id);
    if (e.target.closest("[data-tasting-copy]")) {
      await navigator.clipboard.writeText(state.pros.tasting.links[p.id]).catch(() => {});
      return toast("Tasting link copied.");
    }
    const b = e.target.closest("[data-prospect-set], [data-prospect-research], [data-prospect-draft], [data-prospect-delete], [data-prospect-account], [data-draft-copy], [data-draft-save], [data-outreach-stop], [data-prospect-contacts], [data-contact-pick]");
    if (!b) return;
    if (b.matches("[data-draft-copy]")) {
      const f = $("[data-prospect-draft-form]", drawer);
      await navigator.clipboard.writeText(`${f.subject.value}\n\n${f.body.value}`).catch(() => {});
      return toast("Copied.");
    }
    if (b.matches("[data-prospect-account]")) {
      return accountForm(null, { business: p.name, contactName: people.find((x) => x.email && x.email === p.contactEmail)?.name || "", email, phone: p.phone || r?.facts.find((f) => f.key === "phone")?.value || "", notes: [p.category, p.address, p.website, p.instagram && `@${p.instagram}`].filter(Boolean).join(" · ") });
    }
    if (b.matches("[data-prospect-delete]") && !confirm(`Delete ${p.name} from prospects?`)) return;
    b.disabled = true;
    const label = b.querySelector("span") || b;
    try {
      if (b.matches("[data-draft-save]")) {
        const f = $("[data-prospect-draft-form]", drawer);
        refresh((await api(`/api/admin/prospects/${id}`, { method: "PATCH", body: { draft: { subject: f.subject.value, body: f.body.value } } })).prospect);
        toast("Saved.");
      } else if (b.matches("[data-outreach-stop]")) {
        refresh((await api(`/api/admin/prospects/${id}/outreach/stop`, { method: "POST", body: {} })).prospect);
        toast("Follow-ups stopped.");
      } else if (b.matches("[data-prospect-contacts]")) {
        label.textContent = "Looking…";
        refresh((await api(`/api/admin/prospects/${id}/contacts`, { method: "POST", body: {} })).prospect);
      } else if (b.matches("[data-contact-pick]")) {
        refresh((await api(`/api/admin/prospects/${id}`, { method: "PATCH", body: { contactEmail: b.dataset.contactPick } })).prospect);
      } else if (b.matches("[data-prospect-research]")) {
        label.textContent = "Researching…";
        refresh((await api(`/api/admin/prospects/${id}/research`, { method: "POST", body: {} })).prospect);
      } else if (b.matches("[data-prospect-draft]")) {
        label.textContent = "Writing…";
        refresh((await api(`/api/admin/prospects/${id}/draft`, { method: "POST", body: {} })).prospect);
      } else if (b.matches("[data-prospect-delete]")) {
        state.pros = await api(`/api/admin/prospects/${id}`, { method: "DELETE" });
        closeDrawer();
        render();
      } else {
        refresh((await api(`/api/admin/prospects/${id}`, { method: "PATCH", body: { status: b.dataset.prospectSet } })).prospect);
        toast({ approved: "Approved.", contacted: "Marked contacted.", interested: "Marked interested.", won: "Marked won.", rejected: "Marked not a fit.", new: "Back to review." }[b.dataset.prospectSet]);
      }
    } catch (error) {
      b.disabled = false;
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    try {
      if (f.matches("[data-prospect-draft-form]")) {
        const btn = $("[data-outreach-start]", f);
        btn.disabled = true;
        try {
          const r = await api(`/api/admin/prospects/${id}/outreach`, { method: "POST", body: { from: f.from.value, to: f.to.value, tasting: Boolean(f.tasting?.checked), steps: [{ subject: f.subject.value, body: f.body.value }, { body: f.f1.value }, { body: f.f2.value }] } });
          refresh(r.prospect);
          toast("Outreach started.");
        } catch (error) {
          btn.disabled = false;
          $("[data-outreach-error]", f).textContent = error.message;
        }
        return;
      }
      if (f.matches("[data-samples-form]")) {
        const coffees = $$("input[name=coffees]:checked", f).map((x) => x.value);
        const r = await api(`/api/admin/prospects/${id}/samples`, { method: "POST", body: { coffees, roast: f.roast.checked } });
        state.samplesOpen = "";
        refresh(r.prospect);
        return toast("Samples noted. Follow-up added to your to-dos.");
      }
      if (f.matches("[data-reply-form]")) {
        const r = await api(`/api/admin/prospects/${id}/reply`, { method: "POST", body: { text: f.text.value } });
        refresh(r.prospect);
        return toast("Reply on its way. Undo it in the Inbox.");
      }
      if (f.matches("[data-prospect-volume]")) {
        refresh((await api(`/api/admin/prospects/${id}`, { method: "PATCH", body: { weeklyLbs: f.weeklyLbs.value || 0 } })).prospect);
        return toast("Saved.");
      }
      const body = { notes: f.notes.value };
      Object.assign(p, (await api(`/api/admin/prospects/${id}`, { method: "PATCH", body })).prospect);
      toast("Saved.");
    } catch (error) {
      panelError(error.message);
    }
  };
  // The mail link carries the edited draft.
  drawer.oninput = () => {
    const f = $("[data-prospect-draft-form]", drawer);
    const a = $("[data-draft-mail]", drawer);
    if (f && a) a.href = `mailto:${email}?subject=${encodeURIComponent(f.subject.value)}&body=${encodeURIComponent(f.body.value)}`;
  };
  drawer.oninput(null);
}

// Who won't be emailed (marketing, automated emails, outreach) and why; Remove takes them off.
const DNC_REASON = { bounced: "Email bounced", complained: "Marked as spam", unsubscribed: "Unsubscribed", asked: "Asked not to be emailed" };
async function dncPanel() {
  let entries = [];
  try {
    ({ entries } = await api("/api/admin/prospects/donotcontact"));
  } catch (error) {
    return toast(error.message, "error");
  }
  const draw = () => `<section class="panel">${
    entries.length
      ? `<ul class="dnc-list">${entries.map((x) => `<li><span><strong>${esc(x.id)}</strong><small>${esc(DNC_REASON[x.reason] || x.reason)} · ${esc(dayShort(x.at))}${x.source ? ` · ${esc(x.source)}` : ""}</small></span><button type="button" class="btn btn-sm btn-ghost" data-dnc-remove="${esc(x.id)}">Remove</button></li>`).join("")}</ul>`
      : `<div class="empty">${icon("check", "i i-xl")}<p><strong>No one on the list</strong></p></div>`
  }</section>`;
  const drawer = openPanel("Do-Not-Contact List", draw(), { page: "Prospects" });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const b = e.target.closest("[data-dnc-remove]");
    if (!b || !confirm(`Take ${b.dataset.dncRemove} off the list? They can be emailed again.`)) return;
    b.disabled = true;
    try {
      ({ entries } = await api(`/api/admin/prospects/donotcontact/${encodeURIComponent(b.dataset.dncRemove)}`, { method: "DELETE" }));
      $(".panel", drawer).outerHTML = draw();
      if (state.pros) state.pros.outreach.doNotContact = entries.length;
    } catch (error) {
      b.disabled = false;
      panelError(error.message);
    }
  };
}

async function prospectsClick(t) {
  if (t.closest("[data-dnc-open]")) return dncPanel(), true;
  if (t.closest("[data-cand-all]")) return (state.candidatesAll = !state.candidatesAll), render(), true;
  const candBtn = t.closest("[data-cand-add], [data-cand-dismiss]");
  if (candBtn) {
    const key = candBtn.closest("[data-cand]").dataset.cand;
    candBtn.disabled = true;
    try {
      if (candBtn.matches("[data-cand-dismiss]")) {
        state.pros = await api(`/api/admin/prospects/customers/${key}/dismiss`, { method: "POST", body: {} });
        render();
      } else {
        const r = await api(`/api/admin/prospects/customers/${key}`, { method: "POST", body: {} });
        state.pros = r;
        state.prospectFilter = "approved";
        render();
        toast("Added to Prospects.");
      }
    } catch (error) {
      candBtn.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  const set = t.closest("[data-prospect-set]");
  const draftBtn = t.closest("[data-prospect-draft]");
  const row = t.closest("tr[data-prospect]");
  if (row && (set || draftBtn)) {
    const id = row.dataset.prospect;
    if (draftBtn) return prospectPanel(id), true;
    set.disabled = true;
    try {
      const { prospect } = await api(`/api/admin/prospects/${id}`, { method: "PATCH", body: { status: set.dataset.prospectSet } });
      Object.assign(state.pros.prospects.find((p) => p.id === id), prospect);
      render();
    } catch (error) {
      set.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  if (row && !t.closest("button, a")) return prospectPanel(row.dataset.prospect), true;
  const dismiss = t.closest("[data-alert-done]");
  if (dismiss) {
    const id = dismiss.closest("[data-alert]").dataset.alert;
    dismiss.disabled = true;
    await api(`/api/admin/insights/alerts/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: "done" } }).catch((error) => toast(error.message, "error"));
    state.trade.locationAlerts = state.trade.locationAlerts.filter((x) => x.id !== id);
    render();
    return true;
  }
  const more = t.closest("[data-prospect-more]");
  if (more) {
    state.prospectMore = !state.prospectMore;
    more.setAttribute("aria-expanded", String(state.prospectMore));
    $(".prospect-more").hidden = !state.prospectMore;
    return true;
  }
  const nearBtn = t.closest("[data-prospect-near]");
  if (nearBtn) {
    const f = $("[data-prospect-find]");
    const was = f.area.value;
    f.area.value = "@accounts";
    f.requestSubmit();
    f.area.value = was;
    return true;
  }
  const enq = !t.closest("button, a") && t.closest("[data-enquiry-open]");
  if (enq) return enquiryPanel(enq.dataset.enquiryOpen), true;
  return false;
}

// Anything that fails after a click (a page that couldn't be drawn, a request that broke) says so,
// instead of the click seeming to do nothing.
addEventListener("unhandledrejection", (e) => {
  console.error(e.reason);
  toast(`Something went wrong: ${e.reason?.message || e.reason}`, "error");
});

// A conversation's last line as a preview: the coffee finder's answers are stored as JSON
// ({"picks": …, "reason": …}); show its reason in words instead.
function previewOf(text) {
  const t = String(text || "").trim();
  if (t.startsWith("{")) {
    try {
      const j = JSON.parse(t);
      return j.reason || (j.picks?.length ? "Suggested a coffee" : "Sent suggestions");
    } catch {}
  }
  return t;
}

// Email a customer: their email conversation in the Inbox (an open one, or a new one), sent from
// the shop's address, with their reply coming back there. (A mailto: link did nothing on a
// computer with no mail app set up.)
app.addEventListener("click", async (e) => {
  const b = (e.target as any).closest?.("[data-compose-email]");
  if (!b) return;
  e.preventDefault();
  b.disabled = true;
  try {
    const { id } = await api("/api/admin/inbox/compose", { method: "POST", body: { email: b.dataset.composeEmail, name: b.dataset.composeName, subject: b.dataset.composeSubject || "", box: b.dataset.composeBox || "hello" } });
    go(`#inbox/${id}`);
  } catch (error) {
    toast(error.message, "error");
  } finally {
    b.disabled = false;
  }
});

app.addEventListener("submit", (e) => {
  if (state.page === "returns") returnsSubmit(e);
});

app.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-prospect-find], [data-prospect-add], [data-prospect-cap]");
  if (!form) return;
  e.preventDefault();
  const error = $("[data-prospect-error]");
  error.textContent = "";
  const button = $("button[type=submit]", form);
  const was = button.innerHTML;
  button.disabled = true;
  try {
    if (form.matches("[data-prospect-find]")) {
      button.innerHTML = `<span>Finding…</span>`;
      const wanted = form.wanted?.value || "";
      Object.assign(state, { prospectType: form.type.value, prospectKind: form.type.value, prospectWanted: wanted, prospectFilter: "new" }, form.area.value === "@accounts" ? {} : { prospectArea: form.area.value });
      button.innerHTML = `<span>${state.pros?.screening ? "Finding and Screening…" : "Finding…"}</span>`;
      const out = await api("/api/admin/prospects/find", { method: "POST", body: { area: form.area.value, type: form.type.value, wanted } });
      state.pros = out;
      const r = out.result;
      const skipped = [r.known && `${r.known} already here`, r.roasters && `${r.roasters} roaster${r.roasters === 1 ? "" : "s"} or coffee brand${r.roasters === 1 ? "" : "s"} left out`, r.screened && `${r.screened} screened out`].filter(Boolean).join(", ");
      toast(r.added ? `${r.added} new${skipped ? `, ${skipped}` : ""}. Researching them now.` : r.found ? `None new: ${skipped}.` : "Nothing found. Try a wider area.");
    } else if (form.matches("[data-prospect-add]")) {
      state.pros = await api("/api/admin/prospects", { method: "POST", body: { name: form.name.value, site: form.site.value, city: form.city.value } });
      state.prospectFilter = "new";
      toast("Added. Researching it now.");
    } else {
      state.pros = await api("/api/admin/prospects/config", { method: "PATCH", body: { capUsd: form.capUsd.value, dailyCap: form.dailyCap.value, pricePerLb: form.pricePerLb.value } });
      toast("Saved.");
    }
    render();
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
    button.innerHTML = was;
  }
});

/* ── Roasting: the roast schedule (a month on a computer, a list by day on a phone) ── */

const isoDay = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const dayName = (iso, opts: any = { weekday: "short", month: "short", day: "numeric" }) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", opts);
// A roast as a chip: the coffee, the kilos and about how many bags.
const roastChip = (b) => {
  const tone = b.status === "roasted" ? "t-green" : b.needsGreen ? "t-orange" : "t-blue";
  return `<button type="button" class="roast-chip ${tone}" data-roast="${esc(b.id)}"><i></i><span><strong>${esc(b.coffee)}</strong><small>${b.number ? `${esc(b.number)} · ` : ""}${b.status === "roasted" ? `${b.bags} bags made` : `${b.greenKg} kg · about ${b.expectedBags} bags`}${b.needsGreen ? " · needs green" : ""}${b.roasterName ? ` · ${esc(b.roasterName.split(" ")[0])}` : ""}</small></span></button>`;
};

function roastingView() {
  const v = state.roast;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const f = state.roastFilter || "all";
  const shown = v.batches.filter((b) => b.status !== "cancelled" && (f === "all" || (f === "mine" ? b.roasterId === ME?.id : b.status === f)));
  const today = isoDay(new Date());
  if (state.roastView === "week" && f !== "planned") return roastWeek(v, shown, today);
  const month = state.roastMonth || today.slice(0, 7);
  const [y, m] = month.split("-").map(Number);
  const first = new Date(y, m - 1, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  const days = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return isoDay(d);
  });
  const weeks = days.length / 7 - (days.slice(35).every((d) => d.slice(0, 7) !== month) ? 1 : 0);
  const byDay = (d) => shown.filter((b) => b.date === d);
  const needs = v.coffees.filter((c) => c.low && !c.planned);
  const needsCard = needs.length
    ? `<section class="card ins-card"><header class="card-head"><h2>Needs Roasting</h2></header>
        <div class="list">${needs.map((c) => `<div class="list-row"><span class="list-main"><strong>${esc(c.name)}</strong>${stockBar(c.left, c.reorderAt ?? 5, "bags")}</span><span class="list-side"><button type="button" class="btn btn-sm" data-roast-plan="${esc(c.id)}">Plan</button></span></div>`).join("")}</div></section>`
    : "";
  const cal = `<section class="card roast-cal">
      <div class="roast-cal-head">${["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => `<span>${d}</span>`).join("")}</div>
      <div class="roast-cal-grid">${days
        .slice(0, weeks * 7)
        .map((d) => `<div class="roast-day${d.slice(0, 7) !== month ? " is-other" : ""}${d === today ? " is-today" : ""}" data-roast-day="${d}"><span class="roast-day-n">${Number(d.slice(8))}</span>${byDay(d).map(roastChip).join("")}</div>`)
        .join("")}</div>
    </section>`;
  // On a phone: this month's days that have roasts, in order (today's and later first open).
  const listDays = [...new Set(shown.filter((b) => b.date.slice(0, 7) === month).map((b) => b.date))].sort();
  // Planned: every planned roast from today on, by day, wherever it falls (not just this month).
  const allPlanned = f === "planned";
  const planDays = [...new Set(shown.filter((b) => b.date >= today).map((b) => b.date))].sort();
  const list = allPlanned
    ? `<section class="roast-list is-all">${
        planDays.length
          ? planDays.map((d) => `<div class="card roast-list-day${d === today ? " is-today" : ""}"><h3>${esc(dayName(d, { weekday: "long", month: "short", day: "numeric" }))}</h3>${byDay(d).map(roastChip).join("")}</div>`).join("")
          : `<div class="card empty">${icon("roasting", "i i-xl")}<p><strong>Nothing planned from today on</strong></p></div>`
      }</section>`
    : `<section class="roast-list">${
        listDays.length
          ? listDays.map((d) => `<div class="card roast-list-day${d === today ? " is-today" : ""}"><h3>${esc(dayName(d, { weekday: "long", month: "short", day: "numeric" }))}</h3>${byDay(d).map(roastChip).join("")}</div>`).join("")
          : `<div class="card empty">${icon("roasting", "i i-xl")}<p><strong>No roasts this month</strong></p></div>`
      }</section>`;
  return `${needsCard}${overdueRoasts(v, today)}
    <div class="ins-toolbar roast-toolbar">
      ${chips("Roasts", [
        { filter: "roast:all", label: "All", count: v.batches.filter((b) => b.status !== "cancelled").length, on: f === "all" },
        { filter: "roast:planned", label: "Planned", count: v.batches.filter((b) => b.status === "planned").length, tone: "t-blue", on: f === "planned" },
        { filter: "roast:roasted", label: "Roasted", count: v.batches.filter((b) => b.status === "roasted").length, tone: "t-green", on: f === "roasted" },
        ...(v.batches.some((b) => b.roasterId && b.roasterId === ME?.id) ? [{ filter: "roast:mine", label: "Mine", count: v.batches.filter((b) => b.roasterId === ME?.id && b.status === "planned").length, on: f === "mine" }] : []),
      ])}
      <div class="roast-month">
        <button type="button" class="btn btn-sm" data-roast-print="${today}">${icon("print")}<span>Print Today</span></button>
        ${
          allPlanned
            ? ""
            : `${roastViewMenu("month")}
        <button type="button" class="icon-btn" data-roast-month="-1" aria-label="Previous month">${icon("ChevronLeft")}</button>
        <strong>${esc(first.toLocaleDateString("en-US", { month: "long", year: "numeric" }))}</strong>
        <button type="button" class="icon-btn" data-roast-month="1" aria-label="Next month">${icon("ChevronRight")}</button>
        ${month !== today.slice(0, 7) ? `<button type="button" class="btn btn-sm" data-roast-month="0">Today</button>` : ""}`
        }
      </div>
    </div>
    ${allPlanned ? "" : cal}${list}`;
}

// Planned roasts dated before today: above the calendar (and the phone's list), each with Mark
// Roasted and Move to Today, so none sits forgotten on a past day.
function overdueRoasts(v, today) {
  const late = v.batches.filter((b) => b.status === "planned" && b.date < today).sort((a, b) => a.date.localeCompare(b.date));
  if (!late.length) return "";
  return `<section class="card ins-card roast-overdue"><header class="card-head"><h2>Overdue</h2><span class="badge t-red"><i></i>${late.length}</span></header>
    <div class="list">${late
      .map(
        (b) => `<div class="list-row"><span class="list-main roast-overdue-main" role="button" tabindex="0" data-roast="${esc(b.id)}"><strong>${esc(b.coffee)}</strong><small>${esc(dayName(b.date))} · ${b.greenKg} kg · about ${b.expectedBags} bags${b.roasterName ? ` · ${esc(b.roasterName.split(" ")[0])}` : ""}</small></span>
        <span class="list-side"><button type="button" class="btn btn-sm btn-ghost" data-roast-today="${esc(b.id)}">Move to Today</button><button type="button" class="btn btn-sm" data-roast-done-now="${esc(b.id)}">Mark Roasted</button></span></div>`
      )
      .join("")}</div></section>`;
}

const roastViewMenu = (on) => menuButton(on === "week" ? "Week" : "Month", "calendar", [{ pick: "roastView:month", label: "Month", on: on === "month" }, { pick: "roastView:week", label: "Week", on: on === "week" }]);
// A week: one column a day (a list on a phone), with Print Week.
function roastWeek(v, shown, today) {
  const f = state.roastFilter || "all";
  const base = new Date(`${state.roastWeek || today}T12:00:00`);
  base.setDate(base.getDate() - base.getDay());
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return isoDay(d);
  });
  const byDay = (d) => shown.filter((b) => b.date === d);
  return `${overdueRoasts(v, today)}<div class="ins-toolbar roast-toolbar">
      ${chips("Roasts", [
        { filter: "roast:all", label: "All", count: v.batches.filter((b) => b.status !== "cancelled").length, on: f === "all" },
        { filter: "roast:planned", label: "Planned", count: v.batches.filter((b) => b.status === "planned").length, tone: "t-blue", on: f === "planned" },
        { filter: "roast:roasted", label: "Roasted", count: v.batches.filter((b) => b.status === "roasted").length, tone: "t-green", on: f === "roasted" },
        ...(v.batches.some((b) => b.roasterId && b.roasterId === ME?.id) ? [{ filter: "roast:mine", label: "Mine", count: v.batches.filter((b) => b.roasterId === ME?.id && b.status === "planned").length, on: f === "mine" }] : []),
      ])}
      <div class="roast-month">
        ${roastViewMenu("week")}
        <button type="button" class="btn btn-sm" data-roast-print="${days[0]}" data-roast-print-to="${days[6]}">${icon("print")}<span>Print Week</span></button>
        <button type="button" class="icon-btn" data-roast-week="-7" aria-label="Previous week">${icon("ChevronLeft")}</button>
        <strong>${esc(dayName(days[0], { month: "short", day: "numeric" }))} – ${esc(dayName(days[6], { month: "short", day: "numeric" }))}</strong>
        <button type="button" class="icon-btn" data-roast-week="7" aria-label="Next week">${icon("ChevronRight")}</button>
        ${days.includes(today) ? "" : `<button type="button" class="btn btn-sm" data-roast-week="0">Today</button>`}
      </div>
    </div>
    <section class="roast-week">${days
      .map((d) => `<div class="card roast-week-day${d === today ? " is-today" : ""}" data-roast-day="${d}"><h3>${esc(dayName(d, { weekday: "short", day: "numeric" }))}</h3>${byDay(d).map(roastChip).join("") || `<span class="muted roast-none">—</span>`}</div>`)
      .join("")}</section>`;
}

// The roast sheet for a day or a week, to keep at the roaster: what to roast, from which lot, how
// much, the bags it should make, who roasts it, and blanks to fill in.
function printRoastSheet(from, to = from) {
  const v = state.roast;
  const list = v.batches.filter((b) => b.status === "planned" && b.date >= from && b.date <= to);
  if (!list.length) return toast("Nothing planned to print.", "error");
  const lot = (b) => v.items.find((x) => x.id === b.greenId)?.lotCode || "";
  const days = [...new Set(list.map((b) => b.date))];
  $("[data-slips]").innerHTML = days
    .map(
      (d) => `<article class="slip roast-sheet">
        <header><span class="slip-logo">${LOGO}</span><div class="slip-shop"><strong>Roast sheet</strong><br>${esc(dayName(d, { weekday: "long", month: "long", day: "numeric" }))}</div></header>
        <table>
          <thead><tr><th class="tick"></th><th>Coffee</th><th>Green coffee</th><th class="num">Green kg</th><th class="num">Target bags</th><th>Roaster</th><th>Charge °C</th><th>Drop</th><th>Roasted kg</th><th>Bags</th></tr></thead>
          <tbody>${list
            .filter((b) => b.date === d)
            .map((b) => `<tr><td class="tick"><span></span></td><td><strong>${esc(b.coffee)}</strong>${b.note ? `<br><small>${esc(b.note)}</small>` : ""}</td><td>${esc(b.greenName)}${lot(b) ? `<br><small>Lot ${esc(lot(b))}</small>` : ""}</td><td class="num">${b.greenKg}</td><td class="num">${b.expectedBags}</td><td>${esc(b.roasterName || "")}</td><td class="blank"></td><td class="blank"></td><td class="blank"></td><td class="blank"></td></tr>`)
            .join("")}</tbody>
        </table>
      </article>`
    )
    .join("");
  setTimeout(() => window.print(), 50);
}

// A roast: plan or change it; mark it roasted (how many bags it made); undo; cancel.
function roastPanel({ id = null, product = "", date = "" } = {}) {
  const v = state.roast;
  const b = id ? v.batches.find((x) => x.id === id) : null;
  if (id && !b) return;
  const coffee = b?.product || product || v.coffees[0]?.id || "";
  const greensFor = (c) => [...v.items].sort((x, y) => Number(y.products.includes(c)) - Number(x.products.includes(c)));
  // Free: on hand less what roasts planned up to that day (other than this one) will take.
  const freeKg = (greenId, day) => {
    const x = v.items.find((y) => y.id === greenId);
    if (!x) return 0;
    const promised = v.batches.filter((y) => y.status === "planned" && y.greenId === greenId && y.id !== b?.id && y.date <= day).reduce((n, y) => n + y.greenKg, 0);
    return Math.round((x.onHand - promised) * 10) / 10;
  };
  const dayNow = () => ($("[data-roast-form] [name=date]") as HTMLInputElement)?.value || b?.date || date || isoDay(new Date());
  const greenOptions = (c, sel, day = b?.date || date || isoDay(new Date())) =>
    greensFor(c)
      .map((x) => `<option value="${esc(x.id)}" ${x.id === sel ? "selected" : ""}>${esc(x.name)} · ${esc(String(Math.max(0, freeKg(x.id, day))))} kg free of ${esc(kgText(x.onHand))}${x.products.includes(c) ? "" : " · other coffee"}</option>`)
      .join("");
  const firstGreen = b?.greenId || greensFor(coffee).find((x) => x.products.includes(coffee))?.id || greensFor(coffee)[0]?.id || "";
  const bagsOf = (kgN) => Math.floor((kgN * (1 - v.roastLoss) * 1000) / 250);
  const planned = !b || b.status === "planned";
  const form = planned
    ? `<form class="form-stack" id="roast-form" data-roast-form>
        <div class="form-row-2">
          <label class="field"><span>Day</span><input type="date" name="date" required value="${esc(b?.date || date || isoDay(new Date()))}"></label>
          <label class="field"><span>Coffee</span><select name="product">${v.coffees.map((c) => `<option value="${esc(c.id)}" ${c.id === coffee ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label>
          <label class="field"><span>Green coffee</span><select name="greenId" ${v.items.length ? "" : "disabled"}>${v.items.length ? greenOptions(coffee, firstGreen) : `<option>Add green coffee first</option>`}</select></label>
          <label class="field"><span>Kilos</span><span class="tax-input"><input name="greenKg" inputmode="decimal" required value="${b?.greenKg ?? ""}"><i>kg</i></span></label>
          <div class="field roaster-field"><label for="roast-roaster">Roaster</label><select id="roast-roaster" name="roasterId" data-roaster-pick><option value="">No one yet</option>${(v.team || []).map((m) => `<option value="${esc(m.id)}" ${b?.roasterId === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select><input name="roasterNew" maxlength="80" placeholder="Name" autocomplete="off" aria-label="Roaster's name" hidden data-roaster-new><button type="button" class="roaster-add" data-roaster-add>${icon("plus", "i i-sm")}<span>Add a Roaster</span></button></div>
          <div class="field"><span>Makes</span><output class="field-value" data-roast-bags></output></div>
        </div>
        <div data-roast-short></div>
        <label class="field"><span>Note</span><input name="note" maxlength="300" value="${esc(b?.note || "")}"></label>
      </form>`
    : "";
  // A planned roast: how many bags it made, marked from the footer (its one main action).
  const roastBox =
    b?.status === "planned"
      ? `<section class="panel"><h3 class="panel-title">Roasted</h3>
          <div class="form-stack">
            <label class="field"><span>Bags of 250g It Made</span><input name="bags" data-roast-bags-made inputmode="numeric" value="${b.expectedBags}"></label>
          </div></section>`
      : b?.status === "roasted"
        ? `<section class="panel"><dl class="kv"><div><dt>Made</dt><dd>${b.bags} bags of 250g</dd></div><div><dt>Green coffee used</dt><dd>${b.moved?.greenKg ?? b.greenKg} kg of ${esc(b.greenName)}</dd></div><div><dt>When</dt><dd>${esc(dayShort(b.roastedAt))}${b.roastedBy ? `<small>${esc(b.roastedBy)}</small>` : ""}</dd></div></dl>${b.moved?.bags ? "" : `<p class="muted">${esc(b.coffee)}'s stock isn't counted, so no bags were added.</p>`}</section>`
        : "";
  const actions = b?.status === "roasted" ? `<button type="button" class="btn" data-roast-undo>Undo Roasted</button>` : "";
  // A planned roast: Mark Roasted is the main button; changing the plan is Save, quieter.
  const footer = !planned
    ? ""
    : b
    ? `<div class="modal-foot-side"><button type="button" class="btn btn-ghost" data-roast-cancel>Cancel Roast</button></div><div class="modal-foot-side"><button type="submit" form="roast-form" class="btn">Save</button><button type="button" class="btn btn-primary" data-roast-mark>${icon("synced")}<span>Mark Roasted</span></button></div>`
    : `<div class="modal-foot-side"></div><div class="modal-foot-side"><button type="submit" form="roast-form" class="btn btn-primary">Plan Roast</button></div>`;
  const status = b ? (b.status === "roasted" ? ["t-green", "Roasted"] : b.date < isoDay(new Date()) ? ["t-red", "Overdue"] : ["t-blue", "Planned"]) : null;
  const drawer = openPanel(
    b ? b.coffee : "Plan Roast",
    `${roastBox}${form}`,
    {
      ...(b ? { page: "Roasting" } : { modal: true }),
      actions,
      footer,
      subtitle: b ? `${b.number ? `${b.number} · ` : ""}${dayName(b.date, { weekday: "long", month: "long", day: "numeric" })} · ${b.greenKg} kg` : "",
      badges: status ? `<span class="badge ${status[0]}"><i></i>${status[1]}</span>` : "",
    }
  );
  if (b && footer) drawer.classList.add("has-foot");
  const upd = () => {
    const f = $("[data-roast-form]", drawer);
    if (!f) return;
    const n = Number(f.greenKg.value);
    $("[data-roast-bags]", drawer).textContent = n > 0 ? `About ${bagsOf(n)} bags of 250g` : "—";
    // Not enough green coffee free on that day: said here, before it's saved.
    const x = v.items.find((y) => y.id === f.greenId?.value);
    const free = x ? freeKg(x.id, f.date.value || dayNow()) : 0;
    $("[data-roast-short]", drawer).innerHTML = x && n > 0 && n > free ? `<p class="notice notice-warn">${icon("syncError")}<span>Only ${esc(String(Math.max(0, free)))} kg of ${esc(x.name)} free by then${free < x.onHand ? ` (${esc(kgText(x.onHand))} on hand, the rest promised to earlier roasts)` : ""}.</span></p>` : "";
  };
  drawer.oninput = upd;
  drawer.onchange = (e) => {
    const f = $("[data-roast-form]", drawer);
    if (f && e.target === f.product) f.greenId.innerHTML = greenOptions(f.product.value, greensFor(f.product.value).find((x) => x.products.includes(f.product.value))?.id, f.date.value);
    else if (f && e.target === f.date) f.greenId.innerHTML = greenOptions(f.product.value, f.greenId.value, f.date.value);
    upd();
  };
  const act = async (body, done) => {
    try {
      state.roast = await api(`/api/admin/roasting/${b.id}`, { method: "PATCH", body });
      render();
      roastPanel({ id: b.id });
      toast(done);
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const body = { date: f.date.value, product: f.product.value, greenId: f.greenId.value, greenKg: f.greenKg.value, note: f.note.value, roasterId: f.roasterId.value, roasterNew: f.roasterNew.hidden ? "" : f.roasterNew.value.trim() };
    try {
      state.roast = b ? await api(`/api/admin/roasting/${b.id}`, { method: "PATCH", body: { action: "edit", ...body } }) : await api("/api/admin/roasting", { method: "POST", body });
      state.roastMonth = body.date.slice(0, 7);
      closeDrawer();
      render();
      const coffeeName = v.coffees.find((c) => c.id === body.product)?.name || "Roast";
      toast(b ? `${coffeeName} saved` : `${coffeeName} planned for ${dayName(body.date)}`);
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-roaster-add]")) {
      const box = e.target.closest(".roaster-field");
      const name = $("[data-roaster-new]", box) as HTMLInputElement;
      ($("[data-roaster-pick]", box) as HTMLElement).hidden = true;
      ($("[data-roaster-add]", box) as HTMLElement).hidden = true;
      name.hidden = false;
      name.focus();
      return;
    }
    if (e.target.closest("[data-roast-undo]")) return act({ action: "undo" }, "Back to planned.");
    if (e.target.closest("[data-roast-mark]")) return act({ action: "roasted", bags: ($("[data-roast-bags-made]", drawer) as HTMLInputElement)?.value }, `${b.coffee} marked roasted`);
    if (e.target.closest("[data-roast-cancel]") && confirm("Cancel this roast?")) {
      api(`/api/admin/roasting/${b.id}`, { method: "PATCH", body: { action: "cancel" } })
        .then((r) => {
          state.roast = r;
          closeDrawer();
          render();
          toast("Roast cancelled.");
        })
        .catch((error) => panelError(error.message));
    }
  };
  upd();
}

async function roastClick(t) {
  const view = t.closest("[data-roast-view]");
  if (view) {
    state.roastView = view.dataset.roastView;
    render();
    return true;
  }
  const pr = t.closest("[data-roast-print]");
  if (pr) return printRoastSheet(pr.dataset.roastPrint, pr.dataset.roastPrintTo || pr.dataset.roastPrint), true;
  const wk = t.closest("[data-roast-week]");
  if (wk) {
    const step = Number(wk.dataset.roastWeek);
    const d = new Date(`${state.roastWeek || isoDay(new Date())}T12:00:00`);
    d.setDate(d.getDate() + step);
    state.roastWeek = step ? isoDay(d) : isoDay(new Date());
    render();
    return true;
  }
  // An overdue roast: done after all (the bags it should make), or moved to today.
  const quick = t.closest("[data-roast-today], [data-roast-done-now]");
  if (quick) {
    const id = quick.dataset.roastToday || quick.dataset.roastDoneNow;
    const b = state.roast.batches.find((x) => x.id === id);
    if (!b) return true;
    const today = isoDay(new Date());
    quick.disabled = true;
    try {
      state.roast = await api(`/api/admin/roasting/${id}`, { method: "PATCH", body: quick.dataset.roastToday ? { action: "edit", date: today } : { action: "roasted", bags: b.expectedBags } });
      render();
      toast(quick.dataset.roastToday ? `${b.coffee} moved to today` : `${b.coffee} marked roasted: ${b.expectedBags} bags`);
    } catch (error) {
      quick.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  const plan = t.closest("[data-roast-plan]");
  if (plan) return roastPanel({ product: plan.dataset.roastPlan || "" }), true;
  const chip = t.closest("[data-roast]");
  if (chip) return roastPanel({ id: chip.dataset.roast }), true;
  const mon = t.closest("[data-roast-month]");
  if (mon) {
    const step = Number(mon.dataset.roastMonth);
    const today = isoDay(new Date()).slice(0, 7);
    if (!step) state.roastMonth = today;
    else {
      const [y, m] = (state.roastMonth || today).split("-").map(Number);
      const d = new Date(y, m - 1 + step, 1);
      state.roastMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    }
    render();
    return true;
  }
  const day = t.closest("[data-roast-day]");
  if (day && !t.closest("button")) return roastPanel({ date: day.dataset.roastDay }), true;
  return false;
}

/* ── Abandoned carts: who left coffee in a checkout, and a note to them (written by the team or
   drafted by Claude), sent through the Inbox ── */

const cartGroups = (v) => {
  const live = v.carts.filter((c) => !c.recovered && !c.dismissed);
  return { open: live.filter((c) => !c.outreach), contacted: live.filter((c) => c.outreach), recovered: v.carts.filter((c) => c.recovered), dismissed: v.carts.filter((c) => c.dismissed && !c.recovered) };
};
const cartItems = (c, n = 2) => {
  const names = c.lines.map((l) => `${l.qty > 1 ? `${l.qty} × ` : ""}${l.title}`);
  return names.slice(0, n).join(", ") + (names.length > n ? ` +${names.length - n} more` : "");
};
// What has happened since: the automated email, the team's note, an order.
const cartFollow = (c) =>
  [
    c.recovered && `<span class="badge t-green"><i></i>Ordered ${esc(c.recovered.number)} · ${money(c.recovered.total)}</span>`,
    c.outreach && `<span class="badge t-purple"><i></i>Emailed${c.outreach.by ? ` by ${esc(c.outreach.by.split(" ")[0])}` : ""} · ${esc(dayShort(c.outreach.at))}</span>`,
    c.autoEmailAt && `<span class="badge t-blue"><i></i>Reminder sent · ${esc(dayShort(c.autoEmailAt))}</span>`,
  ]
    .filter(Boolean)
    .join("") || `<span class="muted">—</span>`;

function cartsView() {
  const v = state.carts;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const g = cartGroups(v);
  const f = state.cartFilter || "open";
  const shown = g[f] || g.open;
  const sum = (list, key = "value") => list.reduce((n, c) => n + (key === "value" ? c.value : c.recovered?.total || 0), 0);
  const kpi = (label, value, foot) => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-foot">${foot}</p></div>`;
  const rate = v.carts.length ? Math.round((g.recovered.length / v.carts.length) * 100) : 0;
  return `
    <section class="kpis carts-kpis">
      ${kpi("Left in a cart", String(v.carts.length), `Last ${v.days} days`)}
      ${kpi("Still waiting", money(sum([...g.open, ...g.contacted])), `${g.open.length + g.contacted.length} cart${g.open.length + g.contacted.length === 1 ? "" : "s"}`)}
      ${kpi("Came back", money(sum(g.recovered, "recovered")), `${g.recovered.length} order${g.recovered.length === 1 ? "" : "s"} · ${rate}%`)}
      ${kpi("Reminder email", v.autoEmail.on ? "On" : "Off", v.autoEmail.on ? `${esc(v.autoEmail.after)} after` : `<a class="link" href="#signups/automations">Turn On</a>`)}
    </section>
    ${chips("Abandoned carts", [
      { filter: "carts:open", label: "To reach out", count: g.open.length, tone: "t-yellow", on: f === "open" },
      { filter: "carts:contacted", label: "Reached out", count: g.contacted.length, tone: "t-purple", on: f === "contacted" },
      { filter: "carts:recovered", label: "Came back", count: g.recovered.length, tone: "s-completed", on: f === "recovered" },
      { filter: "carts:dismissed", label: "Dismissed", count: g.dismissed.length, tone: "s-cancelled", on: f === "dismissed" },
    ])}
    <section class="card table-card">${
      shown.length
        ? `<table class="table carts-table is-labelled">
            <thead><tr><th>Customer</th><th>Cart</th><th class="num">Value</th><th>Left</th><th>Since</th><th class="actions-col"><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>${shown
              .map(
                (c) => `<tr data-cart="${esc(c.id)}" class="clickable">
                  <td>${who(c.name || c.email, c.name ? esc(c.email) : "")}</td>
                  <td>${esc(cartItems(c))}</td>
                  <td class="num">${money(c.value)}</td>
                  <td><span class="nowrap">${esc(ago(c.at))}</span><small class="muted">${c.stage === "payment" ? "At payment" : "At checkout"}</small></td>
                  <td><span class="cart-follow">${cartFollow(c)}</span></td>
                  <td class="row-actions">${c.recovered ? "" : `<button type="button" class="btn btn-sm" data-cart-open>${c.outreach ? "View" : "Reach Out"}</button>`}</td>
                </tr>`
              )
              .join("")}</tbody></table>`
        : `<div class="empty empty-lg">${icon("carts", "i i-xl")}<p><strong>${{ open: "No one to reach out to", contacted: "No notes sent yet", recovered: "None back yet", dismissed: "None dismissed" }[f]}</strong></p></div>`
    }</section>`;
}

async function cartsClick(t) {
  const row = t.closest("tr[data-cart]");
  if (row && (t.closest("[data-cart-open]") || !t.closest("button, a"))) return cartPanel(row.dataset.cart), true;
  return false;
}

// One cart: what was in it and what has happened since, then a note to them.
function cartPanel(id, note = null) {
  const v = state.carts;
  const c = v.carts.find((x) => x.id === id);
  if (!c) return;
  const first = String(c.name || "").split(" ")[0];
  const compose = c.recovered
    ? ""
    : `<section class="panel">
        <h3 class="panel-title">${c.outreach ? "Email Again" : "Reach Out"}</h3>
        <form class="form-stack" data-cart-note>
          <label class="field"><span>Subject</span><input name="subject" maxlength="150" value="${esc(note?.subject ?? "")}" placeholder="Your coffee is still in your cart" required></label>
          <label class="field"><span>Message</span><textarea name="text" rows="10" required placeholder="Hi ${esc(first || "there")},">${esc(note?.body ?? "")}</textarea></label>
          <div class="btn-row">
            <button type="submit" class="btn btn-primary" ${v.email ? "" : "disabled"}>${icon("send")}<span>Send</span></button>
            <button type="button" class="btn" data-cart-draft ${v.drafting ? "" : "disabled"}>${icon("sparkles")}<span>${note ? "Write Again" : "Write With AI"}</span></button>
          </div>
          ${v.email ? "" : `<p class="muted">Email isn't connected yet.</p>`}
        </form>
      </section>`;
  const actions = `${c.outreach?.conversation ? `<a class="btn" href="#inbox/${esc(c.outreach.conversation)}">${icon("inbox")}<span>Open in Inbox</span></a>` : ""}
    ${c.recovered ? "" : `<button type="button" class="btn" data-cart-dismiss="${c.dismissed ? "undo" : ""}">${c.dismissed ? "Undo Dismiss" : "Dismiss"}</button>`}`;
  const drawer = openPanel(
    c.name || c.email,
    `<div class="order-cols">
      <div class="order-main">
        <section class="panel">
          <h3 class="panel-title">Cart</h3>
          <ul class="cart-lines">${c.lines.map((l) => `<li><span><strong>${esc(l.title)}</strong>${l.variant ? `<small class="muted">${esc(l.variant)}</small>` : ""}</span><span class="muted">× ${l.qty}</span><span class="num">${l.price != null ? money(l.price * l.qty) : "—"}</span></li>`).join("")}</ul>
          <p class="cart-total"><span>Total</span><strong>${money(c.value)}</strong></p>
          <a class="btn btn-sm" href="${esc(c.cartLink)}" target="_blank" rel="noopener">${icon("ext")}<span>Their Cart Link</span></a>
        </section>
        ${compose}
      </div>
      <div class="order-side">
        <section class="panel">
          <h3 class="panel-title">Customer</h3>
          <dl class="kv">
            <div><dt>Email</dt><dd>${esc(c.email)}</dd></div>
            ${c.phone ? `<div><dt>Phone</dt><dd>${esc(c.phone)}</dd></div>` : ""}
            <div><dt>Left</dt><dd>${esc(dayShort(c.at))}<small>${c.stage === "payment" ? `At payment · ${esc(c.id)}` : "At checkout"}</small></dd></div>
          </dl>
        </section>
        <section class="panel">
          <h3 class="panel-title">Since</h3>
          <div class="cart-follow is-stacked">${cartFollow(c)}</div>
        </section>
      </div>
    </div>`,
    { page: "Abandoned carts", actions, subtitle: `${money(c.value)} · ${c.stage === "payment" ? "Left at payment" : "Left at checkout"}`, badges: c.recovered ? `<span class="badge t-green"><i></i>Came back</span>` : c.outreach ? `<span class="badge t-purple"><i></i>Reached out</span>` : "" }
  );
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const b = e.target.closest("[data-cart-draft], [data-cart-dismiss]");
    if (!b) return;
    b.disabled = true;
    const label = b.querySelector("span") || b;
    try {
      if (b.matches("[data-cart-draft]")) {
        label.textContent = "Writing…";
        const { draft } = await api(`/api/admin/carts/${id}/draft`, { method: "POST", body: {} });
        cartPanel(id, draft);
      } else {
        state.carts = await api(`/api/admin/carts/${id}/dismiss`, { method: "POST", body: { undo: b.dataset.cartDismiss === "undo" } });
        render();
        closeDrawer();
        toast(b.dataset.cartDismiss === "undo" ? "Back in the list." : "Dismissed.");
      }
    } catch (error) {
      b.disabled = false;
      label.textContent = b.matches("[data-cart-draft]") ? "Write With AI" : "Dismiss";
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      state.carts = await api(`/api/admin/carts/${id}/send`, { method: "POST", body: { subject: f.subject.value, text: f.text.value } });
      render();
      cartPanel(id);
      toast(`Sent to ${c.email}.`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

/* ── Insights: where we show up, posts about us, creators, ideas, prices (AnyAPI) ── */

const INSIGHT_TABS = [
  ["visibility", "Where We Show Up"],
  ["mentions", "Mentions"],
  ["creators", "Creators"],
  ["ideas", "Ideas"],
  ["prices", "Prices"],
  ["settings", "Settings"],
];
const ENGINES = [["google", "Google", "search"], ["localPack", "Google Maps", "building"], ["aiOverview", "AI Overview", "sparkles"], ["chatgpt", "ChatGPT", "chat"], ["perplexity", "Perplexity", "chat"]];

// A small line for a series of numbers (trends, the coffee price).
function sparkline(values, { w = 160, h = 40 } = {}) {
  const v = values.filter((x) => Number.isFinite(x));
  if (v.length < 2) return "";
  const lo = Math.min(...v);
  const hi = Math.max(...v);
  const pts = v.map((x, i) => `${((i / (v.length - 1)) * w).toFixed(1)},${(h - 2 - ((x - lo) / (hi - lo || 1)) * (h - 4)).toFixed(1)}`).join(" ");
  return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// When it last ran, when it runs next, and Run Now: in each section's header.
function runInfo(v, kind) {
  const r = v.runs[kind];
  const busy = v.busy.includes(kind);
  const next = r && v.settings.auto ? new Date(Date.parse(r.at) + v.every[kind] * 864e5).toISOString() : null;
  const failed = r?.result?.errors?.length || 0;
  const errs = failed ? `<span class="ins-err" title="${esc(r.result.errors.join("\n"))}">${icon("syncError", "i i-sm")}${failed === 1 ? "1 lookup didn't work" : `${failed} lookups didn't work`}</span>` : "";
  return `<div class="ins-run">
    <span class="muted">${r ? `Checked ${esc(ago(r.at))}${next ? ` · Next ${esc(dayShort(next))}` : ""}` : "Not checked yet"}</span>${errs}
    <button type="button" class="btn btn-sm" data-insight-run="${kind}" ${(kind === "asked" ? v.drafting : v.anyapi) && !busy ? "" : "disabled"}>${icon("synced")}<span>${busy ? "Running…" : "Run Now"}</span></button>
  </div>`;
}
// A section: a card with its title and, when it has its own check, when it ran and Run Now.
const insightCard = (title, body, { v = null, kind = "", cls = "" } = {}) =>
  `<section class="card ins-card${cls ? ` ${cls}` : ""}"><header class="card-head"><h2>${title}</h2>${v && kind ? runInfo(v, kind) : ""}</header>${body}</section>`;
const insightEmpty = (text) => `<p class="muted ins-empty">${text}</p>`;
const insightKpi = (label, value, foot = "") => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p>${foot ? `<p class="kpi-foot">${foot}</p>` : ""}</div>`;

function insightsPageView() {
  const v = state.insights;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const tab = state.sub;
  const off = v.anyapi ? "" : `<p class="notice">${icon("sparkles")}<span>Insights aren't connected yet.</span></p>`;
  const tabs = subTabs("insights", INSIGHT_TABS.map(([id, label]) => [id, label, id === "mentions" ? v.mentions.filter((m) => m.status === "new").length || "" : id === "creators" ? v.creators.filter((c) => c.status === "new").length || "" : ""]));
  const body = { visibility: visibilityTab, mentions: mentionsTab, creators: creatorsTab, ideas: ideasTab, prices: pricesTab }[tab]?.(v) ?? insightSettings(v);
  return `${off}${tabs}<div class="ins-page">${body}</div>`;
}

function visibilityTab(v) {
  const r = v.runs.visibility;
  const sum = v.visibility;
  const kpis = sum
    ? `<section class="kpis ins-kpis">${sum.engines.map((e) => insightKpi(esc(e.label), `${e.found}<small>/${e.of}</small>`, "searches")).join("")}${
        sum.history.length > 1 ? `<div class="kpi"><p class="kpi-label">Over ${sum.history.length} weeks</p>${sparkline(sum.history.map((h) => h.found / (h.of || 1)), { w: 140, h: 36 })}</div>` : ""
      }</section>`
    : "";
  const cell = (q, k) => {
    const x = q[k] || {};
    if (x.error) return `<span class="muted">Couldn't check</span>`;
    if (!x.found) return `<span class="muted ins-none">—</span>`;
    return `<span class="badge t-green"><i></i>${k === "google" || k === "localPack" ? `#${x.position}` : x.cited ? "Cited" : "Mentioned"}</span>`;
  };
  const rows = r?.result?.results || [];
  const table = rows.length
    ? `<table class="table ins-table is-labelled"><thead><tr><th>Search</th>${ENGINES.map(([, label]) => `<th>${label}</th>`).join("")}</tr></thead><tbody>${rows
        .map((q) => {
          const ahead = (q.localPack?.top || q.google?.top || []).filter((t) => t.title).slice(0, 3);
          return `<tr><td><strong>${esc(q.query)}</strong>${ahead.length ? `<small class="muted">Top: ${ahead.map((t) => esc(t.title)).join(", ")}</small>` : ""}</td>${ENGINES.map(([k]) => `<td>${cell(q, k)}</td>`).join("")}</tr>`;
        })
        .join("")}</tbody></table>`
    : insightEmpty("Not checked yet.");
  const quotes = rows.flatMap((q) => ["chatgpt", "perplexity", "aiOverview"].filter((k) => q[k]?.quote).map((k) => ({ q: q.query, k, quote: q[k].quote })));
  return `${kpis}
    ${insightCard("Searches", table, { v, kind: "visibility", cls: "table-card" })}
    ${quotes.length ? insightCard("What AI Says About Us", `<div class="list">${quotes.map((x) => `<div class="list-row"><span class="list-main"><strong>“${esc(x.quote)}”</strong><small>${esc(ENGINES.find((e) => e[0] === x.k)[1])} · ${esc(x.q)}</small></span></div>`).join("")}</div>`) : ""}`;
}

const num = (x) => (x == null ? "—" : shortCount(x));
// Filters on the left, when it ran and Run Now on the right.
const insightToolbar = (v, kind, filters) => `<div class="ins-toolbar">${filters}${runInfo(v, kind)}</div>`;

function mentionsTab(v) {
  const filter = state.mentionFilter || "new";
  const list = v.mentions.filter((m) => (filter === "new" ? m.status === "new" : m.status === "done"));
  return `${insightToolbar(
    v,
    "mentions",
    chips("Mentions", [
      { filter: "mentions:new", label: "New", count: v.mentions.filter((m) => m.status === "new").length, tone: "t-yellow", on: filter === "new" },
      { filter: "mentions:done", label: "Done", count: v.mentions.filter((m) => m.status === "done").length, tone: "s-completed", on: filter === "done" },
    ])
  )}
    ${
      list.length
        ? `<div class="post-grid">${list
            .map(
              (m) => `<article class="card post-card" data-mention="${esc(m.id)}">
                <header><span class="muted">${esc(m.platform)} · ${esc(m.kind)}</span><span class="muted">${m.at ? esc(dayShort(m.at)) : ""}</span></header>
                <strong class="amb-handle">@${esc(m.author || "—")}</strong>
                <p class="post-caption">${esc(m.caption) || `<span class="muted">No caption</span>`}</p>
                <div class="post-nums"><span>${icon("star", "i i-sm")}${num(m.likes)}</span><span>${icon("chat", "i i-sm")}${num(m.comments)}</span>${m.views != null ? `<span>${icon("eye", "i i-sm")}${num(m.views)}</span>` : ""}</div>
                <div class="btn-row">${m.url ? `<a class="btn btn-sm" href="${esc(m.url)}" target="_blank" rel="noopener">Open</a>` : ""}${m.status === "new" ? `<button type="button" class="btn btn-sm" data-mention-set="done">Done</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-mention-set="new">Undo</button>`}<button type="button" class="btn btn-sm btn-ghost" data-mention-set="hidden">Hide</button></div>
              </article>`
            )
            .join("")}</div>`
        : `<div class="card empty empty-lg">${icon("chat", "i i-xl")}<p><strong>${filter === "new" ? "Nothing new" : "None done yet"}</strong></p></div>`
    }`;
}

function creatorsTab(v) {
  const list = v.creators.filter((c) => c.status === (state.creatorFilter || "new"));
  return `${insightToolbar(
    v,
    "creators",
    chips("Creators", [
      { filter: "creators:new", label: "To look at", count: v.creators.filter((c) => c.status === "new").length, tone: "t-yellow", on: (state.creatorFilter || "new") === "new" },
      { filter: "creators:invited", label: "Invited", count: v.creators.filter((c) => c.status === "invited").length, tone: "s-completed", on: state.creatorFilter === "invited" },
    ])
  )}
    ${
      list.length
        ? `<div class="post-grid">${list
            .map((c) => {
              const url = c.platform === "Instagram" ? `https://www.instagram.com/${c.handle}/` : `https://www.tiktok.com/@${c.handle}`;
              const k = c.check;
              const tone = k?.level ? { genuine: "s-completed", review: "t-yellow", suspect: "t-red" }[k.level] : "";
              return `<article class="card post-card creator-tile" data-creator="${esc(c.id)}">
                <header><span class="muted">${esc(c.platform)} · ${esc(c.why)}</span></header>
                <div class="creator-id">${c.avatar ? `<img class="creator-avatar" src="${esc(c.avatar)}" alt="" referrerpolicy="no-referrer">` : `<span class="creator-avatar">${esc((c.name || c.handle).slice(0, 2).toUpperCase())}</span>`}<div><strong class="amb-handle">@${esc(c.handle)}</strong><span class="muted">${esc(c.name)}</span></div></div>
                ${c.bio ? `<p class="post-caption">${esc(c.bio)}</p>` : ""}
                <div class="post-nums"><span>${num(c.followers)} followers</span>${k?.score != null ? `<span class="badge ${tone}"><i></i>${k.score}% genuine</span>` : k?.likesPerVideo != null ? `<span>${num(k.likesPerVideo)} likes a video</span>` : k?.error ? `<span class="muted">${esc(k.error)}</span>` : ""}</div>
                <div class="btn-row"><a class="btn btn-sm" href="${esc(url)}" target="_blank" rel="noopener">Profile</a><button type="button" class="btn btn-sm" data-creator-check ${v.anyapi ? "" : "disabled"}>${k ? "Check Again" : "Check"}</button>${c.status === "new" ? `<button type="button" class="btn btn-sm" data-creator-set="invited">Invited</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-creator-set="new">Undo</button>`}<button type="button" class="btn btn-sm btn-ghost" data-creator-set="hidden">Hide</button></div>
              </article>`;
            })
            .join("")}</div>`
        : `<div class="card empty empty-lg">${icon("ambassadors", "i i-xl")}<p><strong>No creators yet</strong></p></div>`
    }`;
}

// "Draft a Note" on any idea: Claude writes a Numeral draft from it, which opens in the editor.
const draftBtn = (idea, label = "Draft") =>
  `<button type="button" class="btn btn-sm" data-idea-draft data-kind="${esc(idea.kind)}" data-title="${esc(idea.title)}" data-why="${esc(idea.why || "")}" data-detail="${esc(idea.detail || "")}" data-url="${esc(idea.url || "")}">${icon("edit", "i i-sm")}<span>${label}</span></button>`;
const IDEA_KIND = { asked: ["Asked", "t-blue"], search: ["Searched", "t-green"], reddit: ["Reddit", "t-orange"], news: ["News", "t-purple"] };
// One idea as a row: what it is, why, and Draft (and its source).
const ideaRow = (v, x, { tag = true } = {}) => {
  const [label, tone] = IDEA_KIND[x.kind] || [x.kind, ""];
  return `<div class="list-row idea-row">
    <span class="list-main">${tag ? `<span class="badge ${tone}"><i></i>${esc(label)}</span>` : ""}<strong>${esc(x.title)}</strong><small>${esc(x.why || "")}</small></span>
    <span class="list-side">${x.url ? `<a class="btn btn-sm btn-ghost" href="${esc(x.url)}" target="_blank" rel="noopener">Source</a>` : ""}${v.drafting ? draftBtn(x) : ""}</span>
  </div>`;
};

function ideasTab(v) {
  const r = v.runs.ideas?.result;
  const a = v.runs.asked?.result;
  const month = (t) => new Date(t * 1000).toLocaleDateString("en-US", { month: "short" });
  const short = v.shortlist?.length ? insightCard("This Month's Shortlist", `<div class="list">${v.shortlist.map((x) => ideaRow(v, x)).join("")}</div>`) : "";
  const asked = insightCard(
    "Asked by Our Customers",
    a?.topics?.length
      ? `<div class="list">${a.topics.map((t) => ideaRow(v, { kind: "asked", title: t.title, why: `${t.count} asked · “${t.examples.slice(0, 2).join("”, “")}”`, detail: t.examples.join(" / ") }, { tag: false })).join("")}</div>`
      : insightEmpty(a ? "No repeat questions in the last 30 days." : "Not checked yet."),
    { v, kind: "asked" }
  );
  const trends = r?.trends?.length
    ? `<div class="idea-trends">${r.trends
        .map((s) => {
          const vals = s.points.map((p) => p[1]);
          const peak = s.points.reduce((x, y) => (y[1] > x[1] ? y : x), s.points[0] || [0, 0]);
          const now = vals.at(-1) ?? 0;
          const avg = vals.reduce((n, x) => n + x, 0) / (vals.length || 1);
          return `<div class="idea-trend"><span class="idea-trend-head"><strong>${esc(s.keyword)}</strong><span class="badge ${now >= avg ? "t-green" : ""}"><i></i>${now >= avg ? "Above usual" : "Below usual"}</span></span>${sparkline(vals, { w: 200, h: 40 })}<small class="muted">Peaks in ${peak ? esc(month(peak[0])) : "—"}</small></div>`;
        })
        .join("")}</div>`
    : "";
  const kw = r?.keywords?.length
    ? `<table class="table ins-table is-labelled"><thead><tr><th>Search</th><th class="num">A month</th><th class="num">Difficulty</th><th class="actions-col"><span class="sr-only">Draft</span></th></tr></thead><tbody>${r.keywords
        .slice(0, 18)
        .map((k) => `<tr><td><strong>${esc(k.keyword)}</strong></td><td class="num">${num(k.volume)}</td><td class="num">${k.difficulty ?? "—"}</td><td class="row-actions">${v.drafting ? draftBtn({ kind: "search", title: k.keyword, why: `${num(k.volume)} searches a month` }) : ""}</td></tr>`)
        .join("")}</tbody></table>`
    : "";
  const qs = r?.questions?.length ? `<div class="list">${r.questions.map((q) => ideaRow(v, { kind: "reddit", title: q.title, why: `r/${q.subreddit} · ${num(q.score)} upvotes · ${num(q.comments)} comments`, url: q.url }, { tag: false })).join("")}</div>` : "";
  const news = r?.news?.length ? `<div class="list">${r.news.slice(0, 12).map((n) => ideaRow(v, { kind: "news", title: n.title, why: [n.source, n.at && dayShort(n.at)].filter(Boolean).join(" · "), detail: n.snippet, url: n.url }, { tag: false })).join("")}</div>` : "";
  return `${short}${asked}
    ${insightCard("Trends", trends || insightEmpty("Not checked yet."), { v, kind: "ideas" })}
    ${kw ? insightCard("What People Search", kw, { cls: "table-card" }) : ""}
    ${qs ? insightCard("Asked on Reddit", qs) : ""}
    ${news ? insightCard("In the News", news) : ""}`;
}

// Other roasters' coffees, most reviewed first, each beside our closest one, priced per 250g.
function compareTable(c) {
  if (!c?.rows?.length) return insightEmpty("Not checked yet.");
  const gap = (x) =>
    x.gap == null ? `<span class="muted ins-none">—</span>` : x.gap >= 1 ? `<span class="badge t-orange"><i></i>Ours ${money(x.gap)} more</span>` : x.gap <= -1 ? `<span class="badge t-green"><i></i>Ours ${money(-x.gap)} less</span>` : `<span class="badge"><i></i>Same</span>`;
  const loved = (x) => [x.seller, x.rating != null ? `★ ${x.rating}${x.reviews ? ` (${Number(x.reviews).toLocaleString("en-US")})` : ""}` : ""].filter(Boolean).join(" · ");
  return `<table class="table ins-table compare-table is-labelled"><thead><tr><th>Their coffee</th><th class="num">Per 250g</th><th>Our closest</th><th>Difference</th></tr></thead><tbody>${c.rows
    .map(
      (x) => `<tr>
        <td><a class="ins-title" href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.title)}</a><small class="muted">${esc(loved(x))}</small></td>
        <td class="num">${x.per250 != null ? money(x.per250) : "—"}</td>
        <td>${x.ours ? `${esc(x.ours.name)}<small class="muted">${money(x.ours.price)}</small>` : `<span class="muted ins-none">—</span>`}</td>
        <td>${gap(x)}</td>
      </tr>`
    )
    .join("")}</tbody></table>`;
}

function pricesTab(v) {
  const r = v.runs.prices?.result;
  const rows = v.compare?.rows || [];
  const per = rows.map((x) => x.per250).filter((x) => x != null).sort((a, b) => a - b);
  const matched = rows.filter((x) => x.gap != null);
  const kpis = `<section class="kpis ins-kpis">
    ${insightKpi("Our 250g coffees", v.ours.coffee.length ? `${money(Math.min(...v.ours.coffee))}–${money(Math.max(...v.ours.coffee))}` : "—")}
    ${insightKpi("Theirs, per 250g", per.length ? `${money(per[0])}–${money(per.at(-1))}` : "—", per.length ? `Middle ${money(per[Math.floor(per.length / 2)])}` : "")}
    ${insightKpi("Ours costs more", matched.length ? `${matched.filter((x) => x.gap >= 1).length}<small>/${matched.length}</small>` : "—", matched.length ? "of the coffees like ours" : "")}
  </section>`;
  const searches = (r?.results || [])
    .map((q) => {
      const priced = q.items.filter((i) => i.price != null).sort((a, b) => a.price - b.price);
      const mid = priced.length ? priced[Math.floor(priced.length / 2)].price : null;
      return `<section class="card ins-card table-card"><header class="card-head"><h2 class="ins-query">${esc(q.query)}</h2>${mid != null ? `<span class="muted">Middle ${money(mid)}</span>` : ""}</header>
        <table class="table ins-table"><tbody>${priced
          .slice(0, 8)
          .map((i) => `<tr><td><a class="ins-title" href="${esc(i.url)}" target="_blank" rel="noopener">${esc(i.title)}</a><small class="muted">${esc(i.seller)}</small></td><td class="num">${esc(i.priceText || money(i.price))}</td></tr>`)
          .join("")}</tbody></table></section>`;
    })
    .join("");
  return `${kpis}
    ${insightCard("Compared With Ours", compareTable(v.compare), { v, kind: "prices", cls: "table-card" })}
    ${searches ? `<h2 class="ins-sub">By Search</h2><div class="ins-grid">${searches}</div>` : ""}`;
}

function insightSettings(v) {
  const s = v.settings;
  const area = (name, label, rows = 3) => `<label class="field"><span>${label}</span><textarea name="${name}" rows="${rows}" placeholder="One per line">${esc((s[name] || []).join("\n"))}</textarea></label>`;
  const group = (title, fields) => `<section class="card ins-card"><header class="card-head"><h2>${title}</h2></header><div class="ins-fields">${fields}</div></section>`;
  return `<form class="insight-settings" data-insight-settings>
    <section class="card ins-card"><div class="ins-fields"><label class="checkbox"><input type="checkbox" name="auto" ${s.auto ? "checked" : ""}><span>Run on a schedule</span></label></div></section>
    ${group("Where We Show Up", `${area("queries", "Searches to check (up to 8)", 4)}<label class="field"><span>Area for Google Maps</span><input name="area" value="${esc(s.area)}" placeholder="City,State,Country"></label>`)}
    ${group("Mentions and Creators", `${area("hashtags", "Hashtags")}${area("places", "Places on Instagram")}${area("tiktok", "TikTok searches")}${area("creatorTopics", "Creator topics (TikTok)")}`)}
    ${group("Ideas", `${area("trends", "Google Trends (up to 5)", 5)}${area("keywordSeeds", "Keyword seeds")}${area("questions", "Reddit topics")}${area("news", "News searches")}`)}
    ${group("Prices", area("priceQueries", "Products to compare", 4))}
    <p class="form-error" data-insight-error role="alert"></p>
    <div class="btn-row"><button type="submit" class="btn btn-primary">Save</button></div>
  </form>`;
}

// Overview: where we show up, as a row of numbers.
// Green Coffee: the coffee futures price.
// Shown once there's a price; a check that found none is the server log's business.
function marketCard(m) {
  if (!m?.found) return "";
  const perLb = m.price / 100; // quoted in US cents a pound
  const run = m.canRun ? `<button type="button" class="btn btn-sm" data-market-run ${m.running ? "disabled" : ""}>${icon("synced")}<span>${m.running ? "Running…" : "Run Now"}</span></button>` : "";
  return `<section class="card market-card">
    <div><p class="stat-label">Coffee "C" price</p>${
      `<p class="stat-value">${money(perLb)}<small>/lb</small></p><p class="stat-foot">${m.changePercent != null ? `<span class="delta ${m.changePercent >= 0 ? "up" : "down"}">${icon(m.changePercent >= 0 ? "up" : "down")}${Math.abs(m.changePercent).toFixed(1)}%</span> today · ` : ""}Arabica futures, ${esc(ago(m.at))}</p>`
    }</div>
    ${m.history?.length > 1 ? sparkline(m.history.map((h) => h[1]), { w: 220, h: 48 }) : ""}
    ${run}
  </section>`;
}

async function insightsClick(t) {
  const draft = t.closest("[data-idea-draft]");
  if (draft) {
    const d = draft.dataset;
    draft.disabled = true;
    const label = draft.querySelector("span");
    const was = label.textContent;
    label.textContent = "Writing…";
    try {
      const { note } = await api("/api/admin/insights/draft", { method: "POST", body: { kind: d.kind, title: d.title, why: d.why, detail: d.detail, url: d.url } });
      toast(`Draft saved: ${note.title}`);
      go(`#notes/${note.id}`);
    } catch (error) {
      draft.disabled = false;
      label.textContent = was;
      toast(error.message, "error");
    }
    return true;
  }
  const runBtn = t.closest("[data-insight-run]");
  if (runBtn) {
    runBtn.disabled = true;
    runBtn.querySelector("span").textContent = "Running…";
    try {
      state.insights = await api("/api/admin/insights/run", { method: "POST", body: { kind: runBtn.dataset.insightRun } });
      toast("Done.");
    } catch (error) {
      toast(error.message, "error");
    }
    render();
    return true;
  }
  const mset = t.closest("[data-mention-set]");
  const cset = t.closest("[data-creator-set]");
  const ccheck = t.closest("[data-creator-check]");
  if (mset || cset || ccheck) {
    const card = t.closest("[data-mention], [data-creator]");
    const kind = card.dataset.mention ? "mentions" : "creators";
    const id = card.dataset.mention || card.dataset.creator;
    const b = mset || cset || ccheck;
    b.disabled = true;
    try {
      const { item } = ccheck
        ? await api(`/api/admin/insights/creators/${encodeURIComponent(id)}/check`, { method: "POST", body: {} })
        : await api(`/api/admin/insights/${kind}/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: b.dataset.mentionSet || b.dataset.creatorSet } });
      const list = state.insights[kind];
      Object.assign(list.find((x) => x.id === id), item);
      if (item.status === "hidden") state.insights[kind] = list.filter((x) => x.id !== id);
    } catch (error) {
      toast(error.message, "error");
    }
    render();
    return true;
  }
  return false;
}

app.addEventListener("submit", async (e) => {
  const f = e.target.closest("[data-insight-settings]");
  if (!f) return;
  e.preventDefault();
  const body: any = { auto: f.auto.checked, area: f.area.value };
  for (const k of ["queries", "hashtags", "places", "tiktok", "creatorTopics", "trends", "keywordSeeds", "questions", "news", "priceQueries"]) body[k] = f[k].value;
  try {
    state.insights = await api("/api/admin/insights/settings", { method: "PATCH", body });
    toast("Saved.");
    render();
  } catch (error) {
    $("[data-insight-error]", f).textContent = error.message;
  }
});

/* ── Purchasing: purchase orders to suppliers ── */

const PO_LABEL = { draft: "Draft", sent: "Sent", partial: "Part received", received: "Received", cancelled: "Cancelled" };
const poBadge = (s) => `<span class="badge po-${s}"><i></i>${PO_LABEL[s] || s}</span>`;
// A PO's payment, from its bills: Paid, Part Paid, Unpaid (billed, not paid) or nothing yet.
const poPayTag = (p) => (p.pay === "paid" ? payBadge("paid") : p.pay === "partial" ? `<span class="badge t-yellow"><i></i>Part Paid</span>` : p.pay === "unpaid" ? `<span class="badge"><i></i>Billed</span>` : "");

function purchasingView() {
  const t = state.trade;
  // On order: sent to the supplier and not all here yet (drafts aren't on order until sent).
  const open = t.purchaseOrders.filter((p) => ["sent", "partial"].includes(p.status));
  const drafts = t.purchaseOrders.filter((p) => p.status === "draft");
  // What we owe lives on the bills.
  const billsDue = (state.bills?.bills || []).filter((b) => b.status === "unpaid");
  const pos = sorted("poSort", t.purchaseOrders.filter((p) => matches(state.query, p.number, p.supplierName, ...p.items.map((i) => i.description))));
  const empty = (title, action = "") => `<div class="empty empty-lg">${icon("purchasing", "i i-xl")}<p><strong>${title}</strong></p>${action}</div>`;
  if (state.sub === "stock") return `${marketCard(t.market)}${greenStock()}`;
  if (state.sub === "samples") return samplesView();
  const today = isoDay(new Date());
  const body =
    state.sub === "bills"
      ? billsTable()
      : state.sub === "orders"
      ? pos.length
        ? `<table class="table po-table is-labelled">
            <thead><tr><th>PO</th><th>Supplier</th><th>Status</th><th>Expected</th><th class="num">Total</th><th>Paid</th></tr></thead>
            <tbody>${pos
              .map(
                (p) => `<tr data-po="${esc(p.number)}" class="clickable">
                  <td><strong class="code">${esc(p.number)}</strong><small>${esc(date(p.createdAt))}</small></td>
                  <td>${who(p.supplierName, `${p.items.length} item${p.items.length === 1 ? "" : "s"}`)}</td>
                  <td>${poBadge(p.status)}</td>
                  <td>${p.expected ? `<span class="${["sent", "partial"].includes(p.status) && p.expected < today ? "td-due is-late" : ""}">${esc(new Date(`${p.expected}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</span>` : `<span class="muted">—</span>`}</td>
                  <td class="num"><strong>${money(p.total)}</strong></td>
                  <td>${poPayTag(p) || `<span class="muted">—</span>`}</td>
                </tr>`
              )
              .join("")}</tbody></table>`
        : t.purchaseOrders.length
        ? empty("No purchase orders match that search")
        : empty("No purchase orders yet", `<button type="button" class="btn btn-primary" data-form="po">${icon("plus")}<span>New Purchase Order</span></button>`)
      : t.suppliers.length
      ? `<table class="table is-labelled">
          <thead><tr><th>Supplier</th><th>Contact</th><th class="num">Open orders</th></tr></thead>
          <tbody>${[...t.suppliers]
            .sort((a, b) => (Boolean(a.archivedAt) as any) - (Boolean(b.archivedAt) as any))
            .map(
              (x) => `<tr data-supplier="${esc(x.id)}" class="clickable${x.archivedAt ? " is-archived" : ""}">
                <td>${who(x.name, x.notes ? esc(x.notes) : "", x.archivedAt ? `<span class="badge"><i></i>Archived</span>` : "")}</td>
                <td>${esc(x.contactName || "—")}<small>${esc([x.email, x.phone].filter(Boolean).join(" · ") || "No contact details")}</small></td>
                <td class="num">${open.filter((p) => p.supplierId === x.id).length}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : empty("No suppliers yet", `<button type="button" class="btn btn-primary" data-form="supplier">${icon("plus")}<span>New Supplier</span></button>`);
  return `
    ${state.sub !== "orders" ? (state.sub === "bills" ? billChips() : "") : `<section class="stats stats-3">
      <div class="card stat"><p class="stat-label">On order</p><p class="stat-value">${money(open.reduce((n, p) => n + p.total, 0))}</p><p class="stat-foot">${open.length} sent order${open.length === 1 ? "" : "s"}</p></div>
      <div class="card stat"><p class="stat-label">Drafts</p><p class="stat-value">${money(drafts.reduce((n, p) => n + p.total, 0))}</p><p class="stat-foot">${drafts.length} not sent yet</p></div>
      <div class="card stat"><p class="stat-label">Bills to pay</p><p class="stat-value">${money(billsDue.reduce((n, b) => n + b.total, 0))}</p><p class="stat-foot">${billsDue.length} bill${billsDue.length === 1 ? "" : "s"}${billsDue.some((b) => b.overdue) ? ` · ${billsDue.filter((b) => b.overdue).length} overdue` : ""}</p></div>
    </section>`}
    
    <section class="card table-card${state.sub === "bills" ? " bills-card" : ""}">${body}</section>`;
}

/* ── Counting and the stock log ── */

// Count mode: what we think is there, what's counted, and the difference; Apply saves them all
// (each logged as Counted). Empty means not counted this time.
function countTable(items) {
  const draft = (state.countDraft ||= {});
  const diff = (it) => {
    const v = draft[it.id];
    if (v === undefined || v === "") return "";
    const d = Math.round((Number(v) - (it.expected ?? 0)) * 10) / 10;
    return d === 0 ? `<span class="muted">Same</span>` : `<span class="count-diff ${d > 0 ? "is-up" : "is-down"}">${d > 0 ? "+" : ""}${d}</span>`;
  };
  const n = Object.values(draft).filter((v) => v !== "" && v != null).length;
  return `<div class="count-card">
    <table class="table count-table is-labelled">
      <thead><tr><th>Item</th><th class="num">We have</th><th>Counted</th><th class="num">Difference</th></tr></thead>
      <tbody>${items
        .map(
          (it) => `<tr data-count-row="${esc(it.id)}">
            <td>${who(it.name, esc(it.sub || ""))}</td>
            <td class="num">${it.expected == null ? `<span class="muted">Not counted</span>` : `${Number(it.expected).toLocaleString("en-US")} <small>${esc(it.unit || "")}</small>`}</td>
            <td><input type="number" min="0" step="${it.decimal ? "0.1" : "1"}" inputmode="${it.decimal ? "decimal" : "numeric"}" data-count-input="${esc(it.id)}" value="${esc(draft[it.id] ?? "")}" aria-label="${esc(it.name)} counted"></td>
            <td class="num" data-count-diff>${diff(it)}</td>
          </tr>`
        )
        .join("")}</tbody>
    </table>
    <div class="count-bar"><span class="muted" data-count-n>${n ? `${n} counted` : "Type what's on the shelf"}</span><button type="button" class="btn btn-primary" data-count-apply ${n ? "" : "disabled"}>Apply Counts</button></div>
  </div>`;
}
const LOG_TONE = { Sold: "", "Order cancelled": "t-blue", "Order reopened": "", "Order edited": "", Returned: "t-blue", "Replacement sent": "", Roasted: "t-green", "Roast undone": "t-orange", Received: "t-green", Restock: "t-green", Adjusted: "t-orange", Counted: "t-purple", Set: "t-purple", "Started counting": "t-purple", "Bulk edit": "t-purple" };
// The stock log as rows: what happened, by how much, what was left, and when and who.
const stockLogRows = (log, unit = "", showName = false) =>
  log.length
    ? `<div class="list stock-log">${log
        .map(
          (l) => `<div class="list-row"><span class="list-main"><strong>${showName ? `${esc(l.name)} · ` : ""}<span class="badge ${LOG_TONE[l.reason] || ""}"><i></i>${esc(l.reason)}</span></strong><small>${esc([l.ref, l.by, l.note].filter(Boolean).join(" · "))}${l.ref || l.by || l.note ? " · " : ""}${esc(dayShort(l.at))}</small></span><span class="list-side"><strong class="num ${l.change > 0 ? "is-up" : "is-down"}">${l.change > 0 ? "+" : ""}${l.change}${unit ? ` ${esc(unit)}` : ""}</strong><small class="muted">${l.left ?? l.onHand} after</small></span></div>`
        )
        .join("")}</div>`
    : `<p class="muted">No changes yet.</p>`;

// One product's history, with Restock or Adjust.
async function stockHistoryPanel(key) {
  const item = state.stock.items.find((i) => i.key === key);
  const { log } = await api(`/api/admin/stock/log?key=${encodeURIComponent(key)}`);
  const drawer = openPanel(
    `${item.name}${item.variant ? ` · ${item.variant}` : ""}`,
    `${item.left != null
      ? `<section class="panel"><h3 class="panel-title">Restock or Adjust</h3>
          <form class="form-stack" data-stock-adjust>
            <div class="grid-2">
              <label class="field"><span>What</span><select name="reason"><option value="Restock">Restock (add)</option><option value="Adjusted">Adjust (add or take away)</option></select></label>
              <label class="field"><span>How many</span><input name="add" inputmode="numeric" required placeholder="12 or -2"></label>
            </div>
            <label class="field"><span>Why</span><input name="note" maxlength="200" placeholder="Damaged bag, café use…"></label>
            <div class="btn-row"><button type="submit" class="btn btn-primary">Save</button></div>
          </form></section>`
      : ""}
      <section class="panel"><h3 class="panel-title">History</h3>${stockLogRows(log, "")}</section>`,
    { page: "Stock", subtitle: item.left == null ? "Not counted" : `${item.left} ${item.unit} left` }
  );
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const n = Math.trunc(Number(f.add.value));
    if (!n) return panelError("Enter how many to add or take away.");
    try {
      state.stock = (await api("/api/admin/stock", { method: "PATCH", body: { key, add: f.reason.value === "Restock" ? Math.abs(n) : n, reason: f.reason.value, note: f.note.value } })).stock;
      render();
      stockHistoryPanel(key);
      toast("Saved.");
    } catch (error) {
      panelError(error.message);
    }
  };
}
// Every change, newest first (shop stock or green coffee).
async function stockLogPanel(kind) {
  const green = kind === "green";
  const { log } = await api(green ? "/api/admin/green/log" : "/api/admin/stock/log");
  openPanel(green ? "Green Coffee Log" : "Stock Log", `<section class="panel">${stockLogRows(log, green ? "kg" : "", true)}</section>`, { page: green ? "Green Coffee" : "Stock" });
}

async function countClick(t) {
  const start = t.closest("[data-count-start]");
  if (start) {
    state.counting = start.dataset.countStart === "green" ? "green" : "stock";
    state.countDraft = {};
    render();
    return true;
  }
  if (t.closest("[data-count-cancel]")) {
    state.counting = null;
    state.countDraft = {};
    render();
    return true;
  }
  const log = t.closest("[data-stock-log]");
  if (log) return stockLogPanel(log.dataset.stockLog), true;
  const hist = t.closest("[data-stock-history]");
  if (hist) return stockHistoryPanel(hist.dataset.stockHistory), true;
  const apply = t.closest("[data-count-apply]");
  if (apply) {
    const green = state.counting === "green";
    const entries = Object.entries(state.countDraft || {}).filter(([, v]) => v !== "" && v != null);
    apply.disabled = true;
    try {
      if (green) state.green = await api("/api/admin/green/count", { method: "POST", body: { counts: entries.map(([id, onHand]) => ({ id, onHand: Number(onHand) })) } });
      else {
        const out = await api("/api/admin/stock/count", { method: "POST", body: { counts: entries.map(([key, left]) => ({ key, left: Number(left) })) } });
        state.stock = out.stock;
      }
      state.counting = null;
      state.countDraft = {};
      render();
      toast(`${entries.length} counted.`);
    } catch (error) {
      apply.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  return false;
}
// Use the green cost from roasts as the product's cost (a 1kg bag is four 250g bags of coffee).
document.addEventListener("click", (e) => {
  const b = (e.target as any).closest?.("[data-use-roast-cost]");
  if (!b) return;
  const f = b.closest("form");
  const n = Number(b.dataset.useRoastCost);
  if (f?.cost250) f.cost250.value = n.toFixed(2);
  if (f?.cost1kg) f.cost1kg.value = (n * 4).toFixed(2);
  toast("Filled in. Save to keep it.");
});
// Typing a count updates its difference and the button without redrawing the page.
app.addEventListener("input", (e) => {
  const t: any = e.target;
  if (!t.matches?.("[data-count-input]")) return;
  state.countDraft[t.dataset.countInput] = t.value;
  const row = t.closest("tr");
  const expected = state.counting === "green" ? state.green.items.find((x) => x.id === t.dataset.countInput)?.onHand : state.stock.items.find((i) => i.key === t.dataset.countInput)?.left;
  const cell = $("[data-count-diff]", row);
  if (t.value === "") cell.innerHTML = "";
  else {
    const d = Math.round((Number(t.value) - (expected ?? 0)) * 10) / 10;
    cell.innerHTML = d === 0 ? `<span class="muted">Same</span>` : `<span class="count-diff ${d > 0 ? "is-up" : "is-down"}">${d > 0 ? "+" : ""}${d}</span>`;
  }
  const n = Object.values(state.countDraft).filter((v) => v !== "" && v != null).length;
  $("[data-count-n]").textContent = n ? `${n} counted` : "Type what's on the shelf";
  $("[data-count-apply]").disabled = !n;
});

/* ── Green coffee: stock on the shelf (kg), and the reorder cart ── */

// Out: none on the shelf, whatever its reorder level. Low: at or under its reorder level (what's
// already on order shows beside it).
const greenOut = (x) => x.onHand <= 0;
const greenLow = (x) => greenOut(x) || (x.reorderAt != null && x.onHand <= x.reorderAt);
// Low First: out, then under the reorder level, then the rest; each by how soon it runs out.
const greenUrgency = (x) => (greenOut(x) ? 0 : greenLow(x) ? 1 : 2) * 1e6 + Math.min(999_999, x.daysLeft ?? 999_998);
const kgText = (n) => `${Number(n).toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;

function greenStock() {
  const g = state.green;
  if (!g) return `<section class="card"><p class="muted">Loading…</p></section>`;
  if (state.counting === "green") return `<section class="card table-card">${countTable(g.items.map((x) => ({ id: x.id, name: x.name, sub: [x.origin, x.supplierName].filter(Boolean).join(" · "), expected: x.onHand, unit: "kg", decimal: true })))}</section>`;
  const f = state.greenFilter || "all";
  const inCart = new Set(g.cart.map((l) => l.id));
  const low = g.items.filter(greenLow);
  const rows = sorted("greenSort", (f === "low" ? low : g.items).filter((x) => matches(state.query, x.name, x.origin, x.supplierName, x.lotCode)).sort((a, b) => a.name.localeCompare(b.name)));
  const cartKg = Object.fromEntries(g.cart.filter((l) => !l.later).map((l) => [l.id, l.qty]));
  return `${chips("Green coffee", [
    { filter: "green:all", label: "All", count: g.items.length, on: f === "all" },
    { filter: "green:low", label: "Low", count: low.length, tone: "badge-warn", on: f === "low" },
  ])}
  <section class="card table-card">${
    rows.length
      ? `<table class="table green-table is-labelled">
          <thead><tr><th>Green coffee</th><th>On hand</th><th class="num">For roasts</th><th class="num">On order</th><th class="actions-col"><span class="sr-only">Cart</span></th></tr></thead>
          <tbody>${rows
            .map(
              (x) => `<tr data-green="${esc(x.id)}" class="clickable">
                <td>${who(x.name, esc([x.origin, x.supplierName].filter(Boolean).join(" · ") || "No supplier yet"), greenOut(x) ? `<span class="badge t-red"><i></i>Out</span>` : greenLow(x) ? `<span class="badge t-orange"><i></i>Low</span>` : "")}</td>
                <td>${stockBar(x.onHand, x.reorderAt, "kg", { promised: x.planned, days: x.daysLeft })}</td>
                <td class="num">${x.planned ? kgText(x.planned) : `<span class="muted">—</span>`}</td>
                <td class="num">${x.onOrder ? kgText(x.onOrder) : `<span class="muted">—</span>`}${x.drafted ? `<small>${esc(kgText(x.drafted))} on a draft PO</small>` : ""}</td>
                <td class="row-actions">${inCart.has(x.id) ? `<button type="button" class="btn btn-sm btn-ghost" data-green-cart>In Cart${cartKg[x.id] ? ` · ${esc(kgText(cartKg[x.id]))}` : ""}</button>` : `<button type="button" class="btn btn-sm" data-green-add="${esc(x.id)}">${icon("plus")}<span>Add to Cart</span></button>`}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("purchasing", "i i-xl")}<p><strong>${f === "low" ? "Nothing running low" : "No ingredients yet"}</strong></p>${f === "low" ? "" : `<button type="button" class="btn btn-primary" data-green-new>${icon("plus")}<span>New Ingredient</span></button>`}</div>`
  }</section>`;
}

// Tabs at the top of a record (Peasy's item page): one part shown at a time, the pick kept while
// the record is open again. tabs: [[id, label, count?]].
const recTabs: Record<string, string> = {};
function recordTabs(key, tabs) {
  const on = tabs.some(([k]) => k === recTabs[key]) ? recTabs[key] : tabs[0][0];
  return {
    bar: `<nav class="rec-tabs" role="tablist">${tabs.map(([k, label, n]) => `<button type="button" role="tab" data-rtab="${esc(key)}|${k}" aria-selected="${k === on}">${label}${n ? `<b>${n}</b>` : ""}</button>`).join("")}</nav>`,
    pane: (k, html) => `<div class="rec-pane" role="tabpanel" data-rpane="${esc(key)}|${k}" ${k === on ? "" : "hidden"}>${html}</div>`,
  };
}
document.addEventListener("click", (e) => {
  const t = (e.target as HTMLElement).closest?.("[data-rtab]") as HTMLElement | null;
  if (!t) return;
  const [key, k] = t.dataset.rtab.split("|");
  recTabs[key] = k;
  const scope = t.closest("[data-drawer]") || document;
  for (const b of $$('[role="tab"][data-rtab]', scope)) if (b.dataset.rtab.startsWith(`${key}|`)) b.setAttribute("aria-selected", String(b.dataset.rtab === t.dataset.rtab));
  for (const p of $$("[data-rpane]", scope)) if (p.dataset.rpane.startsWith(`${key}|`)) p.hidden = p.dataset.rpane !== `${key}|${k}`;
});

// One green coffee, in tabs: Details (what it is, who sells it, what it costs, when to reorder),
// Stock (on hand, Restock or Adjust, every change), Roasts (what it was roasted into) and To-Dos.
function greenItemPanel(id = null) {
  const g = state.green;
  const x = id ? g.items.find((y) => y.id === id) : null;
  if (id && !x) return;
  editingNext = x ? `green:${x.id}` : null;
  const tabs = x ? recordTabs("green", [["details", "Details"], ["stock", "Stock"], ["roasts", "Roasts"], ["todos", "To-Dos"]]) : null;
  const drawer = openPanel(
    x ? x.name : "New Ingredient",
    `${tabs ? tabs.bar : ""}${tabs ? `<div class="rec-pane-wrap">` : ""}${tabs ? `<div class="rec-pane" role="tabpanel" data-rpane="green|details" ${recTabs.green && recTabs.green !== "details" ? "hidden" : ""}>` : ""}<form class="form-stack" data-green-form>
      <div class="grid-2">
        <label class="field"><span>Name</span><input name="name" required maxlength="120" value="${esc(x?.name || "")}" placeholder="Muhathi Estate AB"></label>
        <label class="field"><span>Origin</span><input name="origin" maxlength="120" value="${esc(x?.origin || "")}" placeholder="Kirinyaga, Kenya"></label>
        <label class="field"><span>Supplier</span><select name="supplierId"><option value="">Pick a supplier</option>${g.suppliers.map((s) => `<option value="${esc(s.id)}" ${x?.supplierId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
        <label class="field"><span>Cost per kg</span><span class="tax-input"><input name="unitCost" inputmode="decimal" value="${x?.unitCost ?? ""}" placeholder="0.00"><i>USD</i></span></label>
        ${
          // Once it exists, what's on hand changes only by Count or Restock/Adjust (each logged).
          x
            ? `<div class="field"><span>On hand</span><span class="field-value">${esc(kgText(x.onHand))}<button type="button" class="btn btn-sm btn-ghost" data-rtab="green|stock">Restock or Adjust</button></span></div>`
            : `<label class="field"><span>On hand</span><span class="tax-input"><input name="onHand" inputmode="decimal" value="0"><i>kg</i></span></label>`
        }
        <label class="field"><span>Reorder at</span><span class="tax-input"><input name="reorderAt" inputmode="decimal" value="${x?.reorderAt ?? ""}" placeholder="—"><i>kg</i></span></label>
        <label class="field"><span>Order this much</span><span class="tax-input"><input name="reorderQty" inputmode="decimal" value="${x?.reorderQty ?? ""}" placeholder="—"><i>kg</i></span></label>
        <label class="field"><span>Bag size</span><span class="tax-input"><input name="bagKg" inputmode="decimal" value="${x?.bagKg ?? ""}" placeholder="69"><i>kg</i></span></label>
        <label class="field"><span>Supplier's lot code</span><input name="lotCode" maxlength="60" value="${esc(x?.lotCode || "")}"></label>
      </div>
      <fieldset class="field"><legend>Roasted into</legend><div class="check-grid">${g.coffees.map((c) => `<label class="checkbox"><input type="checkbox" name="products" value="${esc(c.id)}" ${x?.products?.includes(c.id) ? "checked" : ""}><span>${esc(c.name)}</span></label>`).join("")}</div></fieldset>
      <label class="field"><span>Notes</span><textarea name="notes" rows="3" maxlength="500">${esc(x?.notes || "")}</textarea></label>
      <div class="btn-row"><button type="submit" class="btn btn-primary">${x ? "Save" : "Add"}</button>${x ? `<button type="button" class="btn btn-ghost is-danger" data-green-delete>Delete</button>` : ""}</div>
    </form>${tabs ? `</div>` : ""}
    ${
      tabs
        ? `${tabs.pane(
            "stock",
            `<section class="panel"><div class="rec-stock"><span><small>On hand</small><strong>${esc(kgText(x.onHand))}</strong></span>${x.reorderAt != null ? `<span><small>Reorder at</small><strong>${esc(kgText(x.reorderAt))}</strong></span>` : ""}<span><small>On order</small><strong>${x.onOrder ? esc(kgText(x.onOrder)) : "—"}</strong></span><span><small>For roasts</small><strong>${x.planned ? esc(kgText(x.planned)) : "—"}</strong></span></div>${stockBar(x.onHand, x.reorderAt, "kg", { promised: x.planned, days: x.daysLeft })}</section>
            <section class="panel"><h3 class="panel-title">Restock or Adjust</h3>
              <form class="form-stack" data-green-adjust>
                <div class="grid-2">
                  <label class="field"><span>What</span><select name="reason"><option value="Restock">Restock (add)</option><option value="Adjusted">Adjust (add or take away)</option></select></label>
                  <label class="field"><span>Kg</span><span class="tax-input"><input name="add" inputmode="decimal" required placeholder="60 or -2.5"><i>kg</i></span></label>
                </div>
                <label class="field"><span>Why</span><input name="note" maxlength="200" placeholder="Delivery, spilled, sample roast…"></label>
                <div class="btn-row"><button type="submit" class="btn btn-primary">Save</button></div>
              </form></section>
            <section class="panel"><h3 class="panel-title">Log</h3><div data-green-history><p class="muted">Loading…</p></div></section>`
          )}${tabs.pane("roasts", `<section class="panel" data-green-roasts><p class="muted">Loading…</p></section>`)}${tabs.pane("todos", `<section class="panel" data-green-todos><p class="muted">Loading…</p></section>`)}</div>`
        : ""
    }`,
    { page: "Green Coffee", subtitle: x ? [x.origin, x.supplierName].filter(Boolean).join(" · ") : "", actions: x ? todoAddButton("green", x.id, x.name) : "" }
  );
  if (x) api(`/api/admin/green/log?item=${encodeURIComponent(x.id)}`).then(({ log }) => {
    const box = $("[data-green-history]", drawer);
    if (box) box.innerHTML = stockLogRows(log, "kg");
  }).catch(() => {});
  if (x) {
    // Roasts: every batch roasted (or planned) from it, newest first.
    api("/api/admin/roasting")
      .then((r) => {
        const box = $("[data-green-roasts]", drawer);
        if (!box) return;
        const mine = (r.batches || []).filter((b) => b.greenId === x.id).sort((a, b) => b.date.localeCompare(a.date));
        box.innerHTML = mine.length
          ? `<div class="list">${mine
              .map(
                (b) => `<div class="list-row"><span class="list-main"><strong>${esc(b.coffee)}</strong><small>${esc(dayShort(`${b.date}T12:00:00`))}${b.roasterName ? ` · ${esc(b.roasterName)}` : ""}</small></span><span class="list-side"><span class="badge ${b.status === "roasted" ? "t-green" : "t-blue"}"><i></i>${b.status === "roasted" ? "Roasted" : "Planned"}</span><small class="muted">${esc(kgText(b.greenKg))}${b.status === "roasted" && b.bags ? ` · ${b.bags} bags` : ` · about ${b.expectedBags} bags`}</small></span></div>`
              )
              .join("")}</div>`
          : `<div class="empty">${icon("roasting", "i i-xl")}<p><strong>No roasts yet</strong></p>${canOpen("roasting") ? `<a class="btn btn-primary" href="#roasting">${icon("plus")}<span>Plan Roast</span></a>` : ""}</div>`;
      })
      .catch(() => {});
    // To-Dos: the open ones linked to it, and Add To-do.
    api("/api/admin/todos")
      .then((r) => {
        const box = $("[data-green-todos]", drawer);
        if (!box) return;
        const mine = (r.todos || []).filter((t) => t.link?.kind === "green" && t.link.id === x.id);
        box.innerHTML = `${
          mine.length
            ? `<div class="list">${mine.map((t) => `<div class="list-row"><span class="list-main"><strong>${esc(t.title)}</strong><small>${t.status === "done" ? "Done" : t.due ? `Due ${esc(dayShort(`${t.due}T12:00:00`))}` : "Open"}${t.assigneeName ? ` · ${esc(t.assigneeName)}` : ""}</small></span></div>`).join("")}</div>`
            : `<p class="muted">No to-dos for this coffee.</p>`
        }`;
      })
      .catch(() => {});
  }
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    // Restock or Adjust, from the Stock tab.
    if (f.matches("[data-green-adjust]")) {
      const n = Number(f.add.value);
      if (!n) return panelError("Enter how many kg to add or take away.");
      try {
        state.green = await api(`/api/admin/green/items/${x.id}/adjust`, { method: "POST", body: { add: n, reason: f.reason.value, note: f.note.value } });
        render();
        greenItemPanel(x.id);
        toast("Saved.");
      } catch (error) {
        panelError(error.message);
      }
      return;
    }
    const body = { name: f.name.value, origin: f.origin.value, supplierId: f.supplierId.value, unitCost: f.unitCost.value || 0, ...(x ? {} : { onHand: f.onHand.value || 0 }), reorderAt: f.reorderAt.value, reorderQty: f.reorderQty.value, bagKg: f.bagKg.value, lotCode: f.lotCode.value, products: $$("[name=products]:checked", f).map((c) => c.value), notes: f.notes.value };
    try {
      state.green = await api(x ? `/api/admin/green/items/${x.id}` : "/api/admin/green/items", { method: x ? "PATCH" : "POST", body });
      closeDrawer();
      render();
      toast(x ? "Saved." : `${body.name} added.`);
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (!e.target.closest("[data-green-delete]") || !confirm(`Delete ${x.name}?`)) return;
    try {
      state.green = await api(`/api/admin/green/items/${x.id}`, { method: "DELETE" });
      closeDrawer();
      render();
    } catch (error) {
      panelError(error.message);
    }
  };
}

// The cart: what to order, grouped by supplier (each becomes a purchase order). "Later" keeps a
// line without ordering it. Saved as it changes.
function greenCartPanel() {
  const g = state.green;
  const item = (id) => g.items.find((x) => x.id === id);
  const lines = g.cart.filter((l) => item(l.id));
  const now = lines.filter((l) => !l.later);
  const later = lines.filter((l) => l.later);
  const total = now.reduce((n, l) => n + l.qty * l.unitCost, 0);
  const groups = new Map();
  for (const l of now) {
    const k = item(l.id).supplierId || "";
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(l);
  }
  const line = (l) => {
    const x = item(l.id);
    return `<div class="cart-line" data-cart-line="${esc(l.id)}">
      <div class="cart-line-head"><strong>${esc(x.name)}</strong><span class="muted">${esc(kgText(x.onHand))} on hand</span></div>
      <div class="cart-line-fields${x.bagKg ? " has-bags" : ""}">
        ${x.bagKg ? `<label class="field"><span>Bags of ${x.bagKg} kg</span><input name="bags" inputmode="numeric" value="${Math.round((l.qty / x.bagKg) * 10) / 10}"></label>` : ""}
        <label class="field"><span>Kg</span><input name="qty" inputmode="decimal" value="${l.qty}"></label>
        <label class="field"><span>Cost per kg</span><span class="tax-input"><input name="unitCost" inputmode="decimal" value="${l.unitCost}"><i>USD</i></span></label>
        <p class="cart-line-total"><span>Line total</span><strong>${money(l.qty * l.unitCost)}</strong></p>
      </div>
      <div class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-cart-later>${l.later ? "Move to Cart" : "Save for Later"}</button><button type="button" class="btn btn-sm btn-ghost" data-cart-remove>Remove</button></div>
    </div>`;
  };
  const supplier = (id) => g.suppliers.find((s) => s.id === id);
  const drawer = openPanel(
    "Cart",
    lines.length
      ? `<div class="cart-groups">${[...groups]
          .map(
            ([sid, ls]) => `<section class="panel cart-group" data-cart-supplier="${esc(sid)}"><header class="cart-group-head"><h3 class="panel-title">${esc(supplier(sid)?.name || "No supplier")}</h3><span class="muted">${ls.length} item${ls.length === 1 ? "" : "s"} · ${money(ls.reduce((n, l) => n + l.qty * l.unitCost, 0))}</span></header>
              ${sid ? `<div class="cart-opts"><label class="mini-switch"><span>Email it</span><input type="checkbox" name="email" ${g.email && supplier(sid)?.email ? "checked" : "disabled"}><i aria-hidden="true"></i></label><label class="mini-switch"><span>ASAP</span><input type="checkbox" name="asap"><i aria-hidden="true"></i></label></div>` : `<p class="form-error">Pick a supplier for these before ordering.</p>`}
              ${ls.map(line).join("")}</section>`
          )
          .join("")}
          ${later.length ? `<section class="panel cart-group is-later"><header class="cart-group-head"><h3 class="panel-title">Later</h3><span class="muted">Not ordered</span></header>${later.map(line).join("")}</section>` : ""}
        </div>
        <form class="cart-submit" data-cart-submit>
          <p class="cart-total"><span>Total</span><strong>${money(total)}</strong></p>
          <label class="field"><span>Needed by</span><input type="date" name="expected"></label>
          <button type="submit" class="btn btn-primary" ${now.length ? "" : "disabled"}>${groups.size > 1 ? `Create ${groups.size} Purchase Orders` : "Create Purchase Order"}</button>
        </form>`
      : `<div class="empty">${icon("cart", "i i-xl")}<p><strong>The cart is empty</strong></p></div>`,
    { page: "Green Coffee", subtitle: lines.length ? `${now.length} to order${later.length ? ` · ${later.length} for later` : ""}` : "" }
  );
  const save = async (next) => {
    try {
      state.green = await api("/api/admin/green/cart", { method: "PUT", body: { lines: next } });
      render();
      greenCartPanel();
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onchange = (e) => {
    const row = e.target.closest("[data-cart-line]");
    if (!row) return;
    // Bags set the kilos (bags × bag size).
    const x = item(row.dataset.cartLine);
    const qty = e.target.name === "bags" && x?.bagKg ? (Number(e.target.value) || 0) * x.bagKg : Number($("[name=qty]", row).value) || 0;
    save(g.cart.map((l) => (l.id === row.dataset.cartLine ? { ...l, qty, unitCost: Number($("[name=unitCost]", row).value) || 0 } : l)));
  };
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const row = e.target.closest("[data-cart-line]");
    if (row && e.target.closest("[data-cart-remove]")) return save(g.cart.filter((l) => l.id !== row.dataset.cartLine));
    if (row && e.target.closest("[data-cart-later]")) return save(g.cart.map((l) => (l.id === row.dataset.cartLine ? { ...l, later: !l.later } : l)));
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target;
    const b = $("button[type=submit]", f);
    b.disabled = true;
    try {
      const suppliers = Object.fromEntries($$("[data-cart-supplier]", drawer).filter((x) => x.dataset.cartSupplier).map((x) => [x.dataset.cartSupplier, { email: $("[name=email]", x).checked, asap: $("[name=asap]", x).checked }]));
      const out = await api("/api/admin/green/cart/submit", { method: "POST", body: { suppliers, expected: f.expected.value } });
      state.green = out;
      state.trade = await api("/api/admin/trade");
      closeDrawer();
      toast(out.made.map((p) => `${p.number} ${p.emailed ? `emailed to ${p.supplier}` : `saved for ${p.supplier}`}`).join(" · "));
      go("#purchasing/orders");
    } catch (error) {
      b.disabled = false;
      panelError(error.message);
    }
  };
}

/* ── Green coffee samples: request, arrive, cup, approve (a green coffee in the cart) ── */

const SAMPLE_LABEL = { requested: "Requested", arrived: "To cup", cupped: "Cupped", approved: "Approved", declined: "Declined" };
const SAMPLE_TONE = { requested: "t-blue", arrived: "t-yellow", cupped: "t-purple", approved: "t-green", declined: "s-cancelled" };
const sampleBadge = (s) => `<span class="badge ${SAMPLE_TONE[s] || ""}"><i></i>${SAMPLE_LABEL[s] || s}</span>`;
const scoreText = (n) => (n == null ? "" : Number(n).toFixed(2).replace(/0$/, "").replace(/\.0$/, ""));

function samplesView() {
  const g = state.green;
  if (!g) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const all = g.samples || [];
  const f = state.sampleFilter || "open";
  const open = all.filter((x) => ["requested", "arrived", "cupped"].includes(x.status));
  const rows = sorted("sampleSort", f === "open" ? open : f === "all" ? all : all.filter((x) => x.status === f));
  // What to do next with it, beside it.
  const next = (x) =>
    x.status === "requested"
      ? `<button type="button" class="btn btn-sm" data-sample-arrived="${esc(x.id)}">Arrived</button>`
      : x.status === "arrived"
      ? `<button type="button" class="btn btn-sm" data-sample="${esc(x.id)}">Cup</button>`
      : x.status === "cupped"
      ? `<button type="button" class="btn btn-sm" data-sample-approve="${esc(x.id)}">Approve</button>`
      : x.status === "approved" && x.itemId
      ? `<button type="button" class="btn btn-sm btn-ghost" data-sample-item="${esc(x.itemId)}">View Coffee</button>`
      : "";
  return `${chips("Samples", [
    { filter: "samples:open", label: "Open", count: open.length, on: f === "open" },
    { filter: "samples:approved", label: "Approved", count: all.filter((x) => x.status === "approved").length, tone: "t-green", on: f === "approved" },
    { filter: "samples:declined", label: "Declined", count: all.filter((x) => x.status === "declined").length, on: f === "declined" },
    { filter: "samples:all", label: "All", count: all.length, on: f === "all" },
  ])}
  <section class="card table-card">${
    rows.length
      ? `<table class="table samples-table is-labelled">
          <thead><tr><th>Sample</th><th>Supplier</th><th>Status</th><th class="num">Score</th><th class="num">Per kg</th><th class="actions-col"><span class="sr-only">Next</span></th></tr></thead>
          <tbody>${rows
            .map(
              (x) => `<tr data-sample="${esc(x.id)}" class="clickable">
                <td>${who(x.name, esc([x.origin, x.process].filter(Boolean).join(" · ") || date(x.requestedAt)))}</td>
                <td>${x.supplierName ? esc(x.supplierName) : `<span class="muted">—</span>`}</td>
                <td>${sampleBadge(x.status)}</td>
                <td class="num">${x.score != null ? `<strong>${scoreText(x.score)}</strong>` : `<span class="muted">—</span>`}</td>
                <td class="num">${x.unitCost != null ? money(x.unitCost) : `<span class="muted">—</span>`}</td>
                <td class="row-actions">${next(x)}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("FlaskConical", "i i-xl")}<p><strong>${f === "open" ? "No samples to cup" : "No samples here"}</strong></p>${f === "open" ? `<p class="empty-line">Ask a supplier for a sample, cup it, then buy it.</p><button type="button" class="btn btn-primary" data-sample-new>${icon("plus")}<span>Request Sample</span></button>` : ""}</div>`
  }</section>`;
}

// One sample: what it is and who sends it; once it's here, its cup score and notes.
function samplePanel(id = null) {
  const g = state.green;
  const x = id ? (g.samples || []).find((y) => y.id === id) : null;
  if (id && !x) return;
  const done = x?.status === "approved";
  const cupping = x && x.status !== "requested";
  const supplier = (sid) => g.suppliers.find((s) => s.id === sid);
  const drawer = openPanel(
    x ? x.name : "Request Sample",
    `<form class="form-stack sample-form" data-sample-form id="sample-form">
      ${
        cupping
          ? `<section class="panel sample-cup">
              <label class="field"><span>Cup score</span><span class="tax-input"><input name="score" inputmode="decimal" value="${x.score ?? ""}" placeholder="85" ${done ? "disabled" : ""}><i>/ 100</i></span></label>
              <label class="field"><span>Cupping notes</span><textarea name="notes" rows="3" maxlength="1000" placeholder="Stone fruit, black tea, long finish" ${done ? "disabled" : ""}>${esc(x.notes || "")}</textarea></label>
            </section>`
          : ""
      }
      <div class="grid-2">
        <label class="field"><span>Coffee</span><input name="name" required maxlength="120" value="${esc(x?.name || "")}" placeholder="Muhathi Estate AB" ${done ? "disabled" : ""}></label>
        <label class="field"><span>Origin</span><input name="origin" maxlength="120" value="${esc(x?.origin || "")}" placeholder="Kirinyaga, Kenya" ${done ? "disabled" : ""}></label>
        <label class="field"><span>Process</span><input name="process" maxlength="60" value="${esc(x?.process || "")}" placeholder="Washed" ${done ? "disabled" : ""}></label>
        <label class="field"><span>Supplier</span><select name="supplierId" ${done ? "disabled" : ""}><option value="">Pick a supplier</option>${g.suppliers.map((s) => `<option value="${esc(s.id)}" ${x?.supplierId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
        <label class="field"><span>Price per kg</span><span class="tax-input"><input name="unitCost" inputmode="decimal" value="${x?.unitCost ?? ""}" placeholder="0.00" ${done ? "disabled" : ""}><i>USD</i></span></label>
        <label class="field"><span>Bag size</span><span class="tax-input"><input name="bagKg" inputmode="decimal" value="${x?.bagKg ?? ""}" placeholder="69" ${done ? "disabled" : ""}><i>kg</i></span></label>
        <label class="field"><span>Supplier's lot code</span><input name="lotCode" maxlength="60" value="${esc(x?.lotCode || "")}" ${done ? "disabled" : ""}></label>
      </div>
      ${cupping ? "" : `<label class="field"><span>Notes</span><textarea name="notes" rows="2" maxlength="1000">${esc(x?.notes || "")}</textarea></label>`}
      ${x ? "" : `<label class="mini-switch sample-email"><span>Email the supplier for it</span><input type="checkbox" name="email" ${g.email ? "checked" : "disabled"}><i aria-hidden="true"></i></label>`}
      ${done && x.itemName ? `<p class="muted">Bought as ${esc(x.itemName)}.</p>` : ""}
    </form>`,
    {
      modal: true,
      badges: x ? sampleBadge(x.status) : "",
      subtitle: x ? `Requested ${date(x.requestedAt)}${x.by ? ` by ${x.by}` : ""}` : "",
      footer: done
        ? `<div class="modal-foot-side"><button type="button" class="btn btn-ghost is-danger" data-sample-delete>Delete</button></div><div class="modal-foot-side"><button type="button" class="btn btn-primary" data-sample-item="${esc(x.itemId || "")}">View Coffee</button></div>`
        : `<div class="modal-foot-side">${x ? `<button type="button" class="btn btn-ghost is-danger" data-sample-delete>Delete</button>` : ""}${x && x.status !== "declined" ? `<button type="button" class="btn btn-ghost" data-sample-decline>Decline</button>` : ""}</div>
           <div class="modal-foot-side">${x?.status === "declined" ? `<button type="button" class="btn" data-sample-reopen>Reopen</button>` : ""}${x?.status === "requested" ? `<button type="button" class="btn" data-sample-arrived="${esc(x.id)}">Arrived</button>` : ""}${x && ["arrived", "cupped"].includes(x.status) ? `<button type="button" class="btn" data-sample-approve="${esc(x.id)}">Approve</button>` : ""}<button type="submit" form="sample-form" class="btn btn-primary">${x ? "Save" : "Request Sample"}</button></div>`,
    }
  );
  const f = $("[data-sample-form]", drawer) as any;
  const values = () => ({ name: f.name.value, origin: f.origin.value, process: f.process.value, supplierId: f.supplierId.value, unitCost: f.unitCost.value, bagKg: f.bagKg.value, lotCode: f.lotCode.value, ...(f.score && { score: f.score.value }), ...(f.notes && { notes: f.notes.value }) });
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const out = await api(x ? `/api/admin/green/samples/${x.id}` : "/api/admin/green/samples", { method: x ? "PATCH" : "POST", body: { ...values(), ...(!x && { email: f.email?.checked }) } });
      state.green = out;
      closeDrawer();
      render();
      const s = supplier(f.supplierId.value);
      toast(x ? "Saved." : out.emailed ? `Sample requested from ${s?.name}.` : "Sample saved.");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onclick = async (e) => {
    const t = e.target as HTMLElement;
    if (t.closest("[data-close]")) return closeDrawer();
    const go2 = t.closest("[data-sample-item]") as HTMLElement;
    if (go2) {
      closeDrawer();
      go("#purchasing/stock");
      return setTimeout(() => greenItemPanel(go2.dataset.sampleItem), 300);
    }
    const status = t.closest("[data-sample-decline]") ? "declined" : t.closest("[data-sample-reopen]") ? "requested" : t.closest("[data-sample-arrived]") ? "arrived" : "";
    try {
      if (status) {
        state.green = await api(`/api/admin/green/samples/${x.id}`, { method: "PATCH", body: { ...values(), status } });
        closeDrawer();
        render();
        return toast(status === "declined" ? "Declined." : status === "arrived" ? "Marked arrived. Cup it when ready." : "Reopened.");
      }
      if (t.closest("[data-sample-approve]")) {
        // Saves what's typed (the score) first.
        state.green = await api(`/api/admin/green/samples/${x.id}`, { method: "PATCH", body: values() });
        closeDrawer();
        return approveSample(x.id);
      }
      if (t.closest("[data-sample-delete]") && confirm(`Delete the sample of ${x.name}?`)) {
        state.green = await api(`/api/admin/green/samples/${x.id}`, { method: "DELETE", body: {} });
        closeDrawer();
        render();
      }
    } catch (error) {
      panelError(error.message);
    }
  };
}

// Approve: it becomes a green coffee, a bag of it in the cart for the supplier's purchase order.
async function approveSample(id) {
  const x = state.green.samples.find((y) => y.id === id);
  if (!x) return;
  try {
    const out = await api(`/api/admin/green/samples/${id}/approve`, { method: "POST", body: {} });
    state.green = out;
    render();
    toast(out.inCart ? `${x.name} added to Green Coffee, a bag in the cart.` : `${x.name} added to Green Coffee.`);
    if (out.inCart) greenCartPanel();
  } catch (error) {
    if (/supplier|price/i.test(error.message)) {
      samplePanel(id);
      return panelError(error.message);
    }
    toast(error.message, "error");
  }
}

async function sampleClick(t) {
  if (t.closest("[data-sample-new]")) return samplePanel(), true;
  const arrived = t.closest("[data-sample-arrived]");
  if (arrived) {
    arrived.disabled = true;
    try {
      state.green = await api(`/api/admin/green/samples/${arrived.dataset.sampleArrived}`, { method: "PATCH", body: { status: "arrived" } });
      render();
      toast("Marked arrived. Cup it when ready.");
    } catch (error) {
      arrived.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  const approve = t.closest("[data-sample-approve]");
  if (approve) return approveSample(approve.dataset.sampleApprove), true;
  const item = t.closest("[data-sample-item]");
  if (item) {
    go("#purchasing/stock");
    setTimeout(() => greenItemPanel(item.dataset.sampleItem), 300);
    return true;
  }
  const row = t.closest("[data-sample]");
  if (row && (!t.closest("button, a") || t.closest("button[data-sample]"))) return samplePanel(row.dataset.sample), true;
  return false;
}

async function greenClick(t) {
  if (await sampleClick(t)) return true;
  if (t.closest("[data-green-new]")) return greenItemPanel(), true;
  if (t.closest("[data-green-cart]")) return greenCartPanel(), true;
  const add = t.closest("[data-green-add]");
  if (add) {
    const x = state.green.items.find((y) => y.id === add.dataset.greenAdd);
    const want = x.reorderQty || Math.max(1, Math.round(((x.reorderAt || 0) * 2 - x.onHand) * 10) / 10) || 1;
    // In whole bags when the supplier sells by the bag.
    const qty = x.bagKg ? Math.max(1, Math.ceil(want / x.bagKg)) * x.bagKg : want;
    add.disabled = true;
    // With the cart open beside the list, it stays open and shows the new line.
    const cartOpen = !$("[data-drawer]").hidden && $("[data-drawer] h2")?.textContent === "Cart";
    try {
      state.green = await api("/api/admin/green/cart", { method: "PUT", body: { lines: [...state.green.cart, { id: x.id, qty, unitCost: x.unitCost }] } });
      render();
      if (cartOpen) greenCartPanel();
      toast(`${x.name}: ${kgText(qty)} in the cart.`);
    } catch (error) {
      add.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  const row = t.closest("tr[data-green]");
  if (row && !t.closest("button, a")) return greenItemPanel(row.dataset.green), true;
  return false;
}

// A PDF on a phone: the share sheet (Save to Files, Print, Mail), so the app stays open behind
// it; opening the file itself in an app with no browser bar left no way back. The file is fetched
// when its button shows, since the sheet must open straight from the tap; until it's here, the
// link opens in a sheet with Done. Computers download it as usual.
const pdfReady = new Map<string, { at: number; file: File | null }>();
const onPhone = () => matchMedia("(pointer: coarse)").matches && typeof navigator.canShare === "function";
new MutationObserver(() => {
  if (!onPhone()) return;
  for (const a of document.querySelectorAll<HTMLAnchorElement>("a[data-pdf]")) {
    a.target = "_blank";
    a.removeAttribute("download");
    const had = pdfReady.get(a.href);
    if (had && Date.now() - had.at < 60_000) continue;
    const entry = { at: Date.now(), file: null as File | null };
    pdfReady.set(a.href, entry);
    fetch(a.href, { credentials: "same-origin" })
      .then((r) => (r.ok ? r.blob() : null))
      .then((b) => (entry.file = b ? new File([b], a.dataset.pdf || "document.pdf", { type: "application/pdf" }) : null))
      .catch(() => {});
  }
}).observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener("click", (e) => {
  const a = (e.target as HTMLElement).closest?.("a[data-pdf]") as HTMLAnchorElement | null;
  const file = a && onPhone() ? pdfReady.get(a.href)?.file : null;
  if (!file || !navigator.canShare({ files: [file] })) return;
  e.preventDefault();
  navigator.share({ files: [file] }).catch(() => {});
});

// Copy a value shown on a page (the imports address…).
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest?.("[data-copy-text]") as HTMLElement | null;
  if (b) navigator.clipboard?.writeText(b.dataset.copyText || "").then(() => toast("Copied"), () => {});
});

/* ── Forms and detail panels (in the side panel) ── */

// The item the next panel edits (set just before openPanel), for "someone else is editing this".
let editingNext = null;
// page: a back label ("Customers") opens it as its own page, like an order; actions sit top right.
// page: a full page with a back button (records with a lot in them). modal: a popup over the page
// (a bottom sheet on a phone) for quick forms, its buttons in `footer`. Otherwise a side drawer.
function openPanel(title, html, { badges = "", subtitle = "", editing = editingNext, page = "", actions = "", modal = false, footer = "" } = {}) {
  editingNext = null;
  // Another record or form takes the order's place: the address no longer names the order.
  if (title !== "Edit Items") orderOutOfUrl(true);
  panelKey = editing;
  setTimeout(syncPresence, 0);
  state.panel = true;
  state.open = null;
  const drawer = $("[data-drawer]");
  drawer.hidden = false;
  drawer.classList.toggle("is-order-page", Boolean(page) && !modal);
  drawer.classList.toggle("is-modal", modal);
  $("[data-scrim]").hidden = Boolean(page) && !modal;
  $("[data-scrim]").classList.toggle("is-blur", modal);
  drawer.innerHTML = modal
    ? title
      ? `<header class="drawer-head modal-head"><div>${badges ? `<div class="drawer-badges">${badges}</div>` : ""}<h2>${esc(title)}</h2>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ""}</div><div class="modal-head-side">${actions}<button type="button" class="icon-btn" data-close aria-label="Close">${icon("close")}</button></div></header>`
      : `<button type="button" class="icon-btn modal-close" data-close aria-label="Close">${icon("close")}</button>`
    : page
    ? `
    <header class="drawer-head order-head">
      <div>
        <div class="order-title">
          <button type="button" class="icon-btn order-back" data-close aria-label="Back to ${esc(page)}">${icon("arrow")}</button>
          <h2>${esc(title)}</h2>${badges ? `<div class="drawer-badges">${badges}</div>` : ""}
        </div>
        ${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ""}
      </div>
      <div class="order-head-actions">${actions}<button type="button" class="icon-btn page-close" data-close aria-label="Close">${icon("close")}</button></div>
    </header>`
    : `
    <header class="drawer-head">
      <div>${badges ? `<div class="drawer-badges">${badges}</div>` : ""}<h2>${esc(title)}</h2>${subtitle ? `<p class="muted">${esc(subtitle)}</p>` : ""}</div>
      <div class="modal-head-side">${actions}<button type="button" class="icon-btn" data-close aria-label="Close" data-tip="Close">${icon("close")}</button></div>
    </header>`;
  drawer.innerHTML += `<div class="drawer-body">${html}<p class="form-error" role="alert" data-drawer-error></p></div>${footer ? `<footer class="modal-foot">${footer}</footer>` : ""}`;
  labelTables(drawer);
  // A popup's buttons end with Cancel beside the main one (Peasy's).
  if (modal) for (const bar of $$("form > .drawer-actions:last-child", drawer)) if (!$("[data-close]", bar)) bar.firstElementChild?.insertAdjacentHTML("afterend", `<button type="button" class="btn" data-close>Cancel</button>`);
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) closeDrawer();
  };
  drawer.onsubmit = null;
  return drawer;
}

// The message sits just above the form's buttons (not under them, out of sight) and scrolls into view.
const panelError = (message) => {
  const el = $("[data-drawer] [data-drawer-error]");
  if (!el) return;
  el.textContent = message;
  const actions = lastForm?.closest("[data-drawer]") && $(".drawer-actions", lastForm);
  if (actions && el.nextElementSibling !== actions) actions.before(el);
  if (message) el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  if (message && lastForm?.closest("[data-drawer]")) flagFields(lastForm, message);
};

const stateOptions = (selected) =>
  `<option value="">State</option>${state.trade.states.map((c) => `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`).join("")}`;

// Another place an account delivers to: its name and address (the café can add these too).
const locationRow = (l: any = {}) => `<div class="acct-loc" data-acct-loc="${esc(l.id || "")}">
    <input name="locName" value="${esc(l.name || "")}" placeholder="Name, e.g. Downtown" aria-label="Location name">
    <button type="button" class="icon-btn" data-acct-loc-remove aria-label="Remove location" data-tip="Remove">${icon("close")}</button>
    <input name="locStreet" value="${esc(l.street || "")}" placeholder="Street" aria-label="Street">
    <div class="form-row-3"><input name="locCity" value="${esc(l.city || "")}" placeholder="City" aria-label="City"><select name="locState" aria-label="State">${stateOptions(l.state)}</select><input name="locPostcode" value="${esc(l.postcode || "")}" placeholder="ZIP" aria-label="ZIP code"></div>
  </div>`;
// A wholesale account opens beside the list on its summary (what they owe, their last order, open
// quotes, recent conversations), then Details, Prices, Locations and Orders & Invoices. One form
// runs through the tabs, saved from the bar at the bottom. A new account is a quick popup.
const accountPanel = (acct) => acct && accountForm(acct);
// The café's logo (the one they see in their portal): staff can set or remove it here too.
const acctLogoField = (acct) => `<div class="field acct-logo" data-acct-logo="${esc(acct.id)}"><span>Logo</span><div class="cfg-logo">${acct.logo ? `<div class="cfg-logo-box"><img src="/api/admin/accounts/${esc(acct.id)}/logo?v=${esc(acct.logo)}" alt="${esc(acct.business)} logo"></div>` : ""}<div class="btn-row"><label class="btn btn-sm">${icon("upload")}<span>${acct.logo ? "Change" : "Upload Logo"}</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-acct-logo-file hidden></label>${acct.logo ? `<button type="button" class="btn btn-sm btn-ghost" data-acct-logo-remove>Remove</button>` : ""}</div></div></div>`;
async function acctLogoSave(box, method, body = {}) {
  const id = box.dataset.acctLogo;
  try {
    const r = await api(`/api/admin/accounts/${id}/logo`, { method, body });
    const acct = state.trade.accounts.find((x) => x.id === id);
    if (acct) {
      acct.logo = r.logo;
      box.outerHTML = acctLogoField(acct);
    }
    toast(method === "DELETE" ? "Logo removed." : "Logo saved.");
  } catch (error) {
    toast(error.message, "error");
  }
}
document.addEventListener("change", (e) => {
  const input = (e.target as HTMLElement).closest?.("[data-acct-logo-file]") as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  const box = input.closest("[data-acct-logo]") as HTMLElement;
  if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) return toast("Use a PNG, JPG, WebP or SVG logo.", "error");
  if (file.size > 2_000_000) return toast("That logo is too big. Use one under 2 MB.", "error");
  const r = new FileReader();
  r.onload = () => acctLogoSave(box, "POST", { type: file.type, data: String(r.result).split(",")[1] || "" });
  r.readAsDataURL(file);
});
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest?.("[data-acct-logo-remove]");
  if (b) acctLogoSave(b.closest("[data-acct-logo]"), "DELETE");
});
function accountForm(acct = null, prefill: any = {}) {
  const a = acct || { discount: state.trade.defaults.discount, terms: state.trade.defaults.terms, address: {}, ...prefill };
  editingNext = acct ? `account:${acct.id}` : null;
  if (acct) viewed(`data-account="${esc(acct.id)}"`, "building", acct.business, "Wholesale account");
  const T = state.trade;
  const theirs = acct ? T.wholesaleOrders.filter((o) => o.wholesale?.accountId === acct.id) : [];
  const owing = theirs.filter((o) => o.payment === "unpaid" && o.status !== "cancelled");
  const late = owing.filter((o) => wsState(o) === "overdue");
  const quotes = acct ? (T.quotes || []).filter((q) => q.accountId === acct.id && ["requested", "sent"].includes(q.state)) : [];
  const sum = (list) => list.reduce((n, o) => n + o.total, 0);
  const onList = a.priceList && listById(a.priceList);
  const detailsHtml = `
      <label class="field"><span>Business</span><input name="business" value="${esc(a.business || "")}" required></label>
      ${acct ? acctLogoField(acct) : ""}
      <div class="form-row-2">
        <label class="field"><span>Contact</span><input name="contactName" value="${esc(a.contactName || "")}"></label>
        <label class="field"><span>Phone</span><input name="phone" value="${esc(a.phone || "")}" inputmode="tel"></label>
      </div>
      <label class="field"><span>Billing Email</span><input name="email" type="email" value="${esc(a.email || "")}" required></label>
      <label class="field"><span>Delivery Address</span><input name="street" value="${esc(a.address?.street || "")}" placeholder="Street"></label>
      <div class="form-row-3">
        <input name="city" value="${esc(a.address?.city || "")}" placeholder="City" aria-label="City">
        <select name="state" aria-label="State">${stateOptions(a.address?.state)}</select>
        <input name="postcode" value="${esc(a.address?.postcode || "")}" placeholder="ZIP" aria-label="ZIP code">
      </div>
      <div class="form-row-2">
        <label class="field"><span>Payment Terms</span><select name="terms">${[0, 7, 15, 30, 45, 60].map((d) => `<option value="${d}" ${Number(a.terms) === d ? "selected" : ""}>${d ? `Net ${d} days` : "Due on receipt"}</option>`).join("")}</select></label>
        <label class="field"><span>Delivery Fee on Portal Orders</span><input name="deliveryFee" inputmode="decimal" value="${esc(a.deliveryFee ?? 0)}"></label>
      </div>
      <label class="field"><span>Portal Logins</span><textarea name="portalEmails" rows="2" placeholder="One email per line">${esc((a.portalEmails || (a.email ? [a.email] : [])).join("\n"))}</textarea></label>
      ${acct && !acct.archivedAt ? `<div class="btn-row"><button type="button" class="btn btn-sm" data-invite>${acct.invitedAt ? "Resend Portal Invite" : "Send Portal Invite"}</button>${T.portalUrl ? `<button type="button" class="btn btn-sm btn-ghost" data-copy-text="${esc(T.portalUrl)}">${icon("Link")}<span>Copy Portal Link</span></button>` : ""}${acct.invitedAt ? `<small class="muted">Invite sent ${esc(dayShort(acct.invitedAt))}</small>` : ""}</div>` : ""}
      <label class="field"><span>Notes</span><textarea name="notes" rows="3">${esc(a.notes || "")}</textarea></label>`;
  const pricesHtml = `
      ${(T.priceLists || []).length ? `<label class="field"><span>Price List</span><select name="priceList" data-account-list><option value="">None (its own prices)</option>${T.priceLists.map((l) => `<option value="${esc(l.id)}" ${a.priceList === l.id ? "selected" : ""}>${esc(l.name)} · ${offPct(l.discount)}% off retail</option>`).join("")}</select></label>` : ""}
      <label class="field" data-own-discount ${onList ? "hidden" : ""}><span>Off Retail</span><span class="tax-input"><input name="offRetail" inputmode="decimal" value="${offPct(a.discount)}" data-was="${offPct(a.discount)}"><i>%</i></span></label>
      ${pricingSection(a)}`;
  const locationsHtml = `<div class="field acct-locs"><span>Other Locations</span><div data-acct-locs>${(a.locations || []).map(locationRow).join("")}</div><button type="button" class="btn btn-sm" data-acct-loc-add>${icon("plus")}<span>Add Location</span></button></div>`;
  if (!acct) {
    const drawer = openPanel("New Wholesale Account", `<form class="form-stack" id="account-form" data-account-form>${detailsHtml}${pricesHtml}</form>`, {
      modal: true,
      footer: `<div class="modal-foot-side"></div><div class="modal-foot-side"><button type="submit" form="account-form" class="btn btn-primary">Create Account</button></div>`,
    });
    return accountFormWire(drawer, null, prefill);
  }
  const lastOrder = theirs[0];
  const orderLink = (o) => `<a class="list-row" href="#orders/all" data-open-order="${esc(o.number)}"><span class="list-main"><strong class="code">${esc(o.number)}</strong><small>${esc(dayShort(o.placedAt))} · ${o.items} item${o.items === 1 ? "" : "s"}</small></span><span class="list-side"><strong>${money(o.total)}</strong>${payCell(o)}</span></a>`;
  const summaryHtml = `
    <section class="acct-sum">
      <div class="card stat"><p class="stat-label">Unpaid</p><p class="stat-value">${money(sum(owing))}</p><p class="stat-foot${late.length ? " is-bad" : ""}">${late.length ? `${money(sum(late))} overdue` : owing.length ? `${owing.length} invoice${owing.length === 1 ? "" : "s"}` : "Nothing owed"}</p></div>
      <div class="card stat"><p class="stat-label">Last Order</p><p class="stat-value">${lastOrder ? esc(dayShort(lastOrder.placedAt)) : "—"}</p><p class="stat-foot">${lastOrder ? `${esc(lastOrder.number)} · ${money(lastOrder.total)}` : "No orders yet"}</p></div>
      <div class="card stat"><p class="stat-label">Open Quotes</p><p class="stat-value">${quotes.length}</p><p class="stat-foot">${quotes.length ? esc(quotes.map((q) => q.number).join(", ")) : "None"}</p></div>
    </section>
    ${owing.length ? `<section class="panel"><h3 class="panel-title">Unpaid Invoices</h3><div class="list">${owing.slice(0, 5).map(orderLink).join("")}</div></section>` : lastOrder ? `<section class="panel"><h3 class="panel-title">Last Order</h3><div class="list">${orderLink(lastOrder)}</div></section>` : ""}
    ${quotes.length ? `<section class="panel"><h3 class="panel-title">Open Quotes</h3><div class="list">${quotes.map((q) => `<button type="button" class="list-row" data-quote="${esc(q.id)}"><span class="list-main"><strong class="code">${esc(q.number)}</strong><small>${esc(QUOTE_STATE[q.state])} · ${esc(dayShort(q.at))}</small></span><span class="list-side">${q.total != null ? `<strong>${money(q.total)}</strong>` : ""}</span></button>`).join("")}</div></section>` : ""}
    <section class="panel"><h3 class="panel-title">Recent Conversations</h3>${
      (acct.conversations || []).length
        ? `<div class="list">${acct.conversations.map((c) => `<a class="list-row" href="#inbox/${esc(c.id)}"><span class="list-main"><strong>${esc(c.name || c.subject || "Conversation")}</strong><small>${esc(c.last || c.subject || "")}</small></span><span class="list-side"><small>${esc(ago(c.at))}</small>${c.status === "open" ? "" : `<small class="muted">Closed</small>`}</span></a>`).join("")}</div>`
        : `<p class="muted">No conversations yet.</p>`
    }</section>
    <section class="panel"><h3 class="panel-title">Agreement</h3><div class="ag-acct"><span>${agreementStatus(acct.id).badge}${agreementStatus(acct.id).line ? `<small>${agreementStatus(acct.id).line}</small>` : ""}</span><span class="btn-row">${agreementButtons(acct.id)}</span></div></section>
    ${creditSection(acct)}
    ${closeSection("account", acct, theirs.length > 0)}`;
  const ordersHtml = theirs.length
    ? `<div class="list">${theirs.map(orderLink).join("")}</div>`
    : `<p class="muted">No orders yet.</p>`;
  const tabs = recordTabs("account", [["summary", "Summary"], ["details", "Details"], ["prices", "Prices"], ["locations", "Locations", (a.locations || []).length || ""], ["orders", "Orders & Invoices", theirs.length || ""]]);
  const drawer = openPanel(
    acct.business,
    `${tabs.bar}<form class="form-stack" id="account-form" data-account-form>
      ${tabs.pane("summary", summaryHtml)}
      ${tabs.pane("details", `<section class="panel form-stack">${detailsHtml}</section>`)}
      ${tabs.pane("prices", `<section class="panel form-stack">${pricesHtml}</section>`)}
      ${tabs.pane("locations", `<section class="panel form-stack">${locationsHtml}</section>`)}
      ${tabs.pane("orders", `<section class="panel">${ordersHtml}</section>`)}
    </form>`,
    {
      page: "Accounts",
      badges: acct.archivedAt ? `<span class="badge"><i></i>Archived</span>` : late.length ? `<span class="badge t-red"><i></i>Overdue</span>` : "",
      subtitle: [acct.contactName, acct.terms ? `Net ${acct.terms}` : "Due on receipt", onList ? `${onList.name} · ${offPct(onList.discount)}% off retail` : `${offPct(acct.discount)}% off retail`].filter(Boolean).join(" · "),
      actions: todoAddButton("account", acct.id, acct.business),
      footer: `<div class="modal-foot-side"></div><div class="modal-foot-side"><button type="submit" form="account-form" class="btn btn-primary" data-acct-save disabled>Save</button></div>`,
    }
  );
  drawer.classList.add("has-foot");
  return accountFormWire(drawer, acct, prefill);
}
function accountFormWire(drawer, acct, prefill) {
  // Save wakes up once something's changed (and stays put at the bottom while you edit).
  const foot = $("[data-acct-save]", drawer)?.closest(".modal-foot") as HTMLElement;
  if (foot) foot.hidden = true;
  const wake = () => {
    const save = $("[data-acct-save]", drawer) as HTMLButtonElement;
    if (save) save.disabled = false;
    if (foot) foot.hidden = false;
  };
  drawer.addEventListener("input", (e) => (e.target as HTMLElement).closest("[data-account-form]") && !(e.target as HTMLElement).closest(".credit-section") && wake());
  drawer.addEventListener("change", (e) => (e.target as HTMLElement).closest("[data-account-form]") && !(e.target as HTMLElement).closest(".credit-section, .acct-logo") && wake());
  drawer.addEventListener("click", (e) => (e.target as HTMLElement).closest("[data-acct-loc-add], [data-acct-loc-remove], [data-price-add], [data-price-remove]") && wake());
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (await closeAction(e, "account", acct)) return;
    const add = e.target.closest("[data-add-credit]");
    if (add) {
      const order = $("[data-credit-order]", drawer).value;
      const items = $$("[data-credit-qty]", drawer).map((x) => ({ i: Number(x.dataset.creditQty), qty: Number(x.value) || 0 })).filter((x) => x.qty > 0);
      add.disabled = true;
      try {
        const r = await api(`/api/admin/accounts/${acct.id}/credit`, { method: "POST", body: { order, items, problem: $("[data-credit-problem]", drawer).value, note: $("[data-credit-note]", drawer).value } });
        toast(`${money(r.amount)} credit added. It comes off their next order.`);
        await route();
        accountForm(state.trade.accounts.find((x) => x.id === acct.id));
      } catch (error) {
        add.disabled = false;
        panelError(error.message);
      }
      return;
    }
    const addRow = e.target.closest("[data-price-add]");
    if (addRow) {
      const list = $(`[data-price-rows="${addRow.dataset.priceAdd}"]`, drawer);
      list.insertAdjacentHTML("beforeend", $(`[data-price-template="${addRow.dataset.priceAdd}"]`, drawer).innerHTML);
      $("select, input", list.lastElementChild)?.focus();
      return;
    }
    const rmRow = e.target.closest("[data-price-remove]");
    if (rmRow) return rmRow.closest("[data-price-row]").remove();
    const invite = e.target.closest("[data-invite]");
    if (!invite) return;
    if (!confirm(`Email a portal invite to ${(acct.portalEmails || []).join(", ") || "this account's logins"}? Save any changes to the logins first.`)) return;
    invite.disabled = true;
    try {
      const { sent } = await api(`/api/admin/accounts/${acct.id}/invite`, { method: "POST", body: {} });
      toast(`Invite sent to ${sent.map((x) => x.email).join(", ")}`);
      await route();
      accountForm(state.trade.accounts.find((x) => x.id === acct.id));
    } catch (error) {
      invite.disabled = false;
      panelError(error.message);
    }
  };
  drawer.addEventListener("change", (e) => {
    if (!e.target.matches("[data-account-list]")) return;
    const on = Boolean(e.target.value);
    $("[data-own-discount]", drawer).hidden = on;
  });
  drawer.addEventListener("input", (e) => {
    // A credit's amount, from the items picked.
    if (e.target.matches("[data-credit-qty]")) {
      const sum = $$("[data-credit-qty]", drawer).reduce((n, x) => n + Math.min(Number(x.max), Math.max(0, Number(x.value) || 0)) * Number(x.dataset.price), 0);
      const button = $("[data-add-credit]", drawer);
      button.disabled = !(sum > 0);
      button.textContent = sum > 0 ? `Add ${money(Math.round(sum * 100) / 100)} Credit` : "Add Credit";
    }
  });
  drawer.addEventListener("change", (e) => {
    if (e.target.matches("[data-credit-order]")) $("[data-credit-items]", drawer).innerHTML = creditItems(acct, e.target.value);
  });
  drawer.addEventListener("click", (e) => {
    if (e.target.closest("[data-acct-loc-add]")) {
      $("[data-acct-locs]", drawer).insertAdjacentHTML("beforeend", locationRow());
      ($("[data-acct-loc]:last-child [name=locName]", drawer) as HTMLElement).focus();
    }
    e.target.closest("[data-acct-loc-remove]")?.closest("[data-acct-loc]").remove();
  });
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    const locations = $$("[data-acct-loc]", drawer)
      .map((r) => ({ id: r.dataset.acctLoc, name: $("[name=locName]", r).value, street: $("[name=locStreet]", r).value, city: $("[name=locCity]", r).value, state: $("[name=locState]", r).value, postcode: $("[name=locPostcode]", r).value }))
      .filter((l) => [l.name, l.street, l.city, l.postcode].some((x) => x.trim()));
    // Off retail is what they see; the account keeps its discount (before the wholesale factor).
    const off = String(f.offRetail.value).trim();
    const discount = off === f.offRetail.dataset.was ? (acct ? acct.discount : prefill.discount ?? state.trade.defaults.discount) : discountFromOff(off);
    if (discount == null) {
      ($('[data-rtab="account|prices"]', drawer) as HTMLElement)?.click();
      return panelError(`Enter between ${offPct(0)}% and 100% off retail.`);
    }
    const body = { locations, business: f.business.value, contactName: f.contactName.value, phone: f.phone.value, email: f.email.value, address: { street: f.street.value, city: f.city.value, state: f.state.value, postcode: f.postcode.value }, discount, ...(f.priceList && { priceList: f.priceList.value }), terms: f.terms.value, notes: f.notes.value, deliveryFee: f.deliveryFee.value, portalEmails: f.portalEmails.value, ...pricingValues(f), ...(!acct && prefill.enquiry && { enquiry: prefill.enquiry }) };
    try {
      const r = await api(acct ? `/api/admin/accounts/${acct.id}` : "/api/admin/accounts", { method: acct ? "PATCH" : "POST", body });
      if (!acct) history.replaceState(null, "", "/admin/wholesale/accounts");
      await route();
      const id = acct?.id || r.account?.id;
      const fresh = state.trade?.accounts.find((x) => x.id === id);
      if (fresh) accountForm(fresh);
      else closeDrawer();
      toast(acct ? `${body.business} saved` : `${body.business} added to Accounts`);
    } catch (error) {
      panelError(error.message);
    }
  };
}

// A quote: what the café asked for (each line at its list price), the team's price for each, a
// line to them, and how long it's good for. Sending it emails them; they accept in the portal.
const QUOTE_STATE = { requested: "Requested", sent: "Sent", accepted: "Accepted", declined: "Declined", expired: "Expired", withdrawn: "Withdrawn" };
function quotePanel(q) {
  if (!q) return;
  const open = ["requested", "sent", "expired"].includes(q.state);
  const drawer = openPanel(`Quote ${q.number}`, `
    <form class="panel form-stack" data-quote-form>
      <p><strong>${esc(q.business)}</strong> <span class="muted">· ${esc(q.by)} · ${esc(q.fulfilment)}</span></p>
      ${q.note ? `<p class="app-note">${esc(q.note)}</p>` : ""}
      <div class="quote-lines">${q.lines
        .map(
          (l) => `<div class="quote-line">
            <span>${l.qty} × ${esc(l.title)}<small>${esc(l.variant)} · list ${money(l.listPrice)}</small></span>
            <span class="tax-input"><input name="price" inputmode="decimal" value="${esc(l.price ?? l.listPrice)}" ${open ? "" : "disabled"} aria-label="Price each for ${esc(l.title)}"><i>each</i></span>
          </div>`
        )
        .join("")}</div>
      <p class="quote-total">Total <strong data-quote-total></strong></p>
      ${
        open
          ? `<label class="field"><span>Message</span><textarea name="message" rows="3" maxlength="1000">${esc(q.message || "")}</textarea></label>
        <label class="field"><span>Good For</span><select name="days">${[7, 14, 30, 60, 90].map((d) => `<option value="${d}" ${d === 14 ? "selected" : ""}>${d} days</option>`).join("")}</select></label>
        <div class="drawer-actions"><button type="submit" class="btn btn-primary">${q.state === "requested" ? "Send Quote" : "Send Again"}</button></div>`
          : `<p class="muted">${esc(QUOTE_STATE[q.state])}${q.decidedBy ? ` by ${esc(q.decidedBy)}` : ""}${q.order ? `: ${esc(q.order)}` : ""}.</p>`
      }
    </form>`);
  const form = $("[data-quote-form]", drawer);
  const total = () => {
    const prices = $$("[name=price]", form).map((x) => Number(x.value) || 0);
    $("[data-quote-total]", form).textContent = money(q.lines.reduce((n, l, i) => n + prices[i] * l.qty, 0));
  };
  total();
  form.addEventListener("input", total);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const button = $("[type=submit]", form);
    button.disabled = true;
    try {
      await api(`/api/admin/quotes/${q.id}`, { method: "PATCH", body: { prices: $$("[name=price]", form).map((x) => x.value), message: form.message.value, days: form.days.value } });
      toast(`Quote ${q.number} sent`);
      closeDrawer();
      await route();
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  });
}

// An account's own prices (a coffee or tea in a size, instead of the discount) and its volume
// pricing (with N or more 5 lb bags in one order, a percent off them).
const PRICE_SIZE = { "5lb": "5 lb", "250g": "250g", tin: "Pack", "1kg": "1 kg loose" };
// A price list: its name, discount, prices for single items and volume prices, shared by every
// café on it (Wholesale › Price Lists).
const listById = (id) => (state.trade.priceLists || []).find((l) => l.id === id) || null;
const accountDiscount = (a) => (a.priceList && listById(a.priceList) ? listById(a.priceList).discount : a.discount);
function priceListForm(list = null) {
  const l = list || { name: "", discount: state.trade.defaults.discount, prices: [], tiers: [] };
  const drawer = openPanel(
    list ? list.name : "New Price List",
    `<form class="panel form-stack" data-pricelist-form>
      <div class="form-row-2">
        <label class="field"><span>Name</span><input name="name" value="${esc(l.name)}" required maxlength="60" placeholder="e.g. Standard, Volume"></label>
        <label class="field"><span>Off Retail</span><span class="tax-input"><input name="offRetail" inputmode="decimal" value="${offPct(l.discount)}" data-was="${offPct(l.discount)}"><i>%</i></span></label>
      </div>
      ${pricingSection(l)}
      ${list ? `<p class="muted">${list.accounts ? `${list.accounts} ${list.accounts === 1 ? "café is" : "cafés are"} on this list. Changes reach them at once.` : "No cafés on this list yet. Choose it on an account."}</p>` : ""}
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${list ? "Save" : "Create Price List"}</button>
        ${list ? `<button type="button" class="btn btn-danger-ghost" data-pricelist-delete>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`,
    { modal: true }
  );
  const f = $("[data-pricelist-form]", drawer) as any;
  const done = async (r, msg) => {
    state.trade.priceLists = r.priceLists;
    state.trade = await api("/api/admin/trade").catch(() => state.trade);
    closeDrawer();
    render();
    toast(msg);
  };
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const addRow = e.target.closest("[data-price-add]");
    if (addRow) {
      const rows = $(`[data-price-rows="${addRow.dataset.priceAdd}"]`, drawer);
      rows.insertAdjacentHTML("beforeend", $(`[data-price-template="${addRow.dataset.priceAdd}"]`, drawer).innerHTML);
      $("select, input", rows.lastElementChild)?.focus();
      return;
    }
    const rmRow = e.target.closest("[data-price-remove]");
    if (rmRow) return rmRow.closest("[data-price-row]").remove();
    if (!e.target.closest("[data-pricelist-delete]")) return;
    if (!confirm(`Delete the price list “${list.name}”?${list.accounts ? ` Its ${list.accounts} ${list.accounts === 1 ? "café keeps" : "cafés keep"} its discount and volume prices as their own.` : ""}`)) return;
    try {
      await done(await api(`/api/admin/price-lists/${list.id}`, { method: "DELETE" }), "Price list deleted.");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const button = $("button[type=submit]", f);
    const off = String(f.offRetail.value).trim();
    const discount = off === f.offRetail.dataset.was ? l.discount : discountFromOff(off);
    if (discount == null) return panelError(`Enter between ${offPct(0)}% and 100% off retail.`);
    button.disabled = true;
    try {
      const body = { name: f.name.value, discount, ...pricingValues(f) };
      await done(await api(list ? `/api/admin/price-lists/${list.id}` : "/api/admin/price-lists", { method: list ? "PATCH" : "POST", body }), list ? "Saved. Cafés on it see the new prices." : "Price list created.");
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}
document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  if (state.page !== "wholesale") return;
  if (t.closest?.("[data-pricelist-new]")) return priceListForm();
  const row = t.closest?.("[data-pricelist]") as HTMLElement;
  if (row) priceListForm(listById(row.dataset.pricelist));
});
function pricingSection(a) {
  const T = state.trade;
  const choices = [...T.products.flatMap((p) => ["5lb", "250g"].map((z) => [`${p.id}:${z}`, `${p.name}, ${PRICE_SIZE[z]}`])), ...T.teas.flatMap((t) => ["tin", "1kg"].map((z) => [`${t.id}:${z}`, `${t.name}, ${PRICE_SIZE[z]}`]))];
  const priceRow = (x: any = {}) => `<div class="price-row" data-price-row>
      <select name="ownItem" aria-label="Coffee or tea">${choices.map(([v, l]) => `<option value="${esc(v)}" ${v === `${x.product}:${x.size}` ? "selected" : ""}>${esc(l)}</option>`).join("")}</select>
      <input name="ownPrice" inputmode="decimal" value="${x.price ?? ""}" placeholder="0.00" aria-label="Price">
      <button type="button" class="icon-btn" data-price-remove aria-label="Remove">${icon("close")}</button>
    </div>`;
  const tierRow = (x: any = {}) => `<div class="price-row tier-row" data-price-row>
      <span class="tax-input"><input name="tierBags" inputmode="numeric" value="${x.bags ?? ""}" placeholder="10" aria-label="5 lb bags in one order"><i>+ 5 lb bags</i></span>
      <span class="tax-input"><input name="tierOff" inputmode="decimal" value="${x.off ?? ""}" placeholder="5" aria-label="Percent off"><i>% off</i></span>
      <button type="button" class="icon-btn" data-price-remove aria-label="Remove">${icon("close")}</button>
    </div>`;
  return `<fieldset class="field"><legend>Own Prices</legend>
      <div class="price-rows" data-price-rows="own">${(a.prices || []).map(priceRow).join("")}</div>
      <button type="button" class="btn btn-sm" data-price-add="own">${icon("plus")}<span>Add Price</span></button>
      <template data-price-template="own">${priceRow()}</template>
    </fieldset>
    <fieldset class="field"><legend>Volume Pricing</legend>
      <div class="price-rows" data-price-rows="tier">${(a.tiers || []).map(tierRow).join("")}</div>
      <button type="button" class="btn btn-sm" data-price-add="tier">${icon("plus")}<span>Add Volume Price</span></button>
      <template data-price-template="tier">${tierRow()}</template>
    </fieldset>`;
}
const pricingValues = (f) => ({
  prices: $$('[data-price-rows="own"] [data-price-row]', f)
    .map((r) => {
      const [product, size] = $("[name=ownItem]", r).value.split(":");
      return { product, size, price: $("[name=ownPrice]", r).value };
    })
    .filter((x) => String(x.price).trim()),
  tiers: $$('[data-price-rows="tier"] [data-price-row]', f)
    .map((r) => ({ bags: $("[name=tierBags]", r).value, off: $("[name=tierOff]", r).value }))
    .filter((x) => String(x.bags).trim() || String(x.off).trim()),
});

// Credit on the account (from a problem they reported, or added here): it comes off their next
// orders, as far as it goes.
function creditSection(acct) {
  const left = acct.creditsLeft || [];
  const orders = (acct.creditable || []).filter((o) => o.lines.some((l) => l.left > 0));
  return `<section class="close-section credit-section">
    <h3 class="panel-title">Credit</h3>
    ${left.length ? `<ul class="credit-list">${left.map((c) => `<li><span>${esc(c.reason || "Credit")}${c.order ? ` <small class="muted">${esc(c.order)}</small>` : ""}</span><strong>${money(c.left)}</strong></li>`).join("")}</ul>` : `<p class="muted">No credit.</p>`}
    ${
      orders.length
        ? `<label class="field"><span>For Order</span><select data-credit-order><option value="">Choose an order…</option>${orders.map((o) => `<option value="${esc(o.number)}">${esc(o.number)} · ${esc(date(o.placedAt))}</option>`).join("")}</select></label>
      <div class="credit-items" data-credit-items></div>`
        : `<p class="muted">Credit goes against an order's items; they have none to credit yet.</p>`
    }
  </section>`;
}
// The items of the order picked for a credit: how many of each (up to what's left), what was
// wrong, and what it comes to.
function creditItems(acct, number) {
  const o = (acct.creditable || []).find((x) => x.number === number);
  if (!o) return "";
  return `<ul class="edit-lines">${o.lines
    .filter((l) => l.left > 0)
    .map((l) => `<li><span><strong>${esc(l.title)}</strong><small>${esc(l.variant || "")} · ${money(l.price)}</small></span><input data-credit-qty="${l.i}" data-price="${l.price}" type="number" min="0" max="${l.left}" value="0" inputmode="numeric" aria-label="How many ${esc(l.title)}"></li>`)
    .join("")}</ul>
    <div class="form-row-2">
      <label class="field"><span>What Was Wrong</span><select data-credit-problem><option value="missing">Missing from the box</option><option value="damaged">Arrived damaged</option><option value="wrong">Wrong item</option><option value="other">Something else</option></select></label>
      <label class="field"><span>Note</span><input data-credit-note maxlength="120"></label>
    </div>
    <button type="button" class="btn btn-sm" data-add-credit disabled>Add Credit</button>`;
}

// What an account pays: its discount, then SITE.wholesale.priceFactor on top.
const offFactor = (discount) => (1 - (Number(discount) || 0) / 100) * (state.trade.defaults.priceFactor ?? 1);
// The one discount figure shown: how far under shop prices they pay ("65% off retail").
const offPct = (discount) => Math.round((1 - offFactor(discount)) * 100);
// Back from "% off retail" to the discount kept on the account (null when it can't be).
const discountFromOff = (off) => {
  const n = Number(String(off).replace(/[^0-9.]/g, ""));
  const pf = state.trade.defaults.priceFactor ?? 1;
  if (String(off).trim() === "" || !Number.isFinite(n) || n > 100) return null;
  const d = Math.round((1 - (1 - n / 100) / pf) * 1000) / 10;
  return d >= 0 && d <= 100 ? d : null;
};

// New Order starts as Peasy's "Select Customer": the café, and optionally the first item, then
// Continue opens the whole order with them filled in.
async function newOrderStart() {
  state.trade ||= await api("/api/admin/trade");
  const t = state.trade;
  const open = t.accounts.filter((a) => !a.archivedAt);
  if (!open.length) return accountForm();
  const items = `<optgroup label="Coffee">${t.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</optgroup>${(t.teas || []).length ? `<optgroup label="Tea">${t.teas.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</optgroup>` : ""}`;
  const drawer = openPanel(
    "Select Customer",
    `<form class="form-stack" id="wo-start" data-wo-start>
      <label class="field"><span>Customer</span><select name="accountId" required>${open.length > 1 ? `<option value="">Select a customer…</option>` : ""}${open.map((a) => `<option value="${a.id}">${esc(a.business)}</option>`).join("")}</select></label>
      <div class="form-row-2 is-wide-first">
        <label class="field"><span>First item <small class="muted">· optional</small></span><select name="product"><option value="">${open.length > 1 ? "Pick a customer first" : "None yet"}</option>${items}</select></label>
        <label class="field"><span>Quantity</span><input name="qty" inputmode="numeric" value="1"></label>
      </div>
    </form>`,
    {
      modal: true,
      footer: `<div class="modal-foot-side">${canOpen("assistant") ? `<button type="button" class="btn" data-help-ask="How do I create a wholesale order here?">Help</button>` : ""}</div><div class="modal-foot-side"><button type="button" class="btn" data-close>Cancel</button><button type="submit" form="wo-start" class="btn btn-primary" ${open.length > 1 ? "disabled" : ""}>Continue</button></div>`,
    }
  );
  const form = $("[data-wo-start]", drawer);
  const ready = () => {
    $("button[type=submit]", drawer).disabled = !form.accountId.value;
    form.product.disabled = !form.accountId.value;
    form.product.options[0].textContent = form.accountId.value ? "None yet" : "Pick a customer first";
  };
  form.addEventListener("change", ready);
  ready();
  drawer.onsubmit = (e) => {
    e.preventDefault();
    wholesaleOrderForm({ accountId: form.accountId.value, product: form.product.value, qty: form.qty.value });
  };
}
async function wholesaleOrderForm(pre: any = {}) {
  // From Orders, the accounts and prices may not be loaded yet.
  state.trade ||= await api("/api/admin/trade");
  const t = state.trade;
  if (!t.accounts.some((a) => !a.archivedAt)) return accountForm();
  // The same items as the portal: coffee in 5 lb bags or 250g retail bags, tea in packs of 8 cups or 1 kg loose.
  const teas = t.teas || [];
  const isTea = (id) => teas.some((x) => x.id === id);
  const productOptions = `<optgroup label="Coffee">${t.products.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join("")}</optgroup>${
    teas.length ? `<optgroup label="Tea">${teas.map((x) => `<option value="${x.id}">${esc(x.name)}</option>`).join("")}</optgroup>` : ""
  }`;
  const sizeOptions = (id) => (isTea(id) ? `<option value="tin">Pack</option><option value="1kg">1 kg loose</option>` : `<option value="5lb">5 lb</option><option value="250g">250g bag</option>`);
  const lineRow = (id = "", qty = 1) => `
    <div class="line-row" data-line>
      <select name="product" aria-label="Item">${id ? productOptions.replace(`value="${id}"`, `value="${id}" selected`) : productOptions}</select>
      <select name="size" aria-label="Size">${sizeOptions(id || t.products[0]?.id)}</select>
      <input name="qty" inputmode="numeric" value="${esc(Math.max(1, Math.round(Number(qty)) || 1))}" aria-label="Quantity">
      <button type="button" class="icon-btn" data-remove-line aria-label="Remove line">${icon("trash")}</button>
    </div>`;
  const open = t.accounts.filter((a) => !a.archivedAt);
  // Where it goes: the account's address, each of its other locations, or pickup.
  const whereOptions = (acct) =>
    `<option value="Delivery">${acct?.address?.street ? `Ship to ${esc(acct.address.street)}` : "Ship to the account address"}</option>${(acct?.locations || []).map((l) => `<option value="Delivery:${esc(l.id)}">Ship to ${esc(l.name)} · ${esc(l.street)}</option>`).join("")}<option value="Pickup">Pickup at our office</option>`;
  const drawer = openPanel("New Wholesale Order", `
    <form class="form-stack" id="wo-form" data-wo-form>
      <label class="field"><span>Account</span><select name="accountId" required>${open.length > 1 ? `<option value="">Choose an account…</option>` : ""}${open.map((a) => `<option value="${a.id}" ${pre.accountId === a.id ? "selected" : ""}>${esc(a.business)}</option>`).join("")}</select></label>
      <div class="field"><span>Items</span><div class="lines-editor" data-lines>${lineRow(pre.product, pre.qty)}</div>
        <button type="button" class="btn btn-sm" data-add-line>${icon("plus")}<span>Add Item</span></button></div>
      <div class="form-row-2 is-wide-first">
        <label class="field"><span>Delivery</span><select name="fulfilment" data-wo-where>${whereOptions(t.accounts.find((a) => a.id === pre.accountId) || (open.length === 1 ? open[0] : null))}</select></label>
        <label class="field"><span>Delivery fee</span><input name="shipping" inputmode="decimal" value="0"></label>
      </div>
      <label class="field"><span>Their PO number</span><input name="poRef" placeholder="Optional"></label>
      <label class="field"><span>Notes</span><textarea name="notes" rows="2"></textarea></label>
      <dl class="totals" data-wo-total></dl>
    </form>`, {
    modal: true,
    footer: `<div class="modal-foot-side">${t.invoicing ? `<label class="switch-row td-more"><span><strong>Email the Square Invoice</strong></span><input type="checkbox" name="invoice" form="wo-form" checked><i aria-hidden="true"></i></label>` : `<span class="muted">Invoice this order in Square yourself.</span>`}</div>
      <div class="modal-foot-side"><button type="submit" form="wo-form" class="btn btn-primary" ${open.length > 1 ? "disabled" : ""}>Create Order</button></div>`,
  });
  const form = $("[data-wo-form]", drawer);
  const total = () => {
    const acct = t.accounts.find((a) => a.id === form.accountId.value);
    const factor = (1 - (acct?.discount || 0) / 100) * (t.defaults.priceFactor ?? 1);
    const d = t.defaults;
    const sum = $$("[data-line]", form).reduce((n, row) => {
      const id = $("[name=product]", row).value;
      const size = $("[name=size]", row).value;
      const tea = teas.find((x) => x.id === id);
      const p = t.products.find((x) => x.id === id);
      // 1 kg loose tea is the same price for every account; the rest takes the account's prices.
      const each = tea
        ? Math.round((size === "1kg" ? tea.price * d.teaKg * (1 - d.teaKgOff) : tea.price * factor) * 100) / 100
        : Math.round((size === "5lb" ? p.price1kg * d.bulkKg : p.price) * factor * 100) / 100;
      return n + each * (Math.max(0, Math.round(Number($("[name=qty]", row).value))) || 0);
    }, 0);
    const fee = Math.max(0, Number(form.shipping.value) || 0);
    $("button[type=submit]", drawer).disabled = !form.accountId.value;
    $("[data-wo-total]", form).innerHTML = `<dt>Items</dt><dd>${money(sum)}</dd>${fee ? `<dt>Delivery</dt><dd>${money(fee)}</dd>` : ""}<dt class="total">Total</dt><dd class="total">${money(sum + fee)}</dd><dt>Terms</dt><dd>${acct?.terms ? `Net ${acct.terms}` : "Due on receipt"}</dd>`;
  };
  form.addEventListener("input", total);
  form.addEventListener("change", (e) => {
    if (e.target.name === "product") {
      $("[name=size]", e.target.closest("[data-line]")).innerHTML = sizeOptions(e.target.value);
    }
    if (e.target.name === "accountId") form.fulfilment.innerHTML = whereOptions(t.accounts.find((a) => a.id === e.target.value));
    total();
  });
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-add-line]")) {
      $("[data-lines]", form).insertAdjacentHTML("beforeend", lineRow());
      total();
    }
    const rm = e.target.closest("[data-remove-line]");
    if (rm && $$("[data-line]", form).length > 1) {
      rm.closest("[data-line]").remove();
      total();
    }
  });
  total();
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const lines = $$("[data-line]", form).map((row) => ({ product: $("[name=product]", row).value, size: $("[name=size]", row).value, qty: $("[name=qty]", row).value }));
    const button = $("button[type=submit]", drawer);
    button.disabled = true;
    try {
      const result = await api("/api/admin/wholesale-orders", { method: "POST", body: { accountId: form.accountId.value, lines, fulfilment: form.fulfilment.value.split(":")[0], location: form.fulfilment.value.split(":")[1] || "", shipping: form.shipping.value, poRef: form.poRef.value, notes: form.notes.value, invoice: Boolean(form.invoice?.checked) } });
      toast(result.order.wholesale?.invoice ? `Order ${result.order.number} created and invoice sent` : `Order ${result.order.number} created`);
      if (result.invoiceError) alert(result.invoiceError);
      closeDrawer();
      await route();
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

/* Closing wholesale accounts and suppliers: archive keeps the history (and, for an account,
   stops its portal logins); delete is only offered when there's no history. */
function closeSection(kind, item, hasHistory) {
  const what = kind === "account" ? "account" : "supplier";
  if (item.archivedAt) {
    return `<section class="close-section"><p><strong>Archived ${esc(day(item.archivedAt))}</strong></p>
      <button type="button" class="btn btn-sm" data-archive="0">Restore ${what}</button></section>`;
  }
  return `<section class="close-section">
    <p><strong>${hasHistory ? `Archive this ${what}` : `Archive or delete this ${what}`}</strong></p>
    <div class="close-actions"><button type="button" class="btn btn-sm" data-archive="1">Archive</button>${hasHistory ? "" : `<button type="button" class="btn btn-sm btn-danger-ghost" data-delete-item>${icon("trash")}<span>Delete</span></button>`}</div>
  </section>`;
}

async function closeAction(e, kind, item) {
  const archive = e.target.closest("[data-archive]");
  const del = e.target.closest("[data-delete-item]");
  if (!item || (!archive && !del)) return false;
  const base = kind === "account" ? `/api/admin/accounts/${item.id}` : `/api/admin/suppliers/${item.id}`;
  const name = item.business || item.name;
  try {
    if (archive) {
      const on = archive.dataset.archive === "1";
      if (on && !confirm(`Archive ${name}?${kind === "account" ? " Its portal logins stop working." : ""}`)) return true;
      await api(`${base}/archive`, { method: "POST", body: { archived: on } });
      toast(on ? `${name} archived` : `${name} restored`);
    } else {
      if (!confirm(`Delete ${name} for good?`)) return true;
      await api(base, { method: "DELETE" });
      toast(`${name} deleted`);
    }
    closeDrawer();
    await route();
  } catch (error) {
    panelError(error.message);
  }
  return true;
}

/* ── One customer: details, subscriptions, orders; edit, suspend, delete ── */

// What a customer buys, as cards: favorite coffee, the usual size and grind, how they get it,
// and how often (with "Due soon" when they're likely running low).
function tasteCards(t) {
  if (!t) return "";
  const soon = t.nextAround && Date.parse(t.nextAround) < Date.now() + 7 * 864e5;
  const card = (ic, label, value, foot = "", extra = "") => `<div class="profile-card">${icon(ic, "i profile-icon")}<small>${label}</small><strong>${value}</strong>${foot ? `<span class="muted">${foot}</span>` : ""}${extra}</div>`;
  const cards = [
    t.coffee && card("cafe", "Favorite coffee", esc(t.coffee.title), `${t.coffee.qty} bag${t.coffee.qty === 1 ? "" : "s"} so far`),
    t.usual && card("products", "Usually", esc(t.usual)),
    t.how && card("ship", "Gets it by", esc(t.how)),
    card("calendar", "Reorders", t.everyDays ? `About every ${t.everyDays} days` : t.orders > 1 ? "No pattern yet" : "Once so far", t.nextAround ? `Next around ${esc(dayShort(t.nextAround))}` : "", soon ? `<span class="badge t-yellow"><i></i>${Date.parse(t.nextAround) < Date.now() ? "Overdue" : "Due soon"}</span>` : ""),
    t.also && card("gift", "Also buys", esc(t.also.title)),
    t.gifts && card("gift", "Gifts sent", String(t.gifts)),
  ].filter(Boolean);
  return `<section class="profile-cards" aria-label="What they buy">${cards.join("")}</section>`;
}

// Who a customer is, for the team only: their public work profile when someone looks them up.
function whoCard(c, lk, opt) {
  const head = `<div class="who-card-head"><h3 class="panel-title">Who They Are</h3></div>`;
  if (!lk) {
    return `<section class="panel who-card">${head}
      ${opt?.personalEmail ? `<p class="muted who-note">${icon("eye", "i i-sm")} Personal email: lookups usually find nothing.</p>` : ""}
      <button type="button" class="btn" data-lookup ${opt?.anyapi ? "" : "disabled"}>Look Up</button>
      ${opt?.anyapi ? "" : `<p class="muted who-note">Lookups aren't connected yet.</p>`}
    </section>`;
  }
  const until = new Date(Date.parse(lk.at) + (opt?.keepDays || 365) * 864e5).toISOString();
  const foot = `<p class="muted who-note">Looked up ${esc(dayShort(lk.at))} · kept until ${esc(dayShort(until))}</p>
    <div class="btn-row"><button type="button" class="btn btn-sm" data-lookup ${opt?.anyapi ? "" : "disabled"}>Look Up Again</button><button type="button" class="btn btn-sm btn-ghost" data-lookup-forget>Remove</button></div>`;
  if (!lk.found) return `<section class="panel who-card">${head}<p class="muted">Nothing public found for this email.</p>${foot}</section>`;
  const co = lk.company;
  // From the company's industry only: a food writer isn't a café owner.
  const hospitality = /restaurant|hospitality|food (?:&|and) beverage|food production|hotel|caf[eé]|coffee|catering|leisure|wine|bakery/i.test(co?.industry || "");
  const press = /media|publish|journalis|newspaper|broadcast|magazine/i.test(co?.industry || "") || /\b(editor|writer|journalist|critic|reporter|producer|podcast|host)\b/i.test(`${lk.title} ${lk.headline}`);
  const initials = (lk.name || c.name).split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const links = [["LinkedIn", lk.links?.linkedin], ["X", lk.links?.x], ["GitHub", lk.links?.github]].filter(([, u]) => u);
  return `<section class="panel who-card">${head}
    <div class="creator-id">
      ${lk.photo ? `<img class="creator-avatar" src="${esc(lk.photo)}" alt="" referrerpolicy="no-referrer">` : `<span class="creator-avatar">${esc(initials)}</span>`}
      <div><strong>${esc(lk.title || lk.headline || "—")}</strong><span class="muted">${co ? esc(co.name) : ""}${lk.city ? ` · ${esc(lk.city)}` : ""}</span></div>
    </div>
    ${hospitality || press ? `<div class="who-flags">${hospitality ? `<span class="badge s-completed"><i></i>Possible wholesale lead</span>` : ""}${press ? `<span class="badge t-yellow"><i></i>Press or media</span>` : ""}</div>` : ""}
    ${co ? `<div class="who-facts">${[co.industry && ["Industry", esc(co.industry)], co.size && ["Company size", `${co.size.toLocaleString("en-US")} people`], co.locations && ["Locations", String(co.locations)], co.domain && ["Website", `<a class="link" href="https://${esc(co.domain)}" target="_blank" rel="noopener">${esc(co.domain)}</a>`]].filter(Boolean).map(([k, v]) => `<div><small>${k}</small><strong>${v}</strong></div>`).join("")}</div>` : ""}
    ${links.length ? `<div class="btn-row">${links.map(([k, u]) => `<a class="btn btn-sm" href="${esc(u)}" target="_blank" rel="noopener">${k}</a>`).join("")}</div>` : ""}
    ${lk.confidence && lk.confidence !== "high" ? `<p class="muted who-note">Match confidence: ${esc(lk.confidence)}. Check it's really them.</p>` : ""}
    ${foot}
  </section>`;
}

async function customerPanel(id) {
  let data;
  try {
    data = await api(`/api/admin/customers/${id}`);
  } catch (error) {
    return toast(`Couldn't open this customer: ${error.message}`, "error");
  }
  const c = data.customer;
  viewed(`data-cust="${esc(c.id)}"`, "customers", c.name || c.email, c.email || "");
  const SUB_BADGE = { active: "sub-active", paused: "sub-paused", ended: "sub-cancelled", cancelled: "sub-cancelled" };
  const orderList = (list) =>
    `<div class="list">${list
      .map((o) => `<a class="list-row" href="#orders/${o.status}" data-open-order="${esc(o.number)}"><span class="list-main"><strong>${esc(o.number)}</strong><small>${esc(date(o.placedAt))} · ${o.items} item${o.items === 1 ? "" : "s"}</small></span><span class="list-side">${statusBadge(o.status)}<strong class="num">${o.parent ? "Gift" : money(o.total)}</strong></span></a>`)
      .join("")}</div>`;
  const wsOrders = data.wholesaleOrders || [];
  // Their figures, over all their orders (the server's, as the list and the Inbox show them).
  const { orders: count, spent, lastOrderAt } = data.stats;
  const live = c.subscriptions.filter((x) => x.status === "active").length;
  editingNext = `customer:${c.id}`;
  const actions = `
    <button type="button" class="btn" data-compose-email="${esc(c.email)}" data-compose-name="${esc(c.name || "")}">${icon("signups")}<span>Email</span></button>
    <details class="order-menu">
      <summary class="btn">More actions${icon("ChevronDown")}</summary>
      <div class="order-menu-list">
        <button type="button" data-suspend="${c.suspendedAt ? "0" : "1"}">${icon(c.suspendedAt ? "synced" : "eyeOff")}<span>${c.suspendedAt ? "Unsuspend" : "Suspend account"}</span></button>
        <button type="button" class="is-danger" data-delete-customer>${icon("trash")}<span>Delete account</span></button>
      </div>
    </details>`;
  const drawer = openPanel(c.name, `
    <div class="order-cols">
    <div class="order-main">
      <section class="panel cust-kpis">
        <div><small>Spent</small><strong>${money(spent)}</strong></div>
        <div><small>Orders</small><strong>${count}</strong></div>
        <div><small>Average order</small><strong>${count ? money(spent / count) : "—"}</strong></div>
        <div><small>Last order</small><strong>${lastOrderAt ? esc(dayShort(lastOrderAt)) : "—"}</strong></div>
      </section>

      ${tasteCards(data.taste)}

      <section class="panel">
        <h3 class="panel-title">Orders</h3>
        ${data.orders.length ? orderList(data.orders) : `<p class="muted">${wsOrders.length ? "None under this email." : "No orders yet."}</p>`}
      </section>

      ${
        c.subscriptions.length
          ? `<section class="panel">
              <h3 class="panel-title">Subscriptions${live ? ` · ${live} active` : ""}</h3>
              <div class="list">${c.subscriptions
                .map((s) => `<div class="list-row"><span class="list-main"><strong>${esc(s.coffeeLabel)}</strong><small>${esc(s.sizeLabel)} · ${esc(s.freqLabel)} · ${money(s.price)}</small></span><span class="list-side"><span class="badge ${SUB_BADGE[s.status]}"><i></i>${SUB_STATUS[s.status]}</span></span></div>`)
                .join("")}</div>
            </section>`
          : ""
      }
      ${
        c.wholesale && wsOrders.length
          ? `<section class="panel">
              <h3 class="panel-title">Wholesale orders · ${esc(c.wholesale.business)}</h3>
              ${orderList(wsOrders)}
            </section>`
          : ""
      }
    </div>
    <div class="order-side">
      <section class="panel">
        <h3 class="panel-title">Customer</h3>
        <dl class="kv">
          ${c.phone ? `<div><dt>Phone</dt><dd><a href="tel:${esc(c.phone)}">${esc(c.phone)}</a></dd></div>` : ""}
          <div><dt>Last seen</dt><dd>${esc(ago(c.lastSeenAt))}</dd></div>
          ${data.lead ? `<div>${leadFacts(data.lead)}</div>` : ""}
          <div><dt>Newsletter</dt><dd>${c.newsletter ? "Subscribed" : "No"}</dd></div>
          ${c.wholesale ? `<div><dt>Wholesale</dt><dd><a class="link" href="#wholesale/accounts" data-open-account="${esc(c.wholesale.id)}">${esc(c.wholesale.business)}</a></dd></div>` : ""}
        </dl>
      </section>
      ${whoCard(c, data.lookup, data.lookupOptions)}

      <form class="panel form-stack" data-customer-form>
        <h3 class="panel-title">Details</h3>
        <label class="field"><span>Name</span><input name="name" value="${esc(c.name)}" required></label>
        <label class="field"><span>Login email</span><input name="email" type="email" value="${esc(c.email)}" required></label>
        <div class="drawer-actions"><button type="submit" class="btn">Save</button></div>
      </form>
      ${c.suspendedAt ? `<p class="muted cust-note">Suspended ${esc(day(c.suspendedAt))}</p>` : ""}
    </div>
    </div>`, { page: "Customers", actions, badges: c.suspendedAt ? `<span class="badge t-yellow"><i></i>Suspended</span>` : live ? `<span class="badge sub-active"><i></i>Subscriber</span>` : "", subtitle: `${c.email} · Customer since ${dayShort(c.createdAt)}` });

  const reopen = async (message) => {
    toast(message);
    await route();
    customerPanel(id);
  };
  drawer.onclick = async (e) => {
    $$("details.order-menu[open]", drawer).forEach((d) => (!d.contains(e.target) || e.target.closest(".order-menu-list button, .order-menu-list a")) && d.removeAttribute("open"));
    if (e.target.closest("[data-close]")) return closeDrawer();
    const order = e.target.closest("[data-open-order]");
    if (order) {
      e.preventDefault();
      state.open = order.dataset.openOrder;
      go(order.getAttribute("href"));
      return;
    }
    const acct = e.target.closest("[data-open-account]");
    if (acct) {
      e.preventDefault();
      closeDrawer();
      state.openAccount = acct.dataset.openAccount; // opened once Wholesale has loaded
      go(acct.getAttribute("href"));
      return;
    }
    const look = e.target.closest("[data-lookup], [data-lookup-forget]");
    if (look) {
      const forget = look.matches("[data-lookup-forget]");
      if (forget && !confirm(`Remove what we looked up on ${c.name}?`)) return;
      look.disabled = true;
      if (!forget) look.textContent = "Looking up…";
      try {
        await api(`/api/admin/customers/${id}/lookup`, { method: forget ? "DELETE" : "POST", body: forget ? undefined : {} });
        customerPanel(id);
      } catch (error) {
        look.disabled = false;
        look.textContent = "Look Up";
        panelError(error.message);
      }
      return;
    }
    const sus = e.target.closest("[data-suspend]");
    if (sus) {
      const on = sus.dataset.suspend === "1";
      if (on && !confirm(`Suspend ${c.name}? They're signed out, can't log in, and their active subscriptions pause.`)) return;
      sus.disabled = true;
      try {
        await api(`/api/admin/customers/${id}/suspend`, { method: "POST", body: { suspended: on } });
        reopen(on ? `${c.name} suspended` : `${c.name} unsuspended`);
      } catch (error) {
        sus.disabled = false;
        panelError(error.message);
      }
      return;
    }
    if (e.target.closest("[data-delete-customer]")) {
      if (!confirm(`Delete ${c.name}'s account?\n\nTheir subscriptions are cancelled (in Square too), the login is removed, they're taken off the newsletter, and past orders lose their name, email and address. This can't be undone.`)) return;
      try {
        await api(`/api/admin/customers/${id}`, { method: "DELETE" });
        closeDrawer();
        toast(`${c.name}'s account deleted`);
        await route();
      } catch (error) {
        panelError(error.message);
      }
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    try {
      await api(`/api/admin/customers/${id}`, { method: "PATCH", body: { name: f.name.value, email: f.email.value } });
      reopen("Customer saved");
    } catch (error) {
      panelError(error.message);
    }
  };
}

function supplierForm(sup = null) {
  const x = sup || {};
  editingNext = sup ? `supplier:${sup.id}` : null;
  if (sup) viewed(`data-supplier="${esc(sup.id)}"`, "building", sup.name, "Supplier");
  const drawer = openPanel(sup ? sup.name : "New Supplier", `
    <form class="panel form-stack" data-supplier-form>
      <label class="field"><span>Name</span><input name="name" value="${esc(x.name || "")}" required></label>
      <div class="form-row-2">
        <label class="field"><span>Contact</span><input name="contactName" value="${esc(x.contactName || "")}"></label>
        <label class="field"><span>Phone</span><input name="phone" value="${esc(x.phone || "")}" inputmode="tel"></label>
      </div>
      <label class="field"><span>Email</span><input name="email" type="email" value="${esc(x.email || "")}"></label>
      <label class="field"><span>Notes</span><textarea name="notes" rows="3" placeholder="What you buy from them, account numbers, lead times">${esc(x.notes || "")}</textarea></label>
      <div class="drawer-actions"><button type="submit" class="btn btn-primary">${sup ? "Save" : "Add Supplier"}</button></div>
      ${sup ? closeSection("supplier", sup, state.trade.purchaseOrders.some((p) => p.supplierId === sup.id)) : ""}
    </form>`, { modal: true });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    await closeAction(e, "supplier", sup);
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    try {
      const { warning } = await api(sup ? `/api/admin/suppliers/${sup.id}` : "/api/admin/suppliers", { method: sup ? "PATCH" : "POST", body: { name: f.name.value, contactName: f.contactName.value, phone: f.phone.value, email: f.email.value, notes: f.notes.value } });
      toast(warning || (sup ? "Supplier saved" : "Supplier added"), warning ? "error" : undefined);
      closeDrawer();
      if (!sup) history.replaceState(null, "", "#purchasing/suppliers");
      await route();
    } catch (error) {
      panelError(error.message);
    }
  };
}

function poForm(po = null) {
  const t = state.trade;
  if (!t.suppliers.length) return supplierForm();
  const itemRow = (i: any = {}) => `
    <div class="line-row po-line" data-item ${i.greenId ? `data-green-id="${esc(i.greenId)}"` : ""}>
      <input name="description" value="${esc(i.description || "")}" placeholder="Item, e.g. Kenya AB green" aria-label="Item">
      <input name="qty" inputmode="decimal" value="${esc(i.qty ?? 1)}" aria-label="Quantity">
      <input name="unit" value="${esc(i.unit || "kg")}" aria-label="Unit">
      <input name="unitCost" inputmode="decimal" value="${esc(i.unitCost ?? "")}" placeholder="Cost each" aria-label="Cost each">
      <button type="button" class="icon-btn" data-remove-line aria-label="Remove item">${icon("trash")}</button>
    </div>`;
  editingNext = po ? `po:${po.number}` : null;
  const drawer = openPanel(po ? `Edit ${po.number}` : "New Purchase Order", `
    <form class="panel form-stack" data-po-form>
      <label class="field"><span>Supplier</span><select name="supplierId" ${po ? "disabled" : ""}>${t.suppliers.filter((x) => !x.archivedAt || po?.supplierId === x.id).map((x) => `<option value="${x.id}" ${po?.supplierId === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
      <div class="field"><span>Items</span><div class="lines-editor" data-items>${(po?.items || [{}]).map(itemRow).join("")}</div>
        <button type="button" class="btn btn-sm" data-add-line>${icon("plus")}<span>Add Item</span></button></div>
      <label class="field"><span>Needed by</span><input name="expected" type="date" value="${esc(po?.expected || "")}"></label>
      <label class="field"><span>Notes for the supplier</span><textarea name="notes" rows="2">${esc(po?.notes || "")}</textarea></label>
      <dl class="totals" data-po-total></dl>
      <div class="drawer-actions"><button type="submit" class="btn btn-primary">${po ? "Save" : "Save Draft"}</button></div>
    </form>`);
  const form = $("[data-po-form]", drawer);
  const total = () => {
    const sum = $$("[data-item]", form).reduce((n, row) => n + (Number($("[name=qty]", row).value) || 0) * (Number($("[name=unitCost]", row).value) || 0), 0);
    $("[data-po-total]", form).innerHTML = `<dt class="total">Total</dt><dd class="total">${money(sum)}</dd>`;
  };
  form.addEventListener("input", total);
  form.addEventListener("click", (e) => {
    if (e.target.closest("[data-add-line]")) $("[data-items]", form).insertAdjacentHTML("beforeend", itemRow());
    const rm = e.target.closest("[data-remove-line]");
    if (rm && $$("[data-item]", form).length > 1) rm.closest("[data-item]").remove();
    total();
  });
  total();
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const items = $$("[data-item]", form).map((row) => ({ description: $("[name=description]", row).value, qty: $("[name=qty]", row).value, unit: $("[name=unit]", row).value, unitCost: $("[name=unitCost]", row).value, greenId: row.dataset.greenId || "" }));
    try {
      const result = po
        ? await api(`/api/admin/purchase-orders/${po.number}`, { method: "PATCH", body: { action: "edit", items, expected: form.expected.value, notes: form.notes.value } })
        : await api("/api/admin/purchase-orders", { method: "POST", body: { supplierId: form.supplierId.value, items, expected: form.expected.value, notes: form.notes.value } });
      toast(po ? "Saved" : `${result.purchaseOrder.number} saved as a draft`);
      await route();
      poDetail(result.purchaseOrder.number);
    } catch (error) {
      panelError(error.message);
    }
  };
}

function poDetail(number) {
  const po = state.trade.purchaseOrders.find((p) => p.number === number);
  if (!po) return;
  const supplier = state.trade.suppliers.find((x) => x.id === po.supplierId);
  const receiving = ["sent", "partial"].includes(po.status);
  const actions = `<button type="button" class="icon-btn" data-po-print aria-label="Print" data-tip="Print this purchase order">${icon("print")}</button>
      ${po.status === "draft" ? `<button type="button" class="btn" data-po-edit>Edit</button><button type="button" class="btn btn-primary" data-po-act="send">${supplier?.email ? "Email to Supplier" : "Mark as Sent"}</button>` : ""}`;
  const bills = po.bills || [];
  const drawer = openPanel(po.number, `
    <form class="panel" data-receive-form>
      <h3>Items</h3>
      <table class="table mini-table is-labelled">
        <thead><tr><th>Item</th><th class="num">Ordered</th><th class="num">Cost</th>${po.status !== "draft" ? `<th class="num">Received</th>` : ""}${receiving ? `<th class="num">Now</th>` : ""}</tr></thead>
        <tbody>${po.items
          .map(
            (i, k) => `<tr>
              <td>${esc(i.description)}</td>
              <td class="num">${i.qty} ${esc(i.unit)}</td>
              <td class="num">${money(i.qty * i.unitCost)}<small>${money(i.unitCost)} each</small></td>
              ${po.status !== "draft" ? `<td class="num">${i.received}</td>` : ""}
              ${receiving ? `<td class="num"><input name="r${k}" inputmode="decimal" value="${Math.max(0, i.qty - i.received)}" aria-label="Received now: ${esc(i.description)}" class="qty-input"></td>` : ""}
            </tr>`
          )
          .join("")}</tbody>
      </table>
      <dl class="totals"><dt class="total">Total</dt><dd class="total">${money(po.total)}</dd></dl>
      ${receiving ? `<div class="drawer-actions"><button type="submit" class="btn btn-primary">Record Delivery</button></div>` : ""}
    </form>
    <section class="panel info-grid">
      <div><h3>Supplier</h3><p>${esc(po.supplierName)}${supplier?.email ? `<br><a href="mailto:${esc(supplier.email)}">${esc(supplier.email)}</a>` : ""}${supplier?.phone ? `<br>${esc(supplier.phone)}` : ""}</p></div>
      <div><h3>Needed by</h3><p>${po.expected ? esc(new Date(`${po.expected}T12:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })) : "—"}</p></div>
      ${po.notes ? `<div class="wide"><h3>Notes</h3><p>${esc(po.notes)}</p></div>` : ""}
    </section>
    <section class="panel">
      <h3>Bills</h3>
      ${bills.map((b) => `<button type="button" class="list-row po-bill" data-po-bill="${esc(b.id)}"><span class="list-main"><strong>${b.number ? `No. ${esc(b.number)}` : "Bill"} · ${money(b.total)}</strong><small>${b.due ? `Due ${esc(shortDay(b.due))}` : ""}</small></span><span class="list-side">${billBadge({ ...b, overdue: b.status === "unpaid" && b.due && b.due < isoDay(new Date()) })}</span></button>`).join("")}
      ${bills.length && Math.abs(po.billed - po.total) >= 0.005 ? `<p class="notice notice-warn">${icon("syncError")}<span>Billed ${money(po.billed)} against ${money(po.total)} ordered.</span></p>` : ""}
      ${po.status === "draft" || po.status === "cancelled" ? "" : `<div class="btn-row"><button type="button" class="btn btn-sm" data-po-add-bill>${icon("plus")}<span>Add Bill</span></button></div>`}
    </section>
    <section class="panel">
      <h3>Activity</h3>
      <ol class="timeline">${po.history
        .slice()
        .reverse()
        .map((h) => `<li><span>${h.status ? esc(PO_LABEL[h.status] || h.status) : "Note"}${h.note ? `: ${esc(h.note)}` : ""}</span><small>${esc(date(h.at))}</small></li>`)
        .join("")}</ol>
    </section>
    ${!["received", "cancelled"].includes(po.status) ? `<section class="danger-zone"><button type="button" class="btn btn-danger-ghost" data-po-act="cancel">Cancel Order</button></section>` : ""}`, {
    actions,
    page: "Purchase Orders",
    badges: `${poBadge(po.status)}${poPayTag(po)}`,
    subtitle: `${po.supplierName} · ${date(po.createdAt)}`,
  });
  const act = async (action, extra = {}) => {
    try {
      const result = await api(`/api/admin/purchase-orders/${po.number}`, { method: "PATCH", body: { action, ...extra } });
      toast(action === "send" ? (result.emailed ? `Emailed to ${supplier.email}` : "Marked as sent") : "Updated");
      await route();
      poDetail(po.number);
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const b = e.target.closest("[data-po-act]");
    if (b) {
      const a = b.dataset.poAct;
      if (a === "cancel" && !confirm(`Cancel ${po.number}?`)) return;
      if (a === "send" && supplier?.email && !confirm(`Email ${po.number} to ${supplier.email}?`)) return;
      act(a);
    }
    if (e.target.closest("[data-po-edit]")) poForm(po);
    if (e.target.closest("[data-po-print]")) printPo(po, supplier);
    const pb = e.target.closest("[data-po-bill]");
    const addBill = e.target.closest("[data-po-add-bill]");
    if (pb || addBill)
      (state.bills ? Promise.resolve(state.bills) : api("/api/admin/bills")).then((r) => {
        state.bills = r;
        if (pb) billPanel(pb.dataset.poBill);
        else billPanel(null, { supplierId: po.supplierId, poNumber: po.number, total: Math.max(0, Math.round((po.total - (po.billed || 0)) * 100) / 100) || po.total });
      }, (error) => panelError(error.message));
  };
  drawer.onsubmit = (e) => {
    e.preventDefault();
    act("receive", { received: po.items.map((_, k) => e.target[`r${k}`]?.value || 0) });
  };
}

function printPo(po, supplier) {
  const s = state.trade;
  $("[data-slips]").innerHTML = `
    <article class="slip">
      <header>
        <span class="slip-logo">${LOGO}</span>
        <div class="slip-shop"><strong>${esc(state.shop.name)}</strong><br>${esc(state.shop.email || "")}</div>
      </header>
      <div class="slip-meta">
        <div><p class="eyebrow">Purchase order</p><h1>${esc(po.number)}</h1><p>${esc(day(po.createdAt))}${po.expected ? `<br>Needed by ${esc(new Date(`${po.expected}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }))}` : ""}</p></div>
        <div><p class="eyebrow">Supplier</p><p>${esc(po.supplierName)}${supplier?.contactName ? `<br>${esc(supplier.contactName)}` : ""}${supplier?.email ? `<br>${esc(supplier.email)}` : ""}</p></div>
      </div>
      <table>
        <thead><tr><th>Qty</th><th>Item</th><th class="num">Each</th><th class="num">Total</th></tr></thead>
        <tbody>${po.items.map((i) => `<tr><td>${i.qty} ${esc(i.unit)}</td><td><strong>${esc(i.description)}</strong></td><td class="num">${money(i.unitCost)}</td><td class="num">${money(i.qty * i.unitCost)}</td></tr>`).join("")}</tbody>
      </table>
      <p class="slip-total">Total ${money(po.total)}</p>
      ${po.notes ? `<p class="slip-notes"><span class="eyebrow">Notes</span>${esc(po.notes)}</p>` : ""}
      <footer>Please confirm this order with ${esc(state.shop.email || "")}.</footer>
    </article>`;
  setTimeout(() => window.print(), 50);
}

function signupsView() {
  if (state.sub === "newsletters") return newslettersView();
  if (state.sub === "edit" || state.sub === "auto-edit") return newsletterEditor();
  if (state.sub === "automations") return automationsView();
  const q = state.query.toLowerCase();
  const rows = state.signups.filter((x) => !q || x.email.includes(q));
  return `
    ${newsletterTabs()}
    <section class="card table-card">
      ${
        rows.length
          ? `<table class="table">
              <thead><tr><th>Email</th><th>Status</th><th>Signed up</th></tr></thead>
              <tbody>${rows
                .map(
                  (x) => `<tr>
                    <td><a class="cell-title" href="mailto:${esc(x.email)}">${esc(x.email)}</a></td>
                    <td>${x.status === "confirmed" ? `<span class="badge sub-active">Confirmed</span>` : x.status === "unsubscribed" ? `<span class="badge sub-cancelled">Unsubscribed</span>` : `<span class="badge sub-paused">Pending</span>`}</td>
                    <td><small class="nowrap">${esc(date(x.subscribedAt))}</small></td>
                  </tr>`
                )
                .join("")}</tbody>
            </table>`
          : `<div class="empty empty-lg">${icon("signups", "i i-xl")}<p><strong>${state.query ? "No emails match that search" : "No signups yet"}</strong></p></div>`
      }
    </section>`;
}

/* ── Languages: the shop in Spanish and Korean, every translation editable ── */

const TR_PAGE = 80;
// Translation boxes grow with their text (by CSS field-sizing where the browser has it).
const growAreas = (areas) => {
  if (CSS.supports?.("field-sizing", "content")) return;
  areas.forEach((a) => (a.style.height = "auto"));
  const heights = areas.map((a) => a.scrollHeight + a.offsetHeight - a.clientHeight);
  areas.forEach((a, i) => (a.style.height = `${heights[i]}px`));
};
document.addEventListener("input", (e) => (e.target as any).matches?.("[data-tr-field]") && growAreas([e.target]));
function languagesView() {
  const t = state.tr;
  const q = state.query.trim().toLowerCase();
  const all = t.rows;
  const pick = { all: () => true, catalog: (r) => r.source === "auto", corrected: (r) => r.source === "manual" }[state.sub];
  const rows = all.filter(pick).filter((r) => !q || `${r.key} ${r.es} ${r.ko}`.toLowerCase().includes(q));
  const counts = { auto: all.filter((r) => r.source === "auto").length, manual: all.filter((r) => r.source === "manual").length };
  const sourceBadge = (r) =>
    r.source === "manual" ? `<span class="badge sub-active">Corrected</span>` : r.source === "auto" ? `<span class="badge s-packed">Translated automatically</span>` : "";
  return `
    ${subTabs("languages", [
      ["all", "All text", all.length],
      ["catalog", "Products & menu", counts.auto],
      ["corrected", "Corrected", counts.manual],
    ])}
    <p class="notice">${icon("languages")}<span>${t.aiReady ? "" : "Automatic translation isn't connected yet. "}Keep markers like <code>&lt;0&gt;…&lt;/0&gt;</code> and <code>{price}</code> in place.</span></p>
    <section class="card table-card">
      ${
        rows.length
          ? `<table class="table tr-table">
              <thead><tr><th>English</th><th lang="es"><a class="link" href="/es/" target="_blank" rel="noopener">Español</a></th><th lang="ko"><a class="link" href="/ko/" target="_blank" rel="noopener">한국어</a></th></tr></thead>
              <tbody>${rows
                .slice(0, state.trLimit || TR_PAGE)
                .map(
                  (r) => `<tr data-tr-row="${esc(r.key)}">
                    <td><span class="tr-en">${esc(r.key)}</span>${sourceBadge(r)}${r.source === "manual" ? `<button type="button" class="link tr-undo" data-tr-undo>${icon("undo", "i i-sm")} Undo correction</button>` : ""}</td>
                    <td><textarea lang="es" rows="2" data-tr-field="es" aria-label="Spanish for: ${esc(r.key)}">${esc(r.es)}</textarea></td>
                    <td><textarea lang="ko" rows="2" data-tr-field="ko" aria-label="Korean for: ${esc(r.key)}">${esc(r.ko)}</textarea></td>
                  </tr>`
                )
                .join("")}</tbody>
            </table>
            ${rows.length > (state.trLimit || TR_PAGE) ? `<div class="show-more"><button type="button" class="btn" data-tr-more>Show ${Math.min(TR_PAGE, rows.length - (state.trLimit || TR_PAGE))} more</button><small class="muted">${state.trLimit || TR_PAGE} of ${rows.length}</small></div>` : ""}`
          : `<div class="empty empty-lg">${icon("languages", "i i-xl")}<p><strong>${q ? "Nothing matches that search" : state.sub === "corrected" ? "No corrections yet" : "Nothing here yet"}</strong></p></div>`
      }
    </section>`;
}

/* ── Sales tax: sales by state toward each state's threshold, and where the shop collects ── */

// Returns customers started from their tracking page, problems they reported (damaged, wrong or
// missing, with photos), and deliveries that came back. Scanning a return's QR code opens it here
// (#returns/<code>); so does the link in the shop's email about a problem.
const RETURN_DONE = { refunded: "Refunded", credited: "Store credit", exchanged: "Swap sent" };
function returnsView() {
  const list = state.returns;
  const claims = state.claims || [];
  const issues = state.issues || [];
  const one = state.returnCode && list.find((r) => r.code === state.returnCode);
  const claimOne = state.returnCode && claims.find((c) => c.code === state.returnCode);
  const what = (r) => r.items.map((i) => `${i.qty} × ${esc(i.title)}${i.variant ? ` (${esc(i.variant)})` : ""}${i.swapTo ? ` → ${esc(i.swapTo)}` : ""}`).join("<br>");
  const how = (r) => (r.method === "mail" ? `By mail${r.label ? ` · ${esc(r.label.carrier)} ${esc(r.label.trackingNumber)}${r.label.dropoff ? ` · ${esc(r.label.dropoff.name)} (${r.label.dropoff.miles} mi)` : ""}` : ""}${r.arrivedAt ? " · Delivered" : ""}` : "Drop-off");
  const wants = (r) => ({ refund: `Refund ${money(r.amount)}`, credit: `Store credit ${money(r.amount)}`, exchange: "Swap" })[r.resolution || "refund"];
  const badge = (r) => (r.status === "open" ? `<span class="badge t-yellow"><i></i>Waiting</span>` : `<span class="badge sub-active"><i></i>${RETURN_DONE[r.status] || "Done"}</span>`);
  // Checking in: its condition (resellable goes back into stock), and what the customer gets
  // (a refund or credit can be less than the full amount, for a used item).
  const checkIn = (r) => {
    const verb = { refund: "refund", credit: "send store credit", exchange: "send the swap" }[r.resolution || "refund"];
    return state.returnConfirm === r.code
      ? `<form class="return-confirm" data-return-receive="${esc(r.code)}">
          <p><strong>Check in ${esc(r.customer)}'s return</strong></p>
          <fieldset class="return-cond"><legend>Condition</legend>
            <label><input type="radio" name="condition" value="resellable" checked> Resellable, back into stock</label>
            <label><input type="radio" name="condition" value="damaged"> Used or damaged, not restocked</label>
          </fieldset>
          ${r.resolution !== "exchange" ? `<label class="field"><span>${r.resolution === "credit" ? "Store credit" : "Refund"}</span><input name="amount" inputmode="decimal" value="${r.amount.toFixed(2)}"></label>` : `<p>They get ${r.items.map((i) => `${esc(i.title)} in ${esc(i.swapTo)}`).join(", ")}, sent as a new order.</p>`}
          <label class="field"><span>Note (optional)</span><input name="note" maxlength="300" placeholder="Box opened, tags on…"></label>
          <p class="muted">They're emailed. This can't be undone.</p>
          <div class="return-confirm-actions">
            <button type="submit" class="btn btn-primary">Check in and ${verb}</button>
            <button type="button" class="btn btn-ghost" data-return-confirm="">Cancel</button>
          </div>
        </form>`
      : `<button type="button" class="btn btn-primary" data-return-confirm="${esc(r.code)}">Check In</button>`;
  };
  const scanned = one
    ? `<section class="card return-scan">
        <div><p class="muted">${esc(one.number)} · ${esc(one.customer)}</p><p><strong>${what(one)}</strong></p><p>${how(one)} · ${wants(one)}</p>${one.reasonLabel ? `<p class="muted">Why: ${esc(one.reasonLabel)}${one.note ? ` · “${esc(one.note)}”` : ""}</p>` : ""}</div>
        ${one.status === "open" ? checkIn(one) : `<p>${badge(one)} Checked in ${esc(new Date(one.receivedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }))}${one.condition ? ` · ${one.condition === "damaged" ? "not restocked" : "back in stock"}` : ""}</p>`}
      </section>`
    : "";
  // A reported problem: what, the photos, and the answer (as asked, another way, or declined).
  const claimCard = (c) => {
    const photos = (c.photos || []).map((id) => `<a href="/api/admin/claim-photos/${esc(id)}" target="_blank" rel="noopener"><img src="/api/admin/claim-photos/${esc(id)}" alt="Photo from ${esc(c.customer)}" loading="lazy"></a>`).join("");
    const asked = c.wholesale ? `a credit of ${money(c.amount)}` : c.want === "refund" ? `a refund of ${money(c.amount)}` : "a replacement";
    const done = { replaced: `Replacement sent${c.replacement ? ` as ${esc(c.replacement)}` : ""}`, refunded: `Refunded ${money(c.refunded || 0)}`, credited: `${money(c.credited || 0)} account credit`, declined: `Declined: ${esc(c.answer || "")}` }[c.status];
    const actions = c.wholesale
      ? `<label class="field"><span>Credit</span><input name="amount" inputmode="decimal" value="${c.amount.toFixed(2)}"></label>
         <div class="return-confirm-actions"><button type="submit" class="btn btn-primary" name="act" value="credit">Add Credit</button><button type="button" class="btn btn-ghost" data-claim-decline>Decline</button></div>`
      : `<div class="return-confirm-actions">
           <button type="submit" class="btn ${c.want === "replace" || !c.refundable ? "btn-primary" : ""}" name="act" value="replace">Send Replacement</button>
           ${c.refundable ? `<button type="submit" class="btn ${c.want === "refund" ? "btn-primary" : ""}" name="act" value="refund">Refund ${money(c.want === "refund" ? c.amount : c.refundValue)}</button>` : ""}
           <button type="button" class="btn btn-ghost" data-claim-decline>Decline</button>
         </div>`;
    return `<section class="card claim-card${c.code === state.returnCode ? " is-scanned" : ""}">
      <p class="muted">${esc(c.number)} · ${esc(c.customer)}${c.wholesale ? " · Wholesale" : ""} · ${esc(new Date(c.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</p>
      <p><strong>${esc(c.problemLabel)}</strong>: ${what(c)}</p>
      ${c.note ? `<p>“${esc(c.note)}”</p>` : ""}
      ${photos ? `<div class="claim-photos">${photos}</div>` : ""}
      ${
        c.status === "open"
          ? `<p class="muted">They'd like ${asked}.</p>
             <form class="claim-form" data-claim="${esc(c.code)}">
               ${actions}
               <div class="claim-decline" hidden><label class="field"><span>Why (they're emailed this)</span><textarea name="note" rows="2" maxlength="500" placeholder="The photo shows the bag was opened after delivery…"></textarea></label><button type="submit" class="btn" name="act" value="decline">Decline</button></div>
             </form>`
          : `<p><span class="badge ${c.status === "declined" ? "s-cancelled" : "sub-active"}"><i></i>${done}</span></p>`
      }
    </section>`;
  };
  // A delivery that came back: the customer chooses on their order page; the shop can too.
  const issueCard = (d) => `<section class="card claim-card">
      <p class="muted">${esc(d.number)} · ${esc(d.customer)}</p>
      <p><strong>${d.kind === "courier" ? "Courier couldn't deliver" : "Carrier sending it back"}</strong>${d.text ? `: ${esc(d.text)}` : ""}</p>
      ${d.shipTo ? `<p class="muted">${esc([d.shipTo.address, d.shipTo.city, d.shipTo.state, d.shipTo.postcode].filter(Boolean).join(", "))}</p>` : ""}
      ${
        d.status === "open"
          ? `<div class="return-confirm-actions"><button type="button" class="btn" data-delivery-choice="reship" data-order="${esc(d.number)}">Reship</button>${d.canRefund ? `<button type="button" class="btn" data-delivery-choice="refund" data-order="${esc(d.number)}">Refund ${money(d.left)}</button>` : ""}</div>`
          : `<p><span class="badge sub-active"><i></i>${d.status === "reshipped" ? `Reshipped${d.reship ? ` as ${esc(d.reship)}` : ""}` : "Refunded"}</span></p>`
      }
    </section>`;
  const openClaims = claims.filter((c) => c.status === "open" || c === claimOne);
  const openIssues = issues.filter((d) => d.status === "open");
  const needs = openClaims.length || openIssues.length ? `<div class="claim-grid">${openIssues.map(issueCard).join("")}${openClaims.map(claimCard).join("")}</div>` : "";
  if (!list.length && !claims.length && !issues.length) return `<div class="empty empty-lg">${icon("returns", "i i-xl")}<p><strong>No returns</strong></p></div>`;
  // The scanned return shows above, not again in the list.
  const f = state.returnFilter || "all";
  const rest = list.filter((r) => r !== one && (f === "all" || (f === "open" ? r.status === "open" : f === "received" ? r.status !== "open" : false)));
  const pastClaims = claims.filter((c) => c.status !== "open" && c !== claimOne);
  const n = (st) => list.filter((r) => r.status === st).length;
  return `${scanned}${needs}
    ${list.length ? chips("Return status", [
      { filter: "returns:all", label: "All", count: list.length, on: f === "all" },
      { filter: "returns:open", label: "Waiting", count: n("open"), tone: "t-yellow", on: f === "open" },
      { filter: "returns:received", label: "Done", count: list.length - n("open"), tone: "s-completed", on: f === "received" },
    ]) : ""}
    ${
      rest.length
        ? `<section class="card table-card">
      <table class="table returns-table is-labelled">
        <thead><tr><th>Order</th><th>Items</th><th>Why</th><th>How</th><th class="num">They get</th><th>Status</th><th></th></tr></thead>
        <tbody>${rest
          .map(
            (r) => `<tr class="row-link" data-href="#returns/${esc(r.code)}">
              <td data-col="Order"><strong>${esc(r.number)}</strong><small class="muted">${esc(r.customer)}</small></td>
              <td data-col="Items">${what(r)}</td>
              <td data-col="Why">${esc(r.reasonLabel || "")}</td>
              <td data-col="How">${how(r)}</td>
              <td class="num" data-col="They get">${r.status === "open" ? wants(r) : r.status === "refunded" ? money(r.refunded ?? r.amount) : r.status === "credited" ? money(r.creditAmount || 0) : "Swap"}</td>
              <td data-col="Status">${badge(r)}</td>
              <td>${r.status === "open" ? `<a class="btn btn-sm" href="#returns/${esc(r.code)}">Check in</a>` : ""}</td>
            </tr>`
          )
          .join("")}</tbody>
      </table>
    </section>`
        : list.length ? `<p class="muted chips-empty">Nothing here.</p>` : ""
    }
    ${pastClaims.length || issues.some((d) => d.status !== "open") ? `<h2 class="claims-head">Problems sorted</h2><div class="claim-grid">${issues.filter((d) => d.status !== "open").map(issueCard).join("")}${pastClaims.map(claimCard).join("")}</div>` : ""}`;
}

async function loadReturns() {
  const r = await api("/api/admin/returns");
  Object.assign(state, { returns: r.returns, claims: r.claims, issues: r.issues });
}

async function returnsClick(t) {
  const ask = t.closest("[data-return-confirm]");
  if (ask) {
    state.returnConfirm = ask.dataset.returnConfirm || null;
    render();
    return true;
  }
  const decline = t.closest("[data-claim-decline]");
  if (decline) {
    const box = decline.closest("form").querySelector(".claim-decline");
    box.hidden = false;
    box.querySelector("textarea").focus();
    return true;
  }
  const deliver = t.closest("[data-delivery-choice]");
  if (deliver) {
    deliver.disabled = true;
    try {
      await api(`/api/admin/delivery/${deliver.dataset.order}`, { method: "POST", body: { choice: deliver.dataset.deliveryChoice } });
      await loadReturns();
      toast(deliver.dataset.deliveryChoice === "reship" ? "Reship order made." : "Refunded.");
      render();
    } catch (error) {
      toast(error.message, "error");
      deliver.disabled = false;
    }
    return true;
  }
  const row = t.closest(".returns-table [data-href]");
  if (row && !t.closest("a")) {
    go(row.dataset.href);
    return true;
  }
  return false;
}

// The check-in form and a problem's answer.
async function returnsSubmit(e) {
  const f = e.target;
  const receive = f.closest("[data-return-receive]");
  const claim = f.closest("[data-claim]");
  if (!receive && !claim) return false;
  e.preventDefault();
  const d = new FormData(f);
  const button = e.submitter || f.querySelector("[type=submit]");
  button.disabled = true;
  try {
    if (receive) {
      await api(`/api/admin/returns/${receive.dataset.returnReceive}/receive`, { method: "POST", body: { condition: d.get("condition"), amount: d.get("amount") ?? null, note: d.get("note") || "" } });
      state.returnConfirm = null;
      toast("Checked in.");
    } else {
      const act = button.value;
      await api(`/api/admin/claims/${claim.dataset.claim}`, { method: "POST", body: act === "decline" ? { action: "decline", note: d.get("note") || "" } : { action: "approve", want: act, amount: d.get("amount") ?? null } });
      toast({ replace: "Replacement order made.", refund: "Refunded.", credit: "Credit added.", decline: "Declined. They've been emailed." }[act]);
    }
    await loadReturns();
    render();
  } catch (error) {
    toast(error.message, "error");
    button.disabled = false;
  }
  return true;
}

// Reviews customers left (from the link in the email after their order). Hidden ones leave the
// product page and Google's stars.
// Our reviews on Google, Yelp and Tripadvisor (AnyAPI, daily): each place's rating, then new
// reviews as cards, low ones first to answer on the site they're on.
function elsewhereView() {
  const v = state.insights;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const listings = v.runs.reviews?.result?.listings || [];
  const f = state.elsewhereFilter || "new";
  const list = v.reviews.filter((r) => (f === "low" ? r.rating != null && r.rating <= 3 && r.status === "new" : r.status === f));
  const stars = (n) => (n == null ? "" : `${"★".repeat(Math.round(n))}<span class="muted">${"★".repeat(5 - Math.round(n))}</span>`);
  const replyOn = (r) => (r.platform === "Google" ? "Reply on Google" : r.platform === "Tripadvisor" ? "Reply on Tripadvisor" : "Open");
  return `${v.anyapi ? "" : `<p class="notice">${icon("star")}<span>Reviews from Google, Yelp and Tripadvisor aren't connected yet.</span></p>`}
    ${listings.length ? `<section class="review-listings">${listings.map((l) => `<a class="card review-listing" href="${esc(l.url)}" target="_blank" rel="noopener"><small>${esc(l.platform)}</small><strong>${l.rating != null ? Number(l.rating).toFixed(1) : "—"}</strong><span class="review-stars">${stars(l.rating)}</span><span class="muted">${l.count != null ? `${shortCount(l.count)} reviews` : ""} · ${esc(l.name)}</span></a>`).join("")}</section>` : ""}
    ${insightToolbar(v, "reviews", chips("Reviews elsewhere", [
      { filter: "elsewhere:new", label: "New", count: v.reviews.filter((r) => r.status === "new").length, tone: "t-yellow", on: f === "new" },
      { filter: "elsewhere:low", label: "Low ratings", count: v.reviews.filter((r) => r.status === "new" && r.rating != null && r.rating <= 3).length, tone: "p-unpaid", on: f === "low" },
      { filter: "elsewhere:done", label: "Done", count: v.reviews.filter((r) => r.status === "done").length, tone: "s-completed", on: f === "done" },
    ]))}
    ${
      list.length
        ? `<div class="post-grid">${list
            .map(
              (r) => `<article class="card post-card${r.rating != null && r.rating <= 3 ? " is-low" : ""}" data-ext-review="${esc(r.id)}">
                <header><span class="badge"><i></i>${esc(r.platform)}</span><span class="muted">${esc(r.place)}</span></header>
                <span class="review-stars">${stars(r.rating)}</span>
                <p class="post-caption">${esc(r.text) || `<span class="muted">Rating only</span>`}</p>
                <div class="post-nums"><span>${esc(r.author || "Someone")}</span><span class="muted">${r.at ? esc(dayShort(r.at)) : ""}</span>${r.replied ? `<span class="badge s-completed"><i></i>Answered</span>` : ""}</div>
                <div class="btn-row">${r.url ? `<a class="btn btn-sm${r.rating != null && r.rating <= 3 && !r.replied ? " btn-primary" : ""}" href="${esc(r.url)}" target="_blank" rel="noopener">${replyOn(r)}</a>` : ""}${r.status === "new" ? `<button type="button" class="btn btn-sm" data-ext-review-set="done">Done</button>` : `<button type="button" class="btn btn-sm btn-ghost" data-ext-review-set="new">Undo</button>`}<button type="button" class="btn btn-sm btn-ghost" data-ext-review-set="hidden">Hide</button></div>
              </article>`
            )
            .join("")}</div>`
        : `<div class="card empty empty-lg">${icon("star", "i i-xl")}<p><strong>${f === "done" ? "None done yet" : "Nothing new"}</strong></p></div>`
    }`;
}

function reviewsView() {
  const tabs = subTabs("reviews", [["site", "On our site", state.reviews.length], ["elsewhere", "Google, Yelp & Tripadvisor", state.insights ? state.insights.reviews.filter((r) => r.status === "new").length || "" : ""]]);
  if (state.sub === "elsewhere") return `${tabs}${elsewhereView()}`;
  return `${tabs}${siteReviewsView()}`;
}

function siteReviewsView() {
  const list = state.reviews;
  if (!list.length) return `<div class="empty empty-lg">${icon("star", "i i-xl")}<p><strong>No reviews yet</strong></p></div>`;
  const f = state.reviewFilter || "all";
  const pick = { all: () => true, shown: (r) => r.status !== "hidden", hidden: (r) => r.status === "hidden", low: (r) => r.rating <= 3 };
  const rows = list.filter(pick[f]);
  return `
    ${chips("Review filter", [
      { filter: "reviews:all", label: "All", count: list.length, on: f === "all" },
      { filter: "reviews:shown", label: "Shown", count: list.filter(pick.shown).length, tone: "s-completed", on: f === "shown" },
      { filter: "reviews:hidden", label: "Hidden", count: list.filter(pick.hidden).length, tone: "s-cancelled", on: f === "hidden" },
      { filter: "reviews:low", label: "Low ratings", count: list.filter(pick.low).length, tone: "p-unpaid", on: f === "low" },
    ])}
    ${rows.length ? "" : `<p class="muted chips-empty">Nothing here.</p>`}
    <section class="card table-card"${rows.length ? "" : " hidden"}>
      <table class="table">
        <thead><tr><th>Product</th><th>Rating</th><th>Review</th><th>From</th><th></th></tr></thead>
        <tbody>${rows
          .map(
            (r) => `<tr data-review="${esc(r.id)}"${r.status === "hidden" ? ' class="is-muted"' : ""}>
              <td><strong>${esc(r.productName)}</strong></td>
              <td>${"★".repeat(r.rating)}<span class="muted">${"★".repeat(5 - r.rating)}</span></td>
              <td>${r.text ? esc(r.text) : '<span class="muted">No text</span>'}</td>
              <td>${esc(r.name)}<small class="muted">${esc(r.order)} · ${esc(new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }))}</small></td>
              <td><button type="button" class="btn btn-sm" data-review-toggle>${r.status === "hidden" ? "Show" : "Hide"}</button></td>
            </tr>`
          )
          .join("")}</tbody>
      </table>
    </section>`;
}

async function reviewsClick(t) {
  if (await insightsClick(t)) return true;
  const ext = t.closest("[data-ext-review-set]");
  if (ext) {
    const id = ext.closest("[data-ext-review]").dataset.extReview;
    ext.disabled = true;
    try {
      const { item } = await api(`/api/admin/insights/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: ext.dataset.extReviewSet } });
      Object.assign(state.insights.reviews.find((r) => r.id === id), item);
    } catch (error) {
      toast(error.message, "error");
    }
    render();
    return true;
  }
  const b = t.closest("[data-review-toggle]");
  if (!b) return false;
  const id = b.closest("[data-review]").dataset.review;
  const r = state.reviews.find((x) => x.id === id);
  b.disabled = true;
  try {
    const { review } = await api(`/api/admin/reviews/${encodeURIComponent(id)}`, { method: "PATCH", body: { status: r.status === "hidden" ? "published" : "hidden" } });
    Object.assign(r, review);
    render();
  } catch (error) {
    toast(error.message, "error");
    b.disabled = false;
  }
  return true;
}

// Sales tax: where the shop charges it, and how close every other state is to the sales that
// mean registering there. Starting a state opens a short form in its row (rates and a tick that
// you've registered) instead of a pop-up.
/* ── A small rich text editor (job descriptions): bold, underline, links, headings, lists ──
   What it shows is the server's HTML of the saved marks (server/careers.ts jobBodyHtml); what it
   saves is those marks again (**bold**, __underline__, [text](url), ## heading, - item, 1. item).
   Pasted text keeps only that formatting: anything else (fonts, colors, scripts) is dropped. */

function richEditor(html, labelledBy) {
  const b = (cmd, ic, label) => `<button type="button" class="rte-btn" data-rte-cmd="${cmd}" aria-label="${label}" title="${label}">${icon(ic)}</button>`;
  return `<div class="rte">
    <div class="rte-bar" role="toolbar" aria-label="Formatting">
      ${b("bold", "Bold", "Bold")}${b("underline", "Underline", "Underline")}${b("link", "Link", "Link")}${b("heading", "Heading2", "Heading")}${b("insertUnorderedList", "List", "Bulleted list")}${b("insertOrderedList", "ListOrdered", "Numbered list")}
    </div>
    <div class="rte-area" contenteditable="true" role="textbox" aria-multiline="true" aria-labelledby="${labelledBy}" data-rte>${html || "<p><br></p>"}</div>
  </div>`;
}

// Only these, from anything pasted: their text, bold, underline, links, headings and lists.
function cleanRich(from) {
  const frag = document.createDocumentFragment();
  const walk = (node, into) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === 3) {
        into.append(document.createTextNode(n.textContent.replace(/\s+/g, " ")));
        continue;
      }
      if (n.nodeType !== 1) continue;
      const tag = n.nodeName.toLowerCase();
      if (["script", "style", "head", "meta", "title", "noscript", "iframe", "object"].includes(tag)) continue;
      const style = n.getAttribute("style") || "";
      const bold = tag === "strong" || tag === "b" || /font-weight:\s*(bold|[6-9]00)/.test(style);
      const under = tag === "u" || /text-decoration[^;]*underline/.test(style);
      let el = null;
      if (/^h[1-6]$/.test(tag)) el = document.createElement("h2");
      else if (tag === "ul" || tag === "ol" || tag === "li" || tag === "p") el = document.createElement(tag);
      else if (tag === "div") el = document.createElement("p");
      else if (tag === "br") (into.append(document.createElement("br")), (el = null));
      else if (tag === "a" && /^(https?:|mailto:|\/)/i.test(n.getAttribute("href") || "")) {
        el = document.createElement("a");
        el.setAttribute("href", n.getAttribute("href"));
      }
      if (tag === "br") continue;
      let target = el || into;
      if (el) into.append(el);
      if (bold && tag !== "strong" && !/^h/.test(el?.nodeName.toLowerCase() || "")) {
        const s = document.createElement("strong");
        target.append(s);
        target = s;
      } else if (tag === "strong" || tag === "b") {
        const s = document.createElement("strong");
        target.append(s);
        target = s;
      }
      if (under) {
        const u = document.createElement("u");
        target.append(u);
        target = u;
      }
      walk(n, target);
    }
  };
  walk(from, frag);
  return frag;
}

// The editor's content as the saved marks.
function richToMarks(area) {
  const inl = (node) =>
    [...node.childNodes]
      .map((n) => {
        if (n.nodeType === 3) return n.textContent.replace(/\s+/g, " ");
        if (n.nodeType !== 1) return "";
        const tag = n.nodeName.toLowerCase();
        const inner = inl(n);
        if (tag === "br") return "\n";
        if (!inner.trim()) return inner;
        if (tag === "strong" || tag === "b") return `**${inner.trim()}**`;
        if (tag === "u") return `__${inner.trim()}__`;
        if (tag === "a" && n.getAttribute("href")) return `[${inner.trim()}](${n.getAttribute("href")})`;
        return inner;
      })
      .join("");
  const BLOCK = /^(p|div|h[1-6]|ul|ol|li|blockquote)$/;
  const isBlock = (n) => n.nodeType === 1 && BLOCK.test(n.nodeName.toLowerCase());
  const blocks = [];
  // A list's items, one line each; a list inside an item (Tab in some browsers) joins this one.
  const items = (list, out = []) => {
    for (const li of list.children) {
      const own = inl({ childNodes: [...li.childNodes].filter((c) => !/^(ul|ol)$/i.test(c.nodeName)) }).replace(/\n+/g, " ").trim();
      if (own) out.push(own);
      for (const sub of li.children) if (/^(ul|ol)$/i.test(sub.nodeName)) items(sub, out);
    }
    return out;
  };
  const block = (n) => {
    if (n.nodeType === 3) return n.textContent.trim() && blocks.push(n.textContent.trim());
    if (n.nodeType !== 1) return;
    const tag = n.nodeName.toLowerCase();
    if (/^h[1-6]$/.test(tag)) return blocks.push(`## ${inl(n).trim()}`);
    if (tag === "ul" || tag === "ol") {
      const lines = items(n).map((t, i) => `${tag === "ol" ? `${i + 1}.` : "-"} ${t}`);
      return lines.length && blocks.push(lines.join("\n"));
    }
    // A paragraph can hold a list or another block (Chrome puts a list made from a line inside
    // that line's <p>): its text runs and blocks are taken in order.
    if ([...n.childNodes].some(isBlock)) {
      let run = [];
      const flush = () => {
        const t = inl({ childNodes: run }).trim();
        if (t) blocks.push(t);
        run = [];
      };
      for (const c of n.childNodes) isBlock(c) ? (flush(), block(c)) : run.push(c);
      return flush();
    }
    const t = inl(n).trim();
    if (t) blocks.push(t);
  };
  [...area.childNodes].forEach(block);
  return blocks.filter(Boolean).join("\n\n");
}

function mountRichEditor(root) {
  const area = $("[data-rte]", root);
  if (!area) return;
  document.execCommand("defaultParagraphSeparator", false, "p");
  // The toolbar keeps the selection in the text (mousedown would move focus to the button).
  $(".rte-bar", root).addEventListener("mousedown", (e) => e.preventDefault());
  $(".rte-bar", root).addEventListener("click", (e) => {
    const b = (e.target as any).closest("[data-rte-cmd]");
    if (!b) return;
    area.focus();
    const cmd = b.dataset.rteCmd;
    if (cmd === "link") {
      const at = document.getSelection()?.anchorNode?.parentElement?.closest("a");
      if (at) return document.execCommand("unlink");
      const url = prompt("Link to (a web address, or an email)");
      if (!url) return;
      const href = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(url.trim()) ? `mailto:${url.trim()}` : /^(https?:|mailto:|\/)/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
      return document.execCommand("createLink", false, href);
    }
    if (cmd === "heading") {
      const inHeading = document.getSelection()?.anchorNode?.parentElement?.closest("h2");
      return document.execCommand("formatBlock", false, inHeading ? "p" : "h2");
    }
    document.execCommand(cmd);
  });
  area.addEventListener("paste", (e: ClipboardEvent) => {
    const html = e.clipboardData?.getData("text/html");
    const text = e.clipboardData?.getData("text/plain") || "";
    e.preventDefault();
    const holder = document.createElement("div");
    if (html) holder.append(cleanRich(new DOMParser().parseFromString(html, "text/html").body));
    else
      text.split(/\r?\n/).forEach((line) => {
        const p = document.createElement("p");
        p.textContent = line;
        holder.append(p);
      });
    document.execCommand("insertHTML", false, holder.innerHTML);
  });
}

/* ── Team: who signs in to the back office, their roles, and the activity log ── */

// Configure › Business (Peasy's): the shop's details, the back office's look, and this person's
// weekly email. The details are set with the website, so they're shown, not edited, here.
function businessView() {
  const b = state.biz;
  const row = (label, value) => `<div class="cfg-row"><span>${label}</span><strong>${esc(value || "—")}</strong></div>`;
  return `
    <section class="cfg-section"><header class="cfg-sect-head"><div><h2>General</h2></div></header>
      <div class="cfg-card">${row("Business name", b.name)}${row("Email", b.email)}${row("Orders email", b.ordersEmail)}${row("Address", b.address)}${b.phone ? row("Phone", b.phone) : ""}<div class="cfg-row cfg-logo"><span>Logo<small>Appears on invoices and documents</small></span>
        <div class="cfg-logo-box"><img src="/api/admin/business/logo?v=${esc(b.logo?.at || "site")}" alt="Your logo"></div>
        ${b.canLogo ? `<div class="btn-row"><label class="btn btn-sm">${icon("upload")}<span>Upload Logo</span><input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-biz-logo hidden></label>${b.logo?.custom ? `<button type="button" class="btn btn-sm btn-ghost" data-biz-logo-reset>Use Site Logo</button>` : ""}</div>` : ""}
      </div></div>
    </section>
    <section class="cfg-section"><header class="cfg-sect-head"><div><h2>Interface</h2></div></header>
      <div class="cfg-card"><div class="cfg-row"><span><strong>Theme</strong><small>Choose how the back office looks on this device.</small></span>
        <div class="cfg-seg">${[["light", "Sun", "Light", false], ["dark", "Moon", "Dark", true], ["system", "Monitor", "System", true]].map(([id, ic, label, beta]) => `<button type="button" data-theme-pick="${id}" aria-pressed="${themeChoice() === id}">${icon(ic)}<span>${label}</span>${beta ? `<em class="beta">Beta</em>` : ""}</button>`).join("")}</div></div></div>
    </section>
    <section class="cfg-section"><header class="cfg-sect-head"><div><h2>Notifications</h2></div></header>
      <div class="cfg-card"><label class="switch-row cfg-row"><span><strong>Weekly email</strong><small>${b.canEmail ? "A weekly summary of what needs your attention, every Monday morning." : "Sign in with your own email to get a weekly summary."}</small></span><input type="checkbox" data-biz-weekly ${b.weeklyEmail ? "checked" : ""} ${b.canEmail ? "" : "disabled"}><i aria-hidden="true"></i></label></div>
    </section>`;
}
// The logo: uploaded as it's picked; the site's logo back with Use Site Logo.
document.addEventListener("change", async (e) => {
  const input = (e.target as HTMLElement).closest?.("[data-biz-logo]") as HTMLInputElement;
  const file = input?.files?.[0];
  if (!file) return;
  if (file.size > 2_000_000) return toast("That logo is too big. Use one under 2 MB.", "error");
  const data = await new Promise<string>((ok) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.readAsDataURL(file);
  });
  try {
    await api("/api/admin/business/logo", { method: "POST", body: { type: file.type, data } });
    state.biz = await api("/api/admin/business");
    render();
    toast("Logo saved. Invoices use it now.");
  } catch (error) {
    toast(error.message, "error");
  }
});
document.addEventListener("click", async (e) => {
  if (!(e.target as HTMLElement).closest?.("[data-biz-logo-reset]")) return;
  try {
    await api("/api/admin/business/logo", { method: "DELETE", body: {} });
    state.biz = await api("/api/admin/business");
    render();
    toast("Back to the site logo.");
  } catch (error) {
    toast(error.message, "error");
  }
});
document.addEventListener("change", async (e) => {
  const box = (e.target as HTMLElement).closest?.("[data-biz-weekly]") as HTMLInputElement;
  if (!box) return;
  try {
    state.biz = await api("/api/admin/business", { method: "PATCH", body: { weeklyEmail: box.checked } });
    toast(box.checked ? "You'll get it every Monday." : "Weekly email off.");
  } catch (error) {
    box.checked = !box.checked;
    toast(error.message, "error");
  }
});
// Configure › Help Docs: the guides in the help panels, the team's and the cafés'
// (server/helpdocs.ts). A guide opens in a popup to change; the cafés' are translated on save.
const HELP_FOR = [["staff", "For Your Team"], ["cafe", "For Cafés"]];
function helpDocsView() {
  const docs = state.helpEdit.docs;
  return HELP_FOR.map(([who, label]) => {
    const mine = docs.filter((d) => d.for === who);
    return `<section class="cfg-section"><header class="cfg-sect-head"><div><h2>${label}</h2></div>${who === "staff" ? `<button type="button" class="btn btn-sm btn-primary" data-help-new>${icon("plus")}<span>New Guide</span></button>` : ""}</header>
      <div class="cfg-card">${
        mine.length
          ? mine.map((d) => `<button type="button" class="cfg-row cfg-row-btn" data-help-edit="${esc(d.id)}"><span><strong>${esc(d.title)}</strong><small>${esc(d.group)}</small></span>${icon("ChevronRight", "i cfg-go")}</button>`).join("")
          : `<div class="cfg-row"><span><small>No guides yet.</small></span></div>`
      }</div>
    </section>`;
  }).join("");
}
function helpDocPanel(id = "") {
  const d = id ? state.helpEdit.docs.find((x) => x.id === id) : { for: "staff", group: "", title: "", body: [] };
  if (!d) return;
  const groups = [...new Set(state.helpEdit.docs.map((x) => x.group))];
  const drawer = openPanel(
    id ? "Guide" : "New Guide",
    `<form class="form-stack" id="help-form" data-help-form>
      <div class="form-row-2">
        <label class="field"><span>For</span><select name="for">${HELP_FOR.map(([v, label]) => `<option value="${v}" ${d.for === v ? "selected" : ""}>${label.replace("For ", "")}</option>`).join("")}</select></label>
        <label class="field"><span>Group</span><input name="group" list="help-groups" value="${esc(d.group)}" placeholder="e.g. Ordering"><datalist id="help-groups">${groups.map((g) => `<option value="${esc(g)}">`).join("")}</datalist></label>
      </div>
      <label class="field"><span>Title</span><input name="title" required value="${esc(d.title)}"></label>
      <label class="field"><span>What it says</span><textarea name="body" rows="9" placeholder="A blank line starts a new paragraph.">${esc(d.body.join("\n\n"))}</textarea></label>
    </form>`,
    {
      modal: true,
      footer: `<div class="modal-foot-side">${id ? `<button type="button" class="btn btn-ghost" data-help-delete>Delete</button>` : ""}</div><div class="modal-foot-side"><button type="submit" form="help-form" class="btn btn-primary">${id ? "Save" : "Add Guide"}</button></div>`,
    }
  );
  const form = $("[data-help-form]", drawer) as any;
  const done = (r, msg) => {
    state.helpEdit = r;
    helpDocsLoaded = false;
    render();
    closeDrawer();
    toast(msg);
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const body = { for: form.for.value, group: form.group.value, title: form.title.value, body: form.body.value };
    try {
      done(await api(id ? `/api/admin/help-docs/${id}` : "/api/admin/help-docs", { method: id ? "PATCH" : "POST", body }), id ? "Saved." : "Guide added.");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (!e.target.closest("[data-help-delete]") || !confirm(`Delete "${d.title}"?`)) return;
    try {
      done(await api(`/api/admin/help-docs/${id}`, { method: "DELETE" }), "Deleted.");
    } catch (error) {
      panelError(error.message);
    }
  };
}
document.addEventListener("click", (e) => {
  if (state.page !== "helpdocs") return;
  const t = e.target as HTMLElement;
  if (t.closest?.("[data-help-new]")) return helpDocPanel();
  const row = t.closest?.("[data-help-edit]") as HTMLElement;
  if (row) helpDocPanel(row.dataset.helpEdit);
});
// Configure › Calls: Book a Call in the wholesale portal (server/calls.ts). Each change saves.
const WEEKDAYS = [[1, "Mon"], [2, "Tue"], [3, "Wed"], [4, "Thu"], [5, "Fri"], [6, "Sat"], [0, "Sun"]];
function callsView() {
  const c = state.calls;
  const s = c.settings;
  const row = (label, line, control) => `<div class="cfg-row"><span><strong>${label}</strong>${line ? `<small>${line}</small>` : ""}</span>${control}</div>`;
  return `
    <section class="cfg-section"><header class="cfg-sect-head"><div><h2>Booking</h2></div></header>
      <div class="cfg-card">
        <label class="switch-row cfg-row"><span><strong>Cafés can book a call</strong><small>Book a Call shows in their portal's help panel.</small></span><input type="checkbox" data-calls-set="on" ${s.on ? "checked" : ""}><i aria-hidden="true"></i></label>
        ${row("Days", "", `<div class="cfg-days">${WEEKDAYS.map(([d, label]) => `<label class="cfg-day"><input type="checkbox" data-calls-day="${d}" ${s.days.includes(d) ? "checked" : ""}><span>${label}</span></label>`).join("")}</div>`)}
        ${row("Hours", "Pacific time.", `<span class="cfg-hours"><input type="time" step="900" value="${esc(s.from)}" data-calls-set="from" aria-label="From"><span>to</span><input type="time" step="900" value="${esc(s.to)}" data-calls-set="to" aria-label="To"></span>`)}
        ${row("Length", "", `<select data-calls-set="minutes" aria-label="Length">${[15, 20, 30, 45, 60].map((m) => `<option value="${m}" ${s.minutes === m ? "selected" : ""}>${m} minutes</option>`).join("")}</select>`)}
        ${row("Notice", "The soonest a café can book.", `<select data-calls-set="notice" aria-label="Notice">${[0, 1, 2, 4, 8, 12, 24, 48].map((h) => `<option value="${h}" ${s.notice === h ? "selected" : ""}>${h ? `${h} ${h === 1 ? "hour" : "hours"}` : "None"}</option>`).join("")}</select>`)}
        ${row("Who takes them", "Each call is a to-do for them on its day.", `<select data-calls-set="who" aria-label="Who takes them"><option value="">Anyone</option>${c.staff.map((p) => `<option value="${esc(p.id)}" ${s.who === p.id ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</select>`)}
      </div>
    </section>
    <section class="cfg-section"><header class="cfg-sect-head"><div><h2>Video</h2></div></header>
      <div class="cfg-card">${
        c.video?.connected
          ? row(esc(c.video.connected.name), esc(c.video.connected.email || "Connected"), `<button type="button" class="btn btn-sm" data-video-off>Disconnect</button>`)
          : row("Video calls", "", `<span class="btn-row"><a class="btn btn-sm" href="/api/admin/calls/connect/google">Connect Google Meet</a><a class="btn btn-sm" href="/api/admin/calls/connect/zoom">Connect Zoom</a></span>`)
      }</div>
    </section>
    <section class="cfg-section"><header class="cfg-sect-head"><div><h2>Coming Up</h2></div></header>
      <div class="cfg-card">${
        c.upcoming.length
          ? c.upcoming.map((b) => `<div class="cfg-row"><span><strong>${esc(b.business)}</strong><small>${esc(b.label)} · ${b.minutes} min${b.whoName ? ` · ${esc(b.whoName)}` : ""}${b.note ? ` · ${esc(b.note)}` : ""}</small></span><span class="btn-row">${b.meeting?.url ? `<a class="btn btn-sm" href="${esc(b.meeting.url)}" target="_blank" rel="noopener">Join</a>` : ""}<button type="button" class="btn btn-sm" data-call-cancel="${esc(b.id)}">Cancel Call</button></span></div>`).join("")
          : `<div class="cfg-row"><span><small>No calls booked.</small></span></div>`
      }</div>
    </section>`;
}
async function saveCalls(body) {
  try {
    state.calls = await api("/api/admin/calls", { method: "PATCH", body });
    toast("Saved.");
  } catch (error) {
    toast(error.message, "error");
  }
  render();
}
document.addEventListener("change", (e) => {
  const el = e.target as HTMLInputElement;
  if (state.page !== "calls") return;
  const key = el.dataset?.callsSet;
  if (key) return saveCalls({ [key]: key === "on" ? el.checked : el.value });
  if (el.dataset?.callsDay) saveCalls({ days: $$("[data-calls-day]").filter((x: any) => x.checked).map((x: any) => Number(x.dataset.callsDay)) });
});
document.addEventListener("click", async (e) => {
  if (state.page !== "calls" || !(e.target as HTMLElement).closest?.("[data-video-off]")) return;
  if (!confirm(`Disconnect ${state.calls.video.connected.name}? Calls booked after this won't get a video link.`)) return;
  try {
    state.calls = { ...state.calls, ...(await api("/api/admin/calls/connection", { method: "DELETE" })) };
    toast("Disconnected.");
    render();
  } catch (error) {
    toast(error.message, "error");
  }
});
document.addEventListener("click", async (e) => {
  const b = (e.target as HTMLElement).closest?.("[data-call-cancel]") as HTMLElement;
  if (!b) return;
  const call = state.calls.upcoming.find((x) => x.id === b.dataset.callCancel);
  if (!call || !confirm(`Cancel the call with ${call.business} on ${call.label}? We'll email them.`)) return;
  try {
    await api(`/api/admin/calls/${call.id}`, { method: "DELETE" });
    state.calls = await api("/api/admin/calls");
    toast("Call cancelled. We emailed them.");
    render();
  } catch (error) {
    toast(error.message, "error");
  }
});
function teamView() {
  const owner = ME.role === "owner";
  const tabs = owner ? subTabs("team", [["people", "People", state.team.staff.length], ["activity", "Activity"]]) : "";
  if (state.sub === "people" && owner) {
    const T = state.team;
    const roleOf = (id) => T.roles.find((r) => r.id === id);
    const ago2 = (iso) => `Active ${ago(iso)}`;
    const member = (p) => `<button type="button" class="member-row${p.active === false ? " is-archived" : ""}" data-staff="${esc(p.id)}">
        <span class="member-avatar" aria-hidden="true">${esc(initials(p.name))}</span>
        <span class="member-main">
          <span class="member-name"><strong>${esc(p.name)}</strong>${p.id === ME.id ? `<em class="member-you">You</em>` : ""}${tag("", roleOf(p.role)?.label || p.role)}${Array.isArray(p.pages) && p.role !== "owner" ? tag("", "Custom pages") : ""}${p.active === false ? tag("", "Turned off") : ""}</span>
          <small>${esc(p.email)}</small>
          <small class="member-when">${p.lastSignIn ? `${icon("clock", "i")}${esc(ago2(p.lastSignIn))}` : tag("t-yellow", "Invited")}</small>
        </span>
      </button>`;
    return `${tabs}
      <section class="cfg-section">
        <header class="cfg-sect-head"><div><h2>Team members</h2><p>${T.staff.length} member${T.staff.length === 1 ? "" : "s"} besides the admin key.</p></div><button type="button" class="btn" data-staff-add>${icon("UserPlus")}<span>Invite Member</span></button></header>
        ${T.staff.length ? `<div class="cfg-card member-list">${T.staff.map(member).join("")}</div>` : `<div class="cfg-card"><p class="muted cfg-none">Only the admin key signs in.</p></div>`}
      </section>`;
  }
  const A = state.activity;
  return `${tabs}
    <nav class="chips" aria-label="Whose">
      <button type="button" class="chip${state.activityWho ? "" : " is-active"}" data-activity-who="" aria-pressed="${!state.activityWho}"><span>Everyone</span></button>
      <button type="button" class="chip${state.activityWho === "key" ? " is-active" : ""}" data-activity-who="key" aria-pressed="${state.activityWho === "key"}"><span>Admin Key</span></button>
      ${A.staff.map((p) => `<button type="button" class="chip${state.activityWho === p.id ? " is-active" : ""}" data-activity-who="${esc(p.id)}" aria-pressed="${state.activityWho === p.id}"><span>${esc(p.name)}</span></button>`).join("")}
    </nav>
    <section class="card table-card">${
      A.activity.length
        ? `<table class="table is-labelled activity-table">
            <thead><tr><th>When</th><th>Who</th><th>What</th></tr></thead>
            <tbody>${A.activity.map((x) => `<tr><td>${esc(date(x.at))}</td><td>${esc(x.who)}</td><td>${esc(x.what)}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted chips-empty">Nothing changed yet.</p>`
    }</section>`;
}

// A team member: name, work email (they sign in with it), role; turned off or removed signs
// them out everywhere.
// A role's pages, as a list (every page for "*").
const rolePages = (role) => {
  const r = state.team?.roles.find((x) => x.id === role);
  return !r ? [] : r.pages === "*" ? PAGES.map((x) => x.id) : r.pages;
};
function staffForm(p = null) {
  const T = state.team;
  const drawer = openPanel(p ? p.name : "Invite Team Member", `
    <form class="panel form-stack" data-staff-form>
      <label class="field"><span>Full Name</span><input name="name" value="${esc(p?.name || "")}" required maxlength="80" placeholder="John Doe"></label>
      <label class="field"><span>Email Address</span><input name="email" type="email" value="${esc(p?.email || "")}" required placeholder="john@example.com"></label>
      <fieldset class="field"><legend>Role</legend>
        <div class="role-choices">${T.roles
          .map(
            (r) => `<label class="role-choice"><input type="radio" name="role" value="${r.id}" ${(p?.role || "fulfillment") === r.id ? "checked" : ""}><span><strong>${esc(r.label)}</strong><small>${r.pages === "*" ? (r.id === "owner" ? "Every page, and the team" : "Every page but the team") : esc(r.pages.map((id) => PAGES.find((x) => x.id === id)?.label || id).join(", "))}</small></span></label>`
          )
          .join("")}</div>
      </fieldset>
      <fieldset class="field staff-pages" data-staff-pages ${(p?.role || "fulfillment") === "owner" ? "hidden" : ""}><legend>Pages they see</legend>
        <label class="checkbox"><input type="checkbox" name="custom" ${Array.isArray(p?.pages) ? "checked" : ""}><span>Choose their pages</span></label>
        <div class="staff-page-list" ${Array.isArray(p?.pages) ? "" : "hidden"}>${[...new Set(PAGES.filter((x) => x.id !== "team").map((x) => x.group || "General"))]
          .map(
            (g) => `<div class="staff-page-group"><p>${esc(g)}</p>${PAGES.filter((x) => x.id !== "team" && (x.group || "General") === g)
              .map((x) => `<label class="checkbox"><input type="checkbox" name="pages" value="${x.id}" ${(Array.isArray(p?.pages) ? p.pages : rolePages(p?.role || "fulfillment")).includes(x.id) ? "checked" : ""}><span>${esc(x.label)}</span></label>`)
              .join("")}</div>`
          )
          .join("")}</div>
      </fieldset>
      ${p ? `<label class="checkbox"><input type="checkbox" name="active" ${p.active !== false ? "checked" : ""}><span>Can sign in</span></label>` : ""}
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${p ? "Save" : `${icon("email")}<span>Send Invite</span>`}</button>
        ${p ? `<button type="button" class="btn btn-ghost btn-danger" data-staff-remove>Remove</button>` : ""}
      </div>
    </form>`, { modal: true, subtitle: p ? "" : "Send an invitation to add a new team member. They sign in with this email." });
  const form = $("[data-staff-form]", drawer);
  // The role's pages fill the list until they're chosen by hand; owners see everything.
  form.addEventListener("change", (e) => {
    const box = $("[data-staff-pages]", form);
    box.hidden = form.role.value === "owner";
    $(".staff-page-list", form).hidden = !form.custom.checked;
    if (e.target.name === "role" && !form.custom.checked) $$("[name=pages]", form).forEach((c) => (c.checked = rolePages(form.role.value).includes(c.value)));
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body: any = { name: form.name.value, email: form.email.value, role: form.role.value, pages: form.custom.checked && form.role.value !== "owner" ? $$("[name=pages]:checked", form).map((c) => c.value) : null };
    if (p) body.active = form.active.checked;
    try {
      state.team = await api(p ? `/api/admin/staff/${p.id}` : "/api/admin/staff", { method: p ? "PATCH" : "POST", body });
      toast(p ? "Saved" : `Added. We've emailed ${body.email} how to sign in.`);
      closeDrawer();
      render();
    } catch (error) {
      panelError(error.message);
    }
  });
  $("[data-staff-remove]", drawer)?.addEventListener("click", async () => {
    if (!confirm(`Remove ${p.name} from the team? They're signed out everywhere.`)) return;
    try {
      state.team = await api(`/api/admin/staff/${p.id}`, { method: "DELETE" });
      closeDrawer();
      render();
    } catch (error) {
      panelError(error.message);
    }
  });
}

/* ── Careers: roles (written here, open on the site) and the applications to them ── */

const ROLE_STATE = { draft: "Draft", open: "Open", closed: "Closed" };
const APP_GRADE = { A: "A", B: "B", C: "C", D: "D", F: "F" };
// An application's grade: the one the team picked, or else the assistant's.
const appGrade = (a) => a.grade || a.ai?.grade || "";
const APP_STATE = { new: "New", reviewing: "Reviewing", interview: "Interview", offer: "Offer", hired: "Hired", declined: "Declined" };
// One status tag everywhere: waiting on us in blue, moving in yellow or purple, done in green, closed in gray.
const ROLE_TONE = { open: "t-green" };
const APP_TONE = { new: "t-blue", reviewing: "t-yellow", interview: "t-purple", offer: "t-orange", hired: "t-green" };
const tag = (tone, label) => `<span class="badge${tone ? ` ${tone}` : ""}"><i></i>${esc(label)}</span>`;
function careersView() {
  const c = state.careers;
  const waiting = c.applications.filter((a) => a.status === "new").length;
  const empty = (title, action = "") => `<div class="empty empty-lg">${icon("careers", "i i-xl")}<p><strong>${title}</strong></p>${action}</div>`;
  if (state.sub === "page") return `${subTabs("careers", [["roles", "Roles", c.roles.filter((r) => r.status === "open").length || ""], ["applications", "Applications", waiting || ""], ["page", "Page"]])}${careersPageForm(c.page)}`;
  // Applications, filtered by grade (all, not graded yet, or one grade): the team's, or else the
  // assistant's.
  const gradeOf = (a) => appGrade(a) || "none";
  const shownApps = c.applications.filter((a) => !state.applicantFilter || gradeOf(a) === state.applicantFilter);
  const gradeChips = c.applications.length
    ? chips("Grade", [
        { filter: "applicants:", label: "All", count: c.applications.length, on: !state.applicantFilter },
        { filter: "applicants:none", label: "Not Graded", count: c.applications.filter((a) => !appGrade(a)).length, on: state.applicantFilter === "none" },
        ...c.grades.map((g) => ({ filter: `applicants:${g}`, label: APP_GRADE[g], count: c.applications.filter((a) => appGrade(a) === g).length, tone: `g-${g}`, on: state.applicantFilter === g })),
      ])
    : "";
  const body =
    state.sub === "applications"
      ? c.applications.length
        ? shownApps.length
          ? `<table class="table is-labelled">
            <thead><tr><th>Name</th><th>Role</th><th>Grade</th><th>Status</th><th>Applied</th></tr></thead>
            <tbody>${shownApps
              .map(
                (a) => `<tr data-application="${esc(a.id)}" class="clickable">
                  <td>${who(a.name, a.email)}</td>
                  <td>${esc(a.roleTitle)}</td>
                  <td>${appGrade(a) ? `<span class="app-grade g-${appGrade(a)}"><i></i>${APP_GRADE[appGrade(a)]}</span>` : `<span class="muted">—</span>`}</td>
                  <td>${tag(APP_TONE[a.status], APP_STATE[a.status] || a.status)}</td>
                  <td>${esc(date(a.at))}</td>
                </tr>`
              )
              .join("")}</tbody></table>`
          : `<p class="muted chips-empty">None here.</p>`
        : empty("No applications yet")
      : c.roles.length
        ? `<table class="table is-labelled">
            <thead><tr><th>Role</th><th>Status</th><th class="num">Applications</th></tr></thead>
            <tbody>${c.roles
              .map(
                (r) => `<tr data-role="${esc(r.id)}" class="clickable">
                  <td>${who(r.title, [r.team, r.type, r.location].filter(Boolean).join(" · "))}</td>
                  <td>${tag(ROLE_TONE[r.status], ROLE_STATE[r.status] || r.status)}</td>
                  <td class="num">${r.applications}${r.waiting ? ` <small>${r.waiting} new</small>` : ""}</td>
                </tr>`
              )
              .join("")}</tbody></table>`
        : empty("No roles yet", `<button type="button" class="btn btn-primary" data-form="role">${icon("plus")}<span>New Role</span></button>`);
  return `${subTabs("careers", [["roles", "Roles", c.roles.filter((r) => r.status === "open").length || ""], ["applications", "Applications", waiting || ""], ["page", "Page"]])}
    ${state.sub === "applications" ? gradeChips : ""}
    <section class="card table-card">${body}</section>`;
}

// The Careers page around the roles, in the order the site shows it: the opening (heading, a
// few lines, a photo), the team, values, perks and a closing line. Lists grow and shrink in place
// (data-prows / data-prow); photos upload as they're picked and are named by their id.
function careersPageForm(pg) {
  const img = (name, id, label, cls = "") => `<div class="img-slot ${cls}" data-img-slot>
      <label class="img-slot-pick" aria-label="${label}">
        <input type="file" accept="image/jpeg,image/png,image/webp" hidden data-img-file>
        <input type="hidden" name="${name}" value="${esc(id || "")}">
        <span class="img-slot-preview">${id ? `<img src="/media/${esc(id)}" alt="">` : icon("image")}</span>
      </label>
      <button type="button" class="icon-btn img-slot-clear" data-img-clear aria-label="Remove ${label.toLowerCase()}" ${id ? "" : "hidden"}>${icon("close")}</button>
    </div>`;
  const remove = `<button type="button" class="icon-btn" data-prow-remove aria-label="Remove">${icon("close")}</button>`;
  const ROWS = {
    team: (x: any = {}) => `<div class="page-row page-row-person" data-prow>
        <input type="hidden" name="id" value="${esc(x.id || "")}">
        ${img("photo", x.photo, "Photo", "img-slot-round")}
        <div class="page-row-fields">
          <div class="form-row-2">
            <input name="name" value="${esc(x.name || "")}" maxlength="60" placeholder="Name" aria-label="Name">
            <input name="title" value="${esc(x.title || "")}" maxlength="80" placeholder="Role" aria-label="Role">
          </div>
          <input name="from" value="${esc(x.from || "")}" maxlength="100" placeholder="e.g. Previously a pastry chef" aria-label="Before">
          <textarea name="quote" rows="2" maxlength="400" placeholder="In their words" aria-label="Quote">${esc(x.quote || "")}</textarea>
        </div>
        ${remove}
      </div>`,
    values: (x: any = {}) => `<div class="page-row" data-prow>
        <div class="page-row-fields">
          <input name="title" value="${esc(x.title || "")}" maxlength="80" placeholder="Value" aria-label="Value">
          <textarea name="text" rows="2" maxlength="400" placeholder="What it means here" aria-label="What it means">${esc(x.text || "")}</textarea>
        </div>
        ${remove}
      </div>`,
    perks: (x: any = {}) => `<div class="page-row" data-prow>
        ${img("logo", x.logo, "Logo", "img-slot-logo")}
        <div class="page-row-fields">
          <input name="title" value="${esc(x.title || "")}" maxlength="60" placeholder="e.g. Free coffee" aria-label="Perk">
          <input name="detail" value="${esc(x.detail || "")}" maxlength="140" placeholder="e.g. A bag a week to take home" aria-label="Detail">
        </div>
        ${remove}
      </div>`,
  };
  const list = (key, title, add, items) => `<section class="card form-stack careers-page-card">
      <h2>${title}</h2>
      <label class="field"><span>Heading</span><input name="${key}Heading" value="${esc(pg[`${key}Heading`] || "")}" maxlength="120"></label>
      <div class="page-rows" data-prows="${key}">${items.map(ROWS[key]).join("")}</div>
      <button type="button" class="btn btn-sm" data-prow-add="${key}">${icon("plus")}<span>${add}</span></button>
      <template data-prow-template="${key}">${ROWS[key]()}</template>
    </section>`;
  return `<form class="careers-page-form" data-careers-page>
    <section class="card form-stack careers-page-card">
      <h2>Opening</h2>
      <label class="field"><span>Heading</span><input name="heading" value="${esc(pg.heading)}" maxlength="120" placeholder="Careers"></label>
      <label class="field"><span>About working here</span><textarea name="intro" rows="5" maxlength="2000">${esc(pg.intro)}</textarea></label>
      <div class="field"><span>Photo</span>${img("photo", pg.photo, "Photo", "img-slot-wide")}</div>
    </section>
    ${list("team", "Team", "Add Person", pg.team)}
    ${list("values", "Values", "Add Value", pg.values)}
    ${list("perks", "Perks", "Add Perk", pg.perks)}
    <section class="card form-stack careers-page-card">
      <h2>Closing</h2>
      <label class="field"><span>Heading</span><input name="closingHeading" value="${esc(pg.closingHeading)}" maxlength="120"></label>
      <label class="field"><span>Text</span><textarea name="closing" rows="3" maxlength="600">${esc(pg.closing)}</textarea></label>
    </section>
    <div class="btn-row"><button type="submit" class="btn btn-primary">Save</button><a class="btn" href="/careers" target="_blank" rel="noopener">${icon("ext")}<span>View on Site</span></a></div>
  </form>`;
}

// Careers → Page: saved as one. Each list row's named fields become one item.
document.addEventListener("submit", async (e) => {
  const f = (e.target as any).closest?.("[data-careers-page]");
  if (!f) return;
  e.preventDefault();
  const rows = (key) => $$(`[data-prows="${key}"] [data-prow]`, f).map((row) => Object.fromEntries($$("[name]", row).map((el) => [el.name, el.value])));
  const val = (name) => $(`:scope > section > .field > [name="${name}"]`, f).value;
  const body = {
    heading: val("heading"),
    intro: val("intro"),
    photo: $(":scope > section:first-child [data-img-slot] [name=photo]", f).value,
    teamHeading: val("teamHeading"),
    team: rows("team"),
    valuesHeading: val("valuesHeading"),
    values: rows("values"),
    perksHeading: val("perksHeading"),
    perks: rows("perks"),
    closingHeading: val("closingHeading"),
    closing: val("closing"),
  };
  const button = $("[type=submit]", f);
  button.disabled = true;
  try {
    state.careers = await api("/api/admin/careers/page", { method: "PATCH", body });
    toast("Saved");
    render();
  } catch (error) {
    button.disabled = false;
    toast(error.message, "error");
  }
});

// A Careers page photo: resized here, uploaded, and its id kept in the slot until Save.
document.addEventListener("change", async (e) => {
  const input = e.target as any;
  if (!input.matches?.("[data-img-file]")) return;
  const slot = input.closest("[data-img-slot]");
  const file = input.files?.[0];
  input.value = "";
  if (!file) return;
  slot.classList.add("is-loading");
  try {
    const { id } = await api("/api/admin/careers/image", { method: "POST", body: { dataUrl: await resizePhoto(file) } });
    $("input[type=hidden]", slot).value = id;
    $(".img-slot-preview", slot).innerHTML = `<img src="/media/${esc(id)}" alt="">`;
    $("[data-img-clear]", slot).hidden = false;
  } catch (error) {
    toast(error.message, "error");
  } finally {
    slot.classList.remove("is-loading");
  }
});

function careersClick(t) {
  const add = t.closest("[data-prow-add]");
  if (add) {
    const f = t.closest("[data-careers-page]");
    const rows = $(`[data-prows="${add.dataset.prowAdd}"]`, f);
    rows.insertAdjacentHTML("beforeend", $(`[data-prow-template="${add.dataset.prowAdd}"]`, f).innerHTML);
    $("input:not([type=hidden]):not([type=file]), textarea", rows.lastElementChild)?.focus();
    return true;
  }
  const rm = t.closest("[data-prow-remove]");
  if (rm) return rm.closest("[data-prow]").remove(), true;
  const clear = t.closest("[data-img-clear]");
  if (clear) {
    const slot = clear.closest("[data-img-slot]");
    $("input[type=hidden]", slot).value = "";
    $(".img-slot-preview", slot).innerHTML = icon("image");
    clear.hidden = true;
    return true;
  }
  const roleRow = t.closest("[data-role]");
  if (roleRow) return roleForm(state.careers.roles.find((r) => r.id === roleRow.dataset.role)), true;
  const appRow = t.closest("[data-application]");
  if (appRow) return applicationPanel(state.careers.applications.find((a) => a.id === appRow.dataset.application)), true;
  return false;
}

// A role: what the site shows (title, team, type, where, pay, summary, description) and whether
// it's a draft, open (on the site and Google's job search) or closed.
function roleForm(role = null) {
  const r = role || { type: "Full-time", status: "draft" };
  const field = (name, label, attrs = "") => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(r[name] ?? "")}" ${attrs}></label>`;
  editingNext = role ? `role:${role.id}` : null;
  const drawer = openPanel(role ? role.title : "New Role", `
    <form class="panel form-stack" data-role-form>
      ${field("title", "Title", 'required maxlength="100" placeholder="e.g. Barista"')}
      <div class="form-row-2">
        ${field("team", "Team", 'maxlength="60" placeholder="e.g. Café"')}
        <label class="field"><span>Type</span><select name="type">${state.careers.types.map((x) => `<option ${x === r.type ? "selected" : ""}>${x}</option>`).join("")}</select></label>
      </div>
      <div class="form-row-2">
        ${field("location", "Where", 'maxlength="100" placeholder="e.g. Los Angeles, CA"')}
        ${field("pay", "Pay", 'maxlength="80" placeholder="e.g. $20–24 an hour plus tips"')}
      </div>
      ${field("summary", "Summary", 'maxlength="280" placeholder="One line for the list of roles"')}
      <div class="field"><span id="role-body-label">Description</span>${richEditor(r.bodyHtml || "", "role-body-label")}</div>
      ${state.careers.page.team.length ? `<fieldset class="field"><legend>Works With</legend>
        <div class="check-grid">${state.careers.page.team.map((p) => `<label class="checkbox"><input type="checkbox" name="workWith" value="${esc(p.id)}" ${(r.workWith || []).includes(p.id) ? "checked" : ""}><span>${esc(p.name)}</span></label>`).join("")}</div>
      </fieldset>` : ""}
      <fieldset class="field"><legend>Status</legend>
        <div class="segmented">${Object.entries(ROLE_STATE).map(([v, l]) => `<label><input type="radio" name="status" value="${v}" ${r.status === v ? "checked" : ""}><span>${l}</span></label>`).join("")}</div>
      </fieldset>
      <div class="btn-row">
        <button type="submit" class="btn btn-primary">${role ? "Save" : "Add Role"}</button>
        ${role?.status === "open" ? `<a class="btn" href="/careers/${encodeURIComponent(role.id)}" target="_blank" rel="noopener">${icon("ext")}<span>View on Site</span></a>` : ""}
        ${role && !role.applications ? `<button type="button" class="btn btn-ghost btn-danger" data-role-delete>Delete</button>` : ""}
      </div>
    </form>`, { page: "Careers" });
  const form = $("[data-role-form]", drawer);
  mountRichEditor(form);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const body: any = Object.fromEntries(["title", "team", "type", "location", "pay", "summary"].map((k) => [k, form[k].value]));
    body.body = richToMarks($("[data-rte]", form));
    body.status = form.status.value;
    body.workWith = $$("[name=workWith]:checked", form).map((x) => x.value);
    const button = $("[type=submit]", form);
    button.disabled = true;
    try {
      const res = await api(role ? `/api/admin/careers/roles/${role.id}` : "/api/admin/careers/roles", { method: role ? "PATCH" : "POST", body });
      state.careers = res;
      toast(res.role.status === "open" ? "Saved. It's on the site." : "Saved");
      closeDrawer();
      render();
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  });
  $("[data-role-delete]", drawer)?.addEventListener("click", async () => {
    if (!confirm(`Delete ${role.title}?`)) return;
    try {
      state.careers = await api(`/api/admin/careers/roles/${role.id}`, { method: "DELETE" });
      closeDrawer();
      render();
    } catch (error) {
      panelError(error.message);
    }
  });
}

// An application: who, their links, CV and note; where it's at, and the team's notes.
function applicationPanel(a) {
  if (!a) return;
  editingNext = `application:${a.id}`;
  const drawer = openPanel(a.name, `
    <div class="order-cols">
      <div class="order-main">
        <section class="panel">
          <h3 class="panel-title">${esc(a.roleTitle)}</h3>
          ${a.note ? `<p class="app-note">${esc(a.note).replace(/\n/g, "<br>")}</p>` : `<p class="muted">No note.</p>`}
          <div class="btn-row">
            ${a.cv ? `<a class="btn" href="/api/admin/careers/cv/${esc(a.cv.id)}">${icon("download")}<span>Download CV</span></a>` : ""}
            ${a.links.map((l) => `<a class="btn" href="${esc(l)}" target="_blank" rel="noopener noreferrer">${icon("ext")}<span>${esc(hostOf(l))}</span></a>`).join("")}
          </div>
        </section>
        <section class="panel app-read" data-app-read>
          <div class="panel-head">
            <h3 class="panel-title">${a.ai ? `Assistant's Grade: <span class="app-grade g-${a.ai.grade}"><i></i>${APP_GRADE[a.ai.grade]}</span>` : "Assistant's Grade"}</h3>
            <button type="button" class="btn btn-sm" data-app-regrade>${icon("sparkles")}<span>${a.ai ? "Grade Again" : "Grade Now"}</span></button>
          </div>
          ${
            a.ai
              ? `<p>${esc(a.ai.summary)}</p>
                ${a.ai.strengths.length ? `<h4>Strengths</h4><ul>${a.ai.strengths.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
                ${a.ai.concerns.length ? `<h4>Concerns</h4><ul>${a.ai.concerns.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
                ${a.grade && a.grade !== a.ai.grade ? `<p class="muted">You graded it ${APP_GRADE[a.grade]}.</p>` : ""}`
              : `<p class="muted">Not graded yet.</p>`
          }
        </section>
      </div>
      <div class="order-side">
        <section class="panel">
          <h3 class="panel-title">Contact</h3>
          <dl class="kv">
            <div><dt>Email</dt><dd><a class="link" href="mailto:${esc(a.email)}?subject=${encodeURIComponent(a.roleTitle)}">${esc(a.email)}</a></dd></div>
            ${a.phone ? `<div><dt>Phone</dt><dd><a class="link" href="tel:${esc(a.phone)}">${esc(a.phone)}</a></dd></div>` : ""}
            <div><dt>Applied</dt><dd>${esc(date(a.at))}</dd></div>
          </dl>
        </section>
        <form class="panel form-stack" data-app-form>
          <fieldset class="field"><legend>Grade</legend>
            <div class="segmented app-grades">${state.careers.grades.map((g) => `<label><input type="radio" name="grade" value="${g}" ${appGrade(a) === g ? "checked" : ""}><span>${APP_GRADE[g]}</span></label>`).join("")}</div>
          </fieldset>
          <label class="field"><span>Status</span><select name="status">${state.careers.statuses.map((s) => `<option value="${s}" ${a.status === s ? "selected" : ""}>${APP_STATE[s] || s}</option>`).join("")}</select></label>
          <label class="field"><span>Notes</span><textarea name="notes" rows="4" placeholder="Interview notes, references…">${esc(a.notes || "")}</textarea></label>
          <div class="btn-row"><button type="submit" class="btn btn-primary">Save</button><button type="button" class="btn btn-ghost btn-danger" data-app-delete>Delete</button></div>
        </form>
      </div>
    </div>`, { page: "Careers", subtitle: a.roleTitle });
  const form = $("[data-app-form]", drawer);
  // A grade is saved the moment it's picked, so going through a list is one tap each.
  form.addEventListener("change", async (e) => {
    if ((e.target as any).name !== "grade") return;
    try {
      state.careers = await api(`/api/admin/careers/applications/${a.id}`, { method: "PATCH", body: { grade: form.grade.value } });
      toast(`Graded ${APP_GRADE[form.grade.value]}`);
      render();
      applicationPanel(state.careers.applications.find((x) => x.id === a.id));
    } catch (error) {
      panelError(error.message);
    }
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    try {
      state.careers = await api(`/api/admin/careers/applications/${a.id}`, { method: "PATCH", body: { status: form.status.value, notes: form.notes.value, grade: form.grade.value } });
      toast("Saved");
      render();
    } catch (error) {
      panelError(error.message);
    }
  });
  $("[data-app-regrade]", drawer).addEventListener("click", async (e) => {
    const button = (e.currentTarget as any);
    button.disabled = true;
    try {
      state.careers = await api(`/api/admin/careers/applications/${a.id}/grade`, { method: "POST" });
      render();
      applicationPanel(state.careers.applications.find((x) => x.id === a.id));
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  });
  $("[data-app-delete]", drawer).addEventListener("click", async () => {
    if (!confirm(`Delete ${a.name}'s application and CV?`)) return;
    try {
      state.careers = await api(`/api/admin/careers/applications/${a.id}`, { method: "DELETE" });
      closeDrawer();
      render();
    } catch (error) {
      panelError(error.message);
    }
  });
}

function salesTaxView() {
  const t = state.tax;
  const pct = (r) => (r == null ? "" : String(Math.round(r * 100000) / 1000));
  const whole = (n) => `${state.shop.currency}${Math.round(n).toLocaleString("en-US")}`;
  const ordersOf = (st) => Math.max(st.thisYear.orders, st.lastYear.orders);
  const salesOf = (st) => Math.max(st.thisYear.sales, st.lastYear.sales);
  const level = (st) => (st.collecting || st.noTax ? "" : st.progress >= 1 ? "is-passed" : st.progress >= 0.8 ? "is-close" : "");
  const badge = (st) =>
    st.home ? `<span class="badge sub-active"><i></i>Home state</span>`
      : st.collecting ? `<span class="badge sub-active"><i></i>Collecting</span>`
      : st.noTax ? `<span class="badge">No sales tax</span>`
      : st.progress >= 1 ? `<span class="badge p-unpaid"><i></i>Passed</span>`
      : st.progress >= 0.8 ? `<span class="badge t-yellow"><i></i>Close</span>`
      : "";
  // "$532 of $100,000 · 13 of 200 orders", against whichever year is further along.
  const progressLine = (st) => {
    const th = st.threshold;
    if (!th) return `<span class="muted">Nothing to collect here</span>`;
    const orders = th.orders ? ` ${th.both ? "and" : "·"} ${ordersOf(st)} of ${th.orders} orders` : "";
    return `${whole(salesOf(st))} of ${whole(th.dollars)}${orders}`;
  };
  const meter = (st) =>
    st.noTax ? "" : `<span class="tax-meter ${level(st)}" role="img" aria-label="${Math.round(st.progress * 100)}% of the threshold"><span style="width:${Math.max(1.5, Math.min(100, st.progress * 100))}%"></span></span><span class="tax-pct">${Math.min(999, Math.round(st.progress * 100))}%</span>`;
  const rates = (st) => (st.rate != null ? `${pct(st.rate)}%${st.groceryRate != null ? ` · Coffee ${pct(st.groceryRate)}%` : ""}` : "Rates from OpenSalesTax");
  const side = (st) =>
    st.home || st.noTax ? ""
      : st.collecting ? `<span class="tax-rates">${rates(st)}</span><button type="button" class="btn btn-sm" data-tax-edit="${st.code}">Edit</button>`
      : `<button type="button" class="btn btn-sm${st.progress >= 1 ? " btn-primary" : ""}" data-tax-edit="${st.code}">Start Collecting</button>`;
  // The form under a row: rates (when there's no rate lookup) and, to start, a tick that you've registered.
  const form = (st) => {
    if (state.taxEdit !== st.code) return "";
    const rateFields = t.lookup
      ? ""
      : `<div class="tax-fields">
          <label class="field"><span>Sales tax rate</span><span class="tax-input"><input inputmode="decimal" data-tax-rate value="${pct(st.rate)}" placeholder="6.25" required><i>%</i></span></label>
          <label class="field"><span>Rate on coffee beans</span><span class="tax-input"><input inputmode="decimal" data-tax-grocery value="${pct(st.groceryRate)}" placeholder="0"><i>%</i></span></label>
        </div>`;
    return `<div class="tax-form" data-tax-form="${st.code}">
      ${rateFields}
      ${st.collecting ? "" : `<label class="checkbox"><input type="checkbox" data-tax-registered> I've registered for a sales tax permit with ${esc(st.name)}</label>`}
      <p class="form-error" data-tax-error role="alert"></p>
      <div class="tax-form-actions">
        ${st.collecting
          ? `${t.lookup ? "" : `<button type="button" class="btn btn-primary" data-tax-save>Save Rates</button>`}<button type="button" class="btn btn-danger-ghost" data-tax-stop>Stop Collecting</button>`
          : `<button type="button" class="btn btn-primary" data-tax-start>Start Collecting</button>`}
        <button type="button" class="btn btn-ghost" data-tax-edit="">Cancel</button>
      </div>
    </div>`;
  };
  const row = (st) => `
    <div class="tax-row${state.taxEdit === st.code ? " is-open" : ""}" data-tax-state="${st.code}">
      <div class="tax-name"><strong>${esc(st.name)}</strong>${badge(st)}</div>
      <div class="tax-progress">
        <span class="tax-line">${progressLine(st)}</span>
        <span class="tax-bar">${meter(st)}</span>
      </div>
      <div class="tax-side">${side(st)}</div>
      ${form(st)}
    </div>`;
  const group = (title, list) =>
    list.length ? `<section class="card tax-card"><header class="card-head"><div><h2>${title}</h2></div></header>${list.map(row).join("")}</section>` : "";
  const byProgress = (a, b) => b.home - a.home || b.progress - a.progress || a.name.localeCompare(b.name);

  const collecting = t.states.filter((st) => st.collecting).sort(byProgress);
  const taxed = t.states.filter((st) => !st.noTax && !st.collecting);
  const due = taxed.filter((st) => st.progress >= 1).sort(byProgress);
  const outside = t.states.filter((st) => !st.home).reduce((n, st) => ({ sales: n.sales + st.thisYear.sales, orders: n.orders + st.thisYear.orders }), { sales: 0, orders: 0 });
  const closest = [...taxed].sort(byProgress)[0];
  const home = t.states.find((st) => st.home);
  const kpi = (label, value, foot) => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-foot">${foot}</p></div>`;
  const kpis = `<section class="kpis tax-kpis">
    ${kpi("Collecting In", `${collecting.length} ${collecting.length === 1 ? "state" : "states"}`, esc(collecting.map((st) => st.name).join(", ")))}
    ${kpi(`Sales Outside ${esc(home?.name || "Home")}`, whole(outside.sales), `${outside.orders} ${outside.orders === 1 ? "order" : "orders"} in ${t.year}`)}
    ${kpi("Closest Threshold", closest ? `${Math.round(closest.progress * 100)}%` : "—", closest ? `${esc(closest.name)} · ${progressLine(closest)}` : "No sales elsewhere yet")}
  </section>`;
  const alert = due.length
    ? `<p class="notice notice-warn">${icon("salesTax")}<span><strong>${due.map((st) => esc(st.name)).join(", ")} ${due.length === 1 ? "has" : "have"} passed the threshold.</strong> Register with ${due.length === 1 ? "the state" : "each state"}, then start collecting below.</span></p>`
    : "";

  let body;
  if (state.sub === "all") {
    const q = state.query.trim().toLowerCase();
    const match = (st) => !q || st.name.toLowerCase().includes(q) || st.code.toLowerCase() === q;
    const list = t.states.filter((st) => !st.noTax && match(st)).sort(byProgress);
    const none = t.states.filter((st) => st.noTax);
    body = list.length
      ? group("All States", list)
      : `<div class="empty empty-lg">${icon("search", "i i-xl")}<p><strong>No state matches that search</strong></p></div>`;
    if (!q) body += `<p class="table-foot muted">No sales tax: ${none.map((st) => esc(st.name)).join(", ")}.</p>`;
  } else {
    const watch = taxed.filter((st) => st.thisYear.orders || st.lastYear.orders).sort(byProgress);
    body = `${group("Collecting", collecting)}
      ${group("Watching", watch)}
      ${watch.length ? "" : `<p class="table-foot muted">No sales outside ${esc(home?.name || "your home state")} yet.</p>`}`;
  }
  return `
    ${kpis}
    ${alert}
    ${subTabs("salestax", [["active", "Your States", collecting.length + taxed.filter((st) => st.thisYear.orders || st.lastYear.orders).length], ["all", "All States", t.states.filter((st) => !st.noTax).length]])}
    ${body}
    <p class="table-foot muted">Thresholds use this year or last, whichever is higher. Check with each state.</p>`;
}

async function salesTaxClick(t) {
  const edit = t.closest("[data-tax-edit]");
  if (edit) {
    state.taxEdit = edit.dataset.taxEdit || null;
    render();
    $(`[data-tax-form] input`)?.focus();
    return true;
  }
  const b = t.closest("[data-tax-start], [data-tax-save], [data-tax-stop]");
  if (!b) return false;
  const box = b.closest("[data-tax-form]");
  const st = state.tax.states.find((x) => x.code === box.dataset.taxForm);
  const error = $("[data-tax-error]", box);
  const rate = $("[data-tax-rate]", box);
  const grocery = $("[data-tax-grocery]", box);
  const body: any = {};
  if (b.matches("[data-tax-stop]")) body.collecting = false;
  else {
    if (rate && !(Number(rate.value.replace(/[^0-9.]/g, "")) > 0)) {
      error.textContent = `Enter ${st.name}'s sales tax rate.`;
      return rate.focus(), true;
    }
    if (b.matches("[data-tax-start]")) {
      if (!$("[data-tax-registered]", box).checked) {
        error.textContent = `Confirm you've registered with ${st.name} first.`;
        return true;
      }
      body.collecting = true;
    }
    if (rate) body.rate = rate.value.replace(/[^0-9.]/g, "");
    if (grocery) body.groceryRate = grocery.value.replace(/[^0-9.]/g, "") || "0";
  }
  b.disabled = true;
  try {
    state.tax = await api(`/api/admin/sales-tax/${st.code}`, { method: "PATCH", body });
    state.taxEdit = null;
    toast(body.collecting === true ? `Collecting ${st.name} sales tax from now on.` : body.collecting === false ? `Stopped collecting ${st.name} sales tax.` : `${st.name} rates saved.`);
    render();
  } catch (err) {
    b.disabled = false;
    error.textContent = err.message;
  }
  return true;
}

/* ── Ambassadors: applications from /ambassadors, approved creators with their codes and sales ── */

// Each application shows its Instagram check: an estimate of how genuine the audience is, with
// the reasons (like an order's risk), and Check Again.
function ambassadorsView() {
  const a = state.amb;
  const c = a.config;
  const waiting = a.people.filter((p) => p.status === "applied");
  const declined = a.people.filter((p) => p.status === "declined");
  const team = a.people.filter((p) => p.status === "approved" || p.status === "paused");
  const sum = (k) => team.reduce((n, p) => n + (p.stats?.[k] || 0), 0);
  const day = (iso) => (iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—");
  const accounts = (p) =>
    [
      p.instagram && `<a href="https://instagram.com/${encodeURIComponent(p.instagram)}" target="_blank" rel="noopener">Instagram @${esc(p.instagram)}</a>`,
      p.tiktok && `<a href="https://www.tiktok.com/@${encodeURIComponent(p.tiktok)}" target="_blank" rel="noopener">TikTok @${esc(p.tiktok)}</a>`,
      p.youtube && `<a href="${/^https?:\/\//.test(p.youtube) ? esc(p.youtube) : `https://www.youtube.com/@${encodeURIComponent(p.youtube.replace(/^@/, ""))}`}" target="_blank" rel="noopener">YouTube</a>`,
    ]
      .filter(Boolean)
      .join(" · ");
  const kpi = (label, value, foot) => `<div class="kpi"><p class="kpi-label">${label}</p><p class="kpi-value">${value}</p><p class="kpi-foot">${foot}</p></div>`;
  const kpis = `<section class="kpis">
    ${kpi("Ambassadors", team.filter((p) => p.status === "approved").length, team.some((p) => p.status === "paused") ? `${team.filter((p) => p.status === "paused").length} paused` : "0 paused")}
    ${kpi("Applications", waiting.length, `${declined.length} declined`)}
    ${kpi("Sales With Codes", money(sum("sales")), `${sum("orders")} orders`)}
    ${kpi("Commission Owed", money(sum("unpaid")), `${money(sum("commission"))} earned in all`)}
  </section>`;
  const closed = !c.open ? `<p class="notice">${icon("ambassadors")}<span>Applications are closed and hidden from the website menu. Open them in <a class="link" href="#ambassadors/settings">Settings</a>.</span></p>` : "";
  let body = "";
  if (state.sub === "applications") {
    body = waiting.length
      ? `<section class="card amb-list">${waiting
          .map(
            (p) => `<article class="amb-app" data-amb="${esc(p.id)}">
              <div class="amb-app-head">
                <div><button type="button" class="amb-name" data-amb-open="${esc(p.id)}">${esc(p.name)}</button><small class="muted">${esc(p.email)} · ${esc(p.city || "No city")} · Applied ${day(p.appliedAt)}</small></div>
                <div class="amb-app-actions"><button type="button" class="btn btn-sm btn-ghost" data-amb-status="declined">Decline</button><button type="button" class="btn btn-sm btn-primary" data-amb-approve ${c.discount > 0 ? "" : "disabled title=\"Set the follower discount in Settings first\""}>Approve</button></div>
              </div>
              <p class="amb-accounts">${accounts(p) || '<span class="muted">No accounts</span>'}${p.followers ? ` <span class="muted">· ${esc(p.followers)} followers</span>` : ""}</p>
              <p class="amb-agreed muted">${p.agreed ? `${p.agreed.adult ? "18 or older · " : ""}Agreed to the terms ${day(p.agreed.at)}` : "Applied before terms were added"}</p>
              ${p.why ? `<p class="amb-why">${esc(p.why)}</p>` : ""}
              ${igCheck(p, a.instagram)}
            </article>`
          )
          .join("")}</section>`
      : `<div class="empty empty-lg">${icon("ambassadors", "i i-xl")}<p><strong>No applications waiting</strong></p></div>`;
    if (declined.length) body += `<p class="table-foot muted">${declined.length} declined: ${declined.map((p) => esc(p.name)).join(", ")}.</p>`;
  } else if (state.sub === "ambassadors") {
    body = team.length
      ? `<section class="card table-card"><table class="table amb-table is-labelled">
          <thead><tr><th>Ambassador</th><th>Code</th><th class="num">Orders</th><th class="num">Sales</th><th class="num">Owed</th><th>Status</th><th></th></tr></thead>
          <tbody>${team
            .map(
              (p) => `<tr data-amb="${esc(p.id)}" class="clickable">
                <td><strong>${esc(p.name)}</strong><small class="muted">${accounts(p) || esc(p.email)}</small></td>
                <td><span class="amb-code">${esc(p.code || "—")}</span></td>
                <td class="num">${p.stats.orders}<small class="muted">${p.stats.last ? `Last ${day(p.stats.last)}` : "None yet"}</small></td>
                <td class="num">${money(p.stats.sales)}</td>
                <td class="num">${money(p.stats.unpaid)}<small class="muted">${p.commission ?? c.commission}% · ${p.paidThrough ? `Paid to ${day(p.paidThrough)}` : "Never paid"}</small></td>
                <td>${p.status === "approved" ? `<span class="badge sub-active"><i></i>Active</span>` : `<span class="badge sub-paused"><i></i>Paused</span>`}</td>
                <td class="amb-row-actions">${p.stats.unpaid > 0 ? `<button type="button" class="btn btn-sm" data-amb-paid>Mark Paid</button>` : ""}${p.status === "approved" ? `<button type="button" class="btn btn-sm btn-ghost" data-amb-status="paused">Pause</button>` : `<button type="button" class="btn btn-sm" data-amb-approve>Resume</button>`}</td>
              </tr>`
            )
            .join("")}</tbody>
        </table></section>`
      : `<div class="empty empty-lg">${icon("ambassadors", "i i-xl")}<p><strong>No ambassadors yet</strong></p></div>`;
  } else {
    body = `<div class="grid-2 amb-settings">
      <section class="card">
        <header class="card-head"><div><h2>The Offer</h2></div></header>
        <form class="form-stack amb-config" data-amb-config>
          <label class="checkbox"><input type="checkbox" name="open" ${c.open ? "checked" : ""}><span>Take applications</span></label>
          <div class="tax-fields">
            <label class="field"><span>Follower discount</span><span class="tax-input"><input name="discount" inputmode="decimal" value="${c.discount || ""}" placeholder="10"><i>%</i></span><small class="muted">For new codes. Existing codes keep theirs.</small></label>
            <label class="field"><span>Commission</span><span class="tax-input"><input name="commission" inputmode="decimal" value="${c.commission || ""}" placeholder="0"><i>%</i></span></label>
          </div>
          <label class="field"><span>Perks</span><textarea name="perks" rows="3" placeholder="e.g. A bag of each new release, invites to cuppings">${esc(c.perks || "")}</textarea></label>
          <p class="form-error" data-amb-error role="alert"></p>
          <button type="submit" class="btn btn-primary">Save</button>
        </form>
      </section>
      <section class="card">
        <header class="card-head"><div><h2>Instagram Check</h2></div><span class="badge ${a.instagram.connected ? "s-completed" : ""}"><i></i>${a.instagram.connected ? "Connected" : "Not connected"}</span></header>
        <form class="form-stack amb-config" data-amb-auto>
          ${a.instagram.connected && !a.instagram.anyapi ? `<p class="muted">Personal accounts aren't checked.</p>` : ""}
          <label class="checkbox"><input type="checkbox" name="autoDecide" ${c.autoDecide ? "checked" : ""} ${a.instagram.connected ? "" : "disabled"}><span>Auto-approve 95%+, auto-decline under 60%</span></label>
        </form>
      </section>
    </div>`;
  }
  return `${kpis}${closed}
    ${subTabs("ambassadors", [["applications", "Applications", waiting.length], ["ambassadors", "Ambassadors", team.length], ["settings", "Settings"]])}
    ${body}`;
}

// An application's Instagram check, like an order's risk: Genuine, Review or Suspect, the score,
// followers and engagement, and why.
function igCheck(p, ig) {
  const k = p.check;
  const head = `<div class="amb-check-head"><h3>Instagram check</h3>${p.instagram ? `<button type="button" class="btn btn-sm btn-ghost" data-amb-check>${k ? "Check Again" : "Check"}</button>` : ""}</div>`;
  if (!k || k.error)
    return `<section class="amb-check">${head}<p class="muted">${esc(k?.error || (ig.connected ? "Not checked yet." : "Instagram isn't connected yet."))}</p></section>`;
  const levels = [["genuine", "Genuine"], ["review", "Review"], ["suspect", "Suspect"]];
  const tone = { genuine: "low", review: "medium", suspect: "high" }[k.level];
  const n = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e4 ? `${Math.round(x / 1e3)}K` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : String(x));
  return `<section class="amb-check">
    ${head}
    <p class="amb-check-score"><strong>${k.score}%</strong> genuine audience, estimated · <a class="link amb-handle" href="https://www.instagram.com/${esc(k.username)}/" target="_blank" rel="noopener">@${esc(k.username)}</a></p>
    <div class="risk-meter is-${tone}" role="img" aria-label="${k.level}">${levels.map(([l, label]) => `<span class="${l === k.level ? "is-on" : ""}"><i></i>${label}</span>`).join("")}</div>
    <p class="amb-check-nums muted">${n(k.followers)} followers${k.engagement != null ? ` · ${(k.engagement * 100).toFixed(1)}% engagement (usual ${+(k.normal[0] * 100).toFixed(1)}–${+(k.normal[1] * 100).toFixed(1)}%)` : ""} · Checked ${day(k.at)}</p>
    <ul class="risk-reasons">${k.reasons.map((r) => `<li class="is-${r.tone}">${esc(r.text)}</li>`).join("")}</ul>
  </section>`;
}

// A creator's account, as a full page like a customer's: who they are on Instagram (photo, bio,
// followers, the check), their code, what it's sold and what they're owed, the orders, and what
// they told us when they applied.
async function creatorPanel(id) {
  let data;
  try {
    data = await api(`/api/admin/ambassadors/${id}`);
  } catch (error) {
    return toast(error.message);
  }
  const p = data.person;
  const k = p.check && !p.check.error ? p.check : null;
  const c = data.config;
  const STATUS = { applied: ["t-yellow", "Applied"], approved: ["sub-active", "Active"], paused: ["sub-paused", "Paused"], declined: ["sub-cancelled", "Declined"] };
  const [badgeClass, badgeLabel] = STATUS[p.status] || STATUS.applied;
  const n = (x) => (x >= 1e6 ? `${(x / 1e6).toFixed(1)}M` : x >= 1e4 ? `${Math.round(x / 1e3)}K` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : String(x ?? "—"));
  const initials = p.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  const handles = [p.instagram && ["Instagram", `https://www.instagram.com/${p.instagram}/`, `@${p.instagram}`], p.tiktok && ["TikTok", `https://www.tiktok.com/@${p.tiktok}`, `@${p.tiktok}`], p.youtube && ["YouTube", /^https?:/.test(p.youtube) ? p.youtube : `https://www.youtube.com/${p.youtube}`, p.youtube]].filter(Boolean);
  const actions = `
    ${p.status === "approved" ? `<button type="button" class="btn" data-creator-act="paused">Pause</button>` : `<button type="button" class="btn btn-primary" data-creator-act="approve" ${c.discount > 0 ? "" : "disabled"}>${p.status === "paused" ? "Resume" : "Approve"}</button>`}
    <details class="order-menu">
      <summary class="btn">More actions${icon("ChevronDown")}</summary>
      <div class="order-menu-list">
        <a href="mailto:${esc(p.email)}">${icon("signups")}<span>Email ${esc(p.name.split(" ")[0])}</span></a>
        ${p.instagram ? `<button type="button" data-creator-act="check">${icon("synced")}<span>Check Instagram Again</span></button>` : ""}
        ${p.stats.unpaid > 0 ? `<button type="button" data-creator-act="paid">${icon("Check")}<span>Mark ${money(p.stats.unpaid)} Paid</span></button>` : ""}
        ${p.status !== "declined" && p.status !== "approved" ? `<button type="button" class="is-danger" data-creator-act="declined">${icon("close")}<span>Decline</span></button>` : ""}
      </div>
    </details>`;
  const drawer = openPanel(p.name, `
    <div class="order-cols">
    <div class="order-main">
      <section class="panel creator-card">
        <div class="creator-id">
          ${k?.avatar ? `<img class="creator-avatar" src="${esc(k.avatar)}" alt="" referrerpolicy="no-referrer" onerror="this.replaceWith(Object.assign(document.createElement('span'),{className:'creator-avatar',textContent:'${initials}'}))">` : `<span class="creator-avatar">${initials}</span>`}
          <div>
            <strong>${esc(k?.name || p.name)}</strong>
            ${p.instagram ? `<a class="link amb-handle" href="https://www.instagram.com/${esc(p.instagram)}/" target="_blank" rel="noopener">@${esc(p.instagram)}</a>` : `<span class="muted">No Instagram</span>`}
          </div>
        </div>
        ${k?.bio ? `<p class="creator-bio">${esc(k.bio)}</p>` : ""}
        <div class="cust-kpis creator-kpis">
          <div><small>Followers</small><strong>${k ? n(k.followers) : "—"}</strong></div>
          <div><small>Engagement</small><strong>${k?.engagement != null ? `${(k.engagement * 100).toFixed(1)}%` : "—"}</strong></div>
          <div><small>Genuine audience</small><strong>${k ? `${k.score}%` : "—"}</strong></div>
          <div><small>Posts</small><strong>${k ? n(k.posts) : "—"}</strong></div>
        </div>
      </section>

      <div class="panel creator-check">${igCheck(p, data.instagram)}</div>

      <section class="panel cust-kpis">
        <div><small>Code</small><strong class="amb-code">${esc(p.code || "—")}</strong></div>
        <div><small>Orders</small><strong>${p.stats.orders}</strong></div>
        <div><small>Sales</small><strong>${money(p.stats.sales)}</strong></div>
        <div><small>Owed</small><strong>${money(p.stats.unpaid)}</strong></div>
      </section>

      <section class="panel">
        <h3 class="panel-title">Orders with their code</h3>
        ${
          data.orders.length
            ? `<div class="list">${data.orders.map((o) => `<a class="list-row" href="#orders/${o.status}" data-open-order="${esc(o.number)}"><span class="list-main"><strong>${esc(o.number)}</strong><small>${esc(o.name)} · ${esc(date(o.placedAt))} · ${o.items} item${o.items === 1 ? "" : "s"}</small></span><span class="list-side">${statusBadge(o.status)}<strong class="num">${money(o.total)}</strong></span></a>`).join("")}</div>`
            : `<p class="muted">${p.code ? "None yet." : "No code yet."}</p>`
        }
      </section>
    </div>
    <div class="order-side">
      <section class="panel">
        <h3 class="panel-title">Creator</h3>
        <dl class="kv">
          <div><dt>Email</dt><dd><a class="link" href="mailto:${esc(p.email)}">${esc(p.email)}</a></dd></div>
          ${p.city ? `<div><dt>City</dt><dd>${esc(p.city)}</dd></div>` : ""}
          ${handles.map(([label, href, text]) => `<div><dt>${label}</dt><dd><a class="link amb-handle" href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a></dd></div>`).join("")}
          ${p.followers ? `<div><dt>They said</dt><dd>${esc(p.followers)} followers</dd></div>` : ""}
          <div><dt>Applied</dt><dd>${esc(dayShort(p.appliedAt))}</dd></div>
          ${p.approvedAt ? `<div><dt>Approved</dt><dd>${esc(dayShort(p.approvedAt))}</dd></div>` : ""}
          <div><dt>Commission</dt><dd>${p.commission ?? c.commission}%${p.paidThrough ? ` · paid to ${esc(dayShort(p.paidThrough))}` : ""}</dd></div>
          <div><dt>Terms</dt><dd>${p.agreed ? `Agreed ${esc(dayShort(p.agreed.at))}${p.agreed.adult ? " · 18+" : ""}` : "Before terms were added"}</dd></div>
        </dl>
      </section>
      ${p.why ? `<section class="panel"><h3 class="panel-title">Why they applied</h3><p class="creator-why">${esc(p.why)}</p></section>` : ""}
    </div>
    </div>`, { page: "Ambassadors", actions, badges: `<span class="badge ${badgeClass}"><i></i>${badgeLabel}</span>`, subtitle: `${p.instagram ? `@${p.instagram} · ` : ""}Applied ${dayShort(p.appliedAt)}` });

  drawer.onclick = async (e) => {
    $$("details.order-menu[open]", drawer).forEach((d) => (!d.contains(e.target) || e.target.closest(".order-menu-list button, .order-menu-list a")) && d.removeAttribute("open"));
    if (e.target.closest("[data-close]")) return closeDrawer();
    const order = e.target.closest("[data-open-order]");
    if (order) {
      e.preventDefault();
      state.open = order.dataset.openOrder;
      go(order.getAttribute("href"));
      return;
    }
    const b = e.target.closest("[data-creator-act], [data-amb-check]");
    if (!b) return;
    const act = b.dataset.creatorAct || "check";
    if (act === "declined" && !confirm(`Decline ${p.name}?`)) return;
    if (act === "paid" && !confirm(`Mark ${money(p.stats.unpaid)} paid to ${p.name}?`)) return;
    b.disabled = true;
    try {
      state.amb =
        act === "approve" ? await api(`/api/admin/ambassadors/${id}/approve`, { method: "POST", body: {} })
        : act === "check" ? await api(`/api/admin/ambassadors/${id}/check`, { method: "POST", body: {} })
        : await api(`/api/admin/ambassadors/${id}`, { method: "PATCH", body: act === "paid" ? { paidThrough: true } : { status: act } });
      toast({ approve: p.status === "paused" ? "Their code is on again." : "Approved. They've been emailed their code.", check: "Checked again.", paid: "Marked paid.", paused: "Paused. Their code no longer works.", declined: "Declined." }[act]);
      render();
      creatorPanel(id);
    } catch (error) {
      b.disabled = false;
      panelError(error.message);
    }
  };
}

async function ambassadorsClick(t) {
  // The creator's page: their name in an application, or their row (not its buttons).
  const opener = t.closest("[data-amb-open]") || (!t.closest("button, a") && t.closest("tr[data-amb]"));
  if (opener) {
    creatorPanel(opener.dataset.ambOpen || opener.dataset.amb);
    return true;
  }
  const checkBtn = t.closest("[data-amb-check]");
  if (checkBtn) {
    const id = checkBtn.closest("[data-amb]").dataset.amb;
    checkBtn.disabled = true;
    checkBtn.textContent = "Checking…";
    try {
      state.amb = await api(`/api/admin/ambassadors/${id}/check`, { method: "POST", body: {} });
      render();
    } catch (error) {
      checkBtn.disabled = false;
      checkBtn.textContent = "Check Again";
      toast(error.message, "error");
    }
    return true;
  }
  const row = t.closest("[data-amb]");
  const approve = t.closest("[data-amb-approve]");
  const status = t.closest("[data-amb-status]");
  const paid = t.closest("[data-amb-paid]");
  if (!row || !(approve || status || paid)) return false;
  const b = approve || status || paid;
  const p = state.amb.people.find((x) => x.id === row.dataset.amb);
  if (status?.dataset.ambStatus === "declined" && !confirm(`Decline ${p.name}?`)) return true;
  if (paid && !confirm(`Mark ${money(p.stats.unpaid)} paid to ${p.name}?`)) return true;
  b.disabled = true;
  try {
    state.amb = approve
      ? await api(`/api/admin/ambassadors/${p.id}/approve`, { method: "POST", body: {} })
      : await api(`/api/admin/ambassadors/${p.id}`, { method: "PATCH", body: paid ? { paidThrough: true } : { status: status.dataset.ambStatus } });
    const now = state.amb.people.find((x) => x.id === p.id);
    toast(approve ? (p.status === "paused" ? `${p.name}'s code ${now.code} is on again.` : `Approved. ${p.name}'s code is ${now.code}; they've been emailed.`) : paid ? "Marked paid." : status.dataset.ambStatus === "paused" ? `Paused. ${now.code} no longer works at checkout.` : "Declined.");
    render();
  } catch (error) {
    b.disabled = false;
    toast(error.message, "error");
  }
  return true;
}

app.addEventListener("change", async (e) => {
  if (!e.target.matches?.("[data-amb-auto] [name=autoDecide]")) return;
  try {
    state.amb = await api("/api/admin/ambassadors/config", { method: "PATCH", body: { autoDecide: e.target.checked } });
    toast(state.amb.config.autoDecide ? "New applications are decided automatically." : "New applications wait for you.");
  } catch (error) {
    e.target.checked = !e.target.checked;
    toast(error.message, "error");
  }
});

app.addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-amb-config]");
  if (!form) return;
  e.preventDefault();
  const error = $("[data-amb-error]", form);
  error.textContent = "";
  const button = $("button[type=submit]", form);
  button.disabled = true;
  try {
    state.amb = await api("/api/admin/ambassadors/config", { method: "PATCH", body: { open: form.open.checked, discount: form.discount.value, commission: form.commission.value, perks: form.perks.value } });
    toast(state.amb.config.open ? "Saved. Applications are open." : "Saved.");
    render();
  } catch (err) {
    error.textContent = err.message;
    button.disabled = false;
  }
});

// Saving a correction when a translation box loses focus with a change.
app.addEventListener("focusout", async (e) => {
  const field = e.target.closest?.("[data-tr-field]");
  if (!field || field.value === field.defaultValue) return;
  const row = field.closest("[data-tr-row]");
  const key = row.dataset.trRow;
  try {
    const { row: saved } = await api("/api/admin/translations", { method: "PATCH", body: { key, [field.dataset.trField]: field.value } });
    Object.assign(state.tr.rows.find((r) => r.key === key), saved);
    field.defaultValue = field.value;
    toast("Translation saved.");
    if (!row.querySelector("[data-tr-undo]")) render();
  } catch (error) {
    toast(error.message, "error");
  }
});

async function languagesClick(t) {
  if (t.closest("[data-tr-refresh]")) {
    const btn = t.closest("[data-tr-refresh]");
    btn.disabled = true;
    try {
      const { added, rows } = await api("/api/admin/translations/refresh", { method: "POST", body: {} });
      state.tr.rows = rows;
      toast(added ? `Translated ${added} new piece${added === 1 ? "" : "s"} of text.` : "Everything is translated already.");
      render();
    } catch (error) {
      btn.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  const undo = t.closest("[data-tr-undo]");
  if (undo) {
    const key = undo.closest("[data-tr-row]").dataset.trRow;
    const { row } = await api(`/api/admin/translations?key=${encodeURIComponent(key)}`, { method: "DELETE" });
    state.tr.rows = row ? state.tr.rows.map((r) => (r.key === key ? row : r)) : state.tr.rows.filter((r) => r.key !== key);
    toast("Correction undone.");
    render();
    return true;
  }
  return false;
}

/* ── Newsletters: written here from blocks, sent to confirmed subscribers through Resend ── */

const NL_BLOCKS = [
  ["heading", "Heading", "heading"],
  ["text", "Text", "text"],
  ["image", "Image", "picture"],
  ["button", "Button", "button"],
  ["product", "Coffee", "products"],
  ["items", "Their coffees", "products"], // automated emails only
  ["divider", "Divider", "divider"],
];
const nlStatus = (n) =>
  n.status === "sent"
    ? `<span class="badge sub-active">Sent</span>`
    : n.status === "sending"
      ? `<span class="badge s-packed">Sending ${n.done ?? 0}/${n.recipients ?? "…"}</span>`
      : `<span class="badge"><i></i>Draft</span>`;

function newsletterTabs() {
  const i = state.nlInfo || {};
  return subTabs("signups", [
    ["subscribers", "Subscribers", i.subscribers],
    ["newsletters", "Newsletters", i.newsletters?.length],
    ["automations", "Automations", state.autos ? state.autos.automations.filter((a) => a.enabled).length : null],
  ]);
}

// The business address in every newsletter's footer (US CAN-SPAM requires one).
function addressCard() {
  const i = state.nlInfo;
  return `<section class="card nl-address ${i.mailingAddress ? "" : "is-missing"}">
    <form class="form-stack" data-nl-address>
      <label class="field"><span>Footer mailing address</span>
        <textarea name="mailingAddress" rows="2" placeholder="e.g. Mimi Food, 327 S Western Ave, Los Angeles, CA 90020" required>${esc(i.mailingAddress)}</textarea></label>
      <div class="nl-address-foot">
        ${i.mailingAddress ? "" : `<small class="muted">Required by US law before you can send.</small>`}
        <button type="submit" class="btn btn-sm">Save</button>
      </div>
    </form>
  </section>`;
}

function newslettersView() {
  const i = state.nlInfo;
  const rows = i.newsletters;
  return `
    ${newsletterTabs()}
    ${i.emailReady ? "" : `<p class="notice">${icon("syncError")}<span>Email isn't connected yet.</span></p>`}
    ${addressCard()}
    <section class="card table-card">
      ${
        rows.length
          ? `<table class="table nl-table">
              <thead><tr><th>Newsletter</th><th>Status</th><th>Sent to</th><th>Date</th></tr></thead>
              <tbody>${rows
                .map(
                  (n) => `<tr class="row-link" data-href="#signups/newsletters/${esc(n.id)}">
                    <td><a class="cell-title" href="#signups/newsletters/${esc(n.id)}">${esc(n.subject || "Untitled newsletter")}</a>${n.preheader ? `<small class="muted">${esc(n.preheader)}</small>` : ""}</td>
                    <td>${nlStatus(n)}</td>
                    <td>${n.status === "draft" ? `<small class="muted">${i.subscribers} subscribers</small>` : `${n.sent ?? 0}${n.failed ? ` <small class="muted">· ${n.failed} failed</small>` : ""}`}</td>
                    <td><small class="nowrap">${esc(date(n.sentAt || n.updatedAt))}</small></td>
                  </tr>`
                )
                .join("")}</tbody>
            </table>`
          : `<div class="empty empty-lg">${icon("send", "i i-xl")}<p><strong>No newsletters yet</strong></p><button type="button" class="btn btn-primary" data-nl-new>${icon("plus")}<span>New Newsletter</span></button></div>`
      }
    </section>`;
}

function nlBlockFields(b, n) {
  const f = (field, label, attrs = "") => `<label class="field"><span>${label}</span><input data-nl-field="${field}" value="${esc(b[field] ?? "")}" ${attrs}></label>`;
  if (b.type === "heading") return f("text", "Heading", 'placeholder="e.g. New coffee: Muhathi Estate"');
  if (b.type === "text")
    return `<label class="field"><span>Text</span><textarea data-nl-field="text" rows="5" placeholder="Write here. Leave a blank line for a new paragraph; **two stars** make bold.">${esc(b.text)}</textarea></label>`;
  if (b.type === "image")
    return `<div class="nl-image">
        <div class="nl-image-preview">${b.image ? `<img src="${esc(/^https?:/.test(b.image) ? b.image : `/media/${b.image}`)}" alt="">` : `<span>${icon("image", "i i-xl")}</span>`}</div>
        <div class="form-stack">
          <label class="btn btn-sm nl-upload">${icon("image")}<span>${b.image ? "Replace image" : "Upload image"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-nl-upload="${n}" hidden></label>
          ${f("alt", "Describe the image")}
          ${f("href", "Link (optional)", 'type="url" placeholder="https://"')}
        </div>
      </div>`;
  if (b.type === "button")
    return `<div class="form-row-2">${f("label", "Button text", 'placeholder="e.g. Shop the new coffee"')}${f("href", "Link", 'type="url" placeholder="https://mimifood.com/…"')}</div>`;
  if (b.type === "product")
    return `<label class="field"><span>Coffee</span><select data-nl-field="product"><option value="">Choose a coffee</option>${(state.nlInfo.products || [])
      .map((p) => `<option value="${esc(p.id)}" ${b.product === p.id ? "selected" : ""}>${esc(p.name)}</option>`)
      .join("")}</select></label>`;
  return "";
}

/* ── Automations: emails that go by themselves when someone signs up, leaves a cart or orders ── */

const AUTO_TAGS = "{first_name}, {greeting_name} (their name, or \"there\"), {weekday}, {welcome_code}, {cart_link}, {shop_link}, {review_link}";

function automationsView() {
  const { automations, emailReady, mailingAddress } = state.autos;
  const timing = (a) => {
    const unit = a.unit === "hours" ? "hours" : "days";
    const input = (name, value) => `<input type="number" class="auto-delay" min="1" max="${a.unit === "hours" ? 48 : 365}" value="${value}" data-auto-delay="${a.id}" data-key="${name}" aria-label="${unit}">`;
    // Two timings: a row each.
    const two = (k1, v1, t1, k2, v2, t2) => `<span class="auto-timing is-two"><span>${input(k1, v1)} days after ${t1}</span><span>${input(k2, v2)} days after ${t2}</span></span>`;
    if (a.delay1kg != null) return two("delay", a.delay, "a 250g bag", "delay1kg", a.delay1kg, "a 1kg bag");
    if (a.delayAccount != null) return two("delay", a.delay, "a signup", "delayAccount", a.delayAccount, "a new account");
    return `<span class="auto-timing">${input("delay", a.delay)} ${unit} after</span>`;
  };
  const results = (s) =>
    s.sent
      ? `${s.sent30} sent in the last 30 days · ${s.orders} order${s.orders === 1 ? "" : "s"} within a week of one${s.orders ? `, ${money(s.revenue)}` : ""}`
      : "Nothing sent yet";
  return `
    ${newsletterTabs()}
    ${emailReady ? "" : `<p class="notice">${icon("syncError")}<span>Email isn't connected yet.</span></p>`}
    ${mailingAddress ? "" : `<p class="notice">${icon("syncError")}<span>Add a <a class="link" href="#signups/newsletters">mailing address</a> before these can send.</span></p>`}
    <section class="auto-list">
      ${automations
        .map(
          (a) => `<article class="card auto-card">
            <label class="switch-row"><span><strong>${esc(a.name)}</strong><small>${esc(a.when)}</small></span><input type="checkbox" data-auto-toggle="${a.id}" ${a.enabled ? "checked" : ""}><i aria-hidden="true"></i></label>
            <div class="auto-body">
              <p class="auto-subject"><a class="cell-title" href="#signups/automations/${a.id}">${esc(a.subject || "No subject")}</a><small class="muted">${esc(a.preheader)}</small></p>
              ${timing(a)}
            </div>
            <footer class="auto-foot">
              <small class="muted">${results(a.stats)}</small>
              <a class="btn btn-sm" href="#signups/automations/${a.id}">${icon("edit")}<span>Edit email</span></a>
            </footer>
          </article>`
        )
        .join("")}
    </section>`;
}

function newsletterEditor() {
  const n = state.nl;
  const i = state.nlInfo;
  const locked = n.status !== "draft";
  const kinds = NL_BLOCKS.filter(([t]) => t !== "items" || n.auto);
  const blocks = n.blocks
    .map(
      (b, k) => `<section class="card nl-block" data-nl-block="${k}">
        <header class="nl-block-head">
          <span class="nl-block-type">${icon(NL_BLOCKS.find(([t]) => t === b.type)[2])}${NL_BLOCKS.find(([t]) => t === b.type)[1]}</span>
          ${
            locked
              ? ""
              : `<span class="move">
            <button type="button" class="icon-btn" data-nl-move="${k}" data-dir="-1" aria-label="Move up" ${k === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
            <button type="button" class="icon-btn" data-nl-move="${k}" data-dir="1" aria-label="Move down" ${k === n.blocks.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button>
            <button type="button" class="icon-btn" data-nl-remove="${k}" aria-label="Remove">${icon("trash")}</button>
          </span>`
          }
        </header>
        <fieldset class="form-stack" ${locked ? "disabled" : ""}>${nlBlockFields(b, k)}</fieldset>
      </section>`
    )
    .join("");
  return `
    <div class="nl-editor" data-nl-editor>
      <div class="nl-bar">
        <a class="btn btn-ghost btn-sm" href="#signups/${n.auto ? "automations" : "newsletters"}">${icon("back")}<span>${n.auto ? "Automations" : "Newsletters"}</span></a>
        ${n.auto ? `<span class="badge ${n.enabled ? "sub-active" : "sub-paused"}">${n.enabled ? "On" : "Off"}</span>` : nlStatus(n)}
        <small class="muted" data-nl-saved>${locked ? (n.sentAt ? `Sent ${esc(date(n.sentAt))} to ${n.sent ?? 0}${n.failed ? ` (${n.failed} failed)` : ""}` : "") : "Saved"}</small>
        ${n.auto || locked ? "" : `<button type="button" class="btn btn-sm btn-ghost bar-delete" data-nl-delete>${icon("trash")}<span>Delete</span></button>`}
        <span class="nl-bar-actions">
          ${
            n.auto
              ? `${n.edited ? `<button type="button" class="btn btn-sm btn-ghost" data-auto-reset>${icon("back")}<span>Restore original</span></button>` : ""}
                 <button type="button" class="btn btn-sm" data-nl-test>${icon("test")}<span>Send a test</span></button>`
              : locked
              ? `<button type="button" class="btn btn-sm" data-nl-duplicate>${icon("copy")}<span>Duplicate</span></button>`
              : `<button type="button" class="btn btn-sm" data-nl-test>${icon("test")}<span>Send a test</span></button>
                 <button type="button" class="btn btn-sm btn-primary" data-nl-send ${i.emailReady ? "" : "disabled"}>${icon("send")}<span>Send to ${i.subscribers}</span></button>`
          }
        </span>
      </div>
      ${n.error && n.status !== "draft" ? `<p class="notice">${icon("syncError")}<span>Some emails didn't send.</span></p>` : ""}
      ${!i.mailingAddress && !locked ? addressCard() : ""}
      <div class="nl-columns ${locked ? "is-sent" : ""}">
        ${locked ? "" : `<div class="nl-compose">
          <section class="card nl-meta"><fieldset class="form-stack" ${locked ? "disabled" : ""}>
            <label class="field"><span>Subject</span><input data-nl-meta="subject" value="${esc(n.subject)}" maxlength="150" placeholder="e.g. Fresh from the roaster: three new coffees"></label>
            <label class="field"><span>Preview text</span><input data-nl-meta="preheader" value="${esc(n.preheader)}" maxlength="200"></label>
            ${n.auto ? `<small class="muted">Merge tags: ${AUTO_TAGS}</small>` : ""}
          </fieldset></section>
          ${blocks}
          ${
            locked
              ? ""
              : `<div class="nl-add" role="group" aria-label="Add a block">${kinds.map(([t, label, ic]) => `<button type="button" class="btn btn-sm" data-nl-add="${t}">${icon(ic)}<span>${label}</span></button>`).join("")}</div>`
          }
        </div>`}
        <div class="nl-preview">
          <p class="nl-preview-label"><strong data-nl-subject-preview>${esc(n.subject || "No subject yet")}</strong><small class="muted" data-nl-pre-preview>${esc(n.preheader || "")}</small></p>
          <iframe title="Newsletter preview" data-nl-frame></iframe>
        </div>
      </div>
    </div>`;
}

// Live preview from the server's renderer (the same one that sends), and quiet saves.
let nlPreviewTimer = 0;
let nlSaveTimer = 0;
function nlPreview() {
  clearTimeout(nlPreviewTimer);
  nlPreviewTimer = setTimeout(async () => {
    const frame = $("[data-nl-frame]");
    if (!frame || !state.nl) return;
    try {
      const draft = { subject: state.nl.subject, preheader: state.nl.preheader, blocks: state.nl.blocks };
      const { html } = await api(state.nl.auto ? `/api/admin/automations/${state.nl.id}/preview` : "/api/admin/newsletters/preview", { method: "POST", body: draft });
      frame.onload = () => {
        try {
          frame.style.height = `${frame.contentDocument.documentElement.scrollHeight}px`;
          // Links in the preview open in a new tab rather than inside the frame.
          frame.contentDocument.querySelectorAll("a").forEach((a) => (a.target = "_blank"));
        } catch {
          /* not readable: keeps its default height */
        }
      };
      frame.srcdoc = html;
    } catch {
      /* the next change tries again */
    }
  }, 350);
}
function nlSave({ now = false } = {}) {
  clearTimeout(nlSaveTimer);
  freshDraft = null;
  const label = $("[data-nl-saved]");
  if (label) label.textContent = "Saving…";
  const run = async () => {
    try {
      const body = { subject: state.nl.subject, preheader: state.nl.preheader, blocks: state.nl.blocks };
      const saved = state.nl.auto
        ? (await api(`/api/admin/automations/${state.nl.id}`, { method: "PATCH", body })).automation
        : (await api(`/api/admin/newsletters/${state.nl.id}`, { method: "PATCH", body })).newsletter;
      state.nl.blocks.forEach((b, k) => (b.id = saved.blocks[k]?.id || b.id));
      if (state.nl.auto && !state.nl.edited) {
        state.nl.edited = true;
        render();
      }
      if ($("[data-nl-saved]")) $("[data-nl-saved]").textContent = "Saved";
    } catch (error) {
      if ($("[data-nl-saved]")) $("[data-nl-saved]").textContent = `Not saved: ${error.message}`;
    }
  };
  if (now) return run();
  nlSaveTimer = setTimeout(run, 700);
}
const nlChanged = () => {
  nlPreview();
  nlSave();
};

// Newsletter images: resized to 1200px wide as a JPEG (every mail app shows those), on white.
async function newsletterImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPEG, PNG or WebP image.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1200 / bitmap.width);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.85);
}

let nlPoll = 0;
function watchSending() {
  clearTimeout(nlPoll);
  if (state.page !== "signups" || state.sub !== "edit" || state.nl?.status !== "sending") return;
  nlPoll = setTimeout(async () => {
    try {
      state.nl = structuredClone((await api(`/api/admin/newsletters/${state.nl.id}`)).newsletter);
      if (state.nl.status === "sent") toast(`Sent to ${state.nl.sent} subscriber${state.nl.sent === 1 ? "" : "s"}${state.nl.failed ? ` (${state.nl.failed} failed)` : ""}.`);
      render();
    } catch {
      /* try again on the next tick */
    }
    watchSending();
  }, 2000);
}

async function newsletterClick(t) {
  if (t.closest("[data-nl-new]")) {
    const { newsletter } = await api("/api/admin/newsletters", { method: "POST", body: {} });
    newDraft(`/api/admin/newsletters/${newsletter.id}`, `#signups/newsletters/${newsletter.id}`);
    return true;
  }
  const row = t.closest(".nl-table [data-href]");
  if (row && !t.closest("a")) {
    go(row.dataset.href);
    return true;
  }
  if (!t.closest("[data-nl-editor]")) return false;
  const n = state.nl;
  const add = t.closest("[data-nl-add]");
  if (add) {
    const type = add.dataset.nlAdd;
    n.blocks.push({ id: Math.random().toString(36).slice(2, 10), type, ...(type === "button" ? { href: `${location.origin}/` } : {}) });
    nlChanged();
    render();
    $$("[data-nl-block]").at(-1)?.scrollIntoView({ block: "center" });
    return true;
  }
  const move = t.closest("[data-nl-move]");
  if (move) {
    const k = Number(move.dataset.nlMove);
    const to = k + Number(move.dataset.dir);
    [n.blocks[k], n.blocks[to]] = [n.blocks[to], n.blocks[k]];
    nlChanged();
    render();
    return true;
  }
  const remove = t.closest("[data-nl-remove]");
  if (remove) {
    n.blocks.splice(Number(remove.dataset.nlRemove), 1);
    nlChanged();
    render();
    return true;
  }
  if (t.closest("[data-auto-reset]")) {
    if (!confirm("Put this email back to how it started? Your changes to it will be lost.")) return true;
    clearTimeout(nlSaveTimer);
    const { automation } = await api(`/api/admin/automations/${n.id}`, { method: "PATCH", body: { reset: true } });
    state.nl = { ...automation, auto: true, status: "draft" };
    render();
    nlPreview();
    toast("Restored.");
    return true;
  }
  if (t.closest("[data-nl-delete]")) {
    if (!confirm(`Delete "${n.subject || "this draft"}"?`)) return true;
    clearTimeout(nlSaveTimer);
    await api(`/api/admin/newsletters/${n.id}`, { method: "DELETE" });
    go("#signups/newsletters");
    return true;
  }
  if (t.closest("[data-nl-duplicate]")) {
    const { newsletter } = await api(`/api/admin/newsletters/${n.id}/duplicate`, { method: "POST", body: {} });
    go(`#signups/newsletters/${newsletter.id}`);
    toast("Copied into a new draft.");
    return true;
  }
  if (t.closest("[data-nl-test]")) {
    const to = prompt("Send a test to which email?", localStorage.getItem("bo-nl-test") || "");
    if (!to) return true;
    localStorage.setItem("bo-nl-test", to.trim());
    await nlSave({ now: true });
    try {
      await api(`/api/admin/${n.auto ? "automations" : "newsletters"}/${n.id}/test`, { method: "POST", body: { email: to.trim() } });
      toast(`Test sent to ${to.trim()}.`);
    } catch (error) {
      toast(error.message, "error");
    }
    return true;
  }
  if (t.closest("[data-nl-send]")) {
    const count = state.nlInfo.subscribers;
    if (!n.subject.trim()) return toast("Give the newsletter a subject first.", "error"), true;
    if (!confirm(`Send "${n.subject}" to ${count} subscriber${count === 1 ? "" : "s"} now? This can't be undone.`)) return true;
    await nlSave({ now: true });
    try {
      state.nl = structuredClone((await api(`/api/admin/newsletters/${n.id}/send`, { method: "POST", body: {} })).newsletter);
      toast("Sending…");
      render();
      watchSending();
    } catch (error) {
      toast(error.message, "error");
    }
    return true;
  }
  return false;
}

/* ── Products: the shop's coffees, their photos, and labels (with optional discounts) ── */

const salePrice = (price, off) => Math.round(price * (1 - off / 100) * 100) / 100;
const priceCell = (price, off) => (off ? `<s class="was">${money(price)}</s> ${money(salePrice(price, off))}` : money(price));
const productThumb = (p) =>
  p.image
    ? `<span class="thumb"><img src="${imgSrc(p.image)}" alt="" loading="lazy"></span>`
    : `<span class="thumb"><img src="/assets/bag-kraft.webp" alt="" loading="lazy"></span>`;
// A tea's cup, with its lid colour.
const foodPick = new Set<string>(); // products ticked in the Food list, for Delete Selected
const foodBarHtml = () => (foodPick.size ? `<span><strong>${foodPick.size}</strong> selected</span><button type="button" class="btn btn-danger-ghost btn-sm" data-food-bulk-delete>${icon("trash")}<span>Delete Selected</span></button><button type="button" class="btn btn-ghost btn-sm" data-food-pick-clear>Clear</button>` : "");
const foodThumb = (f) => (f.image ? `<span class="thumb"><img src="${imgSrc(f.image)}" alt="" loading="lazy"></span>` : `<span class="thumb thumb-kind" aria-hidden="true">${icon("products")}</span>`);
const teaThumb = (t) =>
  t.image ? `<span class="thumb"><img src="${imgSrc(t.image)}" alt="" loading="lazy"></span>` : `<span class="thumb tea-thumb" style="--lid:${esc(t.color || "#d8d2c4")}"><img src="/assets/tea-cup.webp" alt="" loading="lazy"></span>`;
const labelPill = (l) => `<span class="pill${l.discount ? " pill-sale" : ""}">${esc(l.name)}${l.discount ? `<b>−${l.discount}%</b>` : ""}</span>`;

// A stock row's cells: the product, how many are left (editable), where that leaves it, and how
// many people asked to hear when it's back.
// Where an item stands: sold out (counted to 0 or switched off), low, in stock, or not counted.
const stockState = (i, low) => (i.left === 0 || (i.soldOut && !(i.left > 0)) ? "out" : i.left == null ? "none" : i.left <= (i.reorderAt ?? low) ? "low" : "ok");
// How much is left against its reorder level, as a bar with a tick at the level: green, amber
// when at or under it, red when none are left. The scale is twice the level (or what's left).
// The reorder level's number sits over its tick; what's promised (planned roasts) shows hatched at
// the end of what's left; days left is how long it lasts at the recent pace.
function stockBar(left, reorderAt, unit = "", { promised = 0, days = null } = {}) {
  if (left == null) return `<span class="muted">—</span>`;
  const tone = left <= 0 ? "out" : reorderAt != null && left <= reorderAt ? "low" : "ok";
  const max = Math.max(left, (reorderAt || 0) * 2, 1);
  const pct = (n) => `${Math.min(100, Math.max(0, Math.round((n / max) * 100)))}%`;
  const held = Math.min(Math.max(0, left), promised || 0);
  const n = (x) => Number(x).toLocaleString("en-US", { maximumFractionDigits: 1 });
  const foot = [held ? `${n(held)} promised` : "", days != null ? (days < 1 ? "Less than a day left" : `${n(days)} day${days === 1 ? "" : "s"} left`) : ""].filter(Boolean).join(" · ");
  return `<span class="sbar is-${tone}${reorderAt ? " has-tick" : ""}">
    <span class="sbar-track" aria-hidden="true"><i style="width:${pct(left - held)}"></i>${held ? `<u style="left:${pct(left - held)};width:${pct(held)}"></u>` : ""}${reorderAt ? `<b style="left:${pct(reorderAt)}"><em>${n(reorderAt)}</em></b>` : ""}</span>
    <span class="sbar-num"><strong>${n(left)}</strong>${unit ? ` ${esc(unit)}` : ""}${foot ? `<small>${esc(foot)}</small>` : ""}</span>
    ${reorderAt ? `<span class="sr-only">Reorder at ${n(reorderAt)}</span>` : ""}
  </span>`;
}
function stockRow(i, low) {
  const st = stockState(i, low);
  const status = {
    out: i.left === 0 ? `<span class="badge p-unpaid"><i></i>Sold out</span>` : `<span class="badge"><i></i>Sold out (switch)</span>`,
    none: `<span class="muted">Not counted</span>`,
    low: `<span class="badge badge-warn"><i></i>Low</span>`,
    ok: `<span class="badge sub-active"><i></i>In stock</span>`,
  }[st];
  const label = `${esc(i.name)}${i.variant ? ` ${esc(i.variant)}` : ""}`;
  const thumb = i.kind === "Coffee" || i.kind === "Tea" ? `<span class="line-thumb"><img src="/feeds/images/${encodeURIComponent(i.product)}.jpg" alt="" loading="lazy"></span>` : "";
  // Coffee: the roast dates on the shelf (newest first), flagged past five weeks.
  const old = (d) => d && Date.now() - Date.parse(`${d}T12:00:00`) > 35 * 864e5;
  const lots = (i.lots || []).filter((l) => l.date);
  const lotText = lots.length ? `<small class="${lots.some((l) => old(l.date)) ? "is-stale" : ""}">Roasted ${lots.map((l) => esc(dayName(l.date, { month: "short", day: "numeric" }))).join(", ")}${lots.some((l) => old(l.date)) ? " · past 5 weeks" : ""}</small>` : "";
  return `<td class="c-product"><span class="cust-cell">${thumb}<span><strong>${esc(i.name)}${i.variant ? ` · ${esc(i.variant)}` : ""}</strong><small>${esc(i.kind)}</small>${lotText}</span></span></td>
    <td class="c-stock"><span class="stock-step">
      <button type="button" class="icon-btn" data-stock-step="-1" aria-label="One fewer ${label}" ${i.left ? "" : "disabled"}>${icon("Minus")}</button>
      <label class="stock-left"><input type="number" min="0" step="1" inputmode="numeric" data-stock-key="${esc(i.key)}" value="${i.left ?? ""}" placeholder="—" aria-label="${label} left"><small>${esc(i.unit)}${/250g/.test(i.unit || "") ? " · 1kg = 4" : ""}</small></label>
      <button type="button" class="icon-btn" data-stock-step="1" aria-label="One more ${label}">${icon("plus")}</button>
    </span></td>
    <td class="c-bar">${stockBar(i.left, i.reorderAt ?? low)}</td>
    <td class="c-level"><label class="stock-level"><input type="number" min="0" step="1" inputmode="numeric" data-stock-level="${esc(i.key)}" value="${i.reorderAt ?? ""}" placeholder="${low}" aria-label="Reorder ${label} at"></label></td>
    <td class="c-status">${status}</td>
    <td class="num">${i.waiting ? `<span class="chip-sm is-warn">${i.waiting} waiting</span>` : `<span class="muted">—</span>`}</td>
    <td class="row-actions"><button type="button" class="btn btn-sm btn-ghost" data-stock-history="${esc(i.key)}">History</button></td>`;
}

function productsView() {
  const c = state.catalog;
  const empty = (title, form) => `<div class="empty empty-lg">${icon(form === "label" ? "label" : "products", "i i-xl")}<p><strong>${title}</strong></p><button type="button" class="btn btn-primary" data-form="${form}">${icon("plus")}<span>${form === "label" ? "New Label" : "New Product"}</span></button></div>`;
  let body;
  let above = ""; // filters that sit over the table (Stock)
  if (state.sub === "bulk") return `${subTabs("products", [["foods", "Food", (c.foods || []).length], ["stock", "Stock", (state.stock?.items || []).filter((i) => i.left === 0).length || null], ["bulk", "Bulk Edit", null], ["giftcards", "Gift Cards", null], ["labels", "Labels", c.labels.length], ["codes", "Discount codes", (state.promos || []).filter((x) => x.source !== "welcome").length]])}${bulkGrid()}`;
  if (state.sub === "codes") {
    // Newsletter welcome codes (one per signup) are summed up, not listed one by one.
    const welcome = (state.promos || []).filter((x) => x.source === "welcome");
    const promos = (state.promos || []).filter((x) => x.source !== "welcome");
    const welcomeUsed = welcome.filter((x) => x.uses > 0).length;
    const welcomeNote = welcome.length
      ? `<p class="table-foot muted">${welcome.length} newsletter welcome code${welcome.length === 1 ? "" : "s"} sent, ${welcomeUsed} used${welcome.length ? ` (${Math.round((welcomeUsed / welcome.length) * 100)}%)` : ""}</p>`
      : "";
    const what = (x) => (x.kind === "freeship" ? "Free shipping" : x.kind === "percent" ? `${x.value}% off` : `${money(x.value)} off`);
    const ended = (x) => x.endsOn && x.endsOn < new Date().toISOString().slice(0, 10);
    body = promos.length
      ? `<table class="table promos-table is-labelled">
          <thead><tr><th>Code</th><th>Gives</th><th>Conditions</th><th class="num">Used</th><th>Status</th></tr></thead>
          <tbody>${promos
            .map(
              (x) => `<tr data-promo="${esc(x.id)}" class="clickable">
                <td><span class="code">${esc(x.code)}</span></td>
                <td><strong>${what(x)}</strong></td>
                <td class="muted">${[x.minSubtotal ? `Orders over ${money(x.minSubtotal)}` : "", x.endsOn ? `Ends ${esc(x.endsOn)}` : ""].filter(Boolean).join(" · ") || "No conditions"}</td>
                <td class="num">${x.uses}${x.maxUses ? ` of ${x.maxUses}` : ""} used</td>
                <td>${!x.active ? `<span class="badge"><i></i>Off</span>` : ended(x) || (x.maxUses && x.uses >= x.maxUses) ? `<span class="badge"><i></i>Ended</span>` : `<span class="badge sub-active"><i></i>Live</span>`}</td>
              </tr>`
            )
            .join("")}</tbody></table>${welcomeNote}`
      : `${welcomeNote}<div class="empty empty-lg">${icon("label", "i i-xl")}<p><strong>No discount codes yet</strong></p><button type="button" class="btn btn-primary" data-form="promo">${icon("plus")}<span>New Code</span></button></div>`;
  } else if (state.sub === "foods") {
    const q = state.query.toLowerCase();
    const foods = (c.foods || []).filter((x) => !q || `${x.name} ${x.category}`.toLowerCase().includes(q));
    body = foods.length
      ? `<div class="bulk-bar" data-food-bar>${foodBarHtml()}</div><table class="table products-table teas-table">
          <thead><tr><th class="c-select"><input type="checkbox" data-food-pick-all aria-label="Select all shown" ${foods.length && foods.every((x) => foodPick.has(x.id)) ? "checked" : ""}></th><th>Product</th><th>Category</th><th class="num">Price</th><th>Status</th><th class="actions-col"><span class="sr-only">Order</span></th></tr></thead>
          <tbody>${foods
            .map(
              (x, i) => `<tr data-food="${esc(x.id)}" class="clickable${x.visible ? "" : " is-hidden"}">
                <td class="c-select"><input type="checkbox" data-food-pick="${esc(x.id)}" aria-label="Select ${esc(x.short || x.name)}" ${foodPick.has(x.id) ? "checked" : ""}></td>
                <td class="c-product">${foodThumb(x)}<span><strong>${esc(x.short || x.name)}</strong><small>${esc(x.pack || "")}</small></span></td>
                <td>${esc(x.category)}</td>
                <td class="num c-price">${x.price == null ? `<span class="muted">Coming Soon</span>` : money(x.price)}</td>
                <td class="c-status">${x.visible ? "" : `<span class="badge"><i></i>Hidden</span>`}<label class="mini-switch" title="Sold out"><span>Sold out</span><input type="checkbox" data-food-sold-out="${esc(x.id)}" ${x.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label></td>
                <td class="c-move"><span class="move">
                  <button type="button" class="icon-btn" data-food-move="${esc(x.id)}" data-dir="up" aria-label="Move ${esc(x.short)} up" ${i === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
                  <button type="button" class="icon-btn" data-food-move="${esc(x.id)}" data-dir="down" aria-label="Move ${esc(x.short)} down" ${i === foods.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button></span></td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("products", "i i-xl")}<p><strong>${q ? "No matching products" : "No products yet"}</strong></p><button type="button" class="btn btn-primary" data-form="food">${icon("plus")}<span>New Product</span></button></div>`;  } else if (state.sub === "teas") {
    const teas = c.teas || [];
    body = teas.length
      ? `<table class="table products-table teas-table">
          <thead><tr><th>Tea</th><th>Kind</th><th>Caffeine</th><th class="num">Price</th><th class="num">1 kg (wholesale)</th><th>Status</th><th class="actions-col"><span class="sr-only">Order</span></th></tr></thead>
          <tbody>${teas
            .map(
              (t, i) => `<tr data-tea="${esc(t.id)}" class="clickable${t.visible ? "" : " is-hidden"}">
                <td class="c-product">${teaThumb(t)}<span><strong>${esc(t.short || t.name)}</strong><small>${esc(t.notes || t.name)}</small></span></td>
                <td>${esc(t.type)}${t.cultivar ? `<small>${esc(c.cultivars.find((x) => x.id === t.cultivar)?.name || t.cultivar)}</small>` : ""}</td>
                <td class="muted">${esc(t.caffeine || "—")}</td>
                <td class="num c-price">${t.price == null ? `<span class="muted">Coming Soon</span>` : money(t.price)}</td>
                <td class="num">${t.price == null ? `<span class="muted">—</span>` : (() => {
                  const d = state.trade?.defaults || { teaKg: 2.5, teaKgOff: 0.15 }; // before the Wholesale page loads
                  return money(t.price * d.teaKg * (1 - d.teaKgOff));
                })()}</td>
                <td class="c-status">${t.visible ? "" : `<span class="badge"><i></i>Hidden</span>`}<label class="mini-switch" title="Sold out"><span>Sold out</span><input type="checkbox" data-tea-sold-out="${esc(t.id)}" ${t.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label></td>
                <td class="c-move"><span class="move">
                  <button type="button" class="icon-btn" data-tea-move="${esc(t.id)}" data-dir="up" aria-label="Move ${esc(t.short)} up" ${i === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
                  <button type="button" class="icon-btn" data-tea-move="${esc(t.id)}" data-dir="down" aria-label="Move ${esc(t.short)} down" ${i === teas.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button></span></td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("products", "i i-xl")}<p><strong>No teas yet</strong></p><button type="button" class="btn btn-primary" data-form="tea">${icon("plus")}<span>New Tea</span></button></div>`;
  } else if (state.sub === "stock") {
    const st = state.stock || { items: [], low: 5 };
    const q = state.query.toLowerCase();
    const f = state.stockFilter || "all";
    // What needs doing first: sold out, then running low (fewest first), then the rest.
    const rank = { out: 0, low: 1, ok: 2, none: 3 };
    const n = (k) => st.items.filter((i) => stockState(i, st.low) === k).length;
    const rows = st.items
      .filter((i) => !q || `${i.name} ${i.variant} ${i.kind}`.toLowerCase().includes(q))
      .filter((i) => f === "all" || (f === "attention" ? ["out", "low"].includes(stockState(i, st.low)) : stockState(i, st.low) === f))
      .sort((a, b) => rank[stockState(a, st.low)] - rank[stockState(b, st.low)] || (a.left ?? 0) - (b.left ?? 0));
    const top = chips("Stock filter", [
      { filter: "stock:all", label: "All", count: st.items.length, on: f === "all" },
      { filter: "stock:attention", label: "Low", count: n("out") + n("low"), tone: "p-unpaid", on: f === "attention" },
      { filter: "stock:ok", label: "In stock", count: n("ok"), tone: "s-completed", on: f === "ok" },
      { filter: "stock:none", label: "Not counted", count: n("none"), tone: "s-cancelled", on: f === "none" },
    ]);
    above = top;
    if (state.counting === "stock") {
      above = "";
      body = countTable(st.items.filter((i) => !q || `${i.name} ${i.variant} ${i.kind}`.toLowerCase().includes(q)).map((i) => ({ id: i.key, name: `${i.name}${i.variant ? ` · ${i.variant}` : ""}`, sub: i.kind, expected: i.left, unit: i.unit })));
    } else body = (rows.length
      ? `<table class="table stock-table is-labelled">
          <thead><tr><th>Product</th><th>Left</th><th>Stock</th><th>Reorder at</th><th>Status</th><th class="num">Waiting</th><th class="actions-col"><span class="sr-only">History</span></th></tr></thead>
          <tbody>${rows.map((i) => `<tr data-stock-row="${esc(i.key)}">${stockRow(i, st.low)}</tr>`).join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon(q ? "search" : "products", "i i-xl")}<p><strong>${q ? "Nothing matches that search" : f === "attention" ? "Nothing running low" : "Nothing here"}</strong></p></div>`);
  } else if (state.sub === "giftcards") {
    const g = state.giftCards || { cards: [], owed: [] };
    const q = state.query.toLowerCase();
    const rows = g.cards.filter((x) => !q || `${x.last4} ${x.toName} ${x.toEmail} ${x.fromName} ${x.order}`.toLowerCase().includes(q));
    const owed = g.owed.length
      ? `<div class="notice gc-owed">${g.owed.map((o) => `<p><strong>${esc(o.number)}</strong> is owed ${o.owed} gift card${o.owed === 1 ? "" : "s"} (Square didn't issue ${o.owed === 1 ? "it" : "them"}). <button type="button" class="btn btn-sm" data-gc-issue="${esc(o.number)}">Issue now</button></p>`).join("")}</div>`
      : "";
    body =
      owed +
      (rows.length
        ? `<table class="table giftcards-table is-labelled">
          <thead><tr><th>Card</th><th class="num">Amount</th><th class="num">Balance</th><th>To</th><th>From</th><th>Order</th><th>Email</th></tr></thead>
          <tbody>${rows
            .map(
              (x) => `<tr>
                <td><span class="code">••${esc(x.last4)}</span></td>
                <td class="num">${money(x.amount)}</td>
                <td class="num">${x.balance == null ? `<span class="muted">—</span>` : money(x.balance)}</td>
                <td><strong>${esc(x.toName)}</strong><small>${esc(x.toEmail)}</small></td>
                <td>${esc(x.fromName)}</td>
                <td><a href="#orders/${esc(x.order)}">${esc(x.order)}</a></td>
                <td>${x.emailedAt ? `<span class="muted">Sent ${esc(new Date(x.emailedAt).toLocaleDateString())}</span>` : `<span class="badge badge-warn"><i></i>Not sent</span>`}${x.textedAt ? `<small>Texted too</small>` : ""}${x.acceptedAt ? `<small>Accepted</small>` : ""} <button type="button" class="link-button" data-gc-email="${esc(x.id)}">Email again</button></td>
              </tr>`
            )
            .join("")}</tbody></table>`
        : `<div class="empty empty-lg">${icon("label", "i i-xl")}<p><strong>${q ? "No gift cards match that search" : "No gift cards sold yet"}</strong></p></div>`);
  } else if (state.sub === "labels") {
    body = c.labels.length
      ? `<table class="table labels-table is-labelled">
          <thead><tr><th>Label</th><th>Discount</th><th class="num">Products</th></tr></thead>
          <tbody>${c.labels
            .map(
              (l) => `<tr data-label="${esc(l.id)}" class="clickable">
                <td>${labelPill(l)}</td>
                <td>${l.discount ? `<strong>${l.discount}% off</strong>` : `<span class="muted">No discount</span>`}</td>
                <td class="num">${l.count}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : empty("No labels yet", "label");
  } else {
    const q = state.query.toLowerCase();
    const rows = c.products.filter((p) => !q || `${p.name} ${p.short} ${p.notes} ${p.type}`.toLowerCase().includes(q));
    const byId = Object.fromEntries(c.labels.map((l) => [l.id, l]));
    body = rows.length
      ? `<table class="table products-table">
          <thead><tr><th>Product</th><th>Roast</th><th>Labels</th><th class="num">250g</th><th class="num">1kg</th><th>Status</th><th class="actions-col"><span class="sr-only">Order</span></th></tr></thead>
          <tbody>${rows
            .map(
              (p, i) => `<tr data-product="${esc(p.id)}" class="clickable${p.visible ? "" : " is-hidden"}">
                <td class="c-product">${productThumb(p)}<span><strong>${esc(p.short || p.name)}</strong><small>${esc(p.notes || p.name)}</small></span></td>
                <td class="c-roast">${esc(p.type)}${p.ground ? "" : "<small>Whole bean only</small>"}</td>
                <td class="c-labels">${p.badges.map((id) => byId[id]).filter(Boolean).map(labelPill).join("") || `<span class="muted">—</span>`}</td>
                <td class="num c-price">${priceCell(p.price, p.discount)}${state.roastCosts?.[p.id] ? `<small class="muted">Green ${money(state.roastCosts[p.id].perBag)} · ${Math.round((state.roastCosts[p.id].perBag / p.price) * 100)}% of price</small>` : ""}</td>
                <td class="num c-price1kg">${priceCell(p.price1kg, p.discount)}</td>
                <td class="c-status">${p.visible ? "" : `<span class="badge"><i></i>Hidden</span>`}<label class="mini-switch" title="Sold out"><span>Sold out</span><input type="checkbox" data-product-sold-out="${esc(p.id)}" ${p.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label></td>
                <td class="c-move">${q ? "" : `<span class="move">
                  <button type="button" class="icon-btn" data-move="${esc(p.id)}" data-dir="up" aria-label="Move ${esc(p.short)} up" ${i === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
                  <button type="button" class="icon-btn" data-move="${esc(p.id)}" data-dir="down" aria-label="Move ${esc(p.short)} down" ${i === rows.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button></span>`}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : state.query
        ? `<div class="empty empty-lg">${icon("search", "i i-xl")}<p><strong>No products match that search</strong></p></div>`
        : empty("No products yet", "product");
  }
  return `
    ${subTabs("products", [["foods", "Food", (c.foods || []).length], ["stock", "Stock", (state.stock?.items || []).filter((i) => i.left === 0).length || null], ["bulk", "Bulk Edit", null], ["giftcards", "Gift Cards", null], ["labels", "Labels", c.labels.length], ["codes", "Discount codes", (state.promos || []).filter((x) => x.source !== "welcome").length]])}
    ${above}
    <section class="card table-card">${body}</section>
    ${googleLine(state.google, state.sub)}`;
}

/* ── Products → Bulk Edit: every coffee and tea in one grid (prices, costs, shown, sold out,
   stock). Changed cells are marked; Save applies them all at once (the server checks every one
   first). Import CSV fills the grid from a spreadsheet (the Export CSV columns, matched by id)
   for a look before saving. */
function bulkGrid() {
  const c = state.catalog;
  const left = (id) => state.stock?.items.find((i) => i.key === id)?.left ?? "";
  const cell = (kind, id, field, value, type = "money") =>
    type === "check"
      ? `<td class="bulk-check"><input type="checkbox" data-bulk="${kind}|${esc(id)}|${field}" data-was="${value ? "1" : ""}" ${value ? "checked" : ""} aria-label="${field}"></td>`
      : `<td><input data-bulk="${kind}|${esc(id)}|${field}" data-was="${esc(value ?? "")}" value="${esc(value ?? "")}" inputmode="${type === "count" ? "numeric" : "decimal"}" aria-label="${field}"></td>`;
  const rows = [
    ...c.products.map((p) => `<tr><th scope="row" title="${esc(p.name)}">${esc(p.short || p.name)}<small>Coffee</small></th>${cell("p", p.id, "price", p.price)}${cell("p", p.id, "price1kg", p.price1kg)}${cell("p", p.id, "cost250", p.cost250)}${cell("p", p.id, "cost1kg", p.cost1kg)}${cell("p", p.id, "visible", p.visible !== false, "check")}${cell("p", p.id, "soldOut", p.soldOut, "check")}${cell("s", p.id, "left", left(p.id), "count")}</tr>`),
    ...(c.teas || []).map((t) => `<tr><th scope="row" title="${esc(t.name)}">${esc(t.short || t.name)}<small>Tea</small></th>${cell("t", t.id, "price", t.price)}<td></td><td></td><td></td>${cell("t", t.id, "visible", t.visible !== false, "check")}${cell("t", t.id, "soldOut", t.soldOut, "check")}${cell("s", t.id, "left", left(t.id), "count")}</tr>`),
  ];
  return `<form class="card table-card bulk-card" data-bulk-form>
      <div class="bulk-scroll"><table class="table bulk-table">
        <thead><tr><th>Product</th><th>250g / Pack</th><th>1kg</th><th>Cost 250g</th><th>Cost 1kg</th><th>Shown</th><th>Sold Out</th><th>Stock</th></tr></thead>
        <tbody>${rows.join("")}</tbody>
      </table></div>
      <div class="bulk-bar"><span class="muted" data-bulk-count>No changes</span><button type="button" class="btn" data-bulk-reset disabled>Undo All</button><button type="submit" class="btn btn-primary" disabled>Save</button></div>
    </form>`;
}
const bulkValue = (x) => (x.type === "checkbox" ? (x.checked ? "1" : "") : x.value.trim());
function bulkCount(form) {
  let n = 0;
  for (const x of $$("[data-bulk]", form)) {
    const changed = bulkValue(x) !== x.dataset.was;
    x.closest("td").classList.toggle("is-changed", changed);
    if (changed) n++;
  }
  $("[data-bulk-count]", form).textContent = n ? `${n} change${n === 1 ? "" : "s"}` : "No changes";
  $("[type=submit]", form).disabled = !n;
  $("[data-bulk-reset]", form).disabled = !n;
  $("[type=submit]", form).textContent = n ? `Save ${n} Change${n === 1 ? "" : "s"}` : "Save";
}
document.addEventListener("input", (e) => {
  const f = (e.target as any).closest?.("[data-bulk-form]");
  if (f) bulkCount(f);
});
document.addEventListener("change", async (e) => {
  const t: any = e.target;
  if (t.closest?.("[data-bulk-form]")) return bulkCount(t.closest("[data-bulk-form]"));
  if (!t.matches?.("[data-bulk-import]")) return;
  const file = t.files?.[0];
  t.value = "";
  const form = $("[data-bulk-form]");
  if (!file || !form) return;
  // CSV: quoted cells, commas and line breaks inside quotes, a header row.
  const rows = [];
  let row = [];
  let cellText = "";
  let quoted = false;
  const src = await file.text();
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (quoted) {
      if (ch === '"' && src[i + 1] === '"') (cellText += '"'), i++;
      else if (ch === '"') quoted = false;
      else cellText += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") row.push(cellText), (cellText = "");
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(cellText), rows.push(row), (row = []), (cellText = "");
    } else cellText += ch;
  }
  if (cellText || row.length) row.push(cellText), rows.push(row);
  const head = (rows.shift() || []).map((h) => h.trim().toLowerCase());
  const col = (name) => head.indexOf(name);
  const COLS = { price: "price (250g / pack)", price1kg: "price 1kg", cost250: "cost 250g", cost1kg: "cost 1kg", visible: "shown", soldOut: "sold out", left: "stock left" };
  if (col("id") < 0) return toast("That file has no id column. Start from Export CSV.", "error");
  let matched = 0;
  let missed = 0;
  for (const r of rows.filter((x) => x.some((v) => v.trim()))) {
    const id = r[col("id")]?.trim();
    const kind = r[col("kind")]?.trim().toLowerCase() === "tea" ? "t" : "p";
    if (!$(`[data-bulk^="${kind}|${CSS.escape(id)}|"]`, form)) {
      missed++;
      continue;
    }
    matched++;
    for (const [field, name] of Object.entries(COLS)) {
      if (col(name) < 0) continue;
      const x = $(`[data-bulk="${field === "left" ? "s" : kind}|${CSS.escape(id)}|${field}"]`, form);
      if (!x) continue;
      const v = String(r[col(name)] ?? "").trim();
      if (x.type === "checkbox") x.checked = /^(yes|y|true|1)$/i.test(v);
      else x.value = v.replace(/^\$/, "");
    }
  }
  bulkCount(form);
  toast(`${matched} product${matched === 1 ? "" : "s"} filled in from the file. Check the changes, then save.${missed ? ` ${missed} row${missed === 1 ? "" : "s"} didn't match a product: add new ones in Products.` : ""}`);
});
document.addEventListener("click", (e) => {
  const reset = (e.target as any).closest?.("[data-bulk-reset]");
  if (!reset) return;
  const form = reset.closest("[data-bulk-form]");
  for (const x of $$("[data-bulk]", form)) x.type === "checkbox" ? (x.checked = x.dataset.was === "1") : (x.value = x.dataset.was);
  bulkCount(form);
});
document.addEventListener("submit", async (e) => {
  const form = (e.target as any).closest?.("[data-bulk-form]");
  if (!form) return;
  e.preventDefault();
  const body: any = { products: [], teas: [], stock: [] };
  const by = { p: new Map(), t: new Map() };
  for (const x of $$("[data-bulk]", form)) {
    if (bulkValue(x) === x.dataset.was) continue;
    const [kind, id, field] = x.dataset.bulk.split("|");
    const value = x.type === "checkbox" ? x.checked : x.value.trim();
    if (kind === "s") body.stock.push({ key: id, left: value === "" ? null : value });
    else {
      if (!by[kind].has(id)) by[kind].set(id, { id });
      by[kind].get(id)[field] = value;
    }
  }
  body.products = [...by.p.values()];
  body.teas = [...by.t.values()];
  const button = $("[type=submit]", form);
  button.disabled = true;
  try {
    const r = await api("/api/admin/products/bulk", { method: "POST", body });
    toast(r.warning || `Saved ${r.updated} change${r.updated === 1 ? "" : "s"}.`, r.warning ? "error" : undefined);
    await route();
  } catch (error) {
    button.disabled = false;
    toast(error.message, "error");
  }
});

// Under the coffee and tea lists: whether the products are in Google (Merchant Center), sent
// there by the server as they change.
function googleLine(g, tab) {
  if (!g || !["all", "teas"].includes(tab)) return "";
  if (!g.live) return `<p class="muted sync-line">${icon("synced", "i i-sm")} Goes to Google when the shop opens.</p>`;
  if (!g.ok) return `<p class="muted sync-line">${icon("syncError", "i i-sm")} Google didn't update. It tries again with the next change.</p>`;
  if (!g.at) return `<p class="muted sync-line">${icon("synced", "i i-sm")} Going to Google shortly.</p>`;
  const failed = g.failed ? ` · ${g.failed} didn't update` : "";
  return `<p class="muted sync-line">${icon(g.failed ? "syncError" : "synced", "i i-sm")} ${g.count} in Google, updated ${esc(ago(g.at))}${failed}</p>`;
}

// Photos are resized in the browser (longest side 1600px) before upload. PNG and WebP keep
// their transparency, so a cut-out bag stands on the shop's tile with its shadow.
async function resizePhoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPEG, PNG or WebP photo.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const type = file.type === "image/jpeg" ? "image/jpeg" : "image/webp";
  let url = canvas.toDataURL(type, 0.86);
  if (!url.startsWith(`data:${type}`)) url = canvas.toDataURL("image/png"); // no WebP encoder
  return url;
}

function productForm(prod = null) {
  const c = state.catalog;
  if (prod) viewed(`data-prod="${esc(prod.id)}" data-kind="coffee"`, "products", prod.name, "Coffee");
  const p = prod || { type: "Filter", ground: true, visible: true, badges: [], color: "#2b2b2b", photoFit: "contain" };
  let pendingPhoto = null; // a new product's photo waits until the product exists
  const field = (name, label, attrs = "") => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(p[name] ?? "")}" ${attrs}></label>`;
  editingNext = prod ? `product:${prod.id}` : null;
  // Save sits top right (it submits the form below from there), as in Shopify.
  const actions = `${
    prod
      ? `<a class="btn" href="/products/${encodeURIComponent(prod.id)}" target="_blank" rel="noopener">${icon("ext")}<span>View in shop</span></a>
      <details class="order-menu">
        <summary class="btn">More actions${icon("ChevronDown")}</summary>
        <div class="order-menu-list"><button type="button" class="is-danger" data-delete-product>${icon("trash")}<span>Delete product</span></button></div>
      </details>`
      : ""
  }<button type="submit" form="product-form" class="btn btn-primary">${prod ? "Save" : "Add product"}</button>`;
  // A product as its own page: what it is and costs on the left; whether it's on sale, its photo
  // and its look on the right; Save at the foot.
  // A product in tabs: Details (the form), Stock (what's left and its roast dates, Restock or
  // Adjust) and Roasts (roasted and planned).
  const tabs = prod ? recordTabs("product", [["details", "Details"], ["stock", "Stock"], ["roasts", "Roasts"]]) : null;
  const drawer = openPanel(prod ? prod.short || prod.name : "New product", `
    ${tabs ? `${tabs.bar}<div class="rec-pane" role="tabpanel" data-rpane="product|details" ${recTabs.product && recTabs.product !== "details" ? "hidden" : ""}>` : ""}
    <form class="product-form product-page" id="product-form" data-product-form>
      <div class="order-cols">
      <div class="order-main">
        <section class="panel form-stack">
          ${field("name", "Full name", 'required placeholder="e.g. Muhathi Estate AB, Kenya, Filter"')}
          ${field("short", "Short name", 'placeholder="e.g. Muhathi Estate AB"')}
          <label class="field"><span>About</span><textarea name="about" rows="4" placeholder="A sentence or two for the product page.">${esc(p.about || "")}</textarea></label>
        </section>
        <section class="panel form-stack">
          <h3 class="panel-title">Coffee</h3>
          ${field("notes", "Tasting notes", 'placeholder="e.g. Black Cherry, Blood Orange, Cane Sugar"')}
          <div class="form-row-2">
            ${field("region", "Region")}
            ${field("process", "Process")}
          </div>
          <div class="form-row-2">
            ${field("variety", "Variety")}
            ${field("altitude", "Altitude", 'placeholder="e.g. 1,750 masl"')}
          </div>
        </section>
        <section class="panel form-stack">
          <h3 class="panel-title">Pricing</h3>
          <div class="form-row-2">
            ${field("price", "Price, 250g", 'inputmode="decimal" required')}
            ${field("price1kg", "Price, 1kg", 'inputmode="decimal" required')}
          </div>
          <label class="field"><span>Supplier</span><select name="supplierId">
            <option value="">None</option>
            ${(state.suppliers || []).map((s) => `<option value="${esc(s.id)}" ${p.supplierId === s.id ? "selected" : ""}>${esc(s.name)}</option>`).join("")}
          </select></label>
          <div class="form-row-2">
            ${field("cost250", "Our cost, 250g", 'inputmode="decimal"')}
            ${field("cost1kg", "Our cost, 1kg", 'inputmode="decimal"')}
          </div>
          ${prod && state.roastCosts?.[prod.id] ? `<p class="roast-cost">Green coffee from the last ${state.roastCosts[prod.id].roasts === 1 ? "roast" : `${state.roastCosts[prod.id].roasts} roasts`}: <strong>${money(state.roastCosts[prod.id].perBag)}</strong> a 250g bag <button type="button" class="btn btn-sm" data-use-roast-cost="${state.roastCosts[prod.id].perBag}">Use as Cost</button></p>` : ""}
          <fieldset class="field">
        <legend>Labels</legend>
        ${
          c.labels.length
            ? `<div class="pill-picks"><label class="pill-pick"><input type="radio" name="badges" value="" ${p.badges.length ? "" : "checked"}><span>None</span></label>${c.labels.map((l) => `<label class="pill-pick"><input type="radio" name="badges" value="${esc(l.id)}" ${p.badges[0] === l.id ? "checked" : ""}><span>${esc(l.name)}${l.discount ? ` <b>−${l.discount}%</b>` : ""}</span></label>`).join("")}</div>`
            : `<p class="muted">No labels yet.</p>`
        }
        <p class="sale-note" data-sale-note></p>
        <a class="link" href="#products/labels" data-close>Manage labels</a>
      </fieldset>
        </section>
      </div>
      <div class="order-side">
        <section class="panel form-stack">
          <h3 class="panel-title">Status</h3>
          <label class="switch-row"><span><strong>Show in the shop</strong></span><input type="checkbox" name="visible" ${p.visible ? "checked" : ""}><i aria-hidden="true"></i></label>
          <label class="switch-row"><span><strong>Sold out</strong></span><input type="checkbox" name="soldOut" ${p.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label>
        </section>
        <section class="panel form-stack">
          <h3 class="panel-title">Photo</h3>
          <section class="photo-field">
        <div class="photo-preview ${p.image ? "" : "is-empty"}" data-photo-preview style="--swatch:${esc(p.color)}">
          ${p.image ? `<img src="${imgSrc(p.image)}" alt="">` : `<span>${icon("image", "i i-xl")}<small>No photo yet</small></span>`}
        </div>
        <div class="photo-actions">
          <label class="btn btn-sm">${icon("image")}<span>${p.image ? "Replace photo" : "Add photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-photo-input hidden></label>
          ${p.image ? `<button type="button" class="btn btn-sm btn-ghost" data-photo-remove>Remove</button>` : ""}
          <label class="field field-inline"><span>Show as</span><select name="photoFit">
            <option value="contain" ${p.photoFit !== "cover" ? "selected" : ""}>Cut-out, with shadow</option>
            <option value="cover" ${p.photoFit === "cover" ? "selected" : ""}>Fill the tile</option></select></label>
        </div>
      </section>
        </section>
        <section class="panel form-stack">
          <h3 class="panel-title">Look</h3>
          <label class="field"><span>Label color</span><span class="color-field"><input type="color" name="color" value="${esc(p.color)}"><code data-color-code>${esc(p.color)}</code></span></label>
          <fieldset class="field">
        <legend>Roast</legend>
        <div class="segmented">${c.roastTypes.map((t) => `<label><input type="radio" name="type" value="${t}" ${p.type === t ? "checked" : ""}><span>${t}</span></label>`).join("")}</div>
        <label class="checkbox"><input type="checkbox" name="ground" ${p.ground !== false ? "checked" : ""}> Ground: <span data-roast-name>${esc(p.type)}</span></label>
      </fieldset>
        </section>
      </div>
      </div>
    </form>${tabs ? `</div>${tabs.pane("stock", `<div data-prod-stock><section class="panel"><p class="muted">Loading…</p></section></div>`)}${tabs.pane("roasts", `<section class="panel" data-prod-roasts><p class="muted">Loading…</p></section>`)}` : ""}`, { page: "Products", actions, subtitle: prod ? prod.name : "", badges: prod ? (prod.visible ? (prod.soldOut ? `<span class="badge p-unpaid"><i></i>Sold out</span>` : `<span class="badge sub-active"><i></i>In the shop</span>`) : `<span class="badge"><i></i>Hidden</span>`) : "" });
  const form = $("[data-product-form]", drawer);
  if (prod) {
    api("/api/admin/stock")
      .then(({ stock }) => {
        state.stock = stock;
        const box = $("[data-prod-stock]", drawer);
        const i = stock.items.find((x) => x.key === prod.id);
        if (!box) return;
        box.innerHTML = !i
          ? `<section class="panel"><p class="muted">Not counted.</p></section>`
          : `<section class="panel"><div class="rec-stock"><span><small>Left</small><strong>${i.left == null ? "Not counted" : `${i.left} ${esc(i.unit)}`}</strong></span>${i.reorderAt != null ? `<span><small>Reorder at</small><strong>${i.reorderAt}</strong></span>` : ""}${i.waiting ? `<span><small>Waiting for it</small><strong>${i.waiting}</strong></span>` : ""}</div>${i.left != null ? stockBar(i.left, i.reorderAt, i.unit) : ""}
              ${(i.lots || []).length ? `<div class="list">${i.lots.map((l) => `<div class="list-row"><span class="list-main"><strong>${l.date ? `Roasted ${esc(dayShort(`${l.date}T12:00:00`))}` : "From before roasts were logged"}</strong></span><span class="list-side"><strong>${l.bags}</strong><small class="muted">bags</small></span></div>`).join("")}</div>` : ""}
              <div class="btn-row"><button type="button" class="btn" data-prod-stock-open>${icon("edit")}<span>Restock or Adjust</span></button></div></section>`;
      })
      .catch(() => {});
    api("/api/admin/roasting")
      .then((r) => {
        const box = $("[data-prod-roasts]", drawer);
        if (!box) return;
        const mine = (r.batches || []).filter((b) => b.product === prod.id).sort((a, b) => b.date.localeCompare(a.date));
        box.innerHTML = mine.length
          ? `<div class="list">${mine.map((b) => `<div class="list-row"><span class="list-main"><strong>${esc(dayShort(`${b.date}T12:00:00`))}</strong><small>${esc(b.greenName)}${b.roasterName ? ` · ${esc(b.roasterName)}` : ""}</small></span><span class="list-side"><span class="badge ${b.status === "roasted" ? "t-green" : "t-blue"}"><i></i>${b.status === "roasted" ? "Roasted" : "Planned"}</span><small class="muted">${esc(kgText(b.greenKg))}${b.status === "roasted" && b.bags ? ` · ${b.bags} bags` : ` · about ${b.expectedBags} bags`}</small></span></div>`).join("")}</div>`
          : `<div class="empty">${icon("roasting", "i i-xl")}<p><strong>No roasts yet</strong></p></div>`;
      })
      .catch(() => {});
    drawer.addEventListener("click", (e) => {
      if ((e.target as HTMLElement).closest?.("[data-prod-stock-open]")) stockHistoryPanel(prod.id);
    });
  }

  const saleNote = () => {
    const off = Math.max(0, ...$$("[name=badges]:checked", form).map((b) => c.labels.find((l) => l.id === b.value)?.discount || 0));
    const price = Number(form.price.value.replace(/[^0-9.]/g, ""));
    $("[data-sale-note]", form).innerHTML = off && price > 0 ? `${icon("label", "i i-sm")} On sale: <s>${money(price)}</s> <strong>${money(salePrice(price, off))}</strong> for 250g (${off}% off)` : "";
  };
  saleNote();
  form.addEventListener("input", (e) => {
    if (e.target.name === "color") {
      $("[data-color-code]", form).textContent = e.target.value;
      $("[data-photo-preview]", form).style.setProperty("--swatch", e.target.value);
    }
    saleNote();
  });
  form.addEventListener("change", (e) => {
    if (e.target.name === "type") $("[data-roast-name]", form).textContent = e.target.value;
    saleNote();
  });

  const showPreview = (url) => {
    const box = $("[data-photo-preview]", form);
    box.classList.remove("is-empty");
    box.innerHTML = `<img src="${esc(url)}" alt="">`;
  };
  const replaceCatalog = (cat, id) => {
    state.catalog = cat;
    render();
    const fresh = cat.products.find((x) => x.id === id);
    if (fresh) productForm(fresh);
  };

  $("[data-photo-input]", form).addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await resizePhoto(file);
      showPreview(url);
      if (!prod) {
        pendingPhoto = url;
        return;
      }
      const result = await api(`/api/admin/products/${prod.id}/photo`, { method: "PUT", body: { dataUrl: url } });
      toast("Photo saved");
      replaceCatalog(result.catalog, prod.id);
    } catch (error) {
      panelError(error.message);
    }
  });

  drawer.onclick = async (e) => {
    $$("details.order-menu[open]", drawer).forEach((d) => (!d.contains(e.target) || e.target.closest(".order-menu-list button, .order-menu-list a")) && d.removeAttribute("open"));
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-photo-remove]")) {
      if (!confirm("Remove this photo? The shop will show the drawn bag instead.")) return;
      try {
        replaceCatalog((await api(`/api/admin/products/${prod.id}/photo`, { method: "DELETE" })).catalog, prod.id);
        toast("Photo removed");
      } catch (error) {
        panelError(error.message);
      }
    }
    if (e.target.closest("[data-delete-product]")) {
      if (!confirm(`Delete ${prod.short || prod.name}? It disappears from the shop and from carts at checkout. Past orders keep their details.\n\nTo take it off sale for now, untick "Show in the shop" instead.`)) return;
      try {
        state.catalog = (await api(`/api/admin/products/${prod.id}`, { method: "DELETE" })).catalog;
        closeDrawer();
        render();
        toast(`${prod.short || prod.name} deleted`);
      } catch (error) {
        panelError(error.message);
      }
    }
  };

  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    const body = {
      name: f.name.value,
      short: f.short.value,
      color: f.color.value,
      type: f.type.value,
      ground: f.ground.checked,
      price: f.price.value,
      price1kg: f.price1kg.value,
      badges: $$("[name=badges]:checked", f).map((x) => x.value).filter(Boolean),
      notes: f.notes.value,
      region: f.region.value,
      process: f.process.value,
      variety: f.variety.value,
      altitude: f.altitude.value,
      about: f.about.value,
      visible: f.visible.checked,
      soldOut: f.soldOut.checked,
      photoFit: f.photoFit.value,
      supplierId: f.supplierId.value,
      cost250: f.cost250.value,
      cost1kg: f.cost1kg.value,
    };
    const button = $('[type=submit][form="product-form"]', drawer);
    button.disabled = true;
    try {
      let result = await api(prod ? `/api/admin/products/${prod.id}` : "/api/admin/products", { method: prod ? "PATCH" : "POST", body });
      if (!prod && pendingPhoto) result = await api(`/api/admin/products/${result.product.id}/photo`, { method: "PUT", body: { dataUrl: pendingPhoto } });
      state.catalog = result.catalog;
      closeDrawer();
      render();
      // Saved: stay on the product's page, as it now is.
      const saved = result.catalog.products.find((x) => x.id === (prod?.id || result.product.id));
      if (saved) productForm(saved);
      toast(prod ? "Product saved" : `${result.product.short || result.product.name} added to the shop`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

// A tea: what the shop's tea page shows (kind, notes, price, the story and what's in it) and the
// lid colour of its cup. No price shows it as Coming Soon.
function teaForm(t0 = null) {
  const c = state.catalog;
  if (t0) viewed(`data-prod="${esc(t0.id)}" data-kind="tea"`, "products", t0.name, "Tea");
  const t = t0 || { visible: true, color: "#c8d3b4", pack: "8 single-serve cups", weightOz: 6, type: c.teaTypes[0], price: null, description: [], ingredients: [] };
  const field = (name, label, attrs = "") => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(t[name] ?? "")}" ${attrs}></label>`;
  const byCountry = [...new Set(c.cultivars.map((x) => x.country))];
  editingNext = t0 ? `tea:${t0.id}` : null;
  const drawer = openPanel(t0 ? t0.short || t0.name : "New tea", `
    <form class="panel form-stack product-form" data-tea-form>
      ${t0 ? `<section class="photo-field">
        <div class="photo-preview photo-preview-sm ${t.image ? "" : "is-empty"}" data-photo-preview style="--swatch:${esc(t.color)}">
          ${t.image ? `<img src="${imgSrc(t.image)}" alt="">` : `<span>${teaThumb(t)}<small>No photo yet</small></span>`}
        </div>
        <div class="photo-actions">
          <label class="btn btn-sm">${icon("image")}<span>${t.image ? "Replace photo" : "Add photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-photo-input hidden></label>
          ${t.photo ? `<button type="button" class="btn btn-sm btn-ghost" data-photo-remove>Use the plain cup</button>` : ""}
        </div>
      </section>` : ""}
      ${field("name", "Full name", 'required placeholder="e.g. Khan, Japan"')}
      <div class="form-row-2">
        ${field("short", "Short name (on the lid)", 'placeholder="e.g. Khan"')}
        <label class="field"><span>Lid color</span><span class="color-field"><input type="color" name="color" value="${esc(t.color)}"><code data-color-code>${esc(t.color)}</code></span></label>
      </div>
      <div class="form-row-2">
        <label class="field"><span>Kind</span><select name="type">${c.teaTypes.map((k) => `<option ${t.type === k ? "selected" : ""}>${esc(k)}</option>`).join("")}</select></label>
        <label class="field"><span>Cultivar</span><select name="cultivar"><option value="">None (or a herbal tea)</option>${byCountry
          .map((country) => `<optgroup label="${esc(country)}">${c.cultivars.filter((x) => x.country === country).map((x) => `<option value="${esc(x.id)}" ${t.cultivar === x.id ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</optgroup>`)
          .join("")}</select></label>
      </div>
      <div class="form-row-2">
        ${field("origin", "Origin", 'placeholder="e.g. Japan"')}
        ${field("blend", "Kind as shown", 'placeholder="e.g. Black tea"')}
      </div>
      <div class="form-row-2">
        ${field("caffeine", "Caffeine", 'placeholder="e.g. Caffeine free, Mild caffeine…"')}
        ${field("notes", "Tasting notes", 'placeholder="e.g. Woody, Citrus, Sweet Spice"')}
      </div>
      <div class="form-row-2">
        <label class="field"><span>Price</span><input name="price" inputmode="decimal" value="${t.price == null ? "" : esc(t.price)}" placeholder="Empty: Coming Soon"></label>
        ${field("weightOz", "Packed weight, oz (for postage)", 'inputmode="decimal" required')}
      </div>
      ${field("pack", "What's in it", 'placeholder="e.g. 8 single-serve cups"')}
      <label class="field"><span>About (under the price)</span><textarea name="about" rows="2">${esc(t.about || "")}</textarea></label>
      <label class="field"><span>The tea (one paragraph per blank line)</span><textarea name="description" rows="5">${esc([].concat(t.description || []).join("\n\n"))}</textarea></label>
      <label class="field"><span>Ingredients (one per line: Name: what it brings)</span><textarea name="ingredients" rows="4" placeholder="e.g. Kuromoji leaves: Delicate sweetness and spice">${esc((t.ingredients || []).map(([k, v]) => (v ? `${k}: ${v}` : k)).join("\n"))}</textarea></label>
      <label class="switch-row"><span><strong>Show in the shop</strong></span><input type="checkbox" name="visible" ${t.visible ? "checked" : ""}><i aria-hidden="true"></i></label>
      <label class="switch-row"><span><strong>Sold out</strong></span><input type="checkbox" name="soldOut" ${t.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${t0 ? "Save" : "Add tea"}</button>
        ${t0 ? `<a class="btn" href="/products/${encodeURIComponent(t0.id)}" target="_blank" rel="noopener">${icon("ext")}<span>View in shop</span></a>` : ""}
        ${t0 ? `<a class="btn" href="/admin/lid/${encodeURIComponent(t0.id)}?guides=1" target="_blank" rel="noopener">${icon("ext")}<span>Lid label</span></a>` : ""}
        ${t0 ? `<button type="button" class="btn btn-danger-ghost" data-delete-tea>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { subtitle: t0 ? t0.name : "" });
  const form = $("[data-tea-form]", drawer);
  form.addEventListener("input", (e) => {
    if (e.target.name === "color") $("[data-color-code]", form).textContent = e.target.value;
  });
  // The photo saves on its own, straight away (a new tea gets one once it's added).
  const photoSaved = (result, message) => {
    state.catalog = result.catalog; // with each tea's photo (its own, or the plain cup)
    render();
    toast(message);
    teaForm(state.catalog.teas.find((x) => x.id === t0.id));
  };
  $("[data-photo-input]", form)?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await resizePhoto(file);
      photoSaved(await api(`/api/admin/teas/${t0.id}/photo`, { method: "PUT", body: { dataUrl: url } }), "Photo saved");
    } catch (error) {
      panelError(error.message);
    }
  });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-photo-remove]")) {
      try {
        photoSaved(await api(`/api/admin/teas/${t0.id}/photo`, { method: "DELETE" }), "Back to the plain cup");
      } catch (error) {
        panelError(error.message);
      }
      return;
    }
    if (e.target.closest("[data-delete-tea]")) {
      if (!confirm(`Delete ${t0.short || t0.name}? It disappears from the shop and from carts at checkout. Past orders keep their details.\n\nTo take it off sale for now, untick "Show in the shop" instead.`)) return;
      try {
        state.catalog = (await api(`/api/admin/teas/${t0.id}`, { method: "DELETE" })).catalog;
        closeDrawer();
        render();
        toast(`${t0.short || t0.name} deleted`);
      } catch (error) {
        panelError(error.message);
      }
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    const body = Object.fromEntries(["name", "short", "color", "type", "cultivar", "origin", "blend", "caffeine", "notes", "price", "weightOz", "pack", "about", "description", "ingredients"].map((k) => [k, f[k].value]));
    body.visible = f.visible.checked;
    body.soldOut = f.soldOut.checked;
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const result = await api(t0 ? `/api/admin/teas/${t0.id}` : "/api/admin/teas", { method: t0 ? "PATCH" : "POST", body });
      state.catalog = result.catalog;
      closeDrawer();
      render();
      toast(t0 ? "Tea saved" : `${result.tea.short || result.tea.name} added to the shop`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

// A food product: what the shop shows (name, category, size, price, photo). No price shows Coming Soon.
function foodForm(x0 = null) {
  const c = state.catalog;
  if (x0) viewed(`data-prod="${esc(x0.id)}" data-kind="food"`, "products", x0.name, "Food");
  const x = x0 || { visible: true, weightOz: 14, price: null, category: "Sauces" };
  const cats = [...new Set((c.foods || []).map((y) => y.category).filter(Boolean))];
  const field = (name, label, attrs = "") => `<label class="field"><span>${label}</span><input name="${name}" value="${esc(x[name] ?? "")}" ${attrs}></label>`;
  const drawer = openPanel(x0 ? x0.short || x0.name : "New product", `
    <form class="panel form-stack product-form" data-food-form>
      ${x0 ? `<section class="photo-field">
        <div class="photo-preview photo-preview-sm ${x.image ? "" : "is-empty"}" data-photo-preview>
          ${x.image ? `<img src="${imgSrc(x.image)}" alt="">` : `<span>${foodThumb(x)}<small>No photo yet</small></span>`}
        </div>
        <div class="photo-actions">
          <label class="btn btn-sm">${icon("image")}<span>${x.image ? "Replace photo" : "Add photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-photo-input hidden></label>
          ${x.photo ? `<button type="button" class="btn btn-sm btn-ghost" data-photo-remove>Remove my photo</button>` : ""}
        </div>
      </section>` : ""}
      ${field("name", "Name", 'required placeholder="e.g. Tofu Stew Sauce"')}
      <div class="form-row-2">
        ${field("short", "Short name (on the card)", 'placeholder="Same as the name if empty"')}
        <label class="field"><span>Category</span><input name="category" list="food-cats" value="${esc(x.category || "")}" required><datalist id="food-cats">${cats.map((k) => `<option value="${esc(k)}">`).join("")}</datalist></label>
      </div>
      <div class="form-row-2">
        <label class="field"><span>Price</span><input name="price" inputmode="decimal" value="${x.price == null ? "" : esc(x.price)}" placeholder="Empty: Coming Soon"></label>
        ${field("weightOz", "Packed weight, oz (for postage)", 'inputmode="decimal" required')}
      </div>
      ${field("pack", "Size or pack", 'placeholder="e.g. 2 kg pouch"')}
      ${field("shopify", "Shopify variant ID (for checkout)", 'inputmode="numeric" placeholder="e.g. 49194530439461"')}
      <label class="field"><span>About (under the price)</span><textarea name="about" rows="4">${esc(x.about || "")}</textarea></label>
      <label class="switch-row"><span><strong>Show in the shop</strong></span><input type="checkbox" name="visible" ${x.visible ? "checked" : ""}><i aria-hidden="true"></i></label>
      <label class="switch-row"><span><strong>Sold out</strong></span><input type="checkbox" name="soldOut" ${x.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${x0 ? "Save" : "Add product"}</button>
        ${x0 ? `<a class="btn" href="/products/${encodeURIComponent(x0.id)}" target="_blank" rel="noopener">${icon("ext")}<span>View in shop</span></a>` : ""}
        ${x0 ? `<button type="button" class="btn btn-danger-ghost" data-delete-food>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { subtitle: x0 ? x0.name : "" });
  const form = $("[data-food-form]", drawer);
  const photoSaved = (result, message) => {
    state.catalog = result.catalog;
    render();
    toast(message);
    foodForm(state.catalog.foods.find((y) => y.id === x0.id));
  };
  $("[data-photo-input]", form)?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await resizePhoto(file);
      photoSaved(await api(`/api/admin/foods/${x0.id}/photo`, { method: "PUT", body: { dataUrl: url } }), "Photo saved");
    } catch (error) {
      panelError(error.message);
    }
  });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-photo-remove]")) {
      try {
        photoSaved(await api(`/api/admin/foods/${x0.id}/photo`, { method: "DELETE" }), "Photo removed");
      } catch (error) {
        panelError(error.message);
      }
      return;
    }
    if (e.target.closest("[data-delete-food]")) {
      if (!confirm(`Delete ${x0.short || x0.name}? It disappears from the shop and from carts at checkout. Past orders keep their details.\n\nTo take it off sale for now, untick "Show in the shop" instead.`)) return;
      try {
        state.catalog = (await api(`/api/admin/foods/${x0.id}`, { method: "DELETE" })).catalog;
        closeDrawer();
        render();
        toast(`${x0.short || x0.name} deleted`);
      } catch (error) {
        panelError(error.message);
      }
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    const body = Object.fromEntries(["name", "short", "category", "price", "weightOz", "pack", "shopify", "about"].map((k) => [k, f[k].value]));
    body.visible = f.visible.checked;
    body.soldOut = f.soldOut.checked;
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const result = await api(x0 ? `/api/admin/foods/${x0.id}` : "/api/admin/foods", { method: x0 ? "PATCH" : "POST", body });
      state.catalog = result.catalog;
      closeDrawer();
      render();
      toast(x0 ? "Product saved" : `${result.food.short || result.food.name} added to the shop`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}
/* ── Café menu: sections and items. Saves go to Square's item library too. ── */

const DIET = { V: "Vegetarian", VG: "Vegan", GF: "Gluten free", DF: "Dairy free" };
const KIND_LABEL = { hot: "Hot drink", iced: "Iced drink", food: "Food" };
const menuThumb = (x) =>
  x.image ? `<span class="thumb"><img src="${imgSrc(x.image)}" alt="" loading="lazy"></span>` : `<span class="thumb thumb-kind" aria-hidden="true">${icon(x.kind)}</span>`;
const syncMark = (x) =>
  !state.square
    ? ""
    : x.squareError
      ? `<span class="sync is-error" title="Square didn't update">${icon("syncError")}</span>`
      : x.squareItemId
        ? `<span class="sync" title="In Square">${icon("synced")}</span>`
        : "";

function menuView() {
  const m = state.menu;
  const q = state.query.toLowerCase();
  const all = m.sections.flatMap((x) => x.items);
  const failed = all.filter((x) => x.squareError);
  const sections = m.sections.map((sec) => ({ ...sec, items: sec.items.filter((x) => !q || `${x.name} ${x.note}`.toLowerCase().includes(q)) })).filter((sec) => !q || sec.items.length);
  return `
    <section class="card live-card ${state.cafesLive ? "is-live" : ""}">
      <div>
        <h2><i class="live-dot" aria-hidden="true"></i>Pour bars ${state.cafesLive ? "live" : "hidden"}</h2>
      </div>
      <button type="button" class="btn ${state.cafesLive ? "" : "btn-primary"}" data-cafes-live="${state.cafesLive ? "off" : "on"}">${state.cafesLive ? "Hide from the website" : "Go live"}</button>
    </section>
    ${state.square && failed.length ? `<p class="notice">${failed.length} item${failed.length === 1 ? "" : "s"} didn't update in Square. Open and save to retry.</p>` : ""}
    <section class="card options-card">
      <header class="card-head"><div><h2>Drink options</h2></div><button type="button" class="btn btn-sm" data-option-new>${icon("plus")}<span>New Group</span></button></header>
      ${
        (m.optionSets || []).length
          ? `<div class="list">${m.optionSets
              .map(
                (o) => `<button type="button" class="list-row" data-option-edit="${esc(o.id)}">
                  <span class="list-main"><strong>${esc(o.name)}</strong><small>${o.choices.map((c) => `${esc(c.name)}${c.price ? ` +${money(c.price)}` : ""}`).join(" · ")}</small></span>
                  <span class="list-side"><small>${o.multi ? "Pick any" : "Pick one"} · on ${all.filter((x) => (x.options || []).includes(o.id)).length} item${all.filter((x) => (x.options || []).includes(o.id)).length === 1 ? "" : "s"}</small></span>
                </button>`
              )
              .join("")}</div>`
          : `<div class="empty"><p class="muted">No option groups yet.</p></div>`
      }
    </section>
    ${
      sections.length
        ? sections
            .map(
              (sec, si) => `
      <section class="card table-card menu-section">
        <header class="menu-section-head">
          <h2>${esc(sec.title)} <span class="muted">${sec.items.length}</span></h2>
          <span class="move">
            <button type="button" class="icon-btn" data-section-edit="${esc(sec.id)}" aria-label="Rename ${esc(sec.title)}">${icon("edit")}</button>
            ${q ? "" : `<button type="button" class="icon-btn" data-menu-move="section:${esc(sec.id)}" data-dir="up" aria-label="Move ${esc(sec.title)} up" ${si === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
            <button type="button" class="icon-btn" data-menu-move="section:${esc(sec.id)}" data-dir="down" aria-label="Move ${esc(sec.title)} down" ${si === sections.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button>`}
          </span>
        </header>
        ${
          sec.items.length
            ? `<table class="table menu-table"><tbody>${sec.items
                .map(
                  (x, i) => `<tr data-menu-item="${esc(x.id)}" class="clickable${x.visible ? "" : " is-hidden"}">
                    <td class="c-product">${menuThumb(x)}<span><strong>${esc(x.name)}</strong><small>${esc([x.note || KIND_LABEL[x.kind], (x.options || []).map((id) => (m.optionSets || []).find((o) => o.id === id)?.name).filter(Boolean).join(" · "), x.madeOnArrival ? "Made on arrival" : ""].filter(Boolean).join(" · "))}</small></span></td>
                    <td class="c-diet">${x.tags.map((t) => `<span class="pill pill-quiet" title="${DIET[t]}">${t}</span>`).join("")}</td>
                    <td class="num c-price"><strong>${money(x.price)}</strong></td>
                    <td class="c-status">${x.visible ? "" : `<span class="badge"><i></i>Hidden</span>`}${x.lowStock && !x.soldOut ? `<span class="badge badge-warn"><i></i>Low stock</span>` : ""}<label class="mini-switch" title="Sold out"><span>Sold out</span><input type="checkbox" data-sold-out="${esc(x.id)}" ${x.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label>${syncMark(x)}</td>
                    <td class="c-move">${q ? "" : `<span class="move">
                      <button type="button" class="icon-btn" data-menu-move="item:${esc(x.id)}" data-dir="up" aria-label="Move ${esc(x.name)} up" ${i === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
                      <button type="button" class="icon-btn" data-menu-move="item:${esc(x.id)}" data-dir="down" aria-label="Move ${esc(x.name)} down" ${i === sec.items.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button></span>`}</td>
                  </tr>`
                )
                .join("")}</tbody></table>`
            : `<p class="muted menu-empty">No items yet.</p>`
        }
      </section>`
            )
            .join("")
        : `<section class="card"><div class="empty empty-lg">${icon("cafeMenu", "i i-xl")}<p><strong>${q ? "Nothing on the menu matches that" : "The menu is empty"}</strong></p>${q ? "" : `<button type="button" class="btn btn-primary" data-form="section">${icon("plus")}<span>New Section</span></button>`}</div></section>`
    }`;
}

// A drink option group: its choices (name and add-on price), pick one or pick any.
function optionSetForm(set = null) {
  const o = set || { name: "", multi: false, choices: [{ name: "", price: 0 }] };
  const row = (c = { name: "", price: 0 }) => `<div class="choice-row" data-choice>
      <input name="choiceName" value="${esc(c.name)}" placeholder="e.g. Oat milk" maxlength="40" aria-label="Choice">
      <input name="choicePrice" value="${c.price ? esc(Number(c.price).toFixed(2)) : ""}" inputmode="decimal" placeholder="+0.00" aria-label="Extra price">
      <button type="button" class="icon-btn" data-choice-remove aria-label="Remove">${icon("trash")}</button>
    </div>`;
  editingNext = set ? `options:${set.id}` : null;
  const drawer = openPanel(set ? set.name : "New Option Group", `
    <form class="panel form-stack" data-option-form>
      <label class="field"><span>Name</span><input name="name" value="${esc(o.name)}" required maxlength="40" placeholder="e.g. Milk"></label>
      <fieldset class="field">
        <legend>Customers</legend>
        <div class="segmented">
          <label><input type="radio" name="multi" value="0" ${o.multi ? "" : "checked"}><span>Pick one</span></label>
          <label><input type="radio" name="multi" value="1" ${o.multi ? "checked" : ""}><span>Pick any</span></label>
        </div>
        <small class="muted">The first choice is the default.</small>
      </fieldset>
      <fieldset class="field">
        <legend>Choices and extra price</legend>
        <div class="choice-rows" data-choices>${o.choices.map(row).join("")}</div>
        <button type="button" class="btn btn-sm" data-choice-add>${icon("plus")}<span>Add Choice</span></button>
      </fieldset>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${set ? "Save" : "Create group"}</button>
        ${set ? `<button type="button" class="btn btn-danger-ghost" data-option-delete>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { modal: true });
  const f = $("[data-option-form]", drawer);
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-choice-add]")) return $("[data-choices]", f).insertAdjacentHTML("beforeend", row());
    const rm = e.target.closest("[data-choice-remove]");
    if (rm) return $$("[data-choice]", f).length > 1 && rm.closest("[data-choice]").remove();
    if (e.target.closest("[data-option-delete]")) {
      if (!confirm(`Delete the ${set.name} options? They come off every item that has them.`)) return;
      try {
        state.menu = (await api(`/api/admin/menu/options/${set.id}`, { method: "DELETE" })).menu;
        closeDrawer();
        render();
        toast("Option group deleted");
      } catch (error) {
        panelError(error.message);
      }
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const body = {
      name: f.name.value,
      multi: f.multi.value === "1",
      choices: $$("[data-choice]", f).map((r) => ({ name: $("[name=choiceName]", r).value, price: $("[name=choicePrice]", r).value })),
    };
    try {
      const result = await api(set ? `/api/admin/menu/options/${set.id}` : "/api/admin/menu/options", { method: set ? "PATCH" : "POST", body });
      state.menu = result.menu;
      closeDrawer();
      render();
      toast(set ? "Options saved" : `${result.optionSet.name} options created`);
    } catch (error) {
      panelError(error.message);
      flagFields(f, error.message);
    }
  };
}

function sectionForm(sec = null) {
  editingNext = sec ? `section:${sec.id}` : null;
  const drawer = openPanel(sec ? sec.title : "New Section", `
    <form class="panel form-stack" data-section-form>
      <label class="field"><span>Name</span><input name="title" value="${esc(sec?.title || "")}" required maxlength="40" placeholder="e.g. Pastries"></label>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${sec ? "Save" : "Add section"}</button>
        ${sec ? `<button type="button" class="btn btn-danger-ghost" data-delete-section>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { modal: true });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (!e.target.closest("[data-delete-section]")) return;
    if (!confirm(`Delete the section “${sec.title}”?`)) return;
    try {
      state.menu = (await api(`/api/admin/menu/sections/${sec.id}`, { method: "DELETE" })).menu;
      closeDrawer();
      render();
      toast("Section deleted");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const result = await api(sec ? `/api/admin/menu/sections/${sec.id}` : "/api/admin/menu/sections", { method: sec ? "PATCH" : "POST", body: { title: e.target.title.value } });
      state.menu = result.menu;
      closeDrawer();
      render();
      toast(result.warning || (sec ? "Section saved" : "Section added"));
    } catch (error) {
      panelError(error.message);
    }
  };
}

function menuItemForm(item = null) {
  const m = state.menu;
  const x = item || { kind: "hot", tags: [], visible: true, soldOut: false, sectionId: m.sections[0]?.id, color: "#c9a27e", shape: "croissant" };
  if (!m.sections.length) return sectionForm();
  let pendingPhoto = null;
  editingNext = item ? `menu:${item.id}` : null;
  const drawer = openPanel(item ? item.name : "New menu item", `
    <form class="panel form-stack" data-menu-form>
      <section class="photo-field">
        <div class="photo-preview photo-preview-sm ${x.image ? "" : "is-empty"}" data-photo-preview style="--swatch:${esc(x.color || "#c9a27e")}">
          ${x.image ? `<img src="${imgSrc(x.image)}" alt="">` : `<span>${icon(x.kind, "i i-xl")}<small>No photo yet</small></span>`}
        </div>
        <div class="photo-actions">
          <label class="btn btn-sm">${icon("image")}<span>${x.image ? "Replace photo" : "Add photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-photo-input hidden></label>
          ${x.image ? `<button type="button" class="btn btn-sm btn-ghost" data-photo-remove>Remove</button>` : ""}
        </div>
      </section>
      <label class="field"><span>Name</span><input name="name" value="${esc(x.name || "")}" required maxlength="80"></label>
      <div class="form-row-2">
        <label class="field"><span>Section</span><select name="sectionId">${m.sections.map((sec) => `<option value="${esc(sec.id)}" ${sec.id === x.sectionId ? "selected" : ""}>${esc(sec.title)}</option>`).join("")}</select></label>
        <label class="field"><span>Price</span><input name="price" inputmode="decimal" value="${x.price != null ? esc(x.price.toFixed(2)) : ""}" required></label>
      </div>
      <label class="field"><span>Description</span><input name="note" value="${esc(x.note || "")}" maxlength="160" placeholder="Optional, e.g. Sourdough, lemon, chilli"></label>
      <fieldset class="field">
        <legend>Dietary</legend>
        <div class="pill-picks">${m.tags.map((t) => `<label class="pill-pick"><input type="checkbox" name="tags" value="${t}" ${x.tags.includes(t) ? "checked" : ""}><span>${DIET[t]}</span></label>`).join("")}</div>
      </fieldset>
      <fieldset class="field">
        <legend>Type</legend>
        <div class="segmented">${m.kinds.map((k) => `<label><input type="radio" name="kind" value="${k}" ${x.kind === k ? "checked" : ""}><span>${KIND_LABEL[k]}</span></label>`).join("")}</div>
      </fieldset>
      <div class="form-row-2" data-art>
        <label class="field" data-shape ${x.kind === "food" ? "" : "hidden"}><span>Drawing (without a photo)</span><select name="shape">${m.shapes.map((sh) => `<option value="${sh}" ${x.shape === sh ? "selected" : ""}>${sh === "painchoc" ? "Pain au chocolat" : sh[0].toUpperCase() + sh.slice(1)}</option>`).join("")}</select></label>
        <label class="field" data-colour ${x.kind === "iced" ? "" : "hidden"}><span>Drink color</span><span class="color-field"><input type="color" name="color" value="${esc(x.color || "#c9a27e")}"></span></label>
      </div>
      ${
        (m.optionSets || []).length
          ? `<fieldset class="field">
        <legend>Options</legend>
        <div class="pill-picks">${m.optionSets.map((o) => `<label class="pill-pick"><input type="checkbox" name="options" value="${esc(o.id)}" ${(x.options || []).includes(o.id) ? "checked" : ""}><span>${esc(o.name)}</span></label>`).join("")}</div>
      </fieldset>`
          : ""
      }
      <label class="switch-row"><span><strong>Made on arrival</strong></span><input type="checkbox" name="madeOnArrival" ${x.madeOnArrival ? "checked" : ""}><i aria-hidden="true"></i></label>
      <label class="switch-row"><span><strong>Low stock</strong></span><input type="checkbox" name="lowStock" ${x.lowStock ? "checked" : ""}><i aria-hidden="true"></i></label>
      <label class="switch-row"><span><strong>Sold out</strong></span><input type="checkbox" name="soldOut" ${x.soldOut ? "checked" : ""}><i aria-hidden="true"></i></label>
      <label class="switch-row"><span><strong>Show on the menu</strong></span><input type="checkbox" name="visible" ${x.visible ? "checked" : ""}><i aria-hidden="true"></i></label>
      ${item && state.square ? `<p class="muted sync-line">${item.squareError ? `${icon("syncError", "i i-sm")} Square didn't update. Save to try again.` : item.squareSyncedAt ? `${icon("synced", "i i-sm")} In Square, updated ${esc(ago(item.squareSyncedAt))}` : "Not in Square yet. Save to send it."}</p>` : ""}
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${item ? "Save" : "Add to menu"}</button>
        ${item ? `<button type="button" class="btn btn-danger-ghost" data-delete-item-menu>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { subtitle: item ? KIND_LABEL[item.kind] : "" });
  const form = $("[data-menu-form]", drawer);
  form.addEventListener("change", (e) => {
    if (e.target.name !== "kind") return;
    $("[data-shape]", form).hidden = e.target.value !== "food";
    $("[data-colour]", form).hidden = e.target.value !== "iced";
  });
  const after = (result, message) => {
    state.menu = result.menu;
    render();
    toast(result.warning || message);
  };
  $("[data-photo-input]", form).addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const url = await resizePhoto(file);
      const box = $("[data-photo-preview]", form);
      box.classList.remove("is-empty");
      box.innerHTML = `<img src="${esc(url)}" alt="">`;
      if (!item) return (pendingPhoto = url);
      after(await api(`/api/admin/menu/items/${item.id}/photo`, { method: "PUT", body: { dataUrl: url } }), "Photo saved");
      menuItemForm(state.menu.sections.flatMap((s) => s.items).find((i) => i.id === item.id));
    } catch (error) {
      panelError(error.message);
    }
  });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    try {
      if (e.target.closest("[data-photo-remove]")) {
        after(await api(`/api/admin/menu/items/${item.id}/photo`, { method: "DELETE" }), "Photo removed");
        return menuItemForm(state.menu.sections.flatMap((s) => s.items).find((i) => i.id === item.id));
      }
      if (e.target.closest("[data-delete-item-menu]")) {
        if (!confirm(`Delete ${item.name} from the menu${state.square ? " and from Square" : ""}?`)) return;
        after(await api(`/api/admin/menu/items/${item.id}`, { method: "DELETE" }), `${item.name} deleted`);
        closeDrawer();
      }
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    const body = {
      name: f.name.value,
      sectionId: f.sectionId.value,
      price: f.price.value,
      note: f.note.value,
      tags: $$("[name=tags]:checked", f).map((t) => t.value),
      kind: f.kind.value,
      shape: f.shape.value,
      color: f.color.value,
      soldOut: f.soldOut.checked,
      visible: f.visible.checked,
      lowStock: f.lowStock.checked,
      madeOnArrival: f.madeOnArrival.checked,
      options: $$("[name=options]:checked", f).map((o) => o.value),
    };
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      let result = await api(item ? `/api/admin/menu/items/${item.id}` : "/api/admin/menu/items", { method: item ? "PATCH" : "POST", body });
      if (!item && pendingPhoto) result = await api(`/api/admin/menu/items/${result.item.id}/photo`, { method: "PUT", body: { dataUrl: pendingPhoto } });
      closeDrawer();
      after(result, item ? "Saved" : `${body.name} added to the menu`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

// Discount codes: typed in at checkout. Money off (not subscriptions) or free shipping.
// Newsletter: add a list of emails (a CSV from another tool, or pasted).
function importEmailsForm() {
  const drawer = openPanel("Import Emails", `
    <form class="panel form-stack" data-import-form>
      <label class="field"><span>CSV file</span><input name="file" type="file" accept=".csv,.txt,text/csv,text/plain"></label>
      <label class="field"><span>Or paste emails</span><textarea name="text" rows="8" placeholder="One per line, or separated by commas"></textarea></label>
      <label class="checkbox"><input type="checkbox" name="consent" required><span>These people agreed to get our emails.</span></label>
      <div class="drawer-actions"><button type="submit" class="btn btn-primary">Import</button></div>
    </form>`, { modal: true });
  const f = $("[data-import-form]", drawer);
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) closeDrawer();
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const file = f.file.files[0];
    if (file && file.size > 3_500_000) return panelError("That file is too big. Split it into smaller files.");
    const text = `${file ? await file.text() : ""}\n${f.text.value}`;
    if (!text.trim()) return panelError("Choose a file or paste emails.");
    if (!f.consent.checked) return panelError("Confirm these people agreed to get your emails.");
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const r = await api("/api/admin/signups/import", { method: "POST", body: { text, consent: true } });
      state.signups = (await api("/api/admin/signups")).signups;
      closeDrawer();
      render();
      const skipped = [r.already && `${r.already} already on the list`, r.unsubscribed && `${r.unsubscribed} unsubscribed`, r.invalid && `${r.invalid} not valid`].filter(Boolean);
      toast(`${r.added.toLocaleString("en-US")} added${skipped.length ? ` · ${skipped.join(" · ")}` : ""}`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

function promoForm(promo = null) {
  const x = promo || { code: "", kind: "percent", value: "", minSubtotal: 0, endsOn: null, maxUses: null, active: true };
  editingNext = promo ? `promo:${promo.id}` : null;
  const drawer = openPanel(promo ? promo.code : "New Discount Code", `
    <form class="panel form-stack" data-promo-form>
      <label class="field"><span>Code</span><input name="code" value="${esc(x.code)}" required maxlength="24" placeholder="e.g. WELCOME10" autocapitalize="characters" spellcheck="false"></label>
      <fieldset class="field">
        <legend>Gives</legend>
        <div class="segmented">
          ${[["percent", "% off"], ["amount", "$ off"], ["freeship", "Free shipping"]].map(([k, l]) => `<label><input type="radio" name="kind" value="${k}" ${x.kind === k ? "checked" : ""}><span>${l}</span></label>`).join("")}
        </div>
      </fieldset>
      <label class="field" data-value-field ${x.kind === "freeship" ? "hidden" : ""}><span data-value-label>${x.kind === "amount" ? "Amount off ($)" : "Percent off"}</span><input name="value" inputmode="decimal" value="${x.value || ""}"></label>
      <label class="field"><span>Minimum order ($)</span><input name="minSubtotal" inputmode="decimal" value="${x.minSubtotal || ""}" placeholder="None"></label>
      <label class="field"><span>Ends on</span><input name="endsOn" type="date" value="${esc(x.endsOn || "")}"></label>
      <label class="field"><span>Usage limit</span><input name="maxUses" inputmode="numeric" value="${x.maxUses || ""}" placeholder="No limit">${promo ? `<small>Used ${promo.uses} time${promo.uses === 1 ? "" : "s"} so far</small>` : ""}</label>
      <label class="switch-row"><span><strong>Active</strong></span><input type="checkbox" name="active" ${x.active ? "checked" : ""}><i aria-hidden="true"></i></label>
      <p class="muted">Codes don't apply to subscriptions.</p>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${promo ? "Save" : "Create code"}</button>
        ${promo ? `<button type="button" class="btn btn-danger-ghost" data-delete-promo>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { modal: true });
  const f = $("[data-promo-form]", drawer);
  f.addEventListener("change", (e) => {
    if (e.target.name !== "kind") return;
    $("[data-value-field]", f).hidden = e.target.value === "freeship";
    $("[data-value-label]", f).textContent = e.target.value === "amount" ? "Amount off ($)" : "Percent off";
  });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (!e.target.closest("[data-delete-promo]")) return;
    if (!confirm(`Delete the code ${promo.code}? Customers can't use it after this.`)) return;
    try {
      state.promos = (await api(`/api/admin/promos/${promo.id}`, { method: "DELETE" })).promos;
      closeDrawer();
      render();
      toast("Code deleted");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const body = { code: f.code.value, kind: f.kind.value, value: f.value.value, minSubtotal: f.minSubtotal.value, endsOn: f.endsOn.value, maxUses: f.maxUses.value, active: f.active.checked };
      const result = await api(promo ? `/api/admin/promos/${promo.id}` : "/api/admin/promos", { method: promo ? "PATCH" : "POST", body });
      state.promos = result.promos;
      closeDrawer();
      render();
      toast(promo ? "Code saved" : `Code ${result.promo.code} created`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
      flagFields(f, error.message);
    }
  };
}

function labelForm(label = null) {
  const c = state.catalog;
  const l = label || { name: "", discount: 0 };
  editingNext = label ? `label:${label.id}` : null;
  const drawer = openPanel(label ? label.name : "New Label", `
    <form class="panel form-stack" data-label-form>
      <label class="field"><span>Name</span><input name="name" value="${esc(l.name)}" required maxlength="40" placeholder="e.g. New Arrival, Summer Sale"></label>
      <label class="field"><span>Discount (%)</span><input name="discount" inputmode="decimal" value="${l.discount || ""}" placeholder="None"></label>
      <fieldset class="field">
        <legend>Products</legend>
        ${[
          ["Coffee", c.products, productThumb, (p) => `${esc(p.type)} · ${money(p.price)}`],
          ["Tea", c.teas || [], teaThumb, (t) => `${esc(t.type)} · ${t.price ? money(t.price) : "Coming soon"}`],
          ["Accessories", c.accessories || [], (a) => `<span class="thumb">${a.image ? `<img src="${imgSrc(a.image)}" alt="" loading="lazy">` : ""}</span>`, (a) => `${esc(a.category || "")}${a.price ? ` · ${money(a.price)}` : ""}`],
        ]
          .filter(([, list]: any) => list.length)
          .map(
            ([group, list, thumb, sub]: any) => `<p class="check-group">${group}</p><div class="check-list">${list
              .map((p) => `<label class="checkbox">${thumb(p)}<input type="checkbox" name="products" value="${esc(p.id)}" ${label && (p.badges || []).includes(label.id) ? "checked" : ""}><span>${esc(p.short || p.name)}<small>${sub(p)}</small></span></label>`)
              .join("")}</div>`
          )
          .join("")}
      </fieldset>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary">${label ? "Save" : "Create label"}</button>
        ${label ? `<button type="button" class="btn btn-danger-ghost" data-delete-label>${icon("trash")}<span>Delete</span></button>` : ""}
      </div>
    </form>`, { modal: true });
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (!e.target.closest("[data-delete-label]")) return;
    if (!confirm(`Delete the label “${label.name}”? It comes off ${label.count} product${label.count === 1 ? "" : "s"}${label.discount ? ", and their discount ends" : ""}.`)) return;
    try {
      state.catalog = (await api(`/api/admin/product-labels/${label.id}`, { method: "DELETE" })).catalog;
      closeDrawer();
      render();
      toast("Label deleted");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const f: any = e.target;
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const body = { name: f.name.value, discount: f.discount.value, products: $$("[name=products]:checked", f).map((x) => x.value) };
      const result = await api(label ? `/api/admin/product-labels/${label.id}` : "/api/admin/product-labels", { method: label ? "PATCH" : "POST", body });
      state.catalog = result.catalog;
      closeDrawer();
      render();
      toast(label ? "Label saved" : `Label “${result.label.name}” created`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

/* ── Numeral, the blog (/numeral/): posts written here and published when ready ── */

const noteImg = (img) => (!img ? "" : /^(https:|\/)/.test(img) ? img : `/media/${img}`);
const noteStatus = (n) => (n.status === "published" ? `<span class="badge t-green"><i></i>Published</span>` : `<span class="badge"><i></i>Draft</span>`);

// ── Calendar: events and classes (calendar and classes on the site) ──

const calDay = (s) => (s ? new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "No date");
const calTime = (s) => (s && s.length > 10 ? new Date(`2000-01-01T${s.slice(11, 16)}:00Z`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }) : "");
const calPlaces = (x) => (x.capacity ? `${x.taken} of ${x.capacity}` : x.taken ? `${x.taken}` : "—");

function calendarView() {
  const today = shopToday();
  // Undated drafts first (they're being written), then the rest as they come.
  const rows = [...state.calInfo.items].sort((a, b) => Number(Boolean(a.startsAt)) - Number(Boolean(b.startsAt)));
  return `<section class="card table-card">
    ${
      rows.length
        ? `<table class="table nl-table cal-table">
            <thead><tr><th>Event or class</th><th>Date</th><th class="num">Places</th><th>Status</th></tr></thead>
            <tbody>${rows
              .map((x) => {
                const past = x.startsAt && (x.endsAt || x.startsAt).slice(0, 10) < today;
                return `<tr class="row-link${past ? " is-archived" : ""}" data-href="#calendar/${esc(x.id)}">
                  <td><a class="cell-title" href="#calendar/${esc(x.id)}">${esc(x.title || (x.kind === "class" ? "Untitled class" : "Untitled event"))}</a><small class="muted">${esc([x.kind === "class" ? "Class" : "Event", x.place, x.price ? money(x.price) : "Free"].filter(Boolean).join(" · "))}</small></td>
                  <td><small class="nowrap">${esc(calDay(x.startsAt))}${calTime(x.startsAt) ? `, ${esc(calTime(x.startsAt))}` : ""}</small></td>
                  <td class="num">${esc(calPlaces(x))}</td>
                  <td>${past ? `<span class="badge"><i></i>Past</span>` : noteStatus(x)}</td>
                </tr>`;
              })
              .join("")}</tbody>
          </table>`
        : `<div class="empty empty-lg">${icon("calendar", "i i-xl")}<p><strong>Nothing on the calendar yet</strong></p><button type="button" class="btn btn-primary" data-cal-new="event">${icon("plus")}<span>New Event</span></button></div>`
    }
  </section>`;
}

function calendarEditor() {
  const x = state.cal;
  const live = x.status === "published";
  const img = noteImg(x.image);
  const field = (name, label, attrs = "") => `<label class="field"><span>${label}</span><input data-cal-field="${name}" value="${esc(x[name] ?? "")}" ${attrs}></label>`;
  const res = (x.reservations || []).filter((r) => r.status !== "cancelled");
  const tickets = x.tickets || [];
  const pageUrl = x.kind === "class" ? `/classes?id=${x.id}` : x.slug ? `/calendar/${x.slug}` : "/calendar";
  return `
    <div class="nl-editor cal-editor" data-cal-editor>
      <div class="nl-bar">
        <a class="btn btn-ghost btn-sm" href="#calendar">${icon("back")}<span>Calendar</span></a>
        ${noteStatus(x)}
        <small class="muted" data-cal-saved>Saved</small>
        <button type="button" class="btn btn-sm btn-ghost bar-delete" data-cal-delete>${icon("trash")}<span>Delete</span></button>
        <span class="nl-bar-actions">
          ${live ? `<a class="btn btn-sm" href="${esc(pageUrl)}" target="_blank" rel="noopener">${icon("site")}<span>View</span></a>` : ""}
          <button type="button" class="btn btn-sm ${live ? "" : "btn-primary"}" data-cal-publish="${live ? "draft" : "published"}">${icon(live ? "eyeOff" : "send")}<span>${live ? "Unpublish" : "Publish"}</span></button>
        </span>
      </div>
      <div class="cal-columns">
        <div class="nl-compose">
          <section class="card nl-meta"><div class="form-stack">
            <label class="field"><span>Kind</span><select data-cal-field="kind"><option value="event"${x.kind === "event" ? " selected" : ""}>Event</option><option value="class"${x.kind === "class" ? " selected" : ""}>Class</option></select></label>
            ${field("title", "Title", `maxlength="120" placeholder="${x.kind === "class" ? "e.g. Espresso Basics" : "e.g. Cupping at our office"}"`)}
            <div class="form-row-2">
              ${field("startsAt", "Starts", 'type="datetime-local"')}
              ${field("endsAt", "Ends (optional)", 'type="datetime-local"')}
            </div>
            <div class="form-row-2">
              ${field("place", "Place", 'maxlength="80" placeholder="e.g. our office"')}
              ${field("address", "Address (optional)", 'maxlength="160" placeholder="e.g. 327 S Western Ave, Los Angeles"')}
            </div>
            <label class="field"><span>Summary</span><textarea data-cal-field="summary" rows="2" maxlength="300" placeholder="One or two sentences">${esc(x.summary)}</textarea></label>
            <label class="field"><span>Details (optional)</span><textarea data-cal-field="body" rows="7" placeholder="What happens, what to bring, who it's for">${esc(x.body)}</textarea></label>
          </div></section>
          <section class="card nl-block">
            <div class="nl-image">
              <div class="nl-image-preview">${img ? `<img src="${esc(img)}" alt="">` : `<span>${icon("image", "i i-xl")}</span>`}</div>
              <div class="form-stack">
                <span class="note-cover-actions">
                  <label class="btn btn-sm nl-upload">${icon("image")}<span>${img ? "Replace photo" : "Add photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-cal-cover hidden></label>
                  ${img ? `<button type="button" class="btn btn-sm btn-ghost" data-cal-cover-remove>${icon("trash")}<span>Remove</span></button>` : ""}
                </span>
              </div>
            </div>
          </section>
        </div>
        <div class="nl-compose">
          <section class="card nl-meta"><div class="form-stack">
            <div class="form-row-2">
              ${field("price", "Price",'type="number" min="0" step="0.01" inputmode="decimal"')}
              ${field("capacity", x.slotMinutes > 0 && ["reserve", "pay"].includes(x.booking) ? "Places per time slot" : "Places (0 for no limit)", 'type="number" min="0" step="1" inputmode="numeric"')}
            </div>
            ${
              ["reserve", "pay"].includes(x.booking)
                ? `<label class="field"><span>Time slots</span><select data-cal-field="slotMinutes">
                    ${[[0, "None"],[30, "Every 30 minutes"], [60, "Every hour"], [90, "Every 90 minutes"], [120, "Every 2 hours"]]
                      .map(([m, l]) => `<option value="${m}"${Number(x.slotMinutes || 0) === m ? " selected" : ""}>${l}</option>`)
                      .join("")}
                  </select></label>
                  ${x.slotMinutes > 0 ? `<small class="muted">${x.slots?.length ? `${x.slots.length} slots, ${x.slots[0].start} to ${x.slots.at(-1).end}` : "Needs a start and end time on the same day."}</small>` : ""}`
                : ""
            }
            <label class="field"><span>Booking</span><select data-cal-field="booking">
              ${x.price ? `<option value="pay"${x.booking === "pay" ? " selected" : ""}>Paid at checkout</option>` : `<option value="reserve"${x.booking === "reserve" ? " selected" : ""}>Free reservation</option>`}
              <option value="link"${x.booking === "link" ? " selected" : ""}>Link to another site</option>
              <option value="none"${x.booking === "none" ? " selected" : ""}>No booking</option>
            </select></label>
            ${x.booking === "link" ? `${field("link", "Link", 'type="url" placeholder="https://…"')}${field("linkLabel", "Button text", 'maxlength="40" placeholder="e.g. See program"')}` : ""}
          </div></section>
          <section class="card nl-block cal-people">
            <h3>Who's coming</h3>
            ${
              x.slots?.length
                ? `<ul class="cal-slots">${x.slots.map((sl) => `<li><span>${esc(sl.start)}–${esc(sl.end)}</span><span class="muted">${x.capacity ? `${x.capacity - sl.left} of ${x.capacity}` : `${res.filter((r) => r.slot === sl.start).reduce((n, r) => n + r.guests, 0) + tickets.filter((t) => t.slot === sl.start).reduce((n, t) => n + t.qty, 0)}`}</span></li>`).join("")}</ul>`
                : `<p class="muted">${x.capacity ? `${x.taken} of ${x.capacity} places taken` : `${x.taken} place${x.taken === 1 ? "" : "s"} taken`}</p>`
            }
            ${
              res.length || tickets.length
                ? `<ul class="cal-res">${tickets
                    .map((t) => `<li><span><strong>${esc(t.name)}</strong><small class="muted">${esc(t.email)} · ${t.qty} ticket${t.qty === 1 ? "" : "s"}${t.slot ? ` · ${esc(t.slot)}` : ""} · ${esc(day(t.at))}</small></span><a class="btn btn-sm btn-ghost" href="#orders/${esc(t.number)}">${esc(t.number)}</a></li>`)
                    .join("")}${res
                    .map((r) => `<li><span><strong>${esc(r.name)}</strong><small class="muted">${esc(r.email)} · ${r.guests} place${r.guests === 1 ? "" : "s"}${r.slot ? ` · ${esc(r.slot)}` : ""} · ${esc(day(r.at))}</small></span><button type="button" class="btn btn-sm btn-ghost" data-cal-cancel="${esc(r.id)}">Cancel</button></li>`)
                    .join("")}</ul>`
                : `<p class="muted">${x.booking === "pay" ? "No tickets sold yet." : "No reservations yet."}</p>`
            }
          </section>
        </div>
      </div>
    </div>`;
}

let calSaveTimer = 0;
function calSave({ now = false, extra = {} } = {}) {
  clearTimeout(calSaveTimer);
  freshDraft = null;
  const label = $("[data-cal-saved]");
  if (label) label.textContent = "Saving…";
  const run = async () => {
    const x = state.cal;
    if (!x) return;
    try {
      const fields = ["kind", "title", "startsAt", "endsAt", "place", "address", "summary", "body", "image", "price", "capacity", "booking", "link", "linkLabel", "slotMinutes"];
      const body = Object.fromEntries(fields.map((k) => [k, x[k]]));
      if (body.price === "") body.price = 0;
      if (body.capacity === "") body.capacity = 0;
      const { item } = await api(`/api/admin/calendar/${x.id}`, { method: "PATCH", body: { ...body, ...extra } });
      const redraw = Number(x.slotMinutes || 0) !== Number(item.slotMinutes || 0) || JSON.stringify(x.slots || []) !== JSON.stringify(item.slots || []);
      Object.assign(x, { status: item.status, booking: item.booking, price: item.price, capacity: item.capacity, taken: item.taken, slotMinutes: item.slotMinutes || 0, slots: item.slots || [], slug: item.slug, updatedAt: item.updatedAt });
      if (redraw && !document.activeElement?.matches?.("input, textarea")) render(); // the slots line and labels follow
      if ($("[data-cal-saved]")) $("[data-cal-saved]").textContent = "Saved";
      return item;
    } catch (error) {
      if ($("[data-cal-saved]")) $("[data-cal-saved]").textContent = `Not saved: ${error.message}`;
      throw error;
    }
  };
  if (now) return run();
  calSaveTimer = setTimeout(() => run().catch(() => {}), 800);
}

async function calendarClick(t) {
  const add = t.closest("[data-cal-new]");
  if (add) {
    const { item } = await api("/api/admin/calendar", { method: "POST", body: { kind: add.dataset.calNew } });
    newDraft(`/api/admin/calendar/${item.id}`, `#calendar/${item.id}`);
    return true;
  }
  const row = t.closest(".cal-table [data-href]");
  if (row && !t.closest("a")) {
    go(row.dataset.href);
    return true;
  }
  if (!t.closest("[data-cal-editor]")) return false;
  const x = state.cal;
  const publish = t.closest("[data-cal-publish]");
  if (publish) {
    const status = publish.dataset.calPublish;
    if (status === "draft" && !confirm("Unpublish? It comes off the website until you publish it again.")) return true;
    publish.disabled = true;
    try {
      await calSave({ now: true, extra: { status } });
      toast(status === "published" ? "Published." : "Unpublished.");
      render();
    } catch (error) {
      publish.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  if (t.closest("[data-cal-delete]")) {
    if (!confirm(`Delete ${x.title ? `"${x.title}"` : "this untitled event"}?${(x.reservations || []).length ? " Its reservations go with it." : ""}`)) return true;
    clearTimeout(calSaveTimer);
    await api(`/api/admin/calendar/${x.id}`, { method: "DELETE" });
    go("#calendar");
    toast("Deleted.");
    return true;
  }
  if (t.closest("[data-cal-cover-remove]")) {
    x.image = "";
    await calSave({ now: true });
    render();
    return true;
  }
  const cancel = t.closest("[data-cal-cancel]");
  if (cancel) {
    const r = (x.reservations || []).find((y) => y.id === cancel.dataset.calCancel);
    if (!confirm(`Cancel ${r?.name || "this"}'s reservation? Their place opens up again. (They aren't emailed; let them know if needed.)`)) return true;
    await api(`/api/admin/calendar/reservations/${cancel.dataset.calCancel}`, { method: "DELETE" });
    toast("Reservation cancelled.");
    await load();
    return true;
  }
  return false;
}

function notesView() {
  const rows = state.notesInfo.notes;
  return `<section class="card table-card">
    ${
      rows.length
        ? `<table class="table nl-table">
            <thead><tr><th>Post</th><th>Status</th><th>Date</th></tr></thead>
            <tbody>${rows
              .map(
                (n) => `<tr class="row-link" data-href="#notes/${esc(n.id)}">
                  <td><a class="cell-title" href="#notes/${esc(n.id)}">${esc(n.title || "Untitled post")}</a>${n.description ? `<small class="muted">${esc(n.description)}</small>` : ""}</td>
                  <td>${noteStatus(n)}</td>
                  <td><small class="nowrap">${esc(dayShort(n.publishedAt || n.updatedAt))}</small></td>
                </tr>`
              )
              .join("")}</tbody>
          </table>`
        : `<div class="empty empty-lg">${icon("notes", "i i-xl")}<p><strong>No posts yet</strong></p><button type="button" class="btn btn-primary" data-note-new>${icon("plus")}<span>New Post</span></button></div>`
    }
  </section>`;
}

function noteEditor() {
  const n = state.note;
  const live = n.status === "published";
  const img = noteImg(n.image);
  const field = (name, label, attrs = "") => `<label class="field"><span>${label}</span><input data-note-field="${name}" value="${esc(n[name] ?? "")}" ${attrs}></label>`;
  return `
    <div class="nl-editor" data-note-editor>
      <div class="nl-bar">
        <a class="btn btn-ghost btn-sm" href="#notes">${icon("back")}<span>Numeral</span></a>
        ${noteStatus(n)}
        <small class="muted" data-note-saved>Saved</small>
        <button type="button" class="btn btn-sm btn-ghost bar-delete" data-note-delete>${icon("trash")}<span>Delete</span></button>
        <span class="nl-bar-actions">
          ${live ? `<a class="btn btn-sm" href="${esc(n.url)}" target="_blank" rel="noopener">${icon("site")}<span>View</span></a>` : ""}
          <button type="button" class="btn btn-sm ${live ? "" : "btn-primary"}" data-note-publish="${live ? "draft" : "published"}">${icon(live ? "eyeOff" : "send")}<span>${live ? "Unpublish" : "Publish"}</span></button>
        </span>
      </div>
      <div class="nl-columns">
        <div class="nl-compose">
          <section class="card nl-meta"><div class="form-stack">
            ${field("title", "Title", 'maxlength="120" placeholder="e.g. How to brew pour-over at home"')}
            <label class="field"><span>Summary</span><textarea data-note-field="description" rows="2" maxlength="300" placeholder="One or two sentences">${esc(n.description)}</textarea></label>
            ${field("slug", "Address", 'maxlength="80" spellcheck="false" autocapitalize="off"')}
            <small class="muted"><span data-note-path>/numeral/${esc(n.slug || "…")}</span></small>
          </div></section>
          <section class="card nl-block">
            <div class="nl-image">
              <div class="nl-image-preview">${img ? `<img src="${esc(img)}" alt="">` : `<span>${icon("image", "i i-xl")}</span>`}</div>
              <div class="form-stack">
                <span class="note-cover-actions">
                  <label class="btn btn-sm nl-upload">${icon("image")}<span>${img ? "Replace photo" : "Cover photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-note-cover hidden></label>
                  ${img ? `<button type="button" class="btn btn-sm btn-ghost" data-note-cover-remove>${icon("trash")}<span>Remove</span></button>` : ""}
                </span>
                ${field("imageAlt", "Describe the photo", 'maxlength="200"')}
              </div>
            </div>
          </section>
          <section class="card nl-block"><div class="form-stack">
            <label class="field"><span>Post</span><textarea class="note-text" data-note-field="body" rows="18" placeholder="Write here">${esc(n.body)}</textarea></label>
            <div class="nl-add" role="group" aria-label="Add to the post">
              <label class="btn btn-sm nl-upload">${icon("image")}<span>Add Photo</span><input type="file" accept="image/jpeg,image/png,image/webp" data-note-photo hidden></label>
              <select class="note-coffee-pick" data-note-coffee aria-label="Add a coffee"><option value="">Add a coffee…</option>${state.notesInfo.products.map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join("")}</select>
            </div>
            <small class="muted">## Heading · ### Smaller heading · **bold** · *italic* · [link text](https://…) · - list · &gt; quote</small>
          </div></section>
        </div>
        <div class="nl-preview">
          <p class="nl-preview-label"><strong>Preview</strong>${live ? `<small class="muted">${esc(n.url)}</small>` : ""}</p>
          <iframe class="note-frame" title="Post preview" data-note-frame></iframe>
        </div>
      </div>
    </div>`;
}

// The preview is the real page, reloaded after each save, keeping its scroll position.
function notePreview() {
  const frame = $("[data-note-frame]");
  if (!frame || !state.note) return;
  let y = 0;
  try {
    y = frame.contentWindow.scrollY || 0;
  } catch {
    /* not loaded yet */
  }
  frame.onload = () => {
    try {
      frame.contentWindow.scrollTo(0, y);
      frame.contentDocument.querySelectorAll("a").forEach((a) => (a.target = "_blank"));
    } catch {
      /* fine without */
    }
  };
  frame.src = `/api/admin/notes/${state.note.id}/preview?t=${Date.now()}`;
}

let noteSaveTimer = 0;
function noteSave({ now = false, extra = {} } = {}) {
  clearTimeout(noteSaveTimer);
  freshDraft = null;
  const label = $("[data-note-saved]");
  if (label) label.textContent = "Saving…";
  const run = async () => {
    const n = state.note;
    if (!n) return;
    try {
      const body = { title: n.title, description: n.description, body: n.body, imageAlt: n.imageAlt, image: n.image, ...(n.slugTouched ? { slug: n.slug } : {}), ...extra };
      const { note } = await api(`/api/admin/notes/${n.id}`, { method: "PATCH", body });
      n.slugTouched = false;
      Object.assign(n, { slug: note.slug, url: note.url, status: note.status, updatedAt: note.updatedAt });
      const slugInput = $('[data-note-field="slug"]');
      if (slugInput && document.activeElement !== slugInput) slugInput.value = note.slug;
      const path = $("[data-note-path]");
      if (path) path.textContent = `/numeral/${note.slug || "…"}`;
      if ($("[data-note-saved]")) $("[data-note-saved]").textContent = "Saved";
      notePreview();
      return note;
    } catch (error) {
      if ($("[data-note-saved]")) $("[data-note-saved]").textContent = `Not saved: ${error.message}`;
      throw error;
    }
  };
  if (now) return run();
  noteSaveTimer = setTimeout(() => run().catch(() => {}), 800);
}

// Puts `text` on its own lines at the cursor in the note.
function noteInsert(text) {
  const box = $('[data-note-field="body"]');
  const at = box.selectionStart ?? box.value.length;
  const before = box.value.slice(0, at).replace(/\s*$/, "");
  const after = box.value.slice(at).replace(/^\s*/, "");
  box.value = `${before}${before ? "\n\n" : ""}${text}\n\n${after}`;
  const caret = (before ? before.length + 2 : 0) + text.length + 2;
  box.focus();
  box.setSelectionRange(caret, caret);
  state.note.body = box.value;
  noteSave();
}

async function notePhoto(file) {
  const { id } = await api("/api/admin/notes/images", { method: "POST", body: { dataUrl: await newsletterImage(file) } });
  return id;
}

/* ── Assistant: ask about the shop; it proposes changes, you approve them ── */

// The conversation stays for this tab (a reload keeps it; a new tab starts afresh).
const ASSIST_KEY = "bo-assistant";
let assistChat = (() => {
  try {
    return JSON.parse(sessionStorage.getItem(ASSIST_KEY)) || [];
  } catch {
    return [];
  }
})();
// Which saved chat this is (each person's chats are kept on the server, Peasy's recent chats).
const newChatId = () => (crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(36).slice(2)}`);
let assistChatId = (() => {
  try {
    return sessionStorage.getItem(`${ASSIST_KEY}:id`) || newChatId();
  } catch {
    return newChatId();
  }
})();
let assistChats = null; // the recent chats list, once asked for
let assistBusy = false;
let assistLive = { text: "", step: "" }; // the answer being written, streamed in
const saveAssist = () => {
  try {
    // Files stay in memory only; a reload keeps their names.
    const light = assistChat.slice(-40).map((m) => (m.files ? { ...m, files: m.files.map(({ name, kind }) => ({ name, kind })) } : m));
    sessionStorage.setItem(ASSIST_KEY, JSON.stringify(light));
    sessionStorage.setItem(`${ASSIST_KEY}:id`, assistChatId);
  } catch {
    /* private mode: it just won't survive a reload */
  }
};
// Photos and files for the next message, from the + button, a paste or a drop. Photos are
// shrunk to 1600px before sending; PDFs and text files go as they are.
let assistFiles = [];
const ASSIST_MAX_FILES = 5;
const ASSIST_TEXT = /\.(txt|csv|md|json|tsv|log)$/i;
const ASSIST_ACCEPT = "image/*,application/pdf,.txt,.csv,.md,.json,.tsv";
const shrinkImage = (file) =>
  new Promise<any>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const g = c.getContext("2d");
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => (URL.revokeObjectURL(url), reject(new Error(`Couldn't open ${file.name}.`)));
    img.src = url;
  });
const readAs = (file, how) =>
  new Promise<any>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    r[how](file);
  });
async function addAssistFiles(list) {
  for (const file of [...list]) {
    if (assistFiles.length >= ASSIST_MAX_FILES) {
      toast(`Up to ${ASSIST_MAX_FILES} files a message.`, "error");
      break;
    }
    try {
      if (file.type.startsWith("image/")) {
        const url = await shrinkImage(file);
        assistFiles.push({ name: file.name || "Photo", kind: "image", type: "image/jpeg", data: url.split(",")[1], url });
      } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is over 10 MB.`);
        assistFiles.push({ name: file.name, kind: "pdf", type: "application/pdf", data: (await readAs(file, "readAsDataURL")).split(",")[1] });
      } else if (file.type.startsWith("text/") || ASSIST_TEXT.test(file.name)) {
        if (file.size > 300 * 1024) throw new Error(`${file.name} is over 300 KB.`);
        assistFiles.push({ name: file.name, kind: "text", type: "text/plain", data: await readAs(file, "readAsText") });
      } else throw new Error(`${file.name}: add a photo, PDF or text file.`);
    } catch (error) {
      toast(error.message, "error");
    }
  }
  drawAssistFiles();
}
// A tile per file: a thumbnail for a photo, an icon and the name for anything else.
const assistFileTile = (f, i?) =>
  `<span class="assist-file${f.kind === "image" && f.url ? " is-image" : ""}">${
    f.kind === "image" && f.url ? `<img src="${f.url}" alt="">` : `<span class="assist-file-icon">${icon(f.kind === "image" ? "picture" : "FileText")}</span><span class="assist-file-name">${esc(f.name)}<small>${f.kind === "pdf" ? "PDF" : f.kind === "image" ? "Photo" : "Text"}</small></span>`
  }${i == null ? "" : `<button type="button" class="assist-file-x" data-assist-unfile="${i}" aria-label="Remove ${esc(f.name)}">${icon("close")}</button>`}</span>`;
// Redrawn in place, so what's typed in the box stays.
function drawAssistFiles() {
  const tray = $("[data-assist-files]");
  if (!tray) return;
  tray.innerHTML = assistFiles.map(assistFileTile).join("");
  tray.hidden = !assistFiles.length;
  const send = $(".assist-send");
  if (send && !assistBusy && state.assist?.ready) send.disabled = false;
}
const ASSIST_STARTERS = ["How did sales do this week?", "What's running low?", "Which discount codes are working?", "Who owes us money?", "What's waiting in the Inbox?", "How are subscriptions doing?"];
// A suggested change: what kind, what it does, and Accept, Alternatives or Dismiss.
const PROPOSAL_KIND = { price: "Price", stock: "Stock", soldout: "Sold out", code: "Discount code", codeswitch: "Discount code", automation: "Automation", message: "Message" };
const proposalCard = (p) => `
  <div class="assist-proposal is-${p.status}" data-proposal="${esc(p.id)}">
    <div class="assist-proposal-head">
      <span class="assist-proposal-kind">${icon("sparkles")}<span>${PROPOSAL_KIND[p.kind] || "Suggestion"}</span></span>
      <span class="badge ${p.status === "done" ? "sub-active" : p.status === "waiting" ? "t-yellow" : "s-cancelled"}"><i></i>${p.status === "done" ? "Done" : p.status === "waiting" ? "Needs approval" : "Dismissed"}</span>
    </div>
    <p>${esc(p.summary)}</p>
    ${
      p.status === "waiting"
        ? `<span class="assist-proposal-actions"><button type="button" class="btn btn-sm btn-primary" data-proposal-approve>${icon("synced")}<span>Accept</span></button><button type="button" class="btn btn-sm" data-proposal-alt ${assistBusy ? "disabled" : ""}>Alternatives</button><button type="button" class="btn btn-sm btn-ghost" data-proposal-dismiss>Dismiss</button></span>`
        : p.status === "done" ? `<small class="muted">${esc(p.result || "Done.")}</small>` : ""
    }
  </div>`;
// What the assistant looked up, as cards under its answer: figures, a short list, a link.
const teamCardRow = (r) => {
  const inner = `<span class="assist-row-main"><strong>${esc(r.main)}</strong>${r.sub ? `<small>${esc(r.sub)}</small>` : ""}</span>${r.badge ? `<span class="badge s-${esc(r.status)}"><i></i>${esc(r.badge)}</span>` : ""}${r.value ? `<span class="assist-row-value${r.tone ? ` is-${r.tone}` : ""}">${esc(r.value)}</span>` : ""}`;
  if (r.order) return `<li><a href="#orders/${esc(r.status)}" data-open-order="${esc(r.order)}">${inner}</a></li>`;
  return r.href ? `<li><a href="${esc(r.href)}">${inner}</a></li>` : `<li><div>${inner}</div></li>`;
};
const teamCard = (c) => `
  <section class="assist-card">
    <header>
      <div><h3>${esc(c.title)}</h3>${c.sub ? `<p>${esc(c.sub)}</p>` : ""}</div>
      ${c.link ? `<a class="assist-card-link" href="${esc(c.link.href)}">${esc(c.link.label)}${icon("arrow")}</a>` : ""}
    </header>
    ${c.kpis?.length ? `<div class="assist-kpis">${c.kpis.map((k) => `<div><small>${esc(k.label)}</small><strong>${esc(k.value)}</strong>${k.change ? `<span class="${k.change.startsWith("-") ? "is-down" : "is-up"}">${esc(k.change)}</span>` : k.note ? `<span>${esc(k.note)}</span>` : ""}</div>`).join("")}</div>` : ""}
    ${c.rows?.length ? `${c.rowsTitle ? `<p class="assist-card-label">${esc(c.rowsTitle)}</p>` : ""}<ul class="assist-rows">${c.rows.map(teamCardRow).join("")}</ul>` : ""}
  </section>`;
// What the assistant looked at for an answer, under "Thought for 2.4s".
const STEP_LABEL = { sales_report: "Checked sales", product_report: "Checked product sales", catalog: "Looked at the catalog", inventory: "Checked stock", promotions: "Checked discount codes", campaigns: "Checked emails and newsletters", subscriptions_report: "Checked subscriptions", wholesale_accounts: "Looked at wholesale accounts", find_orders: "Searched orders", waiting_messages: "Checked the Inbox", draft_newsletter: "Drafted a newsletter", remember: "Saved a note" };
const stepLabel = (name) => STEP_LABEL[name] || (name.startsWith("propose_") ? "Drafted a change" : name.replace(/_/g, " "));
const seconds = (ms) => `${(ms / 1000).toFixed(1)}s`;
const assistSteps = (m) =>
  m.ms == null
    ? ""
    : m.steps?.length
      ? `<details class="assist-steps"><summary class="toggle-btn"><span>Thought for ${seconds(m.ms)} · ${m.steps.length} ${m.steps.length === 1 ? "step" : "steps"}</span>${icon("ChevronDown")}</summary><ol>${m.steps.map((s) => `<li>${icon("Check")}<span>${esc(stepLabel(s))}</span></li>`).join("")}</ol></details>`
      : `<p class="assist-steps is-plain">Thought for ${seconds(m.ms)}</p>`;
let assistStarted = 0;
let assistClock = 0;
// Every place in the back office by its sidebar path ("Buy › Bills" → purchasing/bills), so an
// answer that says where to go is a link that goes there (Peasy's).
function placeIndex() {
  const out = [];
  for (const p of myPages()) {
    if (SUB_NAV[p.id]) for (const [sub, label] of SUB_NAV[p.id]) out.push({ group: p.group || "", label, path: `${p.id}/${sub}` });
    else out.push({ group: p.group || "", label: p.label, path: p.id });
  }
  return out;
}
const lc = (t) => String(t).toLowerCase().replace(/&amp;/g, "&").trim();
// "Buy › Bills" or "Wholesale > Accounts" (as written in an answer, already escaped) → a link,
// when its last part is a page and any part before it is that page's group.
function placeLinks(html) {
  const places = placeIndex();
  return html.replace(/[\p{Lu}][\p{L}'&;-]*(?: [\p{L}'&;-]+)*(?:\s*(?:›|&gt;)\s*[\p{Lu}][\p{L}'&;-]*(?: [\p{L}'&;-]+)*)+/gu, (all) => {
    const parts = all.split(/\s*(?:›|&gt;)\s*/);
    const before = parts.slice(0, -1);
    // The last part runs on into the sentence ("Bills to mark it paid"): the page is its longest
    // opening words that name one, and the rest stays text.
    const words = parts[parts.length - 1].split(" ");
    for (let k = words.length; k > 0; k--) {
      const name = lc(words.slice(0, k).join(" "));
      const hit = places.find((x) => lc(x.label) === name && (!x.group || before.some((g) => lc(g) === lc(x.group))));
      if (!hit) continue;
      const rest = words.slice(k).join(" ");
      const linked = rest ? all.slice(0, all.length - rest.length - 1) : all;
      return `<a class="assist-go" href="#${hit.path}">${linked}${icon("arrow")}</a>${rest ? ` ${rest}` : ""}`;
    }
    return all;
  });
}
// The assistant's answer: paragraphs, "- " bullet lists and **bold**, everything else escaped.
// "[[ask: A | B]]" at the end of an answer: follow-up questions, shown as buttons (never as text;
// a half-streamed one is hidden too).
const ASK_RE = /\[\[\s*ask\s*:([^\]]*)\]\]?\]?|\[\[[^\]]*$/i;
const askSplit = (text) => {
  const s = String(text || "");
  const m = s.match(ASK_RE);
  const asks = m && m[1] ? m[1].split("|").map((x) => x.trim()).filter((x) => x && x.length <= 60).slice(0, 3) : [];
  return { text: m ? s.replace(m[0], "").trim() : s, asks };
};
const assistAskChips = (text) => {
  const { asks } = askSplit(text);
  return asks.length ? `<div class="assist-actions assist-asks">${asks.map((q) => `<button type="button" class="btn btn-sm" data-assist-ask="${esc(q)}">${esc(q)}</button>`).join("")}</div>` : "";
};
function plainMarkdown(text) {
  const inline = (t) => placeLinks(esc(t)).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  return askSplit(text).text
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const items = lines.filter((l) => /^[-*•]\s+/.test(l));
      if (items.length && items.length === lines.length) return `<ul>${items.map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
      // A lead-in line followed by bullets.
      if (items.length && lines.slice(lines.length - items.length).every((l) => /^[-*•]\s+/.test(l))) {
        const lead = lines.slice(0, lines.length - items.length);
        return `<p>${lead.map(inline).join("<br>")}</p><ul>${items.map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
      }
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

let assistSettings = false; // the settings panel beside the chat

// Dictation (the mic in the message box): Moonshine (MIT) turns speech into text on this computer,
// so what's said never leaves it. Tap to talk, tap again to stop; the words join the message.
// The model (about 28 MB, server/moonshine.ts) loads the first time and the browser keeps it.
const Speech = Boolean(navigator.mediaDevices?.getUserMedia && (window as any).AudioContext && (window as any).WebAssembly);
let moon = null; // { ort, encoder, decoder, tokenizer } once loaded
let moonLoading = null;
// The tokenizer is an ES module; these scripts aren't, so it's loaded as one at run time.
const importModule = new Function("url", "return import(url)") as (url: string) => Promise<any>;
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = src;
    el.onload = resolve;
    el.onerror = () => reject(new Error("Dictation couldn't load."));
    document.head.append(el);
  });
}
function loadMoonshine() {
  moonLoading ||= (async () => {
    if (!(window as any).ort) await loadScript("/vendor/ort/ort.wasm.min.js");
    const ort = (window as any).ort;
    ort.env.wasm.wasmPaths = "/vendor/ort/";
    ort.env.wasm.numThreads = 1;
    const opts = { executionProviders: ["wasm"] };
    const [encoder, decoder, tokenizer] = await Promise.all([
      ort.InferenceSession.create("/vendor/moonshine/tiny/encoder_model.onnx", opts),
      ort.InferenceSession.create("/vendor/moonshine/tiny/decoder_model_merged.onnx", opts),
      importModule("/vendor/llama-tokenizer.js").then((m) => m.default),
    ]);
    moon = { ort, encoder, decoder, tokenizer };
  })().catch((error) => {
    moonLoading = null;
    throw error;
  });
  return moonLoading;
}
// One stretch of 16 kHz audio → text (Moonshine Tiny: 6 layers, 8 heads of 36).
async function moonshineText(audio) {
  const { ort, encoder, decoder, tokenizer } = moon;
  const layers = 6;
  const enc = await encoder.run({ input_values: new ort.Tensor("float32", audio, [1, audio.length]) });
  const past = {};
  for (let i = 0; i < layers; i++) for (const a of ["decoder", "encoder"]) for (const b of ["key", "value"]) past[`past_key_values.${i}.${a}.${b}`] = new ort.Tensor("float32", [], [0, 8, 1, 36]);
  const tokens = [1];
  let ids = [1];
  const most = Math.trunc((audio.length / 16000) * 6);
  for (let i = 0; i < most; i++) {
    const out = await decoder.run({ input_ids: new ort.Tensor("int64", BigInt64Array.from(ids.map(BigInt)), [1, ids.length]), encoder_hidden_states: enc.last_hidden_state, use_cache_branch: new ort.Tensor("bool", [i > 0]), ...past });
    const logits = await out.logits.getData();
    let best = 0;
    for (let k = 1; k < logits.length; k++) if (logits[k] > logits[best]) best = k;
    if (best === 2) break; // end of speech
    tokens.push(best);
    ids = [best];
    const present = Object.entries(out).filter(([k]) => k.includes("present")).map(([, v]) => v);
    Object.keys(past).forEach((k, n) => {
      if (i === 0 || k.includes("decoder")) past[k] = present[n];
    });
  }
  return tokenizer.decode(tokens.slice(1)).trim();
}
let dictation = null; // { stop } while listening
async function dictate(btn, input) {
  if (dictation) return dictation.stop();
  const set = (state, label) => {
    btn.classList.toggle("is-on", state === "on");
    btn.classList.toggle("is-busy", state === "busy");
    btn.setAttribute("aria-pressed", String(state === "on"));
    btn.setAttribute("aria-label", label);
    btn.dataset.tip = label;
  };
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
  } catch {
    return toast("Allow the microphone to dictate.", "error");
  }
  const ctx = new AudioContext({ sampleRate: 16000 });
  const src = ctx.createMediaStreamSource(stream);
  const tap = ctx.createScriptProcessor(4096, 1, 1);
  const chunks = [];
  tap.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
  src.connect(tap);
  tap.connect(ctx.destination);
  set("on", "Stop and write it");
  // Loading the model while they talk, so it's usually ready when they stop.
  const ready = loadMoonshine();
  dictation = {
    stop: async () => {
      dictation = null;
      tap.disconnect();
      src.disconnect();
      stream.getTracks().forEach((t) => t.stop());
      await ctx.close();
      set("busy", "Writing what you said…");
      try {
        await ready;
        const all = new Float32Array(chunks.reduce((n, c) => n + c.length, 0));
        let at = 0;
        for (const c of chunks) all.set(c, at), (at += c.length);
        // In stretches of up to 20 seconds (what the model handles best).
        const words = [];
        for (let from = 0; from < all.length; from += 16000 * 20) {
          const part = all.subarray(from, Math.min(all.length, from + 16000 * 20));
          if (part.length > 16000 * 0.3) words.push(await moonshineText(part));
        }
        const said = words.filter(Boolean).join(" ");
        if (said) {
          input.value = `${input.value.trim() ? `${input.value.trim()} ` : ""}${said}`;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.focus();
        }
      } catch (error) {
        console.error("[dictation]", error);
        toast("Dictation isn't available right now.", "error");
      }
      set("off", "Dictate");
    },
  };
}

// The message box and the conversation, shared by the Assistant page and the panel.
const assistComposer = (off) => `
    <form class="assist-compose" data-assist-form>
      <div class="assist-files" data-assist-files ${assistFiles.length ? "" : "hidden"}>${assistFiles.map(assistFileTile).join("")}</div>
      <div class="assist-compose-row">
        <button type="button" class="assist-attach" data-assist-attach aria-label="Add photos and files" title="Add photos and files" ${off ? "disabled" : ""}>${icon("plus")}</button>
        <input type="file" data-assist-file accept="${ASSIST_ACCEPT}" multiple hidden>
        <textarea id="assist-input" name="q" rows="1" aria-label="Ask the assistant" placeholder="${assistChat.length ? "Ask a follow up" : "Ask anything…"}" ${off ? "disabled" : ""}></textarea>
        ${Speech ? `<button type="button" class="assist-mic" data-assist-mic aria-label="Dictate" aria-pressed="false" data-tip="Dictate" ${off ? "disabled" : ""}>${icon("Mic")}</button>` : ""}
        <button type="submit" class="assist-send" aria-label="Send" ${off ? "disabled" : ""}>${icon("up")}</button>
      </div>
    </form>`;
const assistAnswer = (m, i) => `
    <li class="assist-msg is-ai${m.error ? " is-error" : ""}">
      <span class="assist-avatar" aria-hidden="true">${LOGO}</span>
      <div class="assist-body">
        ${assistSteps(m)}
        ${m.error ? `<p>${esc(m.content)}</p>` : `<div class="assist-text">${plainMarkdown(m.content)}</div>`}
        ${(m.cards || []).map(teamCard).join("")}
        ${(m.proposals || []).map(proposalCard).join("")}
        ${m.error ? "" : assistOpenButtons(m.content)}
        ${m.error || i !== assistChat.length - 1 ? "" : assistAskChips(m.content)}
        ${
          m.error
            ? ""
            : `<div class="assist-tools">
            <button type="button" class="assist-rate is-good${m.feedback === "helpful" ? " is-on" : ""}" data-assist-helpful="${i}" ${m.feedback ? "disabled" : ""}>${m.feedback === "helpful" ? "Thanks for telling us" : "Helpful, thanks"}</button>
            <button type="button" class="assist-rate is-bad${m.feedback === "feedback" ? " is-on" : ""}" data-assist-feedback="${i}" ${m.feedback ? "disabled" : ""}>${m.feedback === "feedback" ? "Feedback sent" : "Leave feedback…"}</button>
            <button type="button" class="icon-btn" data-assist-copy="${i}" aria-label="Copy">${icon("copy")}</button>
          </div>`
        }
      </div>
    </li>`;
// The recent chats load when the menu first opens; typing in its search narrows them.
document.addEventListener(
  "toggle",
  (e) => {
    const d = e.target as HTMLDetailsElement;
    if (!d.matches?.("[data-sk-chats]")) return;
    state.skChatsOpen = d.open;
    if (d.open && assistChats === null)
      api("/api/admin/assistant/chats")
        .then((r) => {
          assistChats = r.chats;
          if (state.skChatsOpen) drawSidekick();
        })
        .catch(() => {});
  },
  true
);
document.addEventListener("input", (e) => {
  const box = e.target as HTMLInputElement;
  if (!box.matches?.("[data-sk-chat-search]")) return;
  state.assistChatQuery = box.value;
  drawSidekick();
  const again = $("[data-sk-chat-search]") as HTMLInputElement;
  again?.focus();
  again?.setSelectionRange(box.value.length, box.value.length);
});
// Orders and purchase orders an answer mentions become buttons that open them (Peasy's guided
// answers end in buttons).
function assistOpenButtons(text) {
  const refs = [...new Set(String(text || "").match(/\b(?:MF-[A-Z0-9]{4,8}|PO-\d{3,6})\b/g) || [])].slice(0, 4);
  return refs.length ? `<div class="assist-actions">${refs.map((r) => `<button type="button" class="btn btn-sm btn-primary" data-assist-open="${esc(r)}">Open ${esc(r)}${icon("arrow")}</button>`).join("")}</div>` : "";
}
// The recent chats menu (Peasy's): search, New Chat, then each chat with how many messages and when.
function assistChatsMenu() {
  const title = assistChat.find((m) => m.role === "user" && m.content)?.content || "New chat";
  const q = (state.assistChatQuery || "").toLowerCase();
  const rows = (assistChats || []).filter((c) => !q || c.title.toLowerCase().includes(q));
  return `<details class="sk-chats order-menu" data-sk-chats ${state.skChatsOpen ? "open" : ""}>
      <summary class="sk-title"><span>${esc(title)}</span>${icon("ChevronDown", "i sk-chev")}</summary>
      <div class="order-menu-list sk-chat-list">
        <p class="tb-head">Recent chats</p>
        <div class="sk-chat-find"><label class="search">${icon("search")}<input type="search" placeholder="Search…" value="${esc(state.assistChatQuery || "")}" data-sk-chat-search aria-label="Search chats"></label><button type="button" class="btn btn-sm btn-primary" data-assist-clear>New Chat</button></div>
        ${
          assistChats === null
            ? `<p class="muted sk-chat-none">Loading…</p>`
            : rows.length
              ? rows.map((c) => `<button type="button" class="sk-chat${c.id === assistChatId ? " is-on" : ""}" data-sk-chat="${esc(c.id)}"><span>${esc(c.title)}</span><small>${icon("chat", "i")}${c.count}</small><small>${esc(ago(c.updatedAt))}</small></button>`).join("")
              : `<p class="muted sk-chat-none">${q ? "No chats match" : "No chats yet"}</p>`
        }
      </div>
    </details>`;
}
const assistThreadHtml = () =>
  `<ol class="assist-thread" data-assist-thread>${assistChat
    .map((m, i) => (m.role === "user" ? `<li class="assist-msg is-you">${m.files?.length ? `<div class="assist-sent-files">${m.files.map((f) => assistFileTile(f)).join("")}</div>` : ""}${m.content ? `<p>${esc(m.content)}</p>` : ""}</li>` : assistAnswer(m, i)))
    .join("")}${assistBusy ? `<li class="assist-msg is-ai"><span class="assist-avatar" aria-hidden="true">${LOGO}</span><div class="assist-body"><p class="assist-thinking" role="status"><span class="assist-spinner" aria-hidden="true"></span><span data-assist-now>${esc(assistNow())}</span><span class="assist-clock" data-assist-clock>${seconds(Date.now() - assistStarted)}</span></p><div class="assist-text" data-assist-live>${plainMarkdown(assistLive.text)}</div></div></li>` : ""}</ol>`;
// What it's doing right now: "Checking sales" while it looks, "Writing" once the answer starts.
const assistNow = () =>
  assistLive.text ? "Writing" : assistLive.step ? (STEP_LABEL[assistLive.step] || "Looking it up").replace(/^Checked/, "Checking").replace(/^Looked/, "Looking").replace(/^Searched/, "Searching").replace(/^Drafted/, "Drafting").replace(/^Saved/, "Saving") : "Thinking";
// Streamed bits go straight into the open answer, without redrawing the conversation.
const assistPaint = () => {
  const now = $("[data-assist-now]");
  if (now) now.textContent = assistNow();
  const live = $("[data-assist-live]");
  if (live) live.innerHTML = plainMarkdown(assistLive.text);
};

function assistantView() {
  const a = state.assist;
  const off = assistBusy || !a.ready;
  const composer = assistComposer(off);
  const settings = `
    <aside class="card assist-side">
      <h2>Assistant by Text</h2>
      ${a.texts ? "" : `<p class="muted">Texts aren't connected yet.</p>`}
      <form class="form-stack" data-assist-phones>
        <label class="field"><span>Staff phones</span><textarea name="phones" rows="3" placeholder="e.g. (213) 555-0100">${esc((a.staffPhones || []).join("\n"))}</textarea></label>
        <button type="submit" class="btn btn-sm">Save Phones</button>
      </form>
      <h2>Chat Us</h2>
      <label class="checkbox"><input type="checkbox" data-assist-chat ${a.chatAssistant ? "checked" : ""} ${a.ready ? "" : "disabled"}><span>The assistant answers website chats first</span></label>
      ${
        a.remembered?.length
          ? `<h2>Remembered</h2><ul class="assist-memory">${a.remembered.map((n) => `<li><span>${esc(n.text)}</span><button type="button" class="icon-btn" data-assist-forget="${esc(n.id)}" aria-label="Forget">${icon("close")}</button></li>`).join("")}</ul>`
          : ""
      }
    </aside>`;
  return `
    ${a.ready ? "" : `<p class="notice">${icon("sparkles")}<span>The assistant isn't connected yet.</span></p>`}
    <div class="assist-layout${assistSettings ? " has-side" : ""}">
      <section class="assist-chat${assistChat.length ? "" : " is-empty"}">
        ${
          assistChat.length
            ? `${assistThreadHtml()}
              <div class="assist-dock">${composer}</div>`
            : `<div class="assist-hello">
                <span class="assist-avatar is-big" aria-hidden="true">${LOGO}</span>
                <h2>How can I help?</h2>
                ${composer}
                <div class="assist-starters">${ASSIST_STARTERS.map((q) => `<button type="button" class="assist-starter" data-assist-ask>${esc(q)}</button>`).join("")}</div>
              </div>`
        }
      </section>
      ${assistSettings ? settings : ""}
    </div>`;
}
// The assistant from any page: a bar at the bottom; asking opens it in a panel on the right,
// told which page (and which order) you're on. The same conversation as the Assistant page.
let skOpen = false;
const skShown = () => skOpen && state.page !== "assistant";
// On a computer the chat opens across the work area (Peasy's), or docked beside the page; the
// choice is remembered on this device.
let skDocked = (() => {
  try {
    return localStorage.getItem("bo-sk-docked") === "1";
  } catch {
    return false;
  }
})();
const skBodyClasses = () => {
  document.body.classList.toggle("sk-open", skShown() && skDocked);
  document.body.classList.toggle("sk-full", skShown() && !skDocked);
};
const skStarters = () => (state.open ? [`What's in ${state.open}?`, "Other orders from this customer", "Draft a note to this customer"] : ASSIST_STARTERS.slice(0, 3));
/* ── The help panel (Peasy's): with no conversation open it shows Chats, Skills and Help Docs
   above the message box; a chat or a question opens the conversation, and ← comes back. ── */
// What the assistant can do, from its tools (server/agents.ts), by area. + puts the prompt in the
// box to finish and send. Create makes something new, Edit changes it, Operate acts, Report looks.
const SKILLS: [string, string, string, string, string][] = [
  ["Sell", "Sales report", "Report", "Orders, revenue and average order for a period, against the one before.", "How did sales do last week against the week before?"],
  ["Sell", "Product report", "Report", "How one product sells: units, revenue, sizes, subscribers and stock.", "How is  selling this month?"],
  ["Sell", "Find orders", "Report", "Find orders by number, customer, email or status.", "Find the orders from "],
  ["Sell", "Review subscriptions", "Report", "Active, paused, new and cancelled subscriptions, and what they bill a month.", "How are subscriptions doing this month?"],
  ["Sell", "Change a price", "Edit", "Propose a new price for a product, for you to approve.", "Change the price of  to "],
  ["Sell", "Update a coffee's details", "Edit", "What its page says, where it's from, who supplies it and what it costs us, for you to approve.", "Update  so its page says "],
  ["Sell", "Mark sold out or back on sale", "Operate", "Mark a product sold out, or back on sale, for you to approve.", "Mark  as sold out"],
  ["Wholesale", "Review wholesale accounts", "Report", "Each café's discount, terms, what they owe and how late, and their last order.", "Which wholesale accounts owe us money?"],
  ["Wholesale", "Message a café", "Operate", "Draft a text or email to a wholesale account, sent once you approve.", "Write to  about "],
  ["Wholesale", "Find wholesale prospects", "Report", "Cafés and shops in an area that could buy wholesale.", "Find cafés in  that could buy wholesale"],
  ["Wholesale", "Research a business", "Report", "Its website, Instagram and Maps listing, scored for wholesale fit.", "Research  for wholesale"],
  ["Wholesale", "Move a prospect", "Operate", "Approve a prospect, mark it not a fit, or send it back to review.", "Approve the prospect "],
  ["Make", "Check stock", "Report", "What's left of each product, what's low or sold out, and who's waiting.", "What's low or sold out?"],
  ["Make", "Update a stock count", "Edit", "Set a new count for a product, for you to approve.", "Set the stock of  to "],
  ["Buy", "New Purchase Order", "Create", "Draft a purchase order to a supplier for you to review and send.", "Draft a purchase order to  for "],
  ["Buy", "Coffee market price", "Report", "The coffee futures price and how it moved.", "Where's the coffee market today?"],
  ["Inbox", "Who's waiting", "Report", "Conversations waiting for the team: who, what they asked and how long ago.", "Who's waiting for a reply?"],
  ["Inbox", "Reply to a conversation", "Operate", "Draft a reply by email, chat or text, sent once you approve.", "Draft a reply to "],
  ["Marketing", "Review discount codes", "Report", "Each code's uses, limits, end date and the sales it brought in.", "How are our discount codes doing?"],
  ["Marketing", "New discount code", "Create", "Propose a code: percent or amount off, or free shipping, for you to approve.", "Make a discount code for "],
  ["Marketing", "Turn a code on or off", "Operate", "Switch a discount code on or off, for you to approve.", "Turn off the code "],
  ["Marketing", "Review automated emails", "Report", "What the welcome, cart, after-order, running-low and win-back emails sent and earned.", "How are our automated emails doing?"],
  ["Marketing", "Turn an automated email on or off", "Operate", "Switch one of the automated emails on or off, for you to approve.", "Turn off the  email"],
  ["Marketing", "Draft a newsletter", "Create", "Write a newsletter draft for you to review and send.", "Draft a newsletter about "],
  ["Marketing", "Where we show up", "Report", "How Mimi Food shows up on Google, Maps and AI answers.", "Where do we show up for "],
  ["Marketing", "Mentions", "Report", "Recent Instagram and TikTok posts about Mimi Food.", "What are people posting about us?"],
  ["Marketing", "Look up an Instagram account", "Report", "Followers, bio and how real its audience looks.", "Look up the Instagram account @"],
  ["General", "Remember something", "Operate", "Keep a standing note for the team's next chats.", "Remember that "],
];
const SKILL_TAGS = ["Create", "Edit", "Operate", "Report"];
// The team's guides (Configure › Help Docs), loaded when the panel first shows them.
let HELP_DOCS: { id: string; group: string; title: string; body: string[] }[] = [];
let helpDocsLoaded = false;
const loadHelpDocs = () =>
  api("/api/admin/help")
    .then((r) => {
      HELP_DOCS = r.docs;
      helpDocsLoaded = true;
      drawSkBody();
    })
    .catch(() => {});
let skHome = true; // the tabs (true) or the conversation
let skTab = "chats";
let skFind = "";
let skTag = ""; // a Skills filter: Create, Edit, Operate or Report
let skDoc = ""; // the Help Doc open
const skOpenGroups = new Set();
const SKILL_TONE = { Create: "blue", Edit: "orange", Operate: "green", Report: "purple" };
const skillTag = (t) => `<span class="sk-tag is-${SKILL_TONE[t]}">${t}</span>`;
function skBodyHtml() {
  const q = skFind.trim().toLowerCase();
  if (skTab === "chats") {
    if (assistChats === null) {
      api("/api/admin/assistant/chats")
        .then((r) => ((assistChats = r.chats), drawSkBody()))
        .catch(() => {});
      return `<p class="muted sk-chat-none">Loading…</p>`;
    }
    const rows = assistChats.filter((c) => !q || c.title.toLowerCase().includes(q));
    return rows.length
      ? `<div class="sk-chat-rows">${rows.map((c) => `<button type="button" class="sk-chat" data-sk-chat="${esc(c.id)}"><span>${esc(c.title)}</span><small>${icon("chat", "i")}${c.count}</small><small>${esc(ago(c.updatedAt))}</small></button>`).join("")}</div>`
      : `<p class="muted sk-chat-none">${q ? "No chats match" : "No chats yet"}</p>`;
  }
  if (skTab === "skills") {
    const hits = SKILLS.map((x, i) => ({ x, i })).filter(({ x }) => (!skTag || x[2] === skTag) && (!q || `${x[1]} ${x[3]}`.toLowerCase().includes(q)));
    const groups = [...new Set(hits.map(({ x }) => x[0]))].sort();
    return `<div class="sk-tags" role="group" aria-label="Kind">${SKILL_TAGS.map((t) => `<button type="button" class="sk-tag is-${SKILL_TONE[t]}" data-sk-tag="${t}" aria-pressed="${skTag === t}">${t}</button>`).join("")}</div>
      ${
        groups.length
          ? groups
              .map((g) => {
                const list = hits.filter(({ x }) => x[0] === g);
                const open = q || skTag || skOpenGroups.has(g);
                return `<section class="sk-group${open ? " is-open" : ""}"><button type="button" class="sk-group-head" data-sk-group="${esc(g)}" aria-expanded="${Boolean(open)}">${icon("ChevronRight", "i sk-group-chev")}<strong>${esc(g)}</strong><span class="sk-count">${list.length}</span></button>
                ${open ? `<div class="sk-skills">${list.map(({ x, i }) => `<div class="sk-skill"><div><p><strong>${esc(x[1])}</strong>${skillTag(x[2])}</p><small>${esc(x[3])}</small></div><button type="button" class="icon-btn" data-sk-skill="${i}" aria-label="Use ${esc(x[1])}" data-tip="Start a chat with this">${icon("MessageSquarePlus")}</button></div>`).join("")}</div>` : ""}</section>`;
              })
              .join("")
          : `<p class="muted sk-chat-none">No skills match</p>`
      }`;
  }
  if (!helpDocsLoaded) {
    loadHelpDocs();
    return `<p class="muted sk-chat-none">Loading…</p>`;
  }
  const doc = HELP_DOCS.find((d) => d.id === skDoc);
  if (doc) return `<article class="sk-doc"><button type="button" class="sk-doc-back" data-sk-doc="">${icon("back")}<span>Help Docs</span></button><h3>${esc(doc.title)}</h3>${doc.body.map((t) => `<p>${esc(t)}</p>`).join("")}</article>`;
  const docs = HELP_DOCS.filter((d) => !q || `${d.title} ${d.body.join(" ")}`.toLowerCase().includes(q));
  const groups = [...new Set(docs.map((d) => d.group))];
  return groups.length
    ? groups.map((g) => `<section class="sk-docs"><p class="tb-head">${esc(g)}</p>${docs.filter((d) => d.group === g).map((d) => `<button type="button" class="sk-doc-row" data-sk-doc="${d.id}">${icon("FileText")}<span>${esc(d.title)}</span></button>`).join("")}</section>`).join("")
    : `<p class="muted sk-chat-none">No help docs match</p>`;
}
// While searching, each tab shows how many it found (Peasy's).
function skCounts() {
  const q = skFind.trim().toLowerCase();
  if (!q) return { chats: "", skills: "", docs: "" };
  const n = (x) => `<span class="sk-tab-n">${x > 9 ? "9+" : x}</span>`;
  return {
    chats: n((assistChats || []).filter((c) => c.title.toLowerCase().includes(q)).length),
    skills: n(SKILLS.filter((x) => (!skTag || x[2] === skTag) && `${x[1]} ${x[3]}`.toLowerCase().includes(q)).length),
    docs: n(HELP_DOCS.filter((d) => `${d.title} ${d.body.join(" ")}`.toLowerCase().includes(q)).length),
  };
}
const drawSkBody = () => {
  const b = $("[data-sk-body]");
  if (b) b.innerHTML = skBodyHtml();
  const counts = skCounts();
  for (const t of $$("[data-sk-tab]") as HTMLElement[]) {
    const label = { chats: "Chats", skills: "Skills", docs: "Help Docs" }[t.dataset.skTab];
    t.innerHTML = `${label}${counts[t.dataset.skTab]}`;
  }
};
function skHomeHtml(off) {
  return `<aside class="sk-panel is-home" aria-label="Help">
    <header class="sk-head sk-tabs-head">
      <nav class="sk-tabs" role="tablist">${[["chats", "Chats"], ["skills", "Skills"], ["docs", "Help Docs"]].map(([t, label]) => `<button type="button" role="tab" data-sk-tab="${t}" aria-selected="${skTab === t}">${label}${skCounts()[t]}</button>`).join("")}</nav>
      <span>
        <button type="button" class="icon-btn" data-sk-dock aria-label="${skDocked ? "Open across the page" : "Dock beside the page"}">${icon(skDocked ? "Maximize2" : "PanelRight")}</button>
        <button type="button" class="icon-btn" data-sk-close aria-label="Close">${icon("close")}</button>
      </span>
    </header>
    <div class="sk-home">
      <div class="sk-find"><label class="search">${icon("search")}<input type="search" placeholder="Search…" value="${esc(skFind)}" data-sk-find aria-label="Search"></label><button type="button" class="btn btn-primary" data-assist-clear>New Chat</button></div>
      <div class="sk-body" data-sk-body>${skBodyHtml()}</div>
    </div>
    ${state.assist && !state.assist.ready ? `<p class="notice">${icon("sparkles")}<span>The assistant isn't connected yet.</span></p>` : ""}
    <div class="sk-dock">${assistComposer(off)}</div>
  </aside>`;
}
document.addEventListener("input", (e) => {
  const box = e.target as HTMLInputElement;
  if (!box.matches?.("[data-sk-find]")) return;
  skFind = box.value;
  drawSkBody();
});
document.addEventListener("click", (e) => {
  const t = e.target as HTMLElement;
  const tab = t.closest?.("[data-sk-tab]") as HTMLElement;
  if (tab) {
    skTab = tab.dataset.skTab;
    skFind = "";
    skDoc = "";
    return drawSidekick();
  }
  const tag = t.closest?.("[data-sk-tag]") as HTMLElement;
  if (tag) {
    skTag = skTag === tag.dataset.skTag ? "" : tag.dataset.skTag;
    return drawSkBody();
  }
  const group = t.closest?.("[data-sk-group]") as HTMLElement;
  if (group) {
    const g = group.dataset.skGroup;
    if (skOpenGroups.has(g)) skOpenGroups.delete(g);
    else skOpenGroups.add(g);
    return drawSkBody();
  }
  const doc = t.closest?.("[data-sk-doc]") as HTMLElement;
  if (doc) {
    skDoc = doc.dataset.skDoc;
    drawSkBody();
    $("[data-sk-body]")?.scrollTo({ top: 0 });
    return;
  }
  const skill = t.closest?.("[data-sk-skill]") as HTMLElement;
  if (skill) {
    const box = $("#assist-input") as HTMLTextAreaElement;
    if (!box) return;
    const text = SKILLS[Number(skill.dataset.skSkill)][4];
    box.value = text;
    box.focus();
    // The cursor goes where the name or detail is to be typed (the double space), else the end.
    const gap = text.indexOf("  ");
    const at = gap >= 0 ? gap + 1 : text.length;
    box.setSelectionRange(at, at);
    return;
  }
  if (t.closest?.("[data-sk-home]")) {
    skHome = true;
    drawSidekick();
  }
});
function sidekickHtml() {
  if (state.page === "assistant") return "";
  if (!skOpen)
    return `<button type="button" class="sk-fab" data-sk-untuck aria-label="Ask the assistant" title="Ask the assistant">${LOGO}</button>
    <form class="sk-bar" data-sk-bar>
      <span class="assist-avatar" aria-hidden="true">${LOGO}</span>
      <input name="q" placeholder="Ask the assistant" aria-label="Ask the assistant" autocomplete="off">
      <button type="submit" class="assist-send" aria-label="Ask">${icon("up")}</button>
      <button type="button" class="icon-btn" data-sk-open aria-label="Open the assistant" title="Open the assistant">${icon("PanelRight")}</button>
    </form>`;
  const off = assistBusy || !state.assist?.ready;
  if (skHome && !assistBusy) return skHomeHtml(off);
  return `<aside class="sk-panel" aria-label="Assistant">
    <header class="sk-head">
      <button type="button" class="icon-btn sk-back" data-sk-home aria-label="Chats, Skills and Help Docs">${icon("back")}</button>
      ${assistChatsMenu()}
      <span>
        <button type="button" class="icon-btn" data-sk-dock aria-label="${skDocked ? "Open across the page" : "Dock beside the page"}">${icon(skDocked ? "Maximize2" : "PanelRight")}</button>
        <button type="button" class="icon-btn" data-sk-close aria-label="Close">${icon("close")}</button>
      </span>
    </header>
    <div class="sk-thread" data-sk-thread>
      ${state.assist && !state.assist.ready ? `<p class="notice">${icon("sparkles")}<span>The assistant isn't connected yet.</span></p>` : ""}
      ${assistChat.length ? assistThreadHtml() : `<div class="sk-hello"><div class="assist-starters">${skStarters().map((q) => `<button type="button" class="assist-starter" data-assist-ask>${esc(q)}</button>`).join("")}</div></div>`}
    </div>
    <div class="sk-dock">${assistComposer(off)}</div>
  </aside>`;
}
// Just the panel (or bar) again, so an open order isn't reloaded while the assistant answers.
// The bar keeps out of the way: it tucks into a small button at the corner while you scroll
// down a page or type somewhere else, and comes back when you scroll up or tap the button.
// (It also steps aside while a side panel is open; see admin.css.)
const skTuck = (on) => document.body.classList.toggle("sk-tucked", on);
const skScrolled = new WeakMap();
document.addEventListener(
  "scroll",
  (e) => {
    const el: any = e.target === document ? document.scrollingElement : e.target;
    if (!el?.closest || el.closest("[data-sk]") || el.closest(".assist-thread")) return;
    if (document.activeElement?.closest?.("[data-sk-bar]")) return; // typing in the bar
    const y = el.scrollTop;
    const was = skScrolled.get(el) ?? 0;
    const atEnd = el.scrollHeight - y - el.clientHeight < 48;
    if (y > was + 6 || (atEnd && y > 0)) skTuck(true);
    else if (y < was - 6 || y <= 0) skTuck(false);
    skScrolled.set(el, y);
  },
  { capture: true, passive: true }
);
document.addEventListener("focusin", (e) => {
  const t: any = e.target;
  if (t.matches?.("input:not([type=checkbox]):not([type=radio]), textarea, select, [contenteditable]") && !t.closest("[data-sk]")) skTuck(true);
});
document.addEventListener("click", (e) => {
  if (!(e.target as any).closest?.("[data-sk-untuck]")) return;
  // Phones have no bar (admin.css): the button opens the assistant full screen.
  if (matchMedia("(max-width: 860px)").matches) return openSidekick();
  skTuck(false);
  $("[data-sk-bar] input")?.focus();
});

// The home Ask box: the question starts a new chat, or goes on with the one picked under it
// (Peasy's New chat ▾: recent chats with a search and New Chat).
let homeChat = null; // { id, title } of the chat to go on with
const homeChatRows = () => {
  const q = (state.homeChatQuery || "").toLowerCase();
  const rows = (assistChats || []).filter((c) => !q || c.title.toLowerCase().includes(q));
  return assistChats === null
    ? `<p class="muted sk-chat-none">Loading…</p>`
    : rows.length
      ? rows.map((c) => `<button type="button" class="sk-chat${c.id === homeChat?.id ? " is-on" : ""}" data-home-chat="${esc(c.id)}"><span>${esc(c.title)}</span><small>${icon("chat", "i")}${c.count}</small><small>${esc(ago(c.updatedAt))}</small></button>`).join("")
      : `<p class="muted sk-chat-none">${q ? "No chats match" : "No chats yet"}</p>`;
};
const homeChatsMenu = () => `<details class="home-chats order-menu" data-home-chats>
    <summary><span>${esc(homeChat?.title || "New chat")}</span>${icon("ChevronDown", "i")}</summary>
    <div class="order-menu-list sk-chat-list">
      <p class="tb-head">Recent chats</p>
      <div class="sk-chat-find"><label class="search">${icon("search")}<input type="search" placeholder="Search…" data-home-chat-search aria-label="Search chats"></label><button type="button" class="btn btn-sm btn-primary" data-home-chat="">New Chat</button></div>
      <div data-home-chat-list>${homeChatRows()}</div>
    </div>
  </details>`;
const drawHomeChats = () => {
  const list = $("[data-home-chat-list]");
  if (list) list.innerHTML = homeChatRows();
};
document.addEventListener(
  "toggle",
  (e) => {
    const d = e.target as HTMLDetailsElement;
    if (!d.matches?.("[data-home-chats]") || !d.open) return;
    state.homeChatQuery = "";
    ($("[data-home-chat-search]", d) as HTMLInputElement)?.focus();
    if (assistChats === null)
      api("/api/admin/assistant/chats")
        .then((r) => ((assistChats = r.chats), drawHomeChats()))
        .catch(() => {});
    else drawHomeChats();
  },
  true
);
document.addEventListener("input", (e) => {
  const box = e.target as HTMLInputElement;
  if (!box.matches?.("[data-home-chat-search]")) return;
  state.homeChatQuery = box.value;
  drawHomeChats();
});
document.addEventListener("click", (e) => {
  const pick = (e.target as HTMLElement).closest?.("[data-home-chat]") as HTMLElement;
  if (!pick) return;
  const id = pick.dataset.homeChat;
  homeChat = id ? { id, title: assistChats?.find((c) => c.id === id)?.title || "Chat" } : null;
  const menu = pick.closest("[data-home-chats]");
  menu.removeAttribute("open");
  $("summary span", menu).textContent = homeChat?.title || "New chat";
  ($("[data-home-ask] textarea") as HTMLTextAreaElement)?.focus();
});
async function homeAsk(form) {
  const q = form.q.value.trim();
  if (!q) return;
  form.q.value = "";
  if (homeChat) {
    try {
      const { chat } = await api(`/api/admin/assistant/chats/${homeChat.id}`);
      assistChat = chat.messages;
      assistChatId = chat.id;
    } catch (error) {
      return toast(error.message, "error");
    }
  } else {
    assistChat = [];
    assistChatId = newChatId();
  }
  homeChat = null;
  saveAssist();
  openSidekick(q);
}
document.addEventListener("submit", (e) => {
  const form = (e.target as any).closest?.("[data-home-ask]");
  if (!form) return;
  e.preventDefault();
  homeAsk(form);
});
// Once there's a question the send button says Enter, as Peasy's.
document.addEventListener("input", (e) => {
  const form = (e.target as any).closest?.("[data-home-ask]");
  if (form) form.classList.toggle("has-text", Boolean(form.q.value.trim()));
});
document.addEventListener("keydown", (e) => {
  const form = (e.target as any).closest?.("[data-home-ask]");
  if (form && e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    homeAsk(form);
  }
});

function drawSidekick() {
  const box = $("[data-sk]");
  if (box) box.innerHTML = sidekickHtml();
  skBodyClasses();
}
const assistRender = () => (state.page === "assistant" ? render() : drawSidekick());
async function openSidekick(q = "") {
  skOpen = true;
  skHome = !q && !assistChat.length;
  if (!state.assist) state.assist = await api("/api/admin/assistant/settings").catch(() => ({ ready: false }));
  if (q) return assistAsk(q);
  drawSidekick();
  $("#assist-input")?.focus();
}
// The newest message in view (the page scrolls on the Assistant page; the panel scrolls itself).
const assistScroll = () =>
  requestAnimationFrame(() => {
    const t = skShown() && $("[data-sk-thread]");
    if (t) t.scrollTo({ top: t.scrollHeight, behavior: "smooth" });
    else window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  });
// What's on their screen for the assistant: the page and its tab, and whatever is open there
// (an order, a side panel's product, customer, account, supplier…, an Inbox conversation, or the
// page's own editor), so "this" means it.
const onScreenNow = () => ({
  page: state.page,
  sub: state.page === "orders" ? state.tab : state.page === "customers" ? state.customerFilter : state.sub || "",
  order: state.open || null,
  record: (!$("[data-drawer]")?.hidden && panelKey) || pageKey(),
  conversation: state.page === "inbox" ? state.conv?.conversation?.id || null : null,
});
async function assistAsk(q) {
  skHome = false;
  q = String(q || "").trim();
  if ((!q && !assistFiles.length) || assistBusy) return;
  const files = assistFiles;
  assistFiles = [];
  assistChat.push(files.length ? { role: "user", content: q, files } : { role: "user", content: q });
  assistBusy = true;
  // A fresh live answer before the first draw, so the last one doesn't flash up again.
  assistLive = { text: "", step: "" };
  assistStarted = Date.now();
  clearInterval(assistClock);
  assistClock = window.setInterval(() => {
    const clock = $("[data-assist-clock]");
    if (clock) clock.textContent = seconds(Date.now() - assistStarted);
  }, 100);
  assistRender();
  assistScroll();
  try {
    // Earlier files still in memory go again, so follow-up questions can see them.
    // Cards it showed go back as a line of text, so a follow-up question has their figures.
    const cardText = (c) => [`[${c.title}${c.sub ? `, ${c.sub}` : ""}]`, ...(c.kpis || []).map((k) => `${k.label} ${k.value}${k.change ? ` (${k.change})` : ""}`), ...(c.rows || []).map((r) => [r.main, r.sub, r.value].filter(Boolean).join(" "))].join("; ");
    const messages = assistChat.map(({ role, content, files: f, cards }) => ({
      role,
      content: cards?.length ? `${content}\n\n${cards.map(cardText).join("\n")}` : content,
      ...(f?.length && { files: f.filter((x) => x.data).map(({ name, kind, type, data }) => ({ name, kind, type, data })), filesNamed: f.filter((x) => !x.data).map((x) => x.name) }),
    }));
    // Streamed: what it looks at and the answer show as they come; the finished answer is last.
    const res = await fetch("/api/admin/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/x-ndjson" },
      body: JSON.stringify({ messages, context: onScreenNow() }),
    });
    let r = null;
    if (!res.ok || !res.body || !/ndjson/.test(res.headers.get("Content-Type") || "")) {
      r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || "Something went wrong.");
    } else {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop();
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.error) throw new Error(ev.error);
          if (ev.done) r = ev.done;
          if (ev.reset) assistLive.text = "";
          if (ev.step) assistLive.step = ev.step;
          if (ev.text) assistLive.text += ev.text;
        }
        assistPaint();
      }
      if (!r) throw new Error("The assistant stopped before it finished. Try again.");
    }
    assistChat.push({ role: "assistant", content: r.reply, proposals: r.proposals, cards: r.cards || [], steps: r.steps || [], ms: r.ms ?? Date.now() - assistStarted });
  } catch (error) {
    assistChat.push({ role: "assistant", content: error.message, error: true });
  } finally {
    assistBusy = false;
    clearInterval(assistClock);
    saveAssist();
    // Kept on the server too, so it's in their recent chats on any computer.
    api(`/api/admin/assistant/chats/${assistChatId}`, { method: "PUT", body: { messages: assistChat.map((m) => (m.files ? { ...m, files: m.files.map(({ name, kind }) => ({ name, kind })) } : m)) } })
      .then(() => (assistChats = null))
      .catch(() => {});
    assistRender();
    assistScroll();
    $("#assist-input")?.focus();
  }
}
async function assistantClick(t) {
  if (t.closest("[data-assist-settings]")) {
    assistSettings = !assistSettings;
    assistRender();
    return true;
  }
  const copy = t.closest("[data-assist-copy]");
  if (copy) {
    navigator.clipboard?.writeText(askSplit(assistChat[Number(copy.dataset.assistCopy)]?.content || "").text).then(() => toast("Copied"), () => {});
    return true;
  }
  const mic = t.closest("[data-assist-mic]");
  if (mic) {
    dictate(mic, $("#assist-input"));
    return true;
  }
  if (t.closest("[data-assist-attach]")) {
    $("[data-assist-file]")?.click();
    return true;
  }
  const unfile = t.closest("[data-assist-unfile]");
  if (unfile) {
    assistFiles.splice(Number(unfile.dataset.assistUnfile), 1);
    drawAssistFiles();
    $("#assist-input")?.focus();
    return true;
  }
  const starter = t.closest("[data-assist-ask]");
  if (starter) return assistAsk(starter.textContent), true;
  if (t.closest("[data-assist-clear]")) {
    state.skChatsOpen = false;
    skHome = false;
    assistChat = [];
    assistChatId = newChatId();
    saveAssist();
    assistRender();
    $("#assist-input")?.focus();
    return true;
  }
  const pickChat = t.closest("[data-sk-chat]");
  if (pickChat) {
    state.skChatsOpen = false;
    skHome = false;
    try {
      const { chat } = await api(`/api/admin/assistant/chats/${pickChat.dataset.skChat}`);
      assistChat = chat.messages;
      assistChatId = chat.id;
      saveAssist();
      assistRender();
      assistScroll();
    } catch (error) {
      toast(error.message, "error");
    }
    return true;
  }
  // Across the page, the chat would cover what a link opens: it docks beside it instead.
  if (t.closest("[data-assist-open], .assist-go") && skOpen && !skDocked && innerWidth > 860) {
    skDocked = true;
    drawSidekick();
  }
  // A follow-up the assistant suggested: asked as if typed.
  const askChip = t.closest("[data-assist-ask]");
  if (askChip) {
    assistAsk(askChip.dataset.assistAsk);
    return true;
  }
  const openRef = t.closest("[data-assist-open]");
  if (openRef) {
    const ref = openRef.dataset.assistOpen;
    if (ref.startsWith("PO-")) goThen("purchasing/orders", () => poDetail(ref));
    else {
      const r = await api(`/api/admin/search?q=${encodeURIComponent(ref)}`).catch(() => null);
      const o = r?.orders.find((x) => x.number === ref);
      if (o) quickGo({ dataset: { order: o.number, status: o.status } });
      else toast(`${ref} isn't here.`, "error");
    }
    return true;
  }
  const helpful = t.closest("[data-assist-helpful]");
  const feedback = t.closest("[data-assist-feedback]");
  if (helpful || feedback) {
    const i = Number((helpful || feedback).dataset[helpful ? "assistHelpful" : "assistFeedback"]);
    const send = async (note = "") => {
      await api("/api/admin/assistant/feedback", { method: "POST", body: { chatId: assistChatId, index: i, helpful: Boolean(helpful), note } });
      assistChat[i].feedback = helpful ? "helpful" : "feedback";
      saveAssist();
      assistRender();
    };
    if (helpful) send().catch((error) => toast(error.message, "error"));
    else {
      const drawer = openPanel("Leave Feedback", `<form class="form-stack" id="assist-fb"><label class="field"><span>What should it have said or done?</span><textarea name="note" rows="4" required maxlength="2000"></textarea></label><div class="drawer-actions"><button type="submit" class="btn btn-primary">Send</button></div></form>`, { modal: true });
      $("textarea", drawer).focus();
      drawer.onsubmit = async (e) => {
        e.preventDefault();
        try {
          await send((e.target as any).note.value);
          closeDrawer();
          toast("Thanks. It's kept to make the assistant better.");
        } catch (error) {
          panelError(error.message);
        }
      };
    }
    return true;
  }
  const card = t.closest("[data-proposal]");
  if (card && t.closest("[data-proposal-alt]")) {
    const p = assistChat.flatMap((m) => m.proposals || []).find((x) => x.id === card.dataset.proposal);
    if (p) assistAsk(`Give me two other options instead of this: ${p.summary}`);
    return true;
  }
  const approve = t.closest("[data-proposal-approve]");
  if (card && (approve || t.closest("[data-proposal-dismiss]"))) {
    $$("button", card).forEach((b) => (b.disabled = true));
    const id = card.dataset.proposal;
    try {
      const r = await api(`/api/admin/assistant/proposals/${id}`, { method: "POST", body: { approve: Boolean(approve) } });
      for (const m of assistChat) for (const p of m.proposals || []) if (p.id === id) Object.assign(p, r.proposal, { result: r.result });
      if (approve) toast(r.result);
    } catch (error) {
      toast(error.message, "error");
    }
    saveAssist();
    assistRender();
    return true;
  }
  const forget = t.closest("[data-assist-forget]");
  if (forget) {
    Object.assign(state.assist, await api("/api/admin/assistant/settings", { method: "PATCH", body: { forget: forget.dataset.assistForget } }));
    assistRender();
    return true;
  }
  return false;
}
app.addEventListener("submit", async (e) => {
  const bar = e.target.closest("[data-sk-bar]");
  if (bar) {
    e.preventDefault();
    if (bar.q.value.trim()) openSidekick(bar.q.value);
    return;
  }
  const ask = e.target.closest("[data-assist-form]");
  const phones = e.target.closest("[data-assist-phones]");
  if (!ask && !phones) return;
  e.preventDefault();
  if (ask) return assistAsk(ask.q.value);
  try {
    Object.assign(state.assist, await api("/api/admin/assistant/settings", { method: "PATCH", body: { staffPhones: phones.phones.value } }));
    toast("Staff phones saved.");
    render();
  } catch (error) {
    toast(error.message, "error");
  }
});
app.addEventListener("change", async (e) => {
  if (e.target.matches("[data-assist-file]")) {
    await addAssistFiles(e.target.files);
    e.target.value = "";
    return $("#assist-input")?.focus();
  }
  if (!e.target.matches("[data-assist-chat]")) return;
  Object.assign(state.assist, await api("/api/admin/assistant/settings", { method: "PATCH", body: { chatAssistant: e.target.checked } }).catch((error) => (toast(error.message, "error"), {})));
  toast(state.assist.chatAssistant ? "The assistant answers new chats." : "New chats go straight to the team.");
});
// A pasted screenshot, or files dropped on the chat, attach like the + button.
app.addEventListener("paste", (e) => {
  if (e.target.id !== "assist-input" || !e.clipboardData?.files?.length) return;
  e.preventDefault();
  addAssistFiles(e.clipboardData.files);
});
app.addEventListener("dragover", (e) => {
  const chat = e.target.closest?.(".assist-chat");
  if (!chat || !e.dataTransfer?.types?.includes("Files") || !state.assist?.ready) return;
  e.preventDefault();
  chat.classList.add("is-dropping");
});
app.addEventListener("dragleave", (e) => {
  const chat = e.target.closest?.(".assist-chat");
  if (chat && !chat.contains(e.relatedTarget)) chat.classList.remove("is-dropping");
});
app.addEventListener("drop", (e) => {
  const chat = e.target.closest?.(".assist-chat");
  if (!chat || !e.dataTransfer?.files?.length) return;
  e.preventDefault();
  chat.classList.remove("is-dropping");
  if (state.assist?.ready && !assistBusy) addAssistFiles(e.dataTransfer.files);
});
app.addEventListener("keydown", (e) => {
  if (e.target.id === "assist-input" && e.key === "Enter" && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    e.target.form.requestSubmit();
  }
});

async function notesClick(t) {
  if (t.closest("[data-note-new]")) {
    const { note } = await api("/api/admin/notes", { method: "POST", body: {} });
    newDraft(`/api/admin/notes/${note.id}`, `#notes/${note.id}`);
    return true;
  }
  const row = t.closest(".nl-table [data-href]");
  if (row && !t.closest("a")) {
    go(row.dataset.href);
    return true;
  }
  if (!t.closest("[data-note-editor]")) return false;
  const n = state.note;
  const publish = t.closest("[data-note-publish]");
  if (publish) {
    const status = publish.dataset.notePublish;
    if (status === "draft" && !confirm("Unpublish this post? Its page comes off the website until you publish it again.")) return true;
    publish.disabled = true;
    try {
      const note = await noteSave({ now: true, extra: { status } });
      toast(status === "published" ? "Published." : "Unpublished.");
      state.note = { ...n, ...note };
      render();
    } catch (error) {
      publish.disabled = false;
      toast(error.message, "error");
    }
    return true;
  }
  if (t.closest("[data-note-delete]")) {
    if (!confirm(`Delete "${n.title || "this post"}"?${n.status === "published" ? " Its page comes off the website." : ""}`)) return true;
    clearTimeout(noteSaveTimer);
    await api(`/api/admin/notes/${n.id}`, { method: "DELETE" });
    go("#notes");
    toast("Post deleted.");
    return true;
  }
  if (t.closest("[data-note-cover-remove]")) {
    n.image = "";
    await noteSave({ now: true });
    render();
    return true;
  }
  return false;
}

/* ── Inbox: customers who asked for a person ──
   From the contact form, "Talk to a person" in the FAQ assistant (chat), an email to the shop,
   or a text (iMessage, wholesale customers).
   A reply waits a few seconds before it goes ("Sending in 7s · Undo · Send now"). */

const CHANNEL = { chat: ["chat", "Chat"], email: ["email", "Email"], imessage: ["imessage", "iMessage"] };
// A soft color per person for their avatar, the same each time.
const toneOf = (name) => ["blue", "green", "purple", "orange", "yellow", "red"][[...String(name || "")].reduce((n, ch) => (n * 31 + ch.charCodeAt(0)) >>> 0, 7) % 6];
// "+15551234567" → "(555) 123-4567"; an email (an Apple ID) as it is.
const phoneLabel = (v) => {
  const d = String(v || "").replace(/\D/g, "");
  return d.length === 11 && d[0] === "1" ? `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}` : d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : String(v || "");
};
const channelTag = (c) => {
  const [ic, label] = CHANNEL[c.channel] || CHANNEL.email;
  return `<span class="tag">${icon(ic)}${label}</span>`;
};

// "Kim Lee" → "KL"; a visitor with no name gets an icon instead.
const initialsOf = (name) => (/^(visitor|someone)$/i.test(String(name || "").trim()) ? "" : String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase().replace(/[^\p{L}\p{N}]/gu, ""));

// The four inboxes (hello@, orders@, wholesale@ and the website's forms) and All; the one picked
// is remembered on this device.
const BOXES = [["", "All"], ["hello", "Hello"], ["orders", "Orders"], ["wholesale", "Wholesale"], ["forms", "Forms"]];
const BOX_LABEL = Object.fromEntries(BOXES.filter(([id]) => id));
let pickedBox = (() => {
  try {
    return localStorage.getItem("bo-inbox-box") || "";
  } catch {
    return "";
  }
})();
// A teammate picked is "@abu": their conversations, whatever inbox they're in.
const inboxBox = () => (BOX_LABEL[pickedBox] || /^@[a-z0-9._-]+$/.test(pickedBox) ? pickedBox : "");
let pickedChannel = (() => {
  try {
    return localStorage.getItem("bo-inbox-channel") || "";
  } catch {
    return "";
  }
})();
const inboxChannel = () => (["email", "chat"].includes(pickedChannel) ? pickedChannel : "");
const inboxUrl = () =>
  `/api/admin/inbox?status=${state.sub}${inboxBox().startsWith("@") ? `&owner=${inboxBox().slice(1)}` : inboxBox() ? `&box=${inboxBox()}` : ""}${inboxChannel() ? `&channel=${inboxChannel()}` : ""}${state.inboxQuery ? `&q=${encodeURIComponent(state.inboxQuery)}` : ""}`;

// Who the team writes as: "orders@" for a shared address, the person's name for a teammate.
const senderLabel = (local, list = state.inbox?.senders || state.conv?.senders || []) => {
  const x = list.find((s) => s.local === local);
  return !x ? `${local}@` : x.shared ? `${local}@` : x.name;
};
// A teammate's round photo, or their initials.
const personAvatar = (x, cls = "mail-avatar") => (x?.photo ? `<img class="${cls}" src="/media/${esc(x.photo)}" alt="">` : `<span class="${cls}" aria-hidden="true">${esc(initialsOf(x?.name) || "A")}</span>`);

// A photo cut to a 240px square from its middle, for a teammate's avatar.
async function squarePhoto(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) throw new Error("Please choose a JPEG, PNG or WebP image.");
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 240;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, 240, 240);
  ctx.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, 240, 240);
  return canvas.toDataURL("image/jpeg", 0.88);
}

// The team: each person's name as their emails show it ("Emily Chen <emily@mimifood.com>") and
// their photo, or take them off. New people are added by writing as them (From: emily@).
function peopleForm() {
  const people = (state.inbox?.senders || []).filter((x) => !x.shared);
  const photoButton = (x) => `<label class="btn btn-sm">${icon("image")}<span>${x.photo ? "Replace Photo" : "Add Photo"}</span><input type="file" accept="image/jpeg,image/png,image/webp" data-person-photo hidden></label>`;
  const drawer = openPanel("People", `
    <form class="panel form-stack" data-people-form>
      ${people
        .map(
          (x) => `<div class="card person-row" data-person="${esc(x.local)}" data-photo="${esc(x.photo || "")}">
            <span class="person-photo">${personAvatar(x, "person-avatar")}</span>
            <label class="field"><span>${esc(x.address)}</span><input name="name" value="${esc(x.name)}" maxlength="60" required autocomplete="off"></label>
            <div class="person-actions">${photoButton(x)}<button type="button" class="btn btn-sm btn-ghost" data-person-remove aria-label="Remove ${esc(x.name)}">${icon("trash")}<span>Remove</span></button></div>
          </div>`
        )
        .join("")}
      <p class="muted">To add someone, write as them (From: emily@).</p>
      <div class="drawer-actions"><button type="submit" class="btn btn-primary">Save</button></div>
    </form>`);
  const f = $("[data-people-form]", drawer);
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const remove = e.target.closest("[data-person-remove]");
    if (remove) remove.closest("[data-person]").remove();
  };
  drawer.onchange = async (e) => {
    const input = e.target.closest("[data-person-photo]");
    if (!input?.files[0]) return;
    const row = input.closest("[data-person]");
    const label = input.closest("label");
    label.classList.add("is-busy");
    try {
      const { id } = await api("/api/admin/newsletters/images", { method: "POST", body: { dataUrl: await squarePhoto(input.files[0]) } });
      row.dataset.photo = id;
      $(".person-photo", row).innerHTML = personAvatar({ photo: id }, "person-avatar");
      $("span", label).textContent = "Replace Photo";
    } catch (error) {
      panelError(error.message);
    } finally {
      label.classList.remove("is-busy");
      input.value = "";
    }
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const rows = $$("[data-person]", f).map((r) => ({ local: r.dataset.person, name: $("input[name=name]", r).value.trim(), photo: r.dataset.photo || "" }));
    if (rows.some((r) => !r.name)) return panelError("Give everyone a name.");
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      await api("/api/admin/inbox/people", { method: "PATCH", body: { people: rows } });
      closeDrawer();
      state.inbox = await api(inboxUrl());
      render();
      toast("Saved.");
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

// Close, reopen or hand over the conversations picked in the list.
async function inboxBulk(change) {
  const ids = [...(state.inboxPicked || [])];
  if (!ids.length) return;
  try {
    await api("/api/admin/inbox/bulk", { method: "POST", body: { ids, ...change } });
    state.inboxPicked = new Set();
    state.inboxSelecting = false;
    state.inbox = await api(inboxUrl());
    render();
    toast(change.status ? `${ids.length === 1 ? "Conversation" : `${ids.length} conversations`} ${change.status === "closed" ? "closed" : "reopened"}.` : change.owner ? `Handed to ${senderLabel(change.owner)}.` : "Back in their inboxes.");
  } catch (error) {
    toast(error.message, "error");
  }
}
app.addEventListener("change", (e) => {
  const t: any = e.target;
  if (t.matches("[data-inbox-bulk-owner]") && t.value) inboxBulk({ owner: t.value === "-" ? "" : t.value });
  if (t.matches("[data-conv-assign]")) assignConversation(t.value);
  if (t.matches("[data-card-pick]") && t.value) sendOrderCard(t);
});
// One of their orders, sent as a card (the server makes it fit the channel).
async function sendOrderCard(select) {
  const number = select.value;
  select.disabled = true;
  try {
    state.conv = await api(`/api/admin/inbox/${state.conv.conversation.id}/card`, { method: "POST", body: { number } });
    render();
    toast(`${number} sent`);
  } catch (error) {
    select.disabled = false;
    select.value = "";
    toast(error.message, "error");
  }
}
// Email, chat or both: remembered on this device.
async function pickChannel(value) {
  pickedChannel = value;
  try {
    localStorage.setItem("bo-inbox-channel", pickedChannel);
  } catch {
    /* remembered for this visit only */
  }
  state.inbox = await api(inboxUrl());
  render();
}
// Search: the list follows the words typed (after a short pause), across open and closed.
let inboxSearchTimer;
app.addEventListener("input", (e) => {
  const t: any = e.target;
  if (!t.matches("[data-inbox-search]")) return;
  clearTimeout(inboxSearchTimer);
  inboxSearchTimer = setTimeout(async () => {
    state.inboxQuery = t.value.trim();
    try {
      state.inbox = await api(inboxUrl());
      redrawKeepingFocus();
    } catch {
      /* next keystroke */
    }
  }, 250);
});
// Hand the open conversation to a teammate (their address is then the one replies go out as), or
// back to its inbox.
async function assignConversation(local) {
  try {
    state.conv = await api(`/api/admin/inbox/${state.conv.conversation.id}`, { method: "PATCH", body: { owner: local } });
    render();
    toast(local ? `Handed to ${senderLabel(local, state.conv.senders)}.` : "Back in its inbox.");
  } catch (error) {
    toast(error.message, "error");
  }
}

// A new email from the Inbox: who it's from, to, subject and message. It opens as a conversation.
function newEmailForm() {
  const list = state.inbox?.senders || [];
  const box = inboxBox();
  const from = box.startsWith("@") ? box.slice(1) : box && box !== "forms" ? box : "hello";
  const drawer = openPanel("New Email", `
    <form class="panel form-stack" data-new-email>
      ${fromPicker(from, list, "new-email-from")}
      <label class="field"><span>To</span><input name="email" type="email" required autocomplete="off" placeholder="name@example.com"></label>
      <label class="field"><span>Name</span><input name="name" autocomplete="off" placeholder="Optional"></label>
      <label class="field"><span>Subject</span><input name="subject" required maxlength="160"></label>
      <label class="field"><span>Message</span><textarea name="text" rows="8" required maxlength="20000"></textarea></label>
      <div class="drawer-actions"><button type="submit" class="btn btn-primary">${icon("send")}<span>Send</span></button></div>
    </form>`);
  const f = $("[data-new-email]", drawer);
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) closeDrawer();
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const missing = ["email", "subject", "text"].filter((k) => !f[k].value.trim());
    if (missing.length) return flagFields(f, "", missing);
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const { id } = await api("/api/admin/inbox/compose", { method: "POST", body: { from: f.from.value, email: f.email.value, name: f.name.value, subject: f.subject.value, text: f.text.value } });
      closeDrawer();
      location.hash = `#inbox/${id}`;
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

// One announcement to many cafés: it lands in each café's portal chat (and their email, if
// ticked), each as its own conversation here that opens when they answer.
async function announceForm() {
  let cafes = [];
  try {
    ({ cafes } = await api("/api/admin/inbox/announce"));
  } catch (error) {
    return toast(error.message);
  }
  const drawer = openPanel("New Announcement", `
    <form class="panel form-stack" data-announce>
      <label class="field"><span>Title</span><input name="subject" required maxlength="160"></label>
      <label class="field"><span>Message</span><textarea name="text" rows="7" required maxlength="5000"></textarea></label>
      <fieldset class="field"><legend>Cafés</legend>
        ${cafes.length ? `<label class="checkbox"><input type="checkbox" data-announce-all checked><span>Select All</span></label><div class="check-grid">${cafes.map((c) => `<label class="checkbox"><input type="checkbox" name="cafes" value="${esc(c.id)}" checked><span>${esc(c.business)}</span></label>`).join("")}</div>` : `<p class="muted">No wholesale cafés yet.</p>`}
      </fieldset>
      <label class="checkbox"><input type="checkbox" name="email"><span>Also Email Them</span></label>
      <div class="drawer-actions"><button type="submit" class="btn btn-primary" data-announce-send>${icon("send")}<span></span></button></div>
    </form>`);
  const f = $("[data-announce]", drawer);
  const picked = () => $$("input[name=cafes]", f).filter((x) => x.checked);
  const count = () => {
    const n = picked().length;
    $("[data-announce-send] span", f).textContent = n ? `Send to ${n} Café${n === 1 ? "" : "s"}` : "Send";
    const all = $("[data-announce-all]", f);
    if (all) all.checked = n === cafes.length;
  };
  count();
  drawer.onclick = (e) => {
    if (e.target.closest("[data-close]")) closeDrawer();
  };
  drawer.onchange = (e) => {
    if (e.target.matches("[data-announce-all]")) for (const x of $$("input[name=cafes]", f)) x.checked = e.target.checked;
    count();
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const missing = ["subject", "text"].filter((k) => !f[k].value.trim());
    if (missing.length) return flagFields(f, "", missing);
    if (!picked().length) return panelError("Pick at least one café.");
    const button = $("button[type=submit]", f);
    button.disabled = true;
    try {
      const { sent } = await api("/api/admin/inbox/announce", { method: "POST", body: { subject: f.subject.value, text: f.text.value, cafes: picked().map((x) => x.value), email: f.email.checked } });
      closeDrawer();
      toast(`Sent to ${sent} café${sent === 1 ? "" : "s"}.`);
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
}

function inboxView() {
  const { conversations: rows, counts, ready } = state.inbox;
  // Only what's broken shows here (email can't be sent or received, an email that didn't come in,
  // texts that can't connect); a channel simply not set up says nothing.
  const emailSetup = !ready.sending
    ? "Email isn't connected yet, so replies can't be emailed."
    : !ready.receiving
      ? "Email replies can't reach the Inbox yet."
      : ready.lastInbound && !ready.lastInbound.ok
        ? `${ago(ready.lastInbound.at)}: ${ready.lastInbound.note}`
        : "";
  const textSetup = ready.texts === "error" ? "Texts aren't connecting right now." : "";
  const setup = [emailSetup, textSetup].filter(Boolean).join(" ");
  const box = inboxBox();
  const channel = inboxChannel();
  const q = state.inboxQuery || "";
  const selecting = Boolean(state.inboxSelecting);
  const picked = state.inboxPicked || new Set();
  const people = (state.inbox.senders || []).filter((x) => !x.shared);
  // One Filter menu for which inbox, whose, and email or chat (they used to be a column, tabs
  // and a dropdown); the choices are remembered on this device.
  const boxes = state.inbox.boxes || {};
  const tally = (b) => (b?.unread ? `<b class="count is-new">${b.unread}</b>` : b?.open ? `<b class="count">${b.open}</b>` : "");
  const item = (attrs, label, on, extra = "") => `<button type="button" ${attrs} aria-pressed="${on}"><span>${esc(label)}</span>${extra}${on ? icon("check", "i tb-check") : ""}</button>`;
  const filtered = [box, channel].filter(Boolean).length;
  const filter = `<details class="order-menu tb-menu"><summary class="btn btn-sm${filtered ? " is-on" : ""}">${icon("filter")}<span>${filtered ? `Filter · ${filtered}` : "Filter"}</span></summary><div class="order-menu-list tb-list">
      <p class="tb-head">Inbox</p>${BOXES.map(([id, label]) => item(`data-inbox-box="${id}"`, label, box === id, id ? tally(boxes[id]) : "")).join("")}
      ${people.length ? `<p class="tb-head">Person</p>${people.map((x) => item(`data-inbox-box="@${esc(x.local)}"`, x.name, box === `@${x.local}`, tally(state.inbox.people?.[x.local]))).join("")}<button type="button" data-form="people"><span>Edit People</span></button>` : ""}
      <p class="tb-head">Channel</p>${[["", "Email and Chat"], ["email", "Email"], ["chat", "Chat"]].map(([id, label]) => item(`data-inbox-channel="${id}"`, label, channel === id)).join("")}
    </div></details>`;
  const bar = toolbar(
    `${filter.replace('class="order-menu tb-menu"', 'class="order-menu tb-menu inbox-filter"')}<label class="search inbox-search">${icon("search")}<input type="search" placeholder="Search names, emails, words" value="${esc(q)}" data-inbox-search aria-label="Search the inbox"></label>`,
    rows.length ? `<button type="button" class="btn btn-sm${selecting ? " is-on" : ""}" data-inbox-select>${selecting ? "Done" : "Select"}</button>` : ""
  );
  const bulk =
    selecting && picked.size
      ? `<div class="inbox-bulk" role="toolbar" aria-label="Selected conversations">
          <strong>${picked.size} selected</strong>
          <button type="button" class="btn btn-sm" data-inbox-bulk-status="${state.sub === "closed" && !q ? "open" : "closed"}">${icon(state.sub === "closed" && !q ? "reopen" : "archive")}<span>${state.sub === "closed" && !q ? "Reopen" : "Close"}</span></button>
          ${people.length ? `<label class="inbox-assign"><span class="sr-only">Hand to</span><select data-inbox-bulk-owner><option value="">Hand to…</option>${people.map((x) => `<option value="${esc(x.local)}">${esc(x.name)}</option>`).join("")}<option value="-">Back to its inbox</option></select></label>` : ""}
        </div>`
      : "";
  const row = (c) => {
    const [chIcon, chLabel] = CHANNEL[c.channel] || CHANNEL.email;
    const tags = [
      q && c.status === "closed" ? `<small class="inbox-box-tag">Closed</small>` : "",
      c.rating ? `<small class="inbox-box-tag" title="Their rating: ${RATING_LABEL[c.rating].split(" ")[1]}">${RATING_LABEL[c.rating].split(" ")[0]}</small>` : "",
      c.source === "announcement" ? `<small class="inbox-box-tag">Announcement</small>` : box ? "" : BOX_LABEL[c.box] ? `<small class="inbox-box-tag">${BOX_LABEL[c.box]}</small>` : "",
      c.owner && box !== `@${c.owner}` ? `<small class="inbox-box-tag is-person">${icon("User")}${esc(senderLabel(c.owner))}</small>` : "",
    ].join("");
    return `<li class="${[selecting ? "is-selecting" : "", c.id === state.conv?.conversation.id ? "is-open" : ""].filter(Boolean).join(" ")}">${selecting ? `<input type="checkbox" class="inbox-pick" data-inbox-pick="${esc(c.id)}" aria-label="Select ${esc(c.name)}"${picked.has(c.id) ? " checked" : ""}>` : ""}<a class="inbox-row${c.unread ? " is-unread" : ""}" href="#inbox/${esc(c.id)}">
      <span class="inbox-avatar tone-${toneOf(c.business || c.name)}${c.logo ? " has-logo" : ""}" aria-hidden="true">${c.logo ? `<img src="/api/admin/accounts/${esc(c.accountId)}/logo?v=${encodeURIComponent(c.logo)}" alt="">` : initialsOf(c.business || c.name) || icon("customers")}<i class="inbox-ch" title="${chLabel}">${icon(chIcon)}</i></span>
      <span class="inbox-text">
        <span class="inbox-line"><strong>${c.business ? `${esc(c.business)}${c.name && c.name !== c.business ? ` <span class="inbox-who">· ${esc(c.name.split(" ")[0])}</span>` : ""}` : esc(c.name)}</strong><span class="inbox-meta"><small>${esc(ago(c.updatedAt))}</small>${c.unread ? '<i class="unread-dot" aria-label="Unread"></i>' : ""}</span></span>
        ${
          // An email's subject, then its latest message; a chat or text just its latest message.
          c.channel === "email" ? `<span class="inbox-subject">${esc(c.subject)}</span>` : ""
        }
        ${(() => {
          const last = c.last ? previewOf(c.last.text) : "";
          const subj = String(c.subject || "").replace(/^\w+: /, "").replace(/…$/, "");
          if (!last || (c.channel === "email" && subj && last.startsWith(subj))) return c.channel === "email" || !c.subject ? "" : `<small class="inbox-preview">${esc(c.subject)}</small>`;
          return `<small class="inbox-preview">${c.last.from === "staff" ? `${c.last.sender ? esc(senderLabel(c.last.sender)) : "You"}: ` : ""}${esc(last)}</small>`;
        })()}
        ${tags ? `<span class="inbox-tags">${tags}</span>` : ""}
      </span>
    </a></li>`;
  };
  // Today, Yesterday, This week, Earlier: a heading where the day changes.
  const dayOf = (iso) => {
    const d = new Date(iso);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const days = Math.floor((start.getTime() - d.getTime()) / 86400e3) + 1;
    return d >= start ? "Today" : days <= 1 ? "Yesterday" : days < 7 ? "This week" : "Earlier";
  };
  // A café's threads sit together under its newest one (each still its own row, led by the café's
  // name), so several open conversations with one café read as one place.
  const order = [];
  const seen = new Set();
  for (const c of rows) {
    if (seen.has(c.id)) continue;
    const kin = c.accountId ? rows.filter((x) => x.accountId === c.accountId) : [c];
    for (const x of kin) seen.add(x.id), order.push({ c: x, lead: x === kin[0] ? x : kin[0] });
  }
  const listed = order.map(({ c, lead }, i) => `${i === 0 || (lead === c && dayOf(order[i - 1].lead.updatedAt) !== dayOf(c.updatedAt)) ? `<li class="inbox-day" aria-hidden="true">${dayOf(c.updatedAt)}</li>` : ""}${row(c)}`).join("");
  const empty = q
    ? `<div class="empty empty-lg">${icon("search", "i i-xl")}<p><strong>Nothing matches “${esc(q)}”</strong></p></div>`
    : state.sub === "rated"
    ? `<div class="empty empty-lg">${icon("star", "i i-xl")}<p><strong>No ratings yet</strong></p></div>`
    : `<div class="empty empty-lg">${icon("inbox", "i i-xl")}<p><strong>${state.sub === "closed" ? "Nothing closed yet" : "All caught up"}</strong></p></div>`;
  // How they've rated us lately (this inbox, the last 30 days); a tap shows the ratings, lowest first.
  const r = state.inbox.ratings;
  const score =
    r?.count && !q
      ? `<a class="inbox-score" href="#inbox/rated"${state.sub === "rated" ? ' aria-current="page"' : ""}><span aria-hidden="true">${RATING_LABEL[Math.round(r.average)].split(" ")[0]}</span><strong>${r.average.toFixed(1)} average</strong><span class="muted">${r.count} rating${r.count === 1 ? "" : "s"} in the last 30 days${r.low ? ` · ${r.low} low` : ""}</span></a>`
      : "";
  return `${bar}
    ${score}
    ${bulk}
    <section class="card table-card">
      ${rows.length ? `<ul class="inbox-list">${listed}</ul>` : empty}
    </section>
    ${setup ? `<p class="inbox-setup">${icon("CircleAlert")}<span>${esc(setup)}</span></p>` : ""}`;
}

// Open, Closed and Rated beside the title (not while searching, which looks across them all).
const inboxHeadFilters = () => {
  const v = state.inbox;
  if (!v || state.inboxQuery) return "";
  return chips("Inbox", [
    { href: "#inbox", label: "Open", count: v.counts.open, on: state.sub === "open" },
    { href: "#inbox/closed", label: "Closed", count: v.counts.closed, on: state.sub === "closed" },
    { href: "#inbox/rated", label: "Rated", count: v.counts.rated || 0, tone: "t-yellow", on: state.sub === "rated" },
  ]);
};

const AUTHOR = { customer: "", staff: "You", assistant: "Assistant" };
// How they rated a conversation, from its closing email.
const RATING_LABEL = { 1: "😠 Terrible", 2: "🙁 Bad", 3: "😐 OK", 4: "😃 Great", 5: "🤩 Amazing" };
// A photo, voice note or file a customer texted (served to the back office only).
function fileView(f) {
  const src = `/api/admin/inbox/files/${encodeURIComponent(f.id)}`;
  if (f.kind === "image") return `<a class="msg-photo" href="${src}" target="_blank" rel="noopener"><img src="${src}" alt="Photo they sent" loading="lazy"></a>`;
  if (f.kind === "audio") return `<div class="msg-file"><audio controls preload="none" src="${src}"></audio><a href="${src}" download>Download</a></div>`;
  if (f.kind === "video") return `<video class="msg-photo" controls preload="metadata" src="${src}"></video>`;
  return `<a class="msg-file" href="${src}" target="_blank" rel="noopener">${icon("file")}<span>${esc(f.name || (f.kind === "pdf" ? "PDF" : "File"))}</span></a>`;
}

// iMessage's tapbacks and effects, as the Inbox offers them on texts.
const TAPBACKS = [["❤️", "Love"], ["👍", "Like"], ["👎", "Dislike"], ["😂", "Laugh"], ["‼️", "Emphasize"], ["❓", "Question"]];
const EFFECTS = [["confetti", "Confetti"], ["fireworks", "Fireworks"], ["balloons", "Balloons"], ["heart", "Love"], ["sparkles", "Sparkles"], ["celebration", "Celebration"], ["gentle", "Gentle"], ["loud", "Loud"], ["slam", "Slam"]];
// A text we can react or reply to, theirs or ours (an iMessage with its id, sent and not unsent).
// What this conversation's channel can do (iMessage, chat or email: the server says).
const capsNow = () => state.conv?.caps || {};
const reactable = (m, c) => Boolean(capsNow().reaction) && (c.channel !== "imessage" || m.textId) && !m.reaction && !m.unsent && !m.action && !m.poll && (m.from === "customer" || m.status === "sent");

function bubble(m, c) {
  // What the texting assistant did ("Placed MF-1A2B3C · $240.00"), as a line between texts.
  if (m.action) return `<li class="msg-note"><span>${esc(m.text)}</span><small class="muted">${esc(date(m.at))}</small></li>`;
  // Their tapback on one of our texts, the same way: "Rae reacted 👍 to “Good to go?”".
  if (m.reaction) return `<li class="msg-note"><span>${esc(c.name.split(" ")[0])} ${esc(m.text.replace(/^Reacted/, "reacted"))}</span><small class="muted">${esc(date(m.at))}</small></li>`;
  // A text we unsent: gone from their phone too.
  if (m.unsent) return `<li class="msg-note"><span>${m.from === "assistant" ? "The assistant" : "You"} unsent a message</span><small class="muted">${esc(date(m.unsent))}</small></li>`;
  const pending = m.status === "pending" || m.status === "sending";
  const meta = m.status === "failed" ? `<span class="inbox-failed">Didn't send · <button type="button" class="link" data-reply-now="${esc(m.id)}">Try again</button></span>` : pending ? "Not sent yet" : `${m.from === "customer" ? esc(state.conv?.authors?.[m.author || (c.accountId && c.userId)] || c.name) : m.sender ? esc(senderLabel(m.sender, state.conv?.senders)) : AUTHOR[m.from]} · ${esc(date(m.at))}`;
  // The assistant's texts go out from us, on our side like staff replies.
  const out = m.from === "assistant" && c.channel === "imessage";
  // A threaded reply shows the text it answers; photos and voice notes show as themselves.
  const to = m.replyTo && c.messages.find((x) => x.id === m.replyTo);
  const quote = to ? `<span class="msg-quote">${esc(to.text.length > 80 ? `${to.text.slice(0, 79)}…` : to.text)}</span>` : "";
  const files = (m.files || []).map(fileView).join("");
  // "Sent 3 photos." under the photos themselves says nothing new; a voice note keeps its length.
  // Any text: tap it for the tapbacks and Reply, as in Messages; a tapback shows on its corner.
  const pick = reactable(m, c);
  const picked = pick && state.picked === m.id;
  const tap = m.tapback ? `<span class="msg-tapback" title="${m.tapback.by === "assistant" ? "The assistant" : "You"} reacted">${esc(m.tapback.emoji)}</span>` : "";
  const text = files && /^Sent (an?|\d+) (photos?|videos?|PDFs?)\.$/.test(m.text) ? "" : pick ? `<div class="msg-bubble is-pickable" role="button" tabindex="0" aria-expanded="${picked}" data-msg-pick="${esc(m.id)}">${esc(m.text)}</div>` : `<div class="msg-bubble${m.poll ? " msg-poll" : ""}">${esc(m.poll && typeof m.poll === "object" ? `${m.poll.question}\n${m.poll.options.map((o) => `${o === m.poll.choice ? "✓" : "○"} ${o}`).join("\n")}` : m.text)}</div>`;
  const bar = picked
    ? `<div class="msg-react" role="toolbar" aria-label="React or reply">${TAPBACKS.map(([e, label]) => `<button type="button" aria-label="${label}" aria-pressed="${m.tapback?.emoji === e}" data-tapback="${e}" data-tapback-to="${esc(m.id)}">${e}</button>`).join("")}<button type="button" class="msg-react-reply" data-reply-to="${esc(m.id)}">Reply</button></div>`
    : "";
  const body = text || tap ? `<div class="msg-body">${text}${tap}</div>${bar}` : bar;
  const effectName = m.effect && (EFFECTS.find(([id]) => id === m.effect)?.[1] || m.effect);
  const effect = effectName ? ` · ${pending ? "With" : "Sent with"} ${esc(effectName)}` : "";
  // Like Messages: "Read" with the time, under the latest of our texts or chat replies they've read.
  const lastRead = m.readAt && m.from !== "customer" && !c.messages.slice(c.messages.indexOf(m) + 1).some((x) => x.readAt);
  const read = lastRead ? ` · Read ${esc(new Date(m.readAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }))}` : "";
  const edited = m.edits ? " · Edited" : "";
  const poll = m.poll ? " · Poll" : "";
  // Our sent texts can be edited for 15 minutes and unsent for 2, as in Messages (until the server
  // restarts: iMessage only changes texts it handed back when they were sent).
  const age = Date.now() - Date.parse(m.sentAt || m.at);
  const own = Boolean(capsNow().edit) && m.from !== "customer" && m.status === "sent" && !m.poll && !m.files && !m.cards && (c.channel === "imessage" ? m.textId && (state.conv?.changeable || []).includes(m.id) : true);
  const tools = own && age < 15 * 60e3 ? `<span class="msg-tools"> · <button type="button" class="link" data-text-edit="${esc(m.id)}">Edit</button>${age < 2 * 60e3 ? ` · <button type="button" class="link" data-text-unsend="${esc(m.id)}">Unsend</button>` : ""}</span>` : "";
  const editing = state.editing === m.id;
  const bubbleOrEditor = editing
    ? `<form class="msg-edit" data-text-edit-form="${esc(m.id)}"><label class="sr-only" for="edit-${esc(m.id)}">Edit text</label><textarea id="edit-${esc(m.id)}" name="text" rows="${Math.min(8, Math.max(2, Math.ceil(m.text.length / 42) + m.text.split("\n").length - 1))}" maxlength="20000">${esc(m.text)}</textarea><span><button type="button" class="btn btn-sm btn-ghost" data-text-edit-cancel>Cancel</button><button type="submit" class="btn btn-sm btn-primary">Save</button></span></form>`
    : body;
  // What the café said about one of the assistant's answers (in the portal's chat).
  const said = m.feedback ? `<p class="msg-feedback ${m.feedback.helpful ? "is-good" : "is-bad"}"><strong>${m.feedback.helpful ? "Marked helpful" : "Feedback"}</strong>${m.feedback.note ? `<span>“${esc(m.feedback.note)}”</span>` : ""}</p>` : "";
  return `<li class="msg msg-${m.from}${out ? " is-out" : ""}${pending ? " is-pending" : ""}">${quote}${files}${bubbleOrEditor}${said}<small class="muted">${meta}${poll}${effect}${edited}${read}${editing ? "" : tools}</small></li>`;
}

// An email as an email: who it's from (name and address), when, and the whole message. Older
// ones in a long thread fold to a line (who, when, the start of it); a tap opens them.
function mailCard(m, c, folded) {
  if (m.from !== "customer" && m.from !== "staff") return bubble(m, c);
  const them = m.from === "customer";
  const sender = !them && (state.conv.senders || []).find((x) => x.local === (m.sender || state.conv.from));
  const name = them ? c.name : sender ? sender.name : "You";
  const address = them ? c.email : sender ? sender.address : "";
  const pending = m.status === "pending" || m.status === "sending";
  const when = m.status === "failed" ? `<span class="inbox-failed">Didn't send · <button type="button" class="link" data-reply-now="${esc(m.id)}">Try again</button></span>` : pending ? "Not sent yet" : esc(date(m.at));
  // An email conversation carried on in the chat window on the site (from "our chat" in an email).
  const inChat = m.via === "chat" ? "In chat" : m.inChat ? (m.emailedAt ? "In chat, then emailed" : m.seenInChat ? "Seen in chat" : m.emailError ? "In chat (email didn't send)" : "In chat · emails if unread in 5 min") : "";
  const files = (m.files || []).map(fileView).join("");
  if (folded)
    return `<li class="mail is-folded${them ? "" : " is-ours"}"><button type="button" class="mail-fold" data-mail-unfold="${esc(m.id)}" aria-label="Show this message">
      ${sender ? personAvatar(sender) : `<span class="mail-avatar" aria-hidden="true">${esc(initialsOf(name) || "A")}</span>`}<strong>${esc(name)}</strong><span class="mail-snippet">${esc(previewOf(m.text))}</span><small class="muted">${esc(dayShort(m.at))}</small>
    </button></li>`;
  return `<li class="mail${them ? "" : " is-ours"}${pending ? " is-pending" : ""}">
    <header class="mail-head">${sender ? personAvatar(sender) : `<span class="mail-avatar" aria-hidden="true">${esc(initialsOf(name) || "A")}</span>`}<span class="mail-who"><strong>${esc(name)}</strong>${address ? `<small class="muted">${esc(address)}</small>` : ""}</span><small class="muted mail-when">${inChat ? `<span class="mail-via">${icon("chat", "i i-sm")}${esc(inChat)}</span> · ` : ""}${when}</small></header>
    ${files}<div class="mail-body">${esc(m.text)}</div>
  </li>`;
}

// Who a reply or new email goes out as: a chip with the name and address; tapping it lists the
// team's addresses, and "Someone new" takes a teammate's (emily@), who's added on sending.
function fromPicker(value, list, id) {
  const x = list.find((s) => s.local === value) || { local: value, name: value, address: `${value}@`, shared: false };
  const label = (s) => (s.shared ? s.local[0].toUpperCase() + s.local.slice(1) : s.name);
  return `<div class="from-picker" data-from-picker>
    <input type="hidden" name="from" value="${esc(x.local)}">
    <span class="from-label">From</span>
    <button type="button" class="from-chip" data-from-toggle aria-expanded="false" aria-controls="${id}"><strong data-from-name>${esc(label(x))}</strong><small class="muted" data-from-address>${esc(x.address)}</small></button>
    <div class="from-menu" id="${id}" hidden>
      ${list.map((s) => `<button type="button" class="from-option${s.local === x.local ? " is-on" : ""}" data-from-pick="${esc(s.local)}" data-name="${esc(label(s))}" data-address="${esc(s.address)}"><strong>${esc(label(s))}</strong><small class="muted">${esc(s.address)}</small></button>`).join("")}
      <div class="from-new"><label class="sr-only" for="${id}-new">Someone new</label><input id="${id}-new" placeholder="Someone new: emily@" autocomplete="off" spellcheck="false" autocapitalize="off" data-from-new><button type="button" class="btn btn-sm" data-from-add>Use</button></div>
    </div>
  </div>`;
}
document.addEventListener("click", (e) => {
  const t: any = e.target;
  const picker = t.closest("[data-from-picker]");
  // Clicking anywhere else closes an open list.
  for (const menu of $$(".from-menu:not([hidden])")) if (!picker || !picker.contains(menu)) menu.hidden = true;
  if (!picker) return;
  const menu = $(".from-menu", picker);
  const choose = (local, name, address) => {
    $("[name=from]", picker).value = local;
    $("[data-from-name]", picker).textContent = name;
    $("[data-from-address]", picker).textContent = address;
    menu.hidden = true;
    $("[data-from-toggle]", picker).setAttribute("aria-expanded", "false");
  };
  if (t.closest("[data-from-toggle]")) {
    menu.hidden = !menu.hidden;
    t.closest("[data-from-toggle]").setAttribute("aria-expanded", String(!menu.hidden));
    return;
  }
  const opt = t.closest("[data-from-pick]");
  if (opt) return choose(opt.dataset.fromPick, opt.dataset.name, opt.dataset.address);
  if (t.closest("[data-from-add]")) {
    const local = $("[data-from-new]", picker).value.trim().toLowerCase().replace(/@.*$/, "");
    if (!/^[a-z0-9][a-z0-9._-]{0,30}$/.test(local)) return toast("Use letters, numbers, dots or dashes, like emily@.", "error");
    const domain = (state.inbox?.senders || state.conv?.senders || [])[0]?.address.split("@")[1] || "";
    choose(local, local[0].toUpperCase() + local.slice(1), `${local}@${domain}`);
  }
});
document.addEventListener("keydown", (e) => {
  const t: any = e.target;
  if (e.key === "Enter" && t.matches("[data-from-new]")) {
    e.preventDefault();
    $("[data-from-add]", t.closest("[data-from-picker]")).click();
  }
  if (e.key === "Escape") for (const menu of $$(".from-menu:not([hidden])")) menu.hidden = true;
});

function conversationView() {
  const { conversation: c, orders, account } = state.conv;
  const text = c.channel === "imessage";
  const closed = c.status === "closed";
  const email = c.channel === "email";
  const pending = c.messages.filter((m) => m.from === "staff" && m.status === "pending");
  // The tag already says Chat or Email; the contact form is the one source it doesn't show.
  const via = c.source === "form" ? "Contact form" : c.source === "wholesale" ? "Wholesale inquiry" : "";
  const people = (state.conv.senders || []).filter((x) => !x.shared);
  // A long email thread folds all but its latest two (and anything not yet sent) to a line each.
  const shown = c.messages.filter((m) => !m.earlier || !email);
  const replyingTo = state.replyTo && c.messages.find((m) => m.id === state.replyTo && reactable(m, c));
  const foldBefore = email && shown.length > 3 ? shown.length - 2 : 0;
  const unfold = state.unfold || new Set();
  const thread = email
    ? shown.map((m, i) => mailCard(m, c, i < foldBefore && m.status !== "pending" && m.status !== "failed" && !unfold.has(m.id))).join("")
    : c.messages.map((m) => bubble(m, c)).join("");
  return `
    <div class="inbox-conv" data-conv>
      <div class="conv-bar">
        <a class="btn btn-ghost btn-sm" href="#inbox${closed ? "/closed" : ""}" aria-label="Back to the inbox">${icon("back")}<span>Inbox</span></a>
        <h2 class="conv-title">${email ? esc(c.subject) : account && c.chatHash ? `${state.conv.logo ? `<img class="conv-logo" src="/api/admin/accounts/${esc(account.id)}/logo?v=${encodeURIComponent(state.conv.logo)}" alt="">` : ""}${esc(account.business)}` : esc(c.name)}</h2>
        <span class="conv-actions">
          ${(text || c.chatHash) && state.conv.agentReady ? `<button type="button" class="btn btn-sm${c.agent ? "" : " btn-ghost"}" data-conv-agent="${c.agent ? "off" : "on"}" aria-pressed="${c.agent}" title="${c.agent ? `The assistant answers their ${text ? "texts" : "chat"}` : `You answer their ${text ? "texts" : "chat"}`}">${icon("sparkles")}<span>${c.agent ? "Assistant On" : "Assistant Off"}</span></button>` : ""}
          ${people.length ? `<label class="conv-assign"><span class="sr-only">Handled by</span><select data-conv-assign><option value=""${c.owner ? "" : " selected"}>${c.owner ? "Back to its inbox" : "Not handed to anyone"}</option>${people.map((x) => `<option value="${esc(x.local)}"${c.owner === x.local ? " selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>` : ""}
        </span>
        <button type="button" class="btn btn-sm conv-close" data-conv-status="${closed ? "open" : "closed"}">${icon(closed ? "reopen" : "archive")}<span>${closed ? "Reopen" : "Close"}</span></button>
      </div>
      <div class="inbox-columns">
        <section class="card inbox-thread">
          <ol class="${email ? "mails" : "msgs"}">${thread}</ol>
          ${!closed ? composePanel() : ""}
          <form class="inbox-compose${!closed && (state.attach || state.voice || state.pollOpen) ? " is-hidden" : ""}" data-reply>
            ${pending
              .map(
                (m) => `<div class="undo-bar" role="status" data-undo="${esc(m.id)}" data-send-at="${esc(m.sendAt)}">
                  <span>Sending in <b data-undo-left>${Math.max(0, Math.ceil((Date.parse(m.sendAt) - Date.now()) / 1000))}</b>s.</span>
                  <button type="button" data-reply-undo="${esc(m.id)}">Undo</button><span aria-hidden="true">·</span><button type="button" data-reply-now="${esc(m.id)}">Send Now</button>
                </div>`
              )
              .join("")}
            ${c.email && email ? fromPicker(state.conv.from, state.conv.senders || [], "reply-from") : ""}
            ${replyingTo ? `<div class="compose-quote"><span class="msg-quote">${esc(replyingTo.text.length > 120 ? `${replyingTo.text.slice(0, 119)}…` : replyingTo.text)}</span><button type="button" class="icon-btn" data-reply-to-cancel aria-label="Cancel reply">${icon("close")}</button></div>` : ""}
            <label class="sr-only" for="reply-text">Reply</label>
            <textarea id="reply-text" name="text" rows="4" maxlength="20000" placeholder="${c.messages.some((x) => x.from === "customer") ? "Reply to" : "Write to"} ${esc(account && c.chatHash ? account.business : c.name.split(" ")[0])}…" data-reply-text>${esc(state.draft || "")}</textarea>
            <div class="inbox-compose-foot">
              <small class="muted">${(text || c.chatHash) && c.agent ? "The assistant is answering. Your reply turns it off." : text ? `Sent by iMessage to ${esc(phoneLabel(c.phone))}.` : !c.email ? "Goes to their chat." : c.chatHash ? `Goes to their chat and ${esc(c.email)}.` : `To ${esc(c.email)}`}</small>
              <span class="btn-row">${(email ? c.email : c.chatHash) && !closed ? `<button type="button" class="btn btn-sm" data-reply-close title="Send, ask for a rating, and close">Send &amp; Close</button>` : ""}${!closed ? composeTools(c, orders) : ""}${text && !closed ? `<label class="sr-only" for="reply-effect">Effect</label><select id="reply-effect" class="compose-effect${state.effect ? " is-on" : ""}" name="effect" data-reply-effect><option value="">Effect</option>${EFFECTS.map(([id, label]) => `<option value="${id}"${state.effect === id ? " selected" : ""}>${label}</option>`).join("")}</select>` : ""}<button type="submit" class="btn btn-primary btn-sm">${icon("send")}<span>Send</span></button></span>
            </div>
          </form>
        </section>
        <aside class="card inbox-side">
          ${text ? who(c.name, `<a href="${c.phone.includes("@") ? "mailto" : "tel"}:${esc(c.phone)}">${esc(phoneLabel(c.phone))}</a>`) : who(c.name, c.email ? `<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>` : "No email")}
          ${state.conv.person ? personCard(state.conv.person, c) : ""}
          <dl class="inbox-facts">
            ${leadFacts(state.conv.lead)}
            <dt>Started</dt><dd>${esc(date(c.createdAt))}</dd>
            <dt>Inbox</dt><dd>${BOX_LABEL[state.conv.box] || "Hello"}</dd>
            ${c.owner ? `<dt>Handled by</dt><dd>${esc(senderLabel(c.owner, state.conv.senders))}</dd>` : ""}
            ${c.rating ? `<dt>Their rating</dt><dd>${RATING_LABEL[c.rating.score]}${c.rating.comment ? `<br>“${esc(c.rating.comment)}”` : ""}</dd>` : ""}
            <dt>Via</dt><dd>${via || { chat: "Chat", imessage: "Text", email: "Email" }[c.channel] || "Email"}</dd>
            ${text && c.cardShared ? `<dt>Contact Card</dt><dd>Sent</dd>` : ""}
            ${text ? `<dt>Wholesale</dt><dd>${account ? `<a href="#wholesale/accounts">${esc(account.business)}</a>` : `<span class="muted">None</span>`}</dd>` : ""}
          </dl>
          ${!c.email && !account ? "" : `<h3>Orders</h3>
          ${
            orders.length
              ? `<ul class="inbox-orders">${orders.map((o) => `<li><button type="button" class="link" data-conv-order="${esc(o.number)}">${esc(o.number)}</button>${statusBadge(o.status)}<small class="muted">${esc(dayShort(o.placedAt))} · ${money(o.total)}</small></li>`).join("")}</ul>`
              : `<p class="muted">No orders ${account ? "on this account" : "with this email"}.</p>`
          }`}
          <div class="inbox-side-foot"><button type="button" class="btn btn-sm btn-ghost bar-delete" data-conv-delete>${icon("trash")}<span>Delete Conversation</span></button></div>
        </aside>
      </div>
    </div>`;
}

// Who they are, beside an email conversation: customer or guest, subscriber, newsletter,
// wholesale; orders and spend; what they usually buy, where they work, their number; and
// their other conversations.
function personCard(p, c) {
  const tags = [
    p.customerId ? `Customer since ${esc(new Date(p.joined).toLocaleDateString("en-US", { month: "short", year: "numeric" }))}` : p.orders ? "Guest" : "",
    p.subscriptions ? `Subscriber${p.subscriptions > 1 ? ` ×${p.subscriptions}` : ""}` : "",
    p.newsletter ? "Newsletter" : "",
  ].filter(Boolean);
  // What they buy, how often, where they work and their number, as labeled rows.
  const usually = p.taste && [p.taste.coffee, String(p.taste.usual || "").replace(/ · (\p{L})/gu, (_, ch) => ` ${ch.toLowerCase()}`)].filter(Boolean).join(", ");
  const work = p.work && [[p.work.title, p.work.company].filter(Boolean).join(", "), p.work.city].filter(Boolean).join(" · ");
  const facts = [
    usually && ["Usually", esc(usually)],
    p.taste?.everyDays && ["Reorders", `Every ${p.taste.everyDays} days`],
    work && ["Works", esc(work)],
    p.phone && ["Phone", `<a href="tel:${esc(p.phone)}">${esc(phoneLabel(p.phone))}</a>`],
  ].filter(Boolean);
  return `<section class="person-card" aria-label="Who they are">
    ${tags.length || p.wholesale ? `<div class="chips-row">${tags.map((t) => `<span class="chip-sm">${t}</span>`).join("")}${p.wholesale ? `<a class="chip-sm is-good" href="#wholesale/accounts">${esc(p.wholesale.business)}</a>` : ""}</div>` : ""}
    ${p.orders ? `<div class="person-stats"><div><small>Orders</small><strong>${p.orders}</strong></div><div><small>Spent</small><strong>${money(p.spent)}</strong></div><div><small>Last order</small><strong>${esc(dayShort(p.lastOrderAt))}</strong></div></div>` : `<p class="muted">No orders yet.</p>`}
    ${facts.length ? `<dl class="inbox-facts">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>` : ""}
    <div class="btn-row">
      ${p.customerId ? `<button type="button" class="btn btn-sm" data-customer="${esc(p.customerId)}">Open Customer</button>` : ""}
      ${p.conversations ? `<button type="button" class="btn btn-sm btn-ghost" data-person-convs="${esc(c.email)}">${p.conversations} Other Conversation${p.conversations === 1 ? "" : "s"}</button>` : ""}
    </div>
  </section>`;
}

// The countdown on each held reply; once one has gone, the conversation is reloaded to show it sent.
let inboxTimer = 0;
function inboxTick() {
  clearInterval(inboxTimer);
  if (!$("[data-undo]", app)) return;
  inboxTimer = setInterval(() => {
    const bars = $$("[data-undo]", app);
    if (!bars.length) return clearInterval(inboxTimer);
    let due = false;
    for (const bar of bars) {
      const left = Math.ceil((Date.parse(bar.dataset.sendAt) - Date.now()) / 1000);
      $("[data-undo-left]", bar).textContent = Math.max(0, left);
      if (left <= -1) due = true;
    }
    if (due) {
      clearInterval(inboxTimer);
      keepDraft();
      refresh().catch(() => {});
    }
  }, 250);
}

// Live, like a support desk: the server says which conversations changed the moment they do (one
// event stream), and the open conversation and the list are fetched again then. If the stream is
// down, the open conversation is checked every few seconds and the list every ten, as before.
// What's being typed stays put.
let inboxLive = 0;
let inboxListAt = 0;
var inboxStream: EventSource | null = null;
let inboxStreamOk = false;
let inboxPending = new Set<string>(); // changed while a text was being edited: fetched once done
async function inboxPull(ids: string[] | null) {
  if (state.page !== "inbox" || state.open || state.editing) {
    for (const id of ids || []) inboxPending.add(id);
    return;
  }
  const changed = ids ? new Set([...ids, ...inboxPending]) : null;
  inboxPending = new Set();
  try {
    let redraw = false;
    const id = state.conv?.conversation.id;
    if (id && (!changed || changed.has(id))) {
      const fresh = await api(`/api/admin/inbox/${id}`);
      if (state.conv?.conversation.id !== id) return;
      const sig = (c) => c.messages.map((m) => `${m.id}:${m.status || ""}:${m.readAt || ""}:${m.text}:${JSON.stringify(m.content || "")}:${JSON.stringify(m.tapback || "")}`).join("|") + c.status + (c.teamReadAt || "") + (c.agent ? 1 : 0);
      if (sig(fresh.conversation) !== sig(state.conv.conversation)) (state.conv = fresh), (redraw = true);
    }
    // The list: on any change it hears of, or every ten seconds without the stream.
    if (changed ? changed.size : Date.now() - inboxListAt >= 10000) {
      inboxListAt = Date.now();
      const list = await api(inboxUrl());
      if (JSON.stringify(list.conversations) !== JSON.stringify(state.inbox?.conversations)) {
        state.inbox = list;
        state.inboxUnread = list.counts.unread;
        redraw = true;
      }
    }
    if (redraw) redrawKeepingFocus();
  } catch {
    /* offline for a moment: next time */
  }
}
function inboxWatch() {
  clearInterval(inboxLive);
  if (state.page !== "inbox") return;
  if (!inboxStream && "EventSource" in window) {
    inboxStream = new EventSource("/api/admin/inbox/stream");
    inboxStream.onopen = () => {
      // Back after a drop: catch up on what was missed.
      if (!inboxStreamOk) inboxPull(null);
      inboxStreamOk = true;
    };
    inboxStream.onerror = () => (inboxStreamOk = false); // reconnects by itself; polling meanwhile
    inboxStream.addEventListener("changed", (e) => {
      if (document.hidden) return void JSON.parse((e as MessageEvent).data).ids.forEach((id) => inboxPending.add(id));
      inboxPull(JSON.parse((e as MessageEvent).data).ids);
    });
  }
  inboxLive = setInterval(() => {
    if (document.hidden) return;
    if (inboxStreamOk) {
      if (inboxPending.size) inboxPull([]); // held while editing or hidden
      return;
    }
    inboxPull(null);
  }, 3000);
}

// Re-draws the page, then puts the cursor back where it was in the reply box.
function redrawKeepingFocus() {
  const box = $("[data-reply-text]", app);
  const focused = box && document.activeElement === box;
  const [start, end] = box ? [box.selectionStart, box.selectionEnd] : [0, 0];
  keepDraft();
  render();
  const again = $("[data-reply-text]", app);
  if (focused && again) {
    again.focus({ preventScroll: true });
    again.setSelectionRange(start, end);
  }
}

const keepDraft = () => {
  const box = $("[data-reply-text]", app);
  if (box) state.draft = box.value;
};

/* Texts: a photo or PDF to send, a voice note being recorded or played back, or a poll. Each
   takes the reply box's place until sent or cancelled. */
var voiceRec = null; // { recorder, chunks, stream, timer } while recording
var voiceTake = null; // { blob, url, type, seconds } once recorded
const clock = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

// The tools beside Send, as the channel allows: a photo or PDF, a voice note (texts), a poll, and
// one of their orders as a card (live in their chat; a line with its link by text or email).
function composeTools(c, orders = []) {
  const caps = capsNow();
  const tools = [
    caps.attachment ? `<label class="icon-btn" title="Photo or PDF"><span class="sr-only">Send a photo or PDF</span>${icon("file")}<input type="file" accept="image/*,application/pdf" class="sr-only" data-attach-pick></label>` : "",
    caps.voice && navigator.mediaDevices?.getUserMedia && window.MediaRecorder ? `<button type="button" class="icon-btn" title="Voice note" aria-label="Record a voice note" data-voice-start>${icon("Mic")}</button>` : "",
    caps.poll ? `<button type="button" class="icon-btn" title="Poll" aria-label="Send a poll" data-poll-open>${icon("ListChecks")}</button>` : "",
    caps.card && orders.length ? `<label class="compose-card" title="Send an order"><span class="sr-only">Send one of their orders</span>${icon("orders")}<select data-card-pick><option value="">Send an order</option>${orders.map((o) => `<option value="${esc(o.number)}">${esc(o.number)} · ${money(o.total)}</option>`).join("")}</select></label>` : "",
  ].join("");
  return tools ? `<span class="compose-tools">${tools}</span>` : "";
}

function composePanel() {
  const card = (inner) => `<div class="compose-panel">${inner}</div>`;
  if (state.attach) {
    const a = state.attach;
    const preview = a.type.startsWith("image/") ? `<img class="compose-thumb" src="${a.dataUrl}" alt="">` : `<span class="msg-file">${icon("file")}<span>${esc(a.name)}</span></span>`;
    return card(`${preview}<span class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-attach-cancel>Cancel</button><button type="button" class="btn btn-sm btn-primary" data-attach-send>${icon("send")}<span>Send</span></button></span>`);
  }
  if (state.voice === "recording") return card(`<span class="voice-live"><i aria-hidden="true"></i><b data-voice-clock>0:00</b></span><span class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-voice-cancel>Cancel</button><button type="button" class="btn btn-sm" data-voice-stop>${icon("Square")}<span>Stop</span></button></span>`);
  if (state.voice === "ready" && voiceTake) return card(`<audio controls src="${voiceTake.url}"></audio><span class="btn-row"><button type="button" class="btn btn-sm btn-ghost" data-voice-cancel>Delete</button><button type="button" class="btn btn-sm btn-primary" data-voice-send>${icon("send")}<span>Send</span></button></span>`);
  if (state.pollOpen) {
    const p = state.pollOpen;
    return `<form class="compose-panel compose-poll" data-poll-form>
      <label class="field"><span>Question</span><input name="title" maxlength="120" value="${esc(p.title)}" placeholder="Which day works best?" required></label>
      ${p.options.map((o, i) => `<label class="field"><span class="sr-only">Choice ${i + 1}</span><input name="option" maxlength="60" value="${esc(o)}" placeholder="Choice ${i + 1}"></label>`).join("")}
      <span class="btn-row">${p.options.length < 6 ? `<button type="button" class="btn btn-sm btn-ghost" data-poll-more>${icon("plus")}<span>Add Choice</span></button>` : ""}<span class="spacer"></span><button type="button" class="btn btn-sm btn-ghost" data-poll-cancel>Cancel</button><button type="submit" class="btn btn-sm btn-primary">${icon("send")}<span>Send Poll</span></button></span>
    </form>`;
  }
  return "";
}

const readPoll = () => {
  const f = $("[data-poll-form]", app);
  if (f && state.pollOpen) state.pollOpen = { title: f.title.value, options: $$("input[name=option]", f).map((x) => x.value) };
};

function stopVoice(keep) {
  if (!voiceRec) return;
  const r = voiceRec;
  voiceRec = null;
  clearInterval(r.timer);
  r.keep = keep;
  if (r.recorder.state !== "inactive") r.recorder.stop();
  r.stream.getTracks().forEach((t) => t.stop());
}

async function startVoice() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch {
    return toast("Allow the microphone to record a voice note.", "error");
  }
  // M4A where the browser can (Safari, recent Chrome): iMessage plays it as it is.
  const type = ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t)) || "";
  const recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
  const chunks = [];
  const started = Date.now();
  const rec: any = { recorder, chunks, stream, keep: false };
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  recorder.onstop = () => {
    if (!rec.keep) return;
    const blob = new Blob(chunks, { type: recorder.mimeType || type || "audio/webm" });
    if (voiceTake) URL.revokeObjectURL(voiceTake.url);
    voiceTake = { blob, url: URL.createObjectURL(blob), type: blob.type, seconds: (Date.now() - started) / 1000 };
    state.voice = "ready";
    render();
  };
  rec.timer = setInterval(() => {
    const el = $("[data-voice-clock]", app);
    const s = (Date.now() - started) / 1000;
    if (el) el.textContent = clock(s);
    if (s >= 300) stopVoice(true); // 5 minutes at most
  }, 250);
  voiceRec = rec;
  recorder.start(250);
  state.voice = "recording";
  render();
}

const blobBase64 = (blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] || "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

async function sendAttachment(body, button) {
  button.disabled = true;
  try {
    state.conv = await api(`/api/admin/inbox/${state.conv.conversation.id}/attachments`, { method: "POST", body });
    return true;
  } catch (error) {
    button.disabled = false;
    toast(error.message, "error");
    return false;
  }
}

// close: send it as the closing message (it asks them to rate the conversation) and close it.
async function sendReply(form, close = false) {
  const text = form.text.value.trim();
  if (!text) return flagFields(form, "", ["text"]);
  const button = $("button[type=submit]", form);
  button.disabled = true;
  staffTyping(false);
  try {
    state.conv = await api(`/api/admin/inbox/${state.conv.conversation.id}/messages`, { method: "POST", body: { text, ...(form.from && { from: form.from.value }), ...(close && { close: true }), ...(state.replyTo && { replyTo: state.replyTo }), ...(form.effect?.value && { effect: form.effect.value }) } });
    if (close) toast("Sent and closed.");
    state.draft = "";
    state.replyTo = state.effect = state.picked = null;
    render();
  } catch (error) {
    button.disabled = false;
    toast(error.message, "error");
  }
}

async function inboxClick(t) {
  const awayBtn = t.closest("[data-chat-away]");
  if (awayBtn) {
    const away = awayBtn.dataset.chatAway === "on";
    awayBtn.disabled = true;
    await api("/api/admin/inbox/away", { method: "POST", body: { away } });
    state.inbox.away = away;
    toast(away ? "Chat set to away." : "Chat set to available.");
    redrawKeepingFocus();
    return true;
  }
  if (!state.conv) return false;
  const c = state.conv.conversation;
  const undo = t.closest("[data-reply-undo]");
  if (undo) {
    undo.disabled = true;
    keepDraft();
    try {
      const result = await api(`/api/admin/inbox/${c.id}/messages/${undo.dataset.replyUndo}`, { method: "DELETE" });
      // The reply comes back into the box, ready to fix.
      state.draft = [result.message.text, state.draft].filter((x) => x.trim()).join("\n\n");
      state.conv = result;
      render();
      const box = $("[data-reply-text]", app);
      box.focus();
      box.setSelectionRange(result.message.text.length, result.message.text.length);
    } catch (error) {
      toast(error.message, "error");
      refresh();
    }
    return true;
  }
  const now = t.closest("[data-reply-now]");
  if (now) {
    now.disabled = true;
    keepDraft();
    const result = await api(`/api/admin/inbox/${c.id}/messages/${now.dataset.replyNow}/send`, { method: "POST", body: {} });
    state.conv = result;
    render();
    toast(result.message.status === "sent" ? "Reply sent." : "That reply didn't send.", result.message.status === "sent" ? "" : "error");
    return true;
  }
  // Photo or PDF: picked (see the change handler), then sent from its card.
  if (t.closest("[data-attach-cancel]")) {
    keepDraft();
    state.attach = null;
    render();
    return true;
  }
  const attachSend = t.closest("[data-attach-send]");
  if (attachSend) {
    const a = state.attach;
    if (await sendAttachment({ name: a.name, mimeType: a.type, data: a.dataUrl.split(",")[1] }, attachSend)) {
      state.attach = null;
      render();
      toast("Sent.");
    }
    return true;
  }
  // Voice note: record, stop, listen, send (or delete).
  if (t.closest("[data-voice-start]")) {
    keepDraft();
    await startVoice();
    return true;
  }
  if (t.closest("[data-voice-stop]")) {
    stopVoice(true);
    return true;
  }
  if (t.closest("[data-voice-cancel]")) {
    stopVoice(false);
    if (voiceTake) URL.revokeObjectURL(voiceTake.url);
    voiceTake = null;
    state.voice = null;
    render();
    return true;
  }
  const voiceSend = t.closest("[data-voice-send]");
  if (voiceSend && voiceTake) {
    const take = voiceTake;
    if (await sendAttachment({ voice: true, mimeType: take.type, duration: Math.round(take.seconds), data: await blobBase64(take.blob) }, voiceSend)) {
      URL.revokeObjectURL(take.url);
      voiceTake = null;
      state.voice = null;
      render();
      toast("Voice note sent.");
    }
    return true;
  }
  // Poll: a question and 2 to 6 choices.
  if (t.closest("[data-poll-open]")) {
    keepDraft();
    state.pollOpen = { title: "", options: ["", ""] };
    render();
    $("[data-poll-form] input[name=title]", app)?.focus();
    return true;
  }
  if (t.closest("[data-poll-more]")) {
    readPoll();
    state.pollOpen.options.push("");
    render();
    $$("[data-poll-form] input[name=option]", app).at(-1)?.focus();
    return true;
  }
  if (t.closest("[data-poll-cancel]")) {
    state.pollOpen = null;
    render();
    return true;
  }
  // One of their texts: open its tapbacks and Reply (tap again to close).
  const pick = t.closest("[data-msg-pick]");
  if (pick) {
    keepDraft();
    state.picked = state.picked === pick.dataset.msgPick ? null : pick.dataset.msgPick;
    render();
    $(`[data-msg-pick="${pick.dataset.msgPick}"]`, app)?.focus({ preventScroll: true });
    return true;
  }
  const tap = t.closest("[data-tapback]");
  if (tap) {
    keepDraft();
    for (const b of $$("[data-tapback]", app)) b.disabled = true;
    try {
      state.conv = await api(`/api/admin/inbox/${c.id}/messages/${tap.dataset.tapbackTo}/tapback`, { method: "POST", body: { emoji: tap.dataset.tapback } });
      state.picked = null;
    } catch (error) {
      toast(error.message, "error");
    }
    render();
    return true;
  }
  const replyTo = t.closest("[data-reply-to]");
  if (replyTo) {
    keepDraft();
    state.replyTo = replyTo.dataset.replyTo;
    state.picked = null;
    render();
    $("[data-reply-text]", app)?.focus();
    return true;
  }
  if (t.closest("[data-reply-to-cancel]")) {
    keepDraft();
    state.replyTo = null;
    render();
    $("[data-reply-text]", app)?.focus();
    return true;
  }
  // Edit or unsend one of our sent texts.
  const edit = t.closest("[data-text-edit]");
  if (edit) {
    keepDraft();
    state.editing = edit.dataset.textEdit;
    render();
    const box = $(`[data-text-edit-form] textarea`, app);
    box?.focus();
    box?.setSelectionRange(box.value.length, box.value.length);
    return true;
  }
  if (t.closest("[data-text-edit-cancel]")) {
    keepDraft();
    state.editing = null;
    render();
    return true;
  }
  const unsend = t.closest("[data-text-unsend]");
  if (unsend) {
    if (!confirm("Unsend this text? It disappears from their phone too.")) return true;
    unsend.disabled = true;
    keepDraft();
    try {
      state.conv = await api(`/api/admin/inbox/${c.id}/messages/${unsend.dataset.textUnsend}/unsend`, { method: "POST", body: {} });
      render();
      toast("Text unsent.");
    } catch (error) {
      toast(error.message, "error");
    }
    return true;
  }
  const agent = t.closest("[data-conv-agent]");
  if (agent) {
    keepDraft();
    const on = agent.dataset.convAgent === "on";
    agent.disabled = true;
    state.conv = await api(`/api/admin/inbox/${c.id}`, { method: "PATCH", body: { agent: on } });
    render();
    toast(on ? "The assistant will answer their texts." : "The assistant is off. You answer their texts.");
    return true;
  }
  const status = t.closest("[data-conv-status]");
  if (status) {
    keepDraft();
    state.conv = await api(`/api/admin/inbox/${c.id}`, { method: "PATCH", body: { status: status.dataset.convStatus } });
    toast(status.dataset.convStatus === "closed" ? "Conversation closed." : "Conversation reopened.");
    go(status.dataset.convStatus === "closed" ? "#inbox" : `#inbox/${c.id}`);
    if (status.dataset.convStatus === "open") await refresh();
    return true;
  }
  if (t.closest("[data-conv-delete]")) {
    if (!confirm(`Delete the conversation with ${c.name}? This can't be undone.`)) return true;
    await api(`/api/admin/inbox/${c.id}`, { method: "DELETE" });
    go("#inbox");
    toast("Conversation deleted.");
    return true;
  }
  const order = t.closest("[data-conv-order]");
  if (order) {
    keepDraft();
    state.open = order.dataset.convOrder;
    openOrder(state.open);
    return true;
  }
  return false;
}

app.addEventListener("submit", async (e) => {
  const editForm = e.target.closest("[data-text-edit-form]");
  if (editForm) {
    e.preventDefault();
    const text = editForm.text.value.trim();
    if (!text) return flagFields(editForm, "", ["text"]);
    const button = $("button[type=submit]", editForm);
    button.disabled = true;
    keepDraft();
    try {
      state.conv = await api(`/api/admin/inbox/${state.conv.conversation.id}/messages/${editForm.dataset.textEditForm}/edit`, { method: "POST", body: { text } });
      state.editing = null;
      render();
      toast("Text edited.");
    } catch (error) {
      button.disabled = false;
      toast(error.message, "error");
    }
    return;
  }
  const form = e.target.closest("[data-reply]");
  if (!form) return;
  e.preventDefault();
  sendReply(form);
});
app.addEventListener("submit", async (e) => {
  const form = e.target.closest?.("[data-poll-form]");
  if (!form) return;
  e.preventDefault();
  e.stopPropagation();
  readPoll();
  const button = $("button[type=submit]", form);
  button.disabled = true;
  try {
    state.conv = await api(`/api/admin/inbox/${state.conv.conversation.id}/poll`, { method: "POST", body: { title: state.pollOpen.title, options: state.pollOpen.options } });
    state.pollOpen = null;
    render();
    toast("Poll sent.");
  } catch (error) {
    button.disabled = false;
    toast(error.message, "error");
  }
}, true);
app.addEventListener("keydown", (e) => {
  if ((e.key === "Enter" || e.key === " ") && e.target.matches?.("[data-msg-pick]")) {
    e.preventDefault();
    e.target.click();
  }
  if (e.key === "Escape" && state.picked && state.page === "inbox") {
    state.picked = null;
    render();
  }
  // ⌘/Ctrl + Enter sends.
  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && e.target.matches("[data-reply-text]")) {
    e.preventDefault();
    sendReply(e.target.form);
  }
});
app.addEventListener("change", (e) => {
  // A photo or PDF picked for a text: shown in a card to send (photos sized down first).
  if (e.target.matches?.("[data-attach-pick]")) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/|^application\/pdf$/.test(file.type)) return toast("Send a photo or a PDF.", "error");
    if (file.size > 15 * 1024 * 1024) return toast("That file is too big. Send one under 15 MB.", "error");
    keepDraft();
    const done = (dataUrl, type, name) => {
      state.attach = { dataUrl, type, name };
      render();
    };
    if (/^image\/(jpeg|png|webp)$/.test(file.type)) resizePhoto(file).then((url) => done(url, url.slice(5, url.indexOf(";")), file.name)).catch((error) => toast(error.message, "error"));
    else {
      const r = new FileReader();
      r.onload = () => done(String(r.result), file.type, file.name);
      r.readAsDataURL(file);
    }
    return;
  }
  if (e.target.matches?.("[data-reply-effect]")) {
    state.effect = e.target.value || null;
    e.target.classList.toggle("is-on", Boolean(state.effect));
  }
});
app.addEventListener("input", (e) => {
  // The assistant's message box grows with what's typed (up to a point).
  if (e.target.id === "assist-input") {
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 220)}px`;
  }
  if (e.target.matches("[data-reply-text]")) {
    state.draft = e.target.value;
    staffTyping(e.target.value.trim() !== "");
  }
});

// While someone types a reply to a text or a chat, the customer sees the typing bubble: it's sent
// at most every 5 seconds while typing, and stopped after 6 seconds without a key, an emptied box,
// or leaving.
let typingConv = null;
let typingSent = 0;
let typingIdle = 0;
function staffTyping(on) {
  const c = state.conv?.conversation;
  if (!c || (c.channel !== "imessage" && c.channel !== "chat" && !c.chatKeys?.length)) return;
  const post = (value) => api(`/api/admin/inbox/${typingConv}/typing`, { method: "POST", body: { on: value } }).catch(() => {});
  clearTimeout(typingIdle);
  if (!on) {
    if (typingConv) post(false);
    typingConv = null;
    return;
  }
  if (typingConv !== c.id || Date.now() - typingSent > 5000) {
    typingConv = c.id;
    typingSent = Date.now();
    post(true);
  }
  typingIdle = setTimeout(() => staffTyping(false), 6000);
}

/* ── Events ── */

app.addEventListener("click", async (e) => {
  // Gift cards: email one again, or issue the ones an order is owed.
  const gcEmail = e.target.closest("[data-gc-email]");
  const gcIssue = e.target.closest("[data-gc-issue]");
  if (gcEmail || gcIssue) {
    const b = gcEmail || gcIssue;
    b.disabled = true;
    try {
      if (gcEmail) {
        await api(`/api/admin/gift-cards/${encodeURIComponent(b.dataset.gcEmail)}/email`, { method: "POST", body: {} });
        toast("Gift card emailed");
      } else {
        const r = await api(`/api/admin/gift-cards/issue/${b.dataset.gcIssue}`, { method: "POST", body: {} });
        toast(`${r.issued} gift card${r.issued === 1 ? "" : "s"} issued and emailed`);
      }
      await refresh();
    } catch (error) {
      b.disabled = false;
      toast(error.message, "error");
    }
    return;
  }
  // Phones: checkboxes only while selecting (Select / Done in the page head).
  if (e.target.closest("[data-select-mode]")) {
    const on = !(state.selecting || state.selected.size);
    state.selecting = on;
    if (!on) state.selected.clear();
    return render();
  }
  // Long lists: the next page of rows.
  const more = e.target.closest("[data-orders-more], [data-tr-more]");
  if (more) {
    if (more.matches("[data-orders-more]")) state.orderLimit = (state.orderLimit || ORDERS_PAGE) + ORDERS_PAGE;
    else state.trLimit = (state.trLimit || TR_PAGE) + TR_PAGE;
    return render();
  }
  const t: any = e.target;
  const channelBtn = t.closest("[data-inbox-channel]");
  if (channelBtn) return pickChannel(channelBtn.dataset.inboxChannel);
  // Inbox: pick one of the inboxes (or All).
  const boxBtn = t.closest("[data-inbox-box]");
  if (boxBtn) {
    pickedBox = boxBtn.dataset.inboxBox;
    state.inboxPicked = new Set();
    try {
      localStorage.setItem("bo-inbox-box", pickedBox);
    } catch {
      /* remembered for this visit only */
    }
    state.inbox = await api(inboxUrl());
    return render();
  }
  // Inbox: selecting several; closing or reopening the ones picked.
  const theirs = t.closest("[data-person-convs]");
  if (theirs) {
    state.inboxQuery = theirs.dataset.personConvs;
    pickedBox = "";
    location.hash = "#inbox";
    return;
  }
  const closeSend = t.closest("[data-reply-close]");
  if (closeSend) return sendReply(closeSend.closest("form"), true);
  const unfoldBtn = t.closest("[data-mail-unfold]");
  if (unfoldBtn) {
    (state.unfold ||= new Set()).add(unfoldBtn.dataset.mailUnfold);
    return redrawKeepingFocus();
  }
  if (t.closest("[data-inbox-select]")) {
    state.inboxSelecting = !state.inboxSelecting;
    state.inboxPicked = new Set();
    return render();
  }
  const pick = t.closest("[data-inbox-pick]");
  if (pick) {
    const set = (state.inboxPicked ||= new Set());
    if (pick.checked) set.add(pick.dataset.inboxPick);
    else set.delete(pick.dataset.inboxPick);
    return redrawKeepingFocus();
  }
  const bulkStatus = t.closest("[data-inbox-bulk-status]");
  if (bulkStatus) return inboxBulk({ status: bulkStatus.dataset.inboxBulkStatus });
  // A Filter or Sort menu's choice: "key:value" into state, then redraw.
  if (t.closest("[data-search-clear]")) {
    state.query = "";
    render();
    return $("[data-search]")?.focus();
  }
  const tbPick = t.closest("[data-tb-pick]");
  if (tbPick) {
    const [key, ...rest] = tbPick.dataset.tbPick.split(":");
    state[key] = rest.join(":");
    if (SORTS[key]) {
      try {
        localStorage.setItem(sortKey(), JSON.stringify({ ...savedSorts(), [key]: state[key] }));
      } catch {}
    }
    return render();
  }
  const chip = t.closest("[data-chip]");
  const step = t.closest("[data-stock-step]");
  if (step) {
    const input = step.closest(".stock-step").querySelector("[data-stock-key]");
    input.value = String(Math.max(0, (Number(input.value) || 0) + Number(step.dataset.stockStep)));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (chip) {
    const [page, value] = chip.dataset.chip.split(":");
    state[{ returns: "returnFilter", reviews: "reviewFilter", stock: "stockFilter", enquiries: "enquiryFilter", prospects: "prospectFilter", prospectkind: "prospectKind", carts: "cartFilter", todos: "todoFilter", imports: "importFilter", bills: "billFilter", green: "greenFilter", samples: "sampleFilter", roast: "roastFilter", applicants: "applicantFilter", mentions: "mentionFilter", creators: "creatorFilter", elsewhere: "elsewhereFilter", docs: "docFilter" }[page]] = value;
    return render();
  }
  const later = t.closest("[data-alert-later]");
  if (later) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    later.disabled = true;
    try {
      await api("/api/admin/todos/snooze-alert", { method: "POST", body: { key: later.dataset.alertLater, until: isoDay(d) } });
      (state.overview.snoozed ||= []).push(later.dataset.alertLater);
      render();
      toast("Hidden until tomorrow.");
    } catch (error) {
      later.disabled = false;
      toast(error.message, "error");
    }
    return;
  }
  if (t.closest("[data-quick-open]")) return openQuick();
  if (t.closest("[data-ov-manage]")) return manageCards();
  const ovHide = t.closest("[data-ov-hide]");
  if (ovHide) {
    ovToggle("shown", ovHide.dataset.ovHide, false);
    return render();
  }
  const ovList = t.closest("[data-ov-list]");
  if (ovList) {
    ovToggle("list", ovList.dataset.ovList, ovList.getAttribute("aria-pressed") !== "true");
    return render();
  }
  if (t.closest("[data-sk-open]")) return openSidekick();
  if (t.closest("[data-sk-close]")) {
    skOpen = false;
    return drawSidekick();
  }
  if (t.closest("[data-sk-dock]")) {
    skDocked = !skDocked;
    try {
      localStorage.setItem("bo-sk-docked", skDocked ? "1" : "0");
    } catch {
      /* this visit only */
    }
    drawSidekick();
    return $("#assist-input")?.focus();
  }
  // Newsletters: new, open, and the editor's buttons. Languages: refresh and undo.
  try {
    if (state.page === "signups" && (await newsletterClick(t))) return;
    if (state.page === "languages" && (await languagesClick(t))) return;
    if (state.page === "salestax" && (await salesTaxClick(t))) return;
    if (state.page === "careers" && careersClick(t)) return;
    if (state.page === "ambassadors" && (await ambassadorsClick(t))) return;
    if (state.page === "wholesale" && (await prospectsClick(t))) return;
    if (state.page === "wholesale" && state.sub === "samples" && (await cafeSamplesClick(t))) return;
    if (await contractsClick(t)) return;
    if (state.page === "insights" && (await insightsClick(t))) return;
    if (state.page === "carts" && (await cartsClick(t))) return;
    if ((state.page === "purchasing" || state.page === "products") && (await countClick(t))) return;
    if (state.page === "purchasing" && (await greenClick(t))) return;
    if (state.page === "roasting" && (await roastClick(t))) return;
    const paneBtn = t.closest("[data-side-pane]");
    if (paneBtn) {
      sideStore("bo-side-pane", paneBtn.dataset.sidePane);
      hideTip();
      if (paneBtn.dataset.sidePane && !state.todos) state.todos = await api("/api/admin/todos").catch(() => null);
      return render();
    }
    if ((state.page === "todos" || t.closest(".side-pane")) && (await todosClick(t))) return;
    if (state.page === "outbox" && (await outboxClick(t))) return;
    if (state.page === "imports" && (await importsClick(t))) return;
    const marketRun = state.page === "purchasing" && t.closest("[data-market-run]");
    if (marketRun) {
      marketRun.disabled = true;
      marketRun.querySelector("span").textContent = "Running…";
      try {
        await api("/api/admin/insights/run", { method: "POST", body: { kind: "market" } });
        toast("Done.");
      } catch (error) {
        toast(error.message, "error");
      }
      state.trade = await api("/api/admin/trade");
      return render();
    }
    if (state.page === "reviews" && (await reviewsClick(t))) return;
    if (state.page === "returns" && (await returnsClick(t))) return;
    if (state.page === "notes" && (await notesClick(t))) return;
    if (state.page === "calendar" && (await calendarClick(t))) return;
    if (state.page === "inbox" && (await inboxClick(t))) return;
    if ((state.page === "assistant" || skShown()) && (await assistantClick(t))) return;
  } catch (error) {
    return toast(error.message, "error");
  }
  // Wholesale and purchasing: forms and detail panels.
  const form = t.closest("[data-form]");
  if (form) return { role: () => roleForm(), account: () => accountForm(), "wholesale-order": newOrderStart, supplier: () => supplierForm(), po: () => poForm(), product: () => productForm(), tea: () => teaForm(), food: () => foodForm(), label: () => labelForm(), promo: () => promoForm(), "menu-item": () => menuItemForm(), section: () => sectionForm(), "import-emails": () => importEmailsForm(), "new-email": () => newEmailForm(), announce: () => announceForm(), people: () => peopleForm() }[form.dataset.form]?.();
  if (t.closest("[data-option-new]")) return optionSetForm();
  const liveBtn = t.closest("[data-cafes-live]");
  if (liveBtn) {
    const live = liveBtn.dataset.cafesLive === "on";
    const ask = live
      ? "Go live? Locations, Order Ahead and the café menu appear on the website, and customers can place café orders."
      : "Hide the pour bars? Locations, Order Ahead and café ordering come off the website. Orders already placed aren't affected.";
    if (!confirm(ask)) return;
    liveBtn.disabled = true;
    try {
      state.cafesLive = (await api("/api/admin/menu/live", { method: "POST", body: { live } })).cafesLive;
      toast(state.cafesLive ? "The pour bars are live on the website." : "The pour bars are hidden from the website.");
      render();
    } catch (error) {
      liveBtn.disabled = false;
      toast(error.message, "error");
    }
    return;
  }
  const optEdit = t.closest("[data-option-edit]");
  if (optEdit) return optionSetForm(state.menu.optionSets.find((o) => o.id === optEdit.dataset.optionEdit));
  const foodPickAll = t.closest("[data-food-pick-all]");
  if (foodPickAll) {
    e.stopPropagation();
    const ids = $$("[data-food]").map((r) => r.dataset.food);
    for (const id of ids) (foodPickAll.checked ? foodPick.add(id) : foodPick.delete(id));
    $$("[data-food-pick]").forEach((c) => (c.checked = foodPick.has(c.dataset.foodPick)));
    $("[data-food-bar]").innerHTML = foodBarHtml();
    return;
  }
  const foodPicked = t.closest("[data-food-pick]");
  if (foodPicked) {
    e.stopPropagation();
    if (foodPicked.checked) foodPick.add(foodPicked.dataset.foodPick);
    else foodPick.delete(foodPicked.dataset.foodPick);
    $("[data-food-bar]").innerHTML = foodBarHtml();
    const all = $("[data-food-pick-all]");
    if (all) all.checked = $$("[data-food-pick]").every((c) => c.checked);
    return;
  }
  if (t.closest("[data-food-pick-clear]")) {
    foodPick.clear();
    $$("[data-food-pick], [data-food-pick-all]").forEach((c) => (c.checked = false));
    $("[data-food-bar]").innerHTML = "";
    return;
  }
  const foodBulk = t.closest("[data-food-bulk-delete]");
  if (foodBulk) {
    const ids = [...foodPick];
    if (!ids.length || !confirm(`Delete ${ids.length} product${ids.length === 1 ? "" : "s"}? They disappear from the shop and from carts at checkout. Past orders keep their details.\n\nTo take products off sale for now, untick "Show in the shop" on each instead.`)) return;
    foodBulk.disabled = true;
    try {
      state.catalog = (await api("/api/admin/foods/bulk-delete", { method: "POST", body: { ids } })).catalog;
      foodPick.clear();
      render();
      toast(`${ids.length} product${ids.length === 1 ? "" : "s"} deleted`);
    } catch (error) {
      foodBulk.disabled = false;
      toast(error.message);
    }
    return;
  }  const foodSoldOut = t.closest("[data-food-sold-out]");
  if (foodSoldOut) {
    e.stopPropagation();
    const x = state.catalog.foods.find((y) => y.id === foodSoldOut.dataset.foodSoldOut);
    foodSoldOut.disabled = true;
    try {
      state.catalog = (await api(`/api/admin/foods/${x.id}`, { method: "PATCH", body: { soldOut: !x.soldOut } })).catalog;
      render();
      toast(`${x.short || x.name} ${x.soldOut ? "back in stock" : "sold out"}`);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const foodMove = t.closest("[data-food-move]");
  if (foodMove) {
    e.stopPropagation();
    foodMove.disabled = true;
    try {
      state.catalog = (await api(`/api/admin/foods/${foodMove.dataset.foodMove}/move`, { method: "POST", body: { dir: foodMove.dataset.dir } })).catalog;
      render();
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const foodRow = t.closest("[data-food]");
  if (foodRow) return foodForm(state.catalog.foods.find((x) => x.id === foodRow.dataset.food));  const teaSoldOut = t.closest("[data-tea-sold-out]");
  if (teaSoldOut) {
    e.stopPropagation();
    const x = state.catalog.teas.find((y) => y.id === teaSoldOut.dataset.teaSoldOut);
    teaSoldOut.disabled = true;
    try {
      state.catalog = (await api(`/api/admin/teas/${x.id}`, { method: "PATCH", body: { soldOut: !x.soldOut } })).catalog;
      render();
      toast(`${x.short || x.name} ${x.soldOut ? "back in stock" : "sold out"}`);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const teaMove = t.closest("[data-tea-move]");
  if (teaMove) {
    e.stopPropagation();
    teaMove.disabled = true;
    try {
      state.catalog = (await api(`/api/admin/teas/${teaMove.dataset.teaMove}/move`, { method: "POST", body: { dir: teaMove.dataset.dir } })).catalog;
      render();
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const teaRow = t.closest("[data-tea]");
  if (teaRow) return teaForm(state.catalog.teas.find((x) => x.id === teaRow.dataset.tea));
  const productSoldOut = t.closest("[data-product-sold-out]");
  if (productSoldOut) {
    e.stopPropagation();
    const p = state.catalog.products.find((x) => x.id === productSoldOut.dataset.productSoldOut);
    productSoldOut.disabled = true;
    try {
      const result = await api(`/api/admin/products/${p.id}`, { method: "PATCH", body: { soldOut: !p.soldOut } });
      state.catalog = result.catalog;
      render();
      toast(`${p.short || p.name} ${p.soldOut ? "back in stock" : "sold out"}`);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const soldOut = t.closest("[data-sold-out]");
  if (soldOut) {
    e.stopPropagation();
    const item = state.menu.sections.flatMap((x) => x.items).find((x) => x.id === soldOut.dataset.soldOut);
    soldOut.disabled = true;
    try {
      const result = await api(`/api/admin/menu/items/${item.id}`, { method: "PATCH", body: { soldOut: !item.soldOut } });
      state.menu = result.menu;
      render();
      toast(result.warning || `${item.name} ${item.soldOut ? "back on" : "sold out"}`);
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const menuMove = t.closest("[data-menu-move]");
  if (menuMove) {
    e.stopPropagation();
    const [kind, id] = menuMove.dataset.menuMove.split(":");
    try {
      state.menu = (await api(`/api/admin/menu/${kind === "section" ? "sections" : "items"}/${id}/move`, { method: "POST", body: { dir: menuMove.dataset.dir } })).menu;
      render();
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const sectionEdit = t.closest("[data-section-edit]");
  if (sectionEdit) return sectionForm(state.menu.sections.find((x) => x.id === sectionEdit.dataset.sectionEdit));
  const menuRow = t.closest("[data-menu-item]");
  if (menuRow) return menuItemForm(state.menu.sections.flatMap((x) => x.items).find((x) => x.id === menuRow.dataset.menuItem));
  const move = t.closest("[data-move]");
  if (move) {
    e.stopPropagation();
    move.disabled = true;
    try {
      state.catalog = (await api(`/api/admin/products/${move.dataset.move}/move`, { method: "POST", body: { dir: move.dataset.dir } })).catalog;
      render();
    } catch (error) {
      toast(error.message);
    }
    return;
  }
  const productRow = t.closest("[data-product]");
  if (productRow) return productForm(state.catalog.products.find((x) => x.id === productRow.dataset.product));
  const promoRow = t.closest("[data-promo]");
  if (promoRow) return promoForm(state.promos.find((x) => x.id === promoRow.dataset.promo));
  const labelRow = t.closest("[data-label]");
  if (labelRow) return labelForm(state.catalog.labels.find((x) => x.id === labelRow.dataset.label));
  const custRow = t.closest("[data-customer]");
  if (custRow) return customerPanel(custRow.dataset.customer).catch((error) => toast(`Couldn't open this customer: ${error.message}`, "error"));
  if (t.closest("[data-staff-add]")) return staffForm();
  const staffRow = t.closest("[data-staff]");
  if (staffRow) return staffForm(state.team.staff.find((x) => x.id === staffRow.dataset.staff));
  const whoChip = t.closest("[data-activity-who]");
  if (whoChip) {
    state.activityWho = whoChip.dataset.activityWho;
    return route();
  }
  const quoteRow = t.closest("[data-quote]");
  if (quoteRow) return quotePanel(state.trade.quotes.find((q) => q.id === quoteRow.dataset.quote));
  const acctRow = t.closest("[data-account]") || t.closest("[data-edit-account]");
  if (acctRow) return accountForm(state.trade.accounts.find((a) => a.id === (acctRow.dataset.account || acctRow.dataset.editAccount)));
  const supRow = t.closest("[data-supplier]");
  if (supRow) return supplierForm(state.trade.suppliers.find((x) => x.id === supRow.dataset.supplier));
  if (t.closest("[data-bill-new]")) return billPanel();
  if (t.closest("[data-goto-imports]")) return go("imports");
  const billRow = state.page === "purchasing" && t.closest("[data-bill]");
  if (billRow) return billPanel(billRow.dataset.bill);
  const poRow = t.closest("[data-po]");
  if (poRow) return poDetail(poRow.dataset.po);
  const fromEnquiry = t.closest("[data-enquiry-account]");
  if (fromEnquiry) {
    const q = state.trade.enquiries.find((x) => x.id === fromEnquiry.dataset.enquiryAccount);
    return accountForm(null, { enquiry: q.id, business: q.business, contactName: q.name, email: q.email, phone: q.phone, notes: [q.type, q.location, q.volume, q.message].filter(Boolean).join(" · ") });
  }
  // Reply: the enquiry opens as an Inbox conversation, answered by email from there.
  const enqReply = t.closest("[data-enquiry-reply]");
  if (enqReply) {
    enqReply.disabled = true;
    try {
      const { conversation } = await api(`/api/admin/wholesale/enquiries/${enqReply.dataset.enquiryReply}/reply`, { method: "POST", body: {} });
      return go(`#inbox/${conversation}`);
    } catch (error) {
      enqReply.disabled = false;
      return toast(error.message);
    }
  }
  if (t.closest("[data-config-open]")) return go(isConfig() ? configBack : `#${configPages()[0].id}`);
  if (t.closest("[data-config-back]")) return go(configBack);
  const fold = t.closest("[data-side-group]");
  if (fold) {
    const g = fold.dataset.sideGroup;
    const open = sideOpen();
    const sect = fold.closest("[data-side-sect]");
    const now = !sect.classList.contains("is-open");
    sect.classList.toggle("is-open", now);
    fold.setAttribute("aria-expanded", String(now));
    fold.querySelector(".side-dot")?.toggleAttribute("hidden", now);
    if (now) open.add(g);
    else open.delete(g);
    try {
      localStorage.setItem("bo-side-open", JSON.stringify([...open]));
    } catch {}
    return;
  }
  const create = t.closest("[data-group-create]");
  if (create) {
    const make = GROUP_CREATE[create.dataset.groupCreate];
    state.pendingCreate = make.button;
    if (routeUrl(make.page) === location.pathname) await route();
    else go(make.page);
    return;
  }
  if (t.closest("[data-side-toggle]")) {
    const side = $("[data-side]");
    const open = side.classList.toggle("is-open");
    t.closest("[data-side-toggle]").setAttribute("aria-expanded", String(open));
    return;
  }
  if (t.closest("[data-logout]")) {
    ME = null;
    await api("/api/admin/logout", { method: "POST", body: {} }).catch(() => {});
    return renderLogin();
  }
  const openLink = t.closest("[data-open-order]");
  if (openLink) {
    e.preventDefault();
    state.open = openLink.dataset.openOrder;
    const status = openLink.getAttribute("href").split("/")[1];
    if (location.pathname !== routeUrl(`orders/${status}`)) {
      history.replaceState(null, "", routeUrl(`orders/${status}`));
      readHash();
      await refresh();
    }
    return;
  }
  const subAct = t.closest("[data-sub-act]");
  if (subAct) {
    const sub = state.subs.find((x) => x.id === subAct.closest("[data-sub-row]").dataset.subRow);
    const act = subAct.dataset.subAct;
    const square = sub.billing === "square";
    const ask = {
      skip: `Skip ${sub.customerName}'s next delivery?${square ? " Square skips that charge." : ""}`,
      pause: `Pause ${sub.customerName}'s subscription?${square ? " Square stops charging until it's resumed." : ""}`,
      resume: `Resume ${sub.customerName}'s subscription?${square ? " Square starts charging again." : ""}`,
      cancel: `End ${sub.customerName}'s subscription for good?${square ? " Square stops charging them." : ""}`,
    }[act];
    if (!confirm(ask)) return;
    subAct.disabled = true;
    try {
      await api(`/api/admin/subscriptions/${encodeURIComponent(sub.id)}`, { method: "PATCH", body: { action: act } });
      toast("Subscription updated");
    } catch (error) {
      toast(error.message, "error");
    }
    await refresh();
    return subPanel(sub.id);
  }
  const subRow = t.closest("tr[data-sub-row]");
  if (subRow) return subPanel(subRow.dataset.subRow);
  if (t.closest("[data-bulk-print]")) return printSlips([...state.selected]);
  if (t.closest("[data-bulk-clear]")) {
    state.selected.clear();
    return render();
  }
  // Hide: off every list and count (a test, a duplicate), still on record; Hidden lists them.
  const hide = t.closest("[data-bulk-hide]");
  if (hide) {
    const picked = [...state.selected];
    const hiding = hide.dataset.bulkHide === "1";
    if (hiding && !confirm(`Hide ${picked.length} order${picked.length === 1 ? "" : "s"}? ${picked.length === 1 ? "It leaves" : "They leave"} the lists but nothing is cancelled or refunded. Hidden shows ${picked.length === 1 ? "it" : "them"}.`)) return;
    hide.disabled = true;
    const failed = [];
    for (const number of picked) await api(`/api/admin/orders/${number}`, { method: "PATCH", body: { hidden: hiding } }).catch(() => failed.push(number));
    state.selected.clear();
    const done = picked.length - failed.length;
    toast(failed.length ? `${done} ${hiding ? "hidden" : "shown"}, ${failed.length} failed: ${failed.join(", ")}` : `${done} order${done === 1 ? "" : "s"} ${hiding ? "hidden" : "shown again"}`, failed.length ? "error" : undefined);
    return refresh();
  }
  const bulk = t.closest("[data-bulk-status]");
  if (bulk) {
    const picked = [...state.selected];
    // Packing a local delivery books its courier: say so first.
    const couriers = picked.filter((n) => state.orders.find((o) => o.number === n)?.local).length;
    if (couriers && !confirm(`Mark ${picked.length} order${picked.length === 1 ? "" : "s"} packed? This books ${couriers} courier${couriers === 1 ? "" : "s"} for local delivery.`)) return;
    bulk.disabled = true;
    const failed = [];
    for (const number of picked) await api(`/api/admin/orders/${number}`, { method: "PATCH", body: { status: bulk.dataset.bulkStatus } }).catch(() => failed.push(number));
    state.selected.clear();
    const done = picked.length - failed.length;
    toast(failed.length ? `${done} packed, ${failed.length} failed: ${failed.join(", ")}` : `${done} order${done === 1 ? "" : "s"} marked packed`, failed.length ? "error" : undefined);
    return refresh();
  }
  if (t.closest("[data-scrim]")) return closeDrawer();
  if (t.closest("input[type=checkbox]")) return;
  // The whole checkbox cell ticks the box, not only the box itself.
  const cell = t.closest("td.check, th.check");
  if (cell) {
    const box = $("input[type=checkbox]", cell);
    if (box) {
      shiftHeld = e.shiftKey;
      box.click();
    }
    return;
  }
  const row = t.closest("[data-row]");
  // Selecting: a tap on the row ticks it, instead of opening the order.
  if (row && state.page === "orders" && (state.selecting || state.selected.size) && $("[data-select]", row)) {
    const n = row.dataset.row;
    state.selected.has(n) ? state.selected.delete(n) : state.selected.add(n);
    return render();
  }
  if (row) {
    state.open = row.dataset.row;
    $$("[data-row]").forEach((r) => r.classList.toggle("is-open", r === row));
    return openOrder(state.open);
  }
});

app.addEventListener("change", async (e) => {
  const t: any = e.target;
  // A reorder level (empty: the default), saved the same way.
  if (t.matches("[data-stock-level]")) {
    const value = t.value.trim();
    if (value !== "" && !(Number(value) >= 0 && Number.isInteger(Number(value)))) return toast("Enter a whole number, 0 or more, or leave it empty.", "error");
    try {
      state.stock = (await api("/api/admin/stock", { method: "PATCH", body: { key: t.dataset.stockLevel, reorderAt: value === "" ? null : Number(value) } })).stock;
      const item = state.stock.items.find((i) => i.key === t.dataset.stockLevel);
      const row = t.closest("tr");
      row.innerHTML = stockRow(item, state.stock.low);
      labelTables(row.closest("table").parentElement);
      toast(`${item.name}${item.variant ? ` ${item.variant}` : ""}: reorder at ${item.reorderAt ?? state.stock.low}`);
    } catch (error) {
      toast(error.message, "error");
    }
    return;
  }
  // Stock: saved as it's typed (on Enter or leaving the field); its row redraws.
  if (t.matches("[data-stock-key]")) {
    const value = t.value.trim();
    if (value !== "" && !(Number(value) >= 0 && Number.isInteger(Number(value)))) {
      t.setAttribute("aria-invalid", "true");
      return toast("Enter a whole number, 0 or more, or leave it empty.", "error");
    }
    t.removeAttribute("aria-invalid");
    try {
      state.stock = (await api("/api/admin/stock", { method: "PATCH", body: { key: t.dataset.stockKey, left: value === "" ? null : Number(value) } })).stock;
      const item = state.stock.items.find((i) => i.key === t.dataset.stockKey);
      const row = t.closest("tr");
      const next = row.nextElementSibling?.querySelector("[data-stock-key]");
      const focused = (document.activeElement as any)?.dataset?.stockKey;
      row.innerHTML = stockRow(item, state.stock.low);
      labelTables(row.closest("table").parentElement);
      if (focused) $(`[data-stock-key="${CSS.escape(focused)}"]`)?.focus();
      else if (next && document.activeElement === document.body) next.focus();
      toast(value === "" ? `${item.name}${item.variant ? ` ${item.variant}` : ""}: not counted` : `${item.name}${item.variant ? ` ${item.variant}` : ""}: ${item.left} left`);
    } catch (error) {
      toast(error.message, "error");
    }
    return;
  }
  // Calendar: its photo; the kind and how it's booked change what the form shows.
  if (t.matches("[data-cal-cover]") && t.files[0] && state.cal) {
    const label = t.closest("label");
    label.classList.add("is-busy");
    try {
      const { id } = await api("/api/admin/calendar/images", { method: "POST", body: { dataUrl: await newsletterImage(t.files[0]) } });
      state.cal.image = id;
      await calSave({ now: true });
      render();
    } catch (error) {
      label.classList.remove("is-busy");
      toast(error.message, "error");
    }
    t.value = "";
    return;
  }
  if (t.matches('[data-cal-field="booking"], [data-cal-field="kind"], [data-cal-field="price"]') && state.cal) {
    await calSave({ now: true }).catch(() => {});
    return render();
  }
  // Notes: the cover photo, photos and coffees placed in the text.
  if ((t.matches("[data-note-cover]") || t.matches("[data-note-photo]")) && t.files[0] && state.note) {
    const label = t.closest("label");
    label.classList.add("is-busy");
    try {
      const id = await notePhoto(t.files[0]);
      if (t.matches("[data-note-cover]")) {
        state.note.image = id;
        await noteSave({ now: true });
        render();
      } else {
        label.classList.remove("is-busy");
        noteInsert(`![Describe the photo](${id})`);
      }
    } catch (error) {
      label.classList.remove("is-busy");
      toast(error.message, "error");
    }
    t.value = "";
    return;
  }
  if (t.matches("[data-note-coffee]") && t.value && state.note) {
    noteInsert(`{coffee:${t.value}}`);
    t.value = "";
    return;
  }
  if (t.matches("[data-nl-upload]") && t.files[0]) {
    const k = Number(t.dataset.nlUpload);
    const label = t.closest("label");
    label.classList.add("is-busy");
    try {
      const { id } = await api("/api/admin/newsletters/images", { method: "POST", body: { dataUrl: await newsletterImage(t.files[0]) } });
      state.nl.blocks[k].image = id;
      nlChanged();
      render();
    } catch (error) {
      label.classList.remove("is-busy");
      toast(error.message, "error");
    }
    return;
  }
  // Automations: the on/off switch and the timing.
  if (t.matches("[data-auto-toggle]")) {
    const on = t.checked;
    if (on && !confirm("Switch this email on? It goes to each person as they become due from now on.")) return (t.checked = false);
    try {
      const { automation } = await api(`/api/admin/automations/${t.dataset.autoToggle}`, { method: "PATCH", body: { enabled: on } });
      Object.assign(state.autos.automations.find((a) => a.id === automation.id), automation);
      toast(`${automation.name} is ${on ? "on" : "off"}.`);
      render();
    } catch (error) {
      t.checked = !on;
      toast(error.message, "error");
    }
    return;
  }
  if (t.matches("[data-auto-delay]")) {
    try {
      const { automation } = await api(`/api/admin/automations/${t.dataset.autoDelay}`, { method: "PATCH", body: { [t.dataset.key]: Number(t.value) } });
      Object.assign(state.autos.automations.find((a) => a.id === automation.id), automation);
      toast("Timing saved.");
    } catch (error) {
      toast(error.message, "error");
      render();
    }
    return;
  }
  if (t.matches("[data-select]")) {
    // Shift: every order between this one and the last one ticked goes the same way.
    const all = $$("[data-select]").map((c) => c.dataset.select);
    const from = all.indexOf(lastSelected);
    const to = all.indexOf(t.dataset.select);
    const range = shiftHeld && from >= 0 && to >= 0 ? all.slice(Math.min(from, to), Math.max(from, to) + 1) : [t.dataset.select];
    range.forEach((n) => (t.checked ? state.selected.add(n) : state.selected.delete(n)));
    lastSelected = t.dataset.select;
    return render();
  }
  if (t.matches("[data-select-all]")) {
    $$("[data-select]").forEach((c) => (t.checked ? state.selected.add(c.dataset.select) : state.selected.delete(c.dataset.select)));
    return render();
  }
});

// The page title: the event or post being edited (it follows its Title field), else the page's name.
function headTitle(label) {
  if (state.page === "calendar" && state.cal) return state.cal.title || (state.cal.kind === "class" ? "Untitled class" : "Untitled event");
  if (state.page === "notes" && state.note) return state.note.title || "Untitled post";
  return label;
}
const retitle = () => {
  const h = app.querySelector("[data-page-title]");
  if (h) h.textContent = headTitle(h.textContent);
};

app.addEventListener("input", (e) => {
  // Calendar editor: typing updates the event or class and saves after a pause.
  const calField = e.target.closest("[data-cal-field]");
  if (calField && state.cal) {
    state.cal[calField.dataset.calField] = calField.value;
    if (calField.dataset.calField === "title") retitle();
    return calSave();
  }
  // Note editor: typing updates the note and saves after a pause (the preview follows).
  const noteField = e.target.closest("[data-note-field]");
  if (noteField && state.note) {
    state.note[noteField.dataset.noteField] = noteField.value;
    if (noteField.dataset.noteField === "title") retitle();
    if (noteField.dataset.noteField === "slug") state.note.slugTouched = true;
    return noteSave();
  }
  // Newsletter editor: typing updates the draft, the preview and (after a pause) saves.
  const meta = e.target.closest("[data-nl-meta]");
  if (meta && state.nl) {
    state.nl[meta.dataset.nlMeta] = meta.value;
    const label = $(meta.dataset.nlMeta === "subject" ? "[data-nl-subject-preview]" : "[data-nl-pre-preview]");
    if (label) label.textContent = meta.value || (meta.dataset.nlMeta === "subject" ? "No subject yet" : "");
    return nlChanged();
  }
  const field = e.target.closest("[data-nl-field]");
  if (field && state.nl) {
    state.nl.blocks[Number(field.closest("[data-nl-block]").dataset.nlBlock)][field.dataset.nlField] = field.value;
    return nlChanged();
  }
  if (!e.target.matches("[data-search]")) return;
  state.query = e.target.value;
  state.orderLimit = state.trLimit = 0;
  const pos = e.target.selectionStart;
  render();
  const input = $("[data-search]");
  input.focus();
  input.setSelectionRange(pos, pos);
});

// Unsaved edits in the side panel: asked about before they're thrown away (closing it, Esc,
// another page, leaving the back office). Saving, or closing after a save, clears them.
let drawerDirty = false;
document.addEventListener("input", (e) => (e.target as any).closest("[data-drawer] form") && (drawerDirty = true), true);
document.addEventListener("submit", (e) => (e.target as any).closest("[data-drawer]") && (drawerDirty = false), true);
const discardOk = () => !drawerDirty || confirm("Discard your changes?");
document.addEventListener(
  "click",
  (e) => {
    if (!(e.target as any).closest("[data-drawer] [data-close], [data-scrim]") || discardOk()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
  },
  true
);
window.addEventListener("beforeunload", (e) => drawerDirty && e.preventDefault());

document.addEventListener("keydown", (e) => {
  // Esc in a field is for the field (a picker, a suggestion list), not the panel.
  if (e.key === "Escape" && (state.open || state.panel) && !(e.target as any).closest("input, textarea, select, [contenteditable]") && discardOk()) closeDrawer();
  // Packing at a desk: ↓ / J next order, ↑ / K previous, while an order is open.
  if (state.open && !state.panel && !(e.target as any).closest("input, textarea, select, [contenteditable]") && !e.metaKey && !e.ctrlKey && !e.altKey) {
    const dir = { ArrowDown: 1, j: 1, ArrowUp: -1, k: -1 }[e.key];
    if (dir) {
      const btn = $$("[data-nav]")[dir > 0 ? 1 : 0];
      if (btn && !btn.disabled) {
        e.preventDefault();
        btn.click();
      }
    }
  }
});

// Search, take action, or ask: "/" anywhere, the sidebar's Ask Anything box, or the phone's
// search button.
// What search can do with nothing typed (Peasy's palette): make something, each saying where.
const QUICK_ACTIONS = [
  { label: "New To-do", page: "todos", go: "todos", button: "[data-todo-new]" },
  { label: "New Wholesale Order", page: "wholesale", go: "orders", button: '[data-form="wholesale-order"]' },
  { label: "Plan Roast", page: "roasting", go: "roasting", button: "[data-roast-plan]" },
  { label: "New Purchase Order", page: "purchasing", go: "purchasing/orders", button: '[data-form="po"]' },
  { label: "New Bill", page: "purchasing", go: "purchasing/bills", button: "[data-bill-new]" },
  { label: "Import a Document", page: "imports", go: "imports", button: "" },
  { label: "New Wholesale Account", page: "wholesale", go: "wholesale/accounts", button: '[data-form="account"]' },
  { label: "New Product", page: "products", go: "products", button: '[data-form="product"]' },
];
// Every page someone can open, sidebar pages included, as [label, path, icon].
const pageIndex = () => myPages().flatMap((p) => (SUB_NAV[p.id] ? SUB_NAV[p.id].map(([sub, label, ic]) => [label, `${p.id}/${sub}`, ic]) : [[p.label, p.id, p.icon]]));
const pathLabel = (path) => pageIndex().find(([, to]) => to === path)?.[0] || "";
// Go to a page, then do something there (now, if it's already open).
function goThen(path, then) {
  if (routeUrl(path) === location.pathname) return then();
  state.pendingOpen = then;
  go(path);
}
const quickRow = (attrs, ico, main, sub = "", side = "") => `<li class="quick-hit" role="option" aria-selected="false" ${attrs} data-quick-go>${icon(ico)}<span><strong>${main}</strong>${sub ? `<small>${sub}</small>` : ""}</span>${side ? `<em class="quick-side">${side}</em>` : ""}</li>`;
// What this person opened lately (on this device), for the palette's Recently Viewed.
const recentKey = () => `bo-recent:${ME?.id || "key"}`;
const recentList = () => {
  try {
    return JSON.parse(localStorage.getItem(recentKey()) || "[]");
  } catch {
    return [];
  }
};
function viewed(attrs, ico, label, sub = "") {
  const list = [{ attrs, ico, label, sub }, ...recentList().filter((r) => r.attrs !== attrs)].slice(0, 5);
  try {
    localStorage.setItem(recentKey(), JSON.stringify(list));
  } catch {}
}
const quickGroup = (title, rows) => (rows.length ? `<li class="quick-group" role="presentation">${title}</li>${rows.join("")}` : "");
// The palette's own part: actions and pages matching what's typed, and asking the assistant.
function quickLocal(q) {
  const lc = q.toLowerCase();
  const actions = QUICK_ACTIONS.map((a, i) => ({ a, i })).filter(({ a }) => canOpen(a.page) && (!lc || a.label.toLowerCase().includes(lc)));
  const pages = lc ? pageIndex().filter(([label]) => label.toLowerCase().includes(lc)).slice(0, 5) : [];
  return {
    top: (lc || !canOpen("assistant") ? "" : quickGroup("Support", [quickRow(`data-ask=""`, "help", "Help and Support", "", "Open chat")])) + quickGroup("Quick Actions", actions.map(({ a, i }) => quickRow(`data-action="${i}"`, "plus", esc(a.label), "", a.button ? "" : esc(pathLabel(a.go))))) + (lc ? "" : quickGroup("Recently Viewed", recentList().slice(0, 4).map((r) => quickRow(r.attrs, r.ico, esc(r.label), esc(r.sub))))) + quickGroup("Pages", pages.map(([label, to, ic]) => quickRow(`data-page="${esc(to)}"`, ic, esc(label)))),
    ask: canOpen("assistant") ? quickGroup("Assistant", [quickRow(`data-ask="${esc(q)}"`, "sparkles", q ? `Ask “${esc(q)}”` : "Ask the assistant")]) : "",
  };
}
let quickTimer = 0;
let quickSeq = 0;
let quickProduct = null; // opened once the Products page has loaded
document.addEventListener("keydown", (e) => {
  if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || (e.target as any).closest?.("input, textarea, select, [contenteditable]") || !$("[data-side]")) return;
  e.preventDefault();
  openQuick();
});
function openQuick(text = "") {
  if ($("[data-quick]")) return $("[data-quick] input").focus();
  const box = document.createElement("div");
  box.className = "quick";
  box.dataset.quick = "";
  box.innerHTML = `<div class="quick-panel" role="dialog" aria-modal="true" aria-label="Search">
      <label class="quick-field">${icon("search")}<input type="text" enterkeyhint="go" placeholder="Search, take action, or ask for help" autocomplete="off" aria-label="Search, take action, or ask for help" aria-controls="quick-list"><kbd>Esc</kbd></label>
      <ul class="quick-list" id="quick-list" role="listbox" data-quick-list></ul>
    </div>`;
  document.body.append(box);
  // On a computer it grows up out of the sidebar's Ask box (Peasy's): typing stays where the box
  // is, results stack above it, and the page stays in view.
  const anchor = $(".side-ask-box") as HTMLElement;
  if (anchor && anchor.offsetParent) {
    const r = anchor.getBoundingClientRect();
    box.classList.add("is-anchored");
    const panel = $(".quick-panel", box) as HTMLElement;
    panel.style.left = `${Math.max(8, r.left - 8)}px`;
    panel.style.bottom = `${Math.max(8, innerHeight - r.bottom - 8)}px`;
  }
  const input = $("input", box);
  input.value = text;
  input.focus();
  quickFind(text);
  input.oninput = () => {
    clearTimeout(quickTimer);
    quickTimer = window.setTimeout(() => quickFind(input.value), 150);
  };
  box.onclick = (e) => {
    if (e.target === box) return closeQuick();
    const hit = (e.target as any).closest("[data-quick-go]");
    if (hit) quickGo(hit);
  };
  box.onkeydown = (e) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      return closeQuick();
    }
    const hits = $$("[data-quick-go]", box);
    if (!hits.length) return;
    const at = hits.findIndex((h) => h.classList.contains("is-on"));
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (at + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length;
      hits.forEach((h, i) => (h.classList.toggle("is-on", i === next), h.setAttribute("aria-selected", String(i === next))));
      hits[next].scrollIntoView({ block: "nearest" });
    }
    if (e.key === "Enter") {
      e.preventDefault();
      quickGo(hits[Math.max(0, at)]);
    }
  };
}
const closeQuick = () => $("[data-quick]")?.remove();
async function quickFind(q) {
  const list = $("[data-quick-list]");
  if (!list) return;
  q = q.trim();
  const seq = ++quickSeq;
  const show = (records = "") => {
    const local = quickLocal(q);
    // Typed: what was found first, then actions and pages; empty: actions to start from.
    list.innerHTML = (q ? records + local.top : local.top) + local.ask || `<li class="quick-hint">No matches for “${esc(q)}”.</li>`;
    const first = $("[data-quick-go]", list);
    if (first) first.classList.add("is-on"), first.setAttribute("aria-selected", "true");
  };
  show();
  if (q.length < 2) return;
  const r = await api(`/api/admin/search?q=${encodeURIComponent(q)}`).catch(() => null);
  if (seq !== quickSeq || !r || !list.isConnected) return;
  show(
    quickGroup("Orders", r.orders.map((o) => quickRow(`data-order="${esc(o.number)}" data-status="${esc(o.status)}"`, "orders", esc(o.number), [esc(o.name), STATUS_LABEL[o.status] || esc(o.status), money(o.total)].filter(Boolean).join(" · ")))) +
      quickGroup("Customers", r.customers.map((c) => quickRow(`data-cust="${esc(c.id)}"`, "customers", esc(c.name || c.email), esc(c.email)))) +
      quickGroup("Wholesale Accounts", (r.accounts || []).map((a) => quickRow(`data-account="${esc(a.id)}"`, "building", esc(a.name), esc(a.sub)))) +
      quickGroup("Suppliers", (r.suppliers || []).map((x) => quickRow(`data-supplier="${esc(x.id)}"`, "building", esc(x.name), esc(x.sub)))) +
      quickGroup("Green Coffee", (r.green || []).map((x) => quickRow(`data-green-item="${esc(x.id)}"`, "purchasing", esc(x.name), esc(x.sub)))) +
      quickGroup("Products", r.products.map((x) => quickRow(`data-prod="${esc(x.id)}" data-kind="${x.kind}"`, "products", esc(x.name), x.kind === "tea" ? "Tea" : "Coffee")))
  );
}
async function quickGo(hit) {
  const d = hit.dataset;
  closeQuick();
  $("[data-side]")?.classList.remove("is-open");
  if (d.action) {
    const a = QUICK_ACTIONS[d.action];
    return goThen(a.go, () => a.button && ($(a.button) as HTMLElement)?.click());
  }
  if (d.page) return go(d.page);
  if (d.ask !== undefined) return d.ask ? openSidekick(d.ask) : (openSidekick(), undefined);
  if (d.account) return goThen("wholesale/accounts", () => accountForm(state.trade.accounts.find((a) => a.id === d.account)));
  if (d.supplier) return goThen("purchasing/suppliers", () => supplierForm(state.trade.suppliers.find((x) => x.id === d.supplier)));
  if (d.greenItem) return goThen("purchasing/stock", () => greenItemPanel(d.greenItem));
  if (d.cust) return customerPanel(d.cust);
  if (d.order) {
    state.open = d.order;
    if (location.pathname === routeUrl(`orders/${d.status}`)) return openOrder(d.order);
    history.pushState(null, "", routeUrl(`orders/${d.status}`));
    shownHash = location.pathname;
    readHash();
    return refresh();
  }
  quickProduct = { id: d.prod, kind: d.kind };
  if (state.page === "products" && state.catalog) return render();
  go(d.kind === "tea" ? "#products/teas" : "#products");
}

function closeDrawer({ fromHistory = false } = {}) {
  if (!fromHistory) orderOutOfUrl();
  drawerDirty = false;
  panelKey = null;
  setTimeout(syncPresence, 0);
  state.open = null;
  state.panel = false;
  $("[data-drawer]").hidden = true;
  $("[data-drawer]").classList.remove("is-order-page", "is-modal");
  $("[data-scrim]").hidden = true;
  $("[data-scrim]").classList.remove("is-blur");
  $$("[data-row]").forEach((r) => r.classList.remove("is-open"));
}

/* ── Order detail ── */

// A café's chosen pickup: "Tue, Nov 3 at 10 AM".
const pickupLabel = (p) => {
  const [h, m] = p.time.split(":").map(Number);
  return `${new Date(`${p.day}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })} at ${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
};
const addressLines = (o) => {
  if (o.shipTo) return [o.shipTo.name || o.contact.name, o.shipTo.address, `${o.shipTo.city}${o.shipTo.state ? `, ${o.shipTo.state}` : ""} ${o.shipTo.postcode}`];
  return [o.contact.name, o.wholesale?.pickupAt?.placeName || "our office", ...(o.wholesale?.pickupAt ? [pickupLabel(o.wholesale.pickupAt)] : [])];
};
// Collected from us: no address to send it to, and not a café order or a courier.
const isPickup = (o) => !o.shipTo && !o.cafe && o.fulfilment !== "Local delivery" && o.fulfilment !== "Shipping";

// The drawer's top row: the next step is the primary button. An unpaid order is marked paid
// before anything else, except a wholesale one on invoice terms (packed first, paid later).
const canMarkPaid = (o) => o.payment === "unpaid" && o.status !== "cancelled" && !o.wholesale?.processing;
function nextActions(o) {
  const actions = [];
  const payFirst = canMarkPaid(o) && !o.wholesale?.terms;
  if (canMarkPaid(o)) actions.push(["paid", "Mark as paid", payFirst]);
  if (o.status === "new") actions.push(["packed", o.fulfilment === "Local delivery" ? "Mark Packed & Book Courier" : "Mark Packed", !payFirst]);
  if ((o.status === "new" || o.status === "packed") && o.shipTo && o.fulfilment !== "Local delivery") actions.push(["shipped", "Mark shipped", o.status === "packed" && !payFirst]);
  if ((o.status === "new" || o.status === "packed") && !o.shipTo) actions.push(["ready", o.cafe?.mode === "delivery" ? "Ready for courier" : "Ready to collect", o.status === "packed" && !payFirst]);
  if (o.status === "shipped" || o.status === "ready") actions.push(["completed", o.status === "ready" ? "Collected" : "Delivered", !payFirst]);
  if (o.status === "cancelled" || o.status === "completed") actions.push(["new", "Reopen", false]);
  return actions;
}

// Where an order came from and how it goes out, for the order page.
const orderChannel = (o) => (o.source === "wholesale" ? "Wholesale" : o.source === "renewal" ? "Subscription" : o.source === "pos" ? "Point of Sale" : o.cafe ? "Pickup" : "Online Store");
// What happened after the sale: returns, problems reported, a delivery that came back. Each opens
// on the Returns page, where it's handled.
function afterSale(o) {
  const RET = { open: "Waiting", refunded: "Refunded", credited: "Store credit", exchanged: "Swap sent", cancelled: "Cancelled" };
  const PROB = { open: "To answer", replaced: "Replaced", refunded: "Refunded", credited: "Credited", declined: "Declined" };
  const what = (x) => x.items.map((i) => `${i.qty} × ${esc(i.title)}`).join(", ");
  const rows = [
    ...(o.deliveryIssue ? [[o.deliveryIssue.kind === "courier" ? "Courier couldn't deliver" : "Carrier sending it back", o.deliveryIssue.status === "open" ? "Waiting on customer" : o.deliveryIssue.status === "reshipped" ? `Reshipped${o.deliveryIssue.reship ? ` as ${esc(o.deliveryIssue.reship)}` : ""}` : "Refunded", "#returns", o.deliveryIssue.status === "open"]] : []),
    ...(o.claims || []).map((c) => [`Problem: ${what(c)}`, PROB[c.status] || c.status, `#returns/${c.code}`, c.status === "open"]),
    ...(o.returns || []).filter((r) => r.status !== "cancelled").map((r) => [`Return: ${what(r)}`, RET[r.status] || r.status, `#returns/${r.code}`, r.status === "open"]),
  ];
  if (!rows.length) return "";
  return `<section class="panel">
    <h3 class="panel-title">After the sale</h3>
    <div class="list">${rows.map(([label, state, href, open]) => `<a class="list-row" href="${href}"><span class="list-main"><strong>${label}</strong></span><span class="list-side"><span class="badge ${open ? "t-yellow" : "sub-active"}"><i></i>${state}</span></span></a>`).join("")}</div>
  </section>`;
}

// "USPS Ground Advantage", not "USPS USPS Ground Advantage" (the service usually names its carrier).
const labelService = (l) => (String(l.service || "").toLowerCase().startsWith(String(l.carrier || "").toLowerCase()) ? l.service : `${l.carrier} ${l.service}`.trim());
const shipMethod = (o) => (o.cafe ? `Café ${o.cafe.mode === "delivery" ? "delivery" : "pickup"}` : o.fulfilment === "Pickup" || isPickup(o) ? "Pickup" : o.fulfilment === "Local delivery" ? "Local courier" : o.label && !o.label.voided ? labelService(o.label) : "Shipping");

// The orders list as shown (current tab and search): the drawer steps through it.
function orderQueue() {
  return state.page === "orders" ? orderRows().map((o) => o.number) : [];
}

// Edit Items: each coffee or accessory line's quantity (0 takes it off), lines added from the
// shop, and what it does to the money, priced by the server as it's changed. Saving refunds the
// difference to the card or emails an invoice for it, then reopens the order.
function editItems(o) {
  const editable = (l) => l.kind === "coffee" || l.kind === "accessory";
  const added = [];
  const drawer = openPanel("Edit Items", `
    <form class="panel form-stack" data-edit-form>
      <ul class="edit-lines">${o.lines
        .map(
          (l, i) => `<li>
            <span><strong>${esc(l.title)}</strong><small>${esc(l.variant || "")} · ${money(l.price)}</small></span>
            ${editable(l) || o.source === "wholesale" ? `<input name="qty" data-i="${i}" type="number" min="0" max="500" step="1" inputmode="numeric" value="${l.qty}" aria-label="Quantity of ${esc(l.title)}">` : `<span class="muted">${l.qty} · can't change here</span>`}
          </li>`
        )
        .join("")}</ul>
      <ul class="edit-lines" data-added></ul>
      <div class="edit-add">
        <select data-add-item aria-label="Item to add"><option value="">Add an item…</option>${o.addable.map((x, i) => `<option value="${i}">${esc(x.label)}</option>`).join("")}</select>
        <input data-add-qty type="number" min="1" max="500" value="1" inputmode="numeric" aria-label="How many">
        <button type="button" class="btn" data-add>${icon("plus")}<span>Add</span></button>
      </div>
      <div class="edit-preview" data-preview aria-live="polite"></div>
      <div class="drawer-actions">
        <button type="submit" class="btn btn-primary" disabled>Save Changes</button>
        <button type="button" class="btn" data-edit-cancel>Back to Order</button>
      </div>
    </form>`, { page: "Orders", subtitle: o.number });
  const form = $("[data-edit-form]", drawer);
  const body = () => ({ qty: o.lines.map((l, i) => { const x = $(`[name=qty][data-i="${i}"]`, form); return x ? Number(x.value) || 0 : l.qty; }), add: added.map((a) => ({ ...a.line, qty: a.qty })) });
  let seq = 0;
  let timer = 0;
  const preview = () => {
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++seq;
      const box = $("[data-preview]", form);
      const save = $("[type=submit]", form);
      try {
        const p = await api(`/api/admin/orders/${o.number}/edit`, { method: "POST", body: { ...body(), preview: true } });
        if (mine !== seq) return;
        const same = Math.abs(p.total - o.total) < 0.005 && JSON.stringify(body().qty) === JSON.stringify(o.lines.map((l) => l.qty)) && !added.length;
        const what = p.wholesale ? "A new invoice for the new total replaces the old one." : p.delta < 0 ? (p.byCard ? `${money(-p.delta)} is refunded to their card.` : `Refund ${money(-p.delta)} yourself.`) : p.delta > 0 ? (p.byCard ? `They're emailed an invoice for ${money(p.delta)}.` : `Collect ${money(p.delta)} from them.`) : "What they pay doesn't change.";
        box.innerHTML = `<dl class="totals"><dt>Subtotal</dt><dd>${money(p.subtotal)}</dd>${p.tax ? `<dt>Tax</dt><dd>${money(p.tax)}</dd>` : ""}<dt class="total">New total</dt><dd class="total">${money(p.total)}</dd></dl><p>${esc(what)}</p>`;
        save.disabled = same;
      } catch (error) {
        if (mine !== seq) return;
        box.innerHTML = `<p class="form-error">${esc(error.message)}</p>`;
        save.disabled = true;
      }
    }, 250);
  };
  const drawAdded = () => {
    $("[data-added]", form).innerHTML = added.map((a, i) => `<li><span><strong>${esc(a.label)}</strong><small>Added</small></span><span class="edit-added-qty">${a.qty}<button type="button" class="icon-btn" data-unadd="${i}" aria-label="Remove">${icon("close")}</button></span></li>`).join("");
  };
  form.addEventListener("input", preview);
  form.addEventListener("click", (e) => {
    const t: any = e.target;
    if (t.closest("[data-edit-cancel]")) return openOrder(o.number);
    if (t.closest("[data-add]")) {
      const pick = $("[data-add-item]", form);
      if (pick.value === "") return pick.focus();
      const x = o.addable[Number(pick.value)];
      added.push({ label: x.label, line: x.line, qty: Math.max(1, Math.round(Number($("[data-add-qty]", form).value) || 1)) });
      pick.value = "";
      drawAdded();
      return preview();
    }
    const un = t.closest("[data-unadd]");
    if (un) {
      added.splice(Number(un.dataset.unadd), 1);
      drawAdded();
      preview();
    }
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const save = $("[type=submit]", form);
    save.disabled = true;
    try {
      const { delta } = await api(`/api/admin/orders/${o.number}/edit`, { method: "POST", body: body() });
      toast(o.source === "wholesale" ? (o.wholesale?.invoice ? "Changed. A new invoice went to them." : "Changed.") : delta < 0 ? `Changed. ${money(-delta)} refunded.` : delta > 0 ? `Changed. ${money(delta)} to pay.` : "Changed.");
      await route();
      openOrder(o.number);
    } catch (error) {
      save.disabled = false;
      panelError(error.message);
    }
  });
  preview();
}

async function openOrder(number) {
  // An order opens as its own page (the panel, filling the space beside the sidebar).
  const drawer = $("[data-drawer]");
  orderToUrl(number);
  drawer.hidden = false;
  drawer.classList.add("is-order-page");
  $("[data-scrim]").hidden = true;
  drawer.innerHTML = `<div class="drawer-loading"><span class="spinner"></span>Loading ${esc(number)}…</div>`;
  let order;
  try {
    ({ order } = await api(`/api/admin/orders/${number}`));
  } catch (error) {
    drawer.innerHTML = `<div class="drawer-loading"><p class="form-error">${esc(error.message)}</p></div>`;
    return;
  }
  const o = order;
  const c = o.cafe;
  viewed(`data-order="${esc(o.number)}" data-status="${esc(o.status)}"`, "orders", o.number, o.customer?.name || o.name || "");
  // What's left to refund: what was charged (an edit's refund counts back in) less refunds.
  const left = Math.round((o.total + (o.editedOff || 0) - (o.refunded || 0)) * 100) / 100;
  const byCard = Boolean(o.square?.paymentId) && o.payment !== "unpaid";
  const refundable = Boolean(o.square?.paymentId) && left > 0 && (o.payment === "paid" || o.payment === "partially_refunded");
  const items = o.lines.reduce((n, l) => n + l.qty, 0);
  const hasLabel = Boolean(o.label && !o.label.voided);
  // Refund, Print and More Actions: in the header on a computer; on a phone, under the status
  // card's own buttons (the next step comes first).
  const tools = (where) => `<div class="order-tools is-${where}">
        ${refundable ? `<button type="button" class="btn" data-goto-refund>Refund</button>` : ""}
        ${
          hasLabel
            ? `<details class="order-menu">
          <summary class="btn">${icon("print")}<span>Print</span>${icon("ChevronDown")}</summary>
          <div class="order-menu-list">
            <button type="button" data-print>${icon("print")}<span>Packing Slip</span></button>
            <a href="/api/admin/orders/${esc(o.number)}/label.pdf" target="_blank" rel="noopener" data-pdf="Label ${esc(o.number)}.pdf">${icon("print")}<span>Shipping Label</span></a>
          </div>
        </details>`
            : `<button type="button" class="btn" data-print data-tip="Print the packing slip">${icon("print")}<span>Print</span></button>`
        }
        <details class="order-menu">
          <summary class="btn">More actions${icon("ChevronDown")}</summary>
          <div class="order-menu-list">
            ${o.statusPage ? `<a href="${esc(o.statusPage)}" target="_blank" rel="noopener">${icon("eye")}<span>View Order Status Page</span></a>` : ""}
            ${o.tracking?.url ? `<a href="${esc(o.tracking.url)}" target="_blank" rel="noopener">${icon("ext")}<span>Carrier Tracking</span></a>` : ""}
            ${o.contact?.email && o.status !== "pending_payment" ? `<button type="button" data-resend-confirmation>${icon("send")}<span>Resend confirmation email</span></button>` : ""}
            ${o.contact?.email ? `<button type="button" data-compose-email="${esc(o.contact.email)}" data-compose-name="${esc(o.contact.name || "")}" data-compose-box="${o.wholesale ? "wholesale" : "orders"}" data-compose-subject="${esc(`Your Mimi Food order ${o.number}`)}">${icon("signups")}<span>Email Customer</span></button>` : ""}
            ${o.customerId ? `<button type="button" data-view-customer="${esc(o.customerId)}">${icon("customers")}<span>View customer</span></button>` : ""}
            <button type="button" data-todo-add="order" data-id="${esc(o.number)}" data-link-label="${esc(o.number)}">${icon("todos")}<span>Add To-do</span></button>
            <button type="button" data-copy-number>${icon("copy")}<span>Copy Order Number</span></button>
            <button type="button" data-copy-link>${icon("Link")}<span>Copy Order Link</span></button>
            <button type="button" data-hide-order="${o.hidden ? "" : "1"}">${icon(o.hidden ? "eye" : "archive")}<span>${o.hidden ? "Show in Order Lists" : "Hide From Order Lists"}</span></button>
            ${
              o.status !== "cancelled" && o.status !== "completed"
                ? `<button type="button" class="is-danger" ${byCard && left > 0 ? "data-cancel-ask" : 'data-status="cancelled"'}>${icon("close")}<span>Cancel Order</span></button>`
                : ""
            }
          </div>
        </details>
      </div>`;
  drawer.innerHTML = `
    <header class="drawer-head order-head">
      <div>
        <div class="order-title">
          <button type="button" class="icon-btn order-back" data-close aria-label="Back to Orders">${icon("arrow")}</button>
          <h2>${esc(o.number)}</h2><div class="drawer-badges">${statusBadge(o.status)}${o.parent ? "" : payTag(o)}</div>
        </div>
        <p class="muted">${esc(date(o.placedAt))} from ${esc(orderChannel(o))}</p>
      </div>
      <div class="order-head-actions">
        ${tools("wide")}
        ${(() => {
          const queue = orderQueue();
          const i = queue.indexOf(o.number);
          return i < 0 || queue.length < 2
            ? ""
            : `<span class="queue-nav">
                <button type="button" class="icon-btn" data-nav="${esc(queue[i - 1] || "")}" aria-label="Previous order" aria-keyshortcuts="K" ${i === 0 ? "disabled" : ""}>${icon("moveUp")}</button>
                <button type="button" class="icon-btn" data-nav="${esc(queue[i + 1] || "")}" aria-label="Next order" aria-keyshortcuts="J" ${i === queue.length - 1 ? "disabled" : ""}>${icon("moveDown")}</button>
              </span>`;
        })()}
        <button type="button" class="icon-btn page-close" data-close aria-label="Close">${icon("close")}</button>
      </div>
    </header>

    <div class="drawer-body">
      ${
        byCard && left > 0 && o.status !== "cancelled" && o.status !== "completed"
          ? `<div class="cancel-choice" data-cancel-choice hidden>
              <p>Cancel ${esc(o.number)}?</p>
              <button type="button" class="btn btn-danger" data-cancel-refund>Cancel & refund ${money(left)}</button>
              <button type="button" class="btn" data-status="cancelled">Cancel without refund</button>
            </div>`
          : ""
      }
      <div class="order-cols">
      <div class="order-main">
      ${o.notes ? `<section class="order-note"><small>Note from customer</small><p>${esc(o.notes)}</p></section>` : ""}
      <section class="panel order-fulfil">
        <header class="fulfil-head">
          <h3 class="fulfil-title">${icon("purchasing")}<span>${esc(shipMethod(o))}</span></h3>
          <div class="drawer-actions order-actions">
        ${nextActions(o).map(([status, label, primary]) => `<button type="button" class="btn ${primary ? "btn-primary" : ""}" ${status === "paid" ? "data-mark-paid" : `data-status="${status}"`}>${label}</button>`).join("")}
        ${o.shipTo && o.fulfilment !== "Local delivery" && !hasLabel && (o.status === "new" || o.status === "packed") ? `<button type="button" class="btn btn-dark" data-goto-label hidden>Create Shipping Label</button>` : ""}
      </div>
        </header>
        ${tools("narrow")}
        <div class="fulfil-box">
          <ul class="lines">
            ${o.lines
              .map(
                (l) => `<li>
                  <span class="line-thumb${l.thumb && !/\.jpe?g$/i.test(l.thumb) ? " is-cutout" : ""}">${l.thumb ? `<img src="${esc(l.thumb)}" alt="" loading="lazy">` : icon("products")}</span>
                  <span class="line-main"><strong>${esc(l.title)}</strong>${l.variant ? `<span class="chips-row">${String(l.variant).split(" · ").map((v) => `<span class="chip-sm">${esc(v)}</span>`).join("")}</span>` : ""}${l.note ? `<small class="gift">Gift card: “${esc(l.note)}”</small>` : ""}</span>
                  <span class="line-price">${money(l.price)} × <span class="chip-sm">${l.qty}</span></span>
                  <span class="num">${money(l.price * l.qty)}</span>
                </li>`
              )
              .join("")}
          </ul>
          ${o.editBlock ? "" : `<button type="button" class="btn btn-sm" data-edit-items>${icon("edit")}<span>Edit Items</span></button>`}
        </div>
      </section>
      <section class="panel order-pay" ${o.parent ? "hidden" : ""}>
        <header class="fulfil-head"><h3 class="fulfil-title">${icon("orders")}<span>Payment</span></h3></header>
        <div class="fulfil-box">
          <dl class="totals order-totals" ${o.parent ? "hidden" : ""}>
          <dt>Subtotal</dt><dd class="sub">${items} ${items === 1 ? "item" : "items"}</dd><dd>${money(o.subtotal)}${o.giftDeliveries?.length ? ` <small class="muted">incl. gifts sent separately</small>` : ""}</dd>
          ${o.fulfilment ? `<dt>Shipping</dt><dd class="sub">${shipMethod(o) === "Shipping" ? "" : esc(shipMethod(o))}</dd><dd>${o.shipping ? money(o.shipping) : "Free"}</dd>` : ""}
          ${o.cafeFee ? `<dt>Café delivery</dt><dd class="sub"></dd><dd>${money(o.cafeFee)}</dd>` : ""}
          ${o.discount ? `<dt>Discount</dt><dd class="sub">${esc(o.discount.code || o.discount.name || "")}</dd><dd>${[o.discount.freeShipping && "Free shipping", o.discount.amount && `−${money(o.discount.amount)}`].filter(Boolean).join(", ")}</dd>` : ""}
          <dt class="total">Total</dt><dd class="sub total"></dd><dd class="total">${money(o.total)}</dd>
          ${o.refunded ? `<dt>Refunded</dt><dd class="sub"></dd><dd>−${money(o.refunded)}</dd>` : ""}
          </dl>
          ${o.editDue && !o.editDue.paid && !o.editDue.cancelled ? `<p class="edit-due">${o.editDue.url ? `Waiting on ${money(o.editDue.amount)} for the change: <a class="link" href="${esc(o.editDue.url)}" target="_blank" rel="noopener">invoice ${esc(o.editDue.number)}</a>` : `Collect ${money(o.editDue.amount)} for the change.`}</p>` : ""}
          ${o.editDue?.paid ? `<p class="muted">${money(o.editDue.amount)} for the change paid.</p>` : ""}
          ${o.editRefundDue ? `<p class="edit-due">Refund ${money(o.editRefundDue)} for the change yourself: it wasn't paid by card here.</p>` : ""}
        </div>
      </section>
      ${(o.fulfilment === "Local delivery" || o.cafe?.mode === "delivery") && o.status !== "cancelled" ? courierPanel(o) : ""}
      ${
        o.shipTo && o.status !== "cancelled" && o.fulfilment !== "Local delivery"
          ? `<section class="panel" data-shipping>
              <h3>Shipping</h3>
              ${
                o.label && !o.label.voided
                  ? `<dl class="totals">
                      <dt>Label</dt><dd>${esc(labelService(o.label))}${o.label.test ? " (test)" : ""}</dd>
                      <dt>Cost</dt><dd>${money(o.label.cost)}</dd>
                      <dt>Tracking</dt><dd>${o.tracking?.url ? `<a class="link" href="${esc(o.tracking.url)}" target="_blank" rel="noopener">${esc(o.label.trackingNumber)}</a>` : esc(o.label.trackingNumber)}</dd>
                    </dl>
                    <div class="drawer-actions">
                      <a class="btn btn-primary" href="/api/admin/orders/${esc(o.number)}/label.pdf" target="_blank" rel="noopener" data-pdf="Label ${esc(o.number)}.pdf">${icon("print")}<span>Print label</span></a>
                      <button type="button" class="btn" data-void-label>Void label</button>
                    </div>`
                  : `<div data-label-form><p class="muted">Loading shipping options…</p></div>`
              }
              <details class="manual-tracking" ${o.label && !o.label.voided ? "hidden" : ""}>
                <summary class="btn btn-sm toggle-btn"><span>Shipped Another Way? Enter Tracking</span>${icon("ChevronDown")}</summary>
                <form class="tracking-row" data-tracking>
                  <select name="carrier" aria-label="Carrier">${["", ...state.carriers, "Other"].map((cr) => `<option value="${cr}" ${o.tracking?.carrier === cr ? "selected" : ""}>${cr || "Carrier"}</option>`).join("")}</select>
                  <input name="number" placeholder="Tracking number" value="${esc(o.tracking?.number || "")}" aria-label="Tracking number">
                  <button type="submit" class="btn">${o.status === "shipped" ? "Save" : "Save & ship"}</button>
                </form>
                ${o.tracking?.url && !(o.label && !o.label.voided) ? `<a class="link" href="${esc(o.tracking.url)}" target="_blank" rel="noopener">Track parcel</a>` : ""}
              </details>
            </section>`
          : ""
      }
      ${
        o.square?.paymentId
          ? `<section class="panel">
              <h3>Card payment</h3>
              <div data-payment><p class="muted">Loading from Square…</p></div>
              ${
                left > 0 && (o.payment === "paid" || o.payment === "partially_refunded")
                  ? `<form class="refund" data-refund>
                      <h4>Refund</h4>
                      <div class="refund-row">
                        <label class="money-input"><span>${esc(state.shop.currency)}</span><input name="amount" inputmode="decimal" placeholder="${left.toFixed(2)}" aria-label="Refund amount"></label>
                        <input name="reason" placeholder="Reason (shown to the customer)" maxlength="200" aria-label="Reason">
                      </div>
                      <div class="refund-foot">
                        <label class="checkbox"><input type="checkbox" name="notify" checked> Email the customer</label>
                        <button type="submit" class="btn">Refund</button>
                      </div>
                    </form>`
                  : ""
              }
            </section>`
          : ""
      }
      </div>
      <div class="order-side">
      <div class="order-map" data-order-map hidden></div>
      <section class="panel info-grid order-info">
        <div>
          <h3>Customer</h3>
          <p>${esc(o.contact.name)}<br><a href="mailto:${esc(o.contact.email)}">${esc(o.contact.email)}</a>${o.contact.phone ? `<br><a href="tel:${esc(o.contact.phone)}">${esc(o.contact.phone)}</a>` : ""}${o.customerOrders ? `<br><span class="muted">${o.customerOrders === 1 ? "First order" : `${o.customerOrders} orders`}</span>` : ""}</p>
        </div>
        ${
          o.fulfilment
          && !c
            ? `<div><h3>${o.shipTo?.name ? `Gift to ${esc(o.shipTo.name.split(" ")[0])}` : o.shipTo ? "Ship to" : "Pickup"}</h3><p>${addressLines(o)
                .slice(o.shipTo?.name ? 0 : 1)
                .map(esc)
                .join("<br>")}${o.shipTo?.phone ? `<br><a href="tel:${esc(o.shipTo.phone)}">${esc(o.shipTo.phone)}</a>` : ""}</p></div>`
            : ""
        }
        ${o.parent ? `<div><h3>Paid with</h3><p><a href="#orders/new" data-open-order="${esc(o.parent)}">${esc(o.parent)}</a><br><span class="muted">Gift delivery from ${esc(o.contact.name)}</span></p></div>` : ""}
        ${
          o.giftDeliveries?.length
            ? `<div class="wide"><h3>Gifts sent separately</h3><p>${o.giftDeliveries
                .map((g) => `${g.number ? `<a href="#orders/new" data-open-order="${esc(g.number)}">${esc(g.number)}</a>` : "Not created yet"} · ${esc(g.shipTo.name)}, ${esc(g.shipTo.city)} · ${g.fulfilment === "Local delivery" ? "courier" : "shipping"}`)
                .join("<br>")}</p></div>`
            : ""
        }
        ${
          c
            ? `<div><h3>Café ${c.mode === "delivery" ? "delivery" : "pickup"}</h3>
                <p>${esc(c.when)}<br>${esc(c.locationName)}${c.address ? `<br>→ ${esc(c.address.street)}, ${esc(c.address.city)} ${esc(c.address.postcode)}${c.distanceKm != null ? ` (${c.distanceKm} km)` : ""}` : ""}</p></div>`
            : ""
        }
      </section>
      ${afterSale(o)}
      ${
        o.source === "wholesale" && o.wholesale
          ? `<section class="panel info-grid">
              <div><h3>Wholesale account</h3><p><a class="link" href="#wholesale/accounts" data-open-account="${esc(o.wholesale.accountId || "")}">${esc(o.wholesale.business)}</a>${o.wholesale.poRef ? `<br>Their PO: ${esc(o.wholesale.poRef)}` : ""}</p></div>
              <div><h3>Invoice</h3><p>${o.wholesale.terms ? `Net ${o.wholesale.terms}` : "Due on receipt"}${o.status !== "cancelled" && dueLabel(o) && dueLabel(o) !== "Due on receipt" ? ` · ${esc(dueLabel(o))}` : ""}${
                o.wholesale.invoice
                  ? `<br><a class="link" href="${esc(o.wholesale.invoice.url)}" target="_blank" rel="noopener">Invoice ${esc(o.wholesale.invoice.number || "")}</a>`
                  : o.payment !== "paid" && o.status !== "cancelled"
                  ? `<br><button type="button" class="btn btn-sm" data-send-invoice>Send Invoice</button>`
                  : ""
              }${o.status !== "cancelled" ? `<br><a class="btn btn-sm" href="/api/admin/orders/${esc(o.number)}/invoice.pdf" download data-pdf="Invoice ${esc(o.number)}.pdf">${icon("download")}<span>Download PDF</span></a>` : ""}</p></div>
            </section>`
          : ""
      }
      <section class="panel order-risk" data-risk hidden></section>
      <section class="panel">
        <h3>Timeline</h3>
        <form class="note-form" data-note>
          <input name="note" placeholder="Leave a comment" maxlength="500" aria-label="Internal note">
          <button type="submit" class="btn">Post</button>
        </form>
        <ol class="timeline">
          ${o.history
            .slice()
            .reverse()
            .map((h) => `<li><span>${h.status ? esc(STATUS_LABEL[h.status] || h.status) : "Note"}${h.note ? `: ${esc(h.note)}` : ""}</span><small>${esc(date(h.at))} · ${esc(h.by)}</small></li>`)
            .join("")}
        </ol>
      </section>
      </div>
      </div>







      <p class="form-error" role="alert" data-drawer-error></p>
    </div>`;

  const showError = (message, fields = null) => {
    $("[data-drawer-error]", drawer).textContent = message;
    if (message && lastForm?.closest("[data-drawer]")) flagFields(lastForm, message, fields);
  };

  const save = async (body, confirmText?) => {
    if (confirmText && !confirm(confirmText)) return;
    // Packing through a list: once this order leaves the tab, carry on with the next one.
    const queue = orderQueue();
    const i = queue.indexOf(o.number);
    const next = queue[i + 1] || queue[i - 1] || null;
    try {
      const result = await api(`/api/admin/orders/${o.number}`, { method: "PATCH", body });
      const leaves = body.status && state.page === "orders" && body.status !== state.tab && i >= 0;
      const done = body.status ? `${o.number} ${(STATUS_LABEL[body.status] || body.status).toLowerCase()}${result.emailed ? ", customer emailed" : ""}` : "Updated";
      if (leaves && next) {
        state.open = next;
        toast(`${done}. Next: ${next}`);
      } else if (leaves) {
        state.open = null;
        closeDrawer();
        toast(`${done}. That's the last one.`);
      } else toast(done);
      await refresh();
    } catch (error) {
      showError(error.message);
    }
  };

  // Refunds go through Square on the server.
  const refund = async (body, confirmText) => {
    if (!confirm(confirmText)) return;
    showError("");
    try {
      const result = await api(`/api/admin/orders/${o.number}/refund`, { method: "POST", body });
      toast(`Refunded${result.emailed ? ` and emailed ${o.contact.email}` : ""}`);
      await refresh();
    } catch (error) {
      showError(error.message);
    }
  };

  const courier = async (button) => {
    const action = button.dataset.courier;
    if (action === "cancel" && !confirm(`Cancel the ${courierName(o.courier)} courier for ${o.number}?`)) return;
    // Already packed: switching books (and pays for) the courier straight away, so ask first.
    if (action === "switch" && o.status === "packed" && !confirm(`Book an Uber Direct courier now${button.dataset.courierFee ? ` for ${money(Number(button.dataset.courierFee))}` : ""}?`)) return;
    button.disabled = true;
    showError("");
    try {
      await api(`/api/admin/orders/${o.number}/courier`, { method: "POST", body: { action, ...(action === "switch" && { phone: $("[data-courier-phone]", drawer)?.value || "" }) } });
      toast({ book: "Courier booked", refresh: "Courier status updated", cancel: "Courier cancelled", switch: "Going by Uber Direct", ship: "Shipping instead" }[action]);
      await refresh();
    } catch (error) {
      button.disabled = false;
      showError(error.message);
    }
  };

  drawer.onclick = (e) => {
    // Print and More actions: a click elsewhere, or on one of their items, closes them.
    $$("details.order-menu[open]", drawer).forEach((d) => (!d.contains(e.target) || e.target.closest(".order-menu-list button, .order-menu-list a")) && d.removeAttribute("open"));
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-goto-label]")) return $("[data-shipping]", drawer)?.scrollIntoView({ behavior: "smooth", block: "start" });
    if (e.target.closest("[data-edit-items]")) return editItems(o);
    const hideOne = e.target.closest("[data-hide-order]");
    if (hideOne) {
      const hiding = hideOne.dataset.hideOrder === "1";
      if (hiding && !confirm(`Hide ${o.number}? It leaves the order lists; nothing is cancelled or refunded.`)) return;
      api(`/api/admin/orders/${o.number}`, { method: "PATCH", body: { hidden: hiding } }).then(
        () => (toast(hiding ? `${o.number} hidden` : `${o.number} shown again`), closeDrawer(), refresh()),
        (error) => toast(error.message, "error")
      );
      return;
    }
    if (e.target.closest("[data-goto-refund]")) {
      const f = $("[data-refund]", drawer);
      f?.scrollIntoView({ behavior: "smooth", block: "center" });
      return f?.amount.focus({ preventScroll: true });
    }
    if (e.target.closest("[data-copy-number]")) return navigator.clipboard?.writeText(o.number).then(() => toast("Copied"), () => {});
    if (e.target.closest("[data-copy-link]")) return navigator.clipboard?.writeText(`${location.origin}/admin/orders/${o.status}?order=${o.number}`).then(() => toast("Link copied"), () => {});
    const viewCustomer = e.target.closest("[data-view-customer]");
    if (viewCustomer) return customerPanel(viewCustomer.dataset.viewCustomer);
    const acctLink = e.target.closest("[data-open-account]");
    if (acctLink) {
      e.preventDefault();
      const id = acctLink.dataset.openAccount;
      return goThen("wholesale/accounts", () => accountPanel(state.trade?.accounts.find((a) => a.id === id)));
    }
    const resend = e.target.closest("[data-resend-confirmation]");
    if (resend) {
      if (!confirm(`Email the order confirmation to ${o.contact.email} again?`)) return;
      return api(`/api/admin/orders/${o.number}/resend-confirmation`, { method: "POST", body: {} })
        .then(() => (toast(`Confirmation sent to ${o.contact.email}`), refresh()))
        .catch((error) => showError(error.message));
    }
    const nav = e.target.closest("[data-nav]");
    if (nav?.dataset.nav) {
      state.open = nav.dataset.nav;
      $$("[data-row]").forEach((r) => r.classList.toggle("is-open", r.dataset.row === state.open));
      return openOrder(state.open);
    }
    const cb = e.target.closest("[data-courier]");
    if (cb) return courier(cb);
    const s = e.target.closest("[data-status]");
    if (s) save({ status: s.dataset.status }, s.dataset.status === "cancelled" ? `Cancel ${o.number}? The customer will be emailed.` : null);
    if (e.target.closest("[data-cancel-ask]")) $("[data-cancel-choice]", drawer).hidden = false;
    if (e.target.closest("[data-cancel-refund]")) refund({ cancel: true }, `Cancel ${o.number} and refund ${money(left)} to the customer's card?`);
    if (e.target.closest("[data-print]")) printSlips([o.number]);
    if (e.target.closest("[data-mark-paid]") && confirm(`Mark ${o.number} as paid? Use this when you were paid outside the site and Square.${o.wholesale?.invoice ? " Its Square invoice is cancelled so it can't be paid twice." : ""}`)) save({ payment: "paid", note: "Marked as paid" });
    if (e.target.closest("[data-send-invoice]")) {
      api(`/api/admin/wholesale-orders/${o.number}/invoice`, { method: "POST", body: {} })
        .then(() => {
          toast("Invoice sent");
          return refresh();
        })
        .catch((error) => showError(error.message));
    }
    if (e.target.closest("[data-edit-address]")) $("[data-address-fields]", drawer).hidden = false;
    const buy = e.target.closest("[data-buy-label]");
    if (buy) {
      const f = buy.closest("[data-label]");
      const rate = rates[Number(f.rate?.value ?? f.querySelector("input[name=rate]:checked")?.value)];
      if (!rate) return showError("Choose a shipping service.");
      if (!confirm(`Buy a ${rate.carrierName} ${rate.serviceName} label for ${money(rate.cost)}?`)) return;
      buy.disabled = true;
      buy.textContent = "Buying…";
      api(`/api/admin/orders/${o.number}/label`, { method: "POST", body: { ...labelBody(f), carrierCode: rate.carrierCode, serviceCode: rate.serviceCode, serviceName: rate.serviceName, notify: f.notify.checked } })
        .then((result) => {
          window.open(result.pdf, "_blank", "noopener");
          toast(`Label bought${result.emailed ? ` and tracking emailed to ${o.contact.email}` : ""}`);
          return refresh();
        })
        .catch((error) => {
          buy.disabled = false;
          buy.textContent = "Buy label";
          showError(error.message);
        });
    }
    if (e.target.closest("[data-void-label]")) {
      if (!confirm(`Void the ${o.label.carrier} label ${o.label.trackingNumber}? The carrier refunds unused labels.`)) return;
      api(`/api/admin/orders/${o.number}/label/void`, { method: "POST", body: {} })
        .then(() => {
          toast("Label voided");
          return refresh();
        })
        .catch((error) => showError(error.message));
    }
  };

  drawer.onsubmit = (e) => {
    e.preventDefault();
    const f: any = e.target;
    if (f.matches("[data-refund]")) {
      const amount = f.amount.value.trim() === "" ? left : Number(f.amount.value.replace(/[^0-9.]/g, ""));
      if (!(amount > 0) || amount > left) return showError(`Refund between ${money(0.01)} and ${money(left)}.`, ["amount"]);
      return refund({ amount, reason: f.reason.value, notify: f.notify.checked }, `Refund ${money(amount)} to ${o.contact.name}'s card?`);
    }
    if (f.matches("[data-label]")) return getRates(f);
    if (f.matches("[data-tracking]")) {
      const body: any = { tracking: { carrier: f.carrier.value, number: f.number.value } };
      if (o.status !== "shipped" && body.tracking.number) body.status = "shipped";
      return save(body);
    }
    if (f.matches("[data-note]") && f.note.value.trim()) save({ note: f.note.value });
  };

  // Shipping label: bought automatically when the order is paid (Shippo); otherwise weight,
  // address, rates from every carrier, then buy.
  const labelBox = $("[data-label-form]", drawer);
  let rates = [];
  if (labelBox) {
    api(`/api/admin/orders/${o.number}/label-setup`)
      .then((setup) => {
        const t = setup.shipTo;
        const c = setup.courier;
        // Close enough for a courier: Uber Direct offered first, with its price and how far.
        const courierRow = c
          ? `<div class="label-courier">
              <span class="label-courier-name"><span class="courier-uber" role="img" aria-label="Uber Direct"></span><small>${esc(String(c.miles))} mi${c.fee != null ? ` · ${money(c.fee)}` : ""}</small></span>
              ${c.ready ? `<span class="label-courier-go">${c.phone ? "" : `<input type="tel" data-courier-phone placeholder="Phone for the courier" aria-label="Phone for the courier" autocomplete="tel">`}<button type="button" class="btn" data-courier="switch"${c.fee != null ? ` data-courier-fee="${c.fee}"` : ""}>Send With Uber Direct</button></span>` : `<small class="muted">Not set up yet</small>`}
            </div>`
          : "";
        // No labels here: it's shipped another way, so its tracking is what to enter.
        if (!setup.configured) {
          labelBox.innerHTML = courierRow;
          labelBox.hidden = !courierRow;
          const manual = $("details.manual-tracking", drawer) as HTMLDetailsElement;
          if (manual) {
            manual.open = true;
            manual.classList.add("is-only");
          }
          return;
        }
        $("[data-goto-label]", drawer)?.removeAttribute("hidden");
        labelBox.innerHTML = `${courierRow}
          <form class="label-form" data-label>
            <div class="label-address">
              <p>${esc(t.name)}<br>${esc(t.street1)}<br>${esc(t.city)}${t.state ? `, ${esc(t.state)}` : ""} ${esc(t.postalCode)}</p>
              <button type="button" class="link" data-edit-address>${t.state ? "Edit address" : "Add the state"}</button>
            </div>
            <div class="label-address-fields" data-address-fields ${t.state ? "hidden" : ""}>
              <input name="street1" value="${esc(t.street1)}" aria-label="Street" placeholder="Street">
              <div class="label-row-3">
                <input name="city" value="${esc(t.city)}" aria-label="City" placeholder="City">
                <input name="state" value="${esc(t.state)}" aria-label="State (2 letters)" placeholder="State" maxlength="2">
                <input name="postalCode" value="${esc(t.postalCode)}" aria-label="ZIP code" placeholder="ZIP">
              </div>
            </div>
            <div class="label-weight">
              <label class="field"><span>Weight (oz)</span><input name="weightOz" inputmode="decimal" value="${setup.weightOz || ""}"></label>
              <button type="submit" class="btn">Get rates</button>
            </div>
            <div data-rates></div>
            ${setup.test ? `<p class="muted">Test mode: labels are free and can't be used to ship.</p>` : ""}
          </form>`;
      })
      .catch((error) => (labelBox.innerHTML = `<p class="form-error">${esc(error.message)}</p>`));
  }
  const labelBody = (f) => ({
    weightOz: Number(String(f.weightOz.value).replace(/[^0-9.]/g, "")),
    shipTo: { street1: f.street1.value.trim(), city: f.city.value.trim(), state: f.state.value.trim().toUpperCase(), postalCode: f.postalCode.value.trim() },
  });
  const getRates = async (f) => {
    const box = $("[data-rates]", f);
    box.innerHTML = `<p class="muted">Getting rates…</p>`;
    showError("");
    try {
      ({ rates } = await api(`/api/admin/orders/${o.number}/rates`, { method: "POST", body: labelBody(f) }));
      box.innerHTML = `
        <fieldset class="rates">
          <legend class="sr-only">Shipping service</legend>
          ${rates
            .map(
              (r, i) => `<label class="rate"><input type="radio" name="rate" value="${i}" ${i === 0 ? "checked" : ""}><span><strong>${esc(r.serviceName)}</strong><small>${esc(r.carrierName)}</small></span><b class="num">${money(r.cost)}</b></label>`
            )
            .join("")}
        </fieldset>
        <div class="refund-foot">
          <label class="checkbox"><input type="checkbox" name="notify" checked> Email tracking to the customer</label>
          <button type="button" class="btn btn-primary" data-buy-label>Buy label</button>
        </div>`;
    } catch (error) {
      box.innerHTML = "";
      showError(error.message);
    }
  };

  // Where it's going, on a small map (not for an order picked up at the roastery), and where
  // it is now when the carrier says. A courier on the road is asked again every 30 seconds.
  if (o.shipTo || o.cafe?.address)
    api(`/api/admin/orders/${o.number}/where`)
      .then(({ point, live }) => {
        const box = $("[data-order-map]", drawer);
        if (!point || !box || !drawer.contains(box)) return;
        const map = drawOrderMap(box, point, live);
        if (live?.kind !== "courier") return;
        const timer = setInterval(async () => {
          if (!box.isConnected) return clearInterval(timer);
          try {
            const next = await api(`/api/admin/orders/${o.number}/where`);
            (await map)?.(next.live);
            if (next.live?.kind !== "courier") clearInterval(timer);
          } catch {
            /* try again next time */
          }
        }, 30e3);
      })
      .catch(() => {});
  if (o.square?.paymentId) {
    api(`/api/admin/orders/${o.number}/payment`)
      .then(({ payment: p, risk, note }) => {
        const box = $("[data-payment]", drawer);
        if (!box) return;
        // Order risk: Square's check and the card's ZIP and security code; the reasons under it.
        const riskBox = $("[data-risk]", drawer);
        if (risk && riskBox) {
          const words = { medium: "Check the details before you send it.", high: "Look closely before you send it; consider a refund." };
          riskBox.hidden = false;
          riskBox.innerHTML = `<h3>Order risk</h3>
            ${words[risk.level] ? `<p>${words[risk.level]}</p>` : ""}
            <div class="risk-meter is-${risk.level}" role="img" aria-label="${risk.level} risk">${["low", "medium", "high"].map((l) => `<span class="${l === risk.level ? "is-on" : ""}"><i></i>${l[0].toUpperCase()}${l.slice(1)}</span>`).join("")}</div>
            <ul class="risk-reasons">${risk.reasons.map((r) => `<li class="${r.tone ? `is-${r.tone}` : ""}">${esc(r.text)}</li>`).join("")}</ul>`;
        }
        box.innerHTML = p
          ? `<dl class="totals">
              <dt>Method</dt><dd>${esc(p.method)}${p.wallet ? ` (${esc(p.wallet.replace(/_/g, " "))})` : ""}</dd>
              <dt>${o.wholesale?.processing && o.payment !== "paid" ? "Clearing" : "Charged"}</dt><dd>${money(p.amount)}</dd>
              ${p.refunded ? `<dt>Refunded</dt><dd>−${money(p.refunded)}</dd>` : ""}
            </dl>
            <p class="pay-links">${p.receiptUrl ? `<a class="link" href="${esc(p.receiptUrl)}" target="_blank" rel="noopener">Receipt</a>` : ""}<a class="link" href="${esc(p.dashboardUrl)}" target="_blank" rel="noopener">Open in Square</a></p>`
          : `<p class="muted">${esc(note || "No card payment found.")}</p>`;
      })
      .catch((error) => {
        const box = $("[data-payment]", drawer);
        if (box) box.innerHTML = `<p class="form-error">${esc(error.message)}</p>`;
      });
  }
}

// Leaflet (vendored, as on the Contact page), loaded the first time a map is drawn.
let leaflet;
const loadLeaflet = () =>
  (leaflet ||= new Promise((resolve, reject) => {
    const css = document.createElement("link");
    css.rel = "stylesheet";
    css.href = "/js/vendor/leaflet-1.9.4.css";
    const js = document.createElement("script");
    js.src = "/js/vendor/leaflet-1.9.4.js";
    js.onload = () => resolve((window as any).L);
    js.onerror = () => {
      leaflet = null;
      reject(new Error("Map didn't load"));
    };
    document.head.append(css, js);
  }));

// Where the order is going: OpenStreetMap at street level with a pin. Drag to pan, zoom
// with the buttons, a double-click or a pinch; the target button recenters. Static tiles
// show first and stay if Leaflet fails to load. live: where it is now (a courier's GPS
// point, or a parcel's last scan town with its trail). Resolves to a function that moves it.
function drawOrderMap(box, [lat, lon], live = null) {
  const z = 15;
  const size = 256;
  const n = 2 ** z * size;
  const rad = (lat * Math.PI) / 180;
  const x = ((lon + 180) / 360) * n;
  const y = ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * n;
  box.hidden = false;
  const w = box.clientWidth || 320;
  const h = box.clientHeight || 150;
  const left = x - w / 2;
  const top = y - h / 2;
  const tiles = [];
  for (let tx = Math.floor(left / size); tx <= Math.floor((left + w) / size); tx++)
    for (let ty = Math.floor(top / size); ty <= Math.floor((top + h) / size); ty++)
      tiles.push(`<img src="https://tile.openstreetmap.org/${z}/${tx}/${ty}.png" alt="" style="left:${Math.round(tx * size - left)}px;top:${Math.round(ty * size - top)}px">`);
  const osm = `https://www.openstreetmap.org/?mlat=${lat}&amp;mlon=${lon}#map=17/${lat}/${lon}`;
  box.innerHTML = `<div class="order-map-static">${tiles.join("")}<span class="order-map-pin" aria-hidden="true"></span></div><small class="order-map-credit">© OpenStreetMap</small>`;

  return loadLeaflet()
    .then((L) => {
      if (!box.isConnected) return null;
      const frame = document.createElement("div");
      frame.className = "order-map-frame";
      box.replaceChildren(frame);
      box.insertAdjacentHTML(
        "beforeend",
        `<div class="order-map-tools">
          <button type="button" data-map-in aria-label="Zoom in">+</button>
          <button type="button" data-map-out aria-label="Zoom out">−</button>
          <button type="button" data-map-home aria-label="Recenter on the address"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="4.5"/><path d="M8 1v3M8 12v3M1 8h3M12 8h3"/></svg></button>
        </div>
        <a class="order-map-open" href="${osm}" target="_blank" rel="noopener">Open Map</a>
        <small class="order-map-credit">© OpenStreetMap</small>`
      );
      const map = L.map(frame, { zoomControl: false, attributionControl: false, scrollWheelZoom: false, minZoom: 3, maxZoom: 19 });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      L.marker([lat, lon], {
        icon: L.divIcon({ className: "order-map-marker", html: `<span class="order-map-pin"></span>`, iconSize: [18, 18], iconAnchor: [9, 9] }),
        keyboard: false,
      }).addTo(map);
      // Where it is now: a dark dot (a van for a courier), a dashed trail through a parcel's
      // scan towns, and a caption saying what the carrier last said.
      let now = null;
      let trail = null;
      const caption = document.createElement("p");
      caption.className = "order-map-live";
      box.append(caption);
      const showLive = (l) => {
        now?.remove();
        trail?.remove();
        now = trail = null;
        caption.hidden = !l;
        box.classList.toggle("has-live", Boolean(l));
        if (!l) return;
        const path = [...(l.kind === "parcel" ? l.trail || [] : []), l.point, [lat, lon]];
        trail = L.polyline(path, { className: "order-map-trail", interactive: false }).addTo(map);
        now = L.marker(l.point, {
          icon: L.divIcon({ className: "order-map-marker", html: `<span class="order-map-now is-${l.kind}"></span>`, iconSize: [16, 16], iconAnchor: [8, 8] }),
          keyboard: false,
          zIndexOffset: 500,
        }).addTo(map);
        const who = l.kind === "courier" ? `${esc(l.name)} · ${esc(l.status || "On the way")}` : `${esc(l.place || "Last scan")}${l.status ? ` · ${esc(l.status)}` : ""}`;
        const when = [l.at ? ago(l.at) : "", l.eta ? `Due ${esc(date(l.eta))}` : ""].filter(Boolean).join(" · ");
        caption.innerHTML = `<span class="order-map-dot is-${l.kind}" aria-hidden="true"></span><span><strong>${who}</strong>${when ? `<small>${when}</small>` : ""}</span>`;
      };
      const home = (animate) => {
        if (!now) return map.setView([lat, lon], 15, { animate });
        map.fitBounds(L.latLngBounds([[lat, lon], live.point, ...(live.kind === "parcel" ? live.trail || [] : [])]), { paddingTopLeft: [36, 84], paddingBottomRight: [56, 48], maxZoom: 15, animate });
      };
      showLive(live);
      home(false);
      const zin = $("[data-map-in]", box);
      const zout = $("[data-map-out]", box);
      zin.addEventListener("click", () => map.zoomIn());
      zout.addEventListener("click", () => map.zoomOut());
      $("[data-map-home]", box).addEventListener("click", () => home(true));
      const sync = () => {
        zin.disabled = map.getZoom() >= map.getMaxZoom();
        zout.disabled = map.getZoom() <= map.getMinZoom();
      };
      map.on("zoomend", sync);
      sync();
      frame.setAttribute("aria-label", "Map of the delivery address");
      // The order page reflows (assistant panel, window size); keep the tiles filling the box.
      new ResizeObserver(() => map.invalidateSize()).observe(box);
      return (next) => {
        live = next;
        showLive(next);
        if (next) home(true);
      };
    })
    .catch(() => null);
}

/* ── Packing slips ── */

const cafeWhere = (o) =>
  o.cafe
    ? `${esc(o.cafe.when)} · ${esc(o.cafe.locationName)}${o.cafe.address ? `<br>→ ${esc(o.cafe.address.street)}, ${esc(o.cafe.address.city)} ${esc(o.cafe.address.postcode)}` : ""}`
    : "";

const slipTable = (lines, isGift) =>
  lines.length
    ? `<table>
        <thead><tr><th class="tick"></th><th>Qty</th><th>Item</th>${isGift ? "" : `<th class="num">Price</th>`}</tr></thead>
        <tbody>
          ${lines.map((l) => `<tr><td class="tick"><span></span></td><td>${l.qty}</td><td><strong>${esc(l.title)}</strong>${l.variant ? `<br><small>${esc(l.variant)}</small>` : ""}${l.roastedOn ? `<br><small>Roasted ${esc(dayName(l.roastedOn, { month: "short", day: "numeric" }))}</small>` : ""}</td>${isGift ? "" : `<td class="num">${money(l.price * l.qty)}</td>`}</tr>`).join("")}
        </tbody>
      </table>`
    : "";

async function printSlips(numbers) {
  if (!numbers.length) return;
  const orders = [];
  for (const n of numbers) {
    try {
      orders.push((await api(`/api/admin/orders/${n}`)).order);
    } catch {
      /* skip any that fail */
    }
  }
  $("[data-slips]").innerHTML = orders
    .map((o) => {
      const gifts = o.lines.filter((l) => l.note);
      const isGift = o.lines.some((l) => l.gift);
      return `
      <article class="slip">
        <header>
          <span class="slip-logo">${LOGO}</span>
          <div class="slip-shop"><strong>${esc(state.shop.name || "Mimi Food")}</strong><br>${esc(state.shop.email || "")}</div>
        </header>
        <div class="slip-meta">
          <div><p class="eyebrow">Packing slip</p><h1>${esc(o.number)}</h1><p>${esc(day(o.placedAt))}</p></div>
          <div><p class="eyebrow">${o.shipTo ? "Ship to" : o.fulfilment ? "Collect" : `Café ${esc(o.cafe?.mode || "")}`}</p><p>${o.fulfilment ? addressLines(o).map(esc).join("<br>") : cafeWhere(o)}</p></div>
        </div>
        ${slipTable(o.lines.filter((l) => l.kind !== "pickup"), isGift)}
        ${
          o.cafe && o.fulfilment
            ? `<div class="slip-cafe"><p class="eyebrow">Café ${esc(o.cafe.mode)}, made fresh: ${cafeWhere(o)}</p>${slipTable(o.lines.filter((l) => l.kind === "pickup"), isGift)}</div>`
            : slipTable(o.lines.filter((l) => l.kind === "pickup"), isGift)
        }
        ${isGift ? "" : `<p class="slip-total">Total ${money(o.total)}${o.payment === "paid" ? " · Paid" : ""}</p>`}
        ${o.notes ? `<p class="slip-notes"><span class="eyebrow">Notes</span>${esc(o.notes)}</p>` : ""}
        ${gifts.map((l) => `<div class="slip-gift"><p class="eyebrow">Gift message${l.title.includes("gift for") ? ` · for ${esc(l.title.split("gift for ").pop())}` : ""}</p><p>“${esc(l.note)}”</p></div>`).join("")}
        <footer>Thank you for drinking Mimi Food. Questions about your order? ${esc(state.shop.email || "")}</footer>
      </article>`;
    })
    .join("");
  setTimeout(() => window.print(), 50);
}

/* ── Bills ── */

// A bill's tag: Paid, Overdue (red), Due Today (orange), else To Pay (plain).
const billBadge = (b) =>
  b.status === "paid" ? `<span class="badge t-green"><i></i>Paid</span>` : b.overdue ? `<span class="badge t-red"><i></i>Overdue</span>` : b.due && b.due === (state.bills?.today || isoDay(new Date())) ? `<span class="badge t-orange"><i></i>Due Today</span>` : `<span class="badge"><i></i>To Pay</span>`;
// What a bill's purchase order says about it: a different total, or already paid by other bills.
function billVsPo(b) {
  const po = b.poNumber && state.trade?.purchaseOrders.find((p) => p.number === b.poNumber);
  if (!po) return [];
  const total = Number(b.total) || 0;
  const others = (state.bills?.bills || []).filter((x) => x.poNumber === po.number && x.id !== b.id);
  const paidByOthers = others.filter((x) => x.status === "paid").reduce((n, x) => n + x.total, 0);
  const warn = [];
  if (!others.length && Math.abs(total - po.total) >= 0.005) warn.push(`This bill is ${money(total)}; ${po.number} is ${money(po.total)}.`);
  if (paidByOthers >= po.total - 0.005 && po.total > 0) warn.push(`${po.number} is already paid in full by ${others.filter((x) => x.status === "paid").map((x) => (x.number ? `bill ${x.number}` : "another bill")).join(", ")}.`);
  return warn;
}
const shortDay = (d) => (d ? dayName(d, { month: "short", day: "numeric" }) : "—");

// Coming due: not late yet, due within the next week.
const billSoon = (b) => b.status === "unpaid" && !b.overdue && Boolean(b.due) && b.due <= addDays(isoDay(new Date()), 7);
function billChips() {
  const v = state.bills;
  if (!v) return "";
  const f = state.billFilter || "unpaid";
  const unpaid = v.bills.filter((b) => b.status === "unpaid");
  return chips("Bills", [
    { filter: "bills:unpaid", label: "To pay", count: unpaid.length, on: f === "unpaid" },
    { filter: "bills:overdue", label: "Overdue", count: unpaid.filter((b) => b.overdue).length, tone: "t-red", on: f === "overdue" },
    { filter: "bills:soon", label: "Coming Due", count: unpaid.filter(billSoon).length, tone: "t-yellow", on: f === "soon" },
    { filter: "bills:paid", label: "Paid", count: v.bills.length - unpaid.length, on: f === "paid" },
  ]);
}

function billsTable() {
  const v = state.bills;
  if (!v) return `<p class="muted">Loading…</p>`;
  const f = state.billFilter || "unpaid";
  const found = (b) => matches(state.query, b.supplierName, b.number, b.poNumber);
  const unpaid = v.bills.filter((b) => b.status === "unpaid" && found(b)).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const shown = f === "paid" ? v.bills.filter((b) => b.status === "paid" && found(b)) : f === "overdue" ? unpaid.filter((b) => b.overdue) : f === "soon" ? unpaid.filter(billSoon) : unpaid;
  return `${
    shown.length
      ? `<table class="table is-labelled">
          <thead><tr><th>Bill</th><th>Order</th><th>Due</th><th class="num">Amount</th><th>Status</th></tr></thead>
          <tbody>${shown
            .map(
              (b) => `<tr class="clickable" data-bill="${esc(b.id)}">
                <td>${who(b.supplierName, b.number ? `No. ${esc(b.number)}` : "")}</td>
                <td>${b.poNumber ? `<span class="code">${esc(b.poNumber)}</span>${billVsPo(b).length ? `<small class="is-warn">${billVsPo(b).some((w) => w.includes("already paid")) ? "PO already paid" : "Differs from the PO"}</small>` : ""}` : `<span class="muted">—</span>`}</td>
                <td><span class="${b.overdue ? "td-due is-late" : ""}">${esc(shortDay(b.due))}</span></td>
                <td class="num"><strong>${money(b.total)}</strong></td>
                <td>${billBadge(b)}</td>
              </tr>`
            )
            .join("")}</tbody></table>`
      : `<div class="empty empty-lg">${icon("file", "i i-xl")}<p><strong>${{ paid: "Nothing paid yet", overdue: "Nothing overdue", soon: "Nothing due this week" }[f] || "No bills to pay"}</strong></p>${f !== "unpaid" ? "" : `<div class="btn-row"><button type="button" class="btn btn-primary" data-bill-new>${icon("plus")}<span>New Bill</span></button><button type="button" class="btn" data-goto-imports>${icon("upload")}<span>Import One</span></button></div>`}</div>`
  }`;
}

// A bill: who, which order, how much and when it's due; paid or not.
function billPanel(id = null, preset: any = {}) {
  const t = state.trade;
  const b = id ? state.bills.bills.find((x) => x.id === id) : null;
  if (id && !b) return;
  const v: any = b || { supplierId: "", poNumber: "", number: "", total: "", date: isoDay(new Date()), due: "", notes: "", lines: [], ...preset };
  const poOptions = (sid, sel) => `<option value="">None</option>${t.purchaseOrders.filter((p) => p.supplierId === sid).map((p) => `<option value="${p.number}" ${p.number === sel ? "selected" : ""}>${esc(p.number)} · ${money(p.total)}</option>`).join("")}`;
  const drawer = openPanel(
    b ? "Bill" : "New Bill",
    `<form class="form-stack" id="bill-form" data-bill-form>
      <div class="form-row-2">
        <label class="field"><span>Supplier</span><select name="supplierId" required><option value="">Choose…</option>${t.suppliers.filter((s) => !s.archivedAt || s.id === v.supplierId).map((s) => `<option value="${s.id}" ${s.id === v.supplierId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
        <label class="field"><span>Purchase order</span><select name="poNumber">${poOptions(v.supplierId, v.poNumber)}</select></label>
        <label class="field"><span>Bill number</span><input name="number" value="${esc(v.number)}"></label>
        <label class="field"><span>Amount</span><input name="total" inputmode="decimal" required value="${esc(v.total)}"></label>
        <label class="field"><span>Dated</span><input type="date" name="date" value="${esc(v.date)}"></label>
        <label class="field"><span>Due</span><input type="date" name="due" value="${esc(v.due)}"></label>
      </div>
      <div data-bill-warn></div>
      ${v.lines?.length ? `<table class="table mini-table"><tbody>${v.lines.map((l) => `<tr><td>${esc(l.description)}</td><td class="num">${l.qty} ${esc(l.unit)}</td><td class="num">${money(l.qty * l.unitCost)}</td></tr>`).join("")}</tbody></table>` : ""}
      <label class="field"><span>Notes</span><textarea name="notes" rows="2">${esc(v.notes || "")}</textarea></label>
    </form>`,
    b
      ? {
          // An existing bill opens beside the list; paying it is its one main action.
          page: "Bills",
          badges: billBadge(b),
          subtitle: [b.supplierName, b.paidAt ? `Paid ${dayShort(b.paidAt)}` : b.due ? `Due ${shortDay(b.due)}` : ""].filter(Boolean).join(" · "),
          actions: `${b.status === "paid" ? "" : `<a class="btn" href="https://app.squareup.com/dashboard" target="_blank" rel="noopener" data-tip="Banking › Bill Pay in the Square Dashboard">${icon("ext")}<span>Pay in Square</span></a>`}<button type="button" class="btn${b.status === "paid" ? "" : " btn-primary"}" data-bill-pay="${b.status === "paid" ? "unpaid" : "paid"}">${b.status === "paid" ? "Mark Not Paid" : "Mark Paid"}</button>`,
          footer: `<div class="modal-foot-side"><button type="button" class="btn btn-ghost" data-bill-delete>Delete</button></div><div class="modal-foot-side"><button type="submit" form="bill-form" class="btn">Save</button></div>`,
        }
      : { modal: true, footer: `<div class="modal-foot-side"></div><div class="modal-foot-side"><button type="submit" form="bill-form" class="btn btn-primary">Add Bill</button></div>` }
  );
  if (b) drawer.classList.add("has-foot");
  const form = $("[data-bill-form]", drawer);
  // Against its purchase order: a different total, or a PO that other bills already paid.
  const warn = () => {
    const w = billVsPo({ ...(b || {}), id: b?.id || "", poNumber: form.poNumber.value, total: form.total.value });
    $("[data-bill-warn]", form).innerHTML = w.map((x) => `<p class="notice notice-warn">${icon("syncError")}<span>${esc(x)}</span></p>`).join("");
  };
  warn();
  form.addEventListener("input", warn);
  drawer.onchange = (e) => {
    if (e.target === form.supplierId) form.poNumber.innerHTML = poOptions(form.supplierId.value, "");
    warn();
  };
  const done = async (r, msg) => {
    state.bills = r;
    state.trade = await api("/api/admin/trade").catch(() => state.trade);
    render();
    closeDrawer();
    toast(msg);
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const body = { supplierId: form.supplierId.value, poNumber: form.poNumber.value, number: form.number.value, total: form.total.value, date: form.date.value, due: form.due.value, notes: form.notes.value };
    try {
      await done(await api(b ? `/api/admin/bills/${b.id}` : "/api/admin/bills", { method: b ? "PATCH" : "POST", body }), b ? "Saved." : "Bill added.");
    } catch (error) {
      panelError(error.message);
    }
  };
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const pay = e.target.closest("[data-bill-pay]");
    const del = e.target.closest("[data-bill-delete]");
    if (!pay && !(del && confirm("Delete this bill?"))) return;
    try {
      if (pay) await done(await api(`/api/admin/bills/${b.id}`, { method: "PATCH", body: { action: pay.dataset.billPay } }), pay.dataset.billPay === "paid" ? "Marked paid." : "Marked not paid.");
      else await done(await api(`/api/admin/bills/${b.id}`, { method: "DELETE" }), "Deleted.");
    } catch (error) {
      panelError(error.message);
    }
  };
}

/* ── Imports ── */

const IMPORT_KIND = { order: ["Wholesale order", "wholesale"], bill: ["Bill", "file"], offer: ["Offer sheet", "roasting"], other: ["Not recognized", "file"] };
let importFile = null; // { name, type, data } chosen, not yet read

function importsView() {
  const v = state.imports;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const f = state.importFilter || "open";
  const groups = { open: v.imports.filter((x) => x.status === "open"), done: v.imports.filter((x) => x.status === "done"), dismissed: v.imports.filter((x) => x.status === "dismissed") };
  const shown = groups[f] || groups.open;
  // Peasy's: the imports on the left; on the right, a box to drop or pick a file, a box to paste
  // into, and the record type to make, which reads it.
  const list = shown.length
    ? `<ul class="td-list ob-list">${shown
        .map((x) => {
          const [label, ic] = IMPORT_KIND[x.kind] || IMPORT_KIND.other;
          return `<li class="td-row ob-row" data-import="${esc(x.id)}">
            <span class="todo-icon" aria-hidden="true">${icon(ic)}</span>
            <span class="td-main"><strong>${esc(x.summary || label)}</strong><small>${esc(label)} · ${esc(x.name)}${x.by ? ` · ${esc(x.by)}` : ""}</small></span>
            <span class="ob-side">${x.result ? `<span class="badge t-green"><i></i>${esc(x.result.label)}</span>` : ""}<small class="muted">${esc(ago(x.at))}</small></span>
          </li>`;
        })
        .join("")}</ul>`
    : `<p class="muted im-none">${{ open: "No items to review.", done: "Nothing imported yet.", dismissed: "Nothing dismissed." }[f]}</p>`;
  return `
    ${chips("Imports", [
      { filter: "imports:open", label: "To check", count: groups.open.length, on: f === "open" },
      { filter: "imports:done", label: "Done", count: groups.done.length, on: f === "done" },
      { filter: "imports:dismissed", label: "Dismissed", count: groups.dismissed.length, on: f === "dismissed" },
    ])}
    <div class="im-split">
      <section class="card im-side">${list}${v.address ? `<div class="im-forward"><small>Email documents here and they're read for you.</small><button type="button" class="btn btn-sm" data-copy-text="${esc(v.address)}" data-tip="Copy">${icon("copy")}<span>${esc(v.address)}</span></button></div>` : ""}</section>
      <form class="im-work" id="im-form" data-im-form data-im-drop>
        <label class="im-dropzone${importFile ? " has-file" : ""}">
          ${icon("upload", "i")}
          <strong>${importFile ? esc(importFile.name) : "Drag and drop here or click to upload"}</strong>
          <small>${importFile ? "Ready to read." : "PDFs, photos, CSV and text files, up to 15 MB each"}</small>
          <input type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.txt,.csv,.eml,.html" hidden>
        </label>
        ${importFile ? `<button type="button" class="btn btn-ghost btn-sm im-unfile" data-im-unfile>${icon("close")}<span>Remove File</span></button>` : ""}
        <textarea name="text" rows="6" placeholder="Type or paste any text here to read…" aria-label="Paste text">${esc(state.importText || "")}</textarea>
      </form>
      <section class="card im-types">
        <p class="im-types-head">Choose a record type to continue</p>
        ${[["order", "Wholesale orders", "Orders from wholesale accounts", "wholesale"], ["bill", "Bills", "Invoices or bills from suppliers", "receipt"], ["offer", "Offer sheets", "Products on offer from suppliers", "purchasing"]]
          .map(([k, label, what, ic]) => `<button type="submit" form="im-form" name="kind" value="${k}" class="im-type" ${v.reading ? "" : "disabled"}><span class="todo-icon" aria-hidden="true">${icon(ic)}</span><span><strong>${label}</strong><small>${what}</small></span></button>`)
          .join("")}
        ${v.reading ? "" : `<p class="muted im-off">Reading documents isn't connected yet.</p>`}
      </section>
    </div>`;
}

const readFileB64 = (file) =>
  new Promise<string>((ok, fail) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(",")[1] || "");
    r.onerror = () => fail(new Error("That file couldn't be opened."));
    r.readAsDataURL(file);
  });
async function pickImportFile(file) {
  if (!file) return;
  if (file.size > 15e6) return toast("That file is too big. Use one under 15 MB.", "error");
  importFile = { name: file.name, type: file.type, data: await readFileB64(file) };
  state.importText = $("[data-im-form] [name=text]")?.value || "";
  render();
}

async function importsClick(t) {
  if (t.closest("[data-im-unfile]")) {
    importFile = null;
    state.importText = $("[data-im-form] [name=text]")?.value || "";
    return render(), true;
  }
  const row = t.closest("[data-import]");
  if (row) return importPanel(row.dataset.import), true;
  return false;
}
document.addEventListener("change", (e) => {
  const input = e.target as HTMLInputElement;
  if (input.matches?.("[data-im-form] [name=file]")) pickImportFile(input.files[0]);
});
document.addEventListener("dragover", (e) => {
  if ((e.target as HTMLElement).closest?.("[data-im-drop]")) e.preventDefault();
});
document.addEventListener("drop", (e) => {
  if (!(e.target as HTMLElement).closest?.("[data-im-drop]")) return;
  e.preventDefault();
  pickImportFile(e.dataTransfer.files[0]);
});
document.addEventListener("submit", async (e) => {
  const form = e.target as HTMLFormElement;
  if (!form.matches?.("[data-im-form]")) return;
  e.preventDefault();
  const text = (form.elements.namedItem("text") as HTMLTextAreaElement).value.trim();
  if (!text && !importFile) return toast("Paste some text or choose a file.", "error");
  const button = ((e as SubmitEvent).submitter as HTMLButtonElement) || $("button[type=submit]", form);
  const kind = button?.value || "";
  const was = button.querySelector("strong")?.textContent || "";
  button.disabled = true;
  if (button.querySelector("strong")) button.querySelector("strong").textContent = "Reading…";
  try {
    const r = await api("/api/admin/imports", { method: "POST", body: { text, kind, ...(importFile || {}) } });
    importFile = null;
    state.importText = "";
    state.imports = r;
    state.importFilter = "open";
    render();
    importPanel(r.id);
  } catch (error) {
    button.disabled = false;
    if (button.querySelector("strong")) button.querySelector("strong").textContent = was;
    toast(error.message, "error");
  }
});

// Marks the import done with what it made, and refreshes the list.
async function importDone(id, result) {
  state.imports = await api(`/api/admin/imports/${id}`, { method: "PATCH", body: { action: "done", result } });
  if (state.page === "imports") render();
}

// One import: the draft to check, ready to make into an order, a bill or green coffee.
async function importPanel(id) {
  const x = state.imports?.imports.find((y) => y.id === id);
  if (!x) return;
  const t = state.trade;
  const g = state.green;
  const [label] = IMPORT_KIND[x.kind] || IMPORT_KIND.other;
  const open = x.status === "open";
  let body = "";
  let make = "";
  if (x.kind === "order" && t) {
    const o = x.order;
    const accounts = t.accounts.filter((a) => !a.archivedAt);
    const teas = t.teas || [];
    const options = (sel) => `<option value="">Choose…</option><optgroup label="Coffee">${t.products.map((p) => `<option value="${p.id}" ${p.id === sel ? "selected" : ""}>${esc(p.name)}</option>`).join("")}</optgroup>${teas.length ? `<optgroup label="Tea">${teas.map((y) => `<option value="${y.id}" ${y.id === sel ? "selected" : ""}>${esc(y.name)}</option>`).join("")}</optgroup>` : ""}`;
    const sizes = (id, sel) => (teas.some((y) => y.id === id) ? [["tin", "Pack"], ["1kg", "1 kg loose"]] : [["5lb", "5 lb"], ["250g", "250g bag"]]).map(([k, n]) => `<option value="${k}" ${k === sel ? "selected" : ""}>${n}</option>`).join("");
    body = `<form class="form-stack" data-im-order>
      ${o.accountId ? "" : `<p class="notice">${icon("syncError")}<span>No account matches ${esc(o.business || o.email || "them")}.${open ? ` <button type="button" class="btn btn-sm" data-im-new-account>New Account</button>` : ""}</span></p>`}
      <label class="field"><span>Account</span><select name="accountId"><option value="">Choose…</option>${accounts.map((a) => `<option value="${a.id}" ${a.id === o.accountId ? "selected" : ""}>${esc(a.business)}</option>`).join("")}</select></label>
      <div class="field"><span>Items</span><div class="lines-editor">${o.items
        .map((i) => `<div class="line-row im-line" data-line><select name="product" aria-label="Item">${options(i.product)}</select><select name="size" aria-label="Size">${sizes(i.product, i.size)}</select><input name="qty" inputmode="numeric" value="${i.qty}" aria-label="Quantity"><small class="im-written">${esc(i.asWritten)}</small></div>`)
        .join("")}</div></div>
      <div class="form-row-2">
        <label class="field"><span>Delivery</span><select name="fulfilment"><option value="Delivery">Ship to the account address</option><option value="Pickup" ${o.pickup ? "selected" : ""}>Pickup at our office</option></select></label>
        <label class="field"><span>Their PO number</span><input name="poRef" value="${esc(o.poRef)}"></label>
      </div>
      <label class="field"><span>Notes</span><textarea name="notes" rows="2">${esc(o.notes)}</textarea></label>
    </form>`;
    make = `<button type="button" class="btn btn-primary" data-im-make>Create Order</button>`;
  } else if (x.kind === "bill" && t) {
    const b = x.bill;
    const pos = (sid) => t.purchaseOrders.filter((p) => !sid || p.supplierId === sid);
    const po = t.purchaseOrders.find((p) => p.number === b.poNumber);
    const diff = (l) => {
      const want = po && l.poLine >= 0 ? po.items[l.poLine] : null;
      if (!want) return po ? `<span class="badge t-orange"><i></i>Not on the order</span>` : "";
      const notes = [l.qty !== want.qty && `ordered ${want.qty}`, Math.abs(l.unitCost - want.unitCost) >= 0.01 && `at ${money(want.unitCost)}`].filter(Boolean);
      return notes.length ? `<span class="badge t-orange"><i></i>${esc(notes.join(", "))}</span>` : `<span class="badge t-green"><i></i>Matches</span>`;
    };
    const sum = b.lines.reduce((n, l) => n + l.qty * l.unitCost, 0);
    body = `<form class="form-stack" data-im-bill>
      <div class="form-row-2">
        <label class="field"><span>Supplier</span><select name="supplierId"><option value="">Choose…</option>${t.suppliers.filter((s) => !s.archivedAt).map((s) => `<option value="${s.id}" ${s.id === b.supplierId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
        <label class="field"><span>Purchase order</span><select name="poNumber"><option value="">None</option>${pos(b.supplierId).map((p) => `<option value="${p.number}" ${p.number === b.poNumber ? "selected" : ""}>${esc(p.number)} · ${money(p.total)}</option>`).join("")}</select></label>
        <label class="field"><span>Bill number</span><input name="number" value="${esc(b.number)}"></label>
        <label class="field"><span>Total</span><input name="total" inputmode="decimal" value="${b.total || ""}"></label>
        <label class="field"><span>Dated</span><input type="date" name="date" value="${esc(b.date)}"></label>
        <label class="field"><span>Due</span><input type="date" name="due" value="${esc(b.due)}"></label>
      </div>
      ${b.supplierId ? "" : `<p class="notice">${icon("syncError")}<span>No supplier matches ${esc(b.supplierName || "this bill")}.</span></p>`}
      ${
        b.lines.length
          ? `<table class="table im-bill-lines"><thead><tr><th>Item</th><th class="num">Qty</th><th class="num">Each</th><th class="num">Amount</th><th>${po ? `Against ${esc(po.number)}` : ""}</th></tr></thead><tbody>${b.lines
              .map((l) => `<tr><td>${esc(l.description)}</td><td class="num">${l.qty} ${esc(l.unit)}</td><td class="num">${money(l.unitCost)}</td><td class="num">${money(l.qty * l.unitCost)}</td><td>${diff(l)}</td></tr>`)
              .join("")}</tbody></table>
            ${po && Math.abs(po.total - b.total) >= 0.01 ? `<p class="notice">${icon("syncError")}<span>The bill is ${money(b.total)}; ${esc(po.number)} came to ${money(po.total)}.${Math.abs(sum - b.total) >= 0.01 ? ` Its lines add up to ${money(sum)}.` : ""}</span></p>` : ""}`
          : ""
      }
    </form>`;
    make = `<button type="button" class="btn btn-primary" data-im-make>Save Bill</button>`;
  } else if (x.kind === "offer" && g && t) {
    const f = x.offer;
    body = `<form class="form-stack" data-im-offer>
      <label class="field"><span>Supplier</span><select name="supplierId"><option value="">Choose…</option>${t.suppliers.filter((s) => !s.archivedAt).map((s) => `<option value="${s.id}" ${s.id === f.supplierId ? "selected" : ""}>${esc(s.name)}</option>`).join("")}</select></label>
      <table class="table im-offer"><thead><tr><th><span class="sr-only">Pick</span></th><th>Coffee</th><th class="num">Per kg</th><th>Bag</th><th>Lot</th><th></th></tr></thead><tbody>${f.coffees
        .map((c, i) => {
          const have = g.items.find((y) => y.id === c.greenId);
          const change = have && Math.abs(have.unitCost - c.pricePerKg) >= 0.01;
          return `<tr><td><input type="checkbox" name="pick" value="${i}" ${!have || change ? "checked" : ""} aria-label="${esc(c.name)}"></td>
            <td><strong>${esc(c.name)}</strong><small class="muted">${esc([c.origin, c.process].filter(Boolean).join(" · "))}</small></td>
            <td class="num">${c.pricePerKg ? money(c.pricePerKg) : "—"}${change ? `<small class="muted">now ${money(have.unitCost)}</small>` : ""}</td>
            <td>${c.bagKg ? `${c.bagKg} kg` : "—"}</td><td>${esc(c.lotCode || "—")}</td>
            <td>${have ? `<span class="badge ${change ? "t-orange" : "t-green"}"><i></i>${change ? "New price" : "Same price"}</span>` : `<span class="badge t-blue"><i></i>New coffee</span>`}</td></tr>`;
        })
        .join("")}</tbody></table>
    </form>`;
    make = `<button type="button" class="btn btn-primary" data-im-make>Add Picked</button>`;
  } else if (x.kind !== "other") {
    body = `<p class="muted">You need Wholesale or Green Coffee to finish this one.</p>`;
  } else {
    body = `<p class="muted">This doesn't look like an order, a bill or an offer sheet.</p>`;
  }
  const actions = open ? `<button type="button" class="btn btn-ghost" data-im-dismiss>Dismiss</button>${make}` : `<button type="button" class="btn" data-im-reopen>Reopen</button>`;
  const drawer = openPanel(label, `${x.summary ? `<p class="im-summary">${esc(x.summary)}</p>` : ""}${x.result ? `<p class="notice">${icon("synced")}<span>Made ${esc(x.result.label)}.</span></p>` : ""}<section class="panel">${body}</section>${x.excerpt ? `<section class="panel"><h3 class="panel-title">What was pasted</h3><pre class="ob-text">${esc(x.excerpt)}</pre></section>` : ""}`, { page: "Imports", actions, subtitle: `${x.name} · ${ago(x.at)}` });
  drawer.onchange = (e) => {
    const el = e.target;
    if (el.name === "product") {
      const teas = t.teas || [];
      el.closest("[data-line]").querySelector("[name=size]").innerHTML = (teas.some((y) => y.id === el.value) ? [["tin", "Pack"], ["1kg", "1 kg loose"]] : [["5lb", "5 lb"], ["250g", "250g bag"]]).map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
    }
    if (el.name === "supplierId" && el.form?.matches("[data-im-bill]")) {
      el.form.poNumber.innerHTML = `<option value="">None</option>${t.purchaseOrders.filter((p) => p.supplierId === el.value).map((p) => `<option value="${p.number}">${esc(p.number)} · ${money(p.total)}</option>`).join("")}`;
    }
  };
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    if (e.target.closest("[data-im-new-account]")) return accountForm(null, { business: x.order.business, email: x.order.email });
    const b = e.target.closest("[data-im-dismiss], [data-im-reopen], [data-im-make]");
    if (!b) return;
    b.disabled = true;
    try {
      if (b.matches("[data-im-dismiss], [data-im-reopen]")) {
        state.imports = await api(`/api/admin/imports/${id}`, { method: "PATCH", body: { action: b.matches("[data-im-dismiss]") ? "dismiss" : "reopen" } });
        render();
        if (b.matches("[data-im-dismiss]")) closeDrawer();
        else importPanel(id);
        return;
      }
      if (x.kind === "order") {
        const f = $("[data-im-order]", drawer);
        const lines = $$("[data-line]", f).map((row) => ({ product: $("[name=product]", row).value, size: $("[name=size]", row).value, qty: $("[name=qty]", row).value })).filter((l) => l.product);
        const r = await api("/api/admin/wholesale-orders", { method: "POST", body: { accountId: f.accountId.value, lines, fulfilment: f.fulfilment.value, poRef: f.poRef.value, notes: f.notes.value, invoice: false } });
        await importDone(id, { type: "order", ref: r.order.number, label: `Order ${r.order.number}` });
        closeDrawer();
        toast(`Order ${r.order.number} created.`);
      } else if (x.kind === "bill") {
        const f = $("[data-im-bill]", drawer);
        state.bills = await api("/api/admin/bills", { method: "POST", body: { supplierId: f.supplierId.value, poNumber: f.poNumber.value, number: f.number.value, total: f.total.value, date: f.date.value, due: f.due.value, lines: x.bill.lines, importId: id } });
        state.imports = await api("/api/admin/imports");
        render();
        closeDrawer();
        toast("Bill saved.");
      } else if (x.kind === "offer") {
        const f = $("[data-im-offer]", drawer);
        const picked = $$("[name=pick]:checked", f).map((c) => x.offer.coffees[Number(c.value)]);
        if (!picked.length) throw new Error("Pick at least one coffee.");
        let added = 0;
        let priced = 0;
        for (const c of picked) {
          if (c.greenId) {
            state.green = await api(`/api/admin/green/items/${c.greenId}`, { method: "PATCH", body: { unitCost: c.pricePerKg, ...(c.lotCode && { lotCode: c.lotCode }), ...(c.bagKg && { bagKg: c.bagKg }), note: "From an offer sheet" } });
            priced++;
          } else {
            state.green = await api("/api/admin/green/items", { method: "POST", body: { name: c.name, origin: [c.origin, c.process].filter(Boolean).join(" · "), supplierId: f.supplierId.value || null, unitCost: c.pricePerKg, onHand: 0, bagKg: c.bagKg || null, lotCode: c.lotCode, notes: c.notes } });
            added++;
          }
        }
        const what = [added && `${added} added`, priced && `${priced} repriced`].filter(Boolean).join(", ");
        await importDone(id, { type: "green", ref: "", label: `Green coffee: ${what}` });
        closeDrawer();
        toast(`Green coffee: ${what}.`);
      }
    } catch (error) {
      b.disabled = false;
      panelError(error.message);
    }
  };
}

/* ── Outbox ── */

const MAIL_KIND = { orders: "Orders", wholesale: "Wholesale", account: "Accounts", newsletter: "Newsletter", automations: "Automated", inbox: "Inbox" };
const mailBadge = (m) =>
  m.status === "failed"
    ? m.resent ? `<span class="badge"><i></i>Tried again</span>` : `<span class="badge t-red"><i></i>Didn't send</span>`
    : m.status === "sending"
      ? `<span class="badge t-blue"><i></i>Sending</span>`
      : `<span class="badge t-green"><i></i>Sent</span>`;

const outboxMail = (v) => v.mail.filter((m) => m.kind !== "inbox" || m.status === "failed");
function outboxHeadFilters() {
  const v = state.outbox;
  if (!v) return "";
  const waiting = v.mail.filter((m) => m.status === "failed" && !m.resent).length;
  return chips("Outbox", [
    { href: "#outbox", label: "All", count: outboxMail(v).length, on: state.sub !== "failed" },
    { href: "#outbox/failed", label: "Didn't send", count: waiting, tone: "t-red", on: state.sub === "failed" },
  ]);
}

function outboxView() {
  const v = state.outbox;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const f = state.sub === "failed" ? "failed" : "all";
  const kind = state.mailKind || "";
  const q = state.query.trim().toLowerCase();
  // A reply written in the Inbox lives in its conversation; it shows here only if it didn't go.
  const mail = outboxMail(v);
  const failed = mail.filter((m) => m.status === "failed");
  const shown = (f === "failed" ? failed : mail).filter((m) => (!kind || m.kind === kind) && (!q || `${m.to} ${m.subject}`.toLowerCase().includes(q)));
  const kinds: string[] = [...new Set<string>(mail.map((m) => m.kind).filter((k) => MAIL_KIND[k]))];
  const filtered = q || kind;
  const filter = kinds.length > 1 ? menuButton(kind ? "Filter · 1" : "Filter", "filter", [{ head: "Kind" }, ...["", ...kinds].map((k) => ({ pick: `mailKind:${k}`, label: MAIL_KIND[k] || "Any", on: kind === k }))], Boolean(kind)) : "";
  // Peasy's two panes on a wide screen: the emails on the left, the open one (or "No message
  // selected") on the right.
  return `
    ${toolbar(`${filter}${searchBox("Search emails")}`)}
    <div class="ob-split${shown.length ? "" : " is-empty"}">
    <section class="card${shown.length ? " td-card" : ""}">${
      shown.length
        ? `<ul class="td-list ob-list">${shown
            .slice(0, 300)
            .map(
              (m) => `<li class="td-row ob-row" data-mail="${esc(m.id)}">
                <span class="td-main">
                  <strong class="ob-to">${esc(m.to)}</strong>
                  <small>${esc(m.subject || "(no subject)")}</small>
                </span>
                <span class="ob-side">${mailBadge(m)}<small class="muted">${esc(ago(m.at))}${MAIL_KIND[m.kind] ? ` · ${MAIL_KIND[m.kind]}` : ""}</small></span>
              </li>`
            )
            .join("")}</ul>`
        : filtered
          ? `<div class="empty empty-lg">${icon("search", "i i-xl")}<p><strong>No emails match</strong></p><div class="btn-row">${q ? `<button type="button" class="btn" data-mail-clear="search">Clear Search</button>` : ""}<button type="button" class="btn" data-mail-clear="all">Reset Filters</button></div></div>`
          : `<div class="empty empty-lg">${icon("send", "i i-xl")}<p><strong>${f === "failed" ? "Every email went" : "No emails yet"}</strong></p></div>`
    }</section>
    ${shown.length ? `<div class="ob-none">${icon("email", "i i-xl")}<p><strong>No message selected</strong></p><p class="muted">Pick an email on the left to see what it said.</p></div>` : ""}
    </div>`;
}

async function outboxClick(t) {
  const clear = t.closest("[data-mail-clear]");
  if (clear) {
    state.query = "";
    if (clear.dataset.mailClear === "all") state.mailKind = "";
    return render(), true;
  }
  const row = t.closest("[data-mail]");
  if (row) return mailPanel(row.dataset.mail), true;
  return false;
}

// One email: who, when, how it went, what it said, and Send Again.
async function mailPanel(id) {
  let m;
  try {
    m = await api(`/api/admin/outbox/${id}`);
  } catch (error) {
    return toast(error.message, "error");
  }
  const again = m.canResend ? `<button type="button" class="btn${m.status === "failed" ? " btn-primary" : ""}" data-mail-again ${state.outbox?.email === false ? "disabled" : ""}>${icon("send")}<span>Send Again</span></button>` : "";
  const drawer = openPanel(
    "Email",
    `${m.status === "failed" ? `<p class="notice">${icon("syncError")}<span>${esc(m.error || "It couldn't be sent.")}${m.resent ? " It was tried again since." : ""}</span></p>` : ""}
    <section class="panel">
      <dl class="kv">
        <div><dt>Subject</dt><dd>${esc(m.subject || "(no subject)")}</dd></div>
        <div><dt>To</dt><dd>${esc(m.to)}</dd></div>
        <div><dt>When</dt><dd>${esc(date(m.at))}</dd></div>
        ${MAIL_KIND[m.kind] ? `<div><dt>Kind</dt><dd>${MAIL_KIND[m.kind]}</dd></div>` : ""}
        ${m.by ? `<div><dt>Sent by</dt><dd>${esc(m.by)}</dd></div>` : ""}
        ${m.files?.length ? `<div><dt>Attached</dt><dd>${m.files.map(esc).join("<br>")}</dd></div>` : ""}
      </dl>
    </section>
    ${
      m.secret
        ? `<p class="muted">Its code or link isn't kept. Ask them to request a new one.</p>`
        : m.html
          ? `<iframe class="ob-frame" title="The email" sandbox="allow-same-origin" data-mail-frame></iframe>`
          : m.text
            ? `<section class="panel"><pre class="ob-text">${esc(m.text)}</pre></section>`
            : `<p class="muted">Older emails keep only who and when.</p>`
    }`,
    { page: "Outbox", actions: again, badges: mailBadge(m) }
  );
  const frame = $("[data-mail-frame]", drawer) as HTMLIFrameElement;
  if (frame) {
    frame.srcdoc = m.html;
    frame.onload = () => {
      try {
        frame.style.height = `${Math.max(400, frame.contentDocument.documentElement.scrollHeight + 8)}px`;
      } catch {}
    };
  }
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const b = e.target.closest("[data-mail-again]");
    if (!b) return;
    b.disabled = true;
    b.querySelector("span").textContent = "Sending…";
    try {
      state.outbox = await api(`/api/admin/outbox/${id}/resend`, { method: "POST", body: {} });
      if (state.page === "outbox") render();
      closeDrawer();
      toast("Sent again.");
    } catch (error) {
      state.outbox = await api("/api/admin/outbox").catch(() => state.outbox);
      if (state.page === "outbox") render();
      await mailPanel(id);
      toast(error.message, "error");
    }
  };
}

/* ── To-dos ── */

const REPEATS = [
  ["", "Doesn't repeat"],
  ["1-day", "Every day"],
  ["1-week", "Every week"],
  ["2-week", "Every 2 weeks"],
  ["1-month", "Every month"],
  ["3-month", "Every 3 months"],
];
const LINK_LABEL = { order: "Order", account: "Wholesale account", supplier: "Supplier", green: "Green coffee", customer: "Customer", prospect: "Prospect" };
const repeatText = (r) => (!r ? "" : r.every === 1 ? `Every ${r.unit}` : `Every ${r.every} ${r.unit}s`);
const addDays = (iso, n) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return isoDay(d);
};
const todoHref = (l) => (!l ? "" : l.kind === "order" ? `#orders/new` : l.kind === "account" ? "#wholesale/accounts" : l.kind === "supplier" ? "#purchasing/suppliers" : l.kind === "green" ? "#purchasing/stock" : l.kind === "prospect" ? "#wholesale/prospects" : "");
// When a to-do is due, as a word where one fits: Today, Tomorrow, Yesterday, else the day.
function dueText(due, today) {
  if (!due) return "";
  if (due === today) return "Today";
  if (due === addDays(today, 1)) return "Tomorrow";
  if (due === addDays(today, -1)) return "Yesterday";
  return dayName(due, { weekday: "short", month: "short", day: "numeric", ...(due.slice(0, 4) !== today.slice(0, 4) && { year: "numeric" }) });
}
// Open ones that aren't snoozed, in groups: due (today or before), coming up (the next week),
// later (or no day), snoozed, done.
function todoGroups(v) {
  const t = v.today;
  const who = state.todoFor === "me" ? ME?.id : state.todoFor;
  const q = state.query.trim().toLowerCase();
  const list = v.todos.filter((x) => (!who || x.assignee === who) && (!state.todoAbout || x.link?.kind === state.todoAbout) && (!q || `${x.title} ${x.description} ${x.link?.label || ""} ${x.assigneeName}`.toLowerCase().includes(q)));
  const open = list.filter((x) => x.status === "open");
  const snoozed = open.filter((x) => x.snoozedUntil > t);
  const awake = open.filter((x) => !(x.snoozedUntil > t));
  const sort = state.todoSort || "due";
  const [field, desc] = sort.startsWith("-") ? [sort.slice(1), -1] : [sort, 1];
  const by = (a, b) => desc * (field === "title" ? a.title.localeCompare(b.title) : field === "added" ? (a.createdAt || "").localeCompare(b.createdAt || "") : (a.due || "9999").localeCompare(b.due || "9999"));
  return {
    due: awake.filter((x) => x.due && x.due <= t).sort(by),
    soon: awake.filter((x) => x.due && x.due > t && x.due <= addDays(t, 7)).sort(by),
    later: awake.filter((x) => !x.due || x.due > addDays(t, 7)).sort(by),
    snoozed: snoozed.sort((a, b) => a.snoozedUntil.localeCompare(b.snoozedUntil)),
    done: list.filter((x) => x.status === "done").sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || "")),
  };
}

// The to-do filters, in the page's top strip: each a ring in its color.
function todoHeadFilters() {
  const v = state.todos;
  if (!v) return "";
  const g = todoGroups(v);
  const f = state.todoFilter || "open";
  // Open's own sections already split Due, Coming Up and Later.
  return chips("To-dos", [
    { filter: "todos:open", label: "Open", count: g.due.length + g.soon.length + g.later.length, on: f === "open" },
    { filter: "todos:snoozed", label: "Snoozed", count: g.snoozed.length, tone: "t-purple", on: f === "snoozed" },
    { filter: "todos:done", label: "Done", count: g.done.length, tone: "t-green", on: f === "done" },
  ]);
}

function todosView() {
  const v = state.todos;
  if (!v) return `<section class="card"><p class="muted">Loading…</p></section>`;
  const g = todoGroups(v);
  const f = state.todoFilter || "open";
  const sections = f === "open" ? [["Due", g.due], ["Coming Up", g.soon], ["Later", g.later]] : [[null, g[f] || []]];
  const count = sections.reduce((n, [, l]) => n + l.length, 0);
  const row = (x) => {
    const late = x.status === "open" && x.due && x.due < v.today;
    const meta = [
      x.link && `<a class="td-link tone-${x.link.kind}" href="${todoHref(x.link)}" ${x.link.kind === "order" ? `data-open-order="${esc(x.link.id)}"` : ""} data-tip="Open ${esc(LINK_LABEL[x.link.kind]?.toLowerCase() || "it")}">${icon({ order: "orders", account: "wholesale", supplier: "purchasing", green: "roasting", customer: "customers", prospect: "search" }[x.link.kind] || "file", "i")}<span>${esc(x.link.label)}</span></a>`,
      x.repeat && `<span class="td-meta" title="${esc(repeatText(x.repeat))}">${icon("repeat", "i")}<span>${esc(repeatText(x.repeat))}</span></span>`,
      x.snoozedUntil > v.today && `<span class="td-meta">${icon("clock", "i")}<span>Until ${esc(dueText(x.snoozedUntil, v.today))}</span></span>`,
    ].filter(Boolean);
    return `<li class="td-row${x.status === "done" ? " is-done" : ""}" data-todo="${esc(x.id)}">
      <button type="button" class="td-check" data-todo-done aria-label="${x.status === "done" ? "Mark not done" : "Mark done"}" aria-pressed="${x.status === "done"}">${x.status === "done" ? icon("check", "i") : ""}</button>
      <span class="td-main">
        <strong>${esc(x.title)}</strong>
        ${x.description ? `<small>${esc(x.description.split("\n")[0])}</small>` : ""}
        ${meta.length ? `<span class="td-metas">${meta.join("")}</span>` : ""}
      </span>
      <span class="td-side">
        ${x.assigneeName ? `<span class="td-who" title="${esc(x.assigneeName)}">${esc(x.assigneeName.split(" ")[0])}</span>` : ""}
        ${x.status === "done" ? `<small class="muted">${esc(dayShort(x.doneAt))}</small>` : x.due ? `<span class="td-due${late ? " is-late" : x.due === v.today ? " is-today" : ""}">${esc(dueText(x.due, v.today))}</span>` : ""}
      </span>
    </li>`;
  };
  const filtered = state.query.trim() || state.todoFor || state.todoAbout;
  const empty = filtered
    ? `<div class="empty empty-lg">${icon("search", "i i-xl")}<p><strong>No to-dos match</strong></p><div class="btn-row">${state.query.trim() ? `<button type="button" class="btn" data-todo-clear="search">Clear Search</button>` : ""}<button type="button" class="btn" data-todo-clear="all">Reset Filters</button></div></div>`
    : `<div class="empty empty-lg">${icon("todos", "i i-xl")}<p><strong>${{ open: "Nothing to do", due: "Nothing due", soon: "Nothing coming due", snoozed: "Nothing snoozed", done: "Nothing done yet" }[f]}</strong></p>${f === "open" ? `<button type="button" class="btn btn-primary" data-todo-new>${icon("plus")}<span>New To-do</span></button>` : ""}</div>`;
  const team = v.team || [];
  const filterOn = Boolean(state.todoFor || state.todoAbout);
  const filterMenu = menuButton(
    filterOn ? "Filter · 1+" : "Filter",
    "filter",
    [
      { head: "For" },
      { pick: "todoFor:", label: "Anyone", on: !state.todoFor },
      ...(ME?.id ? [{ pick: "todoFor:me", label: "Me", on: state.todoFor === "me" }] : []),
      ...team.filter((m) => m.id !== ME?.id).map((m) => ({ pick: `todoFor:${m.id}`, label: m.name, on: state.todoFor === m.id })),
      { head: "About" },
      { pick: "todoAbout:", label: "Anything", on: !state.todoAbout },
      ...Object.entries(LINK_LABEL)
        .filter(([k]) => k !== "customer")
        .map(([k, label]) => ({ pick: `todoAbout:${k}`, label, on: state.todoAbout === k })),
    ],
    filterOn
  );
  return `
    ${toolbar(`${filterMenu}${sortMenu("todoSort", [["due", "Due"], ["title", "Title"], ["added", "Added"]], state.todoSort || "due")}${searchBox("Search to-dos")}`, `<button type="button" class="btn btn-primary" data-todo-new aria-label="New To-do">${icon("plus")}<span>New To-do</span></button>`)}
    ${
      count
        ? sections
            .filter(([, l]) => l.length)
            .map(([title, l]) => `<section class="card td-card">${title ? `<header class="td-head"><h2>${title}</h2><b>${l.length}</b></header>` : ""}<ul class="td-list">${l.map(row).join("")}</ul></section>`)
            .join("")
        : `<section class="card">${empty}</section>`
    }`;
}

async function todosClick(t) {
  if (t.closest("[data-todo-new]")) return todoPanel(), true;
  const clear = t.closest("[data-todo-clear]");
  if (clear) {
    state.query = "";
    if (clear.dataset.todoClear === "all") Object.assign(state, { todoFor: "", todoAbout: "", todoFilter: "open" });
    return render(), true;
  }
  const li = t.closest("[data-todo]");
  if (!li) return false;
  const x = state.todos.todos.find((y) => y.id === li.dataset.todo);
  if (!x) return true;
  if (t.closest("[data-todo-done]")) {
    li.classList.add("is-leaving");
    try {
      const v = await api(`/api/admin/todos/${x.id}`, { method: "PATCH", body: { action: x.status === "done" ? "reopen" : "done" } });
      state.todos = v;
      render();
      toast(x.status === "done" ? "Reopened." : v.next ? `Done. Next one ${dueText(v.next, v.today).replace(/^[A-Z]/, (c) => (/^(Today|Tomorrow|Yesterday)/.test(dueText(v.next, v.today)) ? c.toLowerCase() : `on ${c}`))}.` : "Done.");
    } catch (error) {
      li.classList.remove("is-leaving");
      toast(error.message, "error");
    }
    return true;
  }
  if (!t.closest("a")) todoPanel({ id: x.id });
  return true;
}

// New or one to-do: what, notes, then a row of its details (when, repeat, who, what it's about).
// `link` presets what it's about (from an order or an account).
async function todoPanel({ id = null, link = null, again = false }: { id?: string | null; link?: any; again?: boolean } = {}) {
  if (!state.todos) state.todos = await api("/api/admin/todos");
  const v = state.todos;
  const x = id ? v.todos.find((y) => y.id === id) : null;
  if (id && !x) return;
  const l = x?.link || link;
  const rep = x?.repeat ? `${x.repeat.every}-${x.repeat.unit}` : "";
  const repeats = REPEATS.some(([k]) => k === rep) ? REPEATS : [...REPEATS, [rep, repeatText(x.repeat)]];
  const recordField = (kind, sel) =>
    kind === "order"
      ? `<input name="linkId" placeholder="Order number" value="${esc(sel?.kind === "order" ? sel.id : "")}" autocapitalize="characters" aria-label="Order number">`
      : kind
        ? `<select name="linkId" aria-label="${LINK_LABEL[kind]}">${(v.links[kind] || []).map((r) => `<option value="${esc(r.id)}" ${sel?.id === r.id ? "selected" : ""}>${esc(r.label)}</option>`).join("") || `<option value="">None yet</option>`}</select>`
        : "";
  const snooze = x?.status === "open"
    ? x.snoozedUntil > v.today
      ? `<button type="button" class="btn" data-td-snooze="">${icon("clock")}<span>Wake Up</span></button>`
      : `<button type="button" class="btn" data-td-snooze="${addDays(v.today, 1)}">${icon("clock")}<span>Tomorrow</span></button><button type="button" class="btn" data-td-snooze="${addDays(v.today, 7)}">${icon("clock")}<span>Next Week</span></button>`
    : "";
  const status = x?.status === "done" ? `<span class="badge t-green"><i></i>Done</span>` : x?.snoozedUntil > v.today ? `<span class="badge t-purple"><i></i>Snoozed until ${esc(dueText(x.snoozedUntil, v.today))}</span>` : x?.due && x.due < v.today ? `<span class="badge t-red"><i></i>Overdue</span>` : "";
  // A popup (a bottom sheet on a phone): the title and notes, then a row of chips that stay muted
  // until set, and a tinted footer with Create More (or snooze and delete) and Save.
  // A new to-do is a quick popup; an existing one opens beside the list.
  const drawer = openPanel(
    x ? "To-do" : "",
    `<form class="td-form" id="todo-form" data-todo-form>
      <input class="td-title" name="title" maxlength="160" required placeholder="Add title…" value="${esc(x?.title || "")}" aria-label="Title">
      <textarea class="td-desc" name="description" rows="3" maxlength="2000" placeholder="Add description…" aria-label="Description">${esc(x?.description || "")}</textarea>
      <div class="td-fields">
        <label class="td-field td-due" data-tip="When it's due">${icon("calendar", "i")}<span class="td-ph">No due date</span><input type="date" name="due" value="${esc(x?.due || "")}" aria-label="Due"></label>
        <label class="td-field" data-tip="How often it comes back">${icon("repeat", "i")}<select name="repeat" aria-label="Repeat">${repeats.map(([k, label]) => `<option value="${k}" ${k === rep ? "selected" : ""}>${esc(k ? label : "Doesn't repeat")}</option>`).join("")}</select></label>
        <label class="td-field" data-tip="Who it's for">${icon("customers", "i")}<select name="assignee" aria-label="For"><option value="">No one yet</option>${v.team.map((m) => `<option value="${esc(m.id)}" ${(x ? x.assignee : !again && ME?.id) === m.id ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label>
        <label class="td-field" data-tip="An order, account, supplier or green coffee it's about">${icon("link", "i")}<select name="linkKind" aria-label="About"><option value="">Not linked</option>${Object.entries(LINK_LABEL)
          .filter(([k]) => k !== "customer")
          .map(([k, label]) => `<option value="${k}" ${l?.kind === k ? "selected" : ""}>${label}</option>`)
          .join("")}</select></label>
        <span class="td-field td-record" data-td-record ${l ? "" : "hidden"}>${recordField(l?.kind, l)}</span>
      </div>
    </form>`,
    {
      ...(x ? { page: "To-Dos", badges: status } : { modal: true }),
      footer: `<div class="modal-foot-side">${canOpen("assistant") && !x ? `<button type="button" class="btn" data-help-ask="How do to-dos work here?">Help</button>` : ""}${x ? `${snooze}<button type="button" class="btn btn-ghost" data-td-delete>Delete</button>` : ""}</div>
        <div class="modal-foot-side">${x ? "" : `<label class="switch-row td-more"><span><strong>Create more</strong></span><input type="checkbox" name="more" ${again ? "checked" : ""}><i aria-hidden="true"></i></label>`}<button type="submit" form="todo-form" class="btn btn-primary">Save</button></div>`,
    }
  );
  if (x) drawer.classList.add("has-foot");
  const form = $("[data-todo-form]", drawer);
  if (!x) setTimeout(() => form.title.focus(), 50);
  const muted = () => {
    for (const el of [form.due, form.repeat, form.assignee, form.linkKind]) el.closest(".td-field").classList.toggle("is-empty", !el.value);
  };
  muted();
  // An empty date shows "Due"; a click anywhere on the chip opens the calendar.
  $(".td-due", drawer).onclick = (e) => {
    if (e.target !== form.due) form.due.showPicker?.();
  };
  drawer.addEventListener("change", muted);
  drawer.onchange = (e) => {
    if (e.target !== form.linkKind) return;
    const box = $("[data-td-record]", drawer);
    box.hidden = !form.linkKind.value;
    box.innerHTML = recordField(form.linkKind.value, null);
  };
  drawer.onsubmit = async (e) => {
    e.preventDefault();
    const [every, unit] = form.repeat.value.split("-");
    const linkId = form.linkId?.value.trim();
    const body = {
      title: form.title.value,
      description: form.description.value,
      due: form.due.value || null,
      repeat: unit ? { every: Number(every), unit } : null,
      assignee: form.assignee.value,
      link: form.linkKind.value && linkId ? { kind: form.linkKind.value, id: linkId } : null,
    };
    const button = $("button[type=submit]", drawer);
    button.disabled = true;
    try {
      const before = new Set(state.todos.todos.map((y) => y.id));
      state.todos = x ? await api(`/api/admin/todos/${x.id}`, { method: "PATCH", body }) : await api("/api/admin/todos", { method: "POST", body });
      // Where it went: its section in the list (Due, Coming Up, Later, Snoozed), scrolled to.
      const saved = x ? state.todos.todos.find((y) => y.id === x.id) : state.todos.todos.find((y) => !before.has(y.id));
      const t = state.todos.today;
      const where = !saved ? "" : saved.snoozedUntil > t ? "Snoozed" : !saved.due || saved.due > addDays(t, 7) ? "Later" : saved.due <= t ? "Due" : "Coming Up";
      if (state.page === "todos") {
        if (where === "Snoozed" ? state.todoFilter !== "snoozed" : state.todoFilter && state.todoFilter !== "open") state.todoFilter = where === "Snoozed" ? "snoozed" : "open";
        render();
      }
      const flash = () => {
        const row = saved && $(`[data-todo="${saved.id}"]`);
        if (!row) return;
        row.scrollIntoView({ block: "center", behavior: "smooth" });
        row.classList.add("is-new");
        setTimeout(() => row.classList.remove("is-new"), 1600);
      };
      const msg = x ? `Saved${where ? ` in ${where}` : ""}` : where ? `Added to ${where}${state.page === "todos" ? "" : " in To-Dos"}` : "Added";
      if (!x && ($("[name=more]", drawer) as HTMLInputElement)?.checked) {
        todoPanel({ link: l, again: true });
        toast(msg);
      } else {
        closeDrawer();
        toast(msg);
        flash();
      }
    } catch (error) {
      button.disabled = false;
      panelError(error.message);
    }
  };
  drawer.onclick = async (e) => {
    if (e.target.closest("[data-close]")) return closeDrawer();
    const sn = e.target.closest("[data-td-snooze]");
    const del = e.target.closest("[data-td-delete]");
    if (!sn && !(del && confirm("Delete this to-do?"))) return;
    try {
      state.todos = await api(`/api/admin/todos/${x.id}`, del ? { method: "DELETE" } : { method: "PATCH", body: { action: "snooze", until: sn.dataset.tdSnooze } });
      if (state.page === "todos") render();
      closeDrawer();
      toast(del ? "Deleted." : sn.dataset.tdSnooze ? `Snoozed until ${dueText(sn.dataset.tdSnooze, v.today).toLowerCase()}.` : "Back in the list.");
    } catch (error) {
      panelError(error.message);
    }
  };
}

// Help in a popup's footer asks the assistant how that thing works (Peasy's).
document.addEventListener("click", (e) => {
  const help = (e.target as HTMLElement).closest?.("[data-help-ask]") as HTMLElement;
  if (!help) return;
  closeDrawer();
  openSidekick(help.dataset.helpAsk);
});
// "Add To-do" on an order, account or green coffee: a new to-do already linked to it.
document.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest?.("[data-todo-add]") as HTMLElement;
  if (b) todoPanel({ link: { kind: b.dataset.todoAdd, id: b.dataset.id, label: b.dataset.linkLabel } });
});
const todoAddButton = (kind, id, label) => `<button type="button" class="btn" data-todo-add="${kind}" data-id="${esc(id)}" data-link-label="${esc(label)}">${icon("todos")}<span>Add To-do</span></button>`;

// An open Filter or Sort menu closes on a click anywhere else.
document.addEventListener("click", (e) => {
  for (const d of $$("details.tb-menu[open], details.brand-menu[open], details.sk-chats[open], details.home-chats[open]")) if (!d.contains(e.target as Node)) d.removeAttribute("open");
});

/* ── Hover tips ── */

// A small dark tip saying what a button does, on hover and on keyboard focus: from data-tip, a
// title (moved over, so the browser's own tooltip doesn't show too), or an icon-only button's
// accessible name. "Line one\nLine two" shows the first line bold.
let tipEl: HTMLElement = null;
let tipFor: Element = null;
let tipTimer = 0;
function tipText(el) {
  if (el.title) {
    el.dataset.tip = el.title;
    el.removeAttribute("title");
  }
  if (el.dataset.tip) return el.dataset.tip;
  const label = el.getAttribute("aria-label");
  return label && !el.textContent.trim() ? label : "";
}
function hideTip() {
  clearTimeout(tipTimer);
  tipFor = null;
  tipEl?.remove();
  tipEl = null;
}
function showTip(el) {
  const text = tipText(el);
  if (!text) return;
  hideTip();
  tipFor = el;
  tipTimer = setTimeout(() => {
    if (tipFor !== el || !el.isConnected) return;
    tipEl = document.createElement("div");
    tipEl.className = "hover-tip";
    tipEl.setAttribute("role", "tooltip");
    const [first, ...rest] = text.split("\n");
    const key = el.getAttribute("aria-keyshortcuts");
    const keys = key ? key.replace("Control+", "Ctrl+").split("+") : [];
    tipEl.innerHTML = `${rest.length ? `<strong>${esc(first)}</strong><br>${esc(rest.join(" "))}` : esc(text)}${keys.map((k) => ` <kbd>${esc(k)}</kbd>`).join("")}`;
    document.body.append(tipEl);
    const r = el.getBoundingClientRect();
    const t = tipEl.getBoundingClientRect();
    // To the right of things in the sidebar; otherwise under (or over, near the bottom).
    const side = el.closest(".side") && innerWidth > 860;
    let x = side ? r.right + 8 : r.left + r.width / 2 - t.width / 2;
    let y = side ? r.top + r.height / 2 - t.height / 2 : r.bottom + 6;
    if (!side && y + t.height > innerHeight - 8) y = r.top - t.height - 6;
    x = Math.max(8, Math.min(x, innerWidth - t.width - 8));
    tipEl.style.left = `${x}px`;
    tipEl.style.top = `${y}px`;
  }, 350);
}
const tipTarget = (e) => (e.target as HTMLElement).closest?.("[data-tip], [title], button[aria-label], a[aria-label]");
document.addEventListener("mouseover", (e) => {
  const el = tipTarget(e);
  if (el && el !== tipFor && matchMedia("(hover: hover)").matches) showTip(el);
  else if (!el && tipFor) hideTip();
});
document.addEventListener("focusin", (e) => {
  const el = tipTarget(e);
  if (el && (el as HTMLElement).matches(":focus-visible")) showTip(el);
});
document.addEventListener("focusout", hideTip);
// Ctrl+K (⌘K) opens search, actions and asking from anywhere, as Peasy's.
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== "k" || !$("[data-side]")) return;
  e.preventDefault();
  openQuick();
});
// Ctrl+J (⌘J on a Mac) opens the assistant's chat from anywhere, as Peasy's.
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || e.key.toLowerCase() !== "j" || !canOpen("assistant") || !$("[data-side]")) return;
  e.preventDefault();
  if (skOpen) $("#assist-input")?.focus();
  else openSidekick();
});
// J and K step through the orders while one is open (the keys its buttons' tips show).
document.addEventListener("keydown", (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement).closest?.("input, textarea, select, [contenteditable]")) return;
  const key = e.key.toUpperCase();
  if (key !== "J" && key !== "K") return;
  const b = $(`[data-drawer]:not([hidden]) [aria-keyshortcuts="${key}"]:not(:disabled)`) as HTMLButtonElement;
  if (b) b.click();
});
document.addEventListener("mousedown", hideTip);
addEventListener("scroll", hideTip, true);

/* ── Toast ── */

let toastTimer;
function toast(text, kind = "") {
  let el = $(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    el.setAttribute("role", "status");
    document.body.append(el);
  }
  el.textContent = text;
  el.classList.toggle("is-error", kind === "error");
  el.classList.add("is-shown");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("is-shown"), 2800);
}

route();

// Keep the numbers fresh: every minute while open, and as soon as the app comes back to the
// front (a phone app is often left open in the background). Not while someone is mid-edit.
const idle = () => !state.open && !state.panel && !state.selected.size && !document.activeElement?.matches("input, select, textarea") && !document.body.classList.contains("is-login");
setInterval(() => {
  if (!document.hidden && idle()) refresh().catch(() => {});
}, 60000);
let hiddenAt = 0;
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (Date.now() - hiddenAt > 15000 && idle()) refresh().catch(() => {});
});

/* ── App (PWA): installable, works offline for the shell, badge with orders to pack ── */

if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("/admin-sw.js", { scope: "/admin" }).catch(() => {}));
}

// The home-screen icon shows how many orders are waiting to be packed (called from render).
function updateBadge() {
  const n = state.counts?.new || 0;
  if (!navigator.setAppBadge) return;
  (n ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
}

// Android / desktop Chrome offer to install; keep the prompt for a button in the menu.
let installPrompt = null;
addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPrompt = e;
  document.body.classList.add("can-install");
});
document.addEventListener("click", async (e) => {
  if (!(e.target as any).closest("[data-install]") || !installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice.catch(() => {});
  installPrompt = null;
  document.body.classList.remove("can-install");
});

// Offline: say so, and refresh when the connection comes back.
const offlineBar = () => {
  let bar = $(".offline-bar");
  if (navigator.onLine) return bar?.remove();
  if (!bar) {
    bar = document.createElement("div");
    bar.className = "offline-bar";
    bar.setAttribute("role", "status");
    bar.textContent = "You're offline. Changes can't be saved until you're back online.";
    document.body.append(bar);
  }
};
addEventListener("offline", offlineBar);
setTimeout(() => !$(".fatal", app) && offlineBar(), 0); // opened without a connection
addEventListener("online", () => {
  offlineBar();
  if ($(".fatal", app)) route();
  else if (idle()) refresh().catch(() => {});
});

// Title Case: admin.css capitalises headings and buttons, but CSS can't keep the short words small.
// Each "and", "of", "on"… after a title's first word goes in a <tc-s> that keeps it lowercase
// ("Report a Problem"); the text itself doesn't change. (The same as the shop's app.ts.)
// (Not in a hyphenated word: "To-Do".)
const SMALL_WORD_RE = /(^|[^\p{L}\p{N}'’-])(a|an|and|as|at|but|by|for|in|nor|of|on|or|per|the|to|via)(?=$|[^\p{L}\p{N}'’-])/giu;
const capitalised = (el) => el && getComputedStyle(el).textTransform === "capitalize";
function titleCaseWords(root) {
  if (!root || root.nodeType !== 1 || root.closest("tc-s")) return;
  const texts = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let n = walker.nextNode() as Text; n; n = walker.nextNode() as Text) {
    SMALL_WORD_RE.lastIndex = 0;
    if (SMALL_WORD_RE.test(n.data) && !n.parentElement.closest("tc-s, script, style, textarea") && capitalised(n.parentElement)) texts.push(n);
  }
  for (const n of texts) {
    // The title is the outermost capitalised element; its first word, and a word starting a new
    // sentence, keep their capital.
    let title = n.parentElement;
    while (capitalised(title.parentElement)) title = title.parentElement;
    const range = document.createRange();
    range.setStart(title, 0);
    range.setEnd(n, 0);
    const before = range.toString();
    range.setStart(n, n.length);
    range.setEnd(title, title.childNodes.length);
    const after = range.toString();
    const frag = document.createDocumentFragment();
    let last = 0;
    let changed = false;
    SMALL_WORD_RE.lastIndex = 0;
    for (const m of n.data.matchAll(SMALL_WORD_RE)) {
      const at = m.index + m[1].length;
      const lead = (before + n.data.slice(0, at)).trim();
      const rest = n.data.slice(at + m[2].length) + after;
      if (!lead || /[:.!?—–]$/.test(lead) || /^[\s\p{P}]*$/u.test(rest)) continue; // first or last word
      frag.append(n.data.slice(last, at));
      const small = document.createElement("tc-s");
      small.textContent = m[2];
      frag.append(small);
      last = at + m[2].length;
      changed = true;
    }
    if (!changed) continue;
    frag.append(n.data.slice(last));
    // In a flex or grid title each piece would become its own item (and line): keep them in one.
    if (/flex|grid/.test(getComputedStyle(n.parentElement).display)) {
      const run = document.createElement("tc-run");
      run.append(frag);
      n.replaceWith(run);
    } else n.replaceWith(frag);
  }
}
titleCaseWords(document.body);
new MutationObserver((changes) => {
  for (const c of changes) {
    if (c.type === "characterData") titleCaseWords(c.target.parentElement);
    else c.addedNodes.forEach((n) => titleCaseWords(n.nodeType === 3 ? n.parentElement : n));
  }
}).observe(document.body, { childList: true, characterData: true, subtree: true });
