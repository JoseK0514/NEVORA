import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';

// Fictional SDK rows exercise the real parser and private object-identity issuer.
// They establish no native/current-proof/RLS/Neon or database issuer authority.
vi.mock('server-only', () => ({}));
const database = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
const runtime = vi.hoisted(() => vi.fn(() => database));
vi.mock('../db', () => ({ getTenantRuntimeDb: runtime }));
import {
  getProvisionerScopeFacts, getTenantProofFacts, resolveCalendarReadProof,
  resolveClockerProof, resolvePortalProof, resolveProvisionerScope, resolveWorkerProof,
} from './resolve.server';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
import type { ProofResolution, ProvisionerPurpose, TenantProof } from './types';

const NOW = new Date('2026-10-09T12:00:00Z');
// Hand-checked native int8 literals, independent of the proposed validator.
const MAX_INT8 = '9223372036854775807';
const MAX_INT8_PLUS_ONE = '9223372036854775808';
const ABOVE_JS_SAFE = '9007199254740993';
const LONG_REVISION = '9'.repeat(78);
const tokenDigest = 'a'.repeat(64);
const hash = (value: string, prefix = '') => createHash('sha256').update(prefix).update(value).digest('hex');
const common = {
  authorityCurrent: true, workspaceId: 'tenant-a', workspaceVersion: '2026-10-08 10:00:00.123456+00',
  workspaceIncarnation: '3', resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00.123456+00',
};
const portal = () => ({
  ...common, kind: 'PORTAL', locator: 'tenant-aa', employeeId: 'employee-a',
  employeeVersion: '2026-10-08 11:00:00.654321+00', authorizationVersion: '4', portalAccessVersion: '2',
  sessionTokenHash: tokenDigest, sessionExpiresAt: common.expiresAt, role: 'MANAGER',
  capabilityPolicyRevision: '3', capabilities: ['employee.core.edit'],
  allowedLocationIds: ['location-a'], administrativeLocationIds: ['location-a'],
  administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['location-a'] },
});
const device = `nev_dev_${'b'.repeat(64)}`;
const pin = `nev_pin_${'c'.repeat(64)}`;
const clocker = () => ({
  ...common, kind: 'CLOCKER', locationId: 'location-a', deviceId: 'device-a', deviceVersion: '7',
  credentialHash: hash(device, 'nevora-clocker-v1\0'), credentialVersion: '6',
  pinSessionTokenHash: hash(pin, 'nevora-clocker-identity-v1\0'), pinVersion: '5', pinKeyIdentity: 'd'.repeat(64),
  employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00', pinSessionExpiresAt: common.expiresAt,
});
const calendar = () => ({
  ...common, kind: 'CALENDAR_READ', subscriptionId: 'subscription-a', digest: tokenDigest,
  generation: 'generation-a', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
  authorizationVersion: '4', allowedLocationIds: ['location-a'],
});
const workerIdentity = { workerId: 'worker-a', credentialDigest: tokenDigest, environment: 'test' as const };
const claim = { deliveryId: 'delivery-a', generation: 'generation-a', leaseToken: 'fictional-lease-token-a' };
const worker = () => ({
  ...common, kind: 'WORKER', workerId: 'worker-a', workerCredentialDigest: tokenDigest, workerGrantVersion: '2',
  environment: 'test', deliveryId: 'delivery-a', intentId: 'intent-a', subscriptionId: 'subscription-a',
  generation: 'generation-a', leaseTokenHash: hash(claim.leaseToken), leaseExpiresAt: common.expiresAt,
});
type TenantCase = Readonly<{
  kind: TenantProof['kind']; role: 'APP' | 'WORKER'; expression: string; values: readonly string[];
  facts: () => Record<string, unknown>; resolve: () => Promise<ProofResolution<TenantProof>>;
}>;
const tenants: readonly TenantCase[] = [
  { kind: 'PORTAL', role: 'APP', expression: 'nevora_tenancy.resolve_portal($1::text,$2::text)',
    values: ['tenant-aa', tokenDigest], facts: portal, resolve: () => resolvePortalProof('tenant-aa', tokenDigest) },
  { kind: 'CLOCKER', role: 'APP', expression: 'nevora_tenancy.resolve_clocker($1::text,$2::text)',
    values: [hash(device, 'nevora-clocker-v1\0'), hash(pin, 'nevora-clocker-identity-v1\0')], facts: clocker,
    resolve: () => resolveClockerProof(device, pin) },
  { kind: 'CALENDAR_READ', role: 'APP', expression: 'nevora_tenancy.resolve_calendar($1::text)',
    values: [tokenDigest], facts: calendar, resolve: () => resolveCalendarReadProof(tokenDigest) },
  { kind: 'WORKER', role: 'WORKER', expression: 'nevora_tenancy.resolve_worker($1::text,$2::text,$3::text,$4::text,$5::text,$6::text)',
    values: ['worker-a', tokenDigest, 'test', 'delivery-a', 'generation-a', hash(claim.leaseToken)], facts: worker,
    resolve: () => resolveWorkerProof(workerIdentity, claim) },
];
const operator = { operatorId: 'operator-a', credentialDigest: tokenDigest, requestId: 'request-a',
  requestDigest: 'b'.repeat(64), operationId: 'operation-a', payloadDigest: 'c'.repeat(64) };
const scopedPurposes = ['INITIAL_OWNER_VERIFICATION', 'TENANT_RESTORE', 'OWNER_ACCESS_REVERIFICATION'] as const;
const provisioner = (purpose: ProvisionerPurpose) => ({
  authorityCurrent: true, kind: 'PROVISIONER', operatorId: 'operator-a', operatorGrantId: 'grant-a',
  operatorGrantVersion: '2', operatorCredentialDigest: tokenDigest, environment: 'test', purpose,
  workspaceId: purpose === 'TENANT_BOOTSTRAP' ? null : 'tenant-a',
  bootstrapNonce: purpose === 'TENANT_BOOTSTRAP' ? 'bootstrap-a' : null, subjectEmployeeId: 'owner-a',
  workspaceIncarnation: purpose === 'TENANT_BOOTSTRAP' ? null : '3',
  sourceVersion: purpose === 'TENANT_BOOTSTRAP' ? null : '2026-10-08 10:00:00.123456+00',
  verifiedIdentityReference: purpose === 'TENANT_BOOTSTRAP' ? null : 'verification-a',
  requestId: operator.requestId, requestDigest: operator.requestDigest,
  operationId: operator.operationId, payloadDigest: operator.payloadDigest,
  resolvedAt: common.resolvedAt, expiresAt: common.expiresAt,
});
const FINAL_ROLE = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
function respond(facts: unknown) {
  database.transaction.mockResolvedValue([[{ catalog_fence: '' }], [{ facts }], [{ guard: 1 }]]);
}
function expectLookup(role: 'APP' | 'WORKER', expression: string, values: readonly string[]) {
  expect(runtime).toHaveBeenCalledExactlyOnceWith(role);
  expect(database.query.mock.calls).toEqual([
    [RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []],
    [`SELECT CASE WHEN nevora_tenancy.assert_audited_runtime_role('${role}'::text) IS TRUE THEN ${expression} ELSE NULL::jsonb END AS facts`, values],
    [FINAL_ROLE, [role]],
  ]);
  expect(database.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Array),
    { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
}
function expectProvisionerLookup(purpose: ProvisionerPurpose) {
  expectLookup('APP', 'nevora_tenancy.resolve_provisioner($1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text)',
    [operator.operatorId, operator.credentialDigest, 'test', purpose, operator.requestId,
      operator.requestDigest, operator.operationId, operator.payloadDigest]);
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW); runtime.mockClear(); database.query.mockReset(); database.transaction.mockReset();
  database.query.mockImplementation((text, values) => ({ text, values,
    then() { throw Error('resolver query awaited outside transaction'); } }));
});
afterEach(() => { vi.useRealTimers(); });

describe.each(tenants)('$kind workspace incarnation metadata', fixture => {
  it.each([MAX_INT8_PLUS_ONE, LONG_REVISION])('rejects overflow %s without a private proof', async value => {
    respond({ ...fixture.facts(), workspaceIncarnation: value });
    const result = await fixture.resolve();
    expectLookup(fixture.role, fixture.expression, fixture.values);
    expect(result).toEqual({ status: 'UNAVAILABLE' });
    expect(result).not.toHaveProperty('proof');
  });
  it.each([ABOVE_JS_SAFE, MAX_INT8])('retains valid native-int8 text %s exactly in private facts', async value => {
    respond({ ...fixture.facts(), workspaceIncarnation: value });
    const result = await fixture.resolve();
    expectLookup(fixture.role, fixture.expression, fixture.values);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('valid incarnation fixture was not issued');
    const facts = getTenantProofFacts(result.proof);
    expect(facts.kind).toBe(fixture.kind); expect(facts.workspaceIncarnation).toBe(value);
    expect(Object.isFrozen(facts)).toBe(true); expect(Object.isFrozen(result.proof)).toBe(true);
    expect(Object.keys(result.proof)).toEqual(['kind']);
  });
});

describe.each(scopedPurposes)('%s workspace incarnation metadata', purpose => {
  it.each([MAX_INT8_PLUS_ONE, LONG_REVISION])('rejects overflow %s without a private scope', async value => {
    respond({ ...provisioner(purpose), workspaceIncarnation: value });
    const result = await resolveProvisionerScope(operator, 'test', purpose);
    expectProvisionerLookup(purpose);
    expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('scope');
  });
  it.each([ABOVE_JS_SAFE, MAX_INT8])('retains valid native-int8 text %s exactly in private scope facts', async value => {
    respond({ ...provisioner(purpose), workspaceIncarnation: value });
    const result = await resolveProvisionerScope(operator, 'test', purpose);
    expectProvisionerLookup(purpose);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('valid incarnation fixture was not issued');
    const facts = getProvisionerScopeFacts(result.scope);
    expect(facts.purpose).toBe(purpose); expect(facts.workspaceIncarnation).toBe(value);
    expect(Object.isFrozen(facts)).toBe(true); expect(Object.isFrozen(result.scope)).toBe(true);
    expect(Object.keys(result.scope)).toEqual(['kind']);
  });
});

describe('incarnation validation leaves other revision namespaces intact', () => {
  // Accepted Portal authority storage now pins these generations to positive
  // native int8. Preserve all three former overflow cases with stricter denial;
  // the five other tenant revisions and four operator revisions stay unchanged.
  it.each(['authorizationVersion', 'portalAccessVersion', 'capabilityPolicyRevision'] as const)(
    'rejects 78-digit Portal %s beyond its accepted native-int8 source', async field => {
      const fixture = tenants[0]; respond({ ...fixture.facts(), [field]: LONG_REVISION });
      const result = await fixture.resolve();
      expectLookup(fixture.role, fixture.expression, fixture.values);
      expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
    });
  const fields = [
    [1, 'deviceVersion'], [1, 'credentialVersion'], [1, 'pinVersion'],
    [2, 'authorizationVersion'], [3, 'workerGrantVersion'],
  ] as const;
  it.each(fields)('preserves 78-digit revision for tenant variant %s field %s', async (index, field) => {
    const fixture = tenants[index]; respond({ ...fixture.facts(), [field]: LONG_REVISION });
    const result = await fixture.resolve();
    expectLookup(fixture.role, fixture.expression, fixture.values);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('unrelated revision contract was narrowed');
    expect(getTenantProofFacts(result.proof)).toHaveProperty(field, LONG_REVISION);
    expect(getTenantProofFacts(result.proof).workspaceIncarnation).toBe('3');
  });
  it.each([...scopedPurposes, 'TENANT_BOOTSTRAP'] as const)('preserves 78-digit operator grant for %s', async purpose => {
    respond({ ...provisioner(purpose), operatorGrantVersion: LONG_REVISION });
    const result = await resolveProvisionerScope(operator, 'test', purpose);
    expectProvisionerLookup(purpose); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('operator grant revision contract was narrowed');
    expect(getProvisionerScopeFacts(result.scope).operatorGrantVersion).toBe(LONG_REVISION);
    expect(getProvisionerScopeFacts(result.scope).workspaceIncarnation).toBe(purpose === 'TENANT_BOOTSTRAP' ? null : '3');
  });
});

describe('bootstrap has no existing workspace incarnation', () => {
  it('retains SQL NULL incarnation for the genuine purpose-bound bootstrap scope', async () => {
    respond(provisioner('TENANT_BOOTSTRAP'));
    const result = await resolveProvisionerScope(operator, 'test', 'TENANT_BOOTSTRAP');
    expectProvisionerLookup('TENANT_BOOTSTRAP'); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('bootstrap null-incarnation fixture was not issued');
    expect(getProvisionerScopeFacts(result.scope)).toMatchObject({ purpose: 'TENANT_BOOTSTRAP',
      workspaceId: null, workspaceIncarnation: null, bootstrapNonce: 'bootstrap-a', sourceVersion: null,
      verifiedIdentityReference: null });
  });
  it.each(['1', ABOVE_JS_SAFE, MAX_INT8, MAX_INT8_PLUS_ONE, LONG_REVISION])('rejects nonnull bootstrap incarnation %s', async value => {
    respond({ ...provisioner('TENANT_BOOTSTRAP'), workspaceIncarnation: value });
    const result = await resolveProvisionerScope(operator, 'test', 'TENANT_BOOTSTRAP');
    expectProvisionerLookup('TENANT_BOOTSTRAP');
    expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('scope');
  });
});
