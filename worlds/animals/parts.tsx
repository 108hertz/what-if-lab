"use client";

import { useEffect, useRef, useState } from "react";
import type { SimEngine } from "@/lib/sim/engine";
import { fmtNum } from "@/lib/sim/core";
import { eventText } from "@/lib/sim/say";
import { Icon, type IconName } from "@/components/ui/Icon";
import ChangeToggles from "@/components/console/Changes";
import { HAB_T, MAX_CAST, READY_GROUPS, SPECIES, SPECIES_GROUPS, castString, startMax, type Habitat } from "./data";
import { castOf, caption, counts, newcomerOf, question, story, targetOf, traits, worldName, WHATIF_GROUPS, type P as Params, type W } from "./sim";
import { drawAnimal, reducedMotion, type Traits } from "./scene";
import s from "./animals.module.css";
import { worldSay } from "@/lib/sim/say";
import { ref as mref } from "@/lib/i18n/t";
import { useT } from "@/components/i18n/I18nProvider";
import { animalWords } from "./messages";

/** This world's words in the page's language (change 0025). */
const say = () => worldSay(animalWords);
const name = (id: string) => say()(`sp.${id}.name`);
const many = (id: string) => mref(`sp.${id}.many`);

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
  const pick = (x: string) => { engine.rebuild(engine.setParam("world", x).keys); onChange(); };
  return (
    <label className="ctl" htmlFor="animals-world">
      <span className="ctl-head">{say()("ui.pickWorld")}</span>
      <span className="select">
        <select id="animals-world" value={v} onChange={(e) => pick(e.target.value)}>
          {v === "custom" && <option value="custom">{worldName(p)}</option>}
          {READY_GROUPS.map(([g, opts], i) => (
            <optgroup key={g} label={say()(`worldGroup.${i}`)}>{opts.map(([id]) => <option key={id} value={id}>{say()(`worldOpt.${id}`)}</option>)}</optgroup>
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
  const set = (c: [string, number][]) => { engine.rebuild(engine.setParam("cast", castString(c)).keys); onChange(); };
  const bump = (i: number, d: number) => set(cast.map(([id, k], j) => [id, j === i ? Math.max(0, Math.min(startMax(id), k + d)) : k]));
  const remove = (id: string) => {
    if (reducedMotion()) return set(cast.filter(([x]) => x !== id));
    setLeaving(id);
    setTimeout(() => { setLeaving(null); set(castOf(params(engine)).filter(([x]) => x !== id)); }, 150);
  };
  const add = (id: string) => { setOpen(false); set([...cast, [id, SPECIES[id].meta ? 6 : 40]]); addRef.current?.focus(); };
  const full = cast.length >= MAX_CAST, S = say();
  return (
    <section>
      <h3 className="headline">{S("ui.who")}</h3>
      <div className={s.cast}>
        {cast.map(([id, k], i) => {
          const sp = SPECIES[id], step = sp.meta ? 1 : 5;
          return (
            <div key={id} className={`${s.row} ${leaving === id ? s.leaving : ""}`}>
              <AnimalIcon id={id} size={28} />
              <span className={s.who}>{name(id)}{far(id, hab) && <span className={s.far}>{S("ui.far")}</span>}</span>
              <span className={s.step} role="group" aria-label={S("ui.atStart", { many: many(id) })}>
                <button className={s.ib} aria-label={S("ui.fewer", { many: many(id) })} disabled={k <= 0} onClick={() => bump(i, -step)}><Icon name="minus" size={18} /></button>
                <output aria-live="polite">{k}</output>
                <button className={s.ib} aria-label={S("ui.more", { many: many(id) })} disabled={k >= startMax(id)} onClick={() => bump(i, step)}><Icon name="plus" size={18} /></button>
              </span>
              <button className={s.ib} aria-label={S("ui.takeOut", { many: many(id) })} title={cast.length <= 1 ? S("ui.needOne") : S("ui.takeOutShort", { many: many(id) })} disabled={cast.length <= 1} onClick={() => remove(id)}><Icon name="close" size={18} /></button>
            </div>
          );
        })}
        <button ref={addRef} className={s.add} aria-expanded={open} aria-controls="animals-add" disabled={full} onClick={() => setOpen(!open)}>
          <Icon name="plus" size={18} />{full ? S("ui.fiveMost") : S("ui.addAnimal")}{!full && <span className={s.chev}><Icon name="chevron" size={16} /></span>}
        </button>
        {open && !full && (
          <div className={s.pick} id="animals-add" onKeyDown={(e) => { if (e.key === "Escape") { setOpen(false); addRef.current?.focus(); } }}>
            {SPECIES_GROUPS.map(([g, ids], gi) => {
              const rest = ids.filter((id) => !cast.some(([x]) => x === id));
              if (!rest.length) return null;
              return (
                <div key={g} className={s.pickGroup}>
                  <span className="ctl-head">{S(`spGroup.${gi}`)}</span>
                  {rest.map((id) => (
                    <button key={id} className={s.pickItem} onClick={() => add(id)}>
                      <AnimalIcon id={id} size={28} />
                      <span>{name(id)}{far(id, hab) && <span className={s.far}>{S("ui.far")}</span>}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="small">{S("ui.restart")}</p>
    </section>
  );
}

/* ───────────── Make changes ───────────── */

export function ChangeList({ engine, onChange }: P) {
  const p = params(engine), w = shown(engine);
  const count = (id: string) => engine.applied.filter((x) => x === id).length;
  const target = targetOf(w, p), newcomer = newcomerOf(w, p);
  const set = (k: string, v: string) => { engine.setParam(k, v); onChange(); };
  const t = useT(), S = say();
  return (
    <section className={s.changes}>
      <ChangeToggles engine={engine} onChange={onChange} label={(e) => question(e.rec.id, w, e.rec.params as Params)} />
      <h3 className="headline">{t("console.whatifs.title")}</h3>
      <p className="small hint-line">{S("ui.changesHint")}</p>
      <div className={s.target}>
        <label className="ctl" htmlFor="animals-target">
          <span className="ctl-l">{S("ui.target")}</span>
          <span className="select">
            <select id="animals-target" value={target} onChange={(e) => set("target", e.target.value)}>
              {w.cast.map((id) => <option key={id} value={id}>{name(id)}</option>)}
            </select>
            <Icon name="chevron" size={18} />
          </span>
        </label>
        <label className="ctl" htmlFor="animals-newcomer">
          <span className="ctl-l">{S("ui.newcomer")}</span>
          <span className="select">
            <select id="animals-newcomer" value={newcomer} onChange={(e) => set("newcomer", e.target.value)}>
              {SPECIES_GROUPS.map(([g, ids], gi) => <optgroup key={g} label={S(`spGroup.${gi}`)}>{ids.map((id) => <option key={id} value={id}>{w.cast.includes(id) ? S("ui.livesHere", { name: name(id) }) : name(id)}</option>)}</optgroup>)}
            </select>
            <Icon name="chevron" size={18} />
          </span>
        </label>
      </div>
      {WHATIF_GROUPS.map(([g, ids], gi) => (
        <div key={g} className="forks">
          <span className="ctl-head">{S(`group.${gi}`)}</span>
          {ids.map((id) => {
            const n = count(id);
            return (
              <button key={id} className="fork" aria-pressed={n > 0} onClick={() => { engine.change(id); onChange(); }}>
                <Icon name="fork" />
                {question(id, w, p)}
                {n > 1 && <span key={n} className={`count ${s.pop}`} aria-label={t("console.whatifs.applied", { n })}>×{n}</span>}
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
      <h3 className="headline">{say()(engine.alt ? "ui.whatChanged" : "ui.happening")}</h3>
      {lines.map((l, i) => <p key={i}>{l}</p>)}
    </section>
  );
}

/* ───────────── Right now ───────────── */

function trend(engine: SimEngine, i: number, now: number): [IconName, string, string] {
  if (now === 0) return ["close", "trend.gone", ""];
  const h = engine.history, arr = (engine.alt ? h.alt : h.base)[`n${i}`] ?? [];
  const back = arr.length > 10 ? arr[arr.length - 11] : arr[0];
  const d = back == null ? 0 : now - back, big = Math.max(2, (back ?? now) * 0.08);
  return d > big ? ["arrow", "trend.rising", s.up] : d < -big ? ["arrow", "trend.falling", s.down] : ["minus", "trend.steady", ""];
}

export function RightNow({ engine }: { engine: SimEngine }) {
  const w = shown(engine), n = counts(w), nb = engine.alt ? counts(engine.base as W) : null, S = say();
  return (
    <section className={s.now}>
      <h3 className="headline">{S("ui.rightNow")}</h3>
      {w.cast.map((id, i) => {
        const [ic, word, cls] = trend(engine, i, n[i]);
        return (
          <div key={id} className={s.nowRow}>
            <AnimalIcon id={id} size={28} />
            <span className={s.nowName}>{S(`sp.${id}.pl`)}</span>
            <span className={s.nowVal}>
              <span><Count v={n[i]} />{nb && <span className={s.nc}> {S("ui.noChange", { v: i < nb.length ? fmtNum(nb[i]) : S("ui.none") })}</span>}</span>
              <span key={word} className={s.trend}><span className={cls}><Icon name={ic} size={12} /></span>{S(word)}</span>
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
  const t = traits(w, i), S = say();
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
      c.fillText(txt.toLocaleUpperCase(), x, H - 4);
    };
    draw(W * 0.27, { sp: 1, sz: 1, se: 1, co: 1 }, engine.sb.fmtT(0));
    draw(W * 0.73, t, t ? engine.sb.fmtT(w.t) : say()("ui.noneLeft"));
  }, [id, key, sp, t, w.t, engine.sb]);
  return (
    <section className={s.portrait}>
      <h3 className="headline">{S("ui.thenNow")}</h3>
      {w.cast.length > 1 && (
        <div className={`mtabs ${s.tabs}`} role="group" aria-label={S("chart.whichAnimal")}>
          {w.cast.map((x, j) => <button key={x} aria-pressed={j === i} onClick={() => setFocus(j)}>{S(`sp.${x}.pl`)}</button>)}
        </div>
      )}
      <canvas ref={ref} className={s.pcanvas} role="img" aria-label={S("ui.portrait", { one: mref(`sp.${id}.one`), caption: caption(id, t) })} />
      <p className={s.caption}>{caption(id, t)}</p>
    </section>
  );
}

/* ───────────── Timeline with event glyphs ───────────── */

/** The glyph for an event, by its key (change 0025: keys, not words, so it works in every language). */
function glyph(k: string): IconName {
  if (/^ev\.(out|removed|noneToRemove|noRoom|disease)$/.test(k)) return "minus";
  if (/^ev\.(wanders|add|invasive)$/.test(k)) return "arrow";
  if (k === "ev.boom") return "plus";
  if (/^ev\.(faster|slower|bigger|smaller|thinner|thicker|senses)$/.test(k)) return "expand";
  if (/^ev\.(warm|cool|drought|rain|fire|habitat|reserve|hunt|move)$/.test(k)) return "sun";
  return "fork";
}

export function AnimalTimeline({ engine }: { engine: SimEngine }) {
  const items = engine.timeline(), t = useT();
  const who = { both: engine.alt ? t("console.world.both") : "", base: t("console.world.onlyBase"), alt: t("console.world.onlyAlt") };
  if (!items.length) return <ul className={s.tl}><li><p className="empty">{t("console.timeline.empty")}</p></li></ul>;
  return (
    <ul className={s.tl}>
      {items.map((e, i) => (
        <li key={i} className={s[e.who]}>
          <time>{engine.sb.fmtT(e.t)}</time>
          <span className={s.glyph}><Icon name={glyph(e.k)} size={18} /></span>
          <span>{eventText(engine.sb, e)}{who[e.who] && <span className={s.whoLine}>{who[e.who]}</span>}</span>
        </li>
      ))}
    </ul>
  );
}

/* ───────────── Fact cards ───────────── */

export function Facts({ engine }: { engine: SimEngine }) {
  const w = shown(engine), hab = w.habit, S = say();
  return (
    <section>
      <h3 className="headline">{S("facts.title")}</h3>
      <div className={s.facts}>
        {w.cast.map((id) => {
          const sp = SPECIES[id];
          return (
            <article key={id} className={s.fact}>
              <AnimalIcon id={id} size={40} />
              <div>
                <h4>{S(`sp.${id}.name`)}</h4>
                <span className={s.latin}>{sp.latin}</span>
                {far(id, hab) && <span className="micro"> · {S("ui.farHere")}</span>}
              </div>
              <dl>
                <dt>{S("facts.lives")}</dt><dd>{S(`sp.${id}.where`)}</dd>
                <dt>{S("facts.family")}</dt><dd>{S(`sp.${id}.social`)}</dd>
                <dt>{S("facts.eats")}</dt><dd>{S(`sp.${id}.food`)}</dd>
                <dt>{S("facts.lifespan")}</dt><dd>{S(`sp.${id}.life`)}</dd>
                <dt>{S("facts.role")}</dt><dd>{S(`sp.${id}.role`)}</dd>
              </dl>
            </article>
          );
        })}
      </div>
      <p className="small">{S("facts.note")}</p>
    </section>
  );
}
