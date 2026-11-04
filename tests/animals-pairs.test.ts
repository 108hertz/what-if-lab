import { describe, expect, it } from "vitest";
import { defaultParams } from "@/lib/sim/core";
import { animals, type P } from "@/worlds/animals/sim";
import { SPECIES, SPECIES_IDS, castString } from "@/worlds/animals/data";

/** Change 0017: any combination of animals must run, even nonsense ones (they may simply die out). Own file so it runs in parallel. */
const finite = (r: Record<string, number | null>) => Object.values(r).every((v) => v == null || Number.isFinite(v));
const days = (w: Parameters<typeof animals.step>[0], p: P, n: number) => { for (let d = 0; d < n; d++) animals.step(w, 1, p); };

describe("animals: every pair of species", () => {
  const pairs = SPECIES_IDS.flatMap((a) => SPECIES_IDS.filter((b) => b > a).map((b) => [a, b] as const));
  it.each(pairs)("%s + %s runs 300 days with finite readouts", (a, b) => {
    const p = { ...defaultParams(animals), cast: castString([[a, SPECIES[a].meta ? 4 : 20], [b, SPECIES[b].meta ? 4 : 20]]), habitat: SPECIES[a].home, hab: 30 } as P;
    const w = animals.init(p, 7);
    days(w, p, 300);
    expect(finite(animals.read(w, p)), `${a}+${b}`).toBe(true);
    expect(w.c.length).toBeLessThanOrEqual(600);
  });
});
