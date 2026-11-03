import { TAU } from "../../sim/core";
import { type Glyph, chain, disc, ell, glow, lin, limb, oval, poly, rad, seeded, silhouette, smooth, stroke } from "./common";

/* Structures and land. Tall things stand on y = 1 and reach y = −1 at their measured height. */

const R = seeded(4409);

/* ── Statue of Liberty (93 m, ground to torch) ───────────────────────────────────────────────── */

/** Copper-green figure on Hunt's granite pedestal and the star-fort base, torch flickering. */
export const liberty: Glyph = (g) => {
  const { ctx, t, px } = g;
  const off = Math.max(px * 1.2, 0.006);
  // Fort Wood walls and the plinth
  silhouette(ctx, (c) => {
    poly(c, [[-0.5, 0.86], [0.5, 0.86], [0.56, 1], [-0.56, 1]]);
    poly(c, [[-0.27, 0.57], [0.27, 0.57], [0.33, 0.86], [-0.33, 0.86]]);
  }, lin(ctx, -0.5, 0.5, 0.5, 1, [[0, "#B4A890"], [1, "#6A604E"]]), "#E4D8C0", off);
  // Pedestal with its cornice and loggias
  silhouette(ctx, (c) => {
    poly(c, [[-0.18, 0.08], [0.18, 0.08], [0.22, 0.57], [-0.22, 0.57]]);
    poly(c, [[-0.21, 0.0], [0.21, 0.0], [0.19, 0.08], [-0.19, 0.08]]);
  }, lin(ctx, -0.2, 0, 0.2, 0.6, [[0, "#D6C8AC"], [1, "#8E806A"]]), "#F0E4CC", off);
  if (g.r > 30) {
    ctx.fillStyle = "rgba(40,32,24,.55)";
    for (const x of [-0.11, -0.035, 0.04]) ctx.fillRect(x, 0.14, 0.05, 0.1);
    ctx.fillRect(-0.2, 0.3, 0.4, 0.012);
  }
  // The statue
  const cu = lin(ctx, -0.12, -1, 0.12, 0, [[0, "#A8DCC2"], [0.5, "#6CA890"], [1, "#3E7262"]]);
  silhouette(ctx, (c) => {
    c.moveTo(-0.075, -0.6); c.lineTo(0.075, -0.6);
    c.quadraticCurveTo(0.09, -0.4, 0.1, 0); c.lineTo(-0.1, 0); c.quadraticCurveTo(-0.09, -0.35, -0.075, -0.6); c.closePath();
    limb(c, 0, -0.64, 0.022, 0, -0.58, 0.03);
    ell(c, 0, -0.665, 0.036, 0.046);
    chain(c, [[-0.055, -0.58, 0.028], [-0.083, -0.78, 0.021], [-0.1, -0.93, 0.019]]);
    limb(c, -0.1, -0.93, 0.02, -0.1, -0.965, 0.03);
    chain(c, [[0.06, -0.57, 0.026], [0.1, -0.46, 0.022], [0.07, -0.39, 0.02]]);
    poly(c, [[0.07, -0.53], [0.13, -0.52], [0.14, -0.34], [0.08, -0.35]]);
  }, cu, "#D6F2E4", off);
  ctx.beginPath();
  for (let i = 0; i < 7; i++) { const a = Math.PI * (-0.92 + (i / 6) * 0.84); ctx.moveTo(Math.cos(a) * 0.03, -0.69 + Math.sin(a) * 0.03); ctx.lineTo(Math.cos(a) * 0.085, -0.69 + Math.sin(a) * 0.085); }
  stroke(ctx, "#7CB8A0", Math.max(px, 0.008));
  if (g.r > 50) {
    ctx.beginPath();
    for (const x of [-0.05, -0.01, 0.03, 0.065]) { ctx.moveTo(x, -0.5); ctx.quadraticCurveTo(x - 0.015, -0.25, x * 1.2, -0.01); }
    stroke(ctx, "rgba(30,70,58,.4)", Math.max(px, 0.004));
  }
  const fl = 1 + 0.18 * Math.sin(t * 9) + 0.08 * Math.sin(t * 23);
  glow(ctx, -0.1, -0.99, 0.08, "255,200,90", 0.45);
  oval(ctx, -0.1, -0.99, 0.02, 0.032 * fl, 0, "#F8C85A");
  oval(ctx, -0.1, -0.985, 0.01, 0.017 * fl, 0, "#FFF2C8");
};

/* ── Eiffel Tower (330 m) ────────────────────────────────────────────────────────────────────── */

/** Half-width of the tower at height m (metres), from its plan dimensions. */
const EIFFEL: [number, number][] = [[0, 0.379], [20, 0.32], [57, 0.215], [115, 0.122], [200, 0.07], [276, 0.045], [300, 0.025], [312, 0.012], [330, 0.004]];
const ehw = (m: number) => {
  for (let i = 1; i < EIFFEL.length; i++) if (m <= EIFFEL[i][0]) { const [m0, w0] = EIFFEL[i - 1], [m1, w1] = EIFFEL[i]; return w0 + ((w1 - w0) * (m - m0)) / (m1 - m0); }
  return 0.004;
};
const ey = (m: number) => 1 - m / 165;
const SPARK: [number, number, number][] = Array.from({ length: 110 }, () => { const m = Math.pow(R(), 1.6) * 310; return [(R() * 2 - 1) * ehw(m) * 0.92, ey(m), R()]; });

function eiffelPath(c: CanvasRenderingContext2D): void {
  for (let m = 0; m <= 330; m += 6) { const x = -ehw(m), y = ey(m); m ? c.lineTo(x, y) : c.moveTo(x, y); }
  for (let m = 330; m >= 0; m -= 6) c.lineTo(ehw(m), ey(m));
  c.closePath();
  // Openings: the great arch, the window between the platforms, the shaft gap
  c.moveTo(-0.22, 1); c.ellipse(0, 1, 0.22, 0.29, 0, Math.PI, TAU); c.closePath();
  poly(c, [[-0.13, 0.62], [-0.055, 0.34], [0.055, 0.34], [0.13, 0.62]]);
  poly(c, [[-0.05, 0.27], [-0.012, 0.02], [0.012, 0.02], [0.05, 0.27]]);
}

/** Wrought-iron lattice lit gold at night, three platforms, the hourly sparkle and the beacon. */
export const eiffel: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.beginPath(); eiffelPath(ctx);
  ctx.fillStyle = lin(ctx, -0.38, 0, 0.38, 0, [[0, "#E8B068"], [0.45, "#C98A48"], [1, "#7E4E26"]]);
  ctx.fill("evenodd");
  if (g.r > 50) {
    ctx.save(); ctx.beginPath(); eiffelPath(ctx); ctx.clip("evenodd");
    ctx.beginPath();
    const s = 0.04;
    for (let k = -60; k < 60; k++) { const x = k * s; ctx.moveTo(x, -1); ctx.lineTo(x + 1.2, 1.1); ctx.moveTo(x, -1); ctx.lineTo(x - 1.2, 1.1); }
    stroke(ctx, "rgba(70,36,14,.55)", Math.max(px * 0.9, 0.004), "butt");
    ctx.restore();
  }
  ctx.fillStyle = "#F0C07A";
  for (const [m, h] of [[57, 0.032], [115, 0.026], [276, 0.014]] as const) { const w = ehw(m) + 0.025; ctx.fillRect(-w, ey(m) - h, 2 * w, h); }
  // Sparkle: each light flashes briefly, at its own moment
  const sz = Math.max(px * 1.5, 0.006);
  for (const [x, y, p] of SPARK) {
    const k = (p + t * 0.45) % 1;
    if (k < 0.05) { ctx.globalAlpha = g.a * (1 - k / 0.05); disc(ctx, x, y, sz, "#FFF6DC"); }
  }
  ctx.globalAlpha = g.a;
  // The rotating beacon throws two beams; we see them swing toward and away from us
  const b = t * 0.6;
  for (const s of [1, -1]) {
    const L = 0.8 * Math.cos(b) * s;
    ctx.beginPath(); ctx.moveTo(0, -0.95); ctx.lineTo(L, -0.99); ctx.lineTo(L, -0.93); ctx.closePath();
    ctx.fillStyle = lin(ctx, 0, 0, L || 0.001, 0, [[0, "rgba(255,236,190,.22)"], [1, "rgba(255,236,190,0)"]]); ctx.fill();
  }
  glow(ctx, 0, -0.96, 0.05, "255,236,190", 0.6);
};

/* ── Burj Khalifa (830 m) ────────────────────────────────────────────────────────────────────── */

const by = (m: number) => 1 - m / 415;
/** Wing setbacks: [from m, to m, half-width] — the left and right wings step back at different heights, like the real spiral of setbacks. */
const BURJ_L: [number, number, number][] = [[0, 150, 0.12], [150, 270, 0.1], [270, 380, 0.082], [380, 470, 0.064], [470, 540, 0.05]];
const BURJ_R: [number, number, number][] = [[0, 190, 0.115], [190, 310, 0.095], [310, 420, 0.076], [420, 500, 0.058], [500, 560, 0.045]];
const WINDOWS: [number, number, number][] = Array.from({ length: 160 }, () => {
  const m = R() * 560, side = R() < 0.5 ? BURJ_L : BURJ_R, tier = side.find(([a, b]) => m >= a && m < b), w = tier ? tier[2] : 0.04;
  return [(side === BURJ_L ? -1 : 1) * R() * w * 0.9, by(m), R()];
});

/** Silver glass in stepped wings around a central core, a needle spire and its red aviation light. */
export const burj: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.beginPath();
  for (const [a, b, w] of BURJ_L) ctx.rect(-w, by(b), w, by(a) - by(b));
  for (const [a, b, w] of BURJ_R) ctx.rect(0, by(b), w, by(a) - by(b));
  ctx.rect(-0.036, by(600), 0.072, by(0) - by(600));
  poly(ctx, [[-0.03, by(600)], [0, by(828)], [0.03, by(600)]]);
  ctx.fillStyle = lin(ctx, -0.12, 0, 0.12, 0, [[0, "#56667E"], [0.3, "#C6D4E6"], [0.5, "#9AAAC2"], [0.7, "#6C7C96"], [1, "#3A4658"]]);
  ctx.fill();
  if (g.r > 60) {
    ctx.beginPath();
    for (const x of [-0.08, -0.05, -0.02, 0.02, 0.05, 0.08]) { ctx.moveTo(x, by(0)); ctx.lineTo(x, by(Math.abs(x) > 0.06 ? 260 : 500)); }
    stroke(ctx, "rgba(30,40,56,.35)", Math.max(px * 0.8, 0.003), "butt");
  }
  const s = Math.max(px * 1.2, 0.005);
  ctx.fillStyle = "#FFE2A8";
  for (const [x, y, p] of WINDOWS) { ctx.globalAlpha = g.a * (0.35 + 0.45 * (0.5 + 0.5 * Math.sin(t * 0.3 + p * 40))); ctx.fillRect(x, y, s, s); }
  ctx.globalAlpha = g.a;
  if ((t % 1.5) < 0.35) { glow(ctx, 0, -0.995, 0.05, "255,80,60", 0.8); disc(ctx, 0, -0.995, Math.max(px * 1.3, 0.005), "#FF6A50"); }
};

/* ── Mount Everest (8,849 m) ─────────────────────────────────────────────────────────────────── */

const SKY: number[][] = (() => {
  const key = [[-1, 1], [-0.85, 0.55], [-0.7, 0.3], [-0.55, -0.15], [-0.45, -0.4], [-0.3, -0.55], [-0.1, -0.78], [0.05, -0.95], [0.1, -1], [0.18, -0.9], [0.3, -0.72], [0.42, -0.62], [0.55, -0.6], [0.65, -0.68], [0.75, -0.5], [0.85, -0.2], [0.92, 0.3], [1, 1]];
  const out: number[][] = [];
  for (let i = 0; i < key.length - 1; i++) {
    const [x0, y0] = key[i], [x1, y1] = key[i + 1];
    for (let k = 0; k < 4; k++) { const s = k / 4, j = i && k ? (R() - 0.5) * 0.05 : 0; out.push([x0 + (x1 - x0) * s, y0 + (y1 - y0) * s + j]); }
  }
  out.push([1, 1]);
  return out;
})();
const SNOW = SKY.filter(([, y]) => y < 0.1).map(([x, y]) => [x, y + 0.08 + (1 - (y + 1)) * 0.25 * (0.4 + R() * 0.8)]);

/** The massif in slate rock and snow, ridges catching light, and the plume of snow off the summit. */
export const everest: Glyph = (g) => {
  const { ctx, t } = g;
  ctx.beginPath(); poly(ctx, SKY);
  ctx.fillStyle = lin(ctx, 0, -1, 0, 1, [[0, "#8E8A94"], [0.5, "#5E5862"], [1, "#3C3640"]]);
  ctx.fill();
  ctx.save(); ctx.clip();
  // Snowfields hang under the skyline
  ctx.beginPath();
  SKY.filter(([, y]) => y < 0.1).forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  for (let i = SNOW.length - 1; i >= 0; i--) ctx.lineTo(SNOW[i][0], SNOW[i][1]);
  ctx.closePath();
  ctx.fillStyle = lin(ctx, -0.6, -1, 0.6, 0.2, [[0, "#FFFFFF"], [0.6, "#E6E8F0"], [1, "#B8BCCC"]]);
  ctx.fill();
  // The east faces sit in shadow; ridges catch the light
  ctx.fillStyle = lin(ctx, 0.1, 0, 1, 0, [[0, "rgba(14,10,24,.5)"], [1, "rgba(14,10,24,.25)"]]);
  ctx.beginPath(); ctx.moveTo(0.1, -1); ctx.lineTo(0.22, -0.3); ctx.lineTo(0.3, 1); ctx.lineTo(1.1, 1); ctx.lineTo(1.1, -1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(14,10,24,.22)";
  ctx.beginPath(); ctx.moveTo(-0.45, -0.4); ctx.lineTo(-0.38, 0.2); ctx.lineTo(-0.5, 1); ctx.lineTo(-0.8, 1); ctx.closePath(); ctx.fill();
  ctx.beginPath();
  for (const [x0, y0, x1, y1] of [[0.1, -1, 0.22, -0.3], [0.22, -0.3, 0.3, 1], [-0.45, -0.4, -0.38, 0.2], [0.65, -0.68, 0.6, 0.1], [-0.1, -0.78, -0.18, -0.2]]) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); }
  stroke(ctx, "rgba(240,242,250,.28)", Math.max(g.px, 0.008));
  ctx.restore();
  // Summit plume: jet-stream wind blowing snow east off the top
  for (let k = 0; k < 9; k++) {
    const s = (t * 0.06 + k / 9) % 1, x = 0.12 + s * 0.85, y = -0.98 + s * 0.1 + 0.02 * Math.sin(t * 0.7 + k), rr = 0.03 + s * 0.12;
    disc(ctx, x, y, rr, rad(ctx, x, y, 0, rr, [[0, `rgba(244,246,252,${0.6 * (1 - s)})`], [1, "rgba(244,246,252,0)"]]));
  }
};

/* ── Grand Canyon (446 km long), seen from above ─────────────────────────────────────────────── */

const CANYON: number[][] = Array.from({ length: 64 }, (_, i) => { const x = -1 + (2 * i) / 63; return [x, 0.22 * Math.sin(x * 2.2 + 0.5) + 0.11 * Math.sin(x * 5.1) + 0.045 * Math.sin(x * 11 + 1) + 0.015 * Math.sin(x * 29)]; });
/** Canyon width along its length: narrow Marble Canyon upstream, widest in the middle. */
const CW = (i: number) => 0.35 + 0.65 * Math.sin(Math.PI * Math.min(1, (i + 6) / 64));
/** Tributary canyons: wandering, tapering, sometimes branching again. */
const SIDE: { pts: number[][]; w: number }[] = [];
function tributary(x: number, y: number, a: number, L: number, w: number, depth: number): void {
  const pts = [[x, y]];
  for (let k = 1; k <= 6; k++) { a += (R() - 0.5) * 0.7; x += Math.cos(a) * L / 6; y += Math.sin(a) * L / 6; pts.push([x, y]); if (depth < 1 && k === 3 && R() < 0.5) tributary(x, y, a + (R() < 0.5 ? 0.9 : -0.9), L * 0.5, w * 0.6, depth + 1); }
  SIDE.push({ pts, w });
}
for (let i = 3; i < 60; i += 2 + Math.floor(R() * 3)) {
  const [x, y] = CANYON[i], [x1, y1] = CANYON[i + 1], dir = Math.atan2(y1 - y, x1 - x), s = R() < 0.5 ? 1 : -1;
  tributary(x, y, dir + s * (0.9 + R() * 0.8), 0.03 + R() * 0.09 * CW(i), 0.3 * CW(i), 0);
}

/** Layered red, orange and buff strata cut by the Colorado River, side canyons branching off. */
export const canyon: Glyph = (g) => {
  const { ctx, t, px } = g;
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0.2, 1, [[0, "rgba(150,112,74,.6)"], [0.7, "rgba(130,96,64,.35)"], [1, "rgba(130,96,64,0)"]]));
  oval(ctx, -0.1, -0.42, 0.5, 0.2, 0.1, rad(ctx, -0.1, -0.42, 0, 0.5, [[0, "rgba(72,96,62,.5)"], [1, "rgba(72,96,62,0)"]]));
  const path = (pts: number[][]) => { ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); };
  const layers: [string, number][] = [["#E2B47E", 0.13], ["#CC7A48", 0.1], ["#A8553A", 0.072], ["#7C3A28", 0.045], ["#5A2A1E", 0.026]];
  layers.forEach(([c, w], li) => {
    if (g.r > 20 && li > 0) for (const sc of SIDE) { path(sc.pts); stroke(ctx, c, Math.max(px * 0.8, w * sc.w)); }
    for (let i = 0; i < CANYON.length - 1; i++) {
      ctx.beginPath(); ctx.moveTo(CANYON[i][0], CANYON[i][1]); ctx.lineTo(CANYON[i + 1][0], CANYON[i + 1][1]);
      stroke(ctx, c, Math.max(px, w * CW(i)));
    }
  });
  path(CANYON);
  stroke(ctx, "#4E8292", Math.max(px * 1.2, 0.008));
  if (g.r > 40) {
    ctx.setLineDash([0.02, 0.05]); ctx.lineDashOffset = -t * 0.05;
    path(CANYON); stroke(ctx, "rgba(190,230,240,.6)", Math.max(px * 0.8, 0.004));
    ctx.setLineDash([]);
  }
};

/* ── A large country (3,200 km across), as a map ─────────────────────────────────────────────── */

const COAST: number[][] = Array.from({ length: 120 }, (_, i) => {
  const a = (i / 120) * TAU, rr = 0.76 + 0.09 * Math.sin(3 * a + 1) + 0.05 * Math.sin(5 * a + 2) + 0.035 * Math.sin(11 * a) + 0.02 * Math.sin(23 * a + 3) + (R() - 0.5) * 0.05;
  return [Math.cos(a) * rr, Math.sin(a) * rr * 0.82];
});
const inside = (u: number, v: number) => [u * 0.62, v * 0.5];
const RIVERS: number[][][] = [[0.1, -0.3, 17], [-0.2, 0.1, 83], [0.3, 0.25, 50]].map(([u, v, ci]) => {
  const [x0, y0] = inside(u, v), [x1, y1] = COAST[ci], pts: number[][] = [];
  for (let k = 0; k <= 12; k++) { const s = k / 12; pts.push([x0 + (x1 - x0) * s + Math.sin(s * 9 + u * 5) * 0.03, y0 + (y1 - y0) * s + Math.cos(s * 8 + v * 5) * 0.03]); }
  return pts;
});
const BORDERS: number[][][] = [[7, 67], [37, 97], [20, 110]].map(([a, b]) => {
  const [x0, y0] = COAST[a], [x1, y1] = COAST[b], pts: number[][] = [];
  for (let k = 0; k <= 16; k++) { const s = k / 16; pts.push([x0 + (x1 - x0) * s + (R() - 0.5) * 0.04, y0 + (y1 - y0) * s + (R() - 0.5) * 0.04]); }
  return pts;
});
const PEAKS: number[][] = Array.from({ length: 16 }, (_, i) => { const a = Math.PI * (0.75 + i * 0.03); return [Math.cos(a) * 0.55 + (R() - 0.5) * 0.04, Math.sin(a) * 0.45 + (R() - 0.5) * 0.04, 0.03 + R() * 0.03]; });
const CITIES: number[][] = Array.from({ length: 12 }, () => { const a = R() * TAU, rr = Math.sqrt(R()) * 0.6; return [Math.cos(a) * rr, Math.sin(a) * rr * 0.75]; });

/** A coastline with shallow water, lowlands to highlands, rivers, internal borders, cities and a capital. */
export const country: Glyph = (g) => {
  const { ctx, px } = g;
  ctx.beginPath(); smooth(ctx, COAST);
  stroke(ctx, "rgba(110,170,190,.28)", 0.08);
  ctx.fillStyle = lin(ctx, -0.8, 0, 0.8, 0.3, [[0, "#9C8A62"], [0.35, "#7C9058"], [1, "#5E8450"]]);
  ctx.fill();
  stroke(ctx, "rgba(220,236,230,.5)", Math.max(px, 0.006));
  if (g.r > 25) {
    ctx.save(); ctx.beginPath(); smooth(ctx, COAST); ctx.clip();
    for (const [x, y, s] of PEAKS) {
      ctx.beginPath(); ctx.moveTo(x - s, y + s * 0.6); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s, y + s * 0.6); ctx.closePath();
      ctx.fillStyle = "rgba(92,76,56,.55)"; ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.2); ctx.lineTo(x, y - s * 0.6); ctx.lineTo(x + s * 0.3, y - s * 0.2); ctx.closePath();
      ctx.fillStyle = "rgba(240,240,236,.7)"; ctx.fill();
    }
    for (const r of RIVERS) { ctx.beginPath(); r.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); stroke(ctx, "rgba(120,180,214,.85)", Math.max(px * 1.1, 0.006)); }
    ctx.setLineDash([0.025, 0.018]);
    for (const b of BORDERS) { ctx.beginPath(); b.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); stroke(ctx, "rgba(255,237,215,.45)", Math.max(px * 0.9, 0.004), "butt"); }
    ctx.setLineDash([]);
    ctx.restore();
  }
  for (const [x, y] of CITIES) disc(ctx, x, y, Math.max(px * 1.6, 0.012), "rgba(255,237,215,.85)");
  disc(ctx, 0.05, -0.05, Math.max(px * 3, 0.025), "rgba(255,237,215,.35)");
  disc(ctx, 0.05, -0.05, Math.max(px * 1.8, 0.014), "#FFEDD7");
};
