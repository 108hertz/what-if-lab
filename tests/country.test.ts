import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { COUNTRIES, COUNTRY_OPTIONS } from "@/worlds/country/data";
import { story } from "@/worlds/country/sim";

const FRAME = 1 / 60;
const run = (e: SimEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(FRAME); };
const sb = SANDBOXES.country;

describe("countries world (change 0016)", () => {
  it("has 40+ countries, every one in the picker", () => {
    expect(Object.keys(COUNTRIES).length).toBeGreaterThanOrEqual(40);
    for (const id of Object.keys(COUNTRIES)) expect(COUNTRY_OPTIONS.some(([v]) => v === id), id).toBe(true);
  });

  it.each(Object.keys(COUNTRIES))("%s starts with finite, plausible readouts", (id) => {
    const e = new SimEngine(sb, defaultParams(sb));
    e.setParam("preset", id);
    e.restart();
    run(e, 60);
    const r = e.readouts().base;
    for (const m of sb.metrics) expect(Number.isFinite(r[m.k]!), `${id} ${m.k}`).toBe(true);
    expect(r.pov!).toBeGreaterThanOrEqual(0);
    expect(r.pov!).toBeLessThanOrEqual(100);
    expect(r.gap!).toBeGreaterThan(1);
    expect(r.life!).toBeGreaterThan(40);
  });

  it("rich countries have fewer poor people than poor countries", () => {
    const at = (id: string) => { const e = new SimEngine(sb, defaultParams(sb)); e.setParam("preset", id); e.restart(); run(e, 60); return e.readouts().base; };
    const dk = at("dk"), ng = at("ng"), us = at("us"), ind = at("in");
    expect(dk.pov!).toBeLessThan(ng.pov!);
    expect(us.fam!).toBeGreaterThan(ind.fam!);
    expect(dk.pov!).toBeLessThan(25);
    expect(ng.pov!).toBeGreaterThan(40);
  });

  it("Denmark with no change stays calm and grows slowly for 50 years", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    const f0 = e.readouts().base.fam!;
    e.speedIdx = 3;
    run(e, 60 * 7); // ~56 years
    const r = e.readouts().base;
    expect(r.calm!).toBeGreaterThan(55);
    expect(r.fam! / f0).toBeGreaterThan(1.3);
    expect(r.fam! / f0).toBeLessThan(5);
  });

  it("all 16 policies stacked keep readouts finite for 60 years", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    for (const [id] of sb.whatifs) e.change(id);
    e.speedIdx = 3;
    run(e, 60 * 8);
    const r = e.readouts().alt!;
    for (const m of sb.metrics) expect(Number.isFinite(r[m.k]!), m.k).toBe(true);
  });

  it("policies move the numbers the right way", () => {
    const diff = (id: string, k: string, frames = 60 * 10) => {
      const e = new SimEngine(sb, defaultParams(sb));
      e.setParam("preset", "br"); e.restart();
      run(e, 30); e.change(id); run(e, frames);
      const { base, alt } = e.readouts();
      return alt![k]! - base[k]!;
    };
    expect(diff("ubi", "pov")).toBeLessThan(0);
    expect(diff("health", "life")).toBeGreaterThan(0);
    expect(diff("robots", "jobless", 60 * 3)).toBeGreaterThan(0);
    expect(diff("corr", "gap")).toBeLessThan(0);
    expect(diff("war", "calm")).toBeLessThan(0);
  });

  it("sizes are read at the click", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    e.setParam("s_open", 20);
    expect(e.params.preset).toBe("dk");
    const n = (e.base as unknown as { a: unknown[] }).a.length;
    e.change("open");
    expect((e.alt as unknown as { a: unknown[] }).a.length).toBe(n + 20);
  });

  it("the story speaks in plain sentences", () => {
    const lines = story({ fam: 1000, pov: 20, jobless: 5, life: 70, calm: 60, gap: 8, pop: 10 }, { fam: 1200, pov: 15, jobless: 5, life: 70, calm: 25, gap: 7, pop: 10 }, "2040");
    expect(lines[0]).toContain("2040");
    expect(lines).toContain("Protests fill the streets.");
    expect(lines.some((l) => l.includes("$200 more"))).toBe(true);
    expect(lines.some((l) => l.includes("5 fewer people out of 100 are poor"))).toBe(true);
  });
});
