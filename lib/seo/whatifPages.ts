/**
 * Where the what-if pages are (change 0033, step 6): `/lab/<world>/<slug>`, one per what-if with a question
 * (`Sandbox.questions`). Framework-free; used by the routes, the world intros, the sitemap and tests.
 */
import { localePath } from "../i18n/routes";
import { READY_LOCALES } from "../i18n/locales";
import type { AnySandbox, SandboxKey } from "../sim/types";
import { answerIds } from "./answer";

/**
 * Languages the what-if pages are built in: every ready language (English in step 6, the other 19 in step 7). To hold a
 * language's what-if pages back without hiding the rest of it, filter it out here.
 */
export const WHATIF_PAGE_LOCALES: readonly string[] = READY_LOCALES().map((l) => l.code);

export const whatifPath = (world: SandboxKey, slug: string): string => `/lab/${world}/${slug}`;

export interface WhatIfPageRef {
  world: SandboxKey;
  id: string;
  slug: string;
  /** The English path. */
  path: string;
}

export function whatifPages(sb: AnySandbox): WhatIfPageRef[] {
  return answerIds(sb).map((id) => {
    const slug = sb.questions![id].slug;
    return { world: sb.key, id, slug, path: whatifPath(sb.key, slug) };
  });
}

/** The what-if page in a language, or null where it is not built (yet). */
export function whatifHref(sb: AnySandbox, id: string, locale: string): string | null {
  const q = sb.questions?.[id];
  return q && WHATIF_PAGE_LOCALES.includes(locale) ? localePath(locale, whatifPath(sb.key, q.slug)) : null;
}

export const findWhatIf = (sb: AnySandbox, slug: string): WhatIfPageRef | undefined => whatifPages(sb).find((x) => x.slug === slug);
