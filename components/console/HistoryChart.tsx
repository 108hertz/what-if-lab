"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import type { Metric } from "@/lib/sim/types";
import { FONT } from "@/lib/sim/draw";
import { worldSay } from "@/lib/sim/say";
import { useT } from "../i18n/I18nProvider";

/** Chart lives in the page chrome, so it follows the theme tokens rather than the stage palette. */
const token = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();

/** One plain sentence under the chart: what the metric means, then the gap right now (change 0016). Only for metrics with `help`. */
function ChartNote({ engine, m }: { engine: SimEngine; m: Metric }) {
  const { base, alt } = engine.readouts();
  const b = base[m.k], a = alt?.[m.k];
  let gap: ReactNode = null;
  const t = useT(), help = m.help ? worldSay(engine.sb)(`metric.${m.k}.help`) : undefined;
  if (alt && b != null && a != null && m.diff) {
    const d = a - b, txt = m.diff(d);
    const good = m.better && txt ? (m.better === "up" ? d > 0 : d < 0) : null;
    gap = <>{t("console.chart.withChanges")} <span className={good == null ? undefined : good ? "good" : "bad"}>{txt || t("console.chart.noDiff")}</span>. </>;
  }
  return <p className="chart-note" title={help}>{gap}{help}</p>;
}

export default function HistoryChart({ engine }: { engine: SimEngine }) {
  const [metric, setMetric] = useState(0);
  const ref = useRef<HTMLCanvasElement>(null);
  const m = engine.sb.metrics[Math.min(metric, engine.sb.metrics.length - 1)];
  const t = useT(), say = worldSay(engine.sb);

  // Redraws on every parent re-render (the Lab refreshes every 300 ms).
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const COL = { base: token("--base"), alt: token("--alt"), grid: token("--separator"), text: token("--label-2") };
    const h = engine.history, b = h.base[m.k], a = h.alt[m.k], n = h.t.length;
    const vals = [...b, ...a].filter((v): v is number => v != null && isFinite(v));
    if (!vals.length || n < 2) { c.fillStyle = COL.text; c.font = "14px " + FONT.body; c.fillText(t("console.chart.collecting"), 10, 20); return; }
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    c.font = "500 11px " + FONT.mono;
    const labels = [0, 1, 2, 3].map((k) => lo + ((hi - lo) * k) / 3);
    const L = Math.max(...labels.map((v) => c.measureText(m.fmt(v)).width)) + 10, R = 6, T = 6, B = 20, pw = W - L - R, ph = H - T - B;
    const t0 = h.t[0], t1 = h.t[n - 1];
    const X = (t: number) => L + (pw * (t - t0)) / Math.max(1e-9, t1 - t0), Y = (v: number) => T + ph * (1 - (v - lo) / (hi - lo));
    c.strokeStyle = COL.grid; c.fillStyle = COL.text; c.textAlign = "right"; c.textBaseline = "middle";
    labels.forEach((v) => { const y = Y(v); c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke(); c.fillText(m.fmt(v), L - 6, y); });
    c.textBaseline = "top"; c.textAlign = "left"; c.fillText(engine.sb.fmtT(t0), L, H - B + 5);
    c.textAlign = "right"; c.fillText(engine.sb.fmtT(t1), W - R, H - B + 5);
    if (h.forkT != null) {
      const x = X(h.forkT);
      // The fork marker: the same instant the stage's "forked at" chip and the timeline's pinned row point at
      c.strokeStyle = COL.alt; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 0.5, T); c.lineTo(x + 0.5, T + ph); c.stroke();
      c.fillStyle = COL.alt; c.beginPath(); c.moveTo(x + 0.5, T); c.lineTo(x + 4.5, T + 4); c.lineTo(x + 0.5, T + 8); c.lineTo(x - 3.5, T + 4); c.closePath(); c.fill();
      c.textAlign = "left"; c.fillText(t("console.chart.fork"), x + 7, T);
    }
    const line = (arr: (number | null)[], col: string, w: number, dash: number[] = []) => {
      c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.beginPath();
      let on = false;
      arr.forEach((v, i) => { if (v == null || !isFinite(v)) { on = false; return; } const x = X(h.t[i]), y = Y(v); on ? c.lineTo(x, y) : c.moveTo(x, y); on = true; });
      c.stroke();
      c.setLineDash([]);
    };
    line(b, COL.base, 2);
    line(a, COL.alt, 2.5, [7, 4]);
  });

  return (
    <>
      <div className="chart-top">
        <div className="mtabs">
          {engine.sb.metrics.map((x, i) => (
            <button key={x.k} aria-pressed={x === m} onClick={() => setMetric(i)}>{say(`metric.${x.k}.label`)}</button>
          ))}
        </div>
        <div className="legend micro"><span className="ch"><i className="b" />{t("console.world.base")}</span><span className="ch a"><i />{t("console.world.alt")}</span></div>
      </div>
      <canvas ref={ref} className="chart" aria-label={t("console.chart.overTime", { metric: say(`metric.${m.k}.label`) })} />
      {m.help && <ChartNote engine={engine} m={m} />}
    </>
  );
}
