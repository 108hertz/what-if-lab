# 0019 — Child world, second pass: one life told well, ripples and buffers, results in everyday words

- **Status:** in-progress
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** [Fork and compare](../features/fork-and-compare.md) (child stays a stacking world)
- **Decisions:** —
- **Created:** 2026-11-04 · **Shipped:** —
- **Builds on:** [0018](./0018-child-growing-up.md) (structure, plain-word traits, stacking, crowd, two chart views)

## Why

0018 gave the child world (the "defining characters" tab) the right bones: plain words, stacking changes, 120 possible
kids, a growing child, two chart views. Looking at it on a 1024 × 768 screen shows where it still fails the brief
("a 10-year-old can say what a face, a line and a sentence mean without help"):

- **The stage reads as noise.** Five strips of 120 overlapping faces become grey smudges; the growing child is ~20 px
  tall between two large parents; most of the stage is an empty dark room. Your eye has nowhere to go.
- **The chart is unreadable at its size.** Five coloured lines, a band, ticks and five end-labels share ~60 px of height.
  "MORE/LESS" on an axis does not say *more what*.
- **Results are numbers, not life.** "Organised 58" or "34 of 100 are very organised" does not tell a parent or a kid what
  that *looks like* (tidy room? homework on time?).
- **Changes are a flat list of one-off bumps.** Nothing leads to anything else, nothing protects against anything, an
  activity can't be stopped, a hard year lasts exactly as long as the model decides, and every kid reacts the same way
  apart from a strength factor.
- **Motion is mostly dots easing sideways.** A change has no "moment": the child doesn't react, nothing shows *which*
  traits moved and why.

The user asked (2026-11-04) to take the whole tab through the `impeccable` skill: smooth, purposeful animation; readable
and understandable for children; more options; more effects and side things that can happen; and a chart/simulator that
is human-centric, so people understand what it presents. They asked for this doc first (rate limits), build later.

## Scope

**In** (everything in `worlds/child/`; shared code untouched):

### 1. The stage: one life, told well (default view)

- **The child is the hero.** Centre of the stage, ~45 % of stage height at age 10 (scaled by age: toddler → teen →
  adult). Parents stand smaller and behind, and step back / leave the frame as the child grows up (at 18 the child moves
  into their own place).
- **Life-stage scenes** that cross-fade (600 ms) when the age crosses a boundary: nursery (1–4) · kitchen + school
  gate (5–12) · teen bedroom (13–17) · first flat (18–29) · own home / family (30+). Each scene is cached, painted once per
  size. The scene *shows* traits: tidy vs messy room (Organised), books / telescope / paints (Curious), friends in the
  doorway (Outgoing), helping a sibling or neighbour (Kind), relaxed vs tense pose and face (Calm).
- **Character meters on the child.** Five short labelled meters beside the child (icon + word + a dot on a "less ↔ more"
  track) with a hollow ghost dot for the no-change life. When they differ, a small arrow and a word ("a bit more") appear.
  This replaces the five 120-face strips as the default reading.
- **Props stack from changes**: ball (sport), violin (music), book (reading), tablet (screens), dog (pet), suitcase
  (move), backpack with stickers (new school)… An active activity shows its prop; a stopped one puts it on a shelf.
- **Change moments (choreography).** When a change happens (now or at its scheduled age): the clock eases to ¼ speed for
  ~1.2 s, a life card slides in ("Age 8 — joins a team sport"), the child does a short reaction (jump / slump / hug /
  wave), affected meters glow and their dots glide to the new values with a +/− arrow, then a **ripple chip** appears if a
  side effect followed ("…made friends on the team"). Card fades after 2.5 s. Reduced motion: no slow-down, no reaction
  poses, instant values, card stays static.
- **"All 120 kids" view** (toggle on the stage: *One child* · *All 120 kids*). The crowd becomes a readable picture:
  for the picked trait, 120 faces sorted into three labelled piles — *less* · *in between* · *more* — packed without
  overlap (dodged beeswarm), with big counts above each pile ("31 of 100"). The no-change crowd as faint outlines behind.
  Changing the trait or applying a change makes faces walk (spring, staggered by index, ≤ 700 ms) to their new pile.
  Tap a face → that kid becomes the hero in *One child* view ("Meet Robin").

### 2. Motion system (draw-only renderer clock, as earth/country/animals)

| What | How | Duration |
| --- | --- | --- |
| Values (meters, crowd, chart) | critically damped spring, from rendered value to sim value | ~300 ms |
| Child growth | continuous size/proportion tween from age (no steps) | follows clock |
| Scene change | cross-fade old/new cached scene | 600 ms |
| Change moment | slow-mo → card in → reaction → meters glow → ripple chip | ~2.5 s total, interruptible |
| Crowd re-sort | per-face spring, stagger 3 ms × index (cap 350 ms) | ≤ 700 ms |
| Idle life | breathing, blinking, a parent turning a page; derived from index/hash, never `Math.random` | loop |
| Chrome numbers | ticker (`useTick`) | ≤ 300 ms |

All motion obeys DESIGN.md motion tokens and `prefers-reduced-motion` (clock frozen, easing instant, no slow-mo).
Budget: stage draw < 4 ms at 1440 × 900; no per-frame allocations in the crowd loop.

### 3. More options (Ask + Tune)

- **The child's own start ("What were they like as a baby?")** — new param `baby`: *easy-going* · *slow to warm up* ·
  *full of energy* · *mixed (each kid different)* (default). Shifts the starting point of Calm / Outgoing / Organised a
  little (temperament research, Thomas & Chess), never fixes the outcome.
- **Family shape** — param `shape`: *two parents* · *one parent* · *two homes* · *big family under one roof*
  (grandparents/aunts). Feeds the home effects and the scene (who stands in the kitchen).
- **Time together** — param `time`: *parents work long hours* · *ordinary* · *lots of family time*.
- **How sensitive are they?** — Tune param `sens`: *everyone feels things the same* · *some kids feel things much more*
  (default; "orchid and dandelion": sensitive kids are hit harder by hard times **and** helped more by good ones) ·
  *all kids are very sensitive*. Widens the existing per-kid strength `r`.
- **Per change, before you click** (live settings, extend `s_age` / `s_size`):
  - *When:* now or an age 1–17 (as now).
  - *How long:* *a moment* (one-off) · *about a year* · *a few years* · *for good* (activities and home changes default to
    *for good*; hard times to *about a year*). New `s_len`.
  - *How big:* small / medium / big (as now).
- **Stop or undo one change.** Each applied change shows as a chip in a **life ruler** (below) with *Stop at age…* (for
  lasting ones, e.g. quits the team at 14) and *Undo this one* (rebuilds the world from the fork with the remaining mods —
  deterministic replay, so the no-change world is untouched). "Undo all changes" stays.

### 4. The life ruler (plan a childhood visually)

A horizontal ruler 0–18 (Ask column, also on the phone Ask tab) showing every scheduled or applied change as an icon at its
age, with a bar for its length (a year, a few years, for good). The playhead shows the current age. Desktop: drag an
icon to move its age before it happens; click for Stop / Undo. Phone: tap icon → sheet with age stepper, Stop, Undo.
Keyboard: arrow keys move a focused icon by a year. Changes already in the past are locked (you can only stop or undo).

### 5. More things that can happen (20 → 36, kid-safe, grouped)

New, alongside the existing 20 (effects modest, ≤ ~10 points on the average, literature-*inspired*):

| Group | id | Change |
| --- | --- | --- |
| Home | `chores` | What if they had real jobs at home? |
| | `dinners` | What if the family ate dinner together every night? |
| | `sleep` | What if they always got enough sleep? |
| | `longhours` | What if a parent started working very long hours? |
| | `carer` | What if they helped look after a younger brother or sister? |
| School & friends | `language` | What if they learned a second language? |
| | `exam` | What if they failed a big test? |
| | `fallout` | What if they fell out with their best friend? |
| | `leader` | What if they were made class captain? |
| | `firstlove` | What if they had a first crush that didn't work out? (from 13) |
| Activities | `drama` | What if they joined a drama club? |
| | `coding` | What if they joined a coding or building club? |
| | `scouts` | What if they joined scouts or a nature club? |
| | `job` | What if they got a weekend job? (from 15) |
| Big moves | `countryside` | What if the family moved to the countryside? |
| | `travel` | What if the family travelled for a year? |

Also two **good-luck** surprises users can trigger: `prize` (wins a competition) and `summer` (the best summer ever).
Content stays kid-safe (no death, abuse, drugs, violence); separation, illness, failure and heartbreak stay gentle.
Each change keeps `q`, `txt`, `past`, `cap`, `kind`, `d`, `pf`, plus new `len` default, `minAge`, `prop`, `pose`.

### 6. Side things that can happen: ripples, buffers and sensitive ages

The heart of "more effects": changes no longer act alone.

- **Ripples (follow-on events).** A change can set off follow-on events *per kid*, drawn with `rng(w)`, after a delay:

  ```ts
  interface Ripple { from: string; id: string; p: number; delay: [min: number, max: number]; d: TraitDelta; pf: number; have: string }
  // e.g. sport → "made friends on the team" (p .6) · "got a sports injury" (p .1) · "won a match" (p .4)
  //      move → "learned the new language" (.8) · "felt lonely the first year" (.5) · "made a new best friend" (.5)
  //      sibling → "felt jealous at first" (.4) · "became close to them" (.6, after 3–6 yrs)
  //      screen → "slept less" (.5) · "made online friends" (.3)
  //      divorce → "two homes, two birthdays" (.7) · "got closer to one parent" (.4)
  ```

  ~3 ripples per change on average (~60 total, in `data.ts`). Ripples are summed in the timeline per change
  ("38 of 100 made friends on the team"), shown as chips in change moments, and named in the story.
- **Buffers (things that protect).** Some conditions soften hard events:

  ```ts
  interface Buffer { protects: string[]; by: string; factor: number; why: string }
  // best friend → bullied ×0.6 ("a best friend makes being bullied hurt less")
  // warm and firm parents → divorce, money, illness ×0.7 · grandparent → illness, longhours ×0.8
  // pet → fallout, firstlove ×0.85 · enough sleep → exam, screen ×0.85
  ```

  "by" can be a change, a home setting or a Tune setting; buffers multiply (floor 0.4). The story says when one helped
  ("Because they had a best friend, being bullied hurt less").
- **Sensitive ages.** Each change has an age-weight curve (e.g. moving abroad hits hardest at 11–15, a sibling at 2–6,
  reading helps most at 4–10, a mentor at 12–18). The "When" picker shows a hint ("strongest around 11–15").
- **Combos.** A few named pairs add a small extra effect and a story line: sport + best friend, reading + great teacher,
  music + mentor, move + language. Data-driven, ≤ 8.
- **Everyday ups and downs** grow from 7 to ~14 (adds: makes the school team, a family holiday, a grandparent visits
  often, gets glasses, a power cut adventure, a lost tooth/first bike (young), a part in the school play). Still only shown
  as aggregates.

### 7. Results that people understand (world-owned chart, timeline, story)

The chart strip becomes four plain tabs; built with the `dataviz` skill.

1. **"Who they are now"** (default). Five full-width rows, one per trait: icon + word, a "less ↔ more" track with words at
   both ends (*shy ↔ outgoing*, *messy ↔ organised*, *worried ↔ calm*, *likes the usual ↔ curious*, *goes their own way ↔
   kind*), the typical child's dot, the no-change ghost dot, the middle-half band of the 120 kids, and a word for the
   change ("**a bit** more outgoing"). No numbers needed to read it.
2. **"Growing up"** — small multiples, one row per trait (not five overlapping lines), shared age axis with **life-stage
   bands** (baby · school · teen · grown-up) and change pins as icons. Hover/scrub any age → one sentence ("At 14 most
   kids are a bit less calm than at 10 — the teen years"). With little height (< 140 px), it shows only the picked trait.
3. **"In everyday life"** — what the traits *look like*, as "out of 100 kids" with now vs without changes: *put their hand
   up in class* (Outgoing), *keep their room tidy* (Organised), *try a food they've never had* (Curious), *help a new kid
   at school* (Kind), *stay calm before a test* (Calm), plus a few two-trait ones (*finish a long project*: Organised +
   Calm). Each a row of 100 small faces that fill in with a short stagger. Phrased as "likely to", never a diagnosis.
4. **"What made the difference"** — one bar per applied change (and ripples, and "home", "genes", "chance" for scale):
   how much it moved the picked trait *now*, signed, with "mostly faded" / "still there" labels. Computable because each
   mod's contribution is tracked separately. Answers "did the team sport actually matter by 30?".

- **One sentence** under every view, compared with the no-change world, in kid words (keep 0018's rules).
- **Timeline** gets ripple and buffer lines and a filter: *Everything* · *Your changes* · *Things that followed* ·
  *Growing up*.
- **Story** gains cause → effect chains: "Joining a team at 8 → made friends on the team (6 of 10 kids) → more outgoing,
  and it lasted."
- "Why are these kids different?" (nature bar) and "Meet the child" stay, restyled to the new rows.

### 8. Layout and copy (impeccable pass)

- **Hierarchy:** stage (child + meters) first, then the "Who they are now" view, then everything else. At 1024–1279 the
  results strip gets ≥ 180 px (stage shrinks), and chart tabs collapse into a select only below 360 px wide.
- **Ask column becomes two tabs:** *Family* (family, baby, shape, home, time) · *Changes* (life ruler, change picker,
  story). The change picker becomes a grid of icon cards per group, each card showing its question, a one-line "what it
  usually does", and its best age.
- **Copy:** reading age 8–10; every control has a one-line "what this does"; one "?" glossary sheet for the five traits
  with two examples each. Science names only in "About the science".
- One viewport, no page scroll, ad slots unchanged (ADR 0007), light + dark.

**Out:**

- Other worlds, the engine's split mode, shared console blocks (`components/console/`), shared tokens.
- AI, live data, real photos or licensed art.
- Diagnoses, advice ("you should…"), IQ, school grades, gender-based differences, upsetting content.
- Saving/sharing a planned childhood as a link beyond existing params (could follow; `w.mods` stays plain data so it can).
- Renaming the world in the nav (see Open questions).

## Design

Follows DESIGN.md, the `darkroom-ui` checklist, `impeccable` (craft floor, `reference/animate.md`, `reference/clarify.md`),
the `dataviz` skill for the chart, and the Sandbox contract. Reference shapes: 0018's own files and `worlds/animals/`.

### Model (`sim.ts`, `model.ts`, `data.ts`)

- `w.mods` entries grow to `{ id, age, size, len, until?, persist, done, buf }` — `len` in years (0 = a moment, ∞ = for
  good), `until` set by *Stop at age*, `buf` the buffer factor computed when it happens. Plain data.
- Per-kid ripple state: `w.rip: Float32Array` (kid × ripple slot: age happened or −1) and a small per-kid delta array;
  ripple contributions kept apart so "What made the difference" can attribute them to their parent change.
- Per-mod contribution per trait (`w.contrib[mod][trait]`, averaged over kids) updated each step → attribution chart.
- `baby`, `shape`, `time`, `sens` params feed the start (`model.ts`) and the home terms. Old params, old change ids and
  0018 links keep working; new params have defaults that reproduce 0018 output except where noted in tests.
- **Undo one change** (as built in step 1): the random draws in `step` never depend on changes, so the changed world's
  kids always equal the no-change world's kids; taking a mod out of `w.mods` is therefore exact *now*. Parenting-style
  deltas are worked out again from the start style, and its timeline lines are removed. The past chart lines are
  recomputed from **yearly snapshots** of each kid's chance-and-everyday part (`w.snap`, 61 × 120 × 5 floats, linear
  between whole ages). Helpers live in `worlds/child/edit.ts` and only touch the engine's public state.
  **Rule for step 2 on:** ripples and anything else that depends on changes must not draw from the shared `rng(w)`
  stream — use a hash of (seed, kid, mod index, ripple) — or undo stops being exact.
- **Length** (step 1): a mod's cause goes on from `age` to `end = age + len` (FOREVER = 999); `stop` is the age you
  stopped it at. While the cause goes on the full effect stays (after a one-year ramp); after it ends the lasting part
  `pf` stays and the rest fades with "How long effects last". A one-off (len 0) behaves exactly as in 0018. Style
  changes now have `pf` 0.5 (only matters when stopped or given a shorter length; "usual" keeps them for good).
- New metrics (fixed keys): behaviour counts `b_hand b_tidy b_food b_help b_calm b_proj` (of 100), and `mc0…mc11`
  attribution slots for the picked trait are computed in the component from world state, not history (keeps history
  small). All finite or `null`.
- Budget stays < 2 ms per step for both worlds with 36 changes and ~60 ripples.

### Files

| File | Change |
| --- | --- |
| `data.ts` | +16 changes, ripples, buffers, combos, age curves, more everyday events, behaviours, track words, scenes |
| `model.ts` | start from `baby`; sensitivity spread; contribution bookkeeping |
| `sim.ts` | mods with length/stop, ripples, buffers, combos, new metrics, story chains, timeline kinds |
| `scene.ts` → `scene/` | split: `stage.ts` (layout, hero), `scenes.ts` (life-stage backdrops, cached), `crowd.ts` (piles), `motion.ts` (springs, choreography, reduced motion) |
| `Chart.tsx` | four views, small multiples, scrub sentence |
| `parts.tsx` → `parts/` | `Family.tsx`, `Changes.tsx` (card grid), `LifeRuler.tsx`, `Tune.tsx`, `Story.tsx`, `Glossary.tsx` |
| `Console.tsx` | Ask tabs, stage view toggle, results sizing; ad slots unchanged |
| `child.module.css` | new parts; tokens only |
| `README.md`, `CLAUDE.md` | model note updated |

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`. Built in this order so any step can stop at a rate
limit and leave a working world.

1. ✅ **Model: length, stop, undo-one.** `len` / `until` on mods, `s_len` setting, replay-based undo. Tests: stop truncates
   effect; undo-one equals a fresh run with the remaining mods.
2. ✅ **Model: ripples, buffers, sensitive ages, combos** + more everyday events. Tests: determinism, buffers reduce effect,
   ripples reported once with stable text, every change × ripple finite.
3. ✅ **Model: options** (`baby`, `shape`, `time`, `sens`) and **16 new changes**. Tests: every change at ages 1/8/15,
   every option, average shift ≤ 10.
4. ✅ **Contributions + behaviour metrics.** Tests: contributions sum to the change part of the average (± rounding).
5. ✅ **Stage: hero child, life-stage scenes, meters, props** (`scene/`). Manual check at 4 widths.
6. ✅ **Motion: springs, change-moment choreography, reduced motion.**
7. ✅ **Stage: "All 120 kids" piles** + tap to meet a kid.
8. ✅ **Chart: four views** (dataviz skill), scrub sentence, timeline filter, story chains.
9. ✅ **Ask: Family / Changes tabs, card grid, life ruler** (drag, keyboard, phone sheet), glossary.
10. **Layout + copy pass** (impeccable critique → fixes), README, CLAUDE.md, feature doc, PLAN.md.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Too many options overwhelm kids | Defaults that just work; options behind "More about this family"; change cards show only the question until hovered/focused |
| Ripples + buffers make results hard to explain | Every ripple/buffer has a `why` line; "What made the difference" shows them as named bars |
| Stacked effects drift unrealistic | Soft cap ±14 per kid kept; tests bound average shift; buffers floor 0.4 |
| Undo-one breaks determinism | Replay from fork snapshot with the same seed; test equality with a fresh run |
| Stage perf with scenes + 120 springs | Cached backdrops per size/scene; typed arrays for crowd; < 4 ms budget checked in DevTools |
| Drag on the life ruler is fiddly on phones | Phones use tap → sheet with steppers; drag only with a fine pointer |
| Sensitive topics (separation, failure, crush) | Gentle copy, modest effects, ripples always include a recovery path, kid-safe review in step 10 |
| Scope is large for rate limits | Ten independent steps, each shippable; the doc's Log records where a session stopped |

## Verification

- [ ] Automated: undo-one replay, stop-at-age, ripples/buffers/combos, every change × age × size, options, determinism,
      contributions sum, structure + ad-slot tests still pass.
- [ ] Manual: 375 × 812, 768 × 1024, 1024 × 768, 1280 × 800, 1440 × 900, 1920 × 1080; light + dark; reduced motion;
      keyboard-only life ruler; a 10-year-old-style read-through of every sentence.
- [ ] Docs: README brief, CLAUDE.md child note, fork-and-compare feature doc, PLAN.md.

## Open questions for the user

1. **Name.** You called it the "defining characters" tab. Rename the world in the nav (e.g. *Character* · "Who will they
   become?") or keep *Child* · "120 possible kids"?
2. **Default stage view:** *One child* (proposed) or *All 120 kids*?
3. **First crush / failed test**: keep (gentle) or leave out for younger kids?

## Log

- 2026-11-04 — proposed (user asked for the doc first because of rate limits; build after approval).
- 2026-11-04 — approved; step 1 done: "How long" setting (`s_len`: the usual / a moment / about a year / a few years /
  for good) with a usual length and a stop line per change; stop now or at a later age; undo one change (exact now,
  past lines from yearly snapshots); a temporary "Your changes" list with Stop / Undo under the changes (the life ruler
  replaces it in step 9). Usual lengths change 0018's numbers for lasting changes (activities, pet, sibling, grandparent
  stay at full strength instead of fading). 9 new tests; 461 tests, typecheck and build green.
- 2026-11-04 — step 2 done in code: 50 ripples (hash-based per kid, never the shared random stream, so undo stays exact),
  11 buffers (changes or home settings present when a hard change happens), sensitive-age weights per change (replaces the
  old ×0.6 for adults), 8 combos, 7 more everyday ups and downs, timeline lines ("After …, 61 of 100 kids …", buffer and
  combo lines with new glyphs), story chains. Tests, typecheck and build green; checked in the browser;
  committed.
- 2026-11-05 — step 3 done: "What were they like as a baby?" (`baby`; shifts the start, 60 % fades by the teens), "Who
  they live with" (`shape`), "Time together" (`time`), Tune "How much life affects them" (`sens`; the default keeps 0018's
  draws). 18 new changes (the 16 planned + "Good luck": wins a competition, the best summer ever) → 38 in 5 groups, each with
  a usual length, stop line, follow-on events and best ages; youngest ages (`min`) on new and old changes, so an early click
  waits (e.g. first crush at 13, weekend job at 15). 11 more buffers (incl. big family, lots of family time, enough sleep)
  and 2 more combos. "First crush" and "failed a big test" are in, written gently, pending the user's answer to open
  question 3. The stacking test's time limit is raised to 30 s (1,444 pairs). 474 tests, typecheck and build green;
  checked in the browser; committed.
- 2026-11-05 — step 4 done: `contributions(w, age)` gives one row per change (its own effect plus what followed, with the
  follow-on part also apart) and one per combo, per display trait, sharing each kid's soft cap out in proportion so the rows
  add up to the changes' part of the average (within 0.35 points with the 1–99 clamp); works for past ages. "In everyday
  life": `BEHAVIOURS` (put their hand up in class / speak up in a group, keep their room tidy, try a new food, help a new
  kid, stay calm before a test, finish a long project), counted as "likely to, out of 100" with a smooth curve around 50,
  words switching at 18; metrics `b_hand b_tidy b_food b_help b_calm b_proj`. 531 tests (incl. change 0020's from another
  session), typecheck and build green; committed. No UI yet (step 8 draws them).
- 2026-11-05 — step 5 done: `scene.ts` split into `scene/` (stage, rooms, people, props, crowd, motion). "One child" is
  the default view: five cached rooms (nursery, family kitchen, teen bedroom, first flat, own home) cross-fading in 600 ms
  with the same bones (shelf left, window middle, door right); the typical child up to 80 % of the stage height as an adult;
  parents behind, smaller, stepping out between 14 and 18 (one parent / two homes / big family shown); books on the shelf
  (curious, tilted when messy), mess on the floor (organised), friends in the doorway (outgoing), a hand held out (kind), the
  face and a worry cloud (calm); 20 changes bring a thing into the room and leave it on the shelf when they end; your own kid
  from 31. Meters in a column beside the room (or a mini row on small stages): word, less ↔ more ends, the middle half of
  the kids as a band, a filled dot with changes and a hollow one without, "a bit more" in amber, a legend. The crowd strips
  live on as "All 120 kids" (redone in step 7); the switch is a DOM segment on the stage via a new optional `children`
  prop on the shared `Stage` (other worlds unchanged). Checked in the browser at 1280 × 800 (rooms, props, meters with
  changes); no page scroll at 375 × 812, 768 × 1024, 1024 × 768, 1440 × 900; switch buttons 44 px. Not yet looked at: the
  crowd view and the phone's mini meters (the browser pane was hidden, so no frames were drawn), light theme around the
  stage. 531 tests, typecheck and build green.
- 2026-11-05 — step 6 done: a change that happens slows the live clock to ¼ for 1.2 s and eases back over 0.4 s (new
  optional `Sandbox.pace()`, multiplied into `SimEngine.tick` only; exports step the sandbox directly, so results never
  depend on it); the card slides in; the child jumps (helps), slumps (hard) or waves (about others) for ~1.4 s; the
  meters glow and their dots glide from the "without" dot; follow-on lines, buffers and combos arrive as chips under the
  card ("58 of 100 kids made friends on the team", a heart for buffers and combos). Reduced motion: no slow-down, no
  reaction, cards and chips static. Also fixed: stop and undo now clear the engine's export recipe (`origin`), so an export
  never replays a change you undid or misses a stop. Checked in the browser (card, jump, meters, combo chip). 533 tests.
- 2026-11-05 — step 7 done: "All 120 kids" is three piles (less / in between / more, by the same 35/65 lines as the
  counts) for the trait picked on the stage (a DOM segment, shared with the chart's trait), the count of 100 above each
  pile and "was N" in the no-change colour, the no-change piles as faint rings behind. Each kid keeps its slot while it
  stays in a pile; a kid that changes pile takes the lowest free slot and walks there (spring, staggered, a little bob);
  gaps fill one face at a time — so only movers move (the first try, ordering by value or by number, made the whole pile
  churn as values drift). Faces are sized for the biggest pile present (rounded up to 20) and smile by calm when big
  enough. Hover shows a name; a tap shows that kid in "One child" (meters titled "Dani, one of the 120", the same kid's
  hollow dots in the no-change world) and in "Meet the child"; "Back to the typical kid" on the stage. The change card
  sits above the piles; chips wait for it. Checked in the browser at 1024 wide and 375 × 812 (no page scroll).
  Dev-only note: the user's dev server sometimes drops the world's CSS chunk after hot reloads; a full reload fixes it.
- 2026-11-05 — step 8 done: the chart has four tabs — Now (each trait's row: the 120 kids as faint marks, the middle half as
  a band, the big dot for the typical or picked kid, the hollow no-change dot, a word), Growing up (small multiples, one row
  per trait or only the picked one when short, life stages in the background, pins for changes, point at an age for a
  sentence), Every day (six everyday things as 100 dots filling left to right, "was N" tick in the no-change colour), What
  mattered (a signed bar per change and combo for the picked trait against a band of how much kids differ anyway, "still
  there / mostly faded / going on"). The trait colours fail the colour-blind check (dataviz validator: orange/green
  ΔE 3.1), so no view relies on colour: every row is labelled with glyph and word. Timeline filter: Everything / Your
  changes / What followed / Growing up. Checked in the browser: Now and Every day (the pane was hidden, so Growing up and
  What mattered were not seen with data).
- 2026-11-05 — step 9 done: Ask has two tabs, Changes (settings, life ruler, the five groups behind open/close headings —
  Home open — each row with the change's picture, "Usually: …", best ages and youngest age, then the story) and Family
  (family, parents, home). Design change: the "card grid" became richer rows in the existing what-if row style (the
  design system's signature row), grouped, which fits a 280 px column better than cards. The life ruler: 0–18 (longer when
  older), each change an icon at its age with a bar for how long it goes on (dashed while planned), the "now" line, lanes
  so icons never overlap; planned ones drag (mouse/pen) or move with arrow keys; tap/Enter opens a panel (earlier / later /
  stop now / undo). It replaces step 1's temporary list. Glossary "What do the five words mean?" (meaning + two examples)
  in Read. `moveMod` / `moveChange` move a planned change; `usually()` words what a change usually does. Checked in the
  browser at 1280 wide (tabs, groups, rows, ruler, panel).
