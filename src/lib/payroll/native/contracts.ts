/**
 * Native calculation evidence contracts. Unless stated otherwise, *Minor amounts
 * are base-10 USD cent strings, basisPoints use 1/100 of one percent, instants include
 * an offset, and period endpoints are inclusive local dates. Hourly rate strings may
 * contain fractional cents; duration outputs use integer nanoseconds. These types
 * describe captured facts and results rather than issuing authorization.
 */
import type { PayrollImportRow, PayrollPeriod } from "../contracts";
import type { NativeCentRounding, NativeFrequency, PrCertificate } from "./rules/pr-2026";
/** Client-safe identity shared by the protected profile and result readers. */
export const OWNER_PROVISIONAL_POLICY_REFERENCE = 'OWNER_AUTHORIZED_PROVISIONAL_PR_STANDARD_2026_20261014';
export type NativeRecordedBreak = {
    id: string;
    typeId: string | null;
    startAt: string;
    endAt: string | null;
    recordedVersion?: number;
    classification?: import("../../clocker/break-types").BreakTypeSnapshot | null;
};
export type NativeRecordedEntry = {
    id: string;
    locationId: string;
    startAt: string;
    endAt: string | null;
    sourceKind: "RECORDED" | "ADJUSTMENT";
    recordedVersion: number | null;
    adjustmentId: string | null;
    breaks: NativeRecordedBreak[];
};
export type NativeTimecard = {
    employeeId: string;
    period: PayrollPeriod;
    revision: number;
    state: "FINALIZED" | "APPROVED" | "DRAFT" | "REOPENED" | "NEEDS_REVIEW";
    sourceHash: string;
    finalizedSourceHash: string | null;
    pendingCorrections: number;
    entries: NativeRecordedEntry[];
    recordedSourceEvidence?: {captureFence:string;operationId:string;sourceHash:string;currentSourceHash:string};
};
export type NativeWageProfile = {
    id: string;
    revision: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    locationIds: string[];
    hourlyRateMinor: string;
    compensation: "HOURLY";
    employment: "PR_PRIVATE_NONEXEMPT";
    minimumWageCoverage: "PR_ACT_47_STANDARD_2026";
    overtime: "TIME_AND_HALF" | "DOUBLE_PRESERVED";
    dailyBasis: "CALENDAR_DAY";
    /** Legacy weekday encoding and clock; both null when absent, never an effective policy date. */
    workweekAnchorDate: string | null;
    workweekStartTime: string | null;
    /** Absent/null preserves an incomplete saved profile; native calculation must block. */
    workweekPolicy?: import("./workweek-policy").NativeWorkweekPolicy | null;
    overtimeBasis: "WEIGHTED_WEEKLY";
    wageCentRounding: "HALF_UP" | "UNVERIFIED";
    breakRules: {
        typeId: string;
        treatment: "PAID_REST" | "UNPAID_RELIEVED_MEAL";
    }[];
    /** Explicit attestation that the evaluated context has no other wage premium. */
    standardContextAttested: boolean;
    evidenceReference: string;
};
export type NativeYtd = {
    year: number;
    revision: number;
    evidenceReference: string;
    attested: boolean;
    grossMinor: string;
    netMinor: string;
    socialSecurityWagesMinor: string;
    medicareWagesMinor: string;
    sinotWagesMinor: string;
    deductions: Record<string, string>;
    employerContributions: Record<string, string>;
    /** Current same-employer projection; approved correction heads replace their originals. */
    ledgerFingerprint: string;
    locationIds: string[];
    employerWagesMinor: Record<string, string>;
};
export type NativeTaxProfile = {
    id: string;
    revision: number;
    effectiveFrom: string;
    effectiveTo: string | null;
    coverage: "PR_REGULAR_TAXABLE_RESIDENT";
    certificate: PrCertificate;
    certificateReference: string;
    ficaCoverage: "STANDARD";
    sinotCoverage: "STANDARD";
    sinotEmployeeBasisPoints: number;
    /** UNVERIFIED permits exact-cent results only; fractional operations require an accepted rule. */
    prCentRounding: NativeCentRounding | "UNVERIFIED";
    ruleEvidenceReference: string | null;
    employerContributions: {
        code: string;
        label: string;
        applicability: "APPLICABLE" | "EXEMPT";
        basisPoints: number | null;
        capMinor: string | null;
        /** On saved configuration: same-code attested opening YTD baseline. On calculator input: current projected YTD. */
        wagesBeforeMinor: string;
        evidenceReference: string;
    }[];
    employerCoverageAttested: boolean;
};
export type NativeAuthorizedDeduction = {
    id: string;
    revision: number;
    code: string;
    label: string;
    effectiveFrom: string;
    effectiveTo: string | null;
    method: "FIXED" | "PERCENTAGE";
    amountMinor: string | null;
    basisPoints: number | null;
    capMinor: string | null;
    /** Capped authorization opening withheld before effectiveFrom; native
     * same-authorization ledger heads advance it. Not a guessed YTD zero. */
    deductedBeforeMinor: string;
    authorization: "WRITTEN_POST_TAX";
    authorizationReference: string;
    revoked: boolean;
    legalBasis: "PR_LAW_17_5_C" | "PR_LAW_17_5_G";
    complianceReference: string;
    employerContributionCode: string | null;
};
export type NativePayrollInput = {
    schema: "NEVORA_NATIVE_PAYROLL_INPUT_V1";
    /** Explicit protected-profile selection; absent preserves the legacy path. */
    calculationPolicyReference?: string | null;
    employeeId: string;
    period: PayrollPeriod;
    payday: string;
    frequency: NativeFrequency;
    timeZone: "America/Puerto_Rico";
    timecards: NativeTimecard[];
    wages: NativeWageProfile[];
    tax: NativeTaxProfile | null;
    ytd: NativeYtd | null;
    deductions: NativeAuthorizedDeduction[];
};
export type NativeEarning = {
    code: string;
    kind: "REGULAR" | "OVERTIME" | "FLSA_TRUE_UP";
    locationId: string;
    wageProfileId: string;
    wageRevision: number;
    rateMinorPerHour: string;
    premiumBasisMinorPerHour: {
        numerator: string;
        denominator: string;
    } | null;
    nanoseconds: string;
    amountMinor: string;
    exactAmount: {
        numerator: string;
        denominator: string;
    };
};
export type NativePayrollReady = {
    state: "ready";
    schema: "NEVORA_NATIVE_PAYROLL_RESULT_V1";
    employeeId: string;
    sourceAuthority: "NATIVE_RECORDED_TIME";
    currency: "USD";
    row: PayrollImportRow;
    breakdown: {
        earnings: NativeEarning[];
        regularNanoseconds: string;
        overtimeNanoseconds: string;
        unpaidBreakNanoseconds: string;
        locationIds: string[];
        taxYear: number;
        ytdBefore: NativeYtd;
        ytdAfter: NativeYtd;
        taxes: {
            code: string;
            amountMinor: string;
            taxableMinor: string;
            exactAmount: {
                numerator: string;
                denominator: string;
            } | null;
        }[];
    };
    provenance: {
        federalEmployeeTax: { version: 'NATIVE_FEDERAL_EMPLOYEE_COLLECTION_V1'; ruleId: '26_CFR_31_3102_1_D'; operations: import('./federal-employee-tax').NativeFederalEmployeeTaxOperation[] };
        boundaryEvidence: import("./workweek-policy").NativeBoundaryEvidence;
        inputSha256: string;
        rulesetId: "PR_STANDARD_2026_V1";
        rulesSha256: string;
        rounding: "EARNING_GROUP_HALF_UP" | "EXACT_CENT_NO_ROUNDING_REQUIRED" | "OWNER_PROVISIONAL_PAYCHECK_ALLOCATION";
        taxRounding: NativeCentRounding | "EXACT_CENT_NO_ROUNDING_REQUIRED";
        exactnessOperations: import("./money").NativeExactnessOperation[];
        calculationPolicy?: import('./provisional-policy').NativeCalculationPolicyEvidence;
    };
};
export type NativePayrollBlocked = {
    state: "blocked";
    schema: "NEVORA_NATIVE_PAYROLL_RESULT_V1";
    employeeId: string | null;
    issues: {
        code: string;
        reference: string | null;
    }[];
};
export type NativePayrollResult = NativePayrollReady | NativePayrollBlocked;
export type NativeConfiguration = {
    schema: "NEVORA_NATIVE_CONFIGURATION_V1";
    calculationPolicyReference?: string | null;
    employeeId: string;
    wages: NativeWageProfile[];
    tax: NativeTaxProfile | null;
    deductions: NativeAuthorizedDeduction[];
};
export type NativeConfigurationRevision = NativeConfiguration & {
    revision: number;
    actorId: string;
    reason: string;
    createdAt: string;
};
export type NativeProfileCommand = {
    operationId: string;
    reason: string;
    expectedRevision: number;
} & ({
    action: "SAVE_NATIVE_PROFILE";
    configuration: NativeConfiguration;
} | {
    action: "ATTEST_OPENING_YTD";
    employeeId: string;
    ytd: NativeYtd;
} | {
    action: "SET_MANAGER_SCOPE";
    employeeId: string;
    review: boolean;
    approve: boolean;
    locationIds: string[];
});
export type NativeProfileReceipt = {
    operationId: string;
    action: NativeProfileCommand["action"];
    employeeId: string;
    revision: number;
};
export type NativeProfilesResponse = {
    version: "PAYROLL_NATIVE_PROFILES_V1";
    configurations: NativeConfigurationRevision[];
    openingYtd: {
        employeeId: string;
        ytd: NativeYtd;
    }[];
    managerScopes: {
        employeeId: string;
        revision: number;
        review: boolean;
        approve: boolean;
        locationIds: string[];
        subjectEmployeeVersion: string;
    }[];
};
