# Simulation disclaimer

- **Status:** live
- **Tier:** both
- **Owner area:** `components`
- **Changes:** [0028](../changes/0028-simulation-disclaimer.md)

## What it is

A short note the first time someone opens What-If Lab saying that everything here is a model built on theories and
rounded numbers — not real data and not a prediction — and that it is meant for playing with possibilities. After that, a
small highlighted "Simulation · not real" label stays in the top bar on every page and opens the note again.

## Why

Trust and experience: worlds show forecast-looking numbers about climate, countries, kids and habits. Saying plainly what
they are keeps visitors (and shared screenshots) from reading them as fact.

## Behaviour

- Shown once per browser, after the boot scene, on whichever page is opened first. Closed by "Got it", Escape or the
  backdrop; any close marks it seen. No storage available ⇒ shown each visit.
- Comes before the first-visit theme tip (and, once 0027 ships, after the consent banner).
- The label is in the top bar on every page; icon-only under 768 px; full sentence always in its accessible name.
- Every word is in `shell.disclaimer.*`, in all 20 languages; works in RTL.
- Same for free and Premium. Not part of exports (yet).

## Out of scope

Per-world wording, export footers, a legal terms page, consent/acceptance tracking.

## Acceptance checks

- [x] Fresh browser: dialog after boot; reload: no dialog; the label reopens it.
- [x] Theme tip appears only after the dialog closes.
- [x] `npm test` (i18n catalogs + `tests/disclaimer.test.ts`) green for all locales.
- The static page intro (no-JS, crawlers) carries the same sentence in amber.
