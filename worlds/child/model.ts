import type { BaseWorld } from "@/lib/sim/types";
import { FOREVER, HIGH, LOW, MATURATION, SHOW, TRAITS, type Show, type TraitDelta } from "./data";

/**
 * The child model's maths (change 0018), shared by the rules (sim.ts) and the stage (scene.ts). Framework-free.
 */
/** One possible kid. Per trait (model order O C E A N): genes, chance start, chance drift, how strongly life affects them, lasting and fading parts of everyday events. */
export interface Kid { gd: number[]; z0: number[]; z: number[]; r: number[]; evL: number[]; evF: number[]; em: number; j: number }
/**
 * A change: when it happens (age), its effect per trait (already × size), how much lasts, whether it has happened yet.
 * Change 0019: `end` = when the cause stops by itself (age + its length; FOREVER = for good), `stop` = the age you stopped it
 * at (FOREVER = not stopped), `sn` = the stop has been noted. While the cause goes on the full effect stays; after it ends
 * the lasting part `pf` stays and the rest fades.
 */
export interface Mod { id: string; age: number; s: string; d: TraitDelta; pf: number; on: 0 | 1; end: number; stop: number; sn: 0 | 1 }
export interface W extends BaseWorld {
  k: Kid[]; mods: Mod[];
  /** Family starting point per trait, home effect per trait, fading time scale, lasting-part shift, everyday-event rate. */
  b0: number[]; env: number[]; tau: number; pk: number; evMul: number; luck: number; style: string;
  /** Average calm at 15 (for the "calmer again" milestone). */
  c15: number;
  /**
   * Yearly snapshots of each kid's chance-and-everyday part (z + evL + evF) at whole ages 0…60, kid-major × 5 traits; NaN
   * until reached. Lets past values be recomputed exactly enough when a change is undone (change 0019). The random draws do
   * not depend on changes, so the changed world and the no-change world share these numbers.
   */
  snap: Float32Array;
}

export const N_KIDS = 120;
export const SNAP_AGES = 61;
const CAP = 14;
const clamp99 = (v: number) => Math.max(1, Math.min(99, v));
const ageW = (a: number) => (a < 18 ? Math.max(0, Math.min(1, (a - 1) / 6)) : Math.max(0.35, 1 - (a - 18) / 15));
export const lasting = (pf: number, k: number) => (k >= 0 ? pf + (1 - pf) * k : pf * (1 + k));

/* ───────────── values ───────────── */

/** When a change's cause stops: by itself or because you stopped it. */
export const endOf = (m: Mod) => Math.min(m.end, m.stop);

/** How much of one change's full effect is there at age a (0–1): ramps up over a year, fades after the cause ends. */
export function strength(m: Mod, a: number, tau: number): number {
  if (!m.on || a < m.age) return 0;
  const end = endOf(m), rampEnd = end > m.age ? end : m.age + 1; // a one-off still builds up over a year; a stopped one stops building
  const ramp = Math.min(1, Math.min(a, rampEnd) - m.age), since = Math.max(0, a - end);
  return ramp * (m.pf + (1 - m.pf) * Math.exp(-since / tau)) * (m.age < 18 ? 1 : 0.6);
}

/** Sum of every change that has happened, for one kid and trait at age a, softly capped so stacks stay plausible. */
function modPart(w: W, kid: Kid, i: number, a: number): number {
  let raw = 0;
  const k = TRAITS[i];
  for (const m of w.mods) {
    const dv = m.d[k];
    if (!dv) continue;
    raw += dv * kid.r[i] * strength(m, a, w.tau);
  }
  return CAP * Math.tanh(raw / CAP);
}

/** Keep a yearly snapshot of the chance-and-everyday part of every kid (called by the rules as whole ages pass). */
export function snapshot(w: W, age: number) {
  if (age < 0 || age >= SNAP_AGES || !Number.isNaN(w.snap[age * N_KIDS * 5])) return;
  w.k.forEach((kid, j) => { for (let i = 0; i < 5; i++) w.snap[(age * N_KIDS + j) * 5 + i] = kid.z[i] + kid.evL[i] + kid.evF[i]; });
}

/** Display values of every kid at a past age a ≤ w.t, from the snapshots (between them: straight lines, ending at now). */
export function valuesAt(w: W, a: number): number[][] {
  if (a >= w.t - 1e-9) return values(w);
  const y0 = Math.max(0, Math.floor(a)), y1 = y0 + 1;
  const at = (y: number, j: number, i: number) => w.snap[(y * N_KIDS + j) * 5 + i];
  const now = (kid: Kid, i: number) => kid.z[i] + kid.evL[i] + kid.evF[i];
  const has1 = y1 < SNAP_AGES && !Number.isNaN(at(y1, 0, 0)), t1 = has1 ? y1 : w.t, g = t1 > y0 ? Math.min(1, (a - y0) / (t1 - y0)) : 1;
  return SHOW.map((_, i) => w.k.map((kid, j) => {
    const r1 = has1 ? at(y1, j, i) : now(kid, i), r0 = Number.isNaN(at(y0, j, i)) ? r1 : at(y0, j, i), rest = r0 + (r1 - r0) * g;
    const x = clamp99(w.b0[i] + kid.gd[i] + kid.z0[i] + ageW(a) * w.env[i] * kid.r[i] + rest + modPart(w, kid, i, a) + MATURATION[TRAITS[i]](a));
    return i === 4 ? 100 - x : x;
  }));
}

/** The four parts of one kid's trait (model order) at age a. */
export function parts(w: W, kid: Kid, i: number, a = w.t) {
  const genes = kid.gd[i], home = ageW(a) * w.env[i] * kid.r[i];
  const life = kid.evL[i] + kid.evF[i] + modPart(w, kid, i, a), chance = kid.z0[i] + kid.z[i];
  return { genes, home, life, chance };
}

/** One kid's trait in model order (N = worry) at age a. */
export function kidValue(w: W, kid: Kid, i: number, a = w.t): number {
  const q = parts(w, kid, i, a);
  return clamp99(w.b0[i] + q.genes + q.home + q.life + q.chance + MATURATION[TRAITS[i]](a));
}

/** Display values (Curious, Organised, Outgoing, Kind, Calm) for every kid: v[trait][kid]. */
export function values(w: W): number[][] {
  return SHOW.map((_, i) => w.k.map((kid) => (i === 4 ? 100 - kidValue(w, kid, 4) : kidValue(w, kid, i))));
}

export const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length);
export function quant(xs: number[], q: number) {
  const s = [...xs].sort((a, b) => a - b), x = q * (s.length - 1), i = Math.floor(x);
  return s[i] + (s[Math.min(s.length - 1, i + 1)] - s[i]) * (x - i);
}

/** Averages in display order. */
export const averages = (w: W) => values(w).map(mean);

/** The most typical kid: closest to the average on all five traits. */
export function typicalKid(w: W, v = values(w)): number {
  const m = v.map(mean), sd = v.map((xs, i) => Math.sqrt(mean(xs.map((x) => (x - m[i]) ** 2))) || 1);
  let best = 0, bd = Infinity;
  for (let j = 0; j < w.k.length; j++) {
    let d = 0;
    for (let i = 0; i < 5; i++) d += ((v[i][j] - m[i]) / sd[i]) ** 2;
    if (d < bd) { bd = d; best = j; }
  }
  return best;
}

/** How much of the difference between the kids comes from genes, home, life events and chance, in % (sums to 100). */
export function why(w: W): { show: Show; genes: number; home: number; life: number; chance: number }[] {
  return SHOW.map((show, i) => {
    const ps = w.k.map((kid) => parts(w, kid, i));
    const vr = (f: (q: (typeof ps)[number]) => number) => { const xs = ps.map(f), m = mean(xs); return mean(xs.map((x) => (x - m) ** 2)); };
    const g = vr((q) => q.genes), h = vr((q) => q.home), l = vr((q) => q.life), c = vr((q) => q.chance), tot = g + h + l + c || 1;
    return { show, genes: (100 * g) / tot, home: (100 * h) / tot, life: (100 * l) / tot, chance: (100 * c) / tot };
  });
}

/** Out of 120 kids: how many are high / low on each display trait. */
export function counts(w: W, v = values(w)) {
  return v.map((xs) => ({ hi: xs.filter((x) => x >= HIGH).length, lo: xs.filter((x) => x <= LOW).length }));
}
export const of100 = (n: number) => Math.round((n * 100) / N_KIDS);

/** Changes that have happened (in order), and those still waiting for their age. */
export const happened = (w: W) => w.mods.filter((m) => m.on);
export const planned = (w: W) => w.mods.filter((m) => !m.on);
/** Is a change in effect at age a (for `span` years, if given, and not stopped by you)? */
export const during = (w: W, id: string, span = Infinity, a = w.t) => w.mods.some((m) => m.id === id && m.on && a >= m.age && a - m.age < span && a < m.stop);
/** Is a change's cause still going on (not ended by itself or stopped)? */
export const ongoing = (m: Mod, a: number) => m.on === 1 && a >= m.age && a < endOf(m);
export { FOREVER };

