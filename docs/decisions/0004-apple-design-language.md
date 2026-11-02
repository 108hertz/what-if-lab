# 0004 — Apple-inspired design language

- **Status:** accepted (colour, type, depth and icons amended by [ADR 0005](./0005-darkroom-visual-language.md))
- **Date:** 2026-11-02

## Context

The current UI is a single dark "observatory" theme with three web fonts. We want an Apple-grade
experience: calm, legible, content-first, fluid motion, light and dark. Traffic comes from casual
visitors on phones as much as desktops, so clarity beats density.

## Decision

Adopt an **Apple-inspired** design language (Human Interface Guidelines principles: clarity, deference,
depth) implemented with our own tokens and components. We **do not** copy Apple assets, logos, SF
Symbols or ship the SF Pro font file (licensing); we use the system font stack, which renders SF on
Apple devices, with Inter as the fallback elsewhere.

Rules are in [design/apple-design-language.md](../design/apple-design-language.md) and enforced by the
`apple-ui-ux` Claude skill.

## Consequences

- Replace the three Google Fonts with system stack + one variable font (Inter) → fewer requests, better LCP.
- Two themes (light + dark, following `prefers-color-scheme`, user-overridable). Canvas drawing must read
  theme colours from tokens, not hard-coded hex.
- `--base` / `--alt` keep their meaning (no-change world vs what-if world) in both themes.
- Implementation planned in [change 0001](../changes/0001-apple-ui-redesign.md).
