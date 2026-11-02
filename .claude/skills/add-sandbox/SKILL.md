---
name: add-sandbox
description: Add a new simulation world (sandbox) to What-If Lab, or add what-ifs/controls to an existing one. Use for "add a world", "new simulation", "add a what-if", "simulate X".
---

# Add a sandbox (world)

A world is pure variable changes → deterministic outcomes. No AI, no network data, no `Math.random()`.

1. **Plan:** run the `plan-change` skill. The change doc must list: variables (controls with ranges and
   units), what-ifs (phrased as questions), metrics, time unit, and the model in 3–6 sentences with its
   main simplifications. Wait for approval.
2. **Implement** following the checklist in `CLAUDE.md` ("Adding a sandbox"):
   - `SandboxKey` in `lib/sim/types.ts`; a new project folder `worlds/<key>/` with `meta.ts`, `sim.ts`
     (`Sandbox<W, P>`), optional `data.ts`, `Console.tsx` and a `README.md` brief; register in
     `worlds/registry.ts`, `worlds/views.tsx` and `worlds/sims.ts`. Import only shared layers
     (`lib/sim`, `components/console`, `components/ui`), never another world.
   - World is plain `structuredClone`-able data. RNG via `rng(w)` / `gauss(w)`. Events via `note()` with
     stable text. `read()` returns finite numbers or `null`. Sub-step in `step()` for stability.
   - `draw()` uses `STAGE` colours and `FONT` from `lib/sim/draw.ts` and the `darkroom-ui` rules: calm,
     legible, base vs what-if clearly distinguished. Add a world glyph to `components/ui/Icon.tsx`.
   - Controls must fit the console's Tune column (see `DESIGN.md` → Layout). A custom `Console.tsx`
     must keep its ad slots (ADR 0007); `tests/structure.test.ts` checks it.
   - Optionally link from `lib/scale/objects.ts`.
3. **Verify:** `npm run typecheck && npm test` (the suite auto-covers every sandbox × what-if). Add a
   behaviour test if the model has a stability property worth guarding (like animals coexistence).
   Open `/lab/<key>` in the browser pane and fork every what-if once.
4. **Document:** add model notes to `CLAUDE.md`, update `docs/features/fork-and-compare.md` world list,
   and close the change doc.
