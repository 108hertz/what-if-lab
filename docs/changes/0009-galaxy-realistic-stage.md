# 0009 — Galaxy world: a stage that looks like real galaxies

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** —
- **Decisions:** —
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

Galaxies is the first world tab and it already works (forks, what-ifs, readouts). But the stage does not
look like galaxies. Every star is the same 1.4 px square at 80 % opacity. Each galaxy is a flat disc of
even density with no bulge and no spiral arms, seen exactly face-on. Each core is a fixed 10 px glow. A
visitor who has seen a Hubble image of the Antennae or of Andromeda does not recognise what they are
looking at. The goal is a stage that reads as a photograph of interacting galaxies while staying
calm, deterministic and fast. Motion should show what is happening: arms that turn, a burst of new stars
when the galaxies pass through each other, and a flare when the cores merge.

## Scope

**In** (all in `worlds/galaxy/sim.ts`, plus this world's README):
- How stars are drawn: per-star brightness and size from a luminosity mix (many faint stars, few bright
  ones), additive light, and colour by stellar population (a warm old bulge, blue-white young stars in
  the disc).
- A soft diffuse glow: stars are also drawn into a quarter-resolution buffer that is blurred and added
  on top, so bulges, discs and tidal tails glow the way they do in long-exposure photos.
- A bulge and an exponential disc in place of the even disc. This changes where stars start.
- Spiral arms as a density wave. Stars lit by a rotating two-arm log-spiral pattern around their own
  galaxy's core look brighter and bluer. The arms fade out as a galaxy is disturbed and are gone in the
  merged elliptical.
- A camera tilted about 40° from face-on, so the discs appear as ellipses, as they do from Earth. The
  scale bar stays correct because only the vertical axis is compressed.
- A faint fixed background of distant stars and a few far galaxies. Placement comes from an index
  hash, not from the RNG.
- Cores drawn as a glow sized by mass, with a merger flare that fades over about 200 Myr of sim time.
- A starburst: when two cores pass within the close-passage range, a hashed subset of stars in the
  colliding discs shows pink star-forming knots, which fade afterwards.
- Fix the leftover 11 px scale-bar label to the 12 px type token.

**Out:**
- Gravity, time step, what-ifs, metrics and copy. They are unchanged. Only the starting positions of
  stars change (bulge + exponential disc).
- The shared engine, the fork split animation, `components/console/` and the other worlds.
- A Web Worker or WebGL renderer.

## Design

- **Determinism:** every visual variation comes from a hash of the star index or from `w.t`. Nothing
  uses wall-clock time or `Math.random()`. A paused world draws the same frame every time, and the
  base and what-if halves animate in step with their own sim time.
- **World data:** `Core` gains `dir` (rotation sense, for trailing arms), `mt` (merge time, for the
  flare) and `pt` (last close-passage time, for the starburst). All are plain numbers, so the world
  stays `structuredClone`-able.
- **Init:** a bulge with about 20 % of stars (Plummer-like, r < 0.35) plus an exponential disc
  (scale length 0.4, cut at 1.4). Velocities use the same circular-speed formula as today, so the
  physics still matches the model notes.
- **Rendering per frame:** clear to `STAGE.void` → background field (cached per stage size) → glow
  buffer (dots at 1/4 resolution, blurred with `ctx.filter` and drawn back with `lighter`; browsers
  without canvas `filter` get a plain bilinear upscale) → star sprites (one cached radial sprite per
  colour, drawn with `drawImage` and `lighter`) → core glows → scale bar. The buffers are module-level
  `OffscreenCanvas` objects (worker-safe, not DOM).
- **Colours:** star colours are physical (warm `#FFD9A8` bulge, cream disc, `#BCD0FF` young, `#FF8FB0`
  H II knots). Galaxy ownership stays readable through a light tint per galaxy, as now. These are stage
  data colours, not chrome, so no token changes.
- **Performance budget:** at most 1 500 stars × 3 galaxies × 2 halves ≈ 9 000 sprite draws plus one
  blur per half. Target: under 4 ms a frame on an M1 at 1440 × 900 and no dropped frames on a mid-range
  phone. If the blur is too slow on phones, skip it below 768 px.

## Steps

1. Init: bulge + exponential disc; add `dir`/`mt`/`pt` to `Core`. Tests stay green, including
   determinism.
2. Renderer: sprites, population colours, additive blending, tilt, background field, scale-bar font.
3. Glow buffer with fallback.
4. Motion: density-wave arms, starburst knots, merger flare, all driven by sim time.
5. (Added while building) A camera that eases in as the cores close (`w.cam`, eased in `step`), and a
   glow scaled with zoom, because at a fixed 8.5-unit view the discs were too small for arms to show.
6. Check in the browser at every console size, split and single, at all four speeds. Update the world
   README's "What excellent means".

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A new star distribution changes the readout numbers (disc %, thrown %) | The tests check finiteness and determinism, not fixed values. Check by eye that the default story (pass → tails → merge) still happens. |
| Additive light blows out to white in the merged core | Cap the per-star alpha and scale it with the star count. Check the merged frame at 1 500 stars. |
| Canvas blur is slow on phones | Use a quarter-resolution buffer, skip it below 768 px if needed, and measure. |
| "More real" competes with the fork moment | No UI motion is added. All motion is inside the sim and runs on sim time, so pausing freezes it. |
| Galaxy identity lost when colours become physical | Keep a light per-galaxy tint, and keep the cores as anchors. |

## Verification

- [x] Automated: `npm run typecheck && npm test` (every what-if, determinism): 55/55 pass.
- [ ] Manual: checked 375×812, 800×600, 1280×800 and 1440×900 (no page scroll), single and split (third
  galaxy), 50 and 150 Myr/s, through passage and merger. Not checked: 768×1024, 1024×768, the other
  what-ifs by eye, light theme, pause.
- [x] Performance: 16.7 ms average, 17.6 ms p95 frame interval in a split with 3 galaxies at 1280×800 (dev build, M-series Mac). Not measured on a phone.
- [x] Docs: world README "What excellent means" written; this doc set to shipped.

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — approved; in progress.
- 2026-11-02 — shipped. Added the easing camera (step 5) after the first render showed discs too small for arms. Readout numbers shift (bulge + disc), and the event story is unchanged: first pass at 1.1 Gyr, merger at 1.4 Gyr.
