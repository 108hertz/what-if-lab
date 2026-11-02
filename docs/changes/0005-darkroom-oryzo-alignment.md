# 0005 — Align Darkroom with the ORYZO style reference

- **Status:** shipped
- **Phase:** 1
- **Features:** [fork and compare](../features/fork-and-compare.md), [scale explorer](../features/scale-explorer.md)
- **Decisions:** [ADR 0006](../decisions/0006-darkroom-design-system.md) (amended, not superseded)
- **Source:** ORYZO style reference (`DESIGN.md`, supplied by the user 2026-11-02)
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

Darkroom was derived from the ORYZO reference (same palette, radii, two voices, no shadows), but the
console work in 0003/0004 drifted from it in a handful of places: tracked uppercase, a third surface
colour boxing every column, bark used as a "selected" fill on every tab, softened ghost borders, and an
off-scale type ramp. This change brings the system back into accordance with the reference wherever that
doesn't break the one-screen console or accessibility, and records the deliberate deviations.

## Gap analysis

| # | Reference says | Darkroom today | Proposal |
| --- | --- | --- | --- |
| 1 | Letter-spacing **normal at every size** | `.lbl` +0.04em, `.micro` +0.06em, wordmark +0.02em, buttons/seg/tabs +0.04em | **Adopt.** Tracking 0 everywhere. |
| 2 | Surface stack is **two steps**: walnut `#100904` → bark `#382416`. No cards-within-cards; chrome is type | Ask/Tune/results/dock sit on a third colour `--surface #1A110A` | **Adopt.** Columns, results and dock become transparent on walnut, separated by dashed cork hairlines. `--surface` survives only for popovers and `<option>` lists. Stage keeps a 1 px cork outline so it still reads as the object. |
| 3 | Bark fill is **the only filled action surface**, used once | Bark also marks active world tab, speed segment, metric tab, dock tab | **Adopt.** Active tab/segment = cream text + **1 px dashed underline** (the reference's active-nav indicator). Bark is Play/Pause only. |
| 4 | Ghost button: **1 px Warm Cream border** | Border at 40 % cream | **Adopt.** Full cream border; hover = bark-free text change only. |
| 5 | Type scale 8 · 10 · 12 · 14 · 15 · 18 · 24 · 29 · 41 · 51 | Body 17, ad-hoc 13 px in tables/timeline/controls, world title `clamp(24px,2.4vw,32px)`, hero 32 | **Adopt the scale.** Add `--t-heading-sm 24/1.09`, `--t-body-lg 29/1.26`, `--t-small 14`. Body 17 → 18, 13 px → 14 (or 12 for dense table cells), world title → 24, phone hero → 41. Every font size comes from a token. |
| 6 | Body copy is **29 px / 400 / 1.26** | 17 / 1.4 | **Partial.** 29 px is the reading-screen body and the scale hero description (`.desc-lg`). Inside the console, descriptions stay 15–18 px — 29 px would break the one-screen rule (logged deviation). |
| 7 | Layout: card padding 24, element gap 18 | 16 / 16 (4-pt) | **Adopt at ≥ 1280 px** (`--pad-card`, `--gap` tokens); 16 below, where 240 px columns can't afford it. 4-pt scale stays for internal spacing. |
| 8 | Input: underline only, cream | Already | Keep. |
| 9 | Ember only for credits — never interactive | Already | Keep. |
| 10 | No shadows; no radius < 12 on containers | Already | Keep. |
| 11 | Vertical edge label (product serial) | — | **Adopt, small.** Rotated micro label `WHAT-IF LAB · SEED 0001` (world seed) down the right edge of the stage at ≥ 1280 px. Decorative, `aria-hidden`. |
| 12 | Never centre body copy | Already left-aligned | Keep. |
| 13 | Raw colour literals | `#40372e`, `#ffedd7`, `#a89a8a`, `#382416` hard-coded in `.results`, `.transport`, `.hero`, `.seg`, `.mtabs`, `.btn.primary` | **Fix.** Add fixed `--stage-*` tokens for on-stage chrome (stays dark in both themes) and use them. |
| 14 | Icon-button hover | `--alt-soft` (what-if amber) tint | **Fix.** `--alt` is reserved for the what-if world; hover becomes cream text/opacity only. |

### Deliberate deviations (kept, documented in the design doc)

- **8 px Arial legal text** — below our 10 px minimum / contrast rules; credit line stays 10 px Inter in ember.
- **100 vh sections, three-column hero reveal** — the reference is a marketing page; our working screens
  are consoles. Applies only to future reading screens (about, landing pages).
- **Light "paper" theme** — the reference is dark-only; we keep the light chrome theme (stage stays dark).
- **`--base` / `--alt` / `--good` / `--bad`** — data colours the reference doesn't have; they live only
  in stage, chart, readouts and timeline.
- Inter stays as the Halyard substitute (the reference names it).

## Scope

**In:** `app/globals.css`, `lib/sim/draw.ts` (`STAGE`, `FONT` tracking/sizes for HUD chips), small
markup tweaks in `components/` (stage edge label, hero `desc-lg`, tab underline), `docs/design/design-system.md`,
`darkroom-ui` skill checklist, ADR 0006 amendment note.
**Out:** layout grid changes, new components, light-theme removal, sim code, reading screens (none exist yet).

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. **Tokens:** add type-scale, spacing (`--pad-card`, `--gap`) and `--stage-*` tokens; zero all tracking;
   replace every raw hex / px font size in `globals.css` with tokens.
2. **Surfaces:** drop `--surface` from columns/results/dock, cork-outline the stage, dashed separators.
3. **Selection & buttons:** dashed-underline active state for world tabs, segments, metric tabs, dock tabs;
   full-cream ghost border; fix icon-button hover.
4. **Type:** apply the scale (body 18, 14 px small, world title 24, hero 41/29); canvas `FONT` and chip sizes match.
5. **Edge label** on the stage at ≥ 1280 px.
6. **Docs:** update design-system.md (tokens, components table, deviations section), skill checklist, ADR 0006 note.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Without surface fills, Ask/Tune blur into the page | Dashed cork hairlines + 18 px gaps; check at 1024/1280/1440. |
| 18 px body / 14 px small make Child world overflow 1280 × 800 | Measure `scrollHeight === innerHeight` per world; fall back to 15 px descriptions in Tune if needed (logged). |
| Dashed underline is weaker than a fill for "selected" | Active text goes cream (vs `--label-2`), plus `aria-current`/`aria-pressed`; check contrast. |
| Zero tracking on 10 px uppercase hurts legibility | Inter at 10/500 is fine untracked; check on a non-retina screenshot. |

## Verification

- [x] `npm run typecheck && npm test && npm run build` green.
- [x] No-scroll check at 375×667, 375×812, 768×1024, 1024×768, 1280×800, 1440×900 for every world and `/` (Child's Tune scrolls internally by 56 px at 1280×800 — allowed by the design doc).
- [ ] Dark + light, reduced motion; focus ring visible; contrast ≥ 4.5:1. *(Dark + light checked by screenshot; reduced motion, keyboard path and contrast not re-measured.)*
- [x] `grep` finds no raw hex or px font sizes in `globals.css` outside `:root` blocks (the `#000` in scroll fade masks is a mask, not a colour).
- [x] Design doc, skill and ADR 0006 updated.

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — approved; in progress.
- 2026-11-02 — shipped. Divergences from the plan: the 29 px hero body applies only at ≥ 1440 px (it ran
  into scale objects at 1280); the active-tab dashed underline is cream, not cork (cork is too faint);
  canvas text inside individual sandboxes (galaxy/solar/child 11 px labels) is left for the per-world
  pass — only shared chrome (HUD chips, chart, scale labels) moved to the scale.
