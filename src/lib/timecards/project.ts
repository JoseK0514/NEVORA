import {durationText} from '@/lib/duration-text';
import {mealWarningsForDay,type MealDayEntry,type MealWarning} from '@/lib/payroll/native/meal-periods';
import { Temporal } from '@js-temporal/polyfill';

export type Period = { startDate: string; endDate: string };
export type TimecardBreak = {
  id: string; startAt: string; endAt: string | null; rawStartAt: string; rawEndAt: string | null;
  name: string; adjustmentId: string | null;
};
export type TimecardEntry = {
  id: string; locationId: string; locationName: string; positionId: string | null; positionName: string | null;
  sourceKind: 'RECORDED' | 'ADJUSTMENT'; adjustmentId: string | null; recordedVersion: number | null;
  startAt: string; endAt: string | null; rawStartAt: string | null; rawEndAt: string | null;
  breaks: TimecardBreak[];
};
export type TimecardCorrection = {
  id: string; kind: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string; startAt: string; endAt: string; revision: number;
};
export type TimecardSource = Period & {
  employeeId: string; employeeName: string; timeZone: string;
  pendingCorrections: number; entries: TimecardEntry[]; corrections: TimecardCorrection[];
};
export type TimecardIssue = 'period_open' | 'open_entry' | 'open_break' | 'pending_correction' | 'overlapping_time';
export type Timecard = TimecardSource & {
  observedAt: string; startAt: string; endAt: string; recordedNanoseconds: string; breakNanoseconds: string;
  /** Paid time = elapsed − unpaid breaks of the entries that START in this period
   * (shift-start-day attribution, as payroll pays them: an overnight entry counts wholly
   * on its start day). Breaks are classified by the employee's payroll break rules (the
   * rule native payroll applies). null when any such break is not classified yet;
   * paidSeconds is the whole-second floor. recordedNanoseconds stays clipped elapsed. */
  paidNanoseconds: string | null; paidSeconds: number | null; unpaidBreakNanoseconds: string | null;
  /** Non-blocking meal-period review flags per attributed business day; days with an
   * unclassified break are not evaluated. */
  mealWarnings: MealWarning[];
  issues: TimecardIssue[];
};
/** Server-resolved payroll classification of one recorded break. */
export type TimecardBreakClass = { pay: 'PAID' | 'UNPAID'; kind: 'MEAL' | 'REST'; mealMinimumMinutes: 30 | 60 };
/** Per recorded break id; absent means not classified. */
export type TimecardBreakPay = Record<string, TimecardBreakClass>;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 300): v is string => typeof v === 'string' && v.trim() === v && v.length > 0 && v.length <= max && !/[\u0000-\u001f\u007f]/.test(v);
const nullableText = (v: unknown): v is string | null => v === null || text(v);
const instant = (v: unknown): string => { if (!text(v, 100)) throw new Error('Invalid instant'); return Temporal.Instant.from(v).toString(); };
const nullableInstant = (v: unknown): string | null => v === null ? null : instant(v);
const ns = (v: string) => Temporal.Instant.from(v).epochNanoseconds;

/** Validate an inclusive business-date range of at most 31 days without date normalization. */
export function parsePeriod(startDate: string, endDate: string): Period {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) throw new Error('Choose a valid period');
  const start = Temporal.PlainDate.from(startDate, { overflow: 'reject' });
  const end = Temporal.PlainDate.from(endDate, { overflow: 'reject' });
  const days = start.until(end).days;
  if (days < 0 || days > 30) throw new Error('Choose a period of 1 to 31 days');
  return { startDate, endDate };
}

/** Convert inclusive local dates to a half-open instant interval; DST changes its elapsed length. */
export function periodInstants(period: Period, timeZone: string) {
  parsePeriod(period.startDate, period.endDate);
  return {
    startAt: Temporal.PlainDate.from(period.startDate).toZonedDateTime(timeZone).toInstant().toString(),
    endAt: Temporal.PlainDate.from(period.endDate).add({ days: 1 }).toZonedDateTime(timeZone).toInstant().toString(),
  };
}

function parseBreak(v: unknown): TimecardBreak {
  if (!record(v) || !text(v.id) || !text(v.name) || !nullableText(v.adjustmentId)) throw new Error('Invalid break');
  const startAt = instant(v.startAt), endAt = nullableInstant(v.endAt);
  const rawStartAt = instant(v.rawStartAt), rawEndAt = nullableInstant(v.rawEndAt);
  if ((endAt && ns(endAt) <= ns(startAt)) || (rawEndAt && ns(rawEndAt) <= ns(rawStartAt))) throw new Error('Invalid break interval');
  return { id: v.id, name: v.name, adjustmentId: v.adjustmentId, startAt, endAt, rawStartAt, rawEndAt };
}
function parseEntry(v: unknown): TimecardEntry {
  if (!record(v) || !text(v.id) || !text(v.locationId) || !text(v.locationName) ||
      !nullableText(v.positionId) || !nullableText(v.positionName) || !nullableText(v.adjustmentId) ||
      !['RECORDED','ADJUSTMENT'].includes(String(v.sourceKind)) || !Array.isArray(v.breaks) || v.breaks.length > 1000 ||
      !(v.recordedVersion === null || (Number.isSafeInteger(v.recordedVersion) && Number(v.recordedVersion) >= 0))) throw new Error('Invalid entry');
  const startAt = instant(v.startAt), endAt = nullableInstant(v.endAt);
  const rawStartAt = nullableInstant(v.rawStartAt), rawEndAt = nullableInstant(v.rawEndAt);
  if (endAt && ns(endAt) <= ns(startAt)) throw new Error('Invalid entry interval');
  if (v.sourceKind === 'RECORDED' && (rawStartAt === null || v.recordedVersion === null)) throw new Error('Missing raw provenance');
  if (v.sourceKind === 'ADJUSTMENT' && (!v.adjustmentId || rawStartAt !== null || rawEndAt !== null || v.breaks.length)) throw new Error('Invalid adjustment provenance');
  const breaks = v.breaks.map(parseBreak).sort((a,b) => Temporal.Instant.compare(a.startAt,b.startAt));
  if (new Set(breaks.map(b => b.id)).size !== breaks.length) throw new Error('Duplicate breaks');
  for (let i = 0; i < breaks.length; i++) {
    const b = breaks[i];
    if (ns(b.startAt) < ns(startAt) || (endAt && (!b.endAt || ns(b.endAt) > ns(endAt))) ||
        (i && (breaks[i-1].endAt === null || ns(b.startAt) < ns(breaks[i-1].endAt!)))) throw new Error('Inconsistent breaks');
  }
  return { id: v.id, locationId: v.locationId, locationName: v.locationName, positionId: v.positionId, positionName: v.positionName,
    sourceKind: v.sourceKind as TimecardEntry['sourceKind'], adjustmentId: v.adjustmentId,
    recordedVersion: v.recordedVersion as number | null, startAt, endAt, rawStartAt, rawEndAt, breaks };
}

function parseBreakPay(v: unknown, entries: TimecardEntry[]): TimecardBreakPay {
  if (!record(v)) throw new Error('Invalid break pay');
  const ids = new Set(entries.flatMap(e => e.breaks.map(b => b.id)));
  const out: TimecardBreakPay = {};
  for (const [id, value] of Object.entries(v)) {
    if (!ids.has(id) || !record(value) || Object.keys(value).length !== 3 || (value.pay !== 'PAID' && value.pay !== 'UNPAID') ||
        (value.kind !== 'MEAL' && value.kind !== 'REST') || (value.mealMinimumMinutes !== 30 && value.mealMinimumMinutes !== 60)) throw new Error('Invalid break pay');
    out[id] = { pay: value.pay, kind: value.kind, mealMinimumMinutes: value.mealMinimumMinutes };
  }
  return out;
}

/**
 * Validate the complete source and total elapsed nanoseconds clipped to the period.
 * Break totals remain separate from recorded time. Paid time counts entries by their
 * start day and subtracts only breaks the server classified as unpaid with the payroll
 * break rule; it never guesses. Open intervals stop at observedAt and remain approval issues.
 * Raw punches and adjustment provenance are retained alongside effective boundaries.
 */
export function projectTimecard(source: unknown, observedAt: string, breakPay: unknown = {}): Timecard {
  if (!record(source) || !text(source.employeeId) || !text(source.employeeName) || !text(source.timeZone,100) ||
      !text(source.startDate) || !text(source.endDate) || !Number.isSafeInteger(source.pendingCorrections) || Number(source.pendingCorrections) < 0 ||
      !Array.isArray(source.entries) || source.entries.length > 10000 || !Array.isArray(source.corrections) || source.corrections.length > 10000) throw new Error('Invalid timecard source');
  const period = parsePeriod(source.startDate,source.endDate);
  const boundaries = periodInstants(period,source.timeZone);
  const observed = ns(instant(observedAt)), start = ns(boundaries.startAt), end = ns(boundaries.endAt);
  const entries = source.entries.map(parseEntry).sort((a,b) => Temporal.Instant.compare(a.startAt,b.startAt) || a.id.localeCompare(b.id));
  if (new Set(entries.map(e => e.id)).size !== entries.length) throw new Error('Duplicate entries');
  const corrections = source.corrections.map((v): TimecardCorrection => {
    if (!record(v) || !text(v.id) || !['ENTRY_BOUNDARY','BREAK_BOUNDARY','MISSING_ENTRY'].includes(String(v.kind)) ||
        !['PENDING','APPROVED','REJECTED'].includes(String(v.status)) || !text(v.reason,500) || !Number.isSafeInteger(v.revision) || Number(v.revision) < 1) throw new Error('Invalid correction');
    const startAt = instant(v.startAt), endAt = instant(v.endAt);
    if (ns(endAt) <= ns(startAt)) throw new Error('Invalid correction interval');
    return { id:v.id,kind:String(v.kind),status:v.status as TimecardCorrection['status'],reason:v.reason,revision:Number(v.revision),startAt,endAt };
  });
  const pay = parseBreakPay(breakPay, entries);
  const issues = new Set<TimecardIssue>();
  if (observed < end) issues.add('period_open');
  if (source.pendingCorrections) issues.add('pending_correction');
  let recorded = BigInt(0), breakTime = BigInt(0), unpaid = BigInt(0), paidTime = BigInt(0), classified = true, previousEnd: bigint | null = null;
  const mealDays = new Map<string, { entries: MealDayEntry[]; classified: boolean }>();
  const elapsed = (a: string, b: string | null) => {
    const left = ns(a) > start ? ns(a) : start;
    const actualEnd = b === null ? observed : ns(b);
    const right = actualEnd < end ? actualEnd : end;
    return right > left ? right - left : BigInt(0);
  };
  for (const entry of entries) {
    if (entry.endAt === null) issues.add('open_entry');
    const entryEnd = entry.endAt === null ? observed : ns(entry.endAt);
    if (previousEnd !== null && ns(entry.startAt) < previousEnd) issues.add('overlapping_time');
    if (previousEnd === null || entryEnd > previousEnd) previousEnd = entryEnd;
    recorded += elapsed(entry.startAt,entry.endAt);
    for (const b of entry.breaks) {
      if (b.endAt === null) issues.add('open_break');
      breakTime += elapsed(b.startAt,b.endAt);
    }
    // Attribution: an entry belongs wholly to the business day it starts on.
    if (ns(entry.startAt) < start || ns(entry.startAt) >= end) continue;
    const date = Temporal.Instant.from(entry.startAt).toZonedDateTimeISO(source.timeZone).toPlainDate().toString();
    const day = mealDays.get(date) ?? { entries: [], classified: true };
    const meals: MealDayEntry['breaks'] = [];
    paidTime += entryEnd - ns(entry.startAt);
    for (const b of entry.breaks) {
      const kind = pay[b.id];
      if (!kind || b.endAt === null) { classified = false; day.classified = false; continue; }
      if (kind.pay === 'UNPAID') { unpaid += ns(b.endAt) - ns(b.startAt); paidTime -= ns(b.endAt) - ns(b.startAt); }
      meals.push({ start: ns(b.startAt), end: ns(b.endAt), kind: kind.kind, mealMinimumMinutes: kind.mealMinimumMinutes });
    }
    day.entries.push({ start: ns(entry.startAt), end: entryEnd, breaks: meals });
    mealDays.set(date, day);
  }
  const paid = classified ? paidTime : null;
  const mealWarnings = [...mealDays.entries()].filter(([, d]) => d.classified).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).flatMap(([date, d]) => mealWarningsForDay(date, d.entries));
  return { ...period,...boundaries,employeeId:source.employeeId,employeeName:source.employeeName,timeZone:source.timeZone,
    pendingCorrections:Number(source.pendingCorrections),entries,corrections,observedAt:instant(observedAt),
    recordedNanoseconds:recorded.toString(),breakNanoseconds:breakTime.toString(),
    paidNanoseconds:paid === null ? null : paid.toString(),paidSeconds:paid === null ? null : Number(paid / BigInt(1_000_000_000)),
    unpaidBreakNanoseconds:classified ? unpaid.toString() : null,mealWarnings,issues:[...issues] };
}

export function formatRecordedHours(nanoseconds: string): string {
  if (!/^\d+$/.test(nanoseconds)) throw new Error('Invalid duration');
  const minutes = BigInt(nanoseconds) / BigInt(60_000_000_000);
  return durationText(Number(minutes));
}
