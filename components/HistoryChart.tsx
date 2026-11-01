"use client";

import { useEffect, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { FONT } from "@/lib/sim/draw";

const COL = { base: "#A9B1D6", alt: "#FFC857", grid: "#253056", text: "#8F98BC" };

export default function HistoryChart({ engine }: { engine: SimEngine }) {
  const [metric, setMetric] = useState(0);
  const ref = useRef<HTMLCanvasElement>(null);
  const m = engine.sb.metrics[Math.min(metric, engine.sb.metrics.length - 1)];

  // Redraws on every parent re-render (the Lab refreshes every 300 ms).
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const h = engine.history, b = h.base[m.k], a = h.alt[m.k], n = h.t.length;
    const vals = [...b, ...a].filter((v): v is number => v != null && isFinite(v));
    if (!vals.length || n < 2) { c.fillStyle = COL.text; c.font = "12px " + FONT.body; c.fillText("Collecting data…", 10, 20); return; }
    let lo = Math.min(...vals), hi = Math.max(...vals);
    if (hi - lo < 1e-9) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
    c.font = "11px " + FONT.mono;
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
      c.strokeStyle = "rgba(255,200,87,.5)"; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x, T); c.lineTo(x, T + ph); c.stroke(); c.setLineDash([]);
      c.textAlign = "left"; c.fillStyle = COL.alt; c.fillText("fork", x + 4, T);
    }
    const line = (arr: (number | null)[], col: string, w: number) => {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      let on = false;
      arr.forEach((v, i) => { if (v == null || !isFinite(v)) { on = false; return; } const x = X(h.t[i]), y = Y(v); on ? c.lineTo(x, y) : c.moveTo(x, y); on = true; });
      c.stroke();
    };
    line(b, COL.base, 2);
    line(a, COL.alt, 2.5);
  });

  return (
    <>
      <div className="chart-top">
        <div className="mtabs">
          {engine.sb.metrics.map((x, i) => (
            <button key={x.k} aria-pressed={x === m} onClick={() => setMetric(i)}>{x.label}</button>
          ))}
        </div>
        <div className="legend"><span><i className="b" />No change</span><span><i />What if</span></div>
      </div>
      <canvas ref={ref} className="chart" aria-label={`${m.label} over time`} />
    </>
  );
}
