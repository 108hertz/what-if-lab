# Worlds, what-ifs, fork and compare

- **Status:** live
- **Tier:** free (exports, including side by side, are Premium — see [premium](./premium.md) and [exports](./exports.md))
- **Owner area:** `lib/sim`, `worlds/<key>/`, `components/console/` (StandardConsole, Stage, Transport, panels, Changes, Dock, HistoryChart, Timeline)
- **Changes:** [0003](../changes/0003-darkroom-visual-language.md), [0004](../changes/0004-single-screen-console.md), [0008](../changes/0008-worlds-as-projects.md), [0015](../changes/0015-stacked-changes-one-world.md), [0016](../changes/0016-country-people-first.md), [0017](../changes/0017-animals-living-ecosystem.md), [0018](../changes/0018-child-growing-up.md), [0019](../changes/0019-child-characters-second-pass.md), [0024](../changes/0024-one-world-tick-changes-reset.md)

## What it is

Each world is a live, deterministic simulation with adjustable variables (controls). Choosing a
**what-if** forks the running world at that instant: the stage shows the changed world, the unchanged
world keeps running hidden, and a chart and timeline show where they diverge. Every change sits on a
list with a tick, so it can be turned off and on again; Reset starts everything clean. The stage is
never split; side by side is an export option (change 0024).

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
- **One world, changes stack** (change 0015; every world since change 0024): the stage shows one world, full
  size, labelled "Changed: A + B" (or "Now · pick changes to make"). The first pick starts the changed world;
  every later pick (and solar's drag-to-throw) is applied to it, so changes add up (`engine.change()`,
  `engine.applied`). Picking one again applies it again (shown as "×2"; in person it starts that habit again
  for everyone). The no-change world keeps running hidden, so the chart (No change vs With changes), readouts,
  story and timeline still compare. Worlds may draw their own comparisons: countries, animals and child get the
  hidden no-change world as `DrawContext.base`, and animals and child own their charts and a plain-sentence story.
  Earth stacks its changes in `w.mods` (emissions multipliers multiply, sinks and sources add, the highest sea
  wall counts); person keeps each habit separately for each of its 100 versions.
- **Your changes — tick them off** (change 0024, `components/console/Changes.tsx`, in every console's Ask
  under the world name; child: under the life ruler): every change made, in order, with its time and a tick.
  Unticking gives the world exactly as if that change had never been made; ticking it again gives it back
  exactly as if it had stayed. How: from the first change the engine logs every live step (its dt and the
  params in force) and keeps the changed world just before each change; a toggle re-runs the changed world from
  there with the same steps, applying only the changes that are on (`setOn`, `toggle`, `setAll`). The chart's
  past for the changed world is rewritten too. A row can be removed for good (`remove`); "Turn all off / on"
  and "Clear the list" (= undo all changes) sit under the list. With everything off the stage shows the
  no-change world. Child changes can also be scheduled for a later age ("When it happens: at age 10"), given a
  length ("How long"), stopped, or moved while planned on the life ruler; since change 0024 a stop or a move is an
  edit of the recorded change (`engine.edit`), so it is exact and exports keep the recipe. Optional
  `Sandbox.pace()` lets a world slow the live clock for a moment (child: ¼ speed for 1.2 s when a change
  happens); exports and tests never read it.
- **Reset everything** (change 0024, the transport's Reset button, `engine.reset()`): default settings and
  speed, no changes, time back to 0, empty history and timeline — a clean start to test a process. A world can
  also clear its own view state (child forgets the picked kid). Changing a starting setting still restarts
  the world with that setting.
- Worlds keep running across tab switches (module-level engine singletons).
- **One-screen console** (changes 0004, 0007): at ≥ 1280 px Ask (what-ifs, readouts, info) · stage +
  transport + chart/timeline · Tune (all variables) without page scroll; at 1024–1279 px the stage, chart
  and timeline with an Ask · Tune · Read dock beside them. Below 1024 px (change 0035) the stage fills most of the
  screen. What if… and Tune open as sheets from a tool bar. The results sit in a strip under the stage (the key readout
  in both worlds and the newest event), which rises to fill the screen with Now · Chart · Log · About while the stage
  shrinks to a live strip. Speed is one wide button that lists every speed in words. Picking a what-if closes its sheet
  so the fork is seen happening. Sideways phones get a tool rail on the right. Phones switch worlds
  from a world menu. See `DESIGN.md` → Layout. Each world may replace `StandardConsole` with its own
  `worlds/<key>/Console.tsx`; every world page loads only its own code.

## Out of scope

Real-world prediction. Each world's intro must say it's a simplified model.

## Acceptance checks

- [x] `npm test` covers every sandbox × every what-if, determinism and engine behaviour.
- [x] Animals predators/prey coexist in a long run (Yellowstone, ~600 days); every pair of the 21 species runs 300 days (change 0017).
- [x] Stacking: two changes equal applying both to one clone; undo returns to base; every pair of
  what-ifs stays finite in every world (`tests/stack.test.ts`).
- [x] Every world × every what-if: ticked off = a session that never made it, ticked on = one that kept it,
  also with the stage drawn every frame; all off / all on / remove; Reset = a fresh engine; the live stage
  draws exactly one world (`tests/changes.test.ts`).
