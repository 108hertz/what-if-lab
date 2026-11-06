import type { ChangeEntry, SimEngine } from "@/lib/sim/engine";
import { CHANGES } from "./data";
import { endOf, type W } from "./model";

/**
 * Editing the changes already made (change 0019), through the shared engine's change list (change 0024). Every edit is
 * an edit of the recorded change, and the engine re-runs the changed world from just before it with the same steps, so
 * an undo is exactly the run without that click, and a stop or a move is exactly the run where it was made that way.
 * Mods are indexed as in `w.mods`: one per change that is on, in the order they were made.
 */

/** The engine's entry for mod number `idx` (the idx-th change that is on). */
export function entryOfMod(engine: SimEngine, idx: number): ChangeEntry | undefined {
  return engine.entries.filter((e) => e.on)[idx];
}

/** Take change number `idx` out, as if it never happened. Removing the last one drops the fork. */
export function undoChange(engine: SimEngine, idx: number): void {
  const e = entryOfMod(engine, idx);
  if (e) engine.remove(e.key);
}

/** Stop change number `idx` now (or at a later age). Its lasting part stays; the rest fades from then. */
export function stopChange(engine: SimEngine, idx: number, age?: number): void {
  const alt = engine.alt as W | null, e = entryOfMod(engine, idx), m = alt?.mods[idx];
  if (!alt || !e || !m || m.sn) return;
  const at = Math.max(age ?? alt.t, alt.t, m.age);
  if (at >= endOf(m)) return; // it ends by itself before then
  engine.edit(e.key, { s_stop: String(at) });
}

/** Move planned change number `idx` to another age (from the life ruler); never into the past. */
export function moveChange(engine: SimEngine, idx: number, age: number): void {
  const alt = engine.alt as W | null, e = entryOfMod(engine, idx), m = alt?.mods[idx];
  if (!alt || !e || !m || m.on) return;
  const at = Math.max(age, alt.t, CHANGES[m.id]?.min ?? 0);
  if (at === m.age) return;
  engine.edit(e.key, { s_age: String(at) });
}
