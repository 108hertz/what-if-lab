# Countries — world brief

This folder is the **country** project (change 0008; rebuilt in change 0016). Everything only this world
needs lives here; it may use the shared tokens (`app/globals.css`), primitives (`components/ui/`) and
console blocks (`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, info, draw), the Story sentences. Framework-free, deterministic. |
| `scene.ts` | The stage: a street (poorest → richest) over "if this country were 100 people". Draw-only clock. |
| `data.ts` | 41 country profiles and the grouped picker list. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `Console.tsx` | This world's screen: StandardConsole's layout with a country picker and grouped policies. Keeps its ad slots (ADR 0007). |

## Who it's for

Curious visitors and students asking "what if my country…?": free healthcare, basic income, less
corruption, robots, war. Copy reads at age 10+.

## What a visitor sees

- **Pick a country** (41, grouped by region) or build your own; moving any variable makes it "Your own
  country (from …)".
- **The street** runs from the poorest homes on the left to the richest on the right. Shacks become
  houses and flats as families earn more; shops shutter when people lose jobs; the school and clinic look
  better with better schools and healthcare; bikes turn into cars as income rises; banners go up when
  peace falls under 30. Policies show up too: cranes then a railway, robot arms in the factory, an oil
  pump, masks, a dry brown drought, boarded windows in war (never violence).
- **100 people**, poorest first, colour = poor / getting by / well off, shape = working, out of work
  (hollow), retired (cane), child at school (cap) or not. A dashed coral line marks the poverty line; after
  changes a blue dotted line shows where it was with no change, and every number gets "(no change: n)".
- **Make changes** (16 policies in Money · Services · Society · Shocks). They add up in one world
  (tick any of them off and on in "Your changes", change 0024); the no-change world keeps running hidden for the chart, readouts and Story.
- **The chart** explains its metric in a sentence and says the difference in people or dollars.
- **Story** (Read / Ask column): three to five plain sentences about the biggest differences.

## Model

- Aggregate: income per person grows with schools, honesty, resources and government; taxes slow it a
  little. Population, joblessness and lifespan relax toward targets moved by policies.
- 260 household agents with log-normal skill (wider in more corrupt countries). Workers earn by skill,
  lose a share to corruption, pay tax. Taxes: about two thirds pay for services, a fifth comes back as cash
  to everyone, the rest pays pensions and job-seeker help (scaled to past earnings). Everyone has a little
  untaxed informal income. Yard-sale trades move wealth; the corruption skim goes to the richest 5 %.
- Jobs: each month workers may lose a job and the jobless may find one; low skill is hit first. Rates are
  calibrated so the share out of work matches the target.
- Metrics: typical family money a month (median household × $ scale), poor of 100 (below $250 a family a
  month or half the typical family), rich–poor gap (top 10 % ÷ bottom 10 % income), out of work of 100,
  lifespan, peace (0–100), population.
- Policies are entries in `w.mods` (`{id, t0, s, e0, c0, l0}`); every rule reads them all, so they add
  up and repeat. Six read a size from Tune at the click (basic income, minimum wage, top tax, tax cut,
  newcomers, war length).

## Sources for the profiles

Rounded, mid-2020s, two significant digits at most: World Bank (GDP per person, population, growth),
UN World Population Prospects (life expectancy), Transparency International CPI (corruption = 100 − score,
rounded), ILO modelled estimates (unemployment), OECD / IMF tax revenue shares. School quality, natural
resources and government type are judgement calls on a 0–100 / three-way scale. They are starting points,
not data the sim tracks.

## Questions it should answer best

- What if my country had free healthcare? Universal basic income? Taxed the rich more?
- What does cutting corruption in half do to inequality?
- What happens when robots take factory jobs, or a pandemic hits?
- What if Nigeria had Denmark's schools?

## What "excellent" means here

A visitor who has never heard of a Gini coefficient can say, within a minute, what changed and for whom:
"with basic income, 10 fewer people out of 100 are poor, families have a bit less money, and it's calmer".
Every number on screen is in people, years or dollars a month; every difference is said in words.
