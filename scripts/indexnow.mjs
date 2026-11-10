/**
 * IndexNow (change 0033, step 8): after a production build, tell Bing, Yandex, Naver, Seznam and the others that share
 * IndexNow (and through Bing: DuckDuckGo, Yahoo, Ecosia, Copilot, ChatGPT search) every URL in out/sitemap.xml, so new
 * and changed pages are crawled in hours instead of weeks. The key is public by design: search engines check it at
 * /<key>.txt on the same host. No secret, and the site itself never calls anything.
 *
 * Runs as `postbuild`; does nothing outside Vercel production unless forced (`npm run indexnow -- --force`). It logs and
 * never fails the build. On the very first deploy the key file is not live yet, so the engines may refuse once.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const INDEXNOW_KEY = "c7d0121f3a7ed6a662fc5cfe60f8ce41";
export const ENDPOINT = "https://api.indexnow.org/indexnow";
/** IndexNow takes at most 10,000 URLs per request. */
export const BATCH = 10_000;

/** The page URLs of a sitemap.xml (the <loc> of each <url>; alternates are the same pages in other languages). */
export const sitemapUrls = (xml) => [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));

/** The request bodies for a list of URLs on one host (URLs on other hosts are left out: IndexNow refuses them). */
export function indexNowBodies(urls, key = INDEXNOW_KEY) {
  if (!urls.length) return [];
  const origin = new URL(urls[0]).origin;
  const host = new URL(origin).host;
  const mine = [...new Set(urls.filter((u) => new URL(u).host === host))];
  const out = [];
  for (let i = 0; i < mine.length; i += BATCH) out.push({ host, key, keyLocation: `${origin}/${key}.txt`, urlList: mine.slice(i, i + BATCH) });
  return out;
}

async function main() {
  const force = process.argv.includes("--force");
  if (!force && process.env.VERCEL_ENV !== "production") return console.log("indexnow: skipped (not a Vercel production build)");
  let xml;
  try { xml = readFileSync(new URL("../out/sitemap.xml", import.meta.url), "utf8"); }
  catch { return console.log("indexnow: skipped (no out/sitemap.xml)"); }
  const bodies = indexNowBodies(sitemapUrls(xml));
  if (!bodies.length || /localhost|vercel\.app$/.test(bodies[0].host)) return console.log(`indexnow: skipped (host ${bodies[0]?.host ?? "none"})`);
  for (const body of bodies) {
    try {
      const r = await fetch(ENDPOINT, { method: "POST", headers: { "content-type": "application/json; charset=utf-8" }, body: JSON.stringify(body), signal: AbortSignal.timeout(15_000) });
      console.log(`indexnow: ${body.urlList.length} URLs for ${body.host} → ${r.status} ${r.statusText}`);
    } catch (e) {
      console.log(`indexnow: request failed (${e?.message ?? e}); the sitemap still reaches the engines`);
    }
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main().catch((e) => console.log("indexnow:", e?.message ?? e));
