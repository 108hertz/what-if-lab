# Export studio: video, pictures, text and slides, styled your way

- **Status:** live (Premium)
- **Tier:** premium (free visitors can open the studio and try every setting on the live preview; downloading
  and copying say *Unlock with Premium*)
- **Owner area:** `lib/export/` (style, replay, scrubber, frames, text; framework-free),
  `components/console/export/` (studio, preview, controls, fonts, MediaRecorder, fflate, jsPDF, saved styles),
  `components/console/Transport.tsx`, `lib/sim/engine.ts` (`origin`)
- **Changes:** [0020](../changes/0020-accounts-premium-exports.md) (first exports),
  [0022](../changes/0022-export-studio.md) (the studio), [0024](../changes/0024-one-world-tick-changes-reset.md) (side by side only here)
- **Decision:** [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md)

## What it is

A download button on every world's transport opens the **export studio**. It turns the current fork into a
video, a set of pictures, the words of the run as files, or a PDF slide deck, all made on the visitor's own
device. Where the text sits, its wording, fonts and colours, the colours of the picture and of the two worlds,
and how long the clip runs are all up to the visitor.

## Why

Shareable clips of "what if…" moments bring people back to the lab (traffic) and give Premium a reason to
exist (revenue). Creators get raw pieces in their own style; teachers get pictures, text and slides for class.

## Behaviour

- **Entry:** the download glyph on the transport, before full screen (label "Export" from 1440 px). Shown in
  every world because it lives in the shared Transport. Hidden in production builds without accounts.
- **Layout:** a large sheet over the console. ≥ 1024 px: the preview on the left, settings on the right in four
  tabs (Output · Text · Look · Timing); only the settings column scrolls. Below 1024 px: preview on top (about
  40 % of the height), tabs under it. Footer: spec line, one sentence on what's inside, *My styles*, and one
  filled button that follows the chosen output.
- **Preview:** any frame of the clip, drawn by the same code that renders the file, with play/pause and a
  scrubber. Text layers can be dragged on it; with a layer picked, arrow keys nudge it (Shift = bigger steps).
  Picking a layer that only shows at the start or the end jumps the preview there.
- **Output tab:** *Video* (MP4 where the browser offers it, else WebM; 30 fps; 10 Mbit/s), *Pictures* (PNG zip),
  *Text* (zip of three files) or *Slides* (PDF). Sizes for video and pictures: Phone 1080×1920, YouTube
  1920×1080, Square 1080×1080, Portrait 1080×1350. *Clean video* leaves out all text (stage only).
  **Worlds** (video, pictures, slides; change 0024): *Changed only* (default) or *No change | with changes* —
  the no-change world on one side and the changed world on the other (side by side in wide frames, one above the
  other in tall ones; the Look tab picks it exactly). The live stage never splits, so this is the only place the
  two worlds appear next to each other. Both are drawn with the world's own `draw()` from the same deterministic
  replay, so the layout never changes the run. Slides follow the same choice.
  With *Text* chosen, the three files show here, each with *Copy* and *Download*.
- **Text tab:** nine layers, each can be shown or hidden: Brand, World and seed, What-if line, Key numbers,
  Opening title, Result card and three of your own. Per layer: words (with insertable `{whatif}` `{world}`
  `{metric}` `{result}` `{from}` `{to}` `{seed}`), place (3×3 snap grid, nudge buttons, or drag), size, width,
  most lines, title or body font, weight, line-up, capitals, colour (a theme colour or any colour), what's
  behind it (nothing, a shade, solid) and when it shows (always, opening, running, end). A hint appears when
  the colour is hard to read on what's behind. Also: world labels on the stage, and the shade behind the
  opening and result.
- **Look tab:** themes (Control Room — the default, Paper, Classroom, Neon, Black and white, Pastel) or every
  one of twelve colours by hand (background, text, quiet text, no-change world, what-if world, better, worse,
  chart lines, stage background, text on the stage, stage frame, stage labels). The world colours also reach
  inside the picture: worlds draw with the shared stage palette, which is swapped only while an export frame is
  drawn. Fonts for titles and body: Barlow, Barlow Condensed, JetBrains Mono (the site's own), Playfair
  Display, Nunito, Roboto Slab, Caveat, Anton (self-hosted, loaded only when the studio opens). Worlds: changed only
  (default), both · fit (side by side in wide frames, stacked in tall ones), side by side, stacked, no change only. Stage: framed, full frame, small. Chart under the stage.
  Picture: brightness, contrast, colour strength, shift colours (where the browser supports canvas filters),
  warm or cool and dark edges (everywhere).
- **Timing tab:** which part of the fork (start and end on a bar from the fork to three times past now, with
  "now" and the moments only one world had marked), running time 3–60 s or *pick for me* (6–20 s, as before),
  opening title 0–5 s, result 0–8 s, and *slow down where the worlds differ* (those moments play at about half
  speed). The whole clip's length shows underneath.
- **My styles:** save the current style under a name (kept in this browser), load or delete saved ones, copy a
  style as text and paste it on another device, or reset to the default. The last style used comes back next time.
- **Deterministic:** the recipe is captured when the studio opens; timing changes re-time that same capture.
  The fork re-runs from its recorded start (`engine.origin`) with a fixed step (two sim steps per video frame),
  so the same world, seed, settings, what-if and timing give the same frames anywhere. Styles never reach the
  simulation; holds and slow-down only change which step each frame shows. Trimming the start runs the hidden
  part first. Without a what-if the export shows the world as it is, from now. If a world edited its changes
  after the fork (child's undo), it starts from now and says so. The live simulation is never touched; the
  stage pauses while a file renders.
- **Pictures:** title, 3–4 key moments, result, the chart alone and the stage alone, at the chosen size, as
  `01-title.png`…`07-stage.png` in one zip (fflate, lazy-loaded, stored without recompression).
- **Text:** subtitles (`.srt`) timed frame for frame to the video (title, the moments, the result); a caption to
  post (the question, the result in one line, the seed, hashtags); the whole story as Markdown (setup table,
  changes, what happened, every number for both worlds).
- **Slides (PDF, 16:9):** title · setup · the what-if · 3–4 key moments · what changed, drawn with the style's
  colours and fonts. jsPDF, lazy-loaded.
- **Progress and cancel:** a hairline progress bar and status line ("Recording · 4 s of 14 s"); *Cancel*
  stops and discards. Esc, outside clicks and the settings are disabled while working.
- **Done:** the browser downloads `what-if-lab-<world>-<what-if>-<size|size-clean|size-pictures|text|slides>.<ext>`;
  *Download again* is offered until the output changes or the studio closes.
- **Errors:** no recording support → message, with pictures, text and slides still available; any failure →
  message + *Try again*.
- **Reduced motion:** the sheet opens without animation; the preview only plays when asked.

## Out of scope

Audio, GIF, transitions between scenes, posting to platforms, recolouring world art that doesn't use the
shared stage palette, uploaded fonts, custom aspect ratios, styles shared by link (would need a backend).

## Acceptance checks

- [x] `tests/export.test.ts`: origin recorded and cleared, replay identical twice for every world, live sim
      untouched, every world × every size × default/themed/clean styles draws frames, stills and slides.
- [x] `tests/export-style.test.ts`: defaults inside the frame, parse/clamp round trip, size switch, theme
      contrast ≥ 4.5:1, stage palette and fonts restored (even on errors), timing never changes results,
      trim/length/holds, slow-down map, scrubber = straight run, subtitles ordered and in range.
- [x] Browser (Chrome, dev, Simulate Premium, earth): 1080×1920 MP4 of 4.5 s with a 3 s run, 0.5 s title, 1 s
      result and slow-down; 7-picture zip at 1920×1080; text zip with .srt, .txt, .md. Theme, fonts, grade and a
      dragged text layer show in the files. Layout at 1440×900, 1024×768 (day shift) and 375×812.
- [ ] Safari and Firefox recording and canvas-filter fallback.
