import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { defaultParams } from "@/lib/sim/core";
import { SimEngine } from "@/lib/sim/engine";
import { DEEPLINK_BASELINE_S, whatifFromHash, whatifHash } from "@/lib/sim/deeplink";

/** Change 0033, step 3: `/lab/<world>#whatif=<id>` gives the same world as clicking the what-if after the baseline. */
const FRAME = 1 / 30;
const run = (e: SimEngine, seconds: number) => { for (let i = 0; i < Math.round(seconds / FRAME); i++) e.tick(FRAME); };

describe("#whatif= links", () => {
  it("reads only this world's what-ifs", () => {
    const sb = SANDBOXES.solar;
    expect(whatifFromHash("#whatif=nosun", sb)).toBe("nosun");
    expect(whatifFromHash("whatif=nosun", sb)).toBe("nosun");
    expect(whatifFromHash("#seed=4&whatif=sun2", sb)).toBe("sun2");
    expect(whatifFromHash("#whatif=throw", sb)).toBeNull(); // a drag on the stage, not a button
    expect(whatifFromHash("#whatif=heat", sb)).toBeNull();
    expect(whatifFromHash("#whatif=", sb)).toBeNull();
    expect(whatifFromHash("", sb)).toBeNull();
    expect(whatifFromHash("#nosun", sb)).toBeNull();
  });

  for (const k of SANDBOX_KEYS) {
    const sb = SANDBOXES[k];
    it.each(sb.whatifs.map(([id]) => id))(`${k}: %s matches a click`, (id) => {
      // The link: a world that already ran and changed, started clean, the baseline, then the linked what-if
      const link = new SimEngine(sb, defaultParams(sb));
      run(link, 0.5);
      link.change(sb.whatifs[0][0]);
      run(link, 0.2);
      link.reset();
      const got = whatifFromHash(whatifHash(id), sb);
      expect(got).toBe(id);
      run(link, DEEPLINK_BASELINE_S);
      link.change(got!);
      run(link, 0.3);
      // The click: a fresh world, the same wait, the button
      const click = new SimEngine(sb, defaultParams(sb));
      run(click, DEEPLINK_BASELINE_S);
      click.change(id);
      run(click, 0.3);
      expect(link.applied).toEqual([id]);
      expect(link.alt).toEqual(click.alt);
      expect(link.base).toEqual(click.base);
    });
  }
});
