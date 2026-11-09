'use client';

import styles from './timecards-heading.module.css';

/* Phase 1 (inspection Oct 24): page entrances are off. Content painted, jumped back and animated in on every visit,
 * which read as lag; a page now appears in place. */
export function TimecardsHeading({manager}:{manager:boolean}) {
  return <header className={styles.heading}>
    <h1>Timecards</h1>
    <p>{manager?'Review hours and close each pay period.':'Your hours, breaks and approvals.'}</p>
  </header>;
}
