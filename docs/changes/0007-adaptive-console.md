# 0007 — Adaptive console: navigation and layout per screen

- **Status:** shipped
- **Phase:** 1
- **Features:** [fork and compare](../features/fork-and-compare.md), [scale explorer](../features/scale-explorer.md)
- **Decisions:** none (layout only; DESIGN.md → Layout is updated in the same commit)
- **Created:** 2026-11-02 · **Shipped:** 2026-11-02

## Why

The console was designed at 1280 × 800 and 375 × 812 and scaled to everything in between. Checked in
the browser pane on 2026-11-02, every world and the scale view at 375 × 812, 812 × 375, 768 × 1024,
1024 × 768, 1280 × 800:

1. **Phone landscape (812 × 375) is broken.** The stage takes ~160 px, the transport (Play, speed) is
   pushed off screen and the dock panel shows half a title. The scale hero covers the whole stage.
2. **World navigation on phones is a sideways strip of 8 unlabeled glyphs.** Only ~3 fit; the active
   name is clipped ("SOLAR S"), the rest are off screen with no cue. A cold visitor cannot tell what the
   glyphs are or that there are more.
3. **1024–1279 px (tablet landscape, small laptops) is too dense.** Three 240 px columns leave the
   stage ~480 px wide, the transport wraps to two rows, and the timeline column is ~120 px of text.
4. **Phone transport clips silently.** The speed segment is cut mid-label next to Restart, with no fade.
5. **Notch safe area** is honoured on the sides and bottom but not the top (`viewport-fit=cover` is on).

The goal (PRODUCT.md principle 2) is the shortest path from arriving to seeing two worlds diverge, on
the phone most visitors arrive on.

## Scope

**In:**
- Navigation: a world menu on narrow screens; labels shown earlier where there is room.
- Layout bands: phone portrait, phone landscape / short screens, tablet portrait, 1024–1279, ≥ 1280.
- Transport fit on phones; safe-area top; scale hero on short screens.
- DESIGN.md → Layout / Navigation updated to describe the bands.

**Out:** sim changes, per-world canvas drawing (the per-world pass is separate), new tools, embed
pages, ads, Premium.

## Design

### Navigation (world switcher)

| Width | Behaviour |
| --- | --- |
| < 768 | Wordmark · **world button** (active glyph + name + chevron) · theme. The button opens a popover sheet listing all 8 worlds as rows: glyph, name, subtitle (Small / Micro). Esc / outside tap closes; arrow keys move; current world marked with the dashed underline. No sideways scrolling strip. |
| 768–1279 | Glyph strip as today (all 8 fit), active name shown; others glyph-only with `title`. |
| ≥ 1280 | Names on every tab (today: ≥ 1440). Subtitles stay ≥ 1600. |

The menu is the same `MODES` list and `Tabs` component; no new IA. Popover follows DESIGN.md
(walnut raised, 1 px cork, 12 px radius, no shadow). New file `components/WorldMenu.tsx`.

### Layout bands

```
Phone portrait (< 768, tall)        Phone landscape / short (< 1024 wide, ≤ 520 tall)
┌ nav ───────────────────┐          ┌ nav ───────────────────────────────────────┐
│ STAGE  ~52%            │          │ STAGE + transport (60%)  │ DOCK tabs (40%)  │
│ transport              │          │                           │ panel (scrolls)  │
│ dock tabs              │          └───────────────────────────┴──────────────────┘
│ dock panel (scrolls)   │
└────────────────────────┘

1024–1279 (tablet landscape, small laptop)
┌ nav ─────────────────────────────────────────────────────────┐
│ centre: STAGE · transport (1 row) · chart | timeline │ DOCK 300 │
│                                                      │ Ask·Tune·Read │
└──────────────────────────────────────────────────────┴──────────┘

≥ 1280: three columns as today (Ask 280 · centre · Tune 300).
```

- **Phone landscape / short:** `@media (max-width: 1023px) and (max-height: 520px)` → the console
  becomes two columns: centre (stage + transport) and the dock beside it. Transport always visible.
- **1024–1279:** two columns instead of three. The right column is a dock with **Ask · Tune · Read**
  (Read = readouts + info); the chart and timeline stay under the stage. This is a deliberate change to
  DESIGN.md's "tools never hide" at this band: one tab click away, in exchange for a stage ~200 px wider
  and a one-row transport. Ask is the default tab.
- **Phone portrait:** unchanged structure. The speed segment gets the 20 px fade mask on its cut edge
  (DESIGN.md already names it as a sideways-scrolling region) and Restart sits outside it.
- **Tablet portrait (768–1023, tall):** unchanged (dock under the stage); verified only.
- **Safe area:** nav gets `padding-top: env(safe-area-inset-top)`.
- **Scale view, short screens:** the hero hides its description at ≤ 520 px tall and drops to
  Heading size, as it does on phones today.

### Files

`components/Lab.tsx` (band logic via `useMedia`, dock tab sets), `components/Tabs.tsx`,
new `components/WorldMenu.tsx`, `components/Transport.tsx` (Restart outside the scroll), `app/globals.css`,
`DESIGN.md` (Layout + Navigation), `docs/features/fork-and-compare.md`.

## Steps

1. World menu on < 768; names at ≥ 1280; safe-area top.
2. Short-landscape two-column band; scale hero on short screens.
3. 1024–1279 two-column band with the Ask · Tune · Read dock.
4. Phone transport fade + Restart placement.
5. DESIGN.md + feature doc; full viewport sweep.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| 1024–1279 hides Tune/Ask behind tabs | Ask is default; what-ifs one tap away; ≥ 1280 keeps everything visible. Easy to revert per band. |
| Menu adds a tap on phones | The strip already needed a sideways swipe plus guessing glyphs; the menu shows names. |
| Re-mounting the dock when the band changes resets the selected tab | Key the dock per band, not per resize; acceptable on rotation. |

## Verification

- [x] `npm run typecheck && npm test && npm run build` green.
- [x] No page scroll (`scrollHeight === innerHeight`) at 375×667, 375×812, 812×375, 667×375, 768×1024,
      1024×768, 1280×800, 1440×900, every world and `/`.
- [x] Transport (Play) visible at every size above.
- [ ] World menu: tap, keyboard (arrows, Esc → focus back), focus ring checked; screen reader not tested.
- [x] Both themes.

## Log

- 2026-11-02 — proposed.
- 2026-11-02 — approved and built. Also fixed in passing: the empty-timeline message sat in the 64px
  time column; it now spans the row. The menu popover anchors to the nav (not the button) so it never
  runs off the right edge. Verified in the browser pane (Chromium, emulated viewports); no physical
  device or Safari test.
