// Unused source observation adapter; returns no TenantProof or current authority.
import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import { inspectPortalSourceBinding } from './portal-source-binding';
import { inspectInstalledPortalPolicyObservation } from './installed-policy-observation';
import { normalizeWorkspaceLocator } from '../identity';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS } from '../../capabilities/policy';

const blocked = (code: 'INVALID_SOURCE_INPUT' | 'SOURCE_MISMATCH' | 'SOURCE_INELIGIBLE' | 'STARTUP_SOURCE_MISMATCH') =>
  Object.freeze({ status: 'BLOCKED' as const, code });
const invalid = (): never => { throw new Error('INVALID_SOURCE_INPUT'); };
function closed(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return invalid();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(value);
  const names = Reflect.ownKeys(descriptors);
  if (names.length !== keys.length || names.some(name => typeof name !== 'string' || !keys.includes(name))) return invalid();
  const detached: Record<string, unknown> = Object.create(null);
  for (const name of keys) {
    if (!Object.hasOwn(descriptors, name) || !Object.hasOwn(descriptors[name], 'value') || !descriptors[name].enumerable) return invalid();
    detached[name] = descriptors[name].value;
  }
  return Object.freeze(detached);
}
function exactText(value: unknown): string {
  const decoded = decodeTypedMigrationWireValue('text', value);
  if (decoded.status !== 'DECODED' || decoded.value.kind !== 'SCALAR') return invalid();
  return decoded.value.wire.text;
}
const digest = (value: unknown): string => typeof value === 'string' && value.length === 64 && /^[a-f0-9]{64}$/.test(value) ? value : invalid();
const sha256 = (value: string) => createHash('sha256').update(value, 'utf8').digest('hex');
function oid(value: unknown): string {
  if (typeof value !== 'string' || value.length > 10 || !/^[1-9][0-9]{0,9}$/.test(value) || /[^0-9]/.test(value) || BigInt(value) > BigInt('4294967295')) return invalid();
  return value;
}

/** Ordinary source binding, NOT a proof constructor. IDs/observed time must
 * ultimately be derived by the fixed native prefix under the original LOGIN.
 * Supplying equal metadata here never authenticates that origin. */
export function inspectPresentedPortalRootSources(rawValue: unknown, selectionValue: unknown, installedExpectedValue: unknown) {
  try {
    const selection = closed(selectionValue, ['locator', 'sessionTokenHash', 'workspaceId', 'employeeId', 'databaseObservedAt']);
    const locator = normalizeWorkspaceLocator(selection.locator);
    if (locator === null || selection.locator !== locator) return blocked('INVALID_SOURCE_INPUT');
    const sessionTokenHash = digest(selection.sessionTokenHash);
    const raw = closed(rawValue, ['kind', 'portalSource', 'installedPolicy', 'verification']);
    if (raw.kind !== 'PORTAL_POLICY_SOURCE_OBSERVATION_V1' ||
      raw.verification !== 'SOURCE_OBSERVATION_NOT_PROOF_OR_EXECUTING_SOURCE_AUTHENTICATION') return blocked('INVALID_SOURCE_INPUT');
    const portal = inspectPortalSourceBinding(raw.portalSource, {
      workspaceId: selection.workspaceId, employeeId: selection.employeeId,
      sessionTokenHash, databaseObservedAt: selection.databaseObservedAt,
    });
    if (portal.status === 'SOURCE_STATE_INELIGIBLE') return blocked('SOURCE_INELIGIBLE');
    if (portal.status !== 'MATCHED_OBSERVATION_NOT_AUTHORITY') return blocked('SOURCE_MISMATCH');
    const installed = inspectInstalledPortalPolicyObservation(raw.installedPolicy, installedExpectedValue);
    if (installed.status !== 'SOURCE_COHERENT_OBSERVATION_NOT_AUTHORITY') return blocked('SOURCE_MISMATCH');
    const source = portal.observation, policy = installed.observation;
    if (source.workspace.id !== policy.workspaceId || source.incarnation.version !== policy.workspaceIncarnation ||
      source.portal.capabilityPolicyRevision !== policy.installation.policyRevision) return blocked('SOURCE_MISMATCH');
    // Existing provenance is retained, never identityVerified. This does not
    // deny LEGACY_UNVERIFIED by a VERIFIED-only test or choose a new journey.
    // Exact approved existing-access enrollment and new verified enrollment are
    // separate protected native installation/writer dependencies.
    const role = source.employee.role;
    const observedGrants = source.administrative?.capabilities ?? Object.freeze([]);
    const rules = CANONICAL_PORTAL_CAPABILITY_RULE_OBSERVATIONS.filter(rule => rule.roles.includes(role) &&
      !(role === 'MANAGER' && rule.requiresExplicitManagerGrant && !observedGrants.includes(rule.capability)));
    const capabilityCeiling = Object.freeze(rules.map(rule => rule.capability));
    return Object.freeze({ status: 'SOURCE_AND_CEILING_OBSERVATIONS_NOT_AUTHORITY' as const,
      observation: Object.freeze({ locator, sessionTokenHash, portal: source, installedPolicy: policy,
        capabilityCeiling, verification: 'NOT_PROOF_NOT_CURRENT_GRANT_OR_OPERATION_PERMISSION' as const }),
    });
  } catch { return blocked('INVALID_SOURCE_INPUT'); }
}

/** Native/full-source correspondence only. The second object must eventually
 * come from independently retained installer/build custody, not request data.
 * This pure function cannot authenticate that origin, the executing bundle,
 * review, environment, installation or adoption of privileged writer fences.
 * JSONB native capsule text is kept opaque and exact; no parsed OID/float loss. */
export type PortalRootStartupSourceObservation = Readonly<{
  format: 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1';
  databaseOid: string; rootOid: string; ownerOid: string;
  rootDefinition: string; rootDefinitionSha256: string;
  nativeAuditCapsuleText: string; nativeAuditCapsuleSha256: string;
  canonicalPolicySource: string; vocabularySource: string; approvedPRDSource: string;
}>;
function startup(value: unknown): PortalRootStartupSourceObservation {
  const row = closed(value, ['format', 'databaseOid', 'rootOid', 'ownerOid', 'rootDefinition', 'rootDefinitionSha256',
    'nativeAuditCapsuleText', 'nativeAuditCapsuleSha256', 'canonicalPolicySource', 'vocabularySource', 'approvedPRDSource']);
  if (row.format !== 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1') return invalid();
  const rootDefinition = exactText(row.rootDefinition), nativeAuditCapsuleText = exactText(row.nativeAuditCapsuleText);
  const rootDefinitionSha256 = digest(row.rootDefinitionSha256), nativeAuditCapsuleSha256 = digest(row.nativeAuditCapsuleSha256);
  if (rootDefinition.length === 0 || nativeAuditCapsuleText.length === 0 || sha256(rootDefinition) !== rootDefinitionSha256 ||
    sha256(nativeAuditCapsuleText) !== nativeAuditCapsuleSha256) return invalid();
  const canonicalPolicySource = exactText(row.canonicalPolicySource), vocabularySource = exactText(row.vocabularySource),
    approvedPRDSource = exactText(row.approvedPRDSource);
  if (!canonicalPolicySource || !vocabularySource || !approvedPRDSource) return invalid();
  return Object.freeze({ format: 'PORTAL_ROOT_STARTUP_SOURCE_OBSERVATION_V1', databaseOid: oid(row.databaseOid),
    rootOid: oid(row.rootOid), ownerOid: oid(row.ownerOid), rootDefinition, rootDefinitionSha256,
    nativeAuditCapsuleText, nativeAuditCapsuleSha256, canonicalPolicySource, vocabularySource, approvedPRDSource });
}
export function comparePortalRootStartupSources(observedValue: unknown, independentlyRetainedValue: unknown) {
  try {
    const observed = startup(observedValue), retained = startup(independentlyRetainedValue);
    const keys = Object.keys(observed) as (keyof PortalRootStartupSourceObservation)[];
    if (keys.some(key => observed[key] !== retained[key])) return blocked('STARTUP_SOURCE_MISMATCH');
    return Object.freeze({ status: 'STARTUP_SOURCE_COHERENT_NOT_AUTHENTICATED' as const, observation: observed,
      verification: 'EXACT_BYTES_AND_NATIVE_CAPSULE_ONLY_NOT_REVIEWER_INSTALLER_EXECUTING_CODE_OR_TENANT_AUTHORITY' as const });
  } catch { return blocked('INVALID_SOURCE_INPUT'); }
}
