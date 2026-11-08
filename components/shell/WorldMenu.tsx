"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MODES, WORLDS, modeHref, type Mode } from "@/worlds/registry";
import { Icon } from "../ui/Icon";
import { useLocale, useT } from "../i18n/I18nProvider";
import { metaSay } from "@/lib/sim/say";
import { pageT } from "@/lib/i18n/page";

/** A mode's name and subtitle in the page's language (change 0025). */
export const modeLabel = (m: Mode): [string, string] => {
  if (m === "scale") { const t = pageT(); return [t("common.scale.name"), t("common.scale.sub")]; }
  const say = metaSay(WORLDS[m]);
  return [say("meta.name"), say("meta.sub")];
};

/** World switcher at every width: the current world finishes "what if…"; every world, named, in a popover (change 0021). */
export default function WorldMenu({ mode }: { mode: Mode }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [name] = modeLabel(mode);
  const locale = useLocale();
  const t = useT();

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
    <nav className="worldmenu" aria-label={t("shell.nav.worlds")} ref={wrap}>
      <button ref={btn} className="worldmenu-btn" aria-expanded={open} aria-controls="world-list" aria-label={t("shell.nav.worldButton", { name })} onClick={() => setOpen(!open)}>
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
                <Link href={modeHref(m, locale)} aria-current={m === mode ? "page" : undefined} onClick={() => setOpen(false)}>
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
