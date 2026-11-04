# Animals — world brief

This folder is the **animals** project (change 0008, redesigned in [change 0017](../../docs/changes/0017-animals-living-ecosystem.md)).
Everything only this world needs lives here; it may use the shared tokens (`app/globals.css`), primitives
(`components/ui/`) and console blocks (`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `data.ts` | The cast: 21 species (food web, size, speed, comfort range, drawing spec, kid facts), ready-made worlds, old scale-link ids. |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw), plus `story()`, `caption()` and the change questions. Framework-free, deterministic. |
| `scene.ts` | The stage: habitat backdrops (cached), food, animal silhouettes with visible traits, puffs, births, chips. Draw-only renderer clock. |
| `Console.tsx` | This world's screen (StandardConsole bands; ad slots kept, ADR 0007). |
| `Chart.tsx` | The world's own chart: "How many of each" and "How their bodies changed", with one plain sentence. |
| `parts.tsx` | World picker, cast editor, changes, story, right now, then-and-now portrait, timeline, fact cards. |
| `animals.module.css` | Styles for the parts above (tokens only). |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |

## Who it's for

Kids 10+ who arrive from the scale explorer (bee, meerkat, wolf, lion, elephant, orca), teachers showing food webs and
natural selection, and Primer fans who like watching bodies evolve.

## Model

- **Cast.** 1–5 species from 21, in one arena (model units 1 × 0.6). Ready-made worlds: Yellowstone, Fox and rabbits,
  Savanna, Kalahari, Antarctica, North Atlantic, Meadow; or "Build your own". The old `species` preset param (scale links
  `animals:wolf` …) maps to the ready-made world that features that animal.
- **Food web.** Each species lists who it can catch (`eats`); `plants` / `both` diets graze food pellets (drawn as grass,
  flowers, bugs or krill by habitat). Hunters take prey under 1.4× their own size, pack hunters (wolf, lion, orca) up to
  2.5× (lower odds without a packmate nearby). Everyone flees from species that eat them.
- **Traits.** Speed, size, senses and coat, inherited with mutation (σ 3.5 / 7 / 14 % by setting). Daily cost
  ∝ 0.1 + 0.35·size³·speed² + 0.12·senses + 0.12·speed, × a climate cost that grows with the gap between the temperature
  felt (coat shifts it by 10 °C per unit) and the temperature the species is used to, plus a penalty outside its comfort
  range. Hunters (metabolism 1) pay 22 % of that, breed slower and live longer.
- **Movement.** Turn-rate steering (heading eased through `va`, gaussian wander on `va`), so paths curve. Everyone
  forages at one walking pace; a species' top speed is only used to chase or flee.
- **Stabilisers.** Cover patches where prey are safe; each hunter capped by its share of the prey it can eat (`prey/4`,
  +3 for hunters that also graze); ~30 % hunt success per lunge (a scorpion's sting cuts it); rare plant-eaters get more
  from each bite (niche sharing) so several coexist; plant-eaters share a cap of 450; recolonisation by a wandering pair,
  at most three times, never after "remove". Budget: ≤ 600 animals, ≤ 700 food bits.
- **Changes stack** (`stack: true`, `w.mods`): remove, add (any species, a sixth kind is refused), disease (strength
  setting), fast-breeding newcomer, 3 °C warmer, ice age, a year without rain, years of good rain, wildfire (burnt strip
  regrows), half the land lost, reserve, people hunting one animal, opposite climate. The hidden no-change world feeds
  the chart's dashed lines, "no change" counts, sentences and the story.
- **Metrics** (fixed keys for the engine's history): `n0..n4` counts per cast slot (`null` when the slot is empty),
  `food`, and `sp/sz/se/co 0..4` traits as × day 0.

## Questions it answers best

- What if the wolves disappeared from Yellowstone? (the elk boom, then go hungry)
- What if it got warmer? (coats thin over generations)
- What if cheetahs moved in? (gazelles get faster)
- What if a penguin met a lion? (it cannot live here: told plainly)

## What "excellent" means here

A 10-year-old can tell every animal apart at a glance, sees bodies change ("then and now"), and can say in one sentence
what a change did and why. Any combination of animals runs; motion is smooth and calm; nothing violent (a caught animal
disappears in a soft puff, people-hunting is numbers and words only); the screen fits one viewport at every size.
