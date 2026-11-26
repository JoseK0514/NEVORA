'use client';

import type { ReactNode } from 'react';
import { BrandWordmark } from '@/components/brand-mark';
import { ClockerIcon } from '@/components/clocker-icon';
import type { ClockerLocale } from '@/components/clocker-copy';
import { ClockerLanguageToggle, ClockerPresentation, useClockerCopy, useClockerPresentation } from '@/components/clocker-language';
import kiosk from '@/components/clocker.module.css';
import styles from './not-found.module.css';

/* The Clocker's own 404 (Phase 6, Nov 17, 2026): the public 404's band and its 560px state card, in the language chosen on
 * this tablet (the kiosk's saved choice; a tablet with none keeps the language the page was served in). It says who can
 * fix the link and what staff do meanwhile. A shared tablet never offers a personal sign-in, so the "Go to sign in" link
 * is gone; the one action reloads the link. The footer is the one legal line, passed in from the server for each language.
 * Phase 8 (Nov 17, 2026): staff tell a manager, and the Owner sets the tablet up again (only an Owner can open Settings);
 * the footer's links meet the kiosk's 56px floor in this page's own module, not in the shared public 404 sheet.
 * Premium pass (Nov 18, 2026, #22): the band names the place ("Time clock", as the paused page and the kiosk band do), not
 * "Error 404"; the note is the product's red callout (a link that doesn't work stops the person, as the kiosk's own "set
 * this tablet up again" card does), with its edge, the red WarningCircle, an ink title and an ink2 body; Try again is the
 * kiosk's full-width action. */
function Body({ legal }: { legal: Record<ClockerLocale, ReactNode> }) {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  return <main className="nf-page" lang={locale} data-clocker-not-found="">
    <header className="nf-band">
      <div className="nf-top"><span className="nf-wordmark"><BrandWordmark /></span><ClockerLanguageToggle className={kiosk.langSolid} /></div>
      <p className={`nf-eyebrow ${styles.eyebrow}`}>{t('Time clock')}</p>
      <h1 id="not-found-title">{t('This time clock link doesn’t work')}</h1>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <p className={`not-found-hint ${styles.lead}`}><ClockerIcon name="stop" size={18} /><span><strong>{t('Tell a manager')}</strong> {t('Your Owner sets this tablet up again in Settings → Clocker tablets.')}</span></p>
        <p className={`not-found-text ${styles.meanwhile}`}>{t('Until then, ask a manager to record your time.')}</p>
        <button type="button" className={`nf-cta ${styles.retry}`} onClick={() => window.location.reload()}>{t('Try again')}</button>
      </div>
      <footer className={`nf-foot ${styles.foot}`}>{legal[locale]}</footer>
    </section>
  </main>;
}

export function ClockerNotFoundBody({ initialLocale, legal }: { initialLocale: ClockerLocale; legal: Record<ClockerLocale, ReactNode> }) {
  return <ClockerPresentation initialLocale={initialLocale}><Body legal={legal} /></ClockerPresentation>;
}
