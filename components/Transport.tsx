"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { Icon } from "./ui/Icon";

export default function Transport({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const act = (fn: () => void) => () => { fn(); onChange(); };
  return (
    <div className="transport">
      <button className="btn primary" onClick={act(() => (engine.playing = !engine.playing))}>
        <Icon name={engine.playing ? "pause" : "play"} />
        {engine.playing ? "Pause" : "Play"}
      </button>
      <div className="seg" role="group" aria-label="Speed">
        {engine.sb.speeds.map(([, label], i) => (
          <button key={label} aria-pressed={engine.speedIdx === i} onClick={act(() => (engine.speedIdx = i))}>
            {label}
          </button>
        ))}
      </div>
      <button className="btn" onClick={act(() => engine.restart())}><Icon name="restart" size={18} />Restart</button>
      {engine.alt && <button className="btn" onClick={act(() => engine.dropFork())}><Icon name="close" size={18} />Close what-if</button>}
      <span className="hint">{engine.sb.hint ?? "Pick a question. The world splits here."}</span>
    </div>
  );
}
