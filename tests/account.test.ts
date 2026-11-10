import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  HINT_GRACE_MS, REMOTE_LOADING, adsAllowed, canExport, displayName, premiumHint, readConfig, rememberPremium, resolveAccount, type RemoteState,
} from "@/components/account/state";
import { AccountContext, CONFIG, FREE_ACCOUNT } from "@/components/account/context";
import AdSlot, { ADS_ON } from "@/components/console/AdSlot";

/** Change 0020 / ADR 0008: the entitlement adapter and what Premium changes. */

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};
const signedIn = (hasPlan: boolean): RemoteState => ({ loaded: true, failed: false, signedIn: true, hasPlan, user: { name: "Ada", email: "ada@example.com" } });

describe("config", () => {
  it("is off without a key, as in tests and CI", () => {
    expect(CONFIG.publishableKey).toBeNull();
    expect(readConfig({}).publishableKey).toBeNull();
    expect(readConfig({}).plan).toBe("premium");
  });

  it("accepts only publishable keys", () => {
    expect(readConfig({ key: "pk_test_Y2xlcmsuZXhhbXBsZS5jb20k" }).publishableKey).toBe("pk_test_Y2xlcmsuZXhhbXBsZS5jb20k");
    const secret = readConfig({ key: "sk_live_abc123" });
    expect(secret.publishableKey).toBeNull();
    expect(secret.rejected).toMatch(/secret/);
    expect(readConfig({ key: "hello" }).publishableKey).toBeNull();
  });

  it("allows the Premium simulation only outside production", () => {
    expect(readConfig({ nodeEnv: "production" }).dev).toBe(false);
    expect(readConfig({ nodeEnv: "development" }).dev).toBe(true);
  });

  it("turns the Premium preview on for Vercel previews and the local flag, never on Vercel production", () => {
    expect(readConfig({ nodeEnv: "production" }).preview).toBe(false);
    const prev = readConfig({ nodeEnv: "production", vercelEnv: "preview" });
    expect(prev.preview).toBe(true);
    expect(prev.dev).toBe(true);
    expect(readConfig({ nodeEnv: "production", previewFlag: "1" }).preview).toBe(true);
    const prod = readConfig({ nodeEnv: "production", vercelEnv: "production", previewFlag: "1" });
    expect(prod.preview).toBe(false);
    expect(prod.dev).toBe(false);
  });
});

describe("resolveAccount", () => {
  const r = (over: Partial<Parameters<typeof resolveAccount>[0]>) =>
    resolveAccount({ configured: true, remote: REMOTE_LOADING, devPremium: false, hint: false, ...over });

  it("no key → off and free; the dev switch can simulate Premium", () => {
    expect(r({ configured: false })).toEqual({ status: "off", isPremium: false });
    expect(r({ configured: false, devPremium: true })).toEqual({ status: "off", isPremium: true });
  });

  it("follows the provider: signed out, free, premium", () => {
    expect(r({ remote: { ...REMOTE_LOADING, loaded: true } })).toEqual({ status: "signed-out", isPremium: false });
    expect(r({ remote: signedIn(false) })).toEqual({ status: "free", isPremium: false });
    expect(r({ remote: signedIn(true) })).toEqual({ status: "premium", isPremium: true });
  });

  it("keeps a recent subscriber on Premium while loading or offline, never after a definite answer", () => {
    expect(r({ hint: true })).toEqual({ status: "loading", isPremium: true });
    expect(r({ hint: true, remote: { ...REMOTE_LOADING, failed: true } })).toEqual({ status: "error", isPremium: true });
    expect(r({ hint: true, remote: signedIn(false) })).toEqual({ status: "free", isPremium: false });
    expect(r({ remote: { ...REMOTE_LOADING, failed: true } })).toEqual({ status: "error", isPremium: false });
  });

  it("gates ads and exports on Premium only", () => {
    expect(adsAllowed({ isPremium: false })).toBe(true);
    expect(adsAllowed({ isPremium: true })).toBe(false);
    expect(canExport({ isPremium: false })).toBe(false);
    expect(canExport({ isPremium: true })).toBe(true);
  });
});

describe("offline grace hint", () => {
  it("lasts 14 days and is cleared by a definite free answer", () => {
    const s = memory(), now = 1_000_000;
    expect(premiumHint(now, s)).toBe(false);
    rememberPremium(true, now, s);
    expect(premiumHint(now + HINT_GRACE_MS - 1, s)).toBe(true);
    expect(premiumHint(now + HINT_GRACE_MS + 1, s)).toBe(false);
    rememberPremium(false, now, s);
    expect(premiumHint(now, s)).toBe(false);
  });

  it("survives blocked storage", () => {
    const broken = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } };
    expect(() => rememberPremium(true, 0, broken)).not.toThrow();
    expect(premiumHint(0, broken)).toBe(false);
  });
});

describe("ad slots while ads are off", () => {
  it.runIf(!ADS_ON).each(["rail", "box", "banner"] as const)("renders no %s slot", (size) => {
    expect(renderToStaticMarkup(createElement(AccountContext.Provider, { value: FREE_ACCOUNT }, createElement(AdSlot, { size, promo: true })))).toBe("");
  });
});

describe.runIf(ADS_ON)("ad slots and Premium", () => {
  const render = (isPremium: boolean, size: "rail" | "box" | "banner", promo?: boolean) =>
    renderToStaticMarkup(createElement(AccountContext.Provider, { value: { ...FREE_ACCOUNT, isPremium } }, createElement(AdSlot, { size, promo })));

  it.each(["rail", "box", "banner"] as const)("free visitors keep the %s slot", (size) => {
    expect(render(false, size, true)).toContain(`data-ad-size="${size}"`);
  });

  it.each(["rail", "box", "banner"] as const)("Premium renders no %s slot at all", (size) => {
    expect(render(true, size, true)).toBe("");
  });

  it("the empty slot's upsell is a button in builds that sell Premium", () => {
    expect(render(false, "box", true)).toContain("Ad-free with Premium");
  });
});

describe("display name", () => {
  it("prefers the name, then the email, then a neutral label", () => {
    expect(displayName("Ada", "Ada Lovelace", "ada@x.org")).toBe("Ada Lovelace");
    expect(displayName(null, null, "ada@x.org")).toBe("ada");
    expect(displayName(null, null, null)).toBe("Your account");
  });
});
