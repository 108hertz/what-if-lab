import { cap1, scoped, type Say } from "@/lib/i18n/t";
import { pageT } from "@/lib/i18n/page";
import type { AnySandbox, Control, LogEntry, Params, WhatIf, WorldMeta } from "./types";

/**
 * A world's words in the page's language (change 0025). Used by draw(), shared console blocks, timelines and
 * exports; never by step(). English comes from the sandbox itself: its `messages` plus the labels it already has,
 * under keys made from ids, so a world's code keeps its English where it is:
 *
 *   meta.name meta.sub meta.intro meta.hint   whatif.<id>   question.<id>   speed.<i>
 *   ctl.<id>.label  ctl.<id>.unit  ctl.<id>.opt.<value>  ctl.<id>.group.<i>  ctl.h.<slug> (headings)
 *   metric.<k>.label  metric.<k>.unit  metric.<k>.help
 * A key is either words or a group of keys, never both (catalogs are nested JSON).
 */
type Words = { key: string; messages: Record<string, string> };

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const headingKey = (label: string) => `ctl.h.${slug(label)}`;

/** The English words of a sandbox, keyed as above. */
export function sandboxEnglish(sb: AnySandbox): Record<string, string> {
  const out: Record<string, string> = { "meta.name": sb.name, "meta.sub": sb.sub, "meta.intro": sb.intro };
  if (sb.hint) out["meta.hint"] = sb.hint;
  if (sb.seo) { out["meta.seoTitle"] = sb.seo.title; out["meta.seoDescription"] = sb.seo.description; }
  for (const c of sb.controls as Control[]) {
    if (c.type === "heading") { out[headingKey(c.label)] = c.label; continue; }
    out[`ctl.${c.id}.label`] = c.label;
    if (c.type === "range" && c.unit) out[`ctl.${c.id}.unit`] = c.unit;
    if (c.type === "select") {
      for (const [v, l] of c.options) out[`ctl.${c.id}.opt.${v}`] = l;
      c.groups?.forEach(([l], i) => (out[`ctl.${c.id}.group.${i}`] = l));
    }
  }
  for (const [id, l] of sb.whatifs) out[`whatif.${id}`] = l;
  for (const [id, x] of Object.entries(sb.questions ?? {})) out[`question.${id}`] = x.q;
  sb.speeds.forEach(([, l], i) => (out[`speed.${i}`] = l));
  for (const m of sb.metrics) {
    out[`metric.${m.k}.label`] = m.label;
    if (m.unit) out[`metric.${m.k}.unit`] = m.unit;
    if (m.help) out[`metric.${m.k}.help`] = m.help;
  }
  return { ...out, ...sb.messages };
}

const english = new WeakMap<object, Record<string, string>>();
const englishOf = (sb: AnySandbox | Words): Record<string, string> => {
  if (!("controls" in sb)) return sb.messages;
  let e = english.get(sb);
  if (!e) { e = sandboxEnglish(sb); english.set(sb, e); }
  return e;
};

/**
 * A world's words: a sandbox (labels + messages) or just `{key, messages}` (e.g. a world's stage code). With the
 * world's settings `p`, a sandbox's `reword()` may say a label another way (change 0037: "The star doubles in mass").
 */
export function worldSay(sb: AnySandbox | Words, p?: Params): Say {
  const say = scoped(pageT(), sb.key, englishOf(sb));
  const re = p && "controls" in sb ? sb.reword : undefined;
  if (!re) return say;
  return (k, v) => {
    const r = re(p, k);
    return r ? say(r.k, r.v ? { ...v, ...r.v } : v) : say(k, v);
  };
}

/** The what-ifs offered with these settings (a sandbox's `reword()` can hide one, change 0037). */
export function whatIfsFor(sb: AnySandbox, p: Params): WhatIf[] {
  return sb.reword ? sb.whatifs.filter(([id]) => sb.reword!(p, `whatif.${id}`) !== null) : sb.whatifs;
}

/** A world's name and subtitle for the nav, from its meta (no sandbox loaded). */
export function metaSay(m: WorldMeta): Say {
  return scoped(pageT(), m.key, { "meta.name": m.name, "meta.sub": m.sub });
}

/** One timeline line. */
export function eventText(sb: AnySandbox | Words, e: LogEntry): string {
  return cap1(worldSay(sb)(e.k, e.v), pageT().tag);
}
