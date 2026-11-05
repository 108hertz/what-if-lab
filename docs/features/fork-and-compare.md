# Worlds, what-ifs, fork and compare

- **Status:** live
- **Tier:** free (several what-if worlds running side by side are premium — see [premium](./premium.md); stacking changes into one world in solar, galaxy, countries, animals and child is free)
- **Owner area:** `lib/sim`, `worlds/<key>/`, `components/console/` (StandardConsole, Stage, panels, Dock, HistoryChart, Timeline)
- **Changes:** [0003](../changes/0003-darkroom-visual-language.md), [0004](../changes/0004-single-screen-console.md), [0008](../changes/0008-worlds-as-projects.md), [0015](../changes/0015-stacked-changes-one-world.md), [0016](../changes/0016-country-people-first.md), [0017](../changes/0017-animals-living-ecosystem.md), [0018](../changes/0018-child-growing-up.md), [0019](../changes/0019-child-characters-second-pass.md)

## What it is

Each world is a live, deterministic simulation with adjustable variables (controls). Choosing a
**what-if** forks the running world at that instant: the unchanged world and the what-if world run side
by side, with a chart and timeline showing where they diverge.

Worlds today: galaxy, solar, earth, country, animals, child, person (see `CLAUDE.md` model notes).

## Why

This is the product. The divergence moment is what people screenshot and share.

## Behaviour

- **Pure variable changes → outcomes.** No AI, no network data. Rules in `worlds/<key>/sim.ts`; each world is its own project folder (change 0008).
- **Determinism:** same params + seed + what-if + fork time ⇒ identical result. RNG state lives in the
  world (`w.rs`); `Math.random()` is forbidden in `lib/sim`.
- Controls change params live; a what-if is applied to a `structuredClone` of the world at fork time.
- Metrics (`read`) are finite or `null`; chart plots both worlds; timeline marks events as
  both / no-change only / what-if only.
- **One-world mode** (`Sandbox.stack`, change 0015; solar, galaxy and, since changes 0016, 0017 and 0018, countries, animals and child): the stage shows one world, full
  size. The first pick forks; every later pick (and solar's drag-to-throw) is applied to the same changed
  world, so changes add up (`engine.change()`, `engine.applied`). Picking one again applies it again
  (shown as "×2"). The stage label reads "Changed: A + B". The no-change world keeps running hidden, so
  the chart (No change vs With changes), readouts and timeline still compare. "Undo all changes"
  returns to it; undoing a single change is not supported. Other worlds keep the split stage and
  re-fork on each pick. Worlds that stack may draw their own comparisons: countries, animals and child get the
  hidden no-change world as `DrawContext.base`, and animals and child own their charts (solid lines with the
  no change as faint dashed lines of the same colour) and a plain-sentence story. Child changes can also be
  scheduled for a later age ("When it happens: at age 10"): they wait in the changed world and happen, with a
  timeline line and a stage caption, when the clock reaches that age. Since change 0019 a child change also has a
  length ("How long"), and each one can be stopped, moved (while planned, on the life ruler) or undone on its own
  (exact, because the child's random draws never depend on changes); a stop, move or undo clears the export recipe so
  exports start from now. Optional `Sandbox.pace()` lets a world slow the live clock for a moment (child: ¼ speed for
  1.2 s when a change happens); exports and tests never read it.
- Worlds keep running across tab switches (module-level engine singletons).
- **One-screen console** (changes 0004, 0007): at ≥ 1280 px Ask (what-ifs, readouts, info) · stage +
  transport + chart/timeline · Tune (all variables) without page scroll; at 1024–1279 px the stage, chart
  and timeline with an Ask · Tune · Read dock beside them; below 1024 px the stage with a dock
  (Ask · Tune · Read · Log) under it, or beside it on short (≤ 520 px tall) screens. Phones switch worlds
  from a world menu. See `DESIGN.md` → Layout. Each world may replace `StandardConsole` with its own
  `worlds/<key>/Console.tsx`; every world page loads only its own code.

## Out of scope

Real-world prediction. Each world's intro must say it's a simplified model.

## Acceptance checks

- [x] `npm test` covers every sandbox × every what-if, determinism and engine behaviour.
- [x] Animals predators/prey coexist in a long run (Yellowstone, ~600 days); every pair of the 21 species runs 300 days (change 0017).
- [x] Stacking: two changes equal applying both to one clone; undo returns to base; every pair of
  what-ifs stays finite in solar, galaxy, countries, animals and child; split worlds still re-fork (`tests/stack.test.ts`).
