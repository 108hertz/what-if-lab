/**
 * The animals world's cast (change 0017): 21 species, who eats whom, and how each one is drawn.
 * Framework-free data. Numbers are rough, kid-readable model values, not field measurements.
 */

export type Habitat = "forest" | "savanna" | "desert" | "ocean" | "ice" | "meadow";
/** `plants` eats the ground food (grass, flowers, krill, bugs…), `meat` eats other animals, `both` eats either. */
export type Diet = "plants" | "meat" | "both";

/** How an animal is drawn (worlds/animals/scene.ts). Proportions are relative to the body radius. */
export interface Look {
  form: "quad" | "elephant" | "upright" | "penguin" | "fish" | "orca" | "seal" | "insect" | "scorpion";
  /** Body fill and pattern colour (the stage is always dark). */
  body: string;
  pat: string;
  pattern: "none" | "stripes" | "spots" | "belly" | "mask" | "patch" | "bands";
  /** Body half-length and half-height (× r). */
  bw: number;
  bh: number;
  /** Head radius and how far it sits forward / up (× r). */
  head: number;
  hx: number;
  hy: number;
  /** Snout length (× r). */
  snout: number;
  ears: "none" | "point" | "round" | "long" | "big";
  horns: "none" | "antler" | "spike";
  mane: boolean;
  tail: "none" | "bushy" | "thin" | "tuft" | "flat" | "stub" | "fin" | "sting";
  /** Leg length (× r); 0 = no legs drawn. */
  leg: number;
}

export interface Species {
  id: string;
  /** Lower-case singular and plural for sentences ("leopard seal", "wolves"). */
  one: string;
  many: string;
  /** What its "coat" is: fur, feathers, blubber… */
  coat: string;
  name: string;
  pl: string;
  latin: string;
  home: Habitat;
  diet: Diet;
  /** Species ids it can catch; plant food is implied by diet `plants` / `both`. */
  eats: string[];
  /** Body size used by the food web (a wolf is 1). Hunters take prey under 1.4× their size, pack hunters 2.5×. */
  size: number;
  pack?: boolean;
  /** How hard it is to catch once reached (1 = normal; a scorpion's sting makes hunters careful). */
  guard: number;
  /** Top speed in arena-widths a day. */
  speed: number;
  /** Metabolism: 0 = many small plant-eaters (fast breeding), 1 = few hunters (slow, long-lived). */
  meta: 0 | 1;
  /** Comfortable temperature range in °C, and how sharply costs climb outside the temperature it is used to. */
  lo: number;
  hi: number;
  tol: number;
  /** People hunt or fish it. */
  hunted: boolean;
  /** Colour for chips, chart lines and keys. */
  col: string;
  look: Look;
  where: string;
  social: string;
  food: string;
  life: string;
  role: string;
}

/** Typical ground temperature of each habitat, °C. */
export const HAB_T: Record<Habitat, number> = { forest: 5, savanna: 27, desert: 30, ocean: 8, ice: -15, meadow: 16 };
export const HABITATS: [Habitat, string][] = [["forest", "Forest and tundra"], ["savanna", "Savanna"], ["desert", "Desert"], ["ocean", "Ocean"], ["ice", "Sea ice"], ["meadow", "Meadow"]];
/** What the plant food is called in each habitat. */
export const FOOD_NAME: Record<Habitat, string> = { forest: "grass and leaves", savanna: "grass", desert: "bugs and seeds", ocean: "krill and small fish", ice: "krill", meadow: "flowers" };

const L = (form: Look["form"], body: string, pat: string, o: Partial<Look> = {}): Look => ({
  form, body, pat, pattern: "none", bw: 1, bh: 0.55, head: 0.42, hx: 1.05, hy: -0.35, snout: 0.3, ears: "point", horns: "none", mane: false, tail: "thin", leg: 0.75, ...o,
});

const S = (s: Omit<Species, "guard"> & { guard?: number }): Species => ({ guard: 1, ...s });

export const SPECIES: Record<string, Species> = {
  // ── Forest & tundra
  wolf: S({
    id: "wolf", one: "wolf", many: "wolves", coat: "fur", name: "Gray wolf", pl: "Gray wolves", latin: "Canis lupus", home: "forest", diet: "meat", eats: ["elk", "beaver", "rabbit"], size: 1, pack: true, speed: 0.19, meta: 1,
    lo: -30, hi: 22, tol: 6, hunted: true, col: "#AEB8C6",
    look: L("quad", "#9AA3AF", "#D9DEE5", { pattern: "belly", snout: 0.42, tail: "bushy", leg: 0.8 }),
    where: "Forests, tundra and mountains across North America, Europe and Asia", social: 'Packs of 4–9: a mother, a father and their young. The "alpha" pair are simply the parents.',
    food: "Elk, deer, beavers and rabbits", life: "6–8 years in the wild", role: "Keeps elk on the move, which lets riverside trees grow back.",
  }),
  elk: S({
    id: "elk", one: "elk", many: "elk", coat: "fur", name: "Elk", pl: "Elk", latin: "Cervus canadensis", home: "forest", diet: "plants", eats: [], size: 1.5, speed: 0.11, meta: 0,
    lo: -30, hi: 20, tol: 6, hunted: true, col: "#D6B48A",
    look: L("quad", "#B98E62", "#6E4E33", { pattern: "mask", bw: 1.05, bh: 0.5, head: 0.34, hx: 1.1, hy: -0.75, snout: 0.35, ears: "point", horns: "antler", tail: "stub", leg: 1.05 }),
    where: "Mountain forests and meadows of North America and Asia", social: "Mothers and young live in big herds; males live alone and roar (bugle) in autumn.",
    food: "Grass, leaves and bark", life: "10–13 years", role: "The main meal of wolves; their grazing shapes the forest edge.",
  }),
  fox: S({
    id: "fox", one: "fox", many: "foxes", coat: "fur", name: "Red fox", pl: "Red foxes", latin: "Vulpes vulpes", home: "forest", diet: "both", eats: ["rabbit", "beaver", "meerkat"], size: 0.7, speed: 0.17, meta: 1,
    lo: -25, hi: 30, tol: 7, hunted: true, col: "#E9874A",
    look: L("quad", "#D9733A", "#F4E3CF", { pattern: "belly", bh: 0.48, snout: 0.45, ears: "point", tail: "bushy", leg: 0.65 }),
    where: "Almost everywhere in the northern half of the world, even in cities", social: "Pairs raise their cubs together; older daughters sometimes help.",
    food: "Rabbits, mice, birds, berries", life: "3–4 years in the wild", role: "Keeps rabbit and mouse numbers in check.",
  }),
  rabbit: S({
    id: "rabbit", one: "rabbit", many: "rabbits", coat: "fur", name: "Rabbit", pl: "Rabbits", latin: "Oryctolagus cuniculus", home: "forest", diet: "plants", eats: [], size: 0.5, speed: 0.12, meta: 0,
    lo: -15, hi: 32, tol: 6, hunted: true, col: "#CDBBA5",
    look: L("quad", "#B8A58D", "#EDE3D6", { pattern: "belly", bw: 0.85, bh: 0.62, head: 0.45, hx: 0.85, hy: -0.4, snout: 0.12, ears: "long", tail: "stub", leg: 0.4 }),
    where: "Grassland and woodland edges; spread by people to many countries", social: "Live in groups in underground tunnels called warrens.",
    food: "Grass and leafy plants", life: "1–2 years in the wild", role: "Food for foxes, hawks and many others; can strip land bare when there are too many.",
  }),
  bear: S({
    id: "bear", one: "bear", many: "bears", coat: "fur", name: "Brown bear", pl: "Brown bears", latin: "Ursus arctos", home: "forest", diet: "both", eats: ["salmon", "elk", "beaver"], size: 1.7, speed: 0.15, meta: 1,
    lo: -30, hi: 24, tol: 6, hunted: true, col: "#B07D58",
    look: L("quad", "#8A5E40", "#5E3E2A", { bw: 1.05, bh: 0.68, head: 0.44, hx: 1.0, hy: -0.2, snout: 0.25, ears: "round", tail: "stub", leg: 0.6 }),
    where: "Forests and mountains of North America, Europe and Asia", social: "Mostly alone. Mothers keep their cubs for two to three years.",
    food: "Berries, roots, salmon, sometimes elk calves", life: "20–25 years", role: "Carries salmon from rivers into the forest, feeding the trees.",
  }),
  beaver: S({
    id: "beaver", one: "beaver", many: "beavers", coat: "fur", name: "Beaver", pl: "Beavers", latin: "Castor canadensis", home: "forest", diet: "plants", eats: [], size: 0.7, speed: 0.07, meta: 0,
    lo: -25, hi: 24, tol: 6, hunted: true, col: "#C4875A",
    look: L("quad", "#9E6A43", "#3E2C22", { bw: 0.95, bh: 0.6, head: 0.4, hx: 0.9, hy: -0.15, snout: 0.15, ears: "round", tail: "flat", leg: 0.3 }),
    where: "Rivers and lakes of North America and Europe", social: "Families of a mother, a father and their young share one lodge.",
    food: "Bark, twigs and water plants", life: "10–12 years", role: "Builds dams that make ponds, a home for fish, frogs and birds.",
  }),

  // ── Savanna
  lion: S({
    id: "lion", one: "lion", many: "lions", coat: "fur", name: "Lion", pl: "Lions", latin: "Panthera leo", home: "savanna", diet: "meat", eats: ["zebra", "gazelle", "elephant", "elk"], size: 1.4, pack: true, speed: 0.18, meta: 1,
    lo: 10, hi: 40, tol: 5, hunted: true, col: "#E6B66E",
    look: L("quad", "#D4A35E", "#8A5A2E", { bh: 0.52, head: 0.46, hx: 1.05, hy: -0.4, snout: 0.18, ears: "round", mane: true, tail: "tuft", leg: 0.75 }),
    where: "Savannas of Africa, and one forest in India", social: "Prides of related females with 1–3 males. The females hunt together.",
    food: "Zebras, wildebeest, buffalo, gazelles", life: "10–14 years", role: "Keeps grazing herds healthy and on the move.",
  }),
  zebra: S({
    id: "zebra", one: "zebra", many: "zebras", coat: "fur", name: "Zebra", pl: "Zebras", latin: "Equus quagga", home: "savanna", diet: "plants", eats: [], size: 1.4, speed: 0.12, meta: 0,
    lo: 12, hi: 40, tol: 5, hunted: true, col: "#E8E2D6",
    look: L("quad", "#E8E2D6", "#2A2622", { pattern: "stripes", bw: 1.0, bh: 0.52, head: 0.32, hx: 1.1, hy: -0.7, snout: 0.38, ears: "point", mane: false, tail: "tuft", leg: 0.95 }),
    where: "Grasslands of eastern and southern Africa", social: "Families of one stallion, several mares and foals; families join into big herds.",
    food: "Tough, tall grass", life: "20–25 years", role: "Eats the tall grass first, opening the way for gazelles.",
  }),
  elephant: S({
    id: "elephant", one: "elephant", many: "elephants", coat: "body fat", name: "African elephant", pl: "Elephants", latin: "Loxodonta africana", home: "savanna", diet: "plants", eats: [], size: 2.6, speed: 0.08, meta: 0,
    lo: 10, hi: 40, tol: 4, hunted: true, col: "#B4AEA7",
    look: L("elephant", "#9D9893", "#7D7873", { bw: 1.0, bh: 0.7, head: 0.5, hx: 0.95, hy: -0.35, snout: 0.9, ears: "big", tail: "thin", leg: 0.6 }),
    where: "Savannas and forests of Africa", social: "Herds of related females led by the oldest, the matriarch. Males leave at about 13.",
    food: "Grass, bark and fruit: about 150 kg a day", life: "60–70 years", role: "Opens up woodland, digs water holes and spreads seeds.",
  }),
  cheetah: S({
    id: "cheetah", one: "cheetah", many: "cheetahs", coat: "fur", name: "Cheetah", pl: "Cheetahs", latin: "Acinonyx jubatus", home: "savanna", diet: "meat", eats: ["gazelle", "rabbit", "meerkat"], size: 1, speed: 0.26, meta: 1,
    lo: 12, hi: 40, tol: 5, hunted: false, col: "#F2D16E",
    look: L("quad", "#E4BE5E", "#3A2C1C", { pattern: "spots", bw: 1.05, bh: 0.42, head: 0.36, hx: 1.1, hy: -0.4, snout: 0.15, ears: "round", tail: "thin", leg: 0.95 }),
    where: "Open grasslands of Africa, a few in Iran", social: "Mothers raise cubs alone; brothers often stay together for life.",
    food: "Gazelles and hares", life: "10–12 years", role: "The fastest runner on land: up to 110 km/h, but only for a short sprint.",
  }),
  gazelle: S({
    id: "gazelle", one: "gazelle", many: "gazelles", coat: "fur", name: "Gazelle", pl: "Gazelles", latin: "Eudorcas thomsonii (Thomson's gazelle)", home: "savanna", diet: "plants", eats: [], size: 0.85, speed: 0.15, meta: 0,
    lo: 12, hi: 40, tol: 5, hunted: true, col: "#CF8C58",
    look: L("quad", "#C2834F", "#F1E6D6", { pattern: "belly", bw: 0.9, bh: 0.45, head: 0.3, hx: 1.05, hy: -0.65, snout: 0.3, ears: "point", horns: "spike", tail: "stub", leg: 1.05 }),
    where: "Grasslands of Kenya and Tanzania", social: "Herds of females and young; males guard small patches of land.",
    food: "Short, fresh grass", life: "10–15 years", role: "Food for cheetahs, lions and hyenas; can run a zig-zag at 80 km/h.",
  }),

  // ── Desert
  meerkat: S({
    id: "meerkat", one: "meerkat", many: "meerkats", coat: "fur", name: "Meerkat", pl: "Meerkats", latin: "Suricata suricatta", home: "desert", diet: "both", eats: ["scorpion"], size: 0.45, speed: 0.1, meta: 0,
    lo: 5, hi: 42, tol: 4, hunted: false, col: "#DDBF90",
    look: L("upright", "#C9A779", "#5A4632", { pattern: "mask", bw: 0.5, bh: 0.95, head: 0.42, hx: 0.1, hy: -1.15, snout: 0.25, ears: "round", tail: "thin", leg: 0.35 }),
    where: "Kalahari and Namib deserts, southern Africa", social: "Mobs of 20–50 led by one breeding pair; others babysit and take turns as lookouts.",
    food: "Beetles, scorpions, small lizards", life: "6–10 years", role: "Eats huge numbers of insects; food for jackals and eagles.",
  }),
  jackal: S({
    id: "jackal", one: "jackal", many: "jackals", coat: "fur", name: "Black-backed jackal", pl: "Jackals", latin: "Lupulella mesomelas", home: "desert", diet: "meat", eats: ["meerkat", "rabbit", "gazelle"], size: 0.75, speed: 0.18, meta: 1,
    lo: 0, hi: 42, tol: 6, hunted: true, col: "#CF9363",
    look: L("quad", "#C08155", "#3B3330", { pattern: "patch", bh: 0.48, snout: 0.45, ears: "big", tail: "bushy", leg: 0.8 }),
    where: "Dry grassland and desert edges of southern and eastern Africa", social: "Pairs for life; last year's pups help raise the new litter.",
    food: "Small mammals, birds, insects", life: "8–9 years", role: "Hunts small animals and cleans up what others leave.",
  }),
  scorpion: S({
    id: "scorpion", one: "scorpion", many: "scorpions", coat: "body fat", name: "Scorpion", pl: "Scorpions", latin: "Parabuthus", home: "desert", diet: "plants", eats: [], guard: 0.35, size: 0.35, speed: 0.06, meta: 0,
    lo: 10, hi: 46, tol: 6, hunted: false, col: "#E6D27A",
    look: L("scorpion", "#D7BE5E", "#8E7A30", { bw: 0.75, bh: 0.35, head: 0.3, leg: 0.45, tail: "sting" }),
    where: "Deserts and dry lands on every continent except Antarctica", social: "Alone. Mothers carry their babies on their back.",
    food: "Beetles, crickets and spiders", life: "3–8 years", role: "Hunts insects at night; meerkats are immune to many of their stings.",
  }),

  // ── Ocean & ice
  orca: S({
    id: "orca", one: "orca", many: "orcas", coat: "blubber", name: "Orca", pl: "Orcas", latin: "Orcinus orca", home: "ocean", diet: "meat", eats: ["seal", "lseal", "salmon", "penguin"], size: 2.4, pack: true, speed: 0.2, meta: 1,
    lo: -25, hi: 22, tol: 5, hunted: false, col: "#93A6CC",
    look: L("orca", "#22252D", "#ECE8E0", { bw: 1.25, bh: 0.42, tail: "fin" }),
    where: "Every ocean, most common in cold water", social: "Pods led by grandmothers. Each pod has its own calls and hunting tricks.",
    food: "Fish or seals, depending on the pod", life: "50–90 years", role: "Top hunter of the sea, shaping seal and fish numbers.",
  }),
  seal: S({
    id: "seal", one: "seal", many: "seals", coat: "blubber", name: "Harbour seal", pl: "Seals", latin: "Phoca vitulina", home: "ocean", diet: "both", eats: ["salmon"], size: 1.1, speed: 0.15, meta: 1,
    lo: -20, hi: 18, tol: 5, hunted: true, col: "#B3A796",
    look: L("seal", "#9D9282", "#6E655A", { pattern: "spots", bw: 1.1, bh: 0.45, head: 0.36, tail: "fin" }),
    where: "Cold coasts of the North Atlantic and North Pacific", social: "Rest together on beaches and rocks, but hunt alone.",
    food: "Fish, squid, shrimp", life: "25–30 years", role: "Eats fish; food for orcas and sharks.",
  }),
  salmon: S({
    id: "salmon", one: "salmon", many: "salmon", coat: "body fat", name: "Atlantic salmon", pl: "Salmon", latin: "Salmo salar", home: "ocean", diet: "plants", eats: [], size: 0.7, speed: 0.13, meta: 0,
    lo: -2, hi: 18, tol: 2.5, hunted: true, col: "#F08A78",
    look: L("fish", "#B9C3C9", "#E07A68", { pattern: "belly", bw: 1.1, bh: 0.34, tail: "fin" }),
    where: "The North Atlantic and the rivers that flow into it", social: "Alone at sea; adults swim back to the river they hatched in to lay eggs.",
    food: "Krill, shrimp and small fish", life: "4–6 years", role: "Carries ocean food far inland; food for bears, seals and birds.",
  }),
  penguin: S({
    id: "penguin", one: "penguin", many: "penguins", coat: "feathers", name: "Emperor penguin", pl: "Emperor penguins", latin: "Aptenodytes forsteri", home: "ice", diet: "plants", eats: [], size: 0.85, speed: 0.08, meta: 0,
    lo: -45, hi: 5, tol: 2, hunted: false, col: "#E8E4DC",
    look: L("penguin", "#2A2D35", "#F2EEE6", { bw: 0.68, bh: 1.0, head: 0.42, leg: 0.15 }),
    where: "Sea ice around Antarctica", social: "Colonies of thousands. Fathers huddle together and keep the egg warm all winter.",
    food: "Fish, krill and squid", life: "15–20 years", role: "Tells scientists how healthy the sea ice is.",
  }),
  lseal: S({
    id: "lseal", one: "leopard seal", many: "leopard seals", coat: "blubber", name: "Leopard seal", pl: "Leopard seals", latin: "Hydrurga leptonyx", home: "ice", diet: "both", eats: ["penguin", "seal", "salmon"], size: 1.3, speed: 0.18, meta: 1,
    lo: -35, hi: 10, tol: 4, hunted: false, col: "#9EAAC0",
    look: L("seal", "#7F8A9C", "#3F4654", { pattern: "spots", bw: 1.25, bh: 0.42, head: 0.42, tail: "fin" }),
    where: "Pack ice around Antarctica", social: "Alone, except mothers with pups.",
    food: "Krill, penguins, fish, other seals", life: "12–26 years", role: "Top hunter on the sea ice, after the orca.",
  }),

  // ── Meadow
  bee: S({
    id: "bee", one: "bee", many: "bees", coat: "fuzz", name: "Honeybee", pl: "Honeybees", latin: "Apis mellifera", home: "meadow", diet: "plants", eats: [], size: 0.25, speed: 0.14, meta: 0,
    lo: 5, hi: 36, tol: 5, hunted: false, col: "#F7D26A",
    look: L("insect", "#E9BC45", "#2E2418", { pattern: "bands", bw: 0.9, bh: 0.55, head: 0.36, leg: 0 }),
    where: "Worldwide, wild and kept by beekeepers", social: "Colonies of 20,000–60,000: one queen and many workers whose job changes with age.",
    food: "Nectar and pollen from flowers", life: "Workers about 6 weeks, the queen 2–5 years", role: "Pollinates about a third of the food people eat.",
  }),
  hornet: S({
    id: "hornet", one: "hornet", many: "hornets", coat: "fuzz", name: "Hornet", pl: "Hornets", latin: "Vespa velutina (Asian hornet)", home: "meadow", diet: "both", eats: ["bee"], size: 0.4, speed: 0.2, meta: 1,
    lo: 8, hi: 36, tol: 5, hunted: false, col: "#E8925A",
    look: L("insect", "#3A2A20", "#E89A4E", { pattern: "bands", bw: 1.05, bh: 0.48, head: 0.4, leg: 0 }),
    where: "Asia; spread to Europe since 2004", social: "Paper nests of a few thousand, started each spring by one queen.",
    food: "Bees and other insects (for its young), fruit and nectar", life: "Workers a few weeks, queens about a year", role: "Hovers outside beehives and catches bees as they fly home.",
  }),
};

export const SPECIES_IDS = Object.keys(SPECIES);

/** Animals grouped by home habitat, for pickers. */
export const SPECIES_GROUPS: [string, string[]][] = [
  ["Forest and tundra", ["wolf", "elk", "fox", "rabbit", "bear", "beaver"]],
  ["Savanna", ["lion", "zebra", "elephant", "cheetah", "gazelle"]],
  ["Desert", ["meerkat", "jackal", "scorpion"]],
  ["Ocean and ice", ["orca", "seal", "salmon", "penguin", "lseal"]],
  ["Meadow", ["bee", "hornet"]],
];

export const MAX_CAST = 5;
/** The arena is 1 wide and this tall (model units); stage drawing maps it onto the canvas. */
export const ARENA_RATIO = 0.6;
/** Cover patches (bushes, rocks, kelp): prey inside cannot be caught. */
export const COVER: [number, number][] = [[0.12, 0.12], [0.45, 0.08], [0.8, 0.15], [0.25, 0.48], [0.6, 0.4], [0.9, 0.5]];
/** Start-count limits in the cast editor. */
export const startMax = (id: string) => (SPECIES[id].meta ? 40 : 150);

export interface ReadyWorld { name: string; habitat: Habitat; cast: [string, number][] }

/** Ready-made worlds. The cast string format is "id:count,id:count". */
export const READY: Record<string, ReadyWorld> = {
  yellowstone: { name: "Yellowstone", habitat: "forest", cast: [["wolf", 8], ["elk", 60], ["beaver", 20], ["bear", 4]] },
  foxes: { name: "Fox and rabbits", habitat: "forest", cast: [["fox", 8], ["rabbit", 70]] },
  savanna: { name: "Savanna", habitat: "savanna", cast: [["lion", 8], ["zebra", 50], ["elephant", 14], ["gazelle", 50]] },
  kalahari: { name: "Kalahari", habitat: "desert", cast: [["meerkat", 50], ["jackal", 6], ["scorpion", 60]] },
  antarctica: { name: "Antarctica", habitat: "ice", cast: [["penguin", 70], ["lseal", 6], ["orca", 3]] },
  atlantic: { name: "North Atlantic", habitat: "ocean", cast: [["salmon", 80], ["seal", 12], ["orca", 3], ["bear", 3]] },
  meadow: { name: "Meadow", habitat: "meadow", cast: [["bee", 90], ["hornet", 8]] },
};

export const READY_GROUPS: [string, [string, string][]][] = [
  ["Forest and tundra", [["yellowstone", "Yellowstone: wolves, elk, beavers, bears"], ["foxes", "Fox and rabbits"]]],
  ["Savanna and desert", [["savanna", "Savanna: lions, zebras, elephants, gazelles"], ["kalahari", "Kalahari: meerkats, jackals, scorpions"]]],
  ["Ocean and ice", [["antarctica", "Antarctica: penguins, leopard seals, orcas"], ["atlantic", "North Atlantic: salmon, seals, orcas, bears"]]],
  ["Meadow", [["meadow", "Meadow: honeybees and hornets"]]],
];

/** The eight species the scale explorer links to ("animals:wolf") → the ready-made world that features them. */
export const LEGACY: Record<string, string> = {
  wolf: "yellowstone", lion: "savanna", elephant: "savanna", meerkat: "kalahari", penguin: "antarctica", orca: "atlantic", salmon: "atlantic", bee: "meadow",
};

export const castString = (c: [string, number][]) => c.map(([id, n]) => `${id}:${n}`).join(",");

/** Parse "wolf:8,elk:60" (unknown ids dropped, duplicates merged, at most five). */
export function parseCast(s: string | undefined): [string, number][] {
  const out: [string, number][] = [];
  for (const part of (s ?? "").split(",")) {
    const [id, n] = part.split(":");
    if (!SPECIES[id] || out.some(([x]) => x === id)) continue;
    out.push([id, Math.max(0, Math.min(startMax(id), Math.round(Number(n) || 0)))]);
    if (out.length === MAX_CAST) break;
  }
  return out;
}

/** Can `a` catch `b` at all (food web only, before sizes)? */
export const eatsSp = (a: string, b: string) => SPECIES[a].eats.includes(b);
export const eatsPlants = (id: string) => SPECIES[id].diet !== "meat";
