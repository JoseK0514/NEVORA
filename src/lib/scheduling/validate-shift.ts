export type ValidationSeverity = "error" | "warning";

export type ValidationIssueCode =
  | "INVALID_TIME_RANGE"
  | "EMPLOYEE_INACTIVE"
  | "LOCATION_NOT_ELIGIBLE"
  | "SHIFT_OVERLAP"
  | "APPROVED_TIME_OFF"
  | "OUTSIDE_AVAILABILITY"
  | "WEEKLY_HOURS";

export type ValidationIssue = {
  code: ValidationIssueCode;
  severity: ValidationSeverity;
  message: string;
};

export type ShiftCandidate = {
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
};

type ExistingShift = ShiftCandidate;

type Availability = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

type ApprovedTimeOff = {
  startDate: string;
  endDate: string;
  startTime?: string;
  endTime?: string;
};

type ValidateShiftInput = {
  candidate: ShiftCandidate;
  employee: {
    active: boolean;
    eligibleLocationIds: readonly string[];
  };
  existingShifts: readonly ExistingShift[];
  availability: readonly Availability[];
  approvedTimeOff: readonly ApprovedTimeOff[];
  existingWeeklyMinutes: number;
  mode?: "MANAGER_SCHEDULE" | "SHIFT_EXCHANGE";
};

function minutes(time: string) {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function dayOfWeek(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

export function validateShift({
  candidate,
  employee,
  existingShifts,
  availability,
  approvedTimeOff,
  existingWeeklyMinutes,
  mode = "MANAGER_SCHEDULE",
}: ValidateShiftInput) {
  const issues: ValidationIssue[] = [];
  const start = minutes(candidate.startTime);
  const end = minutes(candidate.endTime);

  if (start >= end) {
    issues.push({
      code: "INVALID_TIME_RANGE",
      severity: "error",
      message: "Shift end time must be after the start time.",
    });
    return { issues, canSave: false };
  }

  if (!employee.active) {
    issues.push({
      code: "EMPLOYEE_INACTIVE",
      severity: "error",
      message: "Inactive employees cannot be scheduled.",
    });
  }

  if (!employee.eligibleLocationIds.includes(candidate.locationId)) {
    issues.push({
      code: "LOCATION_NOT_ELIGIBLE",
      severity: "error",
      message: "Employee is not eligible to work at this location.",
    });
  }

  const hasOverlap = existingShifts.some((shift) => {
    if (shift.employeeId !== candidate.employeeId || shift.date !== candidate.date) {
      return false;
    }

    return overlaps(start, end, minutes(shift.startTime), minutes(shift.endTime));
  });

  if (hasOverlap) {
    issues.push({
      code: "SHIFT_OVERLAP",
      severity: "error",
      message: "Employee already has an overlapping shift.",
    });
  }

  const timeOffOverlap = approvedTimeOff.some((request) => {
    if (candidate.date < request.startDate || candidate.date > request.endDate) {
      return false;
    }

    if (!request.startTime || !request.endTime) {
      return true;
    }

    return overlaps(start, end, minutes(request.startTime), minutes(request.endTime));
  });

  if (timeOffOverlap) {
    issues.push({
      code: "APPROVED_TIME_OFF",
      severity: "error",
      message: "Employee has approved time off during this shift.",
    });
  }

  if (availability.length > 0) {
    const candidateDay = dayOfWeek(candidate.date);
    const insideAvailability = availability
      .filter((window) => window.dayOfWeek === candidateDay)
      .some(
        (window) =>
          start >= minutes(window.startTime) &&
          end <= minutes(window.endTime),
      );

    if (!insideAvailability) {
      issues.push({
        code: "OUTSIDE_AVAILABILITY",
        severity: mode === "SHIFT_EXCHANGE" ? "error" : "warning",
        message:
          mode === "SHIFT_EXCHANGE"
            ? "Employee is not available for this shift."
            : "Shift falls outside the employee's submitted availability.",
      });
    }
  }

  const candidateMinutes = end - start;
  if (existingWeeklyMinutes + candidateMinutes > 40 * 60) {
    issues.push({
      code: "WEEKLY_HOURS",
      severity: "warning",
      message: "This shift would put the employee over 40 scheduled hours.",
    });
  }

  return {
    issues,
    canSave: !issues.some((issue) => issue.severity === "error"),
  };
}
