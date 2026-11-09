import type { NextConfig } from "next";

// The public origin for canonical URLs, hreflang, sitemap.xml and robots.txt (change 0025). NEXT_PUBLIC_SITE_URL wins;
// on Vercel it falls back to the project's production domain (the custom domain once one is attached, else *.vercel.app).
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (vercelProd ? `https://${vercelProd}` : "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  env: { NEXT_PUBLIC_SITE_URL: siteUrl },
  // ADR 0001: a static export, no server. Accounts and Premium (ADR 0008) run entirely in the browser.
  output: "export",
  // Change 0025: two root layouts (app/(en), app/[lang]) share one 404 page, app/global-not-found.tsx.
  experimental: { globalNotFound: true },
};

export default nextConfig;
