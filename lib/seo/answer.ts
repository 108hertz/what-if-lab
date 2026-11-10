/**
 * The computed answer of a what-if page (change 0033, step 5). Framework-free; runs at build time.
 *
 * The page's answer is not written by hand: the world's default settings run from the default seed to the fork, the
 * what-if is made exactly as its button makes it (`apply` on a copy, like `SimEngine.change`), and both worlds run on
 * with one fixed step. The page reads `read()` at the world's chosen times and the timeline lines only one world has.
 * The data holds numbers and log entries, never words, so one run serves every language; `answerWords` says it in
 * the page's language with the world's own formatters. Same seed and settings ⇒ the same page on every build.
 */
import { DEFAULT_SEED, mergeTimeline, type TimelineItem } from "../sim/engine";
import { defaultParams } from "../sim/core";
import { DEEPLINK_BASELINE_S } from "../sim/deeplink";
import { eventText, worldSay } from "../sim/say";
import { cap1 } from "../i18n/t";
import { pageT } from "../i18n/page";
import type { Values } from "../i18n/message";
import type { AnySandbox, BaseWorld, InteractionState, Metric, Params, Readout } from "../sim/types";

/** Most "what happens" lines a page lists. */
export const MAX_STEPS = 12;

export interface AnswerPoint {
  t: number;
  base: Readout;
  alt: Readout;
}

export interface Answer {
  world: string;
  id: string;
  seed: number;
  /** World time of the what-if. */
  fork: number;
  /** The metrics shown, in order. */
  metrics: string[];
  /** The two worlds at each chosen time (the last one is the horizon). */
  at: AnswerPoint[];
  /** World time of the pictures (`AnswerSetup.shot`, default the horizon). */
  shot: number;
  /** The metric whose two worlds end furthest apart (relative): the one the first sentence names. */
  key: string;
  /** Timeline lines only one world has, from the fork to the horizon, oldest first (at most MAX_STEPS). */
  events: TimelineItem[];
  /** The world's own names for metrics in this run (`Sandbox.metricName`, e.g. animals' slot n0 = wolves). */
  names: Record<string, { k: string; v?: Values }>;
}

/** An answer and the two worlds at its picture time. */
export interface AnswerRun {
  answer: Answer;
  p: Params;
  base: BaseWorld;
  alt: BaseWorld;
}

const clone = <T,>(x: T): T => structuredClone(x);

/** The fork time and step a world's pages use; `t0` is the world's start time (child starts at age 1). */
export function answerClock(sb: AnySandbox, t0 = 0): { fork: number; dt: number } {
  const speed = sb.speeds[sb.defaultSpeed][0];
  return { fork: sb.answer?.fork ?? t0 + DEEPLINK_BASELINE_S * speed, dt: sb.answer?.dt ?? speed / 30 };
}

/** The what-ifs of a world that get a page: those with a question. */
export const answerIds = (sb: AnySandbox): string[] => sb.whatifs.map(([id]) => id).filter((id) => sb.questions?.[id]);

/** Run one what-if and read it. Throws when the world has no answer setup or the id is not one of its what-ifs. */
export const computeAnswer = (sb: AnySandbox, id: string, seed = DEFAULT_SEED): Answer => runAnswer(sb, id, seed).answer;

const memo = new Map<string, Answer>();
/**
 * The answer a page shows, computed once per build process (the page, its metadata and the other languages' pages all
 * ask for it).
 */
export function answerOf(sb: AnySandbox, id: string): Answer {
  const k = `${sb.key}/${id}`;
  let a = memo.get(k);
  if (!a) { a = computeAnswer(sb, id); memo.set(k, a); }
  return a;
}

/** Run one what-if: its answer plus both worlds at the picture time. */
export function runAnswer(sb: AnySandbox, id: string, seed = DEFAULT_SEED): AnswerRun {
  const setup = sb.answer;
  if (!setup?.at.length) throw new Error(`${sb.key}: no answer setup`);
  if (!sb.whatifs.some(([w]) => w === id)) throw new Error(`${sb.key}: no what-if "${id}"`);
  const p = defaultParams(sb);
  const ui: InteractionState = { drag: null, cams: [null, null], pending: null };
  const base: BaseWorld = sb.init(p, seed);
  const t0 = base.t, { fork, dt } = answerClock(sb, t0);
  // Whole steps from the start, so every time is reached the same way on every build
  const stepsTo = (t: number) => Math.max(0, Math.round((t - t0) / dt));
  let n = 0;
  const run = (worlds: BaseWorld[], to: number) => {
    for (; n < to; n++) {
      if (sb.maxT != null && worlds[0].t >= sb.maxT) { n = to; break; }
      for (const w of worlds) sb.step(w, dt, p);
    }
  };
  run([base], stepsTo(fork));
  const alt = clone(base);
  sb.apply(alt, id, p, ui);
  const asked = setup.metrics ?? sb.metrics.map((m) => m.k);
  const raw: AnswerPoint[] = [];
  const shotT = setup.shot ?? setup.at[setup.at.length - 1];
  let shot: [BaseWorld, BaseWorld] | null = null;
  for (const t of [...new Set([...setup.at, shotT])].sort((x, y) => x - y)) {
    run([base, alt], stepsTo(t));
    if (t === shotT) shot = [clone(base), clone(alt)];
    if (setup.at.includes(t)) raw.push({ t: base.t, base: pick(sb.read(base, p), asked), alt: pick(sb.read(alt, p), asked) });
  }
  // A metric with no value in either world at any time (e.g. an empty animal slot) is left out
  const metrics = asked.filter((k) => raw.some((pt) => pt.base[k] != null || pt.alt[k] != null));
  const at = raw.map((pt) => ({ t: pt.t, base: pick(pt.base, metrics), alt: pick(pt.alt, metrics) }));
  const keys = (setup.key ?? metrics).filter((k) => metrics.includes(k));
  // Lines before the fork are in both logs (the changed world is a copy), so only the run after it can differ.
  const events = mergeTimeline(base.log, alt.log, base.t, Infinity)
    .filter((e) => e.who !== "both")
    .sort((a, b) => a.t - b.t || (a.who === b.who ? 0 : a.who === "alt" ? -1 : 1))
    .slice(0, MAX_STEPS);
  const names: Answer["names"] = {};
  if (sb.metricName) for (const k of metrics) { const n = sb.metricName(alt, k) ?? sb.metricName(base, k); if (n) names[k] = n; }
  const answer: Answer = { world: sb.key, id, seed, fork, shot: shot![0].t, metrics, at, key: keyOf(at[at.length - 1], keys.length ? keys : metrics, setup.keyBy ?? "rel"), events, names };
  return { answer, p, base: shot![0], alt: shot![1] };
}

const pick = (r: Readout, keys: string[]): Readout => Object.fromEntries(keys.map((k) => [k, r[k] ?? null]));

function keyOf(end: AnswerPoint, keys: string[], by: "rel" | "abs"): string {
  let best = keys[0], score = -1;
  for (const k of keys) {
    const b = end.base[k], a = end.alt[k];
    if (b == null || a == null || !isFinite(a) || !isFinite(b)) continue;
    const s = by === "abs" ? Math.abs(a - b) : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9);
    if (s > score + 1e-9) { score = s; best = k; }
  }
  return best;
}

/** One metric at one time, said in the page's language. */
export interface AnswerCell {
  k: string;
  label: string;
  unit: string;
  base: string;
  alt: string;
  /** The world's own sentence for the difference, when it has one (country). */
  diff?: string;
  better?: Metric["better"];
  /** alt − base, for marking it up or down. */
  d: number | null;
}

export interface AnswerWords {
  /** The world's own name for the fork time, the pictures' time and each chosen time (its `fmtT`). */
  fork: string;
  shot: string;
  times: { time: string; cells: AnswerCell[] }[];
  /** The key metric at the horizon (also in `times`). */
  key: AnswerCell;
  steps: { time: string; text: string; who: "base" | "alt" }[];
}

/** Say an answer in the page's language (worldSay / eventText / the world's formatters). */
export function answerWords(sb: AnySandbox, a: Answer): AnswerWords {
  const say = worldSay(sb);
  const byK = new Map(sb.metrics.map((m) => [m.k, m]));
  const cell = (pt: AnswerPoint, k: string): AnswerCell => {
    const m = byK.get(k)!;
    const b = pt.base[k], v = pt.alt[k];
    const d = b == null || v == null ? null : v - b;
    const n = a.names[k];
    return {
      k, label: n ? cap1(say(n.k, n.v), pageT().tag) : say(`metric.${k}.label`), unit: m.unit ? say(`metric.${k}.unit`) : "",
      base: m.fmt(b), alt: m.fmt(v), d, better: m.better, ...(m.diff && d != null ? { diff: m.diff(d) } : {}),
    };
  };
  const times = a.at.map((pt) => ({ time: sb.fmtT(pt.t), cells: a.metrics.map((k) => cell(pt, k)) }));
  return {
    fork: sb.fmtT(a.fork),
    shot: sb.fmtT(a.shot),
    times,
    key: cell(a.at[a.at.length - 1], a.key),
    steps: a.events.map((e) => ({ time: sb.fmtT(e.t), text: eventText(sb, e), who: e.who as "base" | "alt" })),
  };
}
