import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { readGaId } from "@/components/privacy/config";
import { CONSENT_KEY, CONSENT_VERSION, consentState, readChoice, writeChoice, type Store } from "@/components/privacy/consent";
import { setTracking, track } from "@/components/privacy/track";

/** Change 0027: analytics only after consent; no ID ⇒ nothing loads; sims and exports never know. */
const mem = (init: Record<string, string> = {}): Store & { data: Record<string, string> } => {
  const data = { ...init };
  return { data, get: (k) => data[k] ?? null, set: (k, v) => { data[k] = v; } };
};

describe("GA ID", () => {
  it("accepts only a GA4 Measurement ID", () => {
    expect(readGaId(undefined)).toBeNull();
    expect(readGaId("")).toBeNull();
    expect(readGaId("UA-1234-1")).toBeNull();
    expect(readGaId("G-ABC123XYZ")).toBe("G-ABC123XYZ");
    expect(readGaId("  G-ABC123XYZ ")).toBe("G-ABC123XYZ");
  });
});

describe("consent choice", () => {
  it("no choice ⇒ asks; everything denied", () => {
    expect(readChoice(mem())).toBeNull();
    expect(consentState(null)).toEqual({ analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  });
  it("remembers Accept and Decline", () => {
    const s = mem();
    writeChoice(s, "denied");
    expect(readChoice(s)).toBe("denied");
    writeChoice(s, "granted");
    expect(readChoice(s)).toBe("granted");
    expect(consentState("granted").analytics_storage).toBe("granted");
    expect(consentState("granted").ad_storage).toBe("denied");
  });
  it("asks again after a policy version change or garbage", () => {
    expect(readChoice(mem({ [CONSENT_KEY]: `${CONSENT_VERSION - 1}:granted` }))).toBeNull();
    expect(readChoice(mem({ [CONSENT_KEY]: "yes" }))).toBeNull();
  });
});

describe("track", () => {
  it("sends nothing before consent", () => {
    const sent: unknown[] = [];
    (globalThis as { window?: unknown }).window = { gtag: (...a: unknown[]) => sent.push(a) };
    setTracking(false);
    expect(track("fork", { world: "solar" })).toBe(false);
    expect(sent).toEqual([]);
    setTracking(true);
    expect(track("fork", { world: "solar" })).toBe(true);
    expect(sent).toEqual([["event", "fork", { world: "solar" }]]);
    setTracking(false);
    delete (globalThis as { window?: unknown }).window;
  });
});

describe("analytics stays out of the simulation", () => {
  const ROOT = join(__dirname, "..");
  const files = (dir: string): string[] => readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(ROOT, p)).isDirectory() ? files(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
  it.each(["lib", "worlds"])("%s never imports components/privacy", (dir) => {
    for (const f of files(dir)) expect(readFileSync(join(ROOT, f), "utf8"), f).not.toMatch(/privacy\/(track|consent|config|ConsentBanner)/);
  });
});
