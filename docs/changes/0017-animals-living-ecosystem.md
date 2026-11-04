# 0017 — Animals world: build any ecosystem, watch bodies change, read it like a picture book

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** [Fork and compare](../features/fork-and-compare.md) (animals joins the stacking worlds)
- **Decisions:** —
- **Created:** 2026-11-04 · **Shipped:** 2026-11-04

## Why

The animals world is the most Primer-like idea in the lab and the one children reach first from the scale
explorer (bee, meerkat, wolf, lion, elephant, orca), yet it is the least readable screen. Every animal is the
same blob on a flat green rectangle; there is always exactly one "your species" and one anonymous "other"
(an elephant's "predator" is a lion, a salmon's is a bear); motion is jittery because headings take a random
jump every sub-step; the chart's tabs say "Avg speed ×" and "Food", which a 10-year-old cannot connect to
what they see. Evolution — the whole point — is invisible: a wolf that got 30 % faster looks identical.

The user asked (2026-11-04) for: the whole tab redesigned with the `impeccable` skill; smooth, readable
animation; understandable "even for children"; more options; **any pair or more of animals** put together;
and a chart/simulator that is human-centric, so people understand what it shows. The user pre-approved this
doc and asked for it to be built straight away.

Choices made for the user (they delegated them; change them in review if wrong):

- **Changes stack** (`stack: true`, as solar, galaxy and country): "remove the wolves" *and* "climate warms"
  add up in one big meadow. The no-change world runs hidden and feeds every comparison (chart, sentences,
  ghost counts). A full-width single stage is far easier for children to read than two half-size arenas.
- **A cast of 2–5 animals** from a list of ~18, plus ready-made worlds. Who eats whom comes from a fixed
  food web, not from "kind 0 / kind 1".
- **Bodies show evolution.** Each animal is drawn as a simple recognisable silhouette whose size, legs, ears
  / eyes and coat follow its evolved traits, and a "then vs now" portrait shows the typical animal on day 0
  next to today's.

## Scope

**In** (everything lives in `worlds/animals/`; shared code untouched except what Design → Shared lists):

1. **Cast of animals (data.ts).** ~18 species, each with: name, plural, latin, habitat(s), diet
   (`plants` / `meat` / `both`), what it eats (list of species ids + "plants"), body size class, base speed,
   cold/heat comfort, colour, a drawing spec (see Stage), and the kid-readable facts already in `data.ts`
   (where, family life, food, lifespan, role in nature). Keep the eight current ids so scale links
   (`animals:wolf`, `animals:bee`, …) keep working. Suggested cast:

   | Habitat | Animals |
   | --- | --- |
   | Forest & tundra | gray wolf, elk, red fox, rabbit, brown bear, beaver |
   | Savanna | lion, zebra, African elephant, cheetah, gazelle |
   | Desert | meerkat, jackal, scorpion (food for meerkats) |
   | Ocean & ice | orca, seal, Atlantic salmon, emperor penguin, leopard seal |
   | Meadow | honeybee, hornet, (flowers are the "food") |

   Exact list is the builder's call within ~16–20; every meat-eater must have at least two possible prey in
   the cast and every plant-eater must be someone's prey.

2. **Ready-made worlds + Build your own** (param `world`, picker on top of Ask, grouped by habitat):
   Yellowstone (wolf, elk, beaver, bear), Savanna (lion, zebra, elephant, gazelle), Kalahari (meerkat,
   jackal, scorpion), Antarctica (penguin, leopard seal, orca), North Atlantic (salmon, seal, orca, bear on
   the shore), Meadow (honeybee, hornet), Fox and rabbits. The old preset param `species` maps each of the
   eight old ids to the ready-made world that features it (wolf → Yellowstone, elephant → Savanna, …), so
   `meta.presetParam` and scale links stay valid. Editing the cast switches the label to "Your own world
   (based on Savanna)".

3. **"Who lives here" cast editor** (in Ask, under the picker): one row per animal — small drawn icon,
   name, "how many at the start" stepper (0–150 for plant-eaters, 0–40 for meat-eaters), remove button;
   "+ Add an animal" opens a grouped list of the rest (habitat headings; animals from another habitat are
   allowed and marked "far from home", they pay the climate cost). Min 1, max 5 animals. Changing the cast
   restarts the world (same as changing a country). Any combination must run: animals with nothing to eat
   starve and the timeline says so plainly.

4. **Habitat and nature settings (Tune), grouped, each with plain units:** Habitat (forest, savanna,
   desert, ocean, ice, meadow — changes backdrop, cover and what "food" looks like), Food growth (% of
   normal), Room to roam (habitat intact %), Temperature change (°C), Seasons (off / gentle / strong: food
   grows in yearly waves — visible as the ground greening and browning), People hunting (none … a lot),
   Mutation (how different babies are: small / normal / big). Plus "Change settings (used by your next
   click)": which animal a targeted change applies to, disease strength, how many newcomers arrive.

5. **Changes that add up (stacking what-ifs, ~14)**, grouped, phrased as questions:

   | Group | id | Change |
   | --- | --- | --- |
   | Animals | `remove` | What if the [chosen animal] disappeared? |
   | | `add` | What if [chosen animal] moved in? (adds any species not in the cast, or more of one) |
   | | `disease` | What if a sickness spread among the [chosen animal]? (strength setting) |
   | | `invasive` | What if a fast-breeding newcomer arrived? (rabbits, or the chosen plant-eater) |
   | Climate | `warm` | What if it got 3 °C warmer? |
   | | `cool` | What if an ice age began? (−4 °C) |
   | | `drought` | What if it stopped raining for a year? (food halves, then recovers) |
   | | `rain` | What if there were years of good rain? (food booms) |
   | | `fire` | What if a wildfire burned a third of the land? (burnt strip regrows over months) |
   | People | `habitat` | What if half the land became farms and roads? |
   | | `reserve` | What if it became a protected reserve? (hunting stops, food recovers) |
   | | `hunt` | What if people hunted the [chosen animal]? |
   | | `move` | What if they were moved to the opposite climate? |

   Kept event text where the event still exists (e.g. "Half the habitat is lost to farms and roads").
   Clicking a change again applies it again (×2 badge, as in country).

6. **Traits that evolve, now four:** speed, size, senses (how far it notices food and danger) and **coat**
   (thin ↔ thick: thick coats save energy in cold, cost in heat). Cost ∝ size³·speed² + senses + coat
   mismatch with temperature. Mutation σ follows the Mutation setting (normal = today's 7 %).
   Warming should visibly thin coats over generations; adding a fast predator should speed prey up.

7. **Human-centric results** (world-owned components, not the shared chart):
   - **Chart, two views** (tabs in plain words): "How many of each" — one line per animal in its own colour,
     with the animal's icon and name labelled directly at the line end (no legend lookup), no-change world
     as a faint dashed line of the same colour; "How their bodies changed" — pick an animal, see speed /
     size / senses / coat as "× compared with day 0". Y-axis in plain units ("animals", "× day 0").
   - **One sentence under the chart** for the current view, from the hidden no-change world: "With your
     changes there are **23 more elk** and **6 fewer wolves** than without them (day 340)." Good/bad marked
     with words and sign, never colour alone.
   - **Right now** panel: per animal — icon, name, count, a small trend arrow with words ("rising",
     "falling", "steady", "gone"), and the no-change count in brackets.
   - **Then vs now portrait:** for the selected animal, the typical animal on day 0 drawn beside the
     typical one now, same scale, with one-line captions ("Now 18 % faster, ears bigger, coat thinner").
   - **Story** (Read / under the changes): 3–5 deterministic template sentences explaining what happened and
     *why* in the model's own terms ("With no wolves to chase them, the elk ate the grass faster than it
     grew. Then many went hungry."). Never "will", never predictions.
   - **Timeline** in the same voice, with simple icons per event type (born boom, died out, moved in,
     body change, weather).

8. **First-run hint** on the stage (dismissable, once per visitor via the existing pattern if one exists,
   otherwise a short line in `hint`): "Each animal is a little different. The ones that fit best have more
   babies. Press play and pick a change."

9. World README brief rewritten: audience (kids 10+, teachers, Primer fans), model, cast, what "excellent"
   means. CLAUDE.md animals model note updated.

**Out:**

- Real photos or licensed art; animals are drawn procedurally from simple shapes.
- Violence: no blood, no attack animation beyond a quick lunge; a caught animal disappears in a soft puff.
  People-hunting is shown as numbers and a sign, never hunters or weapons on stage.
- Removing a single stacked change ("Undo all changes" covers it, as in other stacking worlds).
- Plants as agents (food stays as pellets drawn as grass, berries, plankton or flowers by habitat).
- Changes to other worlds, the engine's split mode, or shared console blocks beyond Design → Shared.

## Design

Follows DESIGN.md (read it in full: Temperature Rule, One Fill Rule, Two Voices, closed type scale, motion
rules), the `darkroom-ui` checklist, the `impeccable` craft floor (`.claude/skills/impeccable/reference/
craft-floor.md`, plus `reference/animate.md` for motion), and the Sandbox contract in CLAUDE.md. Mode is
**Operate** with a playful stage: chrome stays precise and calm, the stage carries the warmth. Copy reads at
age 10+ (PRODUCT.md → Kid-friendly).

### Model (`sim.ts`, framework-free, deterministic)

- World holds `cast: string[]` (species ids, fixed at init) and creatures `{ s: castIndex, x, y, a, va
  (turn rate), e, sp, sz, se, coat, age, ph (gait phase), born }`. Plain data only.
- **Food web:** a creature hunts creatures whose species is in its `eats` list and that are smaller than
  ~1.4× its size (pack hunters — wolf, lion, orca — may take up to 2.5× with a group bonus); plant-eaters eat
  food pellets; `both` eats either. Flee from any species that eats you.
- **Stabilisers kept and generalised** (they keep long runs alive): cover patches where prey is safe; each
  meat-eater's population capped relative to the prey it can eat (today's `nc < nh/4` per predator);
  hunt success ~30 % per lunge; recolonisation — a pair of a species wanders in from the edge when it died
  out and conditions allow, unless a change removed it. Plant-eaters capped (today 450) shared across the cast.
- **Smooth motion in the model:** heading changes through a turn rate with damping (`va` eased toward
  the wanted direction, small gaussian wander on `va`, not on `a`), so paths are curves, not zig-zags;
  speed eases up when chasing/fleeing. Still deterministic.
- **Stacking:** `w.mods` (id, start t, size, target species) replaces `w.mod`; every rule reads all
  active mods; `apply()` works on an already-changed world. Temporary mods (drought, rain, fire) expire by
  time.
- Budget: ≤ 600 creatures, ≤ 700 food pellets, < 4 ms per step at 30 days/s on a laptop.
- Metrics (fixed keys so the engine's history works): `n0..n4` (count of cast slot i, `null` when the slot
  is empty), `food`, and per-slot traits `sp0..sp4`, `sz0..`, `se0..`, `co0..` (relative to day 0). The
  shared `HistoryChart` is not used; the world's own chart reads `engine.history` by these keys.
- Deterministic: same params + seed + changes + times ⇒ same world (existing tests enforce).

### Stage (`scene.ts` new; `sim.draw` delegates to it)

- **Backdrop by habitat**, painted in layers like earth's fjord and country's street: savanna (gold grass,
  acacias), forest (pines, snow patches when cold), desert (dunes, rocks), ocean (depth gradient, kelp,
  light shafts), ice (floes, dark water), meadow (flowers). Cover patches drawn as bushes / rocks / kelp
  / burrows. Seasons tint the ground. Lost habitat drawn as fields and a road; burnt land as dark ground
  with sprouts returning. Static layers cached per stage size and habitat.
- **Animals as silhouettes**, not blobs: a per-species drawing spec in `data.ts` (body shape, head, ears or
  horns, mane, stripes/spots, tail, legs 0/2/4, fins, wings, colour, pattern colour). Drawn from simple
  shapes, ~10–40 px, facing their heading (flip, not rotate, for land animals; rotate for fish/bees).
  Evolved traits are visible: size scales the body; speed lengthens legs slightly; senses enlarge
  ears/eyes; coat thickens the outline fur. Readability over realism; each species identifiable at 14 px.
- **Smooth animation (renderer side):** a draw-only renderer clock (as earth and country) drives walk
  cycles (leg swing from `ph`), tail wag, bee wing flicker, fish tail sway; babies fade/scale in over ~0.4 s
  of real time; caught or starved animals fade out with a small puff (a short-lived `w.fx` list in the world,
  pruned by time — plain data). Eating: a tiny "nom" pop on the pellet. Positions are drawn interpolated
  between the last two sim states if the engine provides them; otherwise smooth model motion is enough —
  the builder measures and picks. At high speeds (≥ 15 days/s) gait stops and animals draw as clean
  silhouettes to avoid strobing. **Reduced motion:** clock frozen, no gait/puffs, fades become instant.
- **On-stage labels:** top-left chips per animal — icon, name, count — in stage chrome type; a ripple on the
  chip when that count jumps; "gone" chip state when extinct. Day chip stays the engine's.
- Kid-safe throughout (Out list above).

### Console (`worlds/animals/Console.tsx`)

Copied from `StandardConsole` (ad slots unchanged, ADR 0007), country's console as the reference:

- **Ask column:** world header → "Pick a world" (grouped select) → "Who lives here" cast editor → "Make
  changes" (grouped, stacking, ×N badges) → Story.
- **Results strip (≥ 1024):** the world's chart (two views + sentence) | timeline. Right now panel and
  then-vs-now portrait in Ask at ≥ 1280, in Read below that.
- **Phones (dock):** Ask (world, cast, changes) · Tune · Read (story, right now, portrait, chart, animal
  facts) · Log. No page scroll; one viewport (DESIGN.md → Layout).
- Info blocks become per-animal fact cards (icon + the existing kid facts), shown in Read.

### Motion in chrome

Follow DESIGN.md motion tokens and reduced-motion rules: count numbers tick rather than jump (≤ 300 ms),
trend arrows and "gone" states cross-fade, the cast editor animates rows in/out (height + opacity, ≤ 200 ms),
change buttons give a pressed confirmation. No decorative motion outside the stage.

### Shared code

None planned. If the builder needs a shared option (e.g. engine exposing the previous world for
interpolation, or `Control` gaining a `help` line), it must be additive and leave other worlds' output
unchanged, and be listed in this doc's Log.

## Steps

Each ends green on `npm run typecheck && npm test`.

1. **Data:** cast table with drawing specs and facts; ready-made worlds; old `species` ids mapped. Test:
   every species has ≥ 1 food source; every ready-made world and every old preset id inits finite.
2. **Model:** cast-indexed creatures, food web, coat trait, turn-rate motion, generalised stabilisers,
   `w.mods` stacking, `stack: true`, new metrics. Tests: default world (Yellowstone) predators and prey
   coexist ~600 days; every pair of cast species runs 300 days with finite readouts; all changes stacked
   on Savanna for 600 days stay bounded; warming thins coats; adding a cheetah speeds gazelles up (or a
   documented equivalent); determinism. Update `tests/stack.test.ts` STACKING list to include animals.
3. **Changes:** ~14 stacking what-ifs with targets and sizes; stable plain event text.
4. **Stage:** `scene.ts` — habitats, silhouettes with visible traits, renderer-clock animation, puffs and
   births, chips, reduced motion; perf check.
5. **Console + results:** cast editor, world picker, grouped changes, world-owned chart with two views and
   sentence, Right now, then-vs-now portrait, Story, fact cards; dock layouts.
6. **Browser check** (dev server via preview tools; see memory: stop preview before `npm run build`):
   Yellowstone, Savanna, a custom 5-animal mix, a nonsense mix (penguin + lion); stack 3–4 changes; every
   change once. 375 × 812, 768 × 1024, 1024 × 768, 1280 × 800, 1440 × 900; light theme (stage stays dark);
   keyboard path through cast editor; reduced motion; no page scroll; smooth at 2 and 30 days/s.
7. **Docs:** world README, CLAUDE.md animals note, fork-and-compare feature (animals stacks), PLAN.md
   checkbox note, this doc → shipped with an honest Verification and Log.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Arbitrary casts collapse instantly (nothing to eat, everyone dies) | That is a valid answer, told plainly in Story/timeline; stabilisers keep sensible casts alive; tests run every pair. |
| Long-run coexistence test breaks | Default world keeps the predator cap, cover and recolonisation; test kept and pointed at Yellowstone. |
| Silhouettes unreadable when small or cluttered at 600 animals | Min draw size per species, simplified shape below 12 px, cap per-species draw detail; checked at 375 px. |
| Frame time with 600 animated silhouettes | Cached backdrop; shape paths reused per species; gait off at high speed; measure at 1440 × 900. |
| Old scale links / shared scenarios break | `species` preset param still accepted and mapped; test for all eight ids. |
| Violence or upsetting content for kids | No blood or attacks shown; soft puff; neutral words ("caught", "went hungry"). |
| Too many controls overwhelm | Ready-made worlds first; cast editor and Tune grouped; change targets live in one "Change settings" group. |
| Comparisons lost without split stage | Hidden no-change world drives chart dashed lines, sentences, Right now brackets and Story. |

## Verification

- [x] Automated: `tests/animals.test.ts` (cast and food web, ready-made worlds, all eight old preset ids, cast parsing,
  Yellowstone coexistence ~600 days, all 13 changes stacked on Savanna for 600 days stay bounded, warming thins coats,
  a cheetah in the cast breeds faster gazelles, removing hunters lets prey multiply, newcomer joins the cast and a sixth
  kind is refused, hunting lowers a count, determinism with changes, plain-data world, story/caption wording) and
  `tests/animals-pairs.test.ts` (all 210 pairs of species run 300 days, finite, ≤ 600 animals). `tests/stack.test.ts`
  now lists animals as stacking; `tests/sandboxes.test.ts` coexistence check reads `n0`/`n1`. 431 tests green.
- [x] Manual (partly): browser pane at 375 × 812, 768 × 1024, 1024 × 768, 1280 × 800, 1440 × 900 — no page scroll or
  sideways scroll (`scrollHeight === innerHeight` checked at 375, 768, 1440); light theme (stage stays dark, chart
  lines darkened); Yellowstone, Savanna, Antarctica, North Atlantic, Meadow, Kalahari backdrops; a 5-animal cast
  (Yellowstone + cheetah); a nonsense mix (emperor penguin + lion in the forest, lion marked "far from home"); all 13
  changes stacked once; keyboard path through the cast editor (stepper buttons, focus kept after the restart).
  **Not verified:** reduced motion (the pane cannot emulate it; code path reviewed only), smoothness by eye at 2 and
  30 days/s (the browser pane was hidden, so frames were throttled to ~1–2 fps), 1440 × 900 in light theme at length.
- [x] Performance (measured, not on a real 60 fps screen): model alone ≈ 1.3 ms per 10 sub-steps (one frame at 30 days/s)
  for a ~250-animal world in Node, so ≈ 2.6 ms for both worlds; in the hidden pane, where each frame carries 1.5 days
  (30 sub-steps × 2 worlds) plus drawing, the stage frame took ~15 ms (p90) with five animals and a change applied.
- [x] Docs: world README, CLAUDE.md animals note, fork-and-compare feature (animals stacks), PLAN.md note.
- [x] `npm run build` passes (built from a copy of the tree so the running dev server was not disturbed; the first
  attempt failed on a transient Google Fonts fetch, the retry passed).

## Log

- 2026-11-04 — proposed and approved in advance by the user ("auto approving"); built by an Opus subagent.
- 2026-11-04 — built. Deviations from the plan:
  - **21 species**, one over the ~16–20 range: every animal in the suggested table is in, including both seals.
    Lion also eats elephants (pack only, low odds) so every plant-eater is someone's prey; jackals and hornets do not
    eat scorpions (the Kalahari collapsed otherwise); scorpions have a "guard" (sting) that cuts hunt odds.
  - **Model tuning beyond the doc:** food grows 150 bits a day (was 60) so several plant-eaters fit; everyone forages
    at one walking pace (a species' top speed is for chasing and fleeing only); rare plant-eaters get more from each
    bite (niche sharing) — without it one plant-eater always drove the others out. Hunters that also graze (bear, fox,
    seals, hornet) get +3 on their cap, not more. Recolonisation is limited to three times per species and never
    after "remove" (the log filled with "wanders in / died out" otherwise). The coat shifts the felt temperature by
    10 °C per unit; each species is adapted to the habitat it starts in (clamped to its comfort range).
  - **Pack hunters** use 2.5× always, with 0.4× odds on big prey when no packmate is within reach (simpler than a
    group test).
  - **Interpolation** between sim states: not added (no shared engine change). Model motion is turn-rate smooth and
    a 2 days/s frame is under one sub-step, so positions move every frame; gait stops above ~12 days/s.
  - **Puffs and noms** come from `w.fx` (seq, x, y, kind; last 48 kept); births fade in from a renderer-side id map
    (a scene cut — more than 30 % new ids at once, e.g. "Undo all" — shows instantly).
  - **Change settings** split: the target animal and "who could move in" are selects in Ask next to the changes (their
    options depend on the cast, which shared `ControlsForm` cannot show); sickness strength and newcomers stay in Tune.
  - **Speeds** relabelled "2 d/s … 30 d/s" so the transport fits one row at 1280 px.
  - **Chart legend** is drawn in words on the chart's bottom axis row (DOM legend made the chart too short at 1280).
  - **Stage chips** show "(n)" in reality blue for the no-change count; on stages under 560 px they show icon + count.
  - **Timeline glyphs** reuse existing Icon glyphs (minus = died out, arrow = moved in, plus = boom, expand = body
    change, sun = weather and land, fork = your change); no new shared glyphs.
  - **First-run hint** uses `Sandbox.hint` (transport line; hidden on phones) — there is no dismissable pattern yet.
  - **Styles** live in `worlds/animals/animals.module.css` (the first CSS module in the repo) rather than `globals.css`.
    In dev, a hot reload of that file sometimes drops the module styles until the page is reloaded; production build
    and client-side navigation load them correctly.
  - **Shared code:** none changed.
