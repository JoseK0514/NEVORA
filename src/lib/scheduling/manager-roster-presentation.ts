import { durationMinutes } from "../date-utils";

export type RosterShift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  position?: string | null;
  status: string;
  lead: boolean;
};
export type RosterEmployee = { id: string; name: string; role: string; shifts: RosterShift[] };

export function assignedHours(shifts: RosterShift[]) {
  return Number((shifts.reduce((sum, shift) => sum + durationMinutes(shift.startTime, shift.endTime), 0) / 60).toFixed(1));
}

export function filterRoster(employees: RosterEmployee[], query: string) {
  const search = query.trim().toLocaleLowerCase();
  return employees.filter(employee => `${employee.name} ${employee.role}`.toLocaleLowerCase().includes(search));
}
