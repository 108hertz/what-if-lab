/**
 * Structured data (schema.org JSON-LD) for the lab pages (change 0033). Framework-free; built at build time.
 * Every value repeats words the page shows (name, description, links): Google ignores, or penalises, markup that
 * says more than the page. No ratings or reviews: we have none.
 */

import { absUrl } from "../i18n/seo";
import { localeInfo } from "../i18n/locales";
import { localePath } from "../i18n/routes";
import { SOCIALS, siteValue } from "../site";

export const SITE_NAME = "What-If Lab";
type Ld = Record<string, unknown>;

const ids = (origin?: string) => ({ site: absUrl("/", origin) + "#website", org: absUrl("/", origin) + "#organization" });

/** Home page: the site and who runs it (so search engines can show the name and link the social profiles). */
export function homeLd(locale: string, description: string, origin?: string): Ld {
  const id = ids(origin);
  const email = siteValue("email");
  const socials = SOCIALS();
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite", "@id": id.site, name: SITE_NAME, url: absUrl(localePath(locale, "/"), origin),
        description, inLanguage: localeInfo(locale).tag, publisher: { "@id": id.org },
      },
      {
        "@type": "Organization", "@id": id.org, name: SITE_NAME, url: absUrl("/", origin), logo: absUrl("/apple-touch-icon.png", origin),
        ...(socials.length ? { sameAs: socials.map((s) => s.url) } : {}),
        ...(email ? { email } : {}),
      },
    ],
  };
}

export interface WorldLd {
  locale: string;
  /** The English path, e.g. "/lab/solar". */
  path: string;
  /** The world's name as shown in the page's <h1>. */
  name: string;
  description: string;
  /** The home page's name in the breadcrumb. */
  homeName: string;
}

/** A world's page: a free web app that runs in the browser, and where it sits in the site. */
export function worldLd({ locale, path, name, description, homeName }: WorldLd, origin?: string): Ld {
  const url = absUrl(localePath(locale, path), origin);
  const id = ids(origin);
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication", "@id": url + "#app", name: `${name} · ${SITE_NAME}`, url, description,
        applicationCategory: "EducationalApplication", operatingSystem: "Any (web browser)", browserRequirements: "Requires JavaScript",
        isAccessibleForFree: true, offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        inLanguage: localeInfo(locale).tag, isPartOf: { "@id": id.site }, publisher: { "@id": id.org },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: homeName, item: absUrl(localePath(locale, "/"), origin) },
          { "@type": "ListItem", position: 2, name, item: url },
        ],
      },
    ],
  };
}

export interface WhatIfLd {
  locale: string;
  /** English paths of the page and its world. */
  path: string;
  worldPath: string;
  /** The question (the page's <h1>), its first sentence (the answer) and the description. */
  question: string;
  answer: string;
  description: string;
  worldName: string;
  homeName: string;
  image: string;
}

/**
 * A what-if page (change 0033, step 6): a web page whose main subject is one question with the answer the page shows
 * first, part of the site, with the picture of the changed world and a breadcrumb home → world → question.
 */
export function whatifLd(x: WhatIfLd, origin?: string): Ld {
  const url = absUrl(localePath(x.locale, x.path), origin);
  const id = ids(origin);
  const lang = localeInfo(x.locale).tag;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage", "@id": url + "#page", url, name: x.question, description: x.description, inLanguage: lang,
        isPartOf: { "@id": id.site }, publisher: { "@id": id.org },
        primaryImageOfPage: { "@type": "ImageObject", url: absUrl(x.image, origin), width: 1200, height: 630 },
        mainEntity: { "@type": "Question", name: x.question, acceptedAnswer: { "@type": "Answer", text: x.answer } },
        breadcrumb: { "@id": url + "#breadcrumb" },
      },
      {
        "@type": "BreadcrumbList", "@id": url + "#breadcrumb",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: x.homeName, item: absUrl(localePath(x.locale, "/"), origin) },
          { "@type": "ListItem", position: 2, name: x.worldName, item: absUrl(localePath(x.locale, x.worldPath), origin) },
          { "@type": "ListItem", position: 3, name: x.question, item: url },
        ],
      },
    ],
  };
}

/** JSON for a <script type="application/ld+json">, safe to put in HTML. */
export const ldJson = (ld: Ld) => JSON.stringify(ld).replace(/</g, "\\u003c");
