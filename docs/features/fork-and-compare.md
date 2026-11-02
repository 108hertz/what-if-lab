# Worlds, what-ifs, fork and compare

- **Status:** live
- **Tier:** free (multiple simultaneous what-ifs are premium — see [premium](./premium.md))
- **Owner area:** `lib/sim`, `components/Lab.tsx`, `components/panels.tsx`, `Dock`, `HistoryChart`, `Timeline`
- **Changes:** [0003](../changes/0003-darkroom-visual-language.md), [0004](../changes/0004-single-screen-console.md)

## What it is

Each world is a live, deterministic simulation with adjustable variables (controls). Choosing a
**what-if** forks the running world at that instant: the unchanged world and the what-if world run side
by side, with a chart and timeline showing where they diverge.

Worlds today: galaxy, solar, earth, country, animals, child, person (see `CLAUDE.md` model notes).

## Why

This is the product. The divergence moment is what people screenshot and share.

## Behaviour

- **Pure variable changes → outcomes.** No AI, no network data. Rules in `lib/sim/sandboxes/*.ts`.
- **Determinism:** same params + seed + what-if + fork time ⇒ identical result. RNG state lives in the
  world (`w.rs`); `Math.random()` is forbidden in `lib/sim`.
- Controls change params live; a what-if is applied to a `structuredClone` of the world at fork time.
- Metrics (`read`) are finite or `null`; chart plots both worlds; timeline marks events as
  both / no-change only / what-if only.
- Worlds keep running across tab switches (module-level engine singletons).
- **One-screen console** (change 0004): desktop shows Ask (what-ifs, readouts, info) · stage + transport +
  chart/timeline · Tune (all variables) without page scroll; phones/tablets show the stage with a dock
  (Ask · Tune · Read · Log). See `DESIGN.md` → Layout.

## Out of scope

Real-world prediction. Each world's intro must say it's a simplified model.

## Acceptance checks

- [x] `npm test` covers every sandbox × every what-if, determinism and engine behaviour.
- [x] Animals predators/prey coexist in a long run.
