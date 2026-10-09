import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
vi.mock('server-only', () => ({}));
const database = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock('../db', () => ({ getDb: () => database }));
import { getProvisionerScopeFacts, getTenantProofFacts, resolveCalendarReadProof, resolveClockerProof, resolvePortalProof, resolveProvisionerScope, resolveWorkerProof } from './resolve.server';
import type { ProvisionerScope, TenantProof } from './types';

const NOW = new Date('2026-10-09T12:00:00Z');
const digest = 'a'.repeat(64);
const common = { authorityCurrent: true, workspaceId: 'tenant-a', workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993', resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00.123456+00' };
const portal = () => ({ ...common, kind: 'PORTAL', locator: 'tenant-aa', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00', authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest, sessionExpiresAt: '2026-10-09 12:01:00.123456+00', role: 'MANAGER', capabilityPolicyRevision: '3', capabilities: ['employee.core.edit'], allowedLocationIds: ['location-a'], administrativeLocationIds: ['location-a'] });
const device = `nev_dev_${'b'.repeat(64)}`;
const pin = `nev_pin_${'c'.repeat(64)}`;
const hash = (value: string, prefix = '') => createHash('sha256').update(prefix).update(value).digest('hex');
const clocker = () => ({ ...common, kind: 'CLOCKER', locationId: 'location-a', deviceId: 'device-a', deviceVersion: '7', credentialHash: hash(device, 'nevora-clocker-v1\0'), credentialVersion: '6', pinSessionTokenHash: hash(pin, 'nevora-clocker-identity-v1\0'), pinVersion: '5', pinKeyIdentity: 'd'.repeat(64), employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00', pinSessionExpiresAt: common.expiresAt });
const calendar = () => ({ ...common, kind: 'CALENDAR_READ', subscriptionId: 'subscription-a', digest, generation: 'generation-a', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00', authorizationVersion: '4', allowedLocationIds: ['location-a'] });
const workerIdentity = { workerId: 'worker-a', credentialDigest: digest, environment: 'test' as const };
const claim = { deliveryId: 'delivery-a', generation: 'generation-a', leaseToken: 'fictional-lease-token-a' };
const worker = () => ({ ...common, kind: 'WORKER', workerId: 'worker-a', workerCredentialDigest: digest, workerGrantVersion: '2', environment: 'test', deliveryId: 'delivery-a', intentId: 'intent-a', subscriptionId: 'subscription-a', generation: 'generation-a', leaseTokenHash: hash(claim.leaseToken), leaseExpiresAt: common.expiresAt });
const operator = { operatorId: 'operator-a', credentialDigest: digest, requestId: 'request-a', requestDigest: 'b'.repeat(64), operationId: 'operation-a', payloadDigest: 'c'.repeat(64) };
const provisioner = () => ({ authorityCurrent: true, kind: 'PROVISIONER', operatorId: 'operator-a', operatorGrantId: 'grant-a', operatorGrantVersion: '2', operatorCredentialDigest: digest, environment: 'test', purpose: 'TENANT_RESTORE', workspaceId: 'tenant-a', bootstrapNonce: null, subjectEmployeeId: 'owner-a', workspaceIncarnation: '3', sourceVersion: '2026-10-08 10:00:00.123456+00', requestId: 'request-a', requestDigest: operator.requestDigest, operationId: 'operation-a', payloadDigest: operator.payloadDigest, verifiedIdentityReference: 'verification-a', resolvedAt: common.resolvedAt, expiresAt: common.expiresAt });
function respond(facts: unknown) { database.query.mockResolvedValue([{ facts }]); }
async function allowedPortal() {
  respond(portal());
  const result = await resolvePortalProof('tenant-aa', digest);
  expect(result.status).toBe('ALLOW');
  if (result.status !== 'ALLOW') throw Error('fictional issuer failed');
  return result.proof;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); database.query.mockReset(); });

describe('server-local proof authenticity and least metadata', () => {
  it('issues genuine frozen authority without exposing DB metadata in the proof object', async () => {
    const row = { ...portal(), privateContact: 'private@example.test', passwordHash: 'never-copy' };
    respond(row);
    const result = await resolvePortalProof('tenant-aa', digest);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    const facts = getTenantProofFacts(result.proof);
    expect(Object.keys(result.proof)).toEqual(['kind']);
    expect(Object.isFrozen(result.proof)).toBe(true);
    expect(facts).toMatchObject({ workspaceId: 'tenant-a', workspaceIncarnation: '9007199254740993', employeeVersion: '2026-10-08 11:00:00.654321+00' });
    expect(facts).not.toHaveProperty('privateContact');
    expect(facts).not.toHaveProperty('passwordHash');
    expect(Object.isFrozen(facts)).toBe(true);
    if (facts.kind !== 'PORTAL') throw Error('fixture');
    expect(Object.isFrozen(facts.allowedLocationIds)).toBe(true);
    expect(Object.isFrozen(facts.capabilities)).toBe(true);
    row.allowedLocationIds.push('foreign-location');
    expect(facts.allowedLocationIds).toEqual(['location-a']);
  });

  it('rejects shapes, JSON roundtrips, spreads, proxies and prototype copies', async () => {
    const proof = await allowedPortal();
    for (const forged of [{ kind: 'PORTAL' }, JSON.parse(JSON.stringify(proof)), { ...proof }, new Proxy(proof, {}), Object.create(proof), null]) {
      expect(() => getTenantProofFacts(forged as TenantProof)).toThrow('tenant_proof_denied');
    }
    expect(getTenantProofFacts(proof).kind).toBe('PORTAL');
  });

  it('rejects a once-issued proof when its bounded lifetime expires', async () => {
    const proof = await allowedPortal();
    vi.setSystemTime(new Date('2026-10-09T12:01:01Z'));
    expect(() => getTenantProofFacts(proof)).toThrow('tenant_proof_denied');
  });
});

describe('narrow resolver boundary', () => {
  it('uses a constant parameterized portal seam and binds locator and session digest', async () => {
    await allowedPortal();
    expect(database.query.mock.calls).toEqual([['SELECT nevora_tenancy.resolve_portal($1::text,$2::text) AS facts', ['tenant-aa', digest]]]);
    for (const changed of [{ locator: 'tenant-bb' }, { sessionTokenHash: 'b'.repeat(64) }, { kind: 'CLOCKER' }]) {
      respond({ ...portal(), ...changed });
      expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    }
  });

  it('rejects invalid selectors and digests before lookup without SQL interpolation', async () => {
    for (const locator of ['', 'fuel', 'tenant-\naa', "tenant-aa';DROP TABLE x;--"]) expect(await resolvePortalProof(locator, digest)).toEqual({ status: 'DENY' });
    expect(await resolvePortalProof('tenant-aa', 'A'.repeat(64))).toEqual({ status: 'DENY' });
    expect(database.query).not.toHaveBeenCalled();
  });

  it('uses the frozen locator normalizer before resolving and rejects Unicode confusables', async () => {
    respond(portal());
    expect((await resolvePortalProof(' TENANT-AA ', digest)).status).toBe('ALLOW');
    expect(database.query.mock.calls[0][1][0]).toBe('tenant-aa');
    expect(await resolvePortalProof('tenant-\u212a', digest)).toEqual({ status: 'DENY' });
  });

  it('preserves denial when current DB authority reports stale or absent identity', async () => {
    respond({ ...portal(), authorityCurrent: false });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    respond(null);
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    database.query.mockResolvedValue([]);
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
  });

  it.each([{ workspaceVersion: 'not-a-db-version' }, { workspaceIncarnation: 1 }, { authorizationVersion: '04' }, { employeeVersion: '2026-02-31 10:00:00+00' }, { authorityCurrent: undefined }, { role: 'PLATFORM_ADMIN' }, { allowedLocationIds: ['location-a', 'location-a'] }, { administrativeLocationIds: ['foreign-location'] }])('fails closed on malformed metadata %j', async changed => {
    respond({ ...portal(), ...changed });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
  });

  it('denies expired facts and refuses a proof lifetime beyond the real session expiry', async () => {
    respond({ ...portal(), expiresAt: '2026-10-09 12:00:00+00' });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    respond({ ...portal(), sessionExpiresAt: '2026-10-09 12:00:30+00' });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
  });

  it('returns sanitized unavailability for missing helpers, malformed transport or ambiguous rows', async () => {
    database.query.mockRejectedValue(Error('secret SQL and bearer must not escape'));
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    for (const result of [{}, [{ facts: portal() }, { facts: portal() }], [{ wrong: portal() }]]) {
      database.query.mockResolvedValue(result);
      expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    }
  });

  it('does not issue location authority from a sparse malformed metadata array', async () => {
    const locations = new Array(2);
    locations[1] = 'location-a';
    respond({ ...portal(), allowedLocationIds: locations });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
  });

  it('derives Clocker credential and PIN digests using the existing domains and binds both', async () => {
    respond(clocker());
    const result = await resolveClockerProof(device, pin);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ kind: 'CLOCKER', employeeId: 'employee-a', credentialVersion: '6', pinVersion: '5' });
    expect(database.query.mock.calls[0]).toEqual(['SELECT nevora_tenancy.resolve_clocker($1::text,$2::text) AS facts', [hash(device, 'nevora-clocker-v1\0'), hash(pin, 'nevora-clocker-identity-v1\0')]]);
    expect(JSON.stringify(getTenantProofFacts(result.proof))).not.toContain(device);
    respond({ ...clocker(), pinSessionTokenHash: digest });
    expect(await resolveClockerProof(device, pin)).toEqual({ status: 'DENY' });
    expect(await resolveClockerProof('not-device', pin)).toEqual({ status: 'DENY' });
  });

  it('retains calendar issuance scope with read-only kind and no portal capability', async () => {
    respond(calendar());
    const result = await resolveCalendarReadProof(digest);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    const facts = getTenantProofFacts(result.proof);
    expect(facts.kind).toBe('CALENDAR_READ');
    expect(facts).not.toHaveProperty('capabilities');
    expect(facts).toHaveProperty('allowedLocationIds', ['location-a']);
    respond({ ...calendar(), digest: 'b'.repeat(64) });
    expect(await resolveCalendarReadProof(digest)).toEqual({ status: 'DENY' });
  });

  it('binds worker identity, environment and the exact leased claim without exposing the lease bearer', async () => {
    respond(worker());
    const result = await resolveWorkerProof(workerIdentity, claim);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ kind: 'WORKER', deliveryId: 'delivery-a', workerId: 'worker-a' });
    expect(JSON.stringify(getTenantProofFacts(result.proof))).not.toContain(claim.leaseToken);
    for (const changed of [{ workerId: 'worker-b' }, { workerCredentialDigest: 'b'.repeat(64) }, { environment: 'production' }, { deliveryId: 'delivery-b' }, { generation: 'generation-b' }, { leaseTokenHash: digest }]) {
      respond({ ...worker(), ...changed });
      expect(await resolveWorkerProof(workerIdentity, claim)).toEqual({ status: 'DENY' });
    }
    expect(await resolveWorkerProof({ ...workerIdentity, credentialDigest: '' }, claim)).toEqual({ status: 'DENY' });
  });

  it('captures worker input bindings before the asynchronous resolver wait', async () => {
    const identity = { ...workerIdentity }, lease = { ...claim };
    let finish!: (value: unknown) => void;
    database.query.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = resolveWorkerProof(identity, lease);
    identity.workerId = 'worker-b';
    lease.deliveryId = 'delivery-b';
    finish([{ facts: worker() }]);
    expect((await pending).status).toBe('ALLOW');
  });
});

describe('separate purpose-bound provisioning authority', () => {
  it('issues only the source-bound approved control-plane grant and rejects tenant executor crossover', async () => {
    respond(provisioner());
    const result = await resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE');
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(getProvisionerScopeFacts(result.scope)).toMatchObject({ purpose: 'TENANT_RESTORE', subjectEmployeeId: 'owner-a', sourceVersion: '2026-10-08 10:00:00.123456+00' });
    expect(() => getTenantProofFacts(result.scope as unknown as TenantProof)).toThrow('tenant_proof_denied');
    expect(() => getProvisionerScopeFacts(JSON.parse(JSON.stringify(result.scope)) as ProvisionerScope)).toThrow('provisioner_scope_denied');
    expect(() => getProvisionerScopeFacts({ kind: 'PROVISIONER' } as ProvisionerScope)).toThrow('provisioner_scope_denied');
    const portalProof = await allowedPortal();
    expect(() => getProvisionerScopeFacts(portalProof as unknown as ProvisionerScope)).toThrow('provisioner_scope_denied');
  });

  it('rejects missing operator credentials, production scope and unapproved purposes before lookup', async () => {
    expect(await resolveProvisionerScope({ ...operator, credentialDigest: '' }, 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    expect(await resolveProvisionerScope(operator, 'production' as 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    expect(await resolveProvisionerScope(operator, 'test', 'IMPERSONATE_OWNER' as 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    expect(database.query).not.toHaveBeenCalled();
  });

  it('rejects different operator, purpose, request, operation or payload bindings', async () => {
    for (const changed of [{ operatorId: 'operator-b' }, { purpose: 'TENANT_BOOTSTRAP' }, { requestDigest: digest }, { operationId: 'operation-b' }, { payloadDigest: digest }, { operatorCredentialDigest: 'b'.repeat(64) }]) {
      respond({ ...provisioner(), ...changed });
      expect(await resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    }
  });

  it('rejects restore without a source incarnation, subject or authenticated verification reference', async () => {
    for (const changed of [{ workspaceIncarnation: null }, { sourceVersion: null }, { subjectEmployeeId: null }, { verifiedIdentityReference: null }, { bootstrapNonce: 'bootstrap-a' }]) {
      respond({ ...provisioner(), ...changed });
      expect(await resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE')).toEqual({ status: 'UNAVAILABLE' });
    }
  });

  it('keeps bootstrap distinct from existing tenant recovery and never grants portal access', async () => {
    respond({ ...provisioner(), purpose: 'TENANT_BOOTSTRAP', workspaceId: null, bootstrapNonce: 'bootstrap-a', workspaceIncarnation: null, sourceVersion: null, verifiedIdentityReference: null });
    const result = await resolveProvisionerScope(operator, 'test', 'TENANT_BOOTSTRAP');
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    const facts = getProvisionerScopeFacts(result.scope);
    expect(facts.workspaceId).toBeNull();
    expect(facts.bootstrapNonce).toBe('bootstrap-a');
    expect(facts).not.toHaveProperty('role');
    vi.setSystemTime(new Date('2026-10-09T12:01:01Z'));
    expect(() => getProvisionerScopeFacts(result.scope)).toThrow('provisioner_scope_denied');
  });

  it('captures provisioner request bindings before the asynchronous resolver wait', async () => {
    const request = { ...operator };
    let finish!: (value: unknown) => void;
    database.query.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = resolveProvisionerScope(request, 'test', 'TENANT_RESTORE');
    request.payloadDigest = digest;
    finish([{ facts: provisioner() }]);
    expect((await pending).status).toBe('ALLOW');
  });

  it.each(['INITIAL_OWNER_VERIFICATION', 'OWNER_ACCESS_REVERIFICATION'] as const)('binds %s to its current subject/source/verification without adding a customer role', async purpose => {
    respond({ ...provisioner(), purpose });
    const result = await resolveProvisionerScope(operator, 'test', purpose);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    const facts = getProvisionerScopeFacts(result.scope);
    expect(facts).toMatchObject({ purpose, subjectEmployeeId: 'owner-a', verifiedIdentityReference: 'verification-a', workspaceIncarnation: '3' });
    expect(Object.isFrozen(facts)).toBe(true);
    expect(facts).not.toHaveProperty('role');
    respond({ ...provisioner(), purpose, verifiedIdentityReference: null });
    expect(await resolveProvisionerScope(operator, 'test', purpose)).toEqual({ status: 'UNAVAILABLE' });
  });

  it('reports stale grants as denial and helper failures without operator details', async () => {
    respond({ ...provisioner(), authorityCurrent: false });
    expect(await resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    database.query.mockRejectedValue(Error('operator secret and SQL'));
    expect(await resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE')).toEqual({ status: 'UNAVAILABLE' });
  });
});

describe('variant-specific bounded authority', () => {
  it('preserves exact legacy DB identity keys instead of imposing new ASCII identifier rules', async () => {
    respond({ ...portal(), employeeId: 'legacy-\u00c1/001', allowedLocationIds: ['localizaci\u00f3n principal'], administrativeLocationIds: ['localizaci\u00f3n principal'] });
    const result = await resolvePortalProof('tenant-aa', digest);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ employeeId: 'legacy-\u00c1/001', allowedLocationIds: ['localizaci\u00f3n principal'] });
  });

  it('permits a current Manager with explicitly empty administrative scope to authenticate without broadening it', async () => {
    respond({ ...portal(), administrativeLocationIds: [], capabilities: ['profile.self.read'] });
    const result = await resolvePortalProof('tenant-aa', digest);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ role: 'MANAGER', administrativeLocationIds: [], capabilities: ['profile.self.read'] });
  });

  it('does not transfer Clocker, calendar or worker authority through serialization', async () => {
    for (const [row, run] of [
      [clocker(), () => resolveClockerProof(device, pin)],
      [calendar(), () => resolveCalendarReadProof(digest)],
      [worker(), () => resolveWorkerProof(workerIdentity, claim)],
    ] as const) {
      respond(row);
      const result = await run();
      expect(result.status).toBe('ALLOW');
      if (result.status !== 'ALLOW') throw Error('fixture');
      expect(() => getTenantProofFacts(JSON.parse(JSON.stringify(result.proof)) as TenantProof)).toThrow('tenant_proof_denied');
      expect(() => getProvisionerScopeFacts(result.proof as unknown as ProvisionerScope)).toThrow('provisioner_scope_denied');
    }
  });

  it('denies expired device identity and leased worker claims, and malformed issuance scopes', async () => {
    respond({ ...clocker(), pinSessionExpiresAt: '2026-10-09 11:59:59+00' });
    expect(await resolveClockerProof(device, pin)).toEqual({ status: 'UNAVAILABLE' });
    respond({ ...worker(), leaseExpiresAt: '2026-10-09 11:59:59+00' });
    expect(await resolveWorkerProof(workerIdentity, claim)).toEqual({ status: 'UNAVAILABLE' });
    respond({ ...calendar(), allowedLocationIds: [] });
    expect(await resolveCalendarReadProof(digest)).toEqual({ status: 'UNAVAILABLE' });
  });

  it('keeps explicit self-only portal authority separate from administrative scope', async () => {
    respond({ ...portal(), role: 'EMPLOYEE', administrativeLocationIds: [], capabilities: ['profile.self.read'] });
    const result = await resolvePortalProof('tenant-aa', digest);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ role: 'EMPLOYEE', administrativeLocationIds: [], capabilities: ['profile.self.read'] });
    respond({ ...portal(), role: 'EMPLOYEE' });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
  });
});
