import { describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { inspectPortalSourceBinding } from './portal-source-binding';
import { getTenantProofFacts } from '../resolve.server';
import type { TenantProof } from '../types';

// Pure fictional row observations. These tests cannot certify a native caller,
// installed policy, credential, HTTP role, source freshness, grant or proof.
const hash = 'a'.repeat(64);
const at = '2026-10-09 12:00:00.123456+00';
const binding = () => ({ workspaceId: ' tenant-位置 ', employeeId: 'employee-β',
  sessionTokenHash: hash, databaseObservedAt: at });
function rows() {
  return { kind: 'PORTAL_SOURCE_OBSERVATION_V1',
    workspace: { id: binding().workspaceId, active: true, version: at },
    employee: { id: binding().employeeId, workspaceId: binding().workspaceId, active: true, role: 'MANAGER', version: at },
    credential: { employeeId: binding().employeeId, version: at, mustChangePassword: true },
    incarnation: { workspaceId: binding().workspaceId, version: '9007199254740993' },
    portal: { workspaceId: binding().workspaceId, employeeId: binding().employeeId, authorizationVersion: '9223372036854775807',
      portalAccessVersion: '9007199254740993', capabilityPolicyRevision: '19', state: 'ENABLED',
      proofProvenance: 'LEGACY_UNVERIFIED', provenanceReference: ' fictional provenance ' },
    session: { tokenHash: hash, employeeId: binding().employeeId, expiresAt: '2026-10-09 12:00:00.123457+00', createdAt: at },
    issuance: { tokenHash: hash, workspaceId: binding().workspaceId, employeeId: binding().employeeId,
      workspaceIncarnation: '9007199254740993', portalAccessVersion: '9007199254740993', sessionCreatedAt: at },
    administrative: { workspaceId: binding().workspaceId, employeeId: binding().employeeId, scopeKind: 'LOCATIONS',
      scopeOrigin: 'EXPLICIT_GRANT', provenanceReference: ' fictional grant ', capabilityPolicyRevision: '19',
      capabilities: ['profile.self.read'], locationIds: [' 位置-β ', 'location-a'] } };
}
type Rows = ReturnType<typeof rows>;
function replace(row: Rows, group: keyof Rows, key: string, value: unknown) {
  const object: unknown = row[group];
  if (!object || typeof object !== 'object') throw Error('fictional object fixture');
  Object.defineProperty(object, key, { value, enumerable: true, configurable: true, writable: true });
}
function observation(row = rows()) {
  const result = inspectPortalSourceBinding(row, binding());
  if (result.status !== 'MATCHED_OBSERVATION_NOT_AUTHORITY' && result.status !== 'SOURCE_STATE_INELIGIBLE') throw Error('fixture mismatch');
  return result;
}

describe('Portal raw source binding remains exact inert observation data', () => {
  it('preserves microseconds, padded Unicode, high int8, provenance and credential state without proof issuance', () => {
    const result = observation(); expect(result.status).toBe('MATCHED_OBSERVATION_NOT_AUTHORITY');
    expect(result.observation).toMatchObject({ databaseObservedAt: at, workspace: { id: binding().workspaceId, version: at },
      credential: { mustChangePassword: true, version: at }, incarnation: { version: '9007199254740993' },
      portal: { authorizationVersion: '9223372036854775807', proofProvenance: 'LEGACY_UNVERIFIED' },
      originalSessionExpiryUpperBound: '2026-10-09 12:00:00.123457+00' });
    expect(Object.hasOwn(result.observation, 'authorityCurrent')).toBe(false);
    expect(Object.hasOwn(result.observation, 'identityVerified')).toBe(false);
    expect(() => getTenantProofFacts(result.observation as unknown as TenantProof)).toThrow('tenant_proof_denied');
    expect(() => getTenantProofFacts(structuredClone(result.observation) as unknown as TenantProof)).toThrow('tenant_proof_denied');
  });
  it.each(['0', '-1', '-0', '01', ' 1', '1 ', '1e3', '9223372036854775808', '9'.repeat(78), 1, BigInt(1), null, undefined, new String('1')])
    ('rejects invalid native version %s without coercion', version => {
      const row = rows(); replace(row, 'portal', 'authorizationVersion', version);
      expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION');
    });
  it.each(['workspace', 'employee', 'incarnation', 'portal', 'issuance', 'administrative'] as const)
    ('rejects a foreign workspace in %s', group => {
      const row = rows(); replace(row, group, group === 'workspace' ? 'id' : 'workspaceId', 'tenant-foreign');
      expect(inspectPortalSourceBinding(row, binding()).status).toBe('SOURCE_BINDING_MISMATCH');
    });
  it.each(['employee', 'credential', 'portal', 'session', 'issuance', 'administrative'] as const)
    ('rejects a foreign employee in %s', group => {
      const row = rows(); replace(row, group, group === 'employee' ? 'id' : 'employeeId', 'employee-foreign');
      expect(inspectPortalSourceBinding(row, binding()).status).toBe('SOURCE_BINDING_MISMATCH');
    });
  it.each(['session', 'issuance'] as const)('rejects a different %s token digest', group => {
    const row = rows(); replace(row, group, 'tokenHash', 'b'.repeat(64));
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('SOURCE_BINDING_MISMATCH');
  });
  it.each(['workspaceIncarnation', 'portalAccessVersion'])('rejects stale LIVE %s', key => {
    const row = rows(); replace(row, 'issuance', key, '9007199254740992');
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('SOURCE_BINDING_MISMATCH');
  });
  it('rejects one-microsecond source creation drift', () => {
    const row = rows(); row.issuance.sessionCreatedAt = '2026-10-09 12:00:00.123455+00';
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('SOURCE_BINDING_MISMATCH');
  });
  it.each(['2026-10-09 12:00:60+00', '2026-10-09 24:00:00+00', '2026-10-09 12:60:00+00',
    '2026-02-30 12:00:00+00', '2026-10-09 12:00:00.1234567+00', '2026-10-09 12:00:00-04', '1969-12-31 23:59:59+00', 1, new Date(at)])
    ('rejects unsupported or impossible timestamp %s without repairing it', version => {
      const row = rows(); replace(row, 'credential', 'version', version);
      expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION');
    });
  it.each(['2026-10-09 12:00:00.123456+00', '2026-10-09 12:00:00.123455+00'])
    ('keeps expiry at or before the supplied database observation ineligible: %s', expiresAt => {
      const row = rows(); row.session.expiresAt = expiresAt;
      const result = observation(row); expect(result.status).toBe('SOURCE_STATE_INELIGIBLE');
      expect(result.observation.session.expiresAt).toBe(expiresAt);
    });
  it.each(['DISABLED', 'PROOF_PENDING', 'SUSPENDED'])('retains ineligible Portal state %s', state => {
    const row = rows(); row.portal.state = state;
    const result = observation(row); expect(result.status).toBe('SOURCE_STATE_INELIGIBLE'); expect(result.observation.portal.state).toBe(state);
  });
  it.each(['workspace', 'employee'] as const)('retains inactive %s source facts', group => {
    const row = rows(); row[group].active = false; const result = observation(row);
    expect(result.status).toBe('SOURCE_STATE_INELIGIBLE'); expect(result.observation[group].active).toBe(false);
  });
  it.each(['UNVERIFIED', 'LEGACY_UNVERIFIED', 'VERIFIED'])('never turns %s into identity verification', proofProvenance => {
    const row = rows(); row.portal.proofProvenance = proofProvenance; row.credential.mustChangePassword = false;
    const result = observation(row); expect(result.observation.portal.proofProvenance).toBe(proofProvenance);
    expect(result.observation.credential.mustChangePassword).toBe(false);
    expect(() => getTenantProofFacts(result.observation as unknown as TenantProof)).toThrow('tenant_proof_denied');
  });
  it.each(['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT'])('preserves explicit ALL_TENANT origin %s without inventing grant authority', scopeOrigin => {
    const row = rows(); Object.assign(row.administrative, { scopeKind: 'ALL_TENANT', scopeOrigin, locationIds: [] });
    expect(observation(row).observation.administrative).toMatchObject({ scopeKind: 'ALL_TENANT', scopeOrigin, locationIds: [] });
  });
  it.each(['all-with-child', 'locations-legacy', 'revision-drift'])('rejects administrative contradiction %s', variant => {
    const row = rows(); if (variant === 'all-with-child') row.administrative.scopeKind = 'ALL_TENANT';
    if (variant === 'locations-legacy') row.administrative.scopeOrigin = 'LEGACY_COMPATIBILITY';
    if (variant === 'revision-drift') row.administrative.capabilityPolicyRevision = '18';
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('SOURCE_BINDING_MISMATCH');
  });
  it('preserves empty explicit location scope and child order; does not derive permitted locations', () => {
    const row = rows(); const before = observation(row); expect(before.observation.administrative?.locationIds).toEqual(row.administrative.locationIds);
    row.administrative.locationIds = []; expect(observation(row).observation.administrative?.locationIds).toEqual([]);
    expect(Object.hasOwn(before.observation, 'allowedLocationIds')).toBe(false);
  });
  it.each(['MANAGER', 'LEAD', 'EMPLOYEE', 'OWNER'])('requires source-consistent administrative shape for %s', role => {
    const row = rows(); row.employee.role = role;
    const withHeader = inspectPortalSourceBinding(row, binding());
    expect(withHeader.status).toBe(['LEAD', 'EMPLOYEE'].includes(role) ? 'SOURCE_BINDING_MISMATCH' : 'MATCHED_OBSERVATION_NOT_AUTHORITY');
    Object.defineProperty(row, 'administrative', { value: null, enumerable: true });
    expect(inspectPortalSourceBinding(row, binding()).status).toBe(role === 'MANAGER' ? 'SOURCE_BINDING_MISMATCH' : 'MATCHED_OBSERVATION_NOT_AUTHORITY');
  });
  it.each([{ label: 'unknown', capabilities: ['unknown.fake'] },
    { label: 'duplicate', capabilities: ['profile.self.read', 'profile.self.read'] }])('rejects $label capability children', ({ capabilities }) => {
    const row = rows(); row.administrative.capabilities = capabilities;
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION');
  });
  it('rejects duplicate location children rather than silently deduplicating them', () => {
    const row = rows(); row.administrative.locationIds = ['位置-β', '位置-β'];
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION');
  });
  it('copies and freezes every returned nested group and child array', () => {
    const row = rows(); const result = observation(row); row.administrative.locationIds.push('new'); row.credential.version = '2026-10-09 13:00:00+00';
    expect(result.observation.administrative?.locationIds).toEqual([' 位置-β ', 'location-a']); expect(result.observation.credential.version).toBe(at);
    expect(Object.isFrozen(result.observation)).toBe(true);
    for (const value of Object.values(result.observation)) if (value && typeof value === 'object') expect(Object.isFrozen(value)).toBe(true);
    expect(Object.isFrozen(result.observation.administrative?.capabilities)).toBe(true); expect(Object.isFrozen(result.observation.administrative?.locationIds)).toBe(true);
  });
  it.each(['raw', 'binding', 'credential', 'list'])('rejects %s proxy before all proxy traps', target => {
    const row = rows(); const b = binding(); let traps = 0;
    const wrap = (object: object) => new Proxy(object, { get() { traps++; throw Error('get'); }, ownKeys() { traps++; throw Error('keys'); }, getPrototypeOf() { traps++; throw Error('prototype'); } });
    if (target === 'credential') Object.defineProperty(row, 'credential', { value: wrap(row.credential), enumerable: true });
    if (target === 'list') Object.defineProperty(row.administrative, 'locationIds', { value: wrap(row.administrative.locationIds), enumerable: true });
    expect(inspectPortalSourceBinding(target === 'raw' ? wrap(row) : row, target === 'binding' ? wrap(b) : b).status).toBe('INVALID_SOURCE_OBSERVATION'); expect(traps).toBe(0);
  });
  it.each(['getter', 'symbol', 'nonenumerable', 'prototype', 'authority-extra'])('rejects closed-record violation %s inertly', variant => {
    const row = rows(); let getters = 0;
    if (variant === 'getter') Object.defineProperty(row.credential, 'version', { enumerable: true, get() { getters++; return at; } });
    if (variant === 'symbol') Object.defineProperty(row, Symbol('extra'), { enumerable: true, get() { getters++; return true; } });
    if (variant === 'nonenumerable') Object.defineProperty(row.credential, 'version', { value: at, enumerable: false });
    if (variant === 'prototype') Object.setPrototypeOf(row.credential, { version: at });
    if (variant === 'authority-extra') Object.defineProperty(row, 'authorityCurrent', { value: true, enumerable: true });
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION'); expect(getters).toBe(0);
  });
  it.each(['sparse', 'extra', 'getter', 'iterator', 'nonenumerable'])('rejects child array violation %s inertly', variant => {
    const row = rows(); let calls = 0; const list = row.administrative.locationIds;
    if (variant === 'sparse') delete list[0];
    if (variant === 'extra') Object.defineProperty(list, 'extra', { value: 'unexpected' });
    if (variant === 'getter') Object.defineProperty(list, '0', { enumerable: true, get() { calls++; return 'a'; } });
    if (variant === 'iterator') Object.defineProperty(list, Symbol.iterator, { value: function* () { calls++; yield 'a'; } });
    if (variant === 'nonenumerable') Object.defineProperty(list, '0', { value: 'a', enumerable: false });
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION'); expect(calls).toBe(0);
  });
  it('rejects a sparse child array with compensating extra even with a polluted descriptor-map prototype', () => {
    const row = rows(); const list = row.administrative.locationIds; delete list[0]; Object.defineProperty(list, 'extra', { value: true });
    const prior = Object.getOwnPropertyDescriptor(Object.prototype, '0');
    try { Object.defineProperty(Object.prototype, '0', { configurable: true, writable: true, value: { value: 'forged-location', enumerable: true } });
      const result = inspectPortalSourceBinding(row, binding()); expect(result.status).toBe('INVALID_SOURCE_OBSERVATION');
    } finally { if (prior) Object.defineProperty(Object.prototype, '0', prior); else delete (Object.prototype as Record<string, unknown>)['0']; }
  });
  it.each(['\ud800', '\udfff', 'bad\u0000text'])('rejects non-Postgres UTF8 text %s', invalidText => {
    const row = rows(); row.portal.provenanceReference = invalidText;
    expect(inspectPortalSourceBinding(row, binding()).status).toBe('INVALID_SOURCE_OBSERVATION');
  });
  it('rejects non-UTF8 matching workspace IDs without normalizing the source', () => {
    const row = rows(), b = binding(); b.workspaceId = '\ud800';
    for (const group of ['workspace', 'employee', 'incarnation', 'portal', 'issuance', 'administrative'] as const) {
      replace(row, group, group === 'workspace' ? 'id' : 'workspaceId', b.workspaceId);
    }
    expect(inspectPortalSourceBinding(row, b).status).toBe('INVALID_SOURCE_OBSERVATION');
  });
});
