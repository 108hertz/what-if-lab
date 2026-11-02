---
name: darkroom-ui
description: Darkroom design-system rules for What-If Lab. Use before writing or reviewing any UI — components, CSS, layout, canvas colours, icons, motion, copy, mobile behaviour, ad rails or premium screens. Also use for "polish the UI", "redesign", "make it fit one screen", or a UI review.
---

# Darkroom UI for What-If Lab

The source of truth is `docs/design/design-system.md` (tokens, voices, shape, icons, console layout,
components, accessibility). **Read it first.** This skill is the working checklist.

## Before you write UI

1. Is there an approved change doc in `docs/changes/` covering this UI work? If not and the change is
   non-trivial, run the `plan-change` skill first.
2. Is this a **console** (working screen: `/`, `/lab/*`) or a **reading** screen? Consoles never scroll
   the page — decide where the new thing fits on one screen before writing it.
3. Identify the view's **one primary action**. Everything else is secondary or tertiary.
4. Decide phone behaviour first (375 × 667), then 768, 1024, 1280 × 800, 1600.

## While writing

- **Tokens only.** No raw hex, px font sizes or shadows in components; use `var(--…)` from
  `app/globals.css`. New token → add it to the design doc table and `globals.css` together.
- **Two voices:** LABEL classes (`.display .title .headline .lbl .micro`) for naming, `.desc`/body for
  explaining. Never hard-code uppercase strings; never put reading text in uppercase.
- **Colour roles:** `--base` = no-change world, `--alt` = what-if world (plus a label or dash, never
  colour alone). `--ember` and `--muted-line` are never interactive or reading text.
- **Canvas:** draw with `STAGE` from `lib/sim/draw.ts` and `FONT`; the stage is dark in both themes.
- **Depth:** surface steps and dashed hairlines; no shadows, no boxed rows.
- **Controls:** 44 px hit targets; one filled bark primary (36 px radius); ghost secondaries; compact
  variable rows in Tune.
- **Icons:** add glyphs to `components/ui/Icon.tsx` (24 grid, 1.5 stroke, geometric). No icon libraries,
  no emoji. A new world needs a world glyph.
- **No page scroll on consoles.** If something doesn't fit, it goes into the dock (phones) or an existing
  internally-scrolling region with a fade mask — never makes the page taller.
- **Motion:** motion tokens; `transform`/`opacity` only; respect `prefers-reduced-motion`. The fork split
  is the signature moment — don't compete with it.
- **Ads and premium:** rails only at ≥ 1600 px, reserved size, never over the stage or in the dock.
  Premium upsell is calm: one card, no countdowns, no dark patterns.
- **Copy:** short, curious, plain verbs. What-ifs are questions.

## Review checklist (run before saying UI work is done)

- [ ] Consoles: `document.documentElement.scrollHeight === innerHeight` at 375×667, 375×812, 768×1024,
      1024×768, 1280×800, 1440×900 (check in the browser pane), every world.
- [ ] Both themes; reduced motion.
- [ ] Keyboard-only path works; focus ring visible; shortcuts don't fire while typing in inputs.
- [ ] Contrast ≥ 4.5:1 for text; base/alt distinguishable without colour.
- [ ] No layout shift when ads/premium state/fonts load.
- [ ] No new raw colours or font sizes outside `globals.css`.
- [ ] `npm run typecheck && npm test && npm run build` green.

## Don'ts

- Don't add a UI library or CSS framework without an ADR.
- Don't put more than one primary button on a view.
- Don't use exclamation marks in chrome.
