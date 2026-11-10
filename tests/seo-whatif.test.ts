import { afterEach, describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { absUrl } from "@/lib/i18n/seo";
import { READY_LOCALES, localePath } from "@/lib/i18n";
import { pageCopy } from "@/components/shell/pageCopy";
import { whatifCopy, whatifMeta, withUnit } from "@/components/pages/WhatIfPage";
import { WHATIF_PAGE_LOCALES, whatifHref, whatifPages } from "@/lib/seo/whatifPages";
import { whatifLd } from "@/lib/seo/jsonld";
import sitemap from "@/app/sitemap";

/**
 * Change 0033, steps 6–7: a page for every what-if with a question, in every ready language. Its words come from the run
 * (the answer), its head has the question as the title, its own picture and hreflang to the same page in the other
 * languages, the sitemap lists it and the world's intro links to it.
 */
const pages = SANDBOX_KEYS.flatMap((k) => whatifPages(SANDBOXES[k]));

describe("what-if pages", () => {
  // The tests are synchronous and long together: let the worker answer vitest between them
  afterEach(() => new Promise((r) => setTimeout(r)));

  it("one per what-if with a question, every URL different", () => {
    const n = SANDBOX_KEYS.reduce((s, k) => s + Object.keys(SANDBOXES[k].questions ?? {}).length, 0);
    expect(pages).toHaveLength(n);
    expect(new Set(pages.map((p) => p.path)).size).toBe(n);
    for (const p of pages) expect(p.path).toMatch(/^\/lab\/[a-z]+\/[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("are built in every ready language", () => expect([...WHATIF_PAGE_LOCALES].sort()).toEqual(READY_LOCALES().map((l) => l.code).sort()));

  it("are all in the sitemap, once per language, with every language as an alternate", () => {
    const s = sitemap();
    const urls = s.map((e) => e.url);
    for (const p of pages)
      for (const l of WHATIF_PAGE_LOCALES) {
        const u = absUrl(localePath(l, p.path));
        expect(urls.filter((x) => x === u), u).toHaveLength(1);
        const alt = s.find((e) => e.url === u)!.alternates!.languages as Record<string, string>;
        expect(Object.keys(alt)).toHaveLength(WHATIF_PAGE_LOCALES.length + 1); // + x-default
        expect(alt["x-default"]).toBe(absUrl(p.path));
      }
  });

  it("are linked from their world's intro in every language", () => {
    for (const k of SANDBOX_KEYS)
      for (const l of WHATIF_PAGE_LOCALES) {
        const hrefs = pageCopy(l, k).whatifs.map((w) => w.href).filter(Boolean);
        expect(hrefs.sort()).toEqual(whatifPages(SANDBOXES[k]).map((p) => localePath(l, p.path)).sort());
      }
    expect(whatifHref(SANDBOXES.solar, "nosun", "fr")).toBe(`/fr/lab/solar/${SANDBOXES.solar.questions!.nosun.slug}`);
  });

  it.each(pages.map((p) => [`${p.world}/${p.slug}`, p] as const))("%s: question, computed answer, head and structured data", (_, p) => {
    const c = whatifCopy("en", p.world, p.slug)!;
    const sb = SANDBOXES[p.world];
    expect(c.question).toBe(sb.questions![p.id].q);
    // The answer names a time, a measure and both worlds' values, and nothing is left unsaid
    expect(c.answer).toMatch(/^In this model, by .+: .+ with the change, .+ without it\.$/);
    expect(c.answer).not.toMatch(/\{|undefined|NaN|—/);
    expect(c.description.startsWith(c.answer)).toBe(true);
    expect(c.related.length).toBe(whatifPages(sb).length - 1);
    expect(c.related.map((r) => r.href)).not.toContain(p.path);

    const m = whatifMeta("en", p.world, p.slug);
    expect(m.title).toBe(`${c.question} · What-If Simulations - Fun Lab`);
    expect(m.description).toBe(c.description);
    expect(m.alternates?.canonical).toBe(absUrl(p.path));
    expect(Object.keys(m.alternates?.languages ?? {})).toHaveLength(WHATIF_PAGE_LOCALES.length + 1);
    const og = m.openGraph as { images: { url: string }[]; alternateLocale?: string[] };
    expect(og.images[0].url).toBe(`/og/${p.world}/${p.slug}.jpg`);
    expect(og.alternateLocale).toHaveLength(WHATIF_PAGE_LOCALES.length - 1);

    const ld = whatifLd({ locale: "en", path: p.path, worldPath: `/lab/${p.world}`, question: c.question, answer: c.answer, description: c.description, worldName: c.world, homeName: "What-If Simulations - Fun Lab", image: `/og/${p.world}/${p.slug}.jpg` });
    const json = JSON.stringify(ld);
    expect(json).toContain(c.question);
    expect(json).toContain(JSON.stringify(c.answer).slice(1, -1));
  });

  it("names animals by species, not by slot", () => {
    const c = whatifCopy("en", "animals", whatifPages(SANDBOXES.animals)[0].slug)!;
    expect(JSON.stringify(c.words)).not.toMatch(/Animal \d/);
  });

  it("joins a value and its unit", () => {
    expect(withUnit("225", "°C")).toBe("225 °C");
    expect(withUnit("74", "/100")).toBe("74/100");
    expect(withUnit("50", "%")).toBe("50%");
    expect(withUnit("—", "kids")).toBe("—");
    expect(withUnit("3.0×", "")).toBe("3.0×");
  });
});
