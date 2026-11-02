---
name: What-If Lab
description: Darkroom. A live simulation as a lone object in warm darkness; everything else is a cream label around it.
colors:
  walnut: "#100904"
  walnut-raised: "#1a110a"
  bark: "#382416"
  cream: "#ffedd7"
  dust: "#a89a8a"
  cork: "#40372e"
  driftwood: "#6c5f51"
  ember: "#dc5000"
  reality-blue: "#a9b1d6"
  what-if-amber: "#ffc857"
  gain-green: "#8fd18c"
  loss-coral: "#ff8a6a"
  paper: "#f6e6d2"
  paper-raised: "#fbf1e4"
  paper-ink-2: "#5c4f43"
  paper-cork: "#d9c6b0"
  paper-driftwood: "#b3a28f"
  paper-ember: "#b64200"
  paper-reality-blue: "#5b6380"
  paper-what-if-amber: "#b87400"
  paper-gain-green: "#2f7d32"
  paper-loss-coral: "#c23a1a"
typography:
  display:
    fontFamily: "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, system-ui, sans-serif"
    fontSize: "clamp(40px, 6vw, 51px)"
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: "normal"
    fontFeature: "\"ss01\", \"cv11\""
  heading:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "41px"
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: "normal"
  title:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 41px)"
    fontWeight: 500
    lineHeight: 0.9
    letterSpacing: "normal"
  heading-sm:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "24px"
    fontWeight: 500
    lineHeight: 1.09
    letterSpacing: "normal"
  headline:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "normal"
  body-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "29px"
    fontWeight: 400
    lineHeight: 1.26
    letterSpacing: "normal"
  body:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "normal"
  callout:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: "normal"
  small:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
    letterSpacing: "normal"
  label:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "normal"
  micro:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "normal"
rounded:
  card: "12px"
  ghost: "22.5px"
  pill: "36px"
  full: "999px"
spacing:
  s-1: "4px"
  s-2: "8px"
  s-3: "12px"
  s-4: "16px"
  s-5: "24px"
  s-6: "32px"
  s-7: "48px"
  s-8: "64px"
  pad-card: "24px"
  gap: "18px"
components:
  button-primary:
    backgroundColor: "{colors.bark}"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 24px 0 16px"
    height: "44px"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.ghost}"
    padding: "0 16px"
    height: "44px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    rounded: "{rounded.full}"
    size: "44px"
  segment:
    backgroundColor: "transparent"
    textColor: "{colors.dust}"
    typography: "{typography.label}"
    rounded: "{rounded.ghost}"
    padding: "0 12px"
    height: "44px"
  segment-active:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
  what-if-row:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.small}"
    padding: "4px 0 4px 8px"
    height: "40px"
  chip-jump:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.label}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "32px"
  select:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.callout}"
    rounded: "0"
    height: "36px"
  popover:
    backgroundColor: "{colors.walnut-raised}"
    textColor: "{colors.cream}"
    rounded: "{rounded.card}"
    padding: "24px"
  stage:
    backgroundColor: "{colors.walnut}"
    rounded: "{rounded.card}"
---

# Design System: What-If Lab

This file is the canonical design system ([ADR 0006](docs/decisions/0006-darkroom-design-system.md),
[change 0006](docs/changes/0006-design-md-canonical.md)), enforced by the `darkroom-ui` skill. Runtime
tokens live in `app/globals.css`; canvas code mirrors them in `STAGE` (`lib/sim/draw.ts`).
**Same-commit rule:** a token change edits `app/globals.css`, this frontmatter (and `STAGE` if it is a
stage colour) together, then regenerates `.impeccable/design.json`.

## Overview

**Creative North Star: "The Lone Object"**

The simulation is a single object floating in warm darkness. It gets the most space, the only fill
that reads as a container, and the only motion on screen. Everything around it is a label: cream type
on walnut, hairlines, nothing decorative. The reader's eye should never have to find the experiment;
there is nothing else competing for it.

Working screens are consoles, not pages. Every tool, variable and result sits in one viewport at once,
so the visitor never scrolls away from the thing they are changing. Density is high but quiet: two
type voices, two surfaces, one filled button, one rare accent. Restraint is what lets the fork, the
moment the stage splits into the world as it is and the world that might be, land as the memorable
event on each screen.

Reality and what-if are told apart by temperature: cool blue for the unchanged world, warm amber for
the fork. That pairing is always backed by a label or line style, never colour alone.

**Key Characteristics:**
- Warm near-black walnut canvas; cream type; no pure white, no pure black.
- Chrome is type, not boxes. The stage is the only outlined container.
- Two voices: UPPERCASE 500 labels name things; mixed-case 400 text explains them.
- No shadows anywhere. Depth is a two-step tonal stack.
- One filled button per view; ember is editorial only and never interactive.
- One viewport, no page scroll, on every working screen.

### Reference and deliberate deviations

Darkroom derives from the ORYZO style reference; [change 0005](docs/changes/0005-darkroom-oryzo-alignment.md)
aligned us with it. Where we differ, on purpose:

- **No 8px Arial legal text.** Our minimum is 10px; the credit line is 10px Inter in ember.
- **No 29px body inside consoles.** It would break the one-screen rule; consoles use 18 / 15 / 14.
- **Active-tab underline is cream, not cork.** Cork on walnut is ~1.5:1, too faint to mark selection.
- **No 100vh marketing sections.** Working screens are consoles; that pattern is for future reading screens.
- **Light "paper" theme kept** (the reference is dark-only); the stage stays dark.
- **Data colours** exist only on the stage, chart, readouts and timeline.

## Colors

A warm, low-chroma darkroom palette (walnut, bark, cream, cork) with three data colours that live only
where the simulation speaks.

### Primary
- **Bark** (`colors.bark`): the single filled action surface, used for Play/Pause and nothing else.
  Identical in both themes; on-stage chrome always uses the darkroom value.

### Secondary
- **Reality Blue** (`colors.reality-blue`, paper: `colors.paper-reality-blue`): the no-change world on
  the stage, chart (solid line), readouts and timeline (hollow dot).
- **What-If Amber** (`colors.what-if-amber`, paper: `colors.paper-what-if-amber`): the forked world:
  dashed, thicker chart line; selected what-if glyph and left rule; what-if readout column; filled dot.

### Tertiary
- **Ember** (`colors.ember`, paper: `colors.paper-ember`): editorial only. The credit line "No AI · No
  live data · Same seed, same future" and notes. Never a button, link, hover or the what-if.
- **Gain Green / Loss Coral** (`colors.gain-green`, `colors.loss-coral`): deltas, always with a sign.

### Neutral
- **Walnut** (`colors.walnut`): the page and the stage void. The stage stays walnut in both themes.
- **Walnut Raised** (`colors.walnut-raised`): popovers and `<option>` lists only. Never a column or panel.
- **Cream** (`colors.cream`): primary text, icons, slider thumb, ghost border and the focus ring.
- **Dust** (`colors.dust`): secondary text, inactive tabs, Micro headings (7.2:1 on walnut).
- **Cork** (`colors.cork`): hairlines; section breaks are dashed; the stage's 1 px outline.
- **Driftwood** (`colors.driftwood`): slider tracks and chart grid. Never text (3.2:1).
- **Paper** (`colors.paper` family): the light theme recolours the chrome only; the stage stays dark.

### CSS token map

| Frontmatter key | CSS token (dark / `[data-theme="light"]`) |
| --- | --- |
| `walnut` / `paper` | `--bg` |
| `walnut-raised` / `paper-raised` | `--surface` |
| `bark` | `--bg-elevated` (both themes), `--stage-bark` |
| `cream` / `walnut` | `--label` |
| `dust` / `paper-ink-2` | `--label-2` |
| `cork` / `paper-cork` | `--separator` |
| `driftwood` / `paper-driftwood` | `--muted-line` |
| `ember` / `paper-ember` | `--ember` |
| `reality-blue` / `paper-reality-blue` | `--base` |
| `what-if-amber` / `paper-what-if-amber` | `--alt` (`--alt-soft` = 12% / 10% tint) |
| `gain-green`, `loss-coral` / paper pair | `--good`, `--bad` |
| `walnut`, `cream`, `dust`, `cork`, `driftwood` (fixed) | `--stage`, `--stage-ink`, `--stage-ink-2`, `--stage-line`, `--stage-muted`: chrome drawn on the stage, identical in both themes |

Type sizes are `--t-*`, radii `--r-*`, spacing `--s-1`…`--s-8`, `--pad-card`, `--gap`; motion is
`--ease-out`, `--d-fast`, `--d-ctl`.

### Named Rules
**The Temperature Rule.** Cool is reality, warm is what might be. `reality-blue`, `what-if-amber`,
`gain-green` and `loss-coral` appear only on the stage, chart, readouts and timeline, and are always
paired with a label, dash pattern or glyph.

**The One Fill Rule.** Bark fills exactly one control per view. Selection is shown with cream text and
a dashed underline, never with a fill.

**The Ember Is Ink Rule.** Ember is a printed credit, not a signal. If it can be clicked, it is not ember.

## Typography

**Display Font:** Inter (self-hosted via `next/font`, features `ss01` + `cv11`), system stack fallback
**Body Font:** Inter, same stack
**Label/Mono Font:** none distinct; numbers use Inter `tabular-nums` at weight 500

**Character:** One neutral grotesk carrying two voices by case and weight alone, so the hierarchy reads
like a specimen label rather than a magazine.

### Hierarchy
- **Display** (500, `clamp(40px,6vw,51px)`, 0.9, uppercase): "WHAT HAPPENS IF…" on the scale hero.
  Drops to Heading (41px) on phones.
- **Heading / Title** (500, 41px / `clamp(28px,4vw,41px)`, 0.9, uppercase): object titles in the scale panel.
- **Heading-sm** (500, 24px, 1.09, uppercase): the world title above the what-if list.
- **Headline** (500, 18px, 1.0, uppercase): section names; inside console panels rendered at Label size in dust.
- **Body-lg** (400, 29px, 1.26): reading screens and the scale hero description at ≥ 1440px only.
- **Body** (400, 18px, 1.4): descriptions and intros.
- **Callout** (400, 15px, 1.45): the page default; popover copy and selects.
- **Small** (400, 14px, 1.3): dense console text: what-if questions, variables, readouts, timeline.
- **Label** (500, 12px, 1.1, uppercase): buttons, tabs, segments, chips, chart metric tabs.
- **Micro** (500, 10px, 1.2, uppercase, dust): table heads, variable groups, timeline-adjacent metadata,
  the stage edge label. The smallest size in the system.

### Named Rules
**The Two Voices Rule.** Naming is UPPERCASE 500; explaining is mixed-case 400. Uppercase comes from
CSS `text-transform` so source strings and screen readers stay mixed case. What-if questions, intros,
facts and timeline events always use the explaining voice.

**The Zero Tracking Rule.** Letter-spacing is normal at every size, including 10px uppercase.

**The Scale Is Closed Rule.** Sizes are 10 · 12 · 14 · 15 · 18 · 24 · 29 · 41 · 51 px, each a token.
Nothing in between; weights 400 and 500 only.

## Layout

Working screens (the scale view `/` and every `/lab/*` world) fill exactly one viewport (`100dvh`) and
never scroll the page. Only named regions scroll internally, with a 20px fade mask at the cut edge: the
timeline list, the dock panel, the Ask column below the what-if list on short screens, the Tune
column on desktops under ~860px tall, and the phone speed control (sideways). Reading screens (about,
what-if landing pages, premium, legal) scroll normally.

- **Desktop console (≥ 1280px):** three columns, Ask 280px · centre · Tune 300px. The centre is the
  stage, the transport under it, then a 200px results strip (160px under 760px tall): chart | timeline,
  and chart | RIGHT NOW readouts | timeline at ≥ 1440px. Below 1440px the readouts sit in Ask under the
  what-ifs. Tools never hide: the what-if list, transport and all variables are on screen at once.
- **Compact desktop (1024–1279px, tablet landscape and small laptops):** two columns, centre · a 300px
  dock with Ask · Tune · Read (readouts + info; Ask is the default). The centre keeps the stage, a
  one-row transport and the chart | timeline strip. This is the one band where tools sit behind tabs,
  in exchange for a wider stage ([change 0007](docs/changes/0007-adaptive-console.md)).

```
┌ WHAT-IF LAB · credit   [world switcher]                                       ☀ ┐ nav
├ ASK 280 px ──┬ centre ─────────────────────────────────────┬ TUNE 300 px ───────┤
│ title  ⓘ     │ STAGE (fills, min 320 px)                    │ VARIABLES          │
│ WHAT IF      ├──────────────────────────────────────────────┤ (all, always open)│
│ RIGHT NOW    │ transport                                     │                    │
│ info         ├ chart ───────────────────┬ timeline (scrolls) ┤                    │
└──────────────┴──────────────────────────┴────────────────────┴────────────────────┘
```
- **Scale view desktop:** stage plus a 340px "In view" panel on the right.
- **Phone / tablet (< 1024px):** stage on top (≈ 50–55% of height), transport under it, then a dock with
  four tabs, Ask · Tune · Read · Log. The dock panel is the only scrolling region.
- **Short screens (< 1024px wide and ≤ 520px tall, phones held sideways):** the stage and transport sit
  beside the dock (≈ 58 / 42), so Play is always on screen; the nav drops to 48px and the scale hero to
  its phone size.
- **Progressive disclosure by width:** the world menu below 768px; a glyph strip with the active name at
  768–1279px; every world name at ≥ 1280px, subtitles at ≥ 1600px;
  transport secondary buttons are icon-only below 1440px; the credit line and stage edge label appear
  at ≥ 1280px.
- **Rhythm:** 4-pt spacing (`spacing.s-1` … `spacing.s-8`). Card padding and element gap are 24 / 18 at
  ≥ 1280px and 16 / 16 below. Page gutter 12px on phones, 16px from 1024px.
- **Ads ([ADR 0007](docs/decisions/0007-ad-slots-per-world.md)):** every world reserves fixed-size slots,
  never on or beside the stage or transport: two 160×600 rails outside the console at ≥ 1600px wide and
  ≥ 700px tall; otherwise a 300×250 box at the foot of the Tune column (1280–1599) or under the dock
  (1024–1279); a 320×50 banner under the dock below 1024px; none on phones held sideways. An empty slot
  is a dashed cork hole with a Micro "Ad" label; at most one per screen adds the quiet Premium line.
- **Per-world consoles:** each world owns its layout (`worlds/<key>/Console.tsx`) within these bands and
  tokens; `StandardConsole` is the default.

## Elevation & Depth

Flat by doctrine. There are no shadows anywhere in the system. Depth is a two-step tonal stack, walnut
canvas then bark for the one filled button, and separation is made with space first, then a single
dashed cork hairline between sections. Floating chrome may use a translucent walnut material with blur,
never a drop shadow. Popovers lift only by tone (walnut raised) and a 1px cork border.

### Named Rules
**The No Shadow Rule.** If something needs to look raised, it gets a tone step or a hairline, not a shadow.

**The No Boxes Rule.** Columns, results and the dock sit directly on walnut. The stage is the only
container; no boxed rows, no cards in cards.

## Shapes

A closed radius vocabulary of four values: cards and the stage 12px (`rounded.card`), ghost buttons and
segments 22.5px (`rounded.ghost`), the filled primary 36px (`rounded.pill`), chips and icon buttons fully
round (`rounded.full`). Inputs are underline-only with square corners. Lines are 1px; section breaks
and active-selection underlines are dashed, which doubles as the system's signature mark (the fork
seam, the what-if chart line, the active tab).

Icons are an in-house set (`components/ui/Icon.tsx`): 24px grid, 1.5px stroke, round caps and joins,
`currentColor`, geometric primitives only. UI glyphs: play, pause, restart, fork, close, chevron, plus,
minus, arrow, info, sun, moon; plus one abstract glyph per world, keyed by `Mode`. A new world needs a
glyph added there. Always paired with text or an `aria-label`.

## Components

### Buttons
- **Shape:** fully pill-shaped primary (36px); softly rounded ghost (22.5px); circular icon buttons.
- **Primary:** bark fill, cream Label text with a leading glyph, 44px tall, 16px left / 24px right
  padding. One per view (Play/Pause in a world). Hover mixes 15% cream into bark.
- **Ghost (secondary):** transparent with a full 1px cream border, Label text, 44px tall; hover adds an
  8% cream tint. Below 1440px transport ghosts collapse to 44 × 44 icon-only.
- **Icon:** 44 × 44, no border, `aria-label` required; hover = 8% cream tint (never amber).
- **Press:** every button scales to 0.97 on press over 150ms; disabled under reduced motion.

### Segments and tabs
- **Style:** no track, no fill. Options are Label text in dust; hover turns cream.
- **Active:** cream text plus a 1px dashed underline in the text colour, inset 12px each side. Used by
  the world switcher, speed control, chart metric tabs and dock tabs (`role="tablist"`).

### Chips
- **Jump chips** (scale panel): 32px tall, fully round, 1px cork border, Label text; hover brightens
  the border to cream.

### Cards / Containers
- **Stage:** 12px radius, walnut in both themes, 1px cork outline, clips its canvas. The only container.
- **Popover:** walnut raised, 12px radius, 1px cork border, no shadow, card padding; Esc or an outside
  click closes it.

### Inputs / Fields
- **Slider:** 1px driftwood track, 20px cream thumb, 24px tall with a 44px hit area across the row.
- **Select:** underline only (1px cream), square corners, chevron glyph on the right, Callout text.
- **Focus:** a 2px cream outline offset 2px on every focusable element.

### Navigation
- Wordmark **WHAT-IF LAB** in Small 500 uppercase; ember credit line under it at ≥ 1280px. Theme toggle
  is an icon button pushed to the far right. The nav clears the top safe area (notch).
- **World menu (< 768px):** one button with the current world's glyph, name and a chevron. It opens a
  popover (nav-wide, max 320px) listing every world as a 48px row: glyph, Label name, Small subtitle;
  the current world gets the dashed underline. Arrow keys move, Esc closes and returns focus.
- **World strip (≥ 768px):** glyphs always, the active world's name always, other names at ≥ 1280px.

### What-if row (signature)
A fork glyph and the mixed-case question in Small text, wrapping to two lines if needed, 40px minimum.
Selected: the glyph turns amber and a 2px amber rule appears on the left edge. This is the button that
splits the world, so it is the only interactive element allowed to wear the what-if colour.

### Variable row
Label and tabular value on one line, slider under it, 44px hit area overall; groups headed by Micro.

### Results: chart, readouts, timeline
- **Chart:** driftwood/cork grid; reality solid 2px blue, what-if dashed 2.5px amber; fills its box.
- **Readout table:** Micro heads, right-aligned tabular numbers at 500, what-if column in amber.
- **Timeline:** Small mixed-case events, Label time in dust; hollow blue dot = no change only, filled
  amber dot = what-if only, half-filled cream dot = both.

### Stage chrome
- **Fork split (signature moment):** when a what-if fires, the stage splits into the no-change and
  what-if worlds and a dashed hairline marks the seam. It is the one memorable motion per screen.
- **Canvas chrome** (HUD chips, chart axes, scale labels) uses the same type scale (12 / 14). Per-world
  drawing inside a sandbox is that world's business.
- **Transport:** sits on the stage in fixed darkroom colours in both themes, under a dashed cork hairline.
- **Scale hero:** Display overlay at the stage's top-left, fades out (400ms) on first interaction.
- **Edge label:** `WHAT-IF LAB · SEED n` in Micro, rotated down the stage's right edge at ≥ 1280px;
  decorative and `aria-hidden`.

## Do's and Don'ts

### Do:
- **Do** keep every working screen to one viewport and let only the named regions scroll, with a fade mask.
- **Do** take every colour, size, radius and duration from a token in `app/globals.css`; canvas code
  mirrors them in `STAGE` (`lib/sim/draw.ts`).
- **Do** keep the stage walnut in both themes and draw on-stage chrome with the `--stage-*` tokens.
- **Do** mark selection with cream text and a 1px dashed underline.
- **Do** pair reality/what-if colours with a dash pattern, glyph or label every time.
- **Do** use `tabular-nums` at weight 500 for every number.
- **Do** keep hit targets ≥ 44 × 44px and text contrast ≥ 4.5:1; respect `prefers-reduced-motion`
  (no transitions or press scale; the sims keep running).
- **Do** animate only `transform`, `opacity` and colour, with `cubic-bezier(.22,1,.36,1)` at 150ms
  (hover/press) or 250ms (controls, tabs, theme).

### Don't:
- **Don't** add shadows, gradients-as-depth, or a third surface colour behind columns or panels.
- **Don't** use bark for anything but the one primary button, or ember for anything interactive.
- **Don't** use amber for hover states or any control other than the what-if row.
- **Don't** add letter-spacing, an off-scale font size, or a weight other than 400/500.
- **Don't** put 29px body text inside a console column.
- **Don't** use driftwood for text, or pure `#fff` / `#000` anywhere.
- **Don't** box rows or nest cards; separate with space, then one dashed hairline.
- **Don't** pull in an icon library; add new glyphs to `components/ui/Icon.tsx` on its 24px / 1.5px grid.
- **Don't** centre body copy, or use exclamation marks in chrome.

### Blocking checks

These gate any UI change:

- Hit targets ≥ 44 × 44px. Text contrast ≥ 4.5:1 (dust 7.2:1 on walnut, paper dust 6.9:1 on paper).
- Full keyboard path: nav → Ask → stage/transport → Tune, with the visible cream focus ring (2px, offset 2px).
- Uppercase comes from CSS, so screen readers get normal text.
- The page never needs sideways zooming; at 200% zoom a console may fall back to the dock layout.
- `prefers-reduced-motion` respected.
- Chrome copy is short, curious and plain: what-ifs are questions ("What if the Moon disappeared?"),
  buttons are verbs. Identity is the wordmark **WHAT-IF LAB** only, plus the ember credit line.
