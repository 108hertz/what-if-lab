"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { FPS, clipFrames, planReplay, retime } from "@/lib/export/replay";
import { Scrubber } from "@/lib/export/scrub";
import { SIZES, defaultStyle, parseStyle, withSize, type ExportStyle, type LayerId, type SizeId } from "@/lib/export/style";
import Dialog from "../../ui/Dialog";
import { Icon } from "../../ui/Icon";
import { useAccount, usePremium } from "../../account/context";
import { canExport, exportLevel } from "../../account/state";
import QuickExport from "./QuickExport";
import { registerStudioFonts } from "./fonts";
import PreviewCanvas from "./PreviewCanvas";
import { LookTab, OutputTab, TextTab, TimingTab, type NarrationEdit, type Out } from "./StudioControls";
import { IntroTab, SoundTab, type SoundCtl } from "./StudioMore";
import { Cancelled, clipInfo, exportName, loadFonts, recordVideo, renderSlides, renderStills, renderText, save, saveBlob, videoSupport, zip, type Meta, type Progress } from "./render";
import { NO_SOUND, audioContext, hasSound, playSound, type Mix, type Sound } from "./sound";
import { narration } from "@/lib/export/text";
import { deleteStyle, lastStyle, rememberStyle, saveStyle, savedStyles, type SavedStyle } from "./styles";
import { pageT } from "@/lib/i18n/page";
import { worldSay } from "@/lib/sim/say";

type Tab = "output" | "text" | "intro" | "sound" | "look" | "timing";
const TABS: Tab[] = ["output", "text", "intro", "sound", "look", "timing"];

type Phase =
  | { at: "idle" }
  | { at: "working"; p: Progress }
  | { at: "done"; url: string; name: string; size: number; silent?: boolean }
  | { at: "error"; msg: string };

const mb = (n: number) => (n / 1048576 < 0.1 ? S("mbSmall") : S("mb", { n: Math.round(n / 104857.6) / 10 }));
/** Studio words in the page's language (change 0025). */
const S = (k: string, v?: Record<string, string | number>) => pageT()(`export.studio.${k}`, v);

/**
 * Transport button (before full screen). Every world gets it through the shared Transport. Shown to everyone
 * (change 0031): Premium opens the studio, everyone else Quick export (one landscape video, nothing to edit).
 */
export function ExportButton({ engine }: { engine: SimEngine }) {
  const [open, setOpen] = useState(false);
  const full = exportLevel(useAccount()) === "full";
  const label = full ? S("open") : pageT()("export.quick.open");
  return (
    <>
      <button type="button" className="btn export-btn" aria-label={label} title={label} onClick={() => setOpen(true)}>
        <Icon name="download" size={18} />
        <span className="btn-text">{S("button")}</span>
      </button>
      {open && (full ? <ExportDialog engine={engine} onClose={() => setOpen(false)} /> : <QuickExport engine={engine} onClose={() => setOpen(false)} />)}
    </>
  );
}

/** The export studio (change 0022): one fork, styled your way, out as a video, pictures, text or slides. */
export default function ExportDialog({ engine, onClose }: { engine: SimEngine; onClose: () => void }) {
  const account = useAccount();
  const premium = usePremium();
  const allowed = canExport(account);
  const sb = engine.sb;
  // Change 0034: rewritten narration lines and the sound live only in this studio (never in a saved style)
  const [lines, setLines] = useState<Record<number, string>>({});
  const [sound, setSound] = useState<Sound>(NO_SOUND);
  const meta: Meta = useMemo(() => ({ key: sb.key, world: worldSay(sb)("meta.name"), intro: worldSay(sb)("meta.intro"), lines }), [sb, lines]);
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
  const cues = useMemo(() => (a ? clipInfo(a, meta).cues : undefined), [a, meta]);
  const written = useMemo(() => (a ? narration({ plan: a.plan, summary: a.summary, world: meta.world, intro: meta.intro, map: a.map }).map((c) => c.say) : []), [a, meta.world, meta.intro]);
  const narrationEdit: NarrationEdit = {
    lines: written, edits: lines,
    setEdit: (i, v) => setLines((l) => { const n = { ...l }; if (v == null) delete n[i]; else n[i] = v; return n; }),
  };

  // Preview playback carries the sound; the voice take plays the preview from the start
  const [command, setCommand] = useState<{ kind: "playFromStart" | "stop"; n: number } | null>(null);
  const mix = useRef<Mix | null>(null);
  const recordingTake = useRef(false);
  const onPlay = useCallback((playing: boolean, frame: number) => {
    mix.current?.stop(); mix.current = null;
    if (!playing || recordingTake.current || !hasSound(sound)) return;
    mix.current = playSound(sound, frame / FPS, clipFrames(plan) / FPS, audioContext().destination);
  }, [sound, plan]);
  useEffect(() => () => { mix.current?.stop(); }, []);
  const soundCtl: SoundCtl = {
    sound, setSound, clipS: clipFrames(plan) / FPS,
    // While recording a take, the preview plays without the take's own sound (other sound would leak into the mic)
    playFromStart: () => { recordingTake.current = true; setCommand((c) => ({ kind: "playFromStart", n: (c?.n ?? 0) + 1 })); },
    stopPreview: () => { recordingTake.current = false; setCommand((c) => ({ kind: "stop", n: (c?.n ?? 0) + 1 })); },
  };
  const clipS = clipFrames(plan) / FPS;
  const runS = plan.frames / FPS;
  const span = S("span", { from: sb.fmtT(plan.t0), to: sb.fmtT(plan.t1) });
  const say = worldSay(sb);
  const { W, H } = SIZES[style.size];
  const spec = out === "video" ? `${W} × ${H}${video ? ` · ${video.ext.toUpperCase()}` : ""} · ${FPS} fps · ${Math.round(clipS)} s`
    : out === "images" ? `${W} × ${H} · PNG · zip`
    : out === "text" ? S("specText")
    : S("specSlides");
  const what = out === "video"
    ? S("whatVideo", { s: Math.round(clipS), start: S(style.clean ? "whatVideoStage" : "whatVideoTitle"), run: Math.round(runS), who: S(plan.hasWhatIf ? "whatVideoBoth" : "whatVideoOne"), span, end: style.clean ? "" : S("whatVideoEnd") })
    : out === "images" ? S("whatImages")
    : out === "text" ? S("whatText")
    : S("whatSlides", { span });

  const start = async () => {
    const ctl = new AbortController();
    abort.current = ctl;
    const wasPlaying = engine.playing;
    engine.playing = false; // the stage rests while this device renders the file
    setPhase({ at: "working", p: { done: 0, note: S("progress.starting") } });
    const onProgress = (p: Progress) => setPhase({ at: "working", p });
    try {
      let blob: Blob, name: string, silent = false;
      if (out === "slides") {
        blob = await renderSlides(scrub, style, meta, onProgress, ctl.signal);
        name = exportName(sb.key, plan.label, "slides", "pdf");
      } else if (out === "images") {
        const files = await renderStills(scrub, style, meta, onProgress, ctl.signal);
        onProgress({ done: 0.97, note: S("progress.packing") });
        blob = await zip(files);
        name = exportName(sb.key, plan.label, `${style.size}-pictures`, "zip");
      } else if (out === "text") {
        const t = texts ?? renderText(scrub.finish(), meta);
        const base = exportName(sb.key, plan.label, "", "").replace(/-?\.$/, "");
        blob = await zip([{ name: `${base}.srt`, blob: t.srt }, { name: `${base}-caption.txt`, blob: t.caption }, { name: `${base}-story.md`, blob: t.story }]);
        name = exportName(sb.key, plan.label, "text", "zip");
      } else {
        mix.current?.stop(); mix.current = null;
        setCommand((c) => ({ kind: "stop", n: (c?.n ?? 0) + 1 }));
        const o = await recordVideo(scrub, style, meta, onProgress, ctl.signal, sound);
        blob = o.blob;
        silent = o.silent;
        name = exportName(sb.key, plan.label, style.clean ? `${style.size}-clean` : style.size, o.ext);
      }
      const url = URL.createObjectURL(blob);
      save(url, name);
      setPhase({ at: "done", url, name, size: blob.size, silent });
    } catch (e) {
      if (e instanceof Cancelled) setPhase({ at: "idle" });
      else setPhase({ at: "error", msg: e instanceof Error ? e.message : S("error") });
    } finally {
      engine.playing = wasPlaying;
      abort.current = null;
    }
  };

  const unlock = () => { onClose(); premium.open("export"); };

  let actions: React.ReactNode;
  if (phase.at === "working") {
    actions = <button className="btn" onClick={() => abort.current?.abort()}><Icon name="close" size={18} />{S("cancel")}</button>;
  } else if (phase.at === "done") {
    actions = (
      <>
        <button className="btn" onClick={() => save(phase.url, phase.name)}>{S("again")}</button>
        <button className="btn primary" onClick={onClose}><Icon name="check" size={18} />{S("done")}</button>
      </>
    );
  } else if (!allowed) {
    actions = <button className="btn primary" onClick={unlock}><Icon name="arrow" size={18} />{S("unlock")}</button>;
  } else {
    const blocked = out === "video" && !video;
    const label = S(`action.${out}`);
    actions = (
      <button className="btn primary" onClick={start} disabled={blocked}>
        <Icon name="download" size={18} />
        {phase.at === "error" ? S("retry") : label}
      </button>
    );
  }

  const textTab = (
    <>
      {out === "text" && (
        <div className="studio-texts">
          {([["srt", "srt"], ["caption", "txt"], ["story", "md"]] as const).map(([k, ext]) => { const n = S(`files.${k}`); return (
            <div key={k} className="studio-textfile">
              <div className="ctl-l">{n}<output>.{ext}</output></div>
              <textarea readOnly className="studio-words" rows={k === "caption" ? 6 : 4} value={texts ? texts[k] : S("preparing")} aria-label={n} />
              <div className="studio-row">
                <button type="button" className="btn" disabled={!allowed || !texts} onClick={() => texts && navigator.clipboard?.writeText(texts[k])}><Icon name="copy" size={18} />{S("copy")}</button>
                <button type="button" className="btn" disabled={!allowed || !texts}
                  onClick={() => texts && saveBlob(texts[k], exportName(sb.key, plan.label, k === "srt" ? "" : k, ext).replace("-.", "."), ext === "md" ? "text/markdown;charset=utf-8" : "text/plain;charset=utf-8")}>
                  <Icon name="download" size={18} />{S("download")}
                </button>
              </div>
            </div>
          ); })}
        </div>
      )}
    </>
  );

  return (
    <Dialog open onClose={onClose} title={S("title")} className="export studio" locked={working} closeLabel={S("close")}>
      <div className="studio-main">
        <PreviewCanvas scrub={scrub} ready={ready} style={style} slides={out === "slides"} world={say("meta.name")} intro={say("meta.intro")}
          selected={tab === "text" ? selected : null} jump={jump} onSelect={select} onMove={move} cues={cues} command={command} onPlay={onPlay} />
        <div className="studio-side">
          <div className="seg studio-tabs" role="tablist" aria-label={S("settings")}>
            {TABS.map((t) => (
              <button key={t} type="button" role="tab" id={`stab-${t}`} aria-selected={tab === t} aria-controls="studio-panel" disabled={working} onClick={() => setTab(t)}>{S(`tabs.${t}`)}</button>
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
              {tab === "text" && <TextTab style={style} set={setStyle} selected={selected} select={select} narration={narrationEdit} />}
              {tab === "intro" && <IntroTab style={style} set={setStyle} onPick={() => setCommand((c) => ({ kind: "playFromStart", n: (c?.n ?? 0) + 1 }))} />}
              {tab === "sound" && <SoundTab ctl={soundCtl} />}
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
          <p className="micro export-spec">{S("specSeed", { spec, seed: plan.seed })}</p>
          {phase.at === "working" ? (
            <div className="export-progress" role="status" aria-live="polite">
              <div className="bar" aria-hidden="true"><i style={{ transform: `scaleX(${phase.p.done})` }} /></div>
              <p className="small">{S(out === "video" ? "keepOpen" : "noteEnd", { note: phase.p.note })}</p>
            </div>
          ) : phase.at === "done" ? (
            <p className="small export-done" role="status">{S("saved")} <span className="num">{phase.name}</span> ({mb(phase.size)}).{phase.silent ? ` ${pageT()("export.studio.sound.silent")}` : ""}</p>
          ) : phase.at === "error" ? (
            <p className="small is-error" role="alert">{phase.msg}</p>
          ) : (
            <>
              <p className="small export-what">{what}</p>
              {!plan.hasWhatIf && <p className="small export-hint">{S("noWhatIf")}</p>}
              {!plan.fromFork && plan.hasWhatIf && <p className="small export-hint">{S("fromNow")}</p>}
              {out === "video" && !video && <p className="small is-error" role="alert">{S("noVideo")}</p>}
              {!allowed && <p className="small export-hint">{S("tryAll")}</p>}
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
      <summary className={`btn${disabled ? " is-disabled" : ""}`} aria-disabled={disabled}>{S("styles.title")}<Icon name="chevron" size={18} /></summary>
      <div className="studio-styles-pop" role="group" aria-label={S("styles.title")}>
        <form className="studio-row" onSubmit={(e) => { e.preventDefault(); if (!name.trim()) return; setList(saveStyle(name.trim(), style)); setName(""); setNote(S("styles.savedHere")); }}>
          <input className="studio-hex studio-name" placeholder={S("styles.namePlaceholder")} aria-label={S("styles.nameLabel")} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
          <button type="submit" className="btn" disabled={!name.trim()}>{S("styles.save")}</button>
        </form>
        {list.length > 0 && (
          <ul className="studio-saved">
            {list.map((s) => (
              <li key={s.name}>
                <button type="button" className="studio-saved-n" onClick={() => { onLoad(s.style); close(); }}>{s.name}</button>
                <button type="button" className="iconbtn" aria-label={S("styles.delete", { name: s.name })} onClick={() => setList(deleteStyle(s.name))}><Icon name="close" size={18} /></button>
              </li>
            ))}
          </ul>
        )}
        <div className="studio-row">
          <button type="button" className="btn" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(style)).then(() => setNote(S("styles.copied")), () => setNote(S("styles.cantCopy"))); }}><Icon name="copy" size={18} />{S("styles.copy")}</button>
          <button type="button" className="btn" onClick={() => setPaste(paste == null ? "" : null)}>{S("styles.paste")}</button>
          <button type="button" className="btn" onClick={() => { onReset(); close(); }}>{S("styles.reset")}</button>
        </div>
        {paste != null && (
          <div className="studio-field">
            <textarea className="studio-words" rows={3} placeholder={S("styles.pastePlaceholder")} aria-label={S("styles.pasteLabel")} value={paste} onChange={(e) => setPaste(e.target.value)} />
            <button type="button" className="btn" disabled={!paste.trim()} onClick={() => { const s = parseStyle(paste); if (s) { onLoad(s); close(); } else setNote(S("styles.notStyle")); }}>{S("styles.use")}</button>
          </div>
        )}
        {note && <p className="small studio-note" role="status">{note}</p>}
      </div>
    </details>
  );
}

