# 0038 — Galaxy world: pick the galaxies, compare their sizes

- **Status:** proposed
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [Space catalogues](../features/space-catalogues.md)
- **Decisions:** —
- **Created:** 2026-11-10 · **Shipped:** —
- **Depends on:** [0036 space camera](./0036-space-camera-3d.md)

## Why

"What if the Milky Way hit IC 1101?" "How big is Andromeda compared to us?" Today the world is always the
Milky Way meeting Andromeda. Choosing both galaxies from real ones, with their sizes side by side, answers
those questions and gives the world many more starting points.

## Scope

**In:**
- Two pickers in "Starting world": **Our galaxy** (default Milky Way) and **Incoming galaxy** (default
  Andromeda), from `worlds/galaxy/data.ts`. Rounded real values; estimates vary and say so:

| Galaxy | Type | Diameter | Stars | Mass (incl. dark matter) |
| --- | --- | --- | --- | --- |
| Milky Way | barred spiral | ~100,000 ly | 100–400 billion | ~1.5 trillion M☉ |
| Andromeda (M31) | spiral | ~150,000–220,000 ly | ~1 trillion | ~1.5 trillion M☉ |
| Triangulum (M33) | spiral | ~60,000 ly | ~40 billion | ~50 billion M☉ |
| Large Magellanic Cloud | irregular dwarf | ~14,000 ly | ~30 billion | ~140 billion M☉ |
| Small Magellanic Cloud | irregular dwarf | ~7,000 ly | ~7 billion | ~7 billion M☉ |
| Whirlpool (M51) | spiral | ~76,000 ly | ~160 billion | ~160 billion M☉ |
| Pinwheel (M101) | spiral | ~170,000 ly | ~1 trillion | ~1 trillion M☉ |
| Sombrero (M104) | spiral / lenticular | ~50,000 ly | ~100 billion | ~800 billion M☉ |
| M87 | giant elliptical | ~120,000 ly (halo far larger) | ~1 trillion | ~6 trillion M☉ (+ 6.5 billion M☉ black hole) |
| IC 1101 | supergiant elliptical | ~2–4 million ly | ~100 trillion | ~100 trillion M☉ |

- The pickers set the starting params (mass ratio, disc size, shape spiral/elliptical, star share within the
  4,000-star budget). The existing sliders stay and are pre-filled by the pick, so people can still tweak.
  "Andromeda mass" becomes "Incoming galaxy mass" and names follow the pick in event lines.
- **Compare sizes** panel: diameter bars on a log scale (a dwarf vs IC 1101 spans ~300×), with stars and mass,
  the two picked galaxies highlighted.
- Sim scaling: the sim's units stay (Milky Way mass = 1, 40 kly). Extreme ratios are capped for stability and
  the cap is shown ("IC 1101 drawn at 20× the Milky Way's mass — the real ratio, ~70×, would swallow us
  instantly"). Star counts are shares of the budget, never real counts.

**Out:** "universes" (there is only one observable universe — the scale explorer at /scale covers that zoom);
galaxy groups as presets (the "galaxies fall in" what-if already covers groups); new what-if pages per pair.

## Design

`data.ts`: `GALAXIES: { id, kind: "spiral" | "elliptical" | "irregular", dkly, starsB, massT, bh? }`.
`P.ours`, `P.them` (select, restart). `onParamChange()` copies the picked galaxy's values into `mass`, `shape`
and a new `rsize` (disc scale). `init()` reads them; irregulars are drawn as a clumpy disc without arms
(draw-only, hash-based). Event words use `{name}` refs to `gal.<id>` messages. Default pair reproduces today's
world exactly (tests check the default run is unchanged).

## Steps

1. `data.ts`, pickers, `onParamChange`, `init()` scaling + tests (default run identical; each galaxy as
   "incoming" × each what-if runs, finite metrics).
2. Names in event lines and labels; irregular look.
3. Compare-sizes panel (shared block with 0037 if the shapes match; else per world).
4. i18n extract + locales; docs.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Huge mass ratios blow up the integrator | Cap at 20×, softening scales with mass, stated in the panel. |
| Disc size vs 4,000-star budget: small galaxies look sparse | Stars split by mass share with a floor of 200. |
| Default world drifts | Test: default params give the same metrics as before this change. |

## Verification

- [ ] Automated: default unchanged; every incoming galaxy × every what-if.
- [ ] Manual: pickers, compare panel, 375 / 1024 / 1600 px, light + dark.
- [ ] Docs.

## Log

- 2026-11-10 — proposed.
