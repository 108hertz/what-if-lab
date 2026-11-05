/**
 * Browser side of Premium exports (change 0020): records the replay into a video with MediaRecorder, and
 * renders slides into a PDF with jsPDF (loaded only when someone exports slides). Everything runs on this
 * device; nothing is uploaded.
 */
import {
  FPS, Replay, keyMetric, keyMoments, type ReplayPlan, type ReplaySummary,
} from "@/lib/export/replay";
import {
  EXPORT_SCALE, INTRO_FRAMES, SLIDE_SIZE, VIDEO_SIZE, clipFrames, drawVideoFrame,
  slideMoment, slideOutcome, slideSetup, slideTitle, slideWhatIf, type SlideCtx, type VideoFormat,
} from "@/lib/export/frame";

export interface Progress {
  /** 0–1. */
  done: number;
  /** Short status line, e.g. "Recording · 4 s of 14 s". */
  note: string;
}

export class Cancelled extends Error {
  constructor() { super("Export cancelled"); this.name = "Cancelled"; }
}

const tick = () => new Promise<void>((r) => setTimeout(r, 0));
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const check = (signal: AbortSignal) => { if (signal.aborted) throw new Cancelled(); };

/** Run the plan once without drawing, in slices so the page stays responsive. Same plan → same result. */
export async function analyse(plan: ReplayPlan, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<{ summary: ReplaySummary; replay: Replay }> {
  const r = new Replay(plan);
  let last = performance.now();
  while (!r.done) {
    r.next();
    if (performance.now() - last > 24) {
      check(signal);
      onProgress({ done: r.frame / plan.steps, note: "Re-running the fork" });
      await tick();
      last = performance.now();
    }
  }
  const end = r.samples[r.samples.length - 1];
  return { replay: r, summary: { end, metric: keyMetric(plan.sb, end), events: r.timeline() } };
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

export async function recordVideo(plan: ReplayPlan, fmt: VideoFormat, world: string, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<{ blob: Blob; ext: string }> {
  const support = videoSupport();
  if (!support) throw new Error("This browser can't record video. Try a recent Chrome, Edge, Firefox or Safari.");
  const { summary } = await analyse(plan, (p) => onProgress({ done: p.done * 0.1, note: p.note }), signal);
  const { W, H } = VIDEO_SIZE[fmt];
  const canvas = hiddenCanvas(W, H);
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as MediaStreamTrack & { requestFrame?: () => void };
  const rec = new MediaRecorder(stream, { mimeType: support.mime, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  const stopped = new Promise<void>((r) => { rec.onstop = () => r(); });
  const r = new Replay(plan);
  const total = clipFrames(plan);
  const info = { world, summary };
  try {
    // Frames are drawn in real time: MediaRecorder stamps them with the wall clock.
    drawVideoFrame(ctx, fmt, r, info, 0);
    rec.start(1000);
    const t0 = performance.now();
    for (let f = 0; f < total; f++) {
      check(signal);
      if (f > INTRO_FRAMES && f <= INTRO_FRAMES + plan.steps) r.next();
      drawVideoFrame(ctx, fmt, r, info, f);
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

// ——— Slides ———

export async function renderSlides(plan: ReplayPlan, meta: { world: string; intro: string }, onProgress: (p: Progress) => void, signal: AbortSignal): Promise<Blob> {
  const pdfLib = import("jspdf");
  const { summary, replay: full } = await analyse(plan, (p) => onProgress({ done: p.done * 0.4, note: p.note }), signal);
  const moments = keyMoments(plan, summary.events, 4);
  const total = 3 + moments.length + 1;
  const { W, H } = SLIDE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const shots: string[] = [];
  const base = (index: number): SlideCtx => ({ world: meta.world, intro: meta.intro, plan, summary, samples: full.samples, index, total });
  const shoot = (draw: () => void) => {
    ctx.setTransform(EXPORT_SCALE, 0, 0, EXPORT_SCALE, 0, 0);
    draw();
    shots.push(canvas.toDataURL("image/jpeg", 0.9));
    onProgress({ done: 0.4 + 0.5 * (shots.length / total), note: `Drawing slide ${shots.length} of ${total}` });
  };

  const r = new Replay(plan);
  const setup = new Replay({ ...plan, changes: [], startAlt: null, label: "", hasWhatIf: false });
  shoot(() => slideTitle(ctx, base(1), r));
  shoot(() => slideSetup(ctx, base(2), setup));
  shoot(() => slideWhatIf(ctx, base(3), r));
  let last = performance.now();
  for (let i = 0; i < moments.length; i++) {
    while (r.frame < moments[i]) {
      r.next();
      if (performance.now() - last > 24) { check(signal); await tick(); last = performance.now(); }
    }
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
