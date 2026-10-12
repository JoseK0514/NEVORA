/** PAYROLL_API_V1: browser-safe contract. No session proofs or raw bank/tax data. */
export type PayrollPeriod = { startDate: string; endDate: string };
export type PayrollLanguage = 'en' | 'es';
export type PayrollRule = {
  id: string; name: string; kind: 'EMPLOYEE_DEDUCTION' | 'EMPLOYER_CONTRIBUTION';
  method: 'FIXED' | 'PERCENTAGE'; amountMinor: string | null; basisPoints: number | null;
  base: 'GROSS'; applicability: 'ALL' | 'EMPLOYEE_ELECTION';
  effectiveFrom: string; effectiveTo: string | null; capMinor: string | null;
  remittance: 'EMPLOYER' | 'PROVIDER';
};
export type PayrollPreferences = {
  companyName: string; language: PayrollLanguage; currency: 'USD';
  schedule: { frequency: 'WEEKLY' | 'BIWEEKLY' | 'SEMIMONTHLY' | 'MONTHLY'; anchorDate: string; paydayOffsetDays: number };
  rules: PayrollRule[];
  automation: { prepare: boolean; publish: boolean; reminders: boolean; reminderLeadDays: number[] };
  bankProfile: 'NEUTRAL_UNVERIFIED' | null;
};
export type PayrollException = { employeeId: string; language: PayrollLanguage | null; rules: PayrollRule[] | null };
export type PayrollCapabilities = { enabled: boolean; canConfigure: boolean; canReview: boolean; canApprove: boolean; internalCalculatorAvailable: false; bankCompatibility: 'UNVERIFIED' };
export type PayrollSettingsRevision = { revision: number; effectiveFrom: string; reason: string; preferences: PayrollPreferences; actorId: string; createdAt: string };
export type PayrollExceptionRevision = { revision: number; effectiveFrom: string; reason: string; exception: PayrollException; actorId: string; createdAt: string };
export type PayrollGrant = { revision: number; employeeId: string; review: boolean; approve: boolean };
export type PayrollSettingsResponse = { version: 'PAYROLL_API_V1'; capabilities: PayrollCapabilities; revisions: PayrollSettingsRevision[]; exceptions: PayrollExceptionRevision[]; grants: PayrollGrant[]; employees: { id: string; name: string; active: boolean }[]; futureDraftImpact: { runId: string; period: PayrollPeriod; reason: string }[] };
export type PayrollSettingsCommand = { operationId: string; reason: string } & (
  { action: 'SAVE_SETTINGS'; expectedRevision: number; effectiveFrom: string; preferences: PayrollPreferences } |
  { action: 'SAVE_EXCEPTION'; expectedRevision: number; effectiveFrom: string; exception: PayrollException } |
  { action: 'SET_GRANT'; expectedRevision: number; grant: Omit<PayrollGrant, 'revision'> }
);
export type PayrollAmountLine = { code: string; label: string; amountMinor: string };
export type PayrollImportRow = { employeeId: string; grossMinor: string; employeeDeductions: PayrollAmountLine[]; employerContributions: PayrollAmountLine[]; netMinor: string; earnings?: PayrollAmountLine[] };
export type PayrollImport = { schema: 'NEVORA_PAYROLL_IMPORT_V1'; currency: 'USD'; sourceName: string; sourceReference: string; period: PayrollPeriod; payday: string; rows: PayrollImportRow[] };
export type PayrollTotals = { grossMinor: string; deductionsMinor: string; employerContributionsMinor: string; netMinor: string; employeeCount: number };
export type PayrollDocument = { id: string; kind: 'EMPLOYEE_STATEMENT' | 'COMPANY_SUMMARY' | 'PAYMENT_INSTRUCTIONS'; employeeId: string | null; filename: string; sha256: string; downloadUrl: string; published: boolean };
export type PayrollRun = { id: string; revision: number; period: PayrollPeriod; payday: string; status: 'WAITING_FOR_AMOUNTS' | 'REVIEW_REQUIRED' | 'APPROVED'; correctionOf: string | null; rows: (PayrollImportRow & { employeeName: string })[] | null; sourceAuthority: 'PROVIDER_IMPORT'; importRevision: number; exceptionRevisions: {employeeId: string; revision: number}[]; sourceName: string | null; sourceReference: string | null; totals: PayrollTotals | null; reviewToken: string | null; settingsRevision: number | null; populationRevision: number | null; exceptions: string[]; documents: PayrollDocument[]; approvedBy: string | null; approvedAt: string | null; createdAt: string };
export type PayrollJob = { id: string; runId: string | null; kind: 'PREPARE' | 'PDF' | 'PUBLISH' | 'REMINDER'; status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'; attempts: number; error: string | null };
export type PayrollRunsResponse = { version: 'PAYROLL_API_V1'; capabilities: PayrollCapabilities; runs: PayrollRun[]; jobs: PayrollJob[] };
export type PayrollRunCommand = { operationId: string } & (
  { action: 'PREPARE'; period: PayrollPeriod; payday: string } |
  { action: 'IMPORT'; runId: string; expectedRevision: number; amounts: PayrollImport } |
  { action: 'APPROVE'; runId: string; expectedRevision: number; reviewToken: string } |
  { action: 'CORRECT'; runId: string; expectedRevision: number; reason: string; amounts: PayrollImport } |
  { action: 'PUBLISH' | 'PAYMENT_EXPORT'; runId: string; expectedRevision: number } |
  { action: 'RETRY_JOB'; jobId: string }
);
export type PayrollReceipt = { operationId: string; action: PayrollSettingsCommand['action'] | PayrollRunCommand['action']; runId?: string; revision?: number; jobId?: string; documentId?: string };
export type PayrollStatementsResponse = { version: 'PAYROLL_API_V1'; statements: (PayrollDocument & { period: PayrollPeriod; payday: string })[] };
export type PayrollErrorResponse = { error: string; message: string; issues?: {path: string; message: string}[] };
/** GET /api/payroll/receipts?operationId=… => { receipt: PayrollReceipt | null }.
 * GET settings/runs/statements => corresponding response. POST settings/runs => {receipt}.
 * Mutations require x-nevora-payroll: 1 and same origin. Review tokens are opaque
 * source identities, never authentication credentials. Errors use 400/403/409/503.
 */
