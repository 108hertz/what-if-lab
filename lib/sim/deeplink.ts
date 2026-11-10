import type { AnySandbox } from "./types";

/**
 * Open the lab with a what-if (change 0033, step 3): `/lab/<world>#whatif=<id>`. The lab runs a short baseline, then
 * makes the change exactly as a click on its button would (`engine.change(id)`). Framework-free; the console hook reads
 * the hash once on load (components/console/engines.ts).
 *
 * The hash is read as `key=value&…` so the full share links planned in seo-and-growth can add their own keys later.
 */
export const WHATIF_KEY = "whatif";

/** Real seconds the lab runs untouched before the linked what-if, so the chart shows the two worlds splitting. */
export const DEEPLINK_BASELINE_S = 1.5;

/** The link fragment for a what-if, e.g. "#whatif=nosun". */
export const whatifHash = (id: string): string => `#${WHATIF_KEY}=${encodeURIComponent(id)}`;

/** The what-if a hash asks for, if it is one of this world's what-if buttons; otherwise null. */
export function whatifFromHash(hash: string, sb: Pick<AnySandbox, "whatifs">): string | null {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const id = q.get(WHATIF_KEY);
  return id && sb.whatifs.some(([w]) => w === id) ? id : null;
}
