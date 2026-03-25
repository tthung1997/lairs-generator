import type { Lair, MultiplayerLair } from '../generator/types';
import styles from './StatusBar.module.css';

interface Props {
  lair: Lair | null;
  error: string | null;
  explorationMode?: boolean;
  revealedCells?: Set<string>;
  totalCells?: number;
  multiplayerLair?: MultiplayerLair | null;
}

export function StatusBar({ lair, error, explorationMode, revealedCells, totalCells, multiplayerLair }: Props) {
  if (error) return <div className={styles.error}>{error}</div>;

  if (multiplayerLair) {
    const { config, upper, lower, ladders } = multiplayerLair;
    const totalWalls = upper.walls.length + lower.walls.length;
    const placedFeatures = upper.features.length + lower.features.length;
    const expectedFeatures = config.starts + 1 + config.chests + config.monsters + config.traps;
    const ladderCount = ladders.length;

    if (explorationMode && revealedCells && totalCells) {
      const revealedCount = revealedCells.size;
      const revealedFeatures =
        [...upper.features, ...lower.features].filter(f =>
          revealedCells.has(`${f.cell.row},${f.cell.col}`)
        ).length;
      return (
        <div className={styles.bar}>
          <span className={styles.item}>Explored: <strong>{revealedCount}/{totalCells}</strong> spaces</span>
          <span className={styles.sep}>·</span>
          <span className={styles.item}>Features found: <strong>{revealedFeatures}/{expectedFeatures}</strong></span>
          <span className={styles.sep}>·</span>
          <span className={styles.item}>Ladders: <strong>{ladderCount}</strong></span>
        </div>
      );
    }

    return (
      <div className={styles.bar}>
        <span className={styles.item}>Walls: <strong>{totalWalls}</strong></span>
        <span className={styles.sep}>·</span>
        <span className={styles.item}>Features: <strong>{placedFeatures}/{expectedFeatures}</strong></span>
        <span className={styles.sep}>·</span>
        <span className={styles.item}>Levels: <strong>2</strong></span>
        <span className={styles.sep}>·</span>
        <span className={styles.item}>Ladders: <strong>{ladderCount}</strong></span>
      </div>
    );
  }

  if (!lair) return null;

  const { config, walls, features } = lair;
  const totalFeatures = 1 + 1 + config.chests + config.monsters + config.traps; // start+exit+rest

  if (explorationMode && revealedCells && totalCells) {
    const revealedCount = revealedCells.size;
    const revealedFeatures = features.filter(f => revealedCells.has(`${f.cell.row},${f.cell.col}`)).length;
    return (
      <div className={styles.bar}>
        <span className={styles.item}>Explored: <strong>{revealedCount}/{totalCells}</strong> spaces</span>
        <span className={styles.sep}>·</span>
        <span className={styles.item}>Features found: <strong>{revealedFeatures}/{totalFeatures}</strong></span>
        <span className={styles.sep}>·</span>
        <span className={styles.item}>Walls: <strong>{walls.length}</strong></span>
      </div>
    );
  }

  return (
    <div className={styles.bar}>
      <span className={styles.item}>Walls: <strong>{walls.length}</strong></span>
      <span className={styles.sep}>·</span>
      <span className={styles.item}>Features: <strong>{features.length}/{totalFeatures}</strong></span>
    </div>
  );
}
