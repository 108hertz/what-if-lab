# 0029 — World tabs with a "More" overflow

- **Status:** in-progress (asked for directly by the owner, 2026-11-09)
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** —
- **Decisions:** —
- **Created:** 2026-11-09 · **Shipped:** —

## Why

The world switcher from [0021](./0021-sentence-topbar.md) was always a dropdown, even on wide screens with
plenty of room. Visitors had to open it to find out there are other worlds. Showing the worlds side by side lets
people see them and switch in one click.

## Scope

**In:** the topbar world switcher, at every width.
**Out:** the wordmark, the right-hand icons, the scale explorer, the world consoles.

## Design

- `components/shell/WorldMenu.tsx`: every mode (`MODES`, tab order) is a tab (glyph + name, `aria-current` on the
  current one). A hidden copy of the row measures each tab's natural width; a `ResizeObserver` on the bar and
  `document.fonts.ready` re-fit it. `fitTabs()` (pure) shows tabs in order while they fit next to a **More ▾**
  button; the rest go in its popover (same rows as the old list: glyph, name, subtitle). The current world always
  keeps a tab: when it would overflow, it takes the last visible place. With only one tab left, its name
  ellipsises.
- `app/globals.css`: `.worldtabs`, `.worldtab`, `.worldtab-more` replace `.worldmenu-btn`. The current tab uses the
  shared selection look (raised + signal bar).
- Strings: `shell.nav.worldButton` → `shell.nav.more` ("More") and `shell.nav.moreAria` ("More worlds"), all 20
  languages.
- `DESIGN.md` → Navigation updated.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Tabs flicker as they're measured | measured in a layout effect before paint; state only changes when the set changes |
| Long translated names | measured per language; re-fit on locale change |

## Verification

- [x] Automated: `tests/world-tabs.test.ts` covers `fitTabs`.
- [ ] Manual: 375, 768, 1024, 1280, 1600 widths; the current world is always visible; More works with the keyboard; both themes.
