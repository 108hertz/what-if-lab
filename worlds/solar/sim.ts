import type { BaseWorld, InfoBlock, InfoRow, Sandbox } from "@/lib/sim/types";
import { TAU, fmtDur, fmtNum, note, ref, rng } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import { meta } from "./meta";
import { worldSay } from "@/lib/sim/say";
import { defaultView, project } from "@/lib/sim/camera";
import { SYSTEMS, SYSTEM_NAMES, SYSTEM_WORDS, systemOf } from "./data";

/** Units: AU, years, solar masses → G = 4π². Leapfrog (kick-drift-kick) integrator. */
type P = { sys: string; sunm: number; view: string };

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
  /** A star of the system (the Sun, or one of a binary's two); a planet lit up by "ignites" is not one. */
  star?: boolean;
}
interface W extends BaseWorld {
  b: Body[];
  /** The star system (change 0037, `data.ts`), its watched planet and the star(s) that planet orbits. */
  sys: string;
  watch: string;
  host: string[];
  /** Largest sub-step (yr): 0.0015 in the Solar System, less where the shortest year is shorter. */
  h: number;
  /** Escape distance from the stars (AU). */
  esc: number;
}

const G4 = 4 * Math.PI * Math.PI;
/** Never more sub-steps than this per step (a huge dt in a tiny system); never coarser than the Solar System's 0.0015 yr. */
const MAX_SUB = 4000;
const VIEW_HALF: Record<string, number> = { inner: 5.8, mid: 6, outer: 33 };
/**
 * Radial power per view: "inner" squeezes distance (r^0.55) so Mercury–Mars stay spread out while Jupiter
 * (5.2 AU) still fits on the stage; the other views are true to scale. Display only — the sim never reads it.
 */
const VIEW_POW: Record<string, number> = { inner: 0.55, mid: 1, outer: 1 };
/**
 * Real orbital inclination to the ecliptic and longitude of the ascending node (degrees), for drawing only (change 0036):
 * the physics is planar, but a tilted view shows each orbit's real tilt as a height z = r·sin i·sin(θ − Ω).
 */
const INC: Record<string, [number, number]> = {
  Mercury: [7.0, 48.3], Venus: [3.39, 76.7], Mars: [1.85, 49.6], Jupiter: [1.3, 100.5],
  Saturn: [2.49, 113.7], Uranus: [0.77, 74.0], Neptune: [1.77, 131.8],
};
const DEG = Math.PI / 180;

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
/** Body names stay English ids in the world; words use a key made from them: "Your planet" → yourplanet (change 0025). */
const bodyId = (n: string) => n.replace(/\s+/g, "").toLowerCase();
/** Bodies with words of their own; other systems' bodies keep their catalogue names ("TRAPPIST-1 e"), the same in every language. */
const WORDED = new Set(["sun", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune", "yourplanet", "blackhole"]);
/** A body's name inside a sentence ("the Sun", "your planet"), as a message reference. */
const named = (n: string) => (WORDED.has(bodyId(n)) ? ref("body." + bodyId(n)) : n);
/** The label next to a body: its name, or for a catalogue planet only its letter ("e") unless it is the watched one. */
const label = (say: (k: string) => string, w: W, n: string) =>
  WORDED.has(bodyId(n)) ? say("name." + bodyId(n)) : n === w.watch || !/ [a-z]$/.test(n) ? n : n.slice(-1);

/** One mass-weighted point for some bodies (the watched planet's star or stars); a lone body is itself, exactly. */
function centre(bs: Body[]): { x: number; y: number; vx: number; vy: number; m: number } | null {
  if (!bs.length) return null;
  if (bs.length === 1) return bs[0];
  let m = 0, x = 0, y = 0, vx = 0, vy = 0;
  for (const o of bs) { m += o.m; x += o.m * o.x; y += o.m * o.y; vx += o.m * o.vx; vy += o.m * o.vy; }
  return { m, x: x / m, y: y / m, vx: vx / m, vy: vy / m };
}
const stars = (w: W) => w.b.filter((o) => o.star);
const hostOf = (w: W) => centre(w.b.filter((o) => w.host.includes(o.n)));
/** The biggest planet that could ignite (a gas giant, over ~30 Earths), or none. */
const giantOf = (sys: string) => {
  const g = systemOf(sys).planets.reduce<[string, number] | null>((a, [n, , m]) => (!a || m > a[1] ? [n, m] : a), null);
  return g && g[1] > 1e-4 ? g[0] : null;
};

/** English words of this world (change 0025): event lines and the names they use. */
const MESSAGES: Record<string, string> = {
  "body.sun": "the Sun", "body.mercury": "Mercury", "body.venus": "Venus", "body.earth": "Earth", "body.mars": "Mars",
  "body.jupiter": "Jupiter", "body.saturn": "Saturn", "body.uranus": "Uranus", "body.neptune": "Neptune",
  "body.yourplanet": "your planet", "body.blackhole": "the black hole",
  // Labels drawn next to the bodies on the stage.
  "name.mercury": "Mercury", "name.venus": "Venus", "name.earth": "Earth", "name.mars": "Mars", "name.jupiter": "Jupiter",
  "name.saturn": "Saturn", "name.uranus": "Uranus", "name.neptune": "Neptune", "name.yourplanet": "Your planet", "name.blackhole": "Black hole",
  // The side panel: how Earth is doing.
  "info.now": "Earth now", "info.changed": "With changes",
  "status.destroyed": "destroyed", "status.flying": "flying away", "status.boiling": "oceans boiling", "status.frozen": "frozen solid",
  "status.habitable": "habitable",
  "ev.swallowed": "{body} is swallowed by the red giant",
  "ev.intoSun": "{body} falls into the Sun",
  "ev.intoBh": "{body} falls into the black hole",
  "ev.smash": "{body} smashes into {other}",
  "ev.escape": "{body} escapes into interstellar space",
  "ev.sun2": "The Sun doubles in mass: stronger pull, sunlight 11× brighter",
  "ev.nosun": "The Sun vanishes: planets fly off in straight lines",
  "ev.giant": "The Sun swells to a red giant 0.85 AU wide and loses a third of its mass",
  "ev.jupstar": "Jupiter gains 80× its mass and lights up as a red dwarf",
  "ev.bh": "A black hole of 4 Suns enters from the edge of the system",
  "ev.stop": "Earth stops dead in its orbit",
  "ev.mars": "Earth is moved out to Mars’s orbit",
  "ev.throw": "You throw in a new planet",
  // Other star systems (change 0037): the same what-ifs said for any star
  "ev.intoStar": "{body} falls into {star}",
  "ev.star2": "{star} doubles in mass: stronger pull, starlight 11× brighter",
  "ev.stars2": "Both stars double in mass: stronger pull, starlight 11× brighter",
  "ev.nostar": "{star} vanishes: planets fly off in straight lines",
  "ev.nostars": "Both stars vanish: planets fly off in straight lines",
  "ev.giantStar": "{star} swells to a red giant 0.85 AU wide and loses a third of its mass",
  "ev.ignite": "{body} grows to 0.08 Suns and lights up as a red dwarf",
  "ev.stopP": "{body} stops dead in its orbit",
  "ev.out": "{body} is moved 50 % further out",
  "sys.whatif.star2": "The star doubles in mass", "sys.whatif.stars2": "Both stars double in mass",
  "sys.whatif.nostar": "The star disappears", "sys.whatif.nostars": "Both stars disappear",
  "sys.whatif.giant": "The star becomes a red giant", "sys.whatif.giant2": "The bigger star becomes a red giant",
  "sys.whatif.ignite": "{planet} ignites into a star", "sys.whatif.stop": "{planet} stops in its orbit",
  "sys.whatif.out": "Move {planet} 50 % further out",
  "sys.metric.dist": "{planet}–star distance", "sys.metric.temp": "{planet} temperature", "sys.info.now": "{planet} now",
  "sys.ctl.sunm": "Star mass", "sys.ctl.sunmUnit": "× real",
  "sys.view.inner": "All planets, spread out", "sys.view.mid": "Inner half", "sys.view.outer": "Whole system, true scale",
  // "Compare sizes" (change 0037)
  "cmp.title": "Compare sizes",
  "cmp.note": "Width of the outermost orbit, on a log scale (each mark is 10× wider). Rounded values; estimates vary.",
  "cmp.au": "{n} AU", "cmp.facts": "{kind} · {mass} M☉ · {n, plural, one {# planet} other {# planets}}",
  ...SYSTEM_WORDS,
};
const body = (o: Omit<Body, "tr" | "ax" | "ay">): Body => ({ ...o, tr: [], ax: 0, ay: 0 });

/** Deterministic background stars (positions in 0..1). */
const BG = Array.from({ length: 140 }, (_, i) => [((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1, ((Math.sin(i * 78.233) * 12543.12) % 1 + 1) % 1]);

export const solar: Sandbox<W, P> = {
  ...meta,
  intro: "Real Newtonian gravity for the Sun and eight planets. Zoom, turn the view, or pick Throw and drag to add your own planet.",
  seo: { title: "Solar System Simulator: What if the Sun disappeared?", description: "Real Newtonian gravity for the Sun and eight planets. Double the Sun's mass, remove it, turn Jupiter into a star or throw in your own planet, and watch the orbits change." },
  messages: MESSAGES,
  hint: "Drag to turn the view. Pick Throw to add a planet. Changes add up.",
  controls: [
    { type: "select", id: "sys", label: "Star system", options: SYSTEMS.map((x) => [x.id, SYSTEM_NAMES[x.id]]), val: "sol", fresh: true },
    { type: "range", id: "sunm", label: "Sun mass", min: 0.5, max: 2, step: 0.05, val: 1, unit: "× Sun" },
    { type: "select", id: "view", label: "View", live: true, options: [["inner", "Inner planets"], ["mid", "Out to Jupiter"], ["outer", "Whole system"]], val: "inner" },
  ],
  whatifs: [
    ["sun2", "The Sun doubles in mass"], ["nosun", "The Sun disappears"], ["giant", "The Sun becomes a red giant"],
    ["jupstar", "Jupiter ignites into a star"], ["bh", "A black hole flies through"], ["stop", "Earth stops in its orbit"],
    ["mars", "Move Earth to Mars’s orbit"],
  ],
  // The question each what-if's page answers, and its frozen URL words (change 0033).
  questions: {
    sun2: { q: "What if the Sun were twice as massive?", slug: "sun-twice-as-massive" },
    nosun: { q: "What if the Sun disappeared?", slug: "sun-disappears" },
    giant: { q: "What if the Sun became a red giant?", slug: "sun-becomes-red-giant" },
    jupstar: { q: "What if Jupiter became a star?", slug: "jupiter-becomes-a-star" },
    bh: { q: "What if a black hole flew through the solar system?", slug: "black-hole-flies-through-solar-system" },
    stop: { q: "What if Earth stopped orbiting the Sun?", slug: "earth-stops-orbiting" },
    mars: { q: "What if Earth were in Mars's orbit?", slug: "earth-in-mars-orbit" },
  },
  // The run behind its what-if pages: times read, step and the metric the answer names (change 0033)
  answer: { at: [1, 5, 20], shot: 1 },
  // The day and week speeds are for the small systems (TRAPPIST-1's year is 6 days, change 0037)
  speeds: [[1 / 365, "1 d/s"], [1 / 52, "1 wk/s"], [1 / 12, "1 mo/s"], [0.5, "6 mo/s"], [2, "2 yr/s"], [10, "10 yr/s"]],
  defaultSpeed: 3,
  speedFor: (p) => systemOf(p.sys).speed,
  fmtT: fmtDur,
  metrics: [
    // Small systems need more digits (TRAPPIST-1 e: 0.029 AU, a 6.1-day year, change 0037)
    { k: "dist", label: "Earth–Sun distance", unit: "AU", fmt: (v) => fmtNum(v, v != null && v > 0 && v < 0.1 ? 3 : 2) },
    { k: "temp", label: "Earth temperature", unit: "°C", fmt: (v) => fmtNum(v) },
    { k: "year", label: "Length of year", unit: "days", fmt: (v) => fmtNum(v, v != null && v < 20 ? 1 : 0) },
  ],

  // Another system's words (change 0037): its star(s) and watched planet instead of the Sun and Earth
  reword(p, key) {
    if (!p.sys || p.sys === "sol") return undefined;
    const S = systemOf(p.sys), two = S.stars.length > 1, planet = named(S.watch), giant = giantOf(S.id);
    switch (key) {
      case "whatif.sun2": return { k: two ? "sys.whatif.stars2" : "sys.whatif.star2" };
      case "whatif.nosun": return { k: two ? "sys.whatif.nostars" : "sys.whatif.nostar" };
      case "whatif.giant": return { k: two ? "sys.whatif.giant2" : "sys.whatif.giant" };
      case "whatif.jupstar": return giant ? { k: "sys.whatif.ignite", v: { planet: named(giant) } } : null;
      case "whatif.stop": return { k: "sys.whatif.stop", v: { planet } };
      case "whatif.mars": return { k: "sys.whatif.out", v: { planet } };
      case "metric.dist.label": return { k: "sys.metric.dist", v: { planet } };
      case "metric.temp.label": return { k: "sys.metric.temp", v: { planet } };
      case "ctl.sunm.label": return { k: "sys.ctl.sunm" };
      case "ctl.sunm.unit": return { k: "sys.ctl.sunmUnit" };
      case "ctl.view.opt.inner": return { k: "sys.view.inner" };
      case "ctl.view.opt.mid": return { k: "sys.view.mid" };
      case "ctl.view.opt.outer": return { k: "sys.view.outer" };
    }
    return undefined;
  },

  init(p, seed) {
    const S = systemOf(p.sys), k = p.sunm, amin = Math.min(...S.planets.map((x) => x[1]));
    const host = S.bin?.host === "A" ? [S.stars[0].n] : S.stars.map((x) => x.n);
    // Sub-step: 1/160 of the shortest year (the Solar System's is Mercury's, which gives its usual 0.0015 yr)
    const hostM = S.bin?.host === "A" ? S.stars[0].m : S.stars.reduce((a, x) => a + x.m, 0);
    const pmin = Math.min(Math.sqrt(amin ** 3 / hostM), S.bin ? Math.sqrt(S.bin.a ** 3 / (S.stars[0].m + S.stars[1].m)) : Infinity);
    const w: W = { t: 0, rs: seed, log: [], f: {}, b: [], sys: S.id, watch: S.watch, host, h: Math.min(0.0015, pmin / 160), esc: 1.5 * S.size };
    const star = (x: (typeof S.stars)[number], at: [number, number, number, number]) =>
      body({ n: x.n, x: at[0], y: at[1], vx: at[2], vy: at[3], m: x.m * k, cr: x.r, L: x.L * k ** 4, c: x.c, px: x.m > 0.5 ? 6 : 4.5, star: true });
    if (!S.bin) w.b.push(star(S.stars[0], [0, 0, 0, 0]));
    else {
      // Two stars about their centre of mass, starting at their widest (the real eccentricity; circular for Kepler-16)
      const [A, B] = S.stars, M = (A.m + B.m) * k, r = S.bin.a * (1 + S.bin.e), v = Math.sqrt((G4 * M * (1 - S.bin.e)) / r);
      const fa = (B.m * k) / M, fb = (A.m * k) / M;
      w.b.push(star(A, [-fa * r, 0, 0, -fa * v]), star(B, [fb * r, 0, 0, fb * v]));
    }
    const c0 = centre(w.b.filter((o) => host.includes(o.n)))!;
    for (const [n, a, m, c, px] of S.planets) {
      const g = rng(w) * TAU, v = Math.sqrt((G4 * c0.m) / a);
      const cr = Math.min(m > 1e-4 ? 0.0005 : 0.0003, amin * 0.03);
      w.b.push(body({ n, x: c0.x + a * Math.cos(g), y: c0.y + a * Math.sin(g), vx: c0.vx - v * Math.sin(g), vy: c0.vy + v * Math.cos(g), m, cr, L: 0, c, px }));
    }
    if (!S.bin) {
      // The star moves against its planets so the system's centre of mass stays put (exactly as before change 0037)
      let px = 0, py = 0;
      w.b.forEach((o, i) => { if (i) { px += o.m * o.vx; py += o.m * o.vy; } });
      w.b[0].vx = -px / w.b[0].m;
      w.b[0].vy = -py / w.b[0].m;
    } else {
      const all = centre(w.b)!;
      for (const o of w.b) { o.vx -= all.vx; o.vy -= all.vy; }
    }
    accel(w);
    return w;
  },

  step(w, dt) {
    const n = Math.min(Math.ceil(dt / w.h), Math.max(MAX_SUB, Math.ceil(dt / 0.0015))), h = dt / n, b = w.b;
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
            const ev = big.star && !sm.star ? (big.giant ? "ev.swallowed" : big.n === "Sun" ? "ev.intoSun" : "ev.intoStar") : big.bh ? "ev.intoBh" : "ev.smash";
            note(w, ev, ev === "ev.smash" ? { body: named(sm.n), other: named(big.n) } : ev === "ev.intoStar" ? { body: named(sm.n), star: big.n } : { body: named(sm.n) }, undefined, w.t + k * h);
            accel(w);
            break outer;
          }
        }
    }
    w.t += dt;
    const ref = centre(stars(w)) ?? { x: 0, y: 0, vx: 0, vy: 0, m: 0 };
    for (const o of b) {
      o.tr.push(o.x, o.y);
      if (o.tr.length > 440) o.tr.splice(0, 2);
      if (o.L || o.bh) continue;
      const r = Math.hypot(o.x - ref.x, o.y - ref.y), E = 0.5 * ((o.vx - ref.vx) ** 2 + (o.vy - ref.vy) ** 2) - (G4 * ref.m) / r;
      if (r > w.esc && E > 0) note(w, "ev.escape", { body: named(o.n) }, "esc" + o.n);
    }
  },

  apply(w, id, _p, ui) {
    // The Solar System keeps its own words; another system says the same what-if for its star(s) and watched planet
    const sol = w.sys === "sol", ss = stars(w), main = ss[0], e = find(w, w.watch), j = find(w, giantOf(w.sys) ?? "");
    const S = systemOf(w.sys), at = hostOf(w);
    if (id === "sun2" && ss.length) {
      for (const o of ss) { o.m *= 2; o.L *= 11; }
      if (sol) note(w, "ev.sun2"); else if (ss.length > 1) note(w, "ev.stars2"); else note(w, "ev.star2", { star: main.n });
    }
    if (id === "nosun" && ss.length) {
      for (const o of ss) w.b.splice(w.b.indexOf(o), 1);
      if (sol) note(w, "ev.nosun"); else if (ss.length > 1) note(w, "ev.nostars"); else note(w, "ev.nostar", { star: main.n });
    }
    if (id === "giant" && main) {
      main.cr = 0.85; main.m *= 0.65; main.L = 2500; main.giant = true; main.c = "#FF7A45";
      if (sol) note(w, "ev.giant"); else note(w, "ev.giantStar", { star: main.n });
    }
    if (id === "jupstar" && j) { j.m = 0.08; j.L = 0.0008; j.c = "#FF9A5C"; j.px = 5; j.cr = 0.0008; if (sol) note(w, "ev.jupstar"); else note(w, "ev.ignite", { body: named(j.n) }); }
    if (id === "bh") {
      // Enters from beyond the outermost orbit, as fast (for the system's size and star mass) as in the Solar System
      const r = at ?? { x: 0, y: 0 }, s = S.size / 30, M = S.stars.reduce((a, x) => a + x.m, 0);
      w.b.push(body({ n: "Black hole", x: r.x - 38 * s, y: r.y + 5 * s, vx: 8.5 * Math.sqrt(M / s), vy: 0, m: 4, cr: Math.min(0.003, S.size * 0.01), L: 0, c: "#000000", bh: true, px: 5 }));
      note(w, "ev.bh");
    }
    if (id === "stop" && e) { e.vx = at ? at.vx : 0; e.vy = at ? at.vy : 0; if (sol) note(w, "ev.stop"); else note(w, "ev.stopP", { body: named(e.n) }); }
    if (id === "mars" && e && at) {
      const g = Math.atan2(e.y - at.y, e.x - at.x), a = sol ? 1.524 : 1.5 * Math.hypot(e.x - at.x, e.y - at.y), v = Math.sqrt((G4 * at.m) / a);
      e.x = at.x + a * Math.cos(g); e.y = at.y + a * Math.sin(g);
      e.vx = at.vx - v * Math.sin(g); e.vy = at.vy + v * Math.cos(g); e.tr = [];
      if (sol) note(w, "ev.mars"); else note(w, "ev.out", { body: named(e.n) });
    }
    if (id === "throw" && ui.pending) {
      w.b.push(body({ n: "Your planet", ...ui.pending, m: 1.5e-5, cr: 0.0004, L: 0, c: "#FF8FD0", px: 4 }));
      note(w, "ev.throw");
    }
    accel(w);
  },

  read(w) {
    // The watched planet (Earth in the Solar System) and the star or stars it orbits
    const e = find(w, w.watch), sun = hostOf(w);
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
    const say = worldSay(solar);
    const status = (w: W) => {
      if (!find(w, w.watch)) return "destroyed";
      const r = solar.read(w, { sys: w.sys, sunm: 1, view: "inner" });
      if (r.year == null) return "flying";
      if ((r.temp ?? 0) > 100) return "boiling";
      if ((r.temp ?? 0) < -30) return "frozen";
      return "habitable";
    };
    const rows: InfoRow[] = [{ label: base.sys === "sol" ? say("info.now") : say("sys.info.now", { planet: named(base.watch) }), text: say("status." + status(base)) }];
    if (alt) rows.push({ label: say("info.changed"), text: say("status." + status(alt)), color: "var(--alt)" });
    return [{ rows }];
  },

  draw({ ctx, w: W, h: H, p, isAlt, ui }, w) {
    ctx.fillStyle = STAGE.void;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(220,225,255,.5)";
    BG.forEach(([x, y], i) => ctx.fillRect(x * W, y * H, i % 7 ? 1 : 1.6, i % 7 ? 1 : 1.6));
    // Other systems (change 0037): framed by their own outermost orbit; "inner" is the whole system squeezed, "mid" its inner half
    const S = systemOf(w.sys), sol = w.sys === "sol";
    const half = sol ? VIEW_HALF[p.view] ?? 5.8 : S.size * (p.view === "mid" ? 0.5 : 1.15), pow = VIEW_POW[p.view] ?? 0.55, sun = hostOf(w);
    // The space camera (change 0036): view only. No camera yet = looking straight down, as before.
    const v = ui.view ?? defaultView(0), sc = (Math.min(W, H) / 2 / half) * v.zoom;
    const cx = sun ? sun.x : 0, cy = sun ? sun.y : 0;
    ui.cams[isAlt ? 1 : 0] = { cx, cy, sc, W, H, pow, half };
    /** Squeeze factor for a point dx, dy AU from the centre (1 when the view is linear). */
    const f = (dx: number, dy: number) => { const r = Math.hypot(dx, dy); return pow === 1 || r < 1e-9 ? 1 : (r / half) ** (pow - 1); };
    /** Screen position and depth of a point; `inc` tilts it out of the plane by its orbit's real inclination. */
    const P = (x: number, y: number, inc?: [number, number]): [number, number, number] => {
      const dx = x - cx, dy = y - cy, k = f(dx, dy), qx = dx * k, qy = dy * k;
      const z = inc ? Math.hypot(qx, qy) * Math.sin(inc[0] * DEG) * Math.sin(Math.atan2(dy, dx) - inc[1] * DEG) : 0;
      const [u, vv, d] = project(v, qx, qy, z);
      return [W / 2 + u * sc, H / 2 + vv * sc, d];
    };
    ctx.lineWidth = 1;
    for (const o of w.b) {
      if (o.tr.length < 4) continue;
      const inc = INC[o.n];
      ctx.strokeStyle = o.bh ? "rgba(255,181,71,.35)" : o.c;
      ctx.globalAlpha = 0.35;
      ctx.beginPath();
      for (let i = 0; i < o.tr.length; i += 2) { const [x, y] = P(o.tr[i], o.tr[i + 1], inc); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.font = "11px " + FONT.body;
    const say = worldSay(solar);
    // Far bodies first, so the Sun hides what passes behind it when the view is tilted
    const shown = w.b.map((o) => ({ o, at: P(o.x, o.y, INC[o.n]) })).sort((a, b) => a.at[2] - b.at[2]);
    for (const { o, at: [x, y] } of shown) {
      if (x < -200 || x > W + 200 || y < -200 || y > H + 200) continue;
      if (o.L) {
        const r = Math.max(o.px, o.cr * f(o.cr, 0) * sc), g = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 3);
        g.addColorStop(0, o.c); g.addColorStop(1, "rgba(255,180,80,0)");
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 3, 0, TAU); ctx.fill();
        ctx.fillStyle = o.c; ctx.globalAlpha = o.giant ? 0.7 : 1; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
      } else if (o.bh) {
        ctx.strokeStyle = STAGE.alt; ctx.lineWidth = 2; ctx.fillStyle = "#000"; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.lineWidth = 1;
      } else {
        ctx.fillStyle = o.c; ctx.beginPath(); ctx.arc(x, y, o.px, 0, TAU); ctx.fill();
      }
      const dist = Math.hypot(o.x - cx, o.y - cy);
      // Zoomed in, every body on the stage gets its name; otherwise the view decides, as before
      const show = !sol || o.L || o.bh || v.zoom > 1.6 || (p.view === "inner" ? dist < 6 : p.view === "mid" ? dist < 7 && o.n !== "Mercury" : o.m > 1e-5 || o.n === "Earth");
      // A lone star needs no name; a binary's two do
      if (show && !(o.star && S.stars.length === 1)) { ctx.fillStyle = o.n === w.watch ? "#CFE6FF" : "rgba(200,206,230,.8)"; ctx.fillText(label(say, w, o.n), x + o.px + 4, y - o.px - 2); }
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
