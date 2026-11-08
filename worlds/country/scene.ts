import { clamp, mix } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import type { Climate } from "./data";
import { worldSay } from "@/lib/sim/say";
import { pageT } from "@/lib/i18n/page";

/** English words drawn on the stage (change 0025); part of the sandbox's `messages`. */
export const STAGE_MESSAGES: Record<string, string> = {
  "stage.school": "SCHOOL", "stage.clinic": "CLINIC +",
  "stage.poorer": "← POORER", "stage.richer": "RICHER →",
  "stage.title": "{year} · IF THIS COUNTRY WERE 100 PEOPLE", "stage.titleWide": "{year} · IF THIS COUNTRY WERE 100 PEOPLE · POOREST TO RICHEST",
  "stage.titleShort": "{year} · AS 100 PEOPLE",
  "stage.band.0": "POOR", "stage.band.1": "GETTING BY", "stage.band.2": "WELL OFF",
  "stage.poor": "{n, plural, one {# is poor} other {# are poor}}",
  "stage.fam": "a typical family has {usd} a month",
  "stage.jobless": "{n} of 100 adults out of work",
  "stage.kidsOut": "{n, plural, one {# child} other {# children}} not in school",
  "stage.noChange": "(no change: {v})",
  "stage.legend.work": "WORKING", "stage.legend.jobless": "OUT OF WORK", "stage.legend.retired": "RETIRED",
  "stage.legend.kid": "CHILD AT SCHOOL", "stage.legend.kidOut": "CHILD NOT AT SCHOOL", "stage.legend.poverty": "POVERTY LINE",
};
const say = () => worldSay({ key: "country", messages: STAGE_MESSAGES });
/** Dollars in the page's number style. */
export const usd = (v: number) => pageT().num(v, { style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/**
 * The country stage (change 0016), framework-free.
 * Top: a street that runs from the poorest homes (left) to the richest (right); its buildings, shops,
 * school, clinic, traffic and people follow the model. Bottom: the country as 100 people, poorest first.
 * Ambient motion (walkers, cars, smoke) runs on a draw-only renderer clock; model values glide per half.
 */

export interface Look {
  dec0: number; dec1: number; dec2: number; dec3: number; dec4: number; dec5: number; dec6: number; dec7: number; dec8: number; dec9: number;
  g: number; edu: number; life: number; jl: number; calm: number;
  war: number; sick: number; dry: number; robots: number; building: number; built: number; oil: number; trade: number;
}
export interface Figure { band: 0 | 1 | 2; kind: "work" | "jobless" | "retired" | "kid" | "kidOut"; protest: boolean }
export interface Tally { poor: number; jobless: number; kidsOut: number; fam: number }

type Ctx = CanvasRenderingContext2D;

/* ───────────── clock and easing (draw-only, never touches the world) ───────────── */

let reduceQ: MediaQueryList | null = null;
const reduced = () => {
  if (typeof matchMedia === "undefined") return false;
  reduceQ ??= matchMedia("(prefers-reduced-motion: reduce)");
  return reduceQ.matches;
};
let frozen = 0;
function clock(): number {
  const now = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
  if (reduced()) return frozen;
  return (frozen = now);
}
const eased: [Look | null, Look | null] = [null, null];
const lastT = [0, 0];
function ease(half: number, target: Look): Look {
  const now = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
  const prev = eased[half], dt = Math.min(0.1, Math.max(0, now - lastT[half]));
  lastT[half] = now;
  if (!prev || reduced()) return (eased[half] = { ...target });
  const k = 1 - Math.exp(-dt / 0.3), out = { ...prev };
  for (const key of Object.keys(target) as (keyof Look)[]) {
    out[key] = prev[key] + (target[key] - prev[key]) * k;
    if (Math.abs(out[key] - target[key]) < 1e-3) out[key] = target[key];
  }
  return (eased[half] = out);
}

const hash = (i: number, k = 0) => { const x = Math.sin(i * 91.7 + k * 47.3 + 3.1) * 43758.5453; return x - Math.floor(x); };

/* ───────────── palette (muted, painted; the stage stays a darkroom) ───────────── */

const SKY: Record<Climate, [string, string]> = {
  cold: ["#18202c", "#4f5966"], mild: ["#1b1f2a", "#5f5b54"], warm: ["#1f1b22", "#6f5847"], hot: ["#221a1a", "#7b5a3d"], dry: ["#211b18", "#7e6446"],
};
const GROUND: Record<Climate, string> = { cold: "#323a35", mild: "#36402e", warm: "#3e4230", hot: "#3c4429", dry: "#55473a" };
const LEAF: Record<Climate, string> = { cold: "#33503f", mild: "#43603a", warm: "#4c6436", hot: "#3f6a34", dry: "#6a6a3a" };
const WALLS = ["#7d6656", "#8d7b66", "#66717a", "#93775b", "#717f69", "#a08b74", "#7a6a78", "#86705c"];
const LIT = "#f2c983", DARK = "#2a2420";
export const BAND = ["#E8836F", "#8F8273", STAGE.ink] as const;

/* ───────────── small drawing helpers ───────────── */

function rect(c: Ctx, x: number, y: number, w: number, h: number, col: string) { c.fillStyle = col; c.fillRect(x, y, w, h); }
function windows(c: Ctx, x: number, y: number, w: number, h: number, cols: number, rows: number, seed: number, lit: number, board: number) {
  const gx = w / cols, gy = h / rows, ww = gx * 0.5, wh = gy * 0.5;
  for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) {
    const wx = x + q * gx + (gx - ww) / 2, wy = y + r * gy + (gy - wh) / 2, s = seed * 13 + r * 5 + q;
    if (hash(s, 7) < board) {
      rect(c, wx - 1, wy - 1, ww + 2, wh + 2, "#5a4632");
      c.strokeStyle = "#3c2e22"; c.lineWidth = 1; c.beginPath(); c.moveTo(wx - 1, wy - 1); c.lineTo(wx + ww + 1, wy + wh + 1); c.moveTo(wx + ww + 1, wy - 1); c.lineTo(wx - 1, wy + wh + 1); c.stroke();
    } else rect(c, wx, wy, ww, wh, hash(s, 3) < lit ? LIT : DARK);
  }
}
function roof(c: Ctx, x: number, y: number, w: number, h: number, col: string) {
  c.fillStyle = col; c.beginPath(); c.moveTo(x - 3, y); c.lineTo(x + w / 2, y - h); c.lineTo(x + w + 3, y); c.closePath(); c.fill();
}
function sign(c: Ctx, text: string, cx: number, y: number, size: number) {
  c.font = `500 ${size}px ${FONT.body}`;
  const tw = c.measureText(text).width;
  rect(c, cx - tw / 2 - 5, y - size - 3, tw + 10, size + 7, STAGE.panel);
  c.fillStyle = STAGE.ink; c.textAlign = "center"; c.fillText(text, cx, y); c.textAlign = "left";
}
/** A tiny street person; feet at (x, y). */
function walker(c: Ctx, x: number, y: number, h: number, col: string, phase: number, mask: boolean) {
  const r = h * 0.16, sw = Math.sin(phase) * h * 0.12;
  c.strokeStyle = col; c.lineWidth = Math.max(1.2, h * 0.09); c.lineCap = "round";
  c.beginPath(); c.moveTo(x, y - h * 0.4); c.lineTo(x - sw, y); c.moveTo(x, y - h * 0.4); c.lineTo(x + sw, y); c.stroke();
  rect(c, x - h * 0.13, y - h * 0.78, h * 0.26, h * 0.42, col);
  c.fillStyle = "#c9a88a"; c.beginPath(); c.arc(x, y - h * 0.78 - r, r, 0, Math.PI * 2); c.fill();
  if (mask) rect(c, x - r * 0.8, y - h * 0.78 - r * 0.6, r * 1.6, r * 0.7, "#e8e2d8");
}

/* ───────────── the street ───────────── */

function street(c: Ctx, W: number, H: number, L: Look, climate: Climate, t: number) {
  const hy = H * 0.52, sy = H * 0.8, ry = H * 0.87, u = H * 0.12;
  const gloom = clamp(L.war * 0.6 + Math.max(0, (40 - L.calm) / 40) * 0.3, 0, 0.8);
  const [s0, s1] = SKY[climate];
  const sky = c.createLinearGradient(0, 0, 0, hy);
  sky.addColorStop(0, mix(s0, "#1c1a19", gloom)); sky.addColorStop(1, mix(s1, "#3a3632", gloom));
  c.fillStyle = sky; c.fillRect(0, 0, W, sy);

  // Sun
  c.globalAlpha = 0.5 * (1 - gloom); c.fillStyle = "#f3d9a8";
  c.beginPath(); c.arc(W * 0.8, hy * 0.42, H * 0.05, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;

  // Far skyline: more and taller towers in richer countries
  const rich = clamp(Math.log10(Math.max(1, L.g)) / 2, 0.15, 1), nt = Math.round(4 + 14 * rich);
  for (let i = 0; i < nt; i++) {
    const tw = W * (0.018 + 0.02 * hash(i, 1)), th = H * (0.06 + 0.22 * rich * hash(i, 2)), tx = W * hash(i, 3);
    rect(c, tx, hy - th + H * 0.03, tw, th, mix(s1, "#1d1a18", 0.55));
    if (hash(i, 4) < 0.6 * (1 - L.war)) rect(c, tx + tw * 0.3, hy - th * 0.6 + H * 0.03, tw * 0.15, H * 0.01, LIT);
  }

  // Hills
  c.fillStyle = mix(s1, "#2b2a26", 0.45);
  c.beginPath(); c.moveTo(0, sy);
  for (let x = 0; x <= W; x += 8) c.lineTo(x, hy + H * 0.04 - H * 0.07 * (0.5 + 0.5 * Math.sin(x * 0.006 + 1.3)) - H * 0.02 * Math.sin(x * 0.021));
  c.lineTo(W, sy); c.fill();

  // Oil pump on the far hill
  if (L.oil > 0.02) {
    c.globalAlpha = L.oil; const px = W * 0.9, py = hy + H * 0.03, a = Math.sin(t * 1.4) * 0.3, bl = H * 0.08;
    c.strokeStyle = "#1c1814"; c.lineWidth = 3; c.lineCap = "round";
    c.beginPath(); c.moveTo(px - bl * 0.3, py); c.lineTo(px, py - bl * 0.5); c.lineTo(px + bl * 0.3, py); c.stroke();
    c.beginPath(); c.moveTo(px - bl * 0.6 * Math.cos(a), py - bl * 0.5 - bl * 0.6 * Math.sin(a)); c.lineTo(px + bl * 0.6 * Math.cos(a), py - bl * 0.5 + bl * 0.6 * Math.sin(a)); c.stroke();
    c.globalAlpha = 1;
  }

  // Cranes while building; an elevated railway once built
  if (L.building > 0.02) {
    c.globalAlpha = L.building; c.strokeStyle = "#c9a35c"; c.lineWidth = 2;
    for (const cx of [W * 0.28, W * 0.66]) {
      const top = hy - H * 0.32;
      c.beginPath(); c.moveTo(cx, sy - u); c.lineTo(cx, top); c.moveTo(cx - W * 0.04, top); c.lineTo(cx + W * 0.1, top); c.stroke();
      const hx = cx + W * 0.07 + Math.sin(t * 0.5 + cx) * W * 0.02;
      c.lineWidth = 1; c.beginPath(); c.moveTo(hx, top); c.lineTo(hx, top + H * 0.12); c.stroke(); c.lineWidth = 2;
    }
    c.globalAlpha = 1;
  }
  if (L.built > 0.02) {
    c.globalAlpha = L.built; const ty = hy + H * 0.06;
    rect(c, 0, ty, W, 3, "#5a5048");
    for (let x = 20; x < W; x += 70) rect(c, x, ty, 3, sy - ty, "#4a423a");
    const tx = ((t * 70) % (W + 260)) - 220;
    for (let k = 0; k < 4; k++) { rect(c, tx + k * 52, ty - 14, 48, 13, "#b9b2a6"); rect(c, tx + k * 52 + 4, ty - 11, 40, 4, LIT); }
    c.globalAlpha = 1;
  }

  // Ground behind the buildings
  rect(c, 0, hy + H * 0.08, W, sy - hy - H * 0.08, mix(GROUND[climate], "#6b5636", L.dry * 0.8));

  // Buildings: lots run poorest (left) to richest (right)
  const nLots = clamp(Math.round(W / 78), 7, 16), lw = W / nLots;
  const dec = [L.dec0, L.dec1, L.dec2, L.dec3, L.dec4, L.dec5, L.dec6, L.dec7, L.dec8, L.dec9];
  const iSchool = Math.round(nLots * 0.36), iClinic = Math.round(nLots * 0.62);
  const shops = new Set([Math.round(nLots * 0.16), Math.round(nLots * 0.5), nLots - 2].filter((i) => i !== iSchool && i !== iClinic && i > 0));
  const lit = clamp(0.25 + (0.5 * L.calm) / 100, 0, 0.9) * (1 - L.war * 0.7), board = L.war * 0.55;
  const shut = clamp(L.jl * 2.5 + L.war * 0.9 + L.sick * 0.7 + L.trade * 0.15, 0, 1);
  for (let j = 0; j < nLots; j++) {
    const x0 = j * lw, inc = dec[Math.min(9, Math.floor((j * 10) / nLots))], wall = WALLS[Math.floor(hash(j, 5) * WALLS.length)];
    if (j === 0) { factory(c, x0 + lw * 0.04, sy, lw * 0.92, u, L, t); continue; }
    if (j === iSchool) {
      const bw = lw * 0.9, bh = u * 2.4, bx = x0 + lw * 0.05, poor = L.edu < 45;
      rect(c, bx, sy - bh, bw, bh, mix("#8a6a4c", "#a5876a", L.edu / 100));
      roof(c, bx, sy - bh, bw, u * 0.5, "#5b3f2e");
      windows(c, bx + 4, sy - bh + 6, bw - 8, bh * 0.62, 4, 2, j, clamp(L.edu / 100, 0.1, 1) * (1 - L.sick * 0.8), board);
      if (poor) { c.strokeStyle = "#3a2c22"; c.lineWidth = 1; c.beginPath(); c.moveTo(bx + bw * 0.2, sy - bh); c.lineTo(bx + bw * 0.3, sy - bh * 0.6); c.lineTo(bx + bw * 0.24, sy - bh * 0.4); c.stroke(); }
      rect(c, bx + bw * 0.42, sy - u * 0.7, bw * 0.16, u * 0.7, DARK);
      sign(c, say()("stage.school"), bx + bw / 2, sy - bh - u * 0.55, Math.max(10, Math.min(12, u * 0.36)));
      const kids = Math.round(5 * (L.edu / 100) * (1 - L.sick) * (1 - L.war));
      for (let k = 0; k < kids; k++) walker(c, bx + bw * (0.1 + 0.18 * k), sy + (ry - sy) * 0.5, u * 0.5, ["#c47a5a", "#6f8fb0", "#c9a35c", "#7fa070", "#a07ab0"][k], t * 6 + k, false);
      continue;
    }
    if (j === iClinic) {
      const bw = lw * 0.86, bh = u * 1.9, bx = x0 + lw * 0.07, q = clamp((L.life - 45) / 40, 0.1, 1);
      rect(c, bx, sy - bh, bw, bh, mix("#8e8478", "#d4c9bb", q));
      rect(c, bx - 2, sy - bh - 4, bw + 4, 5, "#6c5f51");
      windows(c, bx + 4, sy - bh + 8, bw - 8, bh * 0.5, 3, 1, j, q * (1 - L.war * 0.6), board);
      rect(c, bx + bw * 0.38, sy - u * 0.75, bw * 0.24, u * 0.75, "#3d4a48");
      sign(c, say()("stage.clinic"), bx + bw / 2, sy - bh - u * 0.4, Math.max(10, Math.min(12, u * 0.36)));
      continue;
    }
    if (shops.has(j)) {
      const bw = lw * 0.84, bh = u * 1.5, bx = x0 + lw * 0.08, closed = hash(j, 9) < shut;
      rect(c, bx, sy - bh, bw, bh, wall);
      rect(c, bx, sy - bh, bw, u * 0.2, "#4a3d32");
      const aw = ["#8a4a3a", "#4a6a5a", "#7a6a3a"][j % 3];
      for (let s = 0; s < 6; s++) { c.fillStyle = s % 2 ? aw : mix(aw, "#e8dccb", 0.5); c.beginPath(); const sx = bx + (bw / 6) * s; c.moveTo(sx, sy - bh * 0.62); c.lineTo(sx + bw / 6, sy - bh * 0.62); c.lineTo(sx + bw / 6 - 2, sy - bh * 0.48); c.lineTo(sx + 2, sy - bh * 0.48); c.fill(); }
      if (closed) { rect(c, bx + 4, sy - bh * 0.46, bw - 8, bh * 0.46, "#77706a"); c.strokeStyle = "#5c5650"; c.lineWidth = 1; for (let y = sy - bh * 0.46 + 3; y < sy; y += 3) { c.beginPath(); c.moveTo(bx + 4, y); c.lineTo(bx + bw - 4, y); c.stroke(); } }
      else { rect(c, bx + 4, sy - bh * 0.46, bw * 0.6, bh * 0.46, lit > 0.3 ? mix(LIT, DARK, 0.35) : DARK); rect(c, bx + bw * 0.7, sy - bh * 0.46, bw * 0.22, bh * 0.46, DARK); }
      continue;
    }
    home(c, x0, sy, lw, u, inc, wall, j, lit, board, LEAF[climate], L.dry);
  }

  // Sidewalk, road, poorer/richer marks
  rect(c, 0, sy, W, ry - sy, "#4a4038"); rect(c, 0, ry - 1, W, 2, "#5e5248");
  rect(c, 0, ry, W, H - ry, "#26201b");
  c.strokeStyle = "#6c5f51"; c.setLineDash([14, 12]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, (ry + H) / 2); c.lineTo(W, (ry + H) / 2); c.stroke(); c.setLineDash([]);

  // Traffic: bikes in poorer countries, cars in richer ones
  const nv = Math.round((W / 170) * clamp(Math.log10(L.g + 1) / 1.6, 0.25, 1) * (1 - L.war * 0.75) * (1 - L.sick * 0.5));
  const cars = clamp((Math.log10(Math.max(1, L.g)) - 0.6) / 1.1, 0, 1);
  for (let i = 0; i < nv; i++) {
    const dir = i % 2 ? 1 : -1, v = (30 + 30 * hash(i, 11)) * dir, span = W + 120;
    const x = ((((hash(i, 12) * span + t * v) % span) + span) % span) - 60, y = dir > 0 ? H - (H - ry) * 0.2 : ry + (H - ry) * 0.45;
    if (hash(i, 13) < cars) {
      const cw = u * 1.1, ch = u * 0.32, col = ["#8c3b2f", "#3f5a74", "#c9c1b3", "#2f2f2f", "#6b7b52"][i % 5];
      rect(c, x - cw / 2, y - ch, cw, ch, col); rect(c, x - cw * 0.28, y - ch * 1.6, cw * 0.5, ch * 0.7, col); rect(c, x - cw * 0.24, y - ch * 1.5, cw * 0.42, ch * 0.45, "#9fb0bf");
      c.fillStyle = "#151210"; c.beginPath(); c.arc(x - cw * 0.3, y, ch * 0.3, 0, 7); c.arc(x + cw * 0.3, y, ch * 0.3, 0, 7); c.fill();
    } else {
      const r = u * 0.16; c.strokeStyle = "#b8a898"; c.lineWidth = 1.2;
      c.beginPath(); c.arc(x - r * 1.4, y - r, r, 0, 7); c.moveTo(x + r * 2.4, y - r); c.arc(x + r * 1.4, y - r, r, 0, 7); c.stroke();
      walker(c, x, y - r * 1.4, u * 0.55, "#6f8fb0", 0, L.sick > 0.5);
    }
  }

  // People on the sidewalk
  const nw = Math.round((W / 70) * (0.35 + (0.65 * L.calm) / 100) * (1 - L.war * 0.85) * (1 - L.sick * 0.6));
  for (let i = 0; i < nw; i++) {
    const v = (10 + 16 * hash(i, 21)) * (hash(i, 22) < 0.5 ? -1 : 1), span = W + 40;
    const x = ((((hash(i, 23) * span + t * v) % span) + span) % span) - 20;
    walker(c, x, sy + (ry - sy) * (0.35 + 0.55 * hash(i, 24)), u * 0.75, ["#8c5a4a", "#5a6f8c", "#9c8a5a", "#6a7a5a", "#8a6a8a", "#b8a898"][i % 6], t * 7 + i, hash(i, 25) < L.sick);
  }

  // Protest: a crowd with blank banners, when peace falls under 30
  const pr = clamp((32 - L.calm) / 12, 0, 1);
  if (pr > 0.02) {
    c.globalAlpha = pr;
    const n = Math.round(10 + 22 * pr * Math.min(1.4, W / 800));
    for (let i = 0; i < n; i++) {
      const x = W * (0.32 + 0.36 * hash(i, 31)), y = sy + (H - sy) * (0.15 + 0.75 * hash(i, 32)), b = Math.sin(t * 3 + i) * 1.5;
      walker(c, x, y + b, u * 0.75, "#8c5a4a", 0, L.sick > 0.5);
      if (i % 3 === 0) { c.strokeStyle = "#8a7a6a"; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y - u * 0.9 + b); c.lineTo(x, y - u * 1.3 + b); c.stroke(); rect(c, x - u * 0.3, y - u * 1.55 + b, u * 0.6, u * 0.28, "#e8dccb"); rect(c, x - u * 0.2, y - u * 1.45 + b, u * 0.4, 1.5, "#8c5a4a"); }
    }
    c.globalAlpha = 1;
  }

  if (L.war > 0.02) { c.fillStyle = `rgba(40,36,32,${0.35 * L.war})`; c.fillRect(0, 0, W, H); }

  c.font = `500 10px ${FONT.body}`; c.fillStyle = STAGE.ink2;
  c.fillText(say()("stage.poorer"), 10, H - 6);
  c.textAlign = "right"; c.fillText(say()("stage.richer"), W - (W >= 900 ? 34 : 10), H - 6); c.textAlign = "left";
}

function home(c: Ctx, x0: number, sy: number, lw: number, u: number, inc: number, wall: string, j: number, lit: number, board: number, leaf: string, dry: number) {
  if (inc < 200) {
    const bw = lw * 0.62, bh = u * 1.05, bx = x0 + lw * 0.2;
    rect(c, bx, sy - bh, bw, bh, mix(wall, "#4a3e34", 0.55));
    c.fillStyle = "#77736c"; c.beginPath(); c.moveTo(bx - 4, sy - bh); c.lineTo(bx + bw + 4, sy - bh - u * 0.22); c.lineTo(bx + bw + 4, sy - bh - u * 0.1); c.lineTo(bx - 4, sy - bh + u * 0.08); c.fill();
    rect(c, bx + bw * 0.6, sy - bh * 0.62, bw * 0.24, bh * 0.62, DARK);
    windows(c, bx + 2, sy - bh * 0.85, bw * 0.45, bh * 0.4, 1, 1, j, lit * 0.6, board);
  } else if (inc < 700) {
    const bw = lw * 0.72, bh = u * 1.45, bx = x0 + lw * 0.14;
    rect(c, bx, sy - bh, bw, bh, mix(wall, "#4a3e34", 0.3)); rect(c, bx - 2, sy - bh - 3, bw + 4, 4, "#5a4c40");
    windows(c, bx + 2, sy - bh + 4, bw * 0.55, bh * 0.5, 2, 1, j, lit, board);
    rect(c, bx + bw * 0.66, sy - bh * 0.55, bw * 0.2, bh * 0.55, DARK);
  } else if (inc < 2500) {
    const bw = lw * 0.78, bh = u * 1.9, bx = x0 + lw * 0.11;
    rect(c, bx, sy - bh, bw, bh, wall); roof(c, bx, sy - bh, bw, u * 0.6, "#5b3f2e");
    windows(c, bx + 3, sy - bh + 5, bw - 6, bh * 0.5, 2, 1, j, lit, board);
    rect(c, bx + bw * 0.42, sy - bh * 0.4, bw * 0.16, bh * 0.4, DARK);
  } else if (inc < 6000) {
    const bw = lw * 0.66, bh = u * 2.7, bx = x0 + lw * 0.06;
    rect(c, bx, sy - bh, bw, bh, mix(wall, "#c2b29c", 0.2)); roof(c, bx, sy - bh, bw, u * 0.7, "#6a3d30");
    windows(c, bx + 3, sy - bh + 6, bw - 6, bh * 0.72, 2, 2, j, lit, board);
    tree(c, x0 + lw * 0.86, sy, u, mix(leaf, "#8a6d3c", dry));
  } else if (j % 2) {
    const bw = lw * 0.7, bh = u * 3.6, bx = x0 + lw * 0.15;
    rect(c, bx, sy - bh, bw, bh, mix(wall, "#cfc3b4", 0.45));
    windows(c, bx + 3, sy - bh + 6, bw - 6, bh - 14, 3, 5, j, lit, board);
  } else {
    const bw = lw * 0.62, bh = u * 2.3, bx = x0 + lw * 0.08;
    rect(c, bx, sy - bh, bw, bh, mix(wall, "#e0d4c2", 0.4)); rect(c, bx - 3, sy - bh - 4, bw + 6, 5, "#4a3d32");
    rect(c, bx + 4, sy - bh + 8, bw - 8, bh * 0.4, lit > 0.3 ? mix(LIT, DARK, 0.25) : DARK);
    rect(c, x0 + lw * 0.72, sy - u * 0.4, lw * 0.26, u * 0.4, mix(leaf, "#8a6d3c", dry));
    tree(c, x0 + lw * 0.86, sy - u * 0.2, u * 1.1, mix(leaf, "#8a6d3c", dry));
  }
}

function tree(c: Ctx, x: number, y: number, u: number, col: string) {
  rect(c, x - 1.5, y - u * 0.8, 3, u * 0.8, "#4a3a2c");
  c.fillStyle = col; c.beginPath(); c.arc(x, y - u * 1.05, u * 0.42, 0, 7); c.fill();
}

function factory(c: Ctx, x: number, sy: number, w: number, u: number, L: Look, t: number) {
  const h = u * 1.9;
  rect(c, x, sy - h, w, h, "#6d625a");
  c.fillStyle = "#4e463f"; c.beginPath(); c.moveTo(x, sy - h);
  for (let k = 0; k < 3; k++) { const sx = x + (w / 3) * k; c.lineTo(sx, sy - h - u * 0.4); c.lineTo(sx + w / 3, sy - h); }
  c.fill();
  rect(c, x + w * 0.75, sy - h - u * 1.4, w * 0.1, u * 1.4, "#5b514a");
  if (L.war < 0.5) for (let k = 0; k < 4; k++) {
    const p = (t * 0.25 + k / 4) % 1; c.globalAlpha = (1 - p) * 0.35; c.fillStyle = "#b7aea4";
    c.beginPath(); c.arc(x + w * 0.8 + p * u * 0.8, sy - h - u * 1.4 - p * u * 1.4, u * (0.12 + 0.25 * p), 0, 7); c.fill();
  }
  c.globalAlpha = 1;
  const wy = sy - h * 0.7, wh = h * 0.45;
  rect(c, x + w * 0.1, wy, w * 0.8, wh, L.war > 0.5 ? DARK : mix(LIT, DARK, 0.55));
  if (L.robots > 0.02) {
    c.globalAlpha = L.robots; c.strokeStyle = "#c98b5a"; c.lineWidth = 2.5; c.lineCap = "round";
    for (let k = 0; k < 2; k++) {
      const bx = x + w * (0.3 + 0.4 * k), by = wy + wh, a = Math.sin(t * 2 + k * 2) * 0.6;
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx, by - wh * 0.5); c.lineTo(bx + Math.cos(a) * wh * 0.4, by - wh * 0.5 - Math.sin(a) * wh * 0.3); c.stroke();
    }
    c.globalAlpha = 1;
  }
}

/* ───────────── 100 people ───────────── */

/** One person; feet at (x, y), height h. */
function person(c: Ctx, x: number, y: number, h: number, f: Figure) {
  const kid = f.kind === "kid" || f.kind === "kidOut", s = kid ? 0.68 : 1, fh = h * s, r = fh * 0.17, bw = fh * 0.42;
  const col = BAND[f.band], hollow = f.kind === "jobless";
  const hy = y - fh + r, by = hy + r + Math.max(1, fh * 0.05), bh = y - by;
  c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.3;
  c.beginPath(); c.arc(x, hy, r, 0, Math.PI * 2);
  hollow ? c.stroke() : c.fill();
  c.beginPath(); c.roundRect(x - bw / 2, by, bw, bh, [bw * 0.45, bw * 0.45, 1, 1]);
  hollow ? c.stroke() : c.fill();
  if (f.kind === "retired") { c.lineWidth = 1.3; c.beginPath(); c.moveTo(x + bw / 2 + 1.5, by + bh * 0.35); c.lineTo(x + bw / 2 + 2.5, y); c.stroke(); }
  if (f.kind === "kid") { c.fillStyle = STAGE.ink; c.fillRect(x - r * 1.3, hy - r - 1.5, r * 2.6, 1.6); c.fillRect(x - r * 0.5, hy - r - 0.5, r, r * 0.45); }
  if (f.protest) {
    c.strokeStyle = STAGE.ink2; c.lineWidth = 1; c.beginPath(); c.moveTo(x + bw / 2, by + 1); c.lineTo(x + bw / 2, hy - r * 2.2); c.stroke();
    c.fillStyle = STAGE.ink; c.fillRect(x + bw / 2 - r * 1.1, hy - r * 3.4, r * 2.2, r * 1.3);
  }
}

interface Seg { t: string; c: string }
/** Flow whole chunks ("18 are poor (no change: 32)") over up to `lines` lines, joined by " · "; a chunk that does not fit is left out. */
function flow(c: Ctx, chunks: Seg[][], x: number, y: number, maxW: number, lines: number, lh: number) {
  c.font = `400 14px ${FONT.body}`;
  const width = (ch: Seg[]) => ch.reduce((q, s) => q + c.measureText(s.t).width, 0), dot = c.measureText(" · ").width;
  let row = 0, cx = x;
  for (let ch of chunks) {
    const w = width(ch);
    if (cx > x && cx + dot + w > x + maxW) { row++; cx = x; }
    if (row >= lines) break;
    if (cx + w > x + maxW) continue;
    if (cx > x) { c.fillStyle = STAGE.ink2; c.fillText(" · ", cx, y + row * lh); cx += dot; }
    else ch = [{ ...ch[0], t: ch[0].t[0].toUpperCase() + ch[0].t.slice(1) }, ...ch.slice(1)];
    for (const s of ch) { c.fillStyle = s.c; c.fillText(s.t, cx, y + row * lh); cx += c.measureText(s.t).width; }
  }
}

/** Stepped outline after the first k figures (column-major grid), i.e. the poverty line. */
function cut(c: Ctx, k: number, R: number, x0: number, y0: number, cw: number, ch: number, col: string, dash: number[]) {
  if (k <= 0 || k >= 100) return;
  const cc = Math.floor(k / R), r0 = k % R, xa = x0 + cc * cw, xb = xa + cw;
  c.strokeStyle = col; c.lineWidth = 1.5; c.setLineDash(dash); c.beginPath();
  if (r0 === 0) { c.moveTo(xa, y0); c.lineTo(xa, y0 + R * ch); }
  else { c.moveTo(xb, y0); c.lineTo(xb, y0 + r0 * ch); c.lineTo(xa, y0 + r0 * ch); c.lineTo(xa, y0 + R * ch); }
  c.stroke(); c.setLineDash([]);
}

function hundred(c: Ctx, W: number, top: number, H: number, figs: Figure[], tally: Tally, base: Tally | null, year: string) {
  // Wide stages carry the vertical "WHAT-IF LAB · SEED" edge label on the right; keep clear of it
  const pad = W < 500 ? 12 : 16, padR = W >= 900 ? 34 : pad, ph = H - top;
  c.strokeStyle = STAGE.line; c.lineWidth = 1; c.setLineDash([4, 4]); c.beginPath(); c.moveTo(0, top + 0.5); c.lineTo(W, top + 0.5); c.stroke(); c.setLineDash([]);
  rect(c, 0, top + 1, W, ph, STAGE.void);

  c.font = `500 10px ${FONT.body}`; c.fillStyle = STAGE.ink2; c.textBaseline = "alphabetic";
  const S = say();
  c.fillText(S(W >= 720 ? "stage.titleWide" : W >= 560 ? "stage.title" : "stage.titleShort", { year }), pad, top + 20);
  // Colour key on the title row
  let kx = W - padR;
  for (let b = 2; b >= 0; b--) {
    const label = S(`stage.band.${b}`), lw = c.measureText(label).width;
    kx -= lw; c.fillStyle = STAGE.ink2; c.fillText(label, kx, top + 20);
    kx -= 14; c.fillStyle = BAND[b]; c.beginPath(); c.arc(kx + 5, top + 16.5, 4, 0, 7); c.fill(); kx -= 12;
  }

  const lines = ph >= 170 ? 2 : 1, legend = ph >= 215 && W >= 520;
  const gy0 = top + 32, gh = ph - 32 - lines * 22 - (legend ? 22 : 0) - 8, gw = W - pad - padR;
  let best = { R: 4, fh: 0 };
  for (let R = 2; R <= 8; R++) {
    const cols = Math.ceil(100 / R), cw = gw / cols, ch = gh / R, fh = Math.min(ch * 0.86, cw * 1.6);
    if (fh > best.fh) best = { R, fh };
  }
  const R = best.R, cols = Math.ceil(100 / R), cw = gw / cols, ch = gh / R;
  figs.forEach((f, i) => person(c, pad + Math.floor(i / R) * cw + cw / 2, gy0 + (i % R) * ch + ch * 0.93, best.fh, f));
  cut(c, tally.poor, R, pad, gy0, cw, ch, BAND[0], [4, 3]);
  if (base && base.poor !== tally.poor) cut(c, base.poor, R, pad, gy0, cw, ch, STAGE.base, [2, 3]);

  // Plain sentences; with changes, the no-change numbers follow in blue
  const nc = (v: number | string): Seg[] => (base ? [{ t: " " + S("stage.noChange", { v }), c: STAGE.base }] : []);
  let y = gy0 + gh + 24;
  flow(c, [
    [{ t: S("stage.poor", { n: tally.poor }), c: STAGE.ink }, ...nc(base?.poor ?? "")],
    [{ t: S("stage.fam", { usd: usd(tally.fam) }), c: STAGE.ink }, ...nc(base ? usd(base.fam) : "")],
    [{ t: S("stage.jobless", { n: tally.jobless }), c: STAGE.ink }, ...nc(base?.jobless ?? "")],
    [{ t: S("stage.kidsOut", { n: tally.kidsOut }), c: STAGE.ink }, ...nc(base?.kidsOut ?? "")],
  ], pad, y, gw, lines, 22);
  if (legend) {
    y += lines * 22;
    c.font = `500 10px ${FONT.body}`;
    const items: [Figure, string][] = [
      [{ band: 1, kind: "work", protest: false }, S("stage.legend.work")], [{ band: 1, kind: "jobless", protest: false }, S("stage.legend.jobless")],
      [{ band: 1, kind: "retired", protest: false }, S("stage.legend.retired")], [{ band: 1, kind: "kid", protest: false }, S("stage.legend.kid")],
      [{ band: 1, kind: "kidOut", protest: false }, S("stage.legend.kidOut")],
    ];
    let lx = pad;
    for (const [f, label] of items) { person(c, lx + 5, y + 2, 16, f); c.fillStyle = STAGE.ink2; c.fillText(label, lx + 14, y); lx += 22 + c.measureText(label).width; }
    c.strokeStyle = BAND[0]; c.setLineDash([4, 3]); c.lineWidth = 1.5; c.beginPath(); c.moveTo(lx, y - 10); c.lineTo(lx, y + 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = STAGE.ink2; c.fillText(S("stage.legend.poverty"), lx + 6, y);
  }
}

/* ───────────── entry ───────────── */

export function drawCountry(c: Ctx, W: number, H: number, target: Look, climate: Climate, figs: Figure[], tally: Tally, base: Tally | null, half: number, year: string) {
  const L = ease(half, target), t = clock();
  c.fillStyle = STAGE.void; c.fillRect(0, 0, W, H);
  const sH = Math.round(H * (H < 460 ? 0.48 : 0.56));
  c.save(); c.beginPath(); c.rect(0, 0, W, sH); c.clip();
  street(c, W, sH, L, climate, t);
  c.restore();
  hundred(c, W, sH, H, figs, tally, base, year);
}
