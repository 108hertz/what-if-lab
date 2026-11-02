# 0005 — "Darkroom" visual language on top of the Apple design language

- **Status:** superseded by [0006](./0006-darkroom-design-system.md)
- **Date:** 2026-11-02
- **Amends:** [ADR 0004](./0004-apple-design-language.md) (colour, typography, depth, icons; principles unchanged)

## Context

ADR 0004 adopted Apple's HIG principles. The user then supplied a style reference (ORYZO: warm-dark
canvas, cream uppercase type, no shadows, one rare accent) as the target *feel*. The two agree on
restraint and content-first, but disagree on themes (light + dark vs dark), case (sentence case vs
uppercase labels), depth (soft shadows vs none) and accent (blue filled buttons vs no CTA colour).

## Options

| Option | Pros | Cons |
| --- | --- | --- |
| A. Pure Apple (ADR 0004 as is) | Familiar, proven | Generic; looks like a settings app |
| B. Pure reference | Very distinctive | Uppercase body text, low-contrast greys, no light theme; editorial site patterns don't fit an interactive tool |
| C. Apple structure + reference surface | Apple usability, distinctive look; stage = "the object in the void" | Two sources to reconcile; amends some 0004 rules |

## Decision

Option C. Keep ADR 0004's principles, components, accessibility and motion; replace its colour,
typography, depth and icon rules with the "darkroom" system specified in
[change 0003](../changes/0003-darkroom-visual-language.md). We ship Inter (the reference's named
substitute) rather than the commercial Halyard font.

## Consequences

- `docs/design/apple-design-language.md` is rewritten for colour/type/shape/voice/icons when 0003 ships.
- `--base`/`--alt` hex values are unchanged, so `CLAUDE.md` and canvas semantics hold.
- The `apple-ui-ux` skill's "no all-caps > 12 px" and "pill primary in `--accent`" rules change with it.
- Light theme becomes optional (decided in 0003).
