import type { BaseWorld, Sandbox } from "../types";
import { clamp, fmtDur, fmtNum, gauss, mix, note, rng } from "../core";
import { FONT, blob, STAGE } from "../draw";
import { HABITS } from "../data/personality";

/**
 * 100 parallel versions of one person. Each version drifts with age and random life events.
 * A habit fork sets everyone "doing it"; each day there is a chance of quitting (high early,
 * falling after ~66 days for good habits; sticky for bad ones). Effects build while kept.
 */
type P = { age: number; disc: number; soc: number; stress: number; health: number; mood: number };
interface Version { b0: number[]; o: number[]; e: number[]; kept: number }
interface W extends BaseWorld { v: Version[]; habit: string | null; tf: number }

const KEYS = ["well", "health", "social", "career"] as const;
const NAMES = ["Wellbeing", "Health", "Relationships", "Career & skills"];

/** Drift of each metric with time t (years) for this person, before events and habits. */
function drift(p: P, j: number, t: number): number {
  if (j === 0) return -4 * (p.stress / 100) * (1 - Math.exp(-t / 3));
  if (j === 1) return -((p.age > 30 ? 0.45 : 0.15) + (0.3 * p.stress) / 100) * t;
  if (j === 2) return -0.2 * Math.max(0, p.age + t - Math.max(35, p.age));
  return 1.5 * (p.disc / 100) * t * (p.age + t < 60 ? 1 : 0.2);
}
export const versionValue = (w: W, v: Version, j: number, p: P) => clamp(v.b0[j] + drift(p, j, w.t) + v.o[j] + v.e[j], 0, 100);

export const person: Sandbox<W, P> = {
  key: "person",
  name: "Character",
  sub: "100 parallel lives",
  intro: "One person, 100 parallel versions of their life. Fork a new habit and see how many stick with it and what it changes.",
  controls: [
    { type: "range", id: "age", label: "Age", min: 16, max: 75, step: 1, val: 30, unit: "yrs" },
    { type: "range", id: "disc", label: "Self-discipline", min: 0, max: 100, step: 1, val: 50 },
    { type: "range", id: "soc", label: "Sociability", min: 0, max: 100, step: 1, val: 50 },
    { type: "range", id: "stress", label: "Stress level", min: 0, max: 100, step: 1, val: 55 },
    { type: "range", id: "health", label: "Current health", min: 0, max: 100, step: 1, val: 65 },
    { type: "range", id: "mood", label: "Current wellbeing", min: 0, max: 100, step: 1, val: 60 },
  ],
  whatifs: [
    ["exercise", "Exercise 30 min every day"], ["social", "Quit social media"], ["sleep", "Sleep 8 hours, fixed schedule"],
    ["read", "Read 30 min a day"], ["meditate", "Meditate 10 min a day"], ["learn", "Learn a skill 1 hour a day"],
    ["drink", "Start drinking heavily"], ["isolate", "Pull away from friends"], ["smoke", "Start smoking"],
  ],
  speeds: [[1 / 52, "1 wk/s"], [1 / 12, "1 mo/s"], [0.5, "6 mo/s"], [2, "2 yr/s"]],
  defaultSpeed: 1,
  fmtT: fmtDur,
  metrics: [
    { k: "well", label: "Wellbeing", unit: "/100", fmt: (v) => fmtNum(v) },
    { k: "health", label: "Health", unit: "/100", fmt: (v) => fmtNum(v) },
    { k: "social", label: "Relationships", unit: "/100", fmt: (v) => fmtNum(v) },
    { k: "career", label: "Career & skills", unit: "/100", fmt: (v) => fmtNum(v) },
    { k: "kept", label: "Still doing it", unit: "%", fmt: (v) => fmtNum(v) },
  ],

  init(p, seed) {
    const w: W = { t: 0, rs: seed, log: [], f: {}, v: [], habit: null, tf: 0 };
    for (let i = 0; i < 100; i++)
      w.v.push({ b0: [p.mood, p.health, 25 + 0.55 * p.soc, 35 + 0.3 * p.disc].map((x) => clamp(x + gauss(w) * 5, 0, 100)), o: [0, 0, 0, 0], e: [0, 0, 0, 0], kept: 0 });
    return w;
  },

  step(w, dt, p) {
    const n = Math.ceil(dt * 365), h = dt / n, E = w.habit ? HABITS[w.habit] : null;
    for (let s = 0; s < n; s++) {
      const days = (w.t - w.tf) * 365;
      for (const v of w.v) {
        if (rng(w) < 0.8 * h) { const j = (rng(w) * 4) | 0; v.o[j] += gauss(w) * 7; }
        for (let j = 0; j < 4; j++) v.o[j] *= Math.exp(-h / 1.5);
        if (E) {
          if (E[5]) {
            if (v.kept) { const q = (0.035 * (1 - p.disc / 100) + (0.015 * p.stress) / 100) * Math.exp(-days / 30) + 0.0003; if (rng(w) < q * h * 365) v.kept = 0; }
            else if (rng(w) < 0.0006 * h * 365) v.kept = 1;
          } else if (v.kept && rng(w) < 0.0005 * (0.2 + p.disc / 100) * h * 365) v.kept = 0;
          for (let j = 0; j < 4; j++) v.e[j] += ((E[j] * v.kept - v.e[j]) / E[4]) * h;
        } else for (let j = 0; j < 4; j++) v.e[j] -= (v.e[j] / 2) * h;
      }
      w.t += h;
      if (E) {
        if (E[5]) {
          if (days >= 21) note(w, "Week 3: the motivation dip, most quitting happens now", "w3");
          if (days >= 66) note(w, "Day 66: for those still going, the habit is now automatic", "d66");
          if (w.v.filter((v) => v.kept).length < 50) note(w, "Half the versions have given up", "half");
        } else if (days >= 180) note(w, "Six months in: craving and tolerance make stopping hard", "b6");
      }
    }
    const r = person.read(w, p);
    KEYS.forEach((k, j) => {
      if ((r[k] ?? 50) < 35) note(w, `${NAMES[j]} drops into the danger zone`, "lo" + k);
      if ((r[k] ?? 50) >= 75) note(w, `${NAMES[j]} reaches a strong level`, "hi" + k);
    });
  },

  apply(w, id) {
    w.habit = id;
    w.tf = w.t;
    w.v.forEach((v) => (v.kept = 1));
    note(w, "Starts: " + (person.whatifs.find((x) => x[0] === id)?.[1] ?? id).toLowerCase());
  },

  read(w, p) {
    const r: Record<string, number> = {};
    KEYS.forEach((k, j) => { r[k] = w.v.reduce((s, v) => s + versionValue(w, v, j, p), 0) / w.v.length; });
    r.kept = w.habit ? w.v.filter((v) => v.kept).length : 0;
    return r;
  },

  draw({ ctx, w: W, h: H, p }, w) {
    ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, W, H);
    const cell = Math.min((W - 24) / 10, (H - 56) / 10), ox = (W - cell * 10) / 2, oy = 14;
    const good = w.habit ? HABITS[w.habit][5] : 1;
    w.v.forEach((v, i) => {
      const x = ox + ((i % 10) + 0.5) * cell, y = oy + (((i / 10) | 0) + 0.5) * cell;
      const col = !w.habit ? "#A9B1D6" : v.kept ? (good ? STAGE.alt : "#FF8A7A") : STAGE.muted;
      blob(ctx, x, y, cell * 0.36, mix("#2A3150", col, 0.35 + versionValue(w, v, 1, p) / 150), 0, 0, versionValue(w, v, 0, p));
    });
    ctx.font = "12.5px " + FONT.body; ctx.fillStyle = STAGE.ink2;
    const kept = w.v.filter((v) => v.kept).length;
    ctx.fillText(w.habit ? `${kept} of 100 still doing it · smile = wellbeing · brightness = health` : "No new habit yet · smile = wellbeing · brightness = health", ox, H - 14);
  },
};
