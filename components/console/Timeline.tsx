"use client";

import type { SimEngine } from "@/lib/sim/engine";

export default function Timeline({ engine }: { engine: SimEngine }) {
  const items = engine.timeline();
  const who = { both: engine.alt ? "Both worlds" : "", base: "Only with no change", alt: "Only with changes" };
  if (!items.length) return <ul className="tl"><li><p className="empty">Nothing notable yet. Let it run, or make a change.</p></li></ul>;
  // Each change logs its own line; the stage is never split (change 0024), so there is no split row
  return (
    <ul className="tl">
      {items.map((e, i) => (
        <li key={i} className={e.who}>
          <time>{engine.sb.fmtT(e.t)}</time>
          <span className="dot" />
          <span>{e.txt}{who[e.who] && <span className="who micro">{who[e.who]}</span>}</span>
        </li>
      ))}
    </ul>
  );
}
