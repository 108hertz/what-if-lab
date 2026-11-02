---
name: apple-ui-ux
description: Apple-grade UI/UX rules for What-If Lab. Use before writing or reviewing any UI — components, CSS, layout, canvas colours, motion, copy, mobile behaviour, ad rails or premium screens. Also use for "make it look like Apple", "polish the UI", "redesign", or a UI review.
---

# Apple-grade UI/UX for What-If Lab

The source of truth is `docs/design/apple-design-language.md` (tokens, type scale, components,
layout, accessibility). **Read it first.** This skill is the working checklist.

## Before you write UI

1. Is there an approved change doc in `docs/changes/` covering this UI work? If not and the change is
   non-trivial, run the `plan-change` skill first.
2. Identify the view's **one primary action**. Everything else is secondary or tertiary.
3. Decide mobile behaviour first (375 px), then scale up (768, 1280, 1600 px).

## While writing

- **Tokens only.** No raw hex, px font sizes or ad-hoc shadows in components; use `var(--…)` from
  `app/globals.css`. Need a new token? Add it to the design doc table and `globals.css` together.
- **Both themes.** Every surface is checked in light and dark. Canvas draws with the palette passed in
  `DrawContext`, never hard-coded colours. `--base` = no-change world, `--alt` = what-if world.
- **Typography:** system stack, the doc's type scale, sentence case, `tabular-nums` for changing numbers.
- **Hierarchy through space and weight**, not boxes. Prefer grouped lists and whitespace over borders.
  One hairline where separation is needed.
- **Materials** for floating chrome (nav bar, transport pill, sheets) with an opaque fallback.
- **Controls:** segmented controls for 2–5 mutually exclusive options; sliders show their value; 44 px
  minimum hit targets; one filled bark primary (36 px radius), ghost secondaries; no shadows.
- **Motion:** use the motion tokens; animate `transform`/`opacity` only; respect
  `prefers-reduced-motion`. The fork split is the signature moment — don't compete with it.
- **Mobile:** full-bleed stage, floating transport, inspector in a bottom sheet. No hover-only
  affordances. Respect safe-area insets.
- **Ads and premium:** rails only at ≥ 1280 px with reserved size; never over the stage or in sheets.
  Premium upsell is calm: one card, no countdowns, no dark patterns, easy to dismiss.
- **Copy:** short, curious, plain verbs. Questions for what-ifs ("What if the Moon disappeared?").

## Review checklist (run before saying UI work is done)

- [ ] Looks right at 375 / 768 / 1280 / 1600 px, light and dark (check in the browser pane).
- [ ] Keyboard-only path works; focus ring visible; shortcuts don't fire while typing in inputs.
- [ ] Contrast ≥ 4.5:1 for text; base/alt distinguishable without colour (label or dash pattern).
- [ ] No layout shift when ads/premium state/fonts load.
- [ ] Reduced motion: no scale/translate animations.
- [ ] No new raw colours or font sizes outside `globals.css`.
- [ ] `npm run typecheck && npm test && npm run build` green.

## Don'ts

- Don't copy Apple logos, SF Symbols, product imagery or ship SF Pro font files.
- Don't add a UI library or CSS framework without an ADR.
- Don't put more than one primary button on a view.
- Don't hard-code uppercase strings (use the `.lbl`/`.headline`/`.title` classes), put reading text in
  uppercase, use `--ember` or `--muted-line` for interactive/readable text, use emoji or third-party icon
  sets as icons (add a glyph to `components/ui/Icon.tsx`), or exclamation marks in chrome.
