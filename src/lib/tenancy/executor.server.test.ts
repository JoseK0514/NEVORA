import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock('../db', () => ({ getDb: () => db, getTenantRuntimeDb: vi.fn(() => db) }));
import { getTenantRuntimeDb } from '../db';
import { resolvePortalProof } from './resolve.server';
import type { PortalProof } from './types';
const cp = './query-contract', ep = './executor.server';
const c: typeof import('./query-contract') | null = await import(cp).catch(() => null);
const e: typeof import('./executor.server') | null = await import(ep).catch(() => null);
const digest = 'a'.repeat(64);
async function proof(workspaceId = 'tenant-a') {
  db.query.mockResolvedValue([{ facts: { authorityCurrent: true, kind: 'PORTAL', workspaceId,
    workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993',
    resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00+00', locator: 'tenant-aa',
    employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
    authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest,
    sessionExpiresAt: '2026-10-09 12:01:00+00', role: 'EMPLOYEE', capabilityPolicyRevision: '3',
    capabilities: [], allowedLocationIds: ['location-a'], administrativeLocationIds: [] } }]);
  const result = await resolvePortalProof('tenant-aa', digest);
  if (result.status !== 'ALLOW') throw Error('fixture');
  db.query.mockReset();
  db.query.mockImplementation((text, values) => ({ text, values, then: () => { throw Error('query awaited outside transaction'); } }));
  return result.proof;
}
const workspaceRows = (id = 'tenant-a') => [{ id, name: 'Fictional', time_zone: 'UTC', active: true }];
const guardedResults = (rows: unknown[][]) => [[{ guard: 1 }], [{ context: 'ignored-internal' }], [{ guard: 1 }], ...rows, [{ guard: 1 }]];
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  db.query.mockReset(); db.transaction.mockReset(); vi.mocked(getTenantRuntimeDb).mockClear();
});

describe('tenant executor noninteractive transaction boundary', () => {
  it('rejects forged proof before creating a runtime transport', () => {
    expect(() => e!.createTenantExecutor({ kind: 'PORTAL' } as PortalProof)).toThrow('tenant_proof_denied');
    expect(getTenantRuntimeDb).not.toHaveBeenCalled();
  });
  it('submits role, local context, locked current proof, business SQL and final current proof in one batch', async () => {
    const p = await proof(); db.transaction.mockResolvedValue(guardedResults([workspaceRows()]));
    expect(e).not.toBeNull();
    const output = await e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p));
    expect(output).toEqual({ id: 'tenant-a', name: 'Fictional', timeZone: 'UTC', active: true });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    const [queries, options] = db.transaction.mock.calls[0];
    expect(queries).toHaveLength(5);
    expect(queries[0].text).toContain('assert_runtime_role');
    expect(queries[0].values).toEqual(['APP']);
    expect(queries[1].text).toContain("set_config('nevora.workspace_id', $1::text, true)");
    expect(queries[1].values.slice(0, 2)).toEqual(['tenant-a', 'PORTAL']);
    expect(queries[2].text).toContain('lock_and_assert_current_proof');
    expect(queries[3].text).toContain('WHERE w.id = $1::text');
    expect(queries[4].text).toContain('assert_current_proof');
    expect(options).toMatchObject({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
    const bound = JSON.parse(queries[2].values[0]);
    expect(bound.workspaceIncarnation).toBe('9007199254740993');
    expect(bound.workspaceVersion).toBe('2026-10-08 10:00:00.123456+00');
  });
  it('strips internal guard rows and preserves ordered business result indexes', async () => {
    const p = await proof();
    db.transaction.mockResolvedValue(guardedResults([workspaceRows(), [{ id: 'employee-a', first_name: 'A', last_name: 'B', role: 'EMPLOYEE', active: true }]]));
    const result = await e!.createTenantExecutor(p).transaction(c!.tenantBatch(p, [c!.workspaceSnapshot(p), c!.portalEmploymentSnapshot(p)]));
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ id: 'tenant-a' }); expect(result[1]).toMatchObject({ id: 'employee-a' });
    expect(result).not.toContainEqual([{ guard: 1 }]);
  });
  it('never accepts raw or cross-proof SQL before transport', async () => {
    const a = await proof(), b = await proof('tenant-b');
    const executor = e!.createTenantExecutor(a);
    await expect(executor.query({ text: 'SELECT * FROM employees' } as never)).rejects.toThrow('tenant_statement_denied');
    await expect(executor.query(c!.workspaceSnapshot(b))).rejects.toThrow('tenant_statement_denied');
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('binds each concurrent executor to its own proof without mutable active-tenant state', async () => {
    const a = await proof(), b = await proof('tenant-b');
    db.transaction.mockImplementation(async (queries) => guardedResults([workspaceRows(queries[3].values[0])]));
    const results = await Promise.all([e!.createTenantExecutor(a).query(c!.workspaceSnapshot(a)), e!.createTenantExecutor(b).query(c!.workspaceSnapshot(b))]);
    expect(results.map(x => x.id)).toEqual(['tenant-a', 'tenant-b']);
    expect(db.transaction.mock.calls.map(call => call[0][1].values[0])).toEqual(['tenant-a', 'tenant-b']);
  });
  it('passes cancellation to the actual transaction and rejects already aborted work', async () => {
    const p = await proof(), controller = new AbortController();
    db.transaction.mockResolvedValue(guardedResults([workspaceRows()]));
    await e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p), { signal: controller.signal });
    expect(db.transaction.mock.calls[0][1].fetchOptions.signal).toBe(controller.signal);
    controller.abort('do-not-expose-reason'); db.transaction.mockClear();
    await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p), { signal: controller.signal })).rejects.toThrow('tenant_execution_aborted');
    expect(db.transaction).not.toHaveBeenCalled();
  });
  it('does not replay failed transactions or leak database diagnostics', async () => {
    const p = await proof(); db.transaction.mockRejectedValue(new Error('private-credential-marker'));
    await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_execution_unavailable');
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
  it('requires exact result cardinality and successful guard rows', async () => {
    const p = await proof(), executor = e!.createTenantExecutor(p), statement = c!.workspaceSnapshot(p);
    for (const result of [[], guardedResults([workspaceRows()]).slice(0, -1), [[{ guard: 0 }], ...guardedResults([workspaceRows()]).slice(1)]]) {
      db.transaction.mockResolvedValue(result);
      await expect(executor.query(statement)).rejects.toThrow('tenant_execution_unavailable');
    }
  });
  it('rejects a proof that expires while waiting before returning data', async () => {
    const p = await proof();
    db.transaction.mockImplementation(async () => { vi.setSystemTime(new Date('2026-10-09T12:01:00Z')); return guardedResults([workspaceRows()]); });
    await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_proof_denied');
  });
});
