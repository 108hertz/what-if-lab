import type { Metadata } from "next";
import { createT, merge, type T } from "@/lib/i18n";
import { loadMessages } from "@/lib/i18n/load";
import { EN_SHARED } from "@/lib/i18n/english";
import { pageMetadata } from "@/lib/i18n/seo";
import { whatifHref } from "@/lib/seo/whatifPages";
import { SANDBOXES } from "@/worlds/sims";
import { HOME_MODE, MODES, SANDBOX_KEYS, WORLDS, modeHref, type Mode } from "@/worlds/registry";

/**
 * The words a page shows before the lab loads and puts in its <head> (change 0025), in the page's language.
 * Build time only (server components): it reads every sandbox's intro and what-ifs, which never ship to the browser
 * from here. World words fall back to the English in the sandbox until each world moves its text into
 * worlds/<key>/locales (steps 7–13).
 */

/** The page's words at build time: its language's catalogs (every world's, for the links), English under them. */
export const serverT = (locale: string): T =>
  createT({ locale, messages: locale === "en" ? {} : merge(loadMessages(locale), ...SANDBOX_KEYS.map((k) => loadMessages(locale, k))), fallback: EN_SHARED });

/** A translated key, or the English text that is still in the code. */
const or = (t: T, key: string, english: string, values?: Record<string, string | number>) => (t.has(key) ? t(key, values) : english);

export interface PageCopy {
  title: string;
  /** What the <head> and search results show (change 0033): the words people search for. */
  searchTitle: string;
  searchDescription: string;
  heading: string;
  description: string;
  /** World pages: the what-ifs, linked to their own page where it is built in this language (change 0033). */
  whatifs: { label: string; href: string | null }[];
  /** Links to every other page in this language. */
  links: { href: string; name: string; sub: string }[];
  linksHeading: string;
  whatifsHeading: string;
  /** "Just a simulation" (change 0028): the same note the lab shows on first open. */
  disclaimer: string;
}

export const worldName = (t: T, m: Mode) =>
  m === "scale" ? or(t, "common.scale.name", "Scale") : or(t, `${m}.meta.name`, WORLDS[m].name);
const worldSub = (t: T, m: Mode) =>
  m === "scale" ? or(t, "common.scale.sub", "Proton → universe") : or(t, `${m}.meta.sub`, WORLDS[m].sub);

export function pageCopy(locale: string, mode: Mode): PageCopy {
  const t = serverT(locale);
  const links = MODES.filter((m) => m !== mode).map((m) => ({ href: modeHref(m, locale), name: worldName(t, m), sub: worldSub(t, m) }));
  const common = { links, linksHeading: t("common.intro.worlds"), whatifsHeading: t("common.intro.whatifs"), disclaimer: t("shell.disclaimer.body") };
  if (mode === "scale") {
    const title = t("common.site.titleWorld", { world: worldName(t, "scale") });
    return {
      ...common, title, heading: worldName(t, "scale"), description: t("common.site.description"),
      searchTitle: title, searchDescription: t("common.site.searchDescription"), whatifs: [],
    };
  }
  const sb = SANDBOXES[mode];
  const name = worldName(t, mode);
  const title = t("common.site.titleWorld", { world: name });
  const description = or(t, `${mode}.meta.intro`, sb.intro);
  return {
    ...common,
    title,
    // The home page (/) opens a world but keeps the site's own title.
    searchTitle: mode === HOME_MODE ? t("common.site.title") : sb.seo ? t("common.site.titleWorld", { world: or(t, `${mode}.meta.seoTitle`, sb.seo.title) }) : title,
    searchDescription: sb.seo ? or(t, `${mode}.meta.seoDescription`, sb.seo.description) : description,
    heading: name,
    description,
    whatifs: sb.whatifs.map(([id, label]) => {
      const href = whatifHref(sb, id, locale);
      return { label: href ? or(t, `${mode}.question.${id}`, sb.questions![id].q) : or(t, `${mode}.whatif.${id}`, label), href };
    }),
  };
}

export function pageMeta(locale: string, mode: Mode): Metadata {
  const c = pageCopy(locale, mode);
  // Worlds share a picture of their own stage (change 0033, tests/og-images.test.ts draws public/og/<world>.png).
  const image = mode === "scale" ? undefined : { url: `/og/${mode}.png`, alt: c.searchTitle };
  return pageMetadata({ locale, path: modeHref(mode), title: c.searchTitle, description: c.searchDescription, image });
}
