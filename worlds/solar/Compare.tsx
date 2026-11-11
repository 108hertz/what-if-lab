"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { worldSay } from "@/lib/sim/say";
import { SYSTEMS } from "./data";
import { solar } from "./sim";

/** Log scale of the bars: 0.01 AU … 100 AU. */
const LO = -2, HI = 2;
const at = (au: number) => Math.max(0, Math.min(1, (Math.log10(au) - LO) / (HI - LO))) * 100;
/** Marks every 10×: 0.1, 1 (Earth's orbit) and 10 AU. */
const REFS = [0.1, 1, 10];

/**
 * "Compare sizes" (change 0037): every known system as a bar of its outermost orbit, with its star and planets.
 * A row picks that system (a new starting world, like the picker above it).
 */
export default function CompareSizes({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const say = worldSay(solar);
  const pick = (id: string) => {
    if (engine.params.sys === id) return;
    // A new system is a new world: it starts over (the picker's `fresh`)
    engine.setParam("sys", id);
    engine.restart();
    onChange();
  };
  return (
    <section className="cmp">
      <h3 className="headline">{say("cmp.title")}<span className="hcount">{SYSTEMS.length}</span></h3>
      <div className="cmp-scale" aria-hidden="true">
        {REFS.map((au) => <span key={au} style={{ insetInlineStart: `${at(au)}%` }}>{say("cmp.au", { n: au })}</span>)}
      </div>
      <ul className="cmp-list">
        {SYSTEMS.map((s) => {
          const mass = s.stars.reduce((a, x) => a + x.m, 0);
          return (
            <li key={s.id}>
              <button type="button" className="cmp-row" aria-pressed={engine.params.sys === s.id} onClick={() => pick(s.id)}>
                <span className="cmp-top"><span className="cmp-name">{say(`ctl.sys.opt.${s.id}`)}</span><span className="num">{say("cmp.au", { n: s.size })}</span></span>
                <span className="cmp-bar" aria-hidden="true">
                  {REFS.map((au) => <i key={au} style={{ insetInlineStart: `${at(au)}%` }} />)}
                  <b style={{ width: `${at(s.size)}%` }} />
                </span>
                <span className="cmp-facts">{say("cmp.facts", { kind: say(`kind.${s.kind}`), mass: Math.round(mass * 100) / 100, n: s.planets.length })}</span>
                <span className="cmp-note">{say(`note.${s.id}`)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="small">{say("cmp.note")}</p>
    </section>
  );
}
