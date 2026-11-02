import type { WorldMeta } from "@/lib/sim/types";

/** Name and subtitle, loaded by the nav on every page; the sim itself loads only on its own page. */
export const meta: WorldMeta = {
  key: "animals",
  name: "Animals",
  sub: "Evolution",
  /** Scale-explorer links like "animals:wolf" set this param. */
  presetParam: "species",
};
