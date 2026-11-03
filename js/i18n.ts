// Translations for the shop at /es/ and /ko/. The pages and app.js are written in English;
// this translates what's on screen, as it appears, from a dictionary of English → translation
// (i18n/<lang>.json plus anything added in the back office, served as /i18n/<lang>.js).
//
// A sentence is translated whole, with its inline tags (links, bold) as numbered placeholders,
// so word order can change: "Subscriber? <0>Log in</0> for 10% off coffee." → "¿Suscriptor?
// <0>Inicia sesión</0> para un 10% de descuento en café." Keys can hold {wildcards} for values
// that change ("We'd suggest <0>{size}</0>, delivered <1>{freq}</1>."); a wildcard's value is
// translated too when the dictionary has it. Lists like "Dark Chocolate, Walnut, Mandarin" are
// translated item by item. Text that changes later (toasts, counts, errors) is re-translated by
// a MutationObserver. English pages don't load this file.
(() => {
  const root = document.documentElement;
  const lang = root.lang || "en";
  const dict = window.I18N_DICT || {};
  const missing = new Set(); // keys with no translation (see window.i18n.missing)

  // Keys with {wildcards} become patterns; the rest are looked up directly.
  const exact = new Map();
  const patterns = [];
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  for (const [key, value] of Object.entries(dict)) {
    if (!value) continue;
    if (/\{\w+\}/.test(key)) {
      const names = [];
      const source = key
        .split(/(\{\w+\})/)
        .map((part) => {
          const m = /^\{(\w+)\}$/.exec(part);
          if (!m) return reEsc(part);
          names.push(m[1]);
          return "(.+?)";
        })
        .join("");
      patterns.push({ re: new RegExp(`^${source}$`), names, value, fixed: key.replace(/\{\w+\}/g, "").length });
    } else exact.set(key, value);
  }
  // The most specific pattern first: "{a} of {b}" mustn't take a sentence a longer key fits.
  patterns.sort((a, b) => b.fixed - a.fixed);
  const outputs = new Set(exact.values()); // already-translated text, never translated again
  const english = new Map([...exact].map(([k, v]) => [v, k])); // translation → its English

  const norm = (s) => s.replace(/\s+/g, " ").trim();
  const hasWords = (s) => /\p{L}/u.test(s);

  // The dictionary lookup for one key: exact, then patterns, then a comma list.
  function lookup(key) {
    if (exact.has(key)) return exact.get(key);
    for (const p of patterns) {
      const m = p.re.exec(key);
      // A pattern with almost no words of its own ("{a} of {b}", "{n} items") would take any
      // sentence containing them: its values must then be numbers or text the dictionary knows.
      if (m && p.fixed < 10 && !m.slice(1).every((v) => /^[\d.,:$%\s–-]+$/.test(v) || exact.has(norm(v)))) continue;
      if (m) {
        let out = p.value;
        p.names.forEach((name, i) => (out = out.split(`{${name}}`).join(lookupValue(m[i + 1]))));
        return out;
      }
    }
    // Short lists ("Dark Chocolate, Walnut, Mandarin", "Brazil · Bahia", "250g · Whole Bean"):
    // each part translated, names left as they are, as long as something was translated.
    for (const sep of [" · ", ", "]) {
      if (/[<>]/.test(key) || !key.includes(sep)) continue;
      const parts = key.split(sep);
      if (parts.some((x) => x.split(" ").length > 4)) continue;
      const done = parts.map((x) => (sep === " · " ? lookup(x) : (exact.get(x) ?? null)));
      if (!done.some((x) => x != null)) continue;
      return parts.map((x, i) => done[i] ?? x).join(sep);
    }
    return null;
  }
  // A wildcard's value: translated when it's a known word or phrase (keeping placeholders).
  const lookupValue = (v) => (/<\d+\/?>/.test(v) ? v : (lookup(v) ?? v));

  const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "svg", "SVG", "CODE", "NOSCRIPT", "TEMPLATE", "IFRAME"]);
  const INLINE = new Set(["A", "STRONG", "B", "EM", "I", "SMALL", "SPAN", "SUP", "SUB", "S", "MARK", "U", "ABBR", "TIME", "DATA", "BDI", "Q"]);
  const VOID = new Set(["BR", "IMG", "svg", "SVG", "WBR", "INPUT", "PICTURE"]);
  const skipped = (el) => SKIP.has(el.nodeName) || el.closest?.("[translate=no], [data-no-i18n], .bag-svg");

  // A sentence: an element of text and inline elements, with words of its own. A row of links
  // or labels with no words between them is translated one by one instead.
  function isUnit(el) {
    if (!inlineOnly(el)) return false;
    const kids = [...el.childNodes];
    return !kids.some((n) => n.nodeType === 1 && !VOID.has(n.nodeName)) || kids.some((n) => n.nodeType === 3 && hasWords(n.nodeValue));
  }
  // Made only of text and inline elements.
  function inlineOnly(el) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3 || n.nodeType === 8) continue;
      if (n.nodeType !== 1) return false;
      if (VOID.has(n.nodeName)) continue;
      if (!INLINE.has(n.nodeName) || !inlineOnly(n)) return false;
    }
    return true;
  }

  // The element's content as a key: text, with <n>…</n> for inline elements and <n/> for
  // icons, images and line breaks. Also returns the elements in placeholder order.
  function serialize(el) {
    const nodes = [];
    const walk = (parent) =>
      [...parent.childNodes]
        .map((n) => {
          if (n.nodeType === 3) return n.nodeValue.replace(/[<>]/g, "");
          if (n.nodeType !== 1) return "";
          const i = nodes.push(n) - 1;
          return VOID.has(n.nodeName) ? `<${i}/>` : `<${i}>${walk(n)}</${i}>`;
        })
        .join("");
    return { key: norm(walk(el)), nodes };
  }

  // Rebuilds an element's content from a translation, reusing its own inline elements (so
  // anything holding a reference to them keeps working).
  function rebuild(el, translation, nodes) {
    const used = new Set();
    const build = (str, parent) => {
      const re = /<(\d+)\/>|<(\d+)>([\s\S]*?)<\/\2>/g;
      let last = 0;
      let m;
      while ((m = re.exec(str))) {
        if (m.index > last) parent.appendChild(document.createTextNode(str.slice(last, m.index)));
        const i = Number(m[1] ?? m[2]);
        let node = nodes[i];
        if (!node) {
          last = re.lastIndex;
          continue;
        }
        if (used.has(node)) node = node.cloneNode(m[1] != null);
        used.add(node);
        if (m[1] == null) {
          node.textContent = "";
          build(m[3], node);
        }
        parent.appendChild(node);
        last = re.lastIndex;
      }
      if (last < str.length) parent.appendChild(document.createTextNode(str.slice(last)));
    };
    const frag = document.createDocumentFragment();
    build(translation, frag);
    el.replaceChildren(frag);
  }

  function translateUnit(el) {
    const { key, nodes } = serialize(el);
    if (!key || !hasWords(key) || outputs.has(key)) return;
    // A part may already be translated on its own ("<0>배송</0> 114.6 miles…"): read it as
    // English again so the whole sentence matches.
    const t = lookup(key) ?? (/<\d+>/.test(key) ? lookup(key.replace(/<(\d+)>([^<>]*)<\/\1>/g, (m, i, inner) => `<${i}>${english.get(inner) ?? inner}</${i}>`)) : null);
    if (t == null) {
      missing.add(key);
      return;
    }
    if (t === key) return;
    outputs.add(norm(t));
    if (!nodes.length) {
      // Plain text: keep the surrounding spaces.
      const raw = el.textContent;
      el.textContent = raw.replace(/\S(?:[\s\S]*\S)?/, () => t); // by position, so extra spaces in the text don't matter
    } else rebuild(el, t, nodes);
  }

  function translateText(node) {
    const key = norm(node.nodeValue);
    if (!key || !hasWords(key) || outputs.has(key)) return;
    const t = lookup(key);
    if (t == null) return missing.add(key);
    outputs.add(t);
    node.nodeValue = node.nodeValue.replace(/\S(?:[\s\S]*\S)?/, () => t);
  }

  const ATTRS = ["placeholder", "aria-label", "alt", "title", "data-label"];
  function translateAttrs(el) {
    for (const a of ATTRS) {
      const v = el.getAttribute?.(a);
      if (!v || !hasWords(v) || outputs.has(v)) continue;
      const t = lookup(norm(v));
      if (t == null) missing.add(norm(v));
      else if (t !== v) {
        outputs.add(t);
        el.setAttribute(a, t);
      }
    }
    if (el.nodeName === "INPUT" && /^(submit|button)$/.test(el.type) && el.value) {
      const t = lookup(norm(el.value));
      if (t) el.value = t;
    }
  }

  function translate(node, top = true) {
    if (node.nodeType === 3) {
      const parent = node.parentElement;
      if (parent && !skipped(parent)) {
        if (isUnit(parent) && parent !== document.body) translateUnit(parent);
        else translateText(node);
      }
      return;
    }
    if (node.nodeType !== 1 || skipped(node)) return;
    if (top) {
      translateAttrs(node);
      node.querySelectorAll?.("[placeholder], [aria-label], [alt], [title], input[type=submit], input[type=button]").forEach((el) => !skipped(el) && translateAttrs(el));
    }
    if (node !== document.body && node !== root && isUnit(node)) return translateUnit(node);
    for (const child of [...node.childNodes]) {
      if (child.nodeType === 3) {
        if (norm(child.nodeValue)) translateText(child);
      } else translate(child, false);
    }
  }

  // Changes made by the page (new content, new text) are translated as they happen; our own
  // changes are taken off the queue so they don't loop.
  let observer;
  const run = (fn) => {
    observer?.disconnect();
    try {
      fn();
    } finally {
      observer?.observe(root, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    }
  };
  function onMutations(records) {
    run(() => {
      const seen = new Set();
      for (const r of records) {
        if (r.type === "attributes") translateAttrs(r.target);
        else if (r.type === "characterData") {
          const unit = r.target.parentElement;
          if (unit && !seen.has(unit)) {
            seen.add(unit);
            translate(r.target);
          }
        } else {
          for (const n of r.addedNodes) {
            if (n.nodeType === 3 && r.target.nodeType === 1 && isUnit(r.target) && r.target !== document.body) {
              if (!seen.has(r.target)) {
                seen.add(r.target);
                translateUnit(r.target);
              }
            } else translate(n);
          }
        }
      }
    });
  }

  function start() {
    run(() => translate(document.body));
    document.title = lookup(norm(document.title)) ?? document.title;
    root.classList.remove("i18n-pending");
  }
  observer = new MutationObserver(onMutations);
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
  setTimeout(() => root.classList.remove("i18n-pending"), 2500); // never leave the page hidden

  window.i18n = {
    lang,
    missing,
    // Translate an element now (app.js uses this before splitting a sentence into words).
    translate: (el) => run(() => translate(el)),
    // For app.js: a translated string, with {name} values filled in.
    t(text, vars = {}) {
      let out = lookup(norm(text)) ?? text;
      for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(v);
      return out;
    },
  };
})();
