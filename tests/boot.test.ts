import { describe, expect, it } from "vitest";
import { SHAPES, hash, type BootShape } from "@/lib/boot/shapes";
import { bootScript } from "@/lib/boot/script";
import { astronaut, lostScript } from "@/lib/boot/lost";
import { WORLDS } from "@/worlds/registry";

// Change 0026: the boot scene ships its shapes as source, so each must work on its own (no outer names).
const standalone = <F>(fn: F): F => new Function(`return (${String(fn)})`)() as F;

describe("boot shapes", () => {
  for (const [name, fn] of Object.entries(SHAPES)) {
    it(`${name}: n finite points in the box, the same every time, self-contained`, () => {
      const h = standalone(hash);
      for (const n of [140, 260]) {
        const pts = standalone(fn)(n, h);
        expect(pts).toHaveLength(n * 2);
        for (const v of pts) { expect(Number.isFinite(v)).toBe(true); expect(Math.abs(v)).toBeLessThanOrEqual(1.05); }
        expect(fn(n, hash)).toEqual(pts);
      }
    });
  }
});

describe("boot script", () => {
  it("every world names a shape", () => {
    for (const m of Object.values(WORLDS)) expect(Object.keys(SHAPES)).toContain(m.boot);
  });
  it("parses as one self-contained script for every shape", () => {
    for (const s of Object.keys(SHAPES) as BootShape[]) {
      const src = bootScript(s, { slow: "Still starting…" });
      expect(() => new Function(src)).not.toThrow();
      expect(src).not.toMatch(/fetch\(|XMLHttpRequest|import\(/);
    }
  });
});

// Change 0030: the 404 page reuses the boot scene's sparks; its astronaut and script ship as source too.
describe("404 scene", () => {
  it("astronaut: n finite points in the box, the same every time, self-contained", () => {
    const h = standalone(hash);
    for (const n of [230, 420]) {
      const pts = standalone(astronaut)(n, h);
      expect(pts).toHaveLength(n * 2);
      for (const v of pts) { expect(Number.isFinite(v)).toBe(true); expect(Math.abs(v)).toBeLessThanOrEqual(1.05); }
      expect(astronaut(n, hash)).toEqual(pts);
    }
  });
  it("parses as one self-contained script with no network", () => {
    const src = lostScript();
    expect(() => new Function(src)).not.toThrow();
    expect(src).not.toMatch(/fetch\(|XMLHttpRequest|import\(|Math\.random/);
  });
});
