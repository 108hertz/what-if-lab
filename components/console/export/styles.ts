/**
 * "My styles" (change 0022): named export styles kept in this browser only, plus the last style used.
 * A per-viewer convenience: every read and write is wrapped, and the studio works the same without storage.
 */
import { parseStyle, type ExportStyle } from "@/lib/export/style";

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
