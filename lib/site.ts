/**
 * Who runs the site and where to find it (change 0032). Framework-free: pages, the site menu, JSON-LD and tests read it.
 *
 * FILL THESE IN before launch. A value starting with "TODO_" counts as not set: the social buttons, the contact line and
 * the operator's name are left out (or replaced by a neutral phrase) until it is real.
 */
export const SITE_RAW = {
  /** Person or company that runs the site, as it should appear in the privacy policy and terms. */
  operator: "TODO_OPERATOR",
  /** Country whose law governs the terms, e.g. "Germany". */
  country: "TODO_COUNTRY",
  /** Contact email for privacy and other questions. */
  email: "TODO_EMAIL",
  /** Full profile URLs. */
  instagram: "TODO_INSTAGRAM_URL",
  tiktok: "TODO_TIKTOK_URL",
  /** Date the privacy policy and terms last changed (YYYY-MM-DD). */
  updated: "2026-11-10",
} as const;

export type SiteField = keyof typeof SITE_RAW;

const set = (v: string) => !!v && !v.startsWith("TODO_");

/** Checks a field; returns the value when it's real and well-formed, else null. */
export function siteValue(field: SiteField, raw: Record<SiteField, string> = SITE_RAW): string | null {
  const v = raw[field]?.trim() ?? "";
  if (!set(v)) return null;
  if (field === "email") return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? v : null;
  if (field === "instagram") return /^https:\/\/(www\.)?instagram\.com\/[A-Za-z0-9._]+\/?$/.test(v) ? v : null;
  if (field === "tiktok") return /^https:\/\/(www\.)?tiktok\.com\/@[A-Za-z0-9._]+\/?$/.test(v) ? v : null;
  if (field === "updated") return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
  return v;
}

/** Fields still to fill in (shown by the site test as a reminder). */
export const pendingSite = (raw: Record<SiteField, string> = SITE_RAW): SiteField[] =>
  (Object.keys(raw) as SiteField[]).filter((f) => siteValue(f, raw) == null);

export const SOCIALS = (raw: Record<SiteField, string> = SITE_RAW) =>
  (["instagram", "tiktok"] as const).flatMap((k) => { const url = siteValue(k, raw); return url ? [{ id: k, url, name: k === "instagram" ? "Instagram" : "TikTok" }] : []; });

/** The site's static pages (English paths), for the sitemap and the menu. */
export const SITE_PAGES = ["/about", "/privacy", "/terms"] as const;
