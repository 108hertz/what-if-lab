import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/i18n/seo";
import { MODES, modeHref } from "@/worlds/registry";
import { SITE_PAGES } from "@/lib/site";

/** sitemap.xml at build time: every page in every ready language, with hreflang alternates (change 0025); site pages (0032). */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries([...MODES.map((m) => modeHref(m)), ...SITE_PAGES]);
}
