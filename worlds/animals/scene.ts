import { TAU, clamp, fmtNum, mix } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import { ARENA_RATIO, COVER, HAB_T, SPECIES, type Habitat, type Species } from "./data";
import type { Cr, W } from "./sim";
import { worldSay } from "@/lib/sim/say";
import { animalWords } from "./messages";

/**
 * The animals stage (change 0017), framework-free. A habitat backdrop painted in layers (cached per stage size), food
 * drawn as grass, flowers, krill or bugs, and every animal as a small silhouette whose size, legs, ears/eyes and coat
 * follow its evolved traits. Ambient motion (gait, tails, wings, fins, kelp, puffs, births) runs on a draw-only renderer
 * clock and never touches the world; reduced motion freezes it.
 */

export interface View { season: number; T: number; fires: [x0: number, x1: number, grow: number][] }
export interface Traits { sp: number; sz: number; se: number; co: number }
type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const AR = ARENA_RATIO;
const ONE: Traits = { sp: 1, sz: 1, se: 1, co: 1 };

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

/** Sim days per real second, smoothed, so gait can stop at high speeds (no strobing). */
let rateT = 0, rateW = 0, rate = 0;
function simRate(t: number): number {
  const now = realNow(), dr = now - rateW, dt = t - rateT;
  if (dr > 0 && dr < 0.5 && dt >= 0) rate += (dt / dr - rate) * Math.min(1, dr * 4);
  rateT = t; rateW = now;
  return rate;
}

/* ───────────── colour helpers ───────────── */

const hash = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const shade = (c: string, k: number) => mix(c, k < 0 ? "#100904" : "#FFEDD7", Math.abs(k));

/* ───────────── stage layout ───────────── */

export interface Box { x: number; y: number; w: number; h: number }

/** The arena (model 1 × 0.6) inside the stage: fills it, allowing up to 1.5× stretch, leaving room for the chips. */
function arena(W: number, H: number): Box {
  const m = 10, top = W < 560 ? 64 : 62;
  let aw = W - 2 * m, ah = H - top - m;
  const r = ah / aw / AR;
  if (r > 1.5) ah = aw * AR * 1.5;
  if (r < 1 / 1.5) aw = (ah / AR) * 1.5;
  return { x: (W - aw) / 2, y: H - m - ah, w: aw, h: ah };
}

/* ───────────── habitat backdrops ───────────── */

const GROUND: Record<Habitat, [string, string]> = {
  forest: ["#14211A", "#1B2C20"], savanna: ["#2A2210", "#3A2E14"], desert: ["#2E2216", "#3E2E1C"],
  ocean: ["#0B1A26", "#0E2433"], ice: ["#16263A", "#22364A"], meadow: ["#16251A", "#1E3220"],
};

const backs = new Map<string, { c: OffscreenCanvas | HTMLCanvasElement }>();

function canvasOf(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
}

function backdrop(W: number, H: number, hab: Habitat, A: Box, dpr: number) {
  const key = `${hab}|${W}|${H}|${dpr}`;
  const hit = backs.get(key);
  if (hit) return hit.c;
  if (backs.size > 8) backs.clear();
  const cv = canvasOf(Math.round(W * dpr), Math.round(H * dpr));
  const g = cv.getContext("2d") as Ctx;
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  const [c0, c1] = GROUND[hab];
  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c0); grad.addColorStop(1, c1);
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  const px = (x: number) => A.x + x * A.w, py = (y: number) => A.y + (y / AR) * A.h, s = Math.min(A.w, A.h / AR);
  const N = Math.round((W * H) / 900);
  // Ground texture: deterministic flecks
  for (let i = 0; i < N; i++) {
    const x = hash(i) * W, y = hash(i + 0.5) * H;
    g.fillStyle = shade(c1, hash(i + 0.25) > 0.5 ? 0.06 : -0.25);
    g.fillRect(x, y, 1.5, 1.5);
  }
  if (hab === "savanna") {
    // Horizon with acacias, then dry grass strokes
    g.strokeStyle = "rgba(210,170,90,.10)"; g.lineWidth = 1;
    g.beginPath();
    for (let i = 0; i < N * 0.8; i++) { const x = hash(i * 3.1) * W, y = hash(i * 7.3) * H; g.moveTo(x, y); g.lineTo(x + 1.5, y - 4); }
    g.stroke();
    for (let i = 0; i < Math.max(3, W / 160); i++) acacia(g, hash(i * 9.1) * W, A.y - 2 + hash(i * 4.4) * 14, 14 + hash(i * 2.2) * 10);
  }
  if (hab === "forest") {
    for (let i = 0; i < Math.max(8, W / 34); i++) pine(g, (i + hash(i) * 0.6) * (W / Math.max(8, W / 34)), A.y + 6 + hash(i * 2.7) * 8, 16 + hash(i * 5.1) * 14);
    g.strokeStyle = "rgba(120,170,120,.08)"; g.beginPath();
    for (let i = 0; i < N * 0.6; i++) { const x = hash(i * 3.3) * W, y = A.y + hash(i * 1.9) * A.h; g.moveTo(x, y); g.lineTo(x + 1, y - 3); }
    g.stroke();
  }
  if (hab === "meadow") {
    for (let i = 0; i < N * 0.25; i++) {
      const x = hash(i * 1.7) * W, y = hash(i * 2.9) * H;
      g.fillStyle = ["rgba(240,200,220,.18)", "rgba(250,240,200,.16)", "rgba(190,200,250,.16)"][i % 3];
      g.beginPath(); g.arc(x, y, 1.4, 0, TAU); g.fill();
    }
  }
  if (hab === "desert") {
    g.strokeStyle = "rgba(230,190,140,.10)"; g.lineWidth = 1.5;
    for (let k = 0; k < 7; k++) {
      const y0 = A.y + (k + 0.5) * (A.h / 7);
      g.beginPath();
      for (let x = 0; x <= W; x += 12) g.lineTo(x, y0 + Math.sin(x / 70 + k * 1.7) * 8);
      g.stroke();
    }
  }
  if (hab === "ocean") {
    // Light shafts from the surface and a sandy floor
    for (let i = 0; i < 5; i++) {
      const x = hash(i * 2.3) * W;
      const lg = g.createLinearGradient(0, 0, 0, H * 0.8);
      lg.addColorStop(0, "rgba(160,210,230,.10)"); lg.addColorStop(1, "rgba(160,210,230,0)");
      g.fillStyle = lg;
      g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 40, 0); g.lineTo(x + 90, H * 0.8); g.lineTo(x + 20, H * 0.8); g.fill();
    }
    g.fillStyle = "rgba(150,130,90,.12)"; g.fillRect(0, H - 14, W, 14);
  }
  if (hab === "ice") {
    g.fillStyle = "rgba(200,220,235,.05)";
    for (let i = 0; i < 26; i++) { const x = hash(i * 5.5) * W, y = hash(i * 6.6) * H; g.beginPath(); g.ellipse(x, y, 30 + hash(i) * 40, 6 + hash(i * 2) * 8, 0, 0, TAU); g.fill(); }
  }
  // Cover patches (prey are safe inside)
  for (const [cx, cy] of COVER) cover(g, hab, px(cx), py(cy), 0.04 * s, 0);
  backs.set(key, { c: cv });
  return cv;
}

function acacia(g: Ctx, x: number, y: number, r: number) {
  g.strokeStyle = "rgba(20,14,6,.55)"; g.lineWidth = 2;
  g.beginPath(); g.moveTo(x, y + r * 0.9); g.lineTo(x, y); g.stroke();
  g.fillStyle = "rgba(30,26,12,.6)";
  g.beginPath(); g.ellipse(x, y - 2, r, r * 0.28, 0, 0, TAU); g.fill();
}
function pine(g: Ctx, x: number, y: number, h: number) {
  g.fillStyle = "rgba(10,22,15,.75)";
  g.beginPath(); g.moveTo(x, y - h); g.lineTo(x + h * 0.32, y); g.lineTo(x - h * 0.32, y); g.fill();
}

const COVER_COL: Record<Habitat, string> = { forest: "#1F3A26", savanna: "#3C3A1A", desert: "#4A3A2C", ocean: "#1C3A2C", ice: "#2B3B46", meadow: "#24452A" };

function cover(g: Ctx, hab: Habitat, x: number, y: number, r: number, t: number) {
  const col = COVER_COL[hab];
  if (hab === "ocean") {
    // Kelp: swaying ribbons (drawn every frame for the sway)
    g.strokeStyle = col; g.lineCap = "round"; g.lineWidth = Math.max(2, r * 0.18);
    for (let k = 0; k < 6; k++) {
      const bx = x + (k - 2.5) * r * 0.32;
      g.beginPath(); g.moveTo(bx, y + r);
      for (let q = 1; q <= 5; q++) g.lineTo(bx + Math.sin(t * 1.3 + k + q * 0.8) * r * 0.12 * q * 0.4, y + r - (q / 5) * r * 2.1);
      g.stroke();
    }
    g.lineCap = "butt";
    return;
  }
  if (hab === "desert" || hab === "ice") {
    // Rocks / snow mounds with a burrow
    g.fillStyle = col;
    g.beginPath(); g.ellipse(x - r * 0.3, y, r * 0.75, r * 0.55, 0, 0, TAU); g.ellipse(x + r * 0.45, y + r * 0.1, r * 0.6, r * 0.45, 0, 0, TAU); g.fill();
    g.fillStyle = shade(col, 0.12);
    g.beginPath(); g.ellipse(x - r * 0.4, y - r * 0.2, r * 0.4, r * 0.18, 0, 0, TAU); g.fill();
    if (hab === "desert") { g.fillStyle = "#1A120B"; g.beginPath(); g.ellipse(x + r * 0.1, y + r * 0.45, r * 0.22, r * 0.1, 0, 0, TAU); g.fill(); }
    return;
  }
  // Bushes
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * TAU, rr = r * (0.5 + 0.12 * hash(k + x));
    g.fillStyle = shade(col, k % 2 ? 0.05 : -0.1);
    g.beginPath(); g.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.3, rr, 0, TAU); g.fill();
  }
  if (hab === "forest") { g.fillStyle = "rgba(200,60,80,.5)"; for (let k = 0; k < 4; k++) { g.beginPath(); g.arc(x + (hash(k * 3 + x) - 0.5) * r, y + (hash(k * 5 + y) - 0.5) * r * 0.6, 1.4, 0, TAU); g.fill(); } }
  if (hab === "meadow") { g.fillStyle = "rgba(255,230,240,.6)"; for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(x + (hash(k * 3 + x) - 0.5) * r * 1.2, y + (hash(k * 5 + y) - 0.5) * r * 0.7, 1.5, 0, TAU); g.fill(); } }
}

/* ───────────── food ───────────── */

function drawFood(c: Ctx, hab: Habitat, food: number[], px: (x: number) => number, py: (y: number) => number, season: number) {
  const n = food.length;
  if (hab === "forest" || hab === "savanna") {
    c.strokeStyle = hab === "forest" ? mix("#7FCB7A", "#B8A060", clamp(-season, 0, 1)) : mix("#C9D36A", "#D8B060", clamp(-season, 0, 1));
    c.lineWidth = 1.3; c.beginPath();
    for (let i = 0; i < n; i += 2) {
      const x = px(food[i]), y = py(food[i + 1]);
      c.moveTo(x - 2, y + 1.5); c.lineTo(x - 1, y - 2); c.moveTo(x, y + 1.5); c.lineTo(x, y - 3); c.moveTo(x + 2, y + 1.5); c.lineTo(x + 1.2, y - 2);
    }
    c.stroke();
    if (hab === "forest") { c.fillStyle = "#D2566E"; for (let i = 0; i < n; i += 12) { c.fillRect(px(food[i]) + 1.5, py(food[i + 1]) - 2.5, 2, 2); } }
    return;
  }
  if (hab === "meadow") {
    const cols = ["#F2A7C3", "#F7E28A", "#B9C4F7", "#F4F0E8"];
    for (let k = 0; k < 4; k++) {
      c.fillStyle = cols[k]; c.beginPath();
      for (let i = k * 2; i < n; i += 8) { const x = px(food[i]), y = py(food[i + 1]); c.moveTo(x + 2.4, y); c.arc(x, y, 2.4, 0, TAU); }
      c.fill();
    }
    c.fillStyle = "#E8B04A"; c.beginPath();
    for (let i = 0; i < n; i += 2) { const x = px(food[i]), y = py(food[i + 1]); c.moveTo(x + 0.9, y); c.arc(x, y, 0.9, 0, TAU); }
    c.fill();
    return;
  }
  if (hab === "desert") {
    c.fillStyle = "#1C140C"; c.strokeStyle = "rgba(28,20,12,.9)"; c.lineWidth = 0.8;
    c.beginPath();
    for (let i = 0; i < n; i += 2) { const x = px(food[i]), y = py(food[i + 1]); c.moveTo(x + 1.6, y); c.ellipse(x, y, 1.6, 1.1, 0, 0, TAU); }
    c.fill();
    c.fillStyle = "#C9A46A"; c.beginPath();
    for (let i = 0; i < n; i += 6) { const x = px(food[i]) + 3, y = py(food[i + 1]) + 1; c.moveTo(x + 0.9, y); c.arc(x, y, 0.9, 0, TAU); }
    c.fill();
    return;
  }
  // Krill / small fish
  c.fillStyle = hab === "ice" ? "#F0A08C" : "#E8A890"; c.beginPath();
  for (let i = 0; i < n; i += 2) { const x = px(food[i]), y = py(food[i + 1]); c.moveTo(x + 1.6, y); c.ellipse(x, y, 1.6, 0.8, 0.4, 0, TAU); }
  c.fill();
}

/* ───────────── animals ───────────── */

/**
 * Draw one animal at (x, y), body radius r, facing right when dir = 1 (land) or along `ang` (swimmers and insects).
 * `gait` swings legs, `t` animates tails, wings and fins; both 0 = still. Exported for chips, icons and the portrait.
 */
export function drawAnimal(c: Ctx, sp: Species, x: number, y: number, r: number, dir: number, ang: number, tr: Traits = ONE, gait = 0, t = 0, seed = 0) {
  const L = sp.look;
  c.save();
  c.translate(x, y);
  const rot = L.form === "fish" || L.form === "orca" || L.form === "seal" || L.form === "insect" || L.form === "scorpion";
  if (rot) { c.rotate(ang); if (L.form !== "insect" && L.form !== "scorpion" && Math.cos(ang) < 0) c.scale(1, -1); }
  else if (dir < 0) c.scale(-1, 1);
  c.scale(r, r);
  const simple = r < 6;
  const legL = L.leg * (0.8 + 0.2 * tr.sp), sense = Math.sqrt(tr.se), fur = 0.12 * tr.co;
  const lw = (px: number) => px / r;
  switch (L.form) {
    case "quad": quad(c, L, legL, sense, fur, gait, t + seed, simple, lw); break;
    case "elephant": elephant(c, L, legL, sense, fur, gait, t + seed, simple); break;
    case "upright": upright(c, L, legL, sense, fur, gait, t + seed, simple); break;
    case "penguin": penguin(c, L, sense, gait, simple); break;
    case "fish": fish(c, L, sense, tr, t + seed, simple); break;
    case "orca": orca(c, L, sense, tr, t + seed, simple); break;
    case "seal": seal(c, L, sense, tr, t + seed, simple); break;
    case "insect": insect(c, L, sense, t + seed, simple); break;
    case "scorpion": scorpion(c, L, sense, legL, gait, simple); break;
  }
  c.restore();
}

function furry(c: Ctx, col: string, fur: number) {
  if (fur < 0.02) return;
  c.strokeStyle = shade(col, 0.18); c.lineWidth = fur; c.setLineDash([0.12, 0.09]); c.stroke(); c.setLineDash([]);
}

function eye(c: Ctx, x: number, y: number, s: number, simple: boolean) {
  if (simple) return;
  c.fillStyle = "#FFEDD7"; c.beginPath(); c.arc(x, y, 0.13 * s, 0, TAU); c.fill();
  c.fillStyle = "#100904"; c.beginPath(); c.arc(x + 0.04 * s, y, 0.075 * s, 0, TAU); c.fill();
}

function quad(c: Ctx, L: Species["look"], legL: number, sense: number, fur: number, gait: number, t: number, simple: boolean, lw: (p: number) => number) {
  const { bw, bh, head, hx, hy, snout } = L, dark = shade(L.body, -0.35);
  // Legs (back pair first so the near legs sit on top)
  c.lineCap = "round";
  const legs = [[-0.62 * bw, 0], [0.55 * bw, Math.PI], [-0.48 * bw, Math.PI], [0.7 * bw, 0]];
  legs.forEach(([lx, off], k) => {
    const sw = Math.sin(gait + off) * 0.45;
    c.strokeStyle = k < 2 ? shade(L.body, -0.45) : dark; c.lineWidth = Math.max(lw(1.2), 0.2 * (L.bh + 0.3));
    c.beginPath(); c.moveTo(lx, bh * 0.4); c.lineTo(lx + Math.sin(sw) * legL, bh * 0.4 + Math.cos(sw) * legL); c.stroke();
  });
  // Tail
  const wag = Math.sin(t * 6) * 0.25;
  c.save(); c.translate(-bw * 0.95, -bh * 0.2); c.rotate(wag);
  c.fillStyle = L.body; c.strokeStyle = L.body;
  if (L.tail === "bushy") { c.beginPath(); c.ellipse(-0.45, 0.15, 0.5, 0.2, 0.5, 0, TAU); c.fill(); c.fillStyle = shade(L.body, 0.35); c.beginPath(); c.arc(-0.85, 0.38, 0.12, 0, TAU); c.fill(); }
  else if (L.tail === "thin" || L.tail === "tuft") {
    c.lineWidth = 0.1; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-0.5, 0.1, -0.7, 0.6); c.stroke();
    if (L.tail === "tuft") { c.fillStyle = L.pat; c.beginPath(); c.arc(-0.7, 0.62, 0.11, 0, TAU); c.fill(); }
  } else if (L.tail === "flat") { c.fillStyle = L.pat; c.beginPath(); c.ellipse(-0.3, 0.35, 0.35, 0.16, 0.4, 0, TAU); c.fill(); }
  else if (L.tail === "stub") { c.fillStyle = L.pattern === "belly" ? L.pat : L.body; c.beginPath(); c.arc(-0.05, 0, 0.16, 0, TAU); c.fill(); }
  c.restore();
  // Body
  c.fillStyle = L.body;
  c.beginPath(); c.ellipse(0, 0, bw, bh, 0, 0, TAU); c.fill();
  furry(c, L.body, fur);
  if (!simple) pattern(c, L, bw, bh);
  // Neck and head
  if (hy < -0.5) { c.strokeStyle = L.body; c.lineWidth = head * 1.3; c.lineCap = "round"; c.beginPath(); c.moveTo(bw * 0.6, -bh * 0.2); c.lineTo(hx, hy); c.stroke(); }
  if (L.mane) { c.fillStyle = L.pat; c.beginPath(); c.arc(hx - 0.08, hy + 0.05, head * 1.55, 0, TAU); c.fill(); }
  c.fillStyle = L.body;
  c.beginPath(); c.arc(hx, hy, head, 0, TAU); c.fill();
  if (snout > 0) { c.beginPath(); c.ellipse(hx + head * 0.7 + snout * 0.35, hy + head * 0.25, snout * 0.6, head * 0.45, 0.15, 0, TAU); c.fill(); }
  if (L.pattern === "mask" && !simple) { c.fillStyle = L.pat; c.beginPath(); c.arc(hx + head * 0.2, hy + head * 0.1, head * 0.7, -0.6, 1.7); c.fill(); }
  // Ears / horns grow with senses
  const ex = hx - head * 0.25, ey = hy - head * 0.75;
  c.fillStyle = L.body;
  if (L.ears === "point") { c.beginPath(); c.moveTo(ex - 0.12 * sense, ey + 0.1); c.lineTo(ex + 0.02, ey - 0.35 * sense); c.lineTo(ex + 0.18 * sense, ey + 0.1); c.fill(); }
  if (L.ears === "round") { c.beginPath(); c.arc(ex, ey + 0.05, 0.14 * sense, 0, TAU); c.fill(); }
  if (L.ears === "big") { c.beginPath(); c.ellipse(ex, ey - 0.1 * sense, 0.13 * sense, 0.32 * sense, -0.2, 0, TAU); c.fill(); }
  if (L.ears === "long") {
    c.beginPath(); c.ellipse(ex - 0.08, ey - 0.35 * sense, 0.1 * sense, 0.42 * sense, -0.25, 0, TAU); c.fill();
    c.fillStyle = shade(L.body, -0.15); c.beginPath(); c.ellipse(ex + 0.08, ey - 0.3 * sense, 0.09 * sense, 0.38 * sense, 0.1, 0, TAU); c.fill();
  }
  if (L.horns === "antler" && !simple) {
    c.strokeStyle = "#E8D9BE"; c.lineWidth = 0.08; c.lineCap = "round"; c.beginPath();
    c.moveTo(ex, ey); c.lineTo(ex - 0.35, ey - 0.75); c.moveTo(ex - 0.15, ey - 0.3); c.lineTo(ex + 0.15, ey - 0.6); c.moveTo(ex - 0.27, ey - 0.58); c.lineTo(ex - 0.05, ey - 0.92); c.moveTo(ex - 0.33, ey - 0.7); c.lineTo(ex - 0.65, ey - 0.95);
    c.stroke();
  }
  if (L.horns === "spike") { c.strokeStyle = "#2A2420"; c.lineWidth = 0.07; c.beginPath(); c.moveTo(ex, ey); c.quadraticCurveTo(ex - 0.15, ey - 0.4, ex - 0.32, ey - 0.6); c.stroke(); }
  eye(c, hx + head * 0.35, hy - head * 0.15, sense * (head / 0.4), simple);
  if (!simple && snout > 0.2) { c.fillStyle = "#1A120B"; c.beginPath(); c.arc(hx + head * 0.7 + snout * 0.85, hy + head * 0.2, 0.06, 0, TAU); c.fill(); }
}

function pattern(c: Ctx, L: Species["look"], bw: number, bh: number) {
  c.save(); c.beginPath(); c.ellipse(0, 0, bw, bh, 0, 0, TAU); c.clip();
  c.fillStyle = L.pat;
  if (L.pattern === "stripes") for (let k = -4; k <= 4; k++) { c.beginPath(); c.moveTo(k * 0.24 - 0.05, -bh); c.lineTo(k * 0.24 + 0.05, -bh); c.lineTo(k * 0.24 + 0.1, bh); c.lineTo(k * 0.24 - 0.02, bh); c.fill(); }
  if (L.pattern === "spots") for (let k = 0; k < 9; k++) { c.beginPath(); c.arc((hash(k) - 0.5) * bw * 1.7, (hash(k + 9) - 0.5) * bh * 1.5, 0.07, 0, TAU); c.fill(); }
  if (L.pattern === "belly") { c.beginPath(); c.ellipse(0.1, bh * 0.75, bw * 0.8, bh * 0.5, 0, 0, TAU); c.fill(); }
  if (L.pattern === "patch") { c.beginPath(); c.ellipse(-0.1, -bh * 0.8, bw * 0.8, bh * 0.55, 0, 0, TAU); c.fill(); }
  c.restore();
}

function elephant(c: Ctx, L: Species["look"], legL: number, sense: number, fur: number, gait: number, t: number, simple: boolean) {
  const { bw, bh } = L, dark = shade(L.body, -0.3);
  c.lineCap = "round";
  [[-0.6, 0], [0.55, Math.PI], [-0.4, Math.PI], [0.72, 0]].forEach(([lx, off], k) => {
    const sw = Math.sin(gait + off) * 0.3;
    c.strokeStyle = k < 2 ? dark : L.body; c.lineWidth = 0.34;
    c.beginPath(); c.moveTo(lx * bw, bh * 0.45); c.lineTo(lx * bw + Math.sin(sw) * legL, bh * 0.45 + legL); c.stroke();
  });
  c.strokeStyle = L.body; c.lineWidth = 0.06; c.beginPath(); c.moveTo(-bw, -0.1); c.quadraticCurveTo(-bw - 0.25, 0.1 + Math.sin(t * 4) * 0.05, -bw - 0.2, 0.5); c.stroke();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(0, 0, bw, bh, 0, 0, TAU); c.fill();
  furry(c, L.body, fur);
  const hx = bw * 0.95, hy = -bh * 0.35;
  // Trunk
  c.strokeStyle = L.body; c.lineWidth = 0.2; c.beginPath(); c.moveTo(hx + 0.3, hy + 0.1); c.quadraticCurveTo(hx + 0.65, hy + 0.5, hx + 0.5 + Math.sin(t * 2) * 0.06, hy + 1.05); c.stroke();
  c.fillStyle = L.body; c.beginPath(); c.arc(hx, hy, L.head, 0, TAU); c.fill();
  if (!simple) { c.strokeStyle = "#EFE6D2"; c.lineWidth = 0.07; c.beginPath(); c.moveTo(hx + 0.32, hy + 0.3); c.quadraticCurveTo(hx + 0.5, hy + 0.55, hx + 0.7, hy + 0.45); c.stroke(); }
  // Ear flaps (bigger with senses)
  c.fillStyle = L.pat; c.beginPath(); c.ellipse(hx - 0.2, hy + 0.05, 0.32 * sense * (1 + Math.sin(t * 3) * 0.04), 0.45 * sense, -0.2, 0, TAU); c.fill();
  eye(c, hx + 0.22, hy - 0.12, sense * 0.9, simple);
}

function upright(c: Ctx, L: Species["look"], legL: number, sense: number, fur: number, gait: number, t: number, simple: boolean) {
  const bob = Math.abs(Math.sin(gait)) * 0.08;
  c.translate(0, -bob);
  c.strokeStyle = L.body; c.lineWidth = 0.1; c.lineCap = "round";
  c.beginPath(); c.moveTo(-0.2, 0.7); c.quadraticCurveTo(-0.8, 0.85, -0.9 + Math.sin(t * 3) * 0.05, 0.6); c.stroke();
  c.strokeStyle = shade(L.body, -0.35); c.lineWidth = 0.14;
  c.beginPath(); c.moveTo(-0.15, 0.8); c.lineTo(-0.15 + Math.sin(gait) * 0.15, 0.8 + legL); c.moveTo(0.15, 0.8); c.lineTo(0.15 - Math.sin(gait) * 0.15, 0.8 + legL); c.stroke();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(0, 0, L.bw, L.bh, 0, 0, TAU); c.fill();
  furry(c, L.body, fur);
  if (!simple) { c.fillStyle = shade(L.body, 0.25); c.beginPath(); c.ellipse(0.12, 0.15, L.bw * 0.55, L.bh * 0.7, 0, 0, TAU); c.fill(); }
  const hx = L.hx, hy = L.hy;
  c.fillStyle = L.body; c.beginPath(); c.arc(hx, hy, L.head, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(hx + L.head * 0.75, hy + 0.08, L.snout, L.head * 0.42, 0.1, 0, TAU); c.fill();
  c.beginPath(); c.arc(hx - L.head * 0.55, hy - L.head * 0.6, 0.12 * sense, 0, TAU); c.fill();
  if (!simple) { c.fillStyle = L.pat; c.beginPath(); c.ellipse(hx + L.head * 0.3, hy - 0.02, 0.16 * sense, 0.11 * sense, 0, 0, TAU); c.fill(); }
  eye(c, hx + L.head * 0.32, hy - 0.03, sense * 0.85, simple);
}

function penguin(c: Ctx, L: Species["look"], sense: number, gait: number, simple: boolean) {
  c.rotate(Math.sin(gait) * 0.12);
  c.fillStyle = "#E8B04A"; c.beginPath(); c.ellipse(-0.15, 1.0, 0.18, 0.07, 0, 0, TAU); c.ellipse(0.2, 1.0, 0.18, 0.07, 0, 0, TAU); c.fill();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(0, 0, L.bw, L.bh, 0, 0, TAU); c.fill();
  c.fillStyle = L.pat; c.beginPath(); c.ellipse(0.15, 0.15, L.bw * 0.7, L.bh * 0.78, 0, 0, TAU); c.fill();
  c.strokeStyle = L.body; c.lineWidth = 0.16; c.lineCap = "round"; c.beginPath(); c.moveTo(-0.3, -0.2); c.lineTo(-0.55, 0.45 + Math.sin(gait) * 0.1); c.stroke();
  c.fillStyle = L.body; c.beginPath(); c.arc(0.05, -0.95, L.head, 0, TAU); c.fill();
  if (!simple) { c.fillStyle = "#E8B04A"; c.beginPath(); c.ellipse(0.12, -0.75, 0.12, 0.08, 0, 0, TAU); c.fill(); }
  c.fillStyle = "#3A3A40"; c.beginPath(); c.moveTo(0.35, -0.98); c.lineTo(0.68, -0.9); c.lineTo(0.35, -0.86); c.fill();
  eye(c, 0.2, -1.02, sense * 0.8, simple);
}

function fish(c: Ctx, L: Species["look"], sense: number, tr: Traits, t: number, simple: boolean) {
  const sway = Math.sin(t * 8) * 0.3, fin = 0.85 + 0.15 * tr.sp;
  c.fillStyle = shade(L.body, -0.2);
  c.save(); c.translate(-L.bw * 0.9, 0); c.rotate(sway);
  c.beginPath(); c.moveTo(0.1, 0); c.lineTo(-0.5 * fin, -0.38 * fin); c.lineTo(-0.38 * fin, 0); c.lineTo(-0.5 * fin, 0.38 * fin); c.fill();
  c.restore();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(0, 0, L.bw, L.bh, 0, 0, TAU); c.fill();
  if (!simple) {
    c.fillStyle = L.pat; c.beginPath(); c.ellipse(0, L.bh * 0.15, L.bw * 0.8, L.bh * 0.25, 0, 0, TAU); c.fill();
    c.fillStyle = "rgba(40,50,60,.6)"; for (let k = 0; k < 5; k++) { c.beginPath(); c.arc(-0.4 + k * 0.2, -L.bh * 0.45, 0.04, 0, TAU); c.fill(); }
  }
  c.fillStyle = shade(L.body, -0.2); c.beginPath(); c.moveTo(-0.1, -L.bh * 0.9); c.lineTo(0.15, -L.bh * 1.5); c.lineTo(0.3, -L.bh * 0.85); c.fill();
  eye(c, L.bw * 0.65, -0.05, sense * 0.7, simple);
}

function orca(c: Ctx, L: Species["look"], sense: number, tr: Traits, t: number, simple: boolean) {
  const sway = Math.sin(t * 5) * 0.25, fin = 0.85 + 0.15 * tr.sp;
  c.fillStyle = L.body;
  c.save(); c.translate(-L.bw * 0.95, 0); c.rotate(sway);
  c.beginPath(); c.moveTo(0.1, 0); c.lineTo(-0.35 * fin, -0.32 * fin); c.lineTo(-0.2, 0); c.lineTo(-0.35 * fin, 0.32 * fin); c.fill();
  c.restore();
  c.beginPath(); c.ellipse(0, 0, L.bw, L.bh, 0, 0, TAU); c.fill();
  c.beginPath(); c.moveTo(-0.15, -L.bh * 0.8); c.lineTo(0.05, -L.bh * 2.3); c.lineTo(0.3, -L.bh * 0.8); c.fill();
  c.strokeStyle = "rgba(190,205,230,.85)"; c.lineWidth = 0.07; c.beginPath(); c.ellipse(0, 0, L.bw, L.bh, 0, 0, TAU); c.stroke();
  c.fillStyle = L.pat;
  c.beginPath(); c.ellipse(0.1, L.bh * 0.55, L.bw * 0.7, L.bh * 0.35, 0, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(L.bw * 0.62, -L.bh * 0.25, 0.18 * sense, 0.08 * sense, -0.2, 0, TAU); c.fill();
  if (!simple) { c.fillStyle = "#100904"; c.beginPath(); c.arc(L.bw * 0.78, -L.bh * 0.05, 0.05 * sense, 0, TAU); c.fill(); }
}

function seal(c: Ctx, L: Species["look"], sense: number, tr: Traits, t: number, simple: boolean) {
  const sway = Math.sin(t * 5) * 0.3, fin = 0.85 + 0.15 * tr.sp;
  c.fillStyle = shade(L.body, -0.2);
  c.save(); c.translate(-L.bw * 0.95, 0); c.rotate(sway);
  c.beginPath(); c.ellipse(-0.18 * fin, -0.15, 0.25 * fin, 0.09, -0.5, 0, TAU); c.ellipse(-0.18 * fin, 0.15, 0.25 * fin, 0.09, 0.5, 0, TAU); c.fill();
  c.restore();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(0, 0, L.bw, L.bh, 0, 0, TAU); c.fill();
  if (!simple) pattern(c, L, L.bw, L.bh);
  c.fillStyle = shade(L.body, -0.15); c.beginPath(); c.ellipse(0.2, L.bh * 0.8, 0.22 * fin, 0.08, 0.7, 0, TAU); c.fill();
  c.fillStyle = L.body; c.beginPath(); c.arc(L.bw * 0.95, -0.05, L.head, 0, TAU); c.fill();
  eye(c, L.bw * 1.05, -0.15, sense * 0.85, simple);
  if (!simple) { c.fillStyle = "#1A120B"; c.beginPath(); c.arc(L.bw * 0.95 + L.head * 0.9, 0, 0.05, 0, TAU); c.fill(); }
}

function insect(c: Ctx, L: Species["look"], sense: number, t: number, simple: boolean) {
  // Wings flicker on the clock (top-down view)
  const flick = 0.75 + Math.abs(Math.sin(t * 40)) * 0.35;
  c.fillStyle = "rgba(235,240,250,.45)";
  c.beginPath(); c.ellipse(0.05, -0.45 * flick, 0.42, 0.22 * flick, -0.35, 0, TAU); c.ellipse(0.05, 0.45 * flick, 0.42, 0.22 * flick, 0.35, 0, TAU); c.fill();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(-0.35, 0, L.bw * 0.6, L.bh * 0.85, 0, 0, TAU); c.fill();
  if (!simple) {
    c.save(); c.beginPath(); c.ellipse(-0.35, 0, L.bw * 0.6, L.bh * 0.85, 0, 0, TAU); c.clip();
    c.fillStyle = L.pat; for (let k = 0; k < 3; k++) c.fillRect(-0.8 + k * 0.28, -1, 0.12, 2);
    c.restore();
  }
  c.fillStyle = shade(L.body === "#3A2A20" ? "#5A3A20" : L.body, -0.2); c.beginPath(); c.arc(0.25, 0, 0.26, 0, TAU); c.fill();
  c.fillStyle = L.pattern === "bands" && L.body === "#3A2A20" ? "#E8A040" : "#2E2418"; c.beginPath(); c.arc(0.55, 0, L.head * 0.75, 0, TAU); c.fill();
  c.strokeStyle = "#2E2418"; c.lineWidth = 0.06; c.beginPath();
  c.moveTo(0.65, -0.1); c.lineTo(0.95 + 0.15 * sense, -0.35 * sense); c.moveTo(0.65, 0.1); c.lineTo(0.95 + 0.15 * sense, 0.35 * sense); c.stroke();
}

function scorpion(c: Ctx, L: Species["look"], sense: number, legL: number, gait: number, simple: boolean) {
  c.strokeStyle = L.pat; c.lineWidth = 0.08; c.lineCap = "round"; c.beginPath();
  for (let k = 0; k < 4; k++) {
    const x = 0.25 - k * 0.22, sw = Math.sin(gait + k * 1.3) * 0.12;
    c.moveTo(x, -0.2); c.lineTo(x + sw, -0.2 - legL); c.moveTo(x, 0.2); c.lineTo(x - sw, 0.2 + legL);
  }
  c.stroke();
  // Claws forward
  c.lineWidth = 0.1; c.strokeStyle = L.body; c.beginPath();
  c.moveTo(0.45, -0.15); c.lineTo(0.85, -0.45); c.moveTo(0.45, 0.15); c.lineTo(0.85, 0.45); c.stroke();
  c.fillStyle = L.body; c.beginPath(); c.ellipse(0.95, -0.5, 0.17, 0.11, 0.4, 0, TAU); c.ellipse(0.95, 0.5, 0.17, 0.11, -0.4, 0, TAU); c.fill();
  c.beginPath(); c.ellipse(0.1, 0, L.bw * 0.7, L.bh, 0, 0, TAU); c.fill();
  // Tail curls back over the body
  for (let k = 0; k < 5; k++) { const a = Math.PI + k * 0.38; c.beginPath(); c.arc(-0.45 + Math.cos(a) * 0.35 + 0.35, Math.sin(a) * 0.35 * 0.4, 0.11 - k * 0.012, 0, TAU); c.fill(); }
  c.fillStyle = L.pat; c.beginPath(); c.arc(-0.2, 0.0, 0.08, 0, TAU); c.fill();
  if (!simple) { c.fillStyle = "#1A120B"; c.beginPath(); c.arc(0.45, -0.07 * sense, 0.04 * sense, 0, TAU); c.arc(0.45, 0.07 * sense, 0.04 * sense, 0, TAU); c.fill(); }
}

/** Body radius in px for each species in a cast: the biggest is ~`ref`, the smallest stays readable. */
export function sizer(cast: string[], ref: number) {
  const max = Math.max(...cast.map((id) => SPECIES[id].size), 0.3);
  return (id: string, sz = 1) => clamp(ref * (SPECIES[id].size / max) ** 0.45 * sz ** 0.8, 6, ref * 1.6);
}

/* ───────────── renderer-side memory (births, facing, effects, chip ripples) ───────────── */

interface Seen { t0: number; f: number }
let seen = new Map<number, Seen>();
let fxSeq = -1;
const fxLive: { x: number; y: number; k: number; t0: number }[] = [];
const ripple: number[] = [];
const lastCount: number[] = [];
const lastAt: number[] = [];

/* ───────────── chips ───────────── */

function chips(c: CanvasRenderingContext2D, W: number, w: W, base: W | null, now: number, anim: boolean) {
  const n = w.cast.map(() => 0), nb = base ? base.cast.map(() => 0) : null;
  for (const a of w.c) n[a.s]++;
  if (base && nb) for (const a of base.c) nb[a.s]++;
  const compact = W < 560, S = worldSay(animalWords);
  c.font = "500 12px " + FONT.body;
  let x = 8, y = 36;
  w.cast.forEach((id, i) => {
    const sp = SPECIES[id], k = n[i];
    const gone = k === 0;
    const name = S(`sp.${id}.name`);
    const main = gone ? (compact ? S("stage.gone") : S("stage.goneNamed", { name })) : compact ? fmtNum(k) : S("stage.count", { name, n: k });
    const extra = nb && i < nb.length && nb[i] !== k ? ` (${fmtNum(nb[i])})` : nb && i >= nb.length ? " " + S("stage.new") : "";
    const tw = c.measureText(main).width, ew = extra ? c.measureText(extra).width : 0, cw = 8 + 18 + tw + ew + 10;
    if (x + cw > W - 8 && x > 8) { x = 8; y += 26; }
    // Ripple when the count jumps (compared every half second)
    if (lastCount[i] == null || now - (lastAt[i] ?? 0) > 0.5 || now < (lastAt[i] ?? 0)) {
      if (lastCount[i] != null && Math.abs(k - lastCount[i]) >= Math.max(3, lastCount[i] * 0.15)) ripple[i] = now;
      lastCount[i] = k; lastAt[i] = now;
    }
    if (anim && ripple[i] && now - ripple[i] < 0.6) {
      const q = (now - ripple[i]) / 0.6;
      c.strokeStyle = sp.col; c.globalAlpha = 0.5 * (1 - q); c.lineWidth = 1.5;
      c.beginPath(); c.roundRect(x - 3 * q, y - 3 * q, cw + 6 * q, 22 + 6 * q, 11 + 3 * q); c.stroke();
      c.globalAlpha = 1;
    }
    c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(x, y, cw, 22, 11); c.fill();
    c.globalAlpha = gone ? 0.4 : 1;
    drawAnimal(c, sp, x + 16, y + 12, 6, 1, 0);
    c.globalAlpha = 1;
    c.fillStyle = gone ? STAGE.ink2 : STAGE.ink; c.fillText(main, x + 26, y + 15);
    if (extra) { c.fillStyle = STAGE.base; c.fillText(extra, x + 26 + tw, y + 15); }
    x += cw + 6;
  });
  return y + 22;
}

/* ───────────── the stage ───────────── */

export function drawAnimals(c: CanvasRenderingContext2D, W: number, H: number, w: W, base: W | null, v: View) {
  const reduced = reducedMotion(), t = clock(), now = realNow(), rate = simRate(w.t);
  const anim = !reduced, gaitOn = anim && rate < 12;
  const hab = w.habit, A = arena(W, H), s = Math.min(A.w, A.h / AR);
  const px = (x: number) => A.x + x * A.w, py = (y: number) => A.y + (y / AR) * A.h;
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  c.drawImage(backdrop(W, H, hab, A, dpr) as CanvasImageSource, 0, 0, W, H);
  if (hab === "ocean") for (const [cx, cy] of COVER) cover(c, hab, px(cx), py(cy), 0.04 * s, t);

  // Weather: seasons green and brown the ground, cold brings snow, heat a haze; ice floes shrink as it warms
  const Th = HAB_T[hab], dT = v.T - Th;
  if (hab !== "ocean" && hab !== "ice") {
    if (v.season < -0.05) { c.fillStyle = `rgba(120,90,50,${(-v.season * 0.28).toFixed(3)})`; c.fillRect(0, 0, W, H); }
    if (v.season > 0.05) { c.fillStyle = `rgba(90,160,90,${(v.season * 0.12).toFixed(3)})`; c.fillRect(0, 0, W, H); }
    const snow = clamp(-dT / 6, 0, 0.9);
    if (snow > 0.02) {
      c.fillStyle = `rgba(230,236,240,${(snow * 0.22).toFixed(3)})`;
      for (let i = 0; i < 22; i++) { c.beginPath(); c.ellipse(hash(i * 3.7) * W, A.y + hash(i * 8.1) * A.h, 22 + hash(i) * 30, 7 + hash(i * 2) * 6, 0, 0, TAU); c.fill(); }
    }
    const heat = clamp(dT / 8, 0, 0.6);
    if (heat > 0.02) { c.fillStyle = `rgba(255,170,90,${(heat * 0.12).toFixed(3)})`; c.fillRect(0, 0, W, H); }
  }
  if (hab === "ice") {
    const melt = clamp(1 - dT / 12, 0.2, 1);
    c.fillStyle = "rgba(225,236,244,.2)";
    for (let i = 0; i < 12; i++) { c.beginPath(); c.ellipse(hash(i * 2.9) * W, A.y + hash(i * 4.3) * A.h, (26 + hash(i * 1.3) * 36) * melt, (10 + hash(i * 6.1) * 10) * melt, hash(i) * 0.6, 0, TAU); c.fill(); }
  }
  if (hab === "ocean" && v.season > 0.05) { c.fillStyle = `rgba(90,170,120,${(v.season * 0.08).toFixed(3)})`; c.fillRect(0, 0, W, H); }

  // Burnt land: dark ground, sprouts returning over months
  for (const [x0, x1, g] of v.fires) {
    const a = px(x0), b = px(x1);
    c.fillStyle = `rgba(14,10,8,${(0.72 * (1 - g)).toFixed(3)})`; c.fillRect(a, 0, b - a, H);
    if (g > 0.15) {
      c.strokeStyle = `rgba(130,190,110,${(0.6 * g).toFixed(3)})`; c.lineWidth = 1; c.beginPath();
      for (let i = 0; i < 80 * g; i++) { const x = a + hash(i * 1.9 + x0) * (b - a), y = hash(i * 3.1 + x0) * H; c.moveTo(x, y); c.lineTo(x + 1, y - 3); }
      c.stroke();
    }
  }
  // Lost habitat: fields and a road on land, fish-farm pens at sea
  if (w.hab < 0.999) {
    const x0 = px(w.hab);
    c.save(); c.beginPath(); c.rect(x0, 0, W - x0, H); c.clip();
    if (hab === "ocean" || hab === "ice") {
      c.fillStyle = "#0A141C"; c.fillRect(x0, 0, W - x0, H);
      c.strokeStyle = "rgba(169,177,214,.22)"; c.lineWidth = 1;
      for (let gx = x0 + 18; gx < W; gx += 34) for (let gy = A.y + 10; gy < H - 10; gy += 34) { c.beginPath(); c.arc(gx, gy, 11, 0, TAU); c.stroke(); }
    } else {
      c.fillStyle = "#2A2418"; c.fillRect(x0, 0, W - x0, H);
      c.strokeStyle = "rgba(200,180,120,.12)"; c.lineWidth = 2;
      for (let gy = 4; gy < H; gy += 9) { c.beginPath(); c.moveTo(x0 + 14, gy); c.lineTo(W, gy + 6); c.stroke(); }
      c.fillStyle = "#1E1C1A"; c.fillRect(x0, 0, 12, H);
      c.strokeStyle = "rgba(255,237,215,.4)"; c.setLineDash([6, 8]); c.lineWidth = 1; c.beginPath(); c.moveTo(x0 + 6, 0); c.lineTo(x0 + 6, H); c.stroke(); c.setLineDash([]);
    }
    c.restore();
  }

  drawFood(c, hab, w.food, px, py, v.season);

  // Effects from the model: soft puffs where animals left, "nom" pops on eaten food
  let maxSeq = -1;
  for (let i = 0; i < w.fx.length; i += 4) maxSeq = Math.max(maxSeq, w.fx[i]);
  if (maxSeq < fxSeq) fxSeq = maxSeq;
  if (anim) {
    for (let i = 0; i < w.fx.length; i += 4) if (w.fx[i] > fxSeq && fxLive.length < 90) fxLive.push({ x: w.fx[i + 1], y: w.fx[i + 2], k: w.fx[i + 3], t0: now });
  } else fxLive.length = 0;
  fxSeq = Math.max(fxSeq, maxSeq);

  // Animals: fade and grow in when born, face their way with a little hysteresis, drawn back to front
  const size = sizer(w.cast, clamp(s / 42, 8, 20));
  const next = new Map<number, Seen>();
  let fresh = 0;
  for (const a of w.c) if (!seen.has(a.id)) fresh++;
  const cut = fresh > 10 && fresh > w.c.length * 0.3;
  const order = w.c.slice().sort((p, q) => p.y - q.y);
  for (const a of order) {
    const sp = SPECIES[w.cast[a.s]];
    const old = seen.get(a.id), cs = Math.cos(a.a);
    const f = old ? (cs > 0.25 ? 1 : cs < -0.25 ? -1 : old.f) : cs >= 0 ? 1 : -1;
    const t0 = old ? old.t0 : cut || !anim ? now - 1 : now;
    next.set(a.id, { t0, f });
    const k = clamp((now - t0) / 0.4, 0, 1), e = 1 - (1 - k) ** 3;
    const r = size(sp.id, a.sz) * (0.5 + 0.5 * e);
    if (e < 1) c.globalAlpha = e;
    drawAnimal(c, sp, px(a.x), py(a.y) - (sp.look.form === "quad" || sp.look.form === "elephant" ? r * 0.3 : 0), r, f, a.a, a as Cr, gaitOn ? a.ph : 0, gaitOn ? t : 0, a.id % 7);
    if (e < 1) c.globalAlpha = 1;
  }
  seen = next;

  // Puffs and noms
  for (let i = fxLive.length - 1; i >= 0; i--) {
    const f = fxLive[i], q = (now - f.t0) / (f.k === 1 ? 0.55 : 0.3);
    if (q >= 1) { fxLive.splice(i, 1); continue; }
    const x = px(f.x), y = py(f.y);
    if (f.k === 1) {
      c.fillStyle = `rgba(255,237,215,${(0.35 * (1 - q)).toFixed(3)})`;
      for (let j = 0; j < 4; j++) { const a = j * 1.7 + f.x * 40; c.beginPath(); c.arc(x + Math.cos(a) * 9 * q, y + Math.sin(a) * 6 * q - 4 * q, 3 + 4 * q, 0, TAU); c.fill(); }
    } else {
      c.strokeStyle = `rgba(255,237,215,${(0.6 * (1 - q)).toFixed(3)})`; c.lineWidth = 1;
      c.beginPath(); c.arc(x, y, 2 + 5 * q, 0, TAU); c.stroke();
    }
  }

  chips(c, W, w, base, now, anim);
}
