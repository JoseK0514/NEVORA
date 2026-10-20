'use client';

import Image from 'next/image';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { ClockerIcon } from './clocker-icon';
import { BrandWordmark } from './brand-mark';
import styles from './clocker-shell.module.css';

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

  return <main className={styles.page} data-mobile-clocker="true" style={brand?.style as CSSProperties | undefined}>
    <a href="#clocker-task" className={styles.skip}>Skip to time clock</a>
    <header className={styles.header}>
      <div className={`${styles.brand} clocker-desktop-brand`}><Image src="/images/nevora-wordmark.png" alt="NEVORA" width={132} height={18} priority/><span>Time clock</span></div>
      <div className="clocker-mobile-brand"><span className="login-brand-lockup"><BrandWordmark/><span className="login-brand-module">Time clock</span></span></div>
      {brand?.logoUrl ? <span className={styles.companyLogo}>
        {/* eslint-disable-next-line @next/next/no-img-element -- an immutable, same-origin asset already sized for the chip */}
        <img src={brand.logoUrl} alt="Company logo" decoding="async"/>
      </span> : null}
      <div className={styles.deviceStatus} data-connected={status === 'connected'}><span aria-hidden="true"/>{statusLabel}</div>
    </header>
    <section className={styles.frame} aria-label="Shared time clock">
      <aside className={styles.context} aria-label="Location and time">
        <div className={styles.location}><ClockerIcon name="location" size={20}/><span>Workplace location</span></div>
        <h2>{locationLabel}</h2>
        <div className={styles.clock}>
          <time dateTime={now?.toISOString()} aria-label={now ? `${part('hour')}:${part('minute')} ${part('dayPeriod')}` : 'Loading location time'}>{now ? `${part('hour')}:${part('minute')}` : '--:--'}<span>{part('dayPeriod')}</span></time>
          <p>{date}</p>
          <small>{timeZone.replaceAll('_', ' ')}</small>
        </div>
        <div className={styles.guidance}>
          <div className={styles.guidanceIcon}><ClockerIcon name="shield" size={24}/></div>
          <div><strong>Your workday, recorded.</strong><p>Enter your PIN, choose your action, and wait for confirmation.</p></div>
        </div>
        {deviceName ? <p className={styles.deviceName}>{deviceName}</p> : null}
      </aside>
      <div id="clocker-task" tabIndex={-1} className={styles.task}>{children}</div>
    </section>
    <footer className={styles.footer}><span>Shared workplace time clock</span><span>{NUVORA_BRAND.platform} &middot; {NUVORA_BRAND.poweredBy}</span></footer>
  </main>;
}
