/**
 * Export studio fonts (change 0022). Self-hosted at build time by next/font (no runtime request to Google) and
 * only part of the studio's chunk, so no page pays for them until someone opens the studio. The browser fetches
 * a face the first time a frame is drawn with it (`loadFonts`).
 */
import { Anton, Caveat, Nunito, Playfair_Display, Roboto_Slab } from "next/font/google";
import { FONT } from "@/lib/sim/draw";
import { registerFonts } from "@/lib/export/style";

const serif = Playfair_Display({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const rounded = Nunito({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const slab = Roboto_Slab({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const hand = Caveat({ subsets: ["latin"], weight: ["400", "700"], display: "swap", preload: false });
const poster = Anton({ subsets: ["latin"], weight: ["400"], display: "swap", preload: false });

let done = false;
/** Point the export's font choices at real faces: the site's own three, and the five studio faces. */
export function registerStudioFonts(): void {
  if (done) return;
  done = true;
  registerFonts({
    site: FONT.body,
    condensed: FONT.display,
    mono: FONT.mono,
    serif: serif.style.fontFamily,
    rounded: rounded.style.fontFamily,
    slab: slab.style.fontFamily,
    hand: hand.style.fontFamily,
    poster: poster.style.fontFamily,
  });
}
