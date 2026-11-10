/**
 * A speed in words (change 0035): "3 mo/s" → "3 months every second". The amount and unit are read from the world's
 * English speed label (data, never shown); the words come from the page's language (`console.speed.<unit>`, with plurals).
 */
export type SpeedUnit = "d" | "wk" | "mo" | "yr" | "myr" | "gyr";

const UNITS: Record<string, SpeedUnit> = { d: "d", wk: "wk", mo: "mo", yr: "yr", Myr: "myr", Gyr: "gyr" };

export function speedParts(label: string): { n: number; unit: SpeedUnit } | null {
  const m = /^\s*([\d.]+|½)\s*(d|wk|mo|yr|Myr|Gyr)\/s\s*$/.exec(label);
  if (!m) return null;
  const n = m[1] === "½" ? 0.5 : Number(m[1]);
  const unit = UNITS[m[2]];
  if (!isFinite(n) || n <= 0) return null;
  // Part of a year reads better in months ("6 months", not "0.5 years")
  if (unit === "yr" && n < 1) return { n: Math.round(n * 12), unit: "mo" };
  return { n, unit };
}
