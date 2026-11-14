# Space catalogues: pick a star system or galaxy, compare sizes

- **Status:** in-progress (star systems built in 0037, galaxies in 0038; build and manual checks pending)
- **Tier:** free
- **Owner area:** `worlds/solar` · `worlds/galaxy`
- **Changes:** [0037](../changes/0037-solar-star-systems.md), [0038](../changes/0038-galaxy-catalogue.md)

## What it is

Choose which real star system (TRAPPIST-1, Proxima Centauri, Kepler-16 with two suns…) or which two galaxies
(Milky Way, Andromeda, M87, IC 1101…) to simulate, and see how big each one is next to the others.

## Why

Traffic: each real system or galaxy is a question people search ("what if Earth orbited TRAPPIST-1?").

## Behaviour

- Picker in the settings ("Star system"); picking one starts the world over at time 0 with no changes (a different world,
  not a different start: the select's `fresh` flag). Each system starts at a speed that suits it (TRAPPIST-1: 1 day a second).
- Other systems name their own star and watched planet in what-ifs and metrics; "ignites" shows only where a giant planet exists.
- Galaxy world: "Our galaxy" and "Incoming galaxy" pickers (Milky Way, Andromeda, Triangulum, both Magellanic Clouds,
  Whirlpool, Pinwheel, Sombrero, M87, IC 1101). Picking either starts over and pre-fills the incoming galaxy's mass, size and
  shape relative to ours; event lines and what-ifs name the picked galaxies.
- A Compare sizes panel: log-scale bars (orbit size for star systems, diameter for galaxies) with star mass / star count /
  mass and planet count; a row picks that system or incoming galaxy.
- On phones (< 1024 px) a chip on the stage names the running system or pair ("Solar System", "Milky Way + Andromeda (M31)")
  and opens Compare sizes in its own sheet; picking a row closes it. The pickers themselves stay in Tune.
- Values are rounded real estimates, marked as such; sim scaling caps (e.g. IC 1101's mass) are stated.
- Default picks (Solar System; Milky Way + Andromeda) reproduce today's worlds exactly.

## Out of scope

Universes (the /scale explorer covers that zoom); per-system what-if landing pages (later).

## Acceptance checks

- [x] Every star system × every what-if it offers runs with finite metrics; each system stable for 100 watched-planet
      years (at most 10 Earth years) — `tests/solar-systems.test.ts`.
- [x] Default solar run unchanged (pinned readouts from before 0037; every what-if's event log byte-identical when checked).
- [x] Every galaxy as incoming × every what-if, and every galaxy as ours, runs with finite metrics; default galaxy run
      byte-identical to before 0038 — `tests/galaxy-catalogue.test.ts`.
