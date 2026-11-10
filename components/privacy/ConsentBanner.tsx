"use client";

import { useEffect, useRef, useState } from "react";
import { useHref, useT } from "../i18n/I18nProvider";
import { GA_ID } from "./config";
import { CONSENT_EVENT, CONSENT_OPEN_EVENT, consentState, readChoice, safeStore, writeChoice, type Choice } from "./consent";
import { setTracking } from "./track";
import { DISCLAIMER_EVENT, DISCLAIMER_KEY } from "../shell/disclaimerRule";

const store = safeStore(() => localStorage);
type W = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void };

/** Loads gtag.js once, after consent (Consent Mode v2 basic: no request to Google before Accept). */
function loadGa(id: string) {
  const w = window as W;
  if (!w.gtag) {
    w.dataLayer = w.dataLayer || [];
    // gtag must push the arguments object itself, as Google's snippet does.
    w.gtag = function gtag() { w.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
    w.gtag("consent", "default", consentState(null));
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(s);
    w.gtag("js", new Date());
    w.gtag("consent", "update", consentState("granted"));
    w.gtag("config", id);
  } else {
    w.gtag("consent", "update", consentState("granted"));
  }
  setTracking(true);
}

/** After Decline: stop sending and remove GA's cookies on this site. */
function stopGa() {
  setTracking(false);
  const w = window as W;
  w.gtag?.("consent", "update", consentState("denied"));
  const host = location.hostname.split(".").slice(-2).join(".");
  for (const c of document.cookie.split(";")) {
    const name = c.split("=")[0].trim();
    if (name === "_ga" || name.startsWith("_ga_")) {
      for (const d of ["", `; domain=.${host}`, `; domain=${location.hostname}`]) document.cookie = `${name}=; max-age=0; path=/${d}`;
    }
  }
}

/**
 * The consent banner (change 0027): only when a GA ID is set. Asks once; Accept loads Google Analytics, Decline never
 * does. A small panel at the bottom-left, never over the stage's transport on wide screens; reopened from the site menu.
 */
export default function Consent() {
  const t = useT();
  const href = useHref();
  const [open, setOpen] = useState(false);
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!GA_ID) return;
    const c = readChoice(store);
    if (c === "granted") loadGa(GA_ID);
    // Ask after the boot scene and after the first-open simulation note (change 0028) is closed, so one thing shows at a time.
    let timer = 0;
    const cleanups: (() => void)[] = [];
    if (!c) {
      const root = document.documentElement;
      const show = () => { timer = window.setTimeout(() => setOpen(true), 900); };
      const afterBoot = () => {
        if (root.dataset.booted || !root.dataset.js || !document.querySelector(".boot")) return show();
        const mo = new MutationObserver(() => { if (root.dataset.booted) { mo.disconnect(); show(); } });
        mo.observe(root, { attributes: true, attributeFilter: ["data-booted"] });
        cleanups.push(() => mo.disconnect());
      };
      // The note only opens inside the lab; site pages (no .app) never show it.
      let noteSeen = true;
      try { noteSeen = localStorage.getItem(DISCLAIMER_KEY) === "1"; } catch { /* no storage: the note won't wait either */ }
      if (noteSeen || !document.querySelector(".app, .boot")) afterBoot();
      else {
        const after = () => show();
        window.addEventListener(DISCLAIMER_EVENT, after, { once: true });
        cleanups.push(() => window.removeEventListener(DISCLAIMER_EVENT, after));
      }
    }
    const reopen = () => setOpen(true);
    window.addEventListener(CONSENT_OPEN_EVENT, reopen);
    return () => { clearTimeout(timer); cleanups.forEach((f) => f()); window.removeEventListener(CONSENT_OPEN_EVENT, reopen); };
  }, []);

  useEffect(() => { if (open) first.current?.focus({ preventScroll: true }); }, [open]);

  if (!GA_ID || !open) return null;
  const choose = (c: Choice) => {
    writeChoice(store, c);
    if (c === "granted") loadGa(GA_ID!); else stopGa();
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: c }));
    setOpen(false);
  };

  return (
    <section className="consent" role="region" aria-label={t("shell.consent.label")} onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}>
      <p className="small">
        {t("shell.consent.text")} <a href={href("/privacy")}>{t("shell.consent.policy")}</a>
      </p>
      <div className="consent-actions">
        <button ref={first} type="button" className="btn" onClick={() => choose("denied")}>{t("shell.consent.decline")}</button>
        <button type="button" className="btn" onClick={() => choose("granted")}>{t("shell.consent.accept")}</button>
      </div>
    </section>
  );
}
