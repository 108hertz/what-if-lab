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

/**
 * The default world console (DESIGN.md → Layout). A world starts from this and copies it into its own
 * Console.tsx when it needs a different composition. Every band keeps its ad slot (ADR 0007):
 * rails (shell) ≥ 1600 · box at the foot of Tune 1280–1599 · box under the dock 1024–1279 · banner under the dock < 1024.
 */
export default function StandardConsole({ engine, onChange, interaction }: { engine: SimEngine; onChange: () => void; interaction?: StageInteraction }) {
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
  const tune = <TunePanel engine={engine} onChange={onChange} />;
  const chart = <div className="chart-box"><HistoryChart engine={engine} /></div>;
  const log = <div className="log-box"><h3 className="headline">{t("console.timeline.title")}</h3><Timeline engine={engine} /></div>;

  let side: ReactNode;
  if (full) {
    side = (
      <aside className="col tune">
        <div className="col-body scrolly">{tune}</div>
        {!rails && <AdSlot size="box" promo />}
      </aside>
    );
  } else if (desk) {
    side = (
      <div className="dock-col">
        <Dock key="desk" tabs={[[t("console.dock.ask"), ask], [t("console.dock.tune"), tune], [t("console.dock.read"), <>{now}{info}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  } else {
    side = (
      <>
        <Dock key="phone" tabs={[[t("console.dock.ask"), ask], [t("console.dock.tune"), tune], [t("console.dock.read"), <>{now}{info}{chart}</>], [t("console.dock.log"), log]]} />
        <AdSlot size="banner" />
      </>
    );
  }

  return (
    <main className="console">
      {full && <aside className="col ask scrolly">{ask}{!wide && now}{info}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} interaction={interaction} onChange={onChange} />
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {desk && !fs.on && <div className="results">{chart}{wide && <div className="now-box">{now}</div>}{log}</div>}
      </section>
      {side}
    </main>
  );
}
