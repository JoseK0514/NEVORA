import { beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock('../db', () => ({ getDb: vi.fn(()=>{throw Error('legacy proof transport forbidden');}), getTenantRuntimeDb: () => db }));
import { resolvePortalProof, resolveCalendarReadProof } from './resolve.server';
import type { PortalProof } from './types';
const path = './query-contract';
const contract: typeof import('./query-contract') | null = await import(path).catch(() => null);
const digest = 'a'.repeat(64);
const facts = (workspaceId = 'tenant-a') => ({ authorityCurrent: true, kind: 'PORTAL', workspaceId,
  workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '1',
  resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00+00', locator: 'tenant-aa',
  employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
  authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest,
  sessionExpiresAt: '2026-10-09 12:01:00+00', role: 'EMPLOYEE', capabilityPolicyRevision: '3',
  capabilities: [], allowedLocationIds: ['location-a'], administrativeLocationIds: [] });
async function proof(workspaceId = 'tenant-a') {
  db.transaction.mockResolvedValue([[{ catalog_fence: '' }], [{ facts: facts(workspaceId) }], [{ guard: 1 }]]);
  const result = await resolvePortalProof('tenant-aa', digest);
  if (result.status !== 'ALLOW') throw new Error('fixture');
  return result.proof;
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  db.query.mockReset(); db.transaction.mockReset();
  // These are lazy transport plans, not proof constructors or database effects.
  // Awaiting a plan outside the resolver's one owning transaction must fail.
  db.query.mockImplementation((text: string, values: readonly unknown[]) => ({ text, values,
    then: () => { throw Error('fixture lookup plan awaited outside transaction'); } }));
});

describe('closed tenant statement contract', () => {
  it('retains genuine issuer facts through the fenced read-committed resolver prefix', async () => {
    const p = await proof();
    expect(db.query).toHaveBeenCalledTimes(3); expect(db.transaction).toHaveBeenCalledTimes(1);
    const [plans, options] = db.transaction.mock.calls[0];
    expect(options).toEqual({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
    expect(plans).toEqual(db.query.mock.results.map(result => result.value));
    expect(db.query.mock.calls[0][0]).toContain('pg_advisory_xact_lock_shared');
    expect(db.query.mock.calls[0][1]).toEqual([]);
    expect(db.query.mock.calls[1][0]).toContain('assert_runtime_role');
    expect(db.query.mock.calls[1][0]).toContain('resolve_portal');
    expect(db.query.mock.calls[1][1]).toEqual(['tenant-aa', digest]);
    expect(db.query.mock.calls[2][0]).toContain('assert_runtime_role');
    expect(db.query.mock.calls[2][1]).toEqual(['APP']);
    expect(JSON.stringify(p)).toBe('{"kind":"PORTAL"}');
    expect(contract!.compileTenantStatement(p, contract!.portalEmploymentSnapshot(p)).values).toEqual(['tenant-a', 'employee-a']);
  });
  it('implements named server builders', () => {
    expect(contract?.workspaceSnapshot).toBeTypeOf('function');
    expect(contract?.portalEmploymentSnapshot).toBeTypeOf('function');
  });
  it('binds workspace predicates to genuine server authority rather than request data', async () => {
    const p = await proof("tenant-'a");
    const statement = contract?.workspaceSnapshot(p);
    expect(statement).toBeDefined();
    const compiled = contract!.compileTenantStatement(p, statement!);
    expect(compiled.text).toContain('w.id = $1::text');
    expect(compiled.text).not.toContain("tenant-'a");
    expect(compiled.values).toEqual(["tenant-'a"]);
    expect(Object.isFrozen(compiled.values)).toBe(true);
  });
  it('binds employment self to both immutable tenant and actual employee ID', async () => {
    const p = await proof();
    const statement = contract?.portalEmploymentSnapshot(p);
    expect(statement).toBeDefined();
    const compiled = contract!.compileTenantStatement(p, statement!);
    expect(compiled.text).toContain('e.workspace_id = $1::text');
    expect(compiled.text).toContain('e.id = $2::text');
    expect(compiled.values).toEqual(['tenant-a', 'employee-a']);
  });
  it('rejects forged proofs and provisioner-like values before creating statements', () => {
    expect(() => contract!.workspaceSnapshot({ kind: 'PORTAL' } as PortalProof)).toThrow('tenant_proof_denied');
    expect(() => contract!.workspaceSnapshot({ kind: 'PROVISIONER' } as unknown as PortalProof)).toThrow('tenant_proof_denied');
  });
  it('rejects copied, serialized, proxy and prototype statement objects', async () => {
    const p = await proof(), statement = contract?.workspaceSnapshot(p);
    expect(statement).toBeDefined();
    for (const forged of [{ ...statement }, JSON.parse(JSON.stringify(statement)), new Proxy(statement!, {}), Object.create(statement!)]) {
      expect(() => contract!.compileTenantStatement(p, forged)).toThrow('tenant_statement_denied');
    }
  });
  it('rejects reuse under a different proof even within the same workspace', async () => {
    const a = await proof(), b = await proof(), foreign = await proof('tenant-b');
    const statement = contract?.workspaceSnapshot(a);
    expect(statement).toBeDefined();
    for (const p of [b, foreign]) expect(() => contract!.compileTenantStatement(p, statement!)).toThrow('tenant_statement_denied');
  });
  it('rejects a genuine calendar proof for portal metadata queries', async () => {
    db.transaction.mockResolvedValue([[{ catalog_fence: '' }], [{ facts: { ...facts(), kind: 'CALENDAR_READ', subscriptionId: 'sub-a', digest, generation: 'g-a' } }], [{ guard: 1 }]]);
    const result = await resolveCalendarReadProof(digest);
    expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fixture');
    expect(() => contract!.workspaceSnapshot(result.proof as unknown as PortalProof)).toThrow('tenant_statement_denied');
  });
  it('copies batch order and retains per-statement output decoding', async () => {
    const p = await proof();
    expect(contract).not.toBeNull();
    const statements = [contract!.workspaceSnapshot(p), contract!.portalEmploymentSnapshot(p)];
    const batch = contract!.tenantBatch(p, statements); statements.reverse(); statements.pop();
    expect(contract!.compileTenantBatch(p, batch).map(x => x.name)).toEqual(['WORKSPACE_SNAPSHOT', 'PORTAL_EMPLOYMENT_SNAPSHOT']);
  });
  it('rejects empty, forged and foreign batches without accepting raw SQL', async () => {
    const a = await proof(), b = await proof('tenant-b');
    expect(() => contract!.tenantBatch(a, [])).toThrow('tenant_statement_denied');
    expect(() => contract!.tenantBatch(a, [contract!.workspaceSnapshot(b)])).toThrow('tenant_statement_denied');
    expect(() => contract!.compileTenantBatch(a, { text: 'SELECT * FROM employees', values: [] })).toThrow('tenant_statement_denied');
  });
  it('does not expose proof facts or query recipes through enumerable statement fields', async () => {
    const p = await proof(), statement = contract?.workspaceSnapshot(p);
    expect(statement).toBeDefined();
    expect(JSON.stringify(statement)).toBe('{"name":"WORKSPACE_SNAPSHOT"}');
    expect(Object.isFrozen(statement)).toBe(true);
  });
  it('rejects expiry at compilation rather than relying on builder-time identity alone', async () => {
    const p = await proof(), statement = contract?.workspaceSnapshot(p);
    vi.setSystemTime(new Date('2026-10-09T12:01:00Z'));
    expect(() => contract!.compileTenantStatement(p, statement!)).toThrow('tenant_proof_denied');
  });
  it('rejects malformed or foreign rows rather than coercing an unavailable result to empty', async () => {
    const p = await proof(), statement = contract?.workspaceSnapshot(p);
    expect(statement).toBeDefined();
    const compiled = contract!.compileTenantStatement(p, statement!);
    for (const result of [null, { rows: [] }, [], [{ id: 'tenant-b', name: 'B', time_zone: 'UTC', active: true }]]) {
      expect(() => compiled.decode(result)).toThrow('tenant_result_unavailable');
    }
    expect(compiled.decode([{ id: 'tenant-a', name: 'A', time_zone: 'UTC', active: true }])).toEqual({ id: 'tenant-a', name: 'A', timeZone: 'UTC', active: true });
  });
});
