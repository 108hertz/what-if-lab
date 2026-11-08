import { describe, expect, it } from "vitest";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { eventText } from "@/lib/sim/say";

const FRAME = 1 / 60;

function runFrames(e: SimEngine, frames: number) {
  for (let i = 0; i < frames; i++) e.tick(FRAME);
}

describe.each(SANDBOX_KEYS)("%s sandbox", (key) => {
  const sb = SANDBOXES[key];

  it("produces finite (or null) readouts for baseline and every what-if", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    runFrames(e, 120);
    for (const [id] of sb.whatifs) {
      e.fork(id);
      runFrames(e, 240);
      const { base, alt } = e.readouts();
      for (const m of sb.metrics) {
        for (const v of [base[m.k], alt?.[m.k]]) {
          if (v != null) expect(Number.isFinite(v), `${key}/${id}/${m.k}`).toBe(true);
        }
      }
    }
  });

  it("is deterministic for the same seed", () => {
    const a = new SimEngine(sb, defaultParams(sb), 42);
    const b = new SimEngine(sb, defaultParams(sb), 42);
    runFrames(a, 200);
    runFrames(b, 200);
    expect(a.readouts().base).toEqual(b.readouts().base);
  });

  it("forked worlds start identical to the baseline", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    runFrames(e, 60);
    const clone = structuredClone(e.base);
    expect(sb.read(clone, e.params)).toEqual(sb.read(e.base, e.params));
  });
});

describe("engine", () => {
  it("timeline marks what-if-only events", () => {
    const sb = SANDBOXES.earth;
    const e = new SimEngine(sb, defaultParams(sb));
    e.fork("volcano");
    const items = e.timeline();
    expect(items.some((i) => i.who === "alt" && eventText(sb, i).includes("Supervolcano"))).toBe(true);
  });

  it("country presets update params", () => {
    const sb = SANDBOXES.country;
    const e = new SimEngine(sb, defaultParams(sb));
    e.setParam("preset", "ng");
    expect(e.params.gdp).toBe(1.6);
    e.setParam("gdp", 5);
    expect(e.params.preset).toBe("custom");
    expect(e.params.from).toBe("ng");
  });

  it("animal predators and prey coexist for a long run", () => {
    const sb = SANDBOXES.animals;
    const e = new SimEngine(sb, defaultParams(sb));
    e.speedIdx = 3;
    runFrames(e, 60 * 20); // ~600 sim days
    const r = e.readouts().base;
    expect((r.n0 ?? 0) + (r.n1 ?? 0)).toBeGreaterThan(0);
  });
});
