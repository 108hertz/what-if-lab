"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ScaleView } from "@/lib/scale/render";
import type { SandboxKey } from "@/lib/sim/types";
import { WORLDS, modeHref } from "@/worlds/registry";
import { queuePreset } from "../console/engines";
import { useCanvasLoop } from "../ui/canvas";
import { useMedia } from "../ui/useMedia";
import Dock from "../console/Dock";
import { useFullscreen } from "../console/fullscreen";
import ScalePanel from "./ScalePanel";
import ScaleTransport from "./ScaleTransport";
import { useLocale, useT } from "../i18n/I18nProvider";

/** Module-level so the zoom position survives a trip into a world and back. */
let view: ScaleView | null = null;

/** The scale explorer ("/"): zoom from a proton to the observable universe; gold labels open worlds. */
export default function ScaleConsole() {
  const router = useRouter();
  const locale = useLocale();
  const scale = (view ??= new ScaleView());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const centre = useRef<HTMLElement>(null);
  const fs = useFullscreen(centre);
  const t = useT();
  const zoomRef = useRef<HTMLInputElement>(null);
  const zoomOutRef = useRef<HTMLOutputElement>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const desk = useMedia("(min-width: 1024px)");
  // Objects hold a still pose under reduced motion; zoom easing stays (it is feedback)
  scale.reducedMotion = useMedia("(prefers-reduced-motion: reduce)");

  /** Open a world from a scale-object reference like "animals:wolf". */
  const open = useCallback((ref: string) => {
    const [key, preset] = ref.split(":") as [SandboxKey, string | undefined];
    const param = WORLDS[key].presetParam;
    if (preset && param) queuePreset(key, param, preset);
    router.push(modeHref(key, locale));
  }, [router, locale]);

  useCanvasLoop(canvasRef, (ctx, W, H, dt) => {
    if (scale.draw(ctx, W, H, dt)) rerender();
    if (zoomRef.current && document.activeElement !== zoomRef.current) zoomRef.current.value = String(scale.zt);
    if (zoomOutRef.current) zoomOutRef.current.textContent = `10^${scale.z.toFixed(1)} m`;
  });

  // Wheel, drag and pinch zoom; tap a gold label to open its world
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const pts = new Map<number, { x: number; y: number }>();
    let press: { x: number; z: number; moved: number } | null = null;
    let pinch: { d: number; z: number } | null = null;
    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); scale.zoomBy(e.deltaY * 0.0018); };
    const onDown = (e: PointerEvent) => {
      const { x, y } = local(e);
      pts.set(e.pointerId, { x, y });
      cv.setPointerCapture(e.pointerId);
      press = { x, z: scale.zt, moved: 0 };
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: scale.zt }; }
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x, y });
      if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; scale.zoomTo(pinch.z - Math.log10(Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) * 1.5); return; }
      if (press && e.buttons) { const dx = x - press.x; press.moved = Math.max(press.moved, Math.abs(dx)); scale.zoomTo(press.z - dx / 220); }
      const h = scale.hitTest(x, y);
      scale.hover = h;
      cv.style.cursor = h?.sandbox ? "pointer" : "grab";
    };
    const onUp = (e: PointerEvent) => {
      const { x, y } = local(e);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (press && press.moved < 6 && e.type === "pointerup") { const h = scale.hitTest(x, y); if (h?.sandbox) open(h.sandbox); }
      press = null;
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    return () => {
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
    };
  }, [scale, open]);

  // The hero leaves on the first interaction with the stage
  const [heroOff, setHeroOff] = useState(false);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || heroOff) return;
    const hide = () => setHeroOff(true);
    cv.addEventListener("pointerdown", hide);
    cv.addEventListener("wheel", hide, { passive: true });
    return () => { cv.removeEventListener("pointerdown", hide); cv.removeEventListener("wheel", hide); };
  }, [heroOff]);

  const panel = <ScalePanel scale={scale} onOpen={open} />;
  return (
    <main className="console">
      <section className="centre" ref={centre}>
        <div className="stage">
          <canvas ref={canvasRef} aria-label={t("console.stage.label")} />
          <div className={heroOff ? "hero hide" : "hero"} aria-hidden={heroOff}>
            <h1 className="display">{t("scale.hero.title")}</h1>
            <p className="desc-lg">{t("scale.hero.body")}</p>
          </div>
        </div>
        <ScaleTransport scale={scale} inputRef={zoomRef} outputRef={zoomOutRef} fullscreen={fs} />
      </section>
      {desk ? <aside className="col tune scrolly">{panel}</aside> : <Dock tabs={[[t("scale.panel.inView"), panel]]} />}
    </main>
  );
}
