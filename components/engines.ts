import { SimEngine } from "@/lib/sim/engine";
import { SANDBOXES, defaultParams } from "@/lib/sim/registry";
import type { SandboxKey } from "@/lib/sim/types";
import { ScaleView } from "@/lib/scale/render";

/**
 * Client-side singletons. Living at module level means a running world keeps going
 * (state preserved) when you switch tabs and come back.
 */
const engines = new Map<SandboxKey, SimEngine>();

export function getEngine(key: SandboxKey): SimEngine {
  let e = engines.get(key);
  if (!e) {
    const sb = SANDBOXES[key];
    e = new SimEngine(sb, defaultParams(sb));
    engines.set(key, e);
  }
  return e;
}

let scale: ScaleView | null = null;
export function getScaleView(): ScaleView {
  return (scale ??= new ScaleView());
}

/** Open a sandbox from a scale-object reference like "animals:wolf". */
export function prepareSandbox(ref: string): SandboxKey {
  const [key, preset] = ref.split(":") as [SandboxKey, string | undefined];
  if (key === "animals" && preset) {
    const e = getEngine("animals");
    if (e.params.species !== preset) {
      e.setParam("species", preset);
      e.restart();
    }
  }
  return key;
}
