import 'server-only';
import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import { getTenantRuntimeDb } from '../db';
import { normalizeWorkspaceLocator } from './identity';
import { RUNTIME_CATALOG_SHARED_FENCE_SQL } from './runtime/catalog-fence.server';
import { validateWorkspaceIncarnation } from './runtime/workspace-incarnation';
import type {
  CalendarReadProof, CalendarReadProofFacts, ClockerProof, ClockerProofFacts, PortalProof, PortalProofFacts,
  ProofResolution, ProvisionerEnvironment, ProvisionerOperator, ProvisionerPurpose, ProvisionerScope,
  ProvisionerScopeFacts, ScopeResolution, TenantProof, TenantProofFacts, WorkerIdentity, WorkerLeaseClaim,
  WorkerProof, WorkerProofFacts,
} from './types';
export type { TenantProofFacts, ProvisionerScopeFacts } from './types';

const tenantFacts = new WeakMap<object, TenantProofFacts>();
const provisionerFacts = new WeakMap<object, ProvisionerScopeFacts>();
const DENY = Object.freeze({ status: 'DENY' as const });
const UNAVAILABLE = Object.freeze({ status: 'UNAVAILABLE' as const });
const seams = {
  portal: 'nevora_tenancy.resolve_portal($1::text,$2::text)',
  clocker: 'nevora_tenancy.resolve_clocker($1::text,$2::text)',
  calendar: 'nevora_tenancy.resolve_calendar($1::text)',
  worker: 'nevora_tenancy.resolve_worker($1::text,$2::text,$3::text,$4::text,$5::text,$6::text)',
  provisioner: 'nevora_tenancy.resolve_provisioner($1::text,$2::text,$3::text,$4::text,$5::text,$6::text,$7::text,$8::text)',
} as const;
class Denied extends Error {}
const malformed = (): never => { throw new Error('resolver_metadata'); };
const deny = (): never => { throw new Denied(); };
// Existing DB keys are text. Preserve their exact bytes; selectors/credentials
// have separate format validation and every seam remains parameterized.
const validId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && !/[\p{Cc}\p{Cf}]/u.test(value);
const validDigest = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const validLocator = (value: unknown): value is string => typeof value === 'string' && normalizeWorkspaceLocator(value) === value;
const validRevision = (value: unknown): value is string => typeof value === 'string' && /^[1-9][0-9]{0,77}$/.test(value);
const validPurpose = (value: unknown): value is ProvisionerPurpose => ['TENANT_BOOTSTRAP', 'INITIAL_OWNER_VERIFICATION', 'TENANT_RESTORE', 'OWNER_ACCESS_REVERIFICATION'].includes(value as string);
const validEnvironment = (value: unknown): value is ProvisionerEnvironment => value === 'local' || value === 'test';
const sha256 = (value: string, domain = '') => createHash('sha256').update(domain).update(value).digest('hex');

/** Preserve original DB text, including microseconds. Parsing is only a local
 * early-expiry check; executor guards compare original text at DB precision. */
function timestampMillis(value: unknown): number {
  if (typeof value !== 'string') return NaN;
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(?:\+00(?::00)?|Z)$/.exec(value);
  if (!match) return NaN;
  const [, year, month, day, hour, minute, second] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (year < 1970 || date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || hour > 23 || minute > 59 || second > 59) return NaN;
  return Date.parse(value.replace(' ', 'T').replace(/\+00$/, '+00:00'));
}
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return malformed();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return malformed();
  if (Object.values(Object.getOwnPropertyDescriptors(value)).some(descriptor => !('value' in descriptor))) return malformed();
  return value as Record<string, unknown>;
}
function inputSnapshot(value: unknown): Record<string, unknown> | null {
  try { return Object.freeze({ ...record(value) }); } catch { return null; }
}
function field(row: Record<string, unknown>, key: string, check: (value: unknown) => boolean): string {
  if (!Object.prototype.hasOwnProperty.call(row, key) || !check(row[key])) return malformed();
  return row[key] as string;
}
const id = (row: Record<string, unknown>, key: string) => field(row, key, validId);
const digest = (row: Record<string, unknown>, key: string) => field(row, key, validDigest);
const revision = (row: Record<string, unknown>, key: string) => field(row, key, validRevision);
const incarnation = (row: Record<string, unknown>, key: string) => field(row, key, value => validateWorkspaceIncarnation(value).status === 'VALID');
const timestamp = (row: Record<string, unknown>, key: string) => field(row, key, value => Number.isFinite(timestampMillis(value)));
function list(row: Record<string, unknown>, key: string, check: (value: unknown) => boolean, allowEmpty = true): readonly string[] {
  const value = row[key];
  if (!Array.isArray(value) || (!allowEmpty && value.length === 0) || value.length > 10000 || [...value].some(item => !check(item)) || new Set(value).size !== value.length) return malformed();
  return Object.freeze([...value] as string[]);
}
function lifetime(row: Record<string, unknown>) {
  const resolvedAt = timestamp(row, 'resolvedAt');
  const expiresAt = timestamp(row, 'expiresAt');
  if (timestampMillis(resolvedAt) > Date.now() || timestampMillis(expiresAt) <= Date.now()) return deny();
  if (timestampMillis(expiresAt) <= timestampMillis(resolvedAt)) return malformed();
  return { resolvedAt, expiresAt };
}
function boundedExpiry(row: Record<string, unknown>, name: string, expiresAt: string) {
  const expiry = timestamp(row, name);
  if (timestampMillis(expiry) < timestampMillis(expiresAt)) return malformed();
  if (timestampMillis(expiry) <= Date.now()) return deny();
  return expiry;
}
function current(row: Record<string, unknown>, kind: string) {
  if (typeof row.authorityCurrent !== 'boolean') return malformed();
  if (!row.authorityCurrent || row.kind !== kind) return deny();
}
function base<K extends TenantProof['kind']>(row: Record<string, unknown>, kind: K) {
  current(row, kind);
  return { kind, workspaceId: id(row, 'workspaceId'), workspaceVersion: timestamp(row, 'workspaceVersion'), workspaceIncarnation: incarnation(row, 'workspaceIncarnation'), ...lifetime(row) };
}
function parsePortal(row: Record<string, unknown>): PortalProofFacts {
  const shared = base(row, 'PORTAL');
  const role = field(row, 'role', value => ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE'].includes(value as string)) as PortalProofFacts['role'];
  const allowedLocationIds = list(row, 'allowedLocationIds', validId);
  const administrativeLocationIds = list(row, 'administrativeLocationIds', validId);
  if (administrativeLocationIds.some(location => !allowedLocationIds.includes(location))) return malformed();
  if (['LEAD', 'EMPLOYEE'].includes(role) && administrativeLocationIds.length) return malformed();
  return Object.freeze({ ...shared, locator: field(row, 'locator', validLocator), employeeId: id(row, 'employeeId'), employeeVersion: timestamp(row, 'employeeVersion'), authorizationVersion: revision(row, 'authorizationVersion'), portalAccessVersion: revision(row, 'portalAccessVersion'), sessionTokenHash: digest(row, 'sessionTokenHash'), sessionExpiresAt: boundedExpiry(row, 'sessionExpiresAt', shared.expiresAt), role, capabilityPolicyRevision: revision(row, 'capabilityPolicyRevision'), capabilities: list(row, 'capabilities', value => typeof value === 'string' && /^[a-z][a-z0-9.-]{0,127}$/.test(value)), allowedLocationIds, administrativeLocationIds });
}
function parseClocker(row: Record<string, unknown>): ClockerProofFacts {
  const shared = base(row, 'CLOCKER');
  return Object.freeze({ ...shared, locationId: id(row, 'locationId'), deviceId: id(row, 'deviceId'), deviceVersion: revision(row, 'deviceVersion'), credentialHash: digest(row, 'credentialHash'), credentialVersion: revision(row, 'credentialVersion'), pinSessionTokenHash: digest(row, 'pinSessionTokenHash'), pinVersion: revision(row, 'pinVersion'), pinKeyIdentity: digest(row, 'pinKeyIdentity'), employeeId: id(row, 'employeeId'), employeeVersion: timestamp(row, 'employeeVersion'), pinSessionExpiresAt: boundedExpiry(row, 'pinSessionExpiresAt', shared.expiresAt) });
}
function parseCalendar(row: Record<string, unknown>): CalendarReadProofFacts {
  return Object.freeze({ ...base(row, 'CALENDAR_READ'), subscriptionId: id(row, 'subscriptionId'), digest: digest(row, 'digest'), generation: id(row, 'generation'), employeeId: id(row, 'employeeId'), employeeVersion: timestamp(row, 'employeeVersion'), authorizationVersion: revision(row, 'authorizationVersion'), allowedLocationIds: list(row, 'allowedLocationIds', validId, false) });
}
function parseWorker(row: Record<string, unknown>): WorkerProofFacts {
  const shared = base(row, 'WORKER');
  return Object.freeze({ ...shared, workerId: id(row, 'workerId'), workerCredentialDigest: digest(row, 'workerCredentialDigest'), workerGrantVersion: revision(row, 'workerGrantVersion'), environment: field(row, 'environment', value => value === 'test' || value === 'production') as WorkerProofFacts['environment'], deliveryId: id(row, 'deliveryId'), intentId: id(row, 'intentId'), subscriptionId: id(row, 'subscriptionId'), generation: id(row, 'generation'), leaseTokenHash: digest(row, 'leaseTokenHash'), leaseExpiresAt: boundedExpiry(row, 'leaseExpiresAt', shared.expiresAt) });
}
function parseProvisioner(row: Record<string, unknown>): ProvisionerScopeFacts {
  current(row, 'PROVISIONER');
  const purpose = field(row, 'purpose', validPurpose) as ProvisionerPurpose;
  const bootstrap = purpose === 'TENANT_BOOTSTRAP';
  const workspaceId = bootstrap ? null : id(row, 'workspaceId');
  const bootstrapNonce = bootstrap ? id(row, 'bootstrapNonce') : null;
  const workspaceIncarnation = bootstrap ? null : incarnation(row, 'workspaceIncarnation');
  const sourceVersion = bootstrap ? null : timestamp(row, 'sourceVersion');
  const verifiedIdentityReference = bootstrap ? null : id(row, 'verifiedIdentityReference');
  for (const key of bootstrap ? ['workspaceId', 'workspaceIncarnation', 'sourceVersion', 'verifiedIdentityReference'] : ['bootstrapNonce']) if (row[key] !== null) return malformed();
  return Object.freeze({ kind: 'PROVISIONER', operatorId: id(row, 'operatorId'), operatorGrantId: id(row, 'operatorGrantId'), operatorGrantVersion: revision(row, 'operatorGrantVersion'), operatorCredentialDigest: digest(row, 'operatorCredentialDigest'), environment: field(row, 'environment', validEnvironment) as ProvisionerEnvironment, purpose, workspaceId, bootstrapNonce, workspaceIncarnation, sourceVersion, verifiedIdentityReference, subjectEmployeeId: id(row, 'subjectEmployeeId'), requestId: id(row, 'requestId'), requestDigest: digest(row, 'requestDigest'), operationId: id(row, 'operationId'), payloadDigest: digest(row, 'payloadDigest'), ...lifetime(row) });
}
const FINAL_ROLE = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
// Closed native transport shapes only, never held-lock/catalog/role authority.
// Descriptor ownership is essential: inherited names or descriptor values may
// not substitute for observed data fields. Reject proxy/accessor behavior.
function singleWireResult(value: unknown, field: 'catalog_fence' | 'guard', expected: '' | 1): boolean {
  if (!value || typeof value !== 'object' || nodeTypes.isProxy(value) || !Array.isArray(value)) return false;
  const items = Object.getOwnPropertyDescriptors(value as object);
  if (Reflect.ownKeys(items).length !== 2 || !Object.hasOwn(items, 'length') || !Object.hasOwn(items, '0') ||
    !Object.hasOwn(items.length, 'value') || items.length.value !== 1 || !Object.hasOwn(items[0], 'value')) return false;
  const row: unknown = items[0].value;
  if (!row || typeof row !== 'object' || nodeTypes.isProxy(row) || Array.isArray(row)) return false;
  const prototype = Object.getPrototypeOf(row);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const fields = Object.getOwnPropertyDescriptors(row);
  return Reflect.ownKeys(fields).length === 1 && Object.hasOwn(fields, field) &&
    Object.hasOwn(fields[field], 'value') && fields[field].value === expected;
}
async function lookup(seam: keyof typeof seams, values: string[]): Promise<Record<string, unknown> | null> {
  // No queryRows coercion: malformed transport must not silently become DENY.
  // Resolver expressions are closed server constants. No legacy/bootstrap URL
  // is permitted even for anonymous or control-purpose identity discovery.
  // Provisioner lookup yields only narrow grant metadata; it grants no DDL or
  // ordinary tenant authority. SQL role helpers remain an installation gate.
  const role = seam === 'worker' ? 'WORKER' : 'APP';
  const sql = `SELECT CASE WHEN nevora_tenancy.assert_runtime_role('${role}'::text) IS TRUE THEN ${seams[seam]} ELSE NULL::jsonb END AS facts`;
  const transport = getTenantRuntimeDb(role);
  // Leave every query lazy. ReadCommitted gives the lookup a fresh statement
  // snapshot after a blocked shared fence; final role denial raises in the same
  // owning transaction before private issuance. No replay or standalone await.
  const queries = [
    transport.query(RUNTIME_CATALOG_SHARED_FENCE_SQL.text, [...RUNTIME_CATALOG_SHARED_FENCE_SQL.values]),
    transport.query(sql, values),
    transport.query(FINAL_ROLE, [role]),
  ];
  const results: unknown = await transport.transaction(queries, { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false });
  if (!Array.isArray(results) || results.length !== 3 || !singleWireResult(results[0], 'catalog_fence', '') ||
    !singleWireResult(results[2], 'guard', 1)) return malformed();
  const rows: unknown = results[1];
  if (!Array.isArray(rows) || rows.length > 1) return malformed();
  if (!rows.length) return null;
  const row = record(rows[0]);
  if (!Object.prototype.hasOwnProperty.call(row, 'facts')) return malformed();
  return row.facts === null ? null : record(row.facts);
}
function issue<P extends TenantProof>(facts: TenantProofFacts): ProofResolution<P> {
  const proof = Object.freeze({ kind: facts.kind }) as P;
  tenantFacts.set(proof, facts);
  return Object.freeze({ status: 'ALLOW', proof });
}
async function resolve<P extends TenantProof>(seam: keyof typeof seams, values: string[], parse: (row: Record<string, unknown>) => TenantProofFacts, matches: (facts: TenantProofFacts) => boolean): Promise<ProofResolution<P>> {
  try {
    const row = await lookup(seam, values);
    if (!row) return DENY;
    const facts = parse(row);
    if (!matches(facts)) return DENY;
    return issue<P>(facts);
  } catch (error) { return error instanceof Denied ? DENY : UNAVAILABLE; }
}
/** Identity and local expiry only. The executor MUST revalidate current DB
 * authority/version after locks; this pre-read is never final-write authority. */
export function getTenantProofFacts(proof: TenantProof): TenantProofFacts {
  const facts = proof && typeof proof === 'object' ? tenantFacts.get(proof) : undefined;
  if (!facts || timestampMillis(facts.expiresAt) <= Date.now()) throw new Error('tenant_proof_denied');
  return facts;
}
export function getProvisionerScopeFacts(scope: ProvisionerScope): ProvisionerScopeFacts {
  const facts = scope && typeof scope === 'object' ? provisionerFacts.get(scope) : undefined;
  if (!facts || timestampMillis(facts.expiresAt) <= Date.now()) throw new Error('provisioner_scope_denied');
  return facts;
}
export async function resolvePortalProof(locator: string, sessionTokenHash: string): Promise<ProofResolution<PortalProof>> {
  const normalizedLocator = normalizeWorkspaceLocator(locator);
  if (!normalizedLocator || !validDigest(sessionTokenHash)) return DENY;
  return resolve('portal', [normalizedLocator, sessionTokenHash], parsePortal, facts => facts.kind === 'PORTAL' && facts.locator === normalizedLocator && facts.sessionTokenHash === sessionTokenHash);
}
export async function resolveClockerProof(deviceCredential: string, pinSessionToken: string): Promise<ProofResolution<ClockerProof>> {
  if (typeof deviceCredential !== 'string' || !/^nev_dev_[a-f0-9]{64}$/.test(deviceCredential) || typeof pinSessionToken !== 'string' || !/^nev_pin_[a-f0-9]{64}$/.test(pinSessionToken)) return DENY;
  const credentialHash = sha256(deviceCredential, 'nevora-clocker-v1\0');
  const pinSessionTokenHash = sha256(pinSessionToken, 'nevora-clocker-identity-v1\0');
  return resolve('clocker', [credentialHash, pinSessionTokenHash], parseClocker, facts => facts.kind === 'CLOCKER' && facts.credentialHash === credentialHash && facts.pinSessionTokenHash === pinSessionTokenHash);
}
export async function resolveCalendarReadProof(subscriptionDigest: string): Promise<ProofResolution<CalendarReadProof>> {
  if (!validDigest(subscriptionDigest)) return DENY;
  return resolve('calendar', [subscriptionDigest], parseCalendar, facts => facts.kind === 'CALENDAR_READ' && facts.digest === subscriptionDigest);
}
export async function resolveWorkerProof(workerIdentity: WorkerIdentity, claim: WorkerLeaseClaim): Promise<ProofResolution<WorkerProof>> {
  const identity = inputSnapshot(workerIdentity), lease = inputSnapshot(claim);
  if (!identity || !validId(identity.workerId) || !validDigest(identity.credentialDigest) || (identity.environment !== 'test' && identity.environment !== 'production') || !lease || !validId(lease.deliveryId) || !validId(lease.generation) || typeof lease.leaseToken !== 'string' || !/^[A-Za-z0-9._:-]{16,256}$/.test(lease.leaseToken)) return DENY;
  const { workerId, credentialDigest, environment } = identity;
  const { deliveryId, generation, leaseToken } = lease;
  const leaseTokenHash = sha256(leaseToken);
  return resolve('worker', [workerId, credentialDigest, environment, deliveryId, generation, leaseTokenHash], parseWorker, facts => facts.kind === 'WORKER' && facts.workerId === workerId && facts.workerCredentialDigest === credentialDigest && facts.environment === environment && facts.deliveryId === deliveryId && facts.generation === generation && facts.leaseTokenHash === leaseTokenHash);
}
export async function resolveProvisionerScope(operator: ProvisionerOperator, environment: ProvisionerEnvironment, purpose: ProvisionerPurpose): Promise<ScopeResolution> {
  const input = inputSnapshot(operator);
  if (!input || !validId(input.operatorId) || !validDigest(input.credentialDigest) || !validId(input.requestId) || !validDigest(input.requestDigest) || !validId(input.operationId) || !validDigest(input.payloadDigest) || !validEnvironment(environment) || !validPurpose(purpose)) return DENY;
  const { operatorId, credentialDigest, requestId, requestDigest, operationId, payloadDigest } = input;
  try {
    const row = await lookup('provisioner', [operatorId, credentialDigest, environment, purpose, requestId, requestDigest, operationId, payloadDigest]);
    if (!row) return DENY;
    // Compare input bindings before purpose-dependent parsing; a different grant
    // must never be reported as this request's authenticated authority.
    if (row.operatorId !== operatorId || row.operatorCredentialDigest !== credentialDigest || row.environment !== environment || row.purpose !== purpose || row.requestId !== requestId || row.requestDigest !== requestDigest || row.operationId !== operationId || row.payloadDigest !== payloadDigest) return DENY;
    const facts = parseProvisioner(row);
    const scope = Object.freeze({ kind: 'PROVISIONER' as const }) as ProvisionerScope;
    provisionerFacts.set(scope, facts);
    return Object.freeze({ status: 'ALLOW', scope });
  } catch (error) { return error instanceof Denied ? DENY : UNAVAILABLE; }
}
