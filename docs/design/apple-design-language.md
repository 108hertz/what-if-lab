# Design language — Apple-inspired

Decision: [ADR 0004](../decisions/0004-apple-design-language.md). Enforced by the `apple-ui-ux` skill.

## Principles

1. **Clarity** — one primary action per view. Text is legible at every size; icons are unambiguous.
2. **Deference** — the simulation is the hero. Chrome is quiet, translucent, and gets out of the way.
3. **Depth** — layers (stage → floating controls → sheets) communicate hierarchy, with materials and
   motion, not borders everywhere.
4. **Consistency** — the same control looks and behaves the same in every world.
5. **Delight in restraint** — one memorable moment per screen (the fork split), not ten.

## Tokens

All colours, radii, spacing, type and motion are CSS custom properties in `app/globals.css`. Components
use tokens only — no raw hex in components. Canvas code reads tokens via `getComputedStyle` once per
theme change.

### Colour

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#FBFBFD` | `#000000` | Page |
| `--bg-elevated` | `#FFFFFF` | `#1C1C1E` | Cards, sheets |
| `--fill` | `rgba(120,120,128,.12)` | `rgba(120,120,128,.24)` | Segmented controls, inputs |
| `--label` | `#1D1D1F` | `#F5F5F7` | Primary text |
| `--label-2` | `#6E6E73` | `#A1A1A6` | Secondary text |
| `--separator` | `rgba(60,60,67,.18)` | `rgba(84,84,88,.55)` | Hairlines |
| `--accent` | `#0071E3` | `#2997FF` | Links, primary buttons, focus |
| `--base` | `#5B6380` | `#A9B1D6` | No-change world (charts, labels) |
| `--alt` | `#D98E00` | `#FFC857` | What-if world |
| `--good` / `--bad` | `#1F9D55` / `#D7372F` | `#30D158` / `#FF453A` | Deltas |

`--base`/`--alt` keep their meaning in both themes; check ≥ 3:1 contrast against `--bg` for chart lines.

### Typography

- Stack: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif`
  (display: `"SF Pro Display"` first). Numbers: `font-variant-numeric: tabular-nums`. Mono only for code.
- Scale (px / line-height / weight): Large title 34/41/700 · Title 28/34/700 · Title 2 22/28/600 ·
  Headline 17/22/600 · Body 17/24/400 · Callout 16/21/400 · Subhead 15/20/400 · Footnote 13/18/400 ·
  Caption 12/16/400. Marketing hero up to `clamp(48px, 7vw, 80px)` with `letter-spacing: -0.025em`.
- Sentence case everywhere. No all-caps labels except tiny eyebrows (≤ 12 px, +0.06em tracking).

### Space, shape, materials

- 4-pt base, 8-pt rhythm: `--s-1: 4px … --s-8: 64px`. Page gutter 16 px mobile, 24 px tablet, 32 px desktop.
- Radii: controls 10 px, cards 18 px, sheets 24 px top corners, pills 999 px. Continuous-looking corners
  (no mixed radii on one element).
- Materials: nav bar, floating transport and sheets use
  `background: color-mix(in srgb, var(--bg-elevated) 72%, transparent); backdrop-filter: saturate(180%) blur(20px);`
  with a hairline `--separator` border. Provide an opaque fallback under `@supports not (backdrop-filter: blur(1px))`.
- Shadows: soft and rare — `0 1px 2px rgba(0,0,0,.04), 0 8px 24px rgba(0,0,0,.08)` (light only;
  dark uses elevation colour instead).

### Motion

- Easing: `--ease-out: cubic-bezier(.22,1,.36,1)`; spring-like for sheets
  `cubic-bezier(.32,.72,0,1)`. Durations: 150 ms (hover/press), 250 ms (controls), 400 ms (sheets/views).
- Press feedback: `transform: scale(.97)` on buttons.
- The **fork** gets the signature animation: the stage splits from the centre, alt half tints `--alt`.
- `prefers-reduced-motion: reduce` → cross-fades only, no scale/translate, sims still run.

## Layout

- **App shell:** translucent top nav (logo · world switcher · Share · Go Premium) → content.
  At ≥ 1280 px: `rail | content (max 1180) | rail` for ads (see [ads](../features/ads.md)).
- **Lab view (desktop):** stage left, **inspector** right (320–360 px) with grouped-list sections:
  What-ifs · Variables · Readouts · About this model.
- **Lab view (mobile):** full-bleed stage, floating transport pill at the bottom, inspector as a
  **bottom sheet** with detents (peek 96 px / half / full). World switcher becomes a horizontally
  scrolling segmented control.
- **Scale view:** full-bleed, minimal overlay text, slider as a floating pill.

## Components

| Component | Rules |
| --- | --- |
| Button | Primary = filled `--accent`, pill, 44 px min height. Secondary = `--fill` background. One primary per view. |
| Segmented control | `--fill` track, elevated white/dark thumb that slides (250 ms). Used for world tabs, speed, view modes. |
| Slider | Thin 4 px track, 28 px thumb with shadow, value shown in tabular numbers right-aligned. |
| Grouped list | Inset rounded section, hairline separators inset by 16 px, 44 px min row height. |
| Sheet | Grabber, 24 px top radius, material background, drag-to-dismiss, focus-trapped. |
| What-if row | Title + one-line subtitle; selected = checkmark + `--alt` tint, not a heavy border. |
| Toast | Top-centre pill, auto-dismiss 2.5 s, `aria-live="polite"`. |

## Accessibility (blocking)

- Hit targets ≥ 44×44 px. Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24 px). Never colour-only meaning —
  base/alt also differ by label and line style (solid vs dashed).
- Full keyboard path; visible focus ring (`--accent`, 3 px, offset 2 px). Shortcuts: Space play/pause,
  F fork, ←/→ step, 1–9 select what-if, `/` focus world switcher.
- Canvas has an accessible name and a live text summary of key metrics (`aria-live`, throttled).
- Supports 200 % zoom without horizontal scroll.

## Voice

Short, curious, plain. "What if the Moon disappeared?" not "Lunar removal scenario". Buttons are verbs.
No exclamation marks in UI chrome.
