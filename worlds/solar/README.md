# Solar system — world brief

This folder is the **solar** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `interaction.ts` | The stage's input: the space camera (change 0036) with drag-to-throw as its second tool. |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

Students and space fans asking "what if the Sun…" questions — the most searched what-ifs.

## Model

Leapfrog N-body, G = 4π² (AU, yr, M☉), dt ≤ 0.0015 yr; bodies merge on collision radius. With the view bar on Throw, a drag on the stage throws a planet onto the orbital plane (`interaction.ts`); on Look it turns the view.

**Camera** (change 0036): zoom, pan, Top / Tilted / Edge-on. The physics is planar; tilted views draw each planet's real
inclination (`INC` in `sim.ts`, draw only). The "View" setting is the starting zoom.

**Star systems** (change 0037): the "Star system" picker (`data.ts`: Solar System, TRAPPIST-1, Proxima Centauri,
Kepler-90, Kepler-11, 55 Cancri, Kepler-16, Alpha Centauri A + B) starts the world over with that system; planets start
on circular orbits at seeded random angles. Binaries orbit their centre of mass (Alpha Centauri at its real 0.52
eccentricity, started at its widest). The metrics follow the system's watched planet (`watch`) and the star(s) it orbits.
The sub-step is 1/160 of the shortest year (0.0015 yr in the Solar System, as before), at most 4,000 sub-steps per step.
Other systems say the what-ifs for their own star and planet through `reword()` ("The star doubles in mass", "TRAPPIST-1 e
stops in its orbit"); "ignites" is hidden where there is no giant planet. The Solar System's run and words are unchanged.
"Compare sizes" (`Compare.tsx`, under the settings) shows every system's outermost orbit on a log scale; a row picks it.

**Changes add up** (change 0015; every change can be ticked off and on in "Your changes", change 0024): one world on the stage; every what-if and every thrown
planet is applied to the same changed world. The no-change world runs hidden for the chart, readouts and
timeline; "Clear the list" returns to it.

## Questions it should answer best

- What if the Sun disappeared / doubled / became a red giant?
- What if Earth stopped in its orbit?
- What happens if I throw a planet in?
- What if Earth orbited TRAPPIST-1 / Alpha Centauri? What would two suns do? How big is TRAPPIST-1 next to us?

## What "excellent" means here

_To be written in this world's own change doc (see docs/changes/0008 → "After this")._
