import { bump, sig } from "../core";

export const TRAITS = ["O", "C", "E", "A", "N"] as const;
export type Trait = (typeof TRAITS)[number];
export type TraitDelta = Partial<Record<Trait, number>>;

export const TRAIT_NAME: Record<Trait, string> = {
  O: "Openness",
  C: "Conscientiousness",
  E: "Extraversion",
  A: "Agreeableness",
  N: "Neuroticism",
};

/** Shift in trait points caused by parenting style (rough, literature-inspired). */
export const STYLE: Record<string, TraitDelta> = {
  authoritative: { C: 6, A: 4, N: -5, O: 2 },
  authoritarian: { C: 3, N: 6, A: -2, O: -3 },
  permissive: { C: -5, E: 3, N: 1 },
  neglectful: { C: -6, N: 8, A: -5, E: -2 },
};
export const SIBLINGS: Record<string, TraitDelta> = { "0": { E: -1, A: -1 }, "1": { A: 1 }, "2": { A: 2, E: 2 } };
export const HOME: Record<string, TraitDelta> = { stable: {}, unstable: { N: 6, C: -3 } };

/** Maturity principle: average change of each trait with age. */
export const MATURATION: Record<Trait, (age: number) => number> = {
  O: (a) => 5 * bump(a, 20, 6),
  C: (a) => 10 * sig((a - 22) / 5) - 4 * bump(a, 15, 3) - 3,
  A: (a) => 8 * sig((a - 25) / 7) - 2,
  E: (a) => -4 * bump(a, 14, 3),
  N: (a) => 6 * bump(a, 15, 3.5) - 6 * sig((a - 25) / 6),
};

/** Life events: trait shift `d`, how much persists long-term `pf` (0–1). */
export const KID_EVENTS: Record<string, { d: TraitDelta; pf: number; txt: string }> = {
  sibling: { d: { A: 3, N: 2, E: 1 }, pf: 0.6, txt: "A younger sibling arrives" },
  sport: { d: { C: 4, E: 5, N: -3, A: 2 }, pf: 0.6, txt: "Joins a team sport" },
  screen: { d: { C: -5, N: 4, E: -2, O: -1 }, pf: 0.5, txt: "Heavy daily screen time begins" },
  divorce: { d: { N: 8, A: -2, C: -2 }, pf: 0.35, txt: "Parents separate" },
  move: { d: { O: 6, N: 4, E: -3 }, pf: 0.5, txt: "Family moves abroad" },
  mentor: { d: { C: 5, O: 4, N: -2 }, pf: 0.7, txt: "Finds a strong mentor" },
  bullied: { d: { N: 6, E: -4, A: -1 }, pf: 0.5, txt: "Bullied at school for a year" },
};

export const TRAIT_WORDS: Record<Trait, [string, string, string]> = {
  O: ["practical, likes routine", "moderately curious", "curious and imaginative"],
  C: ["spontaneous, struggles with structure", "reasonably organised", "organised and reliable"],
  E: ["quiet, recharges alone", "at ease alone or in groups", "outgoing, energised by people"],
  A: ["direct and competitive", "cooperative but pushes back", "warm and eager to help"],
  N: ["calm and steady", "normal ups and downs", "sensitive, prone to worry"],
};
export const level = (v: number) => (v >= 65 ? 2 : v <= 35 ? 0 : 1);

/** Habit effects: [wellbeing, health, relationships, career, effect time-constant (yrs), isGoodHabit]. */
export const HABITS: Record<string, [number, number, number, number, number, 0 | 1]> = {
  exercise: [12, 18, 3, 4, 0.5, 1],
  social: [8, 2, 5, 5, 0.2, 1],
  sleep: [9, 10, 3, 5, 0.15, 1],
  read: [4, 0, 1, 10, 2, 1],
  meditate: [10, 4, 3, 2, 0.3, 1],
  learn: [5, 0, 2, 18, 2, 1],
  drink: [-15, -25, -8, -12, 3, 0],
  isolate: [-18, -6, -25, -6, 1, 0],
  smoke: [-6, -30, -3, -3, 10, 0],
};
