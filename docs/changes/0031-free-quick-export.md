# 0031 — Free quick export: one landscape video, no editing

- **Status:** shipped
- **Phase:** 2 · 3 (see [PLAN.md](../PLAN.md))
- **Features:** [exports](../features/exports.md)
- **Decisions:** [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md)
- **Created:** 2026-11-10 · **Shipped:** 2026-11-10

## Why

Shared clips bring traffic (PLAN.md). Today the site runs with accounts off (`ACCOUNTS_ON = false`), so the export button
is hidden from everyone and nobody can share a video. A free, simple export gets clips out now; the full studio stays the
reason to buy Premium later.

## Scope

**In:**
- The download button on every world's transport is shown to everyone, accounts on or off.
- Free (and accounts-off) visitors get **Quick export**: a small sheet with the live preview and one button,
  *Download video* — **1920×1080 landscape**, the default Control Room style, "changed only", pick-for-me length.
  Nothing can be edited: no Output / Text / Look / Timing tabs, no styles, no drag.
- The video carries the default text layers (brand, what-if line, key numbers, result) — the brand line is the traffic.
- Premium (when accounts are on) keeps the full studio as today. Free visitors see one quiet line "More sizes, pictures,
  text, slides and your own style with Premium" only when `PREMIUM_ON_SALE`.

**Out:** pictures, text, slides, phone/square/portrait sizes, clean video, side by side — all stay Premium. No watermark
beyond the existing brand layer. No change to how a video is rendered.

## Design

- `components/account/state.ts`: `exportLevel(account)` → `"full" | "quick"` (`full` for Premium and the dev simulation;
  `quick` otherwise). `canExport` stays for the full studio.
- `components/console/export/ExportDialog.tsx`: `ExportButton` no longer returns null when `!PREMIUM_ON_SALE`; it opens
  `QuickExport` or the studio by `exportLevel`.
- `components/console/export/QuickExport.tsx` (new): reuses `planReplay`, `defaultStyle("youtube")`, `PreviewCanvas` and
  the same render path (`render.ts`), so the file is byte-for-byte the studio's default landscape video. Progress, cancel,
  *Download again*, errors and no-recording message as in the studio. Below 768 px the preview is on top, button under it.
- Words: `export.quick.*` keys in `lib/i18n/locales/<code>/export.json`, 20 languages.
- Analytics (change 0027, when shipped): `track("export", { level: "quick" })`.

## Steps

1. `exportLevel` + tests (accounts off ⇒ quick; free ⇒ quick; premium/dev ⇒ full).
2. `QuickExport.tsx` + `ExportButton` routing; test that the quick plan equals the studio's default youtube plan.
3. Words in 20 languages; feature doc `exports.md` (tier: free quick video, Premium studio).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Long renders on slow phones | Same pick-for-me length (6–20 s) and cancel as the studio |
| Browsers without MediaRecorder | Same "can't record here" message; nothing else is offered for free |
| Free export makes Premium less attractive | Only one size, one style, video only; studio stays Premium |
| Exports changing sims | Same replay path; `tests/export.test.ts` already guards it |

## Verification

- [x] Automated: `exportLevel` rules; quick style = default youtube style (`tests/site-pages.test.ts`); export tests green.
- [ ] Manual (dev, accounts off, solar, 1024×768 dark): button visible, sheet shows the 1920 × 1080 preview, spec line
      and one *Download video* button, no editing controls ✓. Not yet: an actual recorded download, phone width, Safari.
- [x] Docs: `exports.md` updated.

## Log

- 2026-11-10 — proposed.
- 2026-11-10 — approved; in progress.
- 2026-11-10 — shipped. `quickStyle()` / `QUICK_SIZE` live in `lib/export/style.ts`; the sheet is `QuickExport.tsx`.
