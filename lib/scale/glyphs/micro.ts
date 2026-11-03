import { TAU } from "../../sim/core";
import { type Glyph, alpha, disc, glow, lin, oval, rad, seeded, smooth, sphereShade, stroke } from "./common";

/* ── Precomputed decorative sets (deterministic) ─────────────────────────────────────────────── */

const R = seeded(1201);

/** Hydrogen 1s electron: radial density ∝ r² e^(−2r/a₀), with a₀ = 0.42 box units. */
const ELECTRON: [number, number, number][] = [];
for (let i = 0; i < 420; i++) {
  // Gamma(3) sample: sum of three exponentials, scaled by a₀ / 2
  const rr = (-Math.log(R()) - Math.log(R()) - Math.log(R())) * 0.21, a = R() * TAU;
  if (rr < 1.05) ELECTRON.push([Math.cos(a) * rr, Math.sin(a) * rr, R()]);
}

/** Proton sea quarks: brief virtual pairs. */
const SEA: [number, number, number][] = Array.from({ length: 14 }, () => { const a = R() * TAU, rr = 0.2 + R() * 0.6; return [Math.cos(a) * rr, Math.sin(a) * rr, R() * TAU]; });

/** DNA base sequence: 0 = A–T, 1 = T–A, 2 = G–C, 3 = C–G. */
const BASES = Array.from({ length: 16 }, () => Math.floor(R() * 4));
const BASE_COL = [["#E8645A", "#F2C14E"], ["#F2C14E", "#E8645A"], ["#5FA8E8", "#7EE0C3"], ["#7EE0C3", "#5FA8E8"]];

/** Flu spikes on a Fibonacci sphere; ~1 in 6 is neuraminidase. */
const SPIKES: [number, number, number, boolean][] = [];
for (let i = 0, n = 150; i < n; i++) {
  const y = 1 - (2 * (i + 0.5)) / n, rr = Math.sqrt(1 - y * y), a = i * 2.39996;
  SPIKES.push([Math.cos(a) * rr, y, Math.sin(a) * rr, R() < 0.17]);
}

/** E. coli surface pili and ribosome speckles. */
const PILI: [number, number, number][] = Array.from({ length: 46 }, () => [R(), R() * 0.07 + 0.05, (R() - 0.5) * 0.6]);
const SPECK: [number, number][] = Array.from({ length: 70 }, () => [(R() * 2 - 1) * 0.85, (R() * 2 - 1) * 0.17]);

/** Egg cell: corona radiata cells and cytoplasm granules. */
const CORONA: [number, number, number, number][] = Array.from({ length: 78 }, (_, i) => [((i + R() * 0.6) / 78) * TAU, 0.9 + R() * 0.1, 0.055 + R() * 0.035, R() * TAU]);
const GRANULES: [number, number, number][] = Array.from({ length: 140 }, () => { const a = R() * TAU, rr = Math.sqrt(R()) * 0.7; return [a, rr, 0.006 + R() * 0.012]; });

/** Sand: an irregular, slightly rounded quartz grain with facets and inclusions. */
const GRAIN: number[][] = Array.from({ length: 12 }, (_, i) => { const a = (i / 12) * TAU, rr = 0.78 + R() * 0.2; return [Math.cos(a) * rr, Math.sin(a) * rr * 0.86]; });
const INCL: [number, number, number][] = Array.from({ length: 9 }, () => [(R() - 0.5) * 1.1, (R() - 0.5) * 0.9, 0.015 + R() * 0.03]);

/* ── Particles ───────────────────────────────────────────────────────────────────────────────── */

/** Three valence quarks (one of each colour charge) held by a gluon field, with flickering sea quarks. */
export const proton: Glyph = (g) => {
  const { ctx, t, px } = g;
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0, 1, [[0, "rgba(255,150,120,.42)"], [0.55, "rgba(255,120,100,.2)"], [1, "rgba(255,110,90,0)"]]));
  const Q: [number, number, string][] = [0, 1, 2].map((i) => {
    const a = (i / 3) * TAU - Math.PI / 2 + 0.25 * Math.sin(t * 0.7 + i * 2.1);
    const rr = 0.36 + 0.07 * Math.sin(t * 1.3 + i * 1.7);
    return [Math.cos(a) * rr, Math.sin(a) * rr, ["#FF5E5B", "#58D68D", "#5B8CFF"][i]];
  });
  if (g.r > 14) {
    // Gluon flux tubes: a springy line between each pair
    for (let i = 0; i < 3; i++) {
      const [x1, y1] = Q[i], [x2, y2] = Q[(i + 1) % 3], L = Math.hypot(x2 - x1, y2 - y1), nx = -(y2 - y1) / L, ny = (x2 - x1) / L;
      ctx.beginPath();
      for (let k = 0; k <= 40; k++) {
        const s = k / 40, w = Math.sin(s * TAU * 5 - t * 6) * 0.035 * Math.sin(s * Math.PI);
        const x = x1 + (x2 - x1) * s + nx * w, y = y1 + (y2 - y1) * s + ny * w;
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      stroke(ctx, "rgba(255,226,190,.55)", Math.max(px, 0.018));
    }
    for (const [x, y, ph] of SEA) {
      const k = Math.max(0, Math.sin(t * 2.2 + ph));
      if (k > 0.05) disc(ctx, x, y, 0.025 + 0.02 * k, `rgba(255,236,214,${0.5 * k})`);
    }
  }
  for (const [x, y, c] of Q) {
    glow(ctx, x, y, 0.3, "255,220,200", 0.25);
    disc(ctx, x, y, 0.13, rad(ctx, x, y, 0, 0.13, [[0, "#FFFFFF"], [0.35, c], [1, c]], x - 0.04, y - 0.05));
  }
};

/** The 1s electron cloud: a probability haze, with snapshots of where the electron could be. */
export const hydrogen: Glyph = (g) => {
  const { ctx, t, px } = g;
  disc(ctx, 0, 0, 1, rad(ctx, 0, 0, 0, 1, [[0, "rgba(170,190,255,.5)"], [0.25, "rgba(150,175,255,.32)"], [0.6, "rgba(130,160,255,.1)"], [1, "rgba(130,160,255,0)"]]));
  if (g.r > 10) {
    const s = Math.max(px * 1.2, 0.008), ph = t * 0.35;
    ctx.fillStyle = "#DCE4FF";
    for (const [x, y, p] of ELECTRON) {
      const k = (p + ph) % 1;
      if (k < 0.22) { alpha(g, (1 - k / 0.22) * 0.85); ctx.fillRect(x - s / 2, y - s / 2, s, s); }
    }
    alpha(g, 1);
  }
  // The nucleus is 100,000× smaller than the atom: a single point
  glow(ctx, 0, 0, Math.max(px * 6, 0.02), "255,170,150", 0.6);
  disc(ctx, 0, 0, Math.max(px * 1.2, 0.003), "#FFD2C4");
};

/* ── Molecules, viruses, cells ───────────────────────────────────────────────────────────────── */

/** B-DNA: one full turn (3.4 nm) of a 2 nm-wide double helix, slowly turning. Drawn taller than wide. */
export const dna: Glyph = (g) => {
  const { ctx, t, px } = g;
  const H = 1.7, spin = t * 0.8, groove = 2.35, pitch = 3.4;
  const fade = (y: number) => Math.min(1, Math.max(0, (H - Math.abs(y)) / 0.45));
  const at = (y: number, off: number) => { const a = (y / pitch) * TAU + spin + off; return [Math.cos(a) * 0.82, Math.sin(a)] as const; };
  type Seg = { z: number; draw: () => void };
  const segs: Seg[] = [];
  const N = 70;
  for (const off of [0, groove]) {
    for (let k = 0; k < N; k++) {
      const y0 = -H + (2 * H * k) / N, y1 = -H + (2 * H * (k + 1)) / N;
      const [x0, z0] = at(y0, off), [x1, z1] = at(y1, off), z = (z0 + z1) / 2, f = fade((y0 + y1) / 2);
      segs.push({ z, draw: () => {
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
        const l = Math.round(150 + 70 * (z + 1) / 2);
        alpha(g, f); stroke(ctx, `rgb(${l},${l + 6},${l + 18})`, Math.max(px * 2, 0.17));
      } });
    }
  }
  if (g.r > 12) {
    const step = pitch / 10.5;
    for (let i = 0; i * step < 2 * H; i++) {
      const y = -H + step * (i + 0.5), [xa, za] = at(y, 0), [xb, zb] = at(y, groove), [ca, cb] = BASE_COL[BASES[i % BASES.length]], f = fade(y);
      segs.push({ z: (za + zb) / 2 - 0.05, draw: () => {
        const xm = (xa + xb) / 2;
        alpha(g, f * 0.95);
        ctx.beginPath(); ctx.moveTo(xa, y); ctx.lineTo(xm, y); stroke(ctx, ca, Math.max(px * 1.5, 0.09), "butt");
        ctx.beginPath(); ctx.moveTo(xm, y); ctx.lineTo(xb, y); stroke(ctx, cb, Math.max(px * 1.5, 0.09), "butt");
      } });
    }
  }
  segs.sort((p, q) => p.z - q.z).forEach((s) => s.draw());
  alpha(g, 1);
};

/** Influenza: a lipid envelope studded with haemagglutinin rods and neuraminidase mushrooms, tumbling. */
export const flu: Glyph = (g) => {
  const { ctx, t, px } = g;
  const a = t * 0.35, b = 0.45, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(b), sb = Math.sin(b);
  const pts = SPIKES.map(([x, y, z, na]) => {
    const x1 = x * ca + z * sa, z1 = -x * sa + z * ca, y2 = y * cb - z1 * sb, z2 = y * sb + z1 * cb;
    return [x1, y2, z2, na] as [number, number, number, boolean];
  }).sort((p, q) => p[2] - q[2]);
  const spike = ([x, y, z, na]: [number, number, number, boolean]) => {
    const l = Math.round(0.55 + 0.45 * (z + 1) / 2 * 100) / 100;
    ctx.beginPath(); ctx.moveTo(x * 0.76, y * 0.76); ctx.lineTo(x * 0.95, y * 0.95);
    stroke(ctx, na ? `rgba(232,150,128,${l})` : `rgba(140,176,226,${l})`, Math.max(px, 0.03));
    disc(ctx, x * 0.97, y * 0.97, na ? 0.05 : 0.034, na ? `rgba(240,160,136,${l})` : `rgba(160,192,236,${l})`);
  };
  const detail = g.r > 16;
  if (detail) pts.filter((p) => p[2] < 0).forEach(spike);
  disc(ctx, 0, 0, 0.8, rad(ctx, 0, 0, 0.05, 0.8, [[0, "#CFC6DC"], [0.7, "#9C90B4"], [1, "#6A5E84"]], -0.25, -0.3));
  sphereShade(ctx, 0, 0, 0.8, 0.6);
  if (detail) pts.filter((p) => p[2] >= 0).forEach(spike);
  else { ctx.beginPath(); ctx.arc(0, 0, 0.88, 0, TAU); stroke(ctx, "rgba(150,180,226,.7)", 0.12); }
};

/** E. coli: a rod-shaped cell with surface pili and a trailing bundle of whipping flagella. */
export const ecoli: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.rotate(-0.08 + 0.03 * Math.sin(t * 0.9));
  ctx.translate(0.03 * Math.sin(t * 1.4), 0);
  if (g.r > 14) {
    for (let i = 0; i < 5; i++) {
      const y0 = -0.15 + i * 0.075, ph = i * 1.3;
      ctx.beginPath();
      for (let k = 0; k <= 60; k++) {
        const s = k / 60, x = -0.92 - s * 0.85, y = y0 * (1 - s * 0.6) + Math.sin(s * 9 - t * 7 + ph) * 0.07 * Math.min(1, s * 3);
        k ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      stroke(ctx, lin(ctx, -0.9, 0, -1.75, 0, [[0, "rgba(205,214,170,.75)"], [1, "rgba(205,214,170,0)"]]), Math.max(px, 0.012));
    }
    for (const [u, l, tilt] of PILI) {
      const x = -0.75 + u * 1.5, top = u > 0.5, y = top ? -0.25 : 0.25;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + tilt * l, y + (top ? -l : l));
      stroke(ctx, "rgba(196,210,160,.45)", Math.max(px * 0.8, 0.006));
    }
  }
  ctx.beginPath(); ctx.roundRect(-1, -0.25, 2, 0.5, 0.25);
  ctx.fillStyle = lin(ctx, 0, -0.25, 0, 0.25, [[0, "#C3D79A"], [0.45, "#93B26A"], [1, "#5A7740"]]);
  ctx.fill();
  if (g.r > 20) {
    ctx.save(); ctx.clip();
    oval(ctx, 0.05, 0.02, 0.5, 0.1, 0.05, "rgba(232,240,200,.35)");
    ctx.fillStyle = "rgba(70,96,46,.5)";
    const s = Math.max(px, 0.012);
    for (const [x, y] of SPECK) ctx.fillRect(x, y, s, s);
    ctx.restore();
    ctx.beginPath(); ctx.roundRect(-1, -0.25, 2, 0.5, 0.25);
    stroke(ctx, "rgba(220,236,190,.55)", Math.max(px, 0.02));
  }
};

/** Red blood cell: a biconcave disc, tumbling slowly so its dimple shows. */
export const rbc: Glyph = (g) => {
  const { ctx, t } = g;
  const tilt = 0.62 + 0.22 * Math.sin(t * 0.5), ry = Math.max(0.3, Math.cos(tilt)), rot = 0.3 * Math.sin(t * 0.21);
  ctx.rotate(rot);
  oval(ctx, 0, 0, 1, ry, 0, rad(ctx, 0, 0, 0.2, 1, [[0, "#A11E22"], [0.6, "#C8383A"], [0.88, "#E05F58"], [1, "#B42A2D"]], -0.2, -ry * 0.4));
  // The dimple: a darker, softer centre shifted toward the far rim
  oval(ctx, 0, ry * 0.06, 0.56, ry * 0.56, 0, rad(ctx, 0, ry * 0.06, 0, 0.56, [[0, "rgba(110,10,18,.6)"], [0.7, "rgba(120,14,20,.35)"], [1, "rgba(120,14,20,0)"]]));
  ctx.save(); ctx.scale(1, ry);
  ctx.beginPath(); ctx.arc(0, 0, 0.82, Math.PI * 1.05, Math.PI * 1.7);
  stroke(ctx, "rgba(255,170,160,.38)", 0.08);
  ctx.restore();
};

/** Human egg cell under a microscope: corona radiata, zona pellucida, granular cytoplasm, nucleus. */
export const egg: Glyph = (g) => {
  const { ctx, t, px } = g;
  if (g.r > 14) {
    for (const [a, rr, s, ph] of CORONA) {
      const aa = a + 0.01 * Math.sin(t * 0.5 + ph), x = Math.cos(aa) * rr, y = Math.sin(aa) * rr;
      disc(ctx, x, y, s, "rgba(236,214,196,.5)");
      disc(ctx, x + s * 0.15, y, s * 0.4, "rgba(170,130,120,.45)");
    }
  }
  disc(ctx, 0, 0, 0.88, rad(ctx, 0, 0, 0.72, 0.88, [[0, "rgba(250,236,222,.15)"], [0.5, "rgba(250,236,222,.5)"], [1, "rgba(250,236,222,.18)"]]));
  disc(ctx, 0, 0, 0.72, rad(ctx, 0, 0, 0, 0.72, [[0, "#F2D7BC"], [0.7, "#E4BE9E"], [1, "#CFA283"]], -0.2, -0.25));
  if (g.r > 18) {
    const rot = t * 0.04;
    ctx.fillStyle = "rgba(150,104,80,.35)";
    for (const [a, rr, s] of GRANULES) { const aa = a + rot * (1 - rr); ctx.fillRect(Math.cos(aa) * rr, Math.sin(aa) * rr, Math.max(px, s), Math.max(px, s)); }
  }
  disc(ctx, 0.24, -0.16, 0.17, rad(ctx, 0.24, -0.16, 0, 0.17, [[0, "rgba(252,236,220,.9)"], [0.8, "rgba(236,208,184,.8)"], [1, "rgba(200,160,130,.7)"]]));
  disc(ctx, 0.27, -0.18, 0.045, "rgba(170,120,100,.75)");
};

/** A grain of quartz sand: faceted, translucent, with a few mineral inclusions. */
export const sand: Glyph = (g) => {
  const { ctx, t } = g;
  ctx.beginPath(); smooth(ctx, GRAIN);
  ctx.fillStyle = rad(ctx, 0, 0, 0.1, 1, [[0, "#F0DCAA"], [0.55, "#D8B97A"], [1, "#9C7C48"]], -0.3, -0.3);
  ctx.fill();
  ctx.save(); ctx.clip();
  ctx.fillStyle = "rgba(255,246,220,.22)";
  ctx.beginPath(); ctx.moveTo(-0.7, -0.2); ctx.lineTo(-0.1, -0.7); ctx.lineTo(0.25, -0.15); ctx.lineTo(-0.3, 0.2); ctx.fill();
  ctx.fillStyle = "rgba(90,64,30,.22)";
  ctx.beginPath(); ctx.moveTo(0.25, -0.15); ctx.lineTo(0.9, 0.1); ctx.lineTo(0.4, 0.75); ctx.lineTo(-0.3, 0.2); ctx.fill();
  if (g.r > 12) for (const [x, y, s] of INCL) disc(ctx, x, y, s, "rgba(70,52,34,.55)");
  // A glint that slides as the light catches a facet
  const gx = -0.35 + 0.08 * Math.sin(t * 0.3);
  oval(ctx, gx, -0.4, 0.16, 0.05, -0.6, "rgba(255,252,240,.7)");
  ctx.restore();
};
