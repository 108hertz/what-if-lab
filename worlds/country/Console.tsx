"use client";

import { useRef, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { useWorldEngine } from "@/components/console/engines";
import { useMedia } from "@/components/ui/useMedia";
import { Icon } from "@/components/ui/Icon";
import Stage from "@/components/console/Stage";
import Transport from "@/components/console/Transport";
import HistoryChart from "@/components/console/HistoryChart";
import Timeline from "@/components/console/Timeline";
import Dock from "@/components/console/Dock";
import AdSlot, { RAILS_QUERY } from "@/components/console/AdSlot";
import { useFullscreen } from "@/components/console/fullscreen";
import { InfoBlocks, Readouts, TunePanel, WorldHeader } from "@/components/console/panels";
import ChangeToggles from "@/components/console/Changes";
import { COUNTRY_GROUPS } from "./data";
import { country, countryName, WHATIF_GROUPS } from "./sim";
import { useT } from "@/components/i18n/I18nProvider";
import { worldSay } from "@/lib/sim/say";

type P = { engine: SimEngine; onChange: () => void };

/** "Pick a country": restarts the world from that profile (same param as the Tune select). */
function CountryPicker({ engine, onChange }: P) {
  const p = engine.params as { preset: string; from?: string };
  const pick = (v: string) => { engine.rebuild(engine.setParam("preset", v).keys); onChange(); };
  const say = worldSay(country);
  return (
    <label className="ctl country-pick" htmlFor="country-pick">
      <span className="ctl-head">{say("ui.pick")}</span>
      <span className="select">
        <select id="country-pick" value={p.preset} onChange={(e) => pick(e.target.value)}>
          {COUNTRY_GROUPS.map(([g, opts], i) => (
            <optgroup key={g} label={say(`ctl.preset.group.${i}`)}>
              {opts.map(([v]) => <option key={v} value={v}>{v === "custom" ? countryName(p) : say(`ctl.preset.opt.${v}`)}</option>)}
            </optgroup>
          ))}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </label>
  );
}

/** The 16 policies in four groups. They stack: every click adds to the changed world. */
function PolicyList({ engine, onChange }: P) {
  const t = useT(), say = worldSay(country);
  const count = (id: string) => engine.applied.filter((x) => x === id).length;
  return (
    <section>
      <h3 className="headline">{t("console.whatifs.title")}</h3>
      <p className="small hint-line">{say("ui.changesHint")}</p>
      {WHATIF_GROUPS.map(([g, ids], i) => (
        <div key={g} className="forks">
          <span className="ctl-head">{say(`group.${i}`)}</span>
          {ids.map((id) => {
            const n = count(id);
            return (
              <button key={id} className="fork" aria-pressed={n > 0} onClick={() => { engine.change(id); onChange(); }}>
                <Icon name="fork" />
                {say(`whatif.${id}`)}
                {n > 1 && <span className="count" aria-label={t("console.whatifs.applied", { n })}>×{n}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </section>
  );
}

/**
 * The country world's console (change 0016): StandardConsole's layout with a country picker, grouped policies and
 * readouts in Ask at every width (the chart takes the whole results strip beside the timeline). Ad slots kept (ADR 0007).
 */
export default function CountryConsole() {
  const [engine, onChange] = useWorldEngine(country);
  const desk = useMedia("(min-width: 1024px)");
  const full = useMedia("(min-width: 1280px)");
  const rails = useMedia(RAILS_QUERY);
  const centre = useRef<HTMLElement>(null);
  const fs = useFullscreen(centre);
  const t = useT();

  const ask = <><WorldHeader engine={engine} /><CountryPicker engine={engine} onChange={onChange} /><ChangeToggles engine={engine} onChange={onChange} /><PolicyList engine={engine} onChange={onChange} /></>;
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
        <Dock key="desk" tabs={[[t("console.dock.ask"), ask], [t("console.dock.tune"), tune], [t("console.dock.read"), <>{info}{now}</>]]} />
        <AdSlot size="box" promo />
      </div>
    );
  } else {
    side = (
      <>
        <Dock key="phone" tabs={[[t("console.dock.ask"), ask], [t("console.dock.tune"), tune], [t("console.dock.read"), <>{info}{chart}{now}</>], [t("console.dock.log"), log]]} />
        <AdSlot size="banner" />
      </>
    );
  }

  return (
    <main className="console">
      {full && <aside className="col ask scrolly">{ask}{info}{now}</aside>}
      <section className="centre" ref={centre}>
        <Stage engine={engine} onChange={onChange} />
        <Transport engine={engine} onChange={onChange} fullscreen={fs} />
        {/* Readouts live in Ask at every width, so the chart keeps room for its seven tabs and its sentence */}
        {desk && !fs.on && <div className="results country-results">{chart}{log}</div>}
      </section>
      {side}
    </main>
  );
}
