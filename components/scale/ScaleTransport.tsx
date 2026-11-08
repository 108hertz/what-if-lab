"use client";

import type { RefObject } from "react";
import type { ScaleView } from "@/lib/scale/render";
import { ZOOM_MAX, ZOOM_MIN } from "@/lib/scale/objects";
import { Icon } from "../ui/Icon";
import { FullscreenButton } from "../console/fullscreen";
import { useT } from "../i18n/I18nProvider";

/** Zoom controls. Values are pushed into the refs by the render loop, so this never re-renders per frame. */
export default function ScaleTransport({ scale, inputRef, outputRef, fullscreen }: { scale: ScaleView; inputRef: RefObject<HTMLInputElement | null>; outputRef: RefObject<HTMLOutputElement | null>; fullscreen?: { on: boolean; toggle: () => void } }) {
  const t = useT();
  return (
    <div className="transport">
      <div className="zoomrow">
        <button className="iconbtn" aria-label={t("scale.transport.zoomIn")} onClick={() => scale.zoomBy(-1)}><Icon name="minus" /></button>
        <input ref={inputRef} type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} defaultValue={scale.zt} aria-label={t("scale.transport.zoomLevel")} onChange={(e) => scale.zoomTo(+e.target.value)} />
        <button className="iconbtn" aria-label={t("scale.transport.zoomOut")} onClick={() => scale.zoomBy(1)}><Icon name="plus" /></button>
        <output ref={outputRef} />
      </div>
      <span className="hint">{t("scale.transport.hint")}</span>
      {fullscreen && <FullscreenButton {...fullscreen} />}
    </div>
  );
}
