import { describe, expect, it } from 'vitest';
import { parsePayrollImport, readRuns, readSettings, readStatements, readReceipt, readPortalStatements } from './api';
import { nativeCapabilities, nativeRun, statement } from './native-ui-fixture.test-support';

const amounts = {
  schema: 'NEVORA_PAYROLL_IMPORT_V1', currency: 'USD', sourceName: 'Fictional Accountant', sourceReference: 'QA-1',
  period: { startDate: '2026-09-21', endDate: '2026-09-27' }, payday: '2026-09-29',
  rows: [{ employeeId: 'fictional-a', grossMinor: '900719925474099', netMinor: '900719925474098', employeeDeductions: [{ code: 'QA', label: 'Fictional deduction', amountMinor: '1' }], employerContributions: [] }],
};
describe('payroll UI contract boundary', () => {
  it('preserves all imported amounts without client payroll calculations', () => {
    expect(parsePayrollImport(JSON.stringify(amounts))).toEqual(amounts);
  });
  it('rejects duplicate employees and numeric or noncanonical money', () => {
    expect(() => parsePayrollImport(JSON.stringify({ ...amounts, rows: [...amounts.rows, ...amounts.rows] }))).toThrow('once');
    for (const grossMinor of [100, '01', '-1', '1.00', '1e3']) expect(() => parsePayrollImport(JSON.stringify({ ...amounts, rows: [{ ...amounts.rows[0], grossMinor }] }))).toThrow();
  });
  it('requires both employee and employer line classifications', () => {
    expect(() => parsePayrollImport(JSON.stringify({ ...amounts, rows: [{ ...amounts.rows[0], employerContributions: undefined }] }))).toThrow();
    expect(() => parsePayrollImport(JSON.stringify({ ...amounts, currency: 'EUR' }))).toThrow();
  });
  it('rejects incomplete or foreign-version envelopes', () => {
    for (const decode of [readRuns, readSettings, readStatements]) expect(() => decode({ version: 'PAYROLL_API_V0' })).toThrow();
    expect(() => readStatements({ version: 'PAYROLL_API_V1' })).toThrow();
  });
  it('distinguishes an absent authorized receipt from malformed data', () => {
    expect(readReceipt({ receipt: null })).toBeNull();
    expect(readReceipt({ receipt: { operationId: 'fictional-id', action: 'PREPARE' } })).toEqual({ operationId: 'fictional-id', action: 'PREPARE' });
    expect(() => readReceipt({})).toThrow();
  });
  it('preserves unknown backlog counts and rejects malformed additive history or readiness', () => {
    const capabilities = { enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: false, bankCompatibility: 'UNVERIFIED', noticeDelivery: 'DISABLED' };
    const backlog = { asOfDate: '2026-10-12', rangeStart: null, rangeEnd: '2026-10-12', missingCount: null, remainingCount: null, returnedCount: 0, ambiguousCount: null, overflow: true };
    const envelope = { version: 'PAYROLL_API_V1', capabilities, runs: [], jobs: [], missingPeriods: [], backlog };
    expect(readRuns(envelope).backlog?.missingCount).toBeNull();
    expect(() => readRuns({ ...envelope, backlog: { ...backlog, missingCount: '0' } })).toThrow();
    expect(() => readRuns({ ...envelope, capabilities: { ...capabilities, noticeDelivery: 'DELIVERED' } })).toThrow();
    expect(() => readRuns({ ...envelope, missingPeriods: [{ period: amounts.period, payday: amounts.payday, settingsRevision: 1, state: ['MISSING'], issues: [] }] })).toThrow();
  });
});

describe('native payroll browser contract', () => {
  const response = (run = nativeRun()) => ({ version: 'PAYROLL_API_V1', capabilities: nativeCapabilities, runs: [run], jobs: [] });
  it('accepts the native calculator capability and preserves opaque review and breakdown facts', () => {
    const run = nativeRun();
    expect(readRuns(response(run)).runs[0]).toEqual(run);
    expect(readRuns(response(run)).runs[0].nativeCalculation?.employees[0].row.grossMinor).toBe('16000');
    expect(readRuns(response(run)).runs[0].reviewToken).toBe('opaque-source-review-token');
  });
  it.each(['NEVORA_NATIVE_PAYSTUB_PDF_V1', 'NEVORA_NATIVE_PAYSTUB_PDF_V2', 'NEVORA_NATIVE_PAYSTUB_PDF_V3'] as const)('reads ready and blocked runs with recorded template %s without replacing it', templateVersion => {
    const run = nativeRun();
    run.nativeCalculation!.templateVersion = templateVersion;
    expect(readRuns(response(run)).runs[0].nativeCalculation!.templateVersion).toBe(templateVersion);
    const blocked = { ...run, status: 'BLOCKED' as const, exceptions: ['WAGE_PROFILE_REQUIRED:E1'], rows: null, totals: null, reviewToken: null, nativeCalculation: { ...run.nativeCalculation!, state: 'blocked' as const, employees: [] } };
    expect(readRuns(response(blocked)).runs[0].nativeCalculation!.templateVersion).toBe(templateVersion);
    expect(() => readRuns(response({ ...run, nativeCalculation: { ...run.nativeCalculation!, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V4' as never } }))).toThrow();
  });
  it('keeps a blocked run unavailable without displaying invented zero totals', () => {
    const run = nativeRun({ status: 'BLOCKED', rows: null, totals: null, reviewToken: null, exceptions: ['WAGE_PROFILE_REQUIRED:E1'], nativeCalculation: { version: 'NATIVE_RUN_V1', state: 'blocked', ruleRevision: 1, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V1', employees: [] } });
    expect(readRuns(response(run)).runs[0].totals).toBeNull();
    expect(() => readRuns({ ...response(nativeRun()), capabilities: { ...nativeCapabilities, internalCalculatorAvailable: false }, runs: [{ ...run, totals: nativeRun().totals }] })).toThrow();
  });
  it('rejects malformed native money and missing ready breakdown instead of partially rendering private data', () => {
    const run = nativeRun();
    expect(() => readRuns({ ...response(), capabilities: { ...nativeCapabilities, internalCalculatorAvailable: false }, runs: [{ ...run, nativeCalculation: undefined }] })).toThrow();
    expect(() => readRuns({ ...response(), capabilities: { ...nativeCapabilities, internalCalculatorAvailable: false }, runs: [{ ...run, nativeCalculation: { ...run.nativeCalculation, employees: [{ ...run.nativeCalculation!.employees[0], row: { ...run.rows![0], grossMinor: '-1' } }] } }] })).toThrow();
  });
  it('accepts legacy provider runs even when the current workspace uses native calculation', () => {
    const legacy = nativeRun({ sourceAuthority: 'PROVIDER_IMPORT', nativeCalculation: undefined });
    expect(readRuns(response(legacy)).runs[0].sourceAuthority).toBe('PROVIDER_IMPORT');
    expect(() => readRuns({ ...response(), capabilities: { ...nativeCapabilities, internalCalculatorAvailable: 'true' } })).toThrow();
  });
  it('distinguishes private scoped portal history from own published history', () => {
    expect(readPortalStatements({ version: 'PAYROLL_PORTAL_STATEMENTS_V1', statements: [statement] }).statements[0].id).toBe(statement.id);
    expect(readStatements({ version: 'PAYROLL_API_V1', statements: [statement] }).statements[0].published).toBe(true);
    expect(() => readStatements({ version: 'PAYROLL_API_V1', statements: [{ ...statement, published: false }] })).toThrow();
    expect(() => readPortalStatements({ version: 'PAYROLL_API_V1', statements: [] })).toThrow();
  });
  it('rejects malformed statement dates and document locations', () => {
    expect(() => readStatements({ version: 'PAYROLL_API_V1', statements: [{ ...statement, payday: '2026-02-30' }] })).toThrow();
    expect(() => readStatements({ version: 'PAYROLL_API_V1', statements: [{ ...statement, viewUrl: 'https://foreign.invalid/private' }] })).toThrow();
  });
});
