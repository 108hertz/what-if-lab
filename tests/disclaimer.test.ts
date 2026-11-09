import { describe, expect, it } from "vitest";
import { DISCLAIMER_KEY, disclaimerSeen, markDisclaimerSeen, safeStore } from "@/components/shell/disclaimerRule";
import { EN_SHARED } from "@/lib/i18n/english";

/** Change 0028: the simulation note shows once per browser; broken storage just means "show again". */
const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as unknown as Storage; };

describe("simulation disclaimer", () => {
  it("is unseen on a fresh browser and seen after closing", () => {
    const s = safeStore(() => mem());
    const store = safeStore(((st) => () => st)(mem()));
    expect(disclaimerSeen(s)).toBe(false);
    markDisclaimerSeen(store);
    expect(disclaimerSeen(store)).toBe(true);
    expect(store.get(DISCLAIMER_KEY)).toBe("1");
  });

  it("counts throwing or missing storage as unseen, without throwing", () => {
    const boom = safeStore(() => { throw new Error("blocked"); });
    expect(() => markDisclaimerSeen(boom)).not.toThrow();
    expect(disclaimerSeen(boom)).toBe(false);
    expect(disclaimerSeen(safeStore(() => undefined))).toBe(false);
  });

  it("has every English word", () => {
    for (const k of ["label", "labelAria", "title", "body", "use", "ok"]) expect(EN_SHARED[`shell.disclaimer.${k}`]).toBeTruthy();
  });
});
