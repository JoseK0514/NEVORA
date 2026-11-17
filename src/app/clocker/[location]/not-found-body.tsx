'use client';

import type { ReactNode } from 'react';
import { DeviceTabletIcon } from '@phosphor-icons/react/dist/ssr/DeviceTablet';
import { BrandWordmark } from '@/components/brand-mark';
import type { ClockerLocale } from '@/components/clocker-copy';
import { ClockerLanguageToggle, ClockerPresentation, useClockerCopy, useClockerPresentation } from '@/components/clocker-language';
import kiosk from '@/components/clocker.module.css';
import styles from './not-found.module.css';

/* The Clocker's own 404 (Phase 6, Nov 17, 2026): the public 404's band and its 560px state card, in the language chosen on
 * this tablet (the kiosk's saved choice; a tablet with none keeps the language the page was served in). It says who can
 * fix the link and what staff do meanwhile. A shared tablet never offers a personal sign-in, so the "Go to sign in" link
 * is gone; the one action reloads the link. The footer is the one legal line, passed in from the server for each language. */
function Body({ legal }: { legal: Record<ClockerLocale, ReactNode> }) {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  return <main className="nf-page" lang={locale} data-clocker-not-found="">
    <header className="nf-band">
      <div className="nf-top"><span className="nf-wordmark"><BrandWordmark /></span><ClockerLanguageToggle className={kiosk.langSolid} /></div>
      <h1 id="not-found-title">{t('This time clock link doesn’t work')}</h1>
      <p className="nf-eyebrow">{t('Error 404')}</p>
    </header>
    <section className="nf-sheet" aria-labelledby="not-found-title">
      <div className="nf-card">
        <p className={`not-found-hint ${styles.lead}`}><DeviceTabletIcon size={20} weight="bold" aria-hidden="true" /><span><strong>{t('A manager or Owner can fix it')}</strong> {t('They set up this tablet again with the current link, in Settings under Clocker tablets.')}</span></p>
        <p className={`not-found-text ${styles.meanwhile}`}>{t('Until then, ask a manager to record your time.')}</p>
        <button type="button" className={`nf-cta ${styles.retry}`} onClick={() => window.location.reload()}>{t('Try again')}</button>
      </div>
      <footer className="nf-foot">{legal[locale]}</footer>
    </section>
  </main>;
}

export function ClockerNotFoundBody({ initialLocale, legal }: { initialLocale: ClockerLocale; legal: Record<ClockerLocale, ReactNode> }) {
  return <ClockerPresentation initialLocale={initialLocale}><Body legal={legal} /></ClockerPresentation>;
}
