# 0003 — "Darkroom" visual language: Apple structure, abstract editorial surface

- **Status:** shipped
- **Phase:** 1
- **Features:** [scale explorer](../features/scale-explorer.md), [fork and compare](../features/fork-and-compare.md)
- **Decisions:** [ADR 0005](../decisions/0005-darkroom-visual-language.md) (amends [ADR 0004](../decisions/0004-apple-design-language.md))
- **Relates to:** [change 0001](./0001-apple-ui-redesign.md) — replaces its step 1 (tokens/type) and step 6 palette values; 0001's layout steps stay.
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

ADR 0004 gives us Apple's *behaviour* (clarity, deference, depth, sheets, segmented controls, 44 px
targets). On its own that risks looking like a generic iOS settings screen. The reference supplied by
the user (ORYZO style reference: `DESIGN.md`, `tokens.json`, `variables.css`) adds the missing
*character*: a warm-dark "darkroom" where one object floats in the void and cream type is the only
decoration. That fits What-If Lab unusually well — the simulation **is** the lone object on the
stage, and the fork is the one memorable moment. Goal: a site that feels premium and distinctive
enough to be shared (PLAN.md → traffic) without adding chrome.

## The blend in one table

| Layer | Taken from Apple (ADR 0004) | Taken from the reference | Our abstraction |
| --- | --- | --- | --- |
| Structure | Nav bar, inspector, bottom sheet, segmented controls, transport pill, 44 px targets, keyboard | Full-bleed stage, no cards-in-cards, 4-item nav max | Stage is "the object"; everything else is a label around it |
| Colour | Semantic tokens, contrast rules | Walnut `#100904` canvas, cream `#FFEDD7` ink, bark `#382416` lift, cork `#40372E` hairlines, ember `#DC5000` | Cool `--base` vs warm `--alt` = *reality* vs *what-if* |
| Depth | Materials for floating chrome | No shadows; two-step surface stack | Translucent walnut material, never a drop shadow |
| Type | System/Inter, tabular numbers, scale | Uppercase 500 labels; mixed-case 400 for description; 0.9 line-height display | Two voices: **LABEL** (what it is) and *description* (what it means) |
| Icons | Unambiguous, paired with text | No icon set — typographic identity | A small geometric line-glyph set (see Icons) |
| Motion | Ease/spring tokens, reduced-motion | Calm, static | Fork split stays the only "big" motion |

## Scope

**In:**
- Token rewrite in `app/globals.css` (colour, type, radius, space, motion) — dark "darkroom" default,
  plus a derived light "paper" theme (decision needed, see Open questions).
- Typography: self-hosted **Inter** variable (substitute named by the reference for Halyard; Halyard is a
  commercial Adobe font we can't ship) via `next/font` (build-time, no runtime Google request), with
  `font-feature-settings: "ss01", "cv11"`; drop Bricolage, Instrument Sans, JetBrains Mono.
- Two-voice type system and a copy pass on all UI strings (labels, buttons, hints, empty states).
- Icon set: `components/ui/Icon.tsx` (inline SVG, ~16 glyphs) + one abstract **world glyph** per world.
- Wordmark-only identity ("WHAT-IF LAB"), vertical edge label on desktop.
- Canvas: stage background, `chip()` text/surface colours and `FONT` follow the new tokens via the
  `DrawContext` palette (as already planned in 0001 step 6).
- Rewrite `docs/design/apple-design-language.md` sections Colour, Typography, Shape, Voice, Icons.

**Out:** layout/IA changes (that's 0001 steps 2–5, 7–8), new routes, ads, premium, sim model changes,
3D renders/photography (the reference's imagery has no equivalent here — the live sim is our "render").

## Design

### Colour tokens (dark "darkroom", default)

| Token | Value | Use | Contrast on `--bg` |
| --- | --- | --- | --- |
| `--bg` | `#100904` walnut | Page + stage void | — |
| `--bg-elevated` | `#382416` bark | The one filled button; selected segment thumb | — |
| `--surface` | `#1A110A` | Inspector / sheet (barely lifted, no border needed) | — |
| `--label` | `#FFEDD7` cream | Primary text, icons, focus ring | 17.3:1 |
| `--label-2` | `#A89A8A` | Secondary text, units, captions | 7.2:1 |
| `--separator` | `#40372E` cork | Hairlines (dashed for section breaks) | non-text |
| `--muted-line` | `#6C5F51` driftwood | Slider tracks, disabled, chart grid — **never text** (3.2:1) | non-text |
| `--ember` | `#DC5000` | Editorial only: credits, "Model notes", premium tag. Never buttons/what-if | 4.9:1 |
| `--base` | `#A9B1D6` (unchanged) | No-change world | 9.4:1 |
| `--alt` | `#FFC857` (unchanged) | What-if world | 12.8:1 |
| `--good` / `--bad` | `#8FD18C` / `#FF8A6A` | Deltas (always with ▲/▼ sign, not colour-only) | ≥ 7:1 |

`--base`/`--alt` hex values are kept, so `CLAUDE.md` and canvas code stay valid. On the warm canvas the
cool lavender-grey reads as "the world as it is" and gold as "the world that might be" — the split
becomes a temperature difference, which is the abstraction we want.

Light "paper" theme (if approved): `--bg #F6E6D2`, `--label #100904`, `--label-2 #5C4F43` (6.9:1),
`--ember #B64200` (4.6:1), `--base #5B6380`, `--alt #B87400`; stage stays walnut in both themes (the
sim is always "in the darkroom"), only chrome flips.

### Typography — two voices

| Role | Size / line-height / weight | Case | Where |
| --- | --- | --- | --- |
| Display | `clamp(40px, 6vw, 51px)` / 0.9 / 500 | UPPER | Scale-view object name, wordmark hero |
| Title | 41 → 28 px mobile / 0.9 / 500 | UPPER | World name at top of inspector |
| Headline | 18 / 1.0 / 500 | UPPER | Section labels: WHAT IF · RIGHT NOW · STARTING CONDITIONS |
| Label | 12 / 1.1 / 500, `+0.04em` | UPPER | Nav, buttons, segmented options, table heads, chips |
| Micro | 10 / 1.2 / 500, `+0.06em` | UPPER | Edge label, units, credits |
| Description | 17 / 1.4 / 400 (29 / 1.26 on scale-view hero desc ≥ 1280 px) | Mixed | World intro, object facts, what-if questions, timeline events |
| Numbers | as context, `tabular-nums`, 500 | — | Readouts, slider values, time |

Rules: UPPER = *naming things*; mixed case = *explaining things*. What-if questions stay mixed case
("What if the Moon disappeared?") because they are the conversational voice and the SEO/share text.
This deliberately amends the Apple doc's "no all-caps > 12 px" rule for Headline/Title/Display only.
Letter-spacing 0 at ≥ 18 px (reference), small positive tracking ≤ 12 px for legibility.

### Shape and depth

- Radius vocabulary (four values only): cards/inspector/sheet `12px`, ghost buttons & segmented
  `22.5px`, filled primary `36px`, chips/pills `999px`. Inputs: underline only, `0`.
- No `box-shadow` anywhere. Floating chrome (nav, transport pill, sheet) =
  `color-mix(in srgb, var(--bg) 72%, transparent)` + `backdrop-filter: blur(20px) saturate(140%)`,
  opaque `--surface` fallback.
- Section breaks: `1px dashed var(--separator)`. Row separators inside a list: none — space only.

### Components (re-skin of the 0001 primitives)

| Component | Look |
| --- | --- |
| Primary button (Play/Pause — the one per view) | Filled bark, cream LABEL, 36 px radius, 44 px tall, leading icon |
| Secondary (Restart, Drop what-if) | Ghost: 1 px cream border @ 40 %, 22.5 px radius |
| Tertiary / links | Text LABEL with 1 px dashed underline on hover/active |
| Segmented (speed, world switcher, metric tabs) | No track fill; options as LABELs; active = bark thumb + cream text |
| What-if row | Mixed-case question, leading fork glyph; selected = `--alt` glyph + 2 px `--alt` left rule, no box |
| Slider | 1 px driftwood track, cream 20 px thumb (hit area 44), value right in tabular cream |
| Select / number | Underline input, chevron icon |
| Readout table | LABEL heads, numbers in cream; what-if column in `--alt` |
| Chart | Driftwood grid, `--base` solid, `--alt` dashed+thicker (not colour-only) |
| Timeline | Mixed-case events; time as Micro tabular; dot glyphs ◦ base / ● what-if / ◐ both |

### Icons

Own set, no library, no SF Symbols. 24 px grid, 1.5 px stroke, round caps/joins, `currentColor`,
geometric primitives only (circle, line, arc) — abstract, not pictorial. Always paired with a text
label or `aria-label`.

- **UI glyphs:** play, pause, restart, fork (one line splitting into two), close, chevron, plus, minus,
  info, share, sun/moon (theme), search, expand.
- **World glyphs** (nav + scale-view "open" chip): Scale = log ruler ticks · Galaxies = dotted spiral ·
  Solar = three concentric orbits with a dot · Earth = circle with a horizon line · Countries = 3×3 dot
  grid · Animals = two circles of different size (prey/predator) · Child = small circle inside a
  dashed circle · Character = one circle with a branching line.

### Identity and copy

- Wordmark only: **WHAT-IF LAB** (Label size in nav, Display on the scale hero). No logo symbol.
- Desktop ≥ 1280 px: vertical edge label (Micro, `--label-2`), e.g. `WHAT-IF LAB · 7 WORLDS · RULE-BASED`
  — sits inside the gutter, never in the ad rail area or over the stage.
- Ember credit line in the footer/About: `NO AI · NO LIVE DATA · SAME SEED, SAME FUTURE`.
- Copy pass (examples): "What if…" → **WHAT IF**; "Right now" → **RIGHT NOW**; "Starting conditions"
  → **STARTING CONDITIONS** + description "Changing these restarts the world."; "Drop what-if" →
  **CLOSE WHAT-IF**; default hint → "Pick a question. The world splits here." Tab subtitles become
  Micro labels ("PROTON → UNIVERSE", "GRAVITY", "CLIMATE"…). Event text in `lib/sim` is **not**
  changed (timeline matching depends on it).

### Files touched

`app/globals.css`, `app/layout.tsx` (fonts, `themeColor`), `components/ui/Icon.tsx` (new),
`components/*.tsx` (class names, copy, icons), `lib/sim/draw.ts` (`FONT`, chip colours from palette),
`lib/sim/types.ts` (`DrawContext.theme` palette — shared with 0001 step 6), `lib/sim/registry.ts` /
sandbox `sub` strings (short Micro labels), `lib/scale/*` (overlay type), `docs/design/*`.

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. Tokens + Inter via `next/font` + two-voice type classes; remove Google Fonts link. No layout change.
2. Re-skin existing controls (buttons, segmented, sliders, selects, what-if rows, table, chart, timeline)
   to the new shape/depth rules; delete shadows and boxed borders.
3. `Icon.tsx` + world glyphs; wire into transport, what-if rows, tabs, scale "open" chip.
4. Copy pass across components and sandbox `sub`/`hint` strings (not event text).
5. Canvas: `DrawContext.theme` palette, walnut stage, `FONT` → Inter, `chip()` from palette; check all
   7 worlds + scale view.
6. Identity: wordmark, edge label, ember credit line; light "paper" theme if approved.
7. Update `docs/design/apple-design-language.md`, ADR 0005 → accepted, 0001 rebased on new tokens.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| All-caps hurts readability / dyslexic users | UPPER only for short labels ≤ 4 words; all reading text stays mixed case; screen readers get mixed-case `aria-label`s (CSS `text-transform`, not uppercase source strings) |
| Warm canvas makes space worlds look "brown" | Walnut is ~0.4 % luminance — reads as black; verify galaxy/solar screenshots; fall back to `#0B0805` for the stage only if needed |
| Driftwood/ember misused as text colours | Token comments + skill checklist; contrast table above |
| Inter looks less "Apple" on Macs than SF | Acceptable: consistent across platforms is the point of the reference; system stack stays as fallback |
| Conflicts with in-flight 0001 | 0001 not started; this doc lands first and 0001 reuses its tokens |

## Verification

- [x] Automated: existing suite green (24/24), typecheck green, production build green.
- [ ] Draw test per sandbox with the new palette — not added: tests run in Node without a canvas; needs a canvas mock (follow-up).
- [~] Manual: checked scale view and solar (forked) at desktop width in dark and light, animals (forked) at 375 px in light. Not checked: 768/1600 px, other worlds one by one, reduced motion, 200 % zoom.
- [x] Contrast computed for all text tokens in both themes (table above / design doc).
- [ ] Screenshots of all 7 worlds + scale view before/after in the PR.
- [x] Docs: design doc rewritten, ADR 0005 accepted, apple-ui-ux skill updated. PLAN.md box left for 0001 (layout still to do).

## Open questions (need a decision before step 1)

1. **Themes:** dark "darkroom" only (truer to the reference), or dark default + light "paper" for chrome?
2. **Uppercase headings:** UPPER at 18–51 px as proposed, or keep UPPER for ≤ 12 px labels only (more Apple, less ORYZO)?
3. **Font:** Inter self-hosted (consistent everywhere) vs pure system stack (SF on Apple, zero bytes)?

## Log

- 2026-11-02 — proposed, from the ORYZO style reference supplied by the user.
- 2026-11-02 — approved with the recommended answers: dark default + light "paper" chrome theme (stage stays dark), uppercase headings, Inter self-hosted. In progress.
- 2026-11-02 — shipped. Diverged from the plan: no `DrawContext.theme` palette — since the stage is dark
  in both themes, canvas code uses a fixed `STAGE` palette in `lib/sim/draw.ts` (simpler, no `lib/sim`
  API change). Canvas text gets the page font through `setCanvasFont()` (next/font hashes the family
  name). Content colours inside worlds (Earth sky, animal meadow, scale objects) are unchanged. Light
  theme: chrome follows a toggle saved in `localStorage` (default dark, no system-preference follow).
  Hero "What happens if…" shows on the scale view only, so lab pages keep the stage high.
