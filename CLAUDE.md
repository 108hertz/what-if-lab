# What-If Lab — notes for Claude Code

A semi-simulator for "what happens if…" experiments (site name "What-If Simulations - Fun Lab"). The home page (/)
opens the Solar System world (`HOME_MODE` in `worlds/registry.ts`, first tab); the Scale-of-the-Universe style zoom
(proton → observable universe) lives at /scale. Objects with a sandbox open a live world. A **what-if forks the running
world at that moment**; the stage shows one world (the changed one) while the unchanged world runs hidden
alongside, with a chart and timeline showing where they diverge. Every change can be ticked off/on; Reset
starts clean; side by side exists only in exports (change 0024). No AI, no network data: everything is rule-based and deterministic.

Inspirations: scaleofuniverse.com (zoom), Universe Sandbox (gravity), Primer (blob agent sims).

## Product direction (read `docs/PLAN.md`)

Goal: maximum traffic; revenue from **side-rail ads** (≥1280 px, never near the stage) and **Premium at
$15/year** (no ads + power tools). **No backend of our own**: static export; accounts and the Premium plan via
Clerk + Clerk Billing, checked in the browser (`docs/decisions/0008-…`, change 0020). The simulation stays
pure variable changes → rule-based outcomes. UI follows the **Control Room** design system (`DESIGN.md`, change 0023); working screens are
one-viewport consoles with no page scroll.

## Working agreement

- **Plan before building.** Any non-trivial change (multi-file behaviour, new dependency, UI layout,
  new world, ads/premium/SEO/hosting) needs a change doc in `docs/changes/` approved by the user first —
  use the `plan-change` skill. Small fixes don't.
- **Document features** in `docs/features/` (`document-feature` skill); update them when a change ships.
- **Hard-to-reverse choices** (vendors, hosting, data formats) get an ADR in `docs/decisions/`.
- **UI work** follows the `control-room-ui` skill. **New worlds** follow the `add-sandbox` skill.
- **Worlds are separate projects** (`worlds/<key>/`); improve them one at a time, each with its own change doc.
- **Every word goes through the catalogs** (change 0025, ADR 0010): shared UI uses `useT()` / `pageT()` with keys in
  `lib/i18n/locales/en/*.json`; a world's words stay in its code (labels, `messages`) and are said with `worldSay(sb)`
  (`ctl.<id>.label`, `whatif.<id>`, `metric.<k>.label`…). Run `npm run i18n:extract` after changing a world's English.
  Ready languages (`lib/i18n/locales.ts`: all 20, machine drafts awaiting native review) need every key in `lib/i18n/locales/<code>/` and
  `worlds/<key>/locales/<code>.json`; `tests/i18n-catalogs.test.ts` checks placeholders, plural categories and gaps.
  Changing a world's English means updating those files too (or the language's test fails). `?pseudo` shows leftover English.
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
npm run i18n:extract  # write each world's English (labels + messages) to worlds/<key>/locales/en.json for translators
npm run og:images  # redraw each world's share picture, public/og/<world>.png (after changing a world's stage)
```

Run `npm run typecheck && npm test` after any change to `lib/` or `worlds/`.

## Architecture

```
app/                      Next.js App Router (static). / = solar (HOME_MODE), /scale = scale, /lab/[world] = a world
components/
  shell/                  Lab (nav, world switcher, account menu, ≥1600 px ad rails), LabClient (ssr:false), Tabs, WorldMenu (world tabs + More), ThemeToggle
  privacy/                analytics (change 0027): Vercel script, GA4 after consent (ConsentBanner, consent.ts rules), track();
                          never imported by lib/ or worlds/
  pages/                  About, Privacy, Terms (change 0032): DocPage (build-time text from locales/<code>/pages.json), DocNav
  account/                useAccount() adapter: state.ts (pure rules), context.tsx (provider), clerk.tsx (the only Clerk import,
                          lazy), AccountMenu, PremiumDialog. No key ⇒ everything free, as before
  console/                shared world-console blocks: StandardConsole, Stage (+ StageInteraction), Transport,
                          HistoryChart, Timeline, panels, Changes (tick list), ControlsForm, Dock, AdSlot (null for Premium), engines (singletons +
                          useWorldEngine), export/ (Premium export studio: preview, controls, fonts, MediaRecorder, fflate, jsPDF)
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
  engine.ts               SimEngine: base/alt worlds, change entries (tick on/off, remove, edit = exact replay from a step
                          log), reset, history, timeline merge, one-world stage drawing, `origin` (replay recipe)
lib/export/               deterministic replay of a fork (+ trim/length), scrubber, export style (JSON), video frames, stills,
                          slides and text files drawn with each sandbox's draw(); styles never reach the sim (change 0022)
lib/scale/                scale explorer objects + renderer
tests/                    vitest: every world × every what-if, determinism, world boundaries, ad slots
PRODUCT.md / DESIGN.md    product truth / canonical Control Room design system (tokens mirror app/globals.css)
docs/                     PLAN.md, features/, changes/, decisions/ (ADRs)
.claude/skills/           plan-change, document-feature, control-room-ui, add-sandbox
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
- `apply(w, id, p, ui)` applies a what-if to the changed world (which may already hold other changes). Log it with `note()`.
- `messages` — the world's English words as ICU messages, keyed relative to the world (`ev.*` event lines and the names they
  use); other languages override them from `worlds/<key>/locales/<code>.json` (change 0025).
- `read(w, p)` → `{metricKey: number | null}`; must be finite or `null`.
- `draw({ctx, w, h, p, isAlt, ui}, world)` draws into a clipped rect at (0,0). No React, no DOM.
- Optional: `info()` structured side-panel blocks, `onParamChange()` (e.g. presets), `maxT`, `hint`, `pace()` (a live-only
  slow-motion hint, 0–1, multiplied into the engine's clock; exports and tests never read it — child uses it, change 0019).

### Rules

- **Determinism**: never use `Math.random()` in `lib/sim` or `worlds/*/sim.ts`. Use `rng(w)` / `gauss(w)` (state in `w.rs`)
  so forks and tests are reproducible. Decorative-only randomness in `draw` must be derived from index/hash.
- **One world, stacking** (changes 0015, 0024): every world shows one world on the live stage — never split; what-ifs add up
  via `engine.change()`, so `apply()` must work on an already-changed world. Each change is a `SimEngine.entries` row that
  can be ticked off/on (`setOn`, `toggle`, `setAll`), removed or edited (`edit`, child's stop/move); the engine logs every
  live step (dt + params) and replays the changed world exactly, so `draw()` must never mutate the world and `step()` must
  depend only on (world, dt, params). `reset()` = default params, no changes, t = 0. The shared list is
  `components/console/Changes.tsx`; every console keeps it. Side by side (no change | with changes) exists only in exports
  (`layout.split`, default "alt" = changed only).
- Events: `note(w, key, values?, onceKey?)` — a message key from the sandbox's `messages` plus plain values (numbers,
  strings, `ref()` to another key of the world), never a sentence (change 0025). The timeline marks events as both /
  no-change only / what-if only by matching key + values and time. Show them with `eventText(sb, e)` (`lib/sim/say.ts`);
  `draw()` and exports say words through `worldSay(sb)`, which reads the page's language from `lib/i18n/page.ts`.
- Time units are per sandbox (`fmtT` formats them): galaxy 100 Myr, solar years, earth years, country
  years, animals days, child age in years, person years.
- Keep sim code (`worlds/*/sim.ts`, `lib/sim`) pure TypeScript so it can move into a Web Worker later.
- UI colours come from CSS tokens in `app/globals.css`; canvas code uses the same hex values
  (`--base` #7FB2FF = no-change world, `--alt` #FFB547 = what-if world, `--signal` #3BD4C7 = controls only).

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
  read in `apply()`. Fast passes escape friction only well above escape speed (fly-through aims 80 kly off). Galaxy catalogue
  (change 0038, `data.ts`): `ours` / `them` pickers are `fresh` and pre-fill mass (capped 20×), `rsize` and shape; units stay
  relative to ours; the default pair's run is pinned by `tests/galaxy-catalogue.test.ts`.
- **solar**: leapfrog N-body, G = 4π² (AU, yr, M☉), dt ≤ 0.0015 yr; merges on collision radius. Star systems (change 0037,
  `data.ts`): the `sys` picker is `fresh` (starts over); dt = shortest year / 160 (Solar System stays 0.0015); metrics follow
  `w.watch`; other systems' words come from `reword()`. The default run is pinned by `tests/solar-systems.test.ts`.
- **space camera** (change 0036, solar + galaxy): `lib/sim/camera.ts` (orthographic orbit camera), gestures in
  `components/console/stageCamera.ts`, `ViewBar`. View only: `ui.view` is never in a world or a change recipe; with no
  camera, draw() gives the old framing. Physics stays planar; depth (solar inclinations, galaxy disc thickness) is draw-only.
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
  `rng(w)` per kid and are only summed up in the timeline ("By 10, 31 of 100 kids…"). Change 0019: each change has a
  length (`end`), can be stopped / moved / undone on its own (`edit.ts`, through `engine.edit` / `engine.remove` since 0024; exact because draws never depend on changes — keep
  it so: anything change-dependent uses `hash01`, never `rng(w)`), sensitive-age weights, ~100 per-kid follow-on events
  (`RIPPLES`, hash-based), buffers (`BUFFERS`: a friend, calm home, big family… soften hard changes) and combos; options
  baby temperament, family shape, time together, sensitivity; 38 changes with youngest ages. `contributions()` shares the
  soft cap out per change ("What mattered"); `BEHAVIOURS` = everyday "likely to, out of 100". Stage in `scene/` (rooms of a
  life, the typical or picked kid as hero, meters, props, the change moment via `pace()`; "All 120 kids" as piles). The
  world owns its chart (Now, Growing up, Every day, What mattered), story, timeline and life ruler (`Chart.tsx`,
  `parts.tsx`). Tests: `tests/child.test.ts`.
- **earth** stacking (change 0024): `w.mods` = {id, year, mix}; emission multipliers multiply, sinks/sources/aerosols add,
  methane cuts multiply what is left, walls keep the highest.
- **person**: 100 versions; daily quit hazard high early, falling after ~66 days for good habits. Habits stack (change
  0024): `w.hs`, per-version `kept[i]` / `e[i]`; picking a running habit starts it again.

## Roadmap

The roadmap lives in `docs/PLAN.md` (phases) and `docs/changes/` (planned work). Don't keep a second list here.
