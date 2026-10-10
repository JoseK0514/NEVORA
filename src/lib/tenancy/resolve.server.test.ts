import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { types as nodeTypes } from 'node:util';
import { transpileModule, ScriptTarget } from 'typescript';
vi.mock('server-only', () => ({}));
const database = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
const transports = vi.hoisted(() => ({ legacy: vi.fn(() => database), runtime: vi.fn(() => database) }));
vi.mock('../db', () => ({ getDb: transports.legacy, getTenantRuntimeDb: transports.runtime }));
import { getProvisionerScopeFacts, getTenantProofFacts, resolveCalendarReadProof, resolveClockerProof, resolvePortalProof, resolveProvisionerScope, resolveWorkerProof } from './resolve.server';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
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
const fenced = (rows: unknown) => [[{ catalog_fence: '' }], rows, [{ guard: 1 }]];
function respond(facts: unknown) { database.transaction.mockResolvedValue(fenced([{ facts }])); }
async function allowedPortal() {
  respond(portal());
  const result = await resolvePortalProof('tenant-aa', digest);
  expect(result.status).toBe('ALLOW');
  if (result.status !== 'ALLOW') throw Error('fictional issuer failed');
  return result.proof;
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); database.query.mockReset(); database.transaction.mockReset();
  database.query.mockImplementation((text, values) => ({ text, values, then() { throw Error('resolver query awaited outside transaction'); } })); transports.legacy.mockClear(); transports.runtime.mockClear(); });

describe('resolver owning catalog-fenced transaction', () => {
  it.each(['catalog_fence', 'guard'] as const)('rejects inherited descriptor-map fields for %s in isolated realms', field => {
    // Exercise the actual private source for the known descriptor-map cause,
    // without mutating this worker's Object.prototype or widening exports.
    const source = readFileSync(resolve('src/lib/tenancy/resolve.server.ts'), 'utf8');
    const start = source.indexOf('function singleWireResult('), end = source.indexOf('async function lookup(', start);
    expect(start >= 0 && end > start).toBe(true);
    const validator = transpileModule(source.slice(start, end), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
    const expected = field === 'guard' ? 1 : '';
    const fixtures = [
      `input=[{unexpected:1}];Object.defineProperty(Object.prototype,alias,{value:{value:good},writable:true,configurable:true});`,
      `input=new Array(1);input.unexpected=1;Object.defineProperty(Object.prototype,'0',{value:{value:{[alias]:good}},writable:true,configurable:true});`,
      `input=[Object.defineProperty({},alias,{enumerable:true,get(){throw Error('getter must not run');}})];Object.defineProperty(Object.prototype,'value',{value:good,writable:true,configurable:true});`,
    ];
    for (const fixture of fixtures) {
      const observed = runInNewContext(validator + `\nconst ordinary=singleWireResult([{[alias]:good}],alias,good);let input;${fixture}\n({ordinary,malformed:singleWireResult(input,alias,good)});`, { nodeTypes, alias: field, good: expected });
      expect(observed.ordinary).toBe(true); expect(observed.malformed).toBe(false);
    }
  });

  it('waits for its first-fence batch before issuing private proof identity', async () => {
    let finish!: (value: unknown) => void;
    database.transaction.mockImplementation(() => new Promise(done => { finish = done; }));
    let settled = false;
    const pending = resolvePortalProof('tenant-aa', digest).then(result => { settled = true; return result; });
    await Promise.resolve(); expect(settled).toBe(false);
    expect(database.query.mock.calls[0]).toEqual([RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []]);
    expect(database.transaction).toHaveBeenCalledTimes(1);
    finish(fenced([{ facts: portal() }])); expect((await pending).status).toBe('ALLOW');
  });
  it('does not replay a fence/final-role transaction rejection or expose its diagnostics', async () => {
    database.transaction.mockRejectedValue(Error('private-fence-or-final-role-diagnostic'));
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    expect(database.transaction).toHaveBeenCalledTimes(1); expect(database.query).toHaveBeenCalledTimes(3);
  });
  it.each([
    ['SQL NULL', [{ catalog_fence: null }]], ['wrong alias', [{ guard: '' }]], ['nonempty void', [{ catalog_fence: 'held' }]],
    ['missing row', []], ['multiple rows', [{ catalog_fence: '' }, { catalog_fence: '' }]],
    ['extra field', [{ catalog_fence: '', guard: 1 }]], ['non-row', null], ['sparse wrong keys', Object.assign(new Array(1), { unrelated: '' })],
  ])('rejects malformed fence %s before reading resolver metadata', async (_label, fence) => {
    let reads = 0;
    const row = new Proxy({ facts: portal() }, { getPrototypeOf(target) { reads++; return Reflect.getPrototypeOf(target); } });
    database.transaction.mockResolvedValue([fence, [row], [{ guard: 1 }]]);
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it('rejects fence accessor and proxy behavior without reading it', async () => {
    let reads = 0;
    const accessor = Object.defineProperty({}, 'catalog_fence', { enumerable: true, get() { reads++; return ''; } });
    const proxy = new Proxy({ catalog_fence: '' }, { getOwnPropertyDescriptor() { reads++; throw Error('private-proxy'); } });
    const revoked = Proxy.revocable({ catalog_fence: '' }, {}); revoked.revoke();
    for (const row of [accessor, proxy, revoked.proxy]) {
      database.transaction.mockResolvedValue([[row], [{ facts: portal() }], [{ guard: 1 }]]);
      expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    }
    expect(reads).toBe(0);
  });
  it.each([['false', [{ guard: 0 }]], ['SQL NULL', [{ guard: null }]], ['missing row', []], ['multiple rows', [{ guard: 1 }, { guard: 1 }]]] as const)('rejects malformed final role rows %s before issuance', async (_label, guard) => {
    let reads = 0;
    const row = new Proxy({ facts: portal() }, { getPrototypeOf(target) { reads++; return Reflect.getPrototypeOf(target); } });
    database.transaction.mockResolvedValue([[{ catalog_fence: '' }], [row], guard]);
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it.each(['catalog_fence', 'guard'] as const)('requires own data fields and own row index for %s without global prototype changes', async field => {
    const expected = field === 'catalog_fence' ? '' : 1;
    let reads = 0;
    const inheritedRow = Object.assign(Object.create({ [field]: expected }), { unrelated: expected });
    const accessor = Object.defineProperty({}, field, { enumerable: true, get() { reads++; return expected; } });
    const proxy = new Proxy({ [field]: expected }, { getOwnPropertyDescriptor() { reads++; throw Error('private-wire-proxy'); } });
    const inheritedIndex = Object.assign(Object.create(Array.prototype), { 0: { [field]: expected } });
    const sparse = Object.assign(new Array(1), { unrelated: expected });
    Object.setPrototypeOf(sparse, inheritedIndex);
    const metadata = new Proxy({ facts: portal() }, { getPrototypeOf(target) { reads++; return Reflect.getPrototypeOf(target); } });
    for (const bad of [[inheritedRow], [accessor], [proxy], sparse]) {
      const results = [[{ catalog_fence: '' }], [metadata], [{ guard: 1 }]];
      results[field === 'catalog_fence' ? 0 : 2] = bad;
      database.transaction.mockResolvedValue(results);
      expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    }
    expect(reads).toBe(0);
    expect(Object.hasOwn(Object.prototype, field)).toBe(false);
    expect(Object.hasOwn(Array.prototype, '0')).toBe(false);
  });
  it('requires exactly three results and rechecks lifetime after waiting', async () => {
    for (const results of [null, [], fenced([{ facts: portal() }]).slice(0, 2), [...fenced([{ facts: portal() }]), []]]) {
      database.transaction.mockResolvedValue(results);
      expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    }
    database.transaction.mockImplementation(async () => { vi.setSystemTime(new Date('2026-10-09T12:01:01Z')); return fenced([{ facts: portal() }]); });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
  });
});

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
    expect(database.query.mock.calls[1]).toEqual(['SELECT CASE WHEN nevora_tenancy.assert_audited_runtime_role(\'APP\'::text) IS TRUE THEN nevora_tenancy.resolve_portal($1::text,$2::text) ELSE NULL::jsonb END AS facts', ['tenant-aa', digest]]);
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
    expect(database.query.mock.calls[1][1][0]).toBe('tenant-aa');
    expect(await resolvePortalProof('tenant-\u212a', digest)).toEqual({ status: 'DENY' });
  });

  it('preserves denial when current DB authority reports stale or absent identity', async () => {
    respond({ ...portal(), authorityCurrent: false });
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    respond(null);
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    database.transaction.mockResolvedValue(fenced([]));
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
    database.transaction.mockRejectedValue(Error('secret SQL and bearer must not escape'));
    expect(await resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' });
    for (const result of [{}, [{ facts: portal() }, { facts: portal() }], [{ wrong: portal() }]]) {
      database.transaction.mockResolvedValue(fenced(result));
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
    expect(database.query.mock.calls[1]).toEqual(['SELECT CASE WHEN nevora_tenancy.assert_audited_runtime_role(\'APP\'::text) IS TRUE THEN nevora_tenancy.resolve_clocker($1::text,$2::text) ELSE NULL::jsonb END AS facts', [hash(device, 'nevora-clocker-v1\0'), hash(pin, 'nevora-clocker-identity-v1\0')]]);
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
    database.transaction.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = resolveWorkerProof(identity, lease);
    identity.workerId = 'worker-b';
    lease.deliveryId = 'delivery-b';
    expect(database.transaction).toHaveBeenCalledTimes(1);
    finish(fenced([{ facts: worker() }]));
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
    database.transaction.mockImplementation(() => new Promise(resolve => { finish = resolve; }));
    const pending = resolveProvisionerScope(request, 'test', 'TENANT_RESTORE');
    request.payloadDigest = digest;
    expect(database.transaction).toHaveBeenCalledTimes(1);
    finish(fenced([{ facts: provisioner() }]));
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
    database.transaction.mockRejectedValue(Error('operator secret and SQL'));
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

describe('root dedicated resolver transport regression',()=>{
 it.each([
  ['PORTAL','APP',portal,()=>resolvePortalProof('tenant-aa',digest)],
  ['CLOCKER','APP',clocker,()=>resolveClockerProof(device,pin)],
  ['CALENDAR_READ','APP',calendar,()=>resolveCalendarReadProof(digest)],
  ['WORKER','WORKER',worker,()=>resolveWorkerProof(workerIdentity,claim)],
  ['PROVISIONER','APP',provisioner,()=>resolveProvisionerScope(operator,'test','TENANT_RESTORE')],
 ] as const)('resolves %s only with dedicated %s transport and role guard',async(_kind,role,facts,resolve)=>{
  respond(facts());expect((await resolve()).status).toBe('ALLOW');
  expect(transports.legacy).not.toHaveBeenCalled();
  expect(transports.runtime).toHaveBeenCalledExactlyOnceWith(role);
  const query=database.query.mock.calls[1][0];
  expect(query).toContain(`CASE WHEN nevora_tenancy.assert_audited_runtime_role('${role}'::text) IS TRUE THEN nevora_tenancy.resolve_`);
  expect(query).toContain('ELSE NULL::jsonb END AS facts');
  expect(database.query).toHaveBeenCalledTimes(3);
  expect(database.query.mock.calls[0]).toEqual([RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []]);
  expect(database.query.mock.calls[2][0]).toContain('assert_audited_runtime_role($1::text)');
  expect(database.query.mock.calls[2][1]).toEqual([role]);
  expect(database.transaction).toHaveBeenCalledExactlyOnceWith(database.query.mock.results.map(result => result.value), { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
 });
});

it('returns only unavailable when dedicated runtime configuration throws private diagnostics',async()=>{
 transports.runtime.mockImplementationOnce(()=>{throw Error('fictional-private-configuration-marker');});respond(portal());
 expect(await resolvePortalProof('tenant-aa',digest)).toEqual({status:'UNAVAILABLE'});
 expect(transports.legacy).not.toHaveBeenCalled();expect(database.query).not.toHaveBeenCalled();
});

describe('audited external runtime role callsites', () => {
  const cases = [
    ['PORTAL', 'APP', portal, () => resolvePortalProof('tenant-aa', digest)],
    ['CLOCKER', 'APP', clocker, () => resolveClockerProof(device, pin)],
    ['CALENDAR_READ', 'APP', calendar, () => resolveCalendarReadProof(digest)],
    ['WORKER', 'WORKER', worker, () => resolveWorkerProof(workerIdentity, claim)],
    ['PROVISIONER', 'APP', provisioner, () => resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE')],
  ] as const;

  it.each(cases)('does not resolve %s when primitive %s identity passes but the audited lookup graph denies', async (_kind, role, facts, run) => {
    // Fictional transport model only. It models the closed CASE truth branch;
    // primitive identity always passes while only the audited graph is denied.
    // No native SQL, catalog or helper invocation is claimed by this mock.
    let resolverInvocations = 0;
    database.transaction.mockImplementation(async (plans: { text: string }[]) => {
      const auditedLookup = plans[1].text.includes('nevora_tenancy.assert_audited_runtime_role(');
      if (!auditedLookup) resolverInvocations++;
      return fenced([{ facts: auditedLookup ? null : facts() }]);
    });
    const result = await run();
    const issuedKind = result.status !== 'ALLOW' ? null
      : 'proof' in result ? getTenantProofFacts(result.proof).kind : getProvisionerScopeFacts(result.scope).kind;
    // Preserve the actual cause in RED: old code issues a genuine private local
    // identity here, although this fictional audited lookup would return NULL.
    const observed = { outcome: result.status, issuedKind, resolverInvocations };
    expect(observed, 'FICTIONAL_LOOKUP_CAUSE ' + JSON.stringify(observed)).toEqual({ outcome: 'DENY', issuedKind: null, resolverInvocations: 0 });
    expect(Object.keys(result)).toEqual(['status']);expect(Object.isFrozen(result)).toBe(true);
    expect(transports.runtime).toHaveBeenCalledExactlyOnceWith(role);expect(transports.legacy).not.toHaveBeenCalled();
    expect(database.query).toHaveBeenCalledTimes(3);expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.query.mock.calls[0]).toEqual([RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []]);
    expect(database.query.mock.calls[1][0]).toContain(`CASE WHEN nevora_tenancy.assert_audited_runtime_role('${role}'::text) IS TRUE THEN`);
    expect(database.query.mock.calls[2]).toEqual(['SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard', [role]]);
    expect(database.transaction).toHaveBeenCalledExactlyOnceWith(database.query.mock.results.map(entry => entry.value), { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  });

  it.each(cases)('does not issue %s when primitive %s identity passes but the final audited graph rejects', async (_kind, role, facts, run) => {
    const privateDiagnostic = 'fictional-final-audited-graph-query-and-credential-diagnostic';
    database.transaction.mockImplementation(async (plans: { text: string }[]) => {
      if (plans[2].text.includes('nevora_tenancy.assert_audited_runtime_role(')) throw Error(privateDiagnostic);
      return fenced([{ facts: facts() }]);
    });
    const result = await run();
    const issuedKind = result.status !== 'ALLOW' ? null
      : 'proof' in result ? getTenantProofFacts(result.proof).kind : getProvisionerScopeFacts(result.scope).kind;
    // The old primitive-only final check returns ALLOW with issued facts. The
    // successor must sanitize transaction rejection and issue no identity.
    const observed = { outcome: result.status, issuedKind };
    expect(observed, 'FICTIONAL_FINAL_CAUSE ' + JSON.stringify(observed)).toEqual({ outcome: 'UNAVAILABLE', issuedKind: null });
    expect(Object.keys(result)).toEqual(['status']);expect(Object.isFrozen(result)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(privateDiagnostic);
    expect(transports.runtime).toHaveBeenCalledExactlyOnceWith(role);expect(transports.legacy).not.toHaveBeenCalled();
    expect(database.query).toHaveBeenCalledTimes(3);expect(database.transaction).toHaveBeenCalledTimes(1);
    expect(database.query.mock.calls[0]).toEqual([RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []]);
    expect(database.query.mock.calls[2]).toEqual(['SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard', [role]]);
    expect(database.transaction).toHaveBeenCalledExactlyOnceWith(database.query.mock.results.map(entry => entry.value), { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  });
});
