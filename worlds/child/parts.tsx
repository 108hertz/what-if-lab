"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import type { Control } from "@/lib/sim/types";
import { Icon } from "@/components/ui/Icon";
import {
  CHANGES, ENDS, FAMILIES, FOREVER, GLOSSARY, HOME_OPTIONS, LEN_WORD, lenWord, SCIENCE, SHORT, SHOW, STEPS, STEP_VALUES, TRAITS, WORD, bestAges, kidName, stepOf, stepWord,
  type Show,
} from "./data";
import { endOf, child, familyName, kidLine, story, typicalKid, usually, values, whenOf, why, kindOf, WHATIF_GROUPS, type P as Params, type W } from "./sim";
import { drawPerson, drawThing, parentLook, reducedMotion, CHANGE_THING, type Look } from "./scene";
import { moveChange, stopChange, undoChange } from "./edit";
import s from "./child.module.css";

type P = { engine: SimEngine; onChange: () => void };
const params = (e: SimEngine) => e.params as Params;
const shown = (e: SimEngine) => (e.alt ?? e.base) as W;

/* ───────────── small drawn things ───────────── */

/** A trait glyph in the DOM (same drawing as the stage), in the trait's colour. */
export function TraitGlyph({ t, size = 16 }: { t: Show; size?: number }) {
  return (
    <svg className={s.glyph} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke={`var(--trait-${t})`} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      {t === "O" && <><circle cx="10.5" cy="10.5" r="5.5" /><path d="M14.5 14.5L19 19" /></>}
      {t === "C" && <><rect x="5" y="5" width="14" height="14" rx="2.5" /><path d="M8.5 12.5l2.5 2.5 4.5-5.5" /></>}
      {t === "E" && <path d="M7 5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6l-4 4v-4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" />}
      {t === "A" && <path d="M12 19C4 13.5 4.5 6 9 6c1.8 0 3 1.5 3 2.5 0-1 1.2-2.5 3-2.5 4.5 0 5 7.5-3 13z" />}
      {t === "Calm" && <><path d="M6 18c0-8 4-12 12-12 0 8-4 12-12 12z" /><path d="M6 18l7-7" /></>}
    </svg>
  );
}

/** A person drawn with the stage renderer, standing in a small canvas. */
export function PersonIcon({ look, w = 44, h = 60, label }: { look: Look; w?: number; h?: number; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = JSON.stringify(look);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = w * dpr; cv.height = h * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const grow = look.age < 18 ? 0.45 + 0.5 * Math.min(1, (look.age - 1) / 17) : 0.95;
    drawPerson(c, w / 2, h - 3, (h - 6) * grow, look);
  }, [key, w, h, look]);
  return <canvas ref={ref} className={s.person} style={{ width: w, height: h }} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** A number that ticks to its new value (≤ 250 ms); instant under reduced motion. */
export function useTick(v: number): number {
  const [d, setD] = useState(v);
  const from = useRef(v);
  useEffect(() => {
    if (reducedMotion() || from.current === v) { from.current = v; setD(v); return; }
    const a = from.current, t0 = performance.now();
    let raf = 0;
    const go = (t: number) => {
      const k = Math.min(1, (t - t0) / 250), e = 1 - (1 - k) ** 3, x = Math.round(a + (v - a) * e);
      from.current = x; setD(x);
      if (k < 1) raf = requestAnimationFrame(go);
    };
    raf = requestAnimationFrame(go);
    return () => cancelAnimationFrame(raf);
  }, [v]);
  return d;
}

/* ───────────── Pick a family ───────────── */

export function FamilyPicker({ engine, onChange }: P) {
  const p = params(engine);
  const pick = (v: string) => { engine.setParam("family", v); engine.restart(); onChange(); };
  return (
    <label className="ctl" htmlFor="child-family">
      <span className="ctl-head">Pick a family</span>
      <span className="select">
        <select id="child-family" value={p.family} onChange={(e) => pick(e.target.value)}>
          {Object.entries(FAMILIES).map(([id, f]) => <option key={id} value={id}>{f.name}</option>)}
          <option value="custom">{p.family === "custom" ? familyName(p) : "Build your own"}</option>
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </label>
  );
}

/* ───────────── Parent cards ───────────── */

/** Display value (Calm flipped) of parent `who` for trait index i. */
const parentVal = (p: Params, who: "a" | "b", i: number) => (i === 4 ? 100 - Number(p[who + "N"]) : Number(p[who + TRAITS[i]]));

function ParentCard({ engine, onChange, who }: P & { who: "a" | "b" }) {
  const p = params(engine), [open, setOpen] = useState(false);
  const name = who === "a" ? "Parent A" : "Parent B", id = `child-parent-${who}`;
  const set = (i: number, step: number) => {
    const v = STEP_VALUES[step];
    engine.setParam(who + TRAITS[i], i === 4 ? 100 - v : v);
    engine.restart(); onChange();
  };
  return (
    <div className={s.parent}>
      <div className={s.parentRow}>
        <PersonIcon look={parentLook(p, who)} />
        <div className={s.parentText}>
          <span className={s.parentName}>{name}</span>
          <span className={s.chips}>{SHOW.map((t, i) => <span key={t} className={s.chip}><TraitGlyph t={t} size={12} />{stepWord(t, parentVal(p, who, i))}</span>)}</span>
        </div>
        <button className={s.edit} aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          {open ? "Done" : "Edit"}<span className={s.chev}><Icon name="chevron" size={16} /></span>
        </button>
      </div>
      <div className={`${s.drawer} ${open ? s.open : ""}`} id={id} inert={!open}>
        <div className={s.drawerIn}>
          {SHOW.map((t, i) => (
            <label key={t} className={s.stepRow} htmlFor={`${id}-${t}`}>
              <span className={s.stepLabel}><TraitGlyph t={t} size={14} />{WORD[t]}</span>
              <span className="select">
                <select id={`${id}-${t}`} value={stepOf(parentVal(p, who, i))} onChange={(e) => set(i, Number(e.target.value))}>
                  {STEPS[t].map((w, k) => <option key={k} value={k}>{w}</option>)}
                </select>
                <Icon name="chevron" size={16} />
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ParentCards({ engine, onChange }: P) {
  return (
    <section className={s.parents}>
      <h3 className="headline">The parents</h3>
      <ParentCard engine={engine} onChange={onChange} who="a" />
      <ParentCard engine={engine} onChange={onChange} who="b" />
      <p className="small">Each kid gets a different mix of the two parents. Changing the family starts again.</p>
    </section>
  );
}

/* ───────────── Home ───────────── */

export function HomeSettings({ engine, onChange }: P) {
  const p = params(engine);
  const set = (id: string, v: string) => { engine.setParam(id, v); engine.restart(); onChange(); };
  return (
    <section>
      <h3 className="headline">Home</h3>
      <div className={s.home}>
        {HOME_OPTIONS.map(([id, label, opts]) => {
          const v = String(p[id]), cur = opts.find((o) => o[0] === v) ?? opts[0];
          return (
            <label key={id} className="ctl" htmlFor={`child-${id}`}>
              <span className="ctl-l">{label}</span>
              <span className="select">
                <select id={`child-${id}`} value={cur[0]} onChange={(e) => set(id, e.target.value)} aria-describedby={`child-${id}-help`}>
                  {opts.map(([o, lab]) => <option key={o} value={o}>{lab}</option>)}
                </select>
                <Icon name="chevron" size={18} />
              </span>
              <span className={s.help} id={`child-${id}-help`}>{cur[2]}</span>
            </label>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── Things that can happen ───────────── */

function ChangeSettings({ engine, onChange }: P) {
  const p = params(engine), w = shown(engine);
  const set = (k: string, v: string) => { engine.setParam(k, v); onChange(); };
  const at = whenOf(w, p), later = at > w.t;
  return (
    <div className={s.settings}>
      <label className="ctl" htmlFor="child-when">
        <span className="ctl-l">When it happens</span>
        <span className="select">
          <select id="child-when" value={p.s_age} onChange={(e) => set("s_age", e.target.value)}>
            <option value="now">Now (age {Math.floor(w.t)})</option>
            {Array.from({ length: 17 }, (_, i) => <option key={i} value={String(i + 1)}>At age {i + 1}{i + 1 <= w.t ? " (already past: now)" : ""}</option>)}
          </select>
          <Icon name="chevron" size={18} />
        </span>
      </label>
      <label className="ctl" htmlFor="child-size">
        <span className="ctl-l">How big</span>
        <span className="select">
          <select id="child-size" value={p.s_size} onChange={(e) => set("s_size", e.target.value)}>
            <option value="small">Small</option><option value="medium">Medium</option><option value="big">Big</option>
          </select>
          <Icon name="chevron" size={18} />
        </span>
      </label>
      <label className="ctl" htmlFor="child-len">
        <span className="ctl-l">How long</span>
        <span className="select">
          <select id="child-len" value={p.s_len ?? "usual"} onChange={(e) => set("s_len", e.target.value)}>
            {Object.entries(LEN_WORD).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Icon name="chevron" size={18} />
        </span>
      </label>
      <p className={`small ${s.whenLine}`}>{later ? `Your next click happens at age ${Math.floor(at)}.` : "Your next click happens now."}{(p.s_len ?? "usual") === "usual" ? " Each change lasts as long as it usually does." : ""}</p>
    </div>
  );
}

/** A change's little picture: the thing it brings into the room, or its kind's glyph. */
function ChangeIcon({ id, size = 22 }: { id: string; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const th = CHANGE_THING[id];
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !th) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr; cv.height = size * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, size, size);
    drawThing(c, th, size / 2, size * 0.92, size * 0.8);
  }, [th, size]);
  if (!th) return <span className={s.cIcon} style={{ width: size, height: size }}><TlGlyph kind={CHANGES[id]?.kind ?? "change"} /></span>;
  return <canvas ref={ref} className={s.cIcon} style={{ width: size, height: size }} aria-hidden="true" />;
}

/**
 * Things that can happen (change 0019): the settings for the next click, the life ruler with your changes, then each
 * group of changes behind its own heading (Home open at first), every row a question with what it usually does and its
 * best ages.
 */
export function ChangeList({ engine, onChange }: P) {
  const w = shown(engine);
  const mods = engine.alt ? (engine.alt as W).mods : [];
  const count = (id: string) => mods.filter((m) => m.id === id).length;
  const ages = (id: string) => mods.filter((m) => m.id === id).map((m) => Math.floor(m.age));
  const [pressed, setPressed] = useState<string | null>(null);
  const click = (id: string) => {
    engine.change(id); onChange();
    setPressed(id); setTimeout(() => setPressed((x) => (x === id ? null : x)), 600);
  };
  return (
    <section className={s.changes}>
      <h3 className="headline">Things that can happen</h3>
      <p className="small hint-line">They add up. Pick when, how big and how long, then click.</p>
      <ChangeSettings engine={engine} onChange={onChange} />
      <LifeRuler engine={engine} onChange={onChange} />
      {WHATIF_GROUPS.map(([g, ids], gi) => {
        const n = ids.reduce((a, id) => a + count(id), 0);
        return (
          <details key={g} className={s.group} open={gi === 0}>
            <summary><span className="ctl-head">{g}</span><span className={s.groupN}>{n ? `${n} made` : `${ids.length} to try`}</span><Icon name="chevron" size={16} /></summary>
            <div className="forks">
              {ids.map((id) => {
                const k = count(id), a = ages(id), best = bestAges(id), min = CHANGES[id].min;
                return (
                  <button key={id} className={`fork ${pressed === id ? s.pressed : ""}`} aria-pressed={k > 0} onClick={() => click(id)}>
                    <ChangeIcon id={id} />
                    <span className={s.q}>
                      {CHANGES[id].q}
                      <span className={s.usually}>Usually: {usually(id, w)}{best ? ` · ${best}` : ""}{min && w.t < min ? ` · from ${min}` : ""}</span>
                      {a.length > 0 && <span className={s.age}>{a.length > 1 ? `ages ${[...new Set(a)].join(", ")}` : `age ${a[0]}`}</span>}
                    </span>
                    {k > 1 && <span key={k} className={`count ${s.pop}`} aria-label={`made ${k} times`}>×{k}</span>}
                  </button>
                );
              })}
            </div>
          </details>
        );
      })}
    </section>
  );
}

/**
 * The life ruler (change 0019): a line from birth to 18 (longer once they are older) with every change at its age and a
 * bar for how long it goes on. Planned changes can be dragged (mouse or pen) or moved with the arrow keys; tap or Enter
 * opens a small panel to move, stop or undo one.
 */
function LifeRuler({ engine, onChange }: P) {
  const alt = engine.alt as W | null;
  const [sel, setSel] = useState(-1);
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ idx: number; moved: boolean } | null>(null);
  if (!alt || !alt.mods.length) return <p className={`small ${s.rulerEmpty}`}>Your changes will appear here, on a line from birth to 18.</p>;
  const t = alt.t, mods = alt.mods;
  const span = Math.min(60, Math.max(18, Math.ceil(Math.max(t, ...mods.map((m) => m.age)) + 1)));
  const P = (a: number) => `${(Math.max(0, Math.min(span, a)) / span) * 100}%`;
  // Lanes so icons never overlap
  const order = mods.map((m, i) => [i, m.age] as [number, number]).sort((a, b) => a[1] - b[1]);
  const lane: number[] = [], laneEnd: number[] = [];
  for (const [i, a] of order) { let l = 0; while ((laneEnd[l] ?? -99) > a - span * 0.07) l++; lane[i] = l; laneEnd[l] = a; }
  const lanes = Math.max(1, ...lane.map((l) => l + 1));
  const ticks = span <= 18 ? [0, 5, 10, 15, 18] : [0, 10, 18, ...[30, 45, 60].filter((x) => x <= span)];
  const ageAt = (clientX: number) => { const r = box.current!.getBoundingClientRect(); return Math.round(((clientX - r.left) / r.width) * span); };
  const move = (i: number, a: number) => { moveChange(engine, i, a); onChange(); };
  const m = mods[sel];
  const endA = (x: typeof m) => Math.min(endOf(x) > x.age ? endOf(x) : x.age + 0.4, span);
  return (
    <div className={s.ruler}>
      <span className="ctl-head">Your changes</span>
      <div ref={box} className={s.rulerTrack} style={{ height: 22 + lanes * 30 }}>
        {ticks.map((a) => <span key={a} className={s.rulerTick} style={{ left: P(a) }}>{a}</span>)}
        <span className={s.rulerNow} style={{ left: P(t) }} aria-hidden="true" />
        {mods.map((x, i) => (
          <span key={`b${i}`} className={`${s.rulerBar} ${x.on ? "" : s.planned}`} style={{ left: P(x.age), width: `calc(${P(endA(x))} - ${P(x.age)})`, top: 22 + lane[i] * 30 + 13 }} aria-hidden="true" />
        ))}
        {mods.map((x, i) => {
          const label = `${CHANGES[x.id].cap}, age ${Math.floor(x.age)}, ${lenWord(x.end - x.age)}${x.on ? "" : ", planned: arrow keys move it"}`;
          return (
            <button key={`i${i}`} type="button" className={`${s.rulerIcon} ${x.on ? "" : s.planned} ${sel === i ? s.selected : ""}`}
              style={{ left: P(x.age), top: 22 + lane[i] * 30 }} aria-label={label} title={label}
              onPointerDown={(e) => { if (!x.on && e.pointerType !== "touch") { drag.current = { idx: i, moved: false }; e.currentTarget.setPointerCapture(e.pointerId); } }}
              onPointerMove={(e) => { const d = drag.current; if (d && d.idx === i) { const a = ageAt(e.clientX); if (a !== Math.floor(x.age)) { d.moved = true; move(i, a); } } }}
              onPointerUp={() => { const d = drag.current; drag.current = null; if (!d?.moved) setSel(sel === i ? -1 : i); }}
              onKeyDown={(e) => {
                if (!x.on && (e.key === "ArrowLeft" || e.key === "ArrowRight")) { e.preventDefault(); move(i, Math.floor(x.age) + (e.key === "ArrowRight" ? 1 : -1)); }
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSel(sel === i ? -1 : i); }
              }}>
              <ChangeIcon id={x.id} size={18} />
            </button>
          );
        })}
      </div>
      {m && (
        <div className={s.rulerPanel}>
          <p><b>{SHORT[m.id]}</b> · age {Math.floor(m.age)} · {lenWord(m.end - m.age)} · {!m.on ? "planned" : m.stop <= t ? `stopped at ${Math.floor(m.stop)}` : endOf(m) > t && endOf(m) > m.age ? "going on" : "over"}</p>
          <div className={s.rulerBtns}>
            {!m.on && <button type="button" className="btn" onClick={() => move(sel, Math.floor(m.age) - 1)} aria-label="One year earlier"><Icon name="minus" size={16} />Earlier</button>}
            {!m.on && <button type="button" className="btn" onClick={() => move(sel, Math.floor(m.age) + 1)} aria-label="One year later"><Icon name="plus" size={16} />Later</button>}
            {m.on && !m.sn && m.stop >= FOREVER && endOf(m) > t && endOf(m) > m.age && <button type="button" className="btn" onClick={() => { stopChange(engine, sel); onChange(); }}>Stop now</button>}
            <button type="button" className="btn" onClick={() => { undoChange(engine, sel); setSel(-1); onChange(); }}>Undo</button>
          </div>
        </div>
      )}
    </div>
  );
}

/** What the five words mean (change 0019): one line and two examples each. */
export function Glossary() {
  return (
    <details className={s.glossary}>
      <summary><span className="ctl-head">What do the five words mean?</span><Icon name="chevron" size={16} /></summary>
      <dl>
        {SHOW.map((t) => (
          <div key={t}>
            <dt><TraitGlyph t={t} size={14} />{WORD[t]}</dt>
            <dd>{GLOSSARY[t][0]} For example, a kid who {GLOSSARY[t][1][0]}, or {GLOSSARY[t][1][1]}.</dd>
          </div>
        ))}
      </dl>
    </details>
  );
}

/* ───────────── Story ───────────── */

export function Story({ engine }: { engine: SimEngine }) {
  const lines = story({ b: engine.base as W, a: engine.alt as W | null, p: params(engine) });
  return (
    <section className={s.story}>
      <h3 className="headline">{engine.alt ? "What changed" : "What is happening"}</h3>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </section>
  );
}

/* ───────────── Meet the child ───────────── */

/** The look of kid j: the family's colours, its own traits. */
function kidLook(p: Params, j: number, age: number, vs: number[]): Look {
  const a = parentLook(p, "a"), b = parentLook(p, "b");
  const pick = (j * 13 + 5) % 4;
  return {
    skin: pick < 2 ? a.skin : b.skin, hair: pick % 2 ? a.hair : b.hair, shirt: `hsl(${Math.round(200 - vs[2] * 1.8)}, 45%, 55%)`, pants: "#2E3550",
    age, calm: vs[4], out: vs[2], style: j % 4, seed: j,
  };
}

export function MeetChild({ engine, kid, setKid }: { engine: SimEngine; kid: number; setKid: (j: number) => void }) {
  const w = shown(engine), p = params(engine), v = values(w);
  // The typical kid is picked once per year of age (and per change), so the card doesn't flicker between near-ties
  const memo = useRef<{ key: string; j: number }>({ key: "", j: 0 });
  const mkey = `${Math.floor(w.t)}|${w.mods.length}|${engine.seed}|${JSON.stringify(engine.params)}`;
  if (memo.current.key !== mkey) memo.current = { key: mkey, j: typicalKid(w, v) };
  const typ = memo.current.j;
  const j = kid < 0 ? typ : kid % w.k.length, vs = v.map((xs) => xs[j]), age = Math.floor(w.t);
  return (
    <section className={s.meet}>
      <h3 className="headline">Meet the child</h3>
      <div key={kid < 0 ? "typical" : j} className={s.meetCard}>
        <PersonIcon look={kidLook(p, j, w.t, vs)} w={56} h={76} label={`${kidName(j)}, age ${age}`} />
        <div className={s.meetText}>
          <span className={s.meetWho}>{kid < 0 ? "The most typical kid" : `Kid #${j + 1} of 120`}</span>
          <p className={s.meetLine}>{kidLine(j, age, vs)}</p>
          <span className={s.chips}>{SHOW.map((t, i) => <span key={t} className={s.chip}><TraitGlyph t={t} size={12} />{stepWord(t, vs[i])}</span>)}</span>
        </div>
      </div>
      <div className={s.meetBtns}>
        <button className="btn" onClick={() => setKid(kid < 0 ? (typ + 1) % w.k.length : (j + 1) % w.k.length)}>Meet another one<Icon name="arrow" size={16} /></button>
        {kid >= 0 && <button className={s.link} onClick={() => setKid(-1)}>Back to the typical kid</button>}
      </div>
      <p className="small">Same parents, same home, and still each kid is different.</p>
    </section>
  );
}

/* ───────────── Why are they different? ───────────── */

const PARTS = [["genes", "Genes"], ["home", "Home"], ["life", "Life events"], ["chance", "Chance"]] as const;

export function NatureBar({ engine }: { engine: SimEngine }) {
  const rows = why(shown(engine));
  return (
    <section className={s.why}>
      <h3 className="headline">Why are these kids different?</h3>
      <p className={s.whyIntro}>Of all the differences between these 120 brothers and sisters, how much comes from each part:</p>
      <div className={s.legend} aria-hidden="true">
        {PARTS.map(([k, label], i) => <span key={k}><i className={s[`p${i}`]} />{label}</span>)}
      </div>
      {rows.map((r) => {
        const txt = PARTS.map(([k, label]) => `${label.toLowerCase()} ${Math.round(r[k])} %`).join(", ");
        return (
          <div key={r.show} className={s.whyRow}>
            <span className={s.whyName}><TraitGlyph t={r.show} size={14} />{WORD[r.show]}</span>
            <span className={s.bar} role="img" aria-label={`${WORD[r.show]}: ${txt}`} title={txt}>
              {PARTS.map(([k], i) => (
                <span key={k} className={s[`p${i}`]} style={{ width: `${r[k]}%` }}>{r[k] >= 16 ? `${Math.round(r[k])}%` : ""}</span>
              ))}
            </span>
          </div>
        );
      })}
      <p className="small">Genes: each kid gets a different mix from the parents. Home: the same home affects kids a bit differently. Life events: your changes and everyday ups and downs. Chance: everything else.</p>
    </section>
  );
}

/* ───────────── About the science ───────────── */

export function AboutScience() {
  return (
    <section className={s.science}>
      <h3 className="headline">About the science</h3>
      <p>Scientists often describe personality with five traits, called the Big Five. Here they have plain names:</p>
      <ul>{SHOW.map((t) => <li key={t}><b>{WORD[t]}</b> is {SCIENCE[t]}: from “{ENDS[t][0]}” to “{ENDS[t][1]}”.</li>)}</ul>
      <p>The numbers are rough and research-inspired, not exact. They describe averages, not destiny: real kids are not predicted by a model.</p>
    </section>
  );
}

/* ───────────── Tune ───────────── */

const TUNE_IDS = ["inherit", "luck", "sens", "fade", "events", "s_age", "s_size", "s_len"];

export function ChildTune({ engine, onChange }: P) {
  const ctls = child.controls.filter((c): c is Extract<Control, { type: "select" }> => c.type === "select" && TUNE_IDS.includes(c.id));
  const set = (c: Extract<Control, { type: "select" }>, v: string) => { engine.setParam(c.id, v); if (!c.live) engine.restart(); onChange(); };
  const row = (c: Extract<Control, { type: "select" }>) => (
    <label key={c.id} className="ctl" htmlFor={`c-child-${c.id}`}>
      <span className="ctl-l">{c.label}</span>
      <span className="select">
        <select id={`c-child-${c.id}`} value={String(engine.params[c.id])} onChange={(e) => set(c, e.target.value)}>
          {c.options.map(([val, lab]) => <option key={val} value={val}>{lab}</option>)}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </label>
  );
  return (
    <section>
      <h3 className="headline">Variables</h3>
      <div className="ctls">
        <div className="ctl-head">Nature and chance</div>
        {ctls.filter((c) => !c.live).map(row)}
        <div className="ctl-head">Change settings (used by your next click)</div>
        {ctls.filter((c) => c.live).map(row)}
      </div>
      <p className="small">Nature and chance settings start the world again. Change settings apply to your next click.</p>
    </section>
  );
}

/* ───────────── Timeline ───────────── */

function TlGlyph({ kind }: { kind: ReturnType<typeof kindOf> }) {
  const d: Record<string, ReactNode> = {
    milestone: <path d="M7 20V5M7 5h10l-2 3.5 2 3.5H7" />,
    home: <path d="M5 11l7-6 7 6M7 9.5V19h10V9.5" />,
    school: <><path d="M5 6.5c2.5-1 5-1 7 .5 2-1.5 4.5-1.5 7-.5V18c-2.5-1-5-1-7 .5-2-1.5-4.5-1.5-7-.5z" /><path d="M12 7v11.5" /></>,
    activity: <><circle cx="12" cy="12" r="6.5" /><path d="M12 5.5v13M5.5 12h13" /></>,
    move: <><path d="M5 12h14" /><path d="M14 7l5 5-5 5" /></>,
    everyday: <><circle cx="7" cy="12" r="1.2" /><circle cx="12" cy="12" r="1.2" /><circle cx="17" cy="12" r="1.2" /></>,
    change: <><circle cx="6" cy="12" r="1.6" /><path d="M7.6 12H11c2 0 2.6-5 5-5h2.5" /><path d="M11 12c2 0 2.6 5 5 5h2.5" /></>,
    ripple: <><circle cx="12" cy="12" r="2" /><path d="M7.5 8.5a6 6 0 0 0 0 7M16.5 8.5a6 6 0 0 1 0 7" /><path d="M4.5 6a10 10 0 0 0 0 12M19.5 6a10 10 0 0 1 0 12" /></>,
    luck: <path d="M12 4l2.3 4.9 5.2.6-3.9 3.6 1 5.2L12 15.8l-4.6 2.5 1-5.2-3.9-3.6 5.2-.6z" />,
    together: <><path d="M12 20s-6.5-4-6.5-9A3.5 3.5 0 0 1 12 8.5 3.5 3.5 0 0 1 18.5 11c0 5-6.5 9-6.5 9z" /></>,
  };
  return <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d[kind]}</svg>;
}

/** Timeline filters (change 0019): which kinds of lines each one keeps. */
const TL_FILTERS: [string, (k: ReturnType<typeof kindOf>) => boolean][] = [
  ["All", () => true],
  ["Changes", (k) => ["home", "school", "activity", "move", "luck", "change"].includes(k)],
  ["Effects", (k) => k === "ripple" || k === "together"],
  ["Growing up", (k) => k === "milestone" || k === "everyday"],
];

export function ChildTimeline({ engine }: { engine: SimEngine }) {
  const [f, setF] = useState(0);
  const items = engine.timeline(80).filter((e) => TL_FILTERS[f][1](kindOf(e.txt))).slice(0, 40);
  const who = { both: engine.alt ? "Both" : "", base: "Only with no changes", alt: "Only with your changes" };
  const bar = (
    <div className={`seg ${s.tlFilter}`} role="group" aria-label="Show in the timeline">
      {TL_FILTERS.map(([l], i) => <button key={l} type="button" aria-pressed={f === i} onClick={() => setF(i)}>{l}</button>)}
    </div>
  );
  if (!items.length) return <>{bar}<ul className={s.tl}><li><p className="empty">{f ? "Nothing of this kind yet." : "Nothing yet. Press play, or try a change."}</p></li></ul></>;
  return (
    <>
    {bar}
    <ul className={s.tl}>
      {items.map((e, i) => {
        const k = kindOf(e.txt);
        return (
          <li key={i} className={s[e.who]}>
            <time>{engine.sb.fmtT(e.t)}</time>
            <span className={s.tlGlyph} title={k}><TlGlyph kind={k} /></span>
            <span>{e.txt}{who[e.who] && <span className={s.whoLine}>{who[e.who]}</span>}</span>
          </li>
        );
      })}
    </ul>
    </>
  );
}
