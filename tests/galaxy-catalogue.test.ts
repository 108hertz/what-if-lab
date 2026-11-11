import { describe, expect, it } from "vitest";
import { galaxy } from "@/worlds/galaxy/sim";
import { GALAXIES, pairOf } from "@/worlds/galaxy/data";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { eventText, whatIfsFor, worldSay } from "@/lib/sim/say";

/** Change 0038: pick both galaxies from known ones. */
type P = Parameters<typeof galaxy.init>[0];
const picked = (ours: string, them: string): P => galaxy.onParamChange!({ ...defaultParams(galaxy), ours, them } as P, "them");

describe("galaxy catalogue", () => {
  it("the default pair is the Milky Way and Andromeda, and its run is exactly what it was before picks existed", () => {
    const d = defaultParams(galaxy) as P;
    expect([d.ours, d.them]).toEqual(["mw", "m31"]);
    // Picking the default pair again gives the default settings
    expect(picked("mw", "m31")).toEqual(d);
    // Readouts recorded before change 0038: 2 s at 150 Myr/s, the what-if, then 20 s more
    const gold: Record<string, [number, number, number, number]> = {
      none: [74.72222222222223, 12.333333333333334, 1, 3], headon: [85.66666666666667, 2.055555555555556, 1, 4],
      miss: [100, 0, 2, 2], nodm: [8.944444444444443, 88.27777777777777, 1, 4], bh: [65.11111111111111, 22.61111111111111, 1, 4],
      swarm: [63.269841269841265, 18.761904761904763, 1, 7], ring: [64.6875, 16.197916666666668, 1, 6],
      reverse: [100, 0, 2, 2], flipmw: [71.77777777777777, 16.72222222222222, 1, 4],
    };
    for (const [id, [disc, thrown, galaxies, n]] of Object.entries(gold)) {
      const e = new SimEngine(galaxy, d);
      e.speedIdx = 4;
      for (let i = 0; i < 60; i++) e.tick(1 / 30);
      if (id !== "none") e.change(id);
      for (let i = 0; i < 600; i++) e.tick(1 / 30);
      const r = (e.alt ? e.readouts().alt : e.readouts().base)!, w = e.alt ?? e.base;
      expect(r.disc, id).toBeCloseTo(disc, 9);
      expect(r.thrown, id).toBeCloseTo(thrown, 9);
      expect(r.galaxies, id).toBe(galaxies);
      expect(w.log.length, id).toBe(n);
    }
    // and the same words
    const w = galaxy.init(d, 1);
    expect(eventText(galaxy, w.log[0])).toBe("Andromeda is closing in at about 110 km/s");
    expect(worldSay(galaxy, d)("whatif.headon")).toBe("Aim Andromeda dead centre");
  });

  it("a pick fills in mass, size and shape, capping the mass ratio at 20×", () => {
    expect(pairOf("mw", "ic1101")).toMatchObject({ mass: 20, rsize: 2.5, shape: "elliptical", capped: true });
    expect(pairOf("mw", "lmc")).toMatchObject({ mass: 0.1, rsize: 0.4, shape: "irregular", capped: false });
    expect(pairOf("mw", "smc")).toMatchObject({ mass: 0.05, rsize: 0.3, capped: true });
    const e = new SimEngine(galaxy, defaultParams(galaxy));
    e.setParam("them", "m87");
    expect([e.params.mass, e.params.shape]).toEqual([4.8, "elliptical"]);
  });

  it.each(GALAXIES.map((g) => g.id))("%s as the incoming galaxy: every what-if runs with finite readouts", (them) => {
    const p = picked("mw", them);
    for (const [id] of whatIfsFor(galaxy, p)) {
      const e = new SimEngine(galaxy, p);
      e.speedIdx = 4;
      for (let i = 0; i < 20; i++) e.tick(1 / 30);
      e.change(id);
      for (let i = 0; i < 60; i++) e.tick(1 / 30);
      for (const v of Object.values(e.readouts().alt!)) if (v != null) expect(Number.isFinite(v), `${them}/${id}`).toBe(true);
      expect(e.alt!.log.length, `${them}/${id}`).toBeGreaterThan(1);
    }
  });

  it.each(GALAXIES.map((g) => g.id))("%s as our galaxy meets Andromeda with finite readouts", (ours) => {
    const p = picked(ours, "m31"), w = galaxy.init(p, 1);
    for (let i = 0; i < 40; i++) galaxy.step(w, 0.25, p);
    for (const v of Object.values(galaxy.read(w, p))) if (v != null) expect(Number.isFinite(v), ours).toBe(true);
  });

  it("splits the stars by mass share with at least 200 each", () => {
    const n = (p: P) => { const w = galaxy.init(p, 1); return [0, 1].map((o) => w.o.filter((x) => x === o).length); };
    expect(n(defaultParams(galaxy) as P)).toEqual([900, 900]);
    const [ours, them] = n(picked("mw", "ic1101"));
    expect(ours + them).toBe(1800);
    expect(ours).toBeGreaterThanOrEqual(200);
    expect(them).toBeGreaterThan(ours);
  });

  it("names the picked galaxies in event lines and what-ifs", () => {
    const p = picked("lmc", "m51"), w = galaxy.init(p, 1);
    expect(eventText(galaxy, w.log[0])).toBe("The Whirlpool Galaxy is closing in at about 110 km/s");
    const say = worldSay(galaxy, p);
    expect(say("whatif.stop")).toBe("Stop the Whirlpool Galaxy dead");
    expect(say("whatif.flipmw")).toBe("Spin the Large Magellanic Cloud the other way");
    expect(say("whatif.nodm")).toBe("Dark matter vanishes");
  });
});
