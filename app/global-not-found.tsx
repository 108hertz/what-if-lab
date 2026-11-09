import "./globals.css";
import type { Metadata } from "next";
import RootShell, { ROOT_VIEWPORT } from "@/components/shell/RootShell";
import { serverT } from "@/components/shell/pageCopy";
import { Icon } from "@/components/ui/Icon";
import { lostScript } from "@/lib/boot/lost";

/**
 * The one 404 page (change 0025). With two root layouts there is no shared one, and a static host serves a single
 * 404.html for every language, so it is in English and links home. Change 0030: the boot scene's sparks gather into an
 * astronaut adrift on a cut tether; the words and the way home sit under it. Without scripts it is the words alone.
 */
const t = serverT("en");

export const metadata: Metadata = { title: `${t("common.notFound.title")} · ${t("common.site.name")}`, robots: { index: false } };
export const viewport = ROOT_VIEWPORT;

export default function GlobalNotFound() {
  return (
    <RootShell locale="en">
      <main className="lost" id="lost">
        <canvas aria-hidden="true" suppressHydrationWarning />
        <a className="wordmark lost-mark" href="/" aria-label={t("shell.nav.home")}>
          {t("shell.nav.wordmark")}<span aria-hidden="true">…</span>
        </a>
        <div className="lost-text">
          <h1 className="lost-title">{t("common.notFound.title")}</h1>
          <p className="lost-body">{t("common.notFound.space")} {t("common.notFound.body")}</p>
          <a className="btn primary" href="/"><Icon name="scale" />{t("common.notFound.home")}</a>
        </div>
        <p className="lost-edge" aria-hidden="true">{t("common.site.name")} · <span>404</span></p>
        <script dangerouslySetInnerHTML={{ __html: lostScript() }} />
      </main>
    </RootShell>
  );
}
