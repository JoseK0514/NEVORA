import { describe, expect, it } from '@rstest/core';
import type { PayrollBacklogSummary, PayrollCapabilities } from '@/lib/payroll/contracts';
import { UNKNOWN_BLOCKER, backlogDescription, noticeOutcome, noticeReadiness, payrollBlockerPlace, payrollExceptionMessage, payrollReviewNotes, reminderWindow } from './workflow-status';

const capabilities: PayrollCapabilities = { enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: false, bankCompatibility: 'UNVERIFIED' };
const backlog: PayrollBacklogSummary = { asOfDate: '2026-10-12', rangeStart: '2026-09-01', rangeEnd: '2026-10-12', missingCount: 2, remainingCount: 0, returnedCount: 2, ambiguousCount: 0, overflow: false };

describe('payroll operational status', () => {
  it('does not turn unknown or overflow history counts into zero', () => {
    expect(backlogDescription({ ...backlog, missingCount: null })).toContain('count is unavailable');
    expect(backlogDescription({ ...backlog, overflow: true, missingCount: 0 })).toContain('count is unavailable');
    expect(backlogDescription(backlog)).toContain('2 earlier pay periods have no payroll yet');
  });
  it('treats absent readiness as disabled and enabled readiness as requiring access and consent', () => {
    expect(noticeReadiness(capabilities)).toContain('delivery is disabled');
    expect(noticeReadiness({ ...capabilities, noticeDelivery: 'ENABLED' })).toContain('consent');
  });
  it('distinguishes durable queue results, disabled transport and ineligible recipients without claiming receipt', () => {
    expect(noticeOutcome('QUEUED')).toContain('not confirmed');
    expect(noticeOutcome('QUEUED_DELIVERY_DISABLED')).toContain('delivery was disabled');
    expect(noticeOutcome('NO_CURRENT_RECIPIENTS')).toContain('No notice was queued');
    expect(noticeOutcome('NOT_SENT_STUB')).toContain('No notice was sent');
    expect(noticeOutcome(null)).toContain('No queue result');
  });
  it('keeps disabled-at-queue history truthful when current transport becomes enabled', () => {
    const display = [noticeReadiness({ ...capabilities, noticeDelivery: 'ENABLED' }), noticeOutcome('QUEUED_DELIVERY_DISABLED')].join(' ');
    expect(display).toContain('transport is enabled');
    expect(display).toContain('delivery was disabled');
    expect(display).toContain('Sending and receipt are not confirmed');
    expect(display).not.toContain('will not send');
  });
  it('projects a legacy lead array to its one effective window, preserving payday zero', () => {
    expect(reminderWindow([1, 7, 3])).toBe(7);
    expect(reminderWindow([0])).toBe(0);
    expect(reminderWindow([])).toBe(0);
  });
  it('keeps correction reasons visible while preserving every actual blocking exception', () => {
    expect(payrollReviewNotes(['CORRECTION_REASON:Fix provider amount', 'FINALIZED_TIME_REQUIRED', 'CORRECTION_REASON_CHANGED'])).toEqual({ corrections: ['Fix provider amount'], blocking: ['FINALIZED_TIME_REQUIRED', 'CORRECTION_REASON_CHANGED'] });
  });
  it('turns known draft and custody states into the next action while preserving unknown failures', () => {
    expect(payrollExceptionMessage('WAITING_FOR_AMOUNTS')).toContain('Import provider');
    expect(payrollExceptionMessage('TIME_NOT_FINALIZED:fictional-a')).toContain('Finalize timecards for employee reference fictional-a');
    expect(payrollExceptionMessage('POPULATION_DISPOSITION:fictional-a')).toContain('Choose what to do with employee reference fictional-a');
    expect(payrollExceptionMessage('Unrecognized actionable source issue')).toBe('Unrecognized actionable source issue');
  });
  it('words every blocked-payroll code as a sentence with a next step, never the code itself (PY-10)', () => {
    expect(payrollExceptionMessage('RULESET_NOT_APPLICABLE')).toBe('NEVORA can’t calculate paydays in that year yet. Contact support.');
    for (const code of ['RULE_ACCEPTANCE_REQUIRED', 'EXACT_CENT_REQUIRED', 'WAGE_ROUNDING_REQUIRED', 'PR_ROUNDING_REQUIRED', 'PR_ROUNDING_RULE_UNVERIFIED', 'WAGE_CENT_RULE_UNVERIFIED', 'OWNER_CALCULATION_POLICY_REQUIRED']) {
      expect(payrollExceptionMessage(code)).toBe('NEVORA can’t calculate this payroll until its payroll rules are confirmed. Contact support.');
      expect(payrollBlockerPlace(code)).toBe('support');
    }
    for (const code of ['BELOW_APPLICABLE_MINIMUM_WAGE', 'MINIMUM_WAGE_COVERAGE_REQUIRED', 'UNSUPPORTED_DEDUCTION', 'RECORDED_SOURCE_STALE_SOURCE', 'RECORDED_SOURCE_NOT_FINALIZED', 'OPEN_RECORDED_BREAK', 'NATIVE_SOURCE_LIMIT', 'YTD_LINEAGE_CONFLICT', 'SETTINGS_REQUIRED', 'SOME_CODE_ADDED_LATER']) {
      const message = payrollExceptionMessage(`${code}:fictional-a`);
      expect(message).not.toContain(code);
      expect(message).toMatch(/[a-z]\. /);
    }
    expect(payrollExceptionMessage('SOME_CODE_ADDED_LATER:fictional-a')).toBe(UNKNOWN_BLOCKER);
    expect(payrollExceptionMessage('constructor')).toBe('constructor');
  });
  it('names the place each next step happens, keeping the earlier Timecards, people and setup links', () => {
    for (const code of ['TIME_NOT_FINALIZED', 'RECORDED_SOURCE_COVERAGE_MISSING', 'RECORDED_SOURCE_STALE', 'RECORDED_SOURCE_UNAVAILABLE', 'OPEN_RECORDED_TIME', 'TIME_FINALIZATION_REQUIRED', 'FINALIZED_TIME_REQUIRED']) expect(payrollBlockerPlace(code)).toBe('time');
    for (const code of ['POPULATION_DISPOSITION', 'POPULATION_REVIEW_REQUIRED', 'POPULATION_SOURCE_CONFLICT']) expect(payrollBlockerPlace(code)).toBe('people');
    for (const code of ['WORKWEEK_EVIDENCE_REQUIRED', 'INVALID_WORKWEEK_POLICY', 'INVALID_NATIVE_PROFILE', 'WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED', 'WORKWEEK_PROFILE_CONFLICT', 'WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED', 'EMPLOYER_YTD_BASE_CONFLICT',
      'ATTESTED_YTD_REQUIRED', 'EMPLOYER_YTD_BASE_REQUIRED', 'WAGE_PROFILE_REQUIRED', 'TAX_PROFILE_REQUIRED', 'OPENING_YTD_REQUIRED', 'YTD_ATTESTATION_REQUIRED', 'NATIVE_INPUT_REQUIRED', 'BELOW_APPLICABLE_MINIMUM_WAGE']) expect(payrollBlockerPlace(code)).toBe('setup');
    expect(payrollBlockerPlace('SETTINGS_REQUIRED')).toBe('settings');
    expect(payrollBlockerPlace('DAILY_BOUNDARY_SENSITIVE')).toBeNull();
    expect(payrollBlockerPlace('SOME_CODE_ADDED_LATER')).toBeNull();
  });
  it('explains missing recorded-source coverage using a safe timecard review action', () => {
    expect(payrollExceptionMessage('RECORDED_SOURCE_COVERAGE_MISSING:fictional-a')).toBe('Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating. Employee reference fictional-a.');
  });
  it('turns native missing YTD and recorded-source prerequisites into recovery actions', () => {
    expect(payrollExceptionMessage('ATTESTED_YTD_REQUIRED:fictional-a')).toContain('year-to-date');
    expect(payrollExceptionMessage('RECORDED_SOURCE_STALE:fictional-a')).toContain('timecards');
    /* PY-10 (Nov 14): no screen confirms rules, so the next step is support */expect(payrollExceptionMessage('ROUNDING_POLICY_ACCEPTANCE_REQUIRED:fictional-a')).toContain('until its payroll rules are confirmed. Contact support.');
  });
});
