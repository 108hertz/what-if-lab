# 0037 — Solar world: pick a star system, compare their sizes

- **Status:** proposed
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [Space catalogues](../features/space-catalogues.md)
- **Decisions:** —
- **Created:** 2026-11-10 · **Shipped:** —
- **Depends on:** [0036 space camera](./0036-space-camera-3d.md) (zoom is needed: TRAPPIST-1 fits inside Mercury's orbit)

## Why

"What if Earth orbited TRAPPIST-1?" and "what would two suns look like?" are popular questions. Letting people
choose a real system — and see how small or large it is next to ours — turns one world into many, with more
what-if pages to rank for later.

## Scope

**In:**
- A **System** picker (a starting-world control) with known systems, real rounded values (`worlds/solar/data.ts`):

| System | Star(s) | Planets simulated | Size (outermost orbit) | Note |
| --- | --- | --- | --- | --- |
| Solar System (default) | Sun, 1 M☉ | 8 | 30 AU | today's world |
| TRAPPIST-1 | red dwarf, 0.09 M☉ | 7 | 0.062 AU | 7 Earth-size planets, all inside 1/6 of Mercury's orbit |
| Proxima Centauri | red dwarf, 0.12 M☉ | 2 (d, b) | 0.049 AU | nearest star to the Sun |
| Kepler-90 | 1.2 M☉ | 8 | 1.0 AU | the other known 8-planet system |
| Kepler-11 | 0.96 M☉ | 6 | 0.47 AU | six tightly packed planets |
| 55 Cancri A | 0.95 M☉ | 5 | 5.7 AU | a hot "lava world" and a Jupiter at Jupiter-like distance |
| Kepler-16 ("Tatooine") | 0.69 + 0.20 M☉ binary | 1 | 0.70 AU | a planet orbiting two suns |
| Alpha Centauri A + B | 1.08 + 0.91 M☉ binary | — (+ "add Earth") | 23 AU apart | two suns; no confirmed planets, so Earth is placed in A's habitable zone |

- A **Compare sizes** panel (side panel block, opens from the picker): a log-scale bar per system — outermost
  orbit in AU with Mercury / Earth / Neptune reference ticks — plus star mass and planet count. Values marked
  "rounded; estimates vary".
- Metrics follow the system's **watched planet** (Earth in ours; TRAPPIST-1 e, Proxima b, Kepler-16 b, the
  habitable-zone body elsewhere): distance to its star, temperature, length of year. Labels say the planet's name.
- What-ifs become system-neutral where they need to: "The star doubles in mass", "The star disappears",
  "becomes a red giant", "The biggest planet ignites" (hidden if no giant), "A black hole flies through",
  "The watched planet stops", "Move it out by 50 %". Words for the Solar System keep today's wording (and the
  frozen what-if pages from change 0033 are unchanged — they run the default system).
- Every planet and system name through the world's `messages`; `npm run i18n:extract`; 20 locales.

**Out:** planets added in-app beyond "throw"; habitable-zone shading (could be a later nicety); 3D inclinations
beyond the draw-only ones from 0036; new what-if landing pages per system (a 0033 follow-up).

## Design

`data.ts`: `SYSTEMS: { id, stars: {m, L, c, r}[], planets: {n, a, e?, m, c, px, inc?}[], watch, zoom }`.
`P.sys` (select, restarts the world). `init()` builds from the system; binaries get circular mutual orbits
(Alpha Cen uses its real 0.52 eccentricity, period ~80 yr). Step size scales with the shortest period
(TRAPPIST-1 b: 1.5 days → dt cap ≈ period/400), so time speeds also scale: speeds are per system
(`speeds` stays the list, the default per system is picked from the shortest period). `read()` uses
`w.watch` instead of `"Earth"`. Temperature model unchanged (equilibrium + 33 °C greenhouse) and stated as such.

## Steps

1. `data.ts` + `init()` per system + tests (each system stable 100 orbits of its watched planet without the
   what-ifs; each system × each what-if runs, finite metrics — the existing suite covers it once the
   system list is a test matrix).
2. Picker control, watched-planet metrics, system-neutral what-if words.
3. Compare-sizes panel.
4. i18n extract + locales; docs.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| TRAPPIST-1 needs tiny dt: slow | Sub-steps capped by shortest period; 8 bodies is cheap; test the frame time. |
| Binary systems eject planets with some what-ifs | That's a real result; event line explains it. |
| Changing the metric's subject confuses the chart | Metric label names the planet; the chart restarts with the world. |

## Verification

- [ ] Automated: per-system stability + every system × every what-if.
- [ ] Manual: each system at 375 / 1024 / 1600 px; compare panel in light + dark.
- [ ] Docs.

## Log

- 2026-11-10 — proposed.
