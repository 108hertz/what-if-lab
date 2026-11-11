import type { SimEngine } from "@/lib/sim/engine";
import type { ViewState } from "@/lib/sim/camera";
import { PITCHES, defaultView, orbit, pan, settle, zoomAt } from "@/lib/sim/camera";
import type { StageInteraction, StagePointer } from "./Stage";

/**
 * Space-camera gestures on the stage (change 0036), for worlds whose draw() reads `ui.view`:
 * wheel / pinch zoom towards the pointer, drag turns, right-drag / Shift-drag / two fingers move, double-click
 * resets; keys + − zoom, arrows turn, 0 resets. With `inner` (solar's throw), one-finger drags go to it while
 * the view's tool is "throw". The world writes its px-per-unit scale to `ui.cams` when it draws.
 */
export interface CameraOptions {
  /** The world's own starting pitch (galaxy: tilted, solar: top). */
  pitch: number;
  inner?: StageInteraction;
}

/** The camera of an engine, made on first use with the world's default. */
export const viewOf = (engine: SimEngine, pitch: number): ViewState => (engine.ui.view ??= defaultView(pitch));

/** px per world unit of what is on the stage now (falls back to 1 before the first frame). */
const scaleOf = (engine: SimEngine) => engine.ui.cams[engine.alt ? 1 : 0]?.sc ?? engine.ui.cams[0]?.sc ?? 1;

/** Zoom one step in or out about the stage centre (the view bar's − / +). */
export function zoomStep(engine: SimEngine, pitch: number, dir: 1 | -1) {
  zoomAt(viewOf(engine, pitch), dir > 0 ? 1.5 : 1 / 1.5, 0, 0, scaleOf(engine));
}

/** Back to the world's own framing, keeping the tool. */
export function resetView(engine: SimEngine, pitch: number) {
  const tool = engine.ui.view?.tool ?? "look";
  engine.ui.view = { ...defaultView(pitch), tool };
}

export function setPitch(engine: SimEngine, pitch: number, preset: keyof typeof PITCHES) {
  viewOf(engine, pitch).pitch = PITCHES[preset];
}

export function withCamera({ pitch, inner }: CameraOptions): StageInteraction {
  /** Pointers down on the stage, and what the gesture is. */
  const pts = new Map<number, { x: number; y: number }>();
  let mode: "none" | "orbit" | "pan" | "pinch" | "inner" = "none";
  let last = { x: 0, y: 0, d: 0 };
  const mid = () => {
    const a = [...pts.values()];
    return { x: (a[0].x + a[1].x) / 2, y: (a[0].y + a[1].y) / 2, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y) };
  };
  let size = { W: 1, H: 1 };

  return {
    down(engine, x, y, W, H, ev: StagePointer) {
      size = { W, H };
      // A mouse has one pointer: forget any whose release was lost, so it can't turn into a pinch
      if (!ev.touch) { pts.clear(); if (mode === "inner") inner?.up?.(engine, x, y, false, ev); mode = "none"; }
      pts.set(ev.id, { x, y });
      const v = viewOf(engine, pitch);
      if (pts.size === 2) {
        // A second finger: stop whatever the first one was doing (a throw is dropped)
        if (mode === "inner") inner?.up?.(engine, x, y, false, ev);
        mode = "pinch";
        last = mid();
        return;
      }
      if (pts.size > 2) return;
      if (inner && v.tool === "throw" && ev.button === 0 && !ev.shift) { mode = "inner"; inner.down?.(engine, x, y, W, H, ev); return; }
      mode = ev.button === 2 || ev.button === 1 || ev.shift ? "pan" : "orbit";
      last = { x, y, d: 0 };
    },
    move(engine, x, y, ev) {
      if (!pts.has(ev.id)) return;
      pts.set(ev.id, { x, y });
      const v = viewOf(engine, pitch), sc = scaleOf(engine);
      if (mode === "inner") { inner?.move?.(engine, x, y, ev); return; }
      if (mode === "pinch" && pts.size === 2) {
        const m = mid();
        pan(v, m.x - last.x, m.y - last.y, sc);
        if (last.d > 0 && m.d > 0) zoomAt(v, m.d / last.d, m.x - size.W / 2, m.y - size.H / 2, scaleOf(engine));
        last = m;
        return;
      }
      if (mode === "orbit") orbit(v, x - last.x, y - last.y);
      else if (mode === "pan") pan(v, x - last.x, y - last.y, sc);
      last = { x, y, d: 0 };
    },
    up(engine, x, y, done, ev) {
      pts.delete(ev.id);
      const was = mode;
      if (was === "inner") { mode = "none"; return inner?.up?.(engine, x, y, done, ev) ?? false; }
      if (pts.size === 1 && was === "pinch") {
        // One finger left after a pinch: carry on turning from where it is
        const [p] = [...pts.values()];
        mode = "orbit"; last = { x: p.x, y: p.y, d: 0 };
        return true;
      }
      if (pts.size === 0) mode = "none";
      return was !== "none";
    },
    wheel(engine, x, y, W, H, dy, pinch) {
      const f = Math.exp(-dy * (pinch ? 0.01 : 0.0015));
      zoomAt(viewOf(engine, pitch), f, x - W / 2, y - H / 2, scaleOf(engine));
    },
    dbl(engine) {
      resetView(engine, pitch);
      return true;
    },
    key(engine, key) {
      const v = viewOf(engine, pitch), step = 40;
      switch (key) {
        case "+": case "=": zoomStep(engine, pitch, 1); return true;
        case "-": case "_": zoomStep(engine, pitch, -1); return true;
        case "0": resetView(engine, pitch); return true;
        case "ArrowLeft": orbit(v, -step, 0); return true;
        case "ArrowRight": orbit(v, step, 0); return true;
        case "ArrowUp": orbit(v, 0, -step); return true;
        case "ArrowDown": orbit(v, 0, step); return true;
      }
      settle(v);
      return false;
    },
  };
}
