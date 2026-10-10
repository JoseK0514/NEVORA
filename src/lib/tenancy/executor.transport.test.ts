import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
// Installed SDK 1.1.0 and real serialization/parsers; every HTTP call is
// intercepted here. This is a local wire contract, never actual Neon proof.
type Query = { query: string; params: string[] };
type Request = { query?: string; params?: string[]; queries?: Query[] };
const requests: { url: string; body: Request; options: RequestInit }[] = [];
const digest = 'a'.repeat(64);
const facts = { authorityCurrent: true, kind: 'PORTAL', workspaceId: 'tenant-a',
  workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993',
  resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00+00', locator: 'tenant-aa',
  employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
  authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest,
  sessionExpiresAt: '2026-10-09 12:01:00+00', role: 'EMPLOYEE', capabilityPolicyRevision: '3',
  capabilities: [], allowedLocationIds: ['location-a'], administrativeLocationIds: [] };
const workerIdentity = { workerId: 'worker-a', credentialDigest: digest, environment: 'test' as const };
const workerClaim = { deliveryId: 'delivery-a', generation: 'generation-a', leaseToken: 'fictional-lease-token-a' };
const workerFacts = { authorityCurrent: true, kind: 'WORKER', workspaceId: facts.workspaceId,
  workspaceVersion: facts.workspaceVersion, workspaceIncarnation: facts.workspaceIncarnation,
  resolvedAt: facts.resolvedAt, expiresAt: facts.expiresAt,
  workerId: workerIdentity.workerId, workerCredentialDigest: digest, workerGrantVersion: '2', environment: 'test',
  deliveryId: workerClaim.deliveryId, intentId: 'intent-a', subscriptionId: 'subscription-a', generation: workerClaim.generation,
  leaseTokenHash: createHash('sha256').update(workerClaim.leaseToken).digest('hex'), leaseExpiresAt: facts.expiresAt };
const cell = (name: string, dataTypeID: number) => ({ name, dataTypeID });
const result = (fields: ReturnType<typeof cell>[], rows: (string | null)[][]) => ({ fields, rows, command: 'SELECT', rowCount: rows.length });
const guard = () => result([cell('guard', 23)], [['1']]);
let databaseFailure = false;
let finalRoleFailure = false;
let fenceFailure = false;
let fenceResponse: ReturnType<typeof result> | null = null;
let fenceGate: Promise<void> | null = null;
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  requests.length = 0; databaseFailure = false; finalRoleFailure = false; fenceFailure = false; fenceResponse = null; fenceGate = null;
  vi.stubEnv('DATABASE_URL', 'postgresql://fictional_resolver:fictional_password@ep-fictional-resolver.us-east-1.aws.neon.tech/fictional_fixture');
  vi.stubEnv('NEVORA_APP_DATABASE_URL', 'postgresql://fictional_app:fictional_password@ep-fictional-app.us-east-1.aws.neon.tech/fictional_fixture');
  vi.stubEnv('NEVORA_WORKER_DATABASE_URL', 'postgresql://fictional_worker:fictional_password@ep-fictional-worker.us-east-1.aws.neon.tech/fictional_fixture');
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
    if (!/^https:\/\/api\.us-east-1\.aws\.neon\.tech\/sql$/.test(String(url))) throw Error('Unexpected mocked transport URL');
    const body: Request = JSON.parse(String(options.body)); requests.push({ url: String(url), body, options });
    if (!body.queries) throw Error('Unexpected standalone query');
    const lookup = body.queries[1]?.query;
    if (lookup?.includes('resolve_portal') || lookup?.includes('resolve_worker')) {
      expect(body.queries).toHaveLength(3);
      expect(body.queries[0]).toEqual({ query: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, params: [] });
      expect(body.queries[2].query).toContain('assert_audited_runtime_role');
      const lookupFacts = lookup.includes('resolve_worker') ? workerFacts : facts;
      return new Response(JSON.stringify({ results: [result([cell('catalog_fence', 2278)], [['']]),
        result([cell('facts', 3802)], [[JSON.stringify(lookupFacts)]]), guard()] }), { status: 200 });
    }
    if (body.queries[0].query === RUNTIME_CATALOG_SHARED_FENCE_SQL.text) {
      if (fenceGate) await fenceGate;
      if (fenceFailure) return new Response(JSON.stringify({ message: 'private-fence-marker', code: '42501' }), { status: 400 });
    }
    if (databaseFailure) return new Response(JSON.stringify({ message: 'private-database-marker', code: '42501' }), { status: 400 });
    if(finalRoleFailure&&body.queries.filter(q=>q.query.includes('assert_audited_runtime_role')).length===2)
      return new Response(JSON.stringify({message:'fictional-final-role-denial',code:'22012'}),{status:400});
    const results = body.queries.map(q => {
      if (q.query === RUNTIME_CATALOG_SHARED_FENCE_SQL.text) return fenceResponse ?? result([cell('catalog_fence', 2278)], [['']]);
      if (q.query === 'SELECT 1 AS fictional_dispatch') return result([cell('fictional_dispatch', 23)], [['1']]);
      if (q.query.includes('FROM public.workspaces')) return result([cell('id', 25), cell('name', 25), cell('time_zone', 25), cell('active', 16)], [['tenant-a', 'Fictional', 'UTC', 't']]);
      if (q.query.includes('FROM public.employees')) return result([cell('id', 25), cell('first_name', 25), cell('last_name', 25), cell('role', 25), cell('active', 16)], [['employee-a', 'A', 'B', 'EMPLOYEE', 't']]);
      if (q.query.includes('set_config')) return result([cell('set_config', 25)], [['tenant-a']]);
      return guard();
    });
    return new Response(JSON.stringify({ results }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
async function modules() {
  const resolver = await import('./resolve.server');
  const contract = await import('./query-contract');
  const executor = await import('./executor.server');
  const resolved = await resolver.resolvePortalProof('tenant-aa', digest);
  if (resolved.status !== 'ALLOW') throw Error('mocked wire fixture failed');
  return { proof: resolved.proof, contract, executor };
}
describe('installed Neon SDK local HTTP serialization contract', () => {
  it('waits on the intercepted first fence and uses the installed void parser before returning data', async () => {
    const { proof, contract, executor } = await modules();
    let release!: () => void; fenceGate = new Promise(done => { release = done; });
    let settled = false;
    const pending = executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof)).then(value => { settled = true; return value; });
    await Promise.resolve(); await Promise.resolve();
    expect(requests).toHaveLength(2); expect(settled).toBe(false);
    expect(requests[1].body.queries![0]).toEqual({ query: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, params: [] });
    release(); await expect(pending).resolves.toMatchObject({ id: 'tenant-a' });
    expect(requests).toHaveLength(2);
  });
  it('does not replay an intercepted first-fence SQL rejection', async () => {
    const { proof, contract, executor } = await modules(); fenceFailure = true;
    await expect(executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof))).rejects.toThrow('tenant_execution_unavailable');
    expect(requests).toHaveLength(2); expect(requests[1].body.queries![0].query).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
  });
  it.each([
    ['SQL NULL', result([cell('catalog_fence', 2278)], [[null]])],
    ['nonempty native void', result([cell('catalog_fence', 2278)], [['locked']])],
    ['wrong alias', result([cell('guard', 2278)], [['']])],
    ['missing row', result([cell('catalog_fence', 2278)], [])],
    ['multiple rows', result([cell('catalog_fence', 2278)], [[''], ['']])],
    ['extra field', result([cell('catalog_fence', 2278), cell('guard', 23)], [['', '1']])],
    ['boolean parser result', result([cell('catalog_fence', 16)], [['t']])],
  ])('rejects malformed intercepted fence response %s without a second batch', async (_label, response) => {
    const { proof, contract, executor } = await modules(); fenceResponse = response;
    await expect(executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof))).rejects.toThrow('tenant_execution_unavailable');
    expect(requests).toHaveLength(2);
  });
  it('serializes the WORKER dispatcher prefix with one isolated fictional compiler spy, without claiming an issued business statement', async () => {
    // Transport-only seam: no Worker business builder exists. Genuine proof
    // rejection is separately asserted below; this spy is restored immediately.
    const resolver = await import('./resolve.server'), contract = await import('./query-contract'), executor = await import('./executor.server');
    const resolved = await resolver.resolveWorkerProof(workerIdentity, workerClaim);
    if (resolved.status !== 'ALLOW') throw Error('fictional worker resolver fixture');
    const compiled = Object.freeze({ name: 'FICTIONAL_WORKER_DISPATCH_ONLY', text: 'SELECT 1 AS fictional_dispatch',
      values: Object.freeze([]), decode: (rows: unknown) => rows });
    const compile = vi.spyOn(contract, 'compileTenantStatement').mockReturnValue(compiled);
    try {
      await expect(executor.createTenantExecutor(resolved.proof).query({} as never)).resolves.toEqual([{ fictional_dispatch: 1 }]);
      expect(requests).toHaveLength(2);
      for (const request of requests) expect(new Headers(request.options.headers).get('Neon-Connection-String')).toContain('fictional_worker:fictional_password@ep-fictional-worker');
      expect(requests[0].body.queries![1].query).toContain("assert_audited_runtime_role('WORKER'::text)");
      const queries = requests[1].body.queries!;
      expect(queries).toHaveLength(7);
      expect(queries[0]).toEqual({ query: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, params: [] });
      expect(queries[1].params).toEqual(['WORKER']);
      expect(queries[2].params).toEqual(['tenant-a', 'WORKER', 'worker-a', '9007199254740993']);
      expect(JSON.parse(queries[3].params[0])).toMatchObject({ kind: 'WORKER', workerGrantVersion: '2', leaseTokenHash: workerFacts.leaseTokenHash });
      expect(queries[4]).toEqual({ query: compiled.text, params: [] });
      expect(queries.at(-2)!.query).toContain('assert_current_proof'); expect(queries.at(-1)!.params).toEqual(['WORKER']);
      expect(new Headers(requests[1].options.headers).get('Neon-Batch-Isolation-Level')).toBe('ReadCommitted');
    } finally { compile.mockRestore(); }
  });
  it('rejects a genuine WORKER proof with a PORTAL statement without creating an executor batch', async () => {
    const { proof, contract, executor } = await modules();
    const resolver = await import('./resolve.server'); const worker = await resolver.resolveWorkerProof(workerIdentity, workerClaim);
    if (worker.status !== 'ALLOW') throw Error('fictional worker resolver fixture');
    await expect(executor.createTenantExecutor(worker.proof).query(contract.workspaceSnapshot(proof))).rejects.toThrow('tenant_statement_denied');
    await expect(executor.createTenantExecutor(worker.proof).query({ name: 'FORGED_WORKER_STATEMENT' } as never)).rejects.toThrow('tenant_statement_denied');
    expect(requests).toHaveLength(2); expect(requests.every(request => request.body.queries?.length === 3 && request.body.queries[1].query.includes('resolve_'))).toBe(true);
  });
  it('rejects intercepted final runtime-role SQL denial with one atomic request and no replay',async()=>{
    const {proof,contract,executor}=await modules();finalRoleFailure=true;
    await expect(executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof))).rejects.toThrow('tenant_execution_unavailable');
    expect(requests).toHaveLength(2);const queries=requests[1].body.queries!;
    expect(queries.at(-1)!.query).toContain('assert_audited_runtime_role');expect(queries.at(-1)!.params).toEqual(['APP']);
    expect(queries.at(-2)!.query).toContain('assert_current_proof');
  });
  it('uses the dedicated runtime URL and one serialized guarded batch for a query', async () => {
    const { proof, contract, executor } = await modules();
    expect(await executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof))).toMatchObject({ id: 'tenant-a' });
    expect(requests).toHaveLength(2);
    expect(new Headers(requests[0].options.headers).get('Neon-Connection-String')).toContain('fictional_app:fictional_password@ep-fictional-app');
    expect(requests[0].body.queries![1].query).toContain("CASE WHEN nevora_tenancy.assert_audited_runtime_role('APP'::text) IS TRUE THEN nevora_tenancy.resolve_portal");
    expect(new Headers(requests[1].options.headers).get('Neon-Connection-String')).toContain('fictional_app:fictional_password@ep-fictional-app');
    expect(requests[1].body.queries).toHaveLength(7);
    expect(requests[1].body).not.toHaveProperty('query');
    expect(requests[1].body.queries![0]).toEqual({ query: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, params: [] });
    expect(requests[1].body.queries![1].params).toEqual(['APP']);
    expect(requests[1].body.queries![2].params).toEqual(['tenant-a', 'PORTAL', 'employee-a', '9007199254740993']);
    expect(requests[1].body.queries![4].params).toEqual(['tenant-a']);
    const metadata = JSON.parse(requests[1].body.queries![3].params[0]);
    expect(metadata.employeeVersion).toBe('2026-10-08 11:00:00.654321+00');
    expect(new Headers(requests[1].options.headers).get('Neon-Batch-Isolation-Level')).toBe('ReadCommitted');
  });
  it('preserves business result positions for two serialized queries', async () => {
    const { proof, contract, executor } = await modules();
    const result = await executor.createTenantExecutor(proof).transaction(contract.tenantBatch(proof, [contract.workspaceSnapshot(proof), contract.portalEmploymentSnapshot(proof)]));
    expect(result).toHaveLength(2); expect(result[0]).toMatchObject({ id: 'tenant-a' }); expect(result[1]).toMatchObject({ id: 'employee-a' });
    expect(requests).toHaveLength(2); expect(requests[1].body.queries).toHaveLength(8);
  });
  it('forwards AbortSignal through installed SDK fetch options', async () => {
    const { proof, contract, executor } = await modules(), controller = new AbortController();
    await executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof), { signal: controller.signal });
    expect(requests[1].options.signal).toBe(controller.signal);
  });
  it('returns a generic unavailable failure on mocked HTTP SQL rejection without replay', async () => {
    const { proof, contract, executor } = await modules(); databaseFailure = true;
    await expect(executor.createTenantExecutor(proof).query(contract.workspaceSnapshot(proof))).rejects.toThrow('tenant_execution_unavailable');
    expect(requests).toHaveLength(2);
  });
  it('does not reuse a configured bootstrap/legacy URL when a dedicated runtime URL is missing', async () => {
    vi.stubEnv('NEVORA_APP_DATABASE_URL', '');
    const { getTenantRuntimeDb } = await import('../db');
    expect(() => getTenantRuntimeDb('APP')).toThrow('tenant_runtime_not_configured');
    expect(requests).toHaveLength(0);
  });
  it('keeps APP and WORKER transport configuration separate and rejects unknown runtime kinds', async () => {
    const { getTenantRuntimeDb } = await import('../db');
    const app = getTenantRuntimeDb('APP'), worker = getTenantRuntimeDb('WORKER');
    expect(getTenantRuntimeDb('APP')).toBe(app); expect(getTenantRuntimeDb('WORKER')).toBe(worker); expect(app).not.toBe(worker);
    expect(() => getTenantRuntimeDb('RESOLVER' as never)).toThrow('tenant_runtime_not_configured');
    expect(requests).toHaveLength(0);
  });
});

describe('installed SDK resolver configuration isolation',()=>{
 it('returns unavailable with zero HTTP when APP is absent despite configured legacy and WORKER URLs',async()=>{
  vi.stubEnv('NEVORA_APP_DATABASE_URL','');
  const resolver=await import('./resolve.server');
  expect(await resolver.resolvePortalProof('tenant-aa',digest)).toEqual({status:'UNAVAILABLE'});
  expect(requests).toHaveLength(0);
 });
 it('returns unavailable with zero HTTP when WORKER is absent despite configured legacy and APP URLs',async()=>{
  vi.stubEnv('NEVORA_WORKER_DATABASE_URL','');
  const resolver=await import('./resolve.server');
  expect(await resolver.resolveWorkerProof({workerId:'worker-a',credentialDigest:digest,environment:'test'},
   {deliveryId:'delivery-a',generation:'generation-a',leaseToken:'fictional-lease-token-a'})).toEqual({status:'UNAVAILABLE'});
  expect(requests).toHaveLength(0);
 });
});
