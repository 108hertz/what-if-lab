/**
 * Export frames and slides drawn on a plain 2D canvas (change 0020). Framework-free: the sandbox's own `draw()`
 * paints each world at the export's size, then the Darkroom captions go around it. Colours come from STAGE
 * (the stage palette, identical in both themes), sizes from the type scale (10 · 12 · 14 · 15 · 18 · 24 · 29 · 41 · 51).
 *
 * Every function works in logical units; callers scale the context (×2) for 1080p output.
 */
import { chip, FONT, STAGE } from "../sim/draw";
import { fmtNum } from "../sim/core";
import type { Control, Metric } from "../sim/types";
import type { Replay, ReplayPlan, ReplaySample, ReplaySummary } from "./replay";

export type VideoFormat = "vertical" | "horizontal";

/** Output pixels and the logical size drawn into (×2). */
export const VIDEO_SIZE: Record<VideoFormat, { W: number; H: number; w: number; h: number }> = {
  vertical: { W: 1080, H: 1920, w: 540, h: 960 },
  horizontal: { W: 1920, H: 1080, w: 960, h: 540 },
};
export const SLIDE_SIZE = { W: 1920, H: 1080, w: 960, h: 540 };
export const EXPORT_SCALE = 2;

/** Frames of the clip outside the running part: a title hold at the start, a summary hold at the end. */
export const INTRO_FRAMES = 36;
export const FADE_FRAMES = 15;
export const OUTRO_FRAMES = 75;

export const CREDIT = "No AI · No live data · Same seed, same future";

const { good: GOOD, bad: BAD, ember: EMBER } = STAGE;
const font = (px: number, weight: 400 | 500 = 400) => `${weight} ${px}px ${FONT.body}`;

/** Greedy word wrap; the last allowed line gets an ellipsis if text remains. */
export function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines = Infinity): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (let i = 0; i < words.length; i++) {
    const next = line ? line + " " + words[i] : words[i];
    if (ctx.measureText(next).width <= maxW || !line) { line = next; continue; }
    lines.push(line);
    line = words[i];
    if (lines.length === maxLines) { line = ""; lines[maxLines - 1] = clip(ctx, lines[maxLines - 1] + " " + words.slice(i).join(" "), maxW); break; }
  }
  if (line) lines.push(line);
  return lines;
}

function clip(ctx: CanvasRenderingContext2D, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(s + "…").width > maxW) s = s.slice(0, -1);
  return s.trimEnd() + "…";
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, px: number, color: string, weight: 400 | 500 = 400, align: CanvasTextAlign = "left") {
  ctx.font = font(px, weight);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  ctx.fillText(s, x, y);
  ctx.textAlign = "left";
}

function lines(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, maxW: number, px: number, lh: number, color: string, weight: 400 | 500 = 400, maxLines = Infinity): number {
  ctx.font = font(px, weight);
  const ls = wrap(ctx, s, maxW, maxLines);
  ls.forEach((l, i) => text(ctx, l, x, y + i * px * lh, px, color, weight));
  return ls.length * px * lh;
}

function dashed(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, color = STAGE.line) {
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

/**
 * The stage: each world drawn by its sandbox in its own clipped rect, with the stage's HUD chips and the dashed
 * seam. `split` picks side by side ("row") or one above the other ("column").
 */
export function drawStage(ctx: CanvasRenderingContext2D, r: Replay, x: number, y: number, w: number, h: number, split: "row" | "column") {
  const sb = r.plan.sb;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.clip();
  ctx.fillStyle = STAGE.void; ctx.fillRect(x, y, w, h);
  type Pane = { x: number; y: number; w: number; h: number; world: Replay["base"]; alt: boolean };
  const g = 6;
  let panes: Pane[];
  if (sb.stack || !r.alt) panes = [{ x, y, w, h, world: r.alt ?? r.base, alt: !!r.alt }];
  else if (split === "row") panes = [{ x, y, w: (w - g) / 2, h, world: r.base, alt: false }, { x: x + (w + g) / 2, y, w: (w - g) / 2, h, world: r.alt, alt: true }];
  else panes = [{ x, y, w, h: (h - g) / 2, world: r.base, alt: false }, { x, y: y + (h + g) / 2, w, h: (h - g) / 2, world: r.alt, alt: true }];
  for (const p of panes) {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.beginPath(); ctx.rect(0, 0, p.w, p.h); ctx.clip();
    sb.draw({ ctx, w: p.w, h: p.h, p: r.params, isAlt: p.alt, ui: r.ui, base: p.alt && sb.stack ? r.base : undefined }, p.world);
    const label = p.alt ? r.plan.label : r.alt ? "No change" : "No change · as it is";
    const lw = chip(ctx, label.toUpperCase(), 8, 8, p.alt ? STAGE.alt : STAGE.base, `500 12px ${FONT.body}`, p.w - 32);
    const time = sb.fmtT(p.world.t);
    ctx.font = `500 12px ${FONT.mono}`;
    const tw = ctx.measureText(time).width;
    if (p.w > lw + tw + 50) chip(ctx, time, p.w - tw - 24, 8, STAGE.ink, `500 12px ${FONT.mono}`);
    ctx.restore();
  }
  if (panes.length === 2) {
    if (split === "row") dashed(ctx, x + w / 2, y, x + w / 2, y + h);
    else dashed(ctx, x, y + h / 2, x + w, y + h / 2);
  }
  ctx.restore();
  ctx.strokeStyle = STAGE.line; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 12); ctx.stroke();
}

/** Line chart of one metric over the run so far: no change solid blue, what-if dashed amber, fork marked. */
export function drawChart(ctx: CanvasRenderingContext2D, samples: ReplaySample[], m: Metric, plan: ReplayPlan, x: number, y: number, w: number, h: number, upTo = samples.length) {
  const s = samples.slice(0, Math.max(2, upTo));
  const all = samples.flatMap((p) => [p.base[m.k], p.alt?.[m.k] ?? null]).filter((v): v is number => v != null && isFinite(v));
  text(ctx, m.label.toUpperCase(), x, y + 10, 10, STAGE.ink2, 500);
  // Legend: a solid and a dashed stroke, so the worlds are told apart without colour
  ctx.font = font(10, 500);
  const lx = x + w;
  const leg = (label: string, col: string, dash: number[], right: number) => {
    const tw = ctx.measureText(label).width;
    text(ctx, label, right, y + 10, 10, STAGE.ink2, 500, "right");
    ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.setLineDash(dash);
    ctx.beginPath(); ctx.moveTo(right - tw - 26, y + 6); ctx.lineTo(right - tw - 8, y + 6); ctx.stroke(); ctx.setLineDash([]);
    return right - tw - 40;
  };
  let right = lx;
  if (plan.hasWhatIf) right = leg(plan.sb.stack ? "WITH CHANGES" : "WHAT IF", STAGE.alt, [7, 4], right);
  leg("NO CHANGE", STAGE.base, [], right);
  const T = y + 22, B = y + h - 18;
  if (!all.length) { text(ctx, "No data for this metric yet", x, T + 20, 14, STAGE.ink2); return; }
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
  const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
  ctx.font = font(12, 500);
  const ticks = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
  const L = x + Math.max(...ticks.map((v) => ctx.measureText(m.fmt(v)).width)) + 10;
  const t0 = plan.t0, t1 = Math.max(plan.t1, t0 + 1e-9);
  const X = (t: number) => L + ((x + w - L) * (t - t0)) / (t1 - t0);
  const Y = (v: number) => T + (B - T) * (1 - (v - lo) / (hi - lo));
  ctx.strokeStyle = STAGE.line; ctx.lineWidth = 1;
  for (const v of ticks) {
    const yy = Y(v);
    ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(x + w, yy); ctx.stroke();
    text(ctx, m.fmt(v), L - 6, yy + 4, 12, STAGE.ink2, 500, "right");
  }
  text(ctx, plan.sb.fmtT(t0), L, B + 15, 12, STAGE.ink2, 500);
  text(ctx, plan.sb.fmtT(t1), x + w, B + 15, 12, STAGE.ink2, 500, "right");
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
  line((p) => p.base[m.k], STAGE.base, 2, []);
  line((p) => p.alt?.[m.k], STAGE.alt, 2.5, [7, 4]);
  if (upTo < samples.length) {
    const t = s[s.length - 1].t;
    dashed(ctx, X(t), T, X(t), B, STAGE.ink2);
  }
}

/** Caption values for one metric: "NO CHANGE 1.1 °C" / "WHAT IF 2.4 °C". */
function metricPair(ctx: CanvasRenderingContext2D, m: Metric, smp: ReplaySample, plan: ReplayPlan, x: number, y: number, px: number, gap: number) {
  const b = fmtMetric(m, smp.base[m.k]);
  text(ctx, "NO CHANGE", x, y - px - 6, 10, STAGE.ink2, 500);
  text(ctx, b, x, y, px, STAGE.base, 500);
  if (!smp.alt) return;
  ctx.font = font(px, 500);
  const ax = x + Math.max(ctx.measureText(b).width, 60) + gap;
  text(ctx, plan.sb.stack ? "WITH CHANGES" : "WHAT IF", ax, y - px - 6, 10, STAGE.ink2, 500);
  text(ctx, fmtMetric(m, smp.alt[m.k]), ax, y, px, STAGE.alt, 500);
}

export interface ClipInfo {
  world: string;
  summary: ReplaySummary;
}

/** Title shown before the run: the what-if as a question-sized line, or what happens next without one. */
export function headline(plan: ReplayPlan, world: string): string {
  return plan.label || `${world}: what happens next?`;
}

/**
 * One video frame. `frame` counts from 0 over intro + run + outro; the caller steps the replay during the run.
 */
export function drawVideoFrame(ctx: CanvasRenderingContext2D, fmt: VideoFormat, r: Replay, info: ClipInfo, frame: number) {
  const { w, h } = VIDEO_SIZE[fmt];
  const plan = r.plan, m = info.summary.metric;
  const runEnd = INTRO_FRAMES + plan.steps;
  const now = r.samples[r.samples.length - 1];
  ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, w, h);
  const title = headline(plan, info.world);

  let stage: [number, number, number, number];
  if (fmt === "horizontal") {
    text(ctx, "WHAT-IF LAB", 24, 30, 14, STAGE.ink, 500);
    ctx.font = font(14, 500);
    text(ctx, info.world.toUpperCase(), 24 + ctx.measureText("WHAT-IF LAB").width + 16, 30, 12, STAGE.ink2, 500);
    text(ctx, `SEED ${plan.seed}`, w - 24, 30, 10, STAGE.ink2, 500, "right");
    stage = [24, 44, w - 48, h - 44 - 112];
    const by = h - 112;
    dashed(ctx, 24, by + 12, w - 24, by + 12);
    lines(ctx, title, 24, by + 46, w * 0.55, 24, 1.09, STAGE.ink, 500, 2);
    text(ctx, m.label.toUpperCase(), w * 0.62, by + 30, 12, STAGE.ink, 500);
    metricPair(ctx, m, now, plan, w * 0.62, by + 82, 24, 32);
    text(ctx, CREDIT, 24, h - 14, 10, EMBER, 500);
  } else {
    text(ctx, "WHAT-IF LAB", 24, 36, 14, STAGE.ink, 500);
    text(ctx, info.world.toUpperCase(), w - 24, 36, 12, STAGE.ink2, 500, "right");
    // The stage starts right under the title, however many lines it took
    const top = 84 - 29 + lines(ctx, title, 24, 84, w - 48, 29, 1.09, STAGE.ink, 500, 3) + 20;
    stage = [24, top, w - 48, h - top - 176];
    const by = h - 176;
    dashed(ctx, 24, by + 16, w - 24, by + 16);
    text(ctx, m.label.toUpperCase(), 24, by + 44, 12, STAGE.ink2, 500);
    metricPair(ctx, m, now, plan, 24, by + 112, 41, 40);
    text(ctx, CREDIT, 24, h - 22, 10, EMBER, 500);
  }
  drawStage(ctx, r, ...stage, fmt === "horizontal" ? "row" : "column");

  // Title over the stage while it holds still, fading out as the run starts
  const introA = frame < INTRO_FRAMES ? 1 : Math.max(0, 1 - (frame - INTRO_FRAMES) / FADE_FRAMES);
  const outroA = frame < runEnd ? 0 : Math.min(1, (frame - runEnd) / 12);
  const [sx, sy, sw, sh] = stage;
  if (introA > 0) card(ctx, sx, sy, sw, sh, introA, () => {
    const px = fmt === "horizontal" ? 41 : 41;
    text(ctx, plan.fromFork ? `FROM ${plan.sb.fmtT(plan.t0).toUpperCase()}` : "FROM NOW", sx + 32, sy + 48, 12, STAGE.ink2, 500);
    lines(ctx, title, sx + 32, sy + 48 + 24 + px, sw - 64, px, 1.0, STAGE.ink, 500, 4);
  });
  if (outroA > 0) card(ctx, sx, sy, sw, sh, outroA, () => {
    const end = info.summary.end;
    text(ctx, `AT ${plan.sb.fmtT(end.t).toUpperCase()}`, sx + 32, sy + 48, 12, STAGE.ink2, 500);
    let yy = sy + 48 + 24 + 41;
    yy += lines(ctx, m.label, sx + 32, yy, sw - 64, 41, 1.0, STAGE.ink, 500, 2) + 24;
    metricPair(ctx, m, end, plan, sx + 32, yy + 41, 41, 40);
    yy += 41 + 40;
    const d = describeDiff(m, end);
    if (d) lines(ctx, d.txt, sx + 32, yy + 18, sw - 64, 18, 1.4, d.good == null ? STAGE.ink : d.good ? GOOD : BAD, 500, 3);
  });
}

function card(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, a: number, body: () => void) {
  ctx.save();
  ctx.globalAlpha = a;
  ctx.beginPath(); ctx.roundRect(x, y, w, h, 12); ctx.clip();
  // Two layers of the stage scrim: the world stays faintly visible behind the title
  ctx.fillStyle = STAGE.scrim; ctx.fillRect(x, y, w, h); ctx.fillRect(x, y, w, h);
  body();
  ctx.restore();
}

/** Total frames of a clip. */
export const clipFrames = (plan: ReplayPlan) => INTRO_FRAMES + plan.steps + OUTRO_FRAMES;

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
  ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, w, h);
  text(ctx, "WHAT-IF LAB", 40, 40, 12, STAGE.ink, 500);
  ctx.font = font(12, 500);
  text(ctx, s.world.toUpperCase(), 40 + ctx.measureText("WHAT-IF LAB").width + 16, 40, 12, STAGE.ink2, 500);
  text(ctx, `${s.index} / ${s.total}`, w - 40, 40, 12, STAGE.ink2, 500, "right");
  text(ctx, CREDIT, 40, h - 28, 10, EMBER, 500);
  text(ctx, `SEED ${s.plan.seed}`, w - 40, h - 28, 10, STAGE.ink2, 500, "right");
}

const STAGE_BOX: [number, number, number, number] = [440, 64, 480, 400];

export function slideTitle(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  text(ctx, s.world.toUpperCase(), 40, 150, 51, STAGE.ink, 500);
  lines(ctx, headline(s.plan, s.world), 40, 210, 360, 29, 1.09, STAGE.ink, 400, 5);
  text(ctx, s.plan.fromFork ? `Forked at ${s.plan.sb.fmtT(s.plan.t0)}` : `From ${s.plan.sb.fmtT(s.plan.t0)}`, 40, 440, 15, STAGE.ink2);
}

export function slideSetup(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  text(ctx, "THE SETUP", 40, 96, 18, STAGE.ink, 500);
  let y = 124 + lines(ctx, s.intro, 40, 124, 360, 15, 1.45, STAGE.ink, 400, 6) + 12;
  const ctls = s.plan.sb.controls.filter((c): c is Exclude<Control, { type: "heading" }> => c.type !== "heading");
  dashed(ctx, 40, y - 8, 400, y - 8);
  y += 12;
  for (const c of ctls) {
    if (y > 456) { text(ctx, `+ ${ctls.length - ctls.indexOf(c)} more`, 40, y, 12, STAGE.ink2, 500); break; }
    ctx.font = font(14);
    text(ctx, clip(ctx, c.label, 220), 40, y, 14, STAGE.ink2);
    ctx.font = font(14, 500);
    text(ctx, clip(ctx, controlValue(c, s.plan.params[c.id]), 140), 400, y, 14, STAGE.ink, 500, "right");
    y += 22;
  }
}

export function slideWhatIf(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  const sb = s.plan.sb;
  text(ctx, s.plan.hasWhatIf ? (sb.stack ? "THE CHANGES" : "THE WHAT-IF") : "NO WHAT-IF YET", 40, 96, 18, STAGE.ink, 500);
  let y = 140 + lines(ctx, headline(s.plan, s.world), 40, 140, 360, 29, 1.09, STAGE.alt, 400, 5) + 16;
  if (s.plan.changes.length > 1) {
    for (const c of s.plan.changes.slice(0, 6)) {
      text(ctx, sb.fmtT(c.t), 40, y, 12, STAGE.ink2, 500);
      ctx.font = font(14);
      text(ctx, clip(ctx, sb.whatifs.find((x) => x[0] === c.id)?.[1] ?? c.id, 280), 120, y, 14, STAGE.ink);
      y += 22;
    }
  } else {
    lines(ctx, s.plan.hasWhatIf
      ? "The world was copied at this moment. One copy runs on unchanged; the other gets the what-if. Same seed, so every difference comes from the change."
      : "This run shows the world as it is, from the moment of export.", 40, y, 360, 15, 1.45, STAGE.ink2, 400, 6);
  }
}

export function slideMoment(ctx: CanvasRenderingContext2D, s: SlideCtx, r: Replay) {
  slideChrome(ctx, s);
  drawStage(ctx, r, ...STAGE_BOX, "column");
  const sb = s.plan.sb, t = r.base.t;
  text(ctx, `AT ${sb.fmtT(t).toUpperCase()}`, 40, 96, 18, STAGE.ink, 500);
  const span = Math.max(1e-9, s.plan.t1 - s.plan.t0);
  const near = s.summary.events.filter((e) => e.t > s.plan.t0 - 1e-9 && e.t <= t + 1e-9 && e.t >= t - span * 0.3).sort((a, b) => b.t - a.t).slice(0, 3);
  let y = 132;
  if (!near.length) { y += lines(ctx, "Nothing new happened in this stretch. Watch the numbers below.", 40, y, 360, 15, 1.45, STAGE.ink2, 400, 3); }
  for (const e of near) {
    // Timeline dots: hollow blue = no change only, filled amber = what-if only, half cream = both
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(46, y - 5, 4, 0, Math.PI * 2);
    if (e.who === "alt") { ctx.fillStyle = STAGE.alt; ctx.fill(); }
    else if (e.who === "both") { ctx.strokeStyle = STAGE.ink; ctx.stroke(); ctx.beginPath(); ctx.arc(46, y - 5, 4, Math.PI / 2, Math.PI * 1.5); ctx.fillStyle = STAGE.ink; ctx.fill(); }
    else { ctx.strokeStyle = STAGE.base; ctx.stroke(); }
    const who = e.who === "alt" ? (sb.stack ? "With changes" : "What-if only") : e.who === "base" ? "No change only" : "Both worlds";
    text(ctx, `${sb.fmtT(e.t)} · ${who}`.toUpperCase(), 60, y, 10, STAGE.ink2, 500);
    y += 18 + lines(ctx, e.txt, 60, y + 18, 340, 14, 1.3, STAGE.ink, 400, 2) + 6;
  }
  drawChart(ctx, s.samples, s.summary.metric, s.plan, 40, 300, 360, 170, r.samples.length);
}

export function slideOutcome(ctx: CanvasRenderingContext2D, s: SlideCtx) {
  slideChrome(ctx, s);
  const sb = s.plan.sb, end = s.summary.end;
  text(ctx, "WHAT CHANGED", 40, 96, 18, STAGE.ink, 500);
  text(ctx, `At ${sb.fmtT(end.t)}`, 40, 122, 15, STAGE.ink2);
  // Label column, then two right-aligned value columns 120 wide each
  const L = 40, NC = 310, WI = 440;
  let y = 160;
  text(ctx, "METRIC", L, y, 10, STAGE.ink2, 500);
  text(ctx, "NO CHANGE", NC, y, 10, STAGE.ink2, 500, "right");
  if (end.alt) text(ctx, sb.stack ? "WITH CHANGES" : "WHAT IF", WI, y, 10, STAGE.ink2, 500, "right");
  y += 10;
  for (const m of sb.metrics.slice(0, 10)) {
    dashed(ctx, L, y, WI, y);
    y += 22;
    ctx.font = font(14);
    text(ctx, clip(ctx, m.label, 140), L, y, 14, STAGE.ink2);
    ctx.font = font(14, 500);
    text(ctx, clip(ctx, fmtMetric(m, end.base[m.k]), 116), NC, y, 14, STAGE.ink, 500, "right");
    if (end.alt) text(ctx, clip(ctx, fmtMetric(m, end.alt[m.k]), 116), WI, y, 14, STAGE.alt, 500, "right");
    y += 8;
  }
  const d = describeDiff(s.summary.metric, end);
  if (d) lines(ctx, `${s.summary.metric.label}: ${d.txt}.`, 40, Math.min(y + 32, 470), 400, 15, 1.45, d.good == null ? STAGE.ink : d.good ? GOOD : BAD, 500, 2);
  drawChart(ctx, s.samples, s.summary.metric, s.plan, 480, 80, 440, 380);
}
