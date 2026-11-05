import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // ADR 0001: a static export, no server. Accounts and Premium (ADR 0008) run entirely in the browser.
  output: "export",
};

export default nextConfig;
