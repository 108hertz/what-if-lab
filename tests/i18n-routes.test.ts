import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { LOCALES, PREFIXED_LOCALES, langParams, localePath, splitLocale } from "@/lib/i18n";
import { pageMessages } from "@/lib/i18n/load";
import { EN_SHARED } from "@/lib/i18n/english";
import { MODES, modeHref } from "@/worlds/registry";

/** Change 0025, step 2: language URLs (ADR 0010). */
const ROOT = join(__dirname, "..");

describe("language paths", () => {
  it("keeps English at today's URLs and prefixes the rest", () => {
    expect(localePath("en", "/")).toBe("/");
    expect(localePath("en", "/lab/earth")).toBe("/lab/earth");
    expect(localePath("de", "/")).toBe("/de");
    expect(localePath("de", "/lab/earth")).toBe("/de/lab/earth");
    expect(localePath("nope", "/lab/earth")).toBe("/lab/earth");
  });

  it("splits a path back into language and English path", () => {
    expect(splitLocale("/de/lab/earth")).toEqual(["de", "/lab/earth"]);
    expect(splitLocale("/ja")).toEqual(["ja", "/"]);
    expect(splitLocale("/lab/earth")).toEqual(["en", "/lab/earth"]);
    expect(splitLocale("/en/lab")).toEqual(["en", "/en/lab"]);
    for (const l of LOCALES) for (const m of MODES) {
      const [code, path] = splitLocale(modeHref(m, l.code));
      expect(code).toBe(l.code);
      expect(path).toBe(modeHref(m));
    }
  });

  it("gives every mode × language its own page", () => {
    const all = LOCALES.flatMap((l) => MODES.map((m) => modeHref(m, l.code)));
    expect(new Set(all).size).toBe(LOCALES.length * MODES.length);
    expect(langParams().map((p) => p.lang)).toEqual(PREFIXED_LOCALES);
  });

  it("builds pages for every language from both route trees", () => {
    for (const f of ["app/(en)/layout.tsx", "app/(en)/page.tsx", "app/(en)/lab/[world]/page.tsx", "app/[lang]/layout.tsx", "app/[lang]/page.tsx", "app/[lang]/lab/[world]/page.tsx"])
      expect(existsSync(join(ROOT, f)), f).toBe(true);
    expect(readFileSync(join(ROOT, "app/[lang]/layout.tsx"), "utf8")).toMatch(/generateStaticParams\(\)\s*{\s*return langParams\(\)/);
  });
});

describe("page messages", () => {
  it("English pages carry no words (English is in the bundle)", () => {
    expect(pageMessages("en").messages).toEqual({});
    expect(pageMessages("en", "earth").messages).toEqual({});
  });

  it("other languages carry only their own words", () => {
    const m = pageMessages("de");
    for (const k of Object.keys(m.messages)) expect(k).toMatch(/^(common|shell|console|account|scale|export|objects)\./);
  });

  it("the built-in English has the shared words", () => {
    expect(EN_SHARED["common.site.name"]).toBe("What-If Simulations - Fun Lab");
  });
});

describe("pseudo-language (dev)", () => {
  it("accents, lengthens and brackets every message, including English in code", async () => {
    const { createT, scoped, pseudoize } = await import("@/lib/i18n");
    expect(pseudoize("Play")).toBe("⟦Ƥļáý··⟧".replace("Ƥ", "Þ"));
    const t = createT({ locale: "en", messages: { "a.b": "Hello {n}" }, pseudo: true });
    expect(t("a.b", { n: 3 })).toBe(pseudoize("Hello 3"));
    expect(scoped(t, "w", { x: "World" })("x")).toBe(pseudoize("World"));
    expect(pseudoize(pseudoize("Twice"))).toBe(pseudoize("Twice"));
  });
});
