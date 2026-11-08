"use client";

import type { SimEngine } from "@/lib/sim/engine";
import { eventText } from "@/lib/sim/say";
import { useT } from "../i18n/I18nProvider";

export default function Timeline({ engine }: { engine: SimEngine }) {
  const items = engine.timeline();
  const t = useT();
  const who = { both: engine.alt ? t("console.world.both") : "", base: t("console.world.onlyBase"), alt: t("console.world.onlyAlt") };
  if (!items.length) return <ul className="tl"><li><p className="empty">{t("console.timeline.empty")}</p></li></ul>;
  // Each change logs its own line; the stage is never split (change 0024), so there is no split row
  return (
    <ul className="tl">
      {items.map((e, i) => (
        <li key={i} className={e.who}>
          <time>{engine.sb.fmtT(e.t)}</time>
          <span className="dot" />
          <span>{eventText(engine.sb, e)}{who[e.who] && <span className="who micro">{who[e.who]}</span>}</span>
        </li>
      ))}
    </ul>
  );
}
