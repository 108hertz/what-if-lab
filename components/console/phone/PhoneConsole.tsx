"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { eventText, worldSay } from "@/lib/sim/say";
import { useMedia } from "../../ui/useMedia";
import { Icon } from "../../ui/Icon";
import { useT } from "../../i18n/I18nProvider";
import Transport from "../Transport";
import Dock from "../Dock";
import AdSlot from "../AdSlot";
import { useFullscreen } from "../fullscreen";
import { ExportButton } from "../export/ExportDialog";
import Sheet from "./Sheet";
import ResultsDrawer from "./ResultsDrawer";

export const PHONE_SIDEWAYS = "(max-height: 520px)";

/**
 * The phone console (change 0035), shared by every world below 1024 px. The stage takes most of the screen; under it sit
 * the results strip (it rises to fill the screen), a tool bar (What if… · Tune · Export) whose tools open as sheets, and
 * the 320 × 50 banner (ADR 0007), kept here so no world can drop it. Sideways phones: stage left, a tool rail right,
 * results in a side sheet. Each world passes what goes into each sheet and tab.
 */
export default function PhoneConsole({ engine, onChange, stage, whatIf, tune, tabs, peek, onReset, className, pick }: {
  engine: SimEngine;
  onChange: () => void;
  /** The world's <Stage> (with any on-stage controls). */
  stage: ReactNode;
  /** The What if… sheet: "Your changes" and the what-ifs to pick. */
  whatIf: ReactNode;
  /** The Tune sheet: the world's settings. */
  tune: ReactNode;
  /** Results tabs: [label, content], e.g. Now · Chart · Log · About. */
  tabs: [string, ReactNode][];
  /** The gist shown in the closed results strip; defaults to the first readout and the latest event. */
  peek?: ReactNode;
  onReset?: () => void;
  className?: string;
  /**
   * A world you can swap (the solar and galaxy catalogues, change 0037/0038): a chip on the stage names what is running
   * and opens `content` (e.g. "Compare sizes", whose rows pick) in its own sheet, which closes once the label changes.
   */
  pick?: { label: string; title: string; content: ReactNode };
}) {
  const t = useT();
  const host = useRef<HTMLElement>(null);
  const centre = useRef<HTMLElement>(null);
  const fs = useFullscreen(centre);
  const sideways = useMedia(PHONE_SIDEWAYS);
  const [sheet, setSheet] = useState<null | "whatif" | "tune" | "results" | "pick">(null);
  const [open, setOpen] = useState(false);
  const close = () => setSheet(null);

  // Picking a what-if closes its sheet, so the visitor sees the world change; the strip flashes the new state
  const made = engine.entries.length;
  const before = useRef(made);
  const [flash, setFlash] = useState(0);
  useEffect(() => {
    if (made > before.current) { setSheet((s) => (s === "whatif" ? null : s)); setFlash((f) => f + 1); }
    before.current = made;
  }, [made]);

  // A new system or galaxy picked: close its sheet so the new world shows
  const picked = pick?.label, shown = useRef(picked);
  useEffect(() => {
    if (picked !== shown.current) setSheet((s) => (s === "pick" ? null : s));
    shown.current = picked;
  }, [picked]);

  const on = engine.entries.filter((e) => e.on).length;
  const tool = (id: "whatif" | "tune" | "results", icon: "fork" | "tune" | "chart", label: string, extra?: ReactNode) => (
    <button type="button" className={`tool-btn${id === "whatif" ? " whatif" : ""}`} aria-haspopup="dialog" aria-expanded={sheet === id} onClick={() => setSheet(id)}>
      <Icon name={icon} size={20} />
      <span className="tool-l">{label}</span>
      {extra}
    </button>
  );

  return (
    <main className={`console phone${open && !sideways ? " results-open" : ""}${className ? " " + className : ""}`} ref={host}>
      <section className="centre" ref={centre}>
        {stage}
        {pick && (
          <button type="button" className="pick-chip" aria-haspopup="dialog" aria-expanded={sheet === "pick"}
            aria-label={t("console.phone.pick", { name: pick.label })} onClick={() => setSheet("pick")}>
            <span className="pick-chip-l">{pick.label}</span><Icon name="chevron" size={16} />
          </button>
        )}
        <Transport engine={engine} onChange={onChange} fullscreen={fs} onReset={onReset} compact />
      </section>
      {!sideways && (
        <ResultsDrawer tabs={tabs} open={open} setOpen={setOpen} host={host}
          peek={<div className="peek" key={flash} data-flash={flash > 0 || undefined}>{peek ?? <Peek engine={engine} />}</div>} />
      )}
      <div className="tools">
        {made === 0 && !sideways && <p className="phone-cue"><Icon name="fork" size={16} />{t("console.phone.pickFirst")}</p>}
        <nav className="toolbar" aria-label={t("console.dock.tools")}>
          {tool("whatif", "fork", t("console.phone.whatIf"), on > 0 && <span className="tool-n" aria-label={t("console.phone.onCount", { n: on })}>{on}</span>)}
          {tool("tune", "tune", t("console.dock.tune"))}
          {sideways && tool("results", "chart", t("console.phone.results"))}
          <ExportButton engine={engine} tool />
        </nav>
      </div>
      <AdSlot size="banner" />
      <Sheet open={sheet === "whatif"} onClose={close} title={t("console.phone.whatIfTitle")} count={on > 0 ? on : undefined} className="whatif-sheet">{whatIf}</Sheet>
      <Sheet open={sheet === "tune"} onClose={close} title={t("console.tune.title")}>{tune}</Sheet>
      {pick && <Sheet open={sheet === "pick"} onClose={close} title={pick.title} className="pick-sheet">{pick.content}</Sheet>}
      {sideways && <Sheet open={sheet === "results"} onClose={close} title={t("console.phone.results")} className="results-sheet"><Dock tabs={tabs} /></Sheet>}
    </main>
  );
}

/** The closed results strip: the world's first readout in both worlds, and the newest line of the log. */
export function Peek({ engine }: { engine: SimEngine }) {
  const t = useT(), say = worldSay(engine.sb, engine.params);
  const m = engine.sb.metrics[0];
  const { base, alt } = engine.readouts();
  const last = engine.timeline(1)[0];
  return (
    <>
      {m && (
        <div className="peek-row">
          <span className="peek-k">{say(`metric.${m.k}.label`)}{m.unit && m.unit !== "/100" && <span className="unit"> {say(`metric.${m.k}.unit`)}</span>}</span>
          <span className="peek-v"><span className="ch">{m.fmt(base[m.k])}</span>{alt && <span className="ch a">{m.fmt(alt[m.k])}</span>}</span>
        </div>
      )}
      <p className="peek-ev">
        {last ? <><time>{engine.sb.fmtT(last.t)}</time> {eventText(engine.sb, last)}</> : t("console.timeline.empty")}
      </p>
    </>
  );
}
