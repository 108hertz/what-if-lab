import type { NextConfig } from "next";

// The public origin for canonical URLs, hreflang, sitemap.xml and robots.txt (change 0025). NEXT_PUBLIC_SITE_URL wins;
// on Vercel it falls back to the project's production domain (the custom domain once one is attached, else *.vercel.app).
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (vercelProd ? `https://${vercelProd}` : "");

// GA4 (change 0027): the Firebase project "what-if-108hertz" web app's measurement ID — Firebase Analytics on the web
// is GA4, so the consent-gated gtag loader feeds it without the Firebase SDK. NEXT_PUBLIC_GA_ID wins; otherwise only
// Vercel production builds get it, so dev and preview deploys send nothing.
const FIREBASE_GA_ID = "G-WX6WYV2D6D";
const gaId = process.env.NEXT_PUBLIC_GA_ID || (process.env.VERCEL_ENV === "production" ? FIREBASE_GA_ID : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Change 0034: Vercel's own environment (production / preview / development), so preview builds can turn the Premium
  // simulation on. Read from Vercel at build time; it is "" off Vercel.
  env: { NEXT_PUBLIC_SITE_URL: siteUrl, NEXT_PUBLIC_GA_ID: gaId, NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV || "" },
  // ADR 0001: a static export, no server. Accounts and Premium (ADR 0008) run entirely in the browser.
  output: "export",
  // A second dev server in the same folder (e.g. the Premium preview on another port) needs its own build folder.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Change 0025: two root layouts (app/(en), app/[lang]) share one 404 page, app/global-not-found.tsx.
  experimental: { globalNotFound: true },
};

export default nextConfig;
