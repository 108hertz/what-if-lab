import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";

const FRAME = 1 / 60;
const run = (e: SimEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(FRAME); };
/** Change 0024: every world stacks its changes into one changed world (change 0015 started it for five of them). */
const STACKING = SANDBOX_KEYS;

describe("stacked changes (changes 0015 and 0024)", () => {
  it.each(STACKING)("%s: two changes equal applying both to one clone", (key) => {
    const sb = SANDBOXES[key];
    const [a, b] = sb.whatifs.map((w) => w[0]);
    const e = new SimEngine(sb, defaultParams(sb));
    run(e, 30);
    const manual = structuredClone(e.base);
    sb.apply(manual, a, e.params, e.ui);
    sb.apply(manual, b, e.params, e.ui);
    e.change(a);
    e.change(b);
    expect(e.applied).toEqual([a, b]);
    expect(sb.read(e.alt!, e.params)).toEqual(sb.read(manual, e.params));
    expect(e.rects(800, 500)).toHaveLength(1);
    expect(e.rects(800, 500)[0].world).toBe(e.alt);
    expect(e.whatIfLabel()).toContain(" + ");
    e.change(a);
    expect(e.whatIfLabel()).toContain("×2");
  });

  it.each(STACKING)("%s: undo all returns to the running no-change world", (key) => {
    const sb = SANDBOXES[key];
    const e = new SimEngine(sb, defaultParams(sb));
    e.change(sb.whatifs[0][0]);
    run(e, 30);
    e.dropFork();
    expect(e.alt).toBeNull();
    expect(e.applied).toEqual([]);
    expect(e.rects(800, 500)[0].world).toBe(e.base);
  });

  it.each(STACKING)("%s: every pair of changes keeps readouts finite", (key) => {
    const sb = SANDBOXES[key];
    const ids = sb.whatifs.map((w) => w[0]);
    const e0 = new SimEngine(sb, defaultParams(sb));
    run(e0, 30);
    for (const a of ids) for (const b of ids) {
      const w = structuredClone(e0.base);
      sb.apply(w, a, e0.params, e0.ui);
      sb.apply(w, b, e0.params, e0.ui);
      for (let i = 0; i < 40; i++) sb.step(w, FRAME * sb.speeds[sb.defaultSpeed][0], e0.params);
      const r = sb.read(w, e0.params);
      for (const m of sb.metrics) if (r[m.k] != null) expect(Number.isFinite(r[m.k]!), `${key} ${a}+${b} ${m.k}`).toBe(true);
    }
  }, 30_000); // the child world has 38 changes: 1,444 pairs

  it("earth and person now stack too: a second pick adds to the first", () => {
    const sb = SANDBOXES.earth;
    const e = new SimEngine(sb, defaultParams(sb));
    e.change("zero");
    e.change("trees");
    expect(e.applied).toEqual(["zero", "trees"]);
    expect(e.rects(800, 500)).toHaveLength(1);
    const p = SANDBOXES.person, q = new SimEngine(p, defaultParams(p));
    q.change("exercise");
    q.change("sleep");
    expect(q.applied).toEqual(["exercise", "sleep"]);
  });
});
