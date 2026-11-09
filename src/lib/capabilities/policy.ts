import { types as nodeTypes } from 'node:util';
import { CAPABILITIES, CAPABILITY_FIELDS } from './types';
import type { UserRole } from '../domain';
import type { AdministrativeScope, Capability, CapabilityDecision, CapabilityDenial, CapabilityField, CapabilityInput } from './types';

type Rule = { roles: readonly UserRole[]; variant: 'MANAGEMENT' | 'SELF' | 'TEAM' | 'TENANT'; grant?: boolean; wholeSubject?: boolean };
const MANAGEMENT: readonly UserRole[] = ['OWNER', 'MANAGER'];
const SELF: readonly UserRole[] = ['EMPLOYEE', 'LEAD'];
const ALL: readonly UserRole[] = ['OWNER', 'MANAGER', 'EMPLOYEE', 'LEAD'];
const management: Rule = { roles: MANAGEMENT, variant: 'MANAGEMENT', grant: true };
const wholeSubject: Rule = { ...management, wholeSubject: true };
const self: Rule = { roles: SELF, variant: 'SELF' };
const own: Rule = { roles: ALL, variant: 'SELF' };
const owner: Rule = { roles: ['OWNER'], variant: 'TENANT' };
const RULES = {
  'management.home.read': { roles: MANAGEMENT, variant: 'SELF' },
  'management.own-workforce': { roles: MANAGEMENT, variant: 'SELF' },
  'self.schedule.read': self, 'self.workforce.manage': self, 'self.time.read': self, 'self.time.request': self,
  'profile.self.read': own, 'security.self.manage': own,
  'employee.roster.read': management, 'employee.create': management, 'employee.role.edit': wholeSubject,
  'employee.core.edit': wholeSubject, 'employee.eligibility.edit': management, 'employee.positions.edit': wholeSubject,
  'employee.deactivate': wholeSubject, 'employee.restore': wholeSubject,
  'authority.grant': owner, 'workspace.edit': owner, 'workspace.suspend': owner,
  'workspace.restore': { roles: [], variant: 'TENANT' }, 'catalog.read': management, 'catalog.manage': owner,
  'configuration.scheduling.manage': management, 'schedule.draft.read': management, 'schedule.readiness.read': management,
  'schedule.assign': management, 'schedule.generate': management, 'schedule.publish': management, 'schedule.restore': management,
  'request.review': management, 'attendance.read': wholeSubject, 'correction.review': wholeSubject,
  'timecard.read': wholeSubject, 'timecard.approve': wholeSubject, 'timecard.finalize': wholeSubject, 'timecard.reopen': wholeSubject,
  'report.read': management, 'report.export': management, 'payroll.read': management, 'payroll.export': management,
  'action-center.read': management,
  'communication.team.author': { roles: ALL, variant: 'TEAM', grant: true },
  'communication.management.author': management, 'communication.revise': management,
  'communication.withdraw': { roles: ALL, variant: 'TEAM', grant: true }, 'communication.require-ack': management,
  'communication.recipient-receipts.read': management, 'communication.own-receipt.read': own,
  'communication.sent-summary.read': own,
  'calendar.self.issue': self, 'calendar.self.rotate': self, 'calendar.self.revoke': self, 'calendar.self.read': self,
  'calendar.employee.revoke': wholeSubject,
  'clocker.device.manage': owner, 'clocker.pin.support': wholeSubject, 'clocker.pin.self': self,
  'audit.read': management, 'audit.self.read': self,
  'onboarding.configure': owner, 'onboarding.finish': owner,
  'csv.preview': owner, 'csv.commit': owner, 'csv.receipt': owner, 'csv.replay': owner, 'csv.reverse': owner,
  'portal.identity.verify': wholeSubject,
} satisfies Record<Capability, Rule>;

// Detached canonical role/grant ceiling metadata, never an installed policy,
// current source, effective grant, operation permission or tenant proof.
// Every real operation still passes the existing evaluateCapability contract.
export const CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS = Object.freeze(
  CAPABILITIES.map(capability => {
    const rule: Rule = RULES[capability];
    return Object.freeze({ capability, roles: Object.freeze([...rule.roles]),
      variant: rule.variant, requiresExplicitManagerGrant: rule.grant === true,
      wholeSubject: rule.wholeSubject === true });
  }),
);

const HISTORY = new Set<Capability>(['employee.roster.read', 'catalog.read', 'self.schedule.read', 'self.time.read',
  'timecard.read', 'report.read', 'report.export', 'payroll.read', 'payroll.export', 'audit.read', 'audit.self.read',
  'csv.receipt', 'csv.replay']);
const RESTORE = new Set<Capability>(['employee.restore', 'catalog.manage']);
const REVIEWS = new Set<Capability>(['correction.review', 'timecard.approve', 'timecard.finalize', 'timecard.reopen']);
const SECRET_FIELDS = new Set<CapabilityField>(['secret.password', 'secret.pin', 'secret.bearer', 'verification.attestation']);
const CONTACT_CAPABILITIES = new Set<Capability>(['profile.self.read', 'employee.roster.read', 'employee.create', 'employee.core.edit', 'csv.preview', 'csv.commit']);
const capabilities = new Set<string>(CAPABILITIES);
const fields = new Set<string>(CAPABILITY_FIELDS);
const object = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
// Persisted text keys retain exact bytes. New locator/number syntax is enforced
// by its own identity contract; this policy must not trim or re-key old rows.
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !/[\u0000-\u001f\u007f]/.test(v);
const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every(text) && new Set(v).size === v.length;
const enumValue = (v: unknown, values: readonly string[]) => typeof v === 'string' && values.includes(v);
const role = (v: unknown): v is UserRole => enumValue(v, ALL);
const portal = (v: unknown) => enumValue(v, ['DISABLED', 'PROOF_PENDING', 'ENABLED', 'SUSPENDED']);
const caps = (v: unknown): v is Capability[] => strings(v) && v.every(c => capabilities.has(c));
const fieldList = (v: unknown): v is CapabilityField[] => strings(v) && v.every(f => fields.has(f));
/** Accept inert observations before reading properties or iterating arrays.
 * These finite traversal bounds protect the parser; they do not define owner
 * performance, record-size or operational limits. No value becomes authority. */
function plainObservation(value: unknown): boolean {
  const seen = new Set<object>(); let remaining = 100_000;
  function visit(v: unknown, depth: number): boolean {
    if (--remaining < 0 || depth > 40) return false;
    if (v === null || v === undefined || typeof v === 'string' || typeof v === 'boolean') return true;
    if (typeof v === 'number') return Number.isFinite(v);
    if (typeof v !== 'object' || nodeTypes.isProxy(v) || seen.has(v)) return false;
    const prototype = Object.getPrototypeOf(v), descriptors = Object.getOwnPropertyDescriptors(v);
    seen.add(v);
    if (Array.isArray(v)) {
      const lengthDescriptor = Object.hasOwn(descriptors, 'length') ? descriptors.length : undefined;
      if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')) return false;
      const length: unknown = lengthDescriptor.value;
      if (prototype !== Array.prototype || typeof length !== 'number' || !Number.isSafeInteger(length) || length < 0 ||
        Reflect.ownKeys(descriptors).length !== length + 1) return false;
      for (let index = 0; index < length; index++) {
        const key = String(index), d = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
        if (!d || !Object.hasOwn(d, 'value') || !d.enumerable || !visit(d.value, depth + 1)) return false;
      }
    } else {
      if (prototype !== Object.prototype && prototype !== null) return false;
      for (const key of Reflect.ownKeys(descriptors)) {
        if (typeof key !== 'string') return false;
        const d = descriptors[key];
        if (!Object.hasOwn(d, 'value') || !d.enumerable || !visit(d.value, depth + 1)) return false;
      }
    }
    seen.delete(v); return true;
  }
  return visit(value, 0);
}
function scope(v: unknown): boolean {
  return v === null || object(v) && (v.kind === 'ALL_TENANT' && enumValue(v.origin, ['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT']) ||
    v.kind === 'LOCATIONS' && v.origin === 'EXPLICIT_GRANT' && strings(v.locationIds));
}
function valid(v: unknown): v is CapabilityInput {
  if (!object(v) || typeof v.capability !== 'string' || !capabilities.has(v.capability) || !enumValue(v.mode, ['READ', 'MUTATE', 'COUNT', 'EXPORT', 'PREVIEW', 'RECEIPT', 'OPEN', 'RECOVER_OPERATION']) ||
    !enumValue(v.phase, ['CURRENT', 'HISTORY', 'RESTORE']) || !fieldList(v.requestedFields) || !strings(v.affectedLocationIds) ||
    !object(v.actor) || !text(v.actor.id) || !text(v.actor.workspaceId) || !role(v.actor.role) || typeof v.actor.workforceActive !== 'boolean' ||
    !portal(v.actor.portalState) || !scope(v.actor.administrativeScope) || !caps(v.actor.effectiveAdministrativeCapabilities) ||
    !object(v.workspace) || !text(v.workspace.id) || typeof v.workspace.active !== 'boolean' ||
    !object(v.authority) || ['membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'capturedSelfChange'].some(k => typeof (v.authority as Record<string, unknown>)[k] !== 'boolean') ||
    !object(v.source) || !text(v.source.workspaceId) || ['current', 'footprintComplete', 'canonicalAllowed'].some(k => typeof (v.source as Record<string, unknown>)[k] !== 'boolean') ||
    !fieldList(v.source.permittedFields) || !Array.isArray(v.source.locations) ||
    !v.source.locations.every(l => object(l) && text(l.id) && text(l.workspaceId) && typeof l.active === 'boolean') ||
    new Set(v.source.locations.map(l => l.id)).size !== v.source.locations.length) return false;
  const s = v.source.subject;
  if (s !== undefined && (!object(s) || !text(s.id) || !text(s.workspaceId) || !role(s.role) || typeof s.workforceActive !== 'boolean' ||
    !portal(s.portalState) || typeof s.identityVerified !== 'boolean' || !strings(s.locationIds) ||
    s.administrativeScope !== undefined && !scope(s.administrativeScope) || s.effectiveAdministrativeCapabilities !== undefined && !caps(s.effectiveAdministrativeCapabilities))) return false;
  if (v.source.resourceOwnerEmployeeId !== undefined && !text(v.source.resourceOwnerEmployeeId)) return false;
  const t = v.source.team;
  if (t !== undefined && (!object(t) || typeof t.current !== 'boolean' || typeof t.participant !== 'boolean' ||
    !enumValue(t.type, ['TODAYS_TEAM', 'LOCATION_ANNOUNCEMENT', 'OPERATIONAL_UPDATE', 'SHIFT_NOTE']) || !text(t.authorEmployeeId))) return false;
  const r = v.source.review;
  if (r !== undefined && (!object(r) || typeof r.requiresSecondReviewer !== 'boolean' || !(r.previousReviewerId === null || text(r.previousReviewerId)))) return false;
  const o = v.source.ownerChange;
  if (o !== undefined && (!object(o) || typeof o.current !== 'boolean' || !Number.isSafeInteger(o.usableOwnersRemaining) || Number(o.usableOwnersRemaining) < 0)) return false;
  const g = v.roleGrant;
  if (g !== undefined && (!object(g) || !role(g.role) || !caps(g.administrativeCapabilities) || !scope(g.administrativeScope))) return false;
  if (v.membershipChange !== undefined && (!object(v.membershipChange) || !strings(v.membershipChange.nextLocationIds))) return false;
  if (v.batchRoles !== undefined && (!Array.isArray(v.batchRoles) || !v.batchRoles.every(role))) return false;
  return true;
}
const denied = (reason: CapabilityDenial): CapabilityDecision => ({ allowed: false, reason });
const covers = (s: AdministrativeScope, ids: readonly string[]) => s.kind === 'ALL_TENANT' || ids.every(id => s.locationIds.includes(id));
const coversScope = (actor: AdministrativeScope, target: AdministrativeScope) => actor.kind === 'ALL_TENANT' ||
  target.kind === 'LOCATIONS' && covers(actor, target.locationIds);
function administrativeGrantAllowed(actor: CapabilityInput['actor'], grants: readonly Capability[]) {
  return grants.every(c => {
    const r: Rule = RULES[c];
    return r.roles.includes('MANAGER') && r.variant !== 'SELF' && actor.effectiveAdministrativeCapabilities.includes(c);
  });
}
/** Field families are a ceiling, not a substitute for the canonical source's
 * narrower permittedFields. Separate capabilities are evaluated separately. */
function policyFields(capability: Capability): readonly CapabilityField[] {
  switch (capability) {
    case 'profile.self.read': case 'employee.roster.read': case 'employee.create':
      return ['employee.identity', 'employee.contact', 'employee.role', 'employee.eligibility', 'employee.positions'];
    case 'employee.core.edit': return ['employee.identity', 'employee.contact'];
    case 'employee.role.edit': case 'authority.grant':
      return ['employee.identity', 'employee.role', 'configuration'];
    case 'employee.eligibility.edit': case 'employee.positions.edit': case 'employee.deactivate': case 'employee.restore':
      return ['employee.identity', 'employee.role', 'employee.eligibility', 'employee.positions'];
    case 'management.home.read': case 'action-center.read':
      return ['employee.identity', 'schedule', 'readiness', 'generation', 'request', 'attendance', 'timecard'];
    case 'management.own-workforce': case 'self.workforce.manage':
      return ['employee.identity', 'schedule', 'request', 'attendance', 'timecard'];
    case 'self.schedule.read': return ['employee.identity', 'schedule'];
    case 'self.time.read': case 'self.time.request': case 'attendance.read': case 'correction.review':
    case 'timecard.read': case 'timecard.approve': case 'timecard.finalize': case 'timecard.reopen':
      return ['employee.identity', 'attendance', 'timecard', 'request'];
    case 'schedule.draft.read': case 'schedule.readiness.read': case 'schedule.assign':
    case 'schedule.generate': case 'schedule.publish': case 'schedule.restore':
      return ['employee.identity', 'schedule', 'readiness', 'generation'];
    case 'request.review': return ['employee.identity', 'schedule', 'request'];
    case 'report.read': case 'report.export': return ['employee.identity', 'schedule', 'attendance', 'timecard'];
    case 'payroll.read': case 'payroll.export': return ['employee.identity', 'payroll', 'attendance', 'timecard'];
    case 'communication.team.author': case 'communication.management.author': case 'communication.revise':
    case 'communication.withdraw': case 'communication.require-ack':
      return ['employee.identity', 'communication.body', 'communication.sentSummary'];
    case 'communication.recipient-receipts.read':
      return ['employee.identity', 'communication.recipientReceipts', 'communication.ownReceipt', 'communication.sentSummary'];
    case 'communication.own-receipt.read': return ['employee.identity', 'communication.body', 'communication.ownReceipt'];
    case 'communication.sent-summary.read': return ['employee.identity', 'communication.body', 'communication.sentSummary'];
    case 'calendar.self.issue': case 'calendar.self.rotate': case 'calendar.self.revoke': case 'calendar.self.read':
      return ['employee.identity', 'calendar.url'];
    case 'audit.read': case 'audit.self.read':
      return ['employee.identity', 'audit.metadata', 'audit.source', 'schedule', 'request', 'attendance', 'timecard', 'communication.ownReceipt'];
    case 'csv.preview': case 'csv.commit':
      return ['employee.identity', 'employee.contact', 'employee.role', 'employee.eligibility', 'employee.positions', 'csv.contacts'];
    case 'csv.receipt': case 'csv.replay': case 'csv.reverse':
      return ['employee.identity', 'employee.role', 'employee.eligibility', 'audit.metadata'];
    case 'workspace.edit': case 'workspace.suspend': case 'catalog.read': case 'catalog.manage':
    case 'configuration.scheduling.manage': case 'clocker.device.manage': case 'onboarding.configure': case 'onboarding.finish':
      return ['employee.identity', 'configuration'];
    case 'security.self.manage': case 'clocker.pin.support': case 'clocker.pin.self': case 'calendar.employee.revoke':
      return ['employee.identity'];
    case 'workspace.restore': return [];
    case 'portal.identity.verify': return ['employee.identity'];
  }
}

/** PURE policy preparation only. An ALLOW is not authentication or a mutation
 * proof. No route/service/SQL/UI integration until full F10 and F6 consumer QA.
 * Canonical source semantics remain mandatory; this helper cannot override them. */
export function evaluateCapability(value: unknown): CapabilityDecision {
  try { return plainObservation(value) ? evaluate(value) : denied('INVALID_INPUT'); } catch { return denied('INVALID_INPUT'); }
}
function evaluate(value: unknown): CapabilityDecision {
  if (!valid(value)) return denied('INVALID_INPUT');
  const { actor, workspace, authority, source, capability, roleGrant } = value;
  const rule: Rule = RULES[capability];
  if (actor.workspaceId !== workspace.id || source.workspaceId !== workspace.id ||
    source.subject && source.subject.workspaceId !== workspace.id || source.locations.some(l => l.workspaceId !== workspace.id)) return denied('TENANT_MISMATCH');
  if (!workspace.active || !actor.workforceActive || actor.portalState !== 'ENABLED' ||
    !authority.membershipCurrent || !authority.sessionCurrent || !authority.grantsCurrent) return denied('AUTHORITY_NOT_CURRENT');
  if (!source.current) return denied('SOURCE_NOT_CURRENT');
  if (!source.canonicalAllowed) return denied('CANONICAL_DENIED');
  if (!source.footprintComplete) return denied('FOOTPRINT_INCOMPLETE');
  if (capability === 'workspace.restore') return denied('CONTROL_PLANE_REQUIRED');
  if (!rule.roles.includes(actor.role)) return denied('ROLE_DENIED');
  const usesAdministrativeScope = actor.role === 'MANAGER' && rule.variant !== 'SELF';
  if (usesAdministrativeScope && !actor.administrativeScope) return denied('ADMIN_SCOPE_REQUIRED');

  // The approved verification action requires a deliberate current grant for
  // BOTH roles. Other Owner defaults keep their existing policy semantics.
  // These are inert observations only: protected native admission must recheck
  // the real proof, exact grant provenance, channel/procedure and claim rules.
  if (capability === 'portal.identity.verify') {
    if (value.mode !== 'MUTATE' || value.phase !== 'CURRENT') return denied('CANONICAL_DENIED');
    if (!actor.effectiveAdministrativeCapabilities.includes(capability)) return denied('CAPABILITY_NOT_GRANTED');
    if (!source.subject) return denied('FOOTPRINT_INCOMPLETE');
    if (source.subject.id === actor.id) return denied('SELF_REVIEW_DENIED');
    if (!source.subject.workforceActive) return denied('SOURCE_NOT_CURRENT');
    if (actor.role === 'MANAGER') {
      if (actor.administrativeScope!.origin !== 'EXPLICIT_GRANT') return denied('ADMIN_SCOPE_REQUIRED');
      if (source.subject.role === 'OWNER') return denied('ROLE_DENIED');
      if (source.subject.role === 'MANAGER') {
        if (!source.subject.administrativeScope || !source.subject.effectiveAdministrativeCapabilities) return denied('ADMIN_SCOPE_REQUIRED');
        if (!coversScope(actor.administrativeScope!, source.subject.administrativeScope) ||
          !administrativeGrantAllowed(actor, source.subject.effectiveAdministrativeCapabilities)) return denied('GRANT_CEILING_DENIED');
      }
    }
  }

  const locationMap = new Map(source.locations.map(l => [l.id, l]));
  if (source.subject?.locationIds.some(id => !locationMap.has(id)) ||
    source.subject?.administrativeScope?.kind === 'LOCATIONS' && source.subject.administrativeScope.locationIds.some(id => !locationMap.has(id))) return denied('LOCATION_SCOPE_DENIED');
  const affected = new Set(value.affectedLocationIds);
  if (rule.wholeSubject) {
    if (!source.subject || source.subject.locationIds.length === 0) return denied('FOOTPRINT_INCOMPLETE');
    source.subject.locationIds.forEach(id => affected.add(id));
    if (capability === 'portal.identity.verify' && source.subject.administrativeScope?.kind === 'LOCATIONS')
      source.subject.administrativeScope.locationIds.forEach(id => affected.add(id));
  }
  if (rule.variant !== 'TENANT' && affected.size === 0) return denied('FOOTPRINT_INCOMPLETE');
  if ([...affected].some(id => !locationMap.has(id))) return denied('LOCATION_SCOPE_DENIED');
  if (usesAdministrativeScope && !covers(actor.administrativeScope!, [...affected])) return denied('LOCATION_SCOPE_DENIED');
  const permitsInactive = value.phase === 'HISTORY' && HISTORY.has(capability) || value.phase === 'RESTORE' && RESTORE.has(capability);
  if (!permitsInactive && [...affected].some(id => !locationMap.get(id)!.active)) return denied('LOCATION_INACTIVE');

  if (actor.role === 'MANAGER' && rule.grant && !actor.effectiveAdministrativeCapabilities.includes(capability)) return denied('CAPABILITY_NOT_GRANTED');
  if (actor.role === 'MANAGER' && value.mode === 'EXPORT' && !actor.effectiveAdministrativeCapabilities.includes(capability.startsWith('payroll.') ? 'payroll.export' : 'report.export')) return denied('CAPABILITY_NOT_GRANTED');
  if (rule.variant === 'SELF' && (!source.subject || source.subject.id !== actor.id ||
    source.resourceOwnerEmployeeId !== undefined && source.resourceOwnerEmployeeId !== actor.id)) return denied('SELF_SCOPE_DENIED');
  if (rule.variant === 'SELF' && (source.subject!.role !== actor.role ||
    source.subject!.workforceActive !== actor.workforceActive || source.subject!.portalState !== actor.portalState)) return denied('SOURCE_NOT_CURRENT');
  if (capability === 'communication.sent-summary.read' && (!source.team || source.team.authorEmployeeId !== actor.id)) return denied('SELF_SCOPE_DENIED');

  if (capability === 'communication.team.author' || capability === 'communication.withdraw') {
    const team = source.team;
    if (!team || !team.current) return denied('TEAM_SCOPE_DENIED');
    if (SELF.includes(actor.role)) {
      if (team.type !== 'TODAYS_TEAM') return denied('ROLE_DENIED');
      if (!team.participant) return denied('TEAM_SCOPE_DENIED');
      if (capability === 'communication.withdraw' && team.authorEmployeeId !== actor.id) return denied('SELF_SCOPE_DENIED');
    }
  }
  const employeeMutation = capability.startsWith('employee.') && capability !== 'employee.roster.read';
  if (employeeMutation && actor.role === 'MANAGER' && (roleGrant?.role === 'OWNER' || source.subject?.role === 'OWNER')) return denied('ROLE_DENIED');
  if (employeeMutation && capability !== 'employee.create' && actor.role === 'MANAGER' && source.subject?.role === 'MANAGER') {
    if (!source.subject.administrativeScope || !source.subject.effectiveAdministrativeCapabilities) return denied('ADMIN_SCOPE_REQUIRED');
    if (!coversScope(actor.administrativeScope!, source.subject.administrativeScope) ||
      !administrativeGrantAllowed(actor, source.subject.effectiveAdministrativeCapabilities)) return denied('GRANT_CEILING_DENIED');
  }
  if (capability === 'employee.create' || capability === 'employee.role.edit') {
    if (!roleGrant) return denied('GRANT_CEILING_DENIED');
    if (roleGrant.role === 'MANAGER') {
      if (!roleGrant.administrativeScope) return denied('ADMIN_SCOPE_REQUIRED');
      if (roleGrant.administrativeScope.origin === 'LEGACY_COMPATIBILITY' && (capability === 'employee.create' ||
        source.subject?.role !== 'MANAGER' || source.subject.administrativeScope?.origin !== 'LEGACY_COMPATIBILITY')) return denied('GRANT_CEILING_DENIED');
      if (roleGrant.administrativeScope.kind === 'LOCATIONS' && roleGrant.administrativeScope.locationIds.some(id => !locationMap.has(id))) return denied('GRANT_CEILING_DENIED');
    } else if (roleGrant.role !== 'OWNER' && (roleGrant.administrativeCapabilities.length !== 0 || roleGrant.administrativeScope !== null)) return denied('GRANT_CEILING_DENIED');
    if (actor.role === 'MANAGER') {
      if (!administrativeGrantAllowed(actor, roleGrant.administrativeCapabilities) ||
        roleGrant.administrativeScope && !coversScope(actor.administrativeScope!, roleGrant.administrativeScope)) return denied('GRANT_CEILING_DENIED');
    }
    if (capability === 'employee.role.edit' && roleGrant.role === 'OWNER' && source.subject?.role !== 'OWNER' && (!source.subject?.identityVerified ||
      !source.subject.workforceActive || source.subject.portalState !== 'ENABLED')) return denied('OWNER_SUCCESSION_DENIED');
  }
  if (capability === 'employee.eligibility.edit') {
    if (!source.subject || !value.membershipChange) return denied('FOOTPRINT_INCOMPLETE');
    const before = source.subject.locationIds, after = value.membershipChange.nextLocationIds;
    if ([...before, ...after].some(id => !locationMap.has(id))) return denied('LOCATION_SCOPE_DENIED');
    const changed = [...new Set([...before, ...after])].filter(id => before.includes(id) !== after.includes(id));
    if (changed.some(id => !affected.has(id)) || actor.role === 'MANAGER' && !covers(actor.administrativeScope!, changed)) return denied('LOCATION_SCOPE_DENIED');
    if (after.some(id => !before.includes(id) && !locationMap.get(id)!.active)) return denied('LOCATION_INACTIVE');
  }
  if (REVIEWS.has(capability)) {
    if (!source.subject || !source.review) return denied('FOOTPRINT_INCOMPLETE');
    if (source.subject.id === actor.id) return denied('SELF_REVIEW_DENIED');
    if (source.review.requiresSecondReviewer && (!source.review.previousReviewerId || source.review.previousReviewerId === actor.id)) return denied('SECOND_REVIEWER_REQUIRED');
  }
  const removesOwner = source.subject?.role === 'OWNER' && (capability === 'employee.deactivate' ||
    capability === 'employee.role.edit' && roleGrant?.role !== 'OWNER');
  if (removesOwner && (!source.ownerChange?.current || source.ownerChange.usableOwnersRemaining < 1)) return denied('OWNER_SUCCESSION_DENIED');
  if ((capability === 'employee.deactivate' || capability === 'employee.role.edit' || capability === 'authority.grant') &&
    source.subject?.id === actor.id && !authority.capturedSelfChange) return denied('SELF_CHANGE_NOT_CAPTURED');
  if ((capability === 'csv.preview' || capability === 'csv.commit') && (!value.batchRoles?.length || value.batchRoles.some(r => !SELF.includes(r)))) return denied('BULK_ROLE_DENIED');

  const requested = value.requestedFields;
  const familyFields = policyFields(capability);
  if (requested.some(f => !familyFields.includes(f) || !source.permittedFields.includes(f) || SECRET_FIELDS.has(f) ||
    f === 'calendar.url' && !capability.startsWith('calendar.self.') ||
    f === 'employee.contact' && !CONTACT_CAPABILITIES.has(capability) ||
    f === 'csv.contacts' && capability !== 'csv.preview' && capability !== 'csv.commit' ||
    f === 'communication.recipientReceipts' && capability !== 'communication.recipient-receipts.read' ||
    capability.startsWith('audit.') && (f === 'communication.body' || f === 'communication.recipientReceipts' || f === 'employee.contact' || f === 'csv.contacts'))) return denied('FIELD_DENIED');
  return { allowed: true, reason: 'POLICY_ALLOWED', capability,
    scope: { workspaceId: workspace.id, locationIds: [...affected].sort(), fields: [...requested],
      roleVariant: rule.variant === 'SELF' && MANAGEMENT.includes(actor.role) && capability.startsWith('management.') ? 'MANAGEMENT' : rule.variant,
      phase: value.phase, mode: value.mode } };
}
