# Space catalogues: pick a star system or galaxy, compare sizes

- **Status:** planned
- **Tier:** free
- **Owner area:** `worlds/solar` · `worlds/galaxy`
- **Changes:** [0037](../changes/0037-solar-star-systems.md), [0038](../changes/0038-galaxy-catalogue.md)

## What it is

Choose which real star system (TRAPPIST-1, Proxima Centauri, Kepler-16 with two suns…) or which two galaxies
(Milky Way, Andromeda, M87, IC 1101…) to simulate, and see how big each one is next to the others.

## Why

Traffic: each real system or galaxy is a question people search ("what if Earth orbited TRAPPIST-1?").

## Behaviour

- Picker in "Starting world"; picking restarts the world (like other starting settings).
- A Compare sizes panel: log-scale bars with star mass / star count / mass and planet count.
- Values are rounded real estimates, marked as such; sim scaling caps (e.g. IC 1101's mass) are stated.
- Default picks (Solar System; Milky Way + Andromeda) reproduce today's worlds exactly.

## Out of scope

Universes (the /scale explorer covers that zoom); per-system what-if landing pages (later).

## Acceptance checks

- [ ] Every system / galaxy × every what-if runs with finite metrics (`npm test`).
- [ ] Default runs unchanged.
