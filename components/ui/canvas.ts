"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Match the backing store to the CSS size × device pixel ratio; returns the CSS size. */
export function fitCanvas(c: HTMLCanvasElement): [number, number] {
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [w, h];
}

/** requestAnimationFrame loop drawing into `ref`. `frame` may change between renders without restarting the loop. */
export function useCanvasLoop(
  ref: RefObject<HTMLCanvasElement | null>,
  frame: (ctx: CanvasRenderingContext2D, W: number, H: number, dt: number) => void,
) {
  const latest = useRef(frame);
  latest.current = frame;
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0, last = performance.now();
    const tick = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const [W, H] = fitCanvas(cv);
      latest.current(ctx, W, H, dt);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ref]);
}
