# 0011 — Analytics and consent

- **Status:** accepted (2026-11-10) · amends [ADR 0001](./0001-static-site-no-backend.md) ("analytics: cookieless") and makes
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

## Decision (proposed, revised 2026-11-10 with the owner)

- **Hosting stays on Vercel; no bot protection layer for now** (owner, 2026-11-10). Cloudflare in front of the domain was
  considered and set aside; revisit before ads (invalid traffic) — options above. While ads are off the Hobby plan is
  fine; turning ads on means Vercel Pro or revisiting option A.
- **Analytics, two layers:** **Vercel Web Analytics** (cookieless, always on, no consent needed) for the honest traffic
  number; **GA4** through **Consent Mode v2 basic** — no Google request until the visitor accepts.
- **Consent, for now: our own Control Room banner** (GA4 only; certification is required for ads, not for analytics).
  When ads turn on it is replaced by Google's certified CMP from AdSense "Privacy & messaging".

## Consequences

- ADR 0001's "cookieless analytics" becomes "cookieless by default; cookie analytics (and later ads) only after consent".
- One new dependency (`@vercel/analytics`) and one public ID (`NEXT_PUBLIC_GA_ID`); still no secrets.
- Privacy policy and terms pages are required and translated (change 0032).
- Implemented in [change 0027](../changes/0027-analytics-consent-bot-protection.md).
