import { Fragment, type ReactNode } from "react";
import type { Say } from "@/lib/i18n/t";

/** The marker that stands for bold value `i` inside a said message (private-use characters, never shown). */
export const mark = (i: number) => `${i}`;

/**
 * A message with some of its values in bold (change 0025): the values are said through markers, the finished text is
 * split on them, so translators keep the whole sentence (and its word order) in one message. A value can also hold
 * `mark(i)` itself (e.g. a list of bold items), where i is the place of the name in `bold`.
 */
export function Rich({ say, k, v = {}, bold }: { say: Say; k: string; v?: Record<string, string | number | { k: string }>; bold: Record<string, ReactNode> }) {
  const names = Object.keys(bold);
  const marked = Object.fromEntries(names.map((n, i) => [n, mark(i)]));
  const text = say(k, { ...v, ...marked });
  const out: ReactNode[] = [];
  text.split(/(\d+)/).forEach((part, i) => {
    out.push(i % 2 ? <b key={i}>{bold[names[Number(part)]]}</b> : <Fragment key={i}>{part}</Fragment>);
  });
  return <>{out}</>;
}
