import type { BaseWorld, Sandbox } from "../types";
import { clamp, fmtCalendar, fmtNum, gauss, mix, note, rng } from "../core";
import { FONT, blob, STAGE } from "../draw";
import { COUNTRY_NAMES, COUNTRY_PRESETS } from "../data/countries";

/**
 * Hybrid model:
 * - Aggregate economy (income growth, population, stability) from simple growth rules.
 * - 260 household agents: earn by skill, pay tax, lose income to corruption, trade (yard-sale),
 *   consume. Inequality (Gini), poverty and protests emerge from the agents.
 */
type Gov = "dem" | "hybrid" | "auto";
type P = { preset: string; gdp: number; pop: number; popg: number; edu: number; corr: number; res: number; gov: Gov };

interface Agent { x: number; y: number; vx: number; vy: number; w: number; sk: number; ret: number; rk: number }
interface W extends BaseWorld {
  g: number; pop: number; edu: number; corr: number; res: number; stab: number; ps: number;
  mod: string | null; tf: number; pk: number; tpk: number;
  edu0: number; corr0: number; g0: number;
  a: Agent[]; gini: number; top10: number; mean: number; cut95: number; dec: number[];
}

const GOV_GROWTH: Record<Gov, number> = { dem: 0.002, hybrid: 0, auto: -0.002 };
const GOV_STAB: Record<Gov, number> = { dem: 12, hybrid: 3, auto: 6 };
const GOV_TAX: Record<Gov, number> = { dem: 0.3, hybrid: 0.2, auto: 0.18 };
const APPLY_TEXT: Record<string, string> = {
  edu: "Education budget doubles", corr: "Anti-corruption drive begins", ubi: "Basic income starts: poverty drops, taxes rise",
  oil: "Oil found: export boom", war: "War breaks out: the economy shrinks fast", aging: "Birth rate collapses",
  open: "Borders open: 50 new households arrive",
};

function agent(w: W, wealth: number, sk?: number): Agent {
  return { x: rng(w), y: rng(w), vx: (rng(w) - 0.5) * 0.2, vy: (rng(w) - 0.5) * 0.2, w: wealth, sk: sk ?? clamp(1 + gauss(w) * 0.25, 0.3, 2), ret: rng(w) < 0.12 ? 1 : 0, rk: 0.5 };
}

/** Rank agents, compute Gini, top-10% share, deciles. */
function rank(w: W) {
  const s = w.a.map((a, i) => [a.w, i] as [number, number]).sort((x, y) => x[0] - y[0]);
  const n = s.length;
  let cum = 0, tot = 0;
  s.forEach(([v, idx], r) => { w.a[idx].rk = r / (n - 1); tot += v; cum += v * (r + 1); });
  w.gini = tot > 0 ? (2 * cum) / (n * tot) - (n + 1) / n : 0;
  w.top10 = tot > 0 ? s.slice(Math.floor(n * 0.9)).reduce((q, x) => q + x[0], 0) / tot : 0;
  w.mean = tot / n;
  w.cut95 = s[Math.floor(n * 0.95)][0];
  w.dec = [];
  for (let d = 0; d < 10; d++) w.dec.push(s.slice(Math.floor((n * d) / 10), Math.floor((n * (d + 1)) / 10)).reduce((q, x) => q + x[0], 0) / Math.max(tot, 1e-9));
}

const stabTarget = (w: W, p: P, adj: number) =>
  clamp(30 + 0.35 * w.edu - 0.4 * w.corr + GOV_STAB[p.gov] + 6 * Math.log10(Math.max(1, w.g)) - 60 * Math.max(0, w.gini - 0.42) + adj, 0, 100);

export const country: Sandbox<W, P> = {
  key: "country",
  name: "Countries",
  sub: "Economy & society",
  intro: "Each blob is a household; colour shows how rich it is. Wealth flows through work, trade, taxes and corruption.",
  controls: [
    { type: "select", id: "preset", label: "Country profile", options: COUNTRY_NAMES, val: "dk" },
    { type: "range", id: "gdp", label: "Income per person", min: 1, max: 100, step: 1, val: 68, unit: "k$" },
    { type: "range", id: "pop", label: "Population", min: 1, max: 1500, step: 1, val: 6, unit: "m" },
    { type: "range", id: "popg", label: "Population growth", min: -1, max: 3, step: 0.1, val: 0.4, unit: "%/yr" },
    { type: "range", id: "edu", label: "Education quality", min: 0, max: 100, step: 1, val: 92 },
    { type: "range", id: "corr", label: "Corruption", min: 0, max: 100, step: 1, val: 10 },
    { type: "range", id: "res", label: "Natural resources", min: 0, max: 100, step: 1, val: 30 },
    { type: "select", id: "gov", label: "Government", options: [["dem", "Democracy"], ["hybrid", "Hybrid regime"], ["auto", "Autocracy"]], val: "dem" },
  ],
  whatifs: [
    ["edu", "Double education spending"], ["corr", "Cut corruption in half"], ["ubi", "Universal basic income"],
    ["oil", "Discover huge oil reserves"], ["war", "Fight a five-year war"], ["aging", "Birth rate collapses"],
    ["open", "Open the borders to migrants"],
  ],
  speeds: [[0.25, "3 mo/s"], [1, "1 yr/s"], [3, "3 yr/s"], [8, "8 yr/s"]],
  defaultSpeed: 1,
  fmtT: fmtCalendar,
  metrics: [
    { k: "gdp", label: "Income per person", unit: "k$", fmt: (v) => fmtNum(v, 1) },
    { k: "gini", label: "Inequality (Gini)", unit: "", fmt: (v) => fmtNum(v, 2) },
    { k: "pov", label: "Poverty", unit: "%", fmt: (v) => fmtNum(v) },
    { k: "stab", label: "Stability", unit: "/100", fmt: (v) => fmtNum(v) },
    { k: "pop", label: "Population", unit: "m", fmt: (v) => fmtNum(v, v != null && v < 20 ? 1 : 0) },
  ],

  onParamChange(p, id) {
    if (id === "preset") {
      const pr = COUNTRY_PRESETS[p.preset];
      return pr ? { ...p, ...pr } : p;
    }
    return p.preset === "custom" ? p : { ...p, preset: "custom" };
  },

  init(p, seed) {
    const w: W = {
      t: 0, rs: seed, log: [], f: {}, g: p.gdp, pop: p.pop, edu: p.edu, corr: p.corr, res: p.res, stab: 50, ps: 50,
      mod: null, tf: 0, pk: p.pop, tpk: 0, edu0: p.edu, corr0: p.corr, g0: p.gdp,
      a: [], gini: 0.35, top10: 0.3, mean: 1, cut95: 1, dec: [],
    };
    const sg = 0.45 + (p.corr / 100) * 0.5;
    for (let i = 0; i < 260; i++) w.a.push(agent(w, (w.g / 12) * 31 * Math.exp(gauss(w) * sg - (sg * sg) / 2)));
    rank(w);
    w.stab = w.ps = stabTarget(w, p, 0);
    return w;
  },

  step(w, dt, p) {
    const n = Math.ceil(dt * 12), h = dt / n, f = h * 12, m = w.mod, A = w.a;
    for (let k = 0; k < n; k++) {
      const t = w.t, d = t - w.tf;
      if (m === "edu") w.edu = Math.min(100, w.edu0 + (Math.min(100, w.edu0 * 1.4 + 10) - w.edu0) * Math.min(1, d / 15));
      if (m === "corr") w.corr = w.corr0 / 2 + (w.corr0 / 2) * Math.max(0, 1 - d / 10);
      if (m === "oil") { w.res = Math.min(100, p.res + 50); if (w.corr0 > 40 && d >= 5) w.corr = Math.min(100, w.corr0 + 15 * Math.min(1, (d - 5) / 5)); }
      const war = m === "war" && d < 5;
      let gr = 0.012 + 0.035 * (1 - w.g / 110) * (w.edu / 100) - (0.03 * w.corr) / 100 + ((0.006 * w.res) / 100) * (1 - w.corr / 100) + GOV_GROWTH[p.gov];
      let pg = (p.popg / 100) * (1 - Math.min(0.7, t / 120)), adj = 0;
      if (m === "edu" && d < 8) gr -= 0.003;
      if (m === "ubi") { gr -= 0.004; adj += 10; }
      if (m === "oil" && d < 15) gr += 0.02;
      if (m === "oil" && w.corr0 > 40 && d >= 5) adj -= 8;
      if (m === "war") { if (war) { gr -= 0.09; pg -= 0.012; adj -= 35; } else if (d < 13) gr += 0.035; }
      if (m === "aging") { pg = Math.min(pg, -0.007 * Math.min(1, d / 10)); gr -= 0.004 * Math.min(1, d / 20); }
      if (m === "open") { pg += 0.01; gr += 0.002; adj -= 4; }
      w.g *= 1 + gr * h;
      w.pop *= 1 + pg * h;

      // household economy (flows scaled to fraction-of-month f)
      const inc = (w.g / 12) * f, tax = GOV_TAX[p.gov] + (m === "ubi" ? 0.15 : 0), leak = (w.corr / 100) * 0.5;
      let pool = 0, elite = 0;
      for (const a of A) {
        const earn = a.ret ? 0 : inc * a.sk * (war ? 0.5 : 1), skim = (earn * w.corr) / 100 * 0.25, tx = (earn - skim) * tax;
        a.w += earn - skim - tx; pool += tx * (1 - leak); elite += skim + tx * leak;
      }
      if (m === "oil") { const rent = inc * 0.4 * A.length; if (w.corr0 > 40) { elite += rent * 0.7; pool += rent * 0.3; } else pool += rent; }
      const share = pool / A.length, richCount = Math.max(1, A.filter((a) => a.w >= w.cut95).length), es = elite / richCount;
      for (const a of A) { a.w += share; if (a.w >= w.cut95) a.w += es; a.w = Math.max(0, a.w - 0.75 * inc - 0.008 * f * a.w); }
      const trades = Math.round(22 * f + (rng(w) < (22 * f) % 1 ? 1 : 0));
      for (let q = 0; q < trades; q++) {
        const i = A[(rng(w) * A.length) | 0], j = A[(rng(w) * A.length) | 0];
        if (i === j) continue;
        const st = 0.08 * Math.min(i.w, j.w);
        if (rng(w) < 0.5 + 0.12 * (i.sk - j.sk)) { i.w += st; j.w -= st; } else { i.w -= st; j.w += st; }
      }
      if (war) for (const a of A) { a.w *= 1 - 0.015 * f; if (rng(w) < 0.004 * f) { a.w = w.mean * 0.1; a.sk = clamp(1 + gauss(w) * 0.25, 0.3, 2); } }
      if (m === "aging") { const retired = A.filter((x) => x.ret).length; for (const a of A) if (!a.ret && retired < A.length * 0.4 && rng(w) < 0.002 * f) a.ret = 1; }
      if (m === "edu") for (const a of A) if (rng(w) < 0.004 * f) a.sk = Math.min(2.2, a.sk + 0.15);

      rank(w);
      w.stab += ((stabTarget(w, p, adj) - w.stab) / 4) * h;
      w.t += h;

      if (w.g >= 2 * w.g0) note(w, "Income per person doubles", "dbl");
      if (w.g0 < 14 && w.g >= 14) note(w, "Becomes a high-income country", "hi");
      if (w.ps >= 30 && w.stab < 30) note(w, "Unrest: mass protests fill the streets", "u");
      if (w.ps >= 15 && w.stab < 15) note(w, "High risk of coup or state collapse", "c");
      if (w.top10 > 0.5) note(w, "Richest 10% now own half of all wealth", "t10");
      if (w.pop > w.pk) { w.pk = w.pop; w.tpk = w.t; }
      else if (w.tpk > 0 && w.pop < w.pk * 0.997) note(w, `Population peaks at ${fmtNum(w.pk, w.pk < 20 ? 1 : 0)} m`, "pk", w.tpk);
      if (m === "war" && d >= 5) note(w, "War ends; rebuilding boom begins", "wend");
      if (m === "oil" && w.corr0 > 40 && d >= 5) note(w, "Resource curse: oil money feeds corruption", "curse");
      if (m === "edu" && d >= 15) note(w, "First generation from the better schools starts work", "eduw");
      w.ps = w.stab;
    }
    // movement (visual only, but uses the world RNG so forks stay deterministic)
    const protest = w.stab < 30;
    for (const a of A) {
      if (protest && a.rk < 0.6 && a.sk > 0.9) { a.vx += (0.5 - a.x) * 1.5 * dt; a.vy += (0.5 - a.y) * 1.5 * dt; }
      a.vx += (rng(w) - 0.5) * 0.6 * Math.sqrt(dt); a.vy += (rng(w) - 0.5) * 0.6 * Math.sqrt(dt);
      a.vx *= 0.9; a.vy *= 0.9;
      a.x = clamp(a.x + a.vx * dt * 0.3, 0, 1); a.y = clamp(a.y + a.vy * dt * 0.3, 0, 1);
    }
  },

  apply(w, id) {
    w.mod = id; w.tf = w.t; w.edu0 = w.edu; w.corr0 = w.corr; w.g0 = w.g;
    if (id === "open") for (let i = 0; i < 50; i++) w.a.push(agent(w, w.mean * 0.15, clamp(1 + gauss(w) * 0.3, 0.4, 2)));
    note(w, APPLY_TEXT[id] ?? id);
  },

  read(w) {
    return { gdp: w.g, gini: w.gini, pov: (w.a.filter((a) => a.w < w.mean * 0.25).length / w.a.length) * 100, stab: w.stab, pop: w.pop };
  },

  draw({ ctx, w: W, h: H }, w) {
    ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, W, H);
    const fh = H - 78, pad = 18;
    ctx.fillStyle = STAGE.panel; ctx.fillRect(pad / 2, pad / 2, W - pad, fh - pad / 2);
    const protest = w.stab < 30;
    for (const a of w.a) {
      const x = pad + a.x * (W - pad * 2), y = pad + a.y * (fh - pad * 2);
      const r = clamp(2.4 + 1.7 * Math.sqrt(a.w / Math.max(w.mean, 1e-9)), 2.2, 8);
      const col = a.rk < 0.5 ? mix("#E8836F", "#B3BCE0", a.rk * 2) : mix("#B3BCE0", STAGE.alt, (a.rk - 0.5) * 2);
      blob(ctx, x, y, r, col, a.vx * 3, a.vy * 3);
      if (protest && a.rk < 0.6 && a.sk > 0.9) { ctx.fillStyle = "#FF8A7A"; ctx.fillRect(x - 4, y - r - 9, 8, 5); }
    }
    const bw = (W - 40) / 10;
    w.dec.forEach((s, i) => {
      const bh = Math.min(46, s * 120);
      ctx.fillStyle = i < 5 ? "#E8836F" : i < 9 ? "#B3BCE0" : STAGE.alt;
      ctx.fillRect(20 + i * bw + 2, H - 14 - bh, bw - 4, bh);
    });
    ctx.font = "10.5px " + FONT.body; ctx.fillStyle = STAGE.ink2;
    ctx.fillText("Share of wealth held by each tenth, poorest → richest", 20, H - 62);
  },
};
