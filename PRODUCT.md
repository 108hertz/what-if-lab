# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Primary: the curious general public.** Someone who arrives from search or a shared link carrying a
  "what happens if…" question, plays with a live world for a few minutes, and shares the result. Often on
  a phone, often first-time, with no instructions read.
- **Secondary (confirmed): students and teachers.** Teachers project or embed a world to show cause and
  effect; students explore it for homework or in class. Design for the public visitor first, without
  breaking classroom and embed use.

## Product Purpose

What-If Lab is a semi-simulator for "what happens if…" experiments. A scale explorer (proton →
observable universe) is the front door; objects with a sandbox open a live, running world. Success is
traffic (organic search and shares), funded by side-rail ads, with optional Premium at US$15/year.

## Positioning

**Fork and compare is the core promise.** A what-if forks the running world at that exact moment; the
stage shows the changed world while the unchanged one keeps running alongside, with a chart and timeline
showing where they diverge. Every change can be ticked off and on again, and Reset starts clean. The two
worlds go side by side only in an export (change 0024).
Everything is rule-based and deterministic: same params + seed + what-if + fork time ⇒ the same future on
every device. No AI, no live or scraped data. The scale explorer brings people in; the fork is the payoff
every surface should lead toward.

## Operating Context

- Entry is usually cold: a search result for a specific question, or a shared scenario link that must
  reproduce exactly what the sharer saw.
- Seven worlds today: galaxy, solar system, earth climate, country economy, animals (evolution), child
  development, person (habit). Time units differ per world.
- Working screens are one-viewport consoles (no page scroll); phones get a dock layout.
- Teachers use projection and planned `/embed/…` pages with minimal chrome and no ads.

## Capabilities and Constraints

- Static export only; no backend, API route, server action or client-side secret without a superseding
  ADR. Accounts and the yearly Premium plan via Clerk (hosted sign-in and checkout), checked in the browser (ADR 0008).
- Free is genuinely complete: every world and every what-if is free. Premium removes ads and adds power
  tools (video and slide exports today; more parallel what-ifs, outcome ranges, scrubbing, saved scenarios later); it never paywalls
  the fork-and-compare moment.
- Ads live only in side rails at ≥ 1280 px, never over or near the stage, never cause layout shift,
  never for Premium.
- Core Web Vitals targets: LCP < 2.0 s, CLS 0, INP < 200 ms on mid-range mobile.
- Terminology: "world"/"sandbox", "what-if", "fork", "no-change world" vs "what-if world".
- Open: hosting (Cloudflare Pages vs Vercel); sales tax handling for Clerk Billing (not merchant of record).

## Brand Commitments

- Name and wordmark: **WHAT-IF LAB**.
- Voice: short, curious, plain. What-ifs are phrased as questions ("What if the Moon disappeared?").
  Buttons are verbs. No exclamation marks in chrome.
- Visual authority is the Control Room design system in `DESIGN.md` (ADR
  `docs/decisions/0009-control-room-design-system.md`); this file does not restate it.

## Evidence on Hand

- Real, working simulations for all seven worlds, covered by a deterministic test suite (`tests/`).
- Planning record: `docs/PLAN.md`, feature specs in `docs/features/`, changes in `docs/changes/`, ADRs
  in `docs/decisions/`.
- No users, testimonials, press, traffic figures or Premium buyers yet. Do not fabricate any.

## Product Principles

1. **A simulator, not a chatbot.** Variable changes produce deterministic, rule-based outcomes; never
   imply AI, prediction or live data.
2. **The fork is the moment.** Every surface shortens the path from arriving with a question to seeing
   two worlds diverge.
3. **Free is genuinely great.** Monetisation never touches the stage or the core comparison.
4. **Shareable and reproducible.** What one visitor saw, the next visitor sees exactly.
5. **The simulation is the object.** Calm, clear, fast; tools stay on one screen.

## Accessibility & Inclusion

- WCAG AA baseline as already blocking in the design system: ≥ 44 px targets, ≥ 4.5:1 text contrast,
  full keyboard path with visible focus, `prefers-reduced-motion` respected, no sideways zoom.
- **Kid-friendly (confirmed):** copy and content must suit younger students, roughly age 10+. Plain
  reading level, explain units and terms, and keep world content (e.g. country, child, person) free of
  material unsuitable for that age.
