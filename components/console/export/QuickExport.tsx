"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { FPS, clipFrames, planReplay, retime } from "@/lib/export/replay";
import { Scrubber } from "@/lib/export/scrub";
import { SIZES, quickStyle } from "@/lib/export/style";
import { pageT } from "@/lib/i18n/page";
import { worldSay } from "@/lib/sim/say";
import Dialog from "../../ui/Dialog";
import { Icon } from "../../ui/Icon";
import { PREMIUM_ON_SALE, usePremium } from "../../account/context";
import { track } from "../../privacy/track";
import { registerStudioFonts } from "./fonts";
import PreviewCanvas from "./PreviewCanvas";
import { Cancelled, exportName, loadFonts, recordVideo, save, videoSupport, type Meta, type Progress } from "./render";

type Phase =
  | { at: "idle" }
  | { at: "working"; p: Progress }
  | { at: "done"; url: string; name: string; size: number }
  | { at: "error"; msg: string };

const Q = (k: string, v?: Record<string, string | number>) => pageT()(`export.quick.${k}`, v);
const S = (k: string, v?: Record<string, string | number>) => pageT()(`export.studio.${k}`, v);
const mb = (n: number) => (n / 1048576 < 0.1 ? S("mbSmall") : S("mb", { n: Math.round(n / 104857.6) / 10 }));
const noop = () => {};

/**
 * Quick export (change 0031): the free export. One landscape video (1920×1080) in the default look, the same frames the
 * studio would make with its defaults; a preview, one button, nothing to edit. Premium keeps the full studio.
 */
export default function QuickExport({ engine, onClose }: { engine: SimEngine; onClose: () => void }) {
  const premium = usePremium();
  const sb = engine.sb;
  const meta: Meta = useMemo(() => ({ key: sb.key, world: worldSay(sb)("meta.name"), intro: worldSay(sb)("meta.intro") }), [sb]);
  registerStudioFonts();
  const style = useMemo(() => quickStyle(), []);
  const plan = useMemo(() => retime(planReplay(engine), { timing: style.timing }), [engine, style]);
  const scrub = useMemo(() => new Scrubber(plan), [plan]);
  const [ready, setReady] = useState(0);
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const abort = useRef<AbortController | null>(null);
  const video = useMemo(() => videoSupport(), []);
  const working = phase.at === "working";

  useEffect(() => {
    let alive = true, id = 0;
    const run = () => { if (!alive) return; if (scrub.work(12)) setReady((n) => n + 1); else id = window.setTimeout(run, 0); };
    id = window.setTimeout(run, 120);
    return () => { alive = false; clearTimeout(id); };
  }, [scrub]);
  useEffect(() => { loadFonts(style).then(() => setReady((n) => n + 1)); }, [style]);
  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => () => { if (phase.at === "done") URL.revokeObjectURL(phase.url); }, [phase]);

  const say = worldSay(sb);
  const { W, H } = SIZES[style.size];
  const clipS = clipFrames(plan) / FPS;
  const spec = `${W} × ${H}${video ? ` · ${video.ext.toUpperCase()}` : ""} · ${FPS} fps · ${Math.round(clipS)} s`;

  const start = async () => {
    const ctl = new AbortController();
    abort.current = ctl;
    const wasPlaying = engine.playing;
    engine.playing = false; // the stage rests while this device renders the file
    setPhase({ at: "working", p: { done: 0, note: S("progress.starting") } });
    try {
      const o = await recordVideo(scrub, style, meta, (p) => setPhase({ at: "working", p }), ctl.signal);
      const name = exportName(sb.key, plan.label, style.size, o.ext);
      const url = URL.createObjectURL(o.blob);
      save(url, name);
      setPhase({ at: "done", url, name, size: o.blob.size });
      track("export", { level: "quick", world: sb.key });
    } catch (e) {
      if (e instanceof Cancelled) setPhase({ at: "idle" });
      else setPhase({ at: "error", msg: e instanceof Error ? e.message : S("error") });
    } finally {
      engine.playing = wasPlaying;
      abort.current = null;
    }
  };

  let actions: React.ReactNode;
  if (phase.at === "working") actions = <button className="btn" onClick={() => abort.current?.abort()}><Icon name="close" size={18} />{S("cancel")}</button>;
  else if (phase.at === "done") actions = (
    <>
      <button className="btn" onClick={() => save(phase.url, phase.name)}>{S("again")}</button>
      <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />{S("done")}</button>
    </>
  );
  else actions = (
    <button className="btn primary" onClick={start} disabled={!video}>
      <Icon name="download" size={18} />{phase.at === "error" ? S("retry") : Q("download")}
    </button>
  );

  return (
    <Dialog open onClose={onClose} title={Q("title")} className="export quick" locked={working} closeLabel={S("close")}>
      <div className="quick-preview">
        <PreviewCanvas scrub={scrub} ready={ready} style={style} slides={false} world={say("meta.name")} intro={say("meta.intro")}
          selected={null} jump={null} onSelect={noop} onMove={noop} />
      </div>
      <div className="studio-foot">
        <div className="studio-status">
          <p className="micro export-spec">{S("specSeed", { spec, seed: plan.seed })}</p>
          {phase.at === "working" ? (
            <div className="export-progress" role="status" aria-live="polite">
              <div className="bar" aria-hidden="true"><i style={{ transform: `scaleX(${phase.p.done})` }} /></div>
              <p className="small">{S("keepOpen", { note: phase.p.note })}</p>
            </div>
          ) : phase.at === "done" ? (
            <p className="small export-done" role="status">{S("saved")} <span className="num">{phase.name}</span> ({mb(phase.size)}).</p>
          ) : phase.at === "error" ? (
            <p className="small is-error" role="alert">{phase.msg}</p>
          ) : (
            <>
              <p className="small export-what">{Q("what", { s: Math.round(clipS) })}</p>
              {!plan.hasWhatIf && <p className="small export-hint">{S("noWhatIf")}</p>}
              {!plan.fromFork && plan.hasWhatIf && <p className="small export-hint">{S("fromNow")}</p>}
              {!video && <p className="small is-error" role="alert">{Q("noVideo")}</p>}
              {PREMIUM_ON_SALE && (
                <p className="small export-hint">
                  <button type="button" className="linkbtn" onClick={() => { onClose(); premium.open("export"); }}>{Q("more")}</button>
                </p>
              )}
            </>
          )}
        </div>
        <div className="sheet-actions">{actions}</div>
      </div>
    </Dialog>
  );
}
