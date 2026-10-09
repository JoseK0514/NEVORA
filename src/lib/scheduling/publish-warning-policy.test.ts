import { describe, expect, it } from 'vitest';
import type { PublishWarningSnapshot, PublishWarningCommand, PublishWarningReviewRecord, PublishOperationRecord } from './publish-warning-policy';
import { buildPublishReadiness } from './publish-readiness';
import { validateShift, type ValidateShiftInput } from './validate-shift';

const modulePath = './publish-warning-policy';
const implementation: typeof import('./publish-warning-policy') | null = await import(modulePath).catch(() => null);
const review = (snapshot: unknown) => implementation?.preparePublishWarningReview(snapshot);
const decide = (input: unknown) => implementation?.evaluatePublishWarningPolicy(input);
const NOW = '2026-10-09T12:00:00Z';
const OP = '10000000-0000-4000-8000-000000000001';
type AvailableSnapshot = PublishWarningSnapshot & { target: NonNullable<PublishWarningSnapshot['target']>;
  canonical: NonNullable<PublishWarningSnapshot['canonical']>; readiness: NonNullable<PublishWarningSnapshot['readiness']> };
function snapshot(): AvailableSnapshot {
  return {
    namespace: { workspaceId: 'tenant-a', actorId: 'manager', purpose: 'SCHEDULE_PUBLISH', operationId: OP },
    authority: { role: 'MANAGER', workspaceActive: true, workforceActive: true, portalState: 'ENABLED',
      membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, publishAllowed: true, receiptReadAllowed: true,
      sessionVersion: 'session-1', grantsVersion: 'grant-1', scopeVersion: 'scope-1', incarnation: '1',
      expiresAt: '2026-10-09T12:01:00Z', administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['a'] } },
    selection: { weekStart: '2026-10-05', locationId: 'a', scheduleId: 'schedule' },
    locations: [{ id: 'a', workspaceId: 'tenant-a', active: true }, { id: 'b', workspaceId: 'tenant-a', active: true }],
    now: NOW, observedAt: NOW, expiresAt: '2026-10-09T12:00:30Z', reviewId: 'review-1',
    sourceVersion: 'source-1', configurationVersion: 'config-1', sourceCurrent: true, sourceComplete: true,
    footprintComplete: true, affectedLocationIds: ['a'], readAllowed: true, permittedFields: ['schedule', 'readiness', 'configuration'],
    target: { status: 'DRAFT', shiftCount: 0 }, canonical: { checked: true, allowed: true, issues: [] },
    readiness: { locationCoverage: { locationId: 'a', locationName: 'North', totalBlocks: 7, coveredBlocks: 7,
      uncoveredBlocks: 0, missingLeadBlocks: 0, fullyCovered: true, staffingConfigured: true,
      coverageConfigured: true, positionRequirementsConfigured: true }, requiresDesignatedLead: false,
      positionGapBlocks: 0, hours: { checked: true, underTargetCount: 0, overTargetCount: 0, unconfiguredTargetCount: 0 } },
  };
}
function warned(): AvailableSnapshot {
  const v = snapshot(), coverage = v.readiness.locationCoverage!;
  coverage.coveredBlocks = 5; coverage.uncoveredBlocks = 2; coverage.missingLeadBlocks = 1; coverage.fullyCovered = false;
  v.readiness.requiresDesignatedLead = true; v.readiness.positionGapBlocks = 1;
  v.readiness.hours = { checked: true, underTargetCount: 2, overTargetCount: 1, unconfiguredTargetCount: 1 };
  return v;
}
function prepared(v: PublishWarningSnapshot) {
  const result = review(v); expect(result).toBeDefined();
  if (!result || result.state !== 'ready') throw Error('Expected prepared review');
  return result;
}
function command(v: PublishWarningSnapshot, choice: PublishWarningCommand['choice'] = 'PUBLISH_WITH_WARNINGS', reason = 'Reviewed configured shortages'): PublishWarningCommand {
  const r = prepared(v);
  return { namespace: { ...v.namespace }, selection: { ...v.selection }, reviewId: v.reviewId, reviewFingerprint: r.fingerprint,
    expectedSourceVersion: v.sourceVersion!, expectedConfigurationVersion: v.configurationVersion!, choice, reason };
}
function record(v: PublishWarningSnapshot): PublishWarningReviewRecord {
  const r = prepared(v);
  return { namespace: { ...v.namespace }, selection: { ...v.selection }, reviewId: v.reviewId, fingerprint: r.fingerprint,
    sourceVersion: v.sourceVersion!, configurationVersion: v.configurationVersion!, sessionVersion: v.authority.sessionVersion,
    grantsVersion: v.authority.grantsVersion, scopeVersion: v.authority.scopeVersion, incarnation: v.authority.incarnation,
    reviewedAt: NOW, expiresAt: v.expiresAt!, state: 'OPEN' };
}
function evaluate(v: PublishWarningSnapshot = warned(), c = command(v), r: PublishWarningReviewRecord | null = record(v), operation: PublishOperationRecord | null = null) {
  return decide({ snapshot: v, command: c, reviewRecord: r, operationRecord: operation });
}
function committed(v: PublishWarningSnapshot, c: PublishWarningCommand): PublishOperationRecord {
  const result = evaluate(v, c);
  if (!result || result.state !== 'ALLOW_NEW') throw Error('Expected new command plan');
  return { namespace: { ...v.namespace }, selection: { ...v.selection }, payloadDigest: result.payloadDigest,
    footprintComplete: true, locationIds: ['a'], readAllowed: true, state: 'COMMITTED', outcome: {
      published: true, revisionId: 'revision-1', revisionNumber: 1, occurredAt: NOW } };
}

describe('F2 approved deliberate warning contract', () => {
  it('implements pure review and decision entry points', () => {
    expect(implementation?.preparePublishWarningReview).toBeTypeOf('function');
    expect(implementation?.evaluatePublishWarningPolicy).toBeTypeOf('function');
  });
  it('preserves empty existing draft publication with current complete no-warning checks', () => {
    const v = snapshot(), r = prepared(v);
    expect(r).toMatchObject({ warnings: [], targetStatus: 'DRAFT', choices: ['PUBLISH', 'RETURN_TO_REVIEW'] });
    expect(evaluate(v, command(v, 'PUBLISH', ''))).toMatchObject({ state: 'ALLOW_NEW', reason: null });
  });
  it('preserves already-published republishing under fresh current review', () => {
    const v = snapshot(); v.target.status = 'PUBLISHED';
    expect(prepared(v)).toMatchObject({ targetStatus: 'PUBLISHED', publicationKind: 'REPUBLISH' });
    expect(evaluate(v, command(v, 'PUBLISH', ''))).toMatchObject({ state: 'ALLOW_NEW' });
  });
  it('requires the exact deliberate choice and a reason for configured advisory notices', () => {
    const v = warned(), r = prepared(v);
    expect(r.warnings.map(w => w.code)).toEqual(['COVERAGE_GAP', 'POSITION_COVERAGE_GAP', 'LEAD_COVERAGE_GAP', 'UNDER_TARGET', 'OVER_TARGET', 'TARGET_MISSING']);
    expect(r.choices).toEqual(['PUBLISH_WITH_WARNINGS', 'RETURN_TO_REVIEW']);
    expect(r.warnings.every(w => w.severity === 'advisory')).toBe(true);
    expect(evaluate(v)).toMatchObject({ state: 'ALLOW_NEW', reason: 'Reviewed configured shortages' });
    expect(evaluate(v, command(v, 'PUBLISH', ''))).toMatchObject({ state: 'DENY', reason: 'WARNING_ACKNOWLEDGEMENT_REQUIRED' });
  });
  it('does not promote setup or unknown counts to zero-looking ready', () => {
    const v = snapshot(); v.readiness.locationCoverage = null; v.readiness.requiresDesignatedLead = null; v.readiness.positionGapBlocks = null;
    v.readiness.hours = { checked: false, underTargetCount: null, overTargetCount: null, unconfiguredTargetCount: null };
    const r = prepared(v);
    expect(r.warnings.some(w => w.code === 'COVERAGE_NOT_CHECKED')).toBe(true);
    expect(r.warnings.some(w => w.code === 'HOUR_TARGETS_NOT_CHECKED')).toBe(true);
    expect(r.warnings.every(w => w.count === null)).toBe(true);
    expect(r.checks).toMatchObject({ coverage: 'NOT_CHECKED', hours: 'NOT_CHECKED' });
    expect(evaluate(v)).toMatchObject({ state: 'ALLOW_NEW' });
  });
  it('distinguishes configured zero findings from explicit setup missing', () => {
    const v = snapshot(); v.readiness.locationCoverage!.staffingConfigured = false;
    v.readiness.locationCoverage!.coverageConfigured = false; v.readiness.locationCoverage!.positionRequirementsConfigured = false;
    v.readiness.locationCoverage!.fullyCovered = false;
    const r = prepared(v);
    expect(r.warnings.map(w => w.code)).toContain('STAFFING_NOT_CONFIGURED');
    expect(r.warnings.map(w => w.code)).toContain('COVERAGE_NOT_CONFIGURED');
    expect(r.warnings.map(w => w.code)).toContain('POSITION_REQUIREMENT_INVALID');
    expect(r.warnings.every(w => w.count === null)).toBe(true);
  });
  it('does not describe an unexplained not-fully-covered source as checked with no warning', () => {
    const v = snapshot(); v.readiness.locationCoverage!.fullyCovered = false;
    const r = prepared(v);
    expect(r.checks.coverage).toBe('NOT_CHECKED');
    expect(r.warnings.find(w => w.code === 'COVERAGE_NOT_CHECKED')).toMatchObject({ count: null });
    expect(r.choices[0]).toBe('PUBLISH_WITH_WARNINGS');
  });
  it('trims a readable reason and counts Unicode code points rather than UTF-16 units', () => {
    const v = warned();
    expect(evaluate(v, command(v, 'PUBLISH_WITH_WARNINGS', '  ✓  '))).toMatchObject({ state: 'ALLOW_NEW', reason: '✓' });
    expect(evaluate(v, command(v, 'PUBLISH_WITH_WARNINGS', '😀'.repeat(500)))).toMatchObject({ state: 'ALLOW_NEW' });
    expect(evaluate(v, command(v, 'PUBLISH_WITH_WARNINGS', '😀'.repeat(501)))).toMatchObject({ state: 'DENY', reason: 'INVALID_REASON' });
  });
  it.each(['', '   ', '\u0000reason', '\u200b', '\u202ereason', '\ud800'])('rejects non-readable or unsafe reason %j', reason => {
    const v = warned(); expect(evaluate(v, command(v, 'PUBLISH_WITH_WARNINGS', reason))).toMatchObject({ state: 'DENY', reason: 'INVALID_REASON' });
  });
  it('uses a non-mutating return choice and does not invent warning acknowledgement for a clear snapshot', () => {
    const v = warned(); expect(evaluate(v, command(v, 'RETURN_TO_REVIEW', ''))).toMatchObject({ state: 'RETURN_TO_REVIEW' });
    const clear = snapshot(); expect(evaluate(clear, command(clear, 'PUBLISH_WITH_WARNINGS', 'reason'))).toMatchObject({ state: 'DENY', reason: 'CHOICE_MISMATCH' });
  });
  it('produces a deterministic fingerprint/presentation without copying canonical private text/details', () => {
    const a = warned(); a.canonical.issues = [{ code: 'AVAILABILITY_NOT_SUBMITTED', severity: 'warning', message: 'PRIVATE MESSAGE', details: { employeeId: 'PRIVATE ID' } },
      { code: 'TARGET_HOURS_EXCEEDED', severity: 'warning', message: 'PRIVATE OTHER' }];
    const b = structuredClone(a); b.canonical.issues.reverse(); b.affectedLocationIds.reverse();
    expect(prepared(a)).toEqual(prepared(b));
    expect(JSON.stringify(prepared(a))).not.toContain('PRIVATE');
  });
});

describe('F2 hard protections and current review binding', () => {
  it.each(['STAFFING_GAP', 'LEAD_COVERAGE_GAP', 'POSITION_COVERAGE_GAP', 'TARGET_HOURS_EXCEEDED'] as const)('cannot downgrade canonical error %s because its notice normally looks advisory', code => {
    const old = warned(), current = structuredClone(old);
    current.canonical.issues = [{ code, severity: 'error', message: 'PRIVATE' }];
    expect(evaluate(current, command(old), record(old))).toEqual({ state: 'DENY', reason: 'CANONICAL_HARD_FAILURE' });
  });
  it.each(['toString', 'constructor', '__proto__', 'NOT_A_CANONICAL_CODE'])('fails closed on unknown/prototype code %s without presenting private or invented warning content', code => {
    const old = warned(), current = structuredClone(old);
    Object.assign(current.canonical, { issues: [{ code, severity: 'warning', message: 'PRIVATE' }] });
    expect(review(current)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
    expect(evaluate(current, command(old), record(old))).toEqual({ state: 'DENY', reason: 'INVALID_INPUT' });
  });
  it('retains an explicit canonical deny even with no exposable issue codes', () => {
    const old = warned(), current = structuredClone(old); current.canonical.allowed = false;
    expect(review(current)).toEqual({ state: 'blocked', reason: 'CANONICAL_HARD_FAILURE', codes: [] });
    expect(evaluate(current, command(old), record(old))).toEqual({ state: 'DENY', reason: 'CANONICAL_HARD_FAILURE' });
  });
  it.each(['OWNER', 'MANAGER'] as const)('never allows %s to override a canonical hard failure', role => {
    const v = warned(); v.authority.role = role;
    v.canonical.issues = [{ code: 'SHIFT_OVERLAP', severity: 'error', message: 'PRIVATE HARD FAILURE', details: { locationId: 'PRIVATE OTHER LOCATION' } }];
    expect(review(v)).toMatchObject({ state: 'blocked', reason: 'CANONICAL_HARD_FAILURE', codes: ['SHIFT_OVERLAP'] });
    const valid = warned(), c = command(valid), r = record(valid);
    expect(evaluate(v, c, r)).toMatchObject({ state: 'DENY', reason: 'CANONICAL_HARD_FAILURE' });
    expect(JSON.stringify(review(v))).not.toContain('PRIVATE');
  });
  it.each(['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'publishAllowed'] as const)('cannot acknowledge away lost %s', field => {
    const original = warned(), c = command(original), r = record(original), current = structuredClone(original); current.authority[field] = false;
    expect(evaluate(current, c, r)).toMatchObject({ state: 'DENY', reason: 'ACCESS_DENIED' });
  });
  it.each(['LEAD', 'EMPLOYEE'] as const)('does not grant %s publication by warning acknowledgement', role => {
    const old = warned(), v = structuredClone(old); v.authority.role = role;
    expect(evaluate(v, command(old), record(old))).toMatchObject({ state: 'DENY', reason: 'ACCESS_DENIED' });
  });
  it.each(['DISABLED', 'PROOF_PENDING', 'SUSPENDED'] as const)('cannot publish from %s portal state', state => {
    const old = warned(), v = structuredClone(old); v.authority.portalState = state;
    expect(evaluate(v, command(old), record(old))).toMatchObject({ state: 'DENY', reason: 'ACCESS_DENIED' });
  });
  it.each(['sourceVersion', 'configurationVersion', 'reviewId'] as const)('requires fresh review after %s changes', field => {
    const old = warned(), c = command(old), r = record(old), current = structuredClone(old); current[field] += '-new';
    expect(evaluate(current, c, r)).toMatchObject({ state: 'DENY', reason: 'REVIEW_CHANGED' });
  });
  it.each(['sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'] as const)('cannot reuse an uncommitted review after %s changes', field => {
    const old = warned(), current = structuredClone(old); current.authority[field] += '-new';
    expect(evaluate(current, command(old), record(old))).toMatchObject({ state: 'DENY', reason: 'REVIEW_CHANGED' });
  });
  it('binds changed warning content even if an incorrectly unchanged source/config version is supplied', () => {
    const old = warned(), current = structuredClone(old); current.readiness.hours.overTargetCount = 4;
    expect(evaluate(current, command(old), record(old))).toMatchObject({ state: 'DENY', reason: 'REVIEW_CHANGED' });
  });
  it('rejects selected week/location/target and operation namespace drift', () => {
    const old = warned(), c = command(old), r = record(old);
    for (const key of ['weekStart', 'locationId', 'scheduleId'] as const) { const current = structuredClone(old); current.selection[key] += '-other';
      expect(evaluate(current, c, r)?.state).not.toBe('ALLOW_NEW'); }
    for (const key of ['workspaceId', 'actorId', 'purpose', 'operationId'] as const) { const changed = structuredClone(c); Object.assign(changed.namespace, { [key]: 'PRIVATE OTHER' });
      expect(evaluate(old, changed, r)?.state).not.toBe('ALLOW_NEW'); }
  });
  it('does not issue a confirmation without current complete scoped sources and canonical evaluation', () => {
    for (const field of ['sourceCurrent', 'sourceComplete', 'footprintComplete', 'readAllowed'] as const) { const v = warned(); v[field] = false;
      expect(review(v)).toMatchObject({ state: 'unavailable' }); }
    const v = warned(); v.canonical.checked = false; expect(review(v)).toMatchObject({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('requires protected OPEN review observations and honors expiry without extending an old review', () => {
    const v = warned(), c = command(v), r = record(v);
    expect(evaluate(v, c, null)).toMatchObject({ state: 'DENY', reason: 'REVIEW_REQUIRED' });
    r.expiresAt = NOW; expect(evaluate(v, c, r)).toMatchObject({ state: 'DENY', reason: 'REVIEW_EXPIRED' });
    r.expiresAt = v.expiresAt!; r.state = 'CONSUMED'; expect(evaluate(v, c, r)).toMatchObject({ state: 'OUTCOME_REQUIRED', operationId: OP });
    r.state = 'CANCELLED'; expect(evaluate(v, c, r)).toMatchObject({ state: 'DENY', reason: 'REVIEW_CLOSED' });
  });
  it('does not leak warnings, counts or fingerprints outside administrative M or source field permission', () => {
    const v = warned(); v.affectedLocationIds = ['a', 'b']; Object.assign(v.readiness.locationCoverage!, { locationName: 'PRIVATE NAME' });
    expect(review(v)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
    const noField = warned(); noField.permittedFields = ['schedule'];
    expect(review(noField)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
    const noScope = warned(); noScope.authority.administrativeScope = null;
    expect(review(noScope)).toEqual({ state: 'unavailable', reason: 'ACCESS_DENIED' });
  });
  it.each(['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT'] as const)('preserves explicitly recorded Manager ALL_TENANT scope from %s', origin => {
    const v = warned(); v.authority.administrativeScope = { kind: 'ALL_TENANT', origin }; v.affectedLocationIds = ['a', 'b'];
    expect(evaluate(v)).toMatchObject({ state: 'ALLOW_NEW' });
  });
  it('preserves same-tenant Owner authority without inferring a Manager scope', () => {
    const v = warned(); v.authority.role = 'OWNER'; v.authority.administrativeScope = null; v.affectedLocationIds = ['a', 'b'];
    expect(evaluate(v)).toMatchObject({ state: 'ALLOW_NEW' });
  });
  it('does not extend an original review expiry by refreshing an otherwise identical source observation', () => {
    const old = warned(), c = command(old), r = record(old), current = structuredClone(old);
    current.now = '2026-10-09T12:00:30.000001Z'; current.observedAt = current.now; current.expiresAt = '2026-10-09T12:00:59Z';
    expect(prepared(current).fingerprint).toBe(c.reviewFingerprint);
    expect(evaluate(current, c, r)).toEqual({ state: 'DENY', reason: 'REVIEW_EXPIRED' });
  });
  it('rejects future observations and respects exact sub-millisecond source expiry', () => {
    const future = warned(); future.observedAt = '2026-10-09T12:00:00.000001Z';
    expect(review(future)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
    const current = warned(); current.expiresAt = '2026-10-09T12:00:00.000001Z';
    expect(review(current)).toMatchObject({ state: 'ready' });
    current.now = current.expiresAt;
    expect(review(current)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('requires fresh complete review after drift and permits a newly reviewed replacement rather than stale reuse', () => {
    const old = warned(), current = structuredClone(old); current.sourceVersion = 'new-source'; current.reviewId = 'new-review';
    current.readiness.hours.underTargetCount = 5;
    expect(evaluate(current, command(old), record(old))).toEqual({ state: 'DENY', reason: 'REVIEW_CHANGED' });
    expect(evaluate(current, command(current), record(current))).toMatchObject({ state: 'ALLOW_NEW', sourceVersion: 'new-source' });
  });
  it('does not turn claimed checked null counts into zero-looking findings', () => {
    const v = warned(); v.readiness.hours.underTargetCount = null;
    expect(review(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('rejects sparse footprints instead of silently skipping unknown affected locations', () => {
    const v = warned(); v.affectedLocationIds = ['a']; v.affectedLocationIds.length = 2;
    expect(review(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('rejects unknown command fields rather than dropping changed intent from the canonical digest', () => {
    const v = warned(), c = command(v); Object.assign(c, { overrideHardGuards: true });
    expect(evaluate(v, c)).toEqual({ state: 'DENY', reason: 'INVALID_INPUT' });
  });
  it('rejects unknown namespace fields rather than accepting request-supplied authority', () => {
    const v = warned(), c = command(v); Object.assign(c.namespace, { provisioner: true });
    expect(evaluate(v, c)).toEqual({ state: 'DENY', reason: 'INVALID_INPUT' });
  });
  it('rejects unknown selection fields rather than accepting changed intent outside the digest', () => {
    const v = warned();
    const selected = command(v); Object.assign(selected.selection, { employeeId: 'PRIVATE OTHER' });
    expect(evaluate(v, selected)).toEqual({ state: 'DENY', reason: 'INVALID_INPUT' });
  });
});

describe('F2 immutable operation replay contract', () => {
  it('recovers a committed receipt without fabricating a current target, canonical evaluation or readiness source', () => {
    const old = warned(), c = command(old), op = committed(old, c), current = structuredClone(old);
    Object.assign(current, { sourceCurrent: false, sourceComplete: false, sourceVersion: null, configurationVersion: null,
      observedAt: null, expiresAt: null, target: null, canonical: null, readiness: null });
    expect(evaluate(current, c, record(old), op)).toMatchObject({ state: 'REPLAY' });
    expect(review(current)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('returns the original rejected receipt without allocating another publication attempt', () => {
    const v = warned(), c = command(v), op = committed(v, c);
    op.state = 'REJECTED'; op.outcome = { published: false, code: 'NOT_COMMITTED' };
    expect(evaluate(v, c, record(v), op)).toEqual({ state: 'REPLAY', operationId: OP, outcome: { published: false, code: 'NOT_COMMITTED' } });
  });
  it('conflicts a pending operation carrying a contradictory terminal outcome', () => {
    const v = warned(), c = command(v), op = committed(v, c); op.state = 'PENDING';
    expect(evaluate(v, c, record(v), op)).toEqual({ state: 'DENY', reason: 'OPERATION_CONFLICT' });
  });
  it('permits current authorized receipt history for an inactive location but refuses a new publication there', () => {
    const old = warned(), c = command(old), op = committed(old, c), current = structuredClone(old); current.locations[0].active = false;
    expect(evaluate(current, c, record(old), op)).toMatchObject({ state: 'REPLAY' });
    expect(evaluate(current, c, record(old))).toEqual({ state: 'DENY', reason: 'ACCESS_DENIED' });
  });
  it('canonicalizes trimmed reason and newline semantics for the same operation payload', () => {
    const v = warned(), c = command(v, 'PUBLISH_WITH_WARNINGS', 'Reviewed\nshortage'), op = committed(v, c);
    const changed = { ...c, reason: '  Reviewed\r\nshortage  ' };
    expect(evaluate(v, changed, record(v), op)).toMatchObject({ state: 'REPLAY' });
  });
  it.each(['reviewId', 'reviewFingerprint', 'expectedSourceVersion', 'expectedConfigurationVersion', 'choice'] as const)('conflicts changed %s in an existing operation payload', key => {
    const v = warned(), c = command(v), op = committed(v, c), changed = structuredClone(c);
    Object.assign(changed, { [key]: key === 'reviewFingerprint' ? 'v1:' + 'a'.repeat(64) : key === 'choice' ? 'PUBLISH' : c[key] + '-new' });
    expect(evaluate(v, changed, record(v), op)).toEqual({ state: 'DENY', reason: key === 'choice' ? 'INVALID_REASON' : 'OPERATION_CONFLICT' });
  });
  it('does not mutate source, command, protected review or operation records', () => {
    const v = warned(), c = command(v), r = record(v), op = committed(v, c), before = structuredClone([v, c, r, op]);
    review(v); evaluate(v, c, r, op);
    expect([v, c, r, op]).toEqual(before);
  });
  it('returns only the original safe committed result without another mutation', () => {
    const v = warned(), c = command(v), op = committed(v, c);
    Object.assign(op.outcome!, { privateBody: 'PRIVATE', token: 'PRIVATE' });
    expect(evaluate(v, c, record(v), op)).toEqual({ state: 'REPLAY', operationId: OP, outcome: { published: true, revisionId: 'revision-1', revisionNumber: 1, occurredAt: NOW } });
  });
  it('allows authorized replacement-session receipt recovery after original source/config/review expiry', () => {
    const old = warned(), c = command(old), op = committed(old, c), current = structuredClone(old);
    current.authority.sessionVersion = 'replacement-session'; current.sourceVersion = 'source-after-publish'; current.configurationVersion = 'new-config';
    current.now = '2026-10-09T12:00:45Z'; current.sourceCurrent = false; current.canonical.checked = false;
    const r = record(old); r.expiresAt = '2026-10-09T12:00:30Z';
    expect(evaluate(current, c, r, op)).toMatchObject({ state: 'REPLAY' });
    expect(evaluate(current, c, r)).not.toMatchObject({ state: 'ALLOW_NEW' });
  });
  it('recovers a committed receipt with genuinely unavailable live source versions/timestamps rather than fabricated placeholders', () => {
    const old = warned(), c = command(old), op = committed(old, c), current = structuredClone(old);
    Object.assign(current, { sourceCurrent: false, sourceComplete: false, sourceVersion: null, configurationVersion: null, observedAt: null, expiresAt: null });
    expect(evaluate(current, c, record(old), op)).toMatchObject({ state: 'REPLAY' });
    expect(review(current)).toEqual({ state: 'unavailable', reason: 'SOURCE_UNAVAILABLE' });
  });
  it('conflicts changed payload under the same operation rather than disclosing or reusing a receipt', () => {
    const v = warned(), c = command(v), op = committed(v, c), changed = { ...c, reason: 'Different reason' };
    expect(evaluate(v, changed, record(v), op)).toEqual({ state: 'DENY', reason: 'OPERATION_CONFLICT' });
  });
  it('does not accept another actor/tenant/purpose operation or outside-M stored footprint', () => {
    const v = warned(), c = command(v), op = committed(v, c);
    op.namespace.actorId = 'PRIVATE OTHER ACTOR';
    expect(evaluate(v, c, record(v), op)).toEqual({ state: 'DENY', reason: 'OPERATION_CONFLICT' });
    const outside = committed(v, c); outside.locationIds = ['a', 'b'];
    expect(evaluate(v, c, record(v), outside)).toEqual({ state: 'DENY', reason: 'ACCESS_DENIED' });
  });
  it('requires current receipt permission and authority even for a committed replay', () => {
    const v = warned(), c = command(v), op = committed(v, c); v.authority.receiptReadAllowed = false;
    expect(evaluate(v, c, record(warned()), op)).toEqual({ state: 'DENY', reason: 'ACCESS_DENIED' });
  });
  it('retains uncertainty at the same operation ID rather than allowing a second attempt', () => {
    const v = warned(), c = command(v), op = committed(v, c); op.state = 'PENDING'; op.outcome = null;
    expect(evaluate(v, c, record(v), op)).toEqual({ state: 'OUTCOME_REQUIRED', operationId: OP });
  });
  it('preserves protected outcome lookup for a consumed review despite subsequent source drift and a lost receipt response', () => {
    const old = warned(), c = command(old), r = record(old), current = structuredClone(old);
    r.state = 'CONSUMED'; current.sourceCurrent = false; current.sourceVersion = 'after-publication'; current.authority.sessionVersion = 'replacement';
    expect(evaluate(current, c, r, null)).toEqual({ state: 'OUTCOME_REQUIRED', operationId: OP });
  });
  it('binds the review to the original operation ID; a fresh ID cannot bypass response uncertainty', () => {
    const old = warned(), r = record(old), c = command(old), current = structuredClone(old);
    current.namespace.operationId = c.namespace.operationId = '10000000-0000-4000-8000-000000000002';
    expect(evaluate(current, c, r)).toMatchObject({ state: 'DENY', reason: 'REVIEW_CHANGED' });
  });
  it.each([null, {}, []])('fails closed without throwing for malformed input %j', input => {
    expect(() => review(input)).not.toThrow(); expect(review(input)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
    expect(() => decide(input)).not.toThrow(); expect(decide(input)).toEqual({ state: 'DENY', reason: 'INVALID_INPUT' });
  });
});

describe('F2 source compatibility and hard invariant preservation', () => {
  it('preserves exact existing database identifiers rather than trimming tenant, actor or selected source keys', () => {
    const v = warned(); v.namespace.workspaceId = ' tenant-a '; v.namespace.actorId = ' manager ';
    v.selection.locationId = ' a '; v.selection.scheduleId = ' schedule ';
    v.locations = [{ id: ' a ', workspaceId: ' tenant-a ', active: true }];
    v.affectedLocationIds = [' a '];
    v.authority.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: [' a '] };
    v.readiness.locationCoverage!.locationId = ' a ';
    const c = command(v), r = record(v);
    expect(evaluate(v, c, r)).toMatchObject({ state: 'ALLOW_NEW', namespace: v.namespace, selection: v.selection });
    const changed = structuredClone(c); changed.namespace.actorId = 'manager';
    expect(evaluate(v, changed, r)).toEqual({ state: 'DENY', reason: 'OPERATION_CONFLICT' });
  });
  it('does not impose an invented 300-character limit on existing database identifiers', () => {
    const v = warned(), key = 'legacy-'.repeat(60);
    v.selection.scheduleId = key;
    expect(evaluate(v)).toMatchObject({ state: 'ALLOW_NEW', selection: { scheduleId: key } });
  });
  it('preserves the exact historical revision identifier in a safe receipt', () => {
    const v = warned(), c = command(v), op = committed(v, c);
    if (!op.outcome?.published) throw Error('Expected published receipt');
    op.outcome.revisionId = ' revision-1 ';
    expect(evaluate(v, c, record(v), op)).toMatchObject({ state: 'REPLAY', outcome: { revisionId: ' revision-1 ' } });
  });
  it.each(['a\n', 'a\u200e'])('rejects control or formatting characters in existing database identifiers %j', locationId => {
    const v = warned(); v.selection.locationId = locationId;
    expect(review(v)).toEqual({ state: 'unavailable', reason: 'INVALID_INPUT' });
  });
  it('retains current configured readiness counts instead of creating staffing or hour rules', () => {
    const v = warned(), h = v.readiness.hours, canonical = buildPublishReadiness({ locationId: 'a', locationCoverage: [v.readiness.locationCoverage!],
      underTargetCount: h.underTargetCount!, overTargetCount: h.overTargetCount!, unconfiguredTargetCount: h.unconfiguredTargetCount! });
    const r = prepared(v);
    expect(r.warnings.find(w => w.code === 'COVERAGE_GAP')?.count).toBe(canonical.coverageGaps);
    expect(r.warnings.find(w => w.code === 'LEAD_COVERAGE_GAP')?.count).toBe(canonical.missingLeadBlocks);
    expect(r.warnings.find(w => w.code === 'UNDER_TARGET')?.count).toBe(canonical.underTargetCount);
  });
  it('preserves an actual canonical shift overlap error under deliberate acknowledgement', () => {
    const facts: ValidateShiftInput = { candidate: { employeeId: 'employee', locationId: 'a', date: '2026-10-08', startTime: '08:00', endTime: '12:00' },
      workspace: { id: 'tenant-a', active: true, timeZone: 'America/Puerto_Rico' }, location: { id: 'a', workspaceId: 'tenant-a', active: true },
      employee: { active: true, role: 'EMPLOYEE', eligibleLocationIds: ['a'], positionIds: [] },
      existingShifts: [{ employeeId: 'employee', locationId: 'a', date: '2026-10-08', startTime: '09:00', endTime: '13:00' }],
      availability: [], approvedTimeOff: [], mode: 'MANAGER_SCHEDULE' };
    const canonical = validateShift(facts); expect(canonical.blockers.some(i => i.code === 'SHIFT_OVERLAP')).toBe(true);
    const old = warned(), v = structuredClone(old); v.canonical.issues = canonical.issues;
    expect(evaluate(v, command(old), record(old))).toMatchObject({ state: 'DENY', reason: 'CANONICAL_HARD_FAILURE' });
  });
});
