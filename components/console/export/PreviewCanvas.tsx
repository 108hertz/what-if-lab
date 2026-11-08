"use client";

import { useEffect, useRef, useState } from "react";
import { STAGE } from "@/lib/sim/draw";
import { FPS, Replay, clipFrames, clipPhase, keyMetric } from "@/lib/export/replay";
import type { Scrubber } from "@/lib/export/scrub";
import { SLIDE_SIZE, drawVideoFrame, paint, slideTitle, type ClipInfo, type LayerBox } from "@/lib/export/frame";
import { SIZES, type ExportStyle, type LayerId } from "@/lib/export/style";
import { Icon } from "../../ui/Icon";
import { pageT } from "@/lib/i18n/page";

const S = (k: string) => pageT()(`export.studio.${k}`);

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/**
 * The studio preview (change 0022): any frame of the clip, drawn by the same code that renders the file.
 * Drag a text layer to move it; arrow keys nudge the selected one. Plays at 30 fps when asked.
 */
export default function PreviewCanvas({ scrub, ready, style, slides, world, intro, selected, jump, onSelect, onMove }: {
  scrub: Scrubber;
  /** Bumps when the scrubber finishes its analysis. */
  ready: number;
  style: ExportStyle;
  slides: boolean;
  world: string;
  intro: string;
  selected: LayerId | null;
  /** Ask the preview to show a frame (changes `n` to repeat a jump). */
  jump: { frame: number; n: number } | null;
  onSelect: (id: LayerId) => void;
  onMove: (id: LayerId, x: number, y: number) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const ref = useRef<HTMLCanvasElement>(null);
  const boxes = useRef<LayerBox[]>([]);
  const drag = useRef<{ id: LayerId; px: number; py: number; x: number; y: number } | null>(null);
  const play = useRef<Replay | null>(null);
  const [fit, setFit] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const plan = scrub.plan;
  const total = clipFrames(plan);
  const [frame, setFrame] = useState(() => Math.min(total - 1, plan.intro + 15));
  const [playing, setPlaying] = useState(false);
  const size = slides ? SLIDE_SIZE : SIZES[style.size];

  useEffect(() => { setFrame((f) => Math.min(f, total - 1)); }, [total]);
  useEffect(() => { if (jump) { setPlaying(false); setFrame(Math.max(0, Math.min(total - 1, jump.frame))); } }, [jump, total]);

  // Fit the canvas inside its box at the output's aspect ratio
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const W = el.clientWidth, H = el.clientHeight;
      if (!W || !H) return;
      const k = Math.min(W / size.w, H / size.h);
      setFit({ w: Math.floor(size.w * k), h: Math.floor(size.h * k) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.w, size.h]);

  // Draw
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !fit.w) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(fit.w * dpr); cv.height = Math.round(fit.h * dpr);
    const ctx = cv.getContext("2d")!;
    const k = (fit.w / size.w) * dpr;
    ctx.setTransform(k, 0, 0, k, 0, 0);
    const a = scrub.result;
    let r: Replay;
    if (!a) r = new Replay(plan);
    else if (playing && play.current && clipPhase(plan, frame).at !== "intro") {
      r = play.current;
      const ph = clipPhase(plan, frame);
      r.seek(ph.at === "outro" ? plan.steps : a.map[ph.i]);
    } else r = scrub.at(frame);
    if (playing) play.current = r;
    const first = r.samples[r.samples.length - 1] ?? { t: plan.t0, ...r.read() };
    const summary = a?.summary ?? { end: first, metric: keyMetric(plan.sb, first), events: [] };
    const info: ClipInfo = { world, summary, samples: a?.samples };
    if (slides) {
      paint(style, () => slideTitle(ctx, { world, intro, plan, summary, samples: a?.samples ?? r.samples, index: 1, total: 1 }, a ? scrub.atStep(0) : r));
      boxes.current = [];
      return;
    }
    boxes.current = paint(style, () => drawVideoFrame(ctx, style, r, info, frame));
    const sel = boxes.current.find((b) => b.id === selected);
    if (sel) {
      ctx.save();
      ctx.strokeStyle = STAGE.signal; ctx.lineWidth = 1.5 / k * dpr; ctx.setLineDash([5, 4]);
      ctx.strokeRect(sel.x - 4, sel.y - 4, sel.w + 8, sel.h + 8);
      ctx.restore();
    }
  }, [scrub, ready, style, frame, selected, fit, size.w, slides, world, intro, plan, playing]);

  // Playback
  useEffect(() => {
    if (!playing) { play.current = null; return; }
    let raf = 0, last = performance.now(), acc = 0;
    const loop = (now: number) => {
      acc += ((now - last) / 1000) * FPS; last = now;
      if (acc >= 1) {
        const n = Math.floor(acc); acc -= n;
        setFrame((f) => {
          if (f + n >= total) { setPlaying(false); return total - 1; }
          return f + n;
        });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing, total]);

  const toLogical = (e: React.PointerEvent) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: ((e.clientX - rect.left) / rect.width) * size.w, y: ((e.clientY - rect.top) / rect.height) * size.h };
  };
  const hit = (x: number, y: number) => [...boxes.current].reverse().find((b) => x >= b.x - 6 && x <= b.x + b.w + 6 && y >= b.y - 6 && y <= b.y + b.h + 6);

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (slides) return;
    const p = toLogical(e);
    const b = hit(p.x, p.y);
    if (!b) return;
    onSelect(b.id);
    const l = style.layers[b.id];
    drag.current = { id: b.id, px: p.x, py: p.y, x: l.x, y: l.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setPlaying(false);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = toLogical(e);
    const d = drag.current;
    if (!d) { e.currentTarget.style.cursor = !slides && hit(p.x, p.y) ? "move" : "default"; return; }
    const r3 = (v: number) => Math.round(v * 1000) / 1000;
    onMove(d.id, r3(Math.min(1.1, Math.max(-0.1, d.x + (p.x - d.px) / size.w))), r3(Math.min(1.1, Math.max(-0.1, d.y + (p.y - d.py) / size.h))));
  };
  const up = () => { drag.current = null; };
  const key = (e: React.KeyboardEvent) => {
    if (!selected || slides) return;
    const step = e.shiftKey ? 0.05 : 0.01;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d) return;
    e.preventDefault();
    const l = style.layers[selected];
    onMove(selected, Math.round((l.x + d[0]) * 1000) / 1000, Math.round((l.y + d[1]) * 1000) / 1000);
  };

  return (
    <div className="studio-view">
      <div className="studio-canvas" ref={wrapRef}>
        <canvas
          ref={ref}
          style={{ width: fit.w, height: fit.h }}
          tabIndex={slides ? -1 : 0}
          role="img"
          aria-label={S(slides ? "preview.slides" : "preview.video")}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          onKeyDown={key}
        />
      </div>
      {!slides && (
        <div className="studio-scrub">
          <button type="button" className="iconbtn" aria-label={S(playing ? "preview.pause" : "preview.play")} disabled={!scrub.result}
            onClick={() => { if (!playing && frame >= total - 1) setFrame(0); setPlaying(!playing); }}>
            <Icon name={playing ? "pause" : "play"} size={18} />
          </button>
          <input type="range" min={0} max={total - 1} step={1} value={frame} aria-label={S("preview.frame")} disabled={!scrub.result}
            style={{ "--fill": `${(frame / Math.max(1, total - 1)) * 100}%` } as React.CSSProperties}
            onChange={(e) => { setPlaying(false); setFrame(parseInt(e.target.value, 10)); }} />
          <time className="studio-time">{scrub.result ? `${mmss(frame / FPS)} / ${mmss(total / FPS)}` : S("preview.preparing")}</time>
        </div>
      )}
    </div>
  );
}
