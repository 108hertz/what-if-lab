/**
 * Browser side of Premium exports (change 0020; styled outputs in change 0022): records the replay into a video
 * with MediaRecorder, renders PNG stills (zipped with fflate) and slides (jsPDF), and packs the text files.
 * fflate and jsPDF load only when someone exports with them. Everything runs on this device; nothing is uploaded.
 */
import { FPS, Replay, clipFrames, clipPhase, keyMoments } from "@/lib/export/replay";
import type { Analysis, Scrubber } from "@/lib/export/scrub";
import {
  EXPORT_SCALE, SLIDE_SIZE, drawChartStill, drawStageStill, drawVideoFrame, paint, resolveSplit,
  slideMoment, slideOutcome, slideSetup, slideTitle, slideWhatIf, type SlideCtx,
} from "@/lib/export/frame";
import { FONT_FAMILIES, SIZES, type ExportStyle } from "@/lib/export/style";
import { toCaption, toSrt, toStory } from "@/lib/export/text";

export interface Progress {
  /** 0–1. */
  done: number;
  /** Short status line, e.g. "Recording · 4 s of 14 s". */
  note: string;
}

export interface Meta { key: string; world: string; intro: string }

export class Cancelled extends Error {
  constructor() { super("Export cancelled"); this.name = "Cancelled"; }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const check = (signal?: AbortSignal) => { if (signal?.aborted) throw new Cancelled(); };

/** Finish the scrubber's analysis in slices so the page stays responsive. */
export async function analyse(scrub: Scrubber, onProgress?: (p: Progress) => void, signal?: AbortSignal): Promise<Analysis> {
  while (!scrub.work(20)) {
    check(signal);
    onProgress?.({ done: scrub.progress, note: "Re-running the fork" });
    await tick();
  }
  return scrub.result!;
}

/** Wait for the style's two faces (self-hosted, loaded on demand) so the first frame isn't in a fallback font. */
export async function loadFonts(style: ExportStyle): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const fams = [FONT_FAMILIES[style.fonts.title], FONT_FAMILIES[style.fonts.body]];
  try {
    await Promise.race([
      Promise.all(fams.flatMap((f) => ["400", "500", "700"].map((w) => document.fonts.load(`${w} 24px ${f}`)))),
      sleep(3000),
    ]);
  } catch { /* draw with what we have */ }
}

// ——— Video ———

const VIDEO_TYPES: [mime: string, ext: "mp4" | "webm"][] = [
  ["video/mp4;codecs=avc1.640028", "mp4"],
  ["video/mp4;codecs=avc1", "mp4"],
  ["video/mp4", "mp4"],
  ["video/webm;codecs=vp9", "webm"],
  ["video/webm;codecs=vp8", "webm"],
  ["video/webm", "webm"],
];

/** The best recording format this browser offers, or null when it cannot record a canvas. */
export function videoSupport(): { mime: string; ext: "mp4" | "webm" } | null {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") return null;
  if (typeof HTMLCanvasElement.prototype.captureStream !== "function") return null;
  for (const [mime, ext] of VIDEO_TYPES) {
    try { if (MediaRecorder.isTypeSupported(mime)) return { mime, ext }; } catch { /* keep looking */ }
  }
  return null;
}

/** A canvas kept out of view but in the document (some browsers only capture attached canvases). */
function hiddenCanvas(W: number, H: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.setAttribute("aria-hidden", "true");
  Object.assign(c.style, { position: "fixed", left: "-100000px", top: "0", width: `${W / 10}px`, height: `${H / 10}px`, pointerEvents: "none" });
  document.body.appendChild(c);
  return c;
}

/** Shown sim step for a clip frame. */
const stepAt = (a: Analysis, f: number) => {
  const ph = clipPhase(a.plan, f);
  return ph.at === "intro" ? 0 : ph.at === "outro" ? a.plan.steps : a.map[ph.i];
};

export async function recordVideo(scrub: Scrubber, style: ExportStyle, meta: Meta, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<{ blob: Blob; ext: string }> {
  const support = videoSupport();
  if (!support) throw new Error("This browser can't record video. Try a recent Chrome, Edge, Firefox or Safari.");
  const a = await analyse(scrub, (p) => onProgress({ done: p.done * 0.1, note: p.note }), signal);
  await loadFonts(style);
  const plan = a.plan;
  const { W, H } = SIZES[style.size];
  const canvas = hiddenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const rec = new MediaRecorder(stream, { mimeType: support.mime, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  const r = scrub.atStep(0);
  const total = clipFrames(plan);
  const info = { world: meta.world, summary: a.summary, samples: a.samples };
  const draw = (f: number) => paint(style, () => drawVideoFrame(ctx, style, r, info, f));
  try {
    // Frames are drawn in real time: MediaRecorder stamps them with the wall clock.
    draw(0);
    rec.start(1000);
    const t0 = performance.now();
    for (let f = 0; f < total; f++) {
      check(signal);
      r.seek(stepAt(a, f));
      draw(f);
      track.requestFrame?.();
      if (f % 6 === 0) onProgress({ done: 0.1 + 0.9 * (f / total), note: `Recording · ${Math.floor(f / FPS)} s of ${Math.ceil(total / FPS)} s` });
      const wait = t0 + ((f + 1) * 1000) / FPS - performance.now();
      await sleep(Math.max(0, wait));
    }
    rec.stop();
    await stopped;
    onProgress({ done: 1, note: "Saving" });
    return { blob: new Blob(chunks, { type: support.mime.split(";")[0] }), ext: support.ext };
  } finally {
    if (rec.state !== "inactive") rec.stop();
    stream.getTracks().forEach((t) => t.stop());
    canvas.remove();
  }
}

// ——— Stills ———

function toBlob(c: HTMLCanvasElement, type = "image/png", q?: number): Promise<Blob> {
  return new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Couldn't draw the picture."))), type, q));
}

/** First run frame that shows at least `step` shown sim steps. */
function frameOfStep(a: Analysis, step: number): number {
  let i = 0;
  while (i < a.plan.frames && a.map[i] < step) i++;
  return a.plan.intro + i;
}

/** PNG stills: title, key moments, result, the chart alone and the stage alone. */
export async function renderStills(scrub: Scrubber, style: ExportStyle, meta: Meta, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<{ name: string; blob: Blob }[]> {
  const a = await analyse(scrub, (p) => onProgress({ done: p.done * 0.3, note: p.note }), signal);
  await loadFonts(style);
  const plan = a.plan;
  const { W, H } = SIZES[style.size];
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const info = { world: meta.world, summary: a.summary, samples: a.samples };
  const total = clipFrames(plan);
  const moments = keyMoments(plan, a.summary.events, 4).filter((s) => s < plan.steps);
  type Shot = [name: string, draw: () => void];
  const frameShot = (f: number) => () => { const r = scrub.at(f); drawVideoFrame(ctx, style, r, info, f); };
  const shots: Shot[] = [];
  if (plan.intro > 0 && !style.clean) shots.push(["title", frameShot(plan.intro - 1)]);
  moments.forEach((s, i) => shots.push([`moment-${i + 1}`, frameShot(frameOfStep(a, s))]));
  shots.push(["result", frameShot(total - 1)]);
  shots.push(["chart", () => drawChartStill(ctx, style, plan, info, a.samples)]);
  shots.push(["stage", () => drawStageStill(ctx, style, scrub.at(total - 1))]);
  const out: { name: string; blob: Blob }[] = [];
  for (let i = 0; i < shots.length; i++) {
    check(signal);
    const [name, draw] = shots[i];
    ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    paint(style, draw);
    out.push({ name: `${String(i + 1).padStart(2, "0")}-${name}.png`, blob: await toBlob(canvas) });
    onProgress({ done: 0.3 + 0.65 * ((i + 1) / shots.length), note: `Drawing picture ${i + 1} of ${shots.length}` });
    await tick();
  }
  return out;
}

/** Pack files into one zip (no recompression: PNGs are already compressed). */
export async function zip(files: { name: string; blob: Blob | string }[]): Promise<Blob> {
  const { zipSync, strToU8 } = await import("fflate");
  const entries: Record<string, Uint8Array> = {};
  for (const f of files) entries[f.name] = typeof f.blob === "string" ? strToU8(f.blob) : new Uint8Array(await f.blob.arrayBuffer());
  return new Blob([zipSync(entries, { level: 0 }) as BlobPart], { type: "application/zip" });
}

// ——— Text ———

export interface TextFiles { srt: string; caption: string; story: string }

export function renderText(a: Analysis, meta: Meta): TextFiles {
  const x = { plan: a.plan, summary: a.summary, world: meta.world, intro: meta.intro, map: a.map };
  return { srt: toSrt(x), caption: toCaption(x), story: toStory(x) };
}

// ——— Slides ———

export async function renderSlides(scrub: Scrubber, style: ExportStyle, meta: Meta, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<Blob> {
  const pdfLib = import("jspdf");
  const a = await analyse(scrub, (p) => onProgress({ done: p.done * 0.4, note: p.note }), signal);
  await loadFonts(style);
  const plan = a.plan, summary = a.summary;
  const moments = keyMoments(plan, summary.events, 4);
  const total = 3 + moments.length + 1;
  const { W, H } = SLIDE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const shots: string[] = [];
  const split = resolveSplit(style.layout.split, 480, 400);
  const base = (index: number): SlideCtx => ({ world: meta.world, intro: meta.intro, plan, summary, samples: a.samples, index, total, split });
  const shoot = (draw: () => void) => {
    ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    paint(style, draw);
    shots.push(canvas.toDataURL("image/jpeg", 0.9));
    onProgress({ done: 0.4 + 0.5 * (shots.length / total), note: `Drawing slide ${shots.length} of ${total}` });
  };

  const r0 = scrub.atStep(0);
  // The setup slide shows the world before any change: a plan without changes, from the fork
  const setup = new Replay({ ...plan, changes: [], startAlt: null, label: "", hasWhatIf: false, pre: 0 });
  shoot(() => slideTitle(ctx, base(1), r0));
  shoot(() => slideSetup(ctx, base(2), setup));
  shoot(() => slideWhatIf(ctx, base(3), r0));
  for (let i = 0; i < moments.length; i++) {
    check(signal);
    const r = scrub.atStep(moments[i]);
    shoot(() => slideMoment(ctx, base(4 + i), r));
    await tick();
  }
  shoot(() => slideOutcome(ctx, base(total)));
  check(signal);

  onProgress({ done: 0.95, note: "Making the PDF" });
  const { jsPDF } = await pdfLib;
  const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [W, H], hotfixes: ["px_scaling"], compress: true });
  pdf.setProperties({ title: `${meta.world} · What-If Lab`, subject: plan.label || meta.world, creator: "What-If Lab" });
  shots.forEach((img, i) => {
    if (i > 0) pdf.addPage([W, H], "landscape");
    pdf.addImage(img, "JPEG", 0, 0, W, H);
  });
  return pdf.output("blob");
}

/** what-if-lab-earth-stop-all-emissions-now-phone.mp4 */
export function exportName(key: string, label: string, kind: string, ext: string): string {
  const slug = label.replace(/^(What if|Changed):\s*/i, "").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48);
  return ["what-if-lab", key, slug || "as-it-is", kind].filter(Boolean).join("-") + "." + ext;
}

/** Hand a file to the browser's own download. */
export function save(url: string, name: string): void {
  const a = document.createElement("a");
  a.href = url; a.download = name; a.rel = "noopener";
  document.body.appendChild(a); a.click(); a.remove();
}

/** Download a blob or a string as a file. */
export function saveBlob(blob: Blob | string, name: string, type = "text/plain;charset=utf-8"): void {
  const b = typeof blob === "string" ? new Blob([blob], { type }) : blob;
  const url = URL.createObjectURL(b);
  save(url, name);
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
