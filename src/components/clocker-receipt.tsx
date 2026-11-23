'use client';

import { useState, type ReactNode } from 'react';
import { durationSentence } from '../lib/duration-format';
import { formatClockTime, wholeTime } from '../lib/date-utils';
import type { PunchAction, PunchReceipt, PunchSnapshot } from '../lib/clocker/punch-types';
import { useClockerCopy } from './clocker-language';
import { ClockerIcon } from './clocker-icon';
import styles from './clocker.module.css';

/* The one Clocker receipt (Direction B, Nov 8, 2026; shared by the normal and photo paths since the Nov 10 review, NV-054):
 * the recorded time as the hero figure, the approved line, the countdown line ("Saved …" only for another day), the
 * eight-second bar and the action reference. */
export const receiptTitles: Record<PunchAction, string> = { CLOCK_IN: 'Clock in recorded', START_BREAK: 'Break start recorded', END_BREAK: 'Break end recorded', CLOCK_OUT: 'Clock out recorded' };
const goodbyes: Record<PunchAction, string> = { CLOCK_IN: 'Have a good shift, {first}.', CLOCK_OUT: 'See you next time, {first}.', START_BREAK: 'Enjoy your break.', END_BREAK: 'Welcome back.' };
/* Phase 6 (Nov 17, 2026): the two break lines carry the first name too, so every receipt says whose it is. Without a name
 * (the photo path can arrive without one) the approved lines above stand as they were. */
const namedGoodbyes: Partial<Record<PunchAction, string>> = { START_BREAK: 'Enjoy your break, {first}.', END_BREAK: 'Welcome back, {first}.' };

/** One fact on the receipt: a label, its value, and the moment it names when it is a time. */
export type ReceiptFact = { label: string; value: string; dateTime?: string; translate?: boolean; params?: Record<string, string | number> };
/** The next useful fact, only from what the reply and the screen before it already hold (Phase 6, item 4): nothing is
 * asked of the server again. Clock out: when the shift started and how long ago. End of a break: when it started and how
 * long it was. Start of a break: which break and its suggested length. Clock in: nothing (the reply has no shift end; see
 * the note for Codex). Never pay, never a total for the week: the next person in line can read this screen.
 * `before` is the state the person acted on; it is used only when it is the same shift or break the receipt names. */
export function receiptFacts(receipt: Pick<PunchReceipt, 'action' | 'performedAt' | 'timeEntryId' | 'breakEntryId' | 'breakType'>, before: PunchSnapshot | null | undefined, timeZone: string, locale = 'en-US'): ReceiptFact[] {
  const at = Date.parse(receipt.performedAt);
  const length = (from: string): ReceiptFact['value'] | null => {
    const minutes = Math.floor((at - Date.parse(from)) / 60000);
    // "under 1 min" (Phase 8): a fact cell holds one short value in both languages ("menos de 1 min").
    return Number.isFinite(minutes) && minutes >= 0 ? minutes < 1 ? 'under 1 min' : durationSentence(minutes) : null;
  };
  if (receipt.action === 'CLOCK_OUT' && before?.entry && before.entry.id === receipt.timeEntryId) {
    const since = length(before.entry.clockInAt);
    return [{ label: 'Clocked in at', value: shortTime(before.entry.clockInAt, timeZone, at, locale), dateTime: before.entry.clockInAt },
      ...(since ? [{ label: 'Clocked in for', value: since, translate: since === 'under 1 min' }] : [])];
  }
  if (receipt.action === 'END_BREAK' && before?.break && before.break.id === receipt.breakEntryId) {
    const took = length(before.break.breakStartAt);
    return [{ label: 'Break started at', value: shortTime(before.break.breakStartAt, timeZone, at, locale), dateTime: before.break.breakStartAt },
      ...(took ? [{ label: 'Break length', value: took, translate: took === 'under 1 min' }] : [])];
  }
  if (receipt.action === 'START_BREAK' && receipt.breakType) {
    return [{ label: 'Break type', value: receipt.breakType.name },
      ...(receipt.breakType.targetMinutes !== null ? [{ label: 'Suggested length', value: '{minutes} min', translate: true, params: { minutes: receipt.breakType.targetMinutes } }] : [])];
  }
  return [];
}

/** A time on the receipt in the one time format ("10:47 PM"; Spanish "10:47 p. m."), kept whole on its line. */
const receiptTime = (value: string, timeZone: string, locale: string) => wholeTime(formatClockTime(value, timeZone, locale));
/** "Nov 9 · 10:47 PM"; in Spanish "9 nov · 10:47 p. m.". Intl orders the date for each language (Nov 10 review, NV-183). */
export function clockTime(value: string, timeZone: string, locale = 'en-US'): string {
  const date = new Date(value);
  const day = new Intl.DateTimeFormat(locale, { timeZone, month: 'short', day: 'numeric' }).format(date);
  return `${day} · ${receiptTime(value, timeZone, locale)}`;
}
function dayKey(value: Date, timeZone: string) { return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value); }
/** "8:02 AM" today, "Oct 19 · 10:02 PM" on another day. */
export function shortTime(value: string, timeZone: string, now: number, locale = 'en-US'): string {
  if (dayKey(new Date(value), timeZone) !== dayKey(new Date(now), timeZone)) return clockTime(value, timeZone, locale);
  return receiptTime(value, timeZone, locale);
}

export function ClockerReceipt({ action, performedAt, commandId, timeZone, locale, firstName, facts = [], children }: {
  action: PunchAction; performedAt: string; commandId?: string | null; timeZone: string; locale: string; firstName: string;
  /** The next useful fact (receiptFacts), under the approved line. */
  facts?: ReceiptFact[];
  /** Notes between the approved line and "Saved …" (the photo outcome). */
  children?: ReactNode;
}) {
  const t = useClockerCopy();
  const [now] = useState(() => Date.now());
  const recordedAt = receiptTime(performedAt, timeZone, locale);
  // One sentence with a placeholder (NV-173), only for a receipt from another day (NV-303): "Saved Nov 9 · 10:47 PM."
  // Spanish times end in "p. m.", so the sentence doesn't add a second full stop.
  const savedAt = shortTime(performedAt, timeZone, now, locale), dated = savedAt !== recordedAt;
  const [before, after = ''] = t('Saved {time}. This screen clears in 8 seconds.', { time: '\u0000' }).split('\u0000');
  const rest = savedAt.endsWith('.') && after.startsWith('.') ? after.slice(1) : after;
  // The second sentence stays whole (Phase 8, #11): two lines break between the sentences, never inside the second.
  const [, lead = '', clears = ''] = /^([.\s]*)([\s\S]*)$/.exec(rest) ?? [];
  return <>
    <p className={styles.hero}><time dateTime={performedAt}>{recordedAt}</time></p>
    {firstName || action === 'START_BREAK' || action === 'END_BREAK' ? <p className={styles.bye}>{t(firstName ? namedGoodbyes[action] ?? goodbyes[action] : goodbyes[action], { first: firstName })}</p> : null}
    {facts.length ? <dl className={styles.facts} data-clocker-receipt-facts="">{facts.map(fact => <div key={fact.label}><dt>{t(fact.label)}</dt>
      <dd>{fact.dateTime ? <time dateTime={fact.dateTime}>{fact.value}</time> : fact.translate ? t(fact.value, fact.params) : fact.value}</dd></div>)}</dl> : null}
    {children}
    {/* K11 (Nov 23, 2026): the time is said once. When it was saved today the large time above already says when, so
      * the line is only the countdown; a receipt from another day still says "Saved Nov 9 · 10:47 PM" (the date is new). */}
    {dated ? <p role="status" className={styles.saved}>{before}<time dateTime={performedAt}>{savedAt}</time>{lead}{clears ? <span className={styles.clearsIn}>{clears}</span> : null}</p>
      : <p role="status" className={styles.saved}>{t('This screen clears in {seconds} seconds.', { seconds: 8 })}</p>}
    <span className={styles.countdown} aria-hidden="true"><i/></span>
    {commandId ? <details className={styles.reference}><summary>{t('Reference')}<ClockerIcon name="caret" size={16}/></summary><code>{commandId}</code></details> : null}
  </>;
}
