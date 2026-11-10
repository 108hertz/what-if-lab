"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useHref, useT } from "../i18n/I18nProvider";
import LangMenu from "../shell/LangMenu";
import SiteMenu from "../shell/SiteMenu";
import Consent from "../privacy/ConsentBanner";

// The theme toggle reads the page's theme on first render (the lab only ever renders it in the browser); here the page is
// pre-rendered, so it joins in the browser only. A same-size placeholder keeps the bar from shifting.
const ThemeToggle = dynamic(() => import("../shell/ThemeToggle"), { ssr: false, loading: () => <span className="iconbtn" aria-hidden="true" /> });

/** The top bar of a site page (change 0032): the wordmark home, language, theme and the site menu; plus the consent banner. */
export default function DocNav() {
  const t = useT();
  const href = useHref();
  return (
    <>
      <header className="nav doc-nav">
        <Link className="wordmark" href={href("/")} aria-label={t("shell.nav.home")}>
          {t("shell.nav.wordmark")}<span aria-hidden="true">…</span>
        </Link>
        <div className="nav-end">
          <LangMenu />
          <ThemeToggle />
          <SiteMenu />
        </div>
      </header>
      <Consent />
    </>
  );
}
