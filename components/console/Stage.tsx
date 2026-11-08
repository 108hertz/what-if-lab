"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { useCanvasLoop } from "../ui/canvas";
import { useT } from "../i18n/I18nProvider";

/** World-specific pointer handling on the stage (e.g. solar's drag-to-throw). Coordinates are stage-local CSS px. */
export interface StageInteraction {
  down?(engine: SimEngine, x: number, y: number, W: number, H: number): void;
  move?(engine: SimEngine, x: number, y: number): void;
  /** `done` is false on pointercancel. Return true when the engine changed and the UI should refresh. */
  up?(engine: SimEngine, x: number, y: number, done: boolean): boolean;
}

/**
 * The simulation canvas: runs and draws the engine every frame, and forwards pointer input to the world. A world may put
 * its own on-stage controls over the canvas as `children` (e.g. the child world's view switch).
 */
export default function Stage({ engine, interaction, onChange, children }: { engine: SimEngine; interaction?: StageInteraction; onChange: () => void; children?: ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const t = useT();
  useCanvasLoop(ref, (ctx, W, H, dt) => {
    engine.tick(dt);
    engine.draw(ctx, W, H);
  });

  useEffect(() => {
    const cv = ref.current;
    if (!cv || !interaction) return;
    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, W: r.width, H: r.height }; };
    const onDown = (e: PointerEvent) => { const { x, y, W, H } = local(e); cv.setPointerCapture(e.pointerId); interaction.down?.(engine, x, y, W, H); };
    const onMove = (e: PointerEvent) => { const { x, y } = local(e); interaction.move?.(engine, x, y); };
    const onUp = (e: PointerEvent) => { const { x, y } = local(e); if (interaction.up?.(engine, x, y, e.type === "pointerup")) onChange(); };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    return () => {
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
    };
  }, [engine, interaction, onChange]);

  return (
    <div className="stage">
      <canvas ref={ref} aria-label={t("console.stage.label")} />
      <span className="micro edge" aria-hidden="true">{t("console.stage.edge", { seed: engine.seed })}</span>
      {children}
    </div>
  );
}
