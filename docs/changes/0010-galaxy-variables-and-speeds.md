# 0010 — Galaxy world: more variables and more speeds

- **Status:** shipped
- **Phase:** 1 (per-world excellence pass, see [PLAN.md](../PLAN.md))
- **Features:** —
- **Decisions:** —
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

After 0009 the user asked for more variables to change and more speed choices. Today the galaxy world
has three variables (stars, Andromeda mass, dark matter) and four fixed speeds. The most interesting
real questions about a collision are how it is aimed, how fast it comes in, and which way the discs
spin. These decide whether you get long tidal tails, a quick merger or a near miss. A wider speed range
lets you watch the close passage slowly, or skip ahead to the merged galaxy.

## Scope

**In:**
- Three new variables in `worlds/galaxy/sim.ts`. Each one restarts the world, as the current ones do:
  | Variable | Range | Default | What it does |
  | --- | --- | --- | --- |
  | Approach speed | 60–200 km/s, step 10 | 110 | Scales Andromeda's starting speed toward us |
  | Aim off-centre | 0–250 kly, step 10 | 110 (today's path) | How far to the side of our centre Andromeda is aimed |
  | Andromeda spins | "Against ours" / "Same way as ours" | Against ours (today) | Measured: against ours (Andromeda's spin matches its orbit) throws out 12% of stars; same way, 7% |
- Seven speeds for the galaxy world: 5, 10, 25, 50, 150, 400 Myr/s and 1 Gyr/s (default 50 Myr/s). The
  user asked for slower choices, so the range moved down instead of adding 2.5 Gyr/s.
- Shared `Transport`: a world with **more than 4 speeds** gets a compact speed stepper
  (slower · current · faster) in place of the button row, so it fits on phones in one row. Worlds with
  4 speeds (every other world) render exactly as now.
- Minus and plus glyphs in `components/ui/Icon.tsx` if they are not there yet.

**Out:**
- New what-ifs, metrics or physics (the cores and stars move by the same rules).
- Changing speeds in other worlds.
- Live-updating variables. They restart the world, as now.

## Design

- **Defaults reproduce today exactly.** With 110 km/s, 110 kly and "against ours", `init` gives the same
  starting velocities as now (relative speed 0.297 units, perpendicular part 0.1), so the default story
  and tests are unchanged.
- **Aim:** Andromeda's starting velocity points at a spot `b` to the side of the Milky Way's centre:
  angle `asin(b / d)`, where `d` = starting distance. 110 kly ≈ today's 0.343 rad.
- **Spin:** sets Andromeda's `dir` to −1 or +1. The spiral-arm drawing already follows `dir`.
- **Speed stepper:** `Transport` checks `engine.sb.speeds.length > 4`. If so it renders
  `[−] 150 MYR/S [+]` as two 44 px ghost icon buttons around a label, with `aria-label`s "Slower" and
  "Faster", disabled at the ends. Tokens only; no new CSS colours or sizes. Below 768 px the stepper shrinks to
  fit, and when a what-if is open (Close what-if shown) Play/Pause goes icon-only (`.transport.tight`),
  keeping its `aria-label`, so the row still fits at 375 px.

## Steps

1. Variables and spin in `init`; check that defaults give the same starting state (compare `read()`
   and the event log against today's numbers).
2. Seven speeds; the stepper in `Transport`; glyphs.
3. Check every console size from 375×667 to 1440×900 (no page scroll); fork every what-if once with
   each spin setting; check frame time at 2.5 Gyr/s with 1 500 stars.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A shared Transport change alters other worlds | The new path only runs for more than 4 speeds. Check one other world by eye. |
| 2.5 Gyr/s is heavy (many sub-steps per frame) | About 21 sub-steps a frame at 60 fps. Measure it; drop to 2 Gyr/s if it stutters. |
| Six variables crowd the Tune column at 1024–1279 | Measure; the dock panel already scrolls internally. |
| Extreme settings (200 km/s, 250 kly) mean the galaxies never meet | That is a valid answer ("they miss"). The camera eases out to keep both in view. |

## Verification

- [x] Automated: `npm run typecheck && npm test` (55/55). Defaults checked identical to before (starting state and event times).
- [x] Manual: 375×667, 768×1024, 1024×768, 1280×800, 1440×900 with no page scroll; spin switch restarts the world; stepper ends disable; solar keeps 4 buttons. Not done: forking every what-if with each spin by eye; frame time at the new extremes.
- [x] Docs: world README, this doc closed.

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — user asked for slower speeds: step 2 built (speeds 5 Myr/s–1 Gyr/s, default 50 Myr/s,
  stepper). No page scroll and no transport overflow at 375×667 (also forked), 768×1024, 1024×768 and
  1440×900; solar keeps its 4-button row. Variables (step 1) still await approval.
- 2026-11-02 — approved and built step 1. Defaults reproduce the old run exactly. Measured over 3 Gyr
  (seed 20261101): same-way spin 7% thrown out vs 12%; 60 km/s gentle merger (3%); 200 km/s 19%;
  aim 0 merges at 1.1 Gyr with 2%; aim 250 kly merges at 2.1 Gyr; 250 kly at 200 km/s never meets.
  The camera margin was widened slightly so the starting galaxies clear the stage edge. Shipped.
