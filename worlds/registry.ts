import type { SandboxKey, WorldMeta } from "@/lib/sim/types";
import { localePath } from "@/lib/i18n/routes";
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
export const WORLDS: Record<SandboxKey, WorldMeta> = { solar, galaxy, earth, country, animals, child, person };
export const SANDBOX_KEYS = Object.keys(WORLDS) as SandboxKey[];

export type Mode = "scale" | SandboxKey;
/** The world the home page (/) opens; it is also the first tab. Scale lives at /scale. */
export const HOME_MODE: SandboxKey = "solar";
/** Tab order: the home world first, then Scale, then the other worlds. */
export const MODES: Mode[] = [HOME_MODE, "scale", ...SANDBOX_KEYS.filter((k) => k !== HOME_MODE)];

export const isSandboxKey = (k: string): k is SandboxKey => k in WORLDS;

/** The page of a mode in a language (English keeps unprefixed paths, ADR 0010). */
export const modeHref = (m: Mode, locale = "en") =>
  localePath(locale, m === HOME_MODE ? "/" : m === "scale" ? "/scale" : `/lab/${m}`);
