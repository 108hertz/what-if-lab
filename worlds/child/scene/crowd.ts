import { TAU, clamp } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import { HIGH, LOW, SHOW, kidName } from "../data";
import { kidShort, say, trackWord, traitWord } from "../words";
import { of100, type W } from "../model";
import { realNow } from "./motion";
import { pageT } from "@/lib/i18n/page";

/**
 * "All 120 kids" (change 0019): for the picked trait, the 120 possible kids as little faces in three piles — less, in
 * between, more — with the count of 100 above each. Without changes the piles are the no-change world; with changes the
 * no-change piles stay behind as faint rings, so a pile that grew or shrank shows at a glance. When a change or the trait
 * moves a kid to another pile, its face walks there (spring, staggered, ≤ 0.7 s). Hover a face for its name; tap to meet it.
 */

const NK = 120;
const px = new Float64Array(NK), py = new Float64Array(NK), vx = new Float64Array(NK), vy = new Float64Array(NK);
const tx = new Float64Array(NK), ty = new Float64Array(NK), go = new Float64Array(NK);
let eased = false, lastKey = "";
/** Which pile and slot each kid has; which kid sits in each slot of each pile (−1 = free). Kids keep their slot while they
 *  stay in a pile, so only the ones that change pile walk; gaps are filled one face at a time. */
const pileOf = new Int8Array(NK).fill(-1), slotOf = new Int16Array(NK).fill(-1), seat = new Int16Array(3 * NK).fill(-1);
const lastFill = new Float64Array(3);
const fx = new Float32Array(NK * 2);
let faceR = 4, nFaces = 0;
let hover: { x: number; y: number; at: number } | null = null;
let selTrait = 0;

/** Pointer over the stage. */
export function pointAt(x: number, y: number) { hover = { x, y, at: realNow() }; }
/** The kid under a point (or −1). */
export function kidAt(x: number, y: number): number {
  let best = -1, bd = (faceR + 4) ** 2;
  for (let j = 0; j < nFaces; j++) { const d = (fx[j * 2] - x) ** 2 + (fx[j * 2 + 1] - y) ** 2; if (d < bd) { bd = d; best = j; } }
  return best;
}
/** A tap: the kid under it, if any (the console then shows that kid in "One child"). */
export function tapAt(x: number, y: number): number { pointAt(x, y); return kidAt(x, y); }
export const stageTrait = () => selTrait;
export function setStageTrait(i: number) { selTrait = ((i % 5) + 5) % 5; }

const pile = (v: number) => (v <= LOW ? 0 : v >= HIGH ? 2 : 1);

/** Pile geometry for a stage of W × H below `top`, leaving `bottom` px for the on-stage switches. */
function layout(W: number, H: number, top: number, bottom: number, need: number) {
  const gap = W < 520 ? 10 : 20, m = W < 520 ? 8 : 16, pw = (W - 2 * m - 2 * gap) / 3;
  const y0 = top + (H - top < 300 ? 50 : 66), y1 = H - bottom, ph = Math.max(40, y1 - y0);
  // Faces as big as possible while the biggest pile still fits (`need`, rounded up so sizes rarely change)
  let d = Math.sqrt((pw * ph) / (need * 1.07));
  while (d > 6 && Math.floor(pw / d) * Math.floor(ph / d) < need) d -= 0.5;
  d = clamp(d, 6, 26);
  const cols = Math.max(1, Math.floor(pw / d));
  return { m, gap, pw, y0, y1, d, cols, x0: (b: number) => m + b * (pw + gap) };
}

/** Draw the piles. `pulse[i]` is when trait i last changed (a soft glow on the counts). */
export function drawCrowd(c: CanvasRenderingContext2D, W: number, H: number, top: number, base: W | null, v: number[][], bv: number[][] | null, now: number, dt: number, reduced: boolean, pulse: Float64Array) {
  c.fillStyle = STAGE.void; c.fillRect(0, 0, W, H);
  const i = selTrait, s = SHOW[i], xs = v[i], n = Math.min(NK, xs.length);
  const sizes = [0, 0, 0];
  for (let j = 0; j < n; j++) sizes[pile(xs[j])]++;
  const need = Math.min(NK, Math.max(40, Math.ceil((Math.max(...sizes) + 4) / 20) * 20));
  const L = layout(W, H, top, W < 640 ? 112 : 64, need); // phones: the trait switch sits on its own row
  faceR = Math.max(2.4, L.d / 2 - 1.2);

  // Each kid's place: its pile, then its number in the pile (stable, so faces only walk when a kid changes pile), rows from the bottom
  const slot = (b: number, k: number) => {
    const row = Math.floor(k / L.cols), col = k % L.cols, inRow = Math.min(L.cols, NK);
    const left = L.x0(b) + (L.pw - inRow * L.d) / 2;
    return [left + L.d / 2 + col * L.d, L.y1 - L.d / 2 - row * L.d] as const;
  };
  const key = `${i}|${W}|${H}|${n}|${need}`, fresh = key !== lastKey || !eased;
  const place = (j: number, b: number, k: number, delay: number) => {
    pileOf[j] = b; slotOf[j] = k; seat[b * NK + k] = j;
    const [x, y] = slot(b, k);
    tx[j] = x; ty[j] = y; go[j] = now + delay;
    if (!eased || reduced) { px[j] = x; py[j] = y; vx[j] = vy[j] = 0; }
  };
  const freeSlot = (b: number) => { for (let k = 0; k < NK; k++) if (seat[b * NK + k] < 0) return k; return NK - 1; };
  if (fresh) {
    // A new trait or size: everyone finds a place again, walking there one after another
    seat.fill(-1);
    const cnt = [0, 0, 0];
    for (let j = 0; j < n; j++) { const b = pile(xs[j]); place(j, b, cnt[b]++, Math.min(0.35, j * 0.003)); }
  } else {
    let moved = 0;
    for (let j = 0; j < n; j++) {
      const b = pile(xs[j]);
      if (b === pileOf[j]) continue;
      seat[pileOf[j] * NK + slotOf[j]] = -1;
      place(j, b, freeSlot(b), Math.min(0.35, moved++ * 0.02));
    }
    // Fill gaps: the last face of a pile steps into its lowest free slot, one at a time
    for (let b = 0; b < 3; b++) {
      if (now - lastFill[b] < 0.12) continue;
      const hole = freeSlot(b);
      let last = -1;
      for (let k = NK - 1; k > hole; k--) if (seat[b * NK + k] >= 0) { last = k; break; }
      if (last > hole) { const j = seat[b * NK + last]; seat[b * NK + last] = -1; place(j, b, hole, 0); lastFill[b] = now; }
    }
  }
  if (reduced) for (let j = 0; j < n; j++) { px[j] = tx[j]; py[j] = ty[j]; vx[j] = vy[j] = 0; }
  const count = [0, 0, 0];
  for (let j = 0; j < n; j++) count[pileOf[j]]++;
  eased = true; lastKey = key;

  // Without changes: the no-change piles as faint rings, and the counts they had
  const bcount = [0, 0, 0];
  if (bv) for (const x of bv[i].slice(0, n)) bcount[pile(x)]++;
  if (bv) {
    c.strokeStyle = STAGE.base; c.globalAlpha = 0.35; c.lineWidth = 1; c.beginPath();
    for (let b = 0; b < 3; b++) for (let k = 0; k < bcount[b]; k++) { const [x, y] = slot(b, k); c.moveTo(x + faceR, y); c.arc(x, y, faceR, 0, TAU); }
    c.stroke(); c.globalAlpha = 1;
  }

  // Labels: the word for each pile, the count of 100 (and what it was)
  const glow = (now - pulse[i]) / 0.9;
  const S = say(), words = [trackWord(s, 0), S("stage.between"), trackWord(s, 1)];
  c.textAlign = "center"; c.textBaseline = "alphabetic";
  for (let b = 0; b < 3; b++) {
    const cx = L.x0(b) + L.pw / 2;
    c.font = "500 12px " + FONT.body; c.fillStyle = STAGE.ink2; c.fillText(words[b], cx, top + 14, L.pw);
    const n100 = of100(count[b]), big = H - top >= 300 ? 24 : 18;
    c.font = `500 ${big}px ${FONT.body}`;
    c.fillStyle = !reduced && glow >= 0 && glow < 1 ? STAGE.alt : STAGE.ink;
    const ty0 = top + 14 + big + 6;
    // "{n} of 100" with the number big: the words before and after it are said around a marker
    const num = pageT().num(n100), [pre, post = ""] = S("stage.of100", { n: "\uE000" }).split("\uE000");
    const numW = c.measureText(num).width;
    c.font = "500 12px " + FONT.body; const preW = c.measureText(pre).width, postW = c.measureText(post).width;
    const x0 = cx - (preW + numW + postW) / 2, numC = c.fillStyle;
    c.textAlign = "left"; c.fillStyle = STAGE.ink2; c.fillText(pre, x0, ty0);
    c.font = `500 ${big}px ${FONT.body}`; c.fillStyle = numC; c.fillText(num, x0 + preW, ty0);
    c.font = "500 12px " + FONT.body; c.fillStyle = STAGE.ink2; c.fillText(post, x0 + preW + numW, ty0);
    if (bv && Math.abs(of100(bcount[b]) - n100) >= 1) {
      c.textAlign = "center"; c.fillStyle = STAGE.base; c.fillText(S("stage.was", { n: of100(bcount[b]) }), cx, ty0 + 16, L.pw);
    }
    c.textAlign = "center";
  }

  // Faces walk to their places (with a little bob while they walk)
  const col = base ? STAGE.alt : STAGE.base;
  nFaces = n;
  for (let j = 0; j < n; j++) {
    if (!reduced && now >= go[j]) {
      const w0 = 11;
      vx[j] += (w0 * w0 * (tx[j] - px[j]) - 2 * w0 * vx[j]) * dt; vy[j] += (w0 * w0 * (ty[j] - py[j]) - 2 * w0 * vy[j]) * dt;
      px[j] += vx[j] * dt; py[j] += vy[j] * dt;
    }
    const sp = Math.hypot(vx[j], vy[j]), bob = reduced ? 0 : -Math.abs(Math.sin(now * 14 + j)) * Math.min(faceR * 0.6, sp * 0.012);
    fx[j * 2] = px[j]; fx[j * 2 + 1] = py[j] + bob;
  }
  c.fillStyle = col; c.globalAlpha = 0.9; c.beginPath();
  for (let j = 0; j < n; j++) { const x = fx[j * 2], y = fx[j * 2 + 1]; c.moveTo(x + faceR, y); c.arc(x, y, faceR, 0, TAU); }
  c.fill(); c.globalAlpha = 1;
  if (faceR >= 3.4) {
    c.fillStyle = STAGE.void; c.beginPath();
    for (let j = 0; j < n; j++) {
      const x = fx[j * 2], y = fx[j * 2 + 1], e = faceR * 0.36, er = Math.max(0.6, faceR * 0.16);
      c.moveTo(x - e + er, y - faceR * 0.12); c.arc(x - e, y - faceR * 0.12, er, 0, TAU);
      c.moveTo(x + e + er, y - faceR * 0.12); c.arc(x + e, y - faceR * 0.12, er, 0, TAU);
    }
    c.fill();
  }
  if (faceR >= 6) {
    // A smile that follows each kid's calm
    c.strokeStyle = STAGE.void; c.lineWidth = Math.max(1, faceR * 0.12); c.beginPath();
    for (let j = 0; j < n; j++) {
      const x = fx[j * 2], y = fx[j * 2 + 1] + faceR * 0.38, k = clamp((v[4][j] - 40) / 50, -0.6, 1) * faceR * 0.28;
      c.moveTo(x - faceR * 0.28, y); c.quadraticCurveTo(x, y + k, x + faceR * 0.28, y);
    }
    c.stroke();
  }

  // What a face is, once, small, between the stage chips and the pile words
  if (W >= 420) {
    c.textAlign = "center"; c.font = "500 10px " + FONT.body; c.fillStyle = STAGE.ink2;
    c.fillText(say()("stage.crowdHint", { trait: traitWord(s) }), W / 2, top - 4, W - 260);
  }

  // Hover: name and a few words; tap to meet
  if (hover && now - hover.at < 2.5) {
    const j = kidAt(hover.x, hover.y);
    if (j >= 0) {
      const x = fx[j * 2], y = fx[j * 2 + 1];
      c.strokeStyle = STAGE.ink; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, faceR + 2.5, 0, TAU); c.stroke();
      const txt = say()("stage.hover", { name: kidName(j), short: kidShort(v.map((xx) => xx[j])) });
      c.font = "500 12px " + FONT.body;
      const tw = Math.min(c.measureText(txt).width, W - 32), bx = clamp(x - tw / 2 - 8, 8, W - tw - 24), by = Math.max(top, y - faceR - 32);
      c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(bx, by, tw + 16, 24, 12); c.fill();
      c.fillStyle = STAGE.ink; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText(txt, bx + 8, by + 12.5, tw);
    }
  }
  c.textAlign = "left"; c.textBaseline = "alphabetic";
}
