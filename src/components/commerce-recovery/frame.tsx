import type {ReactNode} from 'react';
import styles from './recovery.module.css';
export function RecoveryFrame({children,lang='en'}: {children:ReactNode;lang?:'en'|'es'}) {
 return <main className={styles.frame} lang={lang}><div className={styles.content}><p className={styles.brand} aria-label="NEVORA">NEVORA</p><section className={styles.card}>{children}</section></div></main>;
}
