# What-If Lab — notes for Claude Code

A semi-simulator for "what happens if…" experiments. Home screen is a Scale-of-the-Universe style zoom
(proton → observable universe). Objects with a sandbox open a live world. A **what-if forks the running
world at that moment**; the unchanged world and the what-if run side by side, with a chart and timeline
showing where they diverge. No AI, no network data: everything is rule-based and deterministic.

Inspirations: scaleofuniverse.com (zoom), Universe Sandbox (gravity), Primer (blob agent sims).

## Commands

```bash
npm run dev        # http://localhost:3000
npm run build      # production build (must pass before committing)
npm run typecheck  # tsc --noEmit
npm test           # vitest: every sandbox × every what-if, determinism, engine behaviour
```

Run `npm run typecheck && npm test` after any change to `lib/`.

## Architecture

```
app/                      Next.js App Router (static). / = scale, /lab/[world] = sandbox
components/               React UI. Client-only (LabClient wraps Lab with ssr:false)
  Lab.tsx                 render loop (requestAnimationFrame), pointer/wheel input, layout
  engines.ts              module-level SimEngine + ScaleView singletons (worlds keep running across tabs)
  SidePanel / ControlsForm / Transport / HistoryChart / Timeline / ScalePanel / ScaleTransport / Tabs
lib/sim/                  framework-free simulation code (no React)
  types.ts                Sandbox interface, BaseWorld, Control, Metric…
  core.ts                 seeded RNG (rng/gauss), note(), mix(), formatters
  draw.ts                 blob() creature drawing, chip(), FONT
  engine.ts               SimEngine: base/alt worlds, fork, history, timeline merge, split-stage drawing
  registry.ts             SANDBOXES map (tab order), defaultParams, routes
  data/                   predefined data sets (species, personality research constants, country presets)
  sandboxes/*.ts          one file per world: galaxy, solar, earth, country, animals, child, person
lib/scale/                scale explorer objects + renderer
tests/                    vitest
```

### The Sandbox contract (`lib/sim/types.ts`)

Each sandbox exports a `Sandbox<World, Params>` object:

- `init(p, seed)` → world. **World must be plain data** (`structuredClone`-able: numbers, arrays,
  typed arrays, plain objects; no functions, no class instances, no Maps).
- `step(w, dt, p)` advances by `dt` sim units. Use internal sub-steps for stability.
- `apply(w, id, p, ui)` applies a what-if to a freshly cloned world. Log it with `note()`.
- `read(w, p)` → `{metricKey: number | null}`; must be finite or `null`.
- `draw({ctx, w, h, p, isAlt, ui}, world)` draws into a clipped rect at (0,0). No React, no DOM.
- Optional: `info()` structured side-panel blocks, `onParamChange()` (e.g. presets), `maxT`, `hint`.

### Rules

- **Determinism**: never use `Math.random()` in `lib/sim`. Use `rng(w)` / `gauss(w)` (state in `w.rs`)
  so forks and tests are reproducible. Decorative-only randomness in `draw` must be derived from index/hash.
- Events: `note(w, text, onceKey?)`. The timeline marks events as both / no-change only / what-if only by
  matching text and time, so keep event text stable for the same event.
- Time units are per sandbox (`fmtT` formats them): galaxy 100 Myr, solar years, earth years, country
  years, animals days, child age in years, person years.
- Keep sim code pure TypeScript so it can move into a Web Worker later.
- UI colours come from CSS tokens in `app/globals.css`; canvas code uses the same hex values
  (`--base` #A9B1D6 = no-change world, `--alt` #FFC857 = what-if world).

## Adding a sandbox (checklist)

1. Add the key to `SandboxKey` in `lib/sim/types.ts`.
2. Create `lib/sim/sandboxes/<key>.ts` exporting a `Sandbox<W, P>`; put static data in `lib/sim/data/`.
3. Register it in `SANDBOXES` in `lib/sim/registry.ts` (order = tab order).
4. Optionally link it from a scale object in `lib/scale/objects.ts` (`sandbox: "<key>"` or `"<key>:<preset>"`).
5. `npm run typecheck && npm test` — the test suite automatically covers the new sandbox.

## Model notes (so changes stay plausible)

- **galaxy**: test-particle stars around softened point-mass cores; crude dynamical friction merges cores.
- **solar**: leapfrog N-body, G = 4π² (AU, yr, M☉), dt ≤ 0.0015 yr; merges on collision radius.
- **earth**: 0-D carbon/temperature model, 35-yr thermal lag, sea level from expansion + ice above 2 °C.
- **country**: aggregate growth model + 260 household agents (tax, corruption skim, yard-sale trades);
  Gini/poverty emerge from agents and feed back into stability.
- **animals**: Primer-like agents; cost ∝ size³·speed² + senses; mutation σ 7%. Stabilisers (keep them
  unless replacing with something better): cover patches, predator territory cap (`nc < nh/4`),
  hunt success 30%, recolonisation from outside. A test checks long-run coexistence.
- **child**: trait = 50 + 0.45·(midparent − 50) + noise σ9 + age-weighted environment + maturation
  curves + life-event deltas that partly fade. 120 children per world.
- **person**: 100 versions; daily quit hazard high early, falling after ~66 days for good habits.

## Ideas / roadmap

- Shareable scenarios: encode params + what-if + fork time in the URL hash.
- Timeline scrubbing / replay (store snapshots every N seconds).
- Move `SimEngine.tick` into a Web Worker with OffscreenCanvas for heavier sims.
- More worlds from the original brief: countries on a map, cities, ecosystems by biome, history scenarios.
- Multiple what-ifs at once (more than two parallel worlds), and Monte-Carlo runs with outcome ranges.
- Mobile layout polish, keyboard shortcuts (space = play/pause, F = fork).
