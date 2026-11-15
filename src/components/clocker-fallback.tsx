'use client';

import type { ReactNode } from 'react';
import { BrandWordmark } from './brand-mark';
import { ClockerIcon } from './clocker-icon';
import { ClockerLanguageToggle, ClockerPresentation, useClockerCopy, useClockerPresentation } from './clocker-language';
import styles from './clocker.module.css';

/* The kiosk's own error and loading screens (Nov 14 inspection, RA-4). Before these, a failure on a shared tablet fell to
 * the public English screen with "Go to sign in". Both use the kiosk's frame (the teal band and one white card) and the
 * language chosen on this tablet (English until someone chooses, as on the kiosk). There is no location, clock or tablet
 * status here: the page that knows them is the one that failed or is still loading. Never a sign-in link. */
function Frame({ busy, children }: { busy?: boolean; children: ReactNode }) {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  return <main lang={locale} data-clocker-kiosk="" className={styles.page}>
    <section className={styles.frame} aria-label={t('Shared time clock')}>
      <div className={styles.band}>
        <header className={styles.brand}>
          <span className={styles.wordmark}>
            <span className={styles.logo}><BrandWordmark /></span>
            <span className={styles.label}>{t('Time clock')}</span>
          </span>
        </header>
      </div>
      <div className={styles.task}><div className={styles.card}><div className={styles.content} data-align="center" aria-busy={busy}>{children}</div></div></div>
    </section>
  </main>;
}

/** "Something went wrong. Try again.", with the manager fallback so nobody leaves without their time recorded. */
export function ClockerErrorScreen({ retry }: { retry: () => void }) {
  return <ClockerPresentation><ErrorBody retry={retry} /></ClockerPresentation>;
}
function ErrorBody({ retry }: { retry: () => void }) {
  const t = useClockerCopy();
  return <Frame>
    <span className={styles.ring} data-tone="red"><ClockerIcon name="stop" size={28} /></span>
    <h1 className={styles.title}>{t('Something went wrong')}</h1>
    {/* One live region with the whole message; the eye reads it in the heading, the line and the button. */}
    <p role="alert" className={styles.sr}>{t('Something went wrong. Try again.')} {t('If it keeps happening, ask a manager to record your time.')}</p>
    <p className={styles.smsg}>{t('If it keeps happening, ask a manager to record your time.')}</p>
    <div className={styles.stack}><button type="button" className={styles.btn} data-kind="primary" onClick={retry}><ClockerIcon name="refresh" size={20} />{t('Try again')}</button></div>
    <div className={styles.meta} data-align="center"><ClockerLanguageToggle /></div>
  </Frame>;
}

/** The kiosk frame while the page reads its location. */
export function ClockerLoadingScreen() {
  return <ClockerPresentation><LoadingBody /></ClockerPresentation>;
}
function LoadingBody() {
  const t = useClockerCopy();
  return <Frame busy>
    <span className={styles.ring}><ClockerIcon name="wait" size={28} /></span>
    <h1 className={styles.title}>{t('Checking this tablet…')}</h1>
    <span className={styles.progress} aria-hidden="true"><i /></span>
  </Frame>;
}
