/**
 * Analytics events (change 0027): `track(name, params)` sends to GA4 only after the visitor accepted it and the tag
 * loaded; before that it does nothing (no queue, nothing kept). Called from shell and console hooks, never from a sim.
 */

type Params = Record<string, string | number | boolean>;
type Gtag = (...args: unknown[]) => void;

let enabled = false;

/** Set by Consent once gtag.js is loaded with analytics granted, and cleared on Decline. */
export function setTracking(on: boolean) { enabled = on; }
export const trackingOn = () => enabled;

export function track(name: string, params: Params = {}): boolean {
  if (!enabled || typeof window === "undefined") return false;
  const gtag = (window as { gtag?: Gtag }).gtag;
  if (!gtag) return false;
  gtag("event", name, params);
  return true;
}
