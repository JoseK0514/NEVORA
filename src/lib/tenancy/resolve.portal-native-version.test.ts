import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Fictional SDK rows exercise the actual metadata parser and private issuer.
// They prove no native role/helper/current-proof/RLS/Neon or database authority.
vi.mock('server-only', () => ({}));
const database = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
const runtime = vi.hoisted(() => vi.fn(() => database));
vi.mock('../db', () => ({ getTenantRuntimeDb: runtime }));
import { getTenantProofFacts, resolvePortalProof } from './resolve.server';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';

const NOW = new Date('2026-10-09T12:00:00Z');
const tokenDigest = 'a'.repeat(64);
// Independent hand-checked positive PostgreSQL int8 boundary literals.
const MAX_INT8 = '9223372036854775807';
const ABOVE_JS_SAFE = '9007199254740993';
const fields = ['authorizationVersion', 'portalAccessVersion', 'capabilityPolicyRevision'] as const;
const FINAL_ROLE = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
function portal(): Record<string, unknown> {
  return {
    authorityCurrent: true, kind: 'PORTAL', workspaceId: 'tenant-a',
    workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: ABOVE_JS_SAFE,
    resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00.123456+00',
    locator: 'tenant-aa', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
    authorizationVersion: '4', portalAccessVersion: '2', capabilityPolicyRevision: '3',
    sessionTokenHash: tokenDigest, sessionExpiresAt: '2026-10-09 12:01:00.123456+00', role: 'MANAGER',
    capabilities: ['employee.core.edit'], allowedLocationIds: ['location-a'], administrativeLocationIds: ['location-a'],
    administrativeScope: { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['location-a'] },
  };
}
async function resolve(row: unknown) {
  database.transaction.mockResolvedValue([[{ catalog_fence: '' }], [{ facts: row }], [{ guard: 1 }]]);
  const result = await resolvePortalProof('tenant-aa', tokenDigest);
  expect(runtime).toHaveBeenCalledExactlyOnceWith('APP');
  expect(database.query.mock.calls).toEqual([
    [RUNTIME_CATALOG_SHARED_FENCE_SQL.text, []],
    ["SELECT CASE WHEN nevora_tenancy.assert_audited_runtime_role('APP'::text) IS TRUE THEN nevora_tenancy.resolve_portal($1::text,$2::text) ELSE NULL::jsonb END AS facts", ['tenant-aa', tokenDigest]],
    [FINAL_ROLE, ['APP']],
  ]);
  expect(database.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Array),
    { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  return result;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  runtime.mockClear(); database.query.mockReset(); database.transaction.mockReset();
  database.query.mockImplementation((text, values) => ({ text, values,
    then() { throw Error('resolver query awaited outside transaction'); } }));
});
afterEach(() => { vi.useRealTimers(); });

describe.each(fields)('portal positive native-int8 %s', field => {
  it.each(['1', ABOVE_JS_SAFE, MAX_INT8])('preserves canonical primitive text %s without rounding or coercion', async value => {
    const row = portal(); row[field] = value;
    const result = await resolve(row);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('valid native-int8 portal fixture not issued');
    const facts = getTenantProofFacts(result.proof);
    expect(facts.kind).toBe('PORTAL'); expect(facts).toHaveProperty(field, value);
    expect(typeof Object.getOwnPropertyDescriptor(facts, field)?.value).toBe('string');
    expect(facts.workspaceIncarnation).toBe(ABOVE_JS_SAFE);
    for (const other of fields) if (other !== field) expect(facts).toHaveProperty(other, row[other]);
    expect(facts).toHaveProperty('administrativeScope', row.administrativeScope);
    expect(Object.isFrozen(facts)).toBe(true); expect(Object.isFrozen(result.proof)).toBe(true);
    expect(Object.keys(result.proof)).toEqual(['kind']); expect(JSON.stringify(result.proof)).toBe('{"kind":"PORTAL"}');
  });
  const invalid: readonly (readonly [string, unknown])[] = [
    ['max plus one', '9223372036854775808'],
    ['78-digit generic revision', '9'.repeat(78)],
    ['zero', '0'], ['negative', '-1'], ['leading zero', '01'],
    ['leading padding', ' 1'], ['trailing padding', '1 '],
    ['exponent', '1e3'], ['decimal spelling', '1.0'],
    ['primitive number', 1], ['rounded unsafe number', Number(ABOVE_JS_SAFE)],
    ['BigInt', BigInt('1')], ['boxed string', Object('1')],
    ['null', null], ['undefined', undefined],
  ];
  it.each(invalid)('rejects %s with generic unavailability and no private proof', async (_name, value) => {
    const row = portal(); row[field] = value;
    const result = await resolve(row);
    expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
  it('requires the owned version field rather than defaulting an omitted value', async () => {
    const row = portal(); delete row[field];
    const result = await resolve(row);
    expect(result).toEqual({ status: 'UNAVAILABLE' }); expect(result).not.toHaveProperty('proof');
  });
});
