"use client";

import { useRef, useState, type ReactNode } from "react";
import { useWorldEngine } from "@/components/console/engines";
import { useMedia } from "@/components/ui/useMedia";
import Stage from "@/components/console/Stage";
import Transport from "@/components/console/Transport";
import Dock from "@/components/console/Dock";
import AdSlot, { RAILS_QUERY } from "@/components/console/AdSlot";
import { useFullscreen } from "@/components/console/fullscreen";
import { TunePanel, WorldHeader } from "@/components/console/panels";
import { animals } from "./sim";
import { useT } from "@/components/i18n/I18nProvider";
import AnimalChart from "./Chart";
import PhoneConsole from "@/components/console/phone/PhoneConsole";
import { AnimalTimeline, CastEditor, ChangeList, Facts, Portrait, RightNow, Story, WorldPicker } from "./parts";

/**
 * The animals world's console (change 0017), copied from StandardConsole's bands with country's as the reference.
 * Ask: world picker → who lives here → changes (stacking) → story; Right now, then-and-now and facts sit in Ask at
 * ≥ 1280 and in Read below that. The world owns its chart (two views + a sentence) and timeline. Ad slots kept (ADR 0007).
 */
export default function AnimalsConsole() {
  const [engine, onChange] = useWorldEngine(animals);
  const desk = useMedia("(min-width: 1024px)");
  const full = useMedia("(min-width: 1280px)");
  const rails = useMedia(RAILS_QUERY);
  const centre = useRef<HTMLElement>(null);
  const fs = useFullscreen(centre);
  const [view, setView] = useState(0);
  const [focus, setFocus] = useState(0);
  const t = useT();

  const ask = <><WorldHeader engine={engine} /><WorldPicker engine={engine} onChange={onChange} /><CastEditor engine={engine} onChange={onChange} /><ChangeList engine={engine} onChange={onChange} /></>;
  const story = <Story engine={engine} />;
  const now = <RightNow engine={engine} />;
  const portrait = <Portrait engine={engine} focus={focus} setFocus={setFocus} />;
  const facts = <Facts engine={engine} />;
  const tune = <TunePanel engine={engine} onChange={onChange} />;
  const chart = <AnimalChart engine={engine} view={view} setView={setView} focus={focus} setFocus={setFocus} />;
  const log = <div className="log-box"><h3 className="headline">{t("console.timeline.title")}</h3><AnimalTimeline engine={engine} /></div>;

  // Phones (change 0035): the arena fills the screen; changes and the cast open as sheets
  if (!desk) {
    return (
      <PhoneConsole engine={engine} onChange={onChange}
        stage={<Stage engine={engine} onChange={onChange} />}
        whatIf={<ChangeList engine={engine} onChange={onChange} />}
        tune={<><WorldPicker engine={engine} onChange={onChange} /><CastEditor engine={engine} onChange={onChange} />{tune}</>}
        tabs={[[t("console.phone.now"), <>{story}{now}{portrait}</>], [t("console.phone.chart"), chart], [t("console.dock.log"), log], [t("console.phone.about"), <><WorldHeader engine={engine} />{facts}</>]]} />
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
        <Dock key="desk" tabs={[[t("console.dock.ask"), ask], [t("console.dock.tune"), tune], [t("console.dock.read"), <>{story}{now}{portrait}{facts}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  }

  return (
    <main className="console">
      {full && <aside className="col ask scrolly">{ask}{story}{now}{portrait}{facts}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} onChange={onChange} />
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {!fs.on && <div className="results country-results">{chart}{log}</div>}
      </section>
      {side}
    </main>
  );
}
