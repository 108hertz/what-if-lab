import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Self-hosted at build time by next/font: no runtime request to Google.
const inter = Inter({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--font-inter" });

export const metadata: Metadata = {
  title: "What-If Lab",
  description: "Zoom from a proton to the observable universe, open a world, fork it with a what-if and watch both futures run side by side.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#100904" };

// Applies the saved theme before first paint so there is no flash. Dark ("darkroom") is the default.
const THEME_INIT = `try{if(localStorage.getItem("theme")==="light")document.documentElement.dataset.theme="light"}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
