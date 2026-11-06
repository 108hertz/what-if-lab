# 0024 — One world on the stage, every change on a tick list, Reset everything; side by side only in exports

- **Status:** shipped
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [fork and compare](../features/fork-and-compare.md), [exports](../features/exports.md)
- **Decisions:** none (no vendor, hosting or data-format choice; the export style JSON keeps `v: 1` and still reads every old value)
- **Created:** 2026-11-06 · **Shipped:** 2026-11-06
- **Approval:** Approved by the user in chat, 2026-11-06 (implement without waiting).

## Why

The user's words, paraphrased: "Nowhere should I have the split view. It is only a function at export time: when a
person exports, they can choose to have the normal state on one side and the changed result on the other. Each change
should be easy to tick off. And we need a reset that resets everything, so the conditions are reset (maybe I want to
test a process)."

Until now earth and person split the stage into *no change | what if* and re-forked on every pick, while the other
five worlds stacked changes into one world (change 0015) but could only undo all of them at once (child could undo one).
Testing a process — try A, then B, take A away, put it back, start again — was not possible.

## Scope

**In:**
- Every world (galaxy, solar, earth, country, animals, child, person) shows **one world** on the live stage: the
  current world with the changes that are on. Earth and person are converted to the stacking model. `Sandbox.stack`
  is removed: stacking is the only model. The hidden no-change world keeps running for the chart, readouts, story and
  timeline (where the two diverge is still the product).
- **"Your changes"**: a shared console block (`components/console/Changes.tsx`) lists every change made, in order,
  each with a tick. Untick = the world as if that change had never been made; tick = back, as if it had stayed. A row
  can also be removed for good; "Turn all off / on" and "Clear the list" sit under the list. Wired into
  StandardConsole (galaxy, solar, earth, person) and the country, animals and child consoles.
- **Reset everything** in the transport (replaces Restart): default settings and speed, no changes, time 0, empty
  history and timeline. Worlds can clear their own view state too (`onReset`; child forgets the picked kid).
- **Exports**: a *Worlds* choice on the Output tab for video, pictures and slides — *Changed only* (default) or
  *No change | with changes* — plus the finer choice on the Look tab (both · fit, side by side, stacked, no change
  only). Stacking worlds, which were always drawn as one pane in exports, can now be exported side by side.

**Out:**
- Running the replay in a Web Worker (it runs on the main thread; see Risks).
- Scheduling a change to turn off at a later time (a tick is now-or-never: off = never made).
- Changing what a change does after it is made, other than the child world's stop / move (which are edits of the
  recorded change).

## Design

**Engine (`lib/sim/engine.ts`).** `SimEngine.entries: ChangeEntry[]` (`key`, the recorded `ChangeRecord`, `on`,
`at` = live steps since the first change). From the first change on, the engine logs every live step: its `dt` (after
`pace()`) and the params in force (live controls can move between steps). For each entry it keeps the changed world
just before it and the no-change world then. Ticking entry *i* off or on, removing it, or editing its params
(`setOn`, `toggle`, `setAll`, `remove`, `edit`) re-runs the changed world from the snapshot before *i* with exactly the
logged steps, applying the entries that are on at the steps they were made. Because sims are deterministic and pure,
the result is bit-for-bit the world of a session where that click never happened (tested for every world × every
what-if). The changed world's history samples carry `n` / `e` (step count, entries made) so the replay rewrites
the chart's past too. With no change on, the stage shows the no-change world and the snapshots fall back to the
no-change world's (no replay needed). `applied` and `origin` (the export recipe) are getters over the entries that are on,
so exports always match the stage. `reset()` = `defaultParams` + default speed + playing + clean `ui` + `restart()`.
`rects()` always returns one rect; `draw()` draws one world with its channel tag.

**Worlds.** Earth: `w.mod/tf/mx` → `w.mods: {id, tf, mx}[]`; emissions multipliers multiply, sinks / sources / aerosol
offsets / sea-level melt add, methane cuts multiply what is left, sea walls keep the highest. One change gives the same
numbers as before. Person: `w.habit/tf` → `w.hs: {id, tf}[]`; every version keeps or drops each habit on its own
(`kept[i]`), effects add up; picking a running habit starts it again; "Still doing it" = average over habits; with more
than one habit the timeline lines are prefixed with the habit's short name. Child: a stop is an edit of the recorded
change (`s_stop`), a move edits `s_age`; `worlds/child/edit.ts` maps the life ruler's mod index to the engine entry
and calls `engine.remove` / `engine.edit`, so undo, stop and move are exact and keep the export recipe (they used to
clear it). Solar: drag-to-throw is one more change (`engine.change("throw")`).

**Export (`lib/export/frame.ts`, `style.ts`, `components/console/export/`).** `drawStage` no longer forces one pane for
stacking worlds; the base pane gets no `base`, the changed pane gets the no-change world as `base` (as the live stage
does). `defaultStyle().layout.split` is `"alt"` (changed only); saved styles without a value read as `"alt"`. Slides
take the same choice (`SlideCtx.split`, resolved for the slide stage box). The replay is unchanged, so the layout can
never change the simulation.

**UI (Control Room).** The list uses the what-if row's amber bar for changes that are on (the only control allowed to
wear amber), a signal-accent checkbox, mono times, 44 px rows, an icon button to remove; unticked rows go quiet
(secondary text, struck through). It sits right under the world name in Ask, above the what-ifs (child: under the life
ruler). Transport: Play · speed · Reset · hint · Export · Full screen; "Undo all changes" moved to the list ("Clear the
list"). No ad slot moves (ADR 0007).

## Steps

1. Engine: entries, step log, snapshots, replay, `reset()`, one-rect stage; remove `Sandbox.stack`.
2. Earth and person to stacking; child edits through the engine; solar throw.
3. Shared `ChangeToggles` block + CSS; wire into every console; Transport Reset; copy.
4. Export: Worlds choice (Output and Look tabs), slides follow it, default changed only.
5. Tests: every world × every what-if off = never made / on = always there; all off / all on / remove; reset;
   no live split; export side by side draws two panes and never changes the run. Docs.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Replay cost: ticking off an early change after a long run re-steps the changed world on the main thread (no drawing, one world, so much faster than live). Galaxy is the heaviest. | Replay starts from the snapshot just before the change; with nothing on before it, from the next change that is on; all off needs no replay. Moving the engine into a Web Worker (already a goal in CLAUDE.md) would take it off the main thread. |
| A draw() that mutates world state would make replays drift from the live stage. | Test draws every frame live and checks off-then-on returns the exact same world for every world. |
| The child world's live slow-motion (`pace()`) makes the "never clicked" session tick differently. | Not a replay error (the toggle keeps the clock that was used); the comparison with a never-clicked session skips worlds with `pace`. |
| Step log memory grows with session length (one number per frame). | About 2 MB per hour at 60 fps; cleared by Reset, Restart (settings change) and "Clear the list". |
| Old saved export styles had `split: "auto"` as default. | They are read as they were saved; only new styles default to changed only. |

## Verification

- [x] Automated: `tests/changes.test.ts` (new), `tests/stack.test.ts` (every world stacks), `tests/export.test.ts`
      (side by side), `tests/child.test.ts` (stop/undo keep the recipe).
- [ ] Manual: tick a change off and on in each world at 375, 1024 and 1440 px, light + dark; Reset; export a video side by side.
- [x] Docs: fork-and-compare and exports specs; CLAUDE.md, DESIGN.md, PRODUCT.md; world READMEs.

## Log

- 2026-11-06 — proposed and approved by the user in chat (implement without waiting); implemented the same day.
