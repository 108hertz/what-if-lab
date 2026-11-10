/**
 * The visitor's analytics choice (change 0027): pure rules, unit-tested without a browser. Kept in localStorage (not a
 * cookie) under one key with a version, so a later policy change can ask again by raising CONSENT_VERSION.
 */

export type Choice = "granted" | "denied";

export const CONSENT_KEY = "consent";
export const CONSENT_VERSION = 1;
/** Fired on window to open the banner again ("Privacy settings" in the site menu). */
export const CONSENT_OPEN_EVENT = "consent:open";
/** Fired on window after a choice is made, with the choice as `detail`. */
export const CONSENT_EVENT = "consent:change";

export interface Store { get(k: string): string | null; set(k: string, v: string): void }

/** Wraps a Storage getter so a blocked or missing localStorage behaves as "no choice yet". */
export const safeStore = (get: () => Storage): Store => ({
  get: (k) => { try { return get().getItem(k); } catch { return null; } },
  set: (k, v) => { try { get().setItem(k, v); } catch { /* private mode: ask again next visit */ } },
});

/** The stored choice, or null when there is none for this policy version. */
export function readChoice(store: Store): Choice | null {
  const raw = store.get(CONSENT_KEY);
  if (!raw) return null;
  const [v, c] = raw.split(":");
  if (Number(v) !== CONSENT_VERSION) return null;
  return c === "granted" || c === "denied" ? c : null;
}

export const writeChoice = (store: Store, c: Choice) => store.set(CONSENT_KEY, `${CONSENT_VERSION}:${c}`);

/** Consent Mode v2 state for a choice: everything denied unless analytics was accepted. Ads stay denied (no ads yet). */
export function consentState(c: Choice | null) {
  return {
    analytics_storage: c === "granted" ? "granted" : "denied",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied",
  } as const;
}
