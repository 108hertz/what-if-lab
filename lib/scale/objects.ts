import type { ObjectId } from "./glyphs";
import { scoped, type Say } from "../i18n/t";
import { pageT } from "../i18n/page";

export interface ScaleObject {
  name: string;
  /** Size in metres: diameter, height for things that stand, length for animals. */
  size: number;
  color: string;
  /** Picks the object's renderer in `glyphs/`. */
  id: ObjectId;
  /** Sandbox to open, optionally with a preset: "animals:wolf". */
  sandbox: string | null;
  fact: string;
  /** log10(size), filled in below. */
  L: number;
  /** How far below the centre the object reaches, in half-sizes (the label sits under it). */
  ext: number;
}

const RAW: [string, number, string, ObjectId, string | null, string][] = [
  ["Proton", 1.7e-15, "#FF9A8B", "proton", null, "Three quarks bound together; the core of every hydrogen atom."],
  ["Hydrogen atom", 1.06e-10, "#9FB4FF", "hydrogen", null, "Almost entirely empty space: the nucleus is 100,000× smaller than the atom."],
  ["DNA double helix", 2e-9, "#7EE0C3", "dna", null, "Unwound, the DNA in one of your cells would be about 2 metres long."],
  ["Flu virus", 1.2e-7, "#C99BFF", "flu", null, "Can’t reproduce on its own; it hijacks your cells to copy itself."],
  ["Bacterium (E. coli)", 2e-6, "#8FD18C", "ecoli", null, "Your gut holds roughly as many bacteria as your body has cells."],
  ["Red blood cell", 8e-6, "#E0605A", "rbc", null, "You make about 2 million of these every second."],
  ["Human egg cell", 1.2e-4, "#F2C6B4", "egg", null, "The largest human cell, just visible to the naked eye."],
  ["Grain of sand", 5e-4, "#D9B97A", "sand", null, "There are more stars in the universe than grains of sand on all Earth’s beaches."],
  ["Ant", 5e-3, "#B06A4A", "ant", null, "Ants can carry 10–50 times their own body weight."],
  ["Honeybee", 1.5e-2, "#F7D26A", "bee", "animals:bee", "Visits up to 100 flowers on a single trip."],
  ["Mouse", 8e-2, "#A99A8C", "mouse", null, "Its heart beats about 600 times a minute."],
  ["Meerkat", 3e-1, "#D8B98A", "meerkat", "animals:meerkat", "Sentinels stand guard and bark warnings while the mob forages."],
  ["Child, age 5", 1.1, "#7AA6FF", "child", "child", "Personality is roughly 40% inherited; the rest comes from experience and chance."],
  ["Gray wolf", 1.5, "#C3CCDA", "wolf", "animals:wolf", "Wolves returning to Yellowstone changed the course of its rivers."],
  ["Adult human", 1.7, "#FF9D7A", "human", "person", "About 37 trillion cells, replaced and renewed throughout life."],
  ["Lion", 2.5, "#E2B26B", "lion", "animals:lion", "The only truly social cat."],
  ["African elephant", 6, "#B0AAA3", "elephant", "animals:elephant", "The largest land animal, led by the oldest female."],
  ["Orca", 8, "#93A6CC", "orca", "animals:orca", "Different pods speak different dialects."],
  ["Blue whale", 30, "#5F8BC4", "whale", null, "The largest animal that has ever lived."],
  ["Statue of Liberty", 93, "#7FC4A8", "liberty", null, "Her copper skin is only 2.4 mm thick."],
  ["Eiffel Tower", 330, "#C8A27A", "eiffel", null, "Grows about 15 cm taller in summer heat."],
  ["Burj Khalifa", 830, "#A9C1D9", "burj", null, "The tallest building on Earth."],
  ["Mount Everest", 8849, "#A0A8BC", "everest", null, "Still rising about 4 mm a year."],
  ["Grand Canyon", 4.5e5, "#C97B55", "canyon", null, "Carved by the Colorado River over about 6 million years."],
  ["A large country", 3.2e6, "#7FB37A", "country", "country", "Economies grow, stall and collapse with policy, resources and luck."],
  ["Moon", 3.47e6, "#BFC3CC", "moon", null, "Slowly drifting away from Earth at 3.8 cm a year."],
  ["Earth", 1.27e7, "#4D8FE0", "earth", "earth", "The only planet known to host life, warming about 0.2 °C per decade."],
  ["Jupiter", 1.4e8, "#D9B48F", "jupiter", null, "Over 1,300 Earths would fit inside it."],
  ["Sun", 1.39e9, "#FFD76A", "sun", null, "Holds 99.86% of all the mass in the Solar System."],
  ["Earth’s orbit", 3e11, "#6FB3FF", "orbit", "solar", "Light from the Sun takes 8 minutes to reach us."],
  ["Solar system (to Neptune)", 9e12, "#7B93FF", "solar", "solar", "Neptune takes 165 years to go round once."],
  ["One light-year", 9.46e15, "#E7EAF6", "lightyear", null, "The distance light travels in a year: 9.46 trillion km."],
  ["To the nearest star", 4e16, "#FFC4A3", "proxima", null, "Proxima Centauri, 4.2 light-years away."],
  ["Orion Nebula", 2.3e17, "#E28BD1", "orion", null, "A star nursery 1,300 light-years away."],
  ["Milky Way", 1e21, "#BCD0FF", "milkyway", "galaxy", "100–400 billion stars, and on course to merge with Andromeda."],
  ["Local Group", 1e23, "#A9B1D6", "localgroup", null, "More than 80 galaxies bound together by gravity."],
  ["Observable universe", 8.8e26, "#C9B6FF", "universe", null, "93 billion light-years across, the farthest light that could have reached us."],
];

/** Objects that don't fill their box downward: the label moves up to meet them. */
const EXT: Partial<Record<ObjectId, number>> = { dna: 1.7, ecoli: 0.4, rbc: 0.85, bee: 0.5, orca: 0.45, whale: 0.3, lightyear: 0.15, proxima: 0.15 };

export const SCALE_OBJECTS: ScaleObject[] = RAW.map(([name, size, color, id, sandbox, fact]) => ({ name, size, color, id, sandbox, fact, L: Math.log10(size), ext: EXT[id] ?? 1 }));

export const ZOOM_MIN = -15.3;
export const ZOOM_MAX = 27.3;

export const JUMPS: [string, number][] = [
  ["Atom", -10], ["Cell", -5], ["You", 0.6], ["City", 4.5], ["Earth", 7.5], ["Solar system", 13.5], ["Galaxy", 21.5], ["Universe", 27],
];

/**
 * The objects' words (change 0025), English in code like a world's: <id>.name, <id>.fact, jump.<i>. Other languages
 * translate them in lib/i18n/locales/<code>/objects.json.
 */
export const OBJECT_MESSAGES: Record<string, string> = {
  ...Object.fromEntries(SCALE_OBJECTS.flatMap((o) => [[`${o.id}.name`, o.name], [`${o.id}.fact`, o.fact]])),
  ...Object.fromEntries(JUMPS.map(([n], i) => [`jump.${i}`, n])),
};
export const objectSay = (): Say => scoped(pageT(), "objects", OBJECT_MESSAGES);
