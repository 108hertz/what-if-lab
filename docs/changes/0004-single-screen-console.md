# 0004 — Single-screen console; darkroom becomes the only design system

- **Status:** shipped
- **Phase:** 1
- **Features:** [fork and compare](../features/fork-and-compare.md), [scale explorer](../features/scale-explorer.md), [ads](../features/ads.md)
- **Decisions:** [ADR 0006](../decisions/0006-darkroom-design-system.md) (supersedes ADR 0004 and 0005)
- **Replaces:** [change 0001](./0001-apple-ui-redesign.md) (dropped)
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

Two problems:

1. **Two design sources.** The Apple design doc, ADR 0004, the `apple-ui-ux` skill and change 0001 now
   contradict the darkroom system we shipped in 0003 (sentence case, blue accent, shadows, light-first).
   Contributors and Claude get mixed instructions.
2. **The lab is a scrolling page.** Today the what-ifs, readouts and variables sit in a tall side column
   and the chart/timeline sit below the stage, so you scroll away from the simulation to change it or
   read it. For an experiment tool the user should **see every tool, every variable and the result at
   once**, like an instrument console. Page scroll belongs to reading screens, not the working screen.

## Scope

**In:**
- Retire the Apple design language: one design doc (`docs/design/design-system.md`), one skill
  (`darkroom-ui`), ADR 0006; update every reference (CLAUDE.md, PLAN.md, skills, docs README).
- **No-scroll rule:** the lab (`/lab/*`) and the scale view (`/`) fill exactly one viewport
  (`100dvh`); the page itself never scrolls. Only named regions may scroll internally (see below).
- New console layout for desktop, tablet and phone. Compact control rows so the worst-case world
  (Child: 8 what-ifs, 13 sliders/selects in 3 groups, 5 readouts, info) fits a 1280 × 800 screen.
- Scale view: hero text becomes an overlay on the stage; panel fits beside it.
- Ad-rail threshold change (see Open questions) in `docs/features/ads.md` / ADR 0003 — docs only, no ad code.

**Out:** new controls or worlds, sim changes, premium features, share URLs, per-what-if landing pages
(those are reading screens and may scroll).

## Design

### Which screens may scroll

| Screen | Page scroll | Internal scroll allowed |
| --- | --- | --- |
| Lab `/lab/*` | **Never** | Timeline list; phone/tablet dock panel; variables column only below 800 px height |
| Scale `/` | **Never** | none |
| Future reading pages (about, what-if landing pages, premium, legal) | Yes | — |

Internal scroll regions get a soft fade mask at the cut edge so it's obvious more is there.

### Desktop console (≥ 1024 px wide)

```
┌ WHAT-IF LAB   [◎ Scale][◌ Galaxies][◎ Solar]…[◐ Character]                       ☀ ┐  nav 56 px
├───────────────┬──────────────────────────────────────────────┬──────────────────────┤
│ SOLAR SYSTEM ⓘ│                                              │ VARIABLES            │
│               │                                              │ Sun mass      1.00 × │
│ WHAT IF       │                STAGE (fills)                 │ ──────●────────      │
│ ⑂ The Sun …   │        no change  ┆  what if                  │ View  Inner planets ⌄│
│ ⑂ …           │                                              │ (grouped, compact)   │
│               ├──────────────────────────────────────────────┤                      │
│ RIGHT NOW     │ ▶ PAUSE  1MO 6MO 2YR 10YR  ↺ RESTART  ✕ CLOSE │                      │
│ dist  1.00 9.1│──────────────────────────┬───────────────────┤                      │
│ temp  15  −270│ CHART (metric tabs)       │ TIMELINE (scrolls)│                      │
│ info          │                           │                   │                      │
└───────────────┴──────────────────────────┴───────────────────┴──────────────────────┘
   ASK 280 px            center: stage / transport / 200 px results strip    TUNE 300 px
```

- **Left "Ask":** world title (Title voice) + ⓘ button that opens the intro/"About this model" as a
  popover; WHAT IF list; RIGHT NOW readouts; info blocks. This is the "question and answer" column.
- **Centre:** stage takes all remaining height (min 320 px); transport bar; results strip with chart
  (left) and timeline (right, the one scrolling list).
- **Right "Tune":** all variables, always open (no collapsed "Starting conditions"). Compact rows:
  label + value on one line (13 px), 28 px-tall slider under it, ~44 px per row incl. hit area;
  group headings as Micro labels. Footnote "Changing these restarts the world."
- Footer text moves into the ⓘ popover; the ember credit line sits under the wordmark in the nav
  (Micro). The vertical edge label is removed (no room, and the console already has an identity).
- Budget at 1280 × 800: nav 56 + stage ≥ 430 + transport 56 + strip 200 = 742 ✓. Child's Tune column:
  16 rows × 44 + 3 headings × 24 ≈ 776 → fits at ≥ 860 px height; between 800–860 the Tune column
  scrolls internally (only exception, with fade).

### Tablet (768–1023 px) and phone (< 768 px)

```
┌ WHAT-IF LAB            ☀ ┐
│ [world switcher, swipe]  │
├──────────────────────────┤
│                          │
│     STAGE (≈ 50–55 %)    │
│                          │
├──────────────────────────┤
│ ▶ PAUSE  6MO/S  ↺  ✕     │  transport
├──────────────────────────┤
│ ASK · TUNE · READ · LOG  │  dock tabs (segmented)
│ ───────────────────────  │
│ panel content (scrolls)  │  ← the only scrolling region
└──────────────────────────┘
```

- Same `100dvh`, no page scroll. A docked tool panel under the stage with four tabs:
  **Ask** (what-ifs) · **Tune** (variables) · **Read** (readouts + chart) · **Log** (timeline).
- Choosing a what-if keeps you on Ask and the stage splits above — cause and effect stay visible.
- Tablet landscape (≥ 1024 wide) uses the desktop console.

### Scale view

- Stage full height of the centre; "WHAT HAPPENS IF…" + description as a Display overlay on the stage
  top-left (fades out after the first zoom interaction, returns on idle); "In view" panel on the right
  (desktop) or as the dock (phone). Open-a-world and Jump-to chips stay in the panel.

### Design-system retirement (docs and skills)

| Old | New |
| --- | --- |
| `docs/design/apple-design-language.md` | `docs/design/design-system.md` — darkroom tokens, voices, shape, icons, layout (console + no-scroll rule), components, accessibility, voice. No Apple references. |
| ADR 0004 (accepted), ADR 0005 (accepted) | both → `superseded by 0006` |
| `.claude/skills/apple-ui-ux/` | `.claude/skills/darkroom-ui/` (checklist incl. "does it fit one screen?") |
| Change 0001 | status `dropped`, pointer to 0003 + 0004 |
| CLAUDE.md, PLAN.md (principle 3, Phase 1 title), docs/README, plan-change + add-sandbox skills | point at the new doc/skill |

Kept from the old doc because they're good practice, restated in our own words: 44 px hit targets,
one primary action per view, keyboard path + visible focus, reduced motion, base/alt not colour-only.

### Files touched

`app/globals.css` (shell grid, console, dock, compact controls, fade masks), `components/Lab.tsx`
(layout), `components/SidePanel.tsx` → split into `AskPanel.tsx` + `TunePanel.tsx`, new
`components/Dock.tsx`, `components/AboutPopover.tsx`, `ControlsForm.tsx` (compact), `ScalePanel.tsx`,
`HistoryChart.tsx` (fills its box instead of fixed 210 px), docs and skills listed above.

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. Docs/skills retirement (no code): new design doc, ADR 0006, skill rename, references, 0001 dropped.
2. Shell: `100dvh` grid, nav with world switcher + credit, no page scroll on `/` and `/lab/*`.
3. Desktop console: Ask / centre / Tune columns, results strip, compact controls, ⓘ popover.
4. Tablet/phone dock with Ask · Tune · Read · Log tabs.
5. Scale view overlay + panel/dock.
6. Verify every world at 1440×900, 1280×800, 1024×768, 768×1024, 375×812, 375×667; both themes.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Child world too tall for short desktops | Compact rows; Tune column scrolls only below ~860 px height, with fade |
| Stage too small on phones | Stage ≥ 50 % of height; dock tabs keep panels short; landscape phone shows stage only + floating transport |
| Ad rails (≥ 1280 px today) squeeze the console | Move rails to ≥ 1600 px (open question 1) |
| Long what-if labels (47 chars) wrap in 280 px | Two-line rows allowed in Ask; truncate never |
| `100dvh` quirks on iOS Safari toolbars | Use `dvh` with `vh` fallback; test 375×667 |

## Verification

- [x] Page never scrolls: `scrollHeight === innerHeight` and no horizontal overflow on `/` and all 7 worlds
      at 1440×900, 1280×800, 1024×768, 768×1024, 375×812, 375×667 (scripted sweep in the browser pane,
      with a what-if forked).
- [x] Desktop: what-if list, every transport button and every variable visible at once in all worlds at all
      three desktop sizes, except Child's Tune column at ≤ 800 px height (scrolls 18–69 px, as planned).
- [x] `npm run typecheck`, `npm test` (24/24) and production build green.
- [~] Visual checks: Child 1440×900 (light), Earth 1280×800 (dark, forked), Animals 1280×800 and 1024×768
      (dark, forked), Countries 375×812 (light, forked). Not screenshotted: every world at every size.
- [ ] Keyboard-only walkthrough and reduced motion — not checked.
- [x] Docs: no references to the Apple doc or `apple-ui-ux` skill outside superseded records.

## Open questions

1. **Ad rails:** move the threshold from ≥ 1280 px to **≥ 1600 px** so the console keeps its width (recommended), or keep 1280 and accept a narrower stage?
2. **Small screens:** the dock with Ask · Tune · Read · Log tabs (recommended), or a pull-up bottom sheet over the stage?
3. **Short desktops (< 860 px tall):** let only the Tune column scroll (recommended), or split variables into two narrow columns?

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — approved with the recommended answers: rails at ≥ 1600 px, dock with four tabs on small screens, only Tune scrolls on short desktops. Step 1 (docs) done.
- 2026-11-02 — shipped. Divergences from the plan, found while measuring:
  - Below 1440 px the RIGHT NOW readouts sit in Ask under the what-ifs (the centre is too narrow for a
    third results column); that part of Ask may scroll on short screens. The what-ifs never do.
  - 1024–1279 px: side columns 240 px and the transport wraps to two rows, so no button is ever clipped.
  - Transport Restart/Close are icon-only below 1440 px; on phones the speed control scrolls sideways.
  - The scale view's hero overlay hides on first interaction and does not come back (no idle timer).
  - Scale panel dropped its intro block (the hero says it); "Screen width" readout moved to the bottom.
  - The vertical edge label from 0003 is gone; the credit line sits under the wordmark at ≥ 1280 px.
