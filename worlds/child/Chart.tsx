"use client";

import { useEffect, useRef, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { mix } from "@/lib/sim/core";
import { Icon } from "@/components/ui/Icon";
import { COLOR, LOW_KEY, LOW_WORD, SHOW, STEPS, WORD, type Show } from "./data";
import { compare, counts, happened, of100, planned, type W } from "./sim";
import { drawGlyph, reducedMotion } from "./scene";
import { useTick } from "./parts";
import s from "./child.module.css";

/**
 * The child chart (change 0018), owned by this world. "Growing up": one line per trait from age 1, each labelled at its
 * end with its glyph and word, the no-change life as a faint dashed line of the same colour, a shaded band where most
 * kids are for the picked trait, and a tick where each change happened. "Out of 100 kids": 100 little faces for the
 * picked trait, now and without the changes, cross-fading between groups. One plain sentence under it.
 */
const token = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const isLight = () => document.documentElement.dataset.theme === "light";
/** Data colours are drawn for the dark stage; on paper they are darkened so lines keep their contrast. */
const ink = (c: string) => (isLight() ? mix(c, "#2A1E12", 0.42) : c);

type Series = { t: Show; solid: (number | null)[]; dash: (number | null)[] };

function setup(cv: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return null;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  const c = cv.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, W, H);
  return { c, W, H, font: getComputedStyle(document.body).fontFamily };
}

function drawLines(cv: HTMLCanvasElement, engine: SimEngine, series: Series[], band: { lo: (number | null)[]; hi: (number | null)[]; t: Show }, marks: number[]) {
  const g = setup(cv);
  if (!g) return;
  const { c, W, H, font } = g;
  const COL = { grid: token("--separator"), text: token("--label-2"), alt: token("--alt") };
  const h = engine.history, n = h.t.length;
  const vals = [...series.flatMap((x) => [...x.solid, ...x.dash]), ...band.lo, ...band.hi].filter((v): v is number => v != null && isFinite(v));
  c.font = "500 12px " + font;
  if (!vals.length || n < 2) { c.fillStyle = COL.text; c.fillText("Press play to watch them grow up…", 4, 16); return; }
  let lo = Math.min(...vals), hi = Math.max(...vals);
  const mid = (lo + hi) / 2, half = Math.max(10, (hi - lo) / 2 + 3);
  lo = mid - half; hi = mid + half;
  const Lw = 40, R = 104, T = 10, B = 18, pw = W - Lw - R, ph = H - T - B;
  if (pw < 40 || ph < 20) return;
  const t0 = h.t[0], t1 = Math.max(h.t[n - 1], t0 + 1e-6);
  const X = (t: number) => Lw + (pw * (t - t0)) / (t1 - t0), Y = (v: number) => T + ph * (1 - (v - lo) / (hi - lo));
  // Axis in words: less at the bottom, more at the top
  c.strokeStyle = COL.grid; c.lineWidth = 1; c.setLineDash([2, 3]);
  for (const y of [T, T + ph / 2, T + ph]) { c.beginPath(); c.moveTo(Lw, y); c.lineTo(Lw + pw, y); c.stroke(); }
  c.setLineDash([]);
  c.fillStyle = COL.text; c.font = "500 10px " + font; c.textAlign = "left"; c.textBaseline = "top"; c.fillText("MORE", 0, T);
  c.textBaseline = "bottom"; c.fillText("LESS", 0, T + ph);
  c.font = "500 12px " + font; c.textBaseline = "top";
  c.fillText(engine.sb.fmtT(t0), Lw, H - B + 5);
  c.textAlign = "right"; c.fillText(engine.sb.fmtT(t1), Lw + pw, H - B + 5);
  // Band: where the middle half of the kids are, for the picked trait
  const bc = ink(COLOR[band.t]);
  c.fillStyle = bc; c.globalAlpha = 0.13; c.beginPath();
  let started = false, first = -1, last = -1;
  for (let i = 0; i < n; i++) { const v = band.hi[i]; if (v == null) continue; if (!started) { c.moveTo(X(h.t[i]), Y(v)); started = true; first = i; } else c.lineTo(X(h.t[i]), Y(v)); last = i; }
  for (let i = last; i >= first && first >= 0; i--) { const v = band.lo[i]; if (v != null) c.lineTo(X(h.t[i]), Y(v)); }
  c.closePath(); if (started) c.fill(); c.globalAlpha = 1;
  if (first >= 0 && pw > 220) {
    const i = Math.min(last, first + Math.round((last - first) * 0.06)), y = Y(((band.hi[i] ?? 0) + (band.lo[i] ?? 0)) / 2);
    c.font = "500 10px " + font; c.fillStyle = COL.text; c.textAlign = "left"; c.textBaseline = "middle"; c.fillText("MOST KIDS", X(h.t[i]) + 4, y);
  }
  // Where each change happened
  if (h.forkT != null && h.forkT >= t0) {
    const x = X(h.forkT);
    c.strokeStyle = COL.text; c.globalAlpha = 0.5; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x, T); c.lineTo(x, T + ph); c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  }
  c.fillStyle = COL.alt;
  for (const a of marks) if (a >= t0 && a <= t1) { const x = X(a); c.beginPath(); c.moveTo(x - 4, T + ph + 1); c.lineTo(x + 4, T + ph + 1); c.lineTo(x, T + ph - 6); c.fill(); }
  const line = (arr: (number | null)[], col: string, w: number, dash: number[], alpha: number) => {
    c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.globalAlpha = alpha; c.beginPath();
    let on = false;
    arr.forEach((v, i) => { if (v == null || !isFinite(v)) { on = false; return; } const x = X(h.t[i]), y = Y(v); if (on) c.lineTo(x, y); else c.moveTo(x, y); on = true; });
    c.stroke(); c.setLineDash([]); c.globalAlpha = 1;
  };
  for (const x of series) line(x.dash, ink(COLOR[x.t]), 1.4, [4, 4], 0.6);
  for (const x of series) line(x.solid, ink(COLOR[x.t]), x.t === band.t ? 2.6 : 1.7, [], 1);
  // Labels at the line ends (glyph + word), nudged apart so they never overlap
  const ends = series.map((x) => {
    let v: number | null = null;
    for (let i = x.solid.length - 1; i >= 0 && v == null; i--) v = x.solid[i];
    return { x, y: v == null ? T + ph : Y(v) };
  }).sort((a, b) => a.y - b.y);
  for (let k = 1; k < ends.length; k++) ends[k].y = Math.max(ends[k].y, ends[k - 1].y + 15);
  const over = ends.length ? ends[ends.length - 1].y - (T + ph) : 0;
  if (over > 0) for (const e of ends) e.y -= over;
  for (const e of ends) e.y = Math.max(T + 6, e.y);
  c.textAlign = "left"; c.textBaseline = "middle"; c.font = "500 12px " + font;
  for (const e of ends) {
    const lx = Lw + pw + 6, col = ink(COLOR[e.x.t]);
    drawGlyph(c, e.x.t, lx + 7, e.y, 14, col);
    c.fillStyle = col; c.fillText(WORD[e.x.t], lx + 18, e.y, R - 22);
  }
}

/* ── Out of 100 kids: faces that cross-fade between groups ── */

type Cat = 0 | 1 | 2; // 0 = very (high), 1 = in between, 2 = the other end
interface Face { from: Cat; to: Cat; t0: number }
const faces: Face[][] = [[], []];

function catsOf(hi: number, lo: number): Cat[] {
  const out: Cat[] = [];
  for (let i = 0; i < 100; i++) out.push(i < hi ? 0 : i >= 100 - lo ? 2 : 1);
  return out;
}

function drawUnits(cv: HTMLCanvasElement, t: Show, groups: { label: string; hi: number; lo: number }[]): boolean {
  const g = setup(cv);
  if (!g) return false;
  const { c, W, H, font } = g;
  const now = performance.now(), reduced = reducedMotion();
  const col = ink(COLOR[t]), muted = token("--label-2"), text = token("--label-2");
  const labW = W < 420 ? 0 : 108, cols = W - labW > 560 ? 50 : 25, rows = 100 / cols;
  const gh = (H - 4) / groups.length, labH = labW ? 0 : 14;
  const cell = Math.min((W - labW - 4) / cols, (gh - labH - 4) / rows), r = Math.max(2, cell * 0.38);
  let busy = false;
  groups.forEach((gp, gi) => {
    const y0 = 2 + gi * gh;
    c.font = "500 10px " + font; c.fillStyle = text; c.textAlign = "left"; c.textBaseline = "middle";
    c.fillText(gp.label.toUpperCase(), 0, labW ? y0 + (rows * cell) / 2 : y0 + 6, labW ? labW - 8 : W);
    const cats = catsOf(gp.hi, gp.lo), F = (faces[gi] ??= []);
    for (let i = 0; i < 100; i++) {
      const f = (F[i] ??= { from: cats[i], to: cats[i], t0: 0 });
      if (f.to !== cats[i]) { f.from = f.to; f.to = cats[i]; f.t0 = now + (reduced ? -1e6 : (i % cols) * 4 + Math.floor(i / cols) * 10); }
      const k = reduced ? 1 : Math.min(1, Math.max(0, (now - f.t0) / 220));
      if (k < 1) busy = true;
      const x = labW + (i % cols) * cell + cell / 2, y = y0 + labH + Math.floor(i / cols) * cell + cell / 2;
      const paint = (cat: Cat, a: number) => {
        if (a <= 0.01) return;
        c.globalAlpha = a;
        if (cat === 0) { c.fillStyle = col; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
        else if (cat === 1) { c.fillStyle = muted; c.globalAlpha = a * 0.45; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
        else { c.strokeStyle = muted; c.lineWidth = 1.2; c.beginPath(); c.arc(x, y, r - 0.6, 0, Math.PI * 2); c.stroke(); }
        if (r >= 3.5 && cat !== 2) {
          c.globalAlpha = a; c.fillStyle = cat === 0 ? (isLight() ? "#FFF6EA" : "#100904") : muted;
          c.beginPath(); c.arc(x - r * 0.35, y - r * 0.12, r * 0.16, 0, Math.PI * 2); c.arc(x + r * 0.35, y - r * 0.12, r * 0.16, 0, Math.PI * 2); c.fill();
        }
      };
      paint(f.from, 1 - k); paint(f.to, k);
      c.globalAlpha = 1;
    }
  });
  return busy;
}

/* ── the chart ── */

export default function ChildChart({ engine, view, setView, trait, setTrait }: { engine: SimEngine; view: number; setView: (v: number) => void; trait: number; setTrait: (i: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const w = (engine.alt ?? engine.base) as W, b = engine.base as W, h = engine.history, t = SHOW[trait];
  const forked = h.forkT;
  const split = (k: string) => {
    const B = h.base[k] ?? [], A = h.alt[k] ?? [];
    const solid = h.t.map((x, j) => (forked != null && x >= forked ? A[j] ?? null : B[j] ?? null));
    const dash = h.t.map((x, j) => (forked != null && x >= forked ? B[j] ?? null : null));
    return { solid, dash };
  };
  const series: Series[] = SHOW.map((x) => ({ t: x, ...split(x) }));
  const band = { lo: split(`${t}_lo`).solid, hi: split(`${t}_hi`).solid, t };
  const marks = happened(w).map((m) => m.age);
  const cn = counts(w)[trait], cb = engine.alt ? counts(b)[trait] : null;
  const hi = of100(cn.hi), lo = of100(cn.lo), hiB = cb ? of100(cb.hi) : null, loB = cb ? of100(cb.lo) : null;
  const groups = cb ? [{ label: "With changes", hi, lo }, { label: "No changes", hi: hiB!, lo: loB! }] : [{ label: "Now", hi, lo }];

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cancelAnimationFrame(raf.current);
    if (view === 0) { drawLines(cv, engine, series, band, marks); return; }
    const loop = () => { if (drawUnits(cv, t, groups)) raf.current = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf.current);
  });
  // Reset the faces' memory when the trait changes so they don't fade from another trait's groups
  useEffect(() => { faces[0] = []; faces[1] = []; }, [t]);

  const hiT = useTick(hi);
  const age = Math.floor(w.t);
  let sentence: ReactNode;
  if (view === 0) {
    if (engine.alt) {
      const c = compare(w, b), wait = planned(w).length > 0 && !happened(w).length;
      sentence = c.up.length
        ? <>With your changes, at {age} these kids are {c.up.slice(0, 3).map(([, x], k, a) => <span key={k}>{k ? (k === a.length - 1 ? " and " : ", ") : ""}<b>{x}</b></span>)}.{c.same.length ? ` ${c.same.map((x) => WORD[x]).join(", ")} stayed about the same.` : ""}</>
        : <>{wait ? "Your change is planned for later." : `With your changes these kids are about the same so far (age ${age}).`}</>;
    } else sentence = <>How the 120 kids change as they grow up. The band shows where most kids are for {WORD[t].toLowerCase()}.</>;
  } else {
    const word = STEPS[t][4];
    sentence = cb
      ? <><b>{hiT} of 100</b> are {word} (was {hiB} without the changes); {lo} {LOW_WORD[t]}{loB !== lo ? ` (was ${loB})` : ""}.</>
      : <><b>{hiT} of 100</b> kids are {word}, {lo} {LOW_WORD[t]}, the rest are in between.</>;
  }

  return (
    <div className={s.chartBox}>
      <div className={s.chartTop}>
        <div className="mtabs" role="group" aria-label="Chart view">
          <button aria-pressed={view === 0} onClick={() => setView(0)}>Growing up</button>
          <button aria-pressed={view === 1} onClick={() => setView(1)}>Out of 100 kids</button>
        </div>
        <span className={`select ${s.mini}`}>
          <select aria-label="Which trait" value={trait} onChange={(e) => setTrait(Number(e.target.value))}>
            {SHOW.map((x, i) => <option key={x} value={i}>{WORD[x]}</option>)}
          </select>
          <Icon name="chevron" size={16} />
        </span>
      </div>
      {view === 1 && (
        <div className={s.unitKey} aria-hidden="true">
          <span><i className={s.kHi} style={{ background: `var(--trait-${t})` }} />{STEPS[t][4]}</span><span><i className={s.kMid} />in between</span><span><i className={s.kLo} />{LOW_KEY[t]}</span>
        </div>
      )}
      <canvas ref={ref} className={s.canvas} role="img"
        aria-label={view === 0 ? "Curious, organised, outgoing, kind and calm over the years, for the 120 kids" : `Out of 100 kids, how many are ${STEPS[t][4]}: ${hi}${hiB != null ? `, ${hiB} without the changes` : ""}`} />
      <p className={s.sentence}>{sentence}</p>
    </div>
  );
}
