import { describe, expect, it } from "vitest";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { FPS, MAX_RUN_S, MIN_RUN_S, SUB, Replay, clipFrames, keyMoments, planReplay, runToEnd } from "@/lib/export/replay";
import {
  drawChartStill, drawStage, drawStageStill, drawVideoFrame, paint, slideMoment, slideOutcome, slideSetup, slideTitle, slideWhatIf, type SlideCtx,
} from "@/lib/export/frame";
import { ALL_PIECES, INTRO_IDS, SIZES, SIZE_IDS, defaultStyle, parseStyle, withTheme } from "@/lib/export/style";
import { narration } from "@/lib/export/text";
import type { AnySandbox } from "@/lib/sim/types";
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
  if (sb.whatifs[1]) { e.change(sb.whatifs[1][0]); run(e, 60); }
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
      for (const style of [defaultStyle(size), { ...styled, size }, { ...defaultStyle(size), clean: true, layout: { split: "alt" as const, stage: "fill" as const, chart: true, cards: false } }]) {
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

describe.each(SANDBOX_KEYS)("%s export: intros, pieces and narration (change 0034)", (key) => {
  const sb = SANDBOXES[key] as AnySandbox;
  it("draws every intro template, every piece off and narration, and never changes the run", () => {
    const plan = planReplay(forkedEngine(key), { timing: { runS: 3, introS: 3, outroS: 1, ease: false } });
    const scrub = new Scrubber(plan);
    const a = scrub.finish();
    const ctx = fakeCtx();
    const cues = narration({ plan, summary: a.summary, world: sb.name, intro: sb.intro, map: a.map });
    const info = { world: sb.name, summary: a.summary, samples: a.samples, cues };
    const base = defaultStyle("phone");
    const before = JSON.stringify(scrub.at(clipFrames(plan) - 1).read());
    const styles = [
      ...INTRO_IDS.map((template) => ({ ...base, intro: { ...base.intro, template } })),
      { ...base, pieces: { stage: false, label: false, clock: false, frame: false, seam: false }, layout: { ...base.layout, split: "auto" as const } },
      { ...base, layers: { ...base.layers, captions: { ...base.layers.captions, show: true, outline: 2, shadow: 1, tracking: 0.1, italic: true, font: "lora" as const } } },
    ];
    for (const style of styles) {
      for (const f of [0, Math.floor(plan.intro / 2), plan.intro - 1, plan.intro + 3, plan.intro + Math.floor(plan.frames / 2), clipFrames(plan) - 1]) {
        paint(style, () => drawVideoFrame(ctx, style, scrub.at(f), info, f));
      }
    }
    // The intro only picks what is drawn: the run ends in the same place
    expect(JSON.stringify(scrub.at(clipFrames(plan) - 1).read())).toBe(before);
    expect(ALL_PIECES.stage).toBe(true);
  });
});

describe.each(SANDBOX_KEYS)("%s export: changed only or side by side (change 0024)", (key) => {
  const sb = SANDBOXES[key];
  /** The world with a draw() that records which world each pane gets. */
  const spied = () => {
    const calls: { alt: boolean; base: boolean; w: number }[] = [];
    const spy: AnySandbox = { ...sb, draw: (c, w) => { calls.push({ alt: c.isAlt, base: !!c.base, w: c.w }); void w; } };
    const e = new SimEngine(spy, defaultParams(sb));
    run(e, 90);
    e.change(sb.whatifs[0][0]);
    run(e, 60);
    return { e, calls };
  };

  it("draws the changed world only by default, and both worlds side by side when asked", () => {
    const { e, calls } = spied();
    expect(defaultStyle().layout.split).toBe("alt");
    expect(parseStyle({ v: 1 })!.layout.split).toBe("alt");
    const plan = planReplay(e);
    const scrub = new Scrubber(plan);
    const a = scrub.finish();
    const ctx = fakeCtx();
    const r = scrub.at(clipFrames(plan) - 1);
    const at = (split: "alt" | "row" | "column" | "base") => { calls.length = 0; drawStage(ctx, r, 0, 0, 1200, 600, split); return calls.map((c) => [c.alt, c.base, c.w]); };
    expect(at("alt")).toEqual([[true, true, 1200]]);
    expect(at("row")).toEqual([[false, false, 597], [true, true, 597]]);
    expect(at("column")).toEqual([[false, false, 1200], [true, true, 1200]]);
    expect(at("base")).toEqual([[false, false, 1200]]);
    // Through a whole video frame and a still: default = one pane, side by side = two
    const info = { world: sb.name, summary: a.summary, samples: a.samples };
    calls.length = 0;
    paint(defaultStyle(), () => drawVideoFrame(ctx, defaultStyle(), r, info, plan.intro + 1));
    expect(calls).toHaveLength(1);
    const both = { ...defaultStyle(), layout: { ...defaultStyle().layout, split: "row" as const } };
    calls.length = 0;
    paint(both, () => { drawVideoFrame(ctx, both, r, info, plan.intro + 1); drawStageStill(ctx, both, r); });
    expect(calls.map((c) => c.alt)).toEqual([false, true, false, true]);
    // Slides follow the same choice
    const s = (split?: "row"): SlideCtx => ({ world: sb.name, intro: sb.intro, plan, summary: a.summary, samples: a.samples, index: 1, total: 8, split });
    calls.length = 0; slideTitle(ctx, s(), r); expect(calls).toHaveLength(1);
    calls.length = 0; slideTitle(ctx, s("row"), r); expect(calls.map((c) => c.alt)).toEqual([false, true]);
  });

  it("the layout never changes the simulation", () => {
    const { e } = spied();
    const plan = planReplay(e);
    const plain = runToEnd(plan).summary;
    const scrub = new Scrubber(plan);
    const ctx = fakeCtx();
    const both = { ...defaultStyle(), layout: { ...defaultStyle().layout, split: "row" as const } };
    for (let f = 0; f < clipFrames(plan); f += 7) paint(both, () => drawStageStill(ctx, both, scrub.at(f)));
    const a = scrub.finish();
    expect(a.summary.end).toEqual(plain.end);
    expect(a.summary.events).toEqual(plain.events);
  });
});

describe("export file names", () => {
  it("are plain, short and say what is inside", () => {
    expect(exportName("earth", "What if: Stop all emissions now", "phone", "mp4")).toBe("what-if-lab-earth-stop-all-emissions-now-phone.mp4");
    expect(exportName("solar", "", "slides", "pdf")).toBe("what-if-lab-solar-as-it-is-slides.pdf");
    expect(exportName("country", "Changed: Free school + Cash for all ×2", "youtube", "webm")).toBe("what-if-lab-country-free-school-cash-for-all-2-youtube.webm");
  });
});
