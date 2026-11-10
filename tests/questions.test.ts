import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";

/**
 * What-if questions (change 0033, step 4): the words of each what-if's own page. Slugs are the page URLs
 * (`/lab/<world>/<slug>`) and must never change once shipped, so they are listed in tests/what-if-slugs.json:
 * a renamed or removed slug fails here. A new what-if: run with SLUGS_WRITE=1 to add its slug to the list.
 */
const FILE = join(__dirname, "what-if-slugs.json");
/** What-ifs with no page: they only make sense with the visitor's own settings. */
const NO_PAGE = new Set(["earth:mix"]);

const slugs = () =>
  Object.fromEntries(SANDBOX_KEYS.map((k) => [k, Object.fromEntries(Object.entries(SANDBOXES[k].questions ?? {}).map(([id, x]) => [id, x.slug]))]));

describe("what-if questions", () => {
  it.each(SANDBOX_KEYS)("%s: every what-if has a question, or is listed as having no page", (k) => {
    const sb = SANDBOXES[k], qs = sb.questions ?? {};
    for (const [id] of sb.whatifs) expect(!!qs[id] !== NO_PAGE.has(`${k}:${id}`), `${k}:${id}`).toBe(true);
    for (const id of Object.keys(qs)) expect(sb.whatifs.some(([w]) => w === id), `${k}: question for unknown what-if ${id}`).toBe(true);
  });

  it.each(SANDBOX_KEYS)("%s: questions read as questions; slugs are unique URL words", (k) => {
    const qs = Object.values(SANDBOXES[k].questions ?? {});
    for (const { q, slug } of qs) {
      expect(q).toMatch(/^What if .+\?$/);
      expect(q.length, q).toBeLessThanOrEqual(70);
      expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(slug.length, slug).toBeLessThanOrEqual(50);
    }
    expect(new Set(qs.map((x) => x.slug)).size).toBe(qs.length);
    expect(new Set(qs.map((x) => x.q)).size).toBe(qs.length);
  });

  it("slugs never change once listed", () => {
    if (process.env.SLUGS_WRITE) {
      // Keep every listed slug; add only new ones.
      const old = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : {};
      const now = slugs();
      for (const k of Object.keys(now)) now[k] = { ...now[k], ...(old[k] ?? {}) };
      writeFileSync(FILE, JSON.stringify(now, null, 2) + "\n");
    }
    const listed: Record<string, Record<string, string>> = JSON.parse(readFileSync(FILE, "utf8"));
    expect(slugs()).toEqual(listed);
  });
});
