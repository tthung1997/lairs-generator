import styles from './Header.module.css';

export function Header() {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>🏰 Lairs</h1>
      <p className={styles.subtitle}>Random Lair Generator</p>
    </header>
  );
}
