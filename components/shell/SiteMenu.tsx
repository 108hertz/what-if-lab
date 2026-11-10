"use client";

import { useEffect, useRef, useState } from "react";
import { SOCIALS } from "@/lib/site";
import { localeInfo } from "@/lib/i18n";
import { Icon, type IconName } from "../ui/Icon";
import { useHref, useLocale, useT } from "../i18n/I18nProvider";
import { GA_ID } from "../privacy/config";
import { CONSENT_OPEN_EVENT } from "../privacy/consent";
import { AccountPanel, useAccountLabel } from "../account/AccountMenu";
import { LangItems, hasLanguages } from "./LangMenu";
import { setTheme } from "./ThemeToggle";

const SOCIAL_ICON: Record<string, IconName> = { instagram: "camera", tiktok: "note" };

type View = "main" | "account" | "lang";

/**
 * The site menu (change 0032): the last button in the top bar on every page. About, Privacy policy, Terms of use,
 * Privacy settings (only when analytics asks for consent) and the Instagram / TikTok profiles once they are set.
 * Consoles keep no footer (one viewport), so this is where those links live.
 *
 * With `settings` (the lab's bar), phones (< 768 px) also find Account, Language and the theme here, at the top of the
 * list, because the bar hides those buttons to give the world tabs their names. Account and Language open as views
 * inside this popover, with a back row. CSS hides these rows from 768 px, where the buttons are in the bar.
 */
export default function SiteMenu({ settings }: { settings?: { account: boolean } }) {
  const t = useT();
  const href = useHref();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("main");
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLElement>(null);
  const socials = SOCIALS();

  const close = (focus = false) => { setOpen(false); setView("main"); if (focus) btn.current?.focus(); };

  useEffect(() => {
    if (!open) return;
    const el = list.current;
    (el?.querySelector<HTMLElement>('[aria-current="page"]') ?? el?.querySelector<HTMLElement>("a, button, input"))?.focus();
  }, [open, view]);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (view !== "main") setView("main");
      else close(true);
    };
    const click = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) close(); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", click); };
  }, [open, view]);

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const items = [...(list.current?.querySelectorAll<HTMLElement>("a, button, input") ?? [])].filter((x) => x.offsetParent !== null);
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + d + items.length) % items.length]?.focus();
  };

  const back = (
    <button type="button" className="sitemenu-back" onClick={() => setView("main")}>
      <span className="sitemenu-ico"><Icon name="chevron" size={18} />{t("shell.site.back")}</span>
    </button>
  );

  return (
    <div className="langmenu sitemenu" ref={wrap}>
      <button ref={btn} className="iconbtn" aria-expanded={open} aria-controls="site-list" aria-label={t("shell.site.menu")} title={t("shell.site.menu")} onClick={() => (open ? close() : setOpen(true))}>
        <Icon name="dots" />
      </button>
      {open && view === "account" && settings?.account && (
        <div className="popover account-menu sitemenu-account" id="site-list" ref={list as React.RefObject<HTMLDivElement>} onKeyDown={onKey}>
          {back}
          <AccountPanel onDone={() => close()} />
        </div>
      )}
      {open && view === "lang" && (
        <ul className="popover langmenu-list" id="site-list" ref={list as React.RefObject<HTMLUListElement>} onKeyDown={onKey} aria-label={t("shell.lang.label")}>
          <li>{back}</li>
          <li className="sitemenu-sep" role="separator" aria-hidden="true" />
          <LangItems />
        </ul>
      )}
      {open && view === "main" && (
        <ul className="popover langmenu-list" id="site-list" ref={list as React.RefObject<HTMLUListElement>} onKeyDown={onKey} aria-label={t("shell.site.menu")}>
          {settings && (
            <>
              {settings.account && <li className="sitemenu-phone"><AccountRow onOpen={() => setView("account")} /></li>}
              {hasLanguages() && (
                <li className="sitemenu-phone">
                  <button type="button" onClick={() => setView("lang")}>
                    <span className="sitemenu-ico"><Icon name="globe" size={18} />{t("shell.lang.label")}</span>
                    <span className="sitemenu-aside">{localeInfo(locale).name}<Icon name="chevron" size={16} /></span>
                  </button>
                </li>
              )}
              <li className="sitemenu-phone"><ThemeRow /></li>
              <li className="sitemenu-sep sitemenu-phone" role="separator" aria-hidden="true" />
            </>
          )}
          <li><a href={href("/about")}><span>{t("shell.site.about")}</span></a></li>
          <li><a href={href("/privacy")}><span>{t("shell.site.privacy")}</span></a></li>
          <li><a href={href("/terms")}><span>{t("shell.site.terms")}</span></a></li>
          {GA_ID && (
            <li>
              <button type="button" onClick={() => { close(); window.dispatchEvent(new Event(CONSENT_OPEN_EVENT)); }}>
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

/** "Account · Sign in ›": opens the account view (only rendered inside the lab, under the account provider). */
function AccountRow({ onOpen }: { onOpen: () => void }) {
  const t = useT();
  const { label, plan, signedIn } = useAccountLabel();
  // Signed in: the plan (or the name); signed out: "Sign in"; otherwise nothing beside "Account".
  const aside = signedIn ? plan ?? label : label !== t("account.menu.account") ? label : null;
  return (
    <button type="button" onClick={onOpen}>
      <span className="sitemenu-ico"><Icon name="user" size={18} />{t("account.menu.account")}</span>
      <span className="sitemenu-aside">{aside && <span className="sitemenu-aside-text">{aside}</span>}<Icon name="chevron" size={16} /></span>
    </button>
  );
}

/** Light ↔ dark in one tap; the menu stays open so the change is seen. Rendered only once the menu is open (browser). */
function ThemeRow() {
  const t = useT();
  const [light, setLight] = useState(() => document.documentElement.dataset.theme === "light");
  return (
    <button type="button" onClick={() => setLight(setTheme(!light))}>
      <span className="sitemenu-ico"><Icon name={light ? "moon" : "sun"} size={18} />{t(light ? "shell.theme.toDark" : "shell.theme.toLight")}</span>
    </button>
  );
}
