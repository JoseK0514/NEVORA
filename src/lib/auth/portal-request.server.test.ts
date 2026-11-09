// F10 local request regressions. Real private resolver/executor/builders are used;
// Next cookie and DB transport responses are fictional unit observations only.
// No native guard/current-source/tenant authorization or hosted PASS is proved.
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { RequestCookies } from 'next/dist/compiled/@edge-runtime/cookies';
vi.mock('server-only', () => ({}));
const request = vi.hoisted(() => ({ cookies: vi.fn(), headers: vi.fn() }));
vi.mock('next/headers', () => ({ cookies: request.cookies, headers: request.headers }));
const transport = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn(), runtime: vi.fn(), legacy: vi.fn() }));
vi.mock('../db', () => ({ getTenantRuntimeDb: transport.runtime, getDb: transport.legacy }));
import { resolveSelectedPortalRequest } from './portal-request.server';
import { createTenantExecutor } from '../tenancy/executor.server';
import { getTenantProofFacts } from '../tenancy/resolve.server';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from '../tenancy/runtime/catalog-fence.server';
import type { PortalProof } from '../tenancy/types';

type Query = { text: string; values: readonly unknown[] };
const NOW = new Date('2026-10-09T12:00:00Z');
const bearerA = Buffer.alloc(32, 1).toString('base64url');
const bearerB = Buffer.alloc(32, 2).toString('base64url');
const digest = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
const cookie = (bearer: unknown) => ({ name: 'fuel_session', value: bearer });
const store = (rows: unknown) => ({ getAll: vi.fn(() => rows) });
function subject(locator: string) {
  const side = locator === 'tenant-aa' ? 'a' : 'b';
  return { locator, workspaceId: `workspace-${side}`, employeeId: `employee-${side}`,
    sessionTokenHash: digest(side === 'a' ? bearerA : bearerB) };
}
function fictionalRequestCurrentSource(facts: Record<string, unknown>) {
  const retained = JSON.parse(readFileSync(new URL('../tenancy/runtime/fixtures/installed-policy-native-observation.json', import.meta.url), 'utf8'));
  const installed = retained.raw;
  installed.workspaceId = facts.workspaceId; installed.workspaceIncarnation = facts.workspaceIncarnation;
  installed.installation.workspaceId = facts.workspaceId; installed.installation.workspaceIncarnation = facts.workspaceIncarnation;
  installed.installation.policyRevision = facts.capabilityPolicyRevision;
  installed.definition.revision = facts.capabilityPolicyRevision;
  installed.definition.sourceBundle.revision = facts.capabilityPolicyRevision;
  // Only this fictional bundle's explicit revision/identity changes. Retained
  // three full source wires remain unchanged; exact native-text reconstruction
  // is test-data construction, not a native deparser/custody claim.
  const nativeText = (value: unknown): string => {
    if (typeof value === 'string') return JSON.stringify(value);
    const row = value as Record<string, unknown>;
    const keys = Object.keys(row).sort((a,b) => Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b)));
    return '{' + keys.map(key => JSON.stringify(key) + ': ' + nativeText(row[key])).join(', ') + '}';
  };
  const bundleText = nativeText(installed.definition.sourceBundle), bytes = Buffer.from(bundleText, 'utf8');
  const encoded = bytes.toString('base64'), triplet = Math.floor(bytes.length / 3) * 4;
  let base64 = '';
  for (let offset = 0; offset < triplet; offset += 76) {
    const group = encoded.slice(offset, Math.min(offset + 76, triplet));
    base64 += group + (group.length === 76 ? '\n' : '');
  }
  base64 += encoded.slice(triplet);
  installed.definition.sourceBundleWire = { encoding: 'UTF8', text: bundleText, bytesBase64: base64,
    byteLength: String(bytes.length), sha256: createHash('sha256').update(bytes).digest('hex') };
  const nativeCurrentSource = { format: 'PORTAL_REQUEST_NATIVE_SOURCE_COMPARISON_V1',
    locator: facts.locator, sessionTokenHash: facts.sessionTokenHash, workspaceId: facts.workspaceId,
    employeeId: facts.employeeId, resolvedAt: facts.resolvedAt, expiresAt: facts.expiresAt,
    sources: { kind: 'PORTAL_POLICY_SOURCE_OBSERVATION_V1',
      portalSource: { kind: 'PORTAL_SOURCE_OBSERVATION_V1',
        workspace: { id: facts.workspaceId, active: true, version: facts.workspaceVersion },
        employee: { id: facts.employeeId, workspaceId: facts.workspaceId, active: true, role: facts.role, version: facts.employeeVersion },
        credential: { employeeId: facts.employeeId, version: facts.employeeVersion, mustChangePassword: false },
        incarnation: { workspaceId: facts.workspaceId, version: facts.workspaceIncarnation },
        portal: { workspaceId: facts.workspaceId, employeeId: facts.employeeId,
          authorizationVersion: facts.authorizationVersion, portalAccessVersion: facts.portalAccessVersion,
          capabilityPolicyRevision: facts.capabilityPolicyRevision, state: 'ENABLED',
          proofProvenance: 'LEGACY_UNVERIFIED', provenanceReference: 'fictional unit source only' },
        session: { tokenHash: facts.sessionTokenHash, employeeId: facts.employeeId, createdAt: facts.employeeVersion, expiresAt: facts.sessionExpiresAt },
        issuance: { tokenHash: facts.sessionTokenHash, workspaceId: facts.workspaceId, employeeId: facts.employeeId,
          workspaceIncarnation: facts.workspaceIncarnation, portalAccessVersion: facts.portalAccessVersion, sessionCreatedAt: facts.employeeVersion },
        administrative: null },
      installedPolicy: installed, verification: 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION' },
    locationSource: { workspaceId: facts.workspaceId, employeeId: facts.employeeId, primaryLocationId: 'fictional-location',
      locations: [{ id: 'fictional-location', workspaceId: facts.workspaceId, active: true, version: facts.employeeVersion }], eligibility: [] },
  };
  return { ...facts, format: 'PORTAL_REQUEST_AUTHORITY_V1', nativeCurrentSource };
}

function fictionalFacts(locator: string) {
  return fictionalRequestCurrentSource({ ...subject(locator), authorityCurrent: true, kind: 'PORTAL',
    workspaceVersion: '2026-10-08 10:00:00.123456+00', workspaceIncarnation: '9007199254740993',
    employeeVersion: '2026-10-08 11:00:00.654321+00', authorizationVersion: '4', portalAccessVersion: '2',
    resolvedAt: '2026-10-09 12:00:00+00', expiresAt: '2026-10-09 12:01:00+00',
    sessionExpiresAt: '2026-10-09 12:01:00+00', role: 'EMPLOYEE', capabilityPolicyRevision: '3',
    capabilities: [], allowedLocationIds: [], administrativeLocationIds: [], administrativeScope: null });
}
const fenced = (facts: unknown) => [[{ catalog_fence: '' }], [{ facts }], [{ guard: 1 }]];
function guarded(queries: Query[]) {
  const workspaceId = queries[4].values[0], employeeId = queries[5].values[1];
  return [[{ catalog_fence: '' }], [{ guard: 1 }], [{ context: 'fictional' }], [{ guard: 1 }],
    [{ id: workspaceId, name: `Fictional ${workspaceId}`, time_zone: 'UTC', active: true }],
    [{ id: employeeId, first_name: `Own ${employeeId}`, last_name: 'Fictional', role: 'EMPLOYEE', active: true }],
    [{ guard: 1 }], [{ guard: 1 }]];
}
function installFictionalTransport() {
  transport.transaction.mockImplementation(async (queries: Query[]) => {
    if (queries.length === 3) {
      const [locator, actualDigest] = queries[1].values;
      if (typeof locator !== 'string' || !['tenant-aa', 'tenant-bb'].includes(locator) || actualDigest !== subject(locator).sessionTokenHash) return fenced(null);
      return fenced(fictionalFacts(locator));
    }
    return guarded(queries);
  });
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(NOW);
  request.cookies.mockReset(); request.cookies.mockResolvedValue(store([cookie(bearerA)]));
  request.headers.mockReset(); request.headers.mockResolvedValue(new Headers({ cookie: `fuel_session=${bearerA}` }));
  transport.query.mockReset(); transport.transaction.mockReset(); transport.runtime.mockReset(); transport.legacy.mockReset();
  transport.runtime.mockReturnValue(transport);
  transport.legacy.mockImplementation(() => { throw Error('private-legacy-transport-forbidden'); });
  transport.query.mockImplementation((text: string, values: readonly unknown[]) => ({ text, values,
    then() { throw Error('query awaited outside owning transaction'); } }));
  installFictionalTransport();
});
afterEach(() => { vi.useRealTimers(); });

// These are actual production APIs under fictional wire inputs, not a proof
// factory mock. Native positive cases remain root-owned separate prerequisites.
describe('selected Portal request boundary', () => {
  it.each([
    ['same bearer', bearerA], ['different bearer', bearerB],
  ])('rejects duplicate raw cookie fields collapsed by the installed Next parser: %s', async (_label, firstBearer) => {
    const raw = new Headers({ cookie: `fuel_session=${firstBearer}; fuel_session=${bearerA}` });
    const parsed = new RequestCookies(raw);
    expect(parsed.getAll('fuel_session')).toHaveLength(1);
    request.headers.mockResolvedValueOnce(raw);
    request.cookies.mockResolvedValueOnce(parsed);
    expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    expect(transport.runtime).not.toHaveBeenCalled();
    expect(transport.query).not.toHaveBeenCalled();
  });
  it('accepts one actual parsed session cookie alongside unrelated cookie names', async () => {
    const raw = new Headers({ cookie: `other=fictional; fuel_session=${bearerA}; another=fictional` });
    request.headers.mockResolvedValueOnce(raw);
    request.cookies.mockResolvedValueOnce(new RequestCookies(raw));
    const result = await resolveSelectedPortalRequest('tenant-aa');
    expect(result.status).toBe('ALLOW');
    expect(transport.transaction).toHaveBeenCalledTimes(2);
    expect(transport.query.mock.calls[1][1]).toEqual(['tenant-aa', digest(bearerA)]);
  });
  it('rejects absent, malformed or whitespace-ambiguous original cookie names before cookie or DB access', async () => {
    for (const raw of [null, '', 'other=fictional', 'fuel_session', `fuel_session; fuel_session=${bearerA}`,
      `fuel_session=${bearerA};\tfuel_session=${bearerA}`]) {
      request.headers.mockResolvedValueOnce(new Headers(raw === null ? {} : { cookie: raw }));
      expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    }
    expect(request.cookies).not.toHaveBeenCalled();
    expect(transport.runtime).not.toHaveBeenCalled();
  });
  it('returns unavailable without downstream access when the request header store fails', async () => {
    request.headers.mockRejectedValueOnce(Error('private-header-error'));
    expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'UNAVAILABLE' });
    expect(request.cookies).not.toHaveBeenCalled();
    expect(transport.runtime).not.toHaveBeenCalled();
  });
  it('denies invalid/hostile selectors before cookie, metadata or transport behavior', async () => {
    let traps = 0;
    const hostile = new Proxy({}, { get() { traps++; throw Error('must_not_read'); }, getPrototypeOf() { traps++; throw Error('must_not_read'); } });
    for (const locator of [null, undefined, '', 'short', '../tenant-aa', 'tenant_aa', 'tenant aa', 'tеnant-aa', {}, hostile]) {
      expect(await resolveSelectedPortalRequest(locator)).toEqual({ status: 'DENY' });
    }
    expect(traps).toBe(0); expect(request.cookies).not.toHaveBeenCalled(); expect(transport.runtime).not.toHaveBeenCalled();
  });
  it('requires exactly one actual named cookie, with no global/legacy fallback', async () => {
    for (const rows of [[], [cookie(bearerA), cookie(bearerB)], [{ name: 'other', value: bearerA }]]) {
      request.cookies.mockResolvedValueOnce(store(rows));
      expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    }
    expect(transport.runtime).not.toHaveBeenCalled(); expect(transport.legacy).not.toHaveBeenCalled();
  });
  it('rejects malformed/noncanonical bearers without normalization or SQL', async () => {
    for (const bearer of ['', 'a'.repeat(42), 'a'.repeat(44), ` ${bearerA}`, `${bearerA}\n`, `${bearerA}=`, `${bearerA.slice(0,-1)}B`, 1, { approved: true }]) {
      request.cookies.mockResolvedValueOnce(store([cookie(bearer)]));
      expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    }
    expect(transport.runtime).not.toHaveBeenCalled(); expect(transport.query).not.toHaveBeenCalled();
  });
  it('rejects cookie proxies/accessors/sparse inherited entries without reading them', async () => {
    let reads = 0;
    const accessor = { name: 'fuel_session' };
    Object.defineProperty(accessor, 'value', { enumerable: true, get() { reads++; throw Error('must_not_read'); } });
    const proxy = new Proxy(cookie(bearerA), { getOwnPropertyDescriptor() { reads++; throw Error('must_not_read'); }, getPrototypeOf() { reads++; throw Error('must_not_read'); } });
    const arrayProxy = new Proxy([cookie(bearerA)], { getPrototypeOf() { reads++; throw Error('must_not_read'); } });
    const inherited = new Array(1); const custom = Object.create(Array.prototype);
    Object.defineProperty(custom, '0', { get() { reads++; throw Error('must_not_read'); } }); Object.setPrototypeOf(inherited, custom);
    for (const rows of [[accessor], [proxy], arrayProxy, inherited]) {
      // A spy inspects returned instanceof Promise, which trips the hostile
      // array proxy before the decoder. Plain return preserves that boundary.
      request.cookies.mockResolvedValueOnce({ getAll: () => rows });
      expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    }
    expect(reads).toBe(0); expect(transport.runtime).not.toHaveBeenCalled();
  });
  it('sanitizes request-context failure without transport or diagnostics', async () => {
    request.cookies.mockRejectedValueOnce(Error('private-cookie-context'));
    expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'UNAVAILABLE' });
    expect(transport.runtime).not.toHaveBeenCalled();
  });
  it('hashes request bearer privately and returns only genuine private proof plus detached snapshots', async () => {
    const actualStore = store([cookie(bearerA)]); request.cookies.mockResolvedValueOnce(actualStore);
    const result = await resolveSelectedPortalRequest('tenant-aa');
    expect(result.status).toBe('ALLOW'); if (result.status !== 'ALLOW') throw Error('fictional unit composition');
    expect(actualStore.getAll).toHaveBeenCalledTimes(1); expect(actualStore.getAll).toHaveBeenCalledWith('fuel_session');
    expect(Object.keys(result).sort()).toEqual(['employment', 'proof', 'status', 'workspace']);
    expect(getTenantProofFacts(result.proof)).toMatchObject(subject('tenant-aa'));
    expect(result.workspace).toEqual({ id: 'workspace-a', name: 'Fictional workspace-a', timeZone: 'UTC', active: true });
    expect(result.employment).toEqual({ id: 'employee-a', firstName: 'Own employee-a', lastName: 'Fictional', role: 'EMPLOYEE', active: true });
    for (const value of [result, result.proof, result.workspace, result.employment]) expect(Object.isFrozen(value)).toBe(true);
    expect(JSON.stringify(result)).not.toContain(bearerA); expect(JSON.stringify(result)).not.toContain(digest(bearerA));
    expect(JSON.stringify(transport.query.mock.calls)).not.toContain(bearerA);
    expect(transport.transaction).toHaveBeenCalledTimes(2); expect(transport.legacy).not.toHaveBeenCalled();
    expect(transport.runtime.mock.calls.every(call => call[0] === 'APP')).toBe(true);
  });
  it('uses existing locator normalization and exact digest comparison, not tenant IDs', async () => {
    const result = await resolveSelectedPortalRequest(' Tenant-AA '); expect(result.status).toBe('ALLOW');
    const lookup = transport.transaction.mock.calls[0][0] as Query[];
    expect(lookup[1].values).toEqual(['tenant-aa', digest(bearerA)]);
    request.cookies.mockResolvedValueOnce(store([cookie(bearerA)]));
    expect(await resolveSelectedPortalRequest('workspace-a')).toEqual({ status: 'DENY' });
  });
  it('does not promote raw root observations/local receipts/current-source parser outputs to authority', async () => {
    for (const raw of [
      { kind: 'PRESENTED_PORTAL_ROOT_SOURCE_OBSERVATION_V1', selection: subject('tenant-aa'), sources: {}, verification: 'PROTECTED_SOURCE_CAPTURE_NOT_PORTAL_PROOF_OR_CURRENT_GRANT' },
      { status: 'COMMITTED_LOCAL_SESSION_NOT_PORTAL_PROOF', receipt: {}, bearer: bearerA },
      { status: 'CURRENT_SOURCE_JOINED_NOT_AUTHORITY', observation: {} },
    ]) {
      transport.transaction.mockResolvedValueOnce(fenced(raw));
      expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'UNAVAILABLE' });
    }
    expect(transport.transaction).toHaveBeenCalledTimes(3);
  });
  it('denies absent/current-false authority and mismatched locator/session facts before snapshots', async () => {
    for (const facts of [null, { ...fictionalFacts('tenant-aa'), authorityCurrent: false },
      fictionalFacts('tenant-bb'), { ...fictionalFacts('tenant-aa'), sessionTokenHash: digest(bearerB) }]) {
      transport.transaction.mockResolvedValueOnce(fenced(facts));
      expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    }
    expect(transport.transaction).toHaveBeenCalledTimes(4);
  });
  it('makes same-APP swapped locator/digest unavailable to both closed snapshot statements', async () => {
    request.cookies.mockResolvedValueOnce(store([cookie(bearerB)]));
    expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'DENY' });
    request.cookies.mockResolvedValueOnce(store([cookie(bearerA)]));
    expect(await resolveSelectedPortalRequest('tenant-bb')).toEqual({ status: 'DENY' });
    expect(transport.transaction).toHaveBeenCalledTimes(2);
    for (const [queries] of transport.transaction.mock.calls) expect(queries).toHaveLength(3);
  });
  it('keeps the resolver and both-snapshot executor in their separate owning fenced RC batches', async () => {
    expect((await resolveSelectedPortalRequest('tenant-aa')).status).toBe('ALLOW');
    const [lookup, lookupOptions] = transport.transaction.mock.calls[0];
    const [execution, executionOptions] = transport.transaction.mock.calls[1];
    expect(lookup).toHaveLength(3); expect(execution).toHaveLength(8);
    for (const [queries, options] of [[lookup, lookupOptions], [execution, executionOptions]]) {
      expect(queries[0]).toMatchObject({ text: RUNTIME_CATALOG_SHARED_FENCE_SQL.text, values: [] });
      expect(options).toMatchObject({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
    }
    expect(execution[1].text).toContain('assert_audited_runtime_role');
    expect(execution[3].text).toContain('lock_and_assert_current_proof');
    expect(execution[4].values).toEqual(['workspace-a']); expect(execution[5].values).toEqual(['workspace-a', 'employee-a']);
    expect(execution[6].text).toContain('assert_current_proof'); expect(execution[7].text).toContain('assert_audited_runtime_role');
  });
  it('retains native-helper/final-check failure as sanitized unavailability without replay or legacy decode', async () => {
    transport.transaction.mockResolvedValueOnce(fenced(fictionalFacts('tenant-aa')));
    transport.transaction.mockRejectedValueOnce(Error('private-current-proof-or-final-source-failure'));
    expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'UNAVAILABLE' });
    expect(transport.transaction).toHaveBeenCalledTimes(2); expect(transport.legacy).not.toHaveBeenCalled();
  });
  it('refuses a foreign snapshot row rather than return other-workspace employee information', async () => {
    transport.transaction.mockResolvedValueOnce(fenced(fictionalFacts('tenant-aa')));
    transport.transaction.mockImplementationOnce(async (queries: Query[]) => {
      const results = guarded(queries); results[4] = [{ id: 'workspace-b', name: 'Foreign private name', time_zone: 'UTC', active: true }]; return results;
    });
    expect(await resolveSelectedPortalRequest('tenant-aa')).toEqual({ status: 'UNAVAILABLE' });
    expect(transport.transaction).toHaveBeenCalledTimes(2);
  });
  it('cannot recreate proof authority by serializing the returned private proof', async () => {
    const result = await resolveSelectedPortalRequest('tenant-aa'); if (result.status !== 'ALLOW') throw Error('fictional unit composition');
    const copied = JSON.parse(JSON.stringify(result.proof)) as PortalProof;
    expect(() => createTenantExecutor(copied)).toThrow('tenant_proof_denied');
  });
  it('uses each concurrent request cookie and never shares a request/proof cache', async () => {
    request.cookies.mockResolvedValueOnce(store([cookie(bearerA)])); request.cookies.mockResolvedValueOnce(store([cookie(bearerB)]));
    const [a,b] = await Promise.all([resolveSelectedPortalRequest('tenant-aa'), resolveSelectedPortalRequest('tenant-bb')]);
    expect(a.status).toBe('ALLOW'); expect(b.status).toBe('ALLOW');
    if (a.status !== 'ALLOW' || b.status !== 'ALLOW') throw Error('fictional unit composition');
    expect(a.proof).not.toBe(b.proof); expect(a.workspace.id).toBe('workspace-a'); expect(b.workspace.id).toBe('workspace-b');
    expect(a.employment.id).toBe('employee-a'); expect(b.employment.id).toBe('employee-b');
    const lookups = transport.transaction.mock.calls.filter(([queries]) => queries.length === 3);
    expect(lookups.map(([queries]) => queries[1].values)).toEqual([['tenant-aa',digest(bearerA)],['tenant-bb',digest(bearerB)]]);
    expect(transport.transaction).toHaveBeenCalledTimes(4); expect(transport.legacy).not.toHaveBeenCalled();
  });
});
