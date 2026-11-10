/**
 * "My styles" (change 0022): named export styles kept in this browser only, plus the last style used.
 * A per-viewer convenience: every read and write is wrapped, and the studio works the same without storage.
 */
import { INTRO_RANGE, NO_INTRO, parseStyle, type ExportStyle, type Intro } from "@/lib/export/style";

const LIST = "export-styles";
const LAST = "export-style-last";

export interface SavedStyle { name: string; style: ExportStyle }

function read(key: string): unknown {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : null; } catch { return null; }
}
function write(key: string, v: unknown): boolean {
  try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch { return false; }
}

export function savedStyles(): SavedStyle[] {
  const raw = read(LIST);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const style = parseStyle(x?.style);
    return style && typeof x?.name === "string" ? [{ name: x.name.slice(0, 40), style }] : [];
  }).slice(0, 30);
}

/** Save (or replace) a named style. Returns the new list. */
export function saveStyle(name: string, style: ExportStyle): SavedStyle[] {
  const list = savedStyles().filter((s) => s.name !== name);
  list.unshift({ name: name.slice(0, 40), style });
  write(LIST, list.slice(0, 30));
  return savedStyles();
}

export function deleteStyle(name: string): SavedStyle[] {
  write(LIST, savedStyles().filter((s) => s.name !== name));
  return savedStyles();
}

export const lastStyle = (): ExportStyle | null => parseStyle(read(LAST));
export const rememberStyle = (s: ExportStyle): void => { write(LAST, s); };

// ——— My intros (change 0034): an intro template with its words, colour and length, saved under a name ———

const INTROS_KEY = "export-intros";

export interface SavedIntro { name: string; intro: Intro; seconds: number }

/** Read a saved or pasted intro; null if it isn't one. */
export function parseIntro(input: unknown): { intro: Intro; seconds: number } | null {
  let raw: unknown = input;
  if (typeof input === "string") { try { raw = JSON.parse(input); } catch { return null; } }
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== "what-if-lab-intro") return null;
  // Reuse the style parser's checks: an intro is read as part of a style
  const s = parseStyle({ v: 2, intro: o.intro });
  if (!s || !o.intro || typeof o.intro !== "object") return null;
  const sec = typeof o.seconds === "number" && isFinite(o.seconds) ? Math.min(INTRO_RANGE[1], Math.max(0.5, o.seconds)) : 3;
  return { intro: s.intro, seconds: sec };
}

export const introText = (intro: Intro, seconds: number) => JSON.stringify({ kind: "what-if-lab-intro", intro, seconds });

export function savedIntros(): SavedIntro[] {
  const raw = read(INTROS_KEY);
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((x) => {
    const p = parseIntro(x?.data);
    return p && typeof x?.name === "string" ? [{ name: x.name.slice(0, 40), ...p }] : [];
  }).slice(0, 30);
}

export function saveIntro(name: string, intro: Intro, seconds: number): SavedIntro[] {
  const list = savedIntros().filter((s) => s.name !== name).map((s) => ({ name: s.name, data: introText(s.intro, s.seconds) }));
  list.unshift({ name: name.slice(0, 40), data: introText(intro, seconds) });
  write(INTROS_KEY, list.slice(0, 30));
  return savedIntros();
}

export function deleteIntro(name: string): SavedIntro[] {
  write(INTROS_KEY, savedIntros().filter((s) => s.name !== name).map((s) => ({ name: s.name, data: introText(s.intro, s.seconds) })));
  return savedIntros();
}

export { NO_INTRO };
