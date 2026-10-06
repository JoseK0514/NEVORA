import { addDays } from "../../date-utils";
import { resolveAvailabilityDay } from "../availability";
import {
  affectedWorkweeks,
  businessDateStart,
  minutesInWorkweek,
  shiftPeriod,
  splitBusinessDays,
  timeMinutes,
} from "../periods";
import { maximumScheduledWeeklyHours } from "../validate-shift";
import { selectActiveGenerationReservations } from "./reservations";
import type {
  GenerationInput,
  GenerationDemand,
  GenerationAssignment,
  GenerationPeriod,
  GenerationExplanation,
} from "./types";

/** Re-enumerate after each ledger change; endpoint arithmetic is not an eligibility decision. */
export function enumerateGenerationPeriods(
  input: GenerationInput,
  demand: GenerationDemand,
  currentLedger: GenerationAssignment[],
): {
  periods: GenerationPeriod[];
  exhausted: boolean;
  issues: GenerationExplanation[];
} {
  if (
    !Number.isSafeInteger(input.limits.maxPeriods) ||
    input.limits.maxPeriods < 1
  )
    throw new Error("Invalid period budget.");
  const periods: GenerationPeriod[] = [],
    issues: GenerationExplanation[] = [];
  const civil = (n: number) => new Date(n * 60000).toISOString().slice(0, 16);
  const reservations = selectActiveGenerationReservations(input, demand);
  const seen = new Set<string>();
  const ledger = currentLedger
    .filter((s) => {
      if (s.isCalloutApproved || seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    })
    .map((s) => ({ row: s, period: shiftPeriod(s) }));
  for (const locationId of [...demand.locationIds].sort()) {
    const open: { start: number; end: number }[] = [];
    for (const b of demand.blocks
      .filter((b) => b.locationId === locationId)
      .map((b) => shiftPeriod(b))
      .sort((a, b) => a.start - b.start)) {
      const last = open.at(-1);
      if (last && b.start <= last.end) last.end = Math.max(last.end, b.end);
      else open.push({ ...b });
    }
    for (const run of open) {
      const boundaries = new Set([run.start, run.end]);
      const put = (value: number) => {
        if (value > run.start && value < run.end) boundaries.add(value);
      };
      for (const block of demand.blocks.filter(
        (b) => b.locationId === locationId,
      )) {
        const p = shiftPeriod(block);
        put(p.start);
        put(p.end);
      }
      for (const reservation of reservations.filter(
        (r) => r.locationId === locationId,
      )) {
        put(reservation.start);
        put(reservation.end);
      }
      for (const record of ledger) {
        put(record.period.start);
        put(record.period.end);
      }
      for (const day of splitBusinessDays(run)) {
        const start = businessDateStart(day.date);
        put(start);
        put(start + 1440);
        for (const employee of input.employees) {
          const resolved = resolveAvailabilityDay({
            date: day.date,
            normal: employee.availability,
            weeks: employee.weeklyAvailability,
            exceptions: employee.availabilityExceptions,
          });
          for (const window of resolved.windows) {
            put(start + window.start);
            put(start + window.end);
          }
          for (const leave of employee.approvedTimeOff) {
            if (
              (leave.status && leave.status !== "APPROVED") ||
              (leave.employeeId && leave.employeeId !== employee.id) ||
              day.date < leave.startDate ||
              day.date > leave.endDate
            )
              continue;
            put(start + (leave.startTime ? timeMinutes(leave.startTime) : 0));
            put(
              start + (leave.endTime ? timeMinutes(leave.endTime, true) : 1440),
            );
          }
        }
      }
      // Anchors are input-derived only. Do not recursively add a guessed time grid.
      const anchors = [...boundaries];
      for (const employee of input.employees)
        for (const week of affectedWorkweeks(run)) {
          const weekStart = businessDateStart(week),
            weekEnd = businessDateStart(addDays(week, 7));
          const remaining = Math.floor(
            maximumScheduledWeeklyHours(employee, input.policy) * 60 -
              ledger
                .filter((r) => r.row.employeeId === employee.id)
                .reduce((s, r) => s + minutesInWorkweek(r.period, week), 0),
          );
          if (!Number.isFinite(remaining) || remaining <= 0) continue;
          for (const anchor of anchors) {
            if (
              anchor >= weekStart &&
              anchor < weekEnd &&
              anchor + remaining <= weekEnd
            )
              put(anchor + remaining);
            if (
              anchor > weekStart &&
              anchor <= weekEnd &&
              anchor - remaining >= weekStart
            )
              put(anchor - remaining);
          }
        }
      const points = [...boundaries].sort((a, b) => a - b);
      let unrepresentable = false;
      for (let a = 0; a < points.length - 1; a++)
        for (let b = points.length - 1; b > a; b--) {
          const start = points[a],
            end = points[b],
            date = civil(start).slice(0, 10),
            dayStart = businessDateStart(date);
          // The persisted schema stores one date. Overnight end must be earlier than start.
          const endTime =
            end === dayStart + 1440 ? "24:00" : civil(end).slice(11);
          const startTime = civil(start).slice(11);
          if (
            end > dayStart + 1440 &&
            (end >= dayStart + 2880 || endTime >= startTime)
          ) {
            unrepresentable = true;
            continue;
          }
          if (periods.length === input.limits.maxPeriods) {
            issues.push({
              code: "BUDGET_EXHAUSTED",
              locationId,
              message: "Candidate period budget exhausted.",
            });
            return { periods, exhausted: true, issues };
          }
          periods.push({ locationId, date, startTime, endTime, start, end });
        }
      if (unrepresentable)
        issues.push({
          code: "UNREPRESENTABLE_PERIOD",
          locationId,
          start: civil(run.start),
          end: civil(run.end),
          message:
            "Some contiguous periods cannot be stored with a single assignment date.",
        });
    }
  }
  return { periods, exhausted: false, issues };
}
