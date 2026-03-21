# 🏰 Lairs — Random Lair Generator

A web tool that instantly generates random, rule-compliant lairs for the [Lairs](https://www.ktbg.fun/lairs) board game. Skip the setup and start exploring!

🔗 **Live app: https://tthung1997.github.io/lairs-generator/**

> *This is an unofficial fan-made tool and is not affiliated with or endorsed by [KTBG](https://www.kidstablebg.com/games/lairs) or the creators of [Lairs](https://boardgamegeek.com/boardgame/404883/lairs). Lairs is a trademark of its respective owners.*

## What it does

Setting up a lair in Lairs requires each player to place walls, monsters, traps, chests, a start tile, and an exit tile on a grid — all while following three strict legality rules. This generator does that instantly, so players can go straight to the fun part.

### Features
- 🎲 **One-click generation** — get a new valid lair instantly
- 📐 **Two grid sizes** — 6×6 (Base game) and 8×6 (Big lair variant)
- 🧱 **Adjustable wall count** — slider within the allowed range per variant
- 🔗 **Shareable URLs** — every lair is encoded in the URL, share it with your opponent
- 🖨️ **Print-friendly** — clean black & white output for physical reference during setup

### Legality rules enforced
1. **No unreachable spaces** — every cell is reachable from Start
2. **Use (almost) everything** — all features placed, walls within allowed range
3. **The Peril Rule** — every Goal (Exit + Chests) has at least one path from Start passing through at most one Monster and one Trap

## Tech stack

- **React 18 + TypeScript** — UI and type safety
- **Vite** — build tool
- **CSS Modules** — scoped styles
- **GitHub Pages** — hosting (auto-deploy via GitHub Actions)

## Local development

```bash
npm install
npm run dev
```

Open http://localhost:5173/lairs-generator/

## Docs

See the [`docs/`](docs/) folder for the full [PRD](docs/PRD.md), [TDD](docs/TDD.md), and [implementation plan](docs/plan.md).
