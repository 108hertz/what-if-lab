# 0026 — Boot scene: the world assembles from light before the console opens

- **Status:** shipped
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [Boot scene](../features/boot-scene.md) (new)
- **Decisions:** none. This is a scoped exception to [ADR 0009](../decisions/0009-control-room-design-system.md), recorded in DESIGN.md.
- **Created:** 2026-11-09 · **Shipped:** 2026-11-09

## Why

The lab runs on the client only, so a hard load shows nothing (or, before the last fix, the static intro text) until the
JavaScript arrives. That gap is the visitor's first impression, and they usually arrive cold from search or a shared
link. We replace it with a short **boot scene**: sparks of light gather, sync and lock into the silhouette of the world
being opened. The silhouette then forks into a blue half and an amber half, and the scene opens onto the real console.
The scene should feel like an experiment powering up. It previews the product's core promise (one world, forked), and
its first paint is earlier than anything the React bundle can draw.

The tone is an original sci-fi "memory sync" energy. It does not reuse any game's marks, type, sounds or layouts.

## Decisions taken with the user (2026-11-09)

- **Timing:** a short beat. The scene plays for at least ~0.8 s, even on fast loads. On a repeat visit it ends as soon as
  the console is ready. Any tap or key skips it.
- **Energy:** full. The scene uses glow (additive light), light streaks and a shimmer sweep across the whole screen. This is
  the **only** surface where DESIGN.md's "no glow / no sci-fi costume" ban is lifted. The console itself stays flat
  Control Room.
- **Content:** each page assembles into its own world: a spiral, orbits, a fjord horizon and so on, as listed below.

## Scope

**In:**
- A full-viewport boot overlay on every lab page (`/`, `/lab/*`, every language). It is plain HTML plus one small inline script
  (≈ 4 KB), so it paints before the React bundle.
- Seven world silhouettes plus the scale ring for `/`. Each world picks its shape in its own `meta.ts`.
- The hand-off: the console sends a "ready" signal, the scene plays its fork-and-open finish, and the overlay is removed.
- Reduced motion, no-JS, slow-load, load-failure and phone layouts.
- One new message (`shell.boot.starting`) in all 20 languages.
- DESIGN.md: a "Boot scene" section that records the exception.

**Out:**
- Transitions between worlds inside the app. Client navigation is already instant, so the scene shows on a full page load only.
- Sound.
- A progress percentage. We can't measure real progress, and a fake number would break "a simulator, not a show".
- Changing the console's look, the stage, or any world's sim.

## Design

### Sequence (in the visitor's theme; dark shown)

| Time | What happens |
| --- | --- |
| 0 ms (first paint) | Stage-black screen. A field of ~260 sparks fades in and twinkles, with short light streaks drifting inward. The world name (condensed Label) and "Starting the world" (Barlow, ink-2) sit at the bottom centre. |
| 120–650 ms | **Sync:** each spark flies to its point on the world's silhouette along an eased curve, leaving a fading streak. The sparks are signal teal and light is additive, so dense areas bloom. A thin ring pulses once at the centre when ~90 % have arrived. |
| still loading | **Hold:** the finished silhouette breathes (slow twinkle, an occasional resync streak). It never fakes progress. |
| ready, and the sparks are home (≈ 0.8 s; repeat visits run the scene 2.2× faster, ≈ 0.36 s) | **Fork:** a shimmer sweeps left → right. Sparks it passes tint either no-change blue or what-if amber, so the shape splits into its two channels (the signature ● / ◆ move). Over 250 ms the overlay then fades and scales the sparks up slightly, revealing the live console underneath. |
| tap / key at any time | Jumps to the fork finish (or to the hold, if the console isn't ready yet). |

### World silhouettes (each world picks one in `meta.ts`: `boot: "spiral"` …)

| Page | Shape |
| --- | --- |
| `/` scale | Concentric rings shrinking toward a centre point, like a zoom |
| galaxy | Two-armed logarithmic spiral with a dense core |
| solar | A sun with four tilted elliptical orbits and a planet dot on each |
| earth | A mountain ridge and fjord waterline, with a sun above |
| country | A street of little figures (head + body), taller from poorest to richest |
| animals | Three to five blob outlines of different sizes |
| child | 120 dots in a fan of growing-up paths |
| person | A 10 × 10 grid of 100 versions, with a few paths branching off |

Points come from parametric shapes plus a deterministic hash, never `Math.random()`, so every load looks the same.

### Architecture

- `lib/boot/shapes.ts`: the shapes as pure functions (`(n, w, h) → points`), keyed by shape name. Shared code: it knows
  shapes, not worlds.
- `lib/boot/script.ts`: builds the inline script (canvas, sequence, hold, finish, skip, failsafe) from one self-contained
  function plus JSON arguments (shape, first visit or repeat).
- `components/shell/BootScene.tsx` (server component): `<div class="boot" aria-hidden>` with a canvas, the world name and
  the line in the page's language (`pageT`), plus the inline script. It is rendered by `LabPage` beside `PageIntro`.
- `components/shell/Lab.tsx`: once the console's first frame is drawn, it sends a `lab:ready` event. The script waits for it.
- `worlds/*/meta.ts` + `WorldMeta.boot?`: each world names its shape. The scale page uses `rings`.
- `app/globals.css`: `.boot` fixed over the viewport on `--stage`, shown only under `:root[data-js]`. Text uses the
  Control Room type voices. Reduced-motion rules.
- The overlay sits above the console, so the console mounts and lays out underneath it: no layout shift and no delay.
  Once it has faded out, the overlay is removed from the DOM.

### States

- **No JS:** the overlay never shows. The static PageIntro is visible, as now.
- **Reduced motion:** no flying, streaks or shimmer. The silhouette appears in place (half blue, half amber) and fades
  out in 150 ms as soon as the console is ready, with no minimum time.
- **Slow load:** the scene holds and breathes. After 8 s the line changes to "Still starting…".
- **Load failure** (no ready signal after 15 s, or the chunk errors): the overlay fades out and `data-js` is removed, so
  the static PageIntro, with its links, shows instead of a dead screen.
- **Phone:** the silhouette fits the shorter side with 16 px gutters. The spark count drops to ~140 below 600 px.
  The canvas uses DPR ≤ 2.
- **Hidden tab:** the scene pauses and the minimum-time clock stops.

## Steps

1. `lib/boot/shapes.ts` + tests (every shape returns n finite points inside the box; deterministic).
2. `lib/boot/script.ts` + `BootScene.tsx` + CSS. Wire it into `LabPage`, and add `boot` to `WorldMeta` and every `meta.ts`.
3. Send the `lab:ready` signal from `Lab.tsx`. Add the failsafe and skip.
4. `shell.boot.starting` / `shell.boot.slow` in all 20 locales.
5. DESIGN.md "Boot scene" section and the feature doc. Verify at 375 / 768 / 1440 in both themes, with reduced motion,
   no JS and slow 3G.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| The scene is in the way of repeat visitors | No minimum time on repeat visits, skip on any input, and 250 ms to fade out. |
| LCP / INP budget | It is a fixed overlay with text that paints first, so LCP happens earlier, not later. The inline script is ≈ 4 KB and stops at hand-off. |
| The glow spreads into the console | The exception is written into DESIGN.md as boot-only. The control-room-ui rule stays the same for everything else. |
| Photosensitivity | Nothing flashes more than 3 times a second. There are no full-screen white flashes, and light peaks below full brightness. |
| Inline script and the no-secrets / no-server rules | The script is static, has no network calls and holds no data. It is built at export time. |

## Verification

- [x] Automated: `tests/boot.test.ts` (shapes self-contained and deterministic, every world names a shape, the script parses); the i18n catalog test covers the new keys. The minified script from `out/` was parsed and run end to end.
- [ ] Manual: hard reload of `/`, `/lab/galaxy` and `/de/lab/earth` at 375, 768 and 1440 px, in light and dark. Check reduced
  motion, JS off (PageIntro shows), slow 3G (the scene holds, then hands off) and skip by tap or key.
- [x] Docs: DESIGN.md section, `docs/features/boot-scene.md`, a row in the changes README.

## Log

- 2026-11-09 — proposed. Timing, energy and content were decided with the user.
- 2026-11-09 — approved and shipped. Changes from the plan: on repeat visits the scene plays 2.2× faster instead of
  having no minimum (with none, the fork fired before any spark moved). The fork lasts ≈ 0.55 s so the blue/amber split
  can be seen. The street became spaced figures, because 100 dots read as a single curve on phones. Checked in the
  browser at 1024 and 375 px (galaxy, earth, country, solar). Reduced motion and slow 3G are not checked by hand yet.
- 2026-11-09 — follow-up: the scene follows the visitor's theme. Day shift uses `--bg` and the light tokens, painted
  plainly (additive light washes out on a pale ground, multiply builds up to black). Alongside it, a first-visit tip under
  the theme button says dark is the default and light is one click away (`ThemeToggle.tsx`, `shell.theme.tip`).
