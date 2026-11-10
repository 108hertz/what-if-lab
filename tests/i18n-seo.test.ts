import { SITE_PAGES } from "@/lib/site";
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/lib/i18n";
import { PLACEHOLDER_ORIGIN, absUrl, alternates, pageMetadata, siteOrigin, sitemapEntries } from "@/lib/i18n/seo";
import { pageCopy, pageMeta } from "@/components/shell/pageCopy";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { MODES, SANDBOX_KEYS, modeHref } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import manifest from "@/app/manifest";
import { homeLd, ldJson, worldLd } from "@/lib/seo/jsonld";
import { WHATIF_PAGE_LOCALES, whatifPages } from "@/lib/seo/whatifPages";

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
    // Every page shares the same card, so link previews show a picture (scripts/brand-images.mjs).
    expect((en.openGraph as { images?: { url: string }[] }).images?.[0].url).toBe("/og.png");
    expect((en.twitter as { card?: string }).card).toBe("summary_large_image");

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
    // + About, Privacy, Terms (change 0032); + the what-if pages in the languages they are built in (change 0033)
    const whatifs = SANDBOX_KEYS.reduce((n, k) => n + whatifPages(SANDBOXES[k]).length, 0) * WHATIF_PAGE_LOCALES.length;
    expect(s).toHaveLength((MODES.length + SITE_PAGES.length) * ready + whatifs);
    expect(new Set(s.map((e) => e.url)).size).toBe(s.length);
    for (const e of s.slice(0, (MODES.length + SITE_PAGES.length) * ready)) expect(e.alternates?.languages).toHaveProperty(["x-default"]);
    for (const e of s) expect(e.lastModified).toMatch(/^\d{4}-\d{2}-\d{2}$/); // change 0033
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
      // A what-if with its own page is listed as its question and links there (change 0033)
      const sb = SANDBOXES[k];
      expect(c.whatifs).toEqual(sb.whatifs.map(([id, l]) => (sb.questions?.[id]
        ? { label: sb.questions[id].q, href: `/lab/${k}/${sb.questions[id].slug}` }
        : { label: l, href: null })));
      expect(c.title).toBe(`${SANDBOXES[k].name} · What-If Lab`);
      expect(c.links.map((l) => l.href)).not.toContain(modeHref(k));
      expect(c.links).toHaveLength(MODES.length - 1);
    }
  });

  it("links stay in the page's language", () => {
    for (const l of pageCopy("ja", "earth").links) expect(l.href).toMatch(/^\/ja(\/|$)/);
  });

  it("metadata uses the search words (change 0033)", () => {
    const m = pageMeta("en", "solar");
    expect(m.title).toBe(`${SANDBOXES.solar.seo!.title} · What-If Lab`);
    expect(m.description).toBe(SANDBOXES.solar.seo!.description);
    expect(pageMeta("en", "scale").title).toBe(pageCopy("en", "scale").searchTitle);
    // Each world shares a picture of its own stage; home keeps the shared card.
    expect((m.openGraph as { images?: { url: string; alt: string }[] }).images?.[0]).toMatchObject({ url: "/og/solar.png", width: 1200, alt: m.title });
    expect((pageMeta("en", "scale").openGraph as { images?: { url: string }[] }).images?.[0].url).toBe("/og.png");
  });

  it("every world has search words, and every page's title is its own", () => {
    for (const k of SANDBOX_KEYS) {
      const seo = SANDBOXES[k].seo;
      expect(seo, k).toBeDefined();
      expect(seo!.title.length, k).toBeLessThanOrEqual(60);
      expect(seo!.description.length, k).toBeGreaterThan(70);
      expect(seo!.description.length, k).toBeLessThanOrEqual(180);
    }
    for (const l of LOCALES.filter((x) => x.ready)) {
      const titles = MODES.map((m) => String(pageMeta(l.code, m).title));
      expect(new Set(titles).size, l.code).toBe(titles.length);
    }
  });
});

describe("structured data (change 0033)", () => {
  type G = { "@graph": Record<string, unknown>[] };
  it("home names the site and its publisher", () => {
    const g = (homeLd("en", "D", O) as G)["@graph"];
    expect(g.map((x) => x["@type"])).toEqual(["WebSite", "Organization"]);
    expect(g[0].url).toBe("https://lab.test/");
  });

  it("a world is a free web app with a breadcrumb, and the JSON is safe in HTML", () => {
    const ld = worldLd({ locale: "de", path: "/lab/solar", name: "Sonnensystem", description: "D</script>", homeName: "What-If Lab" }, O);
    const g = (ld as G)["@graph"];
    expect(g[0]).toMatchObject({ "@type": "WebApplication", url: "https://lab.test/de/lab/solar", isAccessibleForFree: true, inLanguage: "de" });
    expect(g[0]).not.toHaveProperty("aggregateRating");
    expect(ldJson(ld)).not.toContain("</");
    expect((g[1].itemListElement as { item: string }[]).map((i) => i.item)).toEqual(["https://lab.test/de", "https://lab.test/de/lab/solar"]);
  });
});

describe("web app manifest (change 0033)", () => {
  it("names the site and has icons that exist", async () => {
    const { existsSync } = await import("node:fs");
    const m = manifest();
    expect(m.name).toBe("What-If Lab");
    for (const i of m.icons ?? []) expect(existsSync(`public${i.src}`), i.src).toBe(true);
  });
});
