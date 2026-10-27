'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { BrandWordmark } from './brand-mark';
import { ClockerIcon } from './clocker-icon';
import {useClockerCopy,useClockerPresentation} from './clocker-language';
import v2styles from './clocker-v2.module.css';
import styles from './clocker-shell.module.css';

/** Signature Clocker: a deep-teal side (phone: top band) with the location, a large light clock and the tablet
 * status, beside a soft-white task area. */
export function ClockerShell({ locationLabel, timeZone, deviceName, status, children, brand }: {
  locationLabel: string; timeZone: string; deviceName?: string;
  /** Company brand (B1): kiosk colour tokens and an optional logo beside the wordmark. */
  brand?: { style?: Record<string, string>; logoUrl?: string | null };
  status: 'checking' | 'connected' | 'setup' | 'unconfirmed'; children: ReactNode;
}) {
  const t=useClockerCopy(),{v2,locale}=useClockerPresentation();
  const frame=useRef<HTMLElement>(null),rail=useRef<HTMLElement>(null);
  const [stacked,setStacked]=useState(false);
  useEffect(()=>{if(!v2||!frame.current||!rail.current)return;const measure=()=>{if(frame.current&&rail.current)setStacked(rail.current.offsetWidth>=frame.current.clientWidth-1);};const observer=new ResizeObserver(measure);observer.observe(frame.current);observer.observe(rail.current);measure();return()=>observer.disconnect();},[v2]);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const parts = now ? new Intl.DateTimeFormat(v2&&locale==='es'?'es-PR':'en-US', { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now) : [];
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
  const date = now ? new Intl.DateTimeFormat(v2&&locale==='es'?'es-PR':'en-US', { timeZone, weekday: 'long', month: 'long', day: 'numeric' }).format(now) : t('Loading location time');
  const statusLabel = status === 'connected' ? v2?'Tablet registered':'Tablet connected' : status === 'checking' ? 'Checking setup' : status === 'unconfirmed' ? 'Setup needs checking' : 'Setup required';
  const zone = timeZone.split('/').at(-1)?.replaceAll('_', ' ') ?? timeZone;

  return <main lang={v2?locale:undefined} data-clocker-v2={v2||undefined} data-clocker-stacked={v2?stacked:undefined} className={`${styles.page} ${v2?v2styles.page:''}`} data-sig-surface="light" data-mobile-clocker="true" style={brand?.style as CSSProperties | undefined}>
    <a href="#clocker-task" className={styles.skip}>{t("Skip to time clock")}</a>
    <section ref={frame} data-clocker-part="frame" className={v2?v2styles.frame:styles.frame} aria-label={t("Shared time clock")}>
      <aside ref={rail} data-clocker-part="side" className={v2?v2styles.side:styles.side} data-sig-surface="deep" aria-label={t("Location and time")}>
        {!v2?<svg className={styles.mark} viewBox="0 0 360 340" aria-hidden="true" focusable="false"><path d="M20 330 L180 30 L340 330 L276 330 L180 150 L84 330 Z"/><path className={styles.markSky} d="M146 330 L180 266 L214 330 Z"/></svg>:null}
        <header data-clocker-part="brand" className={v2?v2styles.brand:styles.brand}>
          <span data-clocker-part="wordmark" className={v2?v2styles.wordmark:styles.wordmark}>
            {/* The app's wordmark (official PNG recoloured through a mask, cyan A kept), white on the deep side as on sign-in. */}
            <span data-clocker-part="logo" className={v2?v2styles.logo:styles.logo}><BrandWordmark /></span>
            <span>{t("Time clock")}</span>
          </span>
          {brand?.logoUrl ? <span data-clocker-part="companyLogo" className={v2?v2styles.companyLogo:styles.companyLogo}>
            {/* eslint-disable-next-line @next/next/no-img-element -- an immutable, same-origin asset already sized for the chip */}
            <img src={brand.logoUrl} alt={t('Company logo')} decoding="async"/>
          </span> : null}
        </header>
        <div data-clocker-part="when" className={v2?v2styles.when:styles.when}>
          <h2 data-clocker-part="location" className={v2?v2styles.location:styles.location}><ClockerIcon name="location" size={16} weight={v2?'regular':'fill'}/><span>{locationLabel}</span></h2>
          <div data-clocker-part="clock" className={v2?v2styles.clock:styles.clock}>
            <time dateTime={now?.toISOString()} aria-label={now ? `${part('hour')}:${part('minute')} ${part('dayPeriod')}` : t('Loading location time')}>{now ? `${part('hour')}:${part('minute')}` : '--:--'}<span>{part('dayPeriod')}</span></time>
            <p>{date}</p>
          </div>
        </div>
        <footer data-clocker-part="foot" className={v2?v2styles.foot:styles.foot}>
          <span data-clocker-part="status" className={v2?v2styles.status:styles.status} data-connected={status === 'connected'} data-attention={status === 'setup' || status === 'unconfirmed'}><span aria-hidden="true"/>{t(statusLabel)}</span>
          <span data-clocker-part="zone" className={v2?v2styles.zone:styles.zone}>{t('{zone} time',{zone})}{deviceName ? <>{' · '}{deviceName}</> : null}</span>
          <span data-clocker-part="powered" className={v2?v2styles.powered:styles.powered}>{NUVORA_BRAND.poweredBy}</span>
        </footer>
      </aside>
      <div id="clocker-task" tabIndex={-1} data-clocker-part="task" className={v2?v2styles.task:styles.task}>{children}</div>
    </section>
  </main>;
}
