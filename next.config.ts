import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ADR 0001: a static export, no server. Accounts and Premium (ADR 0008) run entirely in the browser.
  output: "export",
  // Change 0025: two root layouts (app/(en), app/[lang]) share one 404 page, app/global-not-found.tsx.
  experimental: { globalNotFound: true },
};

export default nextConfig;
