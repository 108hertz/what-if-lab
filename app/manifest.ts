import type { MetadataRoute } from "next";

/** Web app manifest at build time (change 0033): name and icons when the site is saved to a home screen. */
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "What-If Lab",
    short_name: "What-If Lab",
    description: "A free what-if simulator in your browser: change one thing in a world and watch its future split.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0e13",
    theme_color: "#0a0e13",
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any" },
      { src: "/apple-touch-icon.png", type: "image/png", sizes: "180x180" },
    ],
  };
}
