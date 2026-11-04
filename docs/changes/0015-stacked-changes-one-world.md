# 0015 — Solar system and galaxies: stack several changes in one world

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** [Fork and compare](../features/fork-and-compare.md) (updated: a per-world "one world" mode)
- **Decisions:** —
- **Created:** 2026-11-03 · **Shipped:** 2026-11-04

## Why

In solar and galaxy, a what-if forks the world and the stage splits in two. Picking a second what-if
re-forks from the no-change world, so the first change is lost. The user wants to apply several changes
at once (for example: the Sun doubles *and* Jupiter ignites *and* a black hole flies through, or a
black hole *plus* more galaxies falling in), shown as **one world**, with no split stage. Both worlds'
`apply()` already change the world in place and add up correctly, so this is mostly how the engine and
console use them.

## Scope

**In:**

- A per-world opt-in, `stack: true` on the `Sandbox`, set by **solar** and **galaxy** only.
- With `stack` on:
  - The stage shows **one world, full size**: the changed world once there is a change, the
    unchanged one before that. No split, no seam.
  - **Every what-if click adds to the running world** (the first click forks; later clicks apply to the
    same changed world). Clicking one again applies it again (another doubling, another swarm). Solar's
    drag-to-throw adds a planet the same way.
  - The what-if list marks every change applied so far (cream dashed pressed state plus "×2" when
    repeated). The stage label reads "Changed: Sun doubles + black hole flies through" (trimmed to fit).
  - **Comparison stays, off-stage:** the no-change world keeps running hidden, so the chart (solid
    no-change vs dashed changed), readouts (*No change* | *With changes*) and timeline still show the
    difference. This keeps the product promise ("fork and compare") without splitting the stage.
  - Transport: "Close what-if" becomes **"Undo all changes"** (back to the no-change world, which kept
    running). The hint reads "Pick changes. They add up in this world."
  - Galaxy's what-if settings apply to the next click, as now.
- Other worlds (earth, country, animals, child, person) are unchanged: same split, same re-fork.

**Out:**

- Undoing a single change (needs replaying history; "Undo all" covers it for now).
- A small inset of the no-change world on the stage (possible later if people miss the side-by-side).
- Changing any what-if's physics.

## Design

- `lib/sim/types.ts`: `Sandbox.stack?: boolean` ("changes add up in one world; no split stage").
- `lib/sim/engine.ts`:
  - `applied: string[]` (ids in order). `fork()` resets it to `[id]`; new `change(id)` = `fork` when
    there is no changed world, else `applyToAlt(id)` + push. `dropFork()` and `restart()` clear it.
  - `rects()`: when `sb.stack`, one full-size rect showing `alt ?? base` (`alt: !!alt`). Drawing, the
    seam and the label follow from that; label = "Changed: " + labels joined with " + ".
  - `whatIfLabel()` joins applied labels. Timeline merging is unchanged (changed-world events show as
    what-if only).
- `components/console/panels.tsx` (`WhatIfList`, `Readouts`): when `stack`, a click calls
  `engine.change(id)`; pressed = id in `applied`; a "×n" count when repeated; readout column head
  "With changes". Other worlds keep calling `fork`.
- `components/console/Transport.tsx`: stack-mode labels for the close button and hint.
- `worlds/solar/interaction.ts`: throwing uses `engine.change("throw")`; the single rect makes the
  drag land in the shown world.
- `worlds/solar/sim.ts`, `worlds/galaxy/sim.ts`: `stack: true`; galaxy's Tune note already says settings
  apply at the next pick.
- Darkroom: no new tokens or components; the pressed state is the existing one. The stage label uses
  the existing amber chip.

## Steps

1. Engine + types: `stack`, `applied`, `change()`, single rect, label. Tests: stacking two what-ifs
   equals applying both to one clone; undo returns to base; non-stack worlds unchanged.
2. Console blocks: list, readouts, transport labels for stack mode.
3. Turn it on for solar and galaxy; solar throw.
4. Browser: stack 3 changes in each world, undo, throw a planet after a change; 375, 1024, 1440 widths.
5. Docs: fork-and-compare feature, both world READMEs, CLAUDE.md, this doc.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Visitors lose the side-by-side "aha" in these two worlds | Chart, readouts and timeline still compare against the hidden no-change world; an inset is listed as a follow-up. |
| Stacks that break the sim (e.g. galaxy at its 10-galaxy cap, solar with the Sun gone) | `apply()` already guards (free slots, missing bodies); test stacks of every pair for finite readouts. |
| Shared-code change affects other worlds | Everything is behind `sb.stack`; the existing test suite runs every world's what-ifs unchanged. |
| Long stacked labels | Trim to the chip width (as now) and show the full list in the what-if list's pressed states. |

## Verification

- [x] Automated: typecheck + tests (stacking, undo, every pair of what-ifs finite in solar and galaxy).
- [x] Manual: stacked 3 changes in solar and galaxy, threw a planet after changes, undo all; 375 px and desktop (light theme not re-checked; no new colours).
- [x] Docs updated.

## Log

- 2026-11-03 — proposed. User chose "one world, no split" for applying several changes at once.
- 2026-11-04 — approved and built. Engine `change()`/`applied`, single-rect stage, "Changed: …" label with
  "×n"; list heading "Make changes"; readout/chart legend "With changes"; "Undo all changes". The fork
  icon list stays; the close button keeps the × icon (a second restart icon next to Restart read as a
  duplicate). `tests/stack.test.ts` added (8 tests). Feature doc tier line clarified: several side-by-side
  what-if worlds stay premium; stacking into one world is free.
