import { expect, it } from 'vitest';
import { fictionalSnapshot, fictionalTerms } from '../../test/fixtures/shift-changes';
import { projectShiftChangeState, planShiftChangeMaintenance, type MaintenanceSnapshot } from './maintenance';
import { notificationPolicyFor } from '../notifications/policy';
const now = new Date('2026-10-05T09:00:00Z'); // source starts 12:00Z
const profile = fictionalSnapshot().policy!;
const snapshot = (): MaintenanceSnapshot => ({ id: 'x', kind: 'EXCHANGE', workflow: 'COVERAGE', status: 'OPEN', revision: 1, legacyManual: false, source: fictionalTerms(), target: null, completionDeadline: '2026-10-05T10:00:00Z', policy: { ...profile, coverage: { ...profile.coverage, submissionAdvanceMinutes: 1440, completionAdvanceMinutes: 120 } }, escalatedAt: null, eligibleCount: 1, termsCurrent: true });
it('A053/A055/A087 creation cutoff does not expire an existing request; completion boundary does without a worker', () => {
    expect(projectShiftChangeState(snapshot(), now)).toMatchObject({ status: 'OPEN', actionable: true, completionDeadline: '2026-10-05T10:00:00.000Z' });
    expect(projectShiftChangeState(snapshot(), new Date('2026-10-05T10:00:00Z'))).toMatchObject({ status: 'EXPIRED', actionable: false });
    expect(projectShiftChangeState(snapshot(), new Date('2026-10-05T11:00:00Z')).status).toBe('EXPIRED');
});
it('A089 tighter current policy wins; loosening cannot extend recorded expiry or change another workflow', () => {
    const s = snapshot();
    s.policy!.coverage.completionAdvanceMinutes = 240;
    expect(projectShiftChangeState(s, now).status).toBe('EXPIRED');
    s.policy!.coverage.completionAdvanceMinutes = 0;
    expect(projectShiftChangeState(s, new Date('2026-10-05T10:00:00Z')).status).toBe('EXPIRED');
    s.workflow = 'SWAP';
    s.completionDeadline = '2026-10-05T12:00:00Z';
    expect(projectShiftChangeState(s, now).status).toBe('OPEN');
});
it('A058/A059/A088 unknown policy and legacy never invite; callout remains reportable after start', () => {
    const s = snapshot();
    s.policy = null;
    expect(projectShiftChangeState(s, now)).toMatchObject({ actionable: false, attention: 'CONFIGURATION_REQUIRED' });
    expect(planShiftChangeMaintenance(s, now, notificationPolicyFor('America/Puerto_Rico')).map(i => i.kind)).toEqual(['ESCALATE']);
    s.kind = 'CALLOUT';
    s.status = 'PENDING';
    expect(projectShiftChangeState(s, new Date('2026-10-06T12:00:00Z')).status).toBe('PENDING');
});
it('A056/A058 expiry precedes invitations/escalation and escalated stage never repeats', () => {
    const p = notificationPolicyFor('America/Puerto_Rico');
    expect(planShiftChangeMaintenance(snapshot(), new Date('2026-10-05T10:00:00Z'), p).map(i => i.kind)).toEqual(['EXPIRE']);
    const s = snapshot();
    s.escalatedAt = now.toISOString();
    expect(planShiftChangeMaintenance(s, now, p).map(i => i.kind)).toEqual(['INVITE']);
    s.status = 'APPROVED';
    expect(planShiftChangeMaintenance(s, now, p)).toEqual([]);
});
it('ordinary voluntary offers do not become uncovered merely because urgent', () => {
    const plan = planShiftChangeMaintenance(snapshot(), now, notificationPolicyFor('America/Puerto_Rico'));
    expect(plan.find(i => i.kind === 'ESCALATE')?.reason).toBe('NO_VOLUNTEER');
});
it('an initial configuration escalation still permits one later urgent lifecycle stage', () => {
    const s = snapshot();
    s.escalatedAt = '2026-10-03T12:00:00Z';
    s.escalatedStages = ['INITIAL'];
    expect(planShiftChangeMaintenance(s, now, notificationPolicyFor('America/Puerto_Rico')).filter(i => i.kind === 'ESCALATE')).toHaveLength(1);
    s.escalatedStages.push('URGENT');
    expect(planShiftChangeMaintenance(s, now, notificationPolicyFor('America/Puerto_Rico')).filter(i => i.kind === 'ESCALATE')).toHaveLength(0);
});
it('a malformed current boundary cannot revive an already recorded expired deadline', () => {
    const s = snapshot();
    s.source = { ...s.source!, startTime: 'invalid' };
    expect(projectShiftChangeState(s, new Date('2026-10-05T11:00:00Z')).status).toBe('EXPIRED');
});
