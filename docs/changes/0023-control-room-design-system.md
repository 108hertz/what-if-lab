# 0023 — "Control Room": a simulator look replaces Darkroom

- **Status:** shipped
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [fork and compare](../features/fork-and-compare.md), [scale explorer](../features/scale-explorer.md)
- **Decisions:** [ADR 0009](../decisions/0009-control-room-design-system.md): Control Room design system, superseding [ADR 0006](../decisions/0006-darkroom-design-system.md)
- **Created:** 2026-11-06 · **Shipped:** 2026-11-06

## Why

Darkroom (warm walnut, cream Inter labels, gallery hairlines, "chrome is type, not boxes") reads as a
museum label around an object. The owner wants the product to feel like what it is: a **simulator** you
run experiments on. Asked what "simulator" means here, they chose **lab / mission control** (over a
space-sim HUD or a toy-sim look), a **full system swap** (palette, fonts, components, canvas chrome,
DESIGN.md), and to **keep a light theme** for classroom projectors.

## Scope

**In:**
- New tokens in `app/globals.css` (both themes), `STAGE` in `lib/sim/draw.ts`, export frame colours.
- Fonts: Inter out; Barlow + Barlow Semi Condensed + JetBrains Mono in (all via `next/font`, self-hosted).
- Every shared component restyled: shell (nav, world menu, account menu, popovers, sheet), console
  blocks (columns become panels, transport, segments/tabs, sliders, selects, what-if row, variable row,
  chart, readouts, timeline, dock, ad slot), scale page (hero, "In view" panel, chips, scale transport).
- The signature move (below) in Stage, Transport, HistoryChart and Timeline.
- Per-world CSS modules (`animals`, `child`) and world consoles: only where they hard-code a Darkroom
  idea (radius, no-box rule, uppercase-without-tracking). Token swaps reach them for free.
- DESIGN.md rewritten from the built result; `.impeccable/design.json` regenerated; `darkroom-ui` skill
  renamed/rewritten as `control-room-ui`; CLAUDE.md pointers updated; ADR 0009.

**Out:**
- Layout and behaviour: the one-viewport console, column widths, breakpoints, dock tabs, ad-slot sizes
  and positions (ADR 0007) all stay exactly as they are.
- Per-world painted scenes (fjord town, street, habitats, rooms of a life): their art stays; only the
  shared stage chrome and void colour change. A world that paints on `STAGE.void` gets the new void.
- Copy, the `what if…` wordmark sentence (change 0021), icons (same in-house set and grid).
- No new dependency besides the three font families (Google Fonts via `next/font`, no runtime request).

## Design

Mode: **Operate** (a working console). The direction was pinned by the owner, so no concept roll; the
mission-control world lends only **type, palette, density and one signature move**. It does *not*
bring a costume: no fake bezels, screws, scanlines, CRT glow or terminal prompts. Controls stay
standard web controls. (Translation of the brief's "panel bezels": real panels with a header strip,
drawn as one tone step and a 1 px line, nothing skeuomorphic.)

### Palette — "graphite and signal"

Scene: a student or a curious adult at a laptop or a projected classroom screen, often in a lit room,
watching a run for minutes. Dark graphite is the default; a cool light "day shift" theme for projectors.

| Role | Dark | Light (day shift) | Job |
| --- | --- | --- | --- |
| ground `--bg` | `#0A0E13` | `#E9EDF2` | page behind the panels |
| panel `--panel` (new) | `#111821` | `#F7F9FB` | every column, the dock, the results strip |
| raised `--surface` | `#18212D` | `#FFFFFF`→`#FCFDFE` | popovers, sheets, panel header strips, inputs |
| line `--separator` | `#232D3A` | `#CBD3DD` | panel edges, row rules |
| track `--muted-line` | `#3A4656` | `#A9B4C2` | slider tracks, chart grid (never text) |
| ink `--label` | `#E6EDF5` | `#0E141B` | primary text (16.4 : 1) |
| ink-2 `--label-2` | `#8B98A9` | `#4B5767` | secondary text, panel headers (≥ 5.5 : 1 on every surface) |
| signal `--signal` (new) | `#3BD4C7` | `#0B7F76` | the one filled button, selected segment, active tab, slider fill, focus ring |
| no change `--base` | `#7FB2FF` | `#2F5FB3` | the no-change world: stage, solid chart line, readouts, timeline |
| what-if `--alt` | `#FFB547` | `#8F5400` | the what-if world: dashed line, what-if row, readouts, timeline |
| gain / loss | `#5FD68A` / `#FF6B5A` | `#1E7A45` / `#C0392B` | signed deltas only |
| stage `--stage` | `#05080C` | `#05080C` | the stage stays dark in both themes |

Ember goes (its only remaining use, printed notes, becomes ink-2). The temperature rule survives: cool
= reality, warm amber = what might be, always with a glyph or dash as well as colour.

### Type — instrument labels and mono readouts

- **Barlow Semi Condensed 500/600, uppercase, +0.06em tracking**: panel headers, buttons, tabs, the
  world title. DIN-like signage voice; condensed saves width in 280–300 px columns.
- **Barlow 400/500**: everything explaining (what-if questions, intros, timeline events). Open, plain,
  readable for 10-year-olds.
- **JetBrains Mono 500, tabular**: every number — clock, speed, variable values, readouts, chart axes,
  timeline times, the scale's 10ⁿ m. Numbers are the instrument.
- The scale stays closed but re-cut: 11 · 12 · 14 · 16 · 20 · 28 · 40 · 52. The scale hero "WHAT
  HAPPENS IF…" goes to condensed 600 at 52 px.

### Components

- **Panels replace "no boxes".** Ask, Tune, the results strip and the dock each become a panel: panel
  tone, 1 px line, 6 px radius, and a 32 px **header strip** (raised tone, condensed Micro label left,
  a mono status right: `WHAT IF · 9`, `VARIABLES · 6`, `TIMELINE · 14 EVENTS`). Rows inside are
  separated by solid 1 px lines, no dashed rules.
- **Radii:** panels/stage 6 px, buttons/inputs/segments 4 px, status dots round. No pills.
- **Primary button:** signal fill, ground-colour condensed label (Play/Pause; the sheet's main action).
  Still one per view. **Secondary:** raised fill + 1 px line, ink label. **Icon:** 44 px square, 4 px
  radius, hover = raised tone.
- **Segmented control** (speed, chart metric, dock tabs, world switcher list): a real track (ground
  tone, 1 px line) with the selected segment filled raised and a 2 px signal bar on its bottom edge.
- **Slider:** 2 px track, the filled part in signal, 16 × 16 square-ish (3 px radius) ink thumb; the
  value is a mono readout right-aligned on the label row, with its unit.
- **Select / input:** boxed, raised tone, 1 px line, 4 px radius, chevron.
- **What-if row:** the fork glyph + question; armed state = amber 2 px left bar and amber glyph (it stays
  the only control allowed to wear amber). Hover = raised tone.
- **Readouts:** a two-channel table, mono, the what-if column amber, delta column signed green/coral.
- **Popovers / sheets:** raised tone, 1 px line, 6 px radius, header strip like panels. Still no shadows:
  depth is ground → panel → raised.
- **Focus:** 2 px signal outline, offset 2 px.

### Signature move — two channels and a mission clock

The fork is the moment, so the whole console speaks of **two channels**:

- **Channel tags.** `● NO CHANGE` (blue, round dot) and `◆ WHAT-IF` (amber, diamond) are one small
  component used identically on the stage corner, the chart legend, the readout column heads and the
  timeline filter. Before a fork only the blue channel is lit; at the fork the amber tag switches on.
- **Mission clock** in the transport: elapsed world time in mono at 20 px (`T 12.4 yr`), the speed under
  it, and after a fork a second line `FORKED AT 12.4 yr` in amber.
- **Fork marker.** The fork time is drawn as one vertical amber hairline on the chart and as a pinned
  amber row in the timeline, so stage, chart and log all point at the same moment.

### Files

`app/layout.tsx` (fonts), `app/globals.css`, `lib/sim/draw.ts` (`STAGE`, `FONT`), `lib/export/frame.ts`,
`lib/scale/render.ts` (+ glyph label colours), `components/shell/*`, `components/console/*`,
`components/scale/*`, `components/account/*` (menus/sheet styling only), `worlds/*/` only where a
world's CSS hard-codes Darkroom shape rules, DESIGN.md, `.impeccable/design.json`, the UI skill,
CLAUDE.md, ADR 0009, this doc.

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. **Tokens and fonts.** New palette (both themes), fonts, `STAGE`/`FONT`, export frame. The site
   recolours everywhere at once; components still have Darkroom shapes.
2. **Shell.** Nav, world menu, account menu, popovers, sheet, ad slot/rails.
3. **Console blocks.** Panels with header strips, transport + mission clock, segments, sliders,
   selects, what-if row, variable row, readouts, chart (fork marker), timeline (pinned fork row), dock.
4. **Scale page.** Hero, "In view" panel, chips, scale transport.
5. **Worlds pass.** Walk all seven worlds at 375 / 1024 / 1440 / 1680 px, both themes; fix any world
   CSS that assumed Darkroom shapes (only inside that world's folder).
6. **Docs.** DESIGN.md rewritten from the build, design.json, `control-room-ui` skill, ADR 0009,
   CLAUDE.md, feature docs touched by the signature move.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Turns into a sci-fi costume (glow, bezels, scanlines) | Operate rule: world lends type, palette, density, one move. No glow, no shadows, no texture |
| Panels + header strips cost vertical space in a one-viewport console | Header strip 32 px, panel padding 12/16 px (was 16/24 with no box); verify at 1280×720 and 760 px tall |
| Signal teal confused with no-change blue | Different jobs (controls vs data), 40° hue apart, and data always carries a glyph/dash |
| Kids find mono/condensed harder to read | Explaining text stays Barlow 400 mixed case at ≥ 14 px; mono only for numbers |
| Light-theme amber too weak | `#8F5400` (≥ 4.8 : 1 on both light surfaces) |
| Big diff touches every world visually | Token-first step 1 shows the whole effect early; step 5 walks every world |
| Three font families hurt LCP | `next/font` subsets, `display: swap`, only weights used (Barlow 400/500, Semi Condensed 500/600, Mono 500) |

## Verification

- [x] Automated: typecheck, 533 tests (structure, ad slots, export determinism unaffected), production
      build (run in a scratch copy so the running dev server's `.next` was left alone).
- [x] Contrast: text tokens checked by script on ground / panel / raised, both themes (ink-2 ≥ 5.5 : 1;
      day amber moved to `#8F5400`).
- [x] Manual: `/` and all seven worlds at 1440×900 and 1280×720, solar at 1024, person at 375×812; a fork
      in earth, person and solar (channel tags, forked-at chip, chart fork marker, pinned fork row);
      day shift on earth; keyboard focus ring. Not checked: 1680 px rails, reduced motion, every world
      in day shift, the export video/slides render, the Clerk sign-in screens.
- [x] Docs: DESIGN.md, ADR 0009 (supersedes 0006), `control-room-ui` skill (was `darkroom-ui`),
      CLAUDE.md, PRODUCT.md, PLAN.md, design.json.

## Log

- 2026-11-06 — proposed (owner picked "lab / mission control", full swap, keep a light theme).
- 2026-11-06 — approved and built. Renumbered from 0022 (taken by export studio). Divergences from the
  plan: the "mission clock" is the stage's world-time chip plus a `FORKED AT …` chip under the what-if tag
  (hidden on short panes) rather than a new transport readout, which would have overflowed the one-row
  transport; section headers are a label + mono count + rule instead of filled header strips (works in
  every world's own markup without negative-margin geometry); world CSS (`animals`, `child`) got the
  condensed / mono voices and solid rules; a few world literals moved to the new amber/blue.
