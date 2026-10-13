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
    };
};
