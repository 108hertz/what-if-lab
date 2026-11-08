import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  LOCALES, DEFAULT_LOCALE, PREFIXED_LOCALES, READY_LOCALES, isLocale, localeInfo,
  format, argNames, pluralCases, MessageError, catalog, createT, merge, ref, type Messages,
} from "@/lib/i18n";

/** Change 0025, step 1: the translation core (ADR 0010). */
const ROOT = join(__dirname, "..");
const LOC_DIR = join(ROOT, "lib/i18n/locales");

describe("locales", () => {
  it("has 20 languages with unique codes and English first", () => {
    expect(LOCALES).toHaveLength(20);
    expect(new Set(LOCALES.map((l) => l.code)).size).toBe(20);
    expect(LOCALES[0].code).toBe(DEFAULT_LOCALE);
    expect(PREFIXED_LOCALES).not.toContain("en");
    expect(PREFIXED_LOCALES).toHaveLength(19);
  });

  it("every tag is understood by Intl", () => {
    for (const l of LOCALES) {
      expect(Intl.NumberFormat.supportedLocalesOf([l.tag]), l.tag).toHaveLength(1);
      expect(Intl.PluralRules.supportedLocalesOf([l.tag]), l.tag).toHaveLength(1);
    }
  });

  it("only Arabic reads right to left; unknown codes fall back to English", () => {
    expect(LOCALES.filter((l) => l.dir === "rtl").map((l) => l.code)).toEqual(["ar"]);
    expect(isLocale("de")).toBe(true);
    expect(isLocale("xx-nope")).toBe(false);
    expect(localeInfo("xx-nope").code).toBe("en");
  });

  it("the first five languages are ready (change 0025, step 14)", () => {
    expect(READY_LOCALES().map((l) => l.code)).toEqual(["en", "es", "pt", "de", "ja", "ar"]);
  });
});

describe("message format", () => {
  it("fills arguments and keeps unknown ones visible", () => {
    expect(format("Hello {name}", "en", { name: "Ada" })).toBe("Hello Ada");
    expect(format("Hello {name}", "en")).toBe("Hello {name}");
  });

  it("formats numbers in the language's style", () => {
    expect(format("{n} km", "en", { n: 12345.5 })).toBe("12,345.5 km");
    expect(format("{n, number} km", "de", { n: 12345.5 })).toBe("12.345,5 km");
  });

  it("chooses plural forms by the language's rules", () => {
    const kids = "{n, plural, =0 {no kids} one {# kid} other {# kids}}";
    expect(format(kids, "en", { n: 0 })).toBe("no kids");
    expect(format(kids, "en", { n: 1 })).toBe("1 kid");
    expect(format(kids, "en", { n: 1200 })).toBe("1,200 kids");
    const ru = "{n, plural, one {# ребёнок} few {# ребёнка} many {# детей} other {# ребёнка}}";
    expect(format(ru, "ru", { n: 1 })).toBe("1 ребёнок");
    expect(format(ru, "ru", { n: 3 })).toBe("3 ребёнка");
    expect(format(ru, "ru", { n: 5 })).toBe("5 детей");
    expect(format(ru, "ru", { n: 21 })).toBe("21 ребёнок");
  });

  it("selects, nests and quotes", () => {
    const m = "{who, select, base {No change} alt {With {n, plural, one {# change} other {# changes}}} other {?}}";
    expect(format(m, "en", { who: "base", n: 2 })).toBe("No change");
    expect(format(m, "en", { who: "alt", n: 2 })).toBe("With 2 changes");
    expect(format(m, "en", { who: "x" })).toBe("?");
    expect(format("Use '{braces}' and it''s fine", "en")).toBe("Use {braces} and it's fine");
  });

  it("rejects broken messages", () => {
    expect(() => format("{n, plural, one {x}}", "en", { n: 1 })).toThrow(MessageError);
    expect(() => format("{n, date}", "en")).toThrow(MessageError);
    expect(() => format("oops }", "en")).toThrow(MessageError);
  });

  it("lists argument names and plural cases", () => {
    expect(argNames("{a} and {n, plural, one {# {b}} other {# {c}}}")).toEqual(["a", "b", "c", "n"]);
    expect(pluralCases("{n, plural, =0 {x} one {y} other {z}}")).toEqual([["=0", "one", "other"]]);
  });
});

describe("t()", () => {
  const en = catalog("demo", { planet: { earth: "Earth" }, escape: "{planet} escapes", count: "{n, plural, one {# day} other {# days}}" });
  const de = catalog("demo", { planet: { earth: "Erde" }, escape: "{planet} entkommt" });

  it("flattens namespaces into dotted keys and skips metadata", () => {
    expect(catalog("ns", { _status: "draft", a: { b: "x" }, c: "y" })).toEqual({ "ns.a.b": "x", "ns.c": "y" });
    expect(merge({ a: "1" }, { b: "2" })).toEqual({ a: "1", b: "2" });
  });

  it("translates, resolves references and falls back to English", () => {
    const missing: string[] = [];
    const t = createT({ locale: "de", messages: de, fallback: en, onMissing: (k) => missing.push(k) });
    expect(t("demo.escape", { planet: ref("demo.planet.earth") })).toBe("Erde entkommt");
    expect(t("demo.count", { n: 1000 })).toBe("1.000 days");
    expect(t("demo.count", { n: 2000 })).toBe("2.000 days");
    expect(t("demo.nothing")).toBe("demo.nothing");
    expect(missing).toEqual(["demo.count", "demo.nothing"]);
    expect(t.dir).toBe("ltr");
    expect(t.num(1234.5, { maximumFractionDigits: 1 })).toBe("1.234,5");
    expect(t.num(NaN)).toBe("—");
  });

  it("knows its direction and tag", () => {
    const t = createT({ locale: "ar", messages: {} });
    expect(t.dir).toBe("rtl");
    expect(t.tag).toBe("ar");
    expect(createT({ locale: "pt", messages: {} }).tag).toBe("pt-BR");
  });
});

/* ---------- catalogs on disk: every language matches English ---------- */

function loadDir(code: string): Messages {
  const dir = join(LOC_DIR, code);
  if (!existsSync(dir)) return {};
  return merge(...readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => catalog(f.replace(/\.json$/, ""), JSON.parse(readFileSync(join(dir, f), "utf8")))));
}

describe("catalogs", () => {
  const en = loadDir("en");

  it("English has messages and every one parses", () => {
    expect(Object.keys(en).length).toBeGreaterThan(0);
    for (const [k, v] of Object.entries(en)) expect(() => argNames(v), k).not.toThrow();
  });

  const present = LOCALES.filter((l) => l.code !== "en" && existsSync(join(LOC_DIR, l.code)));
  it.each(present.length ? present.map((l) => l.code) : ["(none yet)"])("%s matches English placeholders", (code) => {
    if (code === "(none yet)") return;
    const msgs = loadDir(code);
    for (const [k, v] of Object.entries(msgs)) {
      expect(en, `${code}: ${k} is not an English key`).toHaveProperty([k]);
      expect(argNames(v), `${code}: ${k}`).toEqual(argNames(en[k]));
    }
  });

  it.each(LOCALES.filter((l) => l.ready && l.code !== "en").map((l) => l.code).concat(["(none ready)"]))("%s (ready) has every English key", (code) => {
    if (code === "(none ready)") return;
    const msgs = loadDir(code);
    for (const k of Object.keys(en)) expect(msgs, `${code} misses ${k}`).toHaveProperty([k]);
  });
});
