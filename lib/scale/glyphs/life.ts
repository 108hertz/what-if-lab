import { TAU } from "../../sim/core";
import { type G, type Glyph, chain, disc, ell, lin, limb, oval, poly, seeded, silhouette, stroke } from "./common";

/*
 * Animals and people, side-on (people face us), drawn to their real length or height inside the
 * object's box. Ground is y = 1. Light comes from the upper left; dark bodies get a rim light so they
 * read on the dark stage.
 */

type Ctx = CanvasRenderingContext2D;
const rimOff = (g: G) => Math.max(g.px * 1.3, 0.008);

/* ── Insects ─────────────────────────────────────────────────────────────────────────────────── */

/** A red-brown worker ant: head, thorax, petiole and gaster, six legs shuffling, antennae sweeping. */
export const ant: Glyph = (g) => {
  const { ctx, t, px } = g;
  const lw = Math.max(px * 1.1, 0.022);
  const legs = (far: boolean) => {
    const base: [number, number, number][] = [[0.17, 0.2, 0.2], [0.05, 0.03, 0], [-0.08, -0.18, -0.3]];
    base.forEach(([ax, kx, fx], i) => {
      const ph = t * 3.2 + (i % 2 ? Math.PI : 0) + (far ? Math.PI : 0), dx = 0.035 * Math.sin(ph), lift = 0.03 * Math.max(0, Math.cos(ph));
      const o = far ? -0.04 : 0;
      ctx.beginPath(); ctx.moveTo(ax + o, 0.72); ctx.lineTo(ax + kx + o + dx * 0.5, 0.55 - lift); ctx.lineTo(ax + fx + o + dx, 0.99 - lift);
      stroke(ctx, far ? "#2A140A" : "#4A2414", lw);
    });
  };
  legs(true);
  const wig = 0.04 * Math.sin(t * 1.7), wig2 = 0.05 * Math.sin(t * 2.3 + 1);
  ctx.beginPath(); ctx.moveTo(0.5, 0.5); ctx.lineTo(0.6, 0.27 + wig); ctx.lineTo(0.88, 0.3 + wig2);
  stroke(ctx, "#4A2414", lw * 0.8);
  silhouette(ctx, (c) => {
    ell(c, -0.55, 0.72, 0.34, 0.21, -0.12);
    ell(c, -0.17, 0.69, 0.05, 0.065);
    limb(c, -0.12, 0.71, 0.06, 0.22, 0.64, 0.085);
    ell(c, 0.44, 0.6, 0.15, 0.12, 0.15);
    limb(c, 0.55, 0.66, 0.032, 0.67, 0.71, 0.012);
  }, lin(ctx, 0, 0.45, 0, 0.95, [[0, "#9A5030"], [0.5, "#6E3218"], [1, "#3A180A"]]), "#D79A72", rimOff(g));
  legs(false);
  oval(ctx, -0.63, 0.62, 0.15, 0.045, -0.15, "rgba(255,226,206,.32)");
  oval(ctx, 0.47, 0.57, 0.04, 0.032, 0, "#1E0C06");
};

/** A honeybee hovering: striped abdomen, fuzzy thorax, wings beating as a blur. */
export const bee: Glyph = (g) => {
  const { ctx, t, px } = g;
  ctx.translate(0, 0.04 * Math.sin(t * 2.1));
  ctx.rotate(0.06 * Math.sin(t * 1.3));
  // Wings behind the body: three ghost positions read as a fast beat
  for (let k = 0; k < 3; k++) {
    const a = -2.2 + 0.45 * Math.sin(t * 23 + k * 2.1);
    ctx.save(); ctx.translate(0.1, -0.2); ctx.rotate(a);
    oval(ctx, 0.3, 0, 0.32, 0.11, 0, "rgba(214,226,240,.2)");
    oval(ctx, 0.22, 0.12, 0.2, 0.07, 0.15, "rgba(214,226,240,.16)");
    ctx.restore();
  }
  const lw = Math.max(px, 0.02);
  for (const [x0, x1, y1] of [[0.2, 0.32, 0.36], [0.12, 0.12, 0.4], [0.03, -0.12, 0.42]]) {
    ctx.beginPath(); ctx.moveTo(x0, 0.12); ctx.lineTo((x0 + x1) / 2 + 0.03, 0.27); ctx.lineTo(x1, y1); stroke(ctx, "#2A1C10", lw);
  }
  oval(ctx, -0.09, 0.33, 0.04, 0.06, 0.2, "#E89A3A");
  // Abdomen with bands
  ctx.save();
  ctx.beginPath(); ell(ctx, -0.4, 0.05, 0.42, 0.28, 0.12); ctx.clip();
  ctx.fillStyle = "#E3AE3C"; ctx.fillRect(-0.9, -0.3, 0.9, 0.7);
  ctx.fillStyle = "#33210F";
  for (const x of [-0.72, -0.5, -0.28]) { ctx.save(); ctx.translate(x, 0.05); ctx.rotate(0.12); ctx.fillRect(-0.05, -0.4, 0.1, 0.8); ctx.restore(); }
  ctx.fillRect(-0.92, -0.3, 0.1, 0.7);
  ctx.fillStyle = lin(ctx, 0, -0.25, 0, 0.33, [[0, "rgba(255,240,200,.25)"], [0.5, "rgba(0,0,0,0)"], [1, "rgba(20,10,4,.5)"]]);
  ctx.fillRect(-0.9, -0.3, 0.9, 0.7);
  ctx.restore();
  ctx.beginPath(); ctx.moveTo(-0.8, 0.06); ctx.lineTo(-0.9, 0.13); ctx.lineTo(-0.79, 0.12); ctx.fillStyle = "#2A1C10"; ctx.fill();
  // Fuzzy thorax
  disc(ctx, 0.14, -0.04, 0.22, lin(ctx, 0, -0.26, 0, 0.18, [[0, "#C8964E"], [1, "#6E4A20"]]));
  if (g.r > 30) {
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU, x = 0.14 + Math.cos(a) * 0.2, y = -0.04 + Math.sin(a) * 0.2;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 0.05, y + Math.sin(a) * 0.05); stroke(ctx, "rgba(214,170,100,.6)", Math.max(px * 0.8, 0.01));
    }
  }
  oval(ctx, 0.43, 0.02, 0.12, 0.15, 0.2, "#2E2218");
  oval(ctx, 0.44, -0.02, 0.055, 0.1, 0.15, "#16100A");
  oval(ctx, 0.42, -0.06, 0.015, 0.03, 0.15, "rgba(255,240,220,.5)");
  ctx.beginPath(); ctx.moveTo(0.5, -0.1); ctx.lineTo(0.6, -0.3); ctx.lineTo(0.72, -0.26); stroke(ctx, "#2A1C10", lw);
};

/* ── Small mammals ───────────────────────────────────────────────────────────────────────────── */

/** A house mouse: round body, big ear, pointed snout with whiskers, long thin tail. */
export const mouse: Glyph = (g) => {
  const { ctx, t, px } = g;
  const br = 1 + 0.025 * Math.sin(t * 5), tw = 0.006 * Math.sin(t * 14);
  ctx.beginPath(); ctx.moveTo(-0.28, 0.86);
  ctx.bezierCurveTo(-0.55, 0.98, -0.75, 0.8 + 0.03 * Math.sin(t * 1.3), -1, 0.9 + 0.04 * Math.sin(t * 1.3 + 1));
  stroke(ctx, "#B89590", Math.max(px, 0.022));
  silhouette(ctx, (c) => {
    ell(c, 0.0, 0.76, 0.34, 0.23 * br, -0.05);
    ell(c, 0.36, 0.78, 0.2, 0.15, 0.2);
    limb(c, 0.45, 0.8, 0.11, 0.67, 0.88 + tw, 0.022);
    ell(c, 0.3, 0.98, 0.06, 0.02);
    ell(c, -0.16, 0.98, 0.08, 0.022);
  }, lin(ctx, 0, 0.52, 0, 1, [[0, "#BCB0A2"], [0.6, "#8C7F72"], [1, "#5E5348"]]), "#E6DCCF", rimOff(g));
  oval(ctx, 0.05, 0.93, 0.25, 0.05, 0, "rgba(232,222,206,.4)");
  disc(ctx, 0.3, 0.6, 0.1, "#A89A8C");
  disc(ctx, 0.31, 0.605, 0.065, "#E2A8A2");
  disc(ctx, 0.5, 0.75, 0.026, "#120C08");
  disc(ctx, 0.494, 0.742, 0.008, "rgba(255,255,255,.7)");
  disc(ctx, 0.675, 0.88 + tw, 0.017, "#D88E8A");
  if (g.r > 24) {
    for (const [dx, dy] of [[0.16, -0.06], [0.18, 0], [0.15, 0.06]]) { ctx.beginPath(); ctx.moveTo(0.63, 0.86); ctx.lineTo(0.63 + dx, 0.86 + dy); stroke(ctx, "rgba(240,232,220,.55)", Math.max(px * 0.7, 0.004)); }
  }
};

/** A meerkat standing sentinel on its hind legs, tail as a prop, head turning to scan. */
export const meerkat: Glyph = (g) => {
  const { ctx, t, px } = g;
  const scan = Math.sin(t * 0.45), dir = Math.abs(scan) < 0.2 ? scan * 5 : Math.sign(scan);
  const br = 1 + 0.012 * Math.sin(t * 2.4);
  const fill = lin(ctx, 0, -1, 0, 1, [[0, "#E0C79E"], [0.5, "#C3A273"], [1, "#8C6E48"]]);
  silhouette(ctx, (c) => {
    chain(c, [[-0.1, 0.7, 0.05], [-0.36, 0.92, 0.038], [-0.62, 0.98, 0.016]]);
    ell(c, 0, 0.27, 0.2 * br, 0.52);
    ell(c, 0.01, -0.25, 0.15 * br, 0.33);
    limb(c, 0.0, -0.48, 0.12, 0.02, -0.7, 0.085);
    ell(c, -0.02, 0.72, 0.16, 0.2);
    ell(c, 0.08, 0.97, 0.13, 0.035);
    chain(c, [[0.08, -0.38, 0.045], [0.16, -0.24, 0.034], [0.13, -0.1, 0.026]]);
  }, fill, "#F4E4C8", rimOff(g));
  oval(ctx, 0.05, 0.15, 0.1, 0.42, 0, "rgba(246,232,206,.35)");
  ctx.save();
  ctx.translate(0.02, -0.82);
  ctx.scale(Math.abs(dir) < 0.35 ? 0.35 * Math.sign(dir || 1) : dir, 1);
  silhouette(ctx, (c) => {
    ell(c, 0, 0, 0.12, 0.1);
    limb(c, 0.04, 0.01, 0.07, 0.21, 0.045, 0.026);
    ell(c, -0.07, -0.07, 0.032, 0.026);
  }, fill, "#F4E4C8", rimOff(g));
  oval(ctx, 0.06, -0.01, 0.04, 0.028, -0.2, "#3A2A1A");
  disc(ctx, 0.065, -0.012, 0.012, "#0E0905");
  disc(ctx, 0.215, 0.045, 0.018, "#2A1C12");
  ctx.restore();
  if (g.r > 40) for (const y of [-0.05, 0.08, 0.2]) { ctx.beginPath(); ctx.moveTo(-0.17, y); ctx.quadraticCurveTo(-0.1, y + 0.03, -0.05, y); stroke(ctx, "rgba(110,84,52,.35)", Math.max(px, 0.012)); }
};

/* ── People (front view) ─────────────────────────────────────────────────────────────────────── */

interface Body {
  head: number; shoulder: number; crotch: number; shorts: boolean; limbs: number;
  skin: string; skin2: string; hair: string; top: string; top2: string; legs: string; legs2: string; shoes: string;
}

function person(g: G, b: Body): void {
  const { ctx, t, px } = g;
  const bob = 0.006 * Math.sin(t * 1.6), sway = 0.012 * Math.sin(t * 0.9);
  ctx.translate(0, bob);
  const hy = -1 + b.head / 2, chin = -1 + b.head, sy = chin + b.head * 0.22, hip = b.crotch - 0.12;
  const knee = (b.crotch + 0.95) / 2, wrist = b.crotch + 0.03, elbow = (sy + wrist) / 2 - 0.02, sw = b.shoulder;
  const k = b.limbs;
  const arm = (s: number): [number, number, number][] => [[s * (sw - 0.03), sy + 0.04, 0.045 * k], [s * (sw + 0.025) + sway * s, elbow, 0.034 * k], [s * (sw + 0.035) + sway * 1.6 * s, wrist, 0.026 * k]];
  const leg = (s: number): [number, number, number][] => [[s * 0.075, b.crotch - 0.02, 0.07 * k], [s * 0.07, knee, 0.05 * k], [s * 0.06, 0.93, 0.036 * k]];
  const off = rimOff(g), rim = "rgba(255,237,215,.85)";
  const skin = lin(ctx, -0.3, -1, 0.3, 1, [[0, b.skin], [1, b.skin2]]);
  // Skin: arms, legs, neck, head
  silhouette(ctx, (c) => {
    chain(c, arm(-1)); chain(c, arm(1));
    ell(c, -sw - 0.035 - sway * 1.6, wrist + 0.05, 0.03, 0.05); ell(c, sw + 0.035 + sway * 1.6, wrist + 0.05, 0.03, 0.05);
    chain(c, leg(-1)); chain(c, leg(1));
    limb(c, 0, chin - 0.04, 0.05, 0, sy + 0.02, 0.06);
    ell(c, 0, hy, b.head * 0.36, b.head * 0.5);
  }, skin, rim, off);
  // Clothes
  const topFill = lin(ctx, -0.3, sy, 0.3, b.crotch, [[0, b.top], [1, b.top2]]);
  silhouette(ctx, (c) => {
    c.moveTo(-sw, sy); c.lineTo(sw, sy); c.lineTo(sw * 0.75, sy + (hip - sy) * 0.5); c.lineTo(sw * 0.72, hip + 0.02); c.lineTo(-sw * 0.72, hip + 0.02); c.lineTo(-sw * 0.75, sy + (hip - sy) * 0.5); c.closePath();
    limb(c, -(sw - 0.03), sy + 0.04, 0.06, -(sw + 0.01) - sway * 0.5, sy + (elbow - sy) * (b.shorts ? 0.45 : 1.6), 0.042);
    limb(c, sw - 0.03, sy + 0.04, 0.06, sw + 0.01 + sway * 0.5, sy + (elbow - sy) * (b.shorts ? 0.45 : 1.6), 0.042);
  }, topFill, rim, off);
  const legEnd = b.shorts ? b.crotch + (knee - b.crotch) * 0.75 : 0.92;
  silhouette(ctx, (c) => {
    c.moveTo(-sw * 0.72, hip); c.lineTo(sw * 0.72, hip); c.lineTo(0.15, b.crotch); c.lineTo(-0.15, b.crotch); c.closePath();
    limb(c, -0.075, b.crotch - 0.03, 0.085 * k, -0.07, legEnd, 0.06 * k);
    limb(c, 0.075, b.crotch - 0.03, 0.085 * k, 0.07, legEnd, 0.06 * k);
  }, lin(ctx, -0.2, hip, 0.2, 1, [[0, b.legs], [1, b.legs2]]), rim, off);
  oval(ctx, -0.07, 0.965, 0.06, 0.032, 0, b.shoes);
  oval(ctx, 0.07, 0.965, 0.06, 0.032, 0, b.shoes);
  // Hair and face
  ctx.save();
  ctx.beginPath(); ell(ctx, 0, hy, b.head * 0.36, b.head * 0.5); ctx.clip();
  oval(ctx, 0, hy - b.head * 0.3, b.head * 0.42, b.head * 0.32, 0, b.hair);
  ctx.restore();
  oval(ctx, 0, hy - b.head * 0.36, b.head * 0.39, b.head * 0.2, 0, b.hair);
  if (g.r > 60) {
    const ey = hy + b.head * 0.02, ex = b.head * 0.13, er = Math.max(px * 1.2, b.head * 0.03);
    disc(ctx, -ex, ey, er, "#1A120C"); disc(ctx, ex, ey, er, "#1A120C");
    ctx.beginPath(); ctx.arc(0, hy + b.head * 0.18, b.head * 0.08, 0.2 * Math.PI, 0.8 * Math.PI); stroke(ctx, "rgba(90,40,30,.6)", Math.max(px, b.head * 0.015));
  }
}

/** A five-year-old: bigger head for the body (about 1/5.5 of height), t-shirt and shorts. */
export const child: Glyph = (g) => person(g, {
  head: 0.36, shoulder: 0.17, crotch: 0.2, shorts: true, limbs: 1.3,
  skin: "#A8714C", skin2: "#7A4E32", hair: "#1E1410", top: "#6FAE7E", top2: "#3F7650", legs: "#5A6E9C", legs2: "#36456E", shoes: "#E4DCCF",
});

/** An adult: head about 1/7.5 of height, shirt and trousers. */
export const human: Glyph = (g) => person(g, {
  head: 0.267, shoulder: 0.2, crotch: 0.06, shorts: false, limbs: 1.1,
  skin: "#E2B590", skin2: "#B58360", hair: "#5A3A22", top: "#5C86A8", top2: "#34546E", legs: "#4A4A58", legs2: "#2C2C36", shoes: "#2E241C",
});

/* ── Large mammals ───────────────────────────────────────────────────────────────────────────── */

interface Quad { coat: [string, string, string]; far: string; rim: string; lion: boolean }

function quadruped(g: G, q: Quad): void {
  const { ctx, t } = g;
  const br = 1 + 0.012 * Math.sin(t * 1.8), tail = 0.1 * Math.sin(t * 1.1), hd = 0.02 * Math.sin(t * 0.5);
  const off = rimOff(g);
  const fill = lin(ctx, 0, -0.4, 0, 1, [[0, q.coat[0]], [0.4, q.coat[1]], [1, q.coat[2]]]);
  silhouette(ctx, (c) => {
    chain(c, [[0.29, 0.12, 0.06], [0.3, 0.55, 0.038], [0.31, 0.95, 0.03]]);
    chain(c, [[-0.44, 0.1, 0.08], [-0.36, 0.42, 0.05], [-0.5, 0.66, 0.032], [-0.47, 0.95, 0.03]]);
    ell(c, 0.33, 0.97, 0.05, 0.028); ell(c, -0.45, 0.97, 0.05, 0.028);
  }, q.far, q.rim, off);
  silhouette(ctx, (c) => {
    ell(c, 0, 0.07, 0.45, 0.21 * br, -0.03);
    ell(c, 0.34, 0.07, 0.21, 0.25 * br, 0.2);
    ell(c, -0.36, 0.04, 0.21, 0.21, 0);
    limb(c, 0.36, -0.02, 0.17, 0.6, -0.2 + hd, 0.11);
    chain(c, [[0.38, 0.12, 0.075], [0.4, 0.55, 0.042], [0.42, 0.95, 0.032]]);
    chain(c, [[-0.36, 0.08, 0.11], [-0.28, 0.42, 0.06], [-0.42, 0.66, 0.035], [-0.38, 0.95, 0.032]]);
    ell(c, 0.45, 0.97, 0.05, 0.03); ell(c, -0.35, 0.97, 0.05, 0.03);
    if (q.lion) chain(c, [[-0.53, -0.02, 0.028], [-0.76, 0.2, 0.022], [-0.86 + tail, 0.46, 0.018]]);
    else chain(c, [[-0.53, -0.02, 0.06], [-0.64 + tail * 0.3, 0.26, 0.075], [-0.68 + tail, 0.55, 0.035]]);
  }, fill, q.rim, off);
  if (q.lion) oval(ctx, -0.86 + tail, 0.5, 0.04, 0.06, 0.2, "#4A2C14");
  if (q.lion) {
    silhouette(ctx, (c) => {
      ell(c, 0.58, -0.2 + hd, 0.2, 0.25, 0.3);
      ell(c, 0.48, -0.02, 0.18, 0.24, 0.5);
    }, lin(ctx, 0.4, -0.45, 0.6, 0.2, [[0, "#A8692E"], [0.6, "#7A4A20"], [1, "#4E2C12"]]), "#E8B878", off);
  }
  ctx.save(); ctx.translate(0, hd);
  silhouette(ctx, (c) => {
    if (q.lion) {
      ell(c, 0.68, -0.25, 0.12, 0.11, 0.1);
      limb(c, 0.7, -0.22, 0.08, 0.87, -0.18, 0.06);
      ell(c, 0.62, -0.35, 0.035, 0.035);
    } else {
      ell(c, 0.66, -0.26, 0.13, 0.1, 0.1);
      limb(c, 0.7, -0.25, 0.075, 0.92, -0.17, 0.035);
      poly(c, [[0.58, -0.31], [0.6, -0.47], [0.68, -0.34]]);
      poly(c, [[0.65, -0.33], [0.7, -0.46], [0.74, -0.31]]);
    }
  }, fill, q.rim, off);
  oval(ctx, q.lion ? 0.8 : 0.82, q.lion ? -0.15 : -0.17, 0.08, 0.035, 0.3, q.lion ? "rgba(246,226,190,.55)" : "rgba(232,228,220,.6)");
  disc(ctx, q.lion ? 0.73 : 0.72, -0.29, 0.016, q.lion ? "#5A3A10" : "#6A4A14");
  disc(ctx, q.lion ? 0.885 : 0.935, q.lion ? -0.2 : -0.18, 0.022, "#1A1210");
  ctx.restore();
}

/** A gray wolf standing, tail swaying. */
export const wolf: Glyph = (g) => quadruped(g, { coat: ["#85878E", "#ABAEB4", "#D4D0C8"], far: "#62646A", rim: "#E6E8EC", lion: false });

/** A male lion: tawny coat, dark mane, tufted tail. */
export const lion: Glyph = (g) => quadruped(g, { coat: ["#BE8644", "#D4A462", "#E6C894"], far: "#8C6232", rim: "#F6D8A8", lion: true });

/** An African elephant: pillar legs, big ear flapping slowly, trunk swaying, tusks. */
export const elephant: Glyph = (g) => {
  const { ctx, t, px } = g;
  const br = 1 + 0.008 * Math.sin(t * 1.2), sw = 0.05 * Math.sin(t * 0.8), flap = 0.85 + 0.15 * Math.sin(t * 0.9);
  const off = rimOff(g), rim = "#E4DED6";
  const fill = lin(ctx, 0, -0.4, 0, 1, [[0, "#ABA59D"], [0.5, "#8A847C"], [1, "#5A554F"]]);
  silhouette(ctx, (c) => {
    limb(c, 0.22, 0.35, 0.11, 0.24, 0.95, 0.1);
    limb(c, -0.5, 0.35, 0.12, -0.47, 0.95, 0.1);
  }, "#57524C", rim, off);
  silhouette(ctx, (c) => {
    ell(c, -0.12, 0.13, 0.6, 0.35 * br, 0.03);
    limb(c, 0.32, 0.35, 0.13, 0.33, 0.95, 0.11);
    limb(c, -0.42, 0.35, 0.14, -0.4, 0.95, 0.11);
    ell(c, 0.33, 0.96, 0.12, 0.04); ell(c, -0.4, 0.96, 0.12, 0.04);
    chain(c, [[-0.7, 0.02, 0.02], [-0.78, 0.45, 0.012]]);
    ell(c, 0.45, -0.05, 0.24, 0.26, 0.2);
    ell(c, 0.5, -0.18, 0.16, 0.14);
    chain(c, [[0.62, 0.05, 0.1], [0.74 + sw * 0.3, 0.35, 0.07], [0.78 + sw * 0.6, 0.65, 0.05], [0.74 + sw, 0.9, 0.04]]);
  }, fill, rim, off);
  oval(ctx, -0.8, 0.48, 0.02, 0.04, 0, "#3A3632");
  ctx.beginPath(); chain(ctx, [[0.6, 0.15, 0.03], [0.74, 0.3, 0.022], [0.87, 0.31, 0.01]]);
  ctx.fillStyle = lin(ctx, 0.6, 0.1, 0.87, 0.35, [[0, "#E8DCC0"], [1, "#FFF6E4"]]); ctx.fill();
  const ear = [[0.42, -0.22], [0.2, -0.28], [0.06, -0.05], [0.1, 0.25], [0.22, 0.4], [0.36, 0.26], [0.42, 0.05]].map(([x, y]) => [0.42 - (0.42 - x) * flap, y]);
  silhouette(ctx, (c) => {
    c.moveTo(ear[0][0], ear[0][1]);
    for (let i = 1; i < ear.length; i++) { const [x0, y0] = ear[i - 1], [x1, y1] = ear[i]; c.quadraticCurveTo(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); }
    c.lineTo(ear[ear.length - 1][0], ear[ear.length - 1][1]); c.closePath();
  }, lin(ctx, 0.1, -0.2, 0.4, 0.4, [[0, "#958F87"], [1, "#605A54"]]), "#C8C2BA", off);
  disc(ctx, 0.6, -0.08, 0.016, "#1E1A16");
  if (g.r > 60) {
    ctx.beginPath();
    for (const y of [0.45, 0.55, 0.65, 0.75]) { ctx.moveTo(0.73 + sw * (y - 0.1), y); ctx.lineTo(0.83 + sw * (y + 0.1), y + 0.02); }
    for (const x of [0.2, 0.28]) { ctx.moveTo(x, -0.1); ctx.quadraticCurveTo(x - 0.06, 0.08, x, 0.24); }
    stroke(ctx, "rgba(60,54,48,.4)", Math.max(px, 0.006));
  }
};

/* ── Whales ──────────────────────────────────────────────────────────────────────────────────── */

const MOTTLE: [number, number, number][] = (() => { const R = seeded(77); return Array.from({ length: 70 }, () => [R() * 1.7 - 0.85, (R() - 0.5) * 0.24, 0.01 + R() * 0.025]); })();

function swim(ctx: Ctx, t: number, rate: number): number {
  ctx.translate(0, 0.02 * Math.sin(t * rate));
  ctx.rotate(0.02 * Math.sin(t * rate + 0.6));
  return 0.22 * Math.sin(t * rate * 1.6);
}

function fluke(ctx: Ctx, x: number, angle: number, span: number, style: string | CanvasGradient): void {
  ctx.save(); ctx.translate(x, 0); ctx.rotate(angle);
  ctx.beginPath();
  ctx.moveTo(0.04, 0);
  ctx.quadraticCurveTo(-0.06, -span * 0.2, -0.17, -span);
  ctx.quadraticCurveTo(-0.12, -span * 0.3, -0.08, 0);
  ctx.quadraticCurveTo(-0.12, span * 0.3, -0.17, span);
  ctx.quadraticCurveTo(-0.06, span * 0.2, 0.04, 0);
  ctx.fillStyle = style; ctx.fill();
  ctx.restore();
}

/** An orca: black and white, tall dorsal fin, swimming. */
export const orca: Glyph = (g) => {
  const { ctx, t } = g;
  const fa = swim(ctx, t, 1.0);
  const body = (c: Ctx) => {
    c.moveTo(1, 0.02);
    c.bezierCurveTo(0.95, 0.16, 0.65, 0.24, 0.25, 0.24);
    c.bezierCurveTo(-0.2, 0.24, -0.55, 0.14, -0.82, 0.04);
    c.lineTo(-0.82, -0.03);
    c.bezierCurveTo(-0.55, -0.14, -0.1, -0.26, 0.35, -0.25);
    c.bezierCurveTo(0.75, -0.24, 0.98, -0.14, 1, 0.02);
    c.closePath();
  };
  const fill = lin(ctx, 0, -0.3, 0, 0.25, [[0, "#2C313C"], [0.6, "#16181E"], [1, "#0C0D11"]]);
  fluke(ctx, -0.8, fa, 0.24, "#14161B");
  silhouette(ctx, (c) => {
    body(c);
    c.moveTo(-0.25, -0.2); c.quadraticCurveTo(-0.1, -0.45, -0.07, -0.8); c.quadraticCurveTo(0.03, -0.5, 0.14, -0.23); c.closePath();
  }, fill, "#7C8698", rimOff(g));
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  oval(ctx, 0.42, 0.24, 0.55, 0.1, -0.04, "#E6E8EC");
  oval(ctx, -0.32, 0.14, 0.2, 0.06, -0.3, "#E2E4E8");
  oval(ctx, -0.12, -0.2, 0.15, 0.04, 0.12, "rgba(160,166,178,.55)");
  ctx.restore();
  oval(ctx, 0.6, -0.1, 0.11, 0.04, -0.12, "#EEF0F2");
  oval(ctx, 0.42, 0.26, 0.13, 0.05, 0.75, "#101216");
};

/** A blue whale: long and slender, mottled blue-grey, throat pleats, a tiny dorsal fin far back. */
export const whale: Glyph = (g) => {
  const { ctx, t, px } = g;
  const fa = swim(ctx, t, 0.6);
  const body = (c: Ctx) => {
    c.moveTo(1, 0);
    c.bezierCurveTo(0.98, 0.12, 0.7, 0.17, 0.3, 0.16);
    c.bezierCurveTo(-0.2, 0.15, -0.6, 0.08, -0.86, 0.025);
    c.lineTo(-0.86, -0.02);
    c.bezierCurveTo(-0.6, -0.07, -0.2, -0.14, 0.3, -0.14);
    c.bezierCurveTo(0.7, -0.14, 0.98, -0.1, 1, 0);
    c.closePath();
  };
  const fill = lin(ctx, 0, -0.15, 0, 0.17, [[0, "#97AECA"], [0.5, "#5F7C9E"], [1, "#8EA4BA"]]);
  fluke(ctx, -0.84, fa, 0.2, "#56708E");
  silhouette(ctx, (c) => {
    body(c);
    c.moveTo(-0.56, -0.08); c.quadraticCurveTo(-0.5, -0.11, -0.47, -0.16); c.quadraticCurveTo(-0.47, -0.11, -0.44, -0.09); c.closePath();
  }, fill, "#D2DEEA", rimOff(g));
  ctx.save(); ctx.beginPath(); body(ctx); ctx.clip();
  if (g.r > 40) for (const [x, y, s] of MOTTLE) oval(ctx, x, y, s * 1.6, s, 0, "rgba(214,226,238,.22)");
  ctx.beginPath();
  for (let i = 0; i < 6; i++) { const y = 0.05 + i * 0.02; ctx.moveTo(0.95 - i * 0.02, y); ctx.lineTo(0.32, y + 0.06); }
  stroke(ctx, "rgba(40,56,80,.35)", Math.max(px * 0.8, 0.004));
  ctx.restore();
  oval(ctx, 0.42, 0.16, 0.16, 0.03, 0.45, "#4E6888");
  disc(ctx, 0.72, 0.02, 0.012, "#1A2230");
};
