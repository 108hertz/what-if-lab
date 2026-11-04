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
Each galaxy starts as a compact bulge (15 % of stars) plus an exponential disc (change 0009).
Variables: stars, Andromeda mass, dark matter, approach speed (km/s), aim off-centre (kly) and Andromeda's spin
(change 0010). The defaults reproduce the original path. Seven speeds, 5 Myr/s–1 Gyr/s, use the transport stepper.

Change 0011 added Andromeda's shape (spiral or elliptical), neighbours at start (Triangulum, the LMC), a
"Galaxies left" metric and twelve what-ifs in all: the original six plus more galaxies falling in, a dwarf
punching through our centre (an expanding ring, like the Cartwheel), a galaxy shooting straight through,
Andromeda stopping dead or turning around, and the Milky Way spinning the other way. **What-if settings**
are live sliders (count and size of incoming galaxies, fly-through speed, black hole mass, gravity left
without dark matter): they don't restart the world and apply at the next fork. Up to 10 galaxies and a
4,000-star budget; owner indices are never reused, so tints (`TINT`, 10 colours) and events stay stable.
The camera follows cores within 640 kly of the heaviest; escapees leave the view.

## How the stage is drawn (change 0009)

Like a long-exposure telescope photo, with everything derived from star-index hashes and sim time (never the RNG):
additive star sprites with a luminosity spread, colour by population (warm bulge, cream and blue disc stars,
pink star-forming knots), a blurred glow buffer whose surface brightness stays constant as the camera zooms,
discs tilted about 40°, a fixed far-field backdrop, and a camera (`w.cam`) that eases in as the cores close.
Motion: a two-arm density wave turns and fades as galaxies are disturbed, a starburst follows each close
passage (`Core.pt`), and merged cores flare (`Core.mt`). Pausing freezes all of it.

## Questions it should answer best

- What happens when Andromeda hits us — and what if it missed?
- What does dark matter actually do to a galaxy?
- What if a giant black hole sat at our centre?
- What happens when a whole group of galaxies falls together, or a small one hits us dead centre?

**Changes add up** (`stack: true`, change 0015): one world on the stage; every what-if is applied to the
same changed world (a black hole *and* two more galaxies, say), with the what-if settings read at each
pick. The no-change world runs hidden for the chart, readouts and timeline; "Undo all changes" returns
to it.

## What "excellent" means here

Someone who has seen a Hubble image recognises what they are looking at: spiral discs at an angle,
bright bulges, tidal tails and a starburst when the galaxies pass through each other, then a smooth
elliptical. The story (pass → merge) and every what-if read at a glance, at 60 fps, on a phone.
