# Full-screen stage

- **Status:** live
- **Tier:** free
- **Owner area:** `components`
- **Changes:** [0013](../changes/0013-full-screen-stage.md)

## What it is

A Full screen button at the end of the play controls, in every world and on the scale page. It fills the screen
with only the main UI, the live simulation and its play controls, and hides everything else.

## Why

Experience and traffic ([PLAN.md](../PLAN.md)): watching, presenting, and recording clips that people share.

## Behaviour

- The expand button at the right end of the transport, or `F` (not while typing or with Ctrl/Cmd/Alt), enters full screen. Button, `F` or `Esc` leaves.
- Shown: stage + transport (Play/Pause, speed, Restart, Close what-if; zoom row on `/`).
- Hidden: nav, Ask/Tune columns, chart, readouts, timeline, dock, ad slots.
- The simulation keeps running; nothing restarts.
- The default hint becomes "Leave full screen to ask a what-if."
- Uses the browser Fullscreen API; where an element can't go full screen (iPhone Safari) the stage fills the
  viewport instead. The same happens if the browser doesn't answer the request within 900 ms (embedded webviews).

## Out of scope

Asking a what-if while full screen; a full-screen chart or timeline.

## Acceptance checks

- [ ] Every world and `/`: enter/leave by button, `F`, `Esc`; sim keeps running; transport works.
- [x] Phone (375×667) uses the fallback and leaves no page scroll after exit.
