import type { Metadata, Viewport } from "next";
import { Barlow, Barlow_Semi_Condensed, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no runtime request to Google.
// Control Room type (change 0023): Barlow explains, Barlow Semi Condensed names, JetBrains Mono counts.
const barlow = Barlow({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-barlow" });
const barlowCond = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["500", "600"], display: "swap", variable: "--font-barlow-cond" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["500"], display: "swap", variable: "--font-jbm" });

export const metadata: Metadata = {
  title: "What-If Lab",
  description: "Zoom from a proton to the observable universe, open a world, fork it with a what-if and watch both futures run side by side.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#0a0e13" };

// Applies the saved theme before first paint so there is no flash. Dark ("graphite") is the default.
const THEME_INIT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${barlow.variable} ${barlowCond.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
