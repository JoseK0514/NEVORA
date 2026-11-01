import { describe, expect, it } from 'vitest';
import type { PayrollBacklogSummary, PayrollCapabilities } from '@/lib/payroll/contracts';
import { backlogDescription, noticeOutcome, noticeReadiness, payrollExceptionMessage, payrollReviewNotes, reminderWindow } from './workflow-status';

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
    expect(payrollExceptionMessage('POPULATION_DISPOSITION:fictional-a')).toContain('Review the period population');
    expect(payrollExceptionMessage('Unrecognized actionable source issue')).toBe('Unrecognized actionable source issue');
  });
  it('explains missing recorded-source coverage using a safe timecard review action', () => {
    expect(payrollExceptionMessage('RECORDED_SOURCE_COVERAGE_MISSING:fictional-a')).toBe('Review and finalize the employee timecards, including confirmed zero-hour periods, before recalculating. Employee reference fictional-a.');
  });
  it('turns native missing YTD and recorded-source prerequisites into recovery actions', () => {
    expect(payrollExceptionMessage('ATTESTED_YTD_REQUIRED:fictional-a')).toContain('year-to-date');
    expect(payrollExceptionMessage('RECORDED_SOURCE_STALE:fictional-a')).toContain('timecards');
    expect(payrollExceptionMessage('ROUNDING_POLICY_ACCEPTANCE_REQUIRED:fictional-a')).toContain('verification');
  });
});
