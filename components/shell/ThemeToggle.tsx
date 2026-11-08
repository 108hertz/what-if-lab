"use client";

import { useState } from "react";
import { Icon } from "../ui/Icon";
import { useT } from "../i18n/I18nProvider";

/** Graphite (default) ↔ day shift. Only the chrome changes; the stage stays dark. Saved per browser. */
export default function ThemeToggle() {
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === "light");
  const t = useT();
  const toggle = () => {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
  };
  return (
    <button className="iconbtn" onClick={toggle} aria-label={t(light ? "shell.theme.toDark" : "shell.theme.toLight")}>
      <Icon name={light ? "moon" : "sun"} />
    </button>
  );
}
