"use client";

import type { ScaleView } from "@/lib/scale/render";
import { JUMPS, SCALE_OBJECTS, objectSay } from "@/lib/scale/objects";
import { useT } from "../i18n/I18nProvider";
import { fmtLen } from "@/lib/sim/core";
import type { SandboxKey } from "@/lib/sim/types";
import { Icon } from "../ui/Icon";

export default function ScalePanel({ scale, onOpen }: { scale: ScaleView; onOpen: (ref: string) => void }) {
  const o = scale.focus;
  const t = useT(), say = objectSay();
  return (
    <>
      {o && (
        <div className="focus">
          <h3 className="headline">{t("scale.panel.inView")}</h3>
          <p className="title">{say(`${o.id}.name`)}</p>
          <span className="sz">{fmtLen(o.size)}</span>
          <p className="desc">{say(`${o.id}.fact`)}</p>
          {o.sandbox && <p><button className="btn primary" onClick={() => onOpen(o.sandbox!)}>{t("scale.panel.openThis")}<Icon name="arrow" size={18} /></button></p>}
        </div>
      )}
      <div>
        <h3 className="headline">{t("scale.panel.openWorld")}</h3>
        <div className="jump">
          {SCALE_OBJECTS.filter((x) => x.sandbox).map((x) => (
            <button key={x.name} onClick={() => onOpen(x.sandbox!)}>
              <Icon name={x.sandbox!.split(":")[0] as SandboxKey} size={16} />
              {say(`${x.id}.name`)}
            </button>
          ))}
        </div>
      </div>
      <div>
        <h3 className="headline">{t("scale.panel.jumpTo")}</h3>
        <div className="jump">
          {JUMPS.map(([n, z], i) => <button key={n} onClick={() => scale.zoomTo(z)}>{say(`jump.${i}`)}</button>)}
        </div>
      </div>
    </>
  );
}
