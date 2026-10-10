// Pure decoder for unused policy-source observations; never an authority.
// Checks source coherence against explicit caller expectations only. These
// expectations cannot authenticate approval, execution, installation or caller.
import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

type Code = 'INVALID_OBSERVATION' | 'INVALID_EXPECTED_BINDING' |
  'SOURCE_BINDING_MISMATCH' | 'SOURCE_BYTES_MISMATCH' | 'SOURCE_WIRE_MISMATCH';
const fail = (code: Code): never => { throw code; };
const sha256 = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');

function record(value: unknown, keys: readonly string[], code: Code): Record<string, unknown> {
  // Reject Proxy before any prototype/descriptor/array operation can run traps.
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return fail(code);
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const actual = Reflect.ownKeys(descriptors);
  if (actual.length !== keys.length || actual.some(key => typeof key !== 'string' || !keys.includes(key))) return fail(code);
  const detached: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return fail(code);
    detached[key] = descriptor.value;
  }
  return Object.freeze(detached);
}

function sqlText(value: unknown, code: Code): string {
  if (typeof value !== 'string' || value.includes('\0')) return fail(code);
  // Preserve empty/padded/Unicode persisted SQL text. Reject unpaired UTF16
  // surrogates rather than Buffer.from's replacement/repair. No trim or NFC.
  for (let index = 0; index < value.length; index++) {
    const unit = value.charCodeAt(index);
    if (unit >= 0xd800 && unit <= 0xdbff) {
      const next = value.charCodeAt(++index);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return fail(code);
    } else if (unit >= 0xdc00 && unit <= 0xdfff) return fail(code);
  }
  return value;
}
function positiveInt8(value: unknown, code: Code): string {
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,18}$/.test(value) ||
    BigInt(value) > BigInt('9223372036854775807')) return fail(code);
  return value;
}
function hash(value: unknown, code: Code): string {
  return typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : fail(code);
}

function expectedBytes(value: unknown): Buffer {
  const code: Code = 'INVALID_EXPECTED_BINDING';
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype) return fail(code);
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const lengthDescriptor = Object.hasOwn(descriptors, 'length') ? descriptors.length : undefined;
  if (!lengthDescriptor || !Object.hasOwn(lengthDescriptor, 'value')) return fail(code);
  const length: unknown = lengthDescriptor.value;
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length <= 0 ||
    Reflect.ownKeys(descriptors).length !== length + 1) return fail(code);
  const bytes = Buffer.alloc(length);
  for (let index = 0; index < length; index++) {
    const key = String(index), descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable ||
      typeof descriptor.value !== 'number' || !Number.isInteger(descriptor.value) ||
      descriptor.value < 0 || descriptor.value > 255) return fail(code);
    bytes[index] = descriptor.value;
  }
  strictUTF8(bytes, code);
  return bytes;
}
function strictUTF8(bytes: Uint8Array, code: Code): string {
  try {
    // ignoreBOM:true preserves a literal BOM codepoint; do not silently strip
    // source bytes. fatal rejects overlong/surrogate/out-of-range/truncated UTF8.
    const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes);
    sqlText(text, code);
    if (bytes.byteLength === 0 || !Buffer.from(text, 'utf8').equals(Buffer.from(bytes))) return fail(code);
    return text;
  } catch { return fail(code); }
}

function nativeBase64(bytes: Buffer): string {
  const encoded = bytes.toString('base64');
  // PG18 encode.c puts LF after each 76 chars emitted by full-triplet loop.
  // Padding is appended afterward:57/114 bytes end LF;55/56/112/113 do not.
  // Matches independently captured PG18 base64 boundary observations.
  const tripletCharacters = Math.floor(bytes.length / 3) * 4;
  let native = '';
  for (let offset = 0; offset < tripletCharacters; offset += 76) {
    const group = encoded.slice(offset, Math.min(offset + 76, tripletCharacters));
    native += group;
    if (group.length === 76) native += '\n';
  }
  return native + encoded.slice(tripletCharacters);
}
type Wire = Readonly<{ encoding: 'UTF8'; bytesBase64: string; byteLength: string; sha256: string }>;
function wire(value: unknown, withText: boolean) {
  const keys = withText ? ['encoding', 'text', 'bytesBase64', 'byteLength', 'sha256'] :
    ['encoding', 'bytesBase64', 'byteLength', 'sha256'];
  const object = record(value, keys, 'INVALID_OBSERVATION');
  if (object.encoding !== 'UTF8' || typeof object.bytesBase64 !== 'string') return fail('INVALID_OBSERVATION');
  const byteLength = positiveInt8(object.byteLength, 'INVALID_OBSERVATION');
  const digest = hash(object.sha256, 'INVALID_OBSERVATION');
  const base64 = object.bytesBase64;
  // Node's decoder alone accepts whitespace/URL chars/bad padding. Require the
  // strict canonical alphabet/padding, canonical pad bits, then exact native LF.
  if (!/^[A-Za-z0-9+/=\n]*$/.test(base64)) return fail('SOURCE_WIRE_MISMATCH');
  const compact = base64.replace(/\n/g, '');
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(compact)) return fail('SOURCE_WIRE_MISMATCH');
  const bytes = Buffer.from(compact, 'base64');
  if (bytes.toString('base64') !== compact || nativeBase64(bytes) !== base64 ||
    BigInt(bytes.length) !== BigInt(byteLength) || sha256(bytes) !== digest) return fail('SOURCE_WIRE_MISMATCH');
  const decodedText = strictUTF8(bytes, 'SOURCE_WIRE_MISMATCH');
  const retained: Wire = Object.freeze({ encoding: 'UTF8', bytesBase64: base64, byteLength, sha256: digest });
  if (!withText) return { retained, bytes, text: decodedText };
  const text = sqlText(object.text, 'INVALID_OBSERVATION');
  if (text !== decodedText) return fail('SOURCE_WIRE_MISMATCH');
  return { retained: Object.freeze({ ...retained, text }), bytes, text };
}

function bundle(value: unknown, policyId: string, revision: string, digests: readonly string[]) {
  const object = record(value, ['format', 'policyId', 'revision', 'canonicalPolicySource', 'vocabularySource', 'approvedPRD'], 'INVALID_OBSERVATION');
  if (object.format !== 'NEVORA_CAPABILITY_SOURCE_BUNDLE_V1' ||
    sqlText(object.policyId, 'INVALID_OBSERVATION') !== policyId ||
    positiveInt8(object.revision, 'INVALID_OBSERVATION') !== revision) return fail('SOURCE_BINDING_MISMATCH');
  const paths = ['src/lib/capabilities/policy.ts', 'src/lib/capabilities/types.ts', 'F_IMPLEMENTATION_PRD.md'];
  const names = ['canonicalPolicySource', 'vocabularySource', 'approvedPRD'] as const;
  const sources = names.map((name, index) => {
    const source = record(object[name], ['path', 'sha256'], 'INVALID_OBSERVATION');
    if (source.path !== paths[index] || hash(source.sha256, 'INVALID_OBSERVATION') !== digests[index]) return fail('SOURCE_BINDING_MISMATCH');
    return Object.freeze({ path: paths[index], sha256: digests[index] });
  });
  return Object.freeze({ format: 'NEVORA_CAPABILITY_SOURCE_BUNDLE_V1' as const, policyId, revision,
    canonicalPolicySource: sources[0], vocabularySource: sources[1], approvedPRD: sources[2] });
}

// Closed format has only fixed-key records and string leaves. PG JSONB text
// prints keys by UTF8 byte length then byte order, with comma/colon spaces.
// Exact reconstruction also rejects duplicate JSON keys/alternative escaping,
// spacing, ordering or trailing text masquerading as native ::text output.
function nativeBundleText(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value);
  const object = value as Record<string, unknown>; // Internal detached bundle only.
  const keys = Object.keys(object).sort((a, b) => Buffer.byteLength(a) - Buffer.byteLength(b) ||
    Buffer.compare(Buffer.from(a), Buffer.from(b)));
  return '{' + keys.map(key => JSON.stringify(key) + ': ' + nativeBundleText(object[key])).join(', ') + '}';
}

export function inspectInstalledPortalPolicyObservation(rawValue: unknown, expectedValue: unknown) {
  try {
    const expected = record(expectedValue, ['workspaceId', 'workspaceIncarnation', 'installationEpoch', 'policyId', 'policyRevision',
      'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource'], 'INVALID_EXPECTED_BINDING');
    const expectedIdentity = Object.freeze({
      workspaceId: sqlText(expected.workspaceId, 'INVALID_EXPECTED_BINDING'),
      workspaceIncarnation: positiveInt8(expected.workspaceIncarnation, 'INVALID_EXPECTED_BINDING'),
      installationEpoch: positiveInt8(expected.installationEpoch, 'INVALID_EXPECTED_BINDING'),
      policyId: sqlText(expected.policyId, 'INVALID_EXPECTED_BINDING'),
      policyRevision: positiveInt8(expected.policyRevision, 'INVALID_EXPECTED_BINDING'),
    });
    const exactSources = [expectedBytes(expected.canonicalPolicySource), expectedBytes(expected.vocabularySource), expectedBytes(expected.approvedPRDSource)];
    const raw = record(rawValue, ['kind', 'workspaceId', 'workspaceIncarnation', 'installation', 'definition', 'verification'], 'INVALID_OBSERVATION');
    if (raw.kind !== 'PORTAL_INSTALLED_POLICY_OBSERVATION_V1' ||
      raw.verification !== 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION') return fail('INVALID_OBSERVATION');
    const installation = record(raw.installation, ['workspaceId', 'workspaceIncarnation', 'installationEpoch', 'policyId', 'policyRevision'], 'INVALID_OBSERVATION');
    const identity = Object.freeze({ workspaceId: sqlText(installation.workspaceId, 'INVALID_OBSERVATION'),
      workspaceIncarnation: positiveInt8(installation.workspaceIncarnation, 'INVALID_OBSERVATION'),
      installationEpoch: positiveInt8(installation.installationEpoch, 'INVALID_OBSERVATION'),
      policyId: sqlText(installation.policyId, 'INVALID_OBSERVATION'),
      policyRevision: positiveInt8(installation.policyRevision, 'INVALID_OBSERVATION') });
    if (sqlText(raw.workspaceId, 'INVALID_OBSERVATION') !== identity.workspaceId ||
      positiveInt8(raw.workspaceIncarnation, 'INVALID_OBSERVATION') !== identity.workspaceIncarnation ||
      (Object.keys(expectedIdentity) as (keyof typeof expectedIdentity)[]).some(key => identity[key] !== expectedIdentity[key])) return fail('SOURCE_BINDING_MISMATCH');
    const definition = record(raw.definition, ['policyId', 'revision', 'sourceBundle', 'sourceBundleWire',
      'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource'], 'INVALID_OBSERVATION');
    if (sqlText(definition.policyId, 'INVALID_OBSERVATION') !== identity.policyId ||
      positiveInt8(definition.revision, 'INVALID_OBSERVATION') !== identity.policyRevision) return fail('SOURCE_BINDING_MISMATCH');
    const sources = [wire(definition.canonicalPolicySource, false), wire(definition.vocabularySource, false), wire(definition.approvedPRDSource, false)];
    if (sources.some((source, index) => !source.bytes.equals(exactSources[index]))) return fail('SOURCE_BYTES_MISMATCH');
    const sourceBundle = bundle(definition.sourceBundle, identity.policyId, identity.policyRevision, sources.map(source => source.retained.sha256));
    const sourceBundleWire = wire(definition.sourceBundleWire, true);
    // JSON.parse creates inert data; validate the same closed bundle and require
    // native text equality as well, so duplicate-key overwrite cannot pass.
    const parsedBundle = bundle(JSON.parse(sourceBundleWire.text), identity.policyId, identity.policyRevision, sources.map(source => source.retained.sha256));
    const expectedNativeText = nativeBundleText(sourceBundle);
    if (nativeBundleText(parsedBundle) !== expectedNativeText || sourceBundleWire.text !== expectedNativeText) return fail('SOURCE_WIRE_MISMATCH');
    return Object.freeze({ status: 'SOURCE_COHERENT_OBSERVATION_NOT_AUTHORITY' as const,
      observation: Object.freeze({ kind: 'PORTAL_INSTALLED_POLICY_OBSERVATION_V1' as const,
        workspaceId: identity.workspaceId, workspaceIncarnation: identity.workspaceIncarnation,
        installation: identity,
        definition: Object.freeze({ policyId: identity.policyId, revision: identity.policyRevision, sourceBundle,
          sourceBundleWire: sourceBundleWire.retained, canonicalPolicySource: sources[0].retained,
          vocabularySource: sources[1].retained, approvedPRDSource: sources[2].retained }),
        verification: 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION' as const }),
    });
  } catch (error) {
    const codes: readonly Code[] = ['INVALID_OBSERVATION', 'INVALID_EXPECTED_BINDING', 'SOURCE_BINDING_MISMATCH', 'SOURCE_BYTES_MISMATCH', 'SOURCE_WIRE_MISMATCH'];
    return Object.freeze({ status: 'BLOCKED' as const, code: typeof error === 'string' && codes.includes(error as Code) ? error as Code : 'INVALID_OBSERVATION' as const });
  }
  // No private issuer, current=true, grant/role decision, default policy ID,
  // revision1, installer, runtime access, approval or executing-code attestation.
}
