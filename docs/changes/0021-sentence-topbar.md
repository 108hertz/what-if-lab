# 0021 — The topbar reads as a sentence: "what if… [world]"

- **Status:** shipped
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [scale explorer](../features/scale-explorer.md), [fork and compare](../features/fork-and-compare.md)
- **Decisions:** —
- **Created:** 2026-11-06 · **Shipped:** 2026-11-06

## Why

The topbar carried three voices at once: the WHAT-IF LAB wordmark, an ember credit line ("No AI · No live
data · Same seed, same future") that read like stock three-part marketing copy, and a strip of eight world
glyphs whose names only appeared on wide screens. It was busy and said little. The product's best idea is
the phrase "what if" itself (and the owner holds whatif.science), so the bar should just start the
question and let the world you are in finish it.

## Scope

**In:**
- Wordmark becomes `what if…` (lowercase, the one deliberate exception to the uppercase naming voice);
  it links home to the scale explorer.
- The world switcher is the world menu at every width: the current world's glyph, name and chevron,
  opening a list of every world with its subtitle. The glyph strip (`components/shell/Tabs.tsx`) goes.
- The credit line is removed everywhere: the topbar, each world's "About this model" popover, and
  video and slide exports.

**Out:**
- Renaming the product elsewhere (page titles, metadata, the stage edge label, PRODUCT.md brand): a
  separate rename change once the domain is live.

## Design

```
┌ what if…  ◎ SOLAR SYSTEM ⌄ ─────────────────────────────── 👤  ☀ ┐   same bar at every width
```

- `components/shell/Lab.tsx`: brand is one link; no credit; no `Tabs`.
- `components/shell/WorldMenu.tsx`: owns `modeLabel`; used at every width. From 768 px the list anchors
  under its button (320 px); below 768 px it spans the nav as before.
- `app/globals.css`: wordmark at Headline size (18 px / 500), ellipsis in dust; tab-strip rules removed.
- DESIGN.md → Navigation and the progressive-disclosure line updated.

## Steps

1. Shell + CSS + DESIGN.md (one step; `npm run typecheck && npm test && npm run build`).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Desktop loses one-click switching between worlds | Two clicks, a list with subtitles; the scale explorer links to every world too |
| Lowercase wordmark breaks the Two Voices rule | Documented as the identity exception; everything else keeps the rule |

## Verification

- [x] Automated: typecheck, tests. [ ] `npm run build` (run before committing).
- [x] Manual: 375 and 1440 px; menu opens, arrow keys move, Esc closes; dark + paper themes.
- [x] Docs: DESIGN.md navigation updated.

## Log

- 2026-11-06 — proposed and approved (direction "sentence bar", topbar only), built and shipped.
- 2026-11-06 — credit line also removed from the About popover and exports (owner asked).
