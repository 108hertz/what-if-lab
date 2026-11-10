# 0032 — About, Privacy policy and Terms of use pages

- **Status:** shipped
- **Phase:** 2 · 3 (see [PLAN.md](../PLAN.md))
- **Features:** [site pages](../features/site-pages.md) (new), [SEO and growth](../features/seo-and-growth.md)
- **Decisions:** [ADR 0011](../decisions/0011-analytics-consent-bot-protection.md), [ADR 0010](../decisions/0010-languages-urls-and-messages.md)
- **Created:** 2026-11-10 · **Shipped:** 2026-11-10

## Why

People who find a clip on Instagram or TikTok should be able to find the project, and the project's accounts from the
site. Analytics with consent (change 0027) and, later, ads and Premium need a privacy policy and terms of use.

## Scope

**In:**
- Three static pages in every ready language: `/about`, `/privacy`, `/terms` (and `/<lang>/…`), in the sitemap with
  hreflang, own titles/descriptions.
- **About:** what What-If Lab is (a rule-based simulator, not a forecast — the disclaimer's words), the worlds with links,
  how it works in three lines, "Follow us" with **Instagram** and **TikTok** buttons, a contact email.
  `Organization` JSON-LD with `sameAs` = the two profile URLs (helps search engines link site and accounts).
- **Privacy policy:** who runs the site; what is collected (Vercel Web Analytics — cookieless, aggregate; GA4 — only
  after Accept; the choice in `localStorage`; theme/language/styles in `localStorage`; Clerk and ads sections marked "when turned on"); no account data while accounts are off; rights (GDPR / UK / CCPA),
  how to withdraw consent (*Privacy settings*), contact, date of last change.
- **Terms of use:** use of the site; simulations are illustrative models, not advice or forecasts; exported videos may be
  shared with the brand line kept; acceptable use (no scraping/abuse); Premium terms (placeholder section until sales
  start); liability limits; changes; governing law; contact.
- A **site menu** in the nav (small "i" icon, every page): About · Privacy · Terms · Privacy settings (when 0027 ships) ·
  Instagram · TikTok. Consoles keep no footer (one viewport); the pages themselves have a short footer with the same links.
- `lib/site.ts` (new): `SITE = { instagram, tiktok, email, operator, country }` — **placeholders** until you fill them in;
  a value starting `TODO_` counts as not set (see Log).

**Out:** a contact form (no backend), a blog, cookie-by-cookie tables beyond the services listed, legal review
(see Risks).

## Design

- Routes: `app/(en)/about|privacy|terms/page.tsx` and `app/[lang]/…`, each a server component rendering
  `components/pages/DocPage.tsx` (new) — a readable text page in the Control Room style (`control-room-ui`):
  max 68ch column, Barlow body, mono section labels, normal page scroll (these are documents, not consoles), nav on top.
- Words: `lib/i18n/locales/<code>/pages.json` (`about.*`, `privacy.*`, `terms.*`), all 20 languages through the catalogs.
  Legal pages in other languages show a line "The English version is the one that applies" with a link.
- Sitemap: `sitemapEntries([... MODES, "/about", "/privacy", "/terms"])`.
- Social icons: two inline SVG glyphs added to `components/ui/Icon` (simple generic shapes, labelled "Instagram" /
  "TikTok"); links open in a new tab with `rel="noopener me"`.

## Steps

1. `lib/site.ts` + placeholder test; `DocPage`; routes; sitemap; site menu in the nav.
2. About page (EN) + JSON-LD.
3. Privacy policy and Terms (EN).
4. 20 languages; `?pseudo` check; feature doc `site-pages.md`; PLAN.md.

## What you (the owner) need to do

- Give the Instagram and TikTok profile URLs, a contact email, and who runs the site (name or company, country) —
  they go into `lib/site.ts`.
- Have the Privacy policy and Terms looked at by someone qualified before Premium or ads go live. I'll write sensible
  drafts that match what the site really does, but they aren't legal advice.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Legal text wrong for your country | Drafts match the actual setup; owner review; English governs |
| Machine translations of legal text | Marked as drafts like the other 19 languages; English version link on every page |
| Placeholders shipped | Test fails the build while any `TODO_` remains in `lib/site.ts` |
| Policy drifts from reality when services change | Feature docs for analytics/ads/premium link to the policy; changing a service means updating it |

## Verification

- [x] Automated: routes built for every language; sitemap lists them; i18n catalogs complete; placeholder handling.
- [ ] Manual: site menu on a world and the pages ✓; /privacy 1024 px dark ✓; /ar/about 375 px RTL light + dark ✓.
      Not yet: 1680 px, social links (placeholders).
- [ ] Rich results test for the Organization JSON-LD.

## Log

- 2026-11-10 — proposed.
- 2026-11-10 — approved; in progress.
- 2026-11-10 — shipped. Differences from the plan: placeholders don't fail the build (that would block every deploy until
  the owner fills them in); instead they're hidden gracefully — no social buttons, "contact coming soon", operator shown as
  "the What-If Lab team" — and the site test prints what's left. The site menu is a "…" button at the end of the bar
  (not an "i", which the simulation label already uses). Words live in a separate `pages` namespace, outside `SHARED_NS`,
  so the long text only reaches the pre-rendered HTML. The theme toggle on these pages loads in the browser only (it reads
  the page's theme on first render).
- 2026-11-10 — contact email and Instagram (what.if.we.try) / TikTok (@what.if.we.try.this) filled in; profile picture
  exported from the favicon to `docs/brand/` (square, no rounded corners, mark inside the circle crop). Operator and country
  still placeholders.
