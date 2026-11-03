// The look every email shares (orders, accounts, newsletters, automated emails): the logo, a
// 568px column, the blue button and a footer. Tables and inline styles, so it reads the same in
// Gmail, Apple Mail and Outlook. Light only: the colors are all set (body, column, text), so
// dark-mode mail apps leave it as it is, and the logo sits on its own white badge
// (email-logo-badge.png), so it still shows on a dark background in apps that invert anyway.

export const BLUE = "#2457f5";
export const INK = "#111111";
export const MUTED = "#666666";
export const LINE = "#e4e4e4";
export const SOFT = "#f2f2f2";
export const FONT = "-apple-system,BlinkMacSystemFont,'Helvetica Neue',Helvetica,Arial,sans-serif";

export const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Buttons read in title case, like the site's ("Track Your Order", "Add to Calendar").
const SMALL = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
export const titleCase = (text) => String(text).replace(/(^|\s)(\p{Ll}[\p{L}']*)/gu, (w, space, word, i) => (i > 0 && SMALL.has(word) ? w : space + word[0].toUpperCase() + word.slice(1)));

export const emailButton = (label, href) =>
  `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px"><tr><td bgcolor="${BLUE}" style="background:${BLUE};border-radius:12px"><a href="${esc(href)}" style="display:inline-block;padding:14px 26px;font:500 15px/1 ${FONT};color:#ffffff;text-decoration:none;border-radius:12px">${esc(titleCase(label))}</a></td></tr></table>`;

// The page around an email's body. footer: HTML under the rule at the bottom. logo: false for
// none at the top (a conversation's email, signed with the logo at its foot instead).
export function emailPage({ siteUrl, siteName, title = "", preheader = "", body, footer = "", logo = true, rule = true }) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light;supported-color-schemes:light}</style><title>${esc(title)}</title></head>
<body bgcolor="#ffffff" style="margin:0;padding:0;background:#ffffff;color:${INK}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;&#847;&zwnj;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="background:#ffffff"><tr><td align="center" style="padding:28px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="max-width:568px;background:#ffffff"><tr><td style="padding:0 16px;color:${INK}">
${logo ? `<a href="${siteUrl}/"><img src="${siteUrl}/assets/email-logo-badge.png" alt="${esc(siteName)}" width="44" height="44" style="display:block;border:0;margin:0 0 28px;font:700 8px/50px ${FONT};color:${INK}"></a>` : ""}
${body}
${rule ? `<hr style="margin:28px 0 18px;border:0;border-top:1px solid ${LINE}">` : ""}
${footer}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// A small gray footer line.
export const footLine = (html, last = false) => `<p style="margin:0 0 ${last ? 0 : 8}px;font:400 12px/1.5 ${FONT};color:${MUTED}">${html}</p>`;
