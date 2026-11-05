"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { mix } from "@/lib/sim/core";
import { Icon } from "@/components/ui/Icon";
import { BEHAVIOURS, COLOR, COMBOS, SHORT, SHOW, TRACK, WORD, behaviourWord, kidName, stepWord, type Show } from "./data";
import { behaviourCounts, compare, contributions, endOf, happened, mean, of100, planned, quant, values, type W } from "./sim";
import { drawGlyph, heroKid, reducedMotion } from "./scene";
import s from "./child.module.css";

/**
 * The child chart (change 0019), owned by this world. Four plain views, each trait (or everyday thing) on its own labelled
 * row so colour is never the only cue:
 *  - "Now": where the typical kid (or the kid you picked) is on each trait, among all 120, with and without your changes.
 *  - "Growing up": one small chart per trait over the ages, life stages in the background, a pin where each change
 *    happened; point at any age for a sentence.
 *  - "Every day": what the traits look like day to day, out of 100 kids, now and without the changes.
 *  - "What mattered": how much each change (and what followed from it) moved the picked trait now, and whether it lasted.
 * One sentence under every view. Canvas drawing; values ease (≤ 400 ms) unless reduced motion.
 */
const token = (k: string) => getComputedStyle(document.documentElement).getPropertyValue(k).trim();
const isLight = () => document.documentElement.dataset.theme === "light";
/** Data colours are drawn for the dark stage; on paper they are darkened so they keep their contrast. */
const ink = (c: string) => (isLight() ? mix(c, "#2A1E12", 0.42) : c);
const deg = (d: number) => (Math.abs(d) < 4 ? "a bit " : Math.abs(d) < 8 ? "" : "much ");
const SAME = 1.5;
const LIFE: [number, number, string][] = [[1, 5, "little"], [5, 13, "school"], [13, 18, "teen"], [18, 30, "young adult"], [30, 61, "grown-up"]];

function setup(cv: HTMLCanvasElement) {
  const dpr = window.devicePixelRatio || 1, Wd = cv.clientWidth, Hd = cv.clientHeight;
  if (!Wd || !Hd) return null;
  if (cv.width !== Math.round(Wd * dpr) || cv.height !== Math.round(Hd * dpr)) { cv.width = Math.round(Wd * dpr); cv.height = Math.round(Hd * dpr); }
  const c = cv.getContext("2d")!;
  c.setTransform(dpr, 0, 0, dpr, 0, 0);
  c.clearRect(0, 0, Wd, Hd);
  const COL = { text: token("--label"), text2: token("--label-2"), grid: token("--separator"), alt: token("--alt"), base: token("--base") };
  return { c, W: Wd, H: Hd, font: getComputedStyle(document.body).fontFamily, COL };
}

/** Values that glide toward their targets (one memory per view). */
class Eased {
  x: number[] = [];
  t = performance.now();
  step(target: number[]): boolean {
    const now = performance.now(), dt = Math.min(0.05, (now - this.t) / 1000);
    this.t = now;
    if (this.x.length !== target.length || reducedMotion()) { this.x = [...target]; return false; }
    let busy = false;
    this.x = this.x.map((v, i) => { const d = target[i] - v; if (Math.abs(d) < 0.05) return target[i]; busy = true; return v + d * (1 - Math.exp(-dt * 12)); });
    return busy;
  }
}
const easeNow = new Eased(), easeDay = new Eased(), easeWhy = new Eased();

/* ───────────── Now ───────────── */

function drawNow(cv: HTMLCanvasElement, v: number[][], bv: number[][] | null, pick: number): boolean {
  const g = setup(cv);
  if (!g) return false;
  const { c, W, H, font, COL } = g;
  const me = v.map((xs) => (pick >= 0 ? xs[pick] : mean(xs))), was = bv ? bv.map((xs) => (pick >= 0 ? xs[pick] : mean(xs))) : me;
  const busy = easeNow.step([...me, ...was]);
  const Lw = W < 280 ? 0 : W < 420 ? 84 : 92, Rw = W < 340 ? 0 : W < 420 ? 70 : 86, x0 = Lw + 6, x1 = W - Rw - 8, rh = H / 5;
  const X = (val: number) => x0 + ((x1 - x0) * Math.max(0, Math.min(100, val))) / 100;
  SHOW.forEach((t, i) => {
    const y0 = i * rh, ty = y0 + (Lw ? rh * 0.45 : rh * 0.62);
    c.textBaseline = "middle"; c.textAlign = "left"; c.font = "500 12px " + font;
    if (Lw) { drawGlyph(c, t, 9, ty, 14, ink(COLOR[t])); c.fillStyle = COL.text; c.fillText(WORD[t], 22, ty, Lw - 22); }
    else { c.fillStyle = COL.text2; c.font = "500 10px " + font; c.fillText(WORD[t], 0, y0 + 7); }
    // The 120 kids as faint marks, the middle half as a soft band
    const lo = quant(v[i], 0.25), hi = quant(v[i], 0.75);
    c.fillStyle = COL.text; c.globalAlpha = 0.07; c.beginPath(); c.roundRect(X(lo), ty - 6, Math.max(4, X(hi) - X(lo)), 12, 6); c.fill();
    c.globalAlpha = 0.28;
    for (let j = 0; j < v[i].length; j++) { c.beginPath(); c.arc(X(v[i][j]), ty + ((j * 37) % 9) - 4, 1.4, 0, Math.PI * 2); c.fill(); }
    c.globalAlpha = 1;
    if (rh >= 30 && Lw) {
      c.font = "500 10px " + font; c.fillStyle = COL.text2; c.textBaseline = "alphabetic";
      c.textAlign = "left"; c.fillText(TRACK[t][0], x0, y0 + rh - 2, (x1 - x0) / 2 - 4);
      c.textAlign = "right"; c.fillText(TRACK[t][1], x1, y0 + rh - 2, (x1 - x0) / 2 - 4);
      c.textBaseline = "middle";
    }
    const a = easeNow.x[i], b = easeNow.x[5 + i], d = bv ? a - b : 0;
    if (bv) {
      if (Math.abs(d) >= SAME) { c.strokeStyle = COL.alt; c.lineWidth = 2; c.globalAlpha = 0.6; c.beginPath(); c.moveTo(X(b), ty); c.lineTo(X(a), ty); c.stroke(); c.globalAlpha = 1; }
      c.strokeStyle = COL.base; c.lineWidth = 1.5; c.beginPath(); c.arc(X(b), ty, 4.5, 0, Math.PI * 2); c.stroke();
    }
    c.fillStyle = bv ? COL.alt : COL.text; c.beginPath(); c.arc(X(a), ty, 5, 0, Math.PI * 2); c.fill();
    if (Rw) {
      c.font = "500 12px " + font; c.textAlign = "right";
      c.fillStyle = Math.abs(d) >= SAME ? COL.alt : COL.text2;
      c.fillText(Math.abs(d) >= SAME ? `${deg(d)}${d > 0 ? "more" : "less"}` : stepWord(t, a), W, ty, Rw);
    }
  });
  return busy;
}

/* ───────────── Growing up ───────────── */

function drawGrowing(cv: HTMLCanvasElement, engine: SimEngine, trait: number, marks: number[], scrub: number | null): void {
  const g = setup(cv);
  if (!g) return;
  const { c, W, H, font, COL } = g;
  const h = engine.history, n = h.t.length;
  c.font = "500 12px " + font; c.textBaseline = "middle";
  if (n < 2) { c.fillStyle = COL.text2; c.fillText("Press play to watch them grow up…", 4, 14); return; }
  const rows = H < 150 ? [trait] : [0, 1, 2, 3, 4];
  const Lw = W < 420 ? 84 : 92, top = 14, x0 = Lw, x1 = W - 6, rh = (H - top - 14) / rows.length;
  const t0 = h.t[0], t1 = Math.max(h.t[n - 1], t0 + 1e-6), forked = h.forkT;
  const X = (t: number) => x0 + ((x1 - x0) * (t - t0)) / (t1 - t0);
  // Parts of life in the background, named along the top
  LIFE.forEach(([a, b, name], k) => {
    const xa = X(Math.max(a, t0)), xb = X(Math.min(b, t1));
    if (xb <= xa) return;
    if (k % 2) { c.fillStyle = COL.text; c.globalAlpha = 0.035; c.fillRect(xa, top, xb - xa, H - top - 14); c.globalAlpha = 1; }
    if (xb - xa > 34) { c.font = "500 10px " + font; c.fillStyle = COL.text2; c.textAlign = "left"; c.fillText(name, xa + 3, 6, xb - xa - 4); }
  });
  const pick = (k: string, j: number) => (forked != null && h.t[j] >= forked ? h.alt[k]?.[j] : h.base[k]?.[j]) ?? null;
  rows.forEach((i, r) => {
    const t = SHOW[i], y0 = top + r * rh, y1 = y0 + rh - 3;
    const keys = [t, `${t}_lo`, `${t}_hi`];
    const vals: number[] = [];
    for (let j = 0; j < n; j++) for (const k of keys) { const a = pick(k, j), b = h.base[k]?.[j]; if (a != null) vals.push(a); if (b != null) vals.push(b); }
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const mid = (lo + hi) / 2, half = Math.max(8, (hi - lo) / 2 + 2); lo = mid - half; hi = mid + half;
    const Y = (v: number) => y1 - ((y1 - y0 - 2) * (v - lo)) / (hi - lo);
    // Label
    c.textAlign = "left"; c.font = `500 ${i === trait ? 12 : 12}px ${font}`;
    drawGlyph(c, t, 9, (y0 + y1) / 2, 14, ink(COLOR[t]));
    c.fillStyle = i === trait ? COL.text : COL.text2; c.fillText(WORD[t], 22, (y0 + y1) / 2, Lw - 26);
    c.strokeStyle = COL.grid; c.lineWidth = 1; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(x0, y1 + 0.5); c.lineTo(x1, y1 + 0.5); c.stroke(); c.setLineDash([]);
    // Where most kids are
    c.fillStyle = COL.text; c.globalAlpha = 0.08; c.beginPath();
    let first = -1, last = -1;
    for (let j = 0; j < n; j++) { const v = pick(`${t}_hi`, j); if (v == null) continue; if (first < 0) { c.moveTo(X(h.t[j]), Y(v)); first = j; } else c.lineTo(X(h.t[j]), Y(v)); last = j; }
    for (let j = last; j >= first && first >= 0; j--) { const v = pick(`${t}_lo`, j); if (v != null) c.lineTo(X(h.t[j]), Y(v)); }
    c.closePath(); if (first >= 0) c.fill(); c.globalAlpha = 1;
    const line = (get: (j: number) => number | null | undefined, col: string, w: number, dash: number[]) => {
      c.strokeStyle = col; c.lineWidth = w; c.setLineDash(dash); c.beginPath();
      let on = false;
      for (let j = 0; j < n; j++) { const v = get(j); if (v == null || !isFinite(v)) { on = false; continue; } if (on) c.lineTo(X(h.t[j]), Y(v)); else c.moveTo(X(h.t[j]), Y(v)); on = true; }
      c.stroke(); c.setLineDash([]);
    };
    if (forked != null) {
      line((j) => (h.t[j] >= forked ? h.base[t]?.[j] : null), COL.base, 1.5, [4, 4]);
      line((j) => (h.t[j] <= forked ? h.base[t]?.[j] : null), COL.text2, 2, []);
      line((j) => (h.t[j] >= forked ? h.alt[t]?.[j] : null), COL.alt, 2, []);
    } else line((j) => h.base[t]?.[j], COL.text, 2, []);
    if (scrub != null) {
      const j = Math.max(0, Math.min(n - 1, scrub)), v = pick(t, j);
      if (v != null) { c.fillStyle = forked != null && h.t[j] >= forked ? COL.alt : COL.text; c.beginPath(); c.arc(X(h.t[j]), Y(v), 3.5, 0, Math.PI * 2); c.fill(); }
    }
  });
  // Pins where changes happened, and the ages along the bottom
  c.fillStyle = COL.alt;
  for (const a of marks) if (a >= t0 && a <= t1) { const x = X(a); c.beginPath(); c.moveTo(x - 4, H - 2); c.lineTo(x + 4, H - 2); c.lineTo(x, H - 9); c.fill(); }
  c.font = "500 10px " + font; c.fillStyle = COL.text2; c.textBaseline = "alphabetic";
  c.textAlign = "left"; c.fillText(engine.sb.fmtT(t0), x0, H - 1);
  c.textAlign = "right"; c.fillText(engine.sb.fmtT(t1), x1, H - 1);
  if (scrub != null) {
    const x = X(h.t[Math.max(0, Math.min(n - 1, scrub))]);
    c.strokeStyle = COL.text2; c.lineWidth = 1; c.beginPath(); c.moveTo(x, top); c.lineTo(x, H - 12); c.stroke();
  }
}

/* ───────────── Every day ───────────── */

function drawEveryday(cv: HTMLCanvasElement, now: number[], was: number[] | null, age: number): boolean {
  const g = setup(cv);
  if (!g) return false;
  const { c, W, H, font, COL } = g;
  const busy = easeDay.step([...now, ...(was ?? now)]);
  const rows = BEHAVIOURS.length, rh = H / rows, labW = Math.min(W * 0.42, 220), cntW = W < 360 ? 44 : 92;
  const x0 = labW + 6, x1 = W - cntW - 6, cols = 50, cell = (x1 - x0) / cols, r = Math.max(1.4, Math.min(3.2, cell * 0.36, rh * 0.18));
  BEHAVIOURS.forEach((b, i) => {
    const y0 = i * rh, yc = y0 + rh / 2, n = easeDay.x[i], nb = easeDay.x[rows + i];
    c.font = "500 12px " + font; c.textBaseline = "middle"; c.textAlign = "left"; c.fillStyle = COL.text;
    c.fillText(behaviourWord(b, age), 0, yc, labW);
    for (let k = 0; k < 100; k++) {
      // Two kids per column, filling left to right, so the count reads as a bar
      const x = x0 + Math.floor(k / 2) * cell + cell / 2, y = yc + (k % 2 ? 1 : -1) * (r + 1);
      const on = k < Math.round(n);
      c.fillStyle = on ? (was ? COL.alt : COL.text) : COL.text2; c.globalAlpha = on ? 1 : 0.22;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1;
    if (was && Math.abs(Math.round(n) - Math.round(nb)) >= 1) {
      // Where the count was without the changes: a tick in the no-change colour
      const k = Math.max(0, Math.min(99, Math.round(nb) - 1)), x = x0 + Math.floor(k / 2) * cell + cell;
      c.strokeStyle = COL.base; c.lineWidth = 2; c.beginPath(); c.moveTo(x, yc - r * 2 - 3); c.lineTo(x, yc + r * 2 + 3); c.stroke();
    }
    c.textAlign = "right"; c.font = "500 12px " + font; c.fillStyle = COL.text;
    const txt = W < 360 ? `${Math.round(n)}` : `${Math.round(n)} of 100`;
    c.fillText(txt, W, was && W >= 360 ? yc - 6 : yc, cntW);
    if (was && W >= 360) { c.font = "500 10px " + font; c.fillStyle = COL.base; c.fillText(`was ${Math.round(nb)}`, W, yc + 7, cntW); }
  });
  return busy;
}

/* ───────────── What mattered ───────────── */

interface WhyRow { label: string; d: number; faded: boolean; ongoing: boolean }

function drawWhy(cv: HTMLCanvasElement, rows: WhyRow[], spread: number, t: Show): boolean {
  const g = setup(cv);
  if (!g) return false;
  const { c, W, H, font, COL } = g;
  c.font = "500 12px " + font; c.textBaseline = "middle"; c.textAlign = "left";
  if (!rows.length) { c.fillStyle = COL.text2; c.fillText("Make a change to see how much it matters here.", 0, 14, W); return false; }
  const busy = easeWhy.step(rows.map((r) => r.d));
  const top = 16, show = rows.slice(0, Math.max(1, Math.floor((H - top) / 22))), rh = Math.min(26, (H - top) / show.length);
  const labW = Math.min(W * 0.36, 190), wordW = W < 340 ? 0 : W < 420 ? 96 : 118, x0 = labW + 8, x1 = W - wordW - 8, mid = (x0 + x1) / 2;
  const span = Math.max(spread, ...show.map((r) => Math.abs(r.d)), 2) * 1.1, X = (d: number) => mid + ((x1 - x0) / 2) * (d / span);
  // How much kids differ anyway, for scale
  c.fillStyle = COL.text; c.globalAlpha = 0.06; c.fillRect(X(-spread), top - 2, X(spread) - X(-spread), show.length * rh); c.globalAlpha = 1;
  c.font = "500 10px " + font; c.fillStyle = COL.text2; c.textAlign = "center";
  c.fillText(`← less ${WORD[t].toLowerCase()}  ·  how much kids differ anyway  ·  more →`, mid, 6, x1 - x0);
  c.strokeStyle = COL.grid; c.beginPath(); c.moveTo(mid + 0.5, top - 2); c.lineTo(mid + 0.5, top + show.length * rh); c.stroke();
  show.forEach((r, i) => {
    const yc = top + i * rh + rh / 2, d = easeWhy.x[i] ?? r.d, xa = X(Math.min(0, d)), xb = X(Math.max(0, d));
    c.font = "500 12px " + font; c.textAlign = "left"; c.fillStyle = COL.text; c.fillText(r.label, 0, yc, labW);
    c.fillStyle = COL.alt; c.globalAlpha = r.faded ? 0.45 : 1;
    c.beginPath(); c.roundRect(xa, yc - 5, Math.max(2, xb - xa), 10, 4); c.fill(); c.globalAlpha = 1;
    if (wordW) {
      c.textAlign = "right"; c.font = "500 12px " + font; c.fillStyle = Math.abs(r.d) >= 0.5 ? COL.text : COL.text2;
      const word = Math.abs(r.d) < 0.5 ? "hardly any" : `${deg(r.d * 1.6)}${r.d > 0 ? "more" : "less"}`;
      c.fillText(`${word} · ${r.ongoing ? "going on" : r.faded ? "mostly faded" : "still there"}`, W, yc, wordW);
    }
  });
  return busy;
}

/* ───────────── the chart ───────────── */

const VIEWS = ["Now", "Growing up", "Every day", "What mattered"];

export default function ChildChart({ engine, view, setView, trait, setTrait }: { engine: SimEngine; view: number; setView: (v: number) => void; trait: number; setTrait: (i: number) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const raf = useRef(0);
  const [scrub, setScrub] = useState<number | null>(null);
  const w = (engine.alt ?? engine.base) as W, b = engine.base as W, t = SHOW[trait], age = Math.floor(w.t), forked = !!engine.alt;
  const v = values(w), bv = forked ? values(b) : null, pick = heroKid();
  const days = behaviourCounts(v), daysB = bv ? behaviourCounts(bv) : null;
  const marks = happened(w).map((m) => m.age);

  // "What mattered": rows for the picked trait, with whether each change lasted (worked out once a year of age)
  const whyKey = `${trait}|${age}|${w.mods.map((m) => `${m.id}${m.age}${m.stop}`).join(",")}|${w.cmb.length}`;
  const why = useMemo(() => {
    const now = contributions(w);
    const peak = now.map(() => 0);
    for (let a = 2; a <= w.t; a += 2) contributions(w, a).forEach((r, k) => { peak[k] = Math.max(peak[k], Math.abs(r.d[trait])); });
    const rows: WhyRow[] = now.map((r, k) => {
      const m = r.kind === "change" ? w.mods[r.idx] : null;
      const label = m ? `${SHORT[m.id]} · ${Math.floor(m.age)}` : `${SHORT[COMBOS[r.idx].a]} + ${SHORT[COMBOS[r.idx].b].toLowerCase()}`;
      return { label, d: r.d[trait], faded: Math.abs(r.d[trait]) < 0.4 * peak[k], ongoing: !!m && m.on === 1 && endOf(m) > w.t && endOf(m) > m.age };
    }).filter((r) => Math.abs(r.d) >= 0.05).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
    const xs = v[trait], mu = mean(xs), sd = Math.sqrt(mean(xs.map((x) => (x - mu) ** 2)));
    return { rows, sd };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whyKey]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    cancelAnimationFrame(raf.current);
    const once = () => {
      if (view === 0) return drawNow(cv, v, bv, pick);
      if (view === 1) { drawGrowing(cv, engine, trait, marks, scrub); return false; }
      if (view === 2) return drawEveryday(cv, days, daysB, age);
      return drawWhy(cv, why.rows, why.sd, t);
    };
    const loop = () => { if (once()) raf.current = requestAnimationFrame(loop); };
    loop();
    return () => cancelAnimationFrame(raf.current);
  });

  const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (view !== 1) return;
    const h = engine.history, n = h.t.length, r = e.currentTarget.getBoundingClientRect();
    if (n < 2) return;
    const Lw = r.width < 420 ? 84 : 92, x0 = Lw, x1 = r.width - 6, k = (e.clientX - r.left - x0) / (x1 - x0);
    if (k < 0 || k > 1) { setScrub(null); return; }
    const tt = h.t[0] + k * (h.t[n - 1] - h.t[0]);
    let j = 0;
    while (j < n - 1 && h.t[j + 1] <= tt) j++;
    setScrub(j);
  };

  // One plain sentence under each view
  let sentence: ReactNode;
  const who = pick >= 0 ? kidName(pick) : "these kids";
  if (view === 0) {
    if (forked) {
      const c = compare(w, b), wait = planned(w).length > 0 && !happened(w).length;
      sentence = c.up.length
        ? <>With your changes, at {age} {pick >= 0 ? "most kids" : who} are {c.up.slice(0, 3).map(([, x], k, a) => <span key={k}>{k ? (k === a.length - 1 ? " and " : ", ") : ""}<b>{x}</b></span>)}.{c.same.length ? ` ${c.same.map((x) => WORD[x]).join(", ")} stayed about the same.` : ""}</>
        : <>{wait ? "Your change is planned for later." : `With your changes these kids are about the same so far (age ${age}).`}</>;
    } else sentence = <>Each faint mark is one of the 120 kids; the big dot is {pick >= 0 ? kidName(pick) : "the typical kid"}. Try a change to compare.</>;
  } else if (view === 1) {
    const h = engine.history, j = scrub;
    if (j != null && h.t[j] != null) {
      const a = Math.floor(h.t[j]), life = LIFE.find(([x, y]) => a >= x && a < y)?.[2] ?? "";
      const after = h.forkT != null && h.t[j] >= h.forkT;
      if (after) {
        const diffs = SHOW.map((x) => [x, (h.alt[x]?.[j] ?? 0) - (h.base[x]?.[j] ?? 0)] as [Show, number]).filter(([, d]) => Math.abs(d) >= SAME)
          .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 2);
        sentence = <>At <b>{a}</b> ({life} years): {diffs.length ? <>with your changes most kids are {diffs.map(([x, d], k) => <span key={x}>{k ? " and " : ""}<b>{deg(d)}{d > 0 ? "more" : "less"} {WORD[x].toLowerCase()}</b></span>)}</> : "about the same as without your changes"}.</>;
      } else {
        const top = SHOW.map((x) => [x, h.base[x]?.[j] ?? 50] as [Show, number]).sort((x, y) => Math.abs(y[1] - 50) - Math.abs(x[1] - 50))[0];
        sentence = <>At <b>{a}</b> ({life} years): the typical kid is <b>{stepWord(top[0], top[1])}</b>.</>;
      }
    } else sentence = <>Each row is one trait over the years; the band is where most kids are. Point at an age to read it.</>;
  } else if (view === 2) {
    if (daysB) {
      const k = days.map((n, i) => [i, n - daysB[i]] as [number, number]).sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))[0];
      const bh = BEHAVIOURS[k[0]];
      sentence = Math.abs(k[1]) >= 1
        ? <>With your changes, <b>{days[k[0]]} of 100</b> kids are likely to {behaviourWord(bh, age)} (was {daysB[k[0]]}).</>
        : <>So far your changes make little difference to everyday life.</>;
    } else sentence = <>Out of 100 kids like these, how many are likely to do each thing. A likely thing, not a sure one.</>;
  } else {
    const r = why.rows[0];
    sentence = r
      ? <><b>{r.label.split(" · ")[0]}</b> made the biggest difference to {WORD[t].toLowerCase()}{r.ongoing ? ", and it is still going on" : r.faded ? ", but most of it has faded" : ", and it lasted"}.</>
      : <>How much each change moved {WORD[t].toLowerCase()}, next to how much kids differ anyway.</>;
  }

  const label = [
    `Where ${pick >= 0 ? kidName(pick) : "the typical kid"} is on each trait among all 120 kids`,
    "Curious, organised, outgoing, kind and calm over the years",
    "Out of 100 kids, how many are likely to do each everyday thing",
    `How much each change moved ${WORD[t].toLowerCase()}`,
  ][view];

  return (
    <div className={s.chartBox}>
      <div className={s.chartTop}>
        <div className="mtabs" role="group" aria-label="Chart view">
          {VIEWS.map((x, i) => <button key={x} aria-pressed={view === i} onClick={() => { setView(i); setScrub(null); }}>{x}</button>)}
        </div>
        {(view === 1 || view === 3) && (
          <span className={`select ${s.mini}`}>
            <select aria-label="Which trait" value={trait} onChange={(e) => setTrait(Number(e.target.value))}>
              {SHOW.map((x, i) => <option key={x} value={i}>{WORD[x]}</option>)}
            </select>
            <Icon name="chevron" size={16} />
          </span>
        )}
      </div>
      <canvas ref={ref} className={s.canvas} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setScrub(null)} />
      <p className={s.sentence}>{sentence}</p>
    </div>
  );
}

/** For tests and parts: the names of the chart views. */
export const CHART_VIEWS = VIEWS;
