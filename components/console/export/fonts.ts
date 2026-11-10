/**
 * Export studio fonts (change 0022; six more and every language in change 0034). Self-hosted from public/fonts/studio/
 * (written by `npm run fonts:studio`, no request to Google at build or run time). The stylesheet is only part of the
 * studio's chunk, and the browser fetches a face (and only the letter ranges a frame uses) the first time it is drawn
 * (`loadFonts`).
 *
 * Each face is followed by the site's own stack, so letters a face lacks (Arabic, Hindi, Bengali, Thai, Chinese,
 * Japanese, Korean…) fall back glyph by glyph to the site's Noto faces and the device's fonts instead of boxes.
 */
import "./studio-fonts.css";
import { FONT } from "@/lib/sim/draw";
import { registerFonts } from "@/lib/export/style";

/** Family names as written by scripts/studio-fonts.mjs. */
const face = (name: string) => `"Studio ${name}", ${FONT.body}`;

let done = false;
/** Point the export's font choices at real faces: the site's own three, and the studio faces. */
export function registerStudioFonts(): void {
  if (done) return;
  done = true;
  registerFonts({
    site: FONT.body,
    condensed: FONT.display,
    mono: FONT.mono,
    serif: face("Playfair"),
    rounded: face("Nunito"),
    slab: face("Roboto Slab"),
    hand: face("Caveat"),
    poster: face("Anton"),
    geo: face("Montserrat"),
    bebas: face("Bebas Neue"),
    grotesk: face("Space Grotesk"),
    lora: face("Lora"),
    marker: face("Permanent Marker"),
    pixel: face("Press Start 2P"),
  });
}
