import styles from './Legend.module.css';

const ITEMS = [
  { label: 'S', name: 'Start',   color: '#4ade80', textColor: '#fff' },
  { label: 'X', name: 'Exit',    color: '#22d3ee', textColor: '#fff' },
  { label: 'C', name: 'Chest',   color: '#fbbf24', textColor: '#1a1a1a' },
  { label: 'M', name: 'Monster', color: '#f87171', textColor: '#fff' },
  { label: 'T', name: 'Trap',    color: '#a78bfa', textColor: '#fff' },
];

export function Legend() {
  return (
    <div className={styles.legend}>
      {ITEMS.map(item => (
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
