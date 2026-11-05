import { TAU, clamp } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import { COLOR, SHOW, WORD, kidName, kidShort } from "../data";
import type { W } from "../model";
import { realNow, spring } from "./motion";
import { drawGlyph, hash } from "./people";

/**
 * "All 120 kids" (changes 0018, 0019): the possible kids as tiny faces on five plain-word strips (one strip on small stages),
 * easing to their new places every frame; hover or tap a face for its name. Step 7 of change 0019 turns this into piles.
 */

const NK = 120;
const pos = new Float64Array(5 * NK), vel = new Float64Array(5 * NK);
const mk = new Float64Array(10), mv = new Float64Array(10);
let eased = false;
const fxp = new Float32Array(5 * NK * 2);
let fxn = 0, faceR = 3;
let hover: { x: number; y: number; at: number } | null = null;
let selTrait = 0;
let selBox: [number, number, number, number] | null = null;

/** Pointer over the stage (from the console's stage interaction). */
export function pointAt(x: number, y: number) { hover = { x, y, at: realNow() }; }
/** A tap: cycles the shown strip when the strip label is tapped on small stages, else points at a face. */
export function tapAt(x: number, y: number) {
  if (selBox && x >= selBox[0] && x <= selBox[0] + selBox[2] && y >= selBox[1] && y <= selBox[1] + selBox[3]) { selTrait = (selTrait + 1) % 5; return; }
  pointAt(x, y);
}
export const stageTrait = () => selTrait;
export function setStageTrait(i: number) { selTrait = ((i % 5) + 5) % 5; }

/** Draw the strips from `top` to the bottom of the stage. `pulse[i]` is when trait i last changed (for a soft glow). */
export function drawCrowd(c: CanvasRenderingContext2D, W: number, H: number, top: number, w: W, base: W | null, v: number[][], avg: number[], bavg: number[] | null, now: number, dt: number, reduced: boolean, pulse: Float64Array) {
  const compact = H - top < 300 || W < 520;
  // ── Crowd strips ──
  c.fillStyle = STAGE.void; c.fillRect(0, top, W, H - top);
  const rows = compact ? [selTrait] : [0, 1, 2, 3, 4];
  const labW = compact ? 118 : W < 700 ? 104 : 116, x0 = labW + 10, x1 = W - 16;
  const rh = (H - top - (compact ? 22 : 24)) / rows.length;
  faceR = clamp(rh * 0.09, 2.4, 4);
  const col = base ? STAGE.alt : STAGE.base;
  const X = (val: number) => x0 + ((x1 - x0) * val) / 100;
  // Easing: the crowd glides to its new places; snap on the first frame and with reduced motion
  for (let i = 0; i < 5; i++) for (let j = 0; j < Math.min(NK, w.k.length); j++) {
    const q = i * NK + j;
    if (!eased || reduced) { pos[q] = v[i][j]; vel[q] = 0; } else spring(pos, vel, q, v[i][j], dt);
  }
  for (let i = 0; i < 5; i++) {
    if (!eased || reduced) { mk[i] = avg[i]; mv[i] = 0; mk[5 + i] = bavg ? bavg[i] : avg[i]; mv[5 + i] = 0; }
    else { spring(mk, mv, i, avg[i], dt); spring(mk, mv, 5 + i, bavg ? bavg[i] : avg[i], dt); }
  }
  eased = true;
  fxn = 0;
  selBox = null;
  c.textBaseline = "middle";
  rows.forEach((i, r) => {
    const s = SHOW[i], y0 = top + 8 + r * rh, yc = y0 + rh / 2;
    // A soft pulse when a change touches this trait
    const pq = (now - pulse[i]) / 0.9;
    if (!reduced && pq >= 0 && pq < 1) { c.fillStyle = `rgba(255,200,87,${(0.12 * (1 - pq)).toFixed(3)})`; c.fillRect(0, y0, W, rh); }
    // Label: glyph + word (on small stages a chip you can tap to switch)
    c.font = "500 12px " + FONT.body; c.textAlign = "left";
    if (compact) {
      const lw = c.measureText(WORD[s]).width + 48;
      c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(8, yc - 13, lw, 26, 13); c.fill();
      c.strokeStyle = STAGE.line; c.stroke();
      drawGlyph(c, s, 22, yc, 16, COLOR[s]);
      c.fillStyle = STAGE.ink; c.fillText(WORD[s], 34, yc + 0.5);
      c.strokeStyle = STAGE.ink2; c.lineWidth = 1.4; c.beginPath(); c.moveTo(lw - 4, yc - 2); c.lineTo(lw, yc + 2); c.lineTo(lw + 4, yc - 2); c.stroke(); c.lineWidth = 1;
      selBox = [8, yc - 16, lw + 8, 32];
    } else {
      drawGlyph(c, s, 18, yc, 16, COLOR[s]);
      c.fillStyle = STAGE.ink; c.fillText(WORD[s], 32, yc + 0.5);
    }
    // Track with the "in between" middle lightly marked
    c.fillStyle = "rgba(255,237,215,.035)"; c.fillRect(X(35), y0 + 2, X(65) - X(35), rh - 4);
    c.strokeStyle = STAGE.line; c.beginPath(); c.moveTo(x0, yc); c.lineTo(x1, yc); c.stroke();
    // Faces
    const amp = Math.max(0, rh / 2 - faceR - 3);
    c.fillStyle = col; c.globalAlpha = 0.85; c.beginPath();
    for (let j = 0; j < w.k.length && j < NK; j++) {
      const fx = X(pos[i * NK + j]), fyy = yc + ((w.k[j].j + hash(j * 5 + i)) / 2 - 0.5) * 2 * amp;
      c.moveTo(fx + faceR, fyy); c.arc(fx, fyy, faceR, 0, TAU);
      fxp[fxn * 2] = fx; fxp[fxn * 2 + 1] = fyy; fxn++;
    }
    c.fill(); c.globalAlpha = 1;
    if (faceR >= 3.4) {
      c.fillStyle = STAGE.void; c.beginPath();
      const start = fxn - Math.min(NK, w.k.length);
      for (let q = start; q < fxn; q++) { const fx = fxp[q * 2], fyy = fxp[q * 2 + 1]; c.moveTo(fx, fyy); c.arc(fx - faceR * 0.36, fyy - faceR * 0.12, faceR * 0.2, 0, TAU); c.moveTo(fx + faceR * 0.56, fyy); c.arc(fx + faceR * 0.36, fyy - faceR * 0.12, faceR * 0.2, 0, TAU); }
      c.fill();
    }
    // Typical kid marker (and the no-change one, dashed)
    if (base) {
      const bx = X(mk[5 + i]);
      c.strokeStyle = STAGE.base; c.lineWidth = 1.5; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(bx, y0 + 2); c.lineTo(bx, y0 + rh - 2); c.stroke(); c.setLineDash([]);
    }
    const mx = X(mk[i]);
    c.strokeStyle = STAGE.ink; c.lineWidth = 2; c.beginPath(); c.moveTo(mx, y0 + 4); c.lineTo(mx, y0 + rh - 2); c.stroke(); c.lineWidth = 1;
    c.fillStyle = STAGE.ink; c.beginPath(); c.moveTo(mx - 4, y0 + 1); c.lineTo(mx + 4, y0 + 1); c.lineTo(mx, y0 + 6); c.fill();
  });
  // Ends of the scale in words
  c.font = "500 10px " + FONT.body; c.fillStyle = STAGE.ink2; c.textBaseline = "alphabetic";
  c.textAlign = "left"; c.fillText("← less", x0, H - 7);
  c.textAlign = "right"; c.fillText("more →", x1, H - 7);
  if (x1 - x0 > 380) {
    c.textAlign = "center";
    c.fillText(base ? "Each face is one possible kid · line: typical kid · dashed: no change" : "Each face is one possible kid · line: the typical kid", (x0 + x1) / 2, H - 7, x1 - x0 - 110);
  }

  // Hover / tap label on a face
  if (hover && now - hover.at < 2.5) {
    let best = -1, bd = Math.max(8, faceR + 4) ** 2;
    for (let q = 0; q < fxn; q++) { const d = (fxp[q * 2] - hover.x) ** 2 + (fxp[q * 2 + 1] - hover.y) ** 2; if (d < bd) { bd = d; best = q; } }
    if (best >= 0) {
      const j = best % Math.min(NK, w.k.length), hx = fxp[best * 2], hy = fxp[best * 2 + 1];
      c.strokeStyle = STAGE.ink; c.lineWidth = 1.5; c.beginPath(); c.arc(hx, hy, faceR + 2.5, 0, TAU); c.stroke();
      const txt = `Kid #${j + 1} · ${kidName(j)}: ${kidShort(v.map((xs) => xs[j]))}`;
      c.font = "500 12px " + FONT.body;
      const tw = Math.min(c.measureText(txt).width, W - 32), bx = clamp(hx - tw / 2 - 8, 8, W - tw - 24), by = Math.max(top + 2, hy - faceR - 32);
      c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(bx, by, tw + 16, 24, 12); c.fill();
      c.fillStyle = STAGE.ink; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, bx + 8, by + 12.5, tw);
    }
  }

}
