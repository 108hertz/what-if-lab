import type { StageInteraction } from "@/components/console/Stage";

/** Drag on the stage to throw in a planet: forks the world, or adds to an open what-if. */
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
    const k = 4 / cam.sc;
    engine.ui.pending = { x: cam.cx + (d.x0 - cam.W / 2) / cam.sc, y: cam.cy + (d.y0 - cam.H / 2) / cam.sc, vx: (d.x1 - d.x0) * k, vy: (d.y1 - d.y0) * k };
    if (d.alt && engine.alt) engine.applyToAlt("throw");
    else engine.fork("throw");
    return true;
  },
};
