# 0006 — DESIGN.md becomes the canonical design system

- **Status:** shipped
- **Phase:** 1
- **Features:** —
- **Decisions:** [ADR 0006](../decisions/0006-darkroom-design-system.md) (amended: location of the rules, not their content)
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

Darkroom is documented twice: the rulebook in `docs/design/design-system.md` and, since `/impeccable
document`, a root `DESIGN.md` in the portable DESIGN.md format (YAML tokens + eight sections) with a
`.impeccable/design.json` sidecar. Two authorities will drift. The user chose `DESIGN.md` as the single
source; this change makes that true without changing any visual rule.

## Scope

**In:**
- Move anything only `design-system.md` says into `DESIGN.md` (in its canonical sections): the
  deviations-from-ORYZO list, the accessibility block, voice lines that constrain visuals, the
  console ASCII layout.
- Shrink `docs/design/design-system.md` to a short pointer (kept so old links resolve).
- Repoint every reference: `CLAUDE.md`, `README.md`, `docs/PLAN.md`, `docs/features/fork-and-compare.md`,
  `app/globals.css` header comment, `.claude/skills/darkroom-ui/SKILL.md`, `.claude/skills/add-sandbox/SKILL.md`.
- Amend ADR 0006 with a dated note: rules live in `DESIGN.md`; tokens still live in `app/globals.css`.
- Remove the "until change 0006 lands" comment from `DESIGN.md`.

**Out:**
- Any change to tokens, components or layout. Shipped ADRs/changes (0004, 0005, ADRs 0004/0005) keep
  their historical links.
- Generating CSS from the DESIGN.md frontmatter (`app/globals.css` stays hand-written; drift is caught
  by review, not tooling).

## Design

- `DESIGN.md` frontmatter stays the machine-readable token mirror; `app/globals.css` remains the
  runtime source. Rule: a token change edits both in the same commit, then regenerates
  `.impeccable/design.json`.
- `darkroom-ui` skill: "read `DESIGN.md` before any UI work" replaces the design-system.md reference;
  its checklist is unchanged.
- `docs/design/design-system.md` becomes: title, one paragraph, link to `/DESIGN.md`.

## Steps

1. Merge the missing sections into `DESIGN.md`; regenerate `.impeccable/design.json`.
2. Replace `docs/design/design-system.md` with the pointer; amend ADR 0006.
3. Repoint `CLAUDE.md`, `README.md`, `docs/PLAN.md`, the feature doc, `globals.css` comment and both skills.
4. `npm run typecheck && npm test && npm run build` (docs-only, should be a no-op).

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| A rule is lost in the move | Step 1 diff-checks every heading/bullet of the old doc against DESIGN.md before step 2 |
| Frontmatter and `globals.css` drift | Same-commit rule above, stated in DESIGN.md and the darkroom-ui skill |

## Verification

- [x] `grep -r design-system.md` only hits the pointer file and historical docs.
- [x] darkroom-ui skill loads DESIGN.md and its checklist still matches.
- [x] Typecheck, 24 tests and build green.

## Log

- 2026-11-02 — proposed after `/impeccable document`; user chose DESIGN.md as canon.
- 2026-11-02 — approved and shipped. Merged deviations, CSS token map, console sketch, icon list,
  fork-split and blocking checks into DESIGN.md; also added PRODUCT.md/DESIGN.md to the CLAUDE.md tree.
