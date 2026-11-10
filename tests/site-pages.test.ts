import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { SITE_PAGES, SITE_RAW, SOCIALS, pendingSite, siteValue } from "@/lib/site";
import { sitemapEntries } from "@/lib/i18n/seo";
import { READY_LOCALES } from "@/lib/i18n";
import { exportLevel } from "@/components/account/state";
import { QUICK_SIZE, SIZES, defaultStyle, quickStyle } from "@/lib/export/style";

/** Change 0032 (About, Privacy, Terms) and change 0031 (free quick export). */
const ROOT = join(__dirname, "..");

describe("site details (lib/site.ts)", () => {
  it("placeholders count as not set, so nothing broken is shown", () => {
    const raw = { ...SITE_RAW, operator: "TODO_X", email: "TODO_EMAIL", instagram: "TODO", tiktok: "TODO" };
    expect(siteValue("operator", raw)).toBeNull();
    expect(SOCIALS(raw)).toEqual([]);
  });
  it("real values are checked", () => {
    const raw = { ...SITE_RAW, email: "hi@example.com", instagram: "https://instagram.com/whatiflab", tiktok: "https://www.tiktok.com/@whatiflab" };
    expect(siteValue("email", raw)).toBe("hi@example.com");
    expect(SOCIALS(raw).map((s) => s.name)).toEqual(["Instagram", "TikTok"]);
    expect(siteValue("tiktok", { ...raw, tiktok: "https://evil.example/@x" })).toBeNull();
    expect(siteValue("email", { ...raw, email: "not an email" })).toBeNull();
  });
  it("reminder: fields still to fill in before launch", () => {
    const left = pendingSite();
    if (left.length) console.info(`[site] still placeholders in lib/site.ts: ${left.join(", ")}`);
    expect(left).not.toContain("updated");
  });
});

describe("site pages", () => {
  it.each(SITE_PAGES)("%s has an English and a language route", (p) => {
    expect(existsSync(join(ROOT, "app/(en)", p, "page.tsx"))).toBe(true);
    expect(existsSync(join(ROOT, "app/[lang]", p, "page.tsx"))).toBe(true);
  });
  it("are in the sitemap in every ready language", () => {
    const urls = sitemapEntries([...SITE_PAGES], "https://x.test").map((e) => e.url);
    for (const p of SITE_PAGES) expect(urls.filter((u) => u.endsWith(p)).length).toBe(READY_LOCALES().length);
  });
});

describe("quick export (change 0031)", () => {
  it("free visitors and accounts-off get quick; Premium the studio", () => {
    expect(exportLevel({ isPremium: false })).toBe("quick");
    expect(exportLevel({ isPremium: true })).toBe("full");
  });
  it("is the studio's default landscape video", () => {
    expect(QUICK_SIZE).toBe("youtube");
    expect(SIZES[quickStyle().size]).toEqual({ ...SIZES.youtube });
    expect(SIZES.youtube.W).toBeGreaterThan(SIZES.youtube.H);
    expect(quickStyle()).toEqual(defaultStyle("youtube"));
  });
});
