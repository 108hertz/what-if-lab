import type { BaseWorld, Sandbox } from "@/lib/sim/types";
import { TAU, clamp, fmtCalendar, fmtNum, mix, note } from "@/lib/sim/core";
import { FONT, STAGE } from "@/lib/sim/draw";
import { meta } from "./meta";

/**
 * Zero-dimensional climate model:
 * CO₂ (ppm) from emissions × airborne fraction minus slow uptake; temperature relaxes to
 * sensitivity × log2(C/280) with a 35-year lag; sea level from thermal expansion + ice above 2 °C.
 */
type P = { co2: number; emis: number; forest: number; sens: number };
interface W extends BaseWorld {
  C: number; T: number; S: number; prev: number;
  mod: string | null; tf: number; maxT: number; tmax: number;
}

/** Temporary temperature offset from aerosols (volcano, geoengineering). */
function offset(w: W, t: number): number {
  if (!w.mod) return 0;
  const d = t - w.tf;
  if (d < 0) return 0;
  if (w.mod === "volcano") return -2.5 * Math.exp(-d / 2.5);
  if (w.mod === "geo") return d < 30 ? -Math.min(1, d / 2) : -Math.exp(-(d - 30) / 2);
  return 0;
}
const crops = (To: number, off: number) => clamp(100 - 5 * Math.max(0, To - 1.25) ** 1.6 + 25 * Math.min(0, off), 0, 130);

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
};

export const earth: Sandbox<W, P> = {
  ...meta,
  intro: "Today’s planet by default. Watch the ice, the sea and the city as decades pass.",
  controls: [
    { type: "range", id: "co2", label: "CO₂ in the air", min: 280, max: 1000, step: 5, val: 420, unit: "ppm" },
    { type: "range", id: "emis", label: "Yearly emissions", min: 0, max: 80, step: 1, val: 37, unit: "Gt CO₂" },
    { type: "range", id: "forest", label: "Forest cover", min: 10, max: 45, step: 1, val: 31, unit: "% of land" },
    { type: "range", id: "sens", label: "Climate sensitivity", min: 2, max: 5, step: 0.1, val: 3, unit: "°C per 2× CO₂" },
  ],
  whatifs: [
    ["zero", "Stop all emissions now"], ["ev", "Switch fast to clean energy"], ["double", "Emissions double"],
    ["trees", "Plant a trillion trees"], ["volcano", "A supervolcano erupts"], ["geo", "Dim sunlight with aerosols for 30 years"],
    ["melt", "West Antarctic ice sheet collapses"],
  ],
  speeds: [[1, "1 yr/s"], [5, "5 yr/s"], [20, "20 yr/s"], [60, "60 yr/s"]],
  defaultSpeed: 1,
  fmtT: fmtCalendar,
  metrics: [
    { k: "temp", label: "Warming", unit: "°C", fmt: (v) => fmtNum(v, 1) },
    { k: "sea", label: "Sea level rise", unit: "m", fmt: (v) => fmtNum(v, 2) },
    { k: "co2", label: "CO₂", unit: "ppm", fmt: (v) => fmtNum(v) },
    { k: "crops", label: "Crop yields", unit: "index", fmt: (v) => fmtNum(v) },
  ],

  init(p, seed) {
    const T = 0.72 * p.sens * Math.log2(p.co2 / 280);
    return { t: 0, rs: seed, log: [], f: {}, C: p.co2, T, S: 0, prev: T, mod: null, tf: 0, maxT: 0, tmax: 0 };
  },

  step(w, dt, p) {
    const n = Math.ceil(dt / 0.25), h = dt / n;
    for (let k = 0; k < n; k++) {
      const t = w.t, d = t - w.tf;
      let E = p.emis * Math.max(0, 1 - t / 120);
      if (w.mod === "zero") E = 0;
      if (w.mod === "double") E *= 1 + Math.min(1, d / 30);
      if (w.mod === "ev") E *= Math.exp(-0.07 * d);
      const uptake = (w.C - 280) * 0.004 * (p.forest / 31), trees = w.mod === "trees" && d < 50 ? 0.51 : 0;
      w.C = Math.max(270, w.C + ((E / 7.8) * 0.45 - uptake - trees) * h);
      w.T += ((p.sens * Math.log2(w.C / 280) - w.T) / 35) * h;
      w.t += h;
      if (w.T > w.maxT) { w.maxT = w.T; w.tmax = w.t; }
      else if (w.T < w.maxT - 0.03) note(w, `Warming peaks at ${fmtNum(w.maxT, 1)} °C`, "peak", w.tmax);
      const To = w.T + offset(w, w.t);
      w.S += (0.0034 * To + (To > 2 ? 0.004 * (To - 2) : 0) + (w.mod === "melt" && w.t - w.tf < 100 ? 0.03 : 0)) * h;
      for (const [th, txt] of THRESH_T) if (w.prev < th && To >= th) note(w, `Passes ${th} °C: ${txt}`, "t" + th);
      if (w.f["t1.5"] && w.prev >= 1.5 && To < 1.5) note(w, "Warming falls back under 1.5 °C", "back");
      for (const [th, txt] of THRESH_S) if (w.S >= th) note(w, `Sea level +${th} m: ${txt}`, "s" + th);
      if (w.mod === "geo" && d >= 30) note(w, "Aerosol spraying stops: termination shock, rapid warming", "geoend");
      w.prev = To;
    }
  },

  apply(w, id) {
    w.mod = id;
    w.tf = w.t;
    note(w, APPLY_TEXT[id] ?? id);
  },

  read(w) {
    const off = offset(w, w.t), To = w.T + off;
    return { temp: To, sea: w.S, co2: w.C, crops: crops(To, off) };
  },

  draw({ ctx, w: W, h: H, p }, w) {
    const off = offset(w, w.t), To = w.T + off, heat = clamp((To - 0.8) / 4, 0, 1);
    const sky = ctx.createLinearGradient(0, 0, 0, H * 0.7);
    sky.addColorStop(0, mix("#16305E", "#5A2430", heat));
    sky.addColorStop(1, mix("#5B86B8", "#D08A5A", heat));
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#FFE9A8"; ctx.globalAlpha = clamp(1 + off * 0.25, 0.2, 1);
    ctx.beginPath(); ctx.arc(W * 0.82, H * 0.18, H * 0.06, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
    // CO₂ particles
    const nC = Math.min(260, Math.round((w.C - 280) / 2.5));
    ctx.fillStyle = "rgba(225,228,240,.35)";
    for (let i = 0; i < nC; i++) {
      const r1 = ((Math.sin(i * 91.7) * 1e4) % 1 + 1) % 1, r2 = ((Math.sin(i * 17.3) * 1e4) % 1 + 1) % 1;
      ctx.fillRect((r1 * W + w.t * 8 * (0.4 + r2)) % W, H * 0.05 + r2 * H * 0.42, 1.8, 1.8);
    }
    const seaY = H * 0.66 - w.S * H * 0.04, peakY = H * 0.2, ice = clamp(1 - (To - 1.1) / 3.5, 0, 1);
    // mountain + ice cap
    ctx.fillStyle = "#34405A";
    ctx.beginPath(); ctx.moveTo(-10, H * 0.72); ctx.lineTo(W * 0.17, peakY); ctx.lineTo(W * 0.4, H * 0.72); ctx.fill();
    if (ice > 0) {
      const iy = peakY + (H * 0.72 - peakY) * 0.5 * ice, f = (iy - peakY) / (H * 0.72 - peakY);
      ctx.fillStyle = "#EEF4FB";
      ctx.beginPath(); ctx.moveTo(W * 0.17, peakY); ctx.lineTo(W * 0.17 - (W * 0.17 + 10) * f, iy); ctx.lineTo(W * 0.17 + W * 0.23 * f, iy); ctx.fill();
    }
    // land, fields, trees
    ctx.fillStyle = mix("#2F5D3A", "#7A6A33", heat);
    ctx.beginPath(); ctx.moveTo(0, H); ctx.lineTo(0, H * 0.68); ctx.quadraticCurveTo(W * 0.35, H * 0.56, W * 0.6, H * 0.6); ctx.lineTo(W * 0.82, H * 0.74); ctx.lineTo(W * 0.82, H); ctx.fill();
    ctx.fillStyle = mix("#7FB069", "#B8A04A", 1 - crops(To, off) / 100);
    ctx.fillRect(W * 0.05, H * 0.8, W * 0.3, H * 0.05);
    const trees = Math.round((p.forest / 45) * 14 * (1 - heat * 0.5));
    ctx.fillStyle = "#1E4A2C";
    for (let i = 0; i < trees; i++) {
      const x = W * (0.3 + i * 0.022), y = H * (0.62 - 0.015 * Math.sin(i));
      ctx.beginPath(); ctx.moveTo(x, y - H * 0.05); ctx.lineTo(x - H * 0.018, y); ctx.lineTo(x + H * 0.018, y); ctx.fill();
    }
    // coastal city
    [0.09, 0.16, 0.12, 0.2, 0.1, 0.14, 0.08].forEach((hh, i) => {
      const x = W * (0.6 + i * 0.03), yb = H * (0.6 + ((x / W - 0.6) / 0.22) * 0.14);
      ctx.fillStyle = i % 2 ? "#C9CEDF" : "#A8AFC8"; ctx.fillRect(x, yb - H * hh, W * 0.024, H * hh);
      ctx.fillStyle = "rgba(255,220,140,.6)";
      for (let k = 1; k < hh * 30; k += 2) ctx.fillRect(x + W * 0.006, yb - H * hh + k * H * 0.033, W * 0.006, H * 0.01);
    });
    // sea
    ctx.fillStyle = "rgba(31,95,139,.92)"; ctx.fillRect(W * 0.58, seaY, W * 0.42, H - seaY);
    ctx.strokeStyle = "rgba(180,220,255,.6)"; ctx.beginPath();
    for (let x = W * 0.58; x <= W; x += 6) { const y = seaY + Math.sin(x * 0.08 + w.t * 3) * 1.5; x === W * 0.58 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke();
    if (off < 0) { ctx.fillStyle = `rgba(140,140,150,${Math.min(0.5, -off * 0.18)})`; ctx.fillRect(0, 0, W, H); }
    ctx.fillStyle = "rgba(16,9,4,.6)"; ctx.fillRect(10, H - 34, Math.min(W - 20, 300), 24);
    ctx.fillStyle = STAGE.ink; ctx.font = "12px " + FONT.mono;
    ctx.fillText(`+${To.toFixed(1)} °C  sea +${w.S.toFixed(2)} m  ${Math.round(w.C)} ppm`, 18, H - 18);
  },
};
