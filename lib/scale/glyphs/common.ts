import { TAU } from "../../sim/core";

/**
 * Drawing context for one scale object. The canvas is already translated to the object's centre and
 * scaled so its box is [-1, 1] on both axes: 1 unit = half the object's measured size. Ground (for
 * things that stand) is y = 1.
 */
export interface G {
  ctx: CanvasRenderingContext2D;
  /** Half-size of the object's box in CSS px. */
  r: number;
  /** Seconds since the explorer opened; frozen under reduced motion. */
  t: number;
  /** One CSS pixel in local units. */
  px: number;
  /** The fade-in alpha the scale view applies; multiply, never overwrite. */
  a: number;
}

export type Glyph = (g: G) => void;

type Ctx = CanvasRenderingContext2D;
type Stops = [number, string][];

/** Park–Miller RNG for decorative point sets; precomputed once, never Math.random(). */
export function seeded(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export const ease = (k: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, k)));

export function lin(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, stops: Stops): CanvasGradient {
  const g = ctx.createLinearGradient(x0, y0, x1, y1);
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

/** Radial gradient centred at (x, y); the optional focus (fx, fy) offsets the bright point. */
export function rad(ctx: Ctx, x: number, y: number, r0: number, r1: number, stops: Stops, fx = x, fy = y): CanvasGradient {
  const g = ctx.createRadialGradient(fx, fy, Math.max(0, r0), x, y, Math.max(1e-6, r1));
  for (const [o, c] of stops) g.addColorStop(o, c);
  return g;
}

export function disc(ctx: Ctx, x: number, y: number, r: number, style: string | CanvasGradient): void {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.arc(x, y, Math.max(1e-6, r), 0, TAU);
  ctx.fill();
}

export function oval(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot: number, style: string | CanvasGradient): void {
  ctx.fillStyle = style;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(1e-6, rx), Math.max(1e-6, ry), rot, 0, TAU);
  ctx.fill();
}

/** Adds an ellipse sub-path (clockwise, so many shapes union under the non-zero rule). */
export function ell(ctx: Ctx, x: number, y: number, rx: number, ry: number, rot = 0): void {
  ctx.moveTo(x + Math.cos(rot) * rx, y + Math.sin(rot) * rx);
  ctx.ellipse(x, y, Math.max(1e-6, rx), Math.max(1e-6, ry), rot, 0, TAU);
}

/** Adds a tapered capsule from (x1, y1) with half-width w1 to (x2, y2) with half-width w2. */
export function limb(ctx: Ctx, x1: number, y1: number, w1: number, x2: number, y2: number, w2: number): void {
  const a = Math.atan2(y2 - y1, x2 - x1), h = Math.PI / 2;
  ctx.moveTo(x1 + Math.cos(a + h) * w1, y1 + Math.sin(a + h) * w1);
  ctx.arc(x1, y1, Math.max(1e-6, w1), a + h, a + 3 * h);
  ctx.arc(x2, y2, Math.max(1e-6, w2), a - h, a + h);
  ctx.closePath();
}

/** A jointed limb through [x, y, halfWidth] points. */
export function chain(ctx: Ctx, pts: [number, number, number][]): void {
  for (let i = 1; i < pts.length; i++) limb(ctx, ...pts[i - 1], ...pts[i]);
}

/** Polygon sub-path from flat [x, y] pairs. */
export function poly(ctx: Ctx, pts: number[][]): void {
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
}

/** Smooth closed sub-path through points (quadratic curves through midpoints). */
export function smooth(ctx: Ctx, pts: number[][]): void {
  const n = pts.length, mid = (i: number) => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2];
  const m0 = mid(n - 1);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < n; i++) { const m = mid(i); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  ctx.closePath();
}

/** Soft light: a disc fading from `rgb` at alpha `a` to nothing. */
export function glow(ctx: Ctx, x: number, y: number, r: number, rgb: string, a: number): void {
  disc(ctx, x, y, r, rad(ctx, x, y, 0, r, [[0, `rgba(${rgb},${a})`], [0.35, `rgba(${rgb},${a * 0.35})`], [1, `rgba(${rgb},0)`]]));
}

/** Night-side shading for a lit sphere of radius r at (x, y); light comes from the upper left. */
export function sphereShade(ctx: Ctx, x: number, y: number, r: number, k = 0.8): void {
  disc(ctx, x, y, r, rad(ctx, x + r * 0.2, y + r * 0.2, r * 0.1, r * 1.25, [
    [0, "rgba(8,6,12,0)"], [0.55, `rgba(8,6,12,${0.18 * k})`], [0.85, `rgba(8,6,12,${0.6 * k})`], [1, `rgba(8,6,12,${0.92 * k})`],
  ], x - r * 0.45, y - r * 0.45));
}

/**
 * Fills a silhouette with `fill` and a thin `rim` light along its upper-left edges, so dark bodies read
 * against the dark stage. `path` adds sub-paths; it is called twice.
 */
export function silhouette(ctx: Ctx, path: (c: Ctx) => void, fill: string | CanvasGradient, rim: string, off: number): void {
  ctx.save();
  ctx.beginPath(); path(ctx); ctx.clip();
  ctx.fillStyle = rim;
  ctx.beginPath(); path(ctx); ctx.fill();
  ctx.translate(off, off);
  ctx.fillStyle = fill;
  ctx.beginPath(); path(ctx); ctx.fill();
  ctx.restore();
}

/** Multiplies the object's fade alpha by k for what follows. */
export function alpha(g: G, k: number): void {
  g.ctx.globalAlpha = g.a * k;
}

/** Stroke helper with a width in local units. */
export function stroke(ctx: Ctx, style: string | CanvasGradient, w: number, cap: CanvasLineCap = "round"): void {
  ctx.strokeStyle = style;
  ctx.lineWidth = w;
  ctx.lineCap = cap;
  ctx.lineJoin = "round";
  ctx.stroke();
}
