"use client";

import type { SimEngine } from "@/lib/sim/engine";

export default function Transport({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const act = (fn: () => void) => () => { fn(); onChange(); };
  return (
    <div className="transport">
      <button className="btn primary" onClick={act(() => (engine.playing = !engine.playing))}>
        {engine.playing ? "Pause" : "Play"}
      </button>
      <div className="seg" role="group" aria-label="Speed">
        {engine.sb.speeds.map(([, label], i) => (
          <button key={label} aria-pressed={engine.speedIdx === i} onClick={act(() => (engine.speedIdx = i))}>
            {label}
          </button>
        ))}
      </div>
      <button className="btn" onClick={act(() => engine.restart())}>Restart</button>
      {engine.alt && <button className="btn" onClick={act(() => engine.dropFork())}>Drop what-if</button>}
      <span className="hint">{engine.sb.hint ?? "Each what-if forks the world at this moment"}</span>
    </div>
  );
}
