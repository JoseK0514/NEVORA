// Local regressions using real issuers/builders/executor; fictional wire
// observations do not prove native authority, enrollment or source freshness.
import { readFileSync } from 'node:fs';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('server-only', () => ({}));
const transport = vi.hoisted(() => ({ query: vi.fn(), transaction: vi.fn(), runtime: vi.fn() }));
vi.mock('../db', () => ({ getTenantRuntimeDb: transport.runtime }));
import { resolvePortalRequestProof, resolvePortalProof, resolveCalendarReadProof,
  getTenantProofFacts, compileTenantProofExecutionPayload } from './resolve.server';
import { createTenantExecutor } from './executor.server';
import { workspaceSnapshot } from './query-contract';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
import { readPortalNativeCurrentSource } from './runtime/portal-proof-current-source.server';
import type { PortalProof, PortalProofFacts } from './types';

type Data = Record<string, unknown>;
type Query = { text: string; values: readonly unknown[] };
const d = (value: unknown) => value as Data; // Known fictional test fixture only.
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const token = 'a'.repeat(64), locator = 'tenant-aa';
const resolvedAt = '2026-10-09 12:00:00.123456+00';
const expiresAt = '2026-10-09 12:01:00.987654+00';
const sessionExpiresAt = '2026-10-09 12:02:00.123457+00';
const at = '2026-10-08 10:00:00.123456+00';
const guarded = (row: unknown) => [[{ catalog_fence: '' }], [{ facts: row }], [{ guard: 1 }]];
function fixture(): Data {
  const native = JSON.parse(readFileSync(new URL('./runtime/fixtures/installed-policy-native-observation.json', import.meta.url), 'utf8'));
  const policy = native.raw, workspaceId = policy.workspaceId as string, employeeId = ' employee-β ';
  const workspaceIncarnation = policy.workspaceIncarnation as string;
  const capabilityPolicyRevision = policy.installation.policyRevision as string;
  const authorizationVersion = '9223372036854775807', portalAccessVersion = '9007199254740993';
  const sources = {
    kind: 'PORTAL_POLICY_SOURCE_OBSERVATION_V1',
    portalSource: {
      kind: 'PORTAL_SOURCE_OBSERVATION_V1',
      workspace: { id: workspaceId, active: true, version: at },
      employee: { id: employeeId, workspaceId, active: true, role: 'EMPLOYEE', version: at },
      credential: { employeeId, version: at, mustChangePassword: true },
      incarnation: { workspaceId, version: workspaceIncarnation },
      portal: { workspaceId, employeeId, authorizationVersion, portalAccessVersion, capabilityPolicyRevision,
        state: 'ENABLED', proofProvenance: 'LEGACY_UNVERIFIED', provenanceReference: ' fictional lineage only ' },
      session: { tokenHash: token, employeeId, expiresAt: sessionExpiresAt, createdAt: at },
      issuance: { tokenHash: token, workspaceId, employeeId, workspaceIncarnation, portalAccessVersion, sessionCreatedAt: at },
      administrative: null,
    },
    installedPolicy: policy,
    verification: 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION',
  };
  return { format: 'PORTAL_REQUEST_AUTHORITY_V1', authorityCurrent: true, kind: 'PORTAL',
    workspaceId, workspaceVersion: at, workspaceIncarnation, resolvedAt, expiresAt, locator,
    employeeId, employeeVersion: at, authorizationVersion, portalAccessVersion, sessionTokenHash: token,
    sessionExpiresAt, role: 'EMPLOYEE', capabilityPolicyRevision, capabilities: ['profile.self.read'],
    allowedLocationIds: ['location-a'], administrativeLocationIds: [], administrativeScope: null,
    nativeCurrentSource: { format: 'PORTAL_REQUEST_NATIVE_SOURCE_COMPARISON_V1', locator, sessionTokenHash: token,
      workspaceId, employeeId, sources, locationSource: { workspaceId, employeeId, primaryLocationId: 'location-a',
        locations: [{ id: 'location-a', workspaceId, active: true, version: at }],
        eligibility: [{ workspaceId, employeeId, locationId: 'location-a' }] }, resolvedAt, expiresAt },
  };
}
const capsule = (row: Data) => d(row.nativeCurrentSource);
const sources = (row: Data) => d(capsule(row).sources);
const portal = (row: Data) => d(sources(row).portalSource);
const policy = (row: Data) => d(sources(row).installedPolicy);
function respond(row: unknown) { transport.transaction.mockResolvedValue(guarded(row)); }
async function proof(row = fixture()): Promise<PortalProof> {
  respond(row); const result = await resolvePortalRequestProof(locator, token);
  expect(result.status).toBe('ALLOW');
  if (result.status !== 'ALLOW') throw Error('fictional closed wire fixture');
  return result.proof;
}
function payload(value: PortalProof): Data { return d(JSON.parse(compileTenantProofExecutionPayload(value))); }
function deeplyFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const item of Object.values(value)) deeplyFrozen(item);
}
function hostile(target: object) {
  let calls = 0;
  const hit = (): never => { calls++; throw Error('trap must not execute'); };
  return { value: new Proxy(target, { get: hit, getPrototypeOf: hit, ownKeys: hit, getOwnPropertyDescriptor: hit }), calls: () => calls };
}
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-09T12:00:30Z'));
  transport.query.mockReset(); transport.transaction.mockReset(); transport.runtime.mockReset();
  transport.runtime.mockReturnValue(transport);
  transport.query.mockImplementation((text: string, values: readonly unknown[]) => ({ text, values,
    then() { throw Error('lazy query awaited outside owning batch'); } }));
});
afterEach(() => vi.useRealTimers());

describe('private versioned Portal current-source transport', () => {
  it('retains the full exact native snapshot only in the private execution payload', async () => {
    const row = fixture(), issued = await proof(row), compiled = payload(issued);
    expect(compiled.format).toBe('PORTAL_REQUEST_CURRENT_PROOF_PAYLOAD_V1');
    expect(compiled.nativeCurrentSource).toEqual(row.nativeCurrentSource);
    expect(JSON.stringify(issued)).toBe('{"kind":"PORTAL"}');
    expect(getTenantProofFacts(issued)).not.toHaveProperty('nativeCurrentSource');
    expect(getTenantProofFacts(issued)).not.toHaveProperty('format');
    expect(Object.keys(getTenantProofFacts(issued))).toHaveLength(19);
  });
  it('uses one shared-first owning RC batch with original APP and exact fixed new seam', async () => {
    await proof(); const queries = transport.transaction.mock.calls[0][0] as Query[];
    expect(queries).toHaveLength(3); expect(queries[0].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text);
    expect(queries[1].text).toContain('assert_audited_runtime_role');
    expect(queries[1].text).toContain('resolve_portal_request($1::text,$2::text)');
    expect(queries[1].values).toEqual([locator, token]); expect(queries[2].values).toEqual(['APP']);
    expect(transport.transaction.mock.calls[0][1]).toEqual({ isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
    expect(transport.runtime).toHaveBeenCalledWith('APP');
  });
  it('rejects missing capsule and legacy result without retry or observer fallback', async () => {
    for (const mutate of [(row: Data) => { delete row.nativeCurrentSource; }, (row: Data) => { delete row.format; }]) {
      const row = fixture(); mutate(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
    expect(transport.transaction).toHaveBeenCalledTimes(2);
    expect(transport.query.mock.calls.every(call => !String(call[0]).includes('THEN nevora_tenancy.resolve_portal('))).toBe(true);
  });
  it('never promotes raw observations, current-source data, local receipts or matching snapshot shape', async () => {
    const row = fixture();
    for (const value of [capsule(row), sources(row), { kind: 'PRESENTED_PORTAL_ROOT_CURRENT_SOURCE_OBSERVATION_V2', ...capsule(row) },
      { kind: 'LOCAL_PORTAL_SESSION_RECEIPT_NOT_PORTAL_PROOF' }]) {
      respond(value); expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('preserves true authority denial separately from malformed transport', async () => {
    const row = fixture(); row.authorityCurrent = false; respond(row);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'DENY' });
    row.authorityCurrent = 'true'; respond(row);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
  });
  it('rejects outer and nested unknown fields instead of discarding needed source', async () => {
    for (const edit of [(row: Data) => { row.extra = true; }, (row: Data) => { capsule(row).extra = true; },
      (row: Data) => { d(portal(row).credential).passwordHash = 'must-not-be-projected'; },
      (row: Data) => { d(capsule(row).locationSource).extra = true; },
      (row: Data) => { d(policy(row).definition).extra = true; }]) {
      const row = fixture(); edit(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('rejects capsule/record/array proxies without metadata or value traps', async () => {
    for (const select of ['capsule', 'credential', 'locations']) {
      const row = fixture(), h = hostile(select === 'locations' ? [] : {});
      if (select === 'capsule') row.nativeCurrentSource = h.value;
      else if (select === 'credential') portal(row).credential = h.value;
      else d(capsule(row).locationSource).locations = h.value;
      respond(row); expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
      expect(h.calls()).toBe(0);
    }
  });
  it('refuses nested accessors including symbols without reading them', async () => {
    for (const key of ['version', Symbol('private')]) {
      const row = fixture(); let reads = 0;
      Object.defineProperty(d(portal(row).credential), key, { enumerable: true, configurable: true, get() { reads++; throw Error('must_not_read'); } });
      respond(row); expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
    }
  });
  it('refuses inherited descriptor.value pollution without accessor execution', async () => {
    const row = fixture(), issued = await proof(row), facts = getTenantProofFacts(issued) as PortalProofFacts;
    let reads = 0;
    Object.defineProperty(d(portal(row).credential), 'version', { configurable: true, enumerable: true, get() { reads++; return at; } });
    const before = Object.getOwnPropertyDescriptor(Object.prototype, 'value');
    let rejected = false;
    try {
      Object.defineProperty(Object.prototype, 'value', { configurable: true, value: at });
      // No spy/framework operation inside the polluted interval. This is the
      // real parser reached by the strict issuer, not an authority constructor.
      try { readPortalNativeCurrentSource(row.nativeCurrentSource, facts); } catch { rejected = true; }
    } finally {
      if (before) Object.defineProperty(Object.prototype, 'value', before); else delete d(Object.prototype).value;
    }
    expect({ rejected, reads }).toEqual({ rejected: true, reads: 0 });
  });
  it('refuses sparse/inherited/custom-iterator locations without behavior', async () => {
    const row = fixture(); let reads = 0;
    const sparse = new Array(1), prototype = Object.create(Array.prototype);
    Object.defineProperty(prototype, '0', { get() { reads++; throw Error('must_not_read'); } }); Object.setPrototypeOf(sparse, prototype);
    d(capsule(row).locationSource).locations = sparse; respond(row);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    const other = fixture(), array = d(capsule(other).locationSource).locations as unknown[];
    Object.defineProperty(array, Symbol.iterator, { get() { reads++; throw Error('must_not_read'); } }); respond(other);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' }); expect(reads).toBe(0);
  });
  it('rejects native int8 Numbers/BigInts/overflow/leading-zero primitive text', async () => {
    for (const value of [1, BigInt(1), '0', '-1', '01', '9223372036854775808', '1\n']) {
      const row = fixture(); d(portal(row).portal).authorizationVersion = value; respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('preserves unsafe-JS native int8/max values and native microseconds without rounding', async () => {
    const issued = await proof(), snap = d(payload(issued).nativeCurrentSource), p = d(d(snap.sources).portalSource);
    expect(d(p.portal).authorizationVersion).toBe('9223372036854775807');
    expect(d(p.portal).portalAccessVersion).toBe('9007199254740993');
    expect(d(p.session).createdAt).toBe(at); expect(d(p.issuance).sessionCreatedAt).toBe(at);
    expect(snap.resolvedAt).toBe(resolvedAt); expect(snap.expiresAt).toBe(expiresAt);
  });
  it('cross-binds all six selected snapshot fields to facts without normalization', async () => {
    for (const key of ['locator', 'sessionTokenHash', 'workspaceId', 'employeeId', 'resolvedAt', 'expiresAt']) {
      const row = fixture(); capsule(row)[key] = String(capsule(row)[key]) + ' '; respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('requires workspace/employee versions, role and portal generations to match facts exactly', async () => {
    for (const edit of [(row: Data) => { d(portal(row).workspace).version = '2026-10-08 10:00:00.123457+00'; },
      (row: Data) => { d(portal(row).employee).version = '2026-10-08 10:00:00.123457+00'; },
      (row: Data) => { row.role = 'LEAD'; }, (row: Data) => { row.authorizationVersion = '2'; },
      (row: Data) => { row.portalAccessVersion = '2'; }, (row: Data) => { row.capabilityPolicyRevision = '2'; }]) {
      const row = fixture(); edit(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('requires session creation/LIVE generation and expiry upper bound equality', async () => {
    for (const edit of [(row: Data) => { d(portal(row).issuance).sessionCreatedAt = '2026-10-08 10:00:00.123457+00'; },
      (row: Data) => { d(portal(row).issuance).portalAccessVersion = '2'; },
      (row: Data) => { d(portal(row).issuance).workspaceIncarnation = '2'; },
      (row: Data) => { row.sessionExpiresAt = '2026-10-09 12:03:00+00'; }]) {
      const row = fixture(); edit(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('rejects leap seconds, expired source and proof expiry beyond native original session', async () => {
    for (const edit of [(row: Data) => { d(portal(row).credential).version = '2026-10-08 10:00:60+00'; },
      (row: Data) => { d(portal(row).session).expiresAt = '2026-10-09 11:59:00+00'; },
      (row: Data) => { row.expiresAt = capsule(row).expiresAt = '2026-10-09 12:03:00+00'; }]) {
      const row = fixture(); edit(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('refuses NUL/lone-surrogate native text instead of Unicode repair', async () => {
    for (const value of ['lineage\0', 'lineage\ud800']) {
      const row = fixture(); d(portal(row).portal).provenanceReference = value; respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('requires full native policy bytes, hashes, bundle and installation revision coherence', async () => {
    for (const edit of [(row: Data) => { d(d(policy(row).definition).canonicalPolicySource).bytesBase64 = 'eA=='; },
      (row: Data) => { d(policy(row).installation).policyRevision = '2'; },
      (row: Data) => { d(d(policy(row).definition).sourceBundleWire).text = '{}'; },
      (row: Data) => { delete d(policy(row).definition).approvedPRDSource; }]) {
      const row = fixture(); edit(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('preserves full definition preimages/epoch rather than replacing them with hashes', async () => {
    const row = fixture(), out = d(payload(await proof(row)).nativeCurrentSource);
    expect(d(out.sources).installedPolicy).toEqual(policy(row));
    expect(d(d(d(out.sources).installedPolicy).definition).sourceBundleWire).toEqual(d(policy(row).definition).sourceBundleWire);
    expect(d(d(d(out.sources).installedPolicy).installation).installationEpoch).toBe(d(policy(row).installation).installationEpoch);
  });
  it('rejects foreign/NULL/duplicate/unsorted location membership instead of filtering it', async () => {
    for (const edit of [(row: Data) => { d((d(capsule(row).locationSource).locations as unknown[])[0]).workspaceId = 'other'; },
      (row: Data) => { d((d(capsule(row).locationSource).eligibility as unknown[])[0]).workspaceId = null; },
      (row: Data) => { const list = d(capsule(row).locationSource).locations as unknown[]; list.push(copy(list[0])); },
      (row: Data) => { (d(capsule(row).locationSource).locations as unknown[]).push({ id: 'location-0', workspaceId: row.workspaceId, active: true, version: at }); },
      (row: Data) => { row.allowedLocationIds = ['missing']; }]) {
      const row = fixture(); edit(row); respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('retains inactive/ungranted locations while refusing absent IDs in permitted facts', async () => {
    const row = fixture(); const membership = d(capsule(row).locationSource);
    (membership.locations as unknown[]).push({ id: 'location-b', workspaceId: row.workspaceId, active: false, version: at });
    const issued = await proof(row); expect(d(d(payload(issued).nativeCurrentSource).locationSource)).toEqual(membership);
    row.allowedLocationIds = ['foreign-location']; respond(row);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
  });
  it('cross-binds explicit Manager scope and exact unordered administrative set', async () => {
    const row = fixture(); row.role = d(portal(row).employee).role = 'MANAGER';
    row.administrativeScope = { kind: 'LOCATIONS', origin: 'EXPLICIT_GRANT', locationIds: ['location-a'] };
    row.administrativeLocationIds = ['location-a'];
    portal(row).administrative = { workspaceId: row.workspaceId, employeeId: row.employeeId, scopeKind: 'LOCATIONS',
      scopeOrigin: 'EXPLICIT_GRANT', provenanceReference: 'fictional explicit only', capabilityPolicyRevision: row.capabilityPolicyRevision,
      capabilities: [], locationIds: ['location-a'] };
    await proof(row); row.administrativeScope = { kind: 'ALL_TENANT', origin: 'EXPLICIT_GRANT' }; respond(row);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
  });
  it('detaches source inputs before issuance and cannot be mutated through old wire references', async () => {
    const row = fixture(), expected = copy(capsule(row)), issued = await proof(row);
    d(portal(row).credential).version = '2026-10-08 11:00:00+00';
    d(d(policy(row).definition).sourceBundleWire).text = 'changed';
    d(capsule(row).locationSource).locations = [];
    expect(payload(issued).nativeCurrentSource).toEqual(expected);
    deeplyFrozen(getTenantProofFacts(issued));
  });
  it('hands identical complete payload to both guards with unchanged business/fence ordering', async () => {
    const issued = await proof(); transport.transaction.mockResolvedValueOnce([
      [{ catalog_fence: '' }], [{ guard: 1 }], [], [{ guard: 1 }],
      [{ id: getTenantProofFacts(issued).workspaceId, name: 'Fictional', time_zone: 'UTC', active: true }],
      [{ guard: 1 }], [{ guard: 1 }],
    ]);
    expect(await createTenantExecutor(issued).query(workspaceSnapshot(issued))).toMatchObject({ name: 'Fictional' });
    const queries = transport.transaction.mock.calls[1][0] as Query[];
    expect(queries[0].text).toBe(RUNTIME_CATALOG_SHARED_FENCE_SQL.text); expect(queries).toHaveLength(7);
    expect(queries[3].text).toContain('lock_and_assert_current_proof'); expect(queries[5].text).toContain('assert_current_proof');
    expect(queries[3].values).toEqual(queries[5].values);
    expect(d(JSON.parse(queries[3].values[0] as string)).nativeCurrentSource).toEqual(payload(issued).nativeCurrentSource);
  });
  it('retains stale-source guard denial as generic unavailable with no retry/decoding', async () => {
    const issued = await proof(); transport.transaction.mockRejectedValueOnce(Error('42501 private source mismatch'));
    await expect(createTenantExecutor(issued).query(workspaceSnapshot(issued))).rejects.toThrow('tenant_execution_unavailable');
    expect(transport.transaction).toHaveBeenCalledTimes(2);
  });
  it('cannot issue or compile a cloned/proxy proof by shape or matching snapshot', async () => {
    const issued = await proof(); const h = hostile(issued);
    for (const value of [{ ...issued }, h.value]) expect(() => compileTenantProofExecutionPayload(value as PortalProof)).toThrow('tenant_proof_denied');
    expect(h.calls()).toBe(0);
  });
  it('preserves genuine legacy Portal facts-only payload and legacy parsing while strict issuer rejects it', async () => {
    const row = fixture(); delete row.format; delete row.nativeCurrentSource; respond(row);
    const result = await resolvePortalProof(locator, token); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('legacy fictional wire');
    expect(compileTenantProofExecutionPayload(result.proof)).toBe(JSON.stringify(getTenantProofFacts(result.proof)));
    respond(row); expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
  });
  it('preserves nonPortal facts-only payload byte contract without native capsule', async () => {
    const row = { kind: 'CALENDAR_READ', authorityCurrent: true, workspaceId: 'w', workspaceVersion: at,
      workspaceIncarnation: '1', resolvedAt, expiresAt, subscriptionId: 's', digest: token,
      generation: 'g', employeeId: 'e', employeeVersion: at, authorizationVersion: '1', allowedLocationIds: ['location-a'] };
    respond(row); const result = await resolveCalendarReadProof(token); expect(result.status).toBe('ALLOW');
    if (result.status !== 'ALLOW') throw Error('nonPortal fictional wire');
    expect(compileTenantProofExecutionPayload(result.proof)).toBe(JSON.stringify(getTenantProofFacts(result.proof)));
  });
  it('retains credential restriction/provenance labels as data, never a separate authority flag', async () => {
    const issued = await proof(), p = d(d(d(payload(issued).nativeCurrentSource).sources).portalSource);
    expect(d(p.credential).mustChangePassword).toBe(true);
    expect(d(p.portal).proofProvenance).toBe('LEGACY_UNVERIFIED');
    expect(d(p.portal).provenanceReference).toBe(' fictional lineage only ');
    expect(getTenantProofFacts(issued)).not.toHaveProperty('identityVerified');
    expect(getTenantProofFacts(issued)).not.toHaveProperty('mustChangePassword');
    // The independently trusted native root must select restricted-session
    // permissions; this fictional wire test cannot certify that decision.
  });
  it('rejects cyclic/nonJSON sources and noncanonical policy epoch rather than stringify them', async () => {
    const cyclic = fixture(); d(portal(cyclic).credential).cycle = cyclic.nativeCurrentSource; respond(cyclic);
    expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    for (const epoch of [1, '01', '0', '9223372036854775808']) {
      const row = fixture(); d(policy(row).installation).installationEpoch = epoch; respond(row);
      expect(await resolvePortalRequestProof(locator, token)).toEqual({ status: 'UNAVAILABLE' });
    }
  });
  it('rejects expired private identity even if the matching native snapshot is retained', async () => {
    const issued = await proof(); vi.setSystemTime(new Date('2026-10-09T12:03:00Z'));
    expect(() => compileTenantProofExecutionPayload(issued)).toThrow('tenant_proof_denied');
  });
  it('preserves native-permitted inactive historical membership without deriving per-operation authority', async () => {
    const row = fixture();
    d((d(capsule(row).locationSource).locations as unknown[])[0]).active = false;
    const issued = await proof(row);
    const facts = getTenantProofFacts(issued);
    if (facts.kind !== 'PORTAL') throw Error('Expected genuine Portal wire proof');
    expect(facts.allowedLocationIds).toEqual(['location-a']);
    expect(d(d(payload(issued).nativeCurrentSource).locationSource).locations).toEqual(
      d(capsule(row).locationSource).locations);
    // Actual native lineage/effective grants and HISTORY/RESTORE capability
    // evaluation remain mandatory; this is only the closed wire contract.
  });
});
