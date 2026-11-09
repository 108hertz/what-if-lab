import { bootScript } from "@/lib/boot/script";
import type { BootShape } from "@/lib/boot/shapes";
import { WORLDS, type Mode } from "@/worlds/registry";
import { serverT, worldName } from "./pageCopy";

/**
 * The boot scene (change 0026): a full-screen overlay in the static HTML, drawn by an inline script before the React
 * bundle arrives. Sparks gather into the world's silhouette, then fork blue | amber and fade onto the console.
 * Shown only with scripts on (`:root[data-js]`) and until `data-booted`; the lab sends "lab:ready" (Lab.tsx).
 */
export default function BootScene({ locale, mode }: { locale: string; mode: Mode }) {
  const t = serverT(locale);
  const shape: BootShape = mode === "scale" ? "rings" : WORLDS[mode].boot;
  return (
    <div className="boot" id="boot" aria-hidden="true">
      {/* The inline script sizes the canvas before React hydrates. */}
      <canvas suppressHydrationWarning />
      <p className="boot-text">
        <span className="boot-name">{worldName(t, mode)}</span>
        <span className="boot-line">{t("shell.boot.starting")}</span>
      </p>
      <script dangerouslySetInnerHTML={{ __html: bootScript(shape, { slow: t("shell.boot.slow") }) }} />
    </div>
  );
}
