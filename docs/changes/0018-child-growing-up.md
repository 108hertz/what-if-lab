# 0018 — Child world: watch one family's possible kids grow up, in words anyone can read

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** [Fork and compare](../features/fork-and-compare.md) (child joins the stacking worlds)
- **Decisions:** —
- **Created:** 2026-11-04 · **Shipped:** 2026-11-04

## Why

The child world asks one of the most human questions in the lab — *how much do parents, siblings and life
events shape who a child becomes?* — but it is the hardest screen to read. Five rows of 120 dots labelled
"Openness", "Conscientiousness", "Neuroticism"; one blob for "typical child"; parents set by ten 0–100
sliders of jargon; eight what-ifs that can't be combined; a shared chart of trait averages with "/100" units.
A 10-year-old (or most parents) cannot tell what a dot is, what "52 conscientiousness" means, or why the
what-if mattered. Nothing moves except dots jittering sideways.

The user asked (2026-11-04) for: the whole tab redesigned with the `impeccable` skill; smooth, readable
animation; understandable "even for children"; more options; more possible effects and side events that
can happen; and a chart/simulator that is human-centric, so people understand what it presents. The user
pre-approved this doc and asked for it to be built straight away by an Opus subagent.

Choices made for the user (delegated; change them in review if wrong):

- **Changes stack** (`stack: true`, as solar, galaxy, country, animals). A childhood is a *sequence* of things
  that happen — "a sibling arrives at 4, joins a team at 8, parents separate at 12" — so what-ifs add up in
  one life. The hidden no-change world feeds every comparison.
- **Plain-word traits.** The Big Five stay in the model (so it stays grounded in research) but every surface
  uses kid words: **Curious** (openness), **Organised** (conscientiousness), **Outgoing** (extraversion),
  **Kind** (agreeableness), **Calm** (= 100 − neuroticism, flipped so *higher is always calmer*). The science
  name appears once, small, in an "About the science" block.
- **Show people, not dots.** The stage shows children growing up in a home; the 120 possible kids appear
  as a crowd of little faces, and the results speak in "out of 100 kids" and sentences.

## Scope

**In** (everything lives in `worlds/child/`; shared code untouched except what Design → Shared lists):

1. **Family setup (Ask), friendly instead of 10 sliders.**
   - **Ready-made families** (param `family`): e.g. "Two calm, organised parents", "Two lively, outgoing
     parents", "One worrier, one easy-going", "Curious artists", "Average parents", plus **"Build your own"**.
   - **Parents as cards:** Parent A / Parent B each shown as a drawn face with five plain-word chips
     ("very curious", "a bit shy"…). Editing opens five 5-step choices per parent (e.g. *Outgoing:* very shy ·
     a bit shy · in between · a bit outgoing · very outgoing), mapped to 10/30/50/70/90. The underlying
     `aO…bN` params stay (so links and tests keep working); presets just set them. Editing switches the
     label to "Your own family (based on …)".
   - **Home:** parenting style (warm and firm / strict / easy-going / distant), siblings (none / one older /
     one younger / two or more), home life (calm / busy / lots of arguing), money at home (tight / OK /
     comfortable), where they live (city / town / countryside), school (crowded / ordinary / great teachers),
     screen rules (strict / some / none). Each with a one-line plain "what this does" help text.
   - Changing family or home restarts the world (as changing a country does).

2. **Tune (nature settings, plain units):** "How much is inherited" (low 25 % / normal 40 % / high 55 %),
   "How much chance and luck" (small / normal / big — scales individual noise and drift), "How long effects
   last" (fade fast / normal / stick), and "Change settings (used by your next click)": age it happens at
   (now / pick an age 1–17 for scheduled events), how big (small / medium / big).

3. **More things that can happen — stacking, grouped, phrased as questions (~20):**

   | Group | id | Change |
   | --- | --- | --- |
   | Home | `authoritative` | What if the parents became warm and firm? |
   | | `strict` | What if the parents got much stricter? |
   | | `sibling` | What if a little brother or sister arrived? |
   | | `divorce` | What if the parents separated? |
   | | `grandparent` | What if a grandparent moved in? |
   | | `pet` | What if the family got a dog? |
   | | `money` | What if money got tight for a few years? |
   | | `illness` | What if a parent got seriously ill for a year? |
   | School & friends | `bullied` | What if they were bullied for a year? |
   | | `bestfriend` | What if they found a best friend? |
   | | `teacher` | What if they had a great teacher? |
   | | `newschool` | What if they changed schools? |
   | | `mentor` | What if a mentor took an interest in them? |
   | Activities | `sport` | What if they joined a team sport? |
   | | `music` | What if they learned an instrument? |
   | | `reading` | What if they read every night? |
   | | `screen` | What if they got lots of screen time? |
   | | `nature` | What if they spent lots of time outdoors? |
   | Big moves | `move` | What if the family moved to another country? |
   | | `volunteer` | What if they started helping others (volunteering)? |

   Effects are rough, literature-*inspired* trait shifts with a "how much lasts" factor, kept modest (no
   change should move the average more than ~10 points). Clicking again applies again (×2 badge). Content is
   kid-safe: no abuse, death, drugs or violence; illness and separation described gently.

4. **Side things that just happen (random life events, deterministic via `rng(w)`).** Each child in the
   120 independently meets everyday life events with age-dependent chances: a move, a new sibling, a broken
   arm, a big win, a close friend moving away, a summer camp, a pet. Small effects that partly fade. Toggle
   in Tune: "Everyday ups and downs" (off / normal / lots). The timeline shows them only as aggregate
   lines ("By 10, 31 of 100 kids have moved house at least once"), never per-child spam.

5. **Life milestones** (stable event text, noted once): first words (~1), starts school (5), first best
   friend (~7), teenage years begin (13), finishes school (18), first job (~20), settles down (~25–30).
   Trait-based milestones phrased softly: "Most kids are calmer again after the teen years".

6. **Human-centric results** (world-owned components, as animals did; not the shared `HistoryChart`):
   - **"Who they became" chart, two views** (tabs in plain words):
     - **"Growing up"**: one line per trait over age 2–60, each line in its own colour and labelled at its end
       with an icon + word (no legend lookup), the no-change life as a faint dashed line of the same colour,
       markers where each change happened. Y-axis: "less ← → more" bands, not 0–100. Shaded band for the
       middle half of the 120 kids ("most kids are in here").
     - **"Out of 100 kids"**: for a picked trait, a row of 100 little faces (unit chart) coloured by
       low / in between / high, now vs no-change: "**34 of 100** are very organised (was 22 without the
       changes)". Counts animate when they change.
   - **One sentence under the chart** comparing with the hidden no-change world in kid words: "With your
     changes, these kids grow up **a bit calmer** and **much more organised**. Outgoing stayed about the
     same." Good/bad never by colour alone; "more" and "less" are not judged good or bad except Calm.
   - **"Meet the child" card:** the most typical child at the current age — drawn face + 5 trait chips +
     one generated line ("Sam, 12: curious and outgoing, sometimes worries before tests"), plus
     **"Meet another one"** to step through individual children (deterministic order) so people see that
     kids of the same parents differ. Names from a fixed neutral list, seeded by index.
   - **Nature vs nurture bar:** for each trait, how much of the difference between kids comes from
     parents' genes, home, life events, and chance — a single stacked bar with words, computed from the
     model's own components. This answers "how much does chance matter?" directly.
   - **Story:** 3–5 deterministic template sentences explaining what happened and *why* in the model's
     terms ("When a little sister arrived at 4, most kids became a bit kinder. Being bullied at 10 made many
     more worried for a few years, then most bounced back."). Never "will", never advice or diagnosis.
   - **Timeline** in the same voice with simple icons per event type (milestone, home, school, activity,
     everyday life, your change).

7. **Stage: a living childhood** (`scene.ts` new; `sim.draw` delegates).
   - **Top: the family.** Parent A and B drawn as simple friendly characters (face, hair, colours from their
     traits: expression from calm, posture from outgoing), in a home backdrop that changes with the settings
     (city flat / town house / countryside; tidy vs busy; pets, grandparent, siblings appear as characters
     when present). Backdrop painted in layers, cached per size and setting.
   - **The typical child grows.** One central child character whose size, proportions and clothes change
     smoothly with age (toddler → kid → teen → adult → middle age), expression and pose reflecting the
     typical traits (calm → relaxed face; outgoing → waving / open pose; curious → book or magnifier;
     organised → backpack neatly packed; kind → holding hands with a sibling/friend). Activities from
     changes appear as props (football, violin, book, tablet, dog).
   - **Bottom: 120 possible kids** as a crowd of tiny faces arranged on five plain-word strips (or a
     single selected trait strip on small stages), positions easing smoothly to their new values every
     frame rather than snapping; colour by the world (`--base`/`--alt` hex values). Hovering/tapping a face
     shows "Kid #37: very curious, a bit shy". The typical child's marker slides along each strip.
   - **Change moments:** when a change is applied, a short on-stage caption card ("Age 8 — joins a team
     sport") slides in and fades, and the affected strips pulse once.
   - **Smooth animation:** a draw-only renderer clock (as earth/country/animals) drives breathing/blinking,
     the child's growth tween, crowd easing (critically damped, ~300 ms), and caption cards. Positions are
     eased in the renderer from the sim state; the sim stays pure. **Reduced motion:** clock frozen, easing
     instant, no pulses.
   - Kid-safe throughout.

8. **First-run hint** via `Sandbox.hint`: "These are 120 kids the same two parents could have. Press play
   to watch them grow up, then try a change."

9. World README brief rewritten (audience: parents, kids 10+, teachers; model; what "excellent" means) and
   CLAUDE.md child model note updated.

**Out:**

- Diagnoses, clinical terms, advice ("you should…"), IQ or school grades, gender-based trait differences.
- Real photos or licensed art; everyone is drawn procedurally from simple shapes.
- Upsetting content: no abuse, death, addiction, violence; illness and separation stay gentle.
- Removing a single stacked change ("Undo all changes" covers it, as in other stacking worlds).
- Changes to other worlds, the engine's split mode, or shared console blocks beyond Design → Shared.

## Design

Follows DESIGN.md (Temperature Rule, One Fill Rule, Two Voices, closed type scale, motion rules), the
`darkroom-ui` checklist, the `impeccable` craft floor (`.claude/skills/impeccable/reference/craft-floor.md`,
plus `reference/animate.md` for motion and `reference/clarify.md` for copy), and the Sandbox contract in
CLAUDE.md. Mode is **Operate** with a warm stage: chrome stays precise and calm, the stage carries warmth.
Copy reads at age 10+ (PRODUCT.md → Kid-friendly). Reference implementation: `worlds/animals/` (change 0017)
— its Console, Chart, parts and scene patterns should be reused in shape (copied, not imported).

### Model (`sim.ts` + `data.ts`, framework-free, deterministic)

- Keep the core formula: trait = 50 + h·(midparent − 50) + noise σ(luck) + age-weighted environment +
  maturation + drift + events that partly fade. `h` from "How much is inherited" (default 0.45 → 40 %).
- Environment gains money, place, school, screen rules, sibling order; each a small `TraitDelta`.
- **Per-kid components tracked separately** (genes `g`, home `env`, events `ev`, chance `z`) so the
  nature-vs-nurture bar is computed honestly from variance shares across the 120 kids. Plain arrays only.
- **Stacking:** `w.iv` already holds interventions with an age; generalise to `w.mods` (id, age, size,
  persist) read by every rule; `apply()` works on an already-changed world; `stack: true`. Scheduled-age
  changes (setting "at age …") store a future age and take effect when the clock reaches it (noted then).
- **Everyday ups and downs:** per-kid event hazards by age bucket from `data.ts`, drawn with `rng(w)`,
  stored as per-kid small deltas with fade; counted for timeline aggregates.
- Metrics (fixed keys for engine history): `O C E A Calm` (Calm = 100 − N) averages, `p25/p75` per trait
  for the "most kids" band (e.g. `O_lo`, `O_hi`), and `hi*` / `lo*` counts of 120 for the unit chart.
  All finite or `null`.
- `maxT` stays 60; time unit years. Budget < 2 ms per step for both worlds.
- Old params (`aO…bN`, `style`, `sib`, `home`) and old what-if ids keep working; `sib` gains values but
  "0", "1", "2" still parse.

### Console (`worlds/child/Console.tsx`, own components in `Chart.tsx`, `parts.tsx`, `child.module.css`)

Copied from `StandardConsole` / animals' console (ad slots unchanged, ADR 0007):

- **Ask column:** world header → "Pick a family" (ready-made) → parent cards (tap to edit) → Home settings →
  "Things that can happen" (grouped, stacking, ×N badges, age chip) → Story.
- **Results strip (≥ 1024):** chart (two views + sentence) | timeline. "Meet the child" and nature-vs-nurture
  in Ask at ≥ 1280, in Read below that.
- **Phones (dock):** Ask (family, changes) · Tune · Read (meet the child, story, chart, nature vs nurture,
  about the science) · Log. One viewport, no page scroll.

### Motion in chrome

DESIGN.md motion tokens and reduced-motion rules: numbers tick (≤ 300 ms), unit-chart faces cross-fade
between groups with a short stagger, parent cards expand/collapse (height + opacity ≤ 200 ms), change
buttons give a pressed confirmation, "Meet another one" slides the card. No decorative motion outside
the stage.

### Shared code

None planned. Any shared option needed must be additive, leave other worlds' output unchanged, and be
listed in the Log.

## Steps

Each ends green on `npm run typecheck && npm test`.

1. **Data:** plain-word traits (Calm flipped), ready-made families, home options, ~20 changes, everyday
   events with age hazards, milestones, name list, help texts. Old ids mapped.
2. **Model:** component tracking, stacking `w.mods`, scheduled ages, everyday events, luck/inherit/fade
   settings, new metrics, `stack: true`. Tests: every family × every change runs to 60 with finite
   readouts; all changes stacked stay within 1–99 and averages move ≤ ~15 points; determinism with
   stacked and scheduled changes; old params/ids still work; nature-vs-nurture shares sum to 100 %;
   "inherited: high" raises the genes share; everyday events off ⇒ none counted. Add child to the
   STACKING list in `tests/stack.test.ts`.
3. **Stage:** `scene.ts` — family and home backdrop, growing child with trait-driven pose and props,
   crowd strips with eased motion and hover/tap labels, change caption cards, reduced motion; perf check.
4. **Console + results:** family picker, parent cards, grouped stacking changes with age setting, chart
   (Growing up / Out of 100 kids + sentence), Meet the child, nature vs nurture, Story, timeline voice,
   dock layouts.
5. **Browser check** (preview tools; per memory, stop preview before `npm run build`): each ready-made
   family; build-your-own; stack 4 changes incl. a scheduled one; every change once. 375 × 812,
   768 × 1024, 1024 × 768, 1280 × 800, 1440 × 900; light theme (stage stays dark); keyboard path through
   parent cards and changes; reduced motion; no page scroll; smooth at ½ and 5 yr/s.
6. **Docs:** world README, CLAUDE.md child note, fork-and-compare feature (child stacks), PLAN.md
   checkbox note, this doc → shipped with honest Verification and Log.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Overclaiming science / sounding like advice to parents | "About the science" block: rough, research-inspired, averages not destiny; no "should"; effects kept modest. |
| Flipping Neuroticism to Calm confuses old links | Model keeps `N`; only display flips; old params unchanged. |
| Too many options overwhelm | Ready-made families first; parent editing collapsed by default; changes grouped; Tune holds the rest. |
| Stacking 20 changes pushes traits to the clamp | Per-change caps, persistence fades, test bounds all-stacked averages. |
| Drawn people feel uncanny or stereotyped | Simple round friendly characters, neutral names, varied skin/hair from a seeded palette, no gendered trait rules. |
| Crowd of 120 faces cluttered at 375 px | Small stages show one selected trait strip with a trait picker chip. |
| Comparisons lost without split stage | Hidden no-change world drives dashed lines, sentences, unit-chart "was" counts, Story. |

## Verification

- [x] Automated: child tests (families, every change, stacking bounds, scheduled ages, everyday events,
  nature-vs-nurture sums, determinism, old ids), `tests/stack.test.ts` lists child. `tests/child.test.ts` (19 tests);
  full suite 453 tests green; `npm run typecheck` green.
- [ ] Manual: viewports and themes listed in Step 5; reduced motion; no page scroll. **Partly verified** in the browser
  pane (dev server, pane hidden, so frames were driven by a timer in place of `requestAnimationFrame`): no page scroll
  (`scrollHeight === innerHeight`) at 375 × 812 (all four dock tabs), 768 × 1024, 1024 × 768, 1280 × 800 and 1440 × 900;
  light theme at 1280 × 800 (stage stays dark); every ready-made family; all 20 changes clicked once (stacked);
  a stacked + scheduled scenario (team sport now, bullied at 12 → happened at 12 with caption and timeline line); both chart
  views; hover label on a face. **Not verified:** reduced motion (cannot be emulated from the pane), a keyboard-only pass,
  375 × 667, smoothness by eye at ½ and 5 yr/s (CSS animations do not run in a hidden pane), contrast measurements.
- [x] Performance measured: one engine tick with both worlds and six stacked changes ≈ 0.19 ms (5 yr/s, Node);
  `read()` ≈ 0.3 ms. The stage evaluates both worlds' values once per frame (~0.3 ms).
- [x] Docs: README, CLAUDE.md, feature doc, PLAN.md.
- [x] `npm run build` passes (built from a copy of the tree so the running dev server was not disturbed).

## Log

- 2026-11-04 — proposed and approved in advance by the user ("auto approving"); to be built by an Opus subagent.
- 2026-11-04 — built and shipped. Deviations from the plan:
  - **New file `model.ts`**: the model maths moved out of `sim.ts` so `scene.ts` can use it without a circular import
    (`sim.ts` re-exports it). Word helpers shared by stage and console (`stepWord`, `kidName`, `kidShort`) live in `data.ts`.
  - **The world starts at age 1** (was 2) so "First words" is on the timeline; the chart therefore starts at age 1, not 2.
  - **Default family** "A curious parent and an organised one" keeps the old default parents; default style stays strict
    (as before), so "warm and firm" still shows a change out of the box.
  - **Parent editing uses five selects per parent** (5 steps each) instead of segmented buttons: five long words don't fit
    a 300 px column. Calm is written to the model as N = 100 − value.
  - **"When" and "How big" appear twice**: in Tune (as the doc says) and above the change list, so the setting your next
    click uses is visible where you click.
  - **Style switches are capped at ±7 points per trait** (strict → warm-and-firm would otherwise move calm by ~11 at
    "big"); all stacked changes are softly capped at ±14 per kid (tanh).
  - **Nature-vs-nurture** is computed from the variances of the four parts across the 120 kids, normalised to 100 % (it
    ignores covariances; the copy says "of all the differences between these 120 brothers and sisters"). Your changes count
    as "life events". Genes σ = 12·√H and chance σ = 12·√(0.6 − H) are tuned so the genes share at age 25 is close to
    the setting's label (25 / 40 / 55 %).
  - **Stage**: one strip (with a tappable trait chip, synced with the chart's trait picker) when the stage is under 400 px
    tall or 520 px wide. Faces are coloured by world (`--base` / `--alt` hex); trait colours are only on labels and charts.
    Many clicks at once keep only the newest two captions waiting.
  - **Meet the child**: the typical kid is re-picked once per year of age (and per change), so the card doesn't flicker
    between near-ties.
  - **Shared code: none changed.** Known shared limitation, left alone: the engine's "Changed: A + B + …" stage chip
    squeezes its text when many changes are stacked (all stacking worlds). Seen in passing (not touched): the animals
    stage throws a negative-radius error when its canvas is momentarily tiny during a route change.

