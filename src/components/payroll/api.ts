import type { PayrollReceipt, PayrollRunsResponse, PayrollSettingsResponse, PayrollStatementsResponse, PayrollImport, PayrollAmountLine, PayrollImportRow } from '@/lib/payroll/contracts';

export class PayrollRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}
export function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function envelope(value: unknown): asserts value is Record<string, unknown> {
  if (!record(value) || value.version !== 'PAYROLL_API_V1') throw new Error('The payroll response could not be read. Refresh to try again.');
}
function capabilities(value: unknown) {
  if (!record(value) || !['enabled', 'canConfigure', 'canReview', 'canApprove'].every(key => typeof value[key] === 'boolean') || value.internalCalculatorAvailable !== false || value.bankCompatibility !== 'UNVERIFIED') throw new Error('The payroll access response could not be read.');
}
export function readSettings(value: unknown): PayrollSettingsResponse {
  envelope(value); capabilities(value.capabilities);
  if (!['revisions', 'exceptions', 'grants', 'employees', 'futureDraftImpact'].every(key => Array.isArray(value[key]))) throw new Error('The payroll settings response is incomplete.');
  return value as PayrollSettingsResponse;
}
export function readRuns(value: unknown): PayrollRunsResponse {
  envelope(value); capabilities(value.capabilities);
  if (!Array.isArray(value.runs) || !Array.isArray(value.jobs)) throw new Error('The payroll review response is incomplete.');
  return value as PayrollRunsResponse;
}
export function readStatements(value: unknown): PayrollStatementsResponse {
  envelope(value);
  if (!Array.isArray(value.statements)) throw new Error('The pay statement response is incomplete.');
  return value as PayrollStatementsResponse;
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
      SOURCE_CONFLICT: 'Payroll inputs changed. Import the provider amounts again and review the new revision before approving.',
      REVIEW_CONFLICT: 'This payroll review changed. Refresh and review the current revision before approving.',
      FINALIZED_TIME_REQUIRED: 'Finalize the included employee timecards before approving payroll.',
      SETTINGS_REQUIRED: 'Save company payroll settings before preparing this payroll run.',
    };
    const message = messages[code] ?? (record(value) && typeof value.message === 'string' ? value.message : 'Payroll could not complete this request.');
    const issues = record(value) && Array.isArray(value.issues) ? value.issues.filter(record).filter(issue => typeof issue.path === 'string' && typeof issue.message === 'string').map(issue => `${issue.path}: ${issue.message}`).join(' ') : '';
    throw new PayrollRequestError(`${message}${issues ? ` ${issues}` : ''}`, response.status);
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
export function parsePayrollImport(text: string): PayrollImport {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error('Choose a valid JSON payroll import.'); }
  if (!record(value) || value.schema !== 'NEVORA_PAYROLL_IMPORT_V1' || value.currency !== 'USD' || typeof value.sourceName !== 'string' || !value.sourceName.trim() || typeof value.sourceReference !== 'string' || !value.sourceReference.trim() || !record(value.period) || typeof value.period.startDate !== 'string' || typeof value.period.endDate !== 'string' || typeof value.payday !== 'string' || !rows(value.rows)) throw new Error('Use NEVORA_PAYROLL_IMPORT_V1 with USD, a source reference, dates and complete employee amounts. Amounts must be nonnegative whole cents as strings.');
  if (![value.period.startDate, value.period.endDate, value.payday].every(date => /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date)) throw new Error('Import dates must be valid dates in YYYY-MM-DD format.');
  if (value.period.startDate > value.period.endDate || (Date.parse(value.period.endDate) - Date.parse(value.period.startDate)) / 86400000 > 30 || value.payday < value.period.endDate) throw new Error('Choose a period of 1 to 31 days and a payday on or after the period ends.');
  if (new Set(value.rows.map(row => row.employeeId)).size !== value.rows.length) throw new Error('Each employee must appear once in the import.');
  return value as PayrollImport;
}
