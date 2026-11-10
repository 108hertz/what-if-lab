"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../ui/Icon";
import { useT } from "../../i18n/I18nProvider";

/**
 * Phone tool sheet (change 0035): a modal <dialog> docked to the bottom edge (to the right side on phones held sideways),
 * at most 72 % of the screen tall so the top of the stage stays in view under a light scrim. Drag the grabber down,
 * press Escape or tap outside to close. Its content scrolls inside; the page never does.
 */
export default function Sheet({ open, onClose, title, count, children, className }: {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Optional mono count after the title (e.g. how many changes are on). */
  count?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const t = useT();
  const close = useRef(onClose);
  close.current = onClose;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const cancel = (e: Event) => { e.preventDefault(); close.current(); };
    // A click on the ::backdrop lands on the dialog element itself
    const click = (e: MouseEvent) => { if (e.target === d) close.current(); };
    d.addEventListener("cancel", cancel);
    d.addEventListener("click", click);
    return () => { d.removeEventListener("cancel", cancel); d.removeEventListener("click", click); };
  }, []);

  // Drag the head down to close (bottom sheets only; the side sheet has its ×)
  const drag = useRef<{ y: number; dy: number } | null>(null);
  const onDown = (e: React.PointerEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button")) return;
    drag.current = { y: e.clientY, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const g = drag.current, d = ref.current;
    if (!g || !d) return;
    g.dy = Math.max(0, e.clientY - g.y);
    d.style.transform = g.dy ? `translateY(${g.dy}px)` : "";
  };
  const onUp = () => {
    const g = drag.current, d = ref.current;
    drag.current = null;
    if (!g || !d) return;
    d.style.transform = "";
    if (g.dy > 72) close.current();
  };

  return createPortal(
    <dialog ref={ref} className={`psheet${className ? " " + className : ""}`} aria-labelledby={id}>
      {open && (
        <>
          <header className="psheet-head" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            <span className="grabber" aria-hidden="true" />
            <h2 className="psheet-title" id={id}>{title}{count != null && <span className="hcount">{count}</span>}</h2>
            <button type="button" className="iconbtn" aria-label={t("console.phone.close")} onClick={() => close.current()}>
              <Icon name="close" size={18} />
            </button>
          </header>
          <div className="psheet-body">{children}</div>
        </>
      )}
    </dialog>,
    document.body,
  );
}
