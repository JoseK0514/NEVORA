/**
 * Plain payroll setup (Jose, Oct 25 2026): the Owner fills ordinary forms and the
 * server records the audit evidence itself. Every saved setup revision gets one
 * immutable NativeSetupRecord (who, when, revision, form version, plain statement
 * and a server-computed SHA-256 over all of it). The native calculator contracts are
 * unchanged: their evidence references, attestation flags and opening fingerprint
 * are produced here from that record, never typed by the Owner.
 *
 * Pure module: no I/O. profiles.server.ts reads the current state, calls these
 * builders and appends the results under the existing locks and revision guards.
 */
import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { stableExportJson } from "../../payroll-export/json";
import { PayrollError, uuid } from "../model";
import { hourlyRate, minor } from "./money";
import { parseConfiguration, parseYtd } from "./model";
import { OWNER_PAYROLL_POLICY } from "./provisional-policy";
import { PR_FINAL_PERIODIC_HALF_UP_GUIDANCE } from "./pr-income-cent-policy";
import { ORDINARY_PR_MINIMUM_2026 } from "./minimum-wage";
import type { NativeWorkweekPolicy } from "./workweek-policy";
import { NATIVE_FULL_CONTRACT_FORM_VERSION, NATIVE_PLAIN_SETUP_FORM_VERSION } from "./contracts";
import type { NativeBreakTreatment, NativeCompanyPayrollFacts, NativeConfiguration, NativeConfigurationRevision, NativeEmployerProgramCode, NativePlainOpening, NativePlainPayFacts, NativePlainSetupCommand, NativeSetupRecord, NativeSetupRecordKind, NativeTaxProfile, NativeWageProfile, NativeYtd } from "./contracts";

const ZONE = "America/Puerto_Rico";
export const EMPLOYER_PROGRAM_CODES: readonly NativeEmployerProgramCode[] = ["FUTA", "PR_UI", "CFSE"];
/** Federal and PR unemployment annual wage base. FUTA's documented maximum is 0.6%. */
const PROGRAM_CAP: Record<NativeEmployerProgramCode, string | null> = { FUTA: "700000", PR_UI: "700000", CFSE: null };
const PROGRAM_LABEL: Record<NativeEmployerProgramCode, string> = { FUTA: "FUTA", PR_UI: "PR unemployment", CFSE: "CFSE" };
const PROGRAM_MAX_BASIS_POINTS: Record<NativeEmployerProgramCode, number> = { FUTA: 600, PR_UI: 10000, CFSE: 10000 };
/** Statutory Puerto Rico SINOT employee share used for every plain-setup employee. */
const SINOT_EMPLOYEE_BASIS_POINTS = 30;
const PERSONAL = ["INDIVIDUAL_FULL", "MARRIED_JOINT_FULL", "MARRIED_HALF_OR_OPTIONAL_FULL", "NONE"] as const;

export const sha256 = (value: unknown) => createHash("sha256").update(stableExportJson(value)).digest("hex");

/* ---------------------------------------------------------------- parsing */

/** Field problems carry plain messages; the API returns them as issues. */
function invalid(path: string, message: string): never {
    throw new PayrollError("INVALID_PAY_SETUP", 400, [{ path, message }]);
}
function exactKeys(v: unknown, path: string, keys: string[], optional: string[] = []): Record<string, unknown> {
    if (v === null || typeof v !== "object" || Array.isArray(v))
        invalid(path, "Check these details.");
    const o = v as Record<string, unknown>;
    if (!Object.keys(o).every(k => keys.includes(k) || optional.includes(k)) || !keys.every(k => Object.hasOwn(o, k)))
        invalid(path, "Check these details.");
    return o;
}
const isDate = (v: unknown): v is string => {
    try { return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Temporal.PlainDate.from(v, { overflow: "reject" }).toString() === v; }
    catch { return false; }
};
const isText = (v: unknown, max = 200): v is string => typeof v === "string" && v.length > 0 && v.length <= max && v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v);
function count(v: unknown, path: string, max: number) {
    if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0 || v > max)
        invalid(path, `Enter a whole number from 0 to ${max}.`);
    return v;
}
function cents(v: unknown, path: string) {
    try { minor(v); }
    catch { invalid(path, "Enter an amount in dollars and cents."); }
    return v as string;
}
function revisionNumber(v: unknown, path: string, zero = true) {
    if (typeof v !== "number" || !Number.isSafeInteger(v) || v < (zero ? 0 : 1) || v > 2147483646)
        invalid(path, "Reload and try again.");
    return v;
}

export function parseCompanyFacts(v: unknown): NativeCompanyPayrollFacts {
    const o = exactKeys(v, "defaults", ["workweek", "employerPrograms", "breakPay", "includeOwners"]);
    if (o.workweek !== "STATUTORY_MONDAY_0001")
        invalid("defaults.workweek", "Confirm the workweek.");
    if (!Array.isArray(o.employerPrograms) || o.employerPrograms.length !== EMPLOYER_PROGRAM_CODES.length)
        invalid("defaults.employerPrograms", "Confirm FUTA, PR unemployment and CFSE.");
    const programs = (o.employerPrograms as unknown[]).map((raw, i) => {
        const p = exactKeys(raw, `defaults.employerPrograms.${i}`, ["code", "applies", "basisPoints"]);
        const code = EMPLOYER_PROGRAM_CODES[i];
        if (p.code !== code || typeof p.applies !== "boolean")
            invalid(`defaults.employerPrograms.${code}`, "Confirm whether this program applies.");
        if (p.applies) {
            if (typeof p.basisPoints !== "number" || !Number.isSafeInteger(p.basisPoints) || p.basisPoints < 0 || p.basisPoints > PROGRAM_MAX_BASIS_POINTS[code])
                invalid(`defaults.employerPrograms.${code}`, code === "FUTA" ? "Enter a FUTA rate from 0% to 0.6%." : "Enter your rate as a percent.");
        }
        else if (p.basisPoints !== null)
            invalid(`defaults.employerPrograms.${code}`, "Leave the rate empty when the program doesn't apply.");
        return { code, applies: p.applies as boolean, basisPoints: p.applies ? p.basisPoints as number : null };
    });
    if (!Array.isArray(o.breakPay) || o.breakPay.length > 100)
        invalid("defaults.breakPay", "Choose how each break type is paid.");
    const seen = new Set<string>();
    const breakPay = (o.breakPay as unknown[]).map((raw, i) => {
        const b = exactKeys(raw, `defaults.breakPay.${i}`, ["typeId", "treatment"]);
        if (!isText(b.typeId) || seen.has(b.typeId) || (b.treatment !== "PAID_REST" && b.treatment !== "UNPAID_RELIEVED_MEAL"))
            invalid(`defaults.breakPay.${i}`, "Choose how each break type is paid.");
        seen.add(b.typeId as string);
        return { typeId: b.typeId as string, treatment: b.treatment as NativeBreakTreatment };
    });
    if (typeof o.includeOwners !== "boolean")
        invalid("defaults.includeOwners", "Choose whether Owners are paid through payroll.");
    return { workweek: "STATUTORY_MONDAY_0001", employerPrograms: programs, breakPay, includeOwners: o.includeOwners as boolean };
}

export function parsePlainPay(v: unknown): NativePlainPayFacts {
    const o = exactKeys(v, "pay", ["hourlyRateMinor", "rateStartsOn", "withholding"]);
    try {
        hourlyRate(o.hourlyRateMinor);
    }
    catch {
        invalid("pay.hourlyRate", "Enter the hourly rate in dollars and cents.");
    }
    const rate = hourlyRate(o.hourlyRateMinor);
    if (rate.numerator < BigInt(ORDINARY_PR_MINIMUM_2026.minorPerHour) * rate.denominator)
        invalid("pay.hourlyRate", "The hourly rate must be at least the Puerto Rico minimum wage, $10.50.");
    if (!isDate(o.rateStartsOn) || o.rateStartsOn < "2026-01-01" || o.rateStartsOn > "2100-12-31")
        invalid("pay.rateStartsOn", "Enter the date this rate starts.");
    const w = exactKeys(o.withholding, "pay.withholding", ["personal", "fullDependents", "halfDependents", "deductionAllowances", "veteran", "extraWithholdingMinor"]);
    if (!PERSONAL.includes(w.personal as (typeof PERSONAL)[number]))
        invalid("pay.withholding.personal", "Choose the filing status from Form 499R-4.");
    if (typeof w.veteran !== "boolean")
        invalid("pay.withholding.veteran", "Choose whether the veteran exemption applies.");
    return {
        hourlyRateMinor: o.hourlyRateMinor as string,
        rateStartsOn: o.rateStartsOn as string,
        withholding: {
            personal: w.personal as (typeof PERSONAL)[number],
            fullDependents: count(w.fullDependents, "pay.withholding.fullDependents", 99),
            halfDependents: count(w.halfDependents, "pay.withholding.halfDependents", 99),
            deductionAllowances: count(w.deductionAllowances, "pay.withholding.deductionAllowances", 1000),
            veteran: w.veteran as boolean,
            extraWithholdingMinor: cents(w.extraWithholdingMinor, "pay.withholding.extraWithholding"),
        },
    };
}

export function parsePlainOpening(v: unknown): NativePlainOpening {
    const o = exactKeys(v, "opening.totals", ["kind"], ["grossMinor", "withheld", "employerPaid"]);
    if (o.kind === "FRESH") {
        exactKeys(v, "opening.totals", ["kind"]);
        return { kind: "FRESH" };
    }
    if (o.kind !== "MID_YEAR")
        invalid("opening.totals", "Choose how this year starts.");
    exactKeys(v, "opening.totals", ["kind", "grossMinor", "withheld", "employerPaid"]);
    const gross = cents(o.grossMinor, "opening.gross");
    const h = exactKeys(o.withheld, "opening.withheld", ["socialSecurityMinor", "medicareMinor", "prIncomeTaxMinor", "sinotMinor"]);
    const e = exactKeys(o.employerPaid, "opening.employerPaid", ["socialSecurityMinor", "medicareMinor", "sinotMinor", "futaMinor", "prUiMinor", "cfseMinor"]);
    const withheld = { socialSecurityMinor: cents(h.socialSecurityMinor, "opening.withheld.socialSecurity"), medicareMinor: cents(h.medicareMinor, "opening.withheld.medicare"), prIncomeTaxMinor: cents(h.prIncomeTaxMinor, "opening.withheld.prIncomeTax"), sinotMinor: cents(h.sinotMinor, "opening.withheld.sinot") };
    const employerPaid = { socialSecurityMinor: cents(e.socialSecurityMinor, "opening.employerPaid.socialSecurity"), medicareMinor: cents(e.medicareMinor, "opening.employerPaid.medicare"), sinotMinor: cents(e.sinotMinor, "opening.employerPaid.sinot"), futaMinor: cents(e.futaMinor, "opening.employerPaid.futa"), prUiMinor: cents(e.prUiMinor, "opening.employerPaid.prUi"), cfseMinor: cents(e.cfseMinor, "opening.employerPaid.cfse") };
    if (Object.values(withheld).reduce((sum, value) => sum + minor(value), BigInt(0)) > minor(gross))
        invalid("opening.withheld", "Taxes withheld can't be more than gross pay.");
    return { kind: "MID_YEAR", grossMinor: gross, withheld, employerPaid };
}

export const PLAIN_SETUP_ACTIONS = ["SAVE_COMPANY_PAYROLL_DEFAULTS", "SAVE_EMPLOYEE_PAY_SETUP"] as const;
export function isPlainSetupCommand(v: unknown): boolean {
    return v !== null && typeof v === "object" && !Array.isArray(v) && PLAIN_SETUP_ACTIONS.includes((v as { action?: unknown }).action as (typeof PLAIN_SETUP_ACTIONS)[number]);
}
/** Validate a plain setup command. No evidence, attestation or fingerprint field is accepted. */
export function parsePlainSetupCommand(v: unknown): NativePlainSetupCommand {
    const a = (v as { action?: unknown }).action;
    const c = exactKeys(v, "command", a === "SAVE_COMPANY_PAYROLL_DEFAULTS" ? ["action", "operationId", "expectedRevision", "defaults"] : ["action", "operationId", "expectedRevision", "employeeId", "pay", "opening"]);
    if (!uuid(c.operationId))
        throw new PayrollError("INVALID_OPERATION", 400);
    const expectedRevision = revisionNumber(c.expectedRevision, "expectedRevision");
    if (a === "SAVE_COMPANY_PAYROLL_DEFAULTS")
        return { action: a, operationId: c.operationId as string, expectedRevision, defaults: parseCompanyFacts(c.defaults) };
    if (a !== "SAVE_EMPLOYEE_PAY_SETUP" || !isText(c.employeeId))
        throw new PayrollError("INVALID_NATIVE_PROFILE", 400);
    let opening: Extract<NativePlainSetupCommand, { action: "SAVE_EMPLOYEE_PAY_SETUP" }>["opening"] = null;
    if (c.opening !== null) {
        const o = exactKeys(c.opening, "opening", ["taxYear", "expectedRevision", "totals"]);
        if (typeof o.taxYear !== "number" || !Number.isSafeInteger(o.taxYear) || o.taxYear < 2026 || o.taxYear > 2100)
            invalid("opening.taxYear", "Choose the tax year.");
        opening = { taxYear: o.taxYear as number, expectedRevision: revisionNumber(o.expectedRevision, "opening.expectedRevision"), totals: parsePlainOpening(o.totals) };
    }
    return { action: a, operationId: c.operationId as string, expectedRevision, employeeId: c.employeeId as string, pay: parsePlainPay(c.pay), opening };
}

/* ---------------------------------------------------------------- records */

const KIND_SLUG: Record<NativeSetupRecordKind, string> = { COMPANY_DEFAULTS: "company-defaults", EMPLOYEE_PAY: "employee-pay", OPENING_TOTALS: "opening-totals" };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Oct 25, 2026" in Puerto Rico time; deterministic so the statement can be re-verified. */
export function plainDate(instant: string) {
    const d = Temporal.Instant.from(instant).toZonedDateTimeISO(ZONE);
    return `${MONTHS[d.month - 1]} ${d.day}, ${d.year}`;
}
const ATTESTATIONS: Record<NativeSetupRecordKind, string> = {
    COMPANY_DEFAULTS: "Saving confirmed the company workweek (Monday 12:01 AM, Puerto Rico), which employer programs apply and their rates, how each break type is paid, and whether Owners are paid through payroll.",
    EMPLOYEE_PAY: "Saving confirmed this person's hourly rate and start date, and the Form 499R-4 withholding choices shown. NEVORA combined them with the company payroll defaults.",
    OPENING_TOTALS: "Saving confirmed this person's pay and taxes for the year before NEVORA's first payroll. Starting fresh records zero for every total.",
};
const FULL_CONTRACT_ATTESTATION = "Saved through the detailed payroll data interface, including the references supplied with it.";

export type SetupRecordInput = Omit<NativeSetupRecord, "version" | "statement" | "attestation" | "factsSha256" | "reference">;
/** Build the immutable record. The SHA-256 covers every field except itself and the reference. */
export function buildSetupRecord(input: SetupRecordInput): NativeSetupRecord {
    if (!isText(input.enteredBy.name, 200))
        throw new PayrollError("INVALID_NATIVE_PROFILE", 400);
    const body = {
        version: "NATIVE_SETUP_RECORD_V1" as const, ...input,
        statement: input.cause === "COMPANY_DEFAULTS_APPLIED"
            ? `Updated from company payroll defaults saved by ${input.enteredBy.name} on ${plainDate(input.enteredAt)}`
            : `Entered by ${input.enteredBy.name} on ${plainDate(input.enteredAt)}`,
        attestation: input.formVersion === NATIVE_FULL_CONTRACT_FORM_VERSION ? FULL_CONTRACT_ATTESTATION : ATTESTATIONS[input.kind],
    };
    const factsSha256 = sha256(body);
    return { ...body, factsSha256, reference: `nevora-setup:v1:${KIND_SLUG[input.kind]}:r${input.revision}:sha256:${factsSha256}` };
}
/** True only when the stored record still hashes to its own fingerprint and reference. */
export function verifySetupRecord(record: NativeSetupRecord): boolean {
    const { factsSha256, reference, ...body } = record;
    const expected = sha256(body);
    return factsSha256 === expected && reference === `nevora-setup:v1:${KIND_SLUG[record.kind]}:r${record.revision}:sha256:${expected}`;
}

/* --------------------------------------------------------- materialization */

export type PlainPayFactsRecord = {
    entered: NativePlainPayFacts;
    /** Rate history the server derived: earlier rates stay, a new start date replaces later ones. */
    rates: { startsOn: string; hourlyRateMinor: string }[];
};
/** Keep rates that start before the new one; the new rate replaces any on or after its date. */
export function nextRateHistory(previous: PlainPayFactsRecord["rates"] | null, entered: NativePlainPayFacts): PlainPayFactsRecord["rates"] {
    return [...(previous ?? []).filter(r => r.startsOn < entered.rateStartsOn), { startsOn: entered.rateStartsOn, hourlyRateMinor: entered.hourlyRateMinor }];
}
const prMidnight = (date: string) => Temporal.PlainDate.from(date).toZonedDateTime(ZONE).toInstant().toString();

/** The company workweek every plain employee inherits, as the calculator's policy contract. */
export function companyWorkweekPolicy(employeeId: string, company: NativeSetupRecord): NativeWorkweekPolicy {
    const confirmedYear = Temporal.Instant.from(company.enteredAt).toZonedDateTimeISO(ZONE).year;
    // The statutory default needs no notice, so it covers the whole prior and current year of recorded time.
    return { version: "PR_WORKWEEK_POLICY_V1", id: "company-statutory-workweek", revision: company.revision, employeeId, effectiveFrom: prMidnight(`${confirmedYear - 1}-01-01`), effectiveTo: null, boundary: { weekday: 1, startTime: "00:01", timeZone: ZONE }, federalWorkweek: "SAME_VERIFIED_BOUNDARY", federalEvidenceReference: company.reference, origin: { kind: "STATUTORY_DEFAULT", noticeAbsenceConfirmed: true, evidenceReference: company.reference } };
}

/** Employer-side wage bases already used this year, from the opening totals. */
const openingWageBase = (opening: NativeYtd | null, code: string) => opening && Object.hasOwn(opening.employerWagesMinor, code) ? opening.employerWagesMinor[code] : "0";

/** Combine one employee's plain facts with the company defaults into the unchanged
 * NEVORA_NATIVE_CONFIGURATION_V1 contract, with server references in every evidence field. */
export function materializeConfiguration(args: { employeeId: string; revision: number; rates: PlainPayFactsRecord["rates"]; withholding: NativePlainPayFacts["withholding"]; pay: NativeSetupRecord; company: NativeSetupRecord; companyFacts: NativeCompanyPayrollFacts; opening: NativeYtd | null; locationIds: string[]; deductions: NativeConfiguration["deductions"] }): NativeConfiguration {
    const { employeeId, revision, rates, withholding, pay, company, companyFacts, opening, locationIds } = args;
    if (!rates.length || !locationIds.length)
        throw new PayrollError("INVALID_NATIVE_PROFILE", 400);
    const workweekPolicy = companyWorkweekPolicy(employeeId, company);
    const wages: NativeWageProfile[] = rates.map((rate, i) => ({
        id: `rate-${rate.startsOn}`, revision, effectiveFrom: prMidnight(rate.startsOn), effectiveTo: rates[i + 1] ? prMidnight(rates[i + 1].startsOn) : null,
        locationIds: [...locationIds].sort(), hourlyRateMinor: rate.hourlyRateMinor, compensation: "HOURLY", employment: "PR_PRIVATE_NONEXEMPT", minimumWageCoverage: "PR_ACT_47_STANDARD_2026",
        overtime: "TIME_AND_HALF", dailyBasis: "CALENDAR_DAY", workweekAnchorDate: null, workweekStartTime: null, workweekPolicy, overtimeBasis: "WEIGHTED_WEEKLY",
        // Cents follow the Owner-authorized 2026 paycheck policy below, not a wage-level election.
        wageCentRounding: "UNVERIFIED",
        breakRules: companyFacts.breakPay.map(b => ({ typeId: b.typeId, treatment: b.treatment })),
        standardContextAttested: true, evidenceReference: pay.reference,
    }));
    const tax: NativeTaxProfile = {
        id: "withholding", revision, effectiveFrom: rates[0].startsOn, effectiveTo: null, coverage: "PR_REGULAR_TAXABLE_RESIDENT",
        certificate: { personal: withholding.personal, fullDependents: withholding.fullDependents, halfDependents: withholding.halfDependents, deductionAllowances: withholding.deductionAllowances, veteran: withholding.veteran, additionalMethod: "FIXED", additionalMinor: withholding.extraWithholdingMinor, additionalBasisPoints: null, wageDollarRounding: "NONE" },
        certificateReference: pay.reference, ficaCoverage: "STANDARD", sinotCoverage: "STANDARD", sinotEmployeeBasisPoints: SINOT_EMPLOYEE_BASIS_POINTS,
        prCentRounding: "HALF_UP", ruleEvidenceReference: PR_FINAL_PERIODIC_HALF_UP_GUIDANCE.id,
        employerContributions: companyFacts.employerPrograms.map(p => ({ code: p.code, label: PROGRAM_LABEL[p.code], applicability: p.applies ? "APPLICABLE" as const : "EXEMPT" as const, basisPoints: p.applies ? p.basisPoints : null, capMinor: p.applies ? PROGRAM_CAP[p.code] : null, wagesBeforeMinor: openingWageBase(opening, p.code), evidenceReference: company.reference })),
        employerCoverageAttested: true,
    };
    // Re-validate through the unchanged contract parser so a plain save can never store what payroll would reject.
    return parseConfiguration({ schema: "NEVORA_NATIVE_CONFIGURATION_V1", employeeId, wages, tax, deductions: args.deductions, calculationPolicyReference: OWNER_PAYROLL_POLICY.id });
}

/** Turn plain year-to-date totals into the unchanged NativeYtd contract. */
export function materializeOpening(args: { taxYear: number; revision: number; totals: NativePlainOpening; record: NativeSetupRecord; primaryLocationId: string }): NativeYtd {
    const { taxYear, revision, totals, record } = args;
    const zeroWages = Object.fromEntries(EMPLOYER_PROGRAM_CODES.map(code => [code, "0"]));
    if (totals.kind === "FRESH")
        return parseYtd({ year: taxYear, revision, evidenceReference: record.reference, attested: true, grossMinor: "0", netMinor: "0", socialSecurityWagesMinor: "0", medicareWagesMinor: "0", sinotWagesMinor: "0", deductions: {}, employerContributions: {}, ledgerFingerprint: record.factsSha256, locationIds: [], employerWagesMinor: zeroWages });
    const w = totals.withheld, e = totals.employerPaid, gross = totals.grossMinor;
    const net = (minor(gross) - minor(w.socialSecurityMinor) - minor(w.medicareMinor) - minor(w.prIncomeTaxMinor) - minor(w.sinotMinor)).toString();
    // In the supported standard scope every wage base equals gross pay so far.
    return parseYtd({ year: taxYear, revision, evidenceReference: record.reference, attested: true, grossMinor: gross, netMinor: net, socialSecurityWagesMinor: gross, medicareWagesMinor: gross, sinotWagesMinor: gross,
        deductions: { SOCIAL_SECURITY: w.socialSecurityMinor, MEDICARE: w.medicareMinor, PR_INCOME_TAX: w.prIncomeTaxMinor, SINOT: w.sinotMinor },
        employerContributions: { SOCIAL_SECURITY: e.socialSecurityMinor, MEDICARE: e.medicareMinor, SINOT: e.sinotMinor, FUTA: e.futaMinor, PR_UI: e.prUiMinor, CFSE: e.cfseMinor },
        ledgerFingerprint: record.factsSha256, locationIds: gross === "0" ? [] : [args.primaryLocationId], employerWagesMinor: Object.fromEntries(EMPLOYER_PROGRAM_CODES.map(code => [code, gross])) });
}

/** Default company break pay by break category: Rest is paid, Meal is an unpaid relieved meal. */
export function defaultBreakTreatment(category: string): NativeBreakTreatment {
    return category === "MEAL" ? "UNPAID_RELIEVED_MEAL" : "PAID_REST";
}

/** Whether a stored profile revision came from the plain setup form. */
export function isPlainProfile(revision: (NativeConfigurationRevision & { setupFormVersion?: unknown }) | null | undefined): boolean {
    return revision?.setupFormVersion === NATIVE_PLAIN_SETUP_FORM_VERSION;
}

/** Owners are left out of payroll unless the company defaults include them (B-09). */
export function ownersIncluded(company: { facts?: unknown } | null | undefined): boolean {
    const facts = company?.facts as Partial<NativeCompanyPayrollFacts> | undefined;
    return facts?.includeOwners === true;
}

/** B-09 population default: the members left out of payroll because they are Owners.
 * A correction keeps everyone its original run paid, so it never loses a paid Owner. */
export function excludedOwners(members: { employeeId: string; disposition: "INCLUDE" | "ZERO_TIME" | "EXCLUDE" }[], ownerIds: string[], company: { facts?: unknown } | null | undefined, correctedEmployeeIds: string[] = []): string[] {
    if (ownersIncluded(company))
        return [];
    return members.filter(m => m.disposition !== "EXCLUDE" && ownerIds.includes(m.employeeId) && !correctedEmployeeIds.includes(m.employeeId)).map(m => m.employeeId).sort();
}
