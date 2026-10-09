import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import { Temporal } from '@js-temporal/polyfill';
import { newEmployeeNumber, normalizeEmployeeNumber, normalizeWorkspaceLocator } from '../tenancy/identity';
import { normalizePhoneNumber } from '../phone';
import type { UserRole } from '../domain';
import type { CapabilityField, PortalState } from '../capabilities/types';

/** Pure F9 preparation only. A protected F10/F6/F5/F7 service must load and
 * independently recheck every observation. Booleans/digests are not authority.
 * No storage/staging, employee ID creation, mutation, commitment/reversal,
 * credentials, activation, calendar/PIN/device or delivery effects occur here. */
export const EMPLOYEE_CSV_LIMITS = Object.freeze({ maxBytes: 2 * 1024 * 1024, maxRows: 500, maxColumns: 20, maxCellCodePoints: 4096 });
export type EmployeeCsvLimits = { maxBytes: number; maxRows: number; maxColumns: number; maxCellCodePoints: number };
export type EmployeeCsvField = 'employeeNumber' | 'firstName' | 'lastName' | 'phone' | 'email' | 'role' | 'primaryLocationCode' | 'eligibleLocationCodes' | 'positionCodes';
export type EmployeeCsvMapping = { version: 'F9-CSV-MAPPING-1'; columns: { column: number; header: string; field: EmployeeCsvField | null }[] };
export type EmployeeCsvDiagnostic = { code: string; category: 'invalid' | 'conflict'; message: string; field?: EmployeeCsvField; column?: number; rowNumber?: number; line?: number };
export type EmployeeCsvNormalizedRow = { employeeNumber: string | null; firstName: string | null; lastName: string | null; phone: string | null;
  email: string | null; role: 'EMPLOYEE' | 'LEAD' | null; primaryLocationCode: string | null; eligibleLocationCodes: string[]; positionCodes: string[] };
export type EmployeeCsvRow = { rowNumber: number; lineStart: number; lineEnd: number; mapped: Partial<Record<EmployeeCsvField, string>>;
  normalized: EmployeeCsvNormalizedRow; errors: EmployeeCsvDiagnostic[]; warnings: { code: string; message: string }[] };
export type ParsedEmployeeRows = { state: 'parsed' | 'invalid'; formatVersion: 'F9-CSV-1'; mappingVersion: 'F9-CSV-MAPPING-1';
  headers: { column: number; name: string; ambiguous: boolean }[]; excludedColumns: { column: number; name: string }[];
  rows: EmployeeCsvRow[]; issues: EmployeeCsvDiagnostic[]; normalizedRowsDigest: string | null; batchMode: 'ATOMIC_CREATE_ONLY'; noMutation: true };
export type EmployeeCsvBinding = { workspaceId: string; workspaceCode: string; actorId: string; purpose: 'EMPLOYEE_IMPORT_PREVIEW';
  sourceVersion: string; catalogVersion: string; configurationVersion: string; namespaceVersion: string; schemaVersion: string;
  sessionVersion: string; grantsVersion: string; scopeVersion: string; incarnation: string };
export type EmployeeCsvCatalogEntry = { id: string; code: string; workspaceId: string; active: boolean };
/** Actual SQL lower(email)/index-collation equality classes, captured for the
 * exact normalized candidates/current namespace. Never construct them using JS
 * lower-case. This typed value cannot attest that a database call took place. */
export type EmployeeCsvEmailComparisons = { binding: EmployeeCsvBinding; normalizedRowsDigest: string; complete: boolean;
  mode: 'ACTUAL_DATABASE_COMPARISON'; snapshotId: string; contractId: 'employees.email_ci'; expression: 'lower(email)';
  comparatorSourceDigest: string; collationDigest: string;
  rows: { rowNumber: number; inputEmail: string; expressionValue: string; comparisonClass: string; conflictsExisting: boolean }[] };
export type EmployeeCsvPreviewSnapshot = {
  actor: { workspaceId: string; actorId: string; role: UserRole; portalState: PortalState; workspaceActive: boolean; workforceActive: boolean;
    membershipCurrent: boolean; sessionCurrent: boolean; grantsCurrent: boolean; previewAllowed: boolean; errorDownloadAllowed: boolean;
    permittedFields: CapabilityField[]; expiresAt: string };
  current: EmployeeCsvBinding & { now: string; observedAt: string; expiresAt: string; previewCreatedAt: string; sourceCurrent: boolean; complete: boolean;
    normalizedRowsDigest: string | null; mappingDigest: string; catalogDigest: string; namespaceDigest: string; emailComparisonDigest: string };
  record: { binding: EmployeeCsvBinding; createdAt: string; csv: string; mapping: EmployeeCsvMapping; limits: EmployeeCsvLimits;
    catalogs: { complete: boolean; locations: EmployeeCsvCatalogEntry[]; positions: EmployeeCsvCatalogEntry[] };
    namespace: { complete: boolean; numbers: { workspaceId: string; employeeNumber: string; normalizedNumber: string; workforceState: 'ACTIVE' | 'INACTIVE' }[] };
    emailComparisons: EmployeeCsvEmailComparisons | null };
};
export type EmployeeCsvDraft = { employeeNumber: string; firstName: string; lastName: string; phone: string; email: string | null;
  role: 'EMPLOYEE' | 'LEAD'; primaryLocationId: string; eligibleLocationIds: string[]; positionIds: string[]; workforceState: 'ACTIVE'; portalState: 'DISABLED' };
export type EmployeeCsvPreviewRow = EmployeeCsvRow & { status: 'proposed' | 'invalid' | 'conflicting'; draft: EmployeeCsvDraft | null };
type PreviewData = { workspaceId: string; workspaceCode: string; rows: EmployeeCsvPreviewRow[]; issues: EmployeeCsvDiagnostic[];
  headers: ParsedEmployeeRows['headers']; excludedColumns: ParsedEmployeeRows['excludedColumns']; summary: { newRecords: number; invalid: number; conflicting: number };
  roleSummary: { role: 'EMPLOYEE' | 'LEAD'; count: number }[]; locationSummary: { locationId: string; primaryCount: number; eligibleCount: number }[];
  createdAt: string; expiresAt: string; payloadDigest: string; previewDigest: string; batchMode: 'ATOMIC_CREATE_ONLY'; commitAuthority: 'NOT_ISSUED' };
export type EmployeeCsvPreviewOutcome =
  | { state: 'unavailable'; reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE' }
  | { state: 'conflict' | 'expired'; nextAction: 'REPREVIEW' }
  | (PreviewData & { state: 'ready'; nextAction: 'REVIEW_ALL_RECORDS' })
  | (PreviewData & { state: 'invalid'; nextAction: 'CORRECT_AND_REPREVIEW' });
export type EmployeeCsvErrorDownload = { state: 'prepared'; columns: string[]; rows: string[][]; transient: true; persistRawFile: false }
  | Extract<EmployeeCsvPreviewOutcome, { state: 'unavailable' | 'conflict' | 'expired' }>;

const fields: EmployeeCsvField[] = ['employeeNumber', 'firstName', 'lastName', 'phone', 'email', 'role', 'primaryLocationCode', 'eligibleLocationCodes', 'positionCodes'];
const required: EmployeeCsvField[] = ['employeeNumber', 'firstName', 'lastName', 'phone', 'primaryLocationCode'];
const requestedFields: CapabilityField[] = ['employee.identity', 'employee.contact', 'employee.role', 'employee.eligibility', 'employee.positions', 'csv.contacts'];
const controls = /[\p{Cc}\p{Cf}]/u;
const text = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && !controls.test(v);
const sha = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const integer = (v: unknown, min = 0): v is number => Number.isSafeInteger(v) && Number(v) >= min;
const order = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const object = (v: unknown): v is Record<string, unknown> => !!v && !nodeTypes.isProxy(v) && typeof v === 'object' && !Array.isArray(v)
  && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null)
  && Reflect.ownKeys(v).every(k => typeof k === 'string' && 'value' in Object.getOwnPropertyDescriptor(v, k)! && Object.getOwnPropertyDescriptor(v, k)!.enumerable);
function array(v: unknown): v is unknown[] {
  if (nodeTypes.isProxy(v) || !Array.isArray(v) || Object.getPrototypeOf(v) !== Array.prototype) return false;
  const length = Object.getOwnPropertyDescriptor(v, 'length'); if (!length || !('value' in length)) return false;
  const keys = Reflect.ownKeys(v); return keys.length === length.value + 1 && keys.every(k => typeof k === 'string'
    && 'value' in Object.getOwnPropertyDescriptor(v, k)! && (k === 'length' || Object.getOwnPropertyDescriptor(v, k)!.enumerable && /^(0|[1-9]\d*)$/.test(k) && Number(k) < length.value));
}
function data(v: unknown, depth = 0): boolean {
  if (depth > 80 || nodeTypes.isProxy(v)) return false;
  if (v === null || v === undefined || ['string', 'boolean'].includes(typeof v)) return true;
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return array(v) && v.every(x => data(x, depth + 1));
  return object(v) && Object.values(v).every(x => data(x, depth + 1));
}
/** Independent digest contract: JS ordinal object keys; omit undefined object
 * members, undefined array elements=null, preserve array order. No proof issued. */
function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(x => canonical(x === undefined ? null : x)).join(',') + ']';
  const o = v as Record<string, unknown>; return '{' + Object.keys(o).filter(k => o[k] !== undefined).sort(order).map(k => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}
const digest = (v: unknown) => createHash('sha256').update(canonical(v)).digest('hex');
const oneOf = (v: unknown, values: readonly string[]) => typeof v === 'string' && values.includes(v);
const messages: Record<string, string> = {
  INVALID_UTF8: 'Upload valid UTF-8 text.', BYTE_LIMIT: 'The encoded file exceeds 2 MiB.', ROW_LIMIT: 'Use at most 500 data rows in one newly reviewed batch.',
  COLUMN_LIMIT: 'Use at most 20 columns.', CELL_LIMIT: 'A cell exceeds 4,096 Unicode code points.', CELL_CONTROL: 'A cell contains an unsupported control character.',
  CSV_FORMAT: 'Use comma-separated fields, strict quotes, and CRLF or LF lines.', HEADER_REQUIRED: 'Include one nonempty header row.', HEADER_INVALID: 'A header is empty or contains a control character.',
  INVALID_LIMITS: 'Use the approved CSV limits.', INVALID_MAPPING: 'Map each column once to a supported field or an explicit exclusion.',
  REQUIRED_MAPPING: 'Map every required field.', HEADER_MAPPING_CHANGED: 'A mapped column no longer has its exact reviewed header.',
  UNMAPPED_COLUMN: 'Map or explicitly exclude this column.', FORBIDDEN_COLUMN: 'This restricted column cannot be imported or silently excluded.',
  ROW_COLUMN_COUNT: 'The row must have exactly the header column count.', NO_DATA_ROWS: 'Include at least one data row.',
  INVALID_NUMBER: 'Enter a new number using 1–128 ASCII letters, digits, dots, underscores or hyphens, starting with a letter or digit.',
  INVALID_NAME: 'Enter a name of 1–160 Unicode code points without control characters.', INVALID_PHONE: 'Enter exactly 10 NANP digits, with an optional leading 1 and no extension.',
  INVALID_EMAIL: 'Enter an optional email of at most 254 code points, without controls or whitespace and with exactly one nonempty local/domain pair.',
  INVALID_ROLE: 'Bulk import supports EMPLOYEE or LEAD only.', INVALID_CATALOG_CODE: 'Use explicit stable catalog codes without controls or empty list entries.',
  FILE_NUMBER_DUPLICATE: 'The normalized employee number repeats in this file. Correct every involved row.', FILE_EMAIL_DUPLICATE: 'The email repeats under the current database namespace comparison. Correct every involved row.',
  EXISTING_NUMBER: 'This number already belongs to an active or inactive employment in this workspace. Review the existing record.',
  EXISTING_EMAIL: 'This email is already used in this workspace.', CATALOG_CODE_UNAVAILABLE: 'A selected catalog code is unavailable or inactive in this workspace.',
  CATALOG_CODE_AMBIGUOUS: 'A selected code identifies more than one catalog record. Resolve the catalog ambiguity.',
};
function issue(code: keyof typeof messages, details: Omit<Partial<EmployeeCsvDiagnostic>, 'code' | 'message'> = {}): EmployeeCsvDiagnostic {
  return { code, message: messages[code], category: 'invalid', ...details };
}
const forbidden = new Set(['password', 'passwordhash', 'credentials', 'credential', 'activation', 'activationstate', 'activationenabled', 'portalstate',
  'pin', 'pinhash', 'token', 'secret', 'bearer', 'calendarurl', 'salary', 'attendancescore', 'leavereason', 'personalnote', 'administrativescope', 'externalmessageflag',
  'sendemail', 'sendsms', 'sendnotification', 'invite', 'invitation', 'active', 'workforcestate']);
const restricted = (header: string) => forbidden.has(header.replace(/[\s_-]/g, '').toLowerCase());
function utf16(value: string): boolean {
  for (let n = 0; n < value.length; n++) { const c = value.charCodeAt(n); if (c >= 0xd800 && c <= 0xdbff) {
    const next = value.charCodeAt(++n); if (!(next >= 0xdc00 && next <= 0xdfff)) return false;
  } else if (c >= 0xdc00 && c <= 0xdfff) return false; } return true;
}
export function decodeEmployeeCsvUpload(bytes: Uint8Array): { state: 'decoded'; csv: string } | { state: 'invalid'; issue: EmployeeCsvDiagnostic } {
  try {
    if (nodeTypes.isProxy(bytes) || !(bytes instanceof Uint8Array)) return { state: 'invalid', issue: issue('INVALID_UTF8') };
    const prototype = Object.getPrototypeOf(Uint8Array.prototype);
    const length = Object.getOwnPropertyDescriptor(prototype, 'byteLength')!.get!.call(bytes);
    if (length > EMPLOYEE_CSV_LIMITS.maxBytes) return { state: 'invalid', issue: issue('BYTE_LIMIT') };
    return { state: 'decoded', csv: new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes) };
  } catch { return { state: 'invalid', issue: issue('INVALID_UTF8') }; }
}
type RawRow = { cells: string[]; rowNumber: number; lineStart: number; lineEnd: number; blankLine: boolean };
function matrix(csv: string): RawRow[] | EmployeeCsvDiagnostic {
  const result: RawRow[] = []; let cells: string[] = [], cell = '', points = 0, quoted = false, afterQuote = false, atStart = true;
  let line = 1, firstLine = 1, nonBlank = false, touched = false, ordinal = 0, pendingCount = 0;
  const pending: RawRow[] = [];
  const append = (value: string) => { cell += value; points += [...value].length; return points <= EMPLOYEE_CSV_LIMITS.maxCellCodePoints; };
  const finishCell = () => { cells.push(cell); cell = ''; points = 0; atStart = true; afterQuote = false; };
  const finishRow = (): EmployeeCsvDiagnostic | null => {
    finishCell(); ordinal++;
    // Trailing blank physical lines do not consume the data-row allowance.
    // Delay them, keeping only the maximum possible interior row set. A later
    // nonblank line proves that all pending lines count, without unbounded
    // allocation or losing the original row/physical-line diagnostics.
    if (ordinal > 1 && !nonBlank) {
      pendingCount++;
      if (pendingCount <= EMPLOYEE_CSV_LIMITS.maxRows) pending.push({ cells, rowNumber: ordinal, lineStart: firstLine, lineEnd: line, blankLine: true });
    } else {
      if (ordinal > 1 && result.length - 1 + pendingCount + 1 > EMPLOYEE_CSV_LIMITS.maxRows) return issue('ROW_LIMIT', { rowNumber: ordinal, line: firstLine });
      result.push(...pending, { cells, rowNumber: ordinal, lineStart: firstLine, lineEnd: line, blankLine: !nonBlank }); pending.length = 0; pendingCount = 0;
    }
    cells = []; nonBlank = false; touched = false; firstLine = line + 1; return null;
  };
  for (let n = 0; n < csv.length; n++) {
    let c = csv[n]; if (c === '\r' && csv[n + 1] !== '\n') return issue('CSV_FORMAT', { rowNumber: ordinal + 1, line });
    if (c === '\r') c = '\r\n'; else if (c.charCodeAt(0) >= 0xd800 && c.charCodeAt(0) <= 0xdbff) c += csv[n + 1];
    n += c.length - 1; touched = true; if (c.trim() !== '') nonBlank = true;
    if (quoted) {
      if (c === '"') { if (csv[n + 1] === '"') { n++; if (!append('"')) return issue('CELL_LIMIT', { rowNumber: ordinal + 1, column: cells.length, line }); }
        else { quoted = false; afterQuote = true; } }
      else if (!append(c)) return issue('CELL_LIMIT', { rowNumber: ordinal + 1, column: cells.length, line });
      if (c === '\n' || c === '\r\n') line++; continue;
    }
    if (c === ',') { finishCell(); if (cells.length >= EMPLOYEE_CSV_LIMITS.maxColumns) return issue('COLUMN_LIMIT', { rowNumber: ordinal + 1, line }); continue; }
    if (c === '\n' || c === '\r\n') { const failure = finishRow(); if (failure) return failure; line++; continue; }
    if (afterQuote || c === '"' && !atStart) return issue('CSV_FORMAT', { rowNumber: ordinal + 1, column: cells.length, line });
    if (c === '"') quoted = true;
    else if (!append(c)) return issue('CELL_LIMIT', { rowNumber: ordinal + 1, column: cells.length, line });
    atStart = false;
  }
  if (quoted) return issue('CSV_FORMAT', { rowNumber: ordinal + 1, column: cells.length, line });
  if (touched || cells.length || cell.length) { const failure = finishRow(); if (failure) return failure; }
  return result;
}
function empty(issues: EmployeeCsvDiagnostic[]): ParsedEmployeeRows {
  return { state: 'invalid', formatVersion: 'F9-CSV-1', mappingVersion: 'F9-CSV-MAPPING-1', headers: [], excludedColumns: [], rows: [], issues,
    normalizedRowsDigest: null, batchMode: 'ATOMIC_CREATE_ONLY', noMutation: true };
}
function validMapping(mapping: unknown): mapping is EmployeeCsvMapping {
  return data(mapping) && object(mapping) && mapping.version === 'F9-CSV-MAPPING-1' && array(mapping.columns)
    && canonical(Object.keys(mapping).sort(order)) === canonical(['columns', 'version']) && mapping.columns.length <= EMPLOYEE_CSV_LIMITS.maxColumns
    && mapping.columns.every(c => object(c) && canonical(Object.keys(c).sort(order)) === canonical(['column', 'field', 'header'])
      && integer(c.column) && typeof c.header === 'string' && (c.field === null || oneOf(c.field, fields)));
}
function normalized(row: RawRow, mapping: EmployeeCsvMapping): EmployeeCsvRow {
  const mapped: EmployeeCsvRow['mapped'] = {}; for (const column of mapping.columns) if (column.field !== null) mapped[column.field] = row.cells[column.column] ?? '';
  const errors: EmployeeCsvDiagnostic[] = [], warnings: EmployeeCsvRow['warnings'] = [];
  const problem = (code: string, field: EmployeeCsvField) => errors.push(issue(code, { field, rowNumber: row.rowNumber, line: row.lineStart }));
  const number = newEmployeeNumber(mapped.employeeNumber ?? ''); if (!number || controls.test(mapped.employeeNumber ?? '')) problem('INVALID_NUMBER', 'employeeNumber');
  const name = (field: 'firstName' | 'lastName') => { const raw = mapped[field] ?? '', value = raw.trim(); if (!value || [...value].length > 160 || controls.test(raw)) { problem('INVALID_NAME', field); return null; } return value; };
  const firstName = name('firstName'), lastName = name('lastName'), rawPhone = mapped.phone ?? '';
  const phone = controls.test(rawPhone) || /[\p{L}\p{N}]/u.test(rawPhone.replace(/[0-9]/g, '')) ? null : normalizePhoneNumber(rawPhone);
  if (!phone) problem('INVALID_PHONE', 'phone');
  const email = mapped.email?.trim() || null;
  if (controls.test(mapped.email ?? '') || email !== null && ([...email].length > 254 || /\s/.test(email) || !/^[^@]+@[^@]+$/.test(email))) problem('INVALID_EMAIL', 'email');
  const role = mapped.role?.trim().toUpperCase() || 'EMPLOYEE'; if (controls.test(mapped.role ?? '') || !oneOf(role, ['EMPLOYEE', 'LEAD'])) problem('INVALID_ROLE', 'role');
  const primary = (mapped.primaryLocationCode ?? '').trim(); if (!primary || controls.test(mapped.primaryLocationCode ?? '')) problem('INVALID_CATALOG_CODE', 'primaryLocationCode');
  const codes = (field: 'eligibleLocationCodes' | 'positionCodes') => {
    const raw = mapped[field]?.trim() ?? ''; if (controls.test(mapped[field] ?? '')) problem('INVALID_CATALOG_CODE', field); if (!raw) return [];
    const values = raw.split(';').map(v => v.trim()); if (values.some(v => !text(v))) problem('INVALID_CATALOG_CODE', field);
    return [...new Set(values)].sort(order);
  };
  const eligible = codes('eligibleLocationCodes'), positions = codes('positionCodes');
  if (primary && !eligible.includes(primary)) { eligible.push(primary); eligible.sort(order); warnings.push({ code: 'PRIMARY_INCLUDED', message: 'The primary location is included in scheduling eligibility.' }); }
  return { rowNumber: row.rowNumber, lineStart: row.lineStart, lineEnd: row.lineEnd, mapped,
    normalized: { employeeNumber: number, firstName, lastName, phone, email, role: oneOf(role, ['EMPLOYEE', 'LEAD']) ? role as 'EMPLOYEE' | 'LEAD' : null,
      primaryLocationCode: primary || null, eligibleLocationCodes: eligible, positionCodes: positions }, errors, warnings };
}
function groups(rows: EmployeeCsvRow[], key: (r: EmployeeCsvRow) => string | null, apply: (r: EmployeeCsvRow) => void) {
  const grouped = new Map<string, EmployeeCsvRow[]>(); for (const row of rows) { const k = key(row); if (k !== null) grouped.set(k, [...(grouped.get(k) ?? []), row]); }
  for (const values of grouped.values()) if (values.length > 1) values.forEach(apply);
}
/** Pure parser returns transient allowed mapped values, never excluded/restricted
 * cells. Authenticate before invoking it for an external response/download. */
export function parseEmployeeCsv(csv: string, mapping: EmployeeCsvMapping, limits: EmployeeCsvLimits = EMPLOYEE_CSV_LIMITS): ParsedEmployeeRows {
  try {
    if (typeof csv !== 'string' || !utf16(csv)) return empty([issue('INVALID_UTF8')]);
    if (Buffer.byteLength(csv, 'utf8') > EMPLOYEE_CSV_LIMITS.maxBytes) return empty([issue('BYTE_LIMIT')]);
    if (!data(limits) || !object(limits) || canonical(limits) !== canonical(EMPLOYEE_CSV_LIMITS)) return empty([issue('INVALID_LIMITS')]);
    if (!validMapping(mapping)) return empty([issue('INVALID_MAPPING')]);
    const source = matrix(csv.startsWith('\uFEFF') ? csv.slice(1) : csv); if (!Array.isArray(source)) return empty([source]);
    if (!source.length || source[0].blankLine) return empty([issue('HEADER_REQUIRED')]);
    const header = source[0].cells, issues: EmployeeCsvDiagnostic[] = [];
    const result: ParsedEmployeeRows = { ...empty([]), headers: header.map((name, column) => ({ column, name: restricted(name) ? '[restricted column]' : name,
      ambiguous: header.filter(h => h === name).length > 1 })), excludedColumns: [], issues };
    if (new Set(mapping.columns.map(c => c.column)).size !== mapping.columns.length || new Set(mapping.columns.filter(c => c.field !== null).map(c => c.field)).size !== mapping.columns.filter(c => c.field !== null).length
      || mapping.columns.some(c => c.column >= header.length)) issues.push(issue('INVALID_MAPPING'));
    for (let column = 0; column < header.length; column++) {
      const name = header[column], selected = mapping.columns.filter(m => m.column === column);
      if (!name.trim() || controls.test(name)) issues.push(issue('HEADER_INVALID', { column }));
      if (restricted(name)) issues.push(issue('FORBIDDEN_COLUMN', { column }));
      if (!selected.length) issues.push(issue('UNMAPPED_COLUMN', { column }));
      if (selected.some(m => m.header !== name)) issues.push(issue('HEADER_MAPPING_CHANGED', { column }));
      if (!restricted(name) && selected.length === 1 && selected[0].field === null) result.excludedColumns.push({ column, name });
    }
    if (required.some(field => !mapping.columns.some(m => m.field === field))) issues.push(issue('REQUIRED_MAPPING'));
    if (issues.length) return result;
    if (source.length === 1) issues.push(issue('NO_DATA_ROWS'));
    result.rows = source.slice(1).map(r => { const row = normalized(r, mapping); if (r.cells.length !== header.length) row.errors.unshift(issue('ROW_COLUMN_COUNT', { rowNumber: r.rowNumber, line: r.lineStart })); return row; });
    groups(result.rows, r => r.normalized.employeeNumber, r => r.errors.push(issue('FILE_NUMBER_DUPLICATE', { category: 'conflict', field: 'employeeNumber', rowNumber: r.rowNumber })));
    groups(result.rows, r => r.normalized.phone, r => r.warnings.push({ code: 'SHARED_PHONE', message: 'This phone is shared by multiple proposed rows. Review; no records will be merged.' }));
    groups(result.rows, r => r.normalized.firstName && r.normalized.lastName ? canonical([r.normalized.firstName, r.normalized.lastName]) : null,
      r => r.warnings.push({ code: 'SHARED_NAME', message: 'This name repeats in the proposed rows. Review; names do not establish identity.' }));
    result.normalizedRowsDigest = digest(result.rows.map(r => ({ rowNumber: r.rowNumber, normalized: r.normalized })));
    result.state = issues.length || result.rows.some(r => r.errors.length) ? 'invalid' : 'parsed'; return result;
  } catch { return empty([issue('INVALID_MAPPING')]); }
}

const bindingFields = ['workspaceId', 'workspaceCode', 'actorId', 'sourceVersion', 'catalogVersion', 'configurationVersion', 'namespaceVersion', 'schemaVersion', 'sessionVersion', 'grantsVersion', 'scopeVersion', 'incarnation'] as const;
const binding = (v: unknown) => object(v) && bindingFields.every(k => text(v[k])) && v.purpose === 'EMPLOYEE_IMPORT_PREVIEW'
  && normalizeWorkspaceLocator(v.workspaceCode) === v.workspaceCode;
const unavailable = (reason: 'INVALID_INPUT' | 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE'): EmployeeCsvPreviewOutcome => ({ state: 'unavailable', reason });
function envelope(v: unknown): EmployeeCsvPreviewSnapshot {
  if (!data(v) || !object(v) || !object(v.actor) || !object(v.current) || !object(v.record) || !binding(v.current) || !binding(v.record.binding)
    || !object(v.record.catalogs) || !array(v.record.catalogs.locations) || !array(v.record.catalogs.positions) || !object(v.record.namespace) || !array(v.record.namespace.numbers)) throw Error('Invalid envelope');
  const a = v.actor, c = v.current;
  if (!text(a.workspaceId) || !text(a.actorId) || !oneOf(a.role, ['OWNER', 'MANAGER', 'LEAD', 'EMPLOYEE']) || !oneOf(a.portalState, ['DISABLED', 'PROOF_PENDING', 'ENABLED', 'SUSPENDED'])
    || !array(a.permittedFields) || !a.permittedFields.every(text) || !['workspaceActive', 'workforceActive', 'membershipCurrent', 'sessionCurrent', 'grantsCurrent', 'previewAllowed', 'errorDownloadAllowed'].every(k => typeof a[k] === 'boolean')
    || !['complete', 'sourceCurrent'].every(k => typeof c[k] === 'boolean') || !(c.normalizedRowsDigest === null || sha(c.normalizedRowsDigest))
    || !['mappingDigest', 'catalogDigest', 'namespaceDigest', 'emailComparisonDigest'].every(k => sha(c[k]))
    || !['complete'].every(k => typeof (v.record as Record<string, unknown> & { catalogs: Record<string, unknown>; namespace: Record<string, unknown> }).catalogs[k] === 'boolean'
      && typeof (v.record as Record<string, unknown> & { namespace: Record<string, unknown> }).namespace[k] === 'boolean')) throw Error('Invalid current metadata');
  for (const value of [a.expiresAt, c.now, c.observedAt, c.expiresAt, c.previewCreatedAt, v.record.createdAt]) { if (!text(value)) throw Error('Invalid time'); Temporal.Instant.from(value); }
  return v as EmployeeCsvPreviewSnapshot;
}
function emailFacts(s: EmployeeCsvPreviewSnapshot, parsed: ParsedEmployeeRows): 'ACCESS_DENIED' | 'SOURCE_UNAVAILABLE' | null {
  const rows = parsed.rows.filter(r => r.normalized.email !== null && !r.errors.some(e => e.field === 'email')), observed = s.record.emailComparisons;
  if (!rows.length && observed === null) return null;
  if (!object(observed) || !binding(observed.binding) || !array(observed.rows) || typeof observed.complete !== 'boolean') return 'SOURCE_UNAVAILABLE';
  if (observed.binding.workspaceId !== s.actor.workspaceId || observed.binding.actorId !== s.actor.actorId) return 'ACCESS_DENIED';
  if (!observed.complete || canonical(observed.binding) !== canonical(s.record.binding) || observed.normalizedRowsDigest !== parsed.normalizedRowsDigest
    || observed.mode !== 'ACTUAL_DATABASE_COMPARISON' || observed.contractId !== 'employees.email_ci' || observed.expression !== 'lower(email)'
    || !text(observed.snapshotId) || !sha(observed.comparatorSourceDigest) || !sha(observed.collationDigest) || observed.rows.length !== rows.length
    || new Set(observed.rows.map(r => r.rowNumber)).size !== observed.rows.length) return 'SOURCE_UNAVAILABLE';
  const expressionClasses = new Map<string, string>(), exactInputs = new Map<string, string>(), classConflicts = new Map<string, boolean>();
  for (const value of observed.rows) {
    if (!object(value) || !integer(value.rowNumber, 2) || !text(value.inputEmail) || !text(value.expressionValue) || !text(value.comparisonClass) || typeof value.conflictsExisting !== 'boolean'
      || !rows.some(r => r.rowNumber === value.rowNumber && r.normalized.email === value.inputEmail)) return 'SOURCE_UNAVAILABLE';
    const previous = expressionClasses.get(value.expressionValue); if (previous !== undefined && previous !== value.comparisonClass) return 'SOURCE_UNAVAILABLE';
    const priorInput = exactInputs.get(value.inputEmail); if (priorInput !== undefined && priorInput !== canonical([value.expressionValue, value.comparisonClass])) return 'SOURCE_UNAVAILABLE';
    const priorConflict = classConflicts.get(value.comparisonClass); if (priorConflict !== undefined && priorConflict !== value.conflictsExisting) return 'SOURCE_UNAVAILABLE';
    expressionClasses.set(value.expressionValue, value.comparisonClass);
    exactInputs.set(value.inputEmail, canonical([value.expressionValue, value.comparisonClass])); classConflicts.set(value.comparisonClass, value.conflictsExisting);
  }
  return null;
}
function prepare(value: unknown, download = false): EmployeeCsvPreviewOutcome {
  const s = envelope(value), { actor: a, current: c, record: r } = s;
  if (a.role !== 'OWNER' || a.portalState !== 'ENABLED' || !a.workspaceActive || !a.workforceActive || !a.membershipCurrent || !a.sessionCurrent
    || !a.grantsCurrent || !a.previewAllowed || download && !a.errorDownloadAllowed || !requestedFields.every(f => a.permittedFields.includes(f))
    || Temporal.Instant.compare(a.expiresAt, c.now) <= 0) return unavailable('ACCESS_DENIED');
  if ([c, r.binding].some(b => b.workspaceId !== a.workspaceId || b.actorId !== a.actorId)) return unavailable('ACCESS_DENIED');
  if (!c.complete || !c.sourceCurrent || !r.catalogs.complete || !r.namespace.complete || Temporal.Instant.compare(c.observedAt, c.now) > 0
    || Temporal.Instant.compare(c.expiresAt, c.now) <= 0 || Temporal.Instant.compare(c.expiresAt, c.observedAt) <= 0) return unavailable('SOURCE_UNAVAILABLE');
  if (bindingFields.some(k => c[k] !== r.binding[k])) return { state: 'conflict', nextAction: 'REPREVIEW' };
  if (Temporal.Instant.compare(r.createdAt, c.now) > 0 || Temporal.Instant.compare(r.createdAt, c.previewCreatedAt) !== 0) return unavailable('INVALID_INPUT');
  const expiresAt = Temporal.Instant.from(r.createdAt).add({ minutes: 30 }).toString();
  if (Temporal.Instant.compare(expiresAt, c.now) <= 0) return { state: 'expired', nextAction: 'REPREVIEW' };
  const parsed = parseEmployeeCsv(r.csv, r.mapping, r.limits);
  // Invalid syntax/mapping has no normalized row set; it remains a complete
  // batch error with zero proposals, never a valid subset or a success receipt.
  if (digest(r.mapping) !== c.mappingDigest || digest(r.catalogs) !== c.catalogDigest || digest(r.namespace) !== c.namespaceDigest
    || digest(r.emailComparisons) !== c.emailComparisonDigest || parsed.normalizedRowsDigest !== c.normalizedRowsDigest) return unavailable('INVALID_INPUT');
  for (const entry of [...r.catalogs.locations, ...r.catalogs.positions]) {
    if (!object(entry) || !text(entry.id) || !text(entry.code) || !text(entry.workspaceId) || typeof entry.active !== 'boolean') throw Error('Invalid catalog');
    if (entry.workspaceId !== a.workspaceId) return unavailable('ACCESS_DENIED');
  }
  for (const entries of [r.catalogs.locations, r.catalogs.positions]) if (new Set(entries.map(e => e.id)).size !== entries.length) return unavailable('SOURCE_UNAVAILABLE');
  for (const n of r.namespace.numbers) {
    if (!object(n) || !text(n.workspaceId) || !text(n.employeeNumber) || !text(n.normalizedNumber) || !oneOf(n.workforceState, ['ACTIVE', 'INACTIVE'])) throw Error('Invalid namespace');
    if (n.workspaceId !== a.workspaceId) return unavailable('ACCESS_DENIED');
    if (normalizeEmployeeNumber(n.employeeNumber) !== n.normalizedNumber) return unavailable('SOURCE_UNAVAILABLE');
  }
  if (new Set(r.namespace.numbers.map(n => n.normalizedNumber)).size !== r.namespace.numbers.length) return unavailable('SOURCE_UNAVAILABLE');
  if (parsed.normalizedRowsDigest !== null) { const invalidEmail = emailFacts(s, parsed); if (invalidEmail) return unavailable(invalidEmail); }
  const previewRows: EmployeeCsvPreviewRow[] = parsed.rows.map(row => ({ ...row, status: 'proposed', draft: null }));
  const resolve = (code: string, kind: 'locations' | 'positions', row: EmployeeCsvPreviewRow, field: EmployeeCsvField) => {
    const matches = r.catalogs[kind].filter(entry => entry.code === code);
    if (matches.length !== 1 || !matches[0].active) { row.errors.push(issue(matches.length > 1 ? 'CATALOG_CODE_AMBIGUOUS' : 'CATALOG_CODE_UNAVAILABLE', { rowNumber: row.rowNumber, field })); return null; }
    return matches[0].id;
  };
  for (const row of previewRows) {
    const n = row.normalized;
    if (n.employeeNumber && r.namespace.numbers.some(existing => existing.normalizedNumber === n.employeeNumber)) row.errors.push(issue('EXISTING_NUMBER', { category: 'conflict', rowNumber: row.rowNumber, field: 'employeeNumber' }));
    const e = r.emailComparisons?.rows.find(e => e.rowNumber === row.rowNumber);
    if (e?.conflictsExisting) row.errors.push(issue('EXISTING_EMAIL', { category: 'conflict', rowNumber: row.rowNumber, field: 'email' }));
    if (e && r.emailComparisons!.rows.filter(other => other.comparisonClass === e.comparisonClass).length > 1) row.errors.push(issue('FILE_EMAIL_DUPLICATE', { category: 'conflict', rowNumber: row.rowNumber, field: 'email' }));
    const primary = n.primaryLocationCode ? resolve(n.primaryLocationCode, 'locations', row, 'primaryLocationCode') : null;
    const eligible = n.eligibleLocationCodes.map(code => resolve(code, 'locations', row, 'eligibleLocationCodes'));
    const positions = n.positionCodes.map(code => resolve(code, 'positions', row, 'positionCodes'));
    row.status = row.errors.some(e => e.category === 'invalid') ? 'invalid' : row.errors.length ? 'conflicting' : 'proposed';
    if (row.status === 'proposed' && n.employeeNumber && n.firstName && n.lastName && n.phone && n.role && primary && eligible.every(text) && positions.every(text)) {
      row.draft = { employeeNumber: n.employeeNumber, firstName: n.firstName, lastName: n.lastName, phone: n.phone, email: n.email, role: n.role,
        primaryLocationId: primary, eligibleLocationIds: [...new Set(eligible)].sort(order), positionIds: [...new Set(positions)].sort(order), workforceState: 'ACTIVE', portalState: 'DISABLED' };
    }
  }
  const summary = { newRecords: previewRows.filter(r => r.status === 'proposed').length, invalid: previewRows.filter(r => r.status === 'invalid').length, conflicting: previewRows.filter(r => r.status === 'conflicting').length };
  // Business identity survives reauthentication; a preview's execution
  // authority still binds the full current session/grant/scope separately.
  const businessBinding = { workspaceId: r.binding.workspaceId, workspaceCode: r.binding.workspaceCode, actorId: r.binding.actorId, purpose: r.binding.purpose,
    sourceVersion: r.binding.sourceVersion, catalogVersion: r.binding.catalogVersion, configurationVersion: r.binding.configurationVersion,
    namespaceVersion: r.binding.namespaceVersion, schemaVersion: r.binding.schemaVersion, incarnation: r.binding.incarnation };
  const payload = { contract: 'F9-CSV-1', binding: businessBinding, mapping: r.mapping, normalizedOrderedRows: previewRows.map(row => ({ rowNumber: row.rowNumber, draft: row.draft, normalized: row.normalized })) };
  const payloadDigest = digest(payload), previewDigest = digest({ payloadDigest, executionBinding: r.binding, createdAt: r.createdAt, expiresAt, sourceDigests: [c.catalogDigest, c.namespaceDigest, c.emailComparisonDigest] });
  const roleSummary = (['EMPLOYEE', 'LEAD'] as const).map(role => ({ role, count: previewRows.filter(row => row.draft?.role === role).length })).filter(r => r.count > 0);
  const locationSummary = [...new Set(previewRows.flatMap(row => row.draft?.eligibleLocationIds ?? []))].sort(order).map(locationId => ({ locationId,
    primaryCount: previewRows.filter(row => row.draft?.primaryLocationId === locationId).length,
    eligibleCount: previewRows.filter(row => row.draft?.eligibleLocationIds.includes(locationId)).length }));
  const invalid = parsed.state === 'invalid' || summary.invalid > 0 || summary.conflicting > 0;
  const result: PreviewData = { workspaceId: a.workspaceId, workspaceCode: c.workspaceCode,
    rows: previewRows, issues: parsed.issues, headers: parsed.headers, excludedColumns: parsed.excludedColumns, summary, roleSummary, locationSummary,
    createdAt: Temporal.Instant.from(r.createdAt).toString(), expiresAt, payloadDigest, previewDigest, batchMode: 'ATOMIC_CREATE_ONLY', commitAuthority: 'NOT_ISSUED' };
  return invalid ? { ...result, state: 'invalid', nextAction: 'CORRECT_AND_REPREVIEW' } : { ...result, state: 'ready', nextAction: 'REVIEW_ALL_RECORDS' };
}
export function prepareEmployeeCsvPreview(value: unknown): EmployeeCsvPreviewOutcome {
  try { return prepare(value); } catch { return unavailable('INVALID_INPUT'); }
}
const formulaSafe = (value: string) => /^[\s\p{Cc}\p{Cf}]*[=+\-@]/u.test(value) || /^[\p{Cc}\p{Cf}]/u.test(value) ? "'" + value : value;
/** Authorized transient spreadsheet cells only. The owning route must still
 * issue an authorized response and quote/escape CSV serialization correctly.
 * Excluded/restricted cells are never present and no raw error file is stored. */
export function prepareEmployeeCsvErrorDownload(value: unknown): EmployeeCsvErrorDownload {
  try {
    const p = prepare(value, true); if (p.state !== 'ready' && p.state !== 'invalid') return p;
    const rows = p.rows.filter(row => row.errors.length).map(row => [String(row.rowNumber), String(row.lineStart), ...fields.map(f => row.mapped[f] ?? ''), row.errors.map(e => e.code + ': ' + e.message).join('; ')].map(formulaSafe));
    for (const diagnostic of p.issues) rows.push([diagnostic.rowNumber === undefined ? '' : String(diagnostic.rowNumber), diagnostic.line === undefined ? '' : String(diagnostic.line), ...fields.map(() => ''), diagnostic.code + ': ' + diagnostic.message].map(formulaSafe));
    return { state: 'prepared', columns: ['CSV row', 'Source line', ...fields, 'Errors'], rows, transient: true, persistRawFile: false };
  } catch { return { state: 'unavailable', reason: 'INVALID_INPUT' }; }
}
