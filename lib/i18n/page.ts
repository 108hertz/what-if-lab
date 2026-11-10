/**
 * The page's language for code that has no React context: canvas drawing and exports (change 0025).
 * A page has one language for its whole life, so I18nProvider sets it once; tests and anything before that get
 * English (the shared catalogs, and the English in code for worlds).
 */

import { DEFAULT_LOCALE } from "./locales";
import { createT, type T } from "./t";
import { EN_SHARED } from "./english";

let current: T = createT({ locale: DEFAULT_LOCALE, messages: EN_SHARED });

/** English with the shared catalogs: what a page that has not set its language uses. */
export const englishT = (): T => createT({ locale: DEFAULT_LOCALE, messages: EN_SHARED });

export const pageT = (): T => current;

export function setPageT(t: T): void {
  current = t;
}

/**
 * Run `fn` with the page's language set to `t`, then put the previous one back. For build-time pages that say a world's
 * words outside React (change 0033): one build process renders pages in many languages, and an earlier page's
 * I18nProvider may have left its own language here.
 */
export function withPageT<R>(t: T, fn: () => R): R {
  const prev = current;
  current = t;
  try { return fn(); } finally { current = prev; }
}
