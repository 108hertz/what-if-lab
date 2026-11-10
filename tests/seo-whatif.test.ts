import { describe, expect, it } from "vitest";
import { SANDBOXES } from "@/worlds/sims";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { absUrl } from "@/lib/i18n/seo";
import { pageCopy } from "@/components/shell/pageCopy";
import { whatifCopy, whatifMeta, withUnit } from "@/components/pages/WhatIfPage";
import { WHATIF_PAGE_LOCALES, whatifHref, whatifPages } from "@/lib/seo/whatifPages";
import { whatifLd } from "@/lib/seo/jsonld";
import sitemap from "@/app/sitemap";

/**
 * Change 0033, step 6: a page for every what-if with a question, in English. Its words come from the run (the answer),
 * its head has the question as the title, its own picture and no languages it is not built in, the sitemap lists it and
 * the world's intro links to it.
 */
const pages = SANDBOX_KEYS.flatMap((k) => whatifPages(SANDBOXES[k]));

describe("what-if pages", () => {
  it("one per what-if with a question, every URL different", () => {
    const n = SANDBOX_KEYS.reduce((s, k) => s + Object.keys(SANDBOXES[k].questions ?? {}).length, 0);
    expect(pages).toHaveLength(n);
    expect(new Set(pages.map((p) => p.path)).size).toBe(n);
    for (const p of pages) expect(p.path).toMatch(/^\/lab\/[a-z]+\/[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("are English only for now", () => expect(WHATIF_PAGE_LOCALES).toEqual(["en"]));

  it("are all in the sitemap, once, without languages they are not built in", () => {
    const urls = sitemap().map((e) => e.url);
    for (const p of pages) expect(urls.filter((u) => u === absUrl(p.path))).toHaveLength(1);
    const es = sitemap().filter((e) => e.url.includes("/es/lab/") && e.url.split("/").length > 6);
    expect(es).toEqual([]);
  });

  it("are linked from their world's intro in English, not (yet) from other languages", () => {
    for (const k of SANDBOX_KEYS) {
      const hrefs = pageCopy("en", k).whatifs.map((w) => w.href).filter(Boolean);
      expect(hrefs.sort()).toEqual(whatifPages(SANDBOXES[k]).map((p) => p.path).sort());
      expect(pageCopy("de", k).whatifs.every((w) => w.href === null)).toBe(true);
    }
    expect(whatifHref(SANDBOXES.solar, "nosun", "fr")).toBeNull();
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
    expect(m.alternates?.languages).toBeUndefined();
    const og = m.openGraph as { images: { url: string }[]; alternateLocale?: string[] };
    expect(og.images[0].url).toBe(`/og/${p.world}/${p.slug}.jpg`);
    expect(og.alternateLocale).toBeUndefined();

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
