"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { fmtNum, mix } from "@/lib/sim/core";
import { pageT } from "@/lib/i18n/page";
import { listOf } from "@/lib/i18n/t";
import { SPECIES } from "./data";
import { counts, traits, type W } from "./sim";
import { drawAnimal } from "./scene";
import { Icon } from "@/components/ui/Icon";
import { worldSay } from "@/lib/sim/say";
import { ref as mref } from "@/lib/i18n/t";
import { animalWords } from "./messages";
import { Rich } from "@/components/ui/Rich";
import s from "./animals.module.css";

/**
 * The animals chart (change 0017), owned by this world: "How many of each" (one line per animal, its icon and name at
 * the line end, the no-change world as a faint dashed line of the same colour) and "How their bodies changed" (speed,
 * size, senses and coat of one animal as × day 0). A plain sentence under it says what differs right now.
 */
/** Trait lines; their names are `trait.<k>`. */
const TRAITS = [["sp", "#7FC8F8"], ["sz", "#E2B26B"], ["se", "#C49BE8"], ["co", "#E58FB0"]] as const;
const say = () => worldSay(animalWords);
const token = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const isLight = () => document.documentElement.dataset.theme === "light";
/** Data colours are drawn for the dark stage; on paper they are darkened so lines keep their contrast. */
const ink = (c: string) => (isLight() ? mix(c, "#2A1E12", 0.42) : c);

type Series = { col: string; solid: (number | null)[]; dash: (number | null)[]; label: string; id?: string };

function draw(cv: HTMLCanvasElement, engine: SimEngine, series: Series[], unit: string, ref1: boolean) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  cv.width = W * dpr; cv.height = H * dpr;
  const c = cv.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  const font = getComputedStyle(document.body).fontFamily, S = say();
  const COL = { grid: token("--separator"), text: token("--label-2"), label: token("--label") };
  const h = engine.history, n = h.t.length;
  const vals = series.flatMap((x) => [...x.solid, ...x.dash]).filter((v): v is number => v != null && isFinite(v));
  c.font = "500 12px " + font;
  if (!vals.length || n < 2) { c.fillStyle = COL.text; c.fillText(pageT()("console.chart.collecting"), 4, 16); return; }
  let lo = ref1 ? Math.min(1, ...vals) : 0, hi = Math.max(...vals, ref1 ? 1 : 4);
  if (ref1) { const pad = Math.max(0.04, (hi - lo) * 0.12); lo -= pad; hi += pad; } else hi *= 1.08;
  const fmtY = (v: number) => (ref1 ? fmtNum(v, 2) + "×" : fmtNum(v));
  const ticks = ref1 ? [lo + (hi - lo) * 0.1, 1, hi - (hi - lo) * 0.1] : [0, hi / 2, hi];
  c.font = "500 12px " + font;
  const Lw = Math.max(...ticks.map((v) => c.measureText(fmtY(v)).width)) + 8;
  const labW = Math.min(150, Math.max(...series.map((x) => c.measureText(x.label).width)) + 30), R = labW + 6, T = 14, B = 18;
  const pw = W - Lw - R, ph = H - T - B;
  if (pw < 40 || ph < 20) return;
  const t0 = h.t[0], t1 = h.t[n - 1];
  const X = (t: number) => Lw + (pw * (t - t0)) / Math.max(1e-9, t1 - t0), Y = (v: number) => T + ph * (1 - (v - lo) / (hi - lo));
  // Grid, axis words in plain units
  c.strokeStyle = COL.grid; c.lineWidth = 1; c.fillStyle = COL.text; c.textAlign = "right"; c.textBaseline = "middle";
  for (const v of ticks) { const y = Y(v); c.setLineDash(ref1 && v === 1 ? [] : [2, 3]); c.beginPath(); c.moveTo(Lw, y); c.lineTo(Lw + pw, y); c.stroke(); c.fillText(fmtY(v), Lw - 6, y); }
  c.setLineDash([]);
  c.textAlign = "left"; c.textBaseline = "alphabetic"; c.font = "500 10px " + font;
  c.fillText(unit.toUpperCase(), Lw, 9);
  c.font = "500 12px " + font; c.textBaseline = "top";
  c.fillText(engine.sb.fmtT(t0), Lw, H - B + 5);
  c.textAlign = "right"; c.fillText(engine.sb.fmtT(t1), Lw + pw, H - B + 5);
  if (h.forkT != null && h.forkT >= t0) {
    const x = X(h.forkT);
    c.strokeStyle = COL.text; c.globalAlpha = 0.6; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x, T); c.lineTo(x, T + ph); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
    c.textAlign = "left"; c.textBaseline = "alphabetic"; c.font = "500 10px " + font; c.fillStyle = COL.text; c.fillText(S("chart.changes"), x + 4, 9); c.font = "500 12px " + font;
  }
  const line = (arr: (number | null)[], col: string, w: number, dash: number[], alpha: number) => {
    c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.globalAlpha = alpha; c.beginPath();
    let on = false;
    arr.forEach((v, i) => { if (v == null || !isFinite(v)) { on = false; return; } const x = X(h.t[i]), y = Y(v); if (on) c.lineTo(x, y); else c.moveTo(x, y); on = true; });
    c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  };
  if (h.forkT != null) {
    // Legend in words: solid = with your changes, dashed = no change
    // centred on the bottom axis row, between the first and last day
    c.font = "500 10px " + font; c.textAlign = "left"; c.textBaseline = "middle"; c.fillStyle = COL.text;
    const a = S("chart.withChanges"), b = S("chart.noChange"), wa = c.measureText(a).width, wb = c.measureText(b).width, tot = 18 + wa + 14 + 18 + wb;
    const x0 = Lw + (pw - tot) / 2, yb = H - B + 11;
    if (pw > tot + 140) {
      c.strokeStyle = COL.text; c.lineWidth = 2; c.beginPath(); c.moveTo(x0, yb); c.lineTo(x0 + 14, yb); c.stroke();
      c.fillText(a, x0 + 18, yb);
      const x1 = x0 + 18 + wa + 14;
      c.lineWidth = 1.5; c.setLineDash([3, 3]); c.beginPath(); c.moveTo(x1, yb); c.lineTo(x1 + 14, yb); c.stroke(); c.setLineDash([]);
      c.fillText(b, x1 + 18, yb);
    }
    c.font = "500 12px " + font;
  }
  for (const x of series) line(x.dash, x.col, 1.5, [4, 4], 0.55);
  for (const x of series) line(x.solid, x.col, 2, [], 1);
  // Direct labels at the line ends, nudged apart so they never overlap
  const ends = series.map((x) => {
    let v: number | null = null;
    for (let i = x.solid.length - 1; i >= 0 && v == null; i--) v = x.solid[i];
    return { x, y: v == null ? T + ph : Y(v) };
  }).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 15);
  const over = ends.length ? ends[ends.length - 1].y - (T + ph) : 0;
  if (over > 0) for (const e of ends) e.y -= over;
  for (let k = 0; k < ends.length; k++) ends[k].y = Math.max(T + 6, ends[k].y);
  c.textAlign = "left"; c.textBaseline = "middle";
  for (const e of ends) {
    const lx = Lw + pw + 6;
    if (e.x.id) drawAnimal(c, SPECIES[e.x.id], lx + 8, e.y, 5.5, 1, 0);
    else { c.fillStyle = e.x.col; c.fillRect(lx + 2, e.y - 1, 12, 2.5); }
    c.fillStyle = e.x.col; c.fillText(e.x.label, lx + 20, e.y, labW - 22);
  }
}

export default function AnimalChart({ engine, view, setView, focus, setFocus }: { engine: SimEngine; view: number; setView: (v: number) => void; focus: number; setFocus: (i: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = (engine.alt ?? engine.base) as W, b = engine.base as W, h = engine.history;
  const fi = Math.min(focus, w.cast.length - 1);
  const forked = h.forkT;
  const split = (k: string) => {
    const B = h.base[k] ?? [], A = h.alt[k] ?? [];
    const solid = h.t.map((t, j) => (forked != null && t >= forked ? A[j] ?? null : B[j] ?? null));
    const dash = h.t.map((t, j) => (forked != null && t >= forked ? B[j] ?? null : null));
    return { solid, dash };
  };
  const nNow = counts(w), S = say();
  const many = (id: string) => mref(`sp.${id}.many`), one = (id: string) => mref(`sp.${id}.one`);
  const series: Series[] = view === 0
    ? w.cast.map((id, i) => ({ ...split(`n${i}`), col: ink(SPECIES[id].col), id, label: S("chart.label", { name: S(`sp.${id}.pl`), n: fmtNum(nNow[i]) }) }))
    : TRAITS.map(([k, col]) => {
      const x = split(`${k}${fi}`), last = [...x.solid].reverse().find((v) => v != null);
      return { ...x, col: ink(col), label: S("chart.label", { name: S(`trait.${k}`), n: last == null ? "—" : fmtNum(last, 2) + "×" }) };
    });

  useEffect(() => { if (ref.current) draw(ref.current, engine, series, S(view === 0 ? "chart.unitAnimals" : "chart.unitDay0"), view === 1); });

  // One sentence: what is different right now
  const day = Math.floor(w.t);
  let sentence: ReactNode;
  if (view === 0) {
    if (engine.alt) {
      const nb = counts(b);
      const d = w.cast.map((id, i) => [id, nNow[i] - (i < nb.length ? nb[i] : 0)] as [string, number]).filter(([, x]) => x !== 0).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 2);
      const items = d.map(([id, x]) => S(x > 0 ? "story.more" : "story.fewer", { n: Math.abs(x), one: one(id), many: many(id) }));
      sentence = d.length
        ? <Rich say={S} k="chart.diff" v={{ be: Math.abs(d[0][1]) === 1 && d[0][1] > 0 ? "is" : "are", day }} bold={{ list: listOf(pageT(), items) }} />
        : S("chart.same", { day });
    } else sentence = S("chart.intro");
  } else {
    const id = w.cast[fi], t = traits(w, fi), tb = engine.alt && fi < b.cast.length ? traits(b, fi) : null;
    const pct = (v: number) => Math.round(Math.abs(v - 1) * 100);
    if (!t) sentence = S("cap.none", { many: many(id) });
    else if (tb) {
      const r = t.sp / tb.sp, z = t.sz / tb.sz;
      const speed = pct(r) < 1 ? S("chart.asFast") : S(r > 1 ? "chart.fasterThan" : "chart.slowerThan", { n: pct(r) });
      const size = pct(z) < 1 ? S("chart.sameSize") : S(z > 1 ? "chart.bigger" : "chart.smaller", { n: pct(z) });
      sentence = <Rich say={S} k="chart.bodyVs" v={{ one: one(id) }} bold={{ speed, size }} />;
    } else sentence = S("chart.bodyDay0", { one: one(id), coat: mref(`sp.${id}.coat`) });
  }

  return (
    <div className={s.chartBox}>
      <div className={s.chartTop}>
        <div className={s.chartSub}>
          <div className="mtabs" role="group" aria-label={S("chart.view")}>
            <button aria-pressed={view === 0} onClick={() => setView(0)}>{S("chart.counts")}</button>
            <button aria-pressed={view === 1} onClick={() => setView(1)}>{S("chart.bodies")}</button>
          </div>
          {view === 1 && w.cast.length > 1 && (
            <span className={`select ${s.mini}`}>
              <select aria-label={S("chart.whichAnimal")} value={fi} onChange={(e) => setFocus(Number(e.target.value))}>
                {w.cast.map((id, i) => <option key={id} value={i}>{S(`sp.${id}.pl`)}</option>)}
              </select>
              <Icon name="chevron" size={16} />
            </span>
          )}
        </div>
      </div>
      <canvas ref={ref} className={s.canvas} role="img" aria-label={view === 0 ? S("chart.ariaCounts") : S("chart.ariaBodies", { many: many(w.cast[fi]) })} />
      <p className={s.sentence}>{sentence}</p>
    </div>
  );
}
