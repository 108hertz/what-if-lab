"use client";

import { createContext, useContext, useMemo } from "react";
import { createT, localeInfo, localePath, DEFAULT_LOCALE, type Messages, type T } from "@/lib/i18n";
import { setPageT } from "@/lib/i18n/page";
import { EN_SHARED } from "@/lib/i18n/english";

/**
 * The page's language and its messages (change 0025). Pages load catalogs at build time
 * (lib/i18n/load.ts) and pass them here; nothing is fetched at runtime.
 */
interface I18nValue { locale: string; messages: Messages }

const I18nContext = createContext<I18nValue>({ locale: DEFAULT_LOCALE, messages: {} });

/** Every page falls back to the English built into the bundle. */
const make = (locale: string, messages: Messages): T => createT({ locale, messages, fallback: EN_SHARED, onMissing: warn, pseudo: pseudoOn() });

/** Dev only (change 0025): `?pseudo` (remembered) turns on the pseudo-language; `?pseudo=0` turns it off. */
function pseudoOn(): boolean {
  if (process.env.NODE_ENV === "production" || typeof window === "undefined") return false;
  try {
    const q = new URLSearchParams(window.location.search).get("pseudo");
    if (q != null) localStorage.setItem("pseudo", q === "0" ? "0" : "1");
    return localStorage.getItem("pseudo") === "1";
  } catch { return false; }
}

export function I18nProvider({ locale, messages, children }: I18nValue & { children: React.ReactNode }) {
  const value = useMemo(() => {
    // Canvas drawing and exports read the page's language without React (lib/i18n/page.ts).
    setPageT(make(locale, messages));
    return { locale, messages };
  }, [locale, messages]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Dev only: a key no catalog has, or one a ready language lacks (English pages and unfinished languages use English on purpose). */
const warn = (key: string, locale: string, inFallback: boolean) => {
  if (process.env.NODE_ENV === "production") return;
  if (inFallback && (locale === DEFAULT_LOCALE || !localeInfo(locale).ready)) return;
  console.warn(`[i18n] missing "${key}" in ${locale}`);
};

/** The translation function for this page. */
export function useT(): T {
  const { locale, messages } = useContext(I18nContext);
  return useMemo(() => make(locale, messages), [locale, messages]);
}

export const useLocale = (): string => useContext(I18nContext).locale;

/** Turns an English path into this page's language: useHref()("/lab/earth") → "/de/lab/earth". */
export function useHref(): (path: string) => string {
  const locale = useLocale();
  return useMemo(() => (path: string) => localePath(locale, path), [locale]);
}
