import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { stableExportJson } from "../../payroll-export/json";
import type { NativePayrollInput, NativePayrollResult, NativeEarning } from "./contracts";
import { add, halfUp, minor, multiply, ratio, serialized, subtract, type Rational } from "./money";
import { classifyRecordedTime, fail, HOUR } from "./time";
import { fica2026, prIncomeWithholding, sinotContribution, PR_2026_RULE_SOURCES } from "./rules/pr-2026";
import { authorizedAmounts, employerAmounts, validateEmployerCoverage } from "./obligations";
const hash = (value: unknown) => createHash("sha256").update(stableExportJson(value)).digest("hex");
export function calculateNativePayroll(input: NativePayrollInput): NativePayrollResult {
    try {
        if (!input || input.schema !== "NEVORA_NATIVE_PAYROLL_INPUT_V1" || typeof input.employeeId !== "string" || !input.employeeId || input.timeZone !== "America/Puerto_Rico")
            fail("INVALID_NATIVE_INPUT");
        const start = Temporal.PlainDate.from(input.period.startDate), end = Temporal.PlainDate.from(input.period.endDate);
        if (start.toString() !== input.period.startDate || end.toString() !== input.period.endDate || start.until(end).days < 0 || start.until(end).days > 30)
            fail("INVALID_NATIVE_PERIOD");
        if (!input.ytd || input.ytd.attested !== true || !input.ytd.evidenceReference || input.ytd.revision < 1)
            fail("ATTESTED_YTD_REQUIRED");
        const tax = input.tax;
        if (!tax || tax.coverage !== "PR_REGULAR_TAXABLE_RESIDENT" || tax.ficaCoverage !== "STANDARD" || tax.sinotCoverage !== "STANDARD" || !tax.certificateReference || !tax.ruleEvidenceReference)
            fail("TAX_PROFILE_REQUIRED");
        if (tax.prCentRounding !== "HALF_UP" && tax.prCentRounding !== "TRUNCATE")
            fail("PR_ROUNDING_RULE_UNVERIFIED");
        validateEmployerCoverage(tax);
        const payday = Temporal.PlainDate.from(input.payday);
        if (payday.year !== 2026 || input.ytd.year !== payday.year)
            fail("RULESET_NOT_APPLICABLE");
        if (tax.effectiveFrom > input.payday || (tax.effectiveTo !== null && tax.effectiveTo <= input.payday))
            fail("TAX_PROFILE_REQUIRED");
        const classified = classifyRecordedTime(input);
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
        for (const p of classified.pieces) {
            if (p.start < classified.payLeft || p.end > classified.payRight)
                continue;
            const duration = p.end - p.start, kind = p.overtime ? "OVERTIME" : "REGULAR", multiplier = p.overtime ? p.wage.overtime === "DOUBLE_PRESERVED" ? ratio(BigInt(2)) : ratio(BigInt(3), BigInt(2)) : ratio(BigInt(1));
            const amount = multiply(multiply(p.rate, ratio(duration, HOUR)), multiplier);
            put(`${kind}:${p.locationId}:${p.wage.id}:${p.wage.revision}`, { code: "", kind, locationId: p.locationId, wageProfileId: p.wage.id, wageRevision: p.wage.revision, rateMinorPerHour: p.wage.hourlyRateMinor, nanoseconds: "0", amountMinor: "0", exactAmount: serialized(amount) }, amount, duration);
            if (p.overtime)
                overtime += duration;
            else
                regular += duration;
        }
        // Federal weighted regular-rate minimum, after qualifying daily/seventh-day
        // premiums. Complete week context is used even when this period splits it.
        for (const week of new Set(classified.pieces.map(p => p.week))) {
            const ps = classified.pieces.filter(p => p.week === week), duration = ps.reduce((sum, p) => sum + p.end - p.start, BigInt(0));
            if (duration <= HOUR * BigInt(40))
                continue;
            const straight = ps.reduce((sum, p) => add(sum, multiply(p.rate, ratio(p.end - p.start, HOUR))), ratio(BigInt(0)));
            const weeklyMinimum = multiply(multiply(straight, ratio(HOUR, duration)), ratio(duration - HOUR * BigInt(40), HOUR * BigInt(2)));
            const premiums = ps.filter(p => p.overtime).reduce((sum, p) => add(sum, multiply(multiply(p.rate, ratio(p.end - p.start, HOUR)), p.wage.overtime === "DOUBLE_PRESERVED" ? ratio(BigInt(1)) : ratio(BigInt(1), BigInt(2)))), ratio(BigInt(0)));
            const deficit = subtract(weeklyMinimum, premiums);
            if (deficit.numerator <= BigInt(0))
                continue;
            const overtimeTime = ps.filter(p => p.overtime).reduce((sum, p) => sum + p.end - p.start, BigInt(0));
            for (const p of ps.filter(p => p.overtime && p.start >= classified.payLeft && p.end <= classified.payRight)) {
                const amount = multiply(deficit, ratio(p.end - p.start, overtimeTime));
                put(`FLSA_TRUE_UP:${week}:${p.locationId}:${p.wage.id}:${p.wage.revision}`, { code: "", kind: "FLSA_TRUE_UP", locationId: p.locationId, wageProfileId: p.wage.id, wageRevision: p.wage.revision, rateMinorPerHour: p.wage.hourlyRateMinor, nanoseconds: "0", amountMinor: "0", exactAmount: serialized(amount) }, amount, BigInt(0));
            }
        }
        const earnings = [...groups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([, group], index) => ({ ...group.prototype, code: `NATIVE_EARNING_${index + 1}`, nanoseconds: group.time.toString(), amountMinor: halfUp(group.amount).toString(), exactAmount: serialized(group.amount) }));
        const gross = earnings.reduce((sum, e) => sum + minor(e.amountMinor), BigInt(0));
        const fica = fica2026({ grossMinor: gross.toString(), socialSecurityWagesBeforeMinor: input.ytd.socialSecurityWagesMinor, medicareWagesBeforeMinor: input.ytd.medicareWagesMinor, payday: input.payday });
        const sinot = sinotContribution({ grossMinor: gross.toString(), wagesBeforeMinor: input.ytd.sinotWagesMinor, employeeBasisPoints: tax.sinotEmployeeBasisPoints });
        const income = prIncomeWithholding({ grossMinor: gross.toString(), frequency: input.frequency, certificate: tax.certificate, rounding: tax.prCentRounding });
        const taxes = [{ code: "PR_INCOME_TAX", amountMinor: income.amountMinor, taxableMinor: income.taxableMinor, exactAmount: income.exactTax }, { code: "SOCIAL_SECURITY", amountMinor: fica.socialSecurityMinor, taxableMinor: fica.socialSecurityTaxableMinor, exactAmount: null }, { code: "MEDICARE", amountMinor: fica.medicareMinor, taxableMinor: fica.medicareTaxableMinor, exactAmount: null }, { code: "ADDITIONAL_MEDICARE", amountMinor: fica.additionalMedicareMinor, taxableMinor: fica.additionalMedicareTaxableMinor, exactAmount: null }, { code: "SINOT", amountMinor: sinot.employeeMinor, taxableMinor: sinot.taxableMinor, exactAmount: null }];
        const employeeDeductions = taxes.map(t => ({ code: t.code, label: t.code.replaceAll("_", " "), amountMinor: t.amountMinor }));
        const employerContributions = [{ code: "SOCIAL_SECURITY", label: "Employer Social Security", amountMinor: fica.employerSocialSecurityMinor }, { code: "MEDICARE", label: "Employer Medicare", amountMinor: fica.employerMedicareMinor }, { code: "SINOT", label: "Employer SINOT", amountMinor: sinot.employerMinor }, ...employerAmounts(tax, gross)];
        employeeDeductions.push(...authorizedAmounts(input, gross, taxes.map(t => t.code), employerContributions));
        const deducted = employeeDeductions.reduce((sum, d) => sum + minor(d.amountMinor), BigInt(0)), net = gross - deducted;
        if (net < BigInt(0))
            fail("DEDUCTIONS_EXCEED_GROSS");
        const before = input.ytd, after = { ...before, grossMinor: (minor(before.grossMinor) + gross).toString(), netMinor: (minor(before.netMinor) + net).toString(), socialSecurityWagesMinor: (minor(before.socialSecurityWagesMinor) + gross).toString(), medicareWagesMinor: (minor(before.medicareWagesMinor) + gross).toString(), sinotWagesMinor: (minor(before.sinotWagesMinor) + gross).toString(), deductions: { ...before.deductions }, employerContributions: { ...before.employerContributions } };
        for (const deduction of employeeDeductions)
            after.deductions[deduction.code] = (minor(before.deductions[deduction.code] ?? "0") + minor(deduction.amountMinor)).toString();
        for (const contribution of employerContributions)
            after.employerContributions[contribution.code] = (minor(before.employerContributions[contribution.code] ?? "0") + minor(contribution.amountMinor)).toString();
        const canonical = { schema: input.schema, employeeId: input.employeeId, period: input.period, payday: input.payday, frequency: input.frequency, timeZone: input.timeZone, timecards: input.timecards, wages: input.wages, tax: input.tax, ytd: input.ytd, deductions: input.deductions };
        return { state: "ready", schema: "NEVORA_NATIVE_PAYROLL_RESULT_V1", employeeId: input.employeeId, sourceAuthority: "NATIVE_RECORDED_TIME", currency: "USD", row: { employeeId: input.employeeId, grossMinor: gross.toString(), employeeDeductions, employerContributions, netMinor: net.toString(), earnings: earnings.map(e => ({ code: e.code, label: e.kind.replaceAll("_", " "), amountMinor: e.amountMinor })) }, breakdown: { earnings, regularNanoseconds: regular.toString(), overtimeNanoseconds: overtime.toString(), unpaidBreakNanoseconds: classified.unpaidBreakNanoseconds.toString(), locationIds: [...new Set(earnings.map(e => e.locationId))].sort(), taxYear: payday.year, ytdBefore: before, ytdAfter: after, taxes }, provenance: { inputSha256: hash(canonical), rulesetId: "PR_STANDARD_2026_V1", rulesSha256: hash(PR_2026_RULE_SOURCES), rounding: "EARNING_GROUP_HALF_UP", taxRounding: tax.prCentRounding } };
    }
    catch (error) {
        const e = error as Error & {
            reference?: string;
        };
        return { state: "blocked", schema: "NEVORA_NATIVE_PAYROLL_RESULT_V1", employeeId: typeof input?.employeeId === "string" ? input.employeeId : null, issues: [{ code: e instanceof Error && /^[A-Z][A-Z_]+$/.test(e.message) ? e.message : "INVALID_NATIVE_INPUT", reference: e.reference ?? null }] };
    }
}
