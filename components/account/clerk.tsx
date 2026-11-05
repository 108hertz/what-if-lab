"use client";

import { useEffect, useMemo } from "react";
import { ClerkProvider, ClerkFailed, useAuth, useClerk, useUser } from "@clerk/react";
import type { BridgeProps, ProviderActions } from "./context";
import { displayName, type RemoteState } from "./state";

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
      colorPrimary: v("--bg-elevated"),
      colorPrimaryForeground: v("--stage-ink"),
      colorBackground: v("--surface"),
      colorForeground: v("--label"),
      colorMutedForeground: v("--label-2"),
      colorNeutral: v("--label"),
      colorBorder: v("--separator"),
      colorInput: v("--bg"),
      colorInputForeground: v("--label"),
      colorRing: v("--label"),
      colorDanger: v("--bad"),
      colorShadow: "transparent",
      fontFamily: getComputedStyle(document.body).fontFamily,
      borderRadius: "12px",
    },
  };
}

export default function ClerkBridge({ config, report }: BridgeProps) {
  const look = useMemo(appearance, []);
  return (
    <ClerkProvider publishableKey={config.publishableKey!} appearance={look} afterSignOutUrl={typeof window === "undefined" ? "/" : window.location.pathname}>
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
        if (!b.__internal_openCheckout) throw new Error("Checkout isn't available in this version. Try again later.");
        if (!planId) {
          const plans = await b.billing?.getPlans({ for: "user" });
          planId = plans?.data.find((p) => p.slug === config.plan)?.id ?? null;
          if (!planId) throw new Error("Premium isn't on sale yet. Please try again later.");
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
