# What-If Lab docs

This folder is the source of truth for **what** we build and **why**. Code says how.

| Folder | What lives there | When to touch it |
| --- | --- | --- |
| [`PLAN.md`](./PLAN.md) | Product goals, business model, phased roadmap | When priorities or phases change |
| [`features/`](./features/) | One spec per user-facing feature: what it does, rules, status | Before building a feature, and when its behaviour changes |
| [`changes/`](./changes/) | Change proposals: one per planned piece of work, with scope, steps, risks | **Before** any non-trivial change. Updated as it ships |
| [`decisions/`](./decisions/) | Architecture/product decision records (ADRs): context, options, choice | When a choice is hard to reverse (vendors, hosting, data model) |
| [`design/`](./design/) | Design system (darkroom): tokens, layout and component rules | Before UI work |

## How work flows

```
idea ──► features/<feature>.md (status: idea)
     ──► changes/NNNN-<slug>.md (status: proposed)   ← the plan, reviewed before coding
     ──► approved ──► implement in small commits ──► npm run typecheck && npm test && npm run build
     ──► change status: shipped, feature status: live, PLAN.md checkbox ticked
```

Rules:

1. **No non-trivial change without a change doc.** "Non-trivial" = touches more than one file's behaviour,
   adds a dependency, changes UI layout, adds a world, or affects ads/premium/SEO. Typos and one-line
   fixes don't need one.
2. **A change doc names the feature docs it touches** and updates them in the same commit that ships it.
3. **Decisions that are hard to reverse get an ADR** (`decisions/`). Change docs link to them.
4. Numbering: zero-padded, monotonically increasing (`0007-…`). Never renumber.
5. Status values — features: `idea · planned · in-progress · live · retired`;
   changes: `proposed · approved · in-progress · shipped · dropped`;
   decisions: `proposed · accepted · superseded`.

Templates: [`features/_TEMPLATE.md`](./features/_TEMPLATE.md), [`changes/_TEMPLATE.md`](./changes/_TEMPLATE.md),
[`decisions/_TEMPLATE.md`](./decisions/_TEMPLATE.md).

Claude Code skills in [`/.claude/skills`](../.claude/skills) automate this flow (`plan-change`,
`document-feature`, `darkroom-ui`, `add-sandbox`).
