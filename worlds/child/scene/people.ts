import { TAU, clamp, lerp, mix } from "@/lib/sim/core";
import type { Params } from "@/lib/sim/types";
import { FAMILIES, type Show } from "../data";

/**
 * People and things on the child stage (changes 0018, 0019): friendly round characters, props, the trait glyphs.
 * Framework-free; drawing only.
 */

export type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
export const strHash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/* ───────────── people ───────────── */

export const SKIN = ["#F3D5B5", "#E6BC94", "#CF9A6B", "#A9744A", "#7C5233", "#5C3B24"];
export const HAIR = ["#2A1B12", "#4E3220", "#7A4A28", "#B7804A", "#D8B56E", "#171310"];
export const WARM = "#E07A5F", COOL = "#5B8BD0";

export interface Look { skin: string; hair: string; shirt: string; pants: string; age: number; calm: number; out: number; style: number; seed: number }
export type Hold = "book" | "magnifier" | "violin" | "tablet" | null;
export interface Pose { wave?: number; hold?: Hold; bag?: boolean; reach?: number; sit?: boolean; t?: number; badge?: boolean; blanket?: boolean }

/** The look of a parent from the family params (colours stay with the ready-made family the edit was based on). */
export function parentLook(p: Params, who: "a" | "b"): Look {
  const fam = String(p.family === "custom" ? p.from ?? "custom" : p.family), h = strHash(fam + who);
  const E = Number(p[who + "E"]), N = Number(p[who + "N"]);
  return {
    skin: SKIN[h % SKIN.length], hair: HAIR[(h >> 3) % HAIR.length], shirt: mix(COOL, WARM, E / 100), pants: "#2E3550",
    age: 34 + (h % 6), calm: 100 - N, out: E, style: (h >> 5) % 4, seed: h % 97,
  };
}

/** Is this a ready-made family id (so parts can show its name)? */
export const isFamily = (id: string) => id in FAMILIES;

export function hexMix(a: string, b: string) { return mix(a, b, 0.5); }

/**
 * A friendly round character standing on (x, fy), `h` tall. Proportions follow age (big head when small), the face
 * follows calm (smile, brows), the arms follow outgoing (open, waving). Everyone is simple shapes; no gendered rules.
 */
export function drawPerson(c: Ctx, x: number, fy: number, h: number, L: Look, P: Pose = {}) {
  const t = P.t ?? 0, af = clamp((L.age - 1) / 17, 0, 1);
  const headD = h * lerp(0.31, 0.155, af ** 0.7), hr = headD / 2;
  const bodyH = h - headD, legL = bodyH * lerp(0.36, 0.5, af);
  const tw = h * lerp(0.27, 0.2, af) + (L.age > 40 ? h * 0.02 : 0);
  const breathe = 1 + 0.014 * Math.sin(t * 1.7 + L.seed);
  const sit = !!P.sit;
  const hipY = sit ? fy - legL * 0.62 : fy - legL;
  const torsoL = (bodyH - legL - bodyH * 0.03) * breathe;
  const shY = hipY - torsoL, shy = L.out < 40 ? hr * 0.1 : 0;
  const headY = shY - hr * 0.9 + shy;
  const lw = tw * 0.36, aw = tw * 0.24, armL = torsoL * 1.02;
  c.lineCap = "round"; c.lineJoin = "round";
  // Backpack behind the body
  if (P.bag) { c.fillStyle = "#3F6E5A"; c.beginPath(); c.roundRect(x - tw * 0.72, shY + torsoL * 0.08, tw * 0.5, torsoL * 0.72, tw * 0.12); c.fill(); }
  // Legs and shoes
  c.strokeStyle = L.pants; c.lineWidth = lw;
  if (sit) {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * tw * 0.2, hipY); c.lineTo(x + s * tw * 0.2 + legL * 0.45, hipY); c.lineTo(x + s * tw * 0.2 + legL * 0.5, fy - lw * 0.5); c.stroke(); }
  } else {
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * tw * 0.2, hipY); c.lineTo(x + s * tw * 0.22, fy - lw * 0.5); c.stroke(); }
  }
  c.fillStyle = "#1E1612";
  for (const s of [-1, 1]) { const sx = sit ? x + s * tw * 0.2 + legL * 0.5 : x + s * tw * 0.22; c.beginPath(); c.ellipse(sx + tw * 0.06, fy - lw * 0.25, lw * 0.62, lw * 0.32, 0, 0, TAU); c.fill(); }
  // Body
  c.fillStyle = L.shirt; c.beginPath(); c.roundRect(x - tw / 2, shY, tw, torsoL + lw * 0.35, [tw * 0.32, tw * 0.32, tw * 0.12, tw * 0.12]); c.fill();
  if (P.bag) { c.strokeStyle = "#2C5444"; c.lineWidth = Math.max(1, tw * 0.07); c.beginPath(); c.moveTo(x - tw * 0.3, shY + 1); c.lineTo(x - tw * 0.22, shY + torsoL * 0.7); c.stroke(); }
  if (P.badge) heart(c, x + tw * 0.18, shY + torsoL * 0.3, Math.max(1.5, tw * 0.12), "#FF8FA3");
  if (P.blanket) { c.fillStyle = "#6E7FA8"; c.beginPath(); c.roundRect(x - tw * 0.7, hipY - torsoL * 0.15, tw * 1.4 + legL * 0.5, legL * 0.7, tw * 0.15); c.fill(); }
  // Arms: left hangs (opens with outgoing), right waves, reaches or holds
  const open = clamp(L.out / 100, 0, 1);
  const arm = (sx: number, ex: number, ey: number) => {
    const ax = x + sx * (tw / 2 - aw * 0.3), ay = shY + aw * 0.6;
    c.strokeStyle = L.shirt; c.lineWidth = aw; c.beginPath(); c.moveTo(ax, ay); c.lineTo(lerp(ax, ex, 0.45), lerp(ay, ey, 0.45)); c.stroke();
    c.strokeStyle = L.skin; c.lineWidth = aw * 0.85; c.beginPath(); c.moveTo(lerp(ax, ex, 0.45), lerp(ay, ey, 0.45)); c.lineTo(ex, ey); c.stroke();
    c.fillStyle = L.skin; c.beginPath(); c.arc(ex, ey, aw * 0.55, 0, TAU); c.fill();
  };
  arm(-1, x - tw / 2 - armL * (0.12 + 0.18 * open), shY + armL * (0.95 - 0.08 * open));
  let hx: number, hy: number;
  if (P.wave && P.wave > 0) {
    const sw = Math.sin(t * 7) * 0.25 * P.wave;
    hx = x + tw / 2 + armL * (0.35 + 0.2 * sw); hy = shY - armL * (0.55 * P.wave) + armL * (1 - P.wave) * 0.9;
  } else if (P.reach) { hx = x + P.reach * (tw / 2 + armL * 0.5); hy = shY + armL * 0.85; }
  else if (P.hold) { hx = x + tw * 0.55; hy = shY + armL * 0.55; }
  else { hx = x + tw / 2 + armL * (0.12 + 0.18 * open); hy = shY + armL * (0.95 - 0.08 * open); }
  arm(1, hx, hy);
  if (P.hold) holdItem(c, P.hold, hx, hy, Math.max(4, hr * 0.95), t);
  // Head and hair
  const hair = mix(L.hair, "#C9C1B4", clamp((L.age - 42) / 22, 0, 0.85));
  if (L.style === 1 && L.age > 3) { c.fillStyle = hair; c.beginPath(); c.roundRect(x - hr * 1.05, headY - hr * 0.6, hr * 2.1, hr * 1.75, hr * 0.5); c.fill(); }
  c.fillStyle = L.skin; c.beginPath(); c.arc(x, headY, hr, 0, TAU); c.fill();
  c.fillStyle = hair;
  if (L.age < 2.5) { c.beginPath(); c.arc(x, headY - hr * 0.95, hr * 0.22, 0, TAU); c.fill(); }
  else if (L.style === 2) { for (let k = 0; k < 7; k++) { const a = Math.PI * (1.05 + (k / 6) * 0.9); c.beginPath(); c.arc(x + Math.cos(a) * hr * 0.92, headY + Math.sin(a) * hr * 0.92, hr * 0.32, 0, TAU); c.fill(); } }
  else {
    c.beginPath(); c.arc(x, headY, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98); c.closePath(); c.fill();
    if (L.style === 3) { c.beginPath(); c.arc(x + hr * 0.2, headY - hr * 1.1, hr * 0.36, 0, TAU); c.fill(); }
  }
  // Face: eyes blink now and then, brows lift inward when worried, the mouth smiles with calm
  const ey = headY - hr * 0.02, er = Math.max(0.8, hr * 0.11);
  const blink = t > 0 && (t + L.seed * 1.37) % 4.3 < 0.13;
  c.fillStyle = "#1A120B"; c.strokeStyle = "#1A120B";
  if (blink) { c.lineWidth = Math.max(0.8, hr * 0.07); c.beginPath(); for (const s of [-1, 1]) { c.moveTo(x + s * hr * 0.36 - er, ey); c.lineTo(x + s * hr * 0.36 + er, ey); } c.stroke(); }
  else { c.beginPath(); c.arc(x - hr * 0.36, ey, er, 0, TAU); c.arc(x + hr * 0.36, ey, er, 0, TAU); c.fill(); }
  if (hr >= 6 && L.calm < 45) {
    const k = clamp((45 - L.calm) / 30, 0, 1);
    c.lineWidth = Math.max(0.8, hr * 0.07); c.beginPath();
    for (const s of [-1, 1]) { c.moveTo(x + s * hr * 0.55, ey - hr * 0.26); c.lineTo(x + s * hr * 0.18, ey - hr * (0.26 + 0.14 * k)); }
    c.stroke();
  }
  if (hr >= 3.5) {
    const k = clamp((L.calm - 40) / 50, -0.6, 1), my = headY + hr * 0.42;
    c.lineWidth = Math.max(0.9, hr * 0.09); c.beginPath(); c.moveTo(x - hr * 0.26, my); c.quadraticCurveTo(x, my + k * hr * 0.32, x + hr * 0.26, my); c.stroke();
  }
  if (L.age < 14 && hr >= 5) { c.fillStyle = "rgba(255,120,120,.22)"; c.beginPath(); c.arc(x - hr * 0.55, headY + hr * 0.25, hr * 0.17, 0, TAU); c.arc(x + hr * 0.55, headY + hr * 0.25, hr * 0.17, 0, TAU); c.fill(); }
  return { headY, hr, hx, hy, top: headY - hr };
}

export function heart(c: Ctx, x: number, y: number, r: number, col: string) {
  c.fillStyle = col; c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
  c.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  c.fill();
}

export function holdItem(c: Ctx, what: Exclude<Hold, null>, x: number, y: number, s: number, t: number) {
  c.save(); c.translate(x, y);
  if (what === "book") {
    c.rotate(-0.15); c.fillStyle = "#C8553D"; c.fillRect(-s * 0.9, -s * 0.7, s * 1.8, s * 1.3);
    c.fillStyle = "#F4E6CF"; c.fillRect(-s * 0.8, -s * 0.6, s * 0.75, s * 1.1); c.fillRect(s * 0.05, -s * 0.6, s * 0.75, s * 1.1);
  } else if (what === "magnifier") {
    c.strokeStyle = "#D9C9A8"; c.lineWidth = Math.max(1, s * 0.22); c.beginPath(); c.arc(s * 0.4, -s * 0.6, s * 0.55, 0, TAU); c.stroke();
    c.beginPath(); c.moveTo(0, 0); c.lineTo(s * 0.02, -s * 0.05); c.stroke();
    c.fillStyle = "rgba(127,178,248,.25)"; c.beginPath(); c.arc(s * 0.4, -s * 0.6, s * 0.45, 0, TAU); c.fill();
  } else if (what === "violin") {
    c.rotate(-0.6); c.fillStyle = "#9A5A2C"; c.beginPath(); c.ellipse(0, 0, s * 0.45, s * 0.8, 0, 0, TAU); c.fill();
    c.strokeStyle = "#5A3418"; c.lineWidth = Math.max(1, s * 0.15); c.beginPath(); c.moveTo(0, -s * 0.6); c.lineTo(0, -s * 1.6); c.stroke();
  } else {
    c.fillStyle = "#1A1C24"; c.beginPath(); c.roundRect(-s * 0.7, -s * 0.95, s * 1.4, s * 1.1, s * 0.15); c.fill();
    c.fillStyle = `rgba(127,178,248,${(0.55 + 0.15 * Math.sin(t * 2)).toFixed(3)})`; c.fillRect(-s * 0.58, -s * 0.83, s * 1.16, s * 0.86);
  }
  c.restore();
}

export function drawDog(c: Ctx, x: number, fy: number, s: number, t: number) {
  const wag = Math.sin(t * 9) * 0.5;
  c.fillStyle = "#B07A4A"; c.strokeStyle = "#B07A4A"; c.lineCap = "round";
  c.lineWidth = s * 0.18; c.beginPath(); c.moveTo(x - s * 0.55, fy - s * 0.55); c.lineTo(x - s * 0.85, fy - s * 0.85 - wag * s * 0.2); c.stroke();
  c.beginPath(); c.ellipse(x, fy - s * 0.5, s * 0.6, s * 0.3, 0, 0, TAU); c.fill();
  c.lineWidth = s * 0.14;
  for (const lx of [-0.4, -0.2, 0.25, 0.42]) { c.beginPath(); c.moveTo(x + lx * s, fy - s * 0.4); c.lineTo(x + lx * s, fy - s * 0.04); c.stroke(); }
  c.beginPath(); c.arc(x + s * 0.62, fy - s * 0.78, s * 0.27, 0, TAU); c.fill();
  c.fillStyle = "#7A5230"; c.beginPath(); c.ellipse(x + s * 0.5, fy - s * 0.8, s * 0.1, s * 0.2, 0.3, 0, TAU); c.fill();
  c.fillStyle = "#1A120B"; c.beginPath(); c.arc(x + s * 0.7, fy - s * 0.82, s * 0.05, 0, TAU); c.arc(x + s * 0.88, fy - s * 0.74, s * 0.06, 0, TAU); c.fill();
}

export function football(c: Ctx, x: number, y: number, r: number) {
  c.fillStyle = "#F2EDE4"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = "#2A2420"; c.beginPath();
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * TAU) / 5; c.lineTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38); }
  c.closePath(); c.fill();
}

export function cloud(c: Ctx, x: number, y: number, s: number, alpha: number) {
  c.fillStyle = `rgba(169,177,214,${alpha.toFixed(3)})`; c.beginPath();
  c.arc(x - s * 0.5, y, s * 0.42, 0, TAU); c.arc(x, y - s * 0.2, s * 0.55, 0, TAU); c.arc(x + s * 0.55, y, s * 0.4, 0, TAU);
  c.fill();
}

/* ───────────── trait glyphs (stage + chart) ───────────── */

/** Small line glyphs on a 24 grid: magnifier, tick box, speech bubble, heart, leaf. */
export function drawGlyph(c: Ctx, s: Show, x: number, y: number, size: number, col: string) {
  const k = size / 24;
  c.save(); c.translate(x - size / 2, y - size / 2); c.scale(k, k);
  c.strokeStyle = col; c.lineWidth = 1.8; c.lineCap = "round"; c.lineJoin = "round"; c.beginPath();
  if (s === "O") { c.arc(10.5, 10.5, 5.5, 0, TAU); c.moveTo(14.5, 14.5); c.lineTo(19, 19); }
  else if (s === "C") { c.roundRect(5, 5, 14, 14, 2.5); c.moveTo(8.5, 12.5); c.lineTo(11, 15); c.lineTo(15.5, 9.5); }
  else if (s === "E") { c.moveTo(5, 7); c.arcTo(5, 5, 7, 5, 2); c.lineTo(17, 5); c.arcTo(19, 5, 19, 7, 2); c.lineTo(19, 13); c.arcTo(19, 15, 17, 15, 2); c.lineTo(11, 15); c.lineTo(7, 19); c.lineTo(7, 15); c.arcTo(5, 15, 5, 13, 2); c.closePath(); }
  else if (s === "A") { c.moveTo(12, 19); c.bezierCurveTo(4, 13.5, 4.5, 6, 9, 6); c.bezierCurveTo(10.8, 6, 12, 7.5, 12, 8.5); c.bezierCurveTo(12, 7.5, 13.2, 6, 15, 6); c.bezierCurveTo(19.5, 6, 20, 13.5, 12, 19); }
  else { c.moveTo(6, 18); c.bezierCurveTo(6, 10, 10, 6, 18, 6); c.bezierCurveTo(18, 14, 14, 18, 6, 18); c.moveTo(6, 18); c.lineTo(13, 11); }
  c.stroke(); c.restore();
}

