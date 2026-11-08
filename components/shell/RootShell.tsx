import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, JetBrains_Mono, Noto_Sans, Noto_Sans_Arabic, Noto_Sans_Bengali, Noto_Sans_Devanagari, Noto_Sans_Thai } from "next/font/google";
import { localeInfo } from "@/lib/i18n";

/**
 * The <html> both root layouts render (change 0025): app/(en) for English, app/[lang] for the rest.
 * Layouts only pass the language; everything else lives here so they cannot drift apart.
 */

// Self-hosted at build time by next/font: no runtime request to Google.
// Control Room type (change 0023): Barlow explains, Barlow Semi Condensed names, JetBrains Mono counts.
// Change 0025: Latin languages (incl. Polish, Turkish, Vietnamese) stay in Barlow. Other scripts fall back per glyph to a
// Noto face, fetched only when the page has those letters (unicode-range, no preload). Chinese, Japanese and Korean use the
// system's own fonts (every OS ships them; web fonts would be megabytes), ordered per language in globals.css.
// `subsets` only picks what is preloaded: every other range (latin-ext, Vietnamese, Cyrillic…) is in the CSS and downloads
// only when a page uses it. next/font needs every option written out as a literal.
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-barlow" });
const barlowCond = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-barlow-cond" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], display: "swap", variable: "--font-jbm" });
const cyr = Noto_Sans({ subsets: ["cyrillic"], weight: ["400", "500", "600"], display: "swap", preload: false, adjustFontFallback: false, variable: "--font-noto" });
const arabic = Noto_Sans_Arabic({ subsets: ["arabic"], weight: ["400", "500", "600"], display: "swap", preload: false, adjustFontFallback: false, variable: "--font-noto-ar" });
const deva = Noto_Sans_Devanagari({ subsets: ["devanagari"], weight: ["400", "500", "600"], display: "swap", preload: false, adjustFontFallback: false, variable: "--font-noto-deva" });
const thai = Noto_Sans_Thai({ subsets: ["thai"], weight: ["400", "500", "600"], display: "swap", preload: false, adjustFontFallback: false, variable: "--font-noto-thai" });
const beng = Noto_Sans_Bengali({ subsets: ["bengali"], weight: ["400", "500", "600"], display: "swap", preload: false, adjustFontFallback: false, variable: "--font-noto-beng" });
const FONT_VARS = [barlow, barlowCond, mono, cyr, arabic, deva, thai, beng].map((f) => f.variable).join(" ");

export const ROOT_METADATA: Metadata = {
  title: "What-If Lab",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/favicon.ico", sizes: "32x32" }] },
  description: "Zoom from a proton to the observable universe, open a world, change it with what-ifs and compare its future with the world left as it was.",
};

export const ROOT_VIEWPORT: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0a0e13" };

// Applies the saved theme before first paint so there is no flash. Dark ("graphite") is the default.
const THEME_INIT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootShell({ locale, children }: { locale: string; children: React.ReactNode }) {
  const info = localeInfo(locale);
  return (
    <html lang={info.tag} dir={info.dir} className={FONT_VARS} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
