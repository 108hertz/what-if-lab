"use client";

import { useEffect, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { fmtNum } from "@/lib/sim/core";
import { Icon, type IconName } from "@/components/ui/Icon";
import { HAB_T, MAX_CAST, READY_GROUPS, SPECIES, SPECIES_GROUPS, castString, startMax, type Habitat } from "./data";
import { castOf, caption, counts, newcomerOf, question, story, targetOf, traits, worldName, WHATIF_GROUPS, type P as Params, type W } from "./sim";
import { drawAnimal, reducedMotion, type Traits } from "./scene";
import s from "./animals.module.css";

type P = { engine: SimEngine; onChange: () => void };
const params = (e: SimEngine) => e.params as Params;
const shown = (e: SimEngine) => (e.alt ?? e.base) as W;
const far = (id: string, hab: Habitat) => { const sp = SPECIES[id], T = HAB_T[hab]; return T < sp.lo || T > sp.hi; };

/* ───────────── a drawn animal (same renderer as the stage) ───────────── */

export function AnimalIcon({ id, size = 24, tr, flip = 1 }: { id: string; size?: number; tr?: Traits; flip?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const key = tr ? `${tr.sp.toFixed(2)}|${tr.sz.toFixed(2)}|${tr.se.toFixed(2)}|${tr.co.toFixed(2)}` : "";
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = size * dpr; cv.height = size * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, size, size);
    const L = SPECIES[id].look, tall = L.form === "upright" || L.form === "penguin";
    drawAnimal(c, SPECIES[id], size / 2, size * (tall ? 0.55 : 0.52), size * (tall ? 0.3 : 0.3), flip, 0, tr);
  }, [id, size, key, flip, tr]);
  return <canvas ref={ref} className={s.icon} style={{ width: size, height: size }} aria-hidden="true" />;
}

/** A count that ticks to its new value (≤ 250 ms) instead of jumping; instant under reduced motion. */
function useTick(v: number): number {
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
function Count({ v }: { v: number }) { return <span className={s.count}>{fmtNum(useTick(v))}</span>; }

/* ───────────── Pick a world ───────────── */

export function WorldPicker({ engine, onChange }: P) {
  const p = params(engine), v = p.world ?? "yellowstone";
  const pick = (x: string) => { engine.setParam("world", x); engine.restart(); onChange(); };
  return (
    <label className="ctl" htmlFor="animals-world">
      <span className="ctl-head">Pick a world</span>
      <span className="select">
        <select id="animals-world" value={v} onChange={(e) => pick(e.target.value)}>
          {v === "custom" && <option value="custom">{worldName(p)}</option>}
          {READY_GROUPS.map(([g, opts]) => (
            <optgroup key={g} label={g}>{opts.map(([id, lab]) => <option key={id} value={id}>{lab}</option>)}</optgroup>
          ))}
        </select>
        <Icon name="chevron" size={18} />
      </span>
    </label>
  );
}

/* ───────────── Who lives here ───────────── */

export function CastEditor({ engine, onChange }: P) {
  const p = params(engine), cast = castOf(p), hab = (p.habitat ?? "forest") as Habitat;
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const set = (c: [string, number][]) => { engine.setParam("cast", castString(c)); engine.restart(); onChange(); };
  const bump = (i: number, d: number) => set(cast.map(([id, k], j) => [id, j === i ? Math.max(0, Math.min(startMax(id), k + d)) : k]));
  const remove = (id: string) => {
    if (reducedMotion()) return set(cast.filter(([x]) => x !== id));
    setLeaving(id);
    setTimeout(() => { setLeaving(null); set(castOf(params(engine)).filter(([x]) => x !== id)); }, 150);
  };
  const add = (id: string) => { setOpen(false); set([...cast, [id, SPECIES[id].meta ? 6 : 40]]); addRef.current?.focus(); };
  const full = cast.length >= MAX_CAST;
  return (
    <section>
      <h3 className="headline">Who lives here</h3>
      <div className={s.cast}>
        {cast.map(([id, k], i) => {
          const sp = SPECIES[id], step = sp.meta ? 1 : 5;
          return (
            <div key={id} className={`${s.row} ${leaving === id ? s.leaving : ""}`}>
              <AnimalIcon id={id} size={28} />
              <span className={s.who}>{sp.name}{far(id, hab) && <span className={s.far}>Far from home</span>}</span>
              <span className={s.step} role="group" aria-label={`${sp.many} at the start`}>
                <button className={s.ib} aria-label={`Fewer ${sp.many} at the start`} disabled={k <= 0} onClick={() => bump(i, -step)}><Icon name="minus" size={18} /></button>
                <output aria-live="polite">{k}</output>
                <button className={s.ib} aria-label={`More ${sp.many} at the start`} disabled={k >= startMax(id)} onClick={() => bump(i, step)}><Icon name="plus" size={18} /></button>
              </span>
              <button className={s.ib} aria-label={`Take ${sp.many} out of this world`} title={cast.length <= 1 ? "A world needs at least one animal" : `Take ${sp.many} out`} disabled={cast.length <= 1} onClick={() => remove(id)}><Icon name="close" size={18} /></button>
            </div>
          );
        })}
        <button ref={addRef} className={s.add} aria-expanded={open} aria-controls="animals-add" disabled={full} onClick={() => setOpen(!open)}>
          <Icon name="plus" size={18} />{full ? "Five is the most" : "Add an animal"}{!full && <span className={s.chev}><Icon name="chevron" size={16} /></span>}
        </button>
        {open && !full && (
          <div className={s.pick} id="animals-add" onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); addRef.current?.focus(); } }}>
            {SPECIES_GROUPS.map(([g, ids]) => {
              const rest = ids.filter((id) => !cast.some(([x]) => x === id));
              if (!rest.length) return null;
              return (
                <div key={g} className={s.pickGroup}>
                  <span className="ctl-head">{g}</span>
                  {rest.map((id) => (
                    <button key={id} className={s.pickItem} onClick={() => add(id)}>
                      <AnimalIcon id={id} size={28} />
                      <span>{SPECIES[id].name}{far(id, hab) && <span className={s.far}>Far from home</span>}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="small">Changing who lives here starts the world again.</p>
    </section>
  );
}

/* ───────────── Make changes ───────────── */

export function ChangeList({ engine, onChange }: P) {
  const p = params(engine), w = shown(engine);
  const count = (id: string) => engine.applied.filter((x) => x === id).length;
  const target = targetOf(w, p), newcomer = newcomerOf(w, p);
  const set = (k: string, v: string) => { engine.setParam(k, v); onChange(); };
  return (
    <section className={s.changes}>
      <h3 className="headline">Make changes</h3>
      <p className="small hint-line">They add up. Click one again to make it stronger.</p>
      <div className={s.target}>
        <label className="ctl" htmlFor="animals-target">
          <span className="ctl-l">Changes to one animal use</span>
          <span className="select">
            <select id="animals-target" value={target} onChange={(e) => set("target", e.target.value)}>
              {w.cast.map((id) => <option key={id} value={id}>{SPECIES[id].name}</option>)}
            </select>
            <Icon name="chevron" size={18} />
          </span>
        </label>
        <label className="ctl" htmlFor="animals-newcomer">
          <span className="ctl-l">Who could move in</span>
          <span className="select">
            <select id="animals-newcomer" value={newcomer} onChange={(e) => set("newcomer", e.target.value)}>
              {SPECIES_GROUPS.map(([g, ids]) => <optgroup key={g} label={g}>{ids.map((id) => <option key={id} value={id}>{SPECIES[id].name}{w.cast.includes(id) ? " (lives here)" : ""}</option>)}</optgroup>)}
            </select>
            <Icon name="chevron" size={18} />
          </span>
        </label>
      </div>
      {WHATIF_GROUPS.map(([g, ids]) => (
        <div key={g} className="forks">
          <span className="ctl-head">{g}</span>
          {ids.map((id) => {
            const n = count(id);
            return (
              <button key={id} className="fork" aria-pressed={n > 0} onClick={() => { engine.change(id); onChange(); }}>
                <Icon name="fork" />
                {question(id, w, p)}
                {n > 1 && <span key={n} className={`count ${s.pop}`} aria-label={`applied ${n} times`}>×{n}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </section>
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

/* ───────────── Right now ───────────── */

function trend(engine: SimEngine, i: number, now: number): [IconName, string, string] {
  if (now === 0) return ["close", "gone", ""];
  const h = engine.history, arr = (engine.alt ? h.alt : h.base)[`n${i}`] ?? [];
  const back = arr.length > 10 ? arr[arr.length - 11] : arr[0];
  const d = back == null ? 0 : now - back, big = Math.max(2, (back ?? now) * 0.08);
  return d > big ? ["arrow", "rising", s.up] : d < -big ? ["arrow", "falling", s.down] : ["minus", "steady", ""];
}

export function RightNow({ engine }: { engine: SimEngine }) {
  const w = shown(engine), n = counts(w), nb = engine.alt ? counts(engine.base as W) : null;
  return (
    <section className={s.now}>
      <h3 className="headline">Right now</h3>
      {w.cast.map((id, i) => {
        const [ic, word, cls] = trend(engine, i, n[i]);
        return (
          <div key={id} className={s.nowRow}>
            <AnimalIcon id={id} size={28} />
            <span className={s.nowName}>{SPECIES[id].pl}</span>
            <span className={s.nowVal}>
              <span><Count v={n[i]} />{nb && <span className={s.nc}> (no change: {i < nb.length ? fmtNum(nb[i]) : "none"})</span>}</span>
              <span key={word} className={s.trend}><span className={cls}><Icon name={ic} size={12} /></span>{word}</span>
            </span>
          </div>
        );
      })}
    </section>
  );
}

/* ───────────── Then vs now ───────────── */

export function Portrait({ engine, focus, setFocus }: { engine: SimEngine; focus: number; setFocus: (i: number) => void }) {
  const w = shown(engine), i = Math.min(focus, w.cast.length - 1), id = w.cast[i], sp = SPECIES[id];
  const t = traits(w, i);
  const ref = useRef<HTMLCanvasElement>(null);
  const key = t ? `${t.sp.toFixed(2)}${t.sz.toFixed(2)}${t.se.toFixed(2)}${t.co.toFixed(2)}` : "none";
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1, W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const c = cv.getContext("2d")!;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, W, H);
    const tall = sp.look.form === "upright" || sp.look.form === "penguin";
    const r0 = Math.min(H * (tall ? 0.24 : 0.3), W * 0.14), y = H * (tall ? 0.5 : 0.48);
    const label = getComputedStyle(document.documentElement).getPropertyValue("--label-2").trim();
    const draw = (x: number, tr: Traits | null, txt: string) => {
      if (tr) drawAnimal(c, sp, x, y, r0 * tr.sz ** 0.8, 1, 0, tr);
      c.fillStyle = label; c.font = "500 10px " + getComputedStyle(document.body).fontFamily; c.textAlign = "center";
      c.fillText(txt.toUpperCase(), x, H - 4);
    };
    draw(W * 0.27, { sp: 1, sz: 1, se: 1, co: 1 }, "Day 0");
    draw(W * 0.73, t, t ? `Day ${Math.floor(w.t)}` : "None left");
  }, [id, key, sp, t, w.t]);
  return (
    <section className={s.portrait}>
      <h3 className="headline">Then and now</h3>
      {w.cast.length > 1 && (
        <div className={`mtabs ${s.tabs}`} role="group" aria-label="Which animal">
          {w.cast.map((x, j) => <button key={x} aria-pressed={j === i} onClick={() => setFocus(j)}>{SPECIES[x].pl}</button>)}
        </div>
      )}
      <canvas ref={ref} className={s.pcanvas} role="img" aria-label={`The typical ${sp.one} on day 0 and today, drawn at the same scale. ${caption(id, t)}`} />
      <p className={s.caption}>{caption(id, t)}</p>
    </section>
  );
}

/* ───────────── Timeline with event glyphs ───────────── */

function glyph(txt: string): IconName {
  if (/died out|removed|no room|Disease/i.test(txt)) return "minus";
  if (/wanders in|move in|arrive/i.test(txt)) return "arrow";
  if (/doubled/i.test(txt)) return "plus";
  if (/selection|bigger|shrink|Coats|notice/i.test(txt)) return "expand";
  if (/warm|rain|ice age|wildfire|climate|habitat|reserve|hunting/i.test(txt)) return "sun";
  return "fork";
}

export function AnimalTimeline({ engine }: { engine: SimEngine }) {
  const items = engine.timeline();
  const who = { both: engine.alt ? "Both worlds" : "", base: "Only with no change", alt: "Only with your changes" };
  if (!items.length) return <ul className={s.tl}><li><p className="empty">Nothing notable yet. Let it run, or make a change.</p></li></ul>;
  return (
    <ul className={s.tl}>
      {items.map((e, i) => (
        <li key={i} className={s[e.who]}>
          <time>{engine.sb.fmtT(e.t)}</time>
          <span className={s.glyph}><Icon name={glyph(e.txt)} size={18} /></span>
          <span>{e.txt}{who[e.who] && <span className={s.whoLine}>{who[e.who]}</span>}</span>
        </li>
      ))}
    </ul>
  );
}

/* ───────────── Fact cards ───────────── */

export function Facts({ engine }: { engine: SimEngine }) {
  const w = shown(engine), hab = w.habit;
  return (
    <section>
      <h3 className="headline">Meet the animals</h3>
      <div className={s.facts}>
        {w.cast.map((id) => {
          const sp = SPECIES[id];
          return (
            <article key={id} className={s.fact}>
              <AnimalIcon id={id} size={40} />
              <div>
                <h4>{sp.name}</h4>
                <span className={s.latin}>{sp.latin}</span>
                {far(id, hab) && <span className="micro"> · Far from home here</span>}
              </div>
              <dl>
                <dt>Lives</dt><dd>{sp.where}</dd>
                <dt>Family life</dt><dd>{sp.social}</dd>
                <dt>Eats</dt><dd>{sp.food}</dd>
                <dt>Lifespan</dt><dd>{sp.life}</dd>
                <dt>Role in nature</dt><dd>{sp.role}</dd>
              </dl>
            </article>
          );
        })}
      </div>
      <p className="small">In this model a day is short: animals live weeks, not years, so you can watch many generations.</p>
    </section>
  );
}
