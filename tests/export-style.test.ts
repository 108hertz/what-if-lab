import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { FONT, STAGE } from "@/lib/sim/draw";
import { FPS, Replay, clipFrames, frameSteps, planReplay, runToEnd } from "@/lib/export/replay";
import { Scrubber } from "@/lib/export/scrub";
import { paint } from "@/lib/export/frame";
import { narration, toCaption, toSrt, toStory, videoTime } from "@/lib/export/text";
import { cueAt } from "@/lib/export/frame";
import {
  ALL_PIECES, FONTS, INTRO_IDS, NO_INTRO, fontCovers, quickStyle, scriptOf,
  LAYER_IDS, SIZE_IDS, THEMES, THEME_IDS, contrast, defaultLayers, defaultStyle, parseStyle, withSize, withTheme,
} from "@/lib/export/style";

/** Change 0022: export styles, timing, the scrubber and the text outputs. */
const FRAME = 1 / 60;
function forked(key: keyof typeof SANDBOXES = "earth") {
  const sb = SANDBOXES[key];
  const e = new SimEngine(sb, defaultParams(sb));
  for (let i = 0; i < 90; i++) e.tick(FRAME);
  e.change(sb.whatifs[0][0]);
  for (let i = 0; i < 120; i++) e.tick(FRAME);
  return e;
}

describe("export style", () => {
  it("defaults to the Control Room look with every layer placed inside the frame", () => {
    for (const size of SIZE_IDS) {
      const s = defaultStyle(size);
      expect(s.theme).toBe("control");
      expect(s.colors).toEqual(THEMES.control.colors);
      for (const id of LAYER_IDS) {
        const l = s.layers[id];
        expect(l.x, `${size} ${id}`).toBeGreaterThanOrEqual(0);
        expect(l.x).toBeLessThanOrEqual(1);
        expect(l.y).toBeGreaterThanOrEqual(0);
        expect(l.y).toBeLessThanOrEqual(1);
      }
    }
  });

  it("survives a round trip through JSON and clamps nonsense", () => {
    const s = withTheme(defaultStyle("square"), "neon");
    s.layers.free1 = { ...s.layers.free1, show: true, text: "Hi {world}", color: "#123456" };
    expect(parseStyle(JSON.stringify(s))).toEqual(s);
    const bad = parseStyle({ v: 1, size: "huge", colors: { bg: "red", ink: "#FFFFFF" }, grade: { brightness: 9 }, timing: { runS: 999, introS: -3 }, layers: { title: { size: 5000, color: "javascript:" } }, extra: 1 });
    expect(bad).not.toBeNull();
    expect(bad!.size).toBe("youtube");
    expect(bad!.colors.bg).toBe(THEMES.control.colors.bg);
    expect(bad!.colors.ink).toBe("#FFFFFF");
    expect(bad!.grade.brightness).toBe(1);
    expect(bad!.timing.runS).toBe(60);
    expect(bad!.timing.introS).toBe(0);
    expect(bad!.layers.title.size).toBe(120);
    expect(bad!.layers.title.color).toBe(defaultStyle().layers.title.color);
    expect(parseStyle("not json")).toBeNull();
    expect(parseStyle({ v: 3 })).toBeNull();
  });

  it("moves untouched layers to the new size's places, keeps moved ones", () => {
    const s = defaultStyle("youtube");
    s.layers.free1 = { ...s.layers.free1, x: 0.1, y: 0.2 };
    const p = withSize(s, "phone");
    expect(p.layers.title.y).toBe(defaultLayers("phone").title.y);
    expect(p.layers.free1.x).toBe(0.1);
  });

  it("themes keep text readable on their background", () => {
    for (const id of THEME_IDS) {
      const c = THEMES[id].colors;
      expect(contrast(c.ink, c.bg), id).toBeGreaterThanOrEqual(4.5);
      expect(contrast(c.stageInk, c.stage), id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("restores the shared stage palette and fonts after drawing, even on errors", () => {
    const before = { ...STAGE }, fonts = { ...FONT };
    const s = { ...withTheme(defaultStyle(), "neon"), fonts: { title: "poster" as const, body: "serif" as const } };
    paint(s, () => { expect(STAGE.alt).toBe(THEMES.neon.colors.alt); });
    expect(() => paint(s, () => { throw new Error("boom"); })).toThrow("boom");
    expect(STAGE).toEqual(before);
    expect(FONT).toEqual(fonts);
  });
});

describe("export timing", () => {
  it("never changes what the worlds do: holds and slow-down only change how frames are shown", () => {
    const e = forked();
    const a = runToEnd(planReplay(e));
    const b = runToEnd(planReplay(e, { timing: { introS: 4, outroS: 0, ease: true } }));
    expect(b.summary.end).toEqual(a.summary.end);
    expect(b.summary.events).toEqual(a.summary.events);
  });

  it("sets the run length, holds and trim", () => {
    const e = forked();
    const p = planReplay(e, { timing: { runS: 30, introS: 0, outroS: 1 } });
    expect(p.frames).toBe(30 * FPS);
    expect(p.intro).toBe(0);
    expect(clipFrames(p)).toBe(30 * FPS + FPS);
    const mid = (p.tFork + p.tAuto) / 2;
    const t = planReplay(e, { from: mid, to: p.tMax });
    expect(t.t0).toBeGreaterThan(t.tFork);
    expect(t.pre).toBeGreaterThan(0);
    expect(Math.abs(t.t0 - mid)).toBeLessThanOrEqual(t.dt);
    expect(t.t1).toBeCloseTo(p.tMax, 6);
    const { replay } = runToEnd(t);
    expect(replay.samples[0].t).toBeCloseTo(t.t0, 6);
    expect(replay.samples.length).toBe(t.steps + 1);
    // Nonsense ranges are clamped into the fork
    const c = planReplay(e, { from: -1e9, to: 1e9 });
    expect(c.t0).toBe(c.tFork);
    expect(c.t1).toBeCloseTo(c.tMax, 6);
  });

  it("slow-down maps frames to steps in order, start to end", () => {
    const e = forked("country");
    const p = planReplay(e, { timing: { ease: true } });
    const { summary } = runToEnd(p);
    for (const m of [frameSteps(p, summary.events), frameSteps({ ...p, ease: false }, null)]) {
      expect(m.length).toBe(p.frames + 1);
      expect(m[0]).toBe(0);
      expect(m[p.frames]).toBe(p.steps);
      for (let i = 1; i < m.length; i++) expect(m[i]).toBeGreaterThanOrEqual(m[i - 1]);
    }
  });

  it("the scrubber gives the same world as running straight there", () => {
    const p = planReplay(forked("animals"));
    const sc = new Scrubber(p);
    const a = sc.finish();
    for (const f of [0, p.intro + 7, p.intro + Math.floor(p.frames * 0.6), clipFrames(p) - 1]) {
      const r = sc.at(f);
      const direct = new Replay(p);
      direct.seek(r.shown);
      expect(r.read()).toEqual(direct.read());
      expect(r.samples).toEqual(direct.samples);
    }
    expect(a.samples.length).toBe(p.steps + 1);
  });
});

describe("export text", () => {
  const e = forked();
  const plan = planReplay(e);
  const a = new Scrubber(plan).finish();
  const x = { plan, summary: a.summary, world: e.sb.name, intro: e.sb.intro, map: a.map };

  it("subtitles are numbered, ordered and inside the clip", () => {
    const srt = toSrt(x);
    const times = [...srt.matchAll(/(\d\d):(\d\d):(\d\d),(\d\d\d) --> (\d\d):(\d\d):(\d\d),(\d\d\d)/g)]
      .map((m) => [m.slice(1, 5), m.slice(5, 9)].map(([h, mm, s, ms]) => +h * 3600 + +mm * 60 + +s + +ms / 1000));
    expect(times.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < times.length; i++) {
      expect(times[i][1]).toBeGreaterThan(times[i][0]);
      if (i) expect(times[i][0]).toBeGreaterThanOrEqual(times[i - 1][1] - 1e-6);
    }
    expect(srt.startsWith("1\n00:00:00,000 --> ")).toBe(true);
    expect(videoTime(plan, a.map, plan.t0)).toBeCloseTo(plan.intro / FPS, 6);
    expect(videoTime(plan, a.map, plan.t1)).toBeCloseTo((plan.intro + plan.frames) / FPS, 6);
  });

  it("caption and story say what happened", () => {
    expect(toCaption(x)).toContain("#whatiflab");
    expect(toCaption(x)).toContain(a.summary.metric.label);
    const md = toStory(x);
    expect(md).toContain("## The setup");
    expect(md).toContain("## What changed");
    for (const m of e.sb.metrics) expect(md).toContain(m.label.replace(/\|/g, "\\|"));
  });
});

describe("export studio, second pass (change 0034)", () => {
  it("reads v1 styles: the stage labels follow the old switch, the new fields take their defaults", () => {
    const v1 = { ...JSON.parse(JSON.stringify(defaultStyle("phone"))), v: 1, layout: { split: "row", stage: "fill", chart: true, hud: false, cards: false } };
    delete v1.pieces; delete v1.intro;
    for (const id of LAYER_IDS) { delete v1.layers[id].tracking; delete v1.layers[id].italic; }
    const s = parseStyle(v1)!;
    expect(s.v).toBe(2);
    expect(s.pieces).toEqual({ ...ALL_PIECES, label: false, clock: false });
    expect(s.intro).toEqual(NO_INTRO);
    expect(s.layout).toEqual({ split: "row", stage: "fill", chart: true, cards: false });
    expect(s.layers.title.tracking).toBe(0);
    expect(s.layers.title.leading).toBe(1);
    expect(s.layers.title.italic).toBe(false);
  });

  it("round-trips pieces, intros, per-layer fonts and typography; clamps the rest", () => {
    const d = defaultStyle();
    const s = { ...d, pieces: { ...ALL_PIECES, frame: false, seam: false }, intro: { template: "countdown" as const, title: "Go {world}", line: "", accent: "#FF0000" },
      layers: { ...d.layers, title: { ...d.layers.title, font: "pixel" as const, tracking: 9, leading: 1.4, outline: 3, shadow: 0.5, italic: true } } };
    const back = parseStyle(JSON.stringify(s))!;
    expect(back.pieces).toEqual(s.pieces);
    expect(back.intro).toEqual(s.intro);
    expect(back.layers.title).toEqual({ ...s.layers.title, tracking: 0.5 });
    expect(parseStyle({ ...s, intro: { template: "nope" } })!.intro.template).toBe("none");
    expect(parseStyle({ ...s, layers: { title: { font: "comic" } } })!.layers.title.font).toBe(d.layers.title.font);
  });

  it("keeps the free quick export exactly as before: no intro, no narration, every piece", () => {
    const q = quickStyle();
    expect(q.intro.template).toBe("none");
    expect(q.layers.captions.show).toBe(false);
    expect(q.pieces).toEqual(ALL_PIECES);
    expect(q.clean).toBe(false);
    for (const id of LAYER_IDS) {
      const l = q.layers[id];
      expect([l.tracking, l.leading, l.outline, l.shadow, l.italic]).toEqual([0, 1, 0, 0, false]);
    }
  });

  it("says which fonts draw a language's letters themselves", () => {
    expect(scriptOf("de")).toBe("latin");
    expect(scriptOf("ru")).toBe("cyrillic");
    expect(scriptOf("ja")).toBe("other");
    for (const [id] of FONTS) expect(fontCovers(id, "en")).toBe(true);
    expect(fontCovers("serif", "ru")).toBe(true);
    expect(fontCovers("bebas", "ru")).toBe(false);
    expect(fontCovers("site", "ja")).toBe(false);
    expect(INTRO_IDS.length).toBe(6);
  });

  it("narration lines are the subtitles' timing, take edits, and show one at a time", () => {
    const e = forked();
    const plan = planReplay(e);
    const a = new Scrubber(plan).finish();
    const x = { plan, summary: a.summary, world: e.sb.name, intro: e.sb.intro, map: a.map };
    const cues = narration(x);
    expect(cues.length).toBeGreaterThanOrEqual(2);
    expect(toSrt(x).split("-->").length - 1).toBe(cues.length);
    const edited = narration(x, { 0: "My own first line" });
    expect(edited[0].say).toBe("My own first line");
    expect(toSrt(x, { 0: "My own first line" })).toContain("My own first line");
    const mid = Math.round(((cues[0].a + cues[0].b) / 2) * FPS);
    expect(cueAt(cues, mid)?.txt).toBe(cues[0].say);
    expect(cueAt(cues, Math.round(cues[cues.length - 1].b * FPS) + 5)).toBeNull();
  });
});
