import { describe, expect, it } from "vitest";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { FPS, MAX_RUN_S, MIN_RUN_S, SUB, Replay, clipFrames, keyMoments, planReplay, runToEnd } from "@/lib/export/replay";
import {
  drawChartStill, drawStageStill, drawVideoFrame, paint, slideMoment, slideOutcome, slideSetup, slideTitle, slideWhatIf, type SlideCtx,
} from "@/lib/export/frame";
import { SIZES, SIZE_IDS, defaultStyle, withTheme } from "@/lib/export/style";
import { Scrubber } from "@/lib/export/scrub";
import { exportName } from "@/components/console/export/render";

/** Change 0020: exports re-run the fork deterministically and never touch the live simulation. */
const FRAME = 1 / 60;
const run = (e: SimEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(FRAME); };

/** A do-nothing 2D context, enough for every world's draw() and the export captions to run in Node. */
function fakeCtx(): CanvasRenderingContext2D {
  const grad = { addColorStop() {} };
  const target: Record<string, unknown> = {
    measureText: (s: string) => ({ width: String(s).length * 7, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 }),
    createLinearGradient: () => grad, createRadialGradient: () => grad, createConicGradient: () => grad, createPattern: () => null,
    getImageData: (_x: number, _y: number, w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(Math.max(1, w * h * 4)), width: w, height: h }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    getLineDash: () => [],
    isPointInPath: () => false,
    canvas: { width: 1920, height: 1080 },
  };
  return new Proxy(target, {
    get: (t, k: string) => (k in t ? t[k] : () => undefined),
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

// Worlds cache painted backdrops in offscreen canvases.
(globalThis as Record<string, unknown>).OffscreenCanvas ??= class {
  constructor(public width: number, public height: number) {}
  getContext() { return fakeCtx(); }
};

function forkedEngine(key: (typeof SANDBOX_KEYS)[number]) {
  const sb = SANDBOXES[key];
  const e = new SimEngine(sb, defaultParams(sb));
  run(e, 90);
  e.change(sb.whatifs[0][0]);
  run(e, 60);
  if (sb.stack && sb.whatifs[1]) { e.change(sb.whatifs[1][0]); run(e, 60); }
  return e;
}

describe.each(SANDBOX_KEYS)("%s export", (key) => {
  const sb = SANDBOXES[key];

  it("records where the fork started", () => {
    const e = forkedEngine(key);
    expect(e.origin).not.toBeNull();
    expect(e.origin!.changes.map((c) => c.id)).toEqual(e.applied);
    e.dropFork();
    expect(e.origin).toBeNull();
  });

  it("re-runs the fork the same way every time", () => {
    const plan = planReplay(forkedEngine(key));
    expect(plan.fromFork).toBe(true);
    expect(plan.hasWhatIf).toBe(true);
    expect(plan.steps).toBeGreaterThanOrEqual(1);
    expect(plan.frames).toBeLessThanOrEqual(MAX_RUN_S * FPS);
    expect(plan.steps).toBe(plan.frames * SUB);
    const a = runToEnd(plan), b = runToEnd(planReplay(forkedEngine(key)));
    expect(a.summary.end).toEqual(b.summary.end);
    expect(a.summary.events).toEqual(b.summary.events);
    expect(a.replay.alt).not.toBeNull();
    for (const m of sb.metrics) {
      for (const v of [a.summary.end.base[m.k], a.summary.end.alt?.[m.k]]) if (v != null) expect(Number.isFinite(v), m.k).toBe(true);
    }
  });

  it("never changes the live simulation", () => {
    const a = forkedEngine(key), b = forkedEngine(key);
    runToEnd(planReplay(a));
    run(a, 60); run(b, 60);
    expect(a.readouts()).toEqual(b.readouts());
    expect(a.timeline()).toEqual(b.timeline());
  });

  it("starts from now when there is no what-if", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    run(e, 30);
    const plan = planReplay(e);
    expect(plan.hasWhatIf).toBe(false);
    expect(plan.label).toBe("");
    const { replay } = runToEnd(plan);
    expect(replay.alt).toBeNull();
    expect(plan.frames).toBeGreaterThanOrEqual(Math.min(MIN_RUN_S * FPS, 1));
  });

  it("draws every size, frame kind, still and slide without throwing, styled or not", () => {
    const plan = planReplay(forkedEngine(key));
    const scrub = new Scrubber(plan);
    const a = scrub.finish();
    const { summary } = a;
    const ctx = fakeCtx();
    const styled = { ...withTheme(defaultStyle("phone"), "paper"), grade: { brightness: 0.2, contrast: 0.1, saturation: -0.3, warmth: 0.4, hue: 20, vignette: 0.5 } };
    for (const size of SIZE_IDS) {
      for (const style of [defaultStyle(size), { ...styled, size }, { ...defaultStyle(size), clean: true, layout: { split: "alt" as const, stage: "fill" as const, chart: true, hud: false, cards: false } }]) {
        for (const f of [0, plan.intro + 1, plan.intro + Math.floor(plan.frames / 2), clipFrames(plan) - 1]) {
          const r = scrub.at(f);
          paint(style, () => drawVideoFrame(ctx, style, r, { world: sb.name, summary, samples: a.samples }, f));
        }
        paint(style, () => { drawStageStill(ctx, style, scrub.at(clipFrames(plan) - 1)); drawChartStill(ctx, style, plan, { world: sb.name, summary }, a.samples); });
      }
      expect(SIZES[size].W / SIZES[size].w).toBe(2);
    }
    const moments = keyMoments(plan, summary.events, 4);
    expect(moments.length).toBeGreaterThanOrEqual(3);
    expect(moments.length).toBeLessThanOrEqual(5);
    expect(moments[moments.length - 1]).toBe(plan.steps);
    expect([...moments].sort((x, y) => x - y)).toEqual(moments);
    const s = (i: number): SlideCtx => ({ world: sb.name, intro: sb.intro, plan, summary, samples: a.samples, index: i, total: 8 });
    const r = new Replay(plan);
    paint(styled, () => {
      slideTitle(ctx, s(1), r);
      slideSetup(ctx, s(2), r);
      slideWhatIf(ctx, s(3), r);
      r.seek(moments[0]);
      slideMoment(ctx, s(4), r);
      slideOutcome(ctx, s(8));
    });
  });
});

describe("export file names", () => {
  it("are plain, short and say what is inside", () => {
    expect(exportName("earth", "What if: Stop all emissions now", "phone", "mp4")).toBe("what-if-lab-earth-stop-all-emissions-now-phone.mp4");
    expect(exportName("solar", "", "slides", "pdf")).toBe("what-if-lab-solar-as-it-is-slides.pdf");
    expect(exportName("country", "Changed: Free school + Cash for all ×2", "youtube", "webm")).toBe("what-if-lab-country-free-school-cash-for-all-2-youtube.webm");
  });
});
