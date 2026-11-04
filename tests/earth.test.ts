import { describe, expect, it } from "vitest";
import { earth } from "@/worlds/earth/sim";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";

type P = Parameters<typeof earth.init>[0];
const params = (over: Partial<P> = {}) => ({ ...defaultParams(earth), ...over }) as P;

function run(p: P, years: number, whatif?: string) {
  const w = earth.init(p, 1);
  if (whatif) earth.apply(w, whatif, p, { drag: null, cams: [null, null], pending: null });
  for (let y = 0; y < years; y++) earth.step(w, 1, p);
  return { w, r: earth.read(w, p) };
}

describe("earth model (change 0014)", () => {
  it("defaults stay close to the pre-0014 curve to 2100", () => {
    // Pre-0014 model, default params: [year offset, warming °C, sea m]
    const old: [number, number, number][] = [[0, 1.264, 0], [25, 1.614, 0.123], [50, 1.905, 0.273], [75, 2.101, 0.447]];
    for (const [y, T, S] of old) {
      const { r } = run(params(), y);
      // Pollution haze fading with emissions adds up to ~0.2 °C by 2100 (logged in change 0014)
      expect(Math.abs(r.temp! - T), `T at +${y}`).toBeLessThan(0.2);
      expect(Math.abs(r.sea! - S), `sea at +${y}`).toBeLessThan(0.05);
    }
  });

  it("today's town has full snow and dry houses", () => {
    const { r } = run(params(), 0);
    expect(r.snow).toBeCloseTo(100, 0);
    expect(r.flood).toBe(0);
  });

  it("build my own future uses the settings at the fork, not later ones", () => {
    const p = params({ mEm: -100, mYrs: 10, mDac: 10 });
    const e = new SimEngine(earth, p);
    e.fork("mix");
    e.setParam("mEm", 100); // live: must not change the running what-if
    for (let i = 0; i < 600; i++) e.tick(1 / 60);
    const { base, alt } = e.readouts();
    expect(alt!.co2!).toBeLessThan(base.co2!);
  });

  it("a sea wall keeps the town dry where it would otherwise flood", () => {
    const p = params({ front: 0.5, path: "grow" });
    const open = run(p, 120).r.flood!;
    const walled = run(p, 120, "seawall").r.flood!;
    expect(open).toBeGreaterThan(0);
    expect(walled).toBeLessThan(open);
  });

  it("cutting methane cools compared with no change", () => {
    expect(run(params(), 60, "methane").r.temp!).toBeLessThan(run(params(), 60).r.temp!);
  });
});
