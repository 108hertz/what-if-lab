import { TAU, clamp, fmtLen, lerp, mix } from "../sim/core";
import { FONT, blob } from "../sim/draw";
import { SCALE_OBJECTS, ZOOM_MAX, ZOOM_MIN, type ScaleObject } from "./objects";

/** Precomputed decorative point sets (deterministic). */
const GALAXY_PTS: [number, number][] = [];
const WEB_PTS: [number, number, number][] = [];
const LAND_PTS: [number, number][] = [];
(() => {
  let r = 7;
  const R = () => (r = (r * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 500; i++) {
    const arm = i % 2, t = R() * 3.2, rr = 0.1 + t / 3.4, a = t * 1.7 + arm * Math.PI + (R() - 0.5) * 0.5;
    GALAXY_PTS.push([rr * Math.cos(a), rr * Math.sin(a) * 0.95]);
  }
  for (let i = 0; i < 500; i++) { const a = R() * TAU, rr = Math.sqrt(R()) * 0.5; WEB_PTS.push([rr * Math.cos(a) + Math.sin(i) * 0.03, rr * Math.sin(a), R()]); }
  for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU; LAND_PTS.push([Math.cos(a) * (0.38 + R() * 0.14), Math.sin(a) * (0.3 + R() * 0.14)]); }
})();

export function drawGlyph(ctx: CanvasRenderingContext2D, o: ScaleObject, x: number, y: number, d: number): void {
  const r = d / 2;
  ctx.save();
  switch (o.kind) {
    case "ball": case "sun": case "moon": case "earth": case "jupiter": {
      if (o.kind === "sun") {
        const g = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 1.6);
        g.addColorStop(0, "rgba(255,200,90,.5)"); g.addColorStop(1, "rgba(255,200,90,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, TAU); ctx.fill();
      }
      const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, mix(o.color, "#FFFFFF", 0.35)); g.addColorStop(1, o.color);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
      if (o.kind === "earth") {
        ctx.fillStyle = "#4F9A5A";
        for (const [a, b, c, e] of [[-0.3, -0.2, 0.35, 0.22], [0.25, 0.1, 0.25, 0.35], [-0.1, 0.45, 0.3, 0.12]]) { ctx.beginPath(); ctx.ellipse(x + a * r, y + b * r, c * r, e * r, 0.5, 0, TAU); ctx.fill(); }
        ctx.fillStyle = "#F2F6FB"; ctx.fillRect(x - r, y - r, 2 * r, r * 0.18); ctx.fillRect(x - r, y + r * 0.84, 2 * r, r * 0.2);
      }
      if (o.kind === "jupiter") {
        ctx.fillStyle = "rgba(150,100,70,.45)";
        for (const b of [-0.5, -0.15, 0.25, 0.55]) ctx.fillRect(x - r, y + b * r, 2 * r, r * 0.13);
        ctx.fillStyle = "#C0644A"; ctx.beginPath(); ctx.ellipse(x + r * 0.3, y + r * 0.35, r * 0.14, r * 0.08, 0, 0, TAU); ctx.fill();
      }
      if (o.kind === "moon") {
        ctx.fillStyle = "rgba(120,125,140,.5)";
        for (const [a, b, c] of [[-0.3, -0.2, 0.18], [0.25, 0.3, 0.12], [0.1, -0.45, 0.09]]) { ctx.beginPath(); ctx.arc(x + a * r, y + b * r, c * r, 0, TAU); ctx.fill(); }
      }
      break;
    }
    case "atom":
      ctx.strokeStyle = o.color; ctx.lineWidth = Math.max(1, r * 0.03);
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.35, (i * Math.PI) / 3, 0, TAU); ctx.stroke(); }
      ctx.fillStyle = "#FF9A8B"; ctx.beginPath(); ctx.arc(x, y, Math.max(1.5, r * 0.08), 0, TAU); ctx.fill();
      ctx.fillStyle = "#E7EAF6"; ctx.beginPath(); ctx.arc(x + r, y, Math.max(1.5, r * 0.05), 0, TAU); ctx.fill();
      break;
    case "helix":
      ctx.lineWidth = Math.max(1, r * 0.12);
      ["#7EE0C3", "#9FB4FF"].forEach((c, s) => {
        ctx.strokeStyle = c; ctx.beginPath();
        for (let k = 0; k <= 40; k++) { const t = k / 40, yy = y - r * 1.6 + t * r * 3.2, xx = x + Math.sin(t * TAU * 1.5 + s * Math.PI) * r; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      });
      break;
    case "virus":
      ctx.strokeStyle = o.color; ctx.lineWidth = Math.max(1, r * 0.08);
      for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.7, y + Math.sin(a) * r * 0.7); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); ctx.stroke(); }
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x, y, r * 0.72, 0, TAU); ctx.fill();
      break;
    case "cell":
      ctx.fillStyle = mix(o.color, "#0A0E1C", 0.45); ctx.strokeStyle = o.color; ctx.lineWidth = Math.max(1, r * 0.06);
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.stroke();
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x + r * 0.15, y - r * 0.1, r * 0.28, 0, TAU); ctx.fill();
      break;
    case "rbc":
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
      ctx.fillStyle = "rgba(120,20,25,.5)"; ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, TAU); ctx.fill();
      break;
    case "blob":
      blob(ctx, x, y, r, o.color, 0.6, 0, 70);
      break;
    case "tower":
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x - r * 0.28, y + r); ctx.lineTo(x + r * 0.28, y + r); ctx.fill();
      break;
    case "peak":
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.lineTo(x - r, y + r * 0.5); ctx.lineTo(x + r, y + r * 0.5); ctx.fill();
      ctx.fillStyle = "#F2F6FB"; ctx.beginPath(); ctx.moveTo(x, y - r * 0.6); ctx.lineTo(x - r * 0.3, y - r * 0.27); ctx.lineTo(x + r * 0.3, y - r * 0.27); ctx.fill();
      break;
    case "land":
      ctx.fillStyle = o.color; ctx.beginPath();
      LAND_PTS.forEach(([a, b], i) => (i ? ctx.lineTo(x + a * d, y + b * d) : ctx.moveTo(x + a * d, y + b * d)));
      ctx.fill();
      break;
    case "orbit": case "orbits":
      ctx.strokeStyle = o.color; ctx.globalAlpha = 0.7; ctx.lineWidth = 1.2;
      for (const f of o.kind === "orbit" ? [1] : [0.03, 0.05, 0.07, 0.1, 0.35, 0.64, 0.8, 1]) { ctx.beginPath(); ctx.arc(x, y, r * f, 0, TAU); ctx.stroke(); }
      ctx.globalAlpha = 1; ctx.fillStyle = "#FFD76A"; ctx.beginPath(); ctx.arc(x, y, 3, 0, TAU); ctx.fill();
      ctx.fillStyle = o.color; ctx.beginPath(); ctx.arc(x + r * 0.7071, y - r * 0.7071, 3, 0, TAU); ctx.fill();
      break;
    case "line":
      ctx.strokeStyle = o.color; ctx.lineWidth = 2; ctx.beginPath();
      ctx.moveTo(x - r, y); ctx.lineTo(x + r, y); ctx.moveTo(x - r, y - 6); ctx.lineTo(x - r, y + 6); ctx.moveTo(x + r, y - 6); ctx.lineTo(x + r, y + 6); ctx.stroke();
      ctx.fillStyle = "#FFD76A"; ctx.beginPath(); ctx.arc(x - r, y, 3, 0, TAU); ctx.arc(x + r, y, 3, 0, TAU); ctx.fill();
      break;
    case "nebula":
      for (const [c, a, b, s] of [["#E28BD1", 0, 0, 1], ["#7FB0FF", 0.3, -0.2, 0.6], ["#FFB37A", -0.3, 0.25, 0.5]] as [string, number, number, number][]) {
        const g = ctx.createRadialGradient(x + a * r, y + b * r, 0, x + a * r, y + b * r, r * s);
        g.addColorStop(0, c + "AA"); g.addColorStop(1, c + "00");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + a * r, y + b * r, r * s, 0, TAU); ctx.fill();
      }
      break;
    case "galaxy": {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 0.35);
      g.addColorStop(0, "rgba(255,240,210,.9)"); g.addColorStop(1, "rgba(255,240,210,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, TAU); ctx.fill();
      ctx.fillStyle = o.color; const s = Math.max(1, d / 300);
      for (const [a, b] of GALAXY_PTS) ctx.fillRect(x + a * r, y + b * r, s, s);
      break;
    }
    case "web": {
      ctx.fillStyle = o.color; const s = Math.max(1, d / 400);
      for (const [a, b, c] of WEB_PTS) { ctx.globalAlpha = 0.3 + c * 0.6; ctx.fillRect(x + a * d, y + b * d, s, s); }
      break;
    }
  }
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
  private hits: Hit[] = [];

  zoomBy(dz: number) { this.zt = clamp(this.zt + dz, ZOOM_MIN, ZOOM_MAX); }
  zoomTo(z: number) { this.zt = clamp(z, ZOOM_MIN, ZOOM_MAX); }

  /** Returns true when the focused object changed (so the UI can re-render). */
  draw(ctx: CanvasRenderingContext2D, W: number, H: number, dt: number): boolean {
    this.z += (this.zt - this.z) * Math.min(1, dt * 8);
    ctx.fillStyle = "#05070F"; ctx.fillRect(0, 0, W, H);
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
      drawGlyph(ctx, o, x, cy, d);
      ctx.globalAlpha = Math.min(1, a * 1.2);
      const ly = Math.min(H - 44, cy + Math.max(d / 2, 8) + 18);
      ctx.textAlign = "center";
      ctx.fillStyle = "#E7EAF6"; ctx.font = "500 13px " + FONT.body; ctx.fillText(o.name, x, ly);
      ctx.fillStyle = "#8F98BC"; ctx.font = "11px " + FONT.mono; ctx.fillText(fmtLen(o.size), x, ly + 15);
      if (o.sandbox) { ctx.fillStyle = this.hover === o ? "#FFC857" : "rgba(255,200,87,.85)"; ctx.font = "600 11.5px " + FONT.body; ctx.fillText("Open sandbox ›", x, ly + 31); }
      ctx.textAlign = "left";
      this.hits.push({ o, x, y: cy, r: Math.max(d / 2, 10), ly });
    });
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#8F98BC"; ctx.font = "12px " + FONT.mono;
    ctx.fillText("Screen width ≈ " + fmtLen(Math.pow(10, this.z) / 0.62), 14, 22);
    return prevFocus !== this.focus;
  }

  hitTest(x: number, y: number): ScaleObject | null {
    const h = this.hits.find((q) => Math.hypot(q.x - x, q.y - y) < q.r || (Math.abs(q.x - x) < 60 && y > q.ly - 14 && y < q.ly + 36));
    return h ? h.o : null;
  }
}
