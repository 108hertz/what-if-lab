"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LOCALES, localeInfo, localePath, splitLocale, type LocaleInfo } from "@/lib/i18n";
import { Icon } from "../ui/Icon";
import { useLocale, useT } from "../i18n/I18nProvider";
import { track } from "../privacy/track";

/**
 * Language menu and the "Also in …" hint (change 0025). Lists languages by their own names and opens the same page in
 * that language; no automatic redirect. Only ready languages are listed (in dev, every language, marked when not ready).
 */
const DEV = process.env.NODE_ENV !== "production";
const listed = (): LocaleInfo[] => LOCALES.filter((l) => l.ready || DEV);

const store = {
  get: (k: string) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k: string, v: string) => { try { localStorage.setItem(k, v); } catch {} },
};

/** The page in another language: "/de/lab/earth" → "/ja/lab/earth". */
function useOtherHref(): (code: string) => string {
  const path = usePathname() ?? "/";
  const [, english] = splitLocale(path);
  return (code) => localePath(code, english);
}

export default function LangMenu() {
  const t = useT();
  const locale = useLocale();
  const href = useOtherHref();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const langs = listed();

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLAnchorElement>('[aria-current="page"]')?.focus();
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); btn.current?.focus(); } };
    const click = (e: PointerEvent) => { if (!wrap.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", click);
    return () => { document.removeEventListener("keydown", key); document.removeEventListener("pointerdown", click); };
  }, [open]);

  if (langs.length < 2) return null;
  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    const links = [...(list.current?.querySelectorAll("a") ?? [])];
    const i = links.indexOf(document.activeElement as HTMLAnchorElement);
    links[(i + d + links.length) % links.length]?.focus();
  };
  const name = localeInfo(locale).name;

  return (
    <div className="langmenu" ref={wrap}>
      <button ref={btn} className="iconbtn" aria-expanded={open} aria-controls="lang-list" aria-label={t("shell.lang.button", { name })} title={t("shell.lang.label")} onClick={() => setOpen(!open)}>
        <Icon name="globe" />
      </button>
      {open && (
        <ul className="popover langmenu-list" id="lang-list" ref={list} onKeyDown={onKey} aria-label={t("shell.lang.label")}>
          {langs.map((l) => (
            <li key={l.code}>
              <a href={href(l.code)} hrefLang={l.tag} lang={l.tag} dir={l.dir} aria-current={l.code === locale ? "page" : undefined} onClick={() => { store.set("lang", l.code); track("language", { to: l.code, from: locale }); }}>
                <span>{l.name}</span>
                {!l.ready && <span className="sub">{t("shell.lang.draft")}</span>}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The visitor's first browser language we have and is ready, if it isn't this page's. */
function suggested(locale: string): LocaleInfo | null {
  const ours = new Map(LOCALES.filter((l) => l.ready).map((l) => [l.code, l]));
  for (const tag of navigator.languages ?? [navigator.language]) {
    const code = tag.toLowerCase().split("-")[0];
    const l = ours.get(code);
    if (l) return l.code === locale ? null : l;
  }
  return null;
}

/** "Also in Deutsch ×": shown once per browser until picked or dismissed, never a redirect. Desktop widths only (CSS). */
export function LangHint() {
  const t = useT();
  const locale = useLocale();
  const href = useOtherHref();
  const [l, setL] = useState<LocaleInfo | null>(null);
  useEffect(() => {
    if (store.get("lang") || store.get("langHint")) return;
    setL(suggested(locale));
  }, [locale]);
  if (!l) return null;
  return (
    <span className="lang-hint">
      <a href={href(l.code)} hrefLang={l.tag} onClick={() => store.set("lang", l.code)}>
        {t("shell.lang.alsoIn", { language: l.name })}
      </a>
      <button type="button" className="iconbtn" aria-label={t("shell.lang.dismiss")} title={t("shell.lang.dismiss")} onClick={() => { store.set("langHint", "1"); setL(null); }}>
        <Icon name="close" size={16} />
      </button>
    </span>
  );
}
