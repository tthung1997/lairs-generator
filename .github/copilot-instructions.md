# Copilot Instructions — Lairs Generator

## Build & Run

```bash
npm install        # Install dependencies
npm run dev        # Dev server at http://localhost:5173/lairs-generator/
npm run build      # Type-check (tsc -b) then Vite build → dist/
npm run lint       # ESLint (flat config, TS/TSX files only)
```

No test framework is configured. CI deploys to GitHub Pages via `.github/workflows/deploy.yml` (Node 22, `npm ci && npm run build`).

## Architecture

This is a client-side-only React + TypeScript app (Vite, no backend) that generates random legal lairs for the Lairs board game.

### Two layers: Generator (pure logic) and UI (React)

**`src/generator/`** — Pure TypeScript, zero React dependencies:
- **`types.ts`** — Core domain types (`Cell`, `Wall`, `Feature`, `Lair`, `GridSize`). Walls use only `'south' | 'east'` directions to avoid duplication.
- **`config.ts`** — `buildConfig(gridSize, wallCount)` factory creates `LairConfig`. Lookup tables for wall ranges, feature counts per grid size (base 6×6 vs big 8×6).
- **`generator.ts`** — `generateRandomLair()`: random placement + validation loop (up to 10,000 attempts). Uses Fisher-Yates shuffle. No backtracking.
- **`graph.ts`** — `buildAdjacencyGraph()` and `getAllInternalWalls()`. Uses `cellKey()` ("row,col" string) for O(1) map lookups.
- **`validator.ts`** — Two checks: (1) BFS reachability from Start, (2) Peril Rule via state-space BFS tracking `{cell, monstersHit, trapsHit}`.
- **`serializer.ts`** — Encodes/decodes lairs to/from URL hash fragments. Single-char mappings (`s`=start, `x`=exit, `c`=chest, `m`=monster, `t`=trap).

**`src/components/`** — React UI layer:
- All state lives in `App.tsx` via `useState` hooks (no Context, no Redux).
- Components are props-only controlled components.
- Grid renders via nested divs with dynamic CSS classes for walls/features.

### Data flow

1. On load: decode URL hash → lair, or generate fresh
2. User changes settings → generate new lair → update URL hash
3. URL hash is the persistence/sharing mechanism (no server)

## Conventions

- **CSS Modules** everywhere — `Component.module.css` files with scoped classes imported as `styles`.
- **Global CSS variables** in `src/index.css` (e.g., `--cell-size`).
- **Strict TypeScript** — no `any` types. All domain concepts use explicit interfaces from `types.ts`.
- **`cellKey(cell)`** — always use this helper to convert `{row, col}` to string keys for maps/sets.
- **`buildConfig()`** — always use this factory to create `LairConfig`, never construct manually.
- **Walls are south/east only** — never store north/west walls; the grid checks the neighbor cell's south/east wall instead.
- **Print support** — `@media print` styles exist; changes to layout should preserve print-friendliness.

## Game rules (domain context)

The generator must enforce three legality rules:
1. **Reachability** — every cell reachable from Start via orthogonal movement
2. **Completeness** — all features placed, walls within allowed range
3. **Peril Rule** — every Goal (Exit + Chests) has ≥1 path from Start passing through at most 1 Monster and 1 Trap

Full game rules, PRD, TDD, and implementation plan are in `docs/`.
