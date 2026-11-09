/**
 * The 20 languages of What-If Lab (ADR 0010). Framework-free: sims, exports, routes and tests read it.
 * `code` is the URL segment (English has none), `tag` is the BCP-47 tag for Intl and hreflang.
 * A language is listed in the picker, sitemap and hreflang only when `ready` (all keys, reviewed).
 */

export type Script = "latin" | "cyrillic" | "cjk-sc" | "cjk-jp" | "cjk-kr" | "arabic" | "devanagari" | "thai" | "bengali";

export interface LocaleInfo {
  code: string;
  tag: string;
  /** The language's name in itself, for the picker. */
  name: string;
  /** The language's name in English, for docs and dev tools. */
  english: string;
  dir: "ltr" | "rtl";
  script: Script;
  ready: boolean;
  /** Open Graph locale (language_TERRITORY). */
  og: string;
}

const L = (code: string, tag: string, name: string, english: string, script: Script, dir: "ltr" | "rtl" = "ltr"): LocaleInfo =>
  ({ code, tag, name, english, dir, script, ready: READY.has(code), og: OG[code] });

/**
 * Languages with every key translated. All 19 non-English languages are machine drafts awaiting native review
 * (change 0025: es pt de ja ar in step 14, the other 14 after). Take a language out of this set to hide it again
 * (picker, sitemap, hreflang) and make its pages noindex.
 */
const READY = new Set(["en", "es", "pt", "fr", "de", "it", "nl", "pl", "tr", "id", "vi", "ru", "uk", "zh", "ja", "ko", "ar", "hi", "th", "bn"]);

const OG: Record<string, string> = {
  en: "en_US", es: "es_ES", pt: "pt_BR", fr: "fr_FR", de: "de_DE", it: "it_IT", nl: "nl_NL", pl: "pl_PL", tr: "tr_TR", id: "id_ID",
  vi: "vi_VN", ru: "ru_RU", uk: "uk_UA", zh: "zh_CN", ja: "ja_JP", ko: "ko_KR", ar: "ar_AR", hi: "hi_IN", th: "th_TH", bn: "bn_BD",
};

export const LOCALES: readonly LocaleInfo[] = [
  L("en", "en", "English", "English", "latin"),
  L("es", "es", "Español", "Spanish", "latin"),
  L("pt", "pt-BR", "Português", "Portuguese (Brazil)", "latin"),
  L("fr", "fr", "Français", "French", "latin"),
  L("de", "de", "Deutsch", "German", "latin"),
  L("it", "it", "Italiano", "Italian", "latin"),
  L("nl", "nl", "Nederlands", "Dutch", "latin"),
  L("pl", "pl", "Polski", "Polish", "latin"),
  L("tr", "tr", "Türkçe", "Turkish", "latin"),
  L("id", "id", "Bahasa Indonesia", "Indonesian", "latin"),
  L("vi", "vi", "Tiếng Việt", "Vietnamese", "latin"),
  L("ru", "ru", "Русский", "Russian", "cyrillic"),
  L("uk", "uk", "Українська", "Ukrainian", "cyrillic"),
  L("zh", "zh-Hans", "简体中文", "Chinese (Simplified)", "cjk-sc"),
  L("ja", "ja", "日本語", "Japanese", "cjk-jp"),
  L("ko", "ko", "한국어", "Korean", "cjk-kr"),
  L("ar", "ar", "العربية", "Arabic", "arabic", "rtl"),
  L("hi", "hi", "हिन्दी", "Hindi", "devanagari"),
  L("th", "th", "ไทย", "Thai", "thai"),
  L("bn", "bn", "বাংলা", "Bengali", "bengali"),
];

export const DEFAULT_LOCALE = "en";
export type LocaleCode = string;

const BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));

export const isLocale = (code: string): boolean => BY_CODE.has(code);

/** Info for a code; unknown codes fall back to English. */
export const localeInfo = (code: string): LocaleInfo => BY_CODE.get(code) ?? BY_CODE.get(DEFAULT_LOCALE)!;

/** Codes that get their own `/<code>/…` pages (everything but English, which keeps today's URLs). */
export const PREFIXED_LOCALES = LOCALES.filter((l) => l.code !== DEFAULT_LOCALE).map((l) => l.code);

export const READY_LOCALES = (): LocaleInfo[] => LOCALES.filter((l) => l.ready);
