export type GlyphKind =
  | "ball" | "sun" | "moon" | "earth" | "jupiter" | "atom" | "helix" | "virus" | "cell" | "rbc" | "blob"
  | "tower" | "peak" | "land" | "orbit" | "orbits" | "line" | "nebula" | "galaxy" | "web";

export interface ScaleObject {
  name: string;
  /** Size in metres. */
  size: number;
  color: string;
  kind: GlyphKind;
  /** Sandbox to open, optionally with a preset: "animals:wolf". */
  sandbox: string | null;
  fact: string;
  /** log10(size), filled in below. */
  L: number;
}

const RAW: [string, number, string, GlyphKind, string | null, string][] = [
  ["Proton", 1.7e-15, "#FF9A8B", "ball", null, "Three quarks bound together; the core of every hydrogen atom."],
  ["Hydrogen atom", 1.06e-10, "#9FB4FF", "atom", null, "Almost entirely empty space: the nucleus is 100,000× smaller than the atom."],
  ["DNA double helix", 2e-9, "#7EE0C3", "helix", null, "Unwound, the DNA in one of your cells would be about 2 metres long."],
  ["Flu virus", 1.2e-7, "#C99BFF", "virus", null, "Can’t reproduce on its own; it hijacks your cells to copy itself."],
  ["Bacterium (E. coli)", 2e-6, "#8FD18C", "cell", null, "Your gut holds roughly as many bacteria as your body has cells."],
  ["Red blood cell", 8e-6, "#E0605A", "rbc", null, "You make about 2 million of these every second."],
  ["Human egg cell", 1.2e-4, "#F2C6B4", "cell", null, "The largest human cell, just visible to the naked eye."],
  ["Grain of sand", 5e-4, "#D9B97A", "ball", null, "There are more stars in the universe than grains of sand on all Earth’s beaches."],
  ["Ant", 5e-3, "#B06A4A", "blob", null, "Ants can carry 10–50 times their own body weight."],
  ["Honeybee", 1.5e-2, "#F7D26A", "blob", "animals:bee", "Visits up to 100 flowers on a single trip."],
  ["Mouse", 8e-2, "#A99A8C", "blob", null, "Its heart beats about 600 times a minute."],
  ["Meerkat", 3e-1, "#D8B98A", "blob", "animals:meerkat", "Sentinels stand guard and bark warnings while the mob forages."],
  ["Child, age 5", 1.1, "#7AA6FF", "blob", "child", "Personality is roughly 40% inherited; the rest comes from experience and chance."],
  ["Gray wolf", 1.5, "#C3CCDA", "blob", "animals:wolf", "Wolves returning to Yellowstone changed the course of its rivers."],
  ["Adult human", 1.7, "#FF9D7A", "blob", "person", "About 37 trillion cells, replaced and renewed throughout life."],
  ["Lion", 2.5, "#E2B26B", "blob", "animals:lion", "The only truly social cat."],
  ["African elephant", 6, "#B0AAA3", "blob", "animals:elephant", "The largest land animal, led by the oldest female."],
  ["Orca", 8, "#93A6CC", "blob", "animals:orca", "Different pods speak different dialects."],
  ["Blue whale", 30, "#5F8BC4", "blob", null, "The largest animal that has ever lived."],
  ["Statue of Liberty", 93, "#7FC4A8", "tower", null, "Her copper skin is only 2.4 mm thick."],
  ["Eiffel Tower", 330, "#C8A27A", "tower", null, "Grows about 15 cm taller in summer heat."],
  ["Burj Khalifa", 830, "#A9C1D9", "tower", null, "The tallest building on Earth."],
  ["Mount Everest", 8849, "#A0A8BC", "peak", null, "Still rising about 4 mm a year."],
  ["Grand Canyon", 4.5e5, "#C97B55", "land", null, "Carved by the Colorado River over about 6 million years."],
  ["A large country", 3.2e6, "#7FB37A", "land", "country", "Economies grow, stall and collapse with policy, resources and luck."],
  ["Moon", 3.47e6, "#BFC3CC", "moon", null, "Slowly drifting away from Earth at 3.8 cm a year."],
  ["Earth", 1.27e7, "#4D8FE0", "earth", "earth", "The only planet known to host life, warming about 0.2 °C per decade."],
  ["Jupiter", 1.4e8, "#D9B48F", "jupiter", null, "Over 1,300 Earths would fit inside it."],
  ["Sun", 1.39e9, "#FFD76A", "sun", null, "Holds 99.86% of all the mass in the Solar System."],
  ["Earth’s orbit", 3e11, "#6FB3FF", "orbit", "solar", "Light from the Sun takes 8 minutes to reach us."],
  ["Solar system (to Neptune)", 9e12, "#7B93FF", "orbits", "solar", "Neptune takes 165 years to go round once."],
  ["One light-year", 9.46e15, "#E7EAF6", "line", null, "The distance light travels in a year: 9.46 trillion km."],
  ["To the nearest star", 4e16, "#FFC4A3", "line", null, "Proxima Centauri, 4.2 light-years away."],
  ["Orion Nebula", 2.3e17, "#E28BD1", "nebula", null, "A star nursery 1,300 light-years away."],
  ["Milky Way", 1e21, "#BCD0FF", "galaxy", "galaxy", "100–400 billion stars, and on course to merge with Andromeda."],
  ["Local Group", 1e23, "#A9B1D6", "web", null, "More than 80 galaxies bound together by gravity."],
  ["Observable universe", 8.8e26, "#C9B6FF", "web", null, "93 billion light-years across, the farthest light that could have reached us."],
];

export const SCALE_OBJECTS: ScaleObject[] = RAW.map(([name, size, color, kind, sandbox, fact]) => ({ name, size, color, kind, sandbox, fact, L: Math.log10(size) }));

export const ZOOM_MIN = -15.3;
export const ZOOM_MAX = 27.3;

export const JUMPS: [string, number][] = [
  ["Atom", -10], ["Cell", -5], ["You", 0.6], ["City", 4.5], ["Earth", 7.5], ["Solar system", 13.5], ["Galaxy", 21.5], ["Universe", 27],
];
