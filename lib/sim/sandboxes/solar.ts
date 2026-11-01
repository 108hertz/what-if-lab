import type { BaseWorld, InfoBlock, InfoRow, Sandbox } from "../types";
import { TAU, fmtDur, fmtNum, note, rng } from "../core";
import { FONT } from "../draw";

/** Units: AU, years, solar masses → G = 4π². Leapfrog (kick-drift-kick) integrator. */
type P = { sunm: number; view: string };

interface Body {
  n: string; x: number; y: number; vx: number; vy: number; m: number;
  /** Collision radius in AU. */
  cr: number;
  /** Luminosity in Suns (0 for planets). */
  L: number;
  c: string;
  /** Draw radius in px. */
  px: number;
  tr: number[];
  ax: number; ay: number;
  giant?: boolean;
  bh?: boolean;
}
interface W extends BaseWorld { b: Body[] }

const G4 = 4 * Math.PI * Math.PI;
const PLANETS: [string, number, number, string, number][] = [
  ["Mercury", 0.387, 1.66e-7, "#B9AB9C", 2.2], ["Venus", 0.723, 2.45e-6, "#E8C48A", 3], ["Earth", 1, 3.0e-6, "#6FB3FF", 3.4],
  ["Mars", 1.524, 3.2e-7, "#E07A56", 2.6], ["Jupiter", 5.2, 9.55e-4, "#D9B48F", 5], ["Saturn", 9.58, 2.86e-4, "#E9D39A", 4.5],
  ["Uranus", 19.2, 4.37e-5, "#9FE0E6", 3.8], ["Neptune", 30.05, 5.15e-5, "#7B93FF", 3.8],
];
const VIEW_HALF: Record<string, number> = { inner: 1.9, mid: 6, outer: 33 };

function accel(w: W) {
  const b = w.b;
  for (const o of b) { o.ax = 0; o.ay = 0; }
  for (let i = 0; i < b.length; i++)
    for (let j = i + 1; j < b.length; j++) {
      const dx = b[j].x - b[i].x, dy = b[j].y - b[i].y, d2 = dx * dx + dy * dy + 1e-6, inv = G4 / (d2 * Math.sqrt(d2));
      b[i].ax += b[j].m * dx * inv; b[i].ay += b[j].m * dy * inv;
      b[j].ax -= b[i].m * dx * inv; b[j].ay -= b[i].m * dy * inv;
    }
}
const find = (w: W, n: string) => w.b.find((o) => o.n === n);
const body = (o: Omit<Body, "tr" | "ax" | "ay">): Body => ({ ...o, tr: [], ax: 0, ay: 0 });

/** Deterministic background stars (positions in 0..1). */
const BG = Array.from({ length: 140 }, (_, i) => [((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1, ((Math.sin(i * 78.233) * 12543.12) % 1 + 1) % 1]);

export const solar: Sandbox<W, P> = {
  key: "solar",
  name: "Solar system",
  sub: "Gravity sandbox",
  intro: "Real Newtonian gravity for the Sun and eight planets. Drag on the stage to throw in your own planet.",
  hint: "Drag on the stage to throw a planet",
  controls: [
    { type: "range", id: "sunm", label: "Sun mass", min: 0.5, max: 2, step: 0.05, val: 1, unit: "× Sun" },
    { type: "select", id: "view", label: "View", live: true, options: [["inner", "Inner planets"], ["mid", "Out to Jupiter"], ["outer", "Whole system"]], val: "inner" },
  ],
  whatifs: [
    ["sun2", "The Sun doubles in mass"], ["nosun", "The Sun disappears"], ["giant", "The Sun becomes a red giant"],
    ["jupstar", "Jupiter ignites into a star"], ["bh", "A black hole flies through"], ["stop", "Earth stops in its orbit"],
    ["mars", "Move Earth to Mars’s orbit"],
  ],
  speeds: [[1 / 12, "1 mo/s"], [0.5, "6 mo/s"], [2, "2 yr/s"], [10, "10 yr/s"]],
  defaultSpeed: 1,
  fmtT: fmtDur,
  metrics: [
    { k: "dist", label: "Earth–Sun distance", unit: "AU", fmt: (v) => fmtNum(v, 2) },
    { k: "temp", label: "Earth temperature", unit: "°C", fmt: (v) => fmtNum(v) },
    { k: "year", label: "Length of year", unit: "days", fmt: (v) => fmtNum(v) },
  ],

  init(p, seed) {
    const w: W = { t: 0, rs: seed, log: [], f: {}, b: [] };
    w.b.push(body({ n: "Sun", x: 0, y: 0, vx: 0, vy: 0, m: p.sunm, cr: 0.00465, L: p.sunm ** 4, c: "#FFD76A", px: 6 }));
    for (const [n, a, m, c, px] of PLANETS) {
      const g = rng(w) * TAU, v = Math.sqrt((G4 * p.sunm) / a);
      w.b.push(body({ n, x: a * Math.cos(g), y: a * Math.sin(g), vx: -v * Math.sin(g), vy: v * Math.cos(g), m, cr: m > 1e-4 ? 0.0005 : 0.0003, L: 0, c, px }));
    }
    let px = 0, py = 0;
    w.b.forEach((o, i) => { if (i) { px += o.m * o.vx; py += o.m * o.vy; } });
    w.b[0].vx = -px / p.sunm;
    w.b[0].vy = -py / p.sunm;
    accel(w);
    return w;
  },

  step(w, dt) {
    const n = Math.ceil(dt / 0.0015), h = dt / n, b = w.b;
    for (let k = 0; k < n; k++) {
      for (const o of b) { o.vx += (o.ax * h) / 2; o.vy += (o.ay * h) / 2; o.x += o.vx * h; o.y += o.vy * h; }
      accel(w);
      for (const o of b) { o.vx += (o.ax * h) / 2; o.vy += (o.ay * h) / 2; }
      outer: for (let i = 0; i < b.length; i++)
        for (let j = i + 1; j < b.length; j++) {
          const A = b[i], B = b[j];
          if (Math.hypot(A.x - B.x, A.y - B.y) < A.cr + B.cr) {
            const big = A.m >= B.m ? A : B, sm = big === A ? B : A, M = A.m + B.m;
            big.vx = (A.m * A.vx + B.m * B.vx) / M; big.vy = (A.m * A.vy + B.m * B.vy) / M; big.m = M;
            b.splice(b.indexOf(sm), 1);
            const msg = big.n === "Sun" ? (big.giant ? `${sm.n} is swallowed by the red giant` : `${sm.n} falls into the Sun`) : big.bh ? `${sm.n} falls into the black hole` : `${sm.n} smashes into ${big.n}`;
            note(w, msg, undefined, w.t + k * h);
            accel(w);
            break outer;
          }
        }
    }
    w.t += dt;
    const sun = find(w, "Sun");
    for (const o of b) {
      o.tr.push(o.x, o.y);
      if (o.tr.length > 440) o.tr.splice(0, 2);
      if (o.L || o.bh) continue;
      const ref = sun ?? { x: 0, y: 0, vx: 0, vy: 0, m: 0 };
      const r = Math.hypot(o.x - ref.x, o.y - ref.y), E = 0.5 * ((o.vx - ref.vx) ** 2 + (o.vy - ref.vy) ** 2) - (G4 * ref.m) / r;
      if (r > 45 && E > 0) note(w, `${o.n} escapes into interstellar space`, "esc" + o.n);
    }
  },

  apply(w, id, _p, ui) {
    const sun = find(w, "Sun"), e = find(w, "Earth"), j = find(w, "Jupiter");
    if (id === "sun2" && sun) { sun.m *= 2; sun.L *= 11; note(w, "The Sun doubles in mass: stronger pull, sunlight 11× brighter"); }
    if (id === "nosun" && sun) { w.b.splice(w.b.indexOf(sun), 1); note(w, "The Sun vanishes: planets fly off in straight lines"); }
    if (id === "giant" && sun) { sun.cr = 0.85; sun.m *= 0.65; sun.L = 2500; sun.giant = true; sun.c = "#FF7A45"; note(w, "The Sun swells to a red giant 0.85 AU wide and loses a third of its mass"); }
    if (id === "jupstar" && j) { j.m = 0.08; j.L = 0.0008; j.c = "#FF9A5C"; j.px = 5; j.cr = 0.0008; note(w, "Jupiter gains 80× its mass and lights up as a red dwarf"); }
    if (id === "bh") {
      const r = sun ?? { x: 0, y: 0 };
      w.b.push(body({ n: "Black hole", x: r.x - 38, y: r.y + 5, vx: 8.5, vy: 0, m: 4, cr: 0.003, L: 0, c: "#000000", bh: true, px: 5 }));
      note(w, "A black hole of 4 Suns enters from the edge of the system");
    }
    if (id === "stop" && e) { e.vx = sun ? sun.vx : 0; e.vy = sun ? sun.vy : 0; note(w, "Earth stops dead in its orbit"); }
    if (id === "mars" && e && sun) {
      const g = Math.atan2(e.y - sun.y, e.x - sun.x), v = Math.sqrt((G4 * sun.m) / 1.524);
      e.x = sun.x + 1.524 * Math.cos(g); e.y = sun.y + 1.524 * Math.sin(g);
      e.vx = sun.vx - v * Math.sin(g); e.vy = sun.vy + v * Math.cos(g); e.tr = [];
      note(w, "Earth is moved out to Mars’s orbit");
    }
    if (id === "throw" && ui.pending) {
      w.b.push(body({ n: "Your planet", ...ui.pending, m: 1.5e-5, cr: 0.0004, L: 0, c: "#FF8FD0", px: 4 }));
      note(w, "You throw in a new planet");
    }
    accel(w);
  },

  read(w) {
    const e = find(w, "Earth"), sun = find(w, "Sun");
    if (!e) return { dist: null, temp: null, year: null };
    let F = 0;
    w.b.forEach((o) => { if (o.L) F += o.L / Math.max(1e-4, (o.x - e.x) ** 2 + (o.y - e.y) ** 2); });
    const ref = sun ?? { x: 0, y: 0, vx: 0, vy: 0, m: 0 };
    const r = Math.hypot(e.x - ref.x, e.y - ref.y), v2 = (e.vx - ref.vx) ** 2 + (e.vy - ref.vy) ** 2;
    let year: number | null = null;
    if (sun) { const a = 1 / (2 / r - v2 / (G4 * sun.m)); if (a > 0) year = Math.sqrt(a ** 3 / sun.m) * 365.25; }
    return { dist: r, temp: F > 0 ? Math.max(-270, 255 * F ** 0.25 + 33 - 273) : -270, year };
  },

  info(base, alt): InfoBlock[] {
    const status = (w: W) => {
      if (!find(w, "Earth")) return "destroyed";
      const r = solar.read(w, { sunm: 1, view: "inner" });
      if (r.year == null) return "flying away";
      if ((r.temp ?? 0) > 100) return "oceans boiling";
      if ((r.temp ?? 0) < -30) return "frozen solid";
      return "habitable";
    };
    const rows: InfoRow[] = [{ label: "Earth now", text: status(base) }];
    if (alt) rows.push({ label: "In the what-if", text: status(alt), color: "var(--alt)" });
    return [{ rows }];
  },

  draw({ ctx, w: W, h: H, p, isAlt, ui }, w) {
    ctx.fillStyle = "#03050B";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(220,225,255,.5)";
    BG.forEach(([x, y], i) => ctx.fillRect(x * W, y * H, i % 7 ? 1 : 1.6, i % 7 ? 1 : 1.6));
    const half = VIEW_HALF[p.view] ?? 1.9, sc = Math.min(W, H) / 2 / half, sun = find(w, "Sun");
    const cx = sun ? sun.x : 0, cy = sun ? sun.y : 0;
    ui.cams[isAlt ? 1 : 0] = { cx, cy, sc, W, H };
    const X = (x: number) => W / 2 + (x - cx) * sc, Y = (y: number) => H / 2 + (y - cy) * sc;
    ctx.lineWidth = 1;
    for (const o of w.b) {
      if (o.tr.length < 4) continue;
      ctx.strokeStyle = o.bh ? "rgba(255,200,87,.35)" : o.c;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let i = 0; i < o.tr.length; i += 2) { const x = X(o.tr[i]), y = Y(o.tr[i + 1]); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = "11px " + FONT.body;
    for (const o of w.b) {
      const x = X(o.x), y = Y(o.y);
      if (x < -200 || x > W + 200 || y < -200 || y > H + 200) continue;
      if (o.L) {
        const r = Math.max(o.px, o.cr * sc), g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3);
        g.addColorStop(0, o.c); g.addColorStop(1, "rgba(255,180,80,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
        ctx.fillStyle = o.c; ctx.globalAlpha = o.giant ? 0.7 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      } else if (o.bh) {
        ctx.strokeStyle = "#FFC857"; ctx.lineWidth = 2; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(x, y, o.px, 0, TAU); ctx.fill();
      }
      const dist = Math.hypot(o.x - cx, o.y - cy);
      const show = o.L || o.bh || (p.view === "inner" ? dist < 2.5 : p.view === "mid" ? dist < 7 && o.n !== "Mercury" : o.m > 1e-5 || o.n === "Earth");
      if (show && o.n !== "Sun") { ctx.fillStyle = o.n === "Earth" ? "#CFE6FF" : "rgba(200,206,230,.8)"; ctx.fillText(o.n, x + o.px + 4, y - o.px - 2); }
    }
    const d = ui.drag;
    if (d && d.alt === isAlt) {
      ctx.strokeStyle = "#FF8FD0"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(d.x0, d.y0); ctx.lineTo(d.x1, d.y1); ctx.stroke();
      ctx.fillStyle = "#FF8FD0"; ctx.beginPath(); ctx.arc(d.x0, d.y0, 4, 0, TAU); ctx.fill();
    }
  },
};

export const findBody = find;
export type SolarWorld = W;
