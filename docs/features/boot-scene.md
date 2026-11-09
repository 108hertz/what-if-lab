# Boot scene

- **Status:** live
- **Tier:** free
- **Owner area:** `components/shell`, `lib/boot`
- **Changes:** [0026](../changes/0026-boot-scene.md)

## What it is

The moment between opening a lab page and the console appearing. Sparks of light gather into the shape of the world
being opened (a spiral for galaxies, orbits for the solar system, a fjord for Earth, a street of people for countries,
creatures for animals, growing-up paths for the child, a 10 × 10 grid for the person, zoom rings for `/`). Then a
shimmer forks the shape into the no-change blue and what-if amber halves and fades onto the live console.

## Why

The lab runs on the client only, so a hard load used to show nothing. The first impression for a cold visitor from
search or a shared link should already feel like the product and preview its promise: one world, forked.

## Behaviour

- Plain HTML plus a small inline script (`lib/boot/script.ts`) inside `BootScene` (rendered by `LabPage`). It paints
  before the React bundle and covers the console while it mounts underneath, so there is no layout shift.
- The console signals ready (`window.__labReady`, the `lab:ready` event) two frames after the shell mounts.
- First visit: sparks are home after 0.8 s, and the fork starts once they are home and the console is ready. Repeat
  visits (`localStorage.boot`) play the same scene 2.2× faster. A tap or key skips it.
- Slow load: the shape breathes. After 8 s the line says "Still starting…". After 15 s with no console, the overlay
  steps aside and the static PageIntro (with links) shows.
- Reduced motion: the forked shape is drawn once without motion and fades in 150 ms when ready.
- No JavaScript: never shown (`:root[data-js]`); the PageIntro is the page.
- Full page loads only: client navigation between worlds is instant and keeps `data-booted`.
- Theme: dark (graphite) by default, glowing on `--stage`. With day shift saved, the overlay is `--bg` with the light
  tokens' teal, blue and amber, painted without additive light.
- Phones: 140 sparks (260 from 600 px), canvas DPR ≤ 2, the shape fits with 16 px gutters.

## Out of scope

Sound, a progress number, transitions between worlds inside the app.

## Acceptance checks

- [x] Every world names a shape. The shapes are deterministic and self-contained, and the script parses (`tests/boot.test.ts`).
- [x] `/lab/galaxy`, `/lab/earth`, `/lab/country`: sparks assemble, then fork and hand off (1024 px and 375 px).
- [ ] Reduced motion and slow 3G checked by hand in a real browser.
