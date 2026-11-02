export interface Species {
  name: string;
  pl: string;
  latin: string;
  where: string;
  social: string;
  diet: string;
  life: string;
  role: string;
  /** Temperature tolerance in °C before energy costs climb sharply. */
  tol: number;
  climate: "cold" | "hot" | "temperate";
  /** 1 = this species is the meat-eater in the sim, 0 = plant-eater. */
  kind: 0 | 1;
  col: string;
  other: { name: string; pl: string; col: string };
}

export const SPECIES: Record<string, Species> = {
  wolf: { name: "Gray wolf", pl: "Gray wolves", latin: "Canis lupus", where: "Forests, tundra and mountains across North America, Europe and Asia", social: 'Packs of 4–9: a breeding pair and their offspring. The "alpha" pair are simply the parents.', diet: "Elk, deer, moose, beaver", life: "6–8 years wild", role: "Keystone predator: keeps deer and elk moving, which lets riverside trees regrow.", tol: 6, climate: "cold", kind: 1, col: "#C3CCDA", other: { name: "Elk", pl: "Elk", col: "#C9A27C" } },
  lion: { name: "Lion", pl: "Lions", latin: "Panthera leo", where: "Savannas of sub-Saharan Africa; Gir forest in India", social: "Prides of related females plus 1–3 males. Females hunt together; males guard territory and are replaced every few years.", diet: "Zebra, wildebeest, buffalo", life: "10–14 years", role: "Apex predator keeping grazing herds healthy and on the move.", tol: 5, climate: "hot", kind: 1, col: "#E2B26B", other: { name: "Zebra", pl: "Zebras", col: "#ECECEC" } },
  orca: { name: "Orca", pl: "Orcas", latin: "Orcinus orca", where: "All oceans, most common in cold water", social: "Matrilineal pods led by grandmothers. Each pod has its own dialect and hunting traditions.", diet: "Fish or seals, depending on the population", life: "50–90 years", role: "Apex predator shaping seal and fish numbers.", tol: 5, climate: "cold", kind: 1, col: "#93A6CC", other: { name: "Seal", pl: "Seals", col: "#A99D8E" } },
  elephant: { name: "African elephant", pl: "Elephants", latin: "Loxodonta africana", where: "Savannas and forests of sub-Saharan Africa", social: "Herds of related females led by the oldest matriarch. Males leave at about 13.", diet: "Grass, bark, fruit: about 150 kg a day", life: "60–70 years", role: "Ecosystem engineer: opens woodland, digs water holes, spreads seeds.", tol: 4, climate: "hot", kind: 0, col: "#B0AAA3", other: { name: "Lion", pl: "Lions", col: "#E2B26B" } },
  meerkat: { name: "Meerkat", pl: "Meerkats", latin: "Suricata suricatta", where: "Kalahari and Namib deserts, southern Africa", social: "Mobs of 20–50 led by a dominant breeding pair; others babysit and take turns as sentinels.", diet: "Insects, scorpions, small lizards", life: "6–10 years", role: "Controls insects; food for eagles and jackals.", tol: 4, climate: "hot", kind: 0, col: "#D8B98A", other: { name: "Jackal", pl: "Jackals", col: "#C98B5A" } },
  penguin: { name: "Emperor penguin", pl: "Emperor penguins", latin: "Aptenodytes forsteri", where: "Sea ice around Antarctica", social: "Colonies of thousands with no hierarchy. Males huddle and incubate the egg through winter.", diet: "Fish, krill, squid", life: "15–20 years", role: "Indicator species for Antarctic sea ice.", tol: 2, climate: "cold", kind: 0, col: "#F0F0F0", other: { name: "Leopard seal", pl: "Leopard seals", col: "#8E9BB0" } },
  salmon: { name: "Atlantic salmon", pl: "Salmon", latin: "Salmo salar", where: "North Atlantic and its rivers", social: "Solitary at sea; adults return to the exact river they hatched in to spawn.", diet: "Insects as young, then fish and shrimp", life: "4–6 years", role: "Carries ocean nutrients inland; food for bears, seals and birds.", tol: 2.5, climate: "cold", kind: 0, col: "#F08A78", other: { name: "Bear", pl: "Bears", col: "#9A6A4C" } },
  bee: { name: "Honeybee", pl: "Honeybees", latin: "Apis mellifera", where: "Worldwide, wild and kept", social: "Colonies of 20,000–60,000: one queen, female workers whose job changes with age.", diet: "Nectar and pollen", life: "Workers ~6 weeks, queen 2–5 years", role: "Pollinates about a third of the crops people eat.", tol: 5, climate: "temperate", kind: 0, col: "#F7D26A", other: { name: "Hornet", pl: "Hornets", col: "#E0884A" } },
};
