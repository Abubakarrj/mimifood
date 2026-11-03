# Agent instructions

For UI work, follow GUI.md and use graphical-ui, graphical-convert, or graphical-audit as appropriate (skills go in `.agents/skills/`).

## Copy

- Cut taglines, helper text and secondary labels. If a screen needs them to make sense, fix the layout instead (clearer labels, grouping, a value beside its control). Exception: back office features borrowed from Peasy keep Peasy's short lines (one under an empty state's title, one under each option in a picker like Manage Cards).
- Never show internals to staff or customers: setting names, hosting, behind-the-scenes services, costs per call, raw error text. Say what's wrong in a plain sentence; keep detail in the server log. Name a service only where staff log into it and are told to act there (Square, Shippo, Uber Direct).
- American spelling, short and direct, Title Case for buttons. Exception: back office features borrowed from Peasy follow Peasy's wording and casing (e.g. "Tell me how bills work", "Create more", "Reset to defaults").
- Public pages are translated (`i18n/es.json`, `i18n/ko.json`, keyed by the English text): a changed English string needs its Spanish and Korean entries.

## Look

- No underlines or disclosure triangles; prefer cards. Avoid pill shapes: use the theme's small corners. Filters are quiet until picked.
- Phones are first-class: the back office is an app there (top bar, bottom tab bar, More). Check every UI change at iPhone width.

## Shipping

- Bump `CACHE` in `sw.js` for site changes and in `admin-sw.js` for back office changes.
- `npm run typecheck` must pass. Test in the browser (Playwright is preinstalled) before pushing.
- Never commit secrets; don't read or write `.env`.
