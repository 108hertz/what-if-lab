"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { useCanvasLoop } from "../ui/canvas";
import { useT } from "../i18n/I18nProvider";

/** Which pointer and keys a stage event came from (change 0036: the space camera needs pinch, right-drag and Shift). */
export interface StagePointer { id: number; button: number; shift: boolean; touch: boolean }

/** World-specific pointer handling on the stage (e.g. solar's drag-to-throw). Coordinates are stage-local CSS px. */
export interface StageInteraction {
  down?(engine: SimEngine, x: number, y: number, W: number, H: number, ev: StagePointer): void;
  move?(engine: SimEngine, x: number, y: number, ev: StagePointer): void;
  /** `done` is false on pointercancel. Return true when the engine changed and the UI should refresh. */
  up?(engine: SimEngine, x: number, y: number, done: boolean, ev: StagePointer): boolean;
  /** Wheel or trackpad pinch (`pinch` = ctrlKey on a trackpad). Taking it stops the page from scrolling. */
  wheel?(engine: SimEngine, x: number, y: number, W: number, H: number, dy: number, pinch: boolean): void;
  /** Double-click / double-tap. Return true to refresh the UI. */
  dbl?(engine: SimEngine, x: number, y: number, W: number, H: number): boolean;
  /** A key while the stage has focus (it becomes focusable when this is set). Return true when handled. */
  key?(engine: SimEngine, key: string, W: number, H: number): boolean;
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
    const box = () => cv.getBoundingClientRect();
    const local = (e: MouseEvent) => { const r = box(); return { x: e.clientX - r.left, y: e.clientY - r.top, W: r.width, H: r.height }; };
    const who = (e: PointerEvent): StagePointer => ({ id: e.pointerId, button: e.button, shift: e.shiftKey, touch: e.pointerType === "touch" });
    const onDown = (e: PointerEvent) => { const { x, y, W, H } = local(e); cv.setPointerCapture(e.pointerId); interaction.down?.(engine, x, y, W, H, who(e)); };
    const onMove = (e: PointerEvent) => { const { x, y } = local(e); interaction.move?.(engine, x, y, who(e)); };
    const onUp = (e: PointerEvent) => { const { x, y } = local(e); if (interaction.up?.(engine, x, y, e.type === "pointerup", who(e))) onChange(); };
    const onWheel = (e: WheelEvent) => {
      if (!interaction.wheel) return;
      e.preventDefault();
      const { x, y, W, H } = local(e), dy = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaY;
      interaction.wheel(engine, x, y, W, H, dy, e.ctrlKey);
    };
    const onDbl = (e: MouseEvent) => { const { x, y, W, H } = local(e); if (interaction.dbl?.(engine, x, y, W, H)) onChange(); };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const r = box();
      if (interaction.key?.(engine, e.key, r.width, r.height)) { e.preventDefault(); onChange(); }
    };
    const noMenu = (e: Event) => { if (interaction.wheel) e.preventDefault(); };
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("dblclick", onDbl);
    cv.addEventListener("keydown", onKey);
    cv.addEventListener("contextmenu", noMenu);
    return () => {
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("dblclick", onDbl);
      cv.removeEventListener("keydown", onKey);
      cv.removeEventListener("contextmenu", noMenu);
    };
  }, [engine, interaction, onChange]);

  return (
    <div className="stage">
      <canvas ref={ref} aria-label={t("console.stage.label")} tabIndex={interaction?.key ? 0 : undefined} />
      <span className="micro edge" aria-hidden="true">{t("console.stage.edge", { seed: engine.seed })}</span>
      {children}
    </div>
  );
}
