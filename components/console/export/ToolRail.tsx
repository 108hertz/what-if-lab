"use client";

import { useRef } from "react";
import { Icon, type IconName } from "../../ui/Icon";

export type RailTool = { id: string; label: string; icon: IconName };

/**
 * The phone export editor's tool rail (change 0035): one column of tools on the right of the preview. Tapping a tool opens
 * its settings under the preview; tapping it again closes them. Arrow keys move along the rail.
 */
export default function ToolRail({ tools, active, onPick, disabled, label }: {
  tools: RailTool[];
  active: string | null;
  onPick: (id: string) => void;
  disabled?: boolean;
  label: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const i = refs.current.findIndex((b) => b === document.activeElement);
    refs.current[(i + d + tools.length) % tools.length]?.focus();
  };
  return (
    <div className="tool-rail" role="toolbar" aria-orientation="vertical" aria-label={label} onKeyDown={onKey}>
      {tools.map((tl, k) => (
        <button key={tl.id} ref={(el) => { refs.current[k] = el; }} type="button" aria-pressed={active === tl.id} aria-controls="sp-panel"
          disabled={disabled} onClick={() => onPick(tl.id)}>
          <Icon name={tl.icon} size={20} />
          <span>{tl.label}</span>
        </button>
      ))}
    </div>
  );
}
