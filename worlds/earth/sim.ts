import type { BaseWorld, Sandbox } from "@/lib/sim/types";
import { clamp, fmtCalendar, fmtNum, note } from "@/lib/sim/core";
import { meta } from "./meta";
import { drawScene, type Look } from "./scene";
import { HOUSES, PEAK, SNOW0, SNOW_PER_C, TIDE, T_TODAY, houseBase } from "./town";

/**
 * Zero-dimensional climate model (change 0014).
 *
 * - CO₂ `C` (ppm): emissions × airborne fraction minus slow uptake (forests, ocean, soil), minus trees and
 *   machines that pull CO₂ out of the air, plus permafrost and forest loss.
 * - Methane `M` (ppb) relaxes to a source level with a 12-year lifetime.
 * - Forcing F = 5.35·ln(C/280) + 0.036·(√M − √722) − pollution haze (scales with emissions);
 *   temperature relaxes to sens·F/3.71 with a 35-year lag. Volcanoes and sun-dimming are short-lived
 *   temperature offsets on top.
 * - Sea level from thermal expansion + ice above 2 °C (+ Greenland and West Antarctica as tipping points).
 * - The town: snow line on the mountains and 24 houses that flood when the sea plus a storm tide reaches them.
 */
type P = {
  co2: number; meth: number; emis: number; path: string; forest: number; sens: number; uptake: number; tip: string; front: number;
  // "My future" settings (live; read by the `mix` what-if at the fork)
  mEm: number; mYrs: number; mTrees: number; mMeth: number; mDac: number; mDim: number; mWall: number;
};
/** The mix settings, copied into the world at the fork so later slider moves don't change a running what-if. */
interface Mix { em: number; yrs: number; trees: number; meth: number; dac: number; dim: number }
interface W extends BaseWorld {
  C: number; M: number; T: number; S: number; prev: number;
  mod: string | null; tf: number; maxT: number; tmax: number;
  /** Share of forest lost (Amazon what-if), 0–1. */
  fl: number;
  /** Sea wall height, m. */
  wall: number;
  mx: Mix | null;
}

const PRE_CO2 = 280, PRE_CH4 = 722;
/** Pollution haze from burning fuels, W/m² per Gt CO₂ a year. Cancels today's methane forcing at today's emissions. */
const HAZE = 0.0165;
/** Methane share tied to fossil fuels (the rest is farms, landfills, wetlands). */
const CH4_FOSSIL = 0.35;

const ln = Math.log;
const fCO2 = (C: number) => 5.35 * ln(C / PRE_CO2);
const fCH4 = (M: number) => 0.036 * (Math.sqrt(Math.max(M, 0)) - Math.sqrt(PRE_CH4));

/** Temporary temperature offset from aerosols (volcano, sun-dimming). */
function offset(w: W, t: number, p: P): number {
  if (!w.mod) return 0;
  const d = t - w.tf;
  if (d < 0) return 0;
  if (w.mod === "volcano") return -2.5 * Math.exp(-d / 2.5);
  if (w.mod === "geo") return d < 30 ? -Math.min(1, d / 2) : -Math.exp(-(d - 30) / 2);
  if (w.mod === "mix" && w.mx && w.mx.dim > 0) return -((w.mx.dim / 100) * 2 * p.sens / 3.71) * Math.min(1, d / 2);
  return 0;
}
const crops = (To: number, off: number) => clamp(100 - 5 * Math.max(0, To - 1.25) ** 1.6 + 25 * Math.min(0, off), 0, 130);
const snowLine = (To: number) => SNOW0 + SNOW_PER_C * (To - T_TODAY);
const snowPct = (To: number) => clamp(((PEAK - snowLine(To)) / (PEAK - SNOW0)) * 100, 0, 200);
function floodPct(S: number, front: number, wall: number): number {
  const water = S + TIDE;
  // A wall holds the sea back until it is overtopped
  if (wall > 0 && water < front + wall) return 0;
  let n = 0;
  for (let i = 0; i < HOUSES; i++) if (water > houseBase(i, front)) n++;
  return (n / HOUSES) * 100;
}

/** This year's CO₂ emissions (Gt) before any what-if. */
function baseEmissions(t: number, p: P): number {
  if (p.path === "grow") return p.emis * Math.min(3, 1.01 ** t);
  if (p.path === "flat") return p.emis;
  return p.emis * Math.max(0, 1 - t / 120);
}

const THRESH_T: [number, string][] = [
  [1.5, "coral reefs largely lost"], [2, "deadly heatwaves routine, ice-free Arctic summers"],
  [3, "crop belts shift, Amazon dieback risk"], [4, "some regions near the limit of human heat tolerance"],
];
const THRESH_S: [number, string][] = [
  [0.5, "regular flooding in low river deltas"], [1, "homes of ~200 million people at risk"], [2, "many coastal cities need walls or relocation"],
];
const APPLY_TEXT: Record<string, string> = {
  zero: "All emissions stop", ev: "Clean-energy switch: emissions fall 7% a year", double: "Emissions start climbing towards double",
  trees: "A trillion trees go into the ground", volcano: "Supervolcano erupts: an ash veil blocks the sun",
  geo: "Aerosols sprayed into the stratosphere", melt: "West Antarctic ice sheet starts to collapse",
  methane: "Methane leaks and sources start being fixed", dac: "Machines start pulling CO₂ out of the air",
  permafrost: "Permafrost starts thawing fast", amazon: "The Amazon starts turning to grassland",
  seawall: "A 3 m sea wall is built around the harbour",
};

function mixText(m: Mix, wall: number): string {
  const parts: string[] = [];
  if (m.em !== 0) parts.push(`emissions ${m.em > 0 ? "+" : "−"}${Math.abs(m.em)}% over ${m.yrs} yr`);
  if (m.trees > 0) parts.push(`${fmtNum(m.trees, 1)} trillion trees`);
  if (m.meth > 0) parts.push(`methane −${m.meth}%`);
  if (m.dac > 0) parts.push(`${fmtNum(m.dac, 0)} Gt CO₂ removed a year`);
  if (m.dim > 0) parts.push(`sunlight dimmed ${m.dim}%`);
  if (wall > 0) parts.push(`${fmtNum(wall, 1)} m sea wall`);
  return "My future: " + (parts.length ? parts.join(", ") : "no changes");
}

export const earth: Sandbox<W, P> = {
  ...meta,
  intro: "A fjord town today. Watch the snow, the forest, the fields and the harbour as decades pass.",
  controls: [
    { type: "heading", label: "Air today" },
    { type: "range", id: "co2", label: "CO₂ in the air", min: 280, max: 1000, step: 5, val: 420, unit: "ppm" },
    { type: "range", id: "meth", label: "Methane in the air", min: 700, max: 4000, step: 10, val: 1920, unit: "ppb" },
    { type: "heading", label: "Emissions" },
    { type: "range", id: "emis", label: "Yearly CO₂ emissions", min: 0, max: 80, step: 1, val: 37, unit: "Gt" },
    { type: "select", id: "path", label: "Where emissions are heading", options: [["grow", "Keep growing"], ["flat", "Level off"], ["fall", "Slowly fall (today’s pledges)"]], val: "fall" },
    { type: "heading", label: "Planet" },
    { type: "range", id: "forest", label: "Forest cover", min: 10, max: 45, step: 1, val: 31, unit: "% of land" },
    { type: "range", id: "sens", label: "Climate sensitivity", min: 2, max: 5, step: 0.1, val: 3, unit: "°C per 2× CO₂" },
    { type: "range", id: "uptake", label: "Ocean and soil uptake", min: 50, max: 150, step: 5, val: 100, unit: "% of today" },
    { type: "select", id: "tip", label: "Tipping points", options: [["on", "On: permafrost and ice sheets can tip"], ["off", "Off"]], val: "on" },
    { type: "heading", label: "Your town" },
    { type: "range", id: "front", label: "Seafront height", min: 0.5, max: 5, step: 0.1, val: 1.5, unit: "m above sea" },
    { type: "heading", label: "My future (used by “Build my own future”)" },
    { type: "range", id: "mEm", label: "Change emissions by", min: -100, max: 100, step: 5, val: -50, unit: "%", live: true },
    { type: "range", id: "mYrs", label: "Over", min: 1, max: 80, step: 1, val: 25, unit: "years", live: true },
    { type: "range", id: "mTrees", label: "Trees planted", min: 0, max: 1.5, step: 0.1, val: 0.5, unit: "trillion", live: true },
    { type: "range", id: "mMeth", label: "Methane cut", min: 0, max: 80, step: 5, val: 30, unit: "%", live: true },
    { type: "range", id: "mDac", label: "CO₂ removal", min: 0, max: 20, step: 1, val: 2, unit: "Gt a year", live: true },
    { type: "range", id: "mDim", label: "Sun-dimming aerosols", min: 0, max: 100, step: 5, val: 0, unit: "%", live: true },
    { type: "range", id: "mWall", label: "Sea wall", min: 0, max: 5, step: 0.5, val: 0, unit: "m", live: true },
  ],
  whatifs: [
    ["mix", "Build my own future"],
    ["zero", "Stop all emissions now"], ["ev", "Switch fast to clean energy"], ["double", "Emissions double"],
    ["trees", "Plant a trillion trees"], ["methane", "Cut methane in half"], ["dac", "Pull CO₂ out of the air"],
    ["seawall", "Build a 3 m sea wall"],
    ["volcano", "A supervolcano erupts"], ["geo", "Dim sunlight with aerosols for 30 years"],
    ["permafrost", "Permafrost thaws fast"], ["amazon", "The Amazon turns to grassland"],
    ["melt", "West Antarctic ice sheet collapses"],
  ],
  speeds: [[1, "1 yr/s"], [5, "5 yr/s"], [20, "20 yr/s"], [60, "60 yr/s"]],
  defaultSpeed: 1,
  fmtT: fmtCalendar,
  metrics: [
    { k: "temp", label: "Warming", unit: "°C", fmt: (v) => fmtNum(v, 1) },
    { k: "sea", label: "Sea level", unit: "m", fmt: (v) => fmtNum(v, 2) },
    { k: "co2", label: "CO₂", unit: "ppm", fmt: (v) => fmtNum(v) },
    { k: "crops", label: "Crops", unit: "index", fmt: (v) => fmtNum(v) },
    { k: "snow", label: "Snow", unit: "% of today", fmt: (v) => fmtNum(v) },
    { k: "flood", label: "Flooding", unit: "% of houses", fmt: (v) => fmtNum(v) },
  ],

  init(p, seed) {
    const F = fCO2(p.co2) + fCH4(p.meth) - HAZE * baseEmissions(0, p);
    const T = 0.72 * p.sens * F / 3.71;
    return { t: 0, rs: seed, log: [], f: {}, C: p.co2, M: p.meth, T, S: 0, prev: T, mod: null, tf: 0, maxT: 0, tmax: 0, fl: 0, wall: 0, mx: null };
  },

  step(w, dt, p) {
    const n = Math.ceil(dt / 0.25), h = dt / n, tip = p.tip !== "off";
    for (let k = 0; k < n; k++) {
      const t = w.t, d = t - w.tf, mod = w.mod;
      // Emissions this year
      const E0 = baseEmissions(t, p);
      let E = E0;
      if (mod === "zero") E = 0;
      if (mod === "double") E *= 1 + Math.min(1, d / 30);
      if (mod === "ev") E *= Math.exp(-0.07 * d);
      if (mod === "mix" && w.mx) E *= Math.max(0, 1 + (w.mx.em / 100) * Math.min(1, d / Math.max(1, w.mx.yrs)));
      // Temperature now (with short-lived aerosols) drives feedbacks
      const To0 = w.T + offset(w, t, p);
      // Extra CO₂ sources and sinks (ppm a year; 7.8 Gt CO₂ ≈ 1 ppm)
      let extra = 0, ch4Extra = 0;
      if (tip && To0 > 1.5) { extra += Math.min(4, 1.0 * (To0 - 1.5)) / 7.8; ch4Extra += Math.min(400, 120 * (To0 - 1.5)); }
      if (mod === "permafrost" && d < 80) { extra += 5 / 7.8; ch4Extra += 600; }
      if (mod === "amazon" && d < 20) { w.fl = Math.min(0.2, w.fl + 0.01 * h); extra += 12.5 / 7.8; }
      let sink = 0;
      if (mod === "trees" && d < 50) sink += 0.51;
      if (mod === "mix" && w.mx && d < 50) sink += 0.51 * w.mx.trees;
      if (mod === "dac") sink += (10 / 7.8) * Math.min(1, d / 10);
      if (mod === "mix" && w.mx) sink += (w.mx.dac / 7.8) * Math.min(1, d / 10);
      if (w.C <= PRE_CO2) sink = Math.min(sink, 0.51); // machines stop at pre-industrial air
      const uptake = (w.C - PRE_CO2) * 0.004 * ((p.forest * (1 - w.fl)) / 31) * (p.uptake / 100);
      w.C = Math.max(270, w.C + ((E / 7.8) * 0.45 + extra - uptake - sink) * h);
      // Methane relaxes to its source level
      let cut = 0;
      if (mod === "methane") cut = 0.5 * Math.min(1, d / 15);
      if (mod === "mix" && w.mx) cut = (w.mx.meth / 100) * Math.min(1, d / 15);
      const fossil = p.emis > 0 ? E / p.emis : 0;
      const Meq = PRE_CH4 + (p.meth - PRE_CH4) * (1 - CH4_FOSSIL + CH4_FOSSIL * fossil) * (1 - cut) + ch4Extra;
      w.M += ((Meq - w.M) / 12) * h;
      // Temperature
      const F = fCO2(w.C) + fCH4(w.M) - HAZE * E;
      w.T += ((p.sens * F / 3.71 - w.T) / 35) * h;
      w.t += h;
      if (w.T > w.maxT) { w.maxT = w.T; w.tmax = w.t; }
      else if (w.T < w.maxT - 0.03) note(w, `Warming peaks at ${fmtNum(w.maxT, 1)} °C`, "peak", w.tmax);
      const To = w.T + offset(w, w.t, p);
      // Sea level
      let dS = 0.0034 * To + (To > 2 ? 0.004 * (To - 2) : 0);
      if (tip && To > 2) dS += 0.002 * (To - 2);
      if (tip && To > 3) dS += Math.min(0.01, 0.005 * (To - 3));
      if (mod === "melt" && w.t - w.tf < 100) dS += 0.03;
      w.S += dS * h;
      // Events (stable text so the timeline can match them across worlds)
      for (const [th, txt] of THRESH_T) if (w.prev < th && To >= th) note(w, `Passes ${th} °C: ${txt}`, "t" + th);
      if (w.f["t1.5"] && w.prev >= 1.5 && To < 1.5) note(w, "Warming falls back under 1.5 °C", "back");
      for (const [th, txt] of THRESH_S) if (w.S >= th) note(w, `Sea level +${th} m: ${txt}`, "s" + th);
      if (mod === "geo" && d >= 30) note(w, "Aerosol spraying stops: termination shock, rapid warming", "geoend");
      if (tip && To > 1.5) note(w, "Permafrost starts to thaw, releasing CO₂ and methane", "pf");
      if (tip && To > 2) note(w, "Greenland’s ice starts melting faster", "gr");
      if (tip && To > 3) note(w, "West Antarctica’s ice starts sliding into the sea", "wa");
      if (snowLine(To) > 2000) note(w, "Snow line passes 2,000 m: the glacier is nearly gone", "snow");
      const fl = floodPct(w.S, p.front, w.wall);
      if (fl > 0) note(w, "Storm tides reach the first houses in town", "fl1");
      if (fl >= 50) note(w, "Half the town floods at high tide", "fl50");
      if (w.wall > 0 && w.S + TIDE >= p.front + w.wall) note(w, "The sea wall is overtopped", "wallover");
      w.prev = To;
    }
  },

  apply(w, id, p) {
    w.mod = id;
    w.tf = w.t;
    if (id === "seawall") w.wall = 3;
    if (id === "mix") {
      w.mx = { em: p.mEm, yrs: p.mYrs, trees: p.mTrees, meth: p.mMeth, dac: p.mDac, dim: p.mDim };
      w.wall = p.mWall;
      note(w, mixText(w.mx, w.wall));
      return;
    }
    note(w, APPLY_TEXT[id] ?? id);
  },

  read(w, p) {
    const off = offset(w, w.t, p), To = w.T + off;
    return {
      temp: To, sea: w.S, co2: w.C, crops: crops(To, off),
      snow: snowPct(To), flood: floodPct(w.S, p.front, w.wall),
    };
  },

  draw({ ctx, w: Wd, h: Hd, p, isAlt }, w) {
    const off = offset(w, w.t, p), To = w.T + off;
    const d = w.t - w.tf;
    const look: Look = {
      temp: To,
      sea: w.S,
      co2: w.C,
      snowLine: snowLine(To),
      forest: clamp((p.forest * (1 - w.fl)) / 45, 0, 1),
      crops: crops(To, off),
      dim: clamp(-off / 2.5, 0, 1),
      ash: w.mod === "volcano" ? clamp(Math.exp(-d / 3), 0, 1) : 0,
      front: p.front,
      wall: w.wall,
      flood: floodPct(w.S, p.front, w.wall),
    };
    drawScene(ctx, Wd, Hd, look, isAlt ? 1 : 0);
  },
};
