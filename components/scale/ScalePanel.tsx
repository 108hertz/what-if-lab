"use client";

import type { ScaleView } from "@/lib/scale/render";
import { JUMPS, SCALE_OBJECTS } from "@/lib/scale/objects";
import { fmtLen } from "@/lib/sim/core";
import type { SandboxKey } from "@/lib/sim/types";
import { Icon } from "../ui/Icon";

export default function ScalePanel({ scale, onOpen }: { scale: ScaleView; onOpen: (ref: string) => void }) {
  const o = scale.focus;
  return (
    <>
      {o && (
        <div className="focus">
          <span className="micro">In view</span>
          <p className="title">{o.name}</p>
          <span className="sz">{fmtLen(o.size)}</span>
          <p className="desc">{o.fact}</p>
          {o.sandbox && <p><button className="btn primary" onClick={() => onOpen(o.sandbox!)}>Open this world<Icon name="arrow" size={18} /></button></p>}
        </div>
      )}
      <div>
        <h3 className="headline">Open a world</h3>
        <div className="jump">
          {SCALE_OBJECTS.filter((x) => x.sandbox).map((x) => (
            <button key={x.name} onClick={() => onOpen(x.sandbox!)}>
              <Icon name={x.sandbox!.split(":")[0] as SandboxKey} size={16} />
              {x.name}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="headline">Jump to</h3>
        <div className="jump">
          {JUMPS.map(([n, z]) => <button key={n} onClick={() => scale.zoomTo(z)}>{n}</button>)}
        </div>
      </div>
    </>
  );
}
