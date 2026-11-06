"use client";

import { useRef } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import type { Control } from "@/lib/sim/types";
import { fmtNum } from "@/lib/sim/core";
import { Icon } from "../ui/Icon";

const RESTART_DEBOUNCE_MS = 150;

function valueText(c: Extract<Control, { type: "range" }>, v: number) {
  const d = (String(c.step).split(".")[1] ?? "").length;
  return fmtNum(v, d) + (c.unit ? " " + c.unit : "");
}

export default function ControlsForm({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const set = (id: string, value: number | string) => {
    const { restarted } = engine.setParam(id, value);
    if (restarted) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => { engine.restart(); onChange(); }, RESTART_DEBOUNCE_MS);
    }
    onChange();
  };
  return (
    <div className="ctls">
      {engine.sb.controls.map((c, i) => {
        if (c.type === "heading") return <div key={i} className="ctl-head">{c.label}</div>;
        const id = `c-${engine.sb.key}-${c.id}`;
        const v = engine.params[c.id];
        if (c.type === "select")
          return (
            <label key={c.id} className="ctl" htmlFor={id}>
              <span className="ctl-l">{c.label}</span>
              <span className="select">
                <select id={id} value={String(v)} onChange={(e) => set(c.id, e.target.value)}>
                  {c.groups
                    ? c.groups.map(([g, opts]) => <optgroup key={g} label={g}>{opts.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}</optgroup>)
                    : c.options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
                </select>
                <Icon name="chevron" size={18} />
              </span>
            </label>
          );
        return (
          <label key={c.id} className="ctl" htmlFor={id}>
            <span className="ctl-l">{c.label}<output>{valueText(c, Number(v))}</output></span>
            <input id={id} type="range" min={c.min} max={c.max} step={c.step} value={Number(v)} style={{ "--fill": `${((Number(v) - c.min) / Math.max(1e-9, c.max - c.min)) * 100}%` } as React.CSSProperties} onChange={(e) => set(c.id, parseFloat(e.target.value))} />
          </label>
        );
      })}
    </div>
  );
}
