"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { FPS, clipFrames, planReplay, retime } from "@/lib/export/replay";
import { Scrubber } from "@/lib/export/scrub";
import { SIZES, defaultStyle, parseStyle, withSize, type ExportStyle, type LayerId, type SizeId } from "@/lib/export/style";
import Dialog from "../../ui/Dialog";
import { Icon } from "../../ui/Icon";
import { PREMIUM_ON_SALE, useAccount, usePremium } from "../../account/context";
import { canExport } from "../../account/state";
import { registerStudioFonts } from "./fonts";
import PreviewCanvas from "./PreviewCanvas";
import { LookTab, OutputTab, TextTab, TimingTab, type Out } from "./StudioControls";
import { Cancelled, exportName, loadFonts, recordVideo, renderSlides, renderStills, renderText, save, saveBlob, videoSupport, zip, type Meta, type Progress } from "./render";
import { deleteStyle, lastStyle, rememberStyle, saveStyle, savedStyles, type SavedStyle } from "./styles";

type Tab = "output" | "text" | "look" | "timing";
const TABS: [Tab, string][] = [["output", "Output"], ["text", "Text"], ["look", "Look"], ["timing", "Timing"]];

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
      <button type="button" className="btn export-btn" aria-label="Export video, pictures, text or slides" title="Export video, pictures, text or slides" onClick={() => setOpen(true)}>
        <Icon name="download" size={18} />
        <span className="btn-text">Export</span>
      </button>
      {open && <ExportDialog engine={engine} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The export studio (change 0022): one fork, styled your way, out as a video, pictures, text or slides. */
export default function ExportDialog({ engine, onClose }: { engine: SimEngine; onClose: () => void }) {
  const account = useAccount();
  const premium = usePremium();
  const allowed = canExport(account);
  const sb = engine.sb;
  const meta: Meta = useMemo(() => ({ key: sb.key, world: sb.name, intro: sb.intro }), [sb]);
  const narrow = () => window.matchMedia("(max-width: 767px)").matches;

  registerStudioFonts();
  const [style, setStyleRaw] = useState<ExportStyle>(() => {
    const last = lastStyle();
    return last ?? defaultStyle(narrow() ? "phone" : "youtube");
  });
  const [out, setOut] = useState<Out>("video");
  const [tab, setTab] = useState<Tab>("output");
  const [selected, setSelected] = useState<LayerId | null>(null);
  const [range, setRange] = useState<{ from?: number; to?: number }>({});
  const [phase, setPhase] = useState<Phase>({ at: "idle" });
  const [jump, setJump] = useState<{ frame: number; n: number } | null>(null);
  const abort = useRef<AbortController | null>(null);
  const video = useMemo(() => videoSupport(), []);

  // The recipe is captured once, when the studio opens: the export is exactly this fork, whatever the stage does next.
  const captured = useMemo(() => planReplay(engine), [engine]);
  const timingKey = JSON.stringify([style.timing, range]);
  const plan = useMemo(() => retime(captured, { timing: style.timing, ...range }), [captured, timingKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const scrub = useMemo(() => new Scrubber(plan), [plan]);
  const [ready, setReady] = useState(0);
  const working = phase.at === "working";

  // Analyse in the background, in slices; the preview redraws once it's done
  useEffect(() => {
    let alive = true, id = 0;
    const run = () => { if (!alive) return; if (scrub.work(12)) setReady((n) => n + 1); else id = window.setTimeout(run, 0); };
    id = window.setTimeout(run, 120);
    return () => { alive = false; clearTimeout(id); };
  }, [scrub]);

  const setStyle = useCallback((fn: (s: ExportStyle) => ExportStyle) => setStyleRaw((s) => fn(s)), []);
  useEffect(() => { rememberStyle(style); }, [style]);
  useEffect(() => { loadFonts(style).then(() => setReady((n) => n + 1)); }, [style.fonts.title, style.fonts.body]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => { abort.current?.abort(); }, []);
  useEffect(() => () => { if (phase.at === "done") URL.revokeObjectURL(phase.url); }, [phase]);
  useEffect(() => { if (phase.at === "done" || phase.at === "error") setPhase({ at: "idle" }); }, [out, style.size]); // eslint-disable-line react-hooks/exhaustive-deps

  const select = (id: LayerId | null) => {
    setSelected(id);
    if (!id) return;
    if (tab !== "text") setTab("text");
    // Show the layer: the opening title before the run, the result card at the end
    const w = style.layers[id].when;
    const total = clipFrames(plan);
    if (w === "intro") setJump((j) => ({ frame: Math.max(0, plan.intro - 1), n: (j?.n ?? 0) + 1 }));
    else if (w === "outro") setJump((j) => ({ frame: total - 1, n: (j?.n ?? 0) + 1 }));
  };
  const move = useCallback((id: LayerId, x: number, y: number) => setStyle((s) => ({ ...s, layers: { ...s.layers, [id]: { ...s.layers[id], x, y } } })), [setStyle]);
  const onSize = (size: SizeId) => setStyle((s) => withSize(s, size));

  const a = ready > 0 ? scrub.result : null;
  const texts = useMemo(() => (a ? renderText(a, meta) : null), [a, meta]);
  const clipS = clipFrames(plan) / FPS;
  const runS = plan.frames / FPS;
  const span = `${sb.fmtT(plan.t0)} to ${sb.fmtT(plan.t1)}`;
  const { W, H } = SIZES[style.size];
  const spec = out === "video" ? `${W} × ${H}${video ? ` · ${video.ext.toUpperCase()}` : ""} · ${FPS} fps · ${Math.round(clipS)} s`
    : out === "images" ? `${W} × ${H} · PNG · zip`
    : out === "text" ? "SRT · TXT · Markdown · zip"
    : "PDF · 16:9";
  const what = out === "video"
    ? `A ${Math.round(clipS)}-second clip: ${style.clean ? "the stage only" : "the title"}, ${Math.round(runS)} seconds of ${plan.hasWhatIf ? "both worlds" : "the world"} running from ${span}${style.clean ? "" : ", then the result"}.`
    : out === "images" ? "The title, key moments, the result, the chart alone and the stage alone, as full-size pictures."
    : out === "text" ? "Subtitles timed to the video, a caption ready to post, and the whole story with every number."
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
      if (out === "slides") {
        blob = await renderSlides(scrub, style, meta, onProgress, ctl.signal);
        name = exportName(sb.key, plan.label, "slides", "pdf");
      } else if (out === "images") {
        const files = await renderStills(scrub, style, meta, onProgress, ctl.signal);
        onProgress({ done: 0.97, note: "Packing the pictures" });
        blob = await zip(files);
        name = exportName(sb.key, plan.label, `${style.size}-pictures`, "zip");
      } else if (out === "text") {
        const t = texts ?? renderText(scrub.finish(), meta);
        const base = exportName(sb.key, plan.label, "", "").replace(/-?\.$/, "");
        blob = await zip([{ name: `${base}.srt`, blob: t.srt }, { name: `${base}-caption.txt`, blob: t.caption }, { name: `${base}-story.md`, blob: t.story }]);
        name = exportName(sb.key, plan.label, "text", "zip");
      } else {
        const o = await recordVideo(scrub, style, meta, onProgress, ctl.signal);
        blob = o.blob;
        name = exportName(sb.key, plan.label, style.clean ? `${style.size}-clean` : style.size, o.ext);
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
        <button className="btn" onClick={() => save(phase.url, phase.name)}>Download again</button>
        <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />Done</button>
      </>
    );
  } else if (!allowed) {
    actions = <button className="btn primary" onClick={unlock}><Icon name="arrow" size={18} />Unlock with Premium</button>;
  } else {
    const blocked = out === "video" && !video;
    const label = { video: "Export video", images: "Download pictures", text: "Download text", slides: "Export slides" }[out];
    actions = (
      <button className="btn primary" onClick={start} disabled={blocked}>
        <Icon name="download" size={18} />
        {phase.at === "error" ? "Try again" : label}
      </button>
    );
  }

  const textTab = (
    <>
      {out === "text" && (
        <div className="studio-texts">
          {([["srt", "Subtitles", "srt"], ["caption", "Caption to post", "txt"], ["story", "The whole story", "md"]] as const).map(([k, n, ext]) => (
            <div key={k} className="studio-textfile">
              <div className="ctl-l">{n}<output>.{ext}</output></div>
              <textarea readOnly className="studio-words" rows={k === "caption" ? 6 : 4} value={texts ? texts[k] : "Preparing…"} aria-label={n} />
              <div className="studio-row">
                <button type="button" className="btn" disabled={!allowed || !texts} onClick={() => texts && navigator.clipboard?.writeText(texts[k])}><Icon name="copy" size={18} />Copy</button>
                <button type="button" className="btn" disabled={!allowed || !texts}
                  onClick={() => texts && saveBlob(texts[k], exportName(sb.key, plan.label, k === "srt" ? "" : k, ext).replace("-.", "."), ext === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8")}>
                  <Icon name="download" size={18} />Download
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );

  return (
    <Dialog open onClose={onClose} title="Export studio" className="export studio" locked={working} closeLabel="Close export">
      <div className="studio-main">
        <PreviewCanvas scrub={scrub} ready={ready} style={style} slides={out === "slides"} world={sb.name} intro={sb.intro}
          selected={tab === "text" ? selected : null} jump={jump} onSelect={select} onMove={move} />
        <div className="studio-side">
          <div className="seg studio-tabs" role="tablist" aria-label="Export settings">
            {TABS.map(([t, n]) => (
              <button key={t} type="button" role="tab" id={`stab-${t}`} aria-selected={tab === t} aria-controls="studio-panel" disabled={working} onClick={() => setTab(t)}>{n}</button>
            ))}
          </div>
          <div className="studio-panel" id="studio-panel" role="tabpanel" aria-labelledby={`stab-${tab}`}>
            <fieldset disabled={working}>
              {tab === "output" && (
                <>
                  <OutputTab out={out} setOut={setOut} style={style} set={setStyle} onSize={onSize} />
                  {textTab}
                </>
              )}
              {tab === "text" && <TextTab style={style} set={setStyle} selected={selected} select={select} />}
              {tab === "look" && <LookTab style={style} set={setStyle} />}
              {tab === "timing" && (
                <TimingTab style={style} set={setStyle} plan={plan} range={range} setRange={setRange} events={a?.summary.events ?? []} />
              )}
            </fieldset>
          </div>
        </div>
      </div>
      <div className="studio-foot">
        <div className="studio-status">
          <p className="micro export-spec">{spec} · seed {plan.seed}</p>
          {phase.at === "working" ? (
            <div className="export-progress" role="status" aria-live="polite">
              <div className="bar" aria-hidden="true"><i style={{ transform: `scaleX(${phase.p.done})` }} /></div>
              <p className="small">{phase.p.note}{out === "video" ? ". Keep this tab open while it records." : "."}</p>
            </div>
          ) : phase.at === "done" ? (
            <p className="small export-done" role="status">Saved <span className="num">{phase.name}</span> ({mb(phase.size)}).</p>
          ) : phase.at === "error" ? (
            <p className="small is-error" role="alert">{phase.msg}</p>
          ) : (
            <>
              <p className="small export-what">{what}</p>
              {!plan.hasWhatIf && <p className="small export-hint">No what-if yet, so this shows the world as it is. Pick a what-if first to compare two futures.</p>}
              {!plan.fromFork && plan.hasWhatIf && <p className="small export-hint">This run starts from now, because the changes were edited after the fork.</p>}
              {out === "video" && !video && <p className="small is-error" role="alert">This browser can&apos;t record video. Try a recent Chrome, Edge, Firefox or Safari, or make pictures or slides.</p>}
              {!allowed && <p className="small export-hint">Try every setting here. Downloading is part of Premium, $15 a year; every world and what-if stays free.</p>}
            </>
          )}
        </div>
        <div className="sheet-actions">
          <MyStyles style={style} disabled={working} onLoad={(s) => setStyleRaw(s)} onReset={() => { setStyleRaw(defaultStyle(style.size)); setRange({}); }} />
          {actions}
        </div>
      </div>
    </Dialog>
  );
}

/** Save, load, copy and paste styles; reset to the default look. */
function MyStyles({ style, disabled, onLoad, onReset }: { style: ExportStyle; disabled: boolean; onLoad: (s: ExportStyle) => void; onReset: () => void }) {
  const [list, setList] = useState<SavedStyle[]>([]);
  const [name, setName] = useState("");
  const [paste, setPaste] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const ref = useRef<HTMLDetailsElement>(null);
  const close = () => { if (ref.current) ref.current.open = false; };
  return (
    <details className="studio-styles" ref={ref} onToggle={(e) => { if ((e.target as HTMLDetailsElement).open) { setList(savedStyles()); setNote(""); setPaste(null); } }}>
      <summary className={`btn${disabled ? " is-disabled" : ""}`} aria-disabled={disabled}>My styles<Icon name="chevron" size={18} /></summary>
      <div className="studio-styles-pop" role="group" aria-label="My styles">
        <form className="studio-row" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; setList(saveStyle(name.trim(), style)); setName(""); setNote("Saved in this browser."); }}>
          <input className="studio-hex studio-name" placeholder="Name this style" aria-label="Style name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn" disabled={!name.trim()}>Save</button>
        </form>
        {list.length > 0 && (
          <ul className="studio-saved">
            {list.map((s) => (
              <li key={s.name}>
                <button type="button" className="studio-saved-n" onClick={() => { onLoad(s.style); close(); }}>{s.name}</button>
                <button type="button" className="iconbtn" aria-label={`Delete ${s.name}`} onClick={() => setList(deleteStyle(s.name))}><Icon name="close" size={18} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="studio-row">
          <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(style)).then(() => setNote("Style copied. Paste it on another device."), () => setNote("Couldn't copy here.")); }}><Icon name="copy" size={18} />Copy</button>
          <button type="button" className="btn" onClick={() => setPaste(paste == null ? "" : null)}>Paste</button>
          <button type="button" className="btn" onClick={() => { onReset(); close(); }}>Reset</button>
        </div>
        {paste != null && (
          <div className="studio-field">
            <textarea className="studio-words" rows={3} placeholder="Paste a copied style here" aria-label="Paste a style" value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button type="button" className="btn" disabled={!paste.trim()} onClick={() => { const s = parseStyle(paste); if (s) { onLoad(s); close(); } else setNote("That isn't a What-If Lab style."); }}>Use this style</button>
          </div>
        )}
        {note && <p className="small studio-note" role="status">{note}</p>}
      </div>
    </details>
  );
}

