import 'server-only';
import { getTenantProofFacts } from './resolve.server';
import type { PortalProof, TenantProof } from './types';
import type { UserRole } from '../domain';

declare const statementBrand: unique symbol;
declare const batchBrand: unique symbol;
export type TenantStatement<T> = Readonly<{ name: string; [statementBrand]: T }>;
export type TenantBatch<T extends readonly unknown[]> = Readonly<{ [batchBrand]: T }>;
export type WorkspaceSnapshot = Readonly<{ id: string; name: string; timeZone: string; active: true }>;
export type PortalEmploymentSnapshot = Readonly<{ id: string; firstName: string; lastName: string; role: UserRole; active: true }>;
export type CompiledTenantStatement<T> = Readonly<{
  name: string; text: string; values: readonly string[]; decode: (result: unknown) => T;
}>;
type RegisteredStatement = { proof: TenantProof; compiled: CompiledTenantStatement<unknown> };
// Runtime identity closes the SQL surface: brands alone do not prevent a cast
// or deserialized object from pretending to be a statement/batch. Every compiled
// object must come from these builders and belong to the exact original proof.
const statements = new WeakMap<object, RegisteredStatement>();
const batches = new WeakMap<object, { proof: TenantProof; statements: readonly object[] }>();
const denied = (): never => { throw new Error('tenant_statement_denied'); };
const unavailable = (): never => { throw new Error('tenant_result_unavailable'); };
function portalFacts(proof: PortalProof) {
  const facts = getTenantProofFacts(proof);
  if (facts.kind !== 'PORTAL') return denied();
  return facts;
}
function singleRow(value: unknown): Record<string, unknown> {
  if (!Array.isArray(value) || value.length !== 1 || !value[0] || typeof value[0] !== 'object' || Array.isArray(value[0])) return unavailable();
  const row = value[0];
  if (Object.getPrototypeOf(row) !== Object.prototype && Object.getPrototypeOf(row) !== null) return unavailable();
  if (Object.values(Object.getOwnPropertyDescriptors(row)).some(x => !('value' in x))) return unavailable();
  return row;
}
function register<T>(proof: PortalProof, name: string, text: string, values: string[], decode: (rows: unknown) => T): TenantStatement<T> {
  const statement = Object.freeze({ name }) as TenantStatement<T>;
  statements.set(statement, { proof, compiled: Object.freeze({ name, text, values: Object.freeze([...values]), decode }) });
  return statement;
}
/** Closed builders only: no raw SQL or caller-selected workspace/proof facts. */
export function workspaceSnapshot(proof: PortalProof): TenantStatement<WorkspaceSnapshot> {
  const facts = portalFacts(proof);
  return register(proof, 'WORKSPACE_SNAPSHOT',
    'SELECT w.id, w.name, w.time_zone, w.active FROM public.workspaces w WHERE w.id = $1::text AND w.active = true',
    [facts.workspaceId], rows => {
      const row = singleRow(rows);
      if (row.id !== facts.workspaceId || typeof row.name !== 'string' || typeof row.time_zone !== 'string' || row.active !== true) return unavailable();
      return Object.freeze({ id: facts.workspaceId, name: row.name, timeZone: row.time_zone, active: true });
    });
}
/** Select only the employment bound to the Portal proof and reject a returned
 * role/identity mismatch. The executor supplies current-source transaction guards. */
export function portalEmploymentSnapshot(proof: PortalProof): TenantStatement<PortalEmploymentSnapshot> {
  const facts = portalFacts(proof);
  return register(proof, 'PORTAL_EMPLOYMENT_SNAPSHOT',
    'SELECT e.id, e.first_name, e.last_name, e.role, e.active FROM public.employees e WHERE e.workspace_id = $1::text AND e.id = $2::text AND e.active = true',
    [facts.workspaceId, facts.employeeId], rows => {
      const row = singleRow(rows);
      if (row.id !== facts.employeeId || typeof row.first_name !== 'string' || typeof row.last_name !== 'string' || row.role !== facts.role || row.active !== true) return unavailable();
      return Object.freeze({ id: facts.employeeId, firstName: row.first_name, lastName: row.last_name, role: facts.role, active: true });
    });
}
/** Internal executor lookup, not a raw-SQL admission API. Copies/forgeries and
 * a genuine statement paired with a different proof are denied. */
export function compileTenantStatement<T>(proof: TenantProof, statement: TenantStatement<T> | unknown): CompiledTenantStatement<T> {
  getTenantProofFacts(proof);
  const registered = statement && typeof statement === 'object' ? statements.get(statement) : undefined;
  if (!registered || registered.proof !== proof) return denied();
  return registered.compiled as CompiledTenantStatement<T>;
}
/** Capture a nonempty ordered set of statements belonging to one proof. Detach
 * the input array so later caller mutation cannot alter a registered batch. */
export function tenantBatch<T extends readonly TenantStatement<unknown>[]>(proof: TenantProof, values: T): TenantBatch<{ [K in keyof T]: T[K] extends TenantStatement<infer R> ? R : never }> {
  getTenantProofFacts(proof);
  if (!Array.isArray(values) || !values.length || [...values].some(value => !value)) return denied();
  values.forEach(statement => compileTenantStatement(proof, statement));
  const batch = Object.freeze({});
  batches.set(batch, { proof, statements: Object.freeze([...values]) });
  return batch as TenantBatch<{ [K in keyof T]: T[K] extends TenantStatement<infer R> ? R : never }>;
}
/** Reauthenticate batch and statement identities immediately before execution;
 * compiling never opens a transaction or certifies current database authority. */
export function compileTenantBatch<T extends readonly unknown[]>(proof: TenantProof, batch: TenantBatch<T> | unknown): readonly CompiledTenantStatement<T[number]>[] {
  getTenantProofFacts(proof);
  const registered = batch && typeof batch === 'object' ? batches.get(batch) : undefined;
  if (!registered || registered.proof !== proof) return denied();
  return Object.freeze(registered.statements.map(statement => compileTenantStatement<T[number]>(proof, statement)));
}
