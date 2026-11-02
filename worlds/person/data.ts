/** Static data for the person world. */


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
