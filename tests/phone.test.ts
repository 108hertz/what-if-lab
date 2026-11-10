import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { speedParts } from "@/components/console/phone/speed";

/** Change 0035: the phone speed list says every speed in words, so every world's speed label must parse. */
describe("phone speed words", () => {
  it.each(Object.values(SANDBOXES).map((sb) => [sb.key, sb] as const))("%s: every speed has words", (_k, sb) => {
    for (const [, label] of sb.speeds) expect(speedParts(label), label).not.toBeNull();
  });

  it("reads amounts and units", () => {
    expect(speedParts("3 mo/s")).toEqual({ n: 3, unit: "mo" });
    expect(speedParts("½ yr/s")).toEqual({ n: 6, unit: "mo" });
    expect(speedParts("400 Myr/s")).toEqual({ n: 400, unit: "myr" });
    expect(speedParts("1 Gyr/s")).toEqual({ n: 1, unit: "gyr" });
    expect(speedParts("fast")).toBeNull();
  });
});
