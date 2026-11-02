import type { SandboxKey, WorldMeta } from "@/lib/sim/types";
import { meta as galaxy } from "./galaxy/meta";
import { meta as solar } from "./solar/meta";
import { meta as earth } from "./earth/meta";
import { meta as country } from "./country/meta";
import { meta as animals } from "./animals/meta";
import { meta as child } from "./child/meta";
import { meta as person } from "./person/meta";

/**
 * Every world's name and subtitle — light enough for the nav on every page.
 * Order here = order of tabs. Add new worlds here (and to SandboxKey in lib/sim/types.ts).
 */
export const WORLDS: Record<SandboxKey, WorldMeta> = { galaxy, solar, earth, country, animals, child, person };
export const SANDBOX_KEYS = Object.keys(WORLDS) as SandboxKey[];

export type Mode = "scale" | SandboxKey;
export const MODES: Mode[] = ["scale", ...SANDBOX_KEYS];

export const isSandboxKey = (k: string): k is SandboxKey => k in WORLDS;

export const modeHref = (m: Mode) => (m === "scale" ? "/" : `/lab/${m}`);
