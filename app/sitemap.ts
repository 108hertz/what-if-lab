import type { MetadataRoute } from "next";
import { sitemapEntries } from "@/lib/i18n/seo";
import { MODES, modeHref } from "@/worlds/registry";

/** sitemap.xml at build time: every page in every ready language, with hreflang alternates (change 0025). */
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  return sitemapEntries(MODES.map((m) => modeHref(m)));
}
