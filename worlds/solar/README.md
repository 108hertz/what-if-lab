# Solar system — world brief

This folder is the **solar** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `interaction.ts` | Drag-to-throw on the stage (`StageInteraction`). |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Students and space fans asking "what if the Sun…" questions — the most searched what-ifs.

## Model

Leapfrog N-body, G = 4π² (AU, yr, M☉), dt ≤ 0.0015 yr; bodies merge on collision radius. Drag on the stage throws a planet (`interaction.ts`).

## Questions it should answer best

- What if the Sun disappeared / doubled / became a red giant?
- What if Earth stopped in its orbit?
- What happens if I throw a planet in?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
