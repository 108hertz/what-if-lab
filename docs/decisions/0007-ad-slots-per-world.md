# 0007 — Reserved ad slots in every world console

- **Status:** accepted (amends [ADR 0003](./0003-advertising.md); shipped with change 0008)
- **Date:** 2026-11-02

## Context

ADR 0003 allows ads only as side rails at ≥ 1600 px. Most visitors arrive on phones and laptops under
1600 px, so almost no one would see an ad. The product owner wants every world to reserve space for one
or two banners. The layout should hold that space from the start so ads can go live later without a
redesign or layout shift.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| Keep rails ≥ 1600 only | Cleanest UI | Little to no revenue on most screens |
| Reserved slot per band, at column or dock foot (chosen) | Revenue on every band, CLS 0, stage untouched | Slightly less room for tools; mobile banner in sim view |
| Overlay / sticky bottom banner | Highest viewability | Covers the controls, causes layout shift, against PLAN principle 5 |

## Decision

- ≥ 1600 px wide and ≥ 700 px tall: two 160 × 600 rails outside the console (unchanged); shorter screens fall back to the box.
- 1024–1599 px: one 300 × 250 box fixed at the foot of the right column or dock.
- < 1024 px with a tall screen: one 320 × 50 banner at the foot of the dock, below its content.
- Phones held sideways (≤ 520 px tall): no slot.
- Never over or inside the stage, between the stage and the transport, or in popovers. Never for Premium users.
  Consent and lazy loading as in ADR 0003.

## Consequences

- PLAN.md principle 5 changes from "side rails only" to "reserved slots away from the stage".
- DESIGN.md → Layout and features/ads.md describe the slots; every world console must render them.
- Mobile banner impact gets watched once analytics exist; it can be removed without a layout change
  (the dock just grows by 50 px).
