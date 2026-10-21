'use client';

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { BrandWordmark } from './brand-mark';
import { ClockerIcon } from './clocker-icon';
import styles from './clocker-shell.module.css';

/** Signature Clocker: a deep-teal side (phone: top band) with the location, a large light clock and the tablet
 * status, beside a soft-white task area. */
export function ClockerShell({ locationLabel, timeZone, deviceName, status, children, brand }: {
  locationLabel: string; timeZone: string; deviceName?: string;
  /** Company brand (B1): kiosk colour tokens and an optional logo beside the wordmark. */
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
  status: 'checking' | 'connected' | 'setup' | 'unconfirmed'; children: ReactNode;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const parts = now ? new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now) : [];
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  const date = now ? new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(now) : 'Loading location time';
  const statusLabel = status === 'connected' ? 'Tablet connected' : status === 'checking' ? 'Checking setup' : status === 'unconfirmed' ? 'Setup needs checking' : 'Setup required';
  const zone = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;

  return <main className={styles.page} data-sig-surface="light" data-mobile-clocker="true" style={brand?.style as CSSProperties | undefined}>
    <a href="#clocker-task" className={styles.skip}>Skip to time clock</a>
    <section className={styles.frame} aria-label="Shared time clock">
      <aside className={styles.side} data-sig-surface="deep" aria-label="Location and time">
        <svg className={styles.mark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path className={styles.markSky} d="M146 330 L180 266 L214 330 Z"/></svg>
        <header className={styles.brand}>
          <span className={styles.wordmark}>
            {/* The app's wordmark (official PNG recoloured through a mask, cyan A kept), white on the deep side as on sign-in. */}
            <span className={styles.logo}><BrandWordmark /></span>
            <span>Time clock</span>
          </span>
          {brand?.logoUrl ? <span className={styles.companyLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element -- an immutable, same-origin asset already sized for the chip */}
            <img src={brand.logoUrl} alt="Company logo" decoding="async"/>
          </span> : null}
        </header>
        <div className={styles.when}>
          <h2 className={styles.location}><ClockerIcon name="location" size={16} weight="fill"/><span>{locationLabel}</span></h2>
          <div className={styles.clock}>
            <time dateTime={now?.toISOString()} aria-label={now ? `${part('hour')}:${part('minute')} ${part('dayPeriod')}` : 'Loading location time'}>{now ? `${part('hour')}:${part('minute')}` : '--:--'}<span>{part('dayPeriod')}</span></time>
            <p>{date}</p>
          </div>
        </div>
        <footer className={styles.foot}>
          <span className={styles.status} data-connected={status === 'connected'} data-attention={status === 'setup' || status === 'unconfirmed'}><span aria-hidden="true"/>{statusLabel}</span>
          <span className={styles.zone}>{zone} time{deviceName ? <> &middot; {deviceName}</> : null}</span>
          <span className={styles.powered}>{NUVORA_BRAND.poweredBy}</span>
        </footer>
      </aside>
      <div id="clocker-task" tabIndex={-1} className={styles.task}>{children}</div>
    </section>
  </main>;
}
