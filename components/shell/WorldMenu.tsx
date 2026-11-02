"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MODES, modeHref, type Mode } from "@/worlds/registry";
import { modeLabel } from "./Tabs";
import { Icon } from "../ui/Icon";

/** Phone world switcher (< 768 px): the current world as a button; all worlds, named, in a popover. */
export default function WorldMenu({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [name] = modeLabel(mode);

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const click = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", click); };
  }, [open]);

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const links = [...(list.current?.querySelectorAll("a") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    links[(i + d + links.length) % links.length]?.focus();
  };

  return (
    <nav className="worldmenu" aria-label="Worlds" ref={wrap}>
      <button ref={btn} className="worldmenu-btn" aria-expanded={open} aria-controls="world-list" onClick={() => setOpen(!open)}>
        <Icon name={mode} />
        <span className="lbl">{name}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className="popover worldmenu-list" id="world-list" ref={list} onKeyDown={onKey}>
          {MODES.map((m) => {
            const [n, sub] = modeLabel(m);
            return (
              <li key={m}>
                <Link href={modeHref(m)} aria-current={m === mode ? "page" : undefined} onClick={() => setOpen(false)}>
                  <Icon name={m} />
                  <span className="lbl">{n}</span>
                  <span className="sub">{sub}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
