/**
 * Intro scenes (change 0034): six ready-made openings played over the opening hold, before the run starts.
 * Each is a pure function of the frame: it draws the whole stage through the `stage()` callback it is given and its own
 * words on top, using the style's colours and fonts. They never change which sim step is shown (the hold shows the
 * fork, step 0), so a clip's run is identical with any intro, or none. Framework-free.
 */
import type { IntroId } from "./style";

type Rect = [number, number, number, number];

export interface IntroCtx {
  ctx: CanvasRenderingContext2D;
  /** Frame size (logical px) and the stage's place in it. */
  w: number;
  h: number;
  st: Rect;
  /** 0…1 through the opening hold; `sec` and `dur` in seconds. */
  p: number;
  sec: number;
  dur: number;
  /** Opacity of the words: 1 during the hold, fading to 0 once the run has started. */
  out: number;
  /** True while the hold is on screen (false while the words fade over the running stage). */
  hold: boolean;
  title: string;
  line: string;
  kicker: string;
  accent: string;
  colors: { bg: string; ink: string; ink2: string; stage: string; stageInk: string };
  fonts: { title: string; body: string };
  /** Before / after labels for "Before and after". */
  before: string;
  after: string;
  hasAlt: boolean;
  /** Draw the stage in a rect: the changed world, or only the no-change world. */
  stage(r: Rect, world: "alt" | "base"): void;
  wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number, maxLines?: number): string[];
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ease = (v: number) => { const x = clamp01(v); return x * x * (3 - 2 * x); };
const easeOut = (v: number) => 1 - (1 - clamp01(v)) ** 3;
/** 0 → 1 between a and b. */
const ramp = (v: number, a: number, b: number) => clamp01((v - a) / Math.max(1e-9, b - a));

function withAlpha(hex: string, a: number): string {
  const h = hex.length >= 7 ? hex.slice(0, 7) : "#000000";
  return h + Math.round(clamp01(a) * 255).toString(16).padStart(2, "0");
}

function shade(c: IntroCtx, a: number) {
  const { ctx, st } = c;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(st[0], st[1], st[2], st[3], 6); ctx.clip();
  ctx.fillStyle = withAlpha(c.colors.stage, a); ctx.fillRect(st[0], st[1], st[2], st[3]);
  ctx.restore();
}

/** A block of wrapped lines; returns the height used. */
function block(c: IntroCtx, s: string, x: number, y: number, maxW: number, px: number, font: string, color: string, align: CanvasTextAlign, maxLines = 4, lh = 1.04): number {
  const { ctx } = c;
  if (!s.trim()) return 0;
  ctx.font = font;
  const ls = c.wrap(ctx, s, maxW, maxLines);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  ls.forEach((l, i) => ctx.fillText(l, x, y + px * 0.86 + i * px * lh));
  ctx.textAlign = "left";
  return ls.length * px * lh;
}

const bigPx = (c: IntroCtx) => Math.round(Math.min(c.st[2] / 13, c.st[3] / 6.5, 46));

/** The what-if types on word by word; a small line answers at the end. */
function question(c: IntroCtx) {
  c.stage(c.st, "alt");
  shade(c, 0.86);
  const { ctx, st } = c;
  const px = bigPx(c), x = st[0] + 32, maxW = st[2] - 64;
  const words = c.title.split(/\s+/).filter(Boolean);
  const n = c.hold ? Math.ceil(words.length * ramp(c.p, 0.05, 0.7)) : words.length;
  ctx.save();
  ctx.globalAlpha *= c.out;
  ctx.font = `600 ${Math.max(10, Math.round(px * 0.3))}px ${c.fonts.title}`;
  ctx.fillStyle = c.accent; ctx.fillText(c.kicker, x, st[1] + 40);
  const y0 = st[1] + 54;
  const used = block(c, words.slice(0, n).join(" "), x, y0, maxW, px, `700 ${px}px ${c.fonts.title}`, c.colors.stageInk, "left", 4);
  // Accent bar grows under the question
  ctx.fillStyle = c.accent;
  ctx.fillRect(x, y0 + used + 14, Math.min(maxW, 180) * easeOut(ramp(c.p, 0.1, 0.8)), 4);
  ctx.globalAlpha *= ramp(c.hold ? c.p : 1, 0.72, 0.9);
  const sp = Math.max(14, Math.round(px * 0.45));
  block(c, c.line, x, y0 + used + 32, maxW, sp, `500 ${sp}px ${c.fonts.body}`, c.colors.stageInk, "left", 2, 1.3);
  ctx.restore();
}

/** 3 · 2 · 1 over the dimmed stage, a ring filling with each number. */
function countdown(c: IntroCtx) {
  c.stage(c.st, "alt");
  shade(c, c.hold ? 0.7 : 0.7 * c.out);
  const { ctx, st } = c;
  const cx = st[0] + st[2] / 2, cy = st[1] + st[3] / 2;
  const R = Math.min(st[2], st[3]) * 0.2;
  ctx.save();
  ctx.globalAlpha *= c.out;
  const px = bigPx(c);
  ctx.font = `600 ${Math.max(11, Math.round(px * 0.34))}px ${c.fonts.title}`;
  ctx.fillStyle = c.colors.stageInk; ctx.textAlign = "center";
  ctx.fillText(c.line, cx, st[1] + 36);
  if (c.hold) {
    const k = c.p * 3, i = Math.min(2, Math.floor(k)), f = k - i;
    ctx.strokeStyle = withAlpha(c.colors.stageInk, 0.2); ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = c.accent; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * f); ctx.stroke();
    const pulse = 1 + 0.18 * (1 - easeOut(f * 3));
    const np = Math.round(R * 1.1 * pulse);
    ctx.font = `700 ${np}px ${c.fonts.title}`; ctx.fillStyle = c.colors.stageInk; ctx.textBaseline = "middle";
    ctx.fillText(String(3 - i), cx, cy + np * 0.04);
    ctx.textBaseline = "alphabetic";
  }
  ctx.textAlign = "left";
  const sp = Math.max(14, Math.round(px * 0.5));
  block(c, c.title, cx, st[1] + st[3] - 28 - sp * 2.1, st[2] - 64, sp, `700 ${sp}px ${c.fonts.title}`, c.colors.stageInk, "center", 2);
  ctx.restore();
}

/** The question, then "What do you think will happen?" with a bar that fills: time to guess before it runs. */
function guess(c: IntroCtx) {
  c.stage(c.st, "alt");
  shade(c, 0.88);
  const { ctx, st } = c;
  const px = bigPx(c), x = st[0] + 32, maxW = st[2] - 64;
  ctx.save();
  ctx.globalAlpha *= c.out;
  const used = block(c, c.title, x, st[1] + 36, maxW, Math.round(px * 0.8), `700 ${Math.round(px * 0.8)}px ${c.fonts.title}`, c.colors.stageInk, "left", 3);
  const q = c.hold ? easeOut(ramp(c.p, 0.12, 0.3)) : 1;
  ctx.globalAlpha *= q;
  const qy = st[1] + 36 + used + 20;
  const qh = block(c, c.line, x, qy + (1 - q) * 12, maxW, px, `700 ${px}px ${c.fonts.title}`, c.accent, "left", 3);
  const by = Math.min(st[1] + st[3] - 40, qy + qh + 28);
  ctx.fillStyle = withAlpha(c.colors.stageInk, 0.18); ctx.fillRect(x, by, maxW, 6);
  ctx.fillStyle = c.accent; ctx.fillRect(x, by, maxW * (c.hold ? ramp(c.p, 0.3, 1) : 1), 6);
  ctx.restore();
}

/** Black bars slide in; the world's name in spaced capitals, then the title fades up. */
function cinema(c: IntroCtx) {
  c.stage(c.st, "alt");
  const { ctx, st } = c;
  const bars = (c.hold ? easeOut(ramp(c.p, 0, 0.25)) : c.out) * st[3] * 0.13;
  ctx.save();
  ctx.beginPath(); ctx.roundRect(st[0], st[1], st[2], st[3], 6); ctx.clip();
  ctx.fillStyle = withAlpha(c.colors.stage, 0.35 * (c.hold ? 1 : c.out)); ctx.fillRect(st[0], st[1], st[2], st[3]);
  ctx.fillStyle = "#000000";
  ctx.fillRect(st[0], st[1], st[2], bars); ctx.fillRect(st[0], st[1] + st[3] - bars, st[2], bars);
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= c.out;
  const cx = st[0] + st[2] / 2, cy = st[1] + st[3] / 2;
  const kp = Math.max(11, Math.round(bigPx(c) * 0.32));
  ctx.globalAlpha *= c.hold ? ramp(c.p, 0.15, 0.35) : 1;
  ctx.font = `600 ${kp}px ${c.fonts.title}`; ctx.fillStyle = c.accent; ctx.textAlign = "center";
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = `${kp * 0.4}px`;
  ctx.fillText(c.line.toLocaleUpperCase(), cx, cy - kp * 1.6);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  ctx.restore();
  ctx.save();
  ctx.globalAlpha *= c.out * (c.hold ? ease(ramp(c.p, 0.4, 0.7)) : 1);
  const px = bigPx(c);
  block(c, c.title, cx, cy - px * 0.2 + (c.hold ? (1 - ease(ramp(c.p, 0.4, 0.7))) * 10 : 0), st[2] * 0.8, px, `700 ${px}px ${c.fonts.title}`, c.colors.stageInk, "center", 3);
  ctx.restore();
}

/** The stage starts small under the title and grows to fill its place as the title leaves. */
function zoom(c: IntroCtx) {
  const { ctx, st } = c;
  const k = c.hold ? 0.5 + 0.5 * ease(ramp(c.p, 0.35, 1)) : 1;
  const sw = st[2] * k, sh = st[3] * k;
  const r: Rect = [st[0] + (st[2] - sw) / 2, st[1] + st[3] - sh - (st[3] - sh) * 0.15 * (k < 1 ? 1 : 0), sw, sh];
  c.stage(r, "alt");
  ctx.save();
  ctx.globalAlpha *= c.out * (c.hold ? 1 - ease(ramp(c.p, 0.55, 0.95)) : 0);
  const px = bigPx(c);
  const space = Math.max(px * 1.2, r[1] - st[1]);
  block(c, c.title, st[0] + st[2] / 2, st[1] + Math.max(8, space / 2 - px), st[2] - 48, px, `700 ${px}px ${c.fonts.title}`, c.colors.ink, "center", 2);
  ctx.restore();
}

/** The no-change world for a beat, then a wipe across to the changed world. */
function thenNow(c: IntroCtx) {
  const { ctx, st } = c;
  const wipe = c.hold && c.hasAlt ? ease(ramp(c.p, 0.4, 0.75)) : 1;
  if (wipe < 1) c.stage(st, "base");
  if (wipe > 0) {
    ctx.save();
    ctx.beginPath(); ctx.rect(st[0], st[1], st[2] * wipe, st[3]); ctx.clip();
    c.stage(st, "alt");
    ctx.restore();
    if (wipe < 1) { ctx.fillStyle = c.accent; ctx.fillRect(st[0] + st[2] * wipe - 2, st[1], 4, st[3]); }
  }
  ctx.save();
  ctx.globalAlpha *= c.out;
  const kp = Math.max(12, Math.round(bigPx(c) * 0.42));
  const lab = (s: string, a: number, col: string) => {
    if (a <= 0) return;
    ctx.save(); ctx.globalAlpha *= a;
    ctx.font = `700 ${kp}px ${c.fonts.title}`;
    const tw = ctx.measureText(s).width;
    ctx.fillStyle = withAlpha(c.colors.stage, 0.8);
    ctx.beginPath(); ctx.roundRect(st[0] + 24, st[1] + st[3] - 32 - kp * 1.6, tw + 24, kp * 1.6, 6); ctx.fill();
    ctx.fillStyle = col; ctx.fillText(s, st[0] + 36, st[1] + st[3] - 32 - kp * 0.45);
    ctx.restore();
  };
  lab(c.before, 1 - wipe, c.colors.stageInk);
  lab(c.after, wipe, c.accent);
  const px = Math.round(bigPx(c) * 0.75);
  ctx.globalAlpha *= c.hold ? ramp(c.p, 0.7, 0.9) : 1;
  ctx.fillStyle = withAlpha(c.colors.stage, 0.8);
  ctx.font = `700 ${px}px ${c.fonts.title}`;
  const ls = c.wrap(ctx, c.title, st[2] - 96, 2);
  const bh = ls.length * px * 1.04 + 24;
  ctx.beginPath(); ctx.roundRect(st[0] + 24, st[1] + 24, Math.min(st[2] - 48, Math.max(...ls.map((l) => ctx.measureText(l).width)) + 24), bh, 6); ctx.fill();
  block(c, c.title, st[0] + 36, st[1] + 36, st[2] - 96, px, `700 ${px}px ${c.fonts.title}`, c.colors.stageInk, "left", 2);
  ctx.restore();
}

export const INTROS: Record<IntroId, (c: IntroCtx) => void> = { question, countdown, guess, cinema, zoom, thenNow };

