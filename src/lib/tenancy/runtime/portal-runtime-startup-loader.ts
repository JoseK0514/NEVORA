// UNUSED fixed Portal startup source-image loader/graph linkage. The bytes must
// eventually be fed by a separately retained executing-build producer; this
// parser-issued identity is not installer or executing-code authentication.
import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { comparePortalRootStartupSources, type PortalRootStartupSourceObservation } from './portal-root-source-observation';

const names = ['resolverSource', 'rootSourceInspectorSource', 'portalBindingSource', 'installedPolicyInspectorSource',
  'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource', 'auditedRoleGuardSource',
  'originalRuntimeLoginSource', 'nativeGraphPlanSource'] as const;
type SourceName = typeof names[number];
type LoadedSource = Readonly<{ text: string; bytes: readonly number[]; sha256: string }>;
export type PortalRuntimeSourceImage = Readonly<{
  format: 'PORTAL_RUNTIME_SOURCE_IMAGE_V1';
  sources: Readonly<Record<SourceName, LoadedSource>>;
  verification: 'LOADED_EXACT_BYTES_NOT_EXECUTING_BUILD_OR_INSTALLER_AUTHENTICATION';
}>;
const issued = new WeakMap<PortalRuntimeSourceImage, Readonly<Record<SourceName, LoadedSource>>>();
const block = (code: 'INVALID_SOURCE_IMAGE' | 'UNISSUED_SOURCE_IMAGE' | 'INVALID_NATIVE_GRAPH_OBSERVATION' | 'STARTUP_SOURCE_MISMATCH') =>
  Object.freeze({ status: 'BLOCKED' as const, code });
const fail = (): never => { throw new Error('invalid_portal_startup_source'); };
function closed(value: unknown, keys: readonly string[]): Readonly<Record<string, unknown>> {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return fail();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value), own = Reflect.ownKeys(descriptors);
  if (own.length !== keys.length || own.some(key => typeof key !== 'string' || !keys.includes(key))) return fail();
  const row: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return fail();
    row[key] = descriptor.value;
  }
  return Object.freeze(row);
}
function source(value: unknown): LoadedSource {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype) return fail();
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const length = Object.hasOwn(descriptors, 'length') && Object.hasOwn(descriptors.length, 'value') ? descriptors.length.value : undefined;
  if (typeof length !== 'number' || !Number.isSafeInteger(length) || length <= 0 || Reflect.ownKeys(descriptors).length !== length + 1) return fail();
  const bytes: number[] = [];
  for (let index = 0; index < length; index++) {
    const key = String(index), descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable || typeof descriptor.value !== 'number' ||
      !Number.isInteger(descriptor.value) || descriptor.value < 0 || descriptor.value > 255) return fail();
    bytes.push(descriptor.value);
  }
  // Preserve BOM and exact UTF8; reject invalid encodings, NUL and invalid text
  // with the existing source primitive. No SQL values, policy revision or hash
  // is chosen, and no source text is evaluated/imported dynamically.
  const raw = Buffer.from(bytes), text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(raw);
  const decoded = decodeTypedMigrationWireValue('text', text);
  if (!raw.equals(Buffer.from(text, 'utf8')) || decoded.status !== 'DECODED' || decoded.value.kind !== 'SCALAR') return fail();
  return Object.freeze({ text, bytes: Object.freeze(bytes), sha256: createHash('sha256').update(raw).digest('hex') });
}

/** Fixed ten-image load with immutable detachment. No arbitrary path, disk,
 * module callback, receipt flag, process environment or digest-only substitute.
 * A future independently retained build producer must bind these loaded source
 * preimages to the actual executing artifact closure. Calling this API with
 * coherent ordinary bytes cannot confer that origin or authenticated startup. */
export function loadPortalRuntimeSourceImage(value: unknown) {
  try {
    const row = closed(value, ['format', ...names]);
    if (row.format !== 'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1') return block('INVALID_SOURCE_IMAGE');
    const sources = Object.create(null) as Record<SourceName, LoadedSource>;
    for (const name of names) sources[name] = source(row[name]);
    const retained = Object.freeze(sources);
    const image: PortalRuntimeSourceImage = Object.freeze({ format: 'PORTAL_RUNTIME_SOURCE_IMAGE_V1', sources: retained,
      verification: 'LOADED_EXACT_BYTES_NOT_EXECUTING_BUILD_OR_INSTALLER_AUTHENTICATION' });
    issued.set(image, retained);
    return Object.freeze({ status: 'SOURCE_IMAGE_LOADED_NOT_EXECUTION_ATTESTATION' as const, image });
  } catch { return block('INVALID_SOURCE_IMAGE'); }
}
/** Trap-free local parsing provenance only; not a PortalProof or build issuer. */
export function isLoadedPortalRuntimeSourceImage(value: unknown): value is PortalRuntimeSourceImage {
  return !!value && typeof value === 'object' && issued.has(value as PortalRuntimeSourceImage);
}

/** Links fixed native graph output + actual loaded full policy/vocabulary/PRD
 * bytes through the accepted full startup comparator. Native query adoption,
 * original LOGIN/fence, independent installation receipt and executing artifact
 * custody must be verified outside this ordinary parser. A serialized image or
 * capsule does not acquire local image issuance or database authority. */
export function linkPortalRuntimeStartupSourceImage(imageValue: unknown, nativeValue: unknown, independentlyRetainedValue: unknown) {
  if (!isLoadedPortalRuntimeSourceImage(imageValue)) return block('UNISSUED_SOURCE_IMAGE');
  try {
    const native = closed(nativeValue, ['format', 'databaseOid', 'rootOid', 'ownerOid', 'rootDefinition', 'rootDefinitionSha256',
      'nativeAuditCapsuleText', 'nativeAuditCapsuleSha256']);
    if (native.format !== 'PORTAL_STARTUP_NATIVE_GRAPH_OBSERVATION_V1') return block('INVALID_NATIVE_GRAPH_OBSERVATION');
    const sources = issued.get(imageValue)!;
    const retained = closed(independentlyRetainedValue, ['format', 'sourceImage', 'startup']);
    if (retained.format !== 'PORTAL_STARTUP_RETAINED_SOURCE_INPUT_V1') return block('STARTUP_SOURCE_MISMATCH');
    const retainedImage = closed(retained.sourceImage, ['format', ...names]);
    if (retainedImage.format !== 'PORTAL_RUNTIME_SOURCE_IMAGE_INPUT_V1') return block('STARTUP_SOURCE_MISMATCH');
    // Bind all ten full preimages, not only the three canonical policy slots.
    // Retained input is still ordinary supplied data, never authenticated by
    // this equality or its hashes; the missing trusted producer is explicit.
    for (const name of names) {
      const expected = source(retainedImage[name]);
      if (!Buffer.from(sources[name].bytes).equals(Buffer.from(expected.bytes))) return block('STARTUP_SOURCE_MISMATCH');
    }
    const observed: PortalRootStartupSourceObservation = {
      format: 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1', databaseOid: native.databaseOid as string,
      rootOid: native.rootOid as string, ownerOid: native.ownerOid as string,
      rootDefinition: native.rootDefinition as string, rootDefinitionSha256: native.rootDefinitionSha256 as string,
      nativeAuditCapsuleText: native.nativeAuditCapsuleText as string, nativeAuditCapsuleSha256: native.nativeAuditCapsuleSha256 as string,
      canonicalPolicySource: sources.canonicalPolicySource.text, vocabularySource: sources.vocabularySource.text,
      approvedPRDSource: sources.approvedPRDSource.text,
    };
    // Casts above never validate data; the real closed comparator validates
    // native OIDs/hash/text before equality and creates its detached output.
    const result = comparePortalRootStartupSources(observed, retained.startup);
    if (result.status !== 'STARTUP_SOURCE_COHERENT_NOT_AUTHENTICATED') return result;
    return Object.freeze({ status: 'PORTAL_SOURCE_IMAGE_AND_NATIVE_GRAPH_LINKED_NOT_AUTHORITY' as const,
      observation: result.observation, image: imageValue,
      verification: 'NOT_EXECUTING_ARTIFACT_INSTALLER_LOGIN_PROOF_OR_TENANT_AUTHORITY' as const });
  } catch { return block('INVALID_NATIVE_GRAPH_OBSERVATION'); }
}
// No file/service lookup, public source loader, dynamic import/eval, credentials,
// source enrollment/grants, SQL execution, proof issuer or fail-open fallback.
