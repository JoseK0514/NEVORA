// PREPARED UNUSED observation consumer. This is not a proof constructor or
// caller origin/authenticated executing-source/installer/reviewer authority.
import { types as nodeTypes } from 'node:util';
import { normalizeWorkspaceLocator } from '../identity';
import { inspectPresentedPortalRootSources } from './portal-root-source-observation';

const blocked = () => Object.freeze({ status: 'BLOCKED' as const, code: 'INVALID_NATIVE_PORTAL_ROOT_OBSERVATION' as const });
function closed(value: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || Array.isArray(value)) return null;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return null;
  const descriptors = Object.getOwnPropertyDescriptors(value), actual = Reflect.ownKeys(descriptors);
  if (actual.length !== keys.length || actual.some(key => typeof key !== 'string' || !keys.includes(key))) return null;
  const detached: Record<string, unknown> = Object.create(null);
  for (const key of keys) {
    const d = Object.hasOwn(descriptors, key) ? descriptors[key] : undefined;
    if (!d || !Object.hasOwn(d, 'value') || !d.enumerable) return null;
    detached[key] = d.value;
  }
  return Object.freeze(detached);
}

/** Consumes the actual fixed native row-capture return format using the accepted
 * full source/installed-policy parsers and canonical ceiling; it issues nothing.
 * presented and installedExpected are ordinary source expectations. Their equal
 * values cannot authenticate the original native call or executing bundle. */
export function inspectNativePortalRootObservation(value: unknown, presented: unknown, installedExpected: unknown) {
  try {
    const input = closed(presented, ['locator', 'sessionTokenHash']);
    if (!input || typeof input.locator !== 'string' || normalizeWorkspaceLocator(input.locator) !== input.locator ||
      typeof input.sessionTokenHash !== 'string' || !/^[a-f0-9]{64}$/.test(input.sessionTokenHash) || input.sessionTokenHash.length !== 64) return blocked();
    const root = closed(value, ['kind', 'selection', 'sources', 'verification']);
    if (!root || root.kind !== 'PRESENTED_PORTAL_ROOT_SOURCE_OBSERVATION_V1' ||
      root.verification !== 'PROTECTED_SOURCE_CAPTURE_NOT_PORTAL_PROOF_OR_CURRENT_GRANT') return blocked();
    const selection = closed(root.selection, ['locator', 'sessionTokenHash', 'workspaceId', 'employeeId', 'databaseObservedAt']);
    if (!selection || selection.locator !== input.locator || selection.sessionTokenHash !== input.sessionTokenHash) return blocked();
    const inspected = inspectPresentedPortalRootSources(root.sources, selection, installedExpected);
    if (inspected.status !== 'SOURCE_AND_CEILING_OBSERVATIONS_NOT_AUTHORITY') return inspected;
    return Object.freeze({ status: 'NATIVE_ROOT_SOURCE_OBSERVATIONS_NOT_AUTHORITY' as const,
      observation: inspected.observation,
      verification: 'NO_PORTAL_PROOF_CURRENT_GRANT_INSTALLER_OR_EXECUTING_SOURCE_AUTHORITY' as const });
  } catch { return blocked(); }
}
// No WeakMap issuer, getDb, transport, credential read, session mutation,
// source file loader, time/TTL choice or PortalProofFacts construction here.
