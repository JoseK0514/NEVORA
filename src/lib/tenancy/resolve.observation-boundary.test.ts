import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const database = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock('../db', () => ({ getTenantRuntimeDb: () => database }));
import { getTenantProofFacts, resolvePortalProof, resolveProvisionerScope } from './resolve.server';
import type { ProvisionerOperator } from './types';

// Fictional in-process SDK observations, never HTTP/native role/RLS authority.
const digest = 'a'.repeat(64);
function facts() {
  return { authorityCurrent: true, kind: 'PORTAL', workspaceId: 'tenant-a',
    workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993',
    resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00.123456+00',
    locator: 'tenant-aa', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
    authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest,
    sessionExpiresAt: '2026-10-09 12:01:00.123456+00', role: 'EMPLOYEE', capabilityPolicyRevision: '3',
    capabilities: ['profile.self.read'], allowedLocationIds: [' location-a ', '位置-β'],
    administrativeLocationIds: [], administrativeScope: null };
}
function response(value: unknown = facts()): unknown[] {
  return [[{ catalog_fence: '' }], [{ facts: value }], [{ guard: 1 }]];
}
async function resolve(value: unknown) {
  database.transaction.mockResolvedValue(value);
  return resolvePortalProof('tenant-aa', digest);
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  database.query.mockReset(); database.transaction.mockReset();
  database.query.mockImplementation((text, values) => ({ text, values,
    then() { throw Error('resolver query awaited outside transaction'); } }));
});
afterEach(() => vi.useRealTimers());

describe('resolver inspects inert owned transport data before reading metadata', () => {
  it('preserves normal data, exact text, private issuance and owning transaction', async () => {
    const row = facts(), result = await resolve(response(row));
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fictional parser fixture');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ workspaceVersion: row.workspaceVersion,
      workspaceIncarnation: row.workspaceIncarnation, allowedLocationIds: row.allowedLocationIds,
      capabilities: row.capabilities });
    expect(Object.keys(result.proof)).toEqual(['kind']);
    expect(database.query).toHaveBeenCalledTimes(3);
    expect(database.transaction).toHaveBeenCalledExactlyOnceWith(expect.any(Array),
      { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  });
  it.each(['SQL NULL', 'empty rows'])('preserves ordinary %s denial', async variant => {
    const value = response(null); if (variant === 'empty rows') value[1] = [];
    expect(await resolve(value)).toEqual({ status: 'DENY' });
  });
  it.each(['facts', 'lookup row'])('rejects a %s proxy before object metadata traps', async target => {
    let reads = 0;
    const proxy = new Proxy(target === 'facts' ? facts() : { facts: facts() }, {
      getPrototypeOf(value) { reads++; return Reflect.getPrototypeOf(value); },
      ownKeys(value) { reads++; return Reflect.ownKeys(value); },
    });
    const value = target === 'facts' ? response(proxy) : [[{ catalog_fence: '' }], [proxy], [{ guard: 1 }]];
    expect(await resolve(value)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it.each(['transaction', 'lookup rows', 'capabilities', 'allowedLocationIds', 'administrativeLocationIds'])
    ('rejects a %s array proxy before its length or iterator traps', async target => {
      let reads = 0; const row = facts(), value = response(row);
      const original = target === 'transaction' ? value : target === 'lookup rows' ? value[1] : row[target as keyof typeof row];
      if (!Array.isArray(original)) throw Error('fictional array target');
      const proxy = new Proxy(original, { get(object, key, receiver) {
        // Promise assimilation may inspect then before the resolver receives a
        // transaction result. Only metadata reads under test are counted.
        if (key === 'length' || key === Symbol.iterator) { reads++; throw Error('metadata proxy read'); }
        return Reflect.get(object, key, receiver);
      } });
      if (target === 'lookup rows') value[1] = proxy;
      else if (target !== 'transaction') Object.defineProperty(row, target, { value: proxy, enumerable: true });
      expect(await resolve(target === 'transaction' ? proxy : value)).toEqual({ status: 'UNAVAILABLE' });
      expect(reads).toBe(0);
    });
  it.each([0, 1, 2])('rejects transaction result accessor %i without executing it', async index => {
    const value = response(), original = value[index]; let reads = 0;
    Object.defineProperty(value, String(index), { enumerable: true, get() { reads++; return original; } });
    expect(await resolve(value)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it('rejects an inherited lookup row without executing its getter', async () => {
    let reads = 0; const inherited = Object.create(Array.prototype);
    Object.defineProperty(inherited, '0', { get() { reads++; return { facts: facts() }; } });
    const rows = Array(1); Object.setPrototypeOf(rows, inherited);
    const value = response(); value[1] = rows;
    expect(await resolve(value)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it.each(['capabilities', 'allowedLocationIds', 'administrativeLocationIds'])
    ('rejects %s element accessors without execution', async field => {
      let reads = 0; const row = facts();
      const values = [field === 'capabilities' ? 'profile.self.read' : '位置-β'];
      Object.defineProperty(values, '0', { enumerable: true, get() { reads++; return field === 'capabilities' ? 'profile.self.read' : '位置-β'; } });
      Object.defineProperty(row, field, { value: values, enumerable: true });
      expect(await resolve(response(row))).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
    });
  it('rejects a replacement list iterator before calling it', async () => {
    let reads = 0; const row = facts();
    Object.defineProperty(row.capabilities, Symbol.iterator, { value: function* () { reads++; yield 'profile.self.read'; } });
    expect(await resolve(response(row))).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it('preserves the existing ten-thousand location parser boundary', async () => {
    const row = facts(); row.allowedLocationIds = Array.from({ length: 10000 }, (_, i) => 'location-' + i);
    const result = await resolve(response(row)); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fictional list boundary');
    expect(getTenantProofFacts(result.proof)).toMatchObject({ allowedLocationIds: row.allowedLocationIds });
    row.allowedLocationIds.push('location-10000');
    expect(await resolve(response(row))).toEqual({ status: 'UNAVAILABLE' });
  });
  it('rejects a proxy operator before inspection or database construction', async () => {
    let reads = 0;
    const operator: ProvisionerOperator = { operatorId: 'operator-a', credentialDigest: digest,
      requestId: 'request-a', requestDigest: digest, operationId: 'operation-a', payloadDigest: digest };
    const proxy = new Proxy(operator, { getPrototypeOf(value) { reads++; return Reflect.getPrototypeOf(value); } });
    database.transaction.mockResolvedValue(response());
    expect(await resolveProvisionerScope(proxy, 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    expect(reads).toBe(0); expect(database.query).not.toHaveBeenCalled(); expect(database.transaction).not.toHaveBeenCalled();
  });
  it('rejects an enumerable symbol accessor before copying operator input', async () => {
    let reads = 0;
    const operator: ProvisionerOperator = { operatorId: 'operator-a', credentialDigest: digest,
      requestId: 'request-a', requestDigest: digest, operationId: 'operation-a', payloadDigest: digest };
    Object.defineProperty(operator, Symbol('fictional-extra'), { enumerable: true,
      get() { reads++; return 'fictional-symbol-value'; } });
    database.transaction.mockResolvedValue(response());
    expect(await resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    expect(reads).toBe(0); expect(database.query).not.toHaveBeenCalled(); expect(database.transaction).not.toHaveBeenCalled();
  });
});
