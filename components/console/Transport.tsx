"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { Icon } from "../ui/Icon";
import { FullscreenButton } from "./fullscreen";

export default function Transport({ engine, onChange, fullscreen }: { engine: SimEngine; onChange: () => void; fullscreen?: { on: boolean; toggle: () => void } }) {
  const act = (fn: () => void) => () => { fn(); onChange(); };
  const speeds = engine.sb.speeds;
  return (
    // "tight": a stepper plus Close what-if; on narrow screens Play/Pause goes icon-only to keep one row
    <div className={speeds.length > 4 && engine.alt ? "transport tight" : "transport"}>
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
      <button className="btn" aria-label="Restart" title="Restart" onClick={act(() => engine.restart())}><Icon name="restart" size={18} /><span className="btn-text">Restart</span></button>
      {engine.alt && <button className="btn" aria-label="Close what-if" title="Close what-if" onClick={act(() => engine.dropFork())}><Icon name="close" size={18} /><span className="btn-text">Close what-if</span></button>}
      <span className="hint">{engine.sb.hint ?? (fullscreen?.on ? "Leave full screen to ask a what-if." : "Pick a question. The world splits here.")}</span>
      {fullscreen && <FullscreenButton {...fullscreen} />}
    </div>
  );
}
