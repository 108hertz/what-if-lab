import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import type { AnySandbox, SandboxKey } from "@/lib/sim/types";

/** Change 0024: one world on the stage, every change on a list with a tick, and a reset that starts clean. */
const FRAME = 1 / 60;
const run = (e: SimEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(FRAME); };

/** Another what-if than `id`, so every session has two changes. */
const other = (sb: AnySandbox, id: string) => (sb.whatifs[0][0] === id ? sb.whatifs[1] : sb.whatifs[0])[0];

/** The same ticks every time: run, maybe change `id`, run, change `b`, run. */
function session(key: SandboxKey, id: string, withId: boolean) {
  const sb = SANDBOXES[key];
  const e = new SimEngine(sb, defaultParams(sb));
  run(e, 30);
  if (withId) e.change(id);
  run(e, 40);
  e.change(other(sb, id));
  run(e, 40);
  return e;
}

/** A do-nothing 2D context, enough for every world's draw() to run in Node (as in export.test.ts). */
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
    canvas: { width: 1200, height: 700 },
  };
  return new Proxy(target, {
    get: (t, k: string) => (k in t ? t[k] : () => undefined),
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}
(globalThis as Record<string, unknown>).OffscreenCanvas ??= class {
  constructor(public width: number, public height: number) {}
  getContext() { return fakeCtx(); }
};

const state = (e: SimEngine) => ({ r: e.readouts(), tl: e.timeline(200).map((x) => [x.t, x.txt, x.who]), applied: e.applied });

describe.each(SANDBOX_KEYS)("%s: ticking changes off and on", (key) => {
  const sb = SANDBOXES[key];

  it.each(sb.whatifs.map((w) => w[0]))("%s off = never made, on again = always there", (id) => {
    const on = session(key, id, true), never = session(key, id, false), always = state(session(key, id, true));
    const entry = on.entries.find((x) => x.rec.id === id)!;
    on.setOn(entry.key, false);
    expect(state(on)).toEqual(state(never));
    // Keeps running the same way afterwards
    run(on, 20); run(never, 20);
    expect(state(on)).toEqual(state(never));
    on.setOn(entry.key, true);
    const back = session(key, id, true);
    run(back, 20);
    expect(state(on)).toEqual(state(back));
    expect(always.applied).toEqual([id, other(sb, id)]);
    // Its last chart value follows the world it now shows
    const m = sb.metrics[0].k, last = (x: SimEngine) => x.history.alt[m][x.history.alt[m].length - 1];
    expect(last(on)).toEqual(last(back));
  }, 60_000);

  it("a change makes a difference, and drawing every frame (as the live stage does) never changes a replay", () => {
    const id = sb.whatifs[0][0], ctx = fakeCtx();
    const drawn = (withId: boolean) => {
      const e = new SimEngine(sb, defaultParams(sb));
      const go = (n: number) => { for (let i = 0; i < n; i++) { e.tick(FRAME); e.draw(ctx, 1200, 700); } };
      go(30); if (withId) e.change(id); go(40); e.change(other(sb, id)); go(40);
      return e;
    };
    const on = drawn(true), before = state(on), world = JSON.stringify(on.alt);
    const k = on.entries[0].key;
    on.setOn(k, false);
    // Not vacuous: without the change the world differs somewhere
    expect(JSON.stringify(on.alt)).not.toEqual(world);
    // Same clock without the change: equal to a drawn session that never made it (the child world's live
    // slow-motion after a change, `pace()`, changes that session's clock, so it is compared only on worlds without one)
    if (!sb.pace) expect(state(on)).toEqual(state(drawn(false)));
    on.setOn(k, true);
    // The replay (no drawing) gives exactly the world that was stepped and drawn live
    expect(state(on)).toEqual(before);
    expect(JSON.stringify(on.alt)).toEqual(world);
  }, 60_000);

  it("all off shows the no-change world; all on brings everything back; remove = never made", () => {
    const [a, b] = sb.whatifs.map((w) => w[0]);
    const e = session(key, a, true);
    const before = state(e);
    e.setAll(false);
    expect(e.alt).toBeNull();
    expect(e.entries).toHaveLength(2);
    expect(e.origin).toBeNull();
    expect(e.rects(800, 500)[0].world).toBe(e.base);
    e.setAll(true);
    expect(state(e)).toEqual(before);
    e.remove(e.entries[0].key);
    expect(state(e)).toEqual(state(session(key, a, false)));
    expect(e.entries.map((x) => x.rec.id)).toEqual([other(sb, a)]);
    void b;
  }, 60_000);

  it("the export recipe lists only the changes that are on", () => {
    const e = session(key, sb.whatifs[0][0], true);
    e.setOn(e.entries[0].key, false);
    expect(e.origin!.changes.map((c) => c.id)).toEqual(e.applied);
    expect(e.origin!.world.t).toBe(e.entries[1].rec.t);
  });

  it("reset puts everything back: settings, changes, time, history and timeline", () => {
    const e = new SimEngine(sb, defaultParams(sb));
    const fresh = new SimEngine(sb, defaultParams(sb));
    const ctl = sb.controls.find((c) => c.type === "range" && !c.live);
    if (ctl && ctl.type === "range") e.setParam(ctl.id, ctl.val === ctl.max ? ctl.min : ctl.max);
    e.speedIdx = sb.speeds.length - 1;
    run(e, 30);
    e.change(sb.whatifs[0][0]);
    run(e, 30);
    e.playing = false;
    e.reset();
    expect(e.params).toEqual(defaultParams(sb));
    expect(e.entries).toEqual([]);
    expect(e.alt).toBeNull();
    expect(e.origin).toBeNull();
    expect(e.speedIdx).toBe(sb.defaultSpeed);
    expect(e.playing).toBe(true);
    expect(e.base).toEqual(sb.init(defaultParams(sb), e.seed));
    expect(e.history.t).toHaveLength(1);
    expect(e.history.forkT).toBeNull();
    expect(e.timeline()).toEqual(fresh.timeline());
    run(e, 30); run(fresh, 30);
    expect(e.readouts()).toEqual(fresh.readouts());
  });

  it("the live stage is never split: one draw per frame, of the changed world", () => {
    const calls: boolean[] = [];
    const spy: AnySandbox = { ...sb, draw: (c, w) => { calls.push(c.isAlt); void w; } };
    const e = new SimEngine(spy, defaultParams(sb));
    const ctx = new Proxy({}, { get: (_t, k) => (k === "measureText" ? () => ({ width: 10 }) : () => undefined), set: () => true }) as unknown as CanvasRenderingContext2D;
    e.draw(ctx, 1200, 700);
    expect(calls).toEqual([false]);
    for (const [id] of sb.whatifs.slice(0, 3)) { e.change(id); run(e, 5); }
    calls.length = 0;
    for (const [W, H] of [[1200, 700], [375, 400], [700, 1000]]) {
      expect(e.rects(W, H)).toHaveLength(1);
      expect(e.rects(W, H)[0].world).toBe(e.alt);
      e.draw(ctx, W, H);
    }
    expect(calls).toEqual([true, true, true]);
  });
});
