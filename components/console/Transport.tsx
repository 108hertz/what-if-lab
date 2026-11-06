"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { Icon } from "../ui/Icon";
import { FullscreenButton } from "./fullscreen";
import { ExportButton } from "./export/ExportDialog";

/** Play, speed, Reset everything, export and full screen. `onReset` lets a world clear its own view state too. */
export default function Transport({ engine, onChange, fullscreen, onReset }: { engine: SimEngine; onChange: () => void; fullscreen?: { on: boolean; toggle: () => void }; onReset?: () => void }) {
  const act = (fn: () => void) => () => { fn(); onChange(); };
  const speeds = engine.sb.speeds;
  return (
    <div className="transport">
      <button className="btn primary" aria-label={engine.playing ? "Pause" : "Play"} onClick={act(() => (engine.playing = !engine.playing))}>
        <Icon name={engine.playing ? "pause" : "play"} />
        <span className="primary-text">{engine.playing ? "Pause" : "Play"}</span>
      </button>
      {speeds.length > 4 ? (
        // Many speeds: a slower · current · faster stepper keeps the transport on one row
        <div className="stepper" role="group" aria-label="Speed">
          <button className="btn" aria-label="Slower" title="Slower" disabled={engine.speedIdx === 0} onClick={act(() => (engine.speedIdx -= 1))}><Icon name="minus" size={18} /></button>
          <output aria-live="polite">{speeds[engine.speedIdx][1]}</output>
          <button className="btn" aria-label="Faster" title="Faster" disabled={engine.speedIdx === speeds.length - 1} onClick={act(() => (engine.speedIdx += 1))}><Icon name="plus" size={18} /></button>
        </div>
      ) : (
        <div className="seg" role="group" aria-label="Speed">
          {speeds.map(([, label], i) => (
            <button key={label} aria-pressed={engine.speedIdx === i} onClick={act(() => (engine.speedIdx = i))}>
              {label}
            </button>
          ))}
        </div>
      )}
      {/* Reset everything (change 0024): default settings, no changes, time 0 — a clean start to test a process */}
      <button className="btn" aria-label="Reset everything" title="Reset everything: settings, changes and time" onClick={act(() => { engine.reset(); onReset?.(); })}><Icon name="reset" size={18} /><span className="btn-text">Reset</span></button>
      <span className="hint">{engine.sb.hint ?? (fullscreen?.on ? "Leave full screen to make a change." : "Pick changes. They add up; tick them off to compare.")}</span>
      <ExportButton engine={engine} />
      {fullscreen && <FullscreenButton {...fullscreen} />}
    </div>
  );
}
