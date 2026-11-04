import { TAU, clamp, lerp } from "@/lib/sim/core";
import { FONT, STAGE, chip } from "@/lib/sim/draw";
import { HOUSES, PEAK, TIDE, houseBase } from "./town";

/**
 * The earth stage: Fjordvik, a fictional fjord town under snowy peaks (change 0014).
 *
 * Framework-free canvas drawing. Every number the model produces shows up in the picture: the sky warms
 * and hazes, the snow line climbs, the glacier shrinks, forests thin and brown, fields turn to straw, the
 * sea rises up the tide gauge and into the houses.
 *
 * Motion: ambient things (clouds, waves, boats, gulls, smoke) run on a renderer clock in seconds, so they
 * move the same at every sim speed. Model-driven values are eased per half so forks and restarts glide.
 * Neither is ever written to the world, so determinism and forks are untouched.
 */

/** What the scene needs from the model (plain numbers). */
export interface Look {
  temp: number; sea: number; co2: number; snowLine: number; forest: number; crops: number;
  /** Sunlight dimming 0–1 (volcano, aerosols) and volcanic ash 0–1. */
  dim: number; ash: number;
  front: number; wall: number; flood: number;
}

// ───────────────────────── helpers ─────────────────────────

/** Mix two #RRGGBB colours (t in 0..1) and return #RRGGBB, so results can be mixed again or given an alpha suffix. */
function mix(a: string, b: string, t: number): string {
  const k = clamp(t, 0, 1);
  let out = "#";
  for (let i = 1; i < 7; i += 2) {
    const v = Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - k) + parseInt(b.slice(i, i + 2), 16) * k);
    out += v.toString(16).padStart(2, "0");
  }
  return out;
}

const hash = (i: number, s = 0) => { const x = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return x - Math.floor(x); };
/** Smooth deterministic 1-D noise in [-1, 1] from a few hashed sine octaves. */
function noise(x: number, s: number): number {
  return 0.5 * Math.sin(x * 7.1 + hash(s, 1) * TAU) + 0.3 * Math.sin(x * 17.3 + hash(s, 2) * TAU) + 0.2 * Math.sin(x * 41.9 + hash(s, 3) * TAU);
}
type Key = [x: number, alt: number];
/** Altitude along a ridge: cosine-eased between keypoints plus fractal detail. */
function ridgeAlt(keys: Key[], x: number, rough: number, s: number): number {
  let i = 0;
  while (i < keys.length - 2 && x > keys[i + 1][0]) i++;
  const [x0, a0] = keys[i], [x1, a1] = keys[i + 1];
  const t = clamp((x - x0) / (x1 - x0), 0, 1), e = (1 - Math.cos(t * Math.PI)) / 2;
  return lerp(a0, a1, e) + rough * noise(x, s);
}

const MAIN: Key[] = [[-0.05, 500], [0.08, 1150], [0.16, 1500], [0.24, 2400], [0.33, 1750], [0.40, 1620], [0.50, 2060], [0.60, 1450], [0.70, 820], [0.82, 420], [1.05, 260]];
const FAR: Key[] = [[-0.05, 1350], [0.1, 1650], [0.2, 1350], [0.36, 2150], [0.46, 1700], [0.62, 1950], [0.74, 1550], [0.88, 1800], [1.05, 1400]];
const HILLS: Key[] = [[-0.05, 760], [0.1, 880], [0.22, 560], [0.34, 700], [0.47, 470], [0.6, 600], [0.72, 360], [0.84, 180], [1.05, 120]];
/** Peaks whose left (shaded) face gets a shadow: x position of the summit. */
const SHADED = [0.08, 0.24, 0.5, 0.36, 0.62];

const SUN = { x: 0.8, y: 0.17 };
const HOUSE_COLS = ["#B8863B", "#8C3A2C", "#E2D6C2", "#C99A3A", "#56697B", "#5D7356", "#A0522D", "#D9CDB8"];
const ROOF_COLS = ["#2E2622", "#4A2A22", "#3A3E44"];

// ───────────────────────── geometry cache (per stage size) ─────────────────────────

interface Geo {
  W: number; H: number;
  /** Today's sea surface (y), px per metre of sea, mountain base and summit y. */
  y0: number; mpx: number; baseY: number; topY: number;
  main: number[]; far: number[]; hills: number[]; // y per column
  step: number;
  trees: { x: number; y: number; s: number; r: number; b: number; d: number }[];
  houses: { x: number; i: number; col: string; roof: string; w: number; chimney: boolean; church: boolean }[];
  /** Town shoreline x (quay edge) and farm hill outline. */
  x0: number;
  gullies: { x: number; len: number; s: number }[];
  clouds: { x: number; y: number; w: number; v: number; s: number }[];
}
let geoCache: Geo | null = null;

function buildGeo(W: number, H: number): Geo {
  const y0 = H * 0.7, mpx = H * 0.022, baseY = y0 - H * 0.02, topY = H * 0.1;
  const yAlt = (a: number) => baseY - (a / PEAK) * (baseY - topY);
  const step = Math.max(2, W / 220), cols = Math.ceil(W / step) + 1;
  const main: number[] = [], far: number[] = [], hills: number[] = [];
  for (let c = 0; c < cols; c++) {
    const xf = (c * step) / W;
    main.push(yAlt(ridgeAlt(MAIN, xf, 70, 1)));
    far.push(yAlt(ridgeAlt(FAR, xf, 60, 2)));
    hills.push(yAlt(ridgeAlt(HILLS, xf, 45, 3)));
  }
  const x0 = W * 0.6;
  // Conifers on the foothills, back (high) to front (low)
  const trees: Geo["trees"] = [];
  for (let i = 0; i < 260; i++) {
    const xf = hash(i, 11) * 0.98;
    if (xf * W > x0 - W * 0.02) continue;
    const top = ridgeAlt(HILLS, xf, 45, 3) - 40;
    const alt = hash(i, 12) * Math.max(0, top - 60);
    const d = 1 - alt / 900; // 0 far … 1 near
    trees.push({ x: xf * W, y: yAlt(alt), s: H * (0.016 + 0.022 * clamp(d, 0, 1)), r: hash(i, 13), b: hash(i, 14), d: clamp(d, 0, 1) });
  }
  trees.sort((a, b) => a.y - b.y);
  // Houses up the town slope, high (far) first so lower ones overlap them
  const hw = clamp(Math.min(W, H) * 0.034, 9, 30);
  const houses: Geo["houses"] = [];
  for (let i = 0; i < HOUSES; i++) {
    houses.push({
      x: x0 + W * 0.025 + (i / (HOUSES - 1)) * (W - x0 - W * 0.06) + (hash(i, 21) - 0.5) * hw * 0.6,
      i, col: HOUSE_COLS[Math.floor(hash(i, 22) * HOUSE_COLS.length)], roof: ROOF_COLS[Math.floor(hash(i, 23) * ROOF_COLS.length)],
      w: hw * (0.85 + hash(i, 24) * 0.4), chimney: hash(i, 25) < 0.3, church: i === 17,
    });
  }
  houses.reverse();
  const gullies: Geo["gullies"] = [];
  for (let i = 0; i < 28; i++) gullies.push({ x: hash(i, 31) * W * 0.72, len: H * (0.06 + hash(i, 32) * 0.2), s: i });
  const clouds: Geo["clouds"] = [];
  for (let i = 0; i < 7; i++) clouds.push({ x: hash(i, 41), y: H * (0.06 + hash(i, 42) * 0.22), w: W * (0.12 + hash(i, 43) * 0.16), v: 4 + hash(i, 44) * 8, s: i });
  return { W, H, y0, mpx, baseY, topY, main, far, hills, step, trees, houses, x0, gullies, clouds };
}
function geo(W: number, H: number): Geo {
  if (!geoCache || geoCache.W !== W || geoCache.H !== H) geoCache = buildGeo(W, H);
  return geoCache;
}

// ───────────────────────── clock, easing, buffers ─────────────────────────

let reduceQ: MediaQueryList | null = null;
function reducedMotion(): boolean {
  if (typeof matchMedia === "undefined") return false;
  reduceQ ??= matchMedia("(prefers-reduced-motion: reduce)");
  return reduceQ.matches;
}
let frozenAt = 0;
function clock(): number {
  const now = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
  if (reducedMotion()) return frozenAt;
  frozenAt = now;
  return now;
}

const eased: [Look | null, Look | null] = [null, null];
const lastT = [0, 0];
/** Glide each half's drawn values toward the model (250 ms time constant). */
function ease(half: number, target: Look, now: number): Look {
  const prev = eased[half];
  const dt = Math.min(0.1, Math.max(0, now - lastT[half]));
  lastT[half] = now;
  if (!prev || reducedMotion()) return (eased[half] = { ...target });
  const k = 1 - Math.exp(-dt / 0.25);
  const out = { ...prev };
  for (const key of Object.keys(target) as (keyof Look)[]) out[key] = prev[key] + (target[key] - prev[key]) * k;
  // Settle exactly, so a paused world draws the true values
  for (const key of Object.keys(target) as (keyof Look)[]) if (Math.abs(out[key] - target[key]) < 1e-4) out[key] = target[key];
  return (eased[half] = out);
}

type Canvas2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;
const backs: [{ c: OffscreenCanvas; x: OffscreenCanvasRenderingContext2D } | null, { c: OffscreenCanvas; x: OffscreenCanvasRenderingContext2D } | null] = [null, null];
function backBuffer(half: number, pw: number, ph: number) {
  let b = backs[half];
  if (!b || b.c.width !== pw || b.c.height !== ph) {
    const c = new OffscreenCanvas(pw, ph);
    b = backs[half] = { c, x: c.getContext("2d")! };
  }
  return b;
}

// ───────────────────────── drawing ─────────────────────────

function ridgePath(g: Geo, x: Canvas2D, ys: number[], bottom: number) {
  x.beginPath();
  x.moveTo(-2, bottom);
  for (let c = 0; c < ys.length; c++) x.lineTo(c * g.step, ys[c]);
  x.lineTo(g.W + 2, bottom);
  x.closePath();
}
const ridgeY = (g: Geo, ys: number[], px: number) => ys[clamp(Math.round(px / g.step), 0, ys.length - 1)];

function snowPath(g: Geo, x: Canvas2D, ySnow: number, s: number) {
  x.beginPath();
  x.moveTo(-2, -2);
  x.lineTo(g.W + 2, -2);
  for (let px = g.W + 2; px >= -2; px -= g.step * 2) x.lineTo(px, ySnow + g.H * 0.014 * noise(px / g.W * 3, s) + g.H * 0.01 * Math.abs(noise(px / g.W * 9, s + 5)));
  x.closePath();
}

/** Sky, sun, clouds, far range, mountains with snow and glacier, foothills and forest: everything the fjord reflects. */
function drawBack(x: Canvas2D, g: Geo, L: Look, t: number) {
  const { W, H } = g;
  const heat = clamp((L.temp - 1) / 4, 0, 1), grey = clamp(L.dim * 0.8 + L.ash * 0.6, 0, 1);
  const tone = (c: string, hot: string) => mix(mix(c, hot, heat), "#8E8C8A", grey * 0.7);
  // Sky
  const sky = x.createLinearGradient(0, 0, 0, g.y0);
  sky.addColorStop(0, tone("#21406B", "#4A3B4C"));
  sky.addColorStop(0.55, tone("#6F94B9", "#B48C70"));
  sky.addColorStop(1, tone("#EBCFA4", "#F2B271"));
  x.fillStyle = sky; x.fillRect(0, 0, W, H);
  // Sun and its halo, dimmed by aerosols and ash
  const sx = SUN.x * W, sy = SUN.y * H, sr = Math.min(W, H) * 0.045, sun = 1 - grey * 0.75;
  const halo = x.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 7);
  halo.addColorStop(0, `rgba(255,232,180,${0.55 * sun})`); halo.addColorStop(1, "rgba(255,232,180,0)");
  x.fillStyle = halo; x.fillRect(0, 0, W, H);
  x.fillStyle = `rgba(255,240,206,${0.95 * sun})`;
  x.beginPath(); x.arc(sx, sy, sr, 0, TAU); x.fill();
  // Clouds drift on the renderer clock
  for (const c of g.clouds) {
    const span = W + c.w * 2, cx = ((c.x * span + t * c.v) % span) - c.w;
    const col = tone("#F3E9DC", "#E8C6A4");
    for (let k = 0; k < 6; k++) {
      const ex = cx + (hash(c.s * 9 + k, 51) - 0.5) * c.w, ey = c.y + (hash(c.s * 9 + k, 52) - 0.5) * c.w * 0.12;
      const er = c.w * (0.18 + hash(c.s * 9 + k, 53) * 0.2);
      const gr = x.createRadialGradient(ex, ey, 0, ex, ey, er);
      gr.addColorStop(0, col + "70"); gr.addColorStop(1, col + "00");
      x.fillStyle = gr;
      x.beginPath(); x.ellipse(ex, ey, er, er * 0.42, 0, 0, TAU); x.fill();
    }
  }
  const yAlt = (a: number) => g.baseY - (a / PEAK) * (g.baseY - g.topY);
  const ySnow = yAlt(L.snowLine);
  const horizon = tone("#EBCFA4", "#F2B271");
  // Far range: hazy blue with its own snow
  ridgePath(g, x, g.far, g.y0 + 2);
  x.fillStyle = mix(tone("#4F6683", "#6E6170"), horizon, 0.28); x.fill();
  x.save(); ridgePath(g, x, g.far, g.y0 + 2); x.clip();
  snowPath(g, x, yAlt(L.snowLine + 250), 7);
  x.fillStyle = mix("#DDE5EE", horizon, 0.4) + "B0"; x.fill();
  x.restore();
  // Main mountains: rock, snow above the snow line, shaded west faces, couloirs
  ridgePath(g, x, g.main, g.y0 + 2);
  const rock = x.createLinearGradient(0, g.topY, 0, g.baseY);
  rock.addColorStop(0, tone("#5E6676", "#6A5A55")); rock.addColorStop(0.6, tone("#4D5664", "#5A4C45")); rock.addColorStop(1, mix(tone("#55605E", "#6A5E4C"), horizon, 0.25));
  x.fillStyle = rock; x.fill();
  x.save(); ridgePath(g, x, g.main, g.y0 + 2); x.clip();
  snowPath(g, x, ySnow, 9);
  const snow = x.createLinearGradient(0, g.topY, 0, ySnow);
  snow.addColorStop(0, "#F4F1EA"); snow.addColorStop(1, mix("#DCE5EE", horizon, 0.15));
  x.fillStyle = snow; x.fill();
  // Glacier in the col between the peaks: its tongue reaches 900 m below the snow line
  const term = clamp(L.snowLine - 380, 900, 1650);
  if (term < 1600) {
    // A tapered tongue fed by the snowfield, shaded on its west side, with a rounded snout
    const gx = 0.405 * W, top = yAlt(1700), bot = yAlt(term), gw = W * 0.017, mid = lerp(top, bot, 0.55);
    x.beginPath();
    x.moveTo(gx - gw, top);
    x.bezierCurveTo(gx - gw * 0.9, mid, gx - gw * 0.5, bot - 6, gx - gw * 0.1, bot);
    x.quadraticCurveTo(gx + gw * 0.15, bot + 3, gx + gw * 0.35, bot - 2);
    x.bezierCurveTo(gx + gw * 0.6, mid, gx + gw * 0.8, top + (bot - top) * 0.2, gx + gw * 1.1, top);
    x.closePath();
    const ice = x.createLinearGradient(gx - gw, 0, gx + gw, 0);
    ice.addColorStop(0, "#8EA6B6"); ice.addColorStop(0.5, "#C6D5DF"); ice.addColorStop(1, "#DCE5EB");
    x.fillStyle = ice; x.fill();
    x.strokeStyle = "rgba(110,135,155,.3)"; x.lineWidth = 1;
    x.beginPath(); x.moveTo(gx - gw * 0.1, top + 4); x.bezierCurveTo(gx - gw * 0.2, mid, gx, bot - 8, gx + gw * 0.05, bot - 3); x.stroke();
  }
  // Shadowed faces (sun is to the right)
  const shadeA = 0.3 - grey * 0.1;
  for (const pf of SHADED) {
    const px = pf * W, py = ridgeY(g, g.main, px), left = px - W * 0.1;
    // Darkest along the spur, fading out westward, so faces look rounded rather than cut
    const sh = x.createLinearGradient(left, 0, px + W * 0.02, 0);
    sh.addColorStop(0, "rgba(20,28,48,0)"); sh.addColorStop(1, `rgba(20,28,48,${shadeA})`);
    x.fillStyle = sh;
    x.beginPath();
    for (let q = left; q <= px; q += g.step) x.lineTo(q, ridgeY(g, g.main, q));
    const n = 14;
    for (let k = 1; k <= n; k++) { const f = k / n; x.lineTo(px + W * 0.03 * f + W * 0.01 * noise(f * 2, pf * 100), lerp(py, g.baseY, f)); }
    x.lineTo(left, g.baseY); x.closePath(); x.fill();
  }
  // Couloirs: thin dark gullies running down from the ridge
  x.strokeStyle = "rgba(24,30,44,.16)"; x.lineCap = "round";
  for (const gu of g.gullies) {
    const yt = ridgeY(g, g.main, gu.x) + 3;
    x.lineWidth = 0.8 + hash(gu.s, 33) * 1.2;
    x.beginPath(); x.moveTo(gu.x, yt);
    for (let k = 1; k <= 6; k++) x.lineTo(gu.x + noise(k * 0.3, gu.s) * 6 - k * 1.5, yt + (gu.len * k) / 6);
    x.stroke();
  }
  x.restore();
  // Horizon haze, thicker with more CO₂ and soot
  const haze = clamp((L.co2 - 300) / 900, 0, 0.5) + grey * 0.25;
  const hz = x.createLinearGradient(0, g.y0 - H * 0.32, 0, g.y0);
  hz.addColorStop(0, "rgba(176,138,106,0)"); hz.addColorStop(1, `rgba(176,138,106,${haze})`);
  x.fillStyle = hz; x.fillRect(0, g.y0 - H * 0.32, W, H * 0.32);
  // Foothills: meadow that dries with heat
  const dry = clamp((L.temp - 1.5) / 3, 0, 1);
  ridgePath(g, x, g.hills, g.y0 + 4);
  const hill = x.createLinearGradient(0, g.y0 - H * 0.3, 0, g.y0);
  hill.addColorStop(0, mix(mix("#4C6640", "#8B7B4C", dry), horizon, 0.25)); hill.addColorStop(1, mix("#33502F", "#6E6038", dry));
  x.fillStyle = hill; x.fill();
  // Forest: count from forest cover; heat above 2.5 °C thins and browns it
  const drought = clamp((L.temp - 2.5) / 2, 0, 0.8);
  const share = L.forest * (1 - drought * 0.35);
  for (const tr of g.trees) {
    if (tr.r > share) continue;
    const brown = tr.b < drought;
    const base = brown ? "#6E5A35" : mix("#1F3A27", "#2F5236", tr.b);
    x.fillStyle = mix(base, horizon, 0.45 * (1 - tr.d));
    const s = tr.s, w2 = s * 0.32;
    x.beginPath();
    x.moveTo(tr.x, tr.y - s);
    x.lineTo(tr.x - w2 * 0.6, tr.y - s * 0.55); x.lineTo(tr.x - w2 * 0.3, tr.y - s * 0.58);
    x.lineTo(tr.x - w2, tr.y); x.lineTo(tr.x + w2, tr.y);
    x.lineTo(tr.x + w2 * 0.3, tr.y - s * 0.58); x.lineTo(tr.x + w2 * 0.6, tr.y - s * 0.55);
    x.closePath(); x.fill();
  }
}

/** Farm terraces on the near left shore; colour follows the crop index. */
function drawFarms(ctx: CanvasRenderingContext2D, g: Geo, L: Look) {
  const { W, H, y0 } = g;
  const dry = clamp((L.temp - 1.5) / 3, 0, 1), fail = clamp(1 - L.crops / 100, 0, 1);
  ctx.beginPath();
  ctx.moveTo(-2, y0 + 2); ctx.lineTo(-2, y0 - H * 0.09);
  ctx.bezierCurveTo(W * 0.14, y0 - H * 0.11, W * 0.3, y0 - H * 0.06, W * 0.42, y0 + 2);
  ctx.closePath();
  ctx.fillStyle = mix("#3F5C35", "#7D6E42", dry); ctx.fill();
  ctx.save(); ctx.clip();
  for (let k = 0; k < 5; k++) {
    const yb = y0 - H * 0.012 - k * H * 0.017;
    const col = mix(k % 2 ? "#7E9A4E" : "#94A957", k % 2 ? "#B59A55" : "#C2A862", fail);
    ctx.fillStyle = mix(col, "#8F7650", clamp(fail - 0.5, 0, 0.5));
    ctx.beginPath();
    ctx.moveTo(-2, yb); ctx.lineTo(W * (0.4 - k * 0.055), yb + H * 0.004);
    ctx.lineTo(W * (0.4 - k * 0.055) - W * 0.02, yb - H * 0.013); ctx.lineTo(-2, yb - H * 0.014);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(40,50,30,.35)"; ctx.lineWidth = 1; ctx.stroke();
  }
  ctx.restore();
  // A red barn
  const bx = W * 0.08, by = y0 - H * 0.085, bw = Math.max(10, W * 0.026);
  ctx.fillStyle = "#7E3328"; ctx.fillRect(bx, by - bw * 0.6, bw, bw * 0.6);
  ctx.fillStyle = "#2E2622"; ctx.beginPath(); ctx.moveTo(bx - 2, by - bw * 0.6); ctx.lineTo(bx + bw / 2, by - bw); ctx.lineTo(bx + bw + 2, by - bw * 0.6); ctx.fill();
}

/** Town land, quay, sea wall, houses and pier with its tide gauge. */
function drawTown(ctx: CanvasRenderingContext2D, g: Geo, L: Look, t: number) {
  const { W, H, y0, mpx, x0 } = g;
  const yE = (m: number) => y0 - m * mpx;
  const topE = L.front + 7.5;
  // Land: a stone quay at the seafront, then a slope up to the right
  ctx.beginPath();
  ctx.moveTo(x0, y0 + 3); ctx.lineTo(x0, yE(L.front)); ctx.lineTo(x0 + W * 0.02, yE(L.front));
  ctx.lineTo(W + 2, yE(topE)); ctx.lineTo(W + 2, y0 + 3); ctx.closePath();
  const land = ctx.createLinearGradient(0, yE(topE), 0, y0);
  const dry = clamp((L.temp - 1.5) / 3, 0, 1);
  land.addColorStop(0, mix("#4A6038", "#7E6E42", dry)); land.addColorStop(1, "#3A3A34");
  ctx.fillStyle = land; ctx.fill();
  ctx.fillStyle = "#57534C"; ctx.fillRect(x0, yE(L.front), W * 0.02, (L.front * mpx) + 2);
  // Sea wall
  if (L.wall > 0.05) {
    ctx.fillStyle = "#77716A";
    ctx.fillRect(x0 - 3, yE(L.front + L.wall), Math.max(5, W * 0.006), L.wall * mpx + 1);
    ctx.fillStyle = "rgba(0,0,0,.18)"; ctx.fillRect(x0 - 3, yE(L.front + L.wall), 2, L.wall * mpx + 1);
  }
  // Houses and the church
  const smoke: [number, number][] = [];
  for (const h of g.houses) {
    const e = houseBase(h.i, L.front), yb = yE(e), w = h.w, wh = w * 0.78, rh = w * 0.5;
    if (h.church) {
      ctx.fillStyle = "#E4DACB"; ctx.fillRect(h.x - w * 0.7, yb - wh, w * 1.4, wh);
      ctx.fillStyle = "#3A3E44";
      ctx.beginPath(); ctx.moveTo(h.x - w * 0.8, yb - wh); ctx.lineTo(h.x, yb - wh - rh); ctx.lineTo(h.x + w * 0.8, yb - wh); ctx.fill();
      ctx.fillStyle = "#E4DACB"; ctx.fillRect(h.x + w * 0.35, yb - wh * 1.9, w * 0.4, wh * 1.9);
      ctx.fillStyle = "#3A3E44";
      ctx.beginPath(); ctx.moveTo(h.x + w * 0.3, yb - wh * 1.9); ctx.lineTo(h.x + w * 0.55, yb - wh * 1.9 - w * 0.9); ctx.lineTo(h.x + w * 0.8, yb - wh * 1.9); ctx.fill();
      continue;
    }
    ctx.fillStyle = h.col; ctx.fillRect(h.x - w / 2, yb - wh, w, wh);
    ctx.fillStyle = "rgba(20,16,12,.22)"; ctx.fillRect(h.x - w / 2, yb - wh, w * 0.28, wh); // shaded side
    ctx.fillStyle = h.roof;
    ctx.beginPath(); ctx.moveTo(h.x - w * 0.6, yb - wh); ctx.lineTo(h.x, yb - wh - rh); ctx.lineTo(h.x + w * 0.6, yb - wh); ctx.closePath(); ctx.fill();
    if (h.chimney) { ctx.fillRect(h.x + w * 0.2, yb - wh - rh * 0.8, w * 0.1, rh * 0.5); smoke.push([h.x + w * 0.25, yb - wh - rh * 0.85]); }
    ctx.fillStyle = "rgba(255,213,138,.7)";
    const ww = Math.max(1.5, w * 0.13);
    ctx.fillRect(h.x - w * 0.12, yb - wh * 0.62, ww, ww * 1.2); ctx.fillRect(h.x + w * 0.18, yb - wh * 0.62, ww, ww * 1.2);
  }
  // Chimney smoke rises and drifts on the clock
  for (let s = 0; s < smoke.length; s++) {
    const [cx, cy] = smoke[s];
    for (let k = 0; k < 6; k++) {
      const age = (t * 0.25 + k / 6 + hash(s, 61)) % 1;
      ctx.fillStyle = `rgba(214,206,196,${0.22 * (1 - age)})`;
      ctx.beginPath(); ctx.arc(cx + age * W * 0.02 + Math.sin(t + k) * 1.5, cy - age * H * 0.07, 1.5 + age * Math.min(W, H) * 0.012, 0, TAU); ctx.fill();
    }
  }
  // Pier from the quay out into the fjord, with a tide gauge at its end
  const pierY = yE(L.front), pl = x0 - W * 0.1;
  ctx.fillStyle = "#4A3A2C"; ctx.fillRect(pl, pierY - 3, x0 - pl, 3);
  for (let px = pl + 3; px < x0; px += W * 0.015) ctx.fillRect(px, pierY, 2, y0 + 6 - pierY);
  return { pierY, gaugeX: pl + 4 };
}

function drawGauge(ctx: CanvasRenderingContext2D, g: Geo, gx: number, small: boolean) {
  const { y0, mpx } = g;
  const yE = (m: number) => y0 - m * mpx;
  ctx.fillStyle = "#E7DCC8"; ctx.fillRect(gx - 2, yE(8), 4, 9 * mpx);
  ctx.fillStyle = "#8C3A2C";
  for (let m = 0; m <= 8; m++) ctx.fillRect(gx - 2, yE(m) - 1, m % 2 ? 4 : 8, 2);
  if (small) return;
  ctx.font = "500 10px " + FONT.body; ctx.fillStyle = STAGE.ink;
  ctx.textAlign = "right";
  for (let m = 0; m <= 8; m += 2) ctx.fillText(m === 0 ? "0 m" : `+${m}`, gx - 6, yE(m) + 3);
  ctx.textAlign = "left";
}

/** The fjord: reflection of the back layers, depth tint, moving shimmer, high-tide wash. */
function drawWater(ctx: CanvasRenderingContext2D, g: Geo, L: Look, back: OffscreenCanvas, t: number) {
  const { W, H, mpx, x0 } = g;
  const seaY = g.y0 - clamp(L.sea, -2, 14) * mpx;
  const held = L.wall > 0.05 && L.sea + TIDE < L.front + L.wall;
  const quayY = g.y0 - L.front * mpx;
  ctx.save();
  ctx.beginPath();
  if (held && seaY < quayY) { ctx.rect(-2, seaY, x0 + 2, H - seaY + 2); ctx.rect(x0, quayY, W - x0 + 2, H - quayY + 2); }
  else ctx.rect(-2, seaY, W + 4, H - seaY + 2);
  ctx.clip();
  // Mirror the mountains and sky in the water
  ctx.save();
  ctx.translate(0, seaY * 2); ctx.scale(1, -1);
  ctx.globalAlpha = 0.42; ctx.drawImage(back, 0, 0, W, H);
  ctx.restore();
  const water = ctx.createLinearGradient(0, seaY, 0, H);
  water.addColorStop(0, "rgba(46,86,108,.62)"); water.addColorStop(1, "rgba(14,32,46,.94)");
  ctx.fillStyle = water; ctx.fillRect(0, seaY, W, H - seaY);
  // Shimmer: short strokes sliding slowly, denser under the sun
  ctx.lineCap = "round";
  for (let i = 0; i < 70; i++) {
    const depth = hash(i, 71), y = seaY + 3 + depth ** 1.6 * (H - seaY);
    const len = 4 + depth * 22, x = ((hash(i, 72) * (W + 60) + t * (6 + depth * 10)) % (W + 60)) - 30;
    const nearSun = Math.exp(-(((x / W - SUN.x) / 0.12) ** 2));
    ctx.strokeStyle = `rgba(255,236,200,${(0.1 + 0.35 * nearSun) * (0.6 + 0.4 * Math.sin(t * 1.7 + i))})`;
    ctx.lineWidth = 1 + depth;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
  }
  ctx.restore();
  // Waterline and high-tide wash
  ctx.strokeStyle = "rgba(230,240,245,.5)"; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= (held && seaY < quayY ? x0 : W); x += 4) { const y = seaY + Math.sin(x * 0.05 + t * 1.6) * 0.8; x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
  ctx.stroke();
  if (!held) {
    const tideY = seaY - TIDE * mpx * (0.5 + 0.5 * Math.sin(t * 0.35));
    ctx.fillStyle = "rgba(200,225,235,.12)"; ctx.fillRect(0, tideY, W, seaY - tideY);
  }
  return seaY;
}

function drawBoats(ctx: CanvasRenderingContext2D, g: Geo, seaY: number, t: number) {
  const { W, H } = g, s = Math.min(W, H);
  for (let i = 0; i < 3; i++) {
    const bx = W * (0.14 + i * 0.16) + Math.sin(t * 0.04 + i * 2) * W * 0.03;
    const by = seaY + H * (0.03 + i * 0.035) + Math.sin(t * 1.3 + i) * 1.2;
    const L = s * (0.04 + i * 0.012), tilt = Math.sin(t * 1.1 + i * 1.7) * 0.04;
    ctx.save(); ctx.translate(bx, by); ctx.rotate(tilt);
    ctx.fillStyle = i === 1 ? "#8C3A2C" : "#E2D6C2";
    ctx.beginPath(); ctx.moveTo(-L / 2, -L * 0.12); ctx.lineTo(L / 2, -L * 0.12); ctx.lineTo(L * 0.38, 0); ctx.lineTo(-L * 0.4, 0); ctx.closePath(); ctx.fill();
    if (i !== 1) {
      ctx.fillStyle = "#3A3430"; ctx.fillRect(-1, -L * 0.85, 1.5, L * 0.73);
      ctx.fillStyle = "rgba(240,232,220,.92)";
      ctx.beginPath(); ctx.moveTo(1, -L * 0.82); ctx.lineTo(L * 0.34, -L * 0.16); ctx.lineTo(1, -L * 0.16); ctx.fill();
    } else {
      ctx.fillStyle = "#E2D6C2"; ctx.fillRect(-L * 0.15, -L * 0.3, L * 0.3, L * 0.18);
    }
    ctx.restore();
    // Soft reflection
    ctx.fillStyle = "rgba(10,20,30,.25)"; ctx.fillRect(bx - L * 0.4, by + 1, L * 0.8, 2);
  }
}

function drawGulls(ctx: CanvasRenderingContext2D, g: Geo, t: number) {
  const { W, H } = g;
  ctx.strokeStyle = "rgba(40,40,46,.7)"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
  for (let i = 0; i < 4; i++) {
    const span = W * 1.3, x = ((hash(i, 81) * span + t * (14 + i * 3)) % span) - W * 0.15;
    const y = H * (0.3 + hash(i, 82) * 0.15) + Math.sin(t * 0.5 + i) * H * 0.01;
    const s = 4 + hash(i, 83) * 3, f = Math.sin(t * 5 + i * 2) * s * 0.5;
    ctx.beginPath(); ctx.moveTo(x - s, y - f); ctx.quadraticCurveTo(x - s * 0.4, y - s * 0.4, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - s * 0.4, x + s, y - f); ctx.stroke();
  }
}

function drawOverlays(ctx: CanvasRenderingContext2D, g: Geo, L: Look, t: number) {
  const { W, H } = g;
  if (L.temp > 3) { ctx.fillStyle = `rgba(230,120,50,${clamp((L.temp - 3) * 0.06, 0, 0.14)})`; ctx.fillRect(0, 0, W, H); }
  if (L.dim > 0.01) { ctx.fillStyle = `rgba(170,168,166,${L.dim * 0.28})`; ctx.fillRect(0, 0, W, H); }
  if (L.ash > 0.01) {
    ctx.fillStyle = `rgba(70,62,56,${L.ash * 0.45})`; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = `rgba(150,140,130,${L.ash * 0.7})`;
    for (let i = 0; i < 90; i++) {
      const x = (hash(i, 91) * W + Math.sin(t * 0.6 + i) * 8) % W, y = (hash(i, 92) * H + t * (10 + hash(i, 93) * 12)) % H;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
  }
}

/** Draw the whole scene for one half of the stage (`half` 0 = no change, 1 = what-if). */
export function drawScene(ctx: CanvasRenderingContext2D, W: number, H: number, target: Look, half: number) {
  if (W < 4 || H < 4) return;
  // Narrow stages (split halves, phones) paint a wider scene and pan towards the town, so nothing squashes
  const VW = Math.max(W, H * 1.45), ox = (VW - W) * 0.62;
  const g = geo(VW, H), t = clock(), L = ease(half, target, typeof performance !== "undefined" ? performance.now() / 1000 : 0);
  const dpr = Math.abs(ctx.getTransform().a) || 1;
  const b = backBuffer(half, Math.ceil(VW * dpr), Math.ceil(H * dpr));
  b.x.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBack(b.x, g, L, t);
  ctx.save();
  ctx.translate(-ox, 0);
  ctx.drawImage(b.c, 0, 0, VW, H);
  drawFarms(ctx, g, L);
  const { gaugeX } = drawTown(ctx, g, L, t);
  drawGauge(ctx, g, gaugeX, true);
  const seaY = drawWater(ctx, g, L, b.c, t);
  drawGauge(ctx, g, gaugeX, W < 300);
  drawBoats(ctx, g, seaY, t);
  drawGulls(ctx, g, t);
  drawOverlays(ctx, g, L, t);
  ctx.restore();
  // Snow-line marker on the mountains
  if (W >= 300) {
    const ys = g.baseY - (L.snowLine / PEAK) * (g.baseY - g.topY);
    if (ys > g.topY + 30 && ys < g.baseY) {
      ctx.strokeStyle = "rgba(255,237,215,.7)"; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(8, ys); ctx.lineTo(8 + W * 0.12, ys); ctx.stroke(); ctx.setLineDash([]);
      chip(ctx, `Snow line ${(Math.round(L.snowLine / 10) * 10).toLocaleString("en-US")} m`, 8, ys - 26, STAGE.ink, "500 12px " + FONT.body);
    }
  }
  const sign = L.temp >= 0 ? "+" : "−";
  chip(ctx, `${sign}${Math.abs(L.temp).toFixed(1)} °C · sea +${L.sea.toFixed(2)} m · ${Math.round(L.co2)} ppm`, 8, H - 30, STAGE.ink, "500 12px " + FONT.mono, W - 32);
}
