import { describe, expect, it } from '@rstest/core';
import { eligibilityReasons, reasonNotice, REASON_TEXT, refusalLines } from './eligibility-reasons';
import type { ShiftChangeIssue } from './types';

const issues = (...codes: ShiftChangeIssue['code'][]) => codes.map(code => ({ code }));

describe('eligibilityReasons', () => {
  it('names each enforced rule in plain words, once, in a fixed order', () => {
    expect(eligibilityReasons(issues('MAX_WEEKLY_HOURS', 'OUTSIDE_AVAILABILITY', 'WEEKLY_AVAILABILITY_CONFLICT', 'APPROVED_TIME_OFF'))).toEqual(['time_off', 'availability', 'weekly_hours']);
    expect(eligibilityReasons(issues('POSITION_INELIGIBLE', 'SHIFT_OVERLAP', 'MIN_REST'))).toEqual(['overlap', 'rest', 'position']);
    expect(eligibilityReasons(issues('STAFFING_GAP', 'LEAD_COVERAGE_GAP', 'POSITION_COVERAGE_GAP'))).toEqual(['coverage']);
  });

  it('never turns a warning, an unknown rule or a stale state into a reason', () => {
    expect(eligibilityReasons(issues('TARGET_HOURS_EXCEEDED', 'AVAILABILITY_NOT_SUBMITTED', 'PROJECTED_OVERTIME_REVIEW'))).toEqual([]);
    expect(eligibilityReasons(issues('STALE_TERMS', 'CONSENT_REQUIRED', 'INVALID_SCHEDULING_INPUT'))).toEqual([]);
  });

  it('names a blocking rule even when other rules still wait for the Owner, and lists that last', () => {
    expect(eligibilityReasons(issues('RULE_UNVERIFIABLE', 'OUTSIDE_AVAILABILITY', 'AVAILABILITY_NOT_SUBMITTED', 'RULE_UNVERIFIABLE'))).toEqual(['availability', 'unconfirmed']);
    expect(eligibilityReasons(issues('POLICY_UNKNOWN'))).toEqual(['unconfirmed']);
  });

  it('keeps every reason short, personal and free of rule jargon', () => {
    for (const text of Object.values(REASON_TEXT)) {
      expect(text.length).toBeLessThanOrEqual(48);
      expect(text).not.toMatch(/employee|configured|ineligible|eligib|policy|\.$/i);
    }
  });
});

describe('refusalLines', () => {
  it('lists named rules, and otherwise says plainly what is known', () => {
    expect(refusalLines({ reasons: ['time_off', 'rest'], refusal: 'rules' })).toEqual([REASON_TEXT.time_off, REASON_TEXT.rest]);
    expect(refusalLines({ refusal: 'review' })[0]).toMatch(/manager/);
    expect(refusalLines({ refusal: 'stale' })[0]).toMatch(/changed/);
    expect(refusalLines({})).toEqual(['It doesn’t fit the current rules for this shift']);
  });
});

it('says the claim reasons in Spanish when asked (signed-in Spanish)', () => {
  expect(refusalLines({reasons: ['overlap', 'availability']}, 'es')).toEqual(['Ya trabajas a esa hora', 'Está fuera de tu disponibilidad']);
  expect(reasonNotice('You already work during this time. It’s outside your availability.', 'es')).toBe('Ya trabajas a esa hora. Está fuera de tu disponibilidad.');
  expect(reasonNotice('Something else.', 'es')).toBe('Something else.');
  expect(reasonNotice('You already work during this time.', 'en')).toBe('You already work during this time.');
});
