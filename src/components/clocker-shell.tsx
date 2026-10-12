'use client';

import Image from 'next/image';
import { useEffect, useState, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { ClockerIcon } from './clocker-icon';
import styles from './clocker-shell.module.css';

export function ClockerShell({ locationLabel, timeZone, deviceName, status, children }: {
  locationLabel: string; timeZone: string; deviceName?: string;
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

  return <main className={styles.page}>
    <a href="#clocker-task" className={styles.skip}>Skip to time clock</a>
    <header className={styles.header}>
      <div className={styles.brand}><Image src="/images/nevora-wordmark.png" alt="NEVORA" width={132} height={18} priority/><span>Time clock</span></div>
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
