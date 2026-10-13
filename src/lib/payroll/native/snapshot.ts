import type { NativePreparationFacts } from './preparation';
export type NativeSnapshot = {
    version: 'NATIVE_SNAPSHOT_V1';
    facts: NativePreparationFacts;
    openingRevisions?: Record<string, number>;
    employeeCoverage: Record<string, {
        complete: boolean;
        locationIds: string[];
    }>;
    originalRunId: string;
    correctionReason?: string;
    calculationVersion: string;
    recordedSources?: Extract<import("./recorded-source.server").RecordedSourceCapture, {
        state: "ready";
    }>[];
    ruleEvidence: {
        status: 'EXACT_CENT_NO_ROUNDING_REQUIRED';
        assessmentSha256: string;
    } | {
        status: 'FEDERAL_EMPLOYEE_STATUTORY_CENTS_OTHER_OPERATIONS_EXACT';
        otherOperationsExactnessAssessmentSha256: string;
        federalEmployeeRuleId: '26_CFR_31_3102_1_D';
        federalEmployeeCollectionSourceSha256: string;
    };
};
