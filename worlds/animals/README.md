# Animals — world brief

This folder is the **animals** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `data.ts` | Species table. |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Visitors who love Primer-style evolution sims and want to see a species adapt or collapse.

## Model

Agents with heritable speed, size and senses; cost ∝ size³·speed² + senses; mutation σ 7%. Stabilisers: cover patches, predator territory cap (nc < nh/4), 30% hunt success, recolonisation. Species in `data.ts`; scale-explorer links preset the species (`meta.presetParam`).

## Questions it should answer best

- What if the climate warms 3 °C?
- What if half the habitat disappears?
- What if a disease wipes out 40%?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
