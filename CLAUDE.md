# What-If Lab — notes for Claude Code

A semi-simulator for "what happens if…" experiments. Home screen is a Scale-of-the-Universe style zoom
(proton → observable universe). Objects with a sandbox open a live world. A **what-if forks the running
world at that moment**; the unchanged world and the what-if run side by side, with a chart and timeline
showing where they diverge. No AI, no network data: everything is rule-based and deterministic.

Inspirations: scaleofuniverse.com (zoom), Universe Sandbox (gravity), Primer (blob agent sims).

## Product direction (read `docs/PLAN.md`)

Goal: maximum traffic; revenue from **side-rail ads** (≥1280 px, never near the stage) and **Premium at
$15/year** (no ads + power tools). **No backend of our own**: static export; accounts and the Premium plan via
Clerk + Clerk Billing, checked in the browser (`docs/decisions/0008-…`, change 0020). The simulation stays
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
  Only the Clerk **publishable** key is read (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, see `.env.example`).
- Premium gating goes through `useAccount()` / `adsAllowed` / `canExport`; never import `@clerk/*` outside
  `components/account/clerk.tsx`. Exports must never change sim behaviour (`tests/export.test.ts`).

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
  shell/                  Lab (nav, world switcher, account menu, ≥1600 px ad rails), LabClient (ssr:false), Tabs, WorldMenu, ThemeToggle
  account/                useAccount() adapter: state.ts (pure rules), context.tsx (provider), clerk.tsx (the only Clerk import,
                          lazy), AccountMenu, PremiumDialog. No key ⇒ everything free, as before
  console/                shared world-console blocks: StandardConsole, Stage (+ StageInteraction), Transport,
                          HistoryChart, Timeline, panels, ControlsForm, Dock, AdSlot (null for Premium), engines (singletons +
                          useWorldEngine), export/ (Premium video + slides sheet, MediaRecorder, jsPDF)
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
  engine.ts               SimEngine: base/alt worlds, fork, history, timeline merge, split-stage drawing, `origin` (replay recipe)
lib/export/               deterministic replay of a fork + video frames and slides drawn with each sandbox's draw()
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
- Optional: `info()` structured side-panel blocks, `onParamChange()` (e.g. presets), `maxT`, `hint`, `pace()` (a live-only
  slow-motion hint, 0–1, multiplied into the engine's clock; exports and tests never read it — child uses it, change 0019).

### Rules

- **Determinism**: never use `Math.random()` in `lib/sim` or `worlds/*/sim.ts`. Use `rng(w)` / `gauss(w)` (state in `w.rs`)
  so forks and tests are reproducible. Decorative-only randomness in `draw` must be derived from index/hash.
- **Stacking** (`Sandbox.stack`, change 0015): solar, galaxy, country, animals and child show one world; what-ifs add up via
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
- **country** (change 0016): 41 rounded country profiles (`data.ts`); aggregate growth + 260 household agents
  with log-normal skill, jobs (hazards calibrated to the jobless rate), tax split (services / cash to all /
  help for those without work), corruption skim, yard-sale trades. Metrics are human: family $ a month, poor
  of 100, rich–poor income gap, out of work of 100, lifespan, peace. Policies stack via `w.mods`; six have
  live "how much" sizes. Stage (`scene.ts`): a street poorest → richest over "100 people"; the hidden
  no-change world arrives as `DrawContext.base` for the comparison numbers.
- **animals** (change 0017): a cast of 1–5 of 21 species (`data.ts`: food web `eats`, size, top speed, comfort range,
  drawing spec, kid facts) in one arena; ready-made worlds + "Build your own" (`world` / `cast` params; the old
  `species` preset maps to a ready-made world). Four heritable traits: speed, size, senses, coat; cost ∝ size³·speed²
  + senses, × climate cost (coat shifts the temperature felt). Hunters take prey < 1.4× their size (pack 2.5×).
  Everyone forages at one walking pace (top speed only to chase/flee); rare plant-eaters get more from food (niche
  sharing) so several coexist. Stabilisers (keep them unless replacing with something better): cover patches, each
  hunter capped by its share of prey (`prey/4`), ~30 % hunt success, recolonisation (≤ 3 times, not after "remove").
  Changes stack via `w.mods`. Stage in `scene.ts` (habitat backdrops, silhouettes, renderer clock); the world owns its
  chart, story and timeline (`Chart.tsx`, `parts.tsx`). Tests: `tests/animals*.test.ts` (every pair of species).
- **child** (change 0018): 120 possible kids of the same two parents, ages 1–60. Per trait (model O C E A N; shown as
  Curious, Organised, Outgoing, Kind and Calm = 100 − N): family start 50 + h·(midparent − 50) + genes (each kid's own mix,
  σ from "How much is inherited") + home (style, siblings, home life, money, place, school, screens; age-weighted) + life
  (your changes and everyday ups and downs, part lasting, part fading) + chance (start + drift) + maturation. The four parts
  are kept separately (`model.ts`) so "Why are these kids different?" is computed from their variances. Changes stack via
  `w.mods` (soft cap ±14 per kid, style switches ±7) and can be scheduled for a later age (`s_age`). Everyday events use
  `rng(w)` per kid and are only summed up in the timeline ("By 10, 31 of 100 kids…"). Stage in `scene.ts` (home backdrop,
  a growing child, crowd strips easing on a renderer clock); the world owns its chart, story and timeline (`Chart.tsx`,
  `parts.tsx`). Tests: `tests/child.test.ts`.
- **person**: 100 versions; daily quit hazard high early, falling after ~66 days for good habits.

## Roadmap

The roadmap lives in `docs/PLAN.md` (phases) and `docs/changes/` (planned work). Don't keep a second list here.
