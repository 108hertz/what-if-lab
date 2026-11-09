# 0027 — Analytics, cookie consent and bot protection (ready for ads)

- **Status:** proposed
- **Phase:** 0 · 3 (see [PLAN.md](../PLAN.md))
- **Features:** [ads](../features/ads.md), [SEO and growth](../features/seo-and-growth.md)
- **Decisions:** [ADR 0011](../decisions/0011-analytics-consent-bot-protection.md) (proposed), [ADR 0003](../decisions/0003-advertising.md)
- **Created:** 2026-11-09 · **Shipped:** —

## Why

Traffic is the goal (PLAN.md) and ads are the revenue. Before AdSense can run we need to know who comes, keep bots
from inflating (and endangering) ad traffic, and ask European/UK/US-state visitors for consent the way Google requires.
This change lays that ground; turning ad units on (`ADS_ON`) is the next change.

## Scope

**In:**
- Move hosting to Cloudflare (static assets), DNS there, Bot Fight Mode + one WAF bad-bot rule (ADR 0011, option A).
- Cloudflare Web Analytics (cookieless) on every page.
- Google's certified CMP (AdSense "Privacy & messaging": GDPR + US states) and a "Privacy settings" link to reopen it.
- GA4 via Consent Mode v2 **basic**: no Google request before consent; events `fork`, `change_toggle`, `reset`,
  `world_open`, `export` (later), `language`.
- Privacy & cookies page (`/privacy`, `/<lang>/privacy`), all 20 languages through the catalogs.
- `public/ads.txt` with the publisher line.

**Out:** filling ad slots / loading the AdSense ad script (`ADS_ON` stays `false`; next change), a custom-styled consent
banner, server-side tagging, any analytics inside sims or exports, Premium-specific analytics.

## Design

- **Hosting.** `wrangler.jsonc` serving `out/` as static assets (`not_found_handling: "404-page"`), build `npm run build`.
  `next.config.ts` keeps `NEXT_PUBLIC_SITE_URL` first; the Vercel fallback stays harmless. Dashboard settings (Bot Fight
  Mode, WAF rule, Web Analytics on) are written down in `docs/hosting.md` since they don't live in the repo.
- **`components/privacy/`** (new, shared):
  - `config.ts` — reads `NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT`; no ID ⇒ that piece is off (dev, previews).
  - `Consent.tsx` — rendered once by `RootShell`. Sets Consent Mode defaults *before* anything else
    (`ad_storage`, `analytics_storage`, `ad_user_data`, `ad_personalization` = denied; EEA/UK/CH wait for the CMP),
    loads the Google CMP script (`fundingchoicesmessages.google.com`, publisher ID) after first paint, and loads `gtag.js`
    only once `analytics_storage` is granted (CMP callback). Never blocks LCP; nothing in `lib/sim` or `worlds/` knows.
  - `track.ts` — `track(name, params)`; a no-op until GA is loaded. Called from the shell/engine hooks, never from a sim.
  - `PrivacyLink.tsx` — "Privacy settings" button calling `googlefc.showRevocationMessage()`; falls back to the
    privacy page if the CMP isn't there.
- **Where the link lives:** the World menu / language menu overflow in the nav (one-viewport consoles keep no footer),
  and on the privacy page. Follows `control-room-ui` (micro text button, signal colour on focus only).
- **Privacy page:** static text in `lib/i18n/locales/<code>/privacy.json`; lists Cloudflare, Google CMP, GA4,
  AdSense (once on), what each stores, and the settings link. Linked from `sitemap.ts`.
- **`.env.example`** gains the two public IDs. CSP is not added in this change.

## Steps

1. ADR 0011 accepted; `wrangler.jsonc`, `docs/hosting.md`; deploy a preview on Cloudflare, check every route + 404.
2. Point DNS to Cloudflare; turn on Bot Fight Mode, WAF rule, Web Analytics (beacon via dashboard auto-inject, no code).
3. `components/privacy/` (config, Consent with defaults + CMP loader, PrivacyLink) + `RootShell` hook; tests that with
   no IDs nothing loads and that the default consent state is "denied".
4. GA4 after consent + `track()` events; test that `track` before consent sends nothing.
5. Privacy page in 20 languages, sitemap entry, `ads.txt`.
6. Docs: feature docs updated, PLAN.md boxes, ADR 0001 note.

## What you (the owner) need to do — I can't do these for you

- Create a Cloudflare account and add the domain; connect the GitHub repo.
- Create a GA4 property → Measurement ID (`G-…`).
- Apply for AdSense (needs the live site + privacy page) → publisher ID (`ca-pub-…`); in AdSense → Privacy & messaging,
  create the GDPR and US-states messages and publish them.
- Decide when to cancel Vercel (after the Cloudflare deploy is verified).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Bot Fight Mode challenges Googlebot or AdSense's crawler | It allows verified bots; check Search Console crawl stats and AdSense "crawler errors" after a week |
| Consent script slows first paint | Loaded after first frame; Lighthouse before/after in Verification |
| CMP doesn't match Control Room | Accepted for certification; colours set in AdSense to nearest tokens |
| AdSense approval delayed ⇒ no CMP ⇒ no GA | Cloudflare Web Analytics gives traffic numbers meanwhile |
| Analytics changes sim behaviour | Tracking only in shell/console hooks; `tests/structure.test.ts` forbids `components/privacy` imports in `lib/sim` / `worlds/*/sim.ts` |

## Verification

- [ ] Automated: privacy tests (no IDs ⇒ no scripts; defaults denied; `track` no-op before consent); i18n catalogs complete.
- [ ] Manual (Network panel): EU visitor (VPN or `?fc=alwaysshow`) sees the CMP; no `google-analytics.com` request before
      Accept; after Accept, page_view + `fork` arrive in GA DebugView; "Privacy settings" reopens the CMP.
- [ ] Manual: every route and deep link on the Cloudflare deploy, 404 page, `/ads.txt`, `/sitemap.xml`; light + dark,
      390 px / 1280 px / 1680 px, privacy link reachable on each.
- [ ] Lighthouse CLS 0, LCP not worse than on Vercel.
- [ ] Docs: ads.md + seo-and-growth.md updated, PLAN.md Phase 0 analytics + Phase 3 consent ticked.

## Log

- 2026-11-09 — proposed.
