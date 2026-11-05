import type { Params, Sandbox } from "@/lib/sim/types";
import { fmtNum, gauss, note, num, rng } from "@/lib/sim/core";
import { meta } from "./meta";
import {
  BABY, BEHAVIOURS, BUFFERS, CALMER_AGAIN, CHANGE_GROUPS, CHANGES, SENS, COMBOS, RIPPLES, CHANGE_IDS, EVERYDAY, EVERYDAY_MUL, FADE, FAMILIES, FOREVER, HIGH, HOME_DEFAULTS, HOME_TABLES, INHERIT, LEN, LEN_WORD, LOW, LUCK,
  MILESTONES, MORE, PHRASE, SHORT, SHOW, SIZE, STEPS, STYLE, TALLY_AGES, TRAITS, WORD, kidName, stepWord, type Show, type TraitDelta,
} from "./data";
import {
  averages, behaviourCounts, counts, endOf, happened, kidValue, lasting, mean, N_KIDS, of100, planned, quant, refresh, rippleCount, snapshot, SNAP_AGES, values, valuesAt,
  type Kid, type Mod, type W,
} from "./model";

export * from "./model";
import { drawChild, scenePace } from "./scene";

/**
 * 120 possible children of the same two parents (change 0018). Each child, for each trait:
 *   trait = 50 + h·(midparent − 50)            ← the family's starting point (same for every kid)
 *         + genes   (each kid gets a different mix of the parents' genes)
 *         + home    (parenting, siblings, home life, money, place, school, screens; weighted by age)
 *         + life    (your changes and everyday ups and downs; part of each fades)
 *         + chance  (a lucky or unlucky start, and a slow random drift)
 *         + maturation (the average path with age, same for everyone)
 * The parts are kept separately so the "why are they different" bar is computed from the model itself.
 * Changes stack (`stack: true`): every click adds to `w.mods`, optionally at a later age.
 */
export type P = Params & {
  family: string; from?: string; style: string; sib: string; home: string; money: string; place: string; school: string; screens: string;
  inherit: string; luck: string; fade: string; events: string; s_age: string; s_size: string; s_len?: string;
  baby?: string; shape?: string; time?: string; sens?: string;
};

/* ───────────── params → world ───────────── */

export function familyName(p: Pick<P, "family" | "from">): string {
  if (p.family !== "custom") return FAMILIES[p.family]?.name ?? "Your own family";
  const from = p.from && FAMILIES[p.from]?.name;
  return from ? `Your own family (based on ${from})` : "Your own family";
}

function envOf(p: P): number[] {
  return TRAITS.map((k) => Object.entries(HOME_TABLES).reduce((s, [id, tab]) => s + (tab[String(p[id] ?? HOME_DEFAULTS[id])]?.[k] ?? 0), 0));
}

const pick = <T,>(tab: Record<string, T>, v: unknown, d: string): T => tab[String(v)] ?? tab[d];

/* ───────────── what-ifs ───────────── */

export const WHATIF_GROUPS = CHANGE_GROUPS;

/** The age a click would happen at, from the "When" setting (and, for a change, not before its youngest age). */
export function whenOf(w: Pick<W, "t">, p: Pick<P, "s_age">, id?: string): number {
  const a = p.s_age === "now" || p.s_age == null ? NaN : Number(p.s_age);
  const at = Number.isFinite(a) && a > w.t ? a : w.t, min = id ? CHANGES[id]?.min ?? 0 : 0;
  return Math.max(at, min);
}

/** How long a click's change goes on, in years, from the "How long" setting ("usual" = the change's own length). */
export function lenOf(id: string, p: Pick<P, "s_len">): number {
  const v = String(p.s_len ?? "usual");
  return v in LEN ? LEN[v] : CHANGES[id]?.len ?? 0;
}

/* ───────────── the sandbox ───────────── */

const parentCtl = (pre: string, v: number[]) =>
  TRAITS.map((k, i) => ({ type: "range" as const, id: pre + k, label: i === 4 ? "Worry (100 − calm)" : WORD[SHOW[i]], min: 0, max: 100, step: 1, val: v[i] }));

const homeCtl = (id: string, label: string, opts: [string, string][]) => ({ type: "select" as const, id, label, options: opts, val: HOME_DEFAULTS[id] });

const metricFor = (s: Show) => [
  { k: s, label: WORD[s], unit: "", fmt: (v: number | null) => fmtNum(v) },
  { k: `${s}_lo`, label: `${WORD[s]}: lower end of most kids`, unit: "", fmt: (v: number | null) => fmtNum(v) },
  { k: `${s}_hi`, label: `${WORD[s]}: upper end of most kids`, unit: "", fmt: (v: number | null) => fmtNum(v) },
  { k: `hi${s}`, label: `${STEPS[s][4]} (of 120)`, unit: "kids", fmt: (v: number | null) => fmtNum(v) },
  { k: `lo${s}`, label: `${STEPS[s][0]} (of 120)`, unit: "kids", fmt: (v: number | null) => fmtNum(v) },
];

export const child: Sandbox<W, P> = {
  ...meta,
  stack: true,
  pace: scenePace,
  intro: "The same two parents could have many different children. Here are 120 of them, growing up from age 1 to 60. Genes, home, things that happen and plain chance all shape who they become. Pick a family, then try changes: they add up, and you can set the age they happen at.",
  hint: "These are 120 kids the same two parents could have. Press play to watch them grow up, then try a change.",
  controls: [
    { type: "select", id: "family", label: "Family", options: [...Object.entries(FAMILIES).map(([id, f]) => [id, f.name] as [string, string]), ["custom", "Build your own"]], val: "everyday" },
    { type: "heading", label: "Parent A" }, ...parentCtl("a", FAMILIES.everyday.a),
    { type: "heading", label: "Parent B" }, ...parentCtl("b", FAMILIES.everyday.b),
    { type: "heading", label: "Home" },
    homeCtl("baby", "What were they like as a baby?", [["mixed", "Each one different"], ["easy", "Easy-going"], ["slow", "Slow to warm up"], ["energy", "Full of energy"]]),
    homeCtl("shape", "Who they live with", [["two", "Two parents"], ["one", "One parent"], ["twohomes", "Two homes"], ["big", "A big family under one roof"]]),
    homeCtl("time", "Time together", [["long", "Parents work long hours"], ["ordinary", "Ordinary"], ["lots", "Lots of family time"]]),
    homeCtl("style", "How the parents raise them", [["authoritative", "Warm and firm"], ["authoritarian", "Strict"], ["permissive", "Easy-going"], ["neglectful", "Distant"]]),
    homeCtl("sib", "Brothers and sisters", [["0", "None"], ["older", "One older"], ["1", "One younger"], ["2", "Two or more"]]),
    homeCtl("home", "Home life", [["stable", "Calm"], ["busy", "Busy"], ["unstable", "Lots of arguing"]]),
    homeCtl("money", "Money at home", [["tight", "Tight"], ["ok", "OK"], ["comfy", "Comfortable"]]),
    homeCtl("place", "Where they live", [["city", "City"], ["town", "Town"], ["country", "Countryside"]]),
    homeCtl("school", "School", [["crowded", "Crowded"], ["ordinary", "Ordinary"], ["great", "Great teachers"]]),
    homeCtl("screens", "Screen rules", [["strict", "Strict"], ["some", "Some"], ["none", "No rules"]]),
    { type: "heading", label: "Nature and chance" },
    { type: "select", id: "inherit", label: "How much is inherited", options: [["25", "Low (25 %)"], ["40", "Normal (40 %)"], ["55", "High (55 %)"]], val: "40" },
    { type: "select", id: "luck", label: "How much chance and luck", options: [["small", "Small"], ["normal", "Normal"], ["big", "Big"]], val: "normal" },
    { type: "select", id: "fade", label: "How long effects last", options: [["fast", "They fade fast"], ["normal", "Normal"], ["stick", "They stick"]], val: "normal" },
    { type: "select", id: "sens", label: "How much life affects them", options: [["same", "The same for every kid"], ["some", "Some kids feel things much more"], ["all", "All kids are very sensitive"]], val: "some" },
    { type: "select", id: "events", label: "Everyday ups and downs", options: [["off", "Off"], ["normal", "Normal"], ["lots", "Lots"]], val: "normal" },
    { type: "heading", label: "Change settings (used by your next click)" },
    { type: "select", id: "s_age", label: "When it happens", options: [["now", "Now"], ...Array.from({ length: 17 }, (_, i) => [String(i + 1), `At age ${i + 1}`] as [string, string])], val: "now", live: true },
    { type: "select", id: "s_size", label: "How big", options: [["small", "Small"], ["medium", "Medium"], ["big", "Big"]], val: "medium", live: true },
    { type: "select", id: "s_len", label: "How long", options: Object.entries(LEN_WORD) as [string, string][], val: "usual", live: true },
  ],
  whatifs: CHANGE_IDS.map((id) => [id, SHORT[id]]),
  speeds: [[0.5, "½ yr/s"], [1, "1 yr/s"], [2, "2 yr/s"], [5, "5 yr/s"]],
  defaultSpeed: 1,
  maxT: 60,
  fmtT: (t) => "Age " + Math.floor(t),
  metrics: [
    ...SHOW.flatMap(metricFor),
    ...BEHAVIOURS.map((b) => ({ k: b.key, label: `Likely to ${b.kid} (of 100)`, unit: "kids", fmt: (v: number | null) => fmtNum(v) })),
  ],

  onParamChange(p, id) {
    if (id === "family") {
      const f = FAMILIES[String(p.family)];
      if (!f) return p;
      const q: P = { ...p, from: p.family };
      TRAITS.forEach((k, i) => { q["a" + k] = f.a[i]; q["b" + k] = f.b[i]; });
      return q;
    }
    if (/^[ab][OCEAN]$/.test(id) && p.family !== "custom") return { ...p, family: "custom", from: p.family };
    return p;
  },

  init(p, seed) {
    const H = pick(INHERIT, p.inherit, "40"), luck = pick(LUCK, p.luck, "normal"), [tau, pk] = pick(FADE, p.fade, "normal");
    const h = H + 0.05, sg = 12 * Math.sqrt(H), sc = 12 * Math.sqrt(Math.max(0.05, 0.6 - H)) * luck;
    const w: W = {
      t: 1, rs: seed, log: [], f: {}, k: [], mods: [],
      b0: TRAITS.map((k) => 50 + h * ((num(p, "a" + k) + num(p, "b" + k)) / 2 - 50)),
      env: envOf(p), tau, pk, luck, evMul: EVERYDAY_MUL[String(p.events)] ?? 1, style: String(p.style ?? HOME_DEFAULTS.style), c15: NaN,
      snap: new Float32Array(SNAP_AGES * N_KIDS * 5).fill(NaN),
      hs: Object.fromEntries(Object.keys(HOME_DEFAULTS).map((k) => [k, String(p[k] ?? HOME_DEFAULTS[k])])), cmb: [],
      bb: TRAITS.map((k) => pick(BABY, p.baby, "mixed")[k] ?? 0),
    };
    const [rLo, rSpan] = pick(SENS, p.sens, "some");
    for (let j = 0; j < N_KIDS; j++) {
      const kid: Kid = { gd: [], z0: [], z: [], r: [], evL: [], evF: [], em: 0, j: 0 };
      for (let i = 0; i < 5; i++) {
        kid.gd.push(gauss(w) * sg); kid.z0.push(gauss(w) * sc); kid.z.push(0); kid.r.push(rLo + rSpan * rng(w)); kid.evL.push(0); kid.evF.push(0);
      }
      kid.j = rng(w);
      w.k.push(kid);
    }
    snapshot(w, 1);
    note(w, MILESTONES[0][1], MILESTONES[0][2]);
    return w;
  },

  step(w, dt) {
    const luck = w.luck;
    const n = Math.ceil(dt / 0.1), h = dt / n, fadeK = Math.exp(-h / w.tau);
    for (let s = 0; s < n && w.t < 60; s++) {
      const sd = 1.4 * luck * Math.sqrt(h) * (w.t < 25 ? 1 : 0.5);
      for (const kid of w.k) {
        for (let i = 0; i < 5; i++) { kid.z[i] += gauss(w) * sd - kid.z[i] * 0.02 * h; kid.evF[i] *= fadeK; }
        if (w.evMul > 0) {
          EVERYDAY.forEach((e, ei) => {
            if (w.t < e.from || w.t >= e.to) return;
            if (rng(w) >= e.rate * w.evMul * h) return;
            const pf = lasting(e.pf, w.pk);
            TRAITS.forEach((k, i) => { const d = e.d[k]; if (d) { kid.evL[i] += d * pf * kid.r[i]; kid.evF[i] += d * (1 - pf) * kid.r[i]; } });
            kid.em |= 1 << ei;
          });
        }
      }
      w.t = Math.min(60, w.t + h);
      snapshot(w, Math.floor(w.t + 1e-9));
      // Scheduled changes happen when the clock reaches their age; changes you stopped for a later age stop then
      for (const m of w.mods) {
        if (!m.on && w.t >= m.age) { m.on = 1; note(w, CHANGES[m.id].txt); }
        if (m.on && !m.sn && m.stop < FOREVER && w.t >= m.stop) { m.sn = 1; note(w, CHANGES[m.id].stop); }
      }
      if (w.mods.length) syncDerived(w);
      for (const [age, txt, key] of MILESTONES) if (w.t >= age) note(w, txt, key);
      if (w.t >= 15 && !Number.isFinite(w.c15)) w.c15 = calmAvg(w);
      if (w.t >= 23 && !w.f.calm && Number.isFinite(w.c15) && calmAvg(w) > w.c15 + 1) note(w, CALMER_AGAIN, "calm");
      if (w.evMul > 0) for (const age of TALLY_AGES) if (w.t >= age && !w.f["tally" + age]) tally(w, age);
    }
  },

  apply(w, id, p) {
    const c = CHANGES[id];
    if (!c) return;
    const size = String(p.s_size ?? "medium"), s = SIZE[size] ?? 1, age = whenOf(w, p, id), pf = lasting(c.pf, w.pk), len = lenOf(id, p);
    let d: TraitDelta = {};
    if (c.style) {
      for (const k of TRAITS) d[k] = Math.max(-7, Math.min(7, (STYLE[c.style][k] ?? 0) - (STYLE[w.style]?.[k] ?? 0))) * s; // a style switch is one change: kept within ±7 points
      w.style = c.style;
    } else for (const k of TRAITS) if (c.d[k]) d[k] = c.d[k]! * s;
    if (!Object.values(d).some((x) => x)) d = {};
    const on = age <= w.t ? 1 : 0;
    w.mods.push({ id, age, s: size, d, pf, on, end: age + len, stop: FOREVER, sn: 0, h: 0, b: 1, bi: [], aw: 1 });
    refresh(w);
    if (on) { note(w, c.style && !Object.keys(d).length ? ALREADY : c.txt); syncDerived(w); }
  },

  read(w) {
    return metricsOf(values(w));
  },

  draw({ ctx, w: Wd, h: Hd, p, base }, w) {
    drawChild(ctx, Wd, Hd, w, (base as W | undefined) ?? null, p);
  },
};

/** The metrics for a set of display values v[trait][kid]. */
function metricsOf(v: number[][]): Record<string, number> {
  const r: Record<string, number> = {};
  SHOW.forEach((s, i) => {
    const xs = v[i];
    r[s] = mean(xs); r[`${s}_lo`] = quant(xs, 0.25); r[`${s}_hi`] = quant(xs, 0.75);
    r[`hi${s}`] = xs.filter((x) => x >= HIGH).length; r[`lo${s}`] = xs.filter((x) => x <= LOW).length;
  });
  behaviourCounts(v).forEach((n, q) => { r[BEHAVIOURS[q].key] = n; });
  return r;
}

/** The metrics at a past age (≤ now), recomputed from the yearly snapshots and the changes as they are now. */
export const readAt = (w: W, a: number) => metricsOf(valuesAt(w, a));

/* ───────────── editing changes (change 0019) ───────────── */

const near = (x: number, y: number) => Math.abs(x - y) < 0.25;
const ALREADY = "The parents were already raising them this way";

/** Move a planned change to another age (now or later, not before its youngest age); its length moves with it. */
export function moveMod(w: W, idx: number, age: number) {
  const m = w.mods[idx];
  if (!m || m.on) return;
  const at = Math.max(age, w.t, CHANGES[m.id]?.min ?? 0), len = m.end - m.age;
  m.age = at; m.end = at + len;
  if (m.stop < FOREVER) m.stop = Math.max(m.stop, at);
  refresh(w);
}

/** "more outgoing and a bit calmer": what a change usually does, in a few words (parenting styles: compared with the start). */
export function usually(id: string, w?: Pick<W, "style">): string {
  const c = CHANGES[id];
  if (!c) return "";
  if (c.style) {
    const d: TraitDelta = {};
    for (const k of TRAITS) d[k] = (STYLE[c.style][k] ?? 0) - (STYLE[w?.style ?? "authoritarian"]?.[k] ?? 0);
    return effectWords(d);
  }
  return effectWords(c.d);
}

/** Stop a change at an age (now, or later; never in the past). Noted when it happens. */
export function stopMod(w: W, idx: number, age = w.t) {
  const m = w.mods[idx];
  if (!m || m.sn) return;
  const at = Math.max(age, w.t, m.age);
  if (at >= endOf(m)) return; // it ends by itself before then
  m.stop = at;
  refresh(w);
  if (m.on && w.t >= at) { m.sn = 1; note(w, CHANGES[m.id].stop); }
}

/* ───────────── lines that follow from the changes: ripples, buffers, combos ───────────── */

/** Ripples common enough to get a timeline line. */
const TALLY_P = 0.4;
/** "After they joined a team sport at 6, 61 of 100 kids made friends on the team." */
export const rippleLine = (m: Mod, r: number, n: number) => `After ${CHANGES[m.id].past} at ${Math.floor(m.age)}, ${of100(n)} of 100 kids ${RIPPLES[m.id][r].have}`;
/** When a ripple's line is due: when every kid it can happen to has had it. */
const rippleDue = (m: Mod, r: number) => { const R = RIPPLES[m.id][r]; const t = m.age + R.delay[1]; return endOf(m) > m.age ? Math.min(t, endOf(m)) : t; };

/**
 * Note every line that follows from the changes and is due by now, each once, at the age it belongs to. Everything here is
 * worked out from the changes alone, so after an undo the lines can be cleared and noted again.
 */
function syncDerived(w: W) {
  for (const m of w.mods) {
    if (!m.on || w.t < m.age) continue;
    for (const bi of m.bi) note(w, BUFFERS[bi].why, `d|${BUFFERS[bi].why}|${m.h}`, m.age);
    (RIPPLES[m.id] ?? []).forEach((R, r) => {
      if (R.p < TALLY_P || w.f[`d|r|${m.h}|${r}`]) return;
      const due = rippleDue(m, r);
      if (w.t < due) return;
      w.f[`d|r|${m.h}|${r}`] = 1;
      const n = rippleCount(w, m, r, due);
      if (n > 0) note(w, rippleLine(m, r, n), `d|${rippleLine(m, r, n)}|${m.h}`, due);
    });
  }
  for (const c of w.cmb) if (w.t >= c.start) note(w, COMBOS[c.c].txt, `d|${COMBOS[c.c].txt}|${c.start}`, c.start);
}

/** Forget every line that follows from the changes (they are noted again from the changes as they are now). */
function clearDerived(w: W) {
  const txts = new Set<string>();
  for (const key of Object.keys(w.f)) if (key.startsWith("d|")) { const t = key.split("|")[1]; if (t !== "r") txts.add(t); delete w.f[key]; }
  w.log = w.log.filter((e) => !txts.has(e.txt));
}

/**
 * Take one change out of the changed world as if it never happened. The random draws never depend on changes, so the kids'
 * own parts are untouched; parenting-style changes are worked out again from the start, and its timeline lines go.
 */
export function removeMod(w: W, start: Pick<W, "style">, idx: number) {
  const [m] = w.mods.splice(idx, 1);
  if (!m) return;
  const c = CHANGES[m.id], drop = (txts: string[], t: number) => {
    for (let i = w.log.length - 1; i >= 0; i--) if (txts.includes(w.log[i].txt) && near(w.log[i].t, t)) { w.log.splice(i, 1); return; }
  };
  if (m.on) drop([c.txt, ALREADY], m.age);
  if (m.sn) drop([c.stop], m.stop);
  let style = start.style;
  for (const x of w.mods) {
    const cx = CHANGES[x.id];
    if (!cx.style) continue;
    const s = SIZE[x.s] ?? 1, d: TraitDelta = {};
    for (const k of TRAITS) { const v = Math.max(-7, Math.min(7, (STYLE[cx.style][k] ?? 0) - (STYLE[style]?.[k] ?? 0))) * s; if (v) d[k] = v; }
    x.d = d; style = cx.style;
  }
  w.style = style;
  refresh(w);
  clearDerived(w);
  syncDerived(w);
  w.log.sort((x, y) => x.t - y.t);
}

function calmAvg(w: W) { return mean(w.k.map((kid) => 100 - kidValue(w, kid, 4))); }

/** "By 10, 31 of 100 kids have moved house at least once": the most common everyday event so far. */
function tally(w: W, age: number) {
  w.f["tally" + age] = 1;
  let best = -1, bn = 0;
  EVERYDAY.forEach((_, ei) => { const n = w.k.filter((kid) => kid.em & (1 << ei)).length; if (n > bn) { bn = n; best = ei; } });
  if (best >= 0 && bn > 0) note(w, `By ${age}, ${of100(bn)} of 100 kids ${EVERYDAY[best].have}`);
}

/* ───────────── words ───────────── */

const list = (xs: string[]) => (xs.length < 2 ? xs.join("") : xs.slice(0, -1).join(", ") + " and " + xs[xs.length - 1]);
const degree = (d: number) => (Math.abs(d) < 4 ? "a bit " : Math.abs(d) < 8 ? "" : "much ");
export const SAME = 1.5;


/** The comparison with the hidden no-change world, as [changed phrases, unchanged trait words]. */
export function compare(a: W, b: W): { up: [Show, string][]; same: Show[] } {
  const A = averages(a), B = averages(b);
  const ch = SHOW.map((s, i) => [s, A[i] - B[i]] as [Show, number]);
  const up = ch.filter(([, d]) => Math.abs(d) >= SAME).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
    .map(([s, d]) => [s, degree(d) + MORE[s][d > 0 ? 1 : 0]] as [Show, string]);
  return { up, same: ch.filter(([, d]) => Math.abs(d) < SAME).map(([s]) => s) };
}

/** What a change did, in two words: "kinder and more worried". */
function effectWords(d: TraitDelta): string {
  const ds = TRAITS.map((k, i) => [SHOW[i], i === 4 ? -(d[k] ?? 0) : d[k] ?? 0] as [Show, number]).filter(([, x]) => Math.abs(x) >= 1)
    .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 2);
  return ds.length ? list(ds.map(([s, x]) => degree(x / 1.6) + MORE[s][x > 0 ? 1 : 0])) : "about the same";
}

/** 3–5 plain sentences about what happened and why, in the model's own terms. Never predictions or advice. */
export function story({ b, a, p }: { b: W; a: W | null; p: P }): string[] {
  const w = a ?? b, age = Math.floor(w.t), v = values(w), avg = v.map(mean), cnt = counts(w, v), out: string[] = [];
  if (!a) {
    const top = SHOW.map((s, i) => [s, avg[i]] as [Show, number]).filter(([, x]) => Math.abs(x - 50) >= 6)
      .sort((x, y) => Math.abs(y[1] - 50) - Math.abs(x[1] - 50)).slice(0, 2);
    out.push(`Age ${age}: ${top.length ? `most of these 120 kids are ${list(top.map(([s, x]) => stepWord(s, x)))}` : "most of these 120 kids are somewhere in the middle on every trait"}.`);
    const spread = SHOW.map((s, i) => [s, Math.min(cnt[i].hi, cnt[i].lo)] as [Show, number]).sort((x, y) => y[1] - x[1])[0];
    const si = SHOW.indexOf(spread[0]);
    if (spread[1] > 0) out.push(`They still differ a lot: ${of100(cnt[si].hi)} of 100 are ${STEPS[spread[0]][4]}, while ${of100(cnt[si].lo)} ${spread[0] === "Calm" ? "worry a lot" : `are ${STEPS[spread[0]][0]}`}.`);
    else out.push("Brothers and sisters still differ: each gets a different mix of genes and different luck.");
    const st = String(p.style);
    out.push(st === "authoritative" ? "Warm and firm parents help most kids feel calmer and get organised."
      : st === "authoritarian" ? "Strict parents make most kids a bit more organised, but also more worried."
      : st === "permissive" ? "Easy-going parents: kids tend to be more outgoing, but less organised."
      : "With distant parents, many kids worry more and are less organised.");
  } else {
    out.push(`Compared with the same kids with no changes, at ${age}:`);
    const c = compare(a, b);
    out.push(c.up.length ? `they are ${list(c.up.slice(0, 3).map(([, x]) => x))}.` : "they are about the same so far.");
    const seen = new Set<string>();
    for (const m of happened(a)) {
      if (seen.has(m.id) || out.length >= 4) continue;
      seen.add(m.id);
      const ch = CHANGES[m.id], end = endOf(m), worry = (m.d.N ?? 0) > 2;
      if (!Object.keys(m.d).length) continue;
      const fadeTxt = m.stop <= w.t ? `, until it stopped at ${Math.floor(m.stop)}` : m.pf < 0.5 && w.t - end > 6 ? (worry ? ", then most bounced back" : ", and much of it faded later") : "";
      const at = Math.floor(m.age);
      // The most common thing that followed, so far
      const rip = (RIPPLES[m.id] ?? []).map((R, r) => [r, rippleCount(w, m, r)] as [number, number]).filter(([, n]) => n > 0).sort((x, y) => y[1] - x[1])[0];
      const ripTxt = rip ? `, and ${of100(rip[1])} of 100 ${RIPPLES[m.id][rip[0]].have}` : "";
      out.push(`When ${ch.past} at ${at}, most kids became ${effectWords(m.d)}${fadeTxt}${ripTxt}.`);
      if (m.bi.length && out.length < 4) out.push(`${BUFFERS[m.bi[0]].why}.`);
    }
    for (const c of a.cmb) if (a.t >= c.start && out.length < 4) out.push(`${COMBOS[c.c].txt}.`);
    const next = planned(a)[0];
    if (next && out.length < 5) out.push(`Planned for age ${Math.floor(next.age)}: ${CHANGES[next.id].cap}.`);
  }
  if (out.length < 5) {
    if (age < 5) out.push("Little kids already differ: some are bold, some are careful.");
    else if (age >= 13 && age < 20) out.push("The teenage years: worries go up and tidiness dips for a while. That is normal.");
    else if (age >= 25) out.push("By now personality has mostly settled. It keeps changing slowly all through life.");
  }
  return out.slice(0, 5);
}

/** "Sam, 12: curious about everything and loves being with people, sometimes worries." */
export function kidLine(j: number, age: number, vs: number[]): string {
  const ext = SHOW.map((s, i) => [s, vs[i] - 50] as [Show, number]).filter(([, d]) => Math.abs(d) >= 10).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]));
  const ph = ext.slice(0, 3).map(([s, d]) => PHRASE[s][d > 0 ? 1 : 0]);
  const top = SHOW.map((s, i) => [s, vs[i]] as [Show, number]).sort((x, y) => Math.abs(y[1] - 50) - Math.abs(x[1] - 50))[0];
  const body = ph.length ? (ph.length < 3 ? list(ph) : `${ph[0]} and ${ph[1]}, ${ph[2]}`)
    : Math.abs(top[1] - 50) >= 5 ? `in between on most things, ${top[1] > 50 ? "a little more" : "a little less"} ${WORD[top[0]].toLowerCase()}` : "in between on most things";
  return `${kidName(j)}, ${age}: ${body}.`;
}

/** The kind of a timeline line, for its glyph. */
export function kindOf(txt: string): "milestone" | "home" | "school" | "activity" | "move" | "everyday" | "change" | "ripple" | "together" | "luck" {
  if (MILESTONES.some(([, t]) => t === txt) || txt === CALMER_AGAIN) return "milestone";
  if (txt.startsWith("By ")) return "everyday";
  if (txt.startsWith("After ")) return "ripple";
  if (BUFFERS.some((b) => b.why === txt) || COMBOS.some((c) => c.txt === txt)) return "together";
  for (const c of Object.values(CHANGES)) if (c.txt === txt) return c.kind;
  return "change";
}
