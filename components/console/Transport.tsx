"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { Icon } from "../ui/Icon";
import { FullscreenButton } from "./fullscreen";
import { ExportButton } from "./export/ExportDialog";
import { useT } from "../i18n/I18nProvider";
import { worldSay } from "@/lib/sim/say";

/** Play, speed, Reset everything, export and full screen. `onReset` lets a world clear its own view state too. */
export default function Transport({ engine, onChange, fullscreen, onReset }: { engine: SimEngine; onChange: () => void; fullscreen?: { on: boolean; toggle: () => void }; onReset?: () => void }) {
  const act = (fn: () => void) => () => { fn(); onChange(); };
  const speeds = engine.sb.speeds;
  const t = useT(), say = worldSay(engine.sb);
  const speedLabel = (i: number) => say(`speed.${i}`);
  return (
    <div className="transport">
      <button className="btn primary" aria-label={t(engine.playing ? "console.transport.pause" : "console.transport.play")} onClick={act(() => (engine.playing = !engine.playing))}>
        <Icon name={engine.playing ? "pause" : "play"} />
        <span className="primary-text">{t(engine.playing ? "console.transport.pause" : "console.transport.play")}</span>
      </button>
      {speeds.length > 4 ? (
        // Many speeds: a slower · current · faster stepper keeps the transport on one row
        <div className="stepper" role="group" aria-label={t("console.transport.speed")}>
          <button className="btn" aria-label={t("console.transport.slower")} title={t("console.transport.slower")} disabled={engine.speedIdx === 0} onClick={act(() => (engine.speedIdx -= 1))}><Icon name="minus" size={18} /></button>
          <output aria-live="polite">{speedLabel(engine.speedIdx)}</output>
          <button className="btn" aria-label={t("console.transport.faster")} title={t("console.transport.faster")} disabled={engine.speedIdx === speeds.length - 1} onClick={act(() => (engine.speedIdx += 1))}><Icon name="plus" size={18} /></button>
        </div>
      ) : (
        <div className="seg" role="group" aria-label={t("console.transport.speed")}>
          {speeds.map(([, label], i) => (
            <button key={label} aria-pressed={engine.speedIdx === i} onClick={act(() => (engine.speedIdx = i))}>
              {speedLabel(i)}
            </button>
          ))}
        </div>
      )}
      {/* Reset everything (change 0024): default settings, no changes, time 0 — a clean start to test a process */}
      <button className="btn" aria-label={t("console.transport.resetLabel")} title={t("console.transport.resetTitle")} onClick={act(() => { engine.reset(); onReset?.(); })}><Icon name="reset" size={18} /><span className="btn-text">{t("console.transport.reset")}</span></button>
      <span className="hint">{engine.sb.hint ? say("meta.hint") : t(fullscreen?.on ? "console.transport.hintFull" : "console.transport.hint")}</span>
      <ExportButton engine={engine} />
      {fullscreen && <FullscreenButton {...fullscreen} />}
    </div>
  );
}
