import type { UserRole } from "./domain";
import { durationMinutes } from "./date-utils";

type ShiftTimeRange = {
  startTime: string;
  endTime: string;
};

/**
 * Temporary role-based reference rates for Employee Home estimates.
 * Replace these constants with persisted employee compensation when payroll
 * data is added to the Time & Attendance backend.
 */
export const BASE_ROLE_HOURLY_RATES = {
  OWNER: 26,
  MANAGER: 22,
  LEAD: 18,
  EMPLOYEE: 16,
} satisfies Record<UserRole, number>;

export function calculateScheduledHours(shifts: ShiftTimeRange[]) {
  const totalMinutes = shifts.reduce(
    (total, shift) =>
      total + durationMinutes(shift.startTime, shift.endTime),
    0,
  );

  return totalMinutes / 60;
}

export function calculateEstimatedEarnings(
  shifts: ShiftTimeRange[],
  role: UserRole,
) {
  const totalMinutes = shifts.reduce(
    (total, shift) =>
      total + durationMinutes(shift.startTime, shift.endTime),
    0,
  );
  const earnings =
    (totalMinutes / 60) * BASE_ROLE_HOURLY_RATES[role];

  return Math.round(earnings * 100) / 100;
}
