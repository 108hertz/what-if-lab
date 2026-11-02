# Countries — world brief

This folder is the **country** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `data.ts` | Country presets and names. |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Policy-curious visitors comparing education, corruption, UBI, war and migration.

## Model

Aggregate growth model plus 260 household agents (tax, corruption skim, yard-sale trades); Gini and poverty emerge from the agents and feed back into stability. Presets in `data.ts`.

## Questions it should answer best

- What if a country doubled education spending?
- What does cutting corruption in half do to inequality?
- What happens with universal basic income?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
