/**
 * Business-local calendar values cross into elapsed time only through an explicit
 * IANA zone. Scheduling periods use nominal wall minutes; clock and calendar
 * events use instants, so converting either model with the host zone is unsafe.
 */
import { wholeSpanishTimes } from './i18n/whole-spanish-times';
import { Temporal } from '@js-temporal/polyfill';
import { shiftPeriod, type ShiftPeriodInput } from './scheduling/periods';

export class InvalidBusinessLocalTimeError extends Error {
  constructor() { super('Enter a valid business-local time that is neither ambiguous nor skipped by daylight saving time.'); }
}
function zoned(now: Date, timeZone: string) {
  return Temporal.Instant.fromEpochMilliseconds(now.getTime()).toZonedDateTimeISO(timeZone);
}
export function businessDate(now: Date, timeZone: string): string {
  return zoned(now, timeZone).toPlainDate().toString();
}
export function businessTime(now: Date, timeZone: string): string {
  return zoned(now, timeZone).toPlainTime().toString({ smallestUnit: 'minute' });
}
/** Reject DST gaps and repeated times instead of guessing which instant a form meant. */
export function localDateTimeToInstant(local: string, timeZone: string): string {
  try {
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local)) throw new Error();
    const value = Temporal.PlainDateTime.from(local, { overflow: 'reject' });
    return new Date(value.toZonedDateTime(timeZone, { disambiguation: 'reject' }).epochMilliseconds).toISOString();
  } catch { throw new InvalidBusinessLocalTimeError(); }
}
/** Convert event boundaries only; scheduled hours remain nominal wall minutes. */
export function shiftBoundaryInstants(shift: ShiftPeriodInput, timeZone: string): { startAt: string; endAt: string } {
  try {
    const period = shiftPeriod(shift);
    // UTC serialization preserves nominal calendar coordinates; these are not elapsed instants.
    const nominalLocalDateTime = (minutes: number) => new Date(minutes * 60000).toISOString().slice(0, 16);
    return { startAt: localDateTimeToInstant(nominalLocalDateTime(period.start), timeZone), endAt: localDateTimeToInstant(nominalLocalDateTime(period.end), timeZone) };
  } catch { throw new InvalidBusinessLocalTimeError(); }
}
export function formatBusinessDateTimeInput(iso: string | undefined, timeZone: string): string {
  if (!iso) return '';
  const value = Temporal.Instant.from(iso).toZonedDateTimeISO(timeZone);
  return value.toPlainDateTime().toString({ smallestUnit: 'minute' });
}
/** Preserve the exact stored instant when a minute-resolution form is unchanged. */
export function policyEffectiveInstant(local: string, original: string | undefined, timeZone: string): string {
  if (original && local === formatBusinessDateTimeInput(original, timeZone)) return original;
  return localDateTimeToInstant(local, timeZone);
}
const ES_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

/** `lang` (signed-in Spanish, es-rest R2): "Dec 7, 6:00 AM" in Spanish is "7 dic, 6:00 a. m." (docs/design/voice.md). */
export function formatBusinessDateTime(iso: string, timeZone: string, lang: 'en' | 'es' = 'en'): string {
  if (lang === 'es') {
    const es = new Intl.DateTimeFormat('en-US', { timeZone, month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' }).formatToParts(new Date(iso));
    const part = (type: Intl.DateTimeFormatPartTypes) => es.find(item => item.type === type)?.value ?? '';
    return wholeSpanishTimes(`${part('day')} ${ES_MONTHS[Number(part('month')) - 1]}, ${part('hour')}:${part('minute')} ${part('dayPeriod') === 'AM' ? 'a. m.' : 'p. m.'}`);
  }
  // Browser ICU versions differ in their literal punctuation ("," vs "at").
  // Compose the same readable timestamp during server rendering and hydration.
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).formatToParts(new Date(iso));
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value;
  return `${value('month')} ${value('day')}, ${value('hour')}:${value('minute')} ${value('dayPeriod')}`;
}

export function formatBusinessTimestamp(iso: string, timeZone: string, lang: 'en' | 'es' = 'en'): string {
  return formatBusinessDateTime(iso, timeZone, lang);
}
