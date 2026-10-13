import { describe, expect, it } from "vitest";
import { calculateNativePayroll } from "./calculate";
import type { NativeAuthorizedDeduction, NativePayrollInput, NativePayrollReady } from "./contracts";
import { input, entry } from "./fixtures.test-support";
const ready = (i: NativePayrollInput): NativePayrollReady => {
    const r = calculateNativePayroll(i);
    expect(r.state, JSON.stringify(r)).toBe("ready");
    if (r.state !== "ready")
        throw Error("blocked");
    return r;
};
const deduction = (): NativeAuthorizedDeduction => ({ id: "D1", revision: 1, code: "COOP", label: "Cooperative loan", effectiveFrom: "2026-01-01", effectiveTo: null, method: "FIXED", amountMinor: "1000", basisPoints: null, capMinor: "5000", deductedBeforeMinor: "0", authorization: "WRITTEN_POST_TAX", authorizationReference: "Fictional signed employee deduction election", revoked: false, legalBasis: "PR_LAW_17_5_C", complianceReference: "Fictional PR cooperative/bond/remittance compliance attestation", employerContributionCode: null });
describe("native payroll exact money and explicit obligations", () => {
    it("retains fractional seconds and rounds the earnings group once", () => { const i = input(); i.wages[0].hourlyRateMinor = "1500.125"; i.timecards[0].entries = [entry("A", "2026-10-05T08:00:00-04:00", "2026-10-05T08:00:30.5-04:00"), entry("B", "2026-10-05T09:00:00-04:00", "2026-10-05T09:00:30.5-04:00")]; const r = ready(i); expect(r.row.grossMinor).toBe("25"); expect(r.breakdown.regularNanoseconds).toBe("61000000000"); expect(r.breakdown.earnings[0].exactAmount).toEqual({ numerator: "732061", denominator: "28800" }); });
    it("splits an effective wage change inside a recorded entry", () => { const i = input(); i.wages[0].effectiveTo = "2026-10-05T12:00:00-04:00"; i.wages.push({ ...i.wages[0], id: "W2", effectiveFrom: i.wages[0].effectiveTo, effectiveTo: null, hourlyRateMinor: "2500" }); expect(ready(i).row.grossMinor).toBe("18000"); });
    it("uses the weighted weekly minimum when overtime falls on the lower rate", () => { const i = input(); i.wages[0].hourlyRateMinor = "3000"; i.wages.push({ ...i.wages[0], id: "W2", locationIds: ["L2"], hourlyRateMinor: "1500" }); i.timecards[0].entries = [5, 6, 7, 8, 9, 10].map(d => entry("T" + d, `2026-10-${d < 10 ? "0" : ""}${d}T08:00:00-04:00`, `2026-10-${d < 10 ? "0" : ""}${d}T16:00:00-04:00`, d === 10 ? "L2" : "L1")); const r = ready(i); /* 40*$30+8*$15 + .5*($1320/48)*8 = $1430 */ expect(r.row.grossMinor).toBe("143000"); expect(r.breakdown.earnings.find(e => e.kind === "OVERTIME")?.amountMinor).toBe("23000"); });
    it("does not add a true-up when existing daily premium satisfies the federal minimum", () => { const i = input(); i.timecards[0].entries = [5, 6, 7, 8, 9].map(d => entry("T" + d, `2026-10-0${d}T08:00:00-04:00`, `2026-10-0${d}T17:00:00-04:00`)); const r = ready(i); expect(r.row.grossMinor).toBe("95000"); expect(r.breakdown.earnings.some(e => e.kind === "FLSA_TRUE_UP")).toBe(false); });
    it("pays an approved adjustment once with retained provenance", () => { const i = input(); i.timecards[0].entries[0] = { ...i.timecards[0].entries[0], sourceKind: "ADJUSTMENT", recordedVersion: null, adjustmentId: "A1" }; expect(ready(i).row.grossMinor).toBe("16000"); });
    it.each([["OPEN_RECORDED_TIME", (i: NativePayrollInput) => { i.timecards[0].entries[0].endAt = null; }], ["PENDING_CORRECTIONS", (i: NativePayrollInput) => { i.timecards[0].pendingCorrections = 1; }], ["BREAK_PAY_BASIS_REQUIRED", (i: NativePayrollInput) => { i.timecards[0].entries[0].breaks = [{ id: "B1", typeId: null, startAt: "2026-10-05T12:00:00-04:00", endAt: "2026-10-05T12:30:00-04:00" }]; }], ["CONFLICTING_WAGE_PROFILE", (i: NativePayrollInput) => { i.wages.push({ ...i.wages[0], id: "W2" }); }]] as const)("blocks %s", (code, change) => { const i = input(); change(i); expect(calculateNativePayroll(i)).toMatchObject({ state: "blocked", issues: [{ code }] }); });
    it("requires explicit coverage for every standard employer obligation", () => { const i = input(); i.tax!.employerContributions = []; expect(calculateNativePayroll(i)).toMatchObject({ state: "blocked", issues: [{ code: "EMPLOYER_COVERAGE_REQUIRED" }] }); });
    it("keeps employer contributions outside employee net and applies wage caps", () => { const i = input(); i.tax!.employerContributions[0] = { code: "FUTA", label: "Employer FUTA", applicability: "APPLICABLE", basisPoints: 600, capMinor: "700000", wagesBeforeMinor: "695000", evidenceReference: "Fictional documented full rate and taxable wage balance" }; Object.assign(i.ytd!, { grossMinor: "700000", netMinor: "700000", employerWagesMinor: { ...i.ytd!.employerWagesMinor, FUTA: "695000" }, locationIds: ["L1"] }); const r = ready(i); expect(r.row.netMinor).toBe("14728"); expect(r.row.employerContributions.find(d => d.code === "FUTA")?.amountMinor).toBe("300"); });
    it("subtracts an explicitly authorized supported post-tax deduction", () => { const i = input(); i.deductions = [deduction()]; const r = ready(i); expect(r.row.netMinor).toBe("13728"); expect(r.breakdown.ytdAfter.deductions.COOP).toBe("1000"); });
    it("caps the deduction at its remaining authorized balance", () => { const i = input(); i.deductions = [{ ...deduction(), deductedBeforeMinor: "4500" }]; expect(ready(i).row.netMinor).toBe("14228"); });
    it("does not take a revoked deduction", () => { const i = input(); i.deductions = [{ ...deduction(), revoked: true }]; expect(ready(i).row.netMinor).toBe("14728"); });
    it("requires statutory eligibility evidence in addition to written authorization", () => { const i = input(); i.deductions = [{ ...deduction(), complianceReference: "" }]; expect(calculateNativePayroll(i)).toMatchObject({ state: "blocked", issues: [{ code: "DEDUCTION_AUTHORITY_REQUIRED" }] }); });
    it("blocks excess net instead of clipping an unauthorized amount", () => { const i = input(); i.deductions = [{ ...deduction(), amountMinor: "20000", capMinor: null }]; expect(calculateNativePayroll(i)).toMatchObject({ state: "blocked", issues: [{ code: "DEDUCTIONS_EXCEED_GROSS" }] }); });
    it("blocks a duplicate statutory deduction code", () => { const i = input(); i.deductions = [{ ...deduction(), code: "MEDICARE" }]; expect(calculateNativePayroll(i)).toMatchObject({ state: "blocked", issues: [{ code: "DUPLICATE_DEDUCTION_CODE" }] }); });
    it("uses pay-date year and explicit same-employer cap balances", () => { const i = input(); i.ytd!.grossMinor = "20000000"; i.ytd!.netMinor = "20000000"; i.ytd!.locationIds = ["L1"]; i.ytd!.socialSecurityWagesMinor = "18445000"; i.ytd!.medicareWagesMinor = "19995000"; i.ytd!.sinotWagesMinor = "899000"; const r = ready(i); expect(r.row.employeeDeductions).toEqual(expect.arrayContaining([{ code: "SOCIAL_SECURITY", label: "SOCIAL SECURITY", amountMinor: "310" }, { code: "ADDITIONAL_MEDICARE", label: "ADDITIONAL MEDICARE", amountMinor: "99" }, { code: "SINOT", label: "SINOT", amountMinor: "3" }])); i.payday = "2027-01-08"; expect(calculateNativePayroll(i)).toMatchObject({ state: "blocked", issues: [{ code: "RULESET_NOT_APPLICABLE" }] }); });
    it("pins every semantic profile and source revision in provenance", () => { const i = input(); const a = ready(i); i.wages[0].revision++; const b = ready(i); expect(a.provenance.inputSha256).not.toBe(b.provenance.inputSha256); expect(a.row.grossMinor).toBe(b.row.grossMinor); });
});
it("matches independent W11 weighted weekly premium when overtime uses the higher rate", () => {
    const i = input();
    i.wages[0].hourlyRateMinor = "1200";
    i.wages.push({ ...i.wages[0], id: "W2", locationIds: ["L2"], hourlyRateMinor: "1600" });
    i.timecards[0].entries = [5, 6, 7].map(d => entry("T" + d, `2026-10-0${d}T08:00:00-04:00`, `2026-10-0${d}T16:00:00-04:00`));
    i.timecards[0].entries.push(entry("T8a", "2026-10-08T08:00:00-04:00", "2026-10-08T14:00:00-04:00"), entry("T8b", "2026-10-08T14:00:00-04:00", "2026-10-08T16:00:00-04:00", "L2"), entry("T9", "2026-10-09T08:00:00-04:00", "2026-10-09T16:00:00-04:00", "L2"), entry("T10", "2026-10-10T08:00:00-04:00", "2026-10-10T13:00:00-04:00", "L2"));
    const r = ready(i);
    expect(r.row.grossMinor).toBe("63333");
});
// Independent QA supplemental MC01/MC02; literal money expectations retained unchanged.
it.each([[[2100, 1050, 1050, 1050, 1050], "56700", "2100", "0"], [[1050, 2100, 2100, 2100, 2100], "79550", "1050", "800"]] as const)("retains applicable daily premium and credits money against the weighted weekly floor: %j", (rates, gross, dailyPremium, trueUp) => {
    const i = input();
    i.wages = rates.map((rate, index) => ({ ...i.wages[0], id: `MC-W${index}`, locationIds: [`MC-L${index}`], hourlyRateMinor: String(rate) }));
    i.timecards[0].entries = [10, 8, 8, 8, 8].map((hours, index) => entry(`MC-E${index}`, `2026-10-0${index + 5}T08:00:00-04:00`, `2026-10-0${index + 5}T${8 + hours}:00:00-04:00`, `MC-L${index}`));
    const r = ready(i);
    expect(r.row.grossMinor).toBe(gross);
    const daily = r.breakdown.earnings.filter(e => e.kind === "OVERTIME");
    expect(daily.reduce((sum, e) => sum + BigInt(e.amountMinor), BigInt(0)) - BigInt(rates[0] * 2)).toBe(BigInt(dailyPremium));
    expect(r.breakdown.earnings.filter(e => e.kind === "FLSA_TRUE_UP").reduce((sum, e) => sum + BigInt(e.amountMinor), BigInt(0))).toBe(BigInt(trueUp));
});
it.each([[[2100, 1050, 1050, 1050, 1050], "58800"], [[1050, 2100, 2100, 2100, 2100], "79800"]] as const)("preserves superior double-time daily rights across mixed rates: %j", (rates, gross) => {
    const i = input();
    i.wages = rates.map((rate, index) => ({ ...i.wages[0], id: `DOUBLE-W${index}`, locationIds: [`DOUBLE-L${index}`], hourlyRateMinor: String(rate), overtime: "DOUBLE_PRESERVED" }));
    i.timecards[0].entries = [10, 8, 8, 8, 8].map((hours, index) => entry(`DOUBLE-E${index}`, `2026-10-0${index + 5}T08:00:00-04:00`, `2026-10-0${index + 5}T${8 + hours}:00:00-04:00`, `DOUBLE-L${index}`));
    expect(ready(i).row.grossMinor).toBe(gross);
});
it("allocates the MC02 remaining weekly true-up without paying full context twice", () => {
    const i = input(), rates = [1050, 2100, 2100, 2100, 2100];
    i.wages = rates.map((rate, index) => ({ ...i.wages[0], id: `SPLIT-W${index}`, locationIds: [`SPLIT-L${index}`], hourlyRateMinor: String(rate) }));
    i.timecards[0].entries = [10, 8, 8, 8, 8].map((hours, index) => entry(`SPLIT-E${index}`, `2026-10-0${index + 5}T08:00:00-04:00`, `2026-10-0${index + 5}T${8 + hours}:00:00-04:00`, `SPLIT-L${index}`));
    i.period = { startDate: "2026-10-05", endDate: "2026-10-08" };
    const left = ready(i);
    expect(left.row.grossMinor).toBe("61950");
    i.period = { startDate: "2026-10-09", endDate: "2026-10-11" };
    const right = ready(i);
    expect(right.row.grossMinor).toBe("17600");
    expect(BigInt(left.row.grossMinor) + BigInt(right.row.grossMinor)).toBe(BigInt("79550"));
});
