# SEO, sharing and growth

- **Status:** planned (Phase 2)
- **Tier:** free
- **Owner area:** `app/` (routes, metadata, sitemap), `lib/share/` (new), `public/`
- **Changes:** —

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
- Static export, `sitemap.xml` + `robots.txt` generated at build, descriptive `<title>`/`description`
  per route, real `<h1>`, semantic HTML around the canvas (fallback text for crawlers).
- Core Web Vitals targets: LCP < 2.0 s, CLS 0, INP < 200 ms on mid-range mobile.

**Embeds** — `/embed/<world>?…` minimal chrome, no ads, "Open in What-If Lab" link.

**Analytics** — cookieless (e.g. Plausible / Cloudflare Web Analytics); events: fork, share, premium
click, premium activate. No personal data.

## Out of scope

Comments, user-generated public galleries (would need a backend).

## Acceptance checks

- [ ] Every what-if has a page listed in `sitemap.xml`.
- [ ] Share link opened in a fresh browser shows identical metrics at the same sim time.
- [ ] Lighthouse SEO ≥ 95, Performance ≥ 90 on mobile for `/` and a what-if page.
