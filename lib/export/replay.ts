/**
 * Deterministic re-run of a fork for exports (change 0020; trim, length and slow-down in change 0022). Framework-free: no React, no DOM.
 *
 * The live stage steps with real frame times, so two visitors never step it identically. An export instead
 * re-runs the fork from its recorded start (`SimEngine.origin`) with a fixed step, so the same world, seed,
 * settings and what-if give the same clip and the same slides on every device. Nothing here touches the live
 * engine: every world is a clone.
 */
import type { SimEngine, ChangeRecord, TimelineItem } from "../sim/engine";
import { mergeTimeline } from "../sim/engine";
import type { AnySandbox, BaseWorld, InteractionState, Metric, Params, Readout } from "../sim/types";
import { DEFAULT_TIMING, INTRO_RANGE, OUTRO_RANGE, RUN_RANGE, type Timing } from "./style";

/** Frames per second of exported video. */
export const FPS = 30;
/** Fixed sim steps per video frame of the running part (change 0022: lets the slow-down show every step). */
export const SUB = 2;
/** The running part of a clip lasts between these many seconds when the length is automatic. */
export const MIN_RUN_S = 6;
export const MAX_RUN_S = 20;
/** How far past the automatic end a visitor may run the clip, as a multiple of the automatic span. */
export const AHEAD = 3;

export interface ReplayPlan {
  sb: AnySandbox;
  seed: number;
  /** World to start from (a clone is taken on every run). */
  start: BaseWorld;
  /** The changed world to start from, only when starting from the current moment with a fork running. */
  startAlt: BaseWorld | null;
  params: Params;
  ui: InteractionState;
  /** Changes still to make, in order; the first one is made at the start when the export starts at the fork. */
  changes: ChangeRecord[];
  /** True when the run starts at the fork (the usual case); false when it starts from the current moment. */
  fromFork: boolean;
  /** Whether a what-if is part of this run at all. */
  hasWhatIf: boolean;
  /** Sim time per second of the live stage when the export was captured. */
  speed: number;
  /** Where the replay begins (the fork, or now). */
  tFork: number;
  /** The shown part: from t0 to t1. t0 ≥ tFork when the start is trimmed. */
  t0: number;
  t1: number;
  /** The range a visitor can pick t0 / t1 from, and the automatic end. */
  tMax: number;
  tAuto: number;
  /** Fixed sim step, sim steps before the shown part (trim), sim steps in it, and video frames of it. */
  dt: number;
  pre: number;
  steps: number;
  frames: number;
  /** Video frames of the title hold and the result hold. */
  intro: number;
  outro: number;
  ease: boolean;
  /** "What if: …" / "Changed: …" label as the stage shows it, or "" without a what-if. */
  label: string;
}

export interface PlanOpts {
  timing?: Partial<Timing>;
  /** Shown start and end in sim time; clamped to [tFork, tMax]. */
  from?: number;
  to?: number;
}

const clone = <T,>(x: T): T => structuredClone(x);

/**
 * Capture the recipe from the live engine with default timing. Does not modify the engine. The export studio
 * captures once when it opens and then re-times the same capture (`retime`), so the clip is exactly this fork
 * whatever the stage does next.
 */
export function planReplay(engine: SimEngine, opts: PlanOpts = {}): ReplayPlan {
  const sb = engine.sb;
  const speed = Math.max(1e-9, engine.speed);
  const o = engine.origin;
  // A world may edit its changes in place (e.g. undoing one); then the recorded list no longer matches and
  // the export starts from the current moment instead, which is still deterministic.
  const ids = o?.changes.map((c) => c.id) ?? [];
  const fromFork = !!o && !!engine.alt && ids.length === engine.applied.length && ids.every((id, i) => id === engine.applied[i]);
  const start = fromFork ? clone(o!.world) : clone(engine.base);
  const tFork = start.t;
  let tAuto = fromFork ? Math.max(engine.base.t, tFork + speed * MIN_RUN_S) : tFork + speed * MIN_RUN_S * 2;
  let tMax = tFork + (tAuto - tFork) * AHEAD;
  if (sb.maxT != null) { tAuto = Math.min(tAuto, sb.maxT); tMax = Math.min(tMax, sb.maxT); }
  tAuto = Math.max(tAuto, tFork); tMax = Math.max(tMax, tAuto);
  const prefix = sb.stack ? "Changed: " : "What if: ";
  const base: ReplayPlan = {
    sb, seed: engine.seed, start, startAlt: !fromFork && engine.alt ? clone(engine.alt) : null,
    params: { ...engine.params }, ui: clone(engine.ui), changes: fromFork ? o!.changes.map(clone) : [], fromFork,
    hasWhatIf: !!engine.alt, speed, tFork, t0: tFork, t1: tAuto, tMax, tAuto, dt: 0, pre: 0, steps: 1, frames: 1,
    intro: 0, outro: 0, ease: false, label: engine.alt ? prefix + engine.whatIfLabel() : "",
  };
  return retime(base, opts);
}

/** The same capture with another length, trim, holds or slow-down. Pure. */
export function retime(plan: ReplayPlan, opts: PlanOpts = {}): ReplayPlan {
  const { tFork, tAuto, tMax, speed } = plan;
  const timing = { ...DEFAULT_TIMING, ...opts.timing };
  const minSpan = Math.max(1e-9, (tAuto - tFork) * 0.02);
  const to = Math.min(tMax, Math.max(tFork + minSpan, opts.to ?? tAuto));
  const from = Math.max(tFork, Math.min(to - minSpan, opts.from ?? tFork));
  const span = Math.max(0, to - from);
  const runS = timing.runS != null
    ? Math.min(RUN_RANGE[1], Math.max(RUN_RANGE[0], timing.runS))
    : Math.min(MAX_RUN_S, Math.max(MIN_RUN_S, span / speed));
  const frames = Math.max(1, Math.round(runS * FPS));
  const steps = frames * SUB;
  const dt = span / steps;
  const pre = dt > 0 ? Math.max(0, Math.round((from - tFork) / dt)) : 0;
  const t0 = tFork + pre * dt;
  return {
    ...plan, t0, t1: t0 + steps * dt, dt, pre, steps, frames,
    intro: Math.round(Math.min(INTRO_RANGE[1], Math.max(0, timing.introS)) * FPS),
    outro: Math.round(Math.min(OUTRO_RANGE[1], Math.max(0, timing.outroS)) * FPS),
    ease: timing.ease,
  };
}

/** The automatic run length in seconds for a span (what "Pick for me" would choose). */
export const autoRunS = (plan: ReplayPlan, from = plan.tFork, to = plan.tAuto) =>
  Math.min(MAX_RUN_S, Math.max(MIN_RUN_S, Math.max(0, to - from) / plan.speed));

/** Total video frames of a clip: title hold, running part, result hold. */
export const clipFrames = (plan: ReplayPlan) => plan.intro + plan.frames + plan.outro;

/**
 * Which shown sim step each running frame shows (length frames + 1, from 0 to steps). Uniform without the
 * slow-down; with it, frames crowd around the moments only one world had, so those play at about half speed.
 * Display only: the sim always takes the same fixed steps.
 */
export function frameSteps(plan: ReplayPlan, events: TimelineItem[] | null): Int32Array {
  const { frames, steps, t0, t1 } = plan;
  const out = new Int32Array(frames + 1);
  const split = plan.ease && events ? events.filter((e) => e.who !== "both" && e.t > t0 && e.t <= t1).map((e) => e.t) : [];
  if (!split.length) { for (let i = 0; i <= frames; i++) out[i] = Math.round((i * steps) / frames); return out; }
  const sigma = Math.max(1e-9, (t1 - t0) * 0.04);
  // Frames per step ∝ weight; a step near a split gets up to 2.5× the frames.
  const cum = new Float64Array(steps + 1);
  for (let s = 0; s < steps; s++) {
    const t = t0 + (s + 0.5) * plan.dt;
    let w = 0;
    for (const te of split) w += Math.exp(-(((t - te) / sigma) ** 2));
    cum[s + 1] = cum[s] + 1 + 1.5 * Math.min(1, w);
  }
  const total = cum[steps];
  let s = 0;
  for (let i = 0; i <= frames; i++) {
    const target = (i / frames) * total;
    while (s < steps && cum[s + 1] <= target + 1e-9) s++;
    out[i] = s;
  }
  out[frames] = steps;
  return out;
}

/** Where a clip frame is: in the title hold, the run (with its index) or the result hold. */
export function clipPhase(plan: ReplayPlan, frame: number): { at: "intro" | "run" | "outro"; i: number } {
  if (frame < plan.intro) return { at: "intro", i: 0 };
  if (frame < plan.intro + plan.frames) return { at: "run", i: frame - plan.intro };
  return { at: "outro", i: plan.frames };
}

export interface ReplaySample {
  t: number;
  base: Readout;
  alt: Readout | null;
}

/** One run of a plan. Call `next()` once per sim step; the first `plan.pre` steps are the trimmed-off start. */
export class Replay {
  plan: ReplayPlan;
  base: BaseWorld;
  alt: BaseWorld | null = null;
  params: Params;
  ui: InteractionState;
  /** Sim steps taken, counting the trimmed-off start. */
  frame = 0;
  /** Samples of the shown part only. */
  readonly samples: ReplaySample[] = [];
  private pending: ChangeRecord[];

  constructor(plan: ReplayPlan) {
    this.plan = plan;
    this.base = clone(plan.start);
    this.params = { ...plan.params };
    this.ui = clone(plan.ui);
    this.pending = plan.changes.map(clone);
    if (plan.startAlt) this.alt = clone(plan.startAlt);
    this.applyDue();
    if (plan.pre === 0) this.sample();
  }

  get done(): boolean {
    return this.frame >= this.plan.pre + this.plan.steps;
  }

  /** Sim steps into the shown part (negative while still in the trimmed-off start). */
  get shown(): number {
    return this.frame - this.plan.pre;
  }

  get t(): number {
    return (this.alt ?? this.base).t;
  }

  /** Make every change whose time has come (the first one immediately when starting at the fork). */
  private applyDue(): void {
    const sb = this.plan.sb;
    while (this.pending.length) {
      const c = this.pending[0];
      const now = this.alt ? this.alt.t : this.base.t;
      if (this.alt && c.t > now + 1e-9) break;
      this.pending.shift();
      this.params = { ...c.params };
      const ui = clone(c.ui);
      if (!this.alt) { this.alt = clone(this.base); }
      sb.apply(this.alt, c.id, this.params, ui);
      this.ui = ui;
    }
  }

  /** Advance one sim step. */
  next(): void {
    if (this.done) return;
    const { sb, dt } = this.plan;
    const capped = sb.maxT != null && this.base.t >= sb.maxT;
    if (!capped && dt > 0) {
      sb.step(this.base, dt, this.params);
      if (this.alt) sb.step(this.alt, dt, this.params);
    }
    this.frame++;
    this.applyDue();
    if (this.frame >= this.plan.pre) this.sample();
  }

  /** Step until `shown` sim steps into the shown part (never backwards). */
  seek(shown: number): void {
    while (!this.done && this.shown < shown) this.next();
  }

  read(): { base: Readout; alt: Readout | null } {
    const sb = this.plan.sb;
    return { base: sb.read(this.base, this.params), alt: this.alt ? sb.read(this.alt, this.params) : null };
  }

  private sample(): void {
    const r = this.read();
    this.samples.push({ t: this.base.t, base: r.base, alt: r.alt });
  }

  timeline(limit = 200): TimelineItem[] {
    return mergeTimeline(this.base.log, this.alt?.log ?? null, this.base.t, limit);
  }

  /** Everything needed to carry on from here later (worlds cloned; samples by count). */
  snapshot(): ReplaySnapshot {
    return clone({ base: this.base, alt: this.alt, params: this.params, ui: this.ui, frame: this.frame, pending: this.pending, n: this.samples.length });
  }

  /** A replay that carries on from a snapshot; `samples` = the full run's samples, of which the first n are kept. */
  static restore(plan: ReplayPlan, snap: ReplaySnapshot, samples: ReplaySample[]): Replay {
    const r = new Replay({ ...plan, startAlt: null, changes: [], pre: 1 });
    const s = clone(snap);
    Object.assign(r, { plan, base: s.base, alt: s.alt, params: s.params, ui: s.ui, frame: s.frame, pending: s.pending });
    r.samples.length = 0;
    r.samples.push(...samples.slice(0, s.n));
    return r;
  }
}

export interface ReplaySnapshot {
  base: BaseWorld;
  alt: BaseWorld | null;
  params: Params;
  ui: InteractionState;
  frame: number;
  pending: ChangeRecord[];
  n: number;
}

/** The metric whose two worlds end furthest apart (relative), or the first metric without a what-if. */
export function keyMetric(sb: AnySandbox, end: ReplaySample): Metric {
  if (!end.alt) return sb.metrics[0];
  let best = sb.metrics[0], score = -1;
  for (const m of sb.metrics) {
    const b = end.base[m.k], a = end.alt[m.k];
    if (b == null || a == null || !isFinite(a) || !isFinite(b)) continue;
    const s = Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b), 1e-9);
    if (s > score + 1e-9) { score = s; best = m; }
  }
  return best;
}

/** What a finished run says: the last sample, the key metric and the merged timeline. */
export interface ReplaySummary {
  end: ReplaySample;
  metric: Metric;
  events: TimelineItem[];
}

/** Run a plan to the end without drawing (fast). Deterministic: the same plan gives the same summary. */
export function runToEnd(plan: ReplayPlan): { replay: Replay; summary: ReplaySummary } {
  const r = new Replay(plan);
  while (!r.done) r.next();
  const end = r.samples[r.samples.length - 1];
  return { replay: r, summary: { end, metric: keyMetric(plan.sb, end), events: r.timeline() } };
}

/**
 * 3–5 key moments for slides and stills, as shown sim steps (1…steps): frames with what-if-only or no-change-only events first,
 * spread out, filled with evenly spaced frames when the run is quiet. Always ends on the last frame.
 */
export function keyMoments(plan: ReplayPlan, events: TimelineItem[], want = 4): number[] {
  const { t0, t1, steps } = plan;
  const span = t1 - t0;
  const toFrame = (t: number) => Math.max(1, Math.min(steps, Math.round(((t - t0) / Math.max(1e-9, span)) * steps)));
  const minGap = Math.max(1, Math.round(steps / (want * 2)));
  const picked: number[] = [];
  const add = (f: number) => { if (picked.every((p) => Math.abs(p - f) >= minGap)) picked.push(f); };
  const inRun = events.filter((e) => e.t > t0 && e.t <= t1).sort((a, b) => a.t - b.t);
  for (const e of inRun.filter((e) => e.who !== "both")) if (picked.length < want - 1) add(toFrame(e.t));
  for (const e of inRun.filter((e) => e.who === "both")) if (picked.length < want - 1) add(toFrame(e.t));
  for (const q of [0.25, 0.5, 0.75]) if (picked.length < want - 1) add(Math.round(steps * q));
  add(steps);
  if (!picked.includes(steps)) picked.push(steps);
  return [...new Set(picked)].sort((a, b) => a - b).slice(-Math.max(3, Math.min(5, want)));
}
