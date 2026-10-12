import { Temporal } from "@js-temporal/polyfill";
import type { NativeConfiguration, NativeProfileCommand, NativeWageProfile, NativeTaxProfile, NativeYtd, NativeAuthorizedDeduction } from "./contracts";
import { PayrollError, uuid } from "../model";
import { hourlyRate, minor } from "./money";
import { validateEmployerCoverage } from "./obligations";
import { prIncomeWithholding } from "./rules/pr-2026";
const invalid = (): never => { throw new PayrollError("INVALID_NATIVE_PROFILE", 400); };
const check = (v: unknown) => { if (!v)
    invalid(); };
function object(v: unknown, keys: string[]): Record<string, unknown> { check(v !== null && typeof v === "object" && !Array.isArray(v)); const o = v as Record<string, unknown>; check(Object.keys(o).every(k => keys.includes(k)) && keys.every(k => Object.hasOwn(o, k))); return o; }
function text(v: unknown, max = 300): v is string { return typeof v === "string" && v.length > 0 && v.length <= max && v.trim() === v && !/[\u0000-\u001f\u007f]/.test(v); }
function revision(v: unknown, zero = false) { check(typeof v === "number" && Number.isSafeInteger(v) && v >= (zero ? 0 : 1) && v <= 2147483646); }
function date(v: unknown): v is string { try {
    return typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && Temporal.PlainDate.from(v, { overflow: "reject" }).toString() === v;
}
catch {
    return false;
} }
function instant(v: unknown): v is string { try {
    return typeof v === "string" && v.length <= 40 && /T/.test(v) && !!Temporal.Instant.from(v);
}
catch {
    return false;
} }
const code = (v: unknown): v is string => typeof v === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(v);
function strings(v: unknown, empty = false): string[] { check(Array.isArray(v) && v.length <= 300 && (empty || v.length > 0) && v.every(x => text(x, 200) && x !== "*") && new Set(v).size === v.length); return v as string[]; }
function moneyMap(v: unknown) { check(v !== null && typeof v === "object" && !Array.isArray(v)); const o = v as Record<string, unknown>; check(Object.keys(o).length <= 100 && Object.keys(o).every(code)); for (const value of Object.values(o))
    minor(value); }
export function parseWage(v: unknown): NativeWageProfile {
    const w = object(v, ["id", "revision", "effectiveFrom", "effectiveTo", "locationIds", "hourlyRateMinor", "compensation", "employment", "overtime", "dailyBasis", "workweekAnchorDate", "workweekStartTime", "overtimeBasis", "wageCentRounding", "breakRules", "standardContextAttested", "evidenceReference"]);
    check(text(w.id, 200) && text(w.evidenceReference));
    revision(w.revision);
    strings(w.locationIds);
    hourlyRate(w.hourlyRateMinor);
    check(instant(w.effectiveFrom) && (w.effectiveTo === null || (instant(w.effectiveTo) && Temporal.Instant.compare(w.effectiveTo, w.effectiveFrom) > 0)));
    check(w.compensation === "HOURLY" && w.employment === "PR_PRIVATE_NONEXEMPT" && w.dailyBasis === "CALENDAR_DAY" && (w.overtime === "TIME_AND_HALF" || w.overtime === "DOUBLE_PRESERVED") && date(w.workweekAnchorDate) && w.workweekStartTime === "00:00" && w.overtimeBasis === "WEIGHTED_WEEKLY" && (w.wageCentRounding === "HALF_UP" || w.wageCentRounding === "UNVERIFIED") && w.standardContextAttested === true);
    check(Array.isArray(w.breakRules) && w.breakRules.length <= 100);
    const ids = new Set();
    for (const raw of w.breakRules as unknown[]) {
        const b = object(raw, ["typeId", "treatment"]);
        check(text(b.typeId, 200) && !ids.has(b.typeId) && (b.treatment === "PAID_REST" || b.treatment === "UNPAID_RELIEVED_MEAL"));
        ids.add(b.typeId);
    }
    return structuredClone(v) as NativeWageProfile;
}
export function parseTax(v: unknown): NativeTaxProfile {
    const t = object(v, ["id", "revision", "effectiveFrom", "effectiveTo", "coverage", "certificate", "certificateReference", "ficaCoverage", "sinotCoverage", "sinotEmployeeBasisPoints", "prCentRounding", "ruleEvidenceReference", "employerContributions", "employerCoverageAttested"]);
    check(text(t.id, 200) && text(t.certificateReference) && text(t.ruleEvidenceReference));
    revision(t.revision);
    check(date(t.effectiveFrom) && (t.effectiveTo === null || (date(t.effectiveTo) && t.effectiveTo > t.effectiveFrom)));
    check(t.coverage === "PR_REGULAR_TAXABLE_RESIDENT" && t.ficaCoverage === "STANDARD" && t.sinotCoverage === "STANDARD" && typeof t.sinotEmployeeBasisPoints === "number" && Number.isSafeInteger(t.sinotEmployeeBasisPoints) && t.sinotEmployeeBasisPoints >= 0 && t.sinotEmployeeBasisPoints <= 30 && ["HALF_UP", "TRUNCATE", "UNVERIFIED"].some(x => x === t.prCentRounding));
    const cert = object(t.certificate, ["personal", "fullDependents", "halfDependents", "deductionAllowances", "veteran", "additionalMethod", "additionalMinor", "additionalBasisPoints", "wageDollarRounding"]);
    prIncomeWithholding({ grossMinor: "0", frequency: "WEEKLY", certificate: cert, rounding: "HALF_UP" });
    check(Array.isArray(t.employerContributions));
    for (const value of t.employerContributions as unknown[])
        object(value, ["code", "label", "applicability", "basisPoints", "capMinor", "wagesBeforeMinor", "evidenceReference"]);
    validateEmployerCoverage(t as NativeTaxProfile);
    return structuredClone(v) as NativeTaxProfile;
}
export function parseDeduction(v: unknown): NativeAuthorizedDeduction {
    const d = object(v, ["id", "revision", "code", "label", "effectiveFrom", "effectiveTo", "method", "amountMinor", "basisPoints", "capMinor", "deductedBeforeMinor", "authorization", "authorizationReference", "revoked", "legalBasis", "complianceReference", "employerContributionCode"]);
    check(text(d.id, 200) && code(d.code) && text(d.label) && date(d.effectiveFrom) && (d.effectiveTo === null || (date(d.effectiveTo) && d.effectiveTo > d.effectiveFrom)));
    revision(d.revision);
    minor(d.deductedBeforeMinor);
    if (d.capMinor !== null)
        minor(d.capMinor);
    check(d.authorization === "WRITTEN_POST_TAX" && text(d.authorizationReference) && text(d.complianceReference) && typeof d.revoked === "boolean");
    check((d.method === "FIXED" && d.basisPoints === null && typeof d.amountMinor === "string") || (d.method === "PERCENTAGE" && d.amountMinor === null && typeof d.basisPoints === "number" && Number.isSafeInteger(d.basisPoints) && d.basisPoints >= 0 && d.basisPoints <= 10000));
    if (d.method === "FIXED")
        minor(d.amountMinor);
    check((d.legalBasis === "PR_LAW_17_5_C" && d.method === "FIXED" && d.employerContributionCode === null) || (d.legalBasis === "PR_LAW_17_5_G" && code(d.employerContributionCode)));
    return structuredClone(v) as NativeAuthorizedDeduction;
}
export function parseYtd(v: unknown): NativeYtd {
    const y = object(v, ["year", "revision", "evidenceReference", "attested", "grossMinor", "netMinor", "socialSecurityWagesMinor", "medicareWagesMinor", "sinotWagesMinor", "deductions", "employerContributions", "ledgerFingerprint", "locationIds", "employerWagesMinor"]);
    check(typeof y.year === "number" && Number.isSafeInteger(y.year) && y.year >= 2026 && y.year <= 2100 && y.attested === true && text(y.evidenceReference));
    revision(y.revision);
    for (const k of ["grossMinor", "netMinor", "socialSecurityWagesMinor", "medicareWagesMinor", "sinotWagesMinor"])
        minor(y[k]);
    check(minor(y.netMinor) <= minor(y.grossMinor) && typeof y.ledgerFingerprint === "string" && /^[a-f0-9]{64}$/.test(y.ledgerFingerprint));
    strings(y.locationIds, true);
    check(y.grossMinor === "0" || (y.locationIds as string[]).length > 0);
    moneyMap(y.deductions);
    moneyMap(y.employerContributions);
    moneyMap(y.employerWagesMinor);
    return structuredClone(v) as NativeYtd;
}
export function parseConfiguration(v: unknown): NativeConfiguration {
    const c = object(v, ["schema", "employeeId", "wages", "tax", "deductions"]);
    check(c.schema === "NEVORA_NATIVE_CONFIGURATION_V1" && text(c.employeeId, 200));
    check(Array.isArray(c.wages) && c.wages.length > 0 && c.wages.length <= 100 && Array.isArray(c.deductions) && c.deductions.length <= 90);
    const wages = (c.wages as unknown[]).map(parseWage);
    check(new Set(wages.map(w => w.id)).size === wages.length);
    for (let i = 0; i < wages.length; i++)
        for (let j = i + 1; j < wages.length; j++) {
            const a = wages[i], b = wages[j];
            check(!a.locationIds.some(id => b.locationIds.includes(id)) || (a.effectiveTo !== null && Temporal.Instant.compare(a.effectiveTo, b.effectiveFrom) <= 0) || (b.effectiveTo !== null && Temporal.Instant.compare(b.effectiveTo, a.effectiveFrom) <= 0));
        }
    if (c.tax !== null)
        parseTax(c.tax);
    const deductions = (c.deductions as unknown[]).map(parseDeduction);
    check(new Set(deductions.map(d => d.id)).size === deductions.length && new Set(deductions.map(d => d.code)).size === deductions.length);
    return structuredClone(v) as NativeConfiguration;
}
export function parseNativeProfileCommand(v: unknown): NativeProfileCommand {
    try {
        check(v !== null && typeof v === "object" && !Array.isArray(v));
        const a = (v as Record<string, unknown>).action;
        const common = ["action", "operationId", "reason", "expectedRevision"];
        const c = object(v, common.concat(a === "SAVE_NATIVE_PROFILE" ? ["configuration"] : a === "ATTEST_OPENING_YTD" ? ["employeeId", "ytd"] : a === "SET_MANAGER_SCOPE" ? ["employeeId", "review", "approve", "locationIds"] : []));
        check(uuid(c.operationId) && text(c.reason));
        revision(c.expectedRevision, true);
        if (a === "SAVE_NATIVE_PROFILE")
            parseConfiguration(c.configuration);
        else if (a === "ATTEST_OPENING_YTD") {
            check(text(c.employeeId, 200));
            parseYtd(c.ytd);
            check((c.ytd as NativeYtd).revision === (c.expectedRevision as number) + 1);
        }
        else if (a === "SET_MANAGER_SCOPE") {
            check(text(c.employeeId, 200) && typeof c.review === "boolean" && typeof c.approve === "boolean" && (!c.approve || c.review));
            strings(c.locationIds, !c.review && !c.approve);
        }
        else
            invalid();
        return structuredClone(v) as NativeProfileCommand;
    }
    catch {
        return invalid();
    }
}
