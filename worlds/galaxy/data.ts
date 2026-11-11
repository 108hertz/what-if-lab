/**
 * Known galaxies for the galaxy world (change 0038). Rounded published values; estimates vary a lot (the Milky Way's
 * mass, Andromeda's and IC 1101's diameters in particular). Mass includes dark matter.
 *
 * The sim stays in its own units, scaled to "our galaxy": our core weighs 1 (× the dark-matter setting) and our disc
 * has scale 1 (40,000 ly for the Milky Way). The incoming galaxy is set relative to ours: mass ratio capped to
 * 1/20 … 20× (beyond that one galaxy swallows the other at once and the integrator can't keep up), disc scale ≈ the
 * square root of the diameter ratio, capped to 0.3 … 2.5. Star counts are shares of the world's star budget, never
 * real counts.
 */

export type GalaxyKind = "spiral" | "elliptical" | "irregular";

export interface GalaxySpec {
  id: string;
  kind: GalaxyKind;
  /** Diameter of its disc or visible body, in thousands of light-years. */
  dkly: number;
  /** Stars, billions. */
  starsB: number;
  /** Mass including dark matter, trillions of Suns. */
  massT: number;
  /** Central black hole, billions of Suns (shown only where it is famous). */
  bh?: number;
  /**
   * The sim's disc scale (Milky Way = 1) when it isn't √(diameter / 100 kly): Andromeda keeps the size the world has
   * always drawn it at (its bright disc; the larger diameter is its faint outskirts).
   */
  rs?: number;
}

export const GALAXIES: GalaxySpec[] = [
  { id: "mw", kind: "spiral", dkly: 100, starsB: 250, massT: 1.25 },
  { id: "m31", kind: "spiral", dkly: 180, starsB: 1000, massT: 1.5, rs: 1 },
  { id: "m33", kind: "spiral", dkly: 60, starsB: 40, massT: 0.05 },
  { id: "lmc", kind: "irregular", dkly: 14, starsB: 30, massT: 0.14 },
  { id: "smc", kind: "irregular", dkly: 7, starsB: 7, massT: 0.007 },
  { id: "m51", kind: "spiral", dkly: 76, starsB: 160, massT: 0.16 },
  { id: "m101", kind: "spiral", dkly: 170, starsB: 1000, massT: 1 },
  { id: "m104", kind: "spiral", dkly: 50, starsB: 100, massT: 0.8 },
  { id: "m87", kind: "elliptical", dkly: 120, starsB: 1000, massT: 6, bh: 6.5 },
  { id: "ic1101", kind: "elliptical", dkly: 3000, starsB: 100000, massT: 100 },
];

export const galaxyOf = (id: string): GalaxySpec => GALAXIES.find((g) => g.id === id) ?? GALAXIES[0];

/** Disc scale in the sim's units, before it is made relative to our galaxy. */
export const discScale = (g: GalaxySpec) => g.rs ?? Math.sqrt(g.dkly / 100);

/** Mass ratio limits (incoming ÷ ours) and disc-scale limits the sim keeps to. */
export const MASS_CAP = 20, DISC_MIN = 0.3, DISC_MAX = 2.5;

const round = (x: number, step: number) => Math.round(x / step) * step;

/** The starting values a pair of picks gives (the sliders they pre-fill), and whether the mass was capped. */
export function pairOf(ours: string, them: string) {
  const a = galaxyOf(ours), b = galaxyOf(them), real = b.massT / a.massT;
  const mass = Math.round(Math.min(MASS_CAP, Math.max(1 / MASS_CAP, real)) * 20) / 20;
  const rsize = Math.round(Math.min(DISC_MAX, Math.max(DISC_MIN, round(discScale(b) / discScale(a), 0.1))) * 10) / 10;
  return { mass, rsize, shape: b.kind, real, capped: real > MASS_CAP || real < 1 / MASS_CAP };
}

/** The pickers' English names (said as `ctl.ours.opt.<id>` / `ctl.them.opt.<id>`, also in "Compare sizes"). */
export const GALAXY_NAMES: Record<string, string> = {
  mw: "Milky Way", m31: "Andromeda (M31)", m33: "Triangulum (M33)", lmc: "Large Magellanic Cloud",
  smc: "Small Magellanic Cloud", m51: "Whirlpool (M51)", m101: "Pinwheel (M101)", m104: "Sombrero (M104)",
  m87: "M87", ic1101: "IC 1101",
};

/**
 * English words: each galaxy's name inside a sentence (`gal.<id>`, used in event lines and what-ifs), a one-line note
 * for "Compare sizes" (`note.<id>`) and its kind (`kind.<k>`).
 */
export const GALAXY_WORDS: Record<string, string> = {
  "gal.mw": "the Milky Way", "gal.m31": "Andromeda", "gal.m33": "Triangulum", "gal.lmc": "the Large Magellanic Cloud",
  "gal.smc": "the Small Magellanic Cloud", "gal.m51": "the Whirlpool Galaxy", "gal.m101": "the Pinwheel Galaxy",
  "gal.m104": "the Sombrero Galaxy", "gal.m87": "M87", "gal.ic1101": "IC 1101",
  "note.mw": "Our home: a barred spiral, the Sun about halfway out.",
  "note.m31": "The nearest big galaxy, 2.5 million light years away and heading our way.",
  "note.m33": "The third-largest galaxy in our Local Group.",
  "note.lmc": "A dwarf that orbits the Milky Way; it may fall in within a few billion years.",
  "note.smc": "The Large Cloud's smaller partner, visible from the southern sky.",
  "note.m51": "A grand spiral being pulled at by a small companion.",
  "note.m101": "A huge face-on spiral, nearly twice our size.",
  "note.m104": "A bright bulge and a dark dust lane, seen almost edge-on.",
  "note.m87": "A giant ball of stars; its black hole was the first ever photographed.",
  "note.ic1101": "One of the largest galaxies known, at the heart of a galaxy cluster.",
  "kind.spiral": "spiral", "kind.elliptical": "elliptical", "kind.irregular": "irregular dwarf",
};
