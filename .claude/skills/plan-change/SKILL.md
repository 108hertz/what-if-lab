---
name: plan-change
description: Plan a change before building it. Use whenever the user asks for a new feature, redesign, world, integration (ads, payments, analytics), dependency or any non-trivial change in What-If Lab — write a change doc in docs/changes/ and get it approved before editing code. Also use for "plan this", "propose", "what would it take to…".
---

# Plan a change

What-If Lab rule: **no non-trivial change without a change doc** (see `docs/README.md`).
Non-trivial = more than one file's behaviour, a new dependency, UI layout, a new world, or anything
touching ads, premium, payments, SEO or hosting. Typos and one-line fixes skip this.

## Steps

1. **Read context:** `docs/PLAN.md`, `docs/changes/README.md` (next free number), the relevant
   `docs/features/*.md`, any ADRs in `docs/decisions/`, and the code you'd touch.
2. **Check the principles in PLAN.md.** Reject or rework anything that needs our own backend, uses
   AI/live data in the simulation, puts ads near the stage, or paywalls the core fork-and-compare.
   If a hard-to-reverse choice is involved (vendor, hosting, data format), draft an ADR from
   `docs/decisions/_TEMPLATE.md` with status `proposed`.
3. **Write** `docs/changes/NNNN-slug.md` from `docs/changes/_TEMPLATE.md`:
   - Why (goal from PLAN.md), Scope in/out, Design (files touched, data shapes, UI states),
   - Steps small enough that each ends green on `npm run typecheck && npm test && npm run build`,
   - Risks, Verification (automated + manual viewports/themes), Log entry with today's date.
   UI work must follow the `control-room-ui` skill.
4. **Register** it: add a row to `docs/changes/README.md`; if it's a new feature, create its feature
   doc (status `planned`) via the `document-feature` skill and link both ways.
5. **Stop and ask for approval.** Summarise the plan in 3–5 lines and ask the user to approve. Do not
   start implementing until they say so.

## After approval — implementing

- Set status `in-progress`, log the date. Work through Steps in order, one commit per step when the
  user wants commits.
- If reality diverges from the plan, update the Design/Steps section and log why — don't silently drift.
- When done: status `shipped` + date, feature doc status/behaviour updated, PLAN.md checkbox ticked,
  verification boxes ticked honestly (leave unticked what you couldn't verify, and say so).
