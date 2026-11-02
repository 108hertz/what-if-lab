# 0002 — Static export, hosting and cookieless analytics

- **Status:** proposed
- **Phase:** 0
- **Features:** [SEO and growth](../features/seo-and-growth.md)
- **Decisions:** [ADR 0001](../decisions/0001-static-site-no-backend.md)
- **Created:** 2026-11-02 · **Shipped:** —

## Why

Lock in the no-backend architecture before features depend on server behaviour, and get the site live
so it can start being indexed.

## Scope

**In:** `output: "export"`, `public/robots.txt`, build-time `sitemap.xml`, hosting config, analytics
script, 404 page.
**Out:** custom domain purchase, ads, premium.

## Design

- `next.config.ts`: `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`.
- `app/sitemap.ts` + `app/robots.ts` (both export statically).
- Host on Cloudflare Pages or Vercel (decide in this change; record in ADR 0001 consequences).
- Cookieless analytics snippet loaded `afterInteractive`; custom events: `fork`, `share`.

## Steps

1. Enable static export; fix anything that breaks (`npm run build` produces `out/`).
2. Sitemap + robots; 404 page in the design language.
3. Connect repo to host; preview deploys per branch.
4. Analytics + events.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Dynamic route without `generateStaticParams` breaks export | Build fails loudly; already present for `/lab/[world]` |
| Analytics blocked by ad-blockers | Accept; it's directional data |

## Verification

- [ ] `npx serve out` serves every route, including deep links on reload.
- [ ] `/sitemap.xml` lists `/` and every `/lab/<world>/`.

## Log

- 2026-11-02 — proposed.
