import type { StageInteraction } from "@/components/console/Stage";
import { defaultView, toPlane } from "@/lib/sim/camera";
import { withCamera } from "@/components/console/stageCamera";

/**
 * Drag on the stage to throw in a planet: one more change in the changed world (it goes on the changes list).
 * Since change 0036 this runs when the view bar's tool is "Throw"; the drop lands on the orbital plane at any view angle.
 */
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
    const v = engine.ui.view ?? defaultView(0);
    // Screen → the orbital plane (still squeezed by the stage's radial power, sim.ts VIEW_POW), relative to the Sun
    const q0 = toPlane(v, (d.x0 - cam.W / 2) / cam.sc, (d.y0 - cam.H / 2) / cam.sc);
    const q1 = toPlane(v, (d.x1 - cam.W / 2) / cam.sc, (d.y1 - cam.H / 2) / cam.sc);
    if (!q0 || !q1) return false;
    // Undo the squeeze: a squeezed distance ρ ↔ a true distance r = half·(ρ / half)^(1/pow)
    const pow = cam.pow ?? 1, half = cam.half ?? 1, rho = Math.hypot(q0[0], q0[1]);
    const r = pow === 1 || rho < 1e-9 ? rho : half * (rho / half) ** (1 / pow);
    const k = rho < 1e-9 ? 1 : r / rho; // true AU per squeezed AU at the drop point
    engine.ui.pending = { x: cam.cx + q0[0] * k, y: cam.cy + q0[1] * k, vx: (q1[0] - q0[0]) * k * 4, vy: (q1[1] - q0[1]) * k * 4 };
    engine.change("throw");
    return true;
  },
};

/** The solar stage's input: the space camera, with throwing as its second tool. Looking straight down by default. */
export const SOLAR_PITCH = 0;
export const solarStage = withCamera({ pitch: SOLAR_PITCH, inner: throwPlanet });
