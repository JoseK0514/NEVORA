'use client';

import type { ClockerLocale } from './clocker-copy';
import { ClockerLanguageToggle, ClockerPresentation, useClockerCopy, useClockerPresentation } from './clocker-language';
import { RecoveryFrame } from './commerce-recovery/frame';
import styles from './commerce-recovery/recovery.module.css';
import kiosk from './clocker.module.css';

/* The tablet's paused page (Nov 14 inspection, RA-13 and JR-12). It follows the language chosen on this tablet (the
 * kiosk's saved choice); a tablet with no choice yet keeps the sign-in language it was served in. It no longer invites
 * the Owner to sign in on a shared tablet: billing is opened on the Owner's own device.
 * Phase 6 (Nov 17, 2026): the language switch on this page is the tablet's own (the sign-in switch only set the sign-in
 * cookie, which a saved tablet choice overrides, so it looked broken), and staff are told what to do meanwhile. */
function PausedBody({ from, unavailable }: { from: string | null; unavailable: boolean }) {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  return <RecoveryFrame lang={locale} language={<ClockerLanguageToggle className={kiosk.langSolid} />}><p className={styles.eyebrow}>Clocker</p>
    <h1>{unavailable ? t('Access could not be checked') : t('Clocker access is paused')}</h1>
    <p>{t('Clocking is unavailable right now. Ask your workplace Owner to review access and billing.')} {t('Until then, ask a manager to record your time.')}</p>
    {/* "When billing is settled" is only true for a pause, not for a status that could not be read. */}
    <p>{t('Open billing on your own device.')}{unavailable ? null : <> {t('This tablet starts working again when billing is settled.')}</>}</p>
    {from ? <div className={styles.actions}><a className={styles.action} href={from}>{t('Try Clocker again')}</a></div> : null}
  </RecoveryFrame>;
}

export function ClockerPaused({ from, unavailable, initialLocale }: { from: string | null; unavailable: boolean; initialLocale: ClockerLocale }) {
  return <ClockerPresentation initialLocale={initialLocale}><PausedBody from={from} unavailable={unavailable} /></ClockerPresentation>;
}
