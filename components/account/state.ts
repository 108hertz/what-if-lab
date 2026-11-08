import { pageT } from "@/lib/i18n/page";

/**
 * Account and Premium state, provider-neutral (change 0020, ADR 0008). Pure functions only, so the rules are
 * unit-tested without a browser. The provider adapter (clerk.tsx) feeds raw facts in; the UI reads `Account`.
 *
 * Swapping Clerk for another hosted provider means writing a new adapter that reports the same `RemoteState`;
 * nothing else in the app knows which provider is used.
 */

export type AccountStatus =
  /** No provider key in this build (dev, tests, CI, forks): everything free, no account UI beyond a note. */
  | "off"
  /** Provider script still loading. */
  | "loading"
  | "signed-out"
  /** Signed in, no Premium plan. */
  | "free"
  | "premium"
  /** Provider could not load (offline, blocked, misconfigured). */
  | "error";

export interface AccountUser {
  name: string;
  email: string | null;
}

export interface AccountActions {
  signIn(): void;
  signUp(): void;
  /** Start buying Premium: sign up first when signed out, then the provider's checkout. */
  upgrade(): void;
  /** Provider page to see, change or cancel the subscription. */
  manage(): void;
  /** Provider page for email, password and connected accounts. */
  profile(): void;
  signOut(): void;
  retry(): void;
}

export interface Account extends AccountActions {
  status: AccountStatus;
  /** Name of the provider in use, for "Payments by …" copy. Null when off. */
  provider: string | null;
  user: AccountUser | null;
  /** True for subscribers, for the dev-only simulation, and for a recent subscriber while the provider is unreachable. */
  isPremium: boolean;
  offline: boolean;
  /** Plain-language problem, when there is one. */
  error: string | null;
  /** A checkout or sign-in window is opening. */
  busy: boolean;
  /** Dev builds only: simulate Premium locally. Null in production. */
  devPremium: { on: boolean; set(on: boolean): void } | null;
}

export interface AccountConfig {
  /** Clerk publishable key (pk_test_… / pk_live_…), or null when not configured. Never a secret. */
  publishableKey: string | null;
  /** Plan slug checked with `has({ plan })`. */
  plan: string;
  /** Optional plan id (cplan_…) for checkout; looked up by slug when missing. */
  planId: string | null;
  /** Development build: allows the Premium simulation. */
  dev: boolean;
  /** Why a supplied key was rejected, for a console warning. */
  rejected: string | null;
}

export const DEFAULT_PLAN = "premium";

/** Reads the build-time public env. Rejects anything that looks like a secret so it can never be used client-side. */
export function readConfig(env: {
  key?: string; plan?: string; planId?: string; nodeEnv?: string;
}): AccountConfig {
  const raw = env.key?.trim() || "";
  let publishableKey: string | null = null, rejected: string | null = null;
  if (raw) {
    if (/^pk_(test|live)_[A-Za-z0-9+/=_-]+$/.test(raw)) publishableKey = raw;
    else rejected = raw.startsWith("sk_") ? "a secret key was supplied; only the publishable key (pk_…) may be used in the browser" : "the key does not look like a Clerk publishable key (pk_test_… or pk_live_…)";
  }
  return {
    publishableKey,
    plan: env.plan?.trim() || DEFAULT_PLAN,
    planId: env.planId?.trim() || null,
    dev: env.nodeEnv !== "production",
    rejected,
  };
}

/** Raw facts an adapter reports. */
export interface RemoteState {
  loaded: boolean;
  failed: boolean;
  signedIn: boolean;
  hasPlan: boolean;
  user: AccountUser | null;
}

export const REMOTE_LOADING: RemoteState = { loaded: false, failed: false, signedIn: false, hasPlan: false, user: null };

export interface ResolveInput {
  configured: boolean;
  remote: RemoteState;
  /** Dev simulation switch (always false in production). */
  devPremium: boolean;
  /** A recent subscriber on this device (see `premiumHint`), used while the provider is loading or unreachable. */
  hint: boolean;
}

/** The one place that decides status and entitlement. */
export function resolveAccount({ configured, remote, devPremium, hint }: ResolveInput): { status: AccountStatus; isPremium: boolean } {
  if (!configured) return { status: "off", isPremium: devPremium };
  if (remote.failed) return { status: "error", isPremium: devPremium || hint };
  if (!remote.loaded) return { status: "loading", isPremium: devPremium || hint };
  if (!remote.signedIn) return { status: "signed-out", isPremium: devPremium };
  if (remote.hasPlan) return { status: "premium", isPremium: true };
  return { status: "free", isPremium: devPremium };
}

/** Ad slots render only for visitors without Premium (ADR 0003 / 0007: never for Premium). */
export const adsAllowed = (a: Pick<Account, "isPremium">) => !a.isPremium;
/** Video and slide exports are a Premium tool. */
export const canExport = (a: Pick<Account, "isPremium">) => a.isPremium;

// ——— Local hints (browser storage; every access guarded) ———

const HINT_KEY = "wil.premium";
const DEV_KEY = "wil.devPremium";
const PENDING_KEY = "wil.upgrade";
/** How long a device keeps Premium while the provider is unreachable (ADR 0008). */
export const HINT_GRACE_MS = 14 * 24 * 3600 * 1000;

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;
const local = (): Store | null => { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } };
const session = (): Store | null => { try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; } };
const get = (s: Store | null, k: string) => { try { return s?.getItem(k) ?? null; } catch { return null; } };
const set = (s: Store | null, k: string, v: string | null) => { try { if (v == null) s?.removeItem(k); else s?.setItem(k, v); } catch { /* storage blocked */ } };

/** True when this device saw an active subscription within the grace window. */
export function premiumHint(now = Date.now(), store: Store | null = local()): boolean {
  const v = Number(get(store, HINT_KEY));
  return isFinite(v) && v > now;
}

/** Remember (or forget) Premium for the grace window; called whenever the provider gives a definite answer. */
export function rememberPremium(on: boolean, now = Date.now(), store: Store | null = local()): void {
  set(store, HINT_KEY, on ? String(now + HINT_GRACE_MS) : null);
}

export function readDevPremium(store: Store | null = local()): boolean {
  return get(store, DEV_KEY) === "1";
}
export function writeDevPremium(on: boolean, store: Store | null = local()): void {
  set(store, DEV_KEY, on ? "1" : null);
}

/** "Continue to checkout" survives a sign-up that leaves the page (e.g. a social sign-in redirect). */
export function pendingUpgrade(store: Store | null = session()): boolean {
  return get(store, PENDING_KEY) === "1";
}
export function setPendingUpgrade(on: boolean, store: Store | null = session()): void {
  set(store, PENDING_KEY, on ? "1" : null);
}

/** Display name: the person's name, else the part of the email before @, else "Your account". */
export function displayName(first: string | null | undefined, full: string | null | undefined, email: string | null | undefined): string {
  return (full || first || "").trim() || (email ? email.split("@")[0] : "") || pageT()("account.yourAccount");
}
