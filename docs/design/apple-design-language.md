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

### Colour — "darkroom" ([ADR 0005](../decisions/0005-darkroom-visual-language.md))

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
| Button | Primary = filled `--bg-elevated` (bark), cream label, 36 px radius, 44 px min height, leading icon. Secondary = ghost (1 px label border @ 40 %, 22.5 px radius). One primary per view. |
| Segmented control | No track; options are LABELs; active = bark thumb + cream text. Used for world tabs, speed, metric tabs. |
| Slider | 1 px driftwood track, 20 px cream thumb (44 px hit area), value right-aligned in tabular numbers. |
| Grouped list | Inset rounded section, hairline separators inset by 16 px, 44 px min row height. |
| Sheet | Grabber, 24 px top radius, material background, drag-to-dismiss, focus-trapped. |
| What-if row | Fork glyph + mixed-case question; selected = `--alt` glyph + 2 px `--alt` left rule, no box. |
| Toast | Top-centre pill, auto-dismiss 2.5 s, `aria-live="polite"`. |

## Accessibility (blocking)

- Hit targets ≥ 44×44 px. Text contrast ≥ 4.5:1 (≥ 3:1 for ≥ 24 px). Never colour-only meaning —
  base/alt also differ by label and line style (solid vs dashed).
- Full keyboard path; visible focus ring (`--label`, 2 px, offset 2 px). Shortcuts: Space play/pause,
  F fork, ←/→ step, 1–9 select what-if, `/` focus world switcher.
- Canvas has an accessible name and a live text summary of key metrics (`aria-live`, throttled).
- Supports 200 % zoom without horizontal scroll.

## Voice

Short, curious, plain. "What if the Moon disappeared?" not "Lunar removal scenario". Buttons are verbs.
No exclamation marks in UI chrome. LABELs name, descriptions explain. Identity is the wordmark
**WHAT-IF LAB** only (no logo symbol); the ember credit line is "No AI · No live data · Same seed, same future".
