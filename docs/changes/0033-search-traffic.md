# 0033 — Search traffic: a page for every what-if, previews, structured data, every search engine

- **Status:** in-progress
- **Phase:** 2 (see [PLAN.md](../PLAN.md))
- **Features:** [SEO, sharing and growth](../features/seo-and-growth.md)
- **Decisions:** none new (static export, ADR 0001; language URLs, ADR 0010)
- **Created:** 2026-11-10 · **Shipped:** —

## Why

Traffic is the goal (PLAN.md), and organic search is the main way in: people type a question ("what if the
Sun disappeared", "what happens if we stop all emissions", "universal basic income simulator"). Today the site
has the basics from change 0025 (titles, descriptions, canonical, hreflang, sitemap, robots, a crawlable intro),
but only **8 indexable pages per language**. All 108 what-ifs share their world's page, so none of those questions
can rank. Links shared on social apps show no picture, and the live site has domain and metadata gaps (audit
below). This change gives every what-if its own answer page, fixes the gaps, and registers the site with
every major search engine. It stays inside the principles: everything is computed at build time from the sims
themselves (no AI, no live data, no server).

## Audit of the live site (whatif.science, 2026-11-10)

| # | Finding | Effect |
| --- | --- | --- |
| A1 | `whatif.science` and `www.whatif.science` both answer 200 with the full site; canonical, sitemap and robots say `www`. | Two copies of every page. Canonical limits the damage, but a 308 redirect is the clean fix. |
| A2 | Only 8 pages per language (scale + 7 worlds). The 108 what-ifs have no URL. | The long-tail questions, the main growth lever in PLAN.md, cannot rank. |
| A3 | No `og:image`; `twitter:card` is `summary`. | Shares on WhatsApp, X, Facebook, Reddit, Discord, iMessage show a bare link with no picture. |
| A4 | No structured data on lab pages (only on About/Privacy/Terms). | Google and Bing don't know a page is a free interactive web app; no breadcrumbs. |
| A5 | Home title is just "What-If Lab"; world titles are "Solar system · What-If Lab". | No search words in the titles ("simulator", "what if"). Titles are the strongest on-page signal. |
| A6 | With scripts on, the only words on a lab page are the console's; the intro is in the DOM but hidden (`display:none` once the lab is up). | Google says hidden content still counts, but the page is thin. This is fine for world pages; the what-if pages carry the real text. |
| A7 | Sitemap has no `lastmod`; no IndexNow; Bing/Yandex not set up (Google Search Console is verified). | Bing (and through it DuckDuckGo, Yahoo, Ecosia, ChatGPT search, Copilot) finds pages slowly. |
| A8 | No web app manifest, no `apple-touch-icon`. | Small: missing icons when saved to a home screen; some browsers show a generic icon in results. |
| ✓ | Real 404 status, http→https 308, `robots.txt` allows all, hreflang for 20 languages, static HTML with `<h1>`. | Good, keep. |

## Scope

**In:**
- **A page for every what-if** — `/lab/<world>/<whatif>` in every ready language (108 × 20 = 2,160 pages):
  the question as the `<h1>` and title, an answer computed by running the sim at build time, a picture of the
  result, the steps of what happens, a button that opens the live lab with that what-if already applied, and
  links to related what-ifs.
- **Open the lab with a what-if** — `/lab/<world>#whatif=<id>`: the lab runs a short baseline, then applies
  the what-if (the smallest piece of the share-URL work in seo-and-growth; full share URLs stay a later change).
- **Preview images** (`og:image`, 1200×630, `summary_large_image`) for home, every world and every what-if,
  drawn at build time with each sandbox's own `draw()` (the export code already does this).
- **Structured data** (JSON-LD): `WebSite` + `Organization` (with Instagram/TikTok `sameAs`) on home;
  `WebApplication` (free, browser, `EducationalApplication`) + `BreadcrumbList` on world pages; `Article`-style
  `WebPage` + `BreadcrumbList` on what-if pages. Every value must match visible text; no ratings (we have none).
- **Better titles and descriptions** with the words people search, in all 20 languages (catalog keys).
- **Sitemap**: what-if pages, `lastmod` from the build date per page group.
- **IndexNow**: key file in `public/`, a script that submits the sitemap after a production deploy.
- **Manifest + apple-touch-icon.**
- **Setup checklist for you** (dashboard work I can't do from code): www/apex redirect, Bing Webmaster Tools,
  Yandex Webmaster, Naver, Search Console sitemap submit.

**Out:**
- Full share URLs (params, seed, fork time) and embeds — next changes in Phase 2.
- Pages for scale objects ("how big is a neutron star") — good idea, its own change later.
- Baidu (needs a China host and ICP licence), paid search, link building, a blog.
- Rewriting the machine translations: what-if pages in the 19 other languages use the same drafts (see Risks).

## Design

**URLs.** `/lab/solar/nosun` (English), `/es/lab/solar/nosun`, … The id is the sandbox's what-if id. Slugs are
short ids today (`nosun`, `sun2`); add an optional English `slug` per what-if (`the-sun-disappears`) so the URL
carries the words: `/lab/solar/the-sun-disappears`. Ids stay the key in code; slugs never change once shipped.

**Words per what-if** (the world's own code, through the catalogs, change 0025):
- `question` — "What if the Sun disappeared?" (title, `<h1>`). Today's labels are imperatives ("The Sun
  disappears"); each what-if gets a question form, and `npm run i18n:extract` + the 19 catalogs get them.
- `why` (optional, one or two sentences) — what the model does, from the world's README model notes.

**The answer is computed, not written.** A build-time step (`lib/seo/answer.ts`, framework-free) uses the
existing deterministic replay (`lib/export/`): run the default world to a fork time, apply the what-if, run
both worlds to a horizon, then read:
- the metrics from `read()` at a few times → "After 10 years: Earth 2.1 AU from the Sun (no change: 1.0 AU)";
- the timeline events where the worlds differ (`eventText`) → "What happens, step by step";
- a still of the changed world and one of the unchanged world (export stills) → the page picture + `og:image`.
The first sentence under the `<h1>` is the answer (search engines and AI answers quote the top of a page).
Numbers are formatted with each world's formatters in the page's language. Same seed ⇒ same page every build.

**Page layout** (control-room-ui skill; a document page like About, scrolls — it is not a console):
`<h1>` question → answer line → picture (no change | with the what-if) → a "Run this what-if" primary button
(→ `/lab/<world>#whatif=<id>`) → metric table (before / after) → step-by-step events → the model note and the
standing disclaimer ("A model, not a forecast", change 0028) → related what-ifs of the same world → other worlds.
Ads (ADR 0007): one 300×250 slot after the steps, never next to the picture or button; none for Premium.

**World pages** keep their layout; the intro's what-if list becomes links to the what-if pages (crawlable
internal links), and the PageIntro text stays.

**Files:**
- `app/(en)/lab/[world]/[whatif]/page.tsx`, `app/[lang]/lab/[world]/[whatif]/page.tsx` (`generateStaticParams`).
- `components/pages/WhatIfPage.tsx` (+ CSS in `globals.css`), `components/shell/pageCopy.ts` (titles, links).
- `lib/seo/answer.ts` (replay → answer data), `lib/seo/jsonld.ts` (schema builders), `lib/i18n/seo.ts`
  (`og:image`, `twitter`, `lastmod`).
- `scripts/og-images.ts` (prebuild: writes `public/og/<world>/<whatif>.png` with `@napi-rs/canvas` — a
  **new dev dependency**, build time only; Next's `opengraph-image` can't draw our canvas sims).
- `scripts/indexnow.ts` + `public/<key>.txt`; `package.json` `postbuild` runs it only when `VERCEL_ENV=production`.
- `app/manifest.ts`, `public/apple-touch-icon.png`.
- Each `worlds/<key>/sim.ts`: `question` (+ optional `slug`, `why`) per what-if; `worlds/<key>/locales/*.json`.
- The lab: read `#whatif=` once on load in the world console's engine hook and apply after the baseline.
- `app/sitemap.ts`, `tests/seo-*.test.ts`.

## Steps

1. **Fixes on what exists:** titles/descriptions with search words (20 languages), `summary_large_image`,
   `WebSite`/`Organization`/`WebApplication`/`BreadcrumbList` JSON-LD, manifest + touch icon, sitemap `lastmod`.
   You: set `www.whatif.science` as primary and 308-redirect the bare domain in Vercel → Domains.
2. **Preview images** for home and the 7 worlds (prebuild script, new dev dependency).
3. **`#whatif=` deep link** in the lab (every world; test that it gives the same state as clicking the what-if).
4. **What-if questions** in every world's code + catalogs (20 languages, machine drafts like 0025).
5. **Answer engine** (`lib/seo/answer.ts`) + tests: every what-if gives finite numbers and the same text twice.
6. **What-if pages** in English, sitemap, OG images, JSON-LD; world intros link to them.
7. **The other 19 languages** of the what-if pages (same pages, translated words, hreflang).
8. **IndexNow** script + key; you: add the site to Bing Webmaster Tools (import from Search Console), Yandex
   Webmaster and Naver Search Advisor; submit the sitemap in each and in Google Search Console.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| 2,160 machine-translated pages look like low-quality bulk content | Each page has real, distinct numbers and pictures from its own run, not templated filler. Ship English first (step 6), watch Search Console for a few weeks, then languages (step 7). A language can be held back with `noindex` (`READY` in `locales.ts`) per page type. |
| A computed "answer" reads like a prediction | The disclaimer and model note sit on every page; wording says "in this model". |
| Build time grows (108 replays + 216 images, × languages for text) | Replays and images are per what-if, not per language (only words differ); cache in `.next`. Measure in step 5 and cap horizons. |
| Ugly or meaningless numbers for some what-ifs (e.g. child styles, "Build my own future") | Each world picks which metrics and horizon its pages show (`seo` block in sim.ts); a what-if can opt out of a page (`page: false`). |
| `@napi-rs/canvas` draws differently from browsers (fonts) | Load the same Barlow/JetBrains files; a snapshot test per world. Fallback: a static branded image per world. |
| Slugs or ids change later and break ranked URLs | Slugs are frozen once shipped; a test lists them. |
| IndexNow script fails the build | It runs after the build, logs and never fails; only on production. |

## Verification

- [x] Automated: every what-if has a page in every ready language, a unique title, a finite answer, an
      og:image file, valid JSON-LD (parsed), sitemap entry; deep link = same state as clicking; determinism.
- [ ] Manual: what-if pages at 375 / 768 / 1280 / 1600 px, light + dark, Arabic right to left; "Run this
      what-if" opens the lab with it applied; share a link in WhatsApp/X preview debuggers.
- [ ] Google Rich Results Test and Schema validator on home, a world, a what-if; Lighthouse SEO ≥ 95.
- [ ] Live: Search Console and Bing show the sitemap read; URL inspection of one what-if page.
- [ ] Docs: seo-and-growth feature doc updated, PLAN.md Phase 2 boxes ticked.

## Log

- 2026-11-10 — proposed, after an audit of the live site and current search guidance.
- 2026-11-10 — approved; in progress.
- 2026-11-10 — step 1 done (code part). Search titles and descriptions: `Sandbox.seo` {title, description} in each world's
  `sim.ts` (extracted as `meta.seoTitle` / `meta.seoDescription`), `common.site.title` / `common.site.searchDescription`
  for home; `PageCopy.searchTitle` / `searchDescription` feed `<head>` only (the visible `<h1>` and intro are unchanged).
  All 19 other languages drafted (machine translation, like 0025; some ru/uk/pl/tr/th descriptions run 170–190 chars,
  cut by search results, acceptable). JSON-LD (`lib/seo/jsonld.ts`): `WebSite` + `Organization` on home, `WebApplication`
  (free, `EducationalApplication`) + `BreadcrumbList` on worlds, rendered in `PageIntro`. `app/manifest.ts`. Sitemap
  `lastmod` = the build's date. The shared share card (`public/og.png`, `summary_large_image`) and `apple-touch-icon.png`
  came from a parallel session (`scripts/brand-images.mjs`), so step 2 now only adds per-world images. Tests in
  `tests/i18n-seo.test.ts`. Checked: typecheck, 1,461 tests, a production build (copy, origin www.whatif.science):
  titles/descriptions/og:image/JSON-LD/manifest in en, de, ja, ar pages; `/lab/solar` in the dev server, no console
  errors. Not done: the www/apex redirect (Vercel dashboard, the user's), Rich Results Test on the live site after deploy.
- 2026-11-10 — step 2 done. `public/og/<world>.png` (1200×630, ~1.1 MB for all 7): each world's stage drawn by its own
  `draw()` after a short default run (`SHOT_T`; person with "exercise" applied so its 100 faces differ; galaxy at
  12.5 = mid-collision, tidal tails), plus the site mark and name in a pill. No other words, so one image serves all 20
  languages; `og:image:alt` is the page's translated search title. Diverged from the plan: the images are drawn by
  `npm run og:images` (`OG_WRITE=1 vitest run tests/og-images.test.ts`, the same pattern as `i18n:extract`) and committed,
  not by a prebuild script, so Vercel builds need no native canvas or font download; without the flag the test checks
  every world has a 1200×630 image. Shims `document.createElement` and `OffscreenCanvas` for stages that build offscreen
  layers; fonts (Barlow, Barlow Semi Condensed, JetBrains Mono, OFL) are fetched once from the Google Fonts repository
  into `node_modules/.cache/og-fonts`. New dev dependency `@napi-rs/canvas` 1.0.13 (exact; 1.1.0 was 11 days old).
  `pageMetadata` takes an optional `image`; home keeps `/og.png`. Redraw when a world's stage changes. Checked:
  typecheck, all tests, a production build (og:image per world in en and ko), the seven images by eye.
- 2026-11-10 — step 3 done. `lib/sim/deeplink.ts`: `whatifFromHash` (reads `whatif` from a `key=value&…` hash, only ids
  of the world's what-if buttons, so solar's stage-drag `throw` is not linkable), `whatifHash`, `DEEPLINK_BASELINE_S` =
  1.5 s. `useWorldEngine` (components/console/engines.ts) opens it: a world already running in the tab starts clean
  (the plain `SimEngine.reset`, so analytics records no Reset), runs 1.5 s, then `engine.change(id)` as the button does,
  and the hash is dropped. Beyond the plan: it also listens for `hashchange`, so a link pasted into an open lab works.
  What-if settings (galaxy's live controls, child's age) keep their defaults. `tests/deeplink.test.ts`: hash parsing,
  and for every world × what-if the link gives the same worlds as a click on a fresh lab (deep-equal). Checked:
  typecheck, all tests, a production build, and in the dev server solar `nosun`, earth `zero`, a pasted `sun2` over an
  open change, and an unknown id (ignored).
- 2026-11-10 — step 4 done. `Sandbox.questions?: Record<id, {q, slug}>` (`lib/sim/types.ts`), said as
  `question.<id>` (`sandboxEnglish`). 107 questions in the 7 worlds' `sim.ts`; earth's "Build my own future" (`mix`) has
  no page, since it is the visitor's own settings (so 107 pages per language, not 108). Slugs are English URL words for
  every language and frozen in `tests/what-if-slugs.json`: `tests/questions.test.ts` fails on a renamed or removed slug
  (`SLUGS_WRITE=1` adds new ones), and checks every what-if has a question or is on the no-page list, the "What if …?"
  form, ≤ 70 characters, unique questions and slugs. The 19 other languages are machine drafts like 0025. `why` is
  left for step 6, where the page needs it.
- 2026-11-10 — step 5 done. `lib/seo/answer.ts` (framework-free): `computeAnswer(sb, id)` runs the default world from
  the default seed to the fork (default: the `#whatif=` link's 1.5 s at the default speed, so the page and its "Run this
  what-if" button tell the same story), makes the what-if as its button does, runs both worlds with one fixed step and
  reads them at the world's chosen times. Data only (numbers + log entries), so one run serves all 20 languages;
  `answerWords(sb, a)` says it with the world's formatters and `eventText`. Instead of the export `Replay` (built to
  re-run a live engine's capture), it steps the sandbox directly with whole steps from the start; same idea, simpler.
  Per world, `Sandbox.answer` (`lib/sim/types.ts` `AnswerSetup`): `at` (times read, last = horizon), optional `fork`,
  `metrics`, `key` (which metrics the first sentence may name) and `keyBy` ("abs" for child's counts of 120; relative
  picked 0-vs-1 counts), `dt`. Horizons: galaxy 4 Gyr, solar 20 yr, earth 2100, country 2051, animals day 180, child age
  30, person 5 yr. Measured: 107 answers in ~27 s on one core (animals 12 s, galaxy 7.7 s; the rest ≤ 3.5 s); step 6
  computes each once per build, not per language. `tests/answer.test.ts`: every what-if reaches its times, finite
  numbers, a non-empty key metric, something that differs, ≤ 12 one-world lines in time order, no unfilled placeholder,
  and the first and last what-if of each world give the same answer and words again after the others ran. Checked:
  typecheck, all 1,716 tests, a production build. Seen in the numbers: country's headline is sometimes small (UBI: poor
  1 → 0 of 100 in the default country); animals' metric labels are slot names ("Animal 1"), so step 6 names the species.
- 2026-11-10 — step 6 done. 107 English what-if pages, `/lab/<world>/<slug>` (`app/(en)/lab/[world]/[whatif]/page.tsx`,
  `dynamicParams = false`; `components/pages/WhatIfPage.tsx`, a reading page on the About layout: crumbs, the question
  as `<h1>`, the answer line, two pictures, "Run this what-if" (→ `/lab/<world>#whatif=<id>`), the numbers per time,
  the steps marked only-with / only-without, a 300×250 slot (`PageAd`: none while `ADS_ON` is off or on a device with
  Premium, since these pages load no account provider), the model note, the disclaimer, the world's other what-ifs and
  the other worlds, the site footer). Answers are memoised per build process (`answerOf`); the page says the world's
  words inside `withPageT` (`lib/i18n/page.ts`), because an earlier page's I18nProvider in the same build worker can
  leave its language behind. Page words: `pages.whatif.*` in all 20 catalogs (machine drafts; only English is built).
  `lib/seo/whatifPages.ts`: paths, `WHATIF_PAGE_LOCALES = ["en"]` (step 7 adds the rest), `whatifHref` (null where not
  built). Head: title "<question> · What-If Lab", description = answer + call to try it, canonical, no hreflang or
  `og:alternateLocale` (`pageMetadata`/`sitemapEntries` take `locales`), `og:image` = the page's own picture. JSON-LD
  `whatifLd`: `WebPage` with `mainEntity` Question + acceptedAnswer (the visible answer line), `primaryImageOfPage`,
  `BreadcrumbList` home → world → question. Sitemap: +107 URLs (English only). World intros: a what-if with a page is
  listed as its question and linked (English pages; other languages keep the plain labels until step 7).
  Pictures: `npm run og:images` also draws `public/og/<world>/<slug>.jpg` (changed world, `isAlt`, with `base` for
  country's comparisons) and `public/og/<world>/no-change.jpg`, 1200×630 JPEG q82, 7.8 MB for all of `public/og`; each
  from freshly loaded modules, since stages keep draw-only memory between frames (child showed the previous picture's
  caption). New `AnswerSetup.shot` (picture time, default the horizon): solar 1 yr (planets leave the frame by 20 yr),
  galaxy 1 Gyr (both runs look merged at 4 Gyr). New optional `Sandbox.metricName(w, k)`: animals names slots by
  species ("Gray wolves"); its pages show the counts and food, not the per-slot traits. `why` was not added: the world's
  intro is the model note for now. Tests: `tests/seo-whatif.test.ts` (every page: question, computed answer line,
  title, canonical, own image, no foreign hreflang, JSON-LD repeats the visible words; sitemap; intro links; species
  names), `tests/og-images.test.ts` (every picture exists at 1200×630, no slug is `no-change`), `tests/i18n-seo.test.ts`
  updated. `tests/i18n-events.test.ts` child language test given 30 s (two full runs; it passed in ~4 s alone but timed
  out at 5 s beside the new answer tests). Checked: typecheck, all 1,841 tests, a production build (27 s, 107 pages
  under `/lab/[world]/[whatif]`), and in the dev server: solar, animals (375 px wide, no sideways scroll) and earth,
  whose button opened the lab with "Stop all emissions now" made at 2034. Seen: times read "by 20 yr" / "by Day 180"
  (the worlds' own `fmtT`); earth's intro is a scene description, not a model note — a per-world `why` would read better.
- 2026-11-10 — step 7 done. `WHATIF_PAGE_LOCALES` = every ready language (`READY_LOCALES()`; filter one out there to hold
  its what-if pages back). New route `app/[lang]/lab/[world]/[whatif]/page.tsx` (`/<lang>/lab/<world>/<slug>`, the
  English slug in every language, `dynamicParams = false`); the page component was already per language. With more than
  one locale, `pageMetadata` and `sitemapEntries` now give each page hreflang to all 20 + `x-default` (English) and
  `og:locale:alternate`; JSON-LD `inLanguage` and breadcrumbs follow the page's language. World intros in every language
  link their what-ifs as questions. Answers stay one run per what-if per build (`answerOf`); pictures are word-free, so
  all languages share `public/og/<world>/<slug>.jpg`. Tests: `tests/seo-whatif.test.ts` (sitemap: every page once per
  language with 21 alternates; intro links in every language; English head now with hreflang) and new
  `tests/seo-whatif-langs.test.ts` (per language × world: words differ from English, nothing unsaid, related links and
  canonical in the language, `og:locale`). Both yield between tests (`afterEach` timeout 0): ~75 s of synchronous tests
  in one file starved vitest's worker RPC ("Timeout calling onTaskUpdate"). Checked: typecheck, all 1,977 tests, a
  production build (2,386 pages, 2,140 under the two what-if routes; sitemap 2,360 URLs; `out/` 523 MB, of which the new
  pages ~265 MB raw — each non-English page is ~77 KB HTML (~19 KB gzipped) + ~54 KB RSC payload, mostly the page
  catalogs, like the existing localized world pages), and `/ar/lab/solar/earth-in-mars-orbit` in the dev server (right
  to left, Arabic words, shared pictures). Seen: in Arabic the answer line's "−33 °C" reads with the sign after the
  number (bidi), as elsewhere in the Arabic UI. This goes against the plan's own risk note ("ship English first, watch
  Search Console for a few weeks"): the user asked for step 7 now; holding back a language is the one-line filter above.
- 2026-11-10 — step 8 done (code part). IndexNow: key `public/c7d0121f3a7ed6a662fc5cfe60f8ce41.txt` (public by design;
  engines check it on the host), `scripts/indexnow.mjs` (plain Node, no dependency) runs as npm `postbuild`: only when
  `VERCEL_ENV=production` (or `npm run indexnow -- --force`), reads `out/sitemap.xml`, POSTs every page URL on its host to
  `api.indexnow.org` (≤ 10,000 per request; shared with Bing, Yandex, Naver, Seznam, Yep), skips localhost and
  `*.vercel.app`, logs the status and never fails the build. Diverged from the plan: `.mjs`, not `.ts` (runs with plain
  Node on Vercel). Known limit: postbuild runs before the new deployment is live, so on the very first deploy the key
  file is not served yet and the engines may answer 403 once; every later deploy has it. It sends every URL each deploy
  (lastmod is the build date for all pages), which IndexNow accepts. Tests: `tests/indexnow.test.ts` (key file, sitemap
  parsing, one host, batching). Left for you: Bing Webmaster Tools (import from Search Console), Yandex Webmaster, Naver
  Search Advisor, and submit the sitemap there and in Google Search Console; the www/apex redirect from step 1.
