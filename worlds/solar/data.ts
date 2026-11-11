/**
 * Known star systems for the solar world (change 0037). Rounded published values; estimates vary (planet masses
 * of Kepler-90, Kepler-11 g and the TRAPPIST-1 radii in particular). Units: AU, solar masses, Suns of light.
 * Planet orbits start circular at a random angle (the world's seeded RNG), like the Solar System always has.
 */

/** One star: mass (M☉), luminosity (L☉), colour, radius (AU, the collision radius). */
export interface StarSpec { n: string; m: number; L: number; c: string; r: number }
/** One planet: name, orbit radius (AU), mass (M☉), colour, drawn size (px). */
export type PlanetSpec = [n: string, a: number, m: number, c: string, px: number];

export interface SystemSpec {
  id: string;
  stars: StarSpec[];
  /**
   * Binaries: separation (AU) and eccentricity of the stars' mutual orbit, started at its widest point.
   * Planets orbit star A only ("A", Alpha Centauri) or both stars ("both", Kepler-16).
   */
  bin?: { a: number; e: number; host: "A" | "both" };
  planets: PlanetSpec[];
  /** The planet the metrics follow (distance, temperature, length of year). */
  watch: string;
  /** Outermost orbit (AU): the stage's framing and the size compared in "Compare sizes". */
  size: number;
  /** Starting speed: an index into the world's `speeds` (one watched-planet year takes a few seconds). */
  speed: number;
  /** For "Compare sizes": star type in the world's messages (`kind.<k>`), and a one-line note (`note.<id>`). */
  kind: "sun" | "red" | "like" | "two";
}

const ME = 3.0e-6; // Earth masses → M☉
const MJ = 9.55e-4; // Jupiter masses → M☉

export const SYSTEMS: SystemSpec[] = [
  {
    id: "sol", kind: "sun", size: 30, speed: 3, watch: "Earth",
    stars: [{ n: "Sun", m: 1, L: 1, c: "#FFD76A", r: 0.00465 }],
    planets: [
      ["Mercury", 0.387, 1.66e-7, "#B9AB9C", 2.2], ["Venus", 0.723, 2.45e-6, "#E8C48A", 3], ["Earth", 1, 3.0e-6, "#6FB3FF", 3.4],
      ["Mars", 1.524, 3.2e-7, "#E07A56", 2.6], ["Jupiter", 5.2, 9.55e-4, "#D9B48F", 5], ["Saturn", 9.58, 2.86e-4, "#E9D39A", 4.5],
      ["Uranus", 19.2, 4.37e-5, "#9FE0E6", 3.8], ["Neptune", 30.05, 5.15e-5, "#7B93FF", 3.8],
    ],
  },
  {
    id: "trappist", kind: "red", size: 0.0619, speed: 0, watch: "TRAPPIST-1 e",
    stars: [{ n: "TRAPPIST-1", m: 0.0898, L: 0.000553, c: "#FF7E57", r: 0.000554 }],
    planets: [
      ["TRAPPIST-1 b", 0.01154, 1.37 * ME, "#C9A48A", 3], ["TRAPPIST-1 c", 0.0158, 1.31 * ME, "#D8B58F", 3],
      ["TRAPPIST-1 d", 0.02227, 0.39 * ME, "#B7A7A0", 2.4], ["TRAPPIST-1 e", 0.02925, 0.69 * ME, "#6FB3FF", 3],
      ["TRAPPIST-1 f", 0.03849, 1.04 * ME, "#8FC9D9", 3], ["TRAPPIST-1 g", 0.04683, 1.32 * ME, "#9AB8E8", 3.2],
      ["TRAPPIST-1 h", 0.06189, 0.33 * ME, "#B8C4D8", 2.4],
    ],
  },
  {
    id: "proxima", kind: "red", size: 0.0486, speed: 0, watch: "Proxima b",
    stars: [{ n: "Proxima Centauri", m: 0.122, L: 0.00155, c: "#FF7350", r: 0.00072 }],
    planets: [["Proxima d", 0.02885, 0.26 * ME, "#B9AB9C", 2.4], ["Proxima b", 0.04857, 1.07 * ME, "#6FB3FF", 3.2]],
  },
  {
    id: "kepler90", kind: "like", size: 1.01, speed: 2, watch: "Kepler-90 h",
    stars: [{ n: "Kepler-90", m: 1.2, L: 1.7, c: "#FFE7A0", r: 0.0056 }],
    planets: [
      ["Kepler-90 b", 0.074, 2 * ME, "#B9AB9C", 2.4], ["Kepler-90 c", 0.089, 1.7 * ME, "#C9B49A", 2.3],
      ["Kepler-90 i", 0.107, 2 * ME, "#D8B58F", 2.4], ["Kepler-90 d", 0.32, 8 * ME, "#9FE0E6", 3.2],
      ["Kepler-90 e", 0.42, 7 * ME, "#8FC9D9", 3.1], ["Kepler-90 f", 0.48, 8 * ME, "#7B93FF", 3.2],
      ["Kepler-90 g", 0.71, 15 * ME, "#E9D39A", 4.2], ["Kepler-90 h", 1.01, 0.64 * MJ, "#D9B48F", 5],
    ],
  },
  {
    id: "kepler11", kind: "like", size: 0.466, speed: 2, watch: "Kepler-11 g",
    stars: [{ n: "Kepler-11", m: 0.96, L: 1.0, c: "#FFD76A", r: 0.0051 }],
    planets: [
      ["Kepler-11 b", 0.091, 1.9 * ME, "#B9AB9C", 2.6], ["Kepler-11 c", 0.107, 2.9 * ME, "#C9B49A", 3],
      ["Kepler-11 d", 0.155, 7.3 * ME, "#9FE0E6", 3.4], ["Kepler-11 e", 0.195, 8 * ME, "#8FC9D9", 3.6],
      ["Kepler-11 f", 0.25, 2 * ME, "#D8B58F", 2.8], ["Kepler-11 g", 0.466, 10 * ME, "#6FB3FF", 3.6],
    ],
  },
  {
    id: "cancri", kind: "like", size: 5.74, speed: 2, watch: "55 Cancri f",
    stars: [{ n: "55 Cancri A", m: 0.95, L: 0.6, c: "#FFC870", r: 0.0044 }],
    planets: [
      ["55 Cancri e", 0.0154, 8 * ME, "#FF8A4C", 2.8], ["55 Cancri b", 0.113, 0.83 * MJ, "#D9B48F", 4.4],
      ["55 Cancri c", 0.237, 0.17 * MJ, "#E9D39A", 3.6], ["55 Cancri f", 0.77, 0.14 * MJ, "#6FB3FF", 3.6],
      ["55 Cancri d", 5.74, 3.8 * MJ, "#E0B98F", 5.4],
    ],
  },
  {
    id: "kepler16", kind: "two", size: 0.705, speed: 2, watch: "Kepler-16 b",
    stars: [{ n: "Kepler-16 A", m: 0.69, L: 0.15, c: "#FFB466", r: 0.003 }, { n: "Kepler-16 B", m: 0.2, L: 0.006, c: "#FF7350", r: 0.001 }],
    bin: { a: 0.224, e: 0, host: "both" },
    planets: [["Kepler-16 b", 0.705, 0.333 * MJ, "#E9D39A", 4.4]],
  },
  {
    id: "alphacen", kind: "two", size: 35.6, speed: 3, watch: "Earth",
    stars: [{ n: "Alpha Centauri A", m: 1.08, L: 1.52, c: "#FFE08A", r: 0.0057 }, { n: "Alpha Centauri B", m: 0.91, L: 0.5, c: "#FFB86A", r: 0.004 }],
    bin: { a: 23.4, e: 0.52, host: "A" },
    // No confirmed planets: Earth placed where it would be as warm as at home (√1.52 AU from A)
    planets: [["Earth", 1.233, 3.0e-6, "#6FB3FF", 3.4]],
  },
];

export const systemOf = (id: string): SystemSpec => SYSTEMS.find((s) => s.id === id) ?? SYSTEMS[0];

/** The picker's English names (said as `ctl.sys.opt.<id>`, also in "Compare sizes"). */
export const SYSTEM_NAMES: Record<string, string> = {
  sol: "Solar System", trappist: "TRAPPIST-1", proxima: "Proxima Centauri", kepler90: "Kepler-90",
  kepler11: "Kepler-11", cancri: "55 Cancri", kepler16: "Kepler-16 (two suns)", alphacen: "Alpha Centauri A + B",
};

/** English words for "Compare sizes": each system's one-line note and its kind of star. */
export const SYSTEM_WORDS: Record<string, string> = {
  "note.sol": "Our home: eight planets out to Neptune.",
  "note.trappist": "Seven Earth-size planets, all closer to their star than Mercury is to the Sun.",
  "note.proxima": "The nearest star to the Sun, 4.2 light years away.",
  "note.kepler90": "The only other star known with eight planets.",
  "note.kepler11": "Six planets packed inside Venus's orbit.",
  "note.cancri": "A lava world with an 18-hour year, and a Jupiter as far out as ours.",
  "note.kepler16": "A planet that orbits two suns.",
  "note.alphacen": "Two Sun-like stars; no planet confirmed, so Earth is placed where it would be as warm as at home.",
  "kind.sun": "the Sun", "kind.red": "red dwarf", "kind.like": "Sun-like star", "kind.two": "two stars",
};
