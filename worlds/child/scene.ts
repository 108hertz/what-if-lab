import { TAU, clamp, lerp, mix } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import type { Params } from "@/lib/sim/types";
import { CHANGES, COLOR, FAMILIES, SHOW, TRAITS, WORD, kidName, kidShort, type Show } from "./data";
import { during, happened, mean, values, type W } from "./model";

/**
 * The child stage (change 0018), framework-free. Top: the family at home (a backdrop painted in layers and cached per
 * size and setting; parents, grandparent, siblings, a friend and a dog appear as characters when present). In the middle
 * of the room the typical child grows up: size, proportions, clothes, face and pose follow the age and the average
 * traits, and changes add props. Bottom: the 120 possible kids as tiny faces on five plain-word strips (one strip on
 * small stages), easing to their new places every frame. Ambient motion runs on a draw-only renderer clock and never
 * touches the world; reduced motion freezes it, makes easing instant and drops pulses.
 */

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/* ───────────── clock (draw-only) ───────────── */

let reduceQ: MediaQueryList | null = null;
export const reducedMotion = () => {
  if (typeof matchMedia === "undefined") return false;
  reduceQ ??= matchMedia("(prefers-reduced-motion: reduce)");
  return reduceQ.matches;
};
const realNow = () => (typeof performance !== "undefined" ? performance.now() / 1000 : 0);
let frozen = 0;
function clock(): number {
  if (reducedMotion()) return frozen;
  return (frozen = realNow());
}

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const strHash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

/* ───────────── people ───────────── */

const SKIN = ["#F3D5B5", "#E6BC94", "#CF9A6B", "#A9744A", "#7C5233", "#5C3B24"];
const HAIR = ["#2A1B12", "#4E3220", "#7A4A28", "#B7804A", "#D8B56E", "#171310"];
const WARM = "#E07A5F", COOL = "#5B8BD0";

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

function hexMix(a: string, b: string) { return mix(a, b, 0.5); }

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

function heart(c: Ctx, x: number, y: number, r: number, col: string) {
  c.fillStyle = col; c.beginPath();
  c.moveTo(x, y + r * 0.9);
  c.bezierCurveTo(x - r * 1.4, y - r * 0.1, x - r * 0.6, y - r * 1.1, x, y - r * 0.35);
  c.bezierCurveTo(x + r * 0.6, y - r * 1.1, x + r * 1.4, y - r * 0.1, x, y + r * 0.9);
  c.fill();
}

function holdItem(c: Ctx, what: Exclude<Hold, null>, x: number, y: number, s: number, t: number) {
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

function drawDog(c: Ctx, x: number, fy: number, s: number, t: number) {
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

function football(c: Ctx, x: number, y: number, r: number) {
  c.fillStyle = "#F2EDE4"; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
  c.fillStyle = "#2A2420"; c.beginPath();
  for (let k = 0; k < 5; k++) { const a = -Math.PI / 2 + (k * TAU) / 5; c.lineTo(x + Math.cos(a) * r * 0.38, y + Math.sin(a) * r * 0.38); }
  c.closePath(); c.fill();
}

function cloud(c: Ctx, x: number, y: number, s: number, alpha: number) {
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

/* ───────────── home backdrop (cached) ───────────── */

interface HomeSet { place: string; money: string; busy: boolean }
const backs = new Map<string, OffscreenCanvas | HTMLCanvasElement>();

function canvasOf(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
}

const WALL: Record<string, [string, string]> = { city: ["#1C2030", "#252A3E"], town: ["#2A1F17", "#34271C"], country: ["#20251A", "#2A3020"], abroad: ["#1A2430", "#22303C"] };
const FLOOR: Record<string, string> = { city: "#2A2C36", town: "#3A2A1C", country: "#3B3222", abroad: "#3A3226" };

function outside(c: Ctx, place: string, x: number, y: number, w: number, h: number) {
  const sky = c.createLinearGradient(0, y, 0, y + h);
  const SK: Record<string, [string, string]> = { city: ["#121830", "#2B2F55"], town: ["#2A1D30", "#5A3A44"], country: ["#1A2A3E", "#41556A"], abroad: ["#173048", "#2F6078"] };
  const [a, b] = SK[place] ?? SK.town;
  sky.addColorStop(0, a); sky.addColorStop(1, b); c.fillStyle = sky; c.fillRect(x, y, w, h);
  if (place === "city") {
    for (let i = 0; i < 9; i++) {
      const bw = w * (0.1 + hash(i * 3.1) * 0.08), bx = x + (i / 9) * w - bw * 0.2, bh = h * (0.35 + hash(i * 5.3) * 0.5);
      c.fillStyle = "#0D1020"; c.fillRect(bx, y + h - bh, bw, bh);
      c.fillStyle = "rgba(255,210,140,.55)";
      for (let r = 0; r < 8; r++) for (let q = 0; q < 3; q++) if (hash(i * 31 + r * 7 + q) > 0.62) c.fillRect(bx + 3 + q * (bw / 3), y + h - bh + 4 + r * 7, 2, 3);
    }
  } else if (place === "town") {
    c.fillStyle = "rgba(255,226,168,.7)"; c.beginPath(); c.arc(x + w * 0.78, y + h * 0.3, h * 0.08, 0, TAU); c.fill();
    for (let i = 0; i < 5; i++) {
      const hx = x + w * (0.05 + i * 0.2), hw = w * 0.16, hh = h * (0.22 + hash(i) * 0.12), base = y + h;
      c.fillStyle = "#1A1418"; c.fillRect(hx, base - hh, hw, hh);
      c.beginPath(); c.moveTo(hx - 2, base - hh); c.lineTo(hx + hw / 2, base - hh - hw * 0.45); c.lineTo(hx + hw + 2, base - hh); c.fill();
      c.fillStyle = "rgba(255,200,120,.6)"; c.fillRect(hx + hw * 0.35, base - hh * 0.6, hw * 0.25, hh * 0.25);
    }
  } else if (place === "country") {
    c.fillStyle = "rgba(255,237,215,.75)"; c.beginPath(); c.arc(x + w * 0.25, y + h * 0.28, h * 0.07, 0, TAU); c.fill();
    c.fillStyle = "#26381F"; c.beginPath(); c.ellipse(x + w * 0.3, y + h, w * 0.6, h * 0.42, 0, 0, TAU); c.fill();
    c.fillStyle = "#1E2C1A"; c.beginPath(); c.ellipse(x + w * 0.85, y + h, w * 0.55, h * 0.32, 0, 0, TAU); c.fill();
    for (let i = 0; i < 4; i++) { const tx = x + w * (0.55 + i * 0.1), ty = y + h * (0.72 - hash(i) * 0.08); c.fillStyle = "#1A2616"; c.beginPath(); c.arc(tx, ty, h * 0.07, 0, TAU); c.fill(); }
  } else {
    c.fillStyle = "#1C3A50"; c.fillRect(x, y + h * 0.65, w, h * 0.35);
    c.strokeStyle = "rgba(255,237,215,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + h * 0.65); c.lineTo(x + w, y + h * 0.65); c.stroke();
    c.strokeStyle = "#1A1F14"; c.lineWidth = 2.5; c.beginPath(); c.moveTo(x + w * 0.7, y + h); c.quadraticCurveTo(x + w * 0.66, y + h * 0.6, x + w * 0.72, y + h * 0.3); c.stroke();
    c.fillStyle = "#1A1F14";
    for (let k = 0; k < 5; k++) { const a = -2.6 + k * 0.6; c.beginPath(); c.ellipse(x + w * 0.72 + Math.cos(a) * h * 0.12, y + h * 0.3 + Math.sin(a) * h * 0.06, h * 0.14, h * 0.035, a, 0, TAU); c.fill(); }
  }
}

function backdrop(W: number, H: number, s: HomeSet, dpr: number) {
  const key = `${s.place}|${s.money}|${s.busy}|${W}|${H}|${dpr}`;
  let cv = backs.get(key);
  if (cv) return cv;
  if (backs.size > 12) backs.clear();
  cv = canvasOf(Math.round(W * dpr), Math.round(H * dpr));
  const c = cv.getContext("2d") as Ctx;
  c.scale(dpr, dpr);
  const [w0, w1] = WALL[s.place] ?? WALL.town, fy = H * 0.86;
  const g = c.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, w0); g.addColorStop(1, w1);
  c.fillStyle = g; c.fillRect(0, 0, W, fy);
  // Window behind the child, with curtains
  const ww = Math.min(W * 0.3, 240), wh = H * 0.44, wx = W / 2 - ww / 2, wy = H * 0.16;
  outside(c, s.place, wx, wy, ww, wh);
  c.strokeStyle = "#5A4636"; c.lineWidth = 4; c.strokeRect(wx, wy, ww, wh);
  c.lineWidth = 2; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
  const cur = s.money === "comfy" ? "#6B3A3A" : s.money === "tight" ? "#3F3A33" : "#4E4034";
  c.fillStyle = cur;
  c.beginPath(); c.moveTo(wx - 10, wy - 6); c.lineTo(wx + ww * 0.14, wy - 6); c.quadraticCurveTo(wx + ww * 0.05, wy + wh * 0.6, wx + ww * 0.1, wy + wh + 8); c.lineTo(wx - 10, wy + wh + 8); c.fill();
  if (s.money !== "tight") { c.beginPath(); c.moveTo(wx + ww + 10, wy - 6); c.lineTo(wx + ww * 0.86, wy - 6); c.quadraticCurveTo(wx + ww * 0.95, wy + wh * 0.6, wx + ww * 0.9, wy + wh + 8); c.lineTo(wx + ww + 10, wy + wh + 8); c.fill(); }
  c.fillStyle = "#5A4636"; c.fillRect(wx - 14, wy - 9, ww + 28, 3);
  // Pictures on the wall, a lamp with a warm glow, a plant when money is comfortable
  if (s.money !== "tight" && W > 420) {
    const px = W * 0.3 - 18, py = H * 0.2;
    c.fillStyle = "#5A4636"; c.fillRect(px - 2, py - 2, 30, 24);
    c.fillStyle = "#3A5A6A"; c.fillRect(px, py, 26, 20); c.fillStyle = "#E2B26B"; c.beginPath(); c.arc(px + 18, py + 7, 3.5, 0, TAU); c.fill();
    c.fillStyle = "#2E4A30"; c.beginPath(); c.moveTo(px, py + 20); c.lineTo(px + 10, py + 9); c.lineTo(px + 26, py + 20); c.fill();
  }
  const lx = W * 0.92, glow = c.createRadialGradient(lx, H * 0.28, 2, lx, H * 0.28, H * 0.5);
  glow.addColorStop(0, "rgba(255,200,130,.22)"); glow.addColorStop(1, "rgba(255,200,130,0)");
  c.fillStyle = glow; c.fillRect(0, 0, W, fy);
  c.strokeStyle = "#4A3A2E"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, H * 0.3); c.lineTo(lx, fy); c.stroke();
  c.fillStyle = "#E8C890"; c.beginPath(); c.moveTo(lx - 10, H * 0.3); c.lineTo(lx + 10, H * 0.3); c.lineTo(lx + 6, H * 0.22); c.lineTo(lx - 6, H * 0.22); c.fill();
  // Floor with boards and a rug
  c.fillStyle = FLOOR[s.place] ?? FLOOR.town; c.fillRect(0, fy, W, H - fy);
  c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1;
  for (let y = fy + 6; y < H; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = s.money === "comfy" ? "rgba(160,90,80,.45)" : "rgba(120,100,80,.35)";
  c.beginPath(); c.ellipse(W / 2, fy + (H - fy) * 0.45, ww * 0.75, (H - fy) * 0.38, 0, 0, TAU); c.fill();
  if (s.money === "comfy" && W > 420) {
    const qx = W * 0.7; c.fillStyle = "#6A4A32"; c.fillRect(qx - 8, fy - 16, 16, 16);
    c.fillStyle = "#3E6A40"; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(qx + (k - 2) * 4, fy - 24 - (k % 2) * 6, 4, 9, (k - 2) * 0.4, 0, TAU); c.fill(); }
  }
  // A busy home: toys and a pile of books on the floor
  if (s.busy) {
    const cols = ["#E07A5F", "#7FB2F8", "#E2B26B", "#A3CF7A"];
    for (let k = 0; k < 5; k++) { c.fillStyle = cols[k % 4]; c.fillRect(W * (0.3 + hash(k) * 0.12), fy + 2 + hash(k * 3) * 6, 6, 6); }
    for (let k = 0; k < 3; k++) { c.fillStyle = cols[(k + 1) % 4]; c.fillRect(W * 0.64, fy - 4 - k * 4, 16 - k * 2, 4); }
  }
  c.strokeStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.moveTo(0, fy); c.lineTo(W, fy); c.stroke();
  backs.set(key, cv);
  return cv;
}

/* ───────────── renderer memory: eased crowd, eased child age, captions, hover ───────────── */

const NK = 120;
const pos = new Float64Array(5 * NK), vel = new Float64Array(5 * NK);
const mk = new Float64Array(10), mv = new Float64Array(10);
let eased = false, lastNow = 0, shownAge = 1;
let lastOn = -1, lastAll = -1, lastT = 0;
interface Cap { txt: string; traits: number[]; t0: number; soft: boolean }
const caps: Cap[] = [];
const pulse = new Float64Array(5).fill(-10);
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

/** Spring a value toward its target (critically damped, settles in ~300 ms). */
function spring(x: Float64Array, v: Float64Array, i: number, target: number, dt: number) {
  const w0 = 14, a = w0 * w0 * (target - x[i]) - 2 * w0 * v[i];
  v[i] += a * dt; x[i] += v[i] * dt;
}

/* ───────────── the stage ───────────── */

export function drawChild(c: CanvasRenderingContext2D, W: number, H: number, w: W, base: W | null, p: Params) {
  if (W < 60 || H < 140) { c.fillStyle = STAGE.void; c.fillRect(0, 0, W, H); return; }
  const reduced = reducedMotion(), t = clock(), now = realNow();
  const dt = clamp(now - lastNow, 0, 0.05); lastNow = now;
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const compact = H < 400 || W < 520;
  const stripH = compact ? 78 : clamp(H * 0.5, 170, 330);
  const homeH = H - stripH;
  const v = values(w), avg = v.map(mean), bavg = base ? values(base).map(mean) : null;

  // Captions for new changes (and planned ones), and a reset after a restart or undo
  const on = happened(w), all = w.mods.length;
  if (lastOn < 0 || w.t < lastT - 0.5 || on.length < lastOn || all < lastAll) { lastOn = on.length; lastAll = all; caps.length = 0; }
  else {
    if (on.length > lastOn) for (const m of on.slice(lastOn)) caps.push({ txt: `Age ${Math.floor(m.age)} — ${CHANGES[m.id].cap}`, traits: TRAITS.map((k, i) => (m.d[k] ? i : -1)).filter((i) => i >= 0), t0: -1, soft: false });
    if (all - on.length > lastAll - lastOn) for (const m of w.mods.filter((m) => !m.on).slice(-(all - on.length - (lastAll - lastOn)))) caps.push({ txt: `Planned for age ${Math.floor(m.age)} — ${CHANGES[m.id].cap}`, traits: [], t0: -1, soft: true });
    lastOn = on.length; lastAll = all;
    // Many clicks at once: keep the card on screen and only the latest two waiting
    if (caps.length > 3) caps.splice(1, caps.length - 3);
  }
  lastT = w.t;

  // ── Home ──
  const place = during(w, "move") ? "abroad" : String(p.place ?? "town");
  const money = during(w, "money", 4) ? "tight" : String(p.money ?? "ok");
  c.drawImage(backdrop(W, homeH, { place, money, busy: p.home === "busy" }, dpr) as CanvasImageSource, 0, 0, W, homeH);
  const fy = homeH * 0.9;
  const adultH = Math.min(homeH * 0.58, W * 0.3);
  const apart = during(w, "divorce");
  if (apart) {
    const dx = W * 0.7;
    c.fillStyle = "rgba(16,9,4,.45)"; c.fillRect(dx, 0, 6, homeH * 0.86);
    c.strokeStyle = "#5A4636"; c.lineWidth = 2; c.strokeRect(dx + 12, homeH * 0.3, Math.min(40, W * 0.06), homeH * 0.56);
  }
  if (p.home === "unstable" && !reduced) cloud(c, W / 2 + Math.sin(t * 0.3) * W * 0.08, homeH * 0.14, Math.min(26, W * 0.04), 0.3);
  else if (p.home === "unstable") cloud(c, W / 2, homeH * 0.14, Math.min(26, W * 0.04), 0.3);

  const la = parentLook(p, "a"), lb = parentLook(p, "b");
  const ill = during(w, "illness", 1);
  if (ill) {
    c.fillStyle = "#5A2E2E"; c.beginPath(); c.roundRect(W * 0.16 - adultH * 0.2, fy - adultH * 0.5, adultH * 0.55, adultH * 0.5, 8); c.fill();
  }
  drawPerson(c, W * 0.16, fy, adultH * (ill ? 0.92 : 1), la, { t, sit: ill, blanket: ill, wave: 0 });
  drawPerson(c, apart ? W * 0.86 : W * 0.84, fy, adultH * 0.97, lb, { t });
  if (during(w, "grandparent") && W > 360) {
    const g: Look = { ...la, age: 72, shirt: "#8A7A6A", seed: la.seed + 11, out: 55, calm: 70, style: 0 };
    drawPerson(c, W * 0.3, fy, adultH * 0.9, g, { t });
  }

  // The typical child grows smoothly toward the current age
  if (reduced || Math.abs(w.t - shownAge) > 25) shownAge = w.t; else shownAge += (w.t - shownAge) * (1 - Math.exp(-dt * 6));
  const A = shownAge;
  const grow = A < 18 ? lerp(0.24, 0.96, Math.pow(clamp((A - 1) / 17, 0, 1), 0.85)) : 0.97;
  const ch = adultH * grow, cx = W / 2;
  const [cO, cC, cE, cA, cCalm] = avg;
  const kidLook: Look = {
    skin: hexMix(la.skin, lb.skin), hair: strHash(String(p.family) + "k") % 2 ? la.hair : lb.hair,
    shirt: A < 18 ? mix(COOL, WARM, cE / 100) : mix("#4A5A7A", "#8A5A4A", cE / 100), pants: A < 13 ? "#3A4A6A" : "#2A3048",
    age: A, calm: cCalm, out: cE, style: strHash(String(p.family) + "s") % 4, seed: 5,
  };
  // Siblings and a friend stand next to the child; kind kids hold their hand
  const sibs: number[] = [];
  const sib = String(p.sib);
  if (sib === "older" || sib === "2") sibs.push(A + 3);
  if (sib === "1" || sib === "2") sibs.push(Math.max(0.6, A - 3));
  for (const m of w.mods) if (m.id === "sibling" && m.on && w.t >= m.age) sibs.push(Math.max(0.3, A - m.age));
  const friend = during(w, "bestfriend");
  const kind = cA >= 55;
  const right: { look: Look; h: number }[] = [];
  sibs.slice(0, 3).forEach((sa, k) => {
    const sh = adultH * (sa < 18 ? lerp(0.24, 0.96, Math.pow(clamp((sa - 1) / 17, 0, 1), 0.85)) : 0.97) * (sa < 1 ? 0.8 : 1);
    right.push({ look: { ...kidLook, age: sa, shirt: mix(WARM, "#E2B26B", 0.4 + k * 0.2), style: (kidLook.style + k + 1) % 4, seed: 20 + k, calm: 65, out: 55 }, h: sh });
  });
  if (friend) right.push({ look: { ...kidLook, skin: SKIN[(strHash(String(p.family)) + 2) % SKIN.length], hair: HAIR[(strHash(String(p.family)) + 3) % HAIR.length], shirt: "#6FA7A0", age: A, style: 2, seed: 40, calm: 70, out: 70 }, h: ch * 0.98 });
  let rx = cx + Math.max(ch * 0.32, 18);
  const spots = right.map((r) => { const x = rx + r.h * 0.18; rx = x + r.h * 0.22 + 6; return x; });
  right.forEach((r, k) => drawPerson(c, spots[k], fy, r.h, r.look, { t }));

  // Props from changes and traits
  const has = (id: string) => during(w, id);
  const hold: Hold = has("music") ? "violin" : has("reading") ? "book" : has("screen") ? "tablet" : cO >= 55 && A > 3 ? "magnifier" : null;
  const wavePhase = (t + 1.3) % 5.2, waving = !reduced && cE >= 55 && wavePhase < 1.6 ? Math.sin((wavePhase / 1.6) * Math.PI) : cE >= 62 && reduced ? 1 : 0;
  const reach = kind && right.length ? 1 : 0;
  drawPerson(c, cx, fy, ch, kidLook, {
    t, hold: reach ? null : hold, wave: reach ? 0 : waving, reach, bag: cC >= 55 && A >= 5 && A < 19, badge: has("volunteer"),
  });
  const leftFoot = cx - Math.max(ch * 0.36, 18);
  if (has("pet")) drawDog(c, leftFoot - 10, fy, Math.min(26, adultH * 0.22), reduced ? 0 : t);
  if (has("sport")) football(c, cx - Math.max(ch * 0.18, 10), fy - Math.min(6, adultH * 0.05), Math.min(6, adultH * 0.05));
  if (has("nature")) { c.fillStyle = "#4E7A3E"; c.beginPath(); c.roundRect(leftFoot - (has("pet") ? 40 : 6), fy - 9, 5, 9, 1.5); c.roundRect(leftFoot - (has("pet") ? 33 : 1), fy - 9, 5, 9, 1.5); c.fill(); }
  if (during(w, "bullied", 1) || during(w, "newschool", 0.6)) cloud(c, cx + (reduced ? 0 : Math.sin(t * 0.8) * 3), fy - ch - 12, Math.min(14, ch * 0.15), 0.4);
  if (has("move") && w.t - (w.mods.find((m) => m.id === "move")?.age ?? 0) < 1.5) { c.fillStyle = "#7A5A3A"; c.beginPath(); c.roundRect(W * 0.62, fy - 18, 22, 18, 3); c.fill(); }

  // ── Crowd strips ──
  const top = homeH;
  c.fillStyle = STAGE.void; c.fillRect(0, top, W, H - top);
  c.strokeStyle = STAGE.line; c.lineWidth = 1; c.beginPath(); c.moveTo(0, top + 0.5); c.lineTo(W, top + 0.5); c.stroke();
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

  // Change caption card: slides in under the chips, holds, fades; affected strips pulse once
  const cap = caps[0];
  if (cap) {
    if (cap.t0 < 0) { cap.t0 = now; for (const i of cap.traits) pulse[i] = now; }
    const e = now - cap.t0, life = caps.length > 1 ? 1.8 : 3.0;
    if (e > life) caps.shift();
    else {
      const ain = reduced ? 1 : clamp(e / 0.25, 0, 1), aout = clamp((life - e) / 0.45, 0, 1), k = 1 - (1 - ain) ** 3;
      c.globalAlpha = Math.min(k, aout);
      c.font = "500 14px " + FONT.body;
      const tw = Math.min(c.measureText(cap.txt).width, W - 48), y = 40 + (reduced ? 0 : (1 - k) * -8);
      c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(W / 2 - tw / 2 - 14, y, tw + 28, 30, 15); c.fill();
      c.strokeStyle = cap.soft ? STAGE.ink2 : STAGE.alt; c.lineWidth = 1; c.stroke();
      c.fillStyle = STAGE.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(cap.txt, W / 2, y + 15.5, tw);
      c.globalAlpha = 1;
    }
  }
  c.textAlign = "left"; c.textBaseline = "alphabetic";
}
