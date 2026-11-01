"use client";

import type { RefObject } from "react";
import type { ScaleView } from "@/lib/scale/render";
import { ZOOM_MAX, ZOOM_MIN } from "@/lib/scale/objects";

/** Zoom controls. Values are pushed into the refs by the render loop, so this never re-renders per frame. */
export default function ScaleTransport({ scale, inputRef, outputRef }: { scale: ScaleView; inputRef: RefObject<HTMLInputElement | null>; outputRef: RefObject<HTMLOutputElement | null> }) {
  return (
    <div className="transport">
      <div className="zoomrow">
        <button className="btn" aria-label="Zoom in" onClick={() => scale.zoomBy(-1)}>−</button>
        <input ref={inputRef} type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.01} defaultValue={scale.zt} aria-label="Zoom level" onChange={(e) => scale.zoomTo(+e.target.value)} />
        <button className="btn" aria-label="Zoom out" onClick={() => scale.zoomBy(1)}>+</button>
        <output ref={outputRef} />
      </div>
      <span className="hint">Scroll, pinch or drag · click a glowing label to open its sandbox</span>
    </div>
  );
}
