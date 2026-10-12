import { validateNativeMinimumWage } from "./minimum-wage";
import { Temporal } from "@js-temporal/polyfill";
import { stableExportJson } from "../../payroll-export/json";
import type { NativePayrollInput, NativeRecordedEntry, NativeWageProfile } from "./contracts";
import { hourlyRate, type Rational } from "./money";
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
};
export function classifyRecordedTime(input: NativePayrollInput) {
    const { period, wages, timecards } = input;
    if (!wages.length)
        fail("WAGE_PROFILE_REQUIRED");
    const anchor = Temporal.PlainDate.from(wages[0].workweekAnchorDate);
    const weekOf = (date: string) => {
        const current = Temporal.PlainDate.from(date), days = ((current.dayOfWeek - anchor.dayOfWeek) + 7) % 7;
        return current.subtract({ days }).toString();
    };
    const firstWeek = weekOf(period.startDate), end = dateAdd(weekOf(period.endDate), 7), contextStart = dateAdd(firstWeek, -6);
    for (const wage of wages) {
        if (wage.compensation !== "HOURLY" || wage.employment !== "PR_PRIVATE_NONEXEMPT" || wage.dailyBasis !== "CALENDAR_DAY" || !["TIME_AND_HALF", "DOUBLE_PRESERVED"].includes(wage.overtime))
            fail("UNSUPPORTED_WAGE_PROFILE", wage.id);
        if (wage.standardContextAttested !== true)
            fail("WAGE_CONTEXT_ATTESTATION_REQUIRED", wage.id);
        if (Temporal.PlainDate.from(wage.workweekAnchorDate).dayOfWeek !== anchor.dayOfWeek || wage.overtime !== wages[0].overtime)
            fail("OVERTIME_POLICY_CONFLICT", wage.id);
        if (wage.workweekStartTime !== "00:00" || wage.overtimeBasis !== "WEIGHTED_WEEKLY")
            fail("UNSUPPORTED_WORKWEEK_BASIS", wage.id);
        if (wage.wageCentRounding !== "HALF_UP" && wage.wageCentRounding !== "UNVERIFIED")
            fail("WAGE_CENT_RULE_UNVERIFIED", wage.id);
        validateNativeMinimumWage(wage);
    }
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
    for (let date = contextStart; date < end; date = dateAdd(date, 1)) {
        if (!timecards.some(card => card.period.startDate <= date && card.period.endDate >= date))
            fail("COMPLETE_CONTEXT_REQUIRED", date);
    }
    const left = midnight(contextStart), right = midnight(end), payLeft = midnight(period.startDate), payRight = midnight(dateAdd(period.endDate, 1));
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
        const cut = new Set<bigint>([start < left ? left : start, finish > right ? right : finish]);
        if (finish <= left || start >= right)
            continue;
        for (let date = contextStart; date <= end; date = dateAdd(date, 1)) {
            const point = midnight(date);
            if (point > start && point < finish)
                cut.add(point);
        }
        for (const wage of wages)
            for (const boundary of [wage.effectiveFrom, wage.effectiveTo])
                if (boundary) {
                    const point = ns(boundary);
                    if (point > start && point < finish && point > left && point < right)
                        cut.add(point);
                }
        for (const b of e.breaks)
            for (const boundary of [b.startAt, b.endAt!]) {
                const point = ns(boundary);
                if (point > start && point < finish && point > left && point < right)
                    cut.add(point);
            }
        const points = [...cut].filter(point => point >= left && point <= right).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
        for (let index = 1; index < points.length; index++) {
            const a = points[index - 1], b = points[index];
            if (b <= a)
                continue;
            const eligible = wages.filter(w => w.locationIds.includes(e.locationId) && ns(w.effectiveFrom) <= a && (!w.effectiveTo || ns(w.effectiveTo) >= b));
            if (eligible.length !== 1)
                fail(eligible.length ? "CONFLICTING_WAGE_PROFILE" : "WAGE_PROFILE_REQUIRED", e.locationId);
            const wage = eligible[0], activeBreak = e.breaks.find(x => ns(x.startAt) <= a && ns(x.endAt!) >= b);
            if (activeBreak) {
                const treatment = wage.breakRules.filter(x => x.typeId === activeBreak.typeId);
                if (activeBreak.typeId === null || treatment.length !== 1)
                    fail("BREAK_PAY_BASIS_REQUIRED", activeBreak.id);
                const duration = ns(activeBreak.endAt!) - ns(activeBreak.startAt);
                if (treatment[0].treatment === "UNPAID_RELIEVED_MEAL") {
                    if (duration < HOUR / BigInt(2))
                        fail("UNSUPPORTED_UNPAID_BREAK_DURATION", activeBreak.id);
                    const clipped = (b < payRight ? b : payRight) - (a > payLeft ? a : payLeft);
                    if (clipped > BigInt(0))
                        unpaid += clipped;
                    continue;
                }
                if (treatment[0].treatment !== "PAID_REST" || duration > HOUR / BigInt(3))
                    fail("UNSUPPORTED_PAID_BREAK_BASIS", activeBreak.id);
            }
            const date = dateAt(a);
            rawPieces.push({ start: a, end: b, date, week: weekOf(date), locationId: e.locationId, wage, rate: hourlyRate(wage.hourlyRateMinor) });
        }
    }
    const pieces: WorkedPiece[] = [];
    let streak = 0, weeklyRegular = BigInt(0), weeklyWorked = BigInt(0), currentWeek = "";
    for (let date = contextStart; date < end; date = dateAdd(date, 1)) {
        const today = rawPieces.filter(p => p.date === date);
        streak = today.length ? streak + 1 : 0;
        if (date < firstWeek)
            continue;
        if (streak > 7)
            fail("UNSUPPORTED_CONTINUOUS_REST_SEQUENCE", date);
        const week = weekOf(date);
        if (week !== currentWeek) {
            currentWeek = week;
            weeklyRegular = BigInt(0);
            weeklyWorked = BigInt(0);
        }
        let daily = BigInt(0);
        for (const raw of today) {
            let a = raw.start;
            while (a < raw.end) {
                const premiumReason = streak === 7 ? "REST_DAY" as const : daily >= HOUR * BigInt(8) ? "DAILY" as const : weeklyRegular >= HOUR * BigInt(40) ? "WEEKLY" as const : null;
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
    return { pieces, unpaidBreakNanoseconds: unpaid, payLeft, payRight };
}
