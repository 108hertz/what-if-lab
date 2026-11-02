# Scale explorer (home)

- **Status:** live
- **Tier:** free
- **Owner area:** `lib/scale`, `components/ScalePanel.tsx`, `components/ScaleTransport.tsx`, `app/page.tsx`
- **Changes:** —

## What it is

The home screen: a continuous zoom from a proton to the observable universe. Objects that have a
sandbox glow and open that world (optionally with a preset, e.g. `country:japan`).

## Why

The "wow" first impression and the hub that routes visitors into worlds. Drives time-on-site and shares.

## Behaviour

- Slider, wheel and pinch zoom; each slider step = ×10.
- Side panel shows the object in view, a one-line fact, and "Open this sandbox" when linked.
- Lists of worlds and jump-to targets.
- Objects are defined in `lib/scale/objects.ts` (`sandbox: "<key>"` or `"<key>:<preset>"`).

## Out of scope

Real astronomical imagery; everything is drawn procedurally.

## Acceptance checks

- [x] Zoom works by slider, wheel and pinch.
- [x] Every `sandbox` link resolves to a registered sandbox.
