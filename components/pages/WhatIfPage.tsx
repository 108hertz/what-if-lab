import type { Metadata } from "next";
import { createT, localePath, merge, DEFAULT_LOCALE, type T } from "@/lib/i18n";
import { loadMessages, pageMessages } from "@/lib/i18n/load";
import { EN_SHARED } from "@/lib/i18n/english";
import { englishT, withPageT } from "@/lib/i18n/page";
import { pageMetadata } from "@/lib/i18n/seo";
import { answerOf, answerWords, type AnswerCell, type AnswerWords } from "@/lib/seo/answer";
import { ldJson, whatifLd } from "@/lib/seo/jsonld";
import { WHATIF_PAGE_LOCALES, findWhatIf, whatifHref, whatifPages, type WhatIfPageRef } from "@/lib/seo/whatifPages";
import { whatifHash } from "@/lib/sim/deeplink";
import { worldSay } from "@/lib/sim/say";
import type { AnySandbox, SandboxKey } from "@/lib/sim/types";
import { SITE_PAGES } from "@/lib/site";
import { SANDBOXES } from "@/worlds/sims";
import { MODES, modeHref } from "@/worlds/registry";
import { I18nProvider } from "../i18n/I18nProvider";
import { serverT, worldName } from "../shell/pageCopy";
import { Icon } from "../ui/Icon";
import DocNav from "./DocNav";
import PageAd from "./PageAd";
import { pagesT } from "./DocPage";

/**
 * A what-if's own page (change 0033, step 6): `/lab/<world>/<slug>`. A reading page like About (it scrolls; not a console).
 * Everything on it is computed at build time by running the world (lib/seo/answer.ts) and said with the world's own
 * words and formatters: the question, the answer, two pictures (no change | with the what-if), a button that opens the
 * lab with the what-if made, the numbers, the steps, the model note, then links to the world's other what-ifs and worlds.
 */

/** Share pictures (tests/og-images.test.ts draws them): the changed world, and the world left as it was, at the horizon. */
export const whatifImage = (world: SandboxKey, slug: string) => `/og/${world}/${slug}.jpg`;
export const noChangeImage = (world: SandboxKey) => `/og/${world}/no-change.jpg`;

/** The page language for a world's words outside React (worldSay, fmtT, formatters). */
function sayT(locale: string, world: SandboxKey): T {
  return locale === DEFAULT_LOCALE ? englishT() : createT({ locale, messages: merge(loadMessages(locale), loadMessages(locale, world)), fallback: EN_SHARED });
}

/** A value with its unit ("225 °C", "74/100", "50%"); the unit alone stays out when there is no value. */
export const withUnit = (v: string, unit: string) => (!unit || v === "—" ? v : /^[%/]/.test(unit) ? v + unit : `${v} ${unit}`);

export interface WhatIfCopy {
  ref: WhatIfPageRef;
  question: string;
  answer: string;
  description: string;
  world: string;
  intro: string;
  words: AnswerWords;
  /** The world's other what-ifs with a page, as links. */
  related: { href: string; q: string }[];
}

export function whatifCopy(locale: string, world: SandboxKey, slug: string): WhatIfCopy | null {
  const sb: AnySandbox = SANDBOXES[world];
  const ref = findWhatIf(sb, slug);
  if (!ref) return null;
  const t = pagesT(locale);
  return withPageT(sayT(locale, world), () => {
    const say = worldSay(sb);
    const words = answerWords(sb, answerOf(sb, ref.id));
    const k = words.key;
    const answer = t("pages.whatif.answer", { time: words.times[words.times.length - 1].time, label: k.label, alt: withUnit(k.alt, k.unit), base: withUnit(k.base, k.unit) });
    const related = whatifPages(sb).filter((x) => x.id !== ref.id).flatMap((x) => {
      const href = whatifHref(sb, x.id, locale);
      return href ? [{ href, q: say(`question.${x.id}`) }] : [];
    });
    return {
      ref, words, answer, related,
      question: say(`question.${ref.id}`),
      description: t("pages.whatif.description", { answer }),
      world: worldName(serverT(locale), world),
      intro: say("meta.intro"),
    };
  });
}

export function whatifMeta(locale: string, world: SandboxKey, slug: string): Metadata {
  const c = whatifCopy(locale, world, slug);
  if (!c) return {};
  return pageMetadata({
    locale, path: c.ref.path, locales: WHATIF_PAGE_LOCALES,
    title: pagesT(locale)("common.site.titleWorld", { world: c.question }), description: c.description,
    image: { url: whatifImage(world, slug), alt: c.question },
  });
}

const Mark = ({ alt, children }: { alt?: boolean; children: React.ReactNode }) => <span className={alt ? "ch a" : "ch"}>{children}</span>;

export default function WhatIfPage({ locale, world, slug }: { locale: string; world: SandboxKey; slug: string }) {
  const c = whatifCopy(locale, world, slug)!;
  const t = pagesT(locale);
  const st = serverT(locale);
  const w = c.words;
  const worldHref = modeHref(world, locale);
  const run = modeHref(world, locale) + whatifHash(c.ref.id);
  const home = st("common.site.name");
  const ld = whatifLd({
    locale, path: c.ref.path, worldPath: modeHref(world), question: c.question, answer: c.answer, description: c.description,
    worldName: c.world, homeName: home, image: whatifImage(world, slug),
  });
  const row = (x: AnswerCell) => (
    <tr key={x.k}>
      <td>{x.label}</td>
      <td>{withUnit(x.base, x.unit)}</td>
      <td className="a">{withUnit(x.alt, x.unit)}</td>
    </tr>
  );

  return (
    <I18nProvider locale={locale} messages={pageMessages(locale).messages}>
      <div className="doc">
        <DocNav />
        <main className="doc-main">
          <article className="doc-body whatif">
            <nav className="micro whatif-crumbs" aria-label={home}>
              <a href={localePath(locale, "/")}>{home}</a><span aria-hidden="true">/</span><a href={worldHref}>{c.world}</a>
            </nav>
            <h1 className="title">{c.question}</h1>
            <p className="desc-lg whatif-answer">{c.answer}</p>

            <div className="whatif-pics">
              <figure>
                <img src={noChangeImage(world)} width={1200} height={630} alt={`${t("pages.whatif.picture", { world: c.world, time: w.shot })}: ${t("pages.whatif.noChange")}`} />
                <figcaption className="small"><Mark>{t("pages.whatif.noChange")}</Mark></figcaption>
              </figure>
              <figure>
                <img src={whatifImage(world, slug)} width={1200} height={630} alt={`${t("pages.whatif.picture", { world: c.world, time: w.shot })}: ${c.question}`} />
                <figcaption className="small"><Mark alt>{t("pages.whatif.withIt")}</Mark></figcaption>
              </figure>
            </div>

            <div className="whatif-run">
              <a className="btn primary" href={run}><Icon name="play" size={18} />{t("pages.whatif.run")}</a>
              <p className="small">{t("pages.whatif.runNote")}</p>
            </div>

            <section className="doc-section">
              <h2 className="headline">{t("pages.whatif.numbers")}</h2>
              <div className="whatif-table">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{t("pages.whatif.measure")}</th>
                      <th scope="col"><Mark>{t("pages.whatif.noChange")}</Mark></th>
                      <th scope="col"><Mark alt>{t("pages.whatif.withIt")}</Mark></th>
                    </tr>
                  </thead>
                  {w.times.map((x) => (
                    <tbody key={x.time}>
                      <tr><th scope="rowgroup" colSpan={3}>{t("pages.whatif.by", { time: x.time })}</th></tr>
                      {x.cells.map(row)}
                    </tbody>
                  ))}
                </table>
              </div>
            </section>

            <section className="doc-section">
              <h2 className="headline">{t("pages.whatif.steps")}</h2>
              {w.steps.length ? (
                <ol className="whatif-steps">
                  {w.steps.map((s, i) => (
                    <li key={i}>
                      <time className="num">{s.time}</time>
                      <span className="desc">{s.text}</span>
                      <span className="small"><Mark alt={s.who === "alt"}>{t(s.who === "alt" ? "pages.whatif.onlyAlt" : "pages.whatif.onlyBase")}</Mark></span>
                    </li>
                  ))}
                </ol>
              ) : <p className="desc">{t("pages.whatif.stepsNone")}</p>}
            </section>

            <PageAd />

            <section className="doc-section">
              <h2 className="headline">{t("pages.whatif.model")}</h2>
              <p className="desc">{c.intro}</p>
              <p className="desc">{t("pages.whatif.fork", { time: w.fork })}</p>
              <p className="desc disclaimer-line">{t("shell.disclaimer.body")}</p>
            </section>

            {c.related.length > 0 && (
              <section className="doc-section">
                <h2 className="headline">{t("pages.whatif.more", { world: c.world })}</h2>
                <ul className="whatif-related">{c.related.map((r) => <li key={r.href}><a href={r.href}>{r.q}</a></li>)}</ul>
                <p className="desc"><a href={worldHref}>{t("pages.whatif.open", { world: c.world })}</a></p>
              </section>
            )}

            <section className="doc-section">
              <h2 className="headline">{t("pages.whatif.others")}</h2>
              <ul className="doc-links">
                {MODES.filter((m) => m !== world).map((m) => <li key={m}><a href={modeHref(m, locale)}>{worldName(st, m)}</a></li>)}
              </ul>
            </section>
          </article>
          <nav className="doc-foot" aria-label={t("pages.common.footer")}>
            {SITE_PAGES.map((p) => <a key={p} href={localePath(locale, p)}>{t(`shell.site.${p.slice(1)}`)}</a>)}
          </nav>
        </main>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(ld) }} />
      </div>
    </I18nProvider>
  );
}
