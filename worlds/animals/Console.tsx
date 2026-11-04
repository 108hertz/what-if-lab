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
import AnimalChart from "./Chart";
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

  const ask = <><WorldHeader engine={engine} /><WorldPicker engine={engine} onChange={onChange} /><CastEditor engine={engine} onChange={onChange} /><ChangeList engine={engine} onChange={onChange} /></>;
  const story = <Story engine={engine} />;
  const now = <RightNow engine={engine} />;
  const portrait = <Portrait engine={engine} focus={focus} setFocus={setFocus} />;
  const facts = <Facts engine={engine} />;
  const tune = <TunePanel engine={engine} onChange={onChange} />;
  const chart = <AnimalChart engine={engine} view={view} setView={setView} focus={focus} setFocus={setFocus} />;
  const log = <div className="log-box"><h3 className="headline">Timeline</h3><AnimalTimeline engine={engine} /></div>;

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
        <Dock key="desk" tabs={[["Ask", ask], ["Tune", tune], ["Read", <>{story}{now}{portrait}{facts}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  } else {
    side = (
      <>
        <Dock key="phone" tabs={[["Ask", ask], ["Tune", tune], ["Read", <>{story}{now}{portrait}{chart}{facts}</>], ["Log", log]]} />
        <AdSlot size="banner" />
      </>
    );
  }

  return (
    <main className="console">
      {full && <aside className="col ask scrolly">{ask}{story}{now}{portrait}{facts}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} onChange={onChange} />
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {desk && !fs.on && <div className="results country-results">{chart}{log}</div>}
      </section>
      {side}
    </main>
  );
}
