import { Temporal } from "@js-temporal/polyfill";
export type NativeFrequency = "WEEKLY" | "BIWEEKLY" | "SEMIMONTHLY" | "MONTHLY";
export type PrCertificate = {
    personal: "INDIVIDUAL_FULL" | "MARRIED_JOINT_FULL" | "MARRIED_HALF_OR_OPTIONAL_FULL" | "NONE";
    fullDependents: number;
    halfDependents: number;
    deductionAllowances: number;
    veteran: boolean;
    additionalMinor: string;
};
export type NativeCentRounding = "HALF_UP" | "TRUNCATE";
/** Pinned official documents are retained in the author's rule evidence packet.
 * This pure module does not activate payroll or determine employee eligibility.
 * PR sub-cent rounding has a published half-cent discrepancy; the caller must
 * supply an independently accepted rule choice, never infer one from a value. */
export const PR_2026_RULE_SOURCES = Object.freeze({
    income: { url: "https://hacienda.pr.gov/sites/default/files/tablas_retencion_2017_2.pdf", sha256: "82626b9ad4b39e20ec71e8e63e2c2ff7feaa8abc18c344c7aa31d6d57385ef8e", pages: [27, 28, 29], effectiveFrom: "2017-01-01" },
    fica: { url: "https://www.irs.gov/pub/irs-pdf/p15.pdf", sha256: "b46c3622439d8521e3a0faca4cd5b5ece3451b526f65f06a5e38d5c9f804c88b", taxYear: 2026 },
    sinot: { url: "https://www.trabajo.pr.gov/sinot.asp", sha256: "bc804f784087d8dbcfce0678a00fe67c3a5afbbc9d9beb469d773549dfe5666d" },
});
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
function invalid(): never { throw Error("INVALID_NATIVE_RULE_INPUT"); }
function minor(v: unknown): bigint {
    if (typeof v !== "string" || !/^(0|[1-9][0-9]{0,14})$/.test(v))
        return invalid();
    return BigInt(v);
}
function count(v: unknown, max = 99): number {
    if (typeof v !== "number" || !Number.isSafeInteger(v) || v < 0 || v > max)
        return invalid();
    return v;
}
function rounded(n: bigint, denominator: bigint, mode: NativeCentRounding): bigint {
    if (n < BigInt(0) || denominator <= BigInt(0))
        return invalid();
    return mode === "HALF_UP" ? (n + denominator / BigInt(2)) / denominator : n / denominator;
}
const max = (a: bigint, b: bigint) => a > b ? a : b;
const min = (a: bigint, b: bigint) => a < b ? a : b;
// Literal cents from Appendix 1, including its published period rounding.
const exemptions = {
    WEEKLY: [6700, 13500, 2900, 4800, 2400, 950],
    BIWEEKLY: [13500, 27000, 5750, 9600, 4800, 1900],
    SEMIMONTHLY: [14600, 29200, 6250, 10400, 5200, 2100],
    MONTHLY: [29200, 58300, 12500, 20800, 10400, 4150],
} as const;
// Appendix 2: inclusive upper bound, percentage basis points, subtraction cents.
const brackets: Record<NativeFrequency, readonly (readonly [
    number | null,
    number,
    number
])[]> = {
    WEEKLY: [[17310, 0, 0], [48080, 700, 1210], [79810, 1400, 4580], [118270, 2500, 13360], [null, 3300, 22820]],
    BIWEEKLY: [[34620, 0, 0], [96150, 700, 2420], [159620, 1400, 9150], [236540, 2500, 26710], [null, 3300, 45630]],
    SEMIMONTHLY: [[37500, 0, 0], [104170, 700, 2630], [172920, 1400, 9920], [256250, 2500, 28940], [null, 3300, 49440]],
    MONTHLY: [[75000, 0, 0], [208330, 700, 5250], [345830, 1400, 19830], [512500, 2500, 57870], [null, 3300, 98870]],
};
export function prIncomeWithholding(input: unknown) {
    if (!record(input) || typeof input.frequency !== "string" || !Object.hasOwn(exemptions, input.frequency) || !record(input.certificate) || (input.rounding !== "HALF_UP" && input.rounding !== "TRUNCATE"))
        return invalid();
    const c = input.certificate, gross = minor(input.grossMinor), additional = minor(c.additionalMinor);
    if (typeof c.personal !== "string" || !["INDIVIDUAL_FULL", "MARRIED_JOINT_FULL", "MARRIED_HALF_OR_OPTIONAL_FULL", "NONE"].includes(c.personal) || typeof c.veteran !== "boolean")
        return invalid();
    const full = count(c.fullDependents), half = count(c.halfDependents), allowances = count(c.deductionAllowances, 1000);
    const f = input.frequency as NativeFrequency, [single, married, veteran, dependent, shared, allowance] = exemptions[f];
    const exemption = BigInt(c.personal === "NONE" ? 0 : c.personal === "MARRIED_JOINT_FULL" ? married : single)
        + BigInt(c.veteran ? veteran : 0) + BigInt(dependent) * BigInt(full) + BigInt(shared) * BigInt(half) + BigInt(allowance) * BigInt(allowances);
    const taxable = max(BigInt(0), gross - exemption);
    const [, bp, subtract] = brackets[f].find(([upper]) => upper === null || taxable <= BigInt(upper))!;
    const numerator = max(BigInt(0), taxable * BigInt(bp) - BigInt(subtract) * BigInt(10000)) + additional * BigInt(10000);
    return { amountMinor: rounded(numerator, BigInt(10000), input.rounding).toString(), exemptionMinor: exemption.toString(), taxableMinor: taxable.toString(), exactTax: { numerator: numerator.toString(), denominator: "10000" }, rounding: input.rounding };
}
function applicable2026(payday: unknown) {
    try {
        if (typeof payday !== "string" || !/^2026-[0-9]{2}-[0-9]{2}$/.test(payday) || Temporal.PlainDate.from(payday, { overflow: "reject" }).toString() !== payday)
            throw Error();
    }
    catch {
        throw Error("RULESET_NOT_APPLICABLE");
    }
}
export function fica2026(input: unknown) {
    if (!record(input))
        return invalid();
    applicable2026(input.payday);
    const gross = minor(input.grossMinor), ssBefore = minor(input.socialSecurityWagesBeforeMinor), medicareBefore = minor(input.medicareWagesBeforeMinor);
    const ssTaxable = min(gross, max(BigInt(0), BigInt(18450000) - ssBefore));
    const additionalTaxable = max(BigInt(0), medicareBefore + gross - BigInt(20000000)) - max(BigInt(0), medicareBefore - BigInt(20000000));
    const ss = rounded(ssTaxable * BigInt(620), BigInt(10000), "HALF_UP").toString(), medicare = rounded(gross * BigInt(145), BigInt(10000), "HALF_UP").toString();
    return { socialSecurityMinor: ss, medicareMinor: medicare, additionalMedicareMinor: rounded(additionalTaxable * BigInt(90), BigInt(10000), "HALF_UP").toString(), employerSocialSecurityMinor: ss, employerMedicareMinor: medicare, socialSecurityTaxableMinor: ssTaxable.toString(), medicareTaxableMinor: gross.toString(), additionalMedicareTaxableMinor: additionalTaxable.toString() };
}
export function sinotContribution(input: unknown) {
    if (!record(input))
        return invalid();
    const gross = minor(input.grossMinor), before = minor(input.wagesBeforeMinor), employeeRate = count(input.employeeBasisPoints, 30);
    const taxable = min(gross, max(BigInt(0), BigInt(900000) - before));
    const employee = rounded(taxable * BigInt(employeeRate), BigInt(10000), "HALF_UP"), employer = rounded(taxable * BigInt(60 - employeeRate), BigInt(10000), "HALF_UP");
    return { taxableMinor: taxable.toString(), employeeMinor: employee.toString(), employerMinor: employer.toString() };
}
