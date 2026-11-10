import { afterEach, describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { absUrl } from "@/lib/i18n/seo";
import { localePath, localeInfo } from "@/lib/i18n";
import { whatifCopy, whatifMeta } from "@/components/pages/WhatIfPage";
import { WHATIF_PAGE_LOCALES, whatifPages } from "@/lib/seo/whatifPages";

/**
 * Change 0033, step 7: the what-if pages in the 19 other languages. Same runs as English (the numbers and pictures are
 * shared), said in the page's own words, at its own URL, with its own canonical and Open Graph locale.
 */
const pages = SANDBOX_KEYS.flatMap((k) => whatifPages(SANDBOXES[k]));
const others = WHATIF_PAGE_LOCALES.filter((l) => l !== "en");

describe("what-if pages in other languages", () => {
  afterEach(() => new Promise((r) => setTimeout(r)));

  it.each(others.flatMap((l) => SANDBOX_KEYS.map((k) => [l, k] as const)))("%s %s: every page in its own words", (l, k) => {
    for (const p of pages.filter((x) => x.world === k)) {
      const en = whatifCopy("en", p.world, p.slug)!;
      const c = whatifCopy(l, p.world, p.slug)!;
      const where = `${l} ${p.world}/${p.slug}`;
      expect(c.question, where).not.toBe(en.question);
      expect(c.answer, where).not.toBe(en.answer);
      const text = JSON.stringify({ q: c.question, a: c.answer, d: c.description, w: c.words, r: c.related });
      expect(text, where).not.toMatch(/\{[a-z]\w*[},]/i);
      expect(text, where).not.toMatch(/undefined|NaN/);
      expect(c.related.every((r) => r.href.startsWith(`/${l}/lab/`)), where).toBe(true);
      const m = whatifMeta(l, p.world, p.slug);
      expect(m.alternates?.canonical, where).toBe(absUrl(localePath(l, p.path)));
      expect((m.openGraph as { locale?: string }).locale, where).toBe(localeInfo(l).og);
    }
  }, 30_000);

});
