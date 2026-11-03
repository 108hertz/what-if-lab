# 0013 — Full-screen stage in every world

- **Status:** shipped
- **Phase:** 1 (see [PLAN.md](../PLAN.md))
- **Features:** [Full-screen stage](../features/full-screen.md)
- **Decisions:** — (no ADR: no vendor, data format or hosting choice; ads simply aren't shown while full screen, see Risks)
- **Created:** 2026-11-03 · **Shipped:** 2026-11-03

## Why

The stage is the product. Ask, Tune, the chart and the timeline are useful, but sometimes people just want to
watch: a galaxy merger, the solar system after a rogue star or the animal populations. A projector, a
classroom or a screen recording needs the same thing. Full screen also helps traffic (screen recordings
and clips are shared) and fits the "experience" goal in PLAN.md.

## Scope

**In:**
- A **Full screen** toggle in every world (all 7 through `StandardConsole`) and on the scale page (`/`).
- Full screen shows **only the main UI**: the `.centre` block (stage + transport). Nav, Ask/Tune columns,
  results (chart, readouts, timeline), dock and ad slots are hidden.
- The transport stays so Play/Pause, speed, Restart and Close what-if still work. In the scale explorer the
  zoom row stays.
- Keyboard: `F` toggles (not while typing in an input), `Esc` leaves (the browser does this by itself).
- Works on browsers without the Fullscreen API for elements (iPhone Safari) through a CSS fallback that
  fills the viewport.

**Out:**
- Asking a what-if while in full screen (that needs the Ask column; leave full screen to ask). A later
  per-world change can add a small overlay if users want it.
- A full-screen chart or timeline.
- Changing what the sim draws; the canvas is already sized from its box with `fitCanvas`, so it just gets
  bigger.
- The Phase 1 keyboard-shortcuts item (Space, F fork). Note: this change uses **`F` for full screen**;
  PLAN.md's "F fork" idea will need a different key. I'll update that PLAN.md line.

## Design

Follows DESIGN.md → Console layout, Controls, Icons; `darkroom-ui` checklist.

**New shared pieces (`components/console/`, no world imports):**
- `useFullscreen(ref)` hook in `components/console/fullscreen.ts`: returns `{ on, toggle }`.
  - If `ref.current.requestFullscreen` exists → use the Fullscreen API; `on` follows `fullscreenchange`.
  - Otherwise (iPhone) → toggle a `full` class on the element (CSS `position: fixed; inset: 0; z-index`)
    and listen for `Esc` itself.
  - Global `keydown` for `F` (ignored with modifiers or when focus is in `input/textarea/select/[contenteditable]`).
- `FullscreenButton`: a 44 px square ghost `.btn` at the **right end of the transport** (label "Full
  screen" / "Leave full screen", title adds "(F)"). *Built:* first placed on the stage's top-right corner, but
  every world draws its time chip there, so it moved into the transport row (`Transport` and
  `ScaleTransport` take an optional `fullscreen` prop).
- *Built:* some embedded webviews (e.g. the Claude in-app browser) never settle `requestFullscreen()`; if the
  element isn't full screen after 900 ms the hook uses the CSS fallback instead.
- *Built:* in full screen the default transport hint reads "Leave full screen to ask a what-if." (worlds with
  their own hint keep it). The results band is not rendered while full screen.
- Key filter lives in `components/console/fullscreenKey.ts` (pure, unit-tested).
- Two new glyphs in `components/ui/Icon.tsx`: `expand` (four outward corners) and `shrink` (four inward
  corners), 24 grid, 1.5 stroke.

**Wiring:**
- `StandardConsole`: `ref` on `<section className="centre">`, renders `FullscreenButton` inside it. All 7
  worlds get it with no change to their own `Console.tsx`. A world that later writes its own console copies
  the same two lines.
- `Stage`: unchanged API; the button sits as a sibling overlay inside `.centre`, positioned over the stage.
- `ScaleConsole`: same ref + button on its `.centre`.

**CSS (`app/globals.css`), tokens only:**
- `.centre:fullscreen, .centre.full` → `width: 100vw; height: 100dvh; border-radius: 0; border: 0;`
  stage grows (`flex: 1 1 auto`), transport stays at the foot with safe-area padding.
- `.centre.full` (fallback) → `position: fixed; inset: 0; z-index: 50`, and `body` gets `overflow: hidden`
  meanwhile (no page scroll).
- In full screen the transport hint is shown at every width (there's room), the `.edge` seed label stays.

**States:** normal → (button / `F`) → full screen → (button / `F` / `Esc` / browser exit) → normal. The
simulation keeps running through the switch; nothing is re-initialised (same engine, same canvas element).

## Steps

1. `expand` / `shrink` glyphs; `useFullscreen` hook + `FullscreenButton`; CSS. Green.
2. Wire into `StandardConsole` (all 7 worlds) and `ScaleConsole`. Add a test in `tests/` that the toggle's
   key filter ignores inputs and modifier keys (pure function, no DOM framework needed). Green.
3. Browser check every world + `/` at the review-checklist viewports, both themes; feature doc → live,
   PLAN.md line updated.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| No ads while in full screen (rails/box/banner hidden) | It's an opt-in viewing mode, ads come back on exit; ADR 0007 forbids ads near the stage anyway. Revisit if analytics show long full-screen sessions. |
| iPhone Safari has no element Fullscreen API | CSS fallback fills the viewport; the browser chrome stays, which is fine. |
| `F` collides with typing or later shortcuts | Ignored in form fields and with modifiers; PLAN.md's "F fork" note updated. |
| Canvas stays at the old size after the switch | `useCanvasLoop`/`fitCanvas` already re-measures each frame; verify on resize. |
| Stage pointer handlers (solar drag-to-throw, scale pinch) under the button | Button is 44 px in a corner; it stops pointer propagation so a click there doesn't hit the stage. |

## Verification

- [x] Automated: key-filter test; `npm run typecheck && npm test && npm run build` green; structure test
      still sees every world's ad slots.
- [x] Manual (partly): each of the 7 worlds and `/` — enter by button and by `F`, leave by button, `F` and `Esc`;
      sim keeps running; transport works; solar drag-to-throw and scale zoom/pinch still work full screen.
- [ ] Viewports (partly): 375×667, 768×1024, 1280×800, 1600×900; light + dark; reduced motion; no page scroll after exit.
- [x] Docs: feature doc live, PLAN.md updated.

## Log

- 2026-11-03 — proposed.
- 2026-11-03 — approved and built. Button moved from the stage corner into the transport (stage corners hold
  the label and time chips); timeout fallback added for webviews that never answer the request. Checked in the
  in-app browser (CSS fallback path): galaxy 1024×768, solar 375×667 with a what-if open, `/` at 1280×800,
  earth in light theme; button, `F`, `Esc`; no page scroll before or after. **Not checked:** the native
  Fullscreen API in a real browser, the other worlds one by one (they share `StandardConsole`), 768 and 1600
  widths, reduced motion, solar drag-to-throw while full screen.
