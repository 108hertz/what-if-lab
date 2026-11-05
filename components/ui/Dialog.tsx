"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

/**
 * Modal sheet on the native <dialog> (top layer, focus trap, Esc). Used only where focus must be protected:
 * buying Premium and recording an export. Walnut-raised, 12 px radius, cork hairline, no shadow (DESIGN.md).
 * On phones it docks to the bottom edge as a sheet.
 */
export default function Dialog({ open, onClose, title, children, className, closeLabel = "Close", locked }: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  /** While true (e.g. recording), Esc and outside clicks do nothing; the dialog offers its own Cancel. */
  locked?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    const cancel = (e: Event) => { e.preventDefault(); if (!lockedRef.current) onClose(); };
    // A click on the ::backdrop lands on the dialog element itself
    const click = (e: MouseEvent) => { if (e.target === d && !lockedRef.current) onClose(); };
    d.addEventListener("cancel", cancel);
    d.addEventListener("click", click);
    return () => { d.removeEventListener("cancel", cancel); d.removeEventListener("click", click); };
  }, [onClose]);

  // Portalled to <body> so the sheet takes the page theme, not the on-stage colours of wherever it was opened.
  return createPortal(
    <dialog ref={ref} className={`sheet${className ? " " + className : ""}`} aria-labelledby={id}>
      {open && (
        <div className="sheet-body">
          <header className="sheet-head">
            <h2 className="headline sheet-title" id={id}>{title}</h2>
            <button type="button" className="iconbtn" aria-label={closeLabel} onClick={onClose} disabled={locked}>
              <Icon name="close" size={18} />
            </button>
          </header>
          {children}
        </div>
      )}
    </dialog>,
    document.body,
  );
}
