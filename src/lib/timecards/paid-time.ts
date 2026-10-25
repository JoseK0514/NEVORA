import { Temporal } from '@js-temporal/polyfill';
import type { Timecard, TimecardBreak, TimecardEntry } from './project';
import { formatElapsed } from '../date-utils';

/* Business P0-3 (Oct 25, 2026): the headline number on a timecard is paid time, not elapsed time.
 * Paid time = elapsed recorded time − unpaid breaks. Breaks are always shown separately.
 *
 * Source of truth: Team P adds `paidSeconds` on the server (card, item or entry). Until it ships, the same figure is
 * computed here from the recorded entries already on the card: a break is unpaid unless its source marks it paid
 * (`paid: true`) or classifies it as a rest break (`category: 'REST'`). Today's sources carry neither, so every
 * recorded break counts as unpaid, which never shows more paid time than was worked. This is display only: it never
 * feeds approval, payroll or exports. */

const NS = BigInt(1_000_000_000);
const ns = (instant: string) => Temporal.Instant.from(instant).epochNanoseconds;
const finiteSeconds = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? Math.floor(value) : null;

/** A break counts as paid only when its source says so. */
export function breakIsPaid(value: TimecardBreak): boolean {
  const extra = value as TimecardBreak & { paid?: unknown; category?: unknown };
  return extra.paid === true || extra.category === 'REST';
}

type Window = { start: bigint; end: bigint; observed: bigint };
const windowOf = (card: Pick<Timecard, 'startAt' | 'endAt' | 'observedAt'>): Window => ({ start: ns(card.startAt), end: ns(card.endAt), observed: ns(card.observedAt) });
/** Elapsed nanoseconds inside the period, an open interval running to the observation (the projection's own rule). */
function clipped(window: Window, from: string, to: string | null) {
  const left = ns(from) > window.start ? ns(from) : window.start;
  const actual = to === null ? window.observed : ns(to);
  const right = actual < window.end ? actual : window.end;
  return right > left ? right - left : BigInt(0);
}

/** Paid seconds for one recorded entry. */
export function entryPaidSeconds(card: Pick<Timecard, 'startAt' | 'endAt' | 'observedAt'>, entry: TimecardEntry): number {
  const server = finiteSeconds((entry as TimecardEntry & { paidSeconds?: unknown }).paidSeconds);
  if (server !== null) return server;
  const window = windowOf(card);
  let paid = clipped(window, entry.startAt, entry.endAt);
  for (const item of entry.breaks) if (!breakIsPaid(item)) paid -= clipped(window, item.startAt, item.endAt);
  return Number((paid > BigInt(0) ? paid : BigInt(0)) / NS);
}

/** Paid seconds for the whole card: the server's `paidSeconds` when present, otherwise the sum of its entries. */
export function paidSeconds(card: Timecard, item?: object): number {
  const server = finiteSeconds((item as { paidSeconds?: unknown } | undefined)?.paidSeconds) ?? finiteSeconds(card.paidSeconds);
  if (server !== null) return server;
  return card.entries.reduce((sum, entry) => sum + entryPaidSeconds(card, entry), 0);
}

/** Recorded or paid time from seconds, in the lead's one duration format: "8 h", "7 h 23 min", "0 min". */
export function hoursText(seconds: number): string {
  return formatElapsed(Number.isFinite(seconds) ? seconds / 60 : 0);
}

/** The same, from a nanosecond string, as the projection reports breaks and recorded time. */
export function hoursFromNanoseconds(value: string): string {
  if (!/^\d+$/.test(value)) return '—';
  return hoursText(Number(BigInt(value) / NS));
}

/** The workplace date an entry starts on (YYYY-MM-DD). */
export function entryDay(entry: Pick<TimecardEntry, 'startAt'>, timeZone: string): string {
  return Temporal.Instant.from(entry.startAt).toZonedDateTimeISO(timeZone).toPlainDate().toString();
}

/** "HH:MM" on the workplace clock, for the shared time-range formatter. */
export function clockTime(instant: string, timeZone: string): string {
  const time = Temporal.Instant.from(instant).toZonedDateTimeISO(timeZone);
  return `${String(time.hour).padStart(2, '0')}:${String(time.minute).padStart(2, '0')}`;
}
