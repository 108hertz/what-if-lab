"use client";

import { useEffect, useMemo, useState, type ComponentProps } from "react";
import { ClerkProvider, ClerkFailed, useAuth, useClerk, useUser } from "@clerk/react";
import type { BridgeProps, ProviderActions } from "./context";
import { displayName, type RemoteState } from "./state";
import { pageT } from "@/lib/i18n/page";

/**
 * Clerk adapter (ADR 0008). The only file that imports the provider SDK; loaded lazily and only when a
 * publishable key is configured. Clerk's own hosted windows (sign-in, sign-up, checkout drawer, subscription
 * details, profile) open over the lab, so a visitor never leaves the page and no route or server is needed.
 *
 * Entitlement is `has({ plan })` on the session, checked in the browser. That can be bypassed by someone
 * editing the page; accepted in ADR 0001 / 0008 (Premium is convenience, not secret data).
 */

/** Clerk's windows take the page's Darkroom tokens, read once when the adapter mounts. */
function appearance() {
  const css = getComputedStyle(document.documentElement);
  const v = (k: string) => css.getPropertyValue(k).trim();
  return {
    variables: {
      colorPrimary: v("--signal"),
      colorPrimaryForeground: v("--on-signal"),
      colorBackground: v("--surface"),
      colorForeground: v("--label"),
      colorMutedForeground: v("--label-2"),
      colorNeutral: v("--label"),
      colorBorder: v("--separator"),
      colorInput: v("--bg"),
      colorInputForeground: v("--label"),
      colorRing: v("--signal"),
      colorDanger: v("--bad"),
      colorShadow: "transparent",
      fontFamily: getComputedStyle(document.body).fontFamily,
      borderRadius: "6px",
    },
  };
}

/**
 * Clerk's own words (sign-in, sign-up, checkout, profile) in the page's language (change 0025). Each language is its
 * own chunk, loaded only on that language's pages; English needs none.
 */
type LocalizationResource = NonNullable<ComponentProps<typeof ClerkProvider>["localization"]>;
const CLERK_WORDS: Record<string, () => Promise<{ [k: string]: LocalizationResource }>> = {
  es: () => import("@clerk/localizations/es-ES"), pt: () => import("@clerk/localizations/pt-BR"), fr: () => import("@clerk/localizations/fr-FR"),
  de: () => import("@clerk/localizations/de-DE"), it: () => import("@clerk/localizations/it-IT"), nl: () => import("@clerk/localizations/nl-NL"),
  pl: () => import("@clerk/localizations/pl-PL"), tr: () => import("@clerk/localizations/tr-TR"), id: () => import("@clerk/localizations/id-ID"),
  vi: () => import("@clerk/localizations/vi-VN"), ru: () => import("@clerk/localizations/ru-RU"), uk: () => import("@clerk/localizations/uk-UA"),
  zh: () => import("@clerk/localizations/zh-CN"), ja: () => import("@clerk/localizations/ja-JP"), ko: () => import("@clerk/localizations/ko-KR"),
  ar: () => import("@clerk/localizations/ar-SA"), hi: () => import("@clerk/localizations/hi-IN"), th: () => import("@clerk/localizations/th-TH"),
  bn: () => import("@clerk/localizations/bn-IN"),
};

function useClerkWords(locale: string): LocalizationResource | undefined | null {
  // undefined = English (none needed), null = still loading
  const [words, setWords] = useState<LocalizationResource | undefined | null>(CLERK_WORDS[locale] ? null : undefined);
  useEffect(() => {
    const load = CLERK_WORDS[locale];
    if (!load) return;
    let live = true;
    load().then((m) => live && setWords(Object.values(m).find((x) => x && typeof x === "object") as LocalizationResource))
      .catch(() => live && setWords(undefined));
    return () => { live = false; };
  }, [locale]);
  return words;
}

export default function ClerkBridge({ config, report }: BridgeProps) {
  const look = useMemo(appearance, []);
  const words = useClerkWords(pageT().locale);
  if (words === null) return null;
  return (
    <ClerkProvider publishableKey={config.publishableKey!} appearance={look} localization={words} afterSignOutUrl={typeof window === "undefined" ? "/" : window.location.pathname}>
      <Inner config={config} report={report} />
      <ClerkFailed><Failed report={report} /></ClerkFailed>
    </ClerkProvider>
  );
}

function Failed({ report }: Pick<BridgeProps, "report">) {
  useEffect(() => report({ loaded: false, failed: true, signedIn: false, hasPlan: false, user: null }, null), [report]);
  return null;
}

// Clerk Billing's checkout and subscription windows are opened the way its <CheckoutButton> and
// <SubscriptionDetailsButton> open them (pinned SDK version, see ADR 0008), so our own buttons can start them.
type BillingClerk = {
  __internal_openCheckout?: (p: { planId: string; planPeriod: "annual" | "month"; for: "user"; onSubscriptionComplete?: () => void }) => void;
  __internal_openSubscriptionDetails?: (p: { for: "user" }) => void;
  billing?: { getPlans(p: { for: "user" }): Promise<{ data: { id: string; slug: string }[] }> };
};

function Inner({ config, report }: BridgeProps) {
  const clerk = useClerk();
  const { isLoaded, isSignedIn, has } = useAuth();
  const { user } = useUser();

  const hasPlan = !!(isLoaded && isSignedIn && has?.({ plan: config.plan }));
  const email = user?.primaryEmailAddress?.emailAddress ?? null;
  const name = isSignedIn ? displayName(user?.firstName, user?.fullName, email) : null;

  const actions: ProviderActions = useMemo(() => {
    const b = clerk as unknown as BillingClerk;
    let planId = config.planId;
    const refresh = () => { void clerk.session?.getToken({ skipCache: true }); };
    return {
      signIn: () => clerk.openSignIn({}),
      signUp: () => clerk.openSignUp({}),
      async checkout() {
        if (!b.__internal_openCheckout) throw new Error(pageT()("account.errors.noCheckout"));
        if (!planId) {
          const plans = await b.billing?.getPlans({ for: "user" });
          planId = plans?.data.find((p) => p.slug === config.plan)?.id ?? null;
          if (!planId) throw new Error(pageT()("account.errors.notOnSale"));
        }
        b.__internal_openCheckout({ planId, planPeriod: "annual", for: "user", onSubscriptionComplete: refresh });
      },
      manage: () => (b.__internal_openSubscriptionDetails ? b.__internal_openSubscriptionDetails({ for: "user" }) : clerk.openUserProfile({})),
      profile: () => clerk.openUserProfile({}),
      signOut: () => clerk.signOut(),
    };
  }, [clerk, config.plan, config.planId]);

  useEffect(() => {
    const r: RemoteState = { loaded: isLoaded, failed: false, signedIn: !!isSignedIn, hasPlan, user: name ? { name, email } : null };
    report(r, isLoaded ? actions : null);
  }, [isLoaded, isSignedIn, hasPlan, name, email, actions, report]);

  return null;
}
