'use client';

import styles from './timecards-heading.module.css';
import {usePortalLang} from '@/lib/i18n/portal-lang';
import {TIMECARDS_COPY} from './timecards-copy';

/* Phase 1 (inspection Oct 24): page entrances are off. Content painted, jumped back and animated in on every visit,
 * which read as lag; a page now appears in place. */
export function TimecardsHeading({manager}:{manager:boolean}) {
  const T=TIMECARDS_COPY[usePortalLang()];
  return <header className={styles.heading}>
    <h1>{T.timecards}</h1>
    <p>{manager?T.headingManager:T.headingEmployee}</p>
  </header>;
}
