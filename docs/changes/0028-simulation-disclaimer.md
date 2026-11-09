# 0028 — "A model, not a forecast": first-open disclaimer and a standing label

- **Status:** shipped
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [simulation-disclaimer](../features/simulation-disclaimer.md) (new, planned)
- **Decisions:** —
- **Created:** 2026-11-09 · **Shipped:** 2026-11-09

## Why

Every world (climate, countries, a child's personality, a habit) shows numbers that look like predictions. They are
rule-based toys built on published theories with rounded data, not forecasts about real people, places or futures.
Visitors — and search traffic landing straight on a world — should know that before they read a chart as fact, and it
protects the site if a screenshot travels without context. The goal is honesty without friction: one short message on
first open, then a small label that is always there.

## Scope

**In:**
- A first-open disclaimer dialog, once per browser, on any page (scale or world), after the boot scene has gone.
- A small, highlighted standing label in the top bar on every page: **"Simulation · not real"** that reopens the same
  dialog when clicked.
- All words in the shell catalog (`shell.disclaimer.*`), translated in all 20 locales (machine drafts, like the rest).

**Out:**
- Per-world disclaimers or per-world wording (one shared message for now; a world could add its own later).
- Disclaimer text inside exports (videos, slides, stills). Worth a follow-up; exports must not change sim behaviour
  anyway, and a footer line is a separate export-studio decision.
- A terms-of-use / legal page. The privacy page in 0027 is where a fuller "about the models" note could live later.
- Any "I agree" consent tracking — this is informational, not a legal acceptance; nothing is stored except "seen".

## Design

**Words (English source, `lib/i18n/locales/en/shell.json` → `disclaimer`):**
- `label`: "Simulation · not real"
- `labelAria`: "About these simulations: not real data. Open the note"
- `title`: "Just a simulation"
- `body`: "Everything here is a model built from scientific theories and rounded numbers. The results are not real data and
  not predictions about real people, places or the future."
- `use`: "Use it to play, explore and see how things might turn out if…"
- `ok`: "Got it"

**Dialog** (`components/shell/Disclaimer.tsx`, new): a native `<dialog>` opened with `showModal()` — focus trap, Escape
and backdrop close for free. Control Room modal: 78 % stage scrim, raised surface, 6 px radius, track-coloured edge,
Barlow Semi Condensed title, Barlow body, one filled signal button "Got it". Max width ~420 px, 16 px gutters on phones.
Appears ~400 ms after `data-booted` (same wait the theme tip uses), so it never covers the boot scene. Closing in any
way writes `localStorage["disclaimerSeen"] = "1"` (try/catch like `ThemeToggle`'s store). No storage ⇒ shows each visit,
which is acceptable.

**Order with the other first-visit hints:** the disclaimer comes first; the theme tip waits until it is closed (the tip
already waits for a condition — it will also wait for `disclaimerSeen`). The language hint is inline text, not a popup,
so it is unaffected. When 0027's Google consent banner ships, the disclaimer waits for that banner to be dismissed — noted
in 0027's open questions, not built here.

**Standing label** (`DisclaimerChip` in the same file, placed in `Lab.tsx`'s `.nav-end` before `LangMenu`): a small
button with an info glyph and the label text in `--t-micro`, coloured `--alt` (amber, the "this is the changed/what-if
world" colour — reads as "caution, hypothetical") with a 1 px amber edge, 4 px control radius. On phones (< 768 px) the
text collapses to the info glyph only, keeping the 44 px tap target; the aria-label always carries the full sentence.
Clicking it opens the dialog. Static pre-render (`PageIntro`) also gets the one-line `body` so crawlers and no-JS readers
see it.

> Colour check against DESIGN.md: `--alt` is reserved for the what-if world on stage/charts. Approved as amber
> (2026-11-09); fallback if that ever reads wrong: `--label-2` text with a `--signal` edge.

**Files:** `components/shell/Disclaimer.tsx` (new; reuses `components/ui/Dialog`), `components/shell/disclaimerRule.ts`
(new, pure show-once rule), `components/shell/Lab.tsx`, `components/shell/ThemeToggle.tsx`
(wait for disclaimer), `components/shell/PageIntro.tsx`, `app/globals.css` (`.disclaimer`, `.disclaimer-chip`),
`components/shell/pageCopy.ts`, `lib/i18n/locales/*/shell.json` (20 files), `tests/disclaimer.test.ts`, `docs/features/simulation-disclaimer.md`.

## Steps

1. English keys + `Disclaimer.tsx` (dialog + chip) + CSS; wire into `Lab.tsx`; theme tip waits for it.
2. Translate `shell.disclaimer.*` into the 19 other locales; `tests/i18n-catalogs.test.ts` green.
3. `PageIntro` line for static HTML; a unit test for the "show once" rule (storage seen / unseen / throwing).
4. Feature doc, this doc → shipped, PLAN.md.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A popup on first open costs bounce on search landings | One short paragraph, one button, Escape/backdrop close; shown after boot, never twice |
| Stacks with the theme tip and (later) the consent banner | Fixed order: consent → disclaimer → theme tip |
| Nav gets crowded on phones | Chip is icon-only < 768 px |
| Long translations overflow the chip | Chip text `white-space: nowrap` with ellipsis; full text in aria-label/title |
| Amber clashes with the what-if colour meaning | Flagged above; fallback colour ready |

## Verification

- [x] Automated: i18n catalog test passes for all 20 locales; show-once test (`tests/disclaimer.test.ts`); full
  `npm run typecheck && npm test` green.
- [x] `npm run build` — passed on a copy of the tree (another session's dev server was using this folder).
- [x] Manual: fresh storage → boot → dialog → Got it → theme tip appears → reload: no dialog; chip reopens it (800 px
  scale page); 375 px Earth (icon-only chip, bottom sheet); 1280 px Arabic in light theme (RTL, amber `#8f5400`).
- [ ] Manual not checked: 768 and 1600 px, `?pseudo`.
- [x] Docs: feature doc live. No PLAN.md item covers this.

## Log

- 2026-11-09 — proposed.
- 2026-11-09 — approved (amber label) and shipped; build passes.
