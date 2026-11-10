/**
 * Build-time catalog loading for pages (server components run in Node during `next build`).
 * Reads JSON from the repo; nothing is fetched at runtime (ADR 0010). English is built into the bundle
 * (lib/i18n/english.ts, and each world's `messages`), so a page carries only its own language's words:
 * the shared catalogs plus the catalog of the world it shows.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_LOCALE } from "./locales";
import { SHARED_NS } from "./english";
import { catalog, merge, type Json, type Messages } from "./t";

const ROOT = process.cwd();

function read(file: string): Json | null {
  const p = join(ROOT, file);
  return existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as Json) : null;
}

/** One language's shared catalogs (lib/i18n/locales/<code>/<ns>.json) and, optionally, one world's (worlds/<key>/locales/<code>.json). */
export function loadMessages(locale: string, world?: string): Messages {
  const shared = SHARED_NS.map((ns) => {
    const json = read(`lib/i18n/locales/${locale}/${ns}.json`);
    return json ? catalog(ns, json) : {};
  });
  const own = world ? read(`worlds/${world}/locales/${locale}.json`) : null;
  return merge(...shared, own ? catalog(world!, own) : {});
}

export interface PageMessages {
  locale: string;
  /** This language's words; empty on English pages (English is in the bundle). */
  messages: Messages;
}

export function pageMessages(locale: string, world?: string): PageMessages {
  return { locale, messages: locale === DEFAULT_LOCALE ? {} : loadMessages(locale, world) };
}

/**
 * The site pages' words (change 0032: About, Privacy, Terms) — namespace "pages", kept out of SHARED_NS so the long text
 * only ever reaches the server-rendered page, never the lab's client messages.
 */
export const PAGES_NS = "pages";
export function loadPages(locale: string): Messages {
  const json = read(`lib/i18n/locales/${locale}/${PAGES_NS}.json`);
  return json ? catalog(PAGES_NS, json) : {};
}
