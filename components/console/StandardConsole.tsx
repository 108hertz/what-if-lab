"use client";

import { useRef, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { useMedia } from "../ui/useMedia";
import Stage, { type StageInteraction } from "./Stage";
import Transport from "./Transport";
import HistoryChart from "./HistoryChart";
import Timeline from "./Timeline";
import Dock from "./Dock";
import AdSlot, { RAILS_QUERY } from "./AdSlot";
import { useFullscreen } from "./fullscreen";
import { InfoBlocks, Readouts, TunePanel, WhatIfList, WorldHeader } from "./panels";
import ChangeToggles from "./Changes";
import { useT } from "../i18n/I18nProvider";
import PhoneConsole from "./phone/PhoneConsole";

/**
 * The default world console (DESIGN.md → Layout). A world starts from this and copies it into its own
 * Console.tsx when it needs a different composition. Every band keeps its ad slot (ADR 0007):
 * rails (shell) ≥ 1600 · box at the foot of Tune 1280–1599 · box under the dock 1024–1279 · banner in PhoneConsole < 1024.
 */
/**
 * `onStage`: a world's own controls over the canvas (e.g. the space camera's view bar, change 0036).
 * `afterTune`: a world's own block under its settings (e.g. solar's "Compare sizes", change 0037).
 */
export default function StandardConsole({ engine, onChange, interaction, onStage, afterTune }: { engine: SimEngine; onChange: () => void; interaction?: StageInteraction; onStage?: ReactNode; afterTune?: ReactNode }) {
  const desk = useMedia("(min-width: 1024px)");
  const full = useMedia("(min-width: 1280px)");
  const wide = useMedia("(min-width: 1440px)");
  const rails = useMedia(RAILS_QUERY);
  const centre = useRef<HTMLElement>(null);
  const fs = useFullscreen(centre);
  const t = useT();

  // Your changes (each with a tick, change 0024) sit right under the world name, above the what-ifs to pick
  const ask = <><WorldHeader engine={engine} /><ChangeToggles engine={engine} onChange={onChange} /><WhatIfList engine={engine} onChange={onChange} /></>;
  const now = <Readouts engine={engine} />;
  const info = <InfoBlocks engine={engine} />;
  const tune = <><TunePanel engine={engine} onChange={onChange} />{afterTune}</>;
  const chart = <div className="chart-box"><HistoryChart engine={engine} /></div>;
  const log = <div className="log-box"><h3 className="headline">{t("console.timeline.title")}</h3><Timeline engine={engine} /></div>;

  // Phones and small tablets (change 0035): the stage fills the screen; tools open as sheets, results rise from the bottom
  if (!desk) {
    return (
      <PhoneConsole engine={engine} onChange={onChange}
        stage={<Stage engine={engine} interaction={interaction} onChange={onChange}>{onStage}</Stage>}
        whatIf={<>{engine.entries.length > 0 && <ChangeToggles engine={engine} onChange={onChange} />}<WhatIfList engine={engine} onChange={onChange} /></>}
        tune={tune}
        tabs={[[t("console.phone.now"), now], [t("console.phone.chart"), chart], [t("console.dock.log"), log], [t("console.phone.about"), <><WorldHeader engine={engine} />{info}</>]]} />
    );
  }

  let side: ReactNode;
  if (full) {
    side = (
      <aside className="col tune">
        <div className="col-body scrolly">{tune}</div>
        {!rails && <AdSlot size="box" promo />}
      </aside>
    );
  } else {
    side = (
      <div className="dock-col">
        <Dock key="desk" tabs={[[t("console.dock.ask"), ask], [t("console.dock.tune"), tune], [t("console.dock.read"), <>{now}{info}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  }

  return (
    <main className="console">
      {full && <aside className="col ask scrolly">{ask}{!wide && now}{info}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} interaction={interaction} onChange={onChange}>{onStage}</Stage>
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {!fs.on && <div className="results">{chart}{wide && <div className="now-box">{now}</div>}{log}</div>}
      </section>
      {side}
    </main>
  );
}
