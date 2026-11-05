"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "../ui/Icon";
import { useAccount, usePremium } from "./context";
import type { Account } from "./state";

/** Short line under the name in the menu for each state. */
function statusLine(a: Account): string {
  switch (a.status) {
    case "off": return "Accounts aren't set up in this build. Everything here is free.";
    case "loading": return "Checking your account…";
    case "signed-out": return "The lab is free without an account. Sign in to use Premium on any device.";
    case "free": return "Free plan. Every world and every what-if is yours.";
    case "premium": return "Premium is on: no ads, and video and slide exports.";
    case "error": return a.error ?? "The account service didn't answer.";
  }
}

/**
 * Nav account button and its popover (change 0020). Icon-only below 1600 px; with a short label from 1600 px.
 * Every action opens the provider's own window over the lab; nothing navigates away.
 */
export default function AccountMenu() {
  const a = useAccount();
  const premium = usePremium();
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

  const run = (fn: () => void) => () => { setOpen(false); fn(); };
  const signedIn = a.status === "free" || a.status === "premium";
  const label = signedIn ? a.user?.name ?? "Account" : a.status === "signed-out" ? "Sign in" : "Account";
  const plan = a.isPremium ? "Premium" : signedIn ? "Free" : null;

  return (
    <div className="account" ref={wrap}>
      <button
        ref={btn}
        className="account-btn"
        aria-expanded={open}
        aria-controls="account-menu"
        aria-label={`${label}${plan ? `, ${plan} plan` : ""}`}
        onClick={() => setOpen(!open)}
      >
        <Icon name="user" />
        <span className="lbl account-name">{label}</span>
        {a.isPremium && <span className="micro account-plan">Premium</span>}
      </button>
      {open && (
        <div className="popover account-menu" id="account-menu" ref={panel} onKeyDown={onKey}>
          <div className="account-who">
            {signedIn && a.user ? (
              <>
                <span className="account-who-name">{a.user.name}</span>
                {a.user.email && <span className="small account-who-mail">{a.user.email}</span>}
              </>
            ) : (
              <span className="account-who-name">Your lab account</span>
            )}
            {plan && <span className="micro">{plan} plan</span>}
          </div>
          <p className={`small account-note${a.status === "error" ? " is-error" : ""}`} role={a.status === "error" ? "alert" : undefined}>
            {statusLine(a)}
            {a.status === "error" && a.isPremium && " Premium stays on for now."}
          </p>
          <div className="account-actions">
            {a.status === "signed-out" && (
              <>
                <button className="menu-row" onClick={run(a.signIn)}>Sign in</button>
                <button className="menu-row" onClick={run(a.signUp)}>Create account</button>
              </>
            )}
            {(a.status === "signed-out" || a.status === "free") && (
              <button className="menu-row" onClick={run(() => premium.open("menu"))}>
                Go Premium <span className="menu-aside">$15 a year</span>
              </button>
            )}
            {a.status === "premium" && <button className="menu-row" onClick={run(a.manage)}>Manage subscription</button>}
            {signedIn && <button className="menu-row" onClick={run(a.profile)}>Account settings</button>}
            {signedIn && <button className="menu-row" onClick={run(a.signOut)}>Sign out</button>}
            {a.status === "error" && <button className="menu-row" onClick={run(a.retry)}>Try again</button>}
          </div>
          {a.devPremium && (
            <label className="menu-row dev-toggle">
              <input type="checkbox" checked={a.devPremium.on} onChange={(e) => a.devPremium?.set(e.target.checked)} />
              <span>Simulate Premium <span className="menu-aside">dev build only</span></span>
            </label>
          )}
        </div>
      )}
    </div>
  );
}
