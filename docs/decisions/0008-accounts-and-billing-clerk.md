# 0008 — Accounts and Premium billing with Clerk, checked in the browser

- **Status:** accepted (supersedes the provider and unlock parts of [ADR 0002](./0002-payments-and-premium-unlock.md); amends [ADR 0001](./0001-static-site-no-backend.md) consequences)
- **Date:** 2026-11-05

## Context

The product owner wants people to **register and buy a yearly subscription** (Premium, US$15/year), with
signed-in subscribers able to do more: no ads, and exporting a run as video (phone and YouTube shapes) or
slides. The account side must be **purely a hosted provider (Clerk or Kinde)** with **no backend code of
ours** (ADR 0001: static export on a CDN, no API routes, server actions, webhooks or secrets).

ADR 0002 proposed license keys via Lemon Squeezy and no accounts; it left accounts as the fallback. The owner
has now chosen accounts. What we need from the provider:

1. Sign-up / sign-in UI we don't host, usable from a static page (no redirects to routes we must serve).
2. Plans + checkout + cancellation hosted by the provider.
3. A way for **browser code alone** to ask "is this visitor on the Premium plan?"
4. Works with `next build` + `output: "export"`: no middleware, no server components that need a server.

## Options

| Option | How entitlement reaches the browser | Static export | Pros | Cons |
| --- | --- | --- | --- | --- |
| **Clerk + Clerk Billing** (`@clerk/react`) | Session token carries the plan; `useAuth().has({ plan })` | Yes: `@clerk/react` is a plain SPA SDK; clerk-js loads from Clerk's CDN | Sign-in, sign-up, profile, **checkout drawer** and **subscription details** all open as overlays on our page; one SDK; plan check is one call | Billing APIs marked beta (pin the SDK); Clerk is **not merchant of record** (Stripe account is ours, so sales tax/VAT are ours); monthly price must exist next to the annual one |
| Kinde + Kinde billing (`@kinde-oss/kinde-auth-react`) | Entitlements/plan claims in the access token | Yes (SPA SDK) | Generous free tier, billing built in | Checkout and portal are **redirect** pages, not overlays; plan sign-up flows tied to registration; fewer client-side billing primitives |
| Lemon Squeezy license keys (ADR 0002) | Public license API from the browser | Yes | Merchant of record (tax handled), no accounts | No accounts (the owner now wants them); cross-device = re-typing a key |

## Decision

Use **Clerk** with **Clerk Billing** for accounts, the US$15/year Premium plan, checkout and cancellation,
through the SPA SDK **`@clerk/react` 6.17.8** (pinned exactly, because the billing calls are beta).

- **Config:** only the **publishable key** (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `pk_test_…`/`pk_live_…`)
  and the plan slug (`NEXT_PUBLIC_PREMIUM_PLAN`, default `premium`; optional `NEXT_PUBLIC_CLERK_PREMIUM_PLAN_ID`)
  are read, inlined at build time. A value that looks like a secret (`sk_…`) is refused in code.
- **No key ⇒ accounts off:** the lab runs exactly as before (everything free, ads as now, no account UI in
  production builds). Dev/test builds get a local "Simulate Premium" switch so exports can be tested.
- **Entitlement:** `has({ plan: <slug> })` on the Clerk session, in the browser. Clerk's own windows (sign-in,
  sign-up, checkout drawer with `planPeriod: "annual"`, subscription details, profile) open over the lab, so
  the visitor never leaves the page and no route or server of ours is involved. Checkout and subscription
  details are opened the way Clerk's `<CheckoutButton>` / `<SubscriptionDetailsButton>` open them
  (`clerk.__internal_openCheckout` / `__internal_openSubscriptionDetails`); this is why the version is pinned.
- **Adapter boundary:** only `components/account/clerk.tsx` imports the SDK, and it is lazy-loaded only when a
  key exists. The rest of the app uses `useAccount()` → `{ status, user, isPremium, signIn, signUp, upgrade,
  manage, profile, signOut, retry }` from `components/account/context.tsx`; the rules live in pure functions
  in `components/account/state.ts`. Swapping to Kinde = a new adapter file reporting the same `RemoteState`.
- **Offline / provider down:** a device that saw an active subscription keeps Premium for **14 days** while the
  provider can't be reached (localStorage hint), as ADR 0002 planned; any definite "free" answer clears it.

## Consequences

- **Client-side gating can be bypassed** by someone editing the page in their own browser (they could hide
  ads or call the export code). Accepted, as in ADR 0001: Premium is convenience and support, not secret data,
  and exports only render what the free page already shows. Nothing server-side to protect.
- **Tax:** Clerk Billing charges through *our* Stripe account; Clerk is not merchant of record. Before
  `pk_live_` goes out we must confirm Stripe Tax (or equivalent) covers sales tax/VAT, or revisit a merchant of
  record. Recorded as an open item in PLAN.md.
- **Clerk Billing plans need a monthly price;** the lab only offers the annual period in its own UI, but Clerk's
  profile page may show both. Set the monthly price deliberately (see the feature doc's setup).
- **Production instance** needs our own domain and Clerk's DNS records (Frontend API CNAME); dev instances
  work on `localhost`.
- No webhooks, no server, no secret key anywhere in this repo. A future need for server-side entitlement
  (e.g. paid API) needs a new ADR superseding ADR 0001.
- Privacy policy must name Clerk (accounts) and Stripe (payments) before going live.
- Spec: [features/premium.md](../features/premium.md), [features/exports.md](../features/exports.md); change
  [0020](../changes/0020-accounts-premium-exports.md).
