import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildSetupRecord, defaultBreakTreatment, excludedOwners, materializeConfiguration, materializeOpening, nextRateHistory, ownersIncluded, parsePlainSetupCommand, plainDate, verifySetupRecord, type SetupRecordInput } from "./setup";
import { NATIVE_PLAIN_SETUP_FORM_VERSION, type NativeCompanyPayrollFacts, type NativePayrollInput, type NativePlainPayFacts } from "./contracts";
import { calculateNativePayroll } from "./calculate";
import { parseConfiguration, parseYtd } from "./model";
import { buildNativeRunCandidate } from "./preparation";
import { entry } from "./fixtures.test-support";
import { newRun } from "../service";

const owner = { employeeId: "O1", name: "Ana Rivera" };
const enteredAt = "2026-10-25T14:00:00.000Z";
const companyFacts: NativeCompanyPayrollFacts = {
    workweek: "STATUTORY_MONDAY_0001",
    employerPrograms: [{ code: "FUTA", applies: true, basisPoints: 60 }, { code: "PR_UI", applies: true, basisPoints: 340 }, { code: "CFSE", applies: true, basisPoints: 150 }],
    breakPay: [{ typeId: "REST", treatment: "PAID_REST" }, { typeId: "MEAL", treatment: "UNPAID_RELIEVED_MEAL" }],
    includeOwners: false,
};
const pay: NativePlainPayFacts = { hourlyRateMinor: "1250", rateStartsOn: "2026-01-01", withholding: { personal: "INDIVIDUAL_FULL", fullDependents: 0, halfDependents: 0, deductionAllowances: 0, veteran: false, extraWithholdingMinor: "0" } };
const base = (kind: SetupRecordInput["kind"], subjectId: string, facts: unknown, extra: Partial<SetupRecordInput> = {}): SetupRecordInput => ({ kind, subjectId, taxYear: 0, revision: 1, formVersion: NATIVE_PLAIN_SETUP_FORM_VERSION, operationId: randomUUID(), enteredBy: owner, enteredAt, cause: "OWNER_ENTRY", derivedFrom: { companyDefaults: null, opening: null, locationIds: [] }, facts, ...extra });

function fictionalSetup(employeeId = "E1") {
    const company = buildSetupRecord(base("COMPANY_DEFAULTS", "COMPANY", companyFacts));
    const openingRecord = buildSetupRecord(base("OPENING_TOTALS", employeeId, { kind: "FRESH" }, { taxYear: 2026 }));
    const opening = materializeOpening({ taxYear: 2026, revision: 1, totals: { kind: "FRESH" }, record: openingRecord, primaryLocationId: "L1" });
    const rates = nextRateHistory(null, pay);
    const payRecord = buildSetupRecord(base("EMPLOYEE_PAY", employeeId, { entered: pay, rates }, { derivedFrom: { companyDefaults: { revision: 1, sha256: company.factsSha256 }, opening: { taxYear: 2026, revision: 1, sha256: openingRecord.factsSha256 }, locationIds: ["L1"] } }));
    const configuration = materializeConfiguration({ employeeId, revision: 1, rates, withholding: pay.withholding, pay: payRecord, company, companyFacts, opening, locationIds: ["L1"], deductions: [] });
    return { company, openingRecord, opening, payRecord, configuration };
}
const hash = "a".repeat(32);
function payrollInput(employeeId = "E1"): NativePayrollInput {
    const { configuration, opening } = fictionalSetup(employeeId);
    const entries = [5, 6, 7, 8, 9].map(day => entry(`T${day}`, `2026-10-0${day}T08:00:00-04:00`, `2026-10-0${day}T16:00:00-04:00`));
    entries[0].breaks = [{ id: "B1", typeId: "REST", startAt: "2026-10-05T10:00:00-04:00", endAt: "2026-10-05T10:10:00-04:00" }, { id: "B2", typeId: "MEAL", startAt: "2026-10-05T12:00:00-04:00", endAt: "2026-10-05T12:30:00-04:00" }];
    return { schema: "NEVORA_NATIVE_PAYROLL_INPUT_V1", employeeId, period: { startDate: "2026-10-05", endDate: "2026-10-11" }, payday: "2026-10-16", frequency: "WEEKLY", timeZone: "America/Puerto_Rico",
        timecards: [{ employeeId, period: { startDate: "2026-09-21", endDate: "2026-10-18" }, revision: 1, state: "FINALIZED", sourceHash: hash, finalizedSourceHash: hash, pendingCorrections: 0, entries }],
        wages: configuration.wages, tax: configuration.tax, ytd: opening, deductions: [], calculationPolicyReference: configuration.calculationPolicyReference };
}

describe("server-recorded setup evidence", () => {
    it("states who entered the facts and when, in plain words", () => {
        const { payRecord } = fictionalSetup();
        expect(payRecord.statement).toBe("Entered by Ana Rivera on Oct 25, 2026");
        expect(payRecord.attestation).toMatch(/^Saving confirmed this person's hourly rate/);
        expect(payRecord.formVersion).toBe(NATIVE_PLAIN_SETUP_FORM_VERSION);
        expect(payRecord.revision).toBe(1);
        expect(payRecord.factsSha256).toMatch(/^[a-f0-9]{64}$/);
        expect(payRecord.reference).toBe(`nevora-setup:v1:employee-pay:r1:sha256:${payRecord.factsSha256}`);
        expect(plainDate("2026-10-26T03:30:00Z")).toBe("Oct 25, 2026"); // Puerto Rico time, not UTC
    });
    it("is tamper-evident: any change to the saved facts or metadata breaks the fingerprint", () => {
        const { payRecord, company } = fictionalSetup();
        expect(verifySetupRecord(payRecord)).toBe(true);
        expect(verifySetupRecord(company)).toBe(true);
        expect(verifySetupRecord({ ...payRecord, facts: { entered: { ...pay, hourlyRateMinor: "1300" }, rates: [{ startsOn: "2026-01-01", hourlyRateMinor: "1300" }] } })).toBe(false);
        expect(verifySetupRecord({ ...payRecord, enteredBy: { employeeId: "O2", name: "Someone Else" } })).toBe(false);
        expect(verifySetupRecord({ ...payRecord, enteredAt: "2026-10-24T14:00:00.000Z" })).toBe(false);
        expect(verifySetupRecord({ ...payRecord, reference: payRecord.reference.replace("r1", "r2") })).toBe(false);
    });
    it("produces every contract evidence and attestation field from the record, not from the Owner", () => {
        const { configuration, payRecord, company, opening, openingRecord } = fictionalSetup();
        const wage = configuration.wages[0];
        expect(wage.evidenceReference).toBe(payRecord.reference);
        expect(wage.standardContextAttested).toBe(true);
        expect(wage.workweekPolicy).toMatchObject({ boundary: { weekday: 1, startTime: "00:01" }, federalEvidenceReference: company.reference, origin: { kind: "STATUTORY_DEFAULT", noticeAbsenceConfirmed: true, evidenceReference: company.reference } });
        expect(configuration.tax).toMatchObject({ certificateReference: payRecord.reference, employerCoverageAttested: true });
        expect(configuration.tax!.employerContributions.map(c => c.evidenceReference)).toEqual([company.reference, company.reference, company.reference]);
        expect(opening).toMatchObject({ attested: true, evidenceReference: openingRecord.reference, ledgerFingerprint: openingRecord.factsSha256 });
        // The unchanged contract parsers accept the server-built facts.
        expect(() => parseConfiguration(configuration)).not.toThrow();
        expect(() => parseYtd(opening)).not.toThrow();
    });
    it("accepts only plain facts: evidence, fingerprints and attestation flags are refused", () => {
        const command = { action: "SAVE_EMPLOYEE_PAY_SETUP", operationId: randomUUID(), expectedRevision: 0, employeeId: "E1", pay, opening: { taxYear: 2026, expectedRevision: 0, totals: { kind: "FRESH" } } };
        expect(parsePlainSetupCommand(command)).toEqual(command);
        expect(() => parsePlainSetupCommand({ ...command, pay: { ...pay, evidenceReference: "typed" } })).toThrow("INVALID_PAY_SETUP");
        expect(() => parsePlainSetupCommand({ ...command, opening: { ...command.opening, totals: { kind: "FRESH", ledgerFingerprint: "b".repeat(64) } } })).toThrow("INVALID_PAY_SETUP");
        expect(() => parsePlainSetupCommand({ ...command, attested: true })).toThrow("INVALID_PAY_SETUP");
        expect(() => parsePlainSetupCommand({ ...command, pay: { ...pay, hourlyRateMinor: "1000" } })).toThrow("INVALID_PAY_SETUP");
        const company = { action: "SAVE_COMPANY_PAYROLL_DEFAULTS", operationId: randomUUID(), expectedRevision: 0, defaults: companyFacts };
        expect(parsePlainSetupCommand(company)).toEqual(company);
        expect(() => parsePlainSetupCommand({ ...company, defaults: { ...companyFacts, employerPrograms: [{ code: "FUTA", applies: true, basisPoints: 700 }, ...companyFacts.employerPrograms.slice(1)] } })).toThrow("INVALID_PAY_SETUP");
        expect(() => parsePlainSetupCommand({ ...company, defaults: { ...companyFacts, employerCoverageAttested: true } })).toThrow("INVALID_PAY_SETUP");
    });
});

describe("company defaults employees inherit", () => {
    it("maps break pay once per type: Rest is paid, Meal is an unpaid relieved meal", () => {
        expect(defaultBreakTreatment("REST")).toBe("PAID_REST");
        expect(defaultBreakTreatment("MEAL")).toBe("UNPAID_RELIEVED_MEAL");
        expect(fictionalSetup().configuration.wages[0].breakRules).toEqual(companyFacts.breakPay);
    });
    it("uses the statutory Monday 12:01 AM workweek and the company employer programs", () => {
        const { configuration } = fictionalSetup("E7");
        expect(configuration.wages[0].workweekPolicy).toMatchObject({ employeeId: "E7", boundary: { weekday: 1, startTime: "00:01", timeZone: "America/Puerto_Rico" }, effectiveFrom: "2025-01-01T04:00:00Z" });
        expect(configuration.tax!.employerContributions).toEqual([
            expect.objectContaining({ code: "FUTA", applicability: "APPLICABLE", basisPoints: 60, capMinor: "700000", wagesBeforeMinor: "0" }),
            expect.objectContaining({ code: "PR_UI", applicability: "APPLICABLE", basisPoints: 340, capMinor: "700000" }),
            expect.objectContaining({ code: "CFSE", applicability: "APPLICABLE", basisPoints: 150, capMinor: null }),
        ]);
    });
    it("keeps earlier rates and replaces rates on or after a new start date", () => {
        const first = nextRateHistory(null, pay);
        const raise = nextRateHistory(first, { ...pay, hourlyRateMinor: "1400", rateStartsOn: "2026-11-01" });
        expect(raise).toEqual([{ startsOn: "2026-01-01", hourlyRateMinor: "1250" }, { startsOn: "2026-11-01", hourlyRateMinor: "1400" }]);
        expect(nextRateHistory(raise, { ...pay, hourlyRateMinor: "1300", rateStartsOn: "2026-06-01" })).toEqual([{ startsOn: "2026-01-01", hourlyRateMinor: "1250" }, { startsOn: "2026-06-01", hourlyRateMinor: "1300" }]);
    });
    it("records year-to-date totals as plain amounts, or zero for a fresh start", () => {
        const record = buildSetupRecord(base("OPENING_TOTALS", "E1", {}, { taxYear: 2026 }));
        const fresh = materializeOpening({ taxYear: 2026, revision: 1, totals: { kind: "FRESH" }, record, primaryLocationId: "L1" });
        expect(fresh).toMatchObject({ grossMinor: "0", netMinor: "0", employerWagesMinor: { FUTA: "0", PR_UI: "0", CFSE: "0" }, locationIds: [] });
        const midYear = materializeOpening({ taxYear: 2026, revision: 1, totals: { kind: "MID_YEAR", grossMinor: "1000000", withheld: { socialSecurityMinor: "62000", medicareMinor: "14500", prIncomeTaxMinor: "40000", sinotMinor: "3000" }, employerPaid: { socialSecurityMinor: "62000", medicareMinor: "14500", sinotMinor: "3000", futaMinor: "4200", prUiMinor: "23800", cfseMinor: "15000" } }, record, primaryLocationId: "L1" });
        expect(midYear).toMatchObject({ grossMinor: "1000000", netMinor: "880500", socialSecurityWagesMinor: "1000000", employerWagesMinor: { FUTA: "1000000", PR_UI: "1000000", CFSE: "1000000" }, locationIds: ["L1"] });
        expect(() => parsePlainSetupCommand({ action: "SAVE_EMPLOYEE_PAY_SETUP", operationId: randomUUID(), expectedRevision: 0, employeeId: "E1", pay, opening: { taxYear: 2026, expectedRevision: 0, totals: { kind: "MID_YEAR", grossMinor: "100", withheld: { socialSecurityMinor: "200", medicareMinor: "0", prIncomeTaxMinor: "0", sinotMinor: "0" }, employerPaid: { socialSecurityMinor: "0", medicareMinor: "0", sinotMinor: "0", futaMinor: "0", prUiMinor: "0", cfseMinor: "0" } } } })).toThrow("INVALID_PAY_SETUP");
    });
    it("calculates a paycheck from plain inputs alone with zero setup blockers", () => {
        const result = calculateNativePayroll(payrollInput());
        expect(result.state === "blocked" ? result.issues : "ready").toBe("ready");
        if (result.state !== "ready") return;
        // 40 h at $12.50 with a paid 10-minute rest and an unpaid 30-minute meal on Monday.
        expect(result.row.grossMinor).toBe("49375");
        expect(result.provenance.calculationPolicy?.kind).toBe("OWNER_AUTHORIZED_PROVISIONAL_POLICY");
        const run = buildNativeRunCandidate(newRun(randomUUID(), { startDate: "2026-10-05", endDate: "2026-10-11" }, "2026-10-16"), { inputs: [payrollInput()], population: [{ employeeId: "E1", name: "Luis Ortiz", disposition: "INCLUDE" }, { employeeId: "O1", name: "Ana Rivera", disposition: "EXCLUDE" }], sourceFingerprint: hash, ruleRevision: 1, rulesVerified: true, employeeLocations: { E1: ["L1"], O1: ["L1"] }, unknownCoverageEmployeeIds: [], blockingIssues: [] });
        expect(run.exceptions).toEqual([]);
        expect(run.status).toBe("REVIEW_REQUIRED");
    });
});

describe("payroll population default", () => {
    const members = [{ employeeId: "E1", disposition: "INCLUDE" as const }, { employeeId: "O1", disposition: "INCLUDE" as const }, { employeeId: "O2", disposition: "EXCLUDE" as const }];
    it("leaves Owners out by default", () => {
        expect(ownersIncluded(null)).toBe(false);
        expect(excludedOwners(members, ["O1", "O2"], null)).toEqual(["O1"]);
        expect(excludedOwners(members, ["O1", "O2"], { facts: { ...companyFacts, includeOwners: false } })).toEqual(["O1"]);
    });
    it("includes Owners when the company switch is on", () => {
        expect(excludedOwners(members, ["O1"], { facts: { ...companyFacts, includeOwners: true } })).toEqual([]);
    });
    it("never drops an Owner a corrected run already paid", () => {
        expect(excludedOwners(members, ["O1"], null, ["O1"])).toEqual([]);
    });
});
