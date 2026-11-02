# 0001 — Apple-grade UI redesign

- **Status:** proposed
- **Phase:** 1
- **Features:** [scale explorer](../features/scale-explorer.md), [fork and compare](../features/fork-and-compare.md)
- **Decisions:** [ADR 0004](../decisions/0004-apple-design-language.md)
- **Created:** 2026-11-02 · **Shipped:** —

## Why

The current UI works but reads as a developer tool: dense borders, all-caps labels, three web fonts,
dark-only. To win and keep casual traffic (and justify Premium) the site must feel calm, premium and
obvious on first visit, on phones as much as desktops.

## Scope

**In:** tokens + light/dark themes, typography, app shell (nav bar, world switcher), lab layout
(stage + inspector; bottom sheet on mobile), transport pill, controls restyle, fork animation,
reduced-motion, keyboard shortcuts, canvas colours from tokens. Empty ad-rail slots in the shell
(no ad code).
**Out:** ads, premium, share URLs, new routes, sim model changes.

## Design

Follows [design/apple-design-language.md](../design/apple-design-language.md).

- `app/globals.css`: replace tokens with the light/dark table; add `[data-theme]` override; spacing,
  radius, motion tokens; remove `.tabs`, `.seg`, `.fork` legacy styles once replaced.
- `app/layout.tsx`: drop Google Fonts (system stack + self-hosted Inter variable via `next/font/local`
  or `next/font/google` with `display: swap`); add theme init script (no flash).
- New `components/ui/`: `Button`, `SegmentedControl`, `Slider`, `GroupedList`, `Sheet`, `Toast`.
- `components/Tabs.tsx` → `WorldSwitcher` (segmented, scrollable on mobile) inside a `NavBar`.
- `components/Lab.tsx`: layout grid + mobile sheet; split-stage fork animation.
- `lib/sim/draw.ts` / `engine.ts`: take a `theme` palette in `DrawContext` instead of hard-coded hex.
  `lib/sim` stays DOM-free (palette is passed in, not read from CSS).

## Steps

1. Tokens + themes + typography; switch fonts. Visual parity, no layout change.
2. `components/ui/*` primitives; replace buttons/segmented/sliders in place.
3. NavBar + WorldSwitcher; shell grid with empty rail slots at ≥ 1280 px.
4. Lab desktop layout: inspector grouped lists.
5. Lab mobile: full-bleed stage, transport pill, bottom sheet with detents.
6. Canvas palette via `DrawContext.theme`; light theme drawing pass for every sandbox.
7. Fork split animation + reduced-motion + keyboard shortcuts.
8. Scale view restyle.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Canvas sims look wrong in light theme | Step 6 checks every sandbox in both themes; screenshots in PR |
| `backdrop-filter` jank on low-end Android | Opaque fallback; disable blur when `navigator.hardwareConcurrency <= 4` |
| Bottom sheet fights canvas touch gestures | Sheet only captures drags starting on the grabber/header |
| Scope creep | Out-of-scope list above; anything else becomes a new change doc |

## Verification

- [ ] `npm run typecheck && npm test && npm run build` green after each step.
- [ ] Manual at 375, 768, 1280, 1600 px; light + dark; reduced motion on.
- [ ] Keyboard-only walkthrough: switch world, change variable, fork, play/pause.
- [ ] Lighthouse a11y ≥ 95; CLS 0.
- [ ] Docs: design doc updated with anything learned; PLAN.md Phase 1 ticked.

## Log

- 2026-11-02 — proposed.
