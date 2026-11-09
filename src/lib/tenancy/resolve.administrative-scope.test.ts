import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fictional SDK metadata exercises the real parser/private issuer. No native
// helper, database/current-proof/RLS/Neon or business authority is established.
vi.mock('server-only', () => ({}));
const database = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
const runtime = vi.hoisted(() => vi.fn(() => database));
vi.mock('../db', () => ({ getTenantRuntimeDb: runtime }));
import { getTenantProofFacts, resolvePortalProof } from './resolve.server';
import { createTenantExecutor } from './executor.server';
import { workspaceSnapshot } from './query-contract';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
import type { TenantProof } from './types';

const NOW = new Date('2026-10-09T12:00:00Z');
const tokenDigest = 'a'.repeat(64);
const FINAL_ROLE = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
const locations = (locationIds: unknown = ['location-a']) => ({ kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds });
const allTenant = (origin = 'LEGACY_COMPATIBILITY') => ({ kind: 'ALL_TENANT', origin });
function portal(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    authorityCurrent: true, kind: 'PORTAL', workspaceId: 'tenant-a',
    workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993',
    resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00.123456+00',
    locator: 'tenant-aa', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
    authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: tokenDigest,
    sessionExpiresAt: '2026-10-09 12:01:00.123456+00', role: 'MANAGER',
    capabilityPolicyRevision: '3', capabilities: ['employee.core.edit'],
    allowedLocationIds: ['location-a'], administrativeLocationIds: ['location-a'],
    administrativeScope: locations(), ...overrides,
  };
}
function respond(facts: unknown) {
  database.transaction.mockResolvedValue([[{ catalog_fence: '' }], [{ facts }], [{ guard: 1 }]]);
}
function expectLookup() {
  expect(runtime).toHaveBeenCalledExactlyOnceWith('APP');
  expect(database.query.mock.calls).toEqual([
    [RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []],
    ["SELECT CASE WHEN nevora_tenancy.assert_audited_runtime_role('APP'::text) IS TRUE THEN nevora_tenancy.resolve_portal($1::text,$2::text) ELSE NULL::jsonb END AS facts", ['tenant-aa', tokenDigest]],
    [FINAL_ROLE, ['APP']],
  ]);
  expect(database.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Array),
    { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
}
async function resolve(row: unknown) {
  respond(row);
  const result = await resolvePortalProof('tenant-aa', tokenDigest);
  expectLookup();
  return result;
}
async function rejected(row: unknown) {
  const result = await resolve(row);
  expect(result).toEqual({ status: 'UNAVAILABLE' });
  expect(result).not.toHaveProperty('proof');
}
function scopeOf(proof: TenantProof): unknown {
  const facts = getTenantProofFacts(proof);
  // Descriptor lookup works before the new type exists: absence is a real
  // feature assertion, not an import/type/setup failure.
  const descriptor = Object.getOwnPropertyDescriptor(facts, 'administrativeScope');
  expect(descriptor).toBeDefined();
  expect(descriptor).toHaveProperty('value');
  return descriptor?.value;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  runtime.mockClear(); database.query.mockReset(); database.transaction.mockReset();
  database.query.mockImplementation((text, values) => ({ text, values,
    then() { throw Error('resolver query awaited outside transaction'); } }));
});
afterEach(() => { vi.useRealTimers(); });

describe('explicit administrative scope is private, role-bound resolver metadata', () => {
  const padded = ['位置-β', ' location-a ', 'loc-e\u0301'];
  const valid = [
    ['Manager legacy tenant scope', portal({ administrativeScope: allTenant() })],
    ['Manager explicit tenant scope', portal({ administrativeScope: allTenant('EXPLICIT_GRANT') })],
    ['Manager explicit locations', portal()],
    ['Manager empty explicit locations without roster inference', portal({ administrativeScope: locations([]), administrativeLocationIds: [] })],
    ['Manager unordered byte-exact padded Unicode set', portal({ administrativeScope: locations(padded),
      administrativeLocationIds: [...padded].reverse(), allowedLocationIds: [...padded, 'not-administrative'] })],
    ['Owner nullable observation preserves fresh role', portal({ role: 'OWNER', administrativeScope: null })],
    ['Owner legacy tenant observation', portal({ role: 'OWNER', administrativeScope: allTenant() })],
    ['Owner explicit tenant observation', portal({ role: 'OWNER', administrativeScope: allTenant('EXPLICIT_GRANT') })],
    ['Owner explicit locations observation', portal({ role: 'OWNER' })],
    ['Lead null scope and no administrative locations', portal({ role: 'LEAD', administrativeScope: null, administrativeLocationIds: [] })],
    ['Employee null scope and no administrative locations', portal({ role: 'EMPLOYEE', administrativeScope: null, administrativeLocationIds: [] })],
  ] as const;
  it.each(valid)('%s', async (_name, row) => {
    const result = await resolve(row);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('valid explicit scope was not issued');
    const facts = getTenantProofFacts(result.proof);
    expect(facts.kind).toBe('PORTAL'); expect(facts).toHaveProperty('role', row.role);
    expect(scopeOf(result.proof)).toEqual(row.administrativeScope);
    expect(facts).toHaveProperty('administrativeLocationIds', row.administrativeLocationIds);
    expect(Object.isFrozen(facts)).toBe(true);
    const scope = scopeOf(result.proof);
    if (scope !== null) {
      expect(Object.isFrozen(scope)).toBe(true);
      const ids = Object.getOwnPropertyDescriptor(scope, 'locationIds');
      if (ids) expect(Object.isFrozen(ids.value)).toBe(true);
      else expect(Reflect.ownKeys(scope as object).sort()).toEqual(['kind', 'origin']);
    }
    expect(Object.keys(result.proof)).toEqual(['kind']);
    expect(JSON.stringify(result.proof)).toBe('{"kind":"PORTAL"}');
  });
  it('requires an owned Manager scope instead of inferring from permitted or administrative locations', async () => {
    const row = portal(); delete row.administrativeScope;
    await rejected(row);
  });
  it.each([undefined, null])('rejects Manager scope %s', async administrativeScope => {
    await rejected(portal({ administrativeScope }));
  });
  it('rejects inherited scope despite an otherwise ordinary null-prototype metadata row', async () => {
    const row = portal(); delete row.administrativeScope;
    Object.setPrototypeOf(row, { administrativeScope: allTenant() });
    await rejected(row);
  });
  it.each(['LEAD', 'EMPLOYEE'])('%s cannot gain a scope even with an empty administrative set', async role => {
    await rejected(portal({ role, administrativeScope: allTenant(), administrativeLocationIds: [] }));
  });
  it.each(['LEAD', 'EMPLOYEE'])('%s retains the existing nonempty administrative-set denial', async role => {
    await rejected(portal({ role, administrativeScope: null }));
  });
  it('Owner authority does not make malformed scope observations acceptable', async () => {
    await rejected(portal({ role: 'OWNER', administrativeScope: { kind: 'ALL_TENANT', origin: 'UNKNOWN' } }));
  });
});

describe('scope shape and exact location-set validation fail closed', () => {
  const malformed: readonly (readonly [string, unknown])[] = [
    ['unknown kind', { kind: 'TEAM', origin: 'EXPLICIT_GRANT' }],
    ['missing origin', { kind: 'ALL_TENANT' }],
    ['unknown origin', allTenant('UNKNOWN')],
    ['tenant scope with empty locations property', { ...allTenant(), locationIds: [] }],
    ['tenant scope with locations property', { ...allTenant(), locationIds: ['location-a'] }],
    ['extra scope property', { ...allTenant(), eligibility: true }],
    ['legacy locations origin', { ...locations(), origin: 'LEGACY_COMPATIBILITY' }],
    ['locations without list', { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT' }],
    ['null list', locations(null)], ['nonarray list', locations('location-a')],
    ['duplicate list', locations(['location-a', 'location-a'])],
    ['foreign list', locations(['location-foreign'])],
    ['empty mismatched list', locations([])],
    ['extra permitted but nonadministrative location', locations(['location-a', 'location-b'])],
    ['case difference', locations(['Location-a'])],
    ['padding difference', locations([' location-a '])],
    ['invalid control in ID', locations(['location-a\n'])],
    ['empty ID', locations([''])], ['nonstring ID', locations([1])],
    ['primitive scope', 'ALL_TENANT'], ['array scope', []],
    ['custom scope prototype', Object.assign(Object.create({ inherited: true }), allTenant())],
    ['inherited kind', Object.assign(Object.create({ kind: 'ALL_TENANT' }), { origin: 'EXPLICIT_GRANT' })],
  ];
  it.each(malformed)('rejects %s without issuing a proof', async (_name, administrativeScope) => {
    await rejected(portal({ administrativeScope, allowedLocationIds: ['location-a', 'location-b'] }));
  });
  it('does not normalize decomposed Unicode into a different location identity', async () => {
    await rejected(portal({ administrativeScope: locations(['loc-é']), administrativeLocationIds: ['loc-e\u0301'],
      allowedLocationIds: ['loc-é', 'loc-e\u0301'] }));
  });
  it('does not accept a matching scope outside allowed locations', async () => {
    await rejected(portal({ administrativeScope: locations(['foreign']), administrativeLocationIds: ['foreign'] }));
  });
  it('requires whole unordered-set equality instead of subset inclusion', async () => {
    await rejected(portal({ administrativeScope: locations(['location-a']),
      administrativeLocationIds: ['location-a', 'location-b'], allowedLocationIds: ['location-a', 'location-b'] }));
  });
});

describe('malformed nested objects and arrays execute no accessor or Proxy behavior', () => {
  it.each(['kind', 'origin', 'locationIds'])('rejects a scope %s getter without invoking it', async key => {
    let reads = 0;
    const scope = locations(); Object.defineProperty(scope, key, { enumerable: true, get() { reads++; throw Error('must not execute'); } });
    const result = await resolve(portal({ administrativeScope: scope }));
    expect(reads).toBe(0); expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
  it('retains outer owned-data-only metadata rejection without invoking the scope getter', async () => {
    let reads = 0; const row = portal();
    Object.defineProperty(row, 'administrativeScope', { enumerable: true, get() { reads++; throw Error('must not execute'); } });
    const result = await resolve(row);
    expect(reads).toBe(0); expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
  it('rejects an own list-index getter without invoking it', async () => {
    let reads = 0; const ids = ['location-a'];
    Object.defineProperty(ids, '0', { enumerable: true, get() { reads++; throw Error('must not execute'); } });
    const result = await resolve(portal({ administrativeScope: locations(ids) }));
    expect(reads).toBe(0); expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
  it('rejects a sparse location list', async () => {
    const ids = new Array(1); await rejected(portal({ administrativeScope: locations(ids) }));
  });
  it.each(['extra', 'symbol', 'hidden-extra'])('rejects %s list properties', async kind => {
    const ids = ['location-a'];
    Object.defineProperty(ids, kind === 'symbol' ? Symbol('unexpected') : 'extra', { value: true, enumerable: kind !== 'hidden-extra' });
    await rejected(portal({ administrativeScope: locations(ids) }));
  });
  it('rejects a custom list iterator without retrieving or invoking it', async () => {
    let reads = 0; const ids = ['location-a'];
    Object.defineProperty(ids, Symbol.iterator, { get() { reads++; throw Error('must not execute'); } });
    const result = await resolve(portal({ administrativeScope: locations(ids) }));
    expect(reads).toBe(0); expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
  it('rejects custom list prototype rather than trusting inherited array behavior', async () => {
    const ids = ['location-a']; Object.setPrototypeOf(ids, Object.create(Array.prototype));
    await rejected(portal({ administrativeScope: locations(ids) }));
  });
  it.each(['symbol', 'hidden-extra'])('rejects %s scope properties', async kind => {
    const scope = allTenant();
    Object.defineProperty(scope, kind === 'symbol' ? Symbol('unexpected') : 'extra', { value: true, enumerable: kind !== 'hidden-extra' });
    await rejected(portal({ administrativeScope: scope }));
  });
  it.each(['scope', 'list'])('rejects a %s Proxy before any trap', async kind => {
    let traps = 0;
    const fail = () => { traps++; throw Error('must not execute'); };
    const proxy = new Proxy(kind === 'scope' ? locations() : ['location-a'], {
      get: fail, getPrototypeOf: fail, ownKeys: fail, getOwnPropertyDescriptor: fail,
    });
    const result = await resolve(portal({ administrativeScope: kind === 'scope' ? proxy : locations(proxy) }));
    expect(traps).toBe(0); expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
  it.each(['scope', 'list'])('rejects a revoked %s Proxy without acquiring metadata', async kind => {
    const { proxy, revoke } = Proxy.revocable(kind === 'scope' ? locations() : ['location-a'], {}); revoke();
    await rejected(portal({ administrativeScope: kind === 'scope' ? proxy : locations(proxy) }));
  });
});

describe('issued scope facts remain immutable and do not become caller authority', () => {
  it('copies and freezes the nested scope/list while preserving original source bytes', async () => {
    const ids = [' location-a ', '位置-β'];
    const scope: Record<string, unknown> = locations(ids);
    const adminIds = [...ids].reverse(); const allowedIds = [...ids, 'unselected'];
    const result = await resolve(portal({ administrativeScope: scope, administrativeLocationIds: adminIds, allowedLocationIds: allowedIds }));
    expect(result.status).toBe('ALLOW'); if (result.status !== 'ALLOW') throw Error('copy fixture not issued');
    const facts = getTenantProofFacts(result.proof); const captured = scopeOf(result.proof);
    expect(captured).toEqual({ kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: [' location-a ', '位置-β'] });
    expect(captured).not.toBe(scope); expect(Object.isFrozen(captured)).toBe(true);
    const capturedIds = Object.getOwnPropertyDescriptor(captured, 'locationIds')?.value;
    expect(capturedIds).not.toBe(ids); expect(Object.isFrozen(capturedIds)).toBe(true);
    scope.kind = 'ALL_TENANT'; scope.origin = 'LEGACY_COMPATIBILITY'; ids[0] = 'foreign'; ids.push('other');
    adminIds.splice(0); allowedIds.splice(0);
    expect(scopeOf(result.proof)).toEqual({ kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: [' location-a ', '位置-β'] });
    expect(facts).toHaveProperty('administrativeLocationIds', ['位置-β', ' location-a ']);
    expect(facts).toHaveProperty('allowedLocationIds', [' location-a ', '位置-β', 'unselected']);
    expect(JSON.stringify(result.proof)).toBe('{"kind":"PORTAL"}');
  });
  it('keeps scope private and refuses serialized or scope-bearing cloned proofs', async () => {
    const result = await resolve(portal()); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('proof identity fixture not issued');
    expect(scopeOf(result.proof)).toEqual(locations()); expect(Object.isFrozen(result.proof)).toBe(true);
    expect(Object.keys(result.proof)).toEqual(['kind']);
    expect(() => getTenantProofFacts(JSON.parse(JSON.stringify(result.proof)))).toThrow('tenant_proof_denied');
    const scopeBearingClone = { ...result.proof, administrativeScope: locations() };
    expect(() => getTenantProofFacts(scopeBearingClone)).toThrow('tenant_proof_denied');
    expect(scopeOf(result.proof)).toEqual(locations());
  });
  it('carries explicit frozen scope through real executor facts serialization without changing its final guard', async () => {
    const result = await resolve(portal()); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('executor fixture not issued');
    database.query.mockClear(); database.transaction.mockClear(); runtime.mockClear();
    database.transaction.mockResolvedValue([[{ catalog_fence: '' }], [{ guard: 1 }], [], [{ guard: 1 }],
      [{ id: 'tenant-a', name: 'Fictional workspace', time_zone: 'UTC', active: true }], [{ guard: 1 }], [{ guard: 1 }]]);
    const value = await createTenantExecutor(result.proof).query(workspaceSnapshot(result.proof));
    expect(value).toEqual({ id: 'tenant-a', name: 'Fictional workspace', timeZone: 'UTC', active: true });
    expect(database.query.mock.calls).toHaveLength(7);
    const calls = database.query.mock.calls;
    expect(calls[0]).toEqual([RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []]);
    expect(calls[1]).toEqual([FINAL_ROLE, ['APP']]); expect(calls[6]).toEqual([FINAL_ROLE, ['APP']]);
    expect(calls[3][0]).toBe('SELECT 1 / CASE WHEN nevora_tenancy.lock_and_assert_current_proof($1::jsonb) IS TRUE THEN 1 ELSE 0 END AS guard');
    expect(calls[5][0]).toBe('SELECT 1 / CASE WHEN nevora_tenancy.assert_current_proof($1::jsonb) IS TRUE THEN 1 ELSE 0 END AS guard');
    expect(calls[3][1]).toEqual(calls[5][1]);
    expect(JSON.parse(calls[3][1][0])).toHaveProperty('administrativeScope', locations());
    expect(Object.isFrozen(scopeOf(result.proof))).toBe(true);
    expect(database.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Array),
      { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  });
});
