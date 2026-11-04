# What-If Lab — notes for Claude Code

A semi-simulator for "what happens if…" experiments. Home screen is a Scale-of-the-Universe style zoom
(proton → observable universe). Objects with a sandbox open a live world. A **what-if forks the running
world at that moment**; the unchanged world and the what-if run side by side, with a chart and timeline
showing where they diverge. No AI, no network data: everything is rule-based and deterministic.

Inspirations: scaleofuniverse.com (zoom), Universe Sandbox (gravity), Primer (blob agent sims).

## Product direction (read `docs/PLAN.md`)

Goal: maximum traffic; revenue from **side-rail ads** (≥1280 px, never near the stage) and **Premium at
$15/year** (no ads + power tools). **No backend of our own**: static export; payments/licensing via a
hosted merchant-of-record, client-side license unlock (`docs/decisions/0002-…`). The simulation stays
pure variable changes → rule-based outcomes. UI follows the **Darkroom** design system (`DESIGN.md`); working screens are
one-viewport consoles with no page scroll.

## Working agreement

- **Plan before building.** Any non-trivial change (multi-file behaviour, new dependency, UI layout,
  new world, ads/premium/SEO/hosting) needs a change doc in `docs/changes/` approved by the user first —
  use the `plan-change` skill. Small fixes don't.
- **Document features** in `docs/features/` (`document-feature` skill); update them when a change ships.
- **Hard-to-reverse choices** (vendors, hosting, data formats) get an ADR in `docs/decisions/`.
- **UI work** follows the `darkroom-ui` skill. **New worlds** follow the `add-sandbox` skill.
- **Worlds are separate projects** (`worlds/<key>/`); improve them one at a time, each with its own change doc.
- Never introduce a server, API route, server action, or secret in client code without a superseding ADR.

## Commands

```bash
npm run dev        # http://localhost:5050
npm run build      # production build (must pass before committing)
npm run typecheck  # tsc --noEmit
npm test           # vitest: every sandbox × every what-if, determinism, engine behaviour
```

Run `npm run typecheck && npm test` after any change to `lib/` or `worlds/`.

## Architecture

```
app/                      Next.js App Router (static). / = scale, /lab/[world] = a world
components/
  shell/                  Lab (nav, world switcher, ≥1600 px ad rails), LabClient (ssr:false), Tabs, WorldMenu, ThemeToggle
  console/                shared world-console blocks: StandardConsole, Stage (+ StageInteraction), Transport,
                          HistoryChart, Timeline, panels, ControlsForm, Dock, AdSlot, engines (singletons + useWorldEngine)
  scale/                  ScaleConsole (the / page), ScalePanel, ScaleTransport
  ui/                     primitives: Icon, useMedia, canvas (fitCanvas, useCanvasLoop)
worlds/                   one folder per world = one project (change 0008)
  <key>/sim.ts            the Sandbox (framework-free, deterministic)
  <key>/meta.ts           name + subtitle for the nav (loaded on every page)
  <key>/data.ts           static data (optional)
  <key>/Console.tsx       the world's screen (starts as StandardConsole; must keep its ad slots)
  <key>/README.md         the world's brief: audience, questions, model, what "excellent" means
  registry.ts             WORLDS meta map (tab order), MODES, routes
  views.tsx               per-world code-split consoles (next/dynamic)
  sims.ts                 all sims in one map — tests only
lib/sim/                  framework-free engine shared by all worlds (no React)
  types.ts                Sandbox interface, BaseWorld, WorldMeta, Control, Metric…
  core.ts                 seeded RNG (rng/gauss), note(), mix(), defaultParams, formatters
  draw.ts                 blob() creature drawing, chip(), FONT
  engine.ts               SimEngine: base/alt worlds, fork, history, timeline merge, split-stage drawing
lib/scale/                scale explorer objects + renderer
tests/                    vitest: every world × every what-if, determinism, world boundaries, ad slots
PRODUCT.md / DESIGN.md    product truth / canonical Darkroom design system (tokens mirror app/globals.css)
docs/                     PLAN.md, features/, changes/, decisions/ (ADRs)
.claude/skills/           plan-change, document-feature, darkroom-ui, add-sandbox
```

### Worlds are separate projects (change 0008)

- Shared between worlds: tokens (`app/globals.css`), `components/ui/`, `components/console/`, `lib/sim/`.
  Everything else a world needs lives in `worlds/<key>/`. A world never imports another world; shared
  code never imports a world (`tests/structure.test.ts` enforces both).
- A world changes its screen by writing its own `Console.tsx` from the console blocks (copy
  `StandardConsole` as the template). Per-world work touches only its folder; if a shared block needs a
  new option, add it without changing the other worlds' output.
- **Ad slots (ADR 0007):** every world console keeps a 300×250 `AdSlot` at the foot of its right column
  (1024–1599 px) and a 320×50 banner under the dock (< 1024 px, hidden on phones held sideways). The
  shell adds two 160×600 rails at ≥ 1600 px × ≥ 700 px tall. Never on or next to the stage or transport.

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

- **Determinism**: never use `Math.random()` in `lib/sim` or `worlds/*/sim.ts`. Use `rng(w)` / `gauss(w)` (state in `w.rs`)
  so forks and tests are reproducible. Decorative-only randomness in `draw` must be derived from index/hash.
- **Stacking** (`Sandbox.stack`, change 0015): solar and galaxy show one world; what-ifs add up via
  `engine.change()`, so their `apply()` must work on an already-changed world. Other worlds split and re-fork.
- Events: `note(w, text, onceKey?)`. The timeline marks events as both / no-change only / what-if only by
  matching text and time, so keep event text stable for the same event.
- Time units are per sandbox (`fmtT` formats them): galaxy 100 Myr, solar years, earth years, country
  years, animals days, child age in years, person years.
- Keep sim code (`worlds/*/sim.ts`, `lib/sim`) pure TypeScript so it can move into a Web Worker later.
- UI colours come from CSS tokens in `app/globals.css`; canvas code uses the same hex values
  (`--base` #A9B1D6 = no-change world, `--alt` #FFC857 = what-if world).

## Adding a sandbox (checklist)

1. Add the key to `SandboxKey` in `lib/sim/types.ts`.
2. Create `worlds/<key>/`: `meta.ts` (`WorldMeta`), `sim.ts` exporting a `Sandbox<W, P>` (spread `...meta`),
   optional `data.ts`, `Console.tsx` (start with `StandardConsole` + `useWorldEngine`), `README.md` brief.
3. Register it in `WORLDS` (`worlds/registry.ts`, order = tab order), `WORLD_VIEWS` (`worlds/views.tsx`)
   and `SANDBOXES` (`worlds/sims.ts`).
4. Optionally link it from a scale object in `lib/scale/objects.ts` (`sandbox: "<key>"` or `"<key>:<preset>"`;
   a preset sets `meta.presetParam`).
5. `npm run typecheck && npm test` — the test suite automatically covers the new world.

## Model notes (so changes stay plausible)

- **galaxy**: test-particle stars around softened point-mass cores; crude dynamical friction merges cores.
  Up to 10 galaxies (owner indices never reused), ~4,000-star budget; what-if settings are `live` controls
  read in `apply()`. Fast passes escape friction only well above escape speed (fly-through aims 80 kly off).
- **solar**: leapfrog N-body, G = 4π² (AU, yr, M☉), dt ≤ 0.0015 yr; merges on collision radius.
- **earth**: 0-D CO₂ + methane model, forcing (incl. pollution haze ∝ emissions) → temperature with a 35-yr lag;
  sea level from expansion + ice above 2 °C (+ Greenland/West Antarctica when tipping points are on). The
  stage (`worlds/earth/scene.ts`) is a painted fjord town; ambient motion uses a draw-only renderer clock.
  `mix` ("Build my own future") snapshots the live "My future" settings into the world at the fork.
- **country**: aggregate growth model + 260 household agents (tax, corruption skim, yard-sale trades);
  Gini/poverty emerge from agents and feed back into stability.
- **animals**: Primer-like agents; cost ∝ size³·speed² + senses; mutation σ 7%. Stabilisers (keep them
  unless replacing with something better): cover patches, predator territory cap (`nc < nh/4`),
  hunt success 30%, recolonisation from outside. A test checks long-run coexistence.
- **child**: trait = 50 + 0.45·(midparent − 50) + noise σ9 + age-weighted environment + maturation
  curves + life-event deltas that partly fade. 120 children per world.
- **person**: 100 versions; daily quit hazard high early, falling after ~66 days for good habits.

## Roadmap

The roadmap lives in `docs/PLAN.md` (phases) and `docs/changes/` (planned work). Don't keep a second list here.
