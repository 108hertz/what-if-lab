# 0002 — Payments and Premium unlock without a backend

- **Status:** proposed (confirm provider fees/terms at signup)
- **Date:** 2026-11-02

## Context

Premium is **US$15 / year**, sold worldwide. With no backend (ADR 0001) we need a provider that hosts
checkout, handles recurring billing, cancellations, refunds, invoices and **sales tax / VAT** in every
country, and gives the browser a way to know "this visitor is Premium" without our own server.

Selling globally at a low price makes **merchant-of-record (MoR)** important: the provider is the legal
seller and remits VAT/GST for us. With plain Stripe we would be the seller and own tax registration.

## Options

| Option | How unlock works | Pros | Cons |
| --- | --- | --- | --- |
| **Lemon Squeezy** (MoR) | Hosted checkout overlay → buyer gets a **license key** by email + on the thank-you page → browser calls the public license *activate/validate* endpoint, caches result | MoR (tax handled), license keys built in, customer portal, no accounts needed, overlay checkout with JS snippet | Fees higher than raw Stripe; vendor lock-in for license format |
| **Paddle Billing** (MoR) | Paddle.js overlay checkout → need entitlement check, which normally means a server webhook or a third-party license service | MoR, mature, strong in EU | No first-class client-side license check; pushes toward a backend |
| Stripe Payment Links + customer portal | Needs webhook → server to issue entitlements | Lowest fees, best DX | We are seller of record (VAT/GST on us); needs a backend |
| Auth-with-billing platforms (Clerk Billing, Outseta, Memberstack) | Login → JWT/session claims include plan → client checks claim | Real accounts, cross-device for free | Accounts friction, monthly platform fee, most are not MoR |

## Decision (proposed)

Use **Lemon Squeezy** as merchant of record with a **yearly subscription product ($15) that issues
license keys**. No accounts in v1.

Flow:
1. "Go Premium" opens the Lemon Squeezy **overlay checkout** (their `lemon.js` script). Our only
   config is the public checkout URL / variant ID — no secrets in the client.
2. On success, the thank-you redirect lands on `/premium/activate#key=…` (or the user pastes the key
   from their email). The key never goes into a query string.
3. The browser calls the license **activate** endpoint once per device (instance name = random device
   ID), then **validate** at most once every 7 days. Result + expiry cached in `localStorage`.
4. Offline or API down → keep the last good state until its expiry + 14-day grace.
5. "Manage subscription" links to the provider's hosted customer portal.

**Must verify before implementation (change doc gate):** that the license endpoints are callable from
the browser (CORS) without an API key, current fee schedule, activation-limit settings, and that
subscription cancellation/expiry is reflected by `validate`. If CORS is blocked, fall back to the
"auth-with-billing platform" option via a new revision of this ADR — not a home-grown server.

## Consequences

- Premium gating is client-side and bypassable (accepted in ADR 0001). Keep Premium valuable through
  convenience, not secrecy.
- Cross-device = re-enter the license key (activation limit e.g. 5 devices). Re-evaluate accounts in
  Phase 4.
- Privacy policy and terms pages must name the provider as merchant of record.
- Spec lives in [features/premium.md](../features/premium.md).
