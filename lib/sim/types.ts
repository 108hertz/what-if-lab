/**
 * Shared types for every sandbox. Sandboxes are framework-free: no React, no DOM
 * except the CanvasRenderingContext2D handed to `draw`.
 */

export interface LogEntry {
  t: number;
  txt: string;
}

/** Every world must be plain data so `structuredClone` can fork it. */
export interface BaseWorld {
  /** Simulation time in the sandbox's own unit (years, days, 100 Myr…). */
  t: number;
  /** RNG state. Only touch it through `rng()` / `gauss()` from core.ts. */
  rs: number;
  /** Notable events, shown in the timeline. */
  log: LogEntry[];
  /** Once-only flags used by `note(w, txt, key)`. */
  f: Record<string, 1>;
}

export type ParamValue = number | string;
export type Params = Record<string, ParamValue>;

export type Control =
  | { type: "heading"; label: string }
  | { type: "range"; id: string; label: string; min: number; max: number; step: number; val: number; unit?: string; live?: boolean }
  | {
      type: "select"; id: string; label: string; options: [value: string, label: string][]; val: string; live?: boolean;
      /** Optional option groups (rendered as <optgroup>); every value must also be in `options`. */
      groups?: [label: string, options: [value: string, label: string][]][];
    };

export type WhatIf = [id: string, label: string];
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
}

export interface DrawContext<P> {
  ctx: CanvasRenderingContext2D;
  w: number;
  h: number;
  p: P;
  isAlt: boolean;
  ui: InteractionState;
  /** In stacking worlds, the hidden no-change world while the changed one is drawn (for comparisons). */
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
}

export interface Sandbox<W extends BaseWorld = BaseWorld, P extends Params = Params> {
  key: SandboxKey;
  name: string;
  sub: string;
  intro: string;
  hint?: string;
  controls: Control[];
  whatifs: WhatIf[];
  speeds: Speed[];
  defaultSpeed: number;
  /** Stop advancing once world.t reaches this. */
  maxT?: number;
  /** Changes add up in one world: no split stage, every what-if applies to the changed world (change 0015). */
  stack?: boolean;
  metrics: Metric[];
  fmtT(t: number): string;
  init(p: P, seed: number): W;
  step(w: W, dt: number, p: P): void;
  /** Apply a what-if to a freshly cloned world. */
  apply(w: W, id: string, p: P, ui: InteractionState): void;
  read(w: W, p: P): Readout;
  draw(c: DrawContext<P>, w: W): void;
  info?(base: W, alt: W | null, p: P): InfoBlock[];
  /** Optional hook to adjust params when one changes (e.g. country presets). */
  onParamChange?(p: P, id: string): P;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnySandbox = Sandbox<any, any>;
