import { beforeAll, describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { defaultParams } from "@/lib/sim/core";
import { MAX_STEPS, answerClock, answerIds, answerWords, computeAnswer, type Answer } from "@/lib/seo/answer";

/**
 * Change 0033, step 5: every what-if page's answer is computed by running the world. Each answer has finite numbers,
 * reads where the two worlds split, and is the same every time it is computed (so every build gives the same page).
 */
for (const k of SANDBOX_KEYS) {
  const sb = SANDBOXES[k];
  const ids = answerIds(sb);
  const answers = new Map<string, Answer>();
  const ms: number[] = [];

  describe(`${k} answers`, () => {
    beforeAll(() => {
      for (const id of ids) {
        const t = performance.now();
        answers.set(id, computeAnswer(sb, id));
        ms.push(performance.now() - t);
      }
    }, 120_000);

    it("has a setup that fits the world", () => {
      const s = sb.answer!;
      expect(s, "worlds with what-if pages need an `answer` setup").toBeTruthy();
      const keys = new Set(sb.metrics.map((m) => m.k));
      const { fork, dt } = answerClock(sb, sb.init(defaultParams(sb), 1).t);
      expect(dt).toBeGreaterThan(0);
      s.at.forEach((t, i) => expect(t).toBeGreaterThan(i ? s.at[i - 1] : fork));
      if (sb.maxT != null) expect(s.at[s.at.length - 1]).toBeLessThanOrEqual(sb.maxT);
      if (s.shot != null) { expect(s.shot).toBeGreaterThan(fork); expect(s.shot).toBeLessThanOrEqual(s.at[s.at.length - 1]); }
      for (const m of [...(s.metrics ?? []), ...(s.key ?? [])]) expect(keys.has(m), m).toBe(true);
    });

    it.each(ids)("%s: finite numbers where the worlds split", (id) => {
      const a = answers.get(id)!;
      expect(a.at.map((p) => Math.round(p.t * 1e6) / 1e6)).toEqual(sb.answer!.at);
      expect(a.metrics.length).toBeGreaterThan(0);
      expect(a.metrics).toContain(a.key);
      for (const p of a.at)
        for (const m of a.metrics) {
          for (const v of [p.base[m], p.alt[m]]) if (v != null) expect(Number.isFinite(v), `${m} at ${p.t}`).toBe(true);
        }
      const end = a.at[a.at.length - 1];
      expect(end.base[a.key]).not.toBeNull();
      expect(end.alt[a.key]).not.toBeNull();
      // The page has something to say: a number differs at some time, or a line only the changed world has
      const differs = a.at.some((p) => a.metrics.some((m) => p.base[m] !== p.alt[m]));
      expect(differs || a.events.some((e) => e.who === "alt")).toBe(true);
      expect(a.events.length).toBeLessThanOrEqual(MAX_STEPS);
      expect(a.events.every((e) => e.who !== "both" && e.t >= a.fork - 1e-9)).toBe(true);
      expect(a.events.map((e) => e.t)).toEqual([...a.events.map((e) => e.t)].sort((x, y) => x - y));
      // The words: the world's own formatters and event lines, nothing left unsaid
      const w = answerWords(sb, a);
      expect(w.times).toHaveLength(a.at.length);
      expect(w.key.alt).not.toBe("—");
      expect(w.key.base).not.toBe("—");
      const text = JSON.stringify(w);
      expect(text).not.toMatch(/\{[a-z]\w*[},]/i);
      expect(text).not.toMatch(/undefined|NaN/);
    });

    it("gives the same answer and words again, after the others ran", () => {
      // The first and last what-if again: no state leaks from one run into the next
      for (const id of new Set([ids[0], ids[ids.length - 1]])) {
        const again = computeAnswer(sb, id);
        expect(again).toEqual(answers.get(id));
        expect(answerWords(sb, again)).toEqual(answerWords(sb, answers.get(id)!));
      }
      const total = ms.reduce((s, x) => s + x, 0);
      console.log(`${k}: ${ids.length} answers in ${Math.round(total)} ms (slowest ${Math.round(Math.max(...ms))} ms)`);
    });
  });
}
