import type { NativeAuthorizedDeduction, NativePayrollInput, NativeTaxProfile } from "./contracts";
import { exactMinor, halfUp, minor, ratio, type NativeExactnessOperation } from "./money";
import { fail } from "./time";
const STANDARD_EMPLOYER_CODES = ["FUTA", "PR_UI", "CFSE"];
const validText = (value: unknown) => typeof value === "string" && value.trim() === value && value.length > 0 && value.length <= 300 && !/[\u0000-\u001f\u007f]/.test(value);
const validCode = (value: unknown): value is string => typeof value === "string" && /^[A-Z][A-Z0-9_]{0,79}$/.test(value);
export function validateEmployerCoverage(tax: NativeTaxProfile) {
    if (tax.employerCoverageAttested !== true || !Array.isArray(tax.employerContributions) || tax.employerContributions.length > 90)
        fail("EMPLOYER_COVERAGE_REQUIRED");
    const codes = new Set<string>();
    for (const item of tax.employerContributions) {
        if (!validCode(item.code) || codes.has(item.code) || ["SOCIAL_SECURITY", "MEDICARE", "SINOT"].includes(item.code) || !validText(item.label) || !validText(item.evidenceReference))
            fail("EMPLOYER_COVERAGE_REQUIRED");
        codes.add(item.code);
        minor(item.wagesBeforeMinor);
        if (item.applicability === "EXEMPT") {
            if (item.basisPoints !== null || item.capMinor !== null)
                fail("EMPLOYER_COVERAGE_REQUIRED");
        }
        else if (item.applicability === "APPLICABLE") {
            if (typeof item.basisPoints !== "number" || !Number.isSafeInteger(item.basisPoints) || item.basisPoints < 0 || item.basisPoints > 10000)
                fail("EMPLOYER_COVERAGE_REQUIRED");
            if (item.capMinor !== null)
                minor(item.capMinor);
            // FUTA uses the documented actual credit-adjusted rate and federal wage base.
            if (item.code === "FUTA" && (item.capMinor !== "700000" || item.basisPoints > 600))
                fail("UNSUPPORTED_EMPLOYER_RULE");
        }
        else
            fail("EMPLOYER_COVERAGE_REQUIRED");
    }
    if (STANDARD_EMPLOYER_CODES.some(code => !codes.has(code)))
        fail("EMPLOYER_COVERAGE_REQUIRED");
}
export function employerAmounts(tax: NativeTaxProfile, gross: bigint, exactnessOperations?: NativeExactnessOperation[]) {
    return tax.employerContributions.filter(item => item.applicability === "APPLICABLE").map(item => {
        const left = item.capMinor === null ? gross : minor(item.capMinor) - minor(item.wagesBeforeMinor);
        const taxable = left < BigInt(0) ? BigInt(0) : left > gross ? gross : left;
        return { code: item.code, label: item.label, amountMinor: (exactnessOperations ? exactMinor(ratio(taxable * BigInt(item.basisPoints!), BigInt(10000)), exactnessOperations, "EMPLOYER_ASSESSMENT", item.code) : halfUp(ratio(taxable * BigInt(item.basisPoints!), BigInt(10000)))).toString() };
    });
}
export function authorizedAmounts(input: NativePayrollInput, gross: bigint, statutoryCodes: string[], employer: {
    code: string;
    amountMinor: string;
}[], exactnessOperations?: NativeExactnessOperation[]) {
    const codes = new Set(statutoryCodes), ids = new Set<string>();
    const output: {
        code: string;
        label: string;
        amountMinor: string;
    }[] = [];
    for (const d of input.deductions) {
        if (!validCode(d.code) || codes.has(d.code) || !validText(d.id) || ids.has(d.id))
            fail("DUPLICATE_DEDUCTION_CODE", d.id);
        codes.add(d.code);
        ids.add(d.id);
        if (d.authorization !== "WRITTEN_POST_TAX" || !validText(d.authorizationReference) || !validText(d.complianceReference) || !validText(d.label) || typeof d.revoked !== "boolean")
            fail("DEDUCTION_AUTHORITY_REQUIRED", d.id);
        if (d.revoked || d.effectiveFrom > input.payday || (d.effectiveTo !== null && d.effectiveTo <= input.payday))
            continue;
        let amount: bigint;
        if (d.method === "FIXED" && d.basisPoints === null)
            amount = minor(d.amountMinor);
        else if (d.method === "PERCENTAGE" && d.amountMinor === null && typeof d.basisPoints === "number" && Number.isSafeInteger(d.basisPoints) && d.basisPoints >= 0 && d.basisPoints <= 10000)
            amount = exactnessOperations ? exactMinor(ratio(gross * BigInt(d.basisPoints), BigInt(10000)), exactnessOperations, "AUTHORIZED_DEDUCTION", d.id) : halfUp(ratio(gross * BigInt(d.basisPoints), BigInt(10000)));
        else
            fail("UNSUPPORTED_DEDUCTION", d.id);
        const before = minor(d.deductedBeforeMinor);
        if (d.capMinor !== null) {
            const remaining = minor(d.capMinor) - before;
            amount = remaining < BigInt(0) ? BigInt(0) : remaining < amount ? remaining : amount;
        }
        validateDeductionBasis(d, amount, employer);
        output.push({ code: d.code, label: d.label, amountMinor: amount.toString() });
    }
    return output;
}
function validateDeductionBasis(d: NativeAuthorizedDeduction, amount: bigint, employer: {
    code: string;
    amountMinor: string;
}[]) {
    // Attestation references retain recipient, bond, remittance and approval facts;
    // this calculator never sends funds or infers legal authority from a signature.
    if (d.legalBasis === "PR_LAW_17_5_C") {
        if (d.method !== "FIXED" || d.employerContributionCode !== null)
            fail("UNSUPPORTED_DEDUCTION", d.id);
    }
    else if (d.legalBasis === "PR_LAW_17_5_G") {
        if (!validCode(d.employerContributionCode))
            fail("DEDUCTION_AUTHORITY_REQUIRED", d.id);
        const match = employer.find(item => item.code === d.employerContributionCode);
        if (!match || minor(match.amountMinor) < amount)
            fail("INSURANCE_EMPLOYER_MATCH_REQUIRED", d.id);
    }
    else
        fail("UNSUPPORTED_DEDUCTION", d.id);
}
