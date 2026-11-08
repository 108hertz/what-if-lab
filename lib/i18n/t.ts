/**
 * The translation lookup (ADR 0010). Framework-free so sims' draw code, exports and tests use it as well as React.
 *
 * Catalogs are JSON objects, nested or flat, one per namespace; `catalog("console", json)` turns
 * {"transport": {"play": "Play"}} into {"console.transport.play": "Play"}.
 * A missing key falls back to English, then to the key itself (reported once through `onMissing`).
 */

import { DEFAULT_LOCALE, localeInfo } from "./locales";
import { format, numberFormat, type Ref, type Value, type Values } from "./message";

export type Messages = Record<string, string>;
export type { Ref, Value, Values } from "./message";

export type Json = { [k: string]: string | Json };

/** Flattens one namespace's JSON into dotted keys. Keys starting with "_" (e.g. "_status") are metadata. */
export function catalog(ns: string, json: Json): Messages {
  const out: Messages = {};
  const walk = (o: Json, path: string) => {
    for (const [k, v] of Object.entries(o)) {
      if (k.startsWith("_")) continue;
      const key = path ? `${path}.${k}` : k;
      if (typeof v === "string") out[key] = v;
      else walk(v, key);
    }
  };
  walk(json, ns);
  return out;
}

export const merge = (...cats: Messages[]): Messages => Object.assign({}, ...cats);

/** A reference to another message, for values that are themselves words (a planet's name, a species). */
export const ref = (k: string, v?: Values): Ref => (v ? { k, v } : { k });

export interface T {
  (key: string, values?: Values): string;
  locale: string;
  /** BCP-47 tag for Intl. */
  tag: string;
  dir: "ltr" | "rtl";
  has(key: string): boolean;
  /** A number in the locale's style. */
  num(v: number | null | undefined, opts?: Intl.NumberFormatOptions): string;
  /** Applied to every finished message (identity, or the dev pseudo-language). */
  post(s: string): string;
}

export interface CreateT {
  locale: string;
  messages: Messages;
  /** English messages, used when a key is missing in `messages`. */
  fallback?: Messages;
  /** Called once per key not in `messages`; `inFallback` says English had it. */
  onMissing?: (key: string, locale: string, inFallback: boolean) => void;
  /** Dev only: show every message accented and 40 % longer, to find words left in code and labels that overflow. */
  pseudo?: boolean;
}

export function createT({ locale, messages, fallback = {}, onMissing, pseudo }: CreateT): T {
  const info = localeInfo(locale);
  const reported = new Set<string>();

  const resolveSrc = (key: string): [src: string, tag: string] | null => {
    if (key in messages) return [messages[key], info.tag];
    if (key in fallback) {
      miss(key, true);
      return [fallback[key], localeInfo(DEFAULT_LOCALE).tag];
    }
    miss(key, false);
    return null;
  };
  const miss = (key: string, inFallback: boolean) => {
    if (!onMissing || reported.has(key)) return;
    reported.add(key);
    onMissing(key, locale, inFallback);
  };

  const t = ((key: string, values?: Values): string => {
    const hit = resolveSrc(key);
    if (!hit) return key;
    // Plurals and numbers always follow the page's language, even in an English fallback string.
    return t.post(format(hit[0], info.tag, values, (r) => t(r.k, r.v)));
  }) as T;
  t.locale = info.code;
  t.tag = info.tag;
  t.dir = info.dir;
  t.has = (key) => key in messages || key in fallback;
  t.num = (v, opts) => (v == null || !isFinite(v) ? "—" : numberFormat(info.tag, opts).format(v));
  t.post = pseudo ? pseudoize : (s) => s;
  return t;
}

/** Shows a message value without a T (logs, debugging). */
export const plain = (v: Value): string => (typeof v === "object" ? v.k : String(v));

/** Says a message of one namespace: (key relative to it, values) → text. */
export type Say = (k: string, v?: Values) => string;

/**
 * A lookup for one namespace whose English lives in code (a sandbox's `messages`, change 0025): the translation
 * `${ns}.${k}` when the page's language has it, otherwise the English message formatted in the page's language.
 * `ref()` values are keys of the same namespace and are said the same way.
 */
export function scoped(t: T, ns: string, english: Messages = {}): Say {
  const say: Say = (k, v) => {
    const vals = v && resolveRefs(v, say);
    const key = `${ns}.${k}`;
    if (t.has(key)) return t(key, vals);
    const src = english[k];
    return src == null ? key : t.post(format(src, t.tag, vals));
  };
  return say;
}

function resolveRefs(v: Values, say: Say): Values {
  let out: Values | null = null;
  for (const [name, x] of Object.entries(v)) {
    if (typeof x !== "object") continue;
    out ??= { ...v };
    out[name] = say(x.k, x.v);
  }
  return out ?? v;
}

/** Upper-cases the first letter in the language's rules (event lines can start with a name: "{many} grow…"). */
export const cap1 = (s: string, tag = "en"): string => (s ? s[0].toLocaleUpperCase(tag) + s.slice(1) : s);

const ACCENT: Record<string, string> = {
  a: "á", b: "ƀ", c: "ç", d: "ð", e: "é", f: "ƒ", g: "ĝ", h: "ĥ", i: "í", j: "ĵ", k: "ķ", l: "ļ", m: "ɱ", n: "ñ", o: "ó", p: "þ", q: "ǫ", r: "ŕ", s: "š", t: "ţ",
  u: "ú", v: "ṽ", w: "ŵ", x: "ẋ", y: "ý", z: "ž", A: "Á", B: "Ɓ", C: "Ç", D: "Ð", E: "É", F: "Ƒ", G: "Ĝ", H: "Ĥ", I: "Í", J: "Ĵ", K: "Ķ", L: "Ļ", M: "Ṁ", N: "Ñ",
  O: "Ó", P: "Þ", Q: "Ǫ", R: "Ŕ", S: "Š", T: "Ţ", U: "Ú", V: "Ṽ", W: "Ŵ", X: "Ẋ", Y: "Ý", Z: "Ž",
};

/** "Play" → "⟦Ƥļáý··⟧": accented (so words left in code stand out), 40 % longer (to find overflow), bracketed (to see clipping). */
export function pseudoize(s: string): string {
  // Already pseudo as a whole; a line that only starts with a pseudo name ("⟦Elk⟧ numbers…") still gets done
  if (!s || (s.startsWith("⟦") && s.endsWith("⟧"))) return s;
  const body = s.replace(/[A-Za-z]/g, (c) => ACCENT[c] ?? c);
  return `⟦${body}${"·".repeat(Math.ceil(s.length * 0.4))}⟧`;
}

/**
 * "a, b and c" in the page's language (Intl.ListFormat). English keeps the site's style, without the serial comma.
 */
export function listOf(t: Pick<T, "tag">, xs: string[]): string {
  if (xs.length < 2) return xs.join("");
  const tag = t.tag === "en" || t.tag.startsWith("en-") ? "en-GB" : t.tag;
  return new Intl.ListFormat(tag, { type: "conjunction" }).format(xs);
}
