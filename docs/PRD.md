# Product Requirements Document (PRD)
# Lairs — Random Lair Generator

## 1. Overview

### 1.1 Product Name
Lairs Random Lair Generator

### 1.2 Purpose
The Lairs board game requires each player to manually build a dungeon lair on a grid — placing walls, monsters, traps, chests, a start tile, and an exit tile — while following three strict legality rules. This process is time-consuming and can slow down the start of gameplay, especially for new players unfamiliar with the rules.

The **Lairs Random Lair Generator** is a web-based tool that instantly generates randomized, rule-compliant lairs so players can skip the setup phase and jump straight into the game.

### 1.3 Target Users
- **Primary**: Lairs board game players who want to skip lair-building setup
- **Secondary**: New players who are learning the game and want examples of valid lairs
- **Tertiary**: Tournament organizers who need standardized, reproducible lair setups

### 1.4 Success Criteria
- A valid lair is generated in under 2 seconds on any modern device
- Generated lairs pass all three legality rules 100% of the time
- The app is usable on both desktop and tablet (at the game table)
- Zero backend dependencies — fully client-side, instant load

---

## 2. Game Context

### 2.1 What is a Lair?
A lair is a grid-based dungeon composed of:
- **Spaces** — the cells of the grid, through which explorers move orthogonally
- **Walls** — placed on the borders between spaces, blocking movement and line of sight
- **Features** — items placed inside spaces (one per space maximum)

### 2.2 Feature Types
| Feature | Category | Count (6×6) | Count (8×6) | Symbol |
|---------|----------|-------------|-------------|--------|
| Start | Neutral | 1 | 1 | S |
| Exit | Goal | 1 | 1 | X |
| Chest | Goal | 3 | 4 | C |
| Monster | Hazard | 3 | 4 | M |
| Trap | Hazard | 3 | 4 | T |

### 2.3 Grid Sizes
| Variant | Dimensions | Rows | Columns | Total Spaces |
|---------|-----------|------|---------|-------------|
| Base Game | 6×6 | A–F | 1–6 | 36 |
| Big Lair | 8×6 | A–H | 1–6 | 48 |

### 2.4 Lair Legality Rules
Every generated lair **must** satisfy all three rules:

1. **No Unreachable Spaces** — Every space on the grid must be reachable from the Start tile via orthogonal movement (north/south/east/west), without passing through any wall.

2. **Use (Almost) Everything** — All features must be placed. Wall count must fall within the allowed range:
   - Base (6×6): 17–20 walls
   - Big (8×6): 20–25 walls

3. **The Peril Rule** — From the Start to each Goal (the Exit and every Chest), there must exist at least one path that passes through **at most one Monster** and **at most one Trap**. Passing through one of each is acceptable; passing through two of the same type is not. It is acceptable if *some* paths to a Goal are illegal, as long as at least one legal path exists.

---

## 3. Functional Requirements

### 3.1 Core Features

#### FR-1: Random Lair Generation
- The system shall generate a random lair that satisfies all three legality rules
- Generation shall complete in under 2 seconds on modern hardware
- The user shall be able to regenerate a new lair with a single action
- If generation fails after reasonable attempts, display a clear error message

#### FR-2: Grid Size Selection
- The user shall be able to choose between 6×6 (Base) and 8×6 (Big) grid sizes
- Switching grid sizes shall automatically regenerate a new lair
- Component counts and wall ranges shall adjust based on the selected grid size

#### FR-3: Wall Count Configuration
- The user shall be able to adjust the number of walls within the allowed range
- Base (6×6): slider from 17 to 20
- Big (8×6): slider from 20 to 25
- Changing the wall count shall trigger regeneration

#### FR-4: Lair Visualization
- The generated lair shall be displayed as a visual grid
- Row labels (A–F or A–H) shall appear on the left
- Column labels (1–6) shall appear on top
- Walls shall be visually distinct (thick/dark borders between spaces)
- Features shall be displayed with distinct icons and/or colors per type
- Empty spaces shall be visually distinct from spaces containing features

### 3.2 Additional Features

#### FR-5: URL-Based Sharing
- The current lair state shall be encoded in the URL (hash or query parameters)
- Opening a shared URL shall restore the exact lair configuration
- Encoded data: grid size, wall positions, feature positions

#### FR-6: Print-Friendly View
- The lair grid shall be printable with clean formatting
- Controls and non-essential UI elements shall be hidden when printing
- Output shall be legible in black-and-white

#### FR-7: Status Display
- The app shall display current component counts (walls placed, features placed)
- A validity indicator shall confirm the lair passes all rules

---

## 4. Non-Functional Requirements

### NFR-1: Performance
- Lair generation shall complete in under 2 seconds on devices from 2020 onward
- Page load (first contentful paint) shall be under 1 second on broadband

### NFR-2: Compatibility
- The app shall work on the latest versions of Chrome, Firefox, Safari, and Edge
- The app shall be responsive and usable on tablets (768px+) and desktops

### NFR-3: Accessibility
- Interactive controls shall be keyboard-navigable
- Color shall not be the only way to distinguish feature types (icons/letters also used)
- Sufficient color contrast ratios (WCAG AA)

### NFR-4: Deployment
- The app shall be a static site with zero backend dependencies
- Deployment target: GitHub Pages (auto-deploy via GitHub Actions on push to main)
- No user accounts, databases, or server-side processing

### NFR-5: Offline Capability
- The app should function after initial load without an internet connection (all logic is client-side)

---

## 5. User Flows

### 5.1 Primary Flow — Generate a Lair
1. User opens the app
2. Default grid size (6×6) and wall count (20) are pre-selected
3. A valid lair is automatically generated and displayed
4. User reviews the lair on screen
5. User sets up their physical board to match the displayed lair

### 5.2 Regenerate Flow
1. User clicks "Generate New Lair"
2. A new random valid lair replaces the current one
3. Grid size and wall count settings are preserved

### 5.3 Customize and Generate
1. User switches grid size to 8×6
2. A new lair is generated with the 8×6 configuration
3. User adjusts wall count slider to 22
4. A new lair is generated with 22 walls

### 5.4 Share Flow
1. User generates a lair they like
2. User copies the URL from the browser address bar
3. User shares the URL with another player
4. Recipient opens the URL and sees the exact same lair

### 5.5 Print Flow
1. User generates a lair
2. User presses Ctrl+P / Cmd+P (browser print)
3. A clean, print-optimized layout of the lair grid is printed

---

## 6. Out of Scope (v1)
- Adventurer's Pack expansions and custom monster/trap types
- Multiplayer lair generation (each player generates separately)
- Lair difficulty rating or scoring analysis
- Mobile-first layout (tablet and desktop are primary targets)
- Lair editor (manual placement with validation)
- Game play tracking or scoring
