import type { AnySandbox, BaseWorld, InteractionState, Params, Readout } from "./types";
import { chip, FONT } from "./draw";

export const DEFAULT_SEED = 20261101;
const MAX_HISTORY = 600;
const SAMPLE_EVERY = 0.2; // real seconds

export interface History {
  t: number[];
  base: Record<string, (number | null)[]>;
  alt: Record<string, (number | null)[]>;
  forkT: number | null;
}

export interface TimelineItem {
  t: number;
  txt: string;
  who: "both" | "base" | "alt";
}

export interface StageRect {
  x: number; y: number; w: number; h: number;
  world: BaseWorld;
  alt: boolean;
}

/**
 * Runs one sandbox: a baseline world and, after a fork, a what-if world stepping in lockstep.
 * Framework-free so it can be unit-tested and later moved into a Web Worker.
 */
export class SimEngine {
  readonly sb: AnySandbox;
  params: Params;
  base!: BaseWorld;
  alt: BaseWorld | null = null;
  whatIf: string | null = null;
  history!: History;
  speedIdx: number;
  playing = true;
  readonly ui: InteractionState = { drag: null, cams: [null, null], pending: null };
  private acc = 0;

  constructor(sb: AnySandbox, params: Params, private seed = DEFAULT_SEED) {
    this.sb = sb;
    this.params = params;
    this.speedIdx = sb.defaultSpeed;
    this.restart();
  }

  get speed(): number {
    return this.sb.speeds[this.speedIdx][0];
  }

  restart(): void {
    this.base = this.sb.init(this.params, this.seed);
    this.alt = null;
    this.whatIf = null;
    this.history = { t: [], base: {}, alt: {}, forkT: null };
    for (const m of this.sb.metrics) { this.history.base[m.k] = []; this.history.alt[m.k] = []; }
    this.sample();
  }

  /** Clone the baseline right now and apply a what-if to the clone. */
  fork(id: string): void {
    this.alt = structuredClone(this.base);
    this.sb.apply(this.alt, id, this.params, this.ui);
    this.whatIf = id;
    this.history.forkT = this.base.t;
    for (const m of this.sb.metrics) this.history.alt[m.k] = this.history.t.map(() => null);
    this.sample();
    this.playing = true;
  }

  /** Apply an extra change to the existing what-if world without re-forking. */
  applyToAlt(id: string): void {
    if (!this.alt) return this.fork(id);
    this.sb.apply(this.alt, id, this.params, this.ui);
  }

  dropFork(): void {
    this.alt = null;
    this.whatIf = null;
    this.history.forkT = null;
    for (const m of this.sb.metrics) this.history.alt[m.k] = this.history.t.map(() => null);
  }

  setParam(id: string, value: number | string): { restarted: boolean } {
    let p: Params = { ...this.params, [id]: value };
    if (this.sb.onParamChange) p = this.sb.onParamChange(p, id);
    this.params = p;
    const ctl = this.sb.controls.find((c) => c.type !== "heading" && c.id === id);
    const live = ctl && ctl.type !== "heading" && ctl.live;
    return { restarted: !live };
  }

  /** Advance by real seconds. */
  tick(dtReal: number): void {
    if (!this.playing) return;
    if (this.sb.maxT != null && this.base.t >= this.sb.maxT) return;
    const dt = dtReal * this.speed;
    this.sb.step(this.base, dt, this.params);
    if (this.alt) this.sb.step(this.alt, dt, this.params);
    this.acc += dtReal;
    if (this.acc >= SAMPLE_EVERY) { this.acc = 0; this.sample(); }
  }

  sample(): void {
    const rb = this.sb.read(this.base, this.params);
    const ra = this.alt ? this.sb.read(this.alt, this.params) : null;
    const h = this.history;
    h.t.push(this.base.t);
    for (const m of this.sb.metrics) { h.base[m.k].push(rb[m.k]); h.alt[m.k].push(ra ? ra[m.k] : null); }
    if (h.t.length > MAX_HISTORY) {
      const keep = <T,>(a: T[]) => a.filter((_, i) => i % 2 === 0);
      h.t = keep(h.t);
      for (const m of this.sb.metrics) { h.base[m.k] = keep(h.base[m.k]); h.alt[m.k] = keep(h.alt[m.k]); }
    }
  }

  readouts(): { base: Readout; alt: Readout | null } {
    return { base: this.sb.read(this.base, this.params), alt: this.alt ? this.sb.read(this.alt, this.params) : null };
  }

  whatIfLabel(): string {
    if (this.whatIf === "throw") return "Throw in a planet";
    return this.sb.whatifs.find((x) => x[0] === this.whatIf)?.[1] ?? "";
  }

  /** Merge both worlds' logs: shared history, base-only and what-if-only events. */
  timeline(limit = 40): TimelineItem[] {
    const B = this.base.log, A = this.alt?.log ?? [];
    const tol = 1e-6 + Math.abs(this.base.t) * 0.03;
    const same = (x: { t: number; txt: string }, y: { t: number; txt: string }) => x.txt === y.txt && Math.abs(x.t - y.t) < tol;
    const items: TimelineItem[] = [];
    for (const e of B) items.push({ ...e, who: !this.alt || A.some((a) => same(a, e)) ? "both" : "base" });
    for (const e of A) if (!B.some((b) => same(b, e))) items.push({ ...e, who: "alt" });
    return items.sort((a, b) => b.t - a.t).slice(0, limit);
  }

  rects(W: number, H: number): StageRect[] {
    if (!this.alt) return [{ x: 0, y: 0, w: W, h: H, world: this.base, alt: false }];
    const g = 6;
    return W >= 640
      ? [{ x: 0, y: 0, w: (W - g) / 2, h: H, world: this.base, alt: false }, { x: (W + g) / 2, y: 0, w: (W - g) / 2, h: H, world: this.alt, alt: true }]
      : [{ x: 0, y: 0, w: W, h: (H - g) / 2, world: this.base, alt: false }, { x: 0, y: (H + g) / 2, w: W, h: (H - g) / 2, world: this.alt, alt: true }];
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = "#05070F";
    ctx.fillRect(0, 0, W, H);
    for (const r of this.rects(W, H)) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.beginPath(); ctx.rect(0, 0, r.w, r.h); ctx.clip();
      this.sb.draw({ ctx, w: r.w, h: r.h, p: this.params, isAlt: r.alt, ui: this.ui }, r.world);
      const label = r.alt ? "What if: " + this.whatIfLabel() : this.alt ? "No change" : "Now · pick a what-if to fork this world";
      const lw = chip(ctx, label, 8, 8, r.alt ? "#FFC857" : "#C9CFEA", "600 12px " + FONT.body, r.w - 32);
      const time = this.sb.fmtT(r.world.t);
      ctx.font = "12px " + FONT.mono;
      const tw = ctx.measureText(time).width;
      if (r.w > lw + tw + 50) chip(ctx, time, r.w - tw - 24, 8, "#E7EAF6", "12px " + FONT.mono);
      ctx.restore();
    }
  }
}
