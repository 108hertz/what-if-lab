"use client";

import { useRef, useState, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { useWorldEngine } from "@/components/console/engines";
import { useMedia } from "@/components/ui/useMedia";
import Stage, { type StageInteraction } from "@/components/console/Stage";
import Transport from "@/components/console/Transport";
import Dock from "@/components/console/Dock";
import AdSlot, { RAILS_QUERY } from "@/components/console/AdSlot";
import { useFullscreen } from "@/components/console/fullscreen";
import { WorldHeader } from "@/components/console/panels";
import { child } from "./sim";
import ChildChart from "./Chart";
import { AboutScience, ChangeList, ChildTimeline, ChildTune, FamilyPicker, HomeSettings, MeetChild, NatureBar, ParentCards, Story } from "./parts";
import { pointAt, setStageTrait, tapAt } from "./scene";
import s from "./child.module.css";

/** Hover shows a kid's name and traits; a tap does the same, or switches the strip on small stages. */
const STAGE_INPUT: StageInteraction = {
  down: (_e: SimEngine, x, y) => tapAt(x, y),
  move: (_e: SimEngine, x, y) => pointAt(x, y),
  up: () => false,
};

/**
 * The child world's console (change 0018), copied from StandardConsole's bands with animals' as the reference.
 * Ask: family → parents → home → things that can happen (stacking, with an age) → story; Meet the child, why they differ
 * and the science sit in Ask at ≥ 1280 and in Read below that. The world owns its chart (two views + a sentence) and
 * timeline. Ad slots kept (ADR 0007).
 */
export default function ChildConsole() {
  const [engine, onChange] = useWorldEngine(child);
  const desk = useMedia("(min-width: 1024px)");
  const full = useMedia("(min-width: 1280px)");
  const rails = useMedia(RAILS_QUERY);
  const centre = useRef<HTMLElement>(null);
  const fs = useFullscreen(centre);
  const [view, setView] = useState(0);
  const [trait, setTraitState] = useState(0);
  const [kid, setKid] = useState(-1);
  const setTrait = (i: number) => { setTraitState(i); setStageTrait(i); };

  const ask = <><WorldHeader engine={engine} /><FamilyPicker engine={engine} onChange={onChange} /><ParentCards engine={engine} onChange={onChange} /><HomeSettings engine={engine} onChange={onChange} /><ChangeList engine={engine} onChange={onChange} /></>;
  const story = <Story engine={engine} />;
  const meet = <MeetChild engine={engine} kid={kid} setKid={setKid} />;
  const why = <NatureBar engine={engine} />;
  const science = <AboutScience />;
  const tune = <ChildTune engine={engine} onChange={onChange} />;
  const chart = <ChildChart engine={engine} view={view} setView={setView} trait={trait} setTrait={setTrait} />;
  const log = <div className="log-box"><h3 className="headline">Timeline</h3><ChildTimeline engine={engine} /></div>;

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
        <Dock key="desk" tabs={[["Ask", <>{ask}{story}</>], ["Tune", tune], ["Read", <>{meet}{why}{science}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  } else {
    side = (
      <>
        <Dock key="phone" tabs={[["Ask", ask], ["Tune", tune], ["Read", <>{meet}{story}{chart}{why}{science}</>], ["Log", log]]} />
        <AdSlot size="banner" />
      </>
    );
  }

  return (
    <main className={`console ${s.vars}`}>
      {full && <aside className="col ask scrolly">{ask}{story}{meet}{why}{science}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} onChange={onChange} interaction={STAGE_INPUT} />
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {desk && !fs.on && <div className="results country-results">{chart}{log}</div>}
      </section>
      {side}
    </main>
  );
}
