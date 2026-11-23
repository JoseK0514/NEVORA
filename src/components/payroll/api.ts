import type { PayrollReceipt, PayrollRunsResponse, PayrollSettingsResponse, PayrollStatementsResponse, PayrollImport, PayrollAmountLine, PayrollImportRow } from '@/lib/payroll/contracts';
import { OWNER_PROVISIONAL_POLICY_REFERENCE } from '@/lib/payroll/native/contracts';
import { acceptedDailyEvidence } from '@/lib/payroll/native/daily-attribution';
import type { PayrollLang } from './payroll-lang';
import { statusCopy } from './copy/status';

type ApiKey = keyof typeof statusCopy.en.api;
type Localize = (lang: PayrollLang) => string;

export class PayrollRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code = '', readonly localize?: Localize) { super(message); }
}
/** A payroll error whose words NEVORA wrote: `message` is the English, `localize` gives the person's language. */
export class PayrollTextError extends Error {
  constructor(message: string, readonly localize: Localize) { super(message); }
}
const words = (key: ApiKey): Localize => lang => statusCopy[lang].api[key];
const fail = (key: ApiKey) => new PayrollTextError(statusCopy.en.api[key], words(key));
/** The words to show for a failure in the person's language: NEVORA's own sentence when it wrote one, else the
 * server's message as it came, else the fallback (a dropped connection's TypeError never shows). */
export function payrollErrorText(failure: unknown, lang: PayrollLang, fallback: string) {
  if (failure instanceof PayrollRequestError || failure instanceof PayrollTextError) return failure.localize ? failure.localize(lang) : failure.message;
  return failure instanceof Error && !(failure instanceof TypeError) ? failure.message : fallback;
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function envelope(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value) || value.version !== 'PAYROLL_API_V1') throw fail('unreadable');
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function capabilities(value: unknown) {
  if (!record(value) || !['enabled', 'canConfigure', 'canReview', 'canApprove', 'internalCalculatorAvailable'].every(key => typeof value[key] === 'boolean') || value.bankCompatibility !== 'UNVERIFIED') throw fail('accessUnreadable');
  if (value.noticeDelivery !== undefined && value.noticeDelivery !== 'ENABLED' && value.noticeDelivery !== 'DISABLED') throw fail('noticeUnreadable');
}
export function readSettings(value: unknown): PayrollSettingsResponse {
  envelope(value); capabilities(value.capabilities);
  if (!['revisions', 'exceptions', 'grants', 'employees', 'futureDraftImpact'].every(key => Array.isArray(value[key]))) throw fail('settingsIncomplete');
  return value as PayrollSettingsResponse;
}
export function readRuns(value: unknown): PayrollRunsResponse {
  envelope(value); capabilities(value.capabilities);
  if (!Array.isArray(value.runs) || !Array.isArray(value.jobs)) throw fail('reviewIncomplete');
  if (!value.runs.every(validRun)) throw fail('revisionUnreadable');
  if (value.missingPeriods !== undefined && (!Array.isArray(value.missingPeriods) || value.missingPeriods.some(item => !record(item) || !record(item.period) || !validDate(item.period.startDate) || !validDate(item.period.endDate) || !validDate(item.payday) || !Number.isInteger(item.settingsRevision) || Number(item.settingsRevision) < 1 || (item.state !== 'MISSING' && item.state !== 'AMBIGUOUS_TRANSITION') || !Array.isArray(item.issues) || item.issues.some(issue => typeof issue !== 'string')))) throw fail('missingUnreadable');
  if (value.backlog !== undefined) {
    const backlog = value.backlog;
    if (!record(backlog) || !validDate(backlog.asOfDate) || !validDate(backlog.rangeEnd) || (backlog.rangeStart !== null && !validDate(backlog.rangeStart)) || typeof backlog.overflow !== 'boolean' || !Number.isInteger(backlog.returnedCount) || Number(backlog.returnedCount) < 0 || ['missingCount', 'remainingCount', 'ambiguousCount'].some(key => backlog[key] !== null && (!Number.isInteger(backlog[key]) || Number(backlog[key]) < 0))) throw fail('historyUnreadable');
  }
  return withReadFacts(value as PayrollRunsResponse);
}

const signedMinor = (value: unknown) => typeof value === 'string' && /^-?(0|[1-9]\d*)$/.test(value) && value !== '-0';
const unsignedMinor = (value: unknown) => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
const zoneOk = (value: unknown) => { if (typeof value !== 'string' || !value || value.length > 100) return false; try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; } };
/** Backend (Nov 15, 2026): `currentPeriod` and each correction's `correctionDelta` are optional facts. A malformed one is
 * dropped, so the page falls back to what it showed before rather than showing an amount or a period it can't trust. */
function withReadFacts(value: PayrollRunsResponse): PayrollRunsResponse {
  const current = value.currentPeriod;
  const currentOk = current === undefined || current === null || (record(current) && validPeriod(current.period) && validDate(current.payday) && validDate(current.asOfDate)
    && zoneOk(current.timeZone) && Number.isInteger(current.settingsRevision) && current.settingsRevision >= 1);
  const runs = value.runs.map(run => {
    const delta = run.correctionDelta;
    if (delta === undefined || delta === null) return run;
    const ok = record(delta) && signedMinor(delta.totalNetMinor) && Array.isArray(delta.employees) && delta.employees.every(row => record(row) && typeof row.employeeId === 'string' && !!row.employeeId
      && unsignedMinor(row.previousNetMinor) && unsignedMinor(row.netMinor) && signedMinor(row.deltaNetMinor));
    if (ok) return run;
    const { correctionDelta: _dropped, ...rest } = run;
    return rest as typeof run;
  });
  const { currentPeriod: _current, ...base } = value;
  return { ...base, ...(currentOk ? (current === undefined ? {} : { currentPeriod: current }) : {}), runs };
}
export function readStatements(value: unknown): PayrollStatementsResponse {
  envelope(value);
  if (!Array.isArray(value.statements) || !value.statements.every(item => validStatement(item) && item.published === true)) throw fail('statementsIncomplete');
  return value as PayrollStatementsResponse;
}
export type PayrollPortalStatementsResponse = { version: 'PAYROLL_PORTAL_STATEMENTS_V1'; statements: PayrollStatementsResponse['statements'] };
export function readPortalStatements(value: unknown): PayrollPortalStatementsResponse {
  if (!record(value) || value.version !== 'PAYROLL_PORTAL_STATEMENTS_V1' || !Array.isArray(value.statements) || !value.statements.every(validStatement)) throw fail('privateUnreadable');
  return value as PayrollPortalStatementsResponse;
}
export function readReceipt(value: unknown): PayrollReceipt | null {
  if (!record(value) || !('receipt' in value) || (value.receipt !== null && (!record(value.receipt) || typeof value.receipt.operationId !== 'string' || typeof value.receipt.action !== 'string'))) throw fail('receiptUnreadable');
  return value.receipt as PayrollReceipt | null;
}
export async function payrollRequest(path: string, command?: object): Promise<unknown> {
  const response = await fetch(path, {
    method: command ? 'POST' : 'GET', cache: 'no-store', credentials: 'same-origin',
    headers: command ? { 'Content-Type': 'application/json', 'x-nevora-payroll': '1' } : { 'x-nevora-payroll': '1' },
    body: command ? JSON.stringify(command) : undefined,
  });
  let value: unknown;
  try { value = await response.json(); }
  catch {
    if (!response.ok) throw new PayrollRequestError(statusCopy.en.api.requestReload, response.status, '', words('requestReload'));
    throw fail('interrupted');
  }
  if (!response.ok) {
    const code = record(value) && typeof value.error === 'string' ? value.error : '';
    const known = (['SOURCE_CONFLICT', 'NATIVE_REVIEW_STALE', 'REVISION_CONFLICT', 'REVIEW_CONFLICT', 'FINALIZED_TIME_REQUIRED', 'SETTINGS_REQUIRED'] as const).find(item => item === code);
    const server = record(value) && typeof value.message === 'string' ? value.message : null;
    const issues = record(value) && Array.isArray(value.issues) ? value.issues.filter(record).filter(issue => typeof issue.path === 'string' && typeof issue.message === 'string').map(issue => `${issue.path}: ${issue.message}`).join(' ') : '';
    // NEVORA's own sentence for a known code, else the server's words as they came, else the generic one.
    const text = (lang: PayrollLang) => `${known ? statusCopy[lang].api[known] : server ?? statusCopy[lang].api.requestFailed}${issues ? ` ${issues}` : ''}`;
    throw new PayrollRequestError(text('en'), response.status, code, text);
  }
  return value;
}
function minor(value: unknown): value is string { return typeof value === 'string' && /^(0|[1-9]\d{0,14})$/.test(value); }
function lines(value: unknown): value is PayrollAmountLine[] {
  return Array.isArray(value) && value.length <= 100 && value.every(line => record(line) && typeof line.code === 'string' && !!line.code.trim() && typeof line.label === 'string' && !!line.label.trim() && minor(line.amountMinor));
}
function rows(value: unknown): value is PayrollImportRow[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 300 && value.every(row => record(row) && typeof row.employeeId === 'string' && !!row.employeeId && minor(row.grossMinor) && minor(row.netMinor) && lines(row.employeeDeductions) && lines(row.employerContributions) && (row.earnings === undefined || lines(row.earnings)));
}
const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const unsigned = (value: unknown): value is string => typeof value === 'string' && /^(0|[1-9]\d*)$/.test(value);
function validPeriod(value: unknown) { return record(value) && validDate(value.startDate) && validDate(value.endDate) && value.startDate <= value.endDate; }
function validDocument(value: unknown): value is PayrollStatementsResponse['statements'][number] {
  if (!record(value) || typeof value.id !== 'string' || !value.id || !['EMPLOYEE_STATEMENT', 'COMPANY_SUMMARY', 'PAYMENT_INSTRUCTIONS'].includes(String(value.kind)) || typeof value.filename !== 'string' || !value.filename || typeof value.published !== 'boolean') return false;
  const path = `/api/payroll/documents/${encodeURIComponent(value.id)}`;
  return value.downloadUrl === path && (value.viewUrl === undefined || value.viewUrl === `${path}/view`);
}
const link = (value: unknown) => value === undefined || value === null || (typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value));
function validStatement(value: unknown): value is PayrollStatementsResponse['statements'][number] {
  return validDocument(value) && value.kind === 'EMPLOYEE_STATEMENT' && typeof value.employeeId === 'string' && validPeriod(value.period) && validDate(value.payday)
    && link((value as Record<string, unknown>).corrects) && link((value as Record<string, unknown>).correctedBy) && (value as Record<string, unknown>).corrects !== value.id;
}
function validYtd(value: unknown) {
  return record(value) && Number.isInteger(value.year) && ['grossMinor', 'netMinor', 'socialSecurityWagesMinor', 'medicareWagesMinor', 'sinotWagesMinor'].every(key => minor(value[key])) && ['deductions', 'employerContributions', 'employerWagesMinor'].every(key => record(value[key]) && Object.values(value[key]).every(minor));
}
function validNativeEmployee(value: unknown) {
  if (!record(value) || value.state !== 'ready' || value.schema !== 'NEVORA_NATIVE_PAYROLL_RESULT_V1' || value.sourceAuthority !== 'NATIVE_RECORDED_TIME' || typeof value.employeeId !== 'string' || !rows([value.row]) || !record(value.breakdown) || !record(value.provenance)) return false;
  const b = value.breakdown, p = value.provenance;
  return ['regularNanoseconds', 'overtimeNanoseconds', 'unpaidBreakNanoseconds'].every(key => unsigned(b[key])) && validYtd(b.ytdBefore) && validYtd(b.ytdAfter) && strings(b.locationIds) &&
    Array.isArray(b.earnings) && b.earnings.every(line => record(line) && ['REGULAR', 'OVERTIME', 'FLSA_TRUE_UP'].includes(String(line.kind)) && typeof line.locationId === 'string' && typeof line.rateMinorPerHour === 'string' && /^(0|[1-9]\d{0,8})(\.[0-9]{1,4})?$/.test(line.rateMinorPerHour) && unsigned(line.nanoseconds) && minor(line.amountMinor)) &&
    Array.isArray(b.taxes) && b.taxes.every(line => record(line) && typeof line.code === 'string' && minor(line.amountMinor) && minor(line.taxableMinor)) &&
    ['inputSha256', 'rulesSha256', 'rulesetId', 'rounding', 'taxRounding'].every(key => typeof p[key] === 'string') && Array.isArray(p.exactnessOperations) && validNativeEvidence(p);
}
function validNativeEvidence(p: Record<string, unknown>) {
  const rational = (value: unknown, signed = false) => record(value) && typeof value.numerator === 'string' && (signed ? /^-?(0|[1-9]\d*)$/ : /^(0|[1-9]\d*)$/).test(value.numerator) && typeof value.denominator === 'string' && /^[1-9]\d*$/.test(value.denominator);
  const ownerPolicy = p.calculationPolicy !== undefined;
  if (ownerPolicy) {
    const policy = p.calculationPolicy;
    if (!record(policy) || policy.id !== OWNER_PROVISIONAL_POLICY_REFERENCE || policy.kind !== 'OWNER_AUTHORIZED_PROVISIONAL_POLICY' || typeof policy.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(policy.sha256) ||
        p.rounding !== 'OWNER_PROVISIONAL_PAYCHECK_ALLOCATION' || p.taxRounding !== 'HALF_UP' || p.boundaryEvidence === undefined ||
        !Array.isArray(policy.operations) || !policy.operations.length || policy.operations.length > 20000 || !policy.operations.every(o => record(o) && typeof o.operation === 'string' && /^[A-Z][A-Z_]+$/.test(o.operation) && (o.reference === null || typeof o.reference === 'string') && ['HALF_UP', 'LARGEST_REMAINDER_ALLOCATION', 'COMBINED_SHARE_RESIDUAL', 'CAP_THEN_HALF_UP'].includes(String(o.stage)) && rational(o.exactAmount) && minor(o.amountMinor) && rational(o.differenceMinor, true) && (o.uncappedExactAmount === undefined || rational(o.uncappedExactAmount)))) return false;
  } else if (p.rounding === 'OWNER_PROVISIONAL_PAYCHECK_ALLOCATION') return false;
  if (p.federalEmployeeTax !== undefined) {
    const f = p.federalEmployeeTax;
    if (!record(f) || f.version !== 'NATIVE_FEDERAL_EMPLOYEE_COLLECTION_V1' || f.ruleId !== '26_CFR_31_3102_1_D' || !Array.isArray(f.operations) || f.operations.length > 3 || new Set(f.operations.map(t => record(t) ? t.code : null)).size !== f.operations.length || !f.operations.every(t => record(t) && ['SOCIAL_SECURITY', 'MEDICARE', 'ADDITIONAL_MEDICARE'].includes(String(t.code)) && minor(t.taxableMinor) && minor(t.collectedMinor) && Number.isInteger(t.basisPoints) && Number(t.basisPoints) >= 0 && Number(t.basisPoints) <= 10000 && rational(t.exactAmount) && rational(t.roundingDifference, true) && t.ruleId === f.ruleId)) return false;
  }
  if (p.boundaryEvidence !== undefined) {
    const e = p.boundaryEvidence;
    const window = (v: unknown) => record(v) && typeof v.startAt === 'string' && typeof v.endAt === 'string' && Number.isFinite(Date.parse(v.startAt)) && Number.isFinite(Date.parse(v.endAt)) && Date.parse(v.startAt) < Date.parse(v.endAt);
    // Shift start day for new results; saved results keep the daily model and policy record they were calculated with.
    if (!record(e) || e.version !== 'NATIVE_BOUNDARY_EVIDENCE_V1' || !acceptedDailyEvidence(e, ownerPolicy && record(p.calculationPolicy) ? String(p.calculationPolicy.sha256) : null) ||
        !window(e.sourceWindow) || !window(e.fullWeekWindow) || typeof e.workweekPolicySha256 !== 'string' || !/^[a-f0-9]{64}$/.test(e.workweekPolicySha256) || typeof e.sourceSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(e.sourceSha256) || !record(e.workweekPolicy)) return false;
    const w = e.workweekPolicy;
    if (w.version !== 'PR_WORKWEEK_POLICY_V1' || typeof w.id !== 'string' || !Number.isInteger(w.revision) || Number(w.revision) < 1 || typeof w.federalEvidenceReference !== 'string' || w.federalWorkweek !== 'SAME_VERIFIED_BOUNDARY' || !record(w.origin) || !['STATUTORY_DEFAULT', 'EMPLOYER_NOTICE'].includes(String(w.origin.kind)) || !record(w.boundary) || !Number.isInteger(w.boundary.weekday) || Number(w.boundary.weekday) < 1 || Number(w.boundary.weekday) > 7 || typeof w.boundary.startTime !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(w.boundary.startTime) || w.boundary.timeZone !== 'America/Puerto_Rico') return false;
  }
  return true;
}
function validRun(value: unknown) {
  if (!record(value) || typeof value.id !== 'string' || !Number.isInteger(value.revision) || Number(value.revision) < 1 || !validPeriod(value.period) || !validDate(value.payday) || !['WAITING_FOR_AMOUNTS', 'BLOCKED', 'REVIEW_REQUIRED', 'APPROVED'].includes(String(value.status)) || !['PROVIDER_IMPORT', 'NATIVE_RECORDED_TIME'].includes(String(value.sourceAuthority)) || !strings(value.exceptions) || !Array.isArray(value.documents) || !value.documents.every(validDocument) || !Array.isArray(value.exceptionRevisions)) return false;
  const employeeRows = value.rows, totals = value.totals;
  if (employeeRows !== null && (!Array.isArray(employeeRows) || !employeeRows.every(row => record(row) && typeof row.employeeName === 'string') || !rows(employeeRows))) return false;
  if (totals !== null && (!record(totals) || !['grossMinor', 'netMinor', 'deductionsMinor', 'employerContributionsMinor'].every(key => minor(totals[key])) || !Number.isInteger(totals.employeeCount))) return false;
  if (value.reviewToken !== null && typeof value.reviewToken !== 'string') return false;
  if (value.sourceAuthority !== 'NATIVE_RECORDED_TIME') return value.status !== 'BLOCKED';
  const native = value.nativeCalculation;
  if (!record(native) || native.version !== 'NATIVE_RUN_V1' || !['NEVORA_NATIVE_PAYSTUB_PDF_V1', 'NEVORA_NATIVE_PAYSTUB_PDF_V2', 'NEVORA_NATIVE_PAYSTUB_PDF_V3'].includes(native.templateVersion as string) || !Array.isArray(native.employees)) return false;
  if (value.status === 'BLOCKED') return native.state === 'blocked' && native.employees.length === 0 && value.rows === null && value.totals === null && value.reviewToken === null && value.exceptions.length > 0;
  return native.state === 'ready' && native.employees.every(validNativeEmployee) && value.rows !== null && value.totals !== null && typeof value.reviewToken === 'string' && record(value.coverage) && value.coverage.complete === true && strings(value.coverage.locationIds);
}
export function parsePayrollImport(text: string): PayrollImport {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw fail('importJson'); }
  if (!record(value) || value.schema !== 'NEVORA_PAYROLL_IMPORT_V1' || value.currency !== 'USD' || typeof value.sourceName !== 'string' || !value.sourceName.trim() || typeof value.sourceReference !== 'string' || !value.sourceReference.trim() || !record(value.period) || typeof value.period.startDate !== 'string' || typeof value.period.endDate !== 'string' || typeof value.payday !== 'string' || !rows(value.rows)) throw fail('importShape');
  if (![value.period.startDate, value.period.endDate, value.payday].every(validDate)) throw fail('importDates');
  if (value.period.startDate > value.period.endDate || (Date.parse(value.period.endDate) - Date.parse(value.period.startDate)) / 86400000 > 30 || value.payday < value.period.endDate) throw fail('importPeriod');
  if (new Set(value.rows.map(row => row.employeeId)).size !== value.rows.length) throw fail('importOnce');
  return value as PayrollImport;
}
