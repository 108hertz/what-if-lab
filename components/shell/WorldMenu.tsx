"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
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

const GAP = 2; // px between tabs — mirrors .worldtabs gap

/**
 * Which worlds get a tab (change 0029): as many as fit, in tab order; the rest go under "More".
 * The current world always keeps a tab — if it would overflow, it takes the last visible place.
 * Pure so it can be tested; widths are measured tab widths in px.
 */
export function fitTabs(widths: number[], moreW: number, avail: number, current: number): number[] {
  const all = widths.map((_, i) => i);
  const sum = (n: number) => widths.slice(0, n).reduce((a, w) => a + w, 0) + Math.max(0, n - 1) * GAP;
  if (sum(widths.length) <= avail) return all;
  let n = 0;
  while (n < widths.length && sum(n + 1) + GAP + moreW <= avail) n++;
  n = Math.max(1, n);
  const shown = all.slice(0, n);
  if (current >= n) {
    shown.pop();
    // The current world's tab may be wider than the one it replaces: drop more until it fits.
    const used = () => shown.reduce((a, i) => a + widths[i], 0) + widths[current] + shown.length * GAP + GAP + moreW;
    while (shown.length && used() > avail) shown.pop();
    shown.push(current);
  }
  return shown;
}

/** World switcher (change 0029, replaces the 0021 dropdown): every world as a tab while it fits; the rest under "More". */
export default function WorldMenu({ mode }: { mode: Mode }) {
  const locale = useLocale();
  const t = useT();
  const bar = useRef<HTMLElement>(null);
  const measure = useRef<HTMLDivElement>(null);
  const cur = MODES.indexOf(mode);
  const [shown, setShown] = useState<number[]>(() => MODES.map((_, i) => i));

  const fit = useCallback(() => {
    const el = bar.current, m = measure.current;
    if (!el || !m) return;
    const kids = [...m.children] as HTMLElement[];
    const widths = kids.slice(0, MODES.length).map((k) => k.getBoundingClientRect().width);
    const moreW = kids[MODES.length].getBoundingClientRect().width;
    const next = fitTabs(widths, moreW, el.clientWidth, cur);
    setShown((prev) => (prev.length === next.length && prev.every((v, i) => v === next[i]) ? prev : next));
  }, [cur]);

  useLayoutEffect(() => { fit(); }, [fit, locale]);
  useEffect(() => {
    const ro = new ResizeObserver(fit);
    if (bar.current) ro.observe(bar.current);
    document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [fit]);

  const hidden = MODES.map((_, i) => i).filter((i) => !shown.includes(i));

  return (
    <nav className="worldtabs" aria-label={t("shell.nav.worlds")} ref={bar}>
      {/* Off-screen copy of every tab and the More button: their natural widths drive fitTabs. */}
      <div className="worldtabs-measure" ref={measure} aria-hidden="true">
        {MODES.map((m) => <span key={m} className="worldtab"><Icon name={m} /><span className="lbl">{modeLabel(m)[0]}</span></span>)}
        <span className="worldtab worldtab-more"><span className="lbl">{t("shell.nav.more")}</span><Icon name="chevron" size={16} /></span>
      </div>
      {shown.map((i) => {
        const m = MODES[i], [name, sub] = modeLabel(m);
        return (
          <Link key={m} className="worldtab" href={modeHref(m, locale)} title={sub} aria-current={m === mode ? "page" : undefined}>
            <Icon name={m} />
            <span className="lbl">{name}</span>
          </Link>
        );
      })}
      {hidden.length > 0 && <More modes={hidden.map((i) => MODES[i])} />}
    </nav>
  );
}

/** The "More" popover: worlds without a tab, named with their subtitle. */
function More({ modes }: { modes: Mode[] }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const locale = useLocale();
  const t = useT();

  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLAnchorElement>("a")?.focus();
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
    <div className="worldmenu" ref={wrap}>
      <button ref={btn} className="worldtab worldtab-more" aria-expanded={open} aria-controls="world-more" aria-label={t("shell.nav.moreAria")} onClick={() => setOpen(!open)}>
        <span className="lbl">{t("shell.nav.more")}</span>
        <Icon name="chevron" size={16} />
      </button>
      {open && (
        <ul className="popover worldmenu-list" id="world-more" ref={list} onKeyDown={onKey}>
          {modes.map((m) => {
            const [n, sub] = modeLabel(m);
            return (
              <li key={m}>
                <Link href={modeHref(m, locale)} onClick={() => setOpen(false)}>
                  <Icon name={m} />
                  <span className="lbl">{n}</span>
                  <span className="sub">{sub}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
