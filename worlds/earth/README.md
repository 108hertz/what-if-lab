# Earth — world brief

This folder is the **earth** project (change 0008). Everything only this world needs lives here; it may use
the shared tokens (`app/globals.css`), primitives (`components/ui/`) and console blocks
(`components/console/`), and never imports another world.

| File | What |
| --- | --- |
| `sim.ts` | The rules: `Sandbox` (init, step, apply, read) and `draw`, which hands a plain `Look` to the scene. Deterministic. |
| `scene.ts` | The painted stage: Fjordvik, a fjord town under snowy peaks (change 0014). Framework-free canvas code. |
| `town.ts` | Numbers shared by model and picture: snow line, peak height, houses, storm tide. |
| `meta.ts` | Name and subtitle for the nav (loaded on every page). |
| `Console.tsx` | This world's screen. Today: `StandardConsole`. Must keep its ad slots (ADR 0007). |

## Who it's for

People trying to understand climate choices: emissions, methane, trees, carbon removal, geoengineering,
tipping points, and what they mean for one real-looking place.

## Model

0-D carbon/methane/temperature model ([change 0014](../../docs/changes/0014-earth-fjord-town.md)).
Time unit: years.

- **CO₂** (ppm): emissions × 0.45 airborne fraction minus uptake (∝ excess CO₂, forest cover, ocean and
  soil uptake), minus trees and CO₂ removal, plus permafrost and forest loss. 7.8 Gt CO₂ ≈ 1 ppm.
- **Methane** (ppb) relaxes to a source level with a 12-year lifetime; 35 % of the source follows fossil
  emissions, the rest is farms and landfills. Cuts and permafrost change the source.
- **Forcing** `F = 5.35·ln(C/280) + 0.036·(√M − √722) − 0.0165·E` (the last term is pollution haze
  from burning fuels: stopping emissions removes some cooling too). Temperature relaxes to
  `sens·F/3.71` with a 35-year lag. Volcano and sun-dimming are short-lived offsets on top.
- **Sea level**: thermal expansion + ice above 2 °C; with tipping points on, Greenland above 2 °C and
  West Antarctica above 3 °C add more.
- **Town**: snow line 1,600 m today, +150 m per °C (peak 2,400 m). 24 houses from the seafront up to
  6 m above it; a house floods when sea level + 0.6 m storm tide reaches it, unless a sea wall holds.

## Variables (restart the world)

CO₂ and methane in the air · yearly CO₂ emissions · where emissions are heading (grow 1 %/yr, level off,
slowly fall to zero over 120 years) · forest cover · climate sensitivity · ocean and soil uptake ·
tipping points on/off · your town's seafront height.

## What-ifs

| id | Label |
| --- | --- |
| `mix` | Build my own future: every "My future" setting at once |
| `zero` · `ev` · `double` | Stop all emissions · clean energy (−7 %/yr) · emissions double over 30 years |
| `trees` · `methane` · `dac` | A trillion trees · methane halved over 15 years · 10 Gt/yr CO₂ removal (ramps over 10 years) |
| `seawall` | A 3 m sea wall |
| `volcano` · `geo` | Supervolcano · sun-dimming aerosols for 30 years, then termination shock |
| `permafrost` · `amazon` · `melt` | Fast permafrost thaw (80 years) · Amazon to grassland (−20 % forest, 250 Gt CO₂) · West Antarctic collapse |

Changes stack (change 0024): each pick goes into `w.mods` with its year; emissions multipliers multiply, sinks,
sources, aerosol offsets and melt add, methane cuts multiply what is left, and the highest sea wall counts. One change
alone gives the same numbers as before. Any change can be ticked off and on again in "Your changes".

**My future settings** (`live`, read only by `mix`, copied into the world at the fork): change emissions by
−100…+100 % over 1–80 years, trees 0–1.5 trillion, methane cut 0–80 %, CO₂ removal 0–20 Gt/yr, sun-dimming
0–100 % (0–2 W/m²), sea wall 0–5 m.

## Metrics

Warming (°C) · Sea level (m) · CO₂ (ppm) · Crops (index) · Snow (% of today's snowy slope) · Flooding (% of houses).

## What "excellent" means here

- The stage reads as a real place at a glance: snowy peaks, a glacier, forest, farms, a harbour town, a fjord
  that reflects it all. Nothing on it is decoration only; every part shows a model number.
- Motion is calm at every speed: clouds, waves, boats, gulls and smoke run on a renderer clock; model
  values glide (250 ms) after a fork or restart; reduced motion holds still.
- Combining levers is one click: "Build my own future" is first in Ask.
- Narrow stages (phones, export side-by-side halves) keep the town in frame (the scene is painted wider and panned to the town).
