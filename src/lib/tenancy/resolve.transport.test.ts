import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
// Installed SDK and native-type parsers; every HTTP request is intercepted.
// This tests serialized local transport only, never Neon or held-lock authority.
type Query = { query: string; params: string[] };
type Body = { query?: string; params?: string[]; queries?: Query[] };
const requests: { body: Body; options: RequestInit }[] = [];
const digest = 'a'.repeat(64);
const hash = (text: string, prefix = '') => createHash('sha256').update(prefix).update(text).digest('hex');
const common = { authorityCurrent: true, workspaceId: 'tenant-a', workspaceVersion: '2026-10-08 10:00:00.123456+00',
  workspaceIncarnation: '9007199254740993', resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00.123456+00' };
const device = `nev_dev_${'b'.repeat(64)}`, pin = `nev_pin_${'c'.repeat(64)}`;
const identity = { workerId: 'worker-a', credentialDigest: digest, environment: 'test' as const };
const claim = { deliveryId: 'delivery-a', generation: 'generation-a', leaseToken: 'fictional-lease-token-a' };
const operator = { operatorId: 'operator-a', credentialDigest: digest, requestId: 'request-a', requestDigest: 'b'.repeat(64), operationId: 'operation-a', payloadDigest: 'c'.repeat(64) };
const portal = { ...common, kind: 'PORTAL', locator: 'tenant-aa', employeeId: 'employee-a', employeeVersion: '2026-10-08 11:00:00.654321+00',
  authorizationVersion: '4', portalAccessVersion: '2', sessionTokenHash: digest, sessionExpiresAt: common.expiresAt, role: 'EMPLOYEE',
  capabilityPolicyRevision: '3', capabilities: [], allowedLocationIds: ['location-a'], administrativeLocationIds: [], administrativeScope: null };
const clocker = { ...common, kind: 'CLOCKER', locationId: 'location-a', deviceId: 'device-a', deviceVersion: '7', credentialHash: hash(device, 'nevora-clocker-v1\0'),
  credentialVersion: '6', pinSessionTokenHash: hash(pin, 'nevora-clocker-identity-v1\0'), pinVersion: '5', pinKeyIdentity: 'd'.repeat(64),
  employeeId: 'employee-a', employeeVersion: portal.employeeVersion, pinSessionExpiresAt: common.expiresAt };
const calendar = { ...common, kind: 'CALENDAR_READ', subscriptionId: 'subscription-a', digest, generation: 'generation-a', employeeId: 'employee-a',
  employeeVersion: portal.employeeVersion, authorizationVersion: '4', allowedLocationIds: ['location-a'] };
const worker = { ...common, kind: 'WORKER', workerId: identity.workerId, workerCredentialDigest: digest, workerGrantVersion: '2', environment: 'test',
  deliveryId: claim.deliveryId, intentId: 'intent-a', subscriptionId: 'subscription-a', generation: claim.generation, leaseTokenHash: hash(claim.leaseToken), leaseExpiresAt: common.expiresAt };
const provisioner = { authorityCurrent: true, kind: 'PROVISIONER', ...operator, operatorGrantId: 'grant-a', operatorGrantVersion: '2', operatorCredentialDigest: digest,
  environment: 'test', purpose: 'TENANT_RESTORE', workspaceId: 'tenant-a', bootstrapNonce: null, subjectEmployeeId: 'owner-a', workspaceIncarnation: '3',
  sourceVersion: common.workspaceVersion, verifiedIdentityReference: 'verification-a', resolvedAt: common.resolvedAt, expiresAt: common.expiresAt };
type Resolver = typeof import('./resolve.server');
const cases = [
  { seam: 'portal', role: 'APP', facts: portal, values: ['tenant-aa', digest], run: (r: Resolver) => r.resolvePortalProof('tenant-aa', digest) },
  { seam: 'clocker', role: 'APP', facts: clocker, values: [clocker.credentialHash, clocker.pinSessionTokenHash], run: (r: Resolver) => r.resolveClockerProof(device, pin) },
  { seam: 'calendar', role: 'APP', facts: calendar, values: [digest], run: (r: Resolver) => r.resolveCalendarReadProof(digest) },
  { seam: 'worker', role: 'WORKER', facts: worker, values: [identity.workerId, digest, identity.environment, claim.deliveryId, claim.generation, worker.leaseTokenHash], run: (r: Resolver) => r.resolveWorkerProof(identity, claim) },
  { seam: 'provisioner', role: 'APP', facts: provisioner, values: [operator.operatorId, digest, 'test', 'TENANT_RESTORE', operator.requestId, operator.requestDigest, operator.operationId, operator.payloadDigest], run: (r: Resolver) => r.resolveProvisionerScope(operator, 'test', 'TENANT_RESTORE') },
] as const;
const field = (name: string, dataTypeID: number) => ({ name, dataTypeID });
const rows = (fields: ReturnType<typeof field>[], values: (string | null)[][]) => ({ fields, rows: values, command: 'SELECT', rowCount: values.length });
const roleRows = () => rows([field('guard', 23)], [['1']]);
let fenceResponse: ReturnType<typeof rows> | null = null;
let roleResponse: ReturnType<typeof rows> | null = null;
let factsOverride: unknown | undefined;
let sqlFailure = false;
let transactionGate: Promise<void> | null = null;
let cardinalityDelta = 0;
function factsResponse(query: Query) {
  const contract = cases.find(c => query.query.includes(`nevora_tenancy.resolve_${c.seam}(`));
  if (!contract) throw Error('Unexpected fictional resolver seam');
  return rows([field('facts', 3802)], [[JSON.stringify(factsOverride === undefined ? contract.facts : factsOverride)]]);
}
beforeEach(() => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:00Z'));
  requests.length = 0; fenceResponse = null; roleResponse = null; factsOverride = undefined; sqlFailure = false; transactionGate = null; cardinalityDelta = 0;
  vi.stubEnv('DATABASE_URL', 'postgresql://fictional_legacy:fictional_password@ep-fictional-legacy.us-east-1.aws.neon.tech/fictional_fixture');
  vi.stubEnv('NEVORA_APP_DATABASE_URL', 'postgresql://fictional_app:fictional_password@ep-fictional-app.us-east-1.aws.neon.tech/fictional_fixture');
  vi.stubEnv('NEVORA_WORKER_DATABASE_URL', 'postgresql://fictional_worker:fictional_password@ep-fictional-worker.us-east-1.aws.neon.tech/fictional_fixture');
  vi.stubGlobal('fetch', vi.fn(async (url: string, options: RequestInit) => {
    if (!/^https:\/\/api\.us-east-1\.aws\.neon\.tech\/sql$/.test(String(url))) throw Error('Unexpected mocked transport URL');
    const body: Body = JSON.parse(String(options.body)); requests.push({ body, options });
    // Before-code RED can expose the old direct query without fixture failure.
    if (body.query) return new Response(JSON.stringify(factsResponse({ query: body.query, params: body.params ?? [] })), { status: 200 });
    if (!body.queries) throw Error('Missing fictional query batch');
    if (transactionGate) await transactionGate;
    if (sqlFailure) return new Response(JSON.stringify({ code: '42501', message: 'private-lookup-or-final-role-diagnostic' }), { status: 400 });
    const results = body.queries.map(query => {
      if (query.query === RUNTIME_CATALOG_SHARED_FENCE_SQL.text) return fenceResponse ?? rows([field('catalog_fence', 2278)], [['']]);
      if (query.query.includes('nevora_tenancy.resolve_')) return factsResponse(query);
      if (query.query.includes('assert_audited_runtime_role')) return roleResponse ?? roleRows();
      throw Error('Unexpected fictional batch query');
    });
    if (cardinalityDelta < 0) results.pop();
    if (cardinalityDelta > 0) results.push(roleRows());
    return new Response(JSON.stringify({ results }), { status: 200 });
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); });
describe('installed SDK owning resolver catalog-fence serialization', () => {
  it.each(cases)('serializes $seam with dedicated $role, first fence, fresh lookup and final role in one batch', async contract => {
    const resolver = await import('./resolve.server');
    const resolved = await contract.run(resolver); expect(resolved.status).toBe('ALLOW');
    expect(requests).toHaveLength(1); const request = requests[0], queries = request.body.queries!;
    expect(request.body).not.toHaveProperty('query'); expect(queries).toHaveLength(3);
    expect(queries[0]).toEqual({ query: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, params: [] });
    expect(queries[1].query).toContain(`CASE WHEN nevora_tenancy.assert_audited_runtime_role('${contract.role}'::text) IS TRUE THEN nevora_tenancy.resolve_${contract.seam}`);
    expect(queries[1].query).toContain('ELSE NULL::jsonb END AS facts'); expect(queries[1].params).toEqual(contract.values);
    expect(queries[2]).toEqual({ query: 'SELECT 1 / CASE WHEN nevora_tenancy.assert_audited_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard', params: [contract.role] });
    expect(new Headers(request.options.headers).get('Neon-Batch-Isolation-Level')).toBe('ReadCommitted');
    const connection = new Headers(request.options.headers).get('Neon-Connection-String');
    expect(connection).toContain(`fictional_${contract.role.toLowerCase()}:fictional_password@ep-fictional-${contract.role.toLowerCase()}`); expect(connection).not.toContain('fictional_legacy');
    if (resolved.status !== 'ALLOW') throw Error('fictional issued scope');
    const facts = 'scope' in resolved ? resolver.getProvisionerScopeFacts(resolved.scope) : resolver.getTenantProofFacts(resolved.proof);
    expect(facts).toMatchObject({ kind: contract.facts.kind, workspaceId: 'tenant-a' });
    expect(Object.isFrozen(facts)).toBe(true);
  });
  it('does not issue until the intercepted owning transaction completes and retains exact microseconds', async () => {
    const resolver = await import('./resolve.server'); let release!: () => void; transactionGate = new Promise(done => { release = done; });
    let settled = false;
    const pending = resolver.resolvePortalProof('tenant-aa', digest).then(result => { settled = true; return result; });
    await Promise.resolve(); await Promise.resolve(); expect(requests).toHaveLength(1); expect(settled).toBe(false);
    expect(requests[0].body.queries).toHaveLength(3);
    expect(requests[0].body.queries![0].query).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
    release(); const result = await pending; expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('fictional proof');
    expect(resolver.getTenantProofFacts(result.proof).workspaceVersion).toBe(common.workspaceVersion);
  });
  it.each(cases)('returns sanitized unavailable on $seam batch SQL failure with no replay', async contract => {
    sqlFailure = true; const resolver = await import('./resolve.server');
    expect(await contract.run(resolver)).toEqual({ status: 'UNAVAILABLE' }); expect(requests).toHaveLength(1);
  });
  it.each([
    ['SQL NULL', rows([field('catalog_fence', 2278)], [[null]])],
    ['wrong alias', rows([field('guard', 2278)], [['']])],
    ['nonempty void', rows([field('catalog_fence', 2278)], [['held']])],
    ['empty rows', rows([field('catalog_fence', 2278)], [])],
    ['extra field', rows([field('catalog_fence', 2278), field('guard', 23)], [['', '1']])],
    ['multiple rows', rows([field('catalog_fence', 2278)], [[''], ['']])],
  ])('blocks malformed native void fence %s before issuance', async (_label, response) => {
    fenceResponse = response; const resolver = await import('./resolve.server');
    expect(await resolver.resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' }); expect(requests).toHaveLength(1);
  });
  it.each([
    ['false', rows([field('guard', 23)], [['0']])], ['SQL NULL', rows([field('guard', 23)], [[null]])],
    ['missing row', rows([field('guard', 23)], [])], ['wrong alias', rows([field('facts', 23)], [['1']])],
  ])('blocks malformed final runtime role %s before issuance', async (_label, response) => {
    roleResponse = response; const resolver = await import('./resolve.server');
    expect(await resolver.resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' }); expect(requests).toHaveLength(1);
  });
  it.each([-1, 1])('requires exactly three installed-SDK results (delta %i)', async delta => {
    cardinalityDelta = delta; const resolver = await import('./resolve.server');
    expect(await resolver.resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'UNAVAILABLE' }); expect(requests).toHaveLength(1);
  });
  it('preserves exact metadata denial without converting it into transport failure', async () => {
    const resolver = await import('./resolve.server');
    factsOverride = null; expect(await resolver.resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    factsOverride = { ...portal, authorityCurrent: false }; expect(await resolver.resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    factsOverride = { ...portal, sessionTokenHash: 'b'.repeat(64) }; expect(await resolver.resolvePortalProof('tenant-aa', digest)).toEqual({ status: 'DENY' });
    expect(requests).toHaveLength(3); expect(requests.every(r => r.body.queries?.length === 3)).toBe(true);
  });
  it.each([['portal', 'NEVORA_APP_DATABASE_URL'], ['worker', 'NEVORA_WORKER_DATABASE_URL']] as const)('does not substitute another configured URL for missing $0 transport', async (seam, key) => {
    vi.stubEnv(key, ''); const resolver = await import('./resolve.server'); const contract = cases.find(c => c.seam === seam)!;
    expect(await contract.run(resolver)).toEqual({ status: 'UNAVAILABLE' }); expect(requests).toHaveLength(0);
  });
  it('denies invalid inputs without any SDK request or transaction', async () => {
    const resolver = await import('./resolve.server');
    expect(await resolver.resolvePortalProof('fuel', digest)).toEqual({ status: 'DENY' });
    expect(await resolver.resolveClockerProof('invalid-device', pin)).toEqual({ status: 'DENY' });
    expect(await resolver.resolveCalendarReadProof('bad-digest')).toEqual({ status: 'DENY' });
    expect(await resolver.resolveWorkerProof({ ...identity, credentialDigest: '' }, claim)).toEqual({ status: 'DENY' });
    expect(await resolver.resolveProvisionerScope(operator, 'production' as 'test', 'TENANT_RESTORE')).toEqual({ status: 'DENY' });
    expect(requests).toHaveLength(0);
  });
});
