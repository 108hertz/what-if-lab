"use client";

import { useEffect } from "react";
import Link from "next/link";
import type { Mode } from "@/worlds/registry";
import { WORLD_VIEWS } from "@/worlds/views";
import { setCanvasFont } from "@/lib/sim/draw";
import ScaleConsole from "../scale/ScaleConsole";
import AdSlot, { RAILS_QUERY } from "../console/AdSlot";
import { useMedia } from "../ui/useMedia";
import { AccountProvider, PREMIUM_ON_SALE, useAccount } from "../account/context";
import { adsAllowed } from "../account/state";
import AccountMenu from "../account/AccountMenu";
import PremiumDialog from "../account/PremiumDialog";
import Tabs from "./Tabs";
import WorldMenu from "./WorldMenu";
import ThemeToggle from "./ThemeToggle";

/**
 * The shell shared by every page: nav, world switcher, account menu and the ≥ 1600 px ad rails.
 * Everything inside the console belongs to the scale explorer or to the world (worlds/<key>/Console.tsx).
 */
export default function Lab({ mode }: { mode: Mode }) {
  // Canvas text uses the page font (next/font gives it a generated family name).
  useEffect(() => setCanvasFont(getComputedStyle(document.body).fontFamily), []);
  return (
    <AccountProvider dialog={(reason, close) => <PremiumDialog reason={reason} onClose={close} />}>
      <Shell mode={mode} />
    </AccountProvider>
  );
}

function Shell({ mode }: { mode: Mode }) {
  const rails = useMedia(RAILS_QUERY) && adsAllowed(useAccount());
  const World = mode === "scale" ? null : WORLD_VIEWS[mode];

  return (
    <div className={`app${World ? "" : " is-scale"}${rails ? " has-rails" : ""}`} data-world={mode}>
      <header className="nav">
        <div className="brand">
          <Link className="wordmark" href="/">What-If Lab</Link>
          <span className="micro credit">No AI · No live data · Same seed, same future</span>
        </div>
        <Tabs mode={mode} />
        <WorldMenu mode={mode} />
        <div className="nav-end">
          {PREMIUM_ON_SALE && <AccountMenu />}
          <ThemeToggle />
        </div>
      </header>
      {rails && <AdSlot size="rail" />}
      {World ? <World key={mode} /> : <ScaleConsole />}
      {rails && <AdSlot size="rail" promo />}
    </div>
  );
}
