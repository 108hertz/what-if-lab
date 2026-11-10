"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Mode } from "@/worlds/registry";
import { WORLD_VIEWS } from "@/worlds/views";
import { setCanvasFont } from "@/lib/sim/draw";
import ScaleConsole from "../scale/ScaleConsole";
import AdSlot, { ADS_ON, RAILS_QUERY } from "../console/AdSlot";
import { useMedia } from "../ui/useMedia";
import { AccountProvider, PREMIUM_ON_SALE, useAccount } from "../account/context";
import { adsAllowed } from "../account/state";
import AccountMenu from "../account/AccountMenu";
import PremiumDialog from "../account/PremiumDialog";
import WorldMenu from "./WorldMenu";
import ThemeToggle from "./ThemeToggle";
import LangMenu, { LangHint } from "./LangMenu";
import Disclaimer from "./Disclaimer";
import SiteMenu from "./SiteMenu";
import { track } from "../privacy/track";
import { CONSENT_EVENT } from "../privacy/consent";
import { useHref, useT } from "../i18n/I18nProvider";

/**
 * The shell shared by every page: nav, world switcher, account menu and the ≥ 1600 px ad rails.
 * Everything inside the console belongs to the scale explorer or to the world (worlds/<key>/Console.tsx).
 */
export default function Lab({ mode }: { mode: Mode }) {
  // Canvas text uses the page fonts (next/font gives them generated family names).
  useEffect(() => {
    const css = getComputedStyle(document.documentElement), v = (k: string) => css.getPropertyValue(k).trim();
    setCanvasFont(getComputedStyle(document.body).fontFamily, v("--font-mono"), v("--font-cond"));
    // Tell the boot scene (change 0026) the console is on screen: after its first frames have been drawn.
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        (window as { __labReady?: number }).__labReady = 1;
        window.dispatchEvent(new Event("lab:ready"));
      });
    });
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <AccountProvider dialog={(reason, close) => <PremiumDialog reason={reason} onClose={close} />}>
      <Shell mode={mode} />
    </AccountProvider>
  );
}

function Shell({ mode }: { mode: Mode }) {
  const rails = useMedia(RAILS_QUERY) && ADS_ON && adsAllowed(useAccount());
  const World = mode === "scale" ? null : WORLD_VIEWS[mode];
  const href = useHref();
  const t = useT();
  // Analytics (change 0027): which world is open; sent once the visitor has accepted (also right after they accept).
  useEffect(() => {
    const send = () => track("world_open", { world: mode });
    send();
    window.addEventListener(CONSENT_EVENT, send);
    return () => window.removeEventListener(CONSENT_EVENT, send);
  }, [mode]);

  return (
    <div className={`app${World ? "" : " is-scale"}${rails ? " has-rails" : ""}`} data-world={mode}>
      <header className="nav">
        {/* The bar reads as a sentence: "what if…" then the world you're in (change 0021). */}
        <Link className="wordmark" href={href("/")} aria-label={t("shell.nav.home")}>
          {t("shell.nav.wordmark")}<span aria-hidden="true">…</span>
        </Link>
        <WorldMenu mode={mode} />
        <div className="nav-end">
          {/* Phones (< 768 px) keep only the simulation label and the site menu; account, language and theme move into it. */}
          <div className="nav-wide">{PREMIUM_ON_SALE && <AccountMenu />}</div>
          <Disclaimer />
          <div className="nav-wide">
            <LangHint />
            <LangMenu />
            <ThemeToggle />
          </div>
          <SiteMenu settings={{ account: PREMIUM_ON_SALE }} />
        </div>
      </header>
      {rails && <AdSlot size="rail" />}
      {World ? <World key={mode} /> : <ScaleConsole />}
      {rails && <AdSlot size="rail" promo />}
    </div>
  );
}
