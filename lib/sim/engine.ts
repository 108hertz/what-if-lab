import type { AnySandbox, BaseWorld, InteractionState, Params, Readout } from "./types";
import { chip, FONT, STAGE } from "./draw";

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
  /** What-ifs applied to the changed world, in order (one entry unless the sandbox stacks). */
  applied: string[] = [];
  history!: History;
  speedIdx: number;
  playing = true;
  readonly ui: InteractionState = { drag: null, cams: [null, null], pending: null };
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

  restart(): void {
    this.base = this.sb.init(this.params, this.seed);
    this.alt = null;
    this.whatIf = null;
    this.applied = [];
    this.history = { t: [], base: {}, alt: {}, forkT: null };
    for (const m of this.sb.metrics) { this.history.base[m.k] = []; this.history.alt[m.k] = []; }
    this.sample();
  }

  /** Clone the baseline right now and apply a what-if to the clone. */
  fork(id: string): void {
    this.alt = structuredClone(this.base);
    this.sb.apply(this.alt, id, this.params, this.ui);
    this.whatIf = id;
    this.applied = [id];
    this.history.forkT = this.base.t;
    for (const m of this.sb.metrics) this.history.alt[m.k] = this.history.t.map(() => null);
    this.sample();
    this.playing = true;
  }

  /** Apply an extra change to the existing what-if world without re-forking. */
  applyToAlt(id: string): void {
    if (!this.alt) return this.fork(id);
    this.sb.apply(this.alt, id, this.params, this.ui);
    this.applied.push(id);
  }

  /** A what-if click: re-forks in split worlds; adds to the changed world in stacking ones. */
  change(id: string): void {
    if (this.sb.stack && this.alt) { this.applyToAlt(id); this.playing = true; }
    else this.fork(id);
  }

  dropFork(): void {
    this.alt = null;
    this.whatIf = null;
    this.applied = [];
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

  labelOf(id: string): string {
    if (id === "throw") return "Throw in a planet";
    return this.sb.whatifs.find((x) => x[0] === id)?.[1] ?? "";
  }

  /** "A", or for stacked changes "A + B ×2 + C" in first-applied order. */
  whatIfLabel(): string {
    const ids = this.applied.length ? this.applied : this.whatIf ? [this.whatIf] : [];
    const n = new Map<string, number>();
    for (const id of ids) n.set(id, (n.get(id) ?? 0) + 1);
    return [...n].map(([id, k]) => this.labelOf(id) + (k > 1 ? " ×" + k : "")).join(" + ");
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
    if (this.sb.stack) return [{ x: 0, y: 0, w: W, h: H, world: this.alt ?? this.base, alt: !!this.alt }];
    if (!this.alt) return [{ x: 0, y: 0, w: W, h: H, world: this.base, alt: false }];
    const g = 6;
    return W >= 640
      ? [{ x: 0, y: 0, w: (W - g) / 2, h: H, world: this.base, alt: false }, { x: (W + g) / 2, y: 0, w: (W - g) / 2, h: H, world: this.alt, alt: true }]
      : [{ x: 0, y: 0, w: W, h: (H - g) / 2, world: this.base, alt: false }, { x: 0, y: (H + g) / 2, w: W, h: (H - g) / 2, world: this.alt, alt: true }];
  }

  draw(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = STAGE.void;
    ctx.fillRect(0, 0, W, H);
    for (const r of this.rects(W, H)) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.beginPath(); ctx.rect(0, 0, r.w, r.h); ctx.clip();
      this.sb.draw({ ctx, w: r.w, h: r.h, p: this.params, isAlt: r.alt, ui: this.ui, base: r.alt && this.sb.stack ? this.base : undefined }, r.world);
      const label = r.alt
        ? (this.sb.stack ? "Changed: " : "What if: ") + this.whatIfLabel()
        : this.alt ? "No change" : this.sb.stack ? "Now · pick changes to make" : "Now · pick a what-if to fork this world";
      const lw = chip(ctx, label.toUpperCase(), 8, 8, r.alt ? STAGE.alt : STAGE.base, "500 12px " + FONT.body, r.w - 32);
      const time = this.sb.fmtT(r.world.t);
      ctx.font = "500 12px " + FONT.mono;
      const tw = ctx.measureText(time).width;
      if (r.w > lw + tw + 50) chip(ctx, time, r.w - tw - 24, 8, STAGE.ink, "500 12px " + FONT.mono);
      ctx.restore();
    }
    if (this.alt && !this.sb.stack) {
      // Dashed hairline in the split gap
      const v = W >= 640;
      ctx.strokeStyle = STAGE.line; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      ctx.beginPath();
      if (v) { ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); } else { ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); }
      ctx.stroke(); ctx.setLineDash([]);
    }
  }
}
