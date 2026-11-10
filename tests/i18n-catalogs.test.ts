import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SHARED_NS } from "@/lib/i18n/english";
import { argNames, catalog, format, LOCALES, localeInfo, pluralCases, type Json } from "@/lib/i18n";
import { compile } from "@/lib/i18n/message";

/**
 * Change 0025, step 14: every translated catalog file, compared with its English file key by key.
 * - Always: every message parses, keeps English's placeholders, uses the select cases English uses, has `other` in
 *   every plural, and only plural categories the language has. No keys English does not have.
 * - For ready languages, or the language in I18N_FULL (e.g. `I18N_FULL=de npx vitest run tests/i18n-catalogs.test.ts`):
 *   no English key is missing.
 */
const ROOT = join(__dirname, "..");
const FULL = process.env.I18N_FULL;

const read = (p: string) => (existsSync(join(ROOT, p)) ? (JSON.parse(readFileSync(join(ROOT, p), "utf8")) as Json) : null);

/** [English file, the file for a language] for every catalog. */
const PAIRS: [string, (code: string) => string][] = [
  ...[...SHARED_NS, "pages"].map((ns) => [`lib/i18n/locales/en/${ns}.json`, (c: string) => `lib/i18n/locales/${c}/${ns}.json`] as [string, (c: string) => string]),
  ...SANDBOX_KEYS.map((k) => [`worlds/${k}/locales/en.json`, (c: string) => `worlds/${k}/locales/${c}.json`] as [string, (c: string) => string]),
];

const CATEGORIES = (tag: string) => new Set([...new Intl.PluralRules(tag).resolvedOptions().pluralCategories, ...new Intl.PluralRules(tag, { type: "ordinal" }).resolvedOptions().pluralCategories]);

/** Select arguments and their cases, "d:bit,much,other" (plural cases are checked against the language instead). */
function selectCases(src: string): string[] {
  const out: string[] = [];
  const walk = (ns: unknown[]) => {
    for (const n of ns as Record<string, unknown>[]) {
      if (typeof n !== "object" || !n) continue;
      const cases = (n.select ?? n.plural) as Record<string, unknown[]> | undefined;
      if (n.select) out.push(`${n.a}:${Object.keys(n.select as object).sort()}`);
      if (cases) Object.values(cases).forEach(walk);
    }
  };
  walk(compile(src) as unknown[]);
  return out.sort();
}

const others = LOCALES.filter((l) => l.code !== "en" && PAIRS.some(([, f]) => existsSync(join(ROOT, f(l.code)))));

describe.each(others.length ? others.map((l) => l.code) : ["(none yet)"])("catalogs in %s", (code) => {
  if (code === "(none yet)") return it("none yet", () => {});
  const tag = localeInfo(code).tag, cats = CATEGORIES(tag);
  const full = FULL === code || localeInfo(code).ready;

  it.each(PAIRS.map(([en, f]) => [en, f(code)]))("%s → %s", (enFile, file) => {
    const enJson = read(enFile)!, json = read(file);
    if (!json) { if (full) expect.fail(`${file} is missing`); return; }
    const en = catalog("x", enJson), tr = catalog("x", json);
    const problems: string[] = [];
    for (const [k, v] of Object.entries(tr)) {
      if (!(k in en)) { problems.push(`${k}: not an English key`); continue; }
      try { compile(v); format(v, tag, {}); } catch (e) { problems.push(`${k}: does not parse (${(e as Error).message})`); continue; }
      if (argNames(v).join() !== argNames(en[k]).join()) problems.push(`${k}: placeholders ${argNames(v)} ≠ English ${argNames(en[k])}`);
      if (selectCases(v).join() !== selectCases(en[k]).join()) problems.push(`${k}: select cases differ from English`);
      for (const cases of pluralCases(v)) {
        if (!cases.includes("other")) problems.push(`${k}: a plural without "other"`);
        for (const c of cases) if (!c.startsWith("=") && !cats.has(c as Intl.LDMLPluralRule)) problems.push(`${k}: "${c}" is not a plural category in ${code}`);
      }
    }
    if (full) for (const k of Object.keys(en)) if (!(k in tr)) problems.push(`${k}: missing`);
    expect(problems).toEqual([]);
  });
});
