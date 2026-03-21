import type { Lair } from '../generator/types';
import styles from './StatusBar.module.css';

interface Props {
  lair: Lair | null;
  error: string | null;
}

export function StatusBar({ lair, error }: Props) {
  if (error) return <div className={styles.error}>{error}</div>;
  if (!lair) return null;

  const { config, walls, features } = lair;
  const totalFeatures = 1 + 1 + config.chests + config.monsters + config.traps; // start+exit+rest

  return (
    <div className={styles.bar}>
      <span className={styles.item}>Walls: <strong>{walls.length}</strong></span>
      <span className={styles.sep}>·</span>
      <span className={styles.item}>Features: <strong>{features.length}/{totalFeatures}</strong></span>
      <span className={styles.sep}>·</span>
      <span className={styles.valid}>✅ Valid Lair</span>
    </div>
  );
}
