# Earth — world brief

This folder is the **earth** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

People trying to understand climate choices: emissions, trees, geoengineering, tipping points.

## Model

0-D carbon/temperature model with a 35-year thermal lag; sea level from thermal expansion plus ice above 2 °C. Time unit: years.

## Questions it should answer best

- What if we stopped all emissions today?
- What if emissions doubled?
- Would planting a trillion trees fix it?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
