import { SITE_PAGES } from "@/lib/site";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n";
import { PLACEHOLDER_ORIGIN, absUrl, alternates, pageMetadata, siteOrigin, sitemapEntries } from "@/lib/i18n/seo";
import { pageCopy, pageMeta } from "@/components/shell/pageCopy";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { MODES, SANDBOX_KEYS, modeHref } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";

/** Change 0025, step 3: SEO per language. */
const O = "https://lab.test";

describe("site origin", () => {
  it("uses a valid NEXT_PUBLIC_SITE_URL and falls back to the placeholder", () => {
    expect(siteOrigin("https://lab.test/")).toBe("https://lab.test");
    expect(siteOrigin("")).toBe(PLACEHOLDER_ORIGIN);
    expect(siteOrigin("not a url")).toBe(PLACEHOLDER_ORIGIN);
    expect(siteOrigin("https://lab.test/path")).toBe(PLACEHOLDER_ORIGIN);
    expect(absUrl("/", O)).toBe("https://lab.test/");
    expect(absUrl("/de/lab/earth", O)).toBe("https://lab.test/de/lab/earth");
  });
});

describe("hreflang and canonical", () => {
  it("lists ready languages plus x-default", () => {
    const a = alternates("/lab/earth", O);
    const ready = LOCALES.filter((l) => l.ready);
    expect(Object.keys(a)).toEqual([...ready.map((l) => l.tag), "x-default"]);
    expect(a["x-default"]).toBe("https://lab.test/lab/earth");
  });

  it("ready pages are indexable with alternates", () => {
    const en = pageMetadata({ locale: "en", path: "/lab/earth", title: "T", description: "D" }, O);
    expect(en.alternates?.canonical).toBe("https://lab.test/lab/earth");
    expect(en.alternates?.languages).toBeDefined();
    expect(en.robots).toBeUndefined();
    expect((en.openGraph as { locale?: string }).locale).toBe("en_US");

    const de = pageMetadata({ locale: "de", path: "/lab/earth", title: "T", description: "D" }, O);
    expect(de.alternates?.canonical).toBe("https://lab.test/de/lab/earth");
    expect(de.alternates?.languages).toBeDefined();
    expect(de.robots).toBeUndefined();
    expect((de.openGraph as { locale?: string }).locale).toBe("de_DE");

    for (const l of LOCALES.filter((x) => x.ready)) {
      const m = pageMetadata({ locale: l.code, path: "/", title: "T", description: "D" }, O);
      expect(m.robots, l.code).toBeUndefined();
      expect(m.alternates?.languages, l.code).toBeDefined();
    }
  });

  it("every language has an Open Graph locale", () => {
    for (const l of LOCALES) expect(l.og, l.code).toMatch(/^[a-z]{2}_[A-Z]{2}$/);
  });
});

describe("sitemap and robots", () => {
  it("lists every page once per ready language", () => {
    const s = sitemap();
    const ready = LOCALES.filter((l) => l.ready).length;
    expect(s).toHaveLength((MODES.length + SITE_PAGES.length) * ready); // + About, Privacy, Terms (change 0032)
    expect(new Set(s.map((e) => e.url)).size).toBe(s.length);
    for (const e of s) expect(e.alternates?.languages).toHaveProperty(["x-default"]);
    expect(sitemapEntries(["/"], O)[0].url).toBe("https://lab.test/");
  });

  it("allows crawling and points at the sitemap", () => {
    const r = robots();
    expect(r.sitemap).toMatch(/\/sitemap\.xml$/);
    expect(r.rules).toEqual({ userAgent: "*", allow: "/" });
  });
});

describe("page words", () => {
  it("each world page names the world, explains it and lists its what-ifs", () => {
    for (const k of SANDBOX_KEYS) {
      const c = pageCopy("en", k);
      expect(c.heading).toBe(SANDBOXES[k].name);
      expect(c.description).toBe(SANDBOXES[k].intro);
      expect(c.whatifs).toEqual(SANDBOXES[k].whatifs.map(([, l]) => l));
      expect(c.title).toBe(`${SANDBOXES[k].name} · What-If Lab`);
      expect(c.links.map((l) => l.href)).not.toContain(modeHref(k));
      expect(c.links).toHaveLength(MODES.length - 1);
    }
  });

  it("links stay in the page's language", () => {
    for (const l of pageCopy("ja", "earth").links) expect(l.href).toMatch(/^\/ja(\/|$)/);
  });

  it("metadata comes from the page words", () => {
    const m = pageMeta("en", "solar");
    expect(m.title).toBe(pageCopy("en", "solar").title);
    expect(m.description).toBe(SANDBOXES.solar.intro);
  });
});
