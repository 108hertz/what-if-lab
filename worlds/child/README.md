# Child — world brief

This folder is the **child** project (change 0008; redesigned in change 0018). Everything only this world needs lives
here; it may use the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read, draw), the story, sentences and timeline kinds. Framework-free, deterministic. |
| `model.ts` | The maths shared by the rules and the stage: kid values, the four parts (genes, home, life, chance), typical kid, "why they differ". |
| `data.ts` | Plain-word traits, ready-made families, home options, the 20 changes, everyday events, milestones, names, settings. |
| `scene.ts` | The stage: home backdrop (cached), parents and family, the growing child, the 120 faces on strips, captions, hover. |
| `Chart.tsx` | "Growing up" (lines + band + change ticks) and "Out of 100 kids" (unit chart) with one sentence. |
| `parts.tsx` | Family picker, parent cards, home, things that can happen, story, meet the child, why they differ, science, Tune, timeline. |
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
- **Home**: parenting style, siblings, home life, money, place, school and screen rules, weighted by age and by how
  strongly each kid responds (`r`, 0.5–1.5).
- **Life**: your changes (`w.mods`: id, age, size, how much lasts, happened yet) and everyday ups and downs (moving house,
  a new sibling, a broken arm, a big win, a friend moving away, summer camp, a pet) drawn with `rng(w)`; part of each
  lasts, part fades ("How long effects last"). The sum of changes is softly capped at ±14 per kid.
- **Chance**: a lucky or unlucky start plus a slow drift ("How much chance and luck").
- **Maturation**: the average path with age (teen dip in calm and tidiness; more organised and kind in adulthood).

Changes stack. "When it happens" can schedule a change for an age up to 17; it happens when the clock gets there.
Milestones and everyday summaries are noted once each with stable text, so both worlds' timelines line up.

## Questions it should answer best

- How different can kids of the same parents be, and why? ("Why are these kids different?" bar.)
- What if the parents switch to warm and firm, or a little brother or sister arrives at 4?
- What does a hard year (bullying, a parent ill, money tight) change, and does it last?
- What do activities (sport, music, reading, outdoors, screens) do on average?

## What "excellent" means here

- A 10-year-old can say what a face, a line and a sentence mean without help.
- Every result compares with the hidden no-change world in words ("a bit calmer", "34 of 100, was 22").
- Motion explains: the crowd glides to new places, the child grows, a caption says what just happened.
- Never advice, diagnosis or destiny: averages, rough and research-inspired, kid-safe content only.
