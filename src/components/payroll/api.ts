import type { PayrollReceipt, PayrollRunsResponse, PayrollSettingsResponse, PayrollStatementsResponse, PayrollImport, PayrollAmountLine, PayrollImportRow } from '@/lib/payroll/contracts';
import { OWNER_PROVISIONAL_POLICY_REFERENCE } from '@/lib/payroll/native/contracts';

export class PayrollRequestError extends Error {
  constructor(message: string, readonly status: number, readonly code = '') { super(message); }
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function envelope(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value) || value.version !== 'PAYROLL_API_V1') throw new Error('The payroll response could not be read. Refresh to try again.');
}
function validDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
function capabilities(value: unknown) {
  if (!record(value) || !['enabled', 'canConfigure', 'canReview', 'canApprove', 'internalCalculatorAvailable'].every(key => typeof value[key] === 'boolean') || value.bankCompatibility !== 'UNVERIFIED') throw new Error('The payroll access response could not be read.');
  if (value.noticeDelivery !== undefined && value.noticeDelivery !== 'ENABLED' && value.noticeDelivery !== 'DISABLED') throw new Error('The payroll notice readiness response could not be read.');
}
export function readSettings(value: unknown): PayrollSettingsResponse {
  envelope(value); capabilities(value.capabilities);
  if (!['revisions', 'exceptions', 'grants', 'employees', 'futureDraftImpact'].every(key => Array.isArray(value[key]))) throw new Error('The payroll settings response is incomplete.');
  return value as PayrollSettingsResponse;
}
export function readRuns(value: unknown): PayrollRunsResponse {
  envelope(value); capabilities(value.capabilities);
  if (!Array.isArray(value.runs) || !Array.isArray(value.jobs)) throw new Error('The payroll review response is incomplete.');
  if (!value.runs.every(validRun)) throw new Error('The payroll revision could not be read. Refresh before reviewing any amounts.');
  if (value.missingPeriods !== undefined && (!Array.isArray(value.missingPeriods) || value.missingPeriods.some(item => !record(item) || !record(item.period) || !validDate(item.period.startDate) || !validDate(item.period.endDate) || !validDate(item.payday) || !Number.isInteger(item.settingsRevision) || Number(item.settingsRevision) < 1 || (item.state !== 'MISSING' && item.state !== 'AMBIGUOUS_TRANSITION') || !Array.isArray(item.issues) || item.issues.some(issue => typeof issue !== 'string')))) throw new Error('The missing-period review response could not be read.');
  if (value.backlog !== undefined) {
    const backlog = value.backlog;
    if (!record(backlog) || !validDate(backlog.asOfDate) || !validDate(backlog.rangeEnd) || (backlog.rangeStart !== null && !validDate(backlog.rangeStart)) || typeof backlog.overflow !== 'boolean' || !Number.isInteger(backlog.returnedCount) || Number(backlog.returnedCount) < 0 || ['missingCount', 'remainingCount', 'ambiguousCount'].some(key => backlog[key] !== null && (!Number.isInteger(backlog[key]) || Number(backlog[key]) < 0))) throw new Error('The payroll history summary could not be read.');
  }
  return value as PayrollRunsResponse;
}
export function readStatements(value: unknown): PayrollStatementsResponse {
  envelope(value);
  if (!Array.isArray(value.statements) || !value.statements.every(item => validStatement(item) && item.published === true)) throw new Error('The pay statement response is incomplete.');
  return value as PayrollStatementsResponse;
}
export type PayrollPortalStatementsResponse = { version: 'PAYROLL_PORTAL_STATEMENTS_V1'; statements: PayrollStatementsResponse['statements'] };
export function readPortalStatements(value: unknown): PayrollPortalStatementsResponse {
  if (!record(value) || value.version !== 'PAYROLL_PORTAL_STATEMENTS_V1' || !Array.isArray(value.statements) || !value.statements.every(validStatement)) throw new Error('The private statement history could not be read. Refresh your current access.');
  return value as PayrollPortalStatementsResponse;
}
export function readReceipt(value: unknown): PayrollReceipt | null {
  if (!record(value) || !('receipt' in value) || (value.receipt !== null && (!record(value.receipt) || typeof value.receipt.operationId !== 'string' || typeof value.receipt.action !== 'string'))) throw new Error('The action receipt could not be read. Check its reference before trying again.');
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
    if (!response.ok) throw new PayrollRequestError('Payroll could not complete this request. Reload current access and try again.', response.status);
    throw new Error('The payroll response was interrupted. Check its action reference before trying again.');
  }
  if (!response.ok) {
    const code = record(value) && typeof value.error === 'string' ? value.error : '';
    const messages: Record<string, string> = {
      SOURCE_CONFLICT: 'Payroll inputs changed. Refresh this run and prepare a new review from its current source before approving.',
      NATIVE_REVIEW_STALE: 'Recorded time or payroll facts changed. Refresh, recalculate this draft and review the new revision before approving.',
      REVISION_CONFLICT: 'This revision changed. Refresh and review the current payroll before continuing.',
      REVIEW_CONFLICT: 'This payroll review changed. Refresh and review the current revision before approving.',
      FINALIZED_TIME_REQUIRED: 'Finalize the included employee timecards before approving payroll.',
      SETTINGS_REQUIRED: 'Save company payroll settings before preparing this payroll run.',
    };
    const message = messages[code] ?? (record(value) && typeof value.message === 'string' ? value.message : 'Payroll could not complete this request.');
    const issues = record(value) && Array.isArray(value.issues) ? value.issues.filter(record).filter(issue => typeof issue.path === 'string' && typeof issue.message === 'string').map(issue => `${issue.path}: ${issue.message}`).join(' ') : '';
    throw new PayrollRequestError(`${message}${issues ? ` ${issues}` : ''}`, response.status, code);
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
    if (!record(e) || e.version !== 'NATIVE_BOUNDARY_EVIDENCE_V1' || !Array.isArray(e.dailyModels) ||
        (ownerPolicy ? e.dailyInterpretation !== 'OWNER_AUTHORIZED_CIVIL_MIDNIGHT_24H' || e.dailyInputDisposition !== 'OWNER_POLICY_APPLIED_ALL_INSTANTS' || e.dailyModels.join(',') !== 'CIVIL_MIDNIGHT_24H' : e.dailyInterpretation !== 'UNRESOLVED' || e.dailyInputDisposition !== 'INVARIANT_NO_FIRST_MINUTE_ENTRIES' || e.dailyModels.join(',') !== 'CIVIL_MIDNIGHT_24H,CIVIL_00_01_24H') ||
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
  if (!record(native) || native.version !== 'NATIVE_RUN_V1' || native.templateVersion !== 'NEVORA_NATIVE_PAYSTUB_PDF_V1' || !Array.isArray(native.employees)) return false;
  if (value.status === 'BLOCKED') return native.state === 'blocked' && native.employees.length === 0 && value.rows === null && value.totals === null && value.reviewToken === null && value.exceptions.length > 0;
  return native.state === 'ready' && native.employees.every(validNativeEmployee) && value.rows !== null && value.totals !== null && typeof value.reviewToken === 'string' && record(value.coverage) && value.coverage.complete === true && strings(value.coverage.locationIds);
}
export function parsePayrollImport(text: string): PayrollImport {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Choose a valid JSON payroll import.'); }
  if (!record(value) || value.schema !== 'NEVORA_PAYROLL_IMPORT_V1' || value.currency !== 'USD' || typeof value.sourceName !== 'string' || !value.sourceName.trim() || typeof value.sourceReference !== 'string' || !value.sourceReference.trim() || !record(value.period) || typeof value.period.startDate !== 'string' || typeof value.period.endDate !== 'string' || typeof value.payday !== 'string' || !rows(value.rows)) throw new Error('Use NEVORA_PAYROLL_IMPORT_V1 with USD, a source reference, dates and complete employee amounts. Amounts must be nonnegative whole cents as strings.');
  if (![value.period.startDate, value.period.endDate, value.payday].every(validDate)) throw new Error('Import dates must be valid dates in YYYY-MM-DD format.');
  if (value.period.startDate > value.period.endDate || (Date.parse(value.period.endDate) - Date.parse(value.period.startDate)) / 86400000 > 30 || value.payday < value.period.endDate) throw new Error('Choose a period of 1 to 31 days and a payday on or after the period ends.');
  if (new Set(value.rows.map(row => row.employeeId)).size !== value.rows.length) throw new Error('Each employee must appear once in the import.');
  return value as PayrollImport;
}
