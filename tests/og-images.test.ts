import { describe, expect, it, vi } from "vitest";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SANDBOX_KEYS } from "@/worlds/registry";
import { SANDBOXES } from "@/worlds/sims";
import { defaultParams } from "@/lib/sim/core";
import { setCanvasFont } from "@/lib/sim/draw";
import { DEFAULT_SEED } from "@/lib/sim/engine";
import type { AnySandbox, BaseWorld, Params, SandboxKey } from "@/lib/sim/types";
import { runAnswer } from "@/lib/seo/answer";
import { whatifPages } from "@/lib/seo/whatifPages";

/**
 * Share images for the world pages (change 0033, step 2): public/og/<world>.png, 1200×630. Each is the world's own stage,
 * drawn by its sandbox's draw() after a short default run, with the site mark and name in a corner. No other words, so
 * one image serves all 20 languages (the share preview shows the page's translated title beside it).
 *
 * `npm run og:images` draws them (OG_WRITE=1, needs @napi-rs/canvas and fetches the Barlow fonts once); without the flag
 * this test only checks that every world has its image. Redraw when a world's stage changes.
 *
 * Step 6: each what-if page's pictures, public/og/<world>/<slug>.jpg (the changed world) and public/og/<world>/no-change.jpg
 * (the world left as it was), both at the page's horizon from the same run as its answer (lib/seo/answer.ts). JPEG keeps
 * 108 pictures small; every share preview reads it. Redraw them when a world's stage or its answer setup changes.
 */
const ROOT = join(__dirname, "..");
const WRITE = !!process.env.OG_WRITE;
const W = 1200, H = 630;

/** How far each world runs before its picture is taken (sim units, see each world's fmtT). */
export const SHOT_T: Record<SandboxKey, number> = { galaxy: 12.5, solar: 0.6, earth: 40, country: 8, animals: 90, child: 12, person: 0.5 };
/** A what-if applied at the start, for worlds whose untouched stage shows little (a habit for 100 versions of a person). */
const SHOT_WHATIF: Partial<Record<SandboxKey, string>> = { person: "exercise" };

const imagePath = (k: SandboxKey) => join(ROOT, "public", "og", `${k}.png`);
const whatifPath = (k: SandboxKey, slug: string) => join(ROOT, "public", "og", k, `${slug}.jpg`);
const UI = () => ({ drag: null, cams: [null, null] as [null, null], pending: null });

/** JPEG width and height from its start-of-frame marker. */
function jpegSize(buf: Buffer): [number, number] {
  for (let i = 2; i < buf.length - 9;) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    if (m >= 0xc0 && m <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)];
    i += 2 + buf.readUInt16BE(i + 2);
  }
  return [0, 0];
}

/** PNG width and height from the IHDR chunk. */
function pngSize(buf: Buffer): [number, number] {
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

describe("world share images", () => {
  it("covers every world", () => expect(Object.keys(SHOT_T).sort()).toEqual([...SANDBOX_KEYS].sort()));

  if (WRITE) {
    it("draws them", async () => {
      const { createCanvas, GlobalFonts } = await import("@napi-rs/canvas");
      await loadFonts(GlobalFonts);
      setCanvasFont("Barlow", "JetBrains Mono", "Barlow Semi Condensed");
      // Stages that build offscreen layers ask the document for a canvas.
      const g = globalThis as Record<string, unknown>;
      g.document ??= { createElement: () => createCanvas(1, 1) };
      g.OffscreenCanvas ??= function OffscreenCanvas(w: number, h: number) { return createCanvas(w, h); };
      mkdirSync(join(ROOT, "public", "og"), { recursive: true });
      for (const k of SANDBOX_KEYS) {
        const sb = SANDBOXES[k];
        const p = defaultParams(sb);
        const w = sb.init(p, DEFAULT_SEED);
        const wi = SHOT_WHATIF[k];
        if (wi) sb.apply(w, wi, p, { drag: null, cams: [null, null], pending: null });
        const speed = sb.speeds[sb.defaultSpeed]?.[0] || sb.speeds.find(([s]) => s > 0)?.[0] || 1;
        const dt = speed / 30;
        while (w.t < SHOT_T[k]) sb.step(w, dt, p);
        writeFileSync(imagePath(k), shot(createCanvas, sb, w, p, false).toBuffer("image/png"));
      }
    }, 120_000);

    it("draws the what-if pages' pictures", async () => {
      const { createCanvas } = await import("@napi-rs/canvas");
      for (const k of SANDBOX_KEYS) {
        const sb = SANDBOXES[k];
        mkdirSync(join(ROOT, "public", "og", k), { recursive: true });
        for (const [i, x] of whatifPages(sb).entries()) {
          const r = runAnswer(sb, x.id);
          // Stages keep draw-only memory between frames (captions, eased meters): each picture is a first frame
          if (i === 0) writeFileSync(whatifPath(k, "no-change"), shot(createCanvas, await fresh(k), r.base, r.p, false).toBuffer("image/jpeg", 82));
          writeFileSync(whatifPath(k, x.slug), shot(createCanvas, await fresh(k), r.alt, r.p, true, r.base).toBuffer("image/jpeg", 82));
        }
      }
    }, 300_000);
  }

  it.each(SANDBOX_KEYS)("%s has a 1200×630 image", (k) => {
    expect(existsSync(imagePath(k)), "run npm run og:images").toBe(true);
    expect(pngSize(readFileSync(imagePath(k)))).toEqual([W, H]);
  });

  it.each(SANDBOX_KEYS)("%s has a 1200×630 picture for each what-if page and for no change", (k) => {
    const slugs = whatifPages(SANDBOXES[k]).map((x) => x.slug);
    expect(slugs, "a slug would overwrite the no-change picture").not.toContain("no-change");
    for (const slug of ["no-change", ...slugs]) {
      expect(existsSync(whatifPath(k, slug)), `${k}/${slug}: run npm run og:images`).toBe(true);
      expect(jpegSize(readFileSync(whatifPath(k, slug))), `${k}/${slug}`).toEqual([W, H]);
    }
  });
});

/** A world's sandbox from freshly loaded modules, so no renderer memory from an earlier picture is left. */
async function fresh(k: SandboxKey): Promise<AnySandbox> {
  vi.resetModules();
  (await import("@/lib/sim/draw")).setCanvasFont("Barlow", "JetBrains Mono", "Barlow Semi Condensed");
  return (await import("@/worlds/sims")).SANDBOXES[k];
}

type MakeCanvas = (w: number, h: number) => { getContext(t: "2d"): unknown; toBuffer(mime: string, q?: number): Buffer };

/** One world's stage at 1200×630 with the site mark. */
function shot(make: MakeCanvas, sb: AnySandbox, w: BaseWorld, p: Params, isAlt: boolean, base?: BaseWorld) {
  const c = make(W, H);
  const ctx = c.getContext("2d") as CanvasRenderingContext2D;
  ctx.fillStyle = "#0a0e13";
  ctx.fillRect(0, 0, W, H);
  ctx.save();
  sb.draw({ ctx, w: W, h: H, p, isAlt, ui: UI(), ...(base ? { base } : {}) }, w);
  ctx.restore();
  brand(ctx);
  return c;
}

/** The site mark (blue circle = the world as it was, amber diamond = the changed one) and name, bottom left, on a shade. */
function brand(ctx: CanvasRenderingContext2D) {
  const x = 40, y = H - 56, s = 44 / 32;
  ctx.fillStyle = "rgba(10,14,19,0.9)";
  ctx.font = "600 38px 'Barlow Semi Condensed'";
  const tw = ctx.measureText("What-If Simulations - Fun Lab").width;
  ctx.beginPath();
  ctx.roundRect(x - 12, y - 30, 44 + tw + 30, 60, 12);
  ctx.fill();
  ctx.save();
  ctx.translate(x, y - 22);
  ctx.scale(s, s);
  ctx.fillStyle = "#7FB2FF";
  ctx.beginPath(); ctx.arc(11, 16, 5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#FFB547";
  ctx.beginPath(); ctx.moveTo(21, 10.5); ctx.lineTo(26.5, 16); ctx.lineTo(21, 21.5); ctx.lineTo(15.5, 16); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#e6edf5";
  ctx.font = "600 38px 'Barlow Semi Condensed'";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("What-If Simulations - Fun Lab", x + 44, y + 1);
}

/** Barlow, Barlow Semi Condensed and JetBrains Mono (OFL), fetched once from the Google Fonts repository into a cache. */
async function loadFonts(fonts: { registerFromPath(path: string, alias?: string): unknown }) {
  const dir = join(ROOT, "node_modules", ".cache", "og-fonts");
  mkdirSync(dir, { recursive: true });
  const files: [string, string, string][] = [
    ["Barlow-Regular.ttf", "ofl/barlow/Barlow-Regular.ttf", "Barlow"],
    ["Barlow-Medium.ttf", "ofl/barlow/Barlow-Medium.ttf", "Barlow"],
    ["BarlowSemiCondensed-SemiBold.ttf", "ofl/barlowsemicondensed/BarlowSemiCondensed-SemiBold.ttf", "Barlow Semi Condensed"],
    ["JetBrainsMono.ttf", "ofl/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf", "JetBrains Mono"],
  ];
  for (const [name, path, family] of files) {
    const file = join(dir, name);
    if (!existsSync(file)) {
      const res = await fetch(`https://raw.githubusercontent.com/google/fonts/main/${path}`);
      if (!res.ok) throw new Error(`font ${name}: ${res.status}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
    }
    fonts.registerFromPath(file, family);
  }
}
