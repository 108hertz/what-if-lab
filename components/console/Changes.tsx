"use client";

import type { ReactNode } from "react";
import type { ChangeEntry, SimEngine } from "@/lib/sim/engine";
import { Icon } from "../ui/Icon";

/**
 * "Your changes" (change 0024): every change made in this world as a row with a tick. Untick one and the changed world
 * is worked out again as if it had never been made (the engine re-runs the same steps); tick it and it is back. Shared by
 * every world; a world can name its rows its own way with `label`.
 */
export default function ChangeToggles({ engine, onChange, label, empty }: {
  engine: SimEngine;
  onChange: () => void;
  label?: (e: ChangeEntry) => ReactNode;
  empty?: string;
}) {
  const list = engine.entries;
  const on = list.filter((e) => e.on).length;
  const act = (fn: () => void) => () => { fn(); onChange(); };
  return (
    <section className="toggles-box">
      <h3 className="headline">Your changes{list.length > 0 && <span className="hcount">{on} of {list.length} on</span>}</h3>
      {!list.length ? (
        <p className="small">{empty ?? "Nothing changed yet. Every change you make lands here with a tick, so you can turn it off and on again."}</p>
      ) : (
        <>
          <ul className="toggles">
            {list.map((e) => {
              const name = label ? label(e) : engine.labelOf(e.rec.id) || e.rec.id;
              const text = typeof name === "string" ? name : engine.labelOf(e.rec.id) || e.rec.id;
              return (
                <li key={e.key} className={e.on ? "on" : undefined}>
                  <label className="toggle">
                    <input type="checkbox" checked={e.on} onChange={act(() => engine.toggle(e.key))} />
                    <span className="toggle-l">{name}</span>
                    <time>{engine.sb.fmtT(e.rec.t)}</time>
                  </label>
                  <button type="button" className="iconbtn" aria-label={`Remove “${text}” from the list`} title="Remove from the list" onClick={act(() => engine.remove(e.key))}>
                    <Icon name="close" size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="toggles-all">
            <button type="button" className="btn" onClick={act(() => engine.setAll(on < list.length))}>{on < list.length ? "Turn all on" : "Turn all off"}</button>
            <button type="button" className="btn" onClick={act(() => engine.dropFork())}>Clear the list</button>
          </div>
        </>
      )}
    </section>
  );
}
