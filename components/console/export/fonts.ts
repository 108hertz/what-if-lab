/**
 * Export studio fonts (change 0022; six more and every language in change 0034). Self-hosted at build time by next/font
 * (no runtime request to Google) and only part of the studio's chunk, so no page pays for them until someone opens the
 * studio. The browser fetches a face (and only the letter ranges a frame uses) the first time it is drawn (`loadFonts`).
 *
 * Each face is followed by the site's own stack, so letters a face lacks (Arabic, Hindi, Bengali, Thai, Chinese,
 * Japanese, Korean…) fall back glyph by glyph to the site's Noto faces and the device's fonts instead of boxes.
 */
import {
  Anton, Bebas_Neue, Caveat, Lora, Montserrat, Nunito, Permanent_Marker, Playfair_Display, Press_Start_2P, Roboto_Slab, Space_Grotesk,
} from "next/font/google";
import { FONT } from "@/lib/sim/draw";
import { registerFonts } from "@/lib/export/style";

// next/font needs every option written out as a literal.
const serif = Playfair_Display({ subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"], weight: ["400", "700"], style: ["normal", "italic"], display: "swap", preload: false });
const rounded = Nunito({ subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"], weight: ["400", "700"], style: ["normal", "italic"], display: "swap", preload: false });
const slab = Roboto_Slab({ subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"], weight: ["400", "700"], display: "swap", preload: false });
const hand = Caveat({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400", "700"], display: "swap", preload: false });
const poster = Anton({ subsets: ["latin", "latin-ext", "vietnamese"], weight: ["400"], display: "swap", preload: false });
const geo = Montserrat({ subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"], weight: ["400", "500", "700"], style: ["normal", "italic"], display: "swap", preload: false });
const bebas = Bebas_Neue({ subsets: ["latin", "latin-ext"], weight: ["400"], display: "swap", preload: false });
const grotesk = Space_Grotesk({ subsets: ["latin", "latin-ext", "vietnamese"], weight: ["400", "500", "700"], display: "swap", preload: false });
const lora = Lora({ subsets: ["latin", "latin-ext", "cyrillic", "vietnamese"], weight: ["400", "500", "700"], style: ["normal", "italic"], display: "swap", preload: false });
const marker = Permanent_Marker({ subsets: ["latin"], weight: ["400"], display: "swap", preload: false });
const pixel = Press_Start_2P({ subsets: ["latin", "latin-ext", "cyrillic"], weight: ["400"], display: "swap", preload: false });

let done = false;
/** Point the export's font choices at real faces: the site's own three, and the studio faces. */
export function registerStudioFonts(): void {
  if (done) return;
  done = true;
  const withSite = (f: { style: { fontFamily: string } }) => `${f.style.fontFamily}, ${FONT.body}`;
  registerFonts({
    site: FONT.body,
    condensed: FONT.display,
    mono: FONT.mono,
    serif: withSite(serif),
    rounded: withSite(rounded),
    slab: withSite(slab),
    hand: withSite(hand),
    poster: withSite(poster),
    geo: withSite(geo),
    bebas: withSite(bebas),
    grotesk: withSite(grotesk),
    lora: withSite(lora),
    marker: withSite(marker),
    pixel: withSite(pixel),
  });
}
