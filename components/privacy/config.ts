/**
 * Analytics configuration (change 0027, ADR 0011). Only public IDs, read at build time; no ID ⇒ that piece is off
 * (dev, previews, forks), and with no GA ID there is no consent banner either.
 */

/** A GA4 Measurement ID (G-…), or null. Anything else is ignored. */
export function readGaId(raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  return /^G-[A-Z0-9]{4,20}$/.test(v) ? v : null;
}

export const GA_ID = readGaId(process.env.NEXT_PUBLIC_GA_ID);
