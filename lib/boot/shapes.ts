/**
 * Boot scene silhouettes (change 0026): where each spark lands. Every shape is a self-contained function, because the
 * inline boot script ships its source (`fn.toString()`), so it must not reference anything outside itself: only its
 * arguments and `Math`. `h(i)` is a deterministic hash in [0, 1), so every load looks the same.
 *
 * Output: n points as [x0, y0, x1, y1, …] in a box x ∈ [-1, 1], y ∈ [-1, 1] (y down). Wide shapes keep |y| ≲ 0.6.
 */
export type Hash = (i: number) => number;
export type ShapeFn = (n: number, h: Hash) => number[];

/** Concentric rings shrinking to a point: the scale explorer's zoom. */
const rings: ShapeFn = (n, h) => {
  const out: number[] = [];
  const R = [1, 0.66, 0.43, 0.28, 0.18, 0.11];
  let total = 0;
  for (const r of R) total += r;
  for (let i = 0; i < n; i++) {
    let pick = h(i * 3 + 1) * total, k = 0;
    while (k < R.length - 1 && pick > R[k]) { pick -= R[k]; k++; }
    if (i < n * 0.04) { out.push((h(i * 5) - 0.5) * 0.04, (h(i * 7) - 0.5) * 0.04); continue; }
    const a = h(i * 3 + 2) * Math.PI * 2, r = R[k] * (1 + (h(i * 3) - 0.5) * 0.03);
    out.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  return out;
};

/** A two-armed spiral galaxy, tilted, with a dense core. */
const spiral: ShapeFn = (n, h) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    let x: number, y: number;
    if (i < n * 0.22) {
      const a = h(i * 2) * Math.PI * 2, r = 0.2 * h(i * 2 + 1) * h(i * 2 + 1);
      x = Math.cos(a) * r; y = Math.sin(a) * r;
    } else {
      const t = h(i * 2 + 1), arm = i % 2;
      const a = arm * Math.PI + t * Math.PI * 3.1, r = 0.14 + 0.86 * t;
      const j = (h(i * 2 + 7) - 0.5) * 0.09 * (0.5 + t);
      x = Math.cos(a) * (r + j); y = Math.sin(a) * (r + j);
    }
    const c = Math.cos(-0.35), s = Math.sin(-0.35);
    out.push(x * c - y * 0.62 * s, x * s + y * 0.62 * c);
  }
  return out;
};

/** A sun with four tilted orbits, a planet on each. */
const orbits: ShapeFn = (n, h) => {
  const out: number[] = [];
  const A = [0.3, 0.5, 0.72, 0.97], P = [0.6, 2.4, 4.1, 5.5];
  const c = Math.cos(-0.18), s = Math.sin(-0.18);
  for (let i = 0; i < n; i++) {
    let x: number, y: number;
    const f = i / n;
    if (f < 0.14) {
      const a = h(i) * Math.PI * 2, r = 0.09 * Math.sqrt(h(i + 0.5));
      x = Math.cos(a) * r; y = Math.sin(a) * r;
    } else if (f < 0.26) {
      const k = i % 4, a = P[k], r = 0.035 * Math.sqrt(h(i * 3));
      const b = h(i * 3 + 1) * Math.PI * 2;
      x = Math.cos(a) * A[k] + Math.cos(b) * r; y = Math.sin(a) * A[k] * 0.42 + Math.sin(b) * r;
    } else {
      const k = i % 4, a = h(i * 2 + 9) * Math.PI * 2;
      x = Math.cos(a) * A[k]; y = Math.sin(a) * A[k] * 0.42;
    }
    out.push(x * c - y * s, x * s + y * c);
  }
  return out;
};

/** A fjord: two mountain ridges, a waterline with its reflection, a sun above. */
const horizon: ShapeFn = (n, h) => {
  const out: number[] = [];
  const ridge = (x: number) =>
    0.22 - 0.62 * Math.max(0, 1 - Math.abs(x + 0.45) * 1.7) - 0.4 * Math.max(0, 1 - Math.abs(x - 0.5) * 2.1) - 0.04 * Math.sin(x * 11);
  for (let i = 0; i < n; i++) {
    const f = i / n;
    if (f < 0.12) {
      const a = h(i) * Math.PI * 2, r = 0.1 * (0.85 + h(i * 7) * 0.15);
      out.push(0.12 + Math.cos(a) * r, -0.58 + Math.sin(a) * r);
    } else if (f < 0.62) {
      const x = -1 + 2 * h(i * 3);
      out.push(x, ridge(x) + (h(i * 3 + 1) - 0.5) * 0.02);
    } else if (f < 0.82) {
      out.push(-1 + 2 * h(i * 3 + 2), 0.24 + (h(i * 5) - 0.5) * 0.012);
    } else {
      const x = -1 + 2 * h(i * 3 + 4), d = h(i * 5 + 1) * 0.3;
      out.push(x, 0.28 + d * (0.22 - ridge(x)) * 0.9);
    }
  }
  return out;
};

/** A street of people, poorest to richest: little figures (a head, a body down to the street) taller to the right. */
const street: ShapeFn = (n, h) => {
  const out: number[] = [];
  const per = 7, people = Math.max(1, Math.floor(n / per));
  for (let i = 0; i < n; i++) {
    const k = i % people, part = Math.floor(i / people) % per, f = people > 1 ? k / (people - 1) : 0;
    const x = -0.94 + 1.88 * f, tall = 0.16 + 0.62 * f * f + 0.08 * f, top = 0.42 - tall;
    if (part < 2) { // the head: two sparks side by side
      out.push(x + (part ? 0.018 : -0.018), top - 0.02 + (h(i) - 0.5) * 0.01);
    } else { // the body, evenly down to the street
      out.push(x, top + 0.06 + ((part - 2) / (per - 3)) * (tall - 0.06));
    }
  }
  return out;
};

/** A few creatures: blob outlines of different sizes, each with two eyes. */
const blobs: ShapeFn = (n, h) => {
  const out: number[] = [];
  const B = [[-0.58, 0.12, 0.24], [0.02, -0.04, 0.34], [0.6, 0.18, 0.18], [0.32, -0.52, 0.12], [-0.2, -0.55, 0.09]];
  for (let i = 0; i < n; i++) {
    const b = B[i % B.length], eye = i < B.length * 2;
    if (eye) {
      const side = i < B.length ? -1 : 1;
      out.push(b[0] + side * b[2] * 0.32, b[1] - b[2] * 0.25);
      continue;
    }
    const a = h(i * 2) * Math.PI * 2, wob = 1 + 0.08 * Math.sin(a * 3 + i % B.length);
    out.push(b[0] + Math.cos(a) * b[2] * 1.15 * wob, b[1] + Math.sin(a) * b[2] * 0.9 * wob);
  }
  return out;
};

/** 120 kids growing up: paths fanning out from one start. */
const fan: ShapeFn = (n, h) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = i % 120, t = i < 120 ? 1 : h(i * 3);
    const spread = (k / 119 - 0.5) * 1.15 * Math.pow(t, 1.4);
    out.push(-0.92 + 1.84 * t, 0.35 - 0.45 * t + spread);
  }
  return out;
};

/** 100 versions of one person: a 10 × 10 grid, a few paths branching off it. */
const grid: ShapeFn = (n, h) => {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    const k = i % 100, gx = -0.62 + (k % 10) * 0.138, gy = -0.62 + Math.floor(k / 10) * 0.138;
    if (i < 100) { out.push(gx, gy); continue; }
    if (h(i * 7) < 0.55) {
      const a = h(i * 3) * Math.PI * 2;
      out.push(gx + Math.cos(a) * 0.03, gy + Math.sin(a) * 0.03);
    } else {
      const p = i % 5, t = h(i * 3 + 1);
      const sx = 0.62, sy = -0.62 + p * 0.31;
      out.push(sx + t * 0.36, sy + (p - 2) * 0.09 * t);
    }
  }
  return out;
};

export const SHAPES = { rings, spiral, orbits, horizon, street, blobs, fan, grid } satisfies Record<string, ShapeFn>;
export type BootShape = keyof typeof SHAPES;

/** The hash the boot script uses; exported so tests use the same one. Self-contained like the shapes. */
export const hash: Hash = (i) => {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
};
