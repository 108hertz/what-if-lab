"use client";

import type { ScaleView } from "@/lib/scale/render";
import { JUMPS, SCALE_OBJECTS } from "@/lib/scale/objects";
import { fmtLen } from "@/lib/sim/core";

export default function ScalePanel({ scale, onOpen }: { scale: ScaleView; onOpen: (ref: string) => void }) {
  const o = scale.focus;
  return (
    <>
      <div>
        <p className="sbname">Scale of everything</p>
        <p className="intro">Every step of the slider is ten times bigger or smaller. Objects with a glowing label are live worlds you can experiment on.</p>
      </div>
      {o && (
        <div className="focus">
          <h3>In view</h3>
          <h4>{o.name}</h4>
          <span className="sz">{fmtLen(o.size)}</span>
          <p>{o.fact}</p>
          {o.sandbox && <p><button className="btn primary" onClick={() => onOpen(o.sandbox!)}>Open this sandbox</button></p>}
        </div>
      )}
      <div>
        <h3>Open a world</h3>
        <div className="jump">
          {SCALE_OBJECTS.filter((x) => x.sandbox).map((x) => (
            <button key={x.name} onClick={() => onOpen(x.sandbox!)}>{x.name}</button>
          ))}
        </div>
      </div>
      <div>
        <h3>Jump to</h3>
        <div className="jump">
          {JUMPS.map(([n, z]) => <button key={n} onClick={() => scale.zoomTo(z)}>{n}</button>)}
        </div>
      </div>
    </>
  );
}
