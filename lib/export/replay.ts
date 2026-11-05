/**
 * Deterministic re-run of a fork for exports (change 0020). Framework-free: no React, no DOM.
 *
 * The live stage steps with real frame times, so two visitors never step it identically. An export instead
 * re-runs the fork from its recorded start (`SimEngine.origin`) with a fixed step, so the same world, seed,
 * settings and what-if give the same clip and the same slides on every device. Nothing here touches the live
 * engine: every world is a clone.
 */
import type { SimEngine, ChangeRecord, TimelineItem } from "../sim/engine";
import { mergeTimeline } from "../sim/engine";
import type { AnySandbox, BaseWorld, InteractionState, Metric, Params, Readout } from "../sim/types";

/** Frames per second of exported video; also the replay's step rate. */
export const FPS = 30;
/** The running part of a clip lasts between these many seconds. */
export const MIN_RUN_S = 6;
export const MAX_RUN_S = 20;

export interface ReplayPlan {
  sb: AnySandbox;
  seed: number;
  /** World to start from (a clone is taken on every run). */
  start: BaseWorld;
  /** The changed world to start from, only when starting from the current moment with a fork running. */
  startAlt: BaseWorld | null;
  params: Params;
  ui: InteractionState;
  /** Changes still to make, in order; the first one is made at `t0` when the export starts at the fork. */
  changes: ChangeRecord[];
  /** True when the run starts at the fork (the usual case); false when it starts from the current moment. */
  fromFork: boolean;
  /** Whether a what-if is part of this run at all. */
  hasWhatIf: boolean;
  t0: number;
  t1: number;
  /** Fixed sim step per frame and the number of frames. */
  dt: number;
  steps: number;
  /** "What if: …" / "Changed: …" label as the stage shows it, or "" without a what-if. */
  label: string;
}

const clone = <T,>(x: T): T => structuredClone(x);

/** Build the recipe from the live engine. Does not modify the engine. */
export function planReplay(engine: SimEngine): ReplayPlan {
  const sb = engine.sb;
  const speed = engine.speed;
  const o = engine.origin;
  // A world may edit its changes in place (e.g. undoing one); then the recorded list no longer matches and
  // the export starts from the current moment instead, which is still deterministic.
  const ids = o?.changes.map((c) => c.id) ?? [];
  const matches = !!o && !!engine.alt && ids.length === engine.applied.length && ids.every((id, i) => id === engine.applied[i]);
  const fromFork = matches;
  const start = fromFork ? clone(o!.world) : clone(engine.base);
  const t0 = start.t;
  let t1 = Math.max(engine.base.t, t0 + speed * MIN_RUN_S);
  if (!fromFork) t1 = t0 + speed * MIN_RUN_S * 2;
  if (sb.maxT != null) t1 = Math.min(t1, sb.maxT);
  const span = Math.max(0, t1 - t0);
  const runS = Math.min(MAX_RUN_S, Math.max(MIN_RUN_S, span / Math.max(1e-9, speed)));
  const steps = Math.max(1, Math.round(runS * FPS));
  const prefix = sb.stack ? "Changed: " : "What if: ";
  let changes: ChangeRecord[] = [];
  let label = "";
  if (fromFork) {
    changes = o!.changes.map(clone);
    label = prefix + engine.whatIfLabel();
  } else if (engine.alt) {
    // Starting now: both worlds as they are; nothing left to apply.
    label = prefix + engine.whatIfLabel();
  }
  return {
    sb, seed: engine.seed, start, startAlt: !fromFork && engine.alt ? clone(engine.alt) : null,
    params: { ...engine.params }, ui: clone(engine.ui), changes, fromFork,
    hasWhatIf: !!engine.alt, t0, t1: t0 + span, dt: span / steps, steps, label,
  };
}

export interface ReplaySample {
  t: number;
  base: Readout;
  alt: Readout | null;
}

/** One run of a plan. Call `next()` once per frame. */
export class Replay {
  readonly plan: ReplayPlan;
  base: BaseWorld;
  alt: BaseWorld | null = null;
  params: Params;
  ui: InteractionState;
  frame = 0;
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
    this.sample();
  }

  get done(): boolean {
    return this.frame >= this.plan.steps;
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

  /** Advance one frame. */
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
    this.sample();
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
 * 3–5 key moments for slides, as frame indices: frames with what-if-only or no-change-only events first,
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
