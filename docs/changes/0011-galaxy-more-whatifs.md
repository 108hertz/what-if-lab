# 0011 — Galaxy world: more what-ifs, more galaxies, settings for each

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** —
- **Decisions:** —
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

The galaxy world has six what-ifs. Each one is fixed: the black hole always weighs 1.5 Milky Ways, dark
matter always drops to 30 %, and "a third galaxy" is always one Triangulum on one path. The user asked
for more what-ifs (for example, more galaxies) and for the options to vary widely, set however the
visitor likes. Galaxy groups, ring galaxies, fast fly-throughs and minor mergers are real and photogenic,
and a model of point-mass cores with test-particle stars can show them all.

## Scope

**In** (all in `worlds/galaxy/`):

- **Six new what-ifs**, added to the current six (12 in all):
  | id | Label | What happens at the fork |
  | --- | --- | --- |
  | `swarm` | More galaxies fall in | *Count* galaxies of *size* fall in from evenly spaced directions around the group |
  | `ring` | A small galaxy punches through our centre | A compact dwarf drops straight through the Milky Way's core; the disc rebounds into an expanding ring, like the Cartwheel galaxy |
  | `bullet` | A galaxy shoots straight through | A galaxy of *size* crosses the scene at *speed*: too fast to merge, it tears tidal tails as it passes |
  | `stop` | Andromeda stops dead | Andromeda's motion relative to us is removed; it falls straight in |
  | `reverse` | Andromeda turns around | Its relative velocity is flipped; it heads away and may never come back |
  | `flipmw` | The Milky Way spins the other way | Our stars reverse their orbits around our core (changes which tails form) |
- **Existing what-ifs become adjustable** through the new settings: `nodm` uses *dark matter left*,
  `bh` uses *black hole mass*, `third` uses *size*. With the default settings they behave exactly as now.
- **What-if settings**: a new "What-if settings" heading in Tune, below the six world variables. These
  controls are `live`: moving them does not restart the world, they are used at the next fork (click a
  what-if again to re-fork with new settings).
  | Setting | Range | Default | Used by |
  | --- | --- | --- | --- |
  | Galaxies that fall in | 1–6 | 3 | swarm |
  | Their size | 0.1–1.5 × Milky Way, step 0.05 | 0.45 | swarm, bullet, third |
  | Fly-through speed | 200–1,500 km/s, step 50 | 800 | bullet |
  | Black hole mass | 0.1–4 × Milky Way, step 0.1 | 1.5 | bh |
  | Gravity left | 0–90 %, step 5 (0 acts as 5 %) | 30 | nodm |
- **Two new world variables** (they restart the world, like the current six):
  | Variable | Options | Default |
  | --- | --- | --- |
  | Neighbours at start | None · Triangulum · Triangulum + Large Magellanic Cloud | None |
  | Andromeda's shape | Spiral · Elliptical (a smooth ball of old stars on random orbits) | Spiral |
- **One new metric:** "Galaxies left" (number of separate cores), so swarms and mergers read on the chart.
- Rendering for more than three galaxies: per-galaxy tints for up to 10 galaxies, and a camera that can
  zoom out further when the group is spread wide.

**Out:**

- New physics. Cores and stars move by the same rules; new what-ifs only add cores and stars or change
  velocities and masses at the fork moment.
- Engine changes. Live settings already exist in the `Control` type; changing a setting while a what-if
  is open does not re-fork by itself. (One shared-UI line did change while building, see Log.)
- Visitor-placed galaxies (click to drop one). Possible later, like solar's "throw a planet".

## Design

- **Defaults reproduce today exactly.** No neighbours and a spiral Andromeda give the same `init`
  (same RNG calls in the same order). Each existing what-if with default settings gives the same world as
  now. The tests already cover every what-if and determinism.
- **More galaxies:** `addGalaxy(w, x, y, vx, vy, m, dir, n, owner)` already appends cores and stars.
  Owners stay `Uint8Array`; at most 10 galaxies exist at once (Milky Way, Andromeda, two neighbours, six
  falling in), so a swarm adds at most `10 − galaxies so far`. A smaller galaxy gets fewer stars:
  `round(stars × clamp(size / 0.9, 0.15, 0.6))` (so today's third galaxy keeps half the stars), at least
  40, within a 4,000-star budget.
- **Swarm paths:** galaxy *i* of *count* starts 7 units (280 kly) from the group's centre of mass, at
  angle `TAU·i/count` plus a fixed offset, moving inward at about 0.6 × circular speed with a sideways
  part so each one orbits in instead of hitting the centre head-on. Spin direction alternates.
- **Ring:** a compact dwarf (0.5 × Milky Way, 120 stars, small radius) placed 2.5 units above our core
  and moving straight at it at 0.9 units per 100 Myr. Passing through the centre pulls the disc stars
  inward and they rebound outward together: an expanding ring. If our core has merged already, it
  targets the merged core.
- **Bullet:** starts 8 units out on one side, aimed 2 units (80 kly) to the side of the centre of mass,
  at *speed* (km/s converted with the same factor as approach speed: 110 km/s ≈ 0.297 units).
- **Elliptical Andromeda:** all its stars use the bulge recipe with a wider radius (r up to 1.1) and
  random orbit direction per star, so `k = 0` and no arms are drawn. Same mass and core.
- **Neighbours:** Triangulum (0.45 × Milky Way, the same path as today's `third`) and the Large
  Magellanic Cloud (0.1 × Milky Way, 4 units ≈ 160 kly from our core on a near-circular orbit).
- **Camera:** follows the cores within 16 units (640 kly) of the heaviest one, zooming out to a 14-unit
  half-width (was 9.5). A galaxy that escapes the group leaves the view instead of shrinking it.
- **Events:** stable text per event, e.g. "3 more galaxies fall in", "A dwarf galaxy punches through
  our centre", "The disc rebounds into a ring of new stars" (logged once when most disc stars move
  outward together after a ring pass), "A galaxy shoots straight through at 600 km/s".
- **Tune column:** 8 world variables + a heading + 5 settings. The column and the phone dock already
  scroll internally with a fade mask, so the page still does not scroll. A select that reads
  "Neighbours at start" stays one row.
- **Colours:** `TINT` grows to 10 light tints (stage data colours, as in 0009). Galaxy identity is still
  carried by position and cores, not colour alone.

## Steps

1. Settings and the two variables: controls, the elliptical recipe, neighbours, the `galaxies` metric;
   existing what-ifs read their settings. Check defaults reproduce today (start state, event times).
2. New what-ifs: swarm, ring, bullet, stop, reverse, flipmw; tints and camera range for many galaxies.
3. Browser: fork every what-if once at default and at extreme settings; frame time with 6 falling
   galaxies at 1,500 stars; no page scroll at 375×667, 768×1024, 1024×768, 1280×800, 1440×900.
4. Docs: world README (variables, what-ifs, settings), CLAUDE.md model note, close this doc.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A swarm at 1,500 stars is slow (more stars × more cores per sub-step) | Fewer stars for smaller galaxies, a total cap near 5,000, measure at 1 Gyr/s. |
| 14 rows crowd Tune at 1024–1279 and on phones | It already scrolls internally; check the fade mask and that the heading separates the groups. |
| Visitors don't see that a setting needs a re-click | The heading says "What-if settings"; the settings sit right after the variables; the pressed what-if re-forks on click. Revisit if it confuses. |
| The ring doesn't read as a ring at default settings | Tune the dwarf mass and speed in step 2 until it does; it is the reason the what-if exists. |
| Swarm galaxies fly off instead of falling in at small sizes | Inward speed scales with the group's mass, not theirs; check count 1 and 6, size 0.1 and 1.5. |

## Verification

- [x] Automated: `npm run typecheck && npm test` (55/55, every what-if, determinism). Every old what-if
  gives exactly the old readouts and event times at default settings (seed 20261101, fork at 0.5 Gyr).
- [x] Manual: swarm, ring and bullet forked in the browser; extremes (6 × 1.5 size, 0.1 size, black hole
  0.1–4, gravity left 0–90 %, neighbours, elliptical) checked in a headless run. No page scroll at
  375×667, 768×1024, 1024×768, 1280×800, 1440×900; Tune scrolls inside the phone dock. Not done:
  light theme; stop, reverse and flipmw forked by eye (checked in the headless run only).
- [x] Performance: 60 fps (16.7 ms average) with a fly-through at 1440×900. Worst case (1,500 stars,
  both neighbours, six 1.5× galaxies, 1 Gyr/s): two long tasks of about 60 ms in 3 s while ten cores
  merge, then 60 fps. Not measured on a phone.
- [x] Docs: world README, CLAUDE.md, this doc closed.

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — approved; in progress.
- 2026-11-02 — shipped. Changes from the plan, each measured: the fly-through was captured by
  dynamical friction at 600 km/s aimed 40 kly off-centre, so it now aims 80 kly off and defaults to
  800 km/s (range up to 1,500; slow settings get captured, which is a fair answer). The ring dwarf went
  from 0.3 to 0.5 × Milky Way: the outward-moving ring (25 → 75 kly over about 300 Myr) gets twice the
  contrast. The LMC started inside the friction range and was swallowed in 0.66 Gyr, so it now starts at
  its real distance. "Dark matter left" became "Gravity left", and the event says "Some dark matter
  vanishes" above 50 %. The star budget dropped from 5,000 to 4,000 after the worst-case test. The shared
  Tune note ("Changing these restarts the world.") now says what-if settings apply at the next fork, but
  only for worlds with live sliders (galaxy); other worlds are unchanged.
