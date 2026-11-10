"use client";

import { useEffect, useReducer } from "react";
import { SimEngine } from "@/lib/sim/engine";
import { defaultParams } from "@/lib/sim/core";
import type { AnySandbox, ParamValue, SandboxKey } from "@/lib/sim/types";
import { track } from "../privacy/track";

/**
 * Client-side singletons. Living at module level means a running world keeps going
 * (state preserved) when you switch tabs and come back.
 */
const engines = new Map<SandboxKey, SimEngine>();
/** Param values queued by a scale-explorer link before the world's code has loaded. */
const presets = new Map<SandboxKey, [id: string, value: ParamValue]>();

export function getEngine(sb: AnySandbox): SimEngine {
  let e = engines.get(sb.key);
  if (!e) {
    e = instrument(new SimEngine(sb, defaultParams(sb)));
    engines.set(sb.key, e);
  }
  const pre = presets.get(sb.key);
  if (pre) {
    presets.delete(sb.key);
    if (e.params[pre[0]] !== pre[1]) {
      e.setParam(pre[0], pre[1]);
      e.restart();
    }
  }
  return e;
}

/**
 * Analytics (change 0027): the live engine reports what visitors do — a what-if, ticking a change, Reset — to `track`,
 * which sends nothing until the visitor accepts. Wraps this one instance only; replays and exports never report, and the
 * sim (lib/sim) knows nothing about it.
 */
function instrument(e: SimEngine): SimEngine {
  const world = e.sb.key;
  // toggle() goes through setOn(), so wrapping setOn covers both.
  const change = e.change.bind(e), reset = e.reset.bind(e), setOn = e.setOn.bind(e), setAll = e.setAll.bind(e);
  e.change = (id) => { change(id); track("fork", { world, whatif: id }); };
  e.reset = () => { reset(); track("reset", { world }); };
  e.setOn = (key, on) => { setOn(key, on); track("change_toggle", { world, on }); };
  e.setAll = (on) => { setAll(on); track("change_toggle", { world, on, all: true }); };
  return e;
}

/** Queue a param for a world (applied when its engine is next fetched). */
export function queuePreset(key: SandboxKey, id: string, value: ParamValue): void {
  presets.set(key, [id, value]);
}

const UI_REFRESH_MS = 300;

/** The world's engine plus a `rerender` the UI calls after changing it; readouts refresh every 300 ms. */
export function useWorldEngine(sb: AnySandbox): [SimEngine, () => void] {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const engine = getEngine(sb);
  useEffect(() => {
    const id = setInterval(rerender, UI_REFRESH_MS);
    return () => clearInterval(id);
  }, []);
  return [engine, rerender];
}
