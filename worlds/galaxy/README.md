# Galaxies — world brief

This folder is the **galaxy** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw). Framework-free, deterministic. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `data.ts` | Known galaxies (change 0038): diameter, stars, mass, kind; `pairOf()` turns two picks into starting values. |
| `Compare.tsx` | "Compare sizes" under the settings (change 0038). |
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

**Galaxy catalogue** (change 0038): "Our galaxy" and "Incoming galaxy" pick from `data.ts` and start the world over.
The sim stays relative to our galaxy (core mass 1, disc scale 1; the length unit is our diameter / 100 kly × 40 kly). A pick
pre-fills the incoming mass (ratio capped 1/20…20×), size (√ of the diameter ratio, 0.3–2.5×, Andromeda kept at 1) and
shape (spiral, elliptical, or irregular: no bulge, even spread, clumpy look). Star softening scales with the incoming disc.
Stars stay 900 + 900 while masses are within 2×; otherwise the heavier gets more (≥ 200 each). Event lines name the picks
through `{ours}` / `{them}` refs; what-ifs that name Andromeda or the Milky Way are reworded only for other picks. The
default pair's run is pinned by `tests/galaxy-catalogue.test.ts`.

## How the stage is drawn (change 0009)

Like a long-exposure telescope photo, with everything derived from star-index hashes and sim time (never the RNG):
additive star sprites with a luminosity spread, colour by population (warm bulge, cream and blue disc stars,
pink star-forming knots), a blurred glow buffer whose surface brightness stays constant as the camera zooms,
discs tilted about 40°, a fixed far-field backdrop, and a camera (`w.cam`) that eases in as the cores close.
Motion: a two-arm density wave turns and fades as galaxies are disturbed, a starburst follows each close
passage (`Core.pt`), and merged cores flare (`Core.mt`). Pausing freezes all of it.

## Camera (change 0036)

Zoom, pan and turn the view (Top / Tilted / Edge-on); the default is the old 40° tilt, following the action. The sim is
planar; each star's height is drawn only (`depth()` in `sim.ts`, from its index hash): thin discs that puff up as they are
disturbed or merged, round bulges and ellipticals.

## Questions it should answer best

- What happens when Andromeda hits us — and what if it missed?
- What does dark matter actually do to a galaxy?
- What if a giant black hole sat at our centre?
- What happens when a whole group of galaxies falls together, or a small one hits us dead centre?
- What if the Milky Way hit IC 1101, or the Whirlpool? How big is Andromeda next to us? (change 0038)

**Changes add up** (change 0015; every change can be ticked off and on in "Your changes", change 0024): one world on the stage; every what-if is applied to the
same changed world (a black hole *and* two more galaxies, say), with the what-if settings read at each
pick. The no-change world runs hidden for the chart, readouts and timeline; "Clear the list" returns
to it.

## What "excellent" means here

Someone who has seen a Hubble image recognises what they are looking at: spiral discs at an angle,
bright bulges, tidal tails and a starburst when the galaxies pass through each other, then a smooth
elliptical. The story (pass → merge) and every what-if read at a glance, at 60 fps, on a phone.
