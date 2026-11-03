import { describe, expect, it } from "vitest";
import { isFullscreenKey } from "@/components/console/fullscreenKey";

/** Change 0013: F toggles full screen, but never while typing or with a modifier. */
const key = (k: string, target: object | null = { tagName: "BODY" }, mods: Partial<Record<"ctrlKey" | "metaKey" | "altKey", boolean>> = {}) =>
  isFullscreenKey({ key: k, ctrlKey: false, metaKey: false, altKey: false, ...mods, target: target as EventTarget });

describe("full-screen key", () => {
  it("plain f / F toggles", () => {
    expect(key("f")).toBe(true);
    expect(key("F")).toBe(true);
    expect(key("f", null)).toBe(true);
  });
  it("other keys don't", () => expect(key("g")).toBe(false));
  it.each(["INPUT", "TEXTAREA", "SELECT"])("ignored while typing in %s", (tagName) => expect(key("f", { tagName })).toBe(false));
  it("ignored in contenteditable", () => expect(key("f", { tagName: "DIV", isContentEditable: true })).toBe(false));
  it.each(["ctrlKey", "metaKey", "altKey"] as const)("ignored with %s (browser shortcuts)", (m) => expect(key("f", undefined, { [m]: true })).toBe(false));
});
