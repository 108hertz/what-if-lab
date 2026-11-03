import { TAU } from "../../sim/core";
import { type G, type Glyph, disc, glow, oval, rad, seeded, stroke } from "./common";

/* Orbits, distances, a nebula, galaxies and the universe. Real objects here are often a few pixels,
   so star and planet sizes are in screen pixels (g.px) while distances stay true to scale. */

const R = seeded(31337);
type Ctx = CanvasRenderingContext2D;

function star(g: G, x: number, y: number, core: number, halo: number, rgb: string, hex: string): void {
  glow(g.ctx, x, y, halo * g.px, rgb, 0.55);
  disc(g.ctx, x, y, core * g.px, hex);
}

/* ── Earth's orbit ───────────────────────────────────────────────────────────────────────────── */

/** Earth's orbit to scale: the Sun at the centre (a fraction of a pixel wide) and Earth going round once a year. */
export const orbit: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); stroke(ctx, "rgba(111,179,255,.3)", px);
  const a = -t * (TAU / 14) - 0.8;
  for (let k = 0; k < 10; k++) {
    ctx.beginPath(); ctx.arc(0, 0, 1, a + k * 0.08, a + (k + 1) * 0.08 + 0.01);
    stroke(ctx, `rgba(111,179,255,${0.6 * (1 - k / 10)})`, px * 1.6, "butt");
  }
  star(g, 0, 0, 3.5, 16, "255,214,120", "#FFE7A0");
  star(g, Math.cos(a), Math.sin(a), 3, 9, "120,180,255", "#7FB8FF");
};

/* ── Solar system ────────────────────────────────────────────────────────────────────────────── */

/** [semi-major axis AU, colour, size px]. */
const PLANETS: [number, string, number][] = [[0.387, "#B5ADA4", 1.6], [0.723, "#E8D2A0", 2.1], [1, "#6FA8F0", 2.2], [1.524, "#D9744A", 1.9], [5.2, "#D9B48F", 3.6], [9.58, "#E2C98A", 3.2], [19.2, "#9EDCE6", 2.7], [30.05, "#6A8CF0", 2.7]];
const PHASE = PLANETS.map(() => R() * TAU);
const BELT: [number, number][] = Array.from({ length: 200 }, () => [2.2 + R() * 1.1, R() * TAU]);
const AU = 0.97 / 30.05;
/** Kepler: period ∝ a^1.5; Earth takes 6 seconds, Neptune about 16 minutes. */
const omega = (a: number) => TAU / (6 * Math.pow(a, 1.5));

export const solar: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.beginPath();
  for (const [a] of PLANETS) { const rr = a * AU; ctx.moveTo(rr, 0); ctx.arc(0, 0, rr, 0, TAU); }
  stroke(ctx, "rgba(255,237,215,.14)", px);
  if (g.r > 60) {
    ctx.fillStyle = "rgba(200,190,170,.5)";
    const s = px * 1.1;
    for (const [a, p] of BELT) { const an = p - t * omega(a), rr = a * AU; ctx.fillRect(Math.cos(an) * rr, Math.sin(an) * rr, s, s); }
  }
  star(g, 0, 0, 3.5, 18, "255,214,120", "#FFE7A0");
  PLANETS.forEach(([a, col, sz], i) => {
    const an = PHASE[i] - t * omega(a), x = Math.cos(an) * a * AU, y = Math.sin(an) * a * AU;
    if (i === 5) oval(ctx, x, y, sz * 2.4 * px, sz * 0.7 * px, -0.4, "rgba(226,201,138,.45)");
    disc(ctx, x, y, sz * px, col);
  });
};

/* ── One light-year, and the nearest star ────────────────────────────────────────────────────── */

function beam(g: G, x0: number, x1: number, k: number): void {
  const { ctx, px } = g, x = x0 + (x1 - x0) * k, tail = Math.min(0.45, x - x0);
  if (tail > 0) {
    ctx.beginPath(); ctx.moveTo(x - tail, 0); ctx.lineTo(x, 0);
    const gr = ctx.createLinearGradient(x - tail, 0, x, 0);
    gr.addColorStop(0, "rgba(255,246,220,0)"); gr.addColorStop(1, "rgba(255,246,220,.9)");
    stroke(ctx, gr, px * 2, "butt");
  }
  star(g, x, 0, 2.2, 12, "255,246,220", "#FFFFFF");
}

/** One light-year as a measured bar, a pulse of sunlight crossing it, a tick for each month of travel. */
export const lightyear: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(1, 0);
  ctx.moveTo(-1, -8 * px); ctx.lineTo(-1, 8 * px); ctx.moveTo(1, -8 * px); ctx.lineTo(1, 8 * px);
  for (let m = 1; m < 12; m++) { const x = -1 + (2 * m) / 12; ctx.moveTo(x, -3 * px); ctx.lineTo(x, 3 * px); }
  stroke(ctx, "rgba(231,234,246,.45)", px, "butt");
  star(g, -1, 0, 3.5, 16, "255,214,120", "#FFE7A0");
  beam(g, -1, 1, (t / 12) % 1);
};

/** The Sun and the Alpha Centauri system 4.24 light-years away: a tick per light-year, light crossing. */
export const proxima: Glyph = (g) => {
  const { ctx, t, px } = g;
  const end = 1;
  ctx.setLineDash([4 * px, 5 * px]);
  ctx.beginPath(); ctx.moveTo(-1, 0); ctx.lineTo(end, 0); stroke(ctx, "rgba(231,234,246,.35)", px, "butt");
  ctx.setLineDash([]);
  ctx.beginPath();
  for (let k = 1; k <= 4; k++) { const x = -1 + (2 * k) / 4.24; ctx.moveTo(x, -5 * px); ctx.lineTo(x, 5 * px); }
  stroke(ctx, "rgba(231,234,246,.5)", px, "butt");
  star(g, -1, 0, 3.5, 16, "255,214,120", "#FFE7A0");
  star(g, end, 0, 2.2, 12, "255,120,90", "#FF8A6A");
  star(g, end - 0.05, -0.06, 3, 14, "255,230,170", "#FFEFC8");
  star(g, end - 0.04, -0.052, 2.2, 8, "255,190,120", "#FFC890");
  beam(g, -1, end, (t / 16) % 1);
};

/* ── Orion Nebula ────────────────────────────────────────────────────────────────────────────── */

const PUFFS: [number, number, number, string, number][] = [];
for (let i = 0; i < 34; i++) {
  const a = Math.PI * (0.45 + R() * 1.25), rr = 0.08 + Math.pow(R(), 0.8) * 0.75;
  const col = rr < 0.22 ? "190,236,226" : rr < 0.45 ? "240,120,160" : R() < 0.5 ? "214,74,96" : "226,150,96";
  PUFFS.push([0.12 + Math.cos(a) * rr, 0.05 + Math.sin(a) * rr * 0.85, 0.12 + R() * 0.22, col, R() * TAU]);
}
const DUST: [number, number, number][] = [[0.3, -0.28, 0.24], [-0.45, 0.42, 0.2], [0.55, 0.25, 0.18]];
const FIELD: [number, number, number][] = Array.from({ length: 90 }, () => [R() * 2 - 1, R() * 2 - 1, R()]);

/** Glowing hydrogen (pink-red) around a blue-green core, dust lanes, M43, and the four Trapezium stars. */
export const orion: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.globalCompositeOperation = "lighter";
  for (const [x, y, s, c, ph] of PUFFS) {
    const ss = s * (1 + 0.04 * Math.sin(t * 0.25 + ph));
    disc(ctx, x, y, ss, rad(ctx, x, y, 0, ss, [[0, `rgba(${c},.34)`], [0.5, `rgba(${c},.13)`], [1, `rgba(${c},0)`]]));
  }
  disc(ctx, 0.34, -0.6, 0.14, rad(ctx, 0.34, -0.6, 0, 0.14, [[0, "rgba(240,130,170,.4)"], [1, "rgba(240,130,170,0)"]]));
  disc(ctx, 0.12, 0.05, 0.2, rad(ctx, 0.12, 0.05, 0, 0.2, [[0, "rgba(255,250,240,.6)"], [1, "rgba(255,250,240,0)"]]));
  ctx.globalCompositeOperation = "source-over";
  for (const [x, y, s] of DUST) disc(ctx, x, y, s, rad(ctx, x, y, 0, s, [[0, "rgba(16,9,4,.55)"], [1, "rgba(16,9,4,0)"]]));
  if (g.r > 30) {
    ctx.fillStyle = "#EDE6FF";
    for (const [x, y, b] of FIELD) { ctx.globalAlpha = g.a * (0.3 + 0.6 * b); const s = px * (0.8 + b); ctx.fillRect(x, y, s, s); }
    ctx.globalAlpha = g.a;
  }
  for (const [x, y] of [[0.1, 0.03], [0.14, 0.05], [0.115, 0.08], [0.09, 0.065]]) star(g, x, y, 1.6, 7, "220,236,255", "#F4F8FF");
};

/* ── Galaxies ────────────────────────────────────────────────────────────────────────────────── */

/** Milky Way stars in polar form: [radius, angle, palette index]. 0 young blue, 1 old yellow, 2 HII pink, 3 disc haze. */
const MW: [number, number, number][] = [];
{
  const pitch = Math.tan((13 * Math.PI) / 180), arms = [0, Math.PI, Math.PI / 2, (3 * Math.PI) / 2];
  for (let i = 0; i < 950; i++) {
    const k = i % 6 < 4 ? i % 2 : 2 + (i % 2), rr = 0.14 + Math.pow(R(), 0.9) * 0.84;
    const th = arms[k] + Math.log(rr / 0.14) / pitch + (R() - 0.5) * (k < 2 ? 0.38 : 0.5);
    const c = R(); MW.push([rr + (R() - 0.5) * 0.04, th, c < 0.06 ? 2 : c < 0.72 ? 0 : 1]);
  }
  for (let i = 0; i < 260; i++) { const a = R() * TAU, rr = Math.pow(R(), 1.6) * 0.3; MW.push([rr * (0.5 + 0.5 * Math.abs(Math.cos(a))), a, 1]); }
  for (let i = 0; i < 320; i++) MW.push([0.1 + R() * 0.9, R() * TAU, 3]);
}
const MW_COL = ["#CFE0FF", "#FFE2B0", "#FF9EC4", "#B8AE9E"];

function spiral(ctx: Ctx, g: G, rot: number): void {
  const { px } = g;
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0, 1, [[0, "rgba(255,236,200,.28)"], [0.35, "rgba(200,210,240,.12)"], [1, "rgba(180,200,240,0)"]]));
  ctx.save(); ctx.rotate(rot);
  oval(ctx, 0, 0, 0.3, 0.12, 0.5, rad(ctx, 0, 0, 0, 0.3, [[0, "rgba(255,236,196,.85)"], [0.5, "rgba(255,220,170,.35)"], [1, "rgba(255,220,170,0)"]]));
  const s = Math.max(px, 0.0045);
  for (let c = 0; c < 4; c++) {
    ctx.fillStyle = MW_COL[c];
    ctx.globalAlpha = g.a * (c === 3 ? 0.35 : c === 2 ? 0.9 : 0.75);
    for (const [rr, th, k] of MW) if (k === c) { const sz = k === 2 ? s * 1.8 : s; ctx.fillRect(Math.cos(th) * rr, Math.sin(th) * rr, sz, sz); }
  }
  ctx.globalAlpha = g.a;
  // Dust lanes on the inner edge of the two major arms
  if (g.r > 40) {
    const pitch = Math.tan((13 * Math.PI) / 180);
    for (const base of [0, Math.PI]) {
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) { const rr = 0.18 + (k / 40) * 0.6, th = base + Math.log(rr / 0.14) / pitch - 0.14; k ? ctx.lineTo(Math.cos(th) * rr, Math.sin(th) * rr) : ctx.moveTo(Math.cos(th) * rr, Math.sin(th) * rr); }
      stroke(ctx, "rgba(16,9,4,.4)", 0.035);
    }
  }
  disc(ctx, 0, 0, 0.09, rad(ctx, 0, 0, 0, 0.09, [[0, "rgba(255,248,230,.95)"], [1, "rgba(255,240,210,0)"]]));
  ctx.restore();
}

/** The Milky Way, a barred spiral seen from above, turning slowly. */
export const milkyway: Glyph = (g) => {
  g.ctx.scale(1, 0.9);
  spiral(g.ctx, g, -g.t * 0.02);
};

/** A galaxy too small to resolve: an inclined glow with a bright core. */
function smudge(g: G, x: number, y: number, rr: number, flat: number, ang: number, rgb: string): void {
  const r = Math.max(rr, g.px * 4);
  oval(g.ctx, x, y, r, r * flat, ang, rad(g.ctx, x, y, 0, r, [[0, `rgba(${rgb},.95)`], [0.35, `rgba(${rgb},.45)`], [1, `rgba(${rgb},0)`]]));
  disc(g.ctx, x, y, Math.max(g.px * 0.9, rr * 0.15), "#FFF4E0");
}

const DWARFS: [number, number, number][] = Array.from({ length: 48 }, () => {
  const host = R() < 0.5 ? [-0.22, 0.06] : [0.22, -0.08], a = R() * TAU, rr = Math.pow(R(), 1.5) * 0.35;
  return [host[0] + Math.cos(a) * rr, host[1] + Math.sin(a) * rr, R()];
});

/** The Local Group to scale: the Milky Way and Andromeda 2.5 million light-years apart, Triangulum, and dozens of dwarfs. */
export const localgroup: Glyph = (g) => {
  const { ctx, px } = g;
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0, 1, [[0, "rgba(169,177,214,.08)"], [0.7, "rgba(169,177,214,.03)"], [1, "rgba(169,177,214,0)"]]));
  ctx.fillStyle = "#D8D0E8";
  for (const [x, y, b] of DWARFS) { ctx.globalAlpha = g.a * (0.3 + 0.4 * b); const s = px * (1 + b); ctx.fillRect(x, y, s, s); }
  ctx.globalAlpha = g.a;
  const mwR = 0.0095;
  if (mwR * g.r > 14) { ctx.save(); ctx.translate(-0.22, 0.06); ctx.scale(mwR, mwR * 0.9); spiral(ctx, { ...g, px: g.px / mwR, r: g.r * mwR }, -g.t * 0.02); ctx.restore(); }
  else smudge(g, -0.22, 0.06, mwR, 0.9, 0, "214,224,255");
  smudge(g, -0.225, 0.088, 0.0016, 0.8, 0, "214,224,255");
  smudge(g, -0.205, 0.094, 0.0009, 0.8, 0, "214,224,255");
  smudge(g, 0.22, -0.08, 0.021, 0.3, 0.65, "255,232,200");
  smudge(g, 0.33, 0.02, 0.0057, 0.65, -0.3, "200,214,255");
};

/* ── Observable universe ─────────────────────────────────────────────────────────────────────── */

const NODES: [number, number, number][] = Array.from({ length: 170 }, () => { const a = R() * TAU, rr = Math.sqrt(R()) * 0.87; return [Math.cos(a) * rr, Math.sin(a) * rr, Math.pow(R(), 2)]; });
/** Filaments join each cluster to its nearest neighbours, bowed slightly: [from, to, bend]. */
const EDGES: [number, number, number][] = [];
NODES.forEach(([x, y], i) => {
  NODES.map(([u, v], j) => [Math.hypot(u - x, v - y), j] as [number, number]).sort((p, q) => p[0] - q[0]).slice(1, 4)
    .forEach(([d, j]) => { if (d < 0.32 && !EDGES.some(([p, q]) => (p === j && q === i) || (p === i && q === j))) EDGES.push([i, j, (R() - 0.5) * 0.4]); });
});
const along = (e: [number, number, number], s: number): [number, number] => {
  const [i, j, b] = e, [x0, y0] = NODES[i], [x1, y1] = NODES[j], mx = (x0 + x1) / 2 - (y1 - y0) * b, my = (y0 + y1) / 2 + (x1 - x0) * b;
  return [(1 - s) * (1 - s) * x0 + 2 * (1 - s) * s * mx + s * s * x1, (1 - s) * (1 - s) * y0 + 2 * (1 - s) * s * my + s * s * y1];
};
const WEB_GAL: [number, number][] = Array.from({ length: 1600 }, (_, k) => {
  if (k % 5 === 0) { const a = R() * TAU, rr = Math.sqrt(R()) * 0.88; return [Math.cos(a) * rr, Math.sin(a) * rr]; }
  const [x, y] = along(EDGES[Math.floor(R() * EDGES.length)], R());
  return [x + (R() + R() + R() - 1.5) * 0.018, y + (R() + R() + R() - 1.5) * 0.018];
});
const CMB: [number, number, number, number][] = Array.from({ length: 420 }, () => [R() * TAU, 0.89 + R() * 0.11, 0.006 + R() * 0.016, R()]);

/** The cosmic web of galaxy filaments and clusters, inside the glowing edge of the cosmic microwave background. */
export const universe: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.rotate(t * 0.004);
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0.84, 1, [[0, "rgba(220,110,60,0)"], [0.5, "rgba(220,120,70,.35)"], [1, "rgba(200,90,50,.12)"]]));
  if (g.r > 30) {
    for (const [hot, col] of [[true, "rgba(255,180,120,.13)"], [false, "rgba(140,56,36,.16)"]] as const) {
      ctx.fillStyle = col; ctx.beginPath();
      for (const [a, rr, s, k] of CMB) if (k < 0.5 === hot) { const x = Math.cos(a) * rr, y = Math.sin(a) * rr; ctx.moveTo(x + s, y); ctx.arc(x, y, s, 0, TAU); }
      ctx.fill();
    }
  }
  ctx.beginPath();
  for (const e of EDGES) { const [x0, y0] = NODES[e[0]], [x1, y1] = NODES[e[1]], [mx, my] = along(e, 0.5); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(2 * mx - (x0 + x1) / 2, 2 * my - (y0 + y1) / 2, x1, y1); }
  stroke(ctx, "rgba(201,182,255,.06)", Math.max(px * 4, 0.025));
  stroke(ctx, "rgba(201,182,255,.1)", px);
  if (g.r > 40) {
    ctx.fillStyle = "#DCD0FF"; ctx.globalAlpha = g.a * 0.45;
    const s = Math.max(px, 0.002);
    for (const [x, y] of WEB_GAL) ctx.fillRect(x, y, s, s);
    ctx.globalAlpha = g.a;
  }
  for (const [x, y, b] of NODES) if (b > 0.25) glow(ctx, x, y, 0.01 + b * 0.03, "232,222,255", 0.25 + b * 0.4);
};
