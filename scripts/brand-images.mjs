// Draws the share card (public/og.png, 1200×630) and the Apple touch icon (public/apple-touch-icon.png, 180×180)
// from the site mark (public/icon.svg) and the Control Room colours. Run once when the brand changes:
//
//   FONT_DIR=/path/to/barlow-ttfs OPENTYPE=/path/to/node_modules/opentype.js node scripts/brand-images.mjs
//
// FONT_DIR holds Barlow-Regular.ttf and BarlowSemiCondensed-SemiBold.ttf (Google Fonts, OFL). sharp only draws text in
// installed fonts, so the words are turned into outlines with opentype.js (not a project dependency: install it
// anywhere, e.g. `npm i --prefix /tmp/ot opentype.js@1.3.4`, and pass its folder as OPENTYPE).
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const { FONT_DIR, OPENTYPE } = process.env;
if (!FONT_DIR || !OPENTYPE) throw new Error("Set FONT_DIR (Barlow .ttf files) and OPENTYPE (opentype.js package folder)");
const opentype = (await import(pathToFileURL(join(OPENTYPE, "dist/opentype.module.js")).href)).default;
const load = (f) => { const b = readFileSync(join(FONT_DIR, f)); return opentype.parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength)); };
const COND = load("BarlowSemiCondensed-SemiBold.ttf"), BODY = load("Barlow-Regular.ttf");
// Words as filled outlines; x is the left edge, y the baseline. Returns [svg, width].
const word = (font, str, x, y, size, fill) => {
  const p = font.getPath(str, x, y, size);
  return [`<path d="${p.toPathData(1)}" fill="${fill}"/>`, font.getAdvanceWidth(str, size)];
};

const C = { bg: "#0a0e13", panel: "#111821", grid: "#232d3a", label: "#e6edf5", label2: "#8b98a9", signal: "#3bd4c7", base: "#7FB2FF", alt: "#FFB547" };

// The mark: the no-change world (blue circle) and the what-if world (amber diamond), as in icon.svg.
const mark = (x, y, s) => `<g transform="translate(${x} ${y}) scale(${s / 32})">
  <circle cx="11" cy="16" r="5" fill="${C.base}"/><path d="M21 10.5 26.5 16 21 21.5 15.5 16Z" fill="${C.alt}"/></g>`;

// One history that forks at "now": the world left as it was (blue) and the changed one (amber).
const W = 1200, H = 630, fx = 840, fy = 400;
const past = Array.from({ length: 9 }, (_, i) => [680 + i * 20, fy + Math.sin(i * 1.3) * 6]);
const pts = (a) => a.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
const base = [[fx, fy], ...Array.from({ length: 10 }, (_, i) => [fx + (i + 1) * 30, fy + 6 + Math.sin(i * 1.1) * 7 + i * 1.5])];
const alt = [[fx, fy], ...Array.from({ length: 10 }, (_, i) => [fx + (i + 1) * 30, fy - Math.pow(i + 1, 1.55) * 7 + Math.sin(i * 1.7) * 4])];

const [what, whatW] = word(COND, "what if", 80, 300, 150, C.label);
const og = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${C.bg}"/>
  <g stroke="${C.grid}" stroke-width="1">${[220, 300, 380, 460, 540].map((y) => `<line x1="680" y1="${y}" x2="1150" y2="${y}"/>`).join("")}</g>
  <line x1="${fx}" y1="200" x2="${fx}" y2="560" stroke="${C.label2}" stroke-width="1.5" stroke-dasharray="4 6"/>
  <polyline points="${pts([...past, [fx, fy]])}" fill="none" stroke="${C.label2}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts(base)}" fill="none" stroke="${C.base}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <polyline points="${pts(alt)}" fill="none" stroke="${C.alt}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="${fx}" cy="${fy}" r="9" fill="${C.bg}" stroke="${C.label}" stroke-width="3"/>
  <circle cx="${base.at(-1)[0]}" cy="${base.at(-1)[1]}" r="7" fill="${C.base}"/>
  <circle cx="${alt.at(-1)[0]}" cy="${alt.at(-1)[1]}" r="7" fill="${C.alt}"/>
  ${mark(72, 92, 72)}
  ${what}${word(COND, "…", 80 + whatW, 300, 150, C.signal)[0]}
  ${word(BODY, "Change one thing in a world.", 84, 384, 38, C.label2)[0]}
  ${word(BODY, "Watch its future split.", 84, 432, 38, C.label2)[0]}
  ${word(COND, "What-If Simulations - Fun Lab", 84, 552, 32, C.label)[0]}
</svg>`;

// Apple draws its own rounded corners, so the touch icon is a full square with a little margin round the mark.
const touch = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="${C.bg}"/>${mark(18, 18, 144)}</svg>`;

await sharp(Buffer.from(og)).png({ compressionLevel: 9 }).toFile("public/og.png");
await sharp(Buffer.from(touch)).png({ compressionLevel: 9 }).toFile("public/apple-touch-icon.png");
console.log("wrote public/og.png and public/apple-touch-icon.png");
