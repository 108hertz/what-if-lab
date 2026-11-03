# Scale explorer (home)

- **Status:** live
- **Tier:** free
- **Owner area:** `lib/scale` (renderers in `lib/scale/glyphs/`), `components/scale/`, `app/page.tsx`
- **Changes:** [0004](../changes/0004-single-screen-console.md) (one-screen layout, hero overlay), [0012](../changes/0012-scale-realistic-objects.md) (true-to-life objects with motion)

## What it is

The home screen: a continuous zoom from a proton to the observable universe. Objects that have a
sandbox glow and open that world (optionally with a preset, e.g. `country:japan`).

## Why

The "wow" first impression and the hub that routes visitors into worlds. Drives time-on-site and shares.

## Behaviour

- Slider, wheel and pinch zoom; each slider step = ×10.
- Side panel shows the object in view, a one-line fact, and "Open this sandbox" when linked.
- Lists of worlds and jump-to targets.
- Objects are defined in `lib/scale/objects.ts` (`sandbox: "<key>"` or `"<key>:<preset>"`); each has an
  `id` that picks its own renderer in `lib/scale/glyphs/`.
- Every object is drawn procedurally to its real proportions and colours: animals and people as shaded
  silhouettes at true length or height, buildings with their real profiles, planets as lit, rotating
  spheres, distances as measured bars with light travelling along them.
- Each object has one slow motion loop that explains it (planets turn, microbes and animals move,
  light crosses the light-year). Under `prefers-reduced-motion` objects hold a still pose; zoom easing stays.
- Hovering a world-linked object brightens it over 150 ms. Labels of objects under ~40 px fade out.

## Out of scope

Real astronomical imagery; everything is drawn procedurally.

## Acceptance checks

- [x] Zoom works by slider, wheel and pinch.
- [x] Every `sandbox` link resolves to a registered sandbox.
- [x] Every object has a renderer that draws at any size and moment (`tests/scale.test.ts`).
