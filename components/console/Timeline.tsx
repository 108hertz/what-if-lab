"use client";

import type { SimEngine } from "@/lib/sim/engine";

export default function Timeline({ engine }: { engine: SimEngine }) {
  const items = engine.timeline();
  const who = { both: engine.alt ? "Both worlds" : "", base: "Only with no change", alt: "Only in the what-if" };
  // The fork moment is pinned into the log at its time (newest first), matching the chart's fork marker.
  const forkT = engine.alt && !engine.sb.stack ? engine.history.forkT : null;
  if (!items.length && forkT == null) return <ul className="tl"><li><p className="empty">Nothing notable yet. Let it run, or ask a what-if.</p></li></ul>;
  const at = forkT == null ? -1 : (() => { const k = items.findIndex((e) => e.t <= forkT); return k < 0 ? items.length : k; })();
  const forkRow = forkT == null ? null : (
    <li key="fork" className="fork-row">
      <time>{engine.sb.fmtT(forkT)}</time>
      <span className="dot" />
      <span>The worlds split here: {engine.whatIfLabel()}</span>
    </li>
  );
  return (
    <ul className="tl">
      {items.map((e, i) => [
        i === at ? forkRow : null,
        <li key={i} className={e.who}>
          <time>{engine.sb.fmtT(e.t)}</time>
          <span className="dot" />
          <span>{e.txt}{who[e.who] && <span className="who micro">{who[e.who]}</span>}</span>
        </li>,
      ])}
      {at === items.length && forkRow}
    </ul>
  );
}
