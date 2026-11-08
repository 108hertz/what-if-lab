import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Change 0025, step 5: shared UI says every word through the catalogs. This catches English written straight into JSX
 * (a text node or a label-like attribute). Worlds are checked as each moves its words (steps 7–13).
 */
const ROOT = join(__dirname, "..");
const DIRS = ["components"];

function files(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(ROOT, p)).isDirectory() ? files(p) : /\.tsx$/.test(f) ? [p] : [];
  });
}

const TEXT_NODE = />\s*([A-Z][a-z]+(?:[ ,'’][A-Za-z]+)*[.…?]?)\s*<\//;
const ATTR = /\b(aria-label|title|placeholder|label|note|alt)="([A-Za-z][^"]*)"/;

describe("no hard-coded English in shared UI", () => {
  it.each(DIRS.flatMap(files))("%s", (file) => {
    const found: string[] = [];
    readFileSync(join(ROOT, file), "utf8").split("\n").forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const m = TEXT_NODE.exec(line) ?? ATTR.exec(line);
      if (m) found.push(`${i + 1}: ${m[0]}`);
    });
    expect(found).toEqual([]);
  });
});

/**
 * Worlds whose words have moved into keys (steps 7–13 add each world here): no English left in JSX, and nothing drawn on
 * the canvas from a literal string.
 */
const WORLDS_DONE = ["galaxy", "solar", "earth", "country", "animals", "child", "person"];
const CANVAS_LITERAL = /(?:fillText|chip|textRow)\(\s*(?:ctx,\s*)?(["'`])[^"'`]*[A-Za-z]{2}/;

describe.each(WORLDS_DONE)("no hard-coded English in the %s world", (key) => {
  it.each(code(`worlds/${key}`))("%s", (file) => {
    const found: string[] = [];
    readFileSync(join(ROOT, file), "utf8").split("\n").forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const m = CANVAS_LITERAL.exec(line) ?? (file.endsWith(".tsx") ? TEXT_NODE.exec(line) ?? ATTR.exec(line) : null);
      if (m) found.push(`${i + 1}: ${m[0]}`);
    });
    expect(found).toEqual([]);
  });
});

/** Shared drawing code (charts, exports, the scale) never draws a literal English string either. */
function code(dir: string): string[] {
  return readdirSync(join(ROOT, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(ROOT, p)).isDirectory() ? code(p) : /\.tsx?$/.test(f) ? [p] : [];
  });
}

describe("no literal English drawn by shared code", () => {
  it.each(["components", "lib"].flatMap(code))("%s", (file) => {
    const found: string[] = [];
    readFileSync(join(ROOT, file), "utf8").split("\n").forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      const m = CANVAS_LITERAL.exec(line);
      if (m) found.push(`${i + 1}: ${m[0]}`);
    });
    expect(found).toEqual([]);
  });
});
