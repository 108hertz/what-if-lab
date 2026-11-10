import type { StageInteraction } from "@/components/console/Stage";

/** Drag on the stage to throw in a planet: one more change in the changed world (it goes on the changes list). */
export const throwPlanet: StageInteraction = {
  down(engine, x, y, W, H) {
    const rc = engine.rects(W, H).find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
    if (rc) engine.ui.drag = { alt: rc.alt, ox: rc.x, oy: rc.y, x0: x - rc.x, y0: y - rc.y, x1: x - rc.x, y1: y - rc.y };
  },
  move(engine, x, y) {
    const d = engine.ui.drag;
    if (d) { d.x1 = x - d.ox; d.y1 = y - d.oy; }
  },
  up(engine, _x, _y, done) {
    const d = engine.ui.drag;
    engine.ui.drag = null;
    if (!d || !done) return false;
    const cam = engine.ui.cams[d.alt ? 1 : 0];
    if (!cam || Math.hypot(d.x1 - d.x0, d.y1 - d.y0) <= 2) return false;
    // Undo the stage's radial power scale (sim.ts VIEW_POW): screen distance ρ ↔ r = half·(ρ / (sc·half))^(1/pow).
    const sx = d.x0 - cam.W / 2, sy = d.y0 - cam.H / 2, rho = Math.hypot(sx, sy), pow = cam.pow ?? 1, half = cam.half ?? 1;
    const r = pow === 1 || rho < 1e-9 ? rho / cam.sc : half * (rho / (cam.sc * half)) ** (1 / pow);
    const sc = rho < 1e-9 ? cam.sc : rho / r; // local px per AU at the drop point
    const k = 4 / sc;
    engine.ui.pending = { x: cam.cx + sx / sc, y: cam.cy + sy / sc, vx: (d.x1 - d.x0) * k, vy: (d.y1 - d.y0) * k };
    engine.change("throw");
    return true;
  },
};
