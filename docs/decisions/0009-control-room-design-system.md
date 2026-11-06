# 0009 — Control Room replaces Darkroom as the design system

- **Status:** accepted
- **Date:** 2026-11-06
- **Supersedes:** [ADR 0006](./0006-darkroom-design-system.md)

## Context

Darkroom (warm walnut, cream Inter labels, "chrome is type, not boxes") made the product read like a
museum label around an object. The owner wants it to feel like a simulator you run experiments on, and
chose a lab / mission-control direction, a full system swap, and a light theme kept for classrooms
([change 0023](../changes/0023-control-room-design-system.md)).

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| A. Keep Darkroom, tweak colours | Small diff | Still a gallery, not a simulator; owner asked for fonts and components too |
| B. Space-sim HUD (glass panels over the stage) | Very "sim" | Costume risk; glass hurts legibility for kids and on projectors |
| C. Control Room: graphite panels, condensed instrument labels, mono readouts, two channels | Reads as a working simulator; standard controls; legible | Every component restyled once; three font families |

## Decision

Option C. `DESIGN.md` (Control Room) is the single design source, enforced by the `control-room-ui`
skill. Fonts: Barlow, Barlow Semi Condensed, JetBrains Mono, self-hosted by `next/font`. The layout,
breakpoints, ad slots (ADR 0007) and the no-page-scroll rule are unchanged.

## Consequences

- `app/globals.css` tokens, `STAGE`/`FONT` in `lib/sim/draw.ts`, and export captions follow the new palette.
- Columns become panels (a box per tool area); the old "no boxes" and "zero tracking" rules are gone.
- Legacy token names (`--bg-elevated`, `--ember`, `--r-ghost`, `--r-pill`) stay as aliases so world code
  keeps working; new code uses `--signal`, `--r-ctl`.
- The `darkroom-ui` skill is replaced by `control-room-ui`.
