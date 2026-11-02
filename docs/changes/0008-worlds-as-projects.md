# 0008 — Worlds as projects, with reserved ad slots

- **Status:** shipped
- **Phase:** 1 (structure) · 3 (ad placement policy)
- **Features:** [fork and compare](../features/fork-and-compare.md), [ads](../features/ads.md)
- **Decisions:** [ADR 0007](../decisions/0007-ad-slots-per-world.md) (accepted; amends [ADR 0003](../decisions/0003-advertising.md))
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

Today every world goes through one console: `components/Lab.tsx` builds a single set of Ask · stage ·
Tune · results for all seven worlds, and world-specific behaviour leaks into it (`if (engine.sb.key ===
"solar")` for throwing planets). That makes the worlds look the same, and any change made for one world
risks the other six. The goal is that **each world is its own small project**: its own layout, panels,
variables UI, canvas interaction and copy. Worlds share only the design tokens, UI primitives and the
console building blocks. After this structural change, each world gets its own "make it excellent" pass
without touching the others.

Every world layout must also **reserve space for one or two ad banners** in every screen band, so revenue
(PLAN.md → Phase 3) doesn't need a layout rework later, and empty slots look intentional from day one.

## Scope

**In:**
- A `worlds/<key>/` folder per world holding everything specific to that world.
- Shared layers: tokens (`app/globals.css`), primitives (`components/ui/`), console building blocks
  (`components/console/`), engine (`lib/sim/`).
- A thin `Lab` shell (nav + world switcher + render loop) that mounts the world's own `Console`.
- `AdSlot` component with fixed reserved sizes and a placeholder; a per-band placement policy every world
  console must follow (enforced by a test).
- DESIGN.md → Layout, ADR 0007, CLAUDE.md architecture and the `add-sandbox` skill updated.
- One change doc per world for the excellence pass (written later, one at a time; see "After this").

**Out:**
- Loading a real ad network, consent (CMP), Premium detection — slots stay empty placeholders (Phase 3).
- Any change to simulation rules, metrics or what-ifs in this change. Step 1–3 are visually identical
  to today except the ad slots.
- The scale explorer (`/`) — it stays as is; it is not a world.

## Design

### Folder layout

```
worlds/
  solar/
    sim.ts          the Sandbox (moved from lib/sim/sandboxes/solar.ts) — framework-free, no React
    data.ts         static data (if any; moved from lib/sim/data/)
    Console.tsx     this world's layout, composed from shared blocks + its own panels
    panels/…        world-only UI (e.g. solar's body list, throw hint)
    interaction.ts  canvas pointer handling (solar's drag-to-throw moves here out of Lab.tsx)
    world.css       layout-only overrides, scoped under [data-world="solar"]
    README.md       the world's brief: audience, the questions it answers, what "excellent" means
  galaxy/ earth/ country/ animals/ child/ person/   same shape
  index.ts          registry: key → { sim, Console (next/dynamic, per-world code split) }
```

Each world is code-split: opening `/lab/solar` loads only solar's console and sim.

### What is shared, what isn't

| Layer | Where | Rule |
| --- | --- | --- |
| Tokens | `app/globals.css` | Colours, type, spacing, radii, motion. Worlds never define new colours or sizes. `world.css` may set **layout** variables only (column widths, results height, stage ratio). |
| Primitives | `components/ui/` | Icon, Button, Segment, Range, Select, Popover, Headline, Table. No world knowledge. |
| Console blocks | `components/console/` | Stage (canvas + render loop hook `useStage`), Transport, HistoryChart, Timeline, Readouts, WhatIfList, ControlsForm, InfoBlocks, Dock, Column, AdSlot, `StandardConsole`. Take the engine as a prop. |
| Engine | `lib/sim/` | `SimEngine`, core, draw, types — unchanged contract. |
| World | `worlds/<key>/` | Anything only that world needs. A world may import shared layers; shared layers never import a world, and worlds never import each other (enforced by a test). |

`StandardConsole` is today's layout, extracted. Every world starts as `export default () =>
<StandardConsole … />` so the refactor is invisible, then diverges in its own pass.

### Ad slots

`<AdSlot size="rail" | "box" | "banner" id="…" />` renders a fixed-size reserved box (CLS = 0):

| Size | Dimensions | Used at |
| --- | --- | --- |
| `rail` | 160 × 600 | ≥ 1600 px, left and right gutters outside the console (as ADR 0003) |
| `box` | 300 × 250 | 1024–1599 px, foot of the right column/dock, outside its tabs and scroll |
| `banner` | 320 × 50 | < 1024 px, foot of the dock panel (below the dock content, never touching the stage or transport) |

Placement policy (same for every world; a world chooses *where in its own column*, not *whether*):

```
≥ 1600   [rail] │ world console │ [rail]          2 slots
1280–1599        Ask │ centre │ Tune+[box]        1 slot (bottom of the Tune column, fixed)
1024–1279        centre │ dock+[box]               1 slot (bottom of the dock, fixed)
< 1024 tall      stage · transport · dock · [banner]  1 slot
< 1024 short     not shown (phones held sideways: no room without hiding Play)
```

- Empty slot (dev, no-fill, ad-blocker): dashed cork hairline box, micro label "Ad", and at most one
  per screen gets the quiet "Go ad-free · $15/yr" text link. No fill, no animation.
- Premium (later): the slot isn't rendered; the band's space returns to the column. The decision is
  made before first paint from the stored license, so it causes no shift.
- Never over or inside the stage, between the stage and the transport, inside the what-if list, or in
  popovers. Height of the console regions is computed with the slot included so pages still never scroll.

This widens ADR 0003 (rails only, ≥ 1600, never on mobile sim view) → ADR 0007 (proposed).

### Shell after the change

```tsx
// components/Lab.tsx (~60 lines)
<div className="app" data-world={key}>
  <Nav mode={mode} />
  <WorldConsole engine={engine} />   // from worlds/index.ts
</div>
```

`useStage(engine, canvasRef, interaction?)` owns the rAF loop and pointer plumbing; a world passes its
own `interaction` (solar: throw; others: none for now).

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. **Shared blocks.** Move console components into `components/console/`, primitives into
   `components/ui/`; extract `useStage` and `StandardConsole` from `Lab.tsx`. No visual change.
2. **World folders.** Create `worlds/<key>/` for all seven; move `sim.ts` + data; each gets
   `Console.tsx` = `StandardConsole`, `README.md` brief. Move solar's throw into
   `worlds/solar/interaction.ts`. Registry moves to `worlds/index.ts`; `lib/sim/registry.ts` re-exports
   for tests. Per-world code splitting. Boundary test (no world imports another; shared never imports a
   world; `sim.ts` imports no React).
3. **Ad slots.** `AdSlot` + placement in `StandardConsole` for every band; ADR 0007; DESIGN.md Layout;
   test that every world console renders the required slots per band (DOM check in vitest + jsdom, or a
   static check on `StandardConsole` usage if jsdom is too heavy).
4. **Docs.** CLAUDE.md architecture + checklist, `add-sandbox` skill, feature docs, ads.md.

## After this — one project at a time

Each world then gets its own change doc (`0009-solar-…`, `0010-…`) using its README brief: who it's
for, the three questions it answers best, its own layout, canvas text on the type scale (leftover from
0005), variables UI, what-ifs and copy. Proposed order (most shareable first): **solar → earth →
animals → country → galaxy → child → person**. Each world's pass touches only `worlds/<key>/`.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Big file move breaks imports / history | Steps 1–2 are moves + re-exports only; `git mv` so history follows; tests cover every world. |
| Worlds drift into seven design systems | Tokens/primitives are the only styling source; `world.css` limited to layout vars (lint check: no hex, no px font sizes). |
| Ad slot eats space on short screens | Not shown in phone-landscape band; heights computed with slot; verified at 375×667 and 1280×720. |
| Ads near the stage hurt trust / policy | Slots only at column/dock foot; never adjacent to stage or transport; ADR 0007 records it. |
| Mobile banner hurts the first impression | Banner only below the dock panel, never above the fold of the stage; can be dropped by ADR if metrics show harm. |

## Verification

- [x] Automated: all 24 sandbox tests pass; new `tests/structure.test.ts` (boundaries, folders, ad slots) — 55 tests green; typecheck and build green.
- [x] Manual (browser pane, production build): earth measured at 375×812, 375×667, 812×375, 768×1024,
      1024×768, 1280×800, 1680×1050, 1680×680 — no page scroll, Play on screen, right slot per band (banner
      hidden sideways); screenshots of solar 1440×900, country 1680×1050, animals 375×812, scale view.
      Solar drag-to-throw forks the world; the scale "Open this world" link for Lion opens animals with lions.
- [ ] Not checked: every world at every size (one world measured per band; all share StandardConsole), light theme.
- [x] Bundle: each world's what-if strings are in exactly one separate chunk; shared first load 103 kB.
- [x] Docs: DESIGN.md, CLAUDE.md, add-sandbox skill, ads.md, fork-and-compare.md, PLAN.md updated; ADR 0007 accepted.

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — approved; in progress.
- 2026-11-02 — shipped. Differences from the plan:
  - `useStage` became a `Stage` component plus `useCanvasLoop` (`components/ui/canvas.ts`), shared with the scale view.
    World pointer input goes through `StageInteraction`; solar's throw is `worlds/solar/interaction.ts`.
  - Primitives stayed as CSS classes (`.btn`, `.seg`, `.iconbtn`); only `Icon`, `useMedia` and `canvas` moved to
    `components/ui/`. Wrapping them in components is left until a world needs it.
  - Sims are code-split through a light `meta.ts` per world (`WorldMeta`); `worlds/sims.ts` is for tests only.
    Scale links queue a preset (`queuePreset`) that applies when the world's engine loads.
  - `lib/sim/data/personality.ts` was split: Big Five data → `worlds/child/data.ts`, habits → `worlds/person/data.ts`.
  - No `world.css` files yet — none needed until a world diverges.
  - Rails also need ≥ 700 px of height; shorter wide screens fall back to the 300×250 box.
  - The ad-slot test is a static check of each `Console.tsx` (no jsdom dependency).
  - Leftover for the solar pass: `SimEngine.whatIfLabel()` still knows the solar-only "throw" label.
  - Build was run on a copy in the scratchpad because another session's dev server uses `.next` here.
