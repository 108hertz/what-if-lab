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
export function alternates(path: string, origin = siteOrigin(), only?: readonly string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of READY_LOCALES().filter((x) => !only || only.includes(x.code))) out[l.tag] = absUrl(localePath(l.code, path), origin);
  out["x-default"] = absUrl(localePath(DEFAULT_LOCALE, path), origin);
  return out;
}

/** The share card every page uses (public/og.png, drawn by scripts/brand-images.mjs). */
export const SHARE_IMAGE = { url: "/og.png", width: 1200, height: 630, alt: "What-If Lab: change one thing in a world and watch its future split." } as const;

export interface PageSeo {
  locale: string;
  /** The English path, e.g. "/" or "/lab/earth". */
  path: string;
  title: string;
  description: string;
  /** The page's own share picture (change 0033: a world's stage, public/og/<world>.png); the shared card otherwise. */
  image?: { url: string; alt: string };
  /** The page exists only in these languages (what-if pages, change 0033): hreflang lists just them. Default: every ready one. */
  locales?: readonly string[];
}

/**
 * Metadata for one page in one language. A language that is not ready yet builds its pages but keeps them out
 * of search (noindex) and out of hreflang, so half-translated pages never compete with English.
 */
export function pageMetadata({ locale, path, title, description, image, locales }: PageSeo, origin = siteOrigin()): Metadata {
  const info = localeInfo(locale);
  const img = image ? { ...SHARE_IMAGE, ...image } : SHARE_IMAGE;
  const url = absUrl(localePath(info.code, path), origin);
  const ready = info.ready && (!locales || locales.includes(info.code));
  const others = READY_LOCALES().filter((l) => l.code !== info.code && (!locales || locales.includes(l.code)));
  const many = !locales || locales.length > 1;
  return {
    metadataBase: new URL(origin),
    title,
    description,
    alternates: { canonical: url, ...(ready && many ? { languages: alternates(path, origin, locales) } : {}) },
    ...(ready ? {} : { robots: { index: false, follow: true } }),
    openGraph: {
      type: "website",
      siteName: "What-If Lab",
      url,
      title,
      description,
      locale: info.og,
      ...(ready && others.length ? { alternateLocale: others.map((l) => l.og) } : {}),
      images: [img],
    },
    twitter: { card: "summary_large_image", title, description, images: [{ url: img.url, alt: img.alt }] },
  };
}

/**
 * Every ready language's URL of every English path, with its alternates, for sitemap.xml. `lastModified` (change 0033) is
 * the build's date: every page is rebuilt from the same code on each deploy.
 */
export function sitemapEntries(paths: string[], origin = siteOrigin(), lastModified = new Date().toISOString().slice(0, 10), only?: readonly string[]) {
  const langs = READY_LOCALES().filter((l) => !only || only.includes(l.code));
  return paths.flatMap((path) =>
    langs.map((l) => ({
      url: absUrl(localePath(l.code, path), origin), lastModified,
      ...(langs.length > 1 ? { alternates: { languages: alternates(path, origin, only) } } : {}),
    })),
  );
}

export const ALL_TAGS = LOCALES.map((l) => l.tag);
