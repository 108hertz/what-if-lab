import type { AnySandbox, BaseWorld, Params } from "./types";
import type { Ref, Values } from "@/lib/i18n/message";
import { numberFormat } from "@/lib/i18n/message";
import { pageT } from "@/lib/i18n/page";

export const TAU = Math.PI * 2;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const bump = (a: number, c: number, s: number) => Math.exp(-(((a - c) / s) ** 2));
export const sig = (x: number) => 1 / (1 + Math.exp(-x));

/** Deterministic mulberry32. State lives on the world so forks stay reproducible. */
export function rng(w: { rs: number }): number {
  w.rs = (w.rs + 0x6d2b79f5) | 0;
  let t = w.rs;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function gauss(w: { rs: number }): number {
  const u = rng(w) || 1e-9;
  const v = rng(w);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * v);
}

/**
 * Log an event by message key (relative to the world, e.g. "ev.escape") and values (change 0025).
 * With `once` it is logged at most once per world. Values must be plain data: numbers, strings, `ref()`s.
 */
export function note(w: BaseWorld, k: string, v?: Values, once?: string, t = w.t): void {
  if (once) {
    if (w.f[once]) return;
    w.f[once] = 1;
  }
  w.log.push(v ? { t, k, v } : { t, k });
}

/** A value that is itself a message of the same world (a planet's or a species' name), translated when shown. */
export const ref = (k: string, v?: Values): Ref => (v ? { k, v } : { k });

function hex(c: string): number[] {
  const s = c.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(s.substr(i, 2), 16));
}

/** Mix two #RRGGBB colours, t in 0..1. */
export function mix(a: string, b: string, t: number): string {
  const A = hex(a);
  const B = hex(b);
  const k = clamp(t, 0, 1);
  return "rgb(" + A.map((v, i) => Math.round(v + (B[i] - v) * k)).join(",") + ")";
}

/* ---------- formatting ---------- */

// Display only (change 0025): numbers and units follow the page's language (lib/i18n/page.ts); English in tests.
export const trim = (v: number) => String(Math.round(v * 10) / 10);
const r1 = (v: number) => Math.round(v * 10) / 10;

export function fmtNum(v: number | null | undefined, d = 0): string {
  if (v == null || !isFinite(v)) return "—";
  return numberFormat(pageT().tag, { minimumFractionDigits: d, maximumFractionDigits: d }).format(Number(v));
}

export function fmtYears(y: number): string {
  const a = Math.abs(y), t = pageT();
  if (a >= 1e9) return t("common.unit.gyr", { n: r1(y / 1e9) });
  if (a >= 1e6) return t("common.unit.myr", { n: Math.round(y / 1e6) });
  if (a >= 1e3) return t("common.unit.kyr", { n: r1(y / 1e3) });
  return t("common.unit.yr", { n: r1(y) });
}

export function fmtDur(t: number): string {
  const tr = pageT();
  if (t < 1 / 12) return tr("common.dur.days", { n: Math.round(t * 365) });
  if (t < 2) return tr("common.dur.months", { n: Math.round(t * 12) });
  return tr("common.dur.years", { n: r1(t) });
}

export const fmtCalendar = (t: number) => String(Math.round(2026 + t));

export function fmtLen(m: number): string {
  const units: [number, number, string][] = [
    [1e-12, 1e-15, "fm"], [1e-9, 1e-12, "pm"], [1e-6, 1e-9, "nm"], [1e-3, 1e-6, "µm"],
    [1e-2, 1e-3, "mm"], [1, 1e-2, "cm"], [1e3, 1, "m"], [1e9, 1e3, "km"], [1.5e14, 1.496e11, "AU"],
  ];
  for (const [lim, d, s] of units) {
    if (m < lim) {
      const v = m / d;
      return (v < 10 ? v.toPrecision(2) : fmtNum(v)) + " " + s;
    }
  }
  const ly = m / 9.46e15;
  return (ly < 10 ? ly.toPrecision(2) : fmtNum(ly)) + " light-years";
}

/** Read a numeric param that may be typed loosely. */
export const num = (p: Record<string, unknown>, k: string) => Number(p[k]);

/** Each control's starting value. */
export function defaultParams(sb: AnySandbox): Params {
  const p: Params = {};
  for (const c of sb.controls) if (c.type !== "heading") p[c.id] = c.val;
  return p;
}
