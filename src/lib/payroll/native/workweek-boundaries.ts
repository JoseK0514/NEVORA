import { Temporal } from '@js-temporal/polyfill';

export type RecurringWorkweekBoundary = Readonly<{
  weekday: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  startTime: string;
  timeZone: 'America/Puerto_Rico';
}>;
export type WorkweekInterval = Readonly<{ startAt: string; endAt: string }>;
export type WorkweekPayPeriod = Readonly<{ startDate: string; endDate: string }>;
export type WorkweekPayContext = Readonly<{
  payWindow: WorkweekInterval;
  fullWeekWindow: WorkweekInterval;
  weeks: readonly WorkweekInterval[];
}>;

// Statutory fallback only; no determination of company notice or employee coverage.
export const PR_STATUTORY_DEFAULT_WORKWEEK: RecurringWorkweekBoundary = Object.freeze({
  weekday: 1, startTime: '00:01', timeZone: 'America/Puerto_Rico',
});
export const PR_STATUTORY_WORKWEEK_SOURCE = Object.freeze({
  url: 'https://bvirtualogp.pr.gov/ogp/Bvirtual/leyesreferencia/PDF/Trabajo/379-1948.pdf',
  article: 5 as const, page: 3 as const, compilationRevision: '2024-04-15' as const,
});

const WEEK_NS = BigInt(168) * BigInt(3600) * BigInt(1000000000);
const MAX_WINDOW_NS = BigInt(124) * BigInt(86400) * BigInt(1000000000);
const MAX_INTERVALS = 20;
const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const INSTANT = /^(?:\d{4}|[+-]\d{6})-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,9})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
type Span = { start: Temporal.Instant; end: Temporal.Instant };
function fail(code: string): never { throw new RangeError(code); }

function record(value: unknown, keys: string[], code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(value).length !== keys.length || keys.some(key => !Object.hasOwn(descriptors, key) || !Object.hasOwn(descriptors[key], 'value'))) fail(code);
  return value as Record<string, unknown>;
}
function basis(value: RecurringWorkweekBoundary): RecurringWorkweekBoundary {
  const b = record(value, ['weekday', 'startTime', 'timeZone'], 'INVALID_WORKWEEK_BOUNDARY');
  if (typeof b.weekday !== 'number' || !Number.isInteger(b.weekday) || b.weekday < 1 || b.weekday > 7 ||
      typeof b.startTime !== 'string' || !TIME.test(b.startTime) || b.timeZone !== 'America/Puerto_Rico') fail('INVALID_WORKWEEK_BOUNDARY');
  return { weekday: b.weekday as RecurringWorkweekBoundary['weekday'], startTime: b.startTime, timeZone: b.timeZone };
}
function point(value: unknown): Temporal.Instant {
  if (typeof value !== 'string' || value.length > 64 || !INSTANT.test(value)) fail('INVALID_WORKWEEK_INSTANT');
  try { return Temporal.Instant.from(value); } catch { return fail('INVALID_WORKWEEK_INSTANT'); }
}
function localStart(date: Temporal.PlainDate, time: string): Temporal.Instant {
  try {
    return date.toPlainDateTime(time).toZonedDateTime('America/Puerto_Rico', { disambiguation: 'reject' }).toInstant();
  } catch { return fail('UNRESOLVABLE_WORKWEEK_BOUNDARY'); }
}
function completeWeek(b: RecurringWorkweekBoundary, startDate: Temporal.PlainDate): Span {
  let nextDate: Temporal.PlainDate;
  try { nextDate = startDate.add({ days: 7 }); } catch { return fail('UNRESOLVABLE_WORKWEEK_BOUNDARY'); }
  const start = localStart(startDate, b.startTime), end = localStart(nextDate, b.startTime);
  if (end.epochNanoseconds - start.epochNanoseconds !== WEEK_NS) fail('NON_168_HOUR_WORKWEEK');
  return { start, end };
}
function containing(b: RecurringWorkweekBoundary, at: Temporal.Instant): Span {
  let date: Temporal.PlainDate;
  try {
    date = at.toZonedDateTimeISO(b.timeZone).toPlainDate();
    date = date.subtract({ days: (date.dayOfWeek - b.weekday + 7) % 7 });
    if (at.epochNanoseconds < localStart(date, b.startTime).epochNanoseconds) date = date.subtract({ days: 7 });
  } catch { return fail('UNRESOLVABLE_WORKWEEK_BOUNDARY'); }
  return completeWeek(b, date);
}
function intervals(b: RecurringWorkweekBoundary, left: Temporal.Instant, right: Temporal.Instant): Span[] {
  let week = containing(b, left);
  const result: Span[] = [];
  for (let count = 0; count < MAX_INTERVALS; count++) {
    result.push(week);
    if (week.end.epochNanoseconds >= right.epochNanoseconds) return result;
    week = containing(b, week.end);
  }
  return fail('WORKWEEK_CONTEXT_LIMIT');
}
const serialized = (span: Span): WorkweekInterval => Object.freeze({ startAt: span.start.toString(), endAt: span.end.toString() });

/** Exact half-open recurring week; validates structure, not notice or applicability. */
export function weekContainingInstant(boundary: RecurringWorkweekBoundary, instant: string): WorkweekInterval {
  return serialized(containing(basis(boundary), point(instant)));
}

/** Civil pay endpoints remain separate from complete weekly context; no daily/rest lookback. */
export function workweeksForPayPeriod(boundary: RecurringWorkweekBoundary, period: WorkweekPayPeriod): WorkweekPayContext {
  const b = basis(boundary), p = record(period, ['startDate', 'endDate'], 'INVALID_PAY_PERIOD');
  let first: Temporal.PlainDate, afterLast: Temporal.PlainDate;
  try {
    if (typeof p.startDate !== 'string' || !DATE.test(p.startDate) || typeof p.endDate !== 'string' || !DATE.test(p.endDate)) fail('INVALID_PAY_PERIOD');
    first = Temporal.PlainDate.from(p.startDate, { overflow: 'reject' });
    const last = Temporal.PlainDate.from(p.endDate, { overflow: 'reject' });
    const days = first.until(last).days;
    if (days < 0 || days > 30) fail('INVALID_PAY_PERIOD');
    afterLast = last.add({ days: 1 });
  } catch { return fail('INVALID_PAY_PERIOD'); }
  const start = localStart(first, '00:00'), end = localStart(afterLast, '00:00');
  const spans = intervals(b, start, end);
  return Object.freeze({
    payWindow: serialized({ start, end }),
    fullWeekWindow: serialized({ start: spans[0].start, end: spans[spans.length - 1].end }),
    weeks: Object.freeze(spans.map(serialized)),
  });
}

/** Weekly starts strictly inside a positive window, retaining exact nanosecond endpoints. */
export function internalWorkweekCuts(boundary: RecurringWorkweekBoundary, window: WorkweekInterval): readonly string[] {
  const b = basis(boundary), w = record(window, ['startAt', 'endAt'], 'INVALID_WORKWEEK_WINDOW');
  const start = point(w.startAt), end = point(w.endAt), length = end.epochNanoseconds - start.epochNanoseconds;
  if (length <= BigInt(0)) fail('INVALID_WORKWEEK_WINDOW');
  if (length > MAX_WINDOW_NS) fail('WORKWEEK_CONTEXT_LIMIT');
  return Object.freeze(intervals(b, start, end).slice(1).map(week => week.start.toString()));
}
