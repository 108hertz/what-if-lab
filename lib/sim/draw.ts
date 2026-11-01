import { TAU } from "./core";

export const FONT = {
  body: '"Instrument Sans", system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
  display: '"Bricolage Grotesque", system-ui, sans-serif',
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
  ctx.fillStyle = "#10131C";
  ctx.beginPath();
  ctx.arc(x - ex + dx, y + ey + dy, er * 0.5, 0, TAU);
  ctx.arc(x + ex + dx, y + ey + dy, er * 0.5, 0, TAU);
  ctx.fill();
  if (mood != null && r >= 7) {
    const c = (mood - 50) / 50, my = y + r * 0.42;
    ctx.strokeStyle = "#10131C";
    ctx.lineWidth = Math.max(1, r * 0.1);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.28, my);
    ctx.quadraticCurveTo(x, my + c * r * 0.32, x + r * 0.28, my);
    ctx.stroke();
  }
}

/** Dark label chip, used for HUD text on the stage. */
export function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, font: string, maxW = Infinity): number {
  ctx.font = font;
  const tw = Math.min(ctx.measureText(text).width, maxW);
  ctx.fillStyle = "rgba(10,14,28,.78)";
  ctx.fillRect(x, y, tw + 16, 22);
  ctx.fillStyle = color;
  if (isFinite(maxW)) ctx.fillText(text, x + 8, y + 15, maxW);
  else ctx.fillText(text, x + 8, y + 15);
  return tw + 16;
}
