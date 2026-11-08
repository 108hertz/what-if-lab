# Product plan

_Last updated: 2026-11-02_

## Goal

Make What-If Lab the go-to place on the web for "what happens if…" questions — and a site people
share. Success = **traffic** (organic search + shares), funded by **side-rail ads**, with an optional
**Premium** plan at **US$15 / year**.

## Principles (non-negotiable)

1. **A simulator, not a chatbot.** Pure variable changes → deterministic, rule-based outcomes. No AI, no
   scraped/live data. Same params + seed + what-if + fork time ⇒ same result, on every device.
2. **No backend of our own.** The site is a static export (HTML/JS/CSS on a CDN). The only third-party
   services are for **payments**, **(optional) accounts**, **ads** and **privacy-friendly analytics**.
   See [ADR 0001](./decisions/0001-static-site-no-backend.md) and
   [ADR 0002](./decisions/0002-payments-and-premium-unlock.md), superseded for accounts/billing by
   [ADR 0008](./decisions/0008-accounts-and-billing-clerk.md) (Clerk, checked in the browser).
3. **Control Room experience.** Calm, clear, fast. The simulation is the object; every tool is on one screen.
   See [DESIGN.md](../DESIGN.md).
4. **Free is genuinely great.** Every world and every what-if is free. Premium removes ads and adds
   power-user depth; it never paywalls the core "fork and compare" moment that drives sharing.
5. **Ads never touch the simulation.** Ads live in reserved slots away from the stage (rails, column
   foot, under the dock), never over or beside the stage, never cause layout shift, and never appear for
   Premium users. See [ADR 0003](./decisions/0003-advertising.md) and [ADR 0007](./decisions/0007-ad-slots-per-world.md).

## Business model

| Tier | Price | What you get |
| --- | --- | --- |
| Free | $0 | All worlds, all what-ifs, scale explorer, share links. Ads in reserved slots away from the stage. |
| Premium | $15 / year | No ads · up to 4 parallel what-ifs · Monte-Carlo outcome ranges · timeline scrubbing/replay · saved scenarios · export studio (video in four sizes, pictures, subtitles/caption/story text, slides PDF; your own text, fonts, colours, picture grade and length — built; GIF, CSV later) · early access to new worlds |

Feature specs: [ads](./features/ads.md), [premium](./features/premium.md).

## Traffic strategy (summary)

Full spec: [features/seo-and-growth.md](./features/seo-and-growth.md).

- **One indexable page per what-if** ("What if the Sun were twice as massive?") with static explanatory
  text, an OG image and the live sim embedded. Long-tail search is the main growth lever.
- **Shareable scenario URLs** that reproduce exactly what the sharer saw.
- **Core Web Vitals green** (static export, canvas lazily started, ads reserved-space).
- **Embeds** (`/embed/...`) for teachers and bloggers, with a "Open in What-If Lab" link back.

## Roadmap

Each item gets a change doc in [`changes/`](./changes/) before work starts.

### Phase 0 — Foundations _(now)_
- [x] Sim engine, 7 worlds, scale explorer, tests
- [x] Docs, planning process, Claude skills
- [ ] Static export + hosting ([ADR 0001](./decisions/0001-static-site-no-backend.md)) — change 0002
- [ ] Privacy-friendly analytics (cookieless) — change 0002

### Phase 1 — Darkroom UI
- [x] Design tokens, themes, typography, icons — [change 0003](./changes/0003-darkroom-visual-language.md)
- [x] Single-screen console, dock on phones, darkroom-only design system — [change 0004](./changes/0004-single-screen-console.md)
- [x] Worlds as separate projects, ad slots reserved in every world — [change 0008](./changes/0008-worlds-as-projects.md)
- [ ] Per-world excellence pass, one world at a time (solar → earth → animals → country → galaxy → child → person); done: earth (0014), solar/galaxy stacking (0015), country (0016), animals ([0017](./changes/0017-animals-living-ecosystem.md)), child ([0018](./changes/0018-child-growing-up.md), second pass [0019](./changes/0019-child-characters-second-pass.md))
- [x] Full-screen stage in every world (`F`) — [change 0013](./changes/0013-full-screen-stage.md)
- [x] Control Room design system replaces Darkroom (simulator look: palette, fonts, components, two channels) — [change 0023](./changes/0023-control-room-design-system.md)
- [x] One world on every stage, every change on a tick list, Reset everything; side by side only in exports — [change 0024](./changes/0024-one-world-tick-changes-reset.md)
- [ ] Motion system, reduced-motion, keyboard shortcuts (Space play/pause; fork needs a key other than F, now full screen)

### Phase 2 — Traffic
- [ ] Shareable scenario URLs (params + what-if + fork time + seed in the hash)
- [ ] Per-what-if landing pages, sitemap, structured data, OG images
- [ ] Embeds
- [ ] More worlds (cities, biomes, history scenarios)

### Phase 3 — Revenue
- [ ] Consent management + side-rail ads ([ADR 0003](./decisions/0003-advertising.md))
- [x] Accounts + Premium checkout with Clerk, no ads for Premium ([ADR 0008](./decisions/0008-accounts-and-billing-clerk.md), [change 0020](./changes/0020-accounts-premium-exports.md)); goes live when the Clerk key is set
- [x] Premium exports: phone video, YouTube video, slides ([change 0020](./changes/0020-accounts-premium-exports.md))
- [x] Export studio: styled video, pictures, text and slides; text placement, fonts, colours, grade, length ([change 0022](./changes/0022-export-studio.md))
- [ ] Premium features: multi what-if, Monte-Carlo, scrubbing, saved scenarios

### Phase 4 — Scale
- [ ] Web Worker + OffscreenCanvas engine
- [x] Languages: 20, all text in the repo, first 5 (drafts, native review open) in [change 0025](./changes/0025-languages-base-and-seo.md) ([ADR 0010](./decisions/0010-languages-urls-and-messages.md))

## Open questions

- Sales tax / VAT: Clerk Billing is not merchant of record (ADR 0008). Confirm Stripe Tax or a merchant of record before live keys.
- Hosting: Cloudflare Pages vs Vercel — both fine for a static export; pick on analytics/CDN cost.
