'use client';

import { useState, type ReactNode } from 'react';
import type { PunchAction } from '../lib/clocker/punch-types';
import { useClockerCopy } from './clocker-language';
import { ClockerIcon } from './clocker-icon';
import styles from './clocker.module.css';

/* The one Clocker receipt (Direction B, Nov 8, 2026; shared by the normal and photo paths since the Nov 10 review, NV-054):
 * the recorded time as the hero figure, the approved line, "Saved …", the eight-second bar and the action reference. */
export const receiptTitles: Record<PunchAction, string> = { CLOCK_IN: 'Clock In recorded', START_BREAK: 'Break start recorded', END_BREAK: 'Break end recorded', CLOCK_OUT: 'Clock Out recorded' };
const goodbyes: Record<PunchAction, string> = { CLOCK_IN: 'Have a good shift, {first}.', CLOCK_OUT: 'See you next time, {first}.', START_BREAK: 'Enjoy your break.', END_BREAK: 'Welcome back.' };

/** "Nov 9 · 10:47 PM"; in Spanish "9 nov · 10:47 p. m.". Intl orders the date for each language (Nov 10 review, NV-183). */
export function clockTime(value: string, timeZone: string, locale = 'en-US'): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat(locale, { timeZone, month: 'short', day: 'numeric' }).format(date);
  const time = new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  return `${day} · ${time}`;
}
function dayKey(value: Date, timeZone: string) { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value); }
/** "8:02 AM" today, "Oct 19 · 10:02 PM" on another day. */
export function shortTime(value: string, timeZone: string, now: number, locale = 'en-US'): string {
  if (dayKey(new Date(value), timeZone) !== dayKey(new Date(now), timeZone)) return clockTime(value, timeZone, locale);
  return new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(value));
}

export function ClockerReceipt({ action, performedAt, commandId, timeZone, locale, firstName, children }: {
  action: PunchAction; performedAt: string; commandId?: string | null; timeZone: string; locale: string; firstName: string;
  /** Notes between the approved line and "Saved …" (the photo outcome). */
  children?: ReactNode;
}) {
  const t = useClockerCopy();
  const [now] = useState(() => Date.now());
  const recordedAt = new Intl.DateTimeFormat(locale, { timeZone, hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(performedAt));
  // One sentence with a placeholder (NV-173). The date shows only when it isn't today (NV-303). Spanish times end in
  // "p. m.", so the sentence doesn't add a second full stop.
  const savedAt = shortTime(performedAt, timeZone, now, locale);
  const [before, after = ''] = t('Saved {time}. This screen clears in 8 seconds.', { time: '\u0000' }).split('\u0000');
  const rest = savedAt.endsWith('.') && after.startsWith('.') ? after.slice(1) : after;
  return <>
    <p className={styles.hero}><time dateTime={performedAt}>{recordedAt}</time></p>
    {firstName || action === 'START_BREAK' || action === 'END_BREAK' ? <p className={styles.bye}>{t(goodbyes[action], { first: firstName })}</p> : null}
    {children}
    <p role="status" className={styles.saved}>{before}<time dateTime={performedAt}>{savedAt}</time>{rest}</p>
    <span className={styles.countdown} aria-hidden="true"><i/></span>
    {commandId ? <details className={styles.reference}><summary>{t('Action reference')}<ClockerIcon name="caret" size={16}/></summary><code>{commandId}</code></details> : null}
  </>;
}
