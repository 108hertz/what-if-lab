# What-If Lab

Zoom from a proton to the observable universe, open a world, fork it with a "what if", and watch both
futures run side by side.

Worlds: **Galaxies** (Milky Way × Andromeda), **Solar system** (N-body gravity, throw your own planet),
**Earth** (climate), **Countries** (household economy), **Animals** (evolution & food chains),
**Child** (120 possible children of two parents), **Character** (100 parallel lives trying a habit).

Everything is rule-based and runs locally in the browser, with no AI calls and no external data.

**Business model:** free and ad-supported (side rails on wide screens only), with an optional
**Premium** plan at **$15 / year** (no ads + power tools). No backend of our own: static site on a CDN;
payments and licensing through a hosted merchant-of-record. See [`docs/PLAN.md`](./docs/PLAN.md).

## Getting started

Requires Node 20+.

```bash
npm ci
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

## Project layout

| Path | What |
| --- | --- |
| `app/`, `components/` | Next.js routes and React UI |
| `lib/sim/` | Framework-free simulation engine and worlds |
| `lib/scale/` | Scale explorer |
| `tests/` | Vitest suite |
| [`docs/`](./docs/README.md) | Plan, feature specs, change proposals, decisions (ADRs), design language |
| `.claude/skills/` | Claude Code skills: `plan-change`, `document-feature`, `darkroom-ui`, `add-sandbox` |
| [`CLAUDE.md`](./CLAUDE.md) | Architecture, sandbox contract, how to add a world |

## How we work

Features are documented in [`docs/features/`](./docs/features/README.md) and every non-trivial change
is planned in [`docs/changes/`](./docs/changes/README.md) **before** code is written. Hard-to-reverse
choices get a decision record in [`docs/decisions/`](./docs/decisions/). UI follows the
[Darkroom design system](./docs/design/design-system.md).

With Claude Code: `/plan-change <idea>` drafts a change doc, `/document-feature`, `/darkroom-ui` and
`/add-sandbox` cover the rest.
