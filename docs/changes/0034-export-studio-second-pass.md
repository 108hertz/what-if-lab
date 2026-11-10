# 0034 — Export studio, second pass: pick every piece, better text, sound, intros, and a Premium preview link

- **Status:** in-progress
- **Phase:** 3 (see [PLAN.md](../PLAN.md))
- **Features:** [exports](../features/exports.md), [premium](../features/premium.md)
- **Decisions:** [ADR 0008](../decisions/0008-accounts-and-billing-clerk.md) (accounts; this change adds a preview-only Premium switch, no new vendor)
- **Created:** 2026-11-10 · **Shipped:** —

## Why

Premium sells on the export studio (PLAN.md: revenue from Premium at $15/year). Creators need four more things before
the clips are worth posting: switching off **any** piece of the video, more control over **text and fonts**,
**sound** (their own voice or a track), and a ready-made **intro** they can choose and save as their own. And since
`ACCOUNTS_ON = false` hides every Premium entry point today, the owner needs a **Vercel preview link** where all
Premium features can be tried without touching production.

## Scope

**In:**

1. **Every piece can be removed.** One "On the video" checklist (Output tab) listing every piece drawn:
   brand, world and seed, what-if line, key numbers, opening title, result card, the new intro, the stage itself,
   the world label chip, the clock chip, the stage frame, the line between two worlds, the chart, the shade behind
   cards, narration captions, the colour grade. Each is a tick; the existing `clean` ("stage only") becomes a preset of
   the list ("Stage only", "Everything", "Text only on a plain background"). Today `hud` lumps the label and the clock
   together and the frame and seam can't be turned off; they get their own switches.
2. **Text and fonts.**
   - Font per layer (any of the fonts, not only "title" or "body"; title/body stay as the default choices).
   - Six more self-hosted faces (lazy, studio chunk only): Montserrat, Bebas Neue, Space Grotesk, Lora,
     Permanent Marker, Press Start 2P (final list checked for licence: all OFL).
   - **Every language works:** the site speaks 20 languages, 9 of them in non-Latin scripts (ar, bn, hi, ja, ko, ru,
     th, uk, zh). The font list shows which fonts cover the page's language; fonts that don't are marked and fall back
     per script to a Noto face (self-hosted subsets, loaded only for that language). Cyrillic/Greek subsets are added
     for the faces that have them.
   - Per layer: letter spacing, line height, outline and drop shadow (for text straight on the stage), and an
     italic toggle where the face has one.
3. **Sound: voice-over and narration text** (findings below).
   - **Your own voice:** a "Record voice-over" button plays the preview in real time and records the microphone
     (`getUserMedia`) over it; take again, trim start, volume. The take stays in this tab's memory only — never uploaded.
   - **Your own audio file:** add an MP3/WAV/M4A from the device (voice-over or music), with start offset, volume,
     fade in/out, and "lower the music under the voice" when both are present.
   - Both are mixed with Web Audio into the recording (`MediaStreamAudioDestinationNode` track added to the canvas
     stream). Recording is already real time, so sound and picture stay in step.
   - **Narration captions:** a new caption layer that shows narration lines burned into the video, timed per part
     (intro, each key moment, result). The lines are written for you from the run (the same rule-based words as the
     `.srt`), and each line can be rewritten. They also go into the `.srt` and the caption text file, so a creator
     can use a platform's own voice or captions with them.
4. **Intro templates.** An intro scene (0–6 s) played before the run, picked from built-in templates, all drawn
   by `lib/export/` as a pure function of the frame from the first frame of the run and the style's colours/fonts:
   - **Question** — the what-if types on, word by word.
   - **Countdown** — 3 · 2 · 1 over the dimmed stage, then go.
   - **Guess first** — "What do you think will happen?" with a pause bar (for classrooms).
   - **Cinematic** — black bars slide in, world name, then the title fades up.
   - **Zoom in** — the stage starts small and fills the frame as the title leaves.
   - **Then vs. now** — the no-change world for a beat, then a wipe to the changed world.
   Each template has its own words (with the usual `{tokens}`), length and which colours it uses. **My intros:**
   save the current intro (template + words + length + colours + fonts) under a name, kept in this browser like
   My styles, copy/paste as text. The existing "Opening title" hold stays for those who don't want a template.
5. **Premium only.** Everything above lives in the studio, which only Premium opens. Quick export (change 0031) stays
   exactly as it is: `quickStyle()` is unchanged and a test pins it (no sound, no intro template, same pieces).
6. **A Premium preview link on Vercel.** Builds where `VERCEL_ENV === "preview"` turn the Premium entry points on
   (as dev builds would) and show the **Simulate Premium** switch in the account menu, so every Premium feature can
   be tried on the preview URL. Production builds are unchanged (`ACCOUNTS_ON` stays false there, no switch). The
   switch never ships to production because the flag is read at build time from Vercel's own environment.
   Optional, if you add a Clerk **test** key (`pk_test_…`) to Vercel's *Preview* environment only: the real sign-in
   and Clerk Billing checkout with Stripe test cards also work on the preview.

**Out:**

- A built-in computer voice. The browser's speech (`speechSynthesis`) plays to the speakers and can't be captured
  into the file; an in-browser neural voice would be an AI model (against "no AI") and tens of MB. The narration
  lines + `.srt` cover this: platforms' own text-to-speech can read them.
- Built-in music library (licensing; could be a later change with our own generated tones).
- Outro (ending) templates — same machinery, a follow-up if intros land well.
- Removing labels drawn **inside** a world's own `draw()` (those belong to each world; a world can add a `ui` option
  later in its own change).
- Uploaded fonts, GIF, posting to platforms.

## Design

**Style data (`lib/export/style.ts`)** — `ExportStyle` goes to `v: 2`; `parseStyle` reads v1 and upgrades it
(saved styles keep working).

```ts
pieces: { stage, label, clock, frame, seam, chart, scrims, captions, grade: boolean }  // replaces layout.hud/chart and `clean`
Layer += { fontId?: FontId; tracking: number; leading: number; outline: number; shadow: number; italic: boolean }
intro: { template: IntroId | "none"; seconds: number; words: Record<string, string> }
captions: Layer & { lines: Record<string, string> }   // overrides keyed by part ("intro", "m0".., "result")
// sound is NOT in the style: it's a file or a take, kept in component state (never saved or pasted)
```

**Drawing** — `lib/export/intro.ts` (new, pure): `INTROS` map, `drawIntro(ctx, style, r, info, f)`. `clipPhase`
gains an `"intro-scene"` phase before the title hold; `clipFrames` adds its frames. Timing still never reaches the
sim: the intro shows step 0 (or the no-change world for "Then vs. now").
`frame.ts`: `drawStage` reads `pieces`; `drawLayer` gets tracking, leading, outline, shadow, per-layer font.
`text.ts`: narration lines (`narration(plan, summary)`) shared by captions, `.srt` and caption file.

**Fonts** — `components/console/export/fonts.ts` adds the six faces and per-script Noto fallbacks;
`style.ts` gets `FONT_SCRIPTS` (which scripts each face covers) so the list can mark them.

**Sound** — `components/console/export/sound.ts` (new): load/decode a file, record a mic take
(`MediaRecorder` audio), mix graph (gain, fades, ducking), and `audioTrack(startAt)` used by `recordVideo`.
The MIME list gets audio codecs (`avc1+mp4a`, `vp9+opus`). If the browser can't record audio with video, the
Sound section says so and the video records silent.

**UI (control-room-ui skill)** — tabs become Output · Pieces · Text · Intro · Sound · Look · Timing on ≥ 1024 px
(the settings column already scrolls); below 1024 px the same tabs scroll sideways. Intro tab: template cards with
a small moving preview each, words, length, My intros. Sound tab: Record / Add file, a waveform strip under the
scrubber, volume/fade/offset.

**Preview flag** — `next.config.ts` passes `NEXT_PUBLIC_VERCEL_ENV` from `VERCEL_ENV`. In
`components/account/context.tsx`, `ACCOUNTS_ON` becomes `false || PREVIEW` and `readConfig` gets `preview`
(→ `dev`-like simulation allowed). `state.ts` stays pure and tested: production + no key ⇒ status "off", no switch.

## Steps

Each ends green on `npm run typecheck && npm test && npm run build`.

1. **Preview link first** — preview flag, Simulate Premium on preview builds; test that production config never
   allows it. Push a branch → Vercel builds a preview URL (or `vercel deploy`), so you can test from step 1 on.
2. **Pieces** — style v2 with `pieces`, v1 upgrade, drawing switches, checklist + presets; tests.
3. **Text** — per-layer font, spacing, outline, shadow; six faces; per-script fallbacks and the coverage marks.
4. **Narration captions** — `narration()`, caption layer, editable lines, same lines in `.srt`/caption file.
5. **Intro templates** — `intro.ts`, six templates, clip phase, Intro tab, My intros.
6. **Sound** — file + mic take, mixing into the recording, Sound tab, codec fallback.
7. **Docs** — exports.md and premium.md updated, i18n keys for all 20 languages (`npm run i18n:extract`; machine
   drafts like the rest), PLAN.md.

After each step I redeploy the preview so you can try it.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Preview URL is public: anyone with it gets Premium free | It's a test build only; turn on Vercel Deployment Protection (Vercel login or password) for previews. Production is unaffected. |
| Audio drifts from picture | Recording is wall-clock real time already; audio starts on the same `performance.now()` as frame 0. Checked on a 60 s clip. |
| Safari/Firefox can't record audio+video in one file | Detect with `isTypeSupported`; fall back to silent video and say so. |
| Non-Latin fonts are big | Noto subsets per script, loaded only for the page's language, only in the studio. |
| Saved v1 styles break | `parseStyle` upgrades v1 → v2; test round trip. |
| Mic privacy | Take kept in memory only, never stored or sent; mic released as soon as the take ends. |
| Intros changing results | Intros only choose which frame/world is shown; test: same frames for the run with any intro. |

## Verification

- [x] Automated: `tests/export-style.test.ts` (v1→v2, pieces off ⇒ nothing drawn for that piece, captions
      ordered, intro frames count), `tests/export.test.ts` (every world × every intro template draws; run frames
      identical with/without intro and sound; quick style unchanged), account test (production never allows the
      simulation; preview does).
- [ ] Manual on the Vercel preview with Simulate Premium on: each piece toggled off in the file; three fonts in
      English, Japanese and Arabic; a mic take and an MP3 in the MP4 (Chrome) and WebM; each intro template; My
      intros saved, reloaded, pasted. 1440×900, 1024×768, 375×812.
- [ ] Production build: no account menu, no switch, Quick export unchanged. (Rules tested in `tests/account.test.ts`;
      `next build` green; not yet clicked through on a production deploy.)
- [x] Docs: exports.md and premium.md updated; PLAN.md line added (unticked until the preview deploy and remaining checks).

## Log

- 2026-11-10 — proposed.
- 2026-11-10 — approved; in progress (step 1).
- 2026-11-10 — steps 1–7 built on branch `export-studio-0034`. Where it differs from the design above:
  - **Fonts:** no new Noto subsets were needed. The site already self-hosts Noto per script (RootShell); each studio face
    is now followed by the site's own stack, so missing letters fall back glyph by glyph. The font list marks faces that
    lack the page language's letters ("device letters for this language").
  - **Intros:** no new clip phase. An intro plays over the existing opening hold (Timing → opening title, now 0–6 s) and
    its words fade over the first 15 run frames, so `replay.ts` is untouched. Template cards have no moving previews of
    their own; picking one plays the main preview from the start instead.
  - **Pieces:** `layout.hud` became `pieces.label` + `pieces.clock`; `clean` stays and is the "Stage only" preset. The
    pieces list lives in the Output tab (no separate Pieces tab), so the studio has six tabs.
  - **Narration edits** and **sound** stay in the studio's state (they depend on the run), never in a saved style.
  - **Dev helper:** `NEXT_DIST_DIR` lets a second dev server or a build use its own folder (`.next-preview`,
    `.next-build`), and `.claude/launch.json` has a `premium-preview` server on port 5051.
- 2026-11-10 — dev builds (`npm run dev`) now show the account menu and Simulate Premium too (`ACCOUNTS_ON = ACCOUNTS_LAUNCHED || CONFIG.dev`);
  production builds still hide them until launch.
- 2026-11-10 — Vercel preview builds failed: Google Fonts sometimes answers with font links without a file extension
  (`/l/font?kit=…`), which next/font 15.5 can't read. The studio's 11 faces are now stored in the repo
  (`public/fonts/studio/`, 51 woff2 files, 1.25 MB, fetched by the browser only when drawn) with a generated stylesheet
  (`npm run fonts:studio` → `components/console/export/studio-fonts.css`). The site's own fonts still use next/font/google.
