import { afterEach, describe, expect, it } from "vitest";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { eventText } from "@/lib/sim/say";
import { argNames, createT } from "@/lib/i18n";
import { setPageT } from "@/lib/i18n/page";
import type { LogEntry } from "@/lib/sim/types";

/** Change 0025, step 4: sims log keys, never sentences; every key has English words. */
const FRAME = 1 / 60;
const run = (e: SimEngine, n: number) => { for (let i = 0; i < n; i++) e.tick(FRAME); };

afterEach(() => setPageT(createT({ locale: "en", messages: {} })));

/** Every event of a run through every what-if (stacked), both worlds. */
function events(key: (typeof SANDBOX_KEYS)[number]): LogEntry[] {
  const sb = SANDBOXES[key];
  const e = new SimEngine(sb, defaultParams(sb), 7);
  run(e, 240);
  for (const [id] of sb.whatifs) { e.change(id); run(e, 240); }
  return [...e.base.log, ...(e.alt?.log ?? [])];
}

describe.each(SANDBOX_KEYS)("%s events", (key) => {
  const sb = SANDBOXES[key];

  it("every message parses", () => {
    for (const [k, v] of Object.entries(sb.messages)) expect(() => argNames(v), `${key}.${k}`).not.toThrow();
  });

  it("logs only keys that have English words, with every value filled", () => {
    const evs = events(key);
    expect(evs.length, "some events happen").toBeGreaterThan(0);
    for (const e of evs) {
      expect(sb.messages, `${key}: ${e.k}`).toHaveProperty([e.k]);
      const txt = eventText(sb, e);
      expect(txt, `${key}: ${e.k}`).not.toMatch(/[{}]/);
      expect(txt.startsWith(`${key}.`), `${key}: ${e.k} → ${txt}`).toBe(false);
    }
  });

  it("gives the same results in every language", () => {
    const en = events(key);
    setPageT(createT({ locale: "de", messages: { [`${key}.${en[0].k}`]: "Übersetzt" } }));
    expect(events(key)).toEqual(en);
    expect(eventText(sb, en[0])).toBe("Übersetzt");
  });
});
