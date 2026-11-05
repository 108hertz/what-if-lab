import { TAU } from "@/lib/sim/core";
import { hash, type Ctx } from "./people";

/**
 * The rooms of a life (change 0019): nursery (1–4), family kitchen (5–12), teen bedroom (13–17), first flat (18–29) and
 * own home (30+). Each is painted once per size and setting and cached; the stage cross-fades between them. Every room has
 * the same bones so the stage can add live things in fixed places: a shelf on the left wall, a window in the middle, a door
 * on the right (friends appear in it), the floor from `FLOOR_Y`.
 */

export type Life = 0 | 1 | 2 | 3 | 4;
export const lifeOf = (age: number): Life => (age < 5 ? 0 : age < 13 ? 1 : age < 18 ? 2 : age < 30 ? 3 : 4);
export const LIFE_WORD = ["Little years", "School years", "Teen years", "First home", "Own home"];
/** Where the floor starts and where people stand, as a share of the room's height. */
export const FLOOR_Y = 0.84, STAND_Y = 0.9;
/** The fixed places in every room, as shares of the room's width/height. */
export const SPOT = { shelfX: 0.05, shelfW: 0.24, shelfY: 0.34, doorX: 0.885, doorW: 0.085, doorTop: 0.3 };

export interface RoomSet { place: string; money: string; busy: boolean }

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


const backs = new Map<string, OffscreenCanvas | HTMLCanvasElement>();
function canvasOf(w: number, h: number): OffscreenCanvas | HTMLCanvasElement {
  if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(Math.max(1, w), Math.max(1, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, w); c.height = Math.max(1, h);
  return c;
}

/** Walls a little different in each part of life (place sets the base, life a tint). */
const LIFE_TINT = ["rgba(150,170,210,.10)", "rgba(230,170,110,.07)", "rgba(120,90,170,.10)", "rgba(200,200,190,.05)", "rgba(210,150,110,.08)"];

/** A room for a part of life, W × H, cached. */
export function room(W: number, H: number, life: Life, s: RoomSet, dpr: number) {
  const key = `${life}|${s.place}|${s.money}|${s.busy}|${Math.round(W)}|${Math.round(H)}|${dpr}`;
  let cv = backs.get(key);
  if (cv) return cv;
  if (backs.size > 16) backs.clear();
  cv = canvasOf(Math.round(W * dpr), Math.round(H * dpr));
  const c = cv.getContext("2d") as Ctx;
  c.scale(dpr, dpr);
  const fy = H * FLOOR_Y, [w0, w1] = WALL[s.place] ?? WALL.town;
  const g = c.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, w0); g.addColorStop(1, w1);
  c.fillStyle = g; c.fillRect(0, 0, W, fy);
  c.fillStyle = LIFE_TINT[life]; c.fillRect(0, 0, W, fy);
  // Skirting board
  c.fillStyle = "rgba(0,0,0,.22)"; c.fillRect(0, fy - 5, W, 5);

  // Window in the middle (bigger in the first flat)
  const ww = Math.min(W * (life === 3 ? 0.34 : 0.26), life === 3 ? 280 : 220), wh = H * (life === 3 ? 0.42 : 0.36), wx = W * 0.5 - ww / 2, wy = H * 0.14;
  outside(c, s.place, wx, wy, ww, wh);
  c.strokeStyle = "#5A4636"; c.lineWidth = 4; c.strokeRect(wx, wy, ww, wh);
  c.lineWidth = 2; c.beginPath(); c.moveTo(wx + ww / 2, wy); c.lineTo(wx + ww / 2, wy + wh); c.moveTo(wx, wy + wh / 2); c.lineTo(wx + ww, wy + wh / 2); c.stroke();
  if (life !== 3) {
    const cur = life === 0 ? "#4C5A78" : life === 2 ? "#4A3A5E" : s.money === "comfy" ? "#6B3A3A" : s.money === "tight" ? "#3F3A33" : "#4E4034";
    c.fillStyle = cur;
    c.beginPath(); c.moveTo(wx - 10, wy - 6); c.lineTo(wx + ww * 0.14, wy - 6); c.quadraticCurveTo(wx + ww * 0.05, wy + wh * 0.6, wx + ww * 0.1, wy + wh + 8); c.lineTo(wx - 10, wy + wh + 8); c.fill();
    if (s.money !== "tight") { c.beginPath(); c.moveTo(wx + ww + 10, wy - 6); c.lineTo(wx + ww * 0.86, wy - 6); c.quadraticCurveTo(wx + ww * 0.95, wy + wh * 0.6, wx + ww * 0.9, wy + wh + 8); c.lineTo(wx + ww + 10, wy + wh + 8); c.fill(); }
    c.fillStyle = "#5A4636"; c.fillRect(wx - 14, wy - 9, ww + 28, 3);
  }

  // The door on the right (open a little, warm light from the hall)
  const dx = W * SPOT.doorX, dw = W * SPOT.doorW, dt = H * SPOT.doorTop;
  c.fillStyle = "#130C07"; c.fillRect(dx, dt, dw, fy - dt);
  const hall = c.createLinearGradient(dx, 0, dx + dw, 0); hall.addColorStop(0, "rgba(255,200,130,.18)"); hall.addColorStop(1, "rgba(255,200,130,.02)");
  c.fillStyle = hall; c.fillRect(dx, dt, dw, fy - dt);
  c.strokeStyle = "#5A4636"; c.lineWidth = 3; c.strokeRect(dx, dt, dw, fy - dt);
  c.fillStyle = "#4A382A"; c.beginPath(); c.moveTo(dx + dw, dt); c.lineTo(dx + dw + dw * 0.35, dt + 6); c.lineTo(dx + dw + dw * 0.35, fy - 2); c.lineTo(dx + dw, fy); c.fill();

  // The shelf on the left wall (things are put on it live)
  const sx = W * SPOT.shelfX, sw = W * SPOT.shelfW, sy = H * SPOT.shelfY;
  c.fillStyle = "#5A4636"; c.fillRect(sx, sy, sw, 4);
  c.fillStyle = "#3E2F23"; c.fillRect(sx + 6, sy + 4, 3, 7); c.fillRect(sx + sw - 9, sy + 4, 3, 7);

  // Furniture of each part of life (kept to the sides: the middle is the child's)
  const L = (k: number) => W * k;
  if (life === 0) {
    // Crib with bars and a mobile, toy blocks
    const cx0 = L(0.06), cw = L(0.2), ct = fy - H * 0.2;
    c.strokeStyle = "#C9A97A"; c.lineWidth = 3; c.strokeRect(cx0, ct, cw, H * 0.2 - 6);
    c.lineWidth = 2; for (let k = 1; k < 8; k++) { c.beginPath(); c.moveTo(cx0 + (cw * k) / 8, ct); c.lineTo(cx0 + (cw * k) / 8, fy - 6); c.stroke(); }
    c.strokeStyle = "rgba(255,237,215,.4)"; c.lineWidth = 1; c.beginPath(); c.moveTo(cx0 + cw / 2, ct - H * 0.1); c.lineTo(cx0 + cw / 2, ct - H * 0.06); c.stroke();
    const mc = ["#E2B26B", "#7FB2F8", "#E58FB0"];
    for (let k = 0; k < 3; k++) { c.fillStyle = mc[k]; c.beginPath(); c.arc(cx0 + cw / 2 + (k - 1) * cw * 0.2, ct - H * 0.045, Math.max(2, H * 0.012), 0, TAU); c.fill(); }
    const bc = ["#E07A5F", "#A3CF7A", "#7FB2F8", "#E2B26B"];
    for (let k = 0; k < 4; k++) { const b = Math.max(6, H * 0.03); c.fillStyle = bc[k]; c.fillRect(L(0.68) + (k % 2) * (b + 1), fy + 4 - b * (1 + (k > 1 ? 1 : 0)), b, b); }
  } else if (life === 1) {
    // Kitchen counter and cupboards on the left, a fridge, a clock, coat hooks by the door
    c.fillStyle = "#4A3A2C"; c.fillRect(L(0.02), fy - H * 0.17, L(0.3), H * 0.17);
    c.fillStyle = "#6A5442"; c.fillRect(L(0.02), fy - H * 0.18, L(0.3), H * 0.018);
    c.strokeStyle = "rgba(0,0,0,.3)"; c.lineWidth = 1; for (let k = 1; k < 3; k++) { c.beginPath(); c.moveTo(L(0.02 + 0.1 * k), fy - H * 0.16); c.lineTo(L(0.02 + 0.1 * k), fy); c.stroke(); }
    c.fillStyle = "#D8D2C6"; c.beginPath(); c.roundRect(L(0.76), fy - H * 0.36, L(0.085), H * 0.36, 4); c.fill();
    c.strokeStyle = "rgba(0,0,0,.25)"; c.beginPath(); c.moveTo(L(0.76), fy - H * 0.22); c.lineTo(L(0.845), fy - H * 0.22); c.stroke();
    c.strokeStyle = "rgba(255,237,215,.55)"; c.lineWidth = 2; const ck = { x: L(0.8), y: H * 0.13, r: Math.max(6, H * 0.03) };
    c.beginPath(); c.arc(ck.x, ck.y, ck.r, 0, TAU); c.stroke(); c.beginPath(); c.moveTo(ck.x, ck.y); c.lineTo(ck.x, ck.y - ck.r * 0.7); c.moveTo(ck.x, ck.y); c.lineTo(ck.x + ck.r * 0.5, ck.y); c.stroke();
  } else if (life === 2) {
    // Bed on the left, a desk with a lamp on the right, posters
    c.fillStyle = "#3A2E44"; c.beginPath(); c.roundRect(L(0.02), fy - H * 0.12, L(0.27), H * 0.12, 6); c.fill();
    c.fillStyle = "#6E7FA8"; c.beginPath(); c.roundRect(L(0.06), fy - H * 0.14, L(0.23), H * 0.05, 6); c.fill();
    c.fillStyle = "#E9DDC8"; c.beginPath(); c.roundRect(L(0.025), fy - H * 0.16, L(0.06), H * 0.05, 8); c.fill();
    c.fillStyle = "#4A3A2C"; c.fillRect(L(0.68), fy - H * 0.2, L(0.17), H * 0.02); c.fillRect(L(0.69), fy - H * 0.18, 4, H * 0.18); c.fillRect(L(0.84), fy - H * 0.18, 4, H * 0.18);
    const pc = ["#7A3E5A", "#2E5A6A", "#6A5A2E"];
    for (let k = 0; k < 3; k++) { c.fillStyle = pc[k]; c.fillRect(L(0.66 + k * 0.065), H * (0.12 + (k % 2) * 0.05), L(0.05), H * 0.12); }
  } else if (life === 3) {
    // Moving boxes, a small sofa, a plant
    c.fillStyle = "#8A6A44"; c.fillRect(L(0.04), fy - H * 0.1, L(0.09), H * 0.1); c.fillRect(L(0.13), fy - H * 0.08, L(0.08), H * 0.08); c.fillRect(L(0.06), fy - H * 0.18, L(0.07), H * 0.08);
    c.strokeStyle = "rgba(0,0,0,.25)"; c.lineWidth = 1; c.beginPath(); c.moveTo(L(0.04), fy - H * 0.06); c.lineTo(L(0.13), fy - H * 0.06); c.stroke();
    c.fillStyle = "#3E4A5A"; c.beginPath(); c.roundRect(L(0.68), fy - H * 0.12, L(0.18), H * 0.12, 8); c.fill();
    c.fillStyle = "#4E5A6A"; c.beginPath(); c.roundRect(L(0.68), fy - H * 0.17, L(0.18), H * 0.07, 8); c.fill();
  } else {
    // Sofa, family photos, a lamp
    c.fillStyle = "#5A3A30"; c.beginPath(); c.roundRect(L(0.03), fy - H * 0.13, L(0.27), H * 0.13, 10); c.fill();
    c.fillStyle = "#6E4638"; c.beginPath(); c.roundRect(L(0.03), fy - H * 0.19, L(0.27), H * 0.08, 10); c.fill();
    for (let k = 0; k < 3; k++) { c.fillStyle = "#5A4636"; c.fillRect(L(0.66 + k * 0.06), H * (0.16 + (k % 2) * 0.04), L(0.045), H * 0.07); c.fillStyle = "#3A5A6A"; c.fillRect(L(0.666 + k * 0.06), H * (0.17 + (k % 2) * 0.04), L(0.033), H * 0.05); }
    const lx = L(0.8), glow = c.createRadialGradient(lx, H * 0.36, 2, lx, H * 0.36, H * 0.4);
    glow.addColorStop(0, "rgba(255,200,130,.2)"); glow.addColorStop(1, "rgba(255,200,130,0)");
    c.fillStyle = glow; c.fillRect(0, 0, W, fy);
    c.strokeStyle = "#4A3A2E"; c.lineWidth = 2; c.beginPath(); c.moveTo(lx, H * 0.38); c.lineTo(lx, fy); c.stroke();
    c.fillStyle = "#E8C890"; c.beginPath(); c.moveTo(lx - 10, H * 0.38); c.lineTo(lx + 10, H * 0.38); c.lineTo(lx + 6, H * 0.3); c.lineTo(lx - 6, H * 0.3); c.fill();
  }

  // Floor with boards and a rug in the middle
  c.fillStyle = FLOOR[s.place] ?? FLOOR.town; c.fillRect(0, fy, W, H - fy);
  c.strokeStyle = "rgba(0,0,0,.18)"; c.lineWidth = 1;
  for (let y = fy + 6; y < H; y += 7) { c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
  c.fillStyle = life === 0 ? "rgba(110,127,168,.35)" : s.money === "comfy" ? "rgba(160,90,80,.45)" : "rgba(120,100,80,.35)";
  c.beginPath(); c.ellipse(W * 0.5, fy + (H - fy) * 0.48, Math.min(W * 0.2, 170), (H - fy) * 0.36, 0, 0, TAU); c.fill();
  if (s.money === "comfy" && W > 420 && life !== 3) {
    const qx = W * 0.36; c.fillStyle = "#6A4A32"; c.fillRect(qx - 8, fy - 16, 16, 16);
    c.fillStyle = "#3E6A40"; for (let k = 0; k < 5; k++) { c.beginPath(); c.ellipse(qx + (k - 2) * 4, fy - 24 - (k % 2) * 6, 4, 9, (k - 2) * 0.4, 0, TAU); c.fill(); }
  }
  if (s.busy) {
    const cols = ["#E07A5F", "#7FB2F8", "#E2B26B", "#A3CF7A"];
    for (let k = 0; k < 4; k++) { c.fillStyle = cols[k % 4]; c.fillRect(W * (0.7 + hash(k) * 0.08), fy + 4 + hash(k * 3) * 6, 6, 6); }
  }
  c.strokeStyle = "rgba(0,0,0,.35)"; c.beginPath(); c.moveTo(0, fy); c.lineTo(W, fy); c.stroke();
  backs.set(key, cv);
  return cv;
}
