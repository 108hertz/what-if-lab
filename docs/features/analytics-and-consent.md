# Analytics and consent

- **Status:** live in code; Vercel Web Analytics needs turning on in the Vercel project; GA4 + banner are on in Vercel production builds (the Firebase web app's ID `G-WX6WYV2D6D`, set in `next.config.ts`; `NEXT_PUBLIC_GA_ID` overrides), off in dev and previews
- **Tier:** both
- **Owner area:** `components/privacy/` (config, consent rules, banner, track, Vercel script), `components/console/engines.ts` (events), `components/shell/RootShell.tsx`
- **Changes:** [0027](../changes/0027-analytics-consent-bot-protection.md)
- **Decision:** [ADR 0011](../decisions/0011-analytics-consent-bot-protection.md)

## What it is

Two ways to see who visits: cookieless page counts for everyone (Vercel Web Analytics), and richer Google Analytics
reports only from visitors who press *Accept* on a small banner.

## Why

Traffic is the goal (PLAN.md); we need honest numbers, and to know which worlds and what-ifs people try.

## Behaviour

- **Vercel Web Analytics:** a plain `<script src="/_vercel/insights/script.js">` in every page's head, only in builds on
  Vercel (`VERCEL=1`). No cookies, no consent needed. Turn it on in Vercel → Project → Analytics.
- **Banner** (only when `NEXT_PUBLIC_GA_ID` is a `G-…` ID): bottom-left panel, *Decline* and *Accept* equally weighted,
  link to the privacy policy. Shows once per browser, after the boot scene and after the first-open simulation note is
  closed. Esc hides it until the next visit. Raised above the dock below 1024 px.
- **Choice** kept in `localStorage` as `consent = "<version>:granted|denied"`; raising `CONSENT_VERSION` asks everyone again.
- **Accept:** loads `gtag.js` (Consent Mode v2 basic: before this, nothing is requested from Google), analytics granted,
  ads storage stays denied. **Decline:** nothing loads; if GA was on, it's told "denied" and its `_ga` cookies are removed.
- **Privacy settings** in the site menu (… in the top bar) opens the banner again.
- **Events** (sent only after Accept): `world_open` {world}, `fork` {world, whatif}, `change_toggle` {world, on, all?},
  `reset` {world}, `export` {level, world}, `language` {from, to}. Sims and exports never send anything (structure test).

## Out of scope

Bot protection / Cloudflare (left out by the owner, 2026-11-10), AdSense and Google's certified CMP (the ads change
replaces this banner), geo-targeted banners, Vercel custom events (Pro plan).

## Acceptance checks

- [x] `tests/privacy.test.ts`: GA ID validation, defaults denied, choice stored and versioned, `track` silent before consent,
      `lib/` and `worlds/` never import `components/privacy`.
- [x] Browser (dev, test GA ID, 1024×768): banner after the note; Decline stored, `gtag` undefined, zero Google requests;
      Privacy settings reopens it.
- [ ] With a real GA ID on Vercel: Accept → page_view and `fork` in GA DebugView.
- [ ] Vercel Analytics dashboard shows visits after deploy.
