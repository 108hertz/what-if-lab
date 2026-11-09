# 0030 — "Lost in space" 404 page

- **Status:** shipped (asked for directly by the owner, 2026-11-09)
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** —
- **Decisions:** —
- **Created:** 2026-11-09 · **Shipped:** 2026-11-09

## Why

The 404 page from [0025](./0025-languages-base-and-seo.md) was three plain lines. A visitor who lands on a dead link should still
feel they reached What-If Lab and find the way back at once. The owner asked for a page that recalls the boot scene
([0026](./0026-boot-scene.md)) with an astronaut adrift in empty space.

## Scope

**In:** `app/global-not-found.tsx` redrawn; a full-screen scene in which the boot scene's signal-teal sparks fly in and
form an astronaut on a cut tether, then drift and tumble slowly while far stars slide by and, now and then, a faint meteor
crosses; the title, one line, a primary "Back to the lab" button, the wordmark (home) and the `WHAT-IF LAB · 404` edge label.
**Out:** translated 404 pages (a static host serves one 404.html, so it stays English, as in 0025); any interaction
beyond a slight pointer parallax on the stars.

## Design

- `lib/boot/lost.ts`: `astronaut(n, h)` (outlines of a capsule union, a dense visor, a tether that frays) and `lostScript()`,
  an inline self-contained script like `lib/boot/script.ts`: deterministic (`hash`), theme-aware token colours, no network.
- Motion: sparks arrive with the boot scene's streaks (~1.5 s), then clean frames: a slow bob and sway, a tumble of about two
  minutes a turn, a swaying tether whose cut end dims, stars drifting left with a pointer parallax, one meteor every 9 s
  (never brighter than half the ink-2 colour). Reduced motion: one still frame. No scripts: the words alone on the ground.
- DESIGN.md: the 404 is the second surface allowed the boot scene's glow; nothing else may borrow it.
- Copy: a new key `common.notFound.space` ("Nothing out here but empty space."), drafted in all 20 languages.

## Verification

- [x] Automated: `tests/boot.test.ts` checks the astronaut shape (finite, in the box, deterministic, self-contained) and that the
  script parses with no network and no `Math.random`.
- [x] Manual: the scene at 1440×900 (graphite and day shift), 390×844, 844×390, mid fly-in and after 40 s.
- [x] `npm run build` and a look at `/404.html` in the static export.
