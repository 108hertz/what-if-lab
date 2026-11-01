# What-If Lab

Zoom from a proton to the observable universe, open a world, fork it with a "what if", and watch both
futures run side by side.

Worlds: **Galaxies** (Milky Way × Andromeda), **Solar system** (N-body gravity, throw your own planet),
**Earth** (climate), **Countries** (household economy), **Animals** (evolution & food chains),
**Child** (120 possible children of two parents), **Character** (100 parallel lives trying a habit).

Everything is rule-based and runs locally in the browser, with no AI calls and no external data.

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run typecheck` | TypeScript check |
| `npm test` | Simulation test suite (Vitest) |

Stack: Next.js 15 (App Router, static), React 19, TypeScript, Canvas 2D, Vitest.

See [`CLAUDE.md`](./CLAUDE.md) for architecture, the sandbox contract, and how to add a new world.
