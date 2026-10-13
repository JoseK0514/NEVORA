import {parseYtd} from "./model";
import {ORDINARY_PR_MINIMUM_2026} from "./minimum-wage";
import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { stableExportJson } from "../../payroll-export/json";
import type { NativePayrollInput, NativePayrollResult, NativeEarning } from "./contracts";
import { exactMinor, type NativeExactnessOperation, add, halfUp, minor, multiply, ratio, serialized, subtract, type Rational } from "./money";
import { classifyRecordedTime, fail, HOUR } from "./time";
import { fica2026, prIncomeWithholding, sinotContribution, PR_2026_RULE_SOURCES } from "./rules/pr-2026";
import { authorizedAmounts, employerAmounts, validateEmployerCoverage, validateEmployerYtdCounters } from "./obligations";
const hash = (value: unknown) => createHash("sha256").update(stableExportJson(value)).digest("hex");
export const NATIVE_CALCULATOR_VERSION = "NEVORA_NATIVE_WAGE_V5_EMPLOYER_YTD_COUNTERS";
export const NATIVE_RULES_SHA256 = hash({ calculatorVersion: NATIVE_CALCULATOR_VERSION, sources: PR_2026_RULE_SOURCES, minimumWage: ORDINARY_PR_MINIMUM_2026 });
export function calculateNativePayroll(input: NativePayrollInput): NativePayrollResult {
    try {
        if (!input || input.schema !== "NEVORA_NATIVE_PAYROLL_INPUT_V1" || typeof input.employeeId !== "string" || !input.employeeId || input.timeZone !== "America/Puerto_Rico")
            fail("INVALID_NATIVE_INPUT");
        const start = Temporal.PlainDate.from(input.period.startDate), end = Temporal.PlainDate.from(input.period.endDate);
        if (start.toString() !== input.period.startDate || end.toString() !== input.period.endDate || start.until(end).days < 0 || start.until(end).days > 30)
            fail("INVALID_NATIVE_PERIOD");
        if (!input.ytd || input.ytd.attested !== true || !input.ytd.evidenceReference || input.ytd.revision < 1)
            fail("ATTESTED_YTD_REQUIRED");
        parseYtd(input.ytd);
        const tax = input.tax;
        if (!tax || tax.coverage !== "PR_REGULAR_TAXABLE_RESIDENT" || tax.ficaCoverage !== "STANDARD" || tax.sinotCoverage !== "STANDARD" || !tax.certificateReference || (tax.prCentRounding !== "UNVERIFIED" && !tax.ruleEvidenceReference))
            fail("TAX_PROFILE_REQUIRED");
        if (tax.prCentRounding !== "HALF_UP" && tax.prCentRounding !== "TRUNCATE" && tax.prCentRounding !== "UNVERIFIED")
            fail("PR_ROUNDING_RULE_UNVERIFIED");
        validateEmployerCoverage(tax);
        validateEmployerYtdCounters(tax, input.ytd);
        const payday = Temporal.PlainDate.from(input.payday);
        if (payday.year !== 2026 || input.ytd.year !== payday.year)
            fail("RULESET_NOT_APPLICABLE");
        if (tax.effectiveFrom > input.payday || (tax.effectiveTo !== null && tax.effectiveTo <= input.payday))
            fail("TAX_PROFILE_REQUIRED");
        const classified = classifyRecordedTime(input);
        const exactnessOperations: NativeExactnessOperation[] = [];
        const exactOnly = tax.prCentRounding === "UNVERIFIED" || input.wages.some(w => w.wageCentRounding === "UNVERIFIED");
        const groups = new Map<string, {
            prototype: NativeEarning;
            amount: Rational;
            time: bigint;
        }>();
        let regular = BigInt(0), overtime = BigInt(0);
        const put = (key: string, prototype: NativeEarning, amount: Rational, duration: bigint) => {
            const previous = groups.get(key);
            groups.set(key, { prototype, amount: add(previous?.amount ?? ratio(BigInt(0)), amount), time: (previous?.time ?? BigInt(0)) + duration });
        };
        const weeklyRates = new Map<string, Rational>();
        const weeklyTrueUps = new Map<string, {
            amount: Rational;
            duration: bigint;
        }>();
        const premiumBasis = (p: (typeof classified.pieces)[number]) => p.premiumReason === "WEEKLY" && p.wage.overtime !== "DOUBLE_PRESERVED" ? weeklyRates.get(p.week)! : p.rate;
        const premiumRate = (p: (typeof classified.pieces)[number]) => p.overtime ? multiply(premiumBasis(p), p.wage.overtime === "DOUBLE_PRESERVED" ? ratio(BigInt(1)) : ratio(BigInt(1), BigInt(2))) : ratio(BigInt(0));
        for (const week of new Set(classified.pieces.map(p => p.week))) {
            const pieces = classified.pieces.filter(p => p.week === week);
            const duration = pieces.reduce((sum, p) => sum + p.end - p.start, BigInt(0));
            if (pieces.some(p => p.wage.wageCentRounding === "UNVERIFIED"))
                for (const p of pieces)
                    exactMinor(multiply(p.rate, ratio(p.end - p.start, HOUR)), exactnessOperations, "WAGE_STRAIGHT", p.wage.id);
            const straight = pieces.reduce((sum, p) => add(sum, multiply(p.rate, ratio(p.end - p.start, HOUR))), ratio(BigInt(0)));
            const weighted = multiply(straight, ratio(HOUR, duration));
            weeklyRates.set(week, weighted);
            const federalDuration = pieces.filter(p => p.federalOvertime).reduce((sum, p) => sum + p.end - p.start, BigInt(0));
            const floor = multiply(weighted, ratio(federalDuration, HOUR * BigInt(2)));
            const credit = pieces.reduce((sum, p) => add(sum, multiply(premiumRate(p), ratio(p.end - p.start, HOUR))), ratio(BigInt(0)));
            if (pieces.some(p => p.wage.wageCentRounding === "UNVERIFIED")) {
                for (const p of pieces)
                    exactMinor(multiply(premiumRate(p), ratio(p.end - p.start, HOUR)), exactnessOperations, "WAGE_PREMIUM", p.wage.id);
                exactMinor(floor, exactnessOperations, "FLSA_WEEKLY_FLOOR", week);
                exactMinor(credit, exactnessOperations, "FLSA_PREMIUM_CREDIT", week);
            }
            const deficit = subtract(floor, credit);
            weeklyTrueUps.set(week, { amount: deficit.numerator > BigInt(0) ? deficit : ratio(BigInt(0)), duration: federalDuration });
        }
        for (const p of classified.pieces) {
            if (p.start < classified.payLeft || p.end > classified.payRight)
                continue;
            const duration = p.end - p.start, kind = p.overtime ? "OVERTIME" : "REGULAR";
            const basis = premiumBasis(p);
            const amount = multiply(add(p.rate, premiumRate(p)), ratio(duration, HOUR));
            put(`${kind}:${p.week}:${p.locationId}:${p.wage.id}:${p.wage.revision}:${p.premiumReason}`, { code: "", kind, locationId: p.locationId, wageProfileId: p.wage.id, wageRevision: p.wage.revision, rateMinorPerHour: p.wage.hourlyRateMinor, premiumBasisMinorPerHour: p.overtime ? serialized(basis) : null, nanoseconds: "0", amountMinor: "0", exactAmount: serialized(amount) }, amount, duration);
            const trueUp = weeklyTrueUps.get(p.week)!;
            if (p.federalOvertime && trueUp.amount.numerator > BigInt(0)) {
                const extra = multiply(trueUp.amount, ratio(duration, trueUp.duration));
                if (p.wage.wageCentRounding === "UNVERIFIED")
                    exactMinor(extra, exactnessOperations, "FLSA_TRUE_UP", p.wage.id);
                // Additional money only: these hours already appear in straight-time earnings.
                put(`FLSA_TRUE_UP:${p.week}:${p.locationId}:${p.wage.id}:${p.wage.revision}`, { code: "", kind: "FLSA_TRUE_UP", locationId: p.locationId, wageProfileId: p.wage.id, wageRevision: p.wage.revision, rateMinorPerHour: p.wage.hourlyRateMinor, premiumBasisMinorPerHour: serialized(weeklyRates.get(p.week)!), nanoseconds: "0", amountMinor: "0", exactAmount: serialized(extra) }, extra, BigInt(0));
            }
            if (p.overtime)
                overtime += duration;
            else
                regular += duration;
        }
        const earnings = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group], index) => ({ ...group.prototype, code: `NATIVE_EARNING_${index + 1}`, nanoseconds: group.time.toString(), amountMinor: (input.wages.find(w => w.id === group.prototype.wageProfileId && w.revision === group.prototype.wageRevision)?.wageCentRounding === "UNVERIFIED" ? exactMinor(group.amount, exactnessOperations, "WAGE_GROUP", group.prototype.code) : halfUp(group.amount)).toString(), exactAmount: serialized(group.amount) }));
        if (earnings.length > 100)
            fail("NATIVE_EARNINGS_LIMIT");
        const gross = earnings.reduce((sum, e) => sum + minor(e.amountMinor), BigInt(0));
        const fica = fica2026({ grossMinor: gross.toString(), socialSecurityWagesBeforeMinor: input.ytd.socialSecurityWagesMinor, medicareWagesBeforeMinor: input.ytd.medicareWagesMinor, payday: input.payday });
        if (exactOnly) {
            for (const [operation, taxable, bp] of [["FICA_SOCIAL_SECURITY", fica.socialSecurityTaxableMinor, 620], ["FICA_MEDICARE", fica.medicareTaxableMinor, 145], ["FICA_ADDITIONAL_MEDICARE", fica.additionalMedicareTaxableMinor, 90]] as const)
                exactMinor(ratio(minor(taxable) * BigInt(bp), BigInt(10000)), exactnessOperations, operation);
        }
        const sinot = sinotContribution({ grossMinor: gross.toString(), wagesBeforeMinor: input.ytd.sinotWagesMinor, employeeBasisPoints: tax.sinotEmployeeBasisPoints, rounding: exactOnly ? "UNVERIFIED" : "HALF_UP" });
        exactnessOperations.push(...(sinot.exactnessOperations ?? []));
        const income = prIncomeWithholding({ grossMinor: gross.toString(), frequency: input.frequency, certificate: tax.certificate, rounding: tax.prCentRounding });
        exactnessOperations.push(...income.exactnessOperations);
        const taxes = [{ code: "PR_INCOME_TAX", amountMinor: income.amountMinor, taxableMinor: income.taxableMinor, exactAmount: income.exactTax }, { code: "SOCIAL_SECURITY", amountMinor: fica.socialSecurityMinor, taxableMinor: fica.socialSecurityTaxableMinor, exactAmount: null }, { code: "MEDICARE", amountMinor: fica.medicareMinor, taxableMinor: fica.medicareTaxableMinor, exactAmount: null }, { code: "ADDITIONAL_MEDICARE", amountMinor: fica.additionalMedicareMinor, taxableMinor: fica.additionalMedicareTaxableMinor, exactAmount: null }, { code: "SINOT", amountMinor: sinot.employeeMinor, taxableMinor: sinot.taxableMinor, exactAmount: null }];
        const employeeDeductions = taxes.map(t => ({ code: t.code, label: t.code.replaceAll("_", " "), amountMinor: t.amountMinor }));
        const employerContributions = [{ code: "SOCIAL_SECURITY", label: "Employer Social Security", amountMinor: fica.employerSocialSecurityMinor }, { code: "MEDICARE", label: "Employer Medicare", amountMinor: fica.employerMedicareMinor }, { code: "SINOT", label: "Employer SINOT", amountMinor: sinot.employerMinor }, ...employerAmounts(tax, gross, exactOnly ? exactnessOperations : undefined)];
        employeeDeductions.push(...authorizedAmounts(input, gross, taxes.map(t => t.code), employerContributions, exactOnly ? exactnessOperations : undefined));
        const deducted = employeeDeductions.reduce((sum, d) => sum + minor(d.amountMinor), BigInt(0)), net = gross - deducted;
        if (net < BigInt(0))
            fail("DEDUCTIONS_EXCEED_GROSS");
        const before = input.ytd, after = { ...before, grossMinor: (minor(before.grossMinor) + gross).toString(), netMinor: (minor(before.netMinor) + net).toString(), socialSecurityWagesMinor: (minor(before.socialSecurityWagesMinor) + gross).toString(), medicareWagesMinor: (minor(before.medicareWagesMinor) + gross).toString(), sinotWagesMinor: (minor(before.sinotWagesMinor) + gross).toString(), deductions: { ...before.deductions }, employerContributions: { ...before.employerContributions }, employerWagesMinor: Object.fromEntries(Object.entries(before.employerWagesMinor).map(([code, value]) => [code, (minor(value) + gross).toString()])), locationIds: [...new Set([...before.locationIds, ...classified.pieces.map(p => p.locationId)])].sort() };
        for (const deduction of employeeDeductions)
            after.deductions[deduction.code] = (minor(before.deductions[deduction.code] ?? "0") + minor(deduction.amountMinor)).toString();
        for (const contribution of employerContributions)
            after.employerContributions[contribution.code] = (minor(before.employerContributions[contribution.code] ?? "0") + minor(contribution.amountMinor)).toString();
        const canonical = { schema: input.schema, employeeId: input.employeeId, period: input.period, payday: input.payday, frequency: input.frequency, timeZone: input.timeZone, timecards: input.timecards, wages: input.wages, tax: input.tax, ytd: input.ytd, deductions: input.deductions };
        return { state: "ready", schema: "NEVORA_NATIVE_PAYROLL_RESULT_V1", employeeId: input.employeeId, sourceAuthority: "NATIVE_RECORDED_TIME", currency: "USD", row: { employeeId: input.employeeId, grossMinor: gross.toString(), employeeDeductions, employerContributions, netMinor: net.toString(), earnings: earnings.map(e => ({ code: e.code, label: e.kind.replaceAll("_", " "), amountMinor: e.amountMinor })) }, breakdown: { earnings, regularNanoseconds: regular.toString(), overtimeNanoseconds: overtime.toString(), unpaidBreakNanoseconds: classified.unpaidBreakNanoseconds.toString(), locationIds: [...new Set(earnings.map(e => e.locationId))].sort(), taxYear: payday.year, ytdBefore: before, ytdAfter: after, taxes }, provenance: { inputSha256: hash(canonical), rulesetId: "PR_STANDARD_2026_V1", rulesSha256: NATIVE_RULES_SHA256, rounding: input.wages.every(w => w.wageCentRounding === "UNVERIFIED") ? "EXACT_CENT_NO_ROUNDING_REQUIRED" : "EARNING_GROUP_HALF_UP", taxRounding: income.rounding, exactnessOperations } };
    }
    catch (error) {
        const e = error as Error & {
            reference?: string;
        };
        return { state: "blocked", schema: "NEVORA_NATIVE_PAYROLL_RESULT_V1", employeeId: typeof input?.employeeId === "string" ? input.employeeId : null, issues: [{ code: e instanceof Error && /^[A-Z][A-Z_]+$/.test(e.message) ? e.message : "INVALID_NATIVE_INPUT", reference: e.reference ?? null }] };
    }
}
