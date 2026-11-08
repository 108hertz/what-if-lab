import "./globals.css";
import type { Metadata } from "next";
import RootShell, { ROOT_VIEWPORT } from "@/components/shell/RootShell";
import { serverT } from "@/components/shell/pageCopy";

/**
 * The one 404 page (change 0025). With two root layouts there is no shared one, and a static host serves a single
 * 404.html for every language, so it is in English and links home.
 */
const t = serverT("en");

export const metadata: Metadata = { title: `${t("common.notFound.title")} · ${t("common.site.name")}`, robots: { index: false } };
export const viewport = ROOT_VIEWPORT;

export default function GlobalNotFound() {
  return (
    <RootShell locale="en">
      <main className="page-intro">
        <h1 className="title">{t("common.notFound.title")}</h1>
        <p className="desc">{t("common.notFound.body")}</p>
        <p className="desc"><a href="/">{t("common.notFound.home")}</a></p>
      </main>
    </RootShell>
  );
}
