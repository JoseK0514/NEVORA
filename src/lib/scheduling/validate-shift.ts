import { evaluateOperationalRules } from './operational-rules';
import type { OperationalRuleProfile, OperationalRuleResult, ScheduledBreakFacts, OperationalIssueCode } from '../shift-changes/types';
import { shiftBoundaryInstants } from "../business-time";
import { assignmentCapabilityIssues } from "./capabilities";
import type { Workspace, Location, Position, UserRole } from "../domain";
import {
  resolveAvailabilityDay,
  type AvailabilityHours,
  type AvailabilityException,
  type WeeklyAvailability,
} from "./availability";
import {
  affectedWorkweeks,
  businessDateStart,
  minutesInWorkweek,
  periodsOverlap,
  shiftPeriod,
  splitBusinessDays,
  timeMinutes,
} from "./periods";

export type ValidationSeverity = "error" | "warning";
export type ValidationIssueCode = OperationalIssueCode
  | "INVALID_TIME_RANGE"
  | "INVALID_SCHEDULING_INPUT"
  | "EMPLOYEE_INACTIVE"
  | "LOCATION_INACTIVE"
  | "POSITION_INELIGIBLE"
  | "POSITION_INACTIVE"
  | "POSITION_COVERAGE_GAP"
  | "LOCATION_NOT_ELIGIBLE"
  | "ROLE_INELIGIBLE"
  | "LEAD_REQUIREMENT"
  | "SHIFT_OVERLAP"
  | "APPROVED_TIME_OFF"
  | "OUTSIDE_AVAILABILITY"
  | "WEEKLY_AVAILABILITY_CONFLICT"
  | "AVAILABILITY_NOT_SUBMITTED"
  | "AVAILABILITY_NOT_SET"
  | "MULTIPLE_SHIFTS_SAME_DAY"
  | "MAX_WEEKLY_HOURS"
  | "TARGET_HOURS_EXCEEDED"
  | "STAFFING_GAP"
  | "LEAD_COVERAGE_GAP";
export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  message: string;
  details?: Record<string, string | number | boolean>;
};
export type ShiftCandidate = {
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
  endDate?: string;
  isDesignatedLead?: boolean;
  requiredRole?: UserRole;
  positionId?: string;
};
export type ValidateShiftInput = {
  candidate: ShiftCandidate;
  operationalProfile?: OperationalRuleProfile;
  scheduledBreaks?: ScheduledBreakFacts;
  workspace: Pick<Workspace, "id" | "active" | "timeZone">;
  location: Pick<Location, "id" | "workspaceId" | "active">;
  position?: Position;
  employee: {
    positionIds: readonly string[];
    active: boolean;
    role: UserRole;
    eligibleLocationIds: readonly string[];
    targetWeeklyHours?: number;
    maximumWeeklyHours?: number;
  };
  existingShifts: readonly (ShiftCandidate & {
    id?: string;
    isCalloutApproved?: boolean;
  })[];
  availability: readonly AvailabilityHours[];
  weeklyAvailability?: readonly WeeklyAvailability[];
  availabilityExceptions?: readonly AvailabilityException[];
  approvedTimeOff: readonly {
    employeeId?: string;
    startDate: string;
    endDate: string;
    startTime?: string;
    endTime?: string;
    status?: string;
  }[];
  excludedShiftIds?: readonly string[];
  /** Compatibility only; projections use the dated cross-location shift ledger. */
  existingWeeklyMinutes?: number;
  mode?: "AUTOMATIC" | "MANAGER_SCHEDULE" | "SHIFT_EXCHANGE";
  policy?: {
    maximumShiftsPerDay?: number;
    businessMaximumWeeklyHours?: number;
  };
};
export type ProjectedScheduledHours = {
  weekStart: string;
  existingHours: number;
  assignmentHours: number;
  projectedHours: number;
  maximumHours: number;
  targetHours?: number;
  differenceFromTarget?: number;
  source: "SCHEDULED";
};
const messages: Record<ValidationIssueCode, string> = {
 MIN_REST: "Insufficient rest under the configured rule.",
 MAX_SHIFT_HOURS: "Exceeds configured per-shift maximum.",
 MAX_DAILY_HOURS: "Exceeds configured daily maximum.",
 BREAK_REQUIREMENT: "Required scheduled break is not satisfied.",
 RULE_UNVERIFIABLE: "Required scheduling rule cannot be verified.",
 PROJECTED_OVERTIME_REVIEW: "Projected scheduled overtime needs manager review.",
  INVALID_TIME_RANGE: "Enter a valid shift date and time period.",
  INVALID_SCHEDULING_INPUT:
    "Scheduling inputs need correction before this assignment can be evaluated.",
  EMPLOYEE_INACTIVE: "Inactive employees cannot be scheduled.",
  LOCATION_INACTIVE: "The location or workspace is inactive or unavailable.",
  POSITION_INACTIVE: "The assigned position is inactive or unavailable.",
  POSITION_INELIGIBLE: "Employee is not qualified for the assigned position.",
  POSITION_COVERAGE_GAP: "This period needs additional employees assigned to required positions.",
  LOCATION_NOT_ELIGIBLE: "Employee is not eligible to work at this location.",
  ROLE_INELIGIBLE: "Employee does not have the required role capability.",
  LEAD_REQUIREMENT: "This position requires a qualified Lead.",
  SHIFT_OVERLAP: "Employee already has an overlapping shift.",
  APPROVED_TIME_OFF: "Employee has approved time off during this shift.",
  OUTSIDE_AVAILABILITY: "Employee is not available for the complete shift.",
  WEEKLY_AVAILABILITY_CONFLICT:
    "This shift conflicts with the employee's availability change.",
  AVAILABILITY_NOT_SUBMITTED:
    "This week's availability has not been confirmed; normal availability was used.",
  AVAILABILITY_NOT_SET:
    "This employee has not set availability yet, so they were treated as available.",
  MULTIPLE_SHIFTS_SAME_DAY:
    "Employee already has a scheduled shift on this day.",
  MAX_WEEKLY_HOURS:
    "This assignment would exceed the employee's maximum weekly scheduled hours.",
  TARGET_HOURS_EXCEEDED:
    "Projected hours exceed the employee's target; the assignment remains eligible if other rules pass.",
  STAFFING_GAP: "This period needs additional employees.",
  LEAD_COVERAGE_GAP: "This period needs a qualified designated Lead.",
};
export function schedulingIssueMessage(code: string) {
  return messages[code as ValidationIssueCode];
}
/** Shared configured ceiling arithmetic for validation and candidate endpoint enumeration. */
export function maximumScheduledWeeklyHours(
  employee: Pick<ValidateShiftInput["employee"], "maximumWeeklyHours">,
  policy: NonNullable<ValidateShiftInput["policy"]> = {},
) {
  return Math.min(
    employee.maximumWeeklyHours ?? 40,
    policy.businessMaximumWeeklyHours ?? Infinity,
  );
}
/**
 * Shared assignment rules over the employee's complete dated, cross-location
 * ledger. Exclude replaced shift IDs explicitly; released callouts receive no
 * overlap/hour credit. Overnight work is split across business days/workweeks.
 * canSave reflects hard blockers; eligible additionally rejects operational
 * manager-review warnings so automatic planners cannot silently accept them.
 * Oct 25, 2026 (business B-06/B-07): an employee with no saved availability at
 * all is treated as available (AVAILABILITY_NOT_SET warning) when an Owner or
 * Manager schedules by hand (MANAGER_SCHEDULE), who may also save outside
 * availability or past the weekly hours ceiling as a warning. AUTOMATIC and
 * SHIFT_EXCHANGE keep all three as blockers.
 * This pure result supplies no persistence or caller authorization.
 */
export function validateShift(input: ValidateShiftInput) {
  const { candidate, employee, mode = "AUTOMATIC", policy = {} } = input;
  const issues: ValidationIssue[] = [],
    projectedHours: ProjectedScheduledHours[] = [];
  const add = (
    code: ValidationIssueCode,
    details?: ValidationIssue["details"],
    severity: ValidationSeverity = "error",
  ) =>
    issues.push({
      code,
      severity,
      message: messages[code],
      ...(details ? { details } : {}),
    });
  let operational: OperationalRuleResult = { blockers: [], unverifiable: [], warnings: [] };
  const result = () => {
    const blockers = issues.filter((issue) => issue.severity === "error"),
      warnings = issues.filter((issue) => issue.severity === "warning");
    return {
      eligible: blockers.length === 0 && operational.warnings.length === 0,
      operational,
      canSave: blockers.length === 0,
      issues,
      blockers,
      warnings,
      projectedHours,
    };
  };
  let period;
  try {
    if (!candidate.employeeId || !candidate.locationId)
      throw new Error("Missing identity");
    period = shiftPeriod(candidate);
    shiftBoundaryInstants(candidate, input.workspace.timeZone);
  } catch {
    add("INVALID_TIME_RANGE");
    return result();
  }
  const maximum = maximumScheduledWeeklyHours(employee, policy),
    dailyLimit = policy.maximumShiftsPerDay ?? 1;
  const validHours = (value: number | undefined) =>
    value === undefined ||
    (Number.isFinite(value) && value >= 0 && value <= 168);
  if (
    !validHours(employee.maximumWeeklyHours) ||
    !validHours(employee.targetWeeklyHours) ||
    !validHours(policy.businessMaximumWeeklyHours) ||
    !Number.isInteger(dailyLimit) ||
    dailyLimit < 1
  ) {
    add("INVALID_SCHEDULING_INPUT");
    return result();
  }
  for (const code of assignmentCapabilityIssues(input))
    add(code, code === 'LOCATION_NOT_ELIGIBLE' ? {locationId:candidate.locationId} : undefined);
  const excluded = new Set(input.excludedShiftIds),
    seen = new Set<string>();
  const ledger = input.existingShifts.filter((shift) => {
    if (
      shift.employeeId !== candidate.employeeId ||
      shift.isCalloutApproved ||
      (shift.id && (excluded.has(shift.id) || seen.has(shift.id)))
    )
      return false;
    if (shift.id) seen.add(shift.id);
    return true;
  });
  try {
    const records = ledger.map((shift) => ({
      shift,
      period: shiftPeriod(shift),
    }));
    for (const record of records.filter((record) =>
      periodsOverlap(period, record.period),
    ))
      add("SHIFT_OVERLAP", {
        locationId: record.shift.locationId,
        date: record.shift.date,
        shiftId: record.shift.id ?? "",
      });
    const warnedWeeks = new Set<string>();
    const manual = mode === "MANAGER_SCHEDULE";
    const neverSet =
      manual &&
      input.availability.length === 0 &&
      !(input.weeklyAvailability ?? []).some((week) => week.windows.length > 0) &&
      !(input.availabilityExceptions ?? []).length;
    let notSetWarned = false;
    for (const day of splitBusinessDays(period)) {
      const dayStart = businessDateStart(day.date);
      const sameDay = records.filter((record) =>
        periodsOverlap(record.period, {
          start: dayStart,
          end: dayStart + 1440,
        }),
      );
      if (sameDay.length >= dailyLimit)
        add(
          "MULTIPLE_SHIFTS_SAME_DAY",
          {
            date: day.date,
            existingShifts: sameDay.length,
            maximumShiftsPerDay: dailyLimit,
          },
          mode === "AUTOMATIC" || policy.maximumShiftsPerDay !== undefined
            ? "error"
            : "warning",
        );
      const resolved = resolveAvailabilityDay({
        date: day.date,
        normal: input.availability,
        weeks: input.weeklyAvailability,
        exceptions: input.availabilityExceptions,
      });
      if (neverSet && resolved.source === "NORMAL") {
        if (!notSetWarned) {
          notSetWarned = true;
          add("AVAILABILITY_NOT_SET", { date: day.date }, "warning");
        }
      } else if (
        !resolved.windows.some(
          (window) =>
            window.start <= day.startMinute && window.end >= day.endMinute,
        )
      )
        add(
          resolved.source === "NORMAL"
            ? "OUTSIDE_AVAILABILITY"
            : "WEEKLY_AVAILABILITY_CONFLICT",
          { date: day.date },
          manual ? "warning" : "error",
        );
      if (
        resolved.submitted === false &&
        !warnedWeeks.has(resolved.weekStart)
      ) {
        warnedWeeks.add(resolved.weekStart);
        add(
          "AVAILABILITY_NOT_SUBMITTED",
          { weekStart: resolved.weekStart },
          "warning",
        );
      }
      for (const request of input.approvedTimeOff) {
        if (
          (request.status && request.status !== "APPROVED") ||
          (request.employeeId && request.employeeId !== candidate.employeeId)
        )
          continue;
        businessDateStart(request.startDate);
        businessDateStart(request.endDate);
        if (request.endDate < request.startDate)
          throw new Error("Invalid leave dates");
        if (day.date < request.startDate || day.date > request.endDate)
          continue;
        if (Boolean(request.startTime) !== Boolean(request.endTime))
          throw new Error("Incomplete leave period");
        const start = request.startTime ? timeMinutes(request.startTime) : 0,
          end = request.endTime ? timeMinutes(request.endTime, true) : 1440;
        if (start >= end) throw new Error("Invalid leave period");
        if (
          periodsOverlap(
            { start: day.startMinute, end: day.endMinute },
            { start, end },
          )
        )
          add("APPROVED_TIME_OFF", { date: day.date });
      }
    }
    for (const weekStart of affectedWorkweeks(period)) {
      const existingMinutes = records.reduce(
          (sum, record) => sum + minutesInWorkweek(record.period, weekStart),
          0,
        ),
        assignmentMinutes = minutesInWorkweek(period, weekStart),
        total = existingMinutes + assignmentMinutes;
      projectedHours.push({
        weekStart,
        existingHours: existingMinutes / 60,
        assignmentHours: assignmentMinutes / 60,
        projectedHours: total / 60,
        maximumHours: maximum,
        ...(employee.targetWeeklyHours !== undefined
          ? {
              targetHours: employee.targetWeeklyHours,
              differenceFromTarget: total / 60 - employee.targetWeeklyHours,
            }
          : {}),
        source: "SCHEDULED",
      });
      if (total > maximum * 60)
        add(
          "MAX_WEEKLY_HOURS",
          {
            weekStart,
            projectedHours: total / 60,
            maximumHours: maximum,
          },
          mode === "MANAGER_SCHEDULE" && policy.businessMaximumWeeklyHours === undefined
            ? "warning"
            : "error",
        );
      if (
        employee.targetWeeklyHours !== undefined &&
        total > employee.targetWeeklyHours * 60
      )
        add(
          "TARGET_HOURS_EXCEEDED",
          {
            weekStart,
            projectedHours: total / 60,
            targetHours: employee.targetWeeklyHours,
          },
          "warning",
        );
    }
  } catch {
    add("INVALID_SCHEDULING_INPUT");
  }
  if (input.operationalProfile) {
    operational = evaluateOperationalRules({candidate,existingShifts: ledger,profile:input.operationalProfile,timeZone:input.workspace.timeZone,scheduledBreaks:input.scheduledBreaks ?? {status:'UNKNOWN'}});
    for (const issue of [...operational.blockers,...operational.unverifiable]) issues.push({...issue,code:issue.code as ValidationIssueCode,severity:'error'});
    for (const issue of operational.warnings) issues.push({...issue,code:issue.code as ValidationIssueCode,severity:'warning'});
  }
  return result();
}
