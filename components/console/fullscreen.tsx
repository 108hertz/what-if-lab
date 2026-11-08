"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useT } from "../i18n/I18nProvider";
import { Icon } from "../ui/Icon";
import { isFullscreenKey } from "./fullscreenKey";

/**
 * Full screen for the console's main UI (change 0013). Uses the Fullscreen API where an element can go full
 * screen; elsewhere (iPhone Safari) it adds a `full` class that pins the element over the viewport.
 */
export function useFullscreen(ref: RefObject<HTMLElement | null>) {
  const [native, setNative] = useState(false);
  const [fallback, setFallback] = useState(false);
  const fallbackRef = useRef(false);
  fallbackRef.current = fallback;

  const toggle = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    if (document.fullscreenElement) { void document.exitFullscreen(); return; }
    if (fallbackRef.current) { setFallback(false); return; }
    if (typeof el.requestFullscreen === "function" && document.fullscreenEnabled !== false) {
      // Some embedded webviews never settle the request: if nothing happened after a moment, fill the viewport instead
      let settled = false;
      const fill = () => { if (!settled) { settled = true; if (document.fullscreenElement !== el) setFallback(true); } };
      el.requestFullscreen().then(() => { settled = true; }, fill);
      window.setTimeout(fill, 900);
    } else {
      setFallback(true);
    }
  }, [ref]);

  useEffect(() => {
    const onChange = () => {
      const on = document.fullscreenElement === ref.current && ref.current !== null;
      setNative(on);
      if (on) setFallback(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && fallback) { setFallback(false); return; }
      if (e.repeat || !isFullscreenKey(e)) return;
      e.preventDefault();
      toggle();
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("fullscreenchange", onChange); document.removeEventListener("keydown", onKey); };
  }, [ref, toggle, fallback]);

  useEffect(() => { ref.current?.classList.toggle("full", fallback); }, [ref, fallback]);

  return { on: native || fallback, toggle };
}

/** Transport button (right end). Must sit inside the element `useFullscreen` controls. */
export function FullscreenButton({ on, toggle }: { on: boolean; toggle: () => void }) {
  const t = useT();
  const label = t(on ? "console.fullscreen.leave" : "console.fullscreen.enter");
  return (
    <button type="button" className="btn fs-btn" aria-label={label} title={t("console.fullscreen.title", { label })} aria-pressed={on} onClick={toggle}>
      <Icon name={on ? "shrink" : "expand"} size={18} />
    </button>
  );
}
