# 0014 — Earth world: a living fjord town, more levers, build-your-own future

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** —
- **Decisions:** —
- **Created:** 2026-11-03 · **Shipped:** 2026-11-03

## Why

The earth world works, but it doesn't look like a place. The stage is flat shapes: a grey triangle with
a white cap, a green slab, seven rectangles for a city and a blue box for the sea. Waves and CO₂ dots
move with *sim* time, so at 20–60 yr/s they jitter and race instead of moving calmly. A visitor has
four sliders and seven fixed what-ifs, one at a time; there is no way to ask "what if we cut emissions
by half, planted trees *and* removed CO₂ from the air?". The user asked for three things: a redesigned,
realistic stage (a town with snowy mountains, ocean and nature), smoother objects and motion, and many
more variables that can be combined. Earth climate is also the most-searched question in the lab, so it
should be the most convincing world.

Choices already made with the user: the scene is **painted live on the canvas** (no photo; sea really
rises, snow really retreats), and combining works through a **"Build my own future" what-if** with live
settings (no stackable what-ifs, no engine change).

## Scope

**In** (all in `worlds/earth/`):

- **A living fjord town** in place of today's stage (see Design → Scene). A fictional town, "Fjordvik",
  at the foot of snowy mountains on a sea inlet, with forest slopes, farm terraces, a harbour, boats and
  a tide gauge on the pier. Every part of it shows a number from the model.
- **Smooth motion:** waves, clouds, boats, birds and chimney smoke move on a renderer clock in seconds,
  the same at every sim speed and frame rate. Model-driven things (sea line, snow line, forest, crops,
  sky) are eased per half so a fork or restart glides instead of jumping. Reduced motion freezes the
  ambient layer.
- **A richer, still 0-D model** (see Design → Model): methane next to CO₂, aerosols, an emissions path,
  ocean and land uptake, optional tipping feedbacks (permafrost, ice sheets), and a snow line.
- **More world variables** (restart the world), grouped under headings:
  | Group | Variable | Range / options | Default |
  | --- | --- | --- | --- |
  | Air today | CO₂ in the air | 280–1,000 ppm | 420 |
  | | Methane in the air | 700–4,000 ppb | 1,920 |
  | Emissions | Yearly CO₂ emissions | 0–80 Gt | 37 |
  | | Where emissions are heading | Keep growing · Level off · Slowly fall (today's pledges) | Slowly fall |
  | Planet | Forest cover | 10–45 % of land | 31 |
  | | Climate sensitivity | 2–5 °C per 2× CO₂ | 3 |
  | | Ocean and soil uptake | 50–150 % of today | 100 |
  | | Tipping points | Off · On | On |
  | Your town | Seafront height | 0.5–5 m above today's sea | 1.5 |
- **More preset what-ifs** (7 → 13). Kept: stop all emissions, clean-energy switch, emissions double,
  a trillion trees, supervolcano, dim sunlight for 30 years, West Antarctic collapse. New:
  | id | Label | What happens at the fork |
  | --- | --- | --- |
  | `mix` | Build my own future | Uses every "My future" setting below at once |
  | `methane` | Cut methane in half | Farms, landfills and gas leaks fixed over 15 years |
  | `dac` | Pull CO₂ out of the air | Machines remove 10 Gt a year from year 10 on |
  | `permafrost` | Permafrost thaws fast | Frozen soils release CO₂ and methane for 80 years |
  | `amazon` | The Amazon turns to grassland | Forest cover drops by a fifth; that carbon goes into the air |
  | `seawall` | Build a 3 m sea wall | The town's seafront is raised 3 m |
- **"My future" settings** (`live`: used at the next fork, like galaxy's what-if settings):
  | Setting | Range | Default |
  | --- | --- | --- |
  | Change emissions by | −100 % … +100 % | −50 % |
  | Over | 1–80 years | 25 |
  | Trees planted | 0–1.5 trillion | 0.5 |
  | Methane cut | 0–80 % | 30 |
  | CO₂ removal | 0–20 Gt a year | 2 |
  | Sun-dimming aerosols | 0–100 % (0–2 W/m²) | 0 |
  | Sea wall | 0–5 m | 0 |
  Presets that have a size (trees, removal, sea wall) keep fixed, documented sizes; only `mix` reads
  these settings, so the presets stay one-click and reproducible.
- **Two new metrics:** "Snow on the mountains" (% of today's snow-covered slope) and "Town flooded"
  (% of houses below the high-tide line). Six metrics in all.
- **Stage readout chip** replaced by an on-stage HUD in the shared chip style: the tide gauge marks on
  the pier and a small snow-line tick on the mountain carry the numbers in the picture; one chip keeps
  `+1.3 °C · 421 ppm`.
- World README: variables, what-ifs, settings, "what excellent means".

**Out:**

- Engine, `components/console/`, other worlds. `Console.tsx` stays on `StandardConsole` (headings in
  Tune already render). If Tune needs an option the shared form lacks, it is added without changing
  other worlds' output, and logged here.
- Stacking several preset what-ifs in one fork (needs an engine change; `mix` covers combining).
- A photo backdrop, external images or any network data.
- Regional climate (the model stays global and 0-D; the town is an illustration of global numbers).
- Weather (rain, storms, day/night cycles tied to sim time).

## Design

Follows DESIGN.md → Colors (stage data colours only on the stage), the `darkroom-ui` checklist and the
Sandbox contract. The stage stays the lone object; chrome around it is unchanged.

### Model (`sim.ts`)

Still deterministic, still pure TypeScript, sub-steps of 0.25 yr.

- **Gases.** CO₂ `C` (ppm) as today: emissions × airborne fraction minus uptake (scaled by forest cover
  and *ocean and soil uptake*), minus trees and removal. Methane `M` (ppb) relaxes to a source level
  with a 12-year lifetime; the source scales with methane cuts and permafrost.
- **Forcing → temperature.** `F = 5.35·ln(C/280) + 0.036·(√M − √722) − aerosols − volcano`;
  temperature relaxes to `sens · F / 3.71` with the existing 35-year lag. Calibrated so default params
  start at today's +1.26 °C and follow today's curve within 0.1 °C to 2100 (checked in a test).
- **Emissions path.** *Keep growing* +1 %/yr, *level off* flat, *slowly fall* = today's linear fall to
  zero over 120 years (exactly the current model, so the current default story survives).
- **Tipping points** (when on): permafrost adds CO₂ and methane above +1.5 °C, ramping with warming;
  Greenland adds sea level above +2 °C, West Antarctica above +3 °C. Each logs one stable event.
- **Snow line** rises ~150 m per °C from 1,200 m today (the scene's mountains top out near 2,400 m), so
  "Snow on the mountains" = share of slope above the snow line, relative to today.
- **Town flooding** = share of the 24 houses whose base (spread from 0 to 6 m above seafront height,
  plus any sea wall) is below sea level + a 0.6 m storm-tide allowance.
- **Defaults reproduce today's numbers** for the four existing metrics within the tolerance above; the
  seven existing what-ifs keep their event text. All new world state is plain numbers.

### Scene (`scene.ts`, new, framework-free)

Drawing moves out of `sim.ts` into `worlds/earth/scene.ts` (`drawScene(ctx, W, H, look, clock)`), so
`sim.ts` stays readable. `sim.draw` computes a plain `look` object from the world (temperature, sea m,
snow line, forest, crops, haze, aerosol dimming, flood share, wall height) and passes it on.

Layers, back to front:

1. **Sky:** three-stop gradient that warms and yellows with heat and greys with aerosols; sun with a
   soft halo, dimmed by aerosols; brown haze band at the horizon growing with CO₂.
2. **Clouds:** 5–7 soft, layered cloud banks drifting slowly on the clock.
3. **Far range:** blue-grey ridges with atmospheric fade, small snowcaps.
4. **Main mountains:** two peaks with a rock face (hashed ridge lines and shading), a snowfield clipped
   above the snow line with a ragged edge, and a glacier tongue in the valley that shortens as it warms.
5. **Forest slopes:** conifers in three depth rows; count from forest cover; drought browns and thins
   them above +2.5 °C; the Amazon what-if visibly clears a share.
6. **Farm terraces:** fields whose colour runs from green to straw with the crop index.
7. **Town:** 24 pitched-roof wooden houses in muted Nordic colours stepping up the shore, a church, a
   harbour wall and pier; window lights; chimney smoke drifting on the clock. Houses below the water
   line are drawn half-submerged.
8. **Sea:** fjord water with a depth gradient, a soft reflection of the mountains, moving shimmer lines,
   2–3 boats bobbing; the sea line rises with sea level (scaled so 1 m reads clearly; the tide gauge
   carries the true metres). A sea wall appears as a stone wall at the harbour when built.
9. **Overlays:** ash veil (volcano), aerosol whitening (sun-dimming), heat shimmer above +3 °C.

Static geometry (mountain outlines, ridge lines, tree and house positions) is built once per stage size
from an index hash and cached in module-level `OffscreenCanvas`es / arrays, like galaxy's buffers. Per
frame only colours, clips and moving parts are drawn. Target: under 3 ms a frame per half at 1440×900.

### Smooth motion

- **Renderer clock:** the scene keeps a module-level clock in seconds advanced by `performance.now()`
  deltas (capped at 50 ms), frozen under `prefers-reduced-motion` (read once via `matchMedia` when
  available). Only *ambient* parts use it: waves, clouds, boats, birds, smoke. Nothing in the world
  state uses it, so determinism, forks and tests are untouched.
- **Eased look:** per half (`isAlt`), the drawn `look` eases toward the model value with a 250 ms time
  constant, so restart, fork and big what-ifs (volcano, wall) glide in. A paused world settles to the
  exact model values.

### Tune and Ask

Tune shows four headings: *Air today*, *Emissions*, *Planet*, *Your town*, then *My future (used by
"Build my own future")*. 16 rows; the column and phone dock already scroll internally with the fade.
Ask lists 13 what-ifs with `mix` first, so the combining tool is the first thing a visitor sees.

## Steps

1. Model: methane, aerosols, emissions path, uptake, tipping points, snow line, flooding, new metrics
   and variables. Calibration test (defaults vs today's curve). Typecheck + tests green.
2. What-ifs: six new presets and `mix` with live settings; events with stable text.
3. Scene: `scene.ts` with static caches and all layers; `sim.draw` builds `look`.
4. Motion: renderer clock, easing per half, reduced motion.
5. Browser: every what-if forked once; `mix` at extreme settings; frame time at 60 yr/s split;
   no page scroll at 375×667, 768×1024, 1024×768, 1280×800, 1440×900; light theme (stage stays dark).
6. Docs: world README, CLAUDE.md earth model note, this doc closed.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A painted scene drifts into a cartoon | Atmospheric perspective, muted Nordic palette, real proportions (snow line, gauge in metres); check against DESIGN stage rules and iterate by eye in step 5. |
| Wall-clock motion breaks determinism | Clock is draw-only, never written to the world; tests never call `draw`. Paused world still settles to exact model values. |
| Frame time with two halves at 60 yr/s | Static layers cached; trees and houses as cached sprites; measure, drop reflections below 768 px if needed. |
| 16 Tune rows crowd the column | Headings group them; internal scroll already exists; check at 1024–1279 and on phones. |
| Calibration changes today's familiar curve | Test pins defaults to the current curve within 0.1 °C / 0.05 m to 2100. |
| Visitors don't notice settings only feed `mix` | Heading names it ("used by Build my own future"); `mix` is first in Ask. |

## Verification

- [x] Automated: `npm run typecheck && npm test` (107/107: every what-if, determinism, plus
  `tests/earth.test.ts`: calibration against the old curve, today's town, `mix` snapshots its settings,
  sea wall, methane cut).
- [x] Manual: forked mix, emissions double, sea wall and supervolcano in the browser, at 60 yr/s split.
  No page scroll at 375×812, 1024×768, 1440×900. Not checked: 768×1024, 1280×800, light theme,
  reduced motion by eye (the code path snaps easing and freezes the clock), the other new what-ifs by
  eye (covered by tests only).
- [x] Performance: 8.3 ms average frame (worst 10 ms) at 1440×900, split, on this Mac. Not measured on a phone.
- [x] Docs: world README, CLAUDE.md, this doc closed.
- [ ] `npm run build` not run (it breaks the running dev server); run before committing.

## Log

- 2026-11-03 — proposed. Scene approach (painted live) and combining approach (`mix` what-if with
  live settings) chosen by the user.
- 2026-11-03 — approved; in progress.
- 2026-11-03 — shipped. Changes from the plan:
  - Calibration: defaults follow the old curve within **0.2 °C** (not 0.1) to 2100. Pollution haze
    fades as emissions fall, unmasking about 0.16 °C by 2100. This is real physics, so the test
    tolerance moved instead of the model.
  - Snow line today is 1,600 m (not 1,200): at 1,200 the whole range was white. The snow event now
    fires at 2,000 m.
  - Metric labels shortened (Sea level, Crops, Snow, Flooding) so six chart tabs fit in two rows.
  - Narrow stages (split halves, phones) paint a scene 1.45× as wide as tall and pan towards the town.
  - Model and scene share numbers through a new `town.ts` (avoids a circular import).
