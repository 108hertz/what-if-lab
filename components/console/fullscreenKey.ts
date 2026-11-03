/** True when a keydown should toggle full screen: plain F, not while typing in a field. */
export function isFullscreenKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey: boolean; target: EventTarget | null }): boolean {
  if (e.key !== "f" && e.key !== "F") return false;
  if (e.ctrlKey || e.metaKey || e.altKey) return false;
  const t = e.target as { tagName?: string; isContentEditable?: boolean } | null;
  if (t?.isContentEditable) return false;
  return !["INPUT", "TEXTAREA", "SELECT"].includes(t?.tagName ?? "");
}
