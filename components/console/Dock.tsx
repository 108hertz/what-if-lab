"use client";

import { useRef, useState, type ReactNode } from "react";

/** Phone/tablet tool dock: a tablist under the stage. Its panel is the only scrolling region. */
export default function Dock({ tabs }: { tabs: [label: string, content: ReactNode][] }) {
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const i = Math.min(sel, tabs.length - 1);
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const n = (i + d + tabs.length) % tabs.length;
    setSel(n);
    refs.current[n]?.focus();
  };
  return (
    <div className="dock">
      {tabs.length > 1 && (
        <div className="seg dock-tabs" role="tablist" aria-label="Tools" onKeyDown={onKey}>
          {tabs.map(([label], k) => (
            <button
              key={label}
              ref={(el) => { refs.current[k] = el; }}
              role="tab"
              id={`dock-tab-${k}`}
              aria-selected={k === i}
              aria-controls="dock-panel"
              tabIndex={k === i ? 0 : -1}
              onClick={() => setSel(k)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
      <div className="dock-panel scrolly" id="dock-panel" role={tabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={tabs.length > 1 ? `dock-tab-${i}` : undefined}>
        {tabs[i][1]}
      </div>
    </div>
  );
}
