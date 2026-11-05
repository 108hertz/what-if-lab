import { TAU } from "@/lib/sim/core";
import { football, holdItem, type Ctx } from "./people";

/**
 * Small things on the child stage (change 0019): what a change brings into the room, and what goes on the shelf when it
 * stops. Each draws standing on (x, y), about `s` tall. Simple shapes, no text.
 */
export type Thing =
  | "ball" | "violin" | "book" | "books" | "tablet" | "laptop" | "trophy" | "globe" | "apple" | "mask" | "broom" | "moon"
  | "suitcase" | "boots" | "beachball" | "briefcase" | "star" | "tent" | "plate";

export function drawThing(c: Ctx, k: Thing, x: number, y: number, s: number, t = 0) {
  c.save();
  c.lineCap = "round"; c.lineJoin = "round";
  switch (k) {
    case "ball": football(c, x, y - s * 0.35, s * 0.35); break;
    case "violin": holdItem(c, "violin", x, y - s * 0.4, s * 0.55, t); break;
    case "book": holdItem(c, "book", x, y - s * 0.35, s * 0.45, t); break;
    case "tablet": holdItem(c, "tablet", x, y - s * 0.1, s * 0.6, t); break;
    case "books": {
      const cols = ["#C8553D", "#5B8BD0", "#A3CF7A", "#E2B26B"];
      for (let i = 0; i < 4; i++) { c.fillStyle = cols[i]; c.fillRect(x - s * 0.4 + i * s * 0.2, y - s * (0.7 + (i % 2) * 0.12), s * 0.17, s * (0.7 + (i % 2) * 0.12)); }
      break;
    }
    case "laptop": {
      c.fillStyle = "#2A2C34"; c.beginPath(); c.roundRect(x - s * 0.45, y - s * 0.62, s * 0.9, s * 0.55, 2); c.fill();
      c.fillStyle = "rgba(163,207,122,.7)"; c.fillRect(x - s * 0.38, y - s * 0.56, s * 0.76, s * 0.43);
      c.fillStyle = "#3A3C44"; c.fillRect(x - s * 0.55, y - s * 0.08, s * 1.1, s * 0.08);
      break;
    }
    case "trophy": {
      c.fillStyle = "#E2B26B";
      c.beginPath(); c.moveTo(x - s * 0.35, y - s); c.lineTo(x + s * 0.35, y - s); c.quadraticCurveTo(x + s * 0.32, y - s * 0.45, x, y - s * 0.4); c.quadraticCurveTo(x - s * 0.32, y - s * 0.45, x - s * 0.35, y - s); c.fill();
      c.fillRect(x - s * 0.06, y - s * 0.42, s * 0.12, s * 0.25); c.fillRect(x - s * 0.25, y - s * 0.18, s * 0.5, s * 0.18);
      c.strokeStyle = "#E2B26B"; c.lineWidth = Math.max(1, s * 0.07);
      c.beginPath(); c.arc(x - s * 0.36, y - s * 0.82, s * 0.13, Math.PI * 0.5, Math.PI * 1.5); c.arc(x + s * 0.36, y - s * 0.82, s * 0.13, Math.PI * 1.5, Math.PI * 0.5); c.stroke();
      break;
    }
    case "globe": {
      c.fillStyle = "#3E6E9A"; c.beginPath(); c.arc(x, y - s * 0.6, s * 0.36, 0, TAU); c.fill();
      c.fillStyle = "#6FA05A"; c.beginPath(); c.ellipse(x - s * 0.1, y - s * 0.68, s * 0.14, s * 0.1, 0.4, 0, TAU); c.ellipse(x + s * 0.13, y - s * 0.5, s * 0.1, s * 0.13, -0.3, 0, TAU); c.fill();
      c.fillStyle = "#5A4636"; c.fillRect(x - s * 0.04, y - s * 0.25, s * 0.08, s * 0.2); c.fillRect(x - s * 0.22, y - s * 0.06, s * 0.44, s * 0.06);
      break;
    }
    case "apple": {
      c.fillStyle = "#C8453D"; c.beginPath(); c.arc(x - s * 0.12, y - s * 0.3, s * 0.24, 0, TAU); c.arc(x + s * 0.12, y - s * 0.3, s * 0.24, 0, TAU); c.fill();
      c.strokeStyle = "#5A3A20"; c.lineWidth = Math.max(1, s * 0.06); c.beginPath(); c.moveTo(x, y - s * 0.5); c.lineTo(x + s * 0.04, y - s * 0.68); c.stroke();
      c.fillStyle = "#6FA05A"; c.beginPath(); c.ellipse(x + s * 0.14, y - s * 0.62, s * 0.1, s * 0.05, -0.5, 0, TAU); c.fill();
      break;
    }
    case "mask": {
      c.fillStyle = "#E9DDC8"; c.beginPath(); c.ellipse(x, y - s * 0.5, s * 0.32, s * 0.4, 0, 0, TAU); c.fill();
      c.fillStyle = "#1A120B"; c.beginPath(); c.ellipse(x - s * 0.12, y - s * 0.58, s * 0.07, s * 0.05, 0, 0, TAU); c.ellipse(x + s * 0.12, y - s * 0.58, s * 0.07, s * 0.05, 0, 0, TAU); c.fill();
      c.strokeStyle = "#1A120B"; c.lineWidth = Math.max(1, s * 0.05); c.beginPath(); c.arc(x, y - s * 0.42, s * 0.14, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      break;
    }
    case "broom": {
      c.strokeStyle = "#8A6A44"; c.lineWidth = Math.max(1.5, s * 0.07); c.beginPath(); c.moveTo(x + s * 0.2, y - s * 1.3); c.lineTo(x - s * 0.05, y - s * 0.3); c.stroke();
      c.fillStyle = "#C9A15A"; c.beginPath(); c.moveTo(x - s * 0.18, y - s * 0.36); c.lineTo(x + s * 0.08, y - s * 0.3); c.lineTo(x + s * 0.12, y); c.lineTo(x - s * 0.34, y); c.fill();
      break;
    }
    case "moon": {
      c.fillStyle = "#5A4636"; c.fillRect(x - s * 0.42, y - s * 0.84, s * 0.84, s * 0.7);
      c.fillStyle = "#1E2440"; c.fillRect(x - s * 0.36, y - s * 0.78, s * 0.72, s * 0.58);
      c.fillStyle = "#F2E2B0"; c.beginPath(); c.arc(x - s * 0.04, y - s * 0.5, s * 0.17, 0, TAU); c.fill();
      c.fillStyle = "#1E2440"; c.beginPath(); c.arc(x + s * 0.04, y - s * 0.55, s * 0.15, 0, TAU); c.fill();
      break;
    }
    case "suitcase": {
      c.fillStyle = "#7A5A3A"; c.beginPath(); c.roundRect(x - s * 0.45, y - s * 0.7, s * 0.9, s * 0.7, s * 0.08); c.fill();
      c.strokeStyle = "#4A3420"; c.lineWidth = Math.max(1, s * 0.06); c.beginPath(); c.roundRect(x - s * 0.15, y - s * 0.86, s * 0.3, s * 0.18, s * 0.06); c.stroke();
      c.fillStyle = "#E2B26B"; c.fillRect(x - s * 0.25, y - s * 0.5, s * 0.18, s * 0.12);
      break;
    }
    case "boots": {
      c.fillStyle = "#4E7A3E";
      for (const d of [-0.2, 0.18]) { c.beginPath(); c.roundRect(x + d * s - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5, s * 0.04); c.roundRect(x + d * s - s * 0.08, y - s * 0.12, s * 0.28, s * 0.12, s * 0.04); c.fill(); }
      break;
    }
    case "beachball": {
      const r = s * 0.36, cy = y - r, cols = ["#E07A5F", "#F2EDE4", "#7FB2F8", "#F2EDE4", "#E2B26B", "#F2EDE4"];
      for (let i = 0; i < 6; i++) { c.fillStyle = cols[i]; c.beginPath(); c.moveTo(x, cy); c.arc(x, cy, r, (i * TAU) / 6 + t * 0.2, ((i + 1) * TAU) / 6 + t * 0.2); c.fill(); }
      break;
    }
    case "briefcase": {
      c.fillStyle = "#3A2A1E"; c.beginPath(); c.roundRect(x - s * 0.4, y - s * 0.5, s * 0.8, s * 0.5, s * 0.06); c.fill();
      c.strokeStyle = "#3A2A1E"; c.lineWidth = Math.max(1, s * 0.06); c.beginPath(); c.roundRect(x - s * 0.13, y - s * 0.64, s * 0.26, s * 0.16, s * 0.05); c.stroke();
      break;
    }
    case "star": {
      c.fillStyle = "#E2B26B"; c.beginPath();
      for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, r = i % 2 ? s * 0.18 : s * 0.42; c.lineTo(x + Math.cos(a) * r, y - s * 0.45 + Math.sin(a) * r); }
      c.closePath(); c.fill();
      break;
    }
    case "tent": {
      c.fillStyle = "#4E7A3E"; c.beginPath(); c.moveTo(x - s * 0.55, y); c.lineTo(x, y - s * 0.75); c.lineTo(x + s * 0.55, y); c.fill();
      c.fillStyle = "#24361C"; c.beginPath(); c.moveTo(x - s * 0.12, y); c.lineTo(x, y - s * 0.5); c.lineTo(x + s * 0.12, y); c.fill();
      break;
    }
    case "plate": {
      c.fillStyle = "#E9DDC8"; c.beginPath(); c.ellipse(x, y - s * 0.08, s * 0.4, s * 0.1, 0, 0, TAU); c.fill();
      c.fillStyle = "#C8853D"; c.beginPath(); c.ellipse(x, y - s * 0.12, s * 0.2, s * 0.06, 0, 0, TAU); c.fill();
      break;
    }
  }
  c.restore();
}

/** What each change brings into the room while it goes on, and leaves on the shelf when it stops. */
export const CHANGE_THING: Partial<Record<string, Thing>> = {
  sport: "ball", music: "violin", reading: "books", screen: "tablet", coding: "laptop", drama: "mask", nature: "boots",
  scouts: "tent", chores: "broom", sleep: "moon", language: "globe", travel: "suitcase", move: "suitcase", prize: "trophy",
  teacher: "apple", summer: "beachball", longhours: "briefcase", leader: "star", dinners: "plate", volunteer: "star",
};
