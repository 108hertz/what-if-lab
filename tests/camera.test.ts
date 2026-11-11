import { describe, expect, it } from "vitest";
import { PITCHES, defaultView, orbit, pan, project, screenVec, settle, toPlane, zoomAt } from "@/lib/sim/camera";

const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9);

describe("space camera (change 0036)", () => {
  it("default top view is the identity on the plane", () => {
    const [u, v, d] = project(defaultView(0), 3, -2, 0);
    near(u, 3); near(v, -2); near(d, 0);
  });

  it("default tilted view squashes y by 0.77 like the old galaxy stage", () => {
    const [u, v] = project(defaultView(PITCHES.tilted), 1, 1, 0);
    near(u, 1); near(v, 0.77);
  });

  it("toPlane undoes project on z = 0 at any angle and pan", () => {
    const v = { ...defaultView(0.9), yaw: 1.3, tx: 0.4, ty: -0.7, tz: 0.2 };
    const [u, w] = project(v, 2.5, -1.25, 0);
    const p = toPlane(v, u, w)!;
    near(p[0], 2.5); near(p[1], -1.25);
  });

  it("toPlane gives up edge-on", () => {
    expect(toPlane(defaultView(PITCHES.edge), 1, 1)).toBeNull();
  });

  it("screenVec moves along the screen and stays at zero depth", () => {
    const v = { ...defaultView(0.6), yaw: -0.8 };
    const [x, y, z] = screenVec(v, 0.3, -0.5);
    const [u, w, d] = project({ ...v, tx: 0, ty: 0, tz: 0 }, x, y, z);
    near(u, 0.3); near(w, -0.5); near(d, 0);
  });

  it("zoomAt keeps the point under the pointer", () => {
    const v = { ...defaultView(0.5), yaw: 0.4 }, sc = 50, px = 120, py = -60;
    const before = toPlane(v, px / sc, py / sc)!;
    zoomAt(v, 2, px, py, sc);
    const after = toPlane(v, px / (sc * 2), py / (sc * 2))!;
    near(after[0], before[0]); near(after[1], before[1]);
  });

  it("pan moves the content with the finger", () => {
    const v = defaultView(0), sc = 10;
    pan(v, 20, 0, sc);
    const [u] = project(v, 0, 0, 0);
    near(u * sc, 20);
  });

  it("clamps pitch and zoom", () => {
    const v = orbit(defaultView(0), 0, 99999);
    near(v.pitch, PITCHES.edge);
    v.zoom = 1e6; settle(v);
    expect(v.zoom).toBeLessThanOrEqual(40);
  });
});
