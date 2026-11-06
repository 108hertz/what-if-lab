---
name: control-room-ui
description: Control Room design-system rules for What-If Lab. Use before writing or reviewing any UI — components, CSS, layout, canvas colours, fonts, icons, motion, copy, mobile behaviour, ad rails or premium screens. Also use for "polish the UI", "redesign", "make it fit one screen", or a UI review.
---

# Control Room UI for What-If Lab

The source of truth is the root `DESIGN.md` (tokens in its frontmatter; voices, panels, the two-channel
signature, console layout, components, blocking checks in its sections). **Read it first.** This skill is
the working checklist. (Replaced the `darkroom-ui` skill in change 0023 / ADR 0009.)

## Before you write UI

1. Is there an approved change doc in `docs/changes/` covering this UI work? If not and the change is
   non-trivial, run the `plan-change` skill first.
2. Is this a **console** (working screen: `/`, `/lab/*`) or a **reading** screen? Consoles never scroll
   the page — decide where the new thing fits on one screen before writing it.
3. Identify the view's **one primary action** (the one signal-filled button).
4. Decide phone behaviour first (375 × 667), then 768, 1024, 1280 × 800, 1600.

## While writing

- **Tokens only.** No raw hex, px font sizes or shadows in components; use `var(--…)` from
  `app/globals.css`. New or changed token → update `globals.css`, the `DESIGN.md` frontmatter and token map
  (and `STAGE` for stage colours) in the same commit, then regenerate `.impeccable/design.json`.
- **Three voices:** naming = `.display .title .headline .lbl .micro` (condensed, uppercase from CSS,
  tracked); explaining = body / `.desc` / `.small` (Barlow, mixed case, never tracked); counting =
  mono (`.num`, `output`, `time`, `td` are mono already). Never hard-code uppercase strings; never put
  words in mono.
- **Colour jobs:** `--signal` = controls (primary fill, selection bar, slider fill, focus, values).
  `--base` / `--alt` = the two worlds only, always with a mark (`.ch` / `.ch.a`, ●/◆), dash or label.
  The what-if row is the only control that wears amber. `--muted-line` is never text.
- **Depth:** ground → `--panel` → `--surface` (raised), 1 px `--separator` lines, no shadows. Tool areas
  are panels (`.col`, `.dock`, `.results`); no boxes inside panels.
- **Section headers:** `<h3 className="headline">Name<span className="hcount">n</span></h3>` gives the
  label, an optional mono count and the rule to the edge. No kicker labels above headings.
- **Canvas:** draw with `STAGE` and `FONT` from `lib/sim/draw.ts` (`FONT.display` for uppercase labels,
  `FONT.mono` for numbers). Use `channelTag()` for world labels and `chip()` for other HUD readouts; the
  stage is dark in both themes.
- **Shape:** `--r-card` 6 px for panels/stage/popovers, `--r-ctl` 4 px for controls; no pills.
- **Controls:** 44 px hit targets; segmented controls on a recessed track (`.seg`); boxed selects;
  range inputs get `--fill` (see `ControlsForm`).
- **Icons:** add glyphs to `components/ui/Icon.tsx` (24 grid, 1.5 stroke, geometric). No icon libraries,
  no emoji. A new world needs a world glyph.
- **No costume:** no glow, scanlines, bezels, screws, CRT effects, terminal prompts or fake hardware.
- **No page scroll on consoles.** Overflow goes into the dock (phones) or an existing internally
  scrolling region with a fade mask.
- **Motion:** motion tokens; transform / opacity / colour only; respect `prefers-reduced-motion`. The
  fork split is the signature moment — don't compete with it.
- **Ads and premium:** sizes and places per ADR 0007, never over the stage or transport. Premium upsell
  is calm: one sheet, no countdowns, no dark patterns.
- **Copy:** short, curious, plain verbs. What-ifs are questions. Readable from age 10.

## Review checklist (run before saying UI work is done)

- [ ] Consoles: `document.documentElement.scrollHeight === innerHeight` at 375×667, 375×812, 768×1024,
      1024×768, 1280×800, 1440×900, every world.
- [ ] Both themes (graphite and day shift); reduced motion.
- [ ] Keyboard-only path works; the signal focus ring is visible.
- [ ] Contrast ≥ 4.5 : 1 for text on ground, panel and raised; the two worlds distinguishable without colour.
- [ ] No layout shift when ads / premium state / fonts load.
- [ ] No raw colours or font sizes outside `globals.css`; any token change mirrored in `DESIGN.md`.
- [ ] Signal fill only on the primary button; blue/amber only on world data (and the what-if row).
- [ ] `npm run typecheck && npm test && npm run build` green.

## Don'ts

- Don't add a UI library or CSS framework without an ADR.
- Don't put more than one primary button on a view.
- Don't use exclamation marks in chrome.
