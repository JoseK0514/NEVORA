import { describe, expect, it } from 'vitest';
import { parsePayrollImport, readRuns, readSettings, readStatements, readReceipt } from './api';

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
