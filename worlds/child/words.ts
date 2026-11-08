import { worldSay } from "@/lib/sim/say";
import { listOf, type Say } from "@/lib/i18n/t";
import { pageT } from "@/lib/i18n/page";
import { AGES, FOREVER, SHOW, stepOf, type Behaviour, type Show } from "./data";
import { childWords } from "./messages";

/**
 * The child world's words in the page's language (change 0025), for the sim's sentences, the stage and the console.
 * Everything here says keys from messages.ts; nothing keeps English of its own.
 */
export const say = (): Say => worldSay(childWords);
export const list = (xs: string[]) => listOf(pageT(), xs);

/** How much, for "a bit more" / "more" / "much more" (d in trait points). */
export const degOf = (d: number) => (Math.abs(d) < 4 ? "bit" : Math.abs(d) < 8 ? "plain" : "much");

export const traitWord = (s: Show) => say()(`trait.${s}`);
export const traitLc = (s: Show) => say()(`traitLc.${s}`);
/** Words for one display value: "a bit curious", "very shy"… */
export const stepWord = (s: Show, v: number) => say()(`step.${s}.${stepOf(v)}`);
/** "a bit more curious", "much quieter"… for a change of d points in trait s. */
export const moreWord = (s: Show, d: number) => say()(`more.${s}.${d > 0 ? 1 : 0}`, { d: degOf(d) });
/** "a bit more" / "much less"… */
export const moreLess = (d: number) => say()(d > 0 ? "cmp.more" : "cmp.less", { d: degOf(d) });
export const trackWord = (s: Show, end: 0 | 1) => say()(`track.${s}.${end}`);
export const behaviourSay = (b: Behaviour, age: number) => say()(`beh.${b.key}.${age < 18 ? "kid" : "grown"}`);

/** "for about a year", "for good"… for a length in years. */
export const lenWord = (len: number) =>
  say()(len >= FOREVER ? "len.good" : len <= 0 ? "len.once" : len <= 1 ? "len.year" : "len.years", { n: Math.round(len) });
/** "strongest around 11–15" for a change. */
export const bestAges = (id: string) => (AGES[id] ? say()("ui.bestAges", { a: AGES[id][0], b: AGES[id][1] }) : "");

/** "very curious, a bit shy": the two strongest traits of a kid (for stage labels). */
export function kidShort(vs: number[]): string {
  const ext = SHOW.map((s, i) => [s, vs[i]] as [Show, number]).sort((x, y) => Math.abs(y[1] - 50) - Math.abs(x[1] - 50)).slice(0, 2);
  return say()("kid.short", { a: stepWord(ext[0][0], ext[0][1]), b: stepWord(ext[1][0], ext[1][1]) });
}
