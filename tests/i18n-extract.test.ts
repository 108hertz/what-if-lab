import { describe, expect, it } from "vitest";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import { sandboxEnglish } from "@/lib/sim/say";
import { OBJECT_MESSAGES } from "@/lib/scale/objects";
import { argNames, catalog, LOCALES } from "@/lib/i18n";

/**
 * Change 0025: English that lives in code (each world's labels and messages, the scale objects) is written to JSON for
 * translators. `npm run i18n:extract` writes the files; this test fails when they are out of date, and checks that
 * every other language's world/objects catalog matches English.
 */
const ROOT = join(__dirname, "..");
const WRITE = !!process.env.I18N_WRITE;

/** Dotted keys → nested JSON, sorted, with a marker that the file is generated. */
function nest(flat: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = { _status: "generated from code by npm run i18n:extract; edit the English in code" };
  for (const k of Object.keys(flat).sort()) {
    const parts = k.split(".");
    let o = out as Record<string, unknown>;
    for (const p of parts.slice(0, -1)) o = (o[p] ??= {}) as Record<string, unknown>;
    o[parts[parts.length - 1]] = flat[k];
  }
  return out;
}

const FILES: [file: string, ns: string, english: Record<string, string>][] = [
  ...SANDBOX_KEYS.map((k) => [`worlds/${k}/locales/en.json`, k, sandboxEnglish(SANDBOXES[k])] as [string, string, Record<string, string>]),
  ["lib/i18n/locales/en/objects.json", "objects", OBJECT_MESSAGES],
];

describe("generated English catalogs", () => {
  it.each(FILES.map((f) => f[0]))("%s is up to date", (file) => {
    const [, , english] = FILES.find((f) => f[0] === file)!;
    const want = JSON.stringify(nest(english), null, 2) + "\n";
    const path = join(ROOT, file);
    if (WRITE) { mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, want); }
    expect(existsSync(path) ? readFileSync(path, "utf8") : "(missing)", "run npm run i18n:extract").toBe(want);
  });

  it("keys never collide with a nested key (a key is either words or a group)", () => {
    for (const [file, , english] of FILES) {
      const keys = Object.keys(english);
      for (const k of keys) expect(keys.some((o) => o.startsWith(k + ".")), `${file}: ${k}`).toBe(false);
    }
  });
});

describe("translations of world and object words", () => {
  it("are checked for every language that has them", () => expect(FILES.length).toBeGreaterThan(0));
  for (const [file, ns, english] of FILES) {
    const dir = dirname(join(ROOT, file));
    const others = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json") : [];
    const langs = file.startsWith("worlds/") ? others.map((f) => f.replace(".json", "")) : LOCALES.map((l) => l.code).filter((c) => c !== "en" && existsSync(join(ROOT, `lib/i18n/locales/${c}/objects.json`)));
    for (const code of langs) {
      it(`${ns} in ${code} matches English placeholders`, () => {
        const path = file.startsWith("worlds/") ? join(dir, `${code}.json`) : join(ROOT, `lib/i18n/locales/${code}/objects.json`);
        const msgs = catalog(ns, JSON.parse(readFileSync(path, "utf8")));
        for (const [k, v] of Object.entries(msgs)) {
          const rel = k.slice(ns.length + 1);
          expect(english, `${code}: ${k} is not an English key`).toHaveProperty([rel]);
          expect(argNames(v), `${code}: ${k}`).toEqual(argNames(english[rel]));
        }
      });
    }
  }
});
