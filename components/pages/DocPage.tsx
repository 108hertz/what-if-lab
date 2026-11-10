import type { Metadata } from "next";
import en from "@/lib/i18n/locales/en/pages.json";
import { createT, localePath, merge, catalog, DEFAULT_LOCALE, type Json, type T } from "@/lib/i18n";
import { loadPages, pageMessages } from "@/lib/i18n/load";
import { EN_SHARED } from "@/lib/i18n/english";
import { absUrl, pageMetadata } from "@/lib/i18n/seo";
import { SITE_PAGES, SOCIALS, siteValue } from "@/lib/site";
import { MODES, modeHref } from "@/worlds/registry";
import { I18nProvider } from "../i18n/I18nProvider";
import { serverT, worldName } from "../shell/pageCopy";
import { Icon } from "../ui/Icon";
import DocNav from "./DocNav";

/**
 * About, Privacy policy and Terms of use (change 0032): readable text pages, rendered at build time in every language.
 * Unlike the consoles they scroll like a document. Words come from lib/i18n/locales/<code>/pages.json; each section is
 * `h` (heading) + `p…` (paragraphs) + `li…` (list items), in the English file's order.
 */
export type DocKind = "about" | "privacy" | "terms";
const PATH: Record<DocKind, string> = { about: "/about", privacy: "/privacy", terms: "/terms" };
const SKIP = new Set(["title", "description", "heading"]);
const EN_PAGES = catalog("pages", en as Json);

export function pagesT(locale: string): T {
  return createT({ locale, messages: locale === DEFAULT_LOCALE ? {} : merge(serverMessages(locale), loadPages(locale)), fallback: merge(EN_SHARED, EN_PAGES) });
}
const serverMessages = (locale: string) => pageMessages(locale).messages;

const values = (t: T) => ({
  operator: siteValue("operator") ?? t("pages.common.operatorFallback"),
  country: siteValue("country") ?? t("pages.common.countryFallback"),
});

export function docMeta(locale: string, kind: DocKind): Metadata {
  const t = pagesT(locale);
  return pageMetadata({ locale, path: PATH[kind], title: t(`pages.${kind}.title`), description: t(`pages.${kind}.description`) });
}

export default function DocPage({ locale, kind }: { locale: string; kind: DocKind }) {
  const t = pagesT(locale);
  const v = values(t);
  const email = siteValue("email");
  const socials = SOCIALS();
  const sections = (en as unknown as Record<DocKind, Record<string, Record<string, string> | string>>)[kind];
  const updated = siteValue("updated");
  const date = updated ? new Intl.DateTimeFormat(t.tag, { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${updated}T00:00:00Z`)) : null;

  const extra: Record<string, React.ReactNode> = kind === "about" ? {
    worlds: (
      <ul className="doc-links">
        {MODES.map((m) => <li key={m}><a href={localePath(locale, modeHref(m))}>{worldName(serverT(locale), m)}</a></li>)}
      </ul>
    ),
    note: <p className="desc">{t("shell.disclaimer.body")}</p>,
    follow: socials.length ? (
      <div className="doc-socials">
        {socials.map((s) => (
          <a key={s.id} className="btn" href={s.url} target="_blank" rel="noopener me">
            <Icon name={s.id === "instagram" ? "camera" : "note"} size={18} />{s.name}
          </a>
        ))}
      </div>
    ) : <p className="desc doc-quiet">{t("pages.about.follow.soon")}</p>,
  } : {};

  const ld = kind === "about" ? {
    "@context": "https://schema.org", "@type": "Organization", name: "What-If Lab", url: absUrl("/"),
    ...(socials.length ? { sameAs: socials.map((s) => s.url) } : {}),
    ...(email ? { email } : {}),
  } : null;

  return (
    <I18nProvider locale={locale} messages={serverMessages(locale)}>
      <div className="doc">
        <DocNav />
        <main className="doc-main">
          <article className="doc-body">
            <p className="micro"><a href={localePath(locale, "/")}>{t("pages.common.back")}</a></p>
            <h1 className="title">{t(`pages.${kind}.heading`)}</h1>
            {kind !== "about" && date && <p className="micro doc-date">{t("pages.common.updated", { date })}</p>}
            {kind !== "about" && locale !== DEFAULT_LOCALE && (
              <p className="small doc-quiet">{t("pages.common.translated")} <a href={PATH[kind]} hrefLang="en">{t("pages.common.readEnglish")}</a></p>
            )}
            {kind === "about" && <p className="desc-lg">{t("pages.about.lede")}</p>}
            {Object.entries(sections).filter(([k, s]) => !SKIP.has(k) && typeof s === "object").map(([k, s]) => {
              const keys = Object.keys(s as Record<string, string>).filter((x) => !x.startsWith("_") && x !== "soon");
              const items = keys.filter((x) => x.startsWith("li"));
              return (
                <section key={k} className="doc-section">
                  {keys.includes("h") && <h2 className="headline">{t(`pages.${kind}.${k}.h`)}</h2>}
                  {keys.filter((x) => x.startsWith("p")).map((x) => <p key={x} className="desc">{t(`pages.${kind}.${k}.${x}`, v)}</p>)}
                  {items.length > 0 && <ul className="doc-list">{items.map((x) => <li key={x} className="desc">{t(`pages.${kind}.${k}.${x}`, v)}</li>)}</ul>}
                  {extra[k]}
                </section>
              );
            })}
            <p className="desc doc-contact">
              {email ? <>{t("pages.common.contact", { email: "\u0000" }).split("\u0000").flatMap((part, i) => (i ? [<a key={i} href={`mailto:${email}`}>{email}</a>, part] : [part]))}</> : t("pages.common.contactSoon")}
            </p>
          </article>
          <nav className="doc-foot" aria-label={t("pages.common.footer")}>
            {SITE_PAGES.map((p) => <a key={p} href={localePath(locale, p)} aria-current={p === PATH[kind] ? "page" : undefined}>{t(`shell.site.${p.slice(1)}`)}</a>)}
            {socials.map((s) => <a key={s.id} href={s.url} target="_blank" rel="noopener me">{s.name}</a>)}
          </nav>
        </main>
        {ld && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />}
      </div>
    </I18nProvider>
  );
}
