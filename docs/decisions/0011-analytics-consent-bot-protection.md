# 0011 — Analytics, consent and bot protection

- **Status:** proposed · amends [ADR 0001](./0001-static-site-no-backend.md) ("analytics: cookieless") and makes
  [ADR 0003](./0003-advertising.md)'s CMP concrete
- **Date:** 2026-11-09

## Context

Before ads go live (ADR 0003) the site needs: a consent tool that Google accepts, a way to see traffic, and protection
from bots — invalid traffic on AdSense units can get the account suspended, and scrapers cost bandwidth.

Facts that shape the choice:

- **AdSense does not need Google Analytics.** GA4 only adds reports (and, linked, ad revenue per page). It sets cookies,
  so in the EEA/UK/CH it may run only after consent.
- Since 2024 Google requires a **Google-certified CMP (IAB TCF v2.2)** for ads to EEA/UK/CH visitors, plus
  **Consent Mode v2** for GA. Google's own CMP ("Privacy & messaging" in AdSense) is free, certified, translated, and also
  covers the US state opt-out messages. A home-made banner is not certified ⇒ limited, low-paying ads in Europe.
- The site is hosted on **Vercel**. Vercel's **Hobby plan forbids commercial use** — a site with ads must be on Pro
  (US$20/month) or move. Vercel advises against putting Cloudflare's proxy in front of it (two CDNs, Vercel's firewall
  sees only Cloudflare IPs, cache and preview issues).
- The site is a static export (ADR 0001), so it runs unchanged on Cloudflare (Workers static assets / Pages): free plan
  allows commercial use, unmetered bandwidth, Bot Fight Mode, WAF rules, and free cookieless **Web Analytics**.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| **A. Move hosting to Cloudflare** (DNS + static hosting there) | One vendor for CDN, bots, cookieless analytics; free incl. commercial; no proxy-in-front problems | Move deploys off Vercel (preview deploys per branch exist on Cloudflare too); `VERCEL_PROJECT_PRODUCTION_URL` fallback becomes `NEXT_PUBLIC_SITE_URL` |
| B. Stay on Vercel Pro, use Vercel Firewall (bot protection, attack mode) | No move | US$20/month; bot rules less mature than Cloudflare's; analytics paid extra |
| C. Cloudflare proxy in front of Vercel | Cloudflare bot tools | Not supported well by Vercel; still needs Vercel Pro for ads |

Consent: Google's CMP (certified, no UI of ours) vs. a Control Room-styled banner of our own (not certified ⇒ no
personalised ads in Europe) vs. a paid certified CMP (Cookiebot, Usercentrics: ~€10–50/month, more styling).

## Decision (proposed)

- **Hosting + bots: A — Cloudflare.** Bot Fight Mode on, a WAF rule that challenges known bad bots, cache everything
  static. No Turnstile (we have no forms).
- **Analytics, two layers:** Cloudflare Web Analytics (cookieless, always on, no consent needed) for the honest traffic
  number; **GA4** loaded through **Consent Mode v2 basic** — no Google tag request at all until the visitor accepts.
- **Consent: Google's certified CMP** from AdSense "Privacy & messaging" (GDPR + US states), opened again from a
  "Privacy settings" link. Its look is set in the AdSense UI to the nearest Control Room colours.

## Consequences

- ADR 0001's "cookieless analytics" becomes "cookieless by default; cookie analytics and ads only after consent".
- Needs an AdSense account (and its publisher ID) before the CMP can show; GA4 can start earlier in regions that don't
  need consent only if we accept that — we won't: GA waits for the CMP.
- A privacy & cookies page is required (ADR 0003) and must be translated (change 0025).
- Two public IDs become build-time env vars (`NEXT_PUBLIC_GA_ID`, `NEXT_PUBLIC_ADSENSE_CLIENT`); still no secrets.
- Implemented in [change 0027](../changes/0027-analytics-consent-bot-protection.md).
