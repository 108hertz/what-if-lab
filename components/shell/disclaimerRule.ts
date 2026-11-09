/**
 * The "show once" rule for the simulation disclaimer (change 0028). Pure, so tests can run it without a browser.
 * Storage that throws or is missing counts as "not seen": the note shows again next visit, which is fine.
 */
export const DISCLAIMER_KEY = "disclaimerSeen";
/** Fired on window when the note closes, so the first-visit theme tip can wait its turn. */
export const DISCLAIMER_EVENT = "disclaimer:seen";

export interface Store { get(k: string): string | null; set(k: string, v: string): void }

export const safeStore = (s: () => Storage | undefined): Store => ({
  get: (k) => { try { return s()?.getItem(k) ?? null; } catch { return null; } },
  set: (k, v) => { try { s()?.setItem(k, v); } catch {} },
});

export const disclaimerSeen = (store: Store) => store.get(DISCLAIMER_KEY) === "1";
export const markDisclaimerSeen = (store: Store) => store.set(DISCLAIMER_KEY, "1");
