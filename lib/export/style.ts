/**
 * Export style (change 0022): everything a visitor can set about how an export looks and how long it runs.
 * Plain JSON, so it can be saved in the browser, copied as text and pasted on another device.
 * Framework-free. The style never reaches the simulation: only `timing` feeds `planReplay()`, and even that
 * picks the clip's span and frame count, never how a world behaves.
 *
 * Positions are fractions of the frame (0–1), so one style works at every size.
 */
import { STAGE } from "../sim/draw";

// ——— Sizes ———

export type SizeId = "phone" | "youtube" | "square" | "portrait";

/** Output pixels (W×H) and the logical size drawn into (w×h, ×2 = output). */
export const SIZES: Record<SizeId, { W: number; H: number; w: number; h: number; name: string; ratio: string }> = {
  phone: { W: 1080, H: 1920, w: 540, h: 960, name: "Phone", ratio: "9:16" },
  youtube: { W: 1920, H: 1080, w: 960, h: 540, name: "YouTube", ratio: "16:9" },
  square: { W: 1080, H: 1080, w: 540, h: 540, name: "Square", ratio: "1:1" },
  portrait: { W: 1080, H: 1350, w: 540, h: 675, name: "Portrait", ratio: "4:5" },
};
export const SIZE_IDS = Object.keys(SIZES) as SizeId[];
export const isWide = (s: SizeId) => SIZES[s].w > SIZES[s].h;

// ——— Colours ———

export type ColorKey = "bg" | "ink" | "ink2" | "base" | "alt" | "good" | "bad" | "line" | "stage" | "stageInk" | "frame" | "chip";
export type Palette = Record<ColorKey, string>;

/** Names shown in the Look tab, in order. */
export const COLOR_KEYS: [ColorKey, string][] = [
  ["bg", "Background"],
  ["ink", "Text"],
  ["ink2", "Quiet text"],
  ["base", "No-change world"],
  ["alt", "What-if world"],
  ["good", "Better"],
  ["bad", "Worse"],
  ["line", "Chart lines and rules"],
  ["stage", "Stage background"],
  ["stageInk", "Text on the stage"],
  ["frame", "Stage frame"],
  ["chip", "Stage labels"],
];

export type ThemeId = "control" | "paper" | "classroom" | "neon" | "mono" | "pastel";

export const THEMES: Record<ThemeId, { name: string; colors: Palette }> = {
  control: {
    name: "Control Room",
    colors: {
      bg: STAGE.void, ink: STAGE.ink, ink2: STAGE.ink2, base: STAGE.base, alt: STAGE.alt, good: STAGE.good, bad: STAGE.bad,
      line: STAGE.line, stage: STAGE.void, stageInk: STAGE.ink, frame: STAGE.line, chip: "#05080CD1",
    },
  },
  paper: {
    name: "Paper",
    colors: {
      bg: "#F4F1EA", ink: "#1A1D22", ink2: "#5B6370", base: "#2F6FD6", alt: "#C47A00", good: "#2E7D4F", bad: "#C0392B",
      line: "#D5CFC2", stage: "#161A21", stageInk: "#F4F1EA", frame: "#1A1D22", chip: "#161A21D9",
    },
  },
  classroom: {
    name: "Classroom",
    colors: {
      bg: "#FFFFFF", ink: "#111827", ink2: "#4B5563", base: "#2563EB", alt: "#EA580C", good: "#15803D", bad: "#B91C1C",
      line: "#E5E7EB", stage: "#0F172A", stageInk: "#F8FAFC", frame: "#CBD5E1", chip: "#0F172AD1",
    },
  },
  neon: {
    name: "Neon",
    colors: {
      bg: "#0A0014", ink: "#FFFFFF", ink2: "#B9A6D9", base: "#00E5FF", alt: "#FF2BD6", good: "#39FF88", bad: "#FF4D4D",
      line: "#2A1A44", stage: "#0A0014", stageInk: "#FFFFFF", frame: "#FF2BD6", chip: "#0A0014D1",
    },
  },
  mono: {
    name: "Black and white",
    colors: {
      bg: "#000000", ink: "#FFFFFF", ink2: "#9A9A9A", base: "#BDBDBD", alt: "#FFFFFF", good: "#FFFFFF", bad: "#9A9A9A",
      line: "#333333", stage: "#000000", stageInk: "#FFFFFF", frame: "#333333", chip: "#000000D1",
    },
  },
  pastel: {
    name: "Pastel",
    colors: {
      bg: "#FDF6F0", ink: "#3D3346", ink2: "#7D7088", base: "#5D8FE0", alt: "#E8893A", good: "#3E9E62", bad: "#D85F52",
      line: "#EADFD6", stage: "#2E2838", stageInk: "#FFF7F0", frame: "#EADFD6", chip: "#2E2838D1",
    },
  },
};
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];

const HEX = /^#([0-9a-f]{6}|[0-9a-f]{8})$/i;
export const isHex = (s: unknown): s is string => typeof s === "string" && HEX.test(s);

/** Relative luminance of a #RRGGBB(AA) colour (alpha ignored). */
function lum(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

/** WCAG contrast ratio between two colours, 1–21. */
export function contrast(a: string, b: string): number {
  if (!isHex(a) || !isHex(b)) return 21;
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

// ——— Fonts ———

export type FontId = "site" | "condensed" | "mono" | "serif" | "rounded" | "slab" | "hand" | "poster";

export const FONTS: [FontId, string][] = [
  ["site", "Barlow"],
  ["condensed", "Barlow Condensed"],
  ["mono", "JetBrains Mono"],
  ["serif", "Playfair Display"],
  ["rounded", "Nunito"],
  ["slab", "Roboto Slab"],
  ["hand", "Caveat"],
  ["poster", "Anton"],
];

/**
 * Canvas font-family strings per font. Plain fallbacks here; the export studio registers the self-hosted
 * faces (next/font family names) when it opens, so this module stays framework-free.
 */
export const FONT_FAMILIES: Record<FontId, string> = {
  site: "system-ui, sans-serif",
  condensed: "'Arial Narrow', system-ui, sans-serif",
  mono: "ui-monospace, Menlo, monospace",
  serif: "Georgia, serif",
  rounded: "ui-rounded, system-ui, sans-serif",
  slab: "Rockwell, Georgia, serif",
  hand: "'Comic Sans MS', cursive",
  poster: "Impact, 'Arial Narrow', sans-serif",
};

export function registerFonts(map: Partial<Record<FontId, string>>): void {
  Object.assign(FONT_FAMILIES, map);
}

// ——— Text layers ———

export type LayerId = "brand" | "world" | "title" | "metric" | "intro" | "outro" | "free1" | "free2" | "free3";
export type When = "all" | "intro" | "run" | "outro";
export type Box = "none" | "scrim" | "solid";
export type Align = "left" | "center" | "right";

export interface Layer {
  show: boolean;
  /** Wording; may hold tokens ({whatif}, {world}, {metric}, {result}, {from}, {to}, {seed}). Ignored by the metric layer. */
  text: string;
  /** Anchor point as fractions of the frame. */
  x: number;
  y: number;
  /** Which point of the text block sits on (x, y): 0 = left/top, 0.5 = centre, 1 = right/bottom. */
  ax: 0 | 0.5 | 1;
  ay: 0 | 0.5 | 1;
  /** Wrap width as a fraction of the frame width. */
  w: number;
  /** Main size in logical px (the frame is drawn at ×2). */
  size: number;
  color: ColorKey | string;
  font: "title" | "body";
  weight: 400 | 500 | 700;
  align: Align;
  upper: boolean;
  box: Box;
  when: When;
  lines: number;
}

/** Names and what each layer is, for the Text tab. */
export const LAYERS: [LayerId, string, string][] = [
  ["brand", "Brand", "The name in the corner"],
  ["world", "World and seed", "Which world this is"],
  ["title", "What-if line", "The question, while it runs"],
  ["metric", "Key numbers", "The number that changed most, for both worlds"],
  ["intro", "Opening title", "Over the stage before it runs"],
  ["outro", "Result card", "Over the stage at the end"],
  ["free1", "Your text 1", "Anything you like"],
  ["free2", "Your text 2", "Anything you like"],
  ["free3", "Your text 3", "Anything you like"],
];
export const LAYER_IDS = LAYERS.map((l) => l[0]);

export const TOKENS: [string, string][] = [
  ["{whatif}", "the what-if"],
  ["{world}", "world name"],
  ["{metric}", "key number's name"],
  ["{result}", "the result sentence"],
  ["{from}", "start time"],
  ["{to}", "end time"],
  ["{seed}", "seed"],
];

// ——— Layout and timing ———

/**
 * Which worlds an export shows (change 0024): "alt" = changed only (default), "row" = side by side (no change | with
 * changes), "column" = one above the other, "base" = no change only, "auto" = both, side by side or stacked by shape.
 */
export type Split = "auto" | "row" | "column" | "alt" | "base";
export type StageMode = "framed" | "fill" | "small";

export interface Grade {
  /** All −1…1, 0 = unchanged. */
  brightness: number;
  contrast: number;
  saturation: number;
  warmth: number;
  /** Degrees, −180…180. */
  hue: number;
  /** 0…1. */
  vignette: number;
}
export const NO_GRADE: Grade = { brightness: 0, contrast: 0, saturation: 0, warmth: 0, hue: 0, vignette: 0 };

export interface Timing {
  /** Seconds of the running part, or null = pick from the fork's length (6–20 s, as in change 0020). */
  runS: number | null;
  introS: number;
  outroS: number;
  /** Slow down around moments where the worlds split. */
  ease: boolean;
}
export const RUN_RANGE = [3, 60] as const;
export const INTRO_RANGE = [0, 5] as const;
export const OUTRO_RANGE = [0, 8] as const;

export interface ExportStyle {
  v: 1;
  size: SizeId;
  theme: ThemeId | "custom";
  colors: Palette;
  grade: Grade;
  fonts: { title: FontId; body: FontId };
  layers: Record<LayerId, Layer>;
  layout: { split: Split; stage: StageMode; chart: boolean; hud: boolean; cards: boolean };
  timing: Timing;
  /** Video without burned-in text: the stage only. */
  clean: boolean;
}

// ——— Defaults ———

/** The stage's place in the frame, in logical px, for a size and stage mode (and whether a chart strip is under it). */
export function stageRect(size: SizeId, mode: StageMode, chart: boolean): [number, number, number, number] {
  const { w, h } = SIZES[size];
  if (mode === "fill") return chart ? [0, 0, w, h - 108] : [0, 0, w, h];
  const [top, bottom] = size === "youtube" ? [44, 112] : size === "phone" ? [144, 176] : size === "square" ? [84, 112] : [118, 150];
  let r: [number, number, number, number] = [24, top, w - 48, h - top - bottom];
  if (mode === "small") {
    const k = 0.72;
    r = [r[0] + (r[2] * (1 - k)) / 2, r[1] + (r[3] * (1 - k)) / 2, r[2] * k, r[3] * k];
  }
  if (chart) r[3] = Math.max(80, r[3] - 100);
  return r;
}

/** Where the chart strip goes, under the stage. */
export function chartRect(size: SizeId, mode: StageMode): [number, number, number, number] {
  const [x, y, sw, sh] = stageRect(size, mode, true);
  return mode === "fill" ? [24, y + sh + 8, SIZES[size].w - 48, 92] : [x, y + sh + 8, sw, 92];
}

const layer = (o: Partial<Layer>): Layer => ({
  show: true, text: "", x: 0.5, y: 0.5, ax: 0, ay: 0, w: 0.9, size: 18, color: "ink", font: "body", weight: 500,
  align: "left", upper: false, box: "none", when: "all", lines: 3, ...o,
});

/** Today's look (change 0020) for a size, as layers. */
export function defaultLayers(size: SizeId): Record<LayerId, Layer> {
  const { w, h } = SIZES[size];
  const [sx, sy, sw, sh] = stageRect(size, "framed", false);
  const fx = (px: number) => px / w, fy = (px: number) => px / h;
  const wide = isWide(size);
  const card = { x: fx(sx + 32), y: fy(sy + 36), w: (sw - 64) / w, ax: 0 as const, ay: 0 as const };
  const big = size === "youtube" ? 41 : size === "square" ? 29 : 41;
  const free = (y: number): Layer => layer({ show: false, text: "Your text", x: 0.5, y, ax: 0.5, ay: 0.5, w: 0.8, size: 29, align: "center", font: "title", weight: 700, box: "scrim" });
  return {
    brand: layer({ text: "What-If Lab", x: fx(24), y: fy(wide ? 18 : 22), size: 14, upper: true, font: "title", lines: 1 }),
    world: layer({ text: "{world} · seed {seed}", x: 1 - fx(24), y: fy(wide ? 19 : 24), ax: 1, size: 12, color: "ink2", align: "right", upper: true, font: "title", lines: 1, w: 0.5 }),
    title: wide
      ? layer({ text: "{whatif}", x: fx(24), y: fy(h - 112 + 26), w: 0.55, size: 24, lines: 2 })
      : layer({ text: "{whatif}", x: fx(24), y: fy(56), w: (w - 48) / w, size: size === "square" ? 18 : 29, lines: 2 }),
    metric: wide
      ? layer({ x: 0.62, y: fy(h - 112 + 20), w: 0.36, size: 24 })
      : layer({ x: fx(24), y: fy(h - (size === "phone" ? 176 : size === "square" ? 112 : 150) + 30), w: (w - 48) / w, size: size === "phone" ? 41 : 29 }),
    intro: layer({ text: "{whatif}", ...card, size: big, lines: 4, when: "intro", font: "title" }),
    outro: layer({ text: "{result}", ...card, size: big, lines: 3, when: "outro", font: "title" }),
    free1: free(0.5),
    free2: free(0.3),
    free3: free(0.7),
  };
}

export const DEFAULT_TIMING: Timing = { runS: null, introS: 1.2, outroS: 2.5, ease: false };

export function defaultStyle(size: SizeId = "youtube"): ExportStyle {
  return {
    v: 1,
    size,
    theme: "control",
    colors: { ...THEMES.control.colors },
    grade: { ...NO_GRADE },
    fonts: { title: "condensed", body: "site" },
    layers: defaultLayers(size),
    layout: { split: "alt", stage: "framed", chart: false, hud: true, cards: true },
    timing: { ...DEFAULT_TIMING },
    clean: false,
  };
}

/** Switch size; layers the visitor hasn't moved follow the new size's defaults, moved ones keep their place. */
export function withSize(s: ExportStyle, size: SizeId): ExportStyle {
  const was = defaultLayers(s.size), next = defaultLayers(size);
  const layers = { ...s.layers };
  for (const id of LAYER_IDS) {
    const l = s.layers[id], d = was[id];
    const moved = Math.abs(l.x - d.x) > 1e-6 || Math.abs(l.y - d.y) > 1e-6 || Math.abs(l.w - d.w) > 1e-6 || l.size !== d.size || l.ax !== d.ax || l.ay !== d.ay;
    layers[id] = moved ? l : { ...l, x: next[id].x, y: next[id].y, w: next[id].w, size: next[id].size, ax: next[id].ax, ay: next[id].ay };
  }
  return { ...s, size, layers };
}

// ——— Parsing (saved and pasted styles) ———

const num = (v: unknown, lo: number, hi: number, d: number) => (typeof v === "number" && isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
const pick = <T extends string>(v: unknown, ok: readonly T[], d: T): T => (ok.includes(v as T) ? (v as T) : d);
const bool = (v: unknown, d: boolean) => (typeof v === "boolean" ? v : d);
const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
const FONT_IDS = FONTS.map((f) => f[0]);
const COLOR_IDS = COLOR_KEYS.map((c) => c[0]);

function parseLayer(v: unknown, d: Layer): Layer {
  const o = obj(v);
  const anchor = (x: unknown, dd: 0 | 0.5 | 1) => (x === 0 || x === 0.5 || x === 1 ? x : dd);
  const color = typeof o.color === "string" && (COLOR_IDS.includes(o.color as ColorKey) || isHex(o.color)) ? o.color : d.color;
  return {
    show: bool(o.show, d.show),
    text: typeof o.text === "string" ? o.text.slice(0, 280) : d.text,
    x: num(o.x, -0.2, 1.2, d.x), y: num(o.y, -0.2, 1.2, d.y),
    ax: anchor(o.ax, d.ax), ay: anchor(o.ay, d.ay),
    w: num(o.w, 0.1, 1, d.w), size: num(o.size, 8, 120, d.size),
    color,
    font: pick(o.font, ["title", "body"] as const, d.font),
    weight: o.weight === 400 || o.weight === 500 || o.weight === 700 ? o.weight : d.weight,
    align: pick(o.align, ["left", "center", "right"] as const, d.align),
    upper: bool(o.upper, d.upper),
    box: pick(o.box, ["none", "scrim", "solid"] as const, d.box),
    when: pick(o.when, ["all", "intro", "run", "outro"] as const, d.when),
    lines: Math.round(num(o.lines, 1, 8, d.lines)),
  };
}

/** Read a saved or pasted style: unknown fields dropped, numbers clamped, colours checked. Null if it isn't one. */
export function parseStyle(input: unknown): ExportStyle | null {
  let raw: unknown = input;
  if (typeof input === "string") { try { raw = JSON.parse(input); } catch { return null; } }
  const o = obj(raw);
  if (o.v !== 1) return null;
  const size = pick(o.size, SIZE_IDS, "youtube");
  const d = defaultStyle(size);
  const c = obj(o.colors), g = obj(o.grade), f = obj(o.fonts), ly = obj(o.layers), lo = obj(o.layout), t = obj(o.timing);
  const colors = { ...d.colors };
  for (const k of COLOR_IDS) if (isHex(c[k])) colors[k] = c[k] as string;
  const layers = { ...d.layers };
  for (const id of LAYER_IDS) layers[id] = parseLayer(ly[id], d.layers[id]);
  return {
    v: 1,
    size,
    theme: o.theme === "custom" ? "custom" : pick(o.theme, THEME_IDS, "control"),
    colors,
    grade: {
      brightness: num(g.brightness, -1, 1, 0), contrast: num(g.contrast, -1, 1, 0), saturation: num(g.saturation, -1, 1, 0),
      warmth: num(g.warmth, -1, 1, 0), hue: num(g.hue, -180, 180, 0), vignette: num(g.vignette, 0, 1, 0),
    },
    fonts: { title: pick(f.title, FONT_IDS, d.fonts.title), body: pick(f.body, FONT_IDS, d.fonts.body) },
    layers,
    layout: {
      split: pick(lo.split, ["auto", "row", "column", "alt", "base"] as const, "alt"),
      stage: pick(lo.stage, ["framed", "fill", "small"] as const, "framed"),
      chart: bool(lo.chart, false), hud: bool(lo.hud, true), cards: bool(lo.cards, true),
    },
    timing: {
      runS: t.runS === null || t.runS === undefined ? null : num(t.runS, RUN_RANGE[0], RUN_RANGE[1], 10),
      introS: num(t.introS, INTRO_RANGE[0], INTRO_RANGE[1], DEFAULT_TIMING.introS),
      outroS: num(t.outroS, OUTRO_RANGE[0], OUTRO_RANGE[1], DEFAULT_TIMING.outroS),
      ease: bool(t.ease, false),
    },
    clean: bool(o.clean, false),
  };
}

/** Apply a theme's colours. */
export const withTheme = (s: ExportStyle, id: ThemeId): ExportStyle => ({ ...s, theme: id, colors: { ...THEMES[id].colors } });

/** Resolve a layer colour (a palette key or a hex). */
export const colorOf = (s: ExportStyle, c: ColorKey | string): string => (c in s.colors ? s.colors[c as ColorKey] : isHex(c) ? c : s.colors.ink);

export const isNeutral = (g: Grade) => Object.values(g).every((v) => Math.abs(v) < 1e-6);
