import type { BaseWorld, InfoBlock, Sandbox } from "@/lib/sim/types";
import { clamp, fmtCalendar, fmtNum, gauss, note, ref, rng } from "@/lib/sim/core";
import { meta } from "./meta";
import { COUNTRIES, COUNTRY_GROUPS, COUNTRY_OPTIONS, profileParams, type Gov } from "./data";
import { STAGE_MESSAGES, drawCountry, usd, type Figure, type Look, type Tally } from "./scene";
import { worldSay } from "@/lib/sim/say";

/**
 * Hybrid model (change 0016):
 * - Aggregate economy: income growth, population, jobs, lifespan and peace from simple rules.
 * - 260 household agents earn by skill (if they have a job), pay tax, lose income to corruption, get help
 *   from the shared pool, and trade. Poverty, the rich–poor gap and family income emerge from them.
 * - Policies stack: every click adds a modifier to `w.mods`, and every rule reads them all.
 */
type P = {
  preset: string; from?: string; gdp: number; pop: number; popg: number; edu: number; life: number; corr: number; res: number;
  tax: number; jobless: number; gov: Gov;
  s_ubi: number; s_wage: number; s_rich: number; s_cut: number; s_open: number; s_war: number;
};

interface Mod { id: string; t0: number; s: number; e0: number; c0: number; l0: number }
interface Agent { w: number; sk: number; ret: number; job: number; y: number; rk: number }
interface W extends BaseWorld {
  g: number; g0: number; pop: number; edu: number; corr: number; res: number; life: number; tax: number; jl: number;
  stab: number; ps: number; kid: number;
  eduB: number; corrB: number; resB: number; lifeB: number; taxB: number; jlB: number; pov0: number;
  mods: Mod[]; pk: number; tpk: number; q: number; spread: number; skLo: number;
  a: Agent[]; gini: number; top10: number; cut95: number;
}

const N = 260;
const GOV_GROWTH: Record<Gov, number> = { dem: 0.002, hybrid: 0, auto: -0.002 };
const GOV_STAB: Record<Gov, number> = { dem: 12, hybrid: 3, auto: 6 };
/** Mean household money a month in $ per k$ of income per person (55 % reaches households, 2.3 people each). */
const HH_DOLLARS = (1000 * 0.55 * 2.3) / 12;
/** A family is poor below this ($ a month), or below 40 % of the typical family. */
const POOR_LINE = 250;

/** Size settings each sized policy reads when it is clicked. */
const SIZE: Record<string, keyof P> = { ubi: "s_ubi", minwage: "s_wage", taxrich: "s_rich", taxcut: "s_cut", open: "s_open", war: "s_war" };

/** Policy groups; their names are `group.<i>` in MESSAGES. */
export const WHATIF_GROUPS: [string, string[]][] = [
  ["Money", ["ubi", "minwage", "taxrich", "taxcut"]],
  ["Services", ["edu", "health", "build", "corr"]],
  ["Society", ["open", "aging", "robots", "trade"]],
  ["Shocks", ["oil", "war", "pandemic", "drought"]],
];

/** English words of this world (change 0025): event lines. */
const MESSAGES: Record<string, string> = {
  "ev.apply.edu": "Education budget doubles",
  "ev.apply.corr": "Anti-corruption drive begins",
  "ev.apply.ubi": "Basic income starts: poverty drops, taxes rise",
  "ev.apply.oil": "Oil found: export boom",
  "ev.apply.war": "War breaks out: the economy shrinks fast",
  "ev.apply.aging": "Birth rate collapses",
  "ev.apply.open": "Borders open: {n} new households arrive",
  "ev.apply.health": "Healthcare becomes free for everyone",
  "ev.apply.minwage": "The minimum wage goes up",
  "ev.apply.taxrich": "The richest pay more tax",
  "ev.apply.taxcut": "Taxes are cut for everyone",
  "ev.apply.build": "Building starts on roads, rail and power lines",
  "ev.apply.robots": "Robots arrive in the factories",
  "ev.apply.pandemic": "A pandemic hits: schools and shops close",
  "ev.apply.trade": "Borders close to trade: imports cost more",
  "ev.apply.drought": "A long drought begins",
  "ev.dbl": "Income per person doubles",
  "ev.hi": "Becomes a high-income country",
  "ev.u": "Unrest: mass protests fill the streets",
  "ev.c": "High risk of coup or state collapse",
  "ev.t10": "Richest 10% now own half of all wealth",
  "ev.pk": "Population peaks at {n} m",
  "ev.wend": "War ends; rebuilding boom begins",
  "ev.curse": "Resource curse: oil money feeds corruption",
  "ev.eduw": "First generation from the better schools starts work",
  "ev.built": "New roads, rail and power lines open",
  "ev.robo2": "New kinds of jobs appear around the robots",
  "ev.pand": "The pandemic ends; shops and schools reopen",
  "ev.rain": "The rains return",
  "ev.povh": "Poverty has halved since 2026",
  "ev.jl15": "1 in 7 adults is now out of work",
  "ev.life5": "People now live 5 years longer than in 2026",
  "ev.lifed": "Lifespans fall by 5 years",
  // The console: policy groups and the picker
  ...Object.fromEntries(WHATIF_GROUPS.map(([g], i) => [`group.${i}`, g])),
  "ui.pick": "Pick a country",
  "ui.changesHint": "They add up. Sizes are in Tune. Tick them off above to compare.",
  "name.this": "This country",
  "name.ownFrom": "Your own country (from {from})",
  // The side panel
  "info.changed": "What changed",
  "info.noChange": "With no change, {year}",
  "info.now": "{country}, {year}",
  "info.people": "{pop} million people. A typical family lives on {usd} a month.",
  "info.poor": "{pov} out of 100 people are poor; {jobless} out of 100 adults are out of work.",
  "info.life": "People live about {n} years. {calm}",
  "info.about": "About the numbers",
  "info.aboutText": "Starting figures are rounded, approximate values from the mid-2020s. After that the country runs on simple rules: it shows how things push each other, not a forecast.",
  "info.curious": "For the curious",
  "info.gini": "Wealth Gini {gini} · richest 10% own {pct}% of wealth",
  "calm.3": "Life is calm and people mostly trust each other.",
  "calm.2": "Life is mostly calm, with some anger at the top.",
  "calm.1": "Many people are angry; protests are close.",
  "calm.0": "Protests fill the streets.",
  // "What changed": the story
  "story.head": "Compared with the same country with no change, in {year}:",
  "story.famMore": "A typical family has {usd} more a month.",
  "story.famLess": "A typical family has {usd} less a month.",
  "story.povMore": "{n, plural, one {# more person out of 100 is poor.} other {# more people out of 100 are poor.}}",
  "story.povFewer": "{n, plural, one {# fewer person out of 100 is poor.} other {# fewer people out of 100 are poor.}}",
  "story.jobMore": "{n, plural, one {# more adult out of 100 is out of work.} other {# more adults out of 100 are out of work.}}",
  "story.jobFewer": "{n, plural, one {# fewer adult out of 100 is out of work.} other {# fewer adults out of 100 are out of work.}}",
  "story.longer": "People live {n} years longer.",
  "story.shorter": "People live {n} years shorter.",
  "story.stopped": "The protests have stopped.",
  "story.calmer": "The country is calmer.",
  "story.angrier": "People are angrier.",
  "story.gapBigger": "The gap between rich and poor is bigger.",
  "story.gapSmaller": "The gap between rich and poor is smaller.",
  "story.popMore": "{n} million more people live here.",
  "story.popFewer": "{n} million fewer people live here.",
  "story.none": "Not much is different yet. Give it a few years.",
  // The chart's sentence under a metric (what-if − no change)
  "diff.famMore": "{usd} more a month", "diff.famLess": "{usd} less a month",
  "diff.povMore": "{n, plural, one {# more person out of 100 is poor} other {# more people out of 100 are poor}}",
  "diff.povFewer": "{n, plural, one {# fewer person out of 100 is poor} other {# fewer people out of 100 are poor}}",
  "diff.gapBigger": "the gap is {n}× bigger", "diff.gapSmaller": "the gap is {n}× smaller",
  "diff.jobMore": "{n, plural, one {# more adult out of 100 has no job} other {# more adults out of 100 have no job}}",
  "diff.jobFewer": "{n, plural, one {# fewer adult out of 100 has no job} other {# fewer adults out of 100 have no job}}",
  "diff.longer": "{n} years longer lives", "diff.shorter": "{n} years shorter lives",
  "diff.calmer": "{n, plural, one {# point calmer} other {# points calmer}}",
  "diff.lessCalm": "{n, plural, one {# point less calm} other {# points less calm}}",
  "diff.popMore": "{n} million more people", "diff.popFewer": "{n} million fewer people",
  ...STAGE_MESSAGES,
};
/** This world's words in the page's language (labels + MESSAGES). */
const say = () => worldSay(country);

/** Equilibrium chance of being out of work for a skill, given the job-market pressure q (low skill is hit first). */
const jobless = (q: number, sk: number) => q / (q + (1 - q) * sk);

/** Skill (earning power) is log-normal: wider in more unequal, more corrupt countries. */
const skill = (w: W, spread: number) => clamp(Math.exp(gauss(w) * spread - (spread * spread) / 2), 0.12, 6);

function agent(w: W, wealth: number, sk: number): Agent {
  const ret = rng(w) < 0.12 ? 1 : 0;
  return { w: wealth, sk, ret, job: rng(w) < jobless(pressure(w), sk) ? 0 : 1, y: 0, rk: 0.5 };
}

/** The job-market pressure that makes the average jobless share equal w.jl for this population. */
function pressure(w: W): number {
  if (!w.a.length) return w.jl;
  let lo = 0.0005, hi = 0.95;
  for (let k = 0; k < 24; k++) {
    const q = (lo + hi) / 2;
    const m = w.a.reduce((s, a) => s + (a.ret ? 0 : jobless(q, a.sk)), 0) / Math.max(1, w.a.filter((a) => !a.ret).length);
    if (m > w.jl) hi = q; else lo = q;
  }
  return (lo + hi) / 2;
}

/** Rank agents by wealth; Gini, top-10 % share and the richest-5 % cut-off. */
function rank(w: W) {
  const s = w.a.map((a, i) => [a.w, i] as [number, number]).sort((x, y) => x[0] - y[0]);
  const n = s.length;
  let cum = 0, tot = 0;
  s.forEach(([v, idx], r) => { w.a[idx].rk = r / (n - 1); tot += v; cum += v * (r + 1); });
  w.gini = tot > 0 ? (2 * cum) / (n * tot) - (n + 1) / n : 0;
  w.top10 = tot > 0 ? s.slice(Math.floor(n * 0.9)).reduce((q, x) => q + x[0], 0) / tot : 0;
  w.cut95 = s[Math.floor(n * 0.95)][0];
}

/* ───────────── income statistics (cached per world and time) ───────────── */

export interface Stats { fam: number; line: number; pov: number; gap: number; jobless: number; ys: number[]; scale: number }
const cache = new WeakMap<W, { t: number; n: number; s: Stats }>();

function stats(w: W): Stats {
  const hit = cache.get(w);
  if (hit && hit.t === w.t && hit.n === w.a.length) return hit.s;
  const ys = w.a.map((a) => a.y).sort((x, y) => x - y), n = ys.length;
  const mean = ys.reduce((q, v) => q + v, 0) / n || 1e-9;
  const scale = (w.g * HH_DOLLARS) / mean;
  const med = ys[n >> 1] * scale;
  const line = Math.max(POOR_LINE, 0.5 * med);
  const pov = (ys.filter((v) => v * scale < line).length / n) * 100;
  const k = Math.max(1, Math.round(n / 10));
  const lo = ys.slice(0, k).reduce((q, v) => q + v, 0) / k, hi = ys.slice(n - k).reduce((q, v) => q + v, 0) / k;
  const gap = hi / Math.max(lo, mean * 0.02);
  const adults = w.a.filter((a) => !a.ret);
  const jl = adults.length ? (adults.filter((a) => !a.job).length / adults.length) * 100 : 0;
  const s = { fam: med, line, pov, gap, jobless: jl, ys, scale };
  cache.set(w, { t: w.t, n, s });
  return s;
}

/** Peace: schools, honesty, government, wealth; minus a wide rich–poor income gap and joblessness. */
const stabTarget = (w: W, p: P, adj: number) =>
  clamp(40 + 0.35 * w.edu - 0.4 * w.corr + GOV_STAB[p.gov] + 6 * Math.log10(Math.max(1, w.g)) - 4 * Math.max(0, Math.log2(stats(w).gap / 5)) - 80 * Math.max(0, w.jl - 0.1) + adj, 0, 100);

/** Is a modifier active (for the stage)? */
const active = (w: W, id: string, len: number) => w.mods.some((m) => m.id === id && w.t - m.t0 < len);

/* ───────────── one sub-step (h years, f months) ───────────── */

function sub(w: W, h: number, f: number, p: P) {
  const t = w.t, A = w.a;
  let gr = 0.012 + 0.035 * (1 - w.g / 110) * (w.edu / 100) - (0.03 * w.corr) / 100 + ((0.006 * w.res) / 100) * (1 - w.corr / 100) + GOV_GROWTH[p.gov] - 0.008 * (w.tax - 0.3);
  let pg = (p.popg / 100) * (1 - Math.min(0.7, t / 120)), pgAdd = 0, agingCap = Infinity, adj = 0;
  let jlT = w.jlB, lifeT = w.lifeB + clamp(3 * Math.log2(Math.max(0.1, w.g / w.g0)), -6, 6);
  let eduAdd = 0, corrAdd = 0, resAdd = 0, taxAdd = 0, ubiTax = 0, ill = 0, wageUp = 0, richTax = 0, skilledUp = 0, skillUps = 0;
  let rentPool = 0, rentElite = 0, war = false, dry = false, aging = false;

  for (const m of w.mods) {
    const d = t - m.t0, s = m.s;
    switch (m.id) {
      case "edu": eduAdd += (Math.min(100, m.e0 * 1.4 + 10) - m.e0) * Math.min(1, d / 15); if (d < 8) gr -= 0.003; if (d >= 15) jlT -= 0.01; skillUps++; break;
      case "corr": corrAdd -= (m.c0 / 2) * Math.min(1, d / 10); break;
      case "ubi": ubiTax += (0.15 * s) / 25; gr -= (0.004 * s) / 25; adj += Math.min(14, (10 * s) / 25); jlT += (0.005 * s) / 25; break;
      case "oil":
        resAdd += 50; if (d < 15) gr += 0.02;
        if (m.c0 > 40) { rentElite += 0.28; rentPool += 0.12; if (d >= 5) { corrAdd += 15 * Math.min(1, (d - 5) / 5); adj -= 8; } } else rentPool += 0.4;
        break;
      case "war":
        if (d < s) { gr -= 0.09; pgAdd -= 0.012; adj -= 35; jlT += 0.12; lifeT -= 8; war = true; } else if (d < s + 8) gr += 0.035;
        break;
      case "aging": agingCap = Math.min(agingCap, -0.007 * Math.min(1, d / 10)); gr -= 0.004 * Math.min(1, d / 20); aging = true; break;
      case "open":
        pgAdd += ((0.01 * s) / 50) * Math.max(0.2, 1 - d / 30); gr += (0.002 * s) / 50; adj -= ((4 * s) / 50) * Math.max(0.25, 1 - d / 15);
        if (d < 5) jlT += ((0.01 * s) / 50) * (1 - d / 5);
        break;
      case "health": taxAdd += 0.04; lifeT += (85 - m.l0) * 0.35 * Math.min(1, d / 10); jlT -= 0.005; gr += d < 3 ? -0.002 : 0.002 * Math.min(1, (d - 3) / 7); adj += 4; break;
      case "minwage": wageUp += s / 100; jlT += (0.015 * s) / 50; adj += 2; break;
      case "taxrich": richTax += s / 100; gr -= (0.0015 * s) / 15; adj += ((3 * s) / 15) * (w.gini > 0.3 ? 1 : 0.5); break;
      case "taxcut": taxAdd -= s / 100; gr += d < 6 ? (0.006 * s) / 10 : (0.002 * s) / 10; adj -= (2 * s) / 10; lifeT -= ((0.5 * s) / 10) * Math.min(1, d / 10); jlT -= 0.005; break;
      case "build": if (d < 6) { gr -= 0.006; jlT -= 0.02; } else gr += 0.006 * Math.min(1, (d - 6) / 4); break;
      case "robots": gr += d < 10 ? 0.01 : 0.004; jlT += 0.06 * Math.max(0.35, 1 - d / 15); skilledUp += 0.3; adj -= d < 10 ? 4 : 1; break;
      case "pandemic": if (d < 2) { gr -= 0.05; jlT += 0.08; lifeT -= 3; adj -= 6; ill += 0.15; } else if (d < 4) gr += 0.03; break;
      case "trade": gr -= d < 3 ? 0.02 : 0.012; jlT += d < 5 ? 0.02 : 0.01; adj -= 2; break;
      case "drought": if (d < 6) { gr -= 0.015; jlT += 0.02; lifeT -= 1; adj -= 5; dry = true; } break;
    }
  }
  w.edu = clamp(w.eduB + eduAdd, 0, 100);
  w.corr = clamp(w.corrB + corrAdd, 0, 100);
  w.res = clamp(w.resB + resAdd, 0, 100);
  w.tax = clamp(w.taxB + taxAdd, 0.05, 0.7);
  const ubiRate = Math.min(ubiTax, 0.75 - w.tax);
  if (aging) pg = Math.min(pg, agingCap);
  pg += pgAdd;

  w.g = Math.max(0.3, w.g * (1 + gr * h));
  w.pop *= 1 + pg * h;
  w.jl += (clamp(jlT, 0.01, 0.6) - w.jl) * Math.min(1, h / 1);
  w.life += (clamp(lifeT, 40, 88) - w.life) * Math.min(1, h / 4);
  w.kid += (clamp(0.14 + pg * 9, 0.08, 0.45) - w.kid) * Math.min(1, h / 10);

  // Household money for this sub-step (f months)
  const inc = (w.g / 12) * f, leak = (w.corr / 100) * 0.5, n = A.length;
  const net = new Float64Array(n);
  let pool = 0, cash = 0, elite = 0, idle = 0;
  for (let i = 0; i < n; i++) {
    const a = A[i];
    if (a.ret || !a.job) { idle += Math.sqrt(a.sk); continue; }
    let earn = inc * a.sk * (war ? 0.5 : 1) * (1 - ill);
    if (wageUp && a.sk < w.skLo) earn *= 1 + wageUp;
    if (skilledUp && a.sk > 1.2) earn *= 1 + skilledUp;
    if (dry && a.sk < w.skLo) earn *= 0.7;
    const skim = ((earn * w.corr) / 100) * 0.25, base = earn - skim;
    const tx = base * w.tax, tu = base * ubiRate, tr = a.rk >= 0.9 ? base * richTax : 0;
    net[i] = base - tx - tu - tr; pool += tx * (1 - leak); cash += (tu + tr * 0.5) * (1 - leak); elite += skim + (tx + tu + tr) * leak;
  }
  pool += inc * rentPool * n; elite += inc * rentElite * n;
  // Taxes: about two thirds pay for services (schools, roads, clinics), a fifth comes back as cash to all, the rest helps those without work
  const equal = (pool * 0.2 + cash) / n, help = (pool * 0.15) / Math.max(1, idle);
  const richCount = Math.max(1, A.filter((a) => a.w >= w.cut95).length), es = elite / richCount;
  const k = 1 - Math.exp(-f / 2);
  for (let i = 0; i < n; i++) {
    const a = A[i];
    // Everyone also has a little informal income (home farming, odd jobs, family help), untaxed
    // Pensions and job-seeker help follow what the household used to earn
    const got = net[i] + 0.07 * inc + equal + (a.ret || !a.job ? help * Math.sqrt(a.sk) : 0) + (a.w >= w.cut95 ? es : 0);
    a.w = Math.max(0, a.w + got - 0.75 * inc - 0.008 * f * a.w);
    a.y += (got / f - a.y) * k;
  }
  // Yard-sale trades
  const trades = Math.round(22 * f + (rng(w) < (22 * f) % 1 ? 1 : 0));
  for (let q = 0; q < trades; q++) {
    const i = A[(rng(w) * n) | 0], j = A[(rng(w) * n) | 0];
    if (i === j) continue;
    const st = 0.08 * Math.min(i.w, j.w);
    if (rng(w) < 0.5 + 0.12 * (i.sk - j.sk)) { i.w += st; j.w -= st; } else { i.w -= st; j.w += st; }
  }
  // Jobs: lose or find one, at rates that settle to the jobless rate (low skill is hit first)
  if (Math.abs(w.jl - w.jlB) > 1e-4 || w.q <= 0) w.q = pressure(w);
  const r = 0.15 * f, q = w.q;
  for (const a of A) {
    if (a.ret) continue;
    if (a.job) { if (rng(w) < (r * q) / Math.sqrt(a.sk)) a.job = 0; }
    else if (rng(w) < r * (1 - q) * Math.sqrt(a.sk)) a.job = 1;
  }
  if (war) { const mean = A.reduce((q, a) => q + a.w, 0) / n; for (const a of A) { a.w *= 1 - 0.015 * f; if (rng(w) < 0.004 * f) { a.w = mean * 0.1; a.sk = skill(w, w.spread); } } }
  if (aging) { const retired = A.filter((x) => x.ret).length; for (const a of A) if (!a.ret && retired < n * 0.4 && rng(w) < 0.002 * f) a.ret = 1; }
  for (let u = 0; u < skillUps; u++) for (const a of A) if (rng(w) < 0.004 * f) a.sk = Math.min(6, a.sk * 1.12 + 0.05);

  rank(w);
  w.stab += ((stabTarget(w, p, adj) - w.stab) / 4) * h;
  w.t += h;

  if (w.g >= 2 * w.g0) note(w, "ev.dbl", undefined, "dbl");
  if (w.g0 < 14 && w.g >= 14) note(w, "ev.hi", undefined, "hi");
  if (w.ps >= 30 && w.stab < 30) note(w, "ev.u", undefined, "u");
  if (w.ps >= 15 && w.stab < 15) note(w, "ev.c", undefined, "c");
  if (w.top10 > 0.5) note(w, "ev.t10", undefined, "t10");
  if (w.pop > w.pk) { w.pk = w.pop; w.tpk = w.t; }
  else if (w.tpk > 0 && w.pop < w.pk * 0.997) note(w, "ev.pk", { n: w.pk < 20 ? Math.round(w.pk * 10) / 10 : Math.round(w.pk) }, "pk", w.tpk);
  for (const m of w.mods) {
    const d = w.t - m.t0;
    if (m.id === "war" && d >= m.s) note(w, "ev.wend", undefined, "wend");
    if (m.id === "oil" && m.c0 > 40 && d >= 5) note(w, "ev.curse", undefined, "curse");
    if (m.id === "edu" && d >= 15) note(w, "ev.eduw", undefined, "eduw");
    if (m.id === "build" && d >= 6) note(w, "ev.built", undefined, "built");
    if (m.id === "robots" && d >= 12) note(w, "ev.robo2", undefined, "robo2");
    if (m.id === "pandemic" && d >= 2) note(w, "ev.pand", undefined, "pand");
    if (m.id === "drought" && d >= 6) note(w, "ev.rain", undefined, "rain");
  }
  w.ps = w.stab;
}

/* ───────────── people on the stage ───────────── */

const hash = (i: number, k: number) => { const x = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return x - Math.floor(x); };

/** 100 people sampled at income percentiles, poorest first, each with a state the stage can draw. */
function people(w: W): { figs: Figure[]; tally: Tally } {
  const s = stats(w);
  const order = w.a.map((a, i) => i).sort((i, j) => w.a[i].y - w.a[j].y);
  const war = active(w, "war", w.mods.find((m) => m.id === "war")?.s ?? 0), sick = active(w, "pandemic", 2);
  const out = clamp(((100 - w.edu) / 100) * 0.85 + (war ? 0.3 : 0) + (sick ? 0.5 : 0), 0, 0.95);
  const figs: Figure[] = [];
  const poor = Math.round(s.pov);
  let kidsOut = 0;
  for (let i = 0; i < 100; i++) {
    const a = w.a[order[Math.min(order.length - 1, Math.floor(((i + 0.5) / 100) * order.length))]];
    const usd = a.y * s.scale;
    const band = i < poor ? 0 : usd > 2 * s.fam ? 2 : 1;
    let kind: Figure["kind"];
    if (hash(i, 1) < w.kid) { kind = hash(i, 2) < out * (1.6 - (1.2 * i) / 100) ? "kidOut" : "kid"; if (kind === "kidOut") kidsOut++; }
    else if (a.ret) kind = "retired";
    else if (!a.job) kind = "jobless";
    else kind = "work";
    figs.push({ band, kind, protest: w.stab < 30 && band < 2 && kind !== "kid" && kind !== "kidOut" && hash(i, 3) < 0.55 });
  }
  return { figs, tally: { poor, jobless: Math.round(s.jobless), kidsOut, fam: s.fam } };
}

/* ───────────── sandbox ───────────── */

export const country: Sandbox<W, P> = {
  ...meta,
  intro: "A street in the country, and the same country as 100 people from poorest to richest. Pick a country, then make changes: they add up.",
  messages: MESSAGES,
  controls: [
    { type: "select", id: "preset", label: "Country", options: COUNTRY_OPTIONS, groups: COUNTRY_GROUPS, val: "dk" },
    { type: "heading", label: "People" },
    { type: "range", id: "pop", label: "Population", min: 1, max: 1500, step: 1, val: 6, unit: "million" },
    { type: "range", id: "popg", label: "Population growth", min: -1, max: 3, step: 0.1, val: 0.5, unit: "% a year" },
    { type: "heading", label: "Money" },
    { type: "range", id: "gdp", label: "Income per person", min: 1, max: 100, step: 0.5, val: 68, unit: "k$ a year" },
    { type: "range", id: "tax", label: "Taxes", min: 5, max: 55, step: 1, val: 47, unit: "% of income" },
    { type: "range", id: "jobless", label: "Out of work", min: 1, max: 35, step: 1, val: 5, unit: "%" },
    { type: "range", id: "res", label: "Natural resources (oil, metals)", min: 0, max: 100, step: 1, val: 30, unit: "/100" },
    { type: "heading", label: "Public life" },
    { type: "range", id: "edu", label: "Schools", min: 0, max: 100, step: 1, val: 92, unit: "/100" },
    { type: "range", id: "life", label: "Healthcare: lifespan", min: 45, max: 85, step: 1, val: 81, unit: "years" },
    { type: "range", id: "corr", label: "Corruption", min: 0, max: 100, step: 1, val: 10, unit: "/100" },
    { type: "select", id: "gov", label: "Government", options: [["dem", "Democracy"], ["hybrid", "Mixed: elections, few freedoms"], ["auto", "One ruler or party"]], val: "dem" },
    { type: "heading", label: "Policy sizes (used by your next click)" },
    { type: "range", id: "s_ubi", label: "Basic income size", min: 10, max: 50, step: 5, val: 25, unit: "% of average income", live: true },
    { type: "range", id: "s_wage", label: "Minimum wage rise", min: 10, max: 100, step: 5, val: 30, unit: "%", live: true },
    { type: "range", id: "s_rich", label: "Extra tax on the richest", min: 5, max: 30, step: 1, val: 15, unit: "points", live: true },
    { type: "range", id: "s_cut", label: "Tax cut", min: 5, max: 20, step: 1, val: 10, unit: "points", live: true },
    { type: "range", id: "s_open", label: "Newcomer households", min: 10, max: 100, step: 10, val: 50, live: true },
    { type: "range", id: "s_war", label: "War length", min: 1, max: 10, step: 1, val: 5, unit: "years", live: true },
  ],
  whatifs: [
    ["ubi", "Universal basic income"], ["minwage", "Raise the minimum wage"], ["taxrich", "Tax the richest more"], ["taxcut", "Cut taxes for everyone"],
    ["edu", "Double education spending"], ["health", "Free healthcare for everyone"], ["build", "Build roads, rail and power"], ["corr", "Cut corruption in half"],
    ["open", "Open the borders to migrants"], ["aging", "Birth rate collapses"], ["robots", "Robots do half the factory work"], ["trade", "Close the borders to trade"],
    ["oil", "Discover huge oil reserves"], ["war", "Fight a war"], ["pandemic", "A pandemic hits"], ["drought", "Years of drought"],
  ],
  speeds: [[0.25, "3 mo/s"], [1, "1 yr/s"], [3, "3 yr/s"], [8, "8 yr/s"]],
  defaultSpeed: 1,
  fmtT: fmtCalendar,
  metrics: [
    {
      k: "fam", label: "Family income", unit: "$ a month", fmt: (v) => (v == null ? "—" : usd(v)), better: "up",
      help: "Money a typical family has each month, after tax and help.",
      diff: (d) => (Math.abs(d) < 5 ? "" : say()(d > 0 ? "diff.famMore" : "diff.famLess", { usd: usd(Math.abs(d)) })),
    },
    {
      k: "pov", label: "Poor", unit: "of 100", fmt: (v) => fmtNum(v), better: "down",
      help: "Out of 100 people, how many live on less than about $250 a family a month, or far less than most families around them.",
      diff: (d) => { const n = Math.round(Math.abs(d)); return n ? say()(d < 0 ? "diff.povFewer" : "diff.povMore", { n }) : ""; },
    },
    {
      k: "gap", label: "Rich–poor gap", unit: "", fmt: (v) => (v == null ? "—" : fmtNum(v, 1) + "×"), better: "down",
      help: "How many times more the richest 10 people get than the poorest 10.",
      diff: (d) => (Math.abs(d) < 0.1 ? "" : say()(d < 0 ? "diff.gapSmaller" : "diff.gapBigger", { n: fmtNum(Math.abs(d), 1) })),
    },
    {
      k: "jobless", label: "Out of work", unit: "of 100", fmt: (v) => fmtNum(v), better: "down",
      help: "Out of 100 adults who want a job, how many cannot find one.",
      diff: (d) => { const n = Math.round(Math.abs(d)); return n ? say()(d < 0 ? "diff.jobFewer" : "diff.jobMore", { n }) : ""; },
    },
    {
      k: "life", label: "Lifespan", unit: "years", fmt: (v) => fmtNum(v, 1), better: "up",
      help: "How many years a baby born now can expect to live.",
      diff: (d) => (Math.abs(d) < 0.1 ? "" : say()(d > 0 ? "diff.longer" : "diff.shorter", { n: fmtNum(Math.abs(d), 1) })),
    },
    {
      k: "calm", label: "Peace", unit: "/100", fmt: (v) => fmtNum(v), better: "up",
      help: "How calm and trusting the country is: 100 is peaceful, under 30 means protests in the streets.",
      diff: (d) => { const n = Math.round(Math.abs(d)); return n ? say()(d > 0 ? "diff.calmer" : "diff.lessCalm", { n }) : ""; },
    },
    {
      k: "pop", label: "People", unit: "million", fmt: (v) => fmtNum(v, v != null && v < 20 ? 1 : 0),
      help: "How many people live in the country, in millions.",
      diff: (d) => (Math.abs(d) < 0.05 ? "" : say()(d > 0 ? "diff.popMore" : "diff.popFewer", { n: fmtNum(Math.abs(d), Math.abs(d) < 20 ? 1 : 0) })),
    },
  ],

  onParamChange(p, id) {
    if (id === "preset") {
      const pr = profileParams(p.preset);
      return pr ? { ...p, ...pr, from: p.preset } : p;
    }
    if (id.startsWith("s_")) return p;
    return p.preset === "custom" ? p : { ...p, preset: "custom", from: p.preset };
  },

  init(p, seed) {
    const tax = p.tax / 100, jl = p.jobless / 100;
    const w: W = {
      t: 0, rs: seed, log: [], f: {},
      g: p.gdp, g0: p.gdp, pop: p.pop, edu: p.edu, corr: p.corr, res: p.res, life: p.life, tax, jl, stab: 50, ps: 50,
      kid: clamp(0.14 + (p.popg / 100) * 9, 0.08, 0.45),
      eduB: p.edu, corrB: p.corr, resB: p.res, lifeB: p.life, taxB: tax, jlB: jl, pov0: 0,
      mods: [], pk: p.pop, tpk: 0, q: 0, skLo: 0.7, spread: 0.45 + (p.corr / 100) * 0.55, a: [], gini: 0.35, top10: 0.3, cut95: 1,
    };
    const sg = 0.45 + (p.corr / 100) * 0.5;
    for (let i = 0; i < N; i++) w.a.push(agent(w, (w.g / 12) * 31 * Math.exp(gauss(w) * sg - (sg * sg) / 2), skill(w, w.spread)));
    w.skLo = w.a.map((a) => a.sk).sort((x, y) => x - y)[Math.floor(N * 0.3)];
    w.q = pressure(w);
    for (const a of w.a) a.job = a.ret || rng(w) >= jobless(w.q, a.sk) ? 1 : 0;
    rank(w);
    // Settle incomes for a simulated year before the clock starts, so the first readouts are real
    for (let m = 0; m < 12; m++) { sub(w, 1 / 12, 1, p); }
    w.t = 0; w.log = []; w.f = {}; w.g = p.gdp; w.pop = p.pop; w.pk = p.pop; w.tpk = 0;
    w.stab = w.ps = stabTarget(w, p, 0);
    w.pov0 = stats(w).pov;
    return w;
  },

  step(w, dt, p) {
    const n = Math.ceil(dt * 12), h = dt / n;
    for (let k = 0; k < n; k++) sub(w, h, h * 12, p);
    const s = stats(w);
    if (w.pov0 >= 8 && s.pov <= w.pov0 / 2) note(w, "ev.povh", undefined, "povh");
    if (w.jlB < 0.14 && w.jl >= 0.15) note(w, "ev.jl15", undefined, "jl15");
    if (w.life >= w.lifeB + 5) note(w, "ev.life5", undefined, "life5");
    if (w.life <= w.lifeB - 5) note(w, "ev.lifed", undefined, "lifed");
  },

  apply(w, id, p) {
    const key = SIZE[id], s = key ? Number(p[key]) : 1;
    w.mods.push({ id, t0: w.t, s, e0: w.edu, c0: w.corr, l0: w.life });
    if (id === "open") for (let i = 0; i < s; i++) w.a.push(agent(w, 0.15 * (w.a.reduce((q, a) => q + a.w, 0) / w.a.length), skill(w, w.spread * 1.1)));
    note(w, `ev.apply.${id}`, id === "open" ? { n: s } : undefined);
  },

  read(w) {
    const s = stats(w);
    return { fam: s.fam, pov: s.pov, gap: s.gap, jobless: s.jobless, life: w.life, calm: w.stab, pop: w.pop };
  },

  info(base, alt, p) {
    const S = say(), name = countryName(p);
    const b = country.read(base, p), y = fmtCalendar(base.t);
    const blocks: InfoBlock[] = [];
    if (alt) {
      blocks.push({ heading: S("info.changed"), accent: true, rows: story(b, country.read(alt, p), y).map((text) => ({ text })) });
    }
    blocks.push({
      heading: alt ? S("info.noChange", { year: y }) : S("info.now", { country: name, year: y }),
      rows: [
        { text: S("info.people", { pop: fmtNum(b.pop, b.pop! < 20 ? 1 : 0), usd: usd(b.fam ?? 0) }) },
        { text: S("info.poor", { pov: fmtNum(b.pov), jobless: fmtNum(b.jobless) }) },
        { text: S("info.life", { n: fmtNum(b.life), calm: ref(calmKey(b.calm!)) }) },
      ],
    });
    blocks.push({
      heading: S("info.about"),
      rows: [
        { text: S("info.aboutText") },
        { label: S("info.curious"), text: S("info.gini", { gini: fmtNum(base.gini, 2), pct: fmtNum(base.top10 * 100) }) },
      ],
    });
    return blocks;
  },

  draw({ ctx, w: Wd, h: Hd, p, isAlt, base }, w) {
    const pp = people(w);
    const bp = base ? people(base as W).tally : null;
    const s = stats(w), n = s.ys.length;
    const dec: number[] = [];
    for (let d = 0; d < 10; d++) dec.push(s.ys[Math.min(n - 1, Math.floor(((d + 0.5) / 10) * n))] * s.scale);
    const warM = w.mods.find((m) => m.id === "war");
    const build = w.mods.find((m) => m.id === "build");
    const look: Look = {
      dec0: dec[0], dec1: dec[1], dec2: dec[2], dec3: dec[3], dec4: dec[4], dec5: dec[5], dec6: dec[6], dec7: dec[7], dec8: dec[8], dec9: dec[9],
      g: w.g, edu: w.edu, life: w.life, jl: w.jl, calm: w.stab,
      war: warM && w.t - warM.t0 < warM.s ? 1 : 0,
      sick: active(w, "pandemic", 2) ? 1 : 0,
      dry: active(w, "drought", 6) ? 1 : 0,
      robots: w.mods.some((m) => m.id === "robots") ? 1 : 0,
      building: build && w.t - build.t0 < 6 ? 1 : 0,
      built: build && w.t - build.t0 >= 6 ? 1 : 0,
      oil: clamp((w.res - 60) / 30, 0, 1),
      trade: w.mods.some((m) => m.id === "trade") ? 1 : 0,
    };
    drawCountry(ctx, Wd, Hd, look, COUNTRIES[p.preset]?.climate ?? COUNTRIES[p.from ?? ""]?.climate ?? "mild", pp.figs, pp.tally, bp, isAlt ? 1 : 0, fmtCalendar(w.t));
  },
};

/* ───────────── words ───────────── */

/** The country's name in the page's language: its option in the Country select (`ctl.preset.opt.<id>`). */
export function countryName(p: { preset: string; from?: string }): string {
  const S = say();
  if (p.preset !== "custom") return COUNTRIES[p.preset] ? S(`ctl.preset.opt.${p.preset}`) : S("name.this");
  return p.from && COUNTRIES[p.from] ? S("name.ownFrom", { from: ref(`ctl.preset.opt.${p.from}`) }) : S("ctl.preset.opt.custom");
}

const calmKey = (c: number) => `calm.${c >= 70 ? 3 : c >= 45 ? 2 : c >= 30 ? 1 : 0}`;

type R = Record<string, number | null>;

/** Plain sentences for the biggest differences between the changed world and the no-change world. */
export function story(b: R, a: R, year: string): string[] {
  const S = say(), out: [number, string][] = [];
  const v = (r: R, k: string) => r[k] ?? 0;
  const dF = v(a, "fam") - v(b, "fam"), rel = dF / Math.max(1, v(b, "fam"));
  if (Math.abs(rel) >= 0.02) out.push([Math.abs(rel) * 10, S(dF > 0 ? "story.famMore" : "story.famLess", { usd: usd(Math.abs(dF)) })]);
  const dP = Math.round(v(a, "pov") - v(b, "pov"));
  if (dP) { const n = Math.abs(dP); out.push([n / 2, S(dP > 0 ? "story.povMore" : "story.povFewer", { n })]); }
  const dJ = Math.round(v(a, "jobless") - v(b, "jobless"));
  if (dJ) { const n = Math.abs(dJ); out.push([n / 2, S(dJ > 0 ? "story.jobMore" : "story.jobFewer", { n })]); }
  const dL = v(a, "life") - v(b, "life");
  if (Math.abs(dL) >= 0.3) out.push([Math.abs(dL), S(dL > 0 ? "story.longer" : "story.shorter", { n: fmtNum(Math.abs(dL), 1) })]);
  const ca = v(a, "calm"), cb = v(b, "calm");
  if (ca < 30 && cb >= 30) out.push([8, S("calm.0")]);
  else if (cb < 30 && ca >= 30) out.push([8, S("story.stopped")]);
  else if (Math.abs(ca - cb) >= 5) out.push([Math.abs(ca - cb) / 5, S(ca > cb ? "story.calmer" : "story.angrier")]);
  const dG = v(a, "gap") - v(b, "gap");
  if (Math.abs(dG) >= 0.3) out.push([Math.abs(dG), S(dG > 0 ? "story.gapBigger" : "story.gapSmaller")]);
  const dPop = v(a, "pop") - v(b, "pop"), rp = dPop / Math.max(0.1, v(b, "pop"));
  if (Math.abs(rp) >= 0.02) out.push([Math.abs(rp) * 20, S(dPop > 0 ? "story.popMore" : "story.popFewer", { n: fmtNum(Math.abs(dPop), Math.abs(dPop) < 20 ? 1 : 0) })]);
  const lines = out.sort((x, y) => y[0] - x[0]).slice(0, 5).map((x) => x[1]);
  return [S("story.head", { year }), ...(lines.length ? lines : [S("story.none")])];
}
