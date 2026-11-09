# Languages

- **Status:** shipped (5 languages as machine drafts awaiting native review)
- **Tier:** free
- **Owner area:** `lib/i18n/` (API, catalogs, SEO helpers), `app/(en)` + `app/[lang]` (routes), `worlds/<key>/locales/`
- **Changes:** [0025](../changes/0025-languages-base-and-seo.md) · **Decisions:** [ADR 0010](../decisions/0010-languages-urls-and-messages.md)

## What it is

The whole site in 20 languages, with every word held in the repo and shipped statically. No translation at
runtime, no network calls.

## Why

Traffic: most search happens in languages other than English, and each language is a new set of indexable
pages.

## Behaviour

- English at today's URLs; other languages at `/<code>/…` (`es pt fr de it nl pl tr id vi ru uk zh ja ko ar
  hi th bn`). Each page is fully in one language: nav, controls, what-ifs, stage and chart text, timeline
  events, exports, sign-in screens.
- A language picker in the nav lists ready languages by their own names and switches to the same page.
  If the browser's language is ready and differs, a dismissible "Also in …" hint offers it. No automatic
  redirect.
- Arabic reads right to left; the stage and charts keep time running left to right.
- Numbers, plurals and dates follow the language.
- SEO: translated titles and descriptions, hreflang between languages, one sitemap with every ready
  language, a crawlable static page per route.
- A language appears only when it is `ready`: every key translated (`READY` in `lib/i18n/locales.ts`).
  Ready now: all 20. The 19 translations are machine drafts (`_status` in each file) and still need a native
  speaker's review; take a language out of `READY` to hide it again (picker, sitemap, hreflang; its pages noindex).
- Clerk's own windows (sign-in, sign-up, checkout, profile) use `@clerk/localizations`, loaded only for the
  page's language.

## Out of scope

Runtime machine translation; translated docs.

## Acceptance checks

- [x] Every ready language has every key (test: `tests/i18n-catalogs.test.ts`).
- [x] The sim gives identical results in every language (test: event keys are language-free).
- [ ] `/ar/lab/earth` reads right to left at 375 px and 1600 px with no overflow.
- [ ] View-source of `/de/lab/solar` shows a German `<h1>`, title and hreflang links.
