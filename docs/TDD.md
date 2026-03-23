# Technical Design Document (TDD)
# Lairs — Random Lair Generator

## 1. System Overview

### 1.1 Architecture
The application is a **single-page, client-side web app** with no backend. All lair generation, validation, and rendering logic runs in the browser.

```
┌─────────────────────────────────────────────────┐
│                    Browser                       │
│                                                  │
│  ┌──────────┐   ┌───────────┐   ┌────────────┐ │
│  │   React   │──▶│ Generator │──▶│ Validator  │ │
│  │    UI     │◀──│  Engine   │◀──│  Engine    │ │
│  └──────────┘   └───────────┘   └────────────┘ │
│       │                                    │     │
│       ▼                                    ▼     │
│  ┌──────────┐                      ┌───────────┐│
│  │URL Serial-│                      │   BFS/    ││
│  │  izer     │                      │  Graph    ││
│  └──────────┘                      └───────────┘│
└─────────────────────────────────────────────────┘
```

### 1.2 Tech Stack
| Component | Technology | Version |
|-----------|-----------|---------|
| Language | TypeScript | 5.x |
| UI Framework | React | 18.x |
| Build Tool | Vite | 5.x |
| Styling | CSS Modules | (built-in with Vite) |
| Deployment | GitHub Pages | via GitHub Actions |
| Package Manager | npm | 10.x |

### 1.3 Browser Support
- Chrome 90+, Firefox 90+, Safari 15+, Edge 90+
- ES2020 target (widely supported)

---

## 2. Data Model

### 2.1 Core Types

```typescript
// Grid coordinate system
type RowLabel = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
type ColLabel = 1 | 2 | 3 | 4 | 5 | 6;

interface Cell {
  row: number;    // 0-indexed internally (0–5 or 0–7)
  col: number;    // 0-indexed internally (0–5)
}

// Wall sits on a border between two adjacent cells
interface Wall {
  cell: Cell;                    // The cell "owning" this wall edge
  direction: 'south' | 'east';  // Only south/east to avoid duplicates
}

type FeatureType = 'start' | 'exit' | 'chest' | 'monster' | 'trap';

interface Feature {
  type: FeatureType;
  cell: Cell;
}

type GridSize = 'base' | 'big';

interface LairConfig {
  gridSize: GridSize;
  rows: number;           // 6 or 8
  cols: number;           // always 6
  wallCount: number;      // within allowed range
  monsters: number;       // 3 or 4
  traps: number;          // 3 or 4
  chests: number;         // 3 or 4
}

interface Lair {
  config: LairConfig;
  walls: Wall[];
  features: Feature[];
}
```

### 2.2 Wall Representation

Walls are placed on **internal edges** between adjacent cells. To avoid duplicates, each wall is stored as the **south** or **east** edge of a cell:

- A **south wall** on cell (r, c) blocks movement between (r, c) and (r+1, c)
- An **east wall** on cell (r, c) blocks movement between (r, c) and (r, c+1)

The outer perimeter is implicitly walled (never stored; always enforced).

**Total internal wall positions:**
| Grid | South Edges | East Edges | Total |
|------|------------|------------|-------|
| 6×6  | 5 × 6 = 30 | 6 × 5 = 30 | 60 |
| 8×6  | 7 × 6 = 42 | 8 × 5 = 40 | 82 |

### 2.3 Configuration Presets

```typescript
const CONFIGS: Record<GridSize, Omit<LairConfig, 'wallCount'>> = {
  base: { gridSize: 'base', rows: 6, cols: 6, monsters: 3, traps: 3, chests: 3 },
  big:  { gridSize: 'big',  rows: 8, cols: 6, monsters: 4, traps: 4, chests: 4 },
};

const WALL_RANGES: Record<GridSize, { min: number; max: number }> = {
  base: { min: 17, max: 20 },
  big:  { min: 20, max: 25 },
};
```

---

## 3. Generator Algorithm

### 3.1 Strategy: Generate-and-Validate Loop

The grid sizes (36–48 spaces, 60–82 wall slots) are small enough that a randomized generate-then-validate approach is practical. Each attempt is O(n) where n = number of spaces, making individual iterations very fast.

```
function generateValidLair(config: LairConfig): Lair {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const lair = generateRandomLair(config);
    if (isValidLair(lair)) {
      return lair;
    }
  }
  throw new Error("Failed to generate valid lair");
}
```

**MAX_ATTEMPTS**: 10,000 (empirically sufficient; each attempt takes microseconds).

### 3.2 Random Generation Step

```
function generateRandomLair(config: LairConfig): Lair {
  // 1. Collect all cell positions
  const allCells = getAllCells(config.rows, config.cols);

  // 2. Shuffle and assign features to distinct cells
  const shuffled = fisherYatesShuffle(allCells);
  const features: Feature[] = [];
  let idx = 0;
  features.push({ type: 'start', cell: shuffled[idx++] });
  features.push({ type: 'exit',  cell: shuffled[idx++] });
  for (let i = 0; i < config.chests; i++)
    features.push({ type: 'chest', cell: shuffled[idx++] });
  for (let i = 0; i < config.monsters; i++)
    features.push({ type: 'monster', cell: shuffled[idx++] });
  for (let i = 0; i < config.traps; i++)
    features.push({ type: 'trap', cell: shuffled[idx++] });

  // 3. Collect all internal wall positions, shuffle, pick N
  const allWallPositions = getAllInternalWalls(config.rows, config.cols);
  const shuffledWalls = fisherYatesShuffle(allWallPositions);
  const walls = shuffledWalls.slice(0, config.wallCount);

  return { config, walls, features };
}
```

### 3.3 Adjacency Graph

Before validation, build an adjacency graph from the grid and walls:

```
function buildAdjacencyGraph(lair: Lair): Map<string, string[]> {
  // For each cell, check all 4 orthogonal neighbors
  // A neighbor is adjacent if:
  //   1. It exists (not outside grid bounds)
  //   2. No wall blocks the edge between them
  // Key: "row,col" string for O(1) lookup
}
```

---

## 4. Validation Algorithm

### 4.1 Rule 1: No Unreachable Spaces

Standard BFS from the Start cell, traversing the adjacency graph. After BFS completes, verify every cell in the grid was visited.

```
function checkReachability(lair: Lair): boolean {
  const graph = buildAdjacencyGraph(lair);
  const start = lair.features.find(f => f.type === 'start')!.cell;
  const visited = bfs(graph, start);
  return visited.size === lair.config.rows * lair.config.cols;
}
```

**Complexity**: O(V + E) where V = spaces, E = edges ≈ 2V. Essentially O(n).

### 4.2 Rule 3: The Peril Rule

This is the most complex validation. We use a **state-space BFS** where each state encodes position AND hazard encounter counts.

```
type HazardState = {
  cell: Cell;
  monstersHit: 0 | 1;
  trapsHit: 0 | 1;
};
```

**Algorithm:**

```
function checkPerilRule(lair: Lair): boolean {
  const graph = buildAdjacencyGraph(lair);
  const featureMap = buildFeatureMap(lair);  // cell key → FeatureType
  const start = findStart(lair);
  const goals = findGoals(lair);  // Exit + all Chests

  // BFS through state space: (cell, monstersHit, trapsHit)
  // States where monstersHit=2 or trapsHit=2 are pruned (never enqueued)
  // State space size: V × 2 × 2 = 4V (at most 192 states for 8×6)

  const visited = new Set<string>();  // "row,col,m,t"
  const queue: HazardState[] = [];

  // Initialize: start cell may itself be a hazard (unlikely but handle it)
  const startHazard = getHazardCounts(start, featureMap);
  if (startHazard.monsters > 1 || startHazard.traps > 1) return false;
  queue.push({ cell: start, ...startHazard });

  while (queue.length > 0) {
    const state = queue.shift()!;
    const key = stateKey(state);
    if (visited.has(key)) continue;
    visited.add(key);

    for (const neighbor of graph.get(cellKey(state.cell))) {
      const nCell = parseCell(neighbor);
      const feature = featureMap.get(neighbor);
      let newMonsters = state.monstersHit;
      let newTraps = state.trapsHit;

      if (feature === 'monster') newMonsters++;
      if (feature === 'trap') newTraps++;

      // Prune illegal states
      if (newMonsters > 1 || newTraps > 1) continue;

      queue.push({ cell: nCell, monstersHit: newMonsters, trapsHit: newTraps });
    }
  }

  // Check: every Goal must be reachable in at least one valid state
  for (const goal of goals) {
    const goalKey = cellKey(goal.cell);
    const reachable = [0, 1].some(m =>
      [0, 1].some(t => visited.has(`${goalKey},${m},${t}`))
    );
    if (!reachable) return false;
  }

  return true;
}
```

**Complexity**: O(4V + 4E) ≈ O(V). Very fast for our grid sizes.

### 4.3 Combined Validation

```
function isValidLair(lair: Lair): boolean {
  return checkReachability(lair) && checkPerilRule(lair);
}
```

Rule 2 (Use Everything) is guaranteed by the generator — it always places the exact required number of each feature and the configured number of walls.

---

## 5. URL Serialization

### 5.1 Encoding Scheme

Encode the lair as a compact string in the URL hash:

```
#<gridSize>:<wallCount>:<features>:<walls>[:<explorationFlag>:<revealedCells>]
```

**Components:**
- `gridSize`: `b` (base 6×6) or `B` (big 8×6)
- `wallCount`: decimal number
- `features`: sequence of `<row><col><type>` tuples
  - row: 0–7 as single digit
  - col: 0–5 as single digit
  - type: `s`/`x`/`c`/`m`/`t`
- `walls`: sequence of encoded wall positions
  - Each wall: `<row><col><dir>` where dir = `s` (south) or `e` (east)
- `explorationFlag` *(optional)*: `e` if exploration mode is active, omitted for full view
- `revealedCells` *(optional)*: sequence of `<row><col>` pairs for all revealed cells

**Example (full view):** `#b:18:00s15x23c34c45c01m12m24m02t13t35t:01s03e12s...`

**Example (exploration):** `#b:18:00s15x23c...:01s03e...:e:000112`
(reveals cells at (0,0), (0,1), and (1,2))

### 5.2 Decoding
On page load, check `window.location.hash`. If present, decode and display the encoded lair (with validation). If invalid, ignore and generate a fresh lair.

**Backward compatibility:** URLs with 4 segments (no exploration data) decode as full-view mode. URLs with 6 segments decode with exploration state.

---

## 6. Component Architecture

### 6.1 Component Tree

```
App
├── Header
├── Controls
│   ├── GridSizeToggle
│   ├── WallCountSlider
│   ├── GenerateButton
│   └── ExplorationToggle (Full View / Explore)
│       ├── ResetExplorationButton
│       └── RevealAllButton
├── LairGrid
│   ├── ColumnLabels
│   ├── GridRow (× rows)
│   │   ├── RowLabel
│   │   └── GridCell (× cols)
│   │       ├── WallBorders
│   │       ├── FeatureIcon (if revealed)
│   │       ├── FogOverlay (if hidden)
│   │       └── ExplorableIndicator (if explorable)
├── Legend
└── StatusBar
```

### 6.2 State Management

React `useState` in `App.tsx` — no external state library needed for this scale.

```typescript
function App() {
  const [gridSize, setGridSize] = useState<GridSize>('base');
  const [wallCount, setWallCount] = useState(20);
  const [lair, setLair] = useState<Lair | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Exploration mode state
  const [explorationMode, setExplorationMode] = useState(false);
  const [revealedCells, setRevealedCells] = useState<Set<string>>(new Set());
  const [selectedCell, setSelectedCell] = useState<string | null>(null);

  const generate = useCallback(() => {
    try {
      const config = buildConfig(gridSize, wallCount);
      const newLair = generateValidLair(config);
      setLair(newLair);
      setError(null);
      updateUrlHash(newLair);
      // Reset exploration to Start cell only
      if (explorationMode) {
        const startCell = newLair.features.find(f => f.type === 'start')!;
        setRevealedCells(new Set([cellKey(startCell.cell)]));
        setSelectedCell(null);
      }
    } catch (e) {
      setError("Failed to generate a valid lair. Try adjusting wall count.");
    }
  }, [gridSize, wallCount, explorationMode]);

  // Generate on mount and when settings change
  useEffect(() => { generate(); }, [generate]);

  // Decode URL hash on initial load
  useEffect(() => { decodeFromUrl(); }, []);
}
```

### 6.3 LairGrid Rendering

The grid uses **CSS Grid** layout. Walls are rendered as thick borders on the appropriate cell edges.

```css
.grid {
  display: grid;
  grid-template-columns: repeat(var(--cols), var(--cell-size));
  grid-template-rows: repeat(var(--rows), var(--cell-size));
  gap: 0;
}

.cell {
  width: var(--cell-size);
  height: var(--cell-size);
  border: 1px solid #ccc;            /* default thin border */
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Wall overrides: thick dark border on specific edge */
.cell.wall-south { border-bottom: 3px solid #1a1a1a; }
.cell.wall-east  { border-right: 3px solid #1a1a1a; }
.cell.wall-north { border-top: 3px solid #1a1a1a; }
.cell.wall-west  { border-left: 3px solid #1a1a1a; }

/* Outer perimeter always thick */
.cell.edge-north { border-top: 3px solid #1a1a1a; }
.cell.edge-south { border-bottom: 3px solid #1a1a1a; }
.cell.edge-east  { border-right: 3px solid #1a1a1a; }
.cell.edge-west  { border-left: 3px solid #1a1a1a; }
```

### 6.4 Feature Visual Design

| Feature | Icon/Text | Background Color | Text Color |
|---------|----------|-----------------|------------|
| Start | **S** | #4ade80 (green) | white |
| Exit | **X** | #22d3ee (cyan) | white |
| Chest | **C** | #fbbf24 (gold) | #1a1a1a |
| Monster | **M** | #f87171 (red) | white |
| Trap | **T** | #a78bfa (purple) | white |
| Empty | — | #f5f5f4 (stone) | — |

---

## 7. Exploration Mode (Fog of War)

### 7.1 Overview

Exploration mode transforms the generator from a static display tool into an interactive exploration experience for solo and co-op play. The full lair is generated and held in memory, but cells are hidden behind a "fog of war" until the player reveals them.

### 7.2 Exploration State

```typescript
// Additional state in App.tsx
explorationMode: boolean;              // false = Full View (default), true = Exploration
revealedCells: Set<string>;            // cellKey strings of revealed cells
selectedCell: string | null;           // cellKey of currently selected (pre-confirm) cell
```

### 7.3 Exploration Logic (`src/generator/exploration.ts`)

Pure functions with no React dependency:

```typescript
function getExplorableCells(lair: Lair, revealedCells: Set<string>): Set<string> {
  // For each revealed cell, check 4 orthogonal neighbors.
  // A neighbor is explorable if:
  //   1. Within grid bounds
  //   2. Not already revealed
  //   3. No wall blocks the edge between it and the revealed cell
  // Uses buildAdjacencyGraph() from graph.ts for wall-aware neighbor lookup.
}

function isExplorable(
  cellKey: string,
  lair: Lair,
  revealedCells: Set<string>
): boolean {
  // Check if a specific cell is explorable (in the explorable set).
}
```

**Performance**: O(|revealedCells| × 4) per call — negligible for 36–48 cells.

### 7.4 Cell Visual States

| State | Appearance | Interaction |
|-------|-----------|-------------|
| **Revealed** | Normal (feature icon, walls visible) | No action |
| **Explorable** | Fog overlay with "?" icon, subtle pulse animation | First tap → select |
| **Selected** | Highlighted border/glow, "?" icon emphasized | Second tap → reveal |
| **Hidden** | Dark/opaque fog, no feature, no walls | Not clickable |

### 7.5 Two-Tap Reveal Interaction

1. **Tap explorable cell** → cell becomes `selectedCell` (highlight + glow)
2. **Tap same cell again** → cell is revealed (added to `revealedCells`, `selectedCell` cleared)
3. **Tap different explorable cell** → selection moves to new cell
4. **Tap non-explorable/revealed cell** → `selectedCell` cleared
5. **Tap outside grid** → `selectedCell` cleared

This pattern prevents accidental reveals on mobile and desktop. The visual selection state gives the player a moment to reconsider.

### 7.6 Wall Visibility Rules

- Wall between two **revealed** cells → **fully visible** (thick dark border)
- Wall between a **revealed** and **unrevealed** cell → **visible** (player can see the wall blocking their path)
- Wall between two **unrevealed** cells → **hidden** (default thin border)
- Perimeter walls → **always visible** (grid boundary is always known)

### 7.7 Exploration Controls

Added to `Controls.tsx`:

- **Mode toggle**: "👁 Full View" | "🗺️ Explore" — switches between modes
- **Reset Exploration** button: re-hides all cells except Start (only visible in Exploration mode)
- **Reveal All** button: reveals all cells, ending exploration (only visible in Exploration mode)

### 7.8 Exploration Status Display

In `StatusBar.tsx`, when exploration mode is active:
- "Explored: **12/36** spaces" (revealed cells / total cells)
- Optionally: "Features found: **5/11**" (revealed features / total features)

### 7.9 Print in Exploration Mode

When printing in Exploration mode, only revealed cells are shown. Hidden cells remain fogged (rendered as dark/blank). This preserves the exploration state on paper.

---

## 8. Project Structure

```
lairs/
├── docs/
│   ├── plan.md                     # Implementation plan
│   ├── PRD.md                      # Product requirements
│   └── TDD.md                      # This document
├── src/
│   ├── components/
│   │   ├── App.tsx                 # Root: state, generate, effects
│   │   ├── App.module.css
│   │   ├── Header.tsx
│   │   ├── Header.module.css
│   │   ├── Controls.tsx            # GridSizeToggle + WallSlider + GenerateBtn
│   │   ├── Controls.module.css
│   │   ├── LairGrid.tsx            # Grid rendering with walls + features
│   │   ├── LairGrid.module.css
│   │   ├── StatusBar.tsx
│   │   ├── StatusBar.module.css
│   │   ├── Legend.tsx
│   │   └── Legend.module.css
│   ├── generator/
│   │   ├── types.ts                # All TypeScript interfaces/types
│   │   ├── config.ts               # Grid presets, wall ranges
│   │   ├── generator.ts            # generateRandomLair, generateValidLair
│   │   ├── validator.ts            # checkReachability, checkPerilRule
│   │   ├── graph.ts                # buildAdjacencyGraph helper
│   │   ├── exploration.ts          # getExplorableCells, exploration helpers
│   │   └── serializer.ts           # URL encode/decode
│   ├── main.tsx
│   └── index.css                   # Global resets, CSS variables, print styles
├── public/
│   └── favicon.ico
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── .github/
│   └── workflows/
│       └── deploy.yml
└── docs/
    ├── plan.md
    ├── PRD.md
    ├── TDD.md
    └── LRS_rules_basegame_web.pdf
```

---

## 9. Build & Deployment

### 9.1 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: '/lairs/',   // GitHub Pages serves from /<repo-name>/
  build: {
    outDir: 'dist',
  },
});
```

### 9.2 GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

### 9.3 npm Scripts

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }
}
```

---

## 10. Performance Considerations

### 10.1 Generation Speed
- Each generation attempt (random placement + validation) is O(n) where n = grid spaces
- For a 6×6 grid: ~36 spaces, ~60 wall slots → microseconds per attempt
- At 10,000 max attempts × ~10μs each = ~100ms worst case
- Expected: valid lair found within 100–1000 attempts in well under 1 second

### 10.2 Bundle Size
- React 18 (minified): ~40KB gzipped
- Application code: estimated <10KB gzipped
- Total: ~50KB — fast load on any connection

### 10.3 Rendering
- CSS Grid rendering is hardware-accelerated
- Grid is small (36–48 cells) — no virtualization needed
- Re-renders only on lair state change

---

## 11. Testing Strategy

### 11.1 Unit Tests (generator logic)
- `generator.ts`: verify feature counts and wall counts match config
- `validator.ts`:
  - Known-valid lairs return `true`
  - Lairs with unreachable spaces return `false`
  - Lairs violating the Peril Rule return `false`
- `serializer.ts`: round-trip encode/decode produces identical lairs

### 11.2 Integration Tests
- `generateValidLair()`: run 1,000 iterations, verify all pass `isValidLair()`
- Both grid sizes tested

### 11.3 Manual Testing
- Visual inspection of generated grids
- Print view verification
- URL sharing round-trip
- Tablet responsiveness
- **Exploration mode**: fog rendering, two-tap reveal, wall visibility, explorable cell highlighting
- **Exploration URL sharing**: encode/decode round-trip preserves revealed cells
- **Exploration edge cases**: reveal all, reset exploration, mode toggle mid-exploration

---

## 12. Future Considerations (Out of Scope for v1)
- **Seed-based generation**: Deterministic RNG with shareable seeds for tournaments
- **Lair difficulty scoring**: Heuristic rating based on path complexity and hazard placement
- **Lair editor**: Manual drag-and-drop placement with real-time validation
- **Adventurer's Pack support**: Additional monster/trap types, expanded rules
- **Animated generation**: Step-by-step visual animation of the generation process
