// No mocks, proof constructors, native invocation or installation approval.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS } from '../../capabilities/policy';
import type { UserRole } from '../../domain';
import { comparePortalRootStartupSources, inspectPresentedPortalRootSources } from './portal-root-source-observation';

type Data = Record<string, unknown>;
const data = (value: unknown) => value as Data; // Known fictional fixture data only.
const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));
const token = 'a'.repeat(64);
const at = '2026-10-09 12:00:00.123456+00';
const maxInt8 = '9223372036854775807';
const sourceStatus = 'SOURCE_AND_CEILING_OBSERVATIONS_NOT_AUTHORITY';
const startupStatus = 'STARTUP_SOURCE_COHERENT_NOT_AUTHENTICATED';
const blocked = (code: string) => ({ status: 'BLOCKED', code });
const sha256 = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');

function fixture(): { raw: Data; selection: Data; expected: Data } {
  // Retained IP03 native policy observation; only the new Portal rows below are
  // fictional. Matching this fixture grants no database/operator provenance.
  const installed = JSON.parse(readFileSync(new URL('./fixtures/installed-policy-native-observation.json', import.meta.url), 'utf8'));
  const expected: Data = installed.expected;
  const workspaceId = expected.workspaceId, employeeId = 'employee-β';
  const incarnation = expected.workspaceIncarnation, revision = expected.policyRevision;
  const portalSource = {
    kind: 'PORTAL_SOURCE_OBSERVATION_V1',
    workspace: { id: workspaceId, active: true, version: at },
    employee: { id: employeeId, workspaceId, active: true, role: 'MANAGER', version: at },
    credential: { employeeId, version: at, mustChangePassword: true },
    incarnation: { workspaceId, version: incarnation },
    portal: { workspaceId, employeeId, authorizationVersion: maxInt8, portalAccessVersion: '9007199254740993',
      capabilityPolicyRevision: revision, state: 'ENABLED', proofProvenance: 'LEGACY_UNVERIFIED', provenanceReference: ' fictional retained compatibility ' },
    session: { tokenHash: token, employeeId, expiresAt: '2026-10-09 12:00:00.123457+00', createdAt: at },
    issuance: { tokenHash: token, workspaceId, employeeId, workspaceIncarnation: incarnation,
      portalAccessVersion: '9007199254740993', sessionCreatedAt: at },
    administrative: { workspaceId, employeeId, scopeKind: 'LOCATIONS', scopeOrigin: 'EXPLICIT_GRANT',
      provenanceReference: ' fictional explicit grant ', capabilityPolicyRevision: revision,
      capabilities: ['profile.self.read'], locationIds: [' 位置-β ', 'location-a'] },
  };
  return {
    raw: { kind: 'PORTAL_POLICY_SOURCE_OBSERVATION_V1', portalSource, installedPolicy: installed.raw,
      verification: 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION' },
    selection: { locator: 'portal-tenant-01', sessionTokenHash: token, workspaceId, employeeId, databaseObservedAt: at },
    expected,
  };
}
const portal = (f: ReturnType<typeof fixture>) => data(f.raw.portalSource);
const inspect = (f: ReturnType<typeof fixture>) => inspectPresentedPortalRootSources(f.raw, f.selection, f.expected);
function observation(f: ReturnType<typeof fixture>) {
  const result = inspect(f);
  expect(result.status).toBe(sourceStatus);
  if (result.status === 'BLOCKED') throw new Error(result.code);
  return result.observation;
}
function deeplyFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const item of Object.values(value)) deeplyFrozen(item);
}
function hostile(target: object) {
  let calls = 0;
  const hit = (): never => { calls++; throw new Error('test trap must not execute'); };
  return { value: new Proxy(target, { get: hit, getPrototypeOf: hit, ownKeys: hit, getOwnPropertyDescriptor: hit }), calls: () => calls };
}
function startupFixture(): Data {
  const f = fixture();
  // Explicit fictional body/capsule, not a registered root or approved owner.
  const rootDefinition = 'fictional unresolved Portal root source β\n';
  const nativeAuditCapsuleText = '{"fictional": true, "ownerOid": "3"}';
  return { format: 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1', databaseOid: '1', rootOid: '2', ownerOid: '3',
    rootDefinition, rootDefinitionSha256: sha256(rootDefinition), nativeAuditCapsuleText,
    nativeAuditCapsuleSha256: sha256(nativeAuditCapsuleText),
    canonicalPolicySource: Buffer.from(f.expected.canonicalPolicySource as number[]).toString('utf8'),
    vocabularySource: Buffer.from(f.expected.vocabularySource as number[]).toString('utf8'),
    approvedPRDSource: Buffer.from(f.expected.approvedPRDSource as number[]).toString('utf8') };
}

describe('unused Portal root source observation composition', () => {
  it('preserves native microseconds, exact source identities, legacy provenance and source-only labels', () => {
    const f = fixture(), result = inspect(f), out = observation(f);
    expect(out.portal.workspace.id).toBe(' pp_d3757d4c43d2f8f0_workspace ');
    expect(out.portal.employee.id).toBe('employee-β');
    expect(out.portal.session.createdAt).toBe(at);
    expect(out.portal.originalSessionExpiryUpperBound).toBe('2026-10-09 12:00:00.123457+00');
    expect(out.portal.portal.authorizationVersion).toBe(maxInt8);
    expect(out.portal.portal.capabilityPolicyRevision).toBe('9007199254740994');
    expect(out.portal.portal.proofProvenance).toBe('LEGACY_UNVERIFIED');
    expect(out.portal.credential.mustChangePassword).toBe(true);
    expect(out.installedPolicy).toEqual(f.raw.installedPolicy);
    expect(out.verification).toBe('NOT_PROOF_NOT_CURRENT_GRANT_OR_OPERATION_PERMISSION');
    for (const name of ['proof', 'authorityCurrent', 'allowed', 'grant', 'identityVerified', 'executingSourceAuthenticated']) {
      expect(result).not.toHaveProperty(name); expect(out).not.toHaveProperty(name);
    }
  });

  it('retains canonical native max-int8 counter/access/epoch without Number rounding', () => {
    const f = fixture(), p = portal(f), installed = data(f.raw.installedPolicy);
    data(p.incarnation).version = maxInt8; data(p.issuance).workspaceIncarnation = maxInt8;
    data(p.portal).portalAccessVersion = maxInt8; data(p.issuance).portalAccessVersion = maxInt8;
    installed.workspaceIncarnation = maxInt8;
    data(installed.installation).workspaceIncarnation = maxInt8; data(installed.installation).installationEpoch = maxInt8;
    f.expected.workspaceIncarnation = maxInt8; f.expected.installationEpoch = maxInt8;
    const out = observation(f);
    expect(out.portal.incarnation.version).toBe(maxInt8); expect(out.portal.issuance.portalAccessVersion).toBe(maxInt8);
    expect(out.installedPolicy.installation.installationEpoch).toBe(maxInt8);
  });

  it('requires canonical selection locator and strict presented digest without rewriting either', () => {
    for (const locator of [' PORTAL-TENANT-01 ', 'PORTAL-TENANT-01', 'short', 'portal_tenant_01', Object('portal-tenant-01')]) {
      const f = fixture(); f.selection.locator = locator;
      expect(inspect(f)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
    for (const digest of [token + '\n', token.toUpperCase(), 'a'.repeat(63), 'g'.repeat(64), 1, null]) {
      const f = fixture(); f.selection.sessionTokenHash = digest;
      expect(inspect(f)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
    const f = fixture(); f.selection.locator = '--------';
    expect(observation(f).locator).toBe('--------'); // Existing syntax has no edge-hyphen policy.
  });

  it('rejects nonrecords, unsupported outer tags and custom selection/nested prototypes', () => {
    for (const value of [null, undefined, false, 'source', [], 1]) {
      const f = fixture();
      expect(inspectPresentedPortalRootSources(value, f.selection, f.expected)).toEqual(blocked('INVALID_SOURCE_INPUT'));
      expect(inspectPresentedPortalRootSources(f.raw, value, f.expected)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
    for (const field of ['kind', 'verification']) {
      const f = fixture(); f.raw[field] = 'foreign'; expect(inspect(f)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
    const f = fixture(); Object.setPrototypeOf(f.selection, { locator: 'portal-tenant-01' });
    expect(inspect(f)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    const g = fixture(); Object.setPrototypeOf(data(portal(g).credential), { version: at });
    expect(inspect(g)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('rejects selection identity/token/clock mismatch and nested LIVE source disagreement', () => {
    for (const field of ['workspaceId', 'employeeId', 'sessionTokenHash', 'databaseObservedAt']) {
      const f = fixture(); f.selection[field] = field === 'sessionTokenHash' ? 'b'.repeat(64) : field === 'databaseObservedAt' ? 'not a native timestamp' : 'foreign';
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    for (const [field, value] of [['workspaceIncarnation', '4'], ['portalAccessVersion', '9007199254740994'], ['sessionCreatedAt', '2026-10-09 12:00:00.123455+00']] as const) {
      const f = fixture(); data(portal(f).issuance)[field] = value;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
  });

  it('requires workspace equality across two otherwise internally coherent decoded observations', () => {
    const f = fixture(), p = portal(f); f.selection.workspaceId = 'different-workspace';
    data(p.workspace).id = 'different-workspace';
    for (const field of ['employee', 'incarnation', 'portal', 'issuance', 'administrative']) data(p[field]).workspaceId = 'different-workspace';
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('requires exact incarnation and policy revision cross-binding after both parsers succeed', () => {
    const f = fixture(); data(portal(f).incarnation).version = '4'; data(portal(f).issuance).workspaceIncarnation = '4';
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    const g = fixture(); data(portal(g).portal).capabilityPolicyRevision = '9007199254740995';
    data(portal(g).administrative).capabilityPolicyRevision = '9007199254740995';
    expect(inspect(g)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('checks actual installed expectation/full source bytes and rejects nested wire drift', () => {
    for (const field of ['workspaceId', 'workspaceIncarnation', 'installationEpoch', 'policyId', 'policyRevision']) {
      const f = fixture(); f.expected[field] = field.endsWith('Id') ? 'wrong explicit identity' : '1';
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    for (const field of ['canonicalPolicySource', 'vocabularySource', 'approvedPRDSource']) {
      const f = fixture(); (f.expected[field] as number[])[0] ^= 1;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    const f = fixture(); data(data(data(f.raw.installedPolicy).definition).sourceBundleWire).sha256 = 'b'.repeat(64);
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('blocks current source inactivity/state/expiry rather than exposing an ALLOW observation', () => {
    for (const state of ['DISABLED', 'PROOF_PENDING', 'SUSPENDED']) {
      const f = fixture(); data(portal(f).portal).state = state; expect(inspect(f)).toEqual(blocked('SOURCE_INELIGIBLE'));
    }
    for (const field of ['workspace', 'employee']) {
      const f = fixture(); data(portal(f)[field]).active = false; expect(inspect(f)).toEqual(blocked('SOURCE_INELIGIBLE'));
    }
    const f = fixture(); data(portal(f).session).expiresAt = at;
    expect(inspect(f)).toEqual(blocked('SOURCE_INELIGIBLE'));
  });

  it('preserves all existing provenance and must-change observations without granting attestation', () => {
    for (const provenance of ['UNVERIFIED', 'LEGACY_UNVERIFIED', 'VERIFIED']) for (const mustChange of [false, true]) {
      const f = fixture(); data(portal(f).portal).proofProvenance = provenance; data(portal(f).credential).mustChangePassword = mustChange;
      const out = observation(f);
      expect(out.portal.portal.proofProvenance).toBe(provenance); expect(out.portal.credential.mustChangePassword).toBe(mustChange);
      expect(out).not.toHaveProperty('identityVerified'); expect(out).not.toHaveProperty('authorityCurrent');
    }
  });

  it('uses the full canonical role ceiling and explicit Manager grant requirement only', () => {
    for (const role of ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const satisfies readonly UserRole[]) {
      const f = fixture(), p = portal(f); data(p.employee).role = role;
      if (role === 'LEAD' || role === 'EMPLOYEE') p.administrative = null;
      const grants = role === 'MANAGER' ? ['profile.self.read'] : [];
      const expected = CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.filter(rule => rule.roles.includes(role) &&
        !(role === 'MANAGER' && rule.requiresExplicitManagerGrant && !grants.includes(rule.capability))).map(rule => rule.capability);
      const out = observation(f); expect(out.capabilityCeiling).toEqual(expected);
      expect(out.capabilityCeiling).not.toContain('workspace.restore');
    }
    const f = fixture(); data(portal(f).administrative).capabilities = [];
    expect(observation(f).capabilityCeiling).toContain('management.home.read');
    expect(observation(f).capabilityCeiling).not.toContain('employee.create');
    data(portal(f).administrative).capabilities = ['employee.create'];
    expect(observation(f).capabilityCeiling).toContain('employee.create');
    expect(observation(f).capabilityCeiling).not.toContain('authority.grant');
    expect(observation(f).capabilityCeiling).not.toContain('employee.roster.read');
  });

  it('retains explicit legacy ALL_TENANT scope without inferring it from absent data', () => {
    const f = fixture(), admin = data(portal(f).administrative);
    admin.scopeKind = 'ALL_TENANT'; admin.scopeOrigin = 'LEGACY_COMPATIBILITY'; admin.locationIds = [];
    expect(observation(f).portal.administrative?.scopeOrigin).toBe('LEGACY_COMPATIBILITY');
    admin.locationIds = ['location-a']; expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    const g = fixture(); portal(g).administrative = null; expect(inspect(g)).toEqual(blocked('SOURCE_MISMATCH'));
    const h = fixture(); data(portal(h).employee).role = 'EMPLOYEE'; expect(inspect(h)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('rejects noncanonical numeric/timestamp/UTF text source without rounding or coercion', () => {
    for (const value of ['0', '-0', '01', '1e0', '9223372036854775808', '9'.repeat(78), 1, BigInt(1), Object('1'), null]) {
      const f = fixture(); data(portal(f).portal).authorizationVersion = value;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    for (const value of ['2026-10-09 12:00:00.1234567+00', '2026-10-09 12:00:60+00', '2026-02-30 12:00:00+00', '\ud800', '\udfff', 'employee\0β']) {
      const f = fixture(); data(portal(f).credential).version = value;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    const f = fixture(); data(portal(f).employee).id = '\ud800'; expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('accepts the existing native UTC and ISO UTC spellings while retaining exact original bytes', () => {
    for (const value of [at, '2026-10-09T12:00:00.123456Z', '2026-10-09 12:00:00.123456+00:00']) {
      const f = fixture(); data(portal(f).credential).version = value;
      expect(observation(f).portal.credential.version).toBe(value);
    }
  });

  it('rejects closed outer/selection/nested extra, missing, hidden, symbol and accessor fields trap-free', () => {
    for (const site of ['raw', 'selection', 'credential'] as const) for (const mode of ['extra', 'missing', 'hidden', 'symbol', 'accessor'] as const) {
      const f = fixture(), target = site === 'credential' ? data(portal(f).credential) : f[site];
      const key = Object.keys(target)[0]; let calls = 0;
      if (mode === 'extra') target.authorityCurrent = true;
      if (mode === 'missing') delete target[key];
      if (mode === 'hidden') Object.defineProperty(target, key, { value: target[key], enumerable: false });
      if (mode === 'symbol') Object.defineProperty(target, Symbol('extra'), { value: 1, enumerable: true });
      if (mode === 'accessor') Object.defineProperty(target, key, { enumerable: true, get: () => { calls++; throw new Error('must not read'); } });
      expect(inspect(f)).toEqual(blocked(site === 'credential' ? 'SOURCE_MISMATCH' : 'INVALID_SOURCE_INPUT')); expect(calls).toBe(0);
    }
  });

  it('rejects raw/selection/nested/expected/proxy arrays and revoked proxies before traps', () => {
    for (const site of ['raw', 'selection', 'credential', 'expected', 'grants'] as const) {
      const f = fixture();
      const h = hostile(site === 'credential' ? data(portal(f).credential) : site === 'grants' ? [] : f[site === 'expected' ? 'expected' : site === 'selection' ? 'selection' : 'raw']);
      let result;
      if (site === 'raw') result = inspectPresentedPortalRootSources(h.value, f.selection, f.expected);
      else if (site === 'selection') result = inspectPresentedPortalRootSources(f.raw, h.value, f.expected);
      else if (site === 'expected') result = inspectPresentedPortalRootSources(f.raw, f.selection, h.value);
      else { if (site === 'credential') portal(f).credential = h.value; else data(portal(f).administrative).capabilities = h.value; result = inspect(f); }
      expect(result).toEqual(blocked(site === 'raw' || site === 'selection' ? 'INVALID_SOURCE_INPUT' : 'SOURCE_MISMATCH')); expect(h.calls()).toBe(0);
    }
    const f = fixture(), revoked = Proxy.revocable({}, {}); revoked.revoke();
    expect(inspectPresentedPortalRootSources(revoked.proxy, f.selection, f.expected)).toEqual(blocked('INVALID_SOURCE_INPUT'));
  });

  it('rejects sparse/extra/hidden/getter/duplicate/unknown dense grant and expected-byte entries', () => {
    for (const mode of ['sparse', 'extra', 'hidden', 'getter', 'duplicate', 'unknown'] as const) {
      const f = fixture(), values: string[] = ['profile.self.read']; let calls = 0;
      if (mode === 'sparse') delete values[0];
      if (mode === 'extra') Object.defineProperty(values, 'extra', { value: 1 });
      if (mode === 'hidden') Object.defineProperty(values, '0', { value: values[0], enumerable: false });
      if (mode === 'getter') Object.defineProperty(values, '0', { enumerable: true, get: () => { calls++; return 'profile.self.read'; } });
      if (mode === 'duplicate') values.push(values[0]);
      if (mode === 'unknown') values[0] = 'invented.capability';
      data(portal(f).administrative).capabilities = values;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH')); expect(calls).toBe(0);
    }
    for (const mode of ['sparse', 'extra', 'getter', 'invalid-byte'] as const) {
      const f = fixture(), bytes = f.expected.canonicalPolicySource as number[]; let calls = 0;
      if (mode === 'sparse') delete bytes[0];
      if (mode === 'extra') Object.defineProperty(bytes, 'extra', { value: 1 });
      if (mode === 'getter') Object.defineProperty(bytes, '0', { enumerable: true, get: () => { calls++; return 1; } });
      if (mode === 'invalid-byte') bytes[0] = 256;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH')); expect(calls).toBe(0);
    }
  });

  it('detaches and freezes all returned source/ceiling data without turning ordinary clones into proof', () => {
    const f = fixture(), result = inspect(f), out = observation(f); deeplyFrozen(result);
    data(portal(f).employee).id = 'changed'; data(portal(f).administrative).capabilities = [];
    data(data(f.raw.installedPolicy).installation).policyId = 'changed';
    f.selection.locator = 'changed-locator'; (f.expected.canonicalPolicySource as number[])[0] ^= 1;
    expect(out.portal.employee.id).toBe('employee-β'); expect(out.locator).toBe('portal-tenant-01');
    expect(out.installedPolicy.installation.policyId).toBe(' fictional explicit policy ');
    const ordinary = clone(out); expect(ordinary.verification).toBe('NOT_PROOF_NOT_CURRENT_GRANT_OR_OPERATION_PERMISSION');
    expect(ordinary).not.toHaveProperty('authorityCurrent'); expect(ordinary).not.toHaveProperty('proof');
  });
});

describe('Portal startup exact source correspondence, not authenticated installation', () => {
  it('compares every full retained source/body/capsule and returns detached frozen nonauthority observations', () => {
    const observed = startupFixture(), retained = clone(observed);
    const result = comparePortalRootStartupSources(observed, retained);
    expect(result.status).toBe(startupStatus); deeplyFrozen(result);
    if (result.status === 'BLOCKED') throw new Error(result.code);
    expect(result.observation).toEqual(observed);
    expect(result.verification).toBe('EXACT_BYTES_AND_NATIVE_CAPSULE_ONLY_NOT_REVIEWER_INSTALLER_EXECUTING_CODE_OR_TENANT_AUTHORITY');
    observed.rootDefinition = 'changed'; retained.canonicalPolicySource = 'changed';
    expect(result.observation.rootDefinition).toBe('fictional unresolved Portal root source β\n');
    for (const name of ['authorityCurrent', 'proof', 'allowed', 'reviewerAuthenticated', 'installerAuthenticated']) expect(result).not.toHaveProperty(name);
  });

  it('accepts canonical native OID lower/max boundaries without native safety or owner approval', () => {
    for (const value of ['1', '4294967295']) {
      const observed = startupFixture(); observed.databaseOid = value; observed.rootOid = value; observed.ownerOid = value;
      const result = comparePortalRootStartupSources(observed, clone(observed)); expect(result.status).toBe(startupStatus);
      if (result.status === 'BLOCKED') throw new Error(result.code);
      expect(result.observation.ownerOid).toBe(value); expect(result).not.toHaveProperty('ownerApproved');
    }
  });

  it('rejects zero/overflow/noncanonical/nonstring native OIDs on either argument', () => {
    for (const field of ['databaseOid', 'rootOid', 'ownerOid']) for (const value of ['0', '4294967296', '01', ' 1', '1\n', '+1', '1e0', '9'.repeat(78), 1, BigInt(1), Object('1'), null]) {
      const observed = startupFixture(), retained = clone(observed); observed[field] = value;
      expect(comparePortalRootStartupSources(observed, retained)).toEqual(blocked('INVALID_SOURCE_INPUT'));
      expect(comparePortalRootStartupSources(retained, observed)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
  });

  it('requires all three OIDs and each complete canonical source byte string to correspond', () => {
    for (const field of ['databaseOid', 'rootOid', 'ownerOid', 'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource']) {
      const observed = startupFixture(), retained = clone(observed);
      retained[field] = field.endsWith('Oid') ? '4' : String(retained[field]) + '\n';
      expect(comparePortalRootStartupSources(observed, retained)).toEqual(blocked('STARTUP_SOURCE_MISMATCH'));
    }
  });

  it('detects internally valid changed body/capsule, not only incorrect digest format', () => {
    for (const [field, digestField] of [['rootDefinition', 'rootDefinitionSha256'], ['nativeAuditCapsuleText', 'nativeAuditCapsuleSha256']] as const) {
      const observed = startupFixture(), retained = clone(observed), changed = String(retained[field]) + ' ';
      retained[field] = changed; retained[digestField] = sha256(changed);
      expect(comparePortalRootStartupSources(observed, retained)).toEqual(blocked('STARTUP_SOURCE_MISMATCH'));
    }
  });

  it('rejects malformed/empty body/capsule/source UTF text and incorrect exact digests', () => {
    for (const field of ['rootDefinition', 'nativeAuditCapsuleText', 'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource']) for (const value of ['', '\ud800', '\udfff', 'source\0bytes', Object('source'), null]) {
      const observed = startupFixture(); observed[field] = value;
      if (typeof value === 'string' && field === 'rootDefinition') observed.rootDefinitionSha256 = sha256(value);
      if (typeof value === 'string' && field === 'nativeAuditCapsuleText') observed.nativeAuditCapsuleSha256 = sha256(value);
      expect(comparePortalRootStartupSources(observed, clone(observed))).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
    for (const field of ['rootDefinitionSha256', 'nativeAuditCapsuleSha256']) for (const value of ['b'.repeat(64), 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(64) + '\n', null]) {
      const observed = startupFixture(); observed[field] = value;
      expect(comparePortalRootStartupSources(observed, clone(observed))).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
  });

  it('rejects closed startup extras/missing/accessor/symbol/prototype inputs without behavior reads', () => {
    for (const value of [null, undefined, false, 'source', [], 1]) {
      expect(comparePortalRootStartupSources(value, startupFixture())).toEqual(blocked('INVALID_SOURCE_INPUT'));
      expect(comparePortalRootStartupSources(startupFixture(), value)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    }
    for (const mode of ['extra', 'missing', 'accessor', 'hidden', 'symbol', 'prototype'] as const) {
      const observed = startupFixture(), retained = clone(observed); let calls = 0;
      if (mode === 'extra') observed.installerApproved = true;
      if (mode === 'missing') delete observed.ownerOid;
      if (mode === 'accessor') Object.defineProperty(observed, 'rootDefinition', { enumerable: true, get: () => { calls++; throw new Error('must not read'); } });
      if (mode === 'hidden') Object.defineProperty(observed, 'ownerOid', { value: '3', enumerable: false });
      if (mode === 'symbol') Object.defineProperty(observed, Symbol('extra'), { value: 1, enumerable: true });
      if (mode === 'prototype') Object.setPrototypeOf(observed, { ownerOid: '3' });
      expect(comparePortalRootStartupSources(observed, retained)).toEqual(blocked('INVALID_SOURCE_INPUT'));
      expect(comparePortalRootStartupSources(retained, observed)).toEqual(blocked('INVALID_SOURCE_INPUT')); expect(calls).toBe(0);
    }
  });

  it('rejects hostile/revoked outer and nested scalar proxies on either startup argument trap-free', () => {
    const ordinary = startupFixture(), h = hostile(ordinary);
    expect(comparePortalRootStartupSources(h.value, ordinary)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    expect(comparePortalRootStartupSources(ordinary, h.value)).toEqual(blocked('INVALID_SOURCE_INPUT')); expect(h.calls()).toBe(0);
    const revoked = Proxy.revocable({}, {}); revoked.revoke();
    expect(comparePortalRootStartupSources(revoked.proxy, ordinary)).toEqual(blocked('INVALID_SOURCE_INPUT'));
    const scalar = hostile({}), observed = startupFixture(); observed.rootDefinition = scalar.value;
    expect(comparePortalRootStartupSources(observed, ordinary)).toEqual(blocked('INVALID_SOURCE_INPUT')); expect(scalar.calls()).toBe(0);
  });

  it('keeps matching unsafe/fictional capsule bytes opaque: source match cannot authenticate a loader', () => {
    const observed = startupFixture(), text = '{"rootMissing": true, "ownerUnsafe": true, "authorityCurrent": false}';
    observed.nativeAuditCapsuleText = text; observed.nativeAuditCapsuleSha256 = sha256(text);
    const result = comparePortalRootStartupSources(observed, clone(observed)); expect(result.status).toBe(startupStatus);
    expect(result).not.toHaveProperty('loaderApproved'); expect(result).not.toHaveProperty('authorityCurrent');
  });
});
