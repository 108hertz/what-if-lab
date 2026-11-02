# Galaxies — world brief

This folder is the **galaxy** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Space-curious visitors who have heard the Milky Way will collide with Andromeda and want to see it.

## Model

Test-particle stars around softened point-mass cores; crude dynamical friction merges the cores. Time unit: 100 Myr.

## Questions it should answer best

- What happens when Andromeda hits us — and what if it missed?
- What does dark matter actually do to a galaxy?
- What if a giant black hole sat at our centre?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
