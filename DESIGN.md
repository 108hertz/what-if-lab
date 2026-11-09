---
name: What-If Lab
description: Control Room. A lab console for running experiments — graphite panels, instrument labels, mono readouts, and two lit channels, the world as it is and the world that might be.
colors:
  ground: "#0a0e13"
  panel: "#111821"
  raised: "#18212d"
  line: "#232d3a"
  track: "#3a4656"
  ink: "#e6edf5"
  ink-2: "#8b98a9"
  signal: "#3bd4c7"
  on-signal: "#04201d"
  no-change-blue: "#7fb2ff"
  what-if-amber: "#ffb547"
  gain-green: "#5fd68a"
  loss-coral: "#ff6b5a"
  stage: "#05080c"
  stage-panel: "#0b1118"
  day-ground: "#e9edf2"
  day-panel: "#f7f9fb"
  day-raised: "#ffffff"
  day-line: "#cbd3dd"
  day-track: "#a9b4c2"
  day-ink: "#0e141b"
  day-ink-2: "#4b5767"
  day-signal: "#0b7f76"
  day-on-signal: "#ffffff"
  day-no-change-blue: "#2f5fb3"
  day-what-if-amber: "#8f5400"
  day-gain-green: "#1e7a45"
  day-loss-coral: "#c0392b"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Barlow, Arial Narrow, system-ui, sans-serif"
    fontSize: "clamp(40px, 6vw, 52px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "0.01em"
  title:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "clamp(28px, 4vw, 40px)"
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: "0.02em"
  heading-sm:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.02em"
  label:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: 1.1
    letterSpacing: "0.06em"
  micro:
    fontFamily: "Barlow Semi Condensed, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.08em"
  body-lg:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.4
  body:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.45
  callout:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.45
  small:
    fontFamily: "Barlow, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.3
  readout:
    fontFamily: "JetBrains Mono, ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.2
    fontFeature: "\"tnum\""
rounded:
  card: "6px"
  ctl: "4px"
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
  pad-card: "16px"
  gap: "16px"
  col-gap: "12px"
components:
  button-primary:
    backgroundColor: "{colors.signal}"
    textColor: "{colors.on-signal}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "0 24px 0 16px"
    height: "44px"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.ctl}"
    padding: "0 16px"
    height: "44px"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.ctl}"
    size: "44px"
  segment-track:
    backgroundColor: "{colors.ground}"
    rounded: "{rounded.ctl}"
    padding: "2px"
  segment-active:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.readout}"
  panel:
    backgroundColor: "{colors.panel}"
    rounded: "{rounded.card}"
    padding: "16px"
  what-if-row:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.ctl}"
    height: "40px"
  select:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.ctl}"
    height: "36px"
  popover:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "16px"
  stage:
    backgroundColor: "{colors.stage}"
    rounded: "{rounded.card}"
---

# Design System: What-If Lab

This file is the canonical design system ([ADR 0009](docs/decisions/0009-control-room-design-system.md),
[change 0023](docs/changes/0023-control-room-design-system.md)), enforced by the `control-room-ui` skill. It
replaces Darkroom (ADR 0006). Runtime tokens live in `app/globals.css`; canvas code mirrors them in `STAGE`
and `FONT` (`lib/sim/draw.ts`). **Same-commit rule:** a token change edits `app/globals.css`, this
frontmatter (and `STAGE` if it is a stage colour) together, then regenerates `.impeccable/design.json`.

## Overview

**Creative North Star: "The Control Room"**

What-If Lab is a lab console for running experiments. The stage is the experiment; around it sit
instrument panels: what you can change, what you can measure, what happened. Graphite panels, condensed
instrument labels and mono readouts make it feel like a simulator you operate, not a gallery you visit.
It is a costume-free control room: no bezels, screws, scanlines, glow or terminal prompts. Every control
is a standard web control. The world shows only in type, palette, density and one signature move.

**The signature move: two channels.** Every world runs on a channel. `● NO CHANGE` (blue, round mark) is
lit from the start. When the first change is made, `◆ CHANGED` (amber, diamond) lights up. The same
mark appears on the stage tag, the chart legend, the readout column heads, the timeline and the "Your
changes" list. The stage always shows one world (change 0024): the changed one once there is a change,
with the no-change world running hidden for the chart, readouts and timeline. The moment of the first
change is the amber marker on the chart with a diamond head. The two worlds appear next to each other only
in an export the visitor asks for ("No change | with changes").

**Key characteristics:**
- Cool graphite ground with panels one tone up; the stage is darker still (both themes).
- Three voices: condensed uppercase names, Barlow explains, JetBrains Mono counts.
- Signal teal is the only control colour; blue and amber are only ever the two worlds.
- Depth is three tones (ground → panel → raised) and 1 px lines. No shadows.
- One filled button per view. One viewport, no page scroll, on every working screen.

## Colors

A **restrained full palette**: cool neutrals that carry the shell, one control colour, and four data
colours that only appear where the simulation speaks.

### Control
- **Signal** (`--signal`, dark `#3bd4c7`, day `#0b7f76`): the one filled button (Play/Pause; a sheet's
  main action), the selected segment's bar, slider fill and hover thumb, variable values, the wordmark's
  ellipsis, the current world's glyph, and the focus ring. Text on it is `--on-signal`.

### The two worlds (the temperature rule)
- **No-change blue** (`--base`): the unchanged world — stage tag, solid chart line, readout column,
  hollow round timeline dot.
- **What-if amber** (`--alt`): the forked world — stage tag, dashed chart line, fork marker, readout
  column, filled diamond timeline dot, the armed what-if row, a change that is on in "Your changes". The
  what-if row (and a ticked change row) is the only control allowed to wear amber, because it is the control
  that changes the world.
- Cool is reality, warm is what might be, always backed by a mark shape (● vs ◆), a dash pattern or a label.
- **Gain green / loss coral** (`--good`, `--bad`): signed deltas only.

### Neutrals
- **Ground** (`--bg`): the page behind the panels; the recessed track of segmented controls.
- **Panel** (`--panel`): every column, the dock, the results strip.
- **Raised** (`--surface`): popovers, sheets, inputs, secondary buttons, hover, the selected segment.
- **Line** (`--separator`): panel edges and row rules (solid). **Track** (`--muted-line`): slider
  tracks, chart grid, the ad hole's dashed edge. Never text.
- **Ink / Ink-2** (`--label`, `--label-2`): text. Ink-2 is ≥ 5.5 : 1 on every surface in both themes.
- **Stage** (`--stage`, `--stage-panel` …): fixed dark values in both themes for the stage and the chrome
  drawn on it (transport strip, hero, edge label).
- **Day shift** (`[data-theme="light"]`): the same roles on a cool light grey, for projectors and bright
  rooms. The stage stays dark. Graphite is the default whatever the OS prefers; day shift is a saved choice.

### CSS token map

| Role | CSS token | Dark / day |
| --- | --- | --- |
| ground | `--bg` | `#0a0e13` / `#e9edf2` |
| panel | `--panel` | `#111821` / `#f7f9fb` |
| raised | `--surface` | `#18212d` / `#ffffff` |
| line | `--separator` | `#232d3a` / `#cbd3dd` |
| track | `--muted-line` | `#3a4656` / `#a9b4c2` |
| ink | `--label` | `#e6edf5` / `#0e141b` |
| ink-2 | `--label-2` | `#8b98a9` / `#4b5767` |
| signal, on-signal | `--signal`, `--on-signal` (`--bg-elevated` = legacy alias) | `#3bd4c7`, `#04201d` / `#0b7f76`, `#fff` |
| no change | `--base` (`--base-soft` tint) | `#7fb2ff` / `#2f5fb3` |
| what-if | `--alt` (`--alt-soft` tint) | `#ffb547` / `#8f5400` |
| gain, loss | `--good`, `--bad` | `#5fd68a`, `#ff6b5a` / `#1e7a45`, `#c0392b` |
| stage chrome | `--stage`, `--stage-panel`, `--stage-raised`, `--stage-ink`, `--stage-ink-2`, `--stage-line`, `--stage-muted`, `--stage-signal`, `--stage-on-signal` | fixed dark |

`--ember` is retired (an alias of ink-2 for old references). Type sizes are `--t-*`, tracking
`--track-label` / `--track-micro`, radii `--r-card` / `--r-ctl` / `--r-full` (`--r-ghost` and `--r-pill`
are legacy aliases of `--r-ctl`), spacing `--s-1`…`--s-8`, `--pad-card`, `--gap`, `--col-gap`; motion
`--ease-out`, `--d-fast`, `--d-ctl`.

## Typography

Three self-hosted families via `next/font` (no runtime request): **Barlow Semi Condensed** 500/600,
**Barlow** 400/500, **JetBrains Mono** 500. Canvas code gets them as `FONT.display`, `FONT.body`,
`FONT.mono` (set by the shell from the CSS variables).

### Three voices
- **Naming** (condensed, 600, uppercase from CSS, tracked +0.06em; Micro +0.08em): buttons, tabs, panel
  headers, table heads, the world title, the scale hero, stage tags. A highway-sign / instrument-label voice.
- **Explaining** (Barlow 400, mixed case, never tracked): what-if questions, intros, hints, timeline
  events, facts. Plain and open for readers from age 10.
- **Counting** (JetBrains Mono 500, tabular, never tracked): every number — the world clock, speeds,
  variable values (in signal), readouts, chart axes, timeline times, the scale's sizes, the price.
  Mono is for measurement only, never a "technical" costume on words.

### Scale
11 · 12 · 14 · 15 · 16 · 20 · 28 · 40 · 52 px, each a token: Micro 11, Label 12, Small 14, Callout 15
(page default), Body/Headline 16, Heading-sm / Body-lg 20, Title 28–40, Heading 40, Display 40–52.

### Other scripts (change 0025)
Latin languages (incl. Polish, Turkish, Vietnamese) stay in the three families. Other scripts fall back per glyph inside
the same tokens (`--font-script`): Noto Sans for Cyrillic, Noto Sans Arabic / Devanagari / Thai / Bengali (self-hosted,
fetched only when a page has those letters), then the system's own CJK fonts, ordered per language (`--font-cjk`).
In Arabic, Chinese, Japanese, Korean, Hindi, Thai and Bengali the naming voice drops its tracking (`--track-label: 0`):
tracking breaks joined letters and crowds marks, and these scripts have no capitals.

### Right to left (Arabic)
The chrome mirrors through logical properties (`margin-inline-*`, `inset-inline-*`, `text-align: start`): columns, nav,
transport and popovers swap sides. The stage, charts, range sliders and time tracks stay left to right (time always runs
rightwards), and only arrows that mean "forward" flip.

### Section headers
`.headline` inside panels is a condensed Label in ink-2, an optional mono count (`WHAT IF 13`,
`VARIABLES 21`), then a 1 px rule running to the panel edge. No kickers above titles.

## Layout

Unchanged from the console rules (changes 0004, 0007): working screens (`/`, `/lab/*`) fill exactly one
viewport (`100dvh`) and never scroll the page; only named regions scroll internally with a 20 px fade.

- **Desktop (≥ 1280):** Ask panel 280 · centre · Tune panel 300, 12 px between panels. The centre is one
  framed unit: stage, transport strip, results strip (chart | timeline; chart | right now | timeline at
  ≥ 1440). 200 px results, 160 px under 760 px tall.
- **Compact desktop (1024–1279):** centre · a 300 px dock panel (Ask · Tune · Read).
- **Phone / tablet (< 1024):** stage and transport on top, a dock panel (Ask · Tune · Read · Log) under it.
- **Phones held sideways (≤ 520 tall):** stage beside the dock.
- **Rhythm:** 4-pt spacing; panel padding / gap 12 / 14 below 1280, 16 / 16 from 1280; page gutter 8 px
  on phones, 12 px from 1024.
- **Ads ([ADR 0007](docs/decisions/0007-ad-slots-per-world.md)):** sizes and positions unchanged; an empty
  slot is a dashed track-coloured hole with a Micro "Ad" label.
- **Per-world consoles** own their layout within these bands and tokens.

## Elevation & Depth

Three tones, no shadows: ground → panel → raised, each separated by a 1 px line. Popovers and sheets are
raised with a track-coloured edge. The modal scrim is 78 % stage. (Inset 2 px bars are allowed only as
the what-if row's armed mark, the fork row in the timeline, and the selected segment's signal bar.)

## Shapes

Three radii: panels, stage, popovers and sheets 6 px; controls (buttons, inputs, segments, chips, rows)
4 px (3 px inside a segment track); status marks round. No pills. Lines are 1 px and solid; dashes are
reserved for meaning: the what-if chart line, the split seam in a side-by-side export, an empty ad slot.

Icons: the in-house set (`components/ui/Icon.tsx`), 24 px grid, 1.5 px stroke, round caps, geometric; one
glyph per world. Always with text or an `aria-label`.

## Components

### Buttons
- **Primary:** signal fill, on-signal condensed Label, 44 px, 4 px radius, leading glyph. One per view.
  Hover mixes 15 % ink into signal.
- **Secondary:** raised fill, 1 px line, ink Label; hover lightens the fill and the edge. In the transport
  below 1440 px (or a narrow centre) they collapse to 44 × 44 icon-only.
- **Icon:** 44 × 44, 4 px radius, transparent; hover = raised fill + line.
- **Press:** scale 0.97 over 150 ms (off under reduced motion).

### Segmented control
A recessed track (ground fill, 1 px line, 2 px inset). Options are mono (speeds) or condensed (tabs) in
ink-2; the selected cell is raised, ink, with a 2 px signal bar on its bottom edge. Used for speed, chart
metrics and dock tabs (`role="tablist"`; the dock's track is borderless on the ground strip).

### Panels
Panel fill, 1 px line, 6 px radius, padding 12–16. Sections inside are separated by a solid rule and the
gap. Only the panel is a box: no cards inside panels.

### What-if row (signature control)
Fork glyph + the question in Small, 40 px min, 4 px radius. Hover: raised fill. Armed: amber-soft fill,
2 px amber inset bar, amber glyph; a repeat count in mono amber.

### Variable row
Label (Small) and the value in mono signal on one line; a 2 px slider under it whose filled part is
signal (`--fill` set by `ControlsForm`), a 14 × 18 ink thumb (signal on hover). Groups are headed by Micro.

### Inputs
- **Select:** raised fill, 1 px line, 4 px radius, chevron in ink-2, Small text.
- **Focus:** 2 px signal outline, offset 2 px, on everything focusable. Selection and caret use signal.

### Results
- **Chart:** grid in line colour; axis labels mono 11 in ink-2; no change solid 2 px blue, what-if dashed
  2.5 px amber; the fork marker is a 1 px amber line with a diamond head and a `FORK` label.
- **Legend / readout heads:** channel tags (`.ch` / `.ch.a`).
- **Readouts:** mono numbers, row rules, what-if column amber.
- **Timeline:** mono time in ink-2, a mark per row (hollow round blue = no change only, amber diamond =
  what-if only, half-filled ink round = both), the explaining voice for events; the pinned fork row.

### Stage chrome
- **Tags:** `channelTag()` (`lib/sim/draw.ts`): dark plate, 1 px line, 3 px corners, ●/◆ mark and a
  condensed label in the channel colour. `chip()` for other readouts (the world clock in mono).
  The stage is one pane (change 0024), labelled `CHANGED: A + B` or `NOW · PICK CHANGES TO MAKE`.
- **Transport:** a stage-panel strip under a 1 px line, in stage colours in both themes: Play/Pause, speed,
  Reset (everything: settings, changes, time), the hint, Export, Full screen.
- **Your changes:** every change as a 44 px row with a signal checkbox, its label and its time (mono); on =
  the what-if row's amber bar and soft fill, off = secondary text struck through; a remove icon button; "Turn
  all off / on" and "Clear the list" buttons under it (`components/console/Changes.tsx`).
- **Split seam (exports only):** dashed line in the gap between the two worlds of a side-by-side export.
- **Scale hero:** Display, fades out on first interaction. Scale labels: condensed names, mono sizes,
  amber "OPEN WORLD →" (the "gold labels" the hint refers to).
- **Edge label:** `WHAT-IF LAB · SEED n` in Micro down the stage's right edge at ≥ 1280.

### Boot scene (change 0026, the one exception)
While a lab page loads, a full-screen overlay plays the boot scene in the visitor's theme (graphite: `--stage` with additive
glow; day shift: `--bg`, the light tokens' teal, blue and amber painted plainly): signal-teal sparks with glow and light streaks fly into the world's silhouette (`WorldMeta.boot`, `lib/boot/shapes.ts`), hold and
breathe until the console is ready, then a soft shimmer sweeps across and forks the shape into the two channels (blue
left, amber right) as the overlay fades out over 250 ms. This is the **only** surface allowed glow, streaks and shimmer.
The console never borrows them. Words: the world name as a Label and "Starting the world" in ink-2, bottom centre.
Rules: never a progress number, no flashes above 3 a second, light peaks well below white, any tap or key skips it, and
reduced motion shows the forked shape still and fades it in 150 ms.

### Navigation
- The bar reads as a sentence ([change 0021](docs/changes/0021-sentence-topbar.md)): the wordmark
  `what if…` (condensed 600 at 20 px, lowercase identity, the ellipsis in signal) links home, then the
  world menu button (panel fill, 1 px line, the world glyph in signal, the name in Barlow 16) finishes it.
- World list popover: raised, 48 px rows (glyph, Label name, Small subtitle); the current world on a
  panel-tone row with its glyph in signal.
- Account and theme icon buttons at the far right; account popover rows 44 px.
- **Theme tip:** on a first visit (no saved theme), once the boot scene is gone, a raised note with a 1 px signal edge and
  a caret hangs under the theme button: "Dark by default. Prefer light? Switch here any time." Once per browser; it
  goes on ×, Escape, a click elsewhere or switching.
- **Sheets** (Premium, exports): raised, 6 px, max 480 px, bottom-docked below 768 px; inside, the one
  signal button is the main action, the rest are secondary.

## Do's and Don'ts

### Do
- Take every colour, size, radius and duration from a token; canvas code uses `STAGE` and `FONT`.
- Use condensed uppercase for names, Barlow for explanations, mono for numbers — nothing else.
- Mark the two worlds with colour **and** shape (●/◆), dash or label every time.
- Keep hit targets ≥ 44 px, text ≥ 4.5 : 1, a full keyboard path with the signal focus ring, and
  respect `prefers-reduced-motion`.
- Animate only transform, opacity and colour with `--ease-out` at 150 / 250 ms.

### Don't
- Don't add shadows, glows, gradients-as-depth, scanlines, bezels or other sci-fi costume (the boot scene is the one exception).
- Don't use signal for data, or blue/amber for controls (except the what-if row's amber).
- Don't track mixed-case or mono text; don't use mono for words.
- Don't nest boxes inside panels or put a kicker above a heading.
- Don't use pure `#fff` on dark or `#000` anywhere in chrome; don't use track colour for text.
- Don't pull in an icon or UI library; don't use exclamation marks in chrome.

### Blocking checks
- Hit targets ≥ 44 × 44. Text ≥ 4.5 : 1 on ground, panel and raised, both themes.
- Full keyboard path: nav → Ask → stage/transport → Tune, signal focus ring visible.
- Uppercase comes from CSS, so screen readers get normal text.
- No page scroll on consoles at 375×667 … 1440×900; at 200 % zoom a console may fall back to the dock.
- `prefers-reduced-motion` respected.
