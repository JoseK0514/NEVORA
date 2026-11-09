// Pure raw source binding adapter, currently unused by live authentication.
// Matching observations cannot authenticate a caller or issue a tenant proof.
// This is a data adapter for the existing resolver boundary, not a new resolver,
// authentication service, authority constructor, role-default grant or policy.
import { types as nodeTypes } from 'node:util';
import { Temporal } from '@js-temporal/polyfill';
import { decodeTypedMigrationWireValue } from '../migrations/typed-wire';
import { CAPABILITIES } from '../../capabilities/types';

const invalid = (): never => { throw new Error('INVALID_SOURCE_OBSERVATION'); };
const mismatch = (): never => { throw new Error('SOURCE_BINDING_MISMATCH'); };
function text(v: unknown): string {
  const wire = decodeTypedMigrationWireValue('text', v);
  return wire.status === 'DECODED' && wire.value.kind === 'SCALAR' ? wire.value.wire.text : invalid();
}
function id(v: unknown): string {
  const value = text(v);
  return value.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(value) ? value : invalid();
}
const digest = (v: unknown): string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v) ? v : invalid();
const bool = (v: unknown): boolean => typeof v === 'boolean' ? v : invalid();
function oneOf<T extends string>(v: unknown, choices: readonly T[]): T {
  return typeof v === 'string' && choices.includes(v as T) ? v as T : invalid();
}
function positiveInt8(v: unknown): string {
  const wire = decodeTypedMigrationWireValue('bigint', v);
  return wire.status === 'DECODED' && wire.value.kind === 'SCALAR' && wire.value.wire.text !== '0' &&
    !wire.value.wire.text.startsWith('-') ? wire.value.wire.text : invalid();
}
function instant(v: unknown): { original: string; parsed: Temporal.Instant } {
  if (typeof v !== 'string') return invalid();
  const match = /^(\d{4})-\d{2}-\d{2}[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:\+00(?::00)?|Z)$/.exec(v);
  // Temporal accepts a leap-second spelling by clamping it. Native retained
  // source text must pass the existing resolver's clock range without repair.
  if (!match || Number(match[1]) < 1970 || Number(match[2]) > 23 || Number(match[3]) > 59 || Number(match[4]) > 59) return invalid();
  try { return { original: v, parsed: Temporal.Instant.from(v.replace(' ', 'T').replace(/\+00$/, '+00:00')) }; }
  catch { return invalid(); }
}
function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!v || typeof v !== 'object' || nodeTypes.isProxy(v) || Array.isArray(v)) return invalid();
  const proto = Object.getPrototypeOf(v); if (proto !== null && proto !== Object.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(v), owned = Reflect.ownKeys(descriptors);
  if (owned.length !== keys.length || owned.some(k => typeof k !== 'string' || !keys.includes(k))) return invalid();
  const result: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const descriptor = descriptors[key];
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid();
    result[key] = descriptor.value;
  }
  return Object.freeze(result);
}
function uniqueStrings(v: unknown, validate: (v: unknown) => string): readonly string[] {
  if (!v || typeof v !== 'object' || nodeTypes.isProxy(v) || !Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype) return invalid();
  const descriptors = Object.getOwnPropertyDescriptors(v as object);
  const length = Object.hasOwn(descriptors, 'length') ? descriptors.length : undefined;
  if (!length || !Object.hasOwn(length, 'value') || !Number.isSafeInteger(length.value) || length.value < 0 || length.value > 10000 ||
    Reflect.ownKeys(descriptors).length !== length.value + 1) return invalid();
  const values: string[] = [], seen = new Set<string>();
  for (let index = 0; index < length.value; index++) {
    const key = String(index), descriptor = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!descriptor || !Object.hasOwn(descriptor, 'value') || !descriptor.enumerable) return invalid();
    const value = validate(descriptor.value); if (seen.has(value)) return invalid(); seen.add(value); values.push(value);
  }
  return Object.freeze(values);
}
const same = (left: string, right: string) => { if (left !== right) return mismatch(); };

/** Detach the closed native row observation and match its employee/workspace,
 * session issuance and version bindings. A coherent but inactive/expired source
 * has a distinct result from malformed or mismatched data. Successful parsing
 * establishes correspondence only; it does not authenticate the supplied binding. */
export function inspectPortalSourceBinding(rawValue: unknown, bindingValue: unknown) {
  // These bindings must originate in the existing protected resolver lane. The
  // shape or equality checks here cannot authenticate that origin. UTC strings
  // are retained; native source equality and final recheck remain DB obligations.
  try {
    const binding = record(bindingValue, ['workspaceId', 'employeeId', 'sessionTokenHash', 'databaseObservedAt']);
    const workspaceId = id(binding.workspaceId), employeeId = id(binding.employeeId), sessionTokenHash = digest(binding.sessionTokenHash);
    const observedAt = instant(binding.databaseObservedAt);
    const row = record(rawValue, ['kind', 'workspace', 'employee', 'credential', 'incarnation', 'portal', 'session', 'issuance', 'administrative']);
    if (row.kind !== 'PORTAL_SOURCE_OBSERVATION_V1') return invalid();
    const w = record(row.workspace, ['id', 'active', 'version']);
    const e = record(row.employee, ['id', 'workspaceId', 'active', 'role', 'version']);
    const c = record(row.credential, ['employeeId', 'version', 'mustChangePassword']);
    const i = record(row.incarnation, ['workspaceId', 'version']);
    const p = record(row.portal, ['workspaceId', 'employeeId', 'authorizationVersion', 'portalAccessVersion', 'capabilityPolicyRevision', 'state', 'proofProvenance', 'provenanceReference']);
    const s = record(row.session, ['tokenHash', 'employeeId', 'expiresAt', 'createdAt']);
    const issued = record(row.issuance, ['tokenHash', 'workspaceId', 'employeeId', 'workspaceIncarnation', 'portalAccessVersion', 'sessionCreatedAt']);
    const workspace = Object.freeze({ id: id(w.id), active: bool(w.active), version: instant(w.version).original });
    const employee = Object.freeze({ id: id(e.id), workspaceId: id(e.workspaceId), active: bool(e.active), role: oneOf(e.role, ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'] as const), version: instant(e.version).original });
    const credential = Object.freeze({ employeeId: id(c.employeeId), version: instant(c.version).original, mustChangePassword: bool(c.mustChangePassword) });
    const incarnation = Object.freeze({ workspaceId: id(i.workspaceId), version: positiveInt8(i.version) });
    const portal = Object.freeze({ workspaceId: id(p.workspaceId), employeeId: id(p.employeeId), authorizationVersion: positiveInt8(p.authorizationVersion), portalAccessVersion: positiveInt8(p.portalAccessVersion), capabilityPolicyRevision: positiveInt8(p.capabilityPolicyRevision), state: oneOf(p.state, ['DISABLED', 'PROOF_PENDING', 'ENABLED', 'SUSPENDED'] as const), proofProvenance: oneOf(p.proofProvenance, ['UNVERIFIED', 'LEGACY_UNVERIFIED', 'VERIFIED'] as const), provenanceReference: text(p.provenanceReference) });
    const expiry = instant(s.expiresAt);
    const session = Object.freeze({ tokenHash: digest(s.tokenHash), employeeId: id(s.employeeId), expiresAt: expiry.original, createdAt: instant(s.createdAt).original });
    const issuance = Object.freeze({ tokenHash: digest(issued.tokenHash), workspaceId: id(issued.workspaceId), employeeId: id(issued.employeeId), workspaceIncarnation: positiveInt8(issued.workspaceIncarnation), portalAccessVersion: positiveInt8(issued.portalAccessVersion), sessionCreatedAt: instant(issued.sessionCreatedAt).original });
    for (const value of [workspace.id, employee.workspaceId, incarnation.workspaceId, portal.workspaceId, issuance.workspaceId]) same(value, workspaceId);
    for (const value of [employee.id, credential.employeeId, portal.employeeId, session.employeeId, issuance.employeeId]) same(value, employeeId);
    same(session.tokenHash, sessionTokenHash); same(issuance.tokenHash, sessionTokenHash);
    same(incarnation.version, issuance.workspaceIncarnation); same(portal.portalAccessVersion, issuance.portalAccessVersion);
    // One raw native SELECT renders both equal timestamptz values identically.
    // Retained wire mismatch is not repaired by a Date/ms comparison.
    same(session.createdAt, issuance.sessionCreatedAt);
    let administrative: Readonly<{ workspaceId: string; employeeId: string; scopeKind: 'ALL_TENANT' | 'LOCATIONS'; scopeOrigin: 'LEGACY_COMPATIBILITY' | 'EXPLICIT_GRANT'; provenanceReference: string; capabilityPolicyRevision: string; capabilities: readonly string[]; locationIds: readonly string[] }> | null = null;
    if (row.administrative !== null) {
      const a = record(row.administrative, ['workspaceId', 'employeeId', 'scopeKind', 'scopeOrigin', 'provenanceReference', 'capabilityPolicyRevision', 'capabilities', 'locationIds']);
      const scopeKind = oneOf(a.scopeKind, ['ALL_TENANT', 'LOCATIONS'] as const), scopeOrigin = oneOf(a.scopeOrigin, ['LEGACY_COMPATIBILITY', 'EXPLICIT_GRANT'] as const);
      const locationIds = uniqueStrings(a.locationIds, id), capabilities = uniqueStrings(a.capabilities, value => oneOf(value, CAPABILITIES));
      administrative = Object.freeze({ workspaceId: id(a.workspaceId), employeeId: id(a.employeeId), scopeKind, scopeOrigin, provenanceReference: text(a.provenanceReference), capabilityPolicyRevision: positiveInt8(a.capabilityPolicyRevision), capabilities, locationIds });
      same(administrative.workspaceId, workspaceId); same(administrative.employeeId, employeeId); same(administrative.capabilityPolicyRevision, portal.capabilityPolicyRevision);
      if (scopeKind === 'ALL_TENANT' && locationIds.length !== 0 || scopeKind === 'LOCATIONS' && scopeOrigin !== 'EXPLICIT_GRANT') return mismatch();
    }
    if (employee.role === 'MANAGER' && administrative === null || (employee.role === 'LEAD' || employee.role === 'EMPLOYEE') && administrative !== null) return mismatch();
    const observation = Object.freeze({ kind: 'PORTAL_SOURCE_BINDING_OBSERVATION_V1' as const, workspace, employee, credential, incarnation, portal, session, issuance, administrative,
      databaseObservedAt: observedAt.original, originalSessionExpiryUpperBound: expiry.original });
    if (!workspace.active || !employee.active || portal.state !== 'ENABLED' || Temporal.Instant.compare(expiry.parsed, observedAt.parsed) <= 0) {
      return Object.freeze({ status: 'SOURCE_STATE_INELIGIBLE' as const, observation });
    }
    // No provenance label is identityVerified=true. No capability or permitted
    // location is derived here. No must-change journey is invented. Current
    // protected provenance/migration/grant/policy/locator/location checks still
    // decide whether the existing issuer may issue any PortalProof.
    return Object.freeze({ status: 'MATCHED_OBSERVATION_NOT_AUTHORITY' as const, observation });
  } catch (error) {
    return Object.freeze({ status: error instanceof Error && error.message === 'SOURCE_BINDING_MISMATCH' ? 'SOURCE_BINDING_MISMATCH' as const : 'INVALID_SOURCE_OBSERVATION' as const });
  }
}
