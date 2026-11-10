"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useT } from "../i18n/I18nProvider";
import { DISCLAIMER_EVENT, DISCLAIMER_KEY } from "./disclaimerRule";

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

const THEME_EVENT = "lab:theme";

/** Switch the chrome's theme and remember it for this browser. Returns whether it is now light. */
export function setTheme(light: boolean): boolean {
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  store.set("theme", light ? "light" : "dark");
  window.dispatchEvent(new Event(THEME_EVENT));
  return light;
}

/**
 * Graphite (default) ↔ day shift. Only the chrome changes; the stage stays dark. Saved per browser.
 * First visit: once the boot scene has gone, a small tip under the button says light is one click away. It shows once per
 * browser (never for someone who has already picked a theme) and goes on ×, Escape, a click elsewhere or switching.
 * It waits for the first-open simulation note (change 0028) to be closed, so the two never show at once.
 */
export default function ThemeToggle() {
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === "light");
  const [tip, setTip] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const t = useT();

  useEffect(() => {
    if (store.get("theme") || store.get("themeHint")) return;
    const root = document.documentElement;
    let timer = 0;
    const show = () => { timer = window.setTimeout(() => { store.set("themeHint", "1"); setTip(true); }, 400); };
    if (store.get(DISCLAIMER_KEY) !== "1") {
      const after = () => show();
      window.addEventListener(DISCLAIMER_EVENT, after, { once: true });
      return () => { window.removeEventListener(DISCLAIMER_EVENT, after); clearTimeout(timer); };
    }
    if (root.dataset.booted || !root.dataset.js) { show(); return () => clearTimeout(timer); }
    const mo = new MutationObserver(() => { if (root.dataset.booted) { mo.disconnect(); show(); } });
    mo.observe(root, { attributes: true, attributeFilter: ["data-booted"] });
    return () => { mo.disconnect(); clearTimeout(timer); };
  }, []);

  // The site menu can switch the theme too (phones): follow it.
  useEffect(() => {
    const sync = () => setLight(document.documentElement.dataset.theme === "light");
    window.addEventListener(THEME_EVENT, sync);
    return () => window.removeEventListener(THEME_EVENT, sync);
  }, []);

  useEffect(() => {
    if (!tip) return;
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") setTip(false); };
    const click = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setTip(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", click); };
  }, [tip]);

  const toggle = () => {
    setLight(setTheme(!light));
    setTip(false);
  };
  return (
    <div className="themetoggle" ref={wrap}>
      <button className="iconbtn" onClick={toggle} aria-label={t(light ? "shell.theme.toDark" : "shell.theme.toLight")} aria-describedby={tip ? "theme-tip" : undefined}>
        <Icon name={light ? "moon" : "sun"} />
      </button>
      {tip && (
        <div className="theme-tip" id="theme-tip" role="status">
          <p>{t("shell.theme.tip")}</p>
          <button type="button" className="iconbtn" aria-label={t("shell.theme.tipClose")} title={t("shell.theme.tipClose")} onClick={() => setTip(false)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
