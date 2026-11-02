# Child — world brief

This folder is the **child** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `data.ts` | Big Five traits, parenting styles, life events. |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Parents and parents-to-be asking how much parenting, siblings and life events shape a child.

## Model

Trait = 50 + 0.45·(midparent − 50) + noise σ9 + age-weighted environment + maturation curves + life-event deltas that partly fade. 120 children per world. Big Five data in `data.ts`.

## Questions it should answer best

- What if the parents switch to warm-and-firm parenting?
- What does a younger sibling or a divorce change?
- How much does chance matter?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
