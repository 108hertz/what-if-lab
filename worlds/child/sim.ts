import type { BaseWorld, InfoBlock, Params, Sandbox } from "@/lib/sim/types";
import { TAU, fmtNum, gauss, mix, note, num, rng } from "@/lib/sim/core";
import { FONT, blob, STAGE } from "@/lib/sim/draw";
import { meta } from "./meta";
import { HOME, KID_EVENTS, MATURATION, SIBLINGS, STYLE, TRAITS, TRAIT_NAME, TRAIT_WORDS, level, type Trait, type TraitDelta } from "./data";

/**
 * 120 possible children of the same parents. Each child:
 *   trait = 50 + 0.45·(midparent − 50) + individual noise (σ 9)       ← ~40% heritability
 *         + environment (parenting, siblings, home) weighted by age
 *         + maturation curve + random-walk life drift + life events.
 */
type P = Params & { style: string; sib: string; home: string };

interface Kid { g: number[]; z: number[]; r: number[]; j: number }
interface Intervention { age: number; d: TraitDelta; pf: number }
interface W extends BaseWorld { k: Kid[]; iv: Intervention[] }

function envDelta(p: P, k: Trait) {
  return (STYLE[p.style]?.[k] ?? 0) + (SIBLINGS[p.sib]?.[k] ?? 0) + (HOME[p.home]?.[k] ?? 0);
}

export function kidValue(w: W, kid: Kid, i: number, p: P, a: number): number {
  const k = TRAITS[i];
  const we = a < 18 ? Math.min(1, (a - 1) / 6) : Math.max(0.35, 1 - (a - 18) / 15);
  let v = kid.g[i] + we * envDelta(p, k) + MATURATION[k](a) + kid.z[i];
  for (const iv of w.iv) {
    if (a < iv.age) continue;
    const ramp = Math.min(1, (a - iv.age) / 1.5), fade = iv.pf + (1 - iv.pf) * Math.exp(-(a - iv.age) / 8);
    v += (iv.d[k] ?? 0) * kid.r[i] * ramp * fade * (a < 18 ? 1 : Math.max(0.5, we));
  }
  return Math.max(1, Math.min(99, v));
}

const traitControls = (pre: string, v: number[]) =>
  TRAITS.map((k, i) => ({ type: "range" as const, id: pre + k, label: TRAIT_NAME[k], min: 0, max: 100, step: 1, val: v[i] }));

export const child: Sandbox<W, P> = {
  ...meta,
  intro: "The same two parents, 120 possible children. Each dot is one of them; the spread shows how much chance matters.",
  controls: [
    { type: "heading", label: "Parent A" }, ...traitControls("a", [70, 55, 40, 65, 45]),
    { type: "heading", label: "Parent B" }, ...traitControls("b", [50, 75, 65, 50, 35]),
    { type: "heading", label: "Home" },
    { type: "select", id: "style", label: "Parenting style", options: [["authoritative", "Warm and firm"], ["authoritarian", "Strict, little warmth"], ["permissive", "Warm, few rules"], ["neglectful", "Distant, few rules"]], val: "authoritarian" },
    { type: "select", id: "sib", label: "Siblings", options: [["0", "None"], ["1", "One"], ["2", "Two or more"]], val: "0" },
    { type: "select", id: "home", label: "Home life", options: [["stable", "Stable"], ["unstable", "Unstable, frequent conflict"]], val: "stable" },
  ],
  whatifs: [
    ["authoritative", "Parents switch to warm and firm"], ["sibling", "A younger sibling arrives"], ["sport", "Joins a team sport"],
    ["screen", "Heavy screen time starts"], ["divorce", "Parents separate"], ["move", "Family moves abroad"],
    ["mentor", "Finds a strong mentor"], ["bullied", "Bullied at school"],
  ],
  speeds: [[0.5, "½ yr/s"], [1, "1 yr/s"], [2, "2 yr/s"], [5, "5 yr/s"]],
  defaultSpeed: 1,
  maxT: 60,
  fmtT: (t) => "Age " + Math.floor(t),
  metrics: TRAITS.map((k) => ({ k, label: TRAIT_NAME[k], unit: "/100", fmt: (v: number | null) => fmtNum(v) })),

  init(p, seed) {
    const w: W = { t: 2, rs: seed, log: [], f: {}, k: [], iv: [] };
    for (let i = 0; i < 120; i++) {
      const g: number[] = [], z: number[] = [], r: number[] = [];
      for (const k of TRAITS) {
        g.push(50 + 0.45 * ((num(p, "a" + k) + num(p, "b" + k)) / 2 - 50) + gauss(w) * 9);
        z.push(0);
        r.push(0.5 + rng(w));
      }
      w.k.push({ g, z, r, j: rng(w) });
    }
    return w;
  },

  step(w, dt) {
    const n = Math.ceil(dt / 0.1), h = dt / n;
    for (let s = 0; s < n && w.t < 60; s++) {
      for (const kid of w.k) for (let i = 0; i < 5; i++) kid.z[i] += gauss(w) * 1.4 * Math.sqrt(h) * (w.t < 25 ? 1 : 0.5) - kid.z[i] * 0.02 * h;
      w.t += h;
      if (w.t >= 3) note(w, "Temperament shows: some bold, some cautious", "m3");
      if (w.t >= 13) note(w, "Adolescence: moods swing, self-discipline dips for a while", "m13");
      if (w.t >= 25) note(w, "Personality largely settled; slow change continues for life", "m25");
    }
  },

  apply(w, id, p) {
    if (id === "authoritative") {
      const d: TraitDelta = {};
      for (const k of TRAITS) d[k] = (STYLE.authoritative[k] ?? 0) - (STYLE[p.style]?.[k] ?? 0);
      w.iv.push({ age: w.t, d, pf: 1 });
      note(w, p.style === "authoritative" ? "Parenting was already warm and firm" : "Parents switch to warm and firm: clear rules, lots of warmth");
    } else {
      const ev = KID_EVENTS[id];
      w.iv.push({ age: w.t, d: ev.d, pf: ev.pf });
      note(w, ev.txt);
    }
  },

  read(w, p) {
    const r: Record<string, number> = {};
    TRAITS.forEach((k, i) => { r[k] = w.k.reduce((s, kid) => s + kidValue(w, kid, i, p, w.t), 0) / w.k.length; });
    return r;
  },

  info(base, alt, p): InfoBlock[] {
    const describe = (w: W) => {
      const r = child.read(w, p);
      return TRAITS.map((k) => ({ label: TRAIT_NAME[k], text: TRAIT_WORDS[k][level(r[k] ?? 50)] }));
    };
    const blocks: InfoBlock[] = [{ heading: `Most likely child at ${Math.floor(base.t)}`, rows: describe(base) }];
    if (alt) blocks.push({ heading: "With the what-if", accent: true, rows: describe(alt) });
    return blocks;
  },

  draw({ ctx, w: W, h: H, p, isAlt }, w) {
    ctx.fillStyle = STAGE.void; ctx.fillRect(0, 0, W, H);
    const top = 86, col = isAlt ? STAGE.alt : "#A9B1D6";
    const parentColor = (pre: string) => mix("#7AA6FF", "#FF9D7A", num(p, pre + "E") / 100);
    ctx.font = "11px " + FONT.body; ctx.textAlign = "center"; ctx.fillStyle = STAGE.ink2;
    blob(ctx, W * 0.16, 44, 17, parentColor("a"), 0.4, 0);
    blob(ctx, W * 0.36, 44, 17, parentColor("b"), -0.4, 0);
    ctx.fillStyle = STAGE.ink2;
    ctx.fillText("Parent A", W * 0.16, 76); ctx.fillText("Parent B", W * 0.36, 76);
    ctx.font = "18px " + FONT.display; ctx.fillText("+", W * 0.26, 50); ctx.fillText("=", W * 0.47, 50);
    const r = child.read(w, p), cr = 6 + Math.min(w.t, 18) * 0.75;
    blob(ctx, W * 0.6, 44 + 17 - cr, cr, mix("#7AA6FF", "#FF9D7A", (r.E ?? 50) / 100), 0, 0, 100 - (r.N ?? 50));
    ctx.font = "11px " + FONT.body; ctx.fillStyle = STAGE.ink2;
    ctx.fillText("Typical child, age " + Math.floor(w.t), W * 0.6, 76);
    ctx.textAlign = "left";
    const sh = (H - top - 12) / 5, x0 = Math.max(92, W * 0.2), x1 = W - 16;
    TRAITS.forEach((k, i) => {
      const yc = top + sh * i + sh / 2;
      ctx.fillStyle = STAGE.ink2; ctx.font = (W < 420 ? "10px " : "11.5px ") + FONT.body; ctx.fillText(TRAIT_NAME[k], 10, yc + 4);
      ctx.strokeStyle = "#253056"; ctx.beginPath(); ctx.moveTo(x0, yc); ctx.lineTo(x1, yc); ctx.stroke();
      ctx.fillStyle = col; ctx.globalAlpha = 0.65;
      for (const kid of w.k) {
        const v = kidValue(w, kid, i, p, w.t);
        ctx.beginPath(); ctx.arc(x0 + ((x1 - x0) * v) / 100, yc + (kid.j - 0.5) * sh * 0.6, 2.5, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
      const mx = x0 + ((x1 - x0) * (r[k] ?? 50)) / 100;
      ctx.strokeStyle = STAGE.ink; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(mx, yc - sh * 0.38); ctx.lineTo(mx, yc + sh * 0.38); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = STAGE.ink; ctx.font = "10.5px " + FONT.mono; ctx.fillText(String(Math.round(r[k] ?? 0)), mx + 4, yc - sh * 0.28);
    });
    ctx.fillStyle = STAGE.muted; ctx.font = "10px " + FONT.mono;
    ctx.fillText("low", x0, H - 4); ctx.textAlign = "right"; ctx.fillText("high", x1, H - 4); ctx.textAlign = "left";
  },
};
