import { describe, expect, it } from "vitest";
import { prIncomeWithholding, fica2026, sinotContribution } from "./pr-2026";
const certificate = () => ({ personal: "INDIVIDUAL_FULL" as const, fullDependents: 0, halfDependents: 0, deductionAllowances: 0, veteran: false, additionalMethod: "FIXED" as const, additionalBasisPoints: null, wageDollarRounding: "NONE" as const, additionalMinor: "0" });
describe("published PR payroll-period tables, not annual tax brackets", () => {
    it.each([
        ["WEEKLY", "55000", "2182"],
        ["BIWEEKLY", "110000", "4360"],
        ["SEMIMONTHLY", "110000", "4048"],
        ["MONTHLY", "220000", "8106"],
    ] as const)("uses literal %s exemption and percentage table", (frequency, grossMinor, want) => {
        expect(prIncomeWithholding({ grossMinor, frequency, certificate: certificate(), rounding: "HALF_UP" })).toMatchObject({ amountMinor: want });
    });
    it("reproduces published monthly example with nineteen certificate allowances", () => {
        expect(prIncomeWithholding({ grossMinor: "420000", frequency: "MONTHLY", certificate: { ...certificate(), deductionAllowances: 19 }, rounding: "HALF_UP" })).toMatchObject({ amountMinor: "23843", exemptionMinor: "108050", taxableMinor: "311950" });
    });
    it("retains the half-cent discrepancy in published example one explicitly", () => {
        const input = { grossMinor: "220000", frequency: "MONTHLY" as const, certificate: { ...certificate(), deductionAllowances: 9 } };
        expect(prIncomeWithholding({ ...input, rounding: "TRUNCATE" })).toMatchObject({ amountMinor: "5491", exactTax: { numerator: "54915000", denominator: "10000" } });
        expect(prIncomeWithholding({ ...input, rounding: "HALF_UP" })).toMatchObject({ amountMinor: "5492" });
    });
    it("uses the published semimonthly allowance of 21 dollars", () => {
        expect(prIncomeWithholding({ grossMinor: "110000", frequency: "SEMIMONTHLY", certificate: { ...certificate(), deductionAllowances: 1 }, rounding: "HALF_UP" })).toMatchObject({ exemptionMinor: "16700", amountMinor: "3901" });
    });
    it("retains separately attested full and half dependent exemptions", () => {
        expect(prIncomeWithholding({ grossMinor: "55000", frequency: "WEEKLY", certificate: { ...certificate(), fullDependents: 1, halfDependents: 2 }, rounding: "HALF_UP" })).toMatchObject({ exemptionMinor: "16300", amountMinor: "1499" });
    });
    it("uses married full, veteran and certificate additional withholding", () => {
        expect(prIncomeWithholding({ grossMinor: "55000", frequency: "WEEKLY", certificate: { ...certificate(), personal: "MARRIED_JOINT_FULL", veteran: true, additionalMinor: "500" }, rounding: "HALF_UP" })).toMatchObject({ exemptionMinor: "16400", amountMinor: "1992" });
    });
    it("has explicit none rather than inferred exemption", () => {
        expect(prIncomeWithholding({ grossMinor: "50000", frequency: "WEEKLY", certificate: { ...certificate(), personal: "NONE" }, rounding: "HALF_UP" })).toMatchObject({ amountMinor: "2420", exemptionMinor: "0" });
    });
    it.each(["17310", "48080", "79810", "118270"])("keeps published inclusive bracket boundaries %s", grossMinor => {
        const want: Record<string, string> = { "17310": "0", "48080": "2156", "79810": "6593", "118270": "16208" };
        expect(prIncomeWithholding({ grossMinor, frequency: "WEEKLY", certificate: { ...certificate(), personal: "NONE" }, rounding: "HALF_UP" }).amountMinor).toBe(want[grossMinor]);
    });
    it.each([undefined, null, ["WEEKLY"], new String("WEEKLY"), "ANNUAL"])("rejects unknown or coerced frequency %j", frequency => {
        expect(() => prIncomeWithholding({ grossMinor: "55000", frequency, certificate: certificate(), rounding: "HALF_UP" } as never)).toThrow("INVALID_NATIVE_RULE_INPUT");
    });
    it.each([undefined, null, ["INDIVIDUAL_FULL"], new String("NONE"), "EXEMPT"])("rejects unknown or coerced certificate personal election %j", personal => {
        expect(() => prIncomeWithholding({ grossMinor: "55000", frequency: "WEEKLY", certificate: { ...certificate(), personal }, rounding: "HALF_UP" } as never)).toThrow("INVALID_NATIVE_RULE_INPUT");
    });
    it.each([undefined, null, ["HALF_UP"], "UNVERIFIED"])("requires an explicit cent rounding decision %j", rounding => {
        expect(() => prIncomeWithholding({ grossMinor: "55000", frequency: "WEEKLY", certificate: certificate(), rounding } as never)).toThrow("INVALID_NATIVE_RULE_INPUT");
    });
    it.each([1, "01", "-1", "1.00", ["1"], null])("rejects malformed cents %j", grossMinor => {
        expect(() => prIncomeWithholding({ grossMinor, frequency: "WEEKLY", certificate: certificate(), rounding: "HALF_UP" } as never)).toThrow("INVALID_NATIVE_RULE_INPUT");
    });
    it("does not convert zero gross into absent input", () => {
        expect(prIncomeWithholding({ grossMinor: "0", frequency: "MONTHLY", certificate: certificate(), rounding: "HALF_UP" }).amountMinor).toBe("0");
    });
});
describe("2026 FICA employer-year facts", () => {
    it("caps social security independently from unlimited Medicare", () => {
        expect(fica2026({ grossMinor: "200000", socialSecurityWagesBeforeMinor: "18400000", medicareWagesBeforeMinor: "19900000", payday: "2026-10-16" })).toEqual({ socialSecurityMinor: "3100", medicareMinor: "2900", additionalMedicareMinor: "900", employerSocialSecurityMinor: "3100", employerMedicareMinor: "2900", socialSecurityTaxableMinor: "50000", medicareTaxableMinor: "200000", additionalMedicareTaxableMinor: "100000" });
    });
    it("does not match employee-only Additional Medicare", () => {
        expect(fica2026({ grossMinor: "100000", socialSecurityWagesBeforeMinor: "20000000", medicareWagesBeforeMinor: "20000000", payday: "2026-12-31" })).toMatchObject({ socialSecurityMinor: "0", medicareMinor: "1450", additionalMedicareMinor: "900", employerMedicareMinor: "1450" });
    });
    it("uses exact cent rounding for fractional FICA cents", () => {
        expect(fica2026({ grossMinor: "100", socialSecurityWagesBeforeMinor: "0", medicareWagesBeforeMinor: "0", payday: "2026-01-01" })).toMatchObject({ socialSecurityMinor: "6", medicareMinor: "1" });
    });
    it.each(["2025-12-31", "2027-01-01", "2026-02-30"])("blocks unsupported/invalid pay date %s", payday => {
        expect(() => fica2026({ grossMinor: "100000", socialSecurityWagesBeforeMinor: "0", medicareWagesBeforeMinor: "0", payday })).toThrow("RULESET_NOT_APPLICABLE");
    });
    it("never silently assumes opening YTD is zero", () => {
        expect(() => fica2026({ grossMinor: "100000", medicareWagesBeforeMinor: "0", payday: "2026-10-16" } as never)).toThrow("INVALID_NATIVE_RULE_INPUT");
    });
});
describe("SINOT attested employee allocation", () => {
    it("caps 0.60 percent on remaining 9000 dollar wages and at most 0.30 percent employee share", () => {
        expect(sinotContribution({ grossMinor: "200000", wagesBeforeMinor: "899000", employeeBasisPoints: 30 })).toEqual({ taxableMinor: "1000", employeeMinor: "3", employerMinor: "3" });
    });
    it("supports expressly employer-paid coverage without deducting its contribution", () => {
        expect(sinotContribution({ grossMinor: "100000", wagesBeforeMinor: "0", employeeBasisPoints: 0 })).toEqual({ taxableMinor: "100000", employeeMinor: "0", employerMinor: "600" });
    });
    it.each([undefined, null, -1, 31, [30]])("refuses guessed/invalid SINOT allocation %j", employeeBasisPoints => {
        expect(() => sinotContribution({ grossMinor: "100000", wagesBeforeMinor: "0", employeeBasisPoints } as never)).toThrow("INVALID_NATIVE_RULE_INPUT");
    });
});
it("matches independent P12 percentage certificate additional withholding", () => { expect(prIncomeWithholding({ grossMinor: "100000", frequency: "WEEKLY", certificate: { ...certificate(), additionalMethod: "PERCENTAGE", additionalMinor: null, additionalBasisPoints: 100, wageDollarRounding: "NONE" }, rounding: "HALF_UP" }).amountMinor).toBe("10965"); });
it("separates optional wage-dollar rounding from tax-cent quantization", () => { const c = { ...certificate(), wageDollarRounding: "NEAREST_DOLLAR" }; expect(prIncomeWithholding({ grossMinor: "55049", frequency: "WEEKLY", certificate: c, rounding: "HALF_UP" }).amountMinor).toBe("2182"); expect(prIncomeWithholding({ grossMinor: "55050", frequency: "WEEKLY", certificate: c, rounding: "HALF_UP" }).amountMinor).toBe("2196"); });
it("blocks a malformed percentage certificate without defaulting a fixed amount", () => { expect(() => prIncomeWithholding({ grossMinor: "100000", frequency: "WEEKLY", certificate: { ...certificate(), additionalMethod: "PERCENTAGE", additionalMinor: "0", additionalBasisPoints: "100", wageDollarRounding: "NONE" }, rounding: "HALF_UP" })).toThrow("INVALID_NATIVE_RULE_INPUT"); });
