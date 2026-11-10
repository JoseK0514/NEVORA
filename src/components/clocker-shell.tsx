'use client';

import { createContext, useCallback, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { BrandWordmark } from './brand-mark';
import { ClockerIcon } from './clocker-icon';
import {useClockerCopy,useClockerIntlLocale,useClockerPresentation} from './clocker-language';
import styles from './clocker.module.css';

/** What the band's tablet status says while the card shows a blocked state (Nov 10 review, NV-049). Presentation only: the
 * PIN gate and the punch panel report it; the band shows it in place of "Tablet registered" with the amber dot. */
export type TabletHealth = 'reconnect' | 'offline' | 'paused' | 'storage';
const healthLabels: Record<TabletHealth, string> = { reconnect: 'Reconnect needed', offline: 'No connection', paused: 'Paused: too many attempts', storage: 'Storage blocked' };
type HealthReport = (source: 'gate' | 'panel', health: TabletHealth | null) => void;
const TabletHealthChannel = createContext<HealthReport | null>(null);
/** Reports this screen's tablet health to the band while it is shown, and clears it when the screen goes. */
export function useReportTabletHealth(source: 'gate' | 'panel', health: TabletHealth | null) {
  const report = useContext(TabletHealthChannel);
  useEffect(() => { report?.(source, health); return () => report?.(source, null); }, [report, source, health]);
}

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
  const [health, setHealth] = useState<{ gate: TabletHealth | null; panel: TabletHealth | null }>({ gate: null, panel: null });
  const report = useCallback<HealthReport>((source, value) => setHealth(current => current[source] === value ? current : { ...current, [source]: value }), []);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const parts = now ? new Intl.DateTimeFormat(intl, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now) : [];
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  const date = now ? new Intl.DateTimeFormat(intl, { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(now) : t('Loading location time');
  // A blocked PIN or clock screen speaks for the tablet; otherwise the setup check does.
  const blocked = status === 'connected' ? health.gate ?? health.panel : null;
  const statusLabel = blocked ? healthLabels[blocked] : status === 'connected' ? 'Tablet registered' : status === 'checking' ? 'Checking setup' : status === 'unconfirmed' ? 'Setup needs checking' : 'Setup required';
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
          <span className={`${styles.status} ${styles.glass}`} data-tone={status === 'connected' && !blocked ? 'ok' : 'attn'}><span className={styles.dot} aria-hidden="true"/><span className={styles.statusLabel}>{t(statusLabel)}</span>
            <span className={styles.zone}>{t('{zone} time',{zone})}{deviceName ? <>{' · '}{deviceName}</> : null}</span></span>
          <span className={styles.powered}>{NUVORA_BRAND.poweredBy}</span>
        </footer>
      </aside>
      <div id="clocker-task" tabIndex={-1} className={styles.task}><div className={styles.card}><TabletHealthChannel.Provider value={report}>{children}</TabletHealthChannel.Provider></div></div>
    </section>
  </main>;
}
