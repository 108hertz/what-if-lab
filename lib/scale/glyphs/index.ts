import type { Glyph } from "./common";
import { burj, canyon, country, eiffel, everest, liberty } from "./built";
import { ant, bee, child, elephant, human, lion, meerkat, mouse, orca, whale, wolf } from "./life";
import { dna, ecoli, egg, flu, hydrogen, proton, rbc, sand } from "./micro";
import { earth, jupiter, moon, sun } from "./planets";
import { lightyear, localgroup, milkyway, orbit, orion, proxima, solar, universe } from "./space";

export type { G, Glyph } from "./common";

/** One renderer per scale object (change 0012). */
export const GLYPHS = {
  proton, hydrogen, dna, flu, ecoli, rbc, egg, sand,
  ant, bee, mouse, meerkat, child, wolf, human, lion, elephant, orca, whale,
  liberty, eiffel, burj, everest, canyon, country,
  moon, earth, jupiter, sun,
  orbit, solar, lightyear, proxima, orion, milkyway, localgroup, universe,
} satisfies Record<string, Glyph>;

export type ObjectId = keyof typeof GLYPHS;
