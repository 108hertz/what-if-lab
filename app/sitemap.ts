import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/i18n/seo";
import { WHATIF_PAGE_LOCALES, whatifPages } from "@/lib/seo/whatifPages";
import { SANDBOXES } from "@/worlds/sims";
import { MODES, SANDBOX_KEYS, modeHref } from "@/worlds/registry";
import { SITE_PAGES } from "@/lib/site";

/**
 * sitemap.xml at build time: every page in every ready language, with hreflang alternates (change 0025); site pages (0032);
 * what-if pages in the languages they are built in (0033).
 */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const whatifs = SANDBOX_KEYS.flatMap((k) => whatifPages(SANDBOXES[k]).map((x) => x.path));
  return [
    ...sitemapEntries([...MODES.map((m) => modeHref(m)), ...SITE_PAGES]),
    ...sitemapEntries(whatifs, undefined, undefined, WHATIF_PAGE_LOCALES),
  ];
}
