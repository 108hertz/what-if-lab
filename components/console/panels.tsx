"use client";

import { useEffect, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import ControlsForm from "./ControlsForm";
import { Icon } from "../ui/Icon";
import { useT } from "../i18n/I18nProvider";
import { whatIfsFor, worldSay } from "@/lib/sim/say";

type P = { engine: SimEngine; onChange: () => void };

/** World name with the ⓘ "About this model" popover (intro + how the lab works). */
export function WorldHeader({ engine }: { engine: SimEngine }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useT(), say = worldSay(engine.sb);
  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const click = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", click); };
  }, [open]);
  return (
    <div className="world-head" ref={ref}>
      <h2 className="title">{say("meta.name")}</h2>
      <button className="iconbtn" aria-label={t("console.about.label")} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name="info" /></button>
      {open && (
        <div className="popover" role="dialog" aria-label={t("console.about.label")}>
          <p className="desc">{say("meta.intro")}</p>
          <p className="small">{t("console.about.body")}</p>
        </div>
      )}
    </div>
  );
}

/** The what-ifs to pick (every world stacks them, change 0024). Each pick goes on the "Your changes" list. */
export function WhatIfList({ engine, onChange }: P) {
  const count = (id: string) => engine.applied.filter((x) => x === id).length;
  const t = useT(), say = worldSay(engine.sb, engine.params), list = whatIfsFor(engine.sb, engine.params);
  return (
    <section>
      <h3 className="headline">{t("console.whatifs.title")}<span className="hcount">{list.length}</span></h3>
      <div className="forks">
        {list.map(([id]) => {
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
    </section>
  );
}

export function Readouts({ engine }: { engine: SimEngine }) {
  const { sb } = engine;
  const { base, alt } = engine.readouts();
  const t = useT(), say = worldSay(sb, engine.params);
  return (
    <section>
      <h3 className="headline">{t("console.readouts.title")}</h3>
      <table>
        <thead><tr><th /><th><span className="ch">{t("console.world.base")}</span></th>{alt && <th><span className="ch a">{t("console.world.alt")}</span></th>}</tr></thead>
        <tbody>
          {sb.metrics.map((m) => (
            <tr key={m.k}>
              <td>{say(`metric.${m.k}.label`)}{m.unit && m.unit !== "/100" && <span className="unit"> {say(`metric.${m.k}.unit`)}</span>}</td>
              <td>{m.fmt(base[m.k])}</td>
              {alt && <td className="a">{m.fmt(alt[m.k])}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function InfoBlocks({ engine }: { engine: SimEngine }) {
  const info = engine.sb.info?.(engine.base, engine.alt, engine.params) ?? [];
  if (!info.length) return null;
  return (
    <section className="info">
      {info.map((block, i) => (
        <div key={i}>
          {block.heading && <h3 className={block.accent ? "headline accent" : "headline"}>{block.heading}</h3>}
          <dl>
            {block.rows.map((r, j) => (
              <div key={j}>
                {r.label && <dt>{r.label}</dt>}
                <dd>{r.color && <span className="key" style={{ background: r.color }} />}{r.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </section>
  );
}

export function TunePanel({ engine, onChange }: P) {
  const t = useT();
  return (
    <section>
      <h3 className="headline">{t("console.tune.title")}<span className="hcount">{engine.sb.controls.length}</span></h3>
      <ControlsForm engine={engine} onChange={onChange} />
      <p className="small">
        {engine.sb.controls.some((c) => c.type === "range" && c.live)
          ? t("console.tune.live")
          : t("console.tune.restart")}
      </p>
    </section>
  );
}
