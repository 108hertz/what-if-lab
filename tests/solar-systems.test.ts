import { describe, expect, it } from "vitest";
import { solar } from "@/worlds/solar/sim";
import { SYSTEMS } from "@/worlds/solar/data";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { whatIfsFor, worldSay } from "@/lib/sim/say";

/** Change 0037: the solar world runs any of the known star systems. */
const params = (sys: string) => ({ ...defaultParams(solar), sys }) as Parameters<typeof solar.init>[0];

describe("solar star systems", () => {
  it("the default is the Solar System, and its run is exactly what it was before systems existed", () => {
    expect(defaultParams(solar).sys).toBe("sol");
    // Readouts recorded before change 0037: 3 s at the default speed, the what-if, then 20 s more
    const run = (id: string | null) => {
      const e = new SimEngine(solar, defaultParams(solar));
      for (let i = 0; i < 90; i++) e.tick(1 / 30);
      if (id) e.change(id);
      for (let i = 0; i < 600; i++) e.tick(1 / 30);
      return { r: e.readouts(), n: (e.alt ?? e.base).log.length };
    };
    const none = run(null).r.base;
    expect(none.dist).toBeCloseTo(0.999661325667827, 10);
    expect(none.year).toBeCloseTo(365.14014816331814, 8);
    const gold: Record<string, [number, number, number]> = {
      giant: [3.331788856650948, 1447.6198722984695, 3], bh: [1.0033186113243957, 358.7435186678185, 4], mars: [1.5235090071118222, 686.9007193885673, 1],
    };
    for (const [id, [dist, year, n]] of Object.entries(gold)) {
      const { r, n: events } = run(id);
      expect(r.alt!.dist, id).toBeCloseTo(dist, 8);
      expect(r.alt!.year, id).toBeCloseTo(year, 6);
      expect(events, id).toBe(n);
    }
  });

  // 100 years of the watched planet, or 10 Earth years where that is longer (55 Cancri e: 5,000 of its 18-hour years)
  it.each(SYSTEMS.map((s) => s.id))("%s stays stable for 100 years of its watched planet (at most 10 Earth years)", (sys) => {
    const p = params(sys), w = solar.init(p, 1), r0 = solar.read(w, p), T = Math.min(100 * (r0.year! / 365.25), 10);
    for (let i = 0; i < 1000; i++) solar.step(w, T / 1000, p);
    const r1 = solar.read(w, p);
    expect(w.log, sys).toEqual([]);
    expect(w.b.length, sys).toBe(SYSTEMS.find((s) => s.id === sys)!.stars.length + SYSTEMS.find((s) => s.id === sys)!.planets.length);
    expect(Math.abs(r1.dist! / r0.dist! - 1), sys).toBeLessThan(0.05);
  });

  it.each(SYSTEMS.map((s) => s.id))("%s: every what-if it offers runs with finite readouts", (sys) => {
    const p = params(sys);
    for (const [id] of whatIfsFor(solar, p)) {
      const e = new SimEngine(solar, p);
      for (let i = 0; i < 30; i++) e.tick(1 / 30);
      e.change(id);
      for (let i = 0; i < 120; i++) e.tick(1 / 30);
      const { alt } = e.readouts();
      for (const v of Object.values(alt!)) if (v != null) expect(Number.isFinite(v), `${sys}/${id}`).toBe(true);
      expect((e.alt!.log.length), `${sys}/${id} says what happened`).toBeGreaterThan(0);
    }
  });

  it("names the watched planet and hides 'ignites' where there is no giant planet", () => {
    const say = (sys: string) => worldSay(solar, params(sys));
    expect(say("sol")("whatif.stop")).toBe("Earth stops in its orbit");
    expect(say("trappist")("whatif.stop")).toBe("TRAPPIST-1 e stops in its orbit");
    expect(say("kepler16")("whatif.sun2")).toBe("Both stars double in mass");
    expect(say("cancri")("whatif.jupstar")).toBe("55 Cancri d ignites into a star");
    expect(say("alphacen")("metric.temp.label")).toBe("Earth temperature");
    for (const sys of ["trappist", "proxima", "kepler11", "alphacen"]) expect(whatIfsFor(solar, params(sys)).map(([id]) => id), sys).not.toContain("jupstar");
    expect(whatIfsFor(solar, params("sol"))).toEqual(solar.whatifs);
  });

  it("starts each system at a speed that suits it, and back on reset", () => {
    const e = new SimEngine(solar, defaultParams(solar));
    expect(e.speed).toBe(0.5);
    e.setParam("sys", "trappist");
    expect(e.speed).toBe(1 / 365);
    e.reset();
    expect(e.speed).toBe(0.5);
  });
});
