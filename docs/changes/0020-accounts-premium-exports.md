# 0020 — Accounts, Premium subscription, and video/slide exports

- **Status:** shipped (approval waived by the user: "don't wait for approval")
- **Phase:** 3 (see [PLAN.md](../PLAN.md))
- **Features:** [Premium](../features/premium.md), [Exports](../features/exports.md), [Ads](../features/ads.md)
- **Decisions:** [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md) (supersedes the unlock part of ADR 0002)
- **Created:** 2026-11-05 · **Shipped:** 2026-11-05

## Why

Revenue (PLAN.md goal): let visitors register and buy Premium at US$15/year, entirely through a hosted
provider with no backend of ours. Subscribers get no ads and new sharing tools: the current fork exported as
a **phone video** (1080×1920), a **YouTube video** (1920×1080) or **slides** (PDF). Sharing a what-if as a
clip also feeds traffic.

## Scope

**In:**
- Clerk accounts + Clerk Billing (ADR 0008) behind a provider-neutral adapter (`useAccount()`).
- Shell account menu; one Premium dialog that walks signed-out → account → checkout → unlocked; manage/cancel;
  loading, error, offline and not-configured states; dev-only "Simulate Premium".
- Ads off for Premium: every `AdSlot` renders nothing, the shell drops its rail columns.
- Export entry point in the shared Transport (every world gets it), deterministic replay of the fork, video via
  `MediaRecorder` (MP4 where supported, else WebM), slides via jsPDF.
- `output: "export"` turned on in `next.config.ts` (ADR 0001) to prove the stack builds as a static site.
- Docs, tests.

**Out:** our own server/webhooks; license keys; Monte-Carlo, saved scenarios and other Premium tools from
PLAN.md; PNG zip of slides; audio in videos; embedding Inter in the PDF as text (slides are images); team or
classroom plans; the rest of change 0002 (sitemap, robots, hosting, analytics).

## Design

Follows the Darkroom system (DESIGN.md) and the `darkroom-ui` checklist; designed with the `impeccable` skill
(Operate mode: familiar patterns, precision over expression).

**Flow.** Signed out → (account glyph in nav, or "Ad-free with Premium" in an empty ad slot, or "Unlock with
Premium" in the export sheet) → Premium sheet: $15 a year, four perks, "Every world and every what-if stays
free" → **Create account and continue** (or *I have an account*) → Clerk sign-up modal → on return the checkout
drawer opens automatically (a session flag survives a social-login redirect) → pay → the Premium sheet reopens
as "Premium is on", ads are gone, exports unlocked. Manage/cancel: account menu → *Manage subscription* (Clerk
subscription details). Our sheets close before a Clerk window opens (Clerk's windows aren't in the top layer),
and full screen is left first.

**States.** `off` (no key) · `loading` · `signed-out` · `free` · `premium` · `error` (offline, blocked or
timed out after 15 s; *Try again* remounts the adapter). A recent subscriber keeps Premium for 14 days while
the provider is unreachable. Production builds without a key show no account UI, no export button and a
plain-text slot upsell, i.e. exactly the old lab.

**Files.**
- `components/account/state.ts` — pure rules: `readConfig`, `resolveAccount`, `adsAllowed`, `canExport`,
  storage hints (all try/catch).
- `components/account/context.tsx` — `AccountProvider`, `useAccount`, `usePremium`, `PREMIUM_ON_SALE`; lazy
  adapter; pending-upgrade hand-off; thank-you on purchase.
- `components/account/clerk.tsx` — the only SDK import; Darkroom tokens passed as Clerk `appearance`.
- `components/account/AccountMenu.tsx`, `PremiumDialog.tsx`; `components/ui/Dialog.tsx` (native `<dialog>`,
  portalled to body, bottom sheet on phones).
- `components/console/AdSlot.tsx` (null for Premium), `components/shell/Lab.tsx` (provider, nav-end, rails).
- `lib/sim/engine.ts` — records `origin` (world clone just before the first change + each change with its
  time, params and UI state); `mergeTimeline()` extracted. The simulation never reads `origin`.
- `lib/export/replay.ts` — `planReplay`, `Replay`, `runToEnd`, `keyMetric`, `keyMoments` (framework-free).
- `lib/export/frame.ts` — video frames (title hold, run, summary hold) and five slide layouts drawn with each
  sandbox's own `draw()` at the export size.
- `components/console/export/render.ts` (MediaRecorder, jsPDF) and `ExportDialog.tsx` (sheet + button);
  `Transport.tsx` renders `<ExportButton>`.
- `lib/sim/draw.ts` — `STAGE.good/bad/ember` mirror existing tokens (no new tokens).
- Icons: user, download, phone, wide, slides, check, noads.

**Deterministic export.** The live stage steps with real frame times; an export re-runs the fork from
`engine.origin` with a fixed step (`dt = span / steps`, 30 steps per clip second, 6–20 s of running), so the
same world, seed, settings and what-if give the same frames on any device. If a world edits its changes in
place after the fork (child's "undo one change"), the recorded list no longer matches `engine.applied` and the
export starts from the current moment instead (still deterministic, and the sheet says so).

## Steps

1. Engine origin + replay + frames (framework-free) with tests.
2. Account adapter (state, context, Clerk), AdSlot/Lab gating, account menu, Premium sheet.
3. Export sheet + recorder + slides; Transport button.
4. `output: "export"`; docs (ADR 0008, features, PLAN, CLAUDE.md, DESIGN.md components).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Clerk Billing APIs are beta / internal openers change | SDK pinned exactly; openers feature-detected with a plain error message; ADR notes it |
| Tax: Clerk is not MoR | Open item before `pk_live_`; Stripe Tax or revisit MoR |
| MediaRecorder support varies | MP4 → WebM fallback; clear message and slides as the alternative when unsupported |
| Background tab throttles timers during recording | Sheet says "Keep this tab open while it records" |
| Hiding slots for Premium shifts layout | Columns already flex; hint from localStorage decides before the provider answers |
| Client gating bypassable | Accepted (ADR 0001/0008) |

## Verification

- [x] Automated: `tests/account.test.ts` (config, status resolution, grace hint, ad slots render nothing for
      Premium), `tests/export.test.ts` (origin recorded, replay deterministic per world, live sim untouched,
      every world's frames and slides draw, file names); structure and ad-slot tests still green.
- [x] `npm run typecheck && npm test && npm run build` (static export to `out/`), also with a dummy publishable
      key (Clerk code split into its own lazy chunk).
- [x] Manual (dev server, Simulate Premium): 1280×800 earth — export sheet locked → unlocked; YouTube and phone
      MP4s recorded and played back (10 s, 1920×1080 / 1080×1920); 8-slide PDF rendered; ads and rails gone for
      Premium at 1680×1050; no page scroll at 1280×800, 1680×1050, 375×812; phone transport fits one row.
- [ ] Not verified: a real Clerk sign-up and test-mode checkout (needs the owner's Clerk app and key); Safari
      and Firefox recording; light theme of Clerk's own windows.
- [x] Docs: feature docs, PLAN.md, CLAUDE.md, DESIGN.md components.

## Log

- 2026-11-05 — proposed and approved in the same request (user waived review); implemented and shipped.
