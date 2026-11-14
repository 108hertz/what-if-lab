# 0038 — Galaxy world: pick the galaxies, compare their sizes

- **Status:** in-progress
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

### As built (2026-11-11): where it differs from the plan above

- **Picking either galaxy starts over** (the select's `fresh`, from 0037), like the star-system picker: re-running a long
  session would freeze the page. A pick pre-fills **Incoming galaxy mass** (now 0.05–20 × our galaxy), a new **Incoming
  galaxy size** (0.3–2.5 ×) and **Incoming galaxy's shape** (now with Irregular); the sliders still tweak them.
- **Everything is relative to our galaxy**: our core weighs 1 and our disc has scale 1. The incoming disc scale is
  √(diameter ratio), Andromeda kept at the Milky Way's scale as the world always drew it (its bright disc). The length unit
  follows our galaxy (`lyScale` = diameter / 100 kly), so the scale bar and "Separation" read true for another "ours" (the
  LMC: a 14,000 ly bar).
- **Masses**: data uses Milky Way 1.25 and Andromeda 1.5 trillion M☉ (both within published ranges) so the default ratio
  stays 1.2. Ratios beyond 1/20…20 are capped and "Compare sizes" says so ("IC 1101 is drawn at 20×… really about 80×").
- **Stability**: a bigger or smaller incoming disc gets star softening scaled with it (`Core.e2` = 0.01 · size²).
- **Stars**: equal shares while the masses are within 2× (so the default stays 900 + 900), else the heavier gets more,
  at least 200 each, total unchanged.
- **Irregulars** (the Magellanic Clouds): no bulge and an even spread of stars (a sim change for irregulars only), drawn
  without arms, light gathered in five slowly turning star-forming clumps and a faint centre (draw-only, hashed).
- **Names**: event lines carry `{them}` / `{ours}` refs to `gal.<id>` ("The Whirlpool Galaxy is closing in…"); what-ifs that
  name Andromeda or the Milky Way are reworded through `reword()` only for other picks, so the default words and the
  what-if question pages stay as they are. "Milkomeda" is said only for the Milky Way + Andromeda; other pairs "merge into
  one giant elliptical galaxy".
- **Compare sizes** is its own small component per world (`worlds/galaxy/Compare.tsx`, the solar one's styles): a row picks
  the incoming galaxy, our galaxy is tagged "Ours", star and mass counts use the language's compact numbers ("250 billion").

## Steps

1. [x] `data.ts`, pickers, `onParamChange`, `init()` scaling + tests (default run identical; each galaxy as
   "incoming" × each what-if runs, finite metrics).
2. [x] Names in event lines and labels; irregular look.
3. [x] Compare-sizes panel (shared block with 0037 if the shapes match; else per world).
4. [x] i18n extract + locales; docs.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Huge mass ratios blow up the integrator | Cap at 20×, softening scales with mass, stated in the panel. |
| Disc size vs 4,000-star budget: small galaxies look sparse | Stars split by mass share with a floor of 200. |
| Default world drifts | Test: default params give the same metrics as before this change. |

## Verification

- [x] Automated: default unchanged (readouts, star positions and event keys byte-identical to a run recorded before the
      change, now pinned in `tests/galaxy-catalogue.test.ts`); every incoming galaxy × every what-if; every galaxy as ours.
- [ ] Manual: checked at 1280×800 (pickers, IC 1101 cap note, reworded what-ifs, Magellanic Clouds' clumpy look, Compare
      sizes) and 375×812 (Compare in the settings sheet, no page scroll). Not yet: 1024 / 1600 px, light theme.
- [ ] `npm run build` (not run: another session's dev server uses `.next`).
- [x] Docs: feature doc, galaxy README, CLAUDE.md.

## Log

- 2026-11-10 — proposed; approved (with 0036).
- 2026-11-11 — built (see "As built"). Waiting on the build and the remaining manual checks.
- 2026-11-12 — phones: the running system/galaxy is a chip on the stage (top left) that opens "Compare sizes" in its own sheet (`pick` option on `StandardConsole` / `PhoneConsole`; the sheet closes once a row picks); the pickers stay in Tune. Checked at 375×812 and 1280×800 (unchanged).
