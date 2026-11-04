# 0016 — Countries world: 40 real countries, a street and 100 people, policies that add up

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** [Fork and compare](../features/fork-and-compare.md) (unchanged behaviour; country joins the stacking worlds)
- **Decisions:** —
- **Created:** 2026-11-04 · **Shipped:** 2026-11-04

## Why

The country world works, but a visitor cannot read it. The stage is 260 unlabelled coloured dots on a
flat panel with a tiny decile bar; the chart's headline numbers are "k$" and "Gini", which most adults
and no 10-year-old understand. There are six countries, eight sliders and seven what-ifs, one at a time,
so the questions people actually search ("What if my country had free healthcare *and* less
corruption?") can't be asked. The user asked for three things: more options, any country they care
about, and a simulator that is **human-centric**, so people understand what they see.

Choices already made with the user (2026-11-04):

- **~40 major countries**, hand-checked, plus "Build your own" (not all 190; easier to keep honest).
- **Both on the stage:** an illustrated street that changes with the economy, *and* a "100 people"
  strip that reads like a sentence.
- **Policies stack** (`stack: true`, as solar and galaxy since change 0015): every policy clicked adds
  up in one changed world; the no-change world keeps running hidden for the chart, readouts and story.

## Scope

**In** (everything lives in `worlds/country/`, except two additive shared options listed under Design):

1. **Country picker: 40 countries + Build your own.** A searchable list grouped by region; picking one
   restarts the world from its profile. Moving any slider switches the label to "Your own country
   (based on Japan)". Figures are rounded mid-2020s values, labelled "approximate" in the info block.

   | Region | Countries |
   | --- | --- |
   | Europe | Denmark, Sweden, Norway, Germany, France, United Kingdom, Netherlands, Switzerland, Italy, Spain, Poland, Ukraine, Greece |
   | Asia | China, India, Japan, South Korea, Indonesia, Vietnam, Philippines, Bangladesh, Pakistan, Thailand |
   | Middle East & Caucasus | Türkiye, Saudi Arabia, Israel, Iran, Armenia |
   | Africa | Nigeria, Egypt, South Africa, Kenya, Ethiopia |
   | Americas | United States, Canada, Mexico, Brazil, Argentina, Chile, Colombia |
   | Oceania | Australia |

   Each profile: income per person, population, population growth, school quality, healthcare
   (life expectancy), corruption (100 − a rounded perception index), natural resources, government
   type, tax take (% of income), jobless rate. Default stays **Denmark** so today's default story holds.

2. **Plain-language variables (Tune), grouped, each with a one-line "what this means":**

   | Group | Variable | Range | Shown as |
   | --- | --- | --- | --- |
   | The country | Country | 40 + Build your own | searchable select |
   | People | Population | 1–1,500 m | "6 million people" |
   | | Babies and newcomers | −1 … +3 %/yr | "grows 0.4 % a year" |
   | Money | Income per person | $1k–100k a year | also as "$5,700 a month per person" |
   | | Taxes | 10–50 % of income | |
   | | Out of work | 1–30 % | |
   | | Natural resources | none … huge | |
   | Public life | Schools | poor … excellent | |
   | | Healthcare | poor … excellent (sets life expectancy 50–85) | |
   | | Corruption | very honest … very corrupt | |
   | | Government | Democracy · Mixed · One-party / ruler | |

3. **Policies that add up (16, stacking).** Kept (event text unchanged): double education spending,
   cut corruption in half, universal basic income, discover huge oil reserves, fight a five-year war,
   birth rate collapses, open the borders. New:

   | id | Policy / event | What happens |
   | --- | --- | --- |
   | `health` | Free healthcare for everyone | Taxes rise; life expectancy and work days lost to illness improve over 10 years |
   | `minwage` | Raise the minimum wage | Poorest third earn more; a few low-skill jobs disappear |
   | `taxrich` | Tax the richest more | Top tenth pays more; money is shared out; a little less investment |
   | `taxcut` | Cut taxes for everyone | Faster growth at first; less shared out; services thin |
   | `build` | Build roads, rail and power | Costs now, growth later; jobs during building |
   | `robots` | Robots do half the factory work | Output up, factory jobs down; skilled pay rises |
   | `pandemic` | A pandemic hits | Two hard years: illness, lost jobs, then recovery |
   | `trade` | Close the borders to trade | Prices up, growth down, some local jobs |
   | `drought` | Years of drought | Farm income falls; food prices rise; more poverty for 6 years |

   Six policies have a **"How much" setting** (`live`, read when clicked, like galaxy): basic income
   (% of average income, 10–50), minimum wage rise (10–100 %), top tax (+5…+30 points), tax cut
   (−5…−20 points), migrants arriving (10–100 households), war length (1–10 years). Settings sit in Tune
   under "Policy settings (used by your next click)". Clicking a policy again applies it again ("×2").

4. **Stage: a street on top, 100 people underneath** (see Design → Stage). One world full size (stack
   mode); before any change it shows the no-change world.

5. **Human metrics** in place of today's five (chart tabs, readouts, story):

   | key | Label | Unit / how it reads | Better |
   | --- | --- | --- | --- |
   | `fam` | Typical family income | $ a month (median household, 2.5 people) | up |
   | `pov` | Poor | people out of 100 | down |
   | `gap` | Rich–poor gap | richest 10 have ×N the poorest 10 (income) | down |
   | `jobless` | Out of work | people out of 100 adults | down |
   | `life` | Life expectancy | years | up |
   | `calm` | Peace and trust | 0 unrest … 100 calm (today's stability) | up |
   | `pop` | Population | millions | — |

   The Gini stays in the model and in the info block ("for the curious"), not as a headline.

6. **Explained comparisons (the "human-centric" part):**
   - Under the chart, one plain sentence for the selected metric: what it means, then the difference
     *now*, in people or dollars: "With your changes, **4 fewer people out of 100** are poor (2041)."
     Green/coral sign words, never colour alone.
   - Chart y-axis in human units ($ a month, "of 100"); the fork line labelled with the first change.
   - **Story** (Read tab / under the what-ifs): three to five sentences that describe the changed world
     against the no-change one, chosen by rules from the biggest differences ("Families earn $340 more a
     month. 1 in 10 more adults have a job. Protests have stopped."). Deterministic, from fixed
     templates.
   - Timeline events rewritten in the same voice ("Half the country now earns more than in 2026").

7. World README: model, countries and sources, policies, settings, what "excellent" means.

**Out:**

- All ~190 countries (possible later; the data table format allows it).
- Live or scraped data; any network fetch. Figures are a static, rounded table in `data.ts`.
- Removing a single stacked policy ("Undo all changes" covers it, as in solar and galaxy).
- Real places on the stage (no landmarks, flags or national symbols; the street is a generic town with
  colours and roofs hinted by region climate only).
- Other worlds, the engine, and shared console blocks beyond the two additive options below.

## Design

Follows DESIGN.md (Temperature Rule, One Fill Rule, Two Voices, closed type scale), the `darkroom-ui`
checklist and the Sandbox contract. Copy reads at age 10+ (PRODUCT.md → Kid-friendly): war, protest and
pandemic are shown as closed shops, empty streets, banners and masks, never violence.

### Model (`sim.ts`)

Still the hybrid model: aggregate growth + 260 household agents, deterministic, 1-month sub-steps.

- **Agents gain state:** `job` (working / out of work / retired / child-in-school counted per household),
  `health` (0–1). Out-of-work agents earn a benefit from the shared pool, sized by taxes.
- **Jobless rate** relaxes to a target from growth, minimum wage, robots, trade, war, pandemic, build.
- **Life expectancy** = profile value moved by healthcare, income, poverty and war/pandemic, lagged.
- **Typical family income** = median agent income × 2.5 / 12, scaled to dollars from income per person.
- **Rich–poor gap** = mean income of the top 10 % ÷ bottom 10 % (incomes, not wealth, so it stays
  finite and readable); Gini still computed.
- **Stacking:** `w.mods` (list of active modifiers with start time and size) replaces `w.mod`; every
  rule reads all active mods, so policies add up and a repeat adds another instance. `apply()` works on
  an already-changed world (CLAUDE.md → Stacking).
- Defaults (Denmark, no change) reproduce today's income, poverty, stability and population curves
  within 5 % over 50 years (pinned by a test).

### Data (`data.ts`)

`COUNTRIES: Record<id, { name, region, climate, gdp, pop, popg, school, health, corr, res, gov, tax,
jobless }>`. Rounded from public mid-2020s sources (World Bank income and population, UN life
expectancy, a rounded corruption-perception score, ILO unemployment); sources named in the README. No
figure claims more than two significant digits.

### Stage (`scene.ts` new, framework-free; `sim.draw` builds a plain `look`)

```
┌──────────────────────────────────────────────────────────────┐
│  sky · hills · (oil derrick far right when oil)               │
│  ▮▮ homes ▮▮ shop ▮▮ school  clinic  ▮▮ factory ▮▮ homes      │  street ≈ 60 %
│  people walking · bikes / cars · market stalls                │
├ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┤
│ IF THIS COUNTRY WERE 100 PEOPLE                               │
│ 🯅🯅🯅🯅🯅…  poorest ─────────────────────────────── richest  │  people ≈ 40 %
│ 12 are poor · 6 are out of work · a typical family: $4,200/mo │
└──────────────────────────────────────────────────────────────┘
```

- **Street** (back to front): sky by climate; hills; ~14 buildings in a row whose size, paint, windows
  and roofs follow the income deciles (shacks → flats → houses with gardens); a school and a clinic
  whose state follows school/health quality; shops that close (shutters) with joblessness; a factory
  with robots arms when `robots`; cranes and new rail when `build`; banners and a gathered crowd when
  calm < 30; boarded windows and empty street in war; masks in the pandemic; dry brown ground in
  drought. 20–40 walking people, bikes or cars by income. Ambient motion (walkers, smoke, clouds) on a
  draw-only renderer clock, frozen under reduced motion; model-driven looks eased per half (as earth).
- **100 people:** 100 simple figures (head + body, 12–18 px), sorted poorest → richest, sampled at
  percentiles of the 260 agents. Body colour by income band (coral poor → blue middle → amber rich, same
  data colours as today) **plus** a glyph for state: briefcase = working, ✕ = out of work, cap = in
  school, cane = retired, sign = protesting. Under them, two plain sentences in stage chrome type
  (14 px). A tiny legend chip explains glyphs. When a change has been made, a faint hollow outline per
  figure marks where that person stood in the no-change world, so movement up or down is visible.
- Static geometry cached per stage size from an index hash; target < 4 ms a frame at 1440 × 900.

### Console (`worlds/country/Console.tsx`)

Copies `StandardConsole` and swaps two blocks (ad slots unchanged, ADR 0007):

- **Ask column:** world header with the searchable country picker on top ("Pick a country"), then
  "Make changes" (the 16 policies, grouped: Money · Services · Society · Shocks), then the Story.
- **Results strip:** chart | Right now | timeline as today, with the chart's explanation line.
- Phones keep the dock: Ask (country + policies) · Tune · Read (story, readouts, chart) · Log.

### Shared code (additive, other worlds' output unchanged)

- `Metric` gains optional `help?: string` and `better?: "up" | "down"`; `HistoryChart` renders a
  one-line explanation under the chart only when the metric has `help` (none of the other worlds set it).
- `Control` select gains optional `groups?: [label, ids[]][]` and `search?: boolean`; `ControlsForm`
  renders a searchable grouped list when set. Other selects are untouched.

## Steps

Each ends green on `npm run typecheck && npm test`.

1. **Data + variables:** `data.ts` with 40 profiles; new params and grouped Tune; picker restarts from a
   profile; "Your own country" label. Test: every profile inits with finite readouts.
2. **Model:** jobs, health, life expectancy, family income, gap; `w.mods` stacking; `stack: true`;
   seven metrics. Tests: Denmark default calibration; every pair of policies stacks to finite readouts;
   determinism.
3. **Policies:** nine new ones, six "How much" settings; stable event text in plain voice.
4. **Stage:** `scene.ts` street + 100-people strip + ghost outlines; renderer clock; easing.
5. **Explaining:** metric `help`/`better`, chart sentence, Story block, grouped searchable picker in
   `Console.tsx`.
6. **Browser check:** stack 3–4 policies in 3 countries; every policy once; 375 × 812, 768 × 1024,
   1024 × 768, 1280 × 800, 1440 × 900; light theme (stage stays dark); keyboard path through the picker;
   reduced motion; frame time split-free at 8 yr/s.
7. **Docs:** world README, CLAUDE.md country note, fork-and-compare feature (country stacks), this doc.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Country figures look authoritative and are wrong | Rounded to two digits, "approximate, mid-2020s" in the info block, sources in README; the sim describes plausible behaviour, not forecasts (existing disclaimer). |
| Stage too busy with street + 100 people, especially on phones | Street simplifies below 520 px stage height (fewer buildings, no walkers); strip keeps 100 figures but drops the sentences into the Story. Checked at 375 × 812. |
| Story sentences sound like predictions or like AI | Fixed templates from rule thresholds, past/present tense about the simulated world, never "will". Credit line unchanged. |
| Stacking 16 policies in many combinations breaks the model | Tests stack every pair and one "all 16" stack for 60 years: finite, bounded readouts. |
| Sensitive content for kids (war, pandemic, protests) | Shown through closed shops, banners, masks, empty streets; copy plain and non-graphic. |
| Shared-block changes leak into other worlds | Options are optional and off by default; existing tests cover every world; check one other world by eye. |
| Losing the side-by-side split | Chart, readouts, Story and the 100-people ghost outlines compare against the hidden no-change world. |

## Verification

- [x] Automated: `npm run typecheck && npm test`, 166 passing. New `tests/country.test.ts`: all 41 profiles
  finite and plausible, rich vs poor countries, Denmark stays calm for 56 years, all 16 policies stacked for
  60 years, policy directions (UBI, healthcare, robots, war, corruption), sizes read at the click, Story
  wording. `tests/stack.test.ts` now covers country (every pair of policies).
- [x] Manual (in the browser, dev server): Denmark, Brazil, India, Nigeria, South Africa; stacked UBI +
  corruption + robots, war + pandemic, UBI + education + building, healthcare. 375 × 812, the pane's
  ~800 px tablet width, 1440 × 900; light theme (stage stays dark). No page scroll at those sizes.
  **Not checked:** 768 × 1024, 1024 × 768, 1280 × 800 exactly; the keyboard path through the picker; reduced
  motion by eye (the code freezes the clock and snaps easing, as in earth); every policy's scene by eye
  (drought, trade, oil, open borders are covered by tests only).
- [x] Performance: no dropped frames at 8 yr/s with three policies stacked (8.3 ms intervals on a 120 Hz
  screen, ~750 × 870 pane). Not measured on a phone.
- [x] Docs: world README, CLAUDE.md country note, fork-and-compare feature, this doc.
- [x] `npm run build` passes (built from a copy of the tree so the running dev server's `.next` was untouched).

## Log

- 2026-11-04 — proposed. User chose ~40 countries, street + 100 people on the stage, stacking policies.
- 2026-11-04 — approved; in progress.
- 2026-11-04 — shipped. Changes from the plan:
  - **41 countries** (the table has room; Armenia, Ukraine and Greece were added to the regions).
  - **Picker** is a native grouped select (`<optgroup>` per region, type-to-find) in Ask and Tune, not a
    custom search box: same keyboard and phone behaviour as every other select, no new component.
  - **Variables:** no per-row "what this means" line (the shared form has no slot for it); labels carry plain
    units ("% of income", "years"), and the Story / README explain. Policy sizes heading reads "Policy sizes
    (used by your next click)".
  - **Ghost outlines** became a blue dotted no-change poverty line in the 100-people grid plus
    "(no change: n)" after every number: clearer than 100 faint outlines.
  - **Model rework** after the first probe showed poverty stuck at 0 and peace drifting down everywhere:
    log-normal skill (wider with corruption), taxes split into services / cash to all / help for those
    without work, pensions and help scaled to past earnings, a small untaxed informal income, job hazards
    calibrated to the jobless rate, and peace driven by the income gap instead of the drifting wealth Gini.
    The calibration test is now a plausibility test (Denmark calm, 1.3–5× family income in 56 years), not
    "within 5 % of the old curves", because every headline metric is new.
  - **Strip numbers equal the chart's** (the first `round(poor)` figures are the poor ones), so the two
    never disagree by sampling noise.
  - **Year in the strip title**: the long "Changed: …" chip pushes the engine's year chip off small stages.
  - **Readouts in Ask at every width**: in the three-column results strip the chart had 28 px of canvas;
    chart | timeline gives it room for seven tabs and its sentence.
