/** Read-only review of operator attestations. This module verifies record shape,
 * binding and consistency, never the underlying mailbox, deletion, policy approval
 * or provider outcome. It grants no database, withdrawal or activation authority. */
export type CaseBinding = {
  environment: 'test' | 'production'; workspaceId: string; incarnationId: string; sourceSha: string;
  operation: 'completion' | 'withdrawal' | 'restore'; reference: string; subjectRef: string | null;
};
export type CaseReview = {
  decision: 'blocked' | 'review_ready'; reasons: string[];
  evidence: 'operator_attestations_only'; canMutate: false; canActivate: false;
};
type Row = Record<string, unknown>;
const object = (v: unknown): v is Row => !!v && typeof v === 'object' && !Array.isArray(v);
const fields = (v: Row, names: string) => Object.keys(v).sort().join(',') === names.split(' ').sort().join(',');
const ref = (v: unknown): v is string => typeof v === 'string' && v === v.trim() && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
const choices = (v: unknown, values: string[]) => typeof v === 'string' && values.includes(v);
const list = (v: unknown): v is unknown[] => Array.isArray(v) && v.length <= 1000;
const unique = (values: unknown[]) => new Set(values).size === values.length;
const instant = (v: unknown): number => {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(v)) throw Error('invalid');
  const value = new Date(v);
  if (!Number.isFinite(value.getTime()) || value.toISOString() !== v) throw Error('invalid');
  return value.getTime();
};
function fail(): never { throw Error('invalid'); }
const checked = (v: unknown, names: string): Row => object(v) && fields(v, names) ? v : fail();
function validBinding(v: unknown): v is CaseBinding {
  if (!object(v) || !fields(v, 'environment workspaceId incarnationId sourceSha operation reference subjectRef')) return false;
  return choices(v.environment, ['test', 'production']) && ref(v.workspaceId) && ref(v.reference) &&
    typeof v.incarnationId === 'string' && v.incarnationId.length === 36 && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/.test(v.incarnationId) &&
    typeof v.sourceSha === 'string' && v.sourceSha.length === 40 && /^[a-f0-9]{40}$/.test(v.sourceSha) &&
    choices(v.operation, ['completion', 'withdrawal', 'restore']) && (v.operation === 'restore' ? v.subjectRef === null : ref(v.subjectRef));
}
const scopes = ['access', 'profile', 'work_records', 'communications', 'payroll', 'photos', 'advisor', 'providers', 'backups'];

export function reviewOperationsCase(manifest: unknown, expected: CaseBinding, asOf: string): CaseReview {
  const reasons = new Set<string>();
  const result = (): CaseReview => ({ decision: reasons.size ? 'blocked' : 'review_ready', reasons: [...reasons].sort(),
    evidence: 'operator_attestations_only', canMutate: false, canActivate: false });
  try {
    const now = instant(asOf);
    const m = checked(manifest, 'schemaVersion binding record');
    if (m.schemaVersion !== 1 || !validBinding(m.binding) || !validBinding(expected)) fail();
    const binding = m.binding;
    if (Object.keys(expected).some(k => expected[k as keyof CaseBinding] !== binding[k as keyof CaseBinding])) {
      reasons.add('BINDING_MISMATCH'); return result();
    }
    const common = 'policyRef reviewedAt operator dependencies';
    const shape = binding.operation === 'completion' ? 'requestState inventory providerTasks' : binding.operation === 'withdrawal'
      ? 'requestState requestConfirmedAt verification' : 'companyState restoredAt backupCapturedAt backupEvidenceRef credentialRetirementEvidenceRef suspensionEvidenceRef erasureRegister reconciliations';
    const record = checked(m.record, `${common} ${shape}`);
    if (!ref(record.policyRef) || instant(record.reviewedAt) > now || !list(record.dependencies) || !record.dependencies.every(ref) || !unique(record.dependencies)) fail();
    if (record.dependencies.length) reasons.add('UNRESOLVED_DEPENDENCIES');
    const operator = checked(record.operator, 'primaryRef backupRef coverage');
    if (!ref(operator.primaryRef) || !choices(operator.coverage, ['attended', 'unattended']) || !(operator.backupRef === null || ref(operator.backupRef))) fail();
    if (operator.coverage === 'unattended' && (!operator.backupRef || operator.primaryRef === operator.backupRef)) reasons.add('COVERAGE_INCOMPLETE');

    if (binding.operation === 'completion') {
      if (!choices(record.requestState, ['processing', 'completed'])) reasons.add('COMPLETION_STATE_BLOCKED');
      if (!list(record.inventory)) fail();
      const inventory = record.inventory.map(v => checked(v, 'scope disposition evidenceRef basisRef endAt hold'));
      if (inventory.length !== scopes.length || !unique(inventory.map(v => v.scope)) || inventory.some(v => !choices(v.scope, scopes))) reasons.add('INVENTORY_INCOMPLETE');
      for (const row of inventory) {
        if (!choices(row.disposition, ['removed', 'deidentified', 'retained', 'not_applicable']) || !ref(row.evidenceRef) || !ref(row.basisRef)) fail();
        if (row.disposition === 'retained') {
          if (row.hold !== null) {
            const hold = checked(row.hold, 'authorityRef ownerRef reviewAt');
            if (!ref(hold.authorityRef) || !ref(hold.ownerRef) || instant(hold.reviewAt) <= now || row.endAt !== null) reasons.add('RETENTION_EVIDENCE_MISSING');
          } else if (row.endAt === null || instant(row.endAt) <= now) reasons.add('RETENTION_EVIDENCE_MISSING');
        } else if (row.endAt !== null || row.hold !== null) fail();
      }
      if (!list(record.providerTasks)) fail();
      const providers = record.providerTasks.map(v => checked(v, 'reference state evidenceRef'));
      if (!unique(providers.map(v => v.reference))) fail();
      for (const task of providers) {
        if (!ref(task.reference) || !choices(task.state, ['complete', 'not_applicable', 'pending', 'unknown']) || !(task.evidenceRef === null || ref(task.evidenceRef))) fail();
        if (!choices(task.state, ['complete', 'not_applicable']) || !ref(task.evidenceRef)) reasons.add('PROVIDER_WORK_UNRESOLVED');
      }
      if (inventory.some(v => v.scope === 'providers' && v.disposition !== 'not_applicable') && !providers.length) reasons.add('PROVIDER_WORK_UNRESOLVED');
    } else if (binding.operation === 'withdrawal') {
      if (record.requestState !== 'received') reasons.add('WITHDRAWAL_STATE_BLOCKED');
      const v = checked(record.verification, 'contactEvidenceRef contactEffectiveAt challengeIssuedAt challengeExpiresAt challengeVerifiedAt challengeReceiptRef consumptionEvidenceRef verifiedCaseRef verifiedSubjectRef');
      if (![v.contactEvidenceRef, v.challengeReceiptRef, v.consumptionEvidenceRef].every(ref)) fail();
      if (v.verifiedCaseRef !== binding.reference || v.verifiedSubjectRef !== binding.subjectRef) reasons.add('VERIFICATION_BINDING_MISMATCH');
      const confirmed = instant(record.requestConfirmedAt), contact = instant(v.contactEffectiveAt), issued = instant(v.challengeIssuedAt), expires = instant(v.challengeExpiresAt), verified = instant(v.challengeVerifiedAt);
      if (contact > confirmed || confirmed > issued || issued > verified || verified > instant(record.reviewedAt) || verified > now || verified >= expires || now >= expires || expires - issued !== 15 * 60_000) reasons.add('CHALLENGE_NOT_FRESH');
    } else {
      if (record.companyState !== 'suspended') reasons.add('RESTORE_NOT_SUSPENDED');
      if (![record.backupEvidenceRef, record.credentialRetirementEvidenceRef, record.suspensionEvidenceRef].every(ref)) fail();
      const restored = instant(record.restoredAt);
      if (instant(record.backupCapturedAt) > restored || restored > instant(record.reviewedAt)) fail();
      const register = checked(record.erasureRegister, 'evidenceRef observedAt completedCases');
      if (!ref(register.evidenceRef) || !list(register.completedCases) || !list(record.reconciliations)) fail();
      const observed = instant(register.observedAt);
      if (observed < restored || observed > instant(record.reviewedAt)) reasons.add('ERASURE_REGISTER_STALE');
      const cases = register.completedCases.map(v => checked(v, 'reference completedAt'));
      const reconciliations = record.reconciliations.map(v => checked(v, 'reference disposition evidenceRef'));
      if (cases.some(c => !ref(c.reference) || instant(c.completedAt) > observed) || !unique(cases.map(c => c.reference))) fail();
      if (reconciliations.some(r => !ref(r.reference) || !ref(r.evidenceRef) || !choices(r.disposition, ['reapplied', 'already_absent', 'restricted_retention']))) fail();
      const expectedCases = cases.map(c => c.reference).sort();
      const actualCases = reconciliations.map(c => c.reference).sort();
      if (!unique(actualCases) || JSON.stringify(expectedCases) !== JSON.stringify(actualCases)) reasons.add('ERASURE_RECONCILIATION_INCOMPLETE');
    }
  } catch {
    reasons.add('INVALID_EVIDENCE_RECORD');
  }
  return result();
}
