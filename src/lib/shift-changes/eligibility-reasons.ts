import type { ShiftChangeIssue } from './types';

/** Open-shift eligibility reasons (B3). The server's existing rules decide; this
 * only names, in plain words, the rules that already refused a claim. Warning-only
 * codes never appear here: they don't stop a claim, so they aren't a reason. */
export type EligibilityReason = 'overlap' | 'same_day' | 'time_off' | 'availability' | 'weekly_hours' | 'daily_hours' | 'shift_length' | 'rest' | 'break' | 'position' | 'role' | 'location' | 'lead' | 'coverage' | 'unconfirmed';

const BY_CODE: Partial<Record<ShiftChangeIssue['code'], EligibilityReason>> = {
  SHIFT_OVERLAP: 'overlap',
  MULTIPLE_SHIFTS_SAME_DAY: 'same_day',
  APPROVED_TIME_OFF: 'time_off',
  OUTSIDE_AVAILABILITY: 'availability',
  WEEKLY_AVAILABILITY_CONFLICT: 'availability',
  MAX_WEEKLY_HOURS: 'weekly_hours',
  MAX_DAILY_HOURS: 'daily_hours',
  MAX_SHIFT_HOURS: 'shift_length',
  MIN_REST: 'rest',
  BREAK_REQUIREMENT: 'break',
  POSITION_INELIGIBLE: 'position',
  ROLE_INELIGIBLE: 'role',
  LOCATION_NOT_ELIGIBLE: 'location',
  LEAD_REQUIREMENT: 'lead',
  STAFFING_GAP: 'coverage',
  LEAD_COVERAGE_GAP: 'coverage',
  POSITION_COVERAGE_GAP: 'coverage',
  // A rule the company hasn't set up can't be checked, so the claim waits for it.
  RULE_UNVERIFIABLE: 'unconfirmed',
  POLICY_UNKNOWN: 'unconfirmed',
};

/** Ordered by what a person can most easily act on or recognise first. */
const ORDER: EligibilityReason[] = ['time_off', 'overlap', 'same_day', 'availability', 'weekly_hours', 'daily_hours', 'rest', 'shift_length', 'break', 'position', 'role', 'location', 'lead', 'coverage', 'unconfirmed'];

export const REASON_TEXT: Record<EligibilityReason, string> = {
  time_off: 'You have approved time off then',
  overlap: 'You already work during this time',
  same_day: 'You already have a shift that day',
  availability: 'It’s outside your availability',
  weekly_hours: 'It would go over your weekly hours limit',
  daily_hours: 'It would go over the daily hours limit',
  rest: 'Not enough rest between your shifts',
  shift_length: 'It’s longer than the shift length limit',
  break: 'The required break doesn’t fit',
  position: 'It needs a position you’re not set up for',
  role: 'It needs a role you’re not set up for',
  location: 'You’re not set up to work at this location',
  lead: 'It needs a qualified shift lead',
  coverage: 'It would leave required coverage short',
  unconfirmed: 'Your manager needs to confirm some rules',
};

export function eligibilityReasons(issues: readonly Pick<ShiftChangeIssue, 'code'>[]): EligibilityReason[] {
  const found = new Set(issues.map(issue => BY_CODE[issue.code]).filter((reason): reason is EligibilityReason => reason !== undefined));
  return ORDER.filter(reason => found.has(reason));
}

export type ClaimRefusal = { reasons?: readonly EligibilityReason[]; refusal?: 'rules' | 'review' | 'stale' | 'other' };

/** Lines shown under a shift that can't be claimed. A refusal without named
 * rules says so plainly instead of guessing which rule it was. */
export function refusalLines(value: ClaimRefusal): string[] {
  if (value.reasons?.length) return value.reasons.map(reason => REASON_TEXT[reason]);
  if (value.refusal === 'review') return [REASON_TEXT.unconfirmed];
  if (value.refusal === 'stale') return ['This shift just changed. Check again shortly'];
  return ['It doesn’t fit the current rules for this shift'];
}
