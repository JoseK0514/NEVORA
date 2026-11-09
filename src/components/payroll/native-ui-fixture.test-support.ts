import type { PayrollCapabilities, PayrollRun } from '@/lib/payroll/contracts';
import { calculateNativePayroll } from '@/lib/payroll/native/calculate';
import { input } from '@/lib/payroll/native/fixtures.test-support';

// Fictional calculator fixture for client/render tests only. It is not a lawful
// workweek/rounding default or an independent calculation acceptance result.
export const nativeCapabilities: PayrollCapabilities = { enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: true, bankCompatibility: 'UNVERIFIED' };
export function nativeRun(overrides: Partial<PayrollRun> = {}): PayrollRun {
  const result = calculateNativePayroll(input());
  if (result.state !== 'ready') throw new Error('Fictional ready fixture is blocked');
  return {
    id: '18d8e87c-9765-4dbd-9f4b-691b045c8b73', revision: 2, period: { startDate: '2026-10-05', endDate: '2026-10-11' }, payday: '2026-10-16',
    status: 'REVIEW_REQUIRED', correctionOf: null, sourceAuthority: 'NATIVE_RECORDED_TIME', coverage: { complete: true, locationIds: ['L1'] },
    nativeCalculation: { version: 'NATIVE_RUN_V1', state: 'ready', ruleRevision: 1, templateVersion: 'NEVORA_NATIVE_PAYSTUB_PDF_V1', employees: [result] },
    rows: [{ ...result.row, employeeName: 'Fictional Employee' }], totals: { grossMinor: '16000', deductionsMinor: result.row.employeeDeductions.reduce((n, v) => n + BigInt(v.amountMinor), BigInt(0)).toString(), employerContributionsMinor: '0', netMinor: result.row.netMinor, employeeCount: 1 },
    reviewToken: 'opaque-source-review-token', importRevision: 0, exceptionRevisions: [], sourceName: 'NEVORA actual recorded time', sourceReference: 'fictional-recorded-source',
    settingsRevision: 1, populationRevision: 1, exceptions: [], documents: [], approvedBy: null, approvedAt: null, createdAt: '2026-10-12T16:00:00Z', ...overrides,
  };
}
export const statement = { id: '31a560e7-c496-46f1-b3d9-63efaa21839f', kind: 'EMPLOYEE_STATEMENT' as const, employeeId: 'E1', filename: 'Fictional statement.pdf', sha256: 'a'.repeat(64), downloadUrl: '/api/payroll/documents/31a560e7-c496-46f1-b3d9-63efaa21839f', viewUrl: '/api/payroll/documents/31a560e7-c496-46f1-b3d9-63efaa21839f/view', published: true, period: { startDate: '2026-10-05', endDate: '2026-10-11' }, payday: '2026-10-16' };
