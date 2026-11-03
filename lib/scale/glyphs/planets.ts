import { TAU } from "../../sim/core";
import { type Glyph, disc, glow, oval, rad, seeded, sphereShade, stroke } from "./common";

/* The Moon, Earth, Jupiter and the Sun, each a lit sphere of radius 1. */

const R = seeded(9907);
const D2R = Math.PI / 180;

/* ── Earth ───────────────────────────────────────────────────────────────────────────────────── */

/** Coarse coastlines as [longitude, latitude] in degrees. */
const LAND: number[][][] = [
  // North America
  [[-168, 66], [-162, 70], [-140, 70], [-125, 71], [-95, 72], [-80, 73], [-65, 62], [-55, 52], [-66, 45], [-70, 42], [-76, 35], [-81, 31], [-80, 26], [-82, 29], [-90, 30], [-97, 27], [-97, 21], [-92, 18], [-87, 21], [-84, 15], [-78, 8], [-83, 9], [-88, 13], [-95, 16], [-105, 20], [-110, 24], [-114, 30], [-117, 33], [-122, 37], [-124, 42], [-124, 48], [-130, 54], [-140, 59], [-152, 58], [-158, 56], [-165, 60]],
  // South America
  [[-80, 9], [-72, 12], [-62, 10], [-50, 0], [-35, -5], [-38, -13], [-41, -22], [-48, -26], [-53, -34], [-58, -38], [-65, -42], [-68, -50], [-70, -55], [-74, -50], [-74, -40], [-71, -30], [-70, -18], [-76, -14], [-81, -5], [-80, 1]],
  // Africa
  [[-17, 15], [-17, 21], [-13, 28], [-6, 36], [10, 37], [20, 32], [32, 31], [35, 28], [43, 12], [51, 12], [42, -1], [40, -10], [41, -15], [35, -24], [32, -29], [20, -35], [18, -30], [12, -17], [13, -6], [9, -1], [9, 4], [-8, 4], [-14, 10]],
  // Eurasia
  [[-9, 37], [-9, 43], [-2, 44], [-4, 48], [2, 51], [8, 54], [10, 58], [5, 62], [15, 69], [28, 71], [40, 67], [60, 69], [70, 73], [90, 76], [110, 77], [140, 72], [160, 70], [179, 68], [179, 65], [170, 60], [160, 58], [155, 50], [142, 46], [135, 43], [130, 35], [122, 30], [121, 23], [110, 20], [108, 12], [104, 10], [100, 14], [98, 8], [103, 1], [98, 16], [92, 22], [88, 22], [80, 15], [77, 8], [73, 18], [67, 25], [57, 25], [56, 27], [50, 30], [48, 29], [52, 24], [56, 24], [59, 22], [55, 17], [44, 12], [43, 13], [39, 21], [35, 28], [34, 31], [36, 36], [30, 37], [27, 40], [24, 38], [22, 37], [20, 40], [16, 38], [18, 40], [13, 45], [12, 44], [8, 44], [3, 43], [-1, 37], [-6, 36]],
  // Australia
  [[114, -22], [122, -18], [130, -12], [137, -12], [142, -11], [146, -19], [153, -26], [150, -37], [145, -39], [138, -35], [132, -32], [115, -34]],
  // Islands: Britain, Japan, Madagascar, Sumatra, Borneo, New Guinea, Iceland
  [[-5, 50], [1, 51], [-2, 57], [-6, 58], [-5, 54]],
  [[130, 31], [140, 35], [142, 40], [141, 45], [139, 41], [132, 34]],
  [[44, -25], [47, -25], [50, -15], [49, -12], [44, -17]],
  [[95, 5], [106, -6], [101, -2]],
  [[109, 2], [117, 7], [119, 1], [116, -4], [110, -3]],
  [[131, -1], [141, -3], [150, -10], [141, -9]],
  [[-24, 64], [-14, 64], [-15, 66], [-22, 66]],
];
const DESERT: number[][][] = [
  [[-15, 18], [-5, 30], [10, 32], [30, 30], [35, 22], [25, 16], [10, 15], [-5, 16]],
  [[36, 28], [48, 29], [56, 24], [52, 17], [44, 14], [38, 20]],
  [[118, -22], [132, -18], [140, -24], [136, -30], [122, -30]],
  [[88, 40], [110, 44], [115, 40], [100, 37]],
  [[-115, 32], [-104, 36], [-100, 30], [-108, 26]],
];
const ICE: number[][][] = [
  Array.from({ length: 36 }, (_, i) => [-180 + i * 10, -66 - 3 * Math.sin(i * 1.7)]).concat([[180, -90], [-180, -90]]),
  [[-55, 60], [-43, 60], [-22, 70], [-18, 77], [-30, 83], [-60, 82], [-70, 77], [-55, 68]],
  Array.from({ length: 36 }, (_, i) => [-180 + i * 10, 80 + 2 * Math.sin(i * 2.3)]).concat([[180, 90], [-180, 90]]),
];

/** Densify edges so the back-hemisphere clamp traces the limb smoothly. */
function densify(ring: number[][]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < ring.length; i++) {
    const [a0, b0] = ring[i], [a1, b1] = ring[(i + 1) % ring.length], n = Math.max(1, Math.ceil(Math.max(Math.abs(a1 - a0), Math.abs(b1 - b0)) / 4));
    for (let k = 0; k < n; k++) out.push([(a0 + ((a1 - a0) * k) / n) * D2R, (b0 + ((b1 - b0) * k) / n) * D2R]);
  }
  return out;
}
const LAND_D = LAND.map(densify), DESERT_D = DESERT.map(densify), ICE_D = ICE.map(densify);
/** Cloud streaks: the tropical belt and the mid-latitude storm tracks. [lon, lat, size, stretch]. */
const CLOUDS: [number, number, number, number][] = Array.from({ length: 110 }, () => {
  const band = R(), lat = band < 0.3 ? (R() - 0.5) * 18 : (R() < 0.5 ? 1 : -1) * (35 + R() * 30);
  return [R() * TAU, lat * D2R, 0.018 + R() * 0.035, 1.6 + R() * 2.4];
});

const VIEW_LAT = 0.32;
const sv = Math.sin(VIEW_LAT), cv = Math.cos(VIEW_LAT);
/** Orthographic projection; back-side points are pushed to the limb so polygons clip to the disc. */
function project(lon: number, lat: number, rot: number): [number, number, number] {
  const cl = Math.cos(lat), dl = lon + rot;
  const x = cl * Math.sin(dl), y = cv * Math.sin(lat) - sv * cl * Math.cos(dl), z = sv * Math.sin(lat) + cv * cl * Math.cos(dl);
  if (z >= 0) return [x, -y, z];
  const n = Math.hypot(x, y) || 1;
  return [x / n, -y / n, z];
}
function fillRings(ctx: CanvasRenderingContext2D, rings: number[][][], rot: number, style: string): void {
  ctx.fillStyle = style;
  for (const ring of rings) {
    let front = false;
    const pts = ring.map(([lo, la]) => { const p = project(lo, la, rot); if (p[2] > 0) front = true; return p; });
    if (!front) continue;
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath(); ctx.fill();
  }
}

/** Earth turning: oceans, continents, deserts, ice caps, drifting clouds, a thin blue atmosphere. */
export const earth: Glyph = (g) => {
  const { ctx, t } = g;
  const rot = -1.2 - t * (TAU / 48);
  disc(ctx, 0, 0, 1.06, rad(ctx, 0, 0, 0.94, 1.06, [[0, "rgba(120,180,255,.55)"], [1, "rgba(120,180,255,0)"]]));
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0.1, 1, [[0, "#3A7CC4"], [0.7, "#24599C"], [1, "#163C73"]], -0.35, -0.35));
  if (g.r > 5) {
    ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.clip();
    fillRings(ctx, LAND_D, rot, "#5C8A4A");
    fillRings(ctx, DESERT_D, rot, "rgba(199,165,110,.85)");
    fillRings(ctx, ICE_D, rot, "#EEF3F8");
    if (g.r > 18) {
      const cr = rot + t * 0.01;
      ctx.fillStyle = "rgba(250,252,255,.55)";
      ctx.beginPath();
      for (const [lo, la, sz, st] of CLOUDS) {
        const [x, y, z] = project(lo, la, cr);
        if (z < 0.05) continue;
        // Stretch along the local east direction, foreshortened toward the limb
        const dl = lo + cr, cl = Math.cos(la), ang = Math.atan2(sv * cl * Math.sin(dl), cl * Math.cos(dl));
        const rx = sz * st * Math.max(0.25, Math.hypot(cl * Math.cos(dl), sv * cl * Math.sin(dl))), ry = sz * Math.max(0.3, z);
        ctx.moveTo(x + Math.cos(ang) * rx, y + Math.sin(ang) * rx);
        ctx.ellipse(x, y, rx, ry, ang, 0, TAU);
      }
      ctx.fill();
    }
    oval(ctx, -0.38, -0.36, 0.22, 0.14, -0.7, rad(ctx, -0.38, -0.36, 0, 0.22, [[0, "rgba(255,255,255,.22)"], [1, "rgba(255,255,255,0)"]]));
    ctx.restore();
  }
  sphereShade(ctx, 0, 0, 1, 0.85);
};

/* ── Moon ────────────────────────────────────────────────────────────────────────────────────── */

/** Near-side maria (x, y, r) and the brightest craters, in disc coordinates. */
const MARIA: number[][] = [[-0.45, -0.05, 0.32], [-0.3, 0.12, 0.22], [-0.25, -0.4, 0.24], [0.12, -0.38, 0.14], [0.25, -0.12, 0.17], [0.6, -0.3, 0.1], [0.45, 0.15, 0.12], [-0.2, 0.35, 0.13], [-0.45, 0.35, 0.08], [0.3, 0.25, 0.07], [0.05, -0.65, 0.12], [-0.25, -0.62, 0.1]];
const CRATERS: number[][] = Array.from({ length: 70 }, () => { const a = R() * TAU, rr = Math.sqrt(R()) * 0.94; return [Math.cos(a) * rr, Math.sin(a) * rr, 0.008 + Math.pow(R(), 3) * 0.07]; });

/** The Moon's near side (it always faces us), with a slight libration wobble. */
export const moon: Glyph = (g) => {
  const { ctx, t, px } = g;
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0.1, 1, [[0, "#E4E2DE"], [0.75, "#C4C2BE"], [1, "#9C9A96"]], -0.3, -0.3));
  ctx.save(); ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.clip();
  ctx.translate(0.03 * Math.sin(t * 0.11), 0.02 * Math.sin(t * 0.07));
  for (const [x, y, r] of MARIA) disc(ctx, x, y, r * 1.2, rad(ctx, x, y, 0, r * 1.2, [[0, "rgba(104,102,108,.55)"], [0.55, "rgba(108,106,112,.42)"], [1, "rgba(110,108,114,0)"]]));
  if (g.r > 20) {
    for (const [x, y, r] of CRATERS) {
      disc(ctx, x, y, r, "rgba(110,108,106,.16)");
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, Math.PI * 0.15, Math.PI * 0.85); stroke(ctx, "rgba(70,68,66,.22)", Math.max(px * 0.8, r * 0.18));
      ctx.beginPath(); ctx.arc(x, y, r * 0.9, Math.PI * 1.05, Math.PI * 1.75); stroke(ctx, "rgba(250,248,242,.25)", Math.max(px * 0.8, r * 0.15));
    }
    // Tycho and its bright ray system
    ctx.beginPath();
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU + 0.2; ctx.moveTo(-0.12, 0.72); ctx.lineTo(-0.12 + Math.cos(a) * (0.4 + (i % 3) * 0.25), 0.72 + Math.sin(a) * (0.4 + (i % 3) * 0.25)); }
    stroke(ctx, "rgba(250,248,240,.1)", Math.max(px, 0.02));
    disc(ctx, -0.12, 0.72, 0.035, "#F4F2EC");
    disc(ctx, -0.3, -0.12, 0.03, "rgba(244,242,236,.8)");
  }
  ctx.restore();
  sphereShade(ctx, 0, 0, 1, 0.7);
};

/* ── Jupiter ─────────────────────────────────────────────────────────────────────────────────── */

/** Belts and zones from north to south: [top latitude°, colour]. */
const BANDS: [number, string][] = [[90, "#B6A48E"], [52, "#C8AE90"], [38, "#E0C8A4"], [28, "#B08460"], [20, "#E6D2B0"], [8, "#EFE2C8"], [-6, "#A87650"], [-18, "#E0C8A6"], [-30, "#B49070"], [-40, "#D2BC9C"], [-55, "#ACA088"]];
const OVALS: [number, number, number][] = [[-33, 0.4, 0.05], [-33, 1.6, 0.045], [-33, 2.9, 0.04], [24, 2.2, 0.035]];

/** Jupiter's 10-hour day: banded clouds and the Great Red Spot rotating into view. */
export const jupiter: Glyph = (g) => {
  const { ctx, t } = g;
  const rot = t * (TAU / 26), F = 0.935;
  ctx.save(); ctx.scale(1, F);
  ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU); ctx.clip();
  for (let i = 0; i < BANDS.length; i++) {
    const [lat, col] = BANDS[i], next = i + 1 < BANDS.length ? BANDS[i + 1][0] : -90;
    const y0 = -Math.sin(lat * D2R), y1 = -Math.sin(next * D2R);
    ctx.beginPath();
    for (let k = 0; k <= 24; k++) { const x = -1 + k / 12, w = 0.012 * Math.sin(x * 9 + rot * 3 + i * 2); k ? ctx.lineTo(x, y0 + w) : ctx.moveTo(x, y0 + w); }
    ctx.lineTo(1, y1 + 0.04); ctx.lineTo(-1, y1 + 0.04); ctx.closePath();
    ctx.fillStyle = col; ctx.fill();
  }
  if (g.r > 14) {
    const spot = (lat: number, lon: number, rx: number, ry: number, c0: string, c1: string) => {
      const z = Math.cos(lon + rot);
      if (z <= 0.05) return;
      const x = Math.cos(lat * D2R) * Math.sin(lon + rot), y = -Math.sin(lat * D2R);
      oval(ctx, x, y, rx * z, ry, 0, rad(ctx, x, y, 0, Math.max(rx * z, ry), [[0, c0], [0.7, c1], [1, "rgba(0,0,0,0)"]]));
    };
    spot(-22, 0, 0.15, 0.08, "#C4603C", "rgba(214,140,100,.8)");
    for (const [lat, lon, s] of OVALS) spot(lat, lon, s * 1.4, s, "rgba(250,244,232,.9)", "rgba(250,244,232,.4)");
  }
  ctx.restore();
  ctx.save(); ctx.scale(1, F); sphereShade(ctx, 0, 0, 1, 0.75); ctx.restore();
};

/* ── Sun ─────────────────────────────────────────────────────────────────────────────────────── */

const GRANS: [number, number, number][] = Array.from({ length: 320 }, () => { const a = R() * TAU, rr = Math.sqrt(R()) * 0.97; return [Math.cos(a) * rr, Math.sin(a) * rr, R() * TAU]; });
const SPOTS: [number, number, number][] = [[14, 0.3, 0.05], [-11, 1.4, 0.035], [18, 2.6, 0.03], [-16, 4.2, 0.045]];
const PROMS: [number, number][] = [[0.6, 0.12], [2.3, 0.09], [4.1, 0.14], [5.4, 0.08]];

/** The Sun: limb-darkened disc, shimmering granulation, sunspots carried by its rotation, prominences, corona. */
export const sun: Glyph = (g) => {
  const { ctx, t, px } = g;
  const pulse = 1 + 0.03 * Math.sin(t * 0.6);
  disc(ctx, 0, 0, 1.7 * pulse, rad(ctx, 0, 0, 0.95, 1.7 * pulse, [[0, "rgba(255,214,120,.55)"], [0.3, "rgba(255,190,90,.18)"], [1, "rgba(255,170,70,0)"]]));
  if (g.r > 20) {
    for (const [a, h] of PROMS) {
      const aa = a + 0.05 * Math.sin(t * 0.3 + a), hh = h * (0.85 + 0.15 * Math.sin(t * 0.5 + a * 3));
      ctx.beginPath(); ctx.arc(Math.cos(aa), Math.sin(aa), hh * 0.7, aa - Math.PI * 0.5, aa + Math.PI * 0.5);
      stroke(ctx, "rgba(255,110,60,.18)", Math.max(px * 4, 0.05));
      stroke(ctx, "rgba(255,150,90,.5)", Math.max(px * 1.5, 0.016));
    }
  }
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0, 1, [[0, "#FFF8E0"], [0.55, "#FFE08A"], [0.85, "#FBB040"], [1, "#E07A1E"]]));
  if (g.r > 30) {
    const s = Math.max(px * 1.6, 0.03);
    for (let b = 0; b < 3; b++) {
      ctx.fillStyle = `rgba(255,250,230,${0.12 + 0.1 * Math.sin(t * 1.1 + b * 2.1)})`;
      ctx.beginPath();
      for (let i = b; i < GRANS.length; i += 3) { const [x, y] = GRANS[i]; ctx.moveTo(x + s, y); ctx.arc(x, y, s, 0, TAU); }
      ctx.fill();
    }
  }
  if (g.r > 12) {
    const rot = t * (TAU / 60);
    for (const [lat, lon, s] of SPOTS) {
      const z = Math.cos(lon + rot);
      if (z <= 0.1) continue;
      const x = Math.cos(lat * D2R) * Math.sin(lon + rot), y = -Math.sin(lat * D2R);
      oval(ctx, x, y, s * 1.8 * z, s * 1.8, 0, "rgba(176,90,30,.55)");
      oval(ctx, x, y, s * z, s, 0, "rgba(70,30,14,.85)");
    }
  }
  glow(ctx, 0, 0, 1, "255,255,240", 0.08);
};
