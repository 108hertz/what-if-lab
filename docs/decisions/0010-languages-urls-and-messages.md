# 0010 — Languages: URL scheme, message format, translations kept in the repo

- **Status:** accepted
- **Date:** 2026-11-08

## Context

Traffic is the goal (PLAN.md), and most of the web does not read English. We want 20 languages, every word
of the site translated and shipped with the static export: no translation service at runtime, no backend
(ADR 0001), no AI in the product. Three choices are hard to undo once pages are indexed and catalogs are
written: the URL of each language, the file format the words live in, and how translations are made.

The site is a static export (`output: "export"`), so Next's built-in i18n routing and middleware are not
available. The lab renders on the client only (`ssr: false`), and the sims write English sentences into
their event log (`note()`), which the timeline also uses to match events between the two worlds.

## Options

**URLs**

| Option | Pros | Cons |
| --- | --- | --- |
| A. English unprefixed (`/lab/earth`), others prefixed (`/de/lab/earth`) | Existing links and any indexing keep working; clean English URLs | Two route trees (route groups `(en)` and `[lang]`), each with its own root layout |
| B. Every language prefixed (`/en/…`), `/` redirects | One route tree | No server ⇒ `/` must redirect in JS (slow, weak for SEO); every current URL changes |
| C. Language in a query or cookie | Simple | Not indexable per language; no hreflang |

**Message format**

| Option | Pros | Cons |
| --- | --- | --- |
| A. JSON per namespace, stable dotted keys, ICU MessageFormat strings (`{n, plural, one {# kid} other {# kids}}`), formatted by our own ~150-line formatter | Translator tools (Crowdin, Weblate, Lokalise) read it; correct plurals for every language via `Intl.PluralRules`; no dependency | We maintain the formatter (only argument, plural, select, number) |
| B. Same, with `intl-messageformat` / `next-intl` | Full ICU | A dependency on every page; next-intl's routing assumes middleware |
| C. English text as the key (gettext) | Easy to extract | Every English edit orphans 19 translations |

**Making translations**

| Option | Pros | Cons |
| --- | --- | --- |
| A. Drafted by Claude at development time, committed as JSON, reviewed by native speakers before a language is marked ready | Fast and cheap; nothing runs at runtime | Drafts need review; quality varies by language |
| B. Professional translation of all ~250k words | Best quality | ~$25k and slow for every new world |
| C. Runtime machine translation | No work | Network calls, a vendor, breaks "no AI, no network" |

## Decision

**URLs A, format A, translations A.** English stays at today's URLs; the other languages live under
`/<code>/`, with the codes `es pt fr de it nl pl tr id vi ru uk zh ja ko ar hi th bn` (hreflang `pt-BR`,
`zh-Hans`; the rest as written). Words live in JSON catalogs (English is the source of truth) with ICU
message strings and stable keys; our own formatter is built on `Intl`. Translations are written into the
repo at development time and reviewed before a language is published; nothing is translated at runtime.

## Consequences

- Easier: hreflang, per-language sitemaps and titles; a language ships as files only; any translator
  tool can take over later.
- Harder: every new phrase needs a key and 19 translations (a test fails on gaps); two root layouts.
- Sims stop storing sentences: events become `{k, v}` (key + values), translated when shown. Determinism
  is unchanged and sim output no longer depends on the language.
- A language is listed in the picker, the sitemap and hreflang only once it is `ready` (all keys present,
  reviewed). Until then it builds but is hidden.
- Implemented in [change 0025](../changes/0025-languages-base-and-seo.md); the remaining languages in a
  later change.
