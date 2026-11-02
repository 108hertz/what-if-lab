"use client";

import { useState } from "react";
import { Icon } from "../ui/Icon";

/** Darkroom (default) ↔ paper. Only the chrome changes; the stage stays dark. Saved per browser. */
export default function ThemeToggle() {
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === "light");
  const toggle = () => {
    const next = !light;
    setLight(next);
    if (next) document.documentElement.dataset.theme = "light";
    else delete document.documentElement.dataset.theme;
    try { localStorage.setItem("theme", next ? "light" : "dark"); } catch {}
  };
  return (
    <button className="iconbtn" onClick={toggle} aria-label={light ? "Switch to dark theme" : "Switch to light theme"}>
      <Icon name={light ? "moon" : "sun"} />
    </button>
  );
}
