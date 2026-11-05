"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { FPS, Replay, keyMetric, planReplay, type ReplayPlan } from "@/lib/export/replay";
import {
  EXPORT_SCALE, FADE_FRAMES, INTRO_FRAMES, OUTRO_FRAMES, SLIDE_SIZE, VIDEO_SIZE, drawVideoFrame, slideTitle, type VideoFormat,
} from "@/lib/export/frame";
import Dialog from "../../ui/Dialog";
import { Icon, type IconName } from "../../ui/Icon";
import { PREMIUM_ON_SALE, useAccount, usePremium } from "../../account/context";
import { canExport } from "../../account/state";
import { Cancelled, exportName, recordVideo, renderSlides, save, videoSupport, type Progress } from "./render";

type Kind = "phone" | "youtube" | "slides";
const KINDS: [Kind, IconName, string, string][] = [
  ["phone", "phone", "Phone", "Phone video · 1080 × 1920"],
  ["youtube", "wide", "YouTube", "YouTube video · 1920 × 1080"],
  ["slides", "slides", "Slides", "Slides · PDF · 16:9"],
];
const FORMAT: Record<Exclude<Kind, "slides">, VideoFormat> = { phone: "vertical", youtube: "horizontal" };

type Phase =
  | { at: "idle" }
  | { at: "working"; p: Progress }
  | { at: "done"; url: string; name: string; size: number }
  | { at: "error"; msg: string };

const mb = (n: number) => (n / 1048576 < 0.1 ? "under 0.1" : (n / 1048576).toFixed(1)) + " MB";

/** Transport button (before full screen). Every world gets it through the shared Transport. */
export function ExportButton({ engine }: { engine: SimEngine }) {
  const [open, setOpen] = useState(false);
  if (!PREMIUM_ON_SALE) return null;
  return (
    <>
      <button type="button" className="btn export-btn" aria-label="Export video or slides" title="Export video or slides" onClick={() => setOpen(true)}>
        <Icon name="download" size={18} />
        <span className="btn-text">Export</span>
      </button>
      {open && <ExportDialog engine={engine} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Live first frame of what the export will look like, drawn by the same code that renders the file. */
function Preview({ engine, plan, kind }: { engine: SimEngine; plan: ReplayPlan; kind: Kind }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const r = new Replay(plan);
    const now = engine.readouts();
    const summary = { end: r.samples[0], metric: keyMetric(plan.sb, { t: engine.base.t, base: now.base, alt: now.alt }), events: [] };
    const size = kind === "slides" ? SLIDE_SIZE : VIDEO_SIZE[FORMAT[kind]];
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const ctx = cv.getContext("2d")!;
    const s = (W / size.w) * dpr;
    ctx.setTransform(s, 0, 0, s, 0, 0);
    if (kind === "slides") slideTitle(ctx, { world: engine.sb.name, intro: engine.sb.intro, plan, summary, samples: r.samples, index: 1, total: 1 }, r);
    else drawVideoFrame(ctx, FORMAT[kind], r, { world: engine.sb.name, summary }, INTRO_FRAMES + FADE_FRAMES);
  }, [engine, plan, kind]);
  return (
    <div className={`export-preview is-${kind}`}>
      <canvas ref={ref} aria-label={`Preview of the ${kind === "slides" ? "first slide" : "video"}`} role="img" />
    </div>
  );
}

export default function ExportDialog({ engine, onClose }: { engine: SimEngine; onClose: () => void }) {
  const account = useAccount();
  const premium = usePremium();
  const allowed = canExport(account);
  const [kind, setKind] = useState<Kind>(() => (window.matchMedia("(max-width: 767px)").matches ? "phone" : "youtube"));
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const abort = useRef<AbortController | null>(null);
  // The recipe is fixed when the dialog opens: the export is exactly this fork, whatever the stage does next.
  const plan = useMemo(() => planReplay(engine), [engine]);
  const video = useMemo(() => videoSupport(), []);
  const sb = engine.sb;

  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => () => { if (phase.at === "done") URL.revokeObjectURL(phase.url); }, [phase]);

  const working = phase.at === "working";
  const isVideo = kind !== "slides";
  const runS = Math.round(plan.steps / FPS);
  const clipS = Math.round((INTRO_FRAMES + plan.steps + OUTRO_FRAMES) / FPS);
  const span = `${sb.fmtT(plan.t0)} to ${sb.fmtT(plan.t1)}`;
  const what = isVideo
    ? `A ${clipS}-second clip: the title, ${runS} seconds of both worlds running from ${span}, then the result.`
    : `Title, setup, the what-if, three to four key moments and the outcome, from ${span}.`;

  const start = async () => {
    const ctl = new AbortController();
    abort.current = ctl;
    const wasPlaying = engine.playing;
    engine.playing = false; // the stage rests while this device renders the file
    setPhase({ at: "working", p: { done: 0, note: "Starting" } });
    const onProgress = (p: Progress) => setPhase({ at: "working", p });
    try {
      let blob: Blob, name: string;
      if (kind === "slides") {
        blob = await renderSlides(plan, { world: sb.name, intro: sb.intro }, onProgress, ctl.signal);
        name = exportName(sb.key, plan.label, "slides", "pdf");
      } else {
        const out = await recordVideo(plan, FORMAT[kind], sb.name, onProgress, ctl.signal);
        blob = out.blob;
        name = exportName(sb.key, plan.label, kind, out.ext);
      }
      const url = URL.createObjectURL(blob);
      save(url, name);
      setPhase({ at: "done", url, name, size: blob.size });
    } catch (e) {
      if (e instanceof Cancelled) setPhase({ at: "idle" });
      else setPhase({ at: "error", msg: e instanceof Error ? e.message : "Something went wrong while exporting." });
    } finally {
      engine.playing = wasPlaying;
      abort.current = null;
    }
  };

  const unlock = () => { onClose(); premium.open("export"); };

  let actions: React.ReactNode;
  if (phase.at === "working") {
    actions = <button className="btn" onClick={() => abort.current?.abort()}><Icon name="close" size={18} />Cancel</button>;
  } else if (phase.at === "done") {
    actions = (
      <>
        <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />Done</button>
        <button className="btn" onClick={() => save(phase.url, phase.name)}>Download again</button>
      </>
    );
  } else if (!allowed) {
    actions = <button className="btn primary" onClick={unlock}><Icon name="arrow" size={18} />Unlock with Premium</button>;
  } else {
    const blocked = isVideo && !video;
    actions = (
      <button className="btn primary" onClick={start} disabled={blocked}>
        <Icon name="download" size={18} />
        {phase.at === "error" ? "Try again" : isVideo ? "Export video" : "Export slides"}
      </button>
    );
  }

  return (
    <Dialog open onClose={onClose} title="Export this run" className="export" locked={working} closeLabel="Close export">
      <div className="seg export-kinds" role="radiogroup" aria-label="Format">
        {KINDS.map(([k, icon, name]) => (
          <button key={k} role="radio" aria-checked={kind === k} disabled={working} onClick={() => { setKind(k); setPhase({ at: "idle" }); }}>
            <Icon name={icon} size={18} />
            {name}
          </button>
        ))}
      </div>
      <Preview engine={engine} plan={plan} kind={kind} />
      <p className="micro export-spec">
        {KINDS.find((x) => x[0] === kind)![3]}
        {isVideo && video ? ` · ${video.ext.toUpperCase()} · 30 fps` : ""}
        {` · seed ${plan.seed}`}
      </p>
      {phase.at === "working" ? (
        <div className="export-progress" role="status" aria-live="polite">
          <div className="bar" aria-hidden="true"><i style={{ transform: `scaleX(${phase.p.done})` }} /></div>
          <p className="small">{phase.p.note}{isVideo ? ". Keep this tab open while it records." : "."}</p>
        </div>
      ) : phase.at === "done" ? (
        <p className="small export-done" role="status">Saved <span className="num">{phase.name}</span> ({mb(phase.size)}). The same world, seed and what-if always replay the same run.</p>
      ) : (
        <>
          <p className="small export-what">{what}</p>
          {!plan.hasWhatIf && <p className="small export-hint">No what-if yet, so this shows the world as it is. Pick a what-if first to compare two futures.</p>}
          {!plan.fromFork && plan.hasWhatIf && <p className="small export-hint">This run starts from now, because the changes were edited after the fork.</p>}
          {isVideo && !video && <p className="small is-error" role="alert">This browser can't record video. Try a recent Chrome, Edge, Firefox or Safari, or export slides.</p>}
          {!allowed && <p className="small export-hint">Exports are part of Premium, $15 a year. Every world and every what-if stays free.</p>}
          {phase.at === "error" && <p className="small is-error" role="alert">{phase.msg}</p>}
        </>
      )}
      <div className="sheet-actions">{actions}</div>
    </Dialog>
  );
}
