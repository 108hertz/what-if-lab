import { TAU, clamp, lerp, mix } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import type { Params } from "@/lib/sim/types";
import { CHANGES, COLOR, SHOW, TRACK, TRAITS, WORD, stepWord } from "../data";
import { during, endOf, happened, mean, quant, values, type Mod, type W } from "../model";
import { drawCrowd } from "./crowd";
import { clock, easeOut, realNow, reducedMotion, spring } from "./motion";
import { COOL, HAIR, SKIN, WARM, cloud, drawDog, drawGlyph, drawPerson, hash, hexMix, parentLook, strHash, type Hold, type Look } from "./people";
import { CHANGE_THING, drawThing, type Thing } from "./props";
import { FLOOR_Y, LIFE_WORD, SPOT, STAND_Y, lifeOf, room, type Life } from "./rooms";

/**
 * The child stage (change 0019). "One child" (default): the typical child of the 120 is the hero, big in the middle of a
 * room that follows their part of life (nursery → own home, cross-fading). Parents stand behind, smaller, and step out of
 * the frame in the late teens. The room shows the traits: books on the shelf (curious), tidy or messy floor (organised),
 * friends in the doorway (outgoing), a hand held out (kind), the face and a worry cloud (calm). Changes bring things into
 * the room and put them on the shelf when they stop. Beside the child, five meters read the traits in words, with a hollow
 * dot for the life without your changes. "All 120 kids" shows the crowd (crowd.ts). Draw-only clock; reduced motion freezes
 * it and makes every ease instant.
 */

export type StageView = "one" | "all";
let view: StageView = "one";
export const stageView = () => view;
export function setStageView(v: StageView) { view = v; }

/* ───────────── renderer memory ───────────── */

let lastNow = 0, shownAge = 1;
let lastOn = -1, lastAll = -1, lastT = 0;
interface Cap { txt: string; traits: number[]; t0: number; soft: boolean }
const caps: Cap[] = [];
/** When each trait was last touched by a change (for the glow). */
const pulse = new Float64Array(5).fill(-10);
/** Eased meter dots: [0..4] with changes, [5..9] without. */
const md = new Float64Array(10), mdv = new Float64Array(10);
let meterEased = false;
/** Room cross-fade. */
let curLife: Life | -1 = -1, prevLife: Life = 0, lifeT0 = -10;

const grow = (a: number) => (a < 18 ? lerp(0.24, 0.96, Math.pow(clamp((a - 1) / 17, 0, 1), 0.85)) : 0.97);
const smooth = (k: number) => { const x = clamp(k, 0, 1); return x * x * (3 - 2 * x); };

/** Is a change's thing in the room now (going on, or a one-off in the last year and a half)? Or finished (on the shelf)? */
function thingState(m: Mod, t: number): "room" | "shelf" | null {
  if (!m.on || t < m.age) return null;
  const end = endOf(m) > m.age ? endOf(m) : m.age + 1.5;
  return t < end ? "room" : "shelf";
}

/* ───────────── captions ───────────── */

function updateCaptions(w: W) {
  const on = happened(w), all = w.mods.length;
  if (lastOn < 0 || w.t < lastT - 0.5 || on.length < lastOn || all < lastAll) { lastOn = on.length; lastAll = all; caps.length = 0; }
  else {
    if (on.length > lastOn) for (const m of on.slice(lastOn)) caps.push({ txt: `Age ${Math.floor(m.age)} — ${CHANGES[m.id].cap}`, traits: TRAITS.map((k, i) => (m.d[k] ? i : -1)).filter((i) => i >= 0), t0: -1, soft: false });
    if (all - on.length > lastAll - lastOn) for (const m of w.mods.filter((m) => !m.on).slice(-(all - on.length - (lastAll - lastOn)))) caps.push({ txt: `Planned for age ${Math.floor(m.age)} — ${CHANGES[m.id].cap}`, traits: [], t0: -1, soft: true });
    lastOn = on.length; lastAll = all;
    if (caps.length > 3) caps.splice(1, caps.length - 3);
  }
  lastT = w.t;
}

/** The change card: slides in, holds, fades; the traits it touches glow once. */
function drawCaption(c: CanvasRenderingContext2D, cx: number, maxW: number, y0: number, now: number, reduced: boolean) {
  const cap = caps[0];
  if (!cap) return;
  if (cap.t0 < 0) { cap.t0 = now; for (const i of cap.traits) pulse[i] = now; }
  const e = now - cap.t0, life = caps.length > 1 ? 1.8 : 3.0;
  if (e > life) { caps.shift(); return; }
  const k = reduced ? 1 : easeOut(e / 0.25), aout = clamp((life - e) / 0.45, 0, 1);
  c.globalAlpha = Math.min(k, aout);
  c.font = "500 14px " + FONT.body;
  const tw = Math.min(c.measureText(cap.txt).width, maxW - 40), y = y0 + (reduced ? 0 : (1 - k) * -8);
  c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(cx - tw / 2 - 14, y, tw + 28, 30, 15); c.fill();
  c.strokeStyle = cap.soft ? STAGE.ink2 : STAGE.alt; c.lineWidth = 1; c.stroke();
  c.fillStyle = STAGE.ink; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText(cap.txt, cx, y + 15.5, tw);
  c.globalAlpha = 1;
}

/* ───────────── meters ───────────── */

const deg = (d: number) => (Math.abs(d) < 4 ? "a bit " : Math.abs(d) < 8 ? "" : "much ");

/** Five meters in a column: glyph + word, a less ↔ more track, the typical kid's dot (and a hollow one without changes). */
function drawMeters(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, v: number[][], hasBase: boolean, now: number, reduced: boolean) {
  c.fillStyle = STAGE.void; c.fillRect(x, 0, w + 999, y + h + 999);
  c.strokeStyle = STAGE.line; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x + 0.5, 0); c.lineTo(x + 0.5, y + h + 999); c.stroke(); c.setLineDash([]);
  const px = x + 16, pw = w - 30;
  c.font = "500 12px " + FONT.body; c.textBaseline = "alphabetic"; c.textAlign = "left";
  c.fillStyle = STAGE.ink2; c.fillText("The typical kid of the 120", px, y + 14, pw - 70);
  const legendH = hasBase ? 22 : 0, top = y + 26, rh = Math.min(64, (h - 26 - legendH) / 5);
  SHOW.forEach((s, i) => {
    const ry = top + i * rh;
    const pq = (now - pulse[i]) / 0.9;
    if (!reduced && pq >= 0 && pq < 1) { c.fillStyle = `rgba(255,200,87,${(0.1 * (1 - pq)).toFixed(3)})`; c.fillRect(x + 4, ry - 2, w - 8, rh - 4); }
    drawGlyph(c, s, px + 8, ry + 10, 16, COLOR[s]);
    c.font = "500 12px " + FONT.body; c.fillStyle = STAGE.ink; c.textAlign = "left"; c.fillText(WORD[s], px + 22, ry + 14);
    const now1 = md[i], d = hasBase ? md[i] - md[5 + i] : 0;
    const right = Math.abs(d) >= 1.5 ? `${deg(d)}${d > 0 ? "more" : "less"}` : stepWord(s, now1);
    c.textAlign = "right"; c.fillStyle = Math.abs(d) >= 1.5 ? STAGE.alt : STAGE.ink2;
    c.fillText(right, px + pw, ry + 14, pw * 0.5);
    // Track: the middle half of the 120 kids as a soft band, the ends in words
    const ty = ry + 28, X = (val: number) => px + (pw * clamp(val, 0, 100)) / 100;
    const lo = quant(v[i], 0.25), hi = quant(v[i], 0.75);
    c.fillStyle = "rgba(255,237,215,.07)"; c.beginPath(); c.roundRect(X(lo), ty - 5, Math.max(4, X(hi) - X(lo)), 10, 5); c.fill();
    c.strokeStyle = STAGE.line; c.lineWidth = 2; c.beginPath(); c.moveTo(px, ty); c.lineTo(px + pw, ty); c.stroke(); c.lineWidth = 1;
    if (rh >= 48) {
      c.font = "500 10px " + FONT.body; c.fillStyle = STAGE.ink2;
      c.textAlign = "left"; c.fillText(TRACK[s][0], px, ty + 16, pw / 2 - 4);
      c.textAlign = "right"; c.fillText(TRACK[s][1], px + pw, ty + 16, pw / 2 - 4);
    }
    if (hasBase) {
      const bx = X(md[5 + i]);
      if (Math.abs(d) >= 1.5) { c.strokeStyle = STAGE.alt; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(bx, ty); c.lineTo(X(now1), ty); c.stroke(); c.globalAlpha = 1; }
      c.strokeStyle = STAGE.base; c.lineWidth = 1.5; c.beginPath(); c.arc(bx, ty, 5, 0, TAU); c.stroke(); c.lineWidth = 1;
    }
    c.fillStyle = hasBase ? STAGE.alt : STAGE.ink; c.beginPath(); c.arc(X(now1), ty, 5.5, 0, TAU); c.fill();
  });
  if (hasBase) {
    const ly = top + 5 * rh + 6;
    c.font = "500 10px " + FONT.body; c.textAlign = "left";
    c.fillStyle = STAGE.alt; c.beginPath(); c.arc(px + 4, ly - 3, 4, 0, TAU); c.fill();
    c.fillStyle = STAGE.ink2; c.fillText("with your changes", px + 12, ly);
    const off = px + 12 + c.measureText("with your changes").width + 14;
    c.strokeStyle = STAGE.base; c.lineWidth = 1.5; c.beginPath(); c.arc(off + 4, ly - 3, 4, 0, TAU); c.stroke(); c.lineWidth = 1;
    c.fillStyle = STAGE.ink2; c.fillText("without", off + 12, ly);
  }
}

/** Small stages: five mini meters in a row across the top. */
function drawMiniMeters(c: CanvasRenderingContext2D, W: number, y: number, hasBase: boolean) {
  const cw = (W - 16) / 5;
  c.fillStyle = STAGE.scrim; c.beginPath(); c.roundRect(8, y, W - 16, 30, 15); c.fill();
  SHOW.forEach((s, i) => {
    const x0 = 8 + i * cw, gx = x0 + 14, tx0 = x0 + 26, tx1 = x0 + cw - 8, ty = y + 15;
    drawGlyph(c, s, gx, ty, 14, COLOR[s]);
    if (tx1 - tx0 < 12) return;
    c.strokeStyle = STAGE.line; c.lineWidth = 2; c.beginPath(); c.moveTo(tx0, ty); c.lineTo(tx1, ty); c.stroke(); c.lineWidth = 1;
    const X = (val: number) => tx0 + ((tx1 - tx0) * clamp(val, 0, 100)) / 100;
    if (hasBase) { c.strokeStyle = STAGE.base; c.lineWidth = 1.2; c.beginPath(); c.arc(X(md[5 + i]), ty, 3.5, 0, TAU); c.stroke(); c.lineWidth = 1; }
    c.fillStyle = hasBase ? STAGE.alt : STAGE.ink; c.beginPath(); c.arc(X(md[i]), ty, 4, 0, TAU); c.fill();
  });
}

/* ───────────── the stage ───────────── */

export function drawChild(c: CanvasRenderingContext2D, W: number, H: number, w: W, base: W | null, p: Params) {
  if (W < 60 || H < 140) { c.fillStyle = STAGE.void; c.fillRect(0, 0, W, H); return; }
  const reduced = reducedMotion(), t = clock(), now = realNow();
  const dt = clamp(now - lastNow, 0, 0.05); lastNow = now;
  const dpr = (typeof window !== "undefined" && window.devicePixelRatio) || 1;
  const v = values(w), avg = v.map(mean), bavg = base ? values(base).map(mean) : null;
  updateCaptions(w);

  // Meter dots ease toward the averages (snap on the first frame and with reduced motion)
  for (let i = 0; i < 5; i++) {
    const b = bavg ? bavg[i] : avg[i];
    if (!meterEased || reduced) { md[i] = avg[i]; md[5 + i] = b; mdv[i] = mdv[5 + i] = 0; }
    else { spring(md, mdv, i, avg[i], dt); spring(md, mdv, 5 + i, b, dt); }
  }
  meterEased = true;

  if (view === "all") {
    drawCrowd(c, W, H, 40, w, base, v, avg, bavg, now, dt, reduced, pulse);
    drawCaption(c, W / 2, W, 44, now, reduced);
    c.textAlign = "left"; c.textBaseline = "alphabetic";
    return;
  }

  const wide = W >= 560 && H >= 260;
  const panelW = wide ? clamp(W * 0.3, 210, 290) : 0, SW = W - panelW;

  // ── The room for this part of life, cross-fading when it changes ──
  if (reduced || Math.abs(w.t - shownAge) > 25) shownAge = w.t; else shownAge += (w.t - shownAge) * (1 - Math.exp(-dt * 6));
  const A = shownAge, life = lifeOf(A);
  if (curLife !== life) { if (curLife !== -1) { prevLife = curLife; lifeT0 = now; } curLife = life; }
  const place = during(w, "move") || during(w, "travel") ? "abroad" : during(w, "countryside") ? "country" : String(p.place ?? "town");
  const set = { place, money: during(w, "money", 4) ? "tight" : String(p.money ?? "ok"), busy: p.home === "busy" };
  const fade = reduced ? 1 : clamp((now - lifeT0) / 0.6, 0, 1);
  if (fade < 1) c.drawImage(room(SW, H, prevLife, set, dpr) as CanvasImageSource, 0, 0, SW, H);
  c.globalAlpha = fade; c.drawImage(room(SW, H, life, set, dpr) as CanvasImageSource, 0, 0, SW, H); c.globalAlpha = 1;

  const fy = H * STAND_Y, heroMax = Math.min(H * 0.8, SW * 0.7), ch = heroMax * grow(A), cx = SW * 0.5;
  const [cO, cC, cE, cA, cCalm] = avg;
  const la = parentLook(p, "a"), lb = parentLook(p, "b");

  // ── Parents behind, smaller; they step out of the frame between 14 and 18 ──
  const pH = heroMax * 0.97 * 0.66, fyP = fy - H * 0.06, leave = reduced ? (A >= 16 ? 1 : 0) : smooth((A - 14) / 4);
  const apart = during(w, "divorce") || p.shape === "twohomes", ill = during(w, "illness", 1);
  if (leave < 1) {
    c.globalAlpha = 0.9 * (1 - leave); // behind the child: a touch quieter
    if (ill) { c.fillStyle = "#5A2E2E"; c.beginPath(); c.roundRect(SW * 0.18 - pH * 0.2, fyP - pH * 0.5, pH * 0.55, pH * 0.5, 8); c.fill(); }
    drawPerson(c, SW * (0.2 - 0.25 * leave), fyP, pH * (ill ? 0.92 : 1), la, { t, sit: ill, blanket: ill });
    if (p.shape !== "one") drawPerson(c, apart ? SW * (SPOT.doorX + SPOT.doorW / 2) : SW * (0.8 + 0.25 * leave), apart ? fyP - H * 0.03 : fyP, pH * (apart ? 0.86 : 0.97), lb, { t });
    if ((during(w, "grandparent") || p.shape === "big") && SW > 360) {
      drawPerson(c, SW * (0.33 - 0.3 * leave), fyP, pH * 0.9, { ...la, age: 72, shirt: "#8A7A6A", seed: la.seed + 11, out: 55, calm: 70, style: 0 }, { t });
    }
    c.globalAlpha = 1;
  }
  if (during(w, "longhours") && leave < 1) drawThing(c, "briefcase", SW * (SPOT.doorX - 0.03), H * FLOOR_Y + 4, Math.min(22, H * 0.06));

  // ── Shelf: books (curious), tidy or tilted (organised), and things from changes that are over ──
  const sx = SW * SPOT.shelfX, sw = SW * SPOT.shelfW, sy = H * SPOT.shelfY, is = Math.min(22, H * 0.06);
  const nBooks = A < 3 ? 1 : 1 + Math.round(clamp((cO - 30) / 45, 0, 1) * 6), messy = cC < 45;
  const bookCols = ["#C8553D", "#5B8BD0", "#A3CF7A", "#E2B26B", "#E58FB0", "#7FB2F8", "#C9A15A"];
  let bx = sx + 6;
  for (let k = 0; k < nBooks && bx < sx + sw * 0.55; k++) {
    const bh = is * (0.8 + hash(k * 7) * 0.3), tilt = messy ? (hash(k * 13) - 0.5) * 0.7 : 0;
    c.save(); c.translate(bx + is * 0.12, sy); c.rotate(tilt); c.fillStyle = bookCols[k % bookCols.length]; c.fillRect(-is * 0.12, -bh, is * 0.24, bh); c.restore();
    bx += is * 0.28;
  }
  const shelf: Thing[] = [], inRoom: Thing[] = [];
  const seen = new Set<string>();
  for (const m of w.mods) {
    const th = CHANGE_THING[m.id];
    if (!th || seen.has(m.id + th)) continue;
    const st = thingState(m, w.t);
    if (!st) continue;
    seen.add(m.id + th);
    (st === "shelf" || th === "trophy" || th === "apple" || th === "globe" ? shelf : inRoom).push(th);
  }
  bx += is * 0.5;
  for (const th of shelf) { if (bx > sx + sw - is * 0.4) break; drawThing(c, th, bx, sy, is, t); bx += is * 0.95; }
  if (cO >= 60 && A >= 7 && SW > 420) {
    // A telescope by the window for very curious kids
    const tx = SW * 0.5 + Math.min(SW * 0.13, 110) + 12, ty = H * FLOOR_Y;
    c.strokeStyle = "#8A7A6A"; c.lineWidth = 2; c.beginPath(); c.moveTo(tx, ty); c.lineTo(tx + 8, ty - 26); c.moveTo(tx + 16, ty); c.lineTo(tx + 8, ty - 26); c.stroke();
    c.fillStyle = "#B8A88A"; c.save(); c.translate(tx + 8, ty - 30); c.rotate(-0.6); c.fillRect(-14, -3, 28, 6); c.restore();
  }

  // ── Mess on the floor for less organised kids ──
  const nMess = A < 2 ? 0 : Math.round(clamp((52 - cC) / 30, 0, 1) * 7), floorY = H * FLOOR_Y;
  const messCols = ["#E07A5F", "#7FB2F8", "#E2B26B", "#A3CF7A", "#E9DDC8"];
  for (let k = 0; k < nMess; k++) {
    const mx = SW * (0.18 + hash(k * 3.3) * 0.64), my = floorY + 6 + hash(k * 5.1) * (H - floorY - 14);
    if (Math.abs(mx - cx) < ch * 0.3) continue;
    c.save(); c.translate(mx, my); c.rotate((hash(k) - 0.5) * 1.2); c.fillStyle = messCols[k % messCols.length]; c.fillRect(-5, -2.5, 10, 5); c.restore();
  }

  // ── Friends in the doorway for outgoing kids ──
  const kidLook: Look = {
    skin: hexMix(la.skin, lb.skin), hair: strHash(String(p.family) + "k") % 2 ? la.hair : lb.hair,
    shirt: A < 18 ? mix(COOL, WARM, cE / 100) : mix("#4A5A7A", "#8A5A4A", cE / 100), pants: A < 13 ? "#3A4A6A" : "#2A3048",
    age: A, calm: cCalm, out: cE, style: strHash(String(p.family) + "s") % 4, seed: 5,
  };
  if (cE >= 58 && A >= 5 && A < 30 && SW > 360) {
    const dxm = SW * (SPOT.doorX + SPOT.doorW / 2), fh = ch * 0.82;
    const fam = strHash(String(p.family));
    const friend = (k: number): Look => ({ ...kidLook, skin: SKIN[(fam + 2 + k * 3) % SKIN.length], hair: HAIR[(fam + 3 + k) % HAIR.length], shirt: k ? "#9A7AC8" : "#6FA7A0", style: (2 + k) % 4, seed: 40 + k, calm: 70, out: 75 });
    if (cE >= 66) drawPerson(c, dxm + SW * 0.022, fy - H * 0.035, fh * 0.94, friend(1), { t: t + 1 });
    const wv = reduced ? 1 : Math.max(0, Math.sin(t * 1.3));
    drawPerson(c, dxm - SW * 0.008, fy - H * 0.03, fh, friend(0), { t, wave: wv });
  }

  // ── Brothers and sisters, a best friend, your own kid later on ──
  const sibs: number[] = [];
  const sib = String(p.sib);
  if (sib === "older" || sib === "2") sibs.push(A + 3);
  if (sib === "1" || sib === "2") sibs.push(Math.max(0.6, A - 3));
  for (const m of w.mods) if (m.id === "sibling" && m.on && w.t >= m.age && w.t < m.stop) sibs.push(Math.max(0.3, A - m.age));
  const right: { look: Look; h: number }[] = [];
  sibs.slice(0, 3).forEach((sa, k) => {
    right.push({ look: { ...kidLook, age: sa, shirt: mix(WARM, "#E2B26B", 0.4 + k * 0.2), style: (kidLook.style + k + 1) % 4, seed: 20 + k, calm: 65, out: 55 }, h: heroMax * grow(sa) * (sa < 1 ? 0.8 : 1) });
  });
  if (during(w, "bestfriend")) right.push({ look: { ...kidLook, skin: SKIN[(strHash(String(p.family)) + 4) % SKIN.length], hair: HAIR[(strHash(String(p.family)) + 1) % HAIR.length], shirt: "#C88A5A", age: A, style: 2, seed: 47, calm: 70, out: 70 }, h: ch * 0.98 });
  let rx = cx + Math.max(ch * 0.3, 16);
  const spots = right.map((r) => { const x = rx + r.h * 0.16; rx = x + r.h * 0.2 + 6; return x; });
  right.forEach((r, k) => drawPerson(c, spots[k], fy, r.h, r.look, { t }));
  if (A >= 31) {
    const ka = Math.min(17, A - 30);
    drawPerson(c, cx - Math.max(ch * 0.42, 22), fy, heroMax * grow(ka), { ...kidLook, age: ka, shirt: "#7FB2F8", style: (kidLook.style + 2) % 4, seed: 61, calm: 70, out: 60 }, { t: t + 2 });
  }

  // ── Things from changes going on now ──
  const hold: Hold = inRoom.includes("violin") ? "violin" : inRoom.includes("books") ? "book" : inRoom.includes("tablet") ? "tablet" : cO >= 58 && A > 3 ? "magnifier" : null;
  const floorThings = inRoom.filter((th) => !["violin", "books", "tablet", "moon", "mask", "star"].includes(th));
  let lx = cx - Math.max(ch * 0.36, 18) - (A >= 31 ? ch * 0.3 : 0);
  for (const th of floorThings) { const s = Math.min(24, H * 0.07); drawThing(c, th, lx - s * 0.4, fy, s, t); lx -= s * 1.1; }
  if (inRoom.includes("moon")) drawThing(c, "moon", SW * 0.32, H * 0.3, Math.min(30, H * 0.08));
  if (inRoom.includes("mask")) drawThing(c, "mask", SW * 0.7, H * 0.28, Math.min(26, H * 0.07));
  if (during(w, "pet")) drawDog(c, lx - 10, fy, Math.min(26, heroMax * 0.2), reduced ? 0 : t);

  // ── The hero ──
  const reach = cA >= 58 && right.length ? 1 : 0;
  const wavePhase = (t + 1.3) % 5.2, waving = !reduced && cE >= 55 && wavePhase < 1.6 ? Math.sin((wavePhase / 1.6) * Math.PI) : cE >= 62 && reduced ? 1 : 0;
  const me = drawPerson(c, cx, fy, ch, kidLook, {
    t, hold: reach ? null : hold, wave: reach ? 0 : waving, reach, bag: cC >= 55 && A >= 5 && A < 19, badge: inRoom.includes("star"),
  });
  if (cCalm < 40 || during(w, "bullied", 1) || during(w, "fallout", 0.5) || during(w, "exam", 0.4)) {
    const a = cCalm < 40 ? clamp((40 - cCalm) / 20, 0.25, 0.5) : 0.4;
    cloud(c, cx + (reduced ? 0 : Math.sin(t * 0.8) * 3), me.top - 14, Math.min(16, ch * 0.16), a);
  }

  // ── Words on the stage: part of life, change cards, meters ──
  c.font = "500 12px " + FONT.body; c.fillStyle = STAGE.ink2; c.textAlign = "right"; c.textBaseline = "alphabetic";
  if (SW > 300) c.fillText(LIFE_WORD[life], SW - 12, H - 10);
  if (wide) drawMeters(c, SW, 8, panelW, H - 16, v, !!base, now, reduced);
  else drawMiniMeters(c, W, 38, !!base);
  drawCaption(c, SW / 2, SW, wide ? 40 : 76, now, reduced);
  c.textAlign = "left"; c.textBaseline = "alphabetic";
}
