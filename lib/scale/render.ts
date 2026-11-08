import { clamp, fmtLen, lerp } from "../sim/core";
import { FONT, STAGE } from "../sim/draw";
import { GLYPHS } from "./glyphs";
import { SCALE_OBJECTS, ZOOM_MAX, ZOOM_MIN, objectSay, type ScaleObject } from "./objects";
import { pageT } from "../i18n/page";

/**
 * Draws one object with its own renderer (change 0012). The canvas is set so the object's box is
 * [-1, 1]; `t` drives its motion and is frozen under reduced motion.
 */
export function drawGlyph(ctx: CanvasRenderingContext2D, o: ScaleObject, x: number, y: number, d: number, t: number): void {
  const r = d / 2;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(r, r);
  GLYPHS[o.id]({ ctx, r, t, px: 1 / r, a: ctx.globalAlpha });
  ctx.restore();
}

interface Hit { o: ScaleObject; x: number; y: number; r: number; ly: number }

/**
 * Scale-of-the-universe view. Objects are laid side by side by size; the anchor between two
 * neighbouring objects is interpolated so zooming is continuous.
 */
export class ScaleView {
  z = 0.85;
  zt = 0.85;
  hover: ScaleObject | null = null;
  focus: ScaleObject | null = null;
  /** Seconds of object motion; held still when `reducedMotion` is set. */
  t = 0;
  reducedMotion = false;
  private hoverK = 0;
  private hoverObj: ScaleObject | null = null;
  private hits: Hit[] = [];

  zoomBy(dz: number) { this.zt = clamp(this.zt + dz, ZOOM_MIN, ZOOM_MAX); }
  zoomTo(z: number) { this.zt = clamp(z, ZOOM_MIN, ZOOM_MAX); }

  /** Returns true when the focused object changed (so the UI can re-render). */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number): boolean {
    this.z += (this.zt - this.z) * Math.min(1, dt * 8);
    if (!this.reducedMotion) this.t += dt;
    // Hover brightens a world-linked object over ~150 ms
    if (this.hover?.sandbox) this.hoverObj = this.hover;
    this.hoverK = clamp(this.hoverK + (this.hover?.sandbox ? dt : -dt) / 0.15, 0, 1);
    ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, W, H);
    const objs = SCALE_OBJECTS, span = W * 0.62, target = this.z - 0.35;
    let i = 0;
    while (i < objs.length - 2 && objs[i + 1].L < target) i++;
    const t = clamp((target - objs[i].L) / (objs[i + 1].L - objs[i].L), 0, 1);
    const D = objs.map((o) => Math.pow(10, o.L - this.z) * span);
    const X = [0];
    for (let k = 1; k < objs.length; k++) X.push(X[k - 1] + D[k - 1] / 2 + D[k] / 2 + 0.12 * (D[k - 1] + D[k]) + 6);
    const off = W / 2 - lerp(X[i], X[i + 1], t), cy = H * 0.46, minD = Math.min(W, H);
    const prevFocus = this.focus;
    this.focus = t < 0.5 ? objs[i] : objs[i + 1];
    this.hits = [];
    objs.forEach((o, k) => {
      const d = D[k], x = off + X[k];
      if (x + d / 2 < -50 || x - d / 2 > W + 50) return;
      const a = clamp((d - 3) / 14, 0, 1) * clamp((minD * 2.2 - d) / (minD * 0.9), 0, 1);
      if (a <= 0.01) return;
      ctx.globalAlpha = a;
      drawGlyph(ctx, o, x, cy, d, this.t);
      if (o === this.hoverObj && this.hoverK > 0) {
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = a * 0.15 * this.hoverK;
        drawGlyph(ctx, o, x, cy, d, this.t);
        ctx.globalCompositeOperation = "source-over";
      }
      // Labels of objects only a few pixels wide fade out, so neighbours' labels don't pile up
      ctx.globalAlpha = Math.min(1, a * 1.2) * clamp((d - 14) / 26, 0, 1);
      const ly = Math.min(H - 44, cy + Math.max((d / 2) * o.ext, 8) + 18);
      ctx.textAlign = "center";
      ctx.fillStyle = STAGE.ink; ctx.font = "600 12px " + FONT.display; ctx.fillText(objectSay()(`${o.id}.name`).toLocaleUpperCase(pageT().tag), x, ly);
      ctx.fillStyle = STAGE.ink2; ctx.font = "500 11px " + FONT.mono; ctx.fillText(fmtLen(o.size), x, ly + 16);
      if (o.sandbox) { ctx.fillStyle = this.hover === o ? STAGE.alt : "rgba(255,181,71,.85)"; ctx.font = "600 12px " + FONT.display; ctx.fillText(pageT()("scale.stage.open").toLocaleUpperCase(pageT().tag), x, ly + 32); }
      ctx.textAlign = "left";
      this.hits.push({ o, x, y: cy, r: Math.max(d / 2, 10), ly });
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = STAGE.ink2; ctx.font = "500 11px " + FONT.mono;
    ctx.fillText(pageT()("scale.stage.screen", { len: fmtLen(Math.pow(10, this.z) / 0.62) }), 14, H - 14);
    return prevFocus !== this.focus;
  }

  hitTest(x: number, y: number): ScaleObject | null {
    const h = this.hits.find((q) => Math.hypot(q.x - x, q.y - y) < q.r || (Math.abs(q.x - x) < 60 && y > q.ly - 14 && y < q.ly + 36));
    return h ? h.o : null;
  }
}
