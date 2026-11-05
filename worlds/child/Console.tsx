"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { AboutScience, ChangeList, ChildTimeline, ChildTune, FamilyPicker, Glossary, HomeSettings, MeetChild, NatureBar, ParentCards, Story } from "./parts";
import { SHOW, WORD } from "./data";
import { pointAt, setHeroKid, setStageTrait, setStageView, stageView, tapAt, type StageView } from "./scene";
import s from "./child.module.css";

/**
 * On-stage controls (change 0019): switch between one child and the whole crowd; in the crowd, which trait the piles show;
 * with a picked kid, a way back to the typical one.
 */
function StageControls({ view, setView, trait, setTrait, kid, setKid }: {
  view: StageView; setView: (v: StageView) => void; trait: number; setTrait: (i: number) => void; kid: number; setKid: (j: number) => void;
}) {
  return (
    <>
      <div className={`seg ${s.viewSeg}`} role="group" aria-label="What the stage shows">
        {([["one", "One child"], ["all", "All 120 kids"]] as [StageView, string][]).map(([v, l]) => (
          <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)}>{l}</button>
        ))}
      </div>
      {view === "all" && (
        <div className={`seg ${s.viewSeg} ${s.traitSeg}`} role="group" aria-label="Which trait the piles show">
          {SHOW.map((t, i) => <button key={t} type="button" aria-pressed={trait === i} onClick={() => setTrait(i)}>{WORD[t]}</button>)}
        </div>
      )}
      {view === "one" && kid >= 0 && (
        <div className={`seg ${s.viewSeg} ${s.traitSeg}`}>
          <button type="button" onClick={() => setKid(-1)}>Back to the typical kid</button>
        </div>
      )}
    </>
  );
}

/**
 * The child world's console (change 0018), copied from StandardConsole's bands with animals' as the reference.
 * Ask (change 0019): two tabs — Changes (settings, life ruler, grouped changes, story) and Family (family, parents, home); Meet the child, why they differ
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
  const [sview, setSview] = useState<StageView>(stageView());
  const pickView = (v: StageView) => { setSview(v); setStageView(v); };
  // The kid "Meet the child" shows is also the kid the stage shows in "One child"; tap a face in the crowd to pick one
  useEffect(() => { setHeroKid(kid); }, [kid]);
  const stageInput = useMemo<StageInteraction>(() => ({
    down: (_e: SimEngine, x, y) => {
      if (stageView() !== "all") return;
      const j = tapAt(x, y);
      if (j >= 0) { setKid(j); setSview("one"); setStageView("one"); }
    },
    move: (_e: SimEngine, x, y) => { if (stageView() === "all") pointAt(x, y); },
    up: () => false,
  }), []);

  // Ask in two tabs (change 0019): what happens in their life, and the family they start in
  const [askTab, setAskTab] = useState(0);
  const story = <Story engine={engine} />;
  const ask = (
    <>
      <WorldHeader engine={engine} />
      <div className={`mtabs ${s.askTabs}`} role="group" aria-label="Ask">
        {["Changes", "Family"].map((l, i) => <button key={l} type="button" aria-pressed={askTab === i} onClick={() => setAskTab(i)}>{l}</button>)}
      </div>
      {askTab === 0
        ? <><ChangeList engine={engine} onChange={onChange} />{story}</>
        : <><FamilyPicker engine={engine} onChange={onChange} /><ParentCards engine={engine} onChange={onChange} /><HomeSettings engine={engine} onChange={onChange} /></>}
    </>
  );
  const meet = <MeetChild engine={engine} kid={kid} setKid={setKid} />;
  const why = <NatureBar engine={engine} />;
  const science = <><Glossary /><AboutScience /></>;
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
        <Dock key="desk" tabs={[["Ask", ask], ["Tune", tune], ["Read", <>{meet}{why}{science}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  } else {
    side = (
      <>
        <Dock key="phone" tabs={[["Ask", ask], ["Tune", tune], ["Read", <>{meet}{chart}{why}{science}</>], ["Log", log]]} />
        <AdSlot size="banner" />
      </>
    );
  }

  return (
    <main className={`console ${s.vars}`}>
      {full && <aside className="col ask scrolly">{ask}{meet}{why}{science}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} onChange={onChange} interaction={stageInput}>
          <StageControls view={sview} setView={pickView} trait={trait} setTrait={setTrait} kid={kid} setKid={setKid} />
        </Stage>
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {desk && !fs.on && <div className="results country-results">{chart}{log}</div>}
      </section>
      {side}
    </main>
  );
}
