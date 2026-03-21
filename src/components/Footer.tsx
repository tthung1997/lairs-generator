import styles from './Footer.module.css';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className={styles.footer}>
      <p className={styles.disclaimer}>
        This is an unofficial fan-made tool and is not affiliated with or endorsed by{' '}
        <a href="https://www.kidstablebg.com/games/lairs" target="_blank" rel="noopener noreferrer">KTBG</a>{' '}
        or the creators of{' '}
        <a href="https://boardgamegeek.com/boardgame/404883/lairs" target="_blank" rel="noopener noreferrer">
          Lairs
        </a>.
        Lairs is a trademark of its respective owners.
      </p>
      <p className={styles.credit}>© {year} tthung1997</p>
    </footer>
  );
}
