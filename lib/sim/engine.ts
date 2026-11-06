import type { AnySandbox, BaseWorld, InteractionState, Params, Readout } from "./types";
import { chip, FONT, STAGE, channelTag } from "./draw";
import { defaultParams } from "./core";

export const DEFAULT_SEED = 20261101;
const MAX_HISTORY = 600;
const SAMPLE_EVERY = 0.2; // real seconds

export interface History {
  t: number[];
  /** Per sample: live steps since the first change (-1 before it) and how many changes had been made, so a replay can rewrite it. */
  n: number[];
  e: number[];
  base: Record<string, (number | null)[]>;
  alt: Record<string, (number | null)[]>;
  forkT: number | null;
}

export interface TimelineItem {
  t: number;
  txt: string;
  who: "both" | "base" | "alt";
}

/** One change as it was made, so exports can re-run the fork exactly (change 0020). */
export interface ChangeRecord {
  /** Sim time of the changed world when the change was made. */
  t: number;
  id: string;
  params: Params;
  ui: InteractionState;
}

/** Recipe to re-run the fork from its start: the no-change world just before the first change that is on, then every change that is on. */
export interface ReplayOrigin {
  world: BaseWorld;
  changes: ChangeRecord[];
}

/** Merge two worlds' logs into one timeline: shared history, no-change-only and what-if-only events. */
export function mergeTimeline(B: BaseWorld["log"], A: BaseWorld["log"] | null, now: number, limit = 40): TimelineItem[] {
  const tol = 1e-6 + Math.abs(now) * 0.03;
  const same = (x: { t: number; txt: string }, y: { t: number; txt: string }) => x.txt === y.txt && Math.abs(x.t - y.t) < tol;
  const alt = A ?? [];
  const items: TimelineItem[] = [];
  for (const e of B) items.push({ ...e, who: !A || alt.some((a) => same(a, e)) ? "both" : "base" });
  for (const e of alt) if (!B.some((b) => same(b, e))) items.push({ ...e, who: "alt" });
  return items.sort((a, b) => b.t - a.t).slice(0, limit);
}

/** One change in the list (change 0024): made once, ticked on or off any number of times. */
export interface ChangeEntry {
  /** Stable id for UI lists. */
  key: number;
  rec: ChangeRecord;
  on: boolean;
  /** Live sim steps taken since the first change when this one was made. */
  at: number;
}

export interface StageRect {
  x: number; y: number; w: number; h: number;
  world: BaseWorld;
  alt: boolean;
}

const clone = <T,>(x: T): T => structuredClone(x);

/**
 * Runs one sandbox: the no-change world and, once a change is made, the changed world stepping in lockstep
 * (change 0024: every world stacks its changes into one changed world; the stage always shows one world).
 *
 * Every change stays in `entries` and can be ticked off and on again. The engine logs every live step (its dt and
 * the params in force), so ticking a change off re-runs the changed world from just before that change with exactly
 * the same steps: the result is the world as if the change had never been made, bit for bit.
 * Framework-free so it can be unit-tested and later moved into a Web Worker.
 */
export class SimEngine {
  readonly sb: AnySandbox;
  params: Params;
  base!: BaseWorld;
  alt: BaseWorld | null = null;
  /** Every change made since the last reset, in order, each on or off. */
  entries: ChangeEntry[] = [];
  history!: History;
  speedIdx: number;
  playing = true;
  readonly ui: InteractionState = { drag: null, cams: [null, null], pending: null };
  /** Per entry: the changed world just before it (as it is with the changes before it that are on), and the no-change world then. */
  private snaps: BaseWorld[] = [];
  private bsnaps: BaseWorld[] = [];
  /** Every live step since the first change: its dt, and the params in force from a step on. */
  private dts: number[] = [];
  private plog: { at: number; params: Params }[] = [];
  private nextKey = 1;
  private acc = 0;

  constructor(sb: AnySandbox, params: Params, readonly seed = DEFAULT_SEED) {
    this.sb = sb;
    this.params = params;
    this.speedIdx = sb.defaultSpeed;
    this.restart();
  }

  get speed(): number {
    return this.sb.speeds[this.speedIdx][0];
  }

  /** What-ifs that are on, in the order they were made. */
  get applied(): string[] {
    return this.entries.filter((e) => e.on).map((e) => e.rec.id);
  }

  /** How to re-run the current changes from their start (exports). Null with no change on; the simulation never reads it. */
  get origin(): ReplayOrigin | null {
    const k = this.entries.findIndex((e) => e.on);
    if (k < 0) return null;
    return { world: this.snaps[k], changes: this.entries.filter((e) => e.on).map((e) => e.rec) };
  }

  /** Start again from time 0 with the current settings: no changes, empty history. */
  restart(): void {
    this.base = this.sb.init(this.params, this.seed);
    this.clearChanges();
    this.history = { t: [], n: [], e: [], base: {}, alt: {}, forkT: null };
    for (const m of this.sb.metrics) { this.history.base[m.k] = []; this.history.alt[m.k] = []; }
    this.acc = 0;
    this.sample();
  }

  /** Reset everything (change 0024): default settings and speed, no changes, time 0, empty history and timeline. */
  reset(): void {
    this.params = defaultParams(this.sb);
    this.speedIdx = this.sb.defaultSpeed;
    this.playing = true;
    this.ui.drag = null; this.ui.pending = null; this.ui.cams = [null, null];
    this.restart();
  }

  private clearChanges(): void {
    this.alt = null;
    this.entries = [];
    this.snaps = []; this.bsnaps = [];
    this.dts = []; this.plog = [];
  }

  /** Make a change: it adds to the changed world (or starts one from the no-change world) and goes on the list. */
  change(id: string): void {
    if (!this.plog.length) {
      this.dts = [];
      this.plog = [{ at: 0, params: { ...this.params } }];
    }
    const at = this.dts.length;
    this.snaps.push(clone(this.alt ?? this.base));
    this.bsnaps.push(clone(this.base));
    const rec = this.record((this.alt ?? this.base).t, id);
    if (!this.alt) this.alt = clone(this.base);
    this.sb.apply(this.alt, id, this.params, this.ui);
    this.entries.push({ key: this.nextKey++, rec, on: true, at });
    this.syncForkT();
    this.sample();
    this.playing = true;
  }

  /** Kept for older callers: same as `change`. */
  fork(id: string): void { this.change(id); }
  applyToAlt(id: string): void { this.change(id); }

  private record(t: number, id: string): ChangeRecord {
    return { t, id, params: { ...this.params }, ui: clone(this.ui) };
  }

  private index(key: number): number {
    return this.entries.findIndex((e) => e.key === key);
  }

  /** Tick a change on or off. Off = the world as if it had never been made; on again = as if it had always stayed. */
  setOn(key: number, on: boolean): void {
    const i = this.index(key);
    if (i < 0 || this.entries[i].on === on) return;
    this.entries[i].on = on;
    this.replayFrom(i);
  }

  toggle(key: number): void {
    const e = this.entries[this.index(key)];
    if (e) this.setOn(key, !e.on);
  }

  /** Turn every change on or off at once. */
  setAll(on: boolean): void {
    const i = this.entries.findIndex((e) => e.on !== on);
    if (i < 0) return;
    for (const e of this.entries) e.on = on;
    this.replayFrom(i);
  }

  /** Take a change off the list for good. Removing the last one goes back to no changes. */
  remove(key: number): void {
    const i = this.index(key);
    if (i < 0) return;
    if (this.entries.length === 1) return this.dropFork();
    const from = this.snaps[i], n0 = this.entries[i].at;
    this.entries.splice(i, 1); this.snaps.splice(i, 1); this.bsnaps.splice(i, 1);
    const h = this.history;
    for (let j = 0; j < h.e.length; j++) if (h.e[j] > i) h.e[j]--;
    this.replayFromState(i, from, n0);
  }

  /** Change the settings a change was made with (e.g. the child world's "stop at" or "when"), then re-run from it. */
  edit(key: number, patch: Params): void {
    const i = this.index(key);
    if (i < 0) return;
    const e = this.entries[i];
    e.rec = { ...e.rec, params: { ...e.rec.params, ...patch } };
    this.replayFrom(i);
  }

  /** Undo all changes: back to the running no-change world, list empty. */
  dropFork(): void {
    this.clearChanges();
    const h = this.history;
    h.forkT = null;
    for (const m of this.sb.metrics) h.alt[m.k] = h.t.map(() => null);
  }

  setParam(id: string, value: number | string): { restarted: boolean } {
    let p: Params = { ...this.params, [id]: value };
    if (this.sb.onParamChange) p = this.sb.onParamChange(p, id);
    this.params = p;
    if (this.plog.length) {
      const at = this.dts.length, last = this.plog[this.plog.length - 1];
      if (last.at === at) last.params = { ...p };
      else this.plog.push({ at, params: { ...p } });
    }
    const ctl = this.sb.controls.find((c) => c.type !== "heading" && c.id === id);
    const live = ctl && ctl.type !== "heading" && ctl.live;
    return { restarted: !live };
  }

  /** Advance by real seconds. */
  tick(dtReal: number): void {
    if (!this.playing) return;
    if (this.sb.maxT != null && this.base.t >= this.sb.maxT) return;
    const dt = dtReal * this.speed * (this.sb.pace?.() ?? 1);
    this.sb.step(this.base, dt, this.params);
    if (this.alt) this.sb.step(this.alt, dt, this.params);
    if (this.plog.length) this.dts.push(dt);
    this.acc += dtReal;
    if (this.acc >= SAMPLE_EVERY) { this.acc = 0; this.sample(); }
  }

  sample(): void {
    const rb = this.sb.read(this.base, this.params);
    const ra = this.alt ? this.sb.read(this.alt, this.params) : null;
    const h = this.history;
    h.t.push(this.base.t);
    h.n.push(this.plog.length ? this.dts.length : -1);
    h.e.push(this.entries.length);
    for (const m of this.sb.metrics) { h.base[m.k].push(rb[m.k]); h.alt[m.k].push(ra ? ra[m.k] : null); }
    if (h.t.length > MAX_HISTORY) {
      const keep = <T,>(a: T[]) => a.filter((_, i) => i % 2 === 0);
      h.t = keep(h.t); h.n = keep(h.n); h.e = keep(h.e);
      for (const m of this.sb.metrics) { h.base[m.k] = keep(h.base[m.k]); h.alt[m.k] = keep(h.alt[m.k]); }
    }
  }

  // ——— Replay (change 0024) ———

  private paramsAt(n: number, from = 0): [Params, number] {
    let j = from;
    while (j + 1 < this.plog.length && this.plog[j + 1].at <= n) j++;
    return [this.plog[j].params, j];
  }

  private replayFrom(i: number): void {
    this.replayFromState(i, this.snaps[i], this.entries[i].at);
  }

  /**
   * Re-run the changed world from `w` (the changed world at live step n0, just before entry k0) to now, applying the
   * entries that are on at the steps they were made, with the logged dts and params. Rewrites the snapshots from k0 on
   * and the changed world's history from there.
   */
  private replayFromState(k0: number, w: BaseWorld, n0: number): void {
    const E = this.entries;
    if (!E.slice(0, k0).some((e) => e.on)) {
      // Nothing on before k0: the changed world is the no-change world up to the next change that is on
      const f = E.findIndex((e, k) => k >= k0 && e.on);
      for (let k = k0; k < (f < 0 ? E.length : f); k++) this.snaps[k] = this.bsnaps[k];
      if (f < 0 || f > k0) this.nullAltFrom(n0, k0);
      if (f < 0) { this.alt = null; this.syncForkT(); return; }
      this.run(f, clone(this.bsnaps[f]), E[f].at);
    } else {
      this.run(k0, clone(w), n0);
    }
    this.syncForkT();
  }

  private nullAltFrom(n0: number, k0: number): void {
    const h = this.history;
    for (let j = 0; j < h.t.length; j++) {
      if (h.n[j] < 0 || h.n[j] < n0 || (h.n[j] === n0 && h.e[j] < k0)) continue;
      for (const m of this.sb.metrics) h.alt[m.k][j] = null;
    }
  }

  /** Step `w` from live step n0 (just before entry k0) to now; it becomes the changed world. */
  private run(k0: number, w: BaseWorld, n0: number): void {
    const E = this.entries, N = this.dts.length, h = this.history, sb = this.sb;
    let any = E.slice(0, k0).some((e) => e.on);
    let si = 0;
    while (si < h.t.length && (h.n[si] < 0 || h.n[si] < n0 || (h.n[si] === n0 && h.e[si] < k0))) si++;
    const write = (n: number, k: number) => {
      while (si < h.t.length && (h.n[si] < n || (h.n[si] === n && h.e[si] <= k))) {
        const r = any ? sb.read(w, this.paramsAt(h.n[si])[0]) : null;
        for (const m of sb.metrics) h.alt[m.k][si] = r ? r[m.k] : null;
        si++;
      }
    };
    let k = k0, n = n0, pj = 0, p: Params;
    for (;;) {
      write(n, k);
      while (k < E.length && E[k].at === n) {
        this.snaps[k] = clone(w);
        if (E[k].on) { sb.apply(w, E[k].rec.id, { ...E[k].rec.params }, clone(E[k].rec.ui)); any = true; }
        k++;
        write(n, k);
      }
      if (n >= N) break;
      [p, pj] = this.paramsAt(n, pj);
      sb.step(w, this.dts[n], p);
      n++;
    }
    this.alt = any ? w : null;
  }

  private syncForkT(): void {
    const f = this.entries.find((e) => e.on);
    this.history.forkT = f ? f.rec.t : null;
  }

  readouts(): { base: Readout; alt: Readout | null } {
    return { base: this.sb.read(this.base, this.params), alt: this.alt ? this.sb.read(this.alt, this.params) : null };
  }

  labelOf(id: string): string {
    if (id === "throw") return "Throw in a planet";
    return this.sb.whatifs.find((x) => x[0] === id)?.[1] ?? "";
  }

  /** "A", or for several changes "A + B ×2 + C" in first-made order (changes that are on). */
  whatIfLabel(): string {
    const n = new Map<string, number>();
    for (const id of this.applied) n.set(id, (n.get(id) ?? 0) + 1);
    return [...n].map(([id, k]) => this.labelOf(id) + (k > 1 ? " ×" + k : "")).join(" + ");
  }

  /** Merge both worlds' logs: shared history, base-only and what-if-only events. */
  timeline(limit = 40): TimelineItem[] {
    return mergeTimeline(this.base.log, this.alt?.log ?? null, this.base.t, limit);
  }

  /** The stage is never split (change 0024): one rect, the changed world when there is one. */
  rects(W: number, H: number): StageRect[] {
    return [{ x: 0, y: 0, w: W, h: H, world: this.alt ?? this.base, alt: !!this.alt }];
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = STAGE.void;
    ctx.fillRect(0, 0, W, H);
    const world = this.alt ?? this.base, alt = !!this.alt;
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    this.sb.draw({ ctx, w: W, h: H, p: this.params, isAlt: alt, ui: this.ui, base: alt ? this.base : undefined }, world);
    const label = alt ? "Changed: " + this.whatIfLabel() : this.entries.length ? "No change · your changes are off" : "Now · pick changes to make";
    // Channel tag (● no change / ◆ with changes) left, the world clock right
    const lw = channelTag(ctx, label.toUpperCase(), 8, 8, alt, W - 60);
    const time = this.sb.fmtT(world.t);
    ctx.font = "500 12px " + FONT.mono;
    const tw = ctx.measureText(time).width;
    if (W > lw + tw + 50) chip(ctx, time, W - tw - 24, 8, STAGE.ink, "500 12px " + FONT.mono);
    ctx.restore();
  }
}
