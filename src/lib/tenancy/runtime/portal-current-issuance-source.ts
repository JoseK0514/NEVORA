// UNUSED future runtime/portal-current-issuance-source.ts. These are source
// observations, not PortalProof facts, approved enrollment, or effective rights.
import { types as nodeTypes } from 'node:util';
import { Temporal } from '@js-temporal/polyfill';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { inspectPresentedPortalRootSources } from './portal-root-source-observation';
import { isLoadedPortalRuntimeSourceImage, type PortalRuntimeSourceImage } from './portal-runtime-startup-loader';
import { CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS } from '../../capabilities/policy';

type Source = Extract<ReturnType<typeof inspectPresentedPortalRootSources>, {
  status: 'SOURCE_AND_CEILING_OBSERVATIONS_NOT_AUTHORITY';
}>['observation'];
type Location = Readonly<{ id: string; workspaceId: string; active: boolean; version: string }>;
type Eligibility = Readonly<{ workspaceId: string; employeeId: string; locationId: string }>;
export type PortalCurrentIssuanceSourceObservation = Readonly<{
  format: 'PORTAL_CURRENT_ISSUANCE_SOURCE_JOIN_V1';
  source: Source;
  primaryLocationId: string;
  sameTenantLocations: readonly Location[];
  employmentEligibility: readonly Eligibility[];
  administrativeLocationCeiling: readonly string[];
  originalSessionExpiryUpperBound: string;
  verification: 'SOURCE_JOIN_NOT_PROOF_NOT_EFFECTIVE_GRANT_NOT_PROVENANCE_AUTHENTICATION';
}>;
const observed = new WeakSet<object>(); // Local parser provenance only.
const invalid = (): never => { throw new Error('portal_current_source_invalid'); };
const blocked = (code: 'INVALID_SOURCE' | 'SOURCE_MISMATCH' | 'SOURCE_INELIGIBLE') =>
  Object.freeze({ status: 'BLOCKED' as const, code });
function closed(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value), names = Reflect.ownKeys(descriptors);
  if (names.length !== keys.length || names.some(key => typeof key !== 'string' || !keys.includes(key))) return invalid();
  const copy: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid();
    copy[key] = descriptor.value;
  }
  return Object.freeze(copy);
}
function dense(value: unknown): readonly unknown[] {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value as object);
  const length = Object.hasOwn(descriptors, 'length') ? descriptors.length : undefined;
  if (!length || !Object.hasOwn(length, 'value') || typeof length.value !== 'number' ||
    !Number.isSafeInteger(length.value) || length.value < 0 || length.value > 10000 ||
    Reflect.ownKeys(descriptors).length !== length.value + 1) return invalid();
  const out: unknown[] = [];
  for (let index = 0; index < length.value; index++) {
    const key = String(index), descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid();
    out.push(descriptor.value);
  }
  return out;
}
function text(value: unknown): string {
  const decoded = decodeTypedMigrationWireValue('text', value);
  return decoded.status === 'DECODED' && decoded.value.kind === 'SCALAR' ? decoded.value.wire.text : invalid();
}
function id(value: unknown): string {
  const exact = text(value);
  return exact.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(exact) ? exact : invalid();
}
function timestamp(value: unknown): string {
  const exact = text(value), match = /^(\d{4})-\d{2}-\d{2}[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:\+00(?::00)?|Z)$/.exec(exact);
  if (!match || Number(match[1]) < 1970 || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return invalid();
  try { Temporal.Instant.from(exact.replace(' ', 'T').replace(/\+00$/, '+00:00')); return exact; }
  catch { return invalid(); }
}
function ordered(previous: string | undefined, next: string): void {
  // Same exact byte ordering as the native ORDER BY convert_to(...,'UTF8').
  if (previous !== undefined && Buffer.compare(Buffer.from(previous, 'utf8'), Buffer.from(next, 'utf8')) >= 0) return invalid();
}

/** The private source-image predicate runs before reading that object. It is
 * only source-loader provenance: even matching full bytes cannot authenticate
 * the executing build, original backend, installer, grant writer or verifier. */
export function inspectPortalCurrentIssuanceSource(value: unknown, imageValue: unknown) {
  if (!isLoadedPortalRuntimeSourceImage(imageValue)) return blocked('INVALID_SOURCE');
  const image: PortalRuntimeSourceImage = imageValue;
  try {
    const root = closed(value, ['kind', 'selection', 'sources', 'locationSource', 'verification']);
    if (root.kind !== 'PRESENTED_PORTAL_ROOT_CURRENT_SOURCE_OBSERVATION_V2' ||
      root.verification !== 'CURRENT_SOURCE_CAPTURE_NOT_PORTAL_PROOF_OR_APPROVED_ENROLLMENT') return blocked('INVALID_SOURCE');
    const selection = closed(root.selection, ['locator', 'sessionTokenHash', 'workspaceId', 'employeeId', 'databaseObservedAt']);
    const combined = closed(root.sources, ['kind', 'portalSource', 'installedPolicy', 'verification']);
    const policy = closed(combined.installedPolicy, ['kind', 'workspaceId', 'workspaceIncarnation', 'installation', 'definition', 'verification']);
    const installation = closed(policy.installation, ['workspaceId', 'workspaceIncarnation', 'installationEpoch', 'policyId', 'policyRevision']);
    // Identity fields below are freshly observed native values, not an
    // independently approved policy installation. Full bytes are independently
    // supplied by the genuine loaded image; the real decoder binds both.
    const inspected = inspectPresentedPortalRootSources(root.sources, selection, {
      workspaceId: selection.workspaceId, workspaceIncarnation: policy.workspaceIncarnation,
      installationEpoch: installation.installationEpoch, policyId: installation.policyId,
      policyRevision: installation.policyRevision,
      canonicalPolicySource: image.sources.canonicalPolicySource.bytes,
      vocabularySource: image.sources.vocabularySource.bytes,
      approvedPRDSource: image.sources.approvedPRDSource.bytes,
    });
    if (inspected.status === 'BLOCKED') return blocked(inspected.code === 'SOURCE_INELIGIBLE' ? 'SOURCE_INELIGIBLE' : 'SOURCE_MISMATCH');
    const source = inspected.observation, workspaceId = source.portal.workspace.id, employeeId = source.portal.employee.id;
    const membership = closed(root.locationSource, ['workspaceId', 'employeeId', 'primaryLocationId', 'locations', 'eligibility']);
    if (id(membership.workspaceId) !== workspaceId || id(membership.employeeId) !== employeeId) return blocked('SOURCE_MISMATCH');
    const primaryLocationId = id(membership.primaryLocationId), locations: Location[] = [], eligibility: Eligibility[] = [];
    let previous: string | undefined;
    for (const value of dense(membership.locations)) {
      const row = closed(value, ['id', 'workspaceId', 'active', 'version']), locationId = id(row.id);
      if (id(row.workspaceId) !== workspaceId || typeof row.active !== 'boolean') return blocked('SOURCE_MISMATCH');
      ordered(previous, locationId); previous = locationId;
      locations.push(Object.freeze({ id: locationId, workspaceId, active: row.active, version: timestamp(row.version) }));
    }
    const locationIds = new Set(locations.map(location => location.id));
    if (!locationIds.has(primaryLocationId)) return blocked('SOURCE_MISMATCH');
    previous = undefined;
    for (const value of dense(membership.eligibility)) {
      const row = closed(value, ['workspaceId', 'employeeId', 'locationId']), locationId = id(row.locationId);
      if (id(row.workspaceId) !== workspaceId || id(row.employeeId) !== employeeId || !locationIds.has(locationId)) return blocked('SOURCE_MISMATCH');
      ordered(previous, locationId); previous = locationId;
      eligibility.push(Object.freeze({ workspaceId, employeeId, locationId }));
    }
    const admin = source.portal.administrative, role = source.portal.employee.role;
    if (admin?.locationIds.some(location => !locationIds.has(location))) return blocked('SOURCE_MISMATCH');
    if (role === 'MANAGER' && admin?.capabilities.some(capability => !CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.some(rule =>
      rule.capability === capability && rule.roles.includes('MANAGER') && rule.variant !== 'SELF'))) return blocked('SOURCE_MISMATCH');
    // F-P02 Owner T and explicit Manager M only. Eligibility/primary location
    // do not supply M; this ceiling does not approve grant/source provenance.
    const administrativeLocationCeiling = Object.freeze(role === 'OWNER' || role === 'MANAGER' && admin?.scopeKind === 'ALL_TENANT'
      ? locations.map(location => location.id) : role === 'MANAGER' ? [...(admin?.locationIds ?? [])] : []);
    const observation: PortalCurrentIssuanceSourceObservation = Object.freeze({
      format: 'PORTAL_CURRENT_ISSUANCE_SOURCE_JOIN_V1', source, primaryLocationId,
      sameTenantLocations: Object.freeze(locations), employmentEligibility: Object.freeze(eligibility), administrativeLocationCeiling,
      originalSessionExpiryUpperBound: source.portal.originalSessionExpiryUpperBound,
      verification: 'SOURCE_JOIN_NOT_PROOF_NOT_EFFECTIVE_GRANT_NOT_PROVENANCE_AUTHENTICATION',
    });
    observed.add(observation);
    return Object.freeze({ status: 'CURRENT_SOURCE_JOINED_NOT_AUTHORITY' as const, observation });
  } catch { return blocked('INVALID_SOURCE'); }
}
/** Trap-free parser provenance only; clones and proxies are never reissued. */
export function isPortalCurrentIssuanceSourceObservation(value: unknown): value is PortalCurrentIssuanceSourceObservation {
  return !!value && typeof value === 'object' && observed.has(value);
}
/** Compare only original locally parsed immutable observations. Native observed
 * time may advance, but every retained source byte/version/set must remain equal;
 * this equality cannot replace a protected current-source database recheck. */
export function comparePortalCurrentIssuanceSources(first: unknown, last: unknown): boolean {
  if (!isPortalCurrentIssuanceSourceObservation(first) || !isPortalCurrentIssuanceSourceObservation(last)) return false;
  const instant = (value: string) => Temporal.Instant.from(value.replace(' ', 'T').replace(/\+00$/, '+00:00'));
  if (Temporal.Instant.compare(instant(last.source.portal.databaseObservedAt), instant(first.source.portal.databaseObservedAt)) < 0) return false;
  // Both are deeply detached immutable parser outputs. Only the two native
  // observation times may advance; every source/version/set/byte must match.
  const stripTime = (value: PortalCurrentIssuanceSourceObservation) => ({ ...value,
    source: { ...value.source, portal: { ...value.source.portal, databaseObservedAt: undefined } } });
  return JSON.stringify(stripTime(first)) === JSON.stringify(stripTime(last));
}
