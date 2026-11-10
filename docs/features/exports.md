# Export studio: video, pictures, text and slides, styled your way

- **Status:** live — Quick export for everyone (change 0031), the studio for Premium
- **Tier:** both: free visitors (and every visitor while accounts are off) get **Quick export**, one landscape video in
  the default look; Premium opens the full studio
- **Owner area:** `lib/export/` (style, replay, scrubber, frames, text; framework-free),
  `components/console/export/` (studio, preview, controls, fonts, MediaRecorder, fflate, jsPDF, saved styles),
  `components/console/Transport.tsx`, `lib/sim/engine.ts` (`origin`)
- **Changes:** [0034](../changes/0034-export-studio-second-pass.md) (pieces, text, sound, intros), [0031](../changes/0031-free-quick-export.md) (free quick export), [0020](../changes/0020-accounts-premium-exports.md) (first exports),
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
  every world because it lives in the shared Transport, to every visitor (change 0031).
- **Quick export (free, change 0031):** a sheet with the live preview (play, scrub) and one button, *Download video*:
  1920 × 1080, the default Control Room style (`quickStyle()` = `defaultStyle("youtube")`), changed world only,
  pick-for-me length, the default text layers (brand, what-if, numbers, result). Nothing can be edited. Same render path,
  progress, cancel, *Download again* and errors as the studio. When Premium is on sale, one quiet line links to it.
  Everything below describes the Premium studio.
- **Layout:** a large sheet over the console. ≥ 1024 px: the preview on the left, settings on the right in six
  tabs (Output · Text · Intro · Sound · Look · Timing; the row scrolls sideways when it doesn't fit); only the settings
  column scrolls. Below 1024 px: preview on top (about
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
  **On the video** (video and pictures; change 0034): every piece can be ticked off. Picture: the world itself, the
  world name tag, the clock, the stage frame, the line between two worlds (when both show), the chart, the shade behind
  the opening and result. Text: every text layer. Presets: *Everything*, *Stage only* (the old *Clean video*: no text),
  *Text only* (no stage, words on the plain background).
- **Text tab:** ten layers (Narration added in change 0034), each can be shown or hidden: Brand, World and seed, What-if line, Key numbers,
  Opening title, Result card and three of your own. Per layer: words (with insertable `{whatif}` `{world}`
  `{metric}` `{result}` `{from}` `{to}` `{seed}`), place (3×3 snap grid, nudge buttons, or drag), size, width,
  most lines, font (the style's title or body face, or any face; faces that lack the page language's letters say so and
  fall back glyph by glyph to the site's own Noto faces and the device's CJK fonts), weight, italic, letter spacing, line
  height, outline, shadow, line-up, capitals, colour (a theme colour or any colour), what's
  behind it (nothing, a shade, solid) and when it shows (always, opening, running, end). A hint appears when
  the colour is hard to read on what's behind. Also: world labels on the stage, and the shade behind the
  opening and result.
- **Look tab:** themes (Control Room — the default, Paper, Classroom, Neon, Black and white, Pastel) or every
  one of twelve colours by hand (background, text, quiet text, no-change world, what-if world, better, worse,
  chart lines, stage background, text on the stage, stage frame, stage labels). The world colours also reach
  inside the picture: worlds draw with the shared stage palette, which is swapped only while an export frame is
  drawn. Fonts for titles and body: Barlow, Barlow Condensed, JetBrains Mono (the site's own), Playfair
  Display, Nunito, Roboto Slab, Caveat, Anton, and since change 0034 Montserrat, Bebas Neue, Space Grotesk, Lora,
  Permanent Marker, Press Start 2P (self-hosted, with Latin-ext, Vietnamese and Cyrillic where the face has them, loaded
  only when the studio opens). Worlds: changed only
  (default), both · fit (side by side in wide frames, stacked in tall ones), side by side, stacked, no change only. Stage: framed, full frame, small. Chart under the stage.
  Picture: brightness, contrast, colour strength, shift colours (where the browser supports canvas filters),
  warm or cool and dark edges (everywhere).
- **Narration (change 0034):** lines written from the run (the question, the moments only one world had, the result),
  timed exactly like the subtitles. Shown as a captions layer (off by default) while the run plays; each line can be
  rewritten in the Text tab (empty = back to the written line). The same lines go into the `.srt`. Edits live in the
  studio only, not in a saved style.
- **Intro tab (change 0034):** six intro scenes played over the opening hold instead of the plain opening title:
  *Question* (types on word by word), *Countdown* (3 · 2 · 1), *Guess first* (time to predict, for classrooms),
  *Cinematic* (black bars, world name, title), *Zoom in* (the stage grows to fill its place), *Before and after* (the
  no-change world, then a wipe to the changed one). Each has a big line and a small line (`{tokens}` allowed), an accent
  colour and a length (0–6 s, the opening hold; picking one gives it 3 s if shorter); fonts follow the Look tab.
  Picking one plays the preview from the start. **My intros:** save an intro (template, words, colour, length) under a
  name in this browser, load or delete it, copy it as text and paste it elsewhere. Intros only choose what is drawn
  during the hold (the fork, step 0); the run is identical with any intro.
- **Sound tab (change 0034):** *Your voice*: Record plays the preview from the start while the microphone records; it
  stops by itself at the end; volume and start time, record again or remove. *Audio file*: an MP3/WAV/M4A from the
  device (voice-over or music) with volume, start time (negative skips into the file), fade in/out and lowering it
  while the voice speaks. A wave strip shows where each sits in the clip. Sound plays along with the preview and is mixed
  into the video with Web Audio on the recording's clock (MP4 with AAC or WebM with Opus); if the browser can't record
  sound with video, the file records silent and the done line says so. Sound is never saved, uploaded or put in a
  style. No built-in computer voice: the browser's speech can't be recorded into a file, and a neural voice would be
  AI; narration lines and the `.srt` cover that need.
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

Built-in computer voice, a music library, outro templates, GIF, transitions between scenes, posting to platforms, recolouring world art that doesn't use the
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
- [x] Change 0034 tests: v1 → v2 styles, round trip of pieces / intros / typography, quick style unchanged, font
      coverage, narration = subtitle timing with edits; every world × every intro template, all pieces off and a styled
      narration draw without changing the run.
- [x] Browser (Chrome, dev on the Premium preview flag, earth, 1280 wide): pieces checklist, Countdown and Before and
      after intros, narration captions, a 3 s WAV in a 12 s MP4 (audio track decoded: 2.99 s at the set level), studio
      at 375×812.
- [ ] Voice take with a real microphone; Safari/Firefox sound; Japanese/Arabic text in a downloaded file.
