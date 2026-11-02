import type { BaseWorld, Sandbox } from "../types";
import { TAU, clamp, fmtNum, gauss, note, rng } from "../core";
import { FONT, blob, STAGE } from "../draw";
import { SPECIES, type Species } from "../data/species";

/**
 * Primer-style agent model. Plant-eaters (k=0) eat food pellets; meat-eaters (k=1) hunt smaller
 * plant-eaters. Energy cost ∝ size³·speed² + senses; offspring inherit mutated traits.
 * Stabilisers: cover patches (prey are safe inside), predator territory limit, recolonisation.
 */
type P = { species: string; food: number; herb: number; carn: number; hab: number; dT: number; human: number };

interface Creature { k: number; x: number; y: number; a: number; e: number; sp: number; sz: number; se: number; age: number; rv: number; d?: number }
interface W extends BaseWorld { c: Creature[]; food: number[]; hab: number; foodMul: number; mod: string | null; noHuman: number; gone: number[] }

export const ARENA_RATIO = 0.6;
const AR = ARENA_RATIO;
export const COVER: [number, number][] = [[0.12, 0.12], [0.45, 0.08], [0.8, 0.15], [0.25, 0.48], [0.6, 0.4], [0.9, 0.5]];
const inCover = (o: Creature) => COVER.some(([x, y]) => (o.x - x) ** 2 + (o.y - y) ** 2 < 0.0016);

function creature(w: W, k: number, sp: number, sz: number, se: number, x?: number, y?: number, rv = 0): Creature {
  return { k, x: x ?? rng(w) * w.hab, y: y ?? rng(w) * AR, a: rng(w) * TAU, e: k ? 1.8 : 1.2, sp, sz, se, age: rng(w) * 10, rv };
}

function tick(w: W, h: number, p: P, sp: Species, clim: number) {
  const fk = sp.kind, hab = w.hab, GX = 12, GY = 8;
  // food growth
  let ex = (60 * p.food) / 100 * w.foodMul * hab * h;
  while (ex > 0) { if (rng(w) < ex && w.food.length < 700) w.food.push(rng(w) * hab, rng(w) * AR); ex -= 1; }
  // spatial buckets
  const cid = (x: number, y: number) => clamp((x * GX) | 0, 0, GX - 1) + clamp(((y / AR) * GY) | 0, 0, GY - 1) * GX;
  const fb: number[][] = [], cb: number[][] = [];
  for (let i = 0; i < GX * GY; i++) { fb.push([]); cb.push([]); }
  for (let i = 0; i < w.food.length; i += 2) fb[cid(w.food[i], w.food[i + 1])].push(i);
  const C = w.c;
  for (let i = 0; i < C.length; i++) cb[cid(C[i].x, C[i].y)].push(i);
  const eaten = new Set<number>(), born: Creature[] = [];
  let nh = 0, nc = 0;
  for (const c of C) c.k ? nc++ : nh++;

  for (let i = 0; i < C.length; i++) {
    const c = C[i];
    if (c.d) continue;
    const r = 0.07 * c.se, r2 = r * r, gx = (c.x * GX) | 0, gy = ((c.y / AR) * GY) | 0, rc = Math.ceil(r * GX);
    let best = -1, bd = r2, flee: Creature | null = null, fd = r2;
    for (let y = gy - rc; y <= gy + rc; y++) {
      if (y < 0 || y >= GY) continue;
      for (let x = gx - rc; x <= gx + rc; x++) {
        if (x < 0 || x >= GX) continue;
        const cell = x + y * GX;
        for (const j of cb[cell]) {
          if (j === i) continue;
          const o = C[j];
          if (o.d) continue;
          const dx = o.x - c.x, dy = o.y - c.y, d2 = dx * dx + dy * dy;
          if (d2 >= r2) continue;
          if (c.k === 0 && o.k === 1 && o.sz > 1.15 * c.sz && d2 < fd * 0.12) { fd = d2; flee = o; }
          if (c.k === 1 && o.k === 0 && c.e < 2.6 && c.sz > 1.15 * o.sz && d2 < bd && !inCover(o)) { bd = d2; best = j; }
        }
        if (c.k === 0)
          for (const fi of fb[cell]) {
            if (eaten.has(fi)) continue;
            const dx = w.food[fi] - c.x, dy = w.food[fi + 1] - c.y, d2 = dx * dx + dy * dy;
            if (d2 < bd) { bd = d2; best = fi; }
          }
      }
    }
    if (flee) c.a = Math.atan2(c.y - flee.y, c.x - flee.x);
    else if (best >= 0) {
      const ox = c.k ? C[best].x : w.food[best], oy = c.k ? C[best].y : w.food[best + 1];
      c.a = Math.atan2(oy - c.y, ox - c.x);
      if (Math.sqrt(bd) < (c.k ? 0.018 : 0.012) + c.sz * 0.004) {
        if (c.k) { if (rng(w) < (0.3 * h) / 0.05) { C[best].d = 1; c.e += 1.1; } }
        else { eaten.add(best); c.e += 0.6; }
      }
    } else c.a += gauss(w) * 1.2 * Math.sqrt(h);

    const v = (c.k ? 0.19 : 0.11) * c.sp;
    c.x += Math.cos(c.a) * v * h; c.y += Math.sin(c.a) * v * h;
    if (c.x < 0) { c.x = 0; c.a = Math.PI - c.a; }
    if (c.x > hab) { c.x = hab; c.a = Math.PI - c.a; }
    if (c.y < 0) { c.y = 0; c.a = -c.a; }
    if (c.y > AR) { c.y = AR; c.a = -c.a; }

    const climate = c.k === fk && !c.rv ? clim : 1 + (clim - 1) * 0.3;
    c.e -= h * (0.1 + 0.35 * c.sz ** 3 * c.sp ** 2 + 0.12 * c.se + 0.12 * c.sp) * climate * (c.k ? 0.22 : 1);
    c.age += h;
    if (c.e <= 0 || c.age > (c.k ? 80 : 50)) { c.d = 1; continue; }
    if (c.k === fk && !c.rv && !w.noHuman && rng(w) < (p.human / 100) * 0.02 * h) { c.d = 1; continue; }
    if (c.e > (c.k ? 3.4 : 2.4) && (c.k ? nc < Math.min(120, nh / 4) : nh < 450)) {
      c.e /= 2;
      const mu = (x: number) => x * Math.exp(gauss(w) * 0.07);
      born.push({ k: c.k, x: c.x, y: c.y, a: rng(w) * TAU, e: c.e, sp: clamp(mu(c.sp), 0.3, 2.2), sz: clamp(mu(c.sz), 0.55, 3), se: clamp(mu(c.se), 0.3, 3), age: 0, rv: c.rv });
      c.k ? nc++ : nh++;
    }
  }
  if (eaten.size) {
    const f: number[] = [];
    for (let i = 0; i < w.food.length; i += 2) if (!eaten.has(i)) f.push(w.food[i], w.food[i + 1]);
    w.food = f;
  }
  w.c = C.filter((c) => !c.d).concat(born);
  w.t += h;
  // recolonisation from outside the arena
  for (const k of [0, 1]) {
    if (w.gone.includes(k)) continue;
    if ((k ? p.carn : p.herb) > 0 && !w.c.some((c) => c.k === k && !c.rv) && rng(w) < 0.03 * h) {
      for (let q = 0; q < 2; q++) w.c.push(creature(w, k, 1, k ? 1.3 : 1, 1, k ? w.hab * 0.98 : 0.02));
      w.log.push({ t: w.t, txt: `A pair of ${(k === fk ? sp.pl : sp.other.pl).toLowerCase()} wanders in from outside` });
    }
  }
}

export const animals: Sandbox<W, P> = {
  key: "animals",
  name: "Animals",
  sub: "Evolution",
  intro: "Each blob has its own speed, size and senses. They eat, flee, hunt, and pass slightly mutated traits to their young.",
  controls: [
    { type: "select", id: "species", label: "Species", options: Object.entries(SPECIES).map(([k, s]) => [k, s.name]), val: "wolf" },
    { type: "range", id: "food", label: "Food growth", min: 20, max: 200, step: 5, val: 100, unit: "%" },
    { type: "range", id: "herb", label: "Plant-eaters at start", min: 5, max: 150, step: 5, val: 60 },
    { type: "range", id: "carn", label: "Meat-eaters at start", min: 0, max: 30, step: 1, val: 8 },
    { type: "range", id: "hab", label: "Habitat intact", min: 20, max: 100, step: 5, val: 100, unit: "%" },
    { type: "range", id: "dT", label: "Temperature change", min: -4, max: 6, step: 0.5, val: 0, unit: "°C" },
    { type: "range", id: "human", label: "Human hunting", min: 0, max: 100, step: 5, val: 10, unit: "%" },
  ],
  whatifs: [
    ["removePred", "Remove the predators"], ["addPred", "Introduce a new predator"], ["warm", "Climate warms 3 °C"],
    ["habitat", "Lose half the habitat"], ["protect", "Create a protected reserve"], ["disease", "Disease kills 40%"],
    ["relocate", "Move them to the opposite climate"],
  ],
  speeds: [[2, "2 days/s"], [6, "6 days/s"], [15, "15 days/s"], [30, "30 days/s"]],
  defaultSpeed: 1,
  fmtT: (t) => "Day " + Math.floor(t),
  metrics: [
    { k: "focal", label: "Your species", unit: "", fmt: (v) => fmtNum(v) },
    { k: "other", label: "Other species", unit: "", fmt: (v) => fmtNum(v) },
    { k: "speed", label: "Avg speed", unit: "×", fmt: (v) => fmtNum(v, 2) },
    { k: "size", label: "Avg size", unit: "×", fmt: (v) => fmtNum(v, 2) },
    { k: "food", label: "Food", unit: "", fmt: (v) => fmtNum(v) },
  ],

  init(p, seed) {
    const w: W = { t: 0, rs: seed, log: [], f: {}, c: [], food: [], hab: p.hab / 100, foodMul: 1, mod: null, noHuman: 0, gone: [] };
    for (let i = 0; i < p.herb; i++) w.c.push(creature(w, 0, 1, 1, 1));
    for (let i = 0; i < p.carn; i++) w.c.push(creature(w, 1, 1, 1.3, 1));
    for (let i = 0; i < 150; i++) w.food.push(rng(w) * w.hab, rng(w) * AR);
    return w;
  },

  step(w, dt, p) {
    const sp = SPECIES[p.species], n = Math.ceil(dt / 0.05), h = dt / n, fk = sp.kind;
    const dT = p.dT + (w.mod === "warm" ? 3 : 0) + (w.mod === "relocate" ? (sp.climate === "hot" ? -9 : 9) : 0);
    const clim = 1 + (dT / (sp.tol * 1.5)) ** 2;
    for (let s = 0; s < n; s++) tick(w, h, p, sp, clim);
    const r = animals.read(w, p);
    if (r.focal === 0) note(w, `${sp.pl} die out here`, "fx");
    if (r.other === 0 && w.c.length) note(w, `${sp.other.pl} die out here`, "ox");
    if ((r.speed ?? 1) > 1.2) note(w, `Natural selection: the average ${sp.name.toLowerCase()} is now 20% faster`, "spd");
    if ((r.speed ?? 1) < 0.8) note(w, `Natural selection: ${sp.pl.toLowerCase()} get slower to save energy`, "slw");
    if ((r.size ?? 1) > 1.2 && fk === 0) note(w, `${sp.pl} grow 20% bigger on average`, "big");
    if ((r.size ?? 1) < 0.82 && fk === 0) note(w, `${sp.pl} shrink on average`, "sml");
  },

  apply(w, id, p) {
    const sp = SPECIES[p.species], fk = sp.kind;
    w.mod = id;
    if (id === "removePred") {
      if (fk === 1) { w.noHuman = 1; note(w, `Hunting stops: nobody culls the ${sp.pl.toLowerCase()} any more`); }
      else { w.c = w.c.filter((c) => c.k !== 1); w.gone = [1]; note(w, `All ${sp.other.pl.toLowerCase()} removed`); }
    }
    if (id === "addPred") {
      for (let i = 0; i < 8; i++) w.c.push(creature(w, 1, 1.05, 1.35, 1.1, undefined, undefined, fk === 1 ? 1 : 0));
      note(w, fk === 1 ? "A rival predator moves in" : `Eight extra ${sp.other.pl.toLowerCase()} arrive`);
    }
    if (id === "warm") { w.foodMul *= 0.8; note(w, "Climate warms 3 °C: more energy needed, less food"); }
    if (id === "habitat") {
      w.hab *= 0.5;
      for (const c of w.c) c.x = Math.min(c.x, w.hab);
      const f: number[] = [];
      for (let i = 0; i < w.food.length; i += 2) if (w.food[i] < w.hab) f.push(w.food[i], w.food[i + 1]);
      w.food = f;
      note(w, "Half the habitat is lost to farms and roads");
    }
    if (id === "protect") { w.noHuman = 1; w.foodMul *= 1.25; note(w, "Protected reserve: hunting stops, vegetation recovers"); }
    if (id === "disease") {
      let k = 0;
      for (const c of w.c) if (c.k === fk && !c.rv && rng(w) < 0.4) { c.d = 1; k++; }
      w.c = w.c.filter((c) => !c.d);
      note(w, `Disease outbreak kills ${k} ${sp.pl.toLowerCase()}`);
    }
    if (id === "relocate") note(w, "Moved to the opposite climate: everything costs far more energy");
  },

  read(w, p) {
    const fk = SPECIES[p.species].kind;
    const F = w.c.filter((c) => c.k === fk && !c.rv), O = w.c.filter((c) => c.k !== fk || c.rv);
    const avg = (k: "sp" | "sz") => (F.length ? F.reduce((s, c) => s + c[k], 0) / F.length : null);
    return { focal: F.length, other: O.length, speed: avg("sp"), size: avg("sz"), food: w.food.length / 2 };
  },

  info(_b, _a, p) {
    const sp = SPECIES[p.species];
    return [{
      rows: [
        { label: sp.kind ? "Meat-eater" : "Plant-eater", text: sp.name, color: sp.col },
        { label: sp.kind ? "Prey" : "Predator", text: sp.other.name, color: sp.other.col },
        { label: "Where", text: sp.where },
        { label: "Social order", text: sp.social },
        { label: "Diet", text: sp.diet },
        { label: "Lifespan", text: sp.life },
        { label: "Role in nature", text: sp.role },
      ],
    }];
  },

  draw({ ctx, w: W, h: H, p }, w) {
    const sp = SPECIES[p.species], fk = sp.kind, s = Math.min(W - 16, (H - 16) / AR), ox = (W - s) / 2, oy = (H - s * AR) / 2;
    ctx.fillStyle = "#0C1512"; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#14251D"; ctx.fillRect(ox, oy, s, s * AR);
    if (w.hab < 1) {
      ctx.fillStyle = "#262A2F"; ctx.fillRect(ox + w.hab * s, oy, s * (1 - w.hab), s * AR);
      ctx.save(); ctx.beginPath(); ctx.rect(ox + w.hab * s, oy, s * (1 - w.hab), s * AR); ctx.clip();
      ctx.strokeStyle = "rgba(255,255,255,.06)"; ctx.beginPath();
      for (let x = w.hab * s; x < s + s * AR; x += 10) { ctx.moveTo(ox + x, oy); ctx.lineTo(ox + x - s * AR, oy + s * AR); }
      ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = "#1E3A2B";
    for (const [x, y] of COVER) if (x < w.hab) { ctx.beginPath(); ctx.arc(ox + x * s, oy + y * s, 0.04 * s, 0, TAU); ctx.fill(); }
    ctx.fillStyle = "#86E08F";
    for (let i = 0; i < w.food.length; i += 2) ctx.fillRect(ox + w.food[i] * s - 1, oy + w.food[i + 1] * s - 1, 2.2, 2.2);
    const k = s / 700;
    for (const c of w.c) {
      const focal = c.k === fk && !c.rv, col = c.rv ? "#FF7A7A" : c.k === fk ? sp.col : sp.other.col;
      blob(ctx, ox + c.x * s, oy + c.y * s, clamp(4.2 * c.sz * k * (focal ? 1.1 : 1), 1.6, 14), col, Math.cos(c.a), Math.sin(c.a));
    }
    const r = animals.read(w, p);
    ctx.fillStyle = "rgba(16,9,4,.65)"; ctx.fillRect(10, H - 32, Math.min(W - 20, 280), 22);
    ctx.font = "12px " + FONT.mono;
    const a = `${sp.name}: ${r.focal}`;
    ctx.fillStyle = sp.col; ctx.fillText(a, 18, H - 17);
    ctx.fillStyle = sp.other.col; ctx.fillText(`${sp.other.name}: ${r.other}`, 18 + ctx.measureText(a + "   ").width, H - 17);
  },
};
