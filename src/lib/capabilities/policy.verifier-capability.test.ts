import { describe, expect, it } from 'vitest';
import { CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS, evaluateCapability } from './policy';
import { CAPABILITIES } from './types';
import type { CapabilityDenial, CapabilityInput } from './types';
import type { UserRole } from '../domain';

// Pure current policy observations, never a PortalProof or native grant.
// The real protected verifier must independently authenticate every observation,
// channel/procedure, source revision, claim/budget and control-plane purpose.
function input(role: UserRole = 'MANAGER'): CapabilityInput {
  return {
    capability: 'portal.identity.verify', mode: 'MUTATE', phase: 'CURRENT',
    requestedFields: ['employee.identity'], affectedLocationIds: ['loc-a'],
    actor: { id: 'verifier-a', workspaceId: 'tenant-a', role, workforceActive: true,
      portalState: 'ENABLED', administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] },
      effectiveAdministrativeCapabilities: ['portal.identity.verify'] },
    workspace: { id: 'tenant-a', active: true },
    authority: { membershipCurrent: true, sessionCurrent: true, grantsCurrent: true, capturedSelfChange: false },
    source: { workspaceId: 'tenant-a', current: true, footprintComplete: true, canonicalAllowed: true,
      permittedFields: ['employee.identity'],
      locations: [{ id: 'loc-a', workspaceId: 'tenant-a', active: true },
        { id: 'loc-b', workspaceId: 'tenant-a', active: true }],
      subject: { id: 'subject-a', workspaceId: 'tenant-a', role: 'EMPLOYEE', workforceActive: true,
        portalState: 'DISABLED', identityVerified: false, locationIds: ['loc-a'] },
    },
  };
}
function denial(value: unknown, reason: CapabilityDenial) {
  expect(evaluateCapability(value)).toEqual({ allowed: false, reason });
}
function allowed(value: CapabilityInput) {
  const decision = evaluateCapability(value);
  expect(decision).toMatchObject({ allowed: true, reason: 'POLICY_ALLOWED', capability: 'portal.identity.verify' });
  if (!decision.allowed) throw Error('Expected the approved pure verifier policy outcome');
  return decision;
}

describe('approved portal.identity.verify policy observations', () => {
  it('adds exactly one action with detached closed canonical metadata', () => {
    expect(CAPABILITIES.filter(capability => capability === 'portal.identity.verify')).toEqual(['portal.identity.verify']);
    const row = CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.find(item => item.capability === 'portal.identity.verify');
    expect(row).toEqual({ capability: 'portal.identity.verify', roles: ['OWNER', 'MANAGER'],
      variant: 'MANAGEMENT', requiresExplicitManagerGrant: true, wholeSubject: true });
    expect(Object.isFrozen(row)).toBe(true);
    expect(Object.isFrozen(row?.roles)).toBe(true);
    // The existing metadata shape says nothing that authenticates Owner grants.
    denial(row, 'INVALID_INPUT');
    denial({ authorityCurrent: true, capability: 'portal.identity.verify' }, 'INVALID_INPUT');
  });
  it.each(['OWNER', 'MANAGER'] as const)('%s needs the explicit current action grant', role => {
    const value = input(role); value.actor.effectiveAdministrativeCapabilities = [];
    denial(value, 'CAPABILITY_NOT_GRANTED');
    value.actor.effectiveAdministrativeCapabilities = ['employee.create', 'employee.core.edit'];
    denial(value, 'CAPABILITY_NOT_GRANTED');
  });
  it.each(['LEAD', 'EMPLOYEE'] as const)('%s cannot become a verifier by receiving an action string', role => {
    denial(input(role), 'ROLE_DENIED');
  });
  it.each(['OWNER', 'MANAGER'] as const)('%s may evaluate another active unverified employment only with all gates observed', role => {
    const value = input(role);
    expect(allowed(value).scope).toEqual({ workspaceId: 'tenant-a', locationIds: ['loc-a'],
      fields: ['employee.identity'], roleVariant: 'MANAGEMENT', phase: 'CURRENT', mode: 'MUTATE' });
    expect(value.source.subject?.portalState).toBe('DISABLED');
    expect(value.source.subject?.identityVerified).toBe(false);
  });
  it('Owner may verify another Owner within T while its stored finite scope does not restrict Owner T', () => {
    const value = input('OWNER'); value.source.subject!.role = 'OWNER';
    value.source.subject!.locationIds = ['loc-b', 'loc-a'];
    expect(allowed(value).scope.locationIds).toEqual(['loc-a', 'loc-b']);
  });
  it('Owner still needs an explicit grant with a null administrative scope', () => {
    const value = input('OWNER'); value.actor.administrativeScope = null;
    allowed(value); value.actor.effectiveAdministrativeCapabilities = [];
    denial(value, 'CAPABILITY_NOT_GRANTED');
  });
  it('Manager cannot verify Owner even with a current grant and tenant-wide M', () => {
    const value = input(); value.actor.administrativeScope = { kind: 'ALL_TENANT', origin: 'EXPLICIT_GRANT' };
    value.source.subject!.role = 'OWNER'; denial(value, 'ROLE_DENIED');
  });
  it.each(['OWNER', 'MANAGER'] as const)('%s cannot self-verify even through captured-self-change metadata', role => {
    const value = input(role); value.source.subject!.id = value.actor.id;
    value.source.subject!.role = role; value.authority.capturedSelfChange = true;
    denial(value, 'SELF_REVIEW_DENIED');
  });
  it.each(['membershipCurrent', 'sessionCurrent', 'grantsCurrent'] as const)('rejects stale %s for Owner too', field => {
    const value = input('OWNER'); value.authority[field] = false;
    denial(value, 'AUTHORITY_NOT_CURRENT');
  });
  it('does not permit verification in an inactive tenant or by inactive employment', () => {
    const tenant = input('OWNER'); tenant.workspace.active = false; denial(tenant, 'AUTHORITY_NOT_CURRENT');
    const actor = input('OWNER'); actor.actor.workforceActive = false; denial(actor, 'AUTHORITY_NOT_CURRENT');
  });
  it.each(['DISABLED', 'PROOF_PENDING', 'SUSPENDED'] as const)('does not invent a PortalProof for a %s verifier', state => {
    const value = input('OWNER'); value.actor.portalState = state; denial(value, 'AUTHORITY_NOT_CURRENT');
  });
  it('requires a current source, complete footprint and canonical operation eligibility', () => {
    const stale = input(); stale.source.current = false; denial(stale, 'SOURCE_NOT_CURRENT');
    const partial = input(); partial.source.footprintComplete = false; denial(partial, 'FOOTPRINT_INCOMPLETE');
    const canonical = input(); canonical.source.canonicalAllowed = false; denial(canonical, 'CANONICAL_DENIED');
  });
  it('requires the target employment and refuses inactive employment without restoring it', () => {
    const missing = input(); delete missing.source.subject; denial(missing, 'FOOTPRINT_INCOMPLETE');
    const inactive = input(); inactive.source.subject!.workforceActive = false; denial(inactive, 'SOURCE_NOT_CURRENT');
  });
  it.each(['actor', 'source', 'subject', 'location'] as const)('rejects a foreign %s before returning source fields', target => {
    const value = input('OWNER');
    if (target === 'actor') value.actor.workspaceId = 'tenant-b';
    if (target === 'source') value.source.workspaceId = 'tenant-b';
    if (target === 'subject') value.source.subject!.workspaceId = 'tenant-b';
    if (target === 'location') value.source.locations[0].workspaceId = 'tenant-b';
    denial(value, 'TENANT_MISMATCH');
  });
  it('requires explicit Manager M rather than deriving it from the target roster', () => {
    const value = input(); value.actor.administrativeScope = null; denial(value, 'ADMIN_SCOPE_REQUIRED');
  });
  it('cannot silently omit an outside-M target membership from affected locations', () => {
    const value = input(); value.source.subject!.locationIds = ['loc-a', 'loc-b'];
    expect(value.affectedLocationIds).toEqual(['loc-a']); denial(value, 'LOCATION_SCOPE_DENIED');
  });
  it('requires every affected location to be in the complete observed tenant source', () => {
    const value = input('OWNER'); value.source.subject!.locationIds = ['missing-location'];
    denial(value, 'LOCATION_SCOPE_DENIED');
  });
  it('current verification cannot use an inactive location through history authority', () => {
    const value = input(); value.source.locations[0].active = false; denial(value, 'LOCATION_INACTIVE');
  });
  it('a Manager target requires the full current administrative scope and capability ceiling', () => {
    const value = input(); value.source.subject!.role = 'MANAGER';
    denial(value, 'ADMIN_SCOPE_REQUIRED');
    value.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a'] };
    value.source.subject!.effectiveAdministrativeCapabilities = ['portal.identity.verify'];
    allowed(value);
    value.source.subject!.effectiveAdministrativeCapabilities = ['employee.core.edit'];
    denial(value, 'GRANT_CEILING_DENIED');
  });
  it('finite Manager M cannot verify another Manager with ALL_TENANT authority', () => {
    const value = input(); value.source.subject!.role = 'MANAGER';
    value.source.subject!.administrativeScope = { kind: 'ALL_TENANT', origin: 'EXPLICIT_GRANT' };
    value.source.subject!.effectiveAdministrativeCapabilities = [];
    denial(value, 'GRANT_CEILING_DENIED');
  });
  it('target administrative locations remain part of the whole affected footprint', () => {
    const value = input(); value.source.subject!.role = 'MANAGER';
    value.source.subject!.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-b'] };
    value.source.subject!.effectiveAdministrativeCapabilities = [];
    denial(value, 'GRANT_CEILING_DENIED');
    value.actor.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['loc-a', 'loc-b'] };
    expect(allowed(value).scope.locationIds).toEqual(['loc-a', 'loc-b']);
  });
  it('legacy ALL_TENANT scope does not invent a verifier grant', () => {
    const value = input(); value.actor.administrativeScope = { kind: 'ALL_TENANT', origin: 'LEGACY_COMPATIBILITY' };
    value.actor.effectiveAdministrativeCapabilities = []; denial(value, 'CAPABILITY_NOT_GRANTED');
    value.actor.effectiveAdministrativeCapabilities = ['portal.identity.verify'];
    denial(value, 'ADMIN_SCOPE_REQUIRED'); // The approved action also requires explicit M provenance.
  });
  it('an explicitly granted ALL_TENANT M covers the current full footprint', () => {
    const value = input(); value.actor.administrativeScope = { kind: 'ALL_TENANT', origin: 'EXPLICIT_GRANT' };
    allowed(value);
  });
  it.each(['READ', 'COUNT', 'EXPORT', 'PREVIEW', 'RECEIPT', 'OPEN', 'RECOVER_OPERATION'] as const)('does not turn verification into a %s data capability', mode => {
    const value = input('OWNER'); value.mode = mode; denial(value, 'CANONICAL_DENIED');
  });
  it.each(['HISTORY', 'RESTORE'] as const)('does not use %s to replace the current protected operation', phase => {
    const value = input('OWNER'); value.phase = phase; denial(value, 'CANONICAL_DENIED');
  });
  it.each(['verification.attestation', 'secret.password', 'secret.pin', 'secret.bearer', 'employee.contact', 'configuration'] as const)('does not expose protected field %s through verification', field => {
    const value = input('OWNER'); value.requestedFields = [field]; value.source.permittedFields = [field];
    denial(value, 'FIELD_DENIED');
  });
  it('preserves existing Owner defaults and Manager grant checks for unrelated actions', () => {
    const owner = input('OWNER'); owner.capability = 'employee.core.edit'; owner.mode = 'READ';
    owner.actor.effectiveAdministrativeCapabilities = [];
    expect(evaluateCapability(owner).allowed).toBe(true);
    const manager = input(); manager.capability = 'employee.core.edit'; manager.mode = 'READ';
    manager.actor.effectiveAdministrativeCapabilities = [];
    denial(manager, 'CAPABILITY_NOT_GRANTED');
  });
  it('retains exact persisted keys and detached permitted output', () => {
    const value = input('OWNER'); const key = ' location-' + 'x'.repeat(300) + ' ';
    value.source.locations[0].id = key; value.affectedLocationIds = [key];
    value.source.subject!.locationIds = [key];
    const decision = allowed(value); expect(decision.scope.locationIds).toEqual([key]);
    value.affectedLocationIds[0] = 'changed'; value.source.subject!.locationIds[0] = 'changed';
    value.requestedFields.length = 0;
    expect(decision.scope.locationIds).toEqual([key]); expect(decision.scope.fields).toEqual(['employee.identity']);
  });
  it('rejects transparent Proxy observations without invoking traps', () => {
    const value = input(); let traps = 0;
    value.actor = new Proxy(value.actor, { get() { traps++; throw Error('must not read'); },
      getPrototypeOf() { traps++; throw Error('must not inspect'); }, ownKeys() { traps++; throw Error('must not enumerate'); } });
    denial(value, 'INVALID_INPUT'); expect(traps).toBe(0);
  });
  it('rejects accessors and sparse grant arrays without executing a callback', () => {
    let reads = 0;
    const actor = input(); Object.defineProperty(actor.actor, 'id', { enumerable: true, get() { reads++; return 'verifier-a'; } });
    denial(actor, 'INVALID_INPUT');
    const grants = input(); Object.defineProperty(grants.actor.effectiveAdministrativeCapabilities, '0',
      { enumerable: true, get() { reads++; return 'portal.identity.verify'; } });
    denial(grants, 'INVALID_INPUT');
    const sparse = input(); sparse.actor.effectiveAdministrativeCapabilities = new Array(1);
    denial(sparse, 'INVALID_INPUT');
    expect(reads).toBe(0);
  });
  it('does not accept an inherited descriptor value or execute the target identity getter', () => {
    const value = input(); let reads = 0;
    Object.defineProperty(value.source.subject!, 'id', { enumerable: true, get() { reads++; return 'subject-a'; } });
    const previous = Object.getOwnPropertyDescriptor(Object.prototype, 'value');
    let result: ReturnType<typeof evaluateCapability> | undefined;
    let observedReads: number | undefined;
    try {
      Object.defineProperty(Object.prototype, 'value', { configurable: true, value: 'subject-a' });
      result = evaluateCapability(value); observedReads = reads;
    } finally {
      delete (Object.prototype as { value?: unknown }).value;
      if (previous) Object.defineProperty(Object.prototype, 'value', previous);
    }
    expect({ result, reads: observedReads }).toEqual({ result: { allowed: false, reason: 'INVALID_INPUT' }, reads: 0 });
  });
});
