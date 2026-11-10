"use client";

/**
 * Export studio, change 0034: the Intro tab (six templates, your words, My intros) and the Sound tab (record your
 * voice over the preview, add an audio file). Same field rows as the other tabs (StudioControls).
 */
import { useEffect, useRef, useState } from "react";
import { COLOR_KEYS, INTRO_IDS, INTRO_RANGE, NO_INTRO, TOKENS, type ExportStyle, type Intro, type IntroId } from "@/lib/export/style";
import { Icon } from "../../ui/Icon";
import { pageT } from "@/lib/i18n/page";
import { C, Check, ColorField, N, Range, Select, secs, type Set } from "./StudioControls";
import { deleteIntro, introText, parseIntro, saveIntro, savedIntros, type SavedIntro } from "./styles";
import { decodeFile, peaks, soundSupported, startTake, type Sound } from "./sound";

const I = (k: string, v?: Record<string, string | number>) => pageT()(`export.studio.intro.${k}`, v);
const A = (k: string, v?: Record<string, string | number>) => pageT()(`export.studio.sound.${k}`, v);

// ——— Intro ———

export function IntroTab({ style, set, onPick }: { style: ExportStyle; set: Set; onPick: () => void }) {
  const it = style.intro;
  const setI = (p: Partial<Intro>) => set((s) => ({ ...s, intro: { ...s.intro, ...p } }));
  const setLen = (v: number) => set((s) => ({ ...s, timing: { ...s.timing, introS: v } }));
  const pick = (id: IntroId | "none") => {
    set((s) => ({
      ...s, intro: { ...s.intro, template: id },
      // A template needs time to play: give it three seconds if the opening was shorter
      timing: id !== "none" && s.timing.introS < 2 ? { ...s.timing, introS: 3 } : s.timing,
    }));
    if (id !== "none") onPick();
  };
  const isKey = COLOR_KEYS.some(([k]) => k === it.accent);
  return (
    <>
      <div className="studio-field">
        <span className="ctl-l">{I("template")}</span>
        <div className="studio-intros" role="radiogroup" aria-label={I("template")}>
          {(["none", ...INTRO_IDS] as const).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={it.template === id} onClick={() => pick(id)}>
              <span className="studio-layer-n">{N("intro", id)}</span>
              <span className="studio-layer-d">{N("introWhat", id)}</span>
            </button>
          ))}
        </div>
      </div>
      {it.template === "none" ? (
        <p className="small studio-note">{I("noneNote")}</p>
      ) : (
        <>
          <Range label={I("length")} value={style.timing.introS} min={INTRO_RANGE[0]} max={INTRO_RANGE[1]} step={0.1} out={secs(style.timing.introS)} onChange={setLen} />
          {style.timing.introS < 0.5 && <p className="small studio-warn" role="status">{I("tooShort")}</p>}
          <div className="studio-field">
            <label className="ctl-l" htmlFor="intro-title">{I("bigLine")}</label>
            <textarea id="intro-title" className="studio-words" rows={2} maxLength={280} value={it.title} onChange={(e) => setI({ title: e.target.value })} />
            <label className="ctl-l" htmlFor="intro-line">{I("smallLine")}</label>
            <input id="intro-line" className="studio-hex studio-name" maxLength={280} value={it.line} placeholder={pageT()(`export.intro.${it.template}.line`)}
              onChange={(e) => setI({ line: e.target.value })} />
            <p className="small studio-note">{I("tokens", { list: TOKENS.map(([t]) => t).join(" ") })}</p>
          </div>
          <div className="studio-field">
            <Select label={I("accent")} value={isKey ? it.accent : "custom"}
              options={[...COLOR_KEYS.map(([k]) => [k, N("color", k)] as [string, string]), ["custom", C("pickAColour")]]}
              onChange={(v) => setI({ accent: v === "custom" ? style.colors.alt.slice(0, 7) : v })} />
            {!isKey && <ColorField label={I("accent")} value={it.accent} onChange={(v) => setI({ accent: v })} />}
          </div>
          <p className="small studio-note">{I("fontsNote")}</p>
        </>
      )}
      <MyIntros intro={it} seconds={style.timing.introS} onLoad={(intro, seconds) => { set((s) => ({ ...s, intro, timing: { ...s.timing, introS: seconds } })); onPick(); }} />
    </>
  );
}

function MyIntros({ intro, seconds, onLoad }: { intro: Intro; seconds: number; onLoad: (i: Intro, s: number) => void }) {
  const [list, setList] = useState<SavedIntro[]>([]);
  const [name, setName] = useState("");
  const [paste, setPaste] = useState<string | null>(null);
  const [note, setNote] = useState("");
  useEffect(() => { setList(savedIntros()); }, []);
  const canSave = intro.template !== "none" && !!name.trim();
  return (
    <div className="studio-group" role="group" aria-label={I("mine")}>
      <h3 className="headline">{I("mine")}</h3>
      <p className="small studio-note">{I("mineNote")}</p>
      <form className="studio-row" onSubmit={(e) => { e.preventDefault(); if (!canSave) return; setList(saveIntro(name.trim(), intro, seconds)); setName(""); setNote(I("saved")); }}>
        <input className="studio-hex studio-name" placeholder={I("namePlaceholder")} aria-label={I("nameLabel")} value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
        <button type="submit" className="btn" disabled={!canSave}>{I("save")}</button>
      </form>
      {list.length > 0 && (
        <ul className="studio-saved">
          {list.map((s) => (
            <li key={s.name}>
              <button type="button" className="studio-saved-n" onClick={() => onLoad(s.intro, s.seconds)}>{s.name} <span className="studio-note">· {N("intro", s.intro.template)}</span></button>
              <button type="button" className="iconbtn" aria-label={I("delete", { name: s.name })} onClick={() => setList(deleteIntro(s.name))}><Icon name="close" size={18} /></button>
            </li>
          ))}
        </ul>
      )}
      <div className="studio-row">
        <button type="button" className="btn" disabled={intro.template === "none"}
          onClick={() => navigator.clipboard?.writeText(introText(intro, seconds)).then(() => setNote(I("copied")), () => setNote(I("cantCopy")))}>
          <Icon name="copy" size={18} />{I("copy")}
        </button>
        <button type="button" className="btn" onClick={() => setPaste(paste == null ? "" : null)}>{I("paste")}</button>
        <button type="button" className="btn" disabled={intro.template === "none"} onClick={() => onLoad({ ...NO_INTRO }, seconds)}>{I("off")}</button>
      </div>
      {paste != null && (
        <div className="studio-field">
          <textarea className="studio-words" rows={3} placeholder={I("pastePlaceholder")} aria-label={I("pasteLabel")} value={paste} onChange={(e) => setPaste(e.target.value)} />
          <button type="button" className="btn" disabled={!paste.trim()} onClick={() => { const p = parseIntro(paste); if (p) { onLoad(p.intro, p.seconds); setPaste(null); } else setNote(I("notIntro")); }}>{I("use")}</button>
        </div>
      )}
      {note && <p className="small studio-note" role="status">{note}</p>}
    </div>
  );
}

// ——— Sound ———

export interface SoundCtl {
  sound: Sound;
  setSound: (fn: (s: Sound) => Sound) => void;
  /** Play the preview from the start (with the sound so far) while recording; returns a stop. */
  playFromStart(): void;
  stopPreview(): void;
  clipS: number;
}

function Wave({ buf, offset, clipS }: { buf: AudioBuffer; offset: number; clipS: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const W = (cv.width = cv.clientWidth * (window.devicePixelRatio || 1)), H = (cv.height = 32 * (window.devicePixelRatio || 1));
    ctx.clearRect(0, 0, W, H);
    const pk = peaks(buf, 200);
    const sx = (t: number) => (t / Math.max(0.1, clipS)) * W;
    ctx.fillStyle = getComputedStyle(cv).color;
    const x0 = sx(offset), x1 = sx(offset + buf.duration);
    for (let i = 0; i < pk.length; i++) {
      const x = x0 + ((x1 - x0) * i) / pk.length;
      if (x < 0 || x > W) continue;
      const h = Math.max(1, pk[i] * H);
      ctx.fillRect(x, (H - h) / 2, Math.max(1, (x1 - x0) / pk.length - 0.5), h);
    }
  }, [buf, offset, clipS]);
  return <canvas ref={ref} className="studio-wave" aria-hidden="true" />;
}

export function SoundTab({ ctl }: { ctl: SoundCtl }) {
  const { sound, setSound, clipS } = ctl;
  const [rec, setRec] = useState<{ stop(): Promise<AudioBuffer>; cancel(): void; level(): number } | null>(null);
  const [level, setLevel] = useState(0);
  const [err, setErr] = useState("");
  const file = useRef<HTMLInputElement>(null);
  const ok = soundSupported();

  useEffect(() => {
    if (!rec) return;
    let raf = 0;
    const loop = () => { setLevel(rec.level()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [rec]);
  useEffect(() => () => rec?.cancel(), [rec]);
  // The take ends by itself with the clip
  const stopRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (!rec) return;
    const id = window.setTimeout(() => stopRef.current(), clipS * 1000 + 400);
    return () => clearTimeout(id);
  }, [rec, clipS]);

  const record = async () => {
    setErr("");
    try {
      const r = await startTake();
      setRec(r);
      ctl.playFromStart();
    } catch { setErr(A("noMic")); }
  };
  const stop = async () => {
    const r = rec;
    if (!r) return;
    setRec(null);
    ctl.stopPreview();
    try {
      const buf = await r.stop();
      setSound((s) => ({ ...s, voice: { buf, name: A("yourTake"), gain: 1, offset: 0 } }));
    } catch { setErr(A("takeFailed")); }
  };
  stopRef.current = () => { void stop(); };
  const addFile = async (f: File | undefined) => {
    if (!f) return;
    setErr("");
    try {
      const buf = await decodeFile(f);
      setSound((s) => ({ ...s, music: { buf, name: f.name.slice(0, 60), gain: 0.8, offset: 0, fadeIn: 0.5, fadeOut: 1, duck: true } }));
    } catch { setErr(A("cantRead")); }
  };

  if (!ok) return <p className="small studio-warn" role="status">{A("unsupported")}</p>;
  const v = sound.voice, m = sound.music;
  const off = (n: number) => (n === 0 ? A("atStart") : A("offsetS", { n: n.toFixed(1) }));
  return (
    <>
      <p className="small studio-note">{A("privacy")}</p>
      <div className="studio-group" role="group" aria-label={A("voice")}>
        <h3 className="headline">{A("voice")}</h3>
        <p className="small studio-note">{A("voiceNote")}</p>
        <div className="studio-row">
          {rec ? (
            <button type="button" className="btn" onClick={stop}><Icon name="pause" size={18} />{A("stop")}</button>
          ) : (
            <button type="button" className="btn" onClick={record}><Icon name="play" size={18} />{v ? A("again") : A("record")}</button>
          )}
          {v && !rec && <button type="button" className="btn" onClick={() => setSound((s) => ({ ...s, voice: null }))}><Icon name="close" size={18} />{A("remove")}</button>}
        </div>
        {rec && (
          <div className="studio-meter" role="status" aria-label={A("recording")}>
            <span className="small">{A("recording")}</span>
            <i style={{ transform: `scaleX(${Math.min(1, level * 2.5)})` }} />
          </div>
        )}
        {v && !rec && (
          <>
            <Wave buf={v.buf} offset={v.offset} clipS={clipS} />
            <Range label={A("volume")} value={v.gain} min={0} max={1.5} step={0.05} out={`${Math.round(v.gain * 100)}`} onChange={(g) => setSound((s) => ({ ...s, voice: s.voice && { ...s.voice, gain: g } }))} />
            <Range label={A("startsAt")} value={v.offset} min={-Math.min(10, v.buf.duration)} max={Math.max(0.1, clipS - 0.5)} step={0.1} out={off(v.offset)}
              onChange={(o) => setSound((s) => ({ ...s, voice: s.voice && { ...s.voice, offset: o } }))} />
          </>
        )}
      </div>
      <div className="studio-group" role="group" aria-label={A("file")}>
        <h3 className="headline">{A("file")}</h3>
        <p className="small studio-note">{A("fileNote")}</p>
        <div className="studio-row">
          <button type="button" className="btn" onClick={() => file.current?.click()}><Icon name="download" size={18} />{m ? A("replaceFile") : A("addFile")}</button>
          {m && <button type="button" className="btn" onClick={() => setSound((s) => ({ ...s, music: null }))}><Icon name="close" size={18} />{A("remove")}</button>}
          <input ref={file} type="file" accept="audio/*" hidden onChange={(e) => { void addFile(e.target.files?.[0]); e.target.value = ""; }} />
        </div>
        {m && (
          <>
            <p className="small"><span className="num">{m.name}</span> · {secs(Math.round(m.buf.duration))}</p>
            <Wave buf={m.buf} offset={m.offset} clipS={clipS} />
            <Range label={A("volume")} value={m.gain} min={0} max={1.5} step={0.05} out={`${Math.round(m.gain * 100)}`} onChange={(g) => setSound((s) => ({ ...s, music: s.music && { ...s.music, gain: g } }))} />
            <Range label={A("startsAt")} value={m.offset} min={-Math.min(600, m.buf.duration)} max={Math.max(0.1, clipS - 0.5)} step={0.1} out={off(m.offset)}
              onChange={(o) => setSound((s) => ({ ...s, music: s.music && { ...s.music, offset: o } }))} />
            <Range label={A("fadeIn")} value={m.fadeIn} min={0} max={5} step={0.1} out={secs(m.fadeIn)} onChange={(f) => setSound((s) => ({ ...s, music: s.music && { ...s.music, fadeIn: f } }))} />
            <Range label={A("fadeOut")} value={m.fadeOut} min={0} max={5} step={0.1} out={secs(m.fadeOut)} onChange={(f) => setSound((s) => ({ ...s, music: s.music && { ...s.music, fadeOut: f } }))} />
            {v && <Check label={A("duck")} checked={m.duck} onChange={(d) => setSound((s) => ({ ...s, music: s.music && { ...s.music, duck: d } }))} />}
          </>
        )}
      </div>
      {err && <p className="small is-error" role="alert">{err}</p>}
      <p className="small studio-note">{A("captionsNote")}</p>
    </>
  );
}
