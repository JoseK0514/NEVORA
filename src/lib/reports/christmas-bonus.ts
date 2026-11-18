import { Temporal } from '@js-temporal/polyfill';
import { isCalendarDate } from '../employment-dates';
import { projectTimecard } from '../timecards/project';

/**
 * Puerto Rico Christmas bonus hours (informational). The bonus year runs from
 * Oct 1 to Sep 30 in business-local calendar dates; the bonus is paid between
 * Nov 15 and Dec 15 after it, and exemption filings are due Dec 1. People hired
 * before Jan 26, 2017 need 700 hours in the year; people hired on or after need
 * 1,350. No money is computed here and nothing decides eligibility: employer
 * size, exemptions and the law decide that, so the page says to confirm first.
 *
 * Hours are recorded elapsed time on FINALIZED timecards (the frozen snapshots
 * the payroll export requires), clipped to the bonus year with the timecard
 * projection (projectTimecard), corrections included and breaks counted
 * separately. Recorded days that no finalized timecard covers are reported as
 * unfinalized days instead of being added.
 */
export const BONUS_RULE_CHANGE_DATE = '2017-01-26';
export const BONUS_HOURS_BEFORE_CHANGE = 700;
export const BONUS_HOURS_FROM_CHANGE = 1350;
/** Completed bonus years offered by the selector, newest first. */
export const BONUS_YEAR_CHOICES = 5;
const HOUR_NS = BigInt(3_600_000_000_000);
const MAX_PEOPLE = 5000;

export type BonusYear = {
  /** The calendar year the bonus year ends in (Sep 30 of endYear). */
  endYear: number;
  startDate: string; endDate: string;
  paymentStartDate: string; paymentEndDate: string; exemptionDeadline: string;
};
export type BonusStatus = 'REACHED' | 'CHECK_BREAKS' | 'NOT_REACHED' | 'NOT_CONFIRMED' | 'NEEDS_HIRE_DATE';
export type BonusRow = {
  employeeId: string; name: string; active: boolean; hireDate: string | null;
  thresholdHours: number | null;
  /** Recorded time on finalized timecards inside the bonus year, breaks included (nanoseconds). */
  recordedNanoseconds: string;
  /** Recorded breaks inside that time (nanoseconds). */
  breakNanoseconds: string;
  /** Business dates in the year with recorded time that no finalized timecard covers. */
  unfinalizedDays: number;
  status: BonusStatus;
};
export type ChristmasBonusReport = {
  year: BonusYear; timeZone: string; observedAt: string; rows: BonusRow[];
  summary: { people: number; reached: number; checkBreaks: number; needsHireDate: number; notConfirmed: number;
    unfinalizedDays: number; peopleWithUnfinalizedDays: number };
};

export function bonusYear(endYear: number): BonusYear {
  if (!Number.isSafeInteger(endYear) || endYear < 1901 || endYear > 9999) throw new Error('Invalid bonus year');
  return {
    endYear, startDate: `${endYear - 1}-10-01`, endDate: `${endYear}-09-30`,
    paymentStartDate: `${endYear}-11-15`, paymentEndDate: `${endYear}-12-15`, exemptionDeadline: `${endYear}-12-01`,
  };
}

/** The latest bonus year that has ended by `today` (a business-local date, business-time.ts `businessDate`).
 * On Sep 30 the current year is still open; from Oct 1 it is complete. */
export function latestCompletedBonusYear(today: string): BonusYear {
  if (!isCalendarDate(today)) throw new Error('Invalid business date');
  const day = Temporal.PlainDate.from(today);
  return bonusYear(day.month >= 10 ? day.year : day.year - 1);
}

export function bonusYearChoices(today: string): BonusYear[] {
  const latest = latestCompletedBonusYear(today).endYear;
  return Array.from({ length: BONUS_YEAR_CHOICES }, (_, index) => bonusYear(latest - index));
}

/** A `year` search parameter (the end year, "2026") when it is one of the choices; otherwise the latest completed year. */
export function selectBonusYear(value: unknown, today: string): BonusYear {
  const choices = bonusYearChoices(today);
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) return choices[0];
  return choices.find(choice => choice.endYear === Number(value)) ?? choices[0];
}

/** 700 hours for a hire date before Jan 26, 2017; 1,350 on or after; no threshold without a hire date. */
export function christmasBonusThresholdHours(hireDate: string | null): number | null {
  if (hireDate === null) return null;
  if (!isCalendarDate(hireDate)) throw new Error('Invalid hire date');
  return hireDate < BONUS_RULE_CHANGE_DATE ? BONUS_HOURS_BEFORE_CHANGE : BONUS_HOURS_FROM_CHANGE;
}

/**
 * Reached only when the time is there even if every recorded break was unpaid.
 * Reaching it only with breaks counted is "check breaks"; below it with recorded
 * time still outside finalized timecards is "not confirmed" (more time may count).
 * Exactly the threshold counts as reached.
 */
export function bonusStatus(input: { thresholdHours: number | null; recordedNanoseconds: bigint; breakNanoseconds: bigint; unfinalizedDays: number }): BonusStatus {
  if (input.thresholdHours === null) return 'NEEDS_HIRE_DATE';
  const needed = BigInt(input.thresholdHours) * HOUR_NS;
  if (input.recordedNanoseconds - input.breakNanoseconds >= needed) return 'REACHED';
  if (input.recordedNanoseconds >= needed) return 'CHECK_BREAKS';
  return input.unfinalizedDays > 0 ? 'NOT_CONFIRMED' : 'NOT_REACHED';
}

const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max = 300): v is string => typeof v === 'string' && v.length > 0 && v.length <= max && v === v.trim() && !/[\u0000-\u001f\u007f]/.test(v);
const later = (a: string, b: string) => (a > b ? a : b);
const earlier = (a: string, b: string) => (a < b ? a : b);

/** Sum one person's finalized snapshots inside the year. Finalized periods never overlap (the timecard command refuses
 * it); an overlap here would double count, so the read fails rather than guess. */
function finalizedTime(employeeId: string, cards: unknown, year: BonusYear): { recorded: bigint; breaks: bigint } {
  if (!Array.isArray(cards) || cards.length > 5000) throw new Error('Invalid finalized timecards');
  let recorded = BigInt(0), breaks = BigInt(0), previousEnd: string | null = null;
  const sorted = cards.map(card => {
    if (!record(card) || !isCalendarDate(card.startDate) || !isCalendarDate(card.endDate) || !text(card.finalizedAt, 100) || !record(card.snapshot)) throw new Error('Invalid finalized timecard');
    return card as { startDate: string; endDate: string; finalizedAt: string; snapshot: Record<string, unknown> };
  }).sort((a, b) => a.startDate.localeCompare(b.startDate));
  for (const card of sorted) {
    if (card.snapshot.employeeId !== employeeId || card.snapshot.startDate !== card.startDate || card.snapshot.endDate !== card.endDate) throw new Error('Finalized timecard identity mismatch');
    if (previousEnd !== null && card.startDate <= previousEnd) throw new Error('Overlapping finalized timecards');
    previousEnd = card.endDate;
    const startDate = later(card.startDate, year.startDate), endDate = earlier(card.endDate, year.endDate);
    if (startDate > endDate) continue;
    // The same projection Timecards and the payroll export use, on the frozen snapshot, clipped to the year's dates.
    const clipped = projectTimecard({ ...card.snapshot, startDate, endDate }, card.finalizedAt);
    recorded += BigInt(clipped.recordedNanoseconds);
    breaks += BigInt(clipped.breakNanoseconds);
  }
  return { recorded, breaks };
}

/** Validate the one-statement source and project rows in name order. Throws on any malformed or incomplete part. */
export function projectChristmasBonusReport(source: unknown, year: BonusYear): ChristmasBonusReport {
  if (!record(source) || !text(source.observedAt, 100) || !text(source.timeZone, 100) || !Array.isArray(source.people)) throw new Error('Invalid bonus source');
  if (source.people.length > MAX_PEOPLE) throw new Error('Bonus source limit');
  const seen = new Set<string>();
  const rows = source.people.map((person): BonusRow => {
    if (!record(person) || !text(person.employeeId, 200) || !text(person.name, 400) || typeof person.active !== 'boolean'
      || !(person.hireDate === null || isCalendarDate(person.hireDate)) || !Number.isSafeInteger(person.unfinalizedDays) || Number(person.unfinalizedDays) < 0
      || seen.has(person.employeeId)) throw new Error('Invalid bonus person');
    seen.add(person.employeeId);
    const { recorded, breaks } = finalizedTime(person.employeeId, person.timecards, year);
    const hireDate = person.hireDate as string | null, thresholdHours = christmasBonusThresholdHours(hireDate), unfinalizedDays = Number(person.unfinalizedDays);
    return { employeeId: person.employeeId, name: person.name, active: person.active, hireDate, thresholdHours,
      recordedNanoseconds: recorded.toString(), breakNanoseconds: breaks.toString(), unfinalizedDays,
      status: bonusStatus({ thresholdHours, recordedNanoseconds: recorded, breakNanoseconds: breaks, unfinalizedDays }) };
  }).sort((a, b) => a.name.localeCompare(b.name) || a.employeeId.localeCompare(b.employeeId));
  const count = (status: BonusStatus) => rows.filter(row => row.status === status).length;
  return {
    year, timeZone: source.timeZone, observedAt: source.observedAt, rows,
    summary: { people: rows.length, reached: count('REACHED'), checkBreaks: count('CHECK_BREAKS'), needsHireDate: count('NEEDS_HIRE_DATE'),
      notConfirmed: count('NOT_CONFIRMED'), unfinalizedDays: rows.reduce((total, row) => total + row.unfinalizedDays, 0),
      peopleWithUnfinalizedDays: rows.filter(row => row.unfinalizedDays > 0).length },
  };
}
