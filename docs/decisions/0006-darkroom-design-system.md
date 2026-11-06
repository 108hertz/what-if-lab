# 0006 — Darkroom is the only design system

- **Status:** superseded by [ADR 0009](./0009-control-room-design-system.md)
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
- Amended by [change 0005](../changes/0005-darkroom-oryzo-alignment.md): aligned with the ORYZO style reference (two surfaces, no tracking, the reference type scale, dashed-underline selection); deviations are listed in the design doc.
- Amended by [change 0006](../changes/0006-design-md-canonical.md) (2026-11-02): the rules moved from
  `docs/design/design-system.md` to the root [`DESIGN.md`](../../DESIGN.md), which is now the single design
  source (portable DESIGN.md format, `.impeccable/design.json` sidecar). Runtime tokens stay in
  `app/globals.css`; a token change updates both in the same commit. No rule changed.
