import type { MetadataRoute } from "next";
import { absUrl } from "@/lib/i18n/seo";

/** robots.txt at build time (change 0025). Pages of languages that are not ready carry their own noindex. */
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: "/" }, sitemap: absUrl("/sitemap.xml") };
}
