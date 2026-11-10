# 0035 — Phones: the world fills the screen, tools open as sheets, results rise from the bottom; a full-screen export editor

- **Status:** shipped
- **Phase:** 1 · 3 (see [PLAN.md](../PLAN.md))
- **Features:** [fork-and-compare](../features/fork-and-compare.md), [exports](../features/exports.md), [ads](../features/ads.md)
- **Decisions:** none new. [ADR 0007](../decisions/0007-ad-slots-per-world.md) still holds: the 320 × 50 banner stays at the foot of the phone tools.
- **Created:** 2026-11-10 · **Shipped:** 2026-11-10

## Why

Most visitors arrive on a phone (PRODUCT.md), and on a phone the console doesn't work. At 375 × 812 the stage gets
about 45 % of the height. A four-tab dock (Ask · Tune · Read · Log) takes the rest, and each tab is a long scrolling
form, so a first-time visitor sees a small picture and a wall of settings. They can't tell what the screen is for or
where the "what if" is. The export studio is worse: a phone-size (9:16) video previews as a ~110 px-wide thumbnail,
with six tabs of settings stacked under it. Principle 2 ("the fork is the moment") and principle 5 ("the simulation is
the object") both point the same way: on a phone, give the world the screen and call tools up only when they are wanted.

## Scope

**In:**
- A shared phone layout for every world console below 1024 px: the stage takes most of the height, a bottom tool bar opens
  **What if** and **Tune** as bottom sheets, and the results (now, chart, log, about) sit in a drawer that rises from
  the bottom. Pulling it up (or scrolling up) shrinks the stage to a small live strip and gives the results the screen.
- The four custom phone layouts (country, child, animals and the standard one used by galaxy, solar, earth and
  person) move onto it. Each world still chooses what goes into each sheet and drawer tab.
- On phones (< 768 px) the export studio becomes a full-screen editor: a big preview of the exact file, a tool rail on
  the right (Output, Text, Intro, Sound, Look, Timing, Styles), the tool's settings in a lower panel while the preview
  stays visible above it, and the main Export button top right. Quick export (free) uses the same frame without the rail.
- Phones held sideways (≤ 520 px tall): the same parts turned on their side. The stage takes the full height, the tool bar
  becomes a narrow rail on the right, and the sheets and drawer open from the right side.
- DESIGN.md Layout and Components updated (phone band, sheet, drawer, tool rail). New words in all 20 languages.

**Out:**
- Desktop and compact desktop (≥ 1024 px) consoles: no change. The studio from 768 px up: no change.
- Any change to the sims, the engine, the export renderer or the export files (`tests/export.test.ts` must not move).
- New gestures on the stage itself (solar's drag-to-throw etc. keep working as now).
- The /scale page.

## Design

Follows DESIGN.md (Control Room) and the `control-room-ui` skill: tokens only, one filled button per view, 44 px
targets, raised sheets with a track edge, the 78 % stage scrim, no shadows.

### 1. Phone world console (< 1024 px)

```
┌───────────────────────────┐
│ what if…  [COUNTRIES ▾] ⋯ │  nav (unchanged)
├───────────────────────────┤
│                           │
│        STAGE (live)       │  flex: 1 — about 65–70 % of the height
│  ◆ CHANGED: BASIC INCOME  │  (stage tag already drawn on canvas)
│                           │
├───────────────────────────┤
│ ❚❚ 2046 · SPEED 3 MO/S ▾ ↺ ⛶│  transport strip (rebuilt, see below)
├───────────────────────────┤
│ ─── grabber ───           │  results peek, 64 px:
│ $9,780 a month  ◆ +12 %   │  the key readout with its no-change/changed values
│ 2041 · Basic income starts│  plus the latest timeline line
├───────────────────────────┤
│ [⑂ WHAT IF… 2] [TUNE] [⤓] │  tool bar, 56 px, thumb zone
├───────────────────────────┤
│        320×50 ad          │  ADR 0007 banner at the foot (free only)
└───────────────────────────┘
```

- **Transport on phones (rebuilt).** Today the four speed options are squeezed into about 100 px between a 130 px PAUSE
  button and three icon buttons. They scroll sideways under a fade, so you see one half-faded "3 MO/S", the other
  speeds are hidden, and "MO/S" is never explained. The new strip (< 1024 px; `Transport` gets a `compact` mode, so the
  desktop is unchanged):

  ```
  ┌───────────────────────────────────────┐
  │ [❚❚]  2046  ·  SPEED 3 MO/S ▾    [↺] [⛶] │
  └───────────────────────────────────────┘
  ```
  - **Play/Pause**: a 52 × 44 filled icon button (still the one primary). It gets an `aria-label`, and its label shows
    from 400 px wide up.
  - **World clock**: in mono, so you see time move even while the drawer is open.
  - **Speed button**: takes all the space left over (`flex: 1`), so it is never clipped: "SPEED" as a Label, the
    current speed in mono, and a chevron. Tapping it opens a small **speed sheet** listing every speed as a 48 px row,
    with the selected one ticked. Each row says it in words: "3 months every second", "1 year every second", and so
    on. The words come from new `speedWords.<i>` messages in each world, in all 20 languages. The same sheet serves
    the galaxy's seven speeds, which replaces its −/+ stepper on phones.
  - **Reset**: an icon button, as now. **Full screen**: an icon button. Export moves to the tool bar.
  - **Sideways phones**: the same items go down the right rail. Play sits on top, and the speed button opens the same
    sheet from the right.
- **Tool bar** (new `components/console/phone/ToolBar.tsx`): three 44 px+ buttons with glyph and Label.
  - **What if…**: fork glyph, amber edge, with a mono count of changes that are on. Amber is allowed here because this
    is the control that changes the world.
  - **Tune**: secondary.
  - **Export**: icon only; it moves out of the transport strip on phones.

  Play/Pause in the transport stays the one filled button.
- **Sheets** (new `components/console/phone/Sheet.tsx`, built on the existing `components/ui/Dialog`). A bottom sheet
  with a grabber, a title and ×. It is at most 72 dvh tall, so the top of the stage stays visible: you see the world
  react. Drag the grabber down, press Escape or tap the scrim to close.
  - **What if… sheet:** "Your changes" (ticks) on top, then the what-ifs to pick (each world's own list: country's
    groups, child's scheduled changes, animals' cast changes…). Picking a what-if **closes the sheet**. The stage then
    shows the change happen, and the results peek briefly highlights the new line. Ticking or removing a change keeps
    the sheet open.
  - **Tune sheet:** the world's settings (`TunePanel`, or the world's own block).
- **Results drawer** (new `components/console/phone/ResultsDrawer.tsx`). It has two resting heights, *peek* and *open*:
  - *Peek* is the 64 px strip shown above.
  - *Open*: the stage shrinks to a 28 % strip at the top and keeps running, so you never lose sight of the world. The
    drawer then fills the rest with a tab track: **Now** (readouts / story), **Chart**, **Log** (timeline), **About**
    (world header and info blocks). Each world passes its own tabs; child and animals already own their chart, story
    and timeline.
  - Opening: drag the grabber up, tap the peek, or swipe up anywhere below the stage. Closing: drag down, tap the
    stage strip, or scroll the drawer's content to its top and keep pulling down.
  - How it works: one CSS variable `--open` from 0 to 1 sets the stage height and the drawer position, written in a
    pointer/scroll handler through `requestAnimationFrame`. On release it snaps to 0 or 1 (`--d-ctl`, `--ease-out`).
    The canvas is redrawn at the new size by the existing `fitCanvas` resize path when the snap ends. While dragging,
    the stage only scales, so we never reallocate the canvas every frame. Reduced motion: no animated snap.
  - The page itself still never scrolls (DESIGN.md "one viewport"). Only the drawer's content scrolls inside it.
- **Shared block** `components/console/phone/PhoneConsole.tsx` takes
  `{ engine, onChange, stageChildren?, whatIf, tune, tabs: [label, node][], peek?: node, onReset? }`. Every
  `Console.tsx` swaps its `< 1024` branch from `<Dock …/><AdSlot size="banner"/>` to `<PhoneConsole …/>`. The banner
  lives inside `PhoneConsole` so no world can drop it (the ad-slot structure test is updated to look for it there).
  `Dock.tsx` stays for the 1024–1279 band.
- **Peek line**: shows the sandbox's first metric, through `Readouts`' existing formatting, in mono with the channel
  marks (● no change, ◆ changed), and under it the newest timeline event via `eventText`. A world can pass its own `peek`.
- **Sideways phones (≤ 520 px tall):** stage on the left at full height. On the right sits a 64 px rail holding the
  tool bar's buttons and a Results button. Sheets and the drawer slide in from the right, 360 px wide. The banner stays
  hidden here, as today.
- **First visit:** while there are no changes, the What if… button carries a one-line caption above the tool bar:
  "Pick a what-if to change the world". It goes away after the first change and is never stored. This is the missing
  "what is this about" moment.

### 2. Phone export studio (< 768 px)

```
┌───────────────────────────┐
│ ×  EXPORT   1080×1920·16s  [⤓ EXPORT] │  top bar: close, spec, the one primary
├──────────────────────┬────┤
│                      │ ▣  │ OUTPUT
│                      │ T  │ TEXT
│   PREVIEW (fills,    │ ▶︎  │ INTRO
│   letterboxed to the │ ♪  │ SOUND
│   export's shape)    │ ◐  │ LOOK
│                      │ ⏱  │ TIMING
│                      │ ☰  │ STYLES
├──────────────────────┴────┤
│ ▶  ━━━●━━━━━━━  0:04/0:16 │  scrubber
└───────────────────────────┘
        tap a rail tool ↓
┌───────────────────────────┐
│ ×  EXPORT ...   [⤓ EXPORT]│
│  PREVIEW (smaller, live)  │ rail stays on the right
│ ▶ ━━━●━━━━━━━  0:04/0:16  │
├───────────────────────────┤
│ TEXT                    ✓ │  tool panel, ~45 dvh, scrolls inside
│ …that tab's controls…     │
└───────────────────────────┘
```

- The studio Dialog becomes full-screen below 768 px (`.studio` gets a phone layout; the desktop markup is unchanged).
  The preview gets everything that isn't top bar, rail or scrubber. A 1080 × 1920 video then previews at about
  300 × 530 px instead of 110 × 190.
- **Tool rail** (new `components/console/export/ToolRail.tsx`): a 64 px column on the stage-panel colour. Each tool is a
  56 px button with a glyph and a Micro label. The active tool is raised and has the signal bar on its inner edge. The
  rail is a `tablist` with arrow keys, like the desktop tabs.
- **Tool panel**: tapping a tool slides its existing tab component up from the bottom (`OutputTab`, `TextTab`,
  `IntroTab`, `SoundTab`, `LookTab`, `TimingTab`, `MyStyles`). We reuse the components and only change their
  container. The preview shrinks above the panel and keeps playing, so every adjustment shows at once. Tapping ✓ or the
  same tool again closes the panel.
- Tapping a text layer on the preview opens the Text tool, as it already does on desktop.
- **Export flow**: the top-bar Export button starts the render. Progress, "Saved" and errors replace the scrubber row,
  and Cancel replaces Export. "My styles" moves from the footer into the rail.
- **Architecture**: `ExportDialog.tsx` is 350 lines that hold both the state and the layout. Its state (style, out, tab,
  plan, scrub, phase, sound, narration) moves into a `useStudio(engine)` hook, and two layouts render from it:
  `StudioDesk` (today's markup, unchanged) and `StudioPhone`. Nothing about the export itself changes.
- **Quick export (free)**: on phones it uses the same full-screen frame: a big preview, the scrubber, and Download as the
  primary. There is no rail. A small "More ways to export" secondary opens the Premium sheet, which is the same entry
  point the desktop already has.

### Words

New keys under `console.phone.*` (whatIf, tune, export, results, now, chart, log, about, pickFirst, closeResults) and
`export.studio.rail.*`, in all 20 locales. These are machine drafts, as for the other languages, and
`i18n-catalogs.test.ts` keeps them complete.

## Steps

1. **Compact transport + speed sheet** (Play icon, clock, speed button, `speedWords` in every world × 20 languages).
2. **Sheet + ToolBar + PhoneConsole** with the What if… and Tune sheets and a static peek, behind the `< 1024`
   branch of `StandardConsole` (galaxy, solar, earth, person). Update the ad-slot structure test.
3. **Results drawer**: peek ↔ open, the collapsing stage, snap, reduced motion, sideways layout.
4. **Move country, child and animals** to `PhoneConsole` with their own sheets, tabs and peek.
5. **`useStudio` hook** split out of `ExportDialog`, with the desktop output unchanged (studio screenshots compared at
   1280 px before and after).
6. **StudioPhone + ToolRail + tool panel**; Quick export in the same frame on phones.
7. **Words in 20 languages**, DESIGN.md (Layout → phone band; Components → sheet, drawer, tool rail),
   feature docs, `.impeccable/design.json` regenerated.

Each step ends green on `npm run typecheck && npm test && npm run build`.

## Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Resizing the stage canvas while dragging the drawer stutters | Scale the canvas with a CSS transform while dragging; reallocate it once, when the snap ends |
| Drawer gestures fight stage gestures (solar drag-to-throw, child view switch) | The drawer only listens on its own grabber, the peek and the area below the stage; the canvas keeps its pointer events |
| Swipe up clashes with iOS Safari's own toolbar and pull-to-refresh | `overscroll-behavior: contain` on the console; the page never scrolls, so the browser chrome stays put |
| Fewer ad views when the banner sits under the tool bar | Its position relative to the screen doesn't change (foot of the phone tools, ADR 0007), so this should be neutral |
| Hidden tools are harder to discover than a visible dock | Labelled tool bar buttons (never icon-only for What if/Tune), the first-visit caption, and the peek showing results without a tap |
| The studio's desktop layout regresses during the split | Step 4 is a pure refactor with before/after screenshots; `tests/export.test.ts` untouched |

## As built (differences from the design above)

- **No world clock in the transport.** The stage already draws it top right, and at 375 px the extra 50 px clipped the
  speed again. The speed button gets the room.
- **Speed words come from one shared catalog** (`console.speed.d|wk|mo|yr|myr|gyr`, ICU plurals). They don't use
  per-world `speedWords.<i>`. The amount and unit are read from each world's English speed label
  (`components/console/phone/speed.ts`). That makes 6 phrases per language instead of about 30, and new worlds get
  words for free. `tests/phone.test.ts` checks that every world's speeds parse.
- **No `useStudio` hook.** `ExportDialog` keeps its state and builds the preview, the settings panel, the status and
  the actions once. The desktop and phone layouts both render from those pieces. The desktop markup is unchanged (the
  1280 px studio was checked in the browser).
- **"My styles"** is the rail's last tool on phones (labelled "Styles"). On desktop it stays the footer pop-up, using
  the same `StylesBody`.
- **Tapping the stage doesn't close the results.** It would clash with stage gestures (solar's throw, child's
  tap-a-kid). The strip's head closes it, as do dragging down, pulling down from the top of the content, and the wheel.
- **Sideways phones keep the transport under the stage**, and the right rail holds the tools only.
- **Phone tool sheets** show "Your changes" only once there is a change, so the what-ifs come first.
- **Child:** Family, parents and home go in the Tune sheet. "Meet the child" and the story go in Now, the
  nature-vs-nurture bar in its own "Why" tab.

## Verification

- [x] Automated: typecheck; 33 test files pass (2004 tests, plus the new `tests/phone.test.ts`); the ad-slot structure
  test finds the banner in `PhoneConsole` for every world; i18n catalogs complete in all 20 languages.
- [x] Manual at 375 × 812, graphite, in the browser pane:
  - solar: the speed sheet; the What if… sheet; picking a what-if closes it and the strip shows ● / ◆; the results rise
    by drag, Chart tab, close by drag;
  - galaxy (seven speeds), child (stage controls) and country load correctly;
  - studio full screen with the rail, and the Look tool opening under the preview;
  - Quick export full screen.
- [x] Manual sideways at 844 × 390 (animals): the stage with the tool rail; Results opens as a side sheet.
- [x] Desktop at 1280 × 800: the country console and the export studio look as before.
- [ ] Not checked: 390 × 844, day shift, reduced motion, keyboard-only path through sheets and rail, a real
  touch device (pull-to-close on the results content, iOS Safari toolbars), a full video export on a phone, the other
  20-language layouts (long German/Russian labels in the tool bar), and the ad banner (ads are off site-wide,
  `ADS_ON = false`).
- [x] Docs: DESIGN.md (phone band, tool sheets, compact transport, results strip, phone export editor),
  features/fork-and-compare.md, features/exports.md, features/ads.md, PLAN.md.

## Log

- 2026-11-10 — proposed (from a phone review of every world and the export studio at 375 × 812).
- 2026-11-10 — added the phone transport: Play as an icon, the world clock, and a full-width speed button that opens a speed sheet. The speed options had been clipped out of sight.
- 2026-11-10 — approved; built and shipped the same day. See "As built" for where it differs from the design.
