import type { BaseWorld, Sandbox } from "../types";
import { TAU, fmtNum, fmtYears, note, rng } from "../core";
import { FONT } from "../draw";

/** Units: G = 1, Milky Way mass = 1, 1 length unit ≈ 40,000 ly, 1 time unit = 100 Myr. */
type P = { stars: number; mass: number; dm: number };

interface Core {
  x: number; y: number; vx: number; vy: number; m: number;
  o: number; os?: number[]; ax: number; ay: number;
}
interface W extends BaseWorld {
  cores: Core[];
  /** Stars packed as [x, y, vx, vy] per star. Test particles: feel cores only. */
  s: Float64Array;
  /** Owner galaxy index per star (for colour). */
  o: Uint8Array;
}

const EPS2 = 0.01;
const COLORS = ["#BCD0FF", "#FFCF9E", "#B8F5CF"];

function addGalaxy(w: W, cx: number, cy: number, vx: number, vy: number, m: number, dir: number, n: number, owner: number) {
  w.cores.push({ x: cx, y: cy, vx, vy, m, o: owner, ax: 0, ay: 0 });
  const start = w.o.length;
  const s = new Float64Array((start + n) * 4);
  const o = new Uint8Array(start + n);
  s.set(w.s);
  o.set(w.o);
  for (let i = 0; i < n; i++) {
    const r = 0.12 + 1.25 * Math.sqrt(rng(w)), a = rng(w) * TAU;
    const v = (r * Math.sqrt(m)) / Math.pow(r * r + EPS2, 0.75);
    const j = (start + i) * 4;
    s[j] = cx + r * Math.cos(a);
    s[j + 1] = cy + r * Math.sin(a);
    s[j + 2] = vx - dir * v * Math.sin(a);
    s[j + 3] = vy + dir * v * Math.cos(a);
    o[start + i] = owner;
  }
  w.s = s;
  w.o = o;
}

const coreOf = (w: W, o: number) => w.cores.find((c) => c.o === o || (c.os && c.os.includes(o)));
const owns = (c: Core, o: number) => (c.os ?? [c.o]).includes(o);

export const galaxy: Sandbox<W, P> = {
  key: "galaxy",
  name: "Galaxies",
  sub: "Collisions",
  intro: "The Milky Way and Andromeda, on their real collision course, sped up. Each dot is a star.",
  controls: [
    { type: "range", id: "stars", label: "Stars per galaxy", min: 300, max: 1500, step: 100, val: 900 },
    { type: "range", id: "mass", label: "Andromeda mass", min: 0.5, max: 2, step: 0.1, val: 1.2, unit: "× Milky Way" },
    { type: "range", id: "dm", label: "Dark matter", min: 0.5, max: 2, step: 0.1, val: 1, unit: "×" },
  ],
  whatifs: [
    ["headon", "Aim Andromeda dead centre"],
    ["miss", "Andromeda flies past"],
    ["nodm", "Dark matter vanishes"],
    ["bh", "A galaxy-heavy black hole appears at our centre"],
    ["third", "A third galaxy joins"],
    ["freeze", "Milky Way stars stop orbiting"],
  ],
  speeds: [[0.5, "50 Myr/s"], [1.5, "150 Myr/s"], [4, "400 Myr/s"], [10, "1 Gyr/s"]],
  defaultSpeed: 1,
  fmtT: (t) => fmtYears(t * 1e8),
  metrics: [
    { k: "sep", label: "Separation", unit: "kly", fmt: (v) => fmtNum(v) },
    { k: "disc", label: "Stars in a disc", unit: "%", fmt: (v) => fmtNum(v) },
    { k: "thrown", label: "Stars thrown out", unit: "%", fmt: (v) => fmtNum(v, 1) },
  ],

  init(p, seed) {
    const w: W = { t: 0, rs: seed, log: [], f: {}, cores: [], s: new Float64Array(0), o: new Uint8Array(0) };
    const m0 = p.dm, m1 = p.mass * p.dm, M = m0 + m1;
    const dx = 7.5, dy = -3.2, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const rvx = ux * 0.28 - uy * 0.1, rvy = uy * 0.28 + ux * 0.1;
    addGalaxy(w, 0, 0, (-m1 / M) * rvx, (-m1 / M) * rvy, m0, 1, p.stars, 0);
    addGalaxy(w, -dx, -dy, (m0 / M) * rvx, (m0 / M) * rvy, m1, -1, p.stars, 1);
    note(w, "Andromeda is closing in at about 110 km/s");
    return w;
  },

  step(w, dt) {
    const n = Math.ceil(dt / 0.02), h = dt / n, C = w.cores, s = w.s, N = w.o.length;
    for (let k = 0; k < n; k++) {
      for (const c of C) { c.ax = 0; c.ay = 0; }
      for (let i = 0; i < C.length; i++)
        for (let j = i + 1; j < C.length; j++) {
          const a = C[i], b = C[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy + 0.09, inv = 1 / (d2 * Math.sqrt(d2));
          a.ax += b.m * dx * inv; a.ay += b.m * dy * inv; b.ax -= a.m * dx * inv; b.ay -= a.m * dy * inv;
          // crude dynamical friction so close cores eventually merge
          const dd = Math.sqrt(d2);
          if (dd < 2.5) {
            const Mt = a.m + b.m, vx = (a.m * a.vx + b.m * b.vx) / Mt, vy = (a.m * a.vy + b.m * b.vy) / Mt, f = 1 - (0.35 * h * (2.5 - dd)) / 2.5;
            a.vx = vx + (a.vx - vx) * f; a.vy = vy + (a.vy - vy) * f; b.vx = vx + (b.vx - vx) * f; b.vy = vy + (b.vy - vy) * f;
          }
        }
      for (const c of C) { c.vx += c.ax * h; c.vy += c.ay * h; c.x += c.vx * h; c.y += c.vy * h; }
      for (let i = 0; i < N; i++) {
        const j = i * 4;
        let ax = 0, ay = 0;
        for (const c of C) {
          const dx = c.x - s[j], dy = c.y - s[j + 1], d2 = dx * dx + dy * dy + EPS2, inv = c.m / (d2 * Math.sqrt(d2));
          ax += dx * inv; ay += dy * inv;
        }
        s[j + 2] += ax * h; s[j + 3] += ay * h; s[j] += s[j + 2] * h; s[j + 1] += s[j + 3] * h;
      }
      for (let i = 0; i < C.length; i++)
        for (let j = i + 1; j < C.length; j++) {
          const a = C[i], b = C[j];
          if (Math.hypot(b.x - a.x, b.y - a.y) < 0.18) {
            const Mt = a.m + b.m;
            const both = (owns(a, 0) && owns(b, 1)) || (owns(a, 1) && owns(b, 0));
            a.vx = (a.m * a.vx + b.m * b.vx) / Mt; a.vy = (a.m * a.vy + b.m * b.vy) / Mt;
            a.x = (a.m * a.x + b.m * b.x) / Mt; a.y = (a.m * a.y + b.m * b.y) / Mt; a.m = Mt;
            a.os = [...(a.os ?? [a.o]), ...(b.os ?? [b.o])];
            C.splice(j, 1);
            note(w, both ? 'The cores merge: one giant elliptical galaxy, "Milkomeda"' : "Another galaxy is swallowed");
            j--;
          }
        }
    }
    w.t += dt;
    const a = coreOf(w, 0), b = coreOf(w, 1);
    if (a && b && a !== b) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 1.8) note(w, "First pass: the galaxies plunge through each other", "p1");
      if (w.f.p1 && d > 3.5) note(w, "They swing apart, trailing long tidal tails of stars", "tails");
    }
  },

  apply(w, id, p) {
    const a = coreOf(w, 0), b = coreOf(w, 1);
    const kick = (o: number, dvx: number, dvy: number) => {
      const c = coreOf(w, o);
      if (!c) return;
      c.vx += dvx; c.vy += dvy;
      for (let i = 0; i < w.o.length; i++) if (w.o[i] === o) { w.s[i * 4 + 2] += dvx; w.s[i * 4 + 3] += dvy; }
    };
    if ((id === "headon" || id === "miss") && a && b && a !== b) {
      const dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy), rv = Math.max(Math.hypot(b.vx - a.vx, b.vy - a.vy), 0.3);
      const nv = id === "headon" ? [(dx / d) * rv, (dy / d) * rv] : [(-dy / d) * 0.95 + (dx / d) * 0.1, (dx / d) * 0.95 + (dy / d) * 0.1];
      kick(1, a.vx + nv[0] - b.vx, a.vy + nv[1] - b.vy);
      note(w, id === "headon" ? "Andromeda turns straight for our centre" : "Andromeda is nudged onto a fly-by path");
    }
    if (id === "nodm") { w.cores.forEach((c) => (c.m *= 0.3)); note(w, "Dark matter vanishes: gravity drops to 30%, stars are suddenly too fast"); }
    if (id === "bh" && a) { a.m += 1.5 * p.dm; note(w, "A black hole as heavy as a galaxy appears at the Milky Way’s centre"); }
    if (id === "third") {
      let M = 0, cx = 0, cy = 0;
      w.cores.forEach((c) => { M += c.m; cx += c.m * c.x; cy += c.m * c.y; });
      addGalaxy(w, cx / M + 7, cy / M - 6, -0.22, 0.2, 0.45 * p.dm, 1, Math.round(p.stars / 2), 2);
      note(w, "A third galaxy (like Triangulum) falls in");
    }
    if (id === "freeze" && a) {
      for (let i = 0; i < w.o.length; i++) if (w.o[i] === 0) { w.s[i * 4 + 2] = a.vx; w.s[i * 4 + 3] = a.vy; }
      note(w, "Every Milky Way star stops orbiting");
    }
  },

  read(w) {
    const a = coreOf(w, 0), b = coreOf(w, 1), s = w.s, N = w.o.length;
    let bound = 0, out = 0;
    for (let i = 0; i < N; i++) {
      const j = i * 4;
      let best = w.cores[0], bd = Infinity;
      for (const c of w.cores) { const d = Math.hypot(c.x - s[j], c.y - s[j + 1]); if (d < bd) { bd = d; best = c; } }
      const E = 0.5 * ((s[j + 2] - best.vx) ** 2 + (s[j + 3] - best.vy) ** 2) - best.m / Math.sqrt(bd * bd + EPS2);
      if (E < 0 && bd < 3) bound++;
      else if (bd > 5 && E > 0) out++;
    }
    return { sep: a && b && a !== b ? Math.hypot(a.x - b.x, a.y - b.y) * 40 : 0, disc: (bound / N) * 100, thrown: (out / N) * 100 };
  },

  draw({ ctx, w: W, h: H }, w) {
    ctx.fillStyle = "#04060D";
    ctx.fillRect(0, 0, W, H);
    let M = 0, cx = 0, cy = 0;
    w.cores.forEach((c) => { M += c.m; cx += c.m * c.x; cy += c.m * c.y; });
    cx /= M; cy /= M;
    const sc = Math.min(W, H) / 2 / 8.5, s = w.s;
    ctx.globalAlpha = 0.8;
    COLORS.forEach((col, o) => {
      ctx.fillStyle = col;
      for (let i = 0; i < w.o.length; i++) {
        if (w.o[i] !== o) continue;
        const x = W / 2 + (s[i * 4] - cx) * sc, y = H / 2 + (s[i * 4 + 1] - cy) * sc;
        if (x > -2 && x < W && y > -2 && y < H) ctx.fillRect(x, y, 1.4, 1.4);
      }
    });
    ctx.globalAlpha = 1;
    w.cores.forEach((c) => {
      const x = W / 2 + (c.x - cx) * sc, y = H / 2 + (c.y - cy) * sc, g = ctx.createRadialGradient(x, y, 0, x, y, 10);
      g.addColorStop(0, "rgba(255,248,230,.95)");
      g.addColorStop(1, "rgba(255,248,230,0)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, 10, 0, TAU); ctx.fill();
    });
    ctx.fillStyle = "rgba(143,152,188,.9)";
    ctx.font = "11px " + FONT.mono;
    ctx.fillText("100,000 light-years", 14, H - 16);
    ctx.fillRect(14, H - 12, 2.5 * sc, 2);
  },
};
