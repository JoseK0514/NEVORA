import { createHash } from 'node:crypto';
import { resolveNativeWorkweek, type NativeBoundaryEvidence } from './workweek-policy';
import { weekContainingInstant } from './workweek-boundaries';
import { validateNativeMinimumWage } from "./minimum-wage";
import { Temporal } from "@js-temporal/polyfill";
import { stableExportJson } from "../../payroll-export/json";
import type { NativePayrollInput, NativeRecordedEntry, NativeWageProfile } from "./contracts";
import { hourlyRate, type Rational } from "./money";
import { usesOwnerPayrollPolicy } from './provisional-policy';
import { MINIMUM_UNPAID_MEAL, mealWarningsForDay, type MealDayEntry, type MealWarning } from './meal-periods';
export const HOUR = BigInt(3600000000000), DAY = HOUR * BigInt(24);
const ZONE = "America/Puerto_Rico";
export const ns = (s: string) => Temporal.Instant.from(s).epochNanoseconds;
export const midnight = (date: string) => Temporal.PlainDate.from(date).toZonedDateTime(ZONE).epochNanoseconds;
export const dateAt = (instant: bigint) => Temporal.Instant.fromEpochNanoseconds(instant).toZonedDateTimeISO(ZONE).toPlainDate().toString();
export const dateAdd = (date: string, days: number) => Temporal.PlainDate.from(date).add({ days }).toString();
export function fail(code: string, reference: string | null = null): never { throw Object.assign(Error(code), { reference }); }
export type WorkedPiece = {
    start: bigint;
    end: bigint;
    date: string;
    week: string;
    locationId: string;
    wage: NativeWageProfile;
    rate: Rational;
    overtime: boolean;
    premiumReason: "DAILY" | "REST_DAY" | "WEEKLY" | null;
    federalOvertime: boolean;
    /** The attributed business day (the entry's start day) is in the pay period. */
    inPayPeriod: boolean;
};
/** The one break pay rule native payroll applies. The wage profile must map the break
 * type exactly once (otherwise the engine blocks). An unpaid relieved meal of at least
 * 30 minutes is unpaid; a shorter one is paid time (Jose, 2026-10-25, meal rule B-14:
 * a meal warning, never a block). A paid rest is paid at any length (longer than 20
 * minutes is a warning). Displays that show paid time use this same rule. */
export function nativeBreakClass(wage: Pick<NativeWageProfile, "breakRules" | "mealReductionAgreement">, b: { id: string; typeId: string | null; startAt: string; endAt: string | null }): { pay: "PAID" | "UNPAID"; kind: "MEAL" | "REST"; mealMinimumMinutes: 30 | 60 } {
    const treatment = wage.breakRules.filter(x => x.typeId === b.typeId);
    if (b.typeId === null || treatment.length !== 1)
        fail("BREAK_PAY_BASIS_REQUIRED", b.id);
    if (!b.endAt)
        fail("OPEN_RECORDED_BREAK", b.id);
    const duration = ns(b.endAt) - ns(b.startAt), mealMinimumMinutes = wage.mealReductionAgreement === true ? 30 as const : 60 as const;
    if (treatment[0].treatment === "UNPAID_RELIEVED_MEAL")
        return { pay: duration < MINIMUM_UNPAID_MEAL ? "PAID" : "UNPAID", kind: "MEAL", mealMinimumMinutes };
    if (treatment[0].treatment !== "PAID_REST")
        fail("UNSUPPORTED_PAID_BREAK_BASIS", b.id);
    return { pay: "PAID", kind: "REST", mealMinimumMinutes };
}
export function nativeBreakTreatment(wage: Pick<NativeWageProfile, "breakRules" | "mealReductionAgreement">, b: { id: string; typeId: string | null; startAt: string; endAt: string | null }): "PAID" | "UNPAID" {
    return nativeBreakClass(wage, b).pay;
}
/** Validate finalized provenance and split effective work at break and wage boundaries.
 * Shift-start-day attribution (Jose, 2026-10-25, B-02/B-15): an entry belongs wholly to
 * the business day it starts on and to that day's workweek and pay period, for daily
 * and weekly overtime; it is never cut at midnight, so each minute counts on exactly
 * one day. Returned starts/ends and unpaid time are bigint nanoseconds; pieces include
 * surrounding context, so consumers must select only pieces with inPayPeriod. */
export function classifyRecordedTime(input: NativePayrollInput) {
    const ownerPolicy = usesOwnerPayrollPolicy(input);
    const { period, wages, timecards } = input;
    if (!wages.length)
        fail("WAGE_PROFILE_REQUIRED");
    for (const wage of wages) {
        if (wage.compensation !== "HOURLY" || wage.employment !== "PR_PRIVATE_NONEXEMPT" || wage.dailyBasis !== "CALENDAR_DAY" || !["TIME_AND_HALF", "DOUBLE_PRESERVED"].includes(wage.overtime))
            fail("UNSUPPORTED_WAGE_PROFILE", wage.id);
        if (wage.standardContextAttested !== true)
            fail("WAGE_CONTEXT_ATTESTATION_REQUIRED", wage.id);
        if (wage.overtime !== wages[0].overtime)
            fail("OVERTIME_POLICY_CONFLICT", wage.id);
        if (wage.overtimeBasis !== "WEIGHTED_WEEKLY")
            fail("UNSUPPORTED_WORKWEEK_BASIS", wage.id);
        if (wage.wageCentRounding !== "HALF_UP" && wage.wageCentRounding !== "UNVERIFIED")
            fail("WAGE_CENT_RULE_UNVERIFIED", wage.id);
        validateNativeMinimumWage(wage);
    }
    const resolved = resolveNativeWorkweek(input.employeeId, wages, period);
    const contextStart = resolved.coveragePeriod.startDate, end = dateAdd(resolved.coveragePeriod.endDate, 1);
    const firstWeek = ns(resolved.fullWeekWindow.startAt);
    const left = ns(resolved.sourceWindow.startAt), right = ns(resolved.sourceWindow.endAt), payLeft = ns(resolved.payWindow.startAt), payRight = ns(resolved.payWindow.endAt);
    if (timecards.length > 64)
        fail('NATIVE_SOURCE_LIMIT');
    const entries = new Map<string, NativeRecordedEntry>();
    for (const card of timecards) {
        if (card.employeeId !== input.employeeId || card.state !== "FINALIZED" || card.revision < 1)
            fail("FINALIZED_TIME_REQUIRED");
        if (card.sourceHash !== card.finalizedSourceHash || !/^(?:[a-f0-9]{32}|[a-f0-9]{64})$/.test(card.sourceHash))
            fail("STALE_TIMECARD_SOURCE");
        if (card.pendingCorrections !== 0)
            fail("PENDING_CORRECTIONS");
        for (const e of card.entries) {
            const previous = entries.get(e.id);
            if (previous && stableExportJson(previous) !== stableExportJson(e))
                fail("CONFLICTING_RECORDED_SOURCE", e.id);
            entries.set(e.id, e);
        }
    }
    if (entries.size > 2048 || [...entries.values()].reduce((n, e) => n + e.breaks.length, 0) > 4096)
        fail('NATIVE_SOURCE_LIMIT');
    for (let date = contextStart; date < end; date = dateAdd(date, 1)) {
        if (!timecards.some(card => card.period.startDate <= date && card.period.endDate >= date))
            fail("COMPLETE_CONTEXT_REQUIRED", date);
    }
    const mealDays = new Map<string, MealDayEntry[]>();
    const rawPieces: Omit<WorkedPiece, "overtime" | "premiumReason" | "federalOvertime">[] = [];
    let previousEnd: bigint | null = null, unpaid = BigInt(0);
    const sorted = [...entries.values()].sort((a, b) => Temporal.Instant.compare(a.startAt, b.startAt) || a.id.localeCompare(b.id));
    for (const e of sorted) {
        if (!e.endAt)
            fail("OPEN_RECORDED_TIME", e.id);
        if ((e.sourceKind === "RECORDED" && (!Number.isSafeInteger(e.recordedVersion) || e.recordedVersion === null || e.recordedVersion < 0)) || (e.sourceKind === "ADJUSTMENT" && !e.adjustmentId) || !["RECORDED", "ADJUSTMENT"].includes(e.sourceKind))
            fail("RECORDED_PROVENANCE_REQUIRED", e.id);
        const start = ns(e.startAt), finish = ns(e.endAt);
        if (finish <= start || (previousEnd !== null && start < previousEnd))
            fail("OVERLAPPING_RECORDED_TIME", e.id);
        previousEnd = finish;
        let lastBreak = start;
        for (const b of [...e.breaks].sort((a, b) => Temporal.Instant.compare(a.startAt, b.startAt))) {
            if (!b.endAt)
                fail("OPEN_RECORDED_BREAK", b.id);
            if (ns(b.startAt) < lastBreak || ns(b.endAt) <= ns(b.startAt) || ns(b.endAt) > finish)
                fail("INVALID_RECORDED_BREAK", b.id);
            lastBreak = ns(b.endAt);
        }
        // The whole entry is attributed to its start; one that starts outside the
        // source window belongs to a day this calculation never pays or counts.
        if (start < left || start >= right)
            continue;
        const date = dateAt(start), week = weekContainingInstant(resolved.policy.boundary, e.startAt).startAt;
        const inPayPeriod = date >= period.startDate && date <= period.endDate;
        const cut = new Set<bigint>([start, finish]);
        for (const wage of wages)
            for (const boundary of [wage.effectiveFrom, wage.effectiveTo])
                if (boundary) {
                    const point = ns(boundary);
                    if (point > start && point < finish)
                        cut.add(point);
                }
        for (const b of e.breaks)
            for (const boundary of [b.startAt, b.endAt!]) {
                const point = ns(boundary);
                if (point > start && point < finish)
                    cut.add(point);
            }
        const points = [...cut].sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
        const mealBreaks: MealDayEntry["breaks"] = [];
        for (let index = 1; index < points.length; index++) {
            const a = points[index - 1], b = points[index];
            if (b <= a)
                continue;
            const eligible = wages.filter(w => w.locationIds.includes(e.locationId) && ns(w.effectiveFrom) <= a && (!w.effectiveTo || ns(w.effectiveTo) >= b));
            if (eligible.length !== 1)
                fail(eligible.length ? "CONFLICTING_WAGE_PROFILE" : "WAGE_PROFILE_REQUIRED", e.locationId);
            const wage = eligible[0], activeBreak = e.breaks.find(x => ns(x.startAt) <= a && ns(x.endAt!) >= b);
            if (activeBreak) {
                const kind = nativeBreakClass(wage, activeBreak);
                if (ns(activeBreak.startAt) === a)
                    mealBreaks.push({ start: ns(activeBreak.startAt), end: ns(activeBreak.endAt!), kind: kind.kind, mealMinimumMinutes: kind.mealMinimumMinutes });
                if (kind.pay === "UNPAID") {
                    if (inPayPeriod)
                        unpaid += b - a;
                    continue;
                }
            }
            rawPieces.push({ start: a, end: b, date, week, inPayPeriod, locationId: e.locationId, wage, rate: hourlyRate(wage.hourlyRateMinor) });
        }
        if (inPayPeriod)
            mealDays.set(date, [...(mealDays.get(date) ?? []), { start, end: finish, breaks: mealBreaks }]);
    }
    const pieces: WorkedPiece[] = [];
    let streak = 0, weeklyRegular = BigInt(0), weeklyWorked = BigInt(0), currentWeek = "";
    for (let date = contextStart; date < end; date = dateAdd(date, 1)) {
        const today = rawPieces.filter(p => p.date === date);
        streak = today.length ? streak + 1 : 0;
        let daily = BigInt(0);
        for (const raw of today) {
            if (ns(raw.week) < firstWeek) {
                daily += raw.end - raw.start;
                continue;
            }
            if (streak > 7 && !ownerPolicy)
                fail("UNSUPPORTED_CONTINUOUS_REST_SEQUENCE", date);
            if (raw.week !== currentWeek) {
                currentWeek = raw.week;
                weeklyRegular = BigInt(0);
                weeklyWorked = BigInt(0);
            }
            let a = raw.start;
            while (a < raw.end) {
                const premiumReason = (ownerPolicy ? streak >= 7 : streak === 7) ? "REST_DAY" as const : daily >= HOUR * BigInt(8) ? "DAILY" as const : weeklyRegular >= HOUR * BigInt(40) ? "WEEKLY" as const : null;
                const overtime = premiumReason !== null;
                const federalOvertime = weeklyWorked >= HOUR * BigInt(40);
                let length = raw.end - a;
                // Preserve separate daily/rest entitlement and full FLSA hours. Credit is money.
                for (const remaining of [HOUR * BigInt(8) - daily, HOUR * BigInt(40) - weeklyRegular, HOUR * BigInt(40) - weeklyWorked])
                    if (remaining > BigInt(0) && length > remaining)
                        length = remaining;
                pieces.push({ ...raw, start: a, end: a + length, overtime, premiumReason, federalOvertime });
                daily += length;
                weeklyWorked += length;
                if (!overtime)
                    weeklyRegular += length;
                a += length;
            }
        }
    }
    const boundaryEvidence: NativeBoundaryEvidence = { version: 'NATIVE_BOUNDARY_EVIDENCE_V1', workweekPolicy: resolved.policy, workweekPolicySha256: resolved.policySha256, sourceWindow: resolved.sourceWindow, fullWeekWindow: resolved.fullWeekWindow, dailyInterpretation: 'SHIFT_START_DAY', dailyInputDisposition: 'SHIFT_START_DAY_ALL_ENTRIES', dailyModels: ['SHIFT_START_DAY'], sourceSha256: createHash('sha256').update(stableExportJson({ employeeId: input.employeeId, sourceWindow: resolved.sourceWindow, timecards })).digest('hex') };
    const mealWarnings: MealWarning[] = [...mealDays.entries()].sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).flatMap(([date, day]) => mealWarningsForDay(date, day));
    return { pieces, unpaidBreakNanoseconds: unpaid, payLeft, payRight, boundaryEvidence, mealWarnings };
}
