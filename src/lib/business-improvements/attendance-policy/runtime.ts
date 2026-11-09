import { createHash } from "node:crypto";
import { Temporal } from "@js-temporal/polyfill";
import { resolveHistoricalSchedule } from "../../attendance/historical-schedule";
import type { AttendanceSource } from "../../attendance/types";
import type {
  EffectiveCompanyPolicies,
  OvertimeRiskRule,
} from "../company-policies/model";
import {
  detectorKinds,
  evaluateConfiguredDetectors,
  type DetectorKind,
  type DetectorMeasurement,
  type DetectorPolicy,
  type DetectorResult,
} from "./model";
export type PolicyLocation = {
  locationId: string;
  companyRevision: number;
  locationRevision: number;
  effective: EffectiveCompanyPolicies;
};
export type ActualPeriod = {
  id: string;
  employeeId: string;
  locationId: string;
  startAt: string;
  endAt: string | null;
  version: string;
  scheduleContext: unknown;
};
export type ExpectedShift = {
  id: string;
  employeeId: string;
  locationId: string;
  revisionId: string;
  date: string;
  startTime: string;
  endTime: string;
  callout: boolean;
};
export type PolicyRuntime = {
  observedAt: string;
  locations: string[];
  raw: ActualPeriod[];
  effective: ActualPeriod[];
  census: ExpectedShift[];
  complete: boolean;
  censusComplete: boolean;
};
const bases: Record<DetectorKind, string> = {
  missing_clock_in: "APPROVED_EXPECTED_ASSIGNMENT_CENSUS",
  missing_clock_out: "CAPTURED_SCHEDULE_END_OPEN_DELTA",
  policy_lateness: "CAPTURED_SCHEDULE_START_DELTA",
  policy_early_departure: "CAPTURED_SCHEDULE_END_DELTA",
  unusually_long_entry: "APPROVED_ENTRY_ELAPSED_BASIS",
  overtime_risk: "APPROVED_EFFECTIVE_TIME_PERIOD_BASIS",
};
const ns = (s: string) => Temporal.Instant.from(s).epochNanoseconds;
const max = (a: bigint, b: bigint) => (a > b ? a : b),
  min = (a: bigint, b: bigint) => (a < b ? a : b);
function periodStart(
  now: Temporal.Instant,
  zone: string,
  rule: OvertimeRiskRule,
) {
  const local = now.toZonedDateTimeISO(zone);
  let date = local.toPlainDate();
  const time = Temporal.PlainTime.from(rule.dayBoundaryTime);
  if (Temporal.PlainTime.compare(local.toPlainTime(), time) < 0)
    date = date.subtract({ days: 1 });
  if (rule.window === "BUSINESS_WEEK")
    date = date.subtract({
      days: ((date.dayOfWeek % 7) - rule.weekStartsOn! + 7) % 7,
    });
  return date
    .toPlainDateTime(time)
    .toZonedDateTime(zone, { disambiguation: "reject" })
    .toInstant().epochNanoseconds;
}
function shiftBounds(s: ExpectedShift, zone: string) {
  const date = Temporal.PlainDate.from(s.date),
    start = date
      .toPlainDateTime(s.startTime)
      .toZonedDateTime(zone, { disambiguation: "reject" })
      .toInstant();
  const endDate = s.endTime.startsWith("24:00") ? date.add({ days: 1 }) : date;
  const endTime = s.endTime.startsWith("24:00") ? "00:00:00" : s.endTime;
  let end = endDate
    .toPlainDateTime(endTime)
    .toZonedDateTime(zone, { disambiguation: "reject" })
    .toInstant();
  if (Temporal.Instant.compare(end, start) <= 0)
    end = date
      .add({ days: 1 })
      .toPlainDateTime(endTime)
      .toZonedDateTime(zone, { disambiguation: "reject" })
      .toInstant();
  return { start: start.epochNanoseconds, end: end.epochNanoseconds };
}
/** Factual, configured comparisons only. Recorded punches, effective intervals,
 * captured schedule deltas and planned census remain distinct source bases.
 * No break deduction, legal entitlement, absence or discipline is inferred. */
export function projectPolicyRuntime(
  source: AttendanceSource,
  locations: PolicyLocation[],
  runtime: PolicyRuntime,
):
  | {
      state: "ready";
      workspaceId: string;
      observedAt: string;
      locations: {
        locationId: string;
        companyRevision: number;
        locationRevision: number;
        detectors: DetectorResult[];
      }[];
    }
  | { state: "unavailable"; reason: "invalid_source" | "source_limit" } {
  try {
    const now = Temporal.Instant.from(runtime.observedAt),
      nowNs = now.epochNanoseconds,
      dayStart = now
        .toZonedDateTimeISO(source.timeZone)
        .startOfDay()
        .toInstant().epochNanoseconds;
    if (
      locations.length > 100 ||
      runtime.raw.length > 10000 ||
      runtime.effective.length > 10000 ||
      runtime.census.length > 10000
    )
      return { state: "unavailable", reason: "source_limit" };
    const output = [];
    for (const location of locations) {
      const selected = location.effective,
        policies: DetectorPolicy[] = [],
        measurements: DetectorMeasurement[] = [],
        complete = new Set<DetectorKind>();
      const ruleMap = {
        missing_clock_in: selected.attendance.missingClockIn,
        missing_clock_out: selected.attendance.missingClockOut,
        policy_lateness: selected.attendance.lateness,
        policy_early_departure: selected.attendance.earlyDeparture,
        unusually_long_entry: selected.attendance.longEntry,
        overtime_risk: selected.labor.overtimeRisk,
      };
      for (const kind of detectorKinds) {
        const rule = ruleMap[kind];
        if (rule) {
          policies.push({
            kind,
            id: `company-settings:${location.locationId}:${kind}`,
            version: Math.max(
              location.companyRevision,
              location.locationRevision,
            ),
            approvalReference: `owner-settings:${location.companyRevision}:${location.locationRevision}`,
            basis: bases[kind],
            thresholdNanoseconds: (
              BigInt(rule.thresholdMinutes) * BigInt(60000000000)
            ).toString(),
            comparison: rule.comparison,
          });
          if (runtime.complete) complete.add(kind);
        }
      }
      const add = (
        kind: DetectorKind,
        id: string,
        employeeId: string,
        value: bigint,
        version: string,
        valid = true,
      ) =>
        measurements.push({
          kind,
          id,
          employeeId,
          locationId: location.locationId,
          basis: bases[kind],
          valueNanoseconds: max(BigInt(0), value).toString(),
          sourceVersion: version,
          complete: valid && runtime.complete,
        });
      const invalid = (kind: DetectorKind) => {
        complete.delete(kind);
        add(
          kind,
          `unverifiable:${kind}`,
          "source-unverifiable",
          BigInt(0),
          "unverifiable",
          false,
        );
      };
      for (const entry of source.entries.filter(
        (e) => e.locationId === location.locationId,
      )) {
        const historyInvalid =
          ns(entry.clockInAt) > nowNs ||
          (entry.clockOutAt !== null &&
            (ns(entry.clockOutAt) <= ns(entry.clockInAt) ||
              ns(entry.clockOutAt) > nowNs));
        const schedule = resolveHistoricalSchedule(source, entry);
        const clockOutRule = selected.attendance.missingClockOut;
        if (
          clockOutRule &&
          entry.clockOutAt === null &&
          ns(entry.clockInAt) >= ns(clockOutRule.effectiveFrom)
        ) {
          if (historyInvalid || schedule.state !== "matched")
            invalid("missing_clock_out");
          else if (ns(schedule.endAt) <= nowNs)
            add(
              "missing_clock_out",
              entry.id,
              entry.employeeId,
              nowNs - ns(schedule.endAt),
              `raw:${entry.sourceVersion}:${schedule.revisionId}:${schedule.publishedShiftId}`,
            );
        }
        for (const [kind, rule] of [
          ["policy_lateness", selected.attendance.lateness],
          ["policy_early_departure", selected.attendance.earlyDeparture],
        ] as const) {
          if (
            !rule ||
            ns(entry.clockInAt) < ns(rule.effectiveFrom) ||
            (kind === "policy_early_departure" && entry.clockOutAt === null)
          )
            continue;
          if (historyInvalid || schedule.state !== "matched") {
            invalid(kind);
            continue;
          }
          const value =
            kind === "policy_lateness"
              ? ns(entry.clockInAt) - ns(schedule.startAt)
              : ns(schedule.endAt) - ns(entry.clockOutAt!);
          // Only the underlying positive factual delta is policy-comparable. A zero
          // configured tolerance does not turn an on-time punch into a deviation.
          if (value > BigInt(0))
            add(
              kind,
              entry.id,
              entry.employeeId,
              value,
              `raw:${entry.sourceVersion}:${schedule.revisionId}:${schedule.publishedShiftId}`,
            );
        }
      }
      const long = selected.attendance.longEntry;
      if (long) {
        const rows = (
          long.basis === "RECORDED_ELAPSED" ? runtime.raw : runtime.effective
        ).filter((e) => e.locationId === location.locationId);
        for (const row of rows) {
          const start = ns(row.startAt),
            end = row.endAt === null ? nowNs : ns(row.endAt);
          if (
            (row.endAt !== null && end <= dayStart) ||
            start < ns(long.effectiveFrom) ||
            (long.appliesTo === "OPEN" && row.endAt !== null) ||
            (long.appliesTo === "CLOSED" && row.endAt === null)
          )
            continue;
          add(
            "unusually_long_entry",
            row.id,
            row.employeeId,
            end - start,
            row.version,
            start <= nowNs && end > start && end <= nowNs,
          );
        }
      }
      const missing = selected.attendance.missingClockIn;
      if (missing) {
        if (!runtime.censusComplete) invalid("missing_clock_in");
        for (const shift of runtime.census.filter(
          (s) => s.locationId === location.locationId && !s.callout,
        )) {
          try {
            const bounds = shiftBounds(shift, source.timeZone);
            if (
              bounds.end <= dayStart ||
              bounds.start < ns(missing.effectiveFrom)
            )
              continue;
            const cutoff =
              missing.cutoff === "AFTER_SCHEDULE_START"
                ? bounds.start
                : bounds.end;
            if (cutoff > nowNs) continue;
            const candidates = runtime.raw.filter((row) => {
              const context = row.scheduleContext as {
                status?: string;
                match?: { revisionId?: string; publishedShiftId?: string };
              } | null;
              return (
                row.employeeId === shift.employeeId &&
                row.locationId === shift.locationId &&
                context?.status === "MATCHED" &&
                context.match?.revisionId === shift.revisionId &&
                context.match.publishedShiftId === shift.id
              );
            });
            let associated = false;
            for (const row of candidates) {
              const captured = source.entries.find((e) => e.id === row.id);
              if (
                !captured ||
                resolveHistoricalSchedule(source, captured).state !== "matched"
              )
                invalid("missing_clock_in");
              else associated = true;
            }
            if (!associated)
              add(
                "missing_clock_in",
                shift.id,
                shift.employeeId,
                nowNs - cutoff,
                `published:${shift.revisionId}:${shift.id}`,
              );
          } catch {
            invalid("missing_clock_in");
          }
        }
      }
      const overtime = selected.labor.overtimeRisk;
      if (overtime) {
        try {
          const from = periodStart(now, source.timeZone, overtime);
          if (ns(overtime.effectiveFrom) > from)
            throw Error("Policy changed within aggregation period");
          const all =
            overtime.basis === "RECORDED_ELAPSED_INCLUDING_BREAKS"
              ? runtime.raw
              : runtime.effective;
          const employeeIds = new Set(
            all
              .filter(
                (r) =>
                  r.locationId === location.locationId &&
                  ns(r.startAt) < nowNs &&
                  (r.endAt === null || ns(r.endAt) > from),
              )
              .map((r) => r.employeeId),
          );
          for (const employeeId of employeeIds) {
            const rows = all.filter(
              (r) =>
                r.employeeId === employeeId &&
                (overtime.aggregation === "COMPANY" ||
                  r.locationId === location.locationId) &&
                ns(r.startAt) < nowNs &&
                (r.endAt === null || ns(r.endAt) > from),
            );
            const intervals = rows
              .map((r) => ({
                row: r,
                start: ns(r.startAt),
                end: r.endAt === null ? nowNs : ns(r.endAt),
              }))
              .sort((a, b) =>
                a.start < b.start ? -1 : a.start > b.start ? 1 : 0,
              );
            let total = BigInt(0),
              valid = true,
              previousEnd: bigint | null = null;
            for (const interval of intervals) {
              if (
                interval.end <= interval.start ||
                interval.end > nowNs ||
                (previousEnd !== null && interval.start < previousEnd)
              )
                valid = false;
              previousEnd = interval.end;
              total += max(
                BigInt(0),
                min(interval.end, nowNs) - max(interval.start, from),
              );
            }
            add(
              "overtime_risk",
              `${employeeId}:${overtime.aggregation}:${from}`,
              employeeId,
              total,
              createHash("sha256")
                .update(JSON.stringify(rows.map((r) => [r.id, r.version])))
                .digest("hex"),
              valid,
            );
          }
        } catch {
          invalid("overtime_risk");
        }
      }
      const result = evaluateConfiguredDetectors({
        workspaceId: source.workspaceId,
        observedAt: runtime.observedAt,
        policies,
        measurements,
        completeKinds: [...complete],
      });
      if (result.state !== "ready") return result;
      output.push({
        locationId: location.locationId,
        companyRevision: location.companyRevision,
        locationRevision: location.locationRevision,
        detectors: result.detectors,
      });
    }
    return {
      state: "ready",
      workspaceId: source.workspaceId,
      observedAt: runtime.observedAt,
      locations: output,
    };
  } catch {
    return { state: "unavailable", reason: "invalid_source" };
  }
}
