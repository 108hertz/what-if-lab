import { TAU } from "./core";

/** Canvas fonts, mirroring the page (change 0023): body = Barlow, mono = JetBrains Mono (numbers), display = Barlow Semi Condensed (labels). */
export const FONT = {
  body: "system-ui, sans-serif",
  mono: "ui-monospace, Menlo, monospace",
  display: "system-ui, sans-serif",
};

export function setCanvasFont(body: string, mono?: string, display?: string): void {
  FONT.body = body;
  if (mono) FONT.mono = mono;
  FONT.display = display || body;
}

/**
 * Stage palette. The stage is always dark (both page themes), so these are fixed values
 * mirroring the dark "graphite" tokens in app/globals.css (--stage-*, --base, --alt).
 */
export const STAGE = {
  void: "#05080C",
  panel: "#0B1118",
  raised: "#18212D",
  ink: "#E6EDF5",
  ink2: "#8B98A9",
  line: "#232D3A",
  muted: "#3A4656",
  signal: "#3BD4C7",
  base: "#7FB2FF",
  alt: "#FFB547",
  /** --good, --bad (dark values); used by export captions drawn on the stage palette. `ember` is retired (change 0023). */
  good: "#5FD68A",
  bad: "#FF6B5A",
  ember: "#8B98A9",
  scrim: "rgba(5,8,12,.82)",
};

/** Primer-style creature: a coloured circle with eyes that look along (lx, ly) and an optional mood mouth (0–100). */
export function blob(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  col: string,
  lx = 0,
  ly = 0,
  mood: number | null = null,
): void {
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  if (r < 3.6) return;
  const ex = r * 0.36, ey = -r * 0.16, er = r * 0.27;
  const l = Math.hypot(lx, ly) || 1;
  const dx = (lx / l) * er * 0.45, dy = (ly / l) * er * 0.45;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(x - ex, y + ey, er, 0, TAU);
  ctx.arc(x + ex, y + ey, er, 0, TAU);
  ctx.fill();
  ctx.fillStyle = STAGE.void;
  ctx.beginPath();
  ctx.arc(x - ex + dx, y + ey + dy, er * 0.5, 0, TAU);
  ctx.arc(x + ex + dx, y + ey + dy, er * 0.5, 0, TAU);
  ctx.fill();
  if (mood != null && r >= 7) {
    const c = (mood - 50) / 50, my = y + r * 0.42;
    ctx.strokeStyle = STAGE.void;
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.28, my);
    ctx.quadraticCurveTo(x, my + c * r * 0.32, x + r * 0.28, my);
    ctx.stroke();
  }
}

/** HUD chip on the stage: a dark plate, 1 px edge, 3 px corners (Control Room readout). */
export function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, maxW = Infinity): number {
  ctx.font = font;
  const tw = Math.min(ctx.measureText(text).width, maxW);
  plate(ctx, x, y, tw + 16, 22);
  ctx.fillStyle = color;
  if (isFinite(maxW)) ctx.fillText(text, x + 8, y + 15, maxW);
  else ctx.fillText(text, x + 8, y + 15);
  return tw + 16;
}

function plate(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = STAGE.scrim;
  ctx.beginPath();
  ctx.roundRect(x + 0.5, y + 0.5, w - 1, h - 1, 3);
  ctx.fill();
  ctx.strokeStyle = STAGE.line; ctx.lineWidth = 1;
  ctx.stroke();
}

/** The channel mark: ● round for the no-change world, ◆ diamond for the what-if (change 0023's signature). */
export function channelMark(ctx: CanvasRenderingContext2D, cx: number, cy: number, alt: boolean, color = alt ? STAGE.alt : STAGE.base, r = 3.5): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (alt) { ctx.moveTo(cx, cy - r - 0.8); ctx.lineTo(cx + r + 0.8, cy); ctx.lineTo(cx, cy + r + 0.8); ctx.lineTo(cx - r - 0.8, cy); ctx.closePath(); }
  else ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
}

/** A channel tag on the stage: mark + condensed uppercase label in the channel's colour. Returns its width. */
export function channelTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alt: boolean, maxW = Infinity): number {
  const font = `600 12px ${FONT.display}`;
  ctx.font = font;
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0.6px";
  const tw = Math.min(ctx.measureText(text).width, maxW);
  plate(ctx, x, y, tw + 30, 22);
  channelMark(ctx, x + 11, y + 11, alt);
  ctx.fillStyle = alt ? STAGE.alt : STAGE.base;
  ctx.font = font;
  if (isFinite(maxW)) ctx.fillText(text, x + 22, y + 15, maxW); else ctx.fillText(text, x + 22, y + 15);
  if ("letterSpacing" in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
  return tw + 30;
}
