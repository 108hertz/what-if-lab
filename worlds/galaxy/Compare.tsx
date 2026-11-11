"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { numberFormat } from "@/lib/i18n/message";
import { pageT } from "@/lib/i18n/page";
import { worldSay } from "@/lib/sim/say";
import { GALAXIES, galaxyOf, pairOf } from "./data";
import { galaxy } from "./sim";

/** Log scale of the bars, in thousands of light-years: 1 … 10,000 kly. */
const LO = 0, HI = 4;
const at = (kly: number) => Math.max(0, Math.min(1, (Math.log10(kly) - LO) / (HI - LO))) * 100;
/** Marks every 10×: 10,000, 100,000 (the Milky Way) and 1,000,000 ly. */
const REFS = [10, 100, 1000];

/** Billions → "250 billion" / "1.25 trillion", in the page's language. */
const big = (billions: number) => numberFormat(pageT().tag, { notation: "compact", compactDisplay: "long", maximumSignificantDigits: 3 }).format(billions * 1e9);

/**
 * "Compare sizes" (change 0038): every known galaxy as a bar of its diameter, with its stars and mass. Our galaxy is
 * tagged; a row picks the incoming galaxy (a new starting world, like the picker above it).
 */
export default function CompareGalaxies({ engine, onChange }: { engine: SimEngine; onChange: () => void }) {
  const say = worldSay(galaxy);
  const { ours, them } = engine.params as { ours: string; them: string };
  const pick = (id: string) => {
    if (them === id) return;
    // A new pair is a new world: it starts over (the picker's `fresh`)
    engine.setParam("them", id);
    engine.restart();
    onChange();
  };
  const pair = pairOf(ours, them), names = { ours: say(`gal.${galaxyOf(ours).id}`), them: say(`gal.${galaxyOf(them).id}`) };
  return (
    <section className="cmp">
      <h3 className="headline">{say("cmp.title")}<span className="hcount">{GALAXIES.length}</span></h3>
      <div className="cmp-scale" aria-hidden="true">
        {REFS.map((k) => <span key={k} style={{ insetInlineStart: `${at(k)}%` }}>{say("cmp.kly", { n: k * 1000 })}</span>)}
      </div>
      <ul className="cmp-list">
        {GALAXIES.map((g) => (
          <li key={g.id}>
            <button type="button" className="cmp-row" aria-pressed={them === g.id} onClick={() => pick(g.id)}>
              <span className="cmp-top">
                <span className="cmp-name">{say(`ctl.them.opt.${g.id}`)}{ours === g.id && <span className="micro cmp-tag">{say("cmp.ours")}</span>}</span>
                <span className="num">{say("cmp.kly", { n: g.dkly * 1000 })}</span>
              </span>
              <span className="cmp-bar" aria-hidden="true">
                {REFS.map((k) => <i key={k} style={{ insetInlineStart: `${at(k)}%` }} />)}
                <b style={{ width: `${at(g.dkly)}%` }} />
              </span>
              <span className="cmp-facts">
                {say("cmp.facts", { kind: say(`kind.${g.kind}`), stars: big(g.starsB), mass: big(g.massT * 1000) })}
                {g.bh != null && <> · {say("cmp.bh", { mass: big(g.bh) })}</>}
              </span>
              <span className="cmp-note">{say(`note.${g.id}`)}</span>
            </button>
          </li>
        ))}
      </ul>
      {pair.capped && <p className="small">{say("cmp.cap", { ...names, x: pair.mass, real: pair.real < 1 ? Math.round(pair.real * 1000) / 1000 : Math.round(pair.real) })}</p>}
      <p className="small">{say("cmp.note")}</p>
    </section>
  );
}
