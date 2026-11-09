// PREPARED executable regression source; UNEXECUTED by the producer.
// Ordinary source observations only. No mocks, proof constructor, installed root,
// native invocation, authenticated executing source or operation authority.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { inspectNativePortalRootObservation } from './portal-native-root-observation';

type Data = Record<string, unknown>;
const data = (value: unknown) => value as Data; // Known fictional fixture data only.
const token = 'a'.repeat(64);
const at = '2026-10-09 12:00:00.123456+00';
const maxInt8 = '9223372036854775807';
const blocked = (code: string) => ({ status: 'BLOCKED', code });
const invalidEnvelope = () => blocked('INVALID_NATIVE_PORTAL_ROOT_OBSERVATION');
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

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

type Fixture = ReturnType<typeof fixture>;
const portal = (f: Fixture) => data(f.raw.portalSource);
function native(f = fixture()): { source: Fixture; envelope: Data; presented: Data } {
  return { source: f,
    envelope: { kind: 'PRESENTED_PORTAL_ROOT_SOURCE_OBSERVATION_V1', selection: f.selection, sources: f.raw,
      verification: 'PROTECTED_SOURCE_CAPTURE_NOT_PORTAL_PROOF_OR_CURRENT_GRANT' },
    presented: { locator: f.selection.locator, sessionTokenHash: f.selection.sessionTokenHash } };
}
type NativeFixture = ReturnType<typeof native>;
const inspect = (f: NativeFixture) => inspectNativePortalRootObservation(f.envelope, f.presented, f.source.expected);
function success(f: NativeFixture) {
  const result = inspect(f);
  expect(result.status).toBe('NATIVE_ROOT_SOURCE_OBSERVATIONS_NOT_AUTHORITY');
  if (result.status !== 'NATIVE_ROOT_SOURCE_OBSERVATIONS_NOT_AUTHORITY') throw new Error('expected observation-only fixture');
  return result;
}
function deeplyFrozen(value: unknown): void {
  if (!value || typeof value !== 'object') return;
  expect(Object.isFrozen(value)).toBe(true);
  for (const item of Object.values(value)) deeplyFrozen(item);
}
function hostile(target: object) {
  let calls = 0;
  const hit = (): never => { calls++; throw new Error('hostile behavior must not execute'); };
  return { value: new Proxy(target, { get: hit, getPrototypeOf: hit, ownKeys: hit, getOwnPropertyDescriptor: hit }), calls: () => calls };
}

describe('unused fixed native Portal root envelope inspector', () => {
  it('uses retained independent native-fixture source preimages, not executing-policy authentication', () => {
    const f = native();
    const hashes = {
      canonicalPolicySource: '609fe897eaa63e2ddd6e51e33132398c5991f16d972a840eda7ba9051463be39',
      vocabularySource: '0e3ad18955214bb594c093696ae56afa272d73316810776b4fb076ca46d5d082',
      approvedPRDSource: '42eb6daff55d323a13f33de294f71396274ed43a4303fa7dd91c0d1afeddd55b',
    };
    for (const [field, hash] of Object.entries(hashes)) {
      expect(sha256(Buffer.from(f.source.expected[field] as number[]))).toBe(hash);
    }
    const result = success(f), out = result.observation;
    expect(out.locator).toBe('portal-tenant-01');
    expect(out.sessionTokenHash).toBe(token);
    expect(out.portal.employee.id).toBe('employee-β');
    expect(out.portal.workspace.id).toBe(' pp_d3757d4c43d2f8f0_workspace ');
    expect(out.installedPolicy).toEqual(f.source.raw.installedPolicy);
    expect(out.installedPolicy.installation.policyId).toBe(' fictional explicit policy ');
    expect(out.installedPolicy.installation.policyRevision).toBe('9007199254740994');
    expect(out.verification).toBe('NOT_PROOF_NOT_CURRENT_GRANT_OR_OPERATION_PERMISSION');
    expect(result.verification).toBe('NO_PORTAL_PROOF_CURRENT_GRANT_INSTALLER_OR_EXECUTING_SOURCE_AUTHORITY');
    for (const field of ['proof', 'authorityCurrent', 'allowed', 'grant', 'identityVerified', 'readAllowed',
      'currentVersion', 'executingSourceAuthenticated', 'installerAuthenticated', 'reviewerAuthenticated',
      'allowedLocationIds', 'effectiveCapabilities']) {
      expect(result).not.toHaveProperty(field); expect(out).not.toHaveProperty(field);
    }
  });

  it('preserves primitive native-int8 strings and microseconds without rounding or choosing a lifetime', () => {
    const out = success(native()).observation;
    expect(out.portal.portal.authorizationVersion).toBe(maxInt8);
    expect(out.portal.portal.portalAccessVersion).toBe('9007199254740993');
    expect(out.installedPolicy.installation.installationEpoch).toBe('9007199254740995');
    expect(out.portal.databaseObservedAt).toBe(at);
    expect(out.portal.session.createdAt).toBe(at);
    expect(out.portal.originalSessionExpiryUpperBound).toBe('2026-10-09 12:00:00.123457+00');
  });

  it('preserves LEGACY_UNVERIFIED and must-change observations without verification or activation', () => {
    for (const mustChange of [true, false]) {
      const f = native(); data(portal(f.source).credential).mustChangePassword = mustChange;
      const out = success(f).observation;
      expect(out.portal.portal.proofProvenance).toBe('LEGACY_UNVERIFIED');
      expect(out.portal.portal.provenanceReference).toBe(' fictional retained compatibility ');
      expect(out.portal.credential.mustChangePassword).toBe(mustChange);
      expect(out.portal.portal.state).toBe('ENABLED');
      expect(out).not.toHaveProperty('identityVerified'); expect(out).not.toHaveProperty('activationClaim');
    }
  });

  it('retains the explicit Manager scope and canonical ceiling without default grants or roster inference', () => {
    const f = native(), out = success(f).observation;
    expect(out.portal.administrative?.scopeKind).toBe('LOCATIONS');
    expect(out.portal.administrative?.locationIds).toEqual([' 位置-β ', 'location-a']);
    expect(out.capabilityCeiling).toContain('management.home.read');
    expect(out.capabilityCeiling).toContain('profile.self.read');
    expect(out.capabilityCeiling).not.toContain('employee.create');
    expect(out.capabilityCeiling).not.toContain('authority.grant');
    portal(f.source).administrative = null;
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('accepts owned null-prototype envelopes and preserves existing valid edge-hyphen locator syntax', () => {
    const f = native(); f.source.selection.locator = '--------'; f.presented.locator = '--------';
    f.envelope = Object.assign(Object.create(null), f.envelope);
    f.envelope.selection = Object.assign(Object.create(null), f.source.selection);
    f.presented = Object.assign(Object.create(null), f.presented);
    expect(success(f).observation.locator).toBe('--------');
  });

  it('rejects noncanonical presented locator/digest without coercion, trimming or repairing source identities', () => {
    for (const locator of [' PORTAL-TENANT-01 ', 'PORTAL-TENANT-01', 'short', 'portal_tenant_01', Object('portal-tenant-01'), null]) {
      const f = native(); f.presented.locator = locator; expect(inspect(f)).toEqual(invalidEnvelope());
    }
    for (const digest of [token + '\n', token.toUpperCase(), 'a'.repeat(63), 'g'.repeat(64), 1, BigInt(1), Object(token), null]) {
      const f = native(); f.presented.sessionTokenHash = digest; expect(inspect(f)).toEqual(invalidEnvelope());
    }
    let calls = 0;
    const f = native(); f.presented.locator = { toString: () => { calls++; return 'portal-tenant-01'; }, valueOf: () => { calls++; return 'portal-tenant-01'; } };
    expect(inspect(f)).toEqual(invalidEnvelope()); expect(calls).toBe(0);
  });

  it('requires presentation and native selection locator/digest equality before nested observations', () => {
    for (const [field, changed] of [['locator', 'portal-tenant-02'], ['sessionTokenHash', 'b'.repeat(64)]] as const) {
      const f = native(); f.source.selection[field] = changed;
      expect(inspect(f)).toEqual(invalidEnvelope());
      const g = native(); g.presented[field] = changed;
      expect(inspect(g)).toEqual(invalidEnvelope());
    }
  });

  it('requires selected native employee/workspace and presented digest to match retained source rows', () => {
    for (const field of ['employeeId', 'workspaceId']) {
      const f = native(); f.source.selection[field] = 'foreign';
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    const f = native(); f.presented.sessionTokenHash = 'b'.repeat(64); f.source.selection.sessionTokenHash = 'b'.repeat(64);
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    const g = native(); data(portal(g.source).employee).id = 'employee-β ';
    expect(inspect(g)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('rejects malformed native observation time and denies exact fractional expiry without exposing ready source', () => {
    const f = native(); f.source.selection.databaseObservedAt = '2026-10-09 12:00:00.1234567+00';
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    const g = native(); g.source.selection.databaseObservedAt = '2026-10-09 12:00:00.123457+00';
    expect(inspect(g)).toEqual(blocked('SOURCE_INELIGIBLE'));
    expect(inspect(g)).not.toHaveProperty('observation');
    const h = native(); data(portal(h.source).issuance).sessionCreatedAt = '2026-10-09 12:00:00.123455+00';
    expect(inspect(h)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('requires current Portal/administrative policy revision to match the retained installed source', () => {
    const f = native(); data(portal(f.source).portal).capabilityPolicyRevision = '9007199254740995';
    data(portal(f.source).administrative).capabilityPolicyRevision = '9007199254740995';
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    const g = native(); g.source.expected.installationEpoch = '9007199254740994';
    expect(inspect(g)).toEqual(blocked('SOURCE_MISMATCH'));
    const h = native(); data(portal(h.source).portal).authorizationVersion = '9223372036854775808';
    expect(inspect(h)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('requires all full independent expected source bytes and exact native source wire to match', () => {
    for (const field of ['canonicalPolicySource', 'vocabularySource', 'approvedPRDSource']) {
      const f = native(); (f.source.expected[field] as number[])[0] ^= 1;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
    }
    const f = native(); data(data(data(f.source.raw.installedPolicy).definition).sourceBundleWire).sha256 = 'b'.repeat(64);
    expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH'));
  });

  it('forwards canonical ineligible source denial without replacing disabled/inactive facts with authority', () => {
    for (const state of ['DISABLED', 'PROOF_PENDING', 'SUSPENDED']) {
      const f = native(); data(portal(f.source).portal).state = state;
      expect(inspect(f)).toEqual(blocked('SOURCE_INELIGIBLE'));
    }
    for (const field of ['workspace', 'employee']) {
      const f = native(); data(portal(f.source)[field]).active = false;
      expect(inspect(f)).toEqual(blocked('SOURCE_INELIGIBLE'));
    }
  });

  it('requires exact native envelope kind/verification, not facts or an authority-shaped shortcut', () => {
    for (const field of ['kind', 'verification']) {
      const f = native(); f.envelope[field] = 'PORTAL'; expect(inspect(f)).toEqual(invalidEnvelope());
    }
    const f = native(); f.envelope.authorityCurrent = true;
    expect(inspect(f)).toEqual(invalidEnvelope());
    const g = native(); g.envelope.sources = { kind: 'PORTAL', authorityCurrent: true };
    expect(inspect(g)).toEqual(blocked('INVALID_SOURCE_INPUT'));
  });

  it('rejects nonrecords and missing/null nested sources or installed expectations with exact boundary codes', () => {
    for (const value of [null, undefined, false, 'source', [], 1]) {
      const f = native();
      expect(inspectNativePortalRootObservation(value, f.presented, f.source.expected)).toEqual(invalidEnvelope());
      expect(inspectNativePortalRootObservation(f.envelope, value, f.source.expected)).toEqual(invalidEnvelope());
      f.envelope.selection = value; expect(inspect(f)).toEqual(invalidEnvelope());
    }
    for (const value of [null, undefined]) {
      const f = native(); f.envelope.sources = value;
      expect(inspect(f)).toEqual(blocked('INVALID_SOURCE_INPUT'));
      const g = native();
      expect(inspectNativePortalRootObservation(g.envelope, g.presented, value)).toEqual(blocked('SOURCE_MISMATCH'));
    }
  });

  it('rejects outer/presentation/selection extra, missing, hidden, symbol, accessor and inherited properties without getters', () => {
    for (const site of ['envelope', 'presented', 'selection'] as const) for (const mode of ['extra', 'missing', 'hidden', 'symbol', 'accessor', 'inherited'] as const) {
      const f = native(), target = site === 'selection' ? f.source.selection : f[site];
      const key = Object.keys(target)[0]; let calls = 0;
      if (mode === 'extra') target.proof = {};
      if (mode === 'missing') delete target[key];
      if (mode === 'hidden') Object.defineProperty(target, key, { value: target[key], enumerable: false });
      if (mode === 'symbol') Object.defineProperty(target, Symbol('extra'), { value: 1, enumerable: true });
      if (mode === 'accessor') Object.defineProperty(target, key, { enumerable: true, get: () => { calls++; throw new Error('getter must not execute'); } });
      if (mode === 'inherited') Object.setPrototypeOf(target, { [key]: target[key] });
      expect(inspect(f)).toEqual(invalidEnvelope()); expect(calls).toBe(0);
    }
  });

  it('rejects hostile/revoked Proxy envelopes and nested inputs before any trap executes', () => {
    for (const site of ['envelope', 'presented', 'selection', 'sources', 'credential', 'expected', 'expectedBytes'] as const) {
      const f = native();
      const target = site === 'selection' ? f.source.selection : site === 'sources' ? f.source.raw :
        site === 'credential' ? data(portal(f.source).credential) : site === 'expected' ? f.source.expected :
        site === 'expectedBytes' ? f.source.expected.canonicalPolicySource as number[] : f[site];
      const h = hostile(target);
      let result;
      if (site === 'envelope') result = inspectNativePortalRootObservation(h.value, f.presented, f.source.expected);
      else if (site === 'presented') result = inspectNativePortalRootObservation(f.envelope, h.value, f.source.expected);
      else if (site === 'expected') result = inspectNativePortalRootObservation(f.envelope, f.presented, h.value);
      else {
        if (site === 'selection' || site === 'sources') f.envelope[site] = h.value;
        else if (site === 'credential') portal(f.source).credential = h.value;
        else f.source.expected.canonicalPolicySource = h.value;
        result = inspect(f);
      }
      const code = site === 'envelope' || site === 'presented' || site === 'selection' ? 'INVALID_NATIVE_PORTAL_ROOT_OBSERVATION' :
        site === 'sources' ? 'INVALID_SOURCE_INPUT' : 'SOURCE_MISMATCH';
      expect(result).toEqual(blocked(code)); expect(h.calls()).toBe(0);
    }
    const f = native(), revoked = Proxy.revocable({}, {}); revoked.revoke();
    expect(inspectNativePortalRootObservation(revoked.proxy, f.presented, f.source.expected)).toEqual(invalidEnvelope());
  });

  it('forwards nested dense-array descriptor rejection without executing an iterator or getter', () => {
    for (const mode of ['sparse', 'extra', 'getter', 'iterator'] as const) {
      const f = native(), values = ['profile.self.read']; let calls = 0;
      if (mode === 'sparse') delete values[0];
      if (mode === 'extra') Object.defineProperty(values, 'extra', { value: 1 });
      if (mode === 'getter') Object.defineProperty(values, '0', { enumerable: true, get: () => { calls++; return 'profile.self.read'; } });
      if (mode === 'iterator') Object.defineProperty(values, Symbol.iterator, { value: () => { calls++; throw new Error('iterator must not execute'); } });
      data(portal(f.source).administrative).capabilities = values;
      expect(inspect(f)).toEqual(blocked('SOURCE_MISMATCH')); expect(calls).toBe(0);
    }
  });

  it('detaches and deeply freezes observations while original/serialized clones remain ordinary nonauthority data', () => {
    const f = native(), result = success(f); deeplyFrozen(result);
    const out = result.observation;
    expect(out.portal).not.toBe(f.source.raw.portalSource);
    expect(out.portal.administrative?.locationIds).not.toBe(data(portal(f.source).administrative).locationIds);
    f.presented.locator = 'portal-tenant-02'; f.source.selection.locator = 'portal-tenant-02';
    data(portal(f.source).employee).id = 'changed';
    data(portal(f.source).administrative).locationIds = []; data(portal(f.source).administrative).capabilities = [];
    data(data(f.source.raw.installedPolicy).installation).policyId = 'changed';
    (f.source.expected.canonicalPolicySource as number[])[0] ^= 1;
    expect(out.locator).toBe('portal-tenant-01'); expect(out.portal.employee.id).toBe('employee-β');
    expect(out.portal.administrative?.locationIds).toEqual([' 位置-β ', 'location-a']);
    expect(out.installedPolicy.installation.policyId).toBe(' fictional explicit policy ');
    const serialized = JSON.parse(JSON.stringify(result));
    expect(serialized.status).toBe('NATIVE_ROOT_SOURCE_OBSERVATIONS_NOT_AUTHORITY');
    expect(serialized.verification).toBe('NO_PORTAL_PROOF_CURRENT_GRANT_INSTALLER_OR_EXECUTING_SOURCE_AUTHORITY');
    expect(serialized).not.toHaveProperty('proof'); expect(serialized.observation).not.toHaveProperty('authorityCurrent');
  });
});
