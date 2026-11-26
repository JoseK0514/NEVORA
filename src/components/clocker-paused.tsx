'use client';
import {copy as pageWords} from './clocker-paused-copy';

import type { ClockerLocale } from './clocker-copy';
import { ClockerLanguageToggle, ClockerPresentation, useClockerCopy, useClockerPresentation } from './clocker-language';
import { RecoveryFrame } from './commerce-recovery/frame';
import styles from './commerce-recovery/recovery.module.css';
import kiosk from './clocker.module.css';

/* The tablet's paused page (Nov 14 inspection, RA-13 and JR-12). It follows the language chosen on this tablet (the
 * kiosk's saved choice); a tablet with no choice yet keeps the sign-in language it was served in. It no longer invites
 * the Owner to sign in on a shared tablet: billing is opened on the Owner's own device.
 * Phase 6 (Nov 17, 2026): the language switch on this page is the tablet's own (the sign-in switch only set the sign-in
 * cookie, which a saved tablet choice overrides, so it looked broken), and staff are told what to do meanwhile.
 * Phase 8 (Nov 17, 2026): staff words, not the product name ("This time clock is paused", "Try again"), and the action
 * meets the kiosk's 56px floor (the billing pages' own action stays 52px).
 * Phase 2 (Nov 23, 2026, K15): no "Time clock" eyebrow over "This time clock is paused" (the words repeated), and from
 * 1024px the panel beside the card leaves out the sign-in brand line, and its "Powered by VELANI LLC" is the one company
 * line (the © line under the card shows only where there is no panel, as on K1–K14). */
function PausedBody({ from, unavailable }: { from: string | null; unavailable: boolean }) {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  return <RecoveryFrame lang={locale} brandLine={false} legal={<p className={kiosk.pausedLegal}>© 2026 VELANI LLC</p>} language={<ClockerLanguageToggle className={kiosk.langSolid} />}>
    <h1>{unavailable ? pageWords[locale].accessCouldNotBeChecked : pageWords[locale].thisTimeClockIsPaused}</h1>
    <p>{t('Clocking is unavailable right now. Ask your workplace Owner to review access and billing.')} {t('Until then, ask a manager to record your time.')}</p>
    {/* "When billing is settled" is only true for a pause, not for a status that could not be read. */}
    <p>{t('Open billing on your own device.')}{unavailable ? null : <> {t('This tablet starts working again when billing is settled.')}</>}</p>
    {from ? <div className={styles.actions}><a className={`${styles.action} ${kiosk.pausedAction}`} href={from}>{t('Try again')}</a></div> : null}
  </RecoveryFrame>;
}

export function ClockerPaused({ from, unavailable, initialLocale }: { from: string | null; unavailable: boolean; initialLocale: ClockerLocale }) {
  return <ClockerPresentation initialLocale={initialLocale}><PausedBody from={from} unavailable={unavailable} /></ClockerPresentation>;
}
