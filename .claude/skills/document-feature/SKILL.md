---
name: document-feature
description: Create or update a feature spec in docs/features/ for What-If Lab. Use when a feature is proposed, when its behaviour changes, when a change ships, or when the user asks "document this feature" or "what does X do".
---

# Document a feature

1. Look for an existing doc in `docs/features/` (see its `README.md` index). Update rather than duplicate.
2. New doc: copy `docs/features/_TEMPLATE.md` to `docs/features/<kebab-name>.md`. Fill:
   - Status (`idea · planned · in-progress · live · retired`), Tier (free/premium/both), owner area
     (real paths), linked change docs and ADRs.
   - **What it is** for a non-developer; **Why** tied to a PLAN.md goal (traffic, revenue, experience).
   - **Behaviour** as concrete rules: inputs, outputs, edge cases, mobile, offline, reduced motion,
     free vs premium.
   - **Out of scope** and **Acceptance checks** a reviewer can actually run.
3. Describe behaviour as it **is** (for live features, verify against the code) or as **planned** (for
   planned ones) — say which. Never document something as live that isn't.
4. Add/update the row in `docs/features/README.md`.
5. If premium gating changes, update the table in `docs/features/premium.md` too.
