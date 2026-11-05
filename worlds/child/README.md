# Child — world brief

This folder is the **child** project (change 0008; redesigned in changes 0018 and 0019). Everything only this world needs lives
here; it may use the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw, pace), lines that follow from changes, editing changes (stop, move, remove), the story, sentences and timeline kinds. Framework-free, deterministic. |
| `model.ts` | The maths shared by the rules, stage and chart: kid values, the four parts, ripples / buffers / combos (`refresh`, `rippleAt`), yearly snapshots and past values, contributions ("What mattered"), everyday counts, typical kid, "why they differ". |
| `data.ts` | Plain-word traits and glossary, ready-made families, home and family options, the 38 changes (length, stop line, youngest age), ripples, buffers, sensitive ages, combos, everyday events and behaviours, milestones, names, settings. |
| `scene/` | The stage (change 0019): `stage.ts` (one child: room, family, props, meters; or the crowd), `rooms.ts` (a room per part of life, cached), `people.ts` (characters, glyphs), `props.ts` (things from changes), `crowd.ts` (all 120 kids), `motion.ts` (draw-only clock, springs). |
| `edit.ts` | Undo, stop or move one change on the engine, keeping history and the export recipe honest (change 0019). |
| `Chart.tsx` | Four views — Now, Growing up (small multiples), Every day (out of 100), What mattered (per change) — each with one sentence. |
| `parts.tsx` | Family picker, parent cards, home, grouped changes, life ruler, story, meet the child, why they differ, glossary, science, Tune, filtered timeline. |
| `Console.tsx` | This world's screen, copied from `StandardConsole`. Keeps its ad slots (ADR 0007). |
| `child.module.css` | Styles for the parts and chart (tokens only; trait colours are data colours). |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |

## Who it's for

Parents and parents-to-be, kids 10+ and teachers asking: how much do parents, brothers and sisters, the things that
happen and plain luck shape who a child becomes? Everything is in plain words; the science names appear once, in "About
the science".

## Model

120 possible kids of the same two parents grow from age 1 to 60 (years). Per trait, in model order O C E A N (shown as
Curious, Organised, Outgoing, Kind and Calm = 100 − N):

- **Family start** 50 + h·(midparent − 50), h = inherited share + 0.05 (default 0.45).
- **Genes**: each kid's own mix, σ = 12·√(inherited share).
- **Baby**: what they were like as a baby (temperament) shifts the start; 60 % of it fades by the teens.
- **Home**: family shape, time together, parenting style, siblings, home life, money, place, school and screen rules,
  weighted by age and by how strongly each kid responds (`r`; "How much life affects them" sets its range).
- **Life**: your changes (`w.mods`: age, size, length, stop, how much lasts) weighted by sensitive ages and softened by
  buffers present at the time; follow-on events per kid (`RIPPLES`, drawn with `hash01`, never `rng(w)`, so undo stays
  exact); combos of two changes going on together; everyday ups and downs (14 kinds, `rng(w)`). While a change goes on
  its full effect stays; after it ends the lasting part stays and the rest fades. Softly capped at ±14 per kid.
- **Chance**: a lucky or unlucky start plus a slow drift ("How much chance and luck").
- **Maturation**: the average path with age (teen dip in calm and tidiness; more organised and kind in adulthood).

Changes stack. "When it happens" can schedule a change for an age up to 17 (never before the change's youngest age); it
happens when the clock gets there. Any change can be stopped, moved while planned, or undone on its own.
Milestones and everyday summaries are noted once each with stable text, so both worlds' timelines line up.

## Questions it should answer best

- How different can kids of the same parents be, and why? ("Why are these kids different?" bar.)
- What if the parents switch to warm and firm, or a little brother or sister arrives at 4?
- What does a hard year (bullying, a parent ill, money tight) change, and does it last?
- What do activities (sport, music, reading, outdoors, screens) do on average, and what usually follows from them?
- What protects kids in a hard time (a best friend, a calm home, a big family)?
- What does all this look like day to day ("62 of 100 put their hand up in class")?

## What "excellent" means here

- A 10-year-old can say what a face, a line and a sentence mean without help.
- Every result compares with the hidden no-change world in words ("a bit calmer", "34 of 100, was 22").
- Motion explains: a change gets a moment (slow-down, card, reaction, meters gliding, what followed as chips); the crowd
  walks to new piles; the child grows through the rooms of a life.
- Never advice, diagnosis or destiny: averages, rough and research-inspired, kid-safe content only.
