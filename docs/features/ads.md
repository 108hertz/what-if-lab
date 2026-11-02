# Ads in reserved slots

- **Status:** slots reserved (change 0008); ad loading planned (Phase 3)
- **Tier:** free only
- **Owner area:** `components/console/AdSlot.tsx`, `components/console/StandardConsole.tsx`, `components/shell/Lab.tsx`, `public/ads.txt` (todo), third-party (AdSense + CMP)
- **Changes:** [0008](../changes/0008-worlds-as-projects.md)
- **Decision:** [ADR 0003](../decisions/0003-advertising.md), [ADR 0007](../decisions/0007-ad-slots-per-world.md)

## What it is

Fixed-size ad units reserved in every world console, away from the stage, funding the free tier.

## Why

Revenue scales with traffic without a paywall. Must not reduce traffic by hurting UX or speed.

## Behaviour

- **Slots are reserved now, filled later** (change 0008, [ADR 0007](../decisions/0007-ad-slots-per-world.md)).
  `components/console/AdSlot.tsx` renders fixed-size boxes; every world console keeps them:
  - ≥ 1600 px wide and ≥ 700 px tall: two 160×600 rails outside the console (shell, also on the scale view).
  - 1280–1599 px (and wide-but-short screens): one 300×250 box at the foot of the Tune column.
  - 1024–1279 px: one 300×250 box under the dock.
  - < 1024 px: one 320×50 banner under the dock; hidden on phones held sideways (≤ 520 px tall).
- Fixed dimensions → CLS = 0. Pages still never scroll.
- Empty slot (today, dev, no-fill, ad-blocker): dashed cork outline with a Micro "Ad" label; at most one per
  screen adds the quiet "Ad-free with Premium · $15/yr" line. Never animated.
- **Not yet built (Phase 3):** consent (CMP), loading the ad script on `requestIdleCallback` after the first
  sim frame, hiding slots for Premium (decided before first paint), `public/ads.txt`.
- Never: over/inside the stage, between the stage and the transport, in popovers or modals, in embeds
  (`/embed/*`), interstitials, sticky overlays, auto-refresh faster than network policy allows.
- One below-the-fold unit allowed on long-form what-if article pages only.

## Out of scope

Native/sponsored content, affiliate links, video ads.

## Acceptance checks

- [ ] Lighthouse CLS stays 0 with ads on and off.
- [ ] No ad network requests for Premium or before consent (check Network panel).
- [x] At 1599 px wide: no rails. At 1600 px: rails visible, console still fits without page scroll (checked 1680×1050, 2026-11-02).
- [x] Every world reserves its slot at every band; none on phones held sideways (`tests/structure.test.ts` + browser check, 2026-11-02).
- [ ] `ads.txt` served at `/ads.txt`.
