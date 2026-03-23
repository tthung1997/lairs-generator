import type { Lair } from '../generator/types';
import styles from './StatusBar.module.css';

interface Props {
  lair: Lair | null;
  error: string | null;
  explorationMode?: boolean;
  revealedCells?: Set<string>;
  totalCells?: number;
}

export function StatusBar({ lair, error, explorationMode, revealedCells, totalCells }: Props) {
  if (error) return <div className={styles.error}>{error}</div>;
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
