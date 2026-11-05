import type { SimEngine } from "@/lib/sim/engine";
import { moveMod, readAt, removeMod, stopMod, type W } from "./sim";

/**
 * Editing the changes already made (change 0019), on the shared engine's public state only. The changed world's random
 * draws never depend on changes, so taking one out leaves every kid's own luck as it was: the world is the same as if the
 * change had never been clicked, and its past lines on the chart are worked out again from the yearly snapshots.
 */

/** Take change number `idx` (in `w.mods` order) out, as if it never happened. Removing the last one drops the fork. */
export function undoChange(engine: SimEngine, idx: number): void {
  const alt = engine.alt as W | null;
  if (!alt || !alt.mods[idx]) return;
  const id = alt.mods[idx].id, nth = alt.mods.slice(0, idx).filter((m) => m.id === id).length;
  removeMod(alt, engine.base as W, idx);
  engine.origin = null; // the export recipe no longer matches: exports start from now
  // engine.applied lists clicks in order; drop the matching click (the nth of this id)
  let seen = 0;
  const at = engine.applied.findIndex((x) => x === id && seen++ === nth);
  if (at >= 0) engine.applied.splice(at, 1);
  if (!alt.mods.length) { engine.dropFork(); return; }
  const h = engine.history;
  h.t.forEach((t, i) => {
    if (h.alt[engine.sb.metrics[0].k][i] == null) return;
    const r = readAt(alt, t);
    for (const m of engine.sb.metrics) h.alt[m.k][i] = r[m.k] ?? null;
  });
}

/** Stop change number `idx` now (or at a later age). Its lasting part stays; the rest fades from then. */
export function stopChange(engine: SimEngine, idx: number, age?: number): void {
  const alt = engine.alt as W | null;
  if (!alt) return;
  stopMod(alt, idx, age);
  engine.origin = null; // a stop is not a click: exports start from now so they show it
}

/** Move planned change number `idx` to another age (from the life ruler). */
export function moveChange(engine: SimEngine, idx: number, age: number): void {
  const alt = engine.alt as W | null;
  if (!alt) return;
  moveMod(alt, idx, age);
  engine.origin = null; // the export recipe no longer matches: exports start from now
}
