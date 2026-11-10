# Space camera: zoom, pan, 3D view

- **Status:** planned
- **Tier:** free
- **Owner area:** `lib/sim` · `components`
- **Changes:** [0036](../changes/0036-space-camera-3d.md)

## What it is

In the Solar System and Galaxies worlds you can zoom in and out, move the view, and turn it in 3D — from
looking straight down on the orbits to seeing them edge-on.

## Why

Experience and time on page for the two most-searched worlds (PLAN.md: traffic). Worked if sessions in these
worlds get longer and people use the view bar.

## Behaviour

- Wheel / pinch zoom towards the pointer; drag rotates; right-drag, Shift-drag or two fingers pan; double-click resets.
- Keys: `+` / `−` zoom, arrows rotate, `0` reset.
- View bar on the stage: Top · Tilted · Edge-on, zoom − / +, Follow; solar adds Look / Throw.
- The camera is view only: it never changes the simulation, forks, replays, tests or exports.
- The physics stays flat (all orbits in one plane); depth you see when tilting is drawn, not simulated.

## Out of scope

3D physics; camera in exports or share links; other worlds.

## Acceptance checks

- [ ] Zoom, rotate, pan and reset work with mouse, trackpad, touch and keys.
- [ ] Throwing a planet works at any angle in Throw mode.
- [ ] `npm test` determinism unchanged.
