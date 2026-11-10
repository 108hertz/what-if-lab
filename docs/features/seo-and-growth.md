# SEO, sharing and growth

- **Status:** planned (Phase 2)
- **Tier:** free
- **Owner area:** `app/` (routes, metadata, sitemap), `lib/share/` (new), `public/`
- **Changes:** [0025](../changes/0025-languages-base-and-seo.md) (sitemap, robots, canonical, hreflang, static page words), [0033](../changes/0033-search-traffic.md) (what-if pages in 20 languages, previews, structured data, IndexNow — in progress: live checks left)

## What it is

Everything that brings visitors in: indexable pages per what-if, reproducible share links, social
previews, embeds, and fast pages.

## Why

Traffic is the primary goal; it drives both ad revenue and Premium conversions.

## Behaviour

**Shareable scenarios**
- URL hash encodes `world`, changed params (diff from defaults), `seed`, `whatif`, `forkT`, `speed`.
  Opening it replays deterministically to the same state. Hash, not query, so CDNs cache one HTML file.
- "Share" uses the Web Share API on mobile, copy-link elsewhere.

**Per-what-if pages** — `/lab/<world>/<whatif>` (static, `generateStaticParams` from `sandbox.whatifs`)
- Title as a question: "What if the Sun were twice as massive?"
- 150–400 words of static explanation generated from the sandbox's own data (intro, model notes,
  metrics) — written in the sandbox file, not by AI at runtime.
- Live sim auto-forks into that what-if after a short baseline.
- `FAQPage`/`Article` JSON-LD, canonical URL, OG image (pre-rendered at build).

**Technical SEO**
- Built (change 0033, step 1): search titles and descriptions per page in 20 languages (`Sandbox.seo`, `common.site.title`), JSON-LD (`lib/seo/jsonld.ts`: WebSite + Organization on home, WebApplication + BreadcrumbList per world), a shared share card `public/og.png` with `summary_large_image`, `apple-touch-icon.png`, `app/manifest.ts`, sitemap `lastmod`. Step 2: each world shares a picture of its own stage, `public/og/<world>.png`, drawn by `npm run og:images` (redraw when a stage changes). Step 3: `/lab/<world>#whatif=<id>` opens the lab, runs 1.5 s, then makes that what-if as its button would (`lib/sim/deeplink.ts`, applied in `useWorldEngine`). Step 4: each what-if's question and frozen URL slug, `Sandbox.questions` (`question.<id>` in the catalogs, 20 languages; slugs listed in `tests/what-if-slugs.json`). Step 5: each what-if's answer is computed by running the world (`lib/seo/answer.ts`, per-world `Sandbox.answer`: times, metrics, headline metric); numbers and timeline lines, said in the page's language. Step 6: 107 English what-if pages, `/lab/<world>/<slug>` (`components/pages/WhatIfPage.tsx`): question, computed answer, pictures of both worlds (`public/og/<world>/<slug>.jpg`, `no-change.jpg`), "Run this what-if", numbers, steps, related links; `WebPage` + Question + `BreadcrumbList` JSON-LD; in the sitemap; linked from the world intros. Step 7: the same pages in all 20 languages, `/<lang>/lab/<world>/<slug>` (English slugs), with hreflang and `og:locale:alternate` to each other; `WHATIF_PAGE_LOCALES` in `lib/seo/whatifPages.ts` holds a language back. Step 8: IndexNow — `public/<key>.txt` and `scripts/indexnow.mjs`, run as `postbuild` on Vercel production builds, sends the sitemap's URLs to `api.indexnow.org` (Bing, Yandex, Naver, Seznam); it logs and never fails the build.
- Built (change 0025): `app/sitemap.ts` + `app/robots.ts` (origin from `NEXT_PUBLIC_SITE_URL`, else on Vercel the project's production domain `VERCEL_PROJECT_PRODUCTION_URL` via `next.config.ts`), canonical and
  hreflang per language (`lib/i18n/seo.ts`), a static `<h1>`, intro, what-if list and links on every page
  (`PageIntro`) while the client-only lab loads, a shared 404.
- Static export, `sitemap.xml` + `robots.txt` generated at build, descriptive `<title>`/`description`
  per route, real `<h1>`, semantic HTML around the canvas (fallback text for crawlers).
- Core Web Vitals targets: LCP < 2.0 s, CLS 0, INP < 200 ms on mid-range mobile.

**Embeds** — `/embed/<world>?…` minimal chrome, no ads, "Open in What-If Lab" link.

**Analytics** — cookieless (e.g. Plausible / Cloudflare Web Analytics); events: fork, share, premium
click, premium activate. No personal data.

## Out of scope

Comments, user-generated public galleries (would need a backend).

## Acceptance checks

- [x] Every what-if has a page listed in `sitemap.xml`, in every ready language. Earth's "Build my own future" has none by design.
- [ ] Share link opened in a fresh browser shows identical metrics at the same sim time.
- [ ] Lighthouse SEO ≥ 95, Performance ≥ 90 on mobile for `/` and a what-if page.
