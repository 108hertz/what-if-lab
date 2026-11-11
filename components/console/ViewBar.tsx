"use client";

import { useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { PITCHES, type PitchPreset } from "@/lib/sim/camera";
import { Icon } from "../ui/Icon";
import { useT } from "../i18n/I18nProvider";
import { resetView, setPitch, viewOf, zoomStep } from "./stageCamera";

/**
 * The space camera's buttons on the stage (change 0036), bottom right: Top · Tilted · Edge-on, zoom − / +, reset,
 * and Look / Throw for worlds with a second drag (solar). Gestures do the same on the canvas (stageCamera.ts).
 * Below 768 px the framings fold behind one "View" button.
 */
export default function ViewBar({ engine, onChange, pitch, throwable = false }: {
  engine: SimEngine; onChange: () => void; pitch: number; throwable?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const v = engine.ui.view;
  const now = v?.pitch ?? pitch, tool = v?.tool ?? "look";
  const act = (f: () => void) => () => { f(); onChange(); };
  return (
    <div className="viewbar" role="toolbar" aria-label={t("console.stage.view.label")}>
      <div className={`viewbar-more${open ? " open" : ""}`}>
        <div className="seg" role="group" aria-label={t("console.stage.view.label")}>
          {(Object.keys(PITCHES) as PitchPreset[]).map((k) => (
            <button key={k} type="button" aria-pressed={Math.abs(now - PITCHES[k]) < 0.01} onClick={act(() => setPitch(engine, pitch, k))}>
              {t(`console.stage.view.${k}`)}
            </button>
          ))}
        </div>
        <button type="button" className="iconbtn" aria-label={t("console.stage.view.reset")} title={t("console.stage.view.reset")} onClick={act(() => resetView(engine, pitch))}>
          <Icon name="recentre" />
        </button>
      </div>
      <button type="button" className="iconbtn viewbar-toggle" aria-expanded={open} aria-label={t("console.stage.view.label")} onClick={() => setOpen(!open)}>
        <Icon name="orbit" />
      </button>
      <div className="viewbar-zoom">
        <button type="button" className="iconbtn" aria-label={t("console.stage.view.zoomOut")} title={t("console.stage.view.zoomOut")} onClick={act(() => zoomStep(engine, pitch, -1))}>
          <Icon name="minus" />
        </button>
        <button type="button" className="iconbtn" aria-label={t("console.stage.view.zoomIn")} title={t("console.stage.view.zoomIn")} onClick={act(() => zoomStep(engine, pitch, 1))}>
          <Icon name="plus" />
        </button>
      </div>
      {throwable && (
        <div className="seg" role="group" aria-label={t("console.stage.view.tool")}>
          {(["look", "throw"] as const).map((k) => (
            <button key={k} type="button" aria-pressed={tool === k} onClick={act(() => { viewOf(engine, pitch).tool = k; })}>
              {t(`console.stage.view.${k}`)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
