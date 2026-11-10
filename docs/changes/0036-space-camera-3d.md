# 0036 — Space camera: zoom, pan and a 3D view in the solar and galaxy worlds

- **Status:** proposed
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [Space camera](../features/space-camera.md)
- **Decisions:** —
- **Created:** 2026-11-10 · **Shipped:** —
- **Followed by:** [0037 solar: pick a star system](./0037-solar-star-systems.md), [0038 galaxy: pick the galaxies](./0038-galaxy-catalogue.md)

## Why

Space fans want to look around: zoom into the inner planets, pull back to see the whole system, tilt the
view to see orbits edge-on, turn a merging galaxy pair to see its tidal tails from the side. Today both
stages are fixed: solar has a "View" select (inner / to Jupiter / whole), galaxy has an automatic camera
and a fixed 40° tilt. A free camera makes the two most-searched worlds feel like a real simulator
(Universe Sandbox is the reference) and keeps people on the page longer.

## Scope

**In:**
- A shared, framework-free orbit camera (`lib/sim/camera.ts`): target point, distance (zoom), yaw, pitch;
  projects a 3D point to the screen with perspective and gives depth for sorting/fading; unprojects a
  screen point onto the orbital plane (z = 0).
- Gestures on the stage, shared (`components/console/StageCamera.ts`, a `StageInteraction` helper):
  wheel / pinch = zoom (towards the pointer), drag = rotate, right-drag / Shift-drag / two-finger drag = pan,
  double-click = reset view. Keyboard: `+`/`−` zoom, arrows rotate, `0` reset.
- A small on-stage view bar (top-right, Control Room style): **Top · Tilted · Edge-on** presets, zoom − / +,
  **Follow** (re-centre on the action, as today), and in solar a **Look / Throw** switch.
- **Solar:** the "View" select goes; zoom covers it (presets "Inner planets / To Jupiter / Whole system" become
  zoom stops in the view bar). The squeezed "inner" scale (r^0.55) stays as an option "Squeeze distances"
  so Mercury–Mars stay visible next to Jupiter; true scale when off. Throwing a planet works in any view by
  dropping onto the orbital plane. Small orbital inclinations are drawn (draw-only, from real inclinations),
  so a tilted view shows something real.
- **Galaxy:** stars get a third coordinate for drawing only — disc thickness and a round bulge, derived from
  the star-index hash (never the RNG) — and the disc tilt becomes the camera's pitch. Auto-camera stays as
  **Follow** (on by default); zooming or panning turns Follow off until pressed again.
- The camera lives in `engine.ui` (UI state), never in the world: it can't change the sim, a fork, a replay or
  a test. Exports keep their current fixed framing (they read no camera); a later change may add "use my view".

**Out:**
- **3D physics.** Both sims stay planar (all motion in z = 0). The 3D view is a real camera on that plane plus
  draw-only depth. True 3D N-body (inclined orbits that precess, galaxies colliding at an angle) is a bigger,
  separate change; it would alter every what-if's result and the frozen what-if pages (0033).
- Camera in exports, camera in shareable URLs.
- Other worlds.

## Design

```
lib/sim/camera.ts        Cam3 = { tx, ty, tz, dist, yaw, pitch, fov }; project(cam, x, y, z, W, H) → [sx, sy, depth, scale];
                         toPlane(cam, sx, sy, W, H) → [x, y] | null; presets; clamp rules. Pure TS, tested.
lib/sim/types.ts         InteractionState gains `view: ViewState | null` ({ cam: Cam3, follow: boolean, mode?: "look" | "throw" }).
                         The existing 2D `Camera` in `cams` stays for solar's throw.
components/console/      StageCamera.ts — gesture → camera (wheel, pinch, drag, pan, dbl-click, keys); composes with a
                         world's own StageInteraction (solar's throw runs when mode = "throw").
                         ViewBar.tsx — the on-stage buttons (children of <Stage>), strings in console.json.
worlds/solar/            sim.ts draw() reads ui.view (falls back to today's framing when null: exports, tests);
                         data for inclinations; interaction.ts throws via toPlane(); Console.tsx adds <ViewBar>.
worlds/galaxy/           sim.ts draw() projects stars through the camera; z from hash; glow buffer kept (drawn after
                         projection); Console.tsx adds <ViewBar>. w.cam stays the Follow target.
```

Drawing rules: perspective is gentle (fov ≈ 35°) so sizes still read; far things dim slightly (depth cue);
labels never overlap the view bar. Orbit trails are projected too. Pitch is clamped to 0–90° (top to edge-on)
and yaw is free. Zoom limits per world (solar: 0.05–80 AU half-width; galaxy: 0.3–20 units).

Mobile: one-finger drag rotates, pinch zooms, two-finger drag pans; in solar's Throw mode one finger throws.
The view bar collapses to one "View" button opening a small menu below 768 px.

## Steps

1. `lib/sim/camera.ts` + tests (project/unproject round trip, presets, clamps).
2. `InteractionState.view`, `StageCamera` gestures, `ViewBar`; English strings + all 20 locales.
3. Solar: camera drawing, inclinations, squeeze option replaces the View select, throw via `toPlane`.
4. Galaxy: draw-only z, camera projection with the glow buffer, Follow.
5. Docs: feature doc, world READMEs, CLAUDE.md model notes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Drag used to throw in solar; users lose it | Look / Throw switch; **Look** is the default and the hint says "Switch to Throw to add a planet". |
| Galaxy at 4,000 stars + glow at 60 fps on phones | Projection is a few multiplies per star; keep the glow buffer at ¼ size; measure on a mid phone. |
| Removing solar's "View" param changes URLs / question pages | `view` param kept as a hidden alias that sets the initial zoom; question pages render the default view. |
| Exports look different from what the user framed | Stated in the export dialog for now; "use my view" listed as a follow-up. |

## Verification

- [ ] Automated: camera tests; existing determinism tests unchanged (camera never reaches the sim); a test that
      `draw()` with `ui.view = null` matches today's framing.
- [ ] Manual: mouse, trackpad pinch, touch (375 px), keyboard; light + dark; full screen; 60 fps check.
- [ ] Docs: feature doc, READMEs, PLAN.md.

## Log

- 2026-11-10 — proposed.
