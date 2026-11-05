# Exports: phone video, YouTube video, slides

- **Status:** live (Premium)
- **Tier:** premium (free visitors see the sheet and a live preview, with *Unlock with Premium*)
- **Owner area:** `lib/export/` (replay, frames, slides; framework-free), `components/console/export/` (sheet,
  MediaRecorder, jsPDF), `components/console/Transport.tsx`, `lib/sim/engine.ts` (`origin`)
- **Changes:** [0020](../changes/0020-accounts-premium-exports.md)
- **Decision:** [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md)

## What it is

A download button on every world's transport. It turns the current fork into a short video for phones
(1080×1920), a YouTube-shaped video (1920×1080) or a PDF slide deck, made on the visitor's own device.

## Why

Shareable clips of "what if…" moments bring people back to the lab (traffic) and give Premium a reason to
exist (revenue). Teachers get slides for class.

## Behaviour

- **Entry:** the download glyph on the transport, before full screen (label "Export" from 1440 px). Shown in
  every world because it lives in the shared Transport. Hidden in production builds without accounts.
- **Sheet:** format tabs (Phone · YouTube · Slides), a live preview of the first frame drawn by the same code
  that renders the file, a spec line (size · MP4/WebM · 30 fps · seed), and one sentence saying what's inside.
  One filled button: *Export video* / *Export slides* for Premium, *Unlock with Premium* otherwise.
- **Deterministic:** the recipe is fixed when the sheet opens. The fork re-runs from its recorded start
  (`engine.origin`: the world just before the first change, then each change at its time) with a fixed step,
  so the same world, seed, settings and what-if give the same frames anywhere. Without a what-if the export
  shows the world as it is, from now. If a world edited its changes after the fork (child's undo), it starts
  from now and says so. The live simulation is never touched; the stage pauses while the file renders.
- **Length:** the running part covers from the fork to now (at least 6 s at the current speed), shown in
  6–20 s; plus a 1.2 s title hold and a 2.5 s summary hold.
- **Video:** each sandbox's `draw()` paints its world at the export size (×2 logical scale); split worlds sit
  side by side (YouTube) or one above the other (phone); stacking worlds show the changed world. Captions: the
  what-if, the key metric (the one whose two worlds end furthest apart) for both worlds, the credit line;
  a title card at the start and the result at the end. Recorded with `canvas.captureStream()` +
  `MediaRecorder` in real time (MP4 where the browser offers it, else WebM), 10 Mbit/s.
- **Slides (PDF, 16:9):** title · setup (intro + every variable) · the what-if (or the list of changes) · 3–4 key
  moments (what-if-only and no-change-only events first, else evenly spaced) with the stage and the chart up to
  that moment · what changed (every metric for both worlds + full chart). Rendered as images with jsPDF (lazy-loaded).
- **Progress and cancel:** a hairline progress bar and status line ("Recording · 4 s of 14 s"); *Cancel*
  stops and discards. Esc and outside clicks are disabled while working.
- **Done:** the browser downloads `what-if-lab-<world>-<what-if>-<phone|youtube|slides>.<mp4|webm|pdf>`;
  *Download again* is offered until the sheet closes.
- **Errors:** no recording support → message, with slides still available; any failure → message + *Try again*.
- **Mobile:** the sheet docks to the bottom; phone video is the default format below 768 px.
- **Reduced motion:** sheet opens without animation; the export itself is a file, not on-screen motion.

## Out of scope

Audio, GIF, PNG zip, picking the clip range by hand, uploading or sharing to platforms directly.

## Acceptance checks

- [x] `tests/export.test.ts`: origin recorded and cleared, replay identical twice for every world, live sim
      untouched, every world's frames and slides draw.
- [x] Browser (Chrome, dev, Simulate Premium): earth YouTube and phone MP4s play back at 1920×1080 / 1080×1920;
      8-slide PDF produced.
- [ ] Safari and Firefox recording.
