/**
 * One analysis of a plan, reused by the preview and every export (change 0022). It runs the replay once, keeps a
 * snapshot every few steps, and can then hand out a replay at any frame of the clip quickly. Framework-free.
 */
import { clipFrames, clipPhase, frameSteps, keyMetric, Replay, type ReplayPlan, type ReplaySample, type ReplaySnapshot, type ReplaySummary } from "./replay";

export interface Analysis {
  plan: ReplayPlan;
  summary: ReplaySummary;
  /** Every sample of the shown part. */
  samples: ReplaySample[];
  /** Shown sim step per running frame. */
  map: Int32Array;
}

export class Scrubber {
  readonly plan: ReplayPlan;
  private snaps: ReplaySnapshot[] = [];
  private every: number;
  private live: Replay;
  result: Analysis | null = null;

  constructor(plan: ReplayPlan) {
    this.plan = plan;
    // About 60 snapshots across the run, at least every 20 steps
    this.every = Math.max(20, Math.ceil((plan.pre + plan.steps) / 60));
    this.live = new Replay(plan);
    this.snaps.push(this.live.snapshot());
  }

  get progress(): number {
    return this.live.frame / Math.max(1, this.plan.pre + this.plan.steps);
  }

  /** Run a slice of the analysis (up to `budgetMs`); returns true when finished. */
  work(budgetMs = 16): boolean {
    if (this.result) return true;
    const r = this.live;
    const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
    const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
    while (!r.done) {
      r.next();
      if (r.frame % this.every === 0) this.snaps.push(r.snapshot());
      if (now() - t0 > budgetMs) return false;
    }
    const end = r.samples[r.samples.length - 1];
    const summary = { end, metric: keyMetric(this.plan.sb, end), events: r.timeline() };
    this.result = { plan: this.plan, summary, samples: r.samples, map: frameSteps(this.plan, summary.events) };
    return true;
  }

  /** Finish synchronously (tests, small plans). */
  finish(): Analysis {
    while (!this.work(1e9)) { /* keep going */ }
    return this.result!;
  }

  /** A replay standing at clip frame `frame` (needs the analysis finished). */
  at(frame: number): Replay {
    const a = this.result;
    if (!a) return new Replay(this.plan);
    const ph = clipPhase(this.plan, Math.max(0, Math.min(clipFrames(this.plan) - 1, frame)));
    const shown = ph.at === "intro" ? 0 : ph.at === "outro" ? this.plan.steps : a.map[ph.i];
    return this.atStep(shown);
  }

  /** A replay standing `shown` sim steps into the shown part. */
  atStep(shown: number): Replay {
    const a = this.result;
    const target = this.plan.pre + shown;
    let best = this.snaps[0];
    for (const s of this.snaps) if (s.frame <= target && s.frame >= best.frame) best = s;
    const r = Replay.restore(this.plan, best, a ? a.samples : []);
    r.seek(shown);
    return r;
  }
}
