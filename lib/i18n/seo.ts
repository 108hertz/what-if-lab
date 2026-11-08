/**
 * SEO per language (change 0025, ADR 0010): absolute URLs, canonical, hreflang alternates and Open Graph.
 * Framework-free apart from Next's Metadata *type*; used by pages, the sitemap and tests.
 */

import type { Metadata } from "next";
import { DEFAULT_LOCALE, LOCALES, READY_LOCALES, localeInfo } from "./locales";
import { localePath } from "./routes";

/** Placeholder origin until hosting is decided (change 0002); set NEXT_PUBLIC_SITE_URL to the real one. */
export const PLACEHOLDER_ORIGIN = "https://what-if-lab.example";

export function siteOrigin(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  const v = (env ?? "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[^/\s]+$/.test(v) ? v : PLACEHOLDER_ORIGIN;
}

export const absUrl = (path: string, origin = siteOrigin()): string => (path === "/" ? origin + "/" : origin + path);

/**
 * hreflang map for an English path: every ready language plus x-default (English).
 * Keys are BCP-47 tags, values absolute URLs.
 */
export function alternates(path: string, origin = siteOrigin()): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of READY_LOCALES()) out[l.tag] = absUrl(localePath(l.code, path), origin);
  out["x-default"] = absUrl(localePath(DEFAULT_LOCALE, path), origin);
  return out;
}

export interface PageSeo {
  locale: string;
  /** The English path, e.g. "/" or "/lab/earth". */
  path: string;
  title: string;
  description: string;
}

/**
 * Metadata for one page in one language. A language that is not ready yet builds its pages but keeps them out
 * of search (noindex) and out of hreflang, so half-translated pages never compete with English.
 */
export function pageMetadata({ locale, path, title, description }: PageSeo, origin = siteOrigin()): Metadata {
  const info = localeInfo(locale);
  const url = absUrl(localePath(info.code, path), origin);
  const ready = info.ready;
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: url, ...(ready ? { languages: alternates(path, origin) } : {}) },
    ...(ready ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      siteName: "What-If Lab",
      url,
      title,
      description,
      locale: info.og,
      ...(ready ? { alternateLocale: READY_LOCALES().filter((l) => l.code !== info.code).map((l) => l.og) } : {}),
    },
  };
}

/** Every ready language's URL of every English path, with its alternates, for sitemap.xml. */
export function sitemapEntries(paths: string[], origin = siteOrigin()) {
  return paths.flatMap((path) =>
    READY_LOCALES().map((l) => ({ url: absUrl(localePath(l.code, path), origin), alternates: { languages: alternates(path, origin) } })),
  );
}

export const ALL_TAGS = LOCALES.map((l) => l.tag);
