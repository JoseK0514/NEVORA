'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NUVORA_BRAND } from '@/lib/brand';
import { BrandWordmark } from './brand-mark';
import { ClockerIcon } from './clocker-icon';
import { ClockerLanguageToggle, ClockerPresentation, useClockerCopy, useClockerKeepNames, useClockerPresentation } from './clocker-language';
import type { ClockerLocale } from './clocker-copy';
import { useClockerOnline, useWhenBackOnline } from './clocker-online';
import styles from './clocker.module.css';

/* The kiosk's own error and loading screens (Nov 14 inspection, RA-4). Before these, a failure on a shared tablet fell to
 * the public English screen with "Go to sign in". Both use the kiosk's frame (the teal band and one white card) and the
 * language chosen on this tablet (English until someone chooses, as on the kiosk). Never a sign-in link.
 * Phase 8 (Nov 17, 2026): the band keeps its clock and date, so the time is still on the wall when the card has a problem.
 * The page that failed held the location and its time zone, so this clock reads the tablet's own clock, and it is drawn
 * without the date formatter when that formatter is what failed. */
export function clockerFallbackClock(now: Date, locale: ClockerLocale): { time: string; period: string; date: string | null } {
  const intl = locale === 'es' ? 'es-PR' : 'en-US';
  try {
    const parts = new Intl.DateTimeFormat(intl, { hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? '';
    return { time: `${part('hour')}:${part('minute')}`, period: part('dayPeriod'), date: new Intl.DateTimeFormat(intl, { weekday: 'long', month: 'long', day: 'numeric' }).format(now) };
  } catch {
    const hour = now.getHours(), am = hour < 12;
    return { time: `${hour % 12 || 12}:${String(now.getMinutes()).padStart(2, '0')}`, period: locale === 'es' ? am ? 'a. m.' : 'p. m.' : am ? 'AM' : 'PM', date: null };
  }
}
function Band() {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);
  const clock = now ? clockerFallbackClock(now, locale) : null;
  return <aside className={styles.band} aria-label={t('Location and time')}>
    <header className={styles.brand}>
      <span className={styles.wordmark}>
        <span className={styles.logo}><BrandWordmark /></span>
        <span className={styles.label}>{t('Time clock')}</span>
      </span>
    </header>
    <div className={styles.when}>
      <time className={styles.clock} dateTime={now?.toISOString()} aria-label={clock ? `${clock.time} ${clock.period}` : t('Loading location time')}>{clock ? clock.time : '--:--'}<span>{clock?.period}</span></time>
      {clock?.date ? <div className={styles.under}><p className={styles.date}>{clock.date}</p></div> : null}
    </div>
    <footer className={styles.foot}><span className={styles.powered}>{NUVORA_BRAND.poweredBy}</span></footer>
  </aside>;
}
function Frame({ busy, children }: { busy?: boolean; children: ReactNode }) {
  const t = useClockerCopy(), { locale } = useClockerPresentation();
  return <main lang={locale} data-clocker-kiosk="" className={styles.page}>
    <section className={styles.frame} aria-label={t('Shared time clock')}>
      <Band />
      <div className={styles.task}><div className={styles.card}><div className={styles.content} data-align="center" aria-busy={busy}>{children}</div></div></div>
    </section>
  </main>;
}

/** "The time clock hit a problem", with Try again and the manager fallback so nobody leaves without their time recorded. */
export function ClockerErrorScreen({ retry }: { retry: () => void }) {
  return <ClockerPresentation><ErrorBody retry={retry} /></ClockerPresentation>;
}
function ErrorBody({ retry }: { retry: () => void }) {
  const t = useClockerCopy(), keep = useClockerKeepNames(), online = useClockerOnline();
  const heading = useRef<HTMLHeadingElement>(null);
  // Phase 6 (RA-6): a failure with no connection says so, and the screen tries again by itself when it returns.
  useWhenBackOnline(true, retry);
  // Said once (Phase 8): the screen changed under the person, so focus goes to the heading and the line under it is the
  // one alert. No hidden copy of either.
  useEffect(() => { heading.current?.focus({ preventScroll: true }); }, [online]);
  if (!online) return <Frame>
    <span className={styles.ring} data-tone="red"><ClockerIcon name="offline" size={28} mark/></span>
    <h1 ref={heading} tabIndex={-1} className={styles.title}>{t('Time can’t be recorded')}</h1>
    <p role="alert" className={styles.smsg}>{t('This tablet is offline.')}</p>
    <p className={styles.blockedHint}>{t('Tell a manager so your time gets recorded.')}</p>
    <div className={styles.stack}><button type="button" className={styles.btn} data-kind="primary" onClick={retry}>{t('Check connection')}</button></div>
    <p className={styles.clears}>{t('This tablet checks again by itself when the connection returns.')}</p>
    <div className={styles.meta} data-align="center"><ClockerLanguageToggle /></div>
  </Frame>;
  return <Frame>
    <span className={styles.ring} data-tone="red"><ClockerIcon name="stop" size={28} mark/></span>
    <h1 ref={heading} tabIndex={-1} className={styles.title}>{t('The time clock hit a problem')}</h1>
    <p role="alert" className={styles.smsg}>{keep(t('Tap Try again. If it happens again, ask a manager to record your time.'))}</p>
    <div className={styles.stack}><button type="button" className={styles.btn} data-kind="primary" onClick={retry}><ClockerIcon name="refresh" size={20} />{t('Try again')}</button></div>
    <div className={styles.meta} data-align="center"><ClockerLanguageToggle /></div>
  </Frame>;
}

/** The kiosk frame while the page reads its location. */
export function ClockerLoadingScreen() {
  return <ClockerPresentation><LoadingBody /></ClockerPresentation>;
}
function LoadingBody() {
  const t = useClockerCopy();
  return <Frame busy>
    <span className={styles.ring}><ClockerIcon name="wait" size={28} mark/></span>
    <h1 className={styles.title}>{t('Checking this tablet…')}</h1>
    <span className={styles.progress} aria-hidden="true"><i /></span>
  </Frame>;
}
