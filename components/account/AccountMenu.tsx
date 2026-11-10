"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useAccount, usePremium } from "./context";
import type { Account } from "./state";
import type { T } from "@/lib/i18n/t";
import { useT } from "../i18n/I18nProvider";

/** Short line under the name in the menu for each state. */
function statusLine(a: Account, t: T): string {
  switch (a.status) {
    case "off": return t("account.status.off");
    case "loading": return t("account.status.loading");
    case "signed-out": return t("account.status.signedOut");
    case "free": return t("account.status.free");
    case "premium": return t("account.status.premium");
    case "error": return a.error ?? t("account.status.error");
  }
}

/**
 * Nav account button and its popover (change 0020). Icon-only below 1600 px; with a short label from 1600 px.
 * Every action opens the provider's own window over the lab; nothing navigates away.
 */
export default function AccountMenu() {
  const a = useAccount();
  const t = useT();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    panel.current?.querySelector<HTMLElement>("button")?.focus();
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
    const items = [...(panel.current?.querySelectorAll<HTMLElement>("button, input") ?? [])];
    const i = items.indexOf(document.activeElement as HTMLElement);
    items[(i + d + items.length) % items.length]?.focus();
  };

  const { label, plan } = useAccountLabel();

  return (
    <div className="account" ref={wrap}>
      <button
        ref={btn}
        className="account-btn"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={plan ? t("account.menu.buttonLabel", { label, plan }) : label}
        onClick={() => setOpen(!open)}
      >
        <Icon name="user" />
        <span className="lbl account-name">{label}</span>
        {a.isPremium && <span className="micro account-plan">{t("account.menu.premium")}</span>}
      </button>
      {open && (
        <div className="popover account-menu" id="account-menu" ref={panel} onKeyDown={onKey}>
          <AccountPanel onDone={() => setOpen(false)} />
        </div>
      )}
    </div>
  );
}

/** The button label and plan name for the current account state. */
export function useAccountLabel(): { label: string; plan: string | null; signedIn: boolean } {
  const a = useAccount();
  const t = useT();
  const signedIn = a.status === "free" || a.status === "premium";
  const label = signedIn ? a.user?.name ?? t("account.menu.account") : a.status === "signed-out" ? t("account.menu.signIn") : t("account.menu.account");
  const plan = a.isPremium ? t("account.menu.premium") : signedIn ? t("account.menu.free") : null;
  return { label, plan, signedIn };
}

/** What the account popover holds: who you are, the status line and the actions. Also shown inside the site menu on phones. */
export function AccountPanel({ onDone }: { onDone: () => void }) {
  const a = useAccount();
  const premium = usePremium();
  const t = useT();
  const { plan, signedIn } = useAccountLabel();
  const run = (fn: () => void) => () => { onDone(); fn(); };
  return (
    <>
      <div className="account-who">
        {signedIn && a.user ? (
          <>
            <span className="account-who-name">{a.user.name}</span>
            {a.user.email && <span className="small account-who-mail">{a.user.email}</span>}
          </>
        ) : (
          <span className="account-who-name">{t("account.menu.yourAccount")}</span>
        )}
        {plan && <span className="micro">{t("account.menu.plan", { plan })}</span>}
      </div>
      <p className={`small account-note${a.status === "error" ? " is-error" : ""}`} role={a.status === "error" ? "alert" : undefined}>
        {statusLine(a, t)}
        {a.status === "error" && a.isPremium && " " + t("account.status.keepPremium")}
      </p>
      <div className="account-actions">
        {a.status === "signed-out" && (
          <>
            <button className="menu-row" onClick={run(a.signIn)}>{t("account.menu.signIn")}</button>
            <button className="menu-row" onClick={run(a.signUp)}>{t("account.menu.createAccount")}</button>
          </>
        )}
        {(a.status === "signed-out" || a.status === "free") && (
          <button className="menu-row" onClick={run(() => premium.open("menu"))}>
            {t("account.menu.goPremium")} <span className="menu-aside">{t("account.menu.price")}</span>
          </button>
        )}
        {a.status === "premium" && <button className="menu-row" onClick={run(a.manage)}>{t("account.menu.manage")}</button>}
        {signedIn && <button className="menu-row" onClick={run(a.profile)}>{t("account.menu.settings")}</button>}
        {signedIn && <button className="menu-row" onClick={run(a.signOut)}>{t("account.menu.signOut")}</button>}
        {a.status === "error" && <button className="menu-row" onClick={run(a.retry)}>{t("account.menu.retry")}</button>}
      </div>
      {a.devPremium && (
        <label className="menu-row dev-toggle">
          <input type="checkbox" checked={a.devPremium.on} onChange={(e) => a.devPremium?.set(e.target.checked)} />
          <span>{t("account.menu.devPremium")} <span className="menu-aside">{t("account.menu.devOnly")}</span></span>
        </label>
      )}
    </>
  );
}
