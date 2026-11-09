import { describe, expect, it } from "vitest";
import { fitTabs } from "@/components/shell/WorldMenu";

const w = [80, 100, 90, 120, 70];
const more = 60;

describe("fitTabs (change 0029)", () => {
  it("shows everything when it all fits", () => {
    expect(fitTabs(w, more, 1000, 0)).toEqual([0, 1, 2, 3, 4]);
  });
  it("keeps tabs in order and leaves room for More", () => {
    // 80+2+100+2+90 = 274, + 2 + 60 = 336
    expect(fitTabs(w, more, 340, 0)).toEqual([0, 1, 2]);
  });
  it("keeps the current world when it would overflow", () => {
    const s = fitTabs(w, more, 340, 4);
    expect(s).toContain(4);
    expect(s[s.length - 1]).toBe(4);
    expect(s).toEqual([0, 1, 4]);
  });
  it("drops extra tabs when the current one is wider", () => {
    expect(fitTabs(w, more, 270, 3)).toEqual([0, 3]); // 80+2+120+2+60 = 264
    expect(fitTabs(w, more, 250, 3)).toEqual([3]);
  });
  it("always shows at least the current world", () => {
    expect(fitTabs(w, more, 10, 2)).toEqual([2]);
  });
});
