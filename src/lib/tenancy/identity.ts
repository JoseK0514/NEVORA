import { randomUUID } from 'node:crypto';
import { normalizePhoneNumber } from '../phone';

export type EmploymentIdentity = Readonly<{ workspaceId: string; employeeId: string; employeeNumber: string; normalizedNumber: string }>;
export type NewEmploymentInput = { employeeNumber: string; email?: string | null; phone: string };
export type NewEmploymentIdentity = EmploymentIdentity & Readonly<{ email: string | null; phone: string }>;
export type NamespaceRow = EmploymentIdentity & { active: boolean; databaseEmailKey: string | null };
export type NamespaceIssue = { code: 'INVALID_IDENTITY' | 'NUMBER_KEY_MISMATCH' | 'GLOBAL_ID_REUSED' | 'NUMBER_COLLISION' | 'EMAIL_COLLISION'; workspaceId: string; employeeIds: string[] };
export type NamespacePreflight = { ready: boolean; issues: NamespaceIssue[]; legacyExceptions: EmploymentIdentity[] };

const controls = /[\p{Cc}\p{Cf}]/u;
const compare = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;

/** A locator selects a namespace; this pure value creates no authority. */
export function normalizeWorkspaceLocator(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  const value = input.trim();
  return /^[A-Za-z0-9-]{8,32}$/.test(value) ? value.toLowerCase() : null;
}

/** Preserve the documented existing comparison, including its Unicode casing.
 * Do not substitute PostgreSQL UPPER/collation or normalize historical bytes. */
export function normalizeEmployeeNumber(input: string): string { return input.trim().toUpperCase(); }
export function newEmployeeNumber(input: string): string | null {
  if (typeof input !== 'string') return null;
  const value = normalizeEmployeeNumber(input);
  return /^[A-Z0-9][A-Z0-9._-]{0,127}$/.test(value) ? value : null;
}
export function employmentNamespaceKey(workspaceId: string, key: string): string { return JSON.stringify([workspaceId, key]); }

/** The caller must supply independently captured immutable tenant ancestry.
 * No primary location/contact/default workspace is consulted or inferred. */
export function bindLegacyEmployment(workspaceId: string, employeeId: string): EmploymentIdentity {
  if (typeof workspaceId !== 'string' || !workspaceId || typeof employeeId !== 'string' || !employeeId) throw new Error('identity_binding');
  return Object.freeze({ workspaceId, employeeId, employeeNumber: employeeId, normalizedNumber: normalizeEmployeeNumber(employeeId) });
}

/** Pure preparation only: no employee insert, credentials, proof, activation,
 * contact linking or provider intent. Optional email display case is retained;
 * its comparison key is computed by the existing database contract on insert. */
export function prepareNewEmployment(workspaceId: string, input: NewEmploymentInput): NewEmploymentIdentity | null {
  if (typeof workspaceId !== 'string' || !workspaceId || !input || typeof input !== 'object' || typeof input.phone !== 'string') return null;
  const number = newEmployeeNumber(input.employeeNumber);
  const phone = normalizePhoneNumber(input.phone);
  if (!number || !phone || (input.email !== undefined && input.email !== null && typeof input.email !== 'string')) return null;
  const email = input.email?.trim() || null;
  if (email !== null && ([...email].length > 254 || controls.test(email) || /\s/.test(email) || !/^[^@]+@[^@]+$/.test(email))) return null;
  return Object.freeze({ workspaceId, employeeId: randomUUID(), employeeNumber: number, normalizedNumber: number, email, phone });
}

/** Consume every captured employment, including inactive rows. The surrounding
 * migration capture proves completeness; this function does not query a DB.
 * databaseEmailKey MUST come from the actual existing DB comparison contract;
 * guessed JS/locale equivalence cannot certify a legacy email migration. */
export function preflightEmploymentNamespaces(rows: readonly NamespaceRow[]): NamespacePreflight {
  const issues: NamespaceIssue[] = [], legacyExceptions: EmploymentIdentity[] = [];
  const ids = new Map<string, NamespaceRow[]>(), numbers = new Map<string, NamespaceRow[]>(), emails = new Map<string, NamespaceRow[]>();
  const group = (map: Map<string, NamespaceRow[]>, key: string, value: NamespaceRow) => map.set(key, [...(map.get(key) ?? []), value]);
  for (const value of rows) {
    if (!value || typeof value.workspaceId !== 'string' || !value.workspaceId || typeof value.employeeId !== 'string' || !value.employeeId || typeof value.employeeNumber !== 'string' || !normalizeEmployeeNumber(value.employeeNumber) || controls.test(value.employeeNumber) || typeof value.normalizedNumber !== 'string' || typeof value.active !== 'boolean' || (value.databaseEmailKey !== null && typeof value.databaseEmailKey !== 'string')) {
      issues.push({ code: 'INVALID_IDENTITY', workspaceId: typeof value?.workspaceId === 'string' ? value.workspaceId : '', employeeIds: typeof value?.employeeId === 'string' ? [value.employeeId] : [] });
      continue;
    }
    if (value.normalizedNumber !== normalizeEmployeeNumber(value.employeeNumber)) issues.push({ code: 'NUMBER_KEY_MISMATCH', workspaceId: value.workspaceId, employeeIds: [value.employeeId] });
    if (newEmployeeNumber(value.employeeNumber) === null) legacyExceptions.push(Object.freeze({ workspaceId: value.workspaceId, employeeId: value.employeeId, employeeNumber: value.employeeNumber, normalizedNumber: value.normalizedNumber }));
    group(ids, value.employeeId, value);
    group(numbers, employmentNamespaceKey(value.workspaceId, value.normalizedNumber), value);
    if (value.databaseEmailKey !== null) group(emails, employmentNamespaceKey(value.workspaceId, value.databaseEmailKey), value);
  }
  for (const [code, groups] of [['GLOBAL_ID_REUSED', ids], ['NUMBER_COLLISION', numbers], ['EMAIL_COLLISION', emails]] as const) {
    for (const values of groups.values()) if (values.length > 1) issues.push({ code, workspaceId: code === 'GLOBAL_ID_REUSED' ? [...new Set(values.map(v => v.workspaceId))].sort(compare).join(',') : values[0].workspaceId, employeeIds: [...new Set(values.map(v => v.employeeId))].sort(compare) });
  }
  issues.sort((a, b) => compare(JSON.stringify(a), JSON.stringify(b)));
  legacyExceptions.sort((a, b) => compare(employmentNamespaceKey(a.workspaceId, a.employeeId), employmentNamespaceKey(b.workspaceId, b.employeeId)));
  return { ready: issues.length === 0, issues, legacyExceptions };
}
