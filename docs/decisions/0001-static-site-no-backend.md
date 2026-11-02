# 0001 — Static site, no backend of our own

- **Status:** accepted
- **Date:** 2026-11-02

## Context

The product is a deterministic, rule-based simulator. Every computation already runs in the browser
(`lib/sim` is framework-free TypeScript). The goal is maximum traffic at minimum running cost and
operational burden. A server would add cost, uptime duty, security surface and GDPR scope without
improving the simulation.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| Static export on a CDN (Cloudflare Pages / Vercel / Netlify) | ~free at high traffic, globally fast, nothing to patch, trivially cacheable | No server-side secrets; anything "secret" in the client is visible |
| Next.js server (SSR / API routes) | Server-side entitlement checks, webhooks | Hosting cost scales with traffic, ops burden, contradicts "no backend" |
| Serverless functions only for payments | Secure webhook handling | It *is* a backend; needs secrets management, monitoring |

## Decision

Ship as a **Next.js static export** (`output: "export"`) on a CDN. All simulation, state, saved
scenarios and preferences live in the browser (URL hash + `localStorage`). Third-party hosted services
cover the only things that genuinely need a server: **payments/licensing** (ADR 0002), **ads** (ADR 0003)
and **analytics** (cookieless, script-only).

## Consequences

- `next.config.ts` gets `output: "export"`; no route handlers, no server actions, no `next/image`
  optimisation (use `unoptimized` or pre-sized assets). Dynamic routes must use `generateStaticParams`.
- `public/` must hold `ads.txt`, `robots.txt`, `sitemap.xml` (generated at build time).
- Premium gating is **client-side** and therefore bypassable by a determined user. Accepted: the price
  is low, the audience is broad, and Premium value is convenience + no ads, not secret data.
- Any future need for a server (e.g. accounts sync) requires a new ADR superseding this one.
