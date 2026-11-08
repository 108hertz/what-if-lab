import { describe, expect, it } from "vitest";
import { SimEngine } from "@/lib/sim/engine";
import { defaultParams } from "@/lib/sim/core";
import { animals, caption, story, traits, type P, type W } from "@/worlds/animals/sim";
import { LEGACY, MAX_CAST, READY, SPECIES, SPECIES_GROUPS, SPECIES_IDS, castString, parseCast } from "@/worlds/animals/data";
import { SCALE_OBJECTS } from "@/lib/scale/objects";

const FRAME = 1 / 60;
const run = (e: SimEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(FRAME); };
const engine = (over: Partial<P> = {}) => {
  const e = new SimEngine(animals, defaultParams(animals));
  for (const [k, v] of Object.entries(over)) e.setParam(k, v as string | number);
  e.restart();
  return e;
};
/** Step a world directly by whole days (fast path for long runs). */
const days = (w: W, p: P, n: number) => { for (let d = 0; d < n; d++) animals.step(w, 1, p); };
const finite = (r: Record<string, number | null>) => Object.entries(r).every(([, v]) => v == null || Number.isFinite(v));

describe("animals: the cast (change 0017)", () => {
  it("has 16–21 species, each in exactly one picker group", () => {
    expect(SPECIES_IDS.length).toBeGreaterThanOrEqual(16);
    expect(SPECIES_IDS.length).toBeLessThanOrEqual(21);
    const grouped = SPECIES_GROUPS.flatMap(([, ids]) => ids);
    expect([...grouped].sort()).toEqual([...SPECIES_IDS].sort());
  });

  it.each(SPECIES_IDS)("%s has something to eat, and the food web is complete", (id) => {
    const s = SPECIES[id];
    for (const e of s.eats) expect(SPECIES[e], `${id} eats ${e}`).toBeDefined();
    expect(s.diet !== "meat" || s.eats.length >= 2, `${id}: meat-eaters need two prey`).toBe(true);
    expect(s.diet !== "plants" || s.eats.length === 0).toBe(true);
    if (s.diet === "plants") expect(SPECIES_IDS.some((h) => SPECIES[h].eats.includes(id)), `${id} is nobody's prey`).toBe(true);
    for (const k of ["name", "where", "social", "food", "life", "role"] as const) expect(s[k].length, `${id}.${k}`).toBeGreaterThan(2);
  });

  it("keeps the eight old scale-explorer ids", () => {
    for (const o of SCALE_OBJECTS) {
      if (!o.sandbox?.startsWith("animals:")) continue;
      const id = o.sandbox.split(":")[1];
      expect(LEGACY[id], id).toBeDefined();
      expect(SPECIES[id], id).toBeDefined();
    }
    expect(Object.keys(LEGACY)).toHaveLength(8);
  });

  it("parses casts safely (unknown ids, duplicates, limits, at most five)", () => {
    expect(parseCast("wolf:8,elk:60")).toEqual([["wolf", 8], ["elk", 60]]);
    expect(parseCast("nope:3,wolf:999,wolf:2")).toEqual([["wolf", 40]]);
    expect(parseCast(SPECIES_IDS.map((id) => `${id}:5`).join(","))).toHaveLength(MAX_CAST);
  });

  it.each(Object.keys(READY))("ready-made world %s starts with finite readouts and its cast", (wk) => {
    const e = engine({ world: wk });
    expect((e.base as W).cast).toEqual(READY[wk].cast.map(([id]) => id));
    expect((e.base as W).habit).toBe(READY[wk].habitat);
    run(e, 60);
    expect(finite(e.readouts().base)).toBe(true);
  });

  it.each(Object.keys(LEGACY))("old preset species=%s opens the world that features it", (id) => {
    const e = engine({ species: id });
    expect(e.params.world).toBe(LEGACY[id]);
    expect((e.base as W).cast).toContain(id);
    run(e, 30);
    expect(finite(e.readouts().base)).toBe(true);
  });

  it("editing the cast makes it your own world, based on the ready-made one", () => {
    const e = engine({ world: "savanna" });
    e.setParam("cast", castString([["lion", 6], ["zebra", 40], ["cheetah", 4]]));
    expect(e.params.world).toBe("custom");
    expect(e.params.from).toBe("savanna");
    expect(e.params.species).toBeUndefined();
    e.restart();
    expect((e.base as W).cast).toEqual(["lion", "zebra", "cheetah"]);
  });
});

describe("animals: the model", () => {
  it("Yellowstone hunters and prey coexist for ~600 days", () => {
    const e = engine();
    e.speedIdx = 3;
    run(e, 60 * 20);
    const r = e.readouts().base;
    expect(r.n0!, "wolves").toBeGreaterThan(0);
    expect(r.n1!, "elk").toBeGreaterThan(0);
  });

  it("all changes stacked on Savanna for 600 days stay bounded", () => {
    const e = engine({ world: "savanna" });
    run(e, 30);
    for (const [id] of animals.whatifs) e.change(id);
    const w = e.alt as W, p = e.params as P;
    days(w, p, 600);
    expect(finite(animals.read(w, p))).toBe(true);
    expect(w.c.length).toBeLessThanOrEqual(600);
    expect(w.food.length / 2).toBeLessThanOrEqual(700);
    expect(w.cast.length).toBeLessThanOrEqual(MAX_CAST);
  });

  it("warming thins coats over generations", () => {
    const e = engine({ world: "foxes" });
    run(e, 30);
    e.change("warm"); e.change("warm");
    const p = e.params as P;
    days(e.base as W, p, 600); days(e.alt as W, p, 600);
    const b = traits(e.base as W, 1)!, a = traits(e.alt as W, 1)!;
    expect(a.co).toBeLessThan(b.co - 0.05);
  });

  it("a cast with a cheetah breeds faster gazelles than one without", () => {
    const at = (cast: [string, number][]) => {
      const p = { ...defaultParams(animals), cast: castString(cast), habitat: "savanna" } as P;
      const w = animals.init(p, 11);
      days(w, p, 600);
      return traits(w, w.cast.indexOf("gazelle"))!.sp;
    };
    expect(at([["gazelle", 60], ["zebra", 40], ["cheetah", 6]])).toBeGreaterThan(at([["gazelle", 60], ["zebra", 40]]));
  });

  it("removing the hunters lets their prey multiply (compared with no change)", () => {
    const e = engine();
    e.setParam("target", "wolf");
    run(e, 30);
    e.change("remove"); e.setParam("target", "bear"); e.change("remove");
    const p = e.params as P;
    days(e.base as W, p, 200); days(e.alt as W, p, 200);
    const { base, alt } = { base: animals.read(e.base as W, p), alt: animals.read(e.alt as W, p) };
    expect(alt.n0).toBe(0);
    expect(alt.n1!).toBeGreaterThan(base.n1!);
  });

  it("a newcomer joins the cast, and there is never a sixth kind", () => {
    const e = engine();
    e.setParam("newcomer", "cheetah");
    e.change("add");
    expect((e.alt as W).cast).toEqual(["wolf", "elk", "beaver", "bear", "cheetah"]);
    expect(animals.read(e.alt as W, e.params as P).n4).toBe(12);
    e.setParam("newcomer", "lion");
    e.change("add");
    expect((e.alt as W).cast).toHaveLength(5);
    expect(animals.read(e.base as W, e.params as P).n4).toBeNull();
  });

  it("a hunted animal falls; a reserve stops hunting and grows food", () => {
    const e = engine({ world: "foxes" });
    e.setParam("target", "rabbit");
    run(e, 30);
    e.change("hunt"); e.change("hunt"); e.change("hunt");
    const p = e.params as P;
    days(e.base as W, p, 150); days(e.alt as W, p, 150);
    expect(animals.read(e.alt as W, p).n1!).toBeLessThan(animals.read(e.base as W, p).n1!);
  });

  it("is deterministic with changes at the same times", () => {
    const go = () => { const e = engine({ world: "kalahari" }); run(e, 40); e.change("drought"); run(e, 20); e.change("fire"); run(e, 80); return e.readouts(); };
    expect(go()).toEqual(go());
  });

  it("the world stays plain data (structuredClone keeps every field)", () => {
    const e = engine();
    run(e, 30);
    e.change("fire");
    const c = structuredClone(e.alt) as W;
    expect(c).toEqual(e.alt);
  });
});

describe("animals: words", () => {
  it("the story is 3–5 plain sentences, never a prediction", () => {
    const e = engine();
    run(e, 120); // 6 days at the default 3 d/s
    const plain = story({ b: e.base as W, a: null, p: e.params as P });
    expect(plain.length).toBeGreaterThanOrEqual(3);
    expect(plain.length).toBeLessThanOrEqual(5);
    expect(plain[0]).toMatch(/^Day \d+: .* live here\.$/);
    e.setParam("target", "wolf");
    e.change("remove");
    days(e.base as W, e.params as P, 150); days(e.alt as W, e.params as P, 150);
    const changed = story({ b: e.base as W, a: e.alt as W, p: e.params as P });
    expect(changed[0]).toContain("Compared with the same place with no change");
    expect(changed.length).toBeGreaterThanOrEqual(3);
    expect(changed.length).toBeLessThanOrEqual(5);
    for (const l of [...plain, ...changed]) expect(l).not.toMatch(/\bwill\b/i);
    expect(changed.join(" ")).toMatch(/elk/);
  });

  it("the portrait caption names what changed", () => {
    expect(caption("wolf", { sp: 1.18, sz: 1, se: 1.2, co: 0.8 })).toBe("Now 18% faster, ears bigger (notices more) and fur thinner.");
    expect(caption("salmon", { sp: 1, sz: 1, se: 1, co: 1 })).toContain("About the same");
    expect(caption("orca", null)).toContain("No orcas");
  });

  it("change questions name the chosen animal", () => {
    const e = engine();
    e.setParam("target", "elk");
    const label = (id: string) => animals.whatifs.find(([x]) => x === id)![1];
    expect(label("remove")).toBeTruthy();
    expect(e.labelOf("remove")).toBe(label("remove"));
  });
});
