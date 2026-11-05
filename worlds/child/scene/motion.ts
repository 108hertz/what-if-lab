/**
 * The child stage's draw-only clock and easing (changes 0018, 0019). Never touches the world; reduced motion freezes the
 * clock and makes easing instant.
 */

let reduceQ: MediaQueryList | null = null;
export const reducedMotion = () => {
  if (typeof matchMedia === "undefined") return false;
  reduceQ ??= matchMedia("(prefers-reduced-motion: reduce)");
  return reduceQ.matches;
};
export const realNow = () => (typeof performance !== "undefined" ? performance.now() / 1000 : 0);
let frozen = 0;
export function clock(): number {
  if (reducedMotion()) return frozen;
  return (frozen = realNow());
}

/** Spring a value toward its target (critically damped, settles in ~300 ms). */
export function spring(x: Float64Array, v: Float64Array, i: number, target: number, dt: number) {
  const w0 = 14, a = w0 * w0 * (target - x[i]) - 2 * w0 * v[i];
  v[i] += a * dt; x[i] += v[i] * dt;
}

/** Ease out (cubic), for slides and fades: 0 → 1. */
export const easeOut = (k: number) => 1 - (1 - Math.max(0, Math.min(1, k))) ** 3;
