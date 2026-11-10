"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useT } from "../../i18n/I18nProvider";
import { Icon } from "../../ui/Icon";

/**
 * Phone results (change 0035): a strip under the stage that shows the gist (`peek`), and rises to fill the screen with the
 * world's result tabs (Now · Chart · Log · About). Drag its head, tap it, swipe up on it or scroll the wheel to open; drag
 * down, tap the head or pull down from the top of its content to close. While it moves, `--open` (0…1) is written on the
 * console so the stage shrinks with it; the stage keeps running at the top.
 */
export default function ResultsDrawer({ tabs, peek, open, setOpen, host }: {
  tabs: [label: string, content: ReactNode][];
  peek: ReactNode;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** The console element that carries `--open` (stage and drawer read it). */
  host: React.RefObject<HTMLElement | null>;
}) {
  const t = useT();
  const [sel, setSel] = useState(0);
  const i = Math.min(sel, tabs.length - 1);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const body = useRef<HTMLDivElement>(null);
  const drawer = useRef<HTMLDivElement>(null);
  const openRef = useRef(open);
  openRef.current = open;

  /** How far a full open travels: the room between the peek height and the open height. */
  const travel = () => {
    const h = host.current, d = drawer.current;
    if (!h || !d) return 300;
    return Math.max(120, h.clientHeight * 0.55);
  };
  const setLive = useCallback((v: number | null) => {
    const h = host.current;
    if (!h) return;
    if (v == null) { h.style.removeProperty("--open"); h.classList.remove("is-dragging"); return; }
    h.style.setProperty("--open", String(Math.max(0, Math.min(1, v))));
    h.classList.add("is-dragging");
  }, [host]);

  // Head: drag, or tap to toggle
  const drag = useRef<{ y: number; from: number; moved: boolean; v: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("[role=tab]")) return;
    drag.current = { y: e.clientY, from: openRef.current ? 1 : 0, moved: false, v: openRef.current ? 1 : 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current;
    if (!g) return;
    const dy = e.clientY - g.y;
    if (!g.moved && Math.abs(dy) < 6) return;
    g.moved = true;
    g.v = g.from - dy / travel();
    setLive(g.v);
  };
  const onUp = () => {
    const g = drag.current;
    drag.current = null;
    if (!g) return;
    setLive(null);
    if (!g.moved) setOpen(!openRef.current);
    else setOpen(g.from ? g.v > 0.7 : g.v > 0.3);
  };

  // Content: pull down from the top to close (touch), wheel up/down at the edges (mouse)
  useEffect(() => {
    const el = body.current, dr = drawer.current;
    if (!el || !dr) return;
    let start: { y: number; top: boolean } | null = null, v = 1;
    const ts = (e: TouchEvent) => { start = { y: e.touches[0].clientY, top: el.scrollTop <= 0 }; v = 1; };
    const tm = (e: TouchEvent) => {
      if (!start?.top || !openRef.current) return;
      const dy = e.touches[0].clientY - start.y;
      if (dy <= 8) { setLive(null); return; }
      v = 1 - (dy - 8) / travel();
      setLive(v);
    };
    const te = () => { if (start?.top && v < 1) { setLive(null); if (v < 0.7) setOpen(false); } start = null; v = 1; };
    const wheel = (e: WheelEvent) => {
      if (!openRef.current && e.deltaY > 0) setOpen(true);
      else if (openRef.current && e.deltaY < -20 && el.scrollTop <= 0) setOpen(false);
    };
    el.addEventListener("touchstart", ts, { passive: true });
    el.addEventListener("touchmove", tm, { passive: true });
    el.addEventListener("touchend", te);
    el.addEventListener("touchcancel", te);
    dr.addEventListener("wheel", wheel, { passive: true });
    return () => {
      el.removeEventListener("touchstart", ts); el.removeEventListener("touchmove", tm);
      el.removeEventListener("touchend", te); el.removeEventListener("touchcancel", te); dr.removeEventListener("wheel", wheel);
    };
  }, [setOpen, setLive]); // eslint-disable-line react-hooks/exhaustive-deps

  const onKey = (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!d) return;
    const n = (i + d + tabs.length) % tabs.length;
    setSel(n);
    refs.current[n]?.focus();
  };

  return (
    <div className={`drawer${open ? " is-open" : ""}`} ref={drawer}>
      <div className="drawer-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
        <button type="button" className="drawer-grab" aria-expanded={open} aria-controls="drawer-body"
          aria-label={t(open ? "console.phone.closeResults" : "console.phone.openResults")}
          onClick={(e) => { if (e.detail === 0) setOpen(!open); /* keyboard; pointer taps are handled on the head */ }}>
          <span className="grabber" aria-hidden="true" />
          <Icon name="chevron" size={16} />
        </button>
        {open ? (
          <div className="seg words drawer-tabs" role="tablist" aria-label={t("console.phone.results")} onKeyDown={onKey}>
            {tabs.map(([label], k) => (
              <button key={label} ref={(el) => { refs.current[k] = el; }} role="tab" id={`drawer-tab-${k}`} aria-selected={k === i}
                aria-controls="drawer-body" tabIndex={k === i ? 0 : -1} onClick={() => setSel(k)}>{label}</button>
            ))}
          </div>
        ) : (
          <div className="drawer-peek">{peek}</div>
        )}
      </div>
      <div className="drawer-body scrolly" id="drawer-body" ref={body} role={open ? "tabpanel" : undefined}
        aria-labelledby={open ? `drawer-tab-${i}` : undefined} hidden={!open} inert={!open || undefined}>
        {open && tabs[i][1]}
      </div>
    </div>
  );
}
