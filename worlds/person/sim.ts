import type { BaseWorld, Sandbox, WhatIf } from "@/lib/sim/types";
import { clamp, fmtDur, fmtNum, gauss, mix, note, ref, rng } from "@/lib/sim/core";
import { FONT, blob, STAGE } from "@/lib/sim/draw";
import { worldSay } from "@/lib/sim/say";
import { meta } from "./meta";
import { HABITS } from "./data";

/**
 * 100 parallel versions of one person. Each version drifts with age and random life events.
 * A new habit sets everyone "doing it"; each day there is a chance of quitting (high early,
 * falling after ~66 days for good habits; sticky for bad ones). Effects build while kept.
 * Habits stack (change 0024): every pick adds one to `w.hs`, each version keeps or drops each habit on its own,
 * and their effects add up. Picking a habit that is already going starts it again for everyone.
 */
type P = { age: number; disc: number; soc: number; stress: number; health: number; mood: number };
/** `kept[i]` / `e[i]`: whether this version still does habit i of `w.hs`, and that habit's built-up effect on the four metrics. */
interface Version { b0: number[]; o: number[]; e: number[][]; kept: number[] }
interface Habit { id: string; tf: number }
interface W extends BaseWorld { v: Version[]; hs: Habit[] }

const KEYS = ["well", "health", "social", "career"] as const;
const NAMES = ["Wellbeing", "Health", "Relationships", "Career & skills"];

/** Drift of each metric with time t (years) for this person, before events and habits. */
function drift(p: P, j: number, t: number): number {
  if (j === 0) return -4 * (p.stress / 100) * (1 - Math.exp(-t / 3));
  if (j === 1) return -((p.age > 30 ? 0.45 : 0.15) + (0.3 * p.stress) / 100) * t;
  if (j === 2) return -0.2 * Math.max(0, p.age + t - Math.max(35, p.age));
  return 1.5 * (p.disc / 100) * t * (p.age + t < 60 ? 1 : 0.2);
}
const effect = (v: Version, j: number) => v.e.reduce((s, e) => s + e[j], 0);
export const versionValue = (w: W, v: Version, j: number, p: P) => clamp(v.b0[j] + drift(p, j, w.t) + v.o[j] + effect(v, j), 0, 100);
const WHATIFS: WhatIf[] = [
  ["exercise", "Exercise 30 min every day"], ["social", "Quit social media"], ["sleep", "Sleep 8 hours, fixed schedule"],
  ["read", "Read 30 min a day"], ["meditate", "Meditate 10 min a day"], ["learn", "Learn a skill 1 hour a day"],
  ["drink", "Start drinking heavily"], ["isolate", "Pull away from friends"], ["smoke", "Start smoking"],
];
const labelOf = (id: string) => WHATIFS.find((x) => x[0] === id)?.[1] ?? id;
/** "Exercise" from "Exercise 30 min every day": the short name used in timeline lines when several habits run. */
const shortOf = (id: string) => labelOf(id).split(/ \d| every| a day|,/)[0];

/** English words of this world (change 0025): event lines and the names they use. */
const MESSAGES: Record<string, string> = {
  ...Object.fromEntries(WHATIFS.flatMap(([id]) => [[`habit.${id}`, labelOf(id).toLowerCase()], [`short.${id}`, shortOf(id)]])),
  ...Object.fromEntries(KEYS.map((k, j) => [`dim.${k}`, NAMES[j]])),
  "ev.withHabit": "{habit}: {line}",
  "ev.w3": "Week 3: the motivation dip, most quitting happens now",
  "ev.d66": "Day 66: for those still going, the habit is now automatic",
  "ev.half": "Half the versions have given up",
  "ev.b6": "Six months in: craving and tolerance make stopping hard",
  "ev.low": "{dim} drops into the danger zone",
  "ev.high": "{dim} reaches a strong level",
  "ev.again": "Starts again: {habit}",
  "ev.start": "Starts: {habit}",
  // The stage caption under the 100 faces
  "stage.one": "{n} of 100 still doing it",
  "stage.many": "{h, plural, one {# habit} other {# habits}} · {n} of 100 still doing at least one",
  "stage.none": "No new habit yet",
  "stage.caption": "{what} · smile = wellbeing · brightness = health",
};

export const person: Sandbox<W, P> = {
  ...meta,
  intro: "One person, 100 parallel versions of their life. Try new habits and see how many stick with it and what it changes.",
  messages: MESSAGES,
  controls: [
    { type: "range", id: "age", label: "Age", min: 16, max: 75, step: 1, val: 30, unit: "yrs" },
    { type: "range", id: "disc", label: "Self-discipline", min: 0, max: 100, step: 1, val: 50 },
    { type: "range", id: "soc", label: "Sociability", min: 0, max: 100, step: 1, val: 50 },
    { type: "range", id: "stress", label: "Stress level", min: 0, max: 100, step: 1, val: 55 },
    { type: "range", id: "health", label: "Current health", min: 0, max: 100, step: 1, val: 65 },
    { type: "range", id: "mood", label: "Current wellbeing", min: 0, max: 100, step: 1, val: 60 },
  ],
  whatifs: WHATIFS,
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
    const w: W = { t: 0, rs: seed, log: [], f: {}, v: [], hs: [] };
    for (let i = 0; i < 100; i++)
      w.v.push({ b0: [p.mood, p.health, 25 + 0.55 * p.soc, 35 + 0.3 * p.disc].map((x) => clamp(x + gauss(w) * 5, 0, 100)), o: [0, 0, 0, 0], e: [], kept: [] });
    return w;
  },

  step(w, dt, p) {
    const n = Math.ceil(dt * 365), h = dt / n, many = w.hs.length > 1;
    for (let s = 0; s < n; s++) {
      for (const v of w.v) {
        if (rng(w) < 0.8 * h) { const j = (rng(w) * 4) | 0; v.o[j] += gauss(w) * 7; }
        for (let j = 0; j < 4; j++) v.o[j] *= Math.exp(-h / 1.5);
        w.hs.forEach((hb, i) => {
          const E = HABITS[hb.id], days = (w.t - hb.tf) * 365, e = v.e[i];
          if (E[5]) {
            if (v.kept[i]) { const q = (0.035 * (1 - p.disc / 100) + (0.015 * p.stress) / 100) * Math.exp(-days / 30) + 0.0003; if (rng(w) < q * h * 365) v.kept[i] = 0; }
            else if (rng(w) < 0.0006 * h * 365) v.kept[i] = 1;
          } else if (v.kept[i] && rng(w) < 0.0005 * (0.2 + p.disc / 100) * h * 365) v.kept[i] = 0;
          for (let j = 0; j < 4; j++) e[j] += ((E[j] * v.kept[i] - e[j]) / E[4]) * h;
        });
      }
      w.t += h;
      w.hs.forEach((hb, i) => {
        const E = HABITS[hb.id], days = (w.t - hb.tf) * 365, k = hb.id;
        // With several habits running, each line says which one it is about
        const line = (ev: string, once: string) => note(w, many ? "ev.withHabit" : ev, many ? { habit: ref(`short.${k}`), line: ref(ev) } : undefined, once);
        if (E[5]) {
          if (days >= 21) line("ev.w3", "w3" + k);
          if (days >= 66) line("ev.d66", "d66" + k);
          if (w.v.filter((v) => v.kept[i]).length < 50) line("ev.half", "half" + k);
        } else if (days >= 180) line("ev.b6", "b6" + k);
      });
    }
    const r = person.read(w, p);
    KEYS.forEach((k, j) => {
      if ((r[k] ?? 50) < 35) note(w, "ev.low", { dim: ref(`dim.${KEYS[j]}`) }, "lo" + k);
      if ((r[k] ?? 50) >= 75) note(w, "ev.high", { dim: ref(`dim.${KEYS[j]}`) }, "hi" + k);
    });
  },

  apply(w, id) {
    if (!HABITS[id]) return;
    const i = w.hs.findIndex((hb) => hb.id === id);
    if (i >= 0) {
      // Already going: everyone starts it again today
      w.hs[i].tf = w.t;
      w.v.forEach((v) => (v.kept[i] = 1));
      note(w, "ev.again", { habit: ref(`habit.${id}`) });
      return;
    }
    w.hs.push({ id, tf: w.t });
    w.v.forEach((v) => { v.kept.push(1); v.e.push([0, 0, 0, 0]); });
    note(w, "ev.start", { habit: ref(`habit.${id}`) });
  },

  read(w, p) {
    const r: Record<string, number> = {};
    KEYS.forEach((k, j) => { r[k] = w.v.reduce((s, v) => s + versionValue(w, v, j, p), 0) / w.v.length; });
    // Still doing it: share of versions still doing each habit, averaged over the habits
    r.kept = w.hs.length ? w.hs.reduce((s, _, i) => s + w.v.filter((v) => v.kept[i]).length, 0) / w.hs.length : 0;
    return r;
  },

  draw({ ctx, w: W, h: H, p }, w) {
    ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, W, H);
    const cell = Math.min((W - 24) / 10, (H - 56) / 10), ox = (W - cell * 10) / 2, oy = 14;
    w.v.forEach((v, i) => {
      const x = ox + ((i % 10) + 0.5) * cell, y = oy + (((i / 10) | 0) + 0.5) * cell;
      // Amber: still doing only good habits; coral: still doing a bad one; grey: dropped them all
      const bad = w.hs.some((hb, k) => v.kept[k] && !HABITS[hb.id][5]), any = v.kept.some((k) => k);
      const col = !w.hs.length ? STAGE.base : bad ? "#FF8A7A" : any ? STAGE.alt : STAGE.muted;
      blob(ctx, x, y, cell * 0.36, mix("#2A3150", col, 0.35 + versionValue(w, v, 1, p) / 150), 0, 0, versionValue(w, v, 0, p));
    });
    ctx.font = "12.5px " + FONT.body; ctx.fillStyle = STAGE.ink2;
    const say = worldSay(person), kept = w.v.filter((v) => v.kept.some((k) => k)).length;
    const what = !w.hs.length ? say("stage.none") : w.hs.length === 1 ? say("stage.one", { n: kept }) : say("stage.many", { h: w.hs.length, n: kept });
    ctx.fillText(say("stage.caption", { what }), ox, H - 14, W - ox - 8);
  },
};
