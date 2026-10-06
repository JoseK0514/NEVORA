import { durationMinutes } from "../date-utils";

type ShiftForExchange = {
  id: string;
  employeeId: string;
  locationId: string;
  date: string;
  startTime: string;
  endTime: string;
};

export function prepareExchangeContext<T extends { existingShifts: ShiftForExchange[]; existingWeeklyMinutes: number }>(
  context: T,
  outgoingShift: {
    id: string;
    startTime: string;
    endTime: string;
  },
) {
  const outgoingMinutes = durationMinutes(
    outgoingShift.startTime,
    outgoingShift.endTime,
  );

  return {
    ...context,
    existingShifts: context.existingShifts.filter(
      (shift) => shift.id !== outgoingShift.id,
    ),
    existingWeeklyMinutes: Math.max(
      0,
      context.existingWeeklyMinutes - outgoingMinutes,
    ),
  };
}

export function validateSwapRequest(input: {
  requesterEmployeeId: string;
  sourceShiftId: string;
  sourceEmployeeId: string;
  targetShiftId: string;
  targetEmployeeId: string;
  sourceWeekStart: string;
  targetWeekStart: string;
}):
  | { valid: true }
  | {
      valid: false;
      code: "SAME_SHIFT" | "NOT_SHIFT_OWNER" | "SAME_EMPLOYEE" | "DIFFERENT_WEEK";
    } {
  if (input.sourceShiftId === input.targetShiftId) {
    return { valid: false, code: "SAME_SHIFT" };
  }

  if (input.sourceEmployeeId !== input.requesterEmployeeId) {
    return { valid: false, code: "NOT_SHIFT_OWNER" };
  }

  if (input.sourceEmployeeId === input.targetEmployeeId) {
    return { valid: false, code: "SAME_EMPLOYEE" };
  }

  if (input.sourceWeekStart !== input.targetWeekStart) {
    return { valid: false, code: "DIFFERENT_WEEK" };
  }

  return { valid: true };
}
