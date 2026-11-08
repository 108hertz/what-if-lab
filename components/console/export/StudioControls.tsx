"use client";

import { useId, useRef } from "react";
import type { ReplayPlan } from "@/lib/export/replay";
import { autoRunS } from "@/lib/export/replay";
import type { TimelineItem } from "@/lib/sim/engine";
import { gradeSupported } from "@/lib/export/frame";
import {
  COLOR_KEYS, FONTS, INTRO_RANGE, LAYERS, NO_GRADE, OUTRO_RANGE, RUN_RANGE, SIZES, SIZE_IDS, THEMES, THEME_IDS, TOKENS,
  colorOf, contrast, isHex, type ColorKey, type ExportStyle, type Grade, type Layer, type LayerId, type SizeId,
} from "@/lib/export/style";
import { Icon, type IconName } from "../../ui/Icon";
import { pageT } from "@/lib/i18n/page";

/** Studio words in the page's language (change 0025): C() for the controls, N() for names of style parts. */
const C = (k: string, v?: Record<string, string | number>) => pageT()(`export.studio.ctl.${k}`, v);
const N = (group: string, id: string) => pageT()(`export.style.${group}.${id}`);

type Set = (fn: (s: ExportStyle) => ExportStyle) => void;

// ——— Small fields (the console's own control rows) ———

function Range({ label, value, min, max, step, out, onChange }: { label: string; value: number; min: number; max: number; step: number; out: string; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <label className="ctl" htmlFor={id}>
      <span className="ctl-l">{label}<output>{out}</output></span>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        style={{ "--fill": `${((value - min) / Math.max(1e-9, max - min)) * 100}%` } as React.CSSProperties}
        onChange={(e) => onChange(parseFloat(e.target.value))} />
    </label>
  );
}

function Seg<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: [T, string, IconName?][]; onChange: (v: T) => void }) {
  return (
    <div className="studio-field">
      <span className="ctl-l">{label}</span>
      <div className="seg studio-seg" role="radiogroup" aria-label={label}>
        {options.map(([v, l, icon]) => (
          <button key={String(v)} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>
            {icon && <Icon name={icon} size={18} />}{l}
          </button>
        ))}
      </div>
    </div>
  );
}

function Check({ label, checked, onChange, note }: { label: string; checked: boolean; onChange: (v: boolean) => void; note?: string }) {
  return (
    <label className="studio-check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}{note && <span className="studio-note">{note}</span>}</span>
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const id = useId();
  return (
    <label className="ctl" htmlFor={id}>
      <span className="ctl-l">{label}</span>
      <span className="select">
        <select id={id} value={value} onChange={(e) => onChange(e.target.value as T)}>
          {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (hex: string) => void }) {
  const id = useId();
  const six = value.slice(0, 7);
  return (
    <div className="studio-color">
      <label htmlFor={id} className="studio-color-l">
        <input id={id} type="color" value={six} onChange={(e) => onChange(e.target.value.toUpperCase() + value.slice(7))} />
        <span>{label}</span>
      </label>
      <input className="studio-hex" aria-label={C("hex", { label })} defaultValue={value} key={value} spellCheck={false} maxLength={9}
        onBlur={(e) => { const v = e.target.value.trim(); if (isHex(v)) onChange(v.toUpperCase()); else e.target.value = value; }} />
    </div>
  );
}

const pct = (v: number) => `${v > 0 ? "+" : ""}${Math.round(v * 100)}`;
const secs = (v: number) => C("secs", { n: v.toFixed(v < 10 && v % 1 ? 1 : 0) });

// ——— Output ———

export type Out = "video" | "images" | "text" | "slides";
export const OUTS: [Out, string, IconName][] = [
  ["video", "Video", "video"],
  ["images", "Pictures", "image"],
  ["text", "Text", "text"],
  ["slides", "Slides", "slides"],
];
const SIZE_ICON: Record<SizeId, IconName> = { phone: "phone", youtube: "wide", square: "square", portrait: "portrait" };

export function OutputTab({ out, setOut, style, set, onSize }: { out: Out; setOut: (o: Out) => void; style: ExportStyle; set: Set; onSize: (s: SizeId) => void }) {
  return (
    <>
      <Seg label={C("whatToMake")} value={out} options={OUTS.map(([v, , i]) => [v, N("out", v), i])} onChange={setOut} />
      {out !== "text" && (
        // Change 0024: the live stage shows one world; only an export can put both next to each other
        <Seg label={C("worlds")} value={style.layout.split} options={[["alt", C("changedOnly")], ["auto", C("noChangeWithChanges")]]}
          onChange={(v) => set((s) => ({ ...s, layout: { ...s.layout, split: v } }))} />
      )}
      {(out === "video" || out === "images") && (
        <Seg label={C("size")} value={style.size} options={SIZE_IDS.map((s) => [s, N("size", s), SIZE_ICON[s]])} onChange={onSize} />
      )}
      {out === "video" && (
        <Check label={C("cleanVideo")} note={C("theStageOnlyNo")} checked={style.clean} onChange={(v) => set((s) => ({ ...s, clean: v }))} />
      )}
    </>
  );
}

// ——— Timing ———

export function TimingTab({ style, set, plan, range, setRange, events }: {
  style: ExportStyle; set: Set; plan: ReplayPlan; range: { from?: number; to?: number }; setRange: (r: { from?: number; to?: number }) => void; events: TimelineItem[];
}) {
  const t = style.timing, sb = plan.sb;
  const lo = plan.tFork, hi = plan.tMax, span = Math.max(1e-9, hi - lo);
  const from = range.from ?? lo, to = range.to ?? plan.tAuto;
  const step = span / 400;
  const auto = autoRunS(plan, from, to);
  const setT = (p: Partial<typeof t>) => set((s) => ({ ...s, timing: { ...s.timing, ...p } }));
  const at = (x: number) => `${((x - lo) / span) * 100}%`;
  const total = t.introS + (t.runS ?? auto) + t.outroS;
  return (
    <>
      <div className="studio-field">
        <span className="ctl-l">{C("whichPart")}<output>{pageT()("export.studio.span", { from: sb.fmtT(from), to: sb.fmtT(to) })}</output></span>
        <div className="studio-trim" aria-hidden="true">
          <i className="studio-trim-sel" style={{ left: at(from), width: `calc(${at(to)} - ${at(from)})` }} />
          <i className="studio-trim-now" style={{ left: at(plan.tAuto) }} title={C("now")} />
          {events.filter((e) => e.who !== "both" && e.t >= lo && e.t <= hi).slice(0, 40).map((e, i) => (
            <i key={i} className={`studio-trim-ev${e.who === "alt" ? " a" : ""}`} style={{ left: at(e.t) }} />
          ))}
        </div>
        <Range label={C("startsAt")} value={from} min={lo} max={hi} step={step} out={sb.fmtT(from)} onChange={(v) => setRange({ ...range, from: Math.min(v, to - step * 4) })} />
        <Range label={C("endsAt")} value={to} min={lo} max={hi} step={step} out={sb.fmtT(to)} onChange={(v) => setRange({ ...range, to: Math.max(v, from + step * 4) })} />
        <p className="small studio-note">{C("theBrightTickIs")}</p>
      </div>
      <Check label={C("pickTheLengthFor")} checked={t.runS == null} onChange={(v) => setT({ runS: v ? null : Math.round(auto) })} />
      {t.runS != null && <Range label={C("runningTime")} value={t.runS} min={RUN_RANGE[0]} max={RUN_RANGE[1]} step={1} out={secs(t.runS)} onChange={(v) => setT({ runS: v })} />}
      <Range label={C("openingTitle")} value={t.introS} min={INTRO_RANGE[0]} max={INTRO_RANGE[1]} step={0.1} out={secs(t.introS)} onChange={(v) => setT({ introS: v })} />
      <Range label={C("resultAtTheEnd")} value={t.outroS} min={OUTRO_RANGE[0]} max={OUTRO_RANGE[1]} step={0.1} out={secs(t.outroS)} onChange={(v) => setT({ outroS: v })} />
      <Check label={C("slowDownWhereThe")} note={C("momentsOnlyOneWorld")} checked={t.ease} onChange={(v) => setT({ ease: v })} />
      <p className="small studio-total">{C("wholeClip")}<span className="num">{secs(total)}</span></p>
    </>
  );
}

// ——— Text ———

const ANCHORS: [0 | 0.5 | 1, 0 | 0.5 | 1][] = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [0.5, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]];
const ANCHOR_NAME = (ax: number, ay: number) => C(`anchor.${ax * 2}${ay * 2}`);
const MARGIN = 0.045;

export function TextTab({ style, set, selected, select }: { style: ExportStyle; set: Set; selected: LayerId | null; select: (id: LayerId | null) => void }) {
  const area = useRef<HTMLTextAreaElement>(null);
  const setL = (id: LayerId, p: Partial<Layer>) => set((s) => ({ ...s, layers: { ...s.layers, [id]: { ...s.layers[id], ...p } } }));
  const l = selected ? style.layers[selected] : null;
  const colorOpts: [string, string][] = [...COLOR_KEYS.map(([k]) => [k, N("color", k)] as [string, string]), ["custom", C("pickAColour")]];
  const isKey = l ? COLOR_KEYS.some(([k]) => k === l.color) : true;
  const fg = l ? colorOf(style, l.color) : "";
  const bgFor = l && l.box === "solid" ? style.colors.bg : l && (l.when === "intro" || l.when === "outro" || l.box === "scrim") ? style.colors.stage : style.colors.bg;
  const low = l && isHex(fg) && contrast(fg, bgFor) < 3;
  const insert = (tok: string) => {
    if (!selected || !l) return;
    const el = area.current;
    const a = el?.selectionStart ?? l.text.length, b = el?.selectionEnd ?? l.text.length;
    setL(selected, { text: l.text.slice(0, a) + tok + l.text.slice(b) });
    requestAnimationFrame(() => { el?.focus(); el?.setSelectionRange(a + tok.length, a + tok.length); });
  };
  return (
    <>
      <div className="studio-layers" role="list">
        {LAYERS.map(([id]) => { const name = N("layer", id), what = N("layerWhat", id); return (
          <div key={id} role="listitem" className={`studio-layer${selected === id ? " is-on" : ""}`}>
            <input type="checkbox" aria-label={C("show", { name })} checked={style.layers[id].show} onChange={(e) => { setL(id, { show: e.target.checked }); if (e.target.checked) select(id); }} />
            <button type="button" aria-pressed={selected === id} onClick={() => select(selected === id ? null : id)}>
              <span className="studio-layer-n">{name}</span>
              <span className="studio-layer-d">{what}</span>
            </button>
          </div>
        ); })}
      </div>
      <Check label={C("worldLabelsOnThe")} checked={style.layout.hud} onChange={(v) => set((s) => ({ ...s, layout: { ...s.layout, hud: v } }))} />
      <Check label={C("shadeTheStageBehind")} checked={style.layout.cards} onChange={(v) => set((s) => ({ ...s, layout: { ...s.layout, cards: v } }))} />
      {selected && l && (
        <div className="studio-group" aria-label={C("layerSettings", { name: N("layer", selected) })}>
          <h3 className="headline">{N("layer", selected)}</h3>
          {selected !== "metric" && (
            <div className="studio-field">
              <label className="ctl-l" htmlFor={`w-${selected}`}>{C("words")}</label>
              <textarea id={`w-${selected}`} ref={area} className="studio-words" rows={2} maxLength={280} value={l.text} onChange={(e) => setL(selected, { text: e.target.value })} />
              <div className="studio-tokens" aria-label={C("insert")}>
                {TOKENS.map(([tok]) => { const what = N("token", tok.slice(1, -1)); return <button key={tok} type="button" className="studio-token" title={C("insertWhat", { what })} onClick={() => insert(tok)}>{what}</button>; })}
              </div>
            </div>
          )}
          <div className="studio-field">
            <span className="ctl-l">{C("place")}<output>{Math.round(l.x * 100)}, {Math.round(l.y * 100)}</output></span>
            <div className="studio-place">
              <div className="studio-grid" role="group" aria-label={C("snapTo")}>
                {ANCHORS.map(([ax, ay]) => (
                  <button key={`${ax}-${ay}`} type="button" aria-label={ANCHOR_NAME(ax, ay)} aria-pressed={l.ax === ax && l.ay === ay && Math.abs(l.x - (ax === 0 ? MARGIN : ax === 1 ? 1 - MARGIN : 0.5)) < 1e-3}
                    onClick={() => setL(selected, { ax, ay, x: ax === 0 ? MARGIN : ax === 1 ? 1 - MARGIN : 0.5, y: ay === 0 ? MARGIN : ay === 1 ? 1 - MARGIN : 0.5, align: ax === 0 ? "left" : ax === 1 ? "right" : "center" })}><i /></button>
                ))}
              </div>
              <div className="studio-nudge" role="group" aria-label={C("nudge")}>
                {([["Up", 0, -1, "rot180"], ["Left", -1, 0, "rot90"], ["Right", 1, 0, "rot270"], ["Down", 0, 1, ""]] as const).map(([n, dx, dy, cls]) => (
                  <button key={n} type="button" className={`iconbtn n-${n.toLowerCase()}`} aria-label={C("nudgeDir", { dir: C(`dir.${n.toLowerCase()}`) })}
                    onClick={() => setL(selected, { x: Math.round((l.x + dx * 0.01) * 1000) / 1000, y: Math.round((l.y + dy * 0.01) * 1000) / 1000 })}>
                    <span className={cls}><Icon name="chevron" size={18} /></span>
                  </button>
                ))}
              </div>
            </div>
            <p className="small studio-note">{C("orDragItOn")}</p>
          </div>
          <Range label={C("size")} value={l.size} min={8} max={96} step={1} out={`${l.size}`} onChange={(v) => setL(selected, { size: v })} />
          <Range label={C("width")} value={l.w} min={0.1} max={1} step={0.01} out={`${Math.round(l.w * 100)} %`} onChange={(v) => setL(selected, { w: v })} />
          {selected !== "metric" && <Range label={C("mostLines")} value={l.lines} min={1} max={8} step={1} out={`${l.lines}`} onChange={(v) => setL(selected, { lines: v })} />}
          <Seg label={C("font")} value={l.font} options={[["title", C("title")], ["body", C("body")]]} onChange={(v) => setL(selected, { font: v })} />
          <Seg label={C("weight")} value={l.weight} options={[[400, C("regular")], [500, C("medium")], [700, C("bold")]]} onChange={(v) => setL(selected, { weight: v })} />
          <Seg label={C("lineUp")} value={l.align} options={[["left", C("left")], ["center", C("centre")], ["right", C("right")]]} onChange={(v) => setL(selected, { align: v })} />
          <Check label={C("capitalLetters")} checked={l.upper} onChange={(v) => setL(selected, { upper: v })} />
          <div className="studio-field">
            <Select label={C("colour")} value={isKey ? l.color : "custom"} options={colorOpts} onChange={(v) => setL(selected, { color: v === "custom" ? fg.slice(0, 7) : v })} />
            {!isKey && <ColorField label={C("textColour")} value={l.color} onChange={(v) => setL(selected, { color: v })} />}
            {low && <p className="small studio-warn" role="status">{C("hardToReadOn")}</p>}
          </div>
          <Seg label={C("behindTheText")} value={l.box} options={[["none", C("nothing")], ["scrim", C("shade")], ["solid", C("solid")]]} onChange={(v) => setL(selected, { box: v })} />
          <Seg label={C("shows")} value={l.when} options={[["all", C("always")], ["intro", C("opening")], ["run", C("running")], ["outro", C("end")]]} onChange={(v) => setL(selected, { when: v })} />
        </div>
      )}
    </>
  );
}

// ——— Look ———

const GRADE: [keyof Grade, string, number, number, number, (v: number) => string][] = [
  ["brightness", "Brightness", -1, 1, 0.01, pct],
  ["contrast", "Contrast", -1, 1, 0.01, pct],
  ["saturation", "Colour strength", -1, 1, 0.01, pct],
  ["warmth", "Warm or cool", -1, 1, 0.01, pct],
  ["hue", "Shift colours", -180, 180, 1, (v) => `${Math.round(v)}°`],
  ["vignette", "Dark edges", 0, 1, 0.01, (v) => `${Math.round(v * 100)}`],
];

export function LookTab({ style, set }: { style: ExportStyle; set: Set }) {
  const setC = (k: ColorKey, v: string) => set((s) => ({ ...s, theme: "custom", colors: { ...s.colors, [k]: v } }));
  const setG = (k: keyof Grade, v: number) => set((s) => ({ ...s, grade: { ...s.grade, [k]: v } }));
  const lay = style.layout;
  const filterOk = gradeSupported();
  return (
    <>
      <div className="studio-field">
        <span className="ctl-l">{C("theme")}</span>
        <div className="studio-themes" role="radiogroup" aria-label={C("theme")}>
          {THEME_IDS.map((id) => {
            const c = THEMES[id].colors;
            return (
              <button key={id} type="button" role="radio" aria-checked={style.theme === id} onClick={() => set((s) => ({ ...s, theme: id, colors: { ...THEMES[id].colors } }))}>
                <span className="studio-swatch" aria-hidden="true">{[c.bg, c.stage, c.base, c.alt, c.ink].map((x, i) => <i key={i} style={{ background: x }} />)}</span>
                {N("theme", id)}
              </button>
            );
          })}
          {style.theme === "custom" && <span className="studio-custom" role="radio" aria-checked="true">{C("yourColours")}</span>}
        </div>
      </div>
      <details className="studio-more">
        <summary>{C("everyColour")}</summary>
        <div className="studio-colors">
          {COLOR_KEYS.map(([k]) => <ColorField key={k} label={N("color", k)} value={style.colors[k]} onChange={(v) => setC(k, v)} />)}
        </div>
      </details>
      <Select label={C("titleFont")} value={style.fonts.title} options={FONTS} onChange={(v) => set((s) => ({ ...s, fonts: { ...s.fonts, title: v } }))} />
      <Select label={C("bodyFont")} value={style.fonts.body} options={FONTS} onChange={(v) => set((s) => ({ ...s, fonts: { ...s.fonts, body: v } }))} />
      <Seg label={C("worlds")} value={lay.split} options={[["alt", C("changedOnly")], ["auto", C("bothFit")], ["row", C("sideBySide")], ["column", C("stacked")], ["base", C("noChangeOnly")]]}
        onChange={(v) => set((s) => ({ ...s, layout: { ...s.layout, split: v } }))} />
      <Seg label={C("stage")} value={lay.stage} options={[["framed", C("framed")], ["fill", C("fullFrame")], ["small", C("small")]]} onChange={(v) => set((s) => ({ ...s, layout: { ...s.layout, stage: v } }))} />
      <Check label={C("chartUnderTheStage")} checked={lay.chart} onChange={(v) => set((s) => ({ ...s, layout: { ...s.layout, chart: v } }))} />
      <div className="studio-group">
        <h3 className="headline">{C("picture")}</h3>
        {GRADE.map(([k, , lo, hi, st, f]) => (
          (filterOk || k === "warmth" || k === "vignette") && <Range key={k} label={N("grade", k)} value={style.grade[k]} min={lo} max={hi} step={st} out={f(style.grade[k])} onChange={(v) => setG(k, v)} />
        ))}
        {!filterOk && <p className="small studio-note">{C("thisBrowserCanT")}</p>}
        <button type="button" className="btn" onClick={() => set((s) => ({ ...s, grade: { ...NO_GRADE } }))}>{C("resetPicture")}</button>
      </div>
    </>
  );
}
