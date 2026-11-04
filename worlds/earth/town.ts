/** Shared numbers for the model (sim.ts) and the picture (scene.ts): mountains, snow line and the town. */

/** Snow line today (m) and how fast it climbs per °C; the scene's highest peak is 2,400 m. */
export const SNOW0 = 1600, SNOW_PER_C = 150, PEAK = 2400, T_TODAY = 1.26;
/** Houses in town, their spread above the seafront (m) and the storm-tide allowance (m). */
export const HOUSES = 24, SPREAD = 6, TIDE = 0.6;
/** Height of house `i`'s doorstep above today's sea (m). */
export const houseBase = (i: number, front: number) => front + SPREAD * (i / (HOUSES - 1)) ** 1.3;
