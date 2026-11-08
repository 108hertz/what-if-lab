/**
 * Language URLs (ADR 0010): English keeps today's paths, every other language lives under /<code>/.
 * Framework-free; pages, the nav, the sitemap and tests share it.
 */

import { DEFAULT_LOCALE, PREFIXED_LOCALES, isLocale } from "./locales";

/** The path of `path` (an English path such as "/" or "/lab/earth") in `locale`. */
export function localePath(locale: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  if (locale === DEFAULT_LOCALE || !isLocale(locale)) return p;
  return p === "/" ? `/${locale}` : `/${locale}${p}`;
}

/** Splits a path into its language and the English path: "/de/lab/earth" → ["de", "/lab/earth"]. */
export function splitLocale(path: string): [locale: string, path: string] {
  const m = /^\/([a-z]{2})(?=\/|$)(.*)$/.exec(path);
  if (m && m[1] !== DEFAULT_LOCALE && isLocale(m[1])) return [m[1], m[2] || "/"];
  return [DEFAULT_LOCALE, path || "/"];
}

/** `generateStaticParams` for app/[lang]: every language but English. */
export const langParams = (): { lang: string }[] => PREFIXED_LOCALES.map((lang) => ({ lang }));
