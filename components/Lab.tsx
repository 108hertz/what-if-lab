"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Mode } from "@/lib/sim/registry";
import { modeHref } from "@/lib/sim/registry";
import { getEngine, getScaleView, prepareSandbox } from "./engines";
import { setCanvasFont } from "@/lib/sim/draw";
import Tabs from "./Tabs";
import Transport from "./Transport";
import ScaleTransport from "./ScaleTransport";
import { InfoBlocks, Readouts, TunePanel, WhatIfList, WorldHeader } from "./panels";
import Dock from "./Dock";
import { useMedia } from "./useMedia";
import ScalePanel from "./ScalePanel";
import HistoryChart from "./HistoryChart";
import Timeline from "./Timeline";
import ThemeToggle from "./ThemeToggle";

const UI_REFRESH_MS = 300;

function fitCanvas(c: HTMLCanvasElement): [number, number] {
  const dpr = window.devicePixelRatio || 1, w = c.clientWidth, h = c.clientHeight;
  if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
    c.width = Math.round(w * dpr);
    c.height = Math.round(h * dpr);
  }
  c.getContext("2d")!.setTransform(dpr, 0, 0, dpr, 0, 0);
  return [w, h];
}

export default function Lab({ mode }: { mode: Mode }) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef<HTMLInputElement>(null);
  const zoomOutRef = useRef<HTMLOutputElement>(null);
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const engine = mode === "scale" ? null : getEngine(mode);
  const scale = getScaleView();

  const openSandbox = useCallback((ref: string) => router.push(modeHref(prepareSandbox(ref))), [router]);

  // Canvas text uses the page font (next/font gives it a generated family name).
  useEffect(() => setCanvasFont(getComputedStyle(document.body).fontFamily), []);

  // Render loop
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    let raf = 0, last = performance.now();
    const frame = (ts: number) => {
      const dt = Math.min(0.05, (ts - last) / 1000);
      last = ts;
      const [W, H] = fitCanvas(cv);
      if (engine) {
        engine.tick(dt);
        engine.draw(ctx, W, H);
      } else {
        if (scale.draw(ctx, W, H, dt)) rerender();
        if (zoomRef.current && document.activeElement !== zoomRef.current) zoomRef.current.value = String(scale.zt);
        if (zoomOutRef.current) zoomOutRef.current.textContent = `10^${scale.z.toFixed(1)} m`;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [engine, scale]);

  // Periodic UI refresh (readouts, chart, timeline)
  useEffect(() => {
    if (!engine) return;
    const id = setInterval(rerender, UI_REFRESH_MS);
    return () => clearInterval(id);
  }, [engine]);

  // Pointer + wheel interaction on the stage
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    const pts = new Map<number, { x: number; y: number }>();
    let press: { x: number; z: number; moved: number } | null = null;
    let pinch: { d: number; z: number } | null = null;
    const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top, W: r.width, H: r.height }; };

    const onWheel = (e: WheelEvent) => { if (engine) return; e.preventDefault(); scale.zoomBy(e.deltaY * 0.0018); };
    const onDown = (e: PointerEvent) => {
      const { x, y, W, H } = local(e);
      pts.set(e.pointerId, { x, y });
      cv.setPointerCapture(e.pointerId);
      if (!engine) {
        press = { x, z: scale.zt, moved: 0 };
        if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: scale.zt }; }
        return;
      }
      if (engine.sb.key === "solar") {
        const rc = engine.rects(W, H).find((q) => x >= q.x && x <= q.x + q.w && y >= q.y && y <= q.y + q.h);
        if (rc) engine.ui.drag = { alt: rc.alt, ox: rc.x, oy: rc.y, x0: x - rc.x, y0: y - rc.y, x1: x - rc.x, y1: y - rc.y };
      }
    };
    const onMove = (e: PointerEvent) => {
      const { x, y } = local(e);
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x, y });
      if (!engine) {
        if (pinch && pts.size === 2) { const [a, b] = [...pts.values()]; scale.zoomTo(pinch.z - Math.log10(Math.hypot(a.x - b.x, a.y - b.y) / pinch.d) * 1.5); return; }
        if (press && e.buttons) { const dx = x - press.x; press.moved = Math.max(press.moved, Math.abs(dx)); scale.zoomTo(press.z - dx / 220); }
        const h = scale.hitTest(x, y);
        scale.hover = h;
        cv.style.cursor = h?.sandbox ? "pointer" : "grab";
        return;
      }
      const d = engine.ui.drag;
      if (d) { d.x1 = x - d.ox; d.y1 = y - d.oy; }
    };
    const onUp = (e: PointerEvent) => {
      const { x, y } = local(e);
      pts.delete(e.pointerId);
      if (!engine) {
        if (pts.size < 2) pinch = null;
        if (press && press.moved < 6 && e.type === "pointerup") { const h = scale.hitTest(x, y); if (h?.sandbox) openSandbox(h.sandbox); }
        press = null;
        return;
      }
      const d = engine.ui.drag;
      if (d && e.type === "pointerup") {
        const cam = engine.ui.cams[d.alt ? 1 : 0];
        if (cam && Math.hypot(d.x1 - d.x0, d.y1 - d.y0) > 2) {
          const k = 4 / cam.sc;
          engine.ui.pending = { x: cam.cx + (d.x0 - cam.W / 2) / cam.sc, y: cam.cy + (d.y0 - cam.H / 2) / cam.sc, vx: (d.x1 - d.x0) * k, vy: (d.y1 - d.y0) * k };
          if (d.alt && engine.alt) engine.applyToAlt("throw");
          else engine.fork("throw");
          rerender();
        }
      }
      engine.ui.drag = null;
    };
    cv.addEventListener("wheel", onWheel, { passive: false });
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointercancel", onUp);
    return () => {
      cv.removeEventListener("wheel", onWheel);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointercancel", onUp);
    };
  }, [engine, scale, openSandbox]);

  const desk = useMedia("(min-width: 1024px)");
  const wide = useMedia("(min-width: 1440px)");
  const touched = useRef(false);
  const [heroOff, setHeroOff] = useState(false);
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv || engine) return;
    const hide = () => { if (!touched.current) { touched.current = true; setHeroOff(true); } };
    cv.addEventListener("pointerdown", hide);
    cv.addEventListener("wheel", hide, { passive: true });
    return () => { cv.removeEventListener("pointerdown", hide); cv.removeEventListener("wheel", hide); };
  }, [engine]);

  const ask = engine && <><WorldHeader engine={engine} /><WhatIfList engine={engine} onChange={rerender} /></>;
  const now = engine && <Readouts engine={engine} />;
  const info = engine && <InfoBlocks engine={engine} />;
  const tune = engine && <TunePanel engine={engine} onChange={rerender} />;
  const chart = engine && <div className="chart-box"><HistoryChart engine={engine} /></div>;
  const log = engine && <div className="log-box"><h3 className="headline">Timeline</h3><Timeline engine={engine} /></div>;

  return (
    <div className={engine ? "app" : "app is-scale"}>
      <header className="nav">
        <div className="brand">
          <Link className="wordmark" href="/">What-If Lab</Link>
          <span className="micro credit">No AI · No live data · Same seed, same future</span>
        </div>
        <Tabs mode={mode} />
        <ThemeToggle />
      </header>
      <main className="console">
        {desk && engine ? <aside className="col ask scrolly">{ask}{!wide && now}{info}</aside> : null}
        <section className="centre">
          <div className="stage">
            <canvas ref={canvasRef} aria-label="Simulation stage" />
            {engine && <span className="micro edge" aria-hidden="true">What-If Lab · Seed {engine.seed}</span>}
            {!engine && (
              <div className={heroOff ? "hero hide" : "hero"} aria-hidden={heroOff}>
                <h1 className="display">What happens if…</h1>
                <p className="desc-lg">Zoom from a proton to the observable universe, ten times per step. Gold labels are live worlds: open one, ask it a question, and watch both futures run side by side.</p>
              </div>
            )}
          </div>
          {engine ? (
            <Transport engine={engine} onChange={rerender} />
          ) : (
            <ScaleTransport scale={scale} inputRef={zoomRef} outputRef={zoomOutRef} />
          )}
          {desk && engine ? <div className="results">{chart}{wide && <div className="now-box">{now}</div>}{log}</div> : null}
        </section>
        {desk ? (
          <aside className="col tune scrolly">
            {engine ? tune : <ScalePanel scale={scale} onOpen={openSandbox} />}
          </aside>
        ) : (
          <Dock
            key={mode}
            tabs={engine
              ? [["Ask", ask], ["Tune", tune], ["Read", <>{now}{info}{chart}</>], ["Log", log]]
              : [["In view", <ScalePanel key="s" scale={scale} onOpen={openSandbox} />]]}
          />
        )}
      </main>
    </div>
  );
}
