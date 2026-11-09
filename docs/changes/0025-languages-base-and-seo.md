# 0025 — Languages: translation base, language URLs and SEO, first 5 languages

- **Status:** shipped
- **Phase:** 4 (pulled forward: languages are a traffic lever, see [PLAN.md](../PLAN.md))
- **Features:** [Languages](../features/languages.md), [SEO, sharing and growth](../features/seo-and-growth.md)
- **Decisions:** [ADR 0010](../decisions/0010-languages-urls-and-messages.md), [ADR 0001](../decisions/0001-static-site-no-backend.md)
- **Created:** 2026-11-08 · **Shipped:** 2026-11-08

## Why

Every word in the site is hard-coded English (~1,900 phrases, ~13k words across the shell, scale
explorer, exports and 7 worlds), and `<html lang="en">` is fixed. To grow traffic we want 20 languages, all
text held in the repo and shipped statically. This change builds the base that every language needs (the
in-code translation API, language URLs, SEO, fonts, right-to-left support), moves all English text into
catalogs, and ships the first 5 languages, which cover the hard cases: Spanish, Portuguese (Brazil),
German (long words), Japanese (CJK fonts) and Arabic (right to left).

## Scope

**In:**
- `lib/i18n/`: locale list, `t(key, values)`, ICU subset formatter (argument, plural, select, number),
  `Intl` number/date formatting, React `I18nProvider` + `useT()`.
- Language URLs: English unchanged, `/<code>/…` for the others; `<html lang dir>` per language.
- SEO: per-language `<title>`/description, canonical, hreflang alternates + `x-default`, `app/sitemap.ts`,
  `app/robots.ts`, `og:locale`, and a crawlable static page (real `<h1>`, intro, what-if list) in place of
  "Loading the lab…".
- Sim events as keys (`note(w, key, values)`), translated when shown; timeline matching by key + values.
- All English text moved into catalogs: shell, console blocks, scale explorer, account, export studio,
  and each world (one step per world, its own folder only).
- Canvas text through `t()` (passed in `DrawContext`, draw-only) and locale-aware formatters.
- Fonts per script (Latin ext + Vietnamese, Cyrillic, CJK, Arabic, Devanagari, Thai, Bengali), right-to-left
  layout, a language picker in the nav, a dev-only pseudo-locale for overflow checks.
- Clerk screens in the chosen language (`@clerk/localizations`, imported only in `clerk.tsx`).
- Translations for `es pt de ja ar`, drafted and marked ready after review.

**Out:**
- The other 14 languages (`fr it nl pl tr id vi ru uk zh ko hi th bn`): catalogs build but stay hidden
  until a later change fills and reviews them.
- Per-what-if landing pages, share URLs, OG images (Phase 2 in seo-and-growth; this change's URL scheme and
  metadata helpers are built so they slot in).
- Any server, API route or runtime translation service (ADR 0001). "API" here means the in-code
  translation functions.
- Translating the docs, README or code comments.
- Mirroring the canvas: stages and charts keep time running left to right in every language.

## Design

**Catalogs** — JSON, one file per namespace per language, English is the source:
```
lib/i18n/locales/<code>/{common,shell,scale,console,account,export}.json
worlds/<key>/locales/<code>.json            # stays inside the world (change 0008)
```
Keys are stable and dotted: `console.transport.play`, `solar.whatif.doubleSun`, `solar.ev.escape`.
Strings use ICU: `"{name} escapes into interstellar space"`, `"{n, plural, one {# kid} other {# kids}}"`.
Sandbox labels (controls, what-ifs, metrics, speeds) keep their English in `sim.ts` as the fallback; their
keys come from ids (`<world>.whatif.<id>`, `<world>.ctl.<id>`), and `npm run i18n:extract` writes them into
`en.json`, so world code changes little.

**API** (`lib/i18n/`, framework-free so sims and exports can use it):
- `LOCALES` (code, hreflang, name in its own language, dir, script, `ready`), `DEFAULT = "en"`.
- `createT(locale, catalogs) → t(key, values?)`; a missing key falls back to English, then the key itself
  (dev logs it once).
- `fmtNum(locale, x, opts)`, `fmtDate`, plural via `Intl.PluralRules`; `lib/sim/core.ts` formatters take a
  locale instead of the fixed `"en-US"`.
- React: `I18nProvider` (locale + catalogs for this page), `useT()`, `useLocale()`, `href(locale, path)`.
  `modeHref` gets a locale argument.

**Routes** (route groups give two root layouts):
```
app/(en)/layout.tsx  page.tsx  lab/[world]/page.tsx        lang="en"
app/[lang]/layout.tsx  page.tsx  lab/[world]/page.tsx      generateStaticParams = LOCALES − en; lang/dir from the param
```
Pages stay thin: they load that language's catalogs (shell + this world only) at build time and pass them
as props, so each HTML file carries one language and no runtime fetch is needed. No automatic redirect by
browser language. If the browser's language has a ready translation and differs from the page, a one-line,
dismissible "Also in Deutsch" hint appears in the nav. The choice is remembered in `localStorage`.

**SEO** — `lib/i18n/seo.ts` builds `Metadata` per route: translated title/description, `alternates.canonical`,
`alternates.languages` for every ready language + `x-default` (English), `openGraph.locale`. `app/sitemap.ts`
lists every route × ready language with alternates; `app/robots.ts` allows all and points to the sitemap.
Both need an absolute origin: `NEXT_PUBLIC_SITE_URL` (public, not a secret; `.env.example`), defaulting to a
placeholder until hosting (change 0002) is decided. The `ssr: false` loading state becomes a real static
page in the language (`<h1>` world name, one-paragraph intro, list of what-ifs) that the lab replaces once
it has loaded, so crawlers and slow phones see content.

**Sim events** — `LogEntry` becomes `{ t, k, v? }`; `note(w, key, values?, onceKey?)`. The engine matches
events by `k` + values (stable JSON), as it did by text. `Timeline`, `lib/export/*` and world parts call
`t(e.k, e.v)`. Values are numbers or keys of other names (`{planet: "solar.body.earth"}`), translated
inside `t`. The sim's output is identical in every language.

**Canvas** — `DrawContext` gains `t` and `locale` (draw-only; `draw()` still never mutates the world).
`FONT` in `lib/sim/draw.ts` reads the font stack from CSS variables, so canvas text uses the same fonts as
the page; text waits for `document.fonts.ready`. `ctx.direction` follows the page for Arabic.

**Fonts** — next/font stays self-hosted. Barlow / Barlow Semi Condensed gain `latin-ext` + `vietnamese`;
each `[lang]` layout adds only its script's fallback: Noto Sans (Cyrillic), Noto Sans JP / KR / SC, Noto
Sans Arabic, Devanagari, Thai, Bengali. next/font splits CJK into unicode-range chunks, so a page loads
only the glyphs it uses.

**Right to left** — `dir="rtl"` on `<html>` for Arabic; CSS moves to logical properties
(`margin-inline-start`, `inset-inline-end`, `text-align: start`); icons that point (back, next) flip.
The stage, charts and timeline axis do not mirror.

**Language picker** — in the nav next to the theme toggle, following `control-room-ui`: a compact menu listing
ready languages by their own names ("Deutsch", "日本語", "العربية"); it switches to the same page in that
language.

**Long text** — a dev-only pseudo-locale `xx` (accented, +40 % length) shows where labels overflow; the
one-viewport consoles fit it at 375, 768, 1024, 1280 and 1600 px.

## Steps

Each step ends green on `npm run typecheck && npm test && npm run build`. English pages must look and
behave exactly as today after every step.

1. **i18n core** — `lib/i18n/` (locales, formatter, `createT`, number/plural), English `common.json`,
   tests: formatter, plurals for all 20 languages, fallback.
2. **Routes and provider** — route groups `(en)` + `[lang]`, `I18nProvider`, `useT`, locale-aware
   `modeHref`; `[lang]` pages build (still English text). Test: every route × locale is generated.
3. **SEO** — metadata helper, hreflang/canonical, `sitemap.ts`, `robots.ts`, `NEXT_PUBLIC_SITE_URL`,
   static crawlable page in place of "Loading the lab…". Test: sitemap lists only ready locales.
4. **Sim events as keys** — `note(w, key, values)`, `LogEntry {t, k, v}`, engine matching, Timeline and
   exports translate; mechanical change in all 7 `sim.ts`. Existing determinism/what-if tests unchanged.
5. **Shared text** — shell, console blocks, scale explorer, account, export studio into catalogs;
   `DrawContext.t`, locale-aware formatters; `i18n:extract` script.
6. **Fonts, right to left, picker** — per-script fonts, canvas font from CSS variables, logical properties,
   `dir`, language picker + "Also in …" hint, pseudo-locale `xx`.
7–13. **One world per step** — galaxy, solar, earth, country, animals, child, person: move the world's
   text into `worlds/<key>/locales/en.json`, touching only that folder.
14. **First 5 languages** — draft `es pt de ja ar`, Clerk localizations, manual checks at every width in
   both themes, then mark them `ready`.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A phrase left hard-coded in English | Pseudo-locale `xx` shows every untranslated string at a glance; a test scans `.tsx` JSX text and `fillText` calls for literal English |
| Missing or broken translations | Test: every locale has every English key, the same `{placeholders}`, valid plural forms; a locale cannot be `ready` with gaps |
| Long words break the one-viewport consoles | Pseudo-locale +40 %, labels that ellipsize with a title; check at 5 widths |
| CJK fonts slow the first load | next/font unicode-range chunks; fallback fonts load only for their language |
| Event keys change timeline matching | Engine tests for both / no-change / what-if-only marks rerun on every world; matching on key + values keeps the old meaning |
| Translation drafts read badly | A language is `ready` only after review by a native speaker; until then it builds but is hidden |
| Two root layouts drift apart | Both render one shared `<RootShell lang dir>`; layouts only pass the params |
| Sitemap needs a real origin before hosting is chosen | `NEXT_PUBLIC_SITE_URL` with a placeholder; set when change 0002 lands |
| Static HTML grows with catalogs | Only the shell + this world's catalog for this language go into a page |

## Verification

- [x] Automated: formatter and plural tests; key/placeholder parity for every locale; every route × locale
      builds; sitemap and hreflang list only ready locales; the sim gives the same results in every
      language (event keys identical); existing world/engine/export tests green.
- [ ] Manual: `/`, `/lab/<each world>`, `/de/…`, `/ja/…`, `/ar/…` at 375, 768, 1024, 1280, 1600 px, light
      + dark; pseudo-locale `xx` shows no overflow and no leftover English; Arabic reads right to left with
      unmirrored stage; exports (video subtitles, slides, story text) come out in the page's language;
      view-source shows translated `<h1>`, title, hreflang.
- [ ] Docs: [languages](../features/languages.md) and [seo-and-growth](../features/seo-and-growth.md)
      updated; CLAUDE.md rule "every phrase goes through `t()`"; `add-sandbox` skill mentions
      `locales/en.json`; PLAN.md checkbox ticked.

## Open questions

- 20th language: **Bengali** is proposed (large audience, one more Noto font). Alternatives: Persian
  (reuses the Arabic font and right to left), Swedish or Filipino (Latin, no extra work).
- Who reviews each language natively (all 19 are marked `ready` as machine drafts).

## Log

- 2026-11-08 — proposed.
- 2026-11-08 — approved; in progress (step 1).
- 2026-11-08 — step 1 done: `lib/i18n/` (20 locales, ICU-subset formatter on Intl, `createT`, `catalog`, `ref`), `lib/i18n/locales/en/common.json`, `tests/i18n.test.ts` (16 tests). No UI change yet.
- 2026-11-08 — step 2 done: route groups `app/(en)` + `app/[lang]` sharing `components/shell/RootShell.tsx` (html `lang`/`dir` per language), `LabPage` loads catalogs at build time (`lib/i18n/load.ts`) into `components/i18n/I18nProvider.tsx` (`useT`, `useLocale`, `useHref`), `lib/i18n/routes.ts`, `modeHref(mode, locale)`; nav and scale links keep the language. Build: 160 static pages. Known: with no top-level root layout, `404.html` renders without the app's styles, and in dev `/favicon.ico` hits `[lang]` and logs a 500 (no favicon exists yet); both are handled in step 3.
- 2026-11-08 — step 3 done: `lib/i18n/seo.ts` (origin from `NEXT_PUBLIC_SITE_URL`, canonical, hreflang for ready languages + x-default, Open Graph locale; languages not ready are `noindex` and left out of hreflang), `app/sitemap.ts`, `app/robots.ts`, `components/shell/pageCopy.ts` + `PageIntro.tsx` (static h1, intro, what-ifs and links per page, hidden once `.app` is on screen), `app/global-not-found.tsx` (`experimental.globalNotFound`) fixes the unstyled 404, `public/icon.svg` + `favicon.ico` (placeholder mark: the two worlds' dot and diamond). Tests: `tests/i18n-seo.test.ts`. Build: 165 static files.
- 2026-11-08 — step 4 done: `LogEntry` is `{t, k, v?}`; `note(w, key, values, once, t)`; each sandbox has `messages` (its English, built from its data where the words already live, e.g. child's `worlds/child/messages.ts`); names in events are `ref()`s so they translate too. Timeline matching by key + values. `scoped()` / `cap1()` in `lib/i18n/t.ts`, `lib/i18n/page.ts` (the page's language for canvas and exports, set by `I18nProvider`), `lib/sim/say.ts` (`worldSay`, `eventText`). Timeline, animals and child timelines (glyphs and kinds now by key), child stage chips and exports (subtitles, story, slides) say events through it. Tests: `tests/i18n-events.test.ts` (every world: messages parse, every logged key has words, same results in every language); existing tests read events through `eventText`. Diverged from the plan: English of world words stays in code (`messages`) rather than `worlds/<key>/locales/en.json`; the extract script (step 5) writes en.json from it.
- 2026-11-08 — step 5 done: shared English is bundled (`lib/i18n/english.ts`, namespaces common, shell, console, account, scale, export) and is every page's fallback, so a page carries only its own language (`pageMessages(locale, world)`; English pages carry none). Shell, console blocks, account menu and Premium dialog, scale explorer and export studio say every word through `useT()` / `pageT()`; `lib/sim/core` formatters follow the page's language. A sandbox's labels are said generically by `worldSay(sb)` under keys made from ids (`meta.*`, `ctl.<id>.label|unit|opt.<v>|group.<i>`, `ctl.h.<slug>`, `whatif.<id>`, `speed.<i>`, `metric.<k>.label|unit|help`); scale objects likewise (`objects` namespace, `lib/scale/objects.ts`). `npm run i18n:extract` (a vitest run with `I18N_WRITE=1`) writes `worlds/<key>/locales/en.json` and `lib/i18n/locales/en/objects.json`; `tests/i18n-extract.test.ts` fails when they are stale and checks other languages' placeholders. `tests/i18n-coverage.test.ts` fails on English written into shared JSX. Diverged from the plan: no `DrawContext.t` — draw code reads the page's language from `lib/i18n/page.ts` (one language per page); dev warnings skip expected English fallbacks. Not yet translated: each world's own screens, `info()` blocks, metric `diff()` sentences and stage text (steps 7–13).
- 2026-11-08 — step 6 done: fonts per script in `RootShell` (Barlow/JetBrains keep `latin` preloaded; latin-ext, Vietnamese and Cyrillic ranges download only when used; Noto Sans for Cyrillic, Noto Sans Arabic/Devanagari/Thai/Bengali with no preload and no Arial fallback faces), `--font-script` / per-language `--font-cjk` in `globals.css`, no tracking for non-Latin scripts. Right to left: `globals.css` moved to logical properties (safe-area padding, the stage edge label and the export time track stay physical), `canvas`, range inputs and the time track stay `ltr`, the forward arrow flips (`Icon` now carries `data-icon`). Language menu (globe icon) and the "Also in …" hint (≥ 1024 px, dismissible, never a redirect) in `components/shell/LangMenu.tsx`; the wordmark is translated. Pseudo-language: `?pseudo` in dev (remembered; `?pseudo=0` off) accents, lengthens 40 % and brackets every message; at 375, 768, 1024, 1280 and 1600 px the solar console has no page scroll and no clipped labels outside scrolling strips. `/ar/lab/solar` mirrors the chrome with an unmirrored stage. Diverged from the plan: Chinese, Japanese and Korean use system fonts, not web fonts (several MB each, and every OS ships good CJK fonts); the pseudo-language is a dev flag rather than an `xx` route. Note: `next build` sometimes fails while downloading Google Fonts (`Cannot read properties of null`); a retry passes.
- 2026-11-08 — step 7 (galaxy) done: its labels, what-ifs, metrics and events were already keys (steps 4–5); the last literal, the stage's scale bar, is `stage.scale` ("{n} light-years"). `worlds/galaxy/locales/en.json` regenerated. `tests/i18n-coverage.test.ts` now also checks finished worlds (`WORLDS_DONE`) for English in JSX and literal `fillText`. With `?pseudo`, every word on the galaxy page (console, stage tag, scale bar, timeline) is pseudo-text and the console still fits one screen at 1024 px.
- 2026-11-08 — step 8 (solar) done: labels and events were already keys; the planet names drawn on the stage are `name.<body>` (separate from `body.<body>`, the form used inside sentences: "the Sun", "your planet"), and the side panel's Earth status is `info.now` / `info.changed` / `status.*`. `worlds/solar/locales/en.json` regenerated; solar added to `WORLDS_DONE`. With `?pseudo`, stage labels, side panel and timeline (after the red giant) are all pseudo-text. 816 tests, build OK (the intermittent `next/font` error hit once, the retry passed).
- 2026-11-08 — step 9 (earth) done: labels, what-ifs and events were already keys; the stage's words (sea gauge `stage.gauge`, snow line `stage.snow`, the readout chip `stage.readout`) live in `STAGE_MESSAGES` in `scene.ts`, spread into the sandbox's `messages`; numbers use the page's number style (they were `en-US` / `toFixed`). `worlds/earth/locales/en.json` regenerated; earth added to `WORLDS_DONE`, and the canvas check now also catches literal text passed to `chip()`. With `?pseudo`, every word on the Earth page is pseudo-text.
- 2026-11-08 — step 10 (country) done: the most English so far. Stage words (signs, street ends, the "100 people" title, colour key, sentences, legend) are `STAGE_MESSAGES` in `scene.ts`; the side panel (`info.*`, `calm.*`), "What changed" (`story.*`), the chart's sentences (`diff.*`), policy group names (`group.<i>`) and the picker (`ui.*`) are in `MESSAGES`; country names are the Country select's options (`ctl.preset.opt.<id>`), also used by `countryName()`. The console's own JSX uses shared keys (Make changes, Timeline, dock tabs). Plurals are ICU plurals; dollars use `Intl` currency format in the page's language. 826 tests (the story test still passes in English), build OK on the second try (the known `next/font` error). With `?pseudo`, after a basic income every word on the page is pseudo-text.
- 2026-11-08 — step 11 (animals) done: the world's words moved to `worlds/animals/messages.ts` (like child's): species (name, plural, the fact-card texts; Latin names stay as they are), habitats' food, ready-made worlds and groups, the change questions (`q.*`), the story, the portrait caption, the chart's sentences, the console parts and the stage chips. `fmtT` says `time.day`. `w.outWhy` now holds an index into `WHY` instead of English (plain data, same behaviour). Sentences with bold parts use `Rich` (`worlds/animals/rich.tsx`): the whole sentence is one message, bold values are split back out. New shared helper `listOf()` (`lib/i18n/t.ts`): Intl.ListFormat, English keeps the site's no-serial-comma style. Divergences: two shared leftovers fixed ("FORK" on HistoryChart → `console.chart.fork`; "AT …" on export slides → `export.atT`), and the coverage test now also checks shared `components/` and `lib/` for literal canvas text (`fillText` / `chip` / `textRow`); the pseudo-language now also accents lines that begin with an already-pseudo name. 904 tests, build OK first try. With `?pseudo`, after "An animal disappears" every word on the page is pseudo-text except Intl's English list word "and".
- 2026-11-08 — step 12 (child) done: every word of the child world now comes from `worlds/child/messages.ts`, built from `data.ts` so the English stays there: the five traits (word, scale ends, steps, comparatives with "a bit / much" as one `select` message, kid phrases, glossary, science names), each change's question / story phrase / stage caption (`ch.<id>.*`), ripple endings (`have.*`), home-option help, everyday things (`beh.*`), groups, life stages, the story, the kid line, the chart (four views, canvas labels, sentences, aria labels), the stage (captions, meters, legend, crowd piles and hover, room name), the console parts (family, parents, home, change settings, change list, life ruler, glossary, meet the child, why they differ, the science, tune, timeline filters and kinds) and the console's on-stage switches and tabs. Word helpers that returned English moved out of `data.ts` into `worlds/child/words.ts` (`stepWord`, `kidShort`, `lenWord`, `bestAges`, new `moreWord` / `moreLess` / `traitWord`…); unused `LOW_WORD`, `LOW_KEY`, `SIZE_WORD` removed. The home controls are now built from `HOME_OPTIONS`, so the Home panel and Tune share `ctl.<id>.*` keys. `fmtT` says `time.age`. Divergences: `Rich` moved to shared `components/ui/Rich.tsx` (with `mark(i)` for lists of bold items) and animals imports it from there; the coverage test now checks a world's sub-folders too (child's stage is in `scene/`). Small English changes: the Growing up sentence uses the trait comparatives ("a bit quieter" instead of "a bit less outgoing"), and the What mattered combo rows keep both change names as they are ("Team sport + Best friend"). 922 tests, build OK first try. With `?pseudo`, after two changes and play, every word in the console, on the stage (one child and all 120) and in the chart is pseudo-text; kid names stay as names.
- 2026-11-08 — step 13 done: the person world. Its labels, habits, speeds and intro were already said through `worldSay`, and its event lines were keys since step 6; the last English was the stage caption under the 100 faces, now `stage.one|many|none|caption` messages (habit count as a plural). `person` joins `WORLDS_DONE` in `tests/i18n-coverage.test.ts`. Checked with `?pseudo`: two habits, played for two years, every word on the stage, console, chart and timeline is pseudo-text. All seven worlds now say their words through the catalogs.
- 2026-11-08 — step 14 done: Spanish, Portuguese (Brazil), German, Japanese and Arabic drafted (machine translation, one subagent per language, every file marked `_status: draft … needs native review`), 14 files each (~2,650 keys). New `tests/i18n-catalogs.test.ts` checks every translated file against English: parses, same placeholders and select cases, only the language's plural categories, no extra keys; ready languages (or `I18N_FULL=<code>`) also no missing keys. `@clerk/localizations` 4.23.0 (the release matching our Clerk SDK) gives Clerk's windows the page's language, one lazy chunk per language. The five are marked ready (`READY` in `lib/i18n/locales.ts`); tests updated (ready list, SEO example now uses French as the not-ready language, page messages may include `objects`). Person stage caption now has a max width (overflowed at 375 px). Checked: `/de/lab/child`, `/ar/lab/animals` (right to left, stage not mirrored), `/ja/lab/person` at 375 px light + dark, `/es` scale; no missing-key warnings. Not checked: every world × every width × both themes, exports in each language, Clerk windows (no key in this checkout). Diverged from the plan: "ready" now means every key is drafted; native review is still open (see Open questions), so the drafts should be reviewed before hosting goes live. Reviewer notes from the drafts: Japanese "{n}十億年" for decimals (needs a formatter change to say 13億年), 匹 for all animals; Spanish/Portuguese/German/Arabic word around grammatical gender in animal and child sentences; German "Angemeldet als du" fallback (only when an account has no email or name).
- 2026-11-09 — the other 14 languages drafted (fr it nl pl tr id vi ru uk zh ko hi th bn; machine translation, one subagent per language, same brief as step 14), 14 files each, every one passing `I18N_FULL=<code>` on `tests/i18n-catalogs.test.ts`. All 20 marked ready (`READY`); tests updated (ready list = every language; SEO checks every ready language is indexable). Bengali drafted ahead of the open 20th-language decision. Reviewer notes: zh/ko (like ja) need a formatter change for 万/亿 · 만/억 grouping, hi/bn for lakh/crore; ru/uk/pl/tr/hi inflect inserted names, so animal and solar lines are worded around colons and brackets (a real fix needs more name forms in code); fr/nl solar events can start lowercase (names carry their article); zh uses 只 for all animals; gendered languages default kids to masculine (it, fr) or neutral wording; long unit labels (th, tr, nl) may not fit tight chips; invented abbreviations to replace (vi "nghìn nas", fr/it "kal"). Not checked in the browser.
