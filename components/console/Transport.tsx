"use client";

import { useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { Icon } from "../ui/Icon";
import { FullscreenButton } from "./fullscreen";
import { ExportButton } from "./export/ExportDialog";
import Sheet from "./phone/Sheet";
import { speedParts } from "./phone/speed";
import { useT } from "../i18n/I18nProvider";
import { worldSay } from "@/lib/sim/say";

type Props = {
  engine: SimEngine;
  onChange: () => void;
  fullscreen?: { on: boolean; toggle: () => void };
  onReset?: () => void;
  /**
   * Phones (change 0035): Play as an icon and one wide speed button (the world clock is on the stage) that opens a list of every speed
   * in words. Export lives in the phone tool bar instead.
   */
  compact?: boolean;
};

/** Play, speed, Reset everything, export and full screen. `onReset` lets a world clear its own view state too. */
export default function Transport({ engine, onChange, fullscreen, onReset, compact }: Props) {
  const act = (fn: () => void) => () => { fn(); onChange(); };
  const speeds = engine.sb.speeds;
  const t = useT(), say = worldSay(engine.sb);
  const speedLabel = (i: number) => say(`speed.${i}`);
  const play = (
    <button className="btn primary" aria-label={t(engine.playing ? "console.transport.pause" : "console.transport.play")} onClick={act(() => (engine.playing = !engine.playing))}>
      <Icon name={engine.playing ? "pause" : "play"} />
      <span className="primary-text">{t(engine.playing ? "console.transport.pause" : "console.transport.play")}</span>
    </button>
  );
  // Reset everything (change 0024): default settings, no changes, time 0 — a clean start to test a process
  const reset = <button className="btn" aria-label={t("console.transport.resetLabel")} title={t("console.transport.resetTitle")} onClick={act(() => { engine.reset(); onReset?.(); })}><Icon name="reset" size={18} /><span className="btn-text">{t("console.transport.reset")}</span></button>;

  if (compact) {
    return (
      <div className="transport compact">
        {play}
        <SpeedPicker engine={engine} onChange={onChange} />
        {reset}
        {fullscreen && <FullscreenButton {...fullscreen} />}
      </div>
    );
  }

  return (
    <div className="transport">
      {play}
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
      {reset}
      <span className="hint">{engine.sb.hint ? say("meta.hint") : t(fullscreen?.on ? "console.transport.hintFull" : "console.transport.hint")}</span>
      <ExportButton engine={engine} />
      {fullscreen && <FullscreenButton {...fullscreen} />}
    </div>
  );
}

/** One wide button with the current speed; it opens every speed as a row, each said in words. */
function SpeedPicker({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const [open, setOpen] = useState(false);
  const t = useT(), say = worldSay(engine.sb);
  const words = (i: number) => {
    const p = speedParts(engine.sb.speeds[i][1]);
    return p ? t(`console.speed.${p.unit}`, { n: p.n }) : "";
  };
  return (
    <>
      <button type="button" className="btn speed-btn" aria-haspopup="dialog" aria-label={t("console.phone.speedLabel", { speed: words(engine.speedIdx) || say(`speed.${engine.speedIdx}`) })} onClick={() => setOpen(true)}>
        <span className="speed-k">{t("console.transport.speed")}</span>
        <span className="speed-v">{say(`speed.${engine.speedIdx}`)}</span>
        <Icon name="chevron" size={16} />
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title={t("console.phone.speedTitle")} className="speed-sheet">
        <p className="small speed-note">{t("console.phone.speedNote")}</p>
        <div className="speed-list" role="radiogroup" aria-label={t("console.transport.speed")}>
          {engine.sb.speeds.map(([, label], i) => (
            <button key={label} type="button" role="radio" aria-checked={engine.speedIdx === i}
              onClick={() => { engine.speedIdx = i; onChange(); setOpen(false); }}>
              <span className="speed-row-v">{say(`speed.${i}`)}</span>
              <span className="speed-row-w">{words(i)}</span>
              {engine.speedIdx === i && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
      </Sheet>
    </>
  );
}
