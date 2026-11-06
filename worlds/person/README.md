# Character — world brief

This folder is the **person** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `data.ts` | Habit effects. |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Self-improvement readers asking whether a habit would stick and what it would change.

## Model

100 parallel versions of one person; daily quit hazard high early, falling after ~66 days for good habits. Habit effects in `data.ts`.

Habits stack (change 0024): every pick adds a habit to `w.hs`; each version keeps or drops each one on its own and the
effects add up ("Still doing it" is the average over the habits). Picking a habit that is already going starts it again
for everyone. Any habit can be ticked off and on again in "Your changes".

## Questions it should answer best

- What if I exercised 30 minutes a day?
- What if I quit social media?
- How many versions of me would still be doing it in a year?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
