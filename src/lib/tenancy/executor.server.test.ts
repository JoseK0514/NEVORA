import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { types as nodeTypes } from 'node:util';
import { transpileModule, ScriptTarget } from 'typescript';
vi.mock('server-only', () => ({}));
const db = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn() }));
vi.mock('../db', () => ({ getDb: vi.fn(()=>{throw Error('legacy proof transport forbidden');}), getTenantRuntimeDb: vi.fn(() => db) }));
import { getTenantRuntimeDb } from '../db';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
import { resolvePortalProof } from './resolve.server';
import type { PortalProof } from './types';
const cp = './query-contract', ep = './executor.server';
const c: typeof import('./query-contract') | null = await import(cp).catch(() => null);
const e: typeof import('./executor.server') | null = await import(ep).catch(() => null);
const digest = 'a'.repeat(64);
async function proof(workspaceId = 'tenant-a') {
  db.query.mockImplementation((text, values) => ({ text, values, then: () => { throw Error('query awaited outside transaction'); } }));
  db.transaction.mockResolvedValueOnce([[{ catalog_fence: '' }], [{ facts: { authorityCurrent: true, kind: 'PORTAL', workspaceId,
    workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993',
    resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00+00', locator: 'tenant-aa',
    employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
    authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest,
    sessionExpiresAt: '2026-10-09 12:01:00+00', role: 'EMPLOYEE', capabilityPolicyRevision: '3',
    capabilities: [], allowedLocationIds: ['location-a'], administrativeLocationIds: [], administrativeScope: null } }], [{ guard: 1 }]]);
  const result = await resolvePortalProof('tenant-aa', digest);
  if (result.status !== 'ALLOW') throw Error('fixture');
  const lookup = db.transaction.mock.calls.at(-1)!;
  expect(lookup[0]).toHaveLength(3); expect(lookup[0][0].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
  expect(lookup[0][1].text).toContain('resolve_portal'); expect(lookup[0][2].text).toContain('assert_audited_runtime_role');
  db.transaction.mockReset();
  db.query.mockReset();
  db.query.mockImplementation((text, values) => ({ text, values, then: () => { throw Error('query awaited outside transaction'); } }));
  return result.proof;
}
const workspaceRows = (id = 'tenant-a') => [{ id, name: 'Fictional', time_zone: 'UTC', active: true }];
const guardedResults = (rows: unknown[][]) => [[{ catalog_fence: '' }], [{ guard: 1 }], [{ context: 'ignored-internal' }], [{ guard: 1 }], ...rows, [{ guard: 1 }], [{ guard: 1 }]];
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  db.query.mockReset(); db.transaction.mockReset(); vi.mocked(getTenantRuntimeDb).mockClear();
});

describe('tenant executor noninteractive transaction boundary', () => {
  it.each(['row field', 'array index', 'accessor value'])('rejects inherited descriptor %s in an isolated prototype fixture', scenario => {
    // Evaluate the actual private validator in its own realm so pollution never
    // touches this worker, the issuer or production exports. This is response
    // shape evidence; no held lock, SQL or tenant authority is inferred.
    const source = readFileSync(resolve('src/lib/tenancy/executor.server.ts'), 'utf8');
    const start = source.indexOf('function fenceResult('), end = source.indexOf('function principal(', start);
    expect(start >= 0 && end > start).toBe(true);
    const validator = transpileModule(source.slice(start, end), { compilerOptions: { target: ScriptTarget.ES2022 } }).outputText;
    const fixtures = {
      'row field': `Object.defineProperty(Object.prototype,'catalog_fence',{value:{value:''},writable:true,configurable:true}); input=[{unexpected:1}];`,
      'array index': `input=new Array(1);input.unexpected=1;Object.defineProperty(Object.prototype,'0',{value:{value:{catalog_fence:''}},writable:true,configurable:true});`,
      'accessor value': `input=[Object.defineProperty({},'catalog_fence',{enumerable:true,get(){throw Error('getter must not run');}})];Object.defineProperty(Object.prototype,'value',{value:'',writable:true,configurable:true});`,
    };
    const observed = runInNewContext(validator + `\nconst ordinary=fenceResult([{catalog_fence:''}]);let input;${fixtures[scenario as keyof typeof fixtures]}\n({ordinary,malformed:fenceResult(input)});`, { nodeTypes });
    expect(observed.ordinary).toBe(true); expect(observed.malformed).toBe(false);
  });
  it('waits for the single transaction containing the first fence before exposing decoded business data', async () => {
    const p = await proof();
    let resolve!: (value: unknown) => void;
    db.transaction.mockImplementation(() => new Promise(done => { resolve = done; }));
    let settled = false;
    const pending = e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p)).then(value => { settled = true; return value; });
    await Promise.resolve();
    expect(settled).toBe(false); expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.transaction.mock.calls[0][0][0].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
    resolve(guardedResults([workspaceRows()]));
    await expect(pending).resolves.toMatchObject({ id: 'tenant-a' });
  });
  it('denies a first-fence transaction error without decoding, replaying or leaking diagnostics', async () => {
    const p = await proof(); db.transaction.mockRejectedValue(Error('private-fence-diagnostic'));
    await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_execution_unavailable');
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(db.transaction.mock.calls[0][0][0].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
  });
  it.each(['first', 'final'] as const)('requires the %s audited graph check when fictional primitive identity succeeds', async position => {
    const p = await proof(); let decoded = 0;
    const row = new Proxy(workspaceRows()[0], { getPrototypeOf(target) { decoded++; return Reflect.getPrototypeOf(target); } });
    // The real executor, proof issuer and closed builder remain in use. Only
    // transport outcomes are fictional: primitive identity succeeds, while
    // the audited graph denies at the selected point. No native guard,
    // database graph, current-proof or tenant authorization is verified here.
    db.transaction.mockImplementation(async (queries: { text: string; values: unknown[] }[]) => {
      const deniedIndex = position === 'first' ? 1 : queries.length - 1;
      const results = guardedResults([[row]]);
      for (let index = 0; index < queries.length; index++) {
        if (index === deniedIndex && queries[index].text.includes('nevora_tenancy.assert_audited_runtime_role(')) {
          throw Error('fictional-private-audited-graph-diagnostic');
        }
      }
      return results;
    });
    const outcome = await e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p)).then(
      value => ({ status: 'EXPOSED', value }),
      (error: Error) => ({ status: 'UNAVAILABLE', message: error.message }),
    );
    expect(outcome).toEqual({ status: 'UNAVAILABLE', message: 'tenant_execution_unavailable' });
    expect(decoded).toBe(0); expect(db.transaction).toHaveBeenCalledTimes(1);
    const [queries, options] = db.transaction.mock.calls[0];
    expect(queries[0]).toMatchObject({ text: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, values: [] });
    expect(queries[1].text).toContain('nevora_tenancy.assert_audited_runtime_role(');
    expect(queries.at(-1).text).toContain('nevora_tenancy.assert_audited_runtime_role(');
    expect(queries[1].values).toEqual(['APP']); expect(queries.at(-1).values).toEqual(['APP']);
    expect(options).toMatchObject({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  });
  it.each([
    ['absent rows', []], ['SQL NULL', [{ catalog_fence: null }]], ['nonempty void', [{ catalog_fence: 'locked' }]],
    ['wrong alias', [{ guard: '' }]], ['boolean', [{ catalog_fence: true }]],
    ['multiple rows', [{ catalog_fence: '' }, { catalog_fence: '' }]],
    ['extra field', [{ catalog_fence: '', guard: 1 }]], ['array row', [['']]], ['missing field', [{}]],
    ['primitive row', ['']], ['non-row result', null],
  ])('denies malformed fence wire shape %s before the business decoder', async (_label, bad) => {
    const p = await proof(); let decoded = 0;
    const row = new Proxy(workspaceRows()[0], { getPrototypeOf(target) { decoded++; return Reflect.getPrototypeOf(target); } });
    db.transaction.mockResolvedValue([bad, ...guardedResults([[row]]).slice(1)]);
    await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_execution_unavailable');
    expect(decoded).toBe(0); expect(db.transaction).toHaveBeenCalledTimes(1);
  });
  it('rejects accessor and proxy fence rows without invoking their behavior', async () => {
    const p = await proof(); let touches = 0;
    const accessor = Object.defineProperty({}, 'catalog_fence', { enumerable: true, get() { touches++; return ''; } });
    const proxy = new Proxy({ catalog_fence: '' }, { getOwnPropertyDescriptor() { touches++; throw Error('private-proxy'); } });
    const revoked = Proxy.revocable({ catalog_fence: '' }, {}); revoked.revoke();
    for (const bad of [[accessor], [proxy], [revoked.proxy]]) {
      db.transaction.mockResolvedValue([bad, ...guardedResults([workspaceRows()]).slice(1)]);
      await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_execution_unavailable');
    }
    expect(touches).toBe(0);
  });
  it('rejects cancellation after a blocked transaction without returning business data', async () => {
    const p = await proof(), controller = new AbortController(); let resolve!: (value: unknown) => void;
    db.transaction.mockImplementation(() => new Promise(done => { resolve = done; }));
    const pending = e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p), { signal: controller.signal });
    controller.abort('private-abort-reason'); resolve(guardedResults([workspaceRows()]));
    await expect(pending).rejects.toMatchObject({ name: 'AbortError', message: 'tenant_execution_aborted' });
    expect(db.transaction).toHaveBeenCalledTimes(1); expect(db.transaction.mock.calls[0][1].fetchOptions.signal).toBe(controller.signal);
  });
  it('rechecks the current runtime role after business and proof guards before returning data', async () => {
    const p=await proof();db.transaction.mockResolvedValue(guardedResults([workspaceRows()]));
    await e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p));
    const queries=db.transaction.mock.calls[0][0];
    expect(queries.filter((query:{text:string})=>query.text.includes('assert_audited_runtime_role'))).toHaveLength(2);
    expect(queries.at(-1).text).toContain('assert_audited_runtime_role');expect(queries.at(-1).values).toEqual(['APP']);
    expect(queries.at(-2).text).toContain('assert_current_proof');
  });
  it('rejects a role rejection at the end of the batch without replaying or exposing business data', async () => {
    const p=await proof();
    db.transaction.mockImplementation(async queries=>{
      const count=queries.filter((query:{text:string})=>query.text.includes('assert_audited_runtime_role')).length;
      if(count===2)throw Error('fictional-current-role-rejection');
      return guardedResults([workspaceRows()]);
    });
    await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_execution_unavailable');
    expect(db.transaction).toHaveBeenCalledTimes(1);
  });
  it('rejects malformed final runtime-role results after otherwise valid business and proof results', async () => {
    const p=await proof();
    for(const bad of [[{guard:0}],[{guard:null}],[],[{guard:1},{guard:1}]]){
      db.transaction.mockImplementation(async queries=>queries.map((query:{text:string},index:number)=>index===4?workspaceRows():
        index===0?[{catalog_fence:''}]:index===2?[{context:'ignored'}]:index===queries.length-1&&query.text.includes('assert_audited_runtime_role')?bad:[{guard:1}]));
      await expect(e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p))).rejects.toThrow('tenant_execution_unavailable');
    }
  });
  it('rejects forged proof before creating a runtime transport', () => {
    expect(() => e!.createTenantExecutor({ kind: 'PORTAL' } as PortalProof)).toThrow('tenant_proof_denied');
    expect(getTenantRuntimeDb).not.toHaveBeenCalled();
  });
  it('submits an unawaited shared catalog fence first, then role, context, proof and business in one batch', async () => {
    const p = await proof(); db.transaction.mockResolvedValue(guardedResults([workspaceRows()]));
    expect(e).not.toBeNull();
    const output = await e!.createTenantExecutor(p).query(c!.workspaceSnapshot(p));
    expect(output).toEqual({ id: 'tenant-a', name: 'Fictional', timeZone: 'UTC', active: true });
    expect(db.transaction).toHaveBeenCalledTimes(1);
    const [queries, options] = db.transaction.mock.calls[0];
    expect(queries).toHaveLength(7);
    expect(queries[0]).toMatchObject({ text: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, values: [] });
    expect(queries[1].text).toContain('assert_audited_runtime_role');
    expect(queries[1].values).toEqual(['APP']);
    expect(queries[2].text).toContain("set_config('nevora.workspace_id', $1::text, true)");
    expect(queries[2].values.slice(0, 2)).toEqual(['tenant-a', 'PORTAL']);
    expect(queries[3].text).toContain('lock_and_assert_current_proof');
    expect(queries[4].text).toContain('WHERE w.id = $1::text');
    expect(queries[5].text).toContain('assert_current_proof');
    expect(queries[6].text).toContain('assert_audited_runtime_role');expect(queries[6].values).toEqual(['APP']);
    expect(options).toMatchObject({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
    const bound = JSON.parse(queries[3].values[0]);
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
    db.transaction.mockImplementation(async (queries) => guardedResults([workspaceRows(queries[4].values[0])]));
    const results = await Promise.all([e!.createTenantExecutor(a).query(c!.workspaceSnapshot(a)), e!.createTenantExecutor(b).query(c!.workspaceSnapshot(b))]);
    expect(results.map(x => x.id)).toEqual(['tenant-a', 'tenant-b']);
    expect(db.transaction.mock.calls.map(call => call[0][2].values[0])).toEqual(['tenant-a', 'tenant-b']);
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
    for (const result of [[], guardedResults([workspaceRows()]).slice(0, -1), [...guardedResults([workspaceRows()]).slice(0, 1), [{ guard: 0 }], ...guardedResults([workspaceRows()]).slice(2)]]) {
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
