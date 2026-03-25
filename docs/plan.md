# Lairs — Random Lair Generator

## Problem
Setting up a lair in the Lairs board game is time-consuming. Each player must manually place walls, monsters, traps, chests, a start tile, and an exit tile on a grid while following three strict legality rules. We need a tool to **instantly generate random, valid lairs** so players can jump straight into the game.

## Approach
Build a **client-side web app** (React + TypeScript + Vite) that generates randomized, rule-compliant lairs. No backend needed — all logic runs in the browser. Deploy to **GitHub Pages** from the existing repo.

---

## Lair Rules Summary (from rulebook)

### Grid Sizes
| Variant | Grid | Spaces | Walls Available | Monsters | Traps | Chests | Start | Exit |
|---------|------|--------|-----------------|----------|-------|--------|-------|------|
| Base (6×6) | A–F × 1–6 | 36 | 17–20 | 3 | 3 | 3 | 1 | 1 |
| Big (8×6)  | A–H × 1–6 | 48 | 20–25 | 4 | 4 | 4 | 1 | 1 |

### Three Legality Rules
1. **No Unreachable Spaces** — Every space must be reachable from the Start via orthogonal movement (no diagonals, no passing through walls).
2. **Use (Almost) Everything** — All features must be placed. Walls can be reduced within the allowed range.
3. **The Peril Rule** — From Start to each Goal (Exit + all Chests), there must be at least one path that passes through at most one Monster AND at most one Trap (one of each is fine; two of the same type is not).

### Feature Placement
- One feature per space maximum
- Features: Start, Exit, Chests (Goals), Monsters, Traps (Hazards)
- Walls go on borders between spaces (internal edges only; outer perimeter is always walled)

### Multiplayer Rules (Deeper Dungeons Expansion)

| Param | 2 Explorers | 3 Explorers |
|-------|-------------|-------------|
| Grid per level | 6×6 (Base) | 8×6 (Big) |
| Levels | 2 (Upper + Lower) | 2 (Upper + Lower) |
| Walls (total) | 34–40 | 42–50 |
| Monsters | 6 | 8 |
| Traps | 6 | 8 |
| Chests | 6 | 8 |
| Starts | 2 | 3 |
| Exit | 1 | 1 |
| Ladder pairs | 1–2 (random) | 1–2 (random) |

Additional rules:
- Ladders connect levels at matching coordinates (neutral features)
- Every goal must have a peril-rule-legal path to at least one start (through ladders)
- Every start must reach at least one other start

---

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | **React 18 + TypeScript** | Type safety, component model fits grid UI |
| Build | **Vite** | Fast dev server, optimized static builds |
| Styling | **CSS Modules** | Scoped styles, no extra deps, simple for a grid-heavy UI |
| Deployment | **GitHub Pages** via GitHub Actions | Free, already have the repo, auto-deploy on push |

No backend, database, or external APIs needed.

---

## UI Design

### Layout (single page, responsive)
```
┌──────────────────────────────────────────┐
│  🏰 Lairs — Random Lair Generator       │
├──────────────────────────────────────────┤
│                                          │
│   [6×6]  [8×6]     Walls: [===17===] 20 │
│                                          │
│      1   2   3   4   5   6              │
│   ┌───┬───┬───┬───┬───┬───┐            │
│ A │ S │   │   ║ M │   │   │            │
│   ├───┼───┼───╫───┼───┼───┤            │
│ B │   ║   │ T │   │   ║ C │            │
│   ├───╫───┼───┼───┼───╫───┤            │
│ C │   │   │   │   ║   │   │            │
│   ├───┼───┼───┼───╫───┼───┤            │
│ ...                                      │
│                                          │
│   [ 🎲 Generate New Lair ]               │
│                                          │
│   Legend: S=Start  X=Exit  C=Chest       │
│           M=Monster  T=Trap              │
│                                          │
├──────────────────────────────────────────┤
│  Walls: 18/20  │  Features: 11/11  │ ✅  │
└──────────────────────────────────────────┘
```

### Key UI Elements
- **Grid size toggle** — switch between 6×6 (Base) and 8×6 (Big)
- **Wall count slider** — adjust within allowed range (17–20 or 20–25)
- **Lair grid** — visual grid with row/column labels, walls as thick borders, feature icons in cells
- **Generate button** — prominent, produces a new random valid lair
- **Status bar** — shows component counts and validity indicator
- **Legend** — icon reference

### Visual Style
- Clean, minimal, board-game-inspired color palette
- Distinct colors/icons per feature type (e.g., red for monsters, blue for traps, gold for chests, green for start/exit)
- Responsive: works on tablets at the game table
- Print-friendly view option for physical reference during setup

---

## Generator Algorithm

### Strategy: Constrained Random Generation with Validation
The grids are small enough (36–48 spaces, 60–82 wall slots) that a generate-and-validate loop is efficient.

### Steps
1. **Place Features Randomly**
   - Pick random distinct spaces for: Start, Exit, Chests, Monsters, Traps
2. **Place Walls Randomly**
   - Pick N random internal wall positions (N from the wall count slider)
3. **Validate**
   - **Reachability check**: BFS/DFS from Start — all spaces must be reachable
   - **Peril Rule check**: For each Goal (Exit + Chests), BFS/DFS from Start tracking (monstersOnPath, trapsOnPath) state. A path is "legal" if it reaches the Goal having passed through ≤1 Monster and ≤1 Trap. At least one legal path must exist per Goal.
4. **Retry if invalid** — regenerate from step 1. Typical success rate should be reasonable given the constraint space; add a retry cap (e.g., 10,000 attempts) with a fallback message.

### Peril Rule Validation (detail)
Use BFS where each state is `(space, monstersEncountered, trapsEncountered)` capped at (0|1, 0|1) with (2,*) or (*,2) pruned. If any Goal is reached in the BFS, it has a legal path.

---

## Additional Features

1. **Print View** — CSS `@media print` layout to print the lair grid cleanly for physical reference during setup
2. **Share via URL** — Encode lair state (grid size, wall positions, feature positions) in a URL hash/query param so players can share specific lairs
3. **Lair Stats** — Show basic stats: number of dead ends, longest shortest-path to a goal, etc. Fun flavor text.
4. **Seed-based Generation** — Optional seed input for reproducible lairs (useful for tournaments or sharing)
5. **Exploration Mode (Fog of War)** — Toggle between Full View and Exploration mode for solo/co-op play. In Exploration mode, only the Start cell is revealed; players click adjacent reachable cells to reveal them one-by-one using a two-tap pattern (select → confirm). Includes Reset Exploration, Reveal All, and exploration progress display. URL sharing preserves exploration state.

---

## Project Structure

```
lairs/
├── src/
│   ├── components/
│   │   ├── App.tsx                 # Root component, state management
│   │   ├── Header.tsx              # Title, branding
│   │   ├── Controls.tsx            # Grid size toggle, wall slider, generate button
│   │   ├── LairGrid.tsx            # Grid visualization (the main visual)
│   │   ├── LairGrid.module.css     # Grid styles
│   │   ├── StatusBar.tsx           # Component counts, validity
│   │   ├── Legend.tsx              # Feature icon legend
│   │   ├── MultiplayerView.tsx    # Two-level multiplayer lair display
│   │   └── MultiplayerView.module.css # Multiplayer view styles
│   ├── generator/
│   │   ├── types.ts                # Grid, Wall, Feature, LairConfig types
│   │   ├── generator.ts            # Random lair generation logic
│   │   ├── validator.ts            # Reachability + Peril Rule validation
│   │   ├── serializer.ts           # URL encoding/decoding for sharing
│   │   └── exploration.ts         # Exploration mode logic
│   ├── main.tsx                    # Entry point
│   └── index.css                   # Global styles
├── public/
│   └── favicon.ico
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Pages CI/CD
└── docs/
    ├── plan.md
    ├── PRD.md
    ├── TDD.md
    └── LRS_rules_basegame_web.pdf  # Game rulebook
```

---

## Implementation Todos

1. **project-setup** — Initialize Vite + React + TypeScript project, configure for GitHub Pages
2. **core-types** — Define TypeScript types for grid, walls, features, lair config
3. **generator-logic** — Implement random lair generation (feature placement + wall placement)
4. **validator-logic** — Implement reachability check (BFS) and Peril Rule check
5. **lair-grid-ui** — Build the grid visualization component with walls and feature icons
6. **controls-ui** — Build controls: grid size toggle, wall count slider, generate button
7. **app-integration** — Wire up state management, connect generator to UI
8. **url-sharing** — Implement lair state serialization/deserialization for URL sharing
9. **print-styles** — Add print-friendly CSS
10. **github-pages-deploy** — Set up GitHub Actions workflow for auto-deployment
11. **exploration-logic** — Build `src/generator/exploration.ts` with `getExplorableCells()` pure function using wall-aware adjacency
12. **exploration-app-state** — Add `explorationMode`, `revealedCells`, `selectedCell` state to `App.tsx` with mode toggle and auto-reset on generation
13. **exploration-controls** — Add Full View / Explore mode toggle, Reset Exploration, and Reveal All buttons to `Controls.tsx`
14. **exploration-grid-rendering** — Modify `LairGrid.tsx` for fog of war: hidden (dark), explorable (?/pulse), selected (glow), revealed (normal) cell states
15. **exploration-fog-css** — Add CSS classes for fog states, pulse animation, selected highlight, print support
16. **exploration-cell-interaction** — Implement two-tap reveal pattern: first tap selects, second tap reveals, with edge case handling
17. **exploration-url-serialization** — Extend URL hash format with exploration flag and revealed cells (backward compatible)
18. **exploration-status** — Update `StatusBar.tsx` to show exploration progress ("12/36 explored")
19. **multiplayer-types** — Add `ExplorerCount`, `LairLevel`, `LadderPair`, `MultiplayerLairConfig`, `MultiplayerLair` types
20. **multiplayer-config** — Add `MULTIPLAYER_WALL_RANGES`, `DEFAULT_MULTIPLAYER_WALL_COUNT`, `buildMultiplayerConfig()`
21. **multiplayer-graph** — Add `levelCellKey()`, `parseLevelCell()`, `buildMultiplayerAdjacencyGraph()` for cross-level adjacency
22. **multiplayer-validator** — Add `isValidMultiplayerLair()` with reachability, peril rule, and start-to-start checks
23. **multiplayer-generator** — Add `generateValidMultiplayerLair()` with ladder placement, cross-level feature distribution
24. **multiplayer-serializer** — Add `encodeMultiplayerLair()`, `decodeMultiplayerLair()`, `isMultiplayerHash()` with `mp` prefix format
25. **multiplayer-ui-controls** — Add Lair Type toggle (Standard/Multiplayer), Explorer count selector, dynamic wall range
26. **multiplayer-ui-view** — Create `MultiplayerView` component: two `LairGrid`s side-by-side (desktop) / stacked (mobile)
27. **multiplayer-ui-grid** — Add ladder cell rendering to `LairGrid` with colored directional arrows
28. **multiplayer-app-state** — Integrate multiplayer state management, URL sync, exploration with ladder traversal
29. **multiplayer-exploration** — Add `getMultiplayerStartCellKeys()`, `getLadderCellKeys()` helpers
30. **multiplayer-statusbar** — Update StatusBar for multiplayer stats (per-level walls, ladder count)
31. **multiplayer-legend** — Add ladder entries to Legend in multiplayer mode
