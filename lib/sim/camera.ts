/**
 * The space camera (change 0036): an orbit camera for the solar and galaxy stages. View only — it lives in
 * `InteractionState.view`, never in a world, so it can't change a sim, a fork, a replay or a test.
 *
 * Orthographic on purpose: sizes still read the same anywhere on the stage, and the default view (yaw 0,
 * the world's own pitch, zoom 1, no pan) is exactly the framing each stage had before this change.
 * A world draws a point by projecting its offset from the world's own centre: `project(v, x, y, z)` gives
 * screen-plane offsets in world units; the world multiplies by its px-per-unit scale and adds the stage centre.
 */

export interface ViewState {
  /** Turn about the vertical axis of the plane (radians, free). */
  yaw: number;
  /** Angle from looking straight down (0) to edge-on (π/2). */
  pitch: number;
  /** Multiplies the world's own scale: 2 = twice as close. */
  zoom: number;
  /** Where the camera looks, as an offset from the world's own centre (world units, 3D). */
  tx: number; ty: number; tz: number;
  /** What a one-finger / left drag does in worlds that have another drag (solar's throw). */
  tool: "look" | "throw";
}

export const PITCH_MAX = Math.PI / 2;
export const ZOOM_MIN = 0.08, ZOOM_MAX = 40;

/** The three framings in the view bar. "tilted" is the galaxy stage's old fixed view (cos ≈ 0.77). */
export const PITCHES = { top: 0, tilted: Math.acos(0.77), edge: PITCH_MAX } as const;
export type PitchPreset = keyof typeof PITCHES;

export const defaultView = (pitch = 0): ViewState => ({ yaw: 0, pitch, zoom: 1, tx: 0, ty: 0, tz: 0, tool: "look" });

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Keep a view inside its limits (after any gesture). */
export function settle(v: ViewState): ViewState {
  v.pitch = clamp(v.pitch, 0, PITCH_MAX);
  v.zoom = clamp(v.zoom, ZOOM_MIN, ZOOM_MAX);
  v.yaw = ((v.yaw % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;
  return v;
}

/**
 * Project a point (offset from the world centre, world units) onto the screen plane.
 * Returns [u, v, depth]: u right, v down (world units, before the world's scale), depth towards the viewer.
 */
export function project(v: ViewState, x: number, y: number, z: number): [number, number, number] {
  const dx = x - v.tx, dy = y - v.ty, dz = z - v.tz;
  const c = Math.cos(v.yaw), s = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  const x1 = dx * c - dy * s, y1 = dx * s + dy * c;
  return [x1, y1 * cp - dz * sp, y1 * sp + dz * cp];
}

/** A screen-plane vector (u right, v down, world units) as a world vector — for panning. */
export function screenVec(v: ViewState, u: number, w: number): [number, number, number] {
  const c = Math.cos(v.yaw), s = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  const x1 = u, y1 = w * cp, z1 = -w * sp;
  return [x1 * c + y1 * s, -x1 * s + y1 * c, z1];
}

/**
 * The point on the plane z = 0 under a screen-plane position (u, v in world units from the stage centre),
 * or null when the plane is seen almost edge-on there. Used by solar's throw.
 */
export function toPlane(v: ViewState, u: number, w: number): [number, number] | null {
  const c = Math.cos(v.yaw), s = Math.sin(v.yaw), cp = Math.cos(v.pitch), sp = Math.sin(v.pitch);
  if (cp < 0.08) return null;
  // On the ray through (u, w): x1 = u, y1·cp − z1·sp = w, with world z = tz + z1 = 0 → z1 = −tz.
  const z1 = -v.tz, y1 = (w + z1 * sp) / cp, x1 = u;
  return [v.tx + x1 * c + y1 * s, v.ty - x1 * s + y1 * c];
}

/** Turn by a drag of (dx, dy) px: 180° across a 600 px drag. */
export function orbit(v: ViewState, dx: number, dy: number): ViewState {
  v.yaw += (dx / 600) * Math.PI;
  v.pitch += (dy / 600) * Math.PI;
  return settle(v);
}

/** Move the camera with a drag of (dx, dy) px at `sc` px per world unit (the point under the finger follows it). */
export function pan(v: ViewState, dx: number, dy: number, sc: number): ViewState {
  const [x, y, z] = screenVec(v, -dx / sc, -dy / sc);
  v.tx += x; v.ty += y; v.tz += z;
  return v;
}

/**
 * Zoom by `f` keeping the point under (px, py) — px from the stage centre — where it is. `sc` is the stage's
 * px per world unit before the zoom.
 */
export function zoomAt(v: ViewState, f: number, px: number, py: number, sc: number): ViewState {
  const z0 = v.zoom, z1 = clamp(z0 * f, ZOOM_MIN, ZOOM_MAX), k = 1 - z0 / z1;
  const [x, y, z] = screenVec(v, (px / sc) * k, (py / sc) * k);
  v.tx += x; v.ty += y; v.tz += z;
  v.zoom = z1;
  return v;
}
