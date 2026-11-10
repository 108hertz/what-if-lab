# 0027 — Analytics (Vercel + GA4) and a consent banner

- **Status:** shipped
- **Phase:** 0 · 3 (see [PLAN.md](../PLAN.md))
- **Features:** [analytics and consent](../features/analytics-and-consent.md) (new), [ads](../features/ads.md), [SEO and growth](../features/seo-and-growth.md)
- **Decisions:** [ADR 0011](../decisions/0011-analytics-consent-bot-protection.md) (proposed), [ADR 0003](../decisions/0003-advertising.md)
- **Needs:** [change 0032](./0032-about-privacy-terms.md) (the privacy page the banner links to)
- **Created:** 2026-11-09 · **Revised:** 2026-11-10 · **Shipped:** 2026-11-10

## Why

Traffic is the goal (PLAN.md). We need to see who comes (cookieless numbers for everyone, richer GA4 reports from those
who agree). Ads are still off (`ADS_ON = false`), so this change does not
need AdSense yet.

## Scope

**In:**
- **Hosting stays on Vercel**, unchanged.
- **Vercel Web Analytics** (cookieless, no consent needed) on every page via Vercel's plain script tag (no dependency; see Log).
- **GA4** via Consent Mode v2 **basic**: no request to Google at all until the visitor presses *Accept*.
  Events: `world_open`, `fork`, `change_toggle`, `reset`, `export`, `language`.
- **Our own consent banner** (Control Room look), shown once to every visitor; *Accept* and *Decline* equally weighted;
  choice kept in `localStorage`; *Privacy settings* in the site menu reopens it.
- `.env.example`: `NEXT_PUBLIC_GA_ID`. No ID ⇒ no GA and no banner (dev, previews).

**Out:** Cloudflare / bot protection (left for later, owner's call 2026-11-10), AdSense, its certified CMP and `ads.txt` (they come with the change that turns `ADS_ON` on — the banner is then
replaced by Google's CMP, which ads in Europe require); server-side tagging; geo-targeted banners (a static site can't
tell where the visitor is, so everyone gets it); any analytics inside sims or exports.

## Design

- **`components/privacy/`** (new, shared; nothing in `lib/sim` or `worlds/` imports it — `tests/structure.test.ts`):
  - `config.ts` — reads `NEXT_PUBLIC_GA_ID`.
  - `consent.ts` — pure rules: stored choice (`"granted" | "denied" | null`), version for re-asking when the policy changes.
  - `Consent.tsx` — rendered once by `RootShell`. Sets Consent Mode defaults first (all four storages denied), shows the
    banner when there is no choice, loads `gtag.js` only after *Accept*, sends `consent update`. Loaded after first paint.
  - `ConsentBanner.tsx` — a small panel bottom-left (above the dock on phones), never over the transport; one sentence,
    *Accept*, *Decline*, "Privacy policy" link. No layout shift (fixed position). Esc = no answer yet, asks next visit.
  - `track.ts` — `track(name, params)`; a no-op until GA is loaded. Called from shell/console hooks only.
  - `<Analytics />` from `@vercel/analytics/react` in `RootShell` (it only reports on Vercel deploys).
- **Words** through the catalogs: `lib/i18n/locales/<code>/privacy.json` (banner + settings), all 20 languages.

## Steps

1. ADR 0011 accepted.
2. `@vercel/analytics` in `RootShell`; check `/_vercel/insights/script.js` loads on the preview deploy.
3. `components/privacy/` (config, consent rules, banner, Consent) + tests: no ID ⇒ nothing loads; defaults denied; no
   `googletagmanager.com` request before Accept; Decline remembered.
4. `track()` events wired into the shell/engine hooks; test `track` before consent sends nothing.
5. Banner words in 20 languages; feature doc; PLAN.md boxes; ADR 0001 note.

## What you (the owner) need to do — I can't do these for you

- Vercel: turn on Web Analytics for the project (Project → Analytics → Enable).
- Google Analytics: create a GA4 property → Measurement ID (`G-…`) → set `NEXT_PUBLIC_GA_ID` in Vercel's env vars.
- Before ads: Vercel Hobby doesn't allow commercial use, so ads will need Vercel Pro (US$20/month) or a move.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Banner annoys or covers the sim | Small, bottom-left, once per visitor; never over stage or transport |
| Own banner isn't enough for ads later | Out of scope; the ads change replaces it with Google's certified CMP |
| Analytics changes sim behaviour | Tracking only in shell hooks; structure test forbids `components/privacy` in sims |

## Verification

- [x] Automated: privacy tests (no ID ⇒ no scripts; defaults denied; `track` no-op before consent); i18n catalogs complete.
- [ ] Manual (Network panel): no `google-analytics.com` / `googletagmanager.com` request before Accept ✓; Decline stored ✓;
      *Privacy settings* reopens the banner ✓ (dev, test ID). Not yet: page_view + `fork` in GA DebugView (needs the real ID on Vercel).
- [ ] Manual: Vercel Analytics shows visits (after deploy + enabling it); banner checked at 1024 px dark; other widths not yet.
- [ ] Lighthouse CLS 0, LCP not worse than before.

## Log

- 2026-11-09 — proposed (Cloudflare hosting, Google CMP).
- 2026-11-10 — revised with the owner: stay on Vercel; Cloudflare for domain protection only; Vercel Web Analytics instead of
  Cloudflare's; our own consent banner until ads turn on; privacy page moved to change 0032.
- 2026-11-10 — approved; Cloudflare taken out by the owner (not now). In progress.
- 2026-11-10 — shipped. Differences from the plan: `@vercel/analytics` couldn't be installed (peer-dependency conflict with
  vitest's vite through the package's optional SvelteKit peer), so `components/privacy/VercelAnalytics.tsx` uses Vercel's
  documented plain script, only in Vercel builds. The banner component is `ConsentBanner.tsx` (`consent.ts` holds the
  rules; the two names clash on case-insensitive disks). The banner waits for the first-open simulation note. Rendered by
  `LabPage` and the site pages (they have the i18n provider), not `RootShell`. Events hook the live engine in
  `components/console/engines.ts`.
- 2026-11-10 — GA4 property comes from the owner's Firebase project (`what-if-108hertz`, ID `G-WX6WYV2D6D`). Wired as
  the default ID for Vercel production builds in `next.config.ts` (no Firebase SDK: Firebase Analytics on the web is GA4,
  and the SDK would load Google before consent). Events show in both Firebase Analytics and GA4.
