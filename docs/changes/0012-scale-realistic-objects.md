# 0012 — Scale explorer: true-to-life objects with quiet motion

- **Status:** shipped
- **Phase:** 1 (per-surface excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** [scale-explorer](../features/scale-explorer.md)
- **Decisions:** —
- **Created:** 2026-11-03 · **Shipped:** 2026-11-03

## Why

The scale explorer is the front door, and its objects don't look like the things they name. An ant, a
lion and a blue whale are the same Primer blob in different colours. The Eiffel Tower, the Statue of
Liberty and the Burj Khalifa are the same triangle. A light-year is a line with dots. Nothing moves.
A visitor comparing sizes needs to recognise each object at a glance; otherwise the comparison carries
no meaning. The user asked for every object and reference to look like the real thing, with motion.

## Scope

**In** (all in `lib/scale/`; `components/scale/` only for the reduced-motion flag):

- **One renderer per object** (37 in all) instead of 20 shared glyph kinds. Each is drawn procedurally on
  the canvas to the object's real proportions, real colours and recognisable silhouette:
  | Group | Objects and what makes them read as real |
  | --- | --- |
  | Particles | Proton: three coloured quarks in a soft gluon haze. Hydrogen: a 1s electron cloud (density falls off with radius) around a tiny nucleus, not planetary orbits. |
  | Molecules, microbes, cells | DNA: two backbones with base-pair rungs, turning. Flu virus: lipid envelope with HA/NA spikes, tumbling. E. coli: a rod-shaped capsule with whipping flagella. Red blood cell: a biconcave disc lit from the side. Egg cell: nucleus, cytoplasm, zona pellucida ring and corona cells. Sand grain: a faceted quartz grain with highlight. |
  | Animals and people | Side-view silhouettes with shading, to true length/height: ant (three body parts, six legs walking), honeybee (striped abdomen, fluttering wings), mouse, meerkat (upright sentinel), child, gray wolf, adult human, lion (mane), African elephant (trunk, tusks, ears), orca (black/white patches), blue whale. Gentle idle motion: breathing, tail, swim undulation. |
  | Structures and land | Statue of Liberty (verdigris figure, torch, pedestal), Eiffel Tower (four-leg lattice with arches and platforms), Burj Khalifa (stepped Y-plan spire, lit windows). Mount Everest (massif with ridges and snow), Grand Canyon (top-down layered rock strata cut by the river), a large country (map outline, borders, a capital dot). |
  | Planets and Sun | Moon (maria, craters, ray system, soft terminator). Earth (rotating continents, ice caps, drifting clouds, atmosphere rim). Jupiter (rotating belts and zones, Great Red Spot). Sun (limb darkening, shimmering granulation, corona). |
  | References | Earth's orbit (Sun at the centre, Earth moving round it). Solar system (eight planets on their orbits, moving at relative speeds). One light-year (a beam of light travelling along a measured bar). To the nearest star (Sun → Proxima Centauri with a light pulse). Orion Nebula (glowing gas with dark lanes and the Trapezium stars). Milky Way (tilted barred spiral, slowly turning). Local Group (Milky Way, Andromeda, Triangulum, satellites). Observable universe (cosmic-web filaments inside a glowing CMB edge). |
- **Detail by size on screen.** Each renderer adds detail only when the object is big enough to show it
  (e.g. legs at > 24 px, lattice at > 80 px), so small, distant objects stay crisp and cheap.
- **Motion that explains the object**, not decoration: planets turn, cells and microbes move as they do,
  animals breathe, light travels at a visible pace along the light-year bar, galaxies turn. Each object
  keeps one slow loop (2–20 s). Motion is time-based in the renderer, so it is the same at any frame rate.
- **Reduced motion:** with `prefers-reduced-motion`, every object is drawn at a fixed, still pose (time
  frozen); zoom easing stays because it is state feedback.
- **Hover:** a world-linked object brightens by 15 % over 150 ms (the label already turns amber).

**Out:**

- Photos or imported raster art. Everything stays procedural (no licensing, no download weight, crisp at
  every zoom). The feature doc's "real imagery is out of scope" stays true.
- New objects, changed sizes, facts, layout, the panel, the transport, labels or the hero.
- Any change to worlds, `lib/sim` or the tests' expectations.

## Design

- `lib/scale/objects.ts`: `GlyphKind` is replaced by an object `id` (e.g. `"eiffel"`) used to pick its
  renderer; size, colour, sandbox and fact stay. A small `shape` hint (`"round" | "tall" | "long"`) says
  which way the size is measured, so tall things are drawn to their height and long animals to their
  length, all inside the same `d × d` box the layout already reserves (layout unchanged).
- `lib/scale/glyphs/` (new): one file per group (`micro.ts`, `life.ts`, `built.ts`, `space.ts`,
  `refs.ts`) exporting `draw(ctx, x, y, d, t)` functions, plus `common.ts` for shared helpers (seeded
  point sets, soft glow, shaded sphere, limb darkening). Decorative randomness is precomputed once from a
  fixed seed, never `Math.random()`.
- `ScaleView.draw` gains a time `t` (seconds, advanced by `dt`; frozen when `reducedMotion` is set by
  `ScaleConsole` from `matchMedia`).
- Colours: the stage stays walnut. Objects use real-world colours (they are the "lone object"); labels
  and chrome keep the `STAGE` tokens. No glows around labels.
- Budget: at most ~8 objects are on screen at once; the heaviest (Sun granulation, galaxies, cosmic web)
  use ≤ 600 precomputed points and are batched into one path per colour.

## Steps

1. Object ids + shape hints in `objects.ts`; `common.ts` helpers; time and reduced motion in `ScaleView`.
2. Particles, microbes and cells.
3. Animals and people.
4. Structures and land.
5. Planets, Sun and references (orbits, light-year, nebula, galaxies, universe).
6. Look at every object in the browser at desktop and phone width; check frame time while zooming.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Silhouettes look clip-art-like | Shade every body (light from top-left, one rim tone), true proportions from reference dimensions |
| Frame drops on phones | Level of detail by on-screen size; precomputed point sets; one path per colour |
| Motion feels busy with many objects visible | Slow loops only, small amplitudes; still under reduced motion |
| Tall/long objects change apparent size | They are drawn to the measured dimension inside the same box, so comparisons stay true |

## Verification

- [x] Automated: `npm run typecheck && npm test`; new `tests/scale.test.ts` checks every object has a renderer and draws at 2–1,400 px and any moment without a canvas error.
- [x] Manual: every object looked at in the browser pane (desktop and 375 px phone); no console errors.
- [x] Docs: scale-explorer feature doc updated.

## Log

- 2026-11-03 — proposed; approved.
- 2026-11-03 — shipped. While building: labels of objects under ~40 px now fade out so neighbours'
  labels stop piling up; per-object `ext` moves a label up to meet objects that don't fill their box
  downward (bee, whales, bacterium, the light-year bars) or down below the taller DNA helix.
  Known, not changed: the zoom anchor jumps between neighbours of very different size (proton →
  hydrogen, Orion → Milky Way), so those two only centre in a narrow zoom window. Layout was out of scope.
