import type { BootShape } from "../boot/shapes";
/**
 * Shared types for every sandbox. Sandboxes are framework-free: no React, no DOM
 * except the CanvasRenderingContext2D handed to `draw`.
 */

import type { Values } from "@/lib/i18n/message";
import type { ViewState } from "./camera";

/**
 * A notable event: a message key in the world's own namespace plus its values (change 0025), never a sentence, so
 * the sim's output is the same in every language. The words are in the sandbox's `messages` (English) and in
 * worlds/<key>/locales/<code>.json; the timeline, the stage and exports translate them when shown.
 */
export interface LogEntry {
  t: number;
  k: string;
  v?: Values;
}

/** Every world must be plain data so `structuredClone` can fork it. */
export interface BaseWorld {
  /** Simulation time in the sandbox's own unit (years, days, 100 Myr…). */
  t: number;
  /** RNG state. Only touch it through `rng()` / `gauss()` from core.ts. */
  rs: number;
  /** Notable events, shown in the timeline. */
  log: LogEntry[];
  /** Once-only flags used by `note(w, k, v, once)`. */
  f: Record<string, 1>;
}

export type ParamValue = number | string;
export type Params = Record<string, ParamValue>;

export type Control =
  | { type: "heading"; label: string }
  | { type: "range"; id: string; label: string; min: number; max: number; step: number; val: number; unit?: string; live?: boolean }
  | {
      type: "select"; id: string; label: string; options: [value: string, label: string][]; val: string; live?: boolean;
      /** A different world, not a different start (change 0037, solar's star system): picking one starts over at time 0 with no changes. */
      fresh?: boolean;
      /** Optional option groups (rendered as <optgroup>); every value must also be in `options`. */
      groups?: [label: string, options: [value: string, label: string][]][];
    };

export type WhatIf = [id: string, label: string];

/**
 * A what-if's own page (change 0033): the question people type into a search box, and the English words in its URL
 * (`/lab/<world>/<slug>`). The slug is frozen once shipped: ranked URLs must never break.
 */
export interface WhatIfQuestion {
  q: string;
  slug: string;
}

/**
 * The run behind every what-if page of a world (change 0033): the default world runs to `fork`, the what-if is made,
 * and both worlds run on; the page reads them at each time in `at` (world time, ascending; the last is the horizon).
 */
export interface AnswerSetup {
  /** World time of the what-if. Default: what the `#whatif=` link waits (1.5 s at the default speed). */
  fork?: number;
  at: number[];
  /** Metrics the page shows, in order. Default: all of them. */
  metrics?: string[];
  /** Metrics the first sentence may name (default: `metrics`): the one whose two worlds end furthest apart. */
  key?: string[];
  /** How "furthest apart" is measured: relative (default) or absolute (for counts out of the same total). */
  keyBy?: "rel" | "abs";
  /** Sim step. Default: one 30 fps frame at the default speed. */
  dt?: number;
  /** World time of the page's pictures, after the fork and up to the horizon. Default: the horizon. */
  shot?: number;
}
export type Speed = [unitsPerSecond: number, label: string];

export interface Metric {
  k: string;
  label: string;
  unit: string;
  fmt: (v: number | null) => string;
  /** Optional plain-language meaning, shown under the chart (change 0016). */
  help?: string;
  /** Which direction is better, so a difference can be marked good or bad. */
  better?: "up" | "down";
  /** Optional sentence for a difference (what-if − no change), e.g. "4 fewer people out of 100 are poor". */
  diff?: (d: number) => string;
}

export type Readout = Record<string, number | null>;

export interface Camera {
  cx: number;
  cy: number;
  sc: number;
  W: number;
  H: number;
  /** Optional radial power scale (solar): a body r away is drawn sc·half·(r/half)^pow from the centre. Linear when absent. */
  pow?: number;
  half?: number;
}

export interface Drag {
  alt: boolean;
  ox: number;
  oy: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface PendingBody {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

/** Interaction state shared between the UI layer and sandboxes (e.g. throwing planets). */
export interface InteractionState {
  drag: Drag | null;
  cams: [Camera | null, Camera | null];
  pending: PendingBody | null;
  /** The space camera (change 0036): view only, set by stage gestures; absent = each world's own default framing. */
  view?: ViewState;
}

export interface DrawContext<P> {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  p: P;
  isAlt: boolean;
  ui: InteractionState;
  /** The hidden no-change world while the changed one is drawn (for comparisons). Undefined when drawing the no-change world. */
  base?: BaseWorld;
}

export interface InfoRow {
  label?: string;
  text: string;
  color?: string;
}
export interface InfoBlock {
  heading?: string;
  accent?: boolean;
  rows: InfoRow[];
}

export type SandboxKey = "galaxy" | "solar" | "earth" | "country" | "animals" | "child" | "person";

/** What the nav needs to know about a world without loading it (worlds/<key>/meta.ts). */
export interface WorldMeta {
  key: SandboxKey;
  name: string;
  sub: string;
  /** Param set by scale-explorer links like "animals:wolf". */
  presetParam?: string;
  /** The silhouette the boot scene's sparks gather into (change 0026, lib/boot/shapes.ts). */
  boot: BootShape;
}

export interface Sandbox<W extends BaseWorld = BaseWorld, P extends Params = Params> {
  key: SandboxKey;
  name: string;
  sub: string;
  intro: string;
  /** Search title (without the site name) and description for the world's page (change 0033): the words people search for. */
  seo?: { title: string; description: string };
  hint?: string;
  /**
   * The world's English words as ICU messages, keyed relative to the world (change 0025): event lines (`ev.*`) and the
   * names they refer to. Other languages override them from worlds/<key>/locales/<code>.json.
   */
  messages: Record<string, string>;
  controls: Control[];
  whatifs: WhatIf[];
  /**
   * The question for each what-if that gets its own page (change 0033), keyed by what-if id. A what-if left out has no
   * page (e.g. one that only makes sense with the visitor's own settings).
   */
  questions?: Record<string, WhatIfQuestion>;
  /** How a what-if's page computes its answer (change 0033, lib/seo/answer.ts). */
  answer?: AnswerSetup;
  /**
   * A metric's name in this world, when its label is a slot (animals: "Animal 1" is the wolves): a key of the world's
   * `messages` plus values, or null to keep the label. Read by the what-if pages; must not change the world.
   */
  metricName?(w: W, k: string): { k: string; v?: Values } | null;
  speeds: Speed[];
  defaultSpeed: number;
  /** Stop advancing once world.t reaches this. */
  maxT?: number;
  /**
   * Live pacing hint, 0–1 (e.g. slow motion for a moment after a change, change 0019). Multiplies the live clock only;
   * exports and tests step the sandbox directly and never read it, so it cannot change results.
   */
  pace?(): number;
  metrics: Metric[];
  fmtT(t: number): string;
  init(p: P, seed: number): W;
  step(w: W, dt: number, p: P): void;
  /**
   * Apply a what-if to the changed world. Every world stacks (change 0015, all worlds since change 0024): this may be
   * a world that already has other changes, so add to it rather than replace them.
   */
  apply(w: W, id: string, p: P, ui: InteractionState): void;
  read(w: W, p: P): Readout;
  draw(c: DrawContext<P>, w: W): void;
  info?(base: W, alt: W | null, p: P): InfoBlock[];
  /** Optional hook to adjust params when one changes (e.g. country presets). */
  onParamChange?(p: P, id: string): P;
  /**
   * Words that depend on the starting settings (change 0037, solar's star systems): say `key` (e.g. `whatif.sun2`,
   * `metric.dist.label`) as another key of the world's `messages`, with values. `null` hides a what-if for these settings;
   * `undefined` keeps the usual words. Read by `worldSay(sb, p)`; never by the sim.
   */
  reword?(p: P, key: string): { k: string; v?: Values } | null | undefined;
  /** The speed (index into `speeds`) a world with these settings starts at. Default: `defaultSpeed`. */
  speedFor?(p: P): number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySandbox = Sandbox<any, any>;
