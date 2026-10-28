/** PAYROLL_API_V1: browser-safe contract. No session proofs or raw bank/tax data. */
/** Inclusive YYYY-MM-DD dates in the workspace calendar, without a time-zone offset. */
export type PayrollPeriod = {
    startDate: string;
    endDate: string;
};
export type PayrollLanguage = "en" | "es";
export type PayrollRule = {
    id: string;
    name: string;
    kind: "EMPLOYEE_DEDUCTION" | "EMPLOYER_CONTRIBUTION";
    method: "FIXED" | "PERCENTAGE";
    amountMinor: string | null;
    basisPoints: number | null;
    base: "GROSS";
    applicability: "ALL" | "EMPLOYEE_ELECTION";
    effectiveFrom: string;
    effectiveTo: string | null;
    capMinor: string | null;
    remittance: "EMPLOYER" | "PROVIDER";
};
export type PayrollPreferences = {
    sourceProvider?: "ADP_RUN" | "QUICKBOOKS_PAYROLL" | "PAYCHEX" | "GUSTO" | "OTHER";
    bankChannel?: "POPULAR_WCM_TEXT" | "POPULAR_WCM_NACHA" | "POPULAR_COMMERCIAL_MANUAL" | "OTHER";
    companyName: string;
    language: PayrollLanguage;
    currency: "USD";
    schedule: {
        frequency: "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
        anchorDate: string;
        paydayOffsetDays: number;
    };
    rules: PayrollRule[];
    automation: {
        prepare: boolean;
        publish: boolean;
        reminders: boolean;
        reminderLeadDays: number[];
    };
    bankProfile: "NEUTRAL_UNVERIFIED" | null;
};
export type PayrollException = {
    employeeId: string;
    language: PayrollLanguage | null;
    rules: PayrollRule[] | null;
};
export type PayrollCapabilities = {
    enabled: boolean;
    canConfigure: boolean;
    canReview: boolean;
    canApprove: boolean;
    internalCalculatorAvailable: boolean;
    bankCompatibility: "UNVERIFIED";
    /** Runtime transport readiness only; consent and source access are checked per delivery. */
    noticeDelivery?: "ENABLED" | "DISABLED";
};
export type PayrollSettingsRevision = {
    revision: number;
    effectiveFrom: string;
    reason: string;
    preferences: PayrollPreferences;
    actorId: string;
    createdAt: string;
};
export type PayrollExceptionRevision = {
    revision: number;
    effectiveFrom: string;
    reason: string;
    exception: PayrollException;
    actorId: string;
    createdAt: string;
};
export type PayrollGrant = {
    revision: number;
    employeeId: string;
    review: boolean;
    approve: boolean;
};
export type PayrollSettingsResponse = {
    version: "PAYROLL_API_V1";
    capabilities: PayrollCapabilities;
    revisions: PayrollSettingsRevision[];
    exceptions: PayrollExceptionRevision[];
    grants: PayrollGrant[];
    employees: {
        id: string;
        name: string;
        active: boolean;
    }[];
    futureDraftImpact: {
        runId: string;
        period: PayrollPeriod;
        reason: string;
    }[];
};
export type PayrollSettingsCommand = {
    operationId: string;
    reason: string;
} & ({
    action: "SAVE_SETTINGS";
    expectedRevision: number;
    effectiveFrom: string;
    preferences: PayrollPreferences;
} | {
    action: "SAVE_EXCEPTION";
    expectedRevision: number;
    effectiveFrom: string;
    exception: PayrollException;
} | {
    action: "SET_GRANT";
    expectedRevision: number;
    grant: Omit<PayrollGrant, "revision">;
});
export type PayrollAmountLine = {
    code: string;
    label: string;
    amountMinor: string;
};
export type PayrollImportRow = {
    employeeId: string;
    grossMinor: string;
    employeeDeductions: PayrollAmountLine[];
    employerContributions: PayrollAmountLine[];
    netMinor: string;
    earnings?: PayrollAmountLine[];
};
export type PayrollImport = {
    schema: "NEVORA_PAYROLL_IMPORT_V1";
    currency: "USD";
    sourceName: string;
    sourceReference: string;
    period: PayrollPeriod;
    payday: string;
    rows: PayrollImportRow[];
};
export type PayrollTotals = {
    grossMinor: string;
    deductionsMinor: string;
    employerContributionsMinor: string;
    netMinor: string;
    employeeCount: number;
};
export type PayrollDocument = {
    id: string;
    kind: "EMPLOYEE_STATEMENT" | "COMPANY_SUMMARY" | "PAYMENT_INSTRUCTIONS";
    employeeId: string | null;
    filename: string;
    sha256: string;
    downloadUrl: string;
    viewUrl?: string;
    published: boolean;
};
export type PayrollRun = {
    id: string;
    revision: number;
    period: PayrollPeriod;
    payday: string;
    status: "WAITING_FOR_AMOUNTS" | "BLOCKED" | "REVIEW_REQUIRED" | "APPROVED";
    correctionOf: string | null;
    nativeCorrection?: {
        rootRunId: string;
        reason: string;
    };
    rows: (PayrollImportRow & {
        employeeName: string;
    })[] | null;
    sourceAuthority: "PROVIDER_IMPORT" | "NATIVE_RECORDED_TIME";
    coverage?: {
        complete: boolean;
        locationIds: string[];
    };
    nativeCalculation?: {
        version: "NATIVE_RUN_V1";
        state: "ready" | "blocked";
        ruleRevision: number | null;
        templateVersion: "NEVORA_NATIVE_PAYSTUB_PDF_V1";
        employees: import("./native/contracts").NativePayrollReady[];
    };
    importRevision: number;
    exceptionRevisions: {
        employeeId: string;
        revision: number;
    }[];
    sourceName: string | null;
    sourceReference: string | null;
    totals: PayrollTotals | null;
    reviewToken: string | null;
    settingsRevision: number | null;
    populationRevision: number | null;
    exceptions: string[];
    documents: PayrollDocument[];
    approvedBy: string | null;
    approvedAt: string | null;
    createdAt: string;
};
export type PayrollJob = {
    outcome?: "NOT_SENT_STUB" | "QUEUED" | "QUEUED_DELIVERY_DISABLED" | "NO_CURRENT_RECIPIENTS" | null;
    id: string;
    runId: string | null;
    kind: "PREPARE" | "PDF" | "PUBLISH" | "REMINDER";
    status: "PENDING" | "RUNNING" | "SUCCEEDED" | "FAILED";
    attempts: number;
    error: string | null;
};
export type PayrollMissingPeriod = {
    period: PayrollPeriod;
    payday: string;
    settingsRevision: number;
    state: "MISSING" | "AMBIGUOUS_TRANSITION";
    issues: string[];
};
export type PayrollBacklogSummary = {
    asOfDate: string;
    rangeStart: string | null;
    rangeEnd: string;
    /** Null counts mean the bounded history scan overflowed; never interpret as zero. */
    missingCount: number | null;
    remainingCount: number | null;
    returnedCount: number;
    ambiguousCount: number | null;
    overflow: boolean;
};
export type PayrollRunsResponse = {
    version: "PAYROLL_API_V1";
    capabilities: PayrollCapabilities;
    runs: PayrollRun[];
    jobs: PayrollJob[];
    /** Oldest first, at most 50, from effective settings history and original runs. */
    missingPeriods?: PayrollMissingPeriod[];
    backlog?: PayrollBacklogSummary;
};
export type PayrollRunCommand = {
    operationId: string;
} & ({
    action: "PREPARE";
    period: PayrollPeriod;
    payday: string;
} | {
    action: "IMPORT";
    runId: string;
    expectedRevision: number;
    amounts: PayrollImport;
} | {
    action: "APPROVE";
    runId: string;
    expectedRevision: number;
    reviewToken: string;
} | {
    action: "CORRECT";
    runId: string;
    expectedRevision: number;
    reason: string;
    amounts: PayrollImport;
} | {
    action: "PUBLISH" | "PAYMENT_EXPORT";
    runId: string;
    expectedRevision: number;
} | {
    action: "RECALCULATE";
    runId: string;
    expectedRevision: number;
} | {
    action: "CORRECT_NATIVE";
    runId: string;
    expectedRevision: number;
    reason: string;
} | {
    action: "RETRY_JOB";
    jobId: string;
});
export type PayrollReceipt = {
    operationId: string;
    action: PayrollSettingsCommand["action"] | PayrollRunCommand["action"] | import("./native/contracts").NativeProfileCommand["action"];
    runId?: string;
    revision?: number;
    jobId?: string;
    documentId?: string;
};
export type PayrollStatementsResponse = {
    version: "PAYROLL_API_V1";
    statements: (PayrollDocument & {
        period: PayrollPeriod;
        payday: string;
        /** The person's own published statement this one corrects, or null. Absent from older servers. */
        corrects?: string | null;
        /** The person's own published statement that corrects this one, or null. Absent from older servers. */
        correctedBy?: string | null;
    })[];
};
export type PayrollErrorResponse = {
    error: string;
    message: string;
    issues?: {
        path: string;
        message: string;
    }[];
};
/** GET /api/payroll/receipts?operationId=… => { receipt: PayrollReceipt | null }.
 * GET settings/runs/statements => corresponding response. POST settings/runs => {receipt}.
 * All XHR GET/POST requests require x-nevora-payroll: 1 and same origin.
 * Authenticated attachment navigation does not require the custom header.
 * Review tokens are opaque
 * source identities, never authentication credentials. Errors use 400/403/409/503.
 */
