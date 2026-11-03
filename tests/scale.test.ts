import { describe, expect, it } from "vitest";
import { SCALE_OBJECTS } from "@/lib/scale/objects";
import { GLYPHS } from "@/lib/scale/glyphs";

/**
 * Change 0012: every scale object has its own renderer, and it draws at any on-screen size and any
 * moment without hitting a canvas error (negative radii throw IndexSizeError in real browsers).
 */
function mockCtx(): CanvasRenderingContext2D {
  const gradient = { addColorStop: () => {} };
  const check = (name: string, ...r: number[]) => {
    for (const v of r) if (!Number.isFinite(v) || v < 0) throw new Error(`${name} radius ${v}`);
  };
  const target: Record<string, unknown> = {
    arc: (_x: number, _y: number, r: number) => check("arc", r),
    ellipse: (_x: number, _y: number, rx: number, ry: number) => check("ellipse", rx, ry),
    roundRect: () => {},
    createLinearGradient: () => gradient,
    createRadialGradient: (_a: number, _b: number, r0: number, _c: number, _d: number, r1: number) => { check("gradient", r0, r1); return gradient; },
    setLineDash: () => {},
  };
  return new Proxy(target, {
    get: (t, k: string) => (k in t ? t[k] : typeof k === "string" && /^[a-z]/.test(k) && !["globalAlpha", "fillStyle", "strokeStyle", "lineWidth", "lineCap", "lineJoin", "lineDashOffset", "globalCompositeOperation", "font", "textAlign"].includes(k) ? () => {} : t[k]),
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

describe("scale objects", () => {
  it("every object has a renderer", () => {
    for (const o of SCALE_OBJECTS) expect(GLYPHS[o.id], o.name).toBeTypeOf("function");
  });

  it.each(SCALE_OBJECTS.map((o) => [o.name, o.id] as const))("%s draws at every size and moment", (_name, id) => {
    const ctx = mockCtx();
    for (const r of [2, 12, 60, 400, 1400]) for (const t of [0, 3.7, 125]) GLYPHS[id]({ ctx, r, t, px: 1 / r, a: 1 });
  });
});
