# 0003 — Advertising: side rails only, consent first

- **Status:** accepted (network choice proposed: Google AdSense to start)
- **Date:** 2026-11-02

## Context

Ads fund the free tier. They must not damage the experience that creates traffic in the first place
(Apple-grade calm UI, fast Core Web Vitals, sims that run at 60 fps). In the EEA/UK/Switzerland, ad
personalisation requires a certified consent management platform (IAB TCF v2.2); some US states require
opt-out handling.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| Google AdSense + Google's certified CMP | Zero minimum traffic, fast approval, built-in CMP | Lower RPM, less layout control |
| Premium networks (Ezoic, Raptive, Mediavine) | Much higher RPM | Traffic minimums (e.g. tens of thousands of monthly sessions), heavier scripts |
| Carbon / EthicalAds (single tasteful unit) | Best fit for a design-focused site, light | Low fill, lower revenue |

## Decision

- Start with **AdSense** (manual ad units, **no Auto ads**) and Google's CMP. Re-evaluate premium
  networks once traffic qualifies.
- **Placement:** two vertical **side rails** (160×600 / 300×600) only on viewports ≥ 1280 px wide, plus
  at most one unit below the fold on long-form what-if article pages. **Never** on the stage, transport,
  inspector, over the canvas, in modals, or on mobile in the sim view.
- **No layout shift:** rails are fixed-size reserved boxes rendered by the layout; the ad fills them.
- **Load after the sim:** the ad script loads on `requestIdleCallback` after first frame, never blocks LCP.
- **Premium users:** the ad script is never requested.

## Consequences

- `public/ads.txt` required; privacy policy + cookie/consent page required before ads go live.
- Layout grows a 3-column shell at ≥1280 px: `rail | content | rail`. The design spec must make empty
  rails look intentional (they will be empty in dev, for Premium, and on no-fill).
- Spec lives in [features/ads.md](../features/ads.md).
