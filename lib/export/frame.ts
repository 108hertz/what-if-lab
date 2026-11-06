/**
 * Export frames, stills and slides drawn on a plain 2D canvas (change 0020, styled in change 0022).
 * Framework-free: the sandbox's own `draw()` paints each world at the export's size, then the text layers go
 * around it. Every colour and font comes from the export style; wrap each draw call in `paint(style, fn)`.
 * Outside `paint` the Control Room defaults are used (tests, and anything that draws without a style).
 *
 * Every function works in logical units; callers scale the context (×2) for 1080p output.
 */
import { channelTag, chip, FONT, STAGE } from "../sim/draw";
import { fmtNum } from "../sim/core";
import type { Control, Metric } from "../sim/types";
import { type Replay, type ReplayPlan, type ReplaySample, type ReplaySummary } from "./replay";
import {
  FONT_FAMILIES, LAYER_IDS, NO_GRADE, SIZES, THEMES, chartRect, colorOf, isNeutral, stageRect,
  type ExportStyle, type Grade, type Layer, type LayerId, type Palette, type Split,
} from "./style";

export const SLIDE_SIZE = { W: 1920, H: 1080, w: 960, h: 540 };
export const EXPORT_SCALE = 2;
/** Frames the opening title takes to fade once the run starts, and the result card to fade in. */
export const FADE_FRAMES = 15;
const OUTRO_FADE = 12;

// ——— The paint state: palette, fonts and grade of the style being drawn ———

const C: Palette = { ...THEMES.control.colors };
const F = { title: FONT.display, body: FONT.body, num: FONT.mono };
let G: Grade = NO_GRADE;

/**
 * Draw with a style. Swaps the export palette and fonts, and the shared stage palette (`STAGE`, `FONT`) so worlds
 * pick up the chosen world colours and fonts too, for the duration of one synchronous call; always restored,
 * so the live stage never sees them.
 */
export function paint<T>(style: ExportStyle, fn: () => T): T {
  const sc = { ...C }, sf = { ...F }, sg = G, sStage = { ...STAGE }, sFont = { ...FONT };
  Object.assign(C, style.colors);
  const defaultFonts = style.fonts.title === "condensed" && style.fonts.body === "site";
  F.title = defaultFonts ? FONT.display : FONT_FAMILIES[style.fonts.title];
  F.body = defaultFonts ? FONT.body : FONT_FAMILIES[style.fonts.body];
  // Numbers stay in mono with the site's fonts; with chosen fonts they follow the title face.
  F.num = defaultFonts ? FONT.mono : F.title;
  G = style.grade;
  Object.assign(STAGE, {
    void: style.colors.stage, ink: style.colors.stageInk, base: style.colors.base, alt: style.colors.alt,
    good: style.colors.good, bad: style.colors.bad, scrim: style.colors.chip,
  });
  if (!defaultFonts) Object.assign(FONT, { body: F.body, display: F.title });
  try {
    return fn();
  } finally {
    Object.assign(C, sc); Object.assign(F, sf); G = sg;
    Object.assign(STAGE, sStage); Object.assign(FONT, sFont);
  }
}

/** #RRGGBB(AA) with a new alpha. */
function alpha(hex: string, a: number): string {
  const h = hex.length >= 7 ? hex.slice(0, 7) : "#000000";
  return h + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
}

// ——— Text helpers ———

type Weight = 400 | 500 | 600 | 700;

/** Greedy word wrap; the last allowed line gets an ellipsis if text remains. Honours "\n". */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = Infinity): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    const words = para.split(/\s+/).filter(Boolean);
    let line = "";
    for (let i = 0; i < words.length; i++) {
      const next = line ? line + " " + words[i] : words[i];
      if (ctx.measureText(next).width <= maxW || !line) { line = next; continue; }
      out.push(line);
      line = words[i];
      if (out.length === maxLines) { out[maxLines - 1] = clip(ctx, out[maxLines - 1] + " " + words.slice(i).join(" "), maxW); return out; }
    }
    if (line) out.push(line);
    if (out.length >= maxLines) { out.length = maxLines; return out; }
  }
  return out;
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

/** Naming voice: an uppercase label (letters, no lowercase) is set in the title face at 600. */
const isLabel = (s: string) => /[A-Z]/.test(s) && s === s.toUpperCase();
const fontStr = (px: number, weight: Weight, family: string) => `${weight} ${px}px ${family}`;

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, color: string, weight: 400 | 500 = 400, align: CanvasTextAlign = "left") {
  ctx.font = weight === 500 && isLabel(s) ? fontStr(px, 600, F.title) : fontStr(px, weight, F.body);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}

function lines(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, px: number, lh: number, color: string, weight: 400 | 500 = 400, maxLines = Infinity): number {
  ctx.font = fontStr(px, weight, F.body);
  const ls = wrap(ctx, s, maxW, maxLines);
  ls.forEach((l, i) => text(ctx, l, x, y + i * px * lh, px, color, weight));
  return ls.length * px * lh;
}

function dashed(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color = C.line) {
  ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
}

/** A metric value, formatted the way the world formats it, with its unit when the formatter leaves it out. */
export function fmtMetric(m: Metric, v: number | null | undefined): string {
  if (v == null || !isFinite(v)) return "—";
  const s = m.fmt(v);
  return m.unit && !s.includes(m.unit) ? `${s} ${m.unit}` : s;
}

/** "4 fewer people out of 100 are poor", or a signed difference; `good` says whether it is better. */
export function describeDiff(m: Metric, end: ReplaySample): { txt: string; good: boolean | null } | null {
  if (!end.alt) return null;
  const b = end.base[m.k], a = end.alt[m.k];
  if (b == null || a == null || !isFinite(a) || !isFinite(b)) return null;
  const d = a - b;
  const sentence = m.diff?.(d);
  const txt = sentence || (Math.abs(d) < 1e-9 ? "No real difference" : "Difference " + (d > 0 ? "+" : "−") + fmtMetric(m, Math.abs(d)).replace(/^-/, ""));
  const good = m.better && Math.abs(d) > 1e-9 ? (m.better === "up" ? d > 0 : d < 0) : null;
  return { txt, good };
}

/** Value of a world control as the Tune panel shows it. */
export function controlValue(c: Exclude<Control, { type: "heading" }>, v: unknown): string {
  if (c.type === "select") return c.options.find(([val]) => val === String(v))?.[1] ?? String(v);
  const d = (String(c.step).split(".")[1] ?? "").length;
  return fmtNum(Number(v), d) + (c.unit ? " " + c.unit : "");
}

// ——— Colour grade ———

let filterOk: boolean | null = null;
/** Whether this browser applies `ctx.filter` (brightness, contrast, saturation, hue). Warmth and vignette work everywhere. */
export function gradeSupported(): boolean {
  if (filterOk != null) return filterOk;
  try {
    if (typeof document === "undefined") return (filterOk = false);
    const c = document.createElement("canvas").getContext("2d");
    if (!c || !("filter" in c)) return (filterOk = false);
    c.filter = "brightness(1.5)";
    filterOk = c.filter === "brightness(1.5)";
  } catch { filterOk = false; }
  return filterOk;
}

function filterOf(g: Grade): string {
  const parts: string[] = [];
  if (g.brightness) parts.push(`brightness(${(1 + g.brightness * 0.6).toFixed(3)})`);
  if (g.contrast) parts.push(`contrast(${(1 + g.contrast * 0.7).toFixed(3)})`);
  if (g.saturation) parts.push(`saturate(${Math.max(0, 1 + g.saturation).toFixed(3)})`);
  if (g.hue) parts.push(`hue-rotate(${Math.round(g.hue)}deg)`);
  return parts.join(" ");
}

type Off = { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: CanvasRenderingContext2D };
const offs = new Map<string, Off>();
function offscreen(W: number, H: number): Off | null {
  const key = `${W}x${H}`;
  const hit = offs.get(key);
  if (hit) return hit;
  let canvas: OffscreenCanvas | HTMLCanvasElement | null = null;
  if (typeof OffscreenCanvas !== "undefined") canvas = new OffscreenCanvas(W, H);
  else if (typeof document !== "undefined") { canvas = document.createElement("canvas"); canvas.width = W; canvas.height = H; }
  const ctx = canvas?.getContext("2d") as CanvasRenderingContext2D | null;
  if (!canvas || !ctx) return null;
  if (offs.size > 6) offs.clear();
  const o = { canvas, ctx };
  offs.set(key, o);
  return o;
}

/** Warmth and vignette over a pane already drawn (clipped by the caller). */
function overlays(ctx: CanvasRenderingContext2D, w: number, h: number, g: Grade) {
  if (g.warmth) {
    ctx.save();
    ctx.globalCompositeOperation = "soft-light";
    ctx.fillStyle = g.warmth > 0 ? `rgba(255,140,40,${(g.warmth * 0.95).toFixed(3)})` : `rgba(60,140,255,${(-g.warmth * 0.95).toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  if (g.vignette > 0) {
    const r = Math.hypot(w, h) / 2;
    const grad = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(1, `rgba(0,0,0,${(g.vignette * 0.8).toFixed(3)})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }
}

// ——— The stage ———

export interface StageOpts {
  hud?: boolean;
  radius?: number;
}

/**
 * The stage: each world drawn by its sandbox in its own clipped rect, graded, with the stage's HUD chips and the
 * dashed seam. `split` picks side by side ("row"), one above the other ("column") or a single world.
 */
export function drawStage(ctx: CanvasRenderingContext2D, r: Replay, x: number, y: number, w: number, h: number, split: Exclude<Split, "auto">, opts: StageOpts = {}) {
  const sb = r.plan.sb;
  const hud = opts.hud ?? true, rad = opts.radius ?? 6;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, rad); ctx.clip();
  ctx.fillStyle = C.stage; ctx.fillRect(x, y, w, h);
  type Pane = { x: number; y: number; w: number; h: number; world: Replay["base"]; alt: boolean };
  const g = 6;
  let panes: Pane[];
  if (sb.stack || !r.alt || split === "alt") panes = [{ x, y, w, h, world: r.alt ?? r.base, alt: !!r.alt }];
  else if (split === "base") panes = [{ x, y, w, h, world: r.base, alt: false }];
  else if (split === "row") panes = [{ x, y, w: (w - g) / 2, h, world: r.base, alt: false }, { x: x + (w + g) / 2, y, w: (w - g) / 2, h, world: r.alt, alt: true }];
  else panes = [{ x, y, w, h: (h - g) / 2, world: r.base, alt: false }, { x, y: y + (h + g) / 2, w, h: (h - g) / 2, world: r.alt, alt: true }];
  const graded = !isNeutral(G);
  const filter = graded ? filterOf(G) : "";
  for (const p of panes) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
    const dc = { w: p.w, h: p.h, p: r.params, isAlt: p.alt, ui: r.ui, base: p.alt && sb.stack ? r.base : undefined };
    const scale = ctx.getTransform().a || 1;
    const off = filter && gradeSupported() ? offscreen(Math.max(1, Math.ceil(p.w * scale)), Math.max(1, Math.ceil(p.h * scale))) : null;
    if (off) {
      off.ctx.setTransform(1, 0, 0, 1, 0, 0);
      off.ctx.clearRect(0, 0, off.canvas.width, off.canvas.height);
      off.ctx.setTransform(scale, 0, 0, scale, 0, 0);
      off.ctx.fillStyle = C.stage; off.ctx.fillRect(0, 0, p.w, p.h);
      sb.draw({ ctx: off.ctx, ...dc }, p.world);
      ctx.filter = filter;
      ctx.drawImage(off.canvas as CanvasImageSource, 0, 0, p.w, p.h);
      ctx.filter = "none";
    } else {
      sb.draw({ ctx, ...dc }, p.world);
    }
    if (graded) overlays(ctx, p.w, p.h, G);
    if (hud) {
      const label = p.alt ? r.plan.label : r.alt ? "No change" : "No change · as it is";
      const lw = channelTag(ctx, label.toUpperCase(), 8, 8, p.alt, p.w - 60);
      const time = sb.fmtT(p.world.t);
      ctx.font = `500 12px ${FONT.mono}`;
      const tw = ctx.measureText(time).width;
      if (p.w > lw + tw + 50) chip(ctx, time, p.w - tw - 24, 8, STAGE.ink, `500 12px ${FONT.mono}`);
    }
    ctx.restore();
  }
  if (panes.length === 2) {
    if (split === "row") dashed(ctx, x + w / 2, y, x + w / 2, y + h);
    else dashed(ctx, x, y + h / 2, x + w, y + h / 2);
  }
  ctx.restore();
  if (rad > 0) {
    ctx.strokeStyle = C.frame; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, rad); ctx.stroke();
  }
}

/** Line chart of one metric over the run: no change solid blue, what-if dashed amber; a cursor at `upTo`. */
export function drawChart(ctx: CanvasRenderingContext2D, samples: ReplaySample[], m: Metric, plan: ReplayPlan, x: number, y: number, w: number, h: number, upTo = samples.length) {
  const s = samples.slice(0, Math.max(2, upTo));
  const all = samples.flatMap((p) => [p.base[m.k], p.alt?.[m.k] ?? null]).filter((v): v is number => v != null && isFinite(v));
  text(ctx, m.label.toUpperCase(), x, y + 10, 10, C.ink2, 500);
  // Legend: a solid and a dashed stroke, so the worlds are told apart without colour
  const lx = x + w;
  const leg = (label: string, col: string, dash: number[], right: number) => {
    ctx.font = fontStr(10, 600, F.title);
    const tw = ctx.measureText(label).width;
    text(ctx, label, right, y + 10, 10, C.ink2, 500, "right");
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(right - tw - 26, y + 6); ctx.lineTo(right - tw - 8, y + 6); ctx.stroke(); ctx.setLineDash([]);
    return right - tw - 40;
  };
  let right = lx;
  if (plan.hasWhatIf) right = leg(plan.sb.stack ? "WITH CHANGES" : "WHAT IF", C.alt, [7, 4], right);
  leg("NO CHANGE", C.base, [], right);
  const T = y + 22, B = y + h - 18;
  if (!all.length) { text(ctx, "No data for this metric yet", x, T + 20, 14, C.ink2); return; }
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  const ticks = (h > 120 ? [0, 1, 2, 3] : [0, 1.5, 3]).map((k) => lo + ((hi - lo) * k) / 3);
  ctx.font = fontStr(12, 500, F.num);
  const L = x + Math.max(...ticks.map((v) => ctx.measureText(m.fmt(v)).width)) + 10;
  const t0 = plan.t0, t1 = Math.max(plan.t1, t0 + 1e-9);
  const X = (t: number) => L + ((x + w - L) * (t - t0)) / (t1 - t0);
  const Y = (v: number) => T + (B - T) * (1 - (v - lo) / (hi - lo));
  const num = (sv: string, xx: number, yy: number, al: CanvasTextAlign) => {
    ctx.font = fontStr(12, 500, F.num); ctx.fillStyle = C.ink2; ctx.textAlign = al; ctx.fillText(sv, xx, yy); ctx.textAlign = "left";
  };
  ctx.strokeStyle = C.line; ctx.lineWidth = 1;
  for (const v of ticks) {
    const yy = Y(v);
    ctx.strokeStyle = C.line;
    ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    num(m.fmt(v), L - 6, yy + 4, "right");
  }
  num(plan.sb.fmtT(t0), L, B + 15, "left");
  num(plan.sb.fmtT(t1), x + w, B + 15, "right");
  const line = (get: (p: ReplaySample) => number | null | undefined, col: string, lw: number, dash: number[]) => {
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.setLineDash(dash); ctx.beginPath();
    let on = false;
    for (const p of s) {
      const v = get(p);
      if (v == null || !isFinite(v)) { on = false; continue; }
      const px = X(p.t), py = Y(v);
      if (on) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      on = true;
    }
    ctx.stroke(); ctx.setLineDash([]);
  };
  line((p) => p.base[m.k], C.base, 2, []);
  line((p) => p.alt?.[m.k], C.alt, 2.5, [7, 4]);
  if (upTo < samples.length && s.length) {
    const t = s[s.length - 1].t;
    dashed(ctx, X(t), T, X(t), B, C.ink2);
  }
}

// ——— Text layers ———

export interface ClipInfo {
  world: string;
  summary: ReplaySummary;
  /** Every sample of the shown part (from the analysis run), so the chart strip keeps one scale. */
  samples?: ReplaySample[];
}

/** Title shown before the run: the what-if as a question-sized line, or what happens next without one. */
export function headline(plan: ReplayPlan, world: string): string {
  return plan.label || `${world}: what happens next?`;
}

/** Fill in {tokens} for a layer's wording. */
export function fillTokens(s: string, plan: ReplayPlan, info: ClipInfo): string {
  const m = info.summary.metric;
  const d = describeDiff(m, info.summary.end);
  const map: Record<string, string> = {
    whatif: headline(plan, info.world), world: info.world, metric: m.label, result: d?.txt ?? "",
    from: plan.sb.fmtT(plan.t0), to: plan.sb.fmtT(plan.t1), seed: String(plan.seed),
  };
  return s.replace(/\{(\w+)\}/g, (all, k: string) => (k in map ? map[k] : all));
}

type Row =
  | { k: "text"; lines: string[]; px: number; lh: number; color: string; font: string }
  | { k: "pair"; px: number; base: string; alt: string | null; altLabel: string; font: string }
  | { k: "gap"; px: number };

function rowHeight(r: Row): number {
  if (r.k === "text") return r.lines.length * r.px * r.lh;
  if (r.k === "pair") return 16 + r.px * 1.05;
  return r.px;
}

function rowWidth(ctx: CanvasRenderingContext2D, r: Row): number {
  if (r.k === "gap") return 0;
  ctx.font = r.font;
  if (r.k === "text") return Math.max(0, ...r.lines.map((l) => ctx.measureText(l).width));
  const bw = Math.max(ctx.measureText(r.base).width, 60);
  return r.alt == null ? bw : bw + r.px + ctx.measureText(r.alt).width;
}

export interface LayerBox { id: LayerId; x: number; y: number; w: number; h: number }

/** Build, place and draw one layer; returns where it went. */
function drawLayer(ctx: CanvasRenderingContext2D, id: LayerId, l: Layer, style: ExportStyle, plan: ReplayPlan, info: ClipInfo, now: ReplaySample, a: number): LayerBox | null {
  const { w: FW, h: FH } = SIZES[style.size];
  const maxW = Math.max(40, l.w * FW);
  const fam = l.font === "title" ? F.title : F.body;
  const weight = (l.font === "title" && l.weight === 500 ? 600 : l.weight) as Weight;
  const color = colorOf(style, l.color);
  const up = (s: string) => (l.upper ? s.toUpperCase() : s);
  const kick = Math.max(10, Math.round(l.size * 0.3));
  const kickFont = fontStr(kick, 600, F.title);
  const m = info.summary.metric;
  const rows: Row[] = [];
  const textRow = (s: string, px: number, col: string, font: string, maxLines: number, lh = 1.08): Row => {
    ctx.font = font;
    return { k: "text", lines: wrap(ctx, s, maxW, maxLines), px, lh, color: col, font };
  };
  const pair = (smp: ReplaySample): Row => ({
    k: "pair", px: l.size, base: fmtMetric(m, smp.base[m.k]), alt: smp.alt ? fmtMetric(m, smp.alt[m.k]) : null,
    altLabel: plan.sb.stack ? "WITH CHANGES" : "WHAT IF", font: fontStr(l.size, weight === 400 ? 500 : weight, F.num),
  });
  const main = fontStr(l.size, weight, fam);
  if (id === "metric") {
    rows.push(textRow(m.label.toUpperCase(), kick, color, kickFont, 1), { k: "gap", px: 8 }, pair(now));
  } else if (id === "intro") {
    rows.push(textRow(plan.fromFork ? `FROM ${plan.sb.fmtT(plan.t0).toUpperCase()}` : "FROM NOW", kick, C.ink2, kickFont, 1), { k: "gap", px: kick * 0.9 });
    rows.push(textRow(up(fillTokens(l.text, plan, info)), l.size, color, main, l.lines, 1.0));
  } else if (id === "outro") {
    const end = info.summary.end;
    rows.push(textRow(`AT ${plan.sb.fmtT(end.t).toUpperCase()}`, kick, C.ink2, kickFont, 1), { k: "gap", px: kick * 0.9 });
    rows.push(textRow(up(m.label), l.size, color, main, 2, 1.0), { k: "gap", px: 12 }, pair(end));
    const body = fillTokens(l.text, plan, info).trim();
    if (body) {
      const d = describeDiff(m, end);
      const col = l.text.trim() === "{result}" && d ? (d.good == null ? C.ink : d.good ? C.good : C.bad) : color;
      const px = Math.max(14, Math.round(l.size * 0.44));
      rows.push({ k: "gap", px: 10 }, textRow(up(body), px, col, fontStr(px, 500, F.body), l.lines, 1.35));
    }
  } else {
    const s = up(fillTokens(l.text, plan, info)).trim();
    if (!s) return null;
    rows.push(textRow(s, l.size, color, main, l.lines));
  }
  const bw = Math.min(maxW, Math.max(...rows.map((r) => rowWidth(ctx, r))));
  const bh = rows.reduce((s, r) => s + rowHeight(r), 0);
  const left = l.x * FW - l.ax * bw, top = l.y * FH - l.ay * bh;
  ctx.save();
  ctx.globalAlpha *= a;
  if (l.box !== "none") {
    const p = Math.max(8, l.size * 0.35);
    ctx.fillStyle = l.box === "solid" ? C.bg : alpha(C.stage, 0.78);
    ctx.beginPath(); ctx.roundRect(left - p, top - p, bw + p * 2, bh + p * 2, 6); ctx.fill();
  }
  const xAt = (rw: number) => (l.align === "left" ? left : l.align === "center" ? left + (bw - rw) / 2 : left + bw - rw);
  let y = top;
  ctx.textBaseline = "alphabetic";
  for (const r of rows) {
    if (r.k === "text") {
      ctx.font = r.font; ctx.fillStyle = r.color;
      r.lines.forEach((ln, i) => ctx.fillText(ln, xAt(ctx.measureText(ln).width), y + r.px * 0.86 + i * r.px * r.lh));
    } else if (r.k === "pair") {
      ctx.font = r.font;
      const bwid = Math.max(ctx.measureText(r.base).width, 60);
      let x = xAt(rowWidth(ctx, r));
      const vy = y + 16 + r.px * 0.86;
      const lab = (s: string, xx: number) => { ctx.font = fontStr(10, 600, F.title); ctx.fillStyle = C.ink2; ctx.fillText(s, xx, y + 10); };
      lab("NO CHANGE", x);
      ctx.font = r.font; ctx.fillStyle = C.base; ctx.fillText(r.base, x, vy);
      if (r.alt != null) {
        x += bwid + r.px;
        lab(r.altLabel, x);
        ctx.font = r.font; ctx.fillStyle = C.alt; ctx.fillText(r.alt, x, vy);
      }
    }
    y += rowHeight(r);
  }
  ctx.restore();
  return { id, x: left, y: top, w: bw, h: bh };
}

/** How visible a layer is at a frame: fades with the title hold, the run and the result hold. */
export function layerAlpha(l: Layer, plan: ReplayPlan, frame: number): number {
  const introA = plan.intro > 0 ? (frame < plan.intro ? 1 : Math.max(0, 1 - (frame - plan.intro) / FADE_FRAMES)) : 0;
  const runEnd = plan.intro + plan.frames;
  const outroA = plan.outro > 0 && frame >= runEnd ? Math.min(1, (frame - runEnd) / OUTRO_FADE) : 0;
  if (l.when === "intro") return introA;
  if (l.when === "outro") return outroA;
  if (l.when === "run") return Math.min(1 - introA, 1 - outroA);
  return 1;
}

const splitFor = (style: ExportStyle, w: number, h: number): Exclude<Split, "auto"> =>
  style.layout.split === "auto" ? (w >= h * 1.2 ? "row" : "column") : style.layout.split;

/**
 * One video frame (call inside `paint`). `frame` counts from 0 over the title hold + run + result hold; the
 * caller steps the replay to the run frame (see `frameSteps`). Returns the boxes of the text layers drawn.
 */
export function drawVideoFrame(ctx: CanvasRenderingContext2D, style: ExportStyle, r: Replay, info: ClipInfo, frame: number): LayerBox[] {
  const { w, h } = SIZES[style.size];
  const plan = r.plan, m = info.summary.metric;
  const now = r.samples[r.samples.length - 1] ?? info.summary.end;
  const L = style.layout;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  const st = stageRect(style.size, L.stage, L.chart);
  drawStage(ctx, r, ...st, splitFor(style, st[2], st[3]), { hud: L.hud, radius: L.stage === "fill" ? 0 : 6 });
  if (L.chart) {
    const [cx, cy, cw, ch] = chartRect(style.size, L.stage);
    if (L.stage === "fill") { ctx.fillStyle = C.bg; ctx.fillRect(0, cy - 8, w, h - cy + 8); }
    drawChart(ctx, info.samples ?? r.samples, m, plan, cx, cy, cw, ch, r.samples.length);
  }
  if (style.clean) return [];
  // Opening title and result card sit on a scrim over the stage, so the world stays faintly visible behind them
  if (L.cards) {
    for (const id of ["intro", "outro"] as const) {
      const l = style.layers[id];
      const a = l.show ? layerAlpha(l, plan, frame) : 0;
      if (a <= 0) continue;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.roundRect(st[0], st[1], st[2], st[3], L.stage === "fill" ? 0 : 6); ctx.clip();
      ctx.fillStyle = alpha(C.stage, 0.9); ctx.fillRect(st[0], st[1], st[2], st[3]);
      ctx.restore();
    }
  }
  const boxes: LayerBox[] = [];
  for (const id of LAYER_IDS) {
    const l = style.layers[id];
    if (!l.show) continue;
    const a = layerAlpha(l, plan, frame);
    if (a <= 0.001) continue;
    const b = drawLayer(ctx, id, l, style, plan, info, now, a);
    if (b) boxes.push(b);
  }
  return boxes;
}

// ——— Stills ———

/** The stage alone, filling the frame, no text (call inside `paint`). */
export function drawStageStill(ctx: CanvasRenderingContext2D, style: ExportStyle, r: Replay) {
  const { w, h } = SIZES[style.size];
  ctx.fillStyle = C.stage; ctx.fillRect(0, 0, w, h);
  drawStage(ctx, r, 0, 0, w, h, splitFor(style, w, h), { hud: style.layout.hud, radius: 0 });
}

/** The chart alone, on the background (call inside `paint`). */
export function drawChartStill(ctx: CanvasRenderingContext2D, style: ExportStyle, plan: ReplayPlan, info: ClipInfo, samples: ReplaySample[]) {
  const { w, h } = SIZES[style.size];
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  const m = info.summary.metric;
  const pad = Math.round(Math.min(w, h) * 0.07);
  ctx.font = fontStr(24, 600, F.title);
  ctx.fillStyle = C.ink;
  const ls = wrap(ctx, headline(plan, info.world), w - pad * 2, 2);
  ls.forEach((ln, i) => ctx.fillText(ln, pad, pad + 20 + i * 28));
  const top = pad + 20 + ls.length * 28 + 12;
  drawChart(ctx, samples, m, plan, pad, top, w - pad * 2, h - top - pad);
}

// ——— Slides ———

export interface SlideCtx {
  world: string;
  intro: string;
  plan: ReplayPlan;
  summary: ReplaySummary;
  samples: ReplaySample[];
  index: number;
  total: number;
}

function slideChrome(ctx: CanvasRenderingContext2D, s: SlideCtx) {
  const { w, h } = SLIDE_SIZE;
  ctx.fillStyle = C.bg; ctx.fillRect(0, 0, w, h);
  text(ctx, "WHAT-IF LAB", 40, 40, 12, C.ink, 500);
  ctx.font = fontStr(12, 600, F.title);
  text(ctx, s.world.toUpperCase(), 40 + ctx.measureText("WHAT-IF LAB").width + 16, 40, 12, C.ink2, 500);
  text(ctx, `${s.index} / ${s.total}`, w - 40, 40, 12, C.ink2, 500, "right");
  text(ctx, `SEED ${s.plan.seed}`, w - 40, h - 28, 10, C.ink2, 500, "right");
}

const STAGE_BOX: [number, number, number, number] = [440, 64, 480, 400];

export function slideTitle(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  ctx.font = fontStr(51, 600, F.title); ctx.fillStyle = C.ink;
  ctx.fillText(clip(ctx, s.world.toUpperCase(), 380), 40, 150);
  lines(ctx, headline(s.plan, s.world), 40, 210, 360, 29, 1.09, C.ink, 400, 5);
  text(ctx, s.plan.fromFork ? `Forked at ${s.plan.sb.fmtT(s.plan.tFork)}` : `From ${s.plan.sb.fmtT(s.plan.t0)}`, 40, 440, 15, C.ink2);
}

export function slideSetup(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  text(ctx, "THE SETUP", 40, 96, 18, C.ink, 500);
  let y = 124 + lines(ctx, s.intro, 40, 124, 360, 15, 1.45, C.ink, 400, 6) + 12;
  const ctls = s.plan.sb.controls.filter((c): c is Exclude<Control, { type: "heading" }> => c.type !== "heading");
  dashed(ctx, 40, y - 8, 400, y - 8);
  y += 12;
  for (const c of ctls) {
    if (y > 456) { text(ctx, `+ ${ctls.length - ctls.indexOf(c)} more`, 40, y, 12, C.ink2, 500); break; }
    ctx.font = fontStr(14, 400, F.body);
    text(ctx, clip(ctx, c.label, 220), 40, y, 14, C.ink2);
    ctx.font = fontStr(14, 500, F.body);
    text(ctx, clip(ctx, controlValue(c, s.plan.params[c.id]), 140), 400, y, 14, C.ink, 500, "right");
    y += 22;
  }
}

export function slideWhatIf(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  const sb = s.plan.sb;
  text(ctx, s.plan.hasWhatIf ? (sb.stack ? "THE CHANGES" : "THE WHAT-IF") : "NO WHAT-IF YET", 40, 96, 18, C.ink, 500);
  let y = 140 + lines(ctx, headline(s.plan, s.world), 40, 140, 360, 29, 1.09, C.alt, 400, 5) + 16;
  if (s.plan.changes.length > 1) {
    for (const c of s.plan.changes.slice(0, 6)) {
      text(ctx, sb.fmtT(c.t), 40, y, 12, C.ink2, 500);
      ctx.font = fontStr(14, 400, F.body);
      text(ctx, clip(ctx, sb.whatifs.find((x) => x[0] === c.id)?.[1] ?? c.id, 280), 120, y, 14, C.ink);
      y += 22;
    }
  } else {
    lines(ctx, s.plan.hasWhatIf
      ? "The world was copied at this moment. One copy runs on unchanged; the other gets the what-if. Same seed, so every difference comes from the change."
      : "This run shows the world as it is, from the moment of export.", 40, y, 360, 15, 1.45, C.ink2, 400, 6);
  }
}

export function slideMoment(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  const sb = s.plan.sb, t = r.base.t;
  text(ctx, `AT ${sb.fmtT(t).toUpperCase()}`, 40, 96, 18, C.ink, 500);
  const span = Math.max(1e-9, s.plan.t1 - s.plan.t0);
  const near = s.summary.events.filter((e) => e.t > s.plan.t0 - 1e-9 && e.t <= t + 1e-9 && e.t >= t - span * 0.3).sort((a, b) => b.t - a.t).slice(0, 3);
  let y = 132;
  if (!near.length) { y += lines(ctx, "Nothing new happened in this stretch. Watch the numbers below.", 40, y, 360, 15, 1.45, C.ink2, 400, 3); }
  for (const e of near) {
    // Timeline dots: hollow blue = no change only, filled amber = what-if only, half = both
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(46, y - 5, 4, 0, Math.PI * 2);
    if (e.who === "alt") { ctx.fillStyle = C.alt; ctx.fill(); }
    else if (e.who === "both") { ctx.strokeStyle = C.ink; ctx.stroke(); ctx.beginPath(); ctx.arc(46, y - 5, 4, Math.PI / 2, Math.PI * 1.5); ctx.fillStyle = C.ink; ctx.fill(); }
    else { ctx.strokeStyle = C.base; ctx.stroke(); }
    const who = e.who === "alt" ? (sb.stack ? "With changes" : "What-if only") : e.who === "base" ? "No change only" : "Both worlds";
    text(ctx, `${sb.fmtT(e.t)} · ${who}`.toUpperCase(), 60, y, 10, C.ink2, 500);
    y += 18 + lines(ctx, e.txt, 60, y + 18, 340, 14, 1.3, C.ink, 400, 2) + 6;
  }
  drawChart(ctx, s.samples, s.summary.metric, s.plan, 40, 300, 360, 170, r.samples.length);
}

export function slideOutcome(ctx: CanvasRenderingContext2D, s: SlideCtx) {
  slideChrome(ctx, s);
  const sb = s.plan.sb, end = s.summary.end;
  text(ctx, "WHAT CHANGED", 40, 96, 18, C.ink, 500);
  text(ctx, `At ${sb.fmtT(end.t)}`, 40, 122, 15, C.ink2);
  // Label column, then two right-aligned value columns 120 wide each
  const Lx = 40, NC = 310, WI = 440;
  let y = 160;
  text(ctx, "METRIC", Lx, y, 10, C.ink2, 500);
  text(ctx, "NO CHANGE", NC, y, 10, C.ink2, 500, "right");
  if (end.alt) text(ctx, sb.stack ? "WITH CHANGES" : "WHAT IF", WI, y, 10, C.ink2, 500, "right");
  y += 10;
  for (const m of sb.metrics.slice(0, 10)) {
    dashed(ctx, Lx, y, WI, y);
    y += 22;
    ctx.font = fontStr(14, 400, F.body);
    text(ctx, clip(ctx, m.label, 140), Lx, y, 14, C.ink2);
    ctx.font = fontStr(14, 500, F.num);
    const v = (s2: string, x: number, col: string) => { ctx.font = fontStr(14, 500, F.num); ctx.fillStyle = col; ctx.textAlign = "right"; ctx.fillText(clip(ctx, s2, 116), x, y); ctx.textAlign = "left"; };
    v(fmtMetric(m, end.base[m.k]), NC, C.ink);
    if (end.alt) v(fmtMetric(m, end.alt[m.k]), WI, C.alt);
    y += 8;
  }
  const d = describeDiff(s.summary.metric, end);
  if (d) lines(ctx, `${s.summary.metric.label}: ${d.txt}.`, 40, Math.min(y + 32, 470), 400, 15, 1.45, d.good == null ? C.ink : d.good ? C.good : C.bad, 500, 2);
  drawChart(ctx, s.samples, s.summary.metric, s.plan, 480, 80, 440, 380);
}
