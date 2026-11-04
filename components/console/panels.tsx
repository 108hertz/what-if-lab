"use client";

import { useEffect, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import ControlsForm from "./ControlsForm";
import { Icon } from "../ui/Icon";

type P = { engine: SimEngine; onChange: () => void };

/** World name with the ⓘ "About this model" popover (intro + how the lab works). */
export function WorldHeader({ engine }: { engine: SimEngine }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const click = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", click); };
  }, [open]);
  return (
    <div className="world-head" ref={ref}>
      <h2 className="title">{engine.sb.name}</h2>
      <button className="iconbtn" aria-label="About this model" aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="info" /></button>
      {open && (
        <div className="popover" role="dialog" aria-label="About this model">
          <p className="desc">{engine.sb.intro}</p>
          <p className="small">
            Everything runs from built-in rules and simplified data, live in your browser. Results show plausible behaviour, not forecasts.
          </p>
          <span className="micro credit">No AI · No live data · Same seed, same future</span>
        </div>
      )}
    </div>
  );
}

export function WhatIfList({ engine, onChange }: P) {
  const stack = !!engine.sb.stack;
  const count = (id: string) => engine.applied.filter((x) => x === id).length;
  return (
    <section>
      <h3 className="headline">{stack ? "Make changes" : "What if"}</h3>
      <div className="forks">
        {engine.sb.whatifs.map(([id, label]) => {
          const n = stack ? count(id) : engine.whatIf === id ? 1 : 0;
          return (
            <button key={id} className="fork" aria-pressed={n > 0} onClick={() => { engine.change(id); onChange(); }}>
              <Icon name="fork" />
              {label}
              {n > 1 && <span className="count" aria-label={`applied ${n} times`}>×{n}</span>}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function Readouts({ engine }: { engine: SimEngine }) {
  const { sb } = engine;
  const { base, alt } = engine.readouts();
  return (
    <section>
      <h3 className="headline">Right now</h3>
      <table>
        <thead><tr><th /><th>No change</th>{alt && <th>{sb.stack ? "With changes" : "What if"}</th>}</tr></thead>
        <tbody>
          {sb.metrics.map((m) => (
            <tr key={m.k}>
              <td>{m.label}{m.unit && m.unit !== "/100" && <span className="unit"> {m.unit}</span>}</td>
              <td>{m.fmt(base[m.k])}</td>
              {alt && <td className="a">{m.fmt(alt[m.k])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function InfoBlocks({ engine }: { engine: SimEngine }) {
  const info = engine.sb.info?.(engine.base, engine.alt, engine.params) ?? [];
  if (!info.length) return null;
  return (
    <section className="info">
      {info.map((block, i) => (
        <div key={i}>
          {block.heading && <h3 className={block.accent ? "headline accent" : "headline"}>{block.heading}</h3>}
          <dl>
            {block.rows.map((r, j) => (
              <div key={j}>
                {r.label && <dt>{r.label}</dt>}
                <dd>{r.color && <span className="key" style={{ background: r.color }} />}{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}

export function TunePanel({ engine, onChange }: P) {
  return (
    <section>
      <h3 className="headline">Variables</h3>
      <ControlsForm engine={engine} onChange={onChange} />
      <p className="small">
        {engine.sb.controls.some((c) => c.type === "range" && c.live)
          ? "Starting-world changes restart it. What-if settings apply the next time you pick a what-if."
          : "Changing these restarts the world."}
      </p>
    </section>
  );
}
