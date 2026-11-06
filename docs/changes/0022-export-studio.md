# 0022 — Export studio: video, text and images you can style

- **Status:** shipped
- **Phase:** 3 (see [PLAN.md](../PLAN.md))
- **Features:** [exports](../features/exports.md)
- **Decisions:** none new (stays inside [ADR 0001](../decisions/0001-static-site-no-backend.md) and
  [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md): everything renders on the visitor's device)
- **Created:** 2026-11-06 · **Shipped:** 2026-11-06

## Why

Change 0020 ships one fixed look: Darkroom captions in fixed places, a 6–20 s run picked for you, a video or a
PDF and nothing else. Creators who post clips (TikTok, Reels, Shorts, YouTube) and teachers who build their own
material want the raw pieces and their own style: where the text sits, which font, which colours, how long it
runs, and the parts separately (the video, the words, the pictures). A real editor makes Premium worth $15 a
year and makes every shared clip look like the creator's, not a template — more reasons to share, more traffic.

## Scope

**In**

- **Three kinds of output from one export:**
  - **Video** — MP4/WebM as today, plus a *clean* option (stage only, no text burned in) for people who add
    their own text in an editor.
  - **Text** — the words of the run as files: captions as `.srt` (timed to the video), a post-ready caption
    (`.txt`: the what-if, the result in one sentence, the key numbers, `#whatiflab`), and the full story
    (`.md`: setup, changes, timeline events, every metric for both worlds). Each also has a *Copy* button.
  - **Images** — PNG stills at full size: title card, 3–4 key moments, the result card, the chart alone, and
    the stage alone (no text). Downloaded as one `.zip`, or one by one.
  - Slides PDF stays, drawn with the same style.
- **More sizes:** Phone 9:16, YouTube 16:9, **Square 1:1** (1080×1080) and **Portrait 4:5** (1080×1350).
- **Text layers you can edit and place:** brand line, title (the what-if), key metric + both values, result
  sentence, time chip, world labels, and up to 3 free text boxes. Per layer: show/hide, wording (title,
  result and free boxes), position (drag on the preview, or a 3×3 anchor grid + nudge), size, colour,
  weight, alignment, and a background box (none / scrim / solid) for readability. Layers can be shown for the
  whole clip, intro only, run only, or outro only.
- **Fonts:** 8 fonts, self-hosted at build time by `next/font` (no runtime request, like Inter today) and
  loaded only when the studio opens: Inter (site), a mono, a serif, a rounded, a condensed, a slab, a
  handwritten and a bold display face. One font for titles, one for body.
- **Colours ("components"):** background, text, secondary text, no-change colour, what-if colour, good / bad,
  chart grid, stage frame + seam, chips. Six ready-made themes (Darkroom — the default, Paper light, Neon,
  Mono, Classroom, Pastel) and *Custom* with a colour picker and hex field for each.
- **Video colours:** a colour grade on the stage itself — brightness, contrast, saturation, warmth, hue, and
  vignette — plus the world's own two colours: worlds that draw with the shared stage palette (`STAGE`, used
  by every world today) pick up the chosen no-change / what-if / ink colours inside the picture too.
- **How long:** run length 3–60 s (default: today's automatic pick), start and end of the run inside the
  fork (trim, on a small range bar with the timeline's events marked), intro hold 0–5 s, outro hold 0–8 s,
  and an ease option (slow down where the worlds split, from the timeline events). The sheet shows the total.
- **Layout:** stage split side-by-side / stacked / what-if only / no-change only; stage size (fill, framed,
  small with big text); chart strip on or off in the video.
- **Preview you can scrub:** the preview draws any frame of the clip (a scrubber under it), with the same
  code that renders the file, so what you see is what you get.
- **My styles:** save the current style under a name; a style is plain JSON kept in this browser
  (`localStorage`, per viewer, like other conveniences) and can also be copied / pasted as text to move it
  between devices. Last-used style is remembered.

**Out**

- Audio / music, GIF, animated transitions between scenes, uploading or posting to platforms.
- Recolouring parts of a world that don't use the shared stage palette (each world's own art stays as drawn,
  apart from the colour grade). A world can opt in later in its own change.
- Fonts uploaded by the visitor; arbitrary aspect ratios.
- Any server, account-side storage of styles, or sharing styles by link (would need a backend).

## Design

### Data: one `ExportStyle` (pure, `lib/export/style.ts`)

```ts
interface ExportStyle {
  v: 1;
  size: "phone" | "youtube" | "square" | "portrait";
  theme: ThemeId | "custom";
  colors: { bg; ink; ink2; base; alt; good; bad; line; frame; chip };   // hex strings
  grade: { brightness; contrast; saturation; warmth; hue; vignette };     // numbers, 0 = unchanged
  fonts: { title: FontId; body: FontId };
  layers: Record<LayerId, Layer>;          // brand, title, metric, result, time, labels, free1..3
  layout: { split: "auto" | "row" | "column" | "alt" | "base"; stage: "fill" | "framed" | "small"; chart: boolean };
  timing: { runS: number | "auto"; from: number; to: number; introS; outroS; ease: boolean }; // from/to = 0–1 of the fork span
  clean: boolean;                          // video without burned-in text
}
interface Layer { show; text?; x; y; anchor; size; color: ColorRef | hex; weight; align; box: "none" | "scrim" | "solid"; when: "all" | "intro" | "run" | "outro" }
```

- Positions are fractions of the frame (0–1), so one style works at every size; `defaultStyle(size)`
  reproduces today's 0020 layout exactly (so existing exports look the same until someone edits).
- `parseStyle(json)` validates and clamps pasted/saved styles (unknown fields dropped, colours checked).
- **The style never reaches the simulation.** `planReplay(engine, timing)` uses only `timing` to pick
  `t0`/`t1`/`steps`; the sim steps are the same fixed-step replay as 0020. Tests assert that two different
  styles give identical replay samples.

### Rendering (`lib/export/`, framework-free)

- `frame.ts` → split into `layout.ts` (frame size, stage rect, layer boxes for a style), `layers.ts` (draws
  each text layer, measuring with the chosen font) and `frame.ts` (composes: background → graded stage →
  chart strip → layers → intro/outro cards). All drawing reads colours/fonts from the style instead of
  `STAGE`/`FONT` constants.
- **Stage colours:** `withPalette(colors, fn)` swaps the shared `STAGE` (and `FONT`) values for the duration of
  one synchronous `draw()` call and restores them in `finally`, so the live stage never sees them.
- **Grade:** `ctx.filter` (`brightness() contrast() saturate() hue-rotate()` + warmth as a sepia/hue mix) on the
  stage pane only; vignette is a radial gradient over it. Where `ctx.filter` is missing (older Safari), the
  grade is skipped and the sheet says so.
- `text.ts` (new): builds the `.srt`, post caption and story `.md` from the replay summary + timeline — plain
  strings, unit-tested.
- `images.ts` (new): the list of stills (title, moments, result, chart, stage) as draw functions.

### Browser side (`components/console/export/`)

- `render.ts`: `recordVideo(plan, style)`, `renderSlides(plan, style)`, `renderImages(plan, style)` →
  PNG blobs (and a zip via **`fflate`**, ~8 kB gzipped, lazy-loaded like jsPDF — the one new dependency),
  `renderText(plan)`. Fonts: `document.fonts.load()` for the two chosen faces before drawing.
- `ExportDialog.tsx` → **Export studio**: the sheet grows into a wide panel (still the shared `Dialog`).
  - ≥ 1024 px: preview + scrubber on the left (~60 %), controls on the right in four tabs:
    **Output** (video / text / images / slides, size, clean video) · **Text** (layer list → per-layer
    controls) · **Look** (theme, colours, fonts, grade, layout) · **Timing** (length, trim bar, holds, ease).
  - < 1024 px: full-height bottom sheet, preview on top (~40 % of the height), tabs below; layers are
    moved by dragging on the preview or with the anchor grid + nudge buttons (touch-sized, 44 px).
  - Footer: *My styles* menu (save / load / reset / copy / paste), total length, and one filled action that
    follows Output (*Export video*, *Download text*, *Download images*, *Export slides*).
  - Free visitors can open the studio and play with every control on the preview; the action is
    *Unlock with Premium* (core fork-and-compare stays free).
- New pieces in the same folder: `Studio.tsx` (layout + tabs), `LayerControls.tsx`, `LookControls.tsx`,
  `TimingControls.tsx`, `PreviewCanvas.tsx` (scrub + drag hit-testing), `styles.ts` (localStorage wrapped in
  try/catch). Follows the `darkroom-ui` skill: tokens only, hairlines, no new colours in the UI chrome.

### Fonts

Eight families added through `next/font/google` in a separate module imported only by the studio chunk, so
no page pays for them until the studio opens. Canvas uses the CSS family names `next/font` generates.

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. `ExportStyle` + `defaultStyle` + `parseStyle` + themes; `planReplay` takes `timing`. Tests: default style
   = today's numbers; style never changes samples; trim/length maths.
2. Split `frame.ts` into layout / layers / frame, driven by the style; default style renders the same as
   0020 (test compares draw call logs on a mock context). Square and portrait sizes.
3. `withPalette` + colour grade + vignette; stage layout options (split / size / chart strip).
4. Text outputs (`.srt`, caption, story) + images (PNG stills, zip via lazy `fflate`). Tests for text.
5. Fonts module (8 self-hosted faces, lazy) and font selection in rendering.
6. Studio UI: wide sheet / bottom sheet, Output + Timing tabs, scrubbable preview.
7. Text tab: layer list, per-layer controls, drag on preview, anchor grid + nudge, free text boxes.
8. Look tab: themes, custom colours, fonts, grade, layout; My styles (save / load / copy / paste).
9. Polish, feature doc update, browser checks (Chrome, Safari, Firefox; 375 / 768 / 1280 / 1600 px; light +
   dark page theme), ship.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Too many controls overwhelm people | Defaults = today's look; tabs; themes first; "Reset" always one click; advanced grade collapsed |
| `STAGE` swap leaks into the live stage | Swap only inside one synchronous call with `finally` restore; test checks `STAGE` is unchanged after every export draw |
| Custom colours make text unreadable | Contrast hint on text layers under 3:1 against the background; scrim/solid box option |
| Long runs (60 s) on slow phones | Recording is real-time already; progress + cancel stay; long runs warn on phones |
| Fonts add weight | Studio-only chunk, loaded when the studio opens; `display: swap`; subset Latin |
| `ctx.filter` missing in some Safari versions | Feature-detect; skip grade with a note, everything else works |
| Bigger sheet breaks one-viewport rule | The studio is a dialog over the console, sized to the viewport, with only its control column scrolling |
| New dependency (`fflate`) | Tiny, MIT, lazy-loaded; fall back to downloading PNGs one by one if it fails |

## Verification

- [x] Automated: style tests (defaults, clamp/parse, no effect on samples), text output tests, palette
      restore test, every world × every size draws frames, stills and slides with a non-default style
      (`tests/export.test.ts`, `tests/export-style.test.ts`; 544 tests green). Typecheck and production build green.
- [x] Manual, Chrome (dev, Simulate Premium), earth: video (phone MP4, 4.5 s), clean video, pictures zip (7 PNGs),
      text zip (.srt/.txt/.md), slides (8-page PDF); Neon theme, Anton/Nunito fonts, grade and a dragged free
      text all visible in the files; 1440×900, 1024×768 day shift, 375×812.
- [ ] Manual not done: child and galaxy exports in the browser (covered only by the automated draw tests),
      768 and 1600 px, Safari and Firefox (recording, canvas-filter fallback).
- [x] Docs: `docs/features/exports.md` rewritten, PLAN.md Premium line updated.

## Log

- 2026-11-06 — proposed.
- 2026-11-06 — approved; building. The site moved to Control Room (change 0023) the same day, so the default export theme is "Control Room", not Darkroom.
- 2026-11-06 — shipped. Divergences from the plan:
  - The replay now takes **two fixed sim steps per video frame** (`SUB`), so the slow-down can show every step
    without changing results. Exports stay deterministic, but their numbers differ very slightly from 0020 exports.
  - The studio **captures the recipe once** (`planReplay`) and re-times it (`retime`) for every timing change;
    a `Scrubber` (`lib/export/scrub.ts`) analyses once and keeps snapshots so the preview can jump to any frame.
  - Layers: brand, world and seed, what-if line, key numbers, opening title, result card, three free texts. Stage
    labels and the shade behind the cards are layout switches, not layers. The default look follows 0020's
    places closely but isn't pixel-identical (checked by eye, not by a draw-log test as Step 2 planned).
  - Themes: Control Room, Paper, Classroom, Neon, Black and white, Pastel. Twelve colours (stage background and
    text on the stage are separate from the frame's, so light themes keep the dark stage readable).
  - Fonts: the site's Barlow, Barlow Semi Condensed, JetBrains Mono plus Playfair Display, Nunito, Roboto Slab,
    Caveat and Anton (`components/console/export/fonts.ts`, `preload: false`). First-load JS unchanged (105 kB).
  - Not built: pictures one by one (zip only), the long-run warning on phones, the fflate-failure fallback.
    Text copy/download is Premium like the other outputs.
