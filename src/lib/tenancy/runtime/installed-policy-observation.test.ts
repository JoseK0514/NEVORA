// Pure source-coherence regressions for an unused decoder. All fixtures contain
// public or fictional source bytes; positive output cannot grant authority.
import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { beforeAll, describe, expect, it } from 'vitest';
type Inspector = typeof import('./installed-policy-observation').inspectInstalledPortalPolicyObservation;
let inspector: Inspector | undefined;
beforeAll(async () => {
  if (existsSync(new URL('./installed-policy-observation.ts', import.meta.url))) {
    const modulePath = './installed-policy-observation';
    inspector = (await import(modulePath)).inspectInstalledPortalPolicyObservation;
  }
});
function inspectInstalledPortalPolicyObservation(raw: unknown, expected: unknown) {
  if (!inspector) throw new Error('installed policy decoder implementation absent');
  return inspector(raw, expected);
}

type Data = Record<string, unknown>;
function fixture(): { raw: Data; expected: Data } {
  return JSON.parse(readFileSync(new URL('./fixtures/installed-policy-source.json', import.meta.url), 'utf8'));
}
const object = (value: unknown) => value as Data; // Fictional test data only, not provenance.
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
const coherent = 'SOURCE_COHERENT_OBSERVATION_NOT_AUTHORITY';
function pgText(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  const data = object(value), keys = Object.keys(data).sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b) || Buffer.compare(Buffer.from(a), Buffer.from(b)));
  return '{' + keys.map(key => JSON.stringify(key) + ': ' + pgText(data[key])).join(', ') + '}';
}
function resetBundleWire(raw: Data) {
  const definition = object(raw.definition), text = pgText(definition.sourceBundle), bytes = Buffer.from(text);
  const encoded = bytes.toString('base64'), triplets = Math.floor(bytes.length / 3) * 4;
  let base64 = '';
  for (let offset = 0; offset < triplets; offset += 76) {
    const group = encoded.slice(offset, Math.min(offset + 76, triplets)); base64 += group + (group.length === 76 ? '\n' : '');
  }
  definition.sourceBundleWire = { encoding: 'UTF8', text, bytesBase64: base64 + encoded.slice(triplets), byteLength: String(bytes.length), sha256: hash(bytes) };
}

describe('installed Portal policy source-coherence decoder', () => {
  it('decodes the unmodified actual PostgreSQL IP03 observation against its full fictional UTF8 bytes', () => {
    const { raw, expected } = JSON.parse(readFileSync(new URL('./fixtures/installed-policy-native-observation.json', import.meta.url), 'utf8'));
    const result = inspectInstalledPortalPolicyObservation(raw, expected);
    expect(result.status).toBe(coherent);
    if (result.status === 'BLOCKED') throw new Error(result.code);
    expect(result.observation).toEqual(raw);
    expect(result.observation.definition.revision).toBe('9007199254740994');
    expect(result.observation.installation.installationEpoch).toBe('9007199254740995');
    expect(result).not.toHaveProperty('proof');
    expect(result).not.toHaveProperty('executingSourceAuthenticated');
  });

  it('retains exact explicit identity and selected policy/vocabulary/approved PRD bytes without authority', () => {
    const { raw, expected } = fixture();
    const result = inspectInstalledPortalPolicyObservation(raw, expected);
    expect(result.status).toBe(coherent);
    if (result.status === 'BLOCKED') throw new Error(result.code);
    expect(result.observation).toEqual(raw);
    expect(result).not.toHaveProperty('proof'); expect(result).not.toHaveProperty('grant');
    expect(result).not.toHaveProperty('authorityCurrent'); expect(result).not.toHaveProperty('current');
    expect(result.observation.verification).toBe('SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION');
    expect(Object.isFrozen(result)).toBe(true); expect(Object.isFrozen(result.observation)).toBe(true);
    expect(Object.isFrozen(result.observation.definition.sourceBundle.canonicalPolicySource)).toBe(true);
    object(raw.installation).policyId = 'changed caller shape';
    (expected.canonicalPolicySource as number[])[0] ^= 1;
    expect(result.observation.installation.policyId).toBe(' fictional explicit policy ');
  });

  it.each(['workspaceId', 'workspaceIncarnation', 'installationEpoch', 'policyId', 'policyRevision'])('blocks explicit expected %s drift', field => {
    const { raw, expected } = fixture(); expected[field] = field.endsWith('Id') ? 'wrong explicit identity' : '1';
    expect(inspectInstalledPortalPolicyObservation(raw, expected)).toEqual({ status: 'BLOCKED', code: 'SOURCE_BINDING_MISMATCH' });
  });

  it.each(['0', '-1', '01', ' 1', '1 ', '1e0', '9223372036854775808', '9'.repeat(78), 1, BigInt(1), Object('1'), null, undefined])('rejects noncanonical/out-of-int8 revision %s', value => {
    const { raw, expected } = fixture(); object(raw.installation).policyRevision = value;
    expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED');
  });

  it.each(['1', '9007199254740993', '9223372036854775807'])('preserves consistent native-int8 %s in incarnation/epoch/revision', value => {
    const { raw, expected } = fixture(); raw.workspaceIncarnation = value;
    for (const field of ['workspaceIncarnation', 'installationEpoch', 'policyRevision']) { object(raw.installation)[field] = value; expected[field] = value; }
    object(raw.definition).revision = value; object(object(raw.definition).sourceBundle).revision = value; resetBundleWire(raw);
    const result = inspectInstalledPortalPolicyObservation(raw, expected); expect(result.status).toBe(coherent);
    if (result.status === 'BLOCKED') throw new Error(result.code);
    expect(result.observation.workspaceIncarnation).toBe(value); expect(result.observation.installation.installationEpoch).toBe(value);
    expect(result.observation.definition.revision).toBe(value);
  });

  it.each(['canonicalPolicySource', 'vocabularySource', 'approvedPRDSource'])('checks full expected %s bytes, not digest agreement alone', field => {
    const { raw, expected } = fixture(); (expected[field] as number[])[0] ^= 1;
    expect(inspectInstalledPortalPolicyObservation(raw, expected)).toEqual({ status: 'BLOCKED', code: 'SOURCE_BYTES_MISMATCH' });
  });

  it.each(['kind', 'verification', 'definition', 'installation'])('rejects missing owned %s, not a default', field => {
    const { raw, expected } = fixture(); delete raw[field];
    expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED');
  });

  it('rejects extra/symbol/hidden/accessor keys without invoking getters', () => {
    for (const mode of ['extra', 'symbol', 'hidden', 'accessor'] as const) {
      const { raw, expected } = fixture(); let getterCalls = 0;
      if (mode === 'extra') raw.permission = true;
      if (mode === 'symbol') Object.defineProperty(raw, Symbol('foreign'), { value: 'x', enumerable: true });
      if (mode === 'hidden') Object.defineProperty(raw, 'kind', { value: raw.kind, enumerable: false });
      if (mode === 'accessor') Object.defineProperty(raw, 'kind', { get: () => { getterCalls++; return 'PORTAL_INSTALLED_POLICY_OBSERVATION_V1'; }, enumerable: true });
      expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED'); expect(getterCalls).toBe(0);
    }
  });

  it('rejects nested Proxy observations and Proxy expected-byte arrays before any trap', () => {
    for (const position of ['outer', 'definition', 'wire', 'expected', 'byteArray'] as const) {
      const { raw, expected } = fixture(); let traps = 0;
      const handler: ProxyHandler<object> = {
        get: () => { traps++; throw new Error('get must not execute'); },
        getPrototypeOf: () => { traps++; throw new Error('prototype must not execute'); },
        ownKeys: () => { traps++; throw new Error('keys must not execute'); },
        getOwnPropertyDescriptor: () => { traps++; throw new Error('descriptor must not execute'); },
      };
      let suppliedRaw: unknown = raw, suppliedExpected: unknown = expected;
      if (position === 'outer') suppliedRaw = new Proxy(raw, handler);
      if (position === 'definition') raw.definition = new Proxy(object(raw.definition), handler);
      if (position === 'wire') object(raw.definition).sourceBundleWire = new Proxy(object(object(raw.definition).sourceBundleWire), handler);
      if (position === 'expected') suppliedExpected = new Proxy(expected, handler);
      if (position === 'byteArray') expected.canonicalPolicySource = new Proxy(expected.canonicalPolicySource as number[], handler);
      expect(inspectInstalledPortalPolicyObservation(suppliedRaw, suppliedExpected).status).toBe('BLOCKED'); expect(traps).toBe(0);
    }
  });

  it('rejects sparse/accessor/symbol/extra-index expected bytes without side effects', () => {
    for (const mode of ['sparse', 'accessor', 'symbol', 'extra'] as const) {
      const { raw, expected } = fixture(); const bytes = expected.canonicalPolicySource as number[]; let calls = 0;
      if (mode === 'sparse') delete bytes[0];
      if (mode === 'accessor') Object.defineProperty(bytes, '0', { get: () => { calls++; return 47; }, enumerable: true });
      if (mode === 'symbol') Object.defineProperty(bytes, Symbol('side'), { value: true });
      if (mode === 'extra') Object.defineProperty(bytes, 'extra', { value: 1, enumerable: true });
      expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED'); expect(calls).toBe(0);
    }
  });

  it.each(['sourceBundleWire', 'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource'])('rejects native %s byte length/digest drift', field => {
    for (const property of ['byteLength', 'sha256'] as const) {
      const { raw, expected } = fixture(); object(object(raw.definition)[field])[property] = property === 'byteLength' ? '1' : '0'.repeat(64);
      expect(inspectInstalledPortalPolicyObservation(raw, expected)).toEqual({ status: 'BLOCKED', code: 'SOURCE_WIRE_MISMATCH' });
    }
  });

  it.each(['removeLF', 'addLF', 'CRLF', 'space', 'URL', 'padBits'])('rejects permissive-Node-decoder %s spelling', mode => {
    const { raw, expected } = fixture(); const wire = object(object(raw.definition).canonicalPolicySource);
    const original = wire.bytesBase64 as string;
    if (mode === 'removeLF') wire.bytesBase64 = original.replace(/\n/g, '');
    if (mode === 'addLF') wire.bytesBase64 = original + '\n';
    if (mode === 'CRLF') wire.bytesBase64 = original.replace(/\n/g, '\r\n');
    if (mode === 'space') wire.bytesBase64 = ' ' + original;
    if (mode === 'URL') wire.bytesBase64 = '-' + original.slice(1);
    if (mode === 'padBits') wire.bytesBase64 = original.slice(0, -4) + 'YR==';
    expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED');
  });

  it.each(['duplicateKey', 'compact', 'wrongText', 'wrongJSONType'])('rejects sourceBundle native text %s even with self-consistent wire hashes', mode => {
    const { raw, expected } = fixture(); const definition = object(raw.definition), old = object(definition.sourceBundleWire);
    let text = old.text as string;
    if (mode === 'duplicateKey') text = text.replace('{', '{"format": "discarded duplicate", ');
    if (mode === 'compact') text = JSON.stringify(definition.sourceBundle);
    if (mode === 'wrongText') text += ' ';
    if (mode === 'wrongJSONType') text = '[]';
    const bytes = Buffer.from(text), base64 = bytes.toString('base64'), triplets = Math.floor(bytes.length / 3) * 4;
    let encoded = '';
    for (let offset = 0; offset < triplets; offset += 76) {
      const group = base64.slice(offset, Math.min(offset + 76, triplets)); encoded += group + (group.length === 76 ? '\n' : '');
    }
    definition.sourceBundleWire = { encoding: 'UTF8', text, bytesBase64: encoded + base64.slice(triplets), byteLength: String(bytes.length), sha256: hash(bytes) };
    expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED');
  });

  it('consumes independent root-native Base64 boundaries through the whole decoder; empty source remains ineligible', () => {
    const vectors = JSON.parse(readFileSync(new URL('./fixtures/installed-policy-native-base64.json', import.meta.url), 'utf8'));
    for (const native of vectors.observations as { inputByteLength: string; nativeEncoded: string }[]) {
      const { raw, expected } = fixture(), length = Number(native.inputByteLength), bytes = Buffer.alloc(length, 97), definition = object(raw.definition);
      // Fictional repeated-a source vector, never approved/executing code. The
      // expected native encoding is copied from root PG18, not the decoder.
      expected.canonicalPolicySource = [...bytes];
      definition.canonicalPolicySource = { encoding: 'UTF8', bytesBase64: native.nativeEncoded, byteLength: native.inputByteLength, sha256: hash(bytes) };
      object(object(definition.sourceBundle).canonicalPolicySource).sha256 = hash(bytes); resetBundleWire(raw);
      const result = inspectInstalledPortalPolicyObservation(raw, expected);
      expect(result.status).toBe(length === 0 ? 'BLOCKED' : coherent);
      if (length > 0) {
        object(definition.canonicalPolicySource).bytesBase64 = native.nativeEncoded.endsWith('\n') ? native.nativeEncoded.slice(0, -1) : native.nativeEncoded + '\n';
        expect(inspectInstalledPortalPolicyObservation(raw, expected).status).toBe('BLOCKED');
      }
    }
  });

  it.each([{ bytes: [0xc0, 0xaf] }, { bytes: [0xed, 0xa0, 0x80] }, { bytes: [0xf4, 0x90, 0x80, 0x80] }, { bytes: [0xe2, 0x82] }, { bytes: [0] }])('rejects invalid UTF8 or SQL NUL with self-consistent hash $bytes', ({ bytes: values }) => {
    const { raw, expected } = fixture(), bytes = Buffer.from(values);
    object(raw.definition).canonicalPolicySource = { encoding: 'UTF8', bytesBase64: bytes.toString('base64'), byteLength: String(bytes.length), sha256: hash(bytes) };
    expect(inspectInstalledPortalPolicyObservation(raw, expected)).toEqual({ status: 'BLOCKED', code: 'SOURCE_WIRE_MISMATCH' });
  });

  it('does not treat caller-approved labels or identical fake expected bytes as authenticated execution', () => {
    const { raw, expected } = fixture();
    // Source-coherent output intentionally does not authenticate the origin of
    // expected bytes; even its positive result is no private proof/grant.
    const result = inspectInstalledPortalPolicyObservation(raw, expected);
    expect(result.status).toBe(coherent); expect(result).not.toHaveProperty('authenticated'); expect(result).not.toHaveProperty('executingSourceAuthenticated');
  });
});
