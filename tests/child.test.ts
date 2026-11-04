import { describe, expect, it } from "vitest";
import { SimEngine } from "@/lib/sim/engine";
import { defaultParams } from "@/lib/sim/core";
import { averages, child, compare, kidLine, story, values, why, type P, type W } from "@/worlds/child/sim";
import { CHANGES, CHANGE_GROUPS, CHANGE_IDS, FAMILIES, FAMILY_IDS, TRAITS } from "@/worlds/child/data";

const FRAME = 1 / 60;
const params = (over: Partial<P> = {}) => {
  let p = defaultParams(child) as P;
  for (const [k, v] of Object.entries(over)) { p = { ...p, [k]: v } as P; p = child.onParamChange!(p, k); }
  return p;
};
/** Step a world to an age (fast path). */
const to = (w: W, p: P, age: number) => { while (w.t < age - 1e-9) child.step(w, Math.min(0.5, age - w.t), p); };
const finite = (r: Record<string, number | null>) => Object.entries(r).every(([, v]) => v == null || Number.isFinite(v));
const inRange = (w: W) => values(w).every((xs) => xs.every((x) => x >= 1 && x <= 99));

describe("child: data (change 0018)", () => {
  it("has ~20 changes, each in exactly one group, with kid-safe words", () => {
    expect(CHANGE_IDS.length).toBe(20);
    expect(new Set(CHANGE_IDS).size).toBe(20);
    expect(child.whatifs.map(([id]) => id)).toEqual(CHANGE_IDS);
    for (const id of CHANGE_IDS) {
      const c = CHANGES[id];
      expect(c.q.startsWith("What if"), id).toBe(true);
      for (const txt of [c.q, c.txt, c.past, c.cap]) expect(txt).not.toMatch(/\b(abuse|death|die|drug|violence|kill)/i);
      for (const k of TRAITS) expect(Math.abs(c.d[k] ?? 0), `${id}.${k}`).toBeLessThanOrEqual(6);
    }
    expect(CHANGE_GROUPS.length).toBe(4);
  });

  it("keeps the eight old what-if ids", () => {
    for (const id of ["authoritative", "sibling", "sport", "screen", "divorce", "move", "mentor", "bullied"]) expect(CHANGE_IDS).toContain(id);
  });
});

describe("child: model", () => {
  it.each(FAMILY_IDS)("%s: every change at 8 runs to 60 with finite readouts in 1–99", (fam) => {
    const p = params({ family: fam });
    const w0 = child.init(p, 7);
    to(w0, p, 8);
    for (const id of CHANGE_IDS) {
      const w = structuredClone(w0);
      child.apply(w, id, p, { drag: null, cams: [null, null], pending: null });
      to(w, p, 60);
      expect(finite(child.read(w, p)), `${fam}/${id}`).toBe(true);
      expect(inRange(w), `${fam}/${id}`).toBe(true);
    }
  });

  it("all changes stacked stay in 1–99 and move averages by at most ~15 points", () => {
    const p = params();
    const b = child.init(p, 3);
    to(b, p, 4);
    const a = structuredClone(b);
    for (const id of CHANGE_IDS) child.apply(a, id, p, { drag: null, cams: [null, null], pending: null });
    for (const age of [6, 12, 18, 30, 60]) {
      to(a, p, age); to(b, p, age);
      expect(inRange(a)).toBe(true);
      const A = averages(a), B = averages(b);
      for (let i = 0; i < 5; i++) expect(Math.abs(A[i] - B[i]), `age ${age} trait ${i}`).toBeLessThanOrEqual(15);
    }
  });

  it("each change moves the average by no more than ~10 points", () => {
    const p = params({ s_size: "big" });
    const b = child.init(p, 11);
    to(b, p, 6);
    for (const id of CHANGE_IDS) {
      const a = structuredClone(b), bb = structuredClone(b);
      child.apply(a, id, p, { drag: null, cams: [null, null], pending: null });
      to(a, p, 9); to(bb, p, 9);
      const A = averages(a), B = averages(bb);
      for (let i = 0; i < 5; i++) expect(Math.abs(A[i] - B[i]), `${id} trait ${i}`).toBeLessThanOrEqual(10.5);
    }
  });

  it("is deterministic with stacked and scheduled changes", () => {
    const run = () => {
      const e = new SimEngine(child, params(), 42);
      for (let i = 0; i < 120; i++) e.tick(FRAME);
      e.change("sport");
      e.setParam("s_age", "9");
      e.change("bullied");
      e.change("sibling");
      e.speedIdx = 3;
      for (let i = 0; i < 400; i++) e.tick(FRAME);
      return { r: e.readouts(), log: e.timeline().map((x) => x.txt) };
    };
    expect(run()).toEqual(run());
  });

  it("a scheduled change waits for its age, then happens and is noted", () => {
    const p = params({ s_age: "10" });
    const b = child.init(p, 5);
    to(b, p, 3);
    const a = structuredClone(b);
    child.apply(a, "bullied", p, { drag: null, cams: [null, null], pending: null });
    expect(a.mods[0].on).toBe(0);
    expect(a.mods[0].age).toBe(10);
    to(a, p, 9.5); to(b, p, 9.5);
    expect(child.read(a, p)).toEqual(child.read(b, p));
    expect(a.log.some((e) => e.txt === CHANGES.bullied.txt)).toBe(false);
    to(a, p, 11.5); to(b, p, 11.5);
    expect(a.mods[0].on).toBe(1);
    const e = a.log.find((x) => x.txt === CHANGES.bullied.txt);
    expect(e && e.t).toBeGreaterThanOrEqual(10);
    expect((child.read(a, p).Calm ?? 0)).toBeLessThan(child.read(b, p).Calm ?? 0);
  });

  it("a past age means now", () => {
    const p = params({ s_age: "3" });
    const w = child.init(p, 5);
    to(w, p, 6);
    child.apply(w, "sport", p, { drag: null, cams: [null, null], pending: null });
    expect(w.mods[0].on).toBe(1);
    expect(w.mods[0].age).toBeCloseTo(6, 5);
  });

  it("old params still work", () => {
    for (const over of [{ sib: "0" }, { sib: "1" }, { sib: "2" }, { home: "unstable" }, { home: "stable" }, { style: "neglectful" }, { style: "permissive" }, { aO: 90, bN: 10 }]) {
      const e = new SimEngine(child, params(over as Partial<P>));
      for (let i = 0; i < 120; i++) e.tick(FRAME);
      expect(finite(e.readouts().base), JSON.stringify(over)).toBe(true);
    }
  });

  it("ready-made families set the parents; editing one switches to your own family", () => {
    let p = params({ family: "lively" });
    expect(p.aE).toBe(FAMILIES.lively.a[2]);
    p = child.onParamChange!({ ...p, aE: 10 }, "aE");
    expect(p.family).toBe("custom");
    expect(p.from).toBe("lively");
  });

  it("nature-vs-nurture shares sum to 100 % and 'inherited: high' raises the genes share", () => {
    const shares = (inherit: string) => {
      const p = params({ inherit });
      const w = child.init(p, 9);
      to(w, p, 25);
      return why(w);
    };
    const lo = shares("25"), hi = shares("55");
    for (const r of [...lo, ...hi]) expect(r.genes + r.home + r.life + r.chance).toBeCloseTo(100, 6);
    const g = (xs: typeof lo) => xs.reduce((s, r) => s + r.genes, 0) / xs.length;
    expect(g(hi)).toBeGreaterThan(g(lo) + 10);
  });

  it("everyday ups and downs off ⇒ none counted", () => {
    const p = params({ events: "off" });
    const w = child.init(p, 2);
    to(w, p, 40);
    expect(w.k.every((k) => k.em === 0)).toBe(true);
    expect(w.log.some((e) => e.txt.startsWith("By "))).toBe(false);
    const q = params();
    const v = child.init(q, 2);
    to(v, q, 40);
    expect(v.log.filter((e) => e.txt.startsWith("By ")).length).toBeGreaterThan(0);
  });

  it("milestones are noted once each", () => {
    const p = params();
    const w = child.init(p, 2);
    to(w, p, 60);
    for (const txt of ["Starts school", "Finishes school"]) expect(w.log.filter((e) => e.txt === txt).length).toBe(1);
  });
});

describe("child: words", () => {
  it("story says 3–5 plain sentences, no advice or predictions", () => {
    const p = params();
    const b = child.init(p, 4);
    to(b, p, 6);
    const a = structuredClone(b);
    child.apply(a, "sibling", p, { drag: null, cams: [null, null], pending: null });
    child.apply(a, "bullied", p, { drag: null, cams: [null, null], pending: null });
    to(a, p, 20); to(b, p, 20);
    for (const lines of [story({ b, a: null, p }), story({ b, a, p })]) {
      expect(lines.length).toBeGreaterThanOrEqual(3);
      expect(lines.length).toBeLessThanOrEqual(5);
      for (const l of lines) expect(l).not.toMatch(/\b(will|should|must)\b/i);
    }
    expect(story({ b, a, p }).join(" ")).toMatch(/little brother or sister/);
    expect(compare(a, b).up.length + compare(a, b).same.length).toBe(5);
    expect(kidLine(0, 12, [80, 50, 75, 50, 30])).toMatch(/^\w+, 12: /);
  });
});
