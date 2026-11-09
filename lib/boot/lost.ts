import { hash, type Hash } from "./shapes";

/**
 * The 404 scene (change 0030): the boot scene's sparks (change 0026) gather into an astronaut on a cut tether, then the
 * figure drifts and slowly tumbles through empty space while far stars slide by. Same rules as the boot scene: an inline,
 * self-contained script (shipped with `toString()`: no imports, no outer names, no network), deterministic (`h(i)`),
 * theme-aware colours from the tokens, no flashes, and reduced motion draws one still frame.
 */

/**
 * Where each spark lands: an astronaut, mostly outlines (glowing fills blur into a blob), the visor drawn twice as dense
 * so it reads first, and a tether trailing off to the right that frays into nothing. Box x, y ∈ [-1, 1], y down.
 * Points [x0, y0, x1, y1, …]; the last `n * TETHER` points are the tether, in order from the belt outwards.
 */
export function astronaut(n: number, h: Hash): number[] {
  // Capsules [ax, ay, bx, by, r] (a circle is a capsule with a = b): helmet, backpack, body, arms, legs.
  const C = [
    [0, -0.5, 0, -0.5, 0.25],
    [-0.2, -0.24, -0.2, 0.12, 0.15],
    [0, -0.2, 0, 0.16, 0.21],
    [-0.17, -0.16, -0.44, -0.44, 0.075],
    [0.17, -0.12, 0.42, 0.06, 0.075],
    [-0.09, 0.26, -0.2, 0.66, 0.09],
    [0.1, 0.26, 0.3, 0.6, 0.09],
  ];
  const inside = (x: number, y: number, skip: number) => {
    for (let k = 0; k < C.length; k++) {
      if (k === skip) continue;
      const c = C[k], dx = c[2] - c[0], dy = c[3] - c[1], L = dx * dx + dy * dy;
      const t = L ? Math.max(0, Math.min(1, ((x - c[0]) * dx + (y - c[1]) * dy) / L)) : 0;
      if (Math.hypot(x - c[0] - dx * t, y - c[1] - dy * t) < c[4] - 0.012) return true;
    }
    return false;
  };
  // Outline length of each capsule: two sides + a full circle of caps.
  const len = C.map((c) => 2 * Math.hypot(c[2] - c[0], c[3] - c[1]) + 2 * Math.PI * c[4]);
  let total = 0;
  for (const l of len) total += l;

  const TETHER = 0.16, VISOR = 0.13;
  const nt = Math.round(n * TETHER), nv = Math.round(n * VISOR), nb = n - nt - nv;
  const out: number[] = [];
  // Body: a point on one capsule's outline, kept only if no other capsule covers it (the union's silhouette).
  for (let i = 0, tries = 0; out.length < nb * 2; tries++) {
    const j = i * 7 + tries * 131;
    let pick = h(j + 1) * total, k = 0;
    while (k < C.length - 1 && pick > len[k]) { pick -= len[k]; k++; }
    const c = C[k], dx = c[2] - c[0], dy = c[3] - c[1], L = Math.hypot(dx, dy), r = c[4];
    const nx = L ? -dy / L : 0, ny = L ? dx / L : 0;
    let x: number, y: number;
    if (pick < L) { x = c[0] + dx * (pick / L) + nx * r; y = c[1] + dy * (pick / L) + ny * r; }
    else if (pick < 2 * L) { const f = (pick - L) / L; x = c[0] + dx * f - nx * r; y = c[1] + dy * f - ny * r; }
    else { const a = h(j + 2) * Math.PI * 2, end = h(j + 3) < 0.5; x = (end ? c[0] : c[2]) + Math.cos(a) * r; y = (end ? c[1] : c[3]) + Math.sin(a) * r; }
    if (inside(x, y, k) && tries < 4000) continue;
    out.push(x, y); i++;
  }
  // Visor: an ellipse inside the helmet, turned a little towards the viewer's right.
  for (let i = 0; i < nv; i++) {
    const a = (i / nv) * Math.PI * 2 + h(i * 5 + 9) * 0.05;
    out.push(0.05 + Math.cos(a) * 0.16, -0.51 + Math.sin(a) * 0.105);
  }
  // Tether: from the belt, a slack curve out to the right; the far end thins out (points spread further apart).
  for (let i = 0; i < nt; i++) {
    const f = Math.pow(i / Math.max(1, nt - 1), 0.8), u = 1 - f;
    const x = u * u * 0.2 + 2 * u * f * 0.75 + f * f * 0.98;
    const y = u * u * 0.1 + 2 * u * f * 0.62 + f * f * 0.2;
    out.push(x, y + (h(i * 3 + 4) - 0.5) * 0.012);
  }
  return out;
}

export interface LostConfig {
  /** Share of the points that are the tether (they fray at the end). */
  tether: number;
}

function lost(shape: (n: number, h: Hash) => number[], h: Hash, cfg: LostConfig) {
  const doc = document, root = doc.documentElement, el = doc.getElementById("lost");
  const cv = el && (el.querySelector("canvas") as HTMLCanvasElement | null);
  const ctx = cv && cv.getContext("2d");
  if (!el || !cv || !ctx) return;
  const still = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // The boot scene's colours: the visitor's theme tokens (ground, signal, ink-2 for far stars).
  const light = root.dataset.theme === "light";
  const GROUND = light ? "233,237,242" : "5,8,12";
  const SIGNAL = light ? [11, 127, 118] : [59, 212, 199];
  const STAR = light ? "75,87,103" : "139,152,169";
  const BLEND: GlobalCompositeOperation = light ? "source-over" : "lighter";

  const o = doc.createElement("canvas"), R = 16;
  o.width = o.height = R * 2;
  const g = o.getContext("2d")!, gr = g.createRadialGradient(R, R, 0, R, R, R);
  gr.addColorStop(0, `rgba(${SIGNAL},0.9)`); gr.addColorStop(0.16, `rgba(${SIGNAL},0.6)`); gr.addColorStop(0.4, `rgba(${SIGNAL},0.12)`); gr.addColorStop(1, `rgba(${SIGNAL},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, R * 2, R * 2);

  let w = 0, hgt = 0, s = 0, cx = 0, cy = 0, n = 0, nt = 0;
  let P = new Float32Array(0); // per spark: tx, ty, sx, sy, delay, bend
  let S = new Float32Array(0); // per star: x, y (0–1), depth, size
  const layout = () => {
    w = innerWidth; hgt = innerHeight;
    const dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = Math.round(w * dpr); cv.height = Math.round(hgt * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // The figure sits in the upper part; the words sit under it. Short screens get a smaller astronaut.
    s = Math.min(w * 0.3, hgt * 0.26, 270); cx = w / 2 - s * 0.15; cy = hgt * (hgt < 560 ? 0.32 : 0.37);
    const count = w < 600 ? 230 : 420;
    if (count !== n) {
      n = count; nt = Math.round(n * cfg.tether);
      const pts = shape(n, h);
      P = new Float32Array(n * 6);
      for (let i = 0; i < n; i++) {
        const a = h(i * 11 + 3) * Math.PI * 2, far = 0.75 + h(i * 13 + 5) * 0.6;
        P[i * 6] = pts[i * 2]; P[i * 6 + 1] = pts[i * 2 + 1];
        P[i * 6 + 2] = Math.cos(a) * far; P[i * 6 + 3] = Math.sin(a) * far;
        P[i * 6 + 4] = 0.1 + h(i * 17 + 1) * 0.4;
        P[i * 6 + 5] = (h(i * 19 + 2) - 0.5) * 0.9;
      }
      const ns = w < 600 ? 90 : 170;
      S = new Float32Array(ns * 4);
      for (let i = 0; i < ns; i++) {
        S[i * 4] = h(i * 23 + 7); S[i * 4 + 1] = h(i * 29 + 11);
        S[i * 4 + 2] = 0.2 + h(i * 31 + 13) * 0.8; S[i * 4 + 3] = h(i * 37 + 17) < 0.08 ? 1.6 : 0.6 + h(i * 41) * 0.6;
      }
    }
  };
  layout();
  addEventListener("resize", () => { layout(); if (still) draw(0); });

  // A pointer nudges the far stars a little (parallax), eased so it never jumps.
  let px = 0, py = 0, qx = 0, qy = 0;
  if (!still) addEventListener("pointermove", (e) => { px = e.clientX / w - 0.5; py = e.clientY / hgt - 0.5; }, { passive: true });

  const ease = (x: number) => 1 - Math.pow(1 - x, 3);
  const TRAVEL = 0.9;
  let t = 0, last = 0;

  const draw = (dt: number) => {
    const diag = Math.hypot(w, hgt) / 2, arriving = t < 1.6;
    ctx.globalCompositeOperation = "source-over";
    // Streaks while the sparks fly in (fade the last frame), clean frames once the astronaut is drifting.
    ctx.fillStyle = still || !arriving ? `rgb(${GROUND})` : `rgba(${GROUND},${0.26 + 0.74 * Math.max(0, (t - 1.1) / 0.5)})`;
    ctx.fillRect(0, 0, w, hgt);

    // Far stars: plain dots, no glow, sliding left slowly; nearer ones (depth) move more and follow the pointer more.
    qx += (px - qx) * Math.min(1, dt * 3); qy += (py - qy) * Math.min(1, dt * 3);
    ctx.fillStyle = `rgb(${STAR})`;
    for (let i = 0; i < S.length / 4; i++) {
      const d = S[i * 4 + 2];
      let x = (S[i * 4] - t * 0.004 * d) % 1; if (x < 0) x += 1;
      const tw = still ? 0.7 : 0.45 + 0.35 * Math.sin(t * (0.6 + d) + i * 1.7);
      ctx.globalAlpha = tw * (0.45 + d * 0.55);
      const sz = S[i * 4 + 3];
      ctx.fillRect(x * w - qx * 18 * d, S[i * 4 + 1] * hgt - qy * 12 * d, sz, sz);
    }
    ctx.globalAlpha = 1;

    // Now and then a far meteor crosses (one every 9 s, 0.8 s long, never brighter than the stars' colour at half).
    const cyc = Math.floor(t / 9), ph = t / 9 - cyc;
    if (!still && t > 3 && ph < 0.09) {
      const f = ph / 0.09, mx = (0.25 + h(cyc * 7 + 1) * 0.7) * w, my = h(cyc * 7 + 2) * hgt * 0.35, len = Math.min(w, hgt) * 0.22;
      const x1 = mx - f * len * 1.6, y1 = my + f * len * 0.7, x0 = x1 + len * 0.4 * (1 - f * 0.5), y0 = y1 - len * 0.175 * (1 - f * 0.5);
      const mg = ctx.createLinearGradient(x0, y0, x1, y1);
      mg.addColorStop(0, `rgba(${STAR},0)`); mg.addColorStop(1, `rgba(${STAR},${0.5 * Math.sin(f * Math.PI)})`);
      ctx.strokeStyle = mg; ctx.lineWidth = 1.2; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // The drift: a slow bob and sway, and a tumble that never stops (about two minutes a turn).
    const ax = cx + (still ? 0 : Math.sin(t * 0.21) * s * 0.12);
    const ay = cy + (still ? 0 : Math.sin(t * 0.33) * s * 0.07);
    const rot = -0.28 + (still ? 0 : Math.sin(t * 0.17) * 0.12 + t * 0.03);
    const rc = Math.cos(rot), rs = Math.sin(rot);

    ctx.globalCompositeOperation = BLEND;
    for (let i = 0; i < n; i++) {
      const q = i * 6, tetherK = i >= n - nt ? (i - (n - nt)) / Math.max(1, nt - 1) : -1;
      let lx = P[q], ly = P[q + 1];
      // The tether sways, more towards its cut end, and the last bits drift loose.
      if (tetherK >= 0 && !still) {
        ly += Math.sin(t * 0.9 - tetherK * 3.2) * 0.07 * tetherK;
        if (tetherK > 0.85) { const f = (tetherK - 0.85) / 0.15; lx += f * 0.05 * Math.sin(t * 0.5 + i); ly += f * 0.06 * Math.cos(t * 0.4 + i); }
      }
      const tx = ax + (lx * rc - ly * rs) * s, ty = ay + (lx * rs + ly * rc) * s;
      let x = tx, y = ty, k = 1;
      if (!still) {
        k = Math.max(0, Math.min(1, (t - P[q + 4]) / TRAVEL));
        if (k < 1) {
          const e = ease(k), sx = cx + P[q + 2] * diag, sy = cy + P[q + 3] * diag;
          const bx = -(ty - sy) * P[q + 5], by = (tx - sx) * P[q + 5], arc = Math.sin(e * Math.PI) * 0.35;
          x = sx + (tx - sx) * e + bx * arc; y = sy + (ty - sy) * e + by * arc;
        } else { x += Math.sin(t * 1.3 + i) * 0.6; y += Math.cos(t * 1.1 + i * 1.7) * 0.6; }
      }
      const tw = still ? 0.85 : 0.6 + 0.35 * Math.sin(t * 4 + i * 2.3) * Math.sin(t * 1.7 + i);
      const fade = tetherK > 0.7 ? 1 - (tetherK - 0.7) / 0.3 * 0.75 : 1; // the cut end dims away
      const size = (k >= 1 ? 8 : 5 + 5 * (1 - k)) * (tetherK >= 0 ? 0.75 : 1);
      ctx.globalAlpha = Math.max(0.12, Math.min(0.9, tw * fade));
      ctx.drawImage(o, x - size, y - size, size * 2, size * 2);
    }
    ctx.globalAlpha = 1;
  };

  if (still) { draw(0); return; }
  const frame = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now; t += dt;
    draw(dt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/** The inline script for the 404 page. */
export function lostScript(): string {
  return `(${lost.toString()})(${astronaut.toString()},${hash.toString()},${JSON.stringify({ tether: 0.16 } satisfies LostConfig)});`;
}

/** For tests. */
export const _lost = lost;
