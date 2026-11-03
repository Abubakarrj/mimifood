// Mimi Food: shared layout, cart, page renderers and motion.
// Pages declare <body data-page="..."> and include js/data.js before this file.

interface Window {
  i18n: any;
  I18N: any;
  I18N_DICT: any;
  L: any;
  Square: any;
  ApplePaySession: any;
  cookieConsent: any;
  dataLayer: any;
}
declare const ApplePaySession: any;
declare const dataLayer: any;

// Language: /es/ and /ko/ pages load js/i18n.js first, which translates what's on screen.
const LANG = window.i18n?.lang || "en";

// English Title Case with the short words kept small ("Subscribe and Save 15% on Any Coffee"),
// which CSS's capitalize can't do. Other languages stay as written.
const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "but", "by", "for", "in", "nor", "of", "on", "or", "per", "the", "to", "via"]);
const titleCase = (text) =>
  LANG !== "en"
    ? text
    : text.replace(/\S+/g, (w, i) => (i > 0 && SMALL_WORDS.has(w.toLowerCase()) ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1)));
const LANGS = [
  ["en", "English"],
  ["es", "Español"],
  ["ko", "한국어"],
];
// Dates read naturally in each language ("Thursday 15 October", "jueves, 15 de octubre", "10월 15일 목요일").
const LOCALE = { en: "en-GB", es: "es-US", ko: "ko-KR" }[LANG];
const LOCALE_US = { en: "en-US", es: "es-US", ko: "ko-KR" }[LANG];
// The current page in another language.
const langHref = (lang) => `${lang === "en" ? "" : `/${lang}`}${location.pathname.replace(/^\/(es|ko)(?=\/|$)/, "") || "/"}${location.search}${location.hash}`;
// Only once a language has its translations (SITE.langs, from the server).
// The footer's link groups: Shop, Discover, Help, and Visit (Roastery House and Instagram).
function footerColumns() {
  const col = (title, items) => `<div class="footer-col"><h2>${title}</h2><ul>${items.filter(Boolean).map((x) => `<li>${x}</li>`).join("")}</ul></div>`;
  const roastery = LOCATIONS.find((l) => l.cafe === false);
  const maps = roastery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${SITE.name}, ${roastery.address.join(", ")}`)}` : "";
  return [
    col("Shop", [
      `<a href="shop">Shop All</a>`,
      `<a href="gift-cards">Gift Cards</a>`,
      `<a href="wholesale">Wholesale</a>`,
      SITE.cafesLive ? `<a href="order-ahead">Order Ahead</a>` : "",
    ]),
    col("Discover", [
      SITE.notes ? `<a href="numeral/">Numeral</a>` : "",
      SITE.calendar?.classes ? `<a href="classes">Classes</a>` : "",
      SITE.calendar?.events ? `<a href="calendar">Calendar</a>` : "",
      SITE.cafesLive ? `<a href="locations">Locations</a>` : "",
      SITE.careers ? `<a href="careers">Careers</a>` : "",
    ]),
    col("Help", [
      `<a href="faq">FAQ</a>`,
      `<a href="track">Track Order</a>`,
      `<a href="shipping-returns">Shipping & Returns</a>`,
      `<a href="contact">Contact</a>`,
      `<button type="button" data-chat-open>Chat Us</button>`,
    ]),
    roastery
      ? col("Visit", [
          `<a href="${esc(maps)}" target="_blank" rel="noopener">${esc(roastery.address[0])}<br>${esc(roastery.address[1])}</a>`,
          `<a href="about">About Us</a>`,
          SITE.instagram ? `<a href="https://instagram.com/${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram</a>` : "",
        ])
      : "",
  ].join("");
}

const langLinks = () =>
  (SITE.langs?.length ? LANGS.filter(([id]) => id === "en" || SITE.langs.includes(id)) : []).map(([id, name]) => `<a href="${langHref(id)}" hreflang="${id}" lang="${id}" translate="no" data-lang="${id}" ${id === LANG ? 'aria-current="true"' : ""}>${name}</a>`).join("");

const $ = (sel: string, root: ParentNode = document): any => root.querySelector(sel);

// An open invoice prints on its own sheet (the browser's Print; Download PDF is a real file): everything else
// leaves the layout, so a short invoice is one page.
addEventListener("beforeprint", () => {
  const inv = document.querySelector(".inv-print");
  if (!inv || document.querySelector(".inv-print-sheet")) return;
  const sheet = document.createElement("div");
  sheet.className = "inv-print-sheet";
  sheet.append(inv.cloneNode(true));
  document.body.append(sheet);
  document.body.classList.add("is-printing-invoice");
});
addEventListener("afterprint", () => {
  document.querySelector(".inv-print-sheet")?.remove();
  document.body.classList.remove("is-printing-invoice");
});

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

const $$ = (sel: string, root: ParentNode = document): any[] => [...root.querySelectorAll(sel)];
// "$1,250.00": a thousands comma, as wholesale totals can run that high.
const money = (n) => `${SITE.currency}${Number(n).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
// The phone's "reduce motion" setting, or "Stop animations" in our accessibility panel.
const isAndroid = /Android/i.test(navigator.userAgent); // Google Pay is offered on Android only
// iPhones only show :active (the pressed look of buttons) when the page listens for touches.
document.addEventListener("touchstart", () => {}, { passive: true });
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches || (() => {
  try {
    return (JSON.parse(localStorage.getItem("bp-a11y")) || []).includes("motion");
  } catch {
    return false;
  }
})();
const page = document.body.dataset.page;

/* ── Wrong or missing input: shake the field and outline it in red ── */

// Which fields an error message is about, by the field's name.
const FIELD_HINTS: any[] = [
  [/password/i, ["password", "confirm"]],
  [/e-?mail/i, ["email"]],
  [/business/i, ["business"]],
  [/\bname\b/i, ["name", "contact", "recipient"]],
  [/address|street/i, ["address", "street"]],
  [/city/i, ["city"]],
  [/state/i, ["state"]],
  [/postcode|zip/i, ["postcode", "zip"]],
  [/phone/i, ["phone"]],
];

const textFields = (form) =>
  $$("input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]), select, textarea", form).filter(
    (f) => !f.disabled && !f.closest("[hidden]")
  );

// fields: elements or names to flag; otherwise they're picked from the message, then from what's
// empty or invalid. Flagged fields shake once and stay red until edited.
function flagFields(form, message = "", fields = null) {
  if (!form) return;
  const all = textFields(form);
  let hit = fields
    ? all.filter((f) => fields.includes(f) || fields.includes(f.name))
    : all.filter((f) => FIELD_HINTS.some(([re, names]) => re.test(message) && names.includes(f.name)));
  if (!hit.length) hit = all.filter((f) => (f.required && !f.value.trim()) || !f.validity.valid);
  if (!hit.length) return;
  hit.forEach((f) => {
    f.setAttribute("aria-invalid", "true");
    f.classList.remove("is-shaking");
    void f.offsetWidth; // restart the animation on a repeat attempt
    f.classList.add("is-shaking");
  });
  hit[0].focus({ preventScroll: hit[0].getBoundingClientRect().top > 0 });
}

// A message under one field, until it's edited (red box and shake included).
function fieldError(input, message) {
  fieldHint(input, message);
  input.focus();
}

// The message and red box alone (one per field: a second message replaces the first).
function fieldHint(input, message) {
  // A field that shares a row with its button (gift card balance, codes): the message goes under
  // the whole row, so the field keeps its width.
  const holder = input.closest("label") || input.closest(".promo-form, .ask-row, .subscribe-row") || input;
  // One message per field: the email check's note gives way, unless it offers a fix ("Did you mean …?").
  const emailHint = holder.nextElementSibling?.matches?.("[data-email-hint]") ? holder.nextElementSibling : null;
  if (emailHint?.querySelector("[data-email-fix]")) {
    input.setAttribute("aria-invalid", "true");
    return emailHint;
  }
  emailHint?.remove();
  let hint = holder.nextElementSibling?.matches?.("[data-field-error]") ? holder.nextElementSibling : null;
  if (!hint) {
    hint = document.createElement("p");
    hint.className = "field-hint is-error";
    hint.dataset.fieldError = "";
    hint.setAttribute("role", "alert");
    holder.after(hint);
    input.addEventListener("input", () => hint.remove(), { once: true });
  }
  hint.textContent = message;
  input.setAttribute("aria-invalid", "true");
  input.classList.remove("is-shaking");
  void input.offsetWidth;
  input.classList.add("is-shaking");
  return hint;
}

// Email fields: once typed, check it can get mail, and offer the fix for a likely typo
// ("gmial.com" → "gmail.com").
const emailChecks = new Map(); // email → the server's answer
document.addEventListener("change", async (e) => {
  const input: any = e.target;
  if (!input.matches?.("input[type=email]") || input.hidden) return;
  const email = input.value.trim();
  // A one-line form (email and button in a row): the hint goes under the whole form, and only
  // for a typo; the form says the rest itself.
  const label = input.closest("label");
  const oneLine = !label && input.form && /flex|grid/.test(getComputedStyle(input.parentElement).display);
  const holder = label || (oneLine ? input.form : input);
  let hint = holder.nextElementSibling?.matches?.("[data-email-hint]") ? holder.nextElementSibling : null;
  if (!email) return hint?.remove();
  try {
    if (!emailChecks.has(email)) emailChecks.set(email, await api("/api/check-email", { method: "POST", body: { email } }));
  } catch {
    return; // no server, or too many checks: the order's own check still runs
  }
  if (input.value.trim() !== email) return; // typed on since
  const r = emailChecks.get(email);
  if ((r.ok || oneLine) && !r.suggestion) return hint?.remove();
  // Already flagged by the form's own check: one message per field, the typo fix first.
  const flagged = holder.nextElementSibling?.matches?.("[data-field-error]") ? holder.nextElementSibling : null;
  if (flagged && !r.suggestion) return;
  flagged?.remove();
  if (!hint) {
    hint = document.createElement("p");
    hint.className = "field-hint";
    hint.dataset.emailHint = "";
    hint.setAttribute("role", "status");
    holder.after(hint);
  }
  hint.emailInput = input;
  hint.innerHTML = r.suggestion
    ? `Did you mean <button type="button" class="link-button is-inline" data-email-fix="${esc(r.suggestion)}">${esc(r.suggestion)}</button>?`
    : esc(r.error);
  if (!r.ok) input.setAttribute("aria-invalid", "true");
});
document.addEventListener("click", (e) => {
  const fix = (e.target as any).closest?.("[data-email-fix]");
  if (!fix) return;
  const hint = fix.closest("[data-email-hint]");
  const input = hint.emailInput;
  input.value = fix.dataset.emailFix;
  input.removeAttribute("aria-invalid");
  input.dispatchEvent(new Event("input", { bubbles: true }));
  hint.remove();
});

document.addEventListener("animationend", (e) => (e.target as any).classList?.remove("is-shaking"));
document.addEventListener("input", (e) => (e.target as any).removeAttribute?.("aria-invalid"));
document.addEventListener("change", (e) => (e.target as any).matches?.("select") && (e.target as any).removeAttribute("aria-invalid"));
// The browser's own checks (required, type=email, …) get the same treatment, without the
// browser's bubble: one message under each field, and the form's message line says which, by
// each field's label ("Check Name and Email.").
const missingFor = new Map(); // form → fields flagged in this submit
document.addEventListener(
  "invalid",
  (e) => {
    e.preventDefault(); // no browser bubble over our own message
    const f: any = e.target;
    const form = f.form;
    if (!missingFor.has(form)) {
      missingFor.set(form, new Set());
      setTimeout(() => {
        const fields = [...missingFor.get(form)];
        missingFor.delete(form);
        for (const x of fields) {
          if (["radio", "checkbox"].includes(x.type)) {
            x.setAttribute("aria-invalid", "true");
            continue;
          }
          const message = !x.value.trim() ? (x.tagName === "SELECT" ? "Choose one." : "Required.") : x.type === "email" ? "Enter a valid email." : "Check this field.";
          const hint = fieldHint(x, message);
          if (hint.matches("[data-field-error]")) hint.removeAttribute("role"); // the line by the button is the one read out
        }
        fields[0]?.focus({ preventScroll: fields[0].getBoundingClientRect().top > 0 && fields[0].getBoundingClientRect().bottom < innerHeight });
        // The message line by the submit button (the last one), not one up the form.
        const line = form && $$("[role=alert]:not([data-email-hint], [data-field-error])", form).at(-1);
        if (!line) return;
        // A label's own words, not the options or hints inside it.
        const own = (l) => l && (l.querySelector(":scope > span")?.textContent || [...l.childNodes].filter((c) => c.nodeType === 3).map((c) => c.textContent).join(" "));
        const names = [...new Set(fields.map((x) => (own(x.labels?.[0]) || x.placeholder || x.name || "").trim().replace(/\s*\*$/, "")).filter(Boolean))];
        if (names.length) line.textContent = names.length === 1 ? `Check ${names[0]}.` : `Check ${names.slice(0, -1).join(", ")} and ${names.at(-1)}.`;
      }); // after every field's check, not the first
    }
    missingFor.get(form)?.add(f);
  },
  true
);
// A form that checks itself (novalidate): the same checks, on the fields in view. True when
// everything's fine.
const formValid = (form) => [...form.elements].filter((f) => f.willValidate && !f.closest("[hidden]") && !f.checkValidity()).length === 0;

/* ── Storage (can be unavailable, e.g. private mode) ──────── */

// The checkout inside the chat (?embed=1): just the page, and its links open the whole site.
const EMBEDDED = new URLSearchParams(location.search).get("embed") === "1" && window.top !== window;
if (EMBEDDED) {
  document.documentElement.classList.add("is-embed");
  const base = document.querySelector("base") || document.head.appendChild(document.createElement("base"));
  base.setAttribute("target", "_top");
}

const store = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* not persisted; cart still works for this page view */
    }
  },
};

// Is the shop open (SITE.shopLive), or is this browser previewing it (?preview=shop)? Closed:
// the html gets .shop-closed (no Cart links), and nothing can go in the cart.
{
  const preview = new URLSearchParams(location.search).get("preview");
  if (preview === "shop") store.set("bp-shop-preview", true);
  if (preview === "off") store.set("bp-shop-preview", false);
}
const shopOpen = () => Boolean(SITE.shopLive || store.get("bp-shop-preview", false));
document.documentElement.classList.toggle("shop-closed", !shopOpen());

/* ── Drawings ─────────────────────────────────────────────── */

// The Mimi Food bag (assets/bag-kraft.webp, the real packaging) standing on its tile over a soft
// shadow; it lifts on hover like an uploaded product photo. Coffees with their own photo
// (back office) show that instead (productArt).
// Each bag carries a coffee-facts label in the coffee's own colour (PRODUCTS[].color), set on
// the photo's front face; `facts` is { kicker, title, rows: [[name, value]] }. Photo and label
// are one SVG in the photo's own units (640 × 940), so the label scales with the bag in every
// browser and stays put on it.
const BAG_SRC = "assets/bag-kraft.webp";
function bag(color = "#d8d2c4", facts = {}) {
  return `<div class="photo-art bag-art" aria-hidden="true"><span class="photo-shadow"></span><svg class="bag-svg" viewBox="0 0 640 940" preserveAspectRatio="xMidYMax meet" focusable="false"><image href="${BAG_SRC}" width="640" height="940"/>${bagLabel(color, facts)}</svg></div>`;
}

/* Accessories without a photo yet are drawn, in the same frame as the bag (640 × 940, standing
   on the bottom edge), so they sit on the same shadow and float and lift the same way. */
const shade = (hex, f) => {
  const n = parseInt(String(hex).replace("#", ""), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(f < 0 ? v * (1 + f) : v + (255 - v) * f)));
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, "0")).join("")}`;
};
const ACCESSORY_ART = {
  // A tee, front on: body, sleeves, a ribbed collar and the logo mark on the chest.
  tee: (c) => `
    <defs><linearGradient id="tee-shade" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity="0.07"/><stop offset="0.35" stop-color="#000" stop-opacity="0"/><stop offset="0.7" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.09"/></linearGradient></defs>
    <path d="M246 360C272 384 368 384 394 360L478 384L604 486L552 590L474 548L476 904Q476 926 454 926L186 926Q164 926 164 904L166 548L88 590L36 486L162 384Z" fill="${c}"/>
    <path d="M246 360C272 384 368 384 394 360L478 384L604 486L552 590L474 548L476 904Q476 926 454 926L186 926Q164 926 164 904L166 548L88 590L36 486L162 384Z" fill="url(#tee-shade)"/>
    <path d="M166 548L170 470M474 548L470 470" stroke="${shade(c, -0.12)}" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M88 590L36 486M552 590L604 486" stroke="${shade(c, -0.1)}" stroke-width="5" fill="none"/>
    <path d="M246 360C272 400 368 400 394 360" stroke="${shade(c, -0.14)}" stroke-width="16" fill="none" stroke-linecap="round"/>
    <path d="M246 360C272 384 368 384 394 360" stroke="${shade(c, -0.22)}" stroke-width="3" fill="none"/>
    <g transform="translate(372 458) scale(0.62)" fill="none"><ellipse cx="23" cy="33" rx="21.5" ry="31.5" stroke="#111" stroke-width="3"/><path fill-rule="evenodd" d="M10 41V13h5.6L23 28.2 30.4 13H36v28h-5.3V22.6L23 37.6 15.3 22.6V41z" fill="#111"/></g>`,
  // A ceramic cone dripper on its base plate, with a loop handle and ribs inside the cone.
  dripper: (c) => `
    <defs>
      <linearGradient id="drip-body" x1="0" x2="1"><stop offset="0" stop-color="${shade(c, -0.16)}"/><stop offset="0.38" stop-color="${shade(c, 0.5)}"/><stop offset="0.62" stop-color="${c}"/><stop offset="1" stop-color="${shade(c, -0.2)}"/></linearGradient>
      <linearGradient id="drip-plate" x1="0" x2="1"><stop offset="0" stop-color="${shade(c, -0.18)}"/><stop offset="0.45" stop-color="${shade(c, 0.4)}"/><stop offset="1" stop-color="${shade(c, -0.22)}"/></linearGradient>
    </defs>
    <path d="M492 560C600 560 604 700 470 732" stroke="url(#drip-body)" stroke-width="30" fill="none" stroke-linecap="round"/>
    <path d="M136 520L282 846L358 846L504 520Z" fill="url(#drip-body)"/>
    <path d="M300 846h40v26h-40z" fill="${shade(c, -0.18)}"/>
    <ellipse cx="320" cy="890" rx="158" ry="30" fill="${shade(c, -0.16)}"/>
    <path d="M162 870h316v20H162z" fill="url(#drip-plate)"/>
    <ellipse cx="320" cy="870" rx="158" ry="30" fill="url(#drip-plate)"/>
    <ellipse cx="320" cy="870" rx="54" ry="11" fill="${shade(c, -0.3)}"/>
    <ellipse cx="320" cy="520" rx="184" ry="40" fill="${shade(c, 0.35)}"/>
    <ellipse cx="320" cy="522" rx="164" ry="31" fill="${shade(c, -0.24)}"/>
    <g stroke="${shade(c, -0.34)}" stroke-width="3" stroke-linecap="round" opacity="0.55"><path d="M210 532L296 548M250 543L310 552M390 543L330 552M430 532L344 548"/></g>`,
};
// A tea's cup (its photo, cut out: 620 × 749), standing in the bag's frame so it floats and lifts
// like the bags. Its lid is the heat-seal film, printed in the tea's color with its name: an
// ellipse over the whole top of the rim (measured off the photo), its pull tab lying flat past
// the front of the rim. Mirrored for the feed photo in server/feed.js (lidArt).
const TIN_SRC = "/assets/tea-cup.webp";
// Tea in general (not one tea): a cup labeled TEA, in pink.
const TEA_TIN = { short: "Tea", color: "#f2bfcd", image: TEA_CUP_PHOTO };
// Tea in general, as photographed: a tea with a photo (one on sale first), else the drawn cup.
const teaFace = () => {
  const teas = ACCESSORIES.filter((a) => a.category === "Tea" && a.image);
  return teas.find((a) => !a.soldOut && a.price != null) || teas[0] || TEA_TIN;
};

// Square's card field, styled like the site's own fields (.form in styles.css): soft grey fill,
// no border until focused (ink) or wrong (red).
const CARD_FIELD_STYLE = {
  input: { fontSize: "16px", color: "#111111", backgroundColor: "#f2f2f2" },
  "input::placeholder": { color: "#6b6b6b" },
  ".input-container": { borderColor: "transparent", borderRadius: "10px" },
  ".input-container.is-focus": { borderColor: "#111111" },
  ".input-container.is-error": { borderColor: "#c4231a" },
};
// The card form is Square's own frame, so it doesn't follow our stylesheet: in the portal's dark
// mode it gets the portal's dark field colors (the same as its other fields).
const CARD_FIELD_STYLE_DARK = {
  input: { fontSize: "16px", color: "#ececec", backgroundColor: "#242424" },
  "input::placeholder": { color: "#8a8a8a" },
  ".input-container": { borderColor: "transparent", borderRadius: "10px" },
  ".input-container.is-focus": { borderColor: "#ececec" },
  ".input-container.is-error": { borderColor: "#ff6f63" },
  ".message-text": { color: "#a1a1a1" },
  ".message-icon": { color: "#a1a1a1" },
  ".message-text.is-error": { color: "#ff6f63" },
  ".message-icon.is-error": { color: "#ff6f63" },
};
const cardFieldStyle = () => (document.documentElement.dataset.theme === "dark" ? CARD_FIELD_STYLE_DARK : CARD_FIELD_STYLE);

function lidArt(c, ink, name) {
  return `<g class="bag-label" fill="${ink}">
      <path d="M234 362Q252 366 254 372A66 15 0 0 0 385 372Q387 366 405 362Z" fill="#000" opacity="0.2" filter="url(#tab-blur)"/>
      <ellipse cx="319.5" cy="302" rx="264" ry="57" fill="${c}"/>
      <path d="M228 355.6Q248 357.5 250.5 362A69 17 0 0 0 388.5 362Q391 357.5 411 355.6Z" fill="${c}"/>
      <ellipse cx="319.5" cy="302" rx="264" ry="57" fill="url(#lid-sheen)"/>
      <path d="M312.5 366.5h14l-7 4.6z" fill="none" stroke="${ink}" stroke-width="1.6" stroke-linejoin="round" opacity="0.7"/>
      <text transform="translate(319.5 302) scale(1 0.4)" y="24" text-anchor="middle" font-size="70" font-weight="500" letter-spacing="7">${name}</text>
    </g>`;
}
const LID_SHEEN = `<defs><linearGradient id="lid-sheen" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.16"/><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.08"/></linearGradient><filter id="tab-blur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="2.5"/></filter></defs>`;

function tinArt(a) {
  // A tea with a photo (a cut-out) floats on its shadow like the bags.
  // Square like the drawing, so it fits the same spots (cards, the subscription art).
  if (a.image) return productArt({ imageScale: 0.82, shadowScale: 0.72, ...a }).replace('class="photo-art', 'class="photo-art bag-art');
  const c = a.color || "#d8d2c4";
  const label = lidArt(esc(c), inkOn(c), esc(String(a.short || a.name).toUpperCase()));
  return `<div class="photo-art bag-art" aria-hidden="true"><span class="photo-shadow" style="--shadow-scale:0.72"></span><svg class="bag-svg tin-svg" viewBox="0 0 640 940" preserveAspectRatio="xMidYMax meet" focusable="false">${LID_SHEEN}<g class="tin-body"><image href="${TIN_SRC}" x="28" y="234" width="584" height="705"/>${label}</g></svg></div>`;
}

function accessoryArt(a, colorName?) {
  if (a.art === "tin") return tinArt(a);
  const color = a.colors?.find((c) => c.name === colorName) || a.colors?.[0];
  if (color?.image || a.image) return productArt({ ...a, image: color?.image || a.image, short: `${a.short || a.name}${color ? `, ${color.name}` : ""}` });
  const grow = a.art === "dripper" ? 1.18 : 1.1;
  return `<div class="photo-art bag-art" aria-hidden="true"><span class="photo-shadow"></span><svg class="bag-svg" viewBox="0 0 640 940" preserveAspectRatio="xMidYMax meet" focusable="false"><g transform="translate(320 928) scale(${grow}) translate(-320 -928)">${ACCESSORY_ART[a.art]?.(a.color || "#eeeeee") || ""}</g></svg></div>`;
}

// An accessory in the cart: one line per item (and size and colour), priced again by the server.
// A tea can be a gift ({ recipient, note }), like a coffee.
function accessoryLine(a, { size = "", color = "" } = {}, qty = 1, gift = null) {
  const variant = [color, size && `Size ${size}`, a.pack].filter(Boolean).join(" · ");
  return {
    key: `acc:${a.id}:${size}:${color}${gift ? `:gift:${gift.recipient}:${gift.note}` : ""}`,
    kind: "accessory",
    product: a.id,
    size,
    color,
    title: gift ? `${a.name}, gift for ${gift.recipient}` : a.name,
    variant,
    ...(gift ? { gift: true, recipient: gift.recipient, note: gift.note || undefined } : {}),
    price: a.price,
    qty,
  };
}
/* ── Stock ──
   Products the back office counts carry `left`, or `leftBy` per size or color. A coffee is
   counted in 250g bags (a 1kg bag takes 4). Not counted: Infinity. */
const LOW_STOCK = 5; // "Only N Left" from here down (server/stock.js)
const unitsLeft = (x, variant = "") => (variant && x.leftBy && variant in x.leftBy ? x.leftBy[variant] : x.left ?? Infinity);
const lowStock = (x) => !x.soldOut && x.left > 0 && x.left <= LOW_STOCK;
// What one cart line can go up to, by what's left.
function lineMax(l) {
  if (l.kind === "coffee") {
    const p = PRODUCTS.find((x) => x.id === lineProduct(l));
    return p ? Math.floor(unitsLeft(p) / ((l.size || l.key.split(":")[2]) === "1kg" ? 4 : 1)) : Infinity;
  }
  if (l.kind === "accessory") {
    const a = ACCESSORIES.find((x) => x.id === lineProduct(l));
    return a ? unitsLeft(a, a.sizes?.length ? l.size : a.colors?.length ? l.color : "") : Infinity;
  }
  return Infinity;
}

// Sold out (or the size or color chosen is): an email box for when it's back, in place of the
// buy row.
const notifyForm = () => `
  <form class="notify" data-notify novalidate hidden>
    <p class="notify-title" data-notify-title></p>
    <div class="notify-row">
      <input type="email" name="email" autocomplete="email" placeholder="Email address" aria-label="Email address" required>
      <button type="submit">Notify Me</button>
    </div>
    <p class="notify-done" data-notify-done role="status" hidden></p>
  </form>`;

// On a product page: "Only N left" over the buy row, the quantity kept to what's left, and
// Notify Me when there's none. variant() is the size or color chosen (label(v) names it), per()
// how many counted units one takes. Returns refresh(), for when the choice or quantity changes.
function wireStock({ item, variant = () => "", label = (v) => v, per = () => 1, qty, setQty }) {
  const row = $(".buy-row");
  const note = $("[data-stock-note]");
  const form = $("[data-notify]");
  if (!row || !form) return () => {};
  const plus = $('[data-pdp-qty="1"]', row);
  const max = () => (item.soldOut ? 0 : Math.floor(unitsLeft(item, variant()) / per()));
  const refresh = () => {
    const m = max();
    const out = m <= 0;
    row.hidden = out;
    if (form.hidden === out) {
      // Opened (or closed) afresh: ready for an email for this choice.
      form.hidden = !out;
      $("[data-notify-done]", form).hidden = true;
      $(".notify-row", form).hidden = false;
    }
    const v = variant();
    $("[data-notify-title]", form).textContent = v ? `${label(v)} is sold out. Get an email when it's back.` : "Sold out. Get an email when it's back.";
    note.hidden = out || m > LOW_STOCK;
    if (!note.hidden) note.textContent = `Only ${m} left`;
    if (!out && qty() > m) setQty(m);
    if (plus) plus.disabled = !out && qty() >= m;
  };
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = form.email;
    if (!input.value.trim() || !input.validity.valid) return fieldError(input, "Enter a valid email.");
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      await api("/api/notify", { method: "POST", body: { product: item.id, variant: variant(), email: input.value.trim(), lang: LANG } });
      $(".notify-row", form).hidden = true;
      const done = $("[data-notify-done]", form);
      done.textContent = `We'll email ${input.value.trim()} when it's back.`;
      done.hidden = false;
    } catch (err) {
      fieldError(input, err.message);
    } finally {
      button.disabled = false;
    }
  });
  currentUser.then((u) => {
    if (u?.email && !form.email.value) form.email.value = u.email;
  });
  refresh();
  return refresh;
}

/* ── Gift cards (digital, Square) ── */

// A message bubble, white on iMessage green, for "Text Us".
// The wholesale portal's sidebar icons (Lucide, thin outlines, as the back office's).
const TP_ICON = {
  clock: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
  locate: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`,
  list: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12h.01"/><path d="M3 18h.01"/><path d="M3 6h.01"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M8 6h13"/></svg>`,
  map: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/></svg>`,
  truck: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`,
  box: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M12 22V12"/><path d="m3.3 7 7.703 4.734a2 2 0 0 0 1.994 0L20.7 7"/></svg>`,
  pin: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,
  panel: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M15 3v18"/></svg>`,
  wide: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="m21 3-7 7"/><path d="m3 21 7-7"/><path d="M9 21H3v-6"/></svg>`,
  copy: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`,
  arrow: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
  plus: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>`,
  chat: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/></svg>`,
  gear: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915"/><circle cx="12" cy="12" r="3"/></svg>`,
  close: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
  back: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>`,
  up: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 7-7 7 7"/><path d="M12 19V5"/></svg>`,
  person: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  spark: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"/></svg>`,
  calendar: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
  doc: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
  right: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
  chatPlus: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 17a2 2 0 0 1-2 2H6.828a2 2 0 0 0-1.414.586l-2.202 2.202A.71.71 0 0 1 2 21.286V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2z"/><path d="M12 8v6"/><path d="M9 11h6"/></svg>`,
  sun: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>`,
  moon: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>`,
  monitor: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/></svg>`,
  chevron: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`,
  search: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`,
  home: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>`,
  order: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 10a4 4 0 0 1-8 0"/><path d="M3.103 6.034h17.794"/><path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/></svg>`,
  orders: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M13 16H8"/><path d="M14 8H8"/><path d="M16 12H8"/><path d="M4 3a1 1 0 0 1 1-1 1.3 1.3 0 0 1 .7.2l.933.6a1.3 1.3 0 0 0 1.4 0l.934-.6a1.3 1.3 0 0 1 1.4 0l.933.6a1.3 1.3 0 0 0 1.4 0l.933-.6a1.3 1.3 0 0 1 1.4 0l.934.6a1.3 1.3 0 0 0 1.4 0l.933-.6A1.3 1.3 0 0 1 19 2a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1 1.3 1.3 0 0 1-.7-.2l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.934.6a1.3 1.3 0 0 1-1.4 0l-.933-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-1.4 0l-.934-.6a1.3 1.3 0 0 0-1.4 0l-.933.6a1.3 1.3 0 0 1-.7.2 1 1 0 0 1-1-1z"/></svg>`,
  samples: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>`,
  balance: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>`,
  details: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10 12h4"/><path d="M10 8h4"/><path d="M14 21v-3a2 2 0 0 0-4 0v3"/><path d="M6 10H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2"/><path d="M6 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16"/></svg>`,
  logout: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/></svg>`,
  help: `<svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>`,
};
const TEXT_ICON = `<span class="text-cue-icon" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M10 3.5c-4.1 0-7.4 2.7-7.4 6.1 0 1.9 1 3.6 2.7 4.7-.2 1-.7 1.9-1.4 2.6 1.5 0 2.9-.6 3.9-1.4.7.1 1.4.2 2.2.2 4.1 0 7.4-2.7 7.4-6.1S14.1 3.5 10 3.5z"/></svg></span>`;

// The card itself: black, the logo, the amount. Drawn in HTML so the amount can change live.
const LOGO_MARK = `<svg viewBox="0 0 46 66" aria-hidden="true"><text x="23" y="42" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="34" fill="currentColor">M</text></svg>`;
const giftCardArt = (amount, number = "") => `
  <div class="gc-card" aria-hidden="true">
    <span class="gc-mark">${LOGO_MARK}</span>
    <span class="gc-kind">Gift Card</span>
    ${number ? `<span class="gc-number" translate="no">${esc(number)}</span>` : ""}
    <span class="gc-for" data-gc-for></span>
    <strong class="gc-amount" data-gc-amount>${amount ? money(amount).replace(/\.00$/, "") : ""}</strong>
    <span class="gc-name">${esc(SITE.name)}</span>
  </div>`;

function giftCardsPage() {
  const g = SITE.giftCards || { amounts: [25, 50, 75, 100], min: 10, max: 500 };
  let amount = g.amounts[1] ?? g.amounts[0];
  const root = $("[data-gift-cards]");
  root.innerHTML = `
    <div class="pdp">
      <div class="pdp-gallery" data-reveal>
        <div class="pdp-image gc-stage">
          ${giftCardArt(amount)}
          <p class="gc-note" data-gc-note hidden><span data-gc-note-text></span><small data-gc-note-from></small></p>
        </div>
      </div>
      <div class="pdp-info" data-reveal style="--i:1">
        <h1>Gift Card</h1>
        <form class="gc-form" data-gc-form novalidate>
          <fieldset class="options">
            <legend>Amount</legend>
            ${g.amounts.map((a) => `<label><input type="radio" name="amount" value="${a}"${a === amount ? " checked" : ""}><span>${money(a).replace(/\.00$/, "")}</span></label>`).join("")}
            <label><input type="radio" name="amount" value="other"><span>Other</span></label>
          </fieldset>
          <label class="gc-other" data-gc-other data-required hidden>Amount (${money(g.min).replace(/\.00$/, "")} to ${money(g.max).replace(/\.00$/, "")})<input name="other" type="number" inputmode="numeric" min="${g.min}" max="${g.max}" step="1" placeholder="${g.amounts.at(-1)}"></label>
          <fieldset class="form gc-group">
            <legend>To</legend>
            <div class="form-grid">
              <label>Name<input name="toName" maxlength="80" autocomplete="off" required></label>
              <label>Email<input name="toEmail" type="email" maxlength="254" autocomplete="off" required></label>
            </div>
            <label>Mobile<input name="toPhone" type="tel" maxlength="20" autocomplete="off" inputmode="tel"></label>
          </fieldset>
          <fieldset class="form gc-group">
            <legend>From</legend>
            <label>Name<input name="fromName" maxlength="80" autocomplete="name" required></label>
            <label>Message<textarea name="message" maxlength="300" rows="3"></textarea></label>
            <p class="field-hint gc-count" data-gc-count aria-live="polite">0/300</p>
          </fieldset>
          <div class="buy-row">
            <button class="button" type="submit" data-pdp-add>Add to Cart <span class="buy-total" data-price>${money(amount)}</span></button>
          </div>
          <p class="sub-error" data-gc-off hidden>Gift cards aren't on sale just now.</p>
        </form>
        <ul class="pdp-perks">
          <li><strong>Sent by email</strong>As soon as you've paid</li>
          <li><strong>No expiry</strong>Use it any time</li>
          <li><strong>Online or in store</strong>At Roastery House too</li>
        </ul>
      </div>
    </div>
    <section class="gc-help" data-gc-help data-reveal>
      <div class="gc-tile" id="balance">
        <h2>Check a Balance</h2>
        <form class="promo-form" data-gc-balance novalidate>
          <label class="sr-only" for="gc-number">Gift card number</label>
          <input id="gc-number" name="code" placeholder="Gift card number" inputmode="numeric" autocomplete="off" spellcheck="false">
          <button type="submit" class="pill">Check</button>
        </form>
        <p class="gc-balance-result" data-gc-result role="status" hidden></p>
      </div>
      <div class="gc-tile">
        <h2>Lost Your Gift Card?</h2>
        <form class="promo-form" data-gc-resend novalidate>
          <label class="sr-only" for="gc-resend-email">Email it was sent to</label>
          <input id="gc-resend-email" name="email" type="email" placeholder="Email it was sent to" autocomplete="email">
          <button type="submit" class="pill">Send</button>
        </form>
        <p class="gc-balance-result" data-gc-resent role="status" hidden></p>
      </div>
    </section>`;

  const form = $("[data-gc-form]");
  const other = $("[data-gc-other]");
  const priceEl = $("[data-price]");
  const show = () => {
    $("[data-gc-amount]", root).textContent = amount ? money(amount).replace(/\.00$/, "") : "";
    priceEl.textContent = amount ? money(amount) : "";
  };
  form.addEventListener("change", (e) => {
    if (e.target.name !== "amount") return;
    other.hidden = e.target.value !== "other";
    if (other.hidden) amount = Number(e.target.value);
    else {
      amount = Number(form.other.value) || 0;
      form.other.focus();
    }
    show();
  });
  form.other.addEventListener("input", () => {
    amount = Number(form.other.value) || 0;
    show();
  });
  // The card and note as they'll get them: who it's for, the message and who it's from.
  const preview = () => {
    const to = form.toName.value.trim();
    const msg = form.message.value.trim();
    const from = form.fromName.value.trim();
    $("[data-gc-for]", root).textContent = to ? `For ${to}` : "";
    $("[data-gc-note]", root).hidden = !msg;
    $("[data-gc-note-text]", root).textContent = msg;
    $("[data-gc-note-from]", root).textContent = from ? `From ${from}` : "";
    $("[data-gc-count]", root).textContent = `${form.message.value.length}/300`;
  };
  form.addEventListener("input", (e) => ["toName", "message", "fromName"].includes(e.target.name) && preview());
  currentUser.then((u) => {
    if (u?.name && !form.fromName.value) form.fromName.value = u.name;
    preview();
  });
  getShopConfig().then((c) => {
    if (c.payments) return;
    $("[data-pdp-add]").disabled = true;
    $("[data-gc-off]").hidden = false;
    $("[data-gc-help]").hidden = true;
  });
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!other.hidden && !(Number.isInteger(amount) && amount >= g.min && amount <= g.max)) return fieldError(form.other, `Choose a whole amount from ${money(g.min)} to ${money(g.max)}.`);
    const toName = form.toName.value.trim();
    const toEmail = form.toEmail.value.trim();
    const fromName = form.fromName.value.trim();
    if (!toName) return fieldError(form.toName, "Add their name.");
    if (!toEmail || !form.toEmail.validity.valid) return fieldError(form.toEmail, "Add their email, where we'll send the card.");
    if (!fromName) return fieldError(form.fromName, "Add your name, so they know who it's from.");
    const message = form.message.value.trim();
    const toPhone = form.toPhone.value.trim();
    if (toPhone && toPhone.replace(/\D/g, "").length < 10) return fieldError(form.toPhone, "Check their number, or leave it empty.");
    addLine({
      key: `gc:${Date.now().toString(36)}`, // each card its own line
      kind: "giftcard",
      title: `${SITE.name} Gift Card`,
      variant: `For ${toName}`,
      note: message || undefined,
      price: amount,
      qty: 1,
      giftcard: { toName, toEmail, ...(toPhone && { toPhone }), fromName, message },
    });
    const addBtn = $("[data-pdp-add]");
    addBtn.querySelector(".buy-added")?.remove();
    addBtn.insertAdjacentHTML("beforeend", `<span class="buy-added">Added</span>`);
    addBtn.classList.add("is-added");
    clearTimeout(addBtn.timer);
    addBtn.timer = setTimeout(() => {
      addBtn.classList.remove("is-added");
      addBtn.querySelector(".buy-added")?.remove();
    }, 1600);
    ["toName", "toEmail", "toPhone", "message"].forEach((k) => (form[k].value = ""));
    preview();
  });

  // Lost gift card: its email again, to the address it was sent to.
  $("[data-gc-resend]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.email;
    if (!input.value.trim() || !input.validity.valid) return fieldError(input, "Enter a valid email.");
    const button = $("button", e.target);
    button.disabled = true;
    try {
      await api("/api/gift-cards/resend", { method: "POST", body: { email: input.value.trim() } });
      e.target.hidden = true;
      const done = $("[data-gc-resent]");
      done.textContent = `If a gift card was sent to ${input.value.trim()}, it's on its way again.`;
      done.hidden = false;
    } catch (err) {
      fieldError(input, err.message);
    } finally {
      button.disabled = false;
    }
  });

  // Check a balance (the gift card email links straight here).
  const result = $("[data-gc-result]");
  if (location.hash === "#balance") {
    $("#balance").scrollIntoView({ block: "center" });
    setTimeout(() => $("#gc-number").focus({ preventScroll: true }), 700); // once it has faded in

  }
  $("[data-gc-balance]").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = e.target.code;
    if (!input.value.trim()) return fieldError(input, "Enter the number on the gift card.");
    const button = $("button", e.target);
    button.disabled = true;
    result.hidden = true;
    try {
      const r = await api("/api/gift-cards/balance", { method: "POST", body: { code: input.value.trim() } });
      result.innerHTML = `<strong>${money(r.balance)}</strong> left on the card ending ${esc(r.last4)}.`;
      result.hidden = false;
    } catch (err) {
      fieldError(input, err.message);
    } finally {
      button.disabled = false;
    }
  });
}

// A gift card's link (/gift/<token>): the card, who it's from and their message; Accept shows its
// number and balance, and keeps it in this browser so checkout offers it.
async function giftPage() {
  const root = $("[data-gift]");
  const token = location.pathname.match(/\/gift\/([\w-]+)/)?.[1] || "";
  let g;
  try {
    g = await api(`/api/gift/${encodeURIComponent(token)}`);
  } catch (err) {
    root.innerHTML = `<div class="empty-state"><p>${esc(err.message)}</p><a class="button" href="gift-cards">Gift Cards</a></div>`;
    return;
  }
  const draw = () => {
    root.innerHTML = `
      <div class="gift-stage" data-reveal>${giftCardArt(g.amount, g.accepted ? g.number : "")}</div>
      <div class="gift-body" data-reveal style="--i:1">
        <h1>${esc(g.fromName)} sent you a gift card</h1>
        ${g.message ? `<p class="gift-message">“${esc(g.message)}”</p>` : ""}
        ${
          g.accepted
            ? `<dl class="gift-facts">
                <div><dt>Number</dt><dd><span translate="no">${esc(g.number)}</span> <button type="button" class="link-button" data-gift-copy>Copy</button></dd></div>
                ${g.balance != null ? `<div><dt>Balance</dt><dd>${money(g.balance)}</dd></div>` : ""}
              </dl>
              <a class="button" href="shop">Shop Now</a>
              ${
                g.saved
                  ? `<p class="gift-note">Saved to your account.</p>`
                  : g.takenByOther
                    ? ""
                    : g.signedIn
                      ? `<button type="button" class="link-button gift-save" data-gift-save>Add to Account</button>`
                      : `<a class="link-button gift-save" href="login" data-login-next="gift/${esc(token)}">Add to Account</a>`
              }`
            : `<button type="button" class="button" data-gift-accept>Accept Gift Card</button>`
        }
      </div>`;
    observeReveals(); // drawn after the page loaded
  };
  draw();
  const keep = () => g.accepted && store.set("bp-giftcard", { code: g.code, last4: g.last4 });
  keep();
  root.addEventListener("click", async (e) => {
    if (e.target.closest("[data-gift-accept]")) {
      const b = e.target.closest("[data-gift-accept]");
      b.disabled = true;
      try {
        g = await api(`/api/gift/${encodeURIComponent(token)}/accept`, { method: "POST", body: {} });
        draw();
        keep();
        root.querySelector(".gc-card")?.classList.add("is-revealed");
      } catch (err) {
        b.disabled = false;
        toast(esc(err.message));
      }
    }
    if (e.target.closest("[data-gift-save]")) {
      const b = e.target.closest("[data-gift-save]");
      b.disabled = true;
      try {
        await api("/api/subscriptions/gift-cards", { method: "POST", body: { token } });
        g.saved = true;
        draw();
        toast("Saved to your account");
      } catch (err) {
        b.disabled = false;
        toast(esc(err.message));
      }
    }
    if (e.target.closest("[data-gift-copy]")) {
      navigator.clipboard?.writeText(g.code).then(() => toast("Copied"), () => {});
    }
  });
}

// One that needs a choice made on its page (a size); a colourway defaults to the first.
const accessoryNeedsChoice = (a) => Boolean(a.sizes?.length);

// An accessory's page (products/…): the coffee page's layout, with a size choice when it
// has sizes, and other accessories and coffees below.
// A cultivar's country in the Numeral guide (its sections are "Japanese tea cultivars" and so on,
// slugged as headings).
function cultivarGuideHref(entry) {
  const ADJ = { China: "Chinese", Korea: "Korean", Japan: "Japanese", Taiwan: "Taiwanese", India: "Indian", "Sri Lanka": "Sri Lankan" };
  const slug = `${ADJ[entry.country] || entry.country} tea cultivars`.normalize("NFKD").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `numeral/what-is-a-tea-cultivar#${slug}`;
}

// A tea's page, laid out like a coffee's: tasting notes, price and quantity, then "The tea" (what
// it comes with and what's in it), how to brew it, reviews and more to try.
function teaPage(a) {
  document.title = `${a.short || a.name} — Mimi Food`;
  const notes = String(a.notes || "").split(",").map((n) => n.trim()).filter(Boolean);
  const g = BREW_GUIDES.Tea;
  const soon = comingSoon(a);
  // Its cultivar (js/tea.js), linked to its country in the Numeral guide (headings there are slugged).
  const cultivar = typeof TEA_CULTIVARS === "undefined" ? null : TEA_CULTIVARS.flatMap((x) => x.entries.map((e) => ({ ...e, country: x.country }))).find((e) => e.id === a.cultivar);
  $("[data-product]").innerHTML = `
    <div class="pdp">
      <div class="pdp-gallery" data-reveal>
        <div class="pdp-image">${accessoryArt(a)}</div>
      </div>
      <div class="pdp-info" data-reveal style="--i:1">
        ${hasPills(a, { low: false }) ? `<p class="pdp-kicker">${labelPills(a, { low: false })}</p>` : ""}
        <h1>${esc(a.short || a.name)}</h1>
        <p class="pdp-origin">${[a.origin, a.blend, a.caffeine].filter(Boolean).map(esc).join(" · ")}</p>
        ${notes.length ? `<ul class="pdp-notes" aria-label="Tasting notes">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : ""}
        <p class="pdp-rating" data-pdp-rating hidden></p>
        <p class="pdp-tea-price">${soon ? "Coming Soon" : priceHtml(a)}</p>
        ${a.about ? `<p class="pdp-about">${esc(a.about)}</p>` : ""}
        ${
          soon || a.soldOut
            ? ""
            : `<fieldset class="buy-type">
          <legend>Purchase</legend>
          <label><input type="radio" name="buy" value="once" checked>
            <span><strong>One-Time Purchase</strong></span></label>
          <label><input type="radio" name="buy" value="sub">
            <span><strong>Subscribe to This Tea</strong><b><s>${money(a.price)}</s> ${money(subscriptionPrice(subscriptionCoffee(`t:${a.id}`), "8cups")?.price ?? a.price)}</b></span></label>
        </fieldset>
        <fieldset class="options" data-sub-freq hidden>
          <legend>Deliver</legend>
          ${SUBSCRIPTION.frequencies.map((f) => `<label><input type="radio" name="subFreq" value="${f.id}"${f.id === "biweekly" ? " checked" : ""}><span>${esc(titleCase(f.label))}</span></label>`).join("")}
        </fieldset>
        <fieldset class="options">
          <legend>Who's it for?</legend>
          <label><input type="radio" name="who" value="me" checked><span>For me</span></label>
          <label><input type="radio" name="who" value="gift"><span>A gift</span></label>
        </fieldset>
        <div class="form gift-fields" data-pdp-gift hidden>
          <label>Recipient's Name<input name="recipient" maxlength="80" autocomplete="off"></label>
          <label>Gift Message<textarea name="giftNote" maxlength="300" rows="3" placeholder="We'll print it on a card in the box."></textarea></label>
        </div>`
        }
        <p class="stock-note" data-stock-note hidden></p>
        <div class="buy-row">
          ${soon ? "" : `<div class="stepper" role="group" aria-label="Quantity">
            <button type="button" data-pdp-qty="-1" aria-label="Decrease">−</button>
            <span data-pdp-qty-value>1</span>
            <button type="button" data-pdp-qty="1" aria-label="Increase">+</button>
          </div>`}
          ${a.soldOut || soon ? `<button class="button" type="button" disabled>${a.soldOut ? "Sold Out" : "Coming Soon"}</button>` : `<button class="button" type="button" data-pdp-add>Add to Cart <span class="buy-total" data-price>${money(a.price)}</span></button>`}
        </div>
        ${soon ? "" : notifyForm()}
      </div>
    </div>

    <section class="pdp-origin-band" data-reveal>
      <div>
        <p class="eyebrow">The tea</p>
        ${[].concat(a.description || a.about || []).map((t) => `<p class="pdp-statement is-long">${esc(t)}</p>`).join("")}
      </div>
      <dl class="pdp-facts">
        ${cultivar ? `<div><dt>Cultivar</dt><dd><a href="${esc(cultivarGuideHref(cultivar))}">${esc(cultivar.name)}</a></dd></div>` : ""}
        ${(a.ingredients || []).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}
      </dl>
    </section>

    <section class="pdp-brew" data-reveal>
      <p class="eyebrow">How to brew</p>
      <h2>${esc(g.title)}</h2>
      <dl>${g.steps.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
      ${g.tip ? `<p class="pdp-tip">${esc(g.tip)}</p>` : ""}
    </section>
    <section class="pdp-reviews" data-pdp-reviews hidden></section>`;
  mountReviews(a.id);
  let qty = 1;
  const priceEl = $("[data-price]");
  // One-time or subscribe & save (a pack of 8 cups each delivery), for them or as a gift: as on a coffee's page.
  const subTea = subscriptionCoffee(`t:${a.id}`);
  const subPrice = subscriptionPrice(subTea, "8cups")?.price ?? a.price;
  const subscribing = () => $("input[name=buy]:checked")?.value === "sub";
  const updatePrice = () => {
    if (!priceEl) return;
    const sub = subscribing();
    $("[data-sub-freq]").hidden = !sub;
    $(".buy-row .stepper").hidden = sub;
    $("[data-pdp-add]").firstChild.textContent = sub ? "Subscribe " : "Add to Cart ";
    priceEl.textContent = money(sub ? subPrice : a.price * qty);
  };
  $$("input[name=buy]").forEach((r) => r.addEventListener("change", updatePrice));
  const setQty = (n) => {
    qty = n;
    $("[data-pdp-qty-value]").textContent = qty;
    updatePrice();
  };
  const stockRefresh = soon ? () => {} : wireStock({ item: a, qty: () => qty, setQty });
  $$("[data-pdp-qty]").forEach((b) =>
    b.addEventListener("click", () => {
      setQty(Math.max(1, qty + Number(b.dataset.pdpQty)));
      stockRefresh();
    })
  );
  const giftBox = $("[data-pdp-gift]");
  const recipient = giftBox && $("input[name=recipient]", giftBox);
  $$("input[name=who]").forEach((r) =>
    r.addEventListener("change", () => {
      giftBox.hidden = r.value !== "gift" || !r.checked;
      if (!giftBox.hidden) recipient.focus();
    })
  );
  const addBtn = $("[data-pdp-add]");
  addBtn?.addEventListener("click", () => {
    const isGift = $("input[name=who]:checked")?.value === "gift";
    if (isGift && !recipient.value.trim()) {
      fieldError(recipient, "Add the recipient's name.");
      return;
    }
    const gift = isGift ? { recipient: recipient.value.trim(), note: $("textarea[name=giftNote]", giftBox).value.trim() } : null;
    if (subscribing()) {
      const freq = SUBSCRIPTION.frequencies.find((f) => f.id === $("input[name=subFreq]:checked").value);
      const name = a.short || a.name;
      addLine({
        key: `sub:t:${a.id}:8cups:${freq.id}:${gift ? `gift:${gift.recipient}:${gift.note}` : "me"}`,
        kind: "sub",
        title: gift ? `${name} Subscription, gift for ${gift.recipient}` : `${name} Subscription`,
        variant: `${a.pack} · ${freq.label}`,
        note: gift?.note || undefined,
        gift: Boolean(gift),
        sub: { coffee: `t:${a.id}`, size: "8cups", freq: freq.id, gift: Boolean(gift), recipient: gift?.recipient || "", note: gift?.note || "" },
        price: subPrice,
        qty: 1,
      });
    } else addLine(accessoryLine(a, {}, qty, gift));
    addBtn.querySelector(".buy-added")?.remove();
    addBtn.insertAdjacentHTML("beforeend", `<span class="buy-added">Added</span>`);
    addBtn.classList.add("is-added");
    clearTimeout(addBtn.timer);
    addBtn.timer = setTimeout(() => {
      addBtn.classList.remove("is-added");
      addBtn.querySelector(".buy-added")?.remove();
    }, 1600);
  });
  // The other teas first, then coffees.
  $("[data-related]").innerHTML = [
    ...ACCESSORIES.filter((x) => isTea(x) && x.id !== a.id).map((x, i) => accessoryCard(x, i)),
    ...PRODUCTS.filter((p) => !p.soldOut).map((p, i) => productCard(p, i + 1)),
  ]
    .slice(0, 5)
    .join("");
}

function accessoryPage(a) {
  if (isTea(a)) return teaPage(a);
  document.title = `${a.name} — Mimi Food`;
  const sizes = a.sizes || [];
  const colors = a.colors || [];
  // Its sizes (or colors) by what's left: one that's run out stays choosable, struck through,
  // so they can ask to hear when it's back.
  const outOf = (v) => unitsLeft(a, v) <= 0;
  const pick = ["M", ...sizes].find((z) => sizes.includes(z) && !outOf(z)) || (sizes.includes("M") ? "M" : sizes[0]);
  const pickColor = colors.find((c) => sizes.length || !outOf(c.name)) || colors[0];
  $("[data-product]").innerHTML = `
    <div class="pdp">
      <div class="pdp-gallery" data-reveal>
        <div class="pdp-image">${accessoryArt(a)}</div>
      </div>
      <div class="pdp-info" data-reveal style="--i:1">
        <p class="pdp-kicker">${labelPills(a, { low: false })}${isTea(a) ? "" : `<span>${esc(a.category || "Accessories")}</span>`}</p>
        <h1>${esc(a.name)}</h1>
        <p class="pdp-origin">${comingSoon(a) ? "Coming Soon" : priceHtml(a)}</p>
        <p class="pdp-rating" data-pdp-rating hidden></p>
        ${a.about ? `<p class="pdp-about">${esc(a.about)}</p>` : ""}
        ${
          a.colors?.length
            ? `<fieldset class="options">
          <legend>Color</legend>
          ${a.colors.map((c) => `<label${!sizes.length && outOf(c.name) ? ' class="is-out"' : ""}><input type="radio" name="accColor" value="${esc(c.name)}"${c === pickColor ? " checked" : ""}><span>${esc(c.name)}</span></label>`).join("")}
        </fieldset>`
            : ""
        }
        ${
          sizes.length
            ? `<fieldset class="options">
          <legend>Size</legend>
          ${sizes.map((z) => `<label${outOf(z) ? ' class="is-out"' : ""}><input type="radio" name="accSize" value="${esc(z)}"${z === pick ? " checked" : ""}><span>${esc(z)}</span></label>`).join("")}
        </fieldset>`
            : ""
        }
        <p class="stock-note" data-stock-note hidden></p>
        <div class="buy-row">
          ${comingSoon(a) ? "" : `<div class="stepper" role="group" aria-label="Quantity">
            <button type="button" data-pdp-qty="-1" aria-label="Decrease">−</button>
            <span data-pdp-qty-value>1</span>
            <button type="button" data-pdp-qty="1" aria-label="Increase">+</button>
          </div>`}
          ${comingSoon(a) ? `<button class="button" type="button" disabled>Coming Soon</button>` : `<button class="button" type="button" data-pdp-add>Add to Cart <span class="buy-total" data-price>${money(a.price)}</span></button>`}
        </div>
        ${comingSoon(a) ? "" : notifyForm()}
        ${isTea(a) ? "" : `<ul class="pdp-perks"><li><strong>Free returns</strong>Within ${SITE.returns?.days ?? 14} days, unused</li></ul>`}
      </div>
    </div>
    <section class="pdp-reviews" data-pdp-reviews hidden></section>
`;
  mountReviews(a.id);
  let qty = 1;
  const priceEl = $("[data-price]");
  const colorNow = () => $("input[name=accColor]:checked")?.value || "";
  const sizeNow = () => $("input[name=accSize]:checked")?.value || "";
  const setQty = (n) => {
    qty = n;
    $("[data-pdp-qty-value]").textContent = qty;
    if (priceEl) priceEl.textContent = money(a.price * qty);
  };
  // Stock is counted per size (a tee) or per color (a dripper).
  const stockRefresh = comingSoon(a)
    ? () => {}
    : wireStock({ item: a, variant: () => (sizes.length ? sizeNow() : colorNow()), label: (v) => (sizes.length ? `Size ${v}` : v), qty: () => qty, setQty });
  $$("input[name=accColor]").forEach((r) =>
    r.addEventListener("change", () => {
      $(".pdp-image").innerHTML = accessoryArt(a, colorNow());
      stockRefresh();
    })
  );
  $$("input[name=accSize]").forEach((r) => r.addEventListener("change", stockRefresh));
  $(".pdp-image").innerHTML = accessoryArt(a, colorNow());
  $$("[data-pdp-qty]").forEach((b) =>
    b.addEventListener("click", () => {
      setQty(Math.max(1, qty + Number(b.dataset.pdpQty)));
      stockRefresh();
    })
  );
  const addBtn = $("[data-pdp-add]");
  addBtn?.addEventListener("click", () => {
    addLine(accessoryLine(a, { size: $("input[name=accSize]:checked")?.value || "", color: colorNow() }, qty));
    addBtn.querySelector(".buy-added")?.remove();
    addBtn.insertAdjacentHTML("beforeend", `<span class="buy-added">Added</span>`);
    addBtn.classList.add("is-added");
    clearTimeout(addBtn.timer);
    addBtn.timer = setTimeout(() => {
      addBtn.classList.remove("is-added");
      addBtn.querySelector(".buy-added")?.remove();
    }, 1600);
  });
  // Other accessories first, then coffees.
  $("[data-related]").innerHTML = [
    ...ACCESSORIES.filter((x) => x.id !== a.id).map((x, i) => accessoryCard(x, i)),
    ...PRODUCTS.filter((p) => !p.soldOut).map((p, i) => productCard(p, i + 1)),
  ]
    .slice(0, 5)
    .join("");
}

// An accessory's card in the shop: its art, name and price. One without sizes can be added
// straight from the card; a tee opens its page to choose a size.
function accessoryCard(a, i = 0) {
  const quick = !a.soldOut && !comingSoon(a) && !accessoryNeedsChoice(a);
  const group = isTea(a) ? "Tea" : "Accessories";
  return `
    <li class="product-card" data-group="${group}" data-type="${group}" data-category="${esc(isTea(a) ? a.type || "" : a.category || "")}" data-labels="${esc((a.labels || []).map((l) => (typeof l === "string" ? l : l.name)).join("|"))}" data-reveal style="--i:${i % 4}">
      <a href="products/${encodeURIComponent(a.id)}">
        <div class="product-image">${accessoryArt(a)}${hasPills(a) ? `<div class="product-labels">${labelPills(a)}</div>` : ""}</div>
        <div class="product-info">
          <p class="muted">${esc(a.blend || a.category || "Accessories")}${a.colors?.length > 1 ? ` · ${a.colors.length} colors` : ""}</p>
          <p class="product-name">${esc(a.name)}</p>
          <p class="product-price${a.soldOut ? " is-sold-out" : ""}">${comingSoon(a) ? "Coming Soon" : priceHtml(a)}</p>
        </div>
      </a>
      ${quick ? `<button class="quick-add" type="button" data-quick-add="${esc(a.id)}" aria-label="Add ${esc(a.short || a.name)} to cart">Add +</button>` : ""}
      ${
        // With sizes (a tee): pick the size here and it goes in the cart, as in the cart's suggestions.
        !a.soldOut && !comingSoon(a) && accessoryNeedsChoice(a)
          ? `<label class="quick-add quick-pick"><span aria-hidden="true">Size +</span><select data-quick-size="${esc(a.id)}" aria-label="Choose a size for ${esc(a.short || a.name)} and add it to the cart"><option value="" selected disabled>Size</option>${a.sizes
              .map((z) => `<option value="${esc(z)}"${a.leftBy?.[z] === 0 ? " disabled" : ""}>${esc(z)}${a.leftBy?.[z] === 0 ? " (Sold out)" : ""}</option>`)
              .join("")}</select></label>`
          : ""
      }
    </li>`;
}

// The label: drawn around its centre, then skewed to sit on the front face (its top runs
// downhill to the right and its sides lean left, measured off the photo). SVG text doesn't
// wrap, so the name breaks onto two lines and long values are shortened here.
let labelSeq = 0; // each label clips the bag photo to its own outline
function bagLabel(color, { kicker = "", title = "Mimi Food", rows = [] }, place = "translate(257 536) matrix(1 0.222 -0.128 1 0 0)") {
  const W = 307, PAD = 25, ink = inkOn(color);
  const fits = (text, size, room) => {
    const max = Math.floor(room / (size * 0.53));
    return text.length > max ? `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…` : text;
  };
  // The name: up to two lines of ~13 characters.
  const words = String(title).split(" ");
  const lines = [""];
  for (const w of words) {
    const next = lines.at(-1) ? `${lines.at(-1)} ${w}` : w;
    if (next.length > 13 && lines.at(-1) && lines.length < 2) lines.push(w);
    else lines[lines.length - 1] = next;
  }
  const facts = rows.filter(([, v]) => v);
  let y = PAD;
  let body = "";
  if (kicker) {
    body += `<text x="${PAD}" y="${y + 15}" font-size="16" letter-spacing="1.4" opacity="0.75">${esc(kicker.toUpperCase())}</text>`;
    y += 28;
  }
  for (const line of lines) {
    body += `<text x="${PAD}" y="${y + 30}" font-size="35" font-weight="500">${esc(fits(line, 35, W - 2 * PAD))}</text>`;
    y += 37;
  }
  if (facts.length) y += 14;
  for (const [k, v] of facts) {
    body += `<line x1="${PAD}" x2="${W - PAD}" y1="${y}" y2="${y}" stroke="${ink}" stroke-opacity="0.3" stroke-width="1.6"/>`;
    body += `<text x="${PAD}" y="${y + 23}" font-size="19" opacity="0.7">${esc(k)}</text>`;
    body += `<text x="${W - PAD}" y="${y + 23}" font-size="19" text-anchor="end">${esc(fits(v, 19, W - 2 * PAD - k.length * 10 - 12))}</text>`;
    y += 33;
  }
  const H = y + PAD;
  // Printed on paper and stuck on the bag, not laid over the photo: the bag's own light and grain
  // over the label and its print (its photo as a faint black veil, darker where the bag is darker:
  // the same as multiplying by its grey lifted to near white), a soft shadow at the lower edge,
  // slightly rounded corners and a faint lit edge.
  const frame = `${place} translate(${-W / 2} ${-H / 2})`;
  const clip = `bag-label-${++labelSeq}`;
  return `<defs>
      <filter id="label-light" filterUnits="userSpaceOnUse" x="0" y="0" width="640" height="940" color-interpolation-filters="sRGB"><feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.3827 -1.2874 -0.1300 0 1.2816"/></filter>
      <filter id="label-soft" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="2.2"/></filter>
      <clipPath id="${clip}"><rect width="${W}" height="${H}" rx="3" transform="${frame}"/></clipPath>
    </defs>
    <g class="bag-label" transform="${frame}" fill="${ink}">
      <rect width="${W}" height="${H}" rx="3" fill="#000" opacity="0.16" transform="translate(1 3)" filter="url(#label-soft)"/>
      <rect width="${W}" height="${H}" rx="3" fill="${esc(color)}"/>
      <g opacity="0.94">${body}</g>
    </g>
    <image href="${BAG_SRC}" width="640" height="940" clip-path="url(#${clip})" filter="url(#label-light)"/>
    <rect width="${W}" height="${H}" rx="3" transform="${frame}" fill="none" stroke="#fff" stroke-opacity="0.22" stroke-width="1.2"/>`;
}

// Dark or light text, whichever reads on a label colour.
function inkOn(hex) {
  const m = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex || "");
  if (!m) return "#111";
  const [r, g, b] = m.slice(1).map((x) => parseInt(x, 16) / 255).map((c) => (c <= 0.04 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.22 ? "#111" : "#fff";
}

// A shop coffee's label: roast, short name, then origin, region, process and altitude.
function coffeeFacts(p) {
  if (!p) return {};
  const country = (p.name || "").split(",").map((x) => x.trim())[1] || "";
  return { kicker: `${p.type} roast`, title: p.short || p.name, rows: [["Origin", country], ["Region", p.region], ["Process", p.process], ["Altitude", p.altitude]] };
}

// Locations taking café orders (Order Ahead pickup and delivery).
const CAFES = LOCATIONS.filter((l) => l.cafe !== false);

const CAL_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="12" height="11" rx="2"/><path d="M2 7h12M5.5 1.5v3M10.5 1.5v3"/></svg>`;
const PIN_ICON = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 14.5s4.5-4.2 4.5-7.7a4.5 4.5 0 0 0-9 0c0 3.5 4.5 7.7 4.5 7.7z"/><circle cx="8" cy="6.8" r="1.6"/></svg>`;
const CLOSE_ICON = `<svg viewBox="0 0 26 26" aria-hidden="true"><path d="M1 1l24 24M25 1L1 25"/></svg>`;

/* ── Layout: header, menu, cart drawer, footer ────────────── */

function renderLayout() {
  document.body.insertAdjacentHTML(
    "afterbegin",
    `
    <a class="skip-link" href="${esc(location.pathname + location.search)}#main">Skip to content</a>
    <header class="header" data-header>
      <a class="logo" href="./" aria-label="Mimi Food home">
        <span class="logo-word" style="font:600 20px/1 Instrument Sans,Arial,sans-serif;letter-spacing:.12em;color:#111">MIMI FOOD</span>
      </a>
      ${
        page === "checkout"
          ? `<nav class="header-actions" aria-label="Main"><button type="button" class="header-a11y" data-a11y-open aria-controls="a11y-panel" aria-label="Accessibility" title="Accessibility"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5m0 0l-3 6m3-6l3 6"/></svg></button><button type="button" data-open="cart">Back to Cart</button></nav>` // checkout: the way back, and accessibility (no menu or footer)
          : `<nav class="header-actions" aria-label="Main">
        <button type="button" data-open="cart">Cart (<span data-cart-count>0</span>)</button>
        <button type="button" class="menu-open" data-open="menu" data-chat-dot>Menu</button>
      </nav>`
      }
    </header>

    <div class="overlay menu" id="menu" role="dialog" aria-modal="true" aria-label="Menu" inert>
      <button class="close" type="button" data-close aria-label="Close menu">${CLOSE_ICON}</button>
      <div class="menu-search-block">
        <form class="menu-search" id="menu-search-form" role="search" data-search hidden>
          <label class="visually-hidden" for="menu-search">Search</label>
          <input id="menu-search" name="q" type="search" placeholder="What are you looking for?" autocomplete="off" enterkeyhint="search" data-search-input>
          <button type="button" class="menu-search-cancel" data-search-cancel>Cancel</button>
        </form>
        <div class="menu-results" data-search-results aria-live="polite" hidden></div>
      </div>
      <nav data-menu-nav>
        <ul class="menu-primary">
          <li class="menu-group">
            <button type="button" class="menu-toggle" data-menu-toggle aria-expanded="false" aria-controls="menu-shop">Shop<span class="menu-plus" aria-hidden="true"></span></button>
            <div class="menu-sub" id="menu-shop" inert><ul>
              <li><a href="shop">Shop All</a></li>
              ${shopCategories().map((c) => `<li><a href="shop?kind=${encodeURIComponent(c.toLowerCase().replace(/\s+/g, "-"))}">${esc(c)}</a></li>`).join("")}
              <li><a href="gift-cards">Gift Cards</a></li>
            </ul></div>
          </li>
          ${SITE.cafesLive ? `<li><a href="order-ahead">Order Ahead</a></li>` : ""}
          <li><button type="button" class="menu-search-open" data-search-open aria-expanded="false" aria-controls="menu-search-form">Search</button></li>
        </ul>
        <ul class="menu-middle">
          ${SITE.calendar?.classes ? `<li><a href="classes">Classes</a></li>` : ""}
          ${SITE.calendar?.events ? `<li><a href="calendar">Calendar</a></li>` : ""}
          <li><a href="wholesale">Wholesale</a></li>
          ${SITE.ambassadors?.open ? `<li><a href="ambassadors">Ambassadors</a></li>` : ""}
          ${SITE.cafesLive ? `<li><a href="locations">Locations</a></li>` : ""}
          ${SITE.notes ? `<li><a href="numeral/">Numeral</a></li>` : ""}
          <li><a href="about">About Us</a></li>
          <li><a href="faq">FAQ</a></li>
          <li><a href="contact">Contact</a></li>
          <li><button type="button" class="menu-chat" data-chat-open data-chat-dot>Chat Us</button></li>
        </ul>
        <ul class="menu-secondary">
          <li><a href="https://instagram.com/${esc(SITE.instagram)}" target="_blank" rel="noopener">Instagram</a></li>
          <li><a href="login" data-account-link>Log In</a></li>
          <li><button type="button" data-open="cart">Cart (<span data-cart-count>0</span>)</button></li>
          <li hidden data-install-app><button type="button">Install App</button></li>
          <li class="menu-a11y"><button type="button" data-a11y-open aria-controls="a11y-panel">Accessibility</button></li>
        </ul>
        <p class="menu-langs" aria-label="Language">${langLinks()}</p>
      </nav>
    </div>

    <div class="overlay drawer" id="cart" role="dialog" aria-modal="true" aria-label="Cart" inert>
      <div class="drawer-backdrop" data-close></div>
      <aside class="drawer-panel">
        <div class="drawer-head">
          <h2>Cart (<span data-cart-count>0</span>)</h2>
          <button class="close" type="button" data-close aria-label="Close cart">${CLOSE_ICON}</button>
        </div>
        <div class="free-ship" data-free-ship></div>
        <ul class="cart-lines" data-cart-lines></ul>
        <section class="cart-suggest" data-cart-suggest aria-label="You might like" hidden></section>
        <div class="drawer-foot">
          <div class="row"><span>Subtotal</span><span data-cart-subtotal>${money(0)}</span></div>
          <a class="button" href="checkout" data-checkout-link>Checkout</a>
          <div class="express express-cart" data-cart-express hidden>
            <button type="button" class="button wallet-button" data-cart-apple aria-label="Check out with Apple Pay" hidden><span>Check out with</span><svg class="apple-logo" viewBox="0 0 814 1000" aria-hidden="true"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg><span>Pay</span></button>
            <div id="cart-google" hidden></div>
            <p class="express-error sub-error" data-cart-express-error role="alert"></p>
          </div>
        </div>
      </aside>
    </div>
  `
  );

  if (page === "checkout") return; // checkout keeps to the order: no footer or newsletter
  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <footer class="footer">
      <form class="subscribe" data-subscribe novalidate>
        <label for="subscribe-email">New products and offers by email${SITE.welcomeDiscount > 0 ? `, plus ${SITE.welcomeDiscount}% off your next order` : ""}</label>
        <div class="subscribe-row">
          <input id="subscribe-email" name="email" type="email" autocomplete="email" placeholder="Email address" required>
          <input class="visually-hidden" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button type="submit">Subscribe</button>
        </div>
        <p class="subscribe-status" data-subscribe-status role="status"></p>
      </form>
      <nav class="footer-cols" aria-label="Footer">${footerColumns()}</nav>
      <div class="footer-base">
        <span>&copy; ${new Date().getFullYear()} Mimi Food</span>
        <a class="footer-legal" href="terms">Terms of Sale</a>
        <a class="footer-legal" href="privacy">Privacy & Cookie Policy</a>
        <a class="footer-legal" href="accessibility">Accessibility</a>
      </div>
      <p class="footer-langs" aria-label="Language">${langLinks()}</p>
    </footer>
  `
  );
}

/* ── Accounts (needs the Node server) ─────────────────────── */

/* ── Spam defence (see server/spam.js) ──
   Every form gets a hidden "website" field that only bots fill in, and posts carry a token
   the page fetches when it loads. A token that's too fresh (a bot filling the form instantly)
   or expired (a page left open for hours) is retried after a short wait. */

let formToken = null;
let guardedStart = () => {};
const fetchFormToken = () =>
  fetch("/api/form-token")
    .then((r) => (r.ok ? r.json() : {}))
    .then((d: any) => (formToken = d.token || null))
    .catch(() => (formToken = null));
// Fetched once the page has settled (or as soon as a form is used), not while it's loading.
let formTokenReady = Promise.resolve();
if (page !== "admin") {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    formTokenReady = fetchFormToken();
  };
  (window.requestIdleCallback || ((f) => setTimeout(f, 1200)))(start, { timeout: 2500 });
  document.addEventListener("focusin", (e) => (e.target as any).closest?.("form") && start(), { once: false, passive: true });
  guardedStart = start;
}

const addHoneypots = () =>
  $$("form:not(:has(input[name=website]))").forEach((f) =>
    f.insertAdjacentHTML("beforeend", '<input class="visually-hidden" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">')
  );
const honeypotFilled = () => $$("input[name=website]").some((i) => i.value);

async function guardedFetch(url, init: any = {}) {
  guardedStart();
  await formTokenReady;
  const attempt = () =>
    fetch(url, { ...init, headers: { ...init.headers, ...(formToken && { "X-Form-Token": formToken }), ...(honeypotFilled() && { "X-Hp": "1" }) } });
  let res = await attempt();
  for (let tries = 0; res.status === 403 && tries < 2; tries++) {
    const data = await res.clone().json().catch(() => ({}));
    if (data.code !== "form-token") break;
    if (data.wait) await new Promise((r) => setTimeout(r, Math.min(data.wait, 6000) + 100));
    else await (formTokenReady = fetchFormToken());
    res = await attempt();
  }
  return res;
}

async function api(path: string, { method = "GET", body }: { method?: string; body?: any } = {}) {
  const res = await (method === "GET" ? fetch : guardedFetch)(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let data: any = {};
  try {
    data = await res.json();
  } catch {
    /* not JSON: e.g. the static site without the server */
  }
  if (!res.ok) {
    const error: any = new Error(data.error || (res.status === 404 || res.status === 405 ? "Something went wrong. Try again." : "Something went wrong. Try again."));
    error.status = res.status;
    error.fromApi = Boolean(data.error); // false when there's no server behind the site
    error.data = data;
    throw error;
  }
  return data;
}

// Resolves to the logged-in user, or null.
const currentUser = (async () => {
  try {
    return (await api("/api/auth/me")).user;
  } catch {
    return null;
  }
})();

currentUser.then((user) => {
  // A wholesale login's pages are its portal only: no shop menu, cart or shop links.
  if (user?.wholesale) {
    document.body.classList.add("is-wholesale");
    $$(".logo").forEach((a) => (a.href = "trade"));
  }
  $$("[data-account-link]").forEach((a) => {
    a.textContent = user?.wholesale ? "Wholesale" : user ? "Account" : "Log In";
    a.href = user?.wholesale ? "trade" : user ? "account" : "login";
  });
});

// Only follow same-site relative links after logging in.
const safeNext = (next) => (next && /^([a-z0-9-]+|gift\/[\w-]+)(\.html)?([?#][^\s]*)?$/i.test(next) ? next : "account");
// Where to go after logging in: kept for this visit (not in the address, so /login stays clean).
// Passkeys: the browser's WebAuthn calls take bytes; the server sends and expects base64url text.
const b64url = {
  to: (buf: ArrayBuffer) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  from: (text: string) => Uint8Array.from(atob(text.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(text.length / 4) * 4, "=")), (c) => c.charCodeAt(0)),
};
const credentialIds = (list: any[] = []) => list.map((c) => ({ ...c, id: b64url.from(c.id) }));
async function passkeyCreate(o: any) {
  const cred: any = await navigator.credentials.create({ publicKey: { ...o, challenge: b64url.from(o.challenge), user: { ...o.user, id: b64url.from(o.user.id) }, excludeCredentials: credentialIds(o.excludeCredentials) } });
  const r = cred.response;
  return { id: cred.id, rawId: b64url.to(cred.rawId), type: cred.type, authenticatorAttachment: cred.authenticatorAttachment, clientExtensionResults: cred.getClientExtensionResults(), response: { clientDataJSON: b64url.to(r.clientDataJSON), attestationObject: b64url.to(r.attestationObject), transports: r.getTransports?.() || [] } };
}
async function passkeyGet(o: any) {
  const cred: any = await navigator.credentials.get({ publicKey: { ...o, challenge: b64url.from(o.challenge), allowCredentials: credentialIds(o.allowCredentials) } });
  const r = cred.response;
  return { id: cred.id, rawId: b64url.to(cred.rawId), type: cred.type, authenticatorAttachment: cred.authenticatorAttachment, clientExtensionResults: cred.getClientExtensionResults(), response: { clientDataJSON: b64url.to(r.clientDataJSON), authenticatorData: b64url.to(r.authenticatorData), signature: b64url.to(r.signature), userHandle: r.userHandle ? b64url.to(r.userHandle) : undefined } };
}
// A name for the passkey list: the kind of device it was added on.
const deviceName = () => {
  const ua = navigator.userAgent;
  const os = /iPhone/.test(ua) ? "iPhone" : /iPad/.test(ua) ? "iPad" : /Android/.test(ua) ? "Android" : /Mac/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /CrOS/.test(ua) ? "Chromebook" : /Linux/.test(ua) ? "Linux" : "This device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  return browser ? `${os} · ${browser}` : os;
};

// The Passkeys section (wholesale portal, customer account): the login's passkeys, Add and Remove.
// Mounted once per page root; it loads the list itself and redraws in place.
const passkeySection = () =>
  window.PublicKeyCredential
    ? `<section class="trade-section passkeys" data-passkeys>
        <h2 class="section-label">Passkeys</h2>
        <ul class="passkey-list" data-passkey-list></ul>
        <p class="sub-error" data-passkey-error role="alert"></p>
        <button type="button" class="button is-outline" data-passkey-add>Add a Passkey</button>
      </section>`
    : "";
function mountPasskeys(root: any) {
  if (!window.PublicKeyCredential || root.dataset.passkeysMounted) return;
  root.dataset.passkeysMounted = "1";
  let list: any[] | null = null;
  const day = (iso: string, year = false) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", ...(year && { year: "numeric" }) });
  const draw = () => {
    const ul = $("[data-passkey-list]", root);
    if (ul && list) ul.innerHTML = list.map((k) => `<li><span><strong>${esc(k.device)}</strong><small class="muted">Added ${esc(day(k.createdAt, true))}${k.lastUsedAt ? ` · Used ${esc(day(k.lastUsedAt))}` : ""}</small></span><button type="button" class="link-button" data-passkey-remove="${esc(k.id)}">Remove</button></li>`).join("");
  };
  // The section can be drawn again (tabs, re-renders): fill it whenever it appears.
  new MutationObserver(() => $("[data-passkey-list]", root)?.childElementCount === 0 && list?.length && draw()).observe(root, { childList: true, subtree: true });
  api("/api/auth/passkeys").then((r) => ((list = r.passkeys), draw()), () => {});
  root.addEventListener("click", async (e: any) => {
    const add = e.target.closest("[data-passkey-add]");
    const remove = e.target.closest("[data-passkey-remove]");
    if (!add && !remove) return;
    const error = $("[data-passkey-error]", root);
    error.textContent = "";
    (add || remove).disabled = true;
    try {
      if (add) {
        const options = await api("/api/auth/passkey/register/options", { method: "POST", body: {} });
        const response = await passkeyCreate(options);
        list = (await api("/api/auth/passkey/register", { method: "POST", body: { response, device: deviceName() } })).passkeys;
      } else if (confirm(window.i18n?.t("Remove this passkey?") ?? "Remove this passkey?")) {
        list = (await api(`/api/auth/passkeys/${encodeURIComponent(remove.dataset.passkeyRemove)}`, { method: "DELETE", body: {} })).passkeys;
      }
      draw();
    } catch (err) {
      if (err.name === "InvalidStateError") error.textContent = "This device already has a passkey here.";
      else if (err.name !== "NotAllowedError" && err.name !== "AbortError") error.textContent = err.message;
    }
    (add || remove).disabled = false;
  });
}

// Set by "Log in" links (data-login-next) and pages that need an account; an old ?next= still works.
const NEXT_KEY = "bp-login-next";
const setLoginNext = (next) => {
  try {
    sessionStorage.setItem(NEXT_KEY, next);
  } catch {
    /* private mode: they land on their account instead */
  }
};
const loginNext = () => {
  let kept = null;
  try {
    kept = sessionStorage.getItem(NEXT_KEY);
  } catch {
    /* as above */
  }
  return new URLSearchParams(location.search).get("next") || kept;
};
const toLogin = (next) => {
  setLoginNext(next);
  location.replace("login");
};
document.addEventListener("click", (e) => {
  const a = (e.target as any).closest("a[data-login-next]");
  if (a) setLoginNext(a.dataset.loginNext);
});

/* ── Overlays ─────────────────────────────────────────────── */

let lastFocus = null;

// Apple Pay (or Google Pay on Android) in the cart: get it ready once the page is idle.
if ((window.ApplePaySession || isAndroid) && document.body.dataset.page !== "checkout") {
  const warm = () => startCartExpress();
  if (document.readyState === "complete") setTimeout(warm, 300);
  else addEventListener("load", () => (window.requestIdleCallback ? requestIdleCallback(warm, { timeout: 2000 }) : setTimeout(warm, 300)), { once: true });
}

// The page doesn't scroll under an open sheet.
function lockPage() {
  document.body.classList.add("is-locked");
}

function unlockPage() {
  document.body.classList.remove("is-locked");
}

// An open sheet (cart, chat) keeps to the part of the screen you can see. On iPhone, the size
// picker or the keyboard shifts and shrinks what's visible while the sheet stays put, so its
// top (the header, the messages) went off screen. The page underneath is left alone.
let fitTimer = 0;
let fitLast = "";
function fitSheet() {
  // Nothing to do unless the cart or chat is open (or was just closed and needs resetting).
  if (!$(".drawer.is-open") && !$(".drawer .drawer-panel[style]")) return;
  // The keyboard sends a stream of events as it slides while Safari shifts the screen; following
  // each one fought Safari and shook the chat. Wait for it to settle, then move once (smoothly,
  // see .chat-panel in the styles).
  clearTimeout(fitTimer);
  fitTimer = setTimeout(applyFit, 120);
}

// How tall the keyboard was last time, so the text box can rise as the keyboard does.
const KB_KEY = "bp-keyboard";

function applyFit() {
  const vv = window.visualViewport;
  $$(".drawer .drawer-panel").forEach((panel) => {
    if (!vv || !panel.closest(".drawer").classList.contains("is-open")) {
      panel.removeAttribute("style");
      return;
    }
    // The chat with its box not in use: no keyboard, nothing to fit (a late event from the keyboard
    // going down mustn't move it).
    if (panel.matches(".chat-panel") && document.activeElement?.id !== "chat-input") {
      panel.style.top = panel.style.paddingBottom = "";
      return;
    }
    // The sheet starts at the top of what's visible and runs to the bottom of the screen, so its
    // white shows through the see-through keyboard. What the keyboard covers becomes padding,
    // plus room to clear the keyboard's soft top edge.
    // (The chat doesn't follow Safari's shift of the screen: undoing the shift, below, keeps it in
    // place; following it left the chat too low for a moment whenever Safari shifted back.)
    const chat = panel.matches(".chat-panel");
    const offset = chat ? 0 : Math.max(0, Math.round(vv.offsetTop));
    const covered = Math.round(panel.closest(".drawer").clientHeight - Math.max(0, vv.offsetTop) - vv.height);
    const top = chat ? "" : `${offset}px`;
    const pad = covered > 120 ? `${covered + 24}px` : "";
    if (covered > 120) store.set(KB_KEY, covered);
    if (panel.style.top !== top) panel.style.top = top;
    if (panel.style.paddingBottom !== pad) panel.style.paddingBottom = pad;
  });
  // The newest message stays in view when the space changes size.
  const size = vv ? `${Math.round(vv.height)}` : "";
  const thread = $("#chat.is-open .chat-thread");
  if (thread && size !== fitLast) thread.scrollTop = thread.scrollHeight;
  fitLast = size;
}
window.visualViewport?.addEventListener("resize", fitSheet);
window.visualViewport?.addEventListener("scroll", fitSheet);

// The bottom of what's visible, from the top of the page's frame (--vv-bottom). After the
// keyboard closes, iPhone Safari can keep the frame a keyboard's height short, so fixed things
// set against its bottom (Add to Cart, the cart, the subscription bar) sat mid-screen. Opened
// from the home screen, both the frame and the visible area can stay short (after the keyboard,
// or coming back to the app), so there, with nothing being typed in, the bottom is the tallest
// the app has been at this width. (Not the screen's height: the app starts below the status bar.)
const fromHomeScreen = () => (navigator as any).standalone === true || matchMedia("(display-mode: standalone)").matches;
const tallestAt = {}; // width → the app's full height
function trackVisible() {
  const vv = window.visualViewport;
  let bottom = vv ? vv.offsetTop + vv.height : 0;
  if (fromHomeScreen() && !document.activeElement?.matches?.("input, textarea, select, [contenteditable]")) {
    tallestAt[innerWidth] = Math.max(tallestAt[innerWidth] || 0, innerHeight, bottom);
    bottom = tallestAt[innerWidth];
  }
  if (bottom) document.documentElement.style.setProperty("--vv-bottom", `${Math.round(bottom)}px`);
}
trackVisible();
window.visualViewport?.addEventListener("resize", trackVisible);
window.visualViewport?.addEventListener("scroll", trackVisible);
addEventListener("resize", trackVisible);
addEventListener("pageshow", trackVisible);
addEventListener("focusin", trackVisible);
document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && setTimeout(trackVisible, 100));
// And nudge Safari to re-measure once the keyboard has gone.
addEventListener("focusout", (e) => {
  if (!(e.target as any).matches?.("input, textarea, select")) return;
  setTimeout(() => {
    if (document.activeElement?.matches?.("input, textarea, select")) return;
    scrollTo({ top: scrollY + 1, behavior: "instant" });
    scrollTo({ top: scrollY - 1, behavior: "instant" });
    trackVisible();
  }, 300);
});

// While typing in the chat, Safari scrolls the page to show the box; put it straight back, so
// nothing behind or around the chat moves.
let chatPageY = 0;
const holdPage = () => {
  if (document.activeElement?.id === "chat-input" && Math.abs(scrollY - chatPageY) > 1) scrollTo({ top: chatPageY, behavior: "instant" });
};
addEventListener("scroll", holdPage, { passive: true });
window.visualViewport?.addEventListener("scroll", holdPage);

// Tapping the box on a phone: lift it at once to where the keyboard will end, before the keyboard
// arrives, so Safari has no reason to slide the whole screen up (which hid the header, then
// snapped back). The keyboard's height is remembered from last time; the first time, a typical
// iPhone keyboard is assumed, and applyFit settles on the real one.
const isPhone = () => !matchMedia("(hover: hover) and (pointer: fine)").matches;
function liftForKeyboard() {
  const panel = $("#chat.is-open .drawer-panel");
  if (!panel || !isPhone() || panel.style.paddingBottom) return;
  const kb = store.get(KB_KEY, 0) || Math.round(innerHeight * 0.44);
  panel.classList.add("is-instant");
  panel.style.paddingBottom = `${kb + 24}px`;
  requestAnimationFrame(() => requestAnimationFrame(() => panel.classList.remove("is-instant")));
  setTimeout(fitSheet, 700); // then settle on what the keyboard actually covers (or doesn't)
}

// Keyboard going down: the chat goes back with it, straight away.
function dropForKeyboard() {
  setTimeout(() => {
    const panel = $("#chat .drawer-panel");
    if (!panel || document.activeElement?.id === "chat-input") return; // only a moment away (sending)
    clearTimeout(fitTimer);
    panel.style.top = panel.style.paddingBottom = "";
  }, 60);
}

function openOverlay(id) {
  if (id === "cart") {
    startCartExpress();
    if (cart.length) gaEvent("view_cart", { value: gaValue(cart), items: cart.map((l) => gaItem(l)) });
  }
  closeOverlays(false);
  const el = document.getElementById(id);
  lastFocus = document.activeElement;
  el.inert = false;
  el.classList.add("is-open");
  lockPage();
  fitSheet();
  // Focus the sheet itself (no ring), not its close button, which showed a blue focus box on
  // phones after a tap. Tab then moves through the sheet as before.
  el.tabIndex = -1;
  setTimeout(() => el.focus({ preventScroll: true }), 50);
  // The page behind can't be reached with Tab (or a screen reader) while the sheet is open.
  behind = [...document.body.children].filter((x) => !x.contains(el) && !(x as any).inert && !x.matches("script, [data-toast]"));
  behind.forEach((x) => (x.inert = true));
}
let behind = [];

function closeOverlays(restoreFocus = true) {
  $$(".overlay.is-open").forEach((el) => {
    el.classList.remove("is-open");
    el.inert = true;
  });
  behind.forEach((x) => (x.inert = false));
  behind = [];
  unlockPage();
  fitSheet();
  if (restoreFocus) lastFocus?.focus?.();
}

/* ── Cart ─────────────────────────────────────────────────── */
// A line: { key, kind: "coffee"|"sub"|"pickup", title, variant, price, qty, color }

// Not open yet: an empty cart (whatever an earlier visit left stays saved for when it opens).
let cart = shopOpen() ? store.get("bp-cart", []).filter((l) => l && l.key && l.qty > 0) : [];
// Café items saved before the bars were hidden can't be checked out until they open.
if (!SITE.cafesLive) cart = cart.filter((l) => l.kind !== "pickup");
// "Back to your cart" in an abandoned-cart email, or an AI assistant's checkout link (/mcp):
// ?cart=id~size~grind~qty,… (gear: id~size~color~qty) puts those in the cart (on top of anything
// already in it here), then the link tidies itself away.
{
  const params = new URLSearchParams(location.search);
  const wanted = shopOpen() && params.get("cart");
  if (wanted) {
    for (const part of wanted.split(",").slice(0, 20)) {
      const [id, size, grind, qty] = part.split("~");
      const n = Math.min(20, Math.max(1, Number(qty) || 1));
      // Gear (from an assistant's checkout link): id~size~color~qty.
      const a = ACCESSORIES.find((x) => x.id === id && x.price != null && !x.soldOut);
      if (a) {
        if (a.sizes?.length && !a.sizes.includes(size)) continue;
        const line = accessoryLine(a, { size: size || "", color: grind || a.colors?.[0]?.name || "" }, n);
        const existing = cart.find((l) => l.key === line.key);
        if (existing) existing.qty = Math.max(existing.qty, line.qty);
        else cart.push(line);
        continue;
      }
      const p = PRODUCTS.find((x) => x.id === id && !x.soldOut);
      if (!p || !["250g", "1kg"].includes(size) || !grindsFor(p).includes(grind)) continue;
      const line = coffeeLine(p, size, grind, n);
      const existing = cart.find((l) => l.key === line.key);
      if (existing) existing.qty = Math.max(existing.qty, line.qty);
      else cart.push(line);
    }
    store.set("bp-cart", cart);
    params.delete("cart");
    history.replaceState(null, "", `${location.pathname}${params.size ? `?${params}` : ""}${location.hash}`);
  }
}

const cartCount = () => cart.reduce((n, l) => n + l.qty, 0);
const cartSubtotal = () => cart.reduce((n, l) => n + l.price * l.qty, 0);
// What counts toward free shipping: the whole order, subscriptions and gift cards included, once there's
// something that ships with it (a subscription on its own always ships free). As on the server.
const freeShipTotal = (lines) => (lines.some((l) => l.kind === "coffee" || l.kind === "accessory") ? lines.filter((l) => l.kind === "coffee" || l.kind === "accessory" || l.kind === "sub" || l.kind === "prepaid" || l.kind === "giftcard").reduce((n, l) => n + l.price * l.qty, 0) : 0);
const shippable = () => freeShipTotal(cart);

function addLine(line, { open = true } = {}) {
  if (!shopOpen()) return; // not open yet: the buttons do nothing
  noteActivity("cart", { path: `${location.pathname} ${line.key}`.slice(0, 120) });
  const existing = cart.find((l) => l.key === line.key);
  const added = { qty: 1, ...line };
  if (!(existing && line.kind === "sub")) gaEvent("add_to_cart", { value: gaValue([added]), items: [gaItem(added)] });
  if (existing) existing.qty += line.kind === "sub" ? 0 : line.qty || 1; // one of each subscription
  else cart.push({ qty: 1, ...line });
  // Never more than is left.
  const now = existing || cart.at(-1);
  const max = lineMax(now);
  if (max <= 0) {
    // Sold out (a size or color can be, with the rest still in stock): nothing to add.
    if (existing) existing.qty -= line.qty || 1;
    else cart.pop();
    toast("Sorry, that one is sold out.");
    saveCart();
    return;
  }
  if (now.qty > max) {
    now.qty = max;
    toast(`Only ${max} left. That's all of them in your cart.`);
  }
  saveCart(true);
  if (open) openOverlay("cart");
}

function setQty(key, qty) {
  const was = cart.find((l) => l.key === key);
  if (was && qty > was.qty && qty > lineMax(was)) {
    qty = Math.max(was.qty, lineMax(was));
    toast(`Only ${lineMax(was)} left.`);
    if (qty === was.qty) return;
  }
  if (was && qty < was.qty) gaEvent("remove_from_cart", { value: Math.round(was.price * (was.qty - Math.max(0, qty)) * 100) / 100, items: [gaItem(was, was.qty - Math.max(0, qty))] });
  else if (was && qty > was.qty) gaEvent("add_to_cart", { value: Math.round(was.price * (qty - was.qty) * 100) / 100, items: [gaItem(was, qty - was.qty)] });
  cart = qty <= 0 ? cart.filter((l) => l.key !== key) : cart.map((l) => (l.key === key ? { ...l, qty } : l));
  saveCart();
}

function saveCart(bump = false) {
  if (shopOpen()) store.set("bp-cart", cart);
  renderCart();
  document.dispatchEvent(new Event("cartchange")); // e.g. the checkout summary redraws
  if (bump && !reduceMotion) {
    $$("[data-cart-count]").forEach((el) => {
      el.classList.remove("bump");
      void el.offsetWidth; // restart the animation
      el.classList.add("bump");
    });
  }
}

/* ── "You might like", in the cart: one or two things that go with what's there ──
   A coffee of the other roast (a filter buyer sees an espresso and the other way round), one
   that takes the order past free shipping when it's close, and an accessory (the dripper for
   filter coffee). Never what's already in the cart or sold out; none beside café orders or a
   cart that's only subscriptions. */
const lineProduct = (l) => l.product || l.key.split(":")[1];
// Checkout on Shopify: the cart as a Shopify cart link, when the store is set and every line is a
// product with a Shopify variant id. Otherwise "" and the shop's own checkout is used.
function shopifyCartUrl() {
  const domain = SITE.shopify?.domain;
  if (!domain || !cart.length) return "";
  const parts = [];
  for (const l of cart) {
    const variant = l.kind === "accessory" ? ACCESSORIES.find((a) => a.id === lineProduct(l))?.shopify : "";
    if (!variant) return "";
    parts.push(`${variant}:${l.qty}`);
  }
  return `https://${domain}/cart/${parts.join(",")}?return_to=/checkout`;
}
function cartSuggestions() {
  if (!cart.length || cart.some((l) => l.kind === "pickup") || cart.every((l) => l.kind === "sub" || l.kind === "class")) return [];
  const inCart = new Set(cart.filter((l) => l.kind === "coffee" || l.kind === "accessory").map(lineProduct));
  const coffees = PRODUCTS.filter((p) => !p.soldOut && !inCart.has(p.id));
  const extras = ACCESSORIES.filter((a) => !a.soldOut && !comingSoon(a) && !inCart.has(a.id));
  const types = new Set(cart.filter((l) => l.kind === "coffee").map((l) => PRODUCTS.find((p) => p.id === lineProduct(l))?.type));
  const left = SITE.freeShippingOver - cart.filter((l) => l.kind === "coffee" || l.kind === "accessory" || l.kind === "sub" || l.kind === "giftcard").reduce((n, l) => n + l.price * l.qty, 0);
  const other = coffees.filter((p) => !types.has(p.type));
  const pool = other.length ? other : coffees;
  const coffee = (left > 0 && pool.find((p) => p.price >= left)) || pool[0];
  const extra = (types.has("Filter") && extras.find((a) => a.art === "dripper")) || extras[0];
  const picks = [coffee && { kind: "coffee", item: coffee }, extra && { kind: "accessory", item: extra }].filter(Boolean);
  if (picks.length < 2) {
    const more = coffees.find((p) => p !== coffee);
    if (more) picks.push({ kind: "coffee", item: more });
  }
  return picks.slice(0, 2).map((x) => ({ ...x, freeShip: left > 0 && x.item.price >= left }));
}

function renderSuggestions() {
  const box = $("[data-cart-suggest]");
  if (!box) return;
  const picks = cartSuggestions();
  box.hidden = !picks.length;
  box.innerHTML = picks.length
    ? `<p class="cart-suggest-title">You might like</p>
      <ul>${picks
        .map(({ kind, item, freeShip }) => {
          const href = `products/${encodeURIComponent(item.id)}`;
          const art = kind === "accessory" ? accessoryArt(item) : productArt(item);
          // A tee's size is picked right here (the phone's own picker), then it's added.
          const needsChoice = kind === "accessory" && accessoryNeedsChoice(item);
          return `<li class="suggest">
            <a class="suggest-thumb" href="${href}" tabindex="-1" aria-hidden="true">${art}</a>
            <a class="suggest-info" href="${href}"><span class="suggest-name">${esc(item.short || item.name)}</span>
              <small>${kind === "coffee" ? `${esc(item.type)} · ` : ""}${money(item.price)}${freeShip ? ` · <mark class="save-mark">Free shipping</mark>` : ""}</small></a>
            ${needsChoice ? `<label class="suggest-add suggest-pick"><span aria-hidden="true">Size</span><select data-suggest-size="${esc(item.id)}" aria-label="Choose a size for ${esc(item.short || item.name)}"><option value="" selected disabled>Size</option>${(item.sizes || []).map((z) => `<option value="${esc(z)}"${item.leftBy?.[z] === 0 ? " disabled" : ""}>${esc(z)}${item.leftBy?.[z] === 0 ? " (Sold out)" : ""}</option>`).join("")}</select></label>` : `<button type="button" class="suggest-add" data-suggest-add="${kind}:${esc(item.id)}" aria-label="Add ${esc(item.short || item.name)}">+</button>`}
          </li>`;
        })
        .join("")}</ul>`
    : "";
}

function freeShipMessage() {
  const amount = shippable();
  if (amount === 0) return "";
  const left = SITE.freeShippingOver - amount;
  const pct = Math.min(100, (amount / SITE.freeShippingOver) * 100);
  const text = left > 0 ? `You're ${money(left)} away from free shipping` : "You've unlocked free shipping";
  return `<p>${text}</p><div class="meter"><span style="width:${pct}%"></span></div>`;
}

// Where a cart line leads: its product page (a subscription's coffee or tea too), the class, or
// the café menu. Nothing for a line whose product is gone.
function cartLineHref(l) {
  if (l.kind === "class") return `classes?id=${encodeURIComponent(l.product)}`;
  if (l.kind === "giftcard") return "gift-cards";
  if (l.kind === "pickup") return "order-ahead";
  const sub = l.sub?.coffee || "";
  const id = sub ? sub.replace(/^t:/, "") : l.product || l.key.split(":")[1];
  return PRODUCTS.some((p) => p.id === id) || ACCESSORIES.some((a) => a.id === id) ? `products/${encodeURIComponent(id)}` : sub ? "subscriptions" : "";
}

// A cart line's picture: the card, class, drink, accessory (in its color), tea or bag.
const cartArt = (l) =>
  l.kind === "giftcard" ? `<div class="gc-thumb">${giftCardArt(l.price)}</div>` : l.kind === "class" ? classThumb(l) : l.kind === "pickup" ? cafeThumb(l) : l.kind === "accessory" ? accessoryArt(ACCESSORIES.find((a) => a.id === l.product) || {}, l.color) : /^t:/.test(l.sub?.coffee || "") ? accessoryArt(ACCESSORIES.find((a) => a.id === l.sub.coffee.slice(2)) || {}) : l.image ? `<img class="product-photo" src="${esc(l.image)}" alt="">` : bag(l.color, l.kind === "coffee" ? coffeeFacts(PRODUCTS.find((p) => p.id === (l.product || l.key.split(":")[1]))) : { kicker: "Subscription", title: l.title.replace(/ (Gift )?Subscription.*$/, "") });

// A coffee line's size and grind can be changed in the cart (Edit): a quick Add from a card puts
// in 250g of whole beans, and this is where that's changed without going back to the coffee.
let cartEditing = null; // the line being edited (its key)
const cartProduct = (l) => (l.kind === "coffee" ? PRODUCTS.find((p) => p.id === lineProduct(l)) : null);
const cartEditable = (l) => Boolean(cartProduct(l));
function cartEditor(l) {
  const p = cartProduct(l);
  const size = l.size || l.key.split(":")[2];
  const grind = l.grind || l.key.split(":")[3];
  const chips = (name, values, on, off = (_v) => false) =>
    `<div class="options" role="radiogroup" aria-label="${name}">${values
      .map((v) => `<label><input type="radio" name="cart-${name.toLowerCase()}" value="${esc(v)}" data-cart-opt="${name.toLowerCase()}"${v === on ? " checked" : ""}${off(v) ? " disabled" : ""}><span>${esc(v)}</span></label>`)
      .join("")}</div>`;
  return `<div class="cart-edit" data-cart-editor="${esc(l.key)}">${chips("Size", ["250g", "1kg"], size, (v) => v === "1kg" && unitsLeft(p) < 4 * l.qty)}${grindsFor(p).length > 1 ? chips("Grind", grindsFor(p), grind) : ""}</div>`;
}
document.addEventListener("change", (e) => {
  const opt = (e.target as any).closest?.("[data-cart-opt]");
  if (!opt) return;
  const box = opt.closest("[data-cart-editor]");
  const i = cart.findIndex((l) => l.key === box.dataset.cartEditor);
  const was = cart[i];
  const p = was && cartProduct(was);
  if (!p) return;
  const size = $("[data-cart-opt=size]:checked", box)?.value || was.size;
  const grind = $("[data-cart-opt=grind]:checked", box)?.value || was.grind;
  const line = coffeeLine(p, size, grind, was.qty, was.gift ? { recipient: was.recipient, note: was.note || "" } : null);
  const same = cart.findIndex((l, n) => n !== i && l.key === line.key);
  if (same >= 0) {
    cart[same].qty += was.qty;
    cart.splice(i, 1);
  } else cart[i] = line;
  cartEditing = line.key;
  saveCart();
  $(`[data-cart-editor="${CSS.escape(line.key)}"] [data-cart-opt="${opt.dataset.cartOpt}"]:checked`)?.focus({ preventScroll: true });
});
document.addEventListener("click", (e) => {
  const edit = (e.target as any).closest?.("[data-cart-edit]");
  if (!edit) return;
  cartEditing = cartEditing === edit.dataset.cartEdit ? null : edit.dataset.cartEdit;
  renderCart();
});

function renderCart() {
  $$("[data-cart-count]").forEach((el) => (el.textContent = cartCount()));
  const list = $("[data-cart-lines]");
  if (!list) return;
  list.innerHTML = cart.length
    ? cart
        .map(
          (l) => `
      <li class="cart-line">
        <${cartLineHref(l) ? `a href="${cartLineHref(l)}" tabindex="-1" aria-hidden="true"` : "div"} class="cart-thumb">${cartArt(l)}</${cartLineHref(l) ? "a" : "div"}>
        <div class="cart-info">
          <p>${cartLineHref(l) ? `<a class="cart-name" href="${cartLineHref(l)}">${esc(lineName(l))}</a>` : esc(lineName(l))}</p>
          <p class="muted">${esc(lineMeta(l))}</p>
          ${lineGift(l) ? `<p class="muted">Gift for ${esc(lineGift(l))}</p>` : ""}
          <div class="cart-actions">
            <div class="stepper" role="group" aria-label="Quantity">
              <button type="button" data-qty="${esc(l.key)}" data-delta="-1" aria-label="Decrease">−</button>
              <span>${l.qty}</span>
              <button type="button" data-qty="${esc(l.key)}" data-delta="1" aria-label="Increase">+</button>
            </div>
            ${cartEditable(l) ? `<button type="button" class="link-button" data-cart-edit="${esc(l.key)}" aria-expanded="${cartEditing === l.key}">${cartEditing === l.key ? "Done" : "Edit"}</button>` : ""}
            <button type="button" class="link-button" data-qty="${esc(l.key)}" data-delta="-${l.qty}">Remove</button>
          </div>
          ${cartEditing === l.key ? cartEditor(l) : ""}
        </div>
        <p class="cart-price">${money(l.price * l.qty)}</p>
      </li>`
        )
        .join("")
    : `<li class="cart-empty"><p>Your cart is empty.</p><a href="shop" data-close-link>Keep shopping</a></li>`;
  $("[data-cart-subtotal]").textContent = money(cartSubtotal());
  $("[data-free-ship]").innerHTML = freeShipMessage();
  renderSuggestions();
  $("[data-checkout-link]").classList.toggle("is-disabled", cart.length === 0);
  $(".drawer-foot").hidden = cart.length === 0;
}

/* ── Express checkout: Apple Pay or Google Pay, in the cart and at the top of checkout ──
   The device decides: Square only makes an Apple Pay button where Apple Pay is set up (iPhone,
   iPad, Mac with a card in Wallet), and Google Pay is offered on Android only, never next to
   Apple Pay. It's for coffee bags sent to the customer or picked up; subscriptions, gifts sent
   to someone else and café orders use the checkout form. The wallet's sheet collects name,
   email, phone and address and offers delivery or pickup; paying there places the order
   (priced again by the server, courier or post by the address, as any order) and pays it with
   the wallet's one-time token, but only if the server's total matches what the sheet showed. */
const loadSquareSdk = (url) =>
  window.Square
    ? Promise.resolve(window.Square)
    : new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = url;
        script.onload = () => (window.Square ? resolve(window.Square) : reject(new Error("Couldn't load the payment form.")));
        script.onerror = () => reject(new Error("Payment form didn't load. Check your connection."));
        document.head.append(script);
      });
let shopConfig = null;
const getShopConfig = () => (shopConfig ||= api("/api/config").catch(() => ({})));
const expressCart = () => cart.length > 0 && cart.every((l) => (l.kind === "coffee" || l.kind === "accessory") && !l.gift);
const coffeeOrderLine = (l) => {
  const parts = l.key.split(":");
  if (l.kind === "accessory") return { kind: "accessory", qty: l.qty, product: l.product || parts[1], size: l.size || parts[2] || "", color: l.color || parts[3] || "" };
  return { kind: "coffee", qty: l.qty, product: l.product || parts[1], size: l.size || parts[2], grind: l.grind || parts[3], gift: false, recipient: "", note: "" };
};

// totals(option) → { ship, off }: delivery cost and discount for "delivery" or "pickup".
// extra() → more fields for the order; done(paid) → what happens once it's paid.
async function mountExpress({ box, apple, google, error, totals, prefer = () => "delivery", extra = () => ({}), done, debug = () => {}, hint = "" }: any) {
  debug(`Apple Pay on this browser: ${window.ApplePaySession ? "yes" : "no"}${window.ApplePaySession ? ` · card ready: ${(() => { try { return ApplePaySession.canMakePayments() ? "yes" : "no"; } catch (e) { return e.message; } })()}` : ""}`);
  debug(`Android: ${isAndroid ? "yes" : "no"} · cart can use express: ${expressCart() ? "yes" : "no (subscription, gift or café item)"}`);
  const config = await getShopConfig();
  debug(`Square payments on the server: ${config.payments ? "yes" : "no (keys missing in Render)"}${config.square ? ` · app ${String(config.square.applicationId).slice(0, 14)}… · ${/^sandbox-/.test(config.square.applicationId) ? "sandbox" : "production"}` : ""}`);
  if (!config.square || !box) return null;
  if (hasTaxable(cart)) taxRateAsk({ pickup: "roastery" }); // ready for the sheet's pickup option

  // Shipping costs USPS's price to the ZIP code the wallet gives (once it's in).
  let walletZip = "";
  let walletWhere = null; // { city, state, postcode } once the wallet gives an address
  // Sales tax on the cart: at Roastery House for pickup, else at the wallet's address (the
  // default rate until it's in, for a cart that has taxable items).
  const taxFor = (option, off) => {
    if (!cart.some(taxClass)) return 0;
    const rates = option === "pickup" ? taxRateNow({ pickup: "roastery" }) : walletWhere ? taxRateNow(walletWhere) : homeRates();
    return salesTaxFor(cart, { discount: off, rates: rates === undefined ? homeRates() : rates, pool: cart });
  };
  const tot = (option) => {
    let t = totals(option);
    if (!t) return t;
    const fee = option === "delivery" && t.ship > 0 ? postageNow(walletZip, parcelOz(cart)) : null;
    t = fee != null ? { ...t, ship: fee } : t.ship == null ? { ...t, ship: SITE.shippingFlat } : t;
    return { ...t, tax: taxFor(option, t.off || 0) };
  };
  // The ways to get it, the one chosen on the page first (Apple Pay opens on the first): a
  // local courier (when the page's address is in the area), shipping, or pickup.
  const choices = () => {
    const list = [
      ["courier", (t) => t.label || "Local delivery"],
      ["delivery", (t) => (t.ship ? "Shipping" : "Free shipping")],
      ["pickup", () => "Pick up at Roastery House"],
    ]
      .map(([id, label]: any) => {
        const t = tot(id);
        return t ? { id, label: label(t), amount: t.ship.toFixed(2) } : null;
      })
      .filter(Boolean);
    const first = list.find((o) => o.id === prefer()) || list[0];
    return [first, ...list.filter((o) => o !== first)];
  };
  const sheet = (option = choices()[0].id) => {
    const { ship, off, tax } = tot(option) || tot("delivery");
    const total = Math.max(0, cartSubtotal() + ship + tax - off);
    const lineItems = [{ label: "Subtotal", amount: cartSubtotal().toFixed(2) }, ...(off ? [{ label: "Discount", amount: (-off).toFixed(2) }] : []), { label: option === "pickup" ? "Pickup" : "Delivery", amount: ship.toFixed(2) }, ...(tax ? [{ label: "Tax", amount: tax.toFixed(2) }] : [])];
    return { total: { amount: total.toFixed(2), label: SITE.name }, lineItems };
  };
  const options = choices;
  // Nothing to pay (a code covers it all): no wallet, the order is placed without a card.
  const free = () => Number(sheet().total.amount) <= 0;

  const pay = async (wallet) => {
    error.textContent = "";
    try {
      const result = await wallet.tokenize();
      if (result.status !== "OK") {
        if (result.status !== "Cancel") throw new Error(result.errors?.[0]?.message || "That didn't go through. Try again.");
        return;
      }
      const ship = result.details?.shipping || {};
      const who = { ...(result.details?.billing || {}), ...(ship.contact || {}) };
      const pickup = ship.option?.id === "pickup";
      const courier = ship.option?.id === "courier";
      const order = await api("/api/orders", {
        method: "POST",
        body: {
          name: [who.givenName, who.familyName].filter(Boolean).join(" "),
          email: who.email || result.details?.billing?.email || "",
          phone: who.phone || "",
          express: true, // Apple Pay or Google Pay: the wallet's contact, which may have no phone
          fulfilment: pickup ? "Pickup" : "Delivery",
          // The way chosen in the sheet, and the courier's fee it showed.
          delivery: courier ? "courier" : "ship",
          courierFee: courier ? totals("courier")?.ship ?? null : null,
          postage: !pickup && !courier ? tot("delivery").ship : null,
          tax: tot(pickup ? "pickup" : courier ? "courier" : "delivery")?.tax ?? null,
          address: pickup ? "" : (who.addressLines || []).join(", "),
          city: pickup ? "" : who.city || "",
          state: pickup ? "" : who.state || "",
          postcode: pickup ? "" : who.postalCode || "",
          notes: "",
          promo: "",
          lines: cart.map(coffeeOrderLine),
          cafe: null,
          ...extra(),
        },
      });
      // Charge only what the sheet showed; if the server's price differs, stop before paying.
      const shown = Number(sheet(pickup ? "pickup" : courier ? "courier" : "delivery").total.amount);
      if (Math.abs(order.chargeNow - shown) > 0.009) throw new Error(`Total changed to ${money(order.chargeNow)}. You weren't charged. Please try again.`);
      const paid = await api("/api/orders/pay", { method: "POST", body: { number: order.number, payToken: order.payToken, sourceId: result.token, wallet: result.details?.method } });
      done(paid);
    } catch (err) {
      error.textContent = `${err.message || "That didn't go through."}${hint}`;
    }
  };

  let request = null;
  let shown = false;
  const refresh = () => {
    if (!shown) return;
    box.hidden = !expressCart() || free();
    try {
      request?.update?.({ ...sheet(), shippingOptions: options() });
    } catch {
      /* the sheet takes the new totals next time it opens */
    }
  };
  document.addEventListener("cartchange", refresh);

  try {
    const Square = await loadSquareSdk(config.square.sdkUrl);
    const payments = Square.payments(config.square.applicationId, config.square.locationId);
    request = payments.paymentRequest({ countryCode: "US", currencyCode: SITE.currencyCode, ...sheet(), requestShippingContact: true, requestBillingContact: true, shippingOptions: options() });
    // The sheet asks again when the address or option changes: US addresses only.
    request.addEventListener?.("shippingcontactchanged", async (contact) => {
      if (contact?.countryCode && contact.countryCode !== "US") return { error: "We deliver within the US only." };
      walletZip = contact?.postalCode || "";
      walletWhere = { city: contact?.city || "", state: contact?.state || "", postcode: walletZip };
      await Promise.all([
        postageAsk(walletZip, parcelOz(cart), { city: contact?.city || "", state: contact?.state || "" }),
        cart.some(taxClass) && walletWhere.state && walletZip ? taxRateAsk(walletWhere) : null,
        cart.some(taxClass) ? taxRateAsk({ pickup: "roastery" }) : null,
      ]);
      return { ...sheet(), shippingOptions: options() };
    });
    request.addEventListener?.("shippingoptionchanged", (option) => sheet(option?.id));
    let wallet = null;
    try {
      wallet = await payments.applePay(request);
      apple.hidden = false;
      apple.onclick = () => pay(wallet);
      debug("Square Apple Pay: ready, button shown");
    } catch (e) {
      debug(`Square Apple Pay: ${e?.name || ""} ${e?.message || e}`);
    }
    if (!wallet && isAndroid) {
      try {
        wallet = await payments.googlePay(request);
        await wallet.attach(`#${google.id}`, { buttonColor: "black", buttonSizeMode: "fill", buttonType: "checkout" });
        google.hidden = false;
        google.onclick = () => pay(wallet);
      } catch {
        wallet = null;
      }
    }
    if (!wallet) return null;
    shown = true;
    box.hidden = !expressCart() || free();
    return { refresh, apple: !apple.hidden, pay: () => pay(wallet) };
  } catch (e) {
    debug(`Square didn't load: ${e?.message || e}`);
    return null;
  }
}

// In the cart (not on checkout, which has its own). On a phone that can pay this way it's set up
// in the background once the page has loaded, so the button is ready when the cart opens.
// Paying here shows the confirmation on the checkout page.
let cartExpress = null;
function startCartExpress() {
  if (cartExpress || document.body.dataset.page === "checkout" || !$("[data-cart-express]")) return;
  if (!window.ApplePaySession && !isAndroid) return; // no wallet button here: nothing to load
  cartExpress = (async () => {
    // The subscriber discount, as checkout and the server apply it to coffee bags; fetched
    // alongside the shop's payment settings and Square's script.
    const perk = api("/api/perk").then((r) => r.percent || 0).catch(() => 0);
    getShopConfig().then((c) => c.square && loadSquareSdk(c.square.sdkUrl).catch(() => {}));
    const percent = await perk;
    return mountExpress({
      box: $("[data-cart-express]"),
      apple: $("[data-cart-apple]"),
      google: $("#cart-google"),
      error: $("[data-cart-express-error]"),
      totals: (option) => {
        if (option === "courier") return null; // no address yet in the cart: shipping or pickup
        const coffee = cart.filter((l) => l.kind === "coffee").reduce((n, l) => n + l.price * l.qty, 0);
        const goods = coffee + cart.filter((l) => l.kind === "accessory").reduce((n, l) => n + l.price * l.qty, 0);
        const ship = option === "pickup" || goods >= SITE.freeShippingOver ? 0 : SITE.shippingFlat;
        return { ship, off: Math.round(coffee * percent) / 100 }; // the subscriber discount is for coffee
      },
      done: (paid) => {
        try {
          sessionStorage.setItem("bp-paid", JSON.stringify({ number: paid.number, total: paid.total, amounts: paid.amounts || null, summary: paid.summary, account: paid.account || null }));
        } catch {
          /* the confirmation email still arrives */
        }
        location.href = "checkout";
      },
    });
  })();
}

// Order Ahead items in the cart show their own drawing.
// The item's photo when it has one (as on the menu), otherwise its drawing. Keys are
// "pickup:<id>" or "pickup:<id>:<options>".
/* ── Calendar and classes (calendar, classes) ──
   Written in the back office (Calendar). An event is reserved here (free), bought through the
   cart (a class with a price), or linked elsewhere (a festival's own tickets). */

// "Wed, Oct 28 · 6:00 PM" and, for something longer, its end ("to 9:00 PM", "to Sun, Nov 8").
function calWhen(x, { time = true, end = true } = {}) {
  const day = (s) => new Date(`${s.slice(0, 10)}T12:00:00Z`).toLocaleDateString(LANG === "en" ? "en-US" : LANG, { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
  const hour = (s) => (s.length > 10 ? new Date(`2000-01-01T${s.slice(11, 16)}:00Z`).toLocaleTimeString(LANG === "en" ? "en-US" : LANG, { hour: "numeric", minute: "2-digit", timeZone: "UTC" }) : "");
  const start = [day(x.startsAt), time && hour(x.startsAt)].filter(Boolean).join(" · ");
  if (!x.endsAt || !end) return start;
  if (x.endsAt.slice(0, 10) === x.startsAt.slice(0, 10)) return time && hour(x.endsAt) ? `${start} to ${hour(x.endsAt)}` : start;
  return `${start} to ${[day(x.endsAt), time && hour(x.endsAt)].filter(Boolean).join(" · ")}`;
}

// Text written in the back office: paragraphs, kept as written.
const calBody = (text) =>
  String(text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

// A class or event without its own photo: one of ours that fits its name, with its date on it.
const CAL_PHOTOS: [RegExp, string][] = [
  [/latte|milk|cortado|cappuccino/i, "assets/cortado.jpg"],
  [/espresso|shot|barista/i, "assets/bar-iced.jpg"],
  [/brew|pour|filter|v60|drip/i, "assets/dripper.jpg"],
  [/cupping|tasting|taste/i, "assets/tasting.jpg"],
  [/tea|matcha|oolong/i, "assets/tea-three-cups.jpg"],
];
const calPhoto = (x) => CAL_PHOTOS.find(([re]) => re.test(x.title || ""))?.[1] || "assets/library/pour-ceramic-walnut.jpg";
const calDay = (x, opts) => new Date(`${x.startsAt.slice(0, 10)}T12:00:00Z`).toLocaleDateString(LANG === "en" ? "en-US" : LANG, { ...opts, timeZone: "UTC" });
const calArt = (x) =>
  x.image
    ? `<img src="${esc(x.image)}" alt="" loading="lazy">`
    : x.title
      ? `<img src="${calPhoto(x)}" alt="" loading="lazy"><span class="cal-art-chip"><b>${esc(calDay(x, { day: "numeric" }))}</b> ${esc(calDay(x, { month: "short" }))}</span>`
      : `<span class="cal-art-date"><b>${esc(calDay(x, { day: "numeric" }))}</b>${esc(calDay(x, { month: "short" }))}</span>`;

const classThumb = (l) => `<span class="cal-art cal-art-thumb">${calArt({ image: l.image, title: l.title, startsAt: l.startsAt || "2000-01-01" })}</span>`;

const placesLeft = (x) => (x.left !== null && x.left <= 5 && x.left > 0 ? `<p class="cal-left">${x.left === 1 ? "1 place left" : `${x.left} places left`}</p>` : "");

// "13:00" → "1 PM", "11:30" → "11:30 AM".
const slotTime = (t) => { const h = Number(t.slice(0, 2)); const m = t.slice(3, 5); return `${h % 12 || 12}${m === "00" ? "" : `:${m}`} ${h < 12 ? "AM" : "PM"}`; };

// What to do about it: reserve, add to cart, follow a link, or nothing (just come by).
function calAction(x) {
  if (x.past) return "";
  if (x.full) return `<p class="cal-full">Full</p>`;
  if (x.booking === "link" && x.link) return `<a class="button is-outline cal-cta" href="${esc(x.link)}" target="_blank" rel="noopener">${esc(x.linkLabel || "Find out more")}</a>`;
  const slots = x.slots || [];
  const slotPick = slots.length ? `<fieldset class="cal-slot-pick"><legend>Time</legend>${slots.map((sl) => `<label class="cal-slot${sl.left === 0 ? " is-full" : ""}"><input type="radio" name="slot" value="${esc(sl.start)}" data-end="${esc(sl.end)}" data-left="${sl.left ?? 4}"${sl.left === 0 ? " disabled" : ""}><span>${esc(slotTime(sl.start))}–${esc(slotTime(sl.end))}</span><small>${sl.left === 0 ? "Full" : sl.left === null ? "" : `${sl.left} left`}</small></label>`).join("")}</fieldset>` : "";
  if (x.booking === "pay") {
    // The shop isn't open yet: no Buy Ticket, just a note (the price still shows on the card).
    if (!shopOpen()) return `<p class="cal-soon">Tickets aren't on sale online yet.</p>`;
    const buy = `<button type="button" class="button cal-cta" data-cal-add="${esc(x.id)}">Buy Ticket · ${money(x.price)}</button>`;
    return slots.length ? `<div class="cal-buy" data-cal-buy>${slotPick}<p class="sub-error" data-cal-error role="alert"></p>${buy}</div>` : buy;
  }
  if (x.booking === "reserve") {
    const most = Math.min(4, (slots.length ? Math.max(0, ...slots.map((sl) => sl.left ?? 4)) : x.left) ?? 4);
    return `<button type="button" class="button cal-cta" data-cal-reserve-open="${esc(x.id)}">Reserve${x.price ? "" : " · Free"}</button>
      <form class="form cal-reserve" data-cal-reserve="${esc(x.id)}" hidden novalidate>
        <div class="form-grid">
          <label>Name<input name="name" required autocomplete="name"></label>
          <label>Email<input name="email" type="email" required autocomplete="email"></label>
        </div>
        ${slotPick}
        ${most > 1 ? `<label>Places<select name="guests">${Array.from({ length: most }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("")}</select></label>` : `<input type="hidden" name="guests" value="1">`}
        <p class="sub-error" data-cal-error role="alert"></p>
        <button class="button" type="submit">Reserve${x.price ? "" : " · Free"}</button>
      </form>`;
  }
  return "";
}

// So they don't forget: the calendar file (opens Calendar on an iPhone; Outlook) or Google Calendar.
const calAddButtons = (id) =>
  `<div class="cal-add"><a class="cal-add-google" href="/api/calendar/${encodeURIComponent(id)}.ics">Add to Calendar</a><a class="cal-add-google" href="/api/calendar/${encodeURIComponent(id)}/google" target="_blank" rel="noopener">Google Calendar</a></div>`;

function wireCalendar(root, items) {
  root.addEventListener("click", (e) => {
    const open = e.target.closest("[data-cal-reserve-open]");
    if (open) {
      const form = $(`[data-cal-reserve="${open.dataset.calReserveOpen}"]`, root);
      form.hidden = false;
      open.hidden = true;
      form.name.focus();
      return;
    }
    const add = e.target.closest("[data-cal-add]");
    if (add) {
      const x = items.find((i) => i.id === add.dataset.calAdd);
      if (!x) return;
      // With time slots: the ticket is for the time picked.
      const box = add.closest("[data-cal-buy]");
      const picked = box?.querySelector("[name=slot]:checked");
      if (box && !picked) {
        e.stopPropagation(); // the pop-up stays open
        $("[data-cal-error]", box).textContent = "Choose a time.";
        return;
      }
      const when = picked ? `${calWhen(x, { time: false })} · ${slotTime(picked.value)}–${slotTime(picked.dataset.end)}` : calWhen(x);
      addLine({ key: `class:${x.id}${picked ? `@${picked.value}` : ""}`, kind: "class", product: x.id, ...(picked && { slot: picked.value }), title: x.title, variant: [when, x.place].filter(Boolean).join(" · "), price: x.price, image: x.image, startsAt: x.startsAt });
    }
  });
  // A slot caps how many places can be picked.
  root.addEventListener("change", (e) => {
    if (e.target.name !== "slot") return;
    const error = e.target.closest("[data-cal-buy]")?.querySelector("[data-cal-error]");
    if (error) error.textContent = "";
    if (!e.target.form) return;
    const select = e.target.form.guests;
    if (select.tagName !== "SELECT") return;
    const most = Math.min(4, Number(e.target.dataset.left) || 1);
    const was = Number(select.value) || 1;
    select.innerHTML = Array.from({ length: most }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join("");
    select.value = String(Math.min(was, most));
  });
  root.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-cal-reserve]");
    if (!form) return;
    e.preventDefault();
    const error = $("[data-cal-error]", form);
    error.textContent = "";
    if (!form.name.value.trim() || !form.email.value.trim() || !form.email.validity.valid) {
      error.textContent = "Add your name and email.";
      return flagFields(form);
    }
    const slot = form.querySelector("[name=slot]:checked")?.value;
    if (form.querySelector("[name=slot]") && !slot) {
      error.textContent = "Choose a time.";
      return;
    }
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      const r = await api(`/api/calendar/${form.dataset.calReserve}/reserve`, { method: "POST", body: { name: form.name.value, email: form.email.value, guests: Number(form.guests.value) || 1, slot } });
      const email = form.email.value.trim();
      // Held until they confirm from their email (proof it's theirs).
      form.outerHTML = r.pending
        ? `<p class="cal-done" role="status"><strong>Check your email.</strong> Confirm with the link we sent to ${esc(email)} within 30 minutes to book your ${r.guests > 1 ? `${r.guests} places` : "place"}.</p>`
        : `<p class="cal-done" role="status"><strong>You're in${r.guests > 1 ? ` (${r.guests} places)` : ""}.</strong> See you there. The details are on their way to ${esc(email)}.</p>${calAddButtons(form.dataset.calReserve)}`;
    } catch (err) {
      error.textContent = err.message;
      button.disabled = false;
    }
  });
}

function cafeThumb(line) {
  const id = line.key.split(":")[1];
  const item = CAFE_MENU.flatMap((sec) => sec.items).find((i) => i.id === id);
  if (!item) return cupIcon();
  return `<span class="cafe-thumb">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : drinkSvg(item)}</span>`;
}

function cupIcon() {
  return `<svg class="cup" viewBox="0 0 400 400" aria-hidden="true">
    <rect width="400" height="400" fill="#e6e6e6"/>
    <path d="M130 150h140l-16 150a14 14 0 0 1-14 12H160a14 14 0 0 1-14-12z" fill="#fff"/>
    <rect x="120" y="128" width="160" height="24" rx="6" fill="#111"/>
    <rect x="150" y="210" width="100" height="40" fill="#111"/>
  </svg>`;
}

/* ── Opening hours ────────────────────────────────────────── */

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const toMinutes = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};
const fmtTime = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, "0")}${suffix}` : `${h12}${suffix}`;
};

function openStatus(loc, now = new Date()) {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const today = loc.hours[day];
  if (today) {
    const [o, c] = today.map(toMinutes);
    if (mins >= o && mins < c) return { open: true, text: `Open now · until ${fmtTime(c)}` };
    if (mins < o) return { open: false, text: `Opens ${fmtTime(o)} today` };
  }
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    if (loc.hours[d]) {
      const when = i === 1 ? "tomorrow" : DAYS[d];
      return { open: false, text: `Closed · opens ${fmtTime(toMinutes(loc.hours[d][0]))} ${when}` };
    }
  }
  return { open: false, text: "Closed" };
}

function hoursTable(loc) {
  // Show Mon..Sun, collapsing nothing; it's short.
  const order = [1, 2, 3, 4, 5, 6, 0];
  const today = new Date().getDay();
  return `<dl class="hours">${order
    .map((d) => {
      const h = loc.hours[d];
      return `<div class="${d === today ? "is-today" : ""}"><dt>${DAYS[d].slice(0, 3)}</dt><dd>${
        h ? `${fmtTime(toMinutes(h[0]))} – ${fmtTime(toMinutes(h[1]))}` : "Closed"
      }</dd></div>`;
    })
    .join("")}</dl>`;
}

// Pickup times: a 10-minute window starting every 10 minutes from opening (or `lead` minutes
// from now, today) until 15 minutes before closing. Times are minutes after midnight.
function slotsForDay(loc, date, now = new Date(), lead = 15) {
  const h = loc.hours[date.getDay()];
  if (!h) return [];
  const [open, close] = h.map(toMinutes);
  const isToday = date.toDateString() === now.toDateString();
  const earliest = isToday ? Math.ceil((now.getHours() * 60 + now.getMinutes() + lead) / 10) * 10 : open + (lead > 15 ? lead - 15 : 0);
  const slots = [];
  for (let t = Math.max(open, earliest); t <= close - 15; t += 10) slots.push(t);
  return slots;
}

// The next seven days, each with its pickup slots (empty when closed or past closing).
function pickupDays(loc, now = new Date(), lead = 15) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    return { date, slots: slotsForDay(loc, date, now, lead) };
  });
}

const dateKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// "9:10–9:20am": a 10-minute window starting at `mins`.
const windowLabel = (mins) => {
  const hm = (t) => `${Math.floor(t / 60) % 12 || 12}:${String(t % 60).padStart(2, "0")}`;
  const ap = (t) => (Math.floor(t / 60) % 24 < 12 ? "am" : "pm");
  return ap(mins) === ap(mins + 10) ? `${hm(mins)}–${hm(mins + 10)}${ap(mins)}` : `${hm(mins)}${ap(mins)}–${hm(mins + 10)}${ap(mins + 10)}`;
};

// "Today, 9:10–9:20am", or "As soon as possible" for "asap".
function pickupLabel(iso, now = new Date()) {
  if (iso === "asap") return "As soon as possible";
  const [day, hhmm] = iso.split("T");
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const diff = Math.round(((date as any) - (new Date(now.getFullYear(), now.getMonth(), now.getDate()) as any)) / 864e5);
  const name = diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : date.toLocaleDateString(LOCALE, { weekday: "short", day: "numeric", month: "short" });
  return `${name}, ${windowLabel(toMinutes(hhmm))}`;
}

// ASAP is offered while the location is open and still taking orders today.
const asapOpen = (loc, now = new Date(), lead = 15) => openStatus(loc, now).open && slotsForDay(loc, now, now, lead).length > 0;

// A pickup time is valid if it's still one of that location's slots (or ASAP while open).
function validPickup(loc, iso, now = new Date(), lead = 15) {
  if (iso === "asap") return asapOpen(loc, now, lead);
  if (!iso || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(iso)) return false;
  const [day, hhmm] = iso.split("T");
  const [y, m, d] = day.split("-").map(Number);
  return slotsForDay(loc, new Date(y, m - 1, d), now, lead).includes(toMinutes(hhmm));
}

function distanceKm([lat1, lon1], [lat2, lon2]) {
  const rad = (x) => (x * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}


/* ── Directions ───────────────────────────────────────────── */

// Shop coordinates come from js/data.js, or the server looks them up from the address.
const locationsReady = (async () => {
  if (LOCATIONS.every((l) => Array.isArray(l.coords))) return;
  try {
    const { locations } = await api("/api/locations");
    for (const { id, coords } of locations) {
      const l = LOCATIONS.find((x) => x.id === id);
      if (l && !Array.isArray(l.coords) && Array.isArray(coords)) l.coords = coords;
    }
  } catch {
    /* static site: only coords from data.js */
  }
})();

// Directions open Google Maps (the app on phones); no maps are drawn on the site.
// Café order placed: when it's ready, where, what's in it and what to do on arrival.
function cafeConfirmation(cafe, lines, number) {
  const loc = LOCATIONS.find((l) => l.id === cafe.location);
  const delivery = cafe.mode === "delivery";
  const at = fmtTime(toMinutes(cafe.time.split("T")[1]));
  const label = pickupLabel(cafe.time).replace(/^(Today|Tomorrow)/, (w) => w.toLowerCase());
  const when = cafe.asap ? `${delivery ? "Arriving" : "Ready"} around ${at}` : `${delivery ? "Arriving" : "Ready"} ${label}`;
  return `
    <div class="cafe-confirm-head">
      <h1>See You Soon, ${esc(cafe.firstName)}!</h1>
      <p class="cafe-confirm-when">${esc(when)}</p>
      <p class="muted">Order ${esc(number)}</p>
    </div>
    <div class="cafe-confirm-where">
      <div><strong>${esc(cafe.locationName)}</strong>${loc ? `<span>${esc(loc.address.join(", "))}</span>` : ""}</div>
      ${loc && !delivery ? `<a href="${gmaps.directions(loc)}" target="_blank" rel="noopener">Directions</a>` : ""}
    </div>
    <p class="section-label">${lines.reduce((n, l) => n + l.qty, 0)} ${lines.reduce((n, l) => n + l.qty, 0) === 1 ? "Item" : "Items"} In Your Order</p>
    <ul class="cafe-confirm-items">${lines.map((l) => `<li><span>${l.qty} ×</span> ${esc(l.title)}</li>`).join("")}</ul>
    <div class="cafe-confirm-note">
      <strong>${delivery ? "Café Delivery" : "Pickup"}</strong>
      <p>${
        delivery
          ? `A courier brings it from ${esc(cafe.locationName)}. We'll email you a tracking link.`
          : `Ask at the counter for ${esc(cafe.firstName)}'s order. We'll email you when it's ready.`
      }</p>
    </div>`;
}

const gmaps = {
  directions: (l) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(l.coords ? l.coords.join(",") : [SITE.name, ...l.address].join(", "))}`,
};

// Contact: Roastery House on a muted street map you can drag and zoom. Leaflet and the
// OpenStreetMap tiles load in the browser; the static pin on grey stays if they fail.
function contactMap() {
  const box = $("[data-contact-map]");
  const loc = LOCATIONS.find((l) => l.id === "roastery");
  if (!box || !loc) return;
  const status = openStatus(loc);
  const card = $("[data-map-card]", box);
  card.innerHTML = `
    <div>
      <strong>${esc(loc.name)}</strong>
      <span>${esc(loc.address.join(", "))}</span>
      <span class="contact-map-status${status.open ? " is-open" : ""}">${esc(status.text)}</span>
    </div>
    <a class="button is-outline" href="${gmaps.directions(loc)}" target="_blank" rel="noopener">Directions</a>`;

  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/js/vendor/leaflet-1.9.4.css";
  document.head.append(css);
  const js = document.createElement("script");
  js.src = "/js/vendor/leaflet-1.9.4.js";
  js.onload = () => {
    const L = window.L;
    const touch = matchMedia("(pointer: coarse)").matches;
    const map = L.map($("[data-map-frame]", box), {
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false, // the page scrolls; zoom with the buttons, a pinch or double-click
      dragging: !touch, // on a phone a swipe scrolls the page until the map is tapped
      minZoom: 12,
      maxZoom: 19,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
    const pin = $("[data-map-pin]", box);
    L.marker(loc.coords, {
      icon: L.divIcon({ className: "contact-map-marker", html: pin.innerHTML, iconSize: [48, 60], iconAnchor: [24, 58] }),
      keyboard: false,
      alt: loc.name,
    }).addTo(map);
    pin.remove();
    const home = (animate) => map.setView(loc.coords, 16, { animate });
    home(false);
    const zoom = $("[data-map-zoom]", box);
    zoom.hidden = false;
    $("[data-map-in]", zoom).addEventListener("click", () => map.zoomIn());
    $("[data-map-out]", zoom).addEventListener("click", () => map.zoomOut());
    $("[data-map-home]", zoom).addEventListener("click", () => home(true));
    const sync = () => {
      $("[data-map-in]", zoom).disabled = map.getZoom() >= map.getMaxZoom();
      $("[data-map-out]", zoom).disabled = map.getZoom() <= map.getMinZoom();
    };
    map.on("zoomend", sync);
    sync();
    // On a phone a swipe scrolls the page; a tap on the map lets it move.
    if (touch) map.once("click", () => map.dragging.enable());
    map.getContainer().setAttribute("aria-label", `Map of ${loc.name}, ${loc.address.join(", ")}`);
  };
  document.head.append(js);
}

/* ── Drink drawings ───────────────────────────────────────── */

// Food drawings for the Order Ahead menu, on a plate.
function foodSvg(item) {
  const plate = `<ellipse cx="200" cy="262" rx="140" ry="42" fill="#fff"/><ellipse cx="200" cy="258" rx="108" ry="30" fill="#f7f7f7"/>`;
  const crumbs = (c) => `<circle cx="150" cy="270" r="3" fill="${c}"/><circle cx="262" cy="266" r="2.5" fill="${c}"/><circle cx="238" cy="276" r="2" fill="${c}"/>`;
  const shapes = {
    croissant: `
      <g stroke="#b7803f" stroke-width="3">
        <ellipse cx="124" cy="246" rx="22" ry="16" fill="#d9a35c" transform="rotate(-25 124 246)"/>
        <ellipse cx="276" cy="246" rx="22" ry="16" fill="#d9a35c" transform="rotate(25 276 246)"/>
        <ellipse cx="158" cy="232" rx="30" ry="26" fill="#dfac66" transform="rotate(-15 158 232)"/>
        <ellipse cx="242" cy="232" rx="30" ry="26" fill="#dfac66" transform="rotate(15 242 232)"/>
        <ellipse cx="200" cy="224" rx="36" ry="34" fill="#e4b46e"/>
      </g>
      <path d="M186 206 q14 -8 28 0" fill="none" stroke="#f3d29a" stroke-width="5" stroke-linecap="round"/>
      ${item.topping ? `<path d="M168 214 l9 -5 M190 202 l10 -2 M214 204 l9 4 M236 216 l7 6 M150 226 l7 -6" stroke="#fff" stroke-width="5" stroke-linecap="round"/>` : ""}
      ${crumbs("#d9a35c")}`,
    painchoc: `
      <rect x="128" y="200" width="144" height="62" rx="20" fill="#d39a52"/>
      <path d="M140 216 h120 M138 232 h124 M140 248 h120" stroke="#e7b674" stroke-width="5" stroke-linecap="round"/>
      <ellipse cx="131" cy="231" rx="6" ry="14" fill="#4a2a17"/>
      <ellipse cx="269" cy="231" rx="6" ry="14" fill="#4a2a17"/>
      ${crumbs("#d39a52")}`,
    scroll: `
      <circle cx="200" cy="232" r="62" fill="#d8a868"/>
      <path d="M200 232 m0 -8 a8 8 0 1 1 -8 8 a18 18 0 1 1 18 18 a30 30 0 1 1 -30 -30 a44 44 0 1 1 44 44" fill="none" stroke="#9a6a35" stroke-width="6" stroke-linecap="round"/>
      <path d="M160 200 q10 10 20 0 t20 0 t20 0 t20 0" fill="none" stroke="#fff" stroke-width="6" stroke-linecap="round" opacity="0.9"/>`,
    loaf: `
      <rect x="138" y="190" width="124" height="78" rx="8" fill="#a8713f"/>
      <rect x="146" y="198" width="108" height="62" rx="5" fill="#c99a62"/>
      <circle cx="178" cy="222" r="9" fill="#e8d6a0"/><circle cx="214" cy="238" r="8" fill="#e8d6a0"/><circle cx="232" cy="214" r="6" fill="#e8d6a0"/>
      <rect x="226" y="172" width="34" height="22" rx="4" fill="#f4d96c" transform="rotate(10 243 183)"/>`,
    cookie: `
      <circle cx="200" cy="235" r="66" fill="#c99556"/>
      <circle cx="200" cy="235" r="66" fill="none" stroke="#b07f43" stroke-width="5"/>
      ${[[175, 210], [222, 214], [196, 240], [168, 255], [232, 252], [208, 270], [182, 226]].map(([x, y]) => `<rect x="${x - 6}" y="${y - 5}" width="12" height="10" rx="3" fill="#3b2416"/>`).join("")}
      ${crumbs("#c99556")}`,
    toastie: `
      <path d="M118 262 L200 170 L200 262Z" fill="#e2b779" stroke="#b88040" stroke-width="8" stroke-linejoin="round"/>
      <path d="M210 262 L210 172 L292 262Z" fill="#e2b779" stroke="#b88040" stroke-width="8" stroke-linejoin="round"/>
      <path d="M205 210 l0 46 M150 246 q8 14 18 4 q8 12 18 2" stroke="#f2c94c" stroke-width="8" stroke-linecap="round" fill="none"/>
      <path d="M232 248 l26 0 M222 228 l18 0" stroke="#c8873c" stroke-width="5" stroke-linecap="round"/>`,
    toast: `
      <path d="M140 190 q0 -26 30 -26 h60 q30 0 30 26 v76 h-120z" fill="#d6a265"/>
      <path d="M150 196 q0 -20 24 -20 h52 q24 0 24 20 v62 h-100z" fill="#ebc890"/>
      <ellipse cx="200" cy="222" rx="44" ry="30" fill="#8db255"/>
      <circle cx="184" cy="214" r="4" fill="#c0392b"/><circle cx="214" cy="228" r="3.5" fill="#c0392b"/><circle cx="204" cy="208" r="3" fill="#2c3e1f"/>`,
    bowl: `
      <path d="M118 210 h164 a82 70 0 0 1 -164 0z" fill="#fbfbfb" stroke="#e6e6e6" stroke-width="3"/>
      <ellipse cx="200" cy="210" rx="82" ry="20" fill="#f3efe6"/>
      <ellipse cx="185" cy="206" rx="46" ry="12" fill="#c9995a"/>
      <circle cx="228" cy="204" r="9" fill="#7b3f8f"/><circle cx="244" cy="210" r="8" fill="#c0392b"/><circle cx="214" cy="212" r="7" fill="#7b3f8f"/>`,
  };
  return `<svg class="drink" viewBox="0 0 400 400" aria-hidden="true"><g transform="translate(200 236) scale(1.25) translate(-200 -236)">${plate}${shapes[item.shape] || shapes.cookie}</g></svg>`;
}

function drinkSvg(item) {
  if (item.style === "food") return foodSvg(item);
  if (item.style === "iced") {
    return `<svg class="drink" viewBox="0 0 400 400" aria-hidden="true">
      <ellipse cx="200" cy="338" rx="70" ry="6" fill="#000" opacity="0.07"/>
      <rect x="226" y="58" width="9" height="120" rx="4" fill="#111" transform="rotate(12 230 118)"/>
      <path d="M138 110h124l-14 222a10 10 0 0 1-10 9h-76a10 10 0 0 1-10-9z" fill="#fff" opacity="0.55"/>
      <path d="M143 160h114l-11 172a10 10 0 0 1-10 9h-72a10 10 0 0 1-10-9z" fill="${item.color}"/>
      <rect x="160" y="150" width="34" height="30" rx="6" fill="#fff" opacity="0.6" transform="rotate(-10 177 165)"/>
      <rect x="200" y="165" width="32" height="28" rx="6" fill="#fff" opacity="0.5" transform="rotate(14 216 179)"/>
      <rect x="176" y="196" width="30" height="26" rx="6" fill="#fff" opacity="0.35" transform="rotate(6 191 209)"/>
      <rect x="132" y="102" width="136" height="12" rx="4" fill="#fff" opacity="0.8"/>
      <circle cx="200" cy="280" r="17" fill="#fff" opacity="0.9"/>
      <path transform="translate(181.6 258.4) scale(0.8)" fill-rule="evenodd" d="M10 41V13h5.6L23 28.2 30.4 13H36v28h-5.3V22.6L23 37.6 15.3 22.6V41z" fill="#111"/>
    </svg>`;
  }
  return `<svg class="drink" viewBox="0 0 400 400" aria-hidden="true">
    <ellipse cx="200" cy="330" rx="74" ry="6" fill="#000" opacity="0.07"/>
    <path d="M140 132h120l-16 188a12 12 0 0 1-12 11h-64a12 12 0 0 1-12-11z" fill="#fbfbfb"/>
    <rect x="130" y="112" width="140" height="24" rx="7" fill="#f1f1f1"/>
    <rect x="160" y="104" width="80" height="12" rx="5" fill="#ebebeb"/>
    <path d="M148 196h104l-6 70h-92z" fill="#111"/>
    <circle cx="200" cy="231" r="17" fill="#fff"/>
    <path transform="translate(181.6 209.4) scale(0.8)" fill-rule="evenodd" d="M10 41V13h5.6L23 28.2 30.4 13H36v28h-5.3V22.6L23 37.6 15.3 22.6V41z" fill="#111"/>
  </svg>`;
}

/* ── Toast ────────────────────────────────────────────────── */

// A product's reviews (from customers who bought it): the stars by the name and the latest few
// below. Nothing shows until there's one.
const starRow = (n) => `<span class="star-row" aria-hidden="true">${"★".repeat(Math.round(n))}<span>${"★".repeat(5 - Math.round(n))}</span></span>`;
function mountReviews(id) {
  fetch(`/api/reviews?product=${encodeURIComponent(id)}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((d) => {
      if (!d?.summary) return;
      const { average, count } = d.summary;
      const top = $("[data-pdp-rating]");
      const label = `${average.toFixed(1)} out of 5, ${count} ${count === 1 ? "review" : "reviews"}`;
      top.innerHTML = `<a href="${esc(location.pathname)}#reviews" aria-label="${esc(label)}">${starRow(average)}<span>${average.toFixed(1)} · ${count} ${count === 1 ? "review" : "reviews"}</span></a>`;
      top.hidden = false;
      const box = $("[data-pdp-reviews]");
      box.id = "reviews";
      box.innerHTML = `<h2 class="section-label">Reviews</h2><ul>${d.reviews
        .map(
          (r) => `<li><p class="review-meta"><span class="visually-hidden">${r.rating} out of 5</span>${starRow(r.rating)}<strong>${esc(r.name)}</strong><time datetime="${esc(r.createdAt)}">${esc(new Date(r.createdAt).toLocaleDateString(LOCALE_US, { month: "short", day: "numeric", year: "numeric" }))}</time></p>${r.text ? `<p>${esc(r.text)}</p>` : ""}</li>`
        )
        .join("")}</ul>`;
      box.hidden = false;
    })
    .catch(() => {});
}

function toast(html) {
  let el = $("[data-toast]");
  if (!el) {
    document.body.insertAdjacentHTML("beforeend", `<div class="toast" data-toast role="status" aria-live="polite"></div>`);
    el = $("[data-toast]");
  }
  el.innerHTML = html;
  el.classList.add("is-visible");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove("is-visible"), 2600);
}

/* ── Product card ─────────────────────────────────────────── */

// A coffee's photo (uploaded in the back office), otherwise the drawn bag. A cut-out photo
// ("contain") stands on the tile over the same shadow as the bag, and lifts the same way.
function productArt(p) {
  if (!p.image) return bag(p.color, coffeeFacts(p));
  const img = `<img class="product-photo" src="${esc(p.image)}" alt="${esc(p.short || p.name)}" loading="lazy">`;
  // imageScale (optional): a wide cut-out (a tee) drawn smaller, to sit with the bags.
  // shadowScale (optional): the shadow's width for its footprint (a dripper stands on a small foot).
  // imageLift (optional): how far a flat piece (a spoon) floats above its shadow, as a share of the tile.
  const vars = [p.imageScale && `--art-scale:${Number(p.imageScale)}`, p.shadowScale && `--shadow-scale:${Number(p.shadowScale)}`, p.imageLift && `--art-lift:${Number(p.imageLift) * 100}%`].filter(Boolean);
  const scale = vars.length ? ` style="${vars.join(";")}"` : "";
  // imageFit "layered": the piece and its shadow on the surface it was photographed on, two
  // images the size of the tile, so the piece can rise off its shadow and settle back.
  if (p.imageFit === "layered") {
    return `<div class="photo-art is-layered"><img class="layer-shadow" src="${esc(p.shadowImage)}" alt="" aria-hidden="true" loading="lazy"><img class="product-photo layer-piece" src="${esc(p.image)}" alt="${esc(p.short || p.name)}" loading="lazy"></div>`;
  }
  return p.imageFit === "cover"
    ? `<div class="photo-art is-cover">${img}</div>`
    : `<div class="photo-art${p.imageLift ? " is-floating" : ""}"${scale}>${
        // shadowImage (optional): the piece's own outline, flattened and softened (a spoon), for the oval.
        p.shadowImage ? `<img class="photo-shadow is-shaped" src="${esc(p.shadowImage)}" alt="" aria-hidden="true" loading="lazy">` : `<span class="photo-shadow" aria-hidden="true"></span>`
      }${img}</div>`;
}

// "$26.00", or the sale price with the full price struck through.
function priceHtml(p, size = "250g") {
  const now = size === "1kg" ? p.price1kg : p.price;
  const was = size === "1kg" ? p.regular1kg : p.regular;
  return p.discount && was > now ? `<s class="price-was">${money(was)}</s> <span class="price-now">${money(now)}</span>` : money(now);
}

// A coffee's name without its trailing roast ("Ayla Bombe Natural, Ethiopia"): the roast is
// already shown next to it.
const bareName = (t) => String(t || "").replace(/, (Espresso|Filter)(?=$|\s\()/, "");

// A cart or order line as the customer reads it: the bare product name; the roast and options
// under it ("Espresso Roast · 250g · Whole Bean", so a roast never reads like a grind); and who a
// gift is for on a line of its own ("Gift for Jamie").
const lineGift = (l) => String(l.recipient || l.sub?.recipient || String(l.title || "").match(/(?:, gift for| Gift Subscription for) (.+)$/)?.[1] || "");
const lineName = (l) => bareName(String(l.title || "").replace(/, gift for .*$/, "").replace(/ Gift Subscription for .*$/, " Gift Subscription"));
const lineMeta = (l) => {
  const p = l.kind === "coffee" ? PRODUCTS.find((x) => x.id === (l.product || String(l.key || "").split(":")[1])) : null;
  return [p?.type && `${p.type} Roast`, l.variant].filter(Boolean).join(" · ");
};
const lineGiftHtml = (l, tag = "em") => (lineGift(l) ? `<${tag} class="line-gift">Gift for ${esc(lineGift(l))}</${tag}>` : "");

// Labels from the back office ("New Arrival", "Summer Sale −20%"), with Sold Out first, in red.
// One label at a time: Sold Out, else a sale, else the product's label.
// Cards also say "Only N Left"; a product's own page says it by the size chosen ({ low: false }).
const labelPills = (p, { low = true } = {}) => {
  if (p.soldOut) return `<span class="label-pill is-sold-out">Sold Out</span>`;
  const all = (p.labels || []).map((l) => (typeof l === "string" ? { name: l } : l));
  const l = all.find((x) => x.discount) || all[0];
  return `${l ? `<span class="label-pill${l.discount ? " is-sale" : ""}">${esc(l.name)}${l.discount ? ` −${l.discount}%` : ""}</span>` : ""}${low && lowStock(p) ? `<span class="label-pill is-low">Only ${p.left} Left</span>` : ""}`;
};
const hasPills = (p, { low = true } = {}) => p.soldOut || p.labels?.length || (low && lowStock(p));

const DAY_LONG = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// The next roast day on or after tomorrow, e.g. "Thursday 16 October".
function nextRoastDate(now = new Date()) {
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    if ((SITE.roastDays || [1, 4]).includes(d.getDay())) return d.toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
  }
  return "";
}

// Local delivery, in a line: the day, and about when it arrives (the courier's time from its
// quote; bags are ready, so nothing to add. From the 7 AM pickup when it goes the next morning).
function courierWhen(minutes) {
  const d = courierDay();
  const drive = minutes ?? 25;
  const timeLocale = LANG === "en" ? "en-US" : LOCALE; // 4:50 PM, not 16:50
  const clock = (t) => t.toLocaleTimeString(timeLocale, { hour: "numeric", minute: "2-digit", timeZone: SITE.timezone || "America/Los_Angeles" });
  const roundUp = (ms) => new Date(Math.ceil(ms / 3e5) * 3e5); // to 5 minutes
  if (d.today) return `Today from Roastery House · Arrives about ${clock(roundUp(Date.now() + drive * 60e3))}`;
  const [h, m] = (SITE.localDelivery?.morningPickup || "07:00").split(":").map(Number);
  const arrive = new Date(Date.UTC(2000, 0, 1, h, m + (minutes ?? 25)));
  const at = roundUp(arrive.getTime()).toLocaleTimeString(timeLocale, { hour: "numeric", minute: "2-digit", timeZone: "UTC" });
  const day = d.tomorrow ? "Tomorrow" : new Date(`${d.date}T12:00:00Z`).toLocaleDateString(LOCALE, { weekday: "long", timeZone: "UTC" });
  return `${day} from Roastery House · Arrives about ${at}`;
}

// Shipping by post: the cheapest carrier's price for the parcel to an address (server.js
// postageFor). postageNow() is undefined until the server has said, then the price, or null
// when it couldn't say (the flat rate stands). done() runs when the answer arrives, to redraw.
const postageCache = new Map();
const postageKey = (zip, oz) => `${String(zip || "").trim().slice(0, 5)}:${oz}`;
function postageAsk(zip, oz, to: any = {}) {
  const key = postageKey(zip, oz);
  if (!/^\d{5}:/.test(key) || !oz) return Promise.resolve(null);
  if (!postageCache.has(key)) {
    const entry: any = { fee: null, settled: false };
    entry.wait = api("/api/postage", { method: "POST", body: { ...to, postcode: key.slice(0, 5), oz } })
      .then((r) => {
        entry.fee = r.postage ?? null;
        entry.days = r.days ?? null;
      })
      .catch(() => null)
      .finally(() => (entry.settled = true));
    postageCache.set(key, entry);
  }
  return postageCache.get(key).wait;
}
function postageNow(zip, oz, done?, to?) {
  const entry = postageCache.get(postageKey(zip, oz));
  if (entry) return entry.settled ? entry.fee : undefined;
  if (!/^\d{5}$/.test(String(zip || "").trim().slice(0, 5)) || !oz) return undefined;
  postageAsk(zip, oz, to).then(() => done?.());
  return undefined;
}

// Sales tax rates (SITE.salesTax), from the server: a rate per tax class (data.js taxClass) by
// address ({ address, city, state, postcode }) or for pickup ({ pickup: location id }); null where
// nothing is collected. taxRateNow() is undefined until the address is complete and they're in.
const taxRateCache = new Map();
const taxKey = (w) => (w.pickup ? `pickup:${w.pickup}` : `${String(w.state || "").toUpperCase()}|${String(w.postcode || "").trim().slice(0, 5)}|${String(w.city || "").trim().toLowerCase()}`);
const homeRates = () => ({ groceries: 0, clothing: SITE.salesTax?.defaultRate || 0, general: SITE.salesTax?.defaultRate || 0, prepared_food: SITE.salesTax?.defaultRate || 0 });
function taxRateAsk(where) {
  const key = taxKey(where);
  if (!taxRateCache.has(key)) {
    const e: any = { rate: null, settled: false };
    e.wait = api("/api/tax-rate", { method: "POST", body: where })
      .then((r) => (e.rate = r.rates ?? null))
      .catch(() => (e.rate = where.pickup || String(where.state || "").toUpperCase() === SITE.salesTax?.state ? homeRates() : null))
      .finally(() => (e.settled = true));
    taxRateCache.set(key, e);
  }
  return taxRateCache.get(key).wait;
}
function taxRateNow(where, done?) {
  if (!SITE.salesTax) return null;
  if (!where) return undefined;
  if (!where.pickup && !(where.state && /^\d{5}/.test(String(where.postcode || "").trim()) && String(where.city || "").trim())) return undefined;
  const e = taxRateCache.get(taxKey(where));
  if (e) return e.settled ? e.rate : undefined;
  taxRateAsk(where).then(() => done?.());
  return undefined;
}
// Lines taxed in California (coffee, as food, isn't): a Tax line waits for the address for these.
const hasTaxable = (lines) => lines.some((l) => taxClass(l) && taxClass(l) !== "groceries");

// How many days that cheapest service takes to arrive, once known.
const postageDays = (zip, oz) => postageCache.get(postageKey(zip, oz))?.days ?? null;

// The courier's name as a small mark beside "Local Delivery".
const courierMark = (provider, name) => (name ? `<span class="courier-mark courier-${esc(provider || "")}"${provider === "uber" ? ' role="img" aria-label="Uber Direct"' : ""}>${provider === "uber" ? "" : esc(name)}</span>` : "");

function productCard(p, i = 0) {
  return `
    <li class="product-card" data-group="Coffee" data-type="${esc(p.type)}" data-tag="${esc(p.tag || "")}" data-labels="${esc((p.labels || []).map((l) => l.name).join("|"))}" data-reveal style="--i:${i % 4}">
      <a href="products/${encodeURIComponent(p.id)}">
        <div class="product-image">${productArt(p)}${hasPills(p) ? `<div class="product-labels">${labelPills(p)}</div>` : ""}</div>
        <div class="product-info">
          <p class="muted">${esc(p.type)} roast</p>
          <p class="product-name">${esc(bareName(p.name))}</p>
          <p class="product-price${p.soldOut ? " is-sold-out" : ""}">${priceHtml(p)}</p>
        </div>
      </a>
      ${p.soldOut ? "" : `<button class="quick-add" type="button" data-quick-add="${esc(p.id)}" aria-label="Add ${esc(p.short)} to cart">Add +</button>`}
    </li>`;
}

// Product cards in a row that scrolls sideways: under an assistant answer, or a chat reply that
// names a coffee. Quick add works as in the shop.
function cardRail(ids) {
  const items = [...new Set(ids)].map((id) => PRODUCTS.find((p) => p.id === id) || ACCESSORIES.find((a) => a.id === id)).filter(Boolean).slice(0, 6);
  if (!items.length) return "";
  const cards = items.map((x, i) => (PRODUCTS.includes(x) ? productCard(x, i) : accessoryCard(x, i)).replace(" data-reveal", "")).join("");
  return `<ul class="card-rail" aria-label="Coffees">${cards}</ul>`;
}

// The products a message is about: links to their pages, or their names written out.
function productsIn(text) {
  const t = String(text || "");
  const ids = [...t.matchAll(/(?:product(?:\.html)?\?id=|products\/)([\w-]+)/g)].map((m) => m[1]);
  const lower = t.toLowerCase();
  for (const x of [...PRODUCTS, ...ACCESSORIES]) {
    if ([x.name, bareName(x.name), x.short].some((n) => n && n.length > 5 && lower.includes(n.toLowerCase()))) ids.push(x.id);
  }
  return ids;
}

// An assistant answer ends with "[[products: id, id]]" when it's about particular products:
// the line is cut from what's shown, and its ids become cards.
const PRODUCT_TAG = /\[\[\s*products?\s*:([^\]]*)\]\]?/i;
const ASK_TAG = /\[\[\s*ask\s*:([^\]]*)\]\]?/i;
const answerParts = (text) => {
  const m = PRODUCT_TAG.exec(text);
  const a = ASK_TAG.exec(text);
  const cut = text.indexOf("[[");
  return {
    text: (cut >= 0 ? text.slice(0, cut) : text).trimEnd(),
    ids: m ? m[1].split(",").map((s) => s.trim()).filter(Boolean) : [],
    asks: a ? a[1].split("|").map((s) => s.trim()).filter((s) => s && s.length <= 60).slice(0, 3) : [],
  };
};
// Follow-up questions as buttons under an answer.
const askChips = (asks) => (asks.length ? `<div class="ask-chips">${asks.map((q) => `<button type="button" class="ask-chip" data-ask-chip>${esc(q)}</button>`).join("")}</div>` : "");

function coffeeLine(p, size, grind, qty = 1, gift = null) {
  const price = size === "1kg" ? p.price1kg : p.price;
  return {
    key: `coffee:${p.id}:${size}:${grind}${gift ? `:gift:${gift.recipient}:${gift.note}` : ""}`,
    kind: "coffee",
    title: gift ? `${p.name}, gift for ${gift.recipient}` : p.name,
    variant: `${size} · ${grind}`,
    note: gift && gift.note ? gift.note : undefined,
    gift: Boolean(gift),
    recipient: gift ? gift.recipient : undefined,
    product: p.id,
    size,
    grind,
    price,
    qty,
    color: p.color,
    image: p.image,
  };
}

/* ── Pages ────────────────────────────────────────────────── */

// The shop's sections by address (/coffee, /tea …), each the home page opened on that section.
// "Section/kind": /espresso opens the coffee with Espresso chosen (search uses these).
// The shop's categories, in this order (any other category follows): the filter chips and menu links.
const SHOP_CATEGORY_ORDER = ["Sauces", "Mala", "Dressings", "Seasonings", "Batter Flour", "Soups & Broths", "Soy Milk", "Teas", "Skincare"];
function shopCategories() {
  const have = [...new Set(ACCESSORIES.map((a) => a.category).filter(Boolean))];
  return [...SHOP_CATEGORY_ORDER.filter((c) => have.includes(c)), ...have.filter((c) => !SHOP_CATEGORY_ORDER.includes(c))];
}
const SHOP_SECTIONS = { shop: "Shop", coffee: "Coffee", espresso: "Coffee/Espresso", filter: "Coffee/Filter", decaf: "Coffee/Decaf", accessories: "Accessories", tea: "Tea", limited: "Limited Drop" };
// The section an address is for ("/es/tea" → "tea"), or null.
const sectionSlug = (url) => {
  const slug = new URL(url, location.href).pathname.replace(/^\/(es|ko)(?=\/|$)/, "").replace(/^\/|\/$/g, "");
  return Object.hasOwn(SHOP_SECTIONS, slug) ? slug : null;
};

/* ── Order tracking: our own page for every order (from its emails, or the account page) ──
   Couriers and carriers stay behind the scenes: the customer sees our steps, the courier's
   first name and times, or the parcel's latest scan and expected day. */
const trackClock = (iso) => new Date(iso).toLocaleTimeString(LOCALE_US, { hour: "numeric", minute: "2-digit", timeZone: SITE.timezone || "America/Los_Angeles" });
const trackDay = (iso) => new Date(iso).toLocaleDateString(LOCALE_US, { weekday: "long", month: "short", day: "numeric", timeZone: SITE.timezone || "America/Los_Angeles" });
const trackStamp = (iso) => new Date(iso).toLocaleString(LOCALE_US, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: SITE.timezone || "America/Los_Angeles" });
const sameDay = (iso) => new Date(iso).toDateString() === new Date().toDateString();

function trackHeadline(o) {
  const done = (i) => o.steps[i]?.done;
  const deliveredAt = o.steps.at(-1)?.at;
  if (o.status === "cancelled") return ["Order cancelled", ""];
  if (o.kind === "courier") {
    const c = o.courier || {};
    if (done(3)) return ["Delivered", deliveredAt ? `${sameDay(deliveredAt) ? "Today" : trackDay(deliveredAt)} at ${trackClock(deliveredAt)}` : ""];
    if (done(2)) return [c.dropoffEta ? `Arriving about ${trackClock(c.dropoffEta)}` : "On its way", c.name ? `${c.name} is bringing your order.` : ""];
    if (c.day && !sameDay(`${c.day}T12:00:00`)) return [`Arriving ${trackDay(`${c.day}T12:00:00`)}`, "In the morning."];
    return ["Getting it ready", c.pickupEta ? `Leaves about ${trackClock(c.pickupEta)}.` : ""];
  }
  if (o.kind === "parcel") {
    const p = o.parcel || {};
    if (o.status === "completed" || p.status === "delivered") {
      const at = p.status === "delivered" ? p.latest?.at : deliveredAt;
      return ["Delivered", at ? `${sameDay(at) ? "Today" : trackDay(at)} at ${trackClock(at)}` : ""];
    }
    if (p.status === "out_for_delivery") return ["Out for delivery", "It arrives today."];
    if (done(2)) return [p.eta ? `Arriving ${trackDay(p.eta)}` : "On its way", o.to ? `To ${o.to.city}, ${o.to.state}` : ""];
    return ["Getting it ready", "We'll email you when it ships."];
  }
  const place = o.place?.name || "Roastery House";
  if (o.status === "completed") return ["Collected", ""];
  if (done(2)) return [`Ready at ${place}`, o.place?.address?.join(", ") || ""];
  return ["Getting it ready", `We'll email you when it's ready at ${place}.`];
}

function trackerHtml(o) {
  const [head, sub] = trackHeadline(o);
  const now = o.steps.findIndex((x) => !x.done);
  const p = o.parcel;
  return `
    <div class="tracker">
      <p class="tracker-kicker">Order ${esc(o.number)}</p>
      <h2 class="tracker-head">${esc(head)}</h2>
      ${sub ? `<p class="tracker-sub">${esc(sub)}</p>` : ""}
      ${
        o.status === "cancelled"
          ? ""
          : `<ol class="tracker-steps" style="--steps:${o.steps.length}">
              ${o.steps.map((x, i) => `<li class="${x.done ? "is-done" : ""}${i === now ? " is-next" : ""}"><span class="tracker-dot" aria-hidden="true"></span><span class="tracker-label">${esc(x.label)}</span>${x.at ? `<time datetime="${esc(x.at)}">${esc(sameDay(x.at) ? trackClock(x.at) : trackStamp(x.at))}</time>` : ""}</li>`).join("")}
            </ol>`
      }
      ${
        p?.latest
          ? `<section class="tracker-block">
              <h3>Latest update</h3>
              <p>${esc(p.latest.text)}${p.latest.place ? ` <span class="muted">· ${esc(p.latest.place)}</span>` : ""}</p>
              ${p.latest.at ? `<p class="muted">${esc(trackStamp(p.latest.at))}</p>` : ""}
              ${
                p.history.length > 1
                  ? `<details class="tracker-history"><summary>All updates</summary><ul>${p.history.map((h) => `<li><span>${esc(h.text)}${h.place ? ` · ${esc(h.place)}` : ""}</span>${h.at ? `<time>${esc(trackStamp(h.at))}</time>` : ""}</li>`).join("")}</ul></details>`
                  : ""
              }
            </section>`
          : ""
      }
      <section class="tracker-block">
        <h3>Your order</h3>
        <ul class="tracker-items">${o.lines.map((l) => `<li><span>${l.qty} × ${esc(lineName(l))}${lineMeta(l) ? ` <span class="muted">${esc(lineMeta(l))}</span>` : ""}</span></li>`).join("")}</ul>
        <p class="tracker-total"><span>Total</span><span>${money(o.total)}</span></p>
        ${o.receipt ? `<p class="tracker-receipt"><a class="button is-outline" href="${esc(o.receipt.slice(1))}">View Receipt</a></p>` : ""}
        ${p?.number ? `<p class="muted tracker-ref">Tracking number ${esc(p.number)}</p>` : ""}
      </section>
      <p class="tracker-help"><button type="button" class="link-button" data-chat-open>Get Help With This Order</button></p>
    </div>`;
}

// Draws an order's tracker into `box` and keeps it current while it's on screen.
// Returns on the tracking page: what's on its way back, and (within the window) a form to start one.
function returnsHtml(o) {
  const day = (iso) => new Date(iso).toLocaleDateString(LOCALE_US, { month: "short", day: "numeric" });
  const what = (r) => r.items.map((i) => `${i.qty} × ${esc(i.title)}`).join(", ");
  // The drop-off we picked for them (nearest for the label's carrier), the next ones, and USPS's
  // free pickup from the door.
  const returnDropoffCard = (label) => {
    const d = label.dropoff;
    const go = (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.point.join(",")}`;
    // Today's hours, on their own calendar, when we have the place's week (Google Maps).
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const open = (p) => {
      const h = (p.week || []).find((x) => x.day === today);
      return h ? `<small class="dropoff-hours">${/closed/i.test(h.hours) ? "Closed today" : `Open today ${esc(h.hours)}`}</small>` : "";
    };
    const place = (p, main) => `<li${main ? ' class="is-main"' : ""}><span><strong>${esc(p.name)}</strong>${p.address ? `<small>${esc(p.address)}</small>` : ""}${open(p)}</span><span class="dropoff-mi">${p.miles} mi</span><a href="${go(p)}" target="_blank" rel="noopener">Directions</a></li>`;
    return `<div class="dropoff">
      <p class="dropoff-head">Or drop it off nearby</p>
      <ul>${place(d, true)}${(d.others || []).map((p) => place(p, false)).join("")}</ul>
    </div>`;
  };
  // USPS picks it up from their door: booked here (a day, and where to leave it), or the booking.
  const dayName = (ymd) => new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" });
  const pickupHtml = (r) =>
    r.pickup
      ? `<p class="return-pickup-booked"><strong>Pickup booked</strong><br>USPS collects it ${esc(dayName(r.pickup.day))}. Leave it ${r.pickup.spot === "Other" ? `where you said (${esc(r.pickup.note)})` : `at your ${esc(r.pickup.spot === "In/At Mailbox" ? "mailbox" : r.pickup.spot.toLowerCase())}`} by 9 AM.${r.pickup.confirmation ? `<br><small>Confirmation ${esc(r.pickup.confirmation)}</small>` : ""}</p>`
      : r.label?.doorPickup && r.label.pickupDays?.length
        ? `<form class="return-pickup" data-pickup-form="${esc(r.id)}">
            <p class="dropoff-head">Have USPS pick it up, free</p>
            <div class="return-pickup-row">
              <label>Day<select name="day">${r.label.pickupDays.map((d) => `<option value="${d}">${esc(dayName(d))}</option>`).join("")}</select></label>
              <label>Where<select name="spot">${["Front Door", "Back Door", "Side Door", "In/At Mailbox", "Mail Room", "Reception", "Other"].map((x) => `<option value="${x}">${x === "In/At Mailbox" ? "Mailbox" : x}</option>`).join("")}</select></label>
            </div>
            <label data-pickup-note hidden>Where should they look?<input name="note" maxlength="200" placeholder="Gate code, side of the house…"></label>
            <p class="sub-error" data-pickup-error></p>
            <button class="button is-outline" type="submit">Book Pickup</button>
          </form>`
        : "";
  // A mail return, in order: pack it with our code, then send it (USPS's code at the counter, the
  // printed label, a pickup, or a drop-off nearby); where it's got to once it's moving.
  const mailSteps = (r) => {
    if (!r.label) return `<p class="muted">We'll email your prepaid label shortly. Put this code in the box.</p><img src="${esc(r.qr)}" width="140" height="140" alt="Return code">`;
    const status = r.arrived ? `<p class="return-status">Arrived. We'll check it, then ${afterIn(r)}.</p>` : r.onItsWay ? `<p class="return-status">On its way back to us. We'll ${afterIn(r)} once it's checked in.</p>` : "";
    const where = r.label.dropoff ? "" : `<p class="muted">Drop it off: ${esc(returnDropoff(r.label.carrier)?.where || `any ${r.label.carrier} location`)}.${returnDropoff(r.label.carrier) ? ` <a href="${esc(returnDropoff(r.label.carrier).find)}" target="_blank" rel="noopener">Find a location</a>` : ""}</p>`;
    return `${status}
      <ol class="return-steps">
        <li><strong>Pack it</strong><span class="muted">Put this code in the box.</span><img src="${esc(r.qr)}" width="120" height="120" alt="Return code"></li>
        <li><strong>Send it</strong>
          ${r.label.qr ? `<span class="muted">No printer? Show this code at any Post Office counter.</span><img class="return-usps-qr" src="${esc(r.label.qr)}" width="160" height="160" alt="USPS label code">` : `<span class="muted">Print the label and tape it to the box.</span>`}
          <a class="button${r.label.qr ? " is-outline" : ""}" href="${esc(r.label.url)}" target="_blank" rel="noopener">Print Return Label</a>
          ${pickupHtml(r)}
          ${r.label.dropoff ? returnDropoffCard(r.label) : where}
        </li>
      </ol>`;
  };
  const done = { refunded: (r) => `${money(r.refunded ?? r.amount)} refunded`, credited: (r) => (r.credit ? `${money(r.credit.amount)} store credit, code ${esc(r.credit.code)}` : "store credit"), exchanged: (r) => `swap sent${r.exchange ? ` as ${esc(r.exchange)}` : ""}` };
  const started = (o.returns || [])
    .map((r) =>
      done[r.status]
        ? `<p class="return-done">Returned: ${what(r)} · ${done[r.status](r)}</p>`
        : `<div class="return-card">
            <p><strong>Return started</strong><br>${what(r)}${r.resolution === "exchange" ? `<br><span class="muted">Swapping for ${r.items.map((i) => esc(i.swapTo)).join(", ")}</span>` : ""}</p>
            ${r.method === "mail" ? mailSteps(r) : `<p class="muted">Bring it to Roastery House and show this code. We'll ${afterIn(r)} once it's checked in.</p><img src="${esc(r.qr)}" width="160" height="160" alt="Return code">`}
          </div>`
    )
    .join("");
  const swappable = (o.returnable || []).some((l) => l.swaps?.length);
  const form = o.returnable?.length
    ? `<button type="button" class="pill" data-return-open>Return Items</button>
      <p class="muted return-by">Free returns until ${day(o.returnBy)}</p>
      <form class="form return-form" data-return-form hidden>
        <fieldset><legend>What's coming back?</legend>
          ${o.returnable
            .map(
              (l) => `<label class="return-line"><input type="checkbox" name="item" value="${l.index}"><span>${esc(l.title)}${l.variant ? ` · ${esc(l.variant)}` : ""}</span>${
                l.qty > 1 ? `<select name="qty-${l.index}" aria-label="How many">${Array.from({ length: l.qty }, (_, i) => `<option>${i + 1}</option>`).join("")}</select>` : ""
              }</label>${l.swaps?.length ? `<label class="return-swap" data-swap="${l.index}" hidden>Swap for<select name="swap-${l.index}">${l.swaps.map((v) => `<option>${esc(v)}</option>`).join("")}</select></label>` : ""}`
            )
            .join("")}
        </fieldset>
        <fieldset><legend>Why?</legend>
          <select name="reason" aria-label="Why are you returning it?">${Object.entries(o.returnReasons || {}).map(([k, v]) => `<option value="${esc(k)}">${esc(v)}</option>`).join("")}</select>
          <textarea name="note" rows="2" maxlength="500" placeholder="Anything we should know? (optional)" aria-label="Anything we should know?"></textarea>
        </fieldset>
        <fieldset><legend>What would you like?</legend>
          <label class="return-line"><input type="radio" name="want" value="refund" checked><span>Refund to your card</span></label>
          <label class="return-line"><input type="radio" name="want" value="credit"><span>Store credit</span></label>
          ${swappable ? `<label class="return-line"><input type="radio" name="want" value="exchange"><span>Swap for another size or color</span></label>` : ""}
        </fieldset>
        <fieldset><legend>How?</legend>
          <label class="return-line"><input type="radio" name="method" value="dropoff" checked><span>Drop off at Roastery House</span></label>
          <label class="return-line"><input type="radio" name="method" value="mail"><span>Mail it back, free label</span></label>
        </fieldset>
        <p class="sub-error" data-return-error></p>
        <button class="button" type="submit">Start Return</button>
      </form>`
    : "";
  return started || form ? `<section class="tracker-returns">${started}${form}</section>` : "";
}

// After a return is checked in: what we'll do (for the status lines).
const afterIn = (r) => (r.resolution === "exchange" ? "send your swap" : r.resolution === "credit" ? `email you ${money(r.amount)} in store credit` : `refund ${money(r.amount)}`);

// Something wrong with a delivered order (damaged, wrong, missing, coffee and tea too): reported
// here with photos; what's been reported, and the answer. And a delivery that came back to us:
// reship it (to the address, or a corrected one) or refund it.
function problemsHtml(o) {
  const day = (iso) => new Date(iso).toLocaleDateString(LOCALE_US, { month: "short", day: "numeric" });
  const what = (c) => c.items.map((i) => `${i.qty} × ${esc(i.title)}`).join(", ");
  const answer = (c) =>
    ({
      open: `We're looking at it and will email you soon.`,
      replaced: `Replacement on its way${c.replacement ? ` (order ${esc(c.replacement)})` : ""}.`,
      refunded: `${money(c.refunded || 0)} refunded.`,
      credited: `${money(c.credited || 0)} credit on your account.`,
      declined: esc(c.answer || "We couldn't help with this one. We've emailed you why."),
    })[c.status] || "";
  const told = (o.claims || []).map((c) => `<div class="return-card"><p><strong>${esc(c.problem)}</strong><br>${what(c)}</p><p class="muted">${answer(c)}</p></div>`).join("");
  const d = o.deliveryIssue;
  const issue =
    d && d.status === "open"
      ? `<div class="return-card delivery-issue">
          <p><strong>We couldn't deliver this order</strong><br>${d.kind === "courier" ? "The courier is bringing it back to us." : "The carrier is sending it back to us."}</p>
          <form class="form return-form" data-delivery-form>
            <fieldset><legend>What would you like?</legend>
              <label class="return-line"><input type="radio" name="choice" value="reship" checked><span>Send it again, free</span></label>
              ${d.canRefund ? `<label class="return-line"><input type="radio" name="choice" value="refund"><span>Refund my order</span></label>` : ""}
            </fieldset>
            <fieldset data-reship-address><legend>Deliver to</legend>
              <input name="address" autocomplete="street-address" placeholder="Street address" value="${esc(d.shipTo?.address || "")}" aria-label="Street address">
              <div class="delivery-issue-row">
                <input name="city" autocomplete="address-level2" placeholder="City" value="${esc(d.shipTo?.city || "")}" aria-label="City">
                <input name="state" autocomplete="address-level1" placeholder="State" maxlength="2" value="${esc(d.shipTo?.state || "")}" aria-label="State">
                <input name="postcode" autocomplete="postal-code" placeholder="ZIP" inputmode="numeric" value="${esc(d.shipTo?.postcode || "")}" aria-label="ZIP code">
              </div>
            </fieldset>
            <p class="sub-error" data-delivery-error></p>
            <button class="button" type="submit">Send It Again</button>
          </form>
        </div>`
      : d?.status === "reshipped"
        ? `<p class="return-done">Sent again${d.reship ? ` as order ${esc(d.reship)}` : ""}.</p>`
        : d?.status === "refunded"
          ? `<p class="return-done">Refunded: it couldn't be delivered.</p>`
          : "";
  const form = o.claimable?.length
    ? `<button type="button" class="tp-btn" data-problem-open>Report a Problem</button>
      <p class="muted return-by">Damaged, wrong or missing? Tell us by ${day(o.claimBy)}.</p>
      <form class="form return-form" data-problem-form hidden>
        <fieldset><legend>Which items?</legend>
          ${o.claimable
            .map(
              (l) => `<label class="return-line"><input type="checkbox" name="item" value="${l.index}"><span>${esc(l.title)}${l.variant ? ` · ${esc(l.variant)}` : ""}</span>${
                l.qty > 1 ? `<select name="qty-${l.index}" aria-label="How many">${Array.from({ length: l.qty }, (_, i) => `<option>${i + 1}</option>`).join("")}</select>` : ""
              }</label>`
            )
            .join("")}
        </fieldset>
        <fieldset><legend>What happened?</legend>
          ${Object.entries(o.claimProblems || {})
            .map(([k, v], i) => `<label class="return-line"><input type="radio" name="problem" value="${esc(k)}"${i === 0 ? " checked" : ""}><span>${esc(v)}</span></label>`)
            .join("")}
          <textarea name="note" rows="3" maxlength="1000" placeholder="Tell us a little more" aria-label="Tell us a little more"></textarea>
        </fieldset>
        <fieldset><legend>Photos</legend>
          <label class="problem-photos"><input type="file" name="photos" accept="image/*" multiple><span class="muted">Up to 4</span></label>
        </fieldset>
        ${o.claimRefund ? `<fieldset><legend>What would you like?</legend>
          <label class="return-line"><input type="radio" name="want" value="replace" checked><span>A replacement</span></label>
          <label class="return-line"><input type="radio" name="want" value="refund"><span>A refund</span></label>
        </fieldset>` : ""}
        <p class="sub-error" data-problem-error></p>
        <button class="button" type="submit">Send</button>
      </form>`
    : "";
  const credit = (o.credits || []).map((c) => `<p class="return-done">Store credit: ${money(c.value)} with code <strong>${esc(c.code)}</strong></p>`).join("");
  return issue || told || form || credit ? `<section class="tracker-returns">${issue}${told}${form}${credit}</section>` : "";
}

function mountTracker(box, number, token = "") {
  let timer = null;
  box.addEventListener("click", (e) => {
    const open = e.target.closest("[data-return-open], [data-problem-open]");
    if (!open) return;
    $(open.matches("[data-return-open]") ? "[data-return-form]" : "[data-problem-form]", box).hidden = false;
    open.hidden = true;
  });
  // Pickup: "Other" asks where to look. A swap shows each ticked item's size or color picker.
  // A reship asks for the address; a refund doesn't.
  const showSwaps = (f) => {
    const swap = $("input[name=want]:checked", f)?.value === "exchange";
    for (const el of $$("[data-swap]", f)) el.hidden = !swap || !$(`input[name=item][value="${el.dataset.swap}"]`, f)?.checked;
  };
  box.addEventListener("change", (e) => {
    const f = e.target.closest("[data-pickup-form]");
    if (f && e.target.name === "spot") $("[data-pickup-note]", f).hidden = e.target.value !== "Other";
    const rf = e.target.closest("[data-return-form]");
    if (rf) showSwaps(rf);
    const df = e.target.closest("[data-delivery-form]");
    if (df && e.target.name === "choice") {
      const reship = e.target.value === "reship";
      $("[data-reship-address]", df).hidden = !reship;
      $("button[type=submit]", df).textContent = reship ? "Send It Again" : "Refund My Order";
    }
  });
  box.addEventListener("submit", async (e) => {
    const df = e.target.closest("[data-delivery-form]");
    if (df) {
      e.preventDefault();
      const d = new FormData(df);
      const err = $("[data-delivery-error]", df);
      const button = $("button[type=submit]", df);
      const label = button.textContent;
      const choice = d.get("choice");
      const address = { address: d.get("address"), city: d.get("city"), state: d.get("state"), postcode: d.get("postcode") };
      if (choice === "reship" && Object.values(address).some((v) => !String(v || "").trim())) return (err.textContent = "Enter the full address.");
      button.disabled = true;
      button.textContent = choice === "reship" ? "Sending…" : "Refunding…";
      try {
        const { order } = await api(`/api/track/${encodeURIComponent(number)}/delivery`, { method: "POST", body: { t: token, choice, ...(choice === "reship" && { address }) } });
        box.innerHTML = trackerHtml(order) + problemsHtml(order) + returnsHtml(order);
        toast(choice === "reship" ? "We'll send it again. We've emailed you." : "Refunded. We've emailed you.");
      } catch (error) {
        err.textContent = error.message;
        button.disabled = false;
        button.textContent = label;
      }
      return;
    }
    const cf = e.target.closest("[data-problem-form]");
    if (cf) {
      e.preventDefault();
      const d = new FormData(cf);
      const err = $("[data-problem-error]", cf);
      const items = d.getAll("item").map((index) => ({ index: Number(index), qty: Number(d.get(`qty-${index}`) || 1) }));
      if (!items.length) return (err.textContent = "Choose which items.");
      const files = d.getAll("photos").filter((f) => f instanceof File && f.size);
      if (files.length > 4) return (err.textContent = "Up to 4 photos, please.");
      const button = $("button[type=submit]", cf);
      button.disabled = true;
      button.textContent = "Sending…";
      try {
        const photos = await Promise.all(files.map(shrinkPhoto));
        const { order } = await api(`/api/track/${encodeURIComponent(number)}/problem`, { method: "POST", body: { t: token, items, problem: d.get("problem"), note: d.get("note") || "", photos, want: d.get("want") || "replace" } });
        box.innerHTML = trackerHtml(order) + problemsHtml(order) + returnsHtml(order);
        toast("Thanks. We're on it and we've emailed you.");
      } catch (error) {
        err.textContent = error.message;
        button.disabled = false;
        button.textContent = "Send";
      }
      return;
    }
    const pf = e.target.closest("[data-pickup-form]");
    if (pf) {
      e.preventDefault();
      const d = new FormData(pf);
      const err = $("[data-pickup-error]", pf);
      if (d.get("spot") === "Other" && !String(d.get("note") || "").trim()) return (err.textContent = "Tell the carrier where to find it.");
      const button = $("button[type=submit]", pf);
      button.disabled = true;
      button.textContent = "Booking…";
      try {
        const { order } = await api(`/api/track/${encodeURIComponent(number)}/return/${encodeURIComponent(pf.dataset.pickupForm)}/pickup`, { method: "POST", body: { t: token, day: d.get("day"), spot: d.get("spot"), note: d.get("note") || "" } });
        box.innerHTML = trackerHtml(order) + problemsHtml(order) + returnsHtml(order);
        toast("Pickup booked. We've emailed you the details.");
      } catch (error) {
        err.textContent = error.message;
        button.disabled = false;
        button.textContent = "Book Pickup";
      }
      return;
    }
    const f = e.target.closest("[data-return-form]");
    if (!f) return;
    e.preventDefault();
    const d = new FormData(f);
    const items = d.getAll("item").map((index) => ({ index: Number(index), qty: Number(d.get(`qty-${index}`) || 1), swapTo: d.get(`swap-${index}`) || "" }));
    const err = $("[data-return-error]", f);
    if (!items.length) return (err.textContent = "Choose what to return.");
    if (d.get("want") === "exchange" && items.some((i) => !i.swapTo)) return (err.textContent = "Only items that come in other sizes or colors can be swapped.");
    const button = $("button[type=submit]", f);
    button.disabled = true;
    button.textContent = "Starting…";
    try {
      const { order } = await api(`/api/track/${encodeURIComponent(number)}/return`, { method: "POST", body: { t: token, items, method: d.get("method"), reason: d.get("reason"), note: d.get("note") || "", want: d.get("want") } });
      box.innerHTML = trackerHtml(order) + problemsHtml(order) + returnsHtml(order);
      toast("Return started. We've emailed you the details.");
    } catch (error) {
      err.textContent = error.message;
      button.disabled = false;
      button.textContent = "Start Return";
    }
  });
  const load = async () => {
    try {
      const { order } = await api(`/api/track/${encodeURIComponent(number)}${token ? `?t=${encodeURIComponent(token)}` : ""}`);
      if ($("[data-return-form]:not([hidden]), [data-problem-form]:not([hidden])", box) || box.contains(document.activeElement?.closest?.("[data-pickup-form], [data-delivery-form]"))) return; // not while a form is being filled in
      box.innerHTML = trackerHtml(order) + problemsHtml(order) + returnsHtml(order);
      // A courier on the move updates every minute; anything else every five.
      const moving = order.kind === "courier" && order.status !== "completed" && order.status !== "cancelled";
      if (order.status !== "completed" && order.status !== "cancelled") timer = setTimeout(() => (box.closest(".overlay:not(.is-open)") ? null : load()), moving ? 60e3 : 300e3);
    } catch (error) {
      box.innerHTML = `<div class="tracker"><h2 class="tracker-head">Order not found</h2><p class="tracker-sub">${esc(error.message)}</p></div>`;
    }
  };
  load();
  return () => clearTimeout(timer);
}

// An event's place, linked to Google Maps directions to it.
const calPlace = (x) => {
  const text = [x.place, x.address].filter(Boolean).join(" · ");
  const to = encodeURIComponent([x.place, x.address].filter(Boolean).join(", "));
  return `<a href="https://www.google.com/maps/dir/?api=1&destination=${to}" target="_blank" rel="noopener">${esc(text)}</a>`;
};

// Cards, maps and the cultivar table in Numeral posts and on True Specialty (server/noteblocks.js):
// the cups and bags drawn, the map's taps, the table's filters and search.
// A post's map zooms: pinch, double tap, the + and − buttons, or ctrl + scroll; drag to move
// around once zoomed. The dots keep their size.
function zoomableMap(frame) {
  const canvas = $(".note-map-canvas", frame);
  if (!canvas) return null;
  const MAX = 5;
  let z = 1;
  let x = 0;
  let y = 0;
  frame.insertAdjacentHTML(
    "beforeend",
    `<div class="note-map-zoom"><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="out" aria-label="Zoom out" disabled>−</button></div>`
  );
  const [plus, minus] = $$("[data-zoom]", frame);
  // Zoom to `nz` keeping the point (cx, cy) of the frame still, then keep the map filling the frame.
  const set = (nz, cx = frame.clientWidth / 2, cy = frame.clientHeight / 2) => {
    nz = Math.min(MAX, Math.max(1, nz));
    if (nz < 1.01) nz = 1; // back to the whole map, not a hair off it
    x = cx - ((cx - x) * nz) / z;
    y = cy - ((cy - y) * nz) / z;
    z = nz;
    move(0, 0);
  };
  const move = (dx, dy) => {
    const w = frame.clientWidth;
    const h = frame.clientHeight;
    x = Math.min(0, Math.max(w - w * z, x + dx));
    y = Math.min(0, Math.max(h - h * z, y + dy));
    canvas.style.transform = z > 1 ? `translate(${x}px, ${y}px) scale(${z})` : "";
    frame.style.setProperty("--z", z);
    frame.classList.toggle("is-zoomed", z > 1);
    plus.disabled = z >= MAX;
    minus.disabled = z <= 1;
  };
  const at = (e) => {
    const r = frame.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };
  plus.addEventListener("click", () => set(z * 1.6));
  minus.addEventListener("click", () => set(z / 1.6));
  frame.addEventListener("dblclick", (e) => {
    if (e.target.closest("button")) return;
    set(z >= MAX ? 1 : z * 2, ...at(e));
  });
  frame.addEventListener(
    "wheel",
    (e) => {
      if (!e.ctrlKey) return; // plain scrolling scrolls the page
      e.preventDefault();
      set(z * Math.exp(-e.deltaY / 200), ...at(e));
    },
    { passive: false }
  );
  // One finger (or the mouse) drags; two pinch.
  const down = new Map();
  let dragged = false;
  let last = null; // the previous pinch: its spread and middle
  const pinch = () => {
    const [a, b] = [...down.values()];
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), m: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
  };
  frame.addEventListener("pointerdown", (e) => {
    if (e.target.closest(".note-map-zoom")) return;
    down.set(e.pointerId, at(e));
    dragged = false;
    if (down.size === 2) last = pinch();
  });
  frame.addEventListener("pointermove", (e) => {
    const was = down.get(e.pointerId);
    if (!was) return;
    const now = at(e);
    down.set(e.pointerId, now);
    if (down.size === 2) {
      const p = pinch();
      if (last?.d) set((z * p.d) / last.d, ...p.m);
      move(p.m[0] - last.m[0], p.m[1] - last.m[1]);
      last = p;
      dragged = true;
    } else if (z > 1) {
      move(now[0] - was[0], now[1] - was[1]);
      if (Math.abs(now[0] - was[0]) + Math.abs(now[1] - was[1]) > 1) dragged = true;
      if (dragged && !frame.hasPointerCapture(e.pointerId)) frame.setPointerCapture(e.pointerId);
    }
  });
  const up = (e) => {
    down.delete(e.pointerId);
    if (down.size < 2) last = null;
  };
  ["pointerup", "pointercancel", "lostpointercapture"].forEach((t) => frame.addEventListener(t, up));
  // A drag that ends on a dot doesn't pick it.
  frame.addEventListener(
    "click",
    (e) => {
      if (!dragged || e.target.closest(".note-map-zoom")) return;
      dragged = false;
      e.stopPropagation();
      e.preventDefault();
    },
    true
  );
  window.addEventListener("resize", () => move(0, 0));
  return {
    // A region picked from the chips: once zoomed in, bring its dot to the middle.
    show(dot) {
      if (z <= 1 || !dot) return;
      const w = frame.clientWidth;
      const h = frame.clientHeight;
      x = w / 2 - (parseFloat(dot.style.left) / 100) * w * z;
      y = h / 2 - (parseFloat(dot.style.top) / 100) * h * z;
      move(0, 0);
    },
  };
}

// Address suggestions under a street field as it's typed (Photon, through /api/address-suggest):
// ↑ ↓ and Enter, or a tap, fill the street, city, state and ZIP. The field still takes anything
// typed, and the USPS check runs as before.
function addressSuggest(input, fields) {
  const label = input.closest("label") || input.parentElement;
  label.classList.add("addr-field");
  const list = document.createElement("ul");
  const id = `addr-${Math.random().toString(36).slice(2, 8)}`;
  list.id = id;
  list.className = "addr-suggest";
  list.setAttribute("role", "listbox");
  list.hidden = true;
  label.append(list);
  Object.entries({ role: "combobox", "aria-autocomplete": "list", "aria-expanded": "false", "aria-controls": id }).forEach(([k, v]) => input.setAttribute(k, v));
  let items = [];
  let at = -1;
  let timer = 0;
  let seq = 0;
  let picked = "";
  const close = () => {
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    at = -1;
  };
  const mark = (i) => {
    at = i;
    $$("li", list).forEach((li, j) => li.setAttribute("aria-selected", String(j === i)));
    if (i >= 0) input.setAttribute("aria-activedescendant", `${id}-${i}`);
  };
  const pick = (sug) => {
    const f = fields();
    // A street without a number: keep the number they typed.
    const typedNo = /^\s*(\d+[a-z]?)\s/i.exec(input.value)?.[1];
    const street = sug.exact || !typedNo ? sug.address : `${typedNo} ${sug.address}`;
    picked = street;
    for (const [k, v] of Object.entries({ address: street, city: sug.city, state: sug.state, postcode: sug.postcode })) {
      if (!f[k] || (!v && k !== "address")) continue;
      f[k].value = v;
      f[k].removeAttribute("aria-invalid");
      f[k].dispatchEvent(new Event("change", { bubbles: true }));
    }
    close();
    input.focus();
  };
  const show = (list2) => {
    items = list2;
    list.innerHTML = items.map((x, i) => `<li id="${id}-${i}" role="option" aria-selected="false"><strong>${esc(x.address)}</strong><span>${esc([x.city, `${x.state} ${x.postcode}`.trim()].filter(Boolean).join(", "))}</span></li>`).join("");
    list.hidden = !items.length;
    input.setAttribute("aria-expanded", String(Boolean(items.length)));
    at = -1;
  };
  input.addEventListener("input", () => {
    clearTimeout(timer);
    const q = input.value.trim();
    if (q.length < 4 || q === picked) return close();
    timer = window.setTimeout(async () => {
      const n = ++seq;
      const r = await fetch(`/api/address-suggest?q=${encodeURIComponent(q)}`).then((x) => x.json()).catch(() => null);
      if (n === seq && document.activeElement === input) show(r?.suggestions || []);
    }, 220);
  });
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      mark((at + (e.key === "ArrowDown" ? 1 : -1) + items.length) % items.length);
    } else if (e.key === "Enter" && at >= 0) {
      e.preventDefault();
      pick(items[at]);
    } else if (e.key === "Escape") close();
  });
  // mousedown, not click: the field keeps focus (and its blur doesn't close the list first).
  list.addEventListener("mousedown", (e) => {
    const li = (e.target as any).closest("li");
    if (!li) return;
    e.preventDefault();
    pick(items[[...list.children].indexOf(li)]);
  });
  input.addEventListener("blur", () => setTimeout(close, 120));
}

var helpNewTimer = 0; // the portal's check for unopened messages (see the help panel)
function enhanceNoteBlocks() {
  $$("[data-coffee]").forEach((card) => {
    const p = PRODUCTS.find((x) => x.id === card.dataset.coffee);
    const art = $(".note-coffee-art", card);
    if (p && art && !art.children.length) art.innerHTML = productArt(p);
  });
  $$("[data-tea]").forEach((card) => {
    const t = ACCESSORIES.find((x) => x.id === card.dataset.tea);
    const art = $(".note-coffee-art", card);
    if (t && art && !art.children.length) art.innerHTML = tinArt(t);
  });

  // The cultivar table (server/noteblocks.js): by country, a region from the map, or a search.
  const explorer = $("[data-cultivars]");
  const filter = { country: "All", region: "", q: "" };
  const applyFilter = () => {
    if (!explorer) return;
    let shown = 0;
    $$("tbody", explorer).forEach((group) => {
      let any = false;
      $$("tr[data-search]", group).forEach((row) => {
        const ok =
          (filter.country === "All" || row.dataset.country === filter.country) &&
          (!filter.region || row.dataset.region === filter.region) &&
          (!filter.q || filter.q.split(/\s+/).every((w) => row.dataset.search.includes(w)));
        row.hidden = !ok;
        any ||= ok;
        shown += ok ? 1 : 0;
      });
      group.hidden = !any;
    });
    $$("[data-cultivar-countries] button", explorer).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.country === filter.country)));
    const region = (typeof TEA_REGIONS === "undefined" ? [] : TEA_REGIONS).find((r) => r.id === filter.region);
    const regionNote = $("[data-cultivar-region]", explorer);
    regionNote.hidden = !region;
    regionNote.innerHTML = region ? `Grown in ${esc(region.name)}, ${esc(region.country)} <button type="button" class="link-button" data-cultivar-clear>Show all</button>` : "";
    $("[data-cultivar-empty]", explorer).hidden = shown > 0;
  };
  if (explorer) {
    $("[data-cultivar-countries]", explorer).hidden = false;
    $("[data-cultivar-search-box]", explorer).hidden = false;
    explorer.addEventListener("click", (e) => {
      const c = e.target.closest("[data-country]");
      if (c && c.tagName === "BUTTON") {
        Object.assign(filter, { country: c.dataset.country, region: "" });
        applyFilter();
      }
      if (e.target.closest("[data-cultivar-clear]")) {
        Object.assign(filter, { country: "All", region: "", q: "" });
        $("[data-cultivar-search]", explorer).value = "";
        applyFilter();
      }
    });
    $("[data-cultivar-search]", explorer).addEventListener("input", (e) => {
      filter.q = e.target.value.trim().toLowerCase();
      applyFilter();
    });
  }
  // A cultivar named on the map or elsewhere: show its row (clearing filters) and mark it.
  const showRow = (id) => {
    const row = document.getElementById(id);
    if (!row || !explorer?.contains(row)) return false;
    Object.assign(filter, { country: "All", region: "", q: "" });
    $("[data-cultivar-search]", explorer).value = "";
    applyFilter();
    row.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "center" });
    row.classList.remove("is-marked");
    void row.offsetWidth;
    row.classList.add("is-marked");
    return true;
  };

  // Maps: a region's dot or chip shows its panel; "Show in the table" filters the cultivars.
  $$("[data-note-map]").forEach((map) => {
    map.classList.add("is-live");
    const zoom = zoomableMap($(".note-map-frame", map));
    map.addEventListener("click", (e) => {
      const pick = e.target.closest("[data-map-region]");
      if (pick) {
        const id = pick.dataset.mapRegion;
        $$("[data-map-region]", map).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.mapRegion === id)));
        $$("[data-map-panel]", map).forEach((p) => p.classList.toggle("is-active", p.dataset.mapPanel === id));
        zoom?.show($(`.note-map-dot[data-map-region="${id}"]`, map));
        return;
      }
      const show = e.target.closest("[data-map-filter]");
      if (show && explorer) {
        Object.assign(filter, { country: "All", region: show.dataset.mapFilter, q: "" });
        applyFilter();
        explorer.scrollIntoView({ behavior: reduceMotion ? "instant" : "smooth", block: "start" });
        return;
      }
      const link = e.target.closest("[data-cultivar-link]");
      if (link && showRow(link.dataset.cultivarLink)) e.preventDefault();
    });
  });

  // Without the cultivar table on the page (True Specialty), a map's cultivars link to the guide.
  if (!explorer) {
    $$("[data-map-filter]").forEach((b) => b.remove());
    $$("[data-cultivar-link]").forEach((a) => (a.href = `numeral/what-is-a-tea-cultivar#${a.dataset.cultivarLink}`));
  }
}

const pages = {
  // Numeral posts: coffees mentioned in a post show their bag, drawn as in the shop.
  notes() {
    // A post with a FAQ has the FAQ page's "Ask your own question" box under it.
    pages.ask();
    enhanceNoteBlocks();
    // The section list beside a post: the section being read is marked as you scroll.
    const toc = $(".note-toc");
    if (toc && "IntersectionObserver" in window) {
      const links = new Map($$("a", toc).map((a) => [decodeURIComponent(a.hash.slice(1)), a]));
      const heads = [...links.keys()].map((id) => document.getElementById(id)).filter(Boolean);
      const mark = () => {
        const passed = heads.filter((h) => h.getBoundingClientRect().top < innerHeight * 0.35);
        const at = passed.at(-1)?.id;
        links.forEach((a, id) => (id === at ? a.setAttribute("aria-current", "true") : a.removeAttribute("aria-current")));
      };
      const io = new IntersectionObserver(mark, { rootMargin: "0px 0px -60% 0px" });
      heads.forEach((h) => io.observe(h));
      addEventListener("scroll", mark, { passive: true });
      mark();
    }
  },
  // True Specialty: the origins map switches between coffee and tea.
  // About: the bags and cups on the shelf, a Coffee/Tea switch, and whether Roastery House is open.
  about() {
    for (const el of $$("[data-about-art]")) {
      const [kind, id] = el.dataset.aboutArt.split(":");
      const item = kind === "coffee" ? PRODUCTS.find((p) => p.id === id) : ACCESSORIES.find((a) => a.id === id);
      if (item) el.innerHTML = kind === "coffee" ? productArt(item) : accessoryArt(item);
    }
    const sw = $("[data-shelf-switch]");
    const panels = $$("[data-shelf-panel]");
    if (sw && panels.length > 1) {
      sw.hidden = false;
      const show = (which) => {
        $$("[data-shelf]", sw).forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.shelf === which)));
        panels.forEach((p) => (p.hidden = p.dataset.shelfPanel !== which));
      };
      show("coffee");
      sw.addEventListener("click", (e) => {
        const b = e.target.closest("[data-shelf]");
        if (b) show(b.dataset.shelf);
      });
    }
    const open = $("[data-roastery-open]");
    const roastery = LOCATIONS.find((l) => l.cafe === false);
    if (open && roastery) {
      const paint = () => {
        const st = openStatus(roastery);
        open.innerHTML = `<i class="dot${st.open ? " is-open" : ""}"></i><span>${esc(st.text)}</span>`;
        open.hidden = false;
      };
      paint();
      setInterval(paint, 60e3);
    }
  },
  "true-specialty"() {
    enhanceNoteBlocks();
    const pick = $("[data-origin-switch]");
    pick?.addEventListener("click", (e) => {
      const b = e.target.closest("[data-origin]");
      if (!b) return;
      $$("[data-origin]", pick).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
      $$("[data-origin-panel]").forEach((p) => (p.hidden = p.dataset.originPanel !== b.dataset.origin));
    });
  },
  home() {

    // Hero video: stays a grey box until assets/hero.mp4 loads.
    const video = $("[data-hero-video]");
    if (video) {
      video.addEventListener("loadeddata", () => video.classList.add("is-ready"), { once: true });
      if (!reduceMotion) video.play?.().catch(() => {});
    }

    // The photo and the statement don't scroll: a tap (or Space / ↓ / Page Down) moves on, and
    // the page scrolls as usual from the shop on. A section's address (/shop, /coffee …) skips
    // straight there. Old links to /#coffee move to /coffee.
    const root = document.documentElement;
    // In the shop the photo and statement step aside, so scrolling up stops at the banner
    // (the logo brings the intro back). The shop sits just under the header.
    // In the shop the tab says which section ("Coffee — Mimi Food"); back on the photo, the home title.
    const homeTitle = window.i18n?.t("Mimi Food — Specialty Coffee Roaster & Tea, Los Angeles") ?? "Mimi Food — Specialty Coffee Roaster & Tea, Los Angeles";
    const shopTitle = () => {
      const section = $("[data-shop-title]")?.textContent;
      if (section) document.title = `${window.i18n?.t(section) ?? section} — ${SITE.name}`;
    };
    const enterShop = () => {
      root.classList.remove("home-intro");
      root.classList.add("home-shop");
      shopTitle();
      scrollTo({ top: 0, behavior: "instant" });
      // From the photo to the shop can be top to top, with no scroll: tell the header anyway.
      dispatchEvent(new Event("scroll"));
    };
    // Moving on fades the page out, jumps, and fades back in: no long scroll that an iPhone
    // can still be finishing when the shop takes over (that showed as a jump).
    const main = $("main");
    // Once someone has read the statement, or has coffee in their cart, the photo goes
    // straight to the shop: they know us already.
    const knowsUs = () => store.get("bp-about-seen", false) || cart.length > 0;
    const go = (id) => {
      if (id === "about") {
        if (knowsUs()) id = "shop";
        else store.set("bp-about-seen", true);
      }
      const target = document.getElementById(id);
      if (!target || main.classList.contains("is-moving")) return;
      const toShop = () => {
        if (!sectionSlug(location.href)) history.pushState(null, "", `${prefix}/shop`);
        enterShop();
      };
      const jump = () => (id === "shop" ? toShop() : scrollTo({ top: target.offsetTop, behavior: "instant" }));
      if (reduceMotion) return jump();
      main.classList.add("is-moving");
      setTimeout(() => {
        jump();
        requestAnimationFrame(() => main.classList.remove("is-moving"));
      }, 220);
    };
    const prefix = location.pathname.match(/^\/(es|ko)(?=\/|$)/)?.[0] || "";
    const oldHash = location.hash.slice(1);
    if (Object.hasOwn(SHOP_SECTIONS, oldHash)) history.replaceState(null, "", `${prefix}/${oldHash}${location.search}`);
    if (sectionSlug(location.href)) {
      enterShop();
      addEventListener("load", () => setTimeout(() => scrollTo({ top: 0, behavior: "instant" }), 60), { once: true });
    }
    else {
      root.classList.add("home-intro");
      scrollTo({ top: 0, behavior: "instant" });
    }
    // "Shop", "Tea" … (menu, footer) while already on this page: close the menu and fade to that
    // section without loading the page again; the address follows, so Back works.
    document.addEventListener("click", (e) => {
      const link = (e.target as any).closest("a[href]");
      const slug = link && !link.target && sectionSlug(link.href);
      if (!slug || e.metaKey || e.ctrlKey || e.shiftKey) return;
      e.preventDefault();
      closeOverlays(false);
      if (sectionSlug(location.href) !== slug || location.search !== link.search) history.pushState(null, "", `${prefix}/${slug}${link.search}`);
      showSection(SHOP_SECTIONS[slug]);
      const wanted = kindFromAddress();
      if (wanted) {
        view.kind = wanted;
        render();
      }
      if (root.classList.contains("home-shop") && !main.classList.contains("is-moving")) {
        main.classList.add("is-moving");
        setTimeout(() => {
          scrollTo({ top: 0, behavior: "instant" });
          requestAnimationFrame(() => main.classList.remove("is-moving"));
        }, 220);
      } else go("shop");
    });
    $$("[data-next]").forEach((el) =>
      el.addEventListener("click", (e) => {
        if (e.target.closest("a:not(.statement-cta), button")) return;
        e.preventDefault();
        go(el.dataset.next);
      })
    );
    addEventListener("keydown", (e) => {
      if (!root.classList.contains("home-intro") || !["ArrowDown", "PageDown", " "].includes(e.key) || (e.target as any).closest("input, textarea, select, button, a")) return;
      e.preventDefault();
      go(scrollY < $("#about").offsetTop - 10 ? "about" : "shop");
    });
    // Scrolling or swiping down moves on too, once per gesture.
    let resting = 0;
    const advance = () => {
      if (!root.classList.contains("home-intro") || Date.now() < resting || $(".overlay.is-open")) return;
      resting = Date.now() + 900;
      go(scrollY < $("#about").offsetTop - 10 ? "about" : "shop");
    };
    addEventListener("wheel", (e) => e.deltaY > 12 && advance(), { passive: true });
    let touchY = null;
    addEventListener("touchstart", (e) => (touchY = e.touches[0]?.clientY ?? null), { passive: true });
    addEventListener("touchend", (e) => {
      const y = e.changedTouches[0]?.clientY;
      if (touchY != null && y != null && touchY - y > 40 && !(e.target as any).closest("input, textarea, select, .overlay")) advance();
      touchY = null;
    }, { passive: true });

    const items = SITE.ticker
      .filter((t) => !Array.isArray(t) || SITE.cafesLive)
      .map((t) => (Array.isArray(t) ? t[0] : t).replace("{product}", Math.round(SUBSCRIPTION.productDiscount * 100)).replace("{rotating}", Math.round(SUBSCRIPTION.discount * 100)))
      .map((t) => `<span>${esc(titleCase(t))}</span>`)
      .join("");
    $("[data-ticker]").innerHTML = `<div class="ticker-track">${items}${items}</div>`;

    const grid = $("[data-products]");
    grid.innerHTML = PRODUCTS.map(productCard).join("") + ACCESSORIES.map((a, i) => accessoryCard(a, PRODUCTS.length + i)).join("");

    // /shop is everything (All, Coffee, Tea, Accessories, Limited Drop); /coffee is the coffee, by
    // roast (All, Espresso, Filter, Decaf). Tea, Accessories and Limited Drop (labelled so in the back
    // office) have their own views too: by kind, with the section's name at the top.
    const view = { section: "Shop", kind: "All" };
    const SHOP_KINDS = { Coffee: (c) => c.dataset.group === "Coffee", Tea: (c) => c.dataset.group === "Tea", Accessories: (c) => c.dataset.group === "Accessories", "Limited Drop": (c) => c.dataset.labels.split("|").includes("Limited Drop") };
    const kindsOf = (section) => {
      // Limited Drop stays even between drops: it says the next is coming, and offers the list.
      if (section === "Shop") return shopCategories().filter((k) => $$(".product-card", grid).some((c) => c.dataset.category === k));
      const cards = $$(`.product-card[data-group="${section}"]`, grid);
      if (section === "Coffee") return ["Espresso", "Filter", "Decaf"].filter((k) => cards.some((c) => matchesKind(c, k)));
      if (section === "Accessories") return [...new Set(cards.map((c) => c.dataset.category).filter(Boolean))];
      if (section === "Tea") return TEA_TYPES.filter((k) => cards.some((c) => c.dataset.category === k));
      return [];
    };
    const matchesKind = (card, kind) =>
      kind === "All" || (view.section === "Shop" ? card.dataset.category === kind : card.dataset.group === "Coffee" ? card.dataset.type === kind || card.dataset.tag === kind || card.dataset.labels.split("|").includes(kind) : card.dataset.category === kind);
    function render() {
      const coffee = view.section === "Coffee";
      const everything = view.section === "Shop";
      // The finder link only where there's coffee or tea to choose: not on Accessories or Limited Drop.
      const showing = view.section === "Shop" && view.kind !== "All" ? view.kind : view.section;
      $("[data-shop-title]").hidden = false;
      $("[data-shop-title]").textContent = view.section;
      if (root.classList.contains("home-shop")) shopTitle();
      const kinds = kindsOf(view.section);
      const filters = $("[data-shop-filters]");
      filters.hidden = kinds.length < 2;
      filters.innerHTML = ["All", ...kinds].map((k) => `<button type="button" data-kind="${esc(k)}" aria-pressed="${k === view.kind}">${esc(k)}</button>`).join("");
      $$(".product-card", grid).forEach((card) => {
        const labels = card.dataset.labels.split("|");
        const inSection =
          everything ||
          (coffee && card.dataset.group === "Coffee") ||
          (view.section === "Accessories" && card.dataset.group === "Accessories") ||
          (view.section === "Tea" && card.dataset.group === "Tea") ||
          (view.section === "Limited Drop" && labels.includes("Limited Drop"));
        card.hidden = !(inSection && matchesKind(card, view.kind));
      });
      // Shown at once (they may be below where the scroll reveal has reached).
      $$(".product-card:not([hidden])", grid).forEach((card) => card.classList.add("is-visible"));
      // Nothing in a section yet (Limited Drop between drops): say so, and how to hear first.
      const empty = !$(".product-card:not([hidden])", grid);
      const note = $("[data-shop-empty]");
      note.hidden = !empty;
      note.innerHTML = empty
        ? view.section === "Limited Drop" || view.kind === "Limited Drop"
          ? `<strong>Next drop coming soon.</strong><span>Join our list to hear first.</span><button type="button" class="button is-outline" data-join-list>Get on the list</button>`
          : `<strong>Nothing here right now.</strong><span>Check back soon.</span>`
        : "";
    }
    function showSection(value) {
      const [section, kind = "All"] = value.split("/");
      view.section = section;
      view.kind = kind;
      render();
    }
    // The picked filter is in the address (/coffee?kind=espresso), so Back and a shared link keep it.
    const kindSlug = (k) => k.toLowerCase().replace(/\s+/g, "-");
    const kindFromAddress = () => {
      const want = new URLSearchParams(location.search).get("kind");
      return (want && kindsOf(view.section).find((k) => kindSlug(k) === want)) || null;
    };
    $("[data-shop-filters]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-kind]");
      if (!b) return;
      view.kind = b.dataset.kind;
      const q = new URLSearchParams(location.search);
      if (view.kind === "All") q.delete("kind");
      else q.set("kind", kindSlug(view.kind));
      history.replaceState(history.state, "", `${location.pathname}${q.size ? `?${q}` : ""}${location.hash}`);
      render();
      b.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reduceMotion ? "instant" : "smooth" });
    });
    // Get on the list: a small email box opens in its place.
    grid.parentElement.addEventListener("click", (e) => {
      const join = e.target.closest("[data-join-list]");
      if (!join) return;
      join.outerHTML = `<form class="subscribe join-box" data-join-form novalidate>
          <label class="visually-hidden" for="join-email">Email address</label>
          <div class="subscribe-row">
            <input id="join-email" name="email" type="email" autocomplete="email" placeholder="Email address" required>
            <input class="visually-hidden" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button type="submit">Submit</button>
          </div>
          <p class="subscribe-status" data-join-status role="status"></p>
        </form>`;
      guardedStart();
      $("#join-email").focus();
    });
    grid.parentElement.addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-join-form]");
      if (!form) return;
      e.preventDefault();
      const status = $("[data-join-status]", form);
      const say = (text, error = false) => {
        status.textContent = text;
        status.classList.toggle("is-error", error);
      };
      const email = form.email.value.trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
        flagFields(form, "", ["email"]);
        return say("Enter a valid email.", true);
      }
      const button = $("button", form);
      button.disabled = true;
      say("");
      try {
        const r = await postSignup(email, form.website.value);
        if (!r.ok) {
          if (r.status === 400) flagFields(form, "", ["email"]);
          return say(r.message || "That didn't work. Try again.", true);
        }
        $(".subscribe-row", form).remove();
        say(r.message || "Thanks, you're on the list.");
      } catch {
        say(`Sign-up isn't available right now. Email ${SITE.email} to join the list.`, true);
      } finally {
        button.disabled = false;
      }
    });
    // Opened at a section's address (or Back to one): straight into the shop, on that section.
    // Back to the home address brings the photo back.
    const fromAddress = () => {
      const slug = sectionSlug(location.href);
      const kind = () => {
        const k = kindFromAddress();
        if (k && k !== view.kind) {
          view.kind = k;
          render();
        }
      };
      if (!slug) {
        kind();
        if (root.classList.contains("home-shop")) {
          root.classList.remove("home-shop");
          root.classList.add("home-intro");
          document.title = homeTitle;
          scrollTo({ top: 0, behavior: "instant" });
        }
        return;
      }
      showSection(SHOP_SECTIONS[slug]);
      kind();
      enterShop();
    };
    addEventListener("popstate", fromAddress);
    requestAnimationFrame(fromAddress);
    render();
  },

  product() {
    const id = location.pathname.match(/\/products\/([\w-]+)/)?.[1] || new URLSearchParams(location.search).get("id");
    const accessory = ACCESSORIES.find((x) => x.id === id);
    const viewed = accessory || PRODUCTS.find((x) => x.id === id);
    if (viewed?.price != null) gaEvent("view_item", { value: viewed.price, items: [{ item_id: viewed.id, item_name: viewed.name, item_category: accessory ? (isTea(accessory) ? "Tea" : "Accessories") : "Coffee", price: viewed.price }] });
    if (accessory) return accessoryPage(accessory);
    const p = PRODUCTS.find((x) => x.id === id) || PRODUCTS[0];
    document.title = `${p.short} — Mimi Food`;


    const parts = p.name.split(", ");
    const country = parts.length > 2 ? parts[1] : "";
    const notes = p.notes.split(",").map((n) => n.trim()).filter(Boolean);
    const cups = (id) => SUBSCRIPTION.sizes.find((x) => x.id === id)?.cups;
    const per250 = p.price1kg / 4;
    const g = BREW_GUIDES[p.type];

    $("[data-product]").innerHTML = `
      <div class="pdp">
        <div class="pdp-gallery" data-reveal>
          <div class="pdp-image" style="--accent:${esc(p.color)}">${productArt(p)}</div>
        </div>

        <div class="pdp-info" data-reveal style="--i:1">
          ${hasPills(p, { low: false }) ? `<p class="pdp-kicker">${labelPills(p, { low: false })}</p>` : ""}
          <h1>${esc(p.short)}</h1>
          ${country || p.region ? `<p class="pdp-origin">${[country, p.region].filter(Boolean).map(esc).join(" · ")}</p>` : ""}
          <ul class="pdp-notes" aria-label="Tasting notes">${notes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>
          <p class="pdp-rating" data-pdp-rating hidden></p>

          <fieldset class="size-cards">
            <legend>Size</legend>
            <label><input type="radio" name="size" value="250g" checked>
              <span><strong>250g</strong><em>About ${cups("250g")} cups</em><b>${priceHtml(p, "250g")}</b></span></label>
            <label><input type="radio" name="size" value="1kg">
              <span><strong>1kg</strong><em>About ${cups("1kg")} cups</em><b>${priceHtml(p, "1kg")}</b>${per250 < p.price ? `<i>Save ${Math.round((1 - per250 / p.price) * 100)}%</i>` : ""}</span></label>
          </fieldset>

          <fieldset class="options">
            <legend>Grind</legend>
            ${grindsFor(p)
              .map((gr, i) => `<label><input type="radio" name="grind" value="${gr}"${i === 0 ? " checked" : ""}><span>${gr}</span></label>`)
              .join("")}
          </fieldset>

          ${
            p.soldOut
              ? ""
              : `<fieldset class="buy-type">
            <legend>Purchase</legend>
            <label><input type="radio" name="buy" value="once" checked>
              <span><strong>One-Time Purchase</strong></span></label>
            <label><input type="radio" name="buy" value="sub">
              <span><strong>Subscribe to This Coffee</strong><b data-sub-price></b></span></label>
          </fieldset>
          <fieldset class="options" data-sub-freq hidden>
            <legend>Deliver</legend>
            ${SUBSCRIPTION.frequencies.map((f) => `<label><input type="radio" name="subFreq" value="${f.id}"${f.id === "biweekly" ? " checked" : ""}><span>${esc(titleCase(f.label))}</span></label>`).join("")}
          </fieldset>`
          }

          <fieldset class="options">
            <legend>Who's it for?</legend>
            <label><input type="radio" name="who" value="me" checked><span>For me</span></label>
            <label><input type="radio" name="who" value="gift"><span>A gift</span></label>
          </fieldset>
          <div class="form gift-fields" data-pdp-gift hidden>
            <label>Recipient's Name<input name="recipient" maxlength="80" autocomplete="off"></label>
            <label>Gift Message<textarea name="giftNote" maxlength="300" rows="3" placeholder="We'll print it on a card in the box."></textarea></label>
          </div>

          <p class="stock-note" data-stock-note hidden></p>
          <div class="buy-row">
            <div class="stepper" role="group" aria-label="Quantity">
              <button type="button" data-pdp-qty="-1" aria-label="Decrease">−</button>
              <span data-pdp-qty-value>1</span>
              <button type="button" data-pdp-qty="1" aria-label="Increase">+</button>
            </div>
            ${p.soldOut ? `<button class="button" type="button" disabled>Sold Out</button>` : `<button class="button" type="button" data-pdp-add>Add to Cart <span class="buy-total" data-price>${money(p.price)}</span></button>`}
          </div>
          ${notifyForm()}
        </div>
      </div>

      <section class="pdp-origin-band" data-reveal>
        <div>
          <p class="eyebrow">The coffee</p>
          <p class="pdp-statement">${esc(p.about)}</p>
        </div>
        <dl class="pdp-facts">
          ${[["Region", p.region], ["Process", p.process], ["Variety", p.variety], ["Altitude", p.altitude]]
            .filter(([, v]) => v)
            .map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`)
            .join("")}
        </dl>
      </section>

      ${
        g
          ? `<section class="pdp-brew" data-reveal>
              <p class="eyebrow">How to brew</p>
              <h2>${esc(g.title)}</h2>
              <dl>${g.steps.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join("")}</dl>
              <p class="pdp-tip">${esc(g.tip)}</p>
            </section>`
          : ""
      }
      <section class="pdp-reviews" data-pdp-reviews hidden></section>`;
    mountReviews(p.id);

    let qty = 1;
    const size = () => $("input[name=size]:checked").value;
    const grind = () => $("input[name=grind]:checked").value;
    const priceEl = $("[data-price]");
    // One-time or subscribe & save (this exact coffee, delivered on a schedule).
    const subCoffeeOpt = subscriptionCoffee(`p:${p.id}`);
    const subscribing = () => $("input[name=buy]:checked")?.value === "sub";
    const subPrice = () => subscriptionPrice(subCoffeeOpt, size())?.price ?? 0;
    const updatePrice = () => {
      if (!priceEl) return; // sold out: no Add to Cart button
      const once = size() === "1kg" ? p.price1kg : p.price;
      $("[data-sub-price]").innerHTML = `<s>${money(once)}</s> ${money(subPrice())}`;
      const sub = subscribing();
      $("[data-sub-freq]").hidden = !sub;
      $(".buy-row .stepper").hidden = sub;
      $("[data-pdp-add]").firstChild.textContent = sub ? "Subscribe " : "Add to Cart ";
      priceEl.textContent = sub ? money(subPrice()) : money(once * qty);
      priceEl.classList.remove("flash");
      void priceEl.offsetWidth;
      priceEl.classList.add("flash");
    };
    // Under four 250g bags left: no 1kg.
    if (!p.soldOut && unitsLeft(p) < 4) {
      const kg = $("input[name=size][value='1kg']");
      kg.disabled = true;
      kg.closest("label").classList.add("is-out");
      $("em", kg.closest("label")).textContent = "Sold out";
    }
    // A link can pick the size (?size=1kg, as the product feeds do).
    const asked = $$("input[name=size]").find((r) => r.value === new URLSearchParams(location.search).get("size"));
    if (asked && !asked.disabled) asked.checked = true;
    $$("input[name=size], input[name=buy]").forEach((r) => r.addEventListener("change", updatePrice));
    if (priceEl) updatePrice();
    const setQty = (n) => {
      qty = n;
      $("[data-pdp-qty-value]").textContent = qty;
      updatePrice();
    };
    // Counted coffee: in 250g bags, so a 1kg bag takes four.
    const stockRefresh = wireStock({ item: p, per: () => (size() === "1kg" ? 4 : 1), qty: () => qty, setQty });
    $$("input[name=size]").forEach((r) => r.addEventListener("change", stockRefresh));
    $$("[data-pdp-qty]").forEach((b) =>
      b.addEventListener("click", () => {
        setQty(Math.max(1, qty + Number(b.dataset.pdpQty)));
        stockRefresh();
      })
    );
    // Gift: recipient's name (required) and an optional message.
    const giftBox = $("[data-pdp-gift]");
    const recipient = $("input[name=recipient]", giftBox);
    $$("input[name=who]").forEach((r) =>
      r.addEventListener("change", () => {
        giftBox.hidden = r.value !== "gift" || !r.checked;
        if (!giftBox.hidden) recipient.focus();
      })
    );
    // After adding, the button says so for a moment (the cart opens too). The label stays
    // underneath, hidden, so size or grind changes still update it.
    const addBtn = $("[data-pdp-add]");
    const showAdded = () => {
      addBtn.querySelector(".buy-added")?.remove();
      addBtn.insertAdjacentHTML("beforeend", `<span class="buy-added">Added</span>`);
      addBtn.classList.add("is-added");
      clearTimeout(addBtn.timer);
      addBtn.timer = setTimeout(() => {
        addBtn.classList.remove("is-added");
        addBtn.querySelector(".buy-added")?.remove();
      }, 1600);
    };
    addBtn?.addEventListener("click", () => {
      const isGift = $("input[name=who]:checked").value === "gift";
      if (isGift && !recipient.value.trim()) {
        fieldError(recipient, "Add the recipient's name.");
        return;
      }
      const gift = isGift ? { recipient: recipient.value.trim(), note: $("textarea[name=giftNote]", giftBox).value.trim() } : null;
      if (subscribing()) {
        const freq = SUBSCRIPTION.frequencies.find((f) => f.id === $("input[name=subFreq]:checked").value);
        const name = p.short || p.name;
        addLine({
          key: `sub:p:${p.id}:${size()}:${freq.id}:${grind()}:${gift ? `gift:${gift.recipient}:${gift.note}` : "me"}`,
          kind: "sub",
          title: gift ? `${name} Subscription, gift for ${gift.recipient}` : `${name} Subscription`,
          variant: `${size()} · ${grind()} · ${freq.label}`,
          note: gift?.note || undefined,
          gift: Boolean(gift),
          sub: { coffee: `p:${p.id}`, size: size(), freq: freq.id, grind: grind(), gift: Boolean(gift), recipient: gift?.recipient || "", note: gift?.note || "" },
          price: subPrice(),
          image: p.image,
          color: p.color,
          qty: 1,
        });
        return showAdded();
      }
      addLine(coffeeLine(p, size(), grind(), qty, gift));
      showAdded();
    });

    // Same roast type first, then the rest.
    $("[data-related]").innerHTML = PRODUCTS.filter((x) => x.id !== p.id)
      .sort((a, b) => ((b.type === p.type) as any) - ((a.type === p.type) as any))
      .slice(0, 5)
      .map(productCard)
      .join("");
  },

  subscriptions() {
    pages.ask(); // "Good to know" takes questions too, as on the FAQ page
    // Coffee or tea: the teas on sale (each a pack of 8 single-serve cups per delivery).
    const teasOnSale = ACCESSORIES.filter((a) => isTea(a) && !comingSoon(a) && !a.soldOut && subscriptionCoffee(`t:${a.id}`));
    // Subscription vs one-time, from the shop's own settings.
    const yes = `<svg class="ways-yes" viewBox="0 0 16 16" role="img" aria-label="Yes"><path d="M3.5 8.5l3 3 6-7"/></svg>`;
    const no = `<svg class="ways-no" viewBox="0 0 16 16" role="img" aria-label="No"><path d="M4 8h8"/></svg>`;
    const whole = (n) => money(n).replace(/\.00$/, "");
    const saving = (t) => `<mark class="save-mark">${t}</mark>`; // money saved, in a quiet tone
    // What's built here: a rotating coffee (and a tea, at its own rate when that differs).
    const offCoffee = Math.round(SUBSCRIPTION.discount * 100);
    const offTea = Math.round(SUBSCRIPTION.teaDiscount * 100);
    $("[data-ways]").innerHTML = [
      ["Price", saving(teasOnSale.length && offTea !== offCoffee ? `${offCoffee}% off coffee, ${offTea}% off tea` : `${offCoffee}% off`), "Shop price"],
      ["Shipping", saving("Always free"), `Free over ${whole(SITE.freeShippingOver)}`],
      ["Freshly roasted", yes, yes],
      ["On your schedule", "Weekly to monthly", no],
      ["Skip, pause or cancel", yes, no],
      ["Send as a gift", "Ongoing or prepaid", yes],
    ]
      .map(([k, a, b]) => `<tr><th scope="row">${k}</th><td>${a}</td><td>${b}</td></tr>`)
      .join("");

    const form = $("[data-sub-form]");
    // The builder's coffees come in the coffee sizes (a tea's "8 cups" is on its own page).
    const S = { ...SUBSCRIPTION, sizes: SUBSCRIPTION.sizes.filter((z) => !z.tea) };

    // Label colour for drawings: the house blend's own, or the first matching coffee.
    const subColor = (id) =>
      id === "house"
        ? PRODUCTS.find((p) => p.id === "house-blend")?.color || "#2b2b2b"
        : PRODUCTS.find((p) => p.type === (id === "espresso" ? "Espresso" : "Filter") && p.id !== "house-blend")?.color || "#2b2b2b";
    // Labels for the subscription bags: which roast, rotating or the same each time.
    const subFacts = (id) => {
      const c = S.coffees.find((x) => x.id === id);
      return { kicker: "Subscription", title: c?.label, rows: [["Roast", id === "filter" ? "Filter" : "Espresso"], ["Coffee", id === "house" ? "Same every time" : "Rotating"]] };
    };
    const TEA_SIZE = SUBSCRIPTION.sizes.find((z) => z.tea);
    const teaOf = (pick) => ACCESSORIES.find((a) => a.id === pick?.product);
    const priceFor = (coffee, size) => {
      if (coffee.tea) return subscriptionPrice(coffee, size.id);
      const full = Math.round(coffee.base * size.multiplier);
      return { full, price: Math.round(full * (1 - S.discount) * 100) / 100 };
    };

    // Picture cards for each step.
    const card = (name, value, checked, body) =>
      `<label class="pick-card"><input type="radio" name="${name}" value="${value}"${checked ? " checked" : ""}><span class="pick-body">${body}</span></label>`;

    // Two coffees and two teas, side by side (the three coffees until there's a tea).
    const heroBag = (id, i) => `<div class="sub-hero-bag" style="--i:${i}">${bag(subColor(id), subFacts(id))}</div>`;
    const heroTin = (t, i) => `<div class="sub-hero-bag sub-hero-tin" style="--i:${i}">${tinArt(t)}</div>`;
    // The teas as photographed: on sale first, then any other tea with a photo, then the drawn cup.
    const teaFaces = [...teasOnSale, ...ACCESSORIES.filter((a) => a.category === "Tea" && a.image && !teasOnSale.includes(a))].sort((a, b) => (Boolean(b.image) as any) - (Boolean(a.image) as any));
    const heroTeas = [teaFaces[0], teaFaces[1] || TEA_TIN];
    $("[data-sub-hero]").innerHTML = teasOnSale.length
      ? [heroBag("espresso", 0), heroTin(heroTeas[0], 1), heroBag("filter", 2), heroTin(heroTeas[1], 3)].join("")
      : ["espresso", "house", "filter"].map(heroBag).join("");

    // Linked from a coffee page (?coffee=espresso) or a tea (?tea=khan): start with it.
    const params = new URLSearchParams(location.search);
    const wanted = params.get("coffee");
    const wantedTea = teasOnSale.find((a) => a.id === params.get("tea"));
    const startCoffee = S.coffees.some((c) => c.id === wanted) ? wanted : S.coffees[0].id;
    // First, coffee or tea (only once there's a tea to subscribe to).
    $("[data-sub-kind-step]").hidden = !teasOnSale.length;
    if (teasOnSale.length) {
      $("[data-sub-kind]").innerHTML = [
        card("kind", "coffee", !wantedTea, `<span class="pick-thumb">${bag(subColor("filter"), subFacts("filter"))}</span><strong>Coffee</strong><em>${Math.round(S.discount * 100)}% off, roasted twice a week</em>`),
        card("kind", "tea", Boolean(wantedTea), `<span class="pick-thumb">${tinArt(teaFaces[0] || TEA_TIN)}</span><strong>Tea</strong><em>${Math.round(S.teaDiscount * 100)}% off, ${esc(teasOnSale[0].pack)} a delivery</em>`),
      ].join("");
    }
    const teaMode = () => form.kind?.value === "tea";
    // The second step's cards: the coffees, or the teas.
    const renderPicks = () => {
      const tea = teaMode();
      $("[data-sub-pick-title]").textContent = tea ? "Choose your tea" : "Choose your coffee";
      $("[data-sub-size-step]").hidden = tea;
      const was = form.coffee?.value;
      $("[data-sub-coffee]").innerHTML = tea
        ? teasOnSale
            .map((a, i) => {
              const id = `t:${a.id}`;
              const pick = subscriptionCoffee(id);
              return card(
                "coffee",
                id,
                was === id || (!/^t:/.test(was || "") && (wantedTea ? a === wantedTea : i === 0)),
                `<span class="pick-thumb">${tinArt(a)}</span>
                 <strong>${esc(a.short || a.name)}</strong>
                 <em>${esc([a.blend, a.notes].filter(Boolean).join(" · "))}</em>
                 <small>${money(priceFor(pick, TEA_SIZE).price)}</small>`
              );
            })
            .join("")
        : S.coffees
            .map((c) =>
              card(
                "coffee",
                c.id,
                was && !/^t:/.test(was) ? was === c.id : c.id === startCoffee,
                `<span class="pick-thumb">${bag(subColor(c.id), subFacts(c.id))}</span>
                 <strong>${esc(c.label)}</strong>
                 <em>${esc(c.note)}</em>
                 <small>From ${money(priceFor(c, S.sizes[0]).price)}</small>`
              )
            )
            .join("");
    };
    // A rotating coffee, or a tea ("t:<id>").
    const pickOf = (id) => S.coffees.find((c) => c.id === id) || subscriptionCoffee(id);
    renderPicks();

    // From "Gift a Subscription" in the menu: start on the gift.
    const startGift = new URLSearchParams(location.search).has("gift") || /\/subscriptions\/gift$/.test(location.pathname);
    // /subscriptions/build and /subscriptions/gift open on the builder (old /subscriptions#build and
    // ?gift=1#build links move there); the hero's button scrolls to it the same way.
    {
      const prefix = location.pathname.match(/^\/(es|ko)(?=\/|$)/)?.[0] || "";
      if (location.hash === "#build") history.replaceState(null, "", `${prefix}/subscriptions/${startGift ? "gift" : "build"}`);
      const toBuilder = (smooth) => $("#build")?.scrollIntoView({ behavior: smooth && !reduceMotion ? "smooth" : "instant", block: "start" });
      if (/\/subscriptions\/(build|gift)$/.test(location.pathname)) addEventListener("load", () => setTimeout(() => toBuilder(false), 60), { once: true });
      $(".sub-hero-cta")?.addEventListener("click", (e) => {
        e.preventDefault();
        history.pushState(null, "", `${prefix}/subscriptions/build`);
        toBuilder(true);
      });
    }
    $("[data-sub-who]").innerHTML = S.recipients
      .map((r, i) => card("who", r.id, startGift ? r.id === "gift" : i === 0, `<strong>${r.id === "gift" ? "A gift" : esc(r.label)}</strong>`))
      .join("");

    // How often: one line each ("Weekly", "Every 2 Weeks", "Monthly").
    $("[data-sub-freq]").innerHTML = S.frequencies
      .map((f, i) => `<label><input type="radio" name="freq" value="${f.id}"${i === 1 ? " checked" : ""}><span>${esc(titleCase(f.label))}</span></label>`)
      .join("");

    // Size cards show the price for the chosen coffee, so they're redrawn when it changes.
    const renderSizes = () => {
      if (teaMode()) return;
      const coffee = S.coffees.find((c) => c.id === form.coffee.value);
      const picked = form.size?.value || S.sizes[0].id;
      $("[data-sub-sizes]").innerHTML = S.sizes
        .map((z) =>
          card("size", z.id, z.id === picked, `<strong>${esc(z.label)}</strong><em>About ${z.cups} cups</em><small>${money(priceFor(coffee, z).price)}</small>`)
        )
        .join("");
    };
    renderSizes();

    // Gifts: ongoing (charged as each delivery goes out) unless they choose to pay up front,
    // which then opens the lengths. Prices follow the chosen coffee and size.
    const renderLength = () => {
      const coffee = pickOf(form.coffee.value);
      const size = coffee.tea ? TEA_SIZE : S.sizes.find((z) => z.id === (form.size?.value || S.sizes[0].id));
      const per = priceFor(coffee, size).price;
      const plan = form.plan?.value || "ongoing";
      const months = form.months?.value || String(S.prepaid?.[0] || "");
      $("[data-sub-length]").innerHTML = [
        card("plan", "ongoing", plan === "ongoing", `<strong>Ongoing</strong><em>Charged as each delivery goes out</em><small>${money(per)} per delivery</small>`),
        card("plan", "prepaid", plan === "prepaid", `<strong>Pay Up Front</strong><em>A set number of months, then it ends</em><small>From ${money(per * (S.prepaid?.[0] || 1))}</small>`),
      ].join("");
      $("[data-sub-months]").innerHTML = (S.prepaid || [])
        .map((m) => card("months", String(m), months === String(m), `<strong>${m} Months</strong><em>${m} deliveries</em><small>${money(per * m)}</small>`))
        .join("");
    };
    renderLength();

    const current = () => {
      const coffee = pickOf(form.coffee.value);
      const gift = form.who.value === "gift";
      const size = coffee.tea ? TEA_SIZE : S.sizes.find((z) => z.id === form.size.value);
      const prepaid = gift && form.plan.value === "prepaid" ? Number(form.months.value) : 0;
      const freq = S.frequencies.find((f) => f.id === (prepaid ? "monthly" : form.freq.value));
      const recipient = form.recipient.value.trim();
      return { coffee, gift, recipient, note: form.giftNote.value.trim(), size, freq, prepaid, ...priceFor(coffee, size) };
    };

    const update = () => {
      const { coffee, gift, recipient, size, freq, prepaid, full, price } = current();
      // Gift details only when it's for someone else.
      $("[data-gift-fields]").hidden = !gift;
      form.recipient.required = gift;
      // Prepaid gifts are monthly, so "How often?" goes; the steps are numbered as shown.
      $("[data-sub-length-step]").hidden = !gift;
      $("[data-sub-months]").hidden = !prepaid;
      $("[data-sub-freq-step]").hidden = Boolean(prepaid);
      // The bar: what each delivery costs (or the gift, paid now) and what that saves.
      const n = prepaid || 1;
      $("[data-sub-bar-price]").innerHTML = `<strong>${money(price * n)}${full > price ? ` <s>${money(full * n)}</s>` : ""}</strong><span>${
        full > price ? `You save ${money((full - price) * n)}` : ""
      }${prepaid ? `${full > price ? " · " : ""}${prepaid} deliveries` : full > price ? " per delivery" : ""}</span>`;
      $$("[data-sub-form] button[type=submit]").forEach((b) => (b.textContent = prepaid ? "Add Gift Subscription" : "Add Subscription"));
    };

    form.addEventListener("change", (e) => {
      if (e.target.name === "kind") renderPicks();
      if (e.target.name === "coffee" || e.target.name === "kind") renderSizes();
      if (["kind", "coffee", "size"].includes(e.target.name)) renderLength();
      update();
    });
    form.recipient.addEventListener("input", update);
    // The price-and-Add bar slides up once the builder fills the screen (not for a sliver of it
    // under the hero), and goes again past it.
    const bar = $("[data-sub-bar]");
    if (bar && "IntersectionObserver" in window) {
      new IntersectionObserver(([en]) => bar.classList.toggle("is-shown", en.isIntersecting), { rootMargin: "0px 0px -45% 0px" }).observe($(".sub-steps"));
    } else bar?.classList.add("is-shown");
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const { coffee, gift, recipient, note, size, freq, price, prepaid } = current();
      const sizeText = coffee.tea ? teaOf(coffee)?.pack || size.label : size.label;
      if (gift && !recipient) {
        fieldError(form.recipient, "Add the recipient's name.");
        return;
      }
      if (prepaid) {
        return addLine({
          key: `sub:${coffee.id}:${size.id}:prepaid${prepaid}:gift:${recipient}:${note}`,
          kind: "sub",
          title: `${coffee.label} Gift Subscription for ${recipient}`,
          variant: `${sizeText} · ${prepaid} months, paid up front`,
          note: note || undefined,
          gift: true,
          sub: { coffee: coffee.id, size: size.id, freq: "monthly", gift: true, recipient, note, prepaid },
          price: Math.round(price * prepaid * 100) / 100,
          color: "#111",
        });
      }
      addLine({
        key: `sub:${coffee.id}:${size.id}:${freq.id}:${gift ? `gift:${recipient}:${note}` : "me"}`,
        kind: "sub",
        title: gift ? `${coffee.label} Subscription, gift for ${recipient}` : `${coffee.label} Subscription`,
        variant: `${sizeText} · ${freq.label}`,
        note: gift && note ? note : undefined,
        gift,
        sub: { coffee: coffee.id, size: size.id, freq: freq.id, gift, recipient, note },
        price,
        color: "#111",
      });
    });
    update();
  },

  // Order Ahead, step 1: choose a location.
  order() {
    const last = store.get("bp-pickup-location", null);
    let locId = CAFES.some((l) => l.id === last) ? last : CAFES[0].id;
    let distances = {};

    const renderLocations = () => {
      const list = [...CAFES].sort((a, b) => (distances[a.id] ?? 0) - (distances[b.id] ?? 0));
      $("[data-order-locations]").innerHTML = list
        .map((l) => {
          const st = openStatus(l);
          const km = distances[l.id];
          return `<label class="choice location-choice"><input type="radio" name="location" value="${l.id}"${l.id === locId ? " checked" : ""}>
            <span>
              ${l.id === last ? `<b class="badge">Your last selection</b>` : ""}
              <strong>${esc(l.name)}</strong>
              <em>${esc(l.address.join(", "))}</em>
              <em><i class="dot${st.open ? " is-open" : ""}"></i>${esc(st.text)}</em>
              <small class="location-meta">${km != null ? `<span>${km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`}</span>` : ""}<a href="locations#${l.id}">Shop info</a></small>
            </span></label>`;
        })
        .join("");
    };

    // The selected location's photo (assets/<location id>.jpg; a café photo until there is one)
    // with name, status and address; one Order button (in the caption on wide screens, in the
    // bottom bar on phones).
    const renderPhoto = () => {
      const loc = LOCATIONS.find((l) => l.id === locId);
      const st = openStatus(loc);
      const href = `order?location=${encodeURIComponent(loc.id)}`;
      const fig = $("[data-order-location]");
      fig.innerHTML = `
        <div class="location-image">
          <img src="${esc(loc.photo || `assets/${loc.id}.jpg`)}" alt="" onerror="this.onerror = () => this.parentNode.remove(); this.src = 'assets/cortado.jpg'">
        </div>
        <figcaption>
          <p class="muted">${esc(loc.kind)}</p>
          <h2>${esc(loc.name)}</h2>
          <p class="status"><i class="dot${st.open ? " is-open" : ""}"></i>${esc(st.text)}</p>
          <address>${loc.address.map(esc).join(", ")}</address>
          <a class="button order-cta" href="${href}">Order from ${esc(loc.name)}</a>
        </figcaption>`;
      $("[data-order-bar]").innerHTML = `<a class="button" href="${href}">Order from ${esc(loc.name)}</a>`;
      $("[data-delivery-link]").href = `order?location=${encodeURIComponent(loc.id)}&mode=delivery`;
      fig.classList.remove("is-changing");
      void fig.offsetWidth; // restart the fade
      fig.classList.add("is-changing");
    };

    renderLocations();
    renderPhoto();
    $("[data-order-locations]").addEventListener("change", (e) => {
      locId = e.target.value;
      renderPhoto();
    });

    // "Find the nearest shop" needs the shops' coordinates (js/data.js, or looked up by the server).
    const nearest = $("[data-nearest]");
    const located = () => CAFES.filter((l) => Array.isArray(l.coords));
    nearest.hidden = true;
    locationsReady.then(() => (nearest.hidden = located().length < 2 || !navigator.geolocation));
    nearest.addEventListener("click", () => {
      nearest.disabled = true;
      nearest.textContent = "Finding you…";
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          distances = Object.fromEntries(located().map((l) => [l.id, distanceKm([coords.latitude, coords.longitude], l.coords)]));
          locId = [...located()].sort((a, b) => distances[a.id] - distances[b.id])[0].id;
          renderLocations();
          renderPhoto();
          nearest.textContent = "Sorted by distance";
        },
        () => {
          nearest.disabled = false;
          nearest.textContent = "Couldn't get your location. Try again";
        },
        { timeout: 10000, maximumAge: 600000 }
      );
    });
  },

  // Order Ahead, step 2 (schedule) and step 3 (menu), on order.
  orderMenu() {
    const params = new URLSearchParams(location.search);
    const loc = CAFES.find((l) => l.id === params.get("location"));
    if (!loc) return location.replace("order-ahead");
    store.set("bp-pickup-location", loc.id);

    const D = SITE.cafeDelivery;
    let mode = params.get("mode") === "delivery" ? "delivery" : "pickup";
    const address = store.get("bp-delivery", { street: "", city: "", postcode: "" });
    const hasAddress = () => Boolean(address.street && address.city && address.postcode);
    // ASAP: the usual lead plus a couple of minutes per drink ahead in this bar's queue.
    const Q = SITE.cafeQueue || { minutes: 15, perCup: 2 };
    let cupsAhead = 0;
    const lead = () => (mode === "delivery" ? D.leadMinutes : Q.minutes) + cupsAhead * Q.perCup;
    const ahead = () => (cupsAhead === 1 ? "1 cup ahead of you" : cupsAhead > 1 ? `${cupsAhead} cups ahead of you` : "");
    const saved = store.get("bp-pickup", {});
    let time = params.get("time") || (saved.location === loc.id && saved.mode === mode ? saved.time : null);

    const urlFor = (o: any = {}) => {
      const q = new URLSearchParams({ location: o.location || loc.id });
      if ((o.mode || mode) === "delivery") q.set("mode", "delivery");
      const t = "time" in o ? o.time : time;
      if (t) q.set("time", t);
      return `order?${q}`;
    };
    const setUrl = () => history.replaceState(null, "", urlFor());

    // What the customer sees at the top, and what each cart line says.
    const describe = () => {
      const when = time ? pickupLabel(time) : "";
      return mode === "delivery"
        ? {
            where: `Delivery from ${loc.name} to ${address.street}`,
            detail: `From ${loc.name}${when ? ` · ${when}` : ""}`,
            variant: `Delivery to ${address.street}, ${address.city} ${address.postcode} · from ${loc.name} · ${when}`,
          }
        : {
            where: `Pickup at ${loc.name}`,
            detail: `${loc.name}${when ? ` · ${when}` : ""}`,
            variant: `Pickup · ${loc.name} · ${when}`,
          };
    };

    // Keep every café drink in the cart on the same location, method and time.
    const syncPickupLines = () => {
      const { variant } = describe();
      const delivery = mode === "delivery" ? { ...address, from: loc.id } : null;
      if (cart.some((l) => l.kind === "pickup" && (l.variant !== variant || JSON.stringify(l.delivery || null) !== JSON.stringify(delivery)))) {
        cart = cart.map((l) => (l.kind === "pickup" ? { ...l, variant, delivery } : l));
        saveCart();
      }
    };

    /* Time: ASAP while the café is open, otherwise its next window; changed in a sheet. */
    let days = pickupDays(loc, new Date(), lead());
    let dayIndex = Math.max(0, days.findIndex((d) => d.slots.length));
    const menu = $("[data-menu]");
    const noun = () => (mode === "delivery" ? "delivery" : "pickup");
    const isoFor = (date, t) => `${dateKey(date)}T${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
    const defaultTime = () => {
      if (asapOpen(loc, new Date(), lead())) return "asap";
      const day = days.find((d) => d.slots.length);
      return day ? isoFor(day.date, day.slots[0]) : null;
    };
    const timeText = () =>
      !time ? "No times this week" : time === "asap" ? `ASAP · about ${lead()} min${ahead() ? ` · ${ahead()}` : ""}` : pickupLabel(time);

    const renderSchedule = () => {
      const day = days[dayIndex];
      $("[data-time-title]").textContent = mode === "delivery" ? "Delivery Time" : "Pickup Time";
      $("[data-schedule-hint]").textContent =
        mode === "delivery" ? `Delivered from ${loc.name}. ${money(D.fee)} delivery, ${money(D.minimum)} minimum.` : `Ready to collect at ${loc.name}.`;
      $("[data-days]").innerHTML = days
        .map((d, i) => {
          const name = i === 0 ? "Today" : d.date.toLocaleDateString(LOCALE, { weekday: "short" });
          const date = d.date.toLocaleDateString(LOCALE, { day: "numeric", month: "short" });
          // A day with no times left (closed, or past closing today) says so rather than being struck out.
          return `<button type="button" class="day${i === dayIndex ? " is-active" : ""}" data-day="${i}"${d.slots.length ? "" : " disabled"} aria-pressed="${i === dayIndex}">
            <span>${name}</span><span>${d.slots.length ? date : "Closed"}</span></button>`;
        })
        .join("");
      const radio = (value, label, extra = "") =>
        `<label class="slot${extra}"><input type="radio" name="slot" value="${value}"${value === time ? " checked" : ""}><span>${label}</span></label>`;
      // ASAP first (today, while open), then 10-minute windows by morning, afternoon and evening.
      const asap = dayIndex === 0 && asapOpen(loc, new Date(), lead()) ? radio("asap", `As soon as possible · about ${lead()} min${ahead() ? ` · ${ahead()}` : ""}`, " slot-asap") : "";
      const parts = [["Morning", 0, 720], ["Afternoon", 720, 1020], ["Evening", 1020, 1440]]
        .map(([label, from, to]): any => [label, day.slots.filter((t) => t >= from && t < to)])
        .filter(([, ts]) => ts.length);
      $("[data-slots]").innerHTML = day.slots.length
        ? asap + parts.map(([label, ts]) => `<p class="slots-label">${label}</p>${ts.map((t) => radio(isoFor(day.date, t), windowLabel(t))).join("")}`).join("")
        : `<p class="muted">No ${noun()} times left on this day.</p>`;
    };

    $("[data-days]").addEventListener("click", (e) => {
      const b = e.target.closest("[data-day]");
      if (!b || b.disabled) return;
      dayIndex = Number(b.dataset.day);
      renderSchedule();
    });
    $("[data-continue]").addEventListener("click", () => {
      const picked = $("input[name=slot]:checked")?.value;
      if (picked) {
        time = picked;
        store.set("bp-pickup", { location: loc.id, mode, time });
        setUrl();
        syncPickupLines();
        renderControls();
      }
      closeOverlays();
    });
    const openTime = () => {
      days = pickupDays(loc, new Date(), lead());
      const at = time && time !== "asap" ? days.findIndex((d) => dateKey(d.date) === time.split("T")[0]) : -1;
      dayIndex = at >= 0 ? at : Math.max(0, days.findIndex((d) => d.slots.length));
      renderSchedule();
      openOverlay("pickup-time");
    };
    $("[data-open-time]").addEventListener("click", openTime);

    // The three controls above the menu: café, pickup or delivery, and time.
    const renderControls = () => {
      $("[data-control-cafe]").textContent = loc.name;
      $("[data-control-method]").textContent = mode === "delivery" ? `Delivery to ${address.street}` : "Pickup";
      $("[data-control-time-label]").textContent = mode === "delivery" ? "Delivery time" : "Pickup time";
      $("[data-control-time]").textContent = timeText();
    };

    /* Pickup or delivery sheet */
    const sheetForm = $("[data-fulfil-form]");
    const setTab = (tab) => {
      $$("[data-fulfil-tab]").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.fulfilTab === tab)));
      $("[data-fulfil-pickup]").hidden = tab !== "pickup";
      $("[data-fulfil-delivery]").hidden = tab !== "delivery";
      ["street", "city", "postcode"].forEach((n) => (sheetForm[n].required = tab === "delivery"));
      sheetForm.dataset.tab = tab;
      $("[data-fulfil-error]").textContent = "";
    };
    const openSheet = (tab = mode) => {
      $("[data-sheet-locations]").innerHTML = CAFES.map((l) => {
        const st = openStatus(l);
        return `<label class="choice"><input type="radio" name="sheetLocation" value="${l.id}"${l.id === loc.id ? " checked" : ""}>
          <span><strong>${esc(l.name)}</strong><em>${esc(l.address.join(", "))}</em><em><i class="dot${st.open ? " is-open" : ""}"></i>${esc(st.text)}</em></span></label>`;
      }).join("");
      sheetForm.from.innerHTML = CAFES.map((l) => `<option value="${l.id}"${l.id === loc.id ? " selected" : ""}>${esc(l.name)}</option>`).join("");
      sheetForm.street.value = address.street;
      sheetForm.city.value = address.city;
      sheetForm.postcode.value = address.postcode;
      $("[data-delivery-terms]").textContent = `Within ${D.radiusKm} km. ${money(D.fee)} delivery, ${money(D.minimum)} minimum. About ${D.leadMinutes} minutes.`;
      setTab(tab);
      openOverlay("fulfil");
    };
    $$("[data-fulfil-tab]").forEach((b) => b.addEventListener("click", () => setTab(b.dataset.fulfilTab)));
    sheetForm.addEventListener("input", () => ($("[data-fulfil-error]").textContent = ""));
    sheetForm.addEventListener("click", (e) => {
      const use = e.target.closest("[data-use-shop]");
      if (!use) return;
      sheetForm.from.value = use.dataset.useShop;
      sheetForm.requestSubmit();
    });
    $$("[data-open-fulfil]").forEach((b) => b.addEventListener("click", () => openSheet(b.dataset.openFulfil || mode)));

    sheetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const tab = sheetForm.dataset.tab;
      if (tab === "delivery") {
        const next = {
          street: sheetForm.street.value.trim(),
          city: sheetForm.city.value.trim(),
          postcode: sheetForm.postcode.value.trim(),
        };
        if (!next.street || !next.city || !next.postcode) {
          $("[data-fulfil-error]").textContent = "Enter your full address.";
          flagFields(sheetForm);
          return;
        }
        // Check the address is inside the delivery area (OpenStreetMap). If it can't be
        // checked (address not found, or no server), we carry on and the shop confirms.
        const submit = $("button[type=submit]", sheetForm);
        const error = $("[data-fulfil-error]");
        submit.disabled = true;
        submit.textContent = "Checking address…";
        let check = null;
        try {
          check = await api("/api/delivery-check", { method: "POST", body: next });
        } catch {
          /* carry on */
        }
        submit.disabled = false;
        submit.textContent = "Update";
        const from = check?.shops.find((s) => s.id === sheetForm.from.value);
        if (from && !from.inRange) {
          const nearer = check.shops.filter((s) => s.inRange).sort((a, b) => a.distanceKm - b.distanceKm)[0];
          error.innerHTML = nearer
            ? `That's ${from.distanceKm} km from ${esc(from.name)}, outside our ${check.radiusKm} km delivery area. <button type="button" class="link-button" data-use-shop="${esc(nearer.id)}">Deliver from ${esc(nearer.name)} instead (${nearer.distanceKm} km)</button>`
            : `Sorry, that's outside our ${check.radiusKm} km delivery area (${from.distanceKm} km from ${esc(from.name)}). Pickup is always an option.`;
          flagFields(sheetForm, "", ["street", "city", "postcode"]);
          return;
        }
        store.set("bp-delivery", next);
        location.replace(urlFor({ location: sheetForm.from.value, mode: "delivery" }));
      } else {
        const next = $("input[name=sheetLocation]:checked", sheetForm)?.value || loc.id;
        location.replace(urlFor({ location: next, mode: "pickup" }));
      }
    });

    // Asked for delivery but no address yet: start with the sheet.
    if (mode === "delivery" && !hasAddress()) {
      mode = "pickup";
      setTimeout(() => openSheet("delivery"), 0);
    }
    days = pickupDays(loc, new Date(), lead());
    dayIndex = Math.max(0, days.findIndex((d) => d.slots.length));

    // The queue at this bar, checked now and every minute while the menu is open.
    const checkQueue = async () => {
      try {
        const r = await fetch(`/api/cafe-queue?location=${encodeURIComponent(loc.id)}`);
        if (!r.ok) return;
        const { cups } = await r.json();
        if (cups === cupsAhead) return;
        cupsAhead = cups;
        renderControls();
      } catch {
        /* offline: keep the last count */
      }
    };
    checkQueue();
    setInterval(() => !document.hidden && checkQueue(), 60e3);

    /* Menu */
    const items = Object.fromEntries(CAFE_MENU.flatMap((s) => s.items).map((i) => [i.id, i]));
    const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    // Coffee to take home: the shop's bags, added to the café order (picked up or delivered with it).
    const bags = PRODUCTS.filter((p) => !p.soldOut);
    const fromPrice = (item) => item.price + (item.options || []).filter((o) => !o.multi).reduce((n, o) => n + Math.min(...o.choices.map((c) => c.price)), 0);
    const hasUpcharge = (item) => (item.options || []).some((o) => o.choices.some((c) => c.price > 0));
    $("[data-menu-tabs]").innerHTML =
      CAFE_MENU.map((s, i) => `<a href="#${slug(s.title)}"${i === 0 ? ' class="is-active"' : ""}>${esc(s.title)}</a>`).join("") +
      (bags.length ? `<a href="#coffee-to-take-home">Coffee To Take Home</a>` : "");
    $("[data-menu-sections]").innerHTML = CAFE_MENU.map(
      (s) => `
      <section class="drink-section" id="${slug(s.title)}">
        <h2>${esc(s.title)}</h2>
        <ul class="drink-grid">
          ${s.items
            .map(
              (item) => `
            <li>
              <button type="button" class="drink-card${item.soldOut ? " is-sold-out" : ""}" data-drink="${item.id}" ${item.soldOut ? `disabled aria-label="${esc(item.name)}, sold out"` : `aria-label="Add ${esc(item.name)}, ${money(item.price)}"`}>
                <span class="drink-image">${item.image ? `<img src="${esc(item.image)}" alt="" loading="lazy">` : drinkSvg(item)}${item.soldOut ? `<span class="sold-out">Sold out</span>` : `<span class="drink-add" aria-hidden="true">+</span>`}</span>
                <span class="drink-name">${esc(item.name)}${(item.tags || []).map((t) => ` <abbr class="diet" title="${{ V: "Vegetarian", VG: "Vegan", GF: "Gluten free" }[t] || t}">${esc(t)}</abbr>`).join("")}</span>
                ${item.note ? `<span class="drink-note">${esc(item.note)}</span>` : ""}
                <span class="drink-price">${hasUpcharge(item) ? `From ${money(fromPrice(item))}` : money(item.price)}</span>
                ${item.madeOnArrival || (item.lowStock && !item.soldOut) ? `<span class="drink-flags">${item.madeOnArrival ? `<span>Made on arrival</span>` : ""}${item.lowStock && !item.soldOut ? `<span class="is-low">Low stock</span>` : ""}</span>` : ""}
              </button>
            </li>`
            )
            .join("")}
        </ul>
      </section>`
    ).join("") +
      (bags.length
        ? `<section class="drink-section" id="coffee-to-take-home">
        <h2>Coffee To Take Home</h2>
        <ul class="drink-grid">${bags
          .map(
            (p) => `<li><button type="button" class="drink-card bag-card" data-bag="${esc(p.id)}" aria-label="Add ${esc(p.short || p.name)}">
              <span class="drink-image">${productArt(p)}<span class="drink-add" aria-hidden="true">+</span></span>
              <span class="drink-name">${esc(p.short || p.name)}</span>
              <span class="drink-note">${esc(p.type)} · ${esc(p.notes || "")}</span>
              <span class="drink-price">From ${money(p.price)}</span>
            </button></li>`
          )
          .join("")}</ul>
      </section>`
        : "");

    // Options sheet: a drink's Size / Milk / Extras, or a bag's size and grind.
    const sheet = $("#item-options");
    let onAdd = null;
    const openOptions = ({ title, groups, base, addLabel, add }) => {
      $("[data-opt-title]", sheet).textContent = title;
      $("[data-opt-body]", sheet).innerHTML = groups
        .map(
          (g) => `<fieldset class="opt-group">
            <legend>${esc(g.name)}${g.multi ? ` <small>Optional</small>` : ""}</legend>
            ${g.choices
              .map(
                (c, i) => `<label class="opt-choice"><input type="${g.multi ? "checkbox" : "radio"}" name="opt-${esc(g.id)}" value="${esc(c.id)}" ${!g.multi && i === 0 ? "checked" : ""}>
                  <span>${esc(c.name)}</span><b>${c.label ?? (c.price ? `+${money(c.price)}` : "")}</b></label>`
              )
              .join("")}
          </fieldset>`
        )
        .join("");
      const form = $("[data-opt-form]", sheet);
      const read = () =>
        Object.fromEntries(groups.map((g) => [g.id, g.multi ? $$(`[name="opt-${g.id}"]:checked`, form).map((i) => i.value) : $(`[name="opt-${g.id}"]:checked`, form)?.value]));
      const total = () => base(read());
      const update = () => ($("[data-opt-add]", sheet).textContent = `${addLabel} · ${money(total())}`);
      form.onchange = update;
      update();
      onAdd = () => add(read(), total());
      openOverlay("item-options");
    };
    $("[data-opt-form]", sheet).addEventListener("submit", (e) => {
      e.preventDefault();
      onAdd?.();
      closeOverlays();
    });

    const addDrink = (item, picks = {}, price = item.price) => {
      syncPickupLines();
      const chosen = (item.options || []).flatMap((g) => [].concat(picks[g.id] || []).map((id) => g.choices.find((c) => c.id === id)?.name).filter(Boolean));
      const optKey = (item.options || []).map((g) => [].concat(picks[g.id] || []).join("+")).join("/");
      addLine(
        {
          key: `pickup:${item.id}${optKey ? `:${optKey}` : ""}`,
          kind: "pickup",
          title: chosen.length ? `${item.name} (${chosen.join(", ")})` : item.name,
          variant: describe().variant,
          delivery: mode === "delivery" ? { ...address, from: loc.id } : null,
          price,
          ...(item.options?.length ? { options: picks } : {}),
        },
        { open: false }
      );
      toast(`${esc(item.name)} added · <button type="button" data-open="cart">View cart (${cartCount()})</button>`);
    };

    $("[data-menu-sections]").addEventListener("click", (e) => {
      const bagCard = e.target.closest("[data-bag]");
      if (bagCard) {
        const p = PRODUCTS.find((x) => x.id === bagCard.dataset.bag);
        return openOptions({
          title: p.short || p.name,
          groups: [
            { id: "size", name: "Size", choices: [{ id: "250g", name: "250g", label: money(p.price) }, { id: "1kg", name: "1kg", label: money(p.price1kg) }] },
            { id: "grind", name: "Grind", choices: grindsFor(p).map((g) => ({ id: g, name: g, label: "" })) },
          ],
          base: (pk) => (pk.size === "1kg" ? p.price1kg : p.price),
          addLabel: "Add",
          add: (pk) => {
            addLine(coffeeLine(p, pk.size, pk.grind), { open: false });
            toast(`${esc(p.short || p.name)} added · <button type="button" data-open="cart">View cart (${cartCount()})</button>`);
          },
        });
      }
      const card = e.target.closest("[data-drink]");
      if (!card) return;
      const item = items[card.dataset.drink];
      card.classList.remove("is-added");
      void card.offsetWidth;
      card.classList.add("is-added");
      clearTimeout(card.addedTimer);
      card.addedTimer = setTimeout(() => card.classList.remove("is-added"), 900); // a brief tick, not a stuck state
      if (!item.options?.length) return addDrink(item);
      openOptions({
        title: item.name,
        groups: item.options,
        base: (pk) => item.price + item.options.reduce((n, g) => n + [].concat(pk[g.id] || []).reduce((m, id) => m + (g.choices.find((c) => c.id === id)?.price || 0), 0), 0),
        addLabel: "Add",
        add: (pk, total) => addDrink(item, pk, total),
      });
    });

    // Highlight the tab for the section in view.
    const tabs = $$("[data-menu-tabs] a");
    if ("IntersectionObserver" in window) {
      const spy = new IntersectionObserver(
        (entries) =>
          entries.forEach((en) => {
            if (!en.isIntersecting) return;
            tabs.forEach((t) => {
              const on = t.getAttribute("href") === `#${en.target.id}`;
              t.classList.toggle("is-active", on);
              // Slide the tab bar sideways only: scrollIntoView could also move the page on iPhones.
              if (on) {
                const bar = t.parentElement;
                const left = t.offsetLeft - bar.offsetLeft;
                if (left < bar.scrollLeft || left + t.offsetWidth > bar.scrollLeft + bar.clientWidth) bar.scrollTo({ left: left - 16, behavior: "smooth" });
              }
            });
          }),
        { rootMargin: "-45% 0px -50% 0px" }
      );
      $$(".drink-section").forEach((sec) => spy.observe(sec));
    }

    // Straight to the menu: a saved time that still works, otherwise ASAP or the next window.
    if (!validPickup(loc, time, new Date(), lead())) time = defaultTime();
    store.set("bp-pickup", { location: loc.id, mode, time });
    setUrl();
    syncPickupLines();
    renderControls();
    menu.hidden = false;
  },

  privacy() {
    $$("[data-email-link]").forEach((a) => {
      a.href = `mailto:${SITE[a.dataset.emailLink]}`;
      a.textContent = SITE[a.dataset.emailLink];
    });
  },

  terms() {
    pages.privacy();
  },

  "shipping-returns"() {
    pages.privacy();
    // Phones label each table cell (CSS shows data-label): in the page's language.
    $$(".sr-table td[data-label]").forEach((td) => (td.dataset.label = window.i18n?.t(td.dataset.label) ?? td.dataset.label));
  },

  "gift-cards"() {
    giftCardsPage();
  },

  gift() {
    giftPage();
  },

  // Mimi Food Ambassadors: the offer comes from the back office (SITE.ambassadors); until
  // applications open, the page says so and the form stays hidden.
  ambassadors() {
    const amb = SITE.ambassadors || { open: false };
    $$("[data-email-link]").forEach((a) => {
      a.href = `mailto:${SITE[a.dataset.emailLink]}`;
      a.textContent = SITE[a.dataset.emailLink];
    });
    $$("[data-instagram]").forEach((a) => {
      a.href = `https://instagram.com/${SITE.instagram}`;
      a.textContent = `@${SITE.instagram}`;
    });
    $$("[data-amb-open]").forEach((el) => (el.hidden = !amb.open));
    $$("[data-amb-closed]").forEach((el) => (el.hidden = amb.open));
    if (!amb.open) return;
    const cards = [
      ["For your followers", `${amb.discount}% off with your code.`],
      amb.commission > 0 && ["For you", `${amb.commission}% of each order with your code.`],
      amb.perks && ["And more", amb.perks],
    ].filter(Boolean);
    $("[data-amb-cards]").innerHTML = cards.map(([h, p], i) => `<li data-reveal style="--i:${i}"><h3>${esc(h)}</h3><p>${esc(p)}</p></li>`).join("");
    const form = $("[data-amb-form]");
    const error = $("[data-amb-error]");
    form.hidden = false;
    // Send stays off until they've confirmed their age and agreed to the terms.
    const send = $("button[type=submit]", form);
    const agreed = () => (send.disabled = !form.agree.checked);
    form.agree.addEventListener("change", agreed);
    agreed();
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      if (!form.name.value.trim() || !form.email.value.trim() || !form.email.validity.valid) {
        error.textContent = "Add your name and email.";
        return flagFields(form);
      }
      if (![form.instagram, form.tiktok, form.youtube].some((f) => f.value.trim())) {
        error.textContent = "Add at least one account: Instagram, TikTok or YouTube.";
        return flagFields(form, error.textContent, ["instagram", "tiktok", "youtube"]);
      }
      if (!form.agree.checked) {
        error.textContent = "Confirm you're 18 or older and agree to the Terms.";
        form.agree.focus();
        return;
      }
      const button = $("button[type=submit]", form);
      button.disabled = true;
      try {
        await api("/api/ambassadors", { method: "POST", body: { ...Object.fromEntries(new FormData(form)), agree: form.agree.checked, adult: form.agree.checked } });
      } catch (err) {
        error.textContent = err.message;
        flagFields(form, err.message);
        agreed();
        return;
      }
      form.hidden = true;
      $("[data-amb-sent]").hidden = false;
    });
  },

  wholesale() {
    $$("[data-email-link]").forEach((a) => {
      a.href = `mailto:${SITE[a.dataset.emailLink]}`;
      a.textContent = SITE[a.dataset.emailLink];
    });

    const form = $("[data-ws-form]");
    const error = $("[data-ws-error]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      if (!form.business.value.trim() || !form.name.value.trim() || !form.email.validity.valid || !form.email.value.trim()) {
        error.textContent = "Add your business, name and email.";
        flagFields(form);
        return;
      }
      const fd = new FormData(form);
      const data: any = { ...Object.fromEntries(fd), interest: fd.getAll("interest").join(", ") };
      const button = $("button[type=submit]", form);
      button.disabled = true;
      try {
        await api("/api/wholesale", { method: "POST", body: data });
      } catch (err) {
        if (err.status === 404 || err.status === 405 || !err.status) {
          // No server (static hosting): fall back to a pre-filled email.
          const body = Object.entries(data).map(([k, v]) => `${k}: ${v}`).join("\n");
          location.href = `mailto:${SITE.wholesaleEmail}?subject=${encodeURIComponent(`Wholesale inquiry: ${data.business}`)}&body=${encodeURIComponent(body)}`;
        } else {
          error.textContent = err.message;
          flagFields(form, err.message);
          button.disabled = false;
          return;
        }
      }
      form.hidden = true;
      $("[data-ws-sent]").hidden = false;
    });
  },

  login() {
    const asked = loginNext();
    const next = safeNext(asked);
    // Going to an invoice (from its link): say which one, and why a login is needed.
    const invoiceNo = /^trade(?:#invoice-|\/invoices\/)(MF-[A-Z0-9]+)$/i.exec(next)?.[1];
    // The wholesale login (/login/wholesale, or on the way to the portal): no Create Account, since
    // wholesale logins are set up by us after an enquiry; a text code when Twilio is set up.
    const wholesale = /\/login\/wholesale\/?$/.test(location.pathname) || /^trade\b/.test(next);
    if (wholesale) {
      // The portal's sign-in, as an app's: on its own, without the shop around it (styles.css).
      document.body.classList.add("is-app-login");
      $(".page-head h1").textContent = "Wholesale Login";
      $("[data-wholesale-link]").hidden = true;
      $("[data-wholesale-new]").hidden = false;
    }
    if (invoiceNo) {
      $(".page-head h1").textContent = `Invoice ${invoiceNo}`;
      // An expired link is the one thing worth saying: the title already names the invoice.
      if (new URLSearchParams(location.search).has("expired")) $(".page-head").insertAdjacentHTML("beforeend", "<p>That link has expired. Log in to view and pay it.</p>");
    }
    currentUser.then((user) => user && location.replace(next));
    // Where to go once signed in: where they were headed, a wholesale login's portal, or the
    // account page.
    const done = async (r, method) => {
      gaEvent(r.created ? "sign_up" : "login", { method });
      setLoginNext("");
      location.href = asked ? next : r.next || (await api("/api/trade/me").then(() => "trade", () => next));
    };

    // Log in or sign up with a code. Their email or phone first: with an account, the code is sent
    // and six boxes open; new here, their name, email and phone, then the code.
    const codeForm = $("[data-code-form]");
    const codeError = $("[data-code-error]");
    const codeButton = $("button[type=submit]", codeForm);
    const boxes = $$("[data-otp] input");
    let via = "email";
    let sentTo = "";
    let now = "contact";
    const field = () => (via === "phone" ? codeForm.phone : codeForm.email);
    // Signing up, the page's title says so (no second title in the card).
    const title = $(".auth-page h1");
    const titleText = title?.textContent;
    const step = (name) => {
      now = name;
      if (title) title.textContent = name === "signup" ? "Create Your Account" : titleText;
      $$("[data-step]").forEach((el) => (el.hidden = el.dataset.step !== name));
      $$("[data-via-field]").forEach((l) => (l.hidden = l.dataset.viaField !== via));
      $("[data-via-tabs]").hidden = name !== "contact" || !SITE.textLogin;
      $("[data-signup-back]").hidden = name !== "signup";
      // Past the first step, nothing else on the card: just the code (or their details).
      $("[data-wholesale-link]").hidden = name !== "contact" || wholesale;
      $("[data-passkey-block]").hidden = name !== "contact" || !window.PublicKeyCredential;
      codeButton.textContent = name === "signup" ? "Create Account" : name === "code" ? "Log In" : "Continue";
      codeButton.hidden = name === "code"; // the sixth digit sends it
      codeError.textContent = "";
    };
    const setVia = (v) => {
      via = v;
      $$("[data-via]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.via === v)));
      step("contact");
      field().focus();
    };
    $$("[data-via]").forEach((b) => b.addEventListener("click", () => setVia(b.dataset.via)));
    // Phone codes need Twilio; without it, email only.
    $("[data-via-tabs]").hidden = !SITE.textLogin;
    if (wholesale && SITE.textLogin) setVia("phone"); // wholesale: the phone on the account

    // The six boxes: typing moves on, backspace moves back, a pasted or autofilled code fills them
    // all, and the sixth digit sends it.
    const code = () => boxes.map((b) => b.value).join("");
    const fill = (digits, from = 0) => {
      digits = digits.replace(/\D/g, "").slice(0, 6 - from);
      [...digits].forEach((d, i) => (boxes[from + i].value = d));
      const next = Math.min(from + digits.length, 5);
      boxes[next].focus();
      if (code().length === 6) verify();
    };
    const clearBoxes = () => boxes.forEach((b) => (b.value = ""));
    boxes.forEach((box, i) => {
      box.addEventListener("input", () => {
        const v = box.value;
        box.value = "";
        if (v) fill(v, i);
        codeError.textContent = "";
        $("[data-otp]").classList.remove("is-wrong");
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && !box.value && i) {
          boxes[i - 1].value = "";
          boxes[i - 1].focus();
          e.preventDefault();
        }
        if (e.key === "ArrowLeft" && i) boxes[i - 1].focus();
        if (e.key === "ArrowRight" && i < 5) boxes[i + 1].focus();
      });
      box.addEventListener("paste", (e) => {
        e.preventDefault();
        clearBoxes();
        fill(e.clipboardData.getData("text"), 0);
      });
      box.addEventListener("focus", () => box.select());
    });
    // A new code can be asked for after 30 seconds: a countdown, then the button.
    let resendTimer = 0;
    const resendIn = (seconds) => {
      clearInterval(resendTimer);
      const wait = $("[data-resend-wait]");
      const button = $("[data-code-resend]");
      let left = seconds;
      const tick = () => {
        wait.hidden = left <= 0;
        button.hidden = left > 0;
        wait.textContent = `Resend in 0:${String(left).padStart(2, "0")}`;
        if (left-- <= 0) clearInterval(resendTimer);
      };
      tick();
      resendTimer = window.setInterval(tick, 1000);
    };
    // heading/shownTo: when the code went another way (emailed because a text failed, or to the
    // email that already has an account), saying so and where.
    const showCode = (heading = "", shownTo = "") => {
      const t = (x) => window.i18n?.t(x) ?? x;
      $("[data-code-sent]").textContent = heading ? t(heading) : via === "phone" ? t("Enter the code we texted to") : t("Enter the code we emailed to");
      $("[data-code-to]").textContent = shownTo || sentTo;
      step("code");
      clearBoxes();
      boxes[0].focus();
      resendIn(30);
    };

    let verifying = false;
    async function verify() {
      if (verifying) return;
      verifying = true;
      boxes.forEach((b) => (b.disabled = true));
      try {
        const r = await api("/api/auth/code/verify", { method: "POST", body: { via, to: sentTo, code: code(), wholesale } });
        return await done(r, via === "phone" ? "text" : "email_code");
      } catch (err) {
        codeError.textContent = err.message;
        boxes.forEach((b) => (b.disabled = false));
        $("[data-otp]").classList.remove("is-wrong");
        void $("[data-otp]").offsetWidth;
        $("[data-otp]").classList.add("is-wrong");
        clearBoxes();
        boxes[0].focus();
      } finally {
        verifying = false;
      }
    }

    $("[data-code-resend]").addEventListener("click", async () => {
      try {
        if (now === "code" && codeForm.name.value.trim()) await api("/api/auth/code/signup", { method: "POST", body: { via, to: sentTo, name: codeForm.name.value, email: codeForm.newEmail.value, phone: codeForm.newPhone.value } });
        else await api("/api/auth/code/start", { method: "POST", body: { via, to: sentTo, wholesale } });
        toast("New code sent.");
        resendIn(30);
      } catch (err) {
        codeError.textContent = err.message;
      }
    });
    $$("[data-code-change]").forEach((b) =>
      b.addEventListener("click", () => {
        sentTo = "";
        codeForm.name.value = "";
        step("contact");
        field().focus();
      })
    );

    // As they type: once it looks complete and they pause, a ring turns in the field while we look
    // it up, then it moves on by itself: an account gets its code (six boxes), someone new the
    // sign-up form. Enter (or Continue) does the same at once.
    let lookTimer = 0;
    let looking = "";
    const complete = (v) => (via === "phone" ? v.replace(/\D/g, "").length >= 10 : /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v));
    async function lookUp(asked = false) {
      clearTimeout(lookTimer);
      const value = field().value.trim();
      if (!complete(value)) {
        if (asked) {
          codeError.textContent = via === "phone" ? "Enter your mobile number." : "Enter a valid email.";
          flagFields(codeForm, "", [via]);
        }
        return;
      }
      if (looking === value) return;
      looking = value;
      const label = field().closest("label");
      label.classList.add("is-checking");
      codeButton.disabled = true;
      try {
        // The ring turns for at least a second, however fast the answer comes, so it's seen.
        const [r] = await Promise.all([api("/api/auth/code/check", { method: "POST", body: { via, to: value, wholesale } }), new Promise((done) => setTimeout(done, 1100))]);
        if (field().value.trim() !== value || now !== "contact") return; // they kept typing, or moved on
        sentTo = value;
        if (r.exists) {
          const s = await api("/api/auth/code/start", { method: "POST", body: { via, to: value, wholesale } });
          if (s.emailed) showCode("We couldn't text you, so we emailed your code to", s.emailed);
          else showCode();
        } else {
          // New here: their details, with what they typed filled in (and kept).
          step("signup");
          codeForm.newEmail.value = via === "email" ? value : "";
          codeForm.newPhone.value = via === "phone" ? value : "";
          codeForm.newEmail.readOnly = via === "email";
          codeForm.newPhone.readOnly = via === "phone";
          codeForm.name.focus();
        }
      } catch (err) {
        if (field().value.trim() === value) {
          codeError.textContent = err.message;
          flagFields(codeForm, "", [via]);
        }
      } finally {
        looking = "";
        label.classList.remove("is-checking");
        codeButton.disabled = false;
      }
    }
    [codeForm.email, codeForm.phone].forEach((input) =>
      input.addEventListener("input", () => {
        codeError.textContent = "";
        clearTimeout(lookTimer);
        if (now === "contact") lookTimer = window.setTimeout(() => lookUp(), 700);
      })
    );
    // Any edit clears the last message.
    codeForm.addEventListener("input", (e) => {
      if (e.target.closest("[data-otp]")) return;
      codeError.textContent = "";
      e.target.removeAttribute("aria-invalid");
    });

    codeForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      codeError.textContent = "";
      if (now === "code") return code().length === 6 ? verify() : undefined;
      if (now === "signup") {
        const missing = [["name", "Enter your name."], ["newEmail", "Enter your email."], ["newPhone", "Enter your mobile number."]].find(([k]) => !codeForm[k].value.trim());
        if (missing) {
          codeError.textContent = missing[1];
          return flagFields(codeForm, "", [missing[0]]);
        }
      }
      if (now === "contact") return lookUp(true);
      codeButton.disabled = true;
      try {
        {
          const r = await api("/api/auth/code/signup", { method: "POST", body: { via, to: sentTo, name: codeForm.name.value, email: codeForm.newEmail.value, phone: codeForm.newPhone.value } });
          if (r.via === "email") {
            // The code went to their email: it already has an account (the number joins it), or
            // the text didn't go through.
            via = "email";
            sentTo = r.to;
            if (r.link) codeForm.name.value = ""; // a new code is asked for as a login, not a sign-up
            showCode(r.link ? "That email has an account. Enter the code we emailed to" : "We couldn't text you, so we emailed your code to");
          } else showCode();
        }
      } catch (err) {
        codeError.textContent = err.message;
        const f = err.data?.field;
        flagFields(codeForm, "", [now === "contact" ? via : f === "email" ? "newEmail" : f === "phone" ? "newPhone" : "name"]);
      }
      codeButton.disabled = false;
    });

    // A passkey (Face ID, Touch ID, Windows Hello, a phone): nothing to type. Added in the portal.
    if (window.PublicKeyCredential) {
      $("[data-passkey-block]").hidden = false;
      const passkeyError = $("[data-passkey-error]");
      $("[data-passkey]").addEventListener("click", async (e) => {
        const button = e.currentTarget;
        passkeyError.textContent = "";
        button.disabled = true;
        try {
          const { options, ticket } = await api("/api/auth/passkey/login/options", { method: "POST", body: {} });
          const response = await passkeyGet(options);
          const r = await api("/api/auth/passkey/login", { method: "POST", body: { ticket, response } });
          gaEvent("login", { method: "passkey" });
          setLoginNext("");
          location.href = asked ? next : r.next;
          return;
        } catch (err) {
          // Closing the device's prompt isn't an error worth showing.
          if (err.name !== "NotAllowedError" && err.name !== "AbortError") passkeyError.textContent = err.message;
        }
        button.disabled = false;
      });
    }

  },

  reset() {
    const form = $("[data-reset-form]");
    // The token comes from the emailed link, then is kept for this tab only, so a reload still works
    // once it's out of the address bar.
    const session = (fn) => {
      try {
        return fn(sessionStorage);
      } catch {
        return null;
      }
    };
    const saved = session((s) => new URLSearchParams(s.getItem("bp-reset") || ""));
    const params = new URLSearchParams(location.search).has("token") ? new URLSearchParams(location.search) : saved || new URLSearchParams();
    const token = params.get("token");
    const next = safeNext(params.get("next"));
    if (!token) {
      form.hidden = true;
      $("[data-reset-missing]").hidden = false;
      return;
    }
    session((s) => s.setItem("bp-reset", params.toString()));
    // Keep the token out of the address bar (and browser history) once read.
    history.replaceState(null, "", "reset");
    form.addEventListener("input", () => ($("[data-reset-error]").textContent = ""));
    // Live checks under the fields: long enough, and the two the same (once the second is typed).
    const checks = () => {
      const pw = form.password.value;
      const again = form.confirm.value;
      const set = (name, ok, text) => {
        const li = $(`[data-pw-check="${name}"]`);
        li.classList.toggle("is-ok", ok === true);
        li.classList.toggle("is-bad", ok === false);
        li.textContent = text;
      };
      set("length", pw.length >= 8 ? true : null, pw && pw.length < 8 ? `At least 8 characters (${8 - pw.length} more)` : "At least 8 characters");
      set("match", again ? pw === again : null, !again ? "Passwords match" : pw === again ? "Passwords match" : pw.startsWith(again) ? "Keep typing to match" : "Passwords don't match");
      if (again && pw.startsWith(again) && pw !== again) $(`[data-pw-check="match"]`).classList.remove("is-bad");
    };
    form.addEventListener("input", checks);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const error = $("[data-reset-error]");
      error.textContent = "";
      if (form.password.value !== form.confirm.value) {
        error.textContent = "The two passwords don't match.";
        flagFields(form, "", ["confirm"]);
        return;
      }
      const button = $("button[type=submit]", form);
      button.disabled = true;
      try {
        await api("/api/auth/reset", { method: "POST", body: { token, password: form.password.value } });
        session((s) => s.removeItem("bp-reset"));
        // Like logging in: wholesale customers land in their ordering portal.
        location.href = params.get("next") ? next : await api("/api/trade/me").then(() => "trade", () => next);
      } catch (err) {
        error.innerHTML = `${esc(err.message)}${err.status === 400 ?  ' <a href="login/forgot">Request a new link</a>.' : ""}`;
        if (err.status !== 400) flagFields(form, err.message);
        button.disabled = false;
      }
    });
  },

  // Wholesale portal: order at wholesale prices, see orders and invoices, update details.
  async trade() {
    const root = $("[data-trade]");
    const user = await currentUser;
    if (!user) return toLogin(location.pathname.replace(/^\/((es|ko)\/)?/, "") + location.hash);
    let data;
    try {
      data = await api("/api/trade/me");
    } catch (error) {
      root.innerHTML = `
        <header class="page-head"><h1>Wholesale ordering</h1></header>
        <div class="empty-state"><p>${esc(error.message)}</p><a class="button" href="account">Your account</a></div>`;
      return;
    }
    const a = data.account;
    const qty: any = {}; // `${product}:${size}` → number
    // Each page has its own address: /trade (Overview), /trade/products, /trade/orders, /trade/orders/MF-…,
    // /trade/balance, /trade/invoices/MF-… and /trade/account. Older links (#orders,
    // #invoice-MF-…) move to theirs.
    const tradeBase = (/^(\/(es|ko))?\/trade/.exec(location.pathname) || ["/trade"])[0];
    const SLUG = { home: "", order: "products", orders: "orders", balance: "balance", samples: "samples", agreement: "agreement", details: "account" };
    const legacy = location.hash.slice(1);
    const [, seg = "", ref = ""] = location.pathname.slice(tradeBase.length).split("/").map(decodeURIComponent);
    const routeFrom = () =>
      /^invoice-/.test(legacy) ? ["invoice", legacy.slice(8)] : /^order-/.test(legacy) ? ["orderview", legacy.slice(6)] : SLUG[legacy] !== undefined && legacy ? [legacy, ""] : seg === "invoices" && ref ? ["invoice", ref] : seg === "orders" && ref ? ["orderview", ref] : seg === "agreement" && ref ? ["agreement", ref] : [Object.keys(SLUG).find((k) => SLUG[k] === seg) || "home", ""];
    const [startTab, startRef] = routeFrom();
    const tradeUrl = (t, no = "") => `${tradeBase}${t === "invoice" ? `/invoices/${encodeURIComponent(no)}` : t === "orderview" ? `/orders/${encodeURIComponent(no)}` : t === "agreement" && no ? `/agreement/${encodeURIComponent(no)}` : SLUG[t] ? `/${SLUG[t]}` : ""}`;
    if (legacy) history.replaceState(null, "", tradeUrl(startTab, startRef));
    let tab = startTab;
    const STATUS = { new: "Received", packed: "Packed", shipped: "Shipped", ready: "Ready to collect", completed: "Completed", cancelled: "Cancelled" };
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });
    const shortDate = (iso) => new Date(`${iso.slice(0, 10)}T12:00:00`).toLocaleDateString(LOCALE_US, { month: "short", day: "numeric", year: "numeric" });
    const addressText = (ad) => (ad?.street ? `${ad.street}, ${ad.city}, ${ad.state} ${ad.postcode}` : "");
    const terms = a.terms ? `Net ${a.terms}` : "Due on receipt";

    // The order being built is kept for this tab (a reload doesn't empty it), per account, until
    // it's placed.
    const ORDER_KEY = `tp-order:${user.email}:${a.business}`;
    const kept = (() => {
      try {
        return JSON.parse(sessionStorage.getItem(ORDER_KEY) || "null");
      } catch {
        return null;
      }
    })();
    if (kept?.qty) Object.assign(qty, kept.qty);
    let notesNow = String(kept?.notes || "");
    // An earlier order's or the usual order's lines, added to an order (never replacing it). 1kg
    // coffee bags come back as 5 lb; tea by the kilo stays 1 kg; anything no longer listed is left out.
    const addFrom = (ls, into = qty) => {
      ls.forEach((l) => {
        if (!l.product) return;
        const isTea = (data.teas || []).some((t) => t.id === l.product);
        if (!isTea && !data.prices.some((p) => p.id === l.product)) return;
        const key = `${l.product}:${isTea ? (l.size === "1kg" ? "1kg" : "tin") : l.size === "1kg" ? "5lb" : l.size || "tin"}`;
        into[key] = Math.min(500, (into[key] || 0) + l.qty);
      });
      return into;
    };
    // `${coffee}:5lb`, `${coffee}:250g` or `${tea}:tin` (a pack of 8 cups) → quantity.
    const lines = () => linesOf(qty);
    const linesOf = (q) =>
      Object.entries<any>(q)
        .filter(([, n]) => n > 0)
        .map(([key, n]) => {
          const [product, size] = key.split(":");
          const t = (data.teas || []).find((x) => x.id === product);
          if (t && size === "1kg") return t.price1kg && { product, size, qty: n, name: t.name, label: "1 kg loose", price: t.price1kg, bulk: true };
          if (t) return { product, size, qty: n, name: t.name, label: t.pack, price: t.price, retail: true };
          const p = data.prices.find((x) => x.id === product);
          return p && { product, size, qty: n, grind: "Whole Bean", name: p.name, label: size === "5lb" ? "5 lb" : "250g retail", price: p.byQuote ? 0 : size === "5lb" ? p.price5lb : p.price250, retail: size === "250g", byQuote: Boolean(p.byQuote), limited: Boolean(p.limited) };
        })
        .filter(Boolean)
        // Volume pricing: enough 5 lb bags in the order takes a percent off each (as the server does).
        .map((l: any, _, all) => {
          const t = tierFor(all.filter((x) => x.size === "5lb" && !x.byQuote).reduce((n, x) => n + x.qty, 0));
          return t && l.size === "5lb" && !l.byQuote ?{ ...l, price: Math.round(l.price * (1 - t.off / 100) * 100) / 100, tier: t } : l;
        });
    const tierFor = (bags) => [...(a.tiers || [])].reverse().find((t) => bags >= t.bags) || null;
    // Beyond the local radius: the bulk and retail minimums (the server checks them again).
    const R = data.rules || { local: true };
    // Where a delivery goes: "" for the main address, or one of their other locations.
    let shipLoc = String(kept?.loc || "");
    // Delivery or Pickup, for the order being built (and the reorder sheet).
    let way = kept?.way === "Pickup" || kept?.way === "Delivery" ? kept.way : a.address?.street || a.locations?.length ? "Delivery" : "Pickup";
    const saveOrder = () => {
      try {
        if (lines().length || notesNow) sessionStorage.setItem(ORDER_KEY, JSON.stringify({ qty, way, loc: shipLoc, notes: notesNow }));
        else sessionStorage.removeItem(ORDER_KEY);
      } catch {}
    };
    const shipPlace = () => (shipLoc && (a.locations || []).find((l) => l.id === shipLoc)) || null;
    const shortfall = (ls, delivering) => {
      if (!delivering || (shipPlace() ? shipPlace().local : R.local)) return "";
      const bulk = ls.filter((l) => l.size === "5lb" || l.bulk).reduce((n, l) => n + l.qty, 0);
      const retail = ls.filter((l) => l.retail).reduce((n, l) => n + l.qty, 0);
      if (bulk && bulk < R.minimums.bulk) return `Add ${R.minimums.bulk - bulk} more bulk ${R.minimums.bulk - bulk === 1 ? "bag" : "bags"} (5 lb coffee or 1 kg tea): delivered beyond ${R.localMiles} miles, bulk orders start at ${R.minimums.bulk}.`;
      if (retail && retail < R.minimums.retail) return `Add ${R.minimums.retail - retail} more retail bags or teas: delivered beyond ${R.localMiles} miles, retail orders start at ${R.minimums.retail}.`;
      return "";
    };
    const picked = (id) => Object.entries<any>(qty).some(([k, n]) => n > 0 && k.startsWith(`${id}:`));

    // Their usual order: what's in it, and one tap to fill the order with it.
    const itemName = (l) => {
      const t = (data.teas || []).find((x) => x.id === l.product);
      const p = data.prices.find((x) => x.id === l.product);
      return `${l.qty} × ${(t || p)?.short || (t || p)?.name || l.product} ${t ? (l.size === "1kg" ? "1 kg" : "pack") : l.size === "250g" ? "250g" : "5 lb"}`;
    };
    // A price and its − / + quantity, in a column of the price table (the column says the size).
    // A by-quote coffee says "By Quote" once (in its first column); the second size's price is left blank.
    const qtyCell = (key, label, price, name) =>
      `<td class="num"><div class="tp-cell"><small class="tp-size">${label}</small><b>${price === "" ? "" : price == null ? "By Quote" : money(price)}</b><div class="trade-stepper${qty[key] ? " is-on" : ""}"><button type="button" data-step="-1" data-step-key="${key}" aria-label="One less ${esc(name)} ${label}">−</button><input type="number" min="0" step="1" inputmode="numeric" data-qty="${key}" value="${qty[key] || ""}" placeholder="0" aria-label="${esc(name)} ${label} quantity"><button type="button" data-step="1" data-step-key="${key}" aria-label="One more ${esc(name)} ${label}">+</button></div></div></td>`;
    // Its name and notes, a quiet Limited Drop (or Price on Request) tag when it's by quote, and
    // Ask (Ask Us a Question about this one).
    const productCell = (x, sub) =>
      `<td><div class="tp-product"><span class="trade-swatch" style="background:${esc(x.color)}"></span><span><strong>${esc(x.name)}</strong><small>${esc(sub)}</small>${x.byQuote ? `<span class="tp-q-tag">${x.limited ? "Limited Drop" : "Price on Request"}</span>` : ""}</span><button type="button" class="tp-icon-btn tp-ask-item" data-ask-item="${esc(x.id)}" aria-label="Ask about ${esc(x.short || x.name)}" title="Ask Us a Question">${TP_ICON.chat}</button></div></td>`;
    // What the search box looks through.
    const findText = (...xs) => esc(xs.filter(Boolean).join(" ").toLowerCase());
    let shelf = "all"; // all, coffee or tea
    const orderTab = () => `
      ${data.agreement?.required && !data.agreement?.signed ? `<div class="tp-ag-bar"><span>${esc(tr("Sign your wholesale agreement to place orders."))}</span><button type="button" class="tp-btn is-primary" data-tab-go="agreement">${esc(tr("Read and Sign"))}</button></div>` : ""}
      <div class="tp-bar">
        <label class="tp-find"><svg class="tp-i" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input type="search" data-tp-find placeholder="Search" aria-label="Search products"></label>
        ${data.teas?.length ? `<div class="tp-chips" role="group" aria-label="Products">${[["all", "All"], ["coffee", "Coffee"], ["tea", "Tea"]].map(([v, label]) => `<button type="button" data-shelf="${v}" aria-pressed="${shelf === v}">${label}</button>`).join("")}</div>` : ""}
      </div>
      <div class="tp-terms-row">
        <ul class="tp-terms">
          <li>${a.offRetail ?? a.discount}% off retail</li>
          <li>${esc(terms)}</li>
          <li>${R.local ? "No minimum" : `Delivered: min ${R.minimums.bulk} bulk bags or ${R.minimums.retail} retail items`}</li>
          ${(a.tiers || []).map((t) => `<li>${t.bags}+ 5 lb bags: ${t.off}% off</li>`).join("")}
        </ul>
        ${data.usual?.lines?.length ? `<button type="button" class="tp-btn tp-usual-add" data-usual-add title="${esc(data.usual.lines.map(itemName).join(", "))}">${TP_ICON.plus}<span>Fill Your Usual</span></button>` : ""}
      </div>
      <div class="trade-layout">
        <section class="tp-list" aria-label="Price list">
          <table class="tp-table" data-shelf-of="coffee" ${shelf === "tea" ? "hidden" : ""}>
            <thead><tr><th>Coffee</th><th class="num">5 lb, to brew</th><th class="num">250g, to resell</th></tr></thead>
            <tbody>${data.prices
              .map(
                (p) => `<tr class="trade-item${picked(p.id) ? " is-picked" : ""}" data-item="${esc(p.id)}" data-find="${findText(p.name, p.notes)}">
                  ${productCell(p, p.notes)}
                  ${qtyCell(`${p.id}:5lb`, "5 lb, to brew", p.byQuote ? null : p.price5lb, p.short)}
                  ${qtyCell(`${p.id}:250g`, "250g, to resell", p.byQuote ? "" : p.price250, p.short)}
                </tr>`
              )
              .join("")}</tbody>
          </table>
          ${
            data.teas?.length
              ? `<table class="tp-table" data-shelf-of="tea" ${shelf === "coffee" ? "hidden" : ""}>
            <thead><tr><th>Tea</th><th class="num">1 kg loose, to brew</th><th class="num">Pack, to resell</th></tr></thead>
            <tbody>${data.teas
              .map(
                (t) => `<tr class="trade-item${picked(t.id) ? " is-picked" : ""}" data-item="${esc(t.id)}" data-find="${findText(t.name, t.blend, t.notes)}">
                  ${productCell(t, [t.blend, t.notes].filter(Boolean).join(" · "))}
                  ${t.price1kg ? qtyCell(`${t.id}:1kg`, "1 kg loose, to brew", t.price1kg, t.short) : `<td></td>`}
                  ${qtyCell(`${t.id}:tin`, "Pack, to resell", t.price, t.short)}
                </tr>`
              )
              .join("")}</tbody>
          </table>`
              : ""
          }
          <p class="tp-none" data-tp-none hidden>Nothing matches that.</p>
        </section>
        <aside class="summary trade-summary" aria-label="Your order" data-trade-summary></aside>
      </div>
      <div class="trade-order-bar" data-order-bar hidden><p><span data-bar-count></span><strong data-bar-total></strong></p><button type="button" class="button" data-review-order>Review Order</button></div>`;
    // Search and the Coffee / Tea chips hide rows in place, so quantities typed stay put.
    const filterShelf = () => {
      const q = (root.querySelector("[data-tp-find]")?.value || "").trim().toLowerCase();
      let shown = 0;
      $$("[data-shelf-of]", root).forEach((table) => {
        const on = shelf === "all" || shelf === table.dataset.shelfOf;
        let rows = 0;
        $$("[data-find]", table).forEach((tr) => {
          const hit = !q || tr.dataset.find.includes(q);
          tr.hidden = !hit;
          if (hit) rows++;
        });
        table.hidden = !on || !rows;
        if (on) shown += rows;
      });
      const none = $("[data-tp-none]", root);
      if (none) none.hidden = shown > 0;
    };

    // Credit on the account (a damaged or short delivery made good): it comes off the goods.
    const credit = () => Math.round((data.credits || []).reduce((n, c) => n + c.left, 0) * 100) / 100;
    // A buyer's order over the account's limit goes to an owner to approve.
    const forApproval = (total) => data.role === "buyer" && total > (data.approvalOver || 0);
    // Deliver or Pick Up as cards to pick from: where, and what it costs.
    // `edit`: a saved address (its location id, or "main") gets Edit, which opens it to change or remove.
    const wayCard = (value, on, title, where, price, loc = "", how = "", edit = "") =>
      `<label class="tp-way${on ? " is-on" : ""}"><input type="radio" name="fulfilment" value="${value}"${loc ? ` data-location="${esc(loc)}"` : ""} ${on ? "checked" : ""}><span class="tp-way-text"><strong>${title}</strong>${where.map((l) => `<small>${esc(l)}</small>`).join("")}${how ? `<em class="tp-way-how">${how}</em>` : ""}</span><span class="tp-way-side"><span class="tp-way-price${price === "Free" ? " is-free" : ""}">${esc(price)}</span>${edit ? `<button type="button" class="tp-way-edit" data-loc-edit="${esc(edit)}">Edit</button>` : ""}</span></label>`;
    // How a place is reached: by courier when it's local, else by USPS.
    // When it's ready: the next day Roastery House opens after today (it's roasted and packed for
    // them), then its days and hours for a pickup, in the shop's time zone.
    const SHOP_TZ = SITE.timezone || "America/Los_Angeles";
    // Where they can collect: Roastery House, and the café bars once they're live (on the map).
    const PICK_PLACES = LOCATIONS.filter((l) => l.cafe === false || (SITE.cafesLive !== false && Array.isArray(l.coords)));
    let pickPlace = (PICK_PLACES.find((l) => l.cafe === false) || PICK_PLACES[0])?.id || "";
    let pickView = "list";
    let myCoords = null; // the café's own address, placed (for "nearest" when there's a choice)
    const placeNow = () => PICK_PLACES.find((l) => l.id === pickPlace) || PICK_PLACES[0] || LOCATIONS[0];
    const placeMiles = (l) => (myCoords && Array.isArray(l.coords) ? distanceKm(myCoords, l.coords) * 0.621371 : null);
    const placesSorted = () => (myCoords ? [...PICK_PLACES].sort((x, y) => (placeMiles(x) ?? 1e9) - (placeMiles(y) ?? 1e9)) : PICK_PLACES);
    const dayKey = (d) => d.toISOString().slice(0, 10);
    const shopToday = () => new Date(`${new Date().toLocaleDateString("en-CA", { timeZone: SHOP_TZ })}T12:00:00Z`);
    const addDays = (d, n) => new Date(d.getTime() + n * 864e5);
    const openOn = (d) => placeNow()?.hours?.[d.getUTCDay()] || null;
    const readyDay = () => {
      for (let i = 1; i <= 8; i++) if (openOn(addDays(shopToday(), i))) return addDays(shopToday(), i);
      return addDays(shopToday(), 1);
    };
    const lastPickDay = () => addDays(readyDay(), 30);
    const dayLabel = (d) => d.toLocaleDateString(LANG === "es" ? "es-US" : LANG === "ko" ? "ko-KR" : "en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
    const clock12 = (t) => {
      const [h, m] = t.split(":").map(Number);
      return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${h >= 12 ? "PM" : "AM"}`;
    };
    // Hourly, from opening to an hour before closing.
    const slotsOn = (d) => {
      const h = openOn(d);
      if (!h) return [];
      const out = [];
      for (let m = Number(h[0].slice(0, 2)) * 60 + Number(h[0].slice(3)); m <= Number(h[1].slice(0, 2)) * 60 + Number(h[1].slice(3)) - 60; m += 60) out.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
      return out;
    };
    let pickDay = "";
    let pickTime = "";
    let pickMonth = "";
    const pickNow = () => {
      if (!pickDay || pickDay < dayKey(readyDay()) || pickDay > dayKey(lastPickDay()) || !openOn(new Date(`${pickDay}T12:00:00Z`))) pickDay = dayKey(readyDay());
      const slots = slotsOn(new Date(`${pickDay}T12:00:00Z`));
      if (!slots.includes(pickTime)) pickTime = slots[0] || "";
      if (!pickMonth) pickMonth = pickDay.slice(0, 7);
      return { day: pickDay, time: pickTime };
    };
    // Choose a pickup date (the month, its days, closed ones and the past greyed), then a time.
    // The pins on our maps (as the Contact page's): a black teardrop with the A for one of our
    // places; with a dot for theirs.
    const PIN_A = `<svg viewBox="0 0 48 60" aria-hidden="true"><path class="pin-body" d="M24 58C24 58 4 36.5 4 22a20 20 0 0 1 40 0c0 14.5-20 36-20 36Z"/><ellipse class="pin-face" cx="24" cy="22" rx="10.2" ry="14.6"/><path class="pin-body" fill-rule="evenodd" d="M22.4 12.6h3.2L30 25.6h-2.9l-1-3h-4.3l-1 3H18zm.3 7.6h2.6l-1.3-4.2z"/><path class="pin-body" d="M22.6 27h2.8v3.7h-2.8z"/></svg>`;
    const PIN_DOT = `<svg viewBox="0 0 48 60" aria-hidden="true"><path class="pin-body" d="M24 58C24 58 4 36.5 4 22a20 20 0 0 1 40 0c0 14.5-20 36-20 36Z"/><circle class="pin-face" cx="24" cy="22" r="8"/></svg>`;
    let leaflet = null;
    const loadLeaflet = () =>
      (leaflet ||= new Promise((ok, fail) => {
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "/js/vendor/leaflet-1.9.4.css";
        document.head.append(css);
        const js = document.createElement("script");
        js.src = "/js/vendor/leaflet-1.9.4.js";
        js.onload = () => ok(window.L);
        js.onerror = () => {
          leaflet = null;
          fail(new Error("map"));
        };
        document.head.append(js);
      }));
    // More than one pickup point: placed by the café's own address (looked up once), the nearest
    // picked first unless they've chosen.
    let cafeLooked = false;
    let pickChosen = false;
    function placesFromCafe() {
      const ad = a.address;
      if (cafeLooked || !ad?.street) return;
      cafeLooked = true;
      api("/api/trade/locate", { method: "POST", body: { q: `${ad.street}, ${ad.city}, ${ad.state} ${ad.postcode}` } })
        .then(({ coords }) => {
          myCoords = coords;
          if (!pickChosen) pickPlace = placesSorted()[0]?.id || pickPlace;
          refreshSummary();
        })
        .catch(() => {});
    }
    async function drawPickMap() {
      const box = $("[data-pick-map]");
      if (!box || box.dataset.ready) return;
      box.dataset.ready = "1";
      const L = await loadLeaflet().catch(() => null);
      if (!L || !box.isConnected) return;
      const map = L.map(box, { zoomControl: false, attributionControl: false, scrollWheelZoom: false });
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
      const pts = [];
      for (const l of PICK_PLACES.filter((x) => Array.isArray(x.coords))) {
        pts.push(l.coords);
        L.marker(l.coords, { icon: L.divIcon({ className: `tp-map-pin${l.id === pickPlace ? " is-on" : ""}`, html: PIN_A, iconSize: [36, 45], iconAnchor: [18, 44] }), alt: l.name, keyboard: true })
          .addTo(map)
          .on("click", () => {
            pickPlace = l.id;
            pickChosen = true;
            refreshSummary();
          });
      }
      if (myCoords) {
        pts.push(myCoords);
        L.circleMarker(myCoords, { radius: 7, color: "#fff", weight: 2, fillColor: "#111", fillOpacity: 1, className: "tp-map-me" }).addTo(map);
      }
      if (pts.length > 1) map.fitBounds(pts, { padding: [28, 28], maxZoom: 15 });
      else if (pts.length) map.setView(pts[0], 15);
    }
    const pickupPicker = () => {
      pickNow();
      const [y, m] = pickMonth.split("-").map(Number);
      const first = new Date(Date.UTC(y, m - 1, 1, 12));
      const days = new Date(Date.UTC(y, m, 0, 12)).getUTCDate();
      const lo = dayKey(readyDay());
      const hi = dayKey(lastPickDay());
      const prev = pickMonth > lo.slice(0, 7);
      const next = pickMonth < hi.slice(0, 7);
      const cells = [...Array(first.getUTCDay()).fill(`<span></span>`)];
      for (let i = 1; i <= days; i++) {
        const d = new Date(Date.UTC(y, m - 1, i, 12));
        const k = dayKey(d);
        const ok = k >= lo && k <= hi && openOn(d);
        cells.push(`<button type="button" data-pick-day="${k}" ${ok ? "" : "disabled"} aria-pressed="${k === pickDay}" aria-label="${esc(dayLabel(d))}">${i}</button>`);
      }
      const week = [0, 1, 2, 3, 4, 5, 6].map((i) => new Date(Date.UTC(2023, 0, 1 + i, 12)).toLocaleDateString(LANG === "es" ? "es-US" : LANG === "ko" ? "ko-KR" : "en-US", { weekday: "narrow", timeZone: "UTC" }));
      const today = shopToday();
      const hoursToday = (l) => {
        const h = l.hours?.[today.getUTCDay()];
        return h ? `Open today ${clock12(h[0])}–${clock12(h[1])}` : "Closed today";
      };
      const place = (l) => {
        const mi = placeMiles(l);
        return `<label class="tp-way${l.id === pickPlace ? " is-on" : ""}"><input type="radio" name="pickPlace" value="${esc(l.id)}" ${l.id === pickPlace ? "checked" : ""}><span class="tp-way-text"><strong>${esc(l.name)}${mi != null && mi >= 0.1 ? ` <span class="tp-way-mi">(${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi)</span>` : ""}</strong>${l.address.map((x) => `<small>${esc(x)}</small>`).join("")}<em class="tp-way-how">${howLine(esc(hoursToday(l)))}</em></span><span class="tp-way-price is-free">Free</span></label>`;
      };
      // One pickup point (Roastery House, until the café bars are live): the Pick Up card already
      // names it, so there's nothing to choose. More than one: the list (or map), nearest the café.
      if (PICK_PLACES.length > 1) placesFromCafe();
      const pointHtml =
        PICK_PLACES.length > 1
          ? `<div class="tp-pick-point">
          <p class="tp-cart-label">Pickup Point</p>
          <div class="tp-pick-tabs" role="tablist"><button type="button" role="tab" data-pick-view="list" aria-selected="${pickView === "list"}">${TP_ICON.list}List</button><button type="button" role="tab" data-pick-view="map" aria-selected="${pickView === "map"}">${TP_ICON.map}Map</button></div>
          ${pickView === "map" ? `<div class="tp-pick-map" data-pick-map></div><div class="tp-ways">${place(placeNow())}</div>` : `<div class="tp-ways">${placesSorted().map(place).join("")}</div>`}
        </div>`
          : "";
      if (pickView === "map") setTimeout(drawPickMap, 0);
      return `${pointHtml}<div class="tp-pick">
          <p class="tp-cart-label">Pickup Date</p>
          <div class="tp-pick-month"><button type="button" class="tp-icon-btn" data-pick-month="-1" aria-label="Previous month" ${prev ? "" : "disabled"}>${TP_ICON.back}</button><strong>${first.toLocaleDateString(LANG === "es" ? "es-US" : LANG === "ko" ? "ko-KR" : "en-US", { month: "long", year: "numeric", timeZone: "UTC" })}</strong><button type="button" class="tp-icon-btn tp-pick-next" data-pick-month="1" aria-label="Next month" ${next ? "" : "disabled"}>${TP_ICON.back}</button></div>
          <div class="tp-pick-grid">${week.map((w) => `<span class="tp-pick-dow">${w}</span>`).join("")}${cells.join("")}</div>
          <label class="tp-loc-field tp-pick-time"><span>Time</span><select name="pickTime">${slotsOn(new Date(`${pickDay}T12:00:00Z`)).map((t) => `<option value="${t}" ${t === pickTime ? "selected" : ""}>${clock12(t)}</option>`).join("")}</select></label>
        </div>`;
    };
    // How a place is reached, and when it gets there: by courier when it's local (the day after
    // the order, as it's roasted for them), else by USPS.
    // Who brings it (the courier's logo, or USPS) and when: no icons, the mark then the day and time.
    const howLine = (who, when = "") => `<span class="tp-way-who">${who}</span>${when ? `<span class="tp-way-when">${when}</span>` : ""}`;
    // A local courier collects at its morning pickup on the day it's ready, then drives over:
    // "by" the next half hour after a rough drive time for the distance.
    const arrivesBy = (miles) => {
      const [h, m] = (SITE.localDelivery?.morningPickup || "07:00").split(":").map(Number);
      const at = Math.ceil((h * 60 + m + 10 + Math.round((miles ?? 5) * 3)) / 30) * 30;
      return clock12(`${String(Math.floor(at / 60)).padStart(2, "0")}:${String(at % 60).padStart(2, "0")}`);
    };
    const courierMark = (name) => (/uber/i.test(name || "") ? `<span class="courier-uber" role="img" aria-label="${esc(name)}"></span>` : esc(name || "Courier"));
    const shipHow = (p) => (p?.ship === "local" ? howLine(courierMark(p.courier), `${esc(dayLabel(readyDay()))} · by ${arrivesBy(p.miles)}`) : p?.ship === "usps" ? howLine(`<strong class="tp-usps">USPS</strong>`, "2 to 5 business days") : "");
    // Where the order goes, as one row: "Deliver to Downtown", who brings it and when, and what it
    // costs; or "Pick Up · Roastery House" and its day and time. Change opens the choices.
    const fixWhere = () => {
      if (shipLoc && !shipPlace()) shipLoc = "";
      if (!shipLoc && !a.address?.street && a.locations?.length) shipLoc = a.locations[0].id;
      if (way === "Delivery" && !a.address?.street && !a.locations?.length) way = "Pickup";
    };
    const mainName = () => a.address?.name || a.business;
    // Their logo where the first letter of the business would be (set in Account › Billing).
    const tpMark = () => (a.logo ? `<span class="tp-mark has-logo" aria-hidden="true"><img src="/api/trade/logo?v=${esc(a.logo)}" alt=""></span>` : `<span class="tp-mark" aria-hidden="true">${esc((a.business || "?").trim().slice(0, 1).toUpperCase())}</span>`);
    const whereRow = (priced = true) => {
      fixWhere();
      const fee = a.deliveryFee && priced ? money(a.deliveryFee) : "Free";
      if (way === "Pickup") {
        pickNow();
        return `<div class="tp-where"><span class="tp-where-text"><strong>Pick Up · ${esc(placeNow().name)}</strong><span class="tp-where-how">${howLine(`${esc(dayLabel(new Date(`${pickDay}T12:00:00Z`)))}, ${clock12(pickTime)}`)}<span class="tp-where-fee is-free">Free</span></span></span><button type="button" class="tp-btn tp-where-change" data-where-open>Change</button></div>`;
      }
      const l = shipPlace();
      return `<div class="tp-where"><span class="tp-where-text"><strong>Deliver to ${esc(l ? l.name : mainName())}</strong><span class="tp-where-how">${shipHow(l || R)}<span class="tp-where-fee${fee === "Free" ? " is-free" : ""}">${esc(fee)}</span></span></span><button type="button" class="tp-btn tp-where-change" data-where-open>Change</button></div>`;
    };
    // The choices, in a sheet: the main address, each location, Pick Up (its day and time, and
    // which pickup point when there's more than one), and Add Location.
    const whereBody = () => {
      fixWhere();
      const delivering = way === "Delivery";
      const mi = (m) => (m != null && m >= 0.1 ? ` <span class="tp-way-mi">(${m < 10 ? m.toFixed(1) : Math.round(m)} mi)</span>` : "");
      const fee = a.deliveryFee ? money(a.deliveryFee) : "Free";
      return `<fieldset class="tp-ways" aria-label="Delivery">
          ${a.address?.street ? wayCard("Delivery", delivering && !shipPlace(), `Deliver to ${esc(mainName())}${mi(R.miles)}`, [a.address.street, `${a.address.city}, ${a.address.state} ${a.address.postcode}`], fee, "", shipHow(R), "main") : ""}
          ${(a.locations || []).map((l) => wayCard("Delivery", delivering && shipLoc === l.id, `Deliver to ${esc(l.name)}${mi(l.miles)}`, [l.street, `${l.city}, ${l.state} ${l.postcode}`], fee, l.id, shipHow(l), l.id)).join("")}
          ${wayCard("Pickup", !delivering, "Pick Up", [placeNow().name, ...placeNow().address], "Free", "", howLine("Ready", `${esc(dayLabel(readyDay()))} from ${clock12(placeNow().hours?.[readyDay().getUTCDay()]?.[0] || "09:00")}`))}
        </fieldset>
        <button type="button" class="tp-way-add" data-loc-add>${TP_ICON.plus}<span>Add Location</span></button>
        ${delivering ? "" : pickupPicker()}`;
    };
    let whereClosed = null; // what to redraw when the sheet closes (the reorder sheet under it)
    const redrawWhere = () => {
      const b = $("[data-where-body]");
      if (b) b.innerHTML = whereBody();
    };
    function whereSheet(then = null) {
      $("[data-where-dialog]")?.remove();
      whereClosed = then;
      document.body.insertAdjacentHTML(
        "beforeend",
        `<dialog class="cal-dialog tp-loc tp-where-sheet" data-where-dialog aria-labelledby="tp-where-title"><div class="cal-dialog-inner">
          <h2 id="tp-where-title">Delivery</h2>
          <div class="tp-where-body" data-where-body>${whereBody()}</div>
          <div class="tp-help-fb-actions"><button type="button" class="button" data-where-done>Done</button></div>
        </div></dialog>`
      );
      const dlg = $("[data-where-dialog]");
      dlg.addEventListener("close", () => {
        dlg.remove();
        saveOrder();
        if (tab === "order") refreshSummary();
        whereClosed?.();
        whereClosed = null;
      });
      dlg.addEventListener("change", (e) => {
        const t = e.target;
        if (t.name === "fulfilment") {
          way = t.value;
          shipLoc = t.dataset.location || "";
          redrawWhere();
        }
        if (t.name === "pickTime") pickTime = t.value;
        if (t.name === "pickPlace") {
          pickPlace = t.value;
          pickChosen = true;
          redrawWhere();
        }
      });
      dlg.addEventListener("click", (e) => {
        const t = e.target;
        if (t === dlg || t.closest("[data-where-done]")) return dlg.close();
        if (t.closest("[data-loc-add]")) return addLocation();
        const ed = t.closest("[data-loc-edit]");
        if (ed) {
          e.preventDefault(); // Edit, not a pick of that address
          return addLocation(ed.dataset.locEdit);
        }
        const pv = t.closest("[data-pick-view]");
        if (pv) {
          pickView = pv.dataset.pickView;
          return redrawWhere();
        }
        const pd = t.closest("[data-pick-day]");
        if (pd && !pd.disabled) {
          pickDay = pd.dataset.pickDay;
          return redrawWhere();
        }
        const pm = t.closest("[data-pick-month]");
        if (pm && !pm.disabled) {
          const [y, m] = pickMonth.split("-").map(Number);
          pickMonth = dayKey(new Date(Date.UTC(y, m - 1 + Number(pm.dataset.pickMonth), 1, 12))).slice(0, 7);
          return redrawWhere();
        }
      });
      dlg.showModal();
      $("[name=fulfilment]:checked", dlg)?.focus();
    }

    // What the by-quote lines are called in a total: a Limited Drop, or a coffee without a price.
    const quoteName = (qs) => (qs.some((l) => l.limited) ? "Limited Drop" : "Price on Request");
    const countOf = (ls) => ls.reduce((n, l) => n + l.qty, 0);
    const itemsWord = (n) => `${n} ${n === 1 ? "item" : "items"}`;
    // The order's sums, the priced lines only (by-quote lines are asked for as a quote).
    const sums = (ls) => {
      const priced = ls.filter((l) => !l.byQuote);
      const quoted = ls.filter((l) => l.byQuote);
      const sub = priced.reduce((n, l) => n + l.price * l.qty, 0);
      const fee = way === "Delivery" && priced.length ? a.deliveryFee || 0 : 0;
      const off = Math.min(credit(), sub);
      const short = shortfall(priced, way === "Delivery");
      return { priced, quoted, sub, fee, off, total: sub + fee - off, short };
    };
    // One primary: Place Order (or Send for Approval) for priced lines, Ask for a Quote for
    // by-quote lines, both at once for both.
    const goLabel = (s) => (!s.priced.length && s.quoted.length ? "Ask for a Quote" : !s.priced.length ? "Place Order" : `${forApproval(s.total) ? "Send for Approval" : "Place Order"}${s.quoted.length ? " & Ask for Quote" : ""}`);
    const totalsHtml = (s) => `${
      s.priced.length
        ? `<div class="row"><span>Subtotal</span><span>${money(s.sub)}</span></div>
        ${s.fee ? `<div class="row"><span>Delivery</span><span>${money(s.fee)}</span></div>` : ""}
        ${s.off ? `<div class="row"><span>Account credit</span><span>−${money(s.off)}</span></div>` : ""}`
        : ""
    }
      ${s.quoted.length ? `<div class="row tp-quote-row"><span>${quoteName(s.quoted)}: ${itemsWord(countOf(s.quoted))}</span><span>By Quote</span></div>` : ""}
      ${s.priced.length ? `<div class="row total"><span>Total</span><span>${money(s.total)}</span></div>` : ""}
      ${s.short ? `<p class="trade-hint" role="status">${esc(s.short)}</p>` : ""}`;
    const summary = () => {
      const ls = lines();
      const s = sums(ls);
      return `
        <div class="tp-cart-head"><h2>Your Order</h2>${ls.length ? `<span>${itemsWord(countOf(ls))}</span>` : ""}</div>
        ${ls.length ? `<ul class="summary-lines">${ls.map((l) => `<li><span>${l.qty} × ${esc(l.name)}<em>${esc([l.label, l.grind, l.tier && `${l.tier.off}% off`].filter(Boolean).join(" · "))}</em></span><span>${l.byQuote ? "By Quote" : money(l.price * l.qty)}</span></li>`).join("")}</ul>` : `<p class="tp-cart-empty">Add quantities from the price list.</p>`}
        ${whereRow(s.priced.length > 0 || !ls.length)}
        <div class="form">
          <label>Notes<textarea name="notes" maxlength="1000" rows="1" placeholder="Delivery instructions, anything else">${esc(notesNow)}</textarea></label>
        </div>
        ${totalsHtml(s)}
        <div class="tp-cart-go">
          <p class="sub-error" data-trade-error role="alert"></p>
          <button class="button" type="button" data-place ${ls.length && !s.short ? "" : "disabled"}>${goLabel(s)}</button>
        </div>
        ${ls.length ? `<div class="tp-cart-more"><button class="tp-btn" type="button" data-usual-save>${data.usual ? "Save as Your Usual" : "Save as Usual"}</button><button class="tp-btn" type="button" data-ask-team>Ask Us a Question</button></div>` : ""}
        ${s.priced.length ? `<p class="checkout-note">${data.invoicing ? `We'll email the invoice to ${esc(a.email)}. ${terms}.` : `We'll send the invoice to ${esc(a.email)}. ${terms}.`}</p>` : ""}`;
    };

    // Placing: the priced lines as an order (a buyer's over the limit goes for approval), and the
    // by-quote lines as a quote request, both going to the same place with the same notes.
    async function submitOrder(ls, notes = "") {
      const { priced, quoted } = sums(ls);
      fixWhere();
      const where = way === "Pickup" ? { fulfilment: "Pickup", pickup: { ...pickNow(), place: placeNow().id } } : { fulfilment: "Delivery", location: shipLoc };
      const body = (xs) => ({ lines: xs.map(({ product, size, qty: n, grind: g }) => ({ product, size, qty: n, ...(g ? { grind: g } : {}) })), ...where, notes });
      const out: any = {};
      if (priced.length) out.placed = await api("/api/trade/orders", { method: "POST", body: body(priced) });
      if (quoted.length) {
        try {
          out.quote = (await api("/api/trade/quotes", { method: "POST", body: body(quoted) })).quote;
        } catch (error) {
          if (!priced.length) throw error;
          out.quoteError = error.message;
        }
      }
      return out;
    }
    // What happened, said once, and where it went: the order just placed, or Orders.
    function afterSubmit(out) {
      const r = out.placed;
      if (r?.request) data.requests = r.requests;
      if (r?.order) data.orders.unshift(r.order);
      if (out.quote) data.quotes = [out.quote, ...(data.quotes || [])];
      const placed = r?.order ? `Order ${r.order.number} placed.` : r?.request ? "Sent to the account's owner to approve." : "";
      const msg = out.quote
        ? placed
          ? `${placed} Quote ${out.quote.number} sent; we'll email the prices.`
          : `Quote ${out.quote.number} sent. We'll email the prices; it's under Orders.`
        : out.quoteError
          ? `${placed} The quote didn't go through: ${out.quoteError}`
          : r?.order && r.invoiced
            ? `Order ${r.order.number} placed. We've emailed the invoice to ${a.email}.`
            : r?.request
              ? "Sent to the account's owner to approve. We'll email you when they do."
              : placed;
      if (r?.order) {
        tab = "orderview";
        orderNo = r.order.number;
      } else {
        tab = "orders";
        orderView = out.quote && !r ? "quotes" : orderView;
      }
      history.replaceState(null, "", tradeUrl(tab, tab === "orderview" ? orderNo : ""));
      render();
      toast(esc(msg));
      window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
    }

    // Order Again and Fill Your Usual: the items (with steppers), where it goes, the total, and
    // Place Order; or Edit in Products, which adds them to the order being built.
    function reorderSheet(title, src, { pickup = false, loc = "" } = {}) {
      const m = addFrom(src, {});
      const keys = Object.keys(m);
      if (!keys.length) return toast(esc("Those coffees aren't on the list any more."));
      if (pickup) way = "Pickup";
      else if (a.address?.street || a.locations?.length) {
        way = "Delivery";
        shipLoc = loc && (a.locations || []).some((l) => l.id === loc) ? loc : "";
      }
      $("[data-re-dialog]")?.remove();
      document.body.insertAdjacentHTML(
        "beforeend",
        `<dialog class="cal-dialog tp-loc tp-re-sheet" data-re-dialog aria-labelledby="tp-re-title"><div class="cal-dialog-inner">
          <h2 id="tp-re-title">${esc(title)}</h2>
          <div class="tp-re-body" data-re-body></div>
          <p class="sub-error" data-re-error role="alert"></p>
          <div class="tp-help-fb-actions"><button type="button" class="tp-btn" data-re-edit>Edit in Products</button><button type="button" class="button" data-re-place></button></div>
        </div></dialog>`
      );
      const dlg = $("[data-re-dialog]");
      const draw = () => {
        const ls = linesOf(m);
        const s = sums(ls);
        $("[data-re-body]", dlg).innerHTML = `<ul class="tp-re-lines">${keys
          .map((k) => {
            const l = linesOf({ [k]: Math.max(1, m[k] || 0) })[0];
            if (!l) return "";
            const n = m[k] || 0;
            return `<li${n ? "" : ' class="is-off"'}><span><strong>${esc(l.name)}</strong><small>${esc(l.label)}${l.byQuote ? " · By Quote" : n ? ` · ${money(linesOf(m).find((x) => `${x.product}:${x.size}` === k)?.price ?? l.price)}` : ""}</small></span><div class="trade-stepper${n ? " is-on" : ""}"><button type="button" data-re-step="-1" data-re-key="${esc(k)}" aria-label="One less ${esc(l.name)}">−</button><output>${n}</output><button type="button" data-re-step="1" data-re-key="${esc(k)}" aria-label="One more ${esc(l.name)}">+</button></div></li>`;
          })
          .join("")}</ul>
          ${whereRow(s.priced.length > 0)}
          <div class="tp-re-sums">${totalsHtml(s)}</div>`;
        const go = $("[data-re-place]", dlg);
        go.textContent = goLabel(s);
        go.disabled = !ls.length || Boolean(s.short);
      };
      draw();
      dlg.addEventListener("close", () => dlg.remove());
      dlg.addEventListener("click", async (e) => {
        const t = e.target;
        if (t === dlg) return dlg.close();
        if (t.closest("[data-where-open]")) return whereSheet(draw);
        const step = t.closest("[data-re-step]");
        if (step) {
          const k = step.dataset.reKey;
          m[k] = Math.max(0, Math.min(500, (m[k] || 0) + Number(step.dataset.reStep)));
          return draw();
        }
        if (t.closest("[data-re-edit]")) {
          const before = { ...qty };
          Object.entries<any>(m).forEach(([k, n]) => n > 0 &&(qty[k] = Math.min(500, (qty[k] || 0) + Number(n))));
          dlg.close();
          goTo("order");
          saveOrder();
          return toastUndo("Added to your order.", () => restoreQty(before));
        }
        const go = t.closest("[data-re-place]");
        if (go) {
          const err = $("[data-re-error]", dlg);
          err.textContent = "";
          go.disabled = true;
          const label = go.textContent;
          go.textContent = "Placing…";
          try {
            const out = await submitOrder(linesOf(m));
            dlg.close();
            afterSubmit(out);
          } catch (error) {
            go.disabled = false;
            go.textContent = label;
            err.textContent = error.message;
          }
        }
      });
      dlg.showModal();
      $("[data-re-place]", dlg).focus();
    }
    const restoreQty = (before) => {
      Object.keys(qty).forEach((k) => delete qty[k]);
      Object.assign(qty, before);
      saveOrder();
      if (tab === "order") render();
    };
    // A toast with Undo (kept up long enough to tap it).
    const toastUndo = (msg, undo) => {
      toast(`<span>${esc(msg)}</span><button type="button" data-toast-undo>Undo</button>`);
      const el = $("[data-toast]");
      clearTimeout(el._t);
      el._t = setTimeout(() => el.classList.remove("is-visible"), 6000);
      el.onclick = (e) => {
        if (!e.target.closest("[data-toast-undo]")) return;
        el.onclick = null;
        el.classList.remove("is-visible");
        undo();
      };
    };
    const usualSheet = () => reorderSheet("Your Usual", data.usual.lines, { pickup: data.usual.fulfilment === "Pickup", loc: data.usual.location || "" });
    const againSheet = (o) => reorderSheet(`Order ${o.number} Again`, o.lines, { pickup: o.fulfilment === "Pickup", loc: o.where?.location || "" });

    // Orders by where they stand in Square: active (to pay), paid (and refunded), cancelled.
    const ORDER_VIEWS = [
      ["active", "Active", (o) => !["paid", "refunded", "cancelled"].includes(o.state), "blue"],
      ["paid", "Paid", (o) => o.state === "paid" || o.state === "refunded", "green"],
      ["cancelled", "Cancelled", (o) => o.state === "cancelled", "gray"],
    ];
    let orderView = "active";
    // A status's color, as the back office's rings: blue on its way, green done, gray cancelled.
    const toneOf = (o) => (o.state === "cancelled" ? "gray" : o.status === "completed" ? "green" : "blue");
    // Payment's color: yellow to pay, red overdue or declined, blue processing, green paid.
    const PAY_TONE = { due: "yellow", overdue: "red", declined: "red", processing: "blue", paid: "green", refunded: "gray", cancelled: "gray" };
    const STATE = {
      due: (o) => (o.dueDate ? `Due ${shortDate(o.dueDate)}` : "Invoice to follow"),
      overdue: (o) => `Overdue: was due ${shortDate(o.dueDate)}`,
      declined: (o) => `Payment declined${o.declined?.at ? ` ${shortDate(o.declined.at)}` : ""}`,
      processing: () => "Bank payment processing",
      paid: () => "Paid",
      refunded: () => "Refunded",
      cancelled: () => "Cancelled",
    };
    // Orders waiting for an owner: an owner sees each with Approve and Decline; a buyer sees where
    // theirs stand.
    const owner = data.role !== "buyer";
    const waitingRequests = () => (owner ? (data.requests || []).filter((r) => r.status === "waiting") : []);
    // For the dot on Orders: buyers' orders and quotes waiting for an owner.
    const waitingForMe = () => (owner ? [...waitingRequests(), ...(data.quotes || []).filter((q) => q.state === "sent")] : []);
    // Approvals and quotes above the orders, as settings cards: each one a row with its ring, what
    // it is, where it stands, and (for an owner) its buttons.
    const askRing = (tone) => `<i class="tp-ring" style="--tone:var(--st-${tone})" aria-hidden="true"></i>`;
    const requestsHtml = () => {
      const list = owner ? waitingRequests() : data.requests || [];
      if (!list.length) return "";
      return `<section class="tp-set tp-asks" aria-labelledby="req-title">
          <h2 id="req-title">${owner ? "Waiting for You" : "Sent for Approval"}</h2>
          <div class="tp-set-card">${list
            .map((r) => {
              const tone = r.status === "waiting" ? "yellow" : r.status === "approved" ? "green" : "gray";
              const where = owner ? `From ${esc(r.by)}` : r.status === "waiting" ? "Waiting for an owner" : r.status === "approved" ? `Approved by ${esc(r.decidedBy)}${r.order ? `: ${esc(r.order)}` : ""}` : `Declined by ${esc(r.decidedBy)}`;
              return `<div class="tp-ask">
                <div class="tp-ask-main"><p><strong>${money(r.total)}</strong><span class="tp-status">${askRing(tone)}${where}</span></p><span>${esc(r.lines.map(itemName).join(", "))}</span><small>${esc(shortDate(r.at))}</small></div>
                ${owner ? `<div class="tp-ask-actions"><button type="button" class="tp-btn" data-req-decline="${esc(r.id)}">Decline</button><button type="button" class="tp-btn is-primary" data-req-approve="${esc(r.id)}">Approve</button></div>` : ""}
              </div>`;
            })
            .join("")}</div>
        </section>`;
    };
    const QSTATE = { requested: "We're pricing it", accepted: "Accepted", declined: "Declined", expired: "Expired", withdrawn: "Withdrawn" };
    const QTONE = { requested: "blue", sent: "yellow", accepted: "green", declined: "gray", expired: "gray", withdrawn: "gray" };
    // Quotes (the Quotes filter on Orders): each with where it stands, its lines, and what can be
    // done: Accept or Decline once priced (an owner), Withdraw while we're pricing it, Ask.
    const quotesHtml = () => {
      const list = data.quotes || [];
      if (!list.length) return `<p class="tp-none">No quotes yet.</p>`;
      return `<div class="tp-set-card tp-quotes">${list
        .map(
          (q) => `<div class="tp-ask" data-quote-row="${esc(q.id)}">
                <div class="tp-ask-main"><p><strong>${esc(q.number)}${q.total != null ? ` · ${money(q.total)}` : ""}</strong><span class="tp-status">${askRing(QTONE[q.state] || "gray")}${q.state === "sent" ? `Good until ${esc(shortDate(q.validUntil))}` : esc(QSTATE[q.state] || q.state)}${q.order ? `: ${esc(q.order)}` : ""}</span></p>
                  <span>${q.lines.map((l) => `${l.qty} × ${esc(l.title)} ${esc(l.variant)}${l.price != null ? ` at ${money(l.price)}` : ""}`).join("<br>")}</span>
                  <small>${esc(shortDate(q.at))}</small>
                  ${q.message ? `<small>${esc(q.message)}</small>` : ""}</div>
                <div class="tp-ask-actions">
                  <button type="button" class="tp-icon-btn" data-ask-quote="${esc(q.id)}" aria-label="Ask about ${esc(q.number)}" title="Ask Us a Question">${TP_ICON.chat}</button>
                  ${q.state === "requested" && (owner || q.by === user.email) ? `<button type="button" class="tp-btn" data-quote-withdraw="${esc(q.id)}">Withdraw</button>` : ""}
                  ${q.state === "sent" && owner ? `<button type="button" class="tp-btn" data-quote-decline="${esc(q.id)}">Decline</button><button type="button" class="tp-btn is-primary" data-quote-accept="${esc(q.id)}">Accept</button>` : ""}
                </div>
              </div>`
        )
        .join("")}</div>`;
    };
    // A row's few words: "3 × Sao Judas 5 lb +1", and where it went.
    const sizeShort = (l) => (l.size === "5lb" ? "5 lb" : l.size === "250g" ? "250g" : l.size === "1kg" ? "1 kg" : l.size === "tin" ? "pack" : String(l.variant || "").split(" · ")[0]);
    const shortName = (l) => [...data.prices, ...(data.teas || [])].find((x) => x.id === l.product)?.short || l.title;
    const itemsLine = (o) => (o.lines.length ? `${o.lines[0].qty} × ${shortName(o.lines[0])} ${sizeShort(o.lines[0])}${o.lines.length > 1 ? ` +${o.lines.length - 1}` : ""}` : "");
    const whereShort = (o) => (o.fulfilment === "Pickup" ? "Pickup" : o.where?.name || "");
    const ordersTab = () => {
      const quotes = data.quotes || [];
      if (!data.orders.length && !quotes.length) return `${requestsHtml()}<div class="empty-state"><p>No orders yet.</p><button type="button" class="button" data-tab-go="order">Place Your First Order</button></div>`;
      if (!data.orders.length && orderView !== "quotes") orderView = "quotes";
      const views = [...ORDER_VIEWS.map(([id, label, test, tone]) => [id, label, data.orders.filter(test).length, tone]), ["quotes", "Quotes", quotes.length, "yellow"]];
      const open = tab === "orderview" ? orderNo : "";
      const bar = `<div class="tp-bar">
          ${orderView === "quotes" ? "" : `<label class="tp-find">${TP_ICON.search}<input type="search" data-tp-order-find placeholder="Search" aria-label="Search orders"></label>`}
          <div class="filters trade-order-views" role="group" aria-label="Orders">${views.map(([id, label, n, tone]) => `<button type="button" data-order-view="${id}" aria-pressed="${id === orderView}"><i class="tp-ring" style="--tone:var(--st-${tone})" aria-hidden="true"></i>${label} <b>${n}</b></button>`).join("")}</div>
        </div>`;
      if (orderView === "quotes") return `${requestsHtml()}${bar}${quotesHtml()}`;
      const [, , inView] = ORDER_VIEWS.find(([id]) => id === orderView);
      const list = data.orders.filter(inView);
      return `${requestsHtml()}${bar}
        ${
          list.length
            ? `<table class="tp-table tp-orders">
                <thead><tr><th>Order</th><th>Placed</th><th>Items</th><th>Where</th><th>Status</th><th>Payment</th><th class="num">Total</th></tr></thead>
                <tbody>${list
                  .map((o) => {
                    const meta = [shortDate(o.placedAt), itemsLine(o), whereShort(o)].filter(Boolean).join(" · ");
                    return `<tr data-open-order="${esc(o.number)}" data-order-row="${findText(o.number, o.poRef, whereShort(o), ...o.lines.map((l) => l.title))}"${o.number === open ? ' class="is-open"' : ""}>
                    <td class="tp-o-no"><button type="button" class="tp-row-link" data-open-order="${esc(o.number)}">${esc(o.number)}</button>${o.poRef ? `<small>PO ${esc(o.poRef)}</small>` : ""}<small class="tp-o-meta">${esc(meta)}</small></td>
                    <td class="tp-o-date">${esc(shortDate(o.placedAt))}</td>
                    <td class="tp-o-items">${esc(itemsLine(o))}</td>
                    <td class="tp-o-where">${esc(whereShort(o))}</td>
                    <td class="tp-o-status"><span class="tp-status"><i class="tp-ring" style="--tone:var(--st-${toneOf(o)})" aria-hidden="true"></i>${esc(o.state === "cancelled" ? "Cancelled" : STATUS[o.status] || o.status)}</span></td>
                    <td class="tp-o-pay"><span class="tp-status"><i class="tp-ring" style="--tone:var(--st-${PAY_TONE[o.state] || "gray"})" aria-hidden="true"></i>${esc(STATE[o.state](o))}</span></td>
                    <td class="num tp-o-total"><b>${money(o.total)}</b></td>
                  </tr>`;
                  })
                  .join("")}</tbody>
              </table>
              <p class="tp-none" data-tp-none hidden>Nothing matches that.</p>`
            : `<p class="tp-none">No ${orderView} orders.</p>`
        }`;
    };

    // The tab: what's owed, each order picked to pay (all by default), paid through Square.
    const owed = () => data.orders.filter((o) => ["due", "overdue", "declined"].includes(o.state) && o.total > 0);
    const payPick = new Set(); // order numbers left out of the payment
    const payTotal = () => owed().filter((o) => !payPick.has(o.number)).reduce((n, o) => n + o.total, 0);
    let tradeCard = null;
    let tradeBank = null; // Square's ACH (bank) payment: one invoice at a time
    // Stripe's bank payments (when set up): our own form, any number of invoices, saved after.
    const SB = () => Boolean(data.bank?.stripe);
    let bankOpen = false;
    let bankNew = false; // another account, although one is saved
    const mandate = (amount) => `By paying by bank, you authorize ${esc(SITE.name)} to debit this account for ${money(amount)}, and for future invoices you choose to pay by bank, until you cancel by writing to ${esc(SITE.wholesaleEmail || SITE.email)} (30 days' notice).`;
    // The first time: their bank details (to Stripe, not us), then a code from their statement.
    const bankPanel = () => {
      const amount = payTotal();
      const saved = data.bank?.saved;
      // A saved account: one tap (they agreed to future payments when they added it).
      if (saved && !bankNew)
        return `<div class="tp-bank">
          <button class="button${data.square ? " button-quiet" : ""}" type="button" data-bank-pay ${amount > 0 ? "" : "disabled"}>Pay ${money(amount)} from •••• ${esc(saved.last4)}</button>
          <p class="tp-bank-acts"><button type="button" class="tp-link-btn" data-bank-new>Use Another Account</button><button type="button" class="tp-link-btn" data-bank-forget>Remove</button></p>
        </div>`;
      return `<div class="tp-bank" data-bank-form>
          <label class="tp-loc-field"><span>Name on the account</span><input name="bankName" value="${esc(a.business)}" autocomplete="name"></label>
          <label class="tp-loc-field"><span>Routing number</span><input name="bankRouting" inputmode="numeric" autocomplete="off" maxlength="9"></label>
          <label class="tp-loc-field"><span>Account number</span><input name="bankAccount" inputmode="numeric" autocomplete="off" maxlength="17"></label>
          <label class="tp-loc-field"><span>Account number again</span><input name="bankAccount2" inputmode="numeric" autocomplete="off" maxlength="17"></label>
          <div class="tp-seg tp-bank-type" role="radiogroup" aria-label="Account type"><label><input type="radio" name="bankType" value="checking" checked><span>Checking</span></label><label><input type="radio" name="bankType" value="savings"><span>Savings</span></label></div>
          <p class="tp-bank-mandate">${mandate(amount)}</p>
          <p class="sub-error" data-bank-error role="alert"></p>
          <button class="button" type="button" data-bank-submit ${amount > 0 ? "" : "disabled"}>Pay ${money(amount)} by Bank</button>
          ${saved ? `<button type="button" class="tp-link-btn" data-bank-saved>Use •••• ${esc(saved.last4)}</button>` : ""}
        </div>`;
    };
    // Paying by bank (Stripe) on its own: a saved account is one tap; otherwise Pay by Bank opens
    // the form. Kept in one box so a change of invoices redraws it.
    const bankBox = () => `<div class="tp-bank-box" data-bank-box>${data.bank?.saved || bankOpen || bankNew ? bankPanel() : `<div class="trade-pay-buttons"><button class="button" type="button" data-bank-open ${payTotal() > 0 && !data.bank?.verify ? "" : "disabled"}>Pay by Bank</button></div>`}</div>`;
    // Waiting on the code from their statement (the first time).
    const bankVerify = () => {
      const v = data.bank?.verify;
      if (!v) return "";
      return `<form class="tp-bank-verify" data-bank-verify>
          <p><strong>Confirm your bank account</strong></p>
          <p>${v.type === "amounts" ? `We sent two small deposits to •••• ${esc(v.last4)}. In 1–2 business days, enter the two amounts in cents to finish paying ${money(v.amount)}.` : `We sent a 1¢ deposit to •••• ${esc(v.last4)}. In 1–2 business days, find it on your bank statement and enter the 6-character code that starts with SM to finish paying ${money(v.amount)}.`}</p>
          ${v.type === "amounts" ? `<div class="tp-loc-pair"><label class="tp-loc-field"><span>First amount (¢)</span><input name="amt1" inputmode="numeric" maxlength="2"></label><label class="tp-loc-field"><span>Second amount (¢)</span><input name="amt2" inputmode="numeric" maxlength="2"></label></div>` : `<label class="tp-loc-field"><span>Code</span><input name="code" maxlength="6" autocapitalize="characters" autocomplete="one-time-code"></label>`}
          <p class="sub-error" data-bank-verify-error role="alert"></p>
          <div class="tp-help-fb-actions"><button type="button" class="tp-btn" data-bank-restart>Start Over</button><button type="submit" class="button">Confirm</button></div>
        </form>`;
    };
    let stripeJs = null;
    const loadStripe = () =>
      (stripeJs ||= new Promise((ok, fail) => {
        const s = document.createElement("script");
        s.src = "https://js.stripe.com/v3/";
        s.onload = () => ok((window as any).Stripe(data.bank.key));
        s.onerror = () => {
          stripeJs = null;
          fail(new Error("Bank payments didn't load. Refresh the page."));
        };
        document.head.append(s);
      }));
    const bankDone = (r, msg = "") => {
      data.bank = { ...data.bank, ...r.bank };
      if (r.orders) data.orders = r.orders;
      bankOpen = false;
      payOne = "";
      bankNew = false;
      payPick.clear();
      render();
      if (msg) toast(msg);
    };
    let payNew = !data.card; // a new card, although one is saved
    const picks = () => owed().filter((o) => !payPick.has(o.number));
    // The card (the saved one, or a new one), then Pay; and Pay by bank, for one invoice.
    const payBox = () => {
      const amount = payTotal();
      const one = picks().length === 1;
      return `${
        data.card
          ? `<fieldset class="options trade-card-choice"><legend class="section-label">Card</legend>
          <label><input type="radio" name="payWith" value="saved" ${payNew ? "" : "checked"}><span>${esc(data.card.brand)} •••• ${esc(data.card.last4)}${data.card.exp ? ` <small class="muted">exp ${esc(data.card.exp)}</small>` : ""}</span></label>
          <label><input type="radio" name="payWith" value="card" ${payNew ? "checked" : ""}><span>A new card</span></label>
        </fieldset>`
          : `<p class="section-label">Card</p>`
      }
        <div class="pay-inline" data-new-card ${payNew ? "" : "hidden"}><div class="card-frame" id="trade-card"><p class="muted">Loading secure payment…</p></div>
          <label class="checkbox trade-save-card"><input type="checkbox" name="saveCard" ${data.card ? "" : "checked"}><span>${data.card ? "Save it instead of the card on file" : "Save this card for next time"}</span></label></div>
        <p class="sub-error" data-pay-error role="alert"></p>
        <div class="trade-pay-buttons">
          <button class="button" type="submit" data-pay-button ${amount > 0 ? "" : "disabled"}>Pay ${money(amount)}</button>
          ${SB() ? `<button class="button button-quiet" type="button" data-bank-open aria-expanded="${bankOpen}" ${amount > 0 && !data.bank.verify ? "" : "disabled"}>Pay by Bank</button>` : `<button class="button button-quiet" type="submit" data-pay-bank ${one ? "" : "disabled"}>Pay by bank</button>`}
        </div>
        ${SB() ? (bankOpen ? bankPanel() : "") : `<p class="muted trade-note" data-bank-hint>${one ? "Bank payments take a few business days to clear." : "Pay by bank one invoice at a time: tick just one."}</p>`}
        ${data.card ? `<button type="button" class="link-button trade-remove-card" data-remove-card>Remove saved card</button>` : ""}`;
    };
    // How they can pay what's picked: card (Square, with bank beside it), or bank (Stripe).
    const payMethods = () => (data.square ? payBox() : SB() ? bankBox() : `<p class="tp-cart-empty">Card payments aren't available right now. <button type="button" class="tp-link-btn" data-tp-email>Email Us</button> to pay.</p>`);
    const canPay = () => Boolean(data.square || SB());
    // Pay, from an invoice or an order: the same choices for just that one, in a sheet.
    let payOne = "";
    const paySheet = () => {
      const o = data.orders.find((x) => x.number === payOne);
      if (!o) return "";
      const tag = data.square ? "form" : "div";
      return `<dialog class="cal-dialog tp-loc tp-pay-sheet" data-pay-dialog aria-labelledby="tp-pay-title"><${tag} class="cal-dialog-inner tp-pay-one"${data.square ? " data-trade-pay novalidate" : ""}>
          <h2 id="tp-pay-title">Pay ${esc(o.number)}</h2>
          <p class="trade-balance-total"><span>Amount due</span><strong>${money(o.total)}</strong></p>
          ${data.bank?.verify ? bankVerify() : payMethods()}
          <div class="tp-help-fb-actions"><button type="button" class="tp-btn" data-pay-close>Cancel</button></div>
        </${tag}></dialog>`;
    };
    const openPay = (number) => {
      payOne = number;
      payPick.clear();
      owed().forEach((o) => o.number !== number && payPick.add(o.number));
      render();
    };
    // Balance, as Products: the invoices to pay in a table (ticked ones are paid), and paying in a
    // panel beside it.
    const balanceTab = () => {
      const list = owed();
      if (!list.length) return `${bankVerify()}${data.bank?.verify ? "" : `<div class="empty-state"><p>You're all paid up.</p><button type="button" class="button" data-tab-go="orders">See your orders</button></div>`}`;
      const total = list.reduce((n, o) => n + o.total, 0);
      const late = list.filter((o) => o.state === "declined" || (o.dueDate && o.dueDate < today));
      const ring = (tone) => `<i class="tp-ring" style="--tone:var(--st-${tone})" aria-hidden="true"></i>`;
      return `${bankVerify()}
      <form class="tp-pay" data-trade-pay>
        <div class="tp-pay-main">
          <div class="tp-pay-head"><p><span>Balance</span><strong>${money(total)}</strong></p>${late.length ? `<p class="tp-line">${ring("red")}${tr("Overdue")}: ${late.length}</p>` : ""}</div>
          <table class="tp-table tp-bal">
            <thead><tr><th class="tp-bal-check"><span class="visually-hidden">Pay</span></th><th>Invoice</th><th>Due</th><th class="num">Amount</th><th></th></tr></thead>
            <tbody>${list
              .map((o) => {
                const overdue = o.dueDate && o.dueDate < today;
                const tone = o.state === "declined" || overdue ? "red" : "yellow";
                const when = o.state === "declined" ? "Payment declined" : o.dueDate ? `${overdue ? "Overdue, was due" : "Due"} ${shortDate(o.dueDate)}` : "Due on receipt";
                return `<tr>
                  <td class="tp-bal-check"><input type="checkbox" data-pay-pick="${esc(o.number)}" aria-label="Pay ${esc(o.number)}" ${payPick.has(o.number) ? "" : "checked"}></td>
                  <td><strong>${esc(o.number)}</strong>${o.poRef ? `<small>PO ${esc(o.poRef)}</small>` : ""}</td>
                  <td><span class="tp-status${tone === "red" ? " is-late" : ""}">${ring(tone)}${esc(when)}</span></td>
                  <td class="num"><b>${money(o.total)}</b></td>
                  <td class="num"><button type="button" class="tp-btn" data-invoice="${esc(o.number)}">Invoice</button></td>
                </tr>`;
              })
              .join("")}</tbody>
          </table>
        </div>
        <aside class="summary trade-summary tp-pay-box" aria-label="Pay">
          <div class="tp-cart-head"><h2>Pay</h2><span data-pay-count>${picks().length} ${picks().length === 1 ? "invoice" : "invoices"}</span></div>
          ${payMethods()}
        </aside>
      </form>`;
    };

    // Who brings an order and when: Uber Direct's logo, the day and the drop-off time (the
    // courier's own once booked); USPS for a parcel.
    const orderHow = (o) => {
      const c = o.courier;
      if (c && c.status !== "cancelled") {
        const eta = c.dropoffEta ? new Date(c.dropoffEta) : null;
        const day = eta ? eta.toLocaleDateString("en-CA", { timeZone: SHOP_TZ }) : c.day;
        const at = eta ? eta.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: SHOP_TZ }) : arrivesBy(c.miles);
        return howLine(courierMark(c.provider === "uber" ? "Uber Direct" : c.provider), day ? `${esc(dayLabel(new Date(`${day}T12:00:00Z`)))} · by ${esc(at)}` : "");
      }
      if (o.tracking) return howLine(`<strong class="tp-usps">${esc(o.tracking.carrier || "USPS")}</strong>`);
      // Not booked yet: how that place is reached, as it was shown when ordering (the day it's ready).
      if (o.state === "cancelled" || o.status === "completed" || o.status === "shipped") return "";
      const p = o.where?.location ? (a.locations || []).find((l) => l.id === o.where.location) : R;
      if (p?.ship === "usps") return howLine(`<strong class="tp-usps">USPS</strong>`, "2 to 5 business days");
      if (p?.ship !== "local") return "";
      const d = new Date(`${new Date(o.placedAt).toLocaleDateString("en-CA", { timeZone: SHOP_TZ })}T12:00:00Z`);
      for (let i = 1; i <= 8; i++) if (openOn(addDays(d, i))) return howLine(courierMark(p.courier), `${esc(dayLabel(addDays(d, i)))} · by ${arrivesBy(p.miles)}`);
      return "";
    };
    const trackUrl = (o) => (o.courier?.status !== "cancelled" && o.courier?.trackingUrl) || o.tracking?.url || "";
    // One order: what's in it, where it is, and ordering it again.
    let orderNo = startTab === "orderview" ? startRef : "";
    const orderViewTab = () => {
      const o = data.orders.find((x) => x.number === orderNo);
      if (!o) return `<div class="empty-state"><p>We couldn't find that order.</p><button type="button" class="button" data-tab-go="orders">See your orders</button></div>`;
      const sizeName = (l) => l.variant || (l.size === "tin" ? "Pack" : l.size || "");
      // One primary, by where it stands: Pay when it's due, Order Again once it's done, else none.
      const due = ["due", "overdue", "declined"].includes(o.state) && o.total > 0;
      const done = !due && (o.state === "paid" || o.status === "completed");
      return `
      <div class="trade-invoice">
        <div class="trade-invoice-head">
          <h2>Order ${esc(o.number)}</h2>
          <span class="status-badge trade-stage${o.state === "cancelled" ? " is-cancelled" : ""}"><i class="tp-ring" style="--tone:var(--st-${toneOf(o)})" aria-hidden="true"></i>${esc(o.state === "cancelled" ? "Cancelled" : STATUS[o.status] || o.status)}</span>
        </div>
        <p class="muted trade-invoice-stage">Placed ${esc(shortDate(o.placedAt))}${o.poRef ? ` · PO ${esc(o.poRef)}` : ""}</p>
        <div class="tp-where tp-where-order"><span class="tp-where-text">${
          o.fulfilment === "Pickup"
            ? `<strong>Pick Up · ${esc(o.pickupAt?.placeName || "Roastery House")}</strong>${o.pickupAt ? `<span class="tp-where-how">${howLine(`${esc(dayLabel(new Date(`${o.pickupAt.day}T12:00:00Z`)))}, ${clock12(o.pickupAt.time)}`)}</span>` : ""}`
            : `<strong>Delivering to ${esc(o.where?.name || mainName())} · ${esc(o.where?.street || a.address?.street || "")}</strong>${orderHow(o) ? `<span class="tp-where-how">${orderHow(o)}</span>` : ""}`
        }</span>${trackUrl(o) ? `<a class="tp-btn" href="${esc(trackUrl(o))}" target="_blank" rel="noopener">Track</a>` : ""}</div>
        <ul class="trade-invoice-lines">${o.lines.map((l) => `<li><div><strong>${esc(l.title)}</strong><small class="muted">${esc(sizeName(l))} × ${l.qty}</small></div><span>${money(l.price * l.qty)}</span></li>`).join("")}</ul>
        <dl class="trade-facts trade-invoice-totals">
          ${o.shipping ? `<div><dt>Delivery</dt><dd>${money(o.shipping)}</dd></div>` : ""}
          ${o.credit ? `<div><dt>Account credit</dt><dd>−${money(o.credit)}</dd></div>` : ""}
          <div class="is-total"><dt>Total</dt><dd>${money(o.total)}</dd></div>
          <div><dt>Payment</dt><dd>${esc(STATE[o.state](o))}</dd></div>
        </dl>
        <div class="trade-order-actions">
          ${due && canPay() ? `<button type="button" class="button" data-pay-sheet="${esc(o.number)}">Pay</button>` : ""}
          <button type="button" class="${done ? "button" : "tp-btn"}" data-reorder="${esc(o.number)}">Order Again</button>
          ${o.state !== "cancelled" ? `<button type="button" class="tp-btn" data-invoice="${esc(o.number)}">Invoice</button>` : ""}
          <button type="button" class="tp-btn" data-ask-order="${esc(o.number)}">Ask Us a Question</button>
          ${o.claimable?.length ? `<button type="button" class="tp-btn" data-problem-open>Report a Problem</button>` : ""}
        </div>
        ${(o.claims || []).map((c) => `<p class="trade-claim"><strong>${esc(c.problem)}</strong>: ${c.items.map((i) => `${i.qty} × ${esc(i.title)}`).join(", ")} · ${c.status === "open" ? "We're looking at it" : c.status === "credited" ? `${money(c.credited || 0)} credit on your account` : c.status === "declined" ? esc(c.answer || "Declined") : "Sorted"}</p>`).join("")}
        ${o.claimable?.length ? `<form class="form return-form trade-problem" data-trade-problem="${esc(o.number)}" hidden>
          <fieldset><legend>Which items?</legend>
            ${o.claimable.map((l) => `<label class="return-line"><input type="checkbox" name="item" value="${l.index}"><span>${esc(l.title)}${l.variant ? ` · ${esc(l.variant)}` : ""}</span>${l.qty > 1 ? `<select name="qty-${l.index}" aria-label="How many">${Array.from({ length: l.qty }, (_, i) => `<option>${i + 1}</option>`).join("")}</select>` : ""}</label>`).join("")}
          </fieldset>
          <fieldset><legend>What happened?</legend>
            ${Object.entries(data.claimProblems || {}).map(([k, v], i) => `<label class="return-line"><input type="radio" name="problem" value="${esc(k)}"${i === 0 ? " checked" : ""}><span>${esc(k === "missing" ? "Short or missing" : v)}</span></label>`).join("")}
            <textarea name="note" rows="3" maxlength="1000" placeholder="Tell us a little more" aria-label="Tell us a little more"></textarea>
          </fieldset>
          <fieldset><legend>Photos</legend>
            <label class="problem-photos"><input type="file" name="photos" accept="image/*" multiple><span class="muted">Up to 4. Once we've checked it, the credit comes off your next order.</span></label>
          </fieldset>
          <p class="sub-error" data-problem-error></p>
          <button class="button" type="submit">Send</button>
        </form>` : ""}
      </div>`;
    };

    // The invoice as a document, for the browser's Print (Download PDF is drawn by the server): the letterhead, the invoice's
    // number and where it stands, who it's billed and delivered to, its lines in a table, the
    // totals and what's due, how to pay, and our details at the foot.
    const invoicePrint = (o, due) => {
      const ad = a.address || {};
      const from = SITE.shipFrom || {};
      const place = [from.street1, [from.city, from.state].filter(Boolean).join(", ") + (from.postalCode ? ` ${from.postalCode}` : "")].filter(Boolean);
      const sizeName = (l) => l.variant || (l.size === "tin" ? "Pack" : l.size || "");
      const overdue = due && o.dueDate && o.dueDate < today;
      const stamp = o.state === "paid" ? ["paid", "Paid"] : o.state === "cancelled" ? ["void", "Cancelled"] : o.state === "refunded" ? ["void", "Refunded"] : overdue ? ["late", "Overdue"] : ["due", "Due"];
      const pickup = o.fulfilment === "Pickup";
      const row = (label, value, cls = "") => (value ? `<tr class="${cls}"><th scope="row">${label}</th><td>${value}</td></tr>` : "");
      const link = `${location.origin}/trade/invoices/${encodeURIComponent(o.number)}`;
      return `<article class="inv-print" aria-hidden="true">
        <header class="inv-head">
          <div class="inv-brand"><img src="/assets/logo.svg" alt=""><div><strong>${esc(SITE.name)}</strong>${place.map((x) => `<span>${esc(x)}</span>`).join("")}<span>${esc(SITE.wholesaleEmail)}</span></div></div>
          <div class="inv-title"><h1>Invoice</h1><p>${esc(o.number)}</p><span class="inv-stamp is-${stamp[0]}">${stamp[1]}</span></div>
        </header>
        <section class="inv-meta">
          <div><h2>Bill To</h2><p>${[a.business, a.contactName, a.email].filter(Boolean).map(esc).join("<br>")}</p></div>
          <div><h2>${pickup ? "Pickup" : "Deliver To"}</h2><p>${pickup ? "Roastery House" : ad.street ? `${esc(a.business)}<br>${esc(ad.street)}<br>${esc(`${ad.city}, ${ad.state} ${ad.postcode}`)}` : "—"}</p></div>
          <table class="inv-facts"><tbody>
            ${row("Issued", esc(shortDate(o.placedAt)))}
            ${row("Due", o.dueDate ? esc(shortDate(o.dueDate)) : "On receipt")}
            ${row("Terms", o.terms ? `Net ${o.terms}` : "Due on receipt")}
            ${row("PO", o.poRef ? esc(o.poRef) : "")}
          </tbody></table>
        </section>
        <table class="inv-lines">
          <thead><tr><th scope="col">Item</th><th scope="col">Size</th><th scope="col" class="num">Qty</th><th scope="col" class="num">Unit price</th><th scope="col" class="num">Amount</th></tr></thead>
          <tbody>${o.lines.map((l) => `<tr><td>${esc(l.title)}</td><td>${esc(sizeName(l))}</td><td class="num">${l.qty}</td><td class="num">${money(l.price)}</td><td class="num">${money(l.price * l.qty)}</td></tr>`).join("")}</tbody>
        </table>
        <section class="inv-end">
          <div class="inv-pay">${
            due
              ? `<h2>How to Pay</h2><p>Pay by card or bank at</p><p class="inv-link">${esc(link)}</p><p>Questions about this invoice: ${esc(SITE.wholesaleEmail)}</p>`
              : o.state === "paid"
                ? `<h2>Paid</h2><p>Thank you. This invoice is paid in full.</p>`
                : ""
          }</div>
          <table class="inv-sum"><tbody>
            ${row("Subtotal", money(o.subtotal ?? o.total))}
            ${o.shipping ? row("Delivery", money(o.shipping)) : ""}
            ${o.credit ? row("Account credit", `−${money(o.credit)}`) : ""}
            ${row("Total", money(o.total), "is-total")}
            ${o.state === "paid" ? row("Paid", `−${money(o.total)}`) : ""}
            ${row("Amount due", money(due ? o.total : 0), "is-due")}
          </tbody></table>
        </section>
        <footer class="inv-foot"><span>Thank you for your business.</span><span>${esc(SITE.name)} · ${esc(place.join(", "))} · ${esc(SITE.wholesaleEmail)}</span></footer>
      </article>`;
    };

    // One invoice, in full: who it's from and to, its lines and totals, and paying it.
    let invoiceNo = startTab === "invoice" ? startRef : "";
    const invoiceTab = () => {
      const o = data.orders.find((x) => x.number === invoiceNo);
      if (!o) return `<div class="empty-state"><p>We couldn't find that invoice.</p><button type="button" class="button" data-tab-go="orders">See your orders</button></div>`;
      const due = ["due", "overdue", "declined"].includes(o.state);
      const ad = a.address || {};
      const fact = (label, value) => (value ? `<div><dt>${label}</dt><dd>${value}</dd></div>` : "");
      const sizeName = (l) => l.variant || (l.size === "tin" ? "Pack" : l.size || "");
      return `
      <div class="trade-invoice">
        <div class="trade-invoice-head">
          <h2>Invoice ${esc(o.number)}</h2>
          <span class="status-badge trade-state is-${o.state}">${esc(STATE[o.state](o))}</span>
        </div>
        <p class="trade-balance-total"><span>${due ? "Amount due" : "Total"}</span><strong>${money(o.total)}</strong></p>
        <section class="trade-invoice-doc" data-invoice-doc>
          <p class="trade-invoice-print-title"><strong>${esc(SITE.name)}</strong><span>Invoice ${esc(o.number)} · ${esc(STATE[o.state](o))}</span></p>
          <div class="trade-invoice-parties">
            <div><h3 class="section-label">From</h3><p>${esc(SITE.name)}<br>${esc(SITE.shipFrom?.street1 || "")}<br>${esc([SITE.shipFrom?.city, SITE.shipFrom?.state].filter(Boolean).join(", "))} ${esc(SITE.shipFrom?.postalCode || "")}<br>${esc(SITE.wholesaleEmail)}</p></div>
            <div><h3 class="section-label">Bill to</h3><p>${[a.contactName, a.business, a.email].filter(Boolean).map(esc).join("<br>")}${ad.street ? `<br>${esc(ad.street)}<br>${esc(`${ad.city}, ${ad.state} ${ad.postcode}`)}` : ""}</p></div>
          </div>
          <dl class="trade-facts">
            ${fact("Invoice", esc(o.number))}
            ${fact("Issued", esc(shortDate(o.placedAt)))}
            ${fact("Due", o.dueDate ? esc(shortDate(o.dueDate)) : "On receipt")}
            ${fact("Terms", o.terms ? `Net ${o.terms}` : "")}
            ${fact("PO", o.poRef ? esc(o.poRef) : "")}
          </dl>
          <ul class="trade-invoice-lines">${o.lines
            .map(
              (l) => `<li><div><strong>${esc(l.title)}</strong><small class="muted">${esc(sizeName(l))}${l.qty > 1 ? ` · ${money(l.price)} each × ${l.qty}` : ""}</small></div><span>${money(l.price * l.qty)}</span></li>`
            )
            .join("")}</ul>
          <dl class="trade-facts trade-invoice-totals">
            ${fact("Subtotal", money(o.subtotal ?? o.total))}
            ${o.shipping ? fact("Delivery", money(o.shipping)) : ""}
            ${o.credit ? fact("Account credit", `−${money(o.credit)}`) : ""}
            <div class="is-total"><dt>Total</dt><dd>${money(o.total)}</dd></div>
            ${o.state === "paid" ? `<div><dt>Paid</dt><dd>−${money(o.total)}</dd></div><div class="is-total"><dt>Amount due</dt><dd>${money(0)}</dd></div>` : ""}
          </dl>
        </section>
        ${invoicePrint(o, due)}
        <div class="trade-order-actions">
          ${due && canPay() ? `<button type="button" class="button" data-pay-sheet="${esc(o.number)}">Pay</button>` : ""}
          <a class="tp-btn" href="/api/trade/invoices/${encodeURIComponent(o.number)}.pdf" download data-pdf="${esc(SITE.name)} Invoice ${esc(o.number)}.pdf">Download PDF</a>
        </div>
      </div>`;
    };

    const mountTradeCard = async () => {
      tradeCard?.destroy?.();
      tradeCard = null;
      const box = $("#trade-card", root);
      if (!box || !data.square) return;
      try {
        const Square = await loadSquareSdk(data.square.sdkUrl);
        const card = await Square.payments(data.square.applicationId, data.square.locationId).card({
          style: cardFieldStyle(),
        });
        if (!root.contains(box)) return card.destroy?.(); // moved to another tab meanwhile
        box.innerHTML = "";
        await card.attach("#trade-card");
        tradeCard = card;
      } catch (err) {
        box.innerHTML = `<p class="sub-error">Couldn't load the payment form. Please refresh the page.</p>`;
      }
    };
    // The bank option is set up as soon as it's picked, so the tap on Pay opens it straight away.
    const mountTradeBank = async (number) => {
      if (tradeBank || !data.square) return;
      try {
        const Square = await loadSquareSdk(data.square.sdkUrl);
        tradeBank = await Square.payments(data.square.applicationId, data.square.locationId).ach({ redirectURI: location.href, transactionId: number });
      } catch (err) {
        const error = $("[data-pay-error]", root);
        if (error) error.textContent = "Bank payments aren't available right now. Pay by card.";
      }
    };

    // Their team (owners see it): who logs in, owner or buyer, and how much a buyer can order
    // before an owner has to approve it. Each change saves at once; added logins are emailed.
    const teamRow = (m) => `<li class="trade-team-row" data-member="${esc(m.email)}">
        <span>${esc(m.email)}${m.you ? ` <small class="muted">You</small>` : ""}</span>
        ${m.you ? `<span class="muted">Owner</span>` : `<select name="role" aria-label="Role for ${esc(m.email)}"><option value="owner" ${m.role === "owner" ? "selected" : ""}>Owner</option><option value="buyer" ${m.role === "buyer" ? "selected" : ""}>Buyer</option></select>`}
        ${m.you ? "" : `<button type="button" class="tp-btn" data-member-remove>Remove</button>`}
      </li>`;
    const teamSection = () => `
      <section class="tp-set"><h2>Team</h2>
        <form class="tp-set-card" data-trade-team novalidate>
          <ul class="trade-team">${data.team.map(teamRow).join("")}</ul>
          <div class="tp-set-row trade-team-add">
            <input name="newEmail" type="email" placeholder="Email to add" aria-label="Email to add" autocomplete="off">
            <select name="newRole" aria-label="Role"><option value="buyer">Buyer</option><option value="owner">Owner</option></select>
            <button type="submit" class="tp-btn" data-member-add>Add</button>
          </div>
          <label class="tp-set-row"><span><strong>Approval limit</strong><small>Buyers' orders over this need an owner's OK.</small></span><input name="approvalOver" inputmode="decimal" value="${data.approvalOver ? esc(data.approvalOver) : ""}" placeholder="Every order"></label>
          <p class="sub-error" data-team-error role="alert"></p>
        </form>
      </section>`;
    // Saving the team as it stands on the page (plus `add`, an email being added).
    const saveTeam = async (f, add = null, done = "Team saved.") => {
      const err = $("[data-team-error]", f);
      err.textContent = "";
      const logins = [...$$("[data-member]", f).map((r) => ({ email: r.dataset.member, role: $("[name=role]", r)?.value || "owner" })), ...(add ? [add] : [])];
      try {
        const r = await api("/api/trade/team", { method: "PUT", body: { logins, approvalOver: f.approvalOver.value } });
        data.team = r.team;
        data.approvalOver = r.approvalOver;
        render();
        toast(esc(r.invited.length ? `${add ? `${add.email} added` : "Team saved"}. We've emailed ${r.invited.join(", ")} how to log in.` : done));
      } catch (error) {
        err.textContent = error.message;
        render();
        const again = $("[data-team-error]", root);
        if (again) again.textContent = error.message;
      }
    };
    // Light, dark, or as the device is set (kept on this device; trade.html applies it first).
    const themeNow = () => { try { return localStorage.getItem("tp-theme") || "system"; } catch { return "system"; } };
    const applyTheme = (v) => {
      try { localStorage.setItem("tp-theme", v); } catch {}
      const dark = v === "dark" || (v === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
      const was = document.documentElement.dataset.theme;
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      // The card form keeps the colors it was made with: made again in the new ones.
      if (tradeCard && was !== document.documentElement.dataset.theme) mountTradeCard();
    };
    // Match Device: follows the phone when it switches between light and dark.
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => themeNow() === "system" && applyTheme("system"));
    const setRow = (label, value) => `<div class="tp-set-row"><span><strong>${label}</strong></span><span class="tp-set-value">${value}</span></div>`;
    const setField = (label, field) => `<label class="tp-set-row"><span><strong>${label}</strong></span>${field}</label>`;
    // Interface → Theme, as the back office's Business page has it: Light, Dark or System, each with
    // its icon, the picked one filled.
    const themeSection = () => `
      <section class="tp-set"><h2>Interface</h2>
        <div class="tp-set-card"><div class="tp-set-row tp-theme-row"><span><strong>Theme</strong><small>Choose how the portal looks on this device.</small></span><div class="tp-theme-pick" role="group" aria-label="Theme">${[["light", "sun", "Light"], ["dark", "moon", "Dark"], ["system", "monitor", "System"]].map(([v, ic, label]) => `<button type="button" data-tp-theme="${v}" aria-pressed="${themeNow() === v}">${TP_ICON[ic]}<span>${label}</span></button>`).join("")}</div></div></div>
      </section>`;
    // Delivery Locations: the main address first (the default), then the others; a tap edits one.
    const locCard = (id, name, ad, isDefault) =>
      `<button type="button" class="tp-set-row tp-loc-row" data-loc-edit="${esc(id)}"><span><strong>${esc(name)}</strong><small>${esc(`${ad.street}, ${ad.city}, ${ad.state} ${ad.postcode}`)}</small></span>${isDefault ? `<span class="tp-q-tag">Default</span>` : ""}${TP_ICON.right}</button>`;
    const detailsTab = () => `
      <div class="tp-settings">
        <section class="tp-set"><h2>Billing</h2>
          <div class="tp-set-card">
            ${setRow("Business", esc(a.business))}
            <div class="tp-set-row tp-logo-row"><span><strong>Logo</strong></span><div class="tp-logo-side">${a.logo ? `<span class="tp-logo-box"><img src="/api/trade/logo?v=${esc(a.logo)}" alt="${esc(a.business)} logo"></span>` : ""}${data.role !== "buyer" ? `${a.logo ? `<button type="button" class="tp-btn" data-tp-logo-remove>Remove</button>` : ""}<label class="tp-btn">${a.logo ? "Change" : "Upload Logo"}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" data-tp-logo hidden></label>` : a.logo ? "" : `<span class="tp-set-value">None</span>`}</div></div>
            ${setRow("Terms", esc(terms))}
            ${setRow("Pricing", `${a.offRetail ?? a.discount}% off retail`)}
            <div class="tp-set-actions"><button type="button" class="tp-btn" data-tp-email>Email Us</button></div>
          </div>
        </section>
        <section class="tp-set"><h2>Contact</h2>
          <form class="tp-set-card" data-trade-details>
            ${setField("Name", `<input name="contactName" value="${esc(a.contactName || "")}" autocomplete="name">`)}
            ${a.phone ? setRow("Phone", esc(a.phone)) : ""}
            ${setRow("Email", esc(a.email))}
            <div class="tp-set-actions"><p class="sub-error" data-details-error role="alert"></p><button class="tp-btn is-primary" type="submit">Save</button></div>
          </form>
        </section>
        <section class="tp-set"><h2>Delivery Locations</h2>
          <div class="tp-set-card">
            ${a.address?.street ? locCard("main", mainName(), a.address, true) : ""}
            ${(a.locations || []).map((l) => locCard(l.id, l.name, l, !a.address?.street && l === a.locations[0])).join("")}
            <div class="tp-set-actions"><button type="button" class="tp-btn is-primary" data-loc-add>Add Location</button></div>
          </div>
        </section>
        ${(() => {
          const g = data.agreement || {};
          const rows = [];
          if (g.signed || g.waiting || g.required) rows.push({ ref: "", title: g.waiting?.title || g.signed?.title || tr("Wholesale Agreement"), waiting: agNeeded(), signedAt: g.signed?.signedAt });
          for (const d of g.documents || []) rows.push({ ref: d.id, title: d.title, waiting: d.status === "sent", signedAt: d.signedAt });
          return rows.length
            ? `<section class="tp-set"><h2>${esc(tr("Documents"))}</h2><div class="tp-set-card">${rows.map((r) => `<div class="tp-set-row"><span><strong>${esc(r.title)}</strong><small>${r.waiting ? esc(tr("Waiting for your signature")) : `${esc(tr("Signed"))} ${esc(shortDate(r.signedAt))}`}</small></span><button type="button" class="tp-btn${r.waiting ? " is-primary" : ""}" data-tab-go="agreement" data-ag-ref="${esc(r.ref)}">${esc(r.waiting ? tr("Read and Sign") : tr("View"))}</button></div>`).join("")}</div></section>`
            : "";
        })()}
        ${data.team ? teamSection() : ""}
        ${passkeySection() ? `<section class="tp-set"><h2>Sign-in</h2><div class="tp-set-card">${passkeySection()}</div></section>` : ""}
        ${themeSection()}
        <section class="tp-set">
          <div class="tp-set-card">
            <div class="tp-set-row"><span><strong>Close this wholesale account</strong><small>We'll close it once open invoices are paid, and confirm by email.</small></span><button type="button" class="tp-btn is-danger" data-close-open>Close Account</button></div>
            <form class="tp-set-close" data-trade-close hidden>
              <label class="tp-set-row is-stack"><span><strong>Anything we should know?</strong></span><textarea name="reason" rows="3" maxlength="1000"></textarea></label>
              <div class="tp-set-actions"><p class="sub-error" data-close-error role="alert"></p><button class="tp-btn is-danger" type="submit">Send Close Request</button></div>
            </form>
          </div>
        </section>
      </div>`;

    // Ask Us a Question (Peasy's quick popup): the coffees it could be about (tap the ones it's
    // about), the question, Send. It goes to a person on the team (the back office Inbox), and the
    // reply comes back in Chats. `items`: [{ id, sizes }]; `pick`: the ones ticked to start with.
    function askTeam(items = null, pick = []) {
      const ls = lines();
      const item = (id) => [...(data.prices || []), ...(data.teas || [])].find((x) => x.id === id) || {};
      const from = items || [...new Set(ls.map((l) => l.product))].map((id) => ({ id, sizes: ls.filter((l) => l.product === id).map((l) => ({ qty: l.qty, label: l.label })) }));
      if (!from.length) return;
      // One card per coffee or tea (a question is about the coffee, not the bag): its sizes on one line.
      const groups = from.map((x) => ({ id: x.id, name: item(x.id).short || x.name || x.id, color: item(x.id).color || "", sizes: x.sizes.map((s) => `${s.qty} × ${s.label}`), shown: x.sizes.map((s) => `${s.qty} × ${tr(s.label)}`), on: from.length === 1 || pick.includes(x.id) }));
      $("[data-ask-dialog]")?.remove();
      document.body.insertAdjacentHTML(
        "beforeend",
        `<dialog class="cal-dialog tp-loc tp-askq" data-ask-dialog aria-labelledby="tp-askq-title"><form class="cal-dialog-inner" data-ask-form novalidate>
          <h2 id="tp-askq-title">Ask Us a Question</h2>
          <label class="tp-loc-field"><span>Question</span><textarea name="question" rows="3" maxlength="2000"></textarea></label>
          <fieldset class="tp-askq-about"><legend class="tp-loc-field">About</legend><div class="tp-askq-items">${groups
            .map((g, i) => `<label class="tp-askq-item"><input type="checkbox" name="about" value="${i}" ${g.on ? "checked" : ""}><span class="trade-swatch" style="background:${esc(g.color)}"></span><span><strong>${esc(g.name)}</strong>${g.shown.length ? `<small>${esc(g.shown.join(" · "))}</small>` : ""}</span></label>`)
            .join("")}</div></fieldset>
          <p class="sub-error" data-ask-error role="alert"></p>
          <div class="tp-help-fb-actions"><button type="button" class="tp-btn" data-ask-cancel>Cancel</button><button type="submit" class="button">Send</button></div>
        </form></dialog>`
      );
      const dlg = $("[data-ask-dialog]");
      const form = $("[data-ask-form]", dlg);
      const err = $("[data-ask-error]", form);
      dlg.addEventListener("close", () => dlg.remove());
      $("[data-ask-cancel]", dlg).addEventListener("click", () => dlg.close());
      form.question.addEventListener("input", () => (err.textContent = ""));
      form.addEventListener("submit", async (ev) => {
        ev.preventDefault();
        const question = form.question.value.trim();
        if (!question) {
          err.textContent = tr("Write your question.");
          return form.question.focus();
        }
        // None picked: it's about all of them.
        const picked = $$("[name=about]:checked", form).map((x) => groups[Number(x.value)]);
        const about = (picked.length ? picked : groups).map((g) => (g.sizes.length ? `${g.name} (${g.sizes.join(", ")})` : g.name)).join("; ");
        const send = $("[type=submit]", form);
        send.disabled = true;
        err.textContent = "";
        try {
          await api("/api/chat", { method: "POST", body: { message: `${question}\n\nAbout: ${about}`, person: true } });
          help.list = null;
          dlg.close();
          toast(tr("Sent. We'll reply in Chats."));
        } catch (error) {
          send.disabled = false;
          err.textContent = error.message;
        }
      });
      dlg.showModal();
      form.question.focus({ preventScroll: true });
      $(".cal-dialog-inner", dlg).scrollTop = 0;
    }
    // Ask about one coffee from its row: it's ticked, beside whatever else is in the order.
    const askItem = (id) => {
      const ls = lines();
      const ids = [...new Set([id, ...ls.map((l) => l.product)])];
      askTeam(ids.map((x) => ({ id: x, sizes: ls.filter((l) => l.product === x).map((l) => ({ qty: l.qty, label: l.label })) })), [id]);
    };
    // An order's or a quote's lines, as Ask's coffees.
    const askAbout = (ls, ref) => {
      const ids = [...new Set(ls.map((l) => l.product).filter(Boolean))];
      if (!ids.length) return askTeam([{ id: ref, name: ref, sizes: [] }]);
      askTeam(ids.map((id) => ({ id, name: ls.find((l) => l.product === id).title, sizes: ls.filter((l) => l.product === id).map((l) => ({ qty: l.qty, label: sizeShort(l) })) })));
    };

    // Add Location, or one of theirs to edit (`id`: "main" for the main address): its name and
    // address (checked as it's typed), Make Default and Remove for the others, Save.
    function addLocation(id = "") {
      const main = id === "main";
      const loc = main ? { name: mainName(), ...a.address } : id ? (a.locations || []).find((l) => l.id === id) : null;
      if (id && !loc) return;
      $("[data-loc-dialog]")?.remove();
      document.body.insertAdjacentHTML(
        "beforeend",
        `<dialog class="cal-dialog tp-loc" data-loc-dialog aria-labelledby="tp-loc-title"><form class="cal-dialog-inner" data-loc-form>
          <h2 id="tp-loc-title">${loc ? esc(loc.name) : "Add Location"}</h2>
          ${!loc && navigator.geolocation ? `<button type="button" class="tp-pick-me" data-loc-me>${TP_ICON.locate}<span>Use My Location</span></button>` : ""}
          <label class="tp-loc-field"><span>Name</span><input name="name" maxlength="60" required value="${esc(loc?.name || "")}"></label>
          <label class="tp-loc-field"><span>Street</span><input name="street" maxlength="160" required autocomplete="street-address" value="${esc(loc?.street || "")}"></label>
          <label class="tp-loc-field"><span>City</span><input name="city" maxlength="80" required autocomplete="address-level2" value="${esc(loc?.city || "")}"></label>
          <div class="tp-loc-pair"><label class="tp-loc-field"><span>State</span><select name="state" required autocomplete="address-level1"><option value=""></option>${data.states.map((c) => `<option ${c === (loc?.state || a.address?.state) ? "selected" : ""}>${c}</option>`).join("")}</select></label><label class="tp-loc-field"><span>ZIP</span><input name="postcode" maxlength="20" required inputmode="numeric" autocomplete="postal-code" value="${esc(loc?.postcode || "")}"></label></div>
          <div class="tp-loc-check" data-loc-check role="status" hidden></div>
          ${loc && !main ? `<div class="tp-loc-more"><button type="button" class="tp-btn" data-loc-default>Make Default</button><button type="button" class="tp-btn is-danger" data-loc-drop>Remove</button></div>` : ""}
          <p class="sub-error" data-loc-error role="alert"></p>
          <div class="tp-help-fb-actions"><button type="button" class="tp-btn" data-loc-cancel>Cancel</button><button type="submit" class="button">Save</button></div>
        </form></dialog>`
      );
      const dlg = $("[data-loc-dialog]");
      const form = $("[data-loc-form]", dlg);
      const box = $("[data-loc-check]", dlg);
      // The address as typed, checked (USPS) and placed (courier or USPS) a moment after typing stops.
      let checked = null;
      let confirmed = false;
      let seq = 0;
      let timer = 0;
      let mapOpen = false;
      let lastFix = null; // where Use My Location found them
      // Find on Map: a map with a pin fixed in its middle; moving the map puts the pin on the right
      // building, and the address there fills the form (then it's checked as a typed one).
      const openMap = async () => {
        if (mapOpen) return;
        mapOpen = true;
        show(checked);
        box.insertAdjacentHTML("afterend", `<div class="tp-loc-map" data-loc-map><div class="tp-loc-map-pin tp-map-pin is-on">${PIN_DOT}</div></div>`);
        const el = $("[data-loc-map]", dlg);
        const t = typed();
        const roastery = (LOCATIONS.find((l) => l.cafe === false && Array.isArray(l.coords)) || LOCATIONS.find((l) => Array.isArray(l.coords)))?.coords;
        const near = await api("/api/trade/locate", { method: "POST", body: { q: [t.street, t.city, t.state, t.postcode].filter(Boolean).join(", ") } })
          .then((r) => r.coords)
          .catch(() => null);
        const L = await loadLeaflet().catch(() => null);
        if (!L || !el.isConnected) return el.remove();
        const map = L.map(el, { zoomControl: false, attributionControl: false });
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 }).addTo(map);
        let moved = 0;
        let theirs = false; // only moves they make fill the form, not the first view
        map.on("movestart", () => theirs && el.classList.add("is-moving"));
        map.on("moveend", () => {
          el.classList.remove("is-moving");
          if (!theirs) return;
          clearTimeout(moved);
          moved = window.setTimeout(async () => {
            const c = map.getCenter();
            try {
              const { address: f } = await api("/api/trade/locate/address", { method: "POST", body: { lat: c.lat, lon: c.lng } });
              form.street.value = f.street;
              form.city.value = f.city;
              form.state.value = f.state;
              form.postcode.value = f.postcode;
              check();
            } catch (error) {
              $("[data-loc-error]", dlg).textContent = error.message;
            }
          }, 500);
        });
        map.setView(near || lastFix || myCoords || roastery || [34.0522, -118.2437], near || lastFix ? 18 : 15);
        theirs = true;
        el.scrollIntoView({ block: "nearest", behavior: "smooth" });
      };
      const typed = () => ({ street: form.street.value.trim(), city: form.city.value.trim(), state: form.state.value, postcode: form.postcode.value.trim() });
      const show = (r) => {
        checked = r;
        const st = r?.address?.status;
        const fix = r?.address?.address;
        const how = r?.ship === "local" ? `<p class="tp-loc-ok"><span><strong>Local delivery</strong><small>${[r.courier && courierMark(r.courier), r.miles != null && esc(`${r.miles < 10 ? r.miles.toFixed(1) : Math.round(r.miles)} mi from the roastery`)].filter(Boolean).join(" · ")}</small></span></p>` : r?.ship === "usps" ? `<p class="tp-loc-ok"><span><strong>Ships by USPS</strong>${r.miles != null ? `<small>${r.miles < 10 ? r.miles.toFixed(1) : Math.round(r.miles)} mi from the roastery</small>` : ""}</span></p>` : "";
        box.innerHTML =
          !r ? `<p class="tp-loc-wait">Checking the address…</p>`
          : st === "corrected" && !confirmed ? `<p>Did you mean <strong>${esc(`${fix.address}, ${fix.city}, ${fix.state} ${fix.postcode}`)}</strong>?</p><div class="tp-loc-acts"><button type="button" class="tp-btn is-primary" data-loc-use>Use This</button><button type="button" class="tp-btn" data-loc-keep>Keep Mine</button></div>`
          : st === "unit" && !confirmed ? `<p class="is-warn">Add an apt, suite or unit number.</p><div class="tp-loc-acts"><button type="button" class="tp-btn" data-loc-keep>It's Right</button></div>`
          : st === "invalid" && !confirmed ? `<p class="is-warn">We couldn't find that address. Check it.</p><div class="tp-loc-acts">${mapOpen ? "" : `<button type="button" class="tp-btn" data-loc-map-open>${TP_ICON.pin}<span>Find on Map</span></button>`}<button type="button" class="tp-btn" data-loc-keep>It's Right</button></div>`
          : how;
        box.hidden = !box.innerHTML;
      };
      const check = () => {
        clearTimeout(timer);
        const t = typed();
        confirmed = false;
        if (!t.street || !t.state || !(t.city || t.postcode)) return (box.hidden = true), (checked = null);
        timer = window.setTimeout(async () => {
          const mine = ++seq;
          show(null);
          const r = await api("/api/trade/locations/check", { method: "POST", body: t }).catch(() => ({ address: { status: "unknown" } }));
          if (mine === seq) show(r);
        }, 450);
      };
      ["street", "city", "state", "postcode"].forEach((n) => ["input", "change"].forEach((type) => form[n].addEventListener(type, check)));
      addressSuggest(form.street, () => ({ address: form.street, city: form.city, state: form.state, postcode: form.postcode }));
      // Saving the account's addresses: the main one and the others, then the page again.
      const patch = async (body, msg) => {
        const { account } = await api("/api/trade/account", { method: "PATCH", body });
        a.address = account.address;
        a.locations = account.locations;
        dlg.close();
        saveOrder();
        render();
        redrawWhere();
        toast(esc(msg));
      };
      const fail = (err) => ($("[data-loc-error]", form).textContent = err.message);
      dlg.addEventListener("close", () => dlg.remove());
      dlg.addEventListener("click", async (e) => {
        if (e.target === dlg || e.target.closest("[data-loc-cancel]")) return dlg.close();
        if (e.target.closest("[data-loc-use]") && checked?.address?.address) {
          const f = checked.address.address;
          Object.assign(form.street, { value: f.address });
          Object.assign(form.city, { value: f.city });
          form.state.value = f.state;
          form.postcode.value = f.postcode;
          check();
        }
        if (e.target.closest("[data-loc-keep]")) {
          confirmed = true;
          show(checked);
        }
        if (e.target.closest("[data-loc-map-open]")) openMap();
        // Make Default: it becomes the main address, and the main address one of the others.
        if (e.target.closest("[data-loc-default]")) {
          const others = (a.locations || []).filter((l) => l.id !== id);
          const old = a.address?.street ? [{ name: mainName(), street: a.address.street, city: a.address.city, state: a.address.state, postcode: a.address.postcode, confirmed: true }] : [];
          if (shipLoc === id) shipLoc = "";
          return patch({ address: { name: loc.name, street: loc.street, city: loc.city, state: loc.state, postcode: loc.postcode }, locations: [...others, ...old] }, `${loc.name} is now the default.`).catch(fail);
        }
        if (e.target.closest("[data-loc-drop]")) {
          if (!confirm(`Remove ${loc.name}?`)) return;
          if (shipLoc === id) shipLoc = "";
          return patch({ locations: (a.locations || []).filter((l) => l.id !== id) }, `${loc.name} removed.`).catch(fail);
        }
        // Use My Location (standing at the new shop): the phone's location prompt, then the street
        // address there filled in and checked like a typed one. Off or not found: they type it.
        const me = e.target.closest("[data-loc-me]");
        if (me) {
          const label = $("span", me);
          const err = $("[data-loc-error]", dlg);
          const fail = (msg) => {
            me.disabled = false;
            label.textContent = tr("Use My Location");
            err.textContent = tr(msg);
            form.street.focus();
          };
          me.disabled = true;
          label.textContent = tr("Finding You…");
          err.textContent = "";
          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              lastFix = [pos.coords.latitude, pos.coords.longitude];
              try {
                const { address: f } = await api("/api/trade/locate/address", { method: "POST", body: { lat: pos.coords.latitude, lon: pos.coords.longitude } });
                form.street.value = f.street;
                form.city.value = f.city;
                form.state.value = f.state;
                form.postcode.value = f.postcode;
                me.disabled = false;
                label.textContent = tr("Use My Location");
                check();
                form.name.focus();
              } catch (error) {
                fail(error.message);
              }
            },
            (error) => fail(error.code === 1 ? "Location is off for this site. Type the address." : "We couldn't find you. Type the address."),
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
          );
        }
      });
      dlg.addEventListener("submit", async (e) => {
        e.preventDefault();
        const f = e.target;
        const save = $("button[type=submit]", f);
        save.disabled = true;
        const added = { name: f.name.value.trim(), ...typed(), ...(confirmed && { confirmed: true }) };
        const st = checked?.address?.status;
        if ((st === "invalid" || st === "unit") && !confirmed) {
          save.disabled = false;
          $("[data-loc-error]", f).textContent = st === "unit" ? "Add an apt, suite or unit number, or tap It's Right." : "Check the address, or tap It's Right.";
          return;
        }
        try {
          if (main) return await patch({ address: { ...typed(), name: added.name === a.business ? "" : added.name } }, "Saved.");
          if (loc) return await patch({ locations: (a.locations || []).map((l) => (l.id === id ? { ...l, ...added } : l)) }, "Saved.");
          const before = new Set((a.locations || []).map((l) => l.id));
          const { account } = await api("/api/trade/account", { method: "PATCH", body: { locations: [...(a.locations || []), added] } });
          a.locations = account.locations;
          // A new place is where this order goes.
          shipLoc = a.locations.find((l) => !before.has(l.id))?.id || "";
          way = "Delivery";
          dlg.close();
          saveOrder();
          render();
          redrawWhere();
          toast(esc(`${added.name} added.`));
        } catch (err) {
          save.disabled = false;
          $("[data-loc-error]", f).textContent = err.message;
        }
      });
      dlg.showModal();
      $("[name=name]", dlg).focus();
    }

    // Email Us: the help panel, set to a person (the same as Person there), so a message to the
    // team is one thing wherever it starts.
    function emailUs() {
      help.mode = "person";
      help.chat = null;
      help.booking = null;
      help.tab = "chats";
      help.composing = true;
      openHelp();
    }

    // Wide enough to show an order beside the list (as the back office's records).
    const wide = matchMedia("(min-width: 1180px)");
    wide.addEventListener("change", () => tab === "orderview" && render());

    // Overview: the café's account at a glance, in cards (as the back office's Overview): what's
    // owed, the latest order, their usual, what waits on them, and any credit.
    // Samples: up to three of our coffees to try, roasted for them; where their request is
    // (Requested → Roasting → Sent), and once they've tried them, how each one tasted.
    let samplesData = null;
    let samplesPick = new Set<string>();
    let samplesBrew = "both"; // How they brew: only the coffees roasted for it are shown.
    const brewFits = (c) => samplesBrew === "both" || String(c.roast || "").toLowerCase() === samplesBrew;
    const loadSamples = () =>
      api("/api/trade/samples")
        .then((d) => {
          samplesData = d;
          if (tab === "samples" || tab === "home") render();
        })
        .catch(() => {});
    loadSamples(); // for Overview's card: samples on the way
    const samplesOut = () => (samplesData?.requests || []).some((r) => ["requested", "roasting", "sent"].includes(r.status));
    const SAMPLE_STEPS = [["requested", "Requested"], ["roasting", "Roasting"], ["sent", "Sent"]];
    const TASTE = [["loved", "Loved It"], ["good", "Good"], ["no", "Not for Us"]];
    const samplesTab = () => {
      if (!samplesData) {
        loadSamples();
        return `<p class="tp-none">${esc(tr("Loading…"))}</p>`;
      }
      const { coffees, requests } = samplesData;
      const busy = requests.find((r) => r.status === "requested" || r.status === "roasting");
      const sent = requests.filter((r) => r.status === "sent");
      const past = requests.filter((r) => r.status === "tasted");
      const steps = (r) => {
        const at = SAMPLE_STEPS.findIndex(([k]) => k === r.status);
        return `<ol class="tp-steps">${SAMPLE_STEPS.map(([k, l], i) => `<li class="${i <= at ? "is-done" : ""}${i === at ? " is-now" : ""}">${esc(tr(k === "sent" && r.how === "pickup" ? "Ready" : l))}</li>`).join("")}</ol>`;
      };
      const where = (r) => (r.how === "pickup" ? tr("Pick up at the roastery") : r.location ? `${tr("Deliver to")} ${r.location}` : tr("Delivered"));
      const status = (r) => `<section class="tp-card tp-sample">
          <div class="tp-sample-head"><h2>${esc(tr("Your Samples"))}</h2><small>${esc(shortDate(r.at))}</small></div>
          ${steps(r)}
          <ul class="tp-sample-list">${r.coffees.map((c) => `<li>${esc(c.name)}</li>`).join("")}</ul>
          <p class="tp-line">${esc(where(r))}</p>
          ${
            r.status === "sent"
              ? `<form class="tp-taste" data-sample-feedback="${esc(r.id)}"><h3>${esc(tr("How did they taste?"))}</h3>${r.coffees
                  .map((c) => `<fieldset><legend>${esc(c.name)}</legend><div class="tp-seg">${TASTE.map(([v, l]) => `<label><input type="radio" name="t-${esc(c.id)}" value="${v}"><span>${esc(tr(l))}</span></label>`).join("")}</div></fieldset>`)
                  .join("")}<label class="tp-field"><span>${esc(tr("Anything else?"))}</span><textarea name="note" rows="2" maxlength="600"></textarea></label><button type="submit" class="button">${esc(tr("Send"))}</button><p class="tp-error" role="alert"></p></form>`
              : r.status === "requested"
                ? `<div class="tp-card-foot"><button type="button" class="tp-btn" data-sample-cancel="${esc(r.id)}">${esc(tr("Cancel Request"))}</button></div>`
                : ""
          }
        </section>`;
      // One sample request per account: once used (and not cancelled), the form is gone.
      const used = requests.some((r) => r.status !== "cancelled");
      const form = used
        ? ""
        : `<form class="tp-card tp-sample-form" data-samples-form>
            <h2>${esc(tr("Try Our Coffees"))}</h2>
            <fieldset><legend>${esc(tr("How do you brew?"))}</legend><div class="tp-seg">${[["espresso", "Espresso"], ["filter", "Filter"], ["both", "Both"]].map(([v, l]) => `<label><input type="radio" name="brew" value="${v}"${v === samplesBrew ? " checked" : ""}><span>${esc(tr(l))}</span></label>`).join("")}</div></fieldset>
            <fieldset><legend>${esc(tr("Pick up to three"))}</legend><div class="tp-sample-pick">${coffees
              .map((c) => `<label class="tp-smp${samplesPick.has(c.id) ? " is-on" : ""}" data-roast="${esc(String(c.roast || "").toLowerCase())}"${brewFits(c) ? "" : " hidden"}><input type="checkbox" name="coffee" value="${esc(c.id)}"${samplesPick.has(c.id) ? " checked" : ""}${!samplesPick.has(c.id) && samplesPick.size >= 3 ? " disabled" : ""}><span><strong>${esc(c.name)}</strong><small>${esc(c.notes)}</small></span></label>`)
              .join("")}</div></fieldset>
            <fieldset><legend>${esc(tr("Get Them"))}</legend><div class="tp-seg"><label><input type="radio" name="how" value="delivery" checked><span>${esc(tr("Delivered"))}</span></label><label><input type="radio" name="how" value="pickup"><span>${esc(tr("Pick Up"))}</span></label></div>
              ${(a.locations || []).length > 1 ? `<label class="tp-field"><span>${esc(tr("Deliver to"))}</span><select name="location">${a.locations.map((l) => `<option value="${esc(l.id)}">${esc(l.name)}</option>`).join("")}</select></label>` : ""}</fieldset>
            <label class="tp-field"><span>${esc(tr("Anything we should know?"))}</span><textarea name="note" rows="2" maxlength="600"></textarea></label>
            <button type="submit" class="button" ${samplesPick.size ? "" : "disabled"}>${esc(tr("Request Samples"))}</button>
            <p class="tp-error" role="alert"></p>
          </form>`;
      return `<div class="tp-samples">${[busy, ...sent].filter(Boolean).map(status).join("")}${form}${
        past.length
          ? `<section class="tp-card"><h2>${esc(tr("Tasted"))}</h2><ul class="tp-sample-past">${past
              .map((r) => `<li><small>${esc(shortDate(r.at))}</small>${r.coffees.map((c) => `<span>${esc(c.name)}<em>${esc(tr(Object.fromEntries(TASTE)[r.feedback?.ratings?.[c.id]] || "—"))}</em></span>`).join("")}</li>`)
              .join("")}</ul><div class="tp-card-foot"><button type="button" class="tp-btn" data-tab-go="order">${esc(tr("Order Coffee"))}</button></div></section>`
          : ""
      }</div>`;
    };
    // Their wholesale agreement: read it, and sign it (an owner types their name and ticks that
    // they agree); once signed, who signed and when, and the signed copy to download.
    // agRef: one document (a one-off, by its id); empty for the wholesale agreement.
    let agData = null;
    let agRef = startTab === "agreement" ? startRef : "";
    const agNeeded = () => Boolean(data.agreement && (data.agreement.waiting || (data.agreement.required && !data.agreement.signed)));
    const docsWaiting = () => (data.agreement?.documents || []).filter((d) => d.status === "sent");
    // What's being fetched (null: nothing). A failed fetch is kept as an error, not retried in a loop.
    let agLoading = null;
    const loadAgreement = () => {
      if (agLoading === agRef) return;
      const ref = (agLoading = agRef);
      api(`/api/trade/agreement${ref ? `?id=${encodeURIComponent(ref)}` : ""}`)
        .then((d) => (agData = { ...d, for: ref }))
        .catch((error) => (agData = { for: ref, agreement: null, error: error.message || tr("Something went wrong. Try again.") }))
        .finally(() => {
          if (agLoading === ref) agLoading = null;
          if (tab === "agreement" && agRef === ref) render();
        });
    };
    const agreementText = (t) =>
      String(t || "")
        .split("\n")
        .map((line) => (/^\d+\.\s+\S.{0,60}$/.test(line.trim()) && !/[.:;,]$/.test(line.trim()) ? `<p class="tp-ag-h"><strong>${esc(line)}</strong></p>` : line.trim() ? `<p>${esc(line)}</p>` : ""))
        .join("");
    // The signature font, loaded the first time someone signs.
    const SIG_FONT = "Mrs Saint Delafield";
    const sigFont = () => {
      if (!document.querySelector("link[data-sig-font]")) document.head.insertAdjacentHTML("beforeend", `<link rel="stylesheet" data-sig-font href="https://fonts.googleapis.com/css2?family=Mrs+Saint+Delafield&display=swap">`);
    };
    // The drawing pad: sized to the screen (sharp on Retina), ink as they draw.
    let sigInk = false;
    const sigPad = (canvas) => {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(3, devicePixelRatio || 1));
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      const ctx = canvas.getContext("2d");
      Object.assign(ctx, { lineWidth: 2.4 * dpr, lineCap: "round", lineJoin: "round", strokeStyle: "#111111" });
      sigInk = false;
      return ctx;
    };
    // Their typed name in the signature font, as a PNG (for the record and the PDF).
    const typedSignature = async (name) => {
      await document.fonts.load(`96px "${SIG_FONT}"`).catch(() => {});
      const c = document.createElement("canvas");
      const ctx = c.getContext("2d");
      ctx.font = `96px "${SIG_FONT}", cursive`;
      const w = Math.ceil(ctx.measureText(name).width) + 60;
      c.width = Math.min(2400, w);
      c.height = 180;
      ctx.font = `96px "${SIG_FONT}", cursive`;
      ctx.fillStyle = "#111111";
      ctx.textBaseline = "middle";
      ctx.fillText(name, 30, 96);
      return c.toDataURL("image/png");
    };
    const agreementTab = () => {
      if (!agData || agData.for !== agRef) {
        agData = null;
        loadAgreement();
        return `<p class="tp-none">${esc(tr("Loading…"))}</p>`;
      }
      if (agData.error) return `<section class="tp-card"><h2>${esc(tr("Agreement"))}</h2><p class="tp-line">${esc(agData.error)}</p><div class="tp-card-foot"><button type="button" class="tp-btn" data-ag-retry>${esc(tr("Try Again"))}</button></div></section>`;
      const g = agData.agreement;
      if (!g) return `<section class="tp-card"><h2>${esc(tr("Agreement"))}</h2><p class="tp-line">${esc(tr("Nothing to sign right now."))}</p></section>`;
      const signed = g.status === "signed";
      const when = (iso) => new Date(iso).toLocaleDateString(LOCALE_US, { month: "long", day: "numeric", year: "numeric" });
      // Sent through uSign: it's signed from uSign's email; the sealed copy comes back here.
      if (g.via === "usign")
        return `<div class="tp-agreement"><section class="tp-card tp-ag-done">
          <h2>${esc(g.title)}</h2>
          ${
            signed
              ? `<p class="tp-line"><i class="tp-ring" style="--tone:var(--st-green)" aria-hidden="true"></i>${esc(tr("Signed on"))} ${esc(when(g.signedAt))}</p>${g.hasPdf ? `<div class="tp-card-foot"><a class="tp-btn" href="/api/trade/agreement/${esc(g.id)}.pdf" download>${esc(tr("Download PDF"))}</a></div>` : ""}`
              : `<p class="tp-line"><i class="tp-ring" style="--tone:var(--st-yellow)" aria-hidden="true"></i>${esc(tr("We emailed it to"))} ${esc(g.sentTo)} ${esc(tr("to sign with uSign."))}</p>`
          }
        </section></div>`;
      return `<div class="tp-agreement">
        <article class="tp-card tp-ag-doc">
          <header class="tp-ag-head"><h2>${esc(g.title)}</h2><small>${esc(g.business)}${g.kind === "custom" ? "" : ` · ${esc(tr("Version"))} ${g.version}`}</small></header>
          <div class="tp-ag-text" translate="no">${agreementText(g.text)}</div>
        </article>
        ${
          signed
            ? `<section class="tp-card tp-ag-done">${g.signature ? `<img class="tp-ag-sig" src="${esc(g.signature)}" alt="${esc(tr("Signature"))}">` : ""}<p class="tp-line"><i class="tp-ring" style="--tone:var(--st-green)" aria-hidden="true"></i>${esc(tr("Signed by"))} ${esc(g.signer?.name || "")} ${esc(tr("on"))} ${esc(when(g.signedAt))}</p><div class="tp-card-foot"><a class="tp-btn" href="/api/trade/agreement/${esc(g.id)}.pdf" download>${esc(tr("Download PDF"))}</a></div></section>`
            : agData.canSign
              ? (sigFont(), `<form class="tp-card tp-ag-sign" data-ag-sign="${esc(g.id)}">
                  <h2>${esc(tr("Sign"))}</h2>
                  <div class="tp-ag-row">
                    <label class="tp-field"><span>${esc(tr("Full Name"))}</span><input name="name" autocomplete="name" maxlength="80" required value="${esc(data.account.contactName || "")}"></label>
                    <label class="tp-field"><span>${esc(tr("Title"))}</span><input name="title" autocomplete="organization-title" maxlength="80" placeholder="${esc(tr("Owner"))}"></label>
                  </div>
                  <div class="tp-sig">
                    <div class="tp-seg" role="radiogroup" aria-label="${esc(tr("Signature"))}"><label><input type="radio" name="sigMode" value="typed" checked><span>${esc(tr("Type"))}</span></label><label><input type="radio" name="sigMode" value="drawn"><span>${esc(tr("Draw"))}</span></label></div>
                    <div class="tp-sig-pad" data-sig-typed><span class="tp-sig-name" data-sig-preview translate="no">${esc(data.account.contactName || "")}</span></div>
                    <div class="tp-sig-pad" data-sig-drawn hidden><canvas data-sig-canvas aria-label="${esc(tr("Sign here"))}"></canvas><button type="button" class="tp-sig-clear" data-sig-clear>${esc(tr("Clear"))}</button></div>
                  </div>
                  <label class="tp-ag-agree"><input type="checkbox" name="agree" required><span>${esc(tr(g.kind === "custom" ? "I agree to this document for" : "I agree to this agreement for"))} ${esc(g.business)}, ${esc(tr("and this is my electronic signature."))}</span></label>
                  <p class="tp-error" role="alert"></p>
                  <button type="submit" class="button">${esc(tr(g.kind === "custom" ? "Sign Document" : "Sign Agreement"))}</button>
                </form>`)
              : `<section class="tp-card"><p class="tp-line">${esc(tr("An owner of the account signs this."))}</p></section>`
        }
      </div>`;
    };
    const homeTab = () => {
      const due = owed();
      const dueTotal = due.reduce((n, o) => n + o.total, 0);
      const overdue = due.filter((o) => o.state === "overdue" || o.state === "declined");
      const next = due.filter((o) => o.dueDate).sort((x, y) => x.dueDate.localeCompare(y.dueDate))[0];
      const last = [...data.orders].sort((x, y) => y.placedAt.localeCompare(x.placedAt))[0];
      const waiting = waitingForMe();
      const card = (title, body, foot = "") => `<section class="tp-card"><h2>${title}</h2>${body}${foot ? `<div class="tp-card-foot">${foot}</div>` : ""}</section>`;
      const ring = (tone) => `<i class="tp-ring" style="--tone:var(--st-${tone})" aria-hidden="true"></i>`;
      return `
        <div class="tp-bar"><button type="button" class="button tp-new" data-tab-go="order">New Order</button></div>
        <div class="tp-cards">
          ${card(
            "Balance",
            `<p class="tp-big">${money(dueTotal)}</p><p class="tp-line">${
              due.length
                ? overdue.length
                  ? `${ring("red")}${tr("Overdue")}: ${overdue.length}`
                  : next
                    ? `${ring("yellow")}${tr("Next due")} ${esc(shortDate(next.dueDate))}`
                    : `${ring("yellow")}${tr("To pay")}: ${due.length}`
                : `${ring("green")}You're all paid up.`
            }</p>`,
            due.length ? `<button type="button" class="tp-btn" data-tab-go="balance">Pay</button>` : ""
          )}
          ${
            last
              ? card(
                  "Latest Order",
                  `<p class="tp-big">${esc(last.number)}</p><p class="tp-line">${ring(toneOf(last))}<span>${esc(last.state === "cancelled" ? "Cancelled" : STATUS[last.status] || last.status)}</span>&nbsp;· ${esc(shortDate(last.placedAt))} · ${money(last.total)}</p>`,
                  `<button type="button" class="tp-btn" data-reorder="${esc(last.number)}">Order Again</button><button type="button" class="tp-btn" data-open-order="${esc(last.number)}">View</button>`
                )
              : card("Latest Order", `<p class="tp-line">No orders yet.</p>`, `<button type="button" class="tp-btn" data-tab-go="order">New Order</button>`)
          }
          ${waiting.length ? card("Waiting on You", `<p class="tp-big">${waiting.length}</p><p class="tp-line">${ring("yellow")}${waiting.length === 1 ? "An order or quote to look at" : "Orders and quotes to look at"}</p>`, `<button type="button" class="tp-btn" data-tab-go="orders"${waitingRequests().length ? "" : ' data-then-view="quotes"'}>Review</button>`) : ""}
          ${data.usual?.lines?.length ? card("Your Usual", `<ul class="tp-usual-list">${data.usual.lines.map((l) => `<li>${esc(itemName(l))}</li>`).join("")}</ul>`, `<button type="button" class="tp-btn" data-usual-sheet>Fill Your Usual</button>`) : ""}
          ${agNeeded() ? card(tr("Agreement"), `<p class="tp-line">${ring("yellow")}${esc(tr("Waiting for your signature"))}</p>`, `<button type="button" class="tp-btn" data-tab-go="agreement" data-ag-ref="">${esc(tr("Read and Sign"))}</button>`) : ""}
          ${docsWaiting().map((d) => card(esc(d.title), `<p class="tp-line">${ring("yellow")}${esc(tr("Waiting for your signature"))}</p>`, `<button type="button" class="tp-btn" data-tab-go="agreement" data-ag-ref="${esc(d.id)}">${esc(tr("Read and Sign"))}</button>`)).join("")}
          ${(!data.orders.length && !(samplesData?.requests || []).some((r) => r.status !== "cancelled")) || samplesOut() ? card(samplesOut() ? tr("Coffee Samples") : "Try Our Coffees", samplesOut() ? `<p class="tp-line">${ring("yellow")}${tr("Your samples are on the way")}</p>` : "", `<button type="button" class="tp-btn" data-tab-go="samples">${samplesOut() ? tr("See Samples") : tr("Request Samples")}</button>`) : ""}
          ${credit() ? card("Account Credit", `<p class="tp-big">${money(credit())}</p><p class="tp-line">Comes off your next order.</p>`) : ""}
        </div>`;
    };

    // The café's menu, as the back office's (its name at the top of the sidebar; the initial in
    // the phone's title strip): who's signed in, Account, Light / Dark / System, Email Us, Log Out.
    function toggleMenu(from) {
      let menu = $("[data-tp-menu-box]");
      if (menu && !menu.hidden) return closeMenu();
      if (!menu) {
        document.body.insertAdjacentHTML("beforeend", `<div class="tp-menu" data-tp-menu-box role="menu" hidden></div>`);
        menu = $("[data-tp-menu-box]");
        menu.addEventListener("click", (e) => {
          const b = e.target.closest("button");
          if (!b) return;
          if (b.dataset.tpTheme) {
            applyTheme(b.dataset.tpTheme);
            $$("[data-tp-theme]").forEach((x) => x.setAttribute("aria-pressed", String(x.dataset.tpTheme === b.dataset.tpTheme)));
            return;
          }
          closeMenu();
          if (b.dataset.menuGo) goTo(b.dataset.menuGo);
          else if (b.hasAttribute("data-menu-email")) emailUs();
          else if (b.hasAttribute("data-menu-out")) api("/api/auth/logout", { method: "POST", body: {} }).catch(() => {}).then(() => (location.href = "./"));
        });
        document.addEventListener("click", (e) => {
          if (!(e.target as HTMLElement).closest?.("[data-tp-menu-box], [data-tp-menu]")) closeMenu();
        });
        document.addEventListener("keydown", (e) => e.key === "Escape" && closeMenu());
      }
      menu.innerHTML = `
        <p class="tp-menu-who">${tpMark()}<span><strong>${esc(a.business)}</strong><small>${esc(user.email)}</small></span></p>
        <button type="button" role="menuitem" data-menu-go="details">${TP_ICON.details}<span>Account</span></button>
        <div class="tp-menu-themes" role="group" aria-label="Appearance">${[["light", "sun", "Light"], ["dark", "moon", "Dark"], ["system", "monitor", "System"]].map(([v, ic, label]) => `<button type="button" data-tp-theme="${v}" aria-pressed="${themeNow() === v}">${TP_ICON[ic]}<span>${label}</span></button>`).join("")}</div>
        <button type="button" role="menuitem" data-menu-email>${TP_ICON.help}<span>Email Us</span></button>
        <button type="button" role="menuitem" data-a11y-open>${A11Y_ICON.replace("<svg", '<svg class="tp-i" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"')}<span>Accessibility</span></button>
        ${SITE.wholesaleText ? `<a role="menuitem" class="tp-menu-link" href="sms:${esc(SITE.wholesaleText)}?&body=${encodeURIComponent(`Hi, it's ${a.business}. `)}">${TEXT_ICON}<span>Text Us</span></a>` : ""}
        <button type="button" role="menuitem" data-menu-out>${TP_ICON.logout}<span>Log Out</span></button>`;
      const r = from.getBoundingClientRect();
      const phone = innerWidth <= 760;
      menu.style.top = `${r.bottom + 6}px`;
      menu.style.left = phone ? "auto" : `${r.left}px`;
      menu.style.right = phone ? "12px" : "auto";
      menu.hidden = false;
      $$("[data-tp-menu]").forEach((b) => b.setAttribute("aria-expanded", "true"));
      $("button", menu)?.focus();
    }
    function closeMenu() {
      const menu = $("[data-tp-menu-box]");
      if (menu) menu.hidden = true;
      $$("[data-tp-menu]").forEach((b) => b.setAttribute("aria-expanded", "false"));
    }

    /* ── The help panel (Peasy's): Chats, Skills and Help Docs, how they'd like help (a person,
       the assistant, or a call), and the conversation itself. Chats are the site's Chat Us
       conversations (the same ones the team answers in the Inbox), so they follow the café to
       any device. ── */
    // What the assistant can do for a café (server/textagent.ts's tools), by area. + puts a
    // starting line in the box, the cursor where the detail goes.
    const HELP_SKILLS = [
      ["Orders", "Place an order", "Create", "Tell it what you need; it prices it, and places it once you say yes.", "I'd like to order "],
      ["Orders", "Order the usual", "Create", "Your saved usual, priced and placed once you say yes.", "Order my usual"],
      ["Orders", "Price an order", "Report", "What an order would cost, with delivery, before you place it.", "How much would  cost?"],
      ["Orders", "Change an order", "Edit", "New items or delivery for an order that isn't packed or paid yet.", "Change order  to "],
      ["Orders", "Cancel an order", "Operate", "Cancel an order that isn't packed or paid yet, once you confirm.", "Cancel order "],
      ["Orders", "Where's my order", "Report", "Your recent orders: status, items, delivery and tracking.", "Where's my latest order?"],
      ["Orders", "Save your usual", "Edit", "Keep the order you place most often, for one-line reorders.", "Save this as my usual: "],
      ["Invoices", "What do we owe", "Report", "What's due, when, and any credit on your account.", "What do we owe right now?"],
      ["Invoices", "Send an invoice again", "Operate", "Emails an invoice again with its link to pay by card or bank.", "Send me the invoice for "],
      ["Products", "Your prices", "Report", "What you pay for each coffee and tea right now.", "What are our prices for "],
      ["Products", "Pick a coffee", "Report", "Help choosing for espresso, filter or something new to try.", "Which coffee would suit "],
      ["Account", "Your account", "Report", "Your terms, discount, delivery fee and minimums.", "What are our payment terms?"],
      ["Account", "Talk to a person", "Operate", "Brings in someone from our team, in this same chat.", "I'd like to talk to someone about "],
    ];
    const HELP_TONE = { Create: "blue", Edit: "orange", Operate: "green", Report: "purple" };
    // The cafés' guides (written in the back office, Configure › Help Docs), as
    // [group, title, paragraphs]; loaded when the panel opens.
    let HELP_DOCS: [string, string, string[]][] = [];
    let helpDocsIn = false;
    const loadHelpDocs = () =>
      api("/api/trade/help-docs")
        .then((r) => {
          HELP_DOCS = r.docs.map((d) => [d.group, d.title, d.body]);
          helpDocsIn = true;
          if (help.open) drawHelpBody();
        })
        .catch(() => {});
    const help = { switching: false, status: null, open: false, tab: "chats", find: "", mode: "assistant", chat: null, list: null, doc: -1, groups: new Set(), tag: "", timer: 0, poll: null as AbortController | null, busy: false, calls: null, booking: null, docked: false, composing: null as boolean | null, reactOpen: "" };
    // A dot on Chats while something from us is unopened (an announcement, a reply), checked
    // now and every minute while the portal is on screen.
    const helpNew = (list) => document.body.classList.toggle("tp-has-new", (list || []).some((c) => c.unseen));
    const checkHelpNew = () => {
      if (!document.hidden)
        fetch("/api/chat/mine")
          .then((r) => r.json())
          .then((d) => helpNew(d.chats))
          .catch(() => {});
    };
    if (!helpNewTimer) {
      checkHelpNew();
      helpNewTimer = window.setInterval(checkHelpNew, 60000);
    }
    // Who answers a new chat: the last choice on this device (the assistant to start with).
    try {
      if (localStorage.getItem("tp-help-mode") === "person") help.mode = "person";
    } catch {}
    // As the back office's: on a computer a chat opens across the page, or docked beside it; the
    // choice is remembered on this device.
    try {
      help.docked = localStorage.getItem("tp-help-docked") === "1";
    } catch {}
    // Book a Call: the open times and their booked call (server/calls.ts).
    const loadHelpCalls = () =>
      api("/api/trade/calls")
        .then((r) => {
          help.calls = r;
          drawHelp();
        })
        .catch(() => {});
    // Days and times in the page's language (Spanish and Korean pages too); the roastery's clock.
    const CALL_LOCALE = LANG === "es" ? "es-US" : LANG === "ko" ? "ko-KR" : "en-US";
    const callTime = (t) => {
      const [h, m] = t.split(":").map(Number);
      if (LANG !== "en") return new Date(Date.UTC(2026, 0, 1, h, m)).toLocaleTimeString(CALL_LOCALE, { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
      return `${h % 12 || 12}:${String(m).padStart(2, "0")}${h >= 12 ? "pm" : "am"}`;
    };
    const ordinal = (n) => (LANG !== "en" ? String(n) : `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][n % 10] || "th"}`);
    const callDayLabel = (day) => new Date(`${day}T12:00:00Z`).toLocaleDateString(CALL_LOCALE, { timeZone: "UTC", weekday: "short", month: "short", day: "numeric" });
    // Peasy's: the month with the open days filled in, then the day's times, then a note and Book.
    function callHtml() {
      const c = help.calls;
      const mine = c?.mine?.[0];
      const head = `<header class="tp-help-head is-chat"><button type="button" class="tp-icon-btn" data-help-home aria-label="Chats">${TP_ICON.back}</button><strong>Book a Call</strong><button type="button" class="tp-icon-btn" data-help-close aria-label="Close">${TP_ICON.close}</button></header>`;
      if (!c) return `${head}<p class="tp-help-none">Loading…</p>`;
      if (mine)
        return `${head}<div class="tp-call-done">${TP_ICON.calendar}<p><strong>You're booked</strong></p><p>${esc(callDayLabel(mine.day))}, ${esc(callTime(mine.time))} (${esc(tr("Pacific time"))}), ${mine.minutes} ${esc(tr("minutes"))}.</p>${mine.join ? `<a class="button tp-call-join" href="${esc(mine.join)}" target="_blank" rel="noopener">${esc(tr("Join on"))} ${esc(mine.joinWith)}</a>` : `<p>${esc(tr("We'll call you on"))} ${esc(mine.phone)}.</p>`}<button type="button" class="tp-btn" data-call-cancel="${esc(mine.id)}">Cancel Call</button></div>`;
      if (!c.days.length) return `${head}<p class="tp-help-none">No times open right now. Ask a person instead and we'll find one.</p>`;
      const b = help.booking;
      const open = new Map(c.days.map((d) => [d.day, d.times]));
      const first = new Date(`${b.month}-01T12:00:00Z`);
      const lead = (first.getUTCDay() + 6) % 7; // Monday first
      const inMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
      const months = [...new Set(c.days.map((d) => d.day.slice(0, 7)))];
      const at = months.indexOf(b.month);
      const cells = [...Array(lead).fill(`<span></span>`), ...Array.from({ length: inMonth }, (_, i) => {
        const day = `${b.month}-${String(i + 1).padStart(2, "0")}`;
        return open.has(day) ? `<button type="button" class="tp-cal-day is-open" data-call-day="${day}" aria-pressed="${b.day === day}">${i + 1}</button>` : `<span class="tp-cal-day">${i + 1}</span>`;
      })].join("");
      const monthName = first.toLocaleDateString(CALL_LOCALE, { timeZone: "UTC", month: "long" });
      // Monday first, in the page's language.
      const weekdays = Array.from({ length: 7 }, (_, i) => new Date(Date.UTC(2026, 0, 5 + i)).toLocaleDateString(CALL_LOCALE, { timeZone: "UTC", weekday: "short" }).replace(".", "").toUpperCase());
      const picked = new Date(`${b.day}T12:00:00Z`);
      return `${head}<div class="tp-call">
          <div class="tp-cal-head"><strong>${esc(monthName)} <span>${first.getUTCFullYear()}</span></strong><span><button type="button" class="tp-icon-btn" data-call-month="-1" aria-label="Earlier month" ${at > 0 ? "" : "disabled"}>${TP_ICON.back}</button><button type="button" class="tp-icon-btn" data-call-month="1" aria-label="Later month" ${at < months.length - 1 ? "" : "disabled"}>${TP_ICON.right}</button></span></div>
          <div class="tp-cal">${weekdays.map((d) => `<span class="tp-cal-wd" translate="no">${esc(d)}</span>`).join("")}${cells}</div>
          <p class="tp-call-when" translate="no"><strong>${esc(picked.toLocaleDateString(CALL_LOCALE, { timeZone: "UTC", weekday: "short" }))}</strong> ${ordinal(picked.getUTCDate())} <span>${esc(tr("Pacific time"))} · ${c.minutes} ${esc(tr("minutes"))}</span></p>
          <div class="tp-call-times">${((open.get(b.day) || []) as string[]).map((t) => `<button type="button" data-call-time="${t}" aria-pressed="${b.time === t}">${callTime(t)}</button>`).join("")}</div>
          ${
            b.time
              ? `<div class="tp-call-book"><label class="tp-call-note"><span>Number to call</span><input type="tel" data-call-phone autocomplete="tel" inputmode="tel" value="${esc(b.phone ?? a.phone ?? "")}" required></label><label class="tp-call-note"><span>What would you like to talk about?</span><textarea data-call-note rows="2" maxlength="1000">${esc(b.note || "")}</textarea></label><p class="tp-help-error" data-call-error role="alert"></p><button type="button" class="button" data-call-book translate="no">${esc(tr("Book"))} ${callTime(b.time)}</button></div>`
              : ""
          }
        </div>`;
    }
    function startBooking() {
      const c = help.calls;
      const first = c?.days?.[0]?.day || "";
      help.booking = { month: first.slice(0, 7), day: first, time: "", note: "" };
      help.chat = null;
      drawHelp();
    }
    const helpRing = () => {
      document.body.classList.toggle("tp-help-on", help.open && help.docked);
      document.body.classList.toggle("tp-help-full", help.open && !help.docked);
    };
    const dockBtn = () => `<button type="button" class="tp-icon-btn tp-help-dock" data-help-dock aria-label="${help.docked ? "Open across the page" : "Dock beside the page"}" title="${help.docked ? "Open across the page" : "Dock beside the page"}">${help.docked ? TP_ICON.wide : TP_ICON.panel}</button>`;
    const loadHelpChats = () =>
      fetch("/api/chat/mine")
        .then((r) => r.json())
        .then((d) => {
          help.list = d.chats || [];
          helpNew(help.list);
          // No chats yet: straight to writing one.
          if (!help.list.length && help.composing === null) help.composing = true;
          drawHelp();
        })
        .catch(() => {
          help.list = [];
          drawHelp();
        });
    const helpMatches = () => {
      const q = help.find.trim().toLowerCase();
      const has = (t) => !q || t.toLowerCase().includes(q);
      return {
        chats: (help.list || []).filter((c) => has(`${c.title} ${c.preview}`)),
        skills: HELP_SKILLS.map((x, i) => ({ x, i })).filter(({ x }) => (!help.tag || x[2] === help.tag) && has(`${x[1]} ${x[3]}`)),
        docs: HELP_DOCS.map((d, i) => ({ d, i })).filter(({ d }) => has(`${d[1]} ${d[2].join(" ")}`)),
      };
    };
    const helpAgo = (iso) => {
      const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
      return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
    };
    // Writing in a chat: its own key goes along (as the site's chat window does).
    const chatPost = async (id, token, body) => {
      const res = await fetch(`/api/chat/${id}`, { method: "POST", headers: { "X-Chat-Token": token, "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
      return data;
    };
    const helpCount = (n) => (help.find.trim() ? `<span class="tp-help-n">${n > 9 ? "9+" : n}</span>` : "");
    function helpBody() {
      const m = helpMatches();
      const q = help.find.trim();
      if (help.tab === "chats") {
        if (help.list === null) return `<p class="tp-help-none">Loading…</p>`;
        const call = help.calls?.mine?.[0];
        const callRow = call && !q ? `<button type="button" class="tp-help-row is-call" data-help-mode="call">${TP_ICON.calendar}<span>${esc(tr("Call"))} ${esc(callDayLabel(call.day))}, ${esc(callTime(call.time))}</span><em class="tp-help-esc is-call">Booked</em></button>` : "";
        return callRow + (m.chats.length
          ? m.chats.map((c) => `<button type="button" class="tp-help-row" data-help-chat="${esc(c.id)}"><span>${esc(String(c.title || c.preview || "Chat").replace(`${a.business}: `, ""))}</span><small>${TP_ICON.chat}${c.count}</small>${c.unseen ? `<i class="tp-help-new-dot" aria-label="${esc(tr("New"))}"></i>` : ""}${c.person && !c.fromEmail ? `<em class="tp-help-esc${c.lastFrom === "customer" ? "" : " is-replied"}">${c.lastFrom === "customer" ? "Waiting for Us" : "Replied"}</em>` : ""}<small>${esc(helpAgo(c.at))}</small></button>`).join("")
          : q ? (callRow ? "" : `<p class="tp-help-none">No chats match</p>`) : callRow ? "" : `<p class="tp-help-none">No chats yet</p>`);
      }
      if (help.tab === "skills") {
        const groups = [...new Set(m.skills.map(({ x }) => x[0]))];
        return `<div class="tp-help-tags">${Object.keys(HELP_TONE).map((t) => `<button type="button" class="tp-tag is-${HELP_TONE[t]}" data-help-tag="${t}" aria-pressed="${help.tag === t}">${t}</button>`).join("")}</div>
          ${
            groups.length
              ? groups
                  .map((g) => {
                    const list = m.skills.filter(({ x }) => x[0] === g);
                    const open = q || help.tag || help.groups.has(g);
                    return `<section class="tp-help-group${open ? " is-open" : ""}"><button type="button" class="tp-help-group-head" data-help-group="${esc(g)}" aria-expanded="${Boolean(open)}">${TP_ICON.right}<strong>${esc(g)}</strong><span class="tp-help-count">${list.length}</span></button>
                    ${open ? list.map(({ x, i }) => `<div class="tp-help-skill"><div><p><strong>${esc(x[1])}</strong><span class="tp-tag is-${HELP_TONE[x[2]]}">${x[2]}</span></p><small>${esc(x[3])}</small></div><button type="button" class="tp-icon-btn" data-help-skill="${i}" aria-label="${esc(x[1])}" title="${esc(x[1])}">${TP_ICON.chatPlus}</button></div>`).join("") : ""}</section>`;
                  })
                  .join("")
              : `<p class="tp-help-none">No skills match</p>`
          }`;
      }
      if (!helpDocsIn) return `<p class="tp-help-none">Loading…</p>`;
      const doc = HELP_DOCS[help.doc];
      if (doc) return `<article class="tp-help-doc"><button type="button" class="tp-help-doc-back" data-help-doc="-1">${TP_ICON.back}<span>Help Docs</span></button><h3>${esc(doc[1])}</h3>${doc[2].map((t) => `<p>${esc(t)}</p>`).join("")}</article>`;
      const groups = [...new Set(m.docs.map(({ d }) => d[0]))];
      return groups.length
        ? groups.map((g) => `<p class="tp-help-label">${esc(g)}</p>${m.docs.filter(({ d }) => d[0] === g).map(({ d, i }) => `<button type="button" class="tp-help-row is-doc" data-help-doc="${i}">${TP_ICON.doc}<span>${esc(d[1])}</span></button>`).join("")}`).join("")
        : `<p class="tp-help-none">No help docs match</p>`;
    }
    // The first time: a hello, what the panel's for, and a few taps to start (Peasy's welcome).
    const helpWelcome = () => {
      const starts = [data.usual?.lines?.length && "Order my usual", "What do we owe right now?", "Where's my latest order?", "Talk to a person"].filter(Boolean);
      return `<div class="tp-help-welcome"><div class="tp-help-msg"><p>${esc(tr("Hi"))}, ${esc(a.contactName || a.business)}.</p><p>${esc(tr("Ask here about ordering, invoices, deliveries or your account. The assistant answers straight away, and our team is a tap away."))}</p><div class="tp-help-replies">${starts.map((t) => `<button type="button" data-help-start="${esc(t)}">${esc(tr(t))}</button>`).join("")}</div></div></div>`;
    };
    // A reply's text: paragraphs, bullet lists, **bold** and links.
    const helpText = (t) =>
      esc(String(t || ""))
        .split(/\n{2,}/)
        .map((p) => {
          const lines = p.split("\n");
          const inline = (x) => x.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(https?:\/\/[^\s<]+[^\s<.,)])/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
          return lines.every((l) => /^\s*[-•*] /.test(l)) ? `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-•*] /, ""))}</li>`).join("")}</ul>` : `<p>${lines.map(inline).join("<br>")}</p>`;
        })
        .join("");
    // A product the assistant suggests: its name and notes, and Open (its row on Products).
    const helpCard = (card) => {
      const p = data.prices.find((x) => x.id === card.id) || (data.teas || []).find((x) => x.id === card.id);
      return p ? `<div class="tp-help-card"><span class="trade-swatch" style="background:${esc(p.color)}"></span><span><strong>${esc(p.name)}</strong><small>${esc(p.notes || p.blend || "")}</small></span><button type="button" class="tp-btn" data-help-product="${esc(p.id)}">Open</button></div>` : "";
    };
    const helpSecs = (ms) => (ms < 60000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`);
    // Orders and invoices an answer names: a button to each (the back office's Open MF-…).
    const helpOpens = (text) => {
      const refs = [...new Set(String(text || "").match(/\bAS-[A-Z0-9]{4,8}\b/g) || [])].filter((r) => data.orders.some((o) => o.number === r)).slice(0, 4);
      return refs.length ? `<div class="tp-help-opens">${refs.map((r) => `<button type="button" class="tp-help-open" data-help-open-ref="${esc(r)}">${esc(tr("Open"))}<span translate="no">${esc(r)}</span>${TP_ICON.arrow}</button>`).join("")}</div>` : "";
    };
    // Back-to-back answers from the assistant (or one person) read as one reply.
    const helpTurns = (msgs) => {
      const turns = [];
      for (const m of msgs) {
        const prev = turns[turns.length - 1];
        if (m.from !== "customer" && prev && prev.from === m.from && (m.from === "assistant" || prev.msgs[0].by?.name === m.by?.name)) prev.msgs.push(m);
        else turns.push({ from: m.from, msgs: [m] });
      }
      return turns;
    };
    // When a message was sent: the time today, else the day and time.
    const helpWhen = (iso) => {
      const d = new Date(iso);
      const lang = document.documentElement.lang || "en";
      const time = d.toLocaleTimeString(lang, { hour: "numeric", minute: "2-digit" });
      return d.toDateString() === new Date().toDateString() ? time : `${d.toLocaleDateString(lang, { month: "short", day: "numeric" })}, ${time}`;
    };
    function helpThread() {
      const c = help.chat;
      const msgs = (c.messages || []).filter((x) => (x.text || x.cards?.length) && !isReaction(x));
      const reacts = chatReactions(c.messages || []);
      // A file the team sent: the photo itself, or the PDF's name (opened from the conversation).
      const fileUrl = (f) => `/api/chat/${c.id}/files/${encodeURIComponent(f.id)}?t=${encodeURIComponent(c.token)}`;
      const helpFiles = (x) => ((x.files || []).length ? `<div class="tp-help-files">${x.files.map((f) => (f.kind === "image" ? `<a href="${esc(fileUrl(f))}" target="_blank" rel="noopener"><img src="${esc(fileUrl(f))}" alt="${esc(f.name || "Photo")}" loading="lazy"></a>` : `<a class="tp-help-file" href="${esc(fileUrl(f))}" target="_blank" rel="noopener">${esc(f.name || "PDF")}</a>`)).join("")}</div>` : "");
      // One message from the team: unsent, a poll, files, or words (tap them for a reaction).
      const teamMsg = (x) => {
        if (partOf(x, "unsent")) return `<p class="tp-help-at">${esc(x.by?.name || SITE.name)} ${esc(tr("unsent a message"))}</p>`;
        const cardOnly = partOf(x, "card") && /^Order MF-[A-Z0-9]+$/.test(x.text || "");
        const said = partOf(x, "poll") ? chatPollHtml(x) : cardOnly || (x.files?.length && /^Sent (an?|\d+) [\w ]+\.$/.test(x.text || "")) ? "" : x.text ? `<div class="tp-help-bubble" data-react-open="${esc(x.id)}">${helpText(x.text)}</div>` : "";
        return `${helpFiles(x)}${said}${chatReactsHtml(reacts.get(x.id))}${partOf(x, "edited") ? `<small class="chat-edited">${esc(tr("Edited"))}</small>` : ""}${help.reactOpen === x.id ? chatReactPick(x.id) : ""}`;
      };
      const turns = helpTurns(msgs);
      const last = turns.length - 1;
      const lastMine = [...msgs].reverse().find((x) => x.from === "customer");
      // An order a message names: a card with its status, total and day; it changes as the order
      // does (the chat's updates carry it). Tap to open the order.
      // Each order's card shows once, under the latest message that names it.
      const latest = new Map();
      for (const x of msgs) for (const n of String(x.text || "").match(/\bAS-[A-Z0-9]{4,12}\b/g) || []) latest.set(n, x.id);
      const helpOrders = (text, ids = []) => {
        const refs = [...new Set(String(text || "").match(/\bAS-[A-Z0-9]{4,12}\b/g) || [])].filter((n) => ids.includes(latest.get(n))).slice(0, 3);
        const cards = refs
          .map((n) => (c.orders || []).find((o) => o.number === n) || data.orders.find((o) => o.number === n))
          .filter(Boolean)
          .map((o) => `<button type="button" class="tp-help-order" data-help-open-ref="${esc(o.number)}"><span class="tp-help-order-top"><strong translate="no">${esc(o.number)}</strong><span>${money(o.total)}</span></span><span class="tp-line"><i class="tp-ring" style="--tone:var(--st-${toneOf(o)})" aria-hidden="true"></i><span>${esc(tr(o.state === "cancelled" ? "Cancelled" : STATUS[o.status] || o.status))}</span>&nbsp;· ${esc(shortDate(o.placedAt))}</span></button>`)
          .join("");
        return cards ? `<div class="tp-help-orders">${cards}</div>` : "";
      };
      // Quick replies under the last message (while nothing's being written).
      const quick = (i, end) => (i === last && end.replies?.length && !c.typing && !c.draft ? `<div class="tp-help-replies">${end.replies.map((r) => `<button type="button" data-help-reply>${esc(r)}</button>`).join("")}</div>` : "");
      return `<div class="tp-help-thread" data-help-thread>${turns
        .map((t, i) => {
          // Messages, as a phone shows them: theirs on the right in blue, each its own bubble; the
          // time under the last of a run (a new run after a 15-minute gap).
          if (t.from === "customer") {
            const x = t.msgs[0];
            const next = turns[i + 1];
            const runEnds = !next || next.from !== "customer" || Date.parse(next.msgs[0].at) - Date.parse(x.at) > 15 * 60000;
            // Under their latest message, as Messages does: "Read 12:18 AM" once the team has opened it.
            const read = x === lastMine && c.teamReadAt && c.teamReadAt >= x.at ? ` · ${esc(tr("Read"))} ${esc(helpWhen(c.teamReadAt).split(", ").pop())}` : "";
            // A café's chat is shared: a teammate's message says who wrote it (theirs don't).
            const by = x.author && !x.author.mine ? x.author.name : "";
            const prev = turns[i - 1];
            const named = by && !(prev?.from === "customer" && prev.msgs[0].author?.name === by) ? `<p class="tp-help-by">${esc(by)}</p>` : "";
            if (partOf(x, "unsent")) return `<div class="tp-help-msg is-me"><p class="tp-help-at">${esc(by || tr("You"))} ${esc(tr("unsent a message"))}</p></div>`;
            return `<div class="tp-help-msg is-me">${named}<div class="tp-help-bubble">${helpText(x.text)}</div>${chatReactsHtml(reacts.get(x.id))}${(runEnds || read) && x.at ? `<p class="tp-help-at">${esc(helpWhen(x.at))}${read}</p>` : ""}${helpOrders(x.text, [x.id])}</div>`;
          }
          const end = t.msgs[t.msgs.length - 1];
          // A person on the team: who it is, then each message in its own bubble, the time under them.
          if (t.from === "staff") {
            const cards = t.msgs.flatMap((x) => (x.cards || []).filter((k) => k.type === "product").map(helpCard)).join("");
            return `<div class="tp-help-msg is-them is-person${i === last ? " is-last" : ""}" data-help-turn="${i}"><p class="tp-help-by">${esc(t.msgs[0].by?.name || SITE.name)}</p>${t.msgs.map(teamMsg).join("")}${cards}${helpOrders(t.msgs.map((x) => x.text).join(" "), t.msgs.map((x) => x.id)) || helpOpens(t.msgs.map((x) => x.text).join(" "))}${end.at ? `<p class="tp-help-at">${esc(helpWhen(end.at))}</p>` : ""}${quick(i, end)}</div>`;
          }
          const text = t.msgs.map((x) => x.text).filter(Boolean).join("\n\n");
          const asked = turns[i - 1]?.from === "customer" ? turns[i - 1].msgs[turns[i - 1].msgs.length - 1] : null;
          const took = asked?.at && t.msgs[0].at ? Date.parse(t.msgs[0].at) - Date.parse(asked.at) : NaN;
          const said = t.msgs.find((x) => x.feedback)?.feedback;
          const replies = quick(i, end);
          const tools =
            t.from === "assistant" && end.id
              ? `<div class="tp-help-tools">
                  <button type="button" class="tp-help-rate is-good${said === "helpful" ? " is-on" : ""}" data-help-helpful="${esc(end.id)}" ${said ? "disabled" : ""}>${esc(tr(said === "helpful" ? "Thanks for telling us" : "Helpful, thanks"))}</button>
                  <button type="button" class="tp-help-rate is-bad${said === "feedback" ? " is-on" : ""}" data-help-feedback="${esc(end.id)}" ${said ? "disabled" : ""}>${esc(tr(said === "feedback" ? "Feedback sent" : "Leave feedback…"))}</button>
                  <button type="button" class="tp-icon-btn" data-help-copy="${i}" aria-label="${esc(tr("Copy"))}" title="${esc(tr("Copy"))}">${TP_ICON.copy}</button>
                </div>`
              : "";
          return `<div class="tp-help-msg is-them${i === last ? " is-last" : ""}" data-help-turn="${i}">${t.from === "assistant" && took >= 0 && took < 600000 ? `<p class="tp-help-took">${esc(tr("Thought for"))} ${helpSecs(took)}</p>` : ""}${t.from === "staff" && t.msgs[0].by?.name ? `<p class="tp-help-by">${esc(t.msgs[0].by.name)}</p>` : ""}${text ? `<div class="tp-help-bubble">${helpText(text)}</div>` : ""}${t.msgs.flatMap((x) => (x.cards || []).filter((k) => k.type === "product").map(helpCard)).join("")}${helpOrders(text, t.msgs.map((x) => x.id)) || helpOpens(text)}${replies}${tools}</div>`;
        })
        .join("")}${c.draft ? `<div class="tp-help-msg is-them is-draft"><div class="tp-help-bubble" data-help-draft>${helpText(c.draft)}</div></div>` : c.typing ? `<div class="tp-help-msg is-them is-person">${c.typingName ? `<p class="tp-help-by">${esc(c.typingName)}</p>` : ""}<div class="tp-help-bubble is-typing" aria-label="${esc(c.typingName ? `${c.typingName} is writing` : "Writing")}"><i></i><i></i><i></i></div></div>` : ""}</div>`;
    }
    function helpHtml() {
      if (help.booking) return callHtml();
      if (help.chat) {
        const c = help.chat;
        const others = (help.list || []).filter((x) => x.id !== c.id).slice(0, 8);
        return `<header class="tp-help-head is-chat"><button type="button" class="tp-icon-btn" data-help-home aria-label="Chats">${TP_ICON.back}</button><button type="button" class="tp-help-title" data-help-switch aria-expanded="${Boolean(help.switching)}"><strong>${esc(c.title || "New chat")}</strong>${TP_ICON.chevron}</button><span class="tp-help-head-end">${dockBtn()}<button type="button" class="tp-icon-btn" data-help-close aria-label="Close">${TP_ICON.close}</button></span></header>
          ${help.switching ? `<div class="tp-help-switch">${others.map((x) => `<button type="button" data-help-chat="${esc(x.id)}"><span>${esc(String(x.title || x.preview || "Chat").replace(`${a.business}: `, ""))}</span><small>${esc(helpAgo(x.at))}</small></button>`).join("")}<button type="button" class="is-new" data-help-new>${TP_ICON.chatPlus}<span>New Chat</span></button></div>` : ""}
          ${helpThread()}
          <div class="tp-help-foot">
            ${c.agent ? `<button type="button" class="tp-help-human" data-help-person>Talk to a person instead</button>` : ""}
            ${helpCompose(c.agent ? "Ask a follow up" : "Message")}
          </div>`;
      }
      // A new chat: who answers it (quietly, beside the box), Book a Call, and the box.
      if (help.composing) {
        const modes = [...(help.status?.assistant === false ? [] : [["assistant", TP_ICON.spark, "Assistant"]]), ["person", TP_ICON.person, "Person"]];
        return `<header class="tp-help-head is-chat"><button type="button" class="tp-icon-btn" data-help-home aria-label="Chats">${TP_ICON.back}</button><strong class="tp-help-title">New Chat</strong><span class="tp-help-head-end">${dockBtn()}<button type="button" class="tp-icon-btn" data-help-close aria-label="Close">${TP_ICON.close}</button></span></header>
          <div class="tp-help-thread">${helpWelcome()}</div>
          <div class="tp-help-foot">
            <div class="tp-help-who"><div class="tp-seg" role="group" aria-label="Who answers">${modes.map(([v, ic, label]) => `<button type="button" data-help-mode="${v}" aria-pressed="${help.mode === v}">${ic}<span>${label}</span></button>`).join("")}</div>${help.calls?.on ? `<button type="button" class="tp-btn" data-help-mode="call">${TP_ICON.calendar}<span>Book a Call</span></button>` : ""}</div>
            ${helpCompose(help.mode === "person" ? "Ask our team" : "Ask anything")}
          </div>`;
      }
      const m = helpMatches();
      return `<header class="tp-help-head"><nav class="tp-help-tabs" role="tablist">${[["chats", "Chats", m.chats.length], ["skills", "Skills", m.skills.length], ["docs", "Help Docs", m.docs.length]].map(([t, label, n]) => `<button type="button" role="tab" data-help-tab="${t}" aria-selected="${help.tab === t}">${label}${helpCount(n)}</button>`).join("")}</nav><span class="tp-help-head-end">${dockBtn()}<button type="button" class="tp-icon-btn" data-help-close aria-label="Close">${TP_ICON.close}</button></span></header>
        <div class="tp-help-find"><label class="tp-find">${TP_ICON.search}<input type="search" data-help-find placeholder="${esc(tr("Search…"))}" value="${esc(help.find)}" aria-label="Search"></label><button type="button" class="button tp-help-new" data-help-new>New Chat</button></div>
        <div class="tp-help-body" data-help-body>${helpBody()}</div>`;
    }
    const helpCompose = (ph) => `<form class="tp-help-compose" data-help-form><textarea name="text" rows="1" maxlength="5000" placeholder="${esc(tr(ph))}" aria-label="${esc(tr(ph))}"></textarea><p class="tp-help-error" data-help-error role="alert"></p><button type="submit" class="tp-help-send" aria-label="Send">${TP_ICON.up}</button></form>`;
    function drawHelp(keepFocus = false) {
      let box = $("[data-tp-help]");
      if (!help.open) {
        box?.remove();
        helpRing();
        return;
      }
      if (!box) {
        document.body.insertAdjacentElement("beforeend", Object.assign(document.createElement("aside"), { className: "tp-help" }));
        box = $("aside.tp-help");
        box.dataset.tpHelp = "";
        box.setAttribute("aria-label", "Help");
        wireHelp(box);
      }
      const typed = $("[data-help-form] textarea", box)?.value || "";
      // A redraw (the chat status arriving, a new message) keeps the cursor where it was.
      const wasTyping = document.activeElement?.matches?.("[data-help-form] textarea") && box.contains(document.activeElement);
      box.innerHTML = helpHtml();
      const ta = $("[data-help-form] textarea", box);
      if (ta && typed) ta.value = typed;
      const thread = $("[data-help-thread]", box);
      if (thread) thread.scrollTop = thread.scrollHeight;
      if (keepFocus || wasTyping) ta?.focus();
      helpRing();
    }
    const drawHelpBody = () => {
      const b = $("[data-help-body]");
      if (b) b.innerHTML = helpBody();
      $$("[data-help-tab]").forEach((t) => {
        const m = helpMatches();
        const n = { chats: m.chats.length, skills: m.skills.length, docs: m.docs.length }[t.dataset.helpTab];
        t.innerHTML = `${t.textContent.replace(/\d+\+?$/, "")}${helpCount(n)}`;
      });
    };
    function openHelp({ ask = "", tab = "" } = {}) {
      help.open = true;
      if (tab) help.tab = tab;
      if (help.list === null) loadHelpChats();
      if (help.calls === null) loadHelpCalls();
      if (!helpDocsIn) loadHelpDocs();
      // Whether the assistant answers chats (it can be switched off in the back office), and
      // whether the team is away: the choices say who'll actually reply.
      if (help.status === null)
        fetch("/api/chat/status")
          .then((r) => r.json())
          .then((st) => {
            help.status = st;
            if (!st.assistant && help.mode === "assistant") help.mode = "person";
            drawHelp();
          })
          .catch(() => {});
      drawHelp(true);
      if (ask) helpSend(ask);
    }
    function closeHelp() {
      help.open = false;
      clearTimeout(help.timer);
      help.poll?.abort();
      drawHelp();
    }
    // Opening a chat: a key for it (it's theirs, signed in), then its messages.
    async function openHelpChat(id) {
      try {
        const r = await api(`/api/chat/${id}/join`, { method: "POST", body: {} });
        help.chat = { id, token: r.chat.token, title: (help.list || []).find((c) => c.id === id)?.title || "", messages: r.chat.messages, agent: Boolean(r.chat.agent), typing: Boolean(r.chat.typing), teamReadAt: r.chat.teamReadAt || "", orders: r.chat.orders || [] };
        drawHelp(true);
        watchHelp();
      } catch (err) {
        toast(err.message);
      }
    }
    // While a chat is open: new replies (and the assistant writing) every few seconds.
    // The open chat, kept current: the server holds each request until something changes (a
    // reply, or the assistant's reply as it's written), so it shows at once.
    function watchHelp() {
      clearTimeout(help.timer);
      help.poll?.abort();
      if (!help.open || !help.chat) return;
      const c = help.chat;
      const poll = (help.poll = new AbortController());
      // seen=1 while the chat is on screen: what the team sent is read (they see "Read").
      const q = new URLSearchParams({ ...(c.sig && { wait: c.sig }), ...(document.visibilityState === "visible" && { seen: "1" }) });
      fetch(`/api/chat/${c.id}?${q}`, { headers: { "X-Chat-Token": c.token }, signal: poll.signal })
        .then((x) => x.json())
        .then((r) => {
          if (help.chat !== c || !r.messages) return;
          const ordersSig = (list) => (list || []).map((o) => `${o.number}:${o.status}:${o.state}`).join(",");
          const changed = JSON.stringify(r.messages) !== JSON.stringify(c.messages) || Boolean(r.typing) !== c.typing || (r.typingName || "") !== (c.typingName || "") || Boolean(r.agent) !== c.agent || Boolean(r.draft) !== Boolean(c.draft) || (r.teamReadAt || "") !== (c.teamReadAt || "") || ordersSig(r.orders) !== ordersSig(c.orders);
          const draftOnly = !changed && r.draft !== c.draft;
          Object.assign(c, { messages: r.messages, typing: Boolean(r.typing), typingName: r.typingName || "", agent: Boolean(r.agent), draft: r.draft || "", sig: r.sig || "", teamReadAt: r.teamReadAt || "", orders: r.orders || [] });
          const box = $("[data-help-draft]");
          if (draftOnly && box) {
            box.innerHTML = helpText(c.draft);
            box.scrollIntoView({ block: "end" });
          } else if (changed) drawHelp(document.activeElement?.closest?.("[data-help-form]") != null);
          watchHelp();
        })
        .catch((error) => {
          if (error?.name === "AbortError") return;
          help.timer = setTimeout(watchHelp, 3000);
        });
    }
    // Back on the page with a chat open: look again now (so what came in is marked read).
    document.addEventListener("visibilitychange", () => document.visibilityState === "visible" && help.open && help.chat && watchHelp());
    // Going somewhere from an answer across the page: the chat docks beside it (this time only).
    const helpBeside = () => {
      if (help.docked || innerWidth <= 760) return;
      help.docked = true;
      drawHelp();
    };
    async function helpFeedback(id, helpful, note = "") {
      const c = help.chat;
      if (!c) return;
      const res = await fetch(`/api/chat/${c.id}/feedback`, { method: "POST", headers: { "X-Chat-Token": c.token, "Content-Type": "application/json" }, body: JSON.stringify({ message: id, helpful, note }) });
      const r = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(r.error || "Something went wrong. Try again.");
      if (help.chat === c) {
        c.messages = r.messages;
        drawHelp();
      }
    }
    function helpFeedbackForm(id) {
      $("[data-help-fb]")?.remove();
      document.body.insertAdjacentHTML(
        "beforeend",
        `<dialog class="cal-dialog tp-help-fb" data-help-fb aria-labelledby="tp-help-fb-title"><form class="cal-dialog-inner" method="dialog"><h2 id="tp-help-fb-title">${esc(tr("Leave Feedback"))}</h2><label class="tp-call-note"><span>${esc(tr("What should it have said or done?"))}</span><textarea name="note" rows="4" required maxlength="2000"></textarea></label><p class="tp-help-error" data-help-fb-error role="alert"></p><div class="tp-help-fb-actions"><button type="button" class="tp-btn" data-help-fb-cancel>${esc(tr("Cancel"))}</button><button type="submit" class="button">${esc(tr("Send"))}</button></div></form></dialog>`
      );
      const dlg = $("[data-help-fb]");
      dlg.addEventListener("close", () => dlg.remove());
      dlg.addEventListener("click", (e) => (e.target === dlg || e.target.closest("[data-help-fb-cancel]")) && dlg.close());
      dlg.addEventListener("submit", async (e) => {
        e.preventDefault();
        const send = $("button[type=submit]", dlg);
        send.disabled = true;
        try {
          await helpFeedback(id, false, $("textarea", dlg).value);
          dlg.close();
          toast(tr("Thanks. It's kept to make the assistant better."));
        } catch (err) {
          send.disabled = false;
          $("[data-help-fb-error]", dlg).textContent = err.message;
        }
      });
      dlg.showModal();
      $("textarea", dlg).focus();
    }
    async function helpSend(text, { person = false } = {}) {
      if (help.busy) return;
      help.busy = true;
      const err = $("[data-help-error]");
      if (err) err.textContent = "";
      try {
        if (help.chat) {
          const c = help.chat;
          if (text) c.messages = [...c.messages, { from: "customer", text }];
          c.typing = c.agent && !person;
          drawHelp(true);
          const r = await chatPost(c.id, c.token, { text, ...(person && { person: true }) });
          Object.assign(c, { messages: r.messages, typing: Boolean(r.typing), agent: Boolean(r.agent) });
        } else {
          const r = await api("/api/chat", { method: "POST", body: { message: text, ...(help.mode === "person" && { person: true }) } });
          help.chat = { id: r.chat.id, token: r.chat.token, title: text.split("\n")[0].slice(0, 70), messages: r.chat.messages, agent: Boolean(r.chat.agent), typing: Boolean(r.chat.typing), teamReadAt: r.chat.teamReadAt || "", orders: r.chat.orders || [] };
          help.composing = false;
          help.list = null;
          loadHelpChats();
        }
        drawHelp(true);
        watchHelp();
      } catch (e) {
        drawHelp(true);
        const box = $("[data-help-error]");
        if (box) box.textContent = e.message;
      }
      help.busy = false;
    }
    function wireHelp(box) {
      box.addEventListener("input", (e) => {
        if (e.target.matches("[data-help-find]")) {
          help.find = e.target.value;
          drawHelpBody();
        }
        // What's typed for a call stays put when another time is picked.
        if (help.booking && e.target.matches("[data-call-phone]")) help.booking.phone = e.target.value;
        if (help.booking && e.target.matches("[data-call-note]")) help.booking.note = e.target.value;
      });
      box.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && e.target.matches("[data-help-form] textarea")) {
          e.preventDefault();
          e.target.form.requestSubmit();
        }
        if (e.key === "Escape") closeHelp();
      });
      box.addEventListener("submit", (e) => {
        e.preventDefault();
        const ta = $("textarea", e.target);
        const text = ta.value.trim();
        if (!text) return;
        ta.value = "";
        helpSend(text);
      });
      box.addEventListener("click", async (e) => {
        const t = e.target;
        if (t.closest("[data-help-close]")) return closeHelp();
        if (t.closest("[data-help-dock]")) {
          help.docked = !help.docked;
          try {
            localStorage.setItem("tp-help-docked", help.docked ? "1" : "0");
          } catch {}
          return drawHelp();
        }
        const ref = t.closest("[data-help-open-ref]");
        if (ref) {
          const o = data.orders.find((x) => x.number === ref.dataset.helpOpenRef);
          if (!o) return;
          helpBeside();
          return goTo(["due", "overdue", "declined"].includes(o.state) ? "invoice" : "orderview", o.number);
        }
        const copy = t.closest("[data-help-copy]");
        if (copy) {
          const turn = helpTurns((help.chat?.messages || []).filter((x) => x.text || x.cards?.length))[Number(copy.dataset.helpCopy)];
          const text = turn ? turn.msgs.map((x) => x.text).filter(Boolean).join("\n\n") : "";
          navigator.clipboard?.writeText(text).then(() => toast(tr("Copied")), () => {});
          return;
        }
        const good = t.closest("[data-help-helpful]");
        if (good) return helpFeedback(good.dataset.helpHelpful, true).catch((err) => toast(err.message));
        const bad = t.closest("[data-help-feedback]");
        if (bad) return helpFeedbackForm(bad.dataset.helpFeedback);
        if (t.closest("[data-help-home]")) {
          help.composing = false;
          help.chat = null;
          help.booking = null;
          clearTimeout(help.timer);
          help.poll?.abort();
          loadHelpChats();
          return drawHelp(true);
        }
        const tab = t.closest("[data-help-tab]");
        if (tab) {
          help.tab = tab.dataset.helpTab;
          help.doc = -1;
          return drawHelp();
        }
        if (t.closest("[data-help-new]")) {
          help.switching = false;
          help.composing = true;
          help.chat = null;
          help.find = "";
          help.tab = "chats";
          return drawHelp(true);
        }
        const mode = t.closest("[data-help-mode]");
        if (mode?.dataset.helpMode === "call") return startBooking();
        if (mode) {
          help.mode = mode.dataset.helpMode;
          try {
            localStorage.setItem("tp-help-mode", help.mode);
          } catch {}
          return drawHelp(true);
        }
        if (t.closest("[data-help-switch]")) {
          help.switching = !help.switching;
          if (help.switching && help.list === null) loadHelpChats();
          return drawHelp();
        }
        const chat = t.closest("[data-help-chat]");
        if (chat) {
          help.switching = false;
          return openHelpChat(chat.dataset.helpChat);
        }
        // A reaction on one of the team's messages (tap it, then one of the six), and a pick on
        // a poll they sent.
        const reactOpen = t.closest("[data-react-open]");
        if (reactOpen && help.chat && !t.closest("a, button")) {
          help.reactOpen = help.reactOpen === reactOpen.dataset.reactOpen ? "" : reactOpen.dataset.reactOpen;
          return drawHelp();
        }
        const reactPick = t.closest("[data-react]");
        const pollPick = t.closest("[data-poll-choice]");
        if ((reactPick || pollPick) && help.chat) {
          const c = help.chat;
          help.reactOpen = "";
          const body = reactPick ? { react: { message: reactPick.dataset.reactTo, emoji: reactPick.dataset.react } } : { pollAnswer: { message: pollPick.closest("[data-chat-poll]").dataset.chatPoll, choice: pollPick.dataset.pollChoice } };
          return chatPost(c.id, c.token, body)
            .then((r) => {
              if (help.chat !== c) return;
              c.messages = r.messages;
              drawHelp();
            })
            .catch((err) => toast(esc(err.message)));
        }
        const reply = t.closest("[data-help-reply]");
        if (reply) return helpSend(reply.textContent);
        const start = t.closest("[data-help-start]");
        if (start) {
          const what = start.dataset.helpStart;
          if (what === "Talk to a person") help.mode = "person";
          else if (help.status?.assistant !== false) help.mode = "assistant";
          return helpSend(tr(what));
        }
        const prod = t.closest("[data-help-product]");
        if (prod) {
          helpBeside();
          goTo("order");
          const row = $(`[data-item="${CSS.escape(prod.dataset.helpProduct)}"]`, root);
          row?.scrollIntoView({ block: "center" });
          $("[data-qty]", row)?.focus();
          return;
        }
        const b = help.booking;
        const month = t.closest("[data-call-month]");
        if (month && b) {
          const months = [...new Set(help.calls.days.map((d) => d.day.slice(0, 7)))];
          const next = months[months.indexOf(b.month) + Number(month.dataset.callMonth)];
          if (next) Object.assign(b, { month: next, day: help.calls.days.find((d) => d.day.startsWith(next)).day, time: "" });
          return drawHelp();
        }
        const day = t.closest("[data-call-day]");
        if (day && b) {
          Object.assign(b, { day: day.dataset.callDay, time: "" });
          return drawHelp();
        }
        const time = t.closest("[data-call-time]");
        if (time && b) {
          b.time = time.dataset.callTime;
          drawHelp();
          return $("[data-call-book]", box)?.scrollIntoView({ block: "nearest" });
        }
        if (t.closest("[data-call-book]") && b) {
          const go = t.closest("[data-call-book]");
          b.note = $("[data-call-note]", box)?.value || "";
          b.phone = $("[data-call-phone]", box)?.value.trim() || "";
          const e1 = $("[data-call-error]", box);
          if (b.phone.replace(/\D/g, "").length < 7) {
            if (e1) e1.textContent = tr("Add a number we can call you on.");
            $("[data-call-phone]", box)?.focus();
            return;
          }
          go.disabled = true;
          try {
            await api("/api/trade/calls", { method: "POST", body: { day: b.day, time: b.time, note: b.note, phone: b.phone } });
            await loadHelpCalls();
            toast("Call booked. We emailed you the details.");
          } catch (err) {
            go.disabled = false;
            const e2 = $("[data-call-error]", box);
            if (e2) e2.textContent = err.message;
            if (err.status === 409) loadHelpCalls();
          }
          return;
        }
        const cancel = t.closest("[data-call-cancel]");
        if (cancel) {
          if (!confirm(tr("Cancel this call?"))) return;
          try {
            await api(`/api/trade/calls/${cancel.dataset.callCancel}`, { method: "DELETE", body: {} });
            help.booking = null;
            await loadHelpCalls();
            toast("Call cancelled.");
          } catch (err) {
            toast(err.message);
          }
          return;
        }
        const tag = t.closest("[data-help-tag]");
        if (tag) {
          help.tag = help.tag === tag.dataset.helpTag ? "" : tag.dataset.helpTag;
          return drawHelpBody();
        }
        const group = t.closest("[data-help-group]");
        if (group) {
          const g = group.dataset.helpGroup;
          if (help.groups.has(g)) help.groups.delete(g);
          else help.groups.add(g);
          return drawHelpBody();
        }
        const doc = t.closest("[data-help-doc]");
        if (doc) {
          help.doc = Number(doc.dataset.helpDoc);
          return drawHelpBody();
        }
        const skill = t.closest("[data-help-skill]");
        if (skill) {
          help.mode = help.status?.assistant === false ? "person" : "assistant";
          help.chat = null;
          help.tab = "chats";
          help.composing = true;
          drawHelp(true);
          const ta = $("[data-help-form] textarea", box);
          const text = HELP_SKILLS[Number(skill.dataset.helpSkill)][4];
          ta.value = text;
          const gap = text.indexOf("  ");
          const at = gap >= 0 ? gap + 1 : text.length;
          ta.setSelectionRange(at, at);
          return;
        }
        if (t.closest("[data-help-person]")) {
          await helpSend("", { person: true }).catch(() => {});
          return;
        }
      });
    }

    // Going to a page (and an order or invoice on it) from outside the page's own buttons.
    let cameFrom = "";
    const goTo = (t, ref = "") => {
      if (help.open && !help.docked) closeHelp();
      cameFrom = tab;
      tab = t;
      if (t === "orderview") orderNo = ref;
      if (t === "invoice") invoiceNo = ref;
      history.replaceState(null, "", tradeUrl(t, ref));
      render();
      scrollTo({ top: 0 });
    };
    // Search (Ctrl/Cmd+K), as the back office's: pages, products, orders, invoices and a few
    // actions in one list; arrows move, Enter opens.
    function searchItems() {
      const items = [];
      const add = (group, label, sub, run) => items.push({ group, label, sub, run, find: `${label} ${sub}`.toLowerCase() });
      [["home", "Overview"], ["order", "Products"], ["orders", "Orders"], ["balance", "Balance"], ["samples", "Samples"], ["details", "Account"]].forEach(([t, label]) => {
        add("Pages", label, "", () => goTo(t));
        items[items.length - 1].ic = TP_ICON[t];
      });
      add("Actions", "New Order", "", () => goTo("order"));
      if (data.usual?.lines?.length) add("Actions", "Fill Your Usual", "", () => usualSheet());
      if (owed().length) add("Actions", "Pay", money(owed().reduce((n, o) => n + o.total, 0)), () => goTo("balance"));
      add("Actions", "Email Us", "", () => emailUs());
      const pick = (id) => () => {
        goTo("order");
        const row = $(`[data-item="${CSS.escape(id)}"]`, root);
        row?.scrollIntoView({ block: "center" });
        $("[data-qty]", row)?.focus();
      };
      data.prices.forEach((p) => add("Products", p.name, p.notes || "", pick(p.id)));
      (data.teas || []).forEach((t) => add("Products", t.name, [t.blend, t.notes].filter(Boolean).join(" · "), pick(t.id)));
      [...data.orders].sort((x, y) => y.placedAt.localeCompare(x.placedAt)).forEach((o) => {
        add("Orders", o.number, [shortDate(o.placedAt), money(o.total), o.poRef && `PO ${o.poRef}`].filter(Boolean).join(" · "), () => goTo("orderview", o.number));
        if (o.state !== "cancelled") add("Invoices", `Invoice ${o.number}`, STATE[o.state](o), () => goTo("invoice", o.number));
      });
      return items;
    }
    function openSearch() {
      let box = $("[data-tp-palette]");
      if (!box) {
        document.body.insertAdjacentHTML("beforeend", `<div class="tp-palette" data-tp-palette role="dialog" aria-label="Search" hidden><div class="tp-palette-in"><label class="tp-palette-find">${TP_ICON.search}<input type="search" enterkeyhint="go" data-tp-palette-q placeholder="${esc(tr("Search, take action, or ask for help"))}" aria-label="${esc(tr("Search, take action, or ask for help"))}" autocomplete="off"><kbd>Esc</kbd><button type="button" class="tp-icon-btn tp-palette-close" data-tp-palette-close aria-label="Close">${TP_ICON.close}</button></label><div class="tp-palette-list" data-tp-palette-list role="listbox"></div></div></div>`);
        box = $("[data-tp-palette]");
        // Not a popup over a dimmed page (Peasy's): a panel that goes away on Esc or a click
        // anywhere else.
        box.close = () => {
          box.hidden = true;
          document.removeEventListener("pointerdown", box.away, true);
        };
        box.away = (e) => !box.contains(e.target) && !e.target.closest?.("[data-tp-search]") && box.close();
        const input = $("[data-tp-palette-q]", box);
        const list = $("[data-tp-palette-list]", box);
        let shown = [];
        let at = 0;
        const draw = () => {
          const q = input.value.trim().toLowerCase();
          const all = searchItems();
          shown = (q ? all.filter((x) => q.split(/\s+/).every((w) => x.find.includes(w))) : all.filter((x) => x.group === "Pages" || x.group === "Actions")).slice(0, 40);
          // Ask anything (the back office's): the assistant last, beside where it's typed.
          const asked = input.value.trim();
          if (help.status?.assistant !== false || !asked) shown.push({ group: "Assistant", label: asked ? `${tr("Ask")} “${asked}”` : tr("Ask the assistant"), sub: "", ic: TP_ICON.spark, run: () => (asked ? openHelp({ ask: asked }) : openHelp()), find: "" });
          if (asked && help.status?.assistant === false) shown.push({ group: "Assistant", label: `${tr("Ask our team")} “${asked}”`, sub: "", ic: TP_ICON.person, run: () => ((help.mode = "person"), openHelp({ ask: asked })), find: "" });
          at = Math.min(at, Math.max(shown.length - 1, 0));
          let group = "";
          list.innerHTML = shown.length
            ? shown
                .map((x, i) => {
                  const head = x.group !== group ? `<p class="tp-palette-group">${x.group}</p>` : "";
                  group = x.group;
                  return `${head}<button type="button" role="option" data-pi="${i}" aria-selected="${i === at}">${x.ic || PALETTE_IC[x.group] || ""}<span>${esc(x.label)}</span>${x.sub ? `<small>${esc(x.sub)}</small>` : ""}</button>`;
                })
                .join("")
            : `<p class="tp-palette-none">${esc(tr("Nothing matches that."))}</p>`;
          list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
        };
        const run = (i) => {
          const x = shown[i];
          if (!x) return;
          box.close();
          x.run();
        };
        input.addEventListener("input", () => {
          at = 0;
          draw();
        });
        input.addEventListener("keydown", (e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            at = (at + (e.key === "ArrowDown" ? 1 : -1) + shown.length) % Math.max(shown.length, 1);
            draw();
          } else if (e.key === "Enter") {
            e.preventDefault();
            run(at);
          } else if (e.key === "Escape") {
            e.preventDefault();
            box.close();
          }
        });
        $("[data-tp-palette-close]", box).addEventListener("click", (e) => {
          e.preventDefault();
          box.close();
        });
        list.addEventListener("click", (e) => {
          const b = e.target.closest("[data-pi]");
          if (b) run(Number(b.dataset.pi));
        });
        box.draw = draw;
      }
      $("[data-tp-palette-q]", box).value = "";
      box.draw();
      // On a computer it rises out of the sidebar's Ask box (as the back office's): the input
      // where the box is, results stacked above it, the page still in view.
      const anchor = $(".tp-ask-box", root);
      const r = anchor?.offsetParent ? anchor.getBoundingClientRect() : null;
      box.classList.toggle("is-anchored", Boolean(r));
      box.style.left = r ? `${Math.max(8, r.left - 8)}px` : "";
      box.style.bottom = r ? `${Math.max(8, innerHeight - r.bottom - 8)}px` : "";
      box.hidden = false;
      document.addEventListener("pointerdown", box.away, true);
      $("[data-tp-palette-q]", box).focus();
    }
    const PALETTE_IC = { Actions: TP_ICON.plus, Products: TP_ICON.order, Orders: TP_ICON.orders, Invoices: TP_ICON.doc };
    addEventListener("keydown", (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        const box = $("[data-tp-palette]");
        if (box && !box.hidden) box.close();
        else openSearch();
      }
    });

    const backTo = () => (tab === "invoice" ? (cameFrom === "balance" || (cameFrom !== "orders" && cameFrom !== "orderview" && invoiceDue()) ? "balance" : "orders") : "orders");
    const invoiceDue = () => ["due", "overdue", "declined"].includes(data.orders.find((x) => x.number === invoiceNo)?.state);
    // The sidebar (Peasy's): drag its edge to resize it, click it to close it to a rail of icons;
    // remembered on this device.
    const tpStore = (k, v = undefined) => {
      try {
        if (v === undefined) return localStorage.getItem(k);
        localStorage.setItem(k, v);
      } catch {}
      return null;
    };
    const tpSideShut = () => tpStore("tp-side-shut") === "1";
    const tpSideWidth = () => Math.min(360, Math.max(200, Number(tpStore("tp-side-w")) || 240));
    const applyTpSide = () => {
      document.documentElement.style.setProperty("--tp-side", tpSideShut() ? "60px" : `${tpSideWidth()}px`);
      document.body.classList.toggle("tp-side-shut", tpSideShut());
    };
    root.addEventListener("pointerdown", (e) => {
      const edge = e.target.closest?.("[data-tp-edge]");
      if (!edge || e.button !== 0) return;
      e.preventDefault();
      const x0 = e.clientX;
      const w0 = tpSideShut() ? 60 : tpSideWidth();
      let moved = false;
      edge.setPointerCapture(e.pointerId);
      edge.onpointermove = (m) => {
        if (!moved && Math.abs(m.clientX - x0) < 4) return;
        moved = true;
        tpStore("tp-side-w", String(Math.round(Math.min(360, Math.max(200, w0 + m.clientX - x0)))));
        tpStore("tp-side-shut", "0");
        applyTpSide();
      };
      edge.onpointerup = () => {
        edge.onpointermove = edge.onpointerup = null;
        if (!moved) tpStore("tp-side-shut", tpSideShut() ? "0" : "1");
        applyTpSide();
        render();
      };
    });
    applyTpSide();
    const render = () => {
      const unpaid = owed();
      // An app, as the back office (Peasy's): a sidebar with the café and its pages, a slim title
      // strip, then the page. On a phone the pages are a bar along the bottom.
      const on = (t) => (t === "home" ? tab === "home" : t === "order" ? tab === "order" : t === "orders" ? tab === "orders" || tab === "orderview" || (tab === "invoice" && !invoiceDue()) : t === "balance" ? tab === "balance" || (tab === "invoice" && invoiceDue()) : t === "samples" ? tab === "samples" : tab === "details");
      const dot = (t) => (t === "orders" && waitingForMe().length ? `<i class="trade-dot" aria-label="${waitingForMe().length} to approve"></i>` : t === "balance" && unpaid.some((o) => o.state === "overdue" || o.state === "declined") ? `<i class="trade-dot" aria-label="Overdue"></i>` : "");
      const pages = [["home", "Overview"], ["order", "Products"], ["orders", "Orders"], ["balance", "Balance"], ["samples", "Samples"], ["details", "Account"]];
      const shut = tpSideShut();
      const detail = (tab === "orderview" && !wide.matches) || tab === "invoice";
      const nav = pages.map(([t, label]) => `<button type="button" role="tab"${t === "samples" ? ' class="tp-nav-wide"' : ""} data-tab-go="${t}" aria-selected="${on(t)}" ${on(t) ? 'aria-current="page"' : ""}${shut ? ` title="${label}"` : ""}>${TP_ICON[t]}<span>${label}</span>${dot(t)}</button>`).join("");
      root.innerHTML = `
        <div class="tp-shell">
          <aside class="tp-side">
            <button type="button" class="tp-edge" data-tp-edge aria-label="${shut ? "Open the sidebar" : "Close the sidebar"}" title="${shut ? "Open the sidebar" : "Drag to resize, click to close"}"><span>${shut ? TP_ICON.right : TP_ICON.back}</span></button>
            <button type="button" class="tp-brand" data-tp-menu aria-haspopup="true" aria-expanded="false">${tpMark()}<strong>${esc(a.business)}</strong>${TP_ICON.chevron}</button>
            <nav class="tp-nav trade-tabs" role="tablist" aria-label="Wholesale">${nav}</nav>
            <div class="tp-foot">
              <div class="tp-ask">
                <button type="button" class="tp-ask-box" data-tp-search aria-keyshortcuts="Control+K"${shut ? ` title="Ask anything" aria-label="Ask anything"` : ""}>${TP_ICON.help}<span>Ask anything…</span></button>
                <button type="button" class="tp-icon-btn" data-help-open aria-label="Chats" title="Chats">${TP_ICON.chat}</button>
                <button type="button" class="tp-icon-btn${tab === "details" ? " is-on" : ""}" data-tab-go="details" aria-label="Account settings" title="Account settings">${TP_ICON.gear}</button>
              </div>
            </div>
          </aside>
          <div class="tp-main">
            <header class="tp-head">${detail ? `<button type="button" class="tp-icon-btn tp-head-back" data-tab-go="${backTo()}" aria-label="Back">${TP_ICON.back}</button>` : ""}<h1>${detail ? esc(tab === "invoice" ? `Invoice ${invoiceNo}` : `Order ${orderNo}`) : tab === "agreement" ? esc(tr("Agreement")) : pages.find(([t]) => on(t))?.[1] || "Overview"}</h1><span class="tp-head-who">${esc(a.business)}</span><button type="button" class="tp-head-find" data-tp-search aria-label="Ask anything">${TP_ICON.search}</button><button type="button" class="tp-head-search" data-help-open aria-label="Chats">${TP_ICON.chat}</button><button type="button" class="tp-head-out" data-tp-menu aria-haspopup="true" aria-expanded="false" aria-label="${esc(a.business)}">${tpMark()}</button></header>
            <div class="trade-panel">${tab === "orderview" && wide.matches ? `<div class="tp-split"><div class="tp-split-list">${ordersTab()}</div><aside class="tp-record" aria-label="Order ${esc(orderNo)}"><button type="button" class="tp-record-close" data-tab-go="orders" aria-label="Close">×</button>${orderViewTab()}</aside></div>` : tab === "home" ? homeTab() : tab === "order" ? orderTab() : tab === "orders" ? ordersTab() : tab === "balance" ? balanceTab() : tab === "samples" ? samplesTab() : tab === "agreement" ? agreementTab() : tab === "invoice" ? invoiceTab() : tab === "orderview" ? orderViewTab() : detailsTab()}</div>
          </div>
        </div>${payOne ? paySheet() : ""}`;
      const payDlg = $("[data-pay-dialog]", root);
      if (payDlg) {
        payDlg.addEventListener("close", () => {
          if (!payOne) return;
          payOne = "";
          payPick.clear();
          payDlg.remove();
        });
        payDlg.showModal();
      }
      if (tab === "order") {
        refreshSummary();
        // The running total steps aside once the order summary itself is on screen.
        const bar = $("[data-order-bar]", root);
        const box = $("[data-trade-summary]", root);
        if (bar && box && "IntersectionObserver" in window) new IntersectionObserver(([en]) => bar.classList.toggle("is-near", en.isIntersecting), { rootMargin: "0px 0px -80px 0px" }).observe(box);
      }
      // The card form is drawn only when shown; the bank option is set up when picked.
      tradeBank = null;
      if ((tab === "balance" || payOne) && payNew && $("#trade-card", root)) mountTradeCard();
      else if (tradeCard) {
        tradeCard.destroy?.();
        tradeCard = null;
      }
      if ((tab === "balance" || payOne) && picks().length === 1 && !SB()) mountTradeBank(picks()[0].number);
    };

    // The Place Order bar gets its top line only while it's pinned above the tab bar (the order
    // scrolling under it); sitting in place at the end of the order, it's just part of the card.
    let stuckAsk = 0;
    const markStuck = () => {
      cancelAnimationFrame(stuckAsk);
      stuckAsk = requestAnimationFrame(() => {
        // The tab bar's height (phones), so what sits on it (the running total) sits flush.
        const tabs = $(".tp-side", root);
        const tabsH = tabs && getComputedStyle(tabs).position === "fixed" ? tabs.getBoundingClientRect().height : 0;
        if (tabsH) document.documentElement.style.setProperty("--tp-tabs-h", `${Math.round(tabsH)}px`);
        const go = $(".tp-cart-go", root);
        if (!go) return;
        const pinned = getComputedStyle(go).position === "sticky";
        const edge = innerHeight - (parseFloat(getComputedStyle(go).bottom) || 0);
        go.classList.toggle("is-stuck", pinned && go.getBoundingClientRect().bottom >= edge - 1 && go.nextElementSibling?.getBoundingClientRect().top > edge);
      });
    };
    addEventListener("scroll", markStuck, { passive: true });
    addEventListener("resize", markStuck);
    new MutationObserver(markStuck).observe(root, { childList: true, subtree: true });

    const refreshSummary = () => {
      redrawWhere();
      const box = $("[data-trade-summary]", root);
      saveOrder();
      if (!box) return;
      const focused = document.activeElement?.matches?.("[data-trade-summary] [name=notes]");
      box.innerHTML = summary();
      const notes = root.querySelector("[name=notes]");
      growNotes(notes);
      if (focused) notes?.focus();
      // Each item: highlighted once picked; the phone's running total.
      $$("[data-item]", root).forEach((li) => li.classList.toggle("is-picked", picked(li.dataset.item)));
      $$(".trade-stepper", root).forEach((st) => $("[data-qty]", st) && st.classList.toggle("is-on", (qty[$("[data-qty]", st).dataset.qty] || 0) > 0));
      const bar = $("[data-order-bar]", root);
      if (bar) {
        const ls = lines();
        const s = sums(ls);
        const count = countOf(ls);
        bar.hidden = !count;
        $("[data-bar-count]", bar).textContent = itemsWord(count);
        $("[data-bar-total]", bar).textContent = s.priced.length ? `${money(s.total)}${s.quoted.length ? " + Quote" : ""}` : "By Quote";
      }
    };

    // Notes grow with what's typed, where the browser can't size the box itself.
    function growNotes(box) {
      if (!box || CSS.supports("field-sizing", "content")) return;
      box.style.height = "auto";
      box.style.height = `${Math.min(box.scrollHeight + box.offsetHeight - box.clientHeight, 200)}px`;
    }
    root.addEventListener("input", (e) => {
      const q = e.target.closest("[data-qty]");
      if (q) {
        qty[q.dataset.qty] = Math.max(0, Math.min(500, Math.round(Number(q.value) || 0)));
        refreshSummary();
      }
      if (e.target.name === "notes" && e.target.closest("[data-trade-summary]")) {
        notesNow = e.target.value;
        saveOrder();
        growNotes(e.target);
      }
      if (e.target.matches("[data-tp-find]")) filterShelf();
      if (e.target.matches("[data-tp-order-find]")) {
        const q = e.target.value.trim().toLowerCase();
        const rows = $$("[data-order-row]", root);
        rows.forEach((tr) => (tr.hidden = Boolean(q) && !tr.dataset.orderRow.includes(q)));
        const none = $("[data-tp-none]", root);
        if (none) none.hidden = rows.some((tr) => !tr.hidden);
      }
    });
    // The logo: saved as soon as it's picked (the server makes it a small PNG).
    const saveLogo = async (method, body = {}) => {
      try {
        const r = await api("/api/trade/logo", { method, body });
        a.logo = r.logo;
        render();
        toast(method === "DELETE" ? "Logo removed." : "Logo saved.");
      } catch (error) {
        toast(esc(error.message));
      }
    };
    // Samples: up to three picked (the rest wait once three are), and the two forms.
    root.addEventListener("change", (e) => {
      const brew = e.target.closest?.("[data-samples-form] input[name=brew]");
      const box = brew || e.target.closest?.("[data-samples-form] input[name=coffee]");
      if (!box) return;
      const f = box.closest("form");
      if (brew) {
        // Show only the coffees roasted for how they brew; a pick that no longer fits drops off.
        samplesBrew = brew.value;
        $$(".tp-smp", f).forEach((card) => {
          const fits = samplesBrew === "both" || card.dataset.roast === samplesBrew;
          card.hidden = !fits;
          const x = $("input", card);
          if (!fits && x.checked) {
            x.checked = false;
            samplesPick.delete(x.value);
          }
        });
      } else if (box.checked) samplesPick.add(box.value);
      else samplesPick.delete(box.value);
      $$("input[name=coffee]", f).forEach((x) => {
        x.disabled = !x.checked && samplesPick.size >= 3;
        x.closest(".tp-smp").classList.toggle("is-on", x.checked);
      });
      $("button[type=submit]", f).disabled = !samplesPick.size;
    });
    // Signing: Type or Draw, the typed name shown in the signature font, and the pad.
    root.addEventListener("change", (e) => {
      const m = e.target.closest?.("[data-ag-sign] input[name=sigMode]");
      if (!m) return;
      const f = m.closest("form");
      $("[data-sig-typed]", f).hidden = m.value !== "typed";
      $("[data-sig-drawn]", f).hidden = m.value !== "drawn";
      if (m.value === "drawn") sigPad($("[data-sig-canvas]", f));
    });
    root.addEventListener("input", (e) => {
      const n = e.target.closest?.("[data-ag-sign] input[name=name]");
      if (n) $("[data-sig-preview]", n.closest("form")).textContent = n.value;
    });
    root.addEventListener("click", (e) => {
      const c = e.target.closest?.("[data-sig-clear]");
      if (c) sigPad($("[data-sig-canvas]", c.closest("form")));
      if (e.target.closest?.("[data-ag-retry]")) {
        agData = null;
        render();
      }
    });
    root.addEventListener("pointerdown", (e) => {
      const canvas = e.target.closest?.("[data-sig-canvas]");
      if (!canvas) return;
      e.preventDefault();
      const dprNow = Math.max(1, Math.min(3, devicePixelRatio || 1));
      if (!canvas.width || Math.abs(canvas.width - canvas.getBoundingClientRect().width * dprNow) > 2) sigPad(canvas);
      const ctx = canvas.getContext("2d");
      const dpr = canvas.width / canvas.getBoundingClientRect().width;
      const at = (ev) => {
        const r = canvas.getBoundingClientRect();
        return [(ev.clientX - r.left) * dpr, (ev.clientY - r.top) * dpr];
      };
      canvas.setPointerCapture(e.pointerId);
      let [x, y] = at(e);
      ctx.beginPath();
      ctx.arc(x, y, ctx.lineWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = "#111111";
      ctx.fill();
      sigInk = true;
      const move = (ev) => {
        const [nx, ny] = at(ev);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        [x, y] = [nx, ny];
      };
      const up = () => {
        canvas.removeEventListener("pointermove", move);
        canvas.removeEventListener("pointerup", up);
        canvas.removeEventListener("pointercancel", up);
      };
      canvas.addEventListener("pointermove", move);
      canvas.addEventListener("pointerup", up);
      canvas.addEventListener("pointercancel", up);
    });
    root.addEventListener("submit", async (e) => {
      const agf = e.target.closest("[data-ag-sign]");
      if (agf) {
        e.preventDefault();
        const err = $(".tp-error", agf);
        const btn = $("button[type=submit]", agf);
        err.textContent = "";
        btn.disabled = true;
        try {
          const name = agf.elements.namedItem("name").value.trim();
          const mode = $("input[name=sigMode]:checked", agf)?.value || "typed";
          if (mode === "drawn" && !sigInk) throw new Error(tr("Sign in the box, or choose Type."));
          const image = mode === "drawn" ? $("[data-sig-canvas]", agf).toDataURL("image/png") : await typedSignature(name);
          const r = await api(`/api/trade/agreement/${agf.dataset.agSign}/sign`, { method: "POST", body: { name, title: agf.elements.namedItem("title").value, agree: agf.elements.namedItem("agree").checked, signature: { method: mode, image } } });
          agData = { ...agData, agreement: { ...agData.agreement, ...r.agreement } };
          if (agData.agreement.kind === "custom") data.agreement = { ...data.agreement, documents: (data.agreement.documents || []).map((d) => (d.id === r.agreement.id ? { ...d, ...r.agreement } : d)) };
          else data.agreement = { ...data.agreement, waiting: null, signed: r.agreement };
          toast(tr("Signed. Thank you."));
          render();
        } catch (error) {
          err.textContent = error.message;
          btn.disabled = false;
        }
        return;
      }
      const f = e.target.closest("[data-samples-form], [data-sample-feedback]");
      if (!f) return;
      e.preventDefault();
      const btn = $("button[type=submit]", f);
      const err = $(".tp-error", f);
      btn.disabled = true;
      err.textContent = "";
      try {
        if (f.matches("[data-samples-form]")) {
          await api("/api/trade/samples", { method: "POST", body: { coffees: [...samplesPick], brew: f.brew.value, how: f.how.value, location: f.location?.value || "", note: f.note.value } });
          samplesPick = new Set();
          toast(tr("Thanks. We'll roast them and let you know when they're on the way."));
        } else {
          const ratings = Object.fromEntries($$("input[type=radio]:checked", f).map((x) => [x.name.slice(2), x.value]));
          await api(`/api/trade/samples/${f.dataset.sampleFeedback}/feedback`, { method: "POST", body: { ratings, note: f.note.value } });
          toast(tr("Thanks for letting us know."));
        }
        samplesData = null;
        render();
      } catch (error) {
        btn.disabled = false;
        err.textContent = error.message;
      }
    });
    root.addEventListener("change", (e) => {
      const input = e.target.closest?.("[data-tp-logo]");
      const file = input?.files?.[0];
      if (!file) return;
      input.value = "";
      if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) return void toast("Use a PNG, JPG, WebP or SVG logo.");
      if (file.size > 2_000_000) return void toast("That logo is too big. Use one under 2 MB.");
      const rd = new FileReader();
      rd.onload = () => saveLogo("POST", { type: file.type, data: String(rd.result).split(",")[1] || "" });
      rd.readAsDataURL(file);
    });
    // Team changes save as they're made: a role, the approval limit.
    root.addEventListener("change", (e) => {
      const tf = e.target.closest("[data-trade-team]");
      if (tf && (e.target.name === "role" || e.target.name === "approvalOver")) saveTeam(tf, null, e.target.name === "role" ? "Role changed." : "Approval limit saved.");
    });
    root.addEventListener("click", async (e) => {
      const sh = e.target.closest("[data-shelf]");
      if (sh) {
        shelf = sh.dataset.shelf;
        $$("[data-shelf]", root).forEach((b) => b.setAttribute("aria-pressed", String(b === sh)));
        filterShelf();
        return;
      }
      if (e.target.closest("[data-close-open]")) {
        const f = $("[data-trade-close]", root);
        f.hidden = !f.hidden;
        if (!f.hidden) $("textarea", f).focus();
        return;
      }
      if (e.target.closest("[data-tp-logo-remove]")) return void saveLogo("DELETE");
      const th = e.target.closest("[data-tp-theme]");
      if (th) {
        applyTheme(th.dataset.tpTheme);
        $$("[data-tp-theme]", root).forEach((b) => b.setAttribute("aria-pressed", String(b === th)));
        return;
      }
      const cancelSample = e.target.closest("[data-sample-cancel]");
      if (cancelSample) {
        cancelSample.disabled = true;
        try {
          await api(`/api/trade/samples/${cancelSample.dataset.sampleCancel}`, { method: "DELETE", body: {} });
          samplesData = null;
          render();
        } catch (error) {
          cancelSample.disabled = false;
          toast(error.message);
        }
        return;
      }
      const go = e.target.closest("[data-tab-go]");
      if (go) {
        // Chats across the page step aside for the page picked (docked beside it, it stays).
        if (help.open && !help.docked) closeHelp();
        cameFrom = tab;
        tab = go.dataset.tabGo;
        if (go.dataset.thenView) orderView = go.dataset.thenView;
        if (tab === "agreement") {
          const ref = go.dataset.agRef || "";
          if (ref !== agRef) agData = null;
          agRef = ref;
        }
        history.replaceState(null, "", tradeUrl(tab, tab === "agreement" ? agRef : ""));
        render();
        return;
      }
      const step = e.target.closest("[data-step]");
      if (step) {
        const key = step.dataset.stepKey;
        qty[key] = Math.max(0, Math.min(500, (qty[key] || 0) + Number(step.dataset.step)));
        const input = $(`[data-qty="${key}"]`, root);
        if (input) input.value = qty[key] || "";
        refreshSummary();
        return;
      }
      if (e.target.closest("[data-review-order]")) {
        $("[data-trade-summary]", root)?.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
        return;
      }
      const open = e.target.closest("[data-open-order]");
      if (open && !e.target.closest("[data-pay-dialog]")) return goTo("orderview", open.dataset.openOrder);
      // Pay, from an invoice or an order: that one, in a sheet.
      const paySheetOpen = e.target.closest("[data-pay-sheet]");
      if (paySheetOpen) return openPay(paySheetOpen.dataset.paySheet);
      const payDlg = e.target.closest("[data-pay-dialog]");
      if (payDlg && (e.target === payDlg || e.target.closest("[data-pay-close]"))) return payDlg.close();
      if (e.target.closest("[data-where-open]")) return whereSheet();
      const askIt = e.target.closest("[data-ask-item]");
      if (askIt) return askItem(askIt.dataset.askItem);
      const askOrder = e.target.closest("[data-ask-order]");
      if (askOrder) {
        const o = data.orders.find((x) => x.number === askOrder.dataset.askOrder);
        return o && askAbout(o.lines, o.number);
      }
      const askQuote = e.target.closest("[data-ask-quote]");
      if (askQuote) {
        const q = (data.quotes || []).find((x) => x.id === askQuote.dataset.askQuote);
        return q && askAbout(q.lines, q.number);
      }
      if (e.target.closest("[data-usual-sheet]")) return usualSheet();
      // Fill Your Usual on Products: added to the order (quantities together), with Undo.
      if (e.target.closest("[data-usual-add]")) {
        const before = { ...qty };
        const wasEmpty = !lines().length;
        const was = { way, shipLoc };
        addFrom(data.usual.lines);
        if (wasEmpty) {
          if (data.usual.fulfilment === "Pickup") way = "Pickup";
          else if (data.usual.location && (a.locations || []).some((l) => l.id === data.usual.location)) {
            way = "Delivery";
            shipLoc = data.usual.location;
          }
        }
        render();
        toastUndo("Your usual is in the order.", () => {
          way = was.way;
          shipLoc = was.shipLoc;
          restoreQty(before);
        });
        return;
      }
      const withdraw = e.target.closest("[data-quote-withdraw]");
      if (withdraw) {
        const q = (data.quotes || []).find((x) => x.id === withdraw.dataset.quoteWithdraw);
        if (!q || !confirm(`Withdraw quote ${q.number}?`)) return;
        withdraw.disabled = true;
        try {
          const r = await api(`/api/trade/quotes/${q.id}/withdraw`, { method: "POST", body: {} });
          data.quotes = data.quotes.map((x) => (x.id === q.id ? r.quote : x));
          render();
          toast(esc(`Quote ${q.number} withdrawn.`));
        } catch (error) {
          withdraw.disabled = false;
          toast(esc(error.message));
        }
        return;
      }
      if (e.target.closest("[data-problem-open]")) {
        $("[data-trade-problem]", root).hidden = false;
        e.target.closest("[data-problem-open]").hidden = true;
        return;
      }
      const inv = e.target.closest("[data-invoice]");
      if (inv) return goTo("invoice", inv.dataset.invoice);
      if (e.target.closest("[data-ask-team]")) return askTeam();
      const qd = e.target.closest("[data-quote-accept], [data-quote-decline]");
      if (qd) {
        const accept = qd.matches("[data-quote-accept]");
        const id = accept ? qd.dataset.quoteAccept : qd.dataset.quoteDecline;
        if (!accept && !confirm("Decline this quote?")) return;
        qd.disabled = true;
        try {
          const result = await api(`/api/trade/quotes/${id}/${accept ? "accept" : "decline"}`, { method: "POST", body: {} });
          data.quotes = (data.quotes || []).map((q) => (q.id === id ? result.quote : q));
          if (result.order) data.orders.unshift(result.order);
          render();
          toast(accept ? `Accepted: order ${result.order.number} placed${result.invoiced ? `. We've emailed the invoice to ${a.email}.` : "."}` : "Quote declined.");
        } catch (error) {
          qd.disabled = false;
          toast(esc(error.message));
        }
        return;
      }
      const rm = e.target.closest("[data-member-remove]");
      if (rm) {
        const row = rm.closest("[data-member]");
        if (!confirm(`Remove ${row.dataset.member} from the team? They won't be able to log in.`)) return;
        const f = rm.closest("[data-trade-team]");
        row.remove();
        return saveTeam(f, null, `${row.dataset.member} removed.`);
      }
      const decide = e.target.closest("[data-req-approve], [data-req-decline]");
      if (decide) {
        const approve = decide.matches("[data-req-approve]");
        const id = approve ? decide.dataset.reqApprove : decide.dataset.reqDecline;
        if (!approve && !confirm("Decline this order? We'll let them know.")) return;
        decide.disabled = true;
        try {
          const result = await api(`/api/trade/requests/${id}/${approve ? "approve" : "decline"}`, { method: "POST", body: {} });
          data.requests = result.requests;
          if (result.order) data.orders.unshift(result.order);
          render();
          toast(approve ? `Approved: order ${result.order.number} placed${result.invoiced ? `. We've emailed the invoice to ${a.email}.` : "."}` : "Declined. We've let them know.");
        } catch (err) {
          decide.disabled = false;
          toast(esc(err.message));
        }
        return;
      }
      const saveUsual = e.target.closest("[data-usual-save]");
      if (saveUsual) {
        saveUsual.disabled = true;
        const fulfilment = way;
        try {
          data.usual = (await api("/api/trade/usual", { method: "PUT", body: { lines: lines().map((l) => ({ product: l.product, size: l.size, qty: l.qty })), fulfilment, location: fulfilment === "Pickup" ? "" : shipLoc } })).usual;
          render();
          toast("Saved as your usual order.");
        } catch (err) {
          saveUsual.disabled = false;
          $("[data-trade-error]", root).textContent = err.message;
        }
        return;
      }
      const re = e.target.closest("[data-reorder]");
      if (re) {
        const o = data.orders.find((x) => x.number === re.dataset.reorder);
        if (o) againSheet(o);
        return;
      }
      const mb = e.target.closest("[data-tp-menu]");
      if (mb) {
        toggleMenu(mb);
        return;
      }
      if (e.target.closest("[data-help-open]")) {
        if (help.open) closeHelp();
        else openHelp();
        return;
      }
      if (e.target.closest("[data-tp-search]")) {
        openSearch();
        return;
      }
      if (e.target.closest("[data-tp-email]")) {
        emailUs();
        return;
      }
      if (e.target.closest("[data-logout]")) {
        await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => {});
        location.href = "./";
        return;
      }
      if (e.target.closest("[data-loc-add]")) return addLocation();
      const locEdit = e.target.closest("[data-loc-edit]");
      if (locEdit) return addLocation(locEdit.dataset.locEdit);
      // Place Order, Ask for a Quote, or both: the priced lines placed, the by-quote ones asked for.
      const place = e.target.closest("[data-place]");
      if (place) {
        const ls = lines();
        const err = $("[data-trade-error]", root);
        err.textContent = "";
        const label = place.textContent;
        place.disabled = true;
        place.textContent = "Placing…";
        try {
          const out = await submitOrder(ls, notesNow);
          // What went through leaves the order being built; a quote that didn't stays in it.
          ls.filter((l) => !l.byQuote || out.quote).forEach((l) => delete qty[`${l.product}:${l.size}`]);
          if (!lines().length) notesNow = "";
          saveOrder();
          afterSubmit(out);
        } catch (error) {
          place.disabled = false;
          place.textContent = label;
          err.textContent = error.message;
        }
      }
    });
    const paidWith = (result) => {
      data.orders = result.orders;
      data.card = result.card;
      payPick.clear();
      const bank = result.bank === true;
      payNew = !data.card;
      payOne = "";
      render();
      const paid = data.orders.filter((o) => result.paid.includes(o.number)).reduce((n, o) => n + o.total, 0);
      toast(bank ? `Bank payment of ${money(paid)} started. It takes a few business days to clear.` : result.partial ? `Paid ${money(paid)}. ${esc(result.error)}` : `Paid ${money(paid)}. Thank you.`);
    };
    mountPasskeys(root);
    root.addEventListener("click", (e) => {
      const view = e.target.closest("[data-order-view]");
      if (!view) return;
      orderView = view.dataset.orderView;
      render();
    });
    // Stripe's bank payments: open the panel, pay (new account or saved), the code, start over.
    root.addEventListener("click", async (e) => {
      const t = e.target;
      if (!SB()) return;
      if (t.closest("[data-bank-open]")) {
        bankOpen = !bankOpen;
        render();
        return $("[data-bank-form] [name=bankRouting]", root)?.focus();
      }
      if (t.closest("[data-bank-new]") || t.closest("[data-bank-saved]")) {
        bankNew = Boolean(t.closest("[data-bank-new]"));
        return render();
      }
      if (t.closest("[data-bank-forget]")) {
        if (!confirm(`Remove •••• ${data.bank.saved?.last4} from your account?`)) return;
        try {
          bankDone(await api("/api/trade/bank", { method: "DELETE", body: {} }), "Bank account removed.");
        } catch (err) {
          toast(esc(err.message));
        }
        return;
      }
      if (t.closest("[data-bank-restart]")) {
        if (!confirm("Start over? This bank payment is cancelled and the invoices are due again.")) return;
        try {
          bankDone(await api("/api/trade/bank/verify", { method: "DELETE", body: {} }));
        } catch (err) {
          toast(esc(err.message));
        }
        return;
      }
      const numbers = picks().map((o) => o.number);
      const go = t.closest("[data-bank-pay]");
      if (go) {
        go.disabled = true;
        go.textContent = "Paying…";
        try {
          const r = await api("/api/trade/bank/pay", { method: "POST", body: { numbers } });
          bankDone(r, "Bank payment started. It takes a few business days to clear.");
        } catch (err) {
          go.disabled = false;
          go.textContent = `Pay ${money(payTotal())} from •••• ${data.bank.saved?.last4}`;
          toast(esc(err.message));
        }
        return;
      }
      const submit = t.closest("[data-bank-submit]");
      if (!submit) return;
      const f = $("[data-bank-form]", root);
      const err = $("[data-bank-error]", f);
      const val = (n) => $(`[name=${n}]`, f).value.replace(/\s+/g, "");
      const routing = val("bankRouting");
      const account = val("bankAccount");
      if (!/^\d{9}$/.test(routing)) return (err.textContent = "The routing number is 9 digits.");
      if (!/^\d{4,17}$/.test(account)) return (err.textContent = "Check the account number.");
      if (account !== val("bankAccount2")) return (err.textContent = "The account numbers don't match.");
      const name = $("[name=bankName]", f).value.trim();
      if (!name) return (err.textContent = "Add the name on the account.");
      err.textContent = "";
      submit.disabled = true;
      submit.textContent = "Paying…";
      try {
        const [stripe, started] = await Promise.all([loadStripe(), api("/api/trade/bank/start", { method: "POST", body: { numbers } })]);
        // The numbers go from here to Stripe, never to us.
        const { paymentIntent, error } = await stripe.confirmUsBankAccountPayment(started.secret, {
          payment_method: { us_bank_account: { routing_number: routing, account_number: account, account_holder_type: "company", account_type: $("[name=bankType]:checked", f)?.value || "checking" }, billing_details: { name, email: a.email } },
        });
        if (error) throw new Error(/routing|account/i.test(error.code || "") ? "Check the routing and account numbers." : "The bank payment didn't go through. Try again, or pay by card.");
        const r = await api("/api/trade/bank/confirmed", { method: "POST", body: { id: paymentIntent?.id || started.id } });
        bankDone(r, r.step === "verify" ? "Almost done: confirm your bank account with the code from your statement." : "Bank payment started. It takes a few business days to clear.");
      } catch (e2) {
        submit.disabled = false;
        submit.textContent = `Pay ${money(payTotal())} by Bank`;
        err.textContent = e2.message;
      }
    });
    root.addEventListener("submit", async (e) => {
      const f = e.target.closest("[data-bank-verify]");
      if (!f) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const err = $("[data-bank-verify-error]", f);
      const body = data.bank.verify.type === "amounts" ? { amounts: [f.amt1.value, f.amt2.value] } : { code: f.code.value };
      const b = $("button[type=submit]", f);
      b.disabled = true;
      try {
        bankDone(await api("/api/trade/bank/verify", { method: "POST", body }), "Bank account confirmed. Your payment is on its way; it takes a few business days to clear.");
      } catch (e2) {
        b.disabled = false;
        err.textContent = e2.message;
      }
    }, true);
    root.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-remove-card]")) return;
      if (!confirm((window.i18n?.t(`Remove ${data.card.brand} •••• ${data.card.last4} from your account?`) ?? `Remove ${data.card.brand} •••• ${data.card.last4} from your account?`))) return;
      try {
        data.card = (await api("/api/trade/card", { method: "DELETE", body: {} })).card;
        payNew = true;
        render();
        toast("Card removed.");
      } catch (err) {
        toast(esc(err.message));
      }
    });
    root.addEventListener("change", (e) => {
      if (e.target.name === "payWith") {
        payNew = e.target.value === "card";
        $("[data-new-card]", root).hidden = !payNew;
        if (payNew && !tradeCard) mountTradeCard();
        return;
      }
      const pick = e.target.closest("[data-pay-pick]");
      if (!pick) return;
      if (pick.checked) payPick.delete(pick.dataset.payPick);
      else payPick.add(pick.dataset.payPick);
      // The amounts on both buttons; paying by bank needs exactly one invoice.
      const one = picks().length === 1;
      const pay = $("[data-pay-button]", root);
      const bank = $("[data-pay-bank]", root);
      const count = $("[data-pay-count]", root);
      if (count) count.textContent = `${picks().length} ${picks().length === 1 ? "invoice" : "invoices"}`;
      if (pay) {
        pay.textContent = `Pay ${money(payTotal())}`;
        pay.disabled = payTotal() <= 0;
      }
      if (SB()) {
        const open = $("[data-bank-open]", root);
        if (open) open.disabled = payTotal() <= 0 || Boolean(data.bank.verify);
        const panel = $(".tp-bank", root);
        const boxEl = $("[data-bank-box]", root);
        if (boxEl) boxEl.outerHTML = bankBox();
        else if (panel) panel.outerHTML = bankPanel();
      } else if (bank) {
        bank.disabled = !one;
        $("[data-bank-hint]", root).textContent = one ? "Bank payments take a few business days to clear." : "Pay by bank one invoice at a time: tick just one.";
        if (one) {
          tradeBank = null;
          mountTradeBank(picks()[0].number);
        }
      }
    });
    root.addEventListener("submit", async (e) => {
      const pf = e.target.closest("[data-trade-problem]");
      if (pf) {
        e.preventDefault();
        const d = new FormData(pf);
        const err = $("[data-problem-error]", pf);
        const items = d.getAll("item").map((index) => ({ index: Number(index), qty: Number(d.get(`qty-${index}`) || 1) }));
        if (!items.length) return (err.textContent = "Choose which items.");
        const files = d.getAll("photos").filter((f) => f instanceof File && f.size);
        if (files.length > 4) return (err.textContent = "Up to 4 photos, please.");
        const button = $("button[type=submit]", pf);
        button.disabled = true;
        button.textContent = "Sending…";
        try {
          const photos = await Promise.all(files.map(shrinkPhoto));
          const { order } = await api(`/api/trade/orders/${encodeURIComponent(pf.dataset.tradeProblem)}/problem`, { method: "POST", body: { items, problem: d.get("problem"), note: d.get("note") || "", photos } });
          data.orders = data.orders.map((x) => (x.number === order.number ? order : x));
          render();
          toast("Thanks. We'll check it and email you.");
        } catch (error) {
          err.textContent = error.message;
          button.disabled = false;
          button.textContent = "Send";
        }
        return;
      }
      const payForm = e.target.closest("[data-trade-pay]");
      if (payForm) {
        e.preventDefault();
        const error = $("[data-pay-error]", payForm);
        const byBank = Boolean(e.submitter?.closest("[data-pay-bank]"));
        const button = byBank ? $("[data-pay-bank]", payForm) : $("[data-pay-button]", payForm);
        const numbers = picks().map((o) => o.number);
        const amount = payTotal();
        const again = () => `Pay ${money(amount)}${byBank ? " by bank" : ""}`;
        if (!numbers.length) return;
        const useSaved = !payNew && Boolean(data.card);
        if (byBank) {
          if (numbers.length !== 1) {
            error.textContent = "Pay by bank one invoice at a time: tick just one.";
            return;
          }
          if (!tradeBank) {
            error.textContent = "Bank payments aren't available right now. Pay by card.";
            return;
          }
          error.textContent = "";
          button.disabled = true;
          button.textContent = "Connecting your bank…";
          try {
            // Square opens the bank sign-in (Plaid); the token comes back in its event.
            const token = await new Promise((resolve, reject) => {
              tradeBank.addEventListener?.("ontokenization", (ev) => {
                const { tokenResult, error: err } = ev.detail || {};
                if (err || tokenResult?.status !== "OK") reject(new Error("The bank connection didn't finish."));
                else resolve(tokenResult.token);
              });
              Promise.resolve(tradeBank.tokenize({ accountHolderName: a.contactName || a.business, intent: "CHARGE", amount: amount.toFixed(2), currency: SITE.currencyCode }))
                .then((r) => r?.status === "OK" && resolve(r.token))
                .catch(reject);
            });
            button.textContent = "Paying…";
            paidWith({ ...(await api("/api/trade/pay", { method: "POST", body: { numbers, sourceId: token, method: "ach" } })), bank: true });
          } catch (err) {
            button.disabled = false;
            button.textContent = again();
            error.textContent = err.message || "That didn't go through. Try again.";
          }
          return;
        }
        if (!useSaved && !tradeCard) {
          error.textContent = "Payment form didn't load. Refresh the page.";
          return;
        }
        error.textContent = "";
        button.disabled = true;
        button.textContent = "Paying…";
        try {
          if (useSaved) {
            const result = await api("/api/trade/pay", { method: "POST", body: { numbers, useSaved: true } });
            paidWith(result);
            return;
          }
          const token = await tradeCard.tokenize({
            amount: amount.toFixed(2),
            currencyCode: SITE.currencyCode,
            intent: "CHARGE",
            customerInitiated: true,
            sellerKeyedIn: false,
            billingContact: { givenName: a.contactName || a.business, email: a.email },
          });
          if (token.status !== "OK") throw new Error("Check your card details.");
          const result = await api("/api/trade/pay", { method: "POST", body: { numbers, sourceId: token.token, saveCard: payForm.saveCard?.checked === true } });
          paidWith(result);
        } catch (err) {
          button.disabled = false;
          button.textContent = again();
          error.textContent = err.message || "That didn't go through. Try again.";
          $(".card-frame", payForm)?.classList.add("is-shaking");
        }
        return;
      }
      const closeForm = e.target.closest("[data-trade-close]");
      if (closeForm) {
        e.preventDefault();
        const button = $("button[type=submit]", closeForm);
        button.disabled = true;
        try {
          await api("/api/trade/close-request", { method: "POST", body: { reason: closeForm.reason.value } });
          closeForm.innerHTML = `<p><strong>Request sent.</strong> We'll be in touch at ${esc(a.email)} to close the account.</p>`;
        } catch (error) {
          $("[data-close-error]", closeForm).textContent = error.message;
          button.disabled = false;
        }
        return;
      }
      // Add: the email typed, saved straight away (they're emailed how to log in).
      const tf = e.target.closest("[data-trade-team]");
      if (tf) {
        e.preventDefault();
        const email = tf.newEmail.value.trim().toLowerCase();
        const err = $("[data-team-error]", tf);
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return void (err.textContent = "Enter their email.");
        if ($$("[data-member]", tf).some((r) => r.dataset.member === email)) return void (err.textContent = "They're already on the team.");
        $("[data-member-add]", tf).disabled = true;
        await saveTeam(tf, { email, role: tf.newRole.value }, `${email} added.`);
        return;
      }
      const f = e.target.closest("[data-trade-details]");
      if (!f) return;
      e.preventDefault();
      try {
        const { account } = await api("/api/trade/account", { method: "PATCH", body: { contactName: f.contactName.value } });
        Object.assign(a, account);
        toast("Details saved.");
        render();
      } catch (error) {
        $("[data-details-error]", f).textContent = error.message;
        flagFields(f, error.message);
      }
    });
    render();
  },

  track() {
    const params = new URLSearchParams(location.search);
    const number = (params.get("order") || "").toUpperCase();
    const box = $("[data-tracker]");
    if (!/^MF-[A-Z0-9]{1,12}$/.test(number)) {
      // No link: look the order up by its number and email (or log in).
      box.innerHTML = `<div class="tracker">
        <h1 class="tracker-head">Track an order</h1>
        <form class="form track-lookup" data-track-lookup novalidate>
          <label>Your order number<input name="number" placeholder="MF-…" autocapitalize="characters" autocomplete="off" required></label>
          <label>Email<input type="email" name="email" autocomplete="email" required></label>
          <p class="sub-error" data-track-error role="alert"></p>
          <button class="button" type="submit">Find Order</button>
        </form>
        <p class="tracker-sub">Have an account? <a href="login" data-login-next="account">Log in</a> to see all your orders.</p>
      </div>`;
      const form = $("[data-track-lookup]", box);
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const error = $("[data-track-error]", form);
        error.textContent = "";
        if (!form.number.value.trim() || !form.email.value.trim()) {
          error.textContent = "Add your order number and email.";
          return flagFields(form, "", [!form.number.value.trim() && "number", !form.email.value.trim() && "email"].filter(Boolean));
        }
        const button = $("button[type=submit]", form);
        button.disabled = true;
        try {
          const { url } = await api("/api/track-lookup", { method: "POST", body: { number: form.number.value, email: form.email.value } });
          location.href = `${location.pathname.match(/^\/(es|ko)(?=\/)/)?.[0] || ""}${url}`;
        } catch (err) {
          error.textContent = err.message;
          flagFields(form, err.message, ["number", "email"]);
          button.disabled = false;
        }
      });
      return;
    }
    mountTracker(box, number, params.get("t") || "");
  },

  // Our receipt for a paid order (the link in the order email and on its tracking page).
  async receipt() {
    const params = new URLSearchParams(location.search);
    const number = (params.get("order") || "").toUpperCase();
    const token = params.get("t") || "";
    const box = $("[data-receipt]");
    const fail = (msg) => (box.innerHTML = `<div class="receipt"><h1 class="receipt-title">Receipt</h1><p class="muted">${esc(msg)}</p></div>`);
    if (!/^MF-[A-Z0-9]{1,12}$/.test(number)) return fail("Open the receipt from your order email.");
    let r;
    try {
      ({ receipt: r } = await api(`/api/receipt/${number}?t=${encodeURIComponent(token)}`));
    } catch (err) {
      return fail(err.message);
    }
    const when = new Date(r.paidAt).toLocaleString(LOCALE_US, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: SITE.timezone || "America/Los_Angeles" });
    const total = r.totals.find((t) => t.bold);
    document.title = `Receipt ${r.number} — ${SITE.name}`;
    box.innerHTML = `<article class="receipt">
      <header class="receipt-head">
        <h1 class="receipt-title">${esc(r.shop.name)}</h1>
        <p class="receipt-amount">${esc(total?.value || "")}</p>
        <p class="muted"><span>Paid</span> <time datetime="${esc(r.paidAt)}">${esc(when)}</time></p>
      </header>
      <section class="receipt-card" aria-label="Items">
        <ul class="receipt-lines">${r.lines
          .map((l) => `<li><span>${l.qty} × ${esc(l.title)}${l.detail ? `<small>${esc(l.detail)}</small>` : ""}${l.later ? `<small>Billed with your subscription</small>` : ""}</span><span>${money(l.total)}</span></li>`)
          .join("")}</ul>
      </section>
      <section class="receipt-card" aria-label="Totals">
        <dl class="receipt-rows">${r.totals.map((t) => `<div${t.bold ? ' class="is-total"' : ""}><dt>${esc(t.label)}</dt><dd>${esc(t.value)}</dd></div>`).join("")}</dl>
      </section>
      ${
        r.payments.length || r.refunded
          ? `<section class="receipt-card" aria-label="Payment">
        <dl class="receipt-rows">${r.payments.map((p) => `<div><dt>${esc(p.method)}${p.wallet ? `<small>${esc(p.wallet)}</small>` : ""}</dt><dd>${money(p.amount)}</dd></div>`).join("")}${
          r.refunded ? `<div><dt>Refunded</dt><dd>−${money(r.refunded)}</dd></div>` : ""
        }</dl>
      </section>`
          : ""
      }
      <section class="receipt-card" aria-label="Order">
        <dl class="receipt-rows">
          <div><dt>Order</dt><dd>${esc(r.number)}</dd></div>
          ${r.name ? `<div><dt>Name</dt><dd>${esc(r.name)}</dd></div>` : ""}
        </dl>
        ${r.where.map((w) => `<p class="receipt-where">${esc(w)}</p>`).join("")}
      </section>
      <footer class="receipt-shop">
        <p>${[r.shop.name, ...r.shop.address].map(esc).join("<br>")}</p>
        <p><a href="mailto:${esc(r.shop.email)}">${esc(r.shop.email)}</a><br>${esc(r.shop.site)}</p>
      </footer>
      <div class="receipt-actions">
        <button class="button" type="button" data-receipt-print>Print Receipt</button>
        <a class="button is-outline" href="track?order=${encodeURIComponent(r.number)}&t=${encodeURIComponent(token)}">Track Your Order</a>
      </div>
    </article>`;
    $("[data-receipt-print]", box).addEventListener("click", () => print());
  },

  // Rating an order (the link in the email after it): stars and a few words per item.
  review() {
    const params = new URLSearchParams(location.search);
    const root = $("[data-review]");
    const order = params.get("order") || "";
    const t = params.get("t") || "";
    const stars = (name, value) =>
      `<fieldset class="stars"><legend class="visually-hidden">Rating</legend>${[5, 4, 3, 2, 1]
        .map((n) => `<label><input type="radio" name="${name}" value="${n}"${n === value ? " checked" : ""} required><span aria-hidden="true">★</span><span class="visually-hidden">${n} of 5</span></label>`)
        .join("")}</fieldset>`;
    const item = (i) => `
      <li class="sub-card review-item">
        <form class="form" data-review-item="${esc(i.id)}">
          <div class="review-item-head">
            ${i.image ? `<img src="${esc(i.image)}" alt="" width="56" height="56">` : ""}
            <h2>${esc(i.name)}</h2>
          </div>
          ${stars(`rating-${i.id}`, i.review?.rating)}
          <label class="visually-hidden" for="text-${esc(i.id)}">Your review</label>
          <textarea id="text-${esc(i.id)}" name="text" rows="3" maxlength="1000" placeholder="What did you think? (optional)">${esc(i.review?.text || "")}</textarea>
          <p class="sub-error" data-review-error></p>
          <button class="button" type="submit">${i.review ? "Update" : "Post Review"}</button>
        </form>
      </li>`;
    api(`/api/review?order=${encodeURIComponent(order)}&t=${encodeURIComponent(t)}`)
      .then((d) => {
        root.innerHTML = d.items.length
          ? `<header class="page-head"><h1>Rate your order</h1><p class="muted">${esc(d.order)}</p></header><ul class="sub-cards">${d.items.map(item).join("")}</ul>`
          : `<header class="page-head"><h1>Nothing to rate</h1></header>`;
      })
      .catch((error) => (root.innerHTML = `<header class="page-head"><h1>Link not found</h1><p class="muted">${esc(error.message)}</p></header>`));
    root.addEventListener("submit", async (e) => {
      const f = e.target.closest("[data-review-item]");
      if (!f) return;
      e.preventDefault();
      const button = $("button", f);
      button.disabled = true;
      try {
        await api("/api/review", { method: "POST", body: { order, t, product: f.dataset.reviewItem, rating: Number(new FormData(f).get(`rating-${f.dataset.reviewItem}`)), text: f.text.value } });
        button.textContent = "Update";
        toast("Thanks for your review.");
      } catch (error) {
        $("[data-review-error]", f).textContent = error.message;
      }
      button.disabled = false;
    });
  },

  account() {
    const root = $("[data-account]");
    const S = SUBSCRIPTION;
    const fmtDate = (iso) =>
      new Date(`${iso}T12:00:00`).toLocaleDateString(LOCALE, { weekday: "long", day: "numeric", month: "long" });
    const chips = (name, items, value) =>
      items
        .map((x) => `<label><input type="radio" name="${name}" value="${x.id}"${x.id === value ? " checked" : ""}><span>${esc(x.label)}</span></label>`)
        .join("");

    // A card-billed subscription can't be picked up again once cancelled (the card plan has
    // ended): Restart starts the same one afresh, from its coffee's page or the builder.
    const restartHref = (sub) => {
      const id = String(sub.coffee || "");
      return /^[pt]:/.test(id) ? `products/${encodeURIComponent(id.slice(2))}` : `subscriptions/build?coffee=${encodeURIComponent(id)}`;
    };
    const card = (sub) => `
      <li class="sub-card is-${sub.status}" data-sub="${sub.id}" data-billing="${esc(sub.billing || "")}">
        <div class="sub-card-head">
          <div>
            <h3>${esc(sub.coffeeLabel)} Subscription${sub.gift ? `<span class="muted">, gift for ${esc(sub.recipient)}</span>` : ""}</h3>
            <p class="muted">${esc(sub.sizeLabel)}${sub.grind ? ` · ${esc(sub.grind)}` : ""} · ${esc(sub.freqLabel)} · ${sub.prepaid ? `${sub.prepaid.deliveries} months, paid up front` : `${money(sub.price)} per delivery`}</p>
          </div>
          <span class="status-badge">${{ active: "Active", paused: "Paused", ended: "Complete" }[sub.status] || "Cancelled"}</span>
        </div>
        ${sub.prepaid ? `<p class="muted">${sub.prepaid.sent} of ${sub.prepaid.deliveries} deliveries sent</p>` : ""}
        ${sub.status === "active" ? `<p class="sub-next">Next delivery: <strong>${esc(fmtDate(sub.nextDelivery))}</strong></p>` : ""}
        ${sub.note ? `<p class="muted">Gift message: “${esc(sub.note)}”</p>` : ""}
        <div class="sub-actions">
          ${sub.status === "active" ? `<button type="button" class="pill" data-act="skip">Skip Next Delivery</button><button type="button" class="pill" data-act="pause">Pause</button>` : ""}
          ${sub.status === "paused" || (sub.status === "cancelled" && sub.billing === "invoice") ? `<button type="button" class="pill" data-act="resume">${sub.status === "paused" ? "Resume" : "Restart"}</button>` : ""}
          ${sub.status === "cancelled" && sub.billing !== "invoice" && !sub.gift ? `<a class="pill" href="${esc(restartHref(sub))}">Restart</a>` : ""}
          ${sub.status !== "cancelled" && sub.status !== "ended" && !sub.prepaid ? `<button type="button" class="pill" data-act="edit">Change</button><button type="button" class="link-button" data-act="cancel">Cancel Subscription</button>` : ""}
        </div>
        ${sub.prepaid && sub.status !== "ended" ? `<p class="muted">Need to change the address or coffee? Email <a href="mailto:${esc(SITE.ordersEmail)}">${esc(SITE.ordersEmail)}</a>.</p>` : ""}
        <form class="sub-edit" data-edit hidden>
          ${
            sub.tea
              ? `<fieldset class="options"><legend>Tea</legend>${chips("coffee", ACCESSORIES.filter((a) => isTea(a) && !comingSoon(a) && !a.soldOut).map((a) => ({ id: `t:${a.id}`, label: a.short || a.name })), sub.coffee)}</fieldset>
                 <input type="hidden" name="size" value="${esc(sub.size)}">`
              : `<fieldset class="options"><legend>Coffee</legend>${chips("coffee", sub.product ? [{ id: sub.coffee, label: sub.coffeeLabel }, ...S.coffees] : S.coffees, sub.coffee)}</fieldset>
          <fieldset class="options"><legend>Size</legend>${chips("size", sub.product ? S.sizes.filter((z) => z.id !== "500g" && !z.tea) : S.sizes.filter((z) => !z.tea), sub.size)}</fieldset>`
          }
          <fieldset class="options"><legend>Frequency</legend>${chips("freq", S.frequencies, sub.freq)}</fieldset>
          <div class="sub-edit-actions">
            <button class="button" type="submit">Save changes</button>
            <button class="link-button" type="button" data-act="close">Never mind</button>
          </div>
        </form>
        <p class="sub-error" data-sub-error role="alert"></p>
      </li>`;

    const ORDER_STATUS = { new: "Received", packed: "Packed", shipped: "Shipped", ready: "Ready", completed: "Completed", cancelled: "Cancelled" };
    const orderCard = (o) => `
      <li class="sub-card account-order">
        <div class="sub-card-head">
          <div>
            <h3>${esc(o.number)}</h3>
            <p class="muted">${esc(new Date(o.placedAt).toLocaleDateString(LOCALE_US, { month: "short", day: "numeric", year: "numeric" }))} · ${money(o.total)}${o.refunded ? ` · ${money(o.refunded)} refunded` : ""}</p>
          </div>
          <span class="status-badge">${ORDER_STATUS[o.status] || esc(o.status)}</span>
        </div>
        <p class="muted">${o.lines.map((l) => `${l.qty} × ${esc(lineName(l))}`).join("<br>")}</p>
        ${o.how ? `<p>${esc(o.how)}</p>` : ""}
        ${o.status !== "cancelled" ? `<div class="sub-actions"><button type="button" class="pill" data-track="${esc(o.number)}">Track order</button></div>` : ""}
        ${o.gifts.map((g) => `<p class="account-gift">Gift to ${esc(g.recipient)}: ${g.lines.map((l) => `${l.qty} × ${esc(lineName(l))}`).join(", ")} · ${ORDER_STATUS[g.status] || esc(g.status)}${g.number && g.status !== "cancelled" ? ` · <button type="button" class="link-button" data-track="${esc(g.number)}">Track</button>` : ""}</p>`).join("")}
      </li>`;

    // Their mobile number: for a courier, a carrier collecting a return, and (once a texted code
    // confirms it) logging in.
    const phoneShown = (p) => (/^\+1\d{10}$/.test(p || "") ? `(${p.slice(2, 5)}) ${p.slice(5, 8)}-${p.slice(8)}` : p || "");
    // A saved number shows as a value with Change (and Confirm, while a texted code hasn't
    // confirmed it); the field and its button only once they change it, or to add one.
    const phoneSection = (u) => `
      <section class="trade-section account-phone">
        <h2 class="section-label">Mobile number</h2>
        ${
          u.phone
            ? `<p class="account-value" data-phone-view><span>${esc(phoneShown(u.phone))}</span><span class="account-value-actions">${
                !u.phoneVerified && SITE.textLogin ? `<button type="button" class="link-button" data-phone-confirm>Confirm</button>` : ""
              }<button type="button" class="link-button" data-phone-change>Change</button></span></p>`
            : ""
        }
        <form class="form account-phone-form" data-phone-form novalidate${u.phone ? " hidden" : ""}>
          <label><span class="visually-hidden">Mobile number</span><input name="phone" type="tel" autocomplete="tel" inputmode="tel" maxlength="20" required value="${esc(phoneShown(u.phone))}"></label>
          <label data-phone-code hidden>Code<input name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="8" required></label>
          <p class="sub-error" data-phone-error role="alert"></p>
          <span class="account-phone-buttons">
            <button class="button is-outline" type="submit">${!u.phone ? "Add Number" : SITE.textLogin ? "Confirm Number" : "Save Number"}</button>
            ${u.phone ? `<button type="button" class="link-button" data-phone-cancel>Cancel</button>` : ""}
          </span>
        </form>
      </section>`;

    const render = (user, subs) => {
      root.innerHTML = `
        <header class="page-head account-head" data-reveal>
          <h1>Hi, ${esc(user.name.split(" ")[0])}</h1>
          <p class="account-who">${esc(user.email)} <button type="button" class="link-button" data-logout>Log Out</button></p>
        </header>
        ${user.verified ? "" : `<p class="account-confirm">Confirm your email to see past orders placed with it. <button type="button" class="link-button" data-resend-confirm>Resend link</button></p>`}
        ${tradeAccount ? `<a class="trade-banner" href="trade"><span><strong>Wholesale ordering for ${esc(tradeAccount.business)}</strong></span></a>` : ""}
        <section aria-labelledby="subs-title">
          <h2 id="subs-title" class="section-label">Your subscriptions</h2>
          ${
            subs.length
              ? `<ul class="sub-cards">${subs.map(card).join("")}</ul>`
              : `<div class="empty-state"><p>You don't have any subscriptions yet.</p><a class="button" href="subscriptions">Start a Subscription</a></div>`
          }
        </section>
        ${
          giftCardsMine.length
            ? `<section aria-labelledby="gc-title" class="account-gift-cards">
                <h2 id="gc-title" class="section-label">Your gift cards</h2>
                <ul class="account-gc">${giftCardsMine
                  .map(
                    (c) => `<li>
                      <a class="account-gc-card" href="gift/${esc(c.token)}" aria-label="Gift card ending ${esc(c.last4)}">${giftCardArt(c.balance ?? c.amount)}</a>
                      <div><strong>••${esc(c.last4)}</strong><span class="muted">From ${esc(c.fromName)}</span></div>
                      <span class="account-gc-balance">${c.balance == null ? "" : money(c.balance)}</span>
                    </li>`
                  )
                  .join("")}</ul>
              </section>`
            : ""
        }
        ${
          orders.length
            ? `<section aria-labelledby="orders-title" class="account-orders">
                <h2 id="orders-title" class="section-label">Your orders</h2>
                <ul class="sub-cards">${orders.map(orderCard).join("")}</ul>
              </section>`
            : ""
        }
        ${phoneSection(user)}
        ${passkeySection()}
        <section class="account-delete">
          <button type="button" class="account-delete-row" data-delete-open aria-expanded="false" aria-controls="delete-account">Delete Account</button>
          <form class="form" id="delete-account" data-delete-account hidden>
            <p>Cancels your subscriptions, removes your login and takes you off our email list. Past orders stay on file for tax, without your details. This can't be undone.</p>
            ${user.hasPassword ? `<label>Your password, to confirm<input name="password" type="password" autocomplete="current-password" required></label>` : `<label>Type DELETE to confirm<input name="confirm" autocomplete="off" autocapitalize="characters" required></label>`}
            <p class="sub-error" data-delete-error role="alert"></p>
            <button class="button button-danger" type="submit">Delete Account</button>
          </form>
        </section>`;
      observeReveals();
      mountPasskeys(root);
    };

    let subs = [];
    let orders = [];
    let user = null;
    let tradeAccount = null;
    let giftCardsMine = [];
    (async () => {
      user = await currentUser;
      if (!user) return toLogin("account");
      if (user.wholesale) return location.replace("trade");
      try {
        subs = (await api("/api/subscriptions")).subscriptions;
        orders = (await api("/api/subscriptions/orders").catch(() => ({ orders: [] }))).orders;
        tradeAccount = (await api("/api/trade/me").catch(() => null))?.account || null;
        giftCardsMine = (await api("/api/subscriptions/gift-cards").catch(() => ({ cards: [] }))).cards;
      } catch (error) {
        root.innerHTML = `<p class="sub-error">${esc(error.message)}</p>`;
        return;
      }
      render(user, subs);
      // Just logged in with the email their number was added to: the text to confirm it goes now.
      if (location.hash === "#confirm-phone") {
        history.replaceState(null, "", location.pathname + location.search);
        const pf = $("[data-phone-form]");
        if (pf && user.phone && !user.phoneVerified && SITE.textLogin) {
          pf.hidden = false;
          $("[data-phone-view]")?.setAttribute("hidden", "");
          pf.scrollIntoView({ block: "center" });
          pf.requestSubmit();
        }
      }
      const confirmed = new URLSearchParams(location.search).get("confirmed");
      if (confirmed) {
        history.replaceState(null, "", location.pathname);
        toast(confirmed === "1" || user.verified ? "Email confirmed." : "That link has expired. Use Resend link for a new one.");
      }
    })();

    const change = async (li, body) => {
      $$("button", li).forEach((b) => (b.disabled = true));
      $("[data-sub-error]", li).textContent = "";
      try {
        const { subscription } = await api(`/api/subscriptions/${li.dataset.sub}`, { method: "PATCH", body });
        subs = subs.map((x) => (x.id === subscription.id ? subscription : x));
        render(user, subs);
        toast(
          { skip: "Next delivery skipped.", pause: "Subscription paused.", resume: "Subscription resumed.", cancel: "Subscription cancelled.", change: "Changes saved." }[
            body.action
          ]
        );
      } catch (error) {
        $("[data-sub-error]", li).textContent = error.message;
        $$("button", li).forEach((b) => (b.disabled = false));
      }
    };

    // "Track order": the order's tracker in a sheet, like the cart.
    let stopTracking = () => {};
    root.addEventListener("click", (e) => {
      const b = e.target.closest("[data-track]");
      if (!b) return;
      if (!$("#track")) {
        document.body.insertAdjacentHTML(
          "beforeend",
          `<div class="overlay drawer track-sheet" id="track" role="dialog" aria-modal="true" aria-label="Track order" inert>
            <div class="drawer-backdrop" data-close></div>
            <aside class="drawer-panel">
              <div class="drawer-head"><h2>Track order</h2><button class="close" type="button" data-close aria-label="Close">${CLOSE_ICON}</button></div>
              <div class="track-body" data-track-body></div>
            </aside>
          </div>`
        );
      }
      stopTracking();
      const body = $("[data-track-body]");
      body.innerHTML = `<p class="muted">Loading…</p>`;
      openOverlay("track");
      stopTracking = mountTracker(body, b.dataset.track);
    });
    root.addEventListener("click", async (e) => {
      if (e.target.closest("[data-logout]")) {
        await api("/api/auth/logout", { method: "POST", body: {} }).catch(() => {});
        return location.replace("login");
      }
      const resend = e.target.closest("[data-resend-confirm]");
      if (resend) {
        resend.disabled = true;
        const r = await api("/api/auth/verify", { method: "POST", body: {} }).then(() => "Link sent. Check your inbox.", (err) => err.message);
        return toast(esc(r));
      }
      // Mobile number: Change opens the field (Cancel puts the value back); Confirm texts the code.
      const phoneBtn = e.target.closest("[data-phone-change], [data-phone-cancel], [data-phone-confirm]");
      if (phoneBtn) {
        const pf = $("[data-phone-form]", root);
        const editing = !phoneBtn.matches("[data-phone-cancel]");
        pf.hidden = !editing;
        $("[data-phone-view]", root).hidden = editing;
        if (phoneBtn.matches("[data-phone-confirm]")) pf.requestSubmit();
        else if (editing) pf.phone.focus();
        else render(user, subs);
        return;
      }
      // Delete Account: the row opens what it does and the confirmation under it.
      const del = e.target.closest("[data-delete-open]");
      if (del) {
        const form = $("[data-delete-account]", root);
        form.hidden = !form.hidden;
        del.setAttribute("aria-expanded", String(!form.hidden));
        if (!form.hidden) (form.password || form.confirm)?.focus();
        return;
      }
      const btn = e.target.closest("[data-act]");
      if (!btn) return;
      const li = btn.closest("[data-sub]");
      const act = btn.dataset.act;
      if (act === "edit" || act === "close") {
        $("[data-edit]", li).hidden = act === "close";
        return;
      }
      // Only an invoiced subscription picks up where it left off; a card-billed one starts again new.
      const ask = li.dataset.billing === "invoice" ? "Cancel this subscription? You can restart it any time." : "Cancel this subscription? You can start it again any time, as a new subscription.";
      if (act === "cancel" && !confirm(window.i18n?.t(ask) ?? ask)) return;
      change(li, { action: act });
    });

    root.addEventListener("submit", async (e) => {
      // Their mobile number: a code texted to it confirms it (it then signs them in too).
      const pf = e.target.closest("[data-phone-form]");
      if (pf) {
        e.preventDefault();
        const err = $("[data-phone-error]", pf);
        const button = $("button[type=submit]", pf);
        const coding = !$("[data-phone-code]", pf).hidden;
        err.textContent = "";
        button.disabled = true;
        try {
          if (!coding) {
            const r = await api("/api/auth/account/phone", { method: "POST", body: { phone: pf.phone.value } });
            if (r.saved) {
              user = { ...user, ...r.user };
              render(user, subs);
              toast("Number saved.");
              return;
            }
            $("[data-phone-code]", pf).hidden = false;
            pf.phone.readOnly = true;
            button.textContent = "Confirm";
            pf.code.focus();
          } else {
            const r = await api("/api/auth/account/phone/verify", { method: "POST", body: { phone: pf.phone.value, code: pf.code.value } });
            user = { ...user, ...r.user };
            render(user, subs);
            toast("Number confirmed.");
            return;
          }
        } catch (error) {
          err.textContent = error.message;
          flagFields(pf, "", [coding ? "code" : "phone"]);
        }
        button.disabled = false;
        return;
      }
      const del = e.target.closest("[data-delete-account]");
      if (del) {
        e.preventDefault();
        if (!confirm((window.i18n?.t("Delete your account for good? This can't be undone.") ?? "Delete your account for good? This can't be undone."))) return;
        const button = $("button[type=submit]", del);
        button.disabled = true;
        $("[data-delete-error]", del).textContent = "";
        try {
          await api("/api/auth/account", { method: "DELETE", body: del.password ? { password: del.password.value } : { confirm: del.confirm.value } });
          root.innerHTML = `<div class="empty-state deleted-state"><h1>Your account is deleted</h1><a class="button" href="./">Back to the shop</a></div>`;
          window.scrollTo(0, 0);
        } catch (error) {
          $("[data-delete-error]", del).textContent = error.message;
          if (error.status === 401 || error.data?.field === "confirm") {
            const f = del.password || del.confirm;
            flagFields(del, "", [f.name]);
            f.select();
          }
          button.disabled = false;
        }
        return;
      }
      const form = e.target.closest("[data-edit]");
      if (!form) return;
      e.preventDefault();
      change(form.closest("[data-sub]"), { action: "change", coffee: form.coffee.value, size: form.size.value, freq: form.freq.value });
    });
  },

  // Coffee finder: three questions, then the best match from the shop with an amount and
  // schedule. Matching uses each coffee's roast (filter / espresso) and its tasting notes.
  // Find Your Coffee or Tea: pick one, then on to that quiz.
  findChoice() {
    const tea = ACCESSORIES.some((a) => isTea(a) && !comingSoon(a));
    const card = (href, art, title) => `<a class="pick-card" href="${href}"><span class="pick-body"><span class="pick-thumb">${art}</span><strong>${title}</strong></span></a>`;
    $("[data-find-choice]").innerHTML = [
      card("find-your-coffee", bag(PRODUCTS.find((p) => p.type === "Filter")?.color || "#2b2b2b", { kicker: "Find yours", title: "Coffee", rows: [["Roast", "Light"], ["For", "Filter or espresso"]] }), "Coffee"),
      ...(tea ? [card("find-your-tea", tinArt(teaFace()), "Tea")] : []),
    ].join("");
  },

  // Find Your Tea: when they drink it, the kind of tea, what they like, the cultivar (once a tea
  // on sale names one) and how much, then the best match from the teas on sale. New teas, kinds
  // and cultivars join the quiz as they're added to the shop.
  teaFinder() {
    const root = $("[data-tea-finder]") || $("[data-finder]");
    const teas = () => ACCESSORIES.filter((a) => isTea(a) && !comingSoon(a) && !a.soldOut);
    const art = $("[data-tea-finder-art]");
    if (art) art.innerHTML = tinArt(teaFace());
    const TYPE_HINTS = {
      Green: "Fresh, grassy, gently sweet",
      Matcha: "Stone-ground green tea, whisked",
      "White & Yellow": "Delicate, soft, honeyed",
      Oolong: "Floral to toasty, in between green and black",
      Black: "Malty, round, fuller",
      Puerh: "Earthy, deep, aged",
      Herbal: "No tea leaf, caffeine free",
    };
    // Cultivars of the teas on sale (js/tea.js), for the cultivar question; any in the guide can be typed.
    const allCultivars = (typeof TEA_CULTIVARS === "undefined" ? [] : TEA_CULTIVARS).flatMap((g) => g.entries.map((e) => ({ ...e, country: g.country })));
    const cultivarOf = (id) => allCultivars.find((e) => e.id === id);
    const fold = (t) => String(t || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9\u3040-\u9fff]+/g, "");
    const typedCultivar = (text) => {
      const t = fold(text);
      return allCultivars.find((e) => [e.name, e.native, e.gloss, e.id].some((x) => x && fold(x) === t)) || allCultivars.find((e) => fold(e.name).startsWith(t) && t.length >= 3) || null;
    };
    const cultivarsFor = (kind) =>
      [...new Set(teas().filter((a) => !kind || kind === "any" || a.type === kind).map((a) => a.cultivar).filter(Boolean))].map(cultivarOf).filter(Boolean);
    const QUESTIONS: any[] = [
      {
        id: "when",
        title: "When do you drink tea?",
        options: [
          ["morning", "In the morning", "A gentle lift to start the day"],
          ["afternoon", "In the afternoon", "A mild pick-me-up"],
          ["evening", "In the evening", "Winding down, no caffeine"],
          ["any", "Any time", "Caffeine or not, either is fine"],
        ],
      },
      {
        id: "type",
        title: "What kind of tea?",
        // Only the kinds there's a tea of, on sale now.
        options: () => [...TEA_TYPES.filter((t) => teas().some((a) => a.type === t)).map((t) => [t, t, TYPE_HINTS[t]]), ["any", "Not sure"]],
      },
      {
        id: "taste",
        title: "What do you like in a cup?",
        // The flavors that kind of tea is known for (any kind's, when they're not sure).
        options: () => (FLAVORS_BY_KIND[answers.type] || FLAVORS_BY_KIND.any).map((id) => [id, ...FLAVORS[id].slice(0, 2)]),
      },
      {
        id: "cultivar",
        title: "Any cultivar you love?",
        // The cultivars of teas of the kind they chose, or any other typed in (not for herbal tea).
        options: () => [...cultivarsFor(answers.type).map((e) => [e.id, e.name, e.country]), ["any", "No preference"]],
        typed: true,
        skip: () => answers.type === "Herbal" || !allCultivars.length,
      },
      {
        id: "amount",
        title: "How much tea do you drink?",
        options: [
          ["daily", "A cup a day", "8 cups every week"],
          ["often", "A few cups a week", "8 cups every 2 weeks"],
          ["sometimes", "Now and then", "8 cups every month"],
        ],
      },
    ].filter(Boolean);
    // Read from each tea's own notes, ingredients and kind, so a new tea fits in without changes here.
    // Flavors, each read from a tea's own notes, ingredients and kind (so a new tea fits in without
    // changes here): [label, hint, what to look for].
    const FLAVORS = {
      grassy: ["Fresh and grassy", "Green, bright, just-picked", /grass|green|fresh|vegetal|spring|sencha/i],
      umami: ["Savory and sweet", "Rich, brothy umami", /umami|savory|brothy|sweet|seaweed/i],
      nutty: ["Toasty and nutty", "Roasted, like hojicha or genmaicha", /toast|roast|nut|rice|hojicha|genmai/i],
      creamy: ["Creamy and rich", "Smooth, thick, a little sweet", /cream|milk|butter|rich|velvet|sweet/i],
      floral: ["Floral", "Orchid, blossom, jasmine", /floral|flower|blossom|orchid|jasmine|rose|lavender/i],
      honey: ["Honeyed and soft", "Hay, honey, gentle", /honey|hay|soft|delicate|sweet/i],
      fruity: ["Fruity and bright", "Stone fruit, berries, muscatel", /fruit|peach|apricot|berr|muscat|plum|apple|grape|citrus/i],
      roasted: ["Roasted and deep", "Charcoal-baked, caramel", /roast|toast|charcoal|caramel|baked|smok/i],
      mineral: ["Mineral", "Rock, stone, clean", /mineral|rock|stone|wet stone/i],
      malty: ["Malty and toasty", "Bread, cocoa, warm", /malt|toast|bread|cocoa|caramel|burdock|roast/i],
      smoky: ["Smoky", "Pine smoke, campfire", /smok|pine|campfire|lapsang/i],
      earthy: ["Earthy and deep", "Forest floor, wood, aged", /earth|forest|wood|musk|aged|burdock/i],
      woody: ["Woody and spiced", "Warm wood, sweet spice", /wood|spice|cinnamon|clove|cedar|kuromoji/i],
      citrus: ["Citrus and bright", "Peel, zest, lemony", /citrus|lemon|yuzu|orange|peel|chinpi|bergamot/i],
      herbal: ["Herbal and calming", "Leaves, roots, flowers", /herb|shiso|mint|chamomile|root|leaf|leaves|calm/i],
    };
    const FLAVORS_BY_KIND = {
      Green: ["grassy", "umami", "nutty", "floral"],
      Matcha: ["umami", "creamy", "grassy"],
      "White & Yellow": ["honey", "floral", "fruity"],
      Oolong: ["floral", "creamy", "roasted", "mineral"],
      Black: ["malty", "fruity", "smoky", "earthy"],
      Puerh: ["earthy", "woody", "honey"],
      Herbal: ["woody", "citrus", "floral", "herbal"],
      any: ["malty", "woody", "citrus", "grassy", "floral"],
    };
    // 0 caffeine free, 1 mild, 2 full.
    const caffeine = (a) => (/free/i.test(a.caffeine || "") || a.type === "Herbal" ? 0 : /mild|low/i.test(a.caffeine || "") ? 1 : 2);
    const WANT = { morning: [2, 1, 0], afternoon: [1, 1.5, 1], evening: [-3, -1, 3], any: [0, 0, 0] };
    const FREQ = { daily: "weekly", often: "biweekly", sometimes: "monthly" };
    const answers: any = {};
    let step = 0;
    // From the "describe it" box: Claude's picks (ids, best first) and why, in their language.
    let described = null;
    // The questions asked, as things stand (the cultivar question goes when there's none to ask).
    const asked = () => {
      const list = QUESTIONS.filter((q) => !q.skip?.());
      for (const q of QUESTIONS) if (!list.includes(q)) delete answers[q.id];
      return list;
    };
    const match = () => {
      const text = (a) => [a.notes, a.type, a.blend, ...(a.ingredients || []).flat()].join(" ");
      const score = (a) =>
        (WANT[answers.when] || WANT.any)[caffeine(a) === 2 ? 0 : caffeine(a) === 1 ? 1 : 2] +
        (FLAVORS[answers.taste]?.[2].test(text(a)) ? 2 : 0) +
        (a.type === answers.type ? 5 : 0) +
        (answers.cultivar && a.cultivar === answers.cultivar ? 3 : 0);
      return teas().map((a) => ({ a, s: score(a) })).sort((x, y) => y.s - x.s).map((x) => x.a);
    };

    const render = () => {
      const shown = asked();
      if (step < shown.length) {
        const q = shown[step];
        const options = typeof q.options === "function" ? q.options() : q.options;
        root.innerHTML = `
          <div class="finder-step" data-reveal>
            <p class="finder-count">${step + 1} of ${shown.length}</p>
            <h2>${q.title}</h2>
            <div class="finder-options">
              ${options
                .map(([id, label, hint]) => `<button type="button" class="finder-option${answers[q.id] === id ? " is-picked" : ""}" data-answer="${id}"><strong>${label}</strong>${hint ? `<span>${hint}</span>` : ""}</button>`)
                .join("")}
            </div>
            ${
              q.typed
                ? `<form class="finder-describe finder-typed" data-typed novalidate>
              <label for="finder-typed">Or type a cultivar</label>
              <div class="finder-typed-row">
                <input id="finder-typed" name="cultivar" list="finder-cultivars" autocomplete="off" autocapitalize="words" maxlength="60" placeholder="Tie Guan Yin" value="${esc(answers.cultivarName || "")}">
                <button type="submit" class="button">Next</button>
              </div>
              <datalist id="finder-cultivars">${allCultivars.map((e) => `<option value="${esc(e.name)}">${esc(e.country)}</option>`).join("")}</datalist>
              <p class="finder-describe-status" data-typed-status role="status"></p>
            </form>`
                : ""
            }
            ${step ? `<button type="button" class="link-button finder-back" data-back>Back</button>` : ""}
          </div>
          ${
            step
              ? ""
              : `<form class="finder-describe" data-describe data-reveal novalidate>
            <label for="finder-text">Or describe it in your own words</label>
            <textarea id="finder-text" name="text" rows="1" maxlength="600" placeholder="Something calming for the evening, a little citrusy">${esc(described?.text || "")}</textarea>
            <input class="visually-hidden" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button type="submit" class="button">Find my tea</button>
            <p class="finder-describe-status" data-describe-status role="status"></p>
          </form>`
          }`;
        observeReveals();
        return;
      }
      const picked = described?.picks?.map((id) => teas().find((a) => a.id === id)).filter(Boolean) || [];
      const [best, ...rest] = picked.length ? [...picked, ...match().filter((a) => !picked.includes(a))] : match();
      if (!best) {
        root.innerHTML = `<p>Our teas are sold out right now. Check back soon.</p>`;
        return;
      }
      const f = SUBSCRIPTION.frequencies.find((x) => x.id === (FREQ[answers.amount] || "biweekly"));
      const sub = subscriptionPrice(subscriptionCoffee(`t:${best.id}`), "8cups");
      root.innerHTML = `
        <div class="finder-result" data-reveal>
          <p class="finder-count">Your tea</p>
          <div class="finder-match">
            <a class="finder-art" href="products/${encodeURIComponent(best.id)}">${tinArt(best)}</a>
            <div class="finder-copy">
              <p class="muted">${[best.blend, best.caffeine].filter(Boolean).map(esc).join(" · ")}</p>
              <h2>${esc(best.short || best.name)}</h2>
              ${best.notes ? `<p class="finder-notes">${esc(best.notes)}</p>` : ""}
              ${picked.length && described.reason ? `<p class="finder-amount finder-reason">${esc(described.reason)}</p>` : ""}
              ${answers.when === "evening" && caffeine(best) > 0 ? `<p class="finder-amount">This one has caffeine.${teas().some((a) => caffeine(a) === 0) ? ` For evenings, try ${esc((teas().find((a) => caffeine(a) === 0).short || teas().find((a) => caffeine(a) === 0).name))}.` : ""}</p>` : ""}
              ${(() => {
                // A cultivar they typed that no tea on sale is made from.
                if (!answers.cultivarName || teas().some((a) => a.cultivar === answers.cultivar)) return "";
                const e = cultivarOf(answers.cultivar);
                return `<p class="finder-amount">We don't carry ${esc(answers.cultivarName)} yet.${e ? ` <a href="${esc(cultivarGuideHref(e))}">About ${esc(e.name)}</a>` : ""}</p>`;
              })()}
              <div class="finder-actions">
                ${sub ? `<button type="button" class="button" data-finder-sub>Subscribe · 8 cups · ${money(sub.price)} ${esc((f?.note || "").toLowerCase())}</button>` : ""}
                <button type="button" class="button is-outline" data-finder-once>Buy once · 8 cups · ${money(best.price)}</button>
                <a class="finder-link" href="products/${encodeURIComponent(best.id)}">See this tea</a>
              </div>
            </div>
          </div>
          ${
            rest.length
              ? `<p class="finder-count finder-also">Also try</p>
                 <ul class="finder-also-list">${rest
                   .slice(0, 2)
                   .map((a) => `<li><a href="products/${encodeURIComponent(a.id)}"><span class="finder-thumb">${tinArt(a)}</span><span><strong>${esc(a.short || a.name)}</strong><small>${esc(a.blend || a.type)} · ${esc(a.notes || "")}</small></span></a></li>`)
                   .join("")}</ul>`
              : ""
          }
          <button type="button" class="link-button finder-back" data-restart>Start again</button>
        </div>`;
      observeReveals();
      const subBtn = $("[data-finder-sub]");
      if (subBtn)
        subBtn.onclick = () =>
          addLine({
            key: `sub:t:${best.id}:8cups:${f.id}:me`,
            kind: "sub",
            title: `${best.short || best.name} Subscription`,
            variant: `${best.pack} · ${f.label}`,
            gift: false,
            sub: { coffee: `t:${best.id}`, size: "8cups", freq: f.id, gift: false, recipient: "", note: "" },
            price: sub.price,
            qty: 1,
          });
      $("[data-finder-once]").onclick = () => addLine(accessoryLine(best));
    };

    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-answer]");
      // A second click before the next question shows (a double click) would answer it unseen.
      if (a && a.closest(".is-answered")) return;
      if (a) {
        a.parentElement.classList.add("is-answered");
        const q = asked()[step];
        // A new kind changes the flavors (and cultivars) on offer: those answers start over.
        if (q.id === "type" && answers.type !== a.dataset.answer) ["taste", "cultivar", "cultivarName"].forEach((k) => delete answers[k]);
        if (q.id === "cultivar") delete answers.cultivarName;
        answers[q.id] = a.dataset.answer;
        a.classList.add("is-picked");
        step += 1;
        setTimeout(render, 180); // a beat to show the choice
        return;
      }
      if (e.target.closest("[data-back]")) {
        step = Math.max(0, step - 1);
        render();
      }
      if (e.target.closest("[data-restart]")) {
        step = 0;
        described = null;
        Object.keys(answers).forEach((k) => delete answers[k]);
        render();
      }
    });
    // The free-text box starts one line tall and grows with what's typed.
    const grow = (box) => {
      box.style.height = "auto";
      box.style.height = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`;
    };
    root.addEventListener("input", (e) => e.target.id === "finder-text" && grow(e.target));
    // Any language in, the same result page out.
    // A cultivar typed in: one from the guide, or their own words.
    root.addEventListener("submit", (e) => {
      const form = e.target.closest("[data-typed]");
      if (!form) return;
      e.preventDefault();
      const text = form.cultivar.value.trim();
      if (!text) {
        // The message on the line below the row (red box and shake as elsewhere).
        const status = $("[data-typed-status]", form);
        status.classList.add("is-error");
        status.textContent = "Type a cultivar, or pick one above.";
        form.cultivar.setAttribute("aria-invalid", "true");
        form.cultivar.classList.remove("is-shaking");
        void form.cultivar.offsetWidth;
        form.cultivar.classList.add("is-shaking");
        form.cultivar.focus();
        form.cultivar.addEventListener("input", () => (status.textContent = "", form.cultivar.removeAttribute("aria-invalid")), { once: true });
        return;
      }
      const entry = typedCultivar(text);
      answers.cultivar = entry?.id || "other";
      answers.cultivarName = entry?.name || text;
      step += 1;
      render();
    });
    root.addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-describe]");
      if (!form) return;
      e.preventDefault();
      const text = form.text.value.trim();
      const status = $("[data-describe-status]", form);
      const button = $("button[type=submit]", form);
      status.classList.remove("is-error");
      if (text.length < 3) {
        status.classList.add("is-error");
        status.textContent = "Tell us a little about the tea you like.";
        flagFields(form, "", [form.text]);
        return;
      }
      button.disabled = true;
      status.textContent = "Finding your tea…";
      try {
        const res = await guardedFetch("/api/finder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind: "tea", text, website: form.website.value }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "That didn't work.");
        if (!data.picks?.length) {
          status.classList.add("is-error");
          status.textContent = data.reason || "No match. Try describing flavors you like.";
          return;
        }
        described = { text, picks: data.picks, reason: data.reason };
        Object.keys(answers).forEach((k) => delete answers[k]);
        if (data.when && data.when !== "any") answers.when = data.when;
        answers.amount = data.amount === "unknown" ? "often" : data.amount;
        step = Infinity;
        render();
        root.scrollIntoView({ block: "start" });
      } catch (error) {
        status.classList.add("is-error");
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    render();
  },

  finder() {
    const root = $("[data-finder]");
    const QUESTIONS: any[] = [
      {
        id: "brew",
        title: "How do you brew?",
        options: [
          ["espresso", "Espresso machine"],
          ["filter", "Pour-over or drip", "V60, Chemex, Kalita, a drip machine"],
          ["immersion", "AeroPress or French press"],
          ["any", "Not sure yet"],
        ],
      },
      {
        id: "taste",
        title: "What flavors do you enjoy?",
        options: [
          ["fruity", "Fruity and bright", "Berries, citrus, stone fruit"],
          ["floral", "Floral and tea-like", "Jasmine, blossom, bergamot"],
          ["sweet", "Chocolatey and sweet", "Cocoa, caramel, nuts"],
          ["smooth", "Smooth, low in acidity", "Mellow and round, not bright or tangy"],
        ],
      },
      {
        id: "amount",
        title: "How much coffee do you drink?",
        options: [
          ["light", "A cup a day"],
          ["medium", "Two or three cups a day"],
          ["heavy", "A whole household of coffee drinkers"],
        ],
      },
    ];
    const NOTES = {
      fruity: /berr|cherry|citrus|orange|lemon|lime|grapefruit|mango|peach|apricot|plum|apple|grape|strawberr|pineapple|tropical|fruit|raisin/i,
      floral: /jasmine|floral|blossom|rose|tea|bergamot|lavender|hibiscus|honeysuckle|elderflower|honey/i,
      sweet: /chocolate|cocoa|caramel|toffee|hazelnut|almond|walnut|nut|molasses|brown sugar|vanilla|praline/i,
    };
    // Low acidity: no single tasting note says it, so it's read from the coffee itself. Chocolate
    // and nut notes, natural or pulped-natural processing and lower altitudes all point to a
    // gentler cup; citrus and other sharp fruit point the other way.
    const BRIGHT = /lemon|lime|grapefruit|citrus|orange(?! blossom)|green apple|green grape|currant|cranberr/i;
    const altitude = (p) => Number(String(p.altitude || "").replace(/,/g, "").match(/\d+/)?.[0]) || 0;
    const gentle = (p) =>
      (NOTES.sweet.test(p.notes || "") ? 2 : 0) +
      (/natural|pulped|honey/i.test(p.process || "") ? 1 : 0) +
      (altitude(p) && altitude(p) < 1500 ? 1.5 : 0) -
      (BRIGHT.test(p.notes || "") ? 1.5 : 0);
    const AMOUNT = { light: { size: "250g", freq: "biweekly" }, medium: { size: "250g", freq: "weekly" }, heavy: { size: "1kg", freq: "biweekly" } };
    const answers: any = {};
    let step = 0;
    // From the "describe it" box: Claude's picks (ids, best first) and why, in their language.
    let described = null;

    const isDecaf = (p) => /decaf/i.test(`${p.name} ${p.tag || ""}`);
    const match = () => {
      const type = answers.brew === "espresso" ? "Espresso" : answers.brew === "filter" || answers.brew === "immersion" ? "Filter" : null;
      // Matched by flavour, so decaf (chosen for being decaf, not its taste) stays out of it.
      const pool = PRODUCTS.filter((p) => !p.soldOut && !isDecaf(p));
      const smooth = answers.taste === "smooth";
      const flavour = (p) => (smooth ? gentle(p) * 0.65 : NOTES[answers.taste]?.test(p.notes || "") ? 3 : 0);
      // The brewer comes first (an espresso roast for an espresso machine), then flavor.
      const score = (p) => (type && p.type === type ? 10 : 0) + flavour(p) + (p.labels || []).length * 0.1;
      return (pool.length ? pool : PRODUCTS.filter((p) => !p.soldOut)).map((p) => ({ p, s: score(p) })).sort((a, b) => b.s - a.s).map((x) => x.p);
    };

    // A typed-in match, side by side: what they asked for (a coffee from elsewhere, or their own
    // words) mirrored against ours, each trait marked = same, ≈ close or ≠ different between.
    // Ours sits in its bag label's color.
    const TRAITS = { origin: "Origin", process: "Process", notes: "Tasting notes", roast: "Roast" };
    const MARK = { same: ["=", "Same"], close: ["≈", "Close"], different: ["≠", "Different"] };
    const pairCard = (best) => {
      const pair = described?.pair;
      if (!pair?.rows?.length) return described?.reason ? `<p class="finder-amount finder-reason">${esc(described.reason)}</p>` : "";
      const said = described.text.length > 48 ? `${described.text.slice(0, 46).trimEnd()}…` : described.text;
      const head = pair.name ? `${pair.roaster ? `<small>${esc(pair.roaster)}</small>` : ""}<b>${esc(pair.name)}</b>` : `<b>“${esc(said)}”</b>`;
      const rows = pair.rows
        .map(
          (r, n) => `<span class="pair-cell is-theirs" style="grid-row:${n + 2}">${esc(r.theirs)}</span>
          <span class="pair-mark is-${r.match}" style="grid-row:${n + 2}"><small>${TRAITS[r.trait]}</small><i aria-hidden="true">${MARK[r.match][0]}</i><span class="visually-hidden">${MARK[r.match][1]}</span></span>
          <span class="pair-cell is-ours" style="grid-row:${n + 2}">${esc(r.ours)}</span>`
        )
        .join("");
      return `<div class="pair" data-reveal style="--label:${esc(best.color || "#d8d2c4")};--label-ink:${inkOn(best.color)};--rows:${pair.rows.length}">
        <span class="pair-side is-theirs" aria-hidden="true"></span><span class="pair-side is-ours" aria-hidden="true"></span>
        <span class="pair-head is-theirs">${head}</span>
        <span class="pair-head is-ours"><small>${esc(SITE.name)}</small><b>${esc(best.short || pair.ours)}</b></span>
        ${rows}
      </div>`;
    };

    const render = () => {
      // The result on its own (a phone drops the photo and title above it, styles.css).
      root.closest(".finder-page")?.classList.toggle("is-result", step >= QUESTIONS.length);
      if (step < QUESTIONS.length) {
        const q = QUESTIONS[step];
        root.innerHTML = `
          <div class="finder-step" data-reveal>
            <p class="finder-count">${step + 1} of ${QUESTIONS.length}</p>
            <h2>${q.title}</h2>
            <div class="finder-options">
              ${q.options
                .map(([id, label, hint]) => `<button type="button" class="finder-option${answers[q.id] === id ? " is-picked" : ""}" data-answer="${id}"><strong>${label}</strong>${hint ? `<span>${hint}</span>` : ""}</button>`)
                .join("")}
            </div>
            ${step ? `<button type="button" class="link-button finder-back" data-back>Back</button>` : ""}
          </div>
          ${
            step
              ? ""
              : `<form class="finder-describe" data-describe data-reveal novalidate>
            <label for="finder-text">Or describe a coffee you love</label>
            <textarea id="finder-text" name="text" rows="1" maxlength="600" placeholder="Smooth and chocolatey, not too acidic">${esc(described?.text || "")}</textarea>
            <input class="visually-hidden" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
            <button type="submit" class="button">Find my coffee</button>
            <p class="finder-describe-status" data-describe-status role="status"></p>
          </form>`
          }`;
        observeReveals();
        return;
      }
      const picked = described?.picks?.map((id) => PRODUCTS.find((p) => p.id === id)).filter((p) => p && !p.soldOut) || [];
      const [best, ...rest] = picked.length ? [...picked, ...match().filter((p) => !picked.includes(p))] : match();
      if (!best) {
        root.innerHTML = `<p>Every coffee is sold out right now. Check back soon.</p>`;
        return;
      }
      const { size, freq } = AMOUNT[answers.amount] || AMOUNT.light;
      const f = SUBSCRIPTION.frequencies.find((x) => x.id === freq);
      const sub = subscriptionPrice(subscriptionCoffee(`p:${best.id}`), size);
      const once = size === "1kg" ? best.price1kg : best.price;
      // Ground for how they brew, when it's offered (an espresso machine, pour-over or drip);
      // whole bean otherwise (an AeroPress or French press wants a grind we don't offer).
      const grinds = grindsFor(best);
      const want = answers.brew === "espresso" ? "Espresso" : answers.brew === "filter" ? "Filter" : "Whole Bean";
      const grind0 = grinds.includes(want) ? want : "Whole Bean";
      root.innerHTML = `
        <div class="finder-result" data-reveal>
          <p class="finder-count">Your match</p>
          <div class="finder-match">
            <a class="finder-art" href="products/${encodeURIComponent(best.id)}">${productArt(best)}</a>
            <div class="finder-copy">
              <p class="muted">${esc(best.type)} roast</p>
              <h2>${esc(bareName(best.name))}</h2>
              ${best.notes && !(picked[0] === best && described?.pair?.rows?.some((r) => r.trait === "notes")) ? `<p class="finder-notes">${esc(best.notes)}</p>` : ""}
              ${picked.length ? pairCard(best) : ""}
              ${!picked.length && answers.taste === "smooth" && gentle(best) > 1 ? `<p class="finder-amount">Our smoothest coffee.</p>` : ""}
              ${
                grinds.length > 1
                  ? `<fieldset class="options finder-grind"><legend>Grind</legend>${grinds
                      .map((g) => `<label><input type="radio" name="finder-grind" value="${esc(g)}"${g === grind0 ? " checked" : ""}><span>${esc(g)}</span></label>`)
                      .join("")}</fieldset>`
                  : ""
              }
              <div class="finder-actions">
                <button type="button" class="button" data-finder-sub>Subscribe · ${size} · ${money(sub.price)} ${esc((f?.note || "").toLowerCase())}</button>
                <button type="button" class="button is-outline" data-finder-once>Buy Once · ${size} · ${money(once)}</button>
                <a class="finder-link" href="products/${encodeURIComponent(best.id)}">See This Coffee</a>
              </div>
            </div>
          </div>
          ${
            rest.length
              ? `<p class="finder-count finder-also">Also try</p>
                 <ul class="finder-also-list">${rest
                   .slice(0, 2)
                   .map((p) => `<li><a href="products/${encodeURIComponent(p.id)}"><span class="finder-thumb">${productArt(p)}</span><span><strong>${esc(p.short || p.name)}</strong><small>${esc(p.type)} · ${esc(p.notes || "")}</small></span></a></li>`)
                   .join("")}</ul>`
              : ""
          }
          <button type="button" class="link-button finder-back" data-restart>Start again</button>
        </div>`;
      observeReveals();
      const grind = () => $("input[name=finder-grind]:checked", root)?.value || grind0;
      $("[data-finder-sub]").onclick = () => {
        const name = best.short || best.name;
        addLine({
          key: `sub:p:${best.id}:${size}:${freq}:${grind()}:me`,
          kind: "sub",
          title: `${name} Subscription`,
          variant: `${size} · ${grind()} · ${f.label}`,
          gift: false,
          sub: { coffee: `p:${best.id}`, size, freq, grind: grind(), gift: false, recipient: "", note: "" },
          price: sub.price,
          image: best.image,
          color: best.color,
          qty: 1,
        });
      };
      $("[data-finder-once]").onclick = () => addLine(coffeeLine(best, size, grind()));
    };

    root.addEventListener("click", (e) => {
      const a = e.target.closest("[data-answer]");
      if (a && a.closest(".is-answered")) return; // a double click: the next question isn't up yet
      if (a) {
        a.parentElement.classList.add("is-answered");
        answers[QUESTIONS[step].id] = a.dataset.answer;
        a.classList.add("is-picked");
        step += 1;
        setTimeout(render, 180); // a beat to show the choice
        return;
      }
      if (e.target.closest("[data-back]")) {
        step = Math.max(0, step - 1);
        render();
      }
      if (e.target.closest("[data-restart]")) {
        step = 0;
        described = null;
        Object.keys(answers).forEach((k) => delete answers[k]);
        render();
      }
    });
    // The free-text box starts one line tall and grows with what's typed (Return adds a line).
    const grow = (box) => {
      box.style.height = "auto";
      box.style.height = `${box.scrollHeight + box.offsetHeight - box.clientHeight}px`;
    };
    root.addEventListener("input", (e) => e.target.id === "finder-text" && grow(e.target));
    new MutationObserver(() => {
      const box = $("#finder-text", root);
      if (box?.value) grow(box);
    }).observe(root, { childList: true });
    // The free-text box: any language in, the same result page out.
    root.addEventListener("submit", async (e) => {
      const form = e.target.closest("[data-describe]");
      if (!form) return;
      e.preventDefault();
      const text = form.text.value.trim();
      const status = $("[data-describe-status]", form);
      const button = $("button[type=submit]", form);
      status.classList.remove("is-error");
      if (text.length < 3) {
        status.classList.add("is-error");
        status.textContent = "Tell us a little about the coffee you like.";
        flagFields(form, "", [form.text]);
        return;
      }
      button.disabled = true;
      status.textContent = "Finding your coffee…";
      try {
        const res = await guardedFetch("/api/finder", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, website: form.website.value }) });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "That didn't work.");
        if (!data.picks?.length) {
          status.classList.add("is-error");
          status.textContent = data.reason || "No match. Try describing flavors you like.";
          return;
        }
        described = { text, picks: data.picks, reason: data.reason, pair: data.pair || null };
        if (data.brew && data.brew !== "any") answers.brew = data.brew;
        answers.amount = data.amount === "unknown" ? "light" : data.amount;
        step = QUESTIONS.length;
        render();
        root.scrollIntoView({ block: "start" });
      } catch (error) {
        status.classList.add("is-error");
        status.textContent = error.message;
      } finally {
        button.disabled = false;
      }
    });
    render();
  },

  async locations() {
    const render = () => {
      $("[data-locations]").innerHTML = LOCATIONS.map((l, i) => {
        const st = openStatus(l);
        return `
        <li class="location" id="${esc(l.id)}" data-reveal style="--i:${i}">
          <div class="location-image">
            <img src="${esc(l.photo || `assets/${l.id}.jpg`)}" alt="" loading="lazy" onerror="this.onerror = () => this.parentNode.remove(); this.src = 'assets/cortado.jpg'">
          </div>
          <div class="location-name"><h2>${esc(l.name)}</h2><p class="muted">${esc(l.kind)}</p></div>
          <address>${l.address.map(esc).join("<br>")}</address>
          <p class="status"><i class="dot${st.open ? " is-open" : ""}"></i>${esc(st.text)}</p>
          <p class="location-links">
            <a href="${gmaps.directions(l)}" target="_blank" rel="noopener">Directions</a>
            ${l.cafe === false ? "" : `<a href="order?location=${encodeURIComponent(l.id)}">Order Ahead</a>`}
          </p>
          <details class="location-hours"><summary>Opening hours</summary>${hoursTable(l)}</details>
        </li>`;
      }).join("");
      observeReveals();
    };
    render();
    const before = JSON.stringify(LOCATIONS.map((l) => l.coords));
    await locationsReady;
    if (JSON.stringify(LOCATIONS.map((l) => l.coords)) !== before) render();
  },

  faq() {
    pages.ask();
    $("[data-faq]").innerHTML = FAQ.filter((f) => (f[2] !== "cafes" || SITE.cafesLive) && (f[2] !== "calendar" || SITE.calendar?.classes || SITE.calendar?.events)).map(
      ([q, a], i) => `
      <details class="faq-item" data-reveal style="--i:${i % 4}">
        <summary><span>${esc(q)}</span><i aria-hidden="true"></i></summary>
        <div class="faq-answer"><p>${esc(a)}</p></div>
      </details>`
    ).join("");
  },

  ask() {
    const form = $("[data-ask-form]");
    if (!form) return;
    const thread = $("[data-ask-thread]");
    const input = form.q;
    const button = $("button", form);
    const history = []; // { role, content } sent to /api/ask so follow-ups have context
    let busy = false;

    // The question shows as one FAQ row, open, with the answer streaming in.
    // A new question replaces it, so the list never grows; earlier turns are
    // still sent as context, so follow-ups make sense.
    const addRow = (question) => {
      const item = document.createElement("details");
      item.className = "faq-item faq-item--asked";
      item.open = true;
      item.innerHTML = `<summary><span></span><i aria-hidden="true"></i></summary><div class="faq-answer"><p class="is-typing"></p></div>`;
      $("summary span", item).textContent = question;
      thread.replaceChildren(item);
      return $(".faq-answer p", item);
    };

    async function ask(question) {
      question = question.trim();
      if (!question || busy) return;
      busy = true;
      button.disabled = input.disabled = true;
      input.value = "";

      const answer = addRow(question);
      history.push({ role: "user", content: question });

      let text = "";
      try {
        const res = await guardedFetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: history.slice(-10) }),
        });
        if (!res.ok || !res.body) {
          const msg = res.status === 404 || res.status === 405
            ? `Questions aren't available right now. Email us at ${SITE.email}.`
            : (await res.text().then((t) => { try { return JSON.parse(t).error; } catch { return t; } })) || "Something went wrong. Try again.";
          throw new Error(msg);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          text += decoder.decode(value, { stream: true });
          answer.classList.remove("is-typing");
          answer.textContent = answerParts(text).text;
        }
        text += decoder.decode();
        const parts = answerParts(text);
        answer.textContent = parts.text;
        answer.insertAdjacentHTML("afterend", cardRail(parts.ids) + askChips(parts.asks));
        history.push({ role: "assistant", content: parts.text });
        input.placeholder = "Ask a follow-up or a new question…";
      } catch (err) {
        answer.classList.add("is-error");
        answer.textContent = err.message && !/fetch|network/i.test(err.message)
          ? err.message
          : `Couldn't answer just now. Try again, or email us at ${SITE.email}.`;
        history.pop(); // drop the unanswered question so the next request stays valid
      } finally {
        answer.classList.remove("is-typing");
        busy = false;
        button.disabled = input.disabled = false;
        input.focus({ preventScroll: true });
      }
    }

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      ask(input.value);
    });
    thread.addEventListener("click", (e) => {
      const chip = e.target.closest("[data-ask-chip]");
      if (chip) ask(chip.textContent);
    });

    // "Talk to a person": the chat window, with the questions so far.
    $("[data-handoff-open]")?.addEventListener("click", () => openChat({ transcript: history, person: true }));
  },

  // The calendar: a month to page through, events and classes on their days, and a list of what's
  // coming up. Tapping one opens it in a pop-up with the details and Buy Ticket (or Reserve, or the
  // organiser's link). /calendar/<slug> (or the older ?event=<id>) opens one straight away.
  async calendar() {
    const root = $("[data-calendar]");
    let data;
    try {
      data = await api("/api/calendar");
    } catch {
      root.innerHTML = `<p class="cal-empty">The calendar isn't available right now. Please try again in a moment.</p>`;
      return;
    }
    const items = [...data.upcoming, ...(data.classes || [])].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const locale = LANG === "en" ? "en-US" : LANG;
    const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const today = ymd(new Date());
    // Every day an item is on (a festival runs over several).
    const daysOf = (x) => {
      const out = [];
      const end = (x.endsAt || x.startsAt).slice(0, 10);
      for (let d = new Date(`${x.startsAt.slice(0, 10)}T12:00:00`); ymd(d) <= end && out.length < 31; d.setDate(d.getDate() + 1)) out.push(ymd(d));
      return out;
    };
    const byDay = new Map();
    for (const x of items) for (const d of daysOf(x)) byDay.set(d, [...(byDay.get(d) || []), x]);
    const priceLabel = (x) => (x.full ? "Full" : x.booking === "pay" ? money(x.price) : x.booking === "reserve" ? "Free" : "");
    const longDay = (key) => new Date(`${key}T12:00:00`).toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric" });

    // The months to page through: from the first coming up (or this month) to the last.
    const first = new Date(`${(items[0]?.startsAt || today).slice(0, 7)}-01T12:00:00`);
    const last = new Date(`${(items.at(-1)?.endsAt || items.at(-1)?.startsAt || today).slice(0, 7)}-01T12:00:00`);
    let month = new Date(first);
    let picked = ""; // a day tapped on the month: the list shows just that day
    const monthGrid = () => {
      const start = new Date(month);
      start.setDate(1 - start.getDay()); // back to Sunday
      const cells = [];
      for (let i = 0; i < 42; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        if (i >= 35 && d.getMonth() !== month.getMonth()) break; // no empty last row
        const key = ymd(d);
        const on = byDay.get(key) || [];
        const cls = `cal-day${d.getMonth() !== month.getMonth() ? " is-other" : ""}${key === today ? " is-today" : ""}${key < today ? " is-gone" : ""}`;
        const dots = on.length ? `<span class="cal-dots" aria-hidden="true">${on.slice(0, 3).map((x) => `<i${x.kind === "class" ? ' class="is-class"' : ""}></i>`).join("")}</span>` : "";
        cells.push(
          on.length
            ? `<button type="button" class="${cls} has-items" data-cal-day="${key}" aria-pressed="${key === picked}" aria-label="${esc(longDay(key))}: ${on.length} ${on.length === 1 ? "event" : "events"}"><span class="cal-day-num">${d.getDate()}</span>${dots}</button>`
            : `<span class="${cls}"><span class="cal-day-num">${d.getDate()}</span></span>`
        );
      }
      const weekdays = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 4 + i).toLocaleDateString(locale, { weekday: "narrow" }));
      return `
        <header class="cal-month-head">
          <h2>${esc(month.toLocaleDateString(locale, { month: "long", year: "numeric" }))}</h2>
          <div class="cal-month-nav">
            <button type="button" class="icon-button" data-cal-month="-1" aria-label="Previous month" ${month <= first ? "disabled" : ""}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5"/></svg></button>
            <button type="button" class="icon-button" data-cal-month="1" aria-label="Next month" ${month >= last ? "disabled" : ""}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5"/></svg></button>
          </div>
        </header>
        <div class="cal-weekdays" aria-hidden="true">${weekdays.map((w) => `<span>${esc(w)}</span>`).join("")}</div>
        <div class="cal-days">${cells.join("")}</div>`;
    };
    // One row each: photo (or the date), title, when and where, price.
    const rowInner = (x) => `
        <span class="cal-art cal-art-thumb">${calArt(x)}</span>
        <span class="cal-row-text"><strong>${esc(x.title)}</strong><small>${esc([x.kind === "class" ? "Class" : "", calWhen(x)].filter(Boolean).join(" · "))}</small>${x.place ? `<small>${esc(x.place)}</small>` : ""}</span>`;
    const agendaRow = (x) => `<li><button type="button" class="cal-row" data-cal-open="${esc(x.id)}">${rowInner(x)}<span class="cal-row-price${x.full ? " is-full" : ""}">${esc(priceLabel(x))}</span></button></li>`;
    const list = () => {
      if (!items.length) return `<h2 class="cal-heading">Coming Up</h2><p class="cal-empty">Nothing on the calendar right now.</p>`;
      if (picked) {
        return `<div class="cal-list-head"><h2 class="cal-heading">${esc(longDay(picked))}</h2><button type="button" class="link-button" data-cal-all>Show All</button></div>
          <ul class="cal-rows">${(byDay.get(picked) || []).map(agendaRow).join("")}</ul>`;
      }
      const groups = new Map();
      for (const x of items) {
        const m = x.startsAt.slice(0, 7);
        groups.set(m, [...(groups.get(m) || []), x]);
      }
      return `<h2 class="cal-heading">Coming Up</h2>${[...groups]
        .map(([m, xs]) => `<h3 class="cal-group">${esc(new Date(`${m}-01T12:00:00`).toLocaleDateString(locale, { month: "long" }))}</h3><ul class="cal-rows">${xs.map(agendaRow).join("")}</ul>`)
        .join("")}`;
    };

    root.innerHTML = `
      <div class="cal-layout">
        ${items.length ? `<section class="cal-month" aria-label="Calendar" data-cal-month-view>${monthGrid()}</section>` : ""}
        <section class="cal-agenda" aria-live="polite" data-cal-list>${list()}</section>
      </div>
      ${
        data.past.length
          ? `<section class="cal-past" aria-labelledby="cal-before">
              <h2 class="cal-heading" id="cal-before">Past Events</h2>
              <ul class="cal-rows">${data.past.map((x) => `<li><div class="cal-row is-past">${rowInner(x)}</div></li>`).join("")}</ul>
            </section>`
          : ""
      }
      <dialog class="cal-dialog" data-cal-dialog tabindex="-1" aria-labelledby="cal-dialog-title"><div class="cal-dialog-inner" data-cal-dialog-body></div></dialog>`;

    const dialog = $("[data-cal-dialog]", root);
    const body = $("[data-cal-dialog-body]", dialog);
    const close = `<button type="button" class="cal-dialog-close" data-cal-close aria-label="Close">${CLOSE_ICON}</button>`;
    // An open event has its own address (/calendar/coffee-tea-omakase); closing it goes back.
    const calendarPath = location.pathname.replace(/\/calendar(\/.*)?$/, "/calendar");
    const setParam = (id) => {
      const x = id && items.find((i) => i.id === id);
      const url = new URL(location.href);
      url.searchParams.delete("event");
      url.pathname = x?.slug ? `${calendarPath}/${x.slug}` : calendarPath;
      if (x && !x.slug) url.searchParams.set("event", x.id);
      history.replaceState(null, "", url);
    };
    const redraw = () => {
      $("[data-cal-month-view]", root).innerHTML = monthGrid();
      $("[data-cal-list]", root).innerHTML = list();
    };
    const openItem = (x) => {
      dialog.classList.toggle("has-art", !!x.image);
      body.innerHTML = `${close}
        ${x.image ? `<figure class="cal-art">${calArt(x)}</figure>` : ""}
        <div class="cal-text">
          ${x.kind === "class" ? `<p class="cal-kind">Class</p>` : ""}
          <h2 id="cal-dialog-title">${esc(x.title)}</h2>
          <ul class="cal-facts">
            <li>${CAL_ICON}<span>${esc(calWhen(x))}</span></li>
            ${x.place ? `<li>${PIN_ICON}${calPlace(x)}</li>` : ""}
          </ul>
          <div class="cal-body">${calBody(x.body) || (x.summary ? `<p>${esc(x.summary)}</p>` : "")}</div>
          ${placesLeft(x)}
          ${calAction(x)}
          ${x.booking !== "pay" && !x.past ? calAddButtons(x.id) : ""}
        </div>`;
      if (!dialog.open) dialog.showModal();
      dialog.focus({ preventScroll: true }); // the sheet, not its close button: no focus ring on a tap
      body.scrollTop = 0;
      setParam(x.id);
    };
    const closeDialog = () => {
      dialog.close();
      setParam(null);
    };
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog || e.target.closest("[data-cal-close]")) return closeDialog();
      // Bought: the pop-up gives way to the cart.
      const buy = e.target.closest("[data-cal-add]");
      if (buy && (!buy.closest("[data-cal-buy]") || buy.closest("[data-cal-buy]").querySelector("[name=slot]:checked"))) setTimeout(closeDialog, 0);
    });
    dialog.addEventListener("close", () => setParam(null));
    wireCalendar(dialog, items);

    root.addEventListener("click", (e) => {
      if (dialog.contains(e.target)) return;
      const nav = e.target.closest("[data-cal-month]");
      if (nav) {
        month.setMonth(month.getMonth() + Number(nav.dataset.calMonth));
        $("[data-cal-month-view]", root).innerHTML = monthGrid();
        return;
      }
      const pick = e.target.closest("[data-cal-open]");
      if (pick) return openItem(items.find((x) => x.id === pick.dataset.calOpen));
      const day = e.target.closest("[data-cal-day]");
      if (day) {
        const on = byDay.get(day.dataset.calDay) || [];
        if (on.length === 1 && matchMedia("(max-width: 899px)").matches) return openItem(on[0]); // one thing that day: straight to it
        picked = picked === day.dataset.calDay ? "" : day.dataset.calDay;
        return redraw();
      }
      if (e.target.closest("[data-cal-all]")) {
        picked = "";
        redraw();
      }
    });
    const slug = /\/calendar\/([a-z0-9-]+)$/.exec(location.pathname)?.[1];
    const wanted = items.find((x) => x.id === new URLSearchParams(location.search).get("event") || (slug && x.slug === slug));
    if (slug && !wanted) setParam(null); // gone (or past): just the calendar
    if (wanted) {
      month = new Date(`${wanted.startsAt.slice(0, 7)}-01T12:00:00`);
      redraw();
      openItem(wanted);
    }
    observeReveals();
  },

  async classes() {
    const root = $("[data-classes]");
    let data;
    try {
      data = await api("/api/calendar");
    } catch {
      root.innerHTML = `<p class="cal-empty">Classes aren't available right now. Please try again in a moment.</p>`;
      return;
    }
    const list = data.classes;
    const id = new URLSearchParams(location.search).get("id");
    const one = id && list.find((x) => x.id === id);
    if (one) {
      document.title = `${one.title} — ${SITE.name}`;
      root.innerHTML = `
        <p class="cal-back"><a href="classes">All classes</a></p>
        <article class="cal-class">
          <figure class="cal-art cal-art-wide">${calArt(one)}</figure>
          <div class="cal-text">
            <h1>${esc(one.title)}</h1>
            <p class="cal-date">${esc(calWhen(one))}</p>
            ${one.place ? `<p class="cal-place">${calPlace(one)}</p>` : ""}
            <p class="cal-price">${one.price ? money(one.price) : "Free"}</p>
            <div class="cal-body">${calBody(one.body) || (one.summary ? `<p>${esc(one.summary)}</p>` : "")}</div>
            ${placesLeft(one)}
            ${calAction(one)}
          </div>
        </article>`;
      wireCalendar(root, [one]);
      return;
    }
    root.innerHTML = list.length
      ? `<ul class="cal-grid cal-classes">${list
          .map(
            (x) => `<li><a href="classes?id=${encodeURIComponent(x.id)}">
              <figure class="cal-art">${calArt(x)}${x.full ? `<span class="cal-labels"><span class="label-pill is-sold-out">Full</span></span>` : ""}</figure>
              <p class="cal-title">${esc(x.title)}</p>
              <p class="cal-date">${esc(calWhen(x, { end: false }))}</p>
              <p class="cal-price">${x.full ? "Full" : x.price ? money(x.price) : "Free"}</p>
            </a></li>`
          )
          .join("")}</ul>`
      : `<p class="cal-empty">No classes on the calendar right now.</p>`;
  },

  // Careers: the open roles (/careers), and a role with its application form (/careers/<role>).
  async careers() {
    const box = $("[data-careers]");
    const id = (location.pathname.match(/\/careers\/([a-z0-9-]+)$/) || [])[1];
    // "Art Director, Editorial Photography and Motion": the part after the first comma muted.
    const titled = (t) => {
      const i = t.indexOf(", ");
      return i > 0 ? `${esc(t.slice(0, i + 1))} <span class="role-spec">${esc(t.slice(i + 2))}</span>` : esc(t);
    };
    const perksHtml = (perks, heading = "") =>
      perks?.length
        ? `<section class="careers-perks" aria-labelledby="perks-title"><h2 id="perks-title">${esc(heading || "Perks")}</h2><ul>${perks
            .map((x) => `<li${x.logo ? ' class="has-logo"' : ""}>${x.logo ? `<img class="perk-logo" src="${esc(x.logo)}" alt="" loading="lazy">` : ""}<div><strong>${esc(x.title)}</strong>${x.detail ? `<span>${esc(x.detail)}</span>` : ""}</div></li>`)
            .join("")}</ul></section>`
        : "";
    // A person on the team: photo, name and role, what they'd say, and where they were before.
    const personHtml = (t) => `<li class="person">
        ${t.photo ? `<img src="${esc(t.photo)}" alt="" loading="lazy">` : ""}
        <div class="person-text">
          <p class="person-name"><strong>${esc(t.name)}</strong>${t.title ? `<span>${esc(t.title)}</span>` : ""}</p>
          ${t.quote ? `<blockquote>${esc(t.quote)}</blockquote>` : ""}
          ${t.from ? `<p class="person-from">${esc(t.from)}</p>` : ""}
        </div>
      </li>`;
    if (!id) {
      let roles = [];
      let pg: any = { heading: "", introHtml: "", photo: "", team: [], values: [], perks: [] };
      try {
        ({ roles, page: pg } = await api("/api/careers"));
      } catch {
        /* shown as none */
      }
      // Grouped by team, in the order teams first appear (newest roles first).
      const teams = [...new Set(roles.map((r) => r.team || ""))];
      const more = pg.introHtml || pg.photo || pg.team?.length || pg.values?.length || pg.perks?.length;
      box.innerHTML = `<header class="careers-head">
          <h1>${esc(pg.heading || "Careers")}</h1>
          ${roles.length && more ? `<a class="button" href="careers#open-roles">See Open Roles</a>` : ""}
        </header>
        ${pg.photo ? `<img class="careers-photo" src="${esc(pg.photo)}" alt="">` : ""}
        ${pg.introHtml ? `<div class="careers-intro">${pg.introHtml /* made safe by the server */}</div>` : ""}
        ${
          pg.team?.length
            ? `<section class="careers-people" aria-labelledby="team-title"><h2 id="team-title">${esc(pg.teamHeading || "Our Team")}</h2><ul class="people-row">${pg.team.map(personHtml).join("")}</ul></section>`
            : ""
        }
        ${
          pg.values?.length
            ? `<section class="careers-values" aria-labelledby="values-title"><h2 id="values-title">${esc(pg.valuesHeading || "What We Value")}</h2><ul>${pg.values
                .map((v) => `<li><h3>${esc(v.title)}</h3>${v.text ? `<p>${esc(v.text)}</p>` : ""}</li>`)
                .join("")}</ul></section>`
            : ""
        }
        ${perksHtml(pg.perks, pg.perksHeading)}
        <section class="careers-roles" id="open-roles" aria-labelledby="roles-title">
          <h2 id="roles-title"><span>Open Roles</span> <span class="careers-count">${roles.length}</span></h2>
          ${
            roles.length
              ? teams
                  .map(
                    (team) => `<div class="careers-team">${team ? `<h3>${esc(team)}</h3>` : ""}<ul>${roles
                      .filter((r) => (r.team || "") === team)
                      .map((r) => `<li><a href="careers/${esc(r.id)}">${titled(r.title)}</a></li>`)
                      .join("")}</ul></div>`
                  )
                  .join("")
              : `<div class="careers-none"><p>No open roles right now.</p><p><span>Tell us what you'd bring:</span> <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a></p></div>`
          }
        </section>
        ${
          pg.closingHeading || pg.closing
            ? `<section class="careers-closing">${pg.closingHeading ? `<h2>${esc(pg.closingHeading)}</h2>` : ""}${pg.closing ? `<p>${esc(pg.closing)}</p>` : ""}<a class="button" href="mailto:${esc(SITE.email)}">Email Us</a></section>`
            : ""
        }`;
      return;
    }
    let r;
    let perks = [];
    let perksHeading = "";
    let workWith = [];
    try {
      ({ role: r, perks = [], perksHeading = "", workWith = [] } = await api(`/api/careers/${id}`));
    } catch (err) {
      box.innerHTML = `<header class="careers-head"><h1>Careers</h1></header><div class="careers-none"><p>${esc(err.message)}</p><p><a href="careers">See Open Roles</a></p></div>`;
      return;
    }
    document.title = `${r.title} — Careers at ${SITE.name}`;
    box.innerHTML = `<article class="role">
      <header class="role-head">
        <h1>${titled(r.title)}</h1>
        <p class="role-meta">${esc([r.location, r.type, r.pay].filter(Boolean).join(" · "))}</p>
        ${r.summary ? `<p class="role-summary">${esc(r.summary)}</p>` : ""}
        <div class="role-actions"><a class="button" href="careers/${esc(r.id)}#apply">Apply</a><a class="button is-outline" href="careers">Back to Roles</a></div>
      </header>
      <div class="role-body">${r.bodyHtml /* made safe by the server (server/careers.ts jobBodyHtml) */}</div>
      ${workWith.length ? `<section class="careers-people" aria-labelledby="with-title"><h2 id="with-title">You'd Work With</h2><ul class="people-row">${workWith.map(personHtml).join("")}</ul></section>` : ""}
      ${perksHtml(perks, perksHeading)}
      <section class="role-apply" id="apply" aria-labelledby="apply-title">
        <h2 id="apply-title">Apply</h2>
        <form class="form" data-apply-form novalidate>
          <label>Name<input name="name" autocomplete="name" maxlength="80" required></label>
          <label>Email<input type="email" name="email" autocomplete="email" maxlength="254" required></label>
          <label>Phone<input type="tel" name="phone" autocomplete="tel" maxlength="40"></label>
          <label>Link to your work<input name="link1" inputmode="url" maxlength="300" placeholder="https://"></label>
          <label class="file-field">CV<input type="file" name="cv" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"></label>
          <label>Anything else<textarea name="note" rows="4" maxlength="3000"></textarea></label>
          <p class="sub-error" data-apply-error role="alert"></p>
          <button class="button" type="submit">Send Application</button>
        </form>
        <p class="role-sent" data-apply-sent hidden></p>
      </section>
    </article>`;
    addHoneypots();
    const form = $("[data-apply-form]", box);
    const error = $("[data-apply-error]", form);
    const readFile = (file) =>
      new Promise((ok, fail) => {
        const rd = new FileReader();
        rd.onload = () => ok(String(rd.result).split(",")[1] || "");
        rd.onerror = () => fail(new Error("That file couldn't be read."));
        rd.readAsDataURL(file);
      });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      const file = form.cv.files[0];
      const missing = [!form.name.value.trim() && "name", (!form.email.value.trim() || !form.email.validity.valid) && "email"].filter(Boolean);
      if (missing.length) {
        error.textContent = "Add your name and email.";
        return flagFields(form, "", missing);
      }
      if (!file && !form.link1.value.trim()) {
        error.textContent = "Add your CV or a link to your work.";
        return flagFields(form, "", ["link1"]);
      }
      if (file && file.size > 5 * 1024 * 1024) {
        error.textContent = "That CV is too big. Send one under 5 MB.";
        return flagFields(form, "", ["cv"]);
      }
      const button = $("button[type=submit]", form);
      button.disabled = true;
      try {
        const cv = file ? { type: file.type || (/\.docx$/i.test(file.name) ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document" : /\.doc$/i.test(file.name) ? "application/msword" : "application/pdf"), data: await readFile(file) } : null;
        await api(`/api/careers/${id}/apply`, { method: "POST", body: { name: form.name.value, email: form.email.value, phone: form.phone.value, link1: form.link1.value, note: form.note.value, website: form.website?.value || "", cv } });
        form.hidden = true;
        const sent = $("[data-apply-sent]", box);
        sent.textContent = "Thanks for applying. We read every application and will be in touch.";
        sent.hidden = false;
      } catch (err) {
        error.textContent = err.message;
        flagFields(form, err.message);
        button.disabled = false;
      }
    });
  },

  contact() {
    $$("[data-email]").forEach((a) => {
      const addr = SITE[a.dataset.email];
      a.href = `mailto:${addr}`;
      a.textContent = addr;
    });
    $$("[data-instagram]").forEach((a) => {
      a.href = `https://instagram.com/${SITE.instagram}`;
      a.textContent = `@${SITE.instagram}`;
    });
    contactMap();
    // Messages land in the back office Inbox, where the reply is written.
    const form = $("[data-contact-form]");
    const error = $("[data-contact-error]");
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      if (!form.name.value.trim() || !form.email.value.trim() || !form.email.validity.valid || !form.message.value.trim()) {
        error.textContent = "Add your name, email and message.";
        return flagFields(form);
      }
      const d = Object.fromEntries(new FormData(form));
      const button = $("button[type=submit]", form);
      button.disabled = true;
      try {
        await api("/api/contact", { method: "POST", body: d });
      } catch (err) {
        if (err.fromApi) {
          error.textContent = err.message;
          flagFields(form, err.message);
          button.disabled = false;
          return;
        }
        // No server (static hosting): fall back to a pre-filled email.
        const to = d.topic === "Wholesale" ? SITE.wholesaleEmail : SITE.email;
        location.href = `mailto:${to}?subject=${encodeURIComponent(`${d.topic}: ${d.name}`)}&body=${encodeURIComponent(`${d.message}\n\n${d.name}\n${d.email}`)}`;
      }
      form.hidden = true;
      $("[data-contact-sent]").hidden = false;
    });
  },

  checkout() {
    if (!shopOpen()) return location.replace("shop");
    const shopify = shopifyCartUrl();
    if (shopify) return location.replace(shopify);
    const form = $("[data-checkout-form]");
    // Their email (once it's a real one) and the coffees in the cart are kept for a week, so the
    // abandoned cart email can reach them if they leave before paying.
    let draftSent = "";
    const saveDraft = () => {
      const email = form?.email;
      if (!email || !email.value.trim() || !email.validity.valid) return;
      const lines = cart.filter((l) => l.kind === "coffee" && !l.gift).map((l) => {
        const [, product, size, grind] = l.key.split(":");
        return { product: l.product || product, size: l.size || size, grind: l.grind || grind, qty: l.qty };
      });
      const sig = JSON.stringify([email.value.trim().toLowerCase(), lines]);
      if (!lines.length || sig === draftSent) return;
      draftSent = sig;
      api("/api/checkout/draft", { method: "POST", body: { email: email.value.trim(), name: form.name?.value || "", lines } }).catch(() => (draftSent = ""));
    };
    form?.email?.addEventListener("change", saveDraft);
    form?.email?.addEventListener("blur", saveDraft);
    // Wholesale logins don't check out at retail: they order from /trade.
    currentUser.then((user) => {
      if (!user?.wholesale) return;
      const box = $("[data-checkout]");
      [...box.children].forEach((el) => (el.style.display = "none")); // kept, so the page's code still finds them
      box.insertAdjacentHTML("afterbegin", `<div class="empty-state"><p>You're logged in as ${esc(user.wholesale.business)}. Wholesale orders go through your wholesale page.</p><a class="button" href="trade">Wholesale Ordering</a></div>`);
    });
    // Bags ordered with café items go with them (picked up at the bar, or by the same courier),
    // so only a cart without café items has coffee to ship. Subscriptions are ordered on their own.
    const hasCafe = () => cart.some((l) => l.kind === "pickup");
    const subWithCafe = () => hasCafe() && cart.some((l) => l.kind === "sub");
    const bagsWithCafe = () => hasCafe() && cart.some((l) => l.kind === "coffee");
    // Gift bags can go straight to the person they're for (chosen per recipient below).
    const giftSends = new Map(); // recipient → { send: bool, zone }
    // Who a gift line is for: a gift bag's recipient, or a gift subscription's.
    const recipientOf = (l) => ((l.kind === "coffee" || l.kind === "accessory") && l.gift ? l.recipient : l.kind === "sub" && l.sub?.gift ? l.sub.recipient : "") || "";
    const sentAway = (l) => Boolean(recipientOf(l)) && !hasCafe() && giftSends.get(recipientOf(l))?.send !== false;
    const hasShippable = () => !hasCafe() && cart.some((l) => l.kind !== "pickup" && l.kind !== "class" && l.kind !== "giftcard" && !sentAway(l));
    const giftGroups = () => {
      const groups = new Map();
      for (const l of cart.filter(sentAway)) groups.set(recipientOf(l), [...(groups.get(recipientOf(l)) || []), l]);
      return [...groups].map(([recipient, lines]) => ({ recipient, lines }));
    };
    let placed = false;
    let payCard = null; // Square's card fields, once loaded (see mountCard)
    // A discount code, once applied: { code, label, amount, freeShipping }.
    let promo = null;
    let promoText = "";
    let promoError = "";
    let promoNote = "";
    // A gift card, once checked: { code, last4, balance }. It pays first; the card pays the rest.
    let gift = null;
    let giftText = "";
    let giftError = "";
    let giftOpen = false;
    let giftsOn = false; // gift cards need card payments (Square) on
    // Subscriber discount (percent off coffee bags) for signed-in subscribers; the server
    // applies it again when the order is placed. It doesn't stack with a money-off code.
    let perkPercent = 0;
    let signedIn = false;
    const perk = () => Math.round(cart.filter((l) => l.kind === "coffee").reduce((n, l) => n + l.price * l.qty, 0) * perkPercent) / 100;
    // What comes off: the bigger of the code and the subscriber discount.
    const codeCounts = () => promo && !promo.freeShipping && promo.amount > perk();
    const discountTotal = () => (codeCounts() ? promo.amount : perk());
    // Under the free-shipping threshold, a parcel costs the cheapest carrier's price to its
    // address: undefined (no price shown) until the whole address is in and priced; the flat
    // rate only if the price can't be had.
    const addressDone = (to) => Boolean(to?.address?.trim() && to.city?.trim() && to.state && /^\d{5}/.test(String(to.postcode || "").trim()));
    const shipFor = (lines, ignorePromo = false, to: any = {}) => {
      if (promo?.freeShipping && !ignorePromo) return 0;
      // Free when the whole order is over the threshold, for every parcel (gifts sent away too).
      if (!lines.some((l) => l.kind === "coffee" || l.kind === "accessory") || freeShipTotal(cart) >= SITE.freeShippingOver) return 0;
      if (!addressDone(to)) return undefined;
      const fee = postageNow(to.postcode, parcelOz(lines), () => renderSummary(), { address: to.address, city: to.city, state: to.state });
      return fee === undefined ? undefined : fee ?? SITE.shippingFlat;
    };
    const cafeDelivery = () => cart.filter((l) => l.kind === "pickup" && l.delivery);
    const cafeDeliveryTotal = () => (cafeDelivery().length ? cart.filter((l) => l.kind !== "sub").reduce((n, l) => n + l.price * l.qty, 0) : 0);
    const cafeFee = () => (cafeDelivery().length ? SITE.cafeDelivery.fee : 0);
    const belowMinimum = () => cafeDelivery().length > 0 && cafeDeliveryTotal() < SITE.cafeDelivery.minimum;
    // Within the delivery area a courier can bring it (zoneResult, from the address), for the
    // courier's fee; the customer can choose shipping instead (deliveryChoice).
    let zoneResult = null;
    let deliveryChoice = store.get("bp-delivery-choice", "courier");
    const byCourier = () => Boolean(zoneResult?.local) && zoneResult.fee != null && deliveryChoice === "courier" && !hasCafe() && form.fulfilment?.value !== "Pickup";
    // Subscriptions ship free; the rest ships free when the order (subscriptions included) is over the threshold.
    const ownAddress = () => ({ address: form.address?.value, city: form.city?.value, state: form.state?.value, postcode: form.postcode?.value });
    const parcelShipping = (raw = false) => shipFor(cart.filter((l) => !sentAway(l)), raw, ownAddress());
    // Local delivery: free when the parcel would ship free (over the threshold, a free-shipping
    // code), else the courier's fee, capped at SITE.localDelivery.maxFee (as on the server).
    const parcelFree = (raw = false) => {
      if (promo?.freeShipping && !raw) return true;
      const total = freeShipTotal(cart.filter((l) => !sentAway(l)));
      return !(total && total < SITE.freeShippingOver);
    };
    const courierCharge = (raw = false) => {
      const fee = zoneResult?.fee;
      if (fee == null) return parcelShipping(raw);
      if (parcelFree(raw)) return 0;
      const cap = SITE.localDelivery?.maxFee;
      return cap != null ? Math.min(fee, cap) : fee;
    };
    const ownShipping = (raw = false) => (hasCafe() || form.fulfilment?.value === "Pickup" ? 0 : byCourier() ? courierCharge(raw) : parcelShipping(raw));
    // undefined while any parcel's price isn't known yet.
    const shippingCost = (raw = false) => {
      const parts = [ownShipping(raw), ...giftGroups().map((g) => shipFor(g.lines, raw, giftSends.get(g.recipient)?.to))];
      return parts.includes(undefined) ? undefined : parts.reduce((n, x) => n + x, 0);
    };
    const shipPending = () => shippingCost() === undefined || taxNow() === undefined;
    // Where a price isn't known yet: what to show instead.
    const notYet = (to) => `<span class="ship-pending">${addressDone(to) ? "Calculating…" : "Add your address"}</span>`;
    // Sales tax: the customer's own lines where they go (café items at their bar, pickup at The
    // Roastery House), each gift at its recipient's address. undefined until every rate is in.
    const ownTaxWhere = (): any => {
      if (hasCafe()) {
        const c = cart.find((l) => l.kind === "pickup");
        return { pickup: c?.delivery?.from || store.get("bp-pickup", {}).location || "roastery" };
      }
      return form.fulfilment?.value === "Pickup" || !hasShippable() ? { pickup: "roastery" } : ownAddress();
    };
    const taxNow = () => {
      const parts = [[cart.filter((l) => !sentAway(l)), ownTaxWhere()], ...giftGroups().map((g) => [g.lines, giftSends.get(g.recipient)?.to])];
      let total = 0;
      for (const [lines, where] of parts) {
        if (!lines.some(taxClass)) continue;
        const rates = taxRateNow(where, () => renderSummary());
        if (rates === undefined) {
          if (hasTaxable(lines)) return undefined; // coffee alone doesn't wait for an address
          continue;
        }
        total += salesTaxFor(lines, { discount: discountTotal(), rates, pool: cart, on: codeCounts() ? "code" : "coffee" });
      }
      return Math.round(total * 100) / 100;
    };
    const promoEligible = () => cart.filter((l) => l.kind !== "sub" && l.kind !== "giftcard").reduce((n, l) => n + l.price * l.qty, 0);
    // The order's total, and what's due today (a subscription bills itself, on its own).
    const orderTotal = () => Math.max(0, cartSubtotal() + (shippingCost() ?? 0) + cafeFee() + (taxNow() ?? 0) - discountTotal());
    const dueToday = () => Math.max(0, orderTotal() - cart.filter((l) => l.kind === "sub" && !l.sub?.prepaid).reduce((n, l) => n + l.price * l.qty, 0));
    // What the gift card pays (its balance, up to what's due today), and what's left for the card.
    const giftApplied = () => (gift ? Math.round(Math.min(gift.balance, dueToday()) * 100) / 100 : 0);
    const cardTotal = () => Math.max(0, Math.round((orderTotal() - giftApplied()) * 100) / 100);
    const buyingGiftCards = () => cart.some((l) => l.kind === "giftcard");
    // A code or gift card that covers everything: nothing to pay, so no card (and no Apple Pay).
    const isFree = () => !cart.some((l) => l.kind === "sub") && !shipPending() && cardTotal() <= 0;
    const checkGift = async (code) => {
      if (!code) {
        gift = null;
        giftError = "";
        return renderSummary();
      }
      try {
        const r = await api("/api/gift-cards/balance", { method: "POST", body: { code } });
        gift = { code, last4: r.last4, balance: r.balance };
        giftError = "";
        giftText = "";
      } catch (err) {
        gift = null;
        giftError = err.message;
      }
      if (!placed) renderSummary();
    };
    // Ask the server what a code gives on this cart (it prices the order again when placed).
    const checkPromo = async (code) => {
      if (!code) {
        promo = null;
        promoError = "";
        return renderSummary();
      }
      try {
        promo = await api("/api/promo", { method: "POST", body: { code, eligible: promoEligible(), shipping: shippingCost(true) } });
        promoError = "";
        promoNote = "";
        // A money-off code that saves less than the subscriber discount isn't needed.
        if (!promo.freeShipping && promo.amount <= perk()) {
          promo = null;
          promoText = "";
          promoNote = "Subscriber discount applied.";
        }
      } catch (err) {
        promo = null;
        promoError = err.message;
      }
      if (!placed) renderSummary();
    };

    // The delivery cards (set up further down, with the address check).
    let renderChoices = () => {};
    // How the coffee gets there, once the address has been checked (see checkZone below).
    const deliveryLabel = () => {
      if (form.fulfilment?.value === "Pickup") return "Pickup";
      if (byCourier()) return `Local Delivery${zoneResult.courier ? ` ${courierMark(zoneResult.provider, zoneResult.courier)}` : ""}`;
      return zoneResult?.found || addressDone(ownAddress()) ? "Shipping" : "Delivery";
    };

    const renderSummary = () => {
      if (placed) return; // the confirmation is showing: a late address check mustn't redraw it
      if (!cart.length) {
        $("[data-checkout]").innerHTML = `<div class="empty-state"><h1 class="visually-hidden">Checkout</h1><p>Your cart is empty.</p><a class="button" href="shop">Keep Shopping</a></div>`;
        return;
      }
      document.body.classList.toggle("checkout-free", isFree());
      document.dispatchEvent(new Event("checkoutchange"));
      const ship = shippingCost();
      const own = ownShipping();
      const tax = taxNow();
      const giftRows = giftGroups()
        .map((g) => {
          const zone = giftSends.get(g.recipient)?.zone;
          const how = zone?.found ? (zone.local ? "Delivery to" : "Shipping to") : "Delivery to";
          const to = giftSends.get(g.recipient)?.to;
          const fee = shipFor(g.lines, false, to);
          return `<div class="row"><span>${how} ${esc(g.recipient.split(" ")[0])}</span><span>${fee === undefined ? notYet(to) : fee ? money(fee) : "Free"}</span></div>`;
        })
        .join("");
      // A price arriving mid-typing redraws the summary: keep the discount box focused.
      const typingIn = ["promo-code", "gift-code"].includes(document.activeElement?.id) ? document.activeElement.id : null;
      const typing = typingIn ? [(document.activeElement as any).selectionStart, (document.activeElement as any).selectionEnd] : null;
      const summaryHtml = `
        <ul class="summary-lines">
          ${cart
            .map(
              (l) => `<li>
                <span>${esc(lineName(l))}<em>${esc(lineMeta(l))}</em>${lineGiftHtml(l)}${l.note ? `<em>Gift message: “${esc(l.note)}”</em>` : ""}
                  <span class="summary-edit">
                    <span class="stepper" role="group" aria-label="Quantity of ${esc(lineName(l))}">
                      <button type="button" data-qty="${esc(l.key)}" data-delta="-1" aria-label="Decrease">−</button>
                      <span>${l.qty}</span>
                      <button type="button" data-qty="${esc(l.key)}" data-delta="1" aria-label="Increase">+</button>
                    </span>
                    <button type="button" class="link-button" data-qty="${esc(l.key)}" data-delta="-${l.qty}">Remove</button>
                  </span>
                </span>
                <span>${money(l.price * l.qty)}</span></li>`
            )
            .join("")}
        </ul>
        <div class="row"><span>Subtotal</span><span>${money(cartSubtotal())}</span></div>
        ${hasShippable() ? `<div class="row"><span>${deliveryLabel()}</span><span>${own === undefined ? notYet(ownAddress()) : own ? money(own) : "Free"}</span></div>` : ""}
        ${giftRows}
        ${cafeFee() ? `<div class="row"><span>Café delivery</span><span>${money(cafeFee())}</span></div>` : ""}
        ${subWithCafe() ? `<p class="sub-error">Subscriptions check out on their own. Remove the subscription or the café items.</p>` : ""}
        ${belowMinimum() ? `<p class="sub-error">Café delivery has a ${money(SITE.cafeDelivery.minimum)} minimum. Add ${money(SITE.cafeDelivery.minimum - cafeDeliveryTotal())} more, or switch to pickup.</p>` : ""}
        ${perk() && !codeCounts() ? `<div class="row promo-row"><span>Subscriber ${perkPercent}% off</span><span>−${money(perk())}</span></div>` : ""}
        ${
          promo && (promo.freeShipping || codeCounts())
            ? `<div class="row promo-row"><span>Code ${esc(promo.code)} <button type="button" class="link-button" data-promo-remove>Remove</button></span><span>${promo.freeShipping ? "Free shipping" : `−${money(promo.amount)}`}</span></div>`
            : `<form class="promo-form" data-promo-form novalidate>
                <label class="sr-only" for="promo-code">Discount code</label>
                <input id="promo-code" name="promo" placeholder="Discount code" value="${esc(promoText)}" autocomplete="off" autocapitalize="characters" spellcheck="false" ${promoError ? 'aria-invalid="true"' : ""}>
                <button type="submit" class="pill">Apply</button>
              </form>
              ${promoError ? `<p class="sub-error" role="alert">${esc(promoError)}</p>` : promoNote ? `<p class="promo-note" role="status">${esc(promoNote)}</p>` : ""}
              ${!signedIn && SITE.subscriberDiscount > 0 && cart.some((l) => l.kind === "coffee") ? `<p class="promo-note">Subscriber? <a href="login" data-login-next="checkout">Log in</a> for ${SITE.subscriberDiscount}% off coffee.</p>` : ""}`
        }
        ${tax > 0 || (tax === undefined && hasTaxable(cart)) ? `<div class="row"><span>Tax</span><span>${tax === undefined ? (ownTaxWhere().pickup ? `<span class="ship-pending">Calculating…</span>` : notYet(ownAddress())) : money(tax)}</span></div>` : ""}
        <div class="row total"><span>Total</span><span>${money(orderTotal())}</span></div>
        ${
          gift && !buyingGiftCards()
            ? `<div class="row promo-row"><span>Gift card ••${esc(gift.last4)} <button type="button" class="link-button" data-gift-remove>Remove</button></span><span>−${money(giftApplied())}</span></div>
               <div class="row total is-due"><span>${cardTotal() > 0 ? "To pay by card" : "To pay"}</span><span>${money(cardTotal())}</span></div>
               ${gift.balance > giftApplied() ? `<p class="promo-note">${money(gift.balance - giftApplied())} stays on your gift card.</p>` : ""}`
            : giftsOn && !buyingGiftCards()
              ? giftOpen || giftError
                ? `<form class="promo-form" data-gift-form novalidate>
                    <label class="sr-only" for="gift-code">Gift card number</label>
                    <input id="gift-code" name="giftCode" placeholder="Gift card number" value="${esc(giftText)}" autocomplete="off" inputmode="numeric" spellcheck="false" ${giftError ? 'aria-invalid="true"' : ""}>
                    <button type="submit" class="pill">Apply</button>
                  </form>
                  ${giftError ? `<p class="sub-error" role="alert">${esc(giftError)}</p>` : ""}`
                : `<p class="promo-note"><button type="button" class="link-button" data-gift-open>Have a gift card?</button></p>`
              : ""
        }
        ${cart
          .filter((l) => l.kind === "sub" && !l.sub?.prepaid)
          .map((l) => {
            // Square bills a subscription from the day it starts, then on its schedule.
            const f = SUBSCRIPTION.frequencies.find((x) => x.id === l.sub?.freq);
            return `<p class="promo-note">${esc(l.title)}: ${money(l.price)} billed today, then ${money(l.price)} ${esc((f?.note || "on schedule").toLowerCase())} until you cancel. Skip, pause or cancel online any time. <a href="terms#subscriptions">Terms</a></p>`;
          })
          .join("")}`;
      // Only redraw what changed, so a click into the discount box isn't lost to a redraw.
      const summaryBox = $("[data-summary]");
      if (summaryBox.drawnHtml !== summaryHtml) {
        summaryBox.innerHTML = summaryHtml;
        summaryBox.drawnHtml = summaryHtml;
      }
      if (typing) {
        const box = $(`#${typingIn}`);
        box?.focus({ preventScroll: true });
        box?.setSelectionRange(...typing);
      }
      $("button[type=submit]", form).disabled = belowMinimum() || subWithCafe();
      if (payCard) setSubmitLabel();
      const shipHidden = !hasShippable() || form.fulfilment.value === "Pickup";
      $("[data-ship-fields]").hidden = shipHidden;
      currentUser.then((user) => {
        const note = $("[data-sub-account]");
        if (!note) return;
        // Only for guests: an account is made with their email. Signed in, it simply joins theirs.
        const hasSubs = cart.some((l) => l.kind === "sub");
        note.hidden = !hasSubs || Boolean(user);
        if (note.hidden) return;
        if (!cart.some((l) => l.kind === "sub" && !l.sub?.prepaid)) {
          // Only prepaid gifts: nothing to manage, but the account shows each delivery.
          note.innerHTML = `We'll make an account with your email so you can follow each delivery. Have one? <a href="login" data-login-next="checkout">Log in</a>.`;
          return;
        }
        note.innerHTML = `We'll make an account with your email so you can manage it. Have one? <a href="login" data-login-next="checkout">Log in</a>.`;
      });
      $$("[data-ship-fields] input, [data-ship-fields] select").forEach((input) => (input.required = !shipHidden));

      // Café items: show where and when, with a way to change it.
      const cafeLine = cart.find((l) => l.kind === "pickup");
      const cafeBox = $("[data-cafe-box]");
      cafeBox.hidden = !cafeLine;
      if (cafeLine) {
        const pickup = store.get("bp-pickup", {});
        const shop = LOCATIONS.find((l) => l.id === (cafeLine.delivery?.from || pickup.location));
        const d = cafeLine.delivery;
        const q = new URLSearchParams({ location: shop?.id || "" });
        if (d) q.set("mode", "delivery");
        cafeBox.innerHTML = `
          <p class="section-label">${d ? "Café delivery" : "Café pickup"}</p>
          <p><strong>${d ? `${esc(d.street)}, ${esc(d.city)} ${esc(d.postcode)}` : esc(shop ? `${shop.name}, ${shop.address[0]}` : "Choose a pour bar")}</strong>
          <span>${pickup.time ? esc(pickupLabel(pickup.time)) : "No time chosen yet"}${d && shop ? ` · delivered from ${esc(shop.name)}` : ""}</span>
          ${bagsWithCafe() ? `<span class="cafe-bags">${d ? "Your coffee bags come with the same courier." : "Your coffee bags are ready with it."}</span>` : ""}</p>
          <a href="order?${q}">Change</a>`;
      }
      $("[data-fulfilment]").hidden = !hasShippable();
      renderChoices();
    };

    currentUser.then(async (user) => {
      signedIn = Boolean(user);
      if (user) perkPercent = (await api("/api/perk").catch(() => ({}))).percent || 0;
      if (!placed) renderSummary();
    });

    const sendToOf = (recipient) => {
      const box = $(`[data-gift-send="${CSS.escape(recipient)}"]`);
      return Object.fromEntries(["address", "city", "state", "postcode", "phone"].map((k) => [k, box?.querySelector(`[data-field="${k}"]`)?.value || ""]));
    };

    // What the server needs to price each line; it looks every price up itself.
    const orderLine = (l) => {
      const parts = l.key.split(":");
      if (l.kind === "giftcard") return { kind: "giftcard", qty: l.qty, amount: l.price, ...l.giftcard };
      if (l.kind === "coffee") {
        const line: any = { kind: "coffee", qty: l.qty, product: l.product || parts[1], size: l.size || parts[2], grind: l.grind || parts[3], gift: Boolean(l.gift), recipient: l.recipient || parts[5] || "", note: l.note || "" };
        if (sentAway(l)) line.sendTo = sendToOf(l.recipient);
        return line;
      }
      if (l.kind === "sub") return { kind: "sub", qty: l.qty, sub: l.sub, ...(sentAway(l) ? { sendTo: sendToOf(recipientOf(l)) } : {}) };
      if (l.kind === "accessory") {
        const line: any = { kind: "accessory", qty: l.qty, product: l.product, size: l.size || "", color: l.color || "" };
        if (l.gift) Object.assign(line, { gift: true, recipient: l.recipient, note: l.note || "" });
        if (sentAway(l)) line.sendTo = sendToOf(l.recipient);
        return line;
      }
      if (l.kind === "class") return { kind: "class", qty: l.qty, product: l.product, ...(l.slot && { slot: l.slot }) };
      return { kind: "pickup", qty: l.qty, item: parts[1], ...(l.options ? { options: l.options } : {}) };
    };

    const showConfirmation = ({ number, total, track, body, sent, paid, account, cafe, amounts }: any) => {
      const email = form?.email?.value.trim() || "";
      const collecting = form?.fulfilment?.value === "Pickup";
      placed = true; // the cart empties below: nothing should redraw the checkout after this
      // Remembered for next time (this browser only).
      store.set("bp-checkout", Object.fromEntries(CONTACT_FIELDS.map((k) => [k, form?.[k]?.value || ""])));
      const ordered = cart.map((l) => ({ ...l }));
      if (paid) {
        // Once per order, even if the page is reloaded.
        const sent = `bp-ga-${number}`;
        let fresh = true;
        try {
          fresh = !sessionStorage.getItem(sent);
          sessionStorage.setItem(sent, "1");
        } catch {
          /* counted once anyway on this page */
        }
        if (fresh && ordered.length) gaEvent("purchase", { transaction_id: number, value: total ?? gaValue(ordered), ...(amounts && { tax: amounts.tax, shipping: amounts.shipping, ...(amounts.coupon && { coupon: amounts.coupon }) }), items: ordered.map((l) => gaItem(l)) });
      }
      cart = [];
      saveCart();
      document.body.classList.add("is-placed"); // nothing to go back to in the cart now
      $("[data-checkout]").innerHTML = `
        <div class="confirmation" data-reveal>
          ${cafe ? cafeConfirmation(cafe, ordered, number) : `<h1>Thank you for your order</h1>
          <p class="muted">Order ${esc(number)}${email ? ` · Receipt sent to ${esc(email)}` : ""}</p>
          <ul class="summary-lines confirmation-lines">${ordered
            .map((l) => `<li><span>${l.qty} × ${esc(lineName(l))}<em>${esc(lineMeta(l))}</em>${lineGiftHtml(l)}</span><span>${money(l.price * l.qty)}</span></li>`)
            .join("")}</ul>
          ${total != null ? `<p class="confirmation-total"><span>Total</span><strong>${money(total)}</strong></p>` : ""}
          ${ordered.some((l) => l.kind === "giftcard") ? `<p>We've emailed the gift card${ordered.filter((l) => l.kind === "giftcard").reduce((n, l) => n + l.qty, 0) > 1 ? "s" : ""} to ${esc([...new Set(ordered.filter((l) => l.kind === "giftcard").map((l) => l.giftcard.toName))].join(" and "))}.</p>` : ""}
          ${ordered.some((l) => l.kind === "coffee" || l.kind === "accessory") ? `<p>${collecting ? "We'll email you when it's ready to collect at Roastery House." : "We'll email you when it ships."}</p>` : ""}
          ${track ? `<a class="button" href="${esc(track)}">Track Your Order</a>` : ""}`}
          ${ordered
            .filter((l) => l.kind === "class")
            .map((l) => `<div class="cal-confirm"><p><strong>${esc(l.title)}</strong><br><span class="muted">${esc(l.variant || "")}</span></p>${calAddButtons(l.product)}</div>`)
            .join("")}
          ${
            sent || paid
              ? ""
              : `<p>Send this order to <a href="mailto:${esc(SITE.ordersEmail)}">${esc(SITE.ordersEmail)}</a> to place it.</p>
                 <pre>${esc(body)}</pre>`
          }
          ${account ? `<p class="account-setup-note"><a href="login" data-login-next="account">Manage Your Subscription</a></p>` : ""}
          ${track && !cafe ? `<p class="account-setup-back"><a href="./">Back to Shop</a></p>` : `<a class="button" href="./">Back to Shop</a>`}
        </div>`;
      observeReveals();
      window.scrollTo({ top: 0 });
    };

    const params = new URLSearchParams(location.search);

    // Shipping is within the US, so the state comes from a list.
    $("[data-states]").insertAdjacentHTML("beforeend", US_STATES.map(([code, name]) => `<option value="${code}">${esc(name)}</option>`).join(""));

    form.addEventListener("change", renderSummary);
    renderSummary();
    if (!cart.length) return;

    // Fill in what we already know: this browser's last order, and the signed-in account.
    // Only empty fields, so nothing the customer typed is overwritten.
    const CONTACT_FIELDS = ["name", "email", "phone", "address", "city", "state", "postcode"];
    const fillIn = (values) => {
      for (const k of CONTACT_FIELDS) if (values[k] && form[k] && !form[k].value) form[k].value = values[k];
    };
    fillIn(store.get("bp-checkout", {}));
    currentUser.then((user) => user && fillIn({ name: user.name, email: user.email }));

    // How it gets there, as one set of cards under the address: local delivery by courier (when
    // the address is close enough, at the courier's fee), shipping, or pickup at Roastery House.
    const zone = $("[data-delivery-zone]");
    const modeBox = $("[data-delivery-mode]");
    let zoneTimer = null;
    let zoneKey = "";
    const roastery = LOCATIONS.find((l) => l.id === "roastery");
    const chosen = () => (form.fulfilment.value === "Pickup" ? "pickup" : byCourier() ? "courier" : "ship");
    renderChoices = () => {
      const r = zoneResult;
      const ship = parcelShipping();
      const pick = chosen();
      // The carrier's own estimate for the cheapest service (asked for even when shipping is free).
      const to = ownAddress();
      const oz = parcelOz(cart.filter((l) => !sentAway(l)));
      if (addressDone(to)) postageNow(to.postcode, oz, () => renderSummary(), { address: to.address, city: to.city, state: to.state });
      const days = addressDone(to) ? postageDays(to.postcode, oz) : null;
      const shipWhen = days ? (days === 1 ? "Arrives in 1 day" : `Arrives in ${days} days`) : "";
      const price = (n) => (n === undefined ? notYet(to) : n ? money(n) : "Free");
      const option = (value, title, detail, price, name = "delivery", on = pick === value) => `
        <label class="delivery-option">
          <input type="radio" name="${name}" value="${value}"${on ? " checked" : ""}>
          <span class="delivery-option-text"><strong>${title}</strong>${detail ? `<small>${detail}</small>` : ""}</span>
          <span class="delivery-option-price">${price}</span>
        </label>`;
      // One decision: delivered or picked up (no prices here). Delivered: the address, then, once
      // it's known, one card per way to get it there (a courier when it's close enough, and post).
      const mode = pick === "pickup" ? "pickup" : "ship";
      const segment = (value, label) => `<label><input type="radio" name="delivery-mode" value="${value}"${mode === value ? " checked" : ""}><span>${label}</span></label>`;
      const modeHtml = roastery
        ? `<div class="segmented segmented-radio">${segment("ship", "Deliver")}${segment("pickup", "Pick Up")}</div>
          ${mode === "pickup" ? `<p class="pickup-place"><strong>${esc(roastery.name)}</strong><span>${esc(roastery.address.join(", "))}</span></p>` : ""}`
        : "";
      const known = addressDone(to) || Boolean(r?.found);
      const html =
        pick === "pickup"
          ? ""
          : `
        ${r && !r.found && !["valid", "corrected", "unit", "invalid"].includes($("[data-address-check]")?.status) ? `<p class="zone-note"><strong>Address not found</strong> Check the street and ZIP code.</p>` : ""}
        ${known
          ? `<div class="delivery-options">
          ${r?.local && r.fee != null ? option("courier", `Local Delivery${r.courier ? ` ${courierMark(r.provider, r.courier)}` : ""}`, courierWhen(r.minutes), price(courierCharge())) : ""}
          ${option("ship", "Shipping", shipWhen, price(ship), "delivery", pick === "ship" || !(r?.local && r.fee != null))}
        </div>`
          : ""}`.trim();
      // Redrawn only when something in it changed: leaving the ZIP field redraws the page, and
      // replacing these under a finger lost the tap that chose one.
      const draw = (box, markup, name, value) => {
        if (markup === box.dataset.drawn) {
          const want = $(`[name=${name}][value=${value}]`, box);
          if (want && !want.checked) want.checked = true;
          return;
        }
        const hadFocus = (document.activeElement as any)?.name === name;
        box.dataset.drawn = markup;
        box.innerHTML = markup;
        if (hadFocus) $(`[name=${name}][value=${value}]`, box)?.focus({ preventScroll: true });
      };
      draw(modeBox, modeHtml, "delivery-mode", mode);
      draw(zone, html, "delivery", pick);
    };
    // A phone is needed from guests (for updates, and a carrier collecting a return) and for a
    // courier; a signed-in customer's is optional otherwise.
    let guest = true;
    const phoneForCourier = () => {
      form.phone.required = byCourier() || guest;
      form.phone.closest("label").firstChild.textContent = byCourier() ? "Phone (for delivery)" : "Phone";
    };
    currentUser.then((user) => {
      guest = !user;
      if (user?.phone) fillIn({ phone: /^\+1\d{10}$/.test(user.phone) ? `(${user.phone.slice(2, 5)}) ${user.phone.slice(5, 8)}-${user.phone.slice(8)}` : user.phone });
      phoneForCourier();
    });
    const showZone = (r) => {
      zoneResult = r;
      phoneForCourier();
      renderSummary();
    };
    $("[data-fulfilment]").addEventListener("change", (e) => {
      if (e.target.name === "delivery-mode") {
        e.stopPropagation();
        form.fulfilment.value = e.target.value === "pickup" ? "Pickup" : "Delivery";
        phoneForCourier();
        renderSummary();
        checkZone();
        return;
      }
      if (e.target.name !== "delivery") return;
      e.stopPropagation();
      const v = e.target.value;
      form.fulfilment.value = v === "pickup" ? "Pickup" : "Delivery";
      // A preference between courier and post only counts once both are on offer.
      if (v !== "pickup" && zoneResult?.local) {
        deliveryChoice = v;
        store.set("bp-delivery-choice", deliveryChoice);
      }
      phoneForCourier();
      renderSummary();
      checkZone();
    });
    // The address against USPS: offer their version of it, ask for a unit number, or say it
    // wasn't found (with a way to keep it: new buildings aren't always listed yet).
    let addressConfirmed = false;
    const addressBox = $("[data-address-check]");
    const showAddressCheck = (r) => {
      const fix = r.address ? `${r.address.address}, ${r.address.city}, ${r.address.state} ${r.address.postcode}` : "";
      const html =
        r.status === "corrected"
          ? `<p>Did you mean <strong>${esc(fix)}</strong>?</p><button type="button" class="link-button" data-address-use>Use this</button>`
          : r.status === "unit"
            ? `<p>${esc(r.message || "Add an apt, suite or unit number.")}</p><button type="button" class="link-button" data-address-keep>It's right</button>`
            : r.status === "invalid"
              ? `<p>We couldn't find that address. Please check it.</p><button type="button" class="link-button" data-address-keep>It's right</button>`
              : "";
      addressBox.hidden = !html;
      addressBox.innerHTML = html;
      addressBox.found = r.address;
      addressBox.status = r.status; // USPS has spoken: the map's own "not found" stays quiet
      return html;
    };
    const checkAddress = async (addr) => {
      addressConfirmed = false;
      if (!addr.address?.trim() || !addr.state || !(addr.city?.trim() || addr.postcode?.trim())) return showAddressCheck({ status: "unknown" });
      try {
        const r = await api("/api/check-address", { method: "POST", body: addr });
        if (JSON.stringify(addr) === zoneKey) showAddressCheck(r);
      } catch {
        showAddressCheck({ status: "unknown" }); // couldn't check: the order goes through as typed
      }
    };
    addressBox.addEventListener("click", (e) => {
      if (e.target.closest("[data-address-use]") && addressBox.found) {
        const a = addressBox.found;
        Object.entries({ address: a.address, city: a.city, state: a.state, postcode: a.postcode }).forEach(([k, v]) => {
          form[k].value = v;
          form[k].removeAttribute("aria-invalid");
        });
        showAddressCheck({ status: "valid" });
        zoneKey = "";
        checkZone();
      }
      if (e.target.closest("[data-address-keep]")) {
        addressConfirmed = true;
        addressBox.hidden = true;
        error.textContent = "";
      }
    });
    const checkZone = () => {
      clearTimeout(zoneTimer);
      zoneTimer = setTimeout(async () => {
        if (placed) return; // the order's in: the form has gone
        const d = new FormData(form);
        const addr: any = { address: d.get("address"), city: d.get("city"), state: d.get("state"), postcode: d.get("postcode") };
        const key = JSON.stringify(addr);
        if (key === zoneKey || $("[data-ship-fields]").hidden) return;
        zoneKey = key;
        checkAddress(addr);
        if (!addr.address?.trim() || !addr.city?.trim()) return showZone(null);
        try {
          showZone(await api("/api/delivery-zone", { method: "POST", body: addr }));
        } catch {
          showZone(null);
        }
      }, 500);
    };
    // "input" for typing, "change" and "blur" for autofill (iPhone Safari fills without input events).
    ["address", "city", "state", "postcode"].forEach((n) => ["input", "change", "blur"].forEach((type) => form[n]?.addEventListener(type, checkZone)));
    if (form.address) addressSuggest(form.address, () => ({ address: form.address, city: form.city, state: form.state, postcode: form.postcode }));
    checkZone(); // a browser that restored the form

    // Gifts: per recipient, send it to them (their address, checked for courier or shipping
    // like any other) or put it in the customer's own delivery.
    const giftBox = $("[data-gift-sends]");
    const recipients: any[] = [...new Set(cart.map(recipientOf).filter(Boolean))];
    if (!hasCafe() && recipients.length) {
      const states = US_STATES.map(([code, name]) => `<option value="${code}">${esc(name)}</option>`).join("");
      giftBox.hidden = false;
      giftBox.innerHTML = recipients
        .map((r, i) => {
          const first = esc(r.split(" ")[0]);
          const items = cart.filter((l) => recipientOf(l) === r);
          const ac = (field) => `autocomplete="section-gift${i} shipping ${field}"`;
          return `<fieldset class="gift-send" data-gift-send="${esc(r)}">
            <legend>Gift for ${esc(r)}</legend>
            <p class="gift-send-items">${items.map((l) => `${l.qty} × ${esc(lineName(l))} <span>${esc(lineMeta(l))}</span>`).join("<br>")}</p>
            <div class="options">
              <label><input type="radio" name="gift-${i}-to" value="send" checked><span>Send to ${first}</span></label>
              <label><input type="radio" name="gift-${i}-to" value="with"><span>With my delivery</span></label>
            </div>
            <div class="form" data-gift-address>
              <label>${first}'s address<input data-field="address" name="gift-${i}-address" ${ac("street-address")}></label>
              <div class="form-grid form-grid--3">
                <label>City<input data-field="city" name="gift-${i}-city" ${ac("address-level2")}></label>
                <label>State<select data-field="state" name="gift-${i}-state" ${ac("address-level1")}><option value="">Choose…</option>${states}</select></label>
                <label>ZIP code<input data-field="postcode" name="gift-${i}-postcode" inputmode="numeric" ${ac("postal-code")}></label>
              </div>
              <label data-phone-label>${first}'s phone<input data-field="phone" name="gift-${i}-phone" type="tel" ${ac("tel")}></label>
              <p class="delivery-zone" data-zone role="status" hidden></p>
            </div>
          </fieldset>`;
        })
        .join("");
      $$("[data-gift-send]", giftBox).forEach((box) => {
        const r = box.dataset.giftSend;
        const first = r.split(" ")[0];
        const fields = () => Object.fromEntries($$("[data-field]", box).map((el) => [el.dataset.field, el]));
        const sync = () => {
          const send = $("input[value=send]", box).checked;
          const st = giftSends.get(r) || {};
          giftSends.set(r, { ...st, send });
          $("[data-gift-address]", box).hidden = !send;
          const f = fields();
          ["address", "city", "state", "postcode"].forEach((k) => (f[k].required = send));
          f.phone.required = send && Boolean(st.zone?.local);
          // Optional unless a courier needs it ("Optional" sits beside an optional field, as elsewhere).
          $("[data-phone-label]", box).firstChild.textContent = st.zone?.local ? `${first}'s phone (for delivery)` : `${first}'s phone`;
          renderSummary();
        };
        let timer = null;
        let key = "";
        const check = () => {
          clearTimeout(timer);
          timer = setTimeout(async () => {
            const f = fields();
            const addr = { address: f.address.value, city: f.city.value, state: f.state.value, postcode: f.postcode.value };
            if (JSON.stringify(addr) === key) return;
            key = JSON.stringify(addr);
            const note = $("[data-zone]", box);
            let zone = null;
            if (addr.address.trim() && addr.city.trim()) zone = await api("/api/delivery-zone", { method: "POST", body: addr }).catch(() => null);
            note.hidden = !zone;
            if (zone) note.textContent = !zone.found ? "Address not found. Check the street and ZIP code." : zone.local ? "Local delivery" : "Shipping";
            giftSends.set(r, { ...(giftSends.get(r) || {}), zone, to: addr });
            sync();
          }, 500);
        };
        box.addEventListener("change", (e) => (e.target.type === "radio" ? sync() : check()));
        $$("[data-field]", box).forEach((el) => ["input", "blur"].forEach((type) => el.addEventListener(type, check)));
        addressSuggest(fields().address, fields);
        sync();
      });
    }

    // Discount code: apply, remove, and keep what's typed across redraws.
    const summaryEl = $("[data-summary]");
    summaryEl.addEventListener("input", (e) => {
      if (e.target.name !== "promo") return;
      promoText = e.target.value;
      if (promoError) {
        promoError = "";
        e.target.removeAttribute("aria-invalid");
        summaryEl.querySelector(".promo-form + .sub-error")?.remove();
      }
    });
    summaryEl.addEventListener("submit", (e) => {
      if (e.target.matches("[data-gift-form]")) {
        e.preventDefault();
        const input = $("#gift-code");
        if (!giftText.trim()) return fieldError(input, "Enter the number on your gift card.");
        $("button", e.target).disabled = true;
        return checkGift(giftText.trim());
      }
      if (!e.target.matches("[data-promo-form]")) return;
      e.preventDefault();
      checkPromo(promoText.trim());
    });
    summaryEl.addEventListener("input", (e) => {
      if (e.target.name !== "giftCode") return;
      giftText = e.target.value;
      if (giftError) {
        giftError = "";
        e.target.removeAttribute("aria-invalid");
        summaryEl.querySelector("[data-gift-form] + .sub-error")?.remove();
      }
    });
    summaryEl.addEventListener("click", (e) => {
      if (e.target.closest("[data-gift-open]")) {
        giftOpen = true;
        renderSummary();
        $("#gift-code")?.focus();
        return;
      }
      if (e.target.closest("[data-gift-remove]")) {
        gift = null;
        giftOpen = false;
        renderSummary();
        if (payCard) setSubmitLabel();
        return;
      }
      if (!e.target.closest("[data-promo-remove]")) return;
      promoText = "";
      checkPromo("");
    });

    // The summary can be edited (quantities, remove): redraw what depends on the cart.
    document.addEventListener("cartchange", () => {
      if (placed) return;
      if (promo) checkPromo(promo.code); // the amount (or whether it applies) depends on the cart
      $$("[data-gift-send]").forEach((box) => {
        if (!cart.some((l) => recipientOf(l) === box.dataset.giftSend)) {
          giftSends.delete(box.dataset.giftSend);
          box.remove();
        }
      });
      if (giftBox && !$("[data-gift-send]", giftBox)) giftBox.hidden = true;
      renderSummary();
    });

    // Card payments on (Square keys set on the server) or off: the note says which.
    const note = $("[data-checkout-note]", form);
    api("/api/config")
      .then((config) => {
        if (!config.payments) {
          note.textContent = "We'll email you to confirm.";
          payDebug("Square payments on the server: no (SQUARE_ACCESS_TOKEN, SQUARE_APPLICATION_ID or SQUARE_LOCATION_ID missing in Render)");
          return;
        }
        note.hidden = true; // the card fields speak for themselves
        giftsOn = true;
        // A gift card accepted in this browser is offered straight away (if it still has money on it).
        // Or, signed in, the first gift card in their account with money on it.
        const saved = store.get("bp-giftcard", null);
        if (saved?.code && !gift && !buyingGiftCards()) {
          api("/api/gift-cards/balance", { method: "POST", body: { code: saved.code } })
            .then((r) => {
              gift = { code: saved.code, last4: r.last4, balance: r.balance };
              renderSummary();
            })
            .catch(() => store.set("bp-giftcard", null));
        } else if (!buyingGiftCards()) {
          currentUser.then(async (u) => {
            if (!u || gift) return;
            const { cards } = await api("/api/subscriptions/gift-cards").catch(() => ({ cards: [] }));
            const card = cards.find((c) => c.balance > 0);
            if (!card || gift) return;
            gift = { code: card.code, last4: card.last4, balance: card.balance };
            renderSummary();
          });
        }
        renderSummary();
        mountCard(config.square);
        startExpress();
      })
      .catch(() => (note.textContent = ""));

    /* Express checkout at the top of the form (see mountExpress): the totals here include a
       discount code or the subscriber discount, and the order notes go with the order. */
    // checkout?paydebug=1 shows, on the page, why the express buttons do or don't appear.
    const payDebug = (line) => {
      if (!new URLSearchParams(location.search).has("paydebug")) return;
      let box = $("[data-pay-debug]");
      if (!box) {
        box = document.createElement("pre");
        box.dataset.payDebug = "";
        box.style.cssText = "white-space:pre-wrap;font-size:12px;background:#f2f2f2;padding:10px;margin:0 0 12px";
        form.prepend(box);
      }
      box.textContent += `${line}\n`;
    };
    const startExpress = () =>
      mountExpress({
        box: $("[data-express]"),
        apple: $("[data-express-apple]"),
        google: $("#express-google"),
        error: $("[data-express-error]"),
        hint: " You can also fill in the form below.",
        totals: (option) => {
          if (option === "courier") return zoneResult?.local && zoneResult.fee != null && !hasCafe() ? { ship: courierCharge(), off: discountTotal(), label: "Local delivery" } : null;
          return { ship: option === "pickup" ? 0 : parcelShipping() ?? null, off: discountTotal() };
        },
        // Apple Pay opens on what's chosen on the page.
        prefer: () => (form.fulfilment?.value === "Pickup" ? "pickup" : byCourier() ? "courier" : "delivery"),
        extra: () => ({ notes: form.notes?.value || "", promo: promo?.code || "" }),
        done: (paid) => showConfirmation({ number: paid.number, total: paid.total, track: paid.track, body: paid.summary, sent: true, paid: true, account: paid.account, cafe: paid.cafe, amounts: paid.amounts }),
        debug: payDebug,
      }).then((x) => {
        // Keep the sheet in step with the page: the way chosen, the address's courier, a code.
        if (x?.refresh) {
          form.addEventListener("change", () => setTimeout(x.refresh, 0));
          document.addEventListener("checkoutchange", x.refresh);
        }
        // The cart on this page uses the same Apple Pay (with this page's totals and code).
        if (!x?.apple) return;
        const box = $("[data-cart-express]");
        const button = $("[data-cart-apple]");
        if (!box || !button) return;
        const sync = () => (box.hidden = !expressCart());
        sync();
        document.addEventListener("cartchange", sync);
        button.hidden = false;
        button.onclick = () => {
          closeOverlays(false);
          x.pay();
        };
      });

    // Paid with Apple Pay or Google Pay from the cart: the confirmation shows here.
    const justPaid = (() => {
      try {
        return JSON.parse(sessionStorage.getItem("bp-paid") || "null");
      } catch {
        return null;
      }
    })();
    if (justPaid) {
      sessionStorage.removeItem("bp-paid");
      showConfirmation({ number: justPaid.number, total: justPaid.total, amounts: justPaid.amounts, body: justPaid.summary, sent: true, paid: true, account: justPaid.account });
      return;
    }
    if (cart.length) gaEvent("begin_checkout", { value: gaValue(cart), items: cart.map((l) => gaItem(l)) });

    // Card payment on this page: Square's card fields sit in the form, and one button places the
    // order and pays it. Card details go straight to Square, which hands back a one-time token;
    // the server pays the order with it (POST /api/orders/pay).
    let pending = null; // the order placed but not yet paid (a declined card can try again)
    let pendingFor = "";
    let agreedTotal = null; // a total the server came back with, once shown
    const submitLabel = () => {
      if (!payCard || isFree()) return "Place Order";
      if (cart.some((l) => l.kind === "sub")) return "Start Subscription";
      if (shipPending()) return "Pay";
      if (pending && agreedTotal === pending.chargeNow) return `Pay ${money(agreedTotal)}`;
      return `Pay ${money(cardTotal())}`;
    };
    const setSubmitLabel = () => {
      const button = $("button[type=submit]", form);
      if (button && !button.disabled) button.textContent = submitLabel();
    };
    document.addEventListener("cartchange", setSubmitLabel);
    form.addEventListener("change", () => setTimeout(setSubmitLabel, 0));
    const mountCard = async (square) => {
      const box = $("[data-pay-inline]");
      box.hidden = false;
      try {
        const Square = await loadSquareSdk(square.sdkUrl);
        const payments = Square.payments(square.applicationId, square.locationId);
        payCard = await payments.card({
          style: CARD_FIELD_STYLE,
        });
        $("#card-container").innerHTML = "";
        await payCard.attach("#card-container");
        setSubmitLabel();
      } catch (err) {
        payCard = null;
        $("#card-container").innerHTML = `<p class="sub-error">Couldn't load the payment form. Please refresh the page.</p>`;
      }
    };
    const shakeCard = () => {
      const frame = $(".card-frame");
      frame?.classList.remove("is-shaking");
      void frame?.offsetWidth;
      frame?.classList.add("is-shaking");
    };

    const error = $("[data-order-error]");
    error.addEventListener("click", (e) => {
      if (e.target.closest("[data-address-keep]")) {
        addressConfirmed = true;
        addressBox.hidden = true;
        error.textContent = "";
        $("button[type=submit]", form).focus();
      }
      const fix = e.target.closest("[data-email-fix-order]");
      if (fix) {
        form.email.value = fix.dataset.emailFixOrder;
        form.email.removeAttribute("aria-invalid");
        error.textContent = "";
      }
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      error.textContent = "";
      if (!formValid(form)) return; // each field says what's missing; the line by the button says which
      // Nothing is charged until the shipping price is in.
      if ((hasShippable() && form.fulfilment.value !== "Pickup" && shipPending()) || taxNow() === undefined) {
        error.textContent = "Getting your total. One moment.";
        return;
      }
      const d = new FormData(form);
      const button = $("button[type=submit]", form);
      const pickup = store.get("bp-pickup", {});
      const cafeLine = cart.find((l) => l.kind === "pickup");
      const payload = {
        ...Object.fromEntries(["name", "email", "phone", "fulfilment", "address", "city", "state", "postcode", "notes"].map((k) => [k, d.get(k) || ""])),
        lines: cart.map(orderLine),
        // Courier or post, and the fee shown, so the order is charged what the page said.
        delivery: byCourier() ? "courier" : "ship",
        courierFee: byCourier() && zoneResult.fee != null ? courierCharge() : null,
        postage: hasShippable() && !byCourier() && d.get("fulfilment") !== "Pickup" ? parcelShipping() : null,
        tax: taxNow() ?? null,
        promo: promo?.code || "",
        giftCard: gift && !buyingGiftCards() ? gift.code : "",
        addressConfirmed,
        cafe: cafeLine
          ? { location: cafeLine.delivery?.from || pickup.location, mode: cafeLine.delivery ? "delivery" : "pickup", time: pickup.time, address: cafeLine.delivery }
          : null,
      };
      error.textContent = "";
      button.disabled = true;
      button.textContent = payCard ? "Paying…" : "Placing order…";
      let stage = "order";
      try {
        // The same details as a declined try reuse that order; anything changed places a new one.
        const key = JSON.stringify(payload);
        if (!pending || pendingFor !== key) {
          pending = await api("/api/orders", { method: "POST", body: payload });
          pendingFor = key;
        }
        const result = pending;
        if (!result.square) {
          pending = null;
          return showConfirmation({ number: result.number, total: result.total, track: result.track, body: result.summary, sent: true, account: result.account, cafe: result.cafe });
        }
        // The order came out at a different total from the one shown: show it before charging.
        const shown = cardTotal();
        if (!result.subscription && Math.abs(result.chargeNow - shown) > 0.009 && agreedTotal !== result.chargeNow) {
          agreedTotal = result.chargeNow;
          stage = "total";
          throw new Error(`Your total is ${money(result.chargeNow)}. Press Pay to continue.`);
        }
        const free = result.chargeNow <= 0 && !result.subscription;
        if (!payCard && !free) throw new Error("Payment form didn't load. Refresh the page.");
        stage = "card";
        if (free) {
          // Nothing to charge: the order goes straight through.
          const paid = await api("/api/orders/pay", { method: "POST", body: { number: result.number, payToken: result.payToken } });
          pending = null;
          return showConfirmation({ number: paid.number, total: paid.total, track: paid.track, body: paid.summary, sent: true, paid: true, account: paid.account, cafe: paid.cafe, amounts: paid.amounts });
        }
        const [givenName, ...rest] = String(d.get("name") || "").trim().split(/\s+/);
        gaEvent("add_shipping_info", { value: gaValue(cart), shipping_tier: d.get("fulfilment") || "Shipping", items: cart.map((l) => gaItem(l)) });
        gaEvent("add_payment_info", { value: gaValue(cart), payment_type: "Card", items: cart.map((l) => gaItem(l)) });
        // Strong customer authentication runs inside tokenize when the bank asks for it.
        const token = await payCard.tokenize({
          amount: (result.subscription ? result.subscription.price + result.chargeNow : result.chargeNow).toFixed(2),
          currencyCode: SITE.currencyCode,
          intent: result.subscription ? "CHARGE_AND_STORE" : "CHARGE",
          customerInitiated: true,
          sellerKeyedIn: false,
          billingContact: { givenName, familyName: rest.join(" "), email: d.get("email") || undefined, postalCode: d.get("postcode") || undefined, countryCode: "US" },
        });
        if (token.status !== "OK") throw new Error("Check your card details.");
        const paid = await api("/api/orders/pay", { method: "POST", body: { number: result.number, payToken: result.payToken, sourceId: token.token } });
        pending = null;
        showConfirmation({ number: paid.number, total: paid.total, track: paid.track, body: paid.summary, sent: true, paid: true, account: paid.account, cafe: paid.cafe, amounts: paid.amounts });
      } catch (err) {
        button.disabled = false;
        button.textContent = submitLabel();
        // The order didn't go through (offline, or our side): nothing was charged, the cart stays.
        if (stage === "order" && (!err.fromApi || err.status >= 500)) err.message = "Order didn't go through. Nothing was charged.";
        if (err.data?.expired) pending = null;
        if (err.data?.courierFee != null && zoneResult) {
          // The courier's price moved since the address was checked: show the new one.
          zoneResult = { ...zoneResult, fee: err.data.courierFee };
          renderSummary();
        }
        if (err.data?.tax != null) {
          // The tax rate was looked up again: show it.
          taxRateCache.clear();
          renderSummary();
        }
        if (err.data?.postage != null) {
          // USPS's price came in different from the one shown: show it.
          postageCache.set(postageKey(d.get("postcode"), parcelOz(cart.filter((l) => !sentAway(l)))), { fee: err.data.postage, settled: true, wait: Promise.resolve(err.data.postage) });
          renderSummary();
        }
        if (err.data?.field === "giftCard" || err.data?.giftCardShort) {
          // The gift card's balance changed (or it can't be used here): check it again and show why.
          pending = null;
          if (err.data.giftCardShort && gift) checkGift(gift.code);
          else {
            gift = null;
            giftError = err.message;
            renderSummary();
          }
        }
        if (err.data?.promo) {
          // The code stopped applying (ended, used up): take it off and show why.
          promo = null;
          promoError = err.message;
          renderSummary();
        }
        error.textContent = err.message || "That didn't go through. Try again.";
        if (err.data?.field === "email" && err.data.suggestion) {
          error.innerHTML = `${esc(err.message)} Did you mean <button type="button" class="link-button is-inline" data-email-fix-order="${esc(err.data.suggestion)}">${esc(err.data.suggestion)}</button>?`;
        }
        if (err.data?.field === "address") {
          // Not found, or a unit number missing. Their own address shows USPS's answer under it;
          // a gift recipient's, here. Either way they can say it's right and place it anyway.
          if (!err.data.recipient && err.data.addressCheck) showAddressCheck(err.data.addressCheck);
          if (err.data.recipient || !err.data.addressCheck) error.innerHTML = `${esc(err.message)} <button type="button" class="link-button" data-address-keep>It's right</button>`;
        }
        if (err.data?.login) error.innerHTML = `${esc(err.message)} <a href="login" data-login-next="checkout">Log in or sign up</a>`;
        if (stage === "card") shakeCard();
        else flagFields(form, err.message);
        error.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
      }
    });
  },
};

/* ── Motion ───────────────────────────────────────────────── */

let revealObserver = null;

// Words rise into place one after another, like the menu's lines, when the text scrolls
// into view. Each word sits in a clipped box; links and marks inside keep working.
function splitWords(root) {
  let n = 0;
  const walk = (node) => {
    for (const child of [...node.childNodes]) {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        for (const part of child.textContent.split(/(\s+)/)) {
          if (!part) continue;
          if (/^\s+$/.test(part)) {
            frag.append(document.createTextNode(part));
            continue;
          }
          const w = document.createElement("span");
          w.className = "w";
          const inner = document.createElement("span");
          inner.textContent = part;
          inner.style.setProperty("--w", Math.min(n++, 60) as any);
          w.append(inner);
          frag.append(w);
        }
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE && !child.matches("sup")) walk(child);
    }
  };
  walk(root);
  // A ® stays with its word, and punctuation with the link before it ("True Specialty®,"):
  // separate word spans could otherwise break the line between them.
  for (const sup of root.querySelectorAll("sup")) {
    const prev = sup.previousSibling;
    if (prev?.classList?.contains("w")) prev.firstChild.append(sup);
  }
  for (const w of root.querySelectorAll(".w")) {
    const prev = w.previousSibling;
    if (!/^[,.;:!?)”’]/.test(w.textContent) || !(prev instanceof Element) || prev.classList.contains("w")) continue;
    const keep = document.createElement("span");
    keep.className = "nowrap";
    prev.replaceWith(keep);
    keep.append(prev, w);
  }
}

function wordReveals() {
  const els = $$("[data-words]:not(.is-split)");
  if (!els.length) return;
  if (reduceMotion || !("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-in");
        io.unobserve(e.target);
      }),
    { rootMargin: "0px 0px -12% 0px", threshold: 0.15 }
  );
  els.forEach((el) => {
    // Translated first (on /es/ and /ko/), then split; the words themselves aren't translated again.
    window.i18n?.translate(el);
    el.setAttribute("data-no-i18n", "");
    splitWords(el);
    el.classList.add("is-split");
    io.observe(el);
  });
}

function observeReveals() {
  const els = $$("[data-reveal]:not(.is-visible)");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    els.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  revealObserver ??= new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      }),
    // Start a little before it scrolls in, so a quick flick doesn't leave blank space
    // (iPhones hold these callbacks until a fast scroll settles).
    { rootMargin: "0px 0px 20% 0px", threshold: 0 }
  );
  els.forEach((el) => revealObserver.observe(el));
}

function headerOnScroll() {
  const header = $("[data-header]");
  // Sticky bars below the header (e.g. the order menu tabs) sit under it.
  const setOffset = () => document.documentElement.style.setProperty("--header-offset", `${header.offsetHeight}px`);
  setOffset();
  addEventListener("resize", setOffset);
  header.addEventListener("transitionend", setOffset);
  // Home: over the full-screen photo the header is see-through with white text.
  const hero = $(".hero");
  const onHero = () => {
    const now = Boolean(hero) && !document.documentElement.classList.contains("home-shop") && scrollY < hero.offsetHeight - header.offsetHeight;
    header.classList.toggle("on-hero", now);
  };
  onHero();
  let lastY = scrollY;
  let ticking = false;
  addEventListener(
    "scroll",
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        onHero();
        if (!document.body.classList.contains("is-locked")) {
          // Stays in view on the home intro screens (they only move on a tap).
          const hidden = y > lastY && y > 140 && !document.documentElement.classList.contains("home-intro");
          header.classList.toggle("is-hidden", hidden);
          header.classList.toggle("is-scrolled", y > 8);
          document.body.classList.toggle("header-hidden", hidden);
        }
        lastY = y;
        ticking = false;
      });
    },
    { passive: true }
  );
}

/* ── Chat: a conversation with the people at the roastery ──
   Opened from "Chat Us" in the menu (and "Talk to a person" on the FAQ page). Like a support
   chat: the customer just writes, no name or email asked. The first message starts a
   conversation in the back office Inbox (/api/chat), which hands back a key this browser keeps:
   the window then shows the roastery's replies as they're sent (and a dot on "Chat Us" when they
   come back to the site), and what's written next goes to the same conversation. When nobody's
   at the back office, the chat says we're away and will be back. No AI answers here. */

const CHAT_KEY = "bp-chat";
let chatState = store.get(CHAT_KEY, null) || { messages: [] }; // { messages: [{ from, text }], id?, token?, email?, seen? }
if (!chatState.token) chatState = { messages: [] }; // (an older version kept assistant answers here)
let chatAway = false; // nobody at the back office right now
let chatBusy = false;
let chatPoll = 0;
let chatAsked = []; // the FAQ page's questions, sent along so the roastery sees what was asked
// One message as the window keeps it: who wrote it (a teammate's name and photo), when, and
// whether it's the closing one that asks for a rating.
const chatMsg = (m) => ({ id: m.id, from: m.from, text: m.text, ...(m.at && { at: m.at }), ...(m.by && { by: m.by }), ...(m.rate && { rate: true }), ...(m.files && { files: m.files }), ...(m.cart && { cart: m.cart }), ...(m.cards && { cards: m.cards }), ...(m.replies && { replies: m.replies }), ...(m.checkout && { checkout: true }), ...(m.content && { content: m.content }), ...(m.tapback && { tapback: m.tapback }) });

/* ── What a message holds, for both chat windows (Chat Us and the portal's) ──
   The server sends each message as typed content (text, a file, a poll, a card, a reaction…);
   these read it. A reaction isn't a message of its own: it shows on the message it's for. */
const partOf = (m, type) => (m?.content || []).find((x) => x.type === type);
const isReaction = (m) => Boolean(partOf(m, "reaction"));
const CHAT_REACTS = ["❤️", "👍", "👎", "😂", "‼️", "❓"];
// Each message's reactions: ours (the team's) and theirs.
function chatReactions(list) {
  const out = new Map();
  const add = (id, r) => out.set(id, [...(out.get(id) || []).filter((x) => x.by !== r.by), r]);
  for (const m of list) {
    if (m.tapback) add(m.id, { emoji: m.tapback.emoji, by: m.tapback.by === "customer" ? "you" : "us" });
    const r = partOf(m, "reaction");
    if (r) add(r.to, { emoji: r.emoji, by: "you" });
  }
  return out;
}
const chatReactsHtml = (list) => (list?.length ? `<span class="chat-reacts">${list.map((r) => `<span title="${esc(tr(r.by === "you" ? "You" : SITE.name))}">${r.emoji}</span>`).join("")}</span>` : "");
// Tap one of our messages: the six reactions under it.
const chatReactPick = (id) => `<div class="chat-react-pick" role="toolbar" aria-label="${esc(tr("React"))}">${CHAT_REACTS.map((e) => `<button type="button" data-react="${e}" data-react-to="${esc(id)}">${e}</button>`).join("")}</div>`;
// A question from the team with choices to tap; theirs is marked.
const chatPollHtml = (m) => {
  const p = partOf(m, "poll");
  return `<div class="chat-poll" data-chat-poll="${esc(m.id)}"><strong>${esc(p.question)}</strong>${p.options.map((o) => `<button type="button" data-poll-choice="${esc(o)}" aria-pressed="${p.choice === o}">${esc(o)}</button>`).join("")}</div>`;
};
// Their conversations on this device, newest first (Messages): each one's key, its latest line
// and who answered.
const CHAT_HISTORY_KEY = "bp-chat-history";
// (A conversation from their account on another device has no key here until it's opened.)
const chatHistory = () => (store.get(CHAT_HISTORY_KEY, []) || []).filter((x) => x?.id);
function rememberChat() {
  if (!chatState.id || !chatState.token) return;
  const last = [...chatState.messages].reverse().find((m) => m.text);
  const staff = [...chatState.messages].reverse().find((m) => m.by);
  const entry = { id: chatState.id, token: chatState.token, fromEmail: Boolean(chatState.fromEmail), preview: String(last?.text || "").slice(0, 90), at: last?.at || new Date().toISOString(), by: staff?.by || null, rated: Boolean(chatState.rating) };
  store.set(CHAT_HISTORY_KEY, [entry, ...chatHistory().filter((x) => x.id !== entry.id)].slice(0, 20));
}
const forgetChat = (id) => store.set(CHAT_HISTORY_KEY, chatHistory().filter((x) => x.id !== id));
const saveChat = () => {
  store.set(CHAT_KEY, chatState);
  rememberChat();
};
const chatLive = () => Boolean(chatState.id && chatState.token);
const chatStaffCount = () => chatState.messages.filter((m) => m.from !== "customer").length;
const chatAssistant = () => Boolean(SITE.chatAssistant); // the assistant answers new chats
let chatWriting = false; // the assistant is writing an answer (its dots show)
let chatAgent = false; // the assistant is answering this chat (until someone on the team steps in)
let chatWantsPerson = false; // asked for a person before writing: the first message goes to the team
// What the assistant put in their cart goes in once (the ids done are kept with the chat).
function applyChatCarts() {
  const done = new Set(chatState.carts || []);
  let added = 0;
  for (const m of chatState.messages) {
    if (!m.cart || !m.id || done.has(m.id)) continue;
    done.add(m.id);
    for (const it of m.cart) {
      const p = PRODUCTS.find((x) => x.id === it.product);
      const a = !p && ACCESSORIES.find((x) => x.id === it.product);
      if (p) addLine(coffeeLine(p, it.size || "250g", it.grind || "Whole Bean", it.qty || 1), { open: false });
      else if (a) addLine(accessoryLine(a, { size: it.size || "", color: it.color || "" }, it.qty || 1), { open: false });
      else continue;
      added += 1;
    }
  }
  chatState.carts = [...done].slice(-50);
  if (added) toast(`Added to your cart. <a href="checkout">Checkout</a>`);
}

// Checkout inside the chat: the checkout page itself, without its header and footer, in the sheet,
// so paying never leaves the conversation. Its own links (an order's page, the shop) open the site.
function openChatPay() {
  if (!$("[data-chat-pay]"))
    $(".chat-panel").insertAdjacentHTML(
      "beforeend",
      `<section class="chat-pay" data-chat-pay aria-label="Checkout" hidden>
        <div class="chat-pay-head">
          <button type="button" class="chat-pay-back" data-chat-pay-back aria-label="Back to chat"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <strong>Checkout</strong>
        </div>
      </section>`
    );
  const pay = $("[data-chat-pay]");
  if (!$("iframe", pay)) pay.insertAdjacentHTML("beforeend", `<iframe class="chat-pay-frame" src="checkout?embed=1" title="Checkout" allow="payment"></iframe>`);
  pay.hidden = false;
  $(".chat-panel").classList.add("is-paying");
  gaEvent("chat_checkout_open", { value: gaValue(cart) });
}
function closeChatPay() {
  const pay = $("[data-chat-pay]");
  if (!pay) return;
  pay.hidden = true;
  $(".chat-panel").classList.remove("is-paying");
  $("iframe", pay)?.remove(); // fresh next time (the cart may have changed)
}
document.addEventListener("cartchange", () => renderChatCheckout());

function renderChatShell() {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="overlay drawer chat" id="chat" role="dialog" aria-modal="true" aria-label="Chat" inert>
      <div class="drawer-backdrop" data-close></div>
      <aside class="drawer-panel chat-panel">
        <div class="drawer-head chat-head">
          <button type="button" class="chat-back" data-chat-list aria-label="Messages" title="Messages" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          <span class="chat-avatar is-head" aria-hidden="true">${LOGO_MARK}</span>
          <div class="chat-title">
            <h2>${esc(SITE.name)}</h2>
            <small class="chat-sub" data-chat-status>The team at the roastery</small>
          </div>
          <span class="chat-head-actions">
            <button type="button" class="chat-person" data-chat-person aria-label="Talk to a Person" title="Talk to a Person" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="5.5" r="2.75"/><path d="M2.75 14c.6-2.7 2.7-4.25 5.25-4.25s4.65 1.55 5.25 4.25"/></svg><span>Talk to a Person</span></button>
            <button type="button" class="chat-new" data-chat-more aria-label="More" title="More" aria-expanded="false" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="3.5" cy="8" r="1.2"/><circle cx="8" cy="8" r="1.2"/><circle cx="12.5" cy="8" r="1.2"/></svg></button>
            <div class="chat-menu" data-chat-menu hidden>
              <button type="button" data-chat-search-open>Search Conversation</button>
              <button type="button" data-chat-transcript>Download Transcript</button>
            </div>
            <button type="button" class="chat-new" data-chat-new aria-label="New Chat" title="New Chat" hidden><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9v3.5a1.5 1.5 0 0 1-1.5 1.5H3.5A1.5 1.5 0 0 1 2 12.5V4a1.5 1.5 0 0 1 1.5-1.5H7"/><path d="M11.7 1.8a1.3 1.3 0 0 1 1.8 1.8L8.2 8.9 6 9.5l.6-2.2z"/></svg></button>
            <button class="close" type="button" data-close aria-label="Close chat">${CLOSE_ICON}</button>
          </span>
        </div>
        <div class="chat-list" data-chat-listview hidden></div>
        <div class="chat-search" data-chat-search hidden><input type="search" data-chat-search-input placeholder="Search conversation" aria-label="Search conversation" autocomplete="off"><button type="button" class="close" data-chat-search-close aria-label="Close search">${CLOSE_ICON}</button></div>
        <ol class="chat-thread" data-chat-thread aria-live="polite"></ol>
        <div class="chat-foot">
          <p class="sub-error" data-chat-error role="alert"></p>
          <section class="chat-checkout" data-chat-checkout aria-label="Your cart" hidden>
            <button type="button" class="chat-checkout-head" data-chat-checkout-toggle aria-expanded="true">
              <span class="chat-checkout-thumbs" data-chat-checkout-thumbs aria-hidden="true"></span>
              <span class="chat-checkout-title"><strong>Your Cart</strong><small data-chat-cart-sum></small></span>
              <svg class="chat-checkout-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <div class="chat-checkout-body" data-chat-checkout-body>
              <ul class="chat-checkout-lines" data-chat-checkout-lines></ul>
              <div class="free-ship chat-checkout-ship" data-chat-free-ship></div>
              <p class="chat-checkout-total"><span>Subtotal</span><span data-chat-cart-total></span></p>
              <div class="express express-chat" data-chat-express hidden>
                <button type="button" class="button wallet-button" data-chat-apple aria-label="Check out with Apple Pay" hidden><span>Check out with</span><svg class="apple-logo" viewBox="0 0 814 1000" aria-hidden="true"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z"/></svg><span>Pay</span></button>
                <div id="chat-google" hidden></div>
                <p class="express-error sub-error" data-chat-express-error role="alert"></p>
              </div>
              <button type="button" class="button chat-checkout-cta" data-chat-pay-open>Checkout</button>
            </div>
          </section>
          </div>
          <form class="chat-compose" data-chat-form>
            <div class="chat-files" data-chat-files hidden></div>
            <button type="button" class="chat-plus" data-chat-plus aria-label="Add photos or a PDF" title="Add photos or a PDF"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
            <input type="file" data-chat-file accept="image/*,application/pdf" multiple hidden>
            <label class="visually-hidden" for="chat-input">Message</label>
            <textarea id="chat-input" name="text" rows="1" maxlength="2000" placeholder="Ask anything…"></textarea>
            <button type="button" class="chat-mic" data-chat-mic aria-label="Dictate" aria-pressed="false" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM19 11a7 7 0 0 1-14 0M12 18v3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
            <button type="submit" class="chat-send" aria-label="Send"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
          </form>
          <button type="button" class="button chat-cart-bar" data-chat-cart-bar hidden><span>Cart</span><span data-chat-cart-bar-total></span></button>
        </div>

      </aside>
    </div>`
  );
}

/* ── Chat cards: what the assistant shows beside its words ── */

// A product: its picture, name, roast or kind, the size to buy and Add.
function chatProductCard(id) {
  const p = PRODUCTS.find((x) => x.id === id);
  const a = !p && ACCESSORIES.find((x) => x.id === id);
  const x = p || a;
  if (!x) return "";
  const href = `products/${encodeURIComponent(x.id)}`;
  const sizes = p ? ["250g", "1kg"] : a.sizes?.length ? a.sizes : (a.colors || []).map((c) => c.name);
  const sold = (z) => x.soldOut || (z && x.leftBy?.[z] === 0);
  const choice = sizes.length
    ? `<span class="chat-sizes" role="radiogroup" aria-label="${p ? "Size" : a.sizes?.length ? "Size" : "Color"}">${sizes
        .map((z, i) => `<button type="button" role="radio" class="chat-size${i === 0 ? " is-on" : ""}" aria-checked="${i === 0}" data-chat-size="${esc(z)}"${sold(z) ? " disabled" : ""}>${esc(z)}</button>`)
        .join("")}</span>`
    : "";
  return `<article class="chat-card chat-product" data-chat-product="${esc(x.id)}">
    <a class="chat-card-thumb" href="${href}" tabindex="-1" aria-hidden="true">${searchThumb(p ? productArt(p) : accessoryArt(a))}</a>
    <div class="chat-card-body">
      <a class="chat-card-title" href="${href}">${esc(x.short || bareName(x.name))}</a>
      <small class="chat-card-meta">${esc(p ? `${p.type}${p.notes ? ` · ${p.notes}` : ""}` : a.pack || a.category || "")}</small>
      <span class="chat-card-price" data-chat-price>${p ? priceHtml(p, "250g") : money(a.price)}</span>
      <div class="chat-card-row">
        ${choice}
        <button type="button" class="chat-card-add" data-chat-add${x.soldOut ? " disabled" : ""}>${x.soldOut ? "Sold Out" : "Add"}</button>
      </div>
    </div>
  </article>`;
}

// An order: where it is (a four-step track), what's in it, and its tracking page.
const chatOrderCard = (o) => `<article class="chat-card chat-order">
  <header><strong>${esc(o.number)}</strong><small>${esc(new Date(`${o.placed}T12:00:00`).toLocaleDateString(LOCALE_US, { month: "short", day: "numeric" }))} · ${money(o.total)}</small></header>
  ${
    o.cancelled
      ? `<p class="chat-order-state">Cancelled</p>`
      : `<ol class="chat-steps" aria-label="Progress">${o.steps.map((st, i) => `<li class="${i <= o.at ? "is-done" : ""}${i === o.at ? " is-now" : ""}"${i === o.at ? ' aria-current="step"' : ""}>${esc(st)}</li>`).join("")}</ol>`
  }
  <ul class="chat-order-items">${o.items.map((t) => `<li>${esc(t)}</li>`).join("")}${o.more ? `<li>+${o.more} more</li>` : ""}</ul>
  <a class="chat-card-link" href="${esc(o.page.replace(/^\//, ""))}">Track Order</a>
</article>`;

// A subscription: what, how often, the next delivery, and taps to skip or pause it (they ask
// the assistant, which confirms first).
const chatSubCard = (x) => `<article class="chat-card chat-sub-card">
  <header><strong>${esc(x.coffee)}</strong><small>${esc(x.size)} · ${esc(x.every)} · ${money(x.price)}</small></header>
  <p class="chat-card-meta">${x.status === "active" && x.next ? `Next delivery ${esc(new Date(`${x.next}T12:00:00`).toLocaleDateString(LOCALE_US, { weekday: "short", month: "short", day: "numeric" }))}` : x.status === "paused" ? "Paused" : esc(x.status)}${x.gift ? ` · For ${esc(x.gift)}` : ""}</p>
  <div class="chat-card-actions">
    ${x.status === "active" ? `<button type="button" class="chat-card-btn" data-chat-say="Skip my next ${esc(x.coffee)} delivery">Skip Next</button><button type="button" class="chat-card-btn" data-chat-say="Pause my ${esc(x.coffee)} subscription">Pause</button>` : ""}
    ${x.status === "paused" ? `<button type="button" class="chat-card-cta" data-chat-say="Resume my ${esc(x.coffee)} subscription">Resume</button>` : ""}
  </div>
</article>`;

const chatCards = (m) =>
  [
    ...(m.cards || []).map((c) => (c.type === "product" ? chatProductCard(c.id) : c.type === "order" ? chatOrderCard(c) : c.type === "subscription" ? chatSubCard(c) : "")),
  ].join("");

// Their own words, ours, a note, or the dots. Our first message in a run carries the logo.
// Our answers as rich text: short paragraphs, **bold**, *italic*, "- " lists, and the products it
// names in bold (as the assistant writes them, or not).
let chatNames = null;
function chatRich(text) {
  chatNames ||= new RegExp(
    `(${[...new Set([...PRODUCTS, ...ACCESSORIES].flatMap((x) => [x.name, bareName(x.name), x.short]).filter((n) => n && n.length > 5))]
      .sort((a, b) => b.length - a.length)
      .map((n) => esc(n).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .join("|")})`,
    "gi"
  );
  const inline = (t) =>
    esc(t)
      .split(/(\*\*.+?\*\*)/)
      .map((part) => (/^\*\*.+\*\*$/.test(part) ? `<strong>${part.slice(2, -2)}</strong>` : part.replace(chatNames, "<strong>$1</strong>").replace(/(^|[\s(])\*(?=\S)([^*]+?)\*(?=[\s.,!?;:)]|$)/g, "$1<em>$2</em>")))
      .join("");
  return String(text || "")
    .trim()
    .split(/\n\s*\n/)
    .map((block) => {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length && lines.every((l) => /^[-*•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^[-*•]\s+/, ""))}</li>`).join("")}</ul>`;
      return `<p>${lines.map(inline).join("<br>")}</p>`;
    })
    .join("");
}

const tr = (x) => window.i18n?.t(x) ?? x;
// A teammate's round photo, or their initial.
const chatFace = (by, cls = "") => (by?.photo ? `<img class="chat-avatar is-photo${cls}" src="${esc(by.photo)}" alt="">` : `<span class="chat-avatar is-initial${cls}" aria-hidden="true">${esc((by?.name || "?")[0])}</span>`);
// The day above its messages, a line when a teammate joins, and after the closing message the
// card to rate the conversation.
function chatRows(list) {
  const out = [];
  let day = "";
  let lastBy = "";
  const lastRate = list.map((m) => Boolean(m.rate)).lastIndexOf(true);
  list.forEach((m, i) => {
    if (m.at) {
      const d = new Date(m.at).toLocaleDateString(LANG === "ko" ? "ko-KR" : LANG === "es" ? "es-US" : "en-US", { month: "long", day: "numeric" });
      if (d !== day) out.push({ day: (day = d) });
    }
    if (m.from === "staff" && m.by && m.by.name !== lastBy) out.push({ joined: (lastBy = m.by.name) && m.by });
    out.push(m);
    if (i === lastRate) out.push({ rating: true });
  });
  return out;
}
const RATE_FACES = [[1, "Terrible", "😠"], [2, "Bad", "🙁"], [3, "OK", "😐"], [4, "Great", "😃"], [5, "Amazing", "🤩"]];
function chatRatingCard() {
  const r = chatState.rating;
  const send = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  return `<li class="chat-rate${r ? " is-rated" : ""}">
    <p>${tr("Rate your conversation")}</p>
    <div class="chat-rate-faces">${RATE_FACES.map(([n, label, face]) => `<button type="button" data-chat-rate="${n}" class="${r?.score === n ? "is-on" : ""}" aria-pressed="${r?.score === n}" aria-label="${tr(label)}" title="${tr(label)}">${face}</button>`).join("")}</div>
    ${r ? (r.comment ? `<p class="chat-rate-said" translate="no">“${esc(r.comment)}”</p>` : `<form class="chat-rate-more" data-chat-rate-more><input name="comment" maxlength="500" autocomplete="off" placeholder="${tr("Tell us more…")}" aria-label="${tr("Tell us more…")}"><button type="submit" aria-label="${tr("Send")}">${send}</button></form>`) : ""}
  </li>`;
}

let chatReacts = new Map(); // message id → its reactions (set as the thread is drawn)
let chatReactOpen = ""; // the message whose reactions are open
const chatBubble = (m, i, rows) => {
  if (m.note) return `<li class="chat-note">${esc(m.text)}</li>`;
  if (m.day) return `<li class="chat-day">${esc(m.day)}</li>`;
  if (m.joined) return `<li class="chat-joined">${chatFace(m.joined)}<span><strong>${esc(m.joined.name)}</strong> ${tr("joined the conversation")}</span></li>`;
  if (m.rating) return chatRatingCard();
  const ours = m.from !== "customer";
  if (m.writing) return `<li class="chat-msg from-staff is-writing" aria-label="Writing…"><div class="chat-bubble"><span class="chat-dots"></span></div></li>`;
  if (partOf(m, "unsent")) return `<li class="chat-note">${esc(ours ? m.by?.name || SITE.name : tr("You"))} ${esc(tr("unsent a message"))}</li>`;
  const text = ours && !m.welcome ? m.text.replace(/\s*https?:\/\/\S*(?:product(?:\.html)?\?id=|products\/)[\w-]+/g, "").trim() || m.text : m.text;
  // Products it names without a card: the same compact cards.
  const linked = ours && !m.welcome && !m.cards?.length ? [...new Set(productsIn(m.text))].slice(0, 3).map(chatProductCard).join("") : "";
  // Photos and PDFs they sent: the photo itself, or the PDF's name; "Sent a photo." isn't repeated.
  const files = m.files?.length ? `<div class="chat-sent-files">${m.files.map(chatFileTile).join("")}</div>` : "";
  const said = (files && /^Sent (a|\d+) [\w ]+\.$/.test(text)) || (partOf(m, "card") && /^Order MF-[A-Z0-9]+$/.test(text)) ? "" : text;
  // Ours can be tapped for a reaction (not the welcome); a poll shows its choices to tap.
  const reactable = ours && !m.welcome && m.id;
  const words = partOf(m, "poll") ? chatPollHtml(m) : !said ? "" : ours ? `<div class="chat-bubble"${m.welcome ? "" : ' translate="no"'}${reactable ? ` data-react-open="${esc(m.id)}"` : ""}>${chatRich(said)}</div>` : `<p translate="no">${esc(said)}</p>`;
  const extras = `${chatReactsHtml(chatReacts.get(m.id))}${partOf(m, "edited") ? `<small class="chat-edited">${esc(tr("Edited"))}</small>` : ""}${reactable && chatReactOpen === m.id ? chatReactPick(m.id) : ""}`;
  // A teammate's reply: their face beside the last of a run, and their name under it.
  const by = ours && m.by;
  const lastOfRun = by && rows[i + 1]?.by?.name !== m.by.name;
  return `<li class="chat-msg from-${ours ? "staff" : "you"}${by ? " has-by" : ""}${m.pending ? " is-pending" : ""}">${by ? chatFace(m.by, lastOfRun ? "" : " is-quiet") : ""}<div class="chat-msg-body">
    ${files}${words}${extras}${m.pending ? `<small class="chat-status">Sending…</small>` : ""}${chatCards(m)}${linked}${lastOfRun ? `<small class="chat-by">${esc(m.by.name)}</small>` : ""}
  </div></li>`;
};
const chatFileUrl = (f) => f.url || (f.id && chatState.id ? `/api/chat/${chatState.id}/files/${f.id}?t=${encodeURIComponent(chatState.token)}` : "");
const PDF_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linejoin="round"/></svg>`;
const chatFileTile = (f) =>
  f.kind === "image" && chatFileUrl(f)
    ? `<a class="chat-file is-image" href="${esc(chatFileUrl(f))}" target="_blank" rel="noopener"><img src="${esc(chatFileUrl(f))}" alt="${esc(f.name || "Photo")}" loading="lazy"></a>`
    : `<a class="chat-file"${chatFileUrl(f) ? ` href="${esc(chatFileUrl(f))}" target="_blank" rel="noopener"` : ""}>${PDF_ICON}<span translate="no">${esc(f.name || "PDF")}</span></a>`;

// What's waiting to go with the next message (+ in the box): up to three photos or PDFs. Photos
// are shrunk to 1600px first; a PDF goes as it is (10 MB at most).
let chatFiles = [];
const shrinkPhoto = (file) =>
  new Promise<string>((resolve, reject) => {
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
    img.onerror = () => (URL.revokeObjectURL(url), reject(new Error(`Couldn't open ${file.name || "that photo"}.`)));
    img.src = url;
  });
const readDataUrl = (file) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    r.readAsDataURL(file);
  });
async function addChatFiles(list) {
  const error = $("[data-chat-error]");
  error.textContent = "";
  for (const file of [...list]) {
    try {
      if (chatFiles.length >= 3) throw new Error("Up to 3 files a message.");
      if (file.type.startsWith("image/")) {
        const url = await shrinkPhoto(file);
        chatFiles.push({ name: file.name || "Photo", kind: "image", type: "image/jpeg", data: url.split(",")[1], url });
      } else if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
        if (file.size > 10 * 1024 * 1024) throw new Error(`${file.name} is over 10 MB.`);
        chatFiles.push({ name: file.name, kind: "pdf", type: "application/pdf", data: (await readDataUrl(file)).split(",")[1] });
      } else throw new Error("Add a photo or a PDF.");
    } catch (err) {
      error.textContent = err.message;
      break;
    }
  }
  drawChatFiles();
}
function drawChatFiles() {
  const tray = $("[data-chat-files]");
  if (!tray) return;
  tray.innerHTML = chatFiles.map((f, i) => `<span class="chat-file${f.kind === "image" ? " is-image" : ""}">${f.kind === "image" ? `<img src="${f.url}" alt="">` : `${PDF_ICON}<span translate="no">${esc(f.name)}</span>`}<button type="button" class="chat-file-x" data-chat-unfile="${i}" aria-label="Remove ${esc(f.name)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button></span>`).join("");
  tray.hidden = !chatFiles.length;
}

// Quick replies under the latest answer, and the starters before anything's been said.
// (Talk to a Person has its own place in the chat's header, so it isn't a starter too.)
const CHAT_STARTERS = ["Help Me Choose a Coffee", "Track My Order", "Gift Ideas"];
const isPersonAsk = (q) => /^(talk|speak|chat) (to|with) (a|the) (person|human|team|someone)\b/i.test(String(q || "").trim());
const chatReplies = (list) => `<li class="chat-replies">${list.map((q) => `<button type="button" class="chat-chip" data-chat-say="${esc(q)}">${esc(q)}</button>`).join("")}</li>`;

// Checkout from the chat: the cart's count and total, Checkout, and Apple Pay or Google Pay
// (the same express checkout as the cart), whenever the cart has something in it.
let chatExpress = null;
// It shows once checkout comes up in the conversation: the assistant filled their cart, they
// tapped Add on a card, or they asked to check out ([[checkout]]); not just for a full cart.
const chatWantsCheckout = () => shopOpen() && Boolean(chatState.checkout || chatState.messages.some((m) => m.cart || m.checkout));
function renderChatCheckout() {
  const dock = $("[data-chat-checkout]");
  if (!dock) return;
  // The cart's total, pinned under the message box whenever something's in it.
  const bar = $("[data-chat-cart-bar]");
  bar.hidden = !cart.length;
  $("[data-chat-cart-bar] span").textContent = `Cart (${cartCount()})`;
  $("[data-chat-cart-bar-total]").textContent = money(cartSubtotal());
  // Cards for what's already in the cart say so, with what's left to free shipping.
  $$("[data-chat-product]").forEach((card) => {
    const add = $("[data-chat-add]", card);
    if (!add || add.disabled) return;
    const inCart = cart.some((l) => l.product === card.dataset.chatProduct);
    add.classList.toggle("is-added", inCart);
    add.textContent = inCart ? (window.i18n?.t("Added") ?? "Added") : (window.i18n?.t("Add") ?? "Add");
    let note = $("[data-chat-card-ship]", card);
    if (inCart && !note) $(".chat-card-body", card).insertAdjacentHTML("beforeend", `<small class="chat-card-ship" data-chat-card-ship></small>`);
    note = $("[data-chat-card-ship]", card);
    if (note) {
      const left = SITE.freeShippingOver - cartSubtotal();
      note.hidden = !inCart;
      note.textContent = left > 0 ? `${money(left)} to free shipping` : "Free shipping";
    }
  });
  const was = dock.hidden;
  dock.hidden = !cart.length || !chatWantsCheckout();
  if (dock.hidden) return;
  // Just brought up (by them or the assistant): open, with a moment's highlight to draw the eye.
  if (was) {
    gaEvent("chat_checkout_shown", { value: gaValue(cart) });
    chatState.checkoutOpen = true;
    dock.classList.remove("is-new");
    void dock.offsetWidth;
    dock.classList.add("is-new");
  }
  const open = chatState.checkoutOpen !== false;
  dock.classList.toggle("is-open", open);
  $("[data-chat-checkout-toggle]").setAttribute("aria-expanded", String(open));
  $("[data-chat-checkout-body]").hidden = !open;
  $("[data-chat-cart-sum]").textContent = `${cartCount()} item${cartCount() === 1 ? "" : "s"} · ${money(cartSubtotal())}`;
  // Folded: a few pictures say what's in it.
  $("[data-chat-checkout-thumbs]").innerHTML = open ? "" : cart.slice(0, 3).map((l) => `<span class="chat-checkout-thumb">${cartArt(l)}</span>`).join("");
  $("[data-chat-checkout-lines]").innerHTML = cart
    .map(
      (l) => `<li class="chat-checkout-line">
        <span class="chat-checkout-thumb">${cartArt(l)}</span>
        <span class="chat-checkout-name"><span>${esc(lineName(l))}</span><small>${esc([lineMeta(l), lineGift(l) && `Gift for ${lineGift(l)}`, money(l.price * l.qty)].filter(Boolean).join(" · "))}</small></span>
        <span class="stepper" role="group" aria-label="Quantity of ${esc(lineName(l))}">
          <button type="button" data-qty="${esc(l.key)}" data-delta="-1" aria-label="Decrease">−</button>
          <span>${l.qty}</span>
          <button type="button" data-qty="${esc(l.key)}" data-delta="1" aria-label="Increase">+</button>
        </span>
      </li>`
    )
    .join("");
  $("[data-chat-free-ship]").innerHTML = freeShipMessage();
  $("[data-chat-cart-total]").textContent = money(cartSubtotal());
  if (chatExpress || document.body.dataset.page === "checkout" || (!window.ApplePaySession && !isAndroid)) return;
  chatExpress = (async () => {
    const percent = await api("/api/perk").then((r) => r.percent || 0).catch(() => 0);
    getShopConfig().then((c) => c.square && loadSquareSdk(c.square.sdkUrl).catch(() => {}));
    return mountExpress({
      box: $("[data-chat-express]"),
      apple: $("[data-chat-apple]"),
      google: $("#chat-google"),
      error: $("[data-chat-express-error]"),
      totals: (option) => {
        if (option === "courier") return null;
        const coffee = cart.filter((l) => l.kind === "coffee").reduce((n, l) => n + l.price * l.qty, 0);
        const goods = coffee + cart.filter((l) => l.kind === "accessory").reduce((n, l) => n + l.price * l.qty, 0);
        return { ship: option === "pickup" || goods >= SITE.freeShippingOver ? 0 : SITE.shippingFlat, off: Math.round(coffee * percent) / 100 };
      },
      done: (paid) => {
        try {
          sessionStorage.setItem("bp-paid", JSON.stringify({ number: paid.number, total: paid.total, amounts: paid.amounts || null, summary: paid.summary, account: paid.account || null }));
        } catch {
          /* the confirmation email still arrives */
        }
        location.href = "checkout";
      },
    });
  })();
}
document.addEventListener("cartchange", renderChatCheckout);

// Signed in: Messages has their account's conversations too (fetched once a page).
let chatMineFetched = false;
let chatSignedIn = false;
currentUser.then((u) => (chatSignedIn = Boolean(u))).catch(() => {});
// Messages: their conversations on this device (and, signed in, their account's), and a new one.
function chatListView(on: boolean) {
  const chat = $("#chat");
  const box = $("[data-chat-listview]");
  if (!chat || !box) return;
  chat.classList.toggle("is-list", on);
  box.hidden = !on;
  if (!on) return;
  // Signed in: their conversations from other devices join the list.
  if (!chatMineFetched) {
    chatMineFetched = true;
    currentUser
      .then((u) => u && fetch("/api/chat/mine").then((r) => r.json()))
      .then((d) => {
        if (!d?.chats?.length) return;
        const here = chatHistory();
        const mine = d.chats.map((x) => ({ ...(here.find((h) => h.id === x.id) || {}), ...x }));
        store.set(CHAT_HISTORY_KEY, [...mine, ...here.filter((h) => !mine.some((m) => m.id === h.id))].sort((a, b) => String(b.at).localeCompare(String(a.at))).slice(0, 30));
        if ($("#chat").classList.contains("is-list")) chatListView(true);
      })
      .catch(() => {});
  }
  const ago = (iso) => {
    const m = Math.max(1, Math.round((Date.now() - Date.parse(iso)) / 60000));
    return m < 60 ? `${m}m` : m < 1440 ? `${Math.round(m / 60)}h` : `${Math.round(m / 1440)}d`;
  };
  box.innerHTML = `<ol class="chat-list-items">${chatHistory()
    .map((x) => `<li><button type="button" class="chat-list-item${x.id === chatState.id ? " is-current" : ""}" data-chat-open-past="${esc(x.id)}">${x.by ? chatFace(x.by) : `<span class="chat-avatar" aria-hidden="true">${LOGO_MARK}</span>`}<span class="chat-list-text"><strong translate="no">${esc(x.preview || tr("Conversation"))}</strong><small>${esc(x.by?.name || SITE.name)}</small></span><small class="chat-list-when">${ago(x.at)}</small></button></li>`)
    .join("")}</ol>
    <button type="button" class="button chat-list-new" data-chat-new>${tr("Send us a message")}</button>`;
}
// Search in the conversation, and the conversation as a text file.
let chatQuery = "";
document.addEventListener("input", (e) => {
  if (!(e.target as any).matches?.("[data-chat-search-input]")) return;
  chatQuery = (e.target as any).value;
  renderChat();
});
function chatTranscript() {
  const when = (iso) => (iso ? new Date(iso).toLocaleString(LANG === "ko" ? "ko-KR" : LANG === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "");
  const lines = chatState.messages.map((m) => `${m.from === "customer" ? tr("You") : m.by?.name || SITE.name}${m.at ? ` (${when(m.at)})` : ""}:\n${m.text}`);
  const text = `${SITE.name}\n\n${lines.join("\n\n")}\n`;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
  a.download = `${SITE.name.toLowerCase()}-chat-${new Date().toISOString().slice(0, 10)}.txt`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

// Their rating from the card in the chat (a face, then what they'd like to add).
async function chatRate(body) {
  try {
    const res = await fetch(`/api/chat/${chatState.id}/rate`, { method: "POST", headers: { "X-Chat-Token": chatState.token, "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "Couldn't send that.");
    chatState.messages = data.messages.map(chatMsg);
    chatState.rating = data.rating || null;
    saveChat();
    renderChat();
    if (body.comment) toast(tr("Thanks."));
  } catch (err) {
    toast(esc(err.message));
  }
}
document.addEventListener("submit", (e) => {
  const form = (e.target as any).closest?.("[data-chat-rate-more]");
  if (!form) return;
  e.preventDefault();
  const comment = form.comment.value.trim();
  if (comment && chatState.rating) chatRate({ score: chatState.rating.score, comment });
});

function renderChat() {
  const thread = $("[data-chat-thread]");
  if (!thread) return;
  const live = chatLive();
  const assisted = chatAgent || (!live && chatAssistant() && !chatWantsPerson);
  const welcome = { from: "staff", welcome: true, text: assisted ? "Hi! I can help you find a coffee, track an order or anything else. The team is nearby too." : "Hi! How can we help?" };
  // (A conversation carried on from our emails starts with those, not a greeting.)
  // Searching: just the messages with the words in them.
  const q = chatQuery.trim().toLowerCase();
  const rows = q
    ? (() => {
        const hits = chatState.messages.filter((m) => String(m.text || "").toLowerCase().includes(q));
        return hits.length ? hits : [{ note: true, text: tr("No messages match.") }];
      })()
    : chatRows([...(chatState.fromEmail ? [] : [welcome]), ...chatState.messages.filter((m) => !isReaction(m))]);
  chatReacts = chatReactions(chatState.messages);
  // The assistant writing; or away, with their message waiting for a person: say we'll be back.
  if (q) {
    // (Just the matches while searching.)
  } else if (chatWriting) rows.push({ writing: true });
  else if (chatAway && !chatAgent && rows[rows.length - 1].from === "customer") rows.push({ note: true, text: "We're away. We'll reply here when we're back." });
  // Starters before anything's said; the latest answer's quick replies after it.
  const lastOurs = rows[rows.length - 1];
  const offered = !chatWriting && lastOurs.from !== "customer" ? (lastOurs.replies || []).filter((r) => !(assisted && isPersonAsk(r))) : [];
  const replies = q ? null : !chatState.messages.length && assisted ? CHAT_STARTERS : offered.length ? offered : null;
  const said = $("[data-chat-rate-more] input", thread)?.value || "";
  const typing = document.activeElement?.closest?.("[data-chat-rate-more]");
  thread.innerHTML = rows.map(chatBubble).join("") + (replies ? chatReplies(replies) : "");
  const more = $("[data-chat-rate-more] input", thread);
  if (more && said) more.value = said;
  if (more && typing) more.focus({ preventScroll: true });
  renderChatCheckout();
  // The assistant answers any time (and brings in the team); otherwise it's whether someone's in.
  const online = assisted || !chatAway;
  $("[data-chat-status]").textContent = assisted ? (live && chatAgent ? "Assistant" : "Assistant · Team nearby") : chatAway ? "Away, back soon" : "Online now";
  $("[data-chat-status]").classList.toggle("is-online", online);
  $("[data-chat-new]").hidden = !live;
  $("[data-chat-more]").hidden = !live || !chatState.messages.length;
  $("[data-chat-list]").hidden = !chatSignedIn && !chatHistory().some((x) => x.id !== chatState.id) && !(live && chatHistory().length);
  // A person, any time: only while the assistant is the one answering (or would answer).
  $("[data-chat-person]").hidden = !assisted;
  // (Text boxes aren't translated on screen, so the hint is translated here.)
  $("#chat-input").placeholder = window.i18n?.t("Write a message…") ?? "Write a message…";
  $("[data-chat-search-input]").placeholder = tr("Search conversation");
  thread.scrollTop = thread.scrollHeight;
  // Seen everything the roastery wrote.
  if ($("#chat").classList.contains("is-open") && live) {
    chatState.seen = chatStaffCount();
    saveChat();
    chatDot(false);
  }
}

// A dot on "Menu" and on "Chat Us" in it when the roastery has replied and the chat is closed.
function chatDot(on) {
  $$("[data-chat-dot]").forEach((b) => b.classList.toggle("has-new", on));
}

// While they browse, a conversation that's going checks now and then for a reply.
let chatQuiet;
function listenForReplies() {
  clearInterval(chatQuiet);
  if (!chatLive()) return;
  const check = () => {
    if (!chatLive()) return clearInterval(chatQuiet);
    if (document.hidden || $("#chat")?.classList.contains("is-open")) return;
    chatFetch()
      .then(() => chatDot(chatStaffCount() > (chatState.seen || 0)))
      .catch(() => {});
  };
  check();
  chatQuiet = setInterval(check, 20000);
}

async function chatFetch(method = "GET", body?) {
  const res = await fetch(`/api/chat/${chatState.id}`, {
    method,
    headers: { "X-Chat-Token": chatState.token, ...(body && { "Content-Type": "application/json" }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 404) {
    // The conversation is gone (deleted in the back office): start afresh.
    forgetChat(chatState.id);
    chatState = { messages: [] };
    saveChat();
    renderChat();
    throw new Error(data.error || "This chat has ended.");
  }
  if (!res.ok) throw new Error(data.error || "Couldn't send that.");
  chatState.messages = data.messages.map(chatMsg);
  chatState.rating = data.rating || null;
  if (typeof data.away === "boolean") chatAway = data.away;
  chatWriting = Boolean(data.typing);
  chatAgent = Boolean(data.agent);
  applyChatCarts();
  saveChat();
  return data;
}

// While the window is open, look for replies every few seconds.
function watchChat() {
  clearInterval(chatPoll);
  if (!chatLive()) return;
  const tick = () => {
    if (!$("#chat").classList.contains("is-open") || !chatLive()) return clearInterval(chatPoll);
    if (document.hidden || chatBusy) return;
    const before = JSON.stringify(chatState.messages) + chatAway + chatWriting;
    chatFetch()
      .then(() => {
        if (JSON.stringify(chatState.messages) + chatAway + chatWriting !== before) renderChat();
        // While the assistant writes, look sooner.
        clearInterval(chatPoll);
        chatPoll = setInterval(tick, chatWriting ? 1000 : 4000);
      })
      .catch(() => {});
  };
  tick();
  chatPoll = setInterval(tick, 4000);
}

// person: straight to the team (the FAQ's Talk to a Person), with what was asked there.
function openChat({ transcript, person = false }: any = {}) {
  if (transcript?.length) chatAsked = transcript;
  if (person) askForPerson();
  openOverlay("chat");
  chatPageY = scrollY;
  renderChat();
  // Whether someone's in (a conversation already going learns it as it checks for replies).
  if (!chatLive()) fetch("/api/chat/status").then((r) => r.json()).then((d) => ((chatAway = Boolean(d.away)), renderChat())).catch(() => {});
  // With a mouse and keyboard, the box to write in takes focus (after the sheet does, in
  // openOverlay). On phones it waits for a tap: the keyboard rising while the chat slid in shook it.
  if (matchMedia("(hover: hover) and (pointer: fine)").matches) setTimeout(() => $("#chat-input").focus({ preventScroll: true }), 60);
  watchChat();
}

// Talk to a Person: a conversation the assistant is answering is handed to the team (it steps
// out and they're told); before anything's written, the first message goes straight to them.
async function askForPerson() {
  if (chatLive()) {
    if (!chatAgent) return;
    if (chatBusy) return;
    chatBusy = true;
    try {
      await chatFetch("POST", { person: true, text: "I'd like to talk to a person, please." });
      chatAgent = false;
      saveChat();
    } catch (err) {
      $("[data-chat-error]").textContent = err.message; // the button stays: they can ask again
    } finally {
      chatBusy = false;
    }
  } else chatWantsPerson = true;
  renderChat();
  $("#chat-input")?.focus({ preventScroll: true });
}

// The first message starts the conversation.
async function startChat(text, files = []) {
  gaEvent("chat_start", { assistant: chatAssistant() });
  const data = await api("/api/chat", { method: "POST", body: { message: text, messages: chatAsked.slice(-12), ...(files.length && { files }), ...(chatWantsPerson && { person: true }) } });
  if (!data.chat) throw new Error("Couldn't reach the roastery.");
  chatState = { id: data.chat.id, token: data.chat.token, messages: data.chat.messages.map(chatMsg), seen: 0 };
  chatAway = Boolean(data.chat.away);
  chatWriting = Boolean(data.chat.typing);
  chatAgent = Boolean(data.chat.agent);
  chatWantsPerson = false;
  chatAsked = [];
  saveChat();
  renderChat();
  listenForReplies();
  watchChat();
}

function wireChat() {
  renderChatShell();
  const form = $("[data-chat-form]");
  const input = form.text;
  const error = $("[data-chat-error]");
  input.addEventListener("focus", liftForKeyboard);
  input.addEventListener("blur", dropForKeyboard);
  // Send keeps the box in focus, so the keyboard stays up between messages.
  form.querySelector("button[type=submit]").addEventListener("pointerdown", (e) => e.preventDefault());
  const grow = () => {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 140)}px`;
  };
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      form.requestSubmit();
    }
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if ((!text && !chatFiles.length) || chatBusy) return;
    const files = chatFiles;
    const sent = files.map(({ name, type, data }) => ({ name, type, data }));
    chatFiles = [];
    drawChatFiles();
    error.textContent = "";
    input.value = "";
    grow();
    chatBusy = true;
    try {
      chatState.messages.push({ from: "customer", text, ...(files.length && { files: files.map(({ name, kind, url }) => ({ name, kind, url })) }) });
      renderChat();
      if (chatLive()) await chatFetch("POST", { text, files: sent });
      else await startChat(text, sent);
      renderChat();
      watchChat(); // look again soon: the assistant answers in a moment
    } catch (err) {
      chatState.messages.pop();
      input.value = text;
      chatFiles = files;
      drawChatFiles();
      renderChat();
      error.textContent = err.message;
    } finally {
      chatBusy = false;
      input.focus({ preventScroll: true });
    }
  });

  // Sends a message as if typed (quick replies, starters, a card's Skip or Pause).
  const say = (text) => {
    if (chatBusy) return;
    input.value = text;
    form.requestSubmit();
  };

  // + adds photos or a PDF (from the button, a paste or a drop); the mic dictates where the browser can.
  const picker = $("[data-chat-file]", form);
  $("[data-chat-plus]", form).addEventListener("click", () => picker.click());
  picker.addEventListener("change", () => (addChatFiles(picker.files), (picker.value = "")));
  input.addEventListener("paste", (e) => e.clipboardData?.files?.length && (e.preventDefault(), addChatFiles(e.clipboardData.files)));
  const panel = form.closest(".chat-panel") || form;
  panel.addEventListener("dragover", (e) => e.dataTransfer?.types?.includes("Files") && e.preventDefault());
  panel.addEventListener("drop", (e) => e.dataTransfer?.files?.length && (e.preventDefault(), addChatFiles(e.dataTransfer.files)));
  $("[data-chat-files]", form).addEventListener("click", (e) => {
    const x = (e.target as any).closest("[data-chat-unfile]");
    if (!x) return;
    chatFiles.splice(Number(x.dataset.chatUnfile), 1);
    drawChatFiles();
    input.focus({ preventScroll: true });
  });
  const Speech = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const mic = $("[data-chat-mic]", form);
  let dictation = null;
  mic.hidden = !Speech;
  mic.addEventListener("click", () => {
    if (dictation) return dictation.stop();
    const r = new Speech();
    r.lang = document.documentElement.lang || "en-US";
    r.interimResults = true;
    r.continuous = true;
    const before = input.value.trim() ? `${input.value.trim()} ` : "";
    r.onresult = (e) => {
      input.value = before + [...e.results].map((x) => x[0].transcript).join("");
      grow();
    };
    r.onend = () => {
      dictation = null;
      mic.classList.remove("is-on");
      mic.setAttribute("aria-pressed", "false");
    };
    dictation = r;
    mic.classList.add("is-on");
    mic.setAttribute("aria-pressed", "true");
    r.start();
  });
  document.addEventListener("click", (e) => {
    const t: any = e.target;
    if (t.closest("[data-chat-open]")) return openChat();
    const quick = t.closest("[data-chat-say]");
    if (quick) return say(quick.dataset.chatSay);
    if (t.closest("[data-chat-person]")) return askForPerson();
    if (t.closest("[data-chat-cart]")) return openOverlay("cart");
    if (t.closest("[data-chat-checkout-toggle]")) {
      chatState.checkoutOpen = chatState.checkoutOpen === false;
      saveChat();
      return renderChatCheckout();
    }
    // A product card: choose its size (the price follows), then Add.
    const size = t.closest("[data-chat-size]");
    if (size) {
      const card = size.closest("[data-chat-product]");
      $$("[data-chat-size]", card).forEach((b) => {
        b.classList.toggle("is-on", b === size);
        b.setAttribute("aria-checked", String(b === size));
      });
      const p = PRODUCTS.find((x) => x.id === card.dataset.chatProduct);
      if (p) $("[data-chat-price]", card).innerHTML = priceHtml(p, size.dataset.chatSize);
      // A color: the picture shows that color.
      const a = !p && ACCESSORIES.find((x) => x.id === card.dataset.chatProduct);
      if (a?.colors?.length) $(".chat-card-thumb", card).innerHTML = searchThumb(accessoryArt(a, size.dataset.chatSize));
      return;
    }
    if (t.closest("[data-chat-cart-bar]")) {
      chatState.checkout = true;
      chatState.checkoutOpen = true;
      saveChat();
      renderChatCheckout();
      $("[data-chat-checkout]")?.scrollIntoView({ block: "nearest", behavior: "smooth" });
      return;
    }
    if (t.closest("[data-chat-pay-open]")) {
      e.preventDefault();
      openChatPay();
      return;
    }
    if (t.closest("[data-chat-pay-back]")) {
      closeChatPay();
      return;
    }
    const add = t.closest("[data-chat-add]");
    if (add) {
      const card = add.closest("[data-chat-product]");
      const id = card.dataset.chatProduct;
      const z = $("[data-chat-size].is-on", card)?.dataset.chatSize || "";
      const p = PRODUCTS.find((x) => x.id === id);
      const a = !p && ACCESSORIES.find((x) => x.id === id);
      chatState.checkout = true; // added from the chat: checkout is right here now
      saveChat();
      if (p) addLine(coffeeLine(p, z || "250g", "Whole Bean"), { open: false });
      else if (a) addLine(accessoryLine(a, a.sizes?.length ? { size: z } : { color: z }), { open: false });
      renderChatCheckout();
      return;
    }
    // A new conversation; the one before stays in Messages.
    if (t.closest("[data-chat-new]")) {
      clearInterval(chatPoll);
      rememberChat();
      chatState = { messages: [] };
      saveChat();
      chatListView(false);
      renderChat();
      input.focus({ preventScroll: true });
      return;
    }
    if (t.closest("[data-chat-list]")) return chatListView(!$("#chat").classList.contains("is-list"));
    // ⋯: search the conversation, or save it as a text file.
    const menu = $("[data-chat-menu]");
    if (t.closest("[data-chat-more]")) {
      menu.hidden = !menu.hidden;
      t.closest("[data-chat-more]").setAttribute("aria-expanded", String(!menu.hidden));
      return;
    }
    if (!t.closest("[data-chat-menu]")) menu.hidden = true;
    if (t.closest("[data-chat-search-open]")) {
      menu.hidden = true;
      $("[data-chat-search]").hidden = false;
      $("[data-chat-search-input]").focus();
      return;
    }
    if (t.closest("[data-chat-search-close]")) {
      chatQuery = "";
      $("[data-chat-search-input]").value = "";
      $("[data-chat-search]").hidden = true;
      return renderChat();
    }
    if (t.closest("[data-chat-transcript]")) {
      menu.hidden = true;
      return chatTranscript();
    }
    const past = t.closest("[data-chat-open-past]");
    if (past) {
      const entry = chatHistory().find((x) => x.id === past.dataset.chatOpenPast);
      if (!entry) return;
      clearInterval(chatPoll);
      rememberChat();
      chatListView(false);
      // From their account on another device: signed in, this browser gets its own key to it.
      const key = entry.token
        ? Promise.resolve(entry.token)
        : api(`/api/chat/${entry.id}/join`, { method: "POST", body: {} }).then((d) => d.chat.token);
      key
        .then((token) => {
          chatState = { id: entry.id, token, fromEmail: entry.fromEmail, messages: [], seen: 0 };
          renderChat();
          return chatFetch();
        })
        .then(() => (renderChat(), watchChat()))
        .catch((err) => {
          chatListView(chatHistory().length > 0);
          toast(esc(err.message));
        });
      return;
    }
    const face = t.closest("[data-chat-rate]");
    if (face) return chatRate({ score: Number(face.dataset.chatRate) });
    // A reaction on one of our messages: tap the message, then one of the six. (Only in this
    // window: the portal's chat has its own.)
    if (!t.closest("#chat")) return;
    const open = t.closest("[data-react-open]");
    if (open && !t.closest("a, button")) {
      chatReactOpen = chatReactOpen === open.dataset.reactOpen ? "" : open.dataset.reactOpen;
      return renderChat();
    }
    const react = t.closest("[data-react]");
    if (react) {
      chatReactOpen = "";
      return chatFetch("POST", { react: { message: react.dataset.reactTo, emoji: react.dataset.react } })
        .then(renderChat)
        .catch((err) => toast(esc(err.message)));
    }
    // A choice on a poll from the team: marked, and sent as their answer.
    const choice = t.closest("[data-poll-choice]");
    if (choice) {
      const poll = choice.closest("[data-chat-poll]");
      return chatFetch("POST", { pollAnswer: { message: poll.dataset.chatPoll, choice: choice.dataset.pollChoice } })
        .then(renderChat)
        .catch((err) => toast(esc(err.message)));
    }
  });

  // Back on the site with a conversation going: listen for the roastery's reply.
  listenForReplies();
  document.addEventListener("visibilitychange", () => !document.hidden && chatLive() && listenForReplies());
}

/* ── Search (in the menu) ─────────────────────────────────── */
// Tapping the field shows a few quick picks in place of the menu; typing finds coffees (by name,
// origin, tasting notes, process, variety), accessories, pages and FAQ answers, all from what the
// page already has. Enter (or →) opens the first result.

const SEARCH_PICKS = () => [
  ["Espresso", "espresso"],
  ["Filter", "filter"],
  ["Decaf", "decaf"],
  ...(ACCESSORIES.some((a) => !isTea(a)) ? [["Accessories", "accessories"]] : []),
  ...(ACCESSORIES.some(isTea) ? [["Tea", "tea"]] : []),
  ["Subscriptions", "subscriptions/build"],
  ["Gift A Subscription", "subscriptions/gift"],
  ...(SITE.cafesLive ? [["Locations", "locations"]] : []),
];
const SEARCH_PAGES = () => [
  ["Subscriptions", "subscriptions/build", "subscribe save delivery monthly weekly plan"],
  ["Gift A Subscription", "subscriptions/gift", "gift present give"],
  ["Gift Cards", "gift-cards", "gift card voucher present give balance egift"],
  ["Find Your Coffee", "find-your-coffee", "finder quiz recommend help choose"],
  ["Find Your Coffee or Tea", "find", "finder quiz recommend help choose not sure coffee tea"],
  ["Find Your Tea", "find-your-tea", "tea finder quiz recommend help choose caffeine free herbal black green"],
  ["What Is a Tea Cultivar?", "numeral/what-is-a-tea-cultivar", "tea cultivar variety glossary guide green matcha oolong black puerh white herbal"],
  ["True Specialty", "true-specialty", "about story sourcing roasting quality"],
  ["Wholesale", "wholesale", "cafe business office trade bulk"],
  ["FAQ", "faq", "questions help shipping"],
  ["Contact", "contact", "email help support"],
  ...(SITE.notes ? [["Numeral", "numeral/", "blog journal guides brewing news"]] : []),
  ...(SITE.calendar?.classes ? [["Classes", "classes", "class course workshop learn barista espresso brewing lesson"]] : []),
  ...(SITE.calendar?.events ? [["Calendar", "calendar", "events cupping pop-up popup festival meet calendar"]] : []),
  ["My Account", "account", "login log in subscription manage orders"],
  ...(SITE.cafesLive ? [["Locations", "locations", "cafe bar shop visit address hours"], ["Order Ahead", "order-ahead", "pickup menu drinks food"]] : []),
];

const fold = (t) => String(t || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
// Every word typed has to start a word in the text (or be a near miss of one, a letter or two
// out: "dripr" finds the dripper); the name counts more than the rest.
function editDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (Math.min(...cur) > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}
const nearMiss = (w, text) => {
  if (w.length < 4) return false;
  const max = w.length >= 6 ? 2 : 1;
  // Against each word, and its start (so a misspelled start of a long word still counts).
  return text.split(/[^a-z0-9]+/).some((t) => t.length >= 3 && (editDistance(w, t, max) <= max || (t.length > w.length && editDistance(w, t.slice(0, w.length), 1) <= 1)));
};
function searchScore(query, title, rest) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return 0;
  const name = fold(title);
  const all = `${name} ${fold(rest)}`;
  let score = 0;
  for (const w of words) {
    const re = new RegExp(`(^|[^a-z0-9])${w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    if (re.test(name)) score += 3;
    else if (re.test(all)) score += 1;
    else if (nearMiss(w, name)) score += 2;
    else if (nearMiss(w, all)) score += 0.5;
    else return 0;
  }
  return score + (name.startsWith(fold(query)) ? 2 : 0);
}

// A small picture for a product result: its bag, cup or photo, as in the cart.
const searchThumb = (art) => `<span class="search-thumb" aria-hidden="true">${art}</span>`;

function searchResults(query) {
  const rank = (items) => items.filter((x) => x.score > 0).sort((a, b) => b.score - a.score);
  // The kind of product (coffee, tea, an accessory's category) counts as part of its name, so
  // "tea" puts the teas first.
  const coffees = rank(
    PRODUCTS.map((p) => ({
      title: p.short || p.name,
      meta: `${p.type} roast · ${p.soldOut ? "Sold out" : money(p.price)}`,
      href: `products/${encodeURIComponent(p.id)}`,
      thumb: () => searchThumb(productArt(p)),
      score: searchScore(query, `${p.name} ${p.short || ""} coffee`, [p.type, "roast beans", p.tag, p.notes, p.region, p.process, p.variety, p.altitude, p.about, ...(p.labels || []).map((l) => l.name || l)].join(" ")),
    }))
  );
  const extras = rank(
    ACCESSORIES.map((a) => ({
      title: a.name,
      meta: `${a.category || "Accessories"} · ${a.soldOut ? "Sold out" : comingSoon(a) ? "Coming soon" : money(a.price)}`,
      href: `products/${encodeURIComponent(a.id)}`,
      thumb: () => searchThumb(accessoryArt(a)),
      score: searchScore(query, `${a.name} ${a.category || ""}`, [isTea(a) ? "tisane" : "accessories", a.type, a.blend, a.notes, a.short, a.about, ...(a.ingredients || []).flat(), ...(a.colors || []).map((c) => c.name)].join(" ")),
    }))
  );
  const pages = rank(SEARCH_PAGES().map(([title, href, words]) => ({ title, href, score: searchScore(query, title, words) })));
  const faqs = rank(
    (typeof FAQ !== "undefined" ? FAQ : [])
      .filter((f) => (f[2] !== "cafes" || SITE.cafesLive) && (f[2] !== "calendar" || SITE.calendar?.classes || SITE.calendar?.events))
      .map(([q, a]) => ({ title: q, href: "faq", score: searchScore(query, q, a) }))
  );
  // Products first, the better-matched kind on top; then pages and questions.
  const products = [
    [ACCESSORIES.every(isTea) ? "Tea" : "Tea & Accessories", extras.slice(0, 4)],
    ["Coffee", coffees.slice(0, 6)],
  ]
    .filter(([, list]) => list.length)
    .sort((a, b) => b[1][0].score - a[1][0].score);
  return [...products, ["Pages", pages.slice(0, 4)], ["Questions", faqs.slice(0, 3)]].filter(([, list]) => list.length);
}

function wireSearch() {
  const form = $("[data-search]");
  if (!form) return;
  const opener = $("[data-search-open]");
  const input = $("[data-search-input]");
  const out = $("[data-search-results]");
  const nav = $("[data-menu-nav]");
  let first = null;
  const show = () => {
    const q = input.value.trim();
    if (!q) {
      first = null;
      out.innerHTML = `<ul class="search-picks">${SEARCH_PICKS().map(([t, href]) => `<li><a href="${href}">${esc(t)}</a></li>`).join("")}</ul>`;
      return;
    }
    const groups = searchResults(q);
    first = groups[0]?.[1][0]?.href || null;
    out.innerHTML = groups.length
      ? groups
          .map(
            ([label, list]) => `<section class="search-group"><h3>${esc(label)}</h3><ul>${list
              .map((r) => `<li><a href="${r.href}"${r.thumb ? ` class="has-thumb"` : ""}>${r.thumb ? r.thumb() : ""}<span class="search-text"><span translate="no">${esc(r.title)}</span>${r.meta ? `<small>${esc(r.meta)}</small>` : ""}</span></a></li>`)
              .join("")}</ul></section>`
          )
          .join("")
      : // Nothing found: where to go instead.
        `<p class="search-none">No results for “${esc(q)}”.</p>
         <ul class="search-picks search-picks-sm">
           <li><a href="find">Find Your Coffee or Tea</a></li>
           <li><a href="shop">Shop All</a></li>
           <li><button type="button" data-chat-open>Chat Us</button></li>
         </ul>`;
  };
  // Tapping Search opens the field in place of the menu; Cancel (or closing the menu) puts it back.
  const open = (on) => {
    opener.setAttribute("aria-expanded", String(on));
    form.hidden = !on;
    out.hidden = !on;
    nav.hidden = on;
    if (on) {
      show();
      input.focus();
    } else input.value = "";
  };
  opener.addEventListener("click", () => open(true));
  // Straight to search: "/" on a keyboard (not while typing), or Search in the desktop header.
  const openFromAnywhere = () => {
    openOverlay("menu");
    open(true);
    setTimeout(() => input.focus(), 80); // after the sheet takes focus
  };
  document.addEventListener("keydown", (e) => {
    if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey || (e.target as any).closest?.("input, textarea, select, [contenteditable]") || $(".overlay.is-open")) return;
    e.preventDefault();
    openFromAnywhere();
  });
  $("[data-search-cancel]").addEventListener("click", () => open(false));
  input.addEventListener("input", show);
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (first) location.href = first;
  });
  new MutationObserver(() => !$("#menu").classList.contains("is-open") && open(false)).observe($("#menu"), { attributes: true, attributeFilter: ["class"] });
}

// Shop cards: a size chosen on the card adds that size, and the picker resets for another.
document.addEventListener("change", (e) => {
  const pick = (e.target as any).closest?.("[data-quick-size]");
  if (!pick?.value) return;
  const item = ACCESSORIES.find((a) => a.id === pick.dataset.quickSize);
  if (item) addLine(accessoryLine(item, { size: pick.value, color: item.colors?.[0]?.name || "" }));
  pick.value = "";
});

// Cart suggestions: a size chosen from the picker adds that size.
document.addEventListener("change", (e) => {
  const pick = (e.target as any).closest?.("[data-suggest-size]");
  if (!pick?.value) return;
  const item = ACCESSORIES.find((a) => a.id === pick.dataset.suggestSize);
  if (item) addLine(accessoryLine(item, { size: pick.value, color: item.colors?.[0]?.name || "" }), { open: false });
});

/* ── Footer email signup ──────────────────────────────────── */

// { ok, status, message, code, percent }. With email set up the signup is confirmed by a link
// first (the welcome code comes after); without, the code comes straight back.
async function postSignup(email, website = "") {
  const res = await guardedFetch("/api/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, website, lang: LANG }),
  });
  if (res.status === 404 || res.status === 405) throw new Error("unavailable");
  const data = res.headers.get("content-type")?.includes("json") ? await res.json() : { message: await res.text() };
  if (res.ok) {
    store.set("bp-welcome", "joined");
    gaEvent("generate_lead", { lead_source: "newsletter" });
  }
  return { ok: res.ok, status: res.status, message: data.message || data.error || "", code: data.code || null, percent: data.percent || 0 };
}

/* ── Welcome offer: a quiet card, once, for the newsletter code ── */

// Shown once a visit, on a browsing page after half a page of scrolling or 25 seconds, never
// while the cookie card, an overlay or the home intro is up. The X puts it away for 30 days
// (for good once signed up).
// A bar pinned to the bottom of the screen with a buy action in it (Add to Cart on a phone,
// the subscription bar, an order bar): nothing should cover it.
const stickyBarUp = () =>
  $$(".buy-row, .sub-bar.is-shown, .order-bar").some((el) => {
    if (el.hidden || !el.offsetParent) return false;
    const pos = getComputedStyle(el).position;
    return (pos === "fixed" || pos === "sticky") && el.getBoundingClientRect().bottom > innerHeight - 4;
  });

function wireWelcome() {
  const percent = SITE.welcomeDiscount;
  const landing = new URLSearchParams(location.search).get("welcome");
  if (landing) return welcomeCard({ code: landing, percent });
  // Not where people are choosing what to buy (product, subscriptions, the finders): it would
  // sit over the buy buttons.
  if (!(percent > 0) || !["home", "true-specialty", "locations", "faq", "contact", "notfound"].includes(page)) return;
  const seen = store.get("bp-welcome", null);
  if (seen === "joined" || (seen && Date.now() - seen < 30 * 864e5)) return;
  const visit = (set = false) => {
    try {
      return set ? sessionStorage.setItem("bp-welcome-visit", "1") : sessionStorage.getItem("bp-welcome-visit");
    } catch {
      return null;
    }
  };
  if (visit()) return;
  let shown = false;
  const show = async () => {
    if (shown) return;
    if ($(".cookie-banner") || $(".overlay.is-open") || document.documentElement.classList.contains("home-intro") || stickyBarUp()) return setTimeout(show, 3000); // wait for them
    shown = true;
    removeEventListener("scroll", onScroll);
    if (await currentUser) return; // signed-in customers know us already
    visit(true);
    welcomeCard({ percent });
  };
  const onScroll = () => scrollY > (document.documentElement.scrollHeight - innerHeight) / 2 && show();
  addEventListener("scroll", onScroll, { passive: true });
  setTimeout(show, 25000);
}

function welcomeCard({ percent, code = null }) {
  document.body.insertAdjacentHTML(
    "beforeend",
    `<section class="cookie-banner welcome-card" role="dialog" aria-labelledby="welcome-title">
      <button type="button" class="close welcome-close" data-welcome-close aria-label="Close">${CLOSE_ICON}</button>
      <div data-welcome-body>
        <h2 id="welcome-title">${percent}% Off Your Next Order</h2>
        <form class="welcome-form" data-welcome-form novalidate>
          <label class="sr-only" for="welcome-email">Email address</label>
          <input id="welcome-email" name="email" type="email" autocomplete="email" placeholder="Email address" required>
          <input class="visually-hidden" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
          <button type="submit" class="cookie-btn is-primary">Sign Up</button>
        </form>
        <p class="welcome-status" data-welcome-status role="status"></p>
      </div>
    </section>`
  );
  const card = $(".welcome-card");
  const body = $("[data-welcome-body]", card);
  const close = () => {
    if (store.get("bp-welcome", null) !== "joined") store.set("bp-welcome", Date.now());
    card.classList.remove("is-in");
    setTimeout(() => card.remove(), reduceMotion ? 0 : 700);
  };
  // The code itself: big, with a copy button.
  const showCode = (c) => {
    body.innerHTML = `
      <h2 id="welcome-title">Here's Your ${percent}% Off</h2>
      <div class="welcome-code"><strong>${esc(c)}</strong><button type="button" class="cookie-btn" data-welcome-copy>Copy</button></div>`;
    $("[data-welcome-copy]", body).addEventListener("click", async (e) => {
      try {
        await navigator.clipboard.writeText(c);
        e.target.textContent = "Copied";
      } catch {
        getSelection().selectAllChildren($(".welcome-code strong", body));
      }
    });
  };
  if (code) {
    store.set("bp-welcome", "joined");
    history.replaceState(null, "", location.pathname + location.hash);
    showCode(code);
  }
  requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add("is-in")));
  card.addEventListener("click", (e) => e.target.closest("[data-welcome-close]") && close());
  card.addEventListener("keydown", (e) => e.key === "Escape" && close());

  const form = $("[data-welcome-form]", card);
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const status = $("[data-welcome-status]", card);
    const email = form.email.value.trim();
    status.classList.remove("is-error");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      flagFields(form, "", ["email"]);
      status.classList.add("is-error");
      return (status.textContent = "Enter a valid email.");
    }
    const button = $("button[type=submit]", form);
    button.disabled = true;
    try {
      const r = await postSignup(email, form.website.value);
      if (!r.ok) {
        status.classList.add("is-error");
        status.textContent = r.message || "That didn't work. Try again.";
        return;
      }
      if (r.code) return showCode(r.code);
      // Confirm by email first; the code comes with the confirmation.
      body.innerHTML = `<h2 id="welcome-title">Check Your Inbox</h2><p>${esc(r.message)} Your code arrives once you've confirmed.</p>`;
    } catch {
      status.classList.add("is-error");
      status.textContent = `Sign-up isn't available right now. Email ${SITE.email} to join.`;
    } finally {
      button.disabled = false;
    }
  });
}

function wireSubscribe() {
  const form = $("[data-subscribe]");
  if (!form) return;
  const status = $("[data-subscribe-status]", form);
  const button = $("button", form);
  const say = (text, error = false) => {
    status.textContent = text;
    status.classList.toggle("is-error", error);
  };

  // Typing again clears the error.
  form.email.addEventListener("input", () => status.classList.contains("is-error") && say(""));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = form.email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      flagFields(form, "", ["email"]);
      return say("Enter a valid email.", true);
    }
    button.disabled = true;
    say("");
    try {
      const r = await postSignup(email, form.website.value);
      if (!r.ok) {
        if (r.status === 400) flagFields(form, "", ["email"]);
        return say(r.message || "That didn't work. Try again.", true);
      }
      form.email.value = "";
      say(`${r.message || "Thanks, you're subscribed."}${r.code ? ` Your ${r.percent}% code: ${r.code}` : ""}`);
    } catch {
      say(`Sign-up isn't available right now. Email ${SITE.email} to join the list.`, true);
    } finally {
      button.disabled = false;
    }
  });
}

/* ── Events ───────────────────────────────────────────────── */

function wireEvents() {
  document.addEventListener("click", (e) => {
    const t: any = e.target;
    const open = t.closest("[data-open]");
    if (open) return openOverlay(open.dataset.open);

    if (t.closest("[data-close]")) return closeOverlays();

    // Menu: Shop and Subscriptions open their links underneath.
    const toggle = t.closest("[data-menu-toggle]");
    if (toggle) {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      // One group open at a time.
      $$("[data-menu-toggle]").forEach((b) => {
        const on = b === toggle && open;
        b.setAttribute("aria-expanded", String(on));
        $(`#${b.getAttribute("aria-controls")}`).inert = !on;
      });
      return;
    }

    const qty = t.closest("[data-qty]");
    if (qty) {
      const line = cart.find((l) => l.key === qty.dataset.qty);
      if (line) setQty(line.key, line.qty + Number(qty.dataset.delta));
      return;
    }

    // "You might like", in the cart: a 250g bag of whole beans, or the accessory, added in place.
    const suggested = t.closest("[data-suggest-add]");
    if (suggested) {
      const [kind, id] = suggested.dataset.suggestAdd.split(":");
      const item = (kind === "accessory" ? ACCESSORIES : PRODUCTS).find((x) => x.id === id);
      if (item) addLine(kind === "accessory" ? accessoryLine(item, { color: item.colors?.[0]?.name || "" }) : coffeeLine(item, "250g", "Whole Bean"), { open: false });
      return;
    }

    // Which product they open from a list (the shop, suggestions, search, the chat).
    const opened = t.closest('a[href^="products/"]');
    if (opened) {
      const id = decodeURIComponent(opened.getAttribute("href").split("/")[1] || "");
      const x = PRODUCTS.find((p) => p.id === id) || ACCESSORIES.find((a) => a.id === id);
      if (x) gaEvent("select_item", { item_list_name: document.body.dataset.page || "", items: [{ item_id: x.id, item_name: x.name, price: x.price }] });
    }
    const quick = t.closest("[data-quick-add]");
    if (quick) {
      const p = PRODUCTS.find((x) => x.id === quick.dataset.quickAdd);
      if (p) return addLine(coffeeLine(p, "250g", "Whole Bean"));
      const a = ACCESSORIES.find((x) => x.id === quick.dataset.quickAdd);
      // The first color still in stock.
      const color = (a?.colors || []).find((c) => unitsLeft(a, c.name) > 0) || a?.colors?.[0];
      return a && addLine(accessoryLine(a, { color: color?.name || "" }));
    }

    if (t.closest(".is-disabled")) return e.preventDefault();

    // Links inside an overlay close it (handles same-page anchors like #shop).
    if (t.closest(".overlay a")) closeOverlays(false);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeOverlays();
  });

  // Keep the cart in sync across tabs.
  addEventListener("storage", (e) => {
    if (e.key === "bp-cart") {
      cart = store.get("bp-cart", []);
      renderCart();
      renderChatCheckout();
    }
  });
  // A product photo that doesn't load: no broken-image icon, just the tile (and no stray shadow).
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (!(img instanceof HTMLImageElement) || !img.matches(".product-photo, .layer-shadow")) return;
      (img.closest(".photo-art") || img).querySelectorAll?.("img").forEach((x) => (x.style.visibility = "hidden"));
      img.style.visibility = "hidden";
    },
    true
  );
  // A page brought back by the Back button (kept in memory) still has the cart it had then: after
  // paying, that's the bought items. Read it again.
  addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    cart = store.get("bp-cart", []).filter((l) => l && l.key && l.qty > 0);
    renderCart();
    document.dispatchEvent(new Event("cartchange"));
  });
}

/* ── Cookie consent ───────────────────────────────────────── */

// Essential storage (login, cart, Order Ahead choices) is always on. Analytics and marketing stay
// off until accepted. Scripts that need consent check window.cookieConsent and listen for the
// "cookieconsent" event, e.g.
//   const load = () => cookieConsent.analytics && loadAnalytics();
//   load(); addEventListener("cookieconsent", load);
const CONSENT_KEY = "bp-consent";
const CONSENT_VERSION = 1;
const CONSENT_MONTHS = 12;

function readConsent() {
  const c = store.get(CONSENT_KEY, null);
  const fresh = c && c.v === CONSENT_VERSION && Date.now() - Date.parse(c.at) < CONSENT_MONTHS * 30 * 864e5;
  return fresh ? c : null;
}
window.cookieConsent = { analytics: false, marketing: false, ...readConsent() };

function saveConsent(choice) {
  const c = { v: CONSENT_VERSION, at: new Date().toISOString(), analytics: Boolean(choice.analytics), marketing: Boolean(choice.marketing) };
  store.set(CONSENT_KEY, c);
  window.cookieConsent = c;
  dispatchEvent(new CustomEvent("cookieconsent", { detail: c }));
}

function cookieBanner({ open = false } = {}) {
  $(".cookie-banner")?.remove();
  const c = window.cookieConsent;
  document.body.insertAdjacentHTML(
    "beforeend",
    `<section class="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-text">
      <h2 id="cookie-title">Cookies</h2>
      <p id="cookie-text">Essential cookies keep you logged in and remember your cart. Analytics only with your OK. <a href="privacy#cookies">Details</a></p>
      <form class="cookie-choices" data-cookie-form ${open ? "" : "hidden"}>
        <label class="cookie-option"><span><strong>Essential</strong><small>Login, cart and checkout. Always on.</small></span><input type="checkbox" checked disabled><i aria-hidden="true"></i></label>
        <label class="cookie-option"><span><strong>Analytics</strong><small>Which pages people use, so we can improve them.</small></span><input type="checkbox" name="analytics" ${c.analytics ? "checked" : ""}><i aria-hidden="true"></i></label>
        <label class="cookie-option"><span><strong>Marketing</strong><small>Measuring ads and showing relevant offers.</small></span><input type="checkbox" name="marketing" ${c.marketing ? "checked" : ""}><i aria-hidden="true"></i></label>
      </form>
      <div class="cookie-actions">
        <button type="button" class="cookie-btn is-primary" data-cookie="save" ${open ? "" : "hidden"}>Save choices</button>
        <button type="button" class="cookie-btn ${open ? "" : "is-primary"}" data-cookie="all">Accept all</button>
        <button type="button" class="cookie-btn" data-cookie="essential" ${open ? "hidden" : ""}>Essential only</button>
        <button type="button" class="link-button" data-cookie="choose" ${open ? "hidden" : ""}>Choose</button>
      </div>
    </section>`
  );
  const banner = $(".cookie-banner");
  requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add("is-in")));
  const close = () => {
    banner.classList.remove("is-in");
    setTimeout(() => banner.remove(), reduceMotion ? 0 : 700);
  };
  // After a choice the card turns into a short confirmation, then slides away.
  const confirmChoice = (c) => {
    const summary =
      c.analytics && c.marketing ? "All cookies are on." : c.analytics ? "Essential and analytics cookies are on." : c.marketing ? "Essential and marketing cookies are on." : "Only essential cookies are on.";
    const from = banner.offsetHeight;
    banner.innerHTML = `
      <div class="cookie-done" role="status">
        <svg class="cookie-check" viewBox="0 0 28 28" aria-hidden="true"><circle cx="14" cy="14" r="12.5" pathLength="1"/><path d="M8.5 14.5l3.6 3.6 7.4-7.6" pathLength="1"/></svg>
        <p><strong>Saved.</strong> ${summary}</p>
      </div>`;
    banner.classList.add("is-done");
    if (!reduceMotion) banner.animate([{ height: `${from}px` }, { height: `${banner.offsetHeight}px` }], { duration: 450, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" });
    const timer = setTimeout(close, 2600);
    banner.addEventListener("click", () => (clearTimeout(timer), close()), { once: true });
  };
  banner.addEventListener("click", (e) => {
    const action = e.target.closest("[data-cookie]")?.dataset.cookie;
    if (!action) return;
    const form = $("[data-cookie-form]", banner);
    if (action === "choose") {
      form.hidden = false;
      e.target.hidden = true;
      $("[data-cookie=essential]", banner).hidden = true;
      $("[data-cookie=all]", banner).classList.remove("is-primary");
      $("[data-cookie=save]", banner).hidden = false;
      $("input[name=analytics]", form).focus();
      return;
    }
    if (action === "all") saveConsent({ analytics: true, marketing: true });
    if (action === "essential") saveConsent({ analytics: false, marketing: false });
    if (action === "save") saveConsent({ analytics: form.analytics.checked, marketing: form.marketing.checked });
    e.stopPropagation();
    confirmChoice(window.cookieConsent);
  });
}

/* ── Google Analytics (GA4), only with consent ───────────── */

// SITE.gaId is GA_MEASUREMENT_ID in Render. Until someone accepts analytics nothing of Google's
// loads and no analytics cookies are set. Ads signals follow the Marketing choice (Consent Mode).
// Turning analytics off later stops measuring and clears Google's cookies.
window.dataLayer = window.dataLayer || [];
function gtag(...args: any[]): void;
function gtag() {
  dataLayer.push(arguments); // gtag.js reads the arguments object, as Google's snippet does
}
// Our own record of a signed-in customer's visits (the lead score in the back office): the page
// and how long it was on screen, and cart adds. Only with analytics allowed; the server keeps
// nothing for visitors who aren't signed in.
function noteActivity(kind, extra = {}) {
  if (!window.cookieConsent?.analytics || !navigator.sendBeacon) return;
  try {
    // Plain text: a beacon with a JSON content type can be dropped as the page closes.
    navigator.sendBeacon("/api/activity", new Blob([JSON.stringify({ kind, path: location.pathname, ...extra })], { type: "text/plain" }));
  } catch {}
}
// The time on screen goes every 15 seconds while the page is open, and when it's hidden (another
// tab, the app in the background, leaving it): browsers don't always deliver a send as a page closes.
{
  let shown = document.visibilityState === "visible" ? Date.now() : 0;
  let total = 0;
  const flush = () => {
    if (shown) total += Date.now() - shown;
    shown = 0;
    const secs = Math.round(total / 1000);
    if (secs >= 2) {
      noteActivity("view", { secs });
      total = 0;
    }
  };
  document.addEventListener("visibilitychange", () => (document.visibilityState === "visible" ? (shown = Date.now()) : flush()));
  addEventListener("pagehide", flush);
  // While it's open, every 15 seconds too, so a close the browser doesn't report loses little.
  setInterval(() => {
    if (!shown || Date.now() - shown < 15_000) return;
    flush();
    shown = Date.now();
  }, 15_000);
}

let gaOn = false;
function wireAnalytics() {
  if (!/^G-[A-Z0-9]+$/.test(SITE.gaId || "")) return;
  const apply = () => {
    const c = window.cookieConsent;
    const ads = c.marketing ? "granted" : "denied";
    const consent = { analytics_storage: c.analytics ? "granted" : "denied", ad_storage: ads, ad_user_data: ads, ad_personalization: ads };
    if (!gaOn && c.analytics) {
      gtag("consent", "default", consent);
      gtag("js", new Date());
      gtag("config", SITE.gaId);
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${SITE.gaId}`;
      document.head.append(script);
    } else if (gaOn) {
      gtag("consent", "update", consent);
      if (!c.analytics) {
        for (const name of document.cookie.split("; ").map((x) => x.split("=")[0]).filter((n) => /^_ga/.test(n))) {
          document.cookie = `${name}=; Max-Age=0; path=/; domain=${location.hostname.replace(/^www\./, ".")}`;
          document.cookie = `${name}=; Max-Age=0; path=/`;
        }
      }
    }
    gaOn = gaOn || c.analytics;
  };
  apply();
  addEventListener("cookieconsent", apply);
}
// A shop event (view_item, add_to_cart, begin_checkout, purchase…), only while analytics is on.
function gaEvent(name, params = {}) {
  if (gaOn && window.cookieConsent.analytics) gtag("event", name, { currency: SITE.currencyCode, ...params });
}
const LINE_CATEGORY = { giftcard: "Gift Card", coffee: "Coffee", sub: "Subscription", prepaid: "Gift Subscription", accessory: "Accessories", class: "Classes", pickup: "Café" };
const gaItem = (l, qty = l.qty) => ({
  item_id: (l.kind === "accessory" || l.kind === "coffee" ? lineProduct(l) : l.key) || l.key,
  item_name: l.title,
  ...(l.variant ? { item_variant: String(l.variant).slice(0, 100) } : {}),
  item_category: l.kind === "accessory" && isTea(ACCESSORIES.find((a) => a.id === lineProduct(l)) || {}) ? "Tea" : LINE_CATEGORY[l.kind] || l.kind,
  price: l.price,
  quantity: qty,
});
const gaValue = (lines) => Math.round(lines.reduce((n, l) => n + l.price * l.qty, 0) * 100) / 100;

/* ── App (PWA): installable, pages you've opened work offline ── */

function wireApp() {
  if (!("serviceWorker" in navigator)) return;
  addEventListener("load", () => navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {}));
  // Browsers that offer installing (Chrome, Edge, Android) get an "Install App" item in the menu.
  let prompt = null;
  const item = $("[data-install-app]");
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    prompt = e;
    if (item) item.hidden = false;
  });
  addEventListener("appinstalled", () => {
    prompt = null;
    if (item) item.hidden = true;
  });
  item?.addEventListener("click", async () => {
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice.catch(() => {});
    prompt = null;
    item.hidden = true;
  });
}

/* ── Photos: no "Save image" on a long press or right click ── */
// A deterrent, not a lock: anyone can still take a screenshot.
function protectImages() {
  document.addEventListener("contextmenu", (e) => {
    if ((e.target as any).closest("img, picture, video, svg image, .bag-svg, .hero")) e.preventDefault();
  });
  document.addEventListener("dragstart", (e) => {
    if ((e.target as any).closest?.("img, svg")) e.preventDefault();
  });
}

/* ── Accessibility: a small blue button with a few reading aids ── */
// Each choice is a class on <html> (styles.css, "Accessibility panel"), kept in this browser.
const A11Y_OPTIONS = [
  ["text", "Larger text"],
  ["contrast", "Higher contrast"],
  ["links", "Underline links"],
  ["font", "Easy-read font"],
  ["motion", "Stop animations"],
];
const A11Y_ICON = `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4.5" r="2"/><path d="M5 8.5l7 1.5 7-1.5M12 10v5m0 0l-3 6m3-6l3 6"/></svg>`;

function wireAccessibility() {
  if (page === "admin") return;
  const root = document.documentElement;
  let on = store.get("bp-a11y", []).filter((k) => A11Y_OPTIONS.some(([id]) => id === k));
  const apply = () => A11Y_OPTIONS.forEach(([id]) => root.classList.toggle(`a11y-${id}`, on.includes(id)));
  apply();
  document.body.insertAdjacentHTML(
    "beforeend",
    `<div class="a11y" data-a11y>
      <button type="button" class="a11y-button" data-a11y-toggle aria-expanded="false" aria-controls="a11y-panel" aria-label="Accessibility options">${A11Y_ICON}</button>
      <section class="a11y-panel" id="a11y-panel" role="dialog" aria-label="Accessibility options" hidden>
        <h2>Accessibility</h2>
        <div class="a11y-options">
          ${A11Y_OPTIONS.map(([id, label]) => `<button type="button" data-a11y-option="${id}" aria-pressed="${on.includes(id)}"><span>${label}</span><i aria-hidden="true"></i></button>`).join("")}
        </div>
        <button type="button" class="a11y-reset" data-a11y-reset>Reset</button>
        <p>Something hard to use? Email <a href="mailto:${esc(SITE.email)}">${esc(SITE.email)}</a> and we'll help.</p>
      </section>
    </div>`
  );
  const box = $("[data-a11y]");
  const toggle = $("[data-a11y-toggle]", box);
  const panel = $(".a11y-panel", box);
  const setOpen = (open) => {
    panel.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
    if (open) $("[data-a11y-option]", panel).focus();
  };
  const save = () => {
    store.set("bp-a11y", on);
    apply();
    $$("[data-a11y-option]", panel).forEach((b) => b.setAttribute("aria-pressed", String(on.includes(b.dataset.a11yOption))));
  };
  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-a11y-toggle]")) return setOpen(panel.hidden);
    const opt = e.target.closest("[data-a11y-option]");
    if (opt) {
      const id = opt.dataset.a11yOption;
      on = on.includes(id) ? on.filter((k) => k !== id) : [...on, id];
      return save();
    }
    if (e.target.closest("[data-a11y-reset]")) {
      on = [];
      save();
    }
  });
  document.addEventListener("click", (e) => !panel.hidden && !(e.target as any).closest("[data-a11y]") && setOpen(false));
  // Opened from the menu (the floating button is hidden, styles.css): the menu closes and the
  // panel opens; Escape goes back to whatever opened it.
  let opener = toggle;
  document.addEventListener("click", (e) => {
    const from = (e.target as any).closest("[data-a11y-open]");
    if (!from) return;
    opener = getComputedStyle(toggle).display === "none" ? $(".menu-open") || from : toggle;
    closeOverlays(false);
    setOpen(true);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !panel.hidden) {
      setOpen(false);
      opener?.focus?.();
      opener = toggle;
    }
  });
  // Sits just above whatever is pinned to the bottom of the screen (Add to Cart, the cookie card…).
  // The page's own pinned bar (not the cards) also lifts the welcome card (--pinned-bottom).
  const lift = () => {
    let h = 0;
    let bar = 0;
    for (const el of $$(".buy-row, .sub-bar.is-shown, .order-bar, .cookie-banner")) {
      if (getComputedStyle(el).position !== "fixed") continue;
      const r = el.getBoundingClientRect();
      if (r.height && r.top < innerHeight && r.bottom > innerHeight - 4) {
        h = Math.max(h, innerHeight - r.top);
        if (!el.matches(".cookie-banner")) bar = Math.max(bar, innerHeight - r.top);
      }
    }
    box.style.setProperty("--a11y-lift", `${Math.round(h)}px`);
    document.documentElement.style.setProperty("--pinned-bottom", `${Math.round(bar)}px`);
  };
  lift();
  addEventListener("scroll", lift, { passive: true });
  // Out of the way while reading down the page (it would sit on the text it passes); back on
  // scrolling up, once scrolling stops, or with keyboard focus.
  let lastY = scrollY;
  let settle = 0;
  addEventListener(
    "scroll",
    () => {
      const down = scrollY > lastY + 2;
      lastY = scrollY;
      if (!panel.hidden || box.contains(document.activeElement)) return;
      box.classList.toggle("is-tucked", down && scrollY > 80);
      clearTimeout(settle);
      settle = setTimeout(() => box.classList.remove("is-tucked"), 900);
    },
    { passive: true }
  );
  addEventListener("resize", lift);
  addEventListener("load", lift);
  document.addEventListener("transitionend", lift); // bars that slide in (or out) settle here
  new MutationObserver(lift).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class", "hidden"] });
}

function wireCookies() {
  // After the page has settled in; not inside a frame (the back office's post preview).
  if (!readConsent() && window.self === window.top) setTimeout(() => cookieBanner(), 900);
  document.addEventListener("click", (e) => {
    if ((e.target as any).closest("[data-cookie-settings]")) cookieBanner({ open: true });
  });
}

/* ── Boot ─────────────────────────────────────────────────── */

// Until the bars open, their pages (and old links to them) lead to the shop.
if (!SITE.cafesLive && ["locations", "order", "orderMenu"].includes(page)) location.replace("shop");

if (!SITE.cafesLive) $$("[data-cafes]").forEach((el) => el.remove()); // links on the 404 and offline pages

// Language: a first visit opens in the phone's language when we have it (once; picking a
// language in the menu or footer is remembered and always wins).
document.addEventListener("click", (e) => {
  const link = (e.target as any).closest("[data-lang]");
  if (link) store.set("bp-lang", link.dataset.lang);
});
if (LANG === "en" && !store.get("bp-lang", null) && !navigator.webdriver && SITE.langs?.length) {
  const preferred = (navigator.languages || [navigator.language]).map((l) => String(l).slice(0, 2).toLowerCase()).find((l) => l === "en" || SITE.langs.includes(l));
  store.set("bp-lang", preferred || "en");
  if (preferred && preferred !== "en") location.replace(langHref(preferred));
}

// Phones have no hover: a tap on the logo plays the rosette's bloom, then goes home (on the home
// page it just blooms). Reduced motion: straight there, as before.
function wireLogoBloom() {
  const logo = document.querySelector<HTMLAnchorElement>(".header .logo");
  if (!logo || matchMedia("(hover: hover)").matches) return;
  let timer = 0;
  logo.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    e.preventDefault();
    clearTimeout(timer);
    logo.classList.add("is-bloom");
    timer = window.setTimeout(() => {
      if (page === "home") logo.classList.remove("is-bloom");
      else location.href = logo.href;
    }, page === "home" ? 1400 : 650);
  });
  // Back to this page from home (the back button): the A again.
  addEventListener("pageshow", () => logo.classList.remove("is-bloom"));
}

wireAnalytics();
renderLayout();
wireLogoBloom();
pages[page]?.();
renderCart();
wireEvents();
wireSubscribe();
wireSearch();
wireChat();
wireCookies();
wireAccessibility();
protectImages();
wireWelcome();
wireApp();
addHoneypots();
document.addEventListener("focusin", addHoneypots); // forms drawn later (account, wholesale portal)
headerOnScroll();
// Pinned bars (Add to Cart, Add Subscription) step aside once the footer is in view, so they
// never sit over it.
{
  const footer = $(".footer");
  if (footer && "IntersectionObserver" in window) new IntersectionObserver(([en]) => document.body.classList.toggle("footer-in-view", en.isIntersecting)).observe(footer);
}

// Title Case: styles.css capitalises headings and buttons, but CSS can't keep the short words
// small. In English each "and", "of", "on"… after a title's first word is wrapped in a <tc-s> that
// keeps it lowercase ("Coffee and Tea, on Repeat"); the text itself doesn't change. (Tags of their
// own, so no "h2 span" style catches them.) Spanish and
// Korean don't use Title Case, so there it's turned off.
// (Not in a hyphenated word: "MF-7EA995", "To-Do".)
const SMALL_WORD_RE = /(^|[^\p{L}\p{N}'’-])(a|an|and|as|at|but|by|for|in|nor|of|on|or|per|the|to|via)(?=$|[^\p{L}\p{N}'’-])/giu;
const capitalised = (el) => el && getComputedStyle(el).textTransform === "capitalize";
function titleCaseWords(root) {
  if (!root || root.nodeType !== 1 || root.closest("tc-s")) return;
  if (LANG !== "en") {
    for (const el of [root, ...root.querySelectorAll("*")]) if (capitalised(el)) el.style.textTransform = "none";
    return;
  }
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

// The phone's edges (.edge-top / .edge-bottom in styles.css); theme-color follows them.
document.body.insertAdjacentHTML("beforeend", '<div class="edge-top" aria-hidden="true"></div><div class="edge-bottom" aria-hidden="true"></div>');
const themeMeta = document.querySelector('meta[name="theme-color"]');
const syncTheme = () => themeMeta?.setAttribute("content", getComputedStyle(document.documentElement).getPropertyValue("--edge").trim());
new MutationObserver(syncTheme).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
syncTheme();
observeReveals();
wordReveals();
titleCaseWords(document.body);
new MutationObserver((changes) => {
  for (const c of changes) {
    if (c.type === "characterData") titleCaseWords(c.target.parentElement);
    else c.addedNodes.forEach((n) => titleCaseWords(n.nodeType === 3 ? n.parentElement : n));
  }
}).observe(document.body, { childList: true, characterData: true, subtree: true });
requestAnimationFrame(() => document.body.classList.add("is-ready"));

// Chrome, Edge and Android get the next page ready as a link is pointed at or pressed, so it opens
// at once. Pages that act on the visitor (checkout, account, café orders) are only fetched, not run
// ahead; the back office and API are left alone.
if (HTMLScriptElement.supports?.("speculationrules")) {
  const busy = ["/api/*", "/admin*", "/checkout*", "/*/checkout*", "/account*", "/*/account*", "/login*", "/*/login*", "/reset*", "/*/reset*", "/trade*", "/*/trade*", "/order*", "/*/order*"];
  const not = (patterns) => patterns.map((p) => ({ not: { href_matches: p } }));
  const rules = document.createElement("script");
  rules.type = "speculationrules";
  rules.textContent = JSON.stringify({
    prerender: [{ where: { and: [{ href_matches: "/*" }, ...not(busy), { not: { selector_matches: "[download], [target=_blank], [data-no-prerender]" } }] }, eagerness: "moderate" }],
    prefetch: [{ where: { and: [{ href_matches: "/*" }, ...not(["/api/*", "/admin*"])] }, eagerness: "moderate" }],
  });
  document.head.append(rules);
}

// A link that opens the chat: ?chat=1 on any page. From one of our emails it carries that
// conversation (?chat=conv-…&k=…): this chat window joins it, showing the emails so far, and
// they carry on here.
if (new URLSearchParams(location.search).has("chat") && $("#chat")) {
  const params = new URLSearchParams(location.search);
  const id = params.get("chat");
  const key = params.get("k");
  params.delete("chat");
  params.delete("k");
  history.replaceState(null, "", location.pathname + (params.size ? `?${params}` : "") + location.hash);
  if (/^conv-[a-f0-9]{12}$/.test(id) && key && chatState.id !== id) {
    api(`/api/chat/${id}/join`, { method: "POST", body: { k: key } })
      .then((data) => {
        clearInterval(chatPoll);
        rememberChat();
        chatState = { id: data.chat.id, token: data.chat.token, fromEmail: true, messages: data.chat.messages.map(chatMsg), rating: data.chat.rating || null, seen: 0 };
        chatState.seen = chatStaffCount();
        saveChat();
        openChat();
      })
      .catch((error) => {
        openChat();
        toast(esc(error.message));
      });
  } else openChat();
}

// Landing from a newsletter confirmation link.
{
  const subscribed = new URLSearchParams(location.search).get("subscribed");
  if (subscribed) {
    // With a welcome code, the welcome card shows it instead.
    if (!new URLSearchParams(location.search).get("welcome")) toast(subscribed === "1" ? "You're subscribed. Thanks for confirming!" : "That link has already been used, or has expired.");
    history.replaceState(null, "", location.pathname + location.hash);
  }
}

