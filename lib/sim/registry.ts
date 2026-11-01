import type { AnySandbox, Params, SandboxKey } from "./types";
import { galaxy } from "./sandboxes/galaxy";
import { solar } from "./sandboxes/solar";
import { earth } from "./sandboxes/earth";
import { country } from "./sandboxes/country";
import { animals } from "./sandboxes/animals";
import { child } from "./sandboxes/child";
import { person } from "./sandboxes/person";

/** Order here = order of tabs. Add new sandboxes here (and to SandboxKey in types.ts). */
export const SANDBOXES: Record<SandboxKey, AnySandbox> = { galaxy, solar, earth, country, animals, child, person };
export const SANDBOX_KEYS = Object.keys(SANDBOXES) as SandboxKey[];

export type Mode = "scale" | SandboxKey;
export const MODES: Mode[] = ["scale", ...SANDBOX_KEYS];

export const isSandboxKey = (k: string): k is SandboxKey => k in SANDBOXES;

export function defaultParams(sb: AnySandbox): Params {
  const p: Params = {};
  for (const c of sb.controls) if (c.type !== "heading") p[c.id] = c.val;
  return p;
}

export const modeHref = (m: Mode) => (m === "scale" ? "/" : `/lab/${m}`);
