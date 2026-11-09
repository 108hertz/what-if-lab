"use client";

import { useEffect, useState } from "react";
import Dialog from "../ui/Dialog";
import { Icon } from "../ui/Icon";
import { useT } from "../i18n/I18nProvider";
import { DISCLAIMER_EVENT, disclaimerSeen, markDisclaimerSeen, safeStore } from "./disclaimerRule";

const store = safeStore(() => localStorage);

/**
 * "Simulation · not real" (change 0028): a small amber label in the top bar on every page, and a short note that opens by
 * itself once per browser, after the boot scene has gone. Closing it any way marks it seen; the label opens it again.
 */
export default function Disclaimer() {
  const [open, setOpen] = useState(false);
  const t = useT();

  useEffect(() => {
    if (disclaimerSeen(store)) return;
    const root = document.documentElement;
    let timer = 0;
    const show = () => { timer = window.setTimeout(() => setOpen(true), 400); };
    if (root.dataset.booted || !root.dataset.js) { show(); return () => clearTimeout(timer); }
    const mo = new MutationObserver(() => { if (root.dataset.booted) { mo.disconnect(); show(); } });
    mo.observe(root, { attributes: true, attributeFilter: ["data-booted"] });
    return () => { mo.disconnect(); clearTimeout(timer); };
  }, []);

  const close = () => {
    setOpen(false);
    if (!disclaimerSeen(store)) markDisclaimerSeen(store);
    window.dispatchEvent(new Event(DISCLAIMER_EVENT));
  };

  return (
    <>
      <button type="button" className="disclaimer-chip" onClick={() => setOpen(true)} aria-label={t("shell.disclaimer.labelAria")} title={t("shell.disclaimer.labelAria")}>
        <Icon name="info" size={16} />
        <span className="disclaimer-chip-text">{t("shell.disclaimer.label")}</span>
      </button>
      <Dialog open={open} onClose={close} title={t("shell.disclaimer.title")} closeLabel={t("shell.disclaimer.ok")} className="disclaimer">
        <p className="desc">{t("shell.disclaimer.body")}</p>
        <p className="desc disclaimer-use">{t("shell.disclaimer.use")}</p>
        <div className="sheet-actions">
          <button type="button" className="btn primary" onClick={close} autoFocus><Icon name="check" size={18} />{t("shell.disclaimer.ok")}</button>
        </div>
      </Dialog>
    </>
  );
}
