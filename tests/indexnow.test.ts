import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
// @ts-expect-error -- a plain Node script, no type declarations
import { BATCH, INDEXNOW_KEY, indexNowBodies, sitemapUrls } from "../scripts/indexnow.mjs";
import { sitemapEntries } from "@/lib/i18n/seo";

/** Change 0033, step 8: the IndexNow key is served from public/, and the script sends the sitemap's pages on one host. */
describe("IndexNow", () => {
  it("has its key file in public/", () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/);
    const f = `public/${INDEXNOW_KEY}.txt`;
    expect(existsSync(f)).toBe(true);
    expect(readFileSync(f, "utf8").trim()).toBe(INDEXNOW_KEY);
  });

  it("reads the page URLs of a sitemap, not the alternates", () => {
    const xml = `<?xml version="1.0"?><urlset><url><loc>https://www.whatif.science/</loc><xhtml:link rel="alternate" hreflang="es" href="https://www.whatif.science/es"/></url>
<url><loc> https://www.whatif.science/lab/solar?a=1&amp;b=2 </loc></url></urlset>`;
    expect(sitemapUrls(xml)).toEqual(["https://www.whatif.science/", "https://www.whatif.science/lab/solar?a=1&b=2"]);
  });

  it("sends each URL once, only on the sitemap's host, in batches IndexNow takes", () => {
    const urls = sitemapEntries(["/", "/lab/solar"], "https://www.whatif.science").map((e) => e.url);
    const [b, ...rest] = indexNowBodies([...urls, urls[0], "https://other.example/x"]);
    expect(rest).toEqual([]);
    expect(b).toEqual({ host: "www.whatif.science", key: INDEXNOW_KEY, keyLocation: `https://www.whatif.science/${INDEXNOW_KEY}.txt`, urlList: urls });
    const many = Array.from({ length: BATCH + 5 }, (_, i) => `https://www.whatif.science/p${i}`);
    expect(indexNowBodies(many).map((x: { urlList: string[] }) => x.urlList.length)).toEqual([BATCH, 5]);
    expect(indexNowBodies([])).toEqual([]);
  });
});
