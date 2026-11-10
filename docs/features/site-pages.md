# Site pages: About, Privacy policy, Terms of use

- **Status:** live; operator, country, email and social links are placeholders in `lib/site.ts`
- **Tier:** free
- **Owner area:** `components/pages/` (DocPage, DocNav), `components/shell/SiteMenu.tsx`, `lib/site.ts`,
  `lib/i18n/locales/<code>/pages.json`, `app/(en)/{about,privacy,terms}`, `app/[lang]/{about,privacy,terms}`
- **Changes:** [0032](../changes/0032-about-privacy-terms.md)

## What it is

Three readable pages in every language: what What-If Lab is (with links to its Instagram and TikTok), what it collects
and why, and the rules for using it. A "…" menu at the end of the top bar links to them from every page.

## Why

People who find a clip on social media can find the project (and the other way round); analytics with consent, and later
ads and Premium, need a privacy policy and terms.

## Behaviour

- **Routes:** `/about`, `/privacy`, `/terms` and `/<lang>/…`; static, in the sitemap with hreflang; own title and description.
- **Layout:** top bar (wordmark, language, theme, site menu), one 68ch column, the page scrolls like a document (consoles
  don't); footer with the three pages and the socials. Consent banner as on every page.
- **Words:** `pages.json` per language, rendered at build time only (never shipped as client messages). Sections are
  `h` + `p…` + `li…` in the English file's order. Other languages say the English version applies and link to it.
- **Site details** (`lib/site.ts`): a value starting `TODO_` counts as not set — social buttons and links are hidden,
  the contact line says one is coming, and the operator reads "the What-If Lab team". The site test prints what's left.
- **About:** lede, how it works, links to every world, the simulation note, Follow us (Instagram / TikTok buttons, or
  "on their way"), who makes it, contact. `Organization` JSON-LD with `sameAs` once the profiles are set.
- **Site menu:** About, Privacy policy, Terms of use, Privacy settings (only with a GA ID), Instagram and TikTok (once set,
  open in a new tab). Arrow keys move, Esc closes.

## Out of scope

Contact form (no backend), legal review (owner), per-cookie tables beyond the services named.

## Acceptance checks

- [x] `tests/site-pages.test.ts`: routes exist, sitemap has each in every ready language, placeholders hidden, URL checks.
- [x] `tests/i18n-catalogs.test.ts`: `pages.json` complete in all 20 languages, placeholders match.
- [x] Build: 63 pages generated; policy text in HTML only (0 hits in `_next/static`).
- [x] Browser: /privacy at 1024 px dark; /ar/about RTL at 375 px light and dark, no sideways scroll; menu links.
- [ ] Owner fills `lib/site.ts`; legal review before Premium or ads.
