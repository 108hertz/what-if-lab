# Premium ($15 / year) and accounts

- **Status:** live in code but **switched off for launch** (`ACCOUNTS_ON = false` in `components/account/context.tsx`: Clerk never loads, no account menu, export button or upsell, even with a key or in dev). When on: accounts on once a Clerk publishable key is configured; off otherwise
- **Tier:** premium
- **Owner area:** `components/account/` (state, context, Clerk adapter, menu, Premium sheet), `components/ui/Dialog.tsx`,
  `components/console/AdSlot.tsx`, `components/shell/Lab.tsx`, third-party (Clerk + Clerk Billing, Stripe)
- **Changes:** [0020](../changes/0020-accounts-premium-exports.md)
- **Decision:** [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md) (supersedes the unlock part of [ADR 0002](../decisions/0002-payments-and-premium-unlock.md))

## What it is

A yearly subscription. Visitors create a free account with Clerk and buy Premium in Clerk's checkout, which
opens over the lab. Premium removes the ads and unlocks exports of a run as a phone video, a YouTube video or
slides. The lab stays fully usable without an account.

## Why

Recurring revenue from the most engaged visitors (PLAN.md → Revenue) while the free product stays complete.
Exports also turn what-ifs into shareable clips (traffic).

## What Premium unlocks

| Feature | Free | Premium |
| --- | --- | --- |
| All worlds, all what-ifs, share links | ✓ | ✓ |
| Ads | reserved slots | **none** (slots not rendered) |
| Export: phone video 1080×1920, YouTube video 1920×1080, slides PDF | preview only | ✓ ([exports](./exports.md)) |
| Parallel what-ifs, Monte-Carlo ranges, scrubbing, saved scenarios, early worlds | — | planned (not built) |

## Behaviour (as built)

- **Account states** (`components/account/state.ts`): `off` (no key in the build) · `loading` · `signed-out` ·
  `free` · `premium` · `error` (provider unreachable, blocked, or no answer within 15 s).
- **Entitlement:** `has({ plan: NEXT_PUBLIC_PREMIUM_PLAN })` on the Clerk session, checked in the browser
  (bypassable; accepted in ADR 0008). `isPremium` also covers the dev simulation and the offline grace below.
- **Nav:** an account glyph beside the theme toggle (label + "Premium" from 1600 px). Its popover shows the
  person, the plan and a status line; actions per state: Sign in / Create account / Go Premium · $15 a year
  (signed out), Go Premium / Account settings / Sign out (free), Manage subscription / Account settings / Sign
  out (premium), Try again (error). Arrow keys move, Esc closes and returns focus.
- **Premium sheet** (one calm card, no countdowns): $15 a year · cancel any time, four perks, "Every world and
  every what-if stays free". Its one filled button follows the state: *Create account and continue* →
  *Continue to checkout* → *Back to the lab*. Opened from the account menu, the empty ad slot's "Ad-free with
  Premium · $15/yr" and the export sheet's *Unlock with Premium*.
- **Buying:** signed out → Clerk sign-up modal → checkout drawer opens by itself (`wil.upgrade` in
  sessionStorage survives a social-login redirect) → on success the sheet reopens as "Premium is on".
  Checkout is annual only. Our sheets close and full screen exits before any Clerk window opens.
- **Manage / cancel:** account menu → Manage subscription (Clerk subscription details; falls back to the profile).
  Cancelling ends Premium when Clerk's session says the plan is gone.
- **Ads:** `AdSlot` returns nothing when `isPremium`; the shell drops its ≥ 1600 px rail columns. No ad request
  can exist for subscribers.
- **Offline / provider down:** a device that saw an active subscription keeps Premium for 14 days
  (`wil.premium` in localStorage); a definite free/signed-out answer clears it. Storage access is always guarded.
- **No key (dev, tests, CI, forks):** status `off`, everything free, ads as before. Production builds show no
  account button, no export button and plain-text slot upsell. Dev builds show the account button with a
  **Simulate Premium** switch (`wil.devPremium`, dev only, never in production builds).
- **Secrets:** only the publishable key is read; anything that looks like `sk_…` is refused with a console warning.

## Setup (owner, in the Clerk dashboard)

1. Create a Clerk application (email + any social logins you want).
2. **Billing → enable Billing**, connect Stripe (test mode first). Create a **user plan** with slug `premium`
   (or set `NEXT_PUBLIC_PREMIUM_PLAN` to your slug), annual price **$15**. Clerk also asks for a monthly price;
   the lab only offers annual, so set the monthly price to what you'd accept if someone picks it in Clerk's
   profile page. Add "No ads" and "Exports" as plan features if you like (not required).
3. Copy the **publishable key** into `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (see `.env.example`).
   Optional: `NEXT_PUBLIC_CLERK_PREMIUM_PLAN_ID` (`cplan_…`) skips the plan lookup.
4. For production: a production instance, your domain and Clerk's DNS records; switch Stripe to live; confirm
   tax handling (Clerk is not merchant of record, ADR 0008).

## Out of scope

License keys, lifetime plans, regional pricing, team/classroom licenses, server-side entitlement.

## Acceptance checks

- [x] No key: lab unchanged in production builds; `tests/account.test.ts` → status `off`, free.
- [x] Premium hides every ad slot and the rails (`tests/account.test.ts`; browser check 1680×1050 with Simulate Premium).
- [ ] Test-mode purchase unlocks Premium and hides ads without reload (needs the owner's Clerk app).
- [ ] Cancelled test subscription reverts to free.
- [ ] Offline after a purchase keeps Premium; a definite free answer removes it.
