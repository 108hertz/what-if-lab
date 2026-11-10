import type { BaseWorld, Sandbox } from "@/lib/sim/types";
import { TAU, clamp, fmtNum, gauss, note, ref, rng } from "@/lib/sim/core";
import { meta } from "./meta";
import { MESSAGES } from "./messages";
import { worldSay } from "@/lib/sim/say";
import { cap1, listOf } from "@/lib/i18n/t";
import { pageT } from "@/lib/i18n/page";

export { WHATIF_GROUPS } from "./messages";
/** This world's words in the page's language (labels + MESSAGES, change 0025). */
const say = () => worldSay(animals);
import { ARENA_RATIO, COVER, HAB_T, HABITATS, LEGACY, MAX_CAST, READY, SPECIES, castString, parseCast, type Habitat } from "./data";
import { drawAnimals, type View } from "./scene";

/**
 * Primer-style ecosystem (change 0017). A cast of up to five species shares one arena. Who eats whom comes from the
 * food web in data.ts: hunters chase prey they can take (under 1.4× their size, 2.5× for pack hunters), plant-eaters
 * graze food pellets, and everyone flees from the species that eat them. Every animal carries four heritable traits —
 * speed, size, senses and coat — and pays for them: cost ∝ size³·speed² + senses + coat mismatch with the temperature.
 * Babies inherit mutated traits, so the bodies that fit best spread.
 *
 * Stabilisers keep long runs alive: cover patches where prey are safe, each hunter's numbers capped by the prey it can
 * eat, ~30 % hunt success per lunge, and recolonisation by a wandering pair when a species died out (unless a change
 * removed it). Changes stack: every click adds to `w.mods`, and every rule reads them all.
 */
export type P = {
  world?: string; from?: string; cast?: string; species?: string;
  habitat: Habitat; food: number; hab: number; dT: number; seasons: string; human: string; mut: string;
  target?: string; newcomer?: string; s_sick: number; s_new: number;
};

/** One animal: cast slot, position, heading `a` and turn rate `va`, eased speed `v`, energy, four traits, age, gait phase. */
export interface Cr { s: number; id: number; x: number; y: number; a: number; va: number; v: number; e: number; sp: number; sz: number; se: number; co: number; age: number; ph: number; d?: number }
export interface Mod { id: string; t0: number; s: number; sp: string; x0: number }
export interface W extends BaseWorld {
  cast: string[]; start: number[]; av0: number[][]; tc: number[];
  c: Cr[]; food: number[]; hab: number; habit: Habitat; mods: Mod[]; gone: string[];
  nid: number; fxn: number; fx: number[];
  /** Per slot, decayed death counts: caught, hungry, climate, old age, hunted by people. */
  dead: number[][]; kill: number[];
  /** Highest count of each slot since the start or the latest change. */
  peak: number[]; reco: number[]; alive: number[];
  /** Why each animal died out: an index into WHY (-1 = has not). */
  outWhy: number[];
}

const AR = ARENA_RATIO;
const COVER_R2 = 0.0016;
const inCover = (o: Cr) => COVER.some(([x, y]) => (o.x - x) ** 2 + (o.y - y) ** 2 < COVER_R2);
const MAX_ANIMALS = 600, MAX_GRAZERS = 450, MAX_FOOD = 700, FX_KEEP = 48;
/** Food bits that grow per day on the whole land at 100 %. Everyone forages at the same walking pace, so plant-eaters share it. */
const FOOD_RATE = 150, WALK = 0.1;
const MUT: Record<string, number> = { small: 0.035, normal: 0.07, big: 0.14 };
const HUNT: Record<string, number> = { "0": 0, "10": 10, "30": 30, "60": 60 };
const SEASON: Record<string, number> = { off: 0, gentle: 0.35, strong: 0.7 };
/** Effect kinds in `w.fx` (seq, x, y, kind): a soft puff where an animal left, a "nom" where food was eaten. */
export const FX_PUFF = 1, FX_NOM = 2;

/* ───────────── params → world ───────────── */

export function worldName(p: Pick<P, "world" | "from">): string {
  const w = p.world ?? "yellowstone", S = say();
  if (w !== "custom") return READY[w] ? S(`world.${w}`) : S("name.own");
  return p.from && READY[p.from] ? S("name.ownFrom", { from: ref(`world.${p.from}`) }) : S("name.own");
}

/** The cast the params ask for: the edited cast string, or the ready-made world's. */
export function castOf(p: Pick<P, "world" | "cast">): [string, number][] {
  const c = parseCast(p.cast);
  if (c.length) return c;
  return READY[p.world && p.world !== "custom" ? p.world : "yellowstone"]?.cast ?? READY.yellowstone.cast;
}

const habitatOf = (p: Pick<P, "habitat" | "world">): Habitat =>
  (p.habitat as Habitat) ?? READY[p.world ?? "yellowstone"]?.habitat ?? "forest";

/* ───────────── per-step species info ───────────── */

interface Slot { id: string; meta: number; size: number; speed: number; pack: boolean; plants: boolean; eat: number; fear: number; lo: number; hi: number; tol: number; hunted: boolean; clim: number; base: number }

/** Temperature right now: habitat + setting + warm / cool / opposite-climate changes. */
export function tempOf(w: W, p: P): number {
  let T = HAB_T[w.habit] + Number(p.dT);
  for (const m of w.mods) {
    if (m.id === "warm") T += 3;
    if (m.id === "cool") T -= 4;
    if (m.id === "move") T += m.s;
  }
  return T;
}

/** Energy multiplier for living at temperature T with a coat of `co` (1 = the coat it started with). */
export function climateCost(sl: Pick<Slot, "lo" | "hi" | "tol">, tc: number, T: number, co: number): number {
  const Te = T + 10 * (co - 1);
  const out = Math.max(0, sl.lo - Te, Te - sl.hi);
  return Math.min(8, 1 + ((Te - tc) / (sl.tol * 1.5)) ** 2 + (out / 3) ** 2);
}

function slots(w: W, p: P): Slot[] {
  const T = tempOf(w, p);
  const S = w.cast.map((id, i) => {
    const sp = SPECIES[id];
    return { id, meta: sp.meta, size: sp.size, speed: sp.speed, pack: !!sp.pack, plants: sp.diet !== "meat", eat: 0, fear: 0, lo: sp.lo, hi: sp.hi, tol: sp.tol, hunted: sp.hunted, clim: 1, base: w.tc[i] };
  });
  S.forEach((a, i) => S.forEach((b, j) => { if (SPECIES[a.id].eats.includes(b.id)) { a.eat |= 1 << j; b.fear |= 1 << i; } }));
  for (const s of S) s.clim = climateCost(s, s.base, T, 1);
  return S;
}

/** Food growth multiplier from the changes (drought, rain, reserve, warming…). */
function foodMul(w: W): number {
  let f = 1;
  for (const m of w.mods) {
    const d = w.t - m.t0;
    if (m.id === "warm") f *= 0.9;
    if (m.id === "cool") f *= 0.75;
    if (m.id === "reserve") f *= 1.25;
    if (m.id === "drought") f *= d < 365 ? 0.4 : d < 485 ? 0.4 + (0.6 * (d - 365)) / 120 : 1;
    if (m.id === "rain") f *= d < 730 ? 1.6 : 1;
  }
  return f;
}

/** How well burnt land grows back at x (0 = bare, 1 = normal), over months. */
export function burnt(w: W, x: number): number {
  let g = 1;
  for (const m of w.mods) {
    if (m.id !== "fire" || x < m.x0 || x > m.x0 + m.s) continue;
    const d = w.t - m.t0;
    g = Math.min(g, d < 40 ? 0 : clamp((d - 40) / 160, 0, 1));
  }
  return g;
}

export const seasonOf = (w: Pick<W, "t">, p: Pick<P, "seasons">) => Math.sin((TAU * w.t) / 365) * (SEASON[p.seasons] ?? 0);

/* ───────────── creatures ───────────── */

function creature(w: W, s: number, x?: number, y?: number, tr?: { sp: number; sz: number; se: number; co: number }): Cr {
  const j = () => (tr ? 1 : Math.exp(gauss(w) * 0.04));
  const m = SPECIES[w.cast[s]].meta;
  return {
    s, id: w.nid++, x: x ?? rng(w) * w.hab, y: y ?? rng(w) * AR, a: rng(w) * TAU, va: 0, v: 0.7, e: m ? 1.8 : 1.2,
    sp: (tr?.sp ?? 1) * j(), sz: (tr?.sz ?? 1) * j(), se: (tr?.se ?? 1) * j(), co: (tr?.co ?? 1) * j(), age: rng(w) * 10, ph: rng(w) * TAU,
  };
}

function fx(w: W, x: number, y: number, kind: number) {
  w.fx.push(w.fxn++, x, y, kind);
  if (w.fx.length > FX_KEEP * 4) w.fx.splice(0, w.fx.length - FX_KEEP * 4);
}

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const TURN = 10, GX = 12, GY = 8;
/** Spatial buckets, reused every sub-step (scratch only; never part of the world). */
const FB: number[][] = Array.from({ length: GX * GY }, () => []), CB: number[][] = Array.from({ length: GX * GY }, () => []);

/** Rules that stay fixed for one step() call (changes only arrive between steps). */
interface Env { S: Slot[]; T: number; grow: number; hunting: number[] | null; fast: number[] }

function env(w: W, p: P): Env {
  const S = slots(w, p);
  return {
    S, T: tempOf(w, p), grow: FOOD_RATE * (Number(p.food) / 100) * foodMul(w) * (1 + seasonOf(w, p)),
    hunting: S.some((s) => s.hunted) ? huntRates(w, p, S) : null,
    fast: S.map((s) => (w.mods.some((m) => m.id === "invasive" && m.sp === s.id) ? 0.75 : 1)),
  };
}

function tick(w: W, h: number, p: P, E: Env) {
  const { S, T, hunting, fast } = E, hab = w.hab, mut = MUT[p.mut] ?? 0.07;
  // Food grows (seasons, changes, burnt land)
  let ex = E.grow * hab * h;
  while (ex > 0) {
    if (rng(w) < ex && w.food.length < MAX_FOOD * 2) {
      const x = rng(w) * hab, y = rng(w) * AR;
      if (rng(w) < burnt(w, x)) w.food.push(x, y);
    }
    ex -= 1;
  }
  // Spatial buckets
  const cid = (x: number, y: number) => clamp((x * GX) | 0, 0, GX - 1) + clamp(((y / AR) * GY) | 0, 0, GY - 1) * GX;
  for (let i = 0; i < GX * GY; i++) { FB[i].length = 0; CB[i].length = 0; }
  const fb = FB, cb = CB;
  for (let i = 0; i < w.food.length; i += 2) fb[cid(w.food[i], w.food[i + 1])].push(i);
  const C = w.c, n = S.length;
  for (let i = 0; i < C.length; i++) cb[cid(C[i].x, C[i].y)].push(i);
  const eaten = new Set<number>(), born: Cr[] = [];
  const cnt = new Array(n).fill(0);
  let grazers = 0;
  for (const c of C) { cnt[c.s]++; if (!S[c.s].meta) grazers++; }
  // Hunters' caps: the prey each can eat, shared between the hunters of that prey
  const hunters = new Array(n).fill(0);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (S[i].eat & (1 << j) && cnt[i] > 0) hunters[j]++;
  const cap = S.map((s) => {
    if (!s.meta) return Infinity;
    let prey = 0;
    for (let j = 0; j < n; j++) if (s.eat & (1 << j)) prey += cnt[j] / Math.max(1, hunters[j]);
    return Math.min(120, prey / 4 + (s.plants ? 3 : 0));
  });
  // Rare plant-eaters find their favourite plants with less competition (niche sharing), so several can live together
  const gz = S.map((s, i) => (!s.meta && s.plants && cnt[i] > 0 ? cnt[i] : 0)), gzN = gz.filter((k) => k > 0).length, gzT = gz.reduce((a, b) => a + b, 0) || 1;
  const gain = S.map((s, i) => (s.meta ? 0.15 : 0.6 * clamp(1 + 1.2 * (1 / Math.max(1, gzN) - gz[i] / gzT), 0.5, 1.6)));
  const decay = Math.exp(-h / 60);
  for (const d of w.dead) for (let k = 0; k < d.length; k++) d[k] *= decay;
  for (let k = 0; k < w.kill.length; k++) w.kill[k] *= decay;
  const kill = (o: Cr, why: number) => { o.d = 1; w.dead[o.s][why]++; fx(w, o.x, o.y, FX_PUFF); };

  for (let i = 0; i < C.length; i++) {
    const c = C[i];
    if (c.d) continue;
    const sl = S[c.s], body = sl.size * c.sz, hungry = c.e < (sl.meta ? 2.6 : sl.plants ? 1.2 : 2);
    // Only the bucket cells the senses circle overlaps
    const r = 0.07 * c.se, r2 = r * r;
    const x0 = Math.max(0, ((c.x - r) * GX) | 0), x1 = Math.min(GX - 1, ((c.x + r) * GX) | 0);
    const y0 = Math.max(0, (((c.y - r) / AR) * GY) | 0), y1 = Math.min(GY - 1, (((c.y + r) / AR) * GY) | 0);
    let best = -1, bd = r2, prey = false, flee: Cr | null = null, fd = r2 * 0.12, mate = false;
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const cell = x + y * GX;
        for (const j of cb[cell]) {
          if (j === i) continue;
          const o = C[j];
          if (o.d) continue;
          const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
          if (d2 >= r2) continue;
          if (o.s === c.s) { if (d2 < 0.0036) mate = true; continue; }
          if (sl.fear & (1 << o.s) && d2 < fd) {
            const ob = S[o.s].size * o.sz;
            if (body < ob * (S[o.s].pack ? 2.5 : 1.4)) { fd = d2; flee = o; }
          }
          if (hungry && sl.eat & (1 << o.s) && d2 < bd && !inCover(o)) {
            const ob = S[o.s].size * o.sz;
            if (ob < body * (sl.pack ? 2.5 : 1.4)) { bd = d2; best = j; prey = true; }
          }
        }
        if (sl.plants)
          for (const fi of fb[cell]) {
            if (eaten.has(fi)) continue;
            const dx = w.food[fi] - c.x, dy = w.food[fi + 1] - c.y, d2 = dx * dx + dy * dy;
            if (d2 < bd) { bd = d2; best = fi; prey = false; }
          }
      }
    }
    // Steering: ease the turn rate toward the wanted heading (curves, not zig-zags)
    // Walking pace while grazing or wandering; the species' own top speed only when chasing or fleeing
    let want = NaN, vt = WALK / Math.max(WALK, sl.speed);
    if (flee) { want = Math.atan2(c.y - flee.y, c.x - flee.x); vt = 1; }
    else if (best >= 0) {
      const ox = prey ? C[best].x : w.food[best], oy = prey ? C[best].y : w.food[best + 1];
      want = Math.atan2(oy - c.y, ox - c.x); if (prey) vt = 1;
      if (Math.sqrt(bd) < (prey ? 0.018 : 0.012) + body * 0.004) {
        if (prey) {
          const o = C[best], ratio = (S[o.s].size * o.sz) / body;
          // Packs help with big prey: a packmate nearby, or the odds drop
          const odds = Math.min(1, (1.2 / ratio) ** 2) * (sl.pack && ratio > 1.4 && !mate ? 0.4 : 1) * SPECIES[S[o.s].id].guard;
          if (rng(w) < ((0.3 * h) / 0.05) * odds) { kill(o, 0); w.kill[c.s * MAX_CAST + o.s]++; c.e += 1.1; }
        } else { eaten.add(best); c.e += gain[c.s]; if (rng(w) < 0.08) fx(w, w.food[best], w.food[best + 1], FX_NOM); }
      }
    }
    if (want === want) {
      const tv = clamp(wrap(want - c.a) * 8, -TURN, TURN);
      c.va += (tv - c.va) * Math.min(1, h * 14);
    } else {
      c.va += gauss(w) * 3 * Math.sqrt(h);
      c.va *= Math.exp(-2 * h);
    }
    c.a = wrap(c.a + c.va * h);
    c.v += (vt - c.v) * Math.min(1, h * 6);
    const step = Math.max(WALK, sl.speed) * c.sp * c.v * h;
    c.x += Math.cos(c.a) * step; c.y += Math.sin(c.a) * step;
    c.ph += (step * 900) / Math.max(0.4, sl.size * c.sz);
    if (c.x < 0) { c.x = 0; c.a = Math.PI - c.a; c.va *= -0.5; }
    if (c.x > hab) { c.x = hab; c.a = Math.PI - c.a; c.va *= -0.5; }
    if (c.y < 0) { c.y = 0; c.a = -c.a; c.va *= -0.5; }
    if (c.y > AR) { c.y = AR; c.a = -c.a; c.va *= -0.5; }

    const clim = climateCost(sl, sl.base, T, c.co);
    c.e -= h * (0.1 + 0.35 * c.sz ** 3 * c.sp ** 2 + 0.12 * c.se + 0.12 * c.sp) * clim * (sl.meta ? 0.22 : 1);
    c.age += h;
    if (c.e <= 0) { kill(c, clim > 2 ? 2 : 1); continue; }
    if (c.age > (sl.meta ? 80 : 50)) { kill(c, 3); continue; }
    if (hunting && hunting[c.s] && rng(w) < hunting[c.s] * h) { kill(c, 4); continue; }
    if (c.e > (sl.meta ? 3.4 : 2.4) * fast[c.s] && C.length + born.length < MAX_ANIMALS && (sl.meta ? cnt[c.s] < cap[c.s] : grazers < MAX_GRAZERS)) {
      c.e /= 2;
      const mu = (x: number) => x * Math.exp(gauss(w) * mut);
      born.push({
        s: c.s, id: w.nid++, x: clamp(c.x + gauss(w) * 0.01, 0, hab), y: clamp(c.y + gauss(w) * 0.01, 0, AR), a: rng(w) * TAU, va: 0, v: 0.5, e: c.e,
        sp: clamp(mu(c.sp), 0.3, 2.2), sz: clamp(mu(c.sz), 0.55, 3), se: clamp(mu(c.se), 0.3, 3), co: clamp(mu(c.co), 0.3, 2.5), age: 0, ph: rng(w) * TAU,
      });
      cnt[c.s]++;
      if (!sl.meta) grazers++;
    }
  }
  if (eaten.size) {
    const f: number[] = [];
    for (let i = 0; i < w.food.length; i += 2) if (!eaten.has(i)) f.push(w.food[i], w.food[i + 1]);
    w.food = f;
  }
  w.c = C.filter((c) => !c.d).concat(born);
  w.t += h;
  recolonise(w, h, p, S, T);
}

/** Chance a day that people take one animal of each slot (setting + "hunt" changes; a reserve stops all hunting). */
function huntRates(w: W, p: P, S: Slot[]): number[] {
  if (w.mods.some((m) => m.id === "reserve")) return S.map(() => 0);
  const base = ((HUNT[p.human] ?? Number(p.human)) / 100) * 0.02;
  return S.map((s) => (s.hunted ? base : 0) + w.mods.filter((m) => m.id === "hunt" && m.sp === s.id).length * 0.012);
}

/** A pair wanders in from outside when a species has died out here, if there is something to eat and the climate allows. */
function recolonise(w: W, h: number, p: P, S: Slot[], T: number) {
  for (let i = 0; i < S.length; i++) {
    const sl = S[i];
    if (!w.start[i] || w.reco[i] >= 3 || w.gone.includes(sl.id) || w.c.some((c) => c.s === i)) continue;
    const prey = w.c.filter((c) => sl.eat & (1 << c.s)).length;
    const ok = (sl.plants && w.food.length / 2 > 40) || prey >= 6;
    if (!ok || climateCost(sl, sl.base, T, 1) > 2.5 || rng(w) >= 0.03 * h) continue;
    for (let q = 0; q < 2; q++) w.c.push(creature(w, i, sl.meta ? w.hab * 0.98 : 0.02));
    w.reco[i]++;
    note(w, "ev.wanders", { many: many(sl.id) });
  }
}

/* ───────────── readouts ───────────── */

/** Average traits of slot i, or null when none are alive. */
export function traits(w: W, i: number): { sp: number; sz: number; se: number; co: number; n: number } | null {
  let sp = 0, sz = 0, se = 0, co = 0, n = 0;
  for (const c of w.c) if (c.s === i) { sp += c.sp; sz += c.sz; se += c.se; co += c.co; n++; }
  if (!n) return null;
  const a = w.av0[i];
  return { sp: sp / n / a[0], sz: sz / n / a[1], se: se / n / a[2], co: co / n / a[3], n };
}

export const counts = (w: W) => { const n = w.cast.map(() => 0); for (const c of w.c) n[c.s]++; return n; };

function addSlot(w: W, id: string, k: number, T: number): number {
  const i = w.cast.length;
  const sp = SPECIES[id];
  w.cast.push(id); w.start.push(k); w.tc.push(clamp(T, sp.lo, sp.hi));
  w.dead.push([0, 0, 0, 0, 0]); w.peak.push(k); w.reco.push(0); w.alive.push(k > 0 ? 1 : 0); w.outWhy.push(-1);
  for (let j = 0; j < k; j++) w.c.push(creature(w, i));
  w.av0.push([1, 1, 1, 1]);
  const t = traits(w, i);
  if (t) w.av0[i] = [t.sp, t.sz, t.se, t.co];
  return i;
}

/** The animal a targeted change applies to: the chosen one if it lives here, else the first hunter, else the first. */
export function targetOf(w: Pick<W, "cast">, p: Pick<P, "target">): string {
  if (p.target && w.cast.includes(p.target)) return p.target;
  return w.cast.find((id) => SPECIES[id].diet === "meat") ?? w.cast[0];
}
/** Who moves in with "add": the chosen newcomer, else the first animal from this habitat that is not here yet. */
export function newcomerOf(w: Pick<W, "cast" | "habit">, p: Pick<P, "newcomer">): string {
  if (p.newcomer && SPECIES[p.newcomer]) return p.newcomer;
  return Object.values(SPECIES).find((s) => s.home === w.habit && !w.cast.includes(s.id))?.id ?? "rabbit";
}

const one = (id: string) => ref(`sp.${id}.one`), many = (id: string) => ref(`sp.${id}.many`);

/** The question each change asks, with the chosen animals filled in. */
export function question(id: string, w: Pick<W, "cast" | "habit">, p: P): string {
  const S = say(), t = targetOf(w, p), nc = newcomerOf(w, p);
  if (id === "add") return S(w.cast.includes(nc) ? "q.addMore" : "q.add", { many: many(nc) });
  return MESSAGES[`q.${id}`] ? S(`q.${id}`, { many: many(t) }) : id;
}

const metricsFor = (k: string, label: string, unit: string, d: number) =>
  [0, 1, 2, 3, 4].map((i) => ({ k: `${k}${i}`, label: `${label} (animal ${i + 1})`, unit, fmt: (v: number | null) => fmtNum(v, d) }));

export const animals: Sandbox<W, P> = {
  ...meta,
  intro: "Up to five kinds of animal share one place. Each animal is a little different; the ones that fit best have more babies, so bodies change over time. Pick a world or build your own, then make changes: they add up.",
  seo: { title: "Evolution Simulator: Predators, Prey and Natural Selection", description: "Put up to five of 21 animals in one place and watch speed, size and senses evolve. Bring an ice age, a wildfire or a sickness, or remove a species, and see who survives." },
  messages: MESSAGES,
  hint: "Each animal is a little different. The ones that fit best have more babies. Press play and pick a change.",
  controls: [
    { type: "heading", label: "The place" },
    { type: "select", id: "habitat", label: "Habitat", options: HABITATS, val: "forest" },
    { type: "range", id: "food", label: "Food growth", min: 20, max: 200, step: 5, val: 100, unit: "% of normal" },
    { type: "range", id: "hab", label: "Room to roam", min: 20, max: 100, step: 5, val: 100, unit: "% of the land" },
    { type: "range", id: "dT", label: "Temperature change", min: -6, max: 6, step: 0.5, val: 0, unit: "°C" },
    { type: "select", id: "seasons", label: "Seasons", options: [["off", "Off: food grows evenly"], ["gentle", "Gentle"], ["strong", "Strong: lean winters"]], val: "off" },
    { type: "heading", label: "People and babies" },
    { type: "select", id: "human", label: "People hunting", options: [["0", "None"], ["10", "A little"], ["30", "Some"], ["60", "A lot"]], val: "10" },
    { type: "select", id: "mut", label: "How different babies are", options: [["small", "A little (slow change)"], ["normal", "Normal"], ["big", "Very (fast change)"]], val: "normal" },
    { type: "heading", label: "Change settings (used by your next click)" },
    { type: "range", id: "s_sick", label: "Sickness strength", min: 10, max: 90, step: 5, val: 40, unit: "% fall ill and die", live: true },
    { type: "range", id: "s_new", label: "Newcomers", min: 5, max: 40, step: 1, val: 12, unit: "animals", live: true },
  ],
  whatifs: [
    ["remove", "An animal disappears"], ["add", "An animal moves in"], ["disease", "A sickness spreads"], ["invasive", "A fast-breeding newcomer"],
    ["warm", "3 °C warmer"], ["cool", "An ice age"], ["drought", "A year without rain"], ["rain", "Years of good rain"], ["fire", "A wildfire"],
    ["habitat", "Half the land lost"], ["reserve", "A protected reserve"], ["hunt", "People hunt an animal"], ["move", "The opposite climate"],
  ],
  // The question each what-if's page answers, and its frozen URL words (change 0033).
  questions: {
    remove: { q: "What if an animal disappeared from a food web?", slug: "an-animal-disappears" },
    add: { q: "What if a new animal moved in?", slug: "a-new-animal-moves-in" },
    disease: { q: "What if a disease spread among wild animals?", slug: "a-disease-spreads" },
    invasive: { q: "What if a fast-breeding invasive species arrived?", slug: "invasive-species-arrives" },
    warm: { q: "What if the climate got 3 °C warmer for wild animals?", slug: "climate-3-degrees-warmer" },
    cool: { q: "What if an ice age came?", slug: "an-ice-age" },
    drought: { q: "What if a year passed without rain?", slug: "a-year-without-rain" },
    rain: { q: "What if there were years of good rain?", slug: "years-of-good-rain" },
    fire: { q: "What if a wildfire swept through?", slug: "a-wildfire" },
    habitat: { q: "What if half the habitat were lost?", slug: "half-the-habitat-lost" },
    reserve: { q: "What if the land became a protected reserve?", slug: "a-protected-reserve" },
    hunt: { q: "What if people hunted an animal?", slug: "people-hunt-an-animal" },
    move: { q: "What if animals lived in the opposite climate?", slug: "the-opposite-climate" },
  },
  // The run behind its what-if pages: times read, step and the metric the answer names (change 0033)
  answer: { at: [30, 90, 180], dt: 0.1, metrics: ["n0", "n1", "n2", "n3", "n4", "food"], key: ["n0", "n1", "n2", "n3", "n4"] },
  // A slot's count is named by its species ("Wolves") on the what-if pages
  metricName: (w, k) => { const m = /^n(\d)$/.exec(k), id = m ? w.cast[+m[1]] : undefined; return id ? { k: `sp.${id}.pl` } : null; },
  speeds: [[1, "1 d/s"], [3, "3 d/s"], [10, "10 d/s"], [30, "30 d/s"]],
  defaultSpeed: 1,
  fmtT: (t) => say()("time.day", { n: Math.floor(t) }),
  metrics: [
    ...[0, 1, 2, 3, 4].map((i) => ({ k: `n${i}`, label: `Animal ${i + 1}`, unit: "animals", fmt: (v: number | null) => fmtNum(v) })),
    { k: "food", label: "Food", unit: "bits", fmt: (v) => fmtNum(v) },
    ...metricsFor("sp", "Speed", "× day 0", 2), ...metricsFor("sz", "Size", "× day 0", 2),
    ...metricsFor("se", "Senses", "× day 0", 2), ...metricsFor("co", "Coat", "× day 0", 2),
  ],

  onParamChange(p, id) {
    if (id === "species") {
      const wk = LEGACY[String(p.species)];
      return wk ? { ...p, world: wk, from: wk, cast: castString(READY[wk].cast), habitat: READY[wk].habitat, target: undefined } : p;
    }
    if (id === "world") {
      const r = READY[String(p.world)];
      return r ? { ...p, from: p.world, cast: castString(r.cast), habitat: r.habitat, species: undefined, target: undefined } : p;
    }
    if (id === "cast" || id === "habitat") {
      const wk = p.world ?? "yellowstone";
      const base = { ...p, species: undefined, cast: p.cast ?? castString(castOf(p)) };
      return wk === "custom" ? base : { ...base, world: "custom", from: wk };
    }
    return p;
  },

  init(p, seed) {
    const habit = habitatOf(p), T0 = HAB_T[habit];
    const w: W = {
      t: 0, rs: seed, log: [], f: {}, cast: [], start: [], av0: [], tc: [], c: [], food: [], hab: Number(p.hab) / 100, habit, mods: [], gone: [],
      nid: 0, fxn: 0, fx: [], dead: [], kill: new Array(MAX_CAST * MAX_CAST).fill(0), peak: [], reco: [], alive: [], outWhy: [],
    };
    for (const [id, k] of castOf(p)) addSlot(w, id, k, T0);
    for (let i = 0; i < 120; i++) w.food.push(rng(w) * w.hab, rng(w) * AR);
    return w;
  },

  step(w, dt, p) {
    const n = Math.ceil(dt / 0.05), h = dt / n;
    const E = env(w, p);
    for (let s = 0; s < n; s++) tick(w, h, p, E);
    const cnt = counts(w);
    w.cast.forEach((id, i) => {
      const sp = SPECIES[id], k = cnt[i];
      w.peak[i] = Math.max(w.peak[i], k);
      if (k > 0) w.alive[i] = 1;
      if (k === 0 && w.alive[i]) {
        w.alive[i] = 0;
        const d = w.dead[i], top = d.indexOf(Math.max(...d));
        w.outWhy[i] = top;
        if (!w.gone.includes(id)) note(w, "ev.out", { many: many(id), why: ref(`why.${top}`) }, `out-${i}-${w.reco[i]}`);
      }
      if (w.start[i] >= 5 && k >= 2 * w.start[i] && k >= 20) note(w, "ev.boom", { one: one(id) }, `boom-${i}`);
      const t = k >= 6 ? traits(w, i) : null;
      if (!t) return;
      if (t.sp > 1.2) note(w, "ev.faster", { one: one(id) }, `spd-${i}`);
      if (t.sp < 0.8) note(w, "ev.slower", { many: many(id) }, `slw-${i}`);
      if (t.sz > 1.2) note(w, "ev.bigger", { many: many(id) }, `big-${i}`);
      if (t.sz < 0.82) note(w, "ev.smaller", { many: many(id) }, `sml-${i}`);
      if (t.co < 0.8) note(w, "ev.thinner", { many: many(id), coat: ref(`sp.${id}.coat`) }, `thin-${i}`);
      if (t.co > 1.2) note(w, "ev.thicker", { many: many(id), coat: ref(`sp.${id}.coat`) }, `thick-${i}`);
      if (t.se > 1.2) note(w, "ev.senses", { many: many(id) }, `sense-${i}`);
    });
  },

  apply(w, id, p) {
    const tgt = targetOf(w, p), tsp = SPECIES[tgt], T = tempOf(w, p);
    const mod: Mod = { id, t0: w.t, s: 1, sp: tgt, x0: 0 };
    const slotOf = (sid: string) => w.cast.indexOf(sid);
    switch (id) {
      case "remove": {
        const i = slotOf(tgt);
        let k = 0;
        for (const c of w.c) if (c.s === i) { c.d = 1; k++; fx(w, c.x, c.y, FX_PUFF); }
        w.c = w.c.filter((c) => !c.d);
        if (!w.gone.includes(tgt)) w.gone.push(tgt);
        note(w, k ? "ev.removed" : "ev.noneToRemove", { many: many(tgt) });
        break;
      }
      case "add":
      case "invasive": {
        let sid = id === "add" ? newcomerOf(w, p) : "rabbit";
        if (id === "invasive" && !w.cast.includes(sid) && w.cast.length >= MAX_CAST)
          sid = SPECIES[tgt].diet === "plants" ? tgt : w.cast.find((x) => SPECIES[x].diet === "plants") ?? tgt;
        const k = Number(p.s_new) || 12;
        mod.sp = sid; mod.s = k;
        let i = slotOf(sid);
        if (i < 0 && w.cast.length >= MAX_CAST) { note(w, "ev.noRoom"); break; }
        if (i < 0) i = addSlot(w, sid, 0, HAB_T[w.habit]);
        const edge = SPECIES[sid].meta ? w.hab * 0.97 : 0.03;
        for (let q = 0; q < k; q++) w.c.push(creature(w, i, edge + gauss(w) * 0.02 * (SPECIES[sid].meta ? -1 : 1), undefined));
        for (const c of w.c) if (c.s === i) c.x = clamp(c.x, 0, w.hab);
        if (!w.start[i]) w.start[i] = k;
        w.gone = w.gone.filter((x) => x !== sid);
        w.alive[i] = 1;
        note(w, id === "invasive" ? "ev.invasive" : "ev.add", { n: k, many: many(sid) });
        break;
      }
      case "disease": {
        const i = slotOf(tgt), share = (Number(p.s_sick) || 40) / 100;
        let k = 0;
        for (const c of w.c) if (c.s === i && rng(w) < share) { c.d = 1; k++; fx(w, c.x, c.y, FX_PUFF); }
        w.c = w.c.filter((c) => !c.d);
        mod.s = share;
        note(w, "ev.disease", { n: k, many: many(tgt) });
        break;
      }
      case "warm": note(w, "ev.warm"); break;
      case "cool": note(w, "ev.cool"); break;
      case "drought": {
        const f: number[] = [];
        for (let i = 0; i < w.food.length; i += 2) if (rng(w) < 0.5) f.push(w.food[i], w.food[i + 1]);
        w.food = f;
        note(w, "ev.drought");
        break;
      }
      case "rain": note(w, "ev.rain"); break;
      case "fire": {
        mod.s = w.hab / 3; mod.x0 = rng(w) * (w.hab - mod.s);
        const f: number[] = [];
        for (let i = 0; i < w.food.length; i += 2) if (w.food[i] < mod.x0 || w.food[i] > mod.x0 + mod.s) f.push(w.food[i], w.food[i + 1]);
        w.food = f;
        note(w, "ev.fire");
        break;
      }
      case "habitat": {
        w.hab *= 0.5;
        for (const c of w.c) c.x = Math.min(c.x, w.hab);
        const f: number[] = [];
        for (let i = 0; i < w.food.length; i += 2) if (w.food[i] < w.hab) f.push(w.food[i], w.food[i + 1]);
        w.food = f;
        note(w, "ev.habitat");
        break;
      }
      case "reserve": note(w, "ev.reserve"); break;
      case "hunt": note(w, "ev.hunt", { many: many(tgt) }); break;
      case "move": mod.s = T > 15 ? -9 : 9; note(w, "ev.move"); break;
    }
    w.mods.push(mod);
    // Peaks are counted again from each change, so the story can say "then they multiplied"
    w.peak = counts(w);
  },

  read(w) {
    const r: Record<string, number | null> = { food: w.food.length / 2 };
    const cnt = counts(w);
    for (let i = 0; i < MAX_CAST; i++) {
      const has = i < w.cast.length, t = has ? traits(w, i) : null;
      r[`n${i}`] = has ? cnt[i] : null;
      r[`sp${i}`] = t?.sp ?? null; r[`sz${i}`] = t?.sz ?? null; r[`se${i}`] = t?.se ?? null; r[`co${i}`] = t?.co ?? null;
    }
    return r;
  },

  draw({ ctx, w: Wd, h: Hd, p, base }, w) {
    const fires = w.mods.filter((m) => m.id === "fire").map((m) => [m.x0, m.x0 + m.s, burnt(w, m.x0 + m.s / 2)] as [number, number, number]);
    const view: View = { season: seasonOf(w, p), T: tempOf(w, p), fires };
    drawAnimals(ctx, Wd, Hd, w, (base as W | undefined) ?? null, view);
  },
};

/* ───────────── words: the story and the portrait caption ───────────── */

const pct = (v: number) => Math.round(Math.abs(v - 1) * 100);
const list = (xs: string[]) => listOf(pageT(), xs);
const food = (w: Pick<W, "habit">) => ref(`food.${w.habit}`);
const whyOf = (w: W, i: number) => ref(`why.${w.outWhy[i] >= 0 ? w.outWhy[i] : 1}`);

/** "Now 18% faster, ears bigger and fur thinner." for one animal, compared with day 0. */
export function caption(id: string, t: { sp: number; sz: number; se: number; co: number } | null): string {
  const S = say();
  if (!t) return S("cap.none", { many: many(id) });
  const look = SPECIES[id].look, eyes = look.ears === "none" || ["fish", "orca", "insect", "seal", "penguin", "scorpion"].includes(look.form);
  const out: string[] = [];
  if (pct(t.sp) >= 3) out.push(S(t.sp > 1 ? "cap.faster" : "cap.slower", { n: pct(t.sp) }));
  if (pct(t.sz) >= 3) out.push(S(t.sz > 1 ? "cap.bigger" : "cap.smaller", { n: pct(t.sz) }));
  if (pct(t.se) >= 3) out.push(S(`cap.${eyes ? "eyes" : "ears"}${t.se > 1 ? "More" : "Less"}`));
  if (pct(t.co) >= 3) out.push(S(t.co > 1 ? "cap.coatThicker" : "cap.coatThinner", { coat: ref(`sp.${id}.coat`) }));
  return out.length ? S("cap.now", { list: list(out) }) : S("cap.same");
}

interface StoryIn { b: W; a: W | null; p: P }

/** 3–5 plain sentences about what happened and why, in the model's own terms. Never predictions. */
export function story({ b, a, p }: StoryIn): string[] {
  const S = say(), w = a ?? b, day = Math.floor(w.t), cntW = counts(w), cntB = counts(b);
  const out: string[] = [];
  const count = (i: number, k: number) => S("story.count", { n: k, one: one(w.cast[i]), many: many(w.cast[i]) });
  if (!a) {
    const alive = w.cast.map((_, i) => i).filter((i) => cntW[i] > 0);
    out.push(alive.length ? S("story.live", { day, list: list(alive.map((i) => count(i, cntW[i]))) }) : S("story.noneLeft", { day }));
  } else {
    out.push(S("story.compared", { day }));
    const diffs = w.cast.map((_, i) => [i, cntW[i] - (i < b.cast.length ? cntB[i] : 0)] as [number, number]).filter(([, d]) => d !== 0)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 3);
    if (diffs.length) {
      const items = diffs.map(([i, d]) => S(d > 0 ? "story.more" : "story.fewer", { n: Math.abs(d), one: one(w.cast[i]), many: many(w.cast[i]) }));
      out.push(S("story.diff", { be: Math.abs(diffs[0][1]) === 1 && diffs[0][1] > 0 ? "is" : "are", list: list(items) }));
    } else out.push(S("story.same"));
  }
  const why2: string[] = [];
  const has = (id: string) => w.mods.some((m) => m.id === id);
  // Hunters gone → prey boom → hunger
  for (const m of w.mods.filter((m) => m.id === "remove")) {
    const hs = SPECIES[m.sp];
    for (const pid of hs.eats) {
      const j = w.cast.indexOf(pid);
      if (j < 0 || !a) continue;
      const bj = j < b.cast.length ? cntB[j] : 0;
      if (w.peak[j] > bj * 1.3 && w.peak[j] > 10) {
        why2.push(S("story.multiplied", { hunter: many(m.sp), prey: many(pid) }));
        if (cntW[j] < w.peak[j] * 0.7) why2.push(S("story.hungry", { food: food(w) }));
        break;
      }
    }
    // Prey gone → hunters go hungry
    w.cast.forEach((hid, i) => {
      if (SPECIES[hid].eats.includes(m.sp) && a && cntW[i] < (i < b.cast.length ? cntB[i] : 0)) why2.push(S("story.lessToEat", { prey: many(m.sp), hunter: many(hid) }));
    });
  }
  if (has("warm") || has("move") || has("cool")) {
    const T = tempOf(w, p), worst = w.cast.map((id, i) => [i, climateCost(slotLite(id), w.tc[i], T, traits(w, i)?.co ?? 1)] as [number, number]).sort((x, y) => y[1] - x[1])[0];
    if (worst && worst[1] > 1.3) why2.push(S("story.weather", { heat: T > HAB_T[w.habit] ? "hot" : "cold", many: many(w.cast[worst[0]]) }));
  }
  if (has("drought") || has("fire") || has("habitat")) why2.push(S("story.lessFood", { food: food(w) }));
  if (has("rain") || has("reserve")) if (a && (a.food.length > b.food.length * 1.2 || cntW.reduce((s, k) => s + k, 0) > cntB.reduce((s, k) => s + k, 0))) why2.push(S("story.moreFood", { food: food(w) }));
  for (const m of w.mods.filter((m) => m.id === "hunt")) { const i = w.cast.indexOf(m.sp); if (i >= 0 && w.dead[i][4] > 1) why2.push(S("story.hunting", { many: many(m.sp) })); }
  for (const m of w.mods.filter((m) => m.id === "add" || m.id === "invasive")) {
    const i = w.cast.indexOf(m.sp);
    if (i >= 0 && !cntW[i]) why2.push(S("story.newcomersFailed", { many: many(m.sp), why: whyOf(w, i) }));
  }
  // Died out (and why)
  w.cast.forEach((id, i) => {
    if (cntW[i] || w.outWhy[i] < 0 || w.gone.includes(id)) return;
    if (a && i < b.cast.length && !cntB[i]) return;
    if (w.mods.some((m) => (m.id === "add" || m.id === "invasive") && m.sp === id)) return;
    why2.push(S(a ? "story.diedOutChanged" : "story.diedOut", { many: many(id), why: whyOf(w, i) }));
  });
  // Plant-eaters running out of food
  if (!a && w.food.length / 2 < 40 && w.c.some((c) => SPECIES[w.cast[c.s]].diet !== "meat")) why2.push(S("story.runsShort", { food: food(w) }));
  // Hunting pressure in the no-change world
  if (!a) {
    let top = 0, hi = -1, pi = -1;
    for (let i = 0; i < w.cast.length; i++) for (let j = 0; j < w.cast.length; j++) if (w.kill[i * MAX_CAST + j] > top) { top = w.kill[i * MAX_CAST + j]; hi = i; pi = j; }
    if (hi >= 0 && top > 2) why2.push(S("story.catch", { hunter: many(w.cast[hi]), prey: many(w.cast[pi]), cover: ref(w.habit === "ocean" || w.habit === "ice" ? "cover.water" : "cover.land") }));
  }
  // Evolution: the biggest body change (vs day 0, or vs no change)
  let best: [number, string] | null = null;
  const cmp = ref(a ? "cmp.change" : "cmp.day0");
  w.cast.forEach((id, i) => {
    const t = traits(w, i), tb = a && i < b.cast.length ? traits(b, i) : null;
    if (!t || t.n < 6) return;
    const base = tb ?? { sp: 1, sz: 1, se: 1, co: 1 };
    const fear = w.cast.some((h) => SPECIES[h].eats.includes(id));
    const r = (k: "sp" | "sz" | "se" | "co") => t[k] / base[k];
    const v = (k: "sp" | "sz" | "se" | "co") => ({ many: many(id), n: pct(r(k)), cmp, coat: ref(`sp.${id}.coat`) });
    const cand: [number, string][] = [
      [r("sp"), S(r("sp") > 1 ? (fear ? "story.faster" : "story.fasterFood") : "story.slower", v("sp"))],
      [r("sz"), S(r("sz") > 1 ? (fear ? "story.biggerSafe" : "story.bigger") : "story.smaller", v("sz"))],
      [r("co"), S(r("co") > 1 ? "story.coatMore" : "story.coatLess", v("co"))],
      [r("se"), S(r("se") > 1 ? "story.sensesMore" : "story.sensesLess", v("se"))],
    ];
    for (const [x, txt] of cand) if (Math.abs(x - 1) >= 0.06 && (!best || Math.abs(x - 1) > best[0])) best = [Math.abs(x - 1), txt];
  });
  if (best) why2.push((best as [number, string])[1]);
  const lines = [...out, ...why2.slice(0, 5 - out.length)];
  if (lines.length < 3) lines.push(S(a ? "story.giveTime" : "story.pick"));
  return lines.map((l) => cap1(l, pageT().tag));
}

const slotLite = (id: string) => ({ lo: SPECIES[id].lo, hi: SPECIES[id].hi, tol: SPECIES[id].tol });
