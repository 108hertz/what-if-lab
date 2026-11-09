import { SHAPES, hash, type BootShape } from "./shapes";

/**
 * The boot scene's inline script (change 0026). It runs in the static HTML before the React bundle arrives: sparks
 * gather into the world's silhouette, hold while the lab loads, then fork into the two channels (blue | amber) and the
 * overlay fades onto the console. The lab says it is ready with `window.__labReady = 1` + a "lab:ready" event.
 *
 * `boot` is serialised with `toString()`, so it must be self-contained: no imports, no outer names, no network.
 * Its only side effects are on the `.boot` overlay and `<html>`'s data attributes (`data-booted`, and removing
 * `data-js` if the lab never comes, so the static PageIntro shows instead of a dead screen).
 */
export interface BootConfig {
  /** Slow-load line, in the page's language. */
  slow: string;
}

type ShapeFn = (n: number, h: (i: number) => number) => number[];

function boot(shape: ShapeFn, h: (i: number) => number, cfg: BootConfig) {
  const doc = document, root = doc.documentElement, el = doc.getElementById("boot");
  const cv = el && (el.querySelector("canvas") as HTMLCanvasElement | null);
  const ctx = cv && cv.getContext("2d");
  if (!el || !cv || !ctx) return;
  const W = window as unknown as { __labReady?: number };
  let seen = false;
  try { seen = localStorage.getItem("boot") === "1"; } catch (e) {}
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Colours mirror the tokens (DESIGN.md) of the visitor's theme: ground, signal, no-change blue, what-if amber.
  // Dark adds light ("lighter": dense areas bloom); the light theme paints plainly, so the sparks keep their colour
  // (adding or multiplying on a pale ground washes them out or builds them up to black).
  const light = root.dataset.theme === "light";
  const STAGE = light ? "233,237,242" : "5,8,12";
  const SIGNAL = light ? [11, 127, 118] : [59, 212, 199], BLUE = light ? [47, 95, 179] : [127, 178, 255], AMBER = light ? [143, 84, 0] : [255, 181, 71];
  const BLEND: GlobalCompositeOperation = light ? "source-over" : "lighter", SHINE = light ? "11,127,118" : "230,237,245";
  // Scene time: sparks are home by 0.8. Repeat visits run it 2.2× faster (home in ≈ 0.36 s), first visits in real time.
  const MIN = 0.8, SPEED = seen ? 2.2 : 1;

  let w = 0, hgt = 0, dpr = 1, s = 0, cx = 0, cy = 0, n = 0;
  let P: Float32Array = new Float32Array(0); // per spark: tx, ty, sx, sy, delay, bend, x, y
  const sprite = (c: number[]) => {
    const o = doc.createElement("canvas"), r = 16;
    o.width = o.height = r * 2;
    const g = o.getContext("2d")!, gr = g.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, `rgba(${c},0.9)`); gr.addColorStop(0.16, `rgba(${c},0.6)`); gr.addColorStop(0.4, `rgba(${c},0.12)`); gr.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2);
    return o;
  };
  const SP = [sprite(SIGNAL), sprite(BLUE), sprite(AMBER)];

  const layout = () => {
    w = innerWidth; hgt = innerHeight; dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    s = Math.min((w - 32) * 0.46, hgt * 0.3); cx = w / 2; cy = hgt * 0.44;
    const count = w < 600 ? 140 : 260;
    if (count !== n) {
      n = count;
      const pts = shape(n, h);
      P = new Float32Array(n * 8);
      for (let i = 0; i < n; i++) {
        const a = h(i * 11 + 3) * Math.PI * 2, far = 0.75 + h(i * 13 + 5) * 0.6;
        P[i * 8] = pts[i * 2]; P[i * 8 + 1] = pts[i * 2 + 1];
        P[i * 8 + 2] = Math.cos(a) * far; P[i * 8 + 3] = Math.sin(a) * far; // start, in viewport half-diagonals
        P[i * 8 + 4] = 0.1 + h(i * 17 + 1) * 0.28; // delay (s)
        P[i * 8 + 5] = (h(i * 19 + 2) - 0.5) * 0.9; // curve bend
      }
    }
  };
  layout();
  addEventListener("resize", () => { layout(); if (still) draw(performance.now()); });

  let t = 0, last = 0, forkAt = -1, gone = false, pulse = -1;
  const t0 = performance.now();
  const ready = () => !!W.__labReady;
  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  const TRAVEL = 0.4;

  const finish = () => {
    if (gone) return;
    gone = true;
    removeEventListener("keydown", skip);
    root.dataset.booted = "1";
    try { localStorage.setItem("boot", "1"); } catch (e) {}
  };
  const fork = () => {
    if (forkAt >= 0) return;
    forkAt = t;
    el.classList.add("is-forking");
    setTimeout(() => el.classList.add("is-out"), still ? 0 : 300);
    setTimeout(finish, still ? 170 : 570);
  };
  const skip = () => { if (ready()) fork(); else if (t < 0.8) t = 0.8; };
  el.addEventListener("pointerdown", skip);
  addEventListener("keydown", skip);
  addEventListener("lab:ready", () => { if (still || t >= MIN) fork(); });

  // Slow load: say so; no lab after 15 s: give the page back to the static intro (it has the links).
  setTimeout(() => { if (!ready()) { const p = el.querySelector(".boot-line"); if (p) p.textContent = cfg.slow; } }, 8000);
  // (A tab loaded in the background has no animation frames: if the console is there, just step aside.)
  setTimeout(() => { if (!ready() && !doc.querySelector(".app")) delete root.dataset.js; finish(); }, 15000);

  const frame = (now: number) => {
    if (gone) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; t += dt * SPEED;
    if (!still && forkAt < 0 && ready() && t >= MIN) fork();
    draw(now);
    requestAnimationFrame(frame);
  };

  const draw = (now: number) => {
    const diag = Math.hypot(w, hgt) / 2;
    // Trails: fade the last frame instead of clearing it (streaks for free). Reduced motion: a clean frame.
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = still ? `rgb(${STAGE})` : `rgba(${STAGE},0.26)`;
    ctx.fillRect(0, 0, w, hgt);
    ctx.globalCompositeOperation = BLEND;
    const wall = (now - t0) / 1000, ft = forkAt < 0 ? -1 : t - forkAt;
    const sweep = ft < 0 ? -1 : Math.min(1.2, ft / 0.3); // 0 → 1 across the screen
    let arrived = 0;
    for (let i = 0; i < n; i++) {
      const o = i * 8, tx = cx + P[o] * s, ty = cy + P[o + 1] * s;
      let x: number, y: number, k: number;
      if (still) { x = tx; y = ty; k = 1; } else {
        k = Math.max(0, Math.min(1, (t - P[o + 4]) / TRAVEL));
        const e = ease(k), sx = cx + P[o + 2] * diag, sy = cy + P[o + 3] * diag;
        const bx = -(ty - sy) * P[o + 5], by = (tx - sx) * P[o + 5], arc = Math.sin(e * Math.PI) * 0.35;
        x = sx + (tx - sx) * e + bx * arc; y = sy + (ty - sy) * e + by * arc;
        if (k >= 1) {
          arrived++;
          const br = Math.sin(wall * 1.3 + i) * 1.2; // the hold breathes
          x += br * 0.6; y += Math.cos(wall * 1.1 + i * 1.7) * 0.6;
        }
      }
      // Fork: the sweep tints each spark by side (blue left, amber right); the amber half drifts away a little.
      let c = 0;
      const lit = still || (sweep >= 0 && x / w < sweep);
      if (lit) {
        c = x < cx ? 1 : 2;
        if (c === 2 && !still) { x += 8 * Math.min(1, ft / 0.4); y -= 4 * Math.min(1, ft / 0.4); }
      }
      const tw = still ? 0.85 : 0.55 + 0.45 * Math.sin(wall * 6 + i * 2.3) * Math.sin(wall * 2.1 + i);
      const size = (k >= 1 ? 9 : 6 + 5 * (1 - k)) * (1 + (ft > 0 ? ft * 1.2 : 0));
      ctx.globalAlpha = Math.max(0.15, Math.min(0.92, tw));
      ctx.drawImage(SP[c], x - size, y - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
    if (still) return;
    // One ring pulse when ~90 % have arrived.
    if (pulse < 0 && arrived > n * 0.9) pulse = t;
    if (pulse >= 0 && t - pulse < 0.6) {
      const q = (t - pulse) / 0.6;
      ctx.strokeStyle = `rgba(${SIGNAL},${0.45 * (1 - q)})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, s * (0.2 + q * 1.1), 0, Math.PI * 2); ctx.stroke();
    }
    // The shimmer: a soft vertical band of light crossing the screen (peaks well below full brightness).
    if (sweep >= 0 && sweep <= 1.1) {
      const bx = sweep * w, g = ctx.createLinearGradient(bx - 90, 0, bx + 90, 0);
      g.addColorStop(0, `rgba(${SHINE},0)`); g.addColorStop(0.5, `rgba(${SHINE},${light ? 0.1 : 0.16})`); g.addColorStop(1, `rgba(${SHINE},0)`);
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = g; ctx.fillRect(bx - 90, 0, 180, hgt);
    }
  };

  if (still) { draw(performance.now()); if (ready()) fork(); return; }
  requestAnimationFrame(frame);
}

/** The inline script for a page: the shape's own source plus the boot function, called with plain JSON. */
export function bootScript(shape: BootShape, cfg: BootConfig): string {
  return `(${boot.toString()})(${SHAPES[shape].toString()},${hash.toString()},${JSON.stringify(cfg)});`;
}

/** For tests: the functions the script is built from. */
export const _boot = boot;
