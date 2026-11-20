import { Temporal } from '@js-temporal/polyfill';

export const PUERTO_RICO_PTO_RULE = 'PR_ACT_180_2017';
const reform = '2017-01-26';
const threshold = 130 * 60;

export type PuertoRicoAccrualEvidence = {
  reference: string;
  coverage: 'STANDARD' | 'SMALL_EMPLOYER' | 'PROTECTED_PRE_2017' | 'UNRESOLVED';
  windowMethod: 'HIRE_ANNIVERSARY' | 'FIXED_30_DAYS' | null;
  vacationVestsOn: string | null;
  openingBalancesReconciled: boolean;
  unresolvedTime: boolean;
  regularMinutes: number;
  overtimeMinutes: number;
  paidBreakMinutes: number;
  vacationUsedMinutes: number;
  sickUsedMinutes: number;
  catastrophicLeaveMinutes: number;
  day:
    | { kind: 'FIXED'; minutes: number }
    | { kind: 'VARIABLE'; workedDays: number }
    | { kind: 'INDETERMINATE' }
    | { kind: 'UNRESOLVED' };
};

export type PuertoRicoReviewReason =
  | 'COVERAGE_UNRESOLVED'
  | 'WINDOW_UNRESOLVED'
  | 'CROSS_YEAR_WINDOW'
  | 'CLOSED_YEAR'
  | 'SERVICE_ANNIVERSARY_IN_WINDOW'
  | 'PROBATION_UNRESOLVED'
  | 'OPENING_BALANCES_UNRECONCILED'
  | 'TIME_CLASSIFICATION_UNRESOLVED'
  | 'OVERTIME_DETERMINES_ELIGIBILITY'
  | 'REGULAR_DAY_UNRESOLVED'
  | 'FRACTIONAL_MINUTE_AWARD'
  | 'DOWNWARD_CORRECTION'
  | 'SICK_CARRYOVER_UNRESOLVED';

type AccrualInput = {
  startDate: string;
  endDate: string;
  hireDate: string | null;
  terminationDate: string | null;
  asOf: string;
  recordedNanoseconds: bigint;
  breakNanoseconds: bigint;
  evidence: PuertoRicoAccrualEvidence;
};

const minute = BigInt(60_000_000_000);
const pre2017 = (date: string) => date < reform;

/** The two documented hire-date readings can disagree. An Owner can provide
 * the employer's verified method. Otherwise require agreement between them. */
function windowMatches(hire: Temporal.PlainDate, start: Temporal.PlainDate, end: Temporal.PlainDate, method: PuertoRicoAccrualEvidence['windowMethod']) {
  const monthsSinceHire = (start.year - hire.year) * 12 + start.month - hire.month;
  const nextStart = end.add({ days: 1 });
  const anniversary = monthsSinceHire >= 0 && hire.add({ months: monthsSinceHire }).equals(start)
    && hire.add({ months: monthsSinceHire + 1 }).equals(nextStart);
  const fixedDays = hire.until(start).days % 30 === 0 && start.until(nextStart).days === 30;
  if (method === 'HIRE_ANNIVERSARY') return anniversary;
  if (method === 'FIXED_30_DAYS') return fixedDays;
  return anniversary && fixedDays;
}

function vacationQuartersAt(hire: Temporal.PlainDate, date: Temporal.PlainDate, coverage: PuertoRicoAccrualEvidence['coverage']) {
  if (coverage === 'PROTECTED_PRE_2017') return 5;
  if (coverage === 'SMALL_EMPLOYER') return 2;
  const years = hire.until(date, { largestUnit: 'years' }).years;
  if (years >= 15) return 5;
  if (years >= 5) return 4;
  return years >= 1 ? 3 : 2;
}

export function calculatePuertoRicoAccrual(input: AccrualInput) {
  const { evidence, hireDate, terminationDate, asOf } = input;
  const reasons: PuertoRicoReviewReason[] = [];
  const start = Temporal.PlainDate.from(input.startDate);
  const end = Temporal.PlainDate.from(input.endDate);
  const hire = hireDate ? Temporal.PlainDate.from(hireDate) : null;
  const coverage = evidence.coverage;
  if (!hireDate || input.startDate < reform || coverage === 'UNRESOLVED' ||
      (pre2017(hireDate) !== (coverage === 'PROTECTED_PRE_2017'))) {
    reasons.push('COVERAGE_UNRESOLVED');
  }
  if (!hire || (hireDate && input.startDate < hireDate) || (terminationDate && terminationDate < input.endDate) ||
      !windowMatches(hire, start, end, evidence.windowMethod)) reasons.push('WINDOW_UNRESOLVED');
  if (start.year !== end.year) reasons.push('CROSS_YEAR_WINDOW');
  if (end.year < Temporal.PlainDate.from(asOf).year) reasons.push('CLOSED_YEAR');
  if (!evidence.vacationVestsOn || (hireDate && evidence.vacationVestsOn < hireDate) ||
      (terminationDate && terminationDate < evidence.vacationVestsOn)) reasons.push('PROBATION_UNRESOLVED');
  if (!evidence.openingBalancesReconciled) reasons.push('OPENING_BALANCES_UNRECONCILED');

  const workedMinutes = evidence.regularMinutes + evidence.overtimeMinutes;
  const paidBreaks = BigInt(evidence.paidBreakMinutes) * minute;
  const workedNanoseconds = input.recordedNanoseconds - input.breakNanoseconds + paidBreaks;
  // Aggregate elapsed work before converting to whole minutes. For a
  // whole-minute threshold the remaining seconds cannot change eligibility.
  const remainingNanoseconds = workedNanoseconds % minute;
  if (evidence.unresolvedTime || paidBreaks > input.breakNanoseconds || workedNanoseconds < 0 ||
      workedNanoseconds / minute !== BigInt(workedMinutes)) reasons.push('TIME_CLASSIFICATION_UNRESOLVED');

  const qualifyingMinutes = workedMinutes + evidence.vacationUsedMinutes + evidence.sickUsedMinutes + evidence.catastrophicLeaveMinutes;
  if (qualifyingMinutes >= threshold && qualifyingMinutes - evidence.overtimeMinutes < threshold) {
    reasons.push('OVERTIME_DETERMINES_ELIGIBILITY');
  }

  const vacationQuarters = hire && hireDate && hireDate <= input.startDate ? vacationQuartersAt(hire, start, coverage) : 0;
  if (qualifyingMinutes >= threshold && hire && vacationQuarters && vacationQuarters !== vacationQuartersAt(hire, end, coverage)) {
    reasons.push('SERVICE_ANNIVERSARY_IN_WINDOW');
  }

  let dayMinutes = 0;
  let dayDivisor = 1;
  if (qualifyingMinutes >= threshold) {
    switch (evidence.day.kind) {
      case 'FIXED': dayMinutes = evidence.day.minutes; break;
      case 'INDETERMINATE': dayMinutes = 480; break;
      case 'VARIABLE':
        dayMinutes = evidence.regularMinutes;
        dayDivisor = evidence.day.workedDays;
        if (!dayMinutes || dayDivisor > start.until(end).days + 1 || dayMinutes > dayDivisor * 1440 || remainingNanoseconds !== BigInt(0)) {
          reasons.push('REGULAR_DAY_UNRESOLVED');
        }
        break;
      case 'UNRESOLVED': reasons.push('REGULAR_DAY_UNRESOLVED'); break;
    }
  }
  const vacationMinutes = dayMinutes * vacationQuarters / (4 * dayDivisor);
  const sickMinutes = dayMinutes / dayDivisor;
  if (!Number.isInteger(vacationMinutes) || !Number.isInteger(sickMinutes)) reasons.push('FRACTIONAL_MINUTE_AWARD');
  if (reasons.length) return { state: 'review_required' as const, reasons };
  return {
    state: 'ready' as const,
    qualifyingMinutes,
    vacationMinutes,
    sickMinutes,
    vacationDeferred: vacationMinutes > 0 && !!evidence.vacationVestsOn && asOf < evidence.vacationVestsOn,
  };
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try { return Temporal.PlainDate.from(value).toString() === value; } catch { return false; }
}

const integerBetween = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;

export function parsePuertoRicoAccrualEvidence(value: unknown): PuertoRicoAccrualEvidence | null {
  if (!record(value)) return null;
  const { reference, coverage, windowMethod, vacationVestsOn, openingBalancesReconciled, unresolvedTime,
    regularMinutes, overtimeMinutes, paidBreakMinutes, vacationUsedMinutes, sickUsedMinutes, catastrophicLeaveMinutes, day } = value;
  if (typeof reference !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/.test(reference) ||
      (coverage !== 'STANDARD' && coverage !== 'SMALL_EMPLOYER' && coverage !== 'PROTECTED_PRE_2017' && coverage !== 'UNRESOLVED') ||
      (windowMethod !== null && windowMethod !== 'HIRE_ANNIVERSARY' && windowMethod !== 'FIXED_30_DAYS') ||
      (vacationVestsOn !== null && !validDate(vacationVestsOn)) ||
      typeof openingBalancesReconciled !== 'boolean' || typeof unresolvedTime !== 'boolean' ||
      !integerBetween(regularMinutes, 0, 44640) || !integerBetween(overtimeMinutes, 0, 44640) ||
      !integerBetween(paidBreakMinutes, 0, 44640) || !integerBetween(vacationUsedMinutes, 0, 44640) ||
      !integerBetween(sickUsedMinutes, 0, 44640) || !integerBetween(catastrophicLeaveMinutes, 0, 44640) ||
      regularMinutes + overtimeMinutes + vacationUsedMinutes + sickUsedMinutes + catastrophicLeaveMinutes > 44640 ||
      !record(day)) return null;

  let regularDay: PuertoRicoAccrualEvidence['day'];
  if (day.kind === 'FIXED' && integerBetween(day.minutes, 1, 1440)) regularDay = { kind: day.kind, minutes: day.minutes };
  else if (day.kind === 'VARIABLE' && integerBetween(day.workedDays, 1, 31)) regularDay = { kind: day.kind, workedDays: day.workedDays };
  else if (day.kind === 'INDETERMINATE' || day.kind === 'UNRESOLVED') regularDay = { kind: day.kind };
  else return null;
  return { reference, coverage, windowMethod, vacationVestsOn, openingBalancesReconciled, unresolvedTime,
    regularMinutes, overtimeMinutes, paidBreakMinutes, vacationUsedMinutes, sickUsedMinutes, catastrophicLeaveMinutes, day: regularDay };
}
