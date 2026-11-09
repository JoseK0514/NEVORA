'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { BrandWordmark } from './brand-mark';
import { ClockerIcon } from './clocker-icon';
import {useClockerCopy,useClockerIntlLocale,useClockerPresentation} from './clocker-language';
import styles from './clocker.module.css';

/** The Clocker, Direction B: the teal band (wordmark, the company logo or the workspace name, the live clock with the
 * location and date under it, the tablet status) beside the task card in landscape, across the top in portrait. */
export function ClockerShell({ locationLabel, timeZone, deviceName, status, children, brand, workspaceName }: {
  locationLabel: string; timeZone: string; deviceName?: string;
  /** Company brand (B1): kiosk accent tokens and an optional logo; without a logo the band names the workspace. */
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
  workspaceName?: string;
  status: 'checking' | 'connected' | 'setup' | 'unconfirmed'; children: ReactNode;
}) {
  const t=useClockerCopy(),{locale}=useClockerPresentation(),intl=useClockerIntlLocale();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const parts = now ? new Intl.DateTimeFormat(intl, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now) : [];
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  const date = now ? new Intl.DateTimeFormat(intl, { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(now) : t('Loading location time');
  const statusLabel = status === 'connected' ? 'Tablet registered' : status === 'checking' ? 'Checking setup' : status === 'unconfirmed' ? 'Setup needs checking' : 'Setup required';
  const zone = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;

  return <main lang={locale} data-clocker-kiosk="" className={styles.page} style={brand?.style as CSSProperties | undefined}>
    <a href="#clocker-task" className={styles.skip}>{t("Skip to time clock")}</a>
    <section className={styles.frame} aria-label={t("Shared time clock")}>
      <aside className={styles.band} aria-label={t("Location and time")}>
        <header className={styles.brand}>
          <span className={styles.wordmark}>
            {/* The app's wordmark (official PNG recoloured through a mask, cyan A kept), white on the band. */}
            <span className={styles.logo}><BrandWordmark /></span>
            <span className={styles.label}>{t("Time clock")}</span>
          </span>
          {brand?.logoUrl ? <span className={styles.companyLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element -- an immutable, same-origin asset already sized for the chip */}
            <img src={brand.logoUrl} alt={t('Company logo')} decoding="async"/>
          </span> : workspaceName ? <span className={`${styles.workspace} ${styles.glass}`}>{workspaceName}</span> : null}
        </header>
        <div className={styles.when}>
          <time className={styles.clock} dateTime={now?.toISOString()} aria-label={now ? `${part('hour')}:${part('minute')} ${part('dayPeriod')}` : t('Loading location time')}>{now ? `${part('hour')}:${part('minute')}` : '--:--'}<span>{part('dayPeriod')}</span></time>
          <div className={styles.under}>
            <h2 className={`${styles.location} ${styles.glass}`}><ClockerIcon name="location" size={16}/><span>{locationLabel}</span></h2>
            <p className={styles.date}>{date}</p>
          </div>
        </div>
        <footer className={styles.foot}>
          <span className={`${styles.status} ${styles.glass}`} data-tone={status === 'connected' ? 'ok' : 'attn'}><span className={styles.dot} aria-hidden="true"/><span className={styles.statusLabel}>{t(statusLabel)}</span>
            <span className={styles.zone}>{t('{zone} time',{zone})}{deviceName ? <>{' · '}{deviceName}</> : null}</span></span>
          <span className={styles.powered}>{NUVORA_BRAND.poweredBy}</span>
        </footer>
      </aside>
      <div id="clocker-task" tabIndex={-1} className={styles.task}><div className={styles.card}>{children}</div></div>
    </section>
  </main>;
}
