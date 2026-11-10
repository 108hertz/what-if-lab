"use client";

import { useEffect, useRef, useState } from "react";
import { SOCIALS } from "@/lib/site";
import { Icon, type IconName } from "../ui/Icon";
import { useHref, useT } from "../i18n/I18nProvider";
import { GA_ID } from "../privacy/config";
import { CONSENT_OPEN_EVENT } from "../privacy/consent";

const SOCIAL_ICON: Record<string, IconName> = { instagram: "camera", tiktok: "note" };

/**
 * The site menu (change 0032): the last button in the top bar on every page. About, Privacy policy, Terms of use,
 * Privacy settings (only when analytics asks for consent) and the Instagram / TikTok profiles once they are set.
 * Consoles keep no footer (one viewport), so this is where those links live.
 */
export default function SiteMenu() {
  const t = useT();
  const href = useHref();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const socials = SOCIALS();

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("a, button")?.focus();
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
    const items = [...(list.current?.querySelectorAll<HTMLElement>("a, button") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + d + items.length) % items.length]?.focus();
  };

  return (
    <div className="langmenu sitemenu" ref={wrap}>
      <button ref={btn} className="iconbtn" aria-expanded={open} aria-controls="site-list" aria-label={t("shell.site.menu")} title={t("shell.site.menu")} onClick={() => setOpen(!open)}>
        <Icon name="dots" />
      </button>
      {open && (
        <ul className="popover langmenu-list" id="site-list" ref={list} onKeyDown={onKey} aria-label={t("shell.site.menu")}>
          <li><a href={href("/about")}><span>{t("shell.site.about")}</span></a></li>
          <li><a href={href("/privacy")}><span>{t("shell.site.privacy")}</span></a></li>
          <li><a href={href("/terms")}><span>{t("shell.site.terms")}</span></a></li>
          {GA_ID && (
            <li>
              <button type="button" onClick={() => { setOpen(false); window.dispatchEvent(new Event(CONSENT_OPEN_EVENT)); }}>
                <span>{t("shell.site.settings")}</span>
              </button>
            </li>
          )}
          {socials.length > 0 && <li className="sitemenu-sep" role="separator" aria-hidden="true" />}
          {socials.map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener me">
                <span className="sitemenu-ico"><Icon name={SOCIAL_ICON[s.id]} size={18} />{s.name}</span>
                <Icon name="external" size={16} />
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
