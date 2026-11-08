"use client";

import { createContext, lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from "react";
import {
  readConfig, resolveAccount, premiumHint, rememberPremium, readDevPremium, writeDevPremium, pendingUpgrade, setPendingUpgrade,
  REMOTE_LOADING, type Account, type AccountConfig, type RemoteState,
} from "./state";
import { pageT } from "@/lib/i18n/page";

/**
 * The account adapter boundary (change 0020, ADR 0008). Components use `useAccount()` and `usePremium()` only;
 * the provider SDK is loaded lazily, and only when a publishable key is configured. Without a key the lab runs
 * exactly as before: everything free, ads as now.
 */

// Literal env reads so Next inlines them at build time (static export: there is no runtime env).
export const CONFIG: AccountConfig = readConfig({
  key: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  plan: process.env.NEXT_PUBLIC_PREMIUM_PLAN,
  planId: process.env.NEXT_PUBLIC_CLERK_PREMIUM_PLAN_ID,
  nodeEnv: process.env.NODE_ENV,
});

/**
 * Whether Premium entry points (account menu, export button, ad-slot upsell) are shown at all. A production
 * build without a key shows none of them, so the lab looks exactly as it did before accounts; dev builds show
 * them so the Premium simulation can be used.
 */
export const PREMIUM_ON_SALE = !!CONFIG.publishableKey || CONFIG.dev;

/** What a provider adapter can do. Every call opens the provider's own hosted window (modal or drawer). */
export interface ProviderActions {
  signIn(): void;
  signUp(): void;
  checkout(): Promise<void>;
  manage(): void;
  profile(): void;
  signOut(): Promise<void> | void;
}

export interface BridgeProps {
  config: AccountConfig;
  report(remote: RemoteState, actions: ProviderActions | null): void;
}

const noop = () => {};
/** The account as seen by tests and by a build without a provider. */
export const FREE_ACCOUNT: Account = {
  status: "off", provider: null, user: null, isPremium: false, offline: false, error: null, busy: false, devPremium: null,
  signIn: noop, signUp: noop, upgrade: noop, manage: noop, profile: noop, signOut: noop, retry: noop,
};

export const AccountContext = createContext<Account>(FREE_ACCOUNT);
export const useAccount = () => useContext(AccountContext);

export type PremiumReason = "export" | "ads" | "menu";
export const PremiumContext = createContext<{ open(reason?: PremiumReason): void }>({ open: noop });
export const usePremium = () => useContext(PremiumContext);

const LOAD_TIMEOUT_MS = 15000;

function useOnline() {
  const [on, setOn] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine !== false);
  useEffect(() => {
    const up = () => setOn(true), down = () => setOn(false);
    window.addEventListener("online", up); window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);
  return on;
}

export function AccountProvider({ children, dialog }: { children: ReactNode; dialog?: (reason: PremiumReason | null, close: () => void) => ReactNode }) {
  const cfg = CONFIG;
  const configured = !!cfg.publishableKey;
  const online = useOnline();
  const [dev, setDev] = useState(() => cfg.dev && readDevPremium());
  const [remote, setRemote] = useState<RemoteState>(REMOTE_LOADING);
  const [timedOut, setTimedOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [reason, setReason] = useState<PremiumReason | null>(null);
  const actions = useRef<ProviderActions | null>(null);
  const [hint] = useState(() => premiumHint());

  useEffect(() => { if (cfg.rejected) console.warn(`What-If Lab accounts are off: ${cfg.rejected}.`); }, [cfg.rejected]);

  // The provider module, re-created on retry so a failed chunk load can be tried again.
  const Bridge = useMemo(() => configured
    ? lazy<ComponentType<BridgeProps>>(() => import("./clerk").catch(() => ({ default: FailedBridge })))
    : null,
  [configured, attempt]);

  const report = useCallback((r: RemoteState, a: ProviderActions | null) => { actions.current = a; setRemote(r); }, []);

  useEffect(() => {
    if (!configured || remote.loaded || remote.failed) { setTimedOut(false); return; }
    const id = window.setTimeout(() => setTimedOut(true), LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(id);
  }, [configured, remote.loaded, remote.failed, attempt]);

  const effective: RemoteState = timedOut && !remote.loaded ? { ...remote, failed: true } : remote;
  const { status, isPremium } = resolveAccount({ configured, remote: effective, devPremium: cfg.dev && dev, hint });

  // Keep the offline grace hint in step with definite answers from the provider.
  useEffect(() => {
    if (status === "premium") rememberPremium(true);
    else if (status === "free" || status === "signed-out") rememberPremium(false);
  }, [status]);

  const checkout = useCallback(async () => {
    const a = actions.current;
    if (!a) return;
    setError(null); setBusy(true);
    try { await a.checkout(); }
    catch (e) { setError(e instanceof Error ? e.message : pageT()("account.errors.checkoutFailed")); }
    finally { setBusy(false); }
  }, []);

  // Sign-up first, then straight on to checkout, even across a redirect.
  useEffect(() => {
    if (status === "premium" || status === "off") { setPendingUpgrade(false); return; }
    if (status === "free" && pendingUpgrade()) { setPendingUpgrade(false); void checkout(); }
  }, [status, checkout]);

  // Just bought: show the thank-you state of the Premium dialog once checkout closes.
  const prev = useRef(status);
  useEffect(() => {
    if (prev.current === "free" && status === "premium") setReason("menu");
    prev.current = status;
  }, [status]);

  const account: Account = useMemo(() => ({
    status,
    provider: configured ? "Clerk" : null,
    user: effective.user,
    isPremium,
    offline: !online,
    error: error ?? (status === "error" ? pageT()(!online ? "account.errors.offline" : "account.errors.noAnswer") : null),
    busy,
    devPremium: cfg.dev ? { on: dev, set: (on: boolean) => { writeDevPremium(on); setDev(on); } } : null,
    signIn: () => { leaveFullscreen(); actions.current?.signIn(); },
    signUp: () => { leaveFullscreen(); actions.current?.signUp(); },
    upgrade: () => {
      leaveFullscreen();
      if (status === "signed-out") { setPendingUpgrade(true); actions.current?.signUp(); }
      else if (status === "free") void checkout();
    },
    manage: () => { leaveFullscreen(); actions.current?.manage(); },
    profile: () => { leaveFullscreen(); actions.current?.profile(); },
    signOut: () => { setPendingUpgrade(false); void actions.current?.signOut(); },
    retry: () => { setError(null); setRemote(REMOTE_LOADING); setAttempt((n) => n + 1); },
  }), [status, configured, effective.user, isPremium, online, error, busy, cfg.dev, dev, checkout]);

  const premium = useMemo(() => ({ open: (r: PremiumReason = "menu") => setReason(r) }), []);
  const close = useCallback(() => setReason(null), []);

  return (
    <AccountContext.Provider value={account}>
      <PremiumContext.Provider value={premium}>
        {children}
        {dialog?.(reason, close)}
        {Bridge && (
          <Suspense fallback={null}>
            <Bridge key={attempt} config={cfg} report={report} />
          </Suspense>
        )}
      </PremiumContext.Provider>
    </AccountContext.Provider>
  );
}

/** Provider windows render in the page, so a full-screen stage would hide them. */
function leaveFullscreen() {
  if (typeof document !== "undefined" && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
}

/** Stand-in when the provider module itself cannot be fetched (offline on first visit, blocked script). */
function FailedBridge({ report }: BridgeProps) {
  useEffect(() => report({ ...REMOTE_LOADING, failed: true }, null), [report]);
  return null;
}
