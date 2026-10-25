import type { NativePayrollInput } from "./contracts";
import { classifyRecordedTime } from "./time";
import { usesOwnerPayrollPolicy } from "./provisional-policy";
import type { MealWarning } from "./meal-periods";

/** Payable hours from the native payroll engine, as integer nanosecond strings.
 * overtime and doubleTime are disjoint (double time is overtime under a
 * DOUBLE_PRESERVED wage profile); restDay is the part of either that the engine
 * premiums as the seventh consecutive day. paid = regular + overtime + doubleTime. */
export type PayableHours = {
    state: "ready";
    paidNanoseconds: string;
    regularNanoseconds: string;
    overtimeNanoseconds: string;
    doubleTimeNanoseconds: string;
    restDayNanoseconds: string;
    unpaidBreakNanoseconds: string;
    mealWarnings: MealWarning[];
    basis: { wageProfiles: { id: string; revision: number }[]; dailyInterpretation: string; dailyInputDisposition: string; workweekPolicySha256: string };
};
export type PayableHoursBlocked = { state: "blocked"; code: string; reference: string | null };
export type PayableHoursResult = PayableHours | PayableHoursBlocked;
export type PayableHoursInput = Pick<NativePayrollInput, "employeeId" | "period" | "payday" | "timecards" | "wages" | "tax" | "calculationPolicyReference">;

/** Classify finalized time with the exact classifier and pay-window filter that
 * calculateNativePayroll uses, so these hours always equal its REGULAR and OVERTIME
 * earning hours, with the same shift-start-day attribution. It computes no money. */
export function classifyPayableHours(input: PayableHoursInput): PayableHoursResult {
    try {
        usesOwnerPayrollPolicy(input);
        const classified = classifyRecordedTime(input as NativePayrollInput);
        let regular = BigInt(0), overtime = BigInt(0), doubleTime = BigInt(0), restDay = BigInt(0);
        const profiles = new Map<string, { id: string; revision: number }>();
        for (const p of classified.pieces) {
            if (!p.inPayPeriod)
                continue;
            const duration = p.end - p.start;
            profiles.set(`${p.wage.id}:${p.wage.revision}`, { id: p.wage.id, revision: p.wage.revision });
            if (!p.overtime)
                regular += duration;
            else if (p.wage.overtime === "DOUBLE_PRESERVED")
                doubleTime += duration;
            else
                overtime += duration;
            if (p.premiumReason === "REST_DAY")
                restDay += duration;
        }
        return { state: "ready", paidNanoseconds: (regular + overtime + doubleTime).toString(), regularNanoseconds: regular.toString(), overtimeNanoseconds: overtime.toString(), doubleTimeNanoseconds: doubleTime.toString(), restDayNanoseconds: restDay.toString(), unpaidBreakNanoseconds: classified.unpaidBreakNanoseconds.toString(), mealWarnings: classified.mealWarnings,
            basis: { wageProfiles: [...profiles.values()].sort((a, b) => a.id.localeCompare(b.id) || a.revision - b.revision), dailyInterpretation: classified.boundaryEvidence.dailyInterpretation, dailyInputDisposition: classified.boundaryEvidence.dailyInputDisposition, workweekPolicySha256: classified.boundaryEvidence.workweekPolicySha256 } };
    }
    catch (error) {
        const e = error as Error & { reference?: string };
        return { state: "blocked", code: e instanceof Error && /^[A-Z][A-Z_]+$/.test(e.message) ? e.message : "INVALID_NATIVE_INPUT", reference: e.reference ?? null };
    }
}
