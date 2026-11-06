/**
 * The words of an export as files (change 0022): timed subtitles (.srt), a caption ready to post, and the whole
 * story as Markdown. Plain strings from the replay's summary and timeline. Framework-free.
 */
import type { Control } from "../sim/types";
import type { TimelineItem } from "../sim/engine";
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

const who = (plan: ReplayPlan, e: TimelineItem) =>
  e.who === "alt" ? "With changes only" : e.who === "base" ? "No change only" : "Both worlds";

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
  const parts = [`${m.label} at ${plan.sb.fmtT(end.t)}: no change ${fmtMetric(m, end.base[m.k])}`];
  if (end.alt) parts[0] += `, with changes ${fmtMetric(m, end.alt[m.k])}`;
  const d = describeDiff(m, end);
  return parts[0] + "." + (d ? ` ${d.txt}.` : "");
}

/** Timed subtitles that match the video frame for frame. */
export function toSrt(x: TextInput): string {
  const { plan, summary, map } = x;
  type Cue = { a: number; b: number; txt: string };
  const cues: Cue[] = [];
  const runStart = plan.intro / FPS, runEnd = (plan.intro + plan.frames) / FPS, total = (plan.intro + plan.frames + plan.outro) / FPS;
  cues.push({ a: 0, b: Math.max(runStart, Math.min(2.5, runEnd)), txt: headline(plan, x.world) });
  for (const e of shownEvents(plan, summary.events)) {
    const a = Math.max(videoTime(plan, map, e.t), cues[cues.length - 1].b);
    if (a >= runEnd) break;
    cues.push({ a, b: Math.min(a + 3, runEnd), txt: `${plan.sb.fmtT(e.t)} · ${who(plan, e)}\n${e.txt}` });
  }
  for (let i = 0; i < cues.length - 1; i++) cues[i].b = Math.min(cues[i].b, cues[i + 1].a);
  cues.push({ a: Math.max(runEnd, cues[cues.length - 1].b), b: Math.max(total, runEnd + 2), txt: resultLine(plan, summary) });
  return cues.filter((c) => c.b > c.a).map((c, i) => `${i + 1}\n${srtTime(c.a)} --> ${srtTime(c.b)}\n${c.txt}\n`).join("\n");
}

/** A caption to paste under a post. */
export function toCaption(x: TextInput): string {
  const { plan, summary } = x;
  const q = plan.label ? plan.label.replace(/^(What if|Changed):\s*/i, "") : "";
  const first = plan.label
    ? `${x.world}, changed: ${q}.`
    : `${x.world}: what happens next?`;
  return [
    first,
    resultLine(plan, summary),
    `Same world, same seed (${plan.seed}), same rules: run it yourself in What-If Lab.`,
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
  out.push(`From ${sb.fmtT(plan.t0)} to ${sb.fmtT(plan.t1)} · seed ${plan.seed} · made with What-If Lab (rule-based, no AI, no live data).`, "");
  out.push("## The setup", "", x.intro, "");
  const ctls = sb.controls.filter((c): c is Exclude<Control, { type: "heading" }> => c.type !== "heading");
  if (ctls.length) {
    out.push("| Setting | Value |", "| --- | --- |");
    for (const c of ctls) out.push(`| ${cell(c.label)} | ${cell(controlValue(c, plan.params[c.id]))} |`);
    out.push("");
  }
  out.push("## The changes", "");
  if (!plan.hasWhatIf) out.push("No what-if: this is the world as it is.");
  else if (plan.changes.length) for (const c of plan.changes) out.push(`- ${sb.fmtT(c.t)}: ${sb.whatifs.find((w) => w[0] === c.id)?.[1] ?? c.id}`);
  else out.push(`- ${plan.label}`);
  out.push("");
  const evs = shownEvents(plan, summary.events, 40);
  out.push("## What happened", "");
  if (!evs.length) out.push("Nothing new happened in this stretch.");
  for (const e of evs) out.push(`- **${sb.fmtT(e.t)}** (${who(plan, e).toLowerCase()}): ${e.txt}`);
  out.push("", `## What changed by ${sb.fmtT(end.t)}`, "");
  out.push(end.alt ? `| Number | No change | With changes |` : "| Number | No change |", end.alt ? "| --- | --- | --- |" : "| --- | --- |");
  for (const m of sb.metrics) out.push(`| ${cell(m.label)} | ${cell(fmtMetric(m, end.base[m.k]))} |${end.alt ? ` ${cell(fmtMetric(m, end.alt[m.k]))} |` : ""}`);
  out.push("", resultLine(plan, summary), "");
  return out.join("\n");
}
