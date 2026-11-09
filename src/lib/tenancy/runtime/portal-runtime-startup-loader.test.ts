// UNEXECUTED source/pure regression preparation. No SQL/resources, mocked
// password/proof/database parser or literal successful protected-root function.
// Proposed target alongside the adopted loader; root owns adoption and runs.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadPortalRuntimeSourceImage, isLoadedPortalRuntimeSourceImage, linkPortalRuntimeStartupSourceImage } from './portal-runtime-startup-loader';

type Data = Record<string, unknown>;
const fields = ['resolverSource', 'rootSourceInspectorSource', 'portalBindingSource', 'installedPolicyInspectorSource',
  'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource', 'auditedRoleGuardSource', 'originalRuntimeLoginSource', 'nativeGraphPlanSource'];
const bytes = (text: string) => Array.from(Buffer.from(text, 'utf8'));
const hash = (text: string) => createHash('sha256').update(text, 'utf8').digest('hex');
function input(): Data {
  // Harmless parser fixtures, not declarations that these strings execute.
  return { format: 'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1', ...Object.fromEntries(fields.map((name, index) =>
    [name, bytes('// fictional retained source ' + index + ': β\r\n')])) };
}
function loaded(value = input()) {
  const result = loadPortalRuntimeSourceImage(value);
  if (result.status !== 'SOURCE_IMAGE_LOADED_NOT_EXECUTION_ATTESTATION') throw new Error('source fixture failed');
  return result.image;
}
function linkedFixture() {
  const sourceImage = input(), image = loaded(sourceImage);
  const definition = 'fictional full native definition observed only';
  const capsule = '{"fictionalNativeOpaque":"9007199254740993"}';
  const native = { format: 'PORTAL_STARTUP_NATIVE_GRAPH_OBSERVATION_V1', databaseOid: '1', rootOid: '2', ownerOid: '3',
    rootDefinition: definition, rootDefinitionSha256: hash(definition), nativeAuditCapsuleText: capsule, nativeAuditCapsuleSha256: hash(capsule) };
  const startup = { ...native, format: 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1',
    canonicalPolicySource: image.sources.canonicalPolicySource.text, vocabularySource: image.sources.vocabularySource.text,
    approvedPRDSource: image.sources.approvedPRDSource.text };
  return { image, native, retained: { format: 'PORTAL_STARTUP_RETAINED_SOURCE_INPUT_V1', sourceImage: input(), startup } };
}

describe('fixed Portal startup source image/link preparation', () => {
  it('loads every fixed full source byte and freezes detached parser identity without execution attestation', () => {
    const source = input(), image = loaded(source);
    expect(isLoadedPortalRuntimeSourceImage(image)).toBe(true);
    expect(image.verification).toBe('LOADED_EXACT_BYTES_NOT_EXECUTING_BUILD_OR_INSTALLER_AUTHENTICATION');
    for (const name of fields) {
      const observed = image.sources[name as keyof typeof image.sources];
      expect(observed.bytes).toEqual(source[name]); expect(observed.sha256).toBe(hash(observed.text));
      expect(Object.isFrozen(observed)).toBe(true); expect(Object.isFrozen(observed.bytes)).toBe(true);
    }
    (source.canonicalPolicySource as number[])[0] = 0;
    expect(image.sources.canonicalPolicySource.bytes[0]).toBe(47);
    expect(Object.isFrozen(image)).toBe(true); expect(Object.isFrozen(image.sources)).toBe(true);
  });
  it('preserves BOM, CRLF, UTF8 and exact source bytes rather than normalizing them', () => {
    const source = input(); source.canonicalPolicySource = bytes('\ufeffsource β\r\n');
    const image = loaded(source);
    expect(image.sources.canonicalPolicySource.text).toBe('\ufeffsource β\r\n');
    expect(image.sources.canonicalPolicySource.bytes).toEqual(source.canonicalPolicySource);
  });
  it.each([[], [0], [0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf4, 0x90, 0x80, 0x80], [0xe2, 0x82], [-1], [256], [1.5]].map(bytes => ({ bytes })))('blocks empty/NUL/invalid UTF8/nonbyte source %j', ({ bytes: malformed }) => {
    expect(Array.isArray(malformed)).toBe(true);
    const source = input(); source.canonicalPolicySource = malformed;
    expect(loadPortalRuntimeSourceImage(source)).toEqual({ status: 'BLOCKED', code: 'INVALID_SOURCE_IMAGE' });
  });
  it('requires every exact source slot; extra paths/flags and missing bytes cannot default', () => {
    for (const mode of ['missing', 'extra', 'wrong-format']) {
      const source = input();
      if (mode === 'missing') delete source.approvedPRDSource;
      if (mode === 'extra') source.executing = true;
      if (mode === 'wrong-format') source.format = 'APPROVED';
      expect(loadPortalRuntimeSourceImage(source).status).toBe('BLOCKED');
    }
  });
  it('rejects own accessors and proxy input/byte arrays before traps', () => {
    let calls = 0;
    const source = input(); Object.defineProperty(source, 'canonicalPolicySource', { enumerable: true, get() { calls++; return []; } });
    expect(loadPortalRuntimeSourceImage(source).status).toBe('BLOCKED'); expect(calls).toBe(0);
    const hostile = new Proxy(input(), { get() { calls++; throw Error('trap'); }, ownKeys() { calls++; throw Error('trap'); } });
    expect(loadPortalRuntimeSourceImage(hostile).status).toBe('BLOCKED'); expect(calls).toBe(0);
    const nested = input(); nested.canonicalPolicySource = new Proxy(bytes('source'), { get() { calls++; throw Error('trap'); } });
    expect(loadPortalRuntimeSourceImage(nested).status).toBe('BLOCKED'); expect(calls).toBe(0);
  });
  it('rejects sparse/accessor/extra-key byte arrays without reads', () => {
    for (const mode of ['sparse', 'accessor', 'extra']) {
      const source = input(), buffer = source.canonicalPolicySource as number[]; let calls = 0;
      if (mode === 'sparse') delete buffer[0];
      if (mode === 'accessor') Object.defineProperty(buffer, '0', { enumerable: true, get() { calls++; return 47; } });
      if (mode === 'extra') Object.defineProperty(buffer, 'extra', { value: 1 });
      expect(loadPortalRuntimeSourceImage(source).status).toBe('BLOCKED'); expect(calls).toBe(0);
    }
  });
  it('rejects serialized/clone/revoked/proxy images before reading any other supplied input', () => {
    const original = loaded(); let calls = 0;
    const revoked = Proxy.revocable({}, {}); revoked.revoke();
    const hostile = new Proxy({}, { get() { calls++; throw Error('trap'); } });
    for (const value of [JSON.parse(JSON.stringify(original)), { ...original }, revoked.proxy, hostile, null, 1]) {
      expect(isLoadedPortalRuntimeSourceImage(value)).toBe(false);
      expect(linkPortalRuntimeStartupSourceImage(value, hostile, hostile)).toEqual({ status: 'BLOCKED', code: 'UNISSUED_SOURCE_IMAGE' });
    }
    expect(calls).toBe(0);
  });
  it('links exact full ordinary bytes/native capsule but grants no executing/installer/login authority', () => {
    const { image, native, retained } = linkedFixture();
    const result = linkPortalRuntimeStartupSourceImage(image, native, retained);
    expect(result.status).toBe('PORTAL_SOURCE_IMAGE_AND_NATIVE_GRAPH_LINKED_NOT_AUTHORITY');
    if (result.status !== 'PORTAL_SOURCE_IMAGE_AND_NATIVE_GRAPH_LINKED_NOT_AUTHORITY') throw Error('fixture failed');
    expect(result.verification).toBe('NOT_EXECUTING_ARTIFACT_INSTALLER_LOGIN_PROOF_OR_TENANT_AUTHORITY');
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.observation)).toBe(true);
    native.rootDefinition = 'changed after parse';
    expect(result.observation.rootDefinition).toBe('fictional full native definition observed only');
  });
  it.each(fields)('binds retained full %s preimage rather than canonical three/digest alone', name => {
    const { image, native, retained } = linkedFixture();
    (retained.sourceImage[name] as number[])[0] ^= 1;
    expect(linkPortalRuntimeStartupSourceImage(image, native, retained)).toEqual({ status: 'BLOCKED', code: 'STARTUP_SOURCE_MISMATCH' });
  });
  it('uses real startup validation for OID bounds/full definition/hash/native capsule/source drift', () => {
    for (const changed of [{ rootOid: '4294967296' }, { rootOid: 2 }, { ownerOid: '03' }, { rootDefinitionSha256: '0'.repeat(64) },
      { nativeAuditCapsuleSha256: '0'.repeat(64) }, { nativeAuditCapsuleText: '\ud800' }]) {
      const { image, native, retained } = linkedFixture();
      expect(linkPortalRuntimeStartupSourceImage(image, { ...native, ...changed }, retained).status).toBe('BLOCKED');
    }
    const { image, native, retained } = linkedFixture();
    native.rootOid = retained.startup.rootOid = '4294967295';
    expect(linkPortalRuntimeStartupSourceImage(image, native, retained).status).toBe('PORTAL_SOURCE_IMAGE_AND_NATIVE_GRAPH_LINKED_NOT_AUTHORITY');
  });
  it('rejects native/retained nested accessors and proxies with no caller behaviors', () => {
    const { image, native, retained } = linkedFixture(); let calls = 0;
    Object.defineProperty(native, 'rootOid', { enumerable: true, get() { calls++; return '2'; } });
    expect(linkPortalRuntimeStartupSourceImage(image, native, retained).status).toBe('BLOCKED'); expect(calls).toBe(0);
    const fresh = linkedFixture(); fresh.retained.sourceImage = new Proxy(input(), { get() { calls++; throw Error('trap'); } });
    expect(linkPortalRuntimeStartupSourceImage(fresh.image, fresh.native, fresh.retained).status).toBe('BLOCKED'); expect(calls).toBe(0);
  });
  it('preserves owning native CTE bytes and only adds a fixed six-capsule Portal selection', () => {
    const source = readFileSync(new URL('./portal-runtime-startup-graph.sql', import.meta.url), 'utf8');
    const guard = readFileSync(new URL('./audited-role-guard.sql', import.meta.url), 'utf8');
    const ctes = guard.split('-- AUDITED_NATIVE_CTES_BEGIN')[1].split('-- AUDITED_NATIVE_CTES_END')[0];
    expect(source.slice(source.indexOf('WITH\n') + 5, source.indexOf('\n, portal_startup_members'))).toBe(ctes);
    for (const term of ['audit_original_login_dependency_current', 'audit_portal_source_dependency_current', 'audit_portal_policy_dependency_current',
      "admitted.runtime_kind='APP' AND admitted.route_kind='DIRECT_CALL' AND admitted.route_oid=0::pg_catalog.oid",
      "pg_catalog.to_regprocedure('nevora_tenancy.resolve_portal(text,text)')", '(SELECT pg_catalog.count(*) FROM portal_startup_members)=6',
      "dependency.schema_name<>'pg_catalog'", "backend.usesysid=binding.role_oid", "pg_catalog.current_setting('role')='none'",
      "nevora_tenancy.assert_audited_runtime_role('APP'::pg_catalog.text) IS TRUE", 'other_current.function_oid=other_registration.function_oid']) expect(source).toContain(term);
    expect(source).not.toContain('WITH RECURSIVE'); expect(source).not.toContain('CREATE OR REPLACE');
  });
});
