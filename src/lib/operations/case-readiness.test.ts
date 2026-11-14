import { describe, expect, it } from 'vitest';
import { reviewOperationsCase, type CaseBinding } from './case-readiness';

const now = '2026-11-11T12:10:00.000Z';
const binding: CaseBinding = {
  environment: 'test', workspaceId: 'workspace_fixture',
  incarnationId: '11111111-1111-4111-8111-111111111111', sourceSha: 'a'.repeat(40),
  operation: 'completion', reference: 'case_fixture', subjectRef: 'employee_fixture',
};
const operator = { primaryRef: 'operator_fixture', backupRef: null, coverage: 'attended' };
const envelope = <T>(record: T, b = binding) => ({ schemaVersion: 1, binding: b, record });
const completion = () => envelope({
  policyRef: 'policy_fixture', reviewedAt: now, operator, requestState: 'processing', dependencies: [],
  inventory: ['access', 'profile', 'work_records', 'communications', 'payroll', 'photos', 'advisor', 'providers', 'backups'].map(scope => ({
    scope, disposition: 'not_applicable', evidenceRef: `evidence_${scope}`, basisRef: 'review_fixture', endAt: null, hold: null,
  })),
  providerTasks: [],
});
const withdrawal = () => envelope({
  policyRef: 'policy_fixture', reviewedAt: now, operator, requestState: 'received',
  requestConfirmedAt: '2026-11-11T11:00:00.000Z', dependencies: [],
  verification: {
    contactEvidenceRef: 'historical_contact_fixture', contactEffectiveAt: '2026-11-10T12:00:00.000Z',
    challengeIssuedAt: '2026-11-11T12:00:00.000Z', challengeExpiresAt: '2026-11-11T12:15:00.000Z',
    challengeVerifiedAt: '2026-11-11T12:09:00.000Z', challengeReceiptRef: 'challenge_fixture',
    consumptionEvidenceRef: 'consumption_fixture', verifiedCaseRef: 'case_fixture', verifiedSubjectRef: 'employee_fixture',
  },
}, { ...binding, operation: 'withdrawal' });
const restore = () => envelope({
  policyRef: 'policy_fixture', reviewedAt: now, operator, companyState: 'suspended', dependencies: [],
  restoredAt: '2026-11-11T12:00:00.000Z', backupCapturedAt: '2026-11-09T12:00:00.000Z',
  backupEvidenceRef: 'backup_fixture', credentialRetirementEvidenceRef: 'retirement_fixture', suspensionEvidenceRef: 'suspension_fixture',
  erasureRegister: {
    evidenceRef: 'outside_backup_register_fixture', observedAt: '2026-11-11T12:08:00.000Z',
    completedCases: [{ reference: 'erasure_fixture', completedAt: '2026-11-10T12:00:00.000Z' }],
  },
  reconciliations: [{ reference: 'erasure_fixture', disposition: 'reapplied', evidenceRef: 'reapply_fixture' }],
}, { ...binding, operation: 'restore', subjectRef: null });

describe('read-only operations case review', () => {
  it.each([completion, withdrawal, restore])('returns recorded review evidence without mutation or authentication authority', make => {
    const m = make(); const before = JSON.stringify(m);
    expect(reviewOperationsCase(m, m.binding, now)).toEqual({
      decision: 'review_ready', reasons: [], evidence: 'operator_attestations_only', canMutate: false, canActivate: false,
    });
    expect(JSON.stringify(m)).toBe(before);
  });
  const foreignValues: CaseBinding = {
    environment: 'production', workspaceId: 'workspace_other',
    incarnationId: '22222222-2222-4222-8222-222222222222', sourceSha: 'b'.repeat(40),
    operation: 'withdrawal', reference: 'case_other', subjectRef: 'employee_other',
  };
  it.each(Object.keys(foreignValues) as (keyof CaseBinding)[])('blocks valid foreign %s', key => {
    const m = completion();
    const expected = { ...binding, [key]: foreignValues[key] };
    expect(reviewOperationsCase(m, expected as CaseBinding, now)).toEqual({
      decision: 'blocked', reasons: ['BINDING_MISMATCH'], evidence: 'operator_attestations_only', canMutate: false, canActivate: false,
    });
  });
  it.each(['environment', 'incarnationId', 'sourceSha', 'operation'] as const)('rejects malformed expected %s separately from a foreign binding', key => {
    const m = completion();
    const expected = { ...binding, [key]: 'different' };
    expect(reviewOperationsCase(m, expected as CaseBinding, now).reasons).toEqual(['INVALID_EVIDENCE_RECORD']);
  });
  it('does not turn malformed input or unknown personal-data fields into an exception or diagnostic leak', () => {
    for (const m of [null, [], 'private_marker', { ...completion(), email: 'private_marker@example.invalid' }]) {
      const result = reviewOperationsCase(m, binding, now);
      expect(result.decision).toBe('blocked'); expect(JSON.stringify(result)).not.toContain('private_marker');
    }
  });
  it('requires the complete reviewed category inventory, without duplicates or silent omissions', () => {
    const m = completion(); m.record.inventory.pop();
    expect(reviewOperationsCase(m, binding, now).reasons).toContain('INVENTORY_INCOMPLETE');
    m.record.inventory.push(m.record.inventory[0]);
    expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
  });
  it('requires a retained record basis and future end date or an owned, current legal hold', () => {
    const m = completion(); const row = m.record.inventory[2]; row.disposition = 'retained';
    expect(reviewOperationsCase(m, binding, now).reasons).toContain('RETENTION_EVIDENCE_MISSING');
    row.endAt = '2027-11-11T12:00:00.000Z' as never;
    expect(reviewOperationsCase(m, binding, now).decision).toBe('review_ready');
    row.endAt = '2026-11-10T12:00:00.000Z' as never;
    expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
    row.endAt = null;
    row.hold = { authorityRef: 'hold_fixture', ownerRef: 'hold_owner_fixture', reviewAt: '2026-12-01T12:00:00.000Z' } as never;
    expect(reviewOperationsCase(m, binding, now).decision).toBe('review_ready');
    row.hold = { authorityRef: '', ownerRef: '', reviewAt: now } as never;
    expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
  });
  it('blocks unresolved provider tasks, dependencies and missing backup disposal evidence', () => {
    const m = completion(); m.record.providerTasks = [{ reference: 'provider_fixture', state: 'pending', evidenceRef: null }] as never;
    expect(reviewOperationsCase(m, binding, now).reasons).toContain('PROVIDER_WORK_UNRESOLVED');
    m.record.providerTasks = []; m.record.dependencies = ['provider_followup'] as never;
    expect(reviewOperationsCase(m, binding, now).reasons).toContain('UNRESOLVED_DEPENDENCIES');
    m.record.dependencies = []; m.record.inventory[8].evidenceRef = '';
    expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
  });
  it('never accepts unattended coverage with an absent or identical backup', () => {
    const m = completion(); m.record.operator = { ...operator, coverage: 'unattended' };
    expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
    m.record.operator.backupRef = m.record.operator.primaryRef as never;
    expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
    m.record.operator.backupRef = 'backup_fixture' as never;
    expect(reviewOperationsCase(m, binding, now).decision).toBe('review_ready');
  });
  it('withdrawal remains received-only and bound to the exact case and Employee ID evidence', () => {
    const m = withdrawal(); m.record.requestState = 'processing';
    expect(reviewOperationsCase(m, m.binding, now).reasons).toContain('WITHDRAWAL_STATE_BLOCKED');
    m.record.requestState = 'received'; m.record.verification.verifiedCaseRef = 'another_case';
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
    m.record.verification.verifiedCaseRef = 'case_fixture'; m.record.verification.verifiedSubjectRef = 'another_person';
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
  });
  it('requires historical contact provenance, a fresh 15-minute challenge and its consumption receipt', () => {
    for (const change of [
      { contactEvidenceRef: '' }, { contactEffectiveAt: '2026-11-11T12:00:00.000Z' },
      { challengeExpiresAt: '2026-11-11T12:30:00.000Z' }, { challengeVerifiedAt: '2026-11-11T12:16:00.000Z' },
      { consumptionEvidenceRef: '' },
    ]) {
      const m = withdrawal(); Object.assign(m.record.verification, change);
      expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
    }
    const m = withdrawal();
    expect(reviewOperationsCase(m, m.binding, '2026-11-11T12:15:00.000Z').reasons).toContain('CHALLENGE_NOT_FRESH');
  });
  it('does not accept a review recorded before the stated mailbox verification', () => {
    const m = withdrawal(); m.record.reviewedAt = '2026-11-11T11:30:00.000Z';
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
  });
  it('restore cannot bypass suspended state, credential retirement or the post-restore erasure register', () => {
    const m = restore(); m.record.companyState = 'active';
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
    m.record.companyState = 'suspended'; m.record.credentialRetirementEvidenceRef = '';
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
    m.record.credentialRetirementEvidenceRef = 'retirement_fixture'; m.record.erasureRegister.observedAt = '2026-11-10T12:00:00.000Z';
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
  });
  it('restore requires exact, unique reconciliation of all completed erasures and no unrelated cases', () => {
    const m = restore(); m.record.reconciliations = [];
    expect(reviewOperationsCase(m, m.binding, now).reasons).toContain('ERASURE_RECONCILIATION_INCOMPLETE');
    m.record.reconciliations = [{ reference: 'wrong_case', disposition: 'reapplied', evidenceRef: 'reapply_fixture' }];
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
    m.record.reconciliations = [restore().record.reconciliations[0], restore().record.reconciliations[0]];
    expect(reviewOperationsCase(m, m.binding, now).decision).toBe('blocked');
  });
  it('rejects invalid calendar dates, future evidence, oversized lists and unknown nested fields', () => {
    for (const change of [
      { reviewedAt: '2026-02-30T12:00:00.000Z' }, { reviewedAt: '2027-11-11T12:00:00.000Z' },
      { dependencies: Array(1001).fill('pending') }, { operator: { ...operator, email: 'private@example.invalid' } },
    ]) {
      const m = completion(); Object.assign(m.record, change);
      expect(reviewOperationsCase(m, binding, now).decision).toBe('blocked');
    }
  });
});
