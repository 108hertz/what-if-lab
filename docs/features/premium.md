# Premium ($15 / year)

- **Status:** planned (Phase 3)
- **Tier:** premium
- **Owner area:** `lib/premium/` (new, framework-free), `components/Premium*.tsx`, third-party (Lemon Squeezy)
- **Changes:** —
- **Decision:** [ADR 0002](../decisions/0002-payments-and-premium-unlock.md)

## What it is

A yearly subscription that removes ads and unlocks power-user tools. Bought through a hosted checkout;
unlocked in the browser with a license key. No account required.

## Why

Recurring revenue from the most engaged visitors, while keeping the free product complete.

## What Premium unlocks

| Feature | Free | Premium |
| --- | --- | --- |
| All worlds, all what-ifs, share links | ✓ | ✓ |
| Ads | side rails | **none** |
| Parallel worlds | 1 baseline + 1 what-if | baseline + **up to 4** what-ifs |
| Monte-Carlo outcome ranges (N seeds, p10–p90 bands) | — | ✓ |
| Timeline scrubbing / replay | — | ✓ |
| Saved scenarios (local, named) | 3 | unlimited |
| Export chart PNG / sim GIF / metrics CSV | PNG with watermark | all, no watermark |
| New worlds | when released | 2 weeks early |

## Behaviour

- **Purchase:** "Go Premium" → provider overlay checkout ($15/yr, local taxes added by provider).
- **Activate:** key arrives via redirect hash (`/premium/activate#key=…`) or pasted by the user.
  Browser activates the key against the provider's public license API with a random per-device
  instance ID. Keys never go in query strings or analytics.
- **Persist:** `{ status, expiresAt, lastValidated, instanceId }` in `localStorage` (`wil.premium`).
- **Re-validate:** at most every 7 days, in the background. Offline → keep last state until
  `expiresAt + 14 days`.
- **Expired / refunded / cancelled:** gracefully revert to free on next validation; saved scenarios
  beyond 3 remain readable but not editable.
- **Manage:** link to the provider's customer portal; "Remove from this device" deactivates instance.
- The premium state module (`lib/premium`) exposes `isPremium()` and a subscribe hook; nothing in
  `lib/sim` depends on it — gating happens in components.

## Out of scope (v1)

Accounts, cross-device sync, lifetime plans, regional pricing, team/classroom licenses (future change).

## Acceptance checks

- [ ] Test-mode purchase unlocks Premium and hides ad rails without reload.
- [ ] Reload keeps Premium; clearing storage + re-entering key restores it.
- [ ] Cancelled test subscription reverts to free after validation.
- [ ] No license key appears in URL query, logs, or analytics payloads.
