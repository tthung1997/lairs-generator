import styles from './Legend.module.css';

interface Props {
  appMode: 'standard' | 'multiplayer';
}

const BASE_ITEMS = [
  { label: 'S', name: 'Start',   color: '#4ade80', textColor: '#fff' },
  { label: 'X', name: 'Exit',    color: '#22d3ee', textColor: '#fff' },
  { label: 'C', name: 'Chest',   color: '#fbbf24', textColor: '#1a1a1a' },
  { label: 'M', name: 'Monster', color: '#f87171', textColor: '#fff' },
  { label: 'T', name: 'Trap',    color: '#a78bfa', textColor: '#fff' },
];

const LADDER_ITEMS = [
  { label: '↑', name: 'Ladder Up (Lower Level)',   color: '#f97316', textColor: '#fff' },
  { label: '↓', name: 'Ladder Down (Upper Level)', color: '#0d9488', textColor: '#fff' },
];

export function Legend({ appMode }: Props) {
  const items = appMode === 'multiplayer' ? [...BASE_ITEMS, ...LADDER_ITEMS] : BASE_ITEMS;
  return (
    <div className={styles.legend}>
      {items.map(item => (
        <div key={item.label} className={styles.item}>
          <div
            className={styles.icon}
            style={{ background: item.color, color: item.textColor }}
          >
            {item.label}
          </div>
          <span className={styles.name}>{item.name}</span>
        </div>
      ))}
    </div>
  );
}
