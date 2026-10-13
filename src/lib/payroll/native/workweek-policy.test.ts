import { it, expect } from 'vitest';
import { input } from './fixtures.test-support';
import { parseNativeWorkweekPolicy, resolveNativeWorkweek, type NativeWorkweekPolicy } from './workweek-policy';
const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
export const policy = (): NativeWorkweekPolicy => ({ version: 'PR_WORKWEEK_POLICY_V1', id: 'Fictional-WP1', revision: 1, employeeId: 'E1', effectiveFrom: '2026-01-01T00:00:00-04:00', effectiveTo: null, boundary: { weekday: 1, startTime: '00:01', timeZone: 'America/Puerto_Rico' }, federalWorkweek: 'SAME_VERIFIED_BOUNDARY', federalEvidenceReference: 'Fictional documented matching FLSA week', origin: { kind: 'STATUTORY_DEFAULT', noticeAbsenceConfirmed: true, evidenceReference: 'Fictional reviewed absence of employer notice for this employee and period' } });
const wages = () => input().wages.map(w => ({ ...w, workweekStartTime: '00:01', workweekPolicy: policy() }));
it('resolves documented statutory fallback with complete weekly and both daily/rest dependency envelopes', () => {
    const result = resolveNativeWorkweek('E1', wages(), period);
    expect(result.policy.origin.kind).toBe('STATUTORY_DEFAULT');
    expect(result.payWindow).toEqual({ startAt: '2026-09-21T04:00:00Z', endAt: '2026-09-28T04:00:00Z' });
    expect(result.fullWeekWindow).toEqual({ startAt: '2026-09-14T04:01:00Z', endAt: '2026-09-28T04:01:00Z' });
    expect(result.sourceWindow).toEqual({ startAt: '2026-09-08T04:00:00Z', endAt: '2026-09-28T04:01:00Z' });
    expect(result.coveragePeriod).toEqual({ startDate: '2026-09-08', endDate: '2026-09-28' });
    expect(result.policySha256).toMatch(/^[a-f0-9]{64}$/);
});
it('resolves a fictional written Tuesday06:30 start without choosing the first wage weekday as authority', () => {
    const list = wages();
    list[0].workweekAnchorDate = '2026-01-06';
    list[0].workweekStartTime = '06:30';
    list[0].workweekPolicy = { ...policy(), boundary: { weekday: 2, startTime: '06:30', timeZone: 'America/Puerto_Rico' }, origin: { kind: 'EMPLOYER_NOTICE', noticeReference: 'Fictional employee-covered notice', deliveredAt: '2025-12-01T12:00:00-04:00', deliveryMethod: 'WRITTEN_EMPLOYEE', employeeCoverageConfirmed: true, noticeKind: 'INITIAL', previousPolicyReference: null } };
    expect(resolveNativeWorkweek('E1', list, { startDate: '2026-09-22', endDate: '2026-09-22' }).fullWeekWindow).toEqual({ startAt: '2026-09-15T10:30:00Z', endAt: '2026-09-29T10:30:00Z' });
});
it('requires the additional prior cycle union for a midnight notice instead of using only six prior civil dates', () => {
    const list = wages();
    list[0].workweekStartTime = '00:00';
    list[0].workweekPolicy = { ...policy(), boundary: { weekday: 1, startTime: '00:00', timeZone: 'America/Puerto_Rico' }, origin: { kind: 'EMPLOYER_NOTICE', noticeReference: 'Fictional midnight notice', deliveredAt: '2025-12-01T12:00:00-04:00', deliveryMethod: 'POSTED_ACCESSIBLE', employeeCoverageConfirmed: true, noticeKind: 'INITIAL', previousPolicyReference: null } };
    expect(resolveNativeWorkweek('E1', list, period).sourceWindow).toEqual({ startAt: '2026-09-14T04:01:00Z', endAt: '2026-09-28T04:00:00Z' });
});
it.each([null, undefined])('blocks missing or unknown policy %j without relabeling legacy midnight facts', value => { const list = input().wages; list[0].workweekPolicy = value; expect(() => resolveNativeWorkweek('E1', list, period)).toThrow('WORKWEEK_EVIDENCE_REQUIRED'); });
it.each(['00:00', '00:02', '0:01', '00:01:00'])('rejects invalid statutory-default clock %s', time => { const p = policy(); p.boundary = { ...p.boundary, startTime: time }; expect(() => parseNativeWorkweekPolicy(p)).toThrow('INVALID_WORKWEEK_POLICY'); });
it('rejects a non-Monday statutory default or an unconfirmed absence fact', () => { const p = policy(); p.boundary = { ...p.boundary, weekday: 2 }; expect(() => parseNativeWorkweekPolicy(p)).toThrow('INVALID_WORKWEEK_POLICY'); p.boundary = policy().boundary; p.origin = { ...p.origin, noticeAbsenceConfirmed: false } as never; expect(() => parseNativeWorkweekPolicy(p)).toThrow('INVALID_WORKWEEK_POLICY'); });
it('rejects notice coverage for another employee', () => { const list = wages(); list[0].workweekPolicy!.employeeId = 'E2'; expect(() => resolveNativeWorkweek('E1', list, period)).toThrow('WORKWEEK_EMPLOYEE_COVERAGE_REQUIRED'); });
it('rejects a policy that begins after full evaluated context', () => { const list = wages(); list[0].workweekPolicy!.effectiveFrom = '2026-09-15T00:00:00-04:00'; expect(() => resolveNativeWorkweek('E1', list, period)).toThrow('WORKWEEK_EFFECTIVE_COVERAGE_REQUIRED'); });
it('rejects different policy revisions across active same-employee rates/locations', () => { const list = wages(); list.push({ ...list[0], id: 'W2', locationIds: ['L2'], workweekPolicy: { ...policy(), revision: 2 } }); expect(() => resolveNativeWorkweek('E1', list, period)).toThrow('WORKWEEK_POLICY_TRANSITION_UNSUPPORTED'); });
it('rejects legacy anchor/time conflicts instead of silently normalizing them', () => { const list = wages(); list[0].workweekStartTime = '00:00'; expect(() => resolveNativeWorkweek('E1', list, period)).toThrow('WORKWEEK_PROFILE_CONFLICT'); });
it.each(['2026-01-02T00:00:00-04:00', '2025-12-29T00:00:00-04:00'])('rejects late original/change notice %s', deliveredAt => { const p = policy(); p.origin = { kind: 'EMPLOYER_NOTICE', noticeReference: 'Fictional change', deliveredAt, deliveryMethod: 'ELECTRONIC_ACCESSIBLE', employeeCoverageConfirmed: true, noticeKind: 'CHANGE', previousPolicyReference: 'Fictional prior policy' }; expect(() => parseNativeWorkweekPolicy(p)).toThrow('INVALID_WORKWEEK_POLICY'); });
it('accepts a documented change delivered five calendar days in advance', () => { const p = policy(); p.origin = { kind: 'EMPLOYER_NOTICE', noticeReference: 'Fictional timely change', deliveredAt: '2025-12-27T23:59:00-04:00', deliveryMethod: 'WRITTEN_EMPLOYEE', employeeCoverageConfirmed: true, noticeKind: 'CHANGE', previousPolicyReference: 'Fictional prior policy' }; expect(parseNativeWorkweekPolicy(p)).toEqual(p); });
it.each([new String('PR_WORKWEEK_POLICY_V1'), 1])('rejects coerced policy identity %j', version => { const p = policy(); p.version = version as never; expect(() => parseNativeWorkweekPolicy(p)).toThrow('INVALID_WORKWEEK_POLICY'); });
it('rejects extra policy fields, getters and unverified different federal workweeks', () => { const p = policy(); expect(() => parseNativeWorkweekPolicy({ ...p, approved: true })).toThrow('INVALID_WORKWEEK_POLICY'); expect(() => parseNativeWorkweekPolicy({ ...p, get id() { return 'W'; } })).toThrow('INVALID_WORKWEEK_POLICY'); expect(() => parseNativeWorkweekPolicy({ ...p, federalWorkweek: 'UNVERIFIED' })).toThrow('INVALID_WORKWEEK_POLICY'); });
