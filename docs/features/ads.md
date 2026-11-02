# Side-rail ads

- **Status:** planned (Phase 3)
- **Tier:** free only
- **Owner area:** `components/AdRail.tsx` (new), `app/layout.tsx`, `public/ads.txt`, third-party (AdSense + CMP)
- **Changes:** —
- **Decision:** [ADR 0003](../decisions/0003-advertising.md)

## What it is

Vertical ad units in the left and right gutters of wide screens, funding the free tier.

## Why

Revenue scales with traffic without a paywall. Must not reduce traffic by hurting UX or speed.

## Behaviour

- Shown only when viewport ≥ 1600 px (change 0004: the console needs the width below that) **and** user is not Premium **and** consent state allows
  (personalised or non-personalised per CMP answer).
- Shell becomes `rail (160–300 px) | console | rail`. Rails are **sticky** within the
  viewport and have **reserved fixed dimensions** → CLS = 0.
- Ad script injected after the first sim frame via `requestIdleCallback`; never on the critical path.
- Empty rail (dev, no-fill, ad-blocker, Premium) shows nothing — or a subtle "Go ad-free · $15/yr" card
  styled per the design language (at most one, never animated).
- Never: over/inside the stage, inside sheets/modals, in embeds (`/embed/*`), on mobile sim view,
  interstitials, sticky bottom banners, auto-refresh faster than network policy allows.
- One below-the-fold unit allowed on long-form what-if article pages only.

## Out of scope

Native/sponsored content, affiliate links, video ads.

## Acceptance checks

- [ ] Lighthouse CLS stays 0 with ads on and off.
- [ ] No ad network requests for Premium or before consent (check Network panel).
- [ ] At 1599 px wide: no rails. At 1600 px: rails visible, console still fits without page scroll.
- [ ] `ads.txt` served at `/ads.txt`.
