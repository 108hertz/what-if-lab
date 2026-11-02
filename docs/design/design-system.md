# Design system — "Darkroom"

Decision: [ADR 0006](../decisions/0006-darkroom-design-system.md). Enforced by the `darkroom-ui` skill.
Tokens live in `app/globals.css`; canvas mirrors them in `STAGE` (`lib/sim/draw.ts`).

**The idea:** the simulation is a lone object floating in warm darkness. Everything else is a label
around it — cream type, hairlines, no decoration. The fork is the one memorable moment per screen.

## Principles

1. **The stage is the object.** It gets the most space and the only motion. Chrome is type, not boxes.
2. **Everything in reach.** Working screens are consoles: every tool, variable and result is on one
   screen at once. You never scroll away from the experiment.
3. **Two voices.** LABELS name things; descriptions explain them.
4. **Restraint earns attention.** One filled button per view; one rare accent (ember) that is never
   interactive; depth from surface steps, never shadows.
5. **Reality vs what-if is a temperature.** Cool `--base` is the world as it is; warm `--alt` is the
   world that might be — always also told apart by a label or line style, never colour alone.

## Tokens

### Colour

Dark is the default; light "paper" changes the chrome only. **The stage is always dark** in both themes
(canvas code uses the fixed `STAGE` palette in `lib/sim/draw.ts`, which mirrors the dark tokens).

| Token | Dark (default) | Light "paper" | Use |
| --- | --- | --- | --- |
| `--bg` | `#100904` walnut | `#F6E6D2` | Page |
| `--surface` | `#1A110A` | `#FBF1E4` | Inspector, cards, sheets |
| `--bg-elevated` | `#382416` bark | `#382416` | The one filled button, active segment/tab |
| `--label` | `#FFEDD7` cream | `#100904` | Primary text, icons, focus ring |
| `--label-2` | `#A89A8A` (7.2:1) | `#5C4F43` (6.9:1) | Secondary text |
| `--separator` | `#40372E` cork | `#D9C6B0` | Hairlines; section breaks are **dashed** |
| `--muted-line` | `#6C5F51` driftwood | `#B3A28F` | Slider tracks, grid. **Never text** (3.2:1) |
| `--ember` | `#DC5000` | `#B64200` | Editorial only: credit line, notes. Never buttons or the what-if |
| `--base` | `#A9B1D6` | `#5B6380` | No-change world (cool = reality) |
| `--alt` | `#FFC857` | `#B87400` | What-if world (warm = what might be) |
| `--good` / `--bad` | `#8FD18C` / `#FF8A6A` | `#2F7D32` / `#C23A1A` | Deltas, always with a sign |
| `--stage` | `#100904` | `#100904` | Stage background in both themes |

Never pure `#FFF` text or pure `#000` backgrounds.

### Typography — two voices

- One family: **Inter** (self-hosted by `next/font`, `ss01` + `cv11`), system stack as fallback. Weights 400 and 500 only.
- **LABEL voice** (naming things): uppercase, weight 500, via CSS `text-transform` (source strings stay
  mixed case for screen readers). Display `clamp(40px,6vw,51px)`/0.9 · Title `clamp(28px,4vw,41px)`/0.9 ·
  Headline 18/1.0 · Label 12/1.1 +0.04em · Micro 10/1.2 +0.06em. No tracking at ≥ 18 px.
- **Description voice** (explaining things): mixed case, weight 400 — Body 17/1.4, Callout 15/1.45.
  What-if questions, intros, facts and timeline events always use this voice.
- Numbers: `tabular-nums`, weight 500. Classes: `.display .title .headline .lbl .micro .desc .num`.

### Space, shape, depth

- 4-pt base: `--s-1: 4px … --s-8: 64px`. Page gutter 16 px mobile, 24 px ≥ 768 px.
- Radius vocabulary (only these): cards `--r-card` 12 px · ghost buttons/segments `--r-ghost` 22.5 px ·
  filled primary `--r-pill` 36 px · chips `--r-full`. Inputs are underline-only (0 radius).
- **No shadows.** Depth = surface step (`--bg` → `--surface` → `--bg-elevated`). Floating chrome may use a
  translucent `--bg` material with blur, never a drop shadow.
- Separation by space first; one dashed `--separator` hairline between sections; no boxed rows.

### Icons

Own set in `components/ui/Icon.tsx`: 24 px grid, 1.5 px stroke, round caps, `currentColor`, geometric
primitives only. UI glyphs (play, pause, restart, fork, close, chevron, plus, minus, arrow, sun, moon)
and one abstract glyph per world (keyed by `Mode`). Always paired with text or an `aria-label`. A new
world needs a glyph added there.

### Motion

- Easing `--ease-out: cubic-bezier(.22,1,.36,1)`. Durations `--d-fast` 150 ms (hover/press),
  `--d-ctl` 250 ms (controls, tabs, theme).
- Press feedback: `transform: scale(.97)` on buttons. Animate `transform`/`opacity`/colour only.
- The **fork** is the signature moment: the stage splits and a dashed hairline marks the seam.
- `prefers-reduced-motion: reduce` → no transitions or scale; the sims still run.

## Layout — consoles and reading screens

**Working screens never scroll the page.** The scale view (`/`) and every world (`/lab/*`) fill exactly
one viewport (`100dvh`). **Tools never hide:** the what-if list, the transport and all variables are on
screen at once on desktop. Only these regions may scroll internally, each with a fade mask at the cut
edge (`.scrolly`):

- the timeline list;
- the phone/tablet dock panel;
- the Ask column *below* the what-if list (readouts and info) when the screen is short;
- the Tune column on desktops shorter than ~860 px (only the Child world reaches this);
- the speed control on phones (sideways).
**Reading screens** (about, what-if landing pages, premium, legal) scroll normally.

### Desktop console (≥ 1024 px wide)

Columns: Ask 280 px · centre · Tune 300 px (240 px each at 1024–1279 px, where the transport may wrap to
two rows). The results strip is 200 px (160 px below 760 px height): chart | timeline, and at ≥ 1440 px
chart | RIGHT NOW readouts | timeline — below 1440 the readouts sit in Ask under the what-ifs. World
switcher shows names for all worlds at ≥ 1440 px (icons + the active name below), subtitles at ≥ 1600 px.
Transport secondary buttons are icon-only below 1440 px.

```
┌ WHAT-IF LAB · credit   [world switcher]                                       ☀ ┐ nav
├ ASK 280 px ──┬ centre ─────────────────────────────────────┬ TUNE 300 px ───────┤
│ title  ⓘ     │ STAGE (fills, min 320 px)                    │ VARIABLES          │
│ WHAT IF      ├──────────────────────────────────────────────┤ (all, always open)│
│ RIGHT NOW    │ transport                                     │                    │
│ info         ├ chart ───────────────────┬ timeline (scrolls) ┤                    │
└──────────────┴──────────────────────────┴────────────────────┴────────────────────┘
```

### Tablet / phone (< 1024 px wide)

Stage on top (≈ 50–55 % of height), transport under it, then a **dock** with four tabs —
**Ask** (what-ifs) · **Tune** (variables) · **Read** (readouts, info, chart) · **Log** (timeline).
The dock panel is the only scrolling region.

### Scale view

Stage fills the centre; "WHAT HAPPENS IF…" is a Display overlay on the stage. The "In view" panel sits
on the right (desktop) or in the dock (phone).

### Ads

Side rails only at ≥ 1600 px wide, outside the console, reserved size, never over the stage or in the dock.

## Components

| Component | Rules |
| --- | --- |
| Primary button | Filled bark, cream LABEL, 36 px radius, 44 px tall, leading icon. One per view (Play/Pause in a world). |
| Secondary button | Ghost: 1 px label-colour border @ 40 %, 22.5 px radius. |
| Icon button | 44 × 44, no border, `aria-label` required. |
| Segmented / tabs | No track; options are LABELs; active = bark thumb + cream text. World switcher, speed, metric tabs, dock tabs (`role="tablist"`). |
| What-if row | Fork glyph + mixed-case question (may wrap to two lines); selected = `--alt` glyph + 2 px `--alt` left rule. |
| Variable row (compact) | Label + tabular value on one line, slider under it; 44 px hit area overall. Group headings as Micro. |
| Slider | 1 px driftwood track, 20 px cream thumb. |
| Select | Underline only, chevron glyph. |
| Readout table | Micro heads, tabular numbers; what-if column in `--alt`. |
| Chart | Driftwood/cork grid, `--base` solid, `--alt` dashed and thicker. Fills its box. |
| Timeline | Mixed-case events, Micro time; ◦ no change only · ● what-if only · ◐ both. |
| Popover | `--surface`, 12 px radius, no shadow (1 px `--separator` border), Esc / outside click closes. |

## Accessibility (blocking)

- Hit targets ≥ 44 × 44 px. Text contrast ≥ 4.5:1 (token table above lists the ratios).
- Full keyboard path: nav → Ask → stage/transport → Tune; visible focus ring (`--label`, 2 px, offset 2 px).
- Uppercase comes from CSS, so screen readers get normal text.
- The page never needs zooming sideways; at 200 % zoom a console may fall back to the dock layout.
- `prefers-reduced-motion` respected.

## Voice

Short, curious, plain. What-ifs are questions ("What if the Moon disappeared?"). Buttons are verbs.
No exclamation marks in chrome. Identity is the wordmark **WHAT-IF LAB** only; the ember credit line is
"No AI · No live data · Same seed, same future".
