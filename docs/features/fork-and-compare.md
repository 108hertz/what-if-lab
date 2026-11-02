# Worlds, what-ifs, fork and compare

- **Status:** live
- **Tier:** free (multiple simultaneous what-ifs are premium — see [premium](./premium.md))
- **Owner area:** `lib/sim`, `worlds/<key>/`, `components/console/` (StandardConsole, Stage, panels, Dock, HistoryChart, Timeline)
- **Changes:** [0003](../changes/0003-darkroom-visual-language.md), [0004](../changes/0004-single-screen-console.md), [0008](../changes/0008-worlds-as-projects.md)

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
- [x] Animals predators/prey coexist in a long run.
