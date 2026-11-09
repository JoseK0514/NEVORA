import { createHash } from 'node:crypto';
import { Temporal } from '@js-temporal/polyfill';
import { isValidWeekStart } from '../date-utils';
import { buildPublishReadiness, type PublishLocationCoverage } from './publish-readiness';
import { schedulingIssueMessage, type ValidationIssue } from './validate-shift';
import type { UserRole } from '../domain';

/** Pure F2 policy preparation, NOT an authorization/proof issuer or competing
 * publication service. Protected F10/F6/F5 consumers must derive all current
 * observations, load immutable review/operation records, and verify this plan
 * again under the canonical writer's ordered locks. No input boolean, digest or
 * returned ALLOW_NEW authenticates a caller. No integration is enabled here. */
export type PublishNamespace = { workspaceId: string; actorId: string; purpose: 'SCHEDULE_PUBLISH'; operationId: string };
export type PublishSelection = { weekStart: string; locationId: string; scheduleId: string | null };
type Scope = null | { kind: 'ALL_TENANT'; origin: 'LEGACY_COMPATIBILITY' | 'EXPLICIT_GRANT' }
  | { kind: 'LOCATIONS'; origin: 'EXPLICIT_GRANT'; locationIds: string[] };
export type PublishWarningSnapshot = {
  namespace: PublishNamespace;
  authority: { role: UserRole; workspaceActive: boolean; workforceActive: boolean;
    portalState: 'DISABLED' | 'PROOF_PENDING' | 'ENABLED' | 'SUSPENDED'; membershipCurrent: boolean;
    sessionCurrent: boolean; grantsCurrent: boolean; publishAllowed: boolean; receiptReadAllowed: boolean;
    sessionVersion: string; grantsVersion: string; scopeVersion: string; incarnation: string;
    expiresAt: string; administrativeScope: Scope };
  selection: PublishSelection; locations: { id: string; workspaceId: string; active: boolean }[];
  now: string; observedAt: string | null; expiresAt: string | null; reviewId: string;
  /** Non-secret exact canonical versions; never bearer/session credentials. */
  sourceVersion: string | null; configurationVersion: string | null; sourceCurrent: boolean; sourceComplete: boolean;
  footprintComplete: boolean; affectedLocationIds: string[]; readAllowed: boolean; permittedFields: string[];
  /** Null explicitly means unavailable; receipt recovery never fabricates a
   * current target/readiness or canonical evaluation to read a prior outcome. */
  target: { status: 'DRAFT' | 'PUBLISHED' | 'MISSING'; shiftCount: number } | null;
  /** Canonical validator/transaction invariants retain their existing severity.
   * This policy NEVER revalidates assignments or converts an error to warning. */
  canonical: { checked: boolean; allowed: boolean; issues: ValidationIssue[] } | null;
  readiness: { locationCoverage: PublishLocationCoverage | null; requiresDesignatedLead: boolean | null;
    positionGapBlocks: number | null; hours: { checked: boolean; underTargetCount: number | null;
      overTargetCount: number | null; unconfiguredTargetCount: number | null } } | null;
};
export type PublishWarningCommand = { namespace: PublishNamespace; selection: PublishSelection; reviewId: string;
  reviewFingerprint: string; expectedSourceVersion: string; expectedConfigurationVersion: string;
  choice: 'PUBLISH' | 'PUBLISH_WITH_WARNINGS' | 'RETURN_TO_REVIEW'; reason: string };
/** Plain server-loaded record facts, not a signed token or proof constructor.
 * Its namespace binds the original operation ID: uncertainty cannot be bypassed
 * by applying one review to a fresh ID. Storage/consumption is integrator-owned. */
export type PublishWarningReviewRecord = { namespace: PublishNamespace; selection: PublishSelection; reviewId: string;
  fingerprint: string; sourceVersion: string; configurationVersion: string; sessionVersion: string;
  grantsVersion: string; scopeVersion: string; incarnation: string; reviewedAt: string; expiresAt: string;
  state: 'OPEN' | 'CONSUMED' | 'CANCELLED' };
export type PublishSafeOutcome = { published: true; revisionId: string; revisionNumber: number; occurredAt: string }
  | { published: false; code: 'NOT_COMMITTED' };
export type PublishOperationRecord = { namespace: PublishNamespace; selection: PublishSelection; payloadDigest: string;
  footprintComplete: boolean; locationIds: string[]; readAllowed: boolean; state: 'COMMITTED' | 'PENDING' | 'REJECTED';
  outcome: PublishSafeOutcome | null };
export type PublishWarningNotice = { code: string; severity: 'advisory'; message: string; count: number | null };
type CheckState = 'CHECKED' | 'NEEDS_SETUP' | 'NOT_CHECKED';
type Checks = { coverage: CheckState; positions: CheckState; lead: CheckState; hours: CheckState };
export type PublishWarningReview =
  | { state: 'unavailable'; reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE' }
  | { state: 'blocked'; reason: 'CANONICAL_HARD_FAILURE' | 'NO_SCHEDULE'; codes: string[] }
  | { state: 'ready'; reviewId: string; fingerprint: string; selection: PublishSelection; observedAt: string; expiresAt: string;
      sourceVersion: string; configurationVersion: string; targetStatus: 'DRAFT' | 'PUBLISHED';
      publicationKind: 'PUBLISH' | 'REPUBLISH'; checks: Checks; warnings: PublishWarningNotice[];
      choices: PublishWarningCommand['choice'][] };
export type PublishWarningDenial = 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE' | 'CANONICAL_HARD_FAILURE' | 'NO_SCHEDULE'
  | 'REVIEW_REQUIRED' | 'REVIEW_CHANGED' | 'REVIEW_EXPIRED' | 'REVIEW_CLOSED' | 'WARNING_ACKNOWLEDGEMENT_REQUIRED'
  | 'CHOICE_MISMATCH' | 'INVALID_REASON' | 'OPERATION_CONFLICT';
export type PublishWarningDecision =
  | { state: 'DENY'; reason: PublishWarningDenial }
  | { state: 'RETURN_TO_REVIEW' }
  | { state: 'OUTCOME_REQUIRED'; operationId: string }
  | { state: 'REPLAY'; operationId: string; outcome: PublishSafeOutcome }
  | { state: 'ALLOW_NEW'; namespace: PublishNamespace; selection: PublishSelection; reviewId: string;
      reviewFingerprint: string; sourceVersion: string; configurationVersion: string; payloadDigest: string; reason: string | null };

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
// Same readable plain-text exclusions as the existing E2 validator; combining
// marks, emoji joiners and newline remain valid. No UTF-16-unit length policy.
const unsafe = /[\u0000-\u0009\u000b-\u001f\u007f-\u009f\u200b\u200e\u200f\u2028-\u202e\u2060-\u206f\ufeff\ud800-\udfff]/u;
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 300 && v.trim() === v && !unsafe.test(v) && !v.includes('\n');
const list = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10000 && Array.from(v).every(id) && new Set(v).size === v.length;
// Match the current tenant resolver's existing text-key semantics. Never trim,
// case-fold or apply a new length rule to persisted tenant/actor/source IDs.
const dbId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(v);
const dbIds = (v: unknown): v is string[] => Array.isArray(v) && v.length <= 10000 && Array.from(v).every(dbId) && new Set(v).size === v.length;
const keys = (v: Record<string, unknown>, expected: string[]) => Object.keys(v).length === expected.length && Object.keys(v).every(k => expected.includes(k));
const integer = (v: unknown, min = 0): v is number => Number.isSafeInteger(v) && Number(v) >= min;
const oneOf = <T extends string>(v: unknown, values: readonly T[]): v is T => typeof v === 'string' && values.includes(v as T);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(v);
const digest = (v: unknown): v is string => typeof v === 'string' && /^v1:[a-f0-9]{64}$/.test(v);
const instant = (v: unknown): string => { if (!id(v)) throw Error('Invalid time'); return Temporal.Instant.from(v).toString(); };
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const hash = (material: unknown[]) => 'v1:' + createHash('sha256').update(JSON.stringify(material)).digest('hex');
const sameNamespace = (a: PublishNamespace, b: PublishNamespace) => a.workspaceId === b.workspaceId && a.actorId === b.actorId && a.purpose === b.purpose && a.operationId === b.operationId;
const sameSelection = (a: PublishSelection, b: PublishSelection) => a.weekStart === b.weekStart && a.locationId === b.locationId && a.scheduleId === b.scheduleId;
const namespaceValues = (n: PublishNamespace) => [n.workspaceId, n.actorId, n.purpose, n.operationId];
const selectionValues = (s: PublishSelection) => [s.weekStart, s.locationId, s.scheduleId];
const deny = (reason: PublishWarningDenial): PublishWarningDecision => ({ state: 'DENY', reason });
const failedReview = (reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE'): PublishWarningReview => ({ state: 'unavailable', reason });
function namespace(value: unknown): PublishNamespace {
  if (!object(value) || !keys(value, ['workspaceId', 'actorId', 'purpose', 'operationId']) || !dbId(value.workspaceId) || !dbId(value.actorId) || value.purpose !== 'SCHEDULE_PUBLISH' || !uuid(value.operationId)) throw Error('Invalid namespace');
  return { workspaceId: value.workspaceId, actorId: value.actorId, purpose: value.purpose, operationId: value.operationId };
}
function selection(value: unknown): PublishSelection {
  if (!object(value) || !keys(value, ['weekStart', 'locationId', 'scheduleId']) || typeof value.weekStart !== 'string' || !isValidWeekStart(value.weekStart) || !dbId(value.locationId) || !(value.scheduleId === null || dbId(value.scheduleId))) throw Error('Invalid selection');
  return { weekStart: value.weekStart, locationId: value.locationId, scheduleId: value.scheduleId };
}
function snapshotCore(value: unknown): PublishWarningSnapshot {
  if (!object(value) || !object(value.authority) || !(value.target === null || object(value.target)) ||
    !(value.canonical === null || object(value.canonical)) || !(value.readiness === null || object(value.readiness)) ||
    !id(value.reviewId) || !(value.sourceVersion === null || id(value.sourceVersion)) || !(value.configurationVersion === null || id(value.configurationVersion)) || !dbIds(value.affectedLocationIds) || !list(value.permittedFields) ||
    !['sourceCurrent', 'sourceComplete', 'footprintComplete', 'readAllowed'].every(key => typeof value[key] === 'boolean')) throw Error('Invalid source');
  namespace(value.namespace); selection(value.selection); instant(value.now);
  if (value.observedAt !== null) instant(value.observedAt);
  if (value.expiresAt !== null) instant(value.expiresAt);
  const a = value.authority;
  if (!oneOf(a.role, ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE']) || !oneOf(a.portalState, ['DISABLED', 'PROOF_PENDING', 'ENABLED', 'SUSPENDED']) ||
    !['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'publishAllowed', 'receiptReadAllowed'].every(key => typeof a[key] === 'boolean') ||
    !['sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'].every(key => id(a[key]))) throw Error('Invalid authority');
  instant(a.expiresAt);
  const scope = a.administrativeScope;
  if (scope !== null && (!object(scope) || (scope.kind === 'ALL_TENANT' ? !oneOf(scope.origin, ['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT']) :
    scope.kind !== 'LOCATIONS' || scope.origin !== 'EXPLICIT_GRANT' || !dbIds(scope.locationIds)))) throw Error('Invalid scope');
  if (!Array.isArray(value.locations) || value.locations.length > 10000 || !Array.from(value.locations).every(l => object(l) && dbId(l.id) && dbId(l.workspaceId) && typeof l.active === 'boolean') ||
    new Set(value.locations.map(l => l.id)).size !== value.locations.length ||
    (value.target !== null && (!oneOf(value.target.status, ['DRAFT', 'PUBLISHED', 'MISSING']) || !integer(value.target.shiftCount))) ||
    (value.canonical !== null && (typeof value.canonical.checked !== 'boolean' || typeof value.canonical.allowed !== 'boolean' || !Array.isArray(value.canonical.issues) || value.canonical.issues.length > 1000))) throw Error('Invalid source');
  return value as PublishWarningSnapshot;
}
function authorityCurrent(s: PublishWarningSnapshot): boolean {
  const a = s.authority;
  return ['OWNER', 'MANAGER'].includes(a.role) && a.workspaceActive && a.workforceActive && a.portalState === 'ENABLED' &&
    a.membershipCurrent && a.sessionCurrent && a.grantsCurrent && Temporal.Instant.compare(a.expiresAt, s.now) > 0 &&
    (a.role === 'OWNER' || a.administrativeScope !== null);
}
function scoped(s: PublishWarningSnapshot, locations: string[], active: boolean): boolean {
  const known = new Map(s.locations.map(l => [l.id, l])), scope = s.authority.administrativeScope;
  if (s.locations.some(l => l.workspaceId !== s.namespace.workspaceId) || (scope?.kind === 'LOCATIONS' && scope.locationIds.some(id => !known.has(id)))) return false;
  return locations.every(id => {
    const location = known.get(id);
    return !!location && location.workspaceId === s.namespace.workspaceId && (!active || location.active) &&
      (s.authority.role === 'OWNER' || scope?.kind === 'ALL_TENANT' || scope?.kind === 'LOCATIONS' && scope.locationIds.includes(id));
  });
}
function canonicalIssues(s: PublishWarningSnapshot): Pick<ValidationIssue, 'code' | 'severity'>[] {
  if (s.canonical === null) throw Error('Unavailable canonical source');
  const unique = new Map<string, Pick<ValidationIssue, 'code' | 'severity'>>();
  for (const value of s.canonical.issues) {
    if (!object(value) || !id(value.code) || typeof schedulingIssueMessage(value.code) !== 'string' || !oneOf(value.severity, ['error', 'warning'])) throw Error('Unknown canonical issue');
    unique.set(value.code + ':' + value.severity, { code: value.code as ValidationIssue['code'], severity: value.severity });
  }
  return [...unique.values()].sort((a, b) => order(a.code, b.code) || order(a.severity, b.severity));
}

function notices(s: PublishWarningSnapshot, canonical: Pick<ValidationIssue, 'code' | 'severity'>[]): { warnings: PublishWarningNotice[]; checks: Checks } {
  if (s.readiness === null) throw Error('Unavailable readiness source');
  const r = s.readiness, c = r.locationCoverage, h = r.hours, warnings = new Map<string, PublishWarningNotice>();
  const checks: Checks = { coverage: 'NOT_CHECKED', positions: 'NOT_CHECKED', lead: 'NOT_CHECKED', hours: 'NOT_CHECKED' };
  const add = (code: string, message: string, count: number | null = null) => warnings.set(code, { code, severity: 'advisory', message, count });
  if (!object(h) || typeof h.checked !== 'boolean' || !(r.requiresDesignatedLead === null || typeof r.requiresDesignatedLead === 'boolean') ||
    !(r.positionGapBlocks === null || integer(r.positionGapBlocks))) throw Error('Invalid readiness');
  if (c !== null) {
    if (!object(c) || c.locationId !== s.selection.locationId || !id(c.locationName) || !['totalBlocks', 'coveredBlocks', 'uncoveredBlocks', 'missingLeadBlocks'].every(k => integer(c[k as keyof PublishLocationCoverage])) ||
      c.coveredBlocks + c.uncoveredBlocks !== c.totalBlocks || c.missingLeadBlocks > c.uncoveredBlocks || typeof c.fullyCovered !== 'boolean' ||
      ['staffingConfigured', 'coverageConfigured', 'positionRequirementsConfigured'].some(k => c[k as keyof PublishLocationCoverage] !== undefined && typeof c[k as keyof PublishLocationCoverage] !== 'boolean') ||
      (r.positionGapBlocks !== null && r.positionGapBlocks > c.uncoveredBlocks) || (r.requiresDesignatedLead === false && c.missingLeadBlocks > 0)) throw Error('Inconsistent readiness');
    if (c.staffingConfigured === false) add('STAFFING_NOT_CONFIGURED', 'Configure minimum staffing and choose a designated Lead rule.');
    if (c.coverageConfigured === false) add('COVERAGE_NOT_CONFIGURED', 'Configure coverage periods; coverage is not checked.');
    if (c.positionRequirementsConfigured === false) { checks.positions = 'NEEDS_SETUP'; add('POSITION_REQUIREMENT_INVALID', 'Configured position requirements need setup.'); }
    else if (c.positionRequirementsConfigured === true && r.positionGapBlocks !== null && c.coverageConfigured === true && c.totalBlocks > 0) {
      checks.positions = 'CHECKED'; if (r.positionGapBlocks) add('POSITION_COVERAGE_GAP', 'Configured position coverage needs review.', r.positionGapBlocks);
    }
    if (c.staffingConfigured === false || c.coverageConfigured === false) checks.coverage = 'NEEDS_SETUP';
    else if (c.staffingConfigured === true && c.coverageConfigured === true && c.totalBlocks > 0 && (c.fullyCovered || c.uncoveredBlocks > 0)) {
      checks.coverage = 'CHECKED'; if (c.uncoveredBlocks) add('COVERAGE_GAP', 'Configured coverage blocks need review.', c.uncoveredBlocks);
    }
    if (r.requiresDesignatedLead !== null && c.staffingConfigured === true && c.coverageConfigured === true && c.totalBlocks > 0) {
      checks.lead = 'CHECKED'; if (c.missingLeadBlocks) add('LEAD_COVERAGE_GAP', 'Configured designated Lead coverage needs review.', c.missingLeadBlocks);
    } else if (c.staffingConfigured === false || c.coverageConfigured === false) checks.lead = 'NEEDS_SETUP';
  }
  if (checks.coverage === 'NOT_CHECKED') add('COVERAGE_NOT_CHECKED', 'Coverage is not checked; review the source and configuration.');
  if (checks.positions === 'NOT_CHECKED') add('POSITION_COVERAGE_NOT_CHECKED', 'Position coverage is not checked.');
  if (checks.lead === 'NOT_CHECKED') add('LEAD_RULE_NOT_CHECKED', 'Designated Lead coverage is not checked.');
  if (h.checked) {
    if (![h.underTargetCount, h.overTargetCount, h.unconfiguredTargetCount].every(v => integer(v))) throw Error('Unknown hour counts');
    checks.hours = 'CHECKED';
    // Reuse the canonical hour/count projection only after explicit known facts.
    const ready = buildPublishReadiness({ locationId: s.selection.locationId, locationCoverage: c ? [c] : [],
      underTargetCount: h.underTargetCount!, overTargetCount: h.overTargetCount!, unconfiguredTargetCount: h.unconfiguredTargetCount! });
    if (ready.underTargetCount) add('UNDER_TARGET', 'Employees below configured weekly hour targets need review.', ready.underTargetCount);
    if (ready.overTargetCount) add('OVER_TARGET', 'Employees above configured weekly hour targets need review.', ready.overTargetCount);
    if (ready.unconfiguredTargetCount) add('TARGET_MISSING', 'Employee weekly hour targets need setup.', ready.unconfiguredTargetCount);
  } else {
    if ([h.underTargetCount, h.overTargetCount, h.unconfiguredTargetCount].some(v => v !== null)) throw Error('Unverified hour counts');
    add('HOUR_TARGETS_NOT_CHECKED', 'Configured hour targets are not checked.');
  }
  for (const issue of canonical) if (issue.severity === 'warning') {
    const code = issue.code === 'STAFFING_GAP' ? 'COVERAGE_GAP' : issue.code;
    if (!warnings.has(code)) add(code, schedulingIssueMessage(issue.code));
  }
  const orderCodes = ['STAFFING_NOT_CONFIGURED', 'COVERAGE_NOT_CONFIGURED', 'POSITION_REQUIREMENT_INVALID', 'COVERAGE_NOT_CHECKED',
    'POSITION_COVERAGE_NOT_CHECKED', 'LEAD_RULE_NOT_CHECKED', 'HOUR_TARGETS_NOT_CHECKED', 'COVERAGE_GAP', 'POSITION_COVERAGE_GAP',
    'LEAD_COVERAGE_GAP', 'UNDER_TARGET', 'OVER_TARGET', 'TARGET_MISSING'];
  return { checks, warnings: [...warnings.values()].sort((a, b) => {
    const ar = orderCodes.indexOf(a.code), br = orderCodes.indexOf(b.code);
    return (ar < 0 ? orderCodes.length : ar) - (br < 0 ? orderCodes.length : br) || order(a.code, b.code);
  }) };
}

function prepare(s: PublishWarningSnapshot): PublishWarningReview {
  if (!authorityCurrent(s) || !s.authority.publishAllowed || !s.readAllowed || !s.footprintComplete ||
    !['schedule', 'readiness', 'configuration'].every(f => s.permittedFields.includes(f)) ||
    !s.affectedLocationIds.includes(s.selection.locationId) || !scoped(s, s.affectedLocationIds, true)) return failedReview('ACCESS_DENIED');
  if (!s.sourceCurrent || !s.sourceComplete || s.sourceVersion === null || s.configurationVersion === null || s.observedAt === null || s.expiresAt === null ||
    s.target === null || s.canonical === null || s.readiness === null ||
    Temporal.Instant.compare(s.observedAt, s.now) > 0 || Temporal.Instant.compare(s.expiresAt, s.now) <= 0 ||
    Temporal.Instant.compare(s.expiresAt, s.observedAt) <= 0 || !s.canonical.checked) return failedReview('SOURCE_UNAVAILABLE');
  const issues = canonicalIssues(s), errors = issues.filter(i => i.severity === 'error').map(i => i.code);
  if (!s.canonical.allowed || errors.length) return { state: 'blocked', reason: 'CANONICAL_HARD_FAILURE', codes: errors };
  if (s.target.status === 'MISSING' || s.selection.scheduleId === null) return { state: 'blocked', reason: 'NO_SCHEDULE', codes: [] };
  const { warnings, checks } = notices(s, issues), a = s.authority;
  const scope = a.administrativeScope;
  const material = ['F2_WARNING_REVIEW_V1', namespaceValues(s.namespace), selectionValues(s.selection), s.reviewId,
    s.sourceVersion, s.configurationVersion, a.role, a.sessionVersion, a.grantsVersion, a.scopeVersion, a.incarnation,
    scope?.kind === 'LOCATIONS' ? [scope.kind, scope.origin, [...scope.locationIds].sort(order)] : scope ? [scope.kind, scope.origin] : null,
    [...s.affectedLocationIds].sort(order), [...s.permittedFields].sort(order), s.target.status, s.target.shiftCount, issues, checks, warnings,
    // Bind permitted factual values too, so incorrectly reused version text does
    // not make a changed warning/configuration snapshot equivalent.
    s.readiness.locationCoverage ? [s.readiness.locationCoverage.totalBlocks, s.readiness.locationCoverage.coveredBlocks,
      s.readiness.locationCoverage.uncoveredBlocks, s.readiness.locationCoverage.missingLeadBlocks, s.readiness.locationCoverage.fullyCovered,
      s.readiness.locationCoverage.staffingConfigured ?? null, s.readiness.locationCoverage.coverageConfigured ?? null,
      s.readiness.locationCoverage.positionRequirementsConfigured ?? null] : null,
    s.readiness.requiresDesignatedLead, s.readiness.positionGapBlocks,
    [s.readiness.hours.checked, s.readiness.hours.underTargetCount, s.readiness.hours.overTargetCount, s.readiness.hours.unconfiguredTargetCount]];
  return { state: 'ready', reviewId: s.reviewId, fingerprint: hash(material), selection: { ...s.selection }, observedAt: instant(s.observedAt),
    expiresAt: Temporal.Instant.compare(s.expiresAt, a.expiresAt) < 0 ? instant(s.expiresAt) : instant(a.expiresAt),
    sourceVersion: s.sourceVersion, configurationVersion: s.configurationVersion, targetStatus: s.target.status,
    publicationKind: s.target.status === 'PUBLISHED' ? 'REPUBLISH' : 'PUBLISH', checks, warnings,
    choices: [warnings.length ? 'PUBLISH_WITH_WARNINGS' : 'PUBLISH', 'RETURN_TO_REVIEW'] };
}
export function preparePublishWarningReview(value: unknown): PublishWarningReview {
  try { return prepare(snapshotCore(value)); } catch { return failedReview('INVALID_INPUT'); }
}

function commandFrom(value: unknown): PublishWarningCommand {
  if (!object(value) || !keys(value, ['namespace', 'selection', 'reviewId', 'reviewFingerprint', 'expectedSourceVersion', 'expectedConfigurationVersion', 'choice', 'reason']) ||
    !id(value.reviewId) || !digest(value.reviewFingerprint) || !id(value.expectedSourceVersion) || !id(value.expectedConfigurationVersion) ||
    !oneOf(value.choice, ['PUBLISH', 'PUBLISH_WITH_WARNINGS', 'RETURN_TO_REVIEW']) || typeof value.reason !== 'string') throw Error('Invalid command');
  return { namespace: namespace(value.namespace), selection: selection(value.selection), reviewId: value.reviewId,
    reviewFingerprint: value.reviewFingerprint, expectedSourceVersion: value.expectedSourceVersion, expectedConfigurationVersion: value.expectedConfigurationVersion,
    choice: value.choice, reason: value.reason };
}
function normalizedReason(c: PublishWarningCommand): string | null {
  const normalized = c.reason.replace(/\r\n?/g, '\n'), reason = normalized.trim();
  if (unsafe.test(normalized) || (c.choice === 'PUBLISH_WITH_WARNINGS' ? [...reason].length < 1 || [...reason].length > 500 ||
    !/[^\p{White_Space}\p{C}\p{M}]/u.test(reason) : reason.length !== 0)) throw Error('Invalid reason');
  return c.choice === 'PUBLISH_WITH_WARNINGS' ? reason : null;
}
function payloadHash(c: PublishWarningCommand, reason: string | null): string {
  return hash(['F2_WARNING_COMMAND_V1', namespaceValues(c.namespace), selectionValues(c.selection), c.reviewId, c.reviewFingerprint,
    c.expectedSourceVersion, c.expectedConfigurationVersion, c.choice, reason]);
}
function reviewRecordFrom(value: unknown): PublishWarningReviewRecord {
  if (!object(value) || !id(value.reviewId) || !digest(value.fingerprint) || !['sourceVersion', 'configurationVersion', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'].every(k => id(value[k])) ||
    !oneOf(value.state, ['OPEN', 'CONSUMED', 'CANCELLED'])) throw Error('Invalid review');
  namespace(value.namespace); selection(value.selection); instant(value.reviewedAt); instant(value.expiresAt);
  return value as PublishWarningReviewRecord;
}
function replay(s: PublishWarningSnapshot, c: PublishWarningCommand, raw: unknown, payloadDigest: string): PublishWarningDecision {
  if (!object(raw) || !digest(raw.payloadDigest) || !dbIds(raw.locationIds) || typeof raw.readAllowed !== 'boolean' || typeof raw.footprintComplete !== 'boolean' ||
    !oneOf(raw.state, ['COMMITTED', 'PENDING', 'REJECTED'])) return deny('OPERATION_CONFLICT');
  let n: PublishNamespace, selected: PublishSelection;
  try { n = namespace(raw.namespace); selected = selection(raw.selection); } catch { return deny('OPERATION_CONFLICT'); }
  if (!sameNamespace(n, c.namespace) || !sameSelection(selected, c.selection) || raw.payloadDigest !== payloadDigest) return deny('OPERATION_CONFLICT');
  if (!s.authority.receiptReadAllowed || !raw.readAllowed || !raw.footprintComplete || !raw.locationIds.includes(selected.locationId) || !scoped(s, raw.locationIds, false)) return deny('ACCESS_DENIED');
  if (raw.state === 'PENDING') return raw.outcome === null ? { state: 'OUTCOME_REQUIRED', operationId: c.namespace.operationId } : deny('OPERATION_CONFLICT');
  if (!object(raw.outcome)) return deny('OPERATION_CONFLICT');
  if (raw.state === 'REJECTED') return raw.outcome.published === false && raw.outcome.code === 'NOT_COMMITTED'
    ? { state: 'REPLAY', operationId: c.namespace.operationId, outcome: { published: false, code: 'NOT_COMMITTED' } } : deny('OPERATION_CONFLICT');
  if (raw.outcome.published !== true || !dbId(raw.outcome.revisionId) || !integer(raw.outcome.revisionNumber, 1)) return deny('OPERATION_CONFLICT');
  let occurredAt: string;
  try { occurredAt = instant(raw.outcome.occurredAt); } catch { return deny('OPERATION_CONFLICT'); }
  if (Temporal.Instant.compare(occurredAt, s.now) > 0) return deny('OPERATION_CONFLICT');
  return { state: 'REPLAY', operationId: c.namespace.operationId, outcome: { published: true, revisionId: raw.outcome.revisionId,
    revisionNumber: raw.outcome.revisionNumber, occurredAt } };
}
function evaluate(value: unknown): PublishWarningDecision {
  if (!object(value) || !Object.hasOwn(value, 'reviewRecord') || !Object.hasOwn(value, 'operationRecord')) return deny('INVALID_INPUT');
  const s = snapshotCore(value.snapshot), c = commandFrom(value.command);
  if (!authorityCurrent(s)) return deny('ACCESS_DENIED');
  if (!sameNamespace(s.namespace, c.namespace)) return deny('OPERATION_CONFLICT');
  let reason: string | null;
  try { reason = normalizedReason(c); } catch { return deny('INVALID_REASON'); }
  const payloadDigest = payloadHash(c, reason);
  // A committed result is recovery, not a new mutation. Replaced sessions and
  // changed/expired live source must not require replaying the old publication.
  if (value.operationRecord !== null) return replay(s, c, value.operationRecord, payloadDigest);
  const loaded = value.reviewRecord === null ? null : reviewRecordFrom(value.reviewRecord);
  // Consumed review means an outcome may already exist. This narrow branch
  // returns only the caller's bound operation ID, never fresh write authority.
  if (loaded?.state === 'CONSUMED') {
    if (!sameNamespace(loaded.namespace, c.namespace) || !sameSelection(loaded.selection, c.selection) || loaded.reviewId !== c.reviewId ||
      loaded.fingerprint !== c.reviewFingerprint || loaded.sourceVersion !== c.expectedSourceVersion || loaded.configurationVersion !== c.expectedConfigurationVersion) return deny('REVIEW_CHANGED');
    if (!s.authority.receiptReadAllowed || !scoped(s, [loaded.selection.locationId], false)) return deny('ACCESS_DENIED');
    return { state: 'OUTCOME_REQUIRED', operationId: c.namespace.operationId };
  }
  const current = prepare(s);
  if (current.state !== 'ready') return deny(current.reason);
  if (loaded === null) return deny('REVIEW_REQUIRED');
  if (!sameNamespace(loaded.namespace, s.namespace) || !sameSelection(loaded.selection, s.selection) || !sameSelection(c.selection, s.selection) ||
    loaded.reviewId !== s.reviewId || c.reviewId !== s.reviewId || loaded.fingerprint !== current.fingerprint || c.reviewFingerprint !== current.fingerprint ||
    loaded.sourceVersion !== s.sourceVersion || loaded.configurationVersion !== s.configurationVersion || c.expectedSourceVersion !== s.sourceVersion ||
    c.expectedConfigurationVersion !== s.configurationVersion || ['sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'].some(k => loaded[k as keyof PublishWarningReviewRecord] !== s.authority[k as keyof PublishWarningSnapshot['authority']]) ||
    Temporal.Instant.compare(loaded.reviewedAt, s.now) > 0) return deny('REVIEW_CHANGED');
  if (loaded.state === 'CANCELLED') return deny('REVIEW_CLOSED');
  if (Temporal.Instant.compare(loaded.expiresAt, s.now) <= 0) return deny('REVIEW_EXPIRED');
  if (c.choice === 'RETURN_TO_REVIEW') return { state: 'RETURN_TO_REVIEW' };
  if (current.warnings.length && c.choice !== 'PUBLISH_WITH_WARNINGS') return deny('WARNING_ACKNOWLEDGEMENT_REQUIRED');
  if (!current.warnings.length && c.choice !== 'PUBLISH') return deny('CHOICE_MISMATCH');
  return { state: 'ALLOW_NEW', namespace: { ...s.namespace }, selection: { ...s.selection }, reviewId: s.reviewId,
    reviewFingerprint: current.fingerprint, sourceVersion: current.sourceVersion, configurationVersion: current.configurationVersion, payloadDigest, reason };
}
/** Integrator must atomically bind review consumption, tenant/actor/purpose/op
 * identity and digest, canonical revision/calendar/outbox and F5 safe receipt.
 * This function owns no storage, retry loop, reader, writer or provider effect. */
export function evaluatePublishWarningPolicy(value: unknown): PublishWarningDecision {
  try { return evaluate(value); } catch { return deny('INVALID_INPUT'); }
}
