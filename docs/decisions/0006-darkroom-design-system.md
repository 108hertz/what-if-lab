# 0006 — Darkroom is the only design system

- **Status:** accepted
- **Date:** 2026-11-02
- **Supersedes:** [ADR 0004](./0004-apple-design-language.md), [ADR 0005](./0005-darkroom-visual-language.md)

## Context

ADR 0004 adopted an Apple-inspired design language; ADR 0005 layered the "darkroom" surface on top
of it, and change 0003 shipped that surface. Keeping both means two sources of truth that disagree
(case, accent colour, shadows, theme priority). The user wants the darkroom system and tokens alone,
plus a console layout where the working screens never scroll.

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| A. Keep 0004 + 0005 layered | No doc churn | Contradictory rules; every UI task re-litigates them |
| B. Darkroom only, restating the good accessibility/interaction rules in our own words | One source of truth; matches what's shipped | Rewrite design doc and skill once |

## Decision

Option B. `docs/design/design-system.md` (darkroom tokens, two voices, shape, icons, console layout,
no-scroll rule for working screens) is the single design source, enforced by the `darkroom-ui` skill.
We keep no Apple branding or naming in the design docs.

## Consequences

- Delete `docs/design/apple-design-language.md` and the `apple-ui-ux` skill; drop change 0001.
- Working screens (`/`, `/lab/*`) are fixed-viewport consoles; reading screens may scroll.
- Implemented by [change 0004](../changes/0004-single-screen-console.md).
