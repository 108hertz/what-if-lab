/**
 * The words of an export as files (change 0022): timed subtitles (.srt), a caption ready to post, and the whole
 * story as Markdown. Plain strings from the replay's summary and timeline. Framework-free.
 */
import type { Control } from "../sim/types";
import type { TimelineItem } from "../sim/engine";
import { eventText, worldSay } from "../sim/say";
import { pageT } from "../i18n/page";

const X = (k: string, v?: Record<string, string | number>) => pageT()(`export.${k}`, v);
import { FPS, type ReplayPlan, type ReplaySummary } from "./replay";
import { controlValue, describeDiff, fmtMetric, headline } from "./frame";

export interface TextInput {
  plan: ReplayPlan;
  summary: ReplaySummary;
  world: string;
  intro: string;
  /** Which shown sim step each running frame shows (`frameSteps`). */
  map: Int32Array;
}

/** Seconds into the video at which sim time `t` is on screen. */
export function videoTime(plan: ReplayPlan, map: Int32Array, t: number): number {
  const step = Math.max(0, Math.min(plan.steps, (t - plan.t0) / Math.max(1e-12, plan.dt)));
  let lo = 0, hi = map.length - 1;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (map[mid] >= step - 1e-9) hi = mid; else lo = mid + 1; }
  return (plan.intro + lo) / FPS;
}

const who = (_plan: ReplayPlan, e: TimelineItem) => X(`who.${e.who}`);

/** Events inside the shown part, what-if-only and no-change-only first, at most `max`, in time order. */
export function shownEvents(plan: ReplayPlan, events: TimelineItem[], max = 12): TimelineItem[] {
  const inRun = events.filter((e) => e.t > plan.t0 - 1e-9 && e.t <= plan.t1 + 1e-9);
  const ranked = [...inRun.filter((e) => e.who !== "both"), ...inRun.filter((e) => e.who === "both")].slice(0, max);
  return ranked.sort((a, b) => a.t - b.t);
}

function srtTime(s: number): string {
  const ms = Math.max(0, Math.round(s * 1000));
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`;
}

/** The result in one line: "Temperature at 2100: no change 2.1 °C, what if 1.4 °C. 0.7 °C cooler." */
export function resultLine(plan: ReplayPlan, summary: ReplaySummary): string {
  const m = summary.metric, end = summary.end;
  const v = { metric: worldSay(plan.sb, plan.params)(`metric.${m.k}.label`), t: plan.sb.fmtT(end.t), base: fmtMetric(m, end.base[m.k]) };
  const first = end.alt ? X("resultAlt", { ...v, alt: fmtMetric(m, end.alt[m.k]) }) : X("result", v);
  const d = describeDiff(m, end);
  return first + "." + (d ? ` ${d.txt}.` : "");
}

/**
 * One narration line (change 0034): seconds into the video, the spoken-style words for the captions layer, and the
 * subtitle form (time · who, then the words). An edited line replaces both.
 */
export interface Cue { a: number; b: number; say: string; srt: string }

/** The run told in timed lines: the question, the moments only one world had, the result. Edits by index. */
export function narration(x: TextInput, edits: Record<number, string> = {}): Cue[] {
  const { plan, summary, map } = x;
  const cues: Cue[] = [];
  const runStart = plan.intro / FPS, runEnd = (plan.intro + plan.frames) / FPS, total = (plan.intro + plan.frames + plan.outro) / FPS;
  const head = headline(plan, x.world);
  cues.push({ a: 0, b: Math.max(runStart, Math.min(2.5, runEnd)), say: head, srt: head });
  for (const e of shownEvents(plan, summary.events)) {
    const a = Math.max(videoTime(plan, map, e.t), cues[cues.length - 1].b);
    if (a >= runEnd) break;
    const say = eventText(plan.sb, e);
    cues.push({ a, b: Math.min(a + 3, runEnd), say, srt: `${plan.sb.fmtT(e.t)} · ${who(plan, e)}\n${say}` });
  }
  for (let i = 0; i < cues.length - 1; i++) cues[i].b = Math.min(cues[i].b, cues[i + 1].a);
  const res = resultLine(plan, summary);
  cues.push({ a: Math.max(runEnd, cues[cues.length - 1].b), b: Math.max(total, runEnd + 2), say: res, srt: res });
  return cues.filter((c) => c.b > c.a).map((c, i) => {
    const ed = edits[i];
    return typeof ed === "string" && ed.trim() ? { ...c, say: ed.trim(), srt: ed.trim() } : c;
  });
}

/** Timed subtitles that match the video frame for frame. */
export function toSrt(x: TextInput, edits?: Record<number, string>): string {
  return narration(x, edits).map((c, i) => `${i + 1}\n${srtTime(c.a)} --> ${srtTime(c.b)}\n${c.srt}\n`).join("\n");
}

/** A caption to paste under a post. */
export function toCaption(x: TextInput): string {
  const { plan, summary } = x;
  const first = plan.label ? X("captionChanged", { world: x.world, what: plan.what ?? plan.label }) : X("next", { world: x.world });
  return [
    first,
    resultLine(plan, summary),
    X("captionRun", { seed: plan.seed }),
    `#whatiflab #whatif #${x.world.toLowerCase().replace(/[^a-z0-9]+/g, "")}`,
  ].join("\n\n");
}

const cell = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");

/** The whole run as Markdown: setup, changes, what happened, what changed. */
export function toStory(x: TextInput): string {
  const { plan, summary } = x;
  const sb = plan.sb, end = summary.end;
  const out: string[] = [];
  out.push(`# ${x.world}: ${headline(plan, x.world)}`, "");
  out.push(X("storyMeta", { from: sb.fmtT(plan.t0), to: sb.fmtT(plan.t1), seed: plan.seed }), "");
  out.push(`## ${X("storySetup")}`, "", x.intro, "");
  const ctls = sb.controls.filter((c): c is Exclude<Control, { type: "heading" }> => c.type !== "heading");
  if (ctls.length) {
    const say = worldSay(sb);
    out.push(`| ${X("storySetting")} | ${X("storyValue")} |`, "| --- | --- |");
    for (const c of ctls) out.push(`| ${cell(say(`ctl.${c.id}.label`))} | ${cell(controlValue(c, plan.params[c.id], say))} |`);
    out.push("");
  }
  out.push(`## ${X("storyChanges")}`, "");
  if (!plan.hasWhatIf) out.push(X("storyNoWhatIf"));
  else if (plan.changes.length) for (const c of plan.changes) out.push(`- ${sb.fmtT(c.t)}: ${sb.whatifs.some((w) => w[0] === c.id) ? worldSay(sb, plan.params)(`whatif.${c.id}`) : c.id}`);
  else out.push(`- ${plan.label}`);
  out.push("");
  const evs = shownEvents(plan, summary.events, 40);
  out.push(`## ${X("storyHappened")}`, "");
  if (!evs.length) out.push(X("nothingNewShort"));
  for (const e of evs) out.push(`- **${sb.fmtT(e.t)}** (${who(plan, e).toLowerCase()}): ${eventText(sb, e)}`);
  out.push("", `## ${X("storyChangedBy", { t: sb.fmtT(end.t) })}`, "");
  out.push(end.alt ? `| ${X("storyNumber")} | ${X("noChange")} | ${X("withChanges")} |` : `| ${X("storyNumber")} | ${X("noChange")} |`, end.alt ? "| --- | --- | --- |" : "| --- | --- |");
  for (const m of sb.metrics) out.push(`| ${cell(worldSay(sb, plan.params)(`metric.${m.k}.label`))} | ${cell(fmtMetric(m, end.base[m.k]))} |${end.alt ? ` ${cell(fmtMetric(m, end.alt[m.k]))} |` : ""}`);
  out.push("", resultLine(plan, summary), "");
  return out.join("\n");
}
