// Server-private transport of a complete native snapshot, never an issuer.
import 'server-only';
import { types as nodeTypes } from 'node:util';
import { Temporal } from '@js-temporal/polyfill';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { normalizeWorkspaceLocator } from '../identity';
import { inspectPortalSourceBinding } from './portal-source-binding';
import { inspectInstalledPortalPolicyObservation } from './installed-policy-observation';
import { CAPABILITIES } from '../../capabilities/types';
import type { PortalProofFacts } from '../types';

type Value = string | boolean | null | readonly Value[] | Data;
type Data = Readonly<{ [key: string]: Value }>;
export type PortalNativeCurrentSource = Readonly<{
  format: 'PORTAL_REQUEST_NATIVE_SOURCE_COMPARISON_V1';
  locator: string; sessionTokenHash: string; workspaceId: string; employeeId: string;
  sources: Data; locationSource: Data; resolvedAt: string; expiresAt: string;
}>;
const invalid = (): never => { throw new Error('portal_current_source_invalid'); };
function text(value: unknown): string {
  const decoded = decodeTypedMigrationWireValue('text', value);
  return decoded.status === 'DECODED' && decoded.value.kind === 'SCALAR' ? decoded.value.wire.text : invalid();
}
function id(value: unknown): string {
  const result = text(value);
  return result.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(result) ? result : invalid();
}
function detach(value: unknown, ancestors = new Set<object>(), depth = 0): Value {
  // Only JSON leaves used by this native format exist here. Native integers are
  // primitive text, never Number/BigInt/boxed values. No toJSON/iterator/getter.
  if (typeof value === 'string') return text(value);
  if (typeof value === 'boolean' || value === null) return value;
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || depth > 32 || ancestors.has(value)) return invalid();
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) return invalid();
      const descriptors = Object.getOwnPropertyDescriptors(value as object);
      const length = Object.hasOwn(descriptors, 'length') ? descriptors.length : undefined;
      if (!length || !Object.hasOwn(length, 'value') || typeof length.value !== 'number' ||
        !Number.isSafeInteger(length.value) || length.value < 0 || length.value > 10000 ||
        Reflect.ownKeys(descriptors).length !== length.value + 1) return invalid();
      const items: Value[] = [];
      for (let index = 0; index < length.value; index++) {
        const key = String(index), descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
        if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid();
        items.push(detach(descriptor.value, ancestors, depth + 1));
      }
      return Object.freeze(items);
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== null && prototype !== Object.prototype) return invalid();
    const descriptors = Object.getOwnPropertyDescriptors(value);
    const result: Record<string, Value> = Object.create(null);
    for (const key of Reflect.ownKeys(descriptors)) {
      if (typeof key !== 'string') return invalid();
      const descriptor = descriptors[key];
      if (!Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid();
      result[text(key)] = detach(descriptor.value, ancestors, depth + 1);
    }
    return Object.freeze(result);
  } finally { ancestors.delete(value); }
}
function closed(value: Value, keys: readonly string[]): Data {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid();
  const result = value as Data;
  const actual = Object.keys(result);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) return invalid();
  return result;
}
function positive(value: Value): string {
  const wire = decodeTypedMigrationWireValue('bigint', value);
  return wire.status === 'DECODED' && wire.value.kind === 'SCALAR' &&
    wire.value.wire.text !== '0' && !wire.value.wire.text.startsWith('-') ? wire.value.wire.text : invalid();
}
function instant(value: Value): Temporal.Instant {
  if (typeof value !== 'string') return invalid();
  const match = /^(\d{4})-\d{2}-\d{2}[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:\+00(?::00)?|Z)$/.exec(value);
  if (!match || Number(match[1]) < 1970 || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return invalid();
  try { return Temporal.Instant.from(value.replace(' ', 'T').replace(/\+00$/, '+00:00')); } catch { return invalid(); }
}
const same = (a: unknown, b: unknown) => { if (a !== b) invalid(); };
function rows(value: Value): readonly Value[] { return Array.isArray(value) ? value : invalid(); }
function ordered(previous: string | undefined, current: string): void {
  if (previous !== undefined && Buffer.compare(Buffer.from(previous, 'utf8'), Buffer.from(current, 'utf8')) >= 0) invalid();
}
function sameSet(left: readonly string[], right: readonly string[]) {
  if (left.length !== right.length || left.some(item => !right.includes(item))) invalid();
}
function sourceBytes(value: Value): readonly number[] {
  const wire = closed(value, ['encoding', 'bytesBase64', 'byteLength', 'sha256']);
  if (wire.encoding !== 'UTF8' || typeof wire.bytesBase64 !== 'string') return invalid();
  // This is only a temporary expected-byte input to the accepted wire decoder.
  // That decoder independently checks all length/digest/native LF/UTF8/bundle
  // constraints. Comparing these self-observed bytes is coherence, not approval.
  return [...Buffer.from(wire.bytesBase64.replace(/\n/g, ''), 'base64')];
}
/** Called only after the separate trusted versioned native authority result has
 * passed the existing facts parser. A caller can parse matching data here but
 * cannot register a proof or authenticate source/installer/grant provenance. */
export function readPortalNativeCurrentSource(value: unknown, facts: PortalProofFacts): PortalNativeCurrentSource {
  const snapshot = closed(detach(value), ['format', 'locator', 'sessionTokenHash', 'workspaceId', 'employeeId',
    'sources', 'locationSource', 'resolvedAt', 'expiresAt']);
  same(snapshot.format, 'PORTAL_REQUEST_NATIVE_SOURCE_COMPARISON_V1');
  const locator = text(snapshot.locator), sessionTokenHash = text(snapshot.sessionTokenHash);
  if (normalizeWorkspaceLocator(locator) !== locator || !/^[a-f0-9]{64}$/.test(sessionTokenHash)) return invalid();
  const workspaceId = id(snapshot.workspaceId), employeeId = id(snapshot.employeeId);
  for (const key of ['locator', 'sessionTokenHash', 'workspaceId', 'employeeId', 'resolvedAt', 'expiresAt'] as const) same(snapshot[key], facts[key]);
  const resolvedAt = text(snapshot.resolvedAt), expiresAt = text(snapshot.expiresAt);
  if (Temporal.Instant.compare(instant(expiresAt), instant(resolvedAt)) <= 0) return invalid();
  const sources = closed(snapshot.sources, ['kind', 'portalSource', 'installedPolicy', 'verification']);
  same(sources.kind, 'PORTAL_POLICY_SOURCE_OBSERVATION_V1');
  same(sources.verification, 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION');
  const portal = inspectPortalSourceBinding(sources.portalSource, { workspaceId, employeeId, sessionTokenHash, databaseObservedAt: resolvedAt });
  if (portal.status !== 'MATCHED_OBSERVATION_NOT_AUTHORITY') return invalid();
  const p = portal.observation;
  same(p.workspace.version, facts.workspaceVersion); same(p.employee.version, facts.employeeVersion);
  same(p.employee.role, facts.role); same(p.incarnation.version, facts.workspaceIncarnation);
  same(p.portal.authorizationVersion, facts.authorizationVersion); same(p.portal.portalAccessVersion, facts.portalAccessVersion);
  same(p.portal.capabilityPolicyRevision, facts.capabilityPolicyRevision); same(p.session.expiresAt, facts.sessionExpiresAt);
  if (Temporal.Instant.compare(instant(expiresAt), instant(p.session.expiresAt)) > 0) return invalid();
  if (facts.capabilities.some(capability => !CAPABILITIES.includes(capability as typeof CAPABILITIES[number]))) return invalid();
  if (facts.administrativeScope !== null) {
    if (!p.administrative) return invalid();
    same(facts.administrativeScope.kind, p.administrative.scopeKind);
    same(facts.administrativeScope.origin, p.administrative.scopeOrigin);
    if (facts.administrativeScope.kind === 'LOCATIONS') sameSet(facts.administrativeScope.locationIds, p.administrative.locationIds);
  }
  if (facts.role === 'MANAGER' && p.administrative?.scopeKind === 'LOCATIONS') sameSet(facts.administrativeLocationIds, p.administrative.locationIds);
  const policy = closed(sources.installedPolicy, ['kind', 'workspaceId', 'workspaceIncarnation', 'installation', 'definition', 'verification']);
  const installation = closed(policy.installation, ['workspaceId', 'workspaceIncarnation', 'installationEpoch', 'policyId', 'policyRevision']);
  const definition = closed(policy.definition, ['policyId', 'revision', 'sourceBundle', 'sourceBundleWire',
    'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource']);
  same(positive(installation.workspaceIncarnation), facts.workspaceIncarnation);
  same(positive(installation.policyRevision), facts.capabilityPolicyRevision);
  positive(installation.installationEpoch);
  const inspectedPolicy = inspectInstalledPortalPolicyObservation(policy, {
    workspaceId, workspaceIncarnation: facts.workspaceIncarnation,
    installationEpoch: installation.installationEpoch, policyId: installation.policyId, policyRevision: installation.policyRevision,
    canonicalPolicySource: sourceBytes(definition.canonicalPolicySource),
    vocabularySource: sourceBytes(definition.vocabularySource), approvedPRDSource: sourceBytes(definition.approvedPRDSource),
  });
  if (inspectedPolicy.status === 'BLOCKED') return invalid();
  const membership = closed(snapshot.locationSource, ['workspaceId', 'employeeId', 'primaryLocationId', 'locations', 'eligibility']);
  same(membership.workspaceId, workspaceId); same(membership.employeeId, employeeId);
  const primaryLocationId = id(membership.primaryLocationId), allLocations = new Set<string>();
  let previous: string | undefined;
  for (const value of rows(membership.locations)) {
    const location = closed(value, ['id', 'workspaceId', 'active', 'version']), locationId = id(location.id);
    same(location.workspaceId, workspaceId); if (typeof location.active !== 'boolean') return invalid();
    instant(location.version); ordered(previous, locationId); previous = locationId;
    allLocations.add(locationId);
  }
  if (!allLocations.has(primaryLocationId)) return invalid();
  previous = undefined;
  for (const value of rows(membership.eligibility)) {
    const eligible = closed(value, ['workspaceId', 'employeeId', 'locationId']), locationId = id(eligible.locationId);
    same(eligible.workspaceId, workspaceId); same(eligible.employeeId, employeeId);
    if (!allLocations.has(locationId)) return invalid(); ordered(previous, locationId); previous = locationId;
  }
  // The native authority supplies the permitted union, including retained
  // inactive history/restore IDs. Operation-specific T_ACTIVE checks belong
  // to the accepted capability policy; every source active flag stays bound.
  if (facts.allowedLocationIds.some(location => !allLocations.has(location)) ||
    p.administrative?.locationIds.some(location => !allLocations.has(location))) return invalid();
  // Do not derive permitted unions, provenance, restricted-session rights or
  // effective grants here. Those must be authenticated by the native authority
  // root and rechecked by both current-proof helpers, never this source parser.
  return Object.freeze({ format: 'PORTAL_REQUEST_NATIVE_SOURCE_COMPARISON_V1', locator, sessionTokenHash,
    workspaceId, employeeId, sources, locationSource: membership, resolvedAt, expiresAt });
}
