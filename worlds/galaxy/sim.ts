import type { BaseWorld, Sandbox } from "@/lib/sim/types";
import { TAU, clamp, fmtNum, fmtYears, mix, note, rng } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import { meta } from "./meta";
import { worldSay } from "@/lib/sim/say";

/** Units: G = 1, Milky Way mass = 1, 1 length unit ≈ 40,000 ly, 1 time unit = 100 Myr. */
type P = {
  stars: number; mass: number; dm: number; speed: number; aim: number; spin: string; neigh: string; shape: string;
  /** What-if settings (live): how many fall in, their size, fly-through speed, black hole mass, gravity left without dark matter. */
  count: number; size: number; fly: number; bhm: number; dmleft: number;
};

interface Core {
  x: number; y: number; vx: number; vy: number; m: number;
  o: number; os?: number[]; ax: number; ay: number;
  /** Rotation sense of its disc (+1 / −1), so spiral arms trail. */
  dir: number;
  /** Time the cores merged (merger flare) and last time another core passed close (starburst). */
  mt?: number; pt?: number;
}
interface W extends BaseWorld {
  cores: Core[];
  /** Stars packed as [x, y, vx, vy] per star. Test particles: feel cores only. */
  s: Float64Array;
  /** Owner galaxy index per star (for colour). */
  o: Uint8Array;
  /** Population per star: 0 = bulge, 1 = disc. */
  k: Uint8Array;
  /** Camera half-width in length units, eased in step() so the view follows the action. */
  cam: number;
  /** Owner index of the dwarf in the "ring" what-if, until its ring is logged. */
  ro?: number;
}

const EPS2 = 0.01;
/** At most this many galaxies ever, and about this many stars in all. */
const MAX_GALAXIES = 10, MAX_STARS = 4000;
/** km/s → length units per 100 Myr (110 km/s ≈ 0.297, the default approach speed). */
const KMS = Math.hypot(0.28, 0.1) / 110;

type Shape = { rs?: number; ell?: boolean };

function addGalaxy(w: W, cx: number, cy: number, vx: number, vy: number, m: number, dir: number, n: number, owner: number, { rs = 1, ell = false }: Shape = {}) {
  w.cores.push({ x: cx, y: cy, vx, vy, m, o: owner, dir, ax: 0, ay: 0 });
  const start = w.o.length;
  const s = new Float64Array((start + n) * 4);
  const o = new Uint8Array(start + n);
  const k = new Uint8Array(start + n);
  s.set(w.s);
  o.set(w.o);
  k.set(w.k);
  const nb = Math.round(n * 0.15), L = 0.75;
  for (let i = 0; i < n; i++) {
    // A compact Plummer-like bulge (15%) and an exponential disc (scale length ≈ 30,000 ly, cut at 58,000)
    // An elliptical is all "bulge": a wider ball of old stars, orbiting either way
    const bulge = ell || i < nb, u = rng(w), a = rng(w) * TAU;
    const r = rs * (ell
      ? clamp(0.25 / Math.sqrt(Math.pow(0.0001 + 0.9 * u, -2 / 3) - 1), 0.05, 1.1)
      : bulge
        ? clamp(0.1 / Math.sqrt(Math.pow(0.0001 + 0.9 * u, -2 / 3) - 1), 0.05, 0.4)
        : 0.12 - L * Math.log(1 - u * (1 - Math.exp(-1.33 / L))));
    // Bulge stars are partly pressure-supported: slower, and some orbit the other way
    const d = bulge && rng(w) < (ell ? 0.5 : 0.35) ? -dir : dir;
    const v = ((bulge ? 0.85 : 1) * r * Math.sqrt(m)) / Math.pow(r * r + EPS2, 0.75);
    const j = (start + i) * 4;
    s[j] = cx + r * Math.cos(a);
    s[j + 1] = cy + r * Math.sin(a);
    s[j + 2] = vx - d * v * Math.sin(a);
    s[j + 3] = vy + d * v * Math.cos(a);
    o[start + i] = owner;
    k[start + i] = bulge ? 0 : 1;
  }
  w.s = s;
  w.o = o;
  w.k = k;
}

/** The group the camera follows: cores within 16 units (640 kly) of the heaviest. Escapees leave the view. */
function view(w: W) {
  const big = w.cores.reduce((a, c) => (c.m > a.m ? c : a), w.cores[0]);
  const near = w.cores.filter((c) => Math.hypot(c.x - big.x, c.y - big.y) < 16);
  let M = 0, cx = 0, cy = 0, vx = 0, vy = 0, far = 0;
  near.forEach((c) => { M += c.m; cx += c.m * c.x; cy += c.m * c.y; vx += c.m * c.vx; vy += c.m * c.vy; });
  cx /= M; cy /= M; vx /= M; vy /= M;
  near.forEach((c) => (far = Math.max(far, Math.hypot(c.x - cx, c.y - cy))));
  return { M, cx, cy, vx, vy, far };
}

/** Camera half-width that keeps every core in view with room for its disc. */
const camTarget = (w: W) => clamp(view(w).far * 0.85 + 2.2, 3, 14);

/** Next free galaxy index (owners are never reused, so colours and events stay put). */
const nextOwner = (w: W) => 1 + Math.max(...w.cores.flatMap((c) => c.os ?? [c.o]));
/** Smaller galaxies: fewer stars, a smaller disc, within the total star budget. */
const starsFor = (w: W, p: P, size: number) => Math.max(40, Math.min(Math.round(p.stars * clamp(size / 0.9, 0.15, 0.6)), MAX_STARS - w.o.length));
const discFor = (size: number) => clamp(Math.sqrt(size / 0.45), 0.3, 1.2);

const coreOf = (w: W, o: number) => w.cores.find((c) => c.o === o || (c.os && c.os.includes(o)));
const owns = (c: Core, o: number) => (c.os ?? [c.o]).includes(o);

/* ---------- rendering (decorative only: hashes and sim time, never the RNG) ---------- */

/** Discs seen about 40° from face-on, as from Earth. Only the vertical axis is compressed. */
const TILT = 0.77;
/** Glow buffer downscale, and its colours: bulge, disc, young (arms and starbursts). */
const GLOW = 4;
const GLOW_COL = ["#FFCF96", "#FFE6CC", "#A9C2FF"];
/** Two-arm log spiral: winding (1 / tan 18° pitch) and pattern speed (rad per 100 Myr). */
const WIND = 3.1, PATTERN = 0.5;
/** Per-galaxy tint, so you can still tell whose stars are whose. */
const TINT = ["#BCD0FF", "#FFCF9E", "#B8F5CF", "#FFB8C8", "#D4C2FF", "#A8EEF2", "#FFE3A3", "#C9F2A8", "#F2C4E8", "#B8DCFF"];
/** Stellar populations: old warm bulge, cream disc, young blue disc, pink star-forming knot. */
const POP = ["#FFC98A", "#FFF1DC", "#9DBBFF", "#FF6FA0"];

function hash(i: number): number {
  let x = Math.imul(i ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

type Surf = OffscreenCanvas;
const surface = (w: number, h: number): Surf | null =>
  typeof OffscreenCanvas === "undefined" ? null : new OffscreenCanvas(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));

/** One soft round sprite per colour: a bright point with a short halo. */
const sprites = new Map<string, Surf | null>();
function sprite(col: string): Surf | null {
  if (sprites.has(col)) return sprites.get(col)!;
  const c = surface(32, 32), g = c?.getContext("2d");
  if (c && g) {
    const rad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    const rgb = col.slice(4, -1);
    rad.addColorStop(0, `rgba(${rgb},1)`);
    rad.addColorStop(0.16, `rgba(${rgb},.85)`);
    rad.addColorStop(0.42, `rgba(${rgb},.16)`);
    rad.addColorStop(1, `rgba(${rgb},0)`);
    g.fillStyle = rad;
    g.fillRect(0, 0, 32, 32);
  }
  sprites.set(col, c);
  return c;
}
const starSprite = (owner: number, pop: number) => sprite(mix(POP[pop], TINT[owner] ?? TINT[0], pop === 3 ? 0 : 0.18));

/** Far-away stars and galaxies behind the scene, fixed to the stage. Cached per size. */
let backdrop: { key: string; c: Surf | null } | null = null;
function drawBackdrop(ctx: CanvasRenderingContext2D, W: number, H: number) {
  const dpr = ctx.getTransform().a || 1, key = `${Math.round(W)}x${Math.round(H)}@${dpr}`;
  if (backdrop?.key !== key) {
    const c = surface(W * dpr, H * dpr), g = c?.getContext("2d");
    if (c && g) {
      g.scale(dpr, dpr);
      const n = Math.round((W * H) / 1600);
      for (let i = 0; i < n; i++) {
        const u = hash(i * 4 + 11);
        g.fillStyle = hash(i * 4 + 12) < 0.3 ? "#C4D6FF" : "#FFE7CC";
        g.globalAlpha = 0.05 + 0.32 * u ** 3;
        const sz = 0.6 + 0.9 * u ** 4;
        g.fillRect(hash(i * 4 + 13) * W, hash(i * 4 + 14) * H, sz, sz);
      }
      for (let i = 0; i < 7; i++) {
        const x = hash(i * 5 + 901) * W, y = hash(i * 5 + 902) * H, r = 3 + 6 * hash(i * 5 + 903);
        g.save();
        g.translate(x, y);
        g.rotate(hash(i * 5 + 904) * Math.PI);
        g.scale(1, 0.3 + 0.6 * hash(i * 5 + 905));
        const rad = g.createRadialGradient(0, 0, 0, 0, 0, r);
        rad.addColorStop(0, "rgba(255,231,204,.22)");
        rad.addColorStop(1, "rgba(255,231,204,0)");
        g.globalAlpha = 1;
        g.fillStyle = rad;
        g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
        g.restore();
      }
    }
    backdrop = { key, c };
  }
  if (backdrop.c) ctx.drawImage(backdrop.c, 0, 0, W, H);
}

let glowA: Surf | null = null, glowB: Surf | null = null;

/** English words of this world (change 0025): event lines. */
const MESSAGES: Record<string, string> = {
  "ev.closing": "Andromeda is closing in at about {speed} km/s",
  "ev.triangulum": "Triangulum drifts in from the side",
  "ev.lmc": "The Large Magellanic Cloud circles the Milky Way",
  "ev.merge": "The cores merge: one giant elliptical galaxy, “Milkomeda”",
  "ev.swallowed": "Another galaxy is swallowed",
  "ev.pass1": "First pass: the galaxies plunge through each other",
  "ev.tails": "They swing apart, trailing long tidal tails of stars",
  "ev.ring": "Our disc rebounds into an expanding ring of stars",
  "ev.headon": "Andromeda turns straight for our centre",
  "ev.miss": "Andromeda is nudged onto a fly-by path",
  "ev.nodmAll": "Dark matter vanishes: gravity drops to {left}%, stars are suddenly too fast",
  "ev.nodmSome": "Some dark matter vanishes: gravity drops to {left}%, stars are suddenly too fast",
  "ev.bhBig": "A black hole {x}× as heavy as the Milky Way appears at its centre",
  "ev.bhSmall": "A black hole of {pct}% the Milky Way’s mass appears at its centre",
  "ev.third": "A third galaxy (like Triangulum) falls in",
  "ev.freeze": "Every Milky Way star stops orbiting",
  "ev.swarm": "{n, plural, one {Another galaxy falls in} other {# more galaxies fall in}}",
  "ev.punch": "A dwarf galaxy punches through our centre",
  "ev.bullet": "A galaxy shoots straight through at {speed} km/s",
  "ev.stop": "Andromeda stops dead, then starts to fall",
  "ev.reverse": "Andromeda turns around and heads away",
  "ev.flipmw": "Every Milky Way star reverses its orbit",
  "stage.scale": "{n} light-years",
};

const WORDS = { key: "galaxy", messages: MESSAGES };

export const galaxy: Sandbox<W, P> = {
  ...meta,
  intro: "The Milky Way and Andromeda, on their real collision course, sped up. Each dot is a star.",
  seo: { title: "Galaxy Collision Simulator: Milky Way meets Andromeda", description: "Watch the Milky Way and Andromeda collide, or send in more galaxies. Make dark matter vanish, change the aim or the spin and compare with the untouched sky. Free, in your browser." },
  messages: MESSAGES,
  controls: [
    { type: "heading", label: "Starting world" },
    { type: "range", id: "stars", label: "Stars per galaxy", min: 300, max: 1500, step: 100, val: 900 },
    { type: "range", id: "mass", label: "Andromeda mass", min: 0.5, max: 2, step: 0.1, val: 1.2, unit: "× Milky Way" },
    { type: "range", id: "dm", label: "Dark matter", min: 0.5, max: 2, step: 0.1, val: 1, unit: "×" },
    { type: "range", id: "speed", label: "Approach speed", min: 60, max: 200, step: 10, val: 110, unit: "km/s" },
    { type: "range", id: "aim", label: "Aim off-centre", min: 0, max: 250, step: 10, val: 110, unit: "kly" },
    { type: "select", id: "spin", label: "Andromeda spins", options: [["against", "Against ours"], ["same", "Same way as ours"]], val: "against" },
    { type: "select", id: "shape", label: "Andromeda's shape", options: [["spiral", "Spiral"], ["elliptical", "Elliptical"]], val: "spiral" },
    { type: "select", id: "neigh", label: "Neighbours at start", options: [["none", "None"], ["m33", "Triangulum"], ["m33lmc", "Triangulum + LMC"]], val: "none" },
    { type: "heading", label: "What-if settings" },
    { type: "range", id: "count", label: "Galaxies that fall in", min: 1, max: 6, step: 1, val: 3, live: true },
    { type: "range", id: "size", label: "Their size", min: 0.1, max: 1.5, step: 0.05, val: 0.45, unit: "× Milky Way", live: true },
    { type: "range", id: "fly", label: "Fly-through speed", min: 200, max: 1500, step: 50, val: 800, unit: "km/s", live: true },
    { type: "range", id: "bhm", label: "Black hole mass", min: 0.1, max: 4, step: 0.1, val: 1.5, unit: "× Milky Way", live: true },
    { type: "range", id: "dmleft", label: "Gravity left", min: 0, max: 90, step: 5, val: 30, unit: "%", live: true },
  ],
  whatifs: [
    ["headon", "Aim Andromeda dead centre"],
    ["miss", "Andromeda flies past"],
    ["nodm", "Dark matter vanishes"],
    ["bh", "A galaxy-heavy black hole appears at our centre"],
    ["third", "A third galaxy joins"],
    ["freeze", "Milky Way stars stop orbiting"],
    ["swarm", "More galaxies fall in"],
    ["ring", "A small galaxy punches through our centre"],
    ["bullet", "A galaxy shoots straight through"],
    ["stop", "Andromeda stops dead"],
    ["reverse", "Andromeda turns around"],
    ["flipmw", "The Milky Way spins the other way"],
  ],
  // The question each what-if's page answers, and its frozen URL words (change 0033).
  questions: {
    headon: { q: "What if Andromeda hit the Milky Way head-on?", slug: "andromeda-hits-milky-way-head-on" },
    miss: { q: "What if Andromeda missed the Milky Way?", slug: "andromeda-misses-milky-way" },
    nodm: { q: "What if dark matter disappeared?", slug: "dark-matter-disappears" },
    bh: { q: "What if a black hole as heavy as a galaxy appeared in the Milky Way?", slug: "galaxy-mass-black-hole-at-milky-way-centre" },
    third: { q: "What if a third galaxy joined the Milky Way–Andromeda collision?", slug: "third-galaxy-joins-collision" },
    freeze: { q: "What if the Milky Way's stars stopped orbiting?", slug: "milky-way-stars-stop-orbiting" },
    swarm: { q: "What if more galaxies fell into the Milky Way?", slug: "more-galaxies-fall-in" },
    ring: { q: "What if a small galaxy punched through the Milky Way's centre?", slug: "small-galaxy-punches-through-centre" },
    bullet: { q: "What if a galaxy shot straight through the Milky Way?", slug: "galaxy-shoots-through-milky-way" },
    stop: { q: "What if Andromeda stopped dead?", slug: "andromeda-stops" },
    reverse: { q: "What if Andromeda turned around?", slug: "andromeda-turns-around" },
    flipmw: { q: "What if the Milky Way spun the other way?", slug: "milky-way-spins-backwards" },
  },
  // The run behind its what-if pages: times read, step and the metric the answer names (change 0033)
  answer: { at: [10, 20, 40], shot: 10 },
  speeds: [[0.05, "5 Myr/s"], [0.1, "10 Myr/s"], [0.25, "25 Myr/s"], [0.5, "50 Myr/s"], [1.5, "150 Myr/s"], [4, "400 Myr/s"], [10, "1 Gyr/s"]],
  defaultSpeed: 2,
  fmtT: (t) => fmtYears(t * 1e8),
  metrics: [
    { k: "sep", label: "Separation", unit: "kly", fmt: (v) => fmtNum(v) },
    { k: "disc", label: "Stars in a disc", unit: "%", fmt: (v) => fmtNum(v) },
    { k: "thrown", label: "Stars thrown out", unit: "%", fmt: (v) => fmtNum(v, 1) },
    { k: "galaxies", label: "Galaxies left", unit: "", fmt: (v) => fmtNum(v) },
  ],

  init(p, seed) {
    const w: W = { t: 0, rs: seed, log: [], f: {}, cores: [], s: new Float64Array(0), o: new Uint8Array(0), k: new Uint8Array(0), cam: 8.5 };
    const m0 = p.dm, m1 = p.mass * p.dm, M = m0 + m1;
    const dx = 7.5, dy = -3.2, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    // Defaults (110 km/s, 110 kly) give the original path: 0.28 units along the line of centres, 0.1 across.
    // Aim: Andromeda heads for a point ~aim kly to the side of our centre (sin of the angle scales with it).
    const v = KMS * p.speed;
    const sa = clamp((p.aim / 110) * (0.1 / Math.hypot(0.28, 0.1)), 0, 1), ca = Math.sqrt(1 - sa * sa);
    const rvx = v * (ux * ca - uy * sa), rvy = v * (uy * ca + ux * sa);
    addGalaxy(w, 0, 0, (-m1 / M) * rvx, (-m1 / M) * rvy, m0, 1, p.stars, 0);
    addGalaxy(w, -dx, -dy, (m0 / M) * rvx, (m0 / M) * rvy, m1, p.spin === "same" ? 1 : -1, p.stars, 1, { ell: p.shape === "elliptical" });
    note(w, "ev.closing", { speed: p.speed });
    if (p.neigh !== "none") {
      const g = view(w);
      addGalaxy(w, g.cx + 7, g.cy - 6, g.vx - 0.22, g.vy + 0.2, 0.45 * p.dm, 1, starsFor(w, p, 0.45), 2);
      note(w, "ev.triangulum");
    }
    if (p.neigh === "m33lmc") {
      // The Large Magellanic Cloud on a near-circular orbit around the Milky Way, about 160,000 ly out
      const mw = w.cores[0], r = 4, a = 2.2, vc = (r * Math.sqrt(mw.m)) / Math.pow(r * r + 0.09, 0.75);
      addGalaxy(w, mw.x + r * Math.cos(a), mw.y + r * Math.sin(a), mw.vx - vc * Math.sin(a), mw.vy + vc * Math.cos(a), 0.1 * p.dm, 1, starsFor(w, p, 0.1), 3, { rs: discFor(0.1) });
      note(w, "ev.lmc");
    }
    w.cam = camTarget(w);
    return w;
  },

  step(w, dt) {
    const n = Math.ceil(dt / 0.02), h = dt / n, C = w.cores, s = w.s, N = w.o.length;
    for (let k = 0; k < n; k++) {
      const now = w.t + (k + 1) * h;
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
          // close passage compresses gas: a starburst (drawn only)
          if (dd < 1.4) a.pt = b.pt = now;
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
            a.mt = now;
            a.pt = Math.max(a.pt ?? now, b.pt ?? now);
            C.splice(j, 1);
            note(w, both ? "ev.merge" : "ev.swallowed");
            j--;
          }
        }
    }
    w.t += dt;
    w.cam += (camTarget(w) - w.cam) * (1 - Math.exp(-dt / 0.6));
    const a = coreOf(w, 0), b = coreOf(w, 1);
    if (a && b && a !== b) {
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (d < 1.8) note(w, "ev.pass1", undefined, "p1");
      if (w.f.p1 && d > 3.5) note(w, "ev.tails", undefined, "tails");
    }
    // Ring what-if: once the dwarf has passed our centre, watch for the disc rebounding outward together
    const mw = coreOf(w, 0), dw = w.ro == null ? null : coreOf(w, w.ro);
    if (mw && dw) {
      if (Math.hypot(dw.x - mw.x, dw.y - mw.y) < 0.4) w.f.rp = 1;
      if (w.f.rp) {
        let all = 0, outward = 0;
        for (let i = 0; i < N; i++) {
          if (w.o[i] !== 0 || w.k[i] !== 1) continue;
          const j = i * 4, dx = s[j] - mw.x, dy = s[j + 1] - mw.y, r = Math.hypot(dx, dy);
          if (r < 0.3 || r > 2.5) continue;
          all++;
          if ((dx * (s[j + 2] - mw.vx) + dy * (s[j + 3] - mw.vy)) / r > 0.05) outward++;
        }
        if (all > 20 && outward > 0.6 * all) {
          note(w, "ev.ring");
          delete w.ro;
        }
      }
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
      note(w, id === "headon" ? "ev.headon" : "ev.miss");
    }
    if (id === "nodm") {
      const left = Math.max(5, p.dmleft);
      w.cores.forEach((c) => (c.m *= left / 100));
      note(w, left < 50 ? "ev.nodmAll" : "ev.nodmSome", { left });
    }
    if (id === "bh" && a) {
      a.m += p.bhm * p.dm;
      note(w, p.bhm >= 1 ? "ev.bhBig" : "ev.bhSmall", p.bhm >= 1 ? { x: Math.round(p.bhm * 10) / 10 } : { pct: Math.round(p.bhm * 100) });
    }
    const free = MAX_GALAXIES - nextOwner(w);
    if (id === "third" && free > 0) {
      const g = view(w);
      addGalaxy(w, g.cx + 7, g.cy - 6, -0.22, 0.2, p.size * p.dm, 1, starsFor(w, p, p.size), nextOwner(w), { rs: discFor(p.size) });
      note(w, "ev.third");
    }
    if (id === "freeze" && a) {
      for (let i = 0; i < w.o.length; i++) if (w.o[i] === 0) { w.s[i * 4 + 2] = a.vx; w.s[i * 4 + 3] = a.vy; }
      note(w, "ev.freeze");
    }
    if (id === "swarm" && free > 0) {
      // Evenly spaced around the group, falling in on curving paths rather than straight at the centre
      const g = view(w), n = Math.min(p.count, free), R = 7, vc = Math.sqrt(g.M / R);
      for (let i = 0; i < n; i++) {
        const th = (TAU * i) / n + 0.6, ux = Math.cos(th), uy = Math.sin(th);
        const vx = g.vx + vc * (-0.6 * ux - 0.45 * uy), vy = g.vy + vc * (-0.6 * uy + 0.45 * ux);
        addGalaxy(w, g.cx + R * ux, g.cy + R * uy, vx, vy, p.size * p.dm, i % 2 ? -1 : 1, starsFor(w, p, p.size), nextOwner(w), { rs: discFor(p.size) });
      }
      note(w, "ev.swarm", { n });
    }
    if (id === "ring" && a && free > 0) {
      const o = nextOwner(w);
      addGalaxy(w, a.x, a.y + 2.5, a.vx, a.vy - 0.9, 0.5 * p.dm, 1, 120, o, { rs: 0.3 });
      w.ro = o;
      note(w, "ev.punch");
    }
    if (id === "bullet" && free > 0) {
      const g = view(w);
      addGalaxy(w, g.cx - 8, g.cy + 2, g.vx + KMS * p.fly, g.vy, p.size * p.dm, 1, starsFor(w, p, p.size), nextOwner(w), { rs: discFor(p.size) });
      note(w, "ev.bullet", { speed: p.fly });
    }
    if ((id === "stop" || id === "reverse") && a && b && a !== b) {
      const k = id === "stop" ? 1 : 2;
      kick(1, k * (a.vx - b.vx), k * (a.vy - b.vy));
      note(w, id === "stop" ? "ev.stop" : "ev.reverse");
    }
    if (id === "flipmw" && a) {
      for (let i = 0; i < w.o.length; i++)
        if (w.o[i] === 0) { const j = i * 4; w.s[j + 2] = 2 * a.vx - w.s[j + 2]; w.s[j + 3] = 2 * a.vy - w.s[j + 3]; }
      if (!a.os) a.dir = -a.dir;
      note(w, "ev.flipmw");
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
    return { sep: a && b && a !== b ? Math.hypot(a.x - b.x, a.y - b.y) * 40 : 0, disc: (bound / N) * 100, thrown: (out / N) * 100, galaxies: w.cores.length };
  },

  draw({ ctx, w: W, h: H }, w) {
    ctx.fillStyle = STAGE.void;
    ctx.fillRect(0, 0, W, H);
    drawBackdrop(ctx, W, H);

    const { cx, cy } = view(w);
    const sc = Math.min(W, H / TILT) / 2 / (w.cam ?? 8.5), s = w.s, N = w.o.length, t = w.t;
    const X = (x: number) => W / 2 + (x - cx) * sc, Y = (y: number) => H / 2 + (y - cy) * sc * TILT;

    // Per galaxy: how calm its disc still is (spiral arms) and how recent its starburst is
    const state = Array.from({ length: nextOwner(w) }, (_, o) => {
      const c = coreOf(w, o);
      if (!c) return null;
      let near = Infinity;
      for (const k of w.cores) if (k !== c) near = Math.min(near, Math.hypot(k.x - c.x, k.y - c.y));
      const merged = (c.os?.length ?? 1) > 1;
      const arms = merged ? 0 : Math.min(clamp((near - 2.5) / 3, 0, 1), w.f.p1 ? 0.35 : 1);
      const burst = c.pt == null ? 0 : Math.exp(-Math.max(0, t - c.pt) / 2);
      return { c, arms, burst };
    });

    // Diffuse light goes into a small buffer that is blurred and added on top
    const gw = Math.ceil(W / GLOW), gh = Math.ceil(H / GLOW);
    if (!glowA || glowA.width !== gw || glowA.height !== gh) { glowA = surface(gw, gh); glowB = surface(gw, gh); }
    const ga = glowA?.getContext("2d") ?? null;
    if (ga) { ga.globalCompositeOperation = "source-over"; ga.clearRect(0, 0, gw, gh); ga.globalCompositeOperation = "lighter"; }
    // surface brightness stays put as the camera zooms: stars per glow pixel fall as 1/scale²
    const glowK = 0.05 * Math.min(1.5, 1800 / Math.max(N, 1)) * clamp((sc / 26) ** 2, 0.5, 5);

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const spikes: number[] = [];
    for (let i = 0; i < N; i++) {
      const j = i * 4, x = X(s[j]), y = Y(s[j + 1]);
      if (x < -6 || x > W + 6 || y < -6 || y > H + 6) continue;
      const o = w.o[i], st = state[o], u = hash(i * 3 + 1), disc = w.k[i] === 1;
      const pop = !disc ? 0 : hash(i * 3 + 2) < 0.5 ? 2 : 1;
      let a = (disc ? 0.4 : 0.2) + 0.6 * u ** 4, arm = 0;
      if (st && disc && st.arms > 0) {
        const dx = s[j] - st.c.x, dy = s[j + 1] - st.c.y, r = Math.hypot(dx, dy);
        if (r > 0.15 && r < 1.8) {
          // density wave: a rotating two-arm pattern; young stars light it up
          const ph = 2 * (Math.atan2(dy, dx) + st.c.dir * (Math.log(r) * WIND - PATTERN * t));
          arm = Math.max(0, Math.cos(ph)) ** 3 * st.arms;
        }
        a *= pop === 2 ? 1 - 0.8 * st.arms + 2.6 * arm : 1 - 0.45 * st.arms + 0.9 * arm;
      }
      if (st && pop === 2) a *= 1 + 1.2 * st.burst;
      a = Math.min(a, 1);
      const sz = 2.6 + 3 * u ** 6 + (pop === 2 ? 1.2 * arm : 0);
      const img = starSprite(o, pop);
      if (img) {
        ctx.globalAlpha = a;
        ctx.drawImage(img, x - sz / 2, y - sz / 2, sz, sz);
      } else {
        ctx.globalAlpha = a * 0.8;
        ctx.fillStyle = TINT[o] ?? TINT[0];
        ctx.fillRect(x, y, 1.4, 1.4);
      }
      // pink H II knots: along calm arms, and everywhere after a close passage
      if (st && disc && hash(i * 5 + 7) < 0.1) {
        const ka = Math.max(st.burst, 0.6 * arm);
        const ki = ka > 0.03 ? starSprite(o, 3) : null;
        if (ki) {
          const ks = 3.5 + 3 * hash(i * 5 + 8) + 3.5 * st.burst;
          ctx.globalAlpha = Math.min(1, ka);
          ctx.drawImage(ki, x - ks / 2, y - ks / 2, ks, ks);
        }
      }
      if (u > 0.997) spikes.push(x, y, a);
      if (ga) {
        // the glow carries colour too: gold bulge light, blue arm light
        ga.fillStyle = GLOW_COL[pop === 0 ? 0 : arm > 0.3 || (st && st.burst > 0.3) ? 2 : 1];
        ga.globalAlpha = Math.min(1, a * glowK * (pop === 0 ? 1.2 : 1 + 2 * arm));
        ga.fillRect(x / GLOW, y / GLOW, 1, 1);
      }
    }

    // A few bright foreground stars with faint diffraction spikes, like a telescope photo
    ctx.strokeStyle = STAGE.ink;
    ctx.lineWidth = 0.6;
    for (let i = 0; i < spikes.length; i += 3) {
      const x = spikes[i], y = spikes[i + 1], l = 5 + 4 * spikes[i + 2];
      ctx.globalAlpha = 0.28 * spikes[i + 2];
      ctx.beginPath();
      ctx.moveTo(x - l, y); ctx.lineTo(x + l, y);
      ctx.moveTo(x, y - l); ctx.lineTo(x, y + l);
      ctx.stroke();
    }

    if (ga && glowA && glowB) {
      const gb = glowB.getContext("2d");
      if (gb) {
        gb.clearRect(0, 0, gw, gh);
        if ("filter" in gb) gb.filter = "blur(2.5px)";
        gb.drawImage(glowA, 0, 0);
        if ("filter" in gb) gb.filter = "none";
        ctx.globalAlpha = 1;
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(glowB, 0, 0, gw * GLOW, gh * GLOW);
      }
    }

    // Cores: a glow that grows with mass, and flares when two cores merge
    w.cores.forEach((c) => {
      const x = X(c.x), y = Y(c.y);
      const flare = c.mt == null ? 0 : Math.exp(-Math.max(0, t - c.mt) / 3);
      const r = sc * 0.16 * Math.sqrt(c.m) * (1 + 4 * flare);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, `rgba(255,246,228,${0.7 + 0.3 * flare})`);
      g.addColorStop(0.2, `rgba(255,214,160,${0.22 + 0.6 * flare})`);
      g.addColorStop(0.55, `rgba(255,190,130,${0.25 * flare})`);
      g.addColorStop(1, "rgba(255,214,160,0)");
      ctx.globalAlpha = 1;
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    });
    ctx.restore();

    ctx.fillStyle = STAGE.ink2;
    ctx.font = "500 12px " + FONT.mono;
    ctx.fillText(worldSay(WORDS)("stage.scale", { n: 100000 }), 14, H - 18);
    ctx.fillRect(14, H - 12, 2.5 * sc, 2);
  },
};
